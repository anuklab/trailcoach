'use strict';
/* TrailCoach — app frontend (vanilla JS, sin dependencias) */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const ZCOLOR = { Z1: 'var(--z1)', Z2: 'var(--z2)', Z3: 'var(--z3)', Z4: 'var(--z4)', Z5: 'var(--z5)' };
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTO = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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
};
function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`; }

const TYPE_ICON = { rest: 'moon', easy: 'wave', recovery: 'droplet', long: 'mountain', b2b: 'repeat',
  vert: 'chevronsUp', tempo: 'clock', intervals: 'bolt', strength: 'dumbbell', race: 'flag', cross: 'bike' };

function fmtDate(d) { const [y, m, day] = d.split('-'); return `${+day} ${MESES[+m - 1]}`; }
function fmtDateLong(d) { const [y, m, day] = d.split('-'); return `${DIAS[weekday(d)]} ${+day} de ${MESES[+m - 1]}`; }
function weekday(d) { const dt = new Date(d + 'T00:00:00Z'); return (dt.getUTCDay() + 6) % 7; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function addDays(d, n) { const dt = new Date(d + 'T00:00:00Z'); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); }
function hm(min) { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m} min`; }
function esc(s) { return (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

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
      if (!r.ok) { $('#forgotErr').textContent = d.error || 'Error'; return; }
      $('#forgotOk').textContent = d.message; $('#forgotOk').style.display = 'block';
    } catch (e) { $('#forgotErr').textContent = 'No se pudo conectar con el servidor.'; }
  },
  async resetPassword() {
    const password = $('#resetPass').value;
    $('#resetErr').textContent = '';
    const params = new URLSearchParams(location.search);
    const token = params.get('reset');
    try {
      const r = await fetch('/api/password/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const d = await r.json();
      if (!r.ok) { $('#resetErr').textContent = d.error || 'Error'; return; }
      Auth.token = d.token; localStorage.setItem('tc_token', d.token);
      history.replaceState(null, '', location.pathname);
      toast('Contraseña actualizada');
      boot();
    } catch (e) { $('#resetErr').textContent = 'No se pudo conectar con el servidor.'; }
  },
  async login() {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPass').value;
    $('#loginErr').textContent = '';
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (!r.ok) { $('#loginErr').textContent = d.error || 'Error'; return; }
      Auth.token = d.token; localStorage.setItem('tc_token', d.token);
      boot();
    } catch (e) { $('#loginErr').textContent = 'No se pudo conectar con el servidor.'; }
  },
  async signup() {
    const name = $('#signupName').value.trim();
    const email = $('#signupEmail').value.trim();
    const password = $('#signupPass').value;
    const password2 = $('#signupPass2').value;
    $('#signupErr').textContent = '';
    if (password !== password2) { $('#signupErr').textContent = 'Las contraseñas no coinciden.'; return; }
    try {
      const r = await fetch('/api/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const d = await r.json();
      if (!r.ok) { $('#signupErr').textContent = d.error || 'Error'; return; }
      Auth.token = d.token; localStorage.setItem('tc_token', d.token);
      boot();
    } catch (e) { $('#signupErr').textContent = 'No se pudo conectar con el servidor.'; }
  },
};

async function api(path, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  if (Auth.token) headers.authorization = `Bearer ${Auth.token}`;
  const r = await fetch('/api' + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (r.status === 401) { Auth.token = null; localStorage.removeItem('tc_token'); showLogin(); throw new Error('No autenticado'); }
  const isJson = (r.headers.get('content-type') || '').includes('json');
  const d = isJson ? await r.json() : await r.text();
  if (r.status === 402) { showPaywall(d.billing); throw new Error(d.error || 'Suscripción requerida'); }
  if (!r.ok) throw new Error((d && d.error) || 'Error de red');
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
  { id: 'hoy', label: 'Hoy', icon: 'sun' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'historial', label: 'Historial', icon: 'scroll' },
  { id: 'analisis', label: 'Análisis', icon: 'chart' },
];
const ALL_VIEWS = [...TABS.map(t => t.id), 'ajustes'];
let currentTab = 'hoy';
function switchTab(tab) {
  currentTab = tab;
  ALL_VIEWS.forEach(id => { $('#view-' + id).classList.toggle('active', id === tab); });
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render(tab);
}
$$('.tabbar button').forEach(b => {
  const t = TABS.find(x => x.id === b.dataset.tab);
  b.innerHTML = `${icon(t.icon)}<span>${t.label}</span>`;
  b.addEventListener('click', () => switchTab(b.dataset.tab));
});
$('.profile-btn').innerHTML = icon('gear');
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
  el.innerHTML = `<div class="list-empty">Cargando…</div>`;
  let data;
  try { data = await get('/today'); } catch (e) { el.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; return; }
  const { sessions, checkin, fitness, next_race, days_to_race, date, upcoming, adherence, month } = data;

  const tsb = fitness.tsb;
  const tsbLabel = tsb > 5 ? 'fresco' : tsb < -15 ? 'muy cargado' : tsb < -5 ? 'cargado' : 'equilibrado';
  const tsbColor = tsb > 5 ? 'var(--ok)' : tsb < -15 ? 'var(--danger)' : tsb < -5 ? 'var(--warn)' : 'var(--accent2)';

  el.innerHTML = `
    <h1>${fmtDateLong(date)}</h1>
    ${next_race ? `<p class="muted small" style="margin-top:-6px">${days_to_race === 0 ? `Hoy: ${esc(next_race.name)}` : `${days_to_race} días para ${esc(next_race.name)}`}${next_race.target_time_h ? ` · objetivo ${next_race.target_time_h}h` : ''}</p>` : ''}

    ${adherence && adherence.level !== 'sin_datos' ? `
    <div class="banner ${adherence.level}">
      ${icon(adherence.level === 'flojeando' ? 'x' : adherence.level === 'atencion' ? 'info' : 'check')}
      <p>${esc(adherence.message)}</p>
    </div>` : ''}

    ${!checkin && tsb < -18 ? `
    <div class="banner atencion">
      ${icon('info')}
      <p>Aún no has hecho el check-in de hoy, pero tus últimos entrenos ya muestran mucha carga acumulada (frescura ${Math.round(tsb)}). Si notas las piernas cargadas, no fuerces — puedes hacer el check-in para que ajuste el plan.</p>
    </div>` : ''}

    <div class="stat-grid card tight">
      <div class="stat" style="cursor:pointer" onclick="metricModal('forma')"><div class="v">${Math.round(fitness.ctl)}</div><div class="l">Forma ${icon('info')}</div></div>
      <div class="stat" style="cursor:pointer" onclick="metricModal('fatiga')"><div class="v">${Math.round(fitness.atl)}</div><div class="l">Fatiga ${icon('info')}</div></div>
      <div class="stat" style="cursor:pointer" onclick="metricModal('fresco')"><div class="v" style="color:${tsbColor}">${tsb > 0 ? '+' : ''}${Math.round(tsb)}</div><div class="l">${tsbLabel} ${icon('info')}</div></div>
    </div>

    ${month.activities ? `
    <div class="card tight">
      <h3 style="margin-bottom:8px">Últimos ${month.days} días</h3>
      <div class="stat-grid">
        <div class="stat"><div class="v">${month.km}</div><div class="l">km</div></div>
        <div class="stat"><div class="v">${month.dplus}</div><div class="l">m D+</div></div>
        <div class="stat"><div class="v">${month.hours}h</div><div class="l">tiempo</div></div>
      </div>
      ${month.completion_pct != null ? `<div class="progressbar" style="margin-top:10px"><div style="width:${month.completion_pct}%"></div></div>
      <p class="small muted" style="margin-top:4px">${month.completion_pct}% de los entrenos planificados completados</p>` : ''}
    </div>` : ''}

    ${!checkin ? `
    <div class="card">
      <h2>¿Cómo estás hoy?</h2>
      <p class="muted small">Cuéntame cómo te encuentras y ajusto el entreno de hoy.</p>
      <button class="primary" style="width:100%;margin-top:6px" onclick="Checkin.open('${date}', ${sessions.some(s => s.type === 'rest')})">Hacer check-in</button>
    </div>` : `
    <div class="card tight" style="display:flex;justify-content:space-between;align-items:center">
      <span class="small muted">Check-in de hoy hecho</span>
      <button class="ghost" onclick="Checkin.open('${date}', ${sessions.some(s => s.type === 'rest')})">Editar</button>
    </div>`}

    <div class="card" style="margin-top:4px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>Entreno de hoy</h2>
        <button class="ghost small" onclick="methodModal()">${icon('info')} ¿En qué se basa?</button>
      </div>
      <div id="hoySessions">${sessions.length ? sessions.map(sessionCard).join('') : '<p class="muted">No hay nada planificado. Ve a Plan → Carreras para crear tu plan.</p>'}</div>
    </div>

    ${upcoming && upcoming.length ? `
    <div class="card">
      <h2>Próximos entrenos</h2>
      ${upcoming.slice(0, 5).map(s => `<div class="upcoming-item">
        ${icon(TYPE_ICON[s.type] || 'wave')}
        <div class="day">${DIAS_CORTO[weekday(s.date)]} ${fmtDate(s.date)}</div>
        <div class="t">${esc(s.title)}</div>
        <div class="d">${s.duration_min ? hm(s.duration_min) : ''}</div>
      </div>`).join('')}
    </div>` : ''}

    <div class="card ask-coach">
      <h2>¿Algún cambio para hoy?</h2>
      <div class="chip-row" id="askSuggestions">
        <div class="chip" data-v="Hoy estoy muy cansado">Estoy cansado</div>
        <div class="chip" data-v="Hoy solo tengo 1 hora">Tengo poco tiempo</div>
        <div class="chip" data-v="Me pesan las piernas hoy">Piernas pesadas</div>
        <div class="chip" data-v="Esta semana solo puedo entrenar 3 días">Menos días esta semana</div>
      </div>
      <textarea id="freeAsk" placeholder="Escribe aquí y te ajusto el plan…"></textarea>
      <button class="primary" style="width:100%;margin-top:6px" onclick="freeAsk()">Enviar</button>
      <div id="freeAskResult"></div>
    </div>
  `;
  $$('#askSuggestions .chip').forEach(c => c.addEventListener('click', () => {
    $('#freeAsk').value = c.dataset.v;
    $('#freeAsk').focus();
  }));
}

