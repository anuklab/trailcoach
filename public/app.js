'use strict';
/* TrailCoach — app frontend (vanilla JS, sin dependencias) */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const ZCOLOR = { Z1: 'var(--z1)', Z2: 'var(--z2)', Z3: 'var(--z3)', Z4: 'var(--z4)', Z5: 'var(--z5)' };
// Los nombres de día/mes ya no son arrays fijos en castellano: daysLong()/daysShort()/monthsShort()
// /monthsLong() (definidas en i18n.js) devuelven los del idioma activo en cada llamada, para que
// el calendario, los selectores de día y las fechas formateadas cambien de idioma con el resto.

// ---------------- Iconos (monolínea, sin librerías) ----------------
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  flag: '<path d="M5 3v18"/><path d="M5 4h11l-2.5 4L16 12H5"/>',
  apple: '<path d="M12 8c-3.6 0-6 3-6 7 0 3.6 2.4 7 6 7s6-3.4 6-7c0-4-2.4-7-6-7z"/><path d="M12 8V4"/><path d="M12 5c1.2-1.3 2.6-1.8 4-1.5"/>',
  scroll: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  chart: '<path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M3.5 12h3M17.5 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  wave: '<path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
  droplet: '<path d="M12 3s6 7.2 6 11.2a6 6 0 0 1-12 0C6 10.2 12 3 12 3z"/>',
  mountain: '<path d="M3 19 9 9l3 4 3-6 6 12z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  chevronsUp: '<path d="M7 14l5-5 5 5"/><path d="M7 19l5-5 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  dumbbell: '<path d="M2 10v4M6 7v10M18 7v10M22 10v4M6 12h12"/>',
  bike: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 18l3-8 4 8M12 10h3l3 8M6 18l6-8"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7-2.7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  half: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17c0-5 2-6 6-6s6-1 6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 0 1 5.4.9c0 1.7-2.6 2-2.6 3.6"/><path d="M12 17.2h.01"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/>',
};
function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`; }

const TYPE_ICON = { rest: 'moon', easy: 'wave', recovery: 'droplet', long: 'mountain', b2b: 'repeat',
  vert: 'chevronsUp', tempo: 'clock', intervals: 'bolt', strength: 'dumbbell', race: 'flag', cross: 'bike' };

function fmtDate(d) { const [y, m, day] = d.split('-'); return `${+day}${t('date_join')}${monthsShort()[+m - 1]}`; }
function fmtDateLong(d) { const [y, m, day] = d.split('-'); return `${daysLong()[weekday(d)]} ${+day}${t('date_join')}${monthsShort()[+m - 1]}`; }
function weekday(d) { const dt = new Date(d + 'T00:00:00Z'); return (dt.getUTCDay() + 6) % 7; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDays(d, n) { const dt = new Date(d + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); }
function hm(min) { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m} min`; }
function esc(s) { return (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------------- Disponibilidad por franjas horarias ----------------
// Cada día puede tener varias franjas (ej: 06:00–09:00 y 17:00–22:00, para quien entrena antes y
// después del trabajo). Los minutos totales del día (lo que usa el planificador) se calculan
// sumando la duración de todas sus franjas.
const AVAIL_PRESETS = [
  { key: 'avail_morning', s: '07:00', e: '12:00' },
  { key: 'avail_midday', s: '12:00', e: '15:00' },
  { key: 'avail_afternoon', s: '15:00', e: '20:00' },
  { key: 'avail_evening', s: '20:00', e: '23:59' },
  { key: 'avail_night', s: '00:00', e: '07:00' },
];
function timeToMin(t) { const [h, m] = (t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); }
function minToTime(min) { min = Math.max(0, Math.min(23 * 60 + 59, Math.round(min))); return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }
function windowMin(w) { return Math.max(0, timeToMin(w.e) - timeToMin(w.s)); }
function dayTotalMin(windows) { return (windows || []).reduce((a, w) => a + windowMin(w), 0); }
// Migra la disponibilidad antigua (solo minutos totales, sin horario) a una franja genérica, para
// que quien ya tenía la app configurada la vea reflejada al entrar en esta nueva vista.
function seedWindowsFromMinutes(mins) {
  return (mins || []).map(m => m > 0 ? [{ s: '17:00', e: minToTime(timeToMin('17:00') + m) }] : []);
}
const AvailUI = {
  stores: {},
  init(ns, windowsOrMinutes) {
    // windowsOrMinutes puede venir como franjas ya guardadas ([[{s,e},...], x7]) o, para compatibilidad
    // con cuentas antiguas / el valor por defecto, como minutos totales por día ([0,75,75,...]).
    const isWindows = Array.isArray(windowsOrMinutes) && windowsOrMinutes.length === 7 && windowsOrMinutes.every(x => Array.isArray(x));
    const windows = isWindows ? windowsOrMinutes : seedWindowsFromMinutes(Array.isArray(windowsOrMinutes) ? windowsOrMinutes : []);
    this.stores[ns] = windows.map(day => (day || []).map(w => ({ ...w })));
  },
  render(ns) { return this.stores[ns].map((windows, i) => this.dayBlock(ns, i, windows)).join(''); },
  dayBlock(ns, i, windows) {
    const total = dayTotalMin(windows);
    // El horario personalizado se preselecciona correlativo al último tramo ya marcado ese día
    // (empieza justo donde acaba el anterior), en vez de un valor fijo que podría solaparse o
    // quedar suelto antes de los tramos existentes.
    const lastEnd = windows.length ? windows.reduce((max, w) => timeToMin(w.e) > timeToMin(max) ? w.e : max, windows[0].e) : '18:00';
    const defStart = lastEnd;
    const defEnd = minToTime(timeToMin(lastEnd) + 60);
    return `<div class="avail-day-block">
      <div class="avail-day-head"><strong>${daysLong()[i]}</strong><span class="small ${total ? 'muted' : 'avail-rest'}">${total ? hm(total) : t('cal_rest')}</span></div>
      <div class="chip-row">
        ${AVAIL_PRESETS.map(p => `<div class="chip ${windows.some(w => w.s === p.s && w.e === p.e) ? 'selected' : ''}" onclick="AvailUI.togglePreset('${ns}',${i},'${p.s}','${p.e}')">${t(p.key)}</div>`).join('')}
        <div class="chip" onclick="AvailUI.toggleCustomRow('${ns}',${i})">${icon('plus')} ${t('avail_custom_schedule')}</div>
      </div>
      <div class="avail-ranges">
        ${windows.length ? windows.map((w, wi) => `<span class="avail-range-chip">${w.s}–${w.e}<button type="button" onclick="AvailUI.removeWindow('${ns}',${i},${wi})">${icon('x')}</button></span>`).join('') : `<span class="small muted">${t('avail_no_windows')}</span>`}
      </div>
      <div class="avail-custom-row" id="avc-${ns}-${i}" style="display:none">
        <input type="time" id="avc-s-${ns}-${i}" value="${defStart}">
        <span class="small muted">–</span>
        <input type="time" id="avc-e-${ns}-${i}" value="${defEnd}">
        <button type="button" class="ghost small" onclick="AvailUI.addCustom('${ns}',${i})">${t('btn_add')}</button>
      </div>
    </div>`;
  },
  togglePreset(ns, day, s, e) {
    const windows = this.stores[ns][day];
    const idx = windows.findIndex(w => w.s === s && w.e === e);
    if (idx >= 0) windows.splice(idx, 1); else windows.push({ s, e });
    this.reRender(ns);
  },
  toggleCustomRow(ns, day) {
    const el = document.getElementById(`avc-${ns}-${day}`);
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
  },
  addCustom(ns, day) {
    const s = document.getElementById(`avc-s-${ns}-${day}`).value;
    const e = document.getElementById(`avc-e-${ns}-${day}`).value;
    if (!s || !e || timeToMin(e) <= timeToMin(s)) { toast(t('err_invalid_time_range')); return; }
    this.stores[ns][day].push({ s, e });
    this.reRender(ns);
  },
  removeWindow(ns, day, idx) {
    this.stores[ns][day].splice(idx, 1);
    this.reRender(ns);
  },
  reRender(ns) {
    const el = document.getElementById(`availBlock-${ns}`);
    if (el) el.innerHTML = this.render(ns);
  },
  minutes(ns) { return this.stores[ns].map(dayTotalMin); },
  windows(ns) { return this.stores[ns]; },
};

function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toastRoot').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ---------------- API ----------------
const Auth = {
  token: localStorage.getItem('tc_token') || null,
  showTab(which) {
    $('#authTabLogin').classList.toggle('active', which === 'login');
    $('#authTabSignup').classList.toggle('active', which === 'signup');
    $('#authTabs').style.display = which === 'reset' ? 'none' : '';
    $('#authFormLogin').style.display = which === 'login' ? 'block' : 'none';
    $('#authFormSignup').style.display = which === 'signup' ? 'block' : 'none';
    $('#authFormForgot').style.display = which === 'forgot' ? 'block' : 'none';
    $('#authFormReset').style.display = which === 'reset' ? 'block' : 'none';
  },
  async forgotPassword() {
    const email = $('#forgotEmail').value.trim();
    $('#forgotErr').textContent = ''; $('#forgotOk').style.display = 'none';
    try {
      const r = await fetch('/api/password/forgot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const d = await r.json();
      if (!r.ok) { $('#forgotErr').textContent = d.error || t('err_generic'); return; }
      $('#forgotOk').textContent = d.message; $('#forgotOk').style.display = 'block';
    } catch (e) { $('#forgotErr').textContent = t('err_no_server_connection'); }
  },
  async resetPassword() {
    const password = $('#resetPass').value;
    $('#resetErr').textContent = '';
    const params = new URLSearchParams(location.search);
    const token = params.get('reset');
    try {
      const r = await fetch('/api/password/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const d = await r.json();
      if (!r.ok) { $('#resetErr').textContent = d.error || t('err_generic'); return; }
      Auth.token = d.token; localStorage.setItem('tc_token', d.token);
      history.replaceState(null, '', location.pathname);
      toast(t('toast_password_updated'));
      boot();
    } catch (e) { $('#resetErr').textContent = t('err_no_server_connection'); }
  },
  async login() {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPass').value;
    $('#loginErr').textContent = '';
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (!r.ok) { $('#loginErr').textContent = d.error || t('err_generic'); return; }
      Auth.token = d.token; localStorage.setItem('tc_token', d.token);
      boot();
    } catch (e) { $('#loginErr').textContent = t('err_no_server_connection'); }
  },
  async signup() {
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim();
    const password = $('#signupPass').value;
    const password2 = $('#signupPass2').value;
    $('#signupErr').textContent = '';
    if (password !== password2) { $('#signupErr').textContent = t('err_passwords_mismatch'); return; }
    try {
      const r = await fetch('/api/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const d = await r.json();
      if (!r.ok) { $('#signupErr').textContent = d.error || t('err_generic'); return; }
      Auth.token = d.token; localStorage.setItem('tc_token', d.token);
      boot();
    } catch (e) { $('#signupErr').textContent = t('err_no_server_connection'); }
  },
};

async function api(path, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  if (Auth.token) headers.authorization = `Bearer ${Auth.token}`;
  const r = await fetch('/api' + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (r.status === 401) { Auth.token = null; localStorage.removeItem('tc_token'); showLogin(); throw new Error(t('err_not_authenticated')); }
  const isJson = (r.headers.get('content-type') || '').includes('json');
  const d = isJson ? await r.json() : await r.text();
  if (r.status === 402) { showPaywall(d.billing); throw new Error(d.error || t('err_subscription_required')); }
  if (!r.ok) throw new Error((d && d.error) || t('err_network'));
  return d;
}
const get = p => api(p);
const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) });
const patch = (p, b) => api(p, { method: 'PATCH', body: JSON.stringify(b || {}) });
const put = (p, b) => api(p, { method: 'PUT', body: JSON.stringify(b || {}) });
const del = p => api(p, { method: 'DELETE' });

// ---------------- Modal helper ----------------
function openModal(html, { center = false } = {}) {
  const bg = document.createElement('div'); bg.className = 'modal-bg' + (center ? ' center' : '');
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  $('#modalRoot').appendChild(bg);
  return bg;
}
function closeModals() { $('#modalRoot').innerHTML = ''; }

// ---------------- Tabs ----------------
const TABS = [
  { id: 'hoy', labelKey: 'nav_hoy', icon: 'sun' },
  { id: 'plan', labelKey: 'nav_plan', icon: 'calendar' },
  { id: 'historial', labelKey: 'nav_historial', icon: 'scroll' },
  { id: 'analisis', labelKey: 'nav_analisis', icon: 'chart' },
];
const ALL_VIEWS = [...TABS.map(tb => tb.id), 'ajustes'];
let currentTab = 'hoy';
function switchTab(tab) {
  currentTab = tab;
  ALL_VIEWS.forEach(id => { $('#view-' + id).classList.toggle('active', id === tab); });
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render(tab);
}
function relabelTabbar() {
  $$('.tabbar button').forEach(b => {
    const tb = TABS.find(x => x.id === b.dataset.tab);
    b.innerHTML = `${icon(tb.icon)}<span>${t(tb.labelKey)}</span>`;
  });
}
relabelTabbar();
$$('.tabbar button').forEach(b => { b.addEventListener('click', () => switchTab(b.dataset.tab)); });
$('.profile-btn').innerHTML = icon('gear');
if ($('.support-btn')) $('.support-btn').innerHTML = icon('help');
// El botón de perfil (arriba a la derecha) muestra tu foto si tienes una subida, y si no,
// un icono de ajustes claro — nada de iconos ambiguos.
function updateProfileBtn(avatarUrl) {
  const btn = $('.profile-btn');
  if (!btn) return;
  if (avatarUrl) {
    btn.innerHTML = '';
    btn.style.backgroundImage = `url('${avatarUrl}')`;
    btn.classList.add('has-photo');
  } else {
    btn.style.backgroundImage = '';
    btn.classList.remove('has-photo');
    btn.innerHTML = icon('gear');
  }
}

function render(tab) {
  const fns = { hoy: renderHoy, plan: renderPlan, historial: renderHistorial, analisis: renderAnalisis, ajustes: renderAjustes };
  fns[tab] && fns[tab]();
}

// =================== HOY ===================
async function renderHoy() {
  const el = $('#view-hoy');
  el.innerHTML = `<div class="list-empty">${t('common_loading')}</div>`;
  let data;
  try { data = await get('/today'); } catch (e) { el.innerHTML = `<div class="card">${t('err_prefix')}${esc(e.message)}</div>`; return; }
  const { sessions, checkin, fitness, next_race, days_to_race, date, upcoming, adherence, month } = data;

  const tsb = fitness.tsb;
  const tsbLabel = tsb > 5 ? t('tsb_fresh') : tsb < -15 ? t('tsb_very_loaded') : tsb < -5 ? t('tsb_loaded') : t('tsb_balanced');
  const tsbColor = tsb > 5 ? 'var(--ok)' : tsb < -15 ? 'var(--danger)' : tsb < -5 ? 'var(--warn)' : 'var(--accent2)';

  el.innerHTML = `
    <h1>${fmtDateLong(date)}</h1>
    ${next_race ? `<p class="muted small" style="margin-top:-6px">${days_to_race === 0 ? `${t('hoy_race_today')} ${esc(next_race.name)}` : `${days_to_race} ${t('hoy_race_days_to')} ${esc(next_race.name)}`}${next_race.target_time_h ? ` · ${t('hoy_race_target')} ${next_race.target_time_h}h` : ''}</p>` : ''}

    ${adherence && adherence.level !== 'sin_datos' ? `
    <div class="banner ${adherence.level}">
      ${icon(adherence.level === 'flojeando' ? 'x' : adherence.level === 'atencion' ? 'info' : 'check')}
      <p>${esc(adherence.message)}</p>
    </div>` : ''}

    ${!checkin && tsb < -18 ? `
    <div class="banner atencion">
      ${icon('info')}
      <p>${t('hoy_banner_no_checkin_high_load').replace('{v}', Math.round(tsb))}</p>
    </div>` : ''}

    <div class="stat-grid card tight">
      <div class="stat" style="cursor:pointer" onclick="metricModal('forma')"><div class="v">${Math.round(fitness.ctl)}</div><div class="l">${t('metric_form')} ${icon('info')}</div></div>
      <div class="stat" style="cursor:pointer" onclick="metricModal('fatiga')"><div class="v">${Math.round(fitness.atl)}</div><div class="l">${t('metric_fatigue')} ${icon('info')}</div></div>
      <div class="stat" style="cursor:pointer" onclick="metricModal('fresco')"><div class="v" style="color:${tsbColor}">${tsb > 0 ? '+' : ''}${Math.round(tsb)}</div><div class="l">${tsbLabel} ${icon('info')}</div></div>
    </div>

    ${month.activities ? `
    <div class="card tight">
      <h3 style="margin-bottom:8px">${t('hoy_last_n_days').replace('{n}', month.days)}</h3>
      <div class="stat-grid">
        <div class="stat"><div class="v">${month.km}</div><div class="l">${t('unit_km')}</div></div>
        <div class="stat"><div class="v">${month.dplus}</div><div class="l">${t('unit_dplus')}</div></div>
        <div class="stat"><div class="v">${month.hours}h</div><div class="l">${t('hoy_time_label')}</div></div>
      </div>
      ${month.completion_pct != null ? `<div class="progressbar" style="margin-top:10px"><div style="width:${month.completion_pct}%"></div></div>
      <p class="small muted" style="margin-top:4px">${month.completion_pct}${t('hoy_pct_completed')}</p>` : ''}
    </div>` : ''}

    ${!checkin ? `
    <div class="card">
      <h2>${t('hoy_checkin_header')}</h2>
      <p class="muted small">${t('hoy_checkin_hint')}</p>
      <button class="primary" style="width:100%;margin-top:6px" onclick="Checkin.open('${date}', ${sessions.some(s => s.type === 'rest')})">${t('hoy_checkin_do')}</button>
    </div>` : `
    <div class="card tight" style="display:flex;justify-content:space-between;align-items:center">
      <span class="small muted">${t('hoy_checkin_done')}</span>
      <button class="ghost" onclick="Checkin.open('${date}', ${sessions.some(s => s.type === 'rest')})">${t('btn_edit')}</button>
    </div>`}

    <div class="card" style="margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>${t('hoy_session_header')}</h2>
        <button class="ghost small" onclick="methodModal()">${icon('info')} ${t('plan_based_on')}</button>
      </div>
      <div id="hoySessions">${sessions.length ? sessions.map(sessionCard).join('') : `<p class="muted">${t('hoy_no_sessions')}</p>`}</div>
    </div>

    ${upcoming && upcoming.length ? `
    <div class="card">
      <h2>${t('hoy_upcoming_header')}</h2>
      ${upcoming.slice(0, 5).map(s => `<div class="upcoming-item">
        ${icon(TYPE_ICON[s.type] || 'wave')}
        <div class="day">${daysShort()[weekday(s.date)]} ${fmtDate(s.date)}</div>
        <div class="t">${esc(s.title)}</div>
        <div class="d">${s.duration_min ? hm(s.duration_min) : ''}</div>
      </div>`).join('')}
    </div>` : ''}

    <div class="card ask-coach">
      <h2>${t('hoy_ask_header')}</h2>
      <div class="chip-row" id="askSuggestions">
        <div class="chip" data-v="Hoy estoy muy cansado">${t('hoy_chip_tired')}</div>
        <div class="chip" data-v="Hoy solo tengo 1 hora">${t('hoy_chip_short_time')}</div>
        <div class="chip" data-v="Me pesan las piernas hoy">${t('hoy_chip_heavy_legs')}</div>
        <div class="chip" data-v="Esta semana solo puedo entrenar 3 días">${t('hoy_chip_fewer_days')}</div>
      </div>
      <textarea id="freeAsk" placeholder="${t('hoy_ask_placeholder')}"></textarea>
      <button class="primary" style="width:100%;margin-top:6px" onclick="freeAsk()">${t('btn_send')}</button>
      <div id="freeAskResult"></div>
    </div>
  `;
  $$('#askSuggestions .chip').forEach(c => c.addEventListener('click', () => {
    $('#freeAsk').value = c.dataset.v;
    $('#freeAsk').focus();
  }));
}

function sessionCard(s) {
  const badge = s.status === 'done' ? `<span class="pill done">${t('btn_done')}</span>` : s.status === 'partial' ? `<span class="pill partial">${t('btn_partial')}</span>`
    : s.status === 'missed' ? `<span class="pill missed">${t('btn_notdone')}</span>` : '';
  const key = s.key ? `<span class="pill key">${t('pill_key')}</span>` : '';
  const zones = zoneBar(s.zone);
  const changeNote = s.change_note ? `<p class="small" style="color:var(--accent2)">${icon('edit')} ${esc(s.change_note)}</p>` : '';
  return `<div class="session ${s.type === 'rest' ? 'rest' : ''}" data-id="${s.id}">
    <div class="head" ${s.type !== 'rest' ? `style="cursor:pointer" onclick="sessionDetailModal(${s.id})"` : ''}>
      <div><strong class="stype">${icon(TYPE_ICON[s.type] || 'wave')} ${esc(s.title)}</strong>${changeNote}</div>
      <div>${key}${badge}</div>
    </div>
    <div class="desc">${esc(s.description || '')}</div>
    <div class="meta">
      ${s.duration_min ? `<span>${hm(s.duration_min)}</span>` : ''}
      ${s.dplus_m ? `<span>${Math.round(s.dplus_m)} m D+</span>` : ''}
      ${s.zone && s.zone !== '-' ? `<span onclick="event.stopPropagation();zoneModal('${s.zone}')" style="cursor:pointer;text-decoration:underline dotted">${s.zone}</span>` : ''}
    </div>
    ${zones}
    ${s.type !== 'rest' ? `<div class="actions">
      <button onclick="markStatus(${s.id},'done')">${t('btn_done')}</button>
      <button onclick="markStatus(${s.id},'partial')">${t('btn_partial')}</button>
      <button onclick="markStatus(${s.id},'missed')">${t('btn_notdone')}</button>
      <button onclick="editSessionModal(${s.id})">${t('btn_edit')}</button>
      <button onclick="toggleLock(${s.id}, ${s.locked ? 0 : 1})">${s.locked ? t('btn_unlock') : t('btn_lock')}</button>
    </div>` : ''}
  </div>`;
}

// Detalle de una sesión: descripción completa + zonas de FC en ppm reales.
async function sessionDetailModal(id) {
  let s;
  try { s = await get(`/sessions/${id}`); } catch (e) { toast(t('err_prefix') + e.message); return; }
  const zones = (K.zones || []).filter(z => (s.zone || '').split('-').includes(z.zone));
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${icon(TYPE_ICON[s.type] || 'wave')} ${esc(s.title)}</h2>
    <p>${esc(s.description || t('session_no_description'))}</p>
    <div class="stat-grid" style="margin:10px 0">
      ${s.duration_min ? `<div class="stat"><div class="v">${hm(s.duration_min)}</div><div class="l">${t('session_duration_label')}</div></div>` : ''}
      ${s.dplus_m ? `<div class="stat"><div class="v">${Math.round(s.dplus_m)}</div><div class="l">${t('unit_dplus')}</div></div>` : ''}
      ${s.zone && s.zone !== '-' ? `<div class="stat"><div class="v">${esc(s.zone)}</div><div class="l">${t('session_zone_label')}</div></div>` : ''}
    </div>
    ${zones.length ? `<div class="divider"></div><h3 style="text-transform:none;color:var(--text);font-size:.95rem">${t('session_hr_header')}</h3>
      ${zones.map(z => `<div class="zone-row">
        <div class="z-badge" style="background:${ZCOLOR[z.zone]}">${z.zone}</div>
        <div class="z-info"><strong>${esc(z.name)}</strong><span class="small muted">${z.bpm[0]}–${z.bpm[1]} ${t('unit_ppm_avg').split(' ')[0]}</span></div>
      </div>`).join('')}` : ''}
    ${['done', 'partial'].includes(s.status) && s.type !== 'rest' ? rpeBlockHtml(s) : ''}
  `, { center: true });
}
// ¿Cómo de duro se sintió? Cierra el ciclo planificado-vs-percibido: si el atleta dice que fue
// mucho más duro de lo que tocaba para esa zona, el motor suaviza automáticamente lo siguiente
// (ver /api/sessions/:id/rpe y applyRpeFeedback en el servidor).
function rpeBlockHtml(s) {
  if (s.rpe) return `<div class="divider"></div><p class="small">${t('rpe_recorded_label')} <strong>${esc(s.rpe)}/10</strong></p>`;
  return `<div class="divider"></div>
    <h3 style="text-transform:none;color:var(--text);font-size:.95rem">${t('rpe_header')}</h3>
    <p class="small muted">${t('rpe_scale_hint')}</p>
    <div class="chip-row" id="rpe-chips">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<div class="chip" data-v="${n}" onclick="submitRpe(${s.id},${n})">${n}</div>`).join('')}</div>`;
}
async function submitRpe(id, rpe) {
  try {
    const r = await post(`/sessions/${id}/rpe`, { rpe });
    toast(r.changes && r.changes.length ? t('toast_rpe_smoothed') : t('toast_rpe_recorded'));
    closeModals();
    render(currentTab);
  } catch (e) { toast(t('err_prefix') + e.message); }
}

// Franja de colores = zonas de frecuencia cardiaca del entreno (Z1 más suave -> Z5 más duro).
// Antes eran solo colores sin explicación; ahora llevan la letra de la zona debajo y, al tocarla,
// abren la leyenda con los rangos de pulsaciones reales (zoneModal), igual que el texto "Z1-Z2".
function zoneBar(zone) {
  if (!zone || zone === '-') return '';
  const parts = zone.split('-');
  return `<div class="zonebar-wrap" onclick="event.stopPropagation();zoneModal('${zone}')">
    <div class="zonebar">${parts.map(z => `<div style="flex:1;background:${ZCOLOR[z] || '#333'}"></div>`).join('')}</div>
    <div class="zonebar-labels">${parts.map(z => `<span style="flex:1">${esc(z)}</span>`).join('')}</div>
  </div>`;
}

async function markStatus(id, status) {
  await post(`/sessions/${id}/status`, { status });
  toast(status === 'done' ? t('toast_marked_done') : status === 'partial' ? t('toast_marked_partial') : t('toast_marked_missed'));
  render(currentTab);
}
async function toggleLock(id, locked) {
  await post(`/sessions/${id}/lock`, { locked: !!locked });
  toast(locked ? t('toast_session_locked') : t('toast_session_unlocked'));
  render(currentTab);
}

async function freeAsk() {
  const msg = $('#freeAsk').value.trim();
  if (!msg) return;
  const btn = event.target; btn.disabled = true; btn.textContent = t('common_thinking');
  try {
    const r = await post('/adjust/ask', { message: msg, date: todayStr() });
    $('#freeAskResult').innerHTML = `<div class="card tight" style="margin-top:8px;background:var(--panel2)">
      <p>${esc(r.message)}</p>
      ${r.applied.length ? `<p class="small muted">${r.applied.length} ${t('hoy_sessions_modified')}</p>` : ''}
    </div>`;
    $('#freeAsk').value = '';
    render(currentTab);
  } catch (e) { toast(t('err_prefix') + e.message); }
  finally { btn.disabled = false; btn.textContent = t('btn_send'); }
}

// ---------------- Check-in modal ----------------
const Checkin = {
  // legs_heavy: 0=ligeras, 1=normales, 2=pesadas
  state: { fatigue: 2, legs_heavy: 1, bad_sleep: false, sick: false, pain: '', available_min: null, note: '', wants_session: false },
  open(date, isRestToday = false) {
    this.date = date;
    this.state.wants_session = false;
    const bg = openModal(`
      <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
      <h2>${t('checkin_title')} ${fmtDateLong(date)}</h2>
      <label>${t('checkin_fatigue_label')}</label>
      <div class="chip-row" id="ci-fatigue">
        ${[t('checkin_fatigue_0'), t('checkin_fatigue_1'), t('checkin_fatigue_2'), t('checkin_fatigue_3'), t('checkin_fatigue_4')].map((lbl, i) => `<div class="chip" data-v="${i}">${lbl}</div>`).join('')}
      </div>
      <label>${t('checkin_legs_label')}</label>
      <div class="chip-row" id="ci-legs">
        <div class="chip" data-v="0">${t('checkin_legs_light')}</div><div class="chip" data-v="1">${t('checkin_legs_normal')}</div><div class="chip" data-v="2">${t('checkin_legs_heavy')}</div>
      </div>
      <label>${t('checkin_sleep_label')}</label>
      <div class="chip-row" id="ci-sleep"><div class="chip" data-v="0">${t('checkin_no')}</div><div class="chip" data-v="1">${t('checkin_yes')}</div></div>
      <label>${t('checkin_sick_label')}</label>
      <div class="chip-row" id="ci-sick"><div class="chip" data-v="0">${t('checkin_sick_no')}</div><div class="chip" data-v="1">${t('checkin_sick_sick')}</div><div class="chip" data-v="2">${t('checkin_sick_pain')}</div></div>
      <div id="painField" style="display:none"><label>${t('checkin_pain_label')}</label><input id="ci-pain" placeholder="${t('checkin_pain_ph')}"></div>
      ${isRestToday ? `
      <div class="card tight" style="margin:10px 0;background:var(--panel2)">
        <label style="display:flex;align-items:center;gap:8px;margin:0">
          <input type="checkbox" id="ci-wants" style="width:auto">
          ${t('checkin_wants_session')}
        </label>
      </div>` : ''}
      <label>${t('checkin_time_label')}</label>
      <input id="ci-time" type="number" placeholder="${t('checkin_time_ph')}">
      <label>${t('checkin_note_label')}</label>
      <textarea id="ci-note" placeholder="${t('common_optional')}"></textarea>
      <button class="primary" style="width:100%;margin-top:12px" onclick="Checkin.submit()">${t('checkin_submit')}</button>
    `, { center: true });
    const wire = (id, key, single = true) => {
      $$(`#${id} .chip`).forEach(c => c.addEventListener('click', () => {
        if (single) $$(`#${id} .chip`).forEach(x => x.classList.remove('selected'));
        c.classList.toggle('selected');
        this.state[key] = c.classList.contains('selected') ? +c.dataset.v : (key === 'fatigue' ? 2 : key === 'legs_heavy' ? 1 : 0);
        if (id === 'ci-sick') $('#painField').style.display = this.state.sick === 2 ? 'block' : 'none';
      }));
    };
    wire('ci-fatigue', 'fatigue'); wire('ci-legs', 'legs_heavy'); wire('ci-sleep', 'bad_sleep'); wire('ci-sick', 'sick');
    bg.querySelectorAll('#ci-fatigue .chip')[2].classList.add('selected');
    bg.querySelectorAll('#ci-legs .chip')[1].classList.add('selected');
  },
  async submit() {
    const st = this.state;
    const body = {
      date: this.date,
      fatigue: st.fatigue, legs_heavy: st.legs_heavy, bad_sleep: !!st.bad_sleep,
      sick: st.sick === 1, pain: st.sick === 2 ? ($('#ci-pain').value || t('checkin_pain_fallback')) : '',
      available_min: $('#ci-time').value ? +$('#ci-time').value : null,
      note: $('#ci-note').value,
      wants_session: $('#ci-wants') ? $('#ci-wants').checked : false,
    };
    try {
      const r = await post('/checkin', body);
      closeModals();
      toast(r.changes.length ? `${t('toast_checkin_changes')} ${r.changes.length} ${t('toast_checkin_changes_suffix')}` : t('toast_checkin_no_changes'));
      render(currentTab);
    } catch (e) { toast(t('err_prefix') + e.message); }
  },
};

// ---------------- Editar sesión ----------------
async function editSessionModal(id) {
  const s = await get(`/sessions/${id}`);
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${t('session_edit_title')}</h2>
    <label>${t('session_type_label')}</label>
    <select id="es-type">${Object.keys(TYPE_ICON).map(tp => `<option value="${tp}" ${tp === s.type ? 'selected' : ''}>${tp}</option>`).join('')}</select>
    <label>${t('session_title_label')}</label><input id="es-title" value="${esc(s.title)}">
    <label>${t('session_desc_label')}</label><textarea id="es-desc">${esc(s.description || '')}</textarea>
    <div class="row">
      <div><label>${t('session_duration_min_label')}</label><input id="es-dur" type="number" value="${s.duration_min || 0}"></div>
      <div><label>${t('session_dplus_label')}</label><input id="es-dplus" type="number" value="${s.dplus_m || 0}"></div>
    </div>
    <label>${t('session_zone_label2')}</label><input id="es-zone" value="${esc(s.zone || '')}" placeholder="${t('session_zone_ph')}">
    <div class="row" style="margin-top:14px">
      <button class="danger" onclick="deleteSessionConfirm(${s.id})">${t('btn_delete')}</button>
      <button class="primary" onclick="saveSessionEdit(${s.id})">${t('btn_save')}</button>
    </div>
  `, { center: true });
}
async function saveSessionEdit(id) {
  await patch(`/sessions/${id}`, {
    type: $('#es-type').value, title: $('#es-title').value, description: $('#es-desc').value,
    duration_min: +$('#es-dur').value, dplus_m: +$('#es-dplus').value, zone: $('#es-zone').value,
    note: 'Editado a mano',
  });
  closeModals(); toast(t('toast_session_updated')); render(currentTab);
}
async function deleteSessionConfirm(id) {
  if (!confirm(t('confirm_delete_session'))) return;
  await del(`/sessions/${id}`); closeModals(); toast(t('toast_session_deleted')); render(currentTab);
}

// =================== PLAN ===================
// Dos vistas: "Semana" (una semana completa, navegable día a día de un tirón) y
// "Mes" (calendario para ver de un vistazo descansos, tiradas largas, calidad, etc.
// sin tener que abrir cada día). Los colores del calendario y de la franja de zona
// de cada sesión se explican siempre con una leyenda — nada de colores sin significado.
let planMode = 'week'; // 'week' | 'month'
let planFrom = null;   // ancla: cualquier fecha dentro de la semana/mes que se está viendo
let planData = null;   // último /plan cargado, para abrir el detalle de un día del calendario
const CAL_COLOR = {
  easy: 'var(--z1)', recovery: 'var(--z1)', cross: 'var(--z1)',
  long: 'var(--accent)', b2b: 'var(--accent)',
  vert: 'var(--warn)', tempo: 'var(--warn)', intervals: 'var(--warn)',
  strength: 'var(--violet)', race: 'var(--danger)', rest: 'var(--border)',
};
const CAL_LEGEND_KEYS = [
  ['rest', 'cal_rest'], ['easy', 'cal_easy'], ['long', 'cal_long'],
  ['vert', 'cal_quality'], ['strength', 'cal_strength'], ['race', 'cal_race'],
];

function mondayOf(d) { const wd = weekday(d); return addDays(d, -wd); }
function startOfMonth(d) { return d.slice(0, 8) + '01'; }
function endOfMonth(d) { const [y, m] = d.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
function addMonths(d, n) { const [y, m, day] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, Math.min(day, 28))).toISOString().slice(0, 10); }

async function renderPlan() {
  const el = $('#view-plan');
  if (!planFrom) planFrom = todayStr();
  el.innerHTML = `<div class="list-empty">${t('common_loading')}</div>`;

  let from, to;
  if (planMode === 'month') {
    const ms = startOfMonth(planFrom), me = endOfMonth(planFrom);
    from = mondayOf(ms);
    to = addDays(me, 6 - weekday(me));
  } else {
    from = mondayOf(planFrom);
    to = addDays(from, 6);
  }

  let data;
  try { data = await get(`/plan?from=${from}&to=${to}`); }
  catch (e) { el.innerHTML = `<div class="card">${t('err_prefix')}${esc(e.message)}</div>`; return; }
  planData = data;

  el.innerHTML = `
    <h1>${t('plan_title')}</h1>
    <div class="card tight" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleRaces()">
      <strong id="racesToggleLabel">${t('plan_races')}</strong>
      ${icon('flag')}
    </div>
    <div id="planRaces" style="display:none"></div>

    <div class="theme-toggle" style="width:100%;margin:14px 0 12px">
      <button style="flex:1;justify-content:center" class="${planMode === 'week' ? 'active' : ''}" onclick="setPlanMode('week')">${t('plan_week')}</button>
      <button style="flex:1;justify-content:center" class="${planMode === 'month' ? 'active' : ''}" onclick="setPlanMode('month')">${t('plan_month')}</button>
    </div>

    ${data.sessions.length ? (planMode === 'month' ? monthView(from, to) : weekView(from)) : `<div class="list-empty">${t('plan_no_sessions')}</div>`}

    <div class="row" style="margin-top:14px">
      <button onclick="regenPlan()">${icon('refresh')} ${t('plan_regenerate')}</button>
      <button class="ghost small" onclick="methodModal()">${icon('info')} ${t('plan_based_on')}</button>
    </div>
  `;
}
function setPlanMode(mode) { planMode = mode; renderPlan(); }
function planWeekNav(n) { planFrom = addDays(mondayOf(planFrom), n); renderPlan(); }
function planMonthNav(n) { planFrom = addMonths(startOfMonth(planFrom), n); renderPlan(); }
function planToday() { planFrom = todayStr(); renderPlan(); }

let racesOpen = false;
function toggleRaces() {
  racesOpen = !racesOpen;
  $('#planRaces').style.display = racesOpen ? 'block' : 'none';
  if (racesOpen) loadRacesInline();
}
async function regenPlan() {
  if (!confirm(t('confirm_regen_plan'))) return;
  const r = await post('/plan/generate', {});
  toast(`${t('toast_plan_generated')} ${r.sessions} ${t('toast_plan_generated_suffix')} ${r.weeks} ${t('toast_plan_generated_weeks')}`);
  renderPlan();
}

// ---- Vista semana: una semana completa, día a día ----
function weekView(from) {
  const byDay = {};
  for (const s of planData.sessions) (byDay[s.date] ||= []).push(s);
  const days = Object.keys(byDay).sort();
  const min = planData.sessions.reduce((a, s) => a + (s.duration_min || 0), 0);
  const dplus = planData.sessions.reduce((a, s) => a + (s.dplus_m || 0), 0);
  const phase = planData.sessions.find(s => s.phase)?.phase || '';
  const isCurrentWeek = from === mondayOf(todayStr());
  return `
    <div class="row" style="margin-bottom:10px">
      <button onclick="planWeekNav(-7)">${t('plan_prev_week')}</button>
      ${!isCurrentWeek ? `<button onclick="planToday()">${t('plan_today')}</button>` : ''}
      <button onclick="planWeekNav(7)">${t('plan_next_week')}</button>
    </div>
    <div class="week-head">
      <div><strong>${t('plan_week_of')} ${fmtDate(from)}</strong> <span class="phase">${esc(phase)}</span></div>
      <div class="small muted">${hm(min)} · ${Math.round(dplus)} m D+</div>
    </div>
    ${days.map(d => `
      <div class="card tight">
        <div class="small muted" style="margin-bottom:4px">${fmtDateLong(d)}</div>
        ${byDay[d].map(sessionCard).join('')}
      </div>`).join('')}
  `;
}

// ---- Vista mes: calendario para ver de un vistazo descansos, tiradas, calidad... ----
function monthView(gridFrom, gridTo) {
  const byDay = {};
  for (const s of planData.sessions) (byDay[s.date] ||= []).push(s);
  const monthStart = startOfMonth(planFrom);
  const [y, m] = monthStart.split('-');
  const monthLabel = `${monthsLong()[+m - 1]} ${y}`;
  const isCurrentMonth = monthStart === startOfMonth(todayStr());

  const cells = [];
  for (let d = gridFrom; d <= gridTo; d = addDays(d, 1)) cells.push(d);

  return `
    <div class="row" style="margin-bottom:10px">
      <button onclick="planMonthNav(-1)">${t('plan_prev_month')}</button>
      ${!isCurrentMonth ? `<button onclick="planToday()">${t('plan_today')}</button>` : ''}
      <button onclick="planMonthNav(1)">${t('plan_next_month')}</button>
    </div>
    <h2 style="text-transform:capitalize">${esc(monthLabel)}</h2>
    <div class="cal-grid">
      ${daysShort().map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${cells.map(d => calDayCell(d, byDay[d] || [], d.slice(0, 7) === monthStart.slice(0, 7))).join('')}
    </div>
    <div class="cal-legend">
      ${CAL_LEGEND_KEYS.map(([type, key]) => `<span class="cal-legend-item"><span class="cal-dot" style="background:${CAL_COLOR[type]}"></span>${t(key)}</span>`).join('')}
    </div>
  `;
}
function calDayCell(d, sessions, inMonth) {
  const isToday = d === todayStr();
  const real = sessions.filter(s => s.type !== 'rest');
  const main = real.find(s => s.key) || real[0];
  const dotType = main ? main.type : (sessions.length ? 'rest' : null);
  const dot = dotType ? `<span class="cal-dot" style="background:${CAL_COLOR[dotType] || 'var(--muted)'}"></span>` : '';
  return `<div class="cal-day ${inMonth ? '' : 'dim'} ${isToday ? 'today' : ''}" onclick="openDayDetail('${d}')">
    <span class="cal-daynum">${+d.slice(8, 10)}</span>${dot}
  </div>`;
}
function openDayDetail(d) {
  const sessions = (planData?.sessions || []).filter(s => s.date === d);
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${fmtDateLong(d)}</h2>
    ${sessions.map(sessionCard).join('') || `<p class="muted">${t('plan_no_data_day')}</p>`}
  `, { center: true });
}

// =================== CARRERAS (sección dentro de Plan) ===================
async function loadRacesInline() {
  const el = $('#planRaces');
  el.innerHTML = `<div class="list-empty">${t('common_loading')}</div>`;
  const races = await get('/races');
  el.innerHTML = `
    <button class="primary" style="width:100%" onclick="raceModal()">${t('race_add')}</button>
    <div id="raceList">${races.length ? races.map(raceRow).join('') : `<div class="list-empty">${t('race_empty_state')}</div>`}</div>
  `;
  // feasibility del objetivo, si lo hay (llamada ligera por carrera)
  races.filter(r => r.target_time_h && r.type !== 'backyard').forEach(async r => {
    try {
      const { feasibility } = await get(`/races/${r.id}/estimate`);
      const el2 = document.querySelector(`[data-race="${r.id}"] .target-slot`);
      if (el2 && feasibility) el2.innerHTML = `<span class="target-badge ${feasibility.level}">${icon('target')} ${r.target_time_h} ${t('race_target_badge')}</span>`;
    } catch {}
  });
}
function raceRow(r) {
  const prio = { A: t('race_priority_a'), B: t('race_priority_b'), C: t('race_priority_c') }[r.priority] || r.priority;
  const isBY = r.type === 'backyard';
  const isStage = r.type === 'stage';
  const typeLabel = isBY ? ` · ${t('race_type_backyard')}` : isStage ? ` · ${t('race_type_stage')} (${r.n_stages || '?'})` : '';
  return `<div class="card" data-race="${r.id}">
    <div style="display:flex;justify-content:space-between;cursor:pointer" onclick="raceModal(${r.id})">
      <strong>${esc(r.name)}</strong><span class="pill">${prio}${typeLabel}</span>
    </div>
    <p class="muted small">${fmtDateLong(r.date)}${!isBY && r.est_h ? ` · ${t('race_estimate_label')} ${r.est_h.toFixed(1)} h${isStage ? ` ${t('race_estimate_total')}` : ''}` : ''}</p>
    <p class="small">${isBY
      ? `${r.dplus_m ? `${Math.round(r.dplus_m)} ${t('race_dplus_lap')}` : '?'}`
      : `${r.distance_km ? `${r.distance_km} ${t('race_km_unit')}` : '?'}${isStage ? t('race_per_stage') : ''} ${r.dplus_m ? `· ${Math.round(r.dplus_m)} ${t('race_dplus_unit')}${isStage ? t('race_per_stage') : ''}` : ''}`}
      ${r.time_limit_h ? `· ${t('race_time_limit')} ${r.time_limit_h} h` : ''}</p>
    <div class="target-slot" style="margin:4px 0">${isBY && r.target_time_h ? `<span class="target-badge">${icon('target')} ${r.target_time_h} ${t('race_target_badge')}</span>` : ''}</div>
    ${r.profile ? profileSvg(JSON.parse(r.profile)) : ''}
    <div class="row" style="margin-top:8px">
      <button onclick="raceModal(${r.id})">${t('btn_edit')}</button>
      ${!isBY && !isStage && r.target_time_h ? `<button class="primary" onclick="pacingModal(${r.id})">${t('race_pacing_plan_btn')}</button>` : ''}
    </div>
  </div>`;
}
function profileSvg(profile) {
  if (!profile || profile.length < 2) return '';
  const W = 600, H = 90;
  const xs = profile.map(p => p[0]), ys = profile.map(p => p[1]);
  const minX = 0, maxX = Math.max(...xs) || 1, minY = Math.min(...ys), maxY = Math.max(...ys) || 1;
  const pts = profile.map(([x, y]) => `${(x - minX) / (maxX - minX) * W},${H - (y - minY) / (maxY - minY || 1) * (H - 10) - 5}`).join(' ');
  return `<svg class="profile" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2"/><polygon points="0,${H} ${pts} ${W},${H}" fill="var(--accent)" opacity=".12"/></svg>`;
}

let gpxParsed = null;
let aidStationsState = [];
let raceModalType = 'ultra';
function raceModal(id) {
  gpxParsed = null;
  const editing = id ? get(`/races`).then(rs => rs.find(r => r.id === id)) : Promise.resolve(null);
  editing.then(r => {
    aidStationsState = r?.aid_stations ? JSON.parse(r.aid_stations) : [];
    raceModalType = ['backyard', 'stage'].includes(r?.type) ? r.type : 'ultra';
    const isBY = raceModalType === 'backyard';
    const isStage = raceModalType === 'stage';
    openModal(`
      <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
      <h2>${r ? t('race_edit_title') : t('race_new_title')}</h2>
      <label>${t('race_name_label')}</label><input id="r-name" value="${r ? esc(r.name) : ''}" placeholder="${t('race_name_ph')}">
      <label>${t('race_type_label')}</label>
      <div class="chip-row" id="r-type">
        <div class="chip ${!isBY && !isStage ? 'selected' : ''}" data-v="ultra" onclick="raceSetType('ultra')">${t('race_type_ultra')}</div>
        <div class="chip ${isBY ? 'selected' : ''}" data-v="backyard" onclick="raceSetType('backyard')">${t('race_type_backyard_chip')}</div>
        <div class="chip ${isStage ? 'selected' : ''}" data-v="stage" onclick="raceSetType('stage')">${t('race_type_stage_chip')}</div>
      </div>
      <label>${t('race_date_label')} ${isStage ? t('race_date_stage_suffix') : ''}</label><input id="r-date" type="date" value="${r ? r.date : ''}">
      <label>${t('race_start_time_label')}</label><input id="r-start" type="time" value="${r?.start_time || ''}">
      <div id="rf-nstages-wrap" style="display:${isStage ? '' : 'none'}">
        <label>${t('race_nstages_label')}</label><input id="r-nstages" type="number" inputmode="numeric" min="2" value="${r?.n_stages ?? ''}" placeholder="${t('race_nstages_ph')}">
      </div>
      <label>${t('race_priority_label')}</label>
      <select id="r-prio">
        <option value="A" ${r?.priority === 'A' ? 'selected' : ''}>${t('race_priority_a_opt')}</option>
        <option value="B" ${r?.priority === 'B' ? 'selected' : ''}>${t('race_priority_b_opt')}</option>
        <option value="C" ${r?.priority === 'C' ? 'selected' : ''}>${t('race_priority_c_opt')}</option>
      </select>
      <div class="row">
        <div id="rf-dist-wrap" style="display:${isBY ? 'none' : ''}"><label id="r-dist-label">${isStage ? t('race_dist_stage_label') : t('race_dist_label')}</label><input id="r-dist" type="number" inputmode="decimal" value="${r?.distance_km ?? ''}"></div>
        <div><label id="r-dplus-label">${isBY ? t('race_dplus_by_label') : isStage ? t('race_dplus_stage_label') : t('race_dplus_label')}</label><input id="r-dplus" type="number" inputmode="numeric" value="${r?.dplus_m ?? ''}"></div>
      </div>
      <label>${t('race_limit_label')}</label><input id="r-limit" type="number" inputmode="decimal" value="${r?.time_limit_h ?? ''}">
      <label>${t('race_target_label')}${isStage ? t('race_target_stage_suffix') : t('race_target_close')}</label><input id="r-target" type="number" step="0.1" inputmode="decimal" value="${r?.target_time_h ?? ''}" placeholder="${t('race_target_ph')}">
      <label>${t('race_gpx_label')}</label>
      <input id="r-gpx" type="file" accept=".gpx">
      <div id="r-gpx-preview"></div>
      <div class="divider"></div>
      <label style="margin-top:0">${t('race_aid_label')}</label>
      <div id="aidList"></div>
      <button class="ghost" onclick="addAidRow()">${icon('plus')} ${t('race_add_aid')}</button>
      <div class="divider"></div>
      <label>${t('race_notes_label')}</label><textarea id="r-notes">${r ? esc(r.notes || '') : ''}</textarea>
      <div class="row" style="margin-top:14px">
        ${r ? `<button class="danger" onclick="deleteRace(${r.id})">${t('btn_delete')}</button>` : '<span></span>'}
        <button class="primary" onclick="saveRace(${r ? r.id : 'null'})">${t('btn_save')}</button>
      </div>
    `, { center: true });
    $('#r-gpx').addEventListener('change', handleGpxFile);
    renderAidList();
  });
}
function raceSetType(tp) {
  raceModalType = tp;
  $$('#r-type .chip').forEach(c => c.classList.toggle('selected', c.dataset.v === tp));
  $('#rf-dist-wrap').style.display = tp === 'backyard' ? 'none' : '';
  $('#rf-nstages-wrap').style.display = tp === 'stage' ? '' : 'none';
  $('#r-dist-label').textContent = tp === 'stage' ? t('race_dist_stage_label') : t('race_dist_label');
  $('#r-dplus-label').textContent = tp === 'backyard' ? t('race_dplus_by_label') : tp === 'stage' ? t('race_dplus_stage_label') : t('race_dplus_label');
}
function renderAidList() {
  $('#aidList').innerHTML = aidStationsState.map((a, i) => `
    <div class="aid-row">
      <input type="text" placeholder="${t('race_aid_name_ph')}" value="${esc(a.name || '')}" onchange="aidStationsState[${i}].name=this.value">
      <input type="number" placeholder="${t('race_aid_km_ph')}" value="${a.km ?? ''}" onchange="aidStationsState[${i}].km=+this.value">
      <select onchange="aidStationsState[${i}].type=this.value">
        <option value="avituallamiento" ${a.type !== 'base_vida' ? 'selected' : ''}>${t('race_aid_type_station')}</option>
        <option value="base_vida" ${a.type === 'base_vida' ? 'selected' : ''}>${t('race_aid_type_lifebase')}</option>
      </select>
      <input type="number" placeholder="${t('race_aid_rest_ph')}" value="${a.rest_min ?? ''}" onchange="aidStationsState[${i}].rest_min=+this.value">
      <button class="ghost" onclick="aidStationsState.splice(${i},1); renderAidList()">${icon('trash')}</button>
    </div>`).join('') || `<p class="small muted">${t('race_aid_empty')}</p>`;
}
function addAidRow() { aidStationsState.push({ name: '', km: null, type: 'avituallamiento', rest_min: 5 }); renderAidList(); }

async function handleGpxFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  try {
    gpxParsed = await post('/gpx/preview', { gpx: text });
    $('#r-dist').value = gpxParsed.distance_km;
    $('#r-dplus').value = gpxParsed.dplus_m;
    $('#r-gpx-preview').innerHTML = `<div class="card tight" style="margin-top:6px">
      <p class="small">${gpxParsed.distance_km} km · ${gpxParsed.dplus_m} m D+ · ${gpxParsed.dminus_m} ${t('race_gpx_dminus_unit')}</p>
      ${profileSvg(gpxParsed.profile)}
      <p class="small muted">${gpxParsed.climbs.length} ${t('race_gpx_climbs_detected')}</p>
    </div>`;
  } catch (err) { toast(t('err_gpx_read') + ' ' + err.message); }
}
async function saveRace(id) {
  const body = {
    name: $('#r-name').value, date: $('#r-date').value, priority: $('#r-prio').value,
    type: raceModalType,
    start_time: $('#r-start').value || null,
    distance_km: raceModalType === 'backyard' ? null : ($('#r-dist').value ? +$('#r-dist').value : null),
    dplus_m: $('#r-dplus').value ? +$('#r-dplus').value : null,
    n_stages: raceModalType === 'stage' ? (+$('#r-nstages').value || null) : null,
    time_limit_h: $('#r-limit').value ? +$('#r-limit').value : null,
    target_time_h: $('#r-target').value ? +$('#r-target').value : null,
    aid_stations: aidStationsState.filter(a => a.name && a.km),
    notes: $('#r-notes').value,
  };
  if (!body.name || !body.date) { toast(t('err_race_required_fields')); return; }
  if (raceModalType === 'stage' && (!body.n_stages || body.n_stages < 2)) { toast(t('err_race_nstages_min')); return; }
  try {
    let race = id ? await patch(`/races/${id}`, body) : await post('/races', body);
    if (gpxParsed) await post(`/races/${race.id}/gpx`, { gpx: await $('#r-gpx').files[0].text() });
    closeModals();
    toast(t('toast_race_saved'));
    if (confirm(t('confirm_regen_after_race'))) await regenPlan();
    else if ($('#planRaces')) loadRacesInline();
    else if ($('#view-ajustes') && $('#view-ajustes').innerHTML.trim()) renderAjustes();
  } catch (e) { toast(t('err_prefix') + e.message); }
}
async function deleteRace(id) {
  if (!confirm(t('confirm_delete_race'))) return;
  await del(`/races/${id}`); closeModals(); toast(t('toast_race_deleted'));
  if ($('#planRaces')) loadRacesInline();
  else if ($('#view-ajustes') && $('#view-ajustes').innerHTML.trim()) renderAjustes();
}

async function pacingModal(id) {
  let plan;
  try { plan = await get(`/races/${id}/pacing`); }
  catch (e) { toast(e.message); return; }
  const feas = (await get(`/races/${id}/estimate`)).feasibility;
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${t('race_pacing_plan_title')}</h2>
    ${feas ? `<p class="small" style="color:${feas.level === 'realista' || feas.level === 'conservador' ? 'var(--accent)' : feas.level === 'optimista' ? 'var(--accent2)' : 'var(--danger)'}">${esc(feas.message)}</p>` : ''}
    <div class="stat-grid" style="margin:10px 0">
      <div class="stat"><div class="v">${plan.target_time_h}h</div><div class="l">${t('pacing_target_label')}</div></div>
      <div class="stat"><div class="v">${plan.rest_h}h</div><div class="l">${t('pacing_stops_label')}</div></div>
      <div class="stat"><div class="v">${plan.avg_pace_min_km_equiv}</div><div class="l">${t('pacing_pace_label')}</div></div>
    </div>
    ${plan.rows.map(r => `<div class="split-row">
      <div class="name">${esc(r.name)} <span class="muted small">(km ${r.km})</span></div>
      <div class="t">${r.arrival_clock ? `${r.arrival_clock} · ` : ''}${r.arrival_elapsed}${r.rest_min ? ` +${r.rest_min}min` : ''}</div>
    </div>`).join('')}
    <p class="source-note">${t('pacing_source_note')}</p>
  `, { center: true });
}

// =================== NUTRICIÓN (sección dentro de Análisis) ===================
async function loadNutritionInline() {
  const el = $('#analisisNutricion');
  el.innerHTML = `<div class="list-empty">${t('common_loading')}</div>`;
  const [logs, ins, targets] = await Promise.all([get('/nutrition'), get('/nutrition/insights'), get('/nutrition/targets').catch(() => null)]);
  el.innerHTML = `
    ${targets ? `<div class="card">
      <h2>${t('nutr_target_header')} ${targets.race_name ? esc(targets.race_name) : t('nutr_next_race_fallback')}</h2>
      <div class="stat-grid">
        <div class="stat"><div class="v">${targets.carbs_g_per_h}g</div><div class="l">${t('nutr_carbs_per_hour')}</div></div>
        <div class="stat"><div class="v">${targets.sodium_mg_per_h}</div><div class="l">${t('nutr_sodium_per_hour')}</div></div>
        <div class="stat"><div class="v">${targets.hours}h</div><div class="l">${t('nutr_duration_est')}</div></div>
      </div>
      <p class="source-note">${esc(targets.fluids_note)}</p>
    </div>` : ''}

    <div class="card">
      <h2>${t('nutr_log_header')}</h2>
      <p class="muted small">${t('nutr_log_hint')}</p>
      <div class="row">
        <div><label>${t('nutr_date_label')}</label><input id="n-date" type="date" value="${todayStr()}"></div>
        <div><label>${t('nutr_minute_label')}</label><input id="n-min" type="number" placeholder="${t('nutr_minute_ph')}"></div>
      </div>
      <label>${t('nutr_product_label')}</label><input id="n-product" placeholder="${t('nutr_product_ph')}">
      ${(K.gel_presets && K.gel_presets.length) ? `
      <label class="small muted">${t('nutr_presets_hint')}</label>
      <div class="chip-row" id="n-preset">
        ${K.gel_presets.map((g, i) => `<div class="chip" data-i="${i}">${esc(g.brand)} ${esc(g.product)}</div>`).join('')}
      </div>` : ''}
      <div class="row">
        <div><label>${t('nutr_carbs_label')}</label><input id="n-carbs" type="number"></div>
        <div><label>${t('nutr_sodium_label')}</label><input id="n-sodium" type="number"></div>
        <div><label>${t('nutr_caffeine_label')}</label><input id="n-caf" type="number"></div>
      </div>
      <label>${t('nutr_feeling_label')}</label>
      <div class="chip-row" id="n-feeling">
        <div class="chip" data-v="bien">${t('nutr_feeling_good')}</div><div class="chip" data-v="neutro">${t('nutr_feeling_neutral')}</div><div class="chip" data-v="mal">${t('nutr_feeling_bad')}</div>
      </div>
      <label><input type="checkbox" id="n-gi" style="width:auto"> ${t('nutr_gi_issue')}</label>
      <label>${t('nutr_notes_label')}</label><textarea id="n-notes" placeholder="${t('common_optional')}"></textarea>
      <button class="primary" style="width:100%;margin-top:8px" onclick="saveNutritionLog()">${t('btn_save')}</button>
    </div>

    ${ins.total_logs ? `<div class="card">
      <h2>${t('nutr_insights_header')}</h2>
      ${ins.recommended.length ? `<p class="small"><strong style="color:var(--accent)">${t('nutr_recommended_label')}</strong> ${ins.recommended.map(esc).join(', ')}</p>` : ''}
      ${ins.avoid.length ? `<p class="small"><strong style="color:var(--danger)">${t('nutr_avoid_label')}</strong> ${ins.avoid.map(esc).join(', ')}</p>` : ''}
      <table class="simple" style="margin-top:6px">
        <tr><th>${t('nutr_table_product')}</th><th>${t('nutr_table_times')}</th><th>${t('nutr_table_rating')}</th></tr>
        ${ins.products.map(p => `<tr><td>${esc(p.product)}</td><td>${p.n}</td>
          <td class="feeling-${p.avg_score > 0.3 ? 'bien' : p.avg_score < -0.2 ? 'mal' : 'neutro'}">${p.avg_score > 0.3 ? t('nutr_rating_good') : p.avg_score < -0.2 ? t('nutr_rating_bad') : t('nutr_rating_neutral')}${p.gi_issues ? ` · ${t('nutr_gi_suffix')}` : ''}</td></tr>`).join('')}
      </table>
    </div>` : ''}

    <div class="card">
      <h2>${t('nutr_history_header')}</h2>
      ${logs.length ? logs.map(l => `<div class="nutri-row">
        <div><strong>${esc(l.product)}</strong> <span class="muted small">· ${fmtDate(l.date)}${l.minute_mark ? ` · min ${l.minute_mark}` : ''}</span>
          ${l.notes ? `<div class="small muted">${esc(l.notes)}</div>` : ''}</div>
        <div style="text-align:right">
          <div class="feeling-${l.feeling || 'neutro'} small">${l.feeling || ''}${l.gi_issue ? ' · GI' : ''}</div>
          <button class="ghost" onclick="delNutritionLog(${l.id})">${icon('trash')}</button>
        </div>
      </div>`).join('') : `<p class="list-empty">${t('nutr_no_logs')}</p>`}
    </div>

    <div class="card">
      <h3>${t('nutr_guide_header')}</h3>
      <p class="small">${esc(NUTRITION_TEXT.carbs)}</p>
      <p class="small">${esc(NUTRITION_TEXT.sodium)}</p>
      <p class="small">${esc(NUTRITION_TEXT.gut)}</p>
      <p class="source-note">${t('nutr_sources_note')}</p>
    </div>
  `;
}
let NUTRITION_TEXT = { carbs: '', sodium: '', gut: '' };
let K = { method: null, zones: [], gel_presets: [] }; // caché de /knowledge para toda la app
async function loadKnowledge() {
  try {
    const k = await get('/knowledge');
    NUTRITION_TEXT = { carbs: k.nutrition.carbs.summary, sodium: k.nutrition.sodium.summary, gut: k.nutrition.gut_training.summary };
    window.__STRENGTH_LIB = k.strength_library;
    K = k;
  } catch {}
}

// ---------------- Explicaciones (métricas, zonas, metodología) ----------------
function metricModal(which) {
  const keys = { forma: ['metric_ctl_title', 'metric_ctl_body'], fatiga: ['metric_atl_title', 'metric_atl_body'], fresco: ['metric_tsb_title', 'metric_tsb_body'] }[which];
  openModal(`<button class="ghost close-x" onclick="closeModals()">${icon('x')}</button><h2>${t(keys[0])}</h2><p>${t(keys[1])}</p>
    <p class="source-note">${t('metric_source_note')}</p>`, { center: true });
}
function methodModal() {
  const m = K.method;
  if (!m) return;
  openModal(`<button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${t('method_modal_title')}</h2>
    <p class="muted small">${esc(m.overview)}</p>
    ${m.items.map(it => `<div class="divider"></div><h3 style="text-transform:none;color:var(--text);font-size:.95rem">${esc(it.title)}</h3>
      <p class="small">${esc(it.text)}</p><p class="source-note">${esc(it.source)}</p>`).join('')}
  `, { center: true });
}
function zoneModal(zoneCode) {
  const zones = K.zones && K.zones.length ? K.zones : [];
  const rows = zoneCode ? zones.filter(z => zoneCode.split('-').includes(z.zone)) : zones;
  openModal(`<button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${t('zone_modal_title')}</h2>
    <p class="muted small">${t('zone_modal_hint')}</p>
    ${rows.map(z => `<div class="zone-row">
      <div class="z-badge" style="background:${ZCOLOR[z.zone]}">${z.zone}</div>
      <div class="z-info"><strong>${esc(z.name)}</strong><span class="small muted">${z.bpm[0]}–${z.bpm[1]} ppm</span><p class="small">${esc(z.text)}</p></div>
    </div>`).join('')}
  `, { center: true });
}
async function saveNutritionLog() {
  const feelChip = $('#n-feeling .chip.selected');
  await post('/nutrition', {
    date: $('#n-date').value, minute_mark: +$('#n-min').value || null, product: $('#n-product').value,
    carbs_g: +$('#n-carbs').value || null, sodium_mg: +$('#n-sodium').value || null, caffeine_mg: +$('#n-caf').value || null,
    feeling: feelChip ? feelChip.dataset.v : null, gi_issue: $('#n-gi').checked, notes: $('#n-notes').value,
  });
  toast(t('toast_nutrition_logged')); loadNutritionInline();
}
document.addEventListener('click', e => { const c = e.target.closest?.('#n-feeling .chip'); if (c) { $$('#n-feeling .chip').forEach(x => x.classList.remove('selected')); c.classList.add('selected'); } });
document.addEventListener('click', e => {
  const c = e.target.closest?.('#n-preset .chip');
  if (!c) return;
  $$('#n-preset .chip').forEach(x => x.classList.remove('selected')); c.classList.add('selected');
  const g = K.gel_presets[+c.dataset.i]; if (!g) return;
  $('#n-product').value = `${g.brand} ${g.product}`;
  $('#n-carbs').value = g.carbs_g ?? ''; $('#n-sodium').value = g.sodium_mg ?? ''; $('#n-caf').value = g.caffeine_mg ?? '';
});
async function delNutritionLog(id) { await del(`/nutrition/${id}`); loadNutritionInline(); }

// =================== HISTORIAL ===================
async function renderHistorial() {
  const el = $('#view-historial');
  el.innerHTML = `<div class="list-empty">${t('common_loading')}</div>`;
  const [past, strava] = await Promise.all([get('/past-races'), get('/strava/status')]);
  el.innerHTML = `
    <h1>${t('nav_historial')}</h1>
    <div class="card">
      <h2>${t('hist_strava_header')}</h2>
      ${!strava.configured ? `<p class="muted small">${t('hist_strava_not_configured')}</p>` :
      strava.connected ? `
        <p class="small">${t('hist_strava_connected_as')} <strong>${esc(strava.athlete || '')}</strong></p>
        <div class="row">
          <button onclick="stravaSync(false)">${t('hist_strava_sync')}</button>
          <button class="danger" onclick="stravaDisconnect()">${t('hist_strava_disconnect')}</button>
        </div>` : `<button class="primary" style="width:100%" onclick="stravaConnect()">${t('hist_strava_connect')}</button>`}
      <p class="small muted" style="margin-top:10px">
        ${t('hist_strava_watch_hint')}
      </p>
    </div>
    <div class="card tight" style="cursor:pointer" onclick="togglePastRaces()">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${t('hist_past_races_label')}${strava.connected ? ` <span class="small muted">(${past.length})</span>` : ''}</strong>
        ${icon('flag')}
      </div>
    </div>
    <div id="pastRacesBox" style="display:${strava.connected ? 'none' : 'block'}">
      <div class="card">
        <p class="muted small">${t('hist_past_races_hint')}</p>
        <button style="width:100%" onclick="pastRaceModal()">${t('hist_add_past_race')}</button>
        ${past.length ? `<table class="simple" style="margin-top:8px">
          <tr><th>${t('hist_table_race')}</th><th>${t('hist_table_date')}</th><th>${t('hist_table_km')}</th><th>${t('hist_table_dplus')}</th><th>${t('hist_table_time')}</th><th></th></tr>
          ${past.map(p => `<tr>
            <td>${esc(p.name)}</td><td>${fmtDate(p.date)}</td><td>${p.distance_km ?? '-'}</td>
            <td>${p.dplus_m ? Math.round(p.dplus_m) : '-'}</td><td>${p.time_min ? hm(p.time_min) : '-'}</td>
            <td><button class="ghost" onclick="delPastRace(${p.id})">${icon('trash')}</button></td>
          </tr>`).join('')}
        </table>` : `<p class="list-empty">${t('hist_no_past_races')}</p>`}
      </div>
    </div>
    <div class="card">
      <h2>${t('hist_recent_activities_header')}</h2>
      <div id="recentActs" class="small muted">${t('common_loading')}</div>
    </div>
  `;
  get('/activities?' + new URLSearchParams({ from: addDays(todayStr(), -30), to: todayStr() }))
    .then(acts => {
      $('#recentActs').innerHTML = acts.length ? acts.slice(0, 20).map(a => {
        const km = a.distance_m ? a.distance_m / 1000 : 0;
        const paceMinKm = km > 0.3 && a.moving_time_s ? (a.moving_time_s / 60 / km) : null;
        return `<div class="session" style="padding:10px 0">
          <div class="head"><div><strong class="stype">${icon(TYPE_ICON[a.sport_type?.toLowerCase()] || 'wave')} ${esc(a.name || a.sport_type)}</strong></div>
          <div class="small muted">${fmtDate(a.date)}</div></div>
          <div class="meta">
            ${km ? `<span>${km.toFixed(1)} km</span>` : ''}
            ${a.elevation_gain_m ? `<span>${Math.round(a.elevation_gain_m)} m D+</span>` : ''}
            ${a.moving_time_s ? `<span>${hm(Math.round(a.moving_time_s / 60))}</span>` : ''}
            ${paceMinKm ? `<span>${paceMinKm.toFixed(1)} ${t('unit_min_per_km')}</span>` : ''}
            ${a.avg_hr ? `<span>${Math.round(a.avg_hr)} ${t('unit_ppm_avg')}</span>` : ''}
            ${a.max_hr ? `<span>${Math.round(a.max_hr)} ${t('unit_ppm_max')}</span>` : ''}
            <span>${Math.round(a.load || 0)} ${t('hist_load_label')}</span>
          </div>
        </div>`;
      }).join('') : `<p>${t('hist_no_activities')}</p>`;
    });
}
function togglePastRaces() { const b = $('#pastRacesBox'); b.style.display = b.style.display === 'none' ? 'block' : 'none'; }
async function stravaConnect() { const { url } = await get('/strava/connect'); window.open(url, '_blank'); }
async function stravaSync(full) {
  toast(t('toast_syncing'));
  const r = await post('/strava/sync', { full });
  toast(`${r.imported} ${t('toast_activities_imported')}`);
  renderHistorial();
  if (r.plan_changes && r.plan_changes.length) toast(`${t('toast_plan_adapted')} ${r.plan_changes.length} ${t('toast_plan_adapted_suffix')}`);
  if (r.unlogged_nutrition && r.unlogged_nutrition.length) postSyncNutritionPrompt(r.unlogged_nutrition);
}
// Tras sincronizar, pregunta qué se tomó en las actividades nuevas relevantes (>15 min) sin registro todavía.
function postSyncNutritionPrompt(items) {
  let i = 0;
  const askNext = () => {
    if (i >= items.length) { closeModals(); return; }
    const a = items[i];
    openModal(`
      <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
      <h2>${t('nutr_post_sync_title')} "${esc(a.name)}"?</h2>
      <p class="muted small">${fmtDate(a.date)} · ${hm(Math.round((a.moving_time_s || 0) / 60))}</p>
      ${(K.gel_presets && K.gel_presets.length) ? `
      <div class="chip-row" id="psn-preset">
        ${K.gel_presets.map((g, gi) => `<div class="chip" data-i="${gi}">${esc(g.brand)} ${esc(g.product)}</div>`).join('')}
      </div>` : ''}
      <label>${t('nutr_product_label')}</label><input id="psn-product" placeholder="${t('nutr_product_ph')}">
      <div class="row">
        <div><label>${t('nutr_carbs_label')}</label><input id="psn-carbs" type="number"></div>
        <div><label>${t('nutr_sodium_label')}</label><input id="psn-sodium" type="number"></div>
      </div>
      <label>${t('nutr_feeling_label')}</label>
      <div class="chip-row" id="psn-feeling"><div class="chip" data-v="bien">${t('nutr_feeling_good')}</div><div class="chip" data-v="neutro">${t('nutr_feeling_neutral')}</div><div class="chip" data-v="mal">${t('nutr_feeling_bad')}</div></div>
      <div class="row" style="margin-top:12px">
        <button onclick="_postSyncSkip()">${t('nutr_post_sync_skip')}</button>
        <button class="primary" onclick="_postSyncSave()">${t('btn_save')}</button>
      </div>
    `, { center: true });
    $$('#psn-preset .chip').forEach(c => c.addEventListener('click', () => {
      const g = K.gel_presets[+c.dataset.i];
      $('#psn-product').value = `${g.brand} ${g.product}`; $('#psn-carbs').value = g.carbs_g ?? ''; $('#psn-sodium').value = g.sodium_mg ?? '';
    }));
  };
  window._postSyncSkip = () => { i++; askNext(); };
  window._postSyncSave = async () => {
    const a = items[i];
    const feelChip = $('#psn-feeling .chip.selected');
    if ($('#psn-product').value) {
      await post('/nutrition', {
        date: a.date, product: $('#psn-product').value, carbs_g: +$('#psn-carbs').value || null,
        sodium_mg: +$('#psn-sodium').value || null, feeling: feelChip ? feelChip.dataset.v : null,
      });
    }
    i++; askNext();
  };
  askNext();
}
async function stravaDisconnect() { if (!confirm(t('confirm_disconnect_strava'))) return; await post('/strava/disconnect'); renderHistorial(); }
function pastRaceModal() {
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${t('hist_past_race_modal_title')}</h2>
    <label>${t('hist_past_race_name')}</label><input id="p-name">
    <label>${t('hist_past_race_date')}</label><input id="p-date" type="date">
    <div class="row"><div><label>${t('hist_past_race_km')}</label><input id="p-dist" type="number"></div><div><label>${t('hist_past_race_dplus')}</label><input id="p-dplus" type="number"></div></div>
    <label>${t('hist_past_race_time')}</label><input id="p-time" type="number" placeholder="${t('hist_past_race_time_ph')}">
    <label>${t('hist_past_race_notes')}</label><input id="p-pos">
    <button class="primary" style="width:100%;margin-top:10px" onclick="savePastRace()">${t('btn_save')}</button>
  `, { center: true });
}
async function savePastRace() {
  await post('/past-races', {
    name: $('#p-name').value, date: $('#p-date').value, distance_km: +$('#p-dist').value || null,
    dplus_m: +$('#p-dplus').value || null, time_min: +$('#p-time').value || null, position: $('#p-pos').value,
  });
  closeModals(); toast(t('toast_saved')); renderHistorial();
}
async function delPastRace(id) { if (!confirm(t('confirm_delete_generic'))) return; await del(`/past-races/${id}`); renderHistorial(); }

