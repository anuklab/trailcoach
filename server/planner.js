// Generador del plan de entrenamiento periodizado para ultra trail. El reparto semanal (qué
// días, cuánto volumen, cuánta intensidad) lo decide esta pieza; QUÉ metodología aplica cada
// semana (fase, polarizado/piramidal, énfasis de bajada, back-to-back...) lo decide methodology.js
// — así el algoritmo combina varias metodologías reales en vez de forzar una sola.
import { db, getSettings, tx, log } from './db.js';
import { sessionLoad } from './load.js';
import { addDays, diffDays, mondayOf, weekday, today, clamp, round5, toDate } from './util.js';
import { describe } from './workouts.js';
import { phaseForWeek, selectMethodology } from './methodology.js';

const RUN_TYPES = `('Run','TrailRun','Hike','Walk','VirtualRun')`;
const LOADING_PHASES = ['base', 'build', 'specific', 'peak'];

// ---------- Estimaciones a partir del historial ----------

// "Km-esfuerzo": km + D+/100. Estimamos el tiempo de carrera con una ley de potencia (tipo Riegel).
// En una carrera por etapas, distance_km/dplus_m guardan la etapa MEDIA (como dplus_m en un
// Backyard guarda el de una sola vuelta), así que hay que multiplicar por el nº de etapas para
// estimar el esfuerzo TOTAL de la carrera (que es con lo que se compara target_time_h, un objetivo
// de tiempo total, no por etapa).
export function estimateRaceHours(userId, race) {
  const nStages = race.type === 'stage' ? (race.n_stages || 1) : 1;
  const ekm = ((race.distance_km || 0) + (race.dplus_m || 0) / 100) * nStages;
  if (!ekm) return null;
  const past = db.prepare('SELECT distance_km, dplus_m, time_min FROM past_races WHERE user_id = ? AND time_min > 0 AND distance_km > 0').all(userId)
    .map(p => ({ ekm: p.distance_km + (p.dplus_m || 0) / 100, h: p.time_min / 60 }))
    .filter(p => p.ekm > 15);
  let ref;
  if (past.length) {
    // referencia: la carrera más larga (la más parecida al esfuerzo de un ultra)
    ref = past.sort((a, b) => b.ekm - a.ekm)[0];
  } else {
    const act = db.prepare(`SELECT distance_m, elevation_gain_m, elapsed_time_s FROM activities
      WHERE user_id = ? AND sport_type IN ${RUN_TYPES} AND moving_time_s > 7200 ORDER BY (distance_m/1000 + elevation_gain_m/100) DESC LIMIT 1`).get(userId);
    if (act) ref = { ekm: act.distance_m / 1000 + act.elevation_gain_m / 100, h: act.elapsed_time_s / 3600 * 1.05 };
    else ref = { ekm: 50, h: 50 / 7.5 };
  }
  const h = ref.h * Math.pow(ekm / ref.ekm, 1.1);
  return +(race.time_limit_h ? Math.min(h, race.time_limit_h * 0.97) : h).toFixed(1);
}

// Valora si el objetivo de tiempo que ha puesto el atleta es realista, comparado con la estimación del modelo.
export function targetFeasibility(userId, race) {
  if (!race.target_time_h) return null;
  const est = estimateRaceHours(userId, race);
  if (!est) return { level: 'sin_datos', message: 'Añade un track GPX o alguna carrera pasada para poder valorar el objetivo.' };
  const ratio = race.target_time_h / est; // <1 = objetivo más rápido que la estimación
  let level, message;
  if (ratio < 0.82) { level = 'muy_optimista'; message = `Tu objetivo (${race.target_time_h} h) es bastante más rápido que lo que sugiere tu historial (≈${est} h). No es imposible, pero exige una preparación muy exigente y sin contratiempos.`; }
  else if (ratio < 0.93) { level = 'optimista'; message = `Objetivo ambicioso: el modelo estima ≈${est} h a partir de tu historial. Es alcanzable si la preparación va muy bien.`; }
  else if (ratio <= 1.1) { level = 'realista'; message = `Objetivo realista: en línea con la estimación del modelo (≈${est} h).`; }
  else { level = 'conservador'; message = `Objetivo conservador respecto a tu nivel actual (el modelo estima ≈${est} h). Bien si priorizas terminar con margen.`; }
  if (race.time_limit_h && race.target_time_h > race.time_limit_h) { level = 'fuera_de_corte'; message = `¡Ojo! Tu objetivo (${race.target_time_h} h) supera el límite de corte de la carrera (${race.time_limit_h} h).`; }
  return { level, message, estimate_h: est };
}

