// Integración con Strava: OAuth y sincronización de actividades.
import { db, getKV, setKV, log } from './db.js';
import { activityLoad } from './load.js';
import { addDays, today } from './util.js';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT = process.env.STRAVA_REDIRECT_URI; // ej: https://tudominio.com/api/strava/callback

export function stravaConfigured() { return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT); }

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

export async function exchangeCode(code) {
  const t = await tokenRequest({ code, grant_type: 'authorization_code' });
  saveTokens(t);
  return t;
}

function saveTokens(t) {
  setKV('strava_tokens', { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at });
  setKV('strava_athlete', t.athlete || getKV('strava_athlete'));
}

async function getAccessToken() {
  const t = getKV('strava_tokens');
  if (!t) throw new Error('Strava no está conectado todavía.');
  if (t.expires_at > Date.now() / 1000 + 60) return t.access_token;
  const fresh = await tokenRequest({ refresh_token: t.refresh_token, grant_type: 'refresh_token' });
  saveTokens(fresh);
  return fresh.access_token;
}

export function stravaStatus() {
  const t = getKV('strava_tokens');
  const a = getKV('strava_athlete');
  return { connected: !!t, athlete: a ? `${a.firstname || ''} ${a.lastname || ''}`.trim() : null };
}

export function disconnectStrava() { setKV('strava_tokens', null); setKV('strava_athlete', null); }

function upsertActivity(a) {
  const date = (a.start_date_local || a.start_date || '').slice(0, 10);
  const row = {
    id: a.id, name: a.name, sport_type: a.sport_type || a.type,
    start_date_local: a.start_date_local, date,
    distance_m: a.distance, moving_time_s: a.moving_time, elapsed_time_s: a.elapsed_time,
    elevation_gain_m: a.total_elevation_gain, avg_hr: a.average_heartrate ?? null, max_hr: a.max_heartrate ?? null,
    suffer_score: a.suffer_score ?? null, raw: JSON.stringify(a),
  };
  row.load = activityLoad(row);
  db.prepare(`INSERT INTO activities(id,name,sport_type,start_date_local,date,distance_m,moving_time_s,elapsed_time_s,
      elevation_gain_m,avg_hr,max_hr,suffer_score,load,raw)
    VALUES(@id,@name,@sport_type,@start_date_local,@date,@distance_m,@moving_time_s,@elapsed_time_s,
      @elevation_gain_m,@avg_hr,@max_hr,@suffer_score,@load,@raw)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, sport_type=excluded.sport_type, date=excluded.date,
      distance_m=excluded.distance_m, moving_time_s=excluded.moving_time_s, elapsed_time_s=excluded.elapsed_time_s,
      elevation_gain_m=excluded.elevation_gain_m, avg_hr=excluded.avg_hr, max_hr=excluded.max_hr,
      suffer_score=excluded.suffer_score, load=excluded.load, raw=excluded.raw`).run(row);
  return row;
}

// Empareja la actividad real con la sesión planificada del mismo día (si existe y no tiene ya una)
function matchSession(row) {
  const s = db.prepare(`SELECT id FROM sessions WHERE date = ? AND activity_id IS NULL AND type NOT IN ('rest','strength') ORDER BY id LIMIT 1`).get(row.date);
  if (!s) return;
  db.prepare(`UPDATE sessions SET activity_id=?, status='done' WHERE id=?`).run(row.id, s.id);
}

export async function syncStrava({ full = false } = {}) {
  if (!stravaConfigured()) throw new Error('Strava no está configurado en el servidor (faltan STRAVA_CLIENT_ID/SECRET/REDIRECT).');
  const token = await getAccessToken();
  const last = getKV('strava_last_sync');
  const after = full ? Math.floor(new Date('2015-01-01').getTime() / 1000) : Math.floor(new Date(last || addDays(today(), -400)).getTime() / 1000);
  let page = 1, total = 0;
  for (;;) {
    const resp = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { authorization: `Bearer ${token}` } });
    if (!resp.ok) throw new Error(`Error listando actividades de Strava (${resp.status})`);
    const acts = await resp.json();
    if (!acts.length) break;
    for (const a of acts) { const row = upsertActivity(a); matchSession(row); total++; }
    page++;
    if (page > 30) break;
  }
  setKV('strava_last_sync', new Date().toISOString());
  log('strava', `Sincronizadas ${total} actividades`);
  return { imported: total };
}
