// Integración con Strava: OAuth y sincronización de actividades — por usuario.
// Cada persona conecta su propia cuenta de Strava; sus tokens se guardan en su fila de `users`.
import { db, log } from './db.js';
import { activityLoad } from './load.js';
import { addDays, today } from './util.js';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT = process.env.STRAVA_REDIRECT_URI; // ej: https://tudominio.com/api/strava/callback

export function stravaConfigured() { return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT); }

// `state` identifica de forma segura (firmada por quien la llama) qué usuario inició el flujo,
// para que el callback de Strava (que no lleva sesión) sepa a quién guardarle los tokens.
export function authUrl(state) {
  const p = new URLSearchParams({
    client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code',
    approval_prompt: 'auto', scope: 'read,activity:read_all', state,
  });
  return `https://www.strava.com/oauth/authorize?${p}`;
}

async function tokenRequest(body) {
  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...body }),
  });
  if (!resp.ok) throw new Error(`Strava OAuth error ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export async function exchangeCode(userId, code) {
  const t = await tokenRequest({ code, grant_type: 'authorization_code' });
  saveTokens(userId, t);
  return t;
}

function saveTokens(userId, t) {
  db.prepare(`UPDATE users SET strava_access_token=?, strava_refresh_token=?, strava_expires_at=?, strava_athlete=? WHERE id=?`)
    .run(t.access_token, t.refresh_token, t.expires_at,
      t.athlete ? JSON.stringify(t.athlete) : (db.prepare('SELECT strava_athlete FROM users WHERE id=?').get(userId)?.strava_athlete || null),
      userId);
}

async function getAccessToken(userId) {
  const u = db.prepare('SELECT strava_access_token, strava_refresh_token, strava_expires_at FROM users WHERE id=?').get(userId);
  if (!u?.strava_access_token) throw new Error('Strava no está conectado todavía.');
  if (u.strava_expires_at > Date.now() / 1000 + 60) return u.strava_access_token;
  const fresh = await tokenRequest({ refresh_token: u.strava_refresh_token, grant_type: 'refresh_token' });
  saveTokens(userId, fresh);
  return fresh.access_token;
}

export function stravaStatus(userId) {
  const u = db.prepare('SELECT strava_access_token, strava_athlete FROM users WHERE id=?').get(userId);
  let a = null; try { a = u?.strava_athlete ? JSON.parse(u.strava_athlete) : null; } catch { a = null; }
  return { connected: !!u?.strava_access_token, athlete: a ? `${a.firstname || ''} ${a.lastname || ''}`.trim() : null };
}

export function disconnectStrava(userId) {
  db.prepare(`UPDATE users SET strava_access_token=NULL, strava_refresh_token=NULL, strava_expires_at=NULL, strava_athlete=NULL WHERE id=?`).run(userId);
}

function upsertActivity(userId, a) {
  const date = (a.start_date_local || a.start_date || '').slice(0, 10);
  const row = {
    id: a.id, user_id: userId, name: a.name, sport_type: a.sport_type || a.type,
    start_date_local: a.start_date_local, date,
    distance_m: a.distance, moving_time_s: a.moving_time, elapsed_time_s: a.elapsed_time,
    elevation_gain_m: a.total_elevation_gain, avg_hr: a.average_heartrate ?? null, max_hr: a.max_heartrate ?? null,
    suffer_score: a.suffer_score ?? null, raw: JSON.stringify(a),
  };
  row.load = activityLoad(row, userId);
  db.prepare(`INSERT INTO activities(id,user_id,name,sport_type,start_date_local,date,distance_m,moving_time_s,elapsed_time_s,
      elevation_gain_m,avg_hr,max_hr,suffer_score,load,raw)
    VALUES(@id,@user_id,@name,@sport_type,@start_date_local,@date,@distance_m,@moving_time_s,@elapsed_time_s,
      @elevation_gain_m,@avg_hr,@max_hr,@suffer_score,@load,@raw)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, sport_type=excluded.sport_type, date=excluded.date,
      distance_m=excluded.distance_m, moving_time_s=excluded.moving_time_s, elapsed_time_s=excluded.elapsed_time_s,
      elevation_gain_m=excluded.elevation_gain_m, avg_hr=excluded.avg_hr, max_hr=excluded.max_hr,
      suffer_score=excluded.suffer_score, load=excluded.load, raw=excluded.raw
    WHERE user_id = excluded.user_id`).run(row);
  return row;
}

// Empareja la actividad real con la sesión planificada del mismo día (si existe y no tiene ya una), del mismo usuario.
function matchSession(userId, row) {
  const s = db.prepare(`SELECT id FROM sessions WHERE user_id = ? AND date = ? AND activity_id IS NULL AND type NOT IN ('rest','strength') ORDER BY id LIMIT 1`).get(userId, row.date);
  if (!s) return;
  db.prepare(`UPDATE sessions SET activity_id=?, status='done' WHERE id=? AND user_id=?`).run(row.id, s.id, userId);
}

export async function syncStrava(userId, { full = false } = {}) {
  if (!stravaConfigured()) throw new Error('Strava no está configurado en el servidor (faltan STRAVA_CLIENT_ID/SECRET/REDIRECT).');
  const token = await getAccessToken(userId);
  const last = db.prepare('SELECT strava_last_sync FROM users WHERE id=?').get(userId)?.strava_last_sync;
  const after = full ? Math.floor(new Date('2015-01-01').getTime() / 1000) : Math.floor(new Date(last || addDays(today(), -400)).getTime() / 1000);
  let page = 1, total = 0;
  for (;;) {
    const resp = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { authorization: `Bearer ${token}` } });
    if (!resp.ok) throw new Error(`Error listando actividades de Strava (${resp.status})`);
    const acts = await resp.json();
    if (!acts.length) break;
    for (const a of acts) { const row = upsertActivity(userId, a); matchSession(userId, row); total++; }
    page++;
    if (page > 30) break;
  }
  db.prepare('UPDATE users SET strava_last_sync=? WHERE id=?').run(new Date().toISOString(), userId);
  log(userId, 'strava', `Sincronizadas ${total} actividades`);
  return { imported: total };
}
