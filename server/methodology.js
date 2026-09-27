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
import { addDays, diffDays, mondayOf, today, clamp } from './util.js';

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

// Antes la edad solo entraba como un corte binario (≥55 = "masters", igual trato para alguien de
// 56 que de 78). La recuperación y la tolerancia a carga excéntrica siguen una curva, no un
// escalón, así que usamos tres tramos: sub-45 sin ajuste, 45-59 un ajuste ligero, 60+ uno mayor
// (más días de recuperación entre bloques duros, tirada larga que crece más despacio).
function ageBand(age) {
  if (age == null) return 'none';
  if (age >= 60) return 'senior';
  if (age >= 45) return 'masters';
  return 'none';
}

// Historial de lesiones: hasta ahora era un simple sí/no que solo recortaba el nº de sesiones de
// calidad y activaba una bandera genérica de "cuidado con las bajadas". Si el atleta ha escrito
// qué se lesionó, lo aprovechamos: cada zona detectada ajusta específicamente el trabajo excéntrico/
// de bajada (rodilla, tobillo, aquiles) o añade una nota de refuerzo en la sesión de fuerza
// (isquio, gemelo/sóleo, espalda/cadera) — no solo "progresa más despacio en general".
const INJURY_KEYWORDS = {
  rodilla: ['rodilla', 'rótula', 'menisco', 'lca', 'ligamento cruzado', 'knee'],
  tobillo: ['tobillo', 'esguince', 'ankle'],
  aquiles: ['aquiles', 'aquíles', 'achilles'],
  isquio: ['isquio', 'isquiotibial', 'hamstring'],
  gemelo: ['gemelo', 'sóleo', 'soleo', 'pantorrilla', 'fascitis', 'calf', 'plantar'],
  espalda: ['espalda', 'lumbar', 'lumbalgia', 'back'],
  cadera: ['cadera', 'psoas', 'pubalgia', 'hip'],
};
export function injuryFlags(injuryHistory) {
  const text = (injuryHistory || '').toLowerCase();
  const flags = {};
  for (const [zone, words] of Object.entries(INJURY_KEYWORDS)) flags[zone] = words.some(w => text.includes(w));
  flags.any = Object.values(flags).some(Boolean);
  flags.eccentricRisk = flags.rodilla || flags.tobillo || flags.aquiles || flags.gemelo; // condiciona bajada/excéntrico
  flags.strengthFocus = flags.isquio || flags.espalda || flags.cadera; // condiciona qué reforzar en fuerza
  return flags;
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
  const band = ageBand(age);
  const injury = injuryFlags(st.injury_history);
  const hasInjuryHistory = injury.any;
  const masters = band !== 'none'; // se mantiene el nombre por compatibilidad con el resto del código
  const conservative = hasInjuryHistory || masters || athlete.level === 'principiante';
  const aggressive = athlete.level === 'avanzado' && !hasInjuryHistory && band === 'none';

  // Tres escalones de edad en vez de uno: sénior (60+) recorta más que masters (45-59), que a su
  // vez recorta más que alguien sin ajuste de edad — igual de conservador que antes para el corte
  // que ya existía, pero ahora un atleta de 45 y uno de 70 no reciben exactamente el mismo plan.
  const ageDeload = band === 'senior' ? 2 : band === 'masters' ? 3 : null;
  const ageLongFactor = band === 'senior' ? 0.6 : band === 'masters' ? 0.8 : 1;

  const base = conservative
    ? { deloadEvery: 3, buildMult: 1.06, buildAdd: 10, longIncBase: 10, longIncOther: 18, maxQuality: hasInjuryHistory ? 1 : 2, downhillCaution: true }
    : aggressive
      ? { deloadEvery: 5, buildMult: 1.13, buildAdd: 18, longIncBase: 18, longIncOther: 30, maxQuality: Infinity, downhillCaution: false }
      : { deloadEvery: 4, buildMult: 1.1, buildAdd: 15, longIncBase: 15, longIncOther: 25, maxQuality: Infinity, downhillCaution: false };

  const profile = {
    ...base,
    deloadEvery: ageDeload ? Math.min(base.deloadEvery, ageDeload) : base.deloadEvery,
    longIncBase: Math.round(base.longIncBase * ageLongFactor),
    longIncOther: Math.round(base.longIncOther * ageLongFactor),
    downhillCaution: base.downhillCaution || injury.eccentricRisk,
  };

  const reasons = [];
  if (injury.any) {
    const zones = Object.entries(injury).filter(([k, v]) => v && !['any', 'eccentricRisk', 'strengthFocus'].includes(k)).map(([k]) => k);
    reasons.push(`historial de lesiones registrado (${zones.join(', ') || 'sin zona concreta'}): progresión más lenta y descargas cada 3 semanas en vez de 4.`);
    if (injury.eccentricRisk) reasons.push('la zona lesionada es sensible a la carga excéntrica: se retrasa/reduce la frecuencia de bajada técnica.');
    if (injury.strengthFocus) reasons.push('se refuerza en fuerza la zona que mencionaste, no solo el trabajo genérico de piernas.');
  }
  if (band === 'senior') reasons.push(`${age} años: descargas cada 2 semanas y la tirada larga crece más despacio — la recuperación manda más que el volumen a esta edad.`);
  else if (band === 'masters') reasons.push(`${age} años: algo más de tiempo de recuperación al subir carga.`);
  if (!hasInjuryHistory && band === 'none' && athlete.level === 'principiante') reasons.push('nivel principiante (según tu historial): construimos base más despacio antes de meter más calidad.');
  if (aggressive) reasons.push('nivel avanzado y sin lesiones registradas: puedes asimilar subidas de carga algo más rápidas, con descargas más espaciadas.');

  return { ...profile, age, ageBand: band, injury, hasInjuryHistory, conservative, aggressive, athleteLevel: athlete.level, reasons };
}

