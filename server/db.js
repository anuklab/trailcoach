// Base de datos SQLite (módulo nativo de Node 22, sin dependencias).
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'trailcoach.db'));
// WAL necesita mmap/locking compartido, que falla ("disk I/O error") en carpetas sincronizadas
// (iCloud Drive, Google Drive, unidades de red...). Si falla, seguimos con el modo por defecto,
// que funciona en cualquier carpeta aunque sea un poco más lento.
try { db.exec('PRAGMA journal_mode = WAL;'); }
catch { db.exec('PRAGMA journal_mode = DELETE;'); console.warn('[TrailCoach] SQLite WAL no disponible en esta carpeta (¿iCloud/Drive/red?); usando modo de journal estándar.'); }
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);

-- Cada persona que usa la app: su cuenta, su contraseña y su propia conexión a Strava.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT,
  settings TEXT,                     -- JSON: disponibilidad, fuerza preferida, FC, peso...
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_expires_at INTEGER,
  strava_athlete TEXT,               -- JSON {firstname,lastname,...}
  strava_last_sync TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS races (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT NOT NULL,              -- YYYY-MM-DD
  priority TEXT NOT NULL DEFAULT 'A', -- A objetivo, B preparatoria, C entreno
  distance_km REAL, dplus_m REAL, dminus_m REAL,
  time_limit_h REAL,
  target_time_h REAL,              -- objetivo del atleta (lo pone él)
  profile TEXT,                    -- JSON [[km, ele], ...]
  climbs TEXT,                     -- JSON subidas principales
  aid_stations TEXT,               -- JSON [{name, km, type:'avituallamiento'|'base_vida', rest_min}]
  start_time TEXT,                 -- hora de salida 'HH:MM'
  notes TEXT,
  date_confirmed INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS past_races (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, date TEXT NOT NULL,
  distance_km REAL, dplus_m REAL, time_min REAL,
  position TEXT, notes TEXT, strava_id INTEGER
);

-- id = id de la actividad en Strava (globalmente único entre todas las cuentas de Strava),
-- o negativo si es manual. user_id identifica de quién es dentro de TrailCoach.
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT, sport_type TEXT,
  start_date_local TEXT, date TEXT,
  distance_m REAL, moving_time_s REAL, elapsed_time_s REAL,
  elevation_gain_m REAL, avg_hr REAL, max_hr REAL,
  suffer_score REAL, load REAL,
  raw TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL,     -- rest, easy, long, b2b, vert, tempo, intervals, strength, cross, race, recovery
  title TEXT, description TEXT,
  duration_min REAL DEFAULT 0, dplus_m REAL DEFAULT 0, distance_km REAL,
  zone TEXT, rpe TEXT,
  load REAL DEFAULT 0,
  key INTEGER DEFAULT 0,
  phase TEXT, week_start TEXT, race_id INTEGER,
  status TEXT DEFAULT 'planned', -- planned, done, partial, missed, skipped
  origin TEXT DEFAULT 'plan',    -- plan, ajuste, ia, manual
  locked INTEGER DEFAULT 0,
  activity_id INTEGER,
  change_note TEXT,
  original TEXT            -- JSON de la sesión antes de modificarla
);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  fatigue INTEGER, legs_heavy INTEGER, bad_sleep INTEGER, sick INTEGER, pain TEXT,
  available_min INTEGER, note TEXT,
  result TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS changelog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  at TEXT DEFAULT CURRENT_TIMESTAMP,
  source TEXT, summary TEXT, detail TEXT
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  session_id INTEGER,
  minute_mark INTEGER,      -- minuto de la sesión en que se tomó
  product TEXT NOT NULL,    -- ej: "gel Maurten 100"
  carbs_g REAL, sodium_mg REAL, caffeine_mg REAL,
  feeling TEXT,             -- bien, neutro, mal
  gi_issue INTEGER DEFAULT 0,  -- molestia digestiva sí/no
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Recuperación de contraseña: token de un solo uso con caducidad, nunca se guarda en claro.
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Migraciones ligeras: añade columnas nuevas si la base de datos ya existía sin ellas
// (por ejemplo, instancias desplegadas antes de pasar a multiusuario).
function ensureColumn(table, col, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
}
ensureColumn('races', 'target_time_h', 'REAL');
ensureColumn('races', 'aid_stations', 'TEXT');
ensureColumn('races', 'start_time', 'TEXT');
// Tipo de carrera: 'ultra' (distancia + desnivel fijos) o 'backyard' (vueltas de una hora a un
// desnivel/distancia fijo por vuelta, hasta quedar el/la última en pie — "Last Man Standing").
// En una backyard, dplus_m se reutiliza para guardar el D+ de una sola vuelta, no el total.
ensureColumn('races', 'type', "TEXT DEFAULT 'ultra'");
// 'stage': carrera por etapas (Marathon des Sables y similares). distance_km/dplus_m se reutilizan
// como la distancia/desnivel de UNA etapa media (igual que dplus_m en backyard es el de una vuelta);
// n_stages es el nº de etapas y target_time_h el objetivo de tiempo TOTAL sumando todas las etapas.
ensureColumn('races', 'n_stages', 'INTEGER');
for (const t of ['races', 'past_races', 'activities', 'sessions', 'checkins', 'nutrition_logs']) {
  ensureColumn(t, 'user_id', 'INTEGER');
}
ensureColumn('changelog', 'user_id', 'INTEGER');
ensureColumn('users', 'strava_last_sync', 'TEXT');
// legs_heavy pasa de booleano (0/1) a tri-estado (0=ligeras, 1=normales, 2=pesadas); misma columna, sin migración de datos necesaria.
ensureColumn('checkins', 'wants_session', 'INTEGER'); // el atleta pide entrenar algo en un día marcado como descanso
// Foto de perfil: se guarda aparte de `settings` (que se lee/fusiona en casi cada petición)
// para no cargar una imagen en cada llamada que solo necesita los ajustes normales.
ensureColumn('users', 'avatar_data', 'TEXT');
// Suscripción (Stripe): cada cuenta nueva arranca con 14 días de prueba sin pedir tarjeta.
ensureColumn('users', 'stripe_customer_id', 'TEXT');
ensureColumn('users', 'stripe_subscription_id', 'TEXT');
ensureColumn('users', 'subscription_status', "TEXT DEFAULT 'trialing'"); // trialing, active, past_due, canceled
ensureColumn('users', 'subscription_plan', 'TEXT'); // monthly, yearly
ensureColumn('users', 'trial_ends_at', 'TEXT');

