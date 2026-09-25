import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, getSettings, setSettings, log, createUser, getUserByEmail, getUserById, verifyPassword, getAvatar, setAvatar, setPassword, deleteUser, createPasswordReset, consumePasswordReset } from './db.js';
import { sendMail } from './mailer.js';
import { today, addDays, mondayOf, diffDays } from './util.js';
import { parseGpx } from './gpx.js';
import { generatePlan, weeksOverview, estimateRaceHours, racesFor, targetFeasibility } from './planner.js';
import { applyCheckin, editSession, recalcFrom, naturalAdjust } from './adjust.js';
import { fitnessSeries, currentFitness } from './load.js';
import { authUrl, exchangeCode, syncStrava, stravaStatus, stravaConfigured, disconnectStrava } from './strava.js';
import { adherenceStatus, monthSummary } from './adherence.js';
import { buildPacingPlan } from './pacing.js';
import * as Nutrition from './nutrition.js';
import { NUTRITION_GUIDE, STRENGTH_GUIDE, STRENGTH_LIBRARY, nutritionTargetsFor, METHOD_GUIDE, hrZones, GEL_PRESETS } from './knowledge.js';
import { estimateVO2max } from './vo2.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '15mb' }));

// ---------- Autenticación (cada persona tiene su propia cuenta) ----------
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
function sign(v) { return crypto.createHmac('sha256', SECRET).update(v).digest('hex'); }

// Token de sesión: incluye el user_id firmado, para que no se pueda falsificar ni tocar datos de otra cuenta.
function makeToken(userId) { const v = `${userId}.${Date.now()}.${crypto.randomBytes(16).toString('hex')}`; return `${v}.${sign(v)}`; }
function verifyToken(t) {
  if (!t) return null;
  const parts = t.split('.');
  if (parts.length !== 4) return null;
  const v = parts.slice(0, 3).join('.');
  if (sign(v) !== parts[3]) return null;
  const uid = Number(parts[0]);
  return Number.isInteger(uid) ? uid : null;
}
// state firmado para el flujo OAuth de Strava: el callback no lleva cabecera de sesión, así que
// necesitamos saber qué usuario lo inició sin poder ser falsificado por un tercero.
function makeState(userId) { const v = `${userId}.${crypto.randomBytes(8).toString('hex')}`; return `${v}.${sign(v)}`; }
function verifyState(s) {
  if (!s) return null;
  const parts = s.split('.');
  if (parts.length !== 3) return null;
  const v = parts.slice(0, 2).join('.');
  if (sign(v) !== parts[2]) return null;
  const uid = Number(parts[0]);
  return Number.isInteger(uid) ? uid : null;
}

function publicUser(u) { return { id: u.id, email: u.email, name: u.name || null, avatar: u.avatar_data || null }; }

// Limitador de intentos muy simple, sin dependencias: protege login/signup/recuperación de
// contraseña de fuerza bruta. En memoria (por proceso) — suficiente para un servidor propio de
// un despliegue pequeño; si escalas a varias instancias, cámbialo por algo compartido (Redis...).
const rateBuckets = new Map();
function rateLimit(key, max, windowMs) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(id) || [];
    const recent = bucket.filter(t => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' });
    recent.push(now);
    rateBuckets.set(id, recent);
    next();
  };
}
setInterval(() => { rateBuckets.clear(); }, 60 * 60 * 1000).unref(); // limpieza periódica, evita crecer sin límite

app.post('/api/signup', rateLimit('signup', 10, 15 * 60 * 1000), (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const name = req.body?.name ? String(req.body.name).trim() : null;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email no válido' });
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  if (getUserByEmail(email)) return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  const user = createUser({ email, password, name });
  log(user.id, 'auth', 'Cuenta creada');
  res.json({ token: makeToken(user.id), user: publicUser(user) });
});

app.post('/api/login', rateLimit('login', 15, 15 * 60 * 1000), (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  res.json({ token: makeToken(user.id), user: publicUser(user) });
});

