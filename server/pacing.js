// Plan de carrera: reparte el objetivo de tiempo entre los tramos definidos por los
// avituallamientos/bases de vida, usando un "km-esfuerzo" (distancia + coste del desnivel)
// para que las subidas se lleven más tiempo que el llano/bajada, de forma proporcional.
import { round5 } from './util.js';

// Coste de esfuerzo aproximado: 100 m de subida ≈ 1 km llano; 100 m de bajada técnica
// cuesta bastante menos pero no es gratis (frenado). Aproximación estándar en pacing de ultras.
const UP_COST = 1 / 100;   // km-esfuerzo por metro de D+
const DOWN_COST = 1 / 400; // km-esfuerzo por metro de D-

function effortAtKm(profile, km) {
  // Devuelve el km-esfuerzo acumulado por interpolación lineal en la lista de perfil [[km, ele], ...]
  if (!profile.length) return km;
  let acc = 0, prevKm = profile[0][0], prevEle = profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    const [k, e] = profile[i];
    if (km <= k || i === profile.length - 1) {
      const segFrac = k === prevKm ? 1 : Math.min(1, Math.max(0, (km - prevKm) / (k - prevKm)));
      const partialKm = (k - prevKm) * segFrac;
      const partialEle = (e - prevEle) * segFrac;
      acc += partialKm + Math.max(0, partialEle) * UP_COST + Math.max(0, -partialEle) * DOWN_COST;
      return acc;
    }
    acc += (k - prevKm) + Math.max(0, e - prevEle) * UP_COST + Math.max(0, prevEle - e) * DOWN_COST;
    prevKm = k; prevEle = e;
  }
  return acc;
}

function totalEffort(profile) { return profile.length ? effortAtKm(profile, profile[profile.length - 1][0]) : 0; }

function fmtClock(h) {
  const total = Math.round(h * 60);
  const days = Math.floor(total / 1440);
  const hh = Math.floor(total / 60) % 24, mm = total % 60;
  const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  return days > 0 ? `${clock} (+${days}d)` : clock;
}
function fmtDur(h) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60), mm = total % 60;
  return hh ? `${hh}h${mm ? ` ${mm}m` : ''}` : `${mm} min`;
}

/**
 * @param race {distance_km, dplus_m, dminus_m, profile: [[km,ele]], target_time_h, start_time: 'HH:MM'}
 * @param aidStations [{name, km, type: 'avituallamiento'|'base_vida', rest_min}]
 */
export function buildPacingPlan(race, aidStations = []) {
  const distance = race.distance_km || (race.profile?.length ? race.profile[race.profile.length - 1][0] : 0);
  if (!distance || !race.target_time_h) return null;
  const profile = race.profile && race.profile.length > 1 ? race.profile
    : [[0, 0], [distance, 0]]; // sin GPX: asumimos esfuerzo repartido uniforme (solo por km)

  const stops = [...aidStations].filter(a => a.km > 0 && a.km < distance).sort((a, b) => a.km - b.km);
  const points = [
    { name: 'Salida', km: 0, type: 'salida', rest_min: 0 },
    ...stops,
    { name: 'Meta', km: distance, type: 'meta', rest_min: 0 },
  ];

  const totalRestH = stops.reduce((s, a) => s + (a.rest_min || 0), 0) / 60;
  const movingH = Math.max(0.5, race.target_time_h - totalRestH);
  const totalEff = totalEffort(profile);
  const paceHperEff = movingH / (totalEff || distance); // horas por km-esfuerzo

  let cumH = 0;
  const rows = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const effPrev = effortAtKm(profile, prev.km), effCur = effortAtKm(profile, cur.km);
    const segEffort = Math.max(0, effCur - effPrev);
    const segH = segEffort * paceHperEff;
    cumH += segH;
    const arrivalH = cumH;
    cumH += (cur.rest_min || 0) / 60;
    rows.push({
      name: cur.name, km: cur.km, type: cur.type,
      segment_km: +(cur.km - prev.km).toFixed(1),
      segment_time: fmtDur(segH),
      arrival_elapsed: fmtDur(arrivalH),
      arrival_clock: race.start_time ? fmtClock(toHours(race.start_time) + arrivalH) : null,
      rest_min: cur.rest_min || 0,
      pace_min_km: segEffort > 0 ? Math.round(segH * 60 / (cur.km - prev.km || 1)) : null,
      cutoff_km_h: race.time_limit_h ? +(race.time_limit_h * (cur.km / distance)).toFixed(1) : null,
    });
  }
  return {
    target_time_h: race.target_time_h, moving_h: +movingH.toFixed(2), rest_h: +totalRestH.toFixed(2),
    total_effort_km: +totalEff.toFixed(1), avg_pace_min_km_equiv: +(movingH * 60 / (totalEff || distance)).toFixed(1),
    rows,
  };
}

function toHours(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; }