function sessionCard(s) {
  const badge = s.status === 'done' ? '<span class="pill done">Hecho</span>' : s.status === 'partial' ? '<span class="pill partial">Parcial</span>'
    : s.status === 'missed' ? '<span class="pill missed">No hecho</span>' : '';
  const key = s.key ? '<span class="pill key">Clave</span>' : '';
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
      <button onclick="markStatus(${s.id},'done')">Hecho</button>
      <button onclick="markStatus(${s.id},'partial')">Parcial</button>
      <button onclick="markStatus(${s.id},'missed')">No hecho</button>
      <button onclick="editSessionModal(${s.id})">Editar</button>
      <button onclick="toggleLock(${s.id}, ${s.locked ? 0 : 1})">${s.locked ? 'Desbloquear' : 'Bloquear'}</button>
    </div>` : ''}
  </div>`;
}

// Detalle de una sesión: descripción completa + zonas de FC en ppm reales.
async function sessionDetailModal(id) {
  let s;
  try { s = await get(`/sessions/${id}`); } catch (e) { toast('Error: ' + e.message); return; }
  const zones = (K.zones || []).filter(z => (s.zone || '').split('-').includes(z.zone));
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>${icon(TYPE_ICON[s.type] || 'wave')} ${esc(s.title)}</h2>
    <p>${esc(s.description || 'Sin descripción adicional.')}</p>
    <div class="stat-grid" style="margin:10px 0">
      ${s.duration_min ? `<div class="stat"><div class="v">${hm(s.duration_min)}</div><div class="l">duración</div></div>` : ''}
      ${s.dplus_m ? `<div class="stat"><div class="v">${Math.round(s.dplus_m)}</div><div class="l">m D+</div></div>` : ''}
      ${s.zone && s.zone !== '-' ? `<div class="stat"><div class="v">${esc(s.zone)}</div><div class="l">zona</div></div>` : ''}
    </div>
    ${zones.length ? `<div class="divider"></div><h3 style="text-transform:none;color:var(--text);font-size:.95rem">¿A qué pulsaciones?</h3>
      ${zones.map(z => `<div class="zone-row">
        <div class="z-badge" style="background:${ZCOLOR[z.zone]}">${z.zone}</div>
        <div class="z-info"><strong>${esc(z.name)}</strong><span class="small muted">${z.bpm[0]}–${z.bpm[1]} ppm</span></div>
      </div>`).join('')}` : ''}
  `, { center: true });
}

function zoneBar(zone) {
  if (!zone || zone === '-') return '';
  const parts = zone.split('-');
  if (parts.length < 2) return `<div class="zonebar"><div style="flex:1;background:${ZCOLOR[parts[0]] || '#333'}"></div></div>`;
  return `<div class="zonebar">${parts.map(z => `<div style="flex:1;background:${ZCOLOR[z] || '#333'}"></div>`).join('')}</div>`;
}

async function markStatus(id, status) {
  await post(`/sessions/${id}/status`, { status });
  toast(status === 'done' ? 'Marcado como hecho' : status === 'partial' ? 'Marcado como parcial' : 'Marcado como no hecho');
  render(currentTab);
}
async function toggleLock(id, locked) {
  await post(`/sessions/${id}/lock`, { locked: !!locked });
  toast(locked ? 'Sesión bloqueada: no se tocará al recalcular' : 'Sesión desbloqueada');
  render(currentTab);
}

async function freeAsk() {
  const msg = $('#freeAsk').value.trim();
  if (!msg) return;
  const btn = event.target; btn.disabled = true; btn.textContent = 'Pensando…';
  try {
    const r = await post('/adjust/ask', { message: msg, date: todayStr() });
    $('#freeAskResult').innerHTML = `<div class="card tight" style="margin-top:8px;background:var(--panel2)">
      <p>${esc(r.message)}</p>
      ${r.applied.length ? `<p class="small muted">${r.applied.length} sesión(es) modificada(s).</p>` : ''}
    </div>`;
    $('#freeAsk').value = '';
    render(currentTab);
  } catch (e) { toast('Error: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = 'Enviar'; }
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
      <h2>Check-in — ${fmtDateLong(date)}</h2>
      <label>Nivel de fatiga general</label>
      <div class="chip-row" id="ci-fatigue">
        ${['A tope', 'Bien', 'Normal', 'Cansado', 'Muy cansado'].map((t, i) => `<div class="chip" data-v="${i}">${t}</div>`).join('')}
      </div>
      <label>¿Cómo notas las piernas?</label>
      <div class="chip-row" id="ci-legs">
        <div class="chip" data-v="0">Ligeras</div><div class="chip" data-v="1">Normales</div><div class="chip" data-v="2">Pesadas</div>
      </div>
      <label>¿Has dormido mal?</label>
      <div class="chip-row" id="ci-sleep"><div class="chip" data-v="0">No</div><div class="chip" data-v="1">Sí</div></div>
      <label>¿Estás enfermo o con molestia/dolor?</label>
      <div class="chip-row" id="ci-sick"><div class="chip" data-v="0">No</div><div class="chip" data-v="1">Enfermo</div><div class="chip" data-v="2">Dolor/molestia</div></div>
      <div id="painField" style="display:none"><label>¿Dónde te duele?</label><input id="ci-pain" placeholder="ej: rodilla derecha"></div>
      ${isRestToday ? `
      <div class="card tight" style="margin:10px 0;background:var(--panel2)">
        <label style="display:flex;align-items:center;gap:8px;margin:0">
          <input type="checkbox" id="ci-wants" style="width:auto">
          Hoy toca descanso, pero me apetece entrenar algo
        </label>
      </div>` : ''}
      <label>¿Cuánto tiempo tienes hoy? (déjalo vacío si tienes el previsto)</label>
      <input id="ci-time" type="number" placeholder="minutos disponibles">
      <label>Algo más que quieras contarme</label>
      <textarea id="ci-note" placeholder="opcional"></textarea>
      <button class="primary" style="width:100%;margin-top:12px" onclick="Checkin.submit()">Ajustar mi entreno</button>
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
      sick: st.sick === 1, pain: st.sick === 2 ? ($('#ci-pain').value || 'molestia') : '',
      available_min: $('#ci-time').value ? +$('#ci-time').value : null,
      note: $('#ci-note').value,
      wants_session: $('#ci-wants') ? $('#ci-wants').checked : false,
    };
    try {
      const r = await post('/checkin', body);
      closeModals();
      toast(r.changes.length ? `Ajustado: ${r.changes.length} cambio(s)` : 'Todo en orden, sin cambios necesarios');
      render(currentTab);
    } catch (e) { toast('Error: ' + e.message); }
  },
};

// ---------------- Editar sesión ----------------
async function editSessionModal(id) {
  const s = await get(`/sessions/${id}`);
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>Editar sesión</h2>
    <label>Tipo</label>
    <select id="es-type">${Object.keys(TYPE_ICON).map(t => `<option value="${t}" ${t === s.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <label>Título</label><input id="es-title" value="${esc(s.title)}">
    <label>Descripción</label><textarea id="es-desc">${esc(s.description || '')}</textarea>
    <div class="row">
      <div><label>Duración (min)</label><input id="es-dur" type="number" value="${s.duration_min || 0}"></div>
      <div><label>D+ (m)</label><input id="es-dplus" type="number" value="${s.dplus_m || 0}"></div>
    </div>
    <label>Zona</label><input id="es-zone" value="${esc(s.zone || '')}" placeholder="ej: Z2 o Z3-Z4">
    <div class="row" style="margin-top:14px">
      <button class="danger" onclick="deleteSessionConfirm(${s.id})">Eliminar</button>
      <button class="primary" onclick="saveSessionEdit(${s.id})">Guardar</button>
    </div>
  `, { center: true });
}
async function saveSessionEdit(id) {
  await patch(`/sessions/${id}`, {
    type: $('#es-type').value, title: $('#es-title').value, description: $('#es-desc').value,
    duration_min: +$('#es-dur').value, dplus_m: +$('#es-dplus').value, zone: $('#es-zone').value,
    note: 'Editado a mano',
  });
  closeModals(); toast('Sesión actualizada'); render(currentTab);
}
async function deleteSessionConfirm(id) {
  if (!confirm('¿Eliminar esta sesión?')) return;
  await del(`/sessions/${id}`); closeModals(); toast('Sesión eliminada'); render(currentTab);
}

// =================== PLAN ===================
let planFrom = null;
async function renderPlan() {
  const el = $('#view-plan');
  if (!planFrom) planFrom = mondayOf(todayStr());
  el.innerHTML = `<div class="list-empty">Cargando…</div>`;
  let data;
  try { data = await get(`/plan?from=${planFrom}&to=${addDays(planFrom, 27)}`); }
  catch (e) { el.innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; return; }

  const byWeek = {};
  for (const s of data.sessions) (byWeek[s.week_start] ||= []).push(s);
  const weeks = Object.keys(byWeek).sort();

  el.innerHTML = `
    <h1>Plan</h1>
    <div class="card tight" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleRaces()">
      <strong id="racesToggleLabel">Carreras</strong>
      ${icon('flag')}
    </div>
    <div id="planRaces" style="display:none"></div>

    <div class="row" style="margin:12px 0 8px">
      <button onclick="planNav(-28)">← Antes</button>
      <button class="primary" onclick="regenPlan()">Regenerar plan</button>
      <button onclick="planNav(28)">Después →</button>
    </div>
    <button class="ghost small" style="margin-bottom:8px" onclick="methodModal()">${icon('info')} ¿En qué se basa este plan?</button>
    ${weeks.map(ws => weekBlock(ws, byWeek[ws])).join('') || '<div class="list-empty">Sin sesiones. Añade una carrera objetivo primero.</div>'}
  `;
}
let racesOpen = false;
function toggleRaces() {
  racesOpen = !racesOpen;
  $('#planRaces').style.display = racesOpen ? 'block' : 'none';
  if (racesOpen) loadRacesInline();
}
function mondayOf(d) { const wd = weekday(d); return addDays(d, -wd); }
function planNav(n) { planFrom = addDays(planFrom, n); renderPlan(); }
async function regenPlan() {
  if (!confirm('Esto regenera el plan futuro (mantiene lo bloqueado, editado a mano o ya hecho). ¿Continuar?')) return;
  const r = await post('/plan/generate', {});
  toast(`Plan generado: ${r.sessions} sesiones, ${r.weeks} semanas`);
  renderPlan();
}
function weekBlock(ws, sessions) {
  const min = sessions.reduce((a, s) => a + (s.duration_min || 0), 0);
  const dplus = sessions.reduce((a, s) => a + (s.dplus_m || 0), 0);
  const phase = sessions.find(s => s.phase)?.phase || '';
  const byDay = {}; for (const s of sessions) (byDay[s.date] ||= []).push(s);
  const days = Object.keys(byDay).sort();
  return `
    <div class="week-head">
      <div><strong>Semana del ${fmtDate(ws)}</strong> <span class="phase">${esc(phase)}</span></div>
      <div class="small muted">${hm(min)} · ${Math.round(dplus)} m D+</div>
    </div>
    ${days.map(d => `
      <div class="card tight">
        <div class="small muted" style="margin-bottom:4px">${fmtDateLong(d)}</div>
        ${byDay[d].map(sessionCard).join('')}
      </div>`).join('')}
  `;
}

// =================== CARRERAS (sección dentro de Plan) ===================
async function loadRacesInline() {
  const el = $('#planRaces');
  el.innerHTML = `<div class="list-empty">Cargando…</div>`;
  const races = await get('/races');
  el.innerHTML = `
    <button class="primary" style="width:100%" onclick="raceModal()">Añadir carrera</button>
    <div id="raceList">${races.length ? races.map(raceRow).join('') : '<div class="list-empty">Añade tu primera carrera objetivo (CDH o UTMB, por ejemplo).</div>'}</div>
  `;
  // feasibility del objetivo, si lo hay (llamada ligera por carrera)
  races.filter(r => r.target_time_h).forEach(async r => {
    try {
      const { feasibility } = await get(`/races/${r.id}/estimate`);
      const el2 = document.querySelector(`[data-race="${r.id}"] .target-slot`);
      if (el2 && feasibility) el2.innerHTML = `<span class="target-badge ${feasibility.level}">${icon('target')} ${r.target_time_h} h objetivo</span>`;
    } catch {}
  });
}
function raceRow(r) {
  const prio = { A: 'Objetivo (A)', B: 'Preparatoria (B)', C: 'Entreno (C)' }[r.priority] || r.priority;
  return `<div class="card" data-race="${r.id}">
    <div style="display:flex;justify-content:space-between;cursor:pointer" onclick="raceModal(${r.id})">
      <strong>${esc(r.name)}</strong><span class="pill">${prio}</span>
    </div>
    <p class="muted small">${fmtDateLong(r.date)}${r.est_h ? ` · previsión ${r.est_h.toFixed(1)} h` : ''}</p>
    <p class="small">${r.distance_km ? `${r.distance_km} km` : '?'} ${r.dplus_m ? `· ${Math.round(r.dplus_m)} m D+` : ''} ${r.time_limit_h ? `· límite ${r.time_limit_h} h` : ''}</p>
    <div class="target-slot" style="margin:4px 0"></div>
    ${r.profile ? profileSvg(JSON.parse(r.profile)) : ''}
    <div class="row" style="margin-top:8px">
      <button onclick="raceModal(${r.id})">Editar</button>
      ${r.target_time_h ? `<button class="primary" onclick="pacingModal(${r.id})">Plan de carrera</button>` : ''}
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
function raceModal(id) {
  gpxParsed = null;
  const editing = id ? get(`/races`).then(rs => rs.find(r => r.id === id)) : Promise.resolve(null);
  editing.then(r => {
    aidStationsState = r?.aid_stations ? JSON.parse(r.aid_stations) : [];
    openModal(`
      <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
      <h2>${r ? 'Editar carrera' : 'Nueva carrera'}</h2>
      <label>Nombre</label><input id="r-name" value="${r ? esc(r.name) : ''}" placeholder="ej: CDH 110K - Val d'Aran by UTMB">
      <label>Fecha</label><input id="r-date" type="date" value="${r ? r.date : ''}">
      <label>Hora de salida</label><input id="r-start" type="time" value="${r?.start_time || ''}">
      <label>Prioridad</label>
      <select id="r-prio">
        <option value="A" ${r?.priority === 'A' ? 'selected' : ''}>A — Objetivo principal</option>
        <option value="B" ${r?.priority === 'B' ? 'selected' : ''}>B — Preparatoria</option>
        <option value="C" ${r?.priority === 'C' ? 'selected' : ''}>C — Carrera de entreno</option>
      </select>
      <div class="row">
        <div><label>Distancia (km)</label><input id="r-dist" type="number" value="${r?.distance_km ?? ''}"></div>
        <div><label>D+ (m)</label><input id="r-dplus" type="number" value="${r?.dplus_m ?? ''}"></div>
      </div>
      <label>Límite de tiempo (horas, opcional)</label><input id="r-limit" type="number" value="${r?.time_limit_h ?? ''}">
      <label>Tu objetivo de tiempo (horas)</label><input id="r-target" type="number" step="0.1" value="${r?.target_time_h ?? ''}" placeholder="ej: 22">
      <label>Track GPX (opcional — calcula distancia, D+ y perfil automáticamente)</label>
      <input id="r-gpx" type="file" accept=".gpx">
      <div id="r-gpx-preview"></div>
      <div class="divider"></div>
      <label style="margin-top:0">Avituallamientos y bases de vida</label>
      <div id="aidList"></div>
      <button class="ghost" onclick="addAidRow()">${icon('plus')} Añadir punto</button>
      <div class="divider"></div>
      <label>Notas</label><textarea id="r-notes">${r ? esc(r.notes || '') : ''}</textarea>
      <div class="row" style="margin-top:14px">
        ${r ? `<button class="danger" onclick="deleteRace(${r.id})">Eliminar</button>` : '<span></span>'}
        <button class="primary" onclick="saveRace(${r ? r.id : 'null'})">Guardar</button>
      </div>
    `, { center: true });
    $('#r-gpx').addEventListener('change', handleGpxFile);
    renderAidList();
  });
}
function renderAidList() {
  $('#aidList').innerHTML = aidStationsState.map((a, i) => `
    <div class="aid-row">
      <input type="text" placeholder="Nombre" value="${esc(a.name || '')}" onchange="aidStationsState[${i}].name=this.value">
      <input type="number" placeholder="km" value="${a.km ?? ''}" onchange="aidStationsState[${i}].km=+this.value">
      <select onchange="aidStationsState[${i}].type=this.value">
        <option value="avituallamiento" ${a.type !== 'base_vida' ? 'selected' : ''}>Avitu.</option>
        <option value="base_vida" ${a.type === 'base_vida' ? 'selected' : ''}>Base vida</option>
      </select>
      <input type="number" placeholder="min parada" value="${a.rest_min ?? ''}" onchange="aidStationsState[${i}].rest_min=+this.value">
      <button class="ghost" onclick="aidStationsState.splice(${i},1); renderAidList()">${icon('trash')}</button>
    </div>`).join('') || '<p class="small muted">Sin puntos añadidos.</p>';
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
      <p class="small">${gpxParsed.distance_km} km · ${gpxParsed.dplus_m} m D+ · ${gpxParsed.dminus_m} m D-</p>
      ${profileSvg(gpxParsed.profile)}
      <p class="small muted">${gpxParsed.climbs.length} tramos principales de subida/bajada detectados</p>
    </div>`;
  } catch (err) { toast('Error leyendo el GPX: ' + err.message); }
}
async function saveRace(id) {
  const body = {
    name: $('#r-name').value, date: $('#r-date').value, priority: $('#r-prio').value,
    start_time: $('#r-start').value || null,
    distance_km: $('#r-dist').value ? +$('#r-dist').value : null,
    dplus_m: $('#r-dplus').value ? +$('#r-dplus').value : null,
    time_limit_h: $('#r-limit').value ? +$('#r-limit').value : null,
    target_time_h: $('#r-target').value ? +$('#r-target').value : null,
    aid_stations: aidStationsState.filter(a => a.name && a.km),
    notes: $('#r-notes').value,
  };
  if (!body.name || !body.date) { toast('Nombre y fecha son obligatorios'); return; }
  try {
    let race = id ? await patch(`/races/${id}`, body) : await post('/races', body);
    if (gpxParsed) await post(`/races/${race.id}/gpx`, { gpx: await $('#r-gpx').files[0].text() });
    closeModals();
    toast('Carrera guardada.');
    if (confirm('¿Regenerar el plan de entrenamiento ahora con esta carrera?')) await regenPlan();
    else loadRacesInline();
  } catch (e) { toast('Error: ' + e.message); }
}
async function deleteRace(id) {
  if (!confirm('¿Eliminar esta carrera?')) return;
  await del(`/races/${id}`); closeModals(); toast('Carrera eliminada'); loadRacesInline();
}

async function pacingModal(id) {
  let plan;
  try { plan = await get(`/races/${id}/pacing`); }
  catch (e) { toast(e.message); return; }
  const feas = (await get(`/races/${id}/estimate`)).feasibility;
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>Plan de carrera</h2>
    ${feas ? `<p class="small" style="color:${feas.level === 'realista' || feas.level === 'conservador' ? 'var(--accent)' : feas.level === 'optimista' ? 'var(--accent2)' : 'var(--danger)'}">${esc(feas.message)}</p>` : ''}
    <div class="stat-grid" style="margin:10px 0">
      <div class="stat"><div class="v">${plan.target_time_h}h</div><div class="l">Objetivo</div></div>
      <div class="stat"><div class="v">${plan.rest_h}h</div><div class="l">Paradas</div></div>
      <div class="stat"><div class="v">${plan.avg_pace_min_km_equiv}</div><div class="l">min/km eq.</div></div>
    </div>
    ${plan.rows.map(r => `<div class="split-row">
      <div class="name">${esc(r.name)} <span class="muted small">(km ${r.km})</span></div>
      <div class="t">${r.arrival_clock ? `${r.arrival_clock} · ` : ''}${r.arrival_elapsed}${r.rest_min ? ` +${r.rest_min}min` : ''}</div>
    </div>`).join('')}
    <p class="source-note">Estimación basada en el perfil del track (o distancia si no hay GPX) y tu objetivo de tiempo. Los cortes de tiempo son orientativos: consulta siempre el reglamento oficial.</p>
  `, { center: true });
}

// =================== NUTRICIÓN (sección dentro de Análisis) ===================
async function loadNutritionInline() {
  const el = $('#analisisNutricion');
  el.innerHTML = `<div class="list-empty">Cargando…</div>`;
  const [logs, ins, targets] = await Promise.all([get('/nutrition'), get('/nutrition/insights'), get('/nutrition/targets').catch(() => null)]);
  el.innerHTML = `
    ${targets ? `<div class="card">
      <h2>Objetivo para ${targets.race_name ? esc(targets.race_name) : 'tu próxima carrera'}</h2>
      <div class="stat-grid">
        <div class="stat"><div class="v">${targets.carbs_g_per_h}g</div><div class="l">carbo/hora</div></div>
        <div class="stat"><div class="v">${targets.sodium_mg_per_h}</div><div class="l">mg sodio/h</div></div>
        <div class="stat"><div class="v">${targets.hours}h</div><div class="l">duración est.</div></div>
      </div>
      <p class="source-note">${esc(targets.fluids_note)}</p>
    </div>` : ''}

    <div class="card">
      <h2>Registrar toma</h2>
      <p class="muted small">Anota qué tomaste en entreno o carrera y cómo te sentó — con el tiempo la app te dirá qué te funciona.</p>
      <div class="row">
        <div><label>Fecha</label><input id="n-date" type="date" value="${todayStr()}"></div>
        <div><label>Minuto</label><input id="n-min" type="number" placeholder="ej: 40"></div>
      </div>
      <label>Producto</label><input id="n-product" placeholder="ej: Gel Maurten 100">
      ${(K.gel_presets && K.gel_presets.length) ? `
      <label class="small muted">O elige uno de la lista (marcas más comunes)</label>
      <div class="chip-row" id="n-preset">
        ${K.gel_presets.map((g, i) => `<div class="chip" data-i="${i}">${esc(g.brand)} ${esc(g.product)}</div>`).join('')}
      </div>` : ''}
      <div class="row">
        <div><label>Carbo (g)</label><input id="n-carbs" type="number"></div>
        <div><label>Sodio (mg)</label><input id="n-sodium" type="number"></div>
        <div><label>Cafeína (mg)</label><input id="n-caf" type="number"></div>
      </div>
      <label>¿Cómo te sentó?</label>
      <div class="chip-row" id="n-feeling">
        <div class="chip" data-v="bien">Bien</div><div class="chip" data-v="neutro">Neutro</div><div class="chip" data-v="mal">Mal</div>
      </div>
      <label><input type="checkbox" id="n-gi" style="width:auto"> Tuve molestia digestiva</label>
      <label>Notas</label><textarea id="n-notes" placeholder="opcional"></textarea>
      <button class="primary" style="width:100%;margin-top:8px" onclick="saveNutritionLog()">Guardar</button>
    </div>

    ${ins.total_logs ? `<div class="card">
      <h2>Lo que sabemos hasta ahora</h2>
      ${ins.recommended.length ? `<p class="small"><strong style="color:var(--accent)">Te funciona bien:</strong> ${ins.recommended.map(esc).join(', ')}</p>` : ''}
      ${ins.avoid.length ? `<p class="small"><strong style="color:var(--danger)">Mejor evitar:</strong> ${ins.avoid.map(esc).join(', ')}</p>` : ''}
      <table class="simple" style="margin-top:6px">
        <tr><th>Producto</th><th>Veces</th><th>Valoración</th></tr>
        ${ins.products.map(p => `<tr><td>${esc(p.product)}</td><td>${p.n}</td>
          <td class="feeling-${p.avg_score > 0.3 ? 'bien' : p.avg_score < -0.2 ? 'mal' : 'neutro'}">${p.avg_score > 0.3 ? 'Bien' : p.avg_score < -0.2 ? 'Mal' : 'Neutro'}${p.gi_issues ? ' · molestias' : ''}</td></tr>`).join('')}
      </table>
    </div>` : ''}

    <div class="card">
      <h2>Historial</h2>
      ${logs.length ? logs.map(l => `<div class="nutri-row">
        <div><strong>${esc(l.product)}</strong> <span class="muted small">· ${fmtDate(l.date)}${l.minute_mark ? ` · min ${l.minute_mark}` : ''}</span>
          ${l.notes ? `<div class="small muted">${esc(l.notes)}</div>` : ''}</div>
        <div style="text-align:right">
          <div class="feeling-${l.feeling || 'neutro'} small">${l.feeling || ''}${l.gi_issue ? ' · GI' : ''}</div>
          <button class="ghost" onclick="delNutritionLog(${l.id})">${icon('trash')}</button>
        </div>
      </div>`).join('') : '<p class="list-empty">Sin registros todavía.</p>'}
    </div>

    <div class="card">
      <h3>Guía rápida (basada en evidencia)</h3>
      <p class="small">${esc(NUTRITION_TEXT.carbs)}</p>
      <p class="small">${esc(NUTRITION_TEXT.sodium)}</p>
      <p class="small">${esc(NUTRITION_TEXT.gut)}</p>
      <p class="source-note">Fuentes: marathonhandbook.com (nutrición en ultramaratón), precisionhydration.com (cafeína en deporte de resistencia).</p>
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
const METRIC_INFO = {
  forma: { title: 'Forma (CTL)', body: 'Media de tu carga de entrenamiento de los últimos 42 días: tu nivel de fondo acumulado. Sube poco a poco con constancia — no se puede "hacer trampa" entrenando mucho de golpe, porque eso sube la fatiga, no la forma.' },
  fatiga: { title: 'Fatiga (ATL)', body: 'Media de carga de los últimos 7 días: lo que llevas encima ahora mismo. Sube rápido tras una semana exigente y baja rápido si descansas unos días.' },
  fresco: { title: 'Frescura (TSB)', body: 'Es Forma − Fatiga. Positivo significa que estás fresco (buen momento para una carrera o una sesión dura). Muy negativo (por debajo de −15/−20) indica riesgo de sobrecarga: toca bajar el ritmo.' },
};
function metricModal(which) {
  const t = METRIC_INFO[which];
  openModal(`<button class="ghost close-x" onclick="closeModals()">${icon('x')}</button><h2>${t.title}</h2><p>${t.body}</p>
    <p class="source-note">Modelo TRIMP / Banister — el mismo que usan TrainingPeaks o el "Fitness &amp; Freshness" de Strava.</p>`, { center: true });
}
function methodModal() {
  const m = K.method;
  if (!m) return;
  openModal(`<button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>¿En qué se basa tu plan?</h2>
    <p class="muted small">${esc(m.overview)}</p>
    ${m.items.map(it => `<div class="divider"></div><h3 style="text-transform:none;color:var(--text);font-size:.95rem">${esc(it.title)}</h3>
      <p class="small">${esc(it.text)}</p><p class="source-note">${esc(it.source)}</p>`).join('')}
  `, { center: true });
}
function zoneModal(zoneCode) {
  const zones = K.zones && K.zones.length ? K.zones : [];
  const rows = zoneCode ? zones.filter(z => zoneCode.split('-').includes(z.zone)) : zones;
  openModal(`<button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>Zonas de frecuencia cardiaca</h2>
    <p class="muted small">Calculadas con la fórmula de Karvonen a partir de tu FC máxima y en reposo (Ajustes).</p>
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
  toast('Registrado'); loadNutritionInline();
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
  el.innerHTML = `<div class="list-empty">Cargando…</div>`;
  const [past, strava] = await Promise.all([get('/past-races'), get('/strava/status')]);
  el.innerHTML = `
    <h1>Historial</h1>
    <div class="card">
      <h2>Strava</h2>
      ${!strava.configured ? `<p class="muted small">Strava no está configurado en el servidor todavía (ver README).</p>` :
      strava.connected ? `
        <p class="small">Conectado como <strong>${esc(strava.athlete || '')}</strong></p>
        <div class="row">
          <button onclick="stravaSync(false)">Sincronizar</button>
          <button class="danger" onclick="stravaDisconnect()">Desconectar</button>
        </div>` : `<button class="primary" style="width:100%" onclick="stravaConnect()">Conectar con Strava</button>`}
      <p class="small muted" style="margin-top:10px">
        ¿Relojes COROS o Suunto? No hace falta conectarlos aquí uno a uno: activa la
        sincronización automática con Strava desde la app COROS (Perfil → Ajustes → Apps de
        terceros → Strava) o la app Suunto (Ajustes → Asociaciones → Strava), y en cuanto termines
        un entreno llegará solo a Strava y de ahí a TrailCoach la próxima vez que sincronices.
      </p>
    </div>
    <div class="card tight" style="cursor:pointer" onclick="togglePastRaces()">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>Carreras anteriores${strava.connected ? ` <span class="small muted">(${past.length})</span>` : ''}</strong>
        ${icon('flag')}
      </div>
    </div>
    <div id="pastRacesBox" style="display:${strava.connected ? 'none' : 'block'}">
      <div class="card">
        <p class="muted small">Tu historial de retos ayuda a estimar tu ritmo en la próxima carrera.</p>
        <button style="width:100%" onclick="pastRaceModal()">Añadir carrera pasada</button>
        ${past.length ? `<table class="simple" style="margin-top:8px">
          <tr><th>Carrera</th><th>Fecha</th><th>Km</th><th>D+</th><th>Tiempo</th><th></th></tr>
          ${past.map(p => `<tr>
            <td>${esc(p.name)}</td><td>${fmtDate(p.date)}</td><td>${p.distance_km ?? '-'}</td>
            <td>${p.dplus_m ? Math.round(p.dplus_m) : '-'}</td><td>${p.time_min ? hm(p.time_min) : '-'}</td>
            <td><button class="ghost" onclick="delPastRace(${p.id})">${icon('trash')}</button></td>
          </tr>`).join('')}
        </table>` : '<p class="list-empty">Sin carreras registradas aún.</p>'}
      </div>
    </div>
    <div class="card">
      <h2>Actividades recientes</h2>
      <div id="recentActs" class="small muted">Cargando…</div>
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
            ${paceMinKm ? `<span>${paceMinKm.toFixed(1)} min/km</span>` : ''}
            ${a.avg_hr ? `<span>${Math.round(a.avg_hr)} ppm avg</span>` : ''}
            ${a.max_hr ? `<span>${Math.round(a.max_hr)} ppm max</span>` : ''}
            <span>${Math.round(a.load || 0)} carga</span>
          </div>
        </div>`;
      }).join('') : '<p>Sin actividades sincronizadas todavía.</p>';
    });
}
function togglePastRaces() { const b = $('#pastRacesBox'); b.style.display = b.style.display === 'none' ? 'block' : 'none'; }
async function stravaConnect() { const { url } = await get('/strava/connect'); window.open(url, '_blank'); }
async function stravaSync(full) {
  toast('Sincronizando…');
  const r = await post('/strava/sync', { full });
  toast(`${r.imported} actividades importadas`);
  renderHistorial();
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
      <h2>¿Qué tomaste en "${esc(a.name)}"?</h2>
      <p class="muted small">${fmtDate(a.date)} · ${hm(Math.round((a.moving_time_s || 0) / 60))}</p>
      ${(K.gel_presets && K.gel_presets.length) ? `
      <div class="chip-row" id="psn-preset">
        ${K.gel_presets.map((g, gi) => `<div class="chip" data-i="${gi}">${esc(g.brand)} ${esc(g.product)}</div>`).join('')}
      </div>` : ''}
      <label>Producto</label><input id="psn-product" placeholder="ej: Gel Maurten 100">
      <div class="row">
        <div><label>Carbo (g)</label><input id="psn-carbs" type="number"></div>
        <div><label>Sodio (mg)</label><input id="psn-sodium" type="number"></div>
      </div>
      <label>¿Cómo te sentó?</label>
      <div class="chip-row" id="psn-feeling"><div class="chip" data-v="bien">Bien</div><div class="chip" data-v="neutro">Neutro</div><div class="chip" data-v="mal">Mal</div></div>
      <div class="row" style="margin-top:12px">
        <button onclick="_postSyncSkip()">No tomé nada</button>
        <button class="primary" onclick="_postSyncSave()">Guardar</button>
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
async function stravaDisconnect() { if (!confirm('¿Desconectar Strava?')) return; await post('/strava/disconnect'); renderHistorial(); }
function pastRaceModal() {
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>Carrera pasada</h2>
    <label>Nombre</label><input id="p-name">
    <label>Fecha</label><input id="p-date" type="date">
    <div class="row"><div><label>Km</label><input id="p-dist" type="number"></div><div><label>D+ (m)</label><input id="p-dplus" type="number"></div></div>
    <label>Tiempo (minutos)</label><input id="p-time" type="number" placeholder="ej: 340 para 5h40">
    <label>Puesto / notas</label><input id="p-pos">
    <button class="primary" style="width:100%;margin-top:10px" onclick="savePastRace()">Guardar</button>
  `, { center: true });
}
async function savePastRace() {
  await post('/past-races', {
    name: $('#p-name').value, date: $('#p-date').value, distance_km: +$('#p-dist').value || null,
    dplus_m: +$('#p-dplus').value || null, time_min: +$('#p-time').value || null, position: $('#p-pos').value,
  });
  closeModals(); toast('Guardado'); renderHistorial();
}
async function delPastRace(id) { if (!confirm('¿Eliminar?')) return; await del(`/past-races/${id}`); renderHistorial(); }

// =================== ANÁLISIS ===================
async function renderAnalisis() {
  const el = $('#view-analisis');
  el.innerHTML = `<div class="list-empty">Cargando…</div>`;
  const from = addDays(todayStr(), -120), to = addDays(todayStr(), 21);
  const [series, vo2] = await Promise.all([get(`/fitness?from=${from}&to=${to}`), get('/vo2max').catch(() => null)]);
  const todaySeries = series.find(s => s.date === todayStr()) || series[series.length - 1];
  el.innerHTML = `<h1>Análisis</h1>
    <div class="card">
      ${todaySeries ? `<div class="stat-grid tight" style="margin-bottom:6px">
        <div class="stat" style="cursor:pointer" onclick="metricModal('forma')"><div class="v">${todaySeries.ctl}</div><div class="l">Forma</div></div>
        <div class="stat" style="cursor:pointer" onclick="metricModal('fatiga')"><div class="v">${todaySeries.atl}</div><div class="l">Fatiga</div></div>
        <div class="stat" style="cursor:pointer" onclick="metricModal('fresco')"><div class="v">${todaySeries.tsb > 0 ? '+' : ''}${todaySeries.tsb}</div><div class="l">Frescura</div></div>
      </div>` : ''}
      ${fitnessChart(series)}
    </div>
    <div class="card">
      <h3>Cómo leerlo</h3>
      <p class="small muted"><span style="color:var(--accent)">Forma (CTL)</span>: tu nivel de entrenamiento acumulado (media de 42 días).
      <span style="color:var(--danger)">Fatiga (ATL)</span>: carga reciente (media de 7 días).
      Frescura (TSB) = Forma − Fatiga: positivo es fresco, muy negativo indica riesgo de sobrecarga.</p>
    </div>
    ${vo2 && vo2.vo2max ? `
    <div class="card">
      <h3>Forma aeróbica estimada (VO2max)</h3>
      <div class="stat-grid tight" style="margin:8px 0">
        <div class="stat"><div class="v">${vo2.vo2max}</div><div class="l">ml/kg/min aprox.</div></div>
      </div>
      <p class="small muted">Calculado a partir de tu mejor esfuerzo llano reciente: "${esc(vo2.source.name)}" (${fmtDate(vo2.source.date)}), ${vo2.source.distance_km} km en ${hm(vo2.source.duration_min)} (${vo2.source.pace_min_km} min/km).</p>
      <p class="source-note">Estimación aproximada (fórmulas de Jack Daniels y Jimmy Gilbert, las mismas detrás de las tablas VDOT) — no sustituye una prueba de laboratorio, y es menos fiable cuanto más desnivel tenga el tramo usado.</p>
    </div>` : ''}
    <h2 style="margin-top:18px">Nutrición</h2>
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
    <span style="color:var(--accent)">● Forma</span><span style="color:var(--danger)">● Fatiga</span><span style="color:var(--accent2)">● Frescura</span>
  </div>`;
}

// =================== AJUSTES ===================
async function renderAjustes() {
  const el = $('#view-ajustes');
  const [s, k, me] = await Promise.all([get('/settings'), get('/knowledge'), get('/me')]);
  const lib = k.strength_library;
  const theme = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const initials = (s.athlete_name || me.email || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
  el.innerHTML = `
    <h1>Perfil y ajustes</h1>
    <div class="card">
      <div class="profile-head">
        <div class="avatar-circle" id="avatarCircle" onclick="pickAvatar()" title="Subir foto de perfil"
          ${me.avatar ? `style="background-image:url('${me.avatar}')"` : ''}>${me.avatar ? '' : esc(initials)}
          <span class="avatar-edit-dot">${icon('edit')}</span>
        </div>
        <input type="file" id="avatarFile" accept="image/*" style="display:none" onchange="onAvatarFile(this)">
        <div style="flex:1"><label>Nombre</label><input id="s-name" value="${esc(s.athlete_name || '')}" placeholder="Tu nombre"></div>
      </div>
      <p class="small muted" style="margin-top:4px">Toca tu avatar para subir una foto${me.avatar ? ' · <span style="text-decoration:underline;cursor:pointer" onclick="removeAvatar()">quitar foto</span>' : ''}.</p>
      <div class="row" style="margin-top:12px;align-items:center">
        <span class="small muted" style="flex:1">Tema de la app</span>
        <div class="theme-toggle">
          <button type="button" class="${theme === 'dark' ? 'active' : ''}" onclick="setTheme('dark')">${icon('moon')} Noche</button>
          <button type="button" class="${theme === 'light' ? 'active' : ''}" onclick="setTheme('light')">${icon('sun')} Día</button>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>Disponibilidad semanal</h2>
      <p class="muted small">Minutos que puedes dedicar cada día (0 = descanso fijo).</p>
      <div class="avail-grid">
        ${DIAS.map((d, i) => `<div class="avail-day">
          <div class="avail-day-label">${d.slice(0, 3)}</div>
          <input type="number" class="avail" data-i="${i}" value="${s.availability[i]}" min="0" step="5">
          <div class="avail-day-unit">min</div>
        </div>`).join('')}
      </div>
      <label>Horas máximas por semana</label><input id="s-maxh" type="number" value="${s.max_week_hours}">
    </div>
    <div class="card">
      <label>Día habitual de tirada larga</label>
      <select id="s-longday">${DIAS.map((d, i) => `<option value="${i}" ${i === s.long_day ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <label>Día de segunda tirada (back-to-back)</label>
      <select id="s-b2bday">${DIAS.map((d, i) => `<option value="${i}" ${i === s.b2b_day ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <label><input type="checkbox" id="s-strength" ${s.strength ? 'checked' : ''} style="width:auto"> Incluir sesiones de fuerza</label>
      <label><input type="checkbox" id="s-poles" ${s.poles ? 'checked' : ''} style="width:auto"> Uso bastones en subidas</label>
    </div>
    <div class="card">
      <h2>Cómo quieres hacer la fuerza</h2>
      <p class="muted small">${esc(k.strength.summary)}</p>
      <div class="chip-row" id="s-strengthmode">
        ${Object.entries(lib).map(([key, v]) => `<div class="chip ${s.strength_mode === key ? 'selected' : ''}" data-v="${key}">${esc(v.label)}</div>`).join('')}
      </div>
      <p class="source-note">Fuente: ${esc(k.strength.source)}</p>
    </div>
    <div class="card">
      <h2>Frecuencia cardiaca y peso</h2>
      <div class="row"><div><label>FC máxima</label><input id="s-hrmax" type="number" value="${s.hr_max}"></div>
      <div><label>FC en reposo</label><input id="s-hrrest" type="number" value="${s.hr_rest}"></div></div>
      <label>Peso (kg)</label><input id="s-weight" type="number" value="${s.weight_kg || 70}">
    </div>
    <button class="primary" style="width:100%" onclick="saveSettings()">Guardar ajustes</button>
    <div class="card" style="margin-top:20px">
      <h2>Cuenta</h2>
      <p class="small muted">Conectado como <strong>${esc(me.email)}</strong></p>
      ${billingCardHtml(me.billing)}
      <button class="danger" style="width:100%;margin-top:6px" onclick="logout()">Cerrar sesión</button>
      <button class="ghost" style="width:100%;margin-top:8px;color:var(--danger)" onclick="deleteAccountModal()">Eliminar mi cuenta</button>
    </div>
    <p class="small muted" style="text-align:center;margin-top:14px">
      TrailCoach · datos guardados en tu propio servidor ·
      <a href="/terms.html" target="_blank">Términos</a> · <a href="/privacy.html" target="_blank">Privacidad</a>
    </p>
  `;
  $$('#s-strengthmode .chip').forEach(c => c.addEventListener('click', () => {
    $$('#s-strengthmode .chip').forEach(x => x.classList.remove('selected')); c.classList.add('selected');
  }));
}
function deleteAccountModal() {
  openModal(`
    <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
    <h2>Eliminar mi cuenta</h2>
    <p class="small muted">Esto borra tu cuenta y todos tus datos (carreras, plan, historial de actividades, nutrición) de forma permanente. No se puede deshacer.</p>
    <label>Escribe tu contraseña para confirmar</label>
    <input id="delAccPass" type="password" autocomplete="current-password">
    <p id="delAccErr" class="small" style="color:var(--danger)"></p>
    <div class="row" style="margin-top:12px">
      <button onclick="closeModals()">Cancelar</button>
      <button class="danger" onclick="confirmDeleteAccount()">Eliminar definitivamente</button>
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
    toast('Tu cuenta se ha eliminado.');
  } catch (e) { $('#delAccErr').textContent = e.message || 'Error'; }
}
// ---------------- Suscripción (Stripe) ----------------
function billingCardHtml(b) {
  if (!b || !b.configured) return '';
  let status;
  if (b.status === 'trialing') status = `Prueba gratuita — quedan <strong>${b.trialDaysLeft}</strong> día(s).`;
  else if (b.status === 'active') status = `Suscripción activa (${b.plan === 'yearly' ? 'anual' : 'mensual'}).`;
  else if (b.status === 'past_due') status = 'Suscripción con un pago pendiente — revisa tu método de pago.';
  else status = 'Sin suscripción activa.';
  const actions = b.status === 'trialing' || !['active', 'past_due'].includes(b.status)
    ? `<div class="row" style="margin-top:8px">
         <button class="primary" style="width:100%" onclick="Billing.checkout('monthly')">Suscribirme — 9,99 €/mes</button>
       </div>
       <button class="ghost" style="width:100%;margin-top:6px" onclick="Billing.checkout('yearly')">Plan anual — 99,90 €/año (2 meses gratis)</button>`
    : `<button style="width:100%;margin-top:6px" onclick="Billing.portal()">Gestionar suscripción</button>`;
  return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
    <p class="small muted">${status}</p>
    ${actions}
  </div>`;
}
const Billing = {
  async checkout(plan) {
    try { const { url } = await post('/billing/checkout', { plan }); location.href = url; }
    catch (e) { toast('Error: ' + e.message); }
  },
  async portal() {
    try { const { url } = await post('/billing/portal', {}); location.href = url; }
    catch (e) { toast('Error: ' + e.message); }
  },
};
function paywallHtml(b) {
  const days = b?.trialDaysLeft || 0;
  return `
    <div class="card" style="max-width:420px;margin:40px auto;text-align:center">
      <h2>Tu prueba gratuita ha terminado</h2>
      <p class="small muted">Suscríbete para seguir entrenando con TrailCoach. Tus datos y tu plan siguen aquí, esperándote.</p>
      <div class="row" style="margin-top:16px">
        <button class="primary" style="width:100%" onclick="Billing.checkout('monthly')">Suscribirme — 9,99 €/mes</button>
      </div>
      <button class="ghost" style="width:100%;margin-top:8px" onclick="Billing.checkout('yearly')">Plan anual — 99,90 €/año (2 meses gratis)</button>
      <button class="ghost" style="width:100%;margin-top:16px;color:var(--danger)" onclick="deleteAccountModal()">Eliminar mi cuenta</button>
      <button class="ghost" style="width:100%;margin-top:6px" onclick="logout()">Cerrar sesión</button>
    </div>`;
}
function showPaywall(b) {
  $('#login').style.display = 'none'; $('#onboarding').style.display = 'none'; $('#app').style.display = 'block';
  $('#app').innerHTML = paywallHtml(b);
}
async function saveSettings() {
  const availability = $$('.avail').map(i => +i.value || 0);
  const modeChip = $('#s-strengthmode .chip.selected');
  await put('/settings', {
    athlete_name: $('#s-name').value, availability, max_week_hours: +$('#s-maxh').value, long_day: +$('#s-longday').value, b2b_day: +$('#s-b2bday').value,
    strength: $('#s-strength').checked, strength_mode: modeChip ? modeChip.dataset.v : 'gym', poles: $('#s-poles').checked,
    hr_max: +$('#s-hrmax').value, hr_rest: +$('#s-hrrest').value, weight_kg: +$('#s-weight').value || 70,
  });
  toast('Ajustes guardados');
  if (confirm('¿Regenerar el plan con los nuevos ajustes?')) await regenPlan();
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
  if (!file.type.startsWith('image/')) { toast('Elige un archivo de imagen'); return; }
  try {
    const dataUrl = await resizeImageFile(file, 300);
    await put('/avatar', { data: dataUrl });
    toast('Foto actualizada');
    updateProfileBtn(dataUrl);
    renderAjustes();
  } catch (e) { toast('Error: ' + e.message); }
}
async function removeAvatar() {
  if (!confirm('¿Quitar la foto de perfil?')) return;
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
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('Imagen no válida'));
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
    availability: [0, 75, 75, 90, 60, 240, 150], max_week_hours: 14,
    race_name: '', race_date: '', race_distance_km: '', race_dplus_m: '', race_target_h: '',
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
        <h2>Cuéntanos sobre ti</h2>
        <p class="muted small onb-sub">Nos ayuda a calcular tu plan y tu carga de entrenamiento.</p>
        <label>Nombre</label><input id="onb-name" value="${esc(d.name)}">
        <label>Apellidos</label><input id="onb-lastname" value="${esc(d.last_name)}">
        <label>Fecha de nacimiento</label><input id="onb-birth" type="date" value="${d.birth_date || ''}">
        <div class="row">
          <div><label>Peso actual (kg)</label><input id="onb-weight" type="number" value="${d.weight_kg}"></div>
          <div><label>Altura (cm)</label><input id="onb-height" type="number" value="${d.height_cm}"></div>
        </div>
      </div>
      <div class="onb-actions"><button class="primary" style="width:100%" onclick="Onboarding.next()">Siguiente</button></div>
    `;
  },
  renderDisponibilidad() {
    const d = this.data;
    return `
      <div class="onb-step">
        <h2>Tu disponibilidad</h2>
        <p class="muted small onb-sub">Es orientativo: podrás cambiarlo cuando quieras desde Ajustes. Minutos que puedes dedicar cada día (0 = descanso fijo).</p>
        ${DIAS.map((day, i) => `<label>${day}</label><input type="number" class="onb-avail" data-i="${i}" value="${d.availability[i]}">`).join('')}
        <label>Horas máximas por semana</label><input id="onb-maxh" type="number" value="${d.max_week_hours}">
      </div>
      <div class="onb-actions">
        <button onclick="Onboarding.back()">Atrás</button>
        <button class="primary" onclick="Onboarding.next()">Siguiente</button>
      </div>
    `;
  },
  renderObjetivo() {
    const d = this.data;
    return `
      <div class="onb-step">
        <h2>Tu objetivo</h2>
        <p class="muted small onb-sub">¿Qué carrera quieres preparar? Puedes dejarlo en blanco y añadirlo luego desde Plan → Carreras.</p>
        <label>Nombre de la carrera</label><input id="onb-rname" value="${esc(d.race_name)}" placeholder="ej: CDH 110K - Val d'Aran by UTMB">
        <label>Fecha</label><input id="onb-rdate" type="date" value="${d.race_date}">
        <div class="row">
          <div><label>Distancia (km)</label><input id="onb-rdist" type="number" value="${d.race_distance_km}"></div>
          <div><label>D+ (m)</label><input id="onb-rdplus" type="number" value="${d.race_dplus_m}"></div>
        </div>
        <label>Tu objetivo de tiempo (horas, opcional)</label><input id="onb-rtarget" type="number" step="0.1" value="${d.race_target_h}" placeholder="ej: 22">
      </div>
      <div class="onb-actions">
        <button onclick="Onboarding.back()">Atrás</button>
        <button class="primary" onclick="Onboarding.finish()">Terminar</button>
      </div>
    `;
  },
  collect() {
    const d = this.data, step = this.steps[this.step];
    if (step === 'perfil') {
      d.name = $('#onb-name').value.trim(); d.last_name = $('#onb-lastname').value.trim();
      d.birth_date = $('#onb-birth').value || null; d.weight_kg = $('#onb-weight').value; d.height_cm = $('#onb-height').value;
    } else if (step === 'disponibilidad') {
      d.availability = $$('.onb-avail').map(i => +i.value || 0); d.max_week_hours = $('#onb-maxh').value;
    } else if (step === 'objetivo') {
      d.race_name = $('#onb-rname').value.trim(); d.race_date = $('#onb-rdate').value;
      d.race_distance_km = $('#onb-rdist').value; d.race_dplus_m = $('#onb-rdplus').value; d.race_target_h = $('#onb-rtarget').value;
    }
  },
  next() { this.collect(); this.step++; this.render(); },
  back() { this.collect(); this.step--; this.render(); },
  async finish() {
    this.collect();
    const d = this.data;
    const btn = event.target; btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      await put('/settings', {
        athlete_name: d.name, last_name: d.last_name, birth_date: d.birth_date || null,
        weight_kg: +d.weight_kg || 70, height_cm: d.height_cm ? +d.height_cm : null,
        availability: d.availability, max_week_hours: +d.max_week_hours || 14,
        onboarding_done: true,
      });
      if (d.race_name && d.race_date) {
        await post('/races', {
          name: d.race_name, date: d.race_date, priority: 'A',
          distance_km: d.race_distance_km ? +d.race_distance_km : null,
          dplus_m: d.race_dplus_m ? +d.race_dplus_m : null,
          target_time_h: d.race_target_h ? +d.race_target_h : null,
        });
        try { await post('/plan/generate', {}); } catch {}
      }
      enterApp();
    } catch (e) { toast('Error: ' + e.message); btn.disabled = false; btn.textContent = 'Terminar'; }
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
    if (r.imported) { toast(`${r.imported} actividad(es) de Strava sincronizadas`); if (currentTab === 'hoy') render('hoy'); if (currentTab === 'historial') render('historial'); }
    if (r.unlogged_nutrition && r.unlogged_nutrition.length) postSyncNutritionPrompt(r.unlogged_nutrition);
  } catch {}
}
// Registro del service worker + detección automática de nueva versión: en cuanto hay una
// versión nueva instalada, le pedimos que tome el control ya y recargamos la página una vez,
// para que el móvil (donde el usuario casi nunca cierra la pestaña) siempre acabe viendo lo último.
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(reg => {
    // Si ya hay una versión esperando (instalada mientras la app no estaba abierta), actívala ya.
    if (reg.waiting) reg.waiting.postMessage('skipWaiting');
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) sw.postMessage('skipWaiting');
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
async function boot() {
  if (!Auth.token) { showLogin(); return; }
  let me;
  try { me = await get('/me'); }
  catch (e) { showLogin(); return; }
  const billingParam = new URLSearchParams(location.search).get('billing');
  if (billingParam) {
    history.replaceState(null, '', location.pathname);
    if (billingParam === 'ok') toast('¡Gracias! Tu suscripción está activa.');
  }
  if (me.billing && me.billing.configured && !me.billing.allowed) { showPaywall(me.billing); return; }
  updateProfileBtn(me.avatar);
  let s = null;
  try { s = await get('/settings'); } catch {}
  if (s && !s.onboarding_done) { Onboarding.start(me.name || s.athlete_name || ''); return; }
  enterApp();
}
$('#loginPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') Auth.login(); });
$('#signupPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') Auth.signup(); });
boot();
