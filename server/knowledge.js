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

// ---------- Metodología: en qué se basa el plan ----------
export const METHOD_GUIDE = {
  overview: 'TrailCoach no sigue una única metodología: combina varias piezas reales del entrenamiento de resistencia y ultra trail, y decide cada semana qué mezcla aplica según tu carrera objetivo, tu nivel, tu disponibilidad y tu fatiga real — no un calendario fijo de 12-16 semanas.',
  items: [
    {
      title: 'Carga: modelo TRIMP / Banister (Forma, Fatiga, Frescura)',
      text: 'Cada sesión genera una "carga" (TRIMP) a partir de su duración e intensidad (frecuencia cardiaca real si tienes Strava conectado, o una estimación por tipo de sesión si no). A partir de esa carga se calculan tres números: Forma (CTL) es la media de carga de los últimos 42 días — tu nivel de fondo. Fatiga (ATL) es la media de los últimos 7 días — lo reciente. Frescura (TSB) es Forma − Fatiga: positivo significa que estás fresco, muy negativo indica riesgo de sobrecarga. Es el mismo modelo que usan TrainingPeaks o el "Fitness & Freshness" de Strava. Si llegas a una semana con la Frescura muy negativa de verdad, el plan la recorta aunque tocase subir carga — así el sistema reacciona a tus datos reales, no solo a la casilla del calendario.',
      source: 'Banister et al. — Modeling elite athletic performance (modelo TRIMP/impulso-respuesta)',
    },
    {
      title: 'Periodización por bloques: BASE → BUILD → SPECIFIC → PEAK → TAPER → RACE → RECOVERY',
      text: 'La temporada se divide sola en fases según cuánto falta para tu carrera: Base (fondo aeróbico general), Construcción/Build (sube el volumen y aparece desnivel e intensidad), Específico (terreno y esfuerzo ya parecidos a tu carrera), Máxima especificidad/Peak (últimas semanas de carga: simulacros y especificidad de montaña por encima de más volumen), Afinado/Taper (baja la carga para llegar fresco), Carrera/Race y Recuperación/Recovery. Cada 4 semanas de carga se intercala una semana de descarga con menos volumen, para consolidar sin acumular fatiga sin control.',
      source: 'Periodización por bloques (Issurin) y práctica habitual en ultra trail',
    },
    {
      title: 'Distribución de intensidad: polarizado y piramidal, no uno solo',
      text: 'El plan cambia de modelo según la fase. Polarizado (mucho volumen muy suave + poco pero muy fuerte, casi nada de umbral) domina en Base — construir fondo sin fatiga innecesaria — y otra vez en Peak/Afinado, priorizando simulacros suaves o recortando carga. Piramidal (el volumen baja según sube la intensidad, con bastante trabajo de umbral) domina en Construcción y Específico, para subir el ritmo que aguantas "cómodamente duro" muchas horas — lo que más decide un ultra.',
      source: 'Seiler — What is best practice for training intensity distribution in endurance athletes?',
    },
    {
      title: 'Back-to-back long runs y especificidad de fatiga',
      text: 'En las fases Específico y Peak aparecen tiradas largas en días consecutivos (viernes-sábado o sábado-domingo), a propósito con las piernas ya cargadas: es la forma más eficaz de entrenar el cuerpo a seguir moviéndose bien fatigado sin necesitar una única tirada gigante que sería muy difícil de recuperar.',
      source: 'Práctica habitual de entrenadores de ultra distancia (block loading of long runs)',
    },
    {
      title: 'Especificidad de montaña',
      text: 'El plan distingue explícitamente subida corriendo/power hiking, bajada técnica y trabajo excéntrico, y da más peso a la bajada cuanto más técnica de descenso tenga tu carrera objetivo o más cerca esté (fases Específico y Peak) — porque el gesto de subir y el de bajar en montaña son técnicas distintas a correr en llano.',
      source: 'Especificidad del entrenamiento aplicada a ultra trail',
    },
    {
      title: 'Nivel del atleta',
      text: 'Tu nivel (principiante, intermedio, avanzado) se infiere de tu historial real: volumen del último año, la ultra más larga que has terminado, cuántas carreras pasadas tienes registradas y cuántos años de histórico hay — no hace falta que lo indiques a mano, y afecta a cuánta carga y qué tan rápido sube el plan.',
      source: 'Inferido del historial de actividades y carreras pasadas registradas en tu cuenta',
    },
    {
      title: 'Estimación de ritmo de carrera',
      text: 'Para estimar cuánto puedes tardar en tu próxima carrera, se usa tu carrera pasada más parecida (o tu actividad más larga si no tienes carreras registradas) y una ley de potencia tipo Riegel que ajusta el tiempo según la distancia y el desnivel de la nueva carrera. Cuantas más carreras pasadas registres, más afinada es la estimación.',
      source: 'Riegel, P. S. — Athletic records and human endurance (ley de potencia distancia-tiempo)',
    },
    {
      title: 'Fuerza excéntrica y unilateral',
      text: 'Las sesiones de fuerza priorizan el control del frenado (step-downs excéntricos) y el trabajo a una pierna (búlgaras, zancadas, elevación de talón/gemelo-sóleo) porque es lo que más protege la rodilla y el tobillo en terreno técnico, y lo que más se parece al gesto real de correr.',
      source: 'Universidad de Innsbruck (vía exerflysport.com) — Eccentric training for trail running',
    },
  ],
};