function recentBaseline(userId, from) {
  const w6 = addDays(from, -42);
  const act = db.prepare(`SELECT SUM(moving_time_s)/60.0 m FROM activities WHERE user_id = ? AND date >= ? AND date < ?`).get(userId, w6, from);
  const actualWeekly = (act?.m || 0) / 6;
  const longest = db.prepare(`SELECT MAX(moving_time_s)/60.0 m FROM activities WHERE user_id = ? AND sport_type IN ${RUN_TYPES} AND date >= ? AND date < ?`)
    .get(userId, addDays(from, -56), from)?.m || 0;

  // Si ya hay plan en las 3 semanas anteriores, seguimos desde él corregido por cumplimiento
  const w3 = addDays(mondayOf(from), -21);
  const weeks = db.prepare(`SELECT week_start, phase, SUM(duration_min) planned,
      SUM(CASE WHEN status IN ('done','partial') THEN duration_min ELSE 0 END) done
      FROM sessions WHERE user_id = ? AND week_start >= ? AND week_start < ? AND type != 'rest' GROUP BY week_start ORDER BY week_start`).all(userId, w3, mondayOf(from));
  let buildMin = null, loadStreak = 0;
  if (weeks.length) {
    const loading = weeks.filter(w => LOADING_PHASES.includes(w.phase));
    const plannedAll = weeks.reduce((s, w) => s + w.planned, 0);
    const actualAll = db.prepare(`SELECT SUM(moving_time_s)/60.0 m FROM activities WHERE user_id = ? AND date >= ? AND date < ?`).get(userId, w3, mondayOf(from))?.m || 0;
    const compliance = plannedAll ? clamp(actualAll / plannedAll, 0.75, 1.05) : 1;
    if (loading.length) buildMin = Math.max(...loading.map(w => w.planned)) * compliance;
    for (let i = weeks.length - 1; i >= 0 && LOADING_PHASES.includes(weeks[i].phase); i--) loadStreak++;
  }
  return {
    // Suelo algo más alto que antes: con una base demasiado baja, la semana 1 queda tan corta
    // que el reparto por días convierte casi todo en descanso aunque el atleta tenga tiempo libre.
    buildMin: Math.max(220, buildMin ?? actualWeekly),
    longMin: Math.max(60, longest),
    loadStreak,
  };
}

// ---------- Estructura semanal ----------

function racesForUser(userId) {
  return db.prepare('SELECT * FROM races WHERE user_id = ? ORDER BY date').all(userId).map(r => {
    if (r.type === 'backyard') {
      // En un Backyard Ultra se corre 1 vuelta ("yard") fija cada hora en punto hasta que solo
      // queda un finisher: no hay "tiempo estimado" por ritmo, el objetivo ES directamente el
      // nº de horas/vueltas que el atleta se plantea aguantar (target_time_h).
      return { ...r, est_h: r.target_time_h || 24 };
    }
    if (r.type === 'stage') {
      // estimateRaceHours ya multiplica por n_stages para tener el esfuerzo TOTAL de la carrera.
      return { ...r, est_h: r.target_time_h || estimateRaceHours(userId, r) };
    }
    return { ...r, est_h: estimateRaceHours(userId, r) };
  });
}

// ---------- Generación ----------

