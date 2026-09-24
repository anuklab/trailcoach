// Utilidades de fechas (trabajamos siempre con 'YYYY-MM-DD' en hora local del atleta).
const TZ = process.env.TZ_ATHLETE || 'Europe/Madrid';

export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
}
export function toDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
export function fmt(d) { return d.toISOString().slice(0, 10); }
export function addDays(s, n) { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return fmt(d); }
export function diffDays(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
// 0 = lunes ... 6 = domingo
export function weekday(s) { return (toDate(s).getUTCDay() + 6) % 7; }
export function mondayOf(s) { return addDays(s, -weekday(s)); }
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const round5 = x => Math.round(x / 5) * 5;
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
