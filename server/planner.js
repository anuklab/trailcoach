// Generador del plan de entrenamiento periodizado para ultra trail.
import { db, getSettings, tx, log } from './db.js';
import { sessionLoad } from './load.js';
import { addDays, diffDays, mondayOf, weekday, today, clamp, round5, toDate } from './util.js';
import { describe } from './workouts.js';

const RUN_TYPES = `('Run','TrailRun','Hike','Walk','VirtualRun')`;

// ---------- Estimaciones a partir del historial ----------

// "Km-esfuerzo": km + D+/100. Estimamos el tiempo de carrera con una ley de potencia (tipo Riegel).
export function estimateRaceHours(userId, race) {
  const ekm = (race.distance_km || 0) + (race.dplus_m || 0) / 100;
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
    const loading = weeks.filter(w => ['base', 'construcción', 'específico'].includes(w.phase));
    const plannedAll = weeks.reduce((s, w) => s + w.planned, 0);
    const actualAll = db.prepare(`SELECT SUM(moving_time_s)/60.0 m FROM activities WHERE user_id = ? AND date >= ? AND date < ?`).get(userId, w3, mondayOf(from))?.m || 0;
    const compliance = plannedAll ? clamp(actualAll / plannedAll, 0.75, 1.05) : 1;
    if (loading.length) buildMin = Math.max(...loading.map(w => w.planned)) * compliance;
    for (let i = weeks.length - 1; i >= 0 && ['base', 'construcción', 'específico'].includes(weeks[i].phase); i--) loadStreak++;
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
  return db.prepare('SELECT * FROM races WHERE user_id = ? ORDER BY date').all(userId).map(r => ({ ...r, est_h: estimateRaceHours(userId, r) }));
}