export function generatePlan(userId, { from = null, reason = 'Plan generado' } = {}) {
  const st = getSettings(userId);
  const start = from || st.plan_start || today();
  const races = racesForUser(userId);
  const main = races.filter(r => r.priority !== 'C');
  if (!main.length) return { weeks: 0, sessions: 0, message: 'Añade al menos una carrera objetivo (A o B).' };
  const end = addDays(main[main.length - 1].date, 14);

  const base = recentBaseline(userId, start);
  let buildMin = base.buildMin;
  let longMin = base.longMin;
  let streak = base.loadStreak;
  const availWeek = st.availability.reduce((a, b) => a + b, 0);
  const capMin = Math.min(st.max_week_hours * 60, availWeek);

  // Sesiones que respetamos: bloqueadas, modificadas a mano/IA o ya realizadas
  const keep = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date >= ? AND (locked = 1 OR origin != 'plan' OR status != 'planned')`).all(userId, start);
  const keepDates = new Set(keep.map(s => s.date));

  const out = [];
  for (let ws = mondayOf(start); ws <= end; ws = addDays(ws, 7)) {
    const ph = phaseForWeek(ws, races);
    const methodology = selectMethodology(userId, ws, ph);
    const race = ph.race;
    const peakMin = race ? Math.min(capMin, clamp((race.est_h || 20) * 0.4 + 6, 8, 18) * 60) : capMin * 0.7;
    // m/h de carrera. En Backyard Ultra el "m/h" es literal: cada vuelta (1 h) tiene ese D+ fijo.
  const dens = race?.dplus_m
    ? (race.type === 'backyard' ? race.dplus_m : (race.est_h ? race.dplus_m / race.est_h : 200))
    : 200;
    const peakLong = race ? Math.min(st.availability[st.long_day] || 240, clamp((race.est_h || 10) * 0.2 * 60, 120, 390)) : 180;

    // La progresión (cuánto sube el volumen cada semana, cada cuántas semanas toca descarga) no es
    // igual para todos los atletas aunque preparen la misma carrera — depende de su nivel, edad e
    // historial de lesiones (ver progressionProfile en methodology.js).
    const prog = methodology.progression;
    let weekMin, phase = ph.phase, densF = 0.6, deload = false;
    if (LOADING_PHASES.includes(phase)) {
      streak++;
      if (streak % prog.deloadEvery === 0) { deload = true; weekMin = buildMin * 0.7; }
      else {
        buildMin = Math.min(peakMin, buildMin * prog.buildMult + prog.buildAdd);
        weekMin = buildMin;
        longMin = Math.min(peakLong, longMin + (phase === 'base' ? prog.longIncBase : prog.longIncOther));
      }
      densF = { base: 0.55, build: 0.85, specific: 1.05, peak: 1.15 }[phase] * (deload ? 0.75 : 1);
    } else {
      streak = 0;
      if (phase === 'race') weekMin = buildMin * 0.35;
      else weekMin = buildMin * (ph.factor ?? 0.6);
      if (phase === 'recovery') { longMin = Math.max(90, longMin * 0.8); densF = 0.4; }
      if (phase === 'taper') densF = 0.8;
    }
    // Adaptación continua: si llega muy cargado (Frescura muy negativa de verdad, no solo por el
    // bloque), recortamos la semana aunque tocase subir — un entrenador de carne y hueso haría lo mismo.
    if (methodology.overloaded) { weekMin *= 0.85; densF *= 0.8; }
    weekMin = Math.min(weekMin, capMin);

    const week = {
      ws, phase, race, weekMin, deload, methodology, dplus: Math.round(weekMin / 60 * dens * densF),
      longMin: phase === 'taper' ? Math.min(longMin, 60 + (ph.factor || 0.6) * 150)
        : deload ? longMin * 0.75 : phase === 'recovery' ? Math.min(longMin, 90) : longMin,
      st, races, dens,
    };
    for (const s of buildWeek(week)) {
      if (s.date < start || keepDates.has(s.date)) continue;
      out.push(s);
    }
    if (phase === 'recovery' || phase === 'race') buildMin = Math.max(buildMin * 0.92, 180);
  }

  tx(() => {
    db.prepare(`DELETE FROM sessions WHERE user_id = ? AND date >= ? AND locked = 0 AND origin = 'plan' AND status = 'planned'`).run(userId, start);
    const ins = db.prepare(`INSERT INTO sessions(user_id,date,type,title,description,duration_min,dplus_m,distance_km,zone,rpe,load,key,phase,week_start,race_id)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const s of out) ins.run(userId, s.date, s.type, s.title, s.description, s.duration_min, s.dplus_m, s.distance_km ?? null,
      s.zone ?? null, s.rpe ?? null, s.load ?? 0, s.key ? 1 : 0, s.phase ?? null, s.week_start, s.race_id ?? null);
  });
  log(userId, 'plan', `${reason}: ${out.length} sesiones desde ${start}`);
  return { from: start, sessions: out.length, weeks: Math.ceil(diffDays(start, end) / 7) };
}

