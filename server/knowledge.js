// Base de conocimiento del entrenador: guías con base en evidencia para nutrición,
// fuerza y prevención de lesiones en ultra trail. Se usa para calcular recomendaciones
// (gramos de carbohidrato/hora, sodio, cafeína) y para los textos que ve el atleta.
// Fuentes citadas en cada bloque; resumidas y adaptadas, no son cita literal.

export const NUTRITION_GUIDE = {
  carbs: {
    summary: 'Entre 60 y 120 g de carbohidrato por hora según intensidad y duración; para ultras largas, aproxímate a 1 g por kg de peso corporal y hora, usando una mezcla de glucosa + fructosa (2:1) para absorber más sin molestias.',
    by_duration: [
      { max_h: 3, g_per_h: '60-90' },
      { max_h: 6, g_per_h: '75-100' },
      { max_h: 24, g_per_h: '80-120' },
    ],
    source: 'marathonhandbook.com — Ultramarathon Nutrition',
  },
  sodium: {
    summary: 'Entre 500-700 mg de sodio por hora en condiciones templadas, hasta 800-1200 mg/h con mucho calor o sudoración alta. La sudoración varía mucho entre personas: usa el peso antes/después de una tirada larga como referencia (perder <2% de tu peso corporal es la meta).',
    source: 'marathonhandbook.com — Ultramarathon Nutrition',
  },
  fluids: {
    summary: 'Repón al menos el 80% de lo que pierdes en sudor. Truco práctico: pésate antes y después de una tirada larga sin beber justo antes; cada 100 g perdidos ≈ 100 ml a reponer por hora similar.',
    source: 'marathonhandbook.com — Ultramarathon Nutrition',
  },
  fat_adaptation: {
    summary: 'Entrenar 6-8 semanas con rodajes suaves en ayunas o con poco carbohidrato mejora la capacidad de quemar grasa (hasta 1.5 g/min en atletas adaptados frente a 0.75 g/min en corredores normales), lo que ahorra glucógeno para las horas finales de un ultra.',
    source: 'marathonhandbook.com — Ultramarathon Nutrition',
  },
  gut_training: {
    summary: 'El estómago se entrena igual que las piernas: sube progresivamente de 30 g/h a 90 g/h de carbohidrato en tus tiradas largas durante 4 semanas, probando siempre en entreno lo que usarás en carrera. Nunca pruebes nada nuevo el día de la carrera.',
    source: 'marathonhandbook.com — Ultramarathon Nutrition',
  },
  caffeine: {
    summary: 'Antes de carrera: 3-6 mg/kg de peso. En carreras largas (9-12h+), repartir en dosis de ~100 mg (café, gel o cola) en momentos clave (bajones, tramos nocturnos) suele funcionar mejor que tomarlo todo seguido. Efecto pleno a los 45-60 min de tomarlo.',
    source: 'precisionhydration.com — Caffeine dosing for endurance athletes',
  },
};

export const STRENGTH_GUIDE = {
  summary: 'El trabajo de fuerza excéntrica (controlar el frenado, no solo empujar) es lo que más protege la rodilla y el cuádriceps en las bajadas técnicas: hasta el 75% de los accidentes en montaña ocurren bajando. 2 sesiones/semana de fuerza específica reducen la fatiga muscular acumulada y el riesgo de lesión en carreras largas.',
  source: 'Universidad de Innsbruck (vía exerflysport.com) — Eccentric training for trail running',
};

// Ejercicios por modalidad — mismos objetivos (piernas de frenado, core, estabilidad de tobillo,
// fuerza de agarre para bastones), adaptados a lo que el atleta prefiera hacer.
export const STRENGTH_LIBRARY = {
  gym: {
    label: 'Gimnasio (pesas)',
    exercises: [
      'Sentadilla búlgara 3x10-12 por pierna (carga moderada)',
      'Peso muerto rumano 3x10 (isquios y glúteo, clave para subidas)',
      'Step-down excéntrico (bajada controlada 3-4 s) 3x8 por pierna',
      'Elevación de talón (gemelo/sóleo) 3x15',
      'Plancha + antirotación (pallof press) 3x30-40 s',
    ],
  },
  climbing: {
    label: 'Rocódromo / escalada',
    exercises: [
      'Boulder de piernas/técnica de pies 30-40 min (trabaja equilibrio, tobillo y cadera igual que el terreno técnico)',
      '4-6 vías o boulders enfocados en control de descenso/down-climbing (equivalente al frenado en bajada)',
      'Dead hangs o suspensión en presa 3x15-20 s (fuerza de agarre, útil con bastones)',
      'Core en pared inclinada (flag, compresión) 3x8',
    ],
    note: 'Sustituye la sesión de fuerza del plan sin problema: el equilibrio, el control excéntrico de piernas y el agarre cubren objetivos similares. Si la sesión es muy larga (+1h de boulder intenso), cuenta como sesión de calidad, no solo como "extra".',
  },
  calisthenics: {
    label: 'Calistenia',
    exercises: [
      'Sentadilla a una pierna (pistol asistida o en caja) 3x8 por pierna',
      'Zancadas con salto (o zancada caminando) 3x12 por pierna',
      'Puente de glúteo a una pierna 3x12',
      'Elevación de talón a una pierna 3x15',
      'Plancha lateral + plancha frontal 3x30-40 s',
    ],
  },
  home: {
    label: 'Circuito en casa (sin material)',
    exercises: [
      'Sentadillas 3x15',
      'Zancadas alternas 3x12 por pierna',
      'Step-down en escalón de casa 3x10 por pierna',
      'Elevación de talón en escalón 3x15',
      'Plancha 3x30-40 s + puente de glúteo 3x15',
    ],
  },
};

export function strengthDescription(mode, minutes) {
  const lib = STRENGTH_LIBRARY[mode] || STRENGTH_LIBRARY.gym;
  const head = mode === 'climbing' ? `${Math.round(minutes)} min de escalada/boulder — sustituye la fuerza de hoy:`
    : `${Math.round(minutes)} min:`;
  return `${head} ${lib.exercises.slice(0, 4).join('; ')}.`;
}

// Recomendación de nutrición para una carrera concreta, a partir de peso y duración estimada.
export function nutritionTargetsFor(weightKg, hours) {
  const gPerH = Math.round(Math.min(1.15, 0.65 + hours / 60) * weightKg); // escala con duración, tope realista
  const sodiumPerH = hours > 6 ? 900 : 600;
  return {
    carbs_g_per_h: Math.max(50, Math.min(120, gPerH)),
    sodium_mg_per_h: sodiumPerH,
    fluids_note: NUTRITION_GUIDE.fluids.summary,
    caffeine_note: NUTRITION_GUIDE.caffeine.summary,
  };
}