// Los índices por user_id se crean aquí, después de las migraciones, para garantizar
// que la columna ya existe (en una base de datos previa a multiusuario, no existía
// todavía cuando se ejecutaba el bloque de creación de tablas de más arriba).
db.exec(`
CREATE INDEX IF NOT EXISTS idx_races_user ON races(user_id);
CREATE INDEX IF NOT EXISTS idx_past_races_user ON past_races(user_id);
CREATE INDEX IF NOT EXISTS idx_act_user_date ON activities(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sess_user_date ON sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date);
CREATE INDEX IF NOT EXISTS idx_changelog_user ON changelog(user_id);
CREATE INDEX IF NOT EXISTS idx_nutri_user_date ON nutrition_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_pwreset_token ON password_resets(token_hash);
`);

// ---------- Autenticación ----------
// scrypt (nativo en Node, sin dependencias externas) para el hash de contraseñas.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const TRIAL_DAYS = 14;
export function createUser({ email, password, name }) {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const info = db.prepare(`INSERT INTO users(email, password_hash, name, subscription_status, trial_ends_at)
    VALUES (?,?,?,'trialing',?)`)
    .run(String(email).trim().toLowerCase(), hashPassword(password), name || null, trialEndsAt);
  return getUserById(info.lastInsertRowid);
}
export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(String(email || '').trim());
}
export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
export function setPassword(userId, password) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), userId);
}
export function deleteUser(userId) {
  // Las claves foráneas con ON DELETE CASCADE se llevan por delante carreras, actividades,
  // sesiones, check-ins, nutrición y tokens de recuperación de este usuario.
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

// ---------- Recuperación de contraseña ----------
// El token en claro solo existe en memoria/email; en la base de datos solo se guarda su hash
// (sha256 basta aquí: es un valor aleatorio de un solo uso con caducidad corta, no una contraseña).
export function createPasswordReset(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora
  db.prepare('INSERT INTO password_resets(user_id, token_hash, expires_at) VALUES (?,?,?)').run(userId, tokenHash, expiresAt);
  return token;
}
export function consumePasswordReset(token) {
  const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0').get(tokenHash);
  if (!row || row.expires_at < new Date().toISOString()) return null;
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);
  return row.user_id;
}