// ---------- Fase de la semana (block periodization) ----------
// Igual que antes pero con una fase PEAK explícita: las últimas semanas de carga antes del
// afinado, donde se prioriza la especificidad de montaña (simulacros, terreno real) por encima
// de seguir subiendo volumen o umbral.
export function phaseForWeek(ws, races) {
  const we = addDays(ws, 6);
  // Toda la periodización (base/build/específico/peak/taper) se construye SIEMPRE alrededor del
  // objetivo A — nunca de una B, aunque caiga antes. Las B/C son "carreras puente": se insertan
  // localmente donde caigan (ver buildWeek en planner.js) sin desviar el macrociclo de A. Si
  // todavía no hay A puesta, usamos la B más próxima como referencia provisional para que el plan
  // funcione igualmente (mejor periodizar hacia algo que hacia nada).
  const asObj = races.filter(r => r.priority === 'A');
  const main = asObj.length ? asObj : races.filter(r => r.priority === 'B');
  // Una carrera por etapas ocupa varios días seguidos (a veces más de una semana natural): la
  // semana entera es "de carrera" mientras se solape con el rango [inicio, inicio + nº etapas - 1].
  const raceSpanEnd = r => r.type === 'stage' && r.n_stages > 1 ? addDays(r.date, r.n_stages - 1) : r.date;
  const inWeek = main.find(r => r.date <= we && raceSpanEnd(r) >= ws);
  if (inWeek) return { phase: 'race', race: inWeek };
  const prev = main.filter(r => raceSpanEnd(r) < ws).pop();
  if (prev) {
    const weeksAfter = Math.ceil(diffDays(mondayOf(raceSpanEnd(prev)), ws) / 7);
    // Un Backyard Ultra o una carrera por etapas siempre exigen una recuperación grande, corra lo
    // que corra el atleta: son horas y horas de esfuerzo repetido (a veces de noche, con privación
    // de sueño, o varios días seguidos de fatiga acumulada), no algo que se mida bien con la fórmula
    // distancia+desnivel de una ultra de un solo día. Cuantas más etapas, más semanas de margen.
    const isStagePrev = prev.type === 'stage' && (prev.n_stages || 1) > 1;
    const big = prev.type === 'backyard' || isStagePrev ? true : (prev.distance_km || 0) + (prev.dplus_m || 0) / 100 > 120;
    const stageRecoveryWeeks = isStagePrev ? clamp(Math.ceil((prev.n_stages || 1) / 3), 1, 3) : 1;
    if (weeksAfter === 1) return { phase: 'recovery', race: prev, factor: prev.priority === 'A' || big ? 0.35 : 0.55 };
    if (weeksAfter === 2 && big) return { phase: 'recovery', race: prev, factor: 0.65 };
    if (isStagePrev && weeksAfter <= Math.max(2, stageRecoveryWeeks)) return { phase: 'recovery', race: prev, factor: 0.75 };
  }
  const next = main.find(r => r.date > we);
  if (!next) return { phase: 'recovery', race: null, factor: 0.5, offSeason: true };
  const N = Math.round(diffDays(ws, mondayOf(next.date)) / 7);
  // Una carrera por etapas exige un afinado más largo y más profundo que una ultra de un día: la
  // literatura de multi-día recomienda 3-4 semanas bajando volumen en escalones (no solo 1-2 como
  // en una ultra de recorrido fijo), porque el objetivo no es solo llegar fresco sino con el
  // glucógeno y la musculatura totalmente recuperados antes de encadenar varios días de esfuerzo.
  const stageNext = next.type === 'stage' && (next.n_stages || 1) > 1;
  if (next.priority === 'A' && N === 1) return { phase: 'taper', race: next, factor: stageNext ? 0.5 : 0.6 };
  if (next.priority === 'A' && N === 2) return { phase: 'taper', race: next, factor: stageNext ? 0.65 : 0.8 };
  if (next.priority === 'A' && N === 3 && stageNext) return { phase: 'taper', race: next, factor: 0.85 };
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
  // Antes esto era un simple sí/no (>25 m D+/km). La cantidad de desnivel específico que conviene
  // meter (vertical kilometer, series en subida, técnica de bajada) escala con el perfil real de
  // la carrera, no con un único corte — así una carrera "extrema" (skyrace/vertical) recibe más
  // énfasis de desnivel que una "montañosa" normal, y ambas más que una ultra de recorrido llano.
  const effDPlusPerKm = race?.type === 'backyard' ? ((race.dplus_m || 0) / 6.7) : dPlusPerKm;
  const terrainTier = effDPlusPerKm > 45 ? 'extremo' : effDPlusPerKm > 25 ? 'montañoso' : effDPlusPerKm > 12 ? 'ondulado' : 'llano';
  const im = intensityModel(phase);

  // Adaptación continua por fatiga real: si el atleta llega muy cargado varios días seguidos
  // (Frescura muy negativa), no seguimos el bloque a rajatabla aunque tocase subir carga —
  // es la diferencia entre un entrenador que mira los datos y un PDF de 16 semanas fijo.
  const overloaded = fit.tsb < -25;

  const b2bPriority = ['specific', 'peak'].includes(phase);
  const raceSimulation = phase === 'peak';
  const downhillEmphasis = vertHeavy || phase === 'specific' || phase === 'peak';
  const progression = progressionProfile(userId);
  const isStage = race?.type === 'stage';

  return {
    phase, race, athlete, weeksToRace, intensity: im, overloaded,
    b2bPriority, raceSimulation, downhillEmphasis, vertHeavy, terrainTier, progression, isStage,
    rationale: buildRationale({ phase, im, athlete, weeksToRace, overloaded, race, vertHeavy, terrainTier, progression, isStage }),
  };
}

