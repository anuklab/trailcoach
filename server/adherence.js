// "¿En qué punto del camino estoy?" — mide si el atleta está siguiendo el plan
// o llevando muchos días flojo (sesiones no hechas / recortadas / con ajustes a la baja).
import { db, getSettings } from './db.js';
import { addDays, today } from './util.js';

const WINDOW = 14; // días que miramos hacia atrás

// Mensajes de adherencia en los 5 idiomas de la interfaz (nav_hoy, etc. en public/i18n.js).
// Solo estas 5 plantillas — a diferencia de las descripciones de sesión (generadas en
// workouts.js), que siguen en castellano por ahora — se traducen aquí porque son un conjunto
// pequeño y cerrado de mensajes, no prosa libre.
const ADHERENCE_MSG = {
  es: {
    sin_datos: () => 'Aún no hay suficientes datos para valorar tu progresión.',
    flojeando: (streak) => `Llevas ${streak} días seguidos sin completar entrenos. Es buen momento para preguntarte por qué (¿falta de tiempo, motivación, alguna molestia?) — si necesitas replanificar objetivos, dímelo y lo adaptamos juntos.`,
    atencion: (pct) => `Vas un poco flojo esta quincena (${pct}% de cumplimiento). No pasa nada por un bache, pero si sigue así conviene ajustar el plan a algo más realista.`,
    en_camino: (pct) => `Vas muy bien encaminado: ${pct}% de cumplimiento en las últimas dos semanas. Sigue así.`,
    estable: (pct) => `Progresión estable (${pct}% de cumplimiento). Todo en orden.`,
  },
  en: {
    sin_datos: () => 'Not enough data yet to assess your progress.',
    flojeando: (streak) => `You've gone ${streak} days in a row without completing a session. It's a good time to ask why (lack of time, motivation, some discomfort?) — if you need to replan your goals, tell me and we'll adjust it together.`,
    atencion: (pct) => `You're a bit behind this fortnight (${pct}% completion). A rough patch is fine, but if it continues it's worth adjusting the plan to something more realistic.`,
    en_camino: (pct) => `You're right on track: ${pct}% completion over the last two weeks. Keep it up.`,
    estable: (pct) => `Steady progress (${pct}% completion). All good.`,
  },
  fr: {
    sin_datos: () => 'Pas encore assez de données pour évaluer ta progression.',
    flojeando: (streak) => `Ça fait ${streak} jours d'affilée sans terminer une séance. C'est le bon moment de te demander pourquoi (manque de temps, de motivation, une gêne ?) — si tu dois replanifier tes objectifs, dis-le-moi et on ajuste ensemble.`,
    atencion: (pct) => `Tu es un peu en retrait cette quinzaine (${pct}% de réussite). Un coup de mou, ce n'est pas grave, mais si ça continue mieux vaut ajuster le plan à quelque chose de plus réaliste.`,
    en_camino: (pct) => `Tu es en très bonne voie : ${pct}% de réussite ces deux dernières semaines. Continue comme ça.`,
    estable: (pct) => `Progression stable (${pct}% de réussite). Tout va bien.`,
  },
  ca: {
    sin_datos: () => 'Encara no hi ha prou dades per valorar la teva progressió.',
    flojeando: (streak) => `Portes ${streak} dies seguits sense completar entrenaments. És un bon moment per preguntar-te per què (falta de temps, motivació, alguna molèstia?) — si necessites replanificar objectius, digues-m'ho i ho ajustem junts.`,
    atencion: (pct) => `Vas una mica fluix aquesta quinzena (${pct}% de compliment). No passa res per un bache, però si continua així convé ajustar el pla a alguna cosa més realista.`,
    en_camino: (pct) => `Vas molt ben encaminat: ${pct}% de compliment en les últimes dues setmanes. Segueix així.`,
    estable: (pct) => `Progressió estable (${pct}% de compliment). Tot en ordre.`,
  },
  oc: {
    sin_datos: () => 'Encara non i a pro donadas entà valorar era tua progression.',
    flojeando: (streak) => `Pòrtes ${streak} dies de seguit sense acabar entrainaments. Ei bon moment entà demandar-te per qué (manca de temps, de motivacion, bèra molèstia?) — se cau tornar planificar objectius, ditz-m'ac e ac ajustam amassa.`,
    atencion: (pct) => `Vas un shinhau fluish aguesta quinzena (${pct}% de compliment). Non i a arren de mau per un bache, mès se contunha atau cau ajustar eth plan a quauquarren mès realista.`,
    en_camino: (pct) => `Vas fòrça ben encaminat: ${pct}% de compliment enes darrères dues setmanas. Contunha atau.`,
    estable: (pct) => `Progression establa (${pct}% de compliment). Tot en òrdre.`,
  },
};
function adherenceMsg(lang, key, ...args) {
  const dict = ADHERENCE_MSG[lang] || ADHERENCE_MSG.es;
  return (dict[key] || ADHERENCE_MSG.es[key])(...args);
}

