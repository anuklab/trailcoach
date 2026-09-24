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
  async login() {
    const pass = $('#loginPass').value;
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pass }) });
      const d = await r.json();
      if (!r.ok) { $('#loginErr').textContent = d.error || 'Error'; return; }
      Auth.token = d.token; localStorage.setItem('tc_token', d.token);
      boot();
    } catch (e) { $('#loginErr').textContent = 'No se pudo conectar con el servidor.'; }
  },
};

async function api(path, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  if (Auth.token) headers.authorization = `Bearer ${Auth.token}`;
  const r = await fetch('/api' + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (r.status === 401) { Auth.token = null; localStorage.removeItem('tc_token'); showLogin(); throw new Error('No autenticado'); }
  const isJson = (r.headers.get('content-type') || '').includes('json');
  const d = isJson ? await r.json() : await r.text();
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

    <div class="stat-grid card tight">
      <div class="stat"><div class="v">${fitness.ctl}</div><div class="l">Forma</div></div>
      <div class="stat"><div class="v">${fitness.atl}</div><div class="l">Fatiga</div></div>
      <div class="stat"><div class="v" style="color:${tsbColor}">${tsb > 0 ? '+' : ''}${tsb}</div><div class="l">${tsbLabel}</div></div>
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
      <button class="primary" style="width:100%;margin-top:6px" onclick="Checkin.open('${date}')">Hacer check-in</button>
    </div>` : `
    <div class="card tight" style="display:flex;justify-content:space-between;align-items:center">
      <span class="small muted">Check-in de hoy hecho</span>
      <button class="ghost" onclick="Checkin.open('${date}')">Editar</button>
    </div>`}

    <div class="card" style="margin-top:4px">
      <h2>Entreno de hoy</h2>
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

    <div class="card">
      <h2>Pídele algo al entrenador</h2>
      <p class="muted small">Ej: "esta semana solo puedo 3 días", "múdame la tirada larga al domingo", "tengo una boda el sábado que viene".</p>
      <textarea id="freeAsk" placeholder="Escribe tu petición…"></textarea>
      <button class="primary" style="width:100%;margin-top:6px" onclick="freeAsk()">Enviar</button>
      <div id="freeAskResult"></div>
    </div>
  `;
}

function sessionCard(s) {
  const badge = s.status === 'done' ? '<span class="pill done">Hecho</span>' : s.status === 'partial' ? '<span class="pill partial">Parcial</span>'
    : s.status === 'missed' ? '<span class="pill missed">No hecho</span>' : '';
  const key = s.key ? '<span class="pill key">Clave</span>' : '';
  const zones = zoneBar(s.zone);
  const changeNote = s.change_note ? `<p class="small" style="color:var(--accent2)">${icon('edit')} ${esc(s.change_note)}</p>` : '';
  return `<div class="session ${s.type === 'rest' ? 'rest' : ''}" data-id="${s.id}">
    <div class="head">
      <div><strong class="stype">${icon(TYPE_ICON[s.type] || 'wave')} ${esc(s.title)}</strong>${changeNote}</div>
      <div>${key}${badge}</div>
    </div>
    <div class="desc">${esc(s.description || '')}</div>
    <div class="meta">
      ${s.duration_min ? `<span>${hm(s.duration_min)}</span>` : ''}
      ${s.dplus_m ? `<span>${Math.round(s.dplus_m)} m D+</span>` : ''}
      ${s.zone && s.zone !== '-' ? `<span>${s.zone}</span>` : ''}
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
  state: { fatigue: 2, legs_heavy: false, bad_sleep: false, sick: false, pain: '', available_min: null, note: '' },
  open(date) {
    this.date = date;
    const bg = openModal(`
      <button class="ghost close-x" onclick="closeModals()">${icon('x')}</button>
      <h2>Check-in — ${fmtDateLong(date)}</h2>
      <label>Nivel de fatiga general</label>
      <div class="chip-row" id="ci-fatigue">
        ${['A tope', 'Bien', 'Normal', 'Cansado', 'Muy cansado'].map((t, i) => `<div class="chip" data-v="${i}">${t}</div>`).join('')}
      </div>
      <label>¿Cómo notas las piernas?</label>
      <div class="chip-row" id="ci-legs">
        <div class="chip" data-v="0">Normales</div><div class="chip" data-v="1">Pesadas</div>
      </div>
      <label>¿Has dormido mal?</label>
      <div class="chip-row" id="ci-sleep"><div class="chip" data-v="0">No</div><div class="chip" data-v="1">Sí</div></div>
      <label>¿Estás enfermo o con molestia/dolor?</label>
      <div class="chip-row" id="ci-sick"><div class="chip" data-v="0">No</div><div class="chip" data-v="1">Enfermo</div><div class="chip" data-v="2">Dolor/molestia</div></div>
      <div id="painField" style="display:none"><label>¿Dónde te duele?</label><input id="ci-pain" placeholder="ej: rodilla derecha"></div>
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
        this.state[key] = c.classList.contains('selected') ? +c.dataset.v : (key === 'fatigue' ? 2 : 0);
        if (id === 'ci-sick') $('#painField').style.display = this.state.sick === 2 ? 'block' : 'none';
      }));
    };
    wire('ci-fatigue', 'fatigue'); wire('ci-legs', 'legs_heavy'); wire('ci-sleep', 'bad_sleep'); wire('ci-sick', 'sick');
    bg.querySelectorAll('#ci-fatigue .chip')[2].classList.add('selected');
  },
  async submit() {
    const st = this.state;
    const body = {
      date: this.date,
      fatigue: st.fatigue, legs_heavy: !!st.legs_heavy, bad_sleep: !!st.bad_sleep,
      sick: st.sick === 1, pain: st.sick === 2 ? ($('#ci-pain').value || 'molestia') : '',
      available_min: $('#ci-time').value ? +$('#ci-time').value : null,
      note: $('#ci-note').value,
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
async function loadKnowledge() {
  try {
    const k = await get('/knowledge');
    NUTRITION_TEXT = { carbs: k.nutrition.carbs.summary, sodium: k.nutrition.sodium.summary, gut: k.nutrition.gut_training.summary };
    window.__STRENGTH_LIB = k.strength_library;
  } catch {}
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
    </div>
    <div class="card">
      <h2>Carreras anteriores</h2>
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
    <div class="card">
      <h2>Actividades recientes</h2>
      <div id="recentActs" class="small muted">Cargando…</div>
    </div>
  `;
  get('/activities?' + new URLSearchParams({ from: addDays(todayStr(), -30), to: todayStr() }))
    .then(acts => {
      $('#recentActs').innerHTML = acts.length ? `<table class="simple">
        <tr><th>Fecha</th><th>Actividad</th><th>Km</th><th>D+</th><th>Carga</th></tr>
        ${acts.slice(0, 20).map(a => `<tr><td>${fmtDate(a.date)}</td><td>${esc(a.name || a.sport_type)}</td>
          <td>${a.distance_m ? (a.distance_m / 1000).toFixed(1) : '-'}</td><td>${a.elevation_gain_m ? Math.round(a.elevation_gain_m) : '-'}</td>
          <td>${Math.round(a.load || 0)}</td></tr>`).join('')}
      </table>` : '<p>Sin actividades sincronizadas todavía.</p>';
    });
}
async function stravaConnect() { const { url } = await get('/strava/connect'); window.open(url, '_blank'); }
async function stravaSync(full) { toast('Sincronizando…'); const r = await post('/strava/sync', { full }); toast(`${r.imported} actividades importadas`); renderHistorial(); }
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
  const series = await get(`/fitness?from=${from}&to=${to}`);
  el.innerHTML = `<h1>Análisis</h1><div class="card">${fitnessChart(series)}</div>
    <div class="card">
      <h3>Cómo leerlo</h3>
      <p class="small muted"><span style="color:var(--accent)">Forma (CTL)</span>: tu nivel de entrenamiento acumulado (media de 42 días).
      <span style="color:var(--danger)">Fatiga (ATL)</span>: carga reciente (media de 7 días).
      Frescura (TSB) = Forma − Fatiga: positivo es fresco, muy negativo indica riesgo de sobrecarga.</p>
    </div>
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
  const [s, k] = await Promise.all([get('/settings'), get('/knowledge')]);
  const lib = k.strength_library;
  const theme = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  el.innerHTML = `
    <h1>Perfil y ajustes</h1>
    <div class="card">
      <h2>Corredor</h2>
      <label>Nombre</label><input id="s-name" value="${esc(s.athlete_name || '')}" placeholder="Tu nombre">
      <label>Apariencia</label>
      <div class="theme-toggle">
        <button type="button" data-theme="dark" class="${theme === 'dark' ? 'active' : ''}" onclick="setTheme('dark')">${icon('moon')} Noche</button>
        <button type="button" data-theme="light" class="${theme === 'light' ? 'active' : ''}" onclick="setTheme('light')">${icon('sun')} Día</button>
      </div>
    </div>
    <div class="card">
      <h2>Disponibilidad semanal</h2>
      <p class="muted small">Minutos que puedes dedicar cada día (0 = descanso fijo).</p>
      ${DIAS.map((d, i) => `<label>${d}</label><input type="number" class="avail" data-i="${i}" value="${s.availability[i]}">`).join('')}
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
      <h2>Sesión</h2>
      <button class="danger" style="width:100%" onclick="logout()">Cerrar sesión</button>
    </div>
    <p class="small muted" style="text-align:center;margin-top:14px">TrailCoach · Adam Trail Academy · datos guardados en tu propio servidor</p>
  `;
  $$('#s-strengthmode .chip').forEach(c => c.addEventListener('click', () => {
    $$('#s-strengthmode .chip').forEach(x => x.classList.remove('selected')); c.classList.add('selected');
  }));
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

// ---------------- Boot ----------------
function showLogin() { $('#login').style.display = 'flex'; $('#app').style.display = 'none'; }
async function boot() {
  try { await get('/settings'); }
  catch (e) { showLogin(); return; }
  $('#login').style.display = 'none'; $('#app').style.display = 'block';
  loadKnowledge();
  switchTab('hoy');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}
$('#loginPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') Auth.login(); });
boot();