function buildRationale({ phase, im, athlete, weeksToRace, overloaded, race, vertHeavy, terrainTier, progression, isStage }) {
  const bits = [];
  bits.push(`Fase ${PHASE_LABEL[phase]}${weeksToRace != null && race ? ` — ${weeksToRace} semana(s) para ${race.name}` : ''}.`);
  bits.push(`Distribución de intensidad: ${im.model} (${im.why})`);
  bits.push(`Nivel estimado a partir de tu historial: ${athlete.level} (~${Math.round(athlete.weeklyMin / 60)} h/semana de media, ${athlete.longestUltra || 0} km tu ultra más larga).`);
  if (terrainTier === 'extremo') bits.push('Tu carrera objetivo es extrema de desnivel (>45 m D+/km): el desnivel específico (vertical, series en subida, técnica de bajada) manda por encima de todo lo demás.');
  else if (terrainTier === 'montañoso') bits.push('Tu carrera objetivo es muy de montaña (>25 m D+/km de media): se prioriza el desnivel sobre el ritmo llano.');
  else if (terrainTier === 'ondulado') bits.push('Tu carrera objetivo tiene desnivel moderado: combinamos desnivel específico con trabajo de ritmo llano.');
  if (isStage) bits.push('Tu objetivo es una carrera por etapas: se priorizan los bloques de días consecutivos con fatiga acumulada sobre una única tirada larga.');
  if (overloaded) bits.push('Esta semana tu Frescura está muy negativa: se reduce la intensidad aunque el bloque tocase subir carga.');
  for (const r of progression?.reasons || []) bits.push(r.charAt(0).toUpperCase() + r.slice(1));
  return bits;
}