// =================== ANÁLISIS ===================
async function renderAnalisis() {
  const el = $('#view-analisis');
  el.innerHTML = `<div class="list-empty">${t('common_loading')}</div>`;
  const from = addDays(todayStr(), -120), to = addDays(todayStr(), 21);
  const [series, vo2] = await Promise.all([get(`/fitness?from=${from}&to=${to}`), get('/vo2max').catch(() => null)]);
  const todaySeries = series.find(s => s.date === todayStr()) || series[series.length - 1];
  el.innerHTML = `<h1>${t('nav_analisis')}</h1>
    <div class="card">
      ${todaySeries ? `<div class="stat-grid tight" style="margin-bottom:6px">
        <div class="stat" style="cursor:pointer" onclick="metricModal('forma')"><div class="v">${todaySeries.ctl}</div><div class="l">${t('metric_form')}</div></div>
        <div class="stat" style="cursor:pointer" onclick="metricModal('fatiga')"><div class="v">${todaySeries.atl}</div><div class="l">${t('metric_fatigue')}</div></div>
        <div class="stat" style="cursor:pointer" onclick="metricModal('fresco')"><div class="v">${todaySeries.tsb > 0 ? '+' : ''}${todaySeries.tsb}</div><div class="l">${t('metric_freshness')}</div></div>
      </div>` : ''}
      ${fitnessChart(series)}
    </div>
    <div class="card">
      <h3>${t('analisis_how_to_read')}</h3>
      <p class="small muted">${t('analisis_explanation')}</p>
    </div>
    ${vo2 && vo2.vo2max ? `
    <div class="card">
      <h3>${t('analisis_vo2_header')}</h3>
      <div class="stat-grid tight" style="margin:8px 0">
        <div class="stat"><div class="v">${vo2.vo2max}</div><div class="l">${t('analisis_vo2_unit')}</div></div>
      </div>
      <p class="small muted">${t('analisis_vo2_source_text')} "${esc(vo2.source.name)}" (${fmtDate(vo2.source.date)}), ${vo2.source.distance_km} km · ${hm(vo2.source.duration_min)} (${vo2.source.pace_min_km} ${t('unit_min_per_km')}).</p>
      <p class="source-note">${t('analisis_vo2_source_note')}</p>
    </div>` : ''}
    <h2 style="margin-top:18px">${t('analisis_nutrition_header')}</h2>
    <div id="analisisNutricion"></div>`;
  loadNutritionInline();
}
function fitnessChart(series) {
  if (!series.length) return '<p class="muted">Sin datos aún.</p>';
  const W = 600, H = 220, pad = 24;
  const maxV = Math.max(...series.map(s => s.ctl), 10) * 1.15;
  const minTsb = Math.min(...series.map(s => s.tsb), 0), maxTsb = Math.max(...series.map(s => s.tsb), 10);
  const x = i => pad + i / (series.length - 1) * (W - pad * 2);
  const yV = v => H - pad - (v / maxV) * (H - pad * 2);
  const yT = v => H - pad - (v - minTsb) / (maxTsb - minTsb || 1) * (H - pad * 2);
  const line = (fn, key) => series.map((s, i) => `${x(i)},${fn(s[key])}`).join(' ');
  const todayIdx = series.findIndex(s => s.date === todayStr());
  return `<svg class="profile" style="height:220px" viewBox="0 0 ${W} ${H}">
    <polyline points="${line(yT, 'tsb')}" fill="none" stroke="var(--accent2)" stroke-width="1.5" opacity=".7"/>
    <polyline points="${line(yV, 'atl')}" fill="none" stroke="var(--danger)" stroke-width="1.5" opacity=".8"/>
    <polyline points="${line(yV, 'ctl')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    ${todayIdx >= 0 ? `<line x1="${x(todayIdx)}" y1="0" x2="${x(todayIdx)}" y2="${H}" stroke="#ffffff33" stroke-dasharray="4,4"/>` : ''}
  </svg>
  <div class="row small" style="justify-content:center;gap:16px">
    <span style="color:var(--accent)">● ${t('metric_form')}</span><span style="color:var(--danger)">● ${t('metric_fatigue')}</span><span style="color:var(--accent2)">● ${t('metric_freshness')}</span>
  </div>`;
}

