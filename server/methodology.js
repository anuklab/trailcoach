// El "cerebro" del entrenador: decide, semana a semana, qué metodología real de resistencia/
// ultra trail aplica — combinando varias en vez de obligar al atleta a elegir una sola:
//   1. Entrenamiento polarizado (mucho volumen muy suave + poco pero muy fuerte, casi nada de umbral)
//   2. Entrenamiento piramidal (el volumen baja según sube la intensidad, con bastante umbral)
//   3. Periodización por bloques (BASE → BUILD → SPECIFIC → PEAK → TAPER → RACE → RECOVERY)
//   4. Back-to-back long runs (tiradas largas en días consecutivos)
//   5. Entrenamiento basado en la especificidad de la carrera objetivo (terreno, desnivel, duración)
// La fase de cada semana ya no depende solo de "cuántas semanas faltan": también entra el nivel
// del atleta (inferido de su historial, sin tener que rellenar un formulario aparte), su volumen y
// disponibilidad reales, y — lo más importante — su fatiga real (Forma/Fatiga/Frescura) en el
// momento de generar el plan. Así el sistema se comporta como un entrenador que mira los datos,
// no como un calendario fijo de 12-16 semanas.
import { db, getSettings } from './db.js';
import { currentFitness } from './load.js';
import { addDays, diffDays, mondayOf, today } from './util.js';

const RUN_TYPES = `('Run','TrailRun','Hike','Walk','VirtualRun')`;

export const PHASE_LABEL = {
  base: 'Base', build: 'Construcción', specific: 'Específico',
  peak: 'Máxima especificidad', taper: 'Afinado', race: 'Carrera', recovery: 'Recuperación',
};

// ---------- Nivel del atleta ----------
// Inferido del historial real (volumen del último año, ultra más larga terminada, nº de carreras
// pasadas registradas, años de histórico) — no le pedimos que se autoclasifique.
export function classifyAthlete(userId) {
  const since1y = addDays(today(), -365);
  const vol = db.prepare(`SELECT SUM(moving_time_s)/60.0 m FROM activities
    WHERE user_id = ? AND sport_type IN ${RUN_TYPES} AND date >= ?`).get(userId, since1y);
  const weeklyMin = Math.round((vol?.m || 0) / 52);
  const longestUltra = db.prepare(`SELECT MAX(distance_km) d FROM past_races WHERE user_id = ?`).get(userId)?.d || 0;
  const nPastRaces = db.prepare(`SELECT COUNT(*) n FROM past_races WHERE user_id = ?`).get(userId)?.n || 0;
  const firstAct = db.prepare(`SELECT MIN(date) d FROM activities WHERE user_id = ?`).get(userId)?.d;
  const yearsHistory = firstAct ? +(diffDays(firstAct, today()) / 365).toFixed(1) : 0;

  let score = 0;
  if (weeklyMin >= 420) score += 2; else if (weeklyMin >= 240) score += 1;
  if (longestUltra >= 80) score += 2; else if (longestUltra >= 42) score += 1;
  if (nPastRaces >= 5) score += 1;
  if (yearsHistory >= 3) score += 1;
  const level = score >= 5 ? 'avanzado' : score >= 2 ? 'intermedio' : 'principiante';
  return { level, weeklyMin, longestUltra, nPastRaces, yearsHistory };
}

