import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, getSettings, setKV, getKV, log, DEFAULT_SETTINGS } from './db.js';
import { today, addDays, mondayOf, diffDays } from './util.js';
import { parseGpx } from './gpx.js';
import { generatePlan, weeksOverview, estimateRaceHours, racesFor, targetFeasibility } from './planner.js';
import { applyCheckin, editSession, recalcFrom, naturalAdjust } from './adjust.js';
import { fitnessSeries, currentFitness } from './load.js';
import { authUrl, exchangeCode, syncStrava, stravaStatus, stravaConfigured, disconnectStrava } from './strava.js';
import { adherenceStatus, monthSummary } from './adherence.js';
import { buildPacingPlan } from './pacing.js';
import * as Nutrition from './nutrition.js';
import { NUTRITION_GUIDE, STRENGTH_GUIDE, STRENGTH_LIBRARY, nutritionTargetsFor } from './knowledge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '15mb' }));

// ---------- Autenticación (app personal, un único usuario) ----------
const APP_PASSWORD = process.env.APP_PASSWORD || null;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
function sign(v) { return crypto.createHmac('sha256', SECRET).update(v).digest('hex'); }
function makeToken() { const v = `${Date.now()}.${crypto.randomBytes(16).toString('hex')}`; return `${v}.${sign(v)}`; }
function validToken(t) {
  if (!t) return false;
  const parts = t.split('.'); if (parts.length !== 3) return false;
  const v = parts.slice(0, 2).join('.');
  return sign(v) === parts[2];
}
app.post('/api/login', (req, res) => {
  if (!APP_PASSWORD) return res.json({ token: makeToken(), note: 'Sin contraseña configurada (APP_PASSWORD).' });
  if (req.body?.password !== APP_PASSWORD) return res.status(401).json({ error: 'Contraseña incorrecta' });
  res.json({ token: makeToken() });
});
app.use('/api', (req, res, next) => {
  if (req.path === '/login' || req.path.startsWith('/strava/callback')) return next();
  if (!APP_PASSWORD) return next(); // sin contraseña: abierta (solo para uso local/confiado)
  const t = req.headers.authorization?.replace('Bearer ', '');
  if (!validToken(t)) return res.status(401).json({ error: 'No autenticado' });
  next();
});

const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(err => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Error' });
});

// ---------- Hoy / resumen ----------
app.get('/api/today', wrap((req, res) => {
  const d = req.query.date || today();
  const sessions = db.prepare('SELECT * FROM sessions WHERE date = ? ORDER BY id').all(d);
  const checkin = db.prepare('SELECT * FROM checkins WHERE date = ? ORDER BY id DESC LIMIT 1').get(d);
  const fit = currentFitness(d);
  const race = db.prepare(`SELECT * FROM races WHERE date >= ? AND priority != 'C' ORDER BY date LIMIT 1`).get(d);
  const daysToRace = race ? diffDays(d, race.date) : null;
  const upcoming = db.prepare(`SELECT * FROM sessions WHERE date > ? ORDER BY date, id LIMIT 8`).all(d);
  res.json({
    date: d, sessions, checkin, fitness: fit, next_race: race, days_to_race: daysToRace,
    upcoming, adherence: adherenceStatus(d), month: monthSummary(d),
  });
}));

// ---------- Plan / semanas ----------
app.get('/api/plan', wrap((req, res) => {
  const from = req.query.from || mondayOf(today());
  const to = req.query.to || addDays(from, 84);
  const sessions = db.prepare('SELECT * FROM sessions WHERE date BETWEEN ? AND ? ORDER BY date, id').all(from, to);
  res.json({ from, to, sessions, weeks: weeksOverview(from, to) });
}));
app.post('/api/plan/generate', wrap((req, res) => res.json(generatePlan({ from: req.body?.from, reason: 'Plan regenerado manualmente' }))));
app.post('/api/plan/recalc', wrap((req, res) => res.json(recalcFrom(req.body?.from || today()))));

