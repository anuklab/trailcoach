// Modelo de carga: TRIMP de Banister + CTL (forma, 42 d) / ATL (fatiga, 7 d) / TSB (frescura).
import { db, getSettings } from './db.js';
import { addDays, diffDays } from './util.js';

// Fracción de FC de reserva estimada por zona
export const ZONE_HRR = { Z1: 0.55, Z2: 0.65, Z3: 0.75, Z4: 0.85, Z5: 0.92 };

export function trimp(minutes, hrr) {
  if (!minutes || minutes <= 0) return 0;
  return minutes * hrr * 0.64 * Math.exp(1.92 * hrr);
}

// Carga prevista de una sesión del plan
export function sessionLoad(s) {
  if (s.type === 'rest') return 0;
  if (s.type === 'strength') return Math.round(trimp(s.duration_min, 0.5));
  const hrr = ZONE_HRR[(s.zone || 'Z2').split('-').pop()] ?? 0.65;
  // Media ponderada: las sesiones de calidad solo tienen ~40 % del tiempo en zona alta
  const quality = ['vert', 'tempo', 'intervals'].includes(s.type);
  const eff = quality ? 0.6 * 0.65 + 0.4 * hrr : hrr;
  // El desnivel suma coste (≈ 1 min extra cada 10 m de D+ en Z2)
  return Math.round(trimp(s.duration_min, eff) + (s.dplus_m || 0) * 0.08);
}

const SPORT_HRR = { Run: 0.66, TrailRun: 0.68, Hike: 0.55, Walk: 0.45, Ride: 0.6, MountainBikeRide: 0.62,
  VirtualRide: 0.62, NordicSki: 0.65, BackcountrySki: 0.64, Swim: 0.6, WeightTraining: 0.5, Workout: 0.55 };

// Carga real de una actividad de Strava
export function activityLoad(a) {
  const st = getSettings();
  const min = (a.moving_time_s || 0) / 60;
  let hrr;
  if (a.avg_hr && st.hr_max > st.hr_rest) {
    hrr = Math.max(0.3, Math.min(1, (a.avg_hr - st.hr_rest) / (st.hr_max - st.hr_rest)));
  } else {
    hrr = SPORT_HRR[a.sport_type] ?? 0.55;
  }
  const extraVert = a.avg_hr ? 0 : (a.elevation_gain_m || 0) * 0.08;
  return Math.round(trimp(min, hrr) + extraVert);
}

// Serie diaria de carga, CTL, ATL y TSB entre dos fechas
export function fitnessSeries(from, to, { includePlanned = false } = {}) {
  const start = addDays(from, -120); // precalentar las medias
  const acts = db.prepare('SELECT date, SUM(load) l FROM activities WHERE date BETWEEN ? AND ? GROUP BY date').all(start, to);
  const map = Object.fromEntries(acts.map(r => [r.date, r.l]));
  if (includePlanned) {
    const pl = db.prepare(`SELECT date, SUM(load) l FROM sessions WHERE date BETWEEN ? AND ? AND status='planned' GROUP BY date`).all(start, to);
    for (const r of pl) if (!(r.date in map)) map[r.date] = r.l;
  }
  const kC = 1 - Math.exp(-1 / 42), kA = 1 - Math.exp(-1 / 7);
  let ctl = 0, atl = 0; const out = [];
  const n = diffDays(start, to);
  for (let i = 0; i <= n; i++) {
    const d = addDays(start, i);
    const l = map[d] || 0;
    ctl += (l - ctl) * kC; atl += (l - atl) * kA;
    if (d >= from) out.push({ date: d, load: Math.round(l), ctl: +ctl.toFixed(1), atl: +atl.toFixed(1), tsb: +(ctl - atl).toFixed(1) });
  }
  return out;
}

export function currentFitness(date) {
  const s = fitnessSeries(addDays(date, -1), addDays(date, -1));
  return s[s.length - 1] || { ctl: 0, atl: 0, tsb: 0 };
}