function buildWeek(w) {
  const { ws, phase, race, st, methodology, deload } = w;
  const isBackyard = race?.type === 'backyard';
  const avail = st.availability.slice();
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(ws, i));
  const sessions = [];
  const mk = (i, type, dur, extra = {}) => {
    const s = { date: days[i], type, duration_min: round5(Math.max(0, dur)), dplus_m: 0, zone: 'Z2', phase, week_start: ws,
      race_id: race?.id, key: false, ...extra };
    return s;
  };

  // --- Semana de carrera ---
  const raceHere = w.races.filter(r => r.date >= ws && r.date <= days[6]);
  if (phase === 'race') {
    const r = w.race; const ri = weekday(r.date);
    // Carrera por etapas: una sesión "race" por cada etapa. Usamos el desfase en días de calendario
    // (no el día de la semana) para que funcione igual si la carrera empezó la semana anterior — así
    // una carrera de más de 7 días, o que no empieza en lunes, reparte bien sus etapas entre semanas
    // en vez de perder las que caen "fuera" de la semana de inicio.
    if (r.type === 'stage' && (r.n_stages || 1) > 1) {
      const n = r.n_stages;
      const perStageH = (r.est_h || n * 5) / n;
      for (let i = 0; i < 7; i++) {
        const off = diffDays(r.date, days[i]);
        if (off >= 0 && off < n) {
          sessions.push(mk(i, 'race', perStageH * 60, {
            dplus_m: r.dplus_m || 0, distance_km: r.distance_km, key: true, zone: 'Z2-Z3',
            stageDay: off + 1, stageOf: n,
          }));
        } else if (off === -1) sessions.push(mk(i, 'rest', 0));
        else if (off < 0) sessions.push(avail[i] ? mk(i, 'easy', Math.min(45, avail[i])) : mk(i, 'rest', 0));
        else sessions.push(mk(i, 'rest', 0, { variant: off === n ? 'postcarrera' : undefined }));
      }
      return finalize(sessions, w);
    }
    for (let i = 0; i < 7; i++) {
      if (i === ri) sessions.push(mk(i, 'race', (r.est_h || 10) * 60, {
        // En Backyard el D+ del "día de carrera" es acumulado (vueltas x D+/vuelta), no el de una sola vuelta.
        dplus_m: r.type === 'backyard' ? Math.round((r.dplus_m || 0) * (r.est_h || 0)) : (r.dplus_m || 0),
        distance_km: r.distance_km, key: true, zone: 'Z2-Z3',
      }));
      else if (i < ri && ri - i <= 1) sessions.push(mk(i, 'rest', 0));
      else if (i < ri && ri - i === 2) sessions.push(mk(i, 'easy', 30, { variant: 'activacion' }));
      else if (i < ri && ri - i === 4) sessions.push(mk(i, 'tempo', 45, { variant: 'recordatorio' }));
      else if (i < ri) sessions.push(avail[i] ? mk(i, 'easy', Math.min(45, avail[i])) : mk(i, 'rest', 0));
      else sessions.push(mk(i, 'rest', 0, { variant: 'postcarrera' }));
    }
    return finalize(sessions, w);
  }

  // --- Semana normal ---
  let L = st.long_day, B = st.b2b_day;
  if (!avail[L]) L = avail.indexOf(Math.max(...avail));
  // Back-to-back long runs: se priorizan en específico/peak (máxima especificidad de fatiga
  // acumulada), pero también se usan en construcción si hay disponibilidad, igual que antes.
  const useB2B = ['build', 'specific', 'peak'].includes(phase) && B !== L && avail[B] >= 60 && !methodology.overloaded;

  // Carrera por etapas en específico/peak: en vez de 1 tirada larga + 1 día de b2b, se entrena un
  // bloque de 2-3 días SEGUIDOS de fatiga acumulada — que es justo lo que exige una carrera por
  // etapas y lo que ni la tirada larga ni un back-to-back con un día de por medio simulan bien.
  // Se decide ANTES de elegir días de calidad/fuerza para que esos días respeten el bloque entero.
  const stageBlockDays = methodology.isStage && ['specific', 'peak'].includes(phase)
    ? Math.min(3, Math.max(2, w.race.n_stages || 2)) : 0;
  let remaining = w.weekMin;
  const plan = {};
  const stageDaysUsed = [];
  if (stageBlockDays > 1 && avail[L] >= 60) {
    let dayIdx = L, prevDur = Math.min(w.longMin, avail[L]);
    plan[dayIdx] = mk(dayIdx, 'long', prevDur, { key: true, zone: 'Z1-Z2', stageDay: 1, stageOf: stageBlockDays }); remaining -= prevDur;
    stageDaysUsed.push(dayIdx);
    for (let d = 2; d <= stageBlockDays; d++) {
      const next = (dayIdx + 1) % 7;
      if (!avail[next]) break; // si el atleta no tiene ese día, no forzamos el bloque más allá
      const dur = Math.min(avail[next], Math.round(prevDur * 0.75));
      plan[next] = mk(next, 'b2b', dur, { key: true, zone: 'Z1-Z2', stageDay: d, stageOf: stageBlockDays });
      remaining -= dur; prevDur = dur; dayIdx = next; stageDaysUsed.push(dayIdx);
    }
  } else {
    const longDur = Math.min(w.longMin, avail[L]);
    plan[L] = mk(L, 'long', longDur, { key: true, zone: 'Z1-Z2' }); remaining -= longDur;
    stageDaysUsed.push(L);
    if (useB2B) {
      const d = Math.min(avail[B], ['specific', 'peak'].includes(phase) ? longDur * 0.6 : Math.min(90, longDur * 0.5));
      plan[B] = mk(B, 'b2b', d, { key: ['specific', 'peak'].includes(phase), zone: 'Z1-Z2' }); remaining -= d;
      stageDaysUsed.push(B);
    }
  }
  const blocked = new Set(stageDaysUsed);

  const restDays = new Set([0, 1, 2, 3, 4, 5, 6].filter(i => !avail[i]));
  if (!restDays.size) restDays.add((L + (blocked.size > 1 ? 2 : 1)) % 7);

  const baseNQuality = { base: 1, build: 2, specific: 2, peak: 2, taper: 1, recovery: 0 }[phase] ?? 1;
  const nQualityRaw = methodology.overloaded ? Math.max(0, baseNQuality - 1) : (deload ? Math.max(0, baseNQuality - 1) : baseNQuality);
  // Tope por perfil de progresión: un atleta con lesiones registradas, principiante o mayor no
  // recibe más sesiones de calidad por semana de las que su progresión conservadora permite,
  // aunque la fase "tocase" meter más (ver progressionProfile en methodology.js).
  const nQuality = Math.min(nQualityRaw, methodology.progression.maxQuality);
  const baseNStrength = !st.strength ? 0 : { base: 2, build: 2, specific: 1, peak: 1, taper: phase === 'taper' && w.weekMin < 0.7 * 600 ? 0 : 1, recovery: 1 }[phase] ?? 1;
  const nStrength = deload ? Math.max(st.strength ? 1 : 0, baseNStrength - 1) : baseNStrength;

  // Elegir días de calidad: lejos del bloque de tirada larga (o del bloque de etapas) y separados
  // entre sí. Sin sesiones de calidad adicionales durante un bloque de etapas: ya es el estímulo
  // más específico posible de esa semana.
  const quality = [];
  for (let q = 0; q < (stageBlockDays > 1 ? 0 : nQuality); q++) {
    let best = -1, bestScore = -1e9;
    for (let i = 0; i < 7; i++) {
      if (blocked.has(i) || restDays.has(i) || quality.includes(i) || avail[i] < 50) continue;
      let sc = avail[i];
      if (Math.abs(i - L) === 1 || (i === 6 && L === 0) || (i === 0 && L === 6)) sc -= 150;
      if (useB2B && Math.abs(i - B) === 1) sc -= 100;
      if (quality.some(j => Math.abs(j - i) <= 1)) sc -= 300;
      if (i === 1 || i === 3) sc += 20; // martes/jueves por defecto
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    if (best >= 0) quality.push(best);
  }

  // Qué tipo de sesión de calidad toca según fase: base introduce desnivel suave; construcción
  // combina desnivel + series (pieza polarizada); específico y peak combinan desnivel + tempo
  // (pieza piramidal, ya en terreno de carrera); afinado solo mantiene un recuerdo de desnivel.
  // En Backyard Ultra la calidad no es umbral/VO2max: es aguantar el mismo esfuerzo moderado,
  // vuelta tras vuelta, cumpliendo la hora en punto. Por eso sustituye tempo/series por 'loop'
  // (simulacro de vueltas) y mantiene 'vert' solo si la vuelta real tiene desnivel relevante.
  const qTypes = isBackyard
    ? { base: ['loop'], build: ['loop', 'vert'], specific: ['loop', 'vert'], peak: ['loop', 'vert'], taper: ['loop'] }[phase] || []
    : { base: ['vert'], build: ['vert', 'intervals'], specific: ['vert', 'tempo'], peak: ['vert', 'tempo'], taper: ['vert'] }[phase] || [];
  // Las sesiones de desnivel alternan subida/bajada. Cuando la carrera objetivo es muy técnica de
  // bajada (o estamos ya en específico/peak, priorizando especificidad de montaña) sesgamos hacia
  // más sesiones de bajada/excéntrico, que es lo que más protege la rodilla en carrera.
  const weekIdx = Math.floor(diffDays('2020-01-06', ws) / 7);
  // Con historial de lesiones (o progresión conservadora en general) se retrasa/reduce la
  // frecuencia de bajada: es la sesión con más carga excéntrica y más riesgo si la rodilla o el
  // tendón no están preparados todavía.
  const vertVariant = methodology.progression.downhillCaution
    ? (weekIdx % 4 === 0 ? 'bajada' : 'subida')
    : methodology.downhillEmphasis
      ? (weekIdx % 3 === 0 ? 'subida' : 'bajada')
      : (weekIdx % 2 === 0 ? 'subida' : 'bajada');
  quality.forEach((i, k) => {
    const t = qTypes[k] || (isBackyard ? 'loop' : 'tempo');
    const d = t === 'loop'
      ? Math.min(avail[i], { base: 75, build: 105, specific: 150, peak: 180, taper: 60 }[phase] ?? 90)
      : Math.min(avail[i], ['specific', 'peak'].includes(phase) ? 90 : phase === 'build' ? 75 : 60);
    plan[i] = mk(i, t, d, { key: true, zone: t === 'intervals' ? 'Z4-Z5' : t === 'vert' ? 'Z3-Z4' : t === 'loop' ? 'Z2-Z3' : 'Z3',
      ...(t === 'vert' ? { variant: vertVariant } : {}),
      // El D+ del simulacro sale directo de la densidad de la vuelta real (dens = m/h en backyard).
      ...(t === 'loop' ? { dplus_m: Math.round(d / 60 * w.dens) } : {}) });
    remaining -= d;
  });

  // Fuerza: en días de calidad o fáciles (nunca antes de la tirada larga)
  const strengthDays = [];
  for (const i of [...quality, 0, 1, 2, 3, 4, 5, 6]) {
    if (strengthDays.length >= nStrength) break;
    if (strengthDays.includes(i) || blocked.has(i) || (L - i === 1) || (i === 6 && L === 0)) continue;
    if (restDays.has(i) && avail[i] === 0) continue;
    const used = plan[i]?.duration_min || 0;
    if (avail[i] - used >= 30 || (!plan[i] && avail[i] >= 30)) strengthDays.push(i);
  }
  const strengthMin = phase === 'recovery' ? 30 : 40;
  remaining -= strengthDays.length * strengthMin;

  // Rodajes suaves con el tiempo restante. Cualquier día con disponibilidad real (no marcado
  // como descanso fijo por el atleta, es decir avail[i]=0) recibe al menos un rodaje corto:
  // el objetivo es llegar lo mejor preparado posible al objetivo, así que preferimos muchos
  // días cortos a convertir tiempo libre del atleta en descanso solo porque el presupuesto
  // semanal calculado es ajustado.
  const MIN_EASY = 20;
  const easyDays = [0, 1, 2, 3, 4, 5, 6].filter(i => !plan[i] && !restDays.has(i) && avail[i] >= MIN_EASY);
  const cap = i => avail[i] - (strengthDays.includes(i) ? strengthMin : 0);
  const maxDur = phase === 'recovery' ? 50 : 90;
  const totalFloor = easyDays.reduce((s, i) => s + Math.min(MIN_EASY, cap(i)), 0);
  const extra = Math.max(0, remaining - totalFloor);
  const totalBonusCap = easyDays.reduce((s, i) => s + Math.max(0, cap(i) - MIN_EASY), 0) || 1;
  for (const i of easyDays) {
    const bonus = extra * Math.max(0, cap(i) - MIN_EASY) / totalBonusCap;
    const d = clamp(MIN_EASY + bonus, Math.min(MIN_EASY, cap(i)), Math.min(cap(i), maxDur));
    plan[i] = mk(i, phase === 'recovery' ? 'recovery' : 'easy', d, { zone: phase === 'recovery' ? 'Z1' : 'Z1-Z2' });
  }

  for (let i = 0; i < 7; i++) {
    if (plan[i]) sessions.push(plan[i]);
    if (strengthDays.includes(i)) sessions.push(mk(i, 'strength', strengthMin, { zone: '-' }));
    if (!plan[i] && !strengthDays.includes(i)) sessions.push(mk(i, 'rest', 0, { zone: '-' }));
  }

  // Carreras B y C que caen en una semana que NO es la del objetivo A: son "carreras puente" — se
  // insertan sustituyendo su día (y la tirada larga si coincide) SIN cambiar la fase/progresión de
  // la semana, que sigue orientada al objetivo A. Una B es un objetivo real aunque secundario, así
  // que además se protege con un día suave antes y uno de recuperación después (una C solo
  // sustituye su propio día: es un entreno más, aunque sea corriendo una carrera).
  for (const r of raceHere.filter(r => r.priority === 'B' || r.priority === 'C')) {
    const i = weekday(r.date);
    for (let k = sessions.length - 1; k >= 0; k--) if (sessions[k].date === r.date || sessions[k].type === 'long') sessions.splice(k, 1);
    if (r.priority === 'B') {
      const iBefore = (i + 6) % 7, iAfter = (i + 1) % 7;
      for (let k = sessions.length - 1; k >= 0; k--) if (sessions[k].date === days[iBefore] || sessions[k].date === days[iAfter]) sessions.splice(k, 1);
      if (iBefore !== i) sessions.push(mk(iBefore, 'easy', Math.min(30, avail[iBefore] || 30), { variant: 'activacion', zone: 'Z1' }));
      if (iAfter !== i) sessions.push(mk(iAfter, 'recovery', Math.min(30, avail[iAfter] || 30), { zone: 'Z1' }));
    }
    sessions.push(mk(i, 'race', (r.est_h || 3) * 60, { dplus_m: r.dplus_m || 0, distance_km: r.distance_km, key: true, zone: 'Z3', raceC: r }));
  }
  return finalize(sessions, w);
}

