// Notificaciones push para la app nativa (iOS/Android vía Capacitor).
// Usamos Firebase Cloud Messaging (FCM) como único backend de envío: FCM entrega tanto a
// Android como a iOS (para iOS, FCM habla con APNs por dentro), así el servidor solo tiene
// que hablar con una API sea cual sea el sistema operativo del móvil.
//
// Variables de entorno necesarias (de la cuenta de servicio de un proyecto Firebase, gratis):
//   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
// Si no están configuradas, las funciones de envío no hacen nada (no rompen el resto de la app).
import admin from 'firebase-admin';
import { db, usersWithPushTokens, pushTokensFor, markNotifSent, removePushTokens } from './db.js';
import { addDays, today } from './util.js';

const TZ = process.env.TZ_ATHLETE || 'Europe/Madrid';

let fcmApp = null;
let warnedMissingConfig = false;
function getFcmApp() {
  if (fcmApp) return fcmApp;
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY ? process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
  if (!projectId || !clientEmail || !privateKey) {
    if (!warnedMissingConfig) { console.warn('[push] FCM no configurado (faltan FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY) — no se enviarán notificaciones.'); warnedMissingConfig = true; }
    return null;
  }
  fcmApp = admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  return fcmApp;
}

// Códigos de error de FCM que significan "este token ya no sirve, bórralo".
const DEAD_TOKEN_CODES = ['messaging/registration-token-not-registered', 'messaging/invalid-argument'];

export async function sendPushToUser(userId, { title, body, data } = {}) {
  const app = getFcmApp();
  if (!app) return { sent: 0, reason: 'not_configured' };
  const tokens = pushTokensFor(userId).map(t => t.token);
  if (!tokens.length) return { sent: 0, reason: 'no_tokens' };
  const payload = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
    apns: { payload: { aps: { sound: 'default' } } },
    android: { priority: 'high' },
  };
  const res = await admin.messaging(app).sendEachForMulticast(payload);
  const dead = [];
  res.responses.forEach((r, i) => { if (!r.success && DEAD_TOKEN_CODES.includes(r.error?.code)) dead.push(tokens[i]); });
  if (dead.length) removePushTokens(dead);
  return { sent: res.successCount, failed: res.failureCount };
}

function sessionLine(s) {
  const bits = [s.title || s.type];
  if (s.duration_min) bits.push(`${Math.round(s.duration_min)} min`);
  if (s.dplus_m) bits.push(`${Math.round(s.dplus_m)} m D+`);
  return bits.join(' · ');
}

function settingsOf(row) { try { return JSON.parse(row.settings || '{}'); } catch { return {}; } }

// Aviso diario: qué toca entrenar hoy. Se envía una vez por usuario y día (marcado en
// last_notif_daily_date), así aunque el servidor se reinicie varias veces no se duplica.
export async function runDailyDigest() {
  const d = today();
  let sent = 0;
  for (const u of usersWithPushTokens()) {
    if (u.last_notif_daily_date === d) continue;
    const settings = settingsOf(u);
    if (settings.notif_daily === false) { markNotifSent(u.id, 'daily', d); continue; }
    const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ? AND date = ? ORDER BY id').all(u.id, d);
    markNotifSent(u.id, 'daily', d); // se marca sí o no haya sesiones, para no reintentar cada 5 min
    if (!sessions.length) continue;
    const isRestOnly = sessions.length === 1 && sessions[0].type === 'rest';
    const title = isRestOnly ? 'Hoy toca descansar' : 'Entreno de hoy';
    const body = isRestOnly ? (sessions[0].description || 'Día de descanso.') : sessions.map(sessionLine).join('  +  ');
    const r = await sendPushToUser(u.id, { title, body, data: { type: 'daily', date: d } });
    if (r.sent) sent++;
  }
  return sent;
}

// Resumen semanal: se envía los domingos por la tarde con lo que viene la semana entrante
// (de mañana lunes al domingo siguiente).
export async function runWeeklyDigest() {
  const d = today();
  let sent = 0;
  const from = addDays(d, 1);
  const to = addDays(from, 6);
  for (const u of usersWithPushTokens()) {
    if (u.last_notif_weekly_date === d) continue;
    const settings = settingsOf(u);
    if (settings.notif_weekly === false) { markNotifSent(u.id, 'weekly', d); continue; }
    const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date, id').all(u.id, from, to);
    markNotifSent(u.id, 'weekly', d);
    if (!sessions.length) continue;
    const totalMin = sessions.reduce((a, s) => a + (s.duration_min || 0), 0);
    const totalDplus = sessions.reduce((a, s) => a + (s.dplus_m || 0), 0);
    const key = sessions.find(s => s.key);
    const title = 'Tu semana que viene';
    let body = `${sessions.length} sesiones · ${(totalMin / 60).toFixed(1)} h · ${Math.round(totalDplus)} m D+`;
    if (key) body += ` · sesión clave: ${key.title}`;
    const r = await sendPushToUser(u.id, { title, body, data: { type: 'weekly', from, to } });
    if (r.sent) sent++;
  }
  return sent;
}

function localHour(date) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(date));
}
function localWeekday(date) {
  // 'Sun', 'Mon', ... — comparamos por nombre para no liarnos con índices de distintos calendarios.
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date);
}

const DAILY_HOUR = 7;   // 07:00 hora del atleta: aviso del entreno de hoy
const WEEKLY_HOUR = 18; // domingo 18:00 hora del atleta: resumen de la semana que viene
const WEEKLY_DAY = 'Sun';

let schedulerStarted = false;
// Revisa cada 5 minutos si toca enviar el aviso diario o el semanal. markNotifSent evita que
// se reenvíe si cae varias veces dentro de la misma hora/día.
export function startPushScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = async () => {
    try {
      const now = new Date();
      const hh = localHour(now);
      if (hh === DAILY_HOUR) await runDailyDigest();
      if (hh === WEEKLY_HOUR && localWeekday(now) === WEEKLY_DAY) await runWeeklyDigest();
    } catch (e) { console.error('[push] error en el scheduler:', e.message); }
  };
  setInterval(tick, 5 * 60 * 1000);
  tick(); // primera pasada inmediata al arrancar el servidor
}
