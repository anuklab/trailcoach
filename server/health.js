// Sincronización con Apple Health (vía el plugin capacitor-health, solo en la app nativa de iOS).
// A diferencia de Strava (que es un servidor con el que ULTRALAB - TRAILCOACH habla directamente por OAuth),
// Apple Health solo es accesible desde dentro del propio dispositivo: es la app (JS, en public/app.js)
// quien pide permiso, consulta los entrenos con el plugin, y nos los manda aquí ya en JSON — este
// módulo simplemente los guarda y los empareja con la sesión planificada del día, igual que hacemos
// con las actividades de Strava.
import { db, log } from './db.js';
import { activityLoad } from './load.js';
import { today } from './util.js';
import { autoAdaptAfterSync } from './adjust.js';

function upsertHealthActivity(userId, w) {
  const existing = db.prepare('SELECT id FROM activities WHERE user_id = ? AND source = ? AND source_id = ?')
    .get(userId, 'health', w.id || w.startDate);
  const date = (w.startDate || '').slice(0, 10);
  const row = {
    user_id: userId, name: w.workoutType || 'Entreno (Apple Health)', sport_type: w.workoutType || null,
    start_date_local: w.startDate, date,
    distance_m: w.distance ?? null, moving_time_s: w.duration ?? null, elapsed_time_s: w.duration ?? null,
    elevation_gain_m: null,
    avg_hr: w.heartRate?.length ? Math.round(w.heartRate.reduce((a, h) => a + h.bpm, 0) / w.heartRate.length) : null,
    max_hr: w.heartRate?.length ? Math.max(...w.heartRate.map(h => h.bpm)) : null,
    suffer_score: null, raw: JSON.stringify(w), source: 'health', source_id: w.id || w.startDate,
  };
  row.load = activityLoad(row, userId);
  let id;
  if (existing) {
    id = existing.id;
    db.prepare(`UPDATE activities SET name=@name, sport_type=@sport_type, start_date_local=@start_date_local,
        date=@date, distance_m=@distance_m, moving_time_s=@moving_time_s, elapsed_time_s=@elapsed_time_s,
        avg_hr=@avg_hr, max_hr=@max_hr, load=@load, raw=@raw
      WHERE id = ${id} AND user_id = @user_id`).run(row);
  } else {
    const info = db.prepare(`INSERT INTO activities(user_id,name,sport_type,start_date_local,date,distance_m,
        moving_time_s,elapsed_time_s,elevation_gain_m,avg_hr,max_hr,suffer_score,load,raw,source,source_id)
      VALUES(@user_id,@name,@sport_type,@start_date_local,@date,@distance_m,@moving_time_s,@elapsed_time_s,
        @elevation_gain_m,@avg_hr,@max_hr,@suffer_score,@load,@raw,@source,@source_id)`).run(row);
    id = info.lastInsertRowid;
  }
  return { ...row, id, isNew: !existing };
}

// Misma lógica que en strava.js: empareja con la sesión planificada del mismo día que todavía no
// tenga una actividad asociada (para no pisar lo que ya vino de Strava, si el atleta usa las dos).
function matchSession(userId, row) {
  const s = db.prepare(`SELECT * FROM sessions WHERE user_id = ? AND date = ? AND activity_id IS NULL AND type NOT IN ('rest','strength') ORDER BY id LIMIT 1`).get(userId, row.date);
  if (!s) return null;
  const actualMin = (row.moving_time_s || 0) / 60;
  const status = (s.duration_min > 0 && actualMin < s.duration_min * 0.5) ? 'partial' : 'done';
  db.prepare(`UPDATE sessions SET activity_id=?, status=? WHERE id=? AND user_id=?`).run(row.id, status, s.id, userId);
  return { ...s, status, activity_id: row.id };
}

// `workouts` viene tal cual del plugin capacitor-health (queryWorkouts) desde la app nativa.
export function syncHealthWorkouts(userId, workouts) {
  let total = 0;
  const matched = [];
  for (const w of workouts || []) {
    if (!w.startDate) continue;
    const row = upsertHealthActivity(userId, w);
    const m = matchSession(userId, row);
    if (m) matched.push({ session: m, activity: row });
    total++;
  }
  if (total) log(userId, 'apple-health', `Sincronizados ${total} entrenos desde Apple Health`);
  let planChanges = [];
  if (matched.length) {
    try { planChanges = autoAdaptAfterSync(userId, matched, today()); }
    catch (e) { log(userId, 'auto-adapt-error', e.message); }
  }
  return { synced: total, matched: matched.length, planChanges };
}