// Recuperación de contraseña. La respuesta es siempre la misma exista o no esa cuenta, para no
// dejar averiguar por esta vía qué emails están registrados.
app.post('/api/password/forgot', rateLimit('forgot', 6, 15 * 60 * 1000), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = getUserByEmail(email);
  if (user) {
    const token = createPasswordReset(user.id);
    const base = `${req.protocol}://${req.get('host')}`;
    const link = `${base}/?reset=${token}`;
    await sendMail({
      to: user.email, subject: 'Recupera tu contraseña de TrailCoach',
      text: `Alguien (esperamos que tú) pidió restablecer la contraseña de tu cuenta de TrailCoach.\n\nEntra en este enlace para elegir una nueva contraseña (caduca en 1 hora):\n${link}\n\nSi no has sido tú, ignora este correo — tu contraseña sigue igual.`,
    });
    log(user.id, 'auth', 'Solicitado restablecimiento de contraseña');
  }
  res.json({ ok: true, message: 'Si ese email tiene una cuenta, te hemos enviado un enlace para restablecer la contraseña.' });
});
app.post('/api/password/reset', rateLimit('reset', 10, 15 * 60 * 1000), (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  const userId = consumePasswordReset(req.body?.token);
  if (!userId) return res.status(400).json({ error: 'El enlace no es válido o ha caducado. Pide uno nuevo.' });
  setPassword(userId, password);
  log(userId, 'auth', 'Contraseña restablecida');
  res.json({ token: makeToken(userId), user: publicUser(getUserById(userId)) });
});

app.use('/api', (req, res, next) => {
  if (['/login', '/signup', '/password/forgot', '/password/reset'].includes(req.path) || req.path.startsWith('/strava/callback')) return next();
  const t = req.headers.authorization?.replace('Bearer ', '');
  const uid = verifyToken(t);
  if (!uid || !getUserById(uid)) return res.status(401).json({ error: 'No autenticado' });
  req.userId = uid;
  next();
});

const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(err => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Error' });
});

app.get('/api/me', wrap((req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  res.json(publicUser(user));
}));

