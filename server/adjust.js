// Motor de ajuste diario: aplica reglas fijas al check-in de hoy y,
// si se piden más cambios en lenguaje natural, delega en la IA (claude.js).
import { db, tx, log, getSettings } from './db.js';
import { addDays, today, DIAS, weekday } from './util.js';
import { sessionLoad } from './load.js';
import { describe } from './workouts.js';
import { generatePlan } from './planner.js';
import { askClaudeForAdjustment } from './claude.js';

function snapshot(s) {
  return { type: s.type, title: s.title, description: s.description, duration_min: s.duration_min,
    dplus_m: s.dplus_m, distance_km: s.distance_km, zone: s.zone };
}

function applySession(id, patch, { origin = 'ajuste', note = null } = {}) {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!s) return null;
  const before = s.original ? JSON.parse(s.original) : snapshot(s);
  const merged = { ...s, ...patch };
  merged.load = sessionLoad(merged);
  if (patch.type || patch.duration_min || patch.dplus_m) Object.assign(merged, describe(merged, { settings: getSettings() }));
  db.prepare(`UPDATE sessions SET type=?, title=?, description=?, duration_min=?, dplus_m=?, distance_km=?,
      zone=?, load=?, origin=?, change_note=?, original=? WHERE id=?`)
    .run(merged.type, merged.title, merged.description, merged.duration_min, merged.dplus_m, merged.distance_km ?? null,
      merged.zone, merged.load, origin, note, JSON.stringify(before), id);
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

// Reduce una sesión a `factor` de su duración/desnivel; bajo cierto umbral la convierte en descanso.
function scale(s, factor, opts = {}) {
  if (s.type === 'rest' || s.locked) return null;
  const dur = Math.round(s.duration_min * factor);
  if (dur < 20 && s.type !== 'race') return applySession(s.id, { type: 'rest', duration_min: 0, dplus_m: 0 }, opts);
  return applySession(s.id, { duration_min: dur, dplus_m: Math.round((s.dplus_m || 0) * factor) }, opts);
}

/**
 * Aplica el check-in de hoy: reglas fijas para la sesión de hoy/próximas,
 * y recalcula en cascada el resto del plan para compensar la carga perdida o ganada.
 */
export function applyCheckin(checkin) {
  const date = checkin.date || today();
  const { fatigue = 0, legs_heavy = false, bad_sleep = false, sick = false, pain = '', available_min = null, note = '' } = checkin;
  const changes = [];
  const todaySession = db.prepare(`SELECT * FROM sessions WHERE date = ? AND type != 'strength' ORDER BY id LIMIT 1`).get(date)
    || db.prepare(`SELECT * FROM sessions WHERE date = ? ORDER BY id LIMIT 1`).get(date);

  tx(() => {
    // 1) Enfermedad o dolor: parar. Convertir en descanso hoy y aligerar 2-3 días.
    if (sick || pain) {
      if (todaySession && todaySession.type !== 'rest') {
        applySession(todaySession.id, { type: 'rest', duration_min: 0, dplus_m: 0 },
          { note: sick ? 'Descanso por enfermedad' : `Descanso por molestia: ${pain}` });
        changes.push(`Hoy pasa a descanso (${sick ? 'enfermedad' : 'molestia física'}).`);
      }
      const next = db.prepare(`SELECT * FROM sessions WHERE date > ? AND type NOT IN ('rest','race') ORDER BY date LIMIT ?`)
        .all(date, sick ? 2 : 3);
      for (const s of next) { const r = scale(s, 0.5, { note: 'Reducida por precaución tras molestia/enfermedad' }); if (r) changes.push(`${s.date}: ${s.title} reducida a la mitad.`); }
    }
    // 2) Muy cansado / piernas muy pesadas: hoy suave o descanso, resto de la semana un poco más ligero.
    else if (fatigue >= 4 || (legs_heavy && fatigue >= 3)) {
      if (todaySession && ['vert', 'tempo', 'intervals', 'long', 'b2b'].includes(todaySession.type)) {
        const r = scale(todaySession, 0.4, { note: 'Bajada de intensidad por fatiga alta' });
        if (r) changes.push(`Hoy: ${todaySession.title} → ${r.title}, más corta y suave (fatiga alta).`);
      }
      const week = db.prepare(`SELECT * FROM sessions WHERE date > ? AND date <= ? AND type NOT IN ('rest','race')`)
        .all(date, addDays(date, 6 - weekday(date)));
      for (const s of week) { const r = scale(s, 0.8, { note: 'Semana aliviada por fatiga acumulada' }); if (r) changes.push(`${s.date}: ${s.title} recortada ~20%.`); }
    }
    // 3) Piernas pesadas sin más: solo suavizar la sesión de hoy si es de calidad.
    else if (legs_heavy && todaySession && ['vert', 'tempo', 'intervals'].includes(todaySession.type)) {
      const r = scale(todaySession, 0.7, { note: 'Piernas pesadas: intensidad reducida' });
      if (r) changes.push(`Hoy: ${todaySession.title} se hace más suave por piernas pesadas.`);
    }
    // 4) Mal descanso: quitar la intensidad más dura de hoy si la hay.
    if (bad_sleep && todaySession && ['intervals', 'tempo'].includes(todaySession.type) && !sick && fatigue < 4) {
      const r = applySession(todaySession.id, { type: 'easy', duration_min: Math.round(todaySession.duration_min * 0.8), dplus_m: 0 },
        { note: 'Mala noche: se cambia por rodaje suave' });
      changes.push(`Hoy: ${todaySession.title} → rodaje suave (mala noche).`);
    }
    // 5) Menos tiempo disponible: comprimir la sesión de hoy a lo que hay, priorizando calidad sobre volumen.
    if (available_min != null && todaySession && todaySession.duration_min > available_min) {
      const factor = Math.max(0.3, available_min / todaySession.duration_min);
      const r = scale(todaySession, factor, { note: `Ajustada a los ${available_min} min disponibles` });
      if (r) changes.push(`Hoy: ${todaySession.title} comprimida a ${available_min} min (mantiene intensidad, reduce volumen).`);
      else changes.push('Hoy: sin tiempo suficiente, pasa a descanso.');
    }
  });

  db.prepare('INSERT INTO checkins(date, fatigue, legs_heavy, bad_sleep, sick, pain, available_min, note, result) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(date, fatigue, legs_heavy ? 1 : 0, bad_sleep ? 1 : 0, sick ? 1 : 0, pain || null, available_min, note || null,
      changes.join(' ') || 'Sin cambios necesarios.');
  log('checkin', `Check-in ${date}: ${changes.length} cambios`, { fatigue, legs_heavy, bad_sleep, sick, pain, available_min, changes });

  return { date, changes, session: db.prepare('SELECT * FROM sessions WHERE date = ? ORDER BY id').all(date) };
}

