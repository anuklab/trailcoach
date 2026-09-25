// Traduce una sesión estructurada a título + descripción legible en español.
// Las descripciones están pensadas específicamente para ultra trail running (no para ruta):
// desnivel, terreno técnico, bastones, fatiga acumulada y nutrición real de carrera,
// no solo "minutos a un ritmo".
import { strengthDescription, STRENGTH_LIBRARY, nutritionTargetsFor } from './knowledge.js';

function hm(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

const TITLES = {
  rest: 'Descanso', easy: 'Rodaje suave', recovery: 'Recuperación activa', long: 'Tirada larga',
  b2b: 'Segunda tirada (back-to-back)', vert: 'Subida fuerte + técnica', vert_bajada: 'Técnica de bajada',
  tempo: 'Tempo / umbral', intervals: 'Series', strength: 'Fuerza para trail', race: 'Carrera', cross: 'Entreno cruzado',
  loop: 'Simulacro de vueltas (Backyard)',
};

// Objetivo de nutrición para una sesión larga concreta, a partir del peso del atleta y de
// cuántas horas dura ESA sesión (no la carrera completa) — para que lo que practica se parezca
// a lo que hará ese tramo de carrera.
function fuelNote(durationMin, weightKg) {
  if (durationMin < 75) return '';
  const t = nutritionTargetsFor(weightKg || 70, durationMin / 60);
  return ` Practica tomar ${t.carbs_g_per_h} g de carbohidrato/hora y ${t.sodium_mg_per_h} mg de sodio/hora, igual que en carrera — no esperes a tener hambre o sed.`;
}

// Explica al atleta, sesión a sesión, QUÉ adaptación busca ese entreno concreto en la fase en la
// que está — no solo "qué toca hacer" sino "para qué sirve". Es lo que convierte el plan en algo
// que se entiende, en vez de un calendario de casillas a rellenar.
const WHY = {
  long: {
    base: 'construye la base aeróbica y la resistencia a la fatiga — la adaptación que más pesa en un ultra, y la que más tarda en construirse.',
    build: 'sigue subiendo el volumen que tus piernas y tu sistema aeróbico pueden absorber, antes de meter más intensidad encima.',
    specific: 'acostumbra al cuerpo al terreno y desnivel reales de tu carrera, no solo a acumular kilómetros.',
    peak: 'es el ensayo general: terreno, material y alimentación lo más parecido posible al día de carrera.',
    taper: 'mantiene el estímulo de piernas sin acumular fatiga nueva de cara a la carrera.',
    recovery: 'reactiva el cuerpo con carga baja después del esfuerzo de la carrera.',
  },
  b2b: {
    build: 'empieza a enseñar al cuerpo a moverse bien con las piernas ya cargadas, sin depender de una única tirada gigante.',
    specific: 'es la adaptación más específica de ultra que existe: correr fatigado, justo lo que te pedirá la segunda mitad de carrera.',
    peak: 'simula el desgaste acumulado de un día muy largo repartido en dos jornadas, con menos riesgo que una tirada única enorme.',
  },
  vert: {
    base: 'introduce la técnica de subida y bajada de montaña sin buscar todavía mucha intensidad.',
    build: 'sube la fuerza-resistencia de piernas para el desnivel real de tu carrera.',
    specific: 'especificidad de montaña: el power hiking en subida y el frenado en bajada son un gesto distinto a correr llano, y hay que entrenarlo aparte.',
    peak: 'últimos toques de especificidad de montaña antes de bajar la carga para la carrera.',
    taper: 'mantiene la técnica de montaña activa sin generar fatiga nueva.',
  },
  tempo: {
    build: 'sube el ritmo que puedes sostener "cómodamente duro" durante muchas horas — el trabajo de umbral que más marca el resultado en un ultra.',
    specific: 'aplica ese umbral ya entrenado directamente al esfuerzo de carrera.',
    peak: 'mantiene el umbral sin sumar volumen extra, priorizando la recuperación para el simulacro largo de esta fase.',
    taper: 'un toque corto de intensidad para no perder la chispa de piernas, sin generar fatiga.',
  },
  intervals: {
    build: 'sube el techo aeróbico (VO2max) para que el ritmo de carrera te cueste menos esfuerzo relativo.',
  },
  strength: {
    base: 'construye fuerza general y equilibrio antes de que llegue el volumen fuerte de correr.',
    build: 'mantiene la fuerza mientras sube el volumen de carrera.',
    specific: 'refuerza el control excéntrico (frenado en bajada) justo cuando más desnivel técnico mete el plan.',
    peak: 'mantenimiento mínimo, para no restar recuperación a los simulacros largos de esta fase.',
    taper: 'activación ligera, sin generar fatiga muscular de cara a la carrera.',
    recovery: 'recupera y corrige asimetrías después del esfuerzo de la carrera.',
  },
  easy: {
    base: 'suma volumen aeróbico de baja fatiga — el pilar del entrenamiento polarizado en esta fase.',
    build: 'rellena volumen fácil entre los días de calidad, para que la carga total suba sin añadir más fatiga de la necesaria.',
  },
  loop: {
    base: 'introduce el gesto del Backyard: vueltas cortas repetidas a ritmo controlado, sin buscar velocidad todavía.',
    build: 'sube el nº de vueltas seguidas para acostumbrar a las piernas y a la cabeza a la repetición, que es lo que de verdad se entrena aquí.',
    specific: 'entrena la disciplina de pacing más importante del Backyard: entrar en el corral con margen cada hora, ni un segundo de más buscando velocidad de sobra.',
    peak: 'último gran simulacro antes de la carrera: vueltas, ritmo de corral y, si puedes, alguna de noche — practicar el sueño perdido es tan importante como las piernas.',
    taper: 'mantiene la memoria del ritmo de vuelta sin acumular fatiga nueva de cara a la carrera.',
  },
};
function whyFor(type, phase) {
  const w = WHY[type]?.[phase];
  return w ? ` 🎯 Por qué recibes esta sesión: ${w}` : '';
}

export function describe(s, ctx = {}) {
  const race = ctx.race, poles = ctx.settings?.poles, weight = ctx.settings?.weight_kg;
  // ¿Esta carrera probablemente se corre de noche/con luz artificial? (ultras largos, >14h estimadas)
  const nightRace = race?.est_h > 14;
  let title = TITLES[s.variant === 'bajada' && s.type === 'vert' ? 'vert_bajada' : s.type] || s.type, desc = '';

  switch (s.type) {
    case 'rest':
      title = s.variant === 'postcarrera' ? 'Descanso post-carrera' : 'Descanso';
      desc = s.variant === 'postcarrera'
        ? 'Sin correr. Caminar suave, estirar, dormir bien, hidratarte y comer con normalidad. Hoy toca recuperar, no entrenar — el cuerpo se adapta en el descanso, no en el esfuerzo.'
        : 'Día libre de carrera. Movilidad, foam roller o estiramiento suave si apetece. Sin correr.';
      break;
    case 'easy':
      desc = `${hm(s.duration_min)} en Z1-Z2, ritmo totalmente conversacional (podrías hablar sin cortarte). Terreno suave o pista; no busques ritmo ni desnivel, es para sumar kilómetros aeróbicos sin fatiga.`;
      if (s.variant === 'activacion') desc = `${hm(s.duration_min)} muy suave con 4-5 progresiones cortas de 15-20 s a ritmo vivo, para activar la pierna sin generar fatiga de cara a la carrera.`;
      break;
    case 'recovery':
      desc = `${hm(s.duration_min)} muy suave (Z1), a rodar las piernas tras el esfuerzo de ayer. Si notas molestias o las piernas siguen muy cargadas, cámbialo por caminar.`;
      break;
    case 'long':
      desc = `${hm(s.duration_min)}${s.dplus_m ? ` con ${s.dplus_m} m D+` : ''} en Z1-Z2, ritmo de carrera de ultra (caminar las rampas de más del 12-15%, trotar el resto).` +
        (race ? ` Simula el terreno, el material y la alimentación de ${race.name}.` : '') +
        (poles ? ' Lleva bastones y practica plegarlos/desplegarlos sin parar.' : '') +
        fuelNote(s.duration_min, weight) +
        (nightRace ? ' Si puedes, arranca al atardecer o lleva el frontal para practicar correr con luz artificial: en tu carrera pasarás horas de noche.' : '') +
        (race?.type === 'backyard' ? ' Aunque hoy no cuentes vueltas, mete algún tramo caminando fuerte a propósito: en el Backyard el ritmo lo manda el reloj, no tus piernas.' : '');
      break;
    case 'b2b':
      desc = `${hm(s.duration_min)} suave-moderado el día después de la tirada larga, a propósito con las piernas cargadas y sin recuperar del todo. Es el entreno más específico de ultra: enseña al cuerpo a seguir moviéndose bien fatigado, que es justo lo que te pedirá la segunda mitad de la carrera.` +
        fuelNote(s.duration_min, weight) +
        (race?.type === 'backyard' ? ' En Backyard esto es doblemente específico: es la mejor forma de entrenar días consecutivos de fatiga acumulada sin someter al cuerpo a una única tirada gigante.' : '');
      break;
    case 'loop': {
      const lapMin = 60; // 1 vuelta = 1 hora en punto, por definición del formato Backyard
      const reps = Math.max(2, Math.round(s.duration_min / lapMin) || Math.round(s.duration_min / 45));
      desc = `${hm(s.duration_min)} en Z2-Z3 imitando el formato Backyard: corre/camina un circuito corto que puedas completar en unos 40-50 min, descansa lo que quede hasta la hora en punto (come, bebe, cambia calzado si hace falta) y vuelve a salir en el minuto 60. Repite el ciclo el tiempo que dure la sesión (${reps} vueltas aprox.).` +
        (s.dplus_m ? ` Si puedes, busca un circuito con desnivel parecido al de tu carrera (~${s.dplus_m} m en el total de hoy).` : '') +
        ' Lo que se entrena aquí no es el ritmo: es no adelantarte al reloj y aguantar la rutina de la vuelta una y otra vez, que es lo que decide un Backyard.' +
        (ctx.phase === 'peak' ? ' Si puedes, haz esta sesión (o parte) de noche: la fatiga acumulada y el sueño perdido pesan tanto como las piernas en la recta final de un Backyard.' : '') +
        fuelNote(s.duration_min, weight);
      break;
    }
    case 'vert':
      if (s.variant === 'bajada') {
        desc = `${hm(s.duration_min)}${s.dplus_m ? ` con ${s.dplus_m} m D-` : ''} centrado en bajadas técnicas: busca senda con piedra suelta o raíces si tienes. Apoyo en mediopié, pasos cortos y rápidos, mirada 2-3 pasos por delante, brazos abiertos para el equilibrio — evita frenar solo con el cuádriceps, es lo que más destroza las piernas en un ultra. Sube caminando entre repeticiones para no acumular fatiga de más.`;
      } else {
        desc = `${hm(s.duration_min)}${s.dplus_m ? ` con ${s.dplus_m} m D+` : ''} en Z3-Z4: en rampas de más del 15% camina fuerte (power hiking, manos en rodillas o bastones), en las más suaves trota. La técnica de subida en ultra es andar bien antes que correr mal.` +
          (poles ? ' Usa bastones en las rampas duras: clávalos a la altura del pie de apoyo y empuja con el brazo, no solo con la pierna.' : '') +
          ' Baja controlado, sin buscar velocidad — hoy el trabajo importante ya está hecho en la subida.';
      }
      break;
    case 'tempo':
      desc = s.variant === 'recordatorio'
        ? `${hm(s.duration_min)} suave con 10-15 min al ritmo que llevarás en carrera, para activar la memoria muscular sin fatigar. Aprovecha para repasar el material: frontal, mantas, geles, bastones — todo lo que llevarás el día de carrera.`
        : `${hm(s.duration_min)}: calentamiento + 20-30 min continuos en Z3 (umbral aeróbico, el ritmo que aguantarías "incómodo pero sostenible" varias horas) + vuelta a la calma. Es la resistencia a la fatiga que te hace falta en la segunda mitad del ultra, no velocidad de pista.`;
      break;
    case 'intervals':
      desc = `${hm(s.duration_min)}: calentamiento 15 min + 6-8 x 3 min en Z4-Z5 (recuperación 2 min trote suave) + 10 min vuelta a la calma. Sube el techo aeróbico para que el ritmo de carrera te cueste menos esfuerzo relativo.`;
      break;
    case 'strength': {
      const mode = ctx.settings?.strength_mode || 'gym';
      title = mode === 'climbing' ? 'Roco (fuerza + técnica)' : `Fuerza — ${(STRENGTH_LIBRARY[mode] || STRENGTH_LIBRARY.gym).label}`;
      desc = strengthDescription(mode, s.duration_min);
      break;
    }
    case 'cross':
      desc = `${hm(s.duration_min)} de entreno cruzado (bici, elíptica o nado) en Z2, para sumar carga aeróbica sin el impacto de correr — útil si arrastras molestias.`;
      break;
    case 'race':
      if (s.raceC) { title = `Carrera: ${s.raceC.name}`; desc = `${s.raceC.distance_km ?? '?'} km${s.raceC.dplus_m ? `, ${s.raceC.dplus_m} m D+` : ''}. Carrera de entreno: úsala como simulacro real — mismo material, misma estrategia de alimentación que en tu objetivo.`; }
      else if (race?.type === 'backyard') {
        title = `Carrera objetivo: ${race.name}`;
        desc = `Backyard Ultra${race.dplus_m ? ` — ${race.dplus_m} m D+ por vuelta` : ''}. Objetivo: ${race.target_time_h || '?'} h (≈${race.target_time_h ? Math.round(race.target_time_h) : '?'} vueltas). ¡El gran día! Sal siempre relajado en cada vuelta, no corras nunca solo por entrar antes al corral, come y bebe todas las vueltas aunque no tengas hambre, y piensa en la siguiente vuelta, no en cuántas quedan.`;
      } else if (race) {
        title = `Carrera objetivo: ${race.name}`;
        desc = `${race.distance_km ?? '?'} km, ${race.dplus_m ?? '?'} m D+. ¡El gran día! Reparte el esfuerzo, no arranques rápido en los primeros km de bajada de adrenalina, come y bebe desde el minuto 1 aunque no tengas hambre, y confía en las piernas que has entrenado.`;
      }
      break;
    default: desc = hm(s.duration_min);
  }
  if (!['rest', 'race'].includes(s.type)) desc += whyFor(s.type, ctx.phase);
  return { title, description: desc };
}