function ageFrom(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b)) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// ---------- Perfil de progresión ----------
// Dos atletas preparando la MISMA carrera no tienen por qué recibir la misma progresión de carga:
// un principiante, alguien con lesiones previas registradas, o un atleta mayor necesitan subidas
// de volumen más lentas y descargas más frecuentes que un atleta avanzado y sano. Esto convierte
// el nivel/edad/historial de lesiones en números concretos que usa planner.js — antes `athlete.level`
// solo aparecía como texto explicativo y no cambiaba ni un minuto del plan real.
export function progressionProfile(userId) {
  const athlete = classifyAthlete(userId);
  const st = getSettings(userId);
  const age = ageFrom(st.birth_date);
  const hasInjuryHistory = !!(st.injury_history && st.injury_history.trim());
  const masters = age != null && age >= 55;
  const conservative = hasInjuryHistory || masters || athlete.level === 'principiante';
  const aggressive = athlete.level === 'avanzado' && !hasInjuryHistory && !masters;

  const profile = conservative
    ? { deloadEvery: 3, buildMult: 1.06, buildAdd: 10, longIncBase: 10, longIncOther: 18, maxQuality: hasInjuryHistory ? 1 : 2, downhillCaution: true }
    : aggressive
      ? { deloadEvery: 5, buildMult: 1.13, buildAdd: 18, longIncBase: 18, longIncOther: 30, maxQuality: Infinity, downhillCaution: false }
      : { deloadEvery: 4, buildMult: 1.1, buildAdd: 15, longIncBase: 15, longIncOther: 25, maxQuality: Infinity, downhillCaution: false };

  const reasons = [];
  if (hasInjuryHistory) reasons.push('tienes historial de lesiones registrado: progresión más lenta y descargas cada 3 semanas en vez de 4.');
  if (masters) reasons.push(`${age} años: asumimos algo más de tiempo de recuperación al subir carga.`);
  if (!hasInjuryHistory && !masters && athlete.level === 'principiante') reasons.push('nivel principiante (según tu historial): construimos base más despacio antes de meter más calidad.');
  if (aggressive) reasons.push('nivel avanzado y sin lesiones registradas: puedes asimilar subidas de carga algo más rápidas, con descargas más espaciadas.');

  return { ...profile, age, hasInjuryHistory, conservative, aggressive, athleteLevel: athlete.level, reasons };
}

// ---------- Fase de la semana (block periodization) ----------
// Igual que antes pero con una fase PEAK explícita: las últimas semanas de carga antes del
// afinado, donde se prioriza la especificidad de montaña (simulacros, terreno real) por encima
// de seguir subiendo volumen o umbral.
export function phaseForWeek(ws, races) {
  const we = addDays(ws, 6);
  const main = races.filter(r => r.priority !== 'C');
  const inWeek = main.find(r => r.date >= ws && r.date <= we);
  if (inWeek) return { phase: 'race', race: inWeek };
  const prev = main.filter(r => r.date < ws).pop();
  if (prev) {
    const weeksAfter = Math.ceil(diffDays(mondayOf(prev.date), ws) / 7);
    // Un Backyard Ultra siempre exige una recuperación grande, corra lo que corra el atleta: son
    // horas y horas de esfuerzo repetido (a menudo de noche, con privación de sueño), no algo que
    // se mida bien con la fórmula distancia+desnivel de una ultra de recorrido fijo.
    const big = prev.type === 'backyard' ? true : (prev.distance_km || 0) + (prev.dplus_m || 0) / 100 > 120;
    if (weeksAfter === 1) return { phase: 'recovery', race: prev, factor: prev.priority === 'A' || big ? 0.35 : 0.55 };
    if (weeksAfter === 2 && big) return { phase: 'recovery', race: prev, factor: 0.65 };
  }
  const next = main.find(r => r.date > we);
  if (!next) return { phase: 'recovery', race: null, factor: 0.5, offSeason: true };
  const N = Math.round(diffDays(ws, mondayOf(next.date)) / 7);
  if (next.priority === 'A' && N === 1) return { phase: 'taper', race: next, factor: 0.6 };
  if (next.priority === 'A' && N === 2) return { phase: 'taper', race: next, factor: 0.8 };
  if (next.priority === 'B' && N === 1) return { phase: 'taper', race: next, factor: 0.8 };
  if (N <= 4) return { phase: 'peak', race: next, N };
  if (N <= 10) return { phase: 'specific', race: next, N };
  if (N <= 18) return { phase: 'build', race: next, N };
  return { phase: 'base', race: next, N };
}