// =================== AJUSTES ===================
async function renderAjustes() {
  const el = $('#view-ajustes');
  const [s, k, me, races] = await Promise.all([get('/settings'), get('/knowledge'), get('/me'), get('/races')]);
  const mainRace = races.find(r => r.priority === 'A') || races[0] || null;
  const lib = k.strength_library;
  const theme = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const initials = (s.athlete_name || me.email || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
  el.innerHTML = `
    <h1>${t('settings_title')}</h1>
    <div class="card">
      <div class="profile-head">
        <div class="avatar-circle" id="avatarCircle" onclick="pickAvatar()" title="${t('settings_upload_photo')}"
          ${me.avatar ? `style="background-image:url('${me.avatar}')"` : ''}>${me.avatar ? '' : esc(initials)}
          <span class="avatar-edit-dot">${icon('edit')}</span>
        </div>
        <input type="file" id="avatarFile" accept="image/*" style="display:none" onchange="onAvatarFile(this)">
        <div style="flex:1"><label>${t('auth_name')}</label><input id="s-name" value="${esc(s.athlete_name || '')}" placeholder="${t('settings_your_name')}"></div>
      </div>
      <p class="small muted" style="margin-top:4px">${t('settings_upload_photo')}${me.avatar ? ` · <span style="text-decoration:underline;cursor:pointer" onclick="removeAvatar()">${t('settings_remove_photo')}</span>` : ''}.</p>
      <div class="row" style="margin-top:12px;align-items:center">
        <span class="small muted" style="flex:1">${t('settings_theme')}</span>
        <div class="theme-toggle">
          <button type="button" class="${theme === 'dark' ? 'active' : ''}" onclick="setTheme('dark')">${icon('moon')} ${t('settings_night')}</button>
          <button type="button" class="${theme === 'light' ? 'active' : ''}" onclick="setTheme('light')">${icon('sun')} ${t('settings_day')}</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>${t('settings_language')}</h2>
      <p class="muted small">${t('settings_language_hint')}</p>
      <div class="chip-row" id="s-lang">
        ${Object.keys(I18N).map(code => `<div class="chip ${currentLang === code ? 'selected' : ''}" data-v="${code}" onclick="changeLanguage('${code}')">${I18N[code].lang_name}</div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h2>${t('settings_race_objective')}</h2>
      ${mainRace ? `
        <p class="small muted">${esc(mainRace.name)} · ${fmtDateLong(mainRace.date)}${mainRace.type === 'backyard' ? ` · ${t('race_type_backyard_chip')}` : mainRace.type === 'stage' ? ` · ${t('race_type_stage')}` : ''}</p>
        <p class="small">${mainRace.type === 'backyard'
          ? [mainRace.dplus_m ? `${Math.round(mainRace.dplus_m)} ${t('race_dplus_lap')}` : '', mainRace.target_time_h ? `${t('hoy_race_target')} ${mainRace.target_time_h} h` : ''].filter(Boolean).join(' · ')
          : [mainRace.distance_km ? `${mainRace.distance_km} ${t('race_km_unit')}` : '', mainRace.dplus_m ? `${Math.round(mainRace.dplus_m)} ${t('race_dplus_unit')}` : '', mainRace.target_time_h ? `${t('hoy_race_target')} ${mainRace.target_time_h} h` : ''].filter(Boolean).join(' · ')}</p>
        <button style="width:100%;margin-top:8px" onclick="raceModal(${mainRace.id})">${t('settings_change_objective')}</button>
      ` : `
        <p class="small muted">${t('settings_no_objective')}</p>
        <button class="primary" style="width:100%" onclick="raceModal()">${t('settings_add_objective')}</button>
      `}
    </div>
    <div class="card">
      <h2>${t('settings_availability')}</h2>
      <p class="muted small">${t('settings_availability_hint')}</p>
      <div id="availBlock-ajustes">${(() => { AvailUI.init('ajustes', s.availability_windows || s.availability); return AvailUI.render('ajustes'); })()}</div>
      <label style="margin-top:10px">${t('settings_max_hours')}</label><input id="s-maxh" type="number" inputmode="numeric" value="${s.max_week_hours}">
    </div>
    <div class="card">
      <label>${t('settings_long_day')}</label>
      <select id="s-longday">${daysLong().map((d, i) => `<option value="${i}" ${i === s.long_day ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <label>${t('settings_b2b_day')}</label>
      <select id="s-b2bday">${daysLong().map((d, i) => `<option value="${i}" ${i === s.b2b_day ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <label><input type="checkbox" id="s-strength" ${s.strength ? 'checked' : ''} style="width:auto"> ${t('settings_include_strength')}</label>
      <label><input type="checkbox" id="s-poles" ${s.poles ? 'checked' : ''} style="width:auto"> ${t('settings_use_poles')}</label>
    </div>
    <div class="card">
      <h2>${t('settings_strength_how')}</h2>
      <p class="muted small">${esc(k.strength.summary)}</p>
      <div class="chip-row" id="s-strengthmode">
        ${Object.entries(lib).map(([key, v]) => `<div class="chip ${s.strength_mode === key ? 'selected' : ''}" data-v="${key}">${esc(v.label)}</div>`).join('')}
      </div>
      <p class="source-note">${t('settings_source')}: ${esc(k.strength.source)}</p>
    </div>
    <div class="card">
      <h2>${t('settings_hr_weight')}</h2>
      <div class="row"><div><label>${t('settings_hr_max')}</label><input id="s-hrmax" type="number" inputmode="numeric" pattern="[0-9]*" value="${s.hr_max}"></div>
      <div><label>${t('settings_hr_rest')}</label><input id="s-hrrest" type="number" inputmode="numeric" pattern="[0-9]*" value="${s.hr_rest}"></div></div>
      <label>${t('settings_weight')}</label><input id="s-weight" type="number" inputmode="decimal" pattern="[0-9]*" value="${s.weight_kg || 70}">
    </div>
    <div class="card">
      <h2>${t('settings_injuries')}</h2>
      <p class="muted small">${t('settings_injuries_hint')}</p>
      <textarea id="s-injuries" rows="3" placeholder="${t('settings_injuries_ph')}">${esc(s.injury_history || '')}</textarea>
    </div>
    <button class="primary" style="width:100%" onclick="saveSettings()">${t('settings_save')}</button>
    <div class="card" style="margin-top:20px">
      <h2>${t('settings_account')}</h2>
      <p class="small muted">${t('settings_connected_as')} <strong>${esc(me.email)}</strong></p>
      ${billingCardHtml(me.billing)}
      <button class="danger" style="width:100%;margin-top:6px" onclick="logout()">${t('settings_logout')}</button>
      <button class="ghost" style="width:100%;margin-top:8px;color:var(--danger)" onclick="deleteAccountModal()">${t('settings_delete_account')}</button>
    </div>
    <p class="small muted" style="text-align:center;margin-top:14px">
      ${t('settings_footer_text')}
      <a href="/terms.html" target="_blank">${t('settings_terms')}</a> · <a href="/privacy.html" target="_blank">${t('settings_privacy')}</a>
    </p>
  `;
  $$('#s-strengthmode .chip').forEach(c => c.addEventListener('click', () => {
    $$('#s-strengthmode .chip').forEach(x => x.classList.remove('selected')); c.classList.add('selected');
  }));
}
async function changeLanguage(code) {
  if (code === currentLang) return;
  try { await put('/settings', { language: code }); } catch (e) { toast(t('err_prefix') + e.message); return; }
  setLang(code);
  applyStaticI18n();
  relabelTabbar();
  render(currentTab);
}
function deleteAccountModal() {
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${t('settings_delete_account_title')}</h2>
    <p class="small muted">${t('settings_delete_account_warning')}</p>
    <label>${t('settings_delete_account_confirm_label')}</label>
    <input id="delAccPass" type="password" autocomplete="current-password">
    <p id="delAccErr" class="small" style="color:var(--danger)"></p>
    <div class="row" style="margin-top:12px">
      <button onclick="closeModals()">${t('btn_cancel')}</button>
      <button class="danger" onclick="confirmDeleteAccount()">${t('settings_delete_account_confirm_btn')}</button>
    </div>
  `, { center: true });
}
async function confirmDeleteAccount() {
  const password = $('#delAccPass').value;
  $('#delAccErr').textContent = '';
  try {
    await api('/account', { method: 'DELETE', body: JSON.stringify({ password }) });
    closeModals();
    Auth.token = null; localStorage.removeItem('tc_token');
    showLogin();
    toast(t('toast_account_deleted'));
  } catch (e) { $('#delAccErr').textContent = e.message || t('err_generic'); }
}
// ---------------- Soporte ----------------
function supportModal() {
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${icon('help')} ${t('support_title')}</h2>
    <p class="small muted">${t('support_hint')}</p>
    <textarea id="support-msg" rows="5" placeholder="${t('support_placeholder')}"></textarea>
    <p id="support-err" class="small" style="color:var(--danger)"></p>
    <button class="primary" style="width:100%;margin-top:10px" onclick="sendSupportMessage()">${t('btn_send')}</button>
  `, { center: true });
}
async function sendSupportMessage() {
  const message = $('#support-msg').value.trim();
  $('#support-err').textContent = '';
  if (!message) { $('#support-err').textContent = t('err_support_empty'); return; }
  const btn = event.target; btn.disabled = true; btn.textContent = t('common_sending');
  try {
    await post('/support', { message });
    closeModals();
    toast(t('toast_support_sent'));
  } catch (e) { $('#support-err').textContent = e.message || t('err_support_send'); btn.disabled = false; btn.textContent = t('btn_send'); }
}
// ---------------- Suscripción (Stripe) ----------------
function billingCardHtml(b) {
  if (!b || !b.configured) return '';
  const isActive = b.status === 'active';
  let statusLabel, statusText;
  if (b.status === 'trialing') { statusLabel = null; statusText = `${t('billing_trial_days_left')} <strong>${b.trialDaysLeft}</strong> ${t('billing_trial_days_suffix')}`; }
  else if (isActive) { statusLabel = t('billing_status_active'); statusText = `${t('billing_plan_suffix')} ${b.plan === 'yearly' ? t('billing_plan_yearly') : t('billing_plan_monthly')}.`; }
  else if (b.status === 'past_due') { statusLabel = t('billing_status_past_due'); statusText = t('billing_past_due_text'); }
  else { statusLabel = t('billing_status_inactive'); statusText = t('billing_inactive_text'); }
  const actions = b.status === 'trialing' || !['active', 'past_due'].includes(b.status)
    ? `<div class="row" style="margin-top:8px">
         <button class="primary" style="width:100%" onclick="Billing.checkout('monthly')">${t('billing_subscribe_monthly')}</button>
       </div>
       <button class="ghost" style="width:100%;margin-top:6px" onclick="Billing.checkout('yearly')">${t('billing_subscribe_yearly')}</button>`
    : `<button style="width:100%;margin-top:6px" onclick="Billing.portal()">${t('billing_manage_payment')}</button>
       ${isActive ? `<button class="ghost" style="width:100%;margin-top:6px;color:var(--danger)" onclick="Billing.cancelConfirm('${b.plan === 'yearly' ? t('billing_plan_yearly') : t('billing_plan_monthly')}')">${t('billing_cancel_subscription')}</button>` : ''}`;
  return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
    <p class="small muted">${statusLabel ? `<span class="pill ${isActive ? 'done' : b.status === 'past_due' ? 'partial' : 'missed'}" style="margin-right:6px">${statusLabel}</span>` : ''}${statusText}</p>
    ${actions}
  </div>`;
}
const Billing = {
  async checkout(plan) {
    try { const { url } = await post('/billing/checkout', { plan }); location.href = url; }
    catch (e) { toast(t('err_prefix') + e.message); }
  },
  async portal() {
    try { const { url } = await post('/billing/portal', {}); location.href = url; }
    catch (e) { toast(t('err_prefix') + e.message); }
  },
  cancelConfirm(planLabel) {
    openModal(`
      <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
      <h2>${t('billing_cancel_title')}</h2>
      <p class="small muted">${t('billing_cancel_warning').replace('{plan}', planLabel)}</p>
      <div class="row" style="margin-top:14px">
        <button onclick="closeModals()">${t('billing_keep_subscription')}</button>
        <button class="danger" onclick="Billing.cancel()">${t('billing_confirm_cancel')}</button>
      </div>
    `, { center: true });
  },
  async cancel() {
    try {
      await post('/billing/cancel', {});
      closeModals();
      toast(t('toast_subscription_cancelled'));
      render(currentTab);
    } catch (e) { toast(t('err_prefix') + e.message); }
  },
};
function paywallHtml(b) {
  const days = b?.trialDaysLeft || 0;
  return `
    <div class="card" style="max-width:420px;margin:40px auto;text-align:center">
      <h2>${t('paywall_title')}</h2>
      <p class="small muted">${t('paywall_hint')}</p>
      <div class="row" style="margin-top:16px">
        <button class="primary" style="width:100%" onclick="Billing.checkout('monthly')">${t('billing_subscribe_monthly')}</button>
      </div>
      <button class="ghost" style="width:100%;margin-top:8px" onclick="Billing.checkout('yearly')">${t('billing_subscribe_yearly')}</button>
      <button class="ghost" style="width:100%;margin-top:16px" onclick="supportModal()">${icon('help')} ${t('paywall_contact_support')}</button>
      <button class="ghost" style="width:100%;margin-top:6px;color:var(--danger)" onclick="deleteAccountModal()">${t('settings_delete_account')}</button>
      <button class="ghost" style="width:100%;margin-top:6px" onclick="logout()">${t('settings_logout')}</button>
    </div>`;
}
function showPaywall(b) {
  $('#login').style.display = 'none'; $('#onboarding').style.display = 'none'; $('#app').style.display = 'block';
  $('#app').innerHTML = paywallHtml(b);
}
async function saveSettings() {
  const availability = AvailUI.minutes('ajustes');
  const availability_windows = AvailUI.windows('ajustes');
  const modeChip = $('#s-strengthmode .chip.selected');
  await put('/settings', {
    athlete_name: $('#s-name').value, availability, availability_windows, max_week_hours: +$('#s-maxh').value, long_day: +$('#s-longday').value, b2b_day: +$('#s-b2bday').value,
    strength: $('#s-strength').checked, strength_mode: modeChip ? modeChip.dataset.v : 'gym', poles: $('#s-poles').checked,
    hr_max: +$('#s-hrmax').value, hr_rest: +$('#s-hrrest').value, weight_kg: +$('#s-weight').value || 70,
    injury_history: $('#s-injuries').value.trim(),
  });
  toast(t('toast_settings_saved'));
  if (confirm(t('confirm_regen_after_settings'))) await regenPlan();
}
function logout() { localStorage.removeItem('tc_token'); Auth.token = null; showLogin(); }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('tc_theme', t); } catch {}
  if (currentTab === 'ajustes') renderAjustes();
}
// ---------------- Foto de perfil ----------------
function pickAvatar() { $('#avatarFile').click(); }
async function onAvatarFile(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast(t('err_choose_image')); return; }
  try {
    const dataUrl = await resizeImageFile(file, 300);
    await put('/avatar', { data: dataUrl });
    toast(t('toast_photo_updated'));
    updateProfileBtn(dataUrl);
    renderAjustes();
  } catch (e) { toast(t('err_prefix') + e.message); }
}
async function removeAvatar() {
  if (!confirm(t('confirm_remove_photo'))) return;
  await put('/avatar', { data: null });
  updateProfileBtn(null);
  renderAjustes();
}
// Redimensiona y recorta la imagen a un cuadrado (cover) de `size`x`size` px en JPEG,
// para que el payload sea pequeño sin depender de librerías externas.
function resizeImageFile(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(t('err_image_read')));
    reader.onload = () => {
      img.onerror = () => reject(new Error(t('err_image_invalid')));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------------- Onboarding (tras registrarte: datos + objetivo) ----------------
const Onboarding = {
  step: 0,
  data: {
    name: '', last_name: '', birth_date: '', weight_kg: '', height_cm: '',
    availability: [0, 75, 75, 90, 60, 240, 150], availability_windows: null, max_week_hours: 14,
    race_type: 'ultra', race_name: '', race_date: '', race_distance_km: '', race_dplus_m: '', race_target_h: '',
  },
  start(name) {
    this.step = 0;
    this.data.name = name || '';
    $('#login').style.display = 'none'; $('#app').style.display = 'none'; $('#onboarding').style.display = 'flex';
    this.render();
  },
  steps: ['perfil', 'disponibilidad', 'objetivo'],
  render() {
    const n = this.steps.length;
    $('#onbProgress').innerHTML = this.steps.map((_, i) =>
      `<div class="dot ${i === this.step ? 'active' : i < this.step ? 'done' : ''}"></div>`).join('');
    const fns = { perfil: this.renderPerfil, disponibilidad: this.renderDisponibilidad, objetivo: this.renderObjetivo };
    $('#onbContent').innerHTML = fns[this.steps[this.step]].call(this);
  },
  renderPerfil() {
    const d = this.data;
    return `
      <div class="onb-step">
        <h2>${t('onb_perfil_title')}</h2>
        <p class="muted small onb-sub">${t('onb_perfil_hint')}</p>
        <label>${t('onb_name_label')}</label><input id="onb-name" value="${esc(d.name)}">
        <label>${t('onb_lastname_label')}</label><input id="onb-lastname" value="${esc(d.last_name)}">
        <label>${t('onb_birthdate_label')}</label><input id="onb-birth" type="date" value="${d.birth_date || ''}">
        <div class="row">
          <div><label>${t('onb_weight_label')}</label><input id="onb-weight" type="number" inputmode="decimal" pattern="[0-9]*" value="${d.weight_kg}"></div>
          <div><label>${t('onb_height_label')}</label><input id="onb-height" type="number" inputmode="numeric" pattern="[0-9]*" value="${d.height_cm}"></div>
        </div>
      </div>
      <div class="onb-actions"><button class="primary" style="width:100%" onclick="Onboarding.next()">${t('onb_next')}</button></div>
    `;
  },
  renderDisponibilidad() {
    const d = this.data;
    AvailUI.init('onb', d.availability_windows || d.availability);
    return `
      <div class="onb-step">
        <h2>${t('onb_disponibilidad_title')}</h2>
        <p class="muted small onb-sub">${t('onb_disponibilidad_hint')}</p>
        <div id="availBlock-onb">${AvailUI.render('onb')}</div>
        <label style="margin-top:10px">${t('onb_maxhours_label')}</label><input id="onb-maxh" type="number" inputmode="numeric" value="${d.max_week_hours}">
      </div>
      <div class="onb-actions">
        <button onclick="Onboarding.back()">${t('onb_back')}</button>
        <button class="primary" onclick="Onboarding.next()">${t('onb_next')}</button>
      </div>
    `;
  },
  renderObjetivo() {
    const d = this.data;
    const isBY = d.race_type === 'backyard';
    return `
      <div class="onb-step">
        <h2>${t('onb_objetivo_title')}</h2>
        <p class="muted small onb-sub">${t('onb_objetivo_hint')}</p>
        <label>${t('race_name_label')}</label><input id="onb-rname" value="${esc(d.race_name)}" placeholder="${t('race_name_ph')}">
        <div class="chip-row" style="margin:8px 0 4px">
          <div class="chip ${!isBY ? 'selected' : ''}" onclick="Onboarding.setRaceType('ultra')">${t('race_type_ultra')}</div>
          <div class="chip ${isBY ? 'selected' : ''}" onclick="Onboarding.setRaceType('backyard')">${t('race_type_backyard_chip')}</div>
        </div>
        <label>${t('race_date_label')}</label><input id="onb-rdate" type="date" value="${d.race_date}">
        ${isBY ? `
        <label>${t('race_dplus_by_label')}</label><input id="onb-rdplus" type="number" inputmode="numeric" value="${d.race_dplus_m}">
        <label>${t('onb_target_by_label')}</label><input id="onb-rtarget" type="number" step="0.1" inputmode="decimal" value="${d.race_target_h}" placeholder="${t('onb_target_by_ph')}">
        ` : `
        <div class="row">
          <div><label>${t('race_dist_label')}</label><input id="onb-rdist" type="number" inputmode="decimal" value="${d.race_distance_km}"></div>
          <div><label>${t('race_dplus_label')}</label><input id="onb-rdplus" type="number" inputmode="numeric" value="${d.race_dplus_m}"></div>
        </div>
        <label>${t('race_target_label')}${t('race_target_close')} <span class="small muted">(${t('common_optional')})</span></label><input id="onb-rtarget" type="number" step="0.1" inputmode="decimal" value="${d.race_target_h}" placeholder="${t('race_target_ph')}">
        `}
      </div>
      <div class="onb-actions">
        <button onclick="Onboarding.back()">${t('onb_back')}</button>
        <button class="primary" onclick="Onboarding.finish()">${t('onb_finish')}</button>
      </div>
    `;
  },
  setRaceType(rt) {
    const d = this.data;
    if ($('#onb-rname')) d.race_name = $('#onb-rname').value.trim();
    if ($('#onb-rdate')) d.race_date = $('#onb-rdate').value;
    if ($('#onb-rdist')) d.race_distance_km = $('#onb-rdist').value;
    if ($('#onb-rdplus')) d.race_dplus_m = $('#onb-rdplus').value;
    if ($('#onb-rtarget')) d.race_target_h = $('#onb-rtarget').value;
    d.race_type = rt;
    $('#onbContent').innerHTML = this.renderObjetivo();
  },
  collect() {
    const d = this.data, step = this.steps[this.step];
    if (step === 'perfil') {
      d.name = $('#onb-name').value.trim(); d.last_name = $('#onb-lastname').value.trim();
      d.birth_date = $('#onb-birth').value || null; d.weight_kg = $('#onb-weight').value; d.height_cm = $('#onb-height').value;
    } else if (step === 'disponibilidad') {
      d.availability = AvailUI.minutes('onb'); d.availability_windows = AvailUI.windows('onb'); d.max_week_hours = $('#onb-maxh').value;
    } else if (step === 'objetivo') {
      d.race_name = $('#onb-rname').value.trim(); d.race_date = $('#onb-rdate').value;
      d.race_dplus_m = $('#onb-rdplus').value; d.race_target_h = $('#onb-rtarget').value;
      d.race_distance_km = d.race_type === 'backyard' ? '' : $('#onb-rdist').value;
    }
  },
  next() { this.collect(); this.step++; this.render(); },
  back() { this.collect(); this.step--; this.render(); },
  async finish() {
    this.collect();
    const d = this.data;
    const btn = event.target; btn.disabled = true; btn.textContent = t('common_saving');
    try {
      await put('/settings', {
        athlete_name: d.name, last_name: d.last_name, birth_date: d.birth_date || null,
        weight_kg: +d.weight_kg || 70, height_cm: d.height_cm ? +d.height_cm : null,
        availability: d.availability, availability_windows: d.availability_windows, max_week_hours: +d.max_week_hours || 14,
        onboarding_done: true,
      });
      if (d.race_name && d.race_date) {
        await post('/races', {
          name: d.race_name, date: d.race_date, priority: 'A', type: d.race_type,
          distance_km: d.race_type === 'backyard' ? null : (d.race_distance_km ? +d.race_distance_km : null),
          dplus_m: d.race_dplus_m ? +d.race_dplus_m : null,
          target_time_h: d.race_target_h ? +d.race_target_h : null,
        });
        try { await post('/plan/generate', {}); } catch {}
      }
      enterApp();
    } catch (e) { toast(t('err_prefix') + e.message); btn.disabled = false; btn.textContent = t('onb_finish'); }
  },
};

// ---------------- Boot ----------------
function showLogin() {
  $('#login').style.display = 'flex'; $('#app').style.display = 'none'; $('#onboarding').style.display = 'none';
  if (new URLSearchParams(location.search).get('reset')) Auth.showTab('reset');
}
function enterApp() {
  $('#login').style.display = 'none'; $('#onboarding').style.display = 'none'; $('#app').style.display = 'block';
  loadKnowledge();
  switchTab('hoy');
  registerSW();
  autoSyncStrava();
}
// Sincroniza Strava sola al abrir la app (sin que haga falta tocar "Sincronizar"), para que un
// entreno hecho con el reloj (COROS/Suunto → Strava → aquí) aparezca sin pasos manuales. Se limita
// a como mucho una vez cada 20 minutos para no golpear la API de Strava en cada apertura de la app.
async function autoSyncStrava() {
  try {
    const last = +(localStorage.getItem('tc_last_autosync') || 0);
    if (Date.now() - last < 20 * 60 * 1000) return;
    const st = await get('/strava/status');
    if (!st.connected) return;
    localStorage.setItem('tc_last_autosync', String(Date.now()));
    const r = await post('/strava/sync', { full: false });
    if (r.imported) { toast(`${r.imported} ${t('toast_strava_autosync')}`); if (currentTab === 'hoy') render('hoy'); if (currentTab === 'historial') render('historial'); }
    if (r.plan_changes && r.plan_changes.length) { toast(`${t('toast_plan_adapted')} ${r.plan_changes.length} ${t('toast_plan_adapted_suffix')}`); if (currentTab === 'plan') render('plan'); }
    if (r.unlogged_nutrition && r.unlogged_nutrition.length) postSyncNutritionPrompt(r.unlogged_nutrition);
  } catch {}
}
// Notas de versión: cuando un despliegue trae algo que merece explicarse, añade aquí una entrada
// con la MISMA cadena que la constante CACHE de sw.js (súbela en cada deploy). Si no hay nota para
// esa versión, el aviso de actualización se muestra igualmente pero solo con el botón, sin texto.
const RELEASE_NOTES = {
  'trailcoach-shell-v8': 'Nuevo editor de disponibilidad por franjas horarias (incluida madrugada), objetivo editable desde Ajustes, plan específico para Backyard Ultra y cancelación de suscripción.',
};

// Registro del service worker + aviso de actualización: en vez de recargar solos por debajo del
// usuario, cuando hay una versión nueva lista se muestra un botón grande de "Actualizar" (con una
// nota si el cambio es importante) y se aplica solo cuando el usuario lo toca.
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // Si ya hay una versión esperando (instalada mientras la app no estaba abierta), avisa ya.
    if (reg.waiting) showUpdateBanner(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(sw);
      });
    });
    // Comprueba si hay una versión nueva cada vez que la app vuelve a primer plano (útil en móvil,
    // donde la pestaña queda en background días sin recargarse).
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}
function showUpdateBanner(sw) {
  if ($('#updateBanner')) return;
  const el = document.createElement('div');
  el.id = 'updateBanner';
  el.className = 'update-banner';
  el.innerHTML = `<div class="update-banner-inner">
    <p id="updateBannerNote" class="small" style="display:none"></p>
    <button class="primary" id="updateBannerBtn">${icon('refresh')} ${t('sw_update_button')}</button>
  </div>`;
  document.body.appendChild(el);
  // Averigua qué versión trae este SW en espera, para mostrar su nota si existe.
  fetch('/sw.js', { cache: 'no-store' }).then(r => r.text()).then(txt => {
    const m = txt.match(/const CACHE = '([^']+)'/);
    const note = m && RELEASE_NOTES[m[1]];
    if (note) { const n = $('#updateBannerNote'); if (n) { n.textContent = note; n.style.display = ''; } }
  }).catch(() => {});
  $('#updateBannerBtn').onclick = () => { sw.postMessage('skipWaiting'); el.remove(); };
}
async function boot() {
  applyStaticI18n();
  if (!Auth.token) { showLogin(); return; }
  let me;
  try { me = await get('/me'); }
  catch (e) { showLogin(); return; }
  const billingParam = new URLSearchParams(location.search).get('billing');
  if (billingParam) {
    history.replaceState(null, '', location.pathname);
    if (billingParam === 'ok') toast(t('toast_billing_active'));
  }
  if (me.billing && me.billing.configured && !me.billing.allowed) { showPaywall(me.billing); return; }
  updateProfileBtn(me.avatar);
  let s = null;
  try { s = await get('/settings'); } catch {}
  if (s && s.language && s.language !== currentLang) { setLang(s.language); applyStaticI18n(); relabelTabbar(); }
  if (s && !s.onboarding_done) { Onboarding.start(me.name || s.athlete_name || ''); return; }
  enterApp();
}
$('#loginPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') Auth.login(); });
$('#signupPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') Auth.signup(); });
boot();
