// Traduce una sesión estructurada a título + descripción legible en español.
import { strengthDescription, STRENGTH_LIBRARY } from './knowledge.js';

function hm(min) {
  min = Math.round(min);
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

const TITLES = {
  rest: 'Descanso', easy: 'Rodaje suave', recovery: 'Recuperación activa', long: 'Tirada larga',
  b2b: 'Segunda tirada (back-to-back)', vert: 'Desnivel / técnica de subida-bajada',
  tempo: 'Tempo / umbral', intervals: 'Series', strength: 'Fuerza para trail', race: 'Carrera', cross: 'Entreno cruzado',
};

export function describe(s, ctx = {}) {
  const race = ctx.race, poles = ctx.settings?.poles;
  let title = TITLES[s.type] || s.type, desc = '';

  switch (s.type) {
    case 'rest':
      title = s.variant === 'postcarrera' ? 'Descanso post-carrera' : 'Descanso';
      desc = s.variant === 'postcarrera' ? 'Sin correr. Caminar suave, estirar, dormir. Hoy toca recuperar, no entrenar.' : 'Día libre. Movilidad ligera si apetece, sin correr.';
      break;
    case 'easy':
      desc = `${hm(s.duration_min)} en Z1-Z2, ritmo conversacional. Terreno suave, sin buscar ritmo.`;
      if (s.variant === 'activacion') desc = `${hm(s.duration_min)} muy suave con 4-5 progresiones cortas de 15-20 s para activar sin fatigar.`;
      break;
    case 'recovery':
      desc = `${hm(s.duration_min)} muy suave (Z1), a rodar las piernas. Si notas molestias, camina.`;
      break;
    case 'long':
      desc = `${hm(s.duration_min)}${s.dplus_m ? ` con ${s.dplus_m} m D+` : ''} en Z1-Z2. ` +
        (race ? `Simula el ritmo y la alimentación que usarás en ${race.name}. ` : '') +
        'Lleva bastones si el terreno lo pide, practica nutrición e hidratación como en carrera.';
      break;
    case 'b2b':
      desc = `${hm(s.duration_min)} suave el día después de la tirada larga, con las piernas cargadas a propósito. Objetivo: enseñar al cuerpo a correr fatigado, no acumular más carga.`;
      break;
    case 'vert':
      desc = `${hm(s.duration_min)}${s.dplus_m ? ` con ${s.dplus_m} m D+` : ''} en Z3-Z4: subidas fuertes caminando/trotando` +
        (poles ? ' con bastones' : '') + ' y bajadas técnicas controladas. Cuida el apoyo en las bajadas.';
      break;
    case 'tempo':
      desc = s.variant === 'recordatorio'
        ? `${hm(s.duration_min)} suave con 10-15 min a ritmo de carrera para activar sin fatigar.`
        : `${hm(s.duration_min)}: calentamiento + 20-30 min continuos en Z3 (umbral aeróbico), + vuelta a la calma.`;
      break;
    case 'intervals':
      desc = `${hm(s.duration_min)}: calentamiento 15 min + 6-8 x 3 min en Z4-Z5 (recuperación 2 min trote suave) + 10 min vuelta a la calma.`;
      break;
    case 'strength': {
      const mode = ctx.settings?.strength_mode || 'gym';
      title = mode === 'climbing' ? 'Roco (fuerza + técnica)' : `Fuerza — ${(STRENGTH_LIBRARY[mode] || STRENGTH_LIBRARY.gym).label}`;
      desc = strengthDescription(mode, s.duration_min);
      break;
    }
    case 'cross':
      desc = `${hm(s.duration_min)} de entreno cruzado (bici, elíptica o nado) en Z2, para sumar sin impacto.`;
      break;
    case 'race':
      if (s.raceC) { title = `Carrera: ${s.raceC.name}`; desc = `${s.raceC.distance_km ?? '?'} km${s.raceC.dplus_m ? `, ${s.raceC.dplus_m} m D+` : ''}. Carrera de entreno: úsala para practicar ritmo, nutrición y material.`; }
      else if (race) { title = `Carrera objetivo: ${race.name}`; desc = `${race.distance_km ?? '?'} km, ${race.dplus_m ?? '?'} m D+. ¡El gran día! Confía en el plan.`; }
      break;
    default: desc = hm(s.duration_min);
  }
  return { title, description: desc };
}
