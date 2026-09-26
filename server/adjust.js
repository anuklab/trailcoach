// Motor de ajuste diario: aplica reglas fijas al check-in de hoy y,
// si se piden más cambios en lenguaje natural, delega en la IA (claude.js).
import { db, tx, log, getSettings } from './db.js';
import { addDays, today, DIAS, weekday } from './util.js';
import { sessionLoad, currentFitness } from './load.js';
import { describe } from './workouts.js';
import { generatePlan } from './planner.js';
import { askClaudeForAdjustment } from './claude.js';

function snapshot(s) {
  return { type: s.type, title: s.title, description: s.description, duration_min: s.duration_min,
    dplus_m: s.dplus_m, distance_km: s.distance_km, zone: s.zone };
}

// Todas las operaciones sobre sesiones comprueban que la sesión pertenece al usuario (user_id = ?)
// para que nadie pueda leer ni tocar entrenos de otra cuenta a través de un id adivinado.
function applySession(userId, id, patch, { origin = 'ajuste', note = null } = {}) {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(id, userId);
  if (!s) return null;
  const before = s.original ? JSON.parse(s.original) : snapshot(s);
  const merged = { ...s, ...patch };
  merged.load = sessionLoad(merged);
  if (patch.type || patch.duration_min || patch.dplus_m) Object.assign(merged, describe(merged, { settings: getSettings(userId) }));
  db.prepare(`UPDATE sessions SET type=?, title=?, description=?, duration_min=?, dplus_m=?, distance_km=?,
      zone=?, load=?, origin=?, change_note=?, original=? WHERE id=? AND user_id=?`)
    .run(merged.type, merged.title, merged.description, merged.duration_min, merged.dplus_m, merged.distance_km ?? null,
      merged.zone, merged.load, origin, note, JSON.stringify(before), id, userId);
  return db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(id, userId);
}

// Reduce una sesión a `factor` de su duración/desnivel; bajo cierto umbral la convierte en descanso.
function scale(userId, s, factor, opts = {}) {
  if (s.type === 'rest' || s.locked) return null;
  const dur = Math.round(s.duration_min * factor);
  if (dur < 20 && s.type !== 'race') return applySession(userId, s.id, { type: 'rest', duration_min: 0, dplus_m: 0 }, opts);
  return applySession(userId, s.id, { duration_min: dur, dplus_m: Math.round((s.dplus_m || 0) * factor) }, opts);
}

/**
 * Aplica el check-in de hoy: reglas fijas para la sesión de hoy/próximas,
 * y recalcula en cascada el resto del plan para compensar la carga perdida o ganada.
 */
