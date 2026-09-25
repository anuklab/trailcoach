// Material (zapatillas, bastones, mochila…): kilometraje acumulado y aviso de cuándo tocaría
// cambiarlo. El kilometraje de las zapatillas activas se suma solo cuando llega una actividad
// nueva de Strava (ver strava.js); el resto se puede ajustar a mano.
import { db } from './db.js';

export function listGear(userId) {
  return db.prepare('SELECT * FROM gear WHERE user_id = ? ORDER BY retired ASC, active DESC, id DESC').all(userId);
}

export function addGear(userId, g) {
  if (g.type === 'zapatillas' && g.active) deactivateOthers(userId, 'zapatillas');
  const info = db.prepare(`INSERT INTO gear(user_id, name, type, km_limit, km_start, km_accrued, active, retired)
    VALUES (?,?,?,?,?,0,?,0)`).run(
    userId, g.name || 'Zapatillas', g.type || 'zapatillas', g.km_limit || 700, g.km_start || 0, g.active ? 1 : 0,
  );
  return db.prepare('SELECT * FROM gear WHERE id = ?').get(info.lastInsertRowid);
}

export function updateGear(userId, id, patch) {
  const g = db.prepare('SELECT * FROM gear WHERE id = ? AND user_id = ?').get(id, userId);
  if (!g) return null;
  const merged = { ...g, ...patch };
  if (merged.type === 'zapatillas' && merged.active && !(g.active && g.type === 'zapatillas')) deactivateOthers(userId, 'zapatillas', id);
  db.prepare(`UPDATE gear SET name=?, type=?, km_limit=?, km_start=?, km_accrued=?, active=?, retired=? WHERE id=? AND user_id=?`)
    .run(merged.name, merged.type, merged.km_limit, merged.km_start, merged.km_accrued, merged.active ? 1 : 0, merged.retired ? 1 : 0, id, userId);
  return db.prepare('SELECT * FROM gear WHERE id = ?').get(id);
}

export function deleteGear(userId, id) {
  db.prepare('DELETE FROM gear WHERE id = ? AND user_id = ?').run(id, userId);
}

function deactivateOthers(userId, type, exceptId = null) {
  db.prepare(`UPDATE gear SET active = 0 WHERE user_id = ? AND type = ? AND id != ?`).run(userId, type, exceptId || -1);
}

// Suma km a todas las zapatillas activas (normalmente solo una) cuando llega una actividad de correr nueva.
export function addKmToActiveShoes(userId, km) {
  if (!km) return;
  db.prepare(`UPDATE gear SET km_accrued = km_accrued + ? WHERE user_id = ? AND type = 'zapatillas' AND active = 1 AND retired = 0`)
    .run(km, userId);
}