// Enlaza sesiones planificadas con actividades reales de Strava que ya estaban importadas pero
// que nunca llegaron a emparejarse (matchSession en strava.js solo mira las actividades nuevas de
// CADA sincronización — si una actividad se importó ANTES de que existiera la sesión planificada
// de ese día, ej. un resync histórico hecho antes de generar el plan, se queda huérfana para
// siempre). Sin esto, el % de "entrenos completados" sale mal: el atleta sí entrenó (se ve en
// km/D+/horas, que vienen directo de `activities`) pero la sesión sigue en estado "planned".
// Se llama de forma barata y repetible (idempotente) cada vez que se genera/regenera el plan y
// cada vez que se pide el resumen de "Hoy", así se autocorrige sin necesitar un resync manual.
export function backfillSessionMatches(userId) {
  const pending = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND activity_id IS NULL AND status = 'planned'
      AND type NOT IN ('rest','strength') AND date < ? ORDER BY date`).all(userId, today());
  let n = 0;
  for (const s of pending) {
    const act = db.prepare(`SELECT * FROM activities WHERE user_id = ? AND date = ?
        AND id NOT IN (SELECT activity_id FROM sessions WHERE user_id = ? AND activity_id IS NOT NULL)
        ORDER BY moving_time_s DESC LIMIT 1`).get(userId, s.date, userId);
    if (!act) continue;
    const actualMin = (act.moving_time_s || 0) / 60;
    const status = (s.duration_min > 0 && actualMin < s.duration_min * 0.5) ? 'partial' : 'done';
    db.prepare(`UPDATE sessions SET activity_id = ?, status = ? WHERE id = ? AND user_id = ?`).run(act.id, status, s.id, userId);
    n++;
  }
  return n;
}

export function adherenceStatus(userId, date = today()) {
  const lang = (getSettings(userId) || {}).language || 'es';
  const from = addDays(date, -WINDOW);
  const rows = db.prepare(`SELECT date, type, status, origin, duration_min, load FROM sessions
      WHERE user_id = ? AND date >= ? AND date < ? AND type != 'rest' ORDER BY date`).all(userId, from, date);
  if (!rows.length) return { level: 'sin_datos', message: adherenceMsg(lang, 'sin_datos'), streak: 0 };

  const past = rows.filter(r => r.date < date); // solo lo que ya debería haber pasado
  const evaluable = past.filter(r => r.status !== 'planned');
  const compliance = evaluable.length ? evaluable.reduce((s, r) => s + (r.status === 'done' ? 1 : r.status === 'partial' ? 0.5 : 0), 0) / evaluable.length : 1;

  // Racha de días consecutivos (hacia atrás desde ayer) sin nada completado del todo
  let streak = 0;
  const byDate = {};
  for (const r of past) (byDate[r.date] ||= []).push(r);
  const dates = Object.keys(byDate).sort().reverse();
  for (const d of dates) {
    const sessions = byDate[d];
    const anyDone = sessions.some(s => s.status === 'done' || s.status === 'partial');
    const anyEvaluated = sessions.some(s => s.status !== 'planned');
    if (!anyEvaluated) continue; // aún sin marcar, no cuenta como fallo todavía
    if (anyDone) break;
    streak++;
  }

  // Cuántos ajustes a la baja (origin ia/ajuste que redujeron algo) en la ventana
  const reduced = db.prepare(`SELECT COUNT(*) c FROM sessions WHERE user_id = ? AND date >= ? AND date < ? AND origin IN ('ajuste','ia') AND change_note IS NOT NULL`).get(userId, from, date).c;

  const pct = Math.round(compliance * 100);
  let level, message;
  if (streak >= 5) {
    level = 'flojeando';
    message = adherenceMsg(lang, 'flojeando', streak);
  } else if (streak >= 3 || compliance < 0.6) {
    level = 'atencion';
    message = adherenceMsg(lang, 'atencion', pct);
  } else if (compliance >= 0.85 && reduced <= 2) {
    level = 'en_camino';
    message = adherenceMsg(lang, 'en_camino', pct);
  } else {
    level = 'estable';
    message = adherenceMsg(lang, 'estable', pct);
  }
  return { level, message, streak, compliance: +compliance.toFixed(2), reduced_sessions: reduced };
}

// Resumen de los últimos N días (para la pantalla Hoy)
export function monthSummary(userId, date = today(), days = 30) {
  const from = addDays(date, -days);
  const acts = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(distance_m),0) dist, COALESCE(SUM(elevation_gain_m),0) dplus,
      COALESCE(SUM(moving_time_s),0) secs, COALESCE(SUM(load),0) load
    FROM activities WHERE user_id = ? AND date >= ? AND date < ?`).get(userId, from, date);
  const planned = db.prepare(`SELECT COUNT(*) n FROM sessions WHERE user_id = ? AND date >= ? AND date < ? AND type != 'rest'`).get(userId, from, date);
  const done = db.prepare(`SELECT COUNT(*) n FROM sessions WHERE user_id = ? AND date >= ? AND date < ? AND type != 'rest' AND status IN ('done','partial')`).get(userId, from, date);
  return {
    days, km: +(acts.dist / 1000).toFixed(0), dplus: Math.round(acts.dplus), hours: +(acts.secs / 3600).toFixed(1),
    activities: acts.n, planned_sessions: planned.n, completed_sessions: done.n,
    completion_pct: planned.n ? Math.round(done.n / planned.n * 100) : null,
  };
}
