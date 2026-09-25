// "¿En qué punto del camino estoy?" — mide si el atleta está siguiendo el plan
// o llevando muchos días flojo (sesiones no hechas / recortadas / con ajustes a la baja).
import { db } from './db.js';
import { addDays, today } from './util.js';

const WINDOW = 14; // días que miramos hacia atrás

export function adherenceStatus(userId, date = today()) {
  const from = addDays(date, -WINDOW);
  const rows = db.prepare(`SELECT date, type, status, origin, duration_min, load FROM sessions
      WHERE user_id = ? AND date >= ? AND date < ? AND type != 'rest' ORDER BY date`).all(userId, from, date);
  if (!rows.length) return { level: 'sin_datos', message: 'Aún no hay suficientes datos para valorar tu progresión.', streak: 0 };

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

  let level, message;
  if (streak >= 5) {
    level = 'flojeando';
    message = `Llevas ${streak} días seguidos sin completar entrenos. Es buen momento para preguntarte por qué (¿falta de tiempo, motivación, alguna molestia?) — si necesitas replanificar objetivos, dímelo y lo adaptamos juntos.`;
  } else if (streak >= 3 || compliance < 0.6) {
    level = 'atencion';
    message = `Vas un poco flojo esta quincena (${Math.round(compliance * 100)}% de cumplimiento). No pasa nada por un bache, pero si sigue así conviene ajustar el plan a algo más realista.`;
  } else if (compliance >= 0.85 && reduced <= 2) {
    level = 'en_camino';
    message = `Vas muy bien encaminado: ${Math.round(compliance * 100)}% de cumplimiento en las últimas dos semanas. Sigue así.`;
  } else {
    level = 'estable';
    message = `Progresión estable (${Math.round(compliance * 100)}% de cumplimiento). Todo en orden.`;
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
