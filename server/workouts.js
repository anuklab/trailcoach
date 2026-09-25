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
};

// Objetivo de nutrición para una sesión larga concreta, a partir del peso del atleta y de
// cuántas horas dura ESA sesión (no la carrera completa) — para que lo que practica se parezca
// a lo que hará ese tramo de carrera.
function fuelNote(durationMin, weightKg) {
  if (durationMin < 75) return '';
  const t = nutritionTargetsFor(weightKg || 70, durationMin / 60);
  return ` Practica tomar ${t.carbs_g_per_h} g de carbohidrato/hora y ${t.sodium_mg_per_h} mg de sodio/hora, igual que en carrera — no esperes a tener hambre o sed.`;
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
        (nightRace ? ' Si puedes, arranca al atardecer o lleva el frontal para practicar correr con luz artificial: en tu carrera pasarás horas de noche.' : '');
      break;
    case 'b2b':
      desc = `${hm(s.duration_min)} suave-moderado el día después de la tirada larga, a propósito con las piernas cargadas y sin recuperar del todo. Es el entreno más específico de ultra: enseña al cuerpo a seguir moviéndose bien fatigado, que es justo lo que te pedirá la segunda mitad de la carrera.` +
        fuelNote(s.duration_min, weight);
      break;
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
      else if (race) {
        title = `Carrera objetivo: ${race.name}`;
        desc = `${race.distance_km ?? '?'} km, ${race.dplus_m ?? '?'} m D+. ¡El gran día! Reparte el esfuerzo, no arranques rápido en los primeros km de bajada de adrenalina, come y bebe desde el minuto 1 aunque no tengas hambre, y confía en las piernas que has entrenado.`;
      }
      break;
    default: desc = hm(s.duration_min);
  }
  return { title, description: desc };
}
