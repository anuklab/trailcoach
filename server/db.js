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

-- Material: zapatillas, bastones, mochila… con kilometraje acumulado para saber cuándo tocaría cambiarlo.
CREATE TABLE IF NOT EXISTS gear (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'zapatillas',   -- zapatillas, bastones, mochila, otro
  km_limit REAL DEFAULT 700,        -- km recomendados antes de cambiarlo
  km_start REAL DEFAULT 0,          -- km que ya tenía al darlo de alta (si no es nuevo)
  km_accrued REAL DEFAULT 0,        -- km sumados automáticamente desde Strava + ajustes manuales
  active INTEGER DEFAULT 1,         -- en uso actualmente (solo unas zapatillas "activas" a la vez)
  retired INTEGER DEFAULT 0,        -- retirado/jubilado
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
CREATE INDEX IF NOT EXISTS idx_gear_user ON gear(user_id);
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

export function createUser({ email, password, name }) {
  const info = db.prepare('INSERT INTO users(email, password_hash, name) VALUES (?,?,?)')
    .run(String(email).trim().toLowerCase(), hashPassword(password), name || null);
  return getUserById(info.lastInsertRowid);
}
export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(String(email || '').trim());
}
export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export const DEFAULT_SETTINGS = {
  // minutos disponibles por día (lunes..domingo)
  availability: [0, 75, 75, 90, 60, 240, 150],
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