// Reparto de desnivel, textos y carga
function finalize(sessions, w) {
  const share = { long: 0.45, b2b: 0.2, vert: 0.2, easy: 0.15, recovery: 0.05, tempo: 0.05 };
  const shares = sessions.filter(s => share[s.type]);
  const tot = shares.reduce((a, s) => a + share[s.type] * s.duration_min, 0) || 1;
  for (const s of sessions) {
    if (share[s.type] && s.type !== 'race') {
      const maxRate = s.type === 'vert' ? 700 : s.type === 'long' || s.type === 'b2b' ? 450 : 300;
      s.dplus_m = Math.round(Math.min(w.dplus * share[s.type] * s.duration_min / tot, s.duration_min / 60 * maxRate) / 10) * 10;
    }
    Object.assign(s, describe(s, { race: w.race, phase: w.phase, settings: w.st, methodology: w.methodology }));
    s.load = sessionLoad(s);
  }
  return sessions.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'strength') - (b.type === 'strength'));
}

// ---------- Consultas ----------

export function weeksOverview(userId, from, to) {
  return db.prepare(`SELECT week_start, MAX(phase) phase, SUM(duration_min) min, SUM(dplus_m) dplus, SUM(load) load,
      SUM(CASE WHEN status IN ('done','partial') THEN 1 ELSE 0 END) done,
      SUM(CASE WHEN type NOT IN ('rest') THEN 1 ELSE 0 END) n
    FROM sessions WHERE user_id = ? AND week_start BETWEEN ? AND ? GROUP BY week_start ORDER BY week_start`).all(userId, from, to);
}

export { racesForUser as racesFor };