export const DEFAULT_SETTINGS = {
  // minutos disponibles por día (lunes..domingo) — lo usa el planificador
  availability: [0, 75, 75, 90, 60, 240, 150],
  // franjas horarias por día (lunes..domingo), cada una [{s:'HH:MM', e:'HH:MM'}, ...]; de aquí
  // se calculan los minutos de `availability`. null = todavía no configurado por franjas.
  availability_windows: null,
  long_day: 5,          // 0=lunes .. 6=domingo
  b2b_day: 6,
  max_week_hours: 14,
  hr_max: 185, hr_rest: 50,
  strength: true,
  strength_mode: 'gym',  // gym, climbing, calisthenics, home
  poles: true,
  plan_start: null,     // si null, hoy
  athlete_name: '',
  last_name: '',
  birth_date: null,
  height_cm: null,
  weight_kg: 70,
  injury_history: '', // texto libre: lesiones pasadas/crónicas — el planificador se vuelve más conservador si hay algo aquí
  onboarding_done: false, // controla si se ha completado el asistente inicial (datos + objetivo)
};

// Los ajustes viven por usuario, en users.settings (JSON), fusionados con los valores por defecto.
export function getSettings(userId) {
  const row = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId);
  let stored = {};
  if (row?.settings) { try { stored = JSON.parse(row.settings); } catch { stored = {}; } }
  return { ...DEFAULT_SETTINGS, ...stored };
}
export function setSettings(userId, patch) {
  const merged = { ...getSettings(userId), ...patch };
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(merged), userId);
  return merged;
}

// ---------- Foto de perfil ----------
export function getAvatar(userId) {
  return db.prepare('SELECT avatar_data FROM users WHERE id = ?').get(userId)?.avatar_data || null;
}
export function setAvatar(userId, dataUrl) {
  db.prepare('UPDATE users SET avatar_data = ? WHERE id = ?').run(dataUrl || null, userId);
}

// ---------- Suscripción (Stripe) ----------
export function setStripeCustomer(userId, customerId) {
  db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, userId);
}
export function setSubscription(userId, { subscriptionId, status, plan }) {
  db.prepare('UPDATE users SET stripe_subscription_id = ?, subscription_status = ?, subscription_plan = ? WHERE id = ?')
    .run(subscriptionId || null, status, plan || null, userId);
}
export function getUserByStripeCustomer(customerId) {
  return db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
}
// ¿Puede este usuario seguir usando la app? true durante la prueba gratuita (14 días desde el
// alta) o con una suscripción activa/en periodo de gracia por impago; false si la prueba caducó
// y no hay suscripción, o si la suscripción se canceló.
export function billingAccess(user) {
  const trialActive = user.subscription_status === 'trialing' && user.trial_ends_at && user.trial_ends_at > new Date().toISOString();
  const subActive = ['active', 'past_due'].includes(user.subscription_status);
  return {
    allowed: trialActive || subActive,
    status: user.subscription_status,
    plan: user.subscription_plan,
    trialEndsAt: user.trial_ends_at,
    trialDaysLeft: trialActive ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - Date.now()) / 86400000)) : 0,
  };
}

export function getKV(key, fallback = null) {
  const r = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
  if (!r) return fallback;
  try { return JSON.parse(r.value); } catch { return r.value; }
}
export function setKV(key, value) {
  db.prepare('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
}

export function log(userId, source, summary, detail = null) {
  db.prepare('INSERT INTO changelog(user_id, source, summary, detail) VALUES(?,?,?,?)')
    .run(userId, source, summary, detail ? JSON.stringify(detail) : null);
}

export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
