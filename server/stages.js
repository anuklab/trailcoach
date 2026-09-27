// Carreras por etapas: cada día del rango de la carrera (etapa o descanso) se guarda como un
// elemento en race.stages (JSON), en vez de la "etapa media" ficticia que se usaba antes.
// Formato de cada elemento: { date:'YYYY-MM-DD', km, dplus_m, dminus_m, rest:boolean }.
import { addDays, diffDays } from './util.js';

// Parsea race.stages (columna TEXT con JSON, o ya un array si viene del propio proceso) a un
// array normalizado y ordenado por fecha. Devuelve [] si no hay etapas (carrera no confirmada
// todavía, o carrera que no es de tipo 'stage').
export function parseStages(race) {
  if (!race || !race.stages) return [];
  let arr;
  try { arr = typeof race.stages === 'string' ? JSON.parse(race.stages) : race.stages; }
  catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr
    .map(s => ({
      date: s.date,
      km: s.rest ? 0 : Math.max(0, Number(s.km) || 0),
      dplus_m: s.rest ? 0 : Math.max(0, Number(s.dplus_m) || 0),
      dminus_m: s.rest ? 0 : Math.max(0, Number(s.dminus_m) || 0),
      rest: !!s.rest,
    }))
    .filter(s => s.date)
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

// Genera un array de días por defecto entre dos fechas (inclusive), sin datos de km/D+ (a rellenar
// por el atleta) y sin ningún descanso marcado — punto de partida cuando se cambia el rango de
// fechas en el editor de etapas.
export function defaultStages(startDate, endDate) {
  const n = Math.max(0, diffDays(startDate, endDate)) + 1;
  return Array.from({ length: n }, (_, i) => ({ date: addDays(startDate, i), km: null, dplus_m: null, dminus_m: null, rest: false }));
}

// Totales derivados de las etapas: nº de etapas reales (sin contar descansos), suma de km/D+/D-,
// fecha de inicio/fin del conjunto. Estos son los valores que se guardan en n_stages/distance_km/
// dplus_m/dminus_m de la fila de carrera, para que el resto del código (estimaciones, tarjetas,
// listados) siga funcionando igual que con una carrera de un día sin tener que saber de etapas.
// Reparte un tiempo total (target_time_h o la estimación del modelo) entre las etapas reales de
// la carrera, proporcional al "km-esfuerzo" de cada una (km + coste del D+/D-) — así una etapa
// reina con mucho desnivel se lleva más horas estimadas que una etapa corta y llana, en vez de
// asumir que todas las etapas duran lo mismo (que es lo que hacía el modelo anterior).
const UP_COST = 1 / 100, DOWN_COST = 1 / 400;
export function estimateStageHours(stages, totalH) {
  const running = stages.filter(s => !s.rest);
  if (!running.length || !totalH) return stages.map(s => ({ ...s, h: 0 }));
  const effortOf = s => s.km + (s.dplus_m || 0) * UP_COST + (s.dminus_m || 0) * DOWN_COST;
  const totalEff = running.reduce((sum, s) => sum + effortOf(s), 0) || 1;
  return stages.map(s => s.rest ? { ...s, h: 0 } : { ...s, h: totalH * effortOf(s) / totalEff });
}

export function stagesTotals(stages) {
  const running = stages.filter(s => !s.rest);
  return {
    n_stages: running.length,
    distance_km: running.length ? +running.reduce((s, x) => s + x.km, 0).toFixed(1) : null,
    dplus_m: running.length ? Math.round(running.reduce((s, x) => s + x.dplus_m, 0)) : null,
    dminus_m: running.length ? Math.round(running.reduce((s, x) => s + x.dminus_m, 0)) : null,
    start_date: stages[0]?.date || null,
    end_date: stages[stages.length - 1]?.date || null,
  };
}