app.get('/api/sessions/:id', wrap((req, res) => {
  const s = db.prepare('SELECT * FROM sessions WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'No encontrada' });
  res.json(s);
}));
app.patch('/api/sessions/:id', wrap((req, res) => {
  const s = editSession(Number(req.params.id), req.body || {});
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.json(s);
}));
app.post('/api/sessions/:id/status', wrap((req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE sessions SET status=? WHERE id=?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM sessions WHERE id=?').get(req.params.id));
}));
app.post('/api/sessions/:id/lock', wrap((req, res) => {
  db.prepare('UPDATE sessions SET locked=? WHERE id=?').run(req.body.locked ? 1 : 0, req.params.id);
  res.json({ ok: true });
}));
app.delete('/api/sessions/:id', wrap((req, res) => { db.prepare('DELETE FROM sessions WHERE id=?').run(req.params.id); res.json({ ok: true }); }));
app.post('/api/sessions', wrap((req, res) => {
  const s = req.body;
  const r = db.prepare(`INSERT INTO sessions(date,type,title,description,duration_min,dplus_m,distance_km,zone,status,origin)
    VALUES(?,?,?,?,?,?,?,?,?,'manual')`).run(s.date, s.type, s.title || s.type, s.description || '', s.duration_min || 0,
    s.dplus_m || 0, s.distance_km || null, s.zone || 'Z2', 'planned');
  res.json(db.prepare('SELECT * FROM sessions WHERE id=?').get(r.lastInsertRowid));
}));

// ---------- Check-in diario ----------
app.post('/api/checkin', wrap((req, res) => res.json(applyCheckin(req.body || {}))));
app.get('/api/checkin', wrap((req, res) => res.json(db.prepare('SELECT * FROM checkins WHERE date = ? ORDER BY id DESC LIMIT 1').get(req.query.date || today()) || null)));

// ---------- Ajuste en lenguaje natural (IA) ----------
app.post('/api/adjust/ask', wrap(async (req, res) => res.json(await naturalAdjust(req.body?.message || '', { date: req.body?.date }))));

// ---------- Carreras ----------
app.get('/api/races', wrap((req, res) => res.json(racesFor())));
app.post('/api/races', wrap((req, res) => {
  const r = req.body;
  const info = db.prepare(`INSERT INTO races(name,date,priority,distance_km,dplus_m,dminus_m,time_limit_h,target_time_h,start_time,profile,climbs,aid_stations,notes)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.name, r.date, r.priority || 'A', r.distance_km || null, r.dplus_m || null,
    r.dminus_m || null, r.time_limit_h || null, r.target_time_h || null, r.start_time || null,
    r.profile ? JSON.stringify(r.profile) : null, r.climbs ? JSON.stringify(r.climbs) : null,
    r.aid_stations ? JSON.stringify(r.aid_stations) : null, r.notes || null);
  res.json(db.prepare('SELECT * FROM races WHERE id=?').get(info.lastInsertRowid));
}));
app.patch('/api/races/:id', wrap((req, res) => {
  const r = req.body; const cur = db.prepare('SELECT * FROM races WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'No encontrada' });
  const merged = { ...cur, ...r };
  db.prepare(`UPDATE races SET name=?,date=?,priority=?,distance_km=?,dplus_m=?,dminus_m=?,time_limit_h=?,target_time_h=?,start_time=?,profile=?,climbs=?,aid_stations=?,notes=? WHERE id=?`)
    .run(merged.name, merged.date, merged.priority, merged.distance_km, merged.dplus_m, merged.dminus_m, merged.time_limit_h,
      merged.target_time_h, merged.start_time,
      typeof merged.profile === 'string' ? merged.profile : JSON.stringify(merged.profile),
      typeof merged.climbs === 'string' ? merged.climbs : JSON.stringify(merged.climbs),
      typeof merged.aid_stations === 'string' ? merged.aid_stations : JSON.stringify(merged.aid_stations),
      merged.notes, req.params.id);
  res.json(db.prepare('SELECT * FROM races WHERE id=?').get(req.params.id));
}));
app.delete('/api/races/:id', wrap((req, res) => { db.prepare('DELETE FROM races WHERE id=?').run(req.params.id); res.json({ ok: true }); }));
app.post('/api/races/:id/gpx', wrap((req, res) => {
  const track = parseGpx(req.body.gpx);
  db.prepare(`UPDATE races SET distance_km=?, dplus_m=?, dminus_m=?, profile=?, climbs=? WHERE id=?`)
    .run(track.distance_km, track.dplus_m, track.dminus_m, JSON.stringify(track.profile), JSON.stringify(track.climbs), req.params.id);
  res.json({ ...db.prepare('SELECT * FROM races WHERE id=?').get(req.params.id), track_name: track.name, points: track.points });
}));
app.post('/api/gpx/preview', wrap((req, res) => res.json(parseGpx(req.body.gpx))));
app.get('/api/races/:id/estimate', wrap((req, res) => {
  const r = db.prepare('SELECT * FROM races WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'No encontrada' });
  res.json({ hours: estimateRaceHours(r), feasibility: targetFeasibility(r) });
}));
app.get('/api/races/:id/pacing', wrap((req, res) => {
  const r = db.prepare('SELECT * FROM races WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'No encontrada' });
  const race = { ...r, profile: r.profile ? JSON.parse(r.profile) : null };
  const aid = r.aid_stations ? JSON.parse(r.aid_stations) : [];
  const plan = buildPacingPlan(race, aid);
  if (!plan) return res.status(400).json({ error: 'Falta el objetivo de tiempo (o la distancia) para poder calcular el plan de carrera.' });
  res.json(plan);
}));

// ---------- Historial de carreras pasadas ----------
app.get('/api/past-races', wrap((req, res) => res.json(db.prepare('SELECT * FROM past_races ORDER BY date DESC').all())));
app.post('/api/past-races', wrap((req, res) => {
  const r = req.body;
  const info = db.prepare(`INSERT INTO past_races(name,date,distance_km,dplus_m,time_min,position,notes,strava_id)
    VALUES(?,?,?,?,?,?,?,?)`).run(r.name, r.date, r.distance_km || null, r.dplus_m || null, r.time_min || null,
    r.position || null, r.notes || null, r.strava_id || null);
  res.json(db.prepare('SELECT * FROM past_races WHERE id=?').get(info.lastInsertRowid));
}));
app.delete('/api/past-races/:id', wrap((req, res) => { db.prepare('DELETE FROM past_races WHERE id=?').run(req.params.id); res.json({ ok: true }); }));

// ---------- Análisis / fitness ----------
app.get('/api/fitness', wrap((req, res) => {
  const from = req.query.from || addDays(today(), -180);
  const to = req.query.to || addDays(today(), 21);
  res.json(fitnessSeries(from, to, { includePlanned: true }));
}));
app.get('/api/activities', wrap((req, res) => {
  const from = req.query.from || addDays(today(), -90), to = req.query.to || today();
  res.json(db.prepare('SELECT id,name,sport_type,date,distance_m,moving_time_s,elevation_gain_m,avg_hr,load FROM activities WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(from, to));
}));

// ---------- Ajustes ----------
app.get('/api/settings', wrap((req, res) => res.json(getSettings())));
app.put('/api/settings', wrap((req, res) => { setKV('settings', { ...getSettings(), ...req.body }); res.json(getSettings()); }));

// ---------- Strava ----------
app.get('/api/strava/status', wrap((req, res) => res.json({ configured: stravaConfigured(), ...stravaStatus() })));
app.get('/api/strava/connect', wrap((req, res) => {
  if (!stravaConfigured()) return res.status(400).json({ error: 'Strava no configurado en el servidor.' });
  res.json({ url: authUrl('trailcoach') });
}));
app.get('/api/strava/callback', wrap(async (req, res) => {
  try { await exchangeCode(req.query.code); res.send('<html><body style="font-family:sans-serif;padding:2rem"><h2>Strava conectado ✅</h2><p>Ya puedes cerrar esta pestaña y volver a la app.</p></body></html>'); }
  catch (e) { res.status(400).send(`Error conectando Strava: ${e.message}`); }
}));
app.post('/api/strava/sync', wrap(async (req, res) => res.json(await syncStrava({ full: !!req.body?.full }))));
app.post('/api/strava/disconnect', wrap((req, res) => { disconnectStrava(); res.json({ ok: true }); }));

// ---------- Nutrición ----------
app.get('/api/nutrition', wrap((req, res) => res.json(Nutrition.listLogs({ from: req.query.from, to: req.query.to }))));
app.post('/api/nutrition', wrap((req, res) => res.json(Nutrition.addLog(req.body || {}))));
app.delete('/api/nutrition/:id', wrap((req, res) => { Nutrition.deleteLog(req.params.id); res.json({ ok: true }); }));
app.get('/api/nutrition/insights', wrap((req, res) => res.json(Nutrition.insights())));
app.get('/api/nutrition/targets', wrap((req, res) => {
  const st = getSettings();
  const race = db.prepare(`SELECT * FROM races WHERE date >= ? AND priority != 'C' ORDER BY date LIMIT 1`).get(today());
  const hours = race ? (race.target_time_h || estimateRaceHours(race)) : 6;
  res.json({ race_name: race?.name || null, hours, ...nutritionTargetsFor(st.weight_kg || 70, hours || 6) });
}));

// ---------- Conocimiento (guía basada en evidencia) ----------
app.get('/api/knowledge', wrap((req, res) => res.json({
  nutrition: NUTRITION_GUIDE, strength: STRENGTH_GUIDE,
  strength_library: Object.fromEntries(Object.entries(STRENGTH_LIBRARY).map(([k, v]) => [k, { label: v.label, exercises: v.exercises, note: v.note || null }])),
})));

// ---------- Frontend estático ----------
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TrailCoach escuchando en :${PORT}`));