// ---------- Modelo de distribución de intensidad ----------
// No es fijo durante toda la temporada: cambia entre polarizado y piramidal según la fase,
// que es lo que de verdad hacen los planes de ultra bien construidos (ver METHOD_GUIDE).
export function intensityModel(phase) {
  switch (phase) {
    case 'base': return { model: 'polarizado',
      why: 'en base priorizamos fondo aeróbico muy suave y algo de velocidad corta; el umbral todavía no aporta tanto y solo acumula fatiga.' };
    case 'build': return { model: 'piramidal',
      why: 'metemos más trabajo de umbral (tempo) para subir el ritmo que puedes sostener muchas horas, que es lo que más decide un ultra.' };
    case 'specific': return { model: 'piramidal',
      why: 'seguimos con umbral, pero ya en el terreno y desnivel de tu carrera en vez de en llano.' };
    case 'peak': return { model: 'polarizado',
      why: 'en la recta final priorizamos simulacros largos y suaves, dejando el umbral en segundo plano — ya está entrenado.' };
    case 'taper': return { model: 'polarizado',
      why: 'bajamos volumen pero mantenemos toques cortos de intensidad para no perder la chispa de piernas.' };
    default: return { model: 'polarizado', why: 'fase de carga baja: casi todo suave.' };
  }
}

// ---------- Selección de metodología para una semana concreta ----------
// Combina fase, nivel del atleta, terreno/duración de la carrera objetivo y fatiga real
// (Forma/Fatiga/Frescura) para decidir el énfasis de esa semana. Esto es lo que hace que el
// sistema "adapte el plan continuamente según los datos reales", no un calendario estático.
export function selectMethodology(userId, ws, ph) {
  const { race, phase } = ph;
  const athlete = classifyAthlete(userId);
  const fit = currentFitness(userId, ws);
  const weeksToRace = race ? Math.max(0, Math.round(diffDays(ws, mondayOf(race.date)) / 7)) : null;
  const dPlusPerKm = race?.dplus_m && race?.distance_km ? race.dplus_m / race.distance_km : 0;
  // En Backyard Ultra no hay distance_km (vuelta fija): usamos el D+ de la propia vuelta
  // directamente — más de 200 m en una vuelta de ~6.7 km ya es una "yard" claramente de montaña.
  const vertHeavy = race?.type === 'backyard' ? (race.dplus_m || 0) > 200 : dPlusPerKm > 25;
  const im = intensityModel(phase);

  // Adaptación continua por fatiga real: si el atleta llega muy cargado varios días seguidos
  // (Frescura muy negativa), no seguimos el bloque a rajatabla aunque tocase subir carga —
  // es la diferencia entre un entrenador que mira los datos y un PDF de 16 semanas fijo.
  const overloaded = fit.tsb < -25;

  const b2bPriority = ['specific', 'peak'].includes(phase);
  const raceSimulation = phase === 'peak';
  const downhillEmphasis = vertHeavy || phase === 'specific' || phase === 'peak';
  const progression = progressionProfile(userId);

  return {
    phase, race, athlete, weeksToRace, intensity: im, overloaded,
    b2bPriority, raceSimulation, downhillEmphasis, vertHeavy, progression,
    rationale: buildRationale({ phase, im, athlete, weeksToRace, overloaded, race, vertHeavy, progression }),
  };
}

function buildRationale({ phase, im, athlete, weeksToRace, overloaded, race, vertHeavy, progression }) {
  const bits = [];
  bits.push(`Fase ${PHASE_LABEL[phase]}${weeksToRace != null && race ? ` — ${weeksToRace} semana(s) para ${race.name}` : ''}.`);
  bits.push(`Distribución de intensidad: ${im.model} (${im.why})`);
  bits.push(`Nivel estimado a partir de tu historial: ${athlete.level} (~${Math.round(athlete.weeklyMin / 60)} h/semana de media, ${athlete.longestUltra || 0} km tu ultra más larga).`);
  if (vertHeavy) bits.push('Tu carrera objetivo es muy de montaña (>25 m D+/km de media): se prioriza el desnivel sobre el ritmo llano.');
  if (overloaded) bits.push('Esta semana tu Frescura está muy negativa: se reduce la intensidad aunque el bloque tocase subir carga.');
  for (const r of progression?.reasons || []) bits.push(r.charAt(0).toUpperCase() + r.slice(1));
  return bits;
}
