// Base de datos SQLite (módulo nativo de Node 22, sin dependencias).
import { DatabaseSync } from 'node:sqlite';
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

CREATE TABLE IF NOT EXISTS races (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  name TEXT NOT NULL, date TEXT NOT NULL,
  distance_km REAL, dplus_m REAL, time_min REAL,
  position TEXT, notes TEXT, strava_id INTEGER
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,          -- id de Strava (o negativo si es manual)
  name TEXT, sport_type TEXT,
  start_date_local TEXT, date TEXT,
  distance_m REAL, moving_time_s REAL, elapsed_time_s REAL,
  elevation_gain_m REAL, avg_hr REAL, max_hr REAL,
  suffer_score REAL, load REAL,
  raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_act_date ON activities(date);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
CREATE INDEX IF NOT EXISTS idx_sess_date ON sessions(date);

CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  fatigue INTEGER, legs_heavy INTEGER, bad_sleep INTEGER, sick INTEGER, pain TEXT,
  available_min INTEGER, note TEXT,
  result TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS changelog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT DEFAULT CURRENT_TIMESTAMP,
  source TEXT, summary TEXT, detail TEXT
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
CREATE INDEX IF NOT EXISTS idx_nutri_date ON nutrition_logs(date);
`);

// Migraciones ligeras: añade columnas nuevas si la base de datos ya existía sin ellas.
function ensureColumn(table, col, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
}
ensureColumn('races', 'target_time_h', 'REAL');
ensureColumn('races', 'aid_stations', 'TEXT');
ensureColumn('races', 'start_time', 'TEXT');

export function getKV(key, fallback = null) {
  const r = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
  if (!r) return fallback;
  try { return JSON.parse(r.value); } catch { return r.value; }
}
export function setKV(key, value) {
  db.prepare('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
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
  weight_kg: 70,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(getKV('settings') || {}) };
}

export function log(source, summary, detail = null) {
  db.prepare('INSERT INTO changelog(source, summary, detail) VALUES(?,?,?)')
    .run(source, summary, detail ? JSON.stringify(detail) : null);
}

export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
