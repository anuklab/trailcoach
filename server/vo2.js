// Estimación de VO2max a partir del mejor esfuerzo sostenido reciente, usando las fórmulas
// publicadas de Jack Daniels y Jimmy Gilbert (las mismas que hay detrás de las tablas VDOT).
// Es una aproximación, no una prueba de laboratorio: solo se fía de tramos razonablemente
// llanos (poco D+ por km), porque el desnivel distorsiona mucho la relación ritmo-esfuerzo.
import { db } from './db.js';

const RUN_TYPES = `('Run', 'TrailRun')`;
const LOOKBACK_DAYS = 120;
const MAX_GRADE_M_PER_KM = 15; // por encima de esto, el ritmo ya no es representativo de esfuerzo llano

export function estimateVO2max(userId) {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  const sinceStr = since.toISOString().slice(0, 10);

  const acts = db.prepare(`SELECT * FROM activities WHERE user_id = ? AND sport_type IN ${RUN_TYPES}
      AND date >= ? AND moving_time_s BETWEEN 480 AND 3600 AND distance_m > 2500`).all(userId, sinceStr);

  let best = null, bestV = 0;
  for (const a of acts) {
    const gradePerKm = (a.elevation_gain_m || 0) / (a.distance_m / 1000);
    if (gradePerKm > MAX_GRADE_M_PER_KM) continue;
    const v = a.distance_m / (a.moving_time_s / 60); // metros/min
    if (v > bestV) { bestV = v; best = a; }
  }
  if (!best) return null;

  const t = best.moving_time_s / 60;
  const vo2 = -4.60 + 0.182258 * bestV + 0.000104 * bestV * bestV;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  const vdot = vo2 / pct;

  return {
    vo2max: +vdot.toFixed(1),
    source: {
      name: best.name, date: best.date,
      distance_km: +(best.distance_m / 1000).toFixed(1),
      duration_min: Math.round(t),
      pace_min_km: +(t / (best.distance_m / 1000)).toFixed(2),
    },
  };
}