export function applyCheckin(userId, checkin) {
  const date = checkin.date || today();
  // legs_heavy: tri-estado 0=ligeras, 1=normales, 2=pesadas (antes era booleano; se acepta también true/false por compatibilidad).
  const { fatigue = 0, bad_sleep = false, sick = false, pain = '', available_min = null, note = '', wants_session = false } = checkin;
  const legsRaw = checkin.legs_heavy;
  const legs_heavy = legsRaw === true ? 2 : legsRaw === false ? 1 : Number.isFinite(+legsRaw) ? +legsRaw : 1;
  const legsHeavy = legs_heavy >= 2, legsLight = legs_heavy === 0;
  const changes = [];
  const todaySession = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date = ? AND type != 'strength' ORDER BY id LIMIT 1`).get(userId, date)
    || db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date = ? ORDER BY id LIMIT 1`).get(userId, date);

  tx(() => {
    // 0) Día de descanso pero el atleta quiere entrenar algo: añadimos una sesión suave sin tocar el resto del plan.
    if (wants_session && todaySession && todaySession.type === 'rest' && !sick && !pain) {
      const dur = Math.max(20, Math.min(available_min || 40, 75));
      const r = applySession(userId, todaySession.id, { type: 'easy', duration_min: dur, dplus_m: 0 },
        { note: 'Añadida a petición tuya en un día de descanso' });
      if (r) changes.push(`Hoy: como pediste, se añade un rodaje suave de ${dur} min (el resto de la semana sigue igual).`);
    }
    // 1) Enfermedad o dolor: parar. Convertir en descanso hoy y aligerar 2-3 días.
    if (sick || pain) {
      if (todaySession && todaySession.type !== 'rest') {
        applySession(userId, todaySession.id, { type: 'rest', duration_min: 0, dplus_m: 0 },
          { note: sick ? 'Descanso por enfermedad' : `Descanso por molestia: ${pain}` });
        changes.push(`Hoy pasa a descanso (${sick ? 'enfermedad' : 'molestia física'}).`);
      }
      const next = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date > ? AND type NOT IN ('rest','race') ORDER BY date LIMIT ?`)
        .all(userId, date, sick ? 2 : 3);
      for (const s of next) { const r = scale(userId, s, 0.5, { note: 'Reducida por precaución tras molestia/enfermedad' }); if (r) changes.push(`${s.date}: ${s.title} reducida a la mitad.`); }
    }
    // 2) Muy cansado / piernas muy pesadas: hoy suave o descanso, resto de la semana un poco más ligero.
    else if (fatigue >= 4 || (legsHeavy && fatigue >= 3)) {
      if (todaySession && ['vert', 'tempo', 'intervals', 'long', 'b2b'].includes(todaySession.type)) {
        const r = scale(userId, todaySession, 0.4, { note: 'Bajada de intensidad por fatiga alta' });
        if (r) changes.push(`Hoy: ${todaySession.title} → ${r.title}, más corta y suave (fatiga alta).`);
      }
      const week = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date > ? AND date <= ? AND type NOT IN ('rest','race')`)
        .all(userId, date, addDays(date, 6 - weekday(date)));
      for (const s of week) { const r = scale(userId, s, 0.8, { note: 'Semana aliviada por fatiga acumulada' }); if (r) changes.push(`${s.date}: ${s.title} recortada ~20%.`); }
    }
    // 3) Piernas pesadas sin más: solo suavizar la sesión de hoy si es de calidad.
    else if (legsHeavy && todaySession && ['vert', 'tempo', 'intervals'].includes(todaySession.type)) {
      const r = scale(userId, todaySession, 0.7, { note: 'Piernas pesadas: intensidad reducida' });
      if (r) changes.push(`Hoy: ${todaySession.title} se hace más suave por piernas pesadas.`);
    }
    // 3b) Piernas ligeras y poca fatiga: nota positiva, sin tocar el plan (evita sobre-entrenar por exceso de confianza).
    else if (legsLight && fatigue <= 1 && todaySession && ['vert', 'tempo', 'intervals'].includes(todaySession.type)) {
      changes.push('Hoy: piernas ligeras, mantenemos la sesión tal cual planeada.');
    }
    // 4) Mal descanso: quitar la intensidad más dura de hoy si la hay.
    if (bad_sleep && todaySession && ['intervals', 'tempo'].includes(todaySession.type) && !sick && fatigue < 4) {
      const r = applySession(userId, todaySession.id, { type: 'easy', duration_min: Math.round(todaySession.duration_min * 0.8), dplus_m: 0 },
        { note: 'Mala noche: se cambia por rodaje suave' });
      changes.push(`Hoy: ${todaySession.title} → rodaje suave (mala noche).`);
    }
    // 5) Menos tiempo disponible: comprimir la sesión de hoy a lo que hay, priorizando calidad sobre volumen.
    if (available_min != null && todaySession && todaySession.duration_min > available_min) {
      const factor = Math.max(0.3, available_min / todaySession.duration_min);
      const r = scale(userId, todaySession, factor, { note: `Ajustada a los ${available_min} min disponibles` });
      if (r) changes.push(`Hoy: ${todaySession.title} comprimida a ${available_min} min (mantiene intensidad, reduce volumen).`);
      else changes.push('Hoy: sin tiempo suficiente, pasa a descanso.');
    }
  });

  db.prepare('INSERT INTO checkins(user_id, date, fatigue, legs_heavy, bad_sleep, sick, pain, available_min, note, result, wants_session) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(userId, date, fatigue, legs_heavy, bad_sleep ? 1 : 0, sick ? 1 : 0, pain || null, available_min, note || null,
      changes.join(' ') || 'Sin cambios necesarios.', wants_session ? 1 : 0);
  log(userId, 'checkin', `Check-in ${date}: ${changes.length} cambios`, { fatigue, legs_heavy, bad_sleep, sick, pain, available_min, wants_session, changes });

  return { date, changes, session: db.prepare('SELECT * FROM sessions WHERE user_id = ? AND date = ? ORDER BY id').all(userId, date) };
}

/**
 * Cambio puntual sobre una sesión concreta (editar manualmente desde la app).
 */
export function editSession(userId, id, patch) {
  return tx(() => applySession(userId, id, patch, { origin: 'manual', note: patch.note || 'Editada manualmente' }));
}

/**
 * Recalcula el resto del plan desde una fecha (tras cambios grandes), conservando lo bloqueado/hecho.
 */
export function recalcFrom(userId, date) {
  return generatePlan(userId, { from: date, reason: 'Recálculo tras ajustes' });
}

/**
 * Petición libre en lenguaje natural ("esta semana solo puedo entrenar 3 días",
 * "muévete el fin de semana que tengo una boda"...). Usa reglas simples si puede
 * y si no, pide ayuda a la IA (Claude) para reorganizar el tramo del plan.
 */