/**
 * Cambio puntual sobre una sesión concreta (editar manualmente desde la app).
 */
export function editSession(id, patch) {
  return tx(() => applySession(id, patch, { origin: 'manual', note: patch.note || 'Editada manualmente' }));
}

/**
 * Recalcula el resto del plan desde una fecha (tras cambios grandes), conservando lo bloqueado/hecho.
 */
export function recalcFrom(date) {
  return generatePlan({ from: date, reason: 'Recálculo tras ajustes' });
}

/**
 * Petición libre en lenguaje natural ("esta semana solo puedo entrenar 3 días",
 * "muévete el fin de semana que tengo una boda"...). Usa reglas simples si puede
 * y si no, pide ayuda a la IA (Claude) para reorganizar el tramo del plan.
 */
export async function naturalAdjust(message, { date = today(), days = 14 } = {}) {
  const context = {
    today: date,
    days_ahead: db.prepare(`SELECT id,date,type,title,description,duration_min,dplus_m,distance_km,zone,status,key,locked
        FROM sessions WHERE date >= ? AND date <= ? ORDER BY date`).all(date, addDays(date, days)),
    race: db.prepare(`SELECT * FROM races WHERE date >= ? ORDER BY date LIMIT 1`).get(date),
    checkin_hoy: db.prepare('SELECT * FROM checkins WHERE date = ? ORDER BY id DESC LIMIT 1').get(date),
  };
  const result = await askClaudeForAdjustment(message, context);
  const applied = [];
  tx(() => {
    for (const op of result.operations || []) {
      if (op.op === 'update' && op.id) {
        const r = applySession(op.id, op.patch, { origin: 'ia', note: op.reason || message });
        if (r) applied.push({ date: r.date, title: r.title, reason: op.reason });
      } else if (op.op === 'move' && op.id && op.date) {
        db.prepare('UPDATE sessions SET date=?, week_start=?, origin=?, change_note=? WHERE id=?')
          .run(op.date, addDays(op.date, -weekday(op.date)), 'ia', op.reason || message, op.id);
        applied.push({ date: op.date, title: `Sesión movida a ${op.date}`, reason: op.reason });
      } else if (op.op === 'swap' && op.id_a && op.id_b) {
        const a = db.prepare('SELECT date FROM sessions WHERE id=?').get(op.id_a);
        const b = db.prepare('SELECT date FROM sessions WHERE id=?').get(op.id_b);
        if (a && b) {
          db.prepare('UPDATE sessions SET date=?, origin="ia" WHERE id=?').run(b.date, op.id_a);
          db.prepare('UPDATE sessions SET date=?, origin="ia" WHERE id=?').run(a.date, op.id_b);
          applied.push({ date: b.date, title: 'Sesiones intercambiadas', reason: op.reason });
        }
      }
    }
  });
  log('ia-adjust', message, { applied, explanation: result.explanation });
  return { message: result.explanation || 'Ajustado.', applied };
}