function phaseForWeek(ws, races) {
  const we = addDays(ws, 6);
  const main = races.filter(r => r.priority !== 'C');
  const inWeek = main.find(r => r.date >= ws && r.date <= we);
  if (inWeek) return { phase: 'carrera', race: inWeek };
  // recuperación tras carrera A/B
  const prev = main.filter(r => r.date < ws).pop();
  if (prev) {
    const weeksAfter = Math.ceil(diffDays(mondayOf(prev.date), ws) / 7);
    const big = (prev.distance_km || 0) + (prev.dplus_m || 0) / 100 > 120;
    if (weeksAfter === 1) return { phase: 'recuperación', race: prev, factor: prev.priority === 'A' || big ? 0.35 : 0.55 };
    if (weeksAfter === 2 && big) return { phase: 'recuperación', race: prev, factor: 0.65 };
  }
  const next = main.find(r => r.date > we);
  if (!next) return { phase: 'transición', race: null, factor: 0.5 };
  const N = Math.round(diffDays(ws, mondayOf(next.date)) / 7);
  if (next.priority === 'A' && N === 1) return { phase: 'afinado', race: next, factor: 0.6 };
  if (next.priority === 'A' && N === 2) return { phase: 'afinado', race: next, factor: 0.8 };
  if (next.priority === 'B' && N === 1) return { phase: 'afinado', race: next, factor: 0.8 };
  if (N <= 8) return { phase: 'específico', race: next, N };
  if (N <= 16) return { phase: 'construcción', race: next, N };
  return { phase: 'base', race: next, N };
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
    const race = ph.race;
    const peakMin = race ? Math.min(capMin, clamp((race.est_h || 20) * 0.4 + 6, 8, 18) * 60) : capMin * 0.7;
    const dens = race?.dplus_m && race.est_h ? race.dplus_m / race.est_h : 200; // m/h de carrera
    const peakLong = race ? Math.min(st.availability[st.long_day] || 240, clamp((race.est_h || 10) * 0.2 * 60, 120, 390)) : 180;

    let weekMin, phase = ph.phase, densF = 0.6;
    if (['base', 'construcción', 'específico'].includes(phase)) {
      streak++;
      if (streak % 4 === 0) { phase = 'asimilación'; weekMin = buildMin * 0.7; }
      else {
        buildMin = Math.min(peakMin, buildMin * 1.1 + 15);
        weekMin = buildMin;
        longMin = Math.min(peakLong, longMin + (phase === 'base' ? 15 : 25));
      }
      densF = { base: 0.55, 'construcción': 0.85, 'específico': 1.1, 'asimilación': 0.7 }[phase];
    } else {
      streak = 0;
      if (phase === 'carrera') weekMin = buildMin * 0.35;
      else weekMin = buildMin * (ph.factor ?? 0.6);
      if (phase === 'recuperación') { longMin = Math.max(90, longMin * 0.8); densF = 0.4; }
      if (phase === 'afinado') densF = 0.8;
    }
    weekMin = Math.min(weekMin, capMin);

    const week = {
      ws, phase, race, weekMin, dplus: Math.round(weekMin / 60 * dens * densF),
      longMin: phase === 'afinado' ? Math.min(longMin, 60 + (ph.factor || 0.6) * 150)
        : phase === 'asimilación' ? longMin * 0.75 : phase === 'recuperación' ? Math.min(longMin, 90) : longMin,
      st, races, dens,
    };
    for (const s of buildWeek(week)) {
      if (s.date < start || keepDates.has(s.date)) continue;
      out.push(s);
    }
    if (phase === 'recuperación' || phase === 'carrera') buildMin = Math.max(buildMin * 0.92, 180);
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
  const { ws, phase, race, st } = w;
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
  if (phase === 'carrera') {
    const r = w.race; const ri = weekday(r.date);
    for (let i = 0; i < 7; i++) {
      if (i === ri) sessions.push(mk(i, 'race', (r.est_h || 10) * 60, { dplus_m: r.dplus_m || 0, distance_km: r.distance_km, key: true, zone: 'Z2-Z3' }));
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
  const useB2B = ['específico', 'construcción'].includes(phase) && B !== L && avail[B] >= 60;
  const restDays = new Set([0, 1, 2, 3, 4, 5, 6].filter(i => !avail[i]));
  if (!restDays.size) restDays.add((L + (useB2B ? 2 : 1)) % 7);

  const nQuality = { base: 1, 'construcción': 2, 'específico': 2, 'asimilación': 1, afinado: 1, 'recuperación': 0, 'transición': 0 }[phase] ?? 1;
  const nStrength = !st.strength ? 0 : { base: 2, 'construcción': 2, 'específico': 1, 'asimilación': 1, afinado: phase === 'afinado' && w.weekMin < 0.7 * 600 ? 0 : 1, 'recuperación': 1, 'transición': 2 }[phase] ?? 1;

  // Elegir días de calidad: lejos de la tirada larga y separados entre sí
  const quality = [];
  for (let q = 0; q < nQuality; q++) {
    let best = -1, bestScore = -1e9;
    for (let i = 0; i < 7; i++) {
      if (i === L || (useB2B && i === B) || restDays.has(i) || quality.includes(i) || avail[i] < 50) continue;
      let sc = avail[i];
      if (Math.abs(i - L) === 1 || (i === 6 && L === 0) || (i === 0 && L === 6)) sc -= 150;
      if (useB2B && Math.abs(i - B) === 1) sc -= 100;
      if (quality.some(j => Math.abs(j - i) <= 1)) sc -= 300;
      if (i === 1 || i === 3) sc += 20; // martes/jueves por defecto
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    if (best >= 0) quality.push(best);
  }

  let remaining = w.weekMin;
  const plan = {};
  const longDur = Math.min(w.longMin, avail[L]);
  plan[L] = mk(L, 'long', longDur, { key: true, zone: 'Z1-Z2' }); remaining -= longDur;
  if (useB2B) {
    const d = Math.min(avail[B], phase === 'específico' ? longDur * 0.6 : Math.min(90, longDur * 0.5));
    plan[B] = mk(B, 'b2b', d, { key: phase === 'específico', zone: 'Z1-Z2' }); remaining -= d;
  }
  const qTypes = {
    base: ['vert'], 'construcción': ['vert', 'intervals'], 'específico': ['vert', 'tempo'],
    'asimilación': ['tempo'], afinado: ['vert'],
  }[phase] || [];
  // Las sesiones de desnivel alternan semana a semana entre foco en subida (técnica de power
  // hiking) y foco en bajada (técnica de frenada/apoyo) — un ultra exige ambas por separado.
  const vertVariant = (Math.floor(diffDays('2020-01-06', ws) / 7) % 2 === 0) ? 'subida' : 'bajada';
  quality.forEach((i, k) => {
    const t = qTypes[k] || 'tempo';
    const d = Math.min(avail[i], phase === 'específico' ? 90 : phase === 'construcción' ? 75 : 60);
    plan[i] = mk(i, t, d, { key: true, zone: t === 'intervals' ? 'Z4-Z5' : t === 'vert' ? 'Z3-Z4' : 'Z3',
      ...(t === 'vert' ? { variant: vertVariant } : {}) });
    remaining -= d;
  });

  // Fuerza: en días de calidad o fáciles (nunca antes de la tirada larga)
  const strengthDays = [];
  for (const i of [...quality, 0, 1, 2, 3, 4, 5, 6]) {
    if (strengthDays.length >= nStrength) break;
    if (strengthDays.includes(i) || i === L || (useB2B && i === B) || (L - i === 1) || (i === 6 && L === 0)) continue;
    if (restDays.has(i) && avail[i] === 0) continue;
    const used = plan[i]?.duration_min || 0;
    if (avail[i] - used >= 30 || (!plan[i] && avail[i] >= 30)) strengthDays.push(i);
  }
  const strengthMin = phase === 'recuperación' ? 30 : 40;
  remaining -= strengthDays.length * strengthMin;

  // Rodajes suaves con el tiempo restante. Cualquier día con disponibilidad real (no marcado
  // como descanso fijo por el atleta, es decir avail[i]=0) recibe al menos un rodaje corto:
  // el objetivo es llegar lo mejor preparado posible al objetivo, así que preferimos muchos
  // días cortos a convertir tiempo libre del atleta en descanso solo porque el presupuesto
  // semanal calculado es ajustado.
  const MIN_EASY = 20;
  const easyDays = [0, 1, 2, 3, 4, 5, 6].filter(i => !plan[i] && !restDays.has(i) && avail[i] >= MIN_EASY);
  const cap = i => avail[i] - (strengthDays.includes(i) ? strengthMin : 0);
  const maxDur = phase === 'recuperación' ? 50 : 90;
  const totalFloor = easyDays.reduce((s, i) => s + Math.min(MIN_EASY, cap(i)), 0);
  const extra = Math.max(0, remaining - totalFloor);
  const totalBonusCap = easyDays.reduce((s, i) => s + Math.max(0, cap(i) - MIN_EASY), 0) || 1;
  for (const i of easyDays) {
    const bonus = extra * Math.max(0, cap(i) - MIN_EASY) / totalBonusCap;
    const d = clamp(MIN_EASY + bonus, Math.min(MIN_EASY, cap(i)), Math.min(cap(i), maxDur));
    plan[i] = mk(i, phase === 'recuperación' ? 'recovery' : 'easy', d, { zone: phase === 'recuperación' ? 'Z1' : 'Z1-Z2' });
  }

  for (let i = 0; i < 7; i++) {
    if (plan[i]) sessions.push(plan[i]);
    if (strengthDays.includes(i)) sessions.push(mk(i, 'strength', strengthMin, { zone: '-' }));
    if (!plan[i] && !strengthDays.includes(i)) sessions.push(mk(i, 'rest', 0, { zone: '-' }));
  }

  // Carreras C: sustituyen la sesión de ese día y la tirada larga
  for (const r of raceHere.filter(r => r.priority === 'C')) {
    const i = weekday(r.date);
    for (let k = sessions.length - 1; k >= 0; k--) if (sessions[k].date === r.date || sessions[k].type === 'long') sessions.splice(k, 1);
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
    Object.assign(s, describe(s, { race: w.race, phase: w.phase, settings: w.st }));
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