// ---------- Zonas de frecuencia cardiaca (fórmula de Karvonen) ----------
export const ZONE_GUIDE = [
  { zone: 'Z1', pct: [0.50, 0.60], name: 'Recuperación', text: 'Muy suave, casi no se nota el esfuerzo. Para rodar las piernas el día después de un esfuerzo duro.' },
  { zone: 'Z2', pct: [0.60, 0.70], name: 'Aeróbico / conversacional', text: 'Puedes hablar con frases largas sin cortarte. Es el ritmo de la mayoría del volumen: tiradas largas, rodajes suaves.' },
  { zone: 'Z3', pct: [0.70, 0.80], name: 'Umbral aeróbico / tempo', text: 'Esfuerzo "cómodamente duro": hablar cuesta, solo frases cortas. Mejora la capacidad de sostener ritmo mucho tiempo.' },
  { zone: 'Z4', pct: [0.80, 0.90], name: 'Umbral anaeróbico', text: 'Duro de verdad: casi no puedes hablar. Series y subidas fuertes; sube el techo de intensidad que puedes sostener.' },
  { zone: 'Z5', pct: [0.90, 1.00], name: 'Máximo', text: 'Esfuerzo máximo o cercano, solo en tramos cortos. Mejora la potencia aeróbica máxima (VO2max).' },
];
// Karvonen: FC objetivo = FC reposo + %esfuerzo x (FC máxima - FC reposo). Devuelve el rango en pulsaciones por minuto para cada zona.
export function hrZones(hrMax, hrRest) {
  const max = hrMax || 185, rest = hrRest || 50;
  const reserve = Math.max(1, max - rest);
  return ZONE_GUIDE.map(z => ({
    ...z,
    bpm: [Math.round(rest + z.pct[0] * reserve), Math.round(rest + z.pct[1] * reserve)],
  }));
}

// ---------- Geles y productos habituales, para no tener que escribirlos a mano cada vez ----------
// Valores orientativos por unidad (el fabricante los publica en el envase; ajusta si el tuyo difiere).
export const GEL_PRESETS = [
  { brand: 'Maurten', product: 'Gel 100', carbs_g: 25, sodium_mg: 20, caffeine_mg: 0 },
  { brand: 'Maurten', product: 'Gel 100 CAF 100', carbs_g: 25, sodium_mg: 20, caffeine_mg: 100 },
  { brand: 'GU', product: 'Energy Gel', carbs_g: 22, sodium_mg: 60, caffeine_mg: 0 },
  { brand: 'GU', product: 'Energy Gel (con cafeína)', carbs_g: 22, sodium_mg: 60, caffeine_mg: 40 },
  { brand: 'SiS', product: 'GO Isotonic Gel', carbs_g: 22, sodium_mg: 10, caffeine_mg: 0 },
  { brand: 'SiS', product: 'GO Energy + Caffeine', carbs_g: 22, sodium_mg: 10, caffeine_mg: 75 },
  { brand: 'Precision Fuel & Hydration', product: 'PF 30 Gel', carbs_g: 30, sodium_mg: 20, caffeine_mg: 0 },
  { brand: 'Precision Fuel & Hydration', product: 'PF 90 Gel (con cafeína)', carbs_g: 30, sodium_mg: 20, caffeine_mg: 100 },
  { brand: 'Nutrition', product: '2:1 Energy Gel Flask', carbs_g: 40, sodium_mg: 50, caffeine_mg: 0 },
  { brand: 'Decathlon / Aptonia', product: 'Gel energético', carbs_g: 23, sodium_mg: 50, caffeine_mg: 0 },
  { brand: 'Victory Endurance', product: 'Gel Ultra', carbs_g: 30, sodium_mg: 100, caffeine_mg: 0 },
  { brand: 'Precision Hydration', product: 'Pastilla de sal PH 1500', carbs_g: 0, sodium_mg: 500, caffeine_mg: 0 },
];

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
