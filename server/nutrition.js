// Registro de nutrición en entreno y análisis de qué productos funcionan mejor.
import { db } from './db.js';

export function addLog(entry) {
  const r = db.prepare(`INSERT INTO nutrition_logs(date, session_id, minute_mark, product, carbs_g, sodium_mg, caffeine_mg, feeling, gi_issue, notes)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
    entry.date, entry.session_id || null, entry.minute_mark ?? null, entry.product,
    entry.carbs_g ?? null, entry.sodium_mg ?? null, entry.caffeine_mg ?? null,
    entry.feeling || null, entry.gi_issue ? 1 : 0, entry.notes || null);
  return db.prepare('SELECT * FROM nutrition_logs WHERE id=?').get(r.lastInsertRowid);
}

export function listLogs({ from, to } = {}) {
  if (from && to) return db.prepare('SELECT * FROM nutrition_logs WHERE date BETWEEN ? AND ? ORDER BY date DESC, minute_mark').all(from, to);
  return db.prepare('SELECT * FROM nutrition_logs ORDER BY date DESC, minute_mark LIMIT 200').all();
}

export function deleteLog(id) { db.prepare('DELETE FROM nutrition_logs WHERE id=?').run(id); }

const FEELING_SCORE = { bien: 1, neutro: 0, mal: -1 };

// Agrega por producto: cuántas veces se ha probado, cómo suele sentar, y si da problemas digestivos.
export function insights() {
  const rows = db.prepare('SELECT product, feeling, gi_issue FROM nutrition_logs').all();
  const byProduct = {};
  for (const r of rows) {
    const p = (byProduct[r.product] ||= { product: r.product, n: 0, score: 0, gi_issues: 0 });
    p.n++; p.score += FEELING_SCORE[r.feeling] ?? 0; p.gi_issues += r.gi_issue ? 1 : 0;
  }
  const list = Object.values(byProduct).map(p => ({ ...p, avg_score: +(p.score / p.n).toFixed(2) }));
  return {
    products: list.sort((a, b) => b.avg_score - a.avg_score || b.n - a.n),
    recommended: list.filter(p => p.n >= 2 && p.avg_score > 0.3 && p.gi_issues === 0).map(p => p.product),
    avoid: list.filter(p => p.avg_score < -0.2 || (p.gi_issues / p.n) > 0.3).map(p => p.product),
    total_logs: rows.length,
  };
}
