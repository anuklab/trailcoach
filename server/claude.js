// Cliente mínimo de la API de Claude para reorganizar el plan en lenguaje natural.
// Requiere ANTHROPIC_API_KEY. Si no está configurada, se avisa con claridad.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

const TOOL = {
  name: 'ajustar_plan',
  description: 'Aplica cambios al plan de entrenamiento del atleta.',
  input_schema: {
    type: 'object',
    properties: {
      explanation: { type: 'string', description: 'Explicación breve en español de qué se ha cambiado y por qué, dirigida al atleta.' },
      operations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: ['update', 'move', 'swap'] },
            id: { type: 'integer', description: 'id de la sesión (para update/move)' },
            id_a: { type: 'integer' }, id_b: { type: 'integer' },
            date: { type: 'string', description: 'YYYY-MM-DD, nueva fecha (para move)' },
            patch: {
              type: 'object',
              description: 'Campos a cambiar (para update)',
              properties: {
                type: { type: 'string' }, duration_min: { type: 'number' }, dplus_m: { type: 'number' },
                zone: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
              },
            },
            reason: { type: 'string' },
          },
          required: ['op'],
        },
      },
    },
    required: ['explanation', 'operations'],
  },
};

const SYSTEM = `Eres el entrenador de ultra trail del atleta. Tienes acceso a su plan de entrenamiento
de los próximos días como JSON (days_ahead), su carrera objetivo (race) y su check-in de hoy si existe.
El atleta te pide un cambio en lenguaje natural (mover sesiones, adaptar la semana, cambiar algo puntual).

Reglas:
- No toques sesiones con locked=1 salvo que el atleta lo pida explícitamente.
- Si mueves o recortas una tirada larga o una sesión clave (key=true), compensa: no dupliques carga dura en días consecutivos.
- Nunca metas dos sesiones de alta intensidad (vert, tempo, intervals) en días consecutivos si puedes evitarlo.
- Respeta que el día antes de la tirada larga (long) quede suave o en descanso.
- Sé conservador: ante la duda, reduce carga en vez de aumentarla.
- Devuelve SIEMPRE la respuesta llamando a la herramienta ajustar_plan, con una explicación breve y clara en español
  y la lista de operaciones concretas (usa los id reales del JSON recibido).
- Si no hace falta cambiar nada, devuelve operations: [] y explícalo.`;

export async function askClaudeForAdjustment(message, context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { explanation: 'La IA no está configurada (falta ANTHROPIC_API_KEY en el servidor). Puedes seguir usando el check-in diario con reglas fijas, o pedir al administrador que añada la clave.', operations: [] };
  }
  const body = {
    model: MODEL, max_tokens: 2000, system: SYSTEM,
    messages: [{ role: 'user', content: `Contexto:\n${JSON.stringify(context)}\n\nPetición del atleta: "${message}"` }],
    tools: [TOOL], tool_choice: { type: 'tool', name: 'ajustar_plan' },
  };
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Error de la API de Claude (${resp.status}): ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const use = data.content?.find(b => b.type === 'tool_use');
  if (!use) return { explanation: data.content?.find(b => b.type === 'text')?.text || 'Sin respuesta.', operations: [] };
  return use.input;
}