// ---------- Hoy / resumen ----------
app.get('/api/today', wrap((req, res) => {
  const uid = req.userId;
  const d = req.query.date || today();
  const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ? AND date = ? ORDER BY id').all(uid, d);
  const checkin = db.prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1').get(uid, d);
  const fit = currentFitness(uid, d);
  const race = db.prepare(`SELECT * FROM races WHERE user_id = ? AND date >= ? AND priority != 'C' ORDER BY date LIMIT 1`).get(uid, d);
  const daysToRace = race ? diffDays(d, race.date) : null;
  const upcoming = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date > ? ORDER BY date, id LIMIT 8`).all(uid, d);
  res.json({
    date: d, sessions, checkin, fitness: fit, next_race: race, days_to_race: daysToRace,
    upcoming, adherence: adherenceStatus(uid, d), month: monthSummary(uid, d),
  });
}));

// ---------- Plan / semanas ----------
app.get('/api/plan', wrap((req, res) => {
  const uid = req.userId;
  const from = req.query.from || mondayOf(today());
  const to = req.query.to || addDays(from, 84);
  const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date, id').all(uid, from, to);
  res.json({ from, to, sessions, weeks: weeksOverview(uid, from, to) });
}));
app.post('/api/plan/generate', wrap((req, res) => res.json(generatePlan(req.userId, { from: req.body?.from, reason: 'Plan regenerado manualmente' }))));
app.post('/api/plan/recalc', wrap((req, res) => res.json(recalcFrom(req.userId, req.body?.from || today()))));

app.get('/api/sessions/:id', wrap((req, res) => {
  const s = db.prepare('SELECT * FROM sessions WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!s) return res.status(404).json({ error: 'No encontrada' });
  res.json(s);
}));
app.patch('/api/sessions/:id', wrap((req, res) => {
  const s = editSession(req.userId, Number(req.params.id), req.body || {});
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.json(s);
}));
app.post('/api/sessions/:id/status', wrap((req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE sessions SET status=? WHERE id=? AND user_id=?').run(status, req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM sessions WHERE id=? AND user_id=?').get(req.params.id, req.userId));
}));
app.post('/api/sessions/:id/lock', wrap((req, res) => {
  db.prepare('UPDATE sessions SET locked=? WHERE id=? AND user_id=?').run(req.body.locked ? 1 : 0, req.params.id, req.userId);
  res.json({ ok: true });
}));
app.delete('/api/sessions/:id', wrap((req, res) => { db.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').run(req.params.id, req.userId); res.json({ ok: true }); }));
app.post('/api/sessions', wrap((req, res) => {
  const s = req.body;
  const r = db.prepare(`INSERT INTO sessions(user_id,date,type,title,description,duration_min,dplus_m,distance_km,zone,status,origin)
    VALUES(?,?,?,?,?,?,?,?,?,?,'manual')`).run(req.userId, s.date, s.type, s.title || s.type, s.description || '', s.duration_min || 0,
    s.dplus_m || 0, s.distance_km || null, s.zone || 'Z2', 'planned');
  res.json(db.prepare('SELECT * FROM sessions WHERE id=? AND user_id=?').get(r.lastInsertRowid, req.userId));
}));

// ---------- Check-in diario ----------
app.post('/api/checkin', wrap((req, res) => res.json(applyCheckin(req.userId, req.body || {}))));
app.get('/api/checkin', wrap((req, res) => res.json(db.prepare('SELECT * FROM checkins WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1').get(req.userId, req.query.date || today()) || null)));

// ---------- Ajuste en lenguaje natural (IA) ----------
app.post('/api/adjust/ask', wrap(async (req, res) => res.json(await naturalAdjust(req.userId, req.body?.message || '', { date: req.body?.date }))));

// ---------- Carreras ----------
app.get('/api/races', wrap((req, res) => res.json(racesFor(req.userId))));
app.post('/api/races', wrap((req, res) => {
  const r = req.body;
  const info = db.prepare(`INSERT INTO races(user_id,name,date,priority,distance_km,dplus_m,dminus_m,time_limit_h,target_time_h,start_time,profile,climbs,aid_stations,notes)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.userId, r.name, r.date, r.priority || 'A', r.distance_km || null, r.dplus_m || null,
    r.dminus_m || null, r.time_limit_h || null, r.target_time_h || null, r.start_time || null,
    r.profile ? JSON.stringify(r.profile) : null, r.climbs ? JSON.stringify(r.climbs) : null,
    r.aid_stations ? JSON.stringify(r.aid_stations) : null, r.notes || null);
  res.json(db.prepare('SELECT * FROM races WHERE id=? AND user_id=?').get(info.lastInsertRowid, req.userId));
}));
app.patch('/api/races/:id', wrap((req, res) => {
  const r = req.body; const cur = db.prepare('SELECT * FROM races WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!cur) return res.status(404).json({ error: 'No encontrada' });
  const merged = { ...cur, ...r };
  db.prepare(`UPDATE races SET name=?,date=?,priority=?,distance_km=?,dplus_m=?,dminus_m=?,time_limit_h=?,target_time_h=?,start_time=?,profile=?,climbs=?,aid_stations=?,notes=? WHERE id=? AND user_id=?`)
    .run(merged.name, merged.date, merged.priority, merged.distance_km, merged.dplus_m, merged.dminus_m, merged.time_limit_h,
      merged.target_time_h, merged.start_time,
      typeof merged.profile === 'string' ? merged.profile : JSON.stringify(merged.profile),
      typeof merged.climbs === 'string' ? merged.climbs : JSON.stringify(merged.climbs),
      typeof merged.aid_stations === 'string' ? merged.aid_stations : JSON.stringify(merged.aid_stations),
      merged.notes, req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM races WHERE id=? AND user_id=?').get(req.params.id, req.userId));
}));
app.delete('/api/races/:id', wrap((req, res) => { db.prepare('DELETE FROM races WHERE id=? AND user_id=?').run(req.params.id, req.userId); res.json({ ok: true }); }));
app.post('/api/races/:id/gpx', wrap((req, res) => {
  const cur = db.prepare('SELECT id FROM races WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!cur) return res.status(404).json({ error: 'No encontrada' });
  const track = parseGpx(req.body.gpx);
  db.prepare(`UPDATE races SET distance_km=?, dplus_m=?, dminus_m=?, profile=?, climbs=? WHERE id=? AND user_id=?`)
    .run(track.distance_km, track.dplus_m, track.dminus_m, JSON.stringify(track.profile), JSON.stringify(track.climbs), req.params.id, req.userId);
  res.json({ ...db.prepare('SELECT * FROM races WHERE id=? AND user_id=?').get(req.params.id, req.userId), track_name: track.name, points: track.points });
}));
app.post('/api/gpx/preview', wrap((req, res) => res.json(parseGpx(req.body.gpx))));
app.get('/api/races/:id/estimate', wrap((req, res) => {
  const r = db.prepare('SELECT * FROM races WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!r) return res.status(404).json({ error: 'No encontrada' });
  res.json({ hours: estimateRaceHours(req.userId, r), feasibility: targetFeasibility(req.userId, r) });
}));
app.get('/api/races/:id/pacing', wrap((req, res) => {
  const r = db.prepare('SELECT * FROM races WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!r) return res.status(404).json({ error: 'No encontrada' });
  const race = { ...r, profile: r.profile ? JSON.parse(r.profile) : null };
  const aid = r.aid_stations ? JSON.parse(r.aid_stations) : [];
  const plan = buildPacingPlan(race, aid);
  if (!plan) return res.status(400).json({ error: 'Falta el objetivo de tiempo (o la distancia) para poder calcular el plan de carrera.' });
  res.json(plan);
}));

// ---------- Historial de carreras pasadas ----------
app.get('/api/past-races', wrap((req, res) => res.json(db.prepare('SELECT * FROM past_races WHERE user_id = ? ORDER BY date DESC').all(req.userId))));
app.post('/api/past-races', wrap((req, res) => {
  const r = req.body;
  const info = db.prepare(`INSERT INTO past_races(user_id,name,date,distance_km,dplus_m,time_min,position,notes,strava_id)
    VALUES(?,?,?,?,?,?,?,?,?)`).run(req.userId, r.name, r.date, r.distance_km || null, r.dplus_m || null, r.time_min || null,
    r.position || null, r.notes || null, r.strava_id || null);
  res.json(db.prepare('SELECT * FROM past_races WHERE id=? AND user_id=?').get(info.lastInsertRowid, req.userId));
}));
app.delete('/api/past-races/:id', wrap((req, res) => { db.prepare('DELETE FROM past_races WHERE id=? AND user_id=?').run(req.params.id, req.userId); res.json({ ok: true }); }));

// ---------- Análisis / fitness ----------
app.get('/api/fitness', wrap((req, res) => {
  const from = req.query.from || addDays(today(), -180);
  const to = req.query.to || addDays(today(), 21);
  res.json(fitnessSeries(req.userId, from, to, { includePlanned: true }));
}));
// VO2max estimado a partir del mejor esfuerzo llano reciente (ver vo2.js). Puede devolver {}
// si todavía no hay ninguna actividad que sirva de referencia.
app.get('/api/vo2max', wrap((req, res) => res.json(estimateVO2max(req.userId) || {})));

app.get('/api/activities', wrap((req, res) => {
  const from = req.query.from || addDays(today(), -90), to = req.query.to || today();
  res.json(db.prepare('SELECT id,name,sport_type,date,distance_m,moving_time_s,elevation_gain_m,avg_hr,load FROM activities WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC').all(req.userId, from, to));
}));

// ---------- Ajustes ----------
app.get('/api/settings', wrap((req, res) => res.json(getSettings(req.userId))));
app.put('/api/settings', wrap((req, res) => res.json(setSettings(req.userId, req.body))));
// Foto de perfil: se sube ya redimensionada/comprimida desde el cliente (data URL), con un
// límite generoso en el servidor (~800KB en base64) para evitar abusos.
app.put('/api/avatar', wrap((req, res) => {
  const data = req.body?.data;
  if (data != null) {
    if (typeof data !== 'string' || !data.startsWith('data:image/') || data.length > 800_000) {
      return res.status(400).json({ error: 'Imagen no válida o demasiado grande' });
    }
  }
  setAvatar(req.userId, data || null);
  res.json({ avatar: data || null });
}));

// Borrado de cuenta (derecho a la supresión, RGPD): pide la contraseña actual como confirmación.
// Las claves foráneas ON DELETE CASCADE se llevan por delante todos los datos del usuario
// (carreras, actividades, sesiones, check-ins, nutrición, tokens de recuperación).
app.delete('/api/account', wrap((req, res) => {
  const user = getUserById(req.userId);
  const password = String(req.body?.password || '');
  // 403, no 401: un 401 aquí haría que el cliente interprete que la sesión ha caducado y cierre
  // sesión sola — el problema no es la sesión, es que la contraseña escrita en el modal es incorrecta.
  if (!verifyPassword(password, user.password_hash)) return res.status(403).json({ error: 'Contraseña incorrecta' });
  deleteUser(req.userId);
  res.json({ ok: true });
}));

// ---------- Strava ----------
app.get('/api/strava/status', wrap((req, res) => res.json({ configured: stravaConfigured(), ...stravaStatus(req.userId) })));
app.get('/api/strava/connect', wrap((req, res) => {
  if (!stravaConfigured()) return res.status(400).json({ error: 'Strava no configurado en el servidor.' });
  res.json({ url: authUrl(makeState(req.userId)) });
}));
app.get('/api/strava/callback', wrap(async (req, res) => {
  const uid = verifyState(req.query.state);
  if (!uid) return res.status(400).send('Enlace de Strava no válido o caducado. Vuelve a intentarlo desde la app.');
  try { await exchangeCode(uid, req.query.code); res.send('<html><body style="font-family:sans-serif;padding:2rem"><h2>Strava conectado ✅</h2><p>Ya puedes cerrar esta pestaña y volver a la app.</p></body></html>'); }
  catch (e) { res.status(400).send(`Error conectando Strava: ${e.message}`); }
}));
app.post('/api/strava/sync', wrap(async (req, res) => res.json(await syncStrava(req.userId, { full: !!req.body?.full }))));
app.post('/api/strava/disconnect', wrap((req, res) => { disconnectStrava(req.userId); res.json({ ok: true }); }));

// ---------- Nutrición ----------
app.get('/api/nutrition', wrap((req, res) => res.json(Nutrition.listLogs(req.userId, { from: req.query.from, to: req.query.to }))));
app.post('/api/nutrition', wrap((req, res) => res.json(Nutrition.addLog(req.userId, req.body || {}))));
app.delete('/api/nutrition/:id', wrap((req, res) => { Nutrition.deleteLog(req.userId, req.params.id); res.json({ ok: true }); }));
app.get('/api/nutrition/insights', wrap((req, res) => res.json(Nutrition.insights(req.userId))));
app.get('/api/nutrition/targets', wrap((req, res) => {
  const st = getSettings(req.userId);
  const race = db.prepare(`SELECT * FROM races WHERE user_id = ? AND date >= ? AND priority != 'C' ORDER BY date LIMIT 1`).get(req.userId, today());
  const hours = race ? (race.target_time_h || estimateRaceHours(req.userId, race)) : 6;
  res.json({ race_name: race?.name || null, hours, ...nutritionTargetsFor(st.weight_kg || 70, hours || 6) });
}));

// ---------- Conocimiento (guía basada en evidencia) ----------
app.get('/api/knowledge', wrap((req, res) => {
  const st = getSettings(req.userId);
  res.json({
    nutrition: NUTRITION_GUIDE, strength: STRENGTH_GUIDE,
    strength_library: Object.fromEntries(Object.entries(STRENGTH_LIBRARY).map(([k, v]) => [k, { label: v.label, exercises: v.exercises, note: v.note || null }])),
    method: METHOD_GUIDE,
    zones: hrZones(st.hr_max, st.hr_rest),
    gel_presets: GEL_PRESETS,
  });
}));

// ---------- Frontend estático ----------
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    // sw.js y el HTML nunca deben quedarse cacheados por el navegador/red del móvil:
    // así el service worker se comprueba (y por tanto se actualiza) en cuanto hay conexión.
    if (filePath.endsWith('sw.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TrailCoach escuchando en :${PORT}`));