export async function naturalAdjust(userId, message, { date = today(), days = 14 } = {}) {
  const context = {
    today: date,
    days_ahead: db.prepare(`SELECT id,date,type,title,description,duration_min,dplus_m,distance_km,zone,status,key,locked
        FROM sessions WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date`).all(userId, date, addDays(date, days)),
    race: db.prepare(`SELECT * FROM races WHERE user_id = ? AND date >= ? ORDER BY date LIMIT 1`).get(userId, date),
    checkin_hoy: db.prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1').get(userId, date),
  };
  const result = await askClaudeForAdjustment(message, context);
  const applied = [];
  tx(() => {
    for (const op of result.operations || []) {
      if (op.op === 'update' && op.id) {
        const r = applySession(userId, op.id, op.patch, { origin: 'ia', note: op.reason || message });
        if (r) applied.push({ date: r.date, title: r.title, reason: op.reason });
      } else if (op.op === 'move' && op.id && op.date) {
        db.prepare('UPDATE sessions SET date=?, week_start=?, origin=?, change_note=? WHERE id=? AND user_id=?')
          .run(op.date, addDays(op.date, -weekday(op.date)), 'ia', op.reason || message, op.id, userId);
        applied.push({ date: op.date, title: `Sesión movida a ${op.date}`, reason: op.reason });
      } else if (op.op === 'swap' && op.id_a && op.id_b) {
        const a = db.prepare('SELECT date FROM sessions WHERE id=? AND user_id=?').get(op.id_a, userId);
        const b = db.prepare('SELECT date FROM sessions WHERE id=? AND user_id=?').get(op.id_b, userId);
        if (a && b) {
          db.prepare('UPDATE sessions SET date=?, origin="ia" WHERE id=? AND user_id=?').run(b.date, op.id_a, userId);
          db.prepare('UPDATE sessions SET date=?, origin="ia" WHERE id=? AND user_id=?').run(a.date, op.id_b, userId);
          applied.push({ date: b.date, title: 'Sesiones intercambiadas', reason: op.reason });
        }
      }
    }
  });
  log(userId, 'ia-adjust', message, { applied, explanation: result.explanation });
  return { message: result.explanation || 'Ajustado.', applied };
}

const QUALITY_TYPES = ['vert', 'tempo', 'intervals', 'long', 'b2b', 'loop'];

/**
 * Tras sincronizar Strava, adapta el plan a la carga REAL (no autoinformada como en el check-in):
 * si la frescura (TSB) del atleta está muy baja, o una actividad recién importada ha salido bastante
 * más dura de lo planeado, suaviza automáticamente la próxima sesión de calidad de los próximos días
 * — mismo mecanismo de siempre (`scale`), pero disparado por los datos de Strava en vez de por lo
 * que cuente el atleta en el check-in. A propósito conservador: solo toca UNA sesión por sincronización,
 * nunca una ya bloqueada o ya tocada a mano/por IA (origin != 'plan').
 *
 * `matched` son las { session, activity } que se acaban de emparejar en esta sincronización.
 */
export function autoAdaptAfterSync(userId, matched, date = today()) {
  const changes = [];
  if (!matched.length) return changes;

  const fit = currentFitness(userId, date);
  const overshoot = matched
    .filter(({ session, activity }) => session.load > 0 && (activity.load || 0) > session.load * 1.4)
    .sort((a, b) => (b.activity.load / b.session.load) - (a.activity.load / a.session.load))[0];

  let reason = null, factor = null;
  if (fit.tsb <= -20) {
    reason = `fatiga alta según tu carga real de Strava (frescura ${fit.tsb})`;
    factor = 0.7;
  } else if (overshoot && overshoot.activity.load > overshoot.session.load * 1.8) {
    reason = `"${overshoot.session.title}" salió bastante más dura de lo planeado según Strava`;
    factor = 0.75;
  } else if (fit.tsb <= -10 && overshoot) {
    reason = `"${overshoot.session.title}" salió más dura de lo previsto y ya vas con la frescura baja (${fit.tsb})`;
    factor = 0.85;
  }
  if (!reason) return changes;

  const next = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date > ? AND date <= ?
      AND type IN (${QUALITY_TYPES.map(() => '?').join(',')}) AND status = 'planned' AND origin = 'plan' AND locked = 0
      ORDER BY date LIMIT 1`).get(userId, date, addDays(date, 2), ...QUALITY_TYPES);
  if (!next) return changes;

  tx(() => {
    const r = scale(userId, next, factor, { origin: 'auto', note: `Ajustada automáticamente: ${reason}.` });
    if (r) changes.push(`${r.date}: ${next.title} → ${r.title} (${reason}).`);
  });
  log(userId, 'auto-adapt', reason, { tsb: fit.tsb, changes });
  return changes;
}
