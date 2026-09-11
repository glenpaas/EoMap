// ═════════════════════════════ state ═════════════════════════════
const A = {
  token: localStorage.getItem('kylastusgraafik_token') || '',
  user: null,
  route: 'dashboard',
  stores: [],
  users: [],
  photos: { items: [], page: 1, pages: 1, total: 0, totalBytes: 0, selected: new Set() },
  visits: { items: [], page: 1, pages: 1, total: 0 },
  filters: {
    photos: { storeId: '', kind: '', userId: '', from: '', to: '', q: '' },
    visits: { storeId: '', userId: '', from: '', to: '', q: '' },
  },
  lightbox: { list: [], index: 0 },
};

const $ = (sel) => document.querySelector(sel);
const main = $('#main');

// ═════════════════════════════ helpers ═════════════════════════════
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function fd(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function ft(d) {
  if (!d) return '--:--';
  const x = new Date(d);
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}
function fdt(d) {
  return d ? `${fd(d)} ${ft(d)}` : '—';
}
function dur(a, b) {
  if (!a || !b) return null;
  const m = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}t ${m % 60}min` : `${m} min`;
}
function bytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}
function eur(n) {
  return `${(Number(n) || 0).toFixed(2)} €`;
}
function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
/** Images and downloads cannot send an Authorization header, so sign the URL. */
function authUrl(url) {
  return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(A.token);
}

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (A.token) headers.Authorization = `Bearer ${A.token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(`/api${path}`, { ...opts, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Sessioon on aegunud');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Viga ${res.status}`);
  return data;
}

function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== '' && v != null) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ═════════════════════════════ modal ═════════════════════════════
function openModal(html, { wide = false } = {}) {
  $('#modal').className = `modal${wide ? ' wide' : ''}`;
  $('#modal').innerHTML = html;
  $('#modalWrap').hidden = false;
}
function closeModal() {
  $('#modalWrap').hidden = true;
  $('#modal').innerHTML = '';
}
$('#modalWrap').addEventListener('click', (e) => {
  if (e.target === $('#modalWrap')) closeModal();
});

function confirmDialog(title, message, confirmLabel = 'Kustuta') {
  return new Promise((resolve) => {
    openModal(`
      <div class="modal-head"><div><div class="modal-title">${esc(title)}</div></div></div>
      <div class="modal-body"><div style="font-size:14px;color:var(--t2);line-height:1.55">${esc(message)}</div></div>
      <div class="modal-foot">
        <button class="btn btn-outline" data-x="no">Loobu</button>
        <button class="btn btn-danger" data-x="yes">${esc(confirmLabel)}</button>
      </div>`);
    $('#modal').querySelector('[data-x="no"]').onclick = () => { closeModal(); resolve(false); };
    $('#modal').querySelector('[data-x="yes"]').onclick = () => { closeModal(); resolve(true); };
  });
}

// ═════════════════════════════ lightbox ═════════════════════════════
function openLightbox(list, index) {
  A.lightbox = { list, index };
  paintLightbox();
  $('#lightbox').hidden = false;
}
function paintLightbox() {
  const p = A.lightbox.list[A.lightbox.index];
  if (!p) return;
  $('#lbImg').src = authUrl(p.url);
  const bits = [p.storeName, p.originalName, fdt(p.createdAt), bytes(p.size)].filter(Boolean);
  $('#lbCap').textContent = `${A.lightbox.index + 1} / ${A.lightbox.list.length}  ·  ${bits.join('  ·  ')}`;
  const many = A.lightbox.list.length > 1;
  $('#lbPrev').hidden = !many;
  $('#lbNext').hidden = !many;
}
function stepLightbox(d) {
  const n = A.lightbox.list.length;
  if (!n) return;
  A.lightbox.index = (A.lightbox.index + d + n) % n;
  paintLightbox();
}
$('#lbClose').onclick = () => { $('#lightbox').hidden = true; };
$('#lbPrev').onclick = (e) => { e.stopPropagation(); stepLightbox(-1); };
$('#lbNext').onclick = (e) => { e.stopPropagation(); stepLightbox(1); };
$('#lightbox').addEventListener('click', (e) => {
  if (e.target === $('#lightbox') || e.target.classList.contains('lb-figure')) $('#lightbox').hidden = true;
});
document.addEventListener('keydown', (e) => {
  if (!$('#lightbox').hidden) {
    if (e.key === 'Escape') $('#lightbox').hidden = true;
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
    return;
  }
  if (e.key === 'Escape' && !$('#modalWrap').hidden) closeModal();
});

// ═════════════════════════════ auth ═════════════════════════════
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#lgBtn');
  btn.disabled = true;
  $('#lgErr').textContent = '';
  try {
    const { token, user } = await api('/auth/login', {
      method: 'POST',
      body: { username: $('#lgUser').value, password: $('#lgPass').value },
    });
    if (user.role !== 'admin') throw new Error('Haldusliidesesse pääsevad ainult administraatorid');
    A.token = token;
    A.user = user;
    localStorage.setItem('kylastusgraafik_token', token);
    await boot();
  } catch (err) {
    $('#lgErr').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

function logout() {
  A.token = '';
  A.user = null;
  localStorage.removeItem('kylastusgraafik_token');
  $('#shell').hidden = true;
  $('#login').hidden = false;
  $('#lgPass').value = '';
}
$('#logoutBtn').onclick = logout;

// ═════════════════════════════ routing ═════════════════════════════
const ROUTES = { dashboard: viewDashboard, photos: viewPhotos, visits: viewVisits, stores: viewStores, users: viewUsers };

function navigate(route) {
  if (!ROUTES[route]) route = 'dashboard';
  A.route = route;
  location.hash = route;
  document.querySelectorAll('.side-btn').forEach((b) => b.classList.toggle('active', b.dataset.route === route));
  main.innerHTML = `<div class="loading"><div class="spinner"></div>Laen…</div>`;
  ROUTES[route]().catch((err) => {
    main.innerHTML = `<div class="empty"><div class="empty-ico">⚠️</div><div class="empty-t">${esc(err.message)}</div></div>`;
  });
}
$('#sideNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.side-btn');
  if (btn) navigate(btn.dataset.route);
});
window.addEventListener('hashchange', () => {
  const r = location.hash.slice(1);
  if (r && r !== A.route) navigate(r);
});

// ═════════════════════════════ dashboard ═════════════════════════════
async function viewDashboard() {
  const { totals, perDay, topStores, byUser, deliveries } = await api('/stats/overview');

  const delMap = Object.fromEntries(deliveries.map((d) => [d.status, d.n]));
  const maxDay = Math.max(1, ...perDay.map((d) => d.n));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.push({ day: key, n: perDay.find((d) => d.day === key)?.n || 0 });
  }
  const maxStore = Math.max(1, ...topStores.map((s) => s.visits));
  const maxUser = Math.max(1, ...byUser.map((u) => u.visits));

  const bar = (rows, max, accent) =>
    rows.length
      ? `<div class="bars">${rows
          .map(
            (r) => `<div class="bar-row">
        <div>
          <div class="bar-name">${esc(r.name)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(r.visits / max) * 100}%;background:${accent}"></div></div>
        </div>
        <div class="bar-num">${r.visits}</div>
      </div>`
          )
          .join('')}</div>`
      : `<div style="color:var(--t3);font-size:13px;text-align:center;padding:18px">Andmed puuduvad</div>`;

  main.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Ülevaade</div>
        <div class="page-sub">Külastusgraafik — poodide külastustarkvara — kogu tegevus ühel pilgul</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" onclick="navigate('photos')">Ava galerii</button>
        <button class="btn btn-primary btn-sm" onclick="navigate('visits')">Vaata külastusi</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat">
        <div class="stat-label">Külastused</div>
        <div class="stat-value">${totals.visits}</div>
        <div class="stat-note">${totals.active_visits ? `${totals.active_visits} praegu aktiivset` : 'Kõik lõpetatud'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Pildid</div>
        <div class="stat-value" style="color:var(--inf)">${totals.photos}</div>
        <div class="stat-note">${bytes(totals.photo_bytes)} kettal</div>
      </div>
      <div class="stat">
        <div class="stat-label">Tellimused</div>
        <div class="stat-value" style="color:var(--a)">${eur(totals.order_total)}</div>
        <div class="stat-note">${totals.orders} rida kokku</div>
      </div>
      <div class="stat">
        <div class="stat-label">Poed</div>
        <div class="stat-value">${totals.stores}</div>
        <div class="stat-note">${totals.users} aktiivset kasutajat</div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:14px">
      <div class="panel-head">
        <div class="panel-title">Külastused viimase 30 päeva jooksul</div>
        <span class="pill pill-mute">${days.reduce((s, d) => s + d.n, 0)} kokku</span>
      </div>
      <div class="panel-body">
        <div class="spark">
          ${days
            .map(
              (d) =>
                `<div class="spark-col" data-n="${d.n}" style="height:${Math.max(2, (d.n / maxDay) * 100)}%" title="${d.day}: ${d.n} külastust"></div>`
            )
            .join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-top:8px">
          <span>${fd(days[0].day)}</span><span>${fd(days[days.length - 1].day)}</span>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Poed külastuste järgi</div></div>
        <div class="panel-body">${bar(topStores, maxStore, 'var(--a)')}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="panel-title">Kasutajad</div></div>
        <div class="panel-body">${bar(byUser, maxUser, 'var(--inf)')}</div>
      </div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="panel-head"><div class="panel-title">Tarnestaatused</div></div>
      <div class="panel-body">
        <div class="stat-grid" style="margin:0">
          <div class="stat" style="background:var(--okd);border-color:transparent">
            <div class="stat-label" style="color:var(--ok)">Tarnitud</div>
            <div class="stat-value" style="color:var(--ok)">${delMap.delivered || 0}</div>
          </div>
          <div class="stat" style="background:var(--ad);border-color:transparent">
            <div class="stat-label" style="color:var(--a)">Osaline</div>
            <div class="stat-value" style="color:var(--a)">${delMap.partial || 0}</div>
          </div>
          <div class="stat" style="background:var(--errd);border-color:transparent">
            <div class="stat-label" style="color:var(--err)">Keeldutud</div>
            <div class="stat-value" style="color:var(--err)">${delMap.rejected || 0}</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ═════════════════════════════ photos ═════════════════════════════
function storeOptions(selected, label = 'Kõik poed') {
  return (
    `<option value="">${label}</option>` +
    A.stores.map((s) => `<option value="${s.id}"${s.id === selected ? ' selected' : ''}>${esc(s.name)}</option>`).join('')
  );
}
function userOptions(selected, label = 'Kõik kasutajad') {
  return (
    `<option value="">${label}</option>` +
    A.users.map((u) => `<option value="${u.id}"${u.id === selected ? ' selected' : ''}>${esc(u.name)}</option>`).join('')
  );
}

async function viewPhotos() {
  const f = A.filters.photos;
  const data = await api(`/photos${qs({ ...f, page: A.photos.page, limit: 60 })}`);
  A.photos = { ...data, items: data.photos, selected: A.photos.selected };

  const kindPill = { before: ['pill-inf', 'Enne'], after: ['pill-pur', 'Pärast'], library: ['pill-mute', 'Fail'] };

  const cells = data.photos
    .map((p, i) => {
      const [cls, label] = kindPill[p.kind] || kindPill.before;
      const sel = A.photos.selected.has(p.id);
      return `<div class="gcell${sel ? ' selected' : ''}" data-id="${p.id}">
        <div class="gcell-img" data-lb="${i}">
          <img loading="lazy" src="${authUrl(p.thumbUrl)}" alt="${esc(p.originalName || '')}">
        </div>
        <div class="gcell-tags"><span class="pill ${cls}">${label}</span></div>
        <div class="gcell-tools">
          <button class="gtool${sel ? ' on' : ''}" data-act="select" title="Vali">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <a class="gtool" href="${authUrl(p.url + '?download=1')}" title="Laadi alla" download>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button class="gtool danger" data-act="del" title="Kustuta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
        <div class="gcell-body">
          <div class="gcell-title">${esc(p.storeName || p.originalName || 'Pilt')}</div>
          <div class="gcell-meta">
            <span>${fdt(p.visitDate || p.createdAt)}</span>
            <span>·</span>
            <span>${bytes(p.size)}</span>
          </div>
          <div class="gcell-meta">${esc(p.userName || '')}${p.visitId ? ` · <a href="#" data-act="visit" data-visit="${p.visitId}">raport ↗</a>` : ''}</div>
        </div>
      </div>`;
    })
    .join('');

  main.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Failid ja pildid</div>
        <div class="page-sub">${data.total} faili · ${bytes(data.totalBytes)} kettaruumi</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="clearFilters">Puhasta filtrid</button>
        <button class="btn btn-primary btn-sm" id="uploadBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Laadi üles
        </button>
      </div>
    </div>

    <div class="dropzone" id="dropzone">Lohista pildid siia või <strong style="color:var(--a)">vali failid</strong> — need lisatakse failikogusse</div>
    <input type="file" id="fileInput" accept="image/*" multiple hidden>

    <div class="filters">
      <input class="inp filter-search" id="fq" placeholder="Otsi faili nime, kirjelduse või poe järgi…" value="${esc(f.q)}">
      <select class="sel" id="fStore">${storeOptions(f.storeId)}</select>
      <select class="sel" id="fUser">${userOptions(f.userId)}</select>
      <div class="chips" id="fKind">
        ${[['', 'Kõik'], ['before', 'Enne'], ['after', 'Pärast'], ['library', 'Failid']]
          .map(([v, l]) => `<button class="chip${f.kind === v ? ' active' : ''}" data-k="${v}">${l}</button>`)
          .join('')}
      </div>
      <input class="inp" id="fFrom" type="date" value="${f.from}" title="Alates">
      <input class="inp" id="fTo" type="date" value="${f.to}" title="Kuni">
    </div>

    <div id="selbarSlot"></div>

    ${
      data.photos.length
        ? `<div class="gallery" id="gallery">${cells}</div>`
        : `<div class="empty"><div class="empty-ico">🖼️</div><div class="empty-t">Pilte ei leitud</div><div class="empty-s">Muuda filtreid või laadi mobiilirakendusest külastus üles</div></div>`
    }
    ${pagerHtml(data.page, data.pages, 'photos')}`;

  paintSelbar();

  // filters
  const rerun = () => { A.photos.page = 1; viewPhotos(); };
  let t;
  $('#fq').oninput = (e) => { clearTimeout(t); f.q = e.target.value; t = setTimeout(rerun, 320); };
  $('#fStore').onchange = (e) => { f.storeId = e.target.value; rerun(); };
  $('#fUser').onchange = (e) => { f.userId = e.target.value; rerun(); };
  $('#fFrom').onchange = (e) => { f.from = e.target.value; rerun(); };
  $('#fTo').onchange = (e) => { f.to = e.target.value; rerun(); };
  $('#fKind').onclick = (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    f.kind = c.dataset.k;
    rerun();
  };
  $('#clearFilters').onclick = () => {
    A.filters.photos = { storeId: '', kind: '', userId: '', from: '', to: '', q: '' };
    rerun();
  };

  // upload
  const fileInput = $('#fileInput');
  const dz = $('#dropzone');
  $('#uploadBtn').onclick = () => fileInput.click();
  dz.onclick = () => fileInput.click();
  fileInput.onchange = () => uploadFiles([...fileInput.files]);
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); })
  );
  dz.addEventListener('drop', (e) => uploadFiles([...e.dataTransfer.files]));

  // gallery interactions
  const gallery = $('#gallery');
  if (gallery) {
    gallery.addEventListener('click', async (e) => {
      const cell = e.target.closest('.gcell');
      if (!cell) return;
      const id = cell.dataset.id;
      const act = e.target.closest('[data-act]')?.dataset.act;

      if (act === 'select') {
        A.photos.selected.has(id) ? A.photos.selected.delete(id) : A.photos.selected.add(id);
        cell.classList.toggle('selected');
        cell.querySelector('[data-act="select"]').classList.toggle('on');
        paintSelbar();
        return;
      }
      if (act === 'del') {
        const ok = await confirmDialog('Kustuta pilt', 'Pilt kustutatakse jäädavalt nii andmebaasist kui kettalt.');
        if (!ok) return;
        await api(`/photos/${id}`, { method: 'DELETE' });
        A.photos.selected.delete(id);
        toast('Pilt kustutatud', 'ok');
        viewPhotos();
        return;
      }
      if (act === 'visit') {
        e.preventDefault();
        showReport(e.target.closest('[data-visit]').dataset.visit);
        return;
      }
      const lb = e.target.closest('[data-lb]');
      if (lb) openLightbox(A.photos.items, Number(lb.dataset.lb));
    });
  }
}

function paintSelbar() {
  const slot = $('#selbarSlot');
  if (!slot) return;
  const n = A.photos.selected.size;
  if (!n) {
    slot.innerHTML = '';
    return;
  }
  slot.innerHTML = `<div class="selbar">
    <span class="selbar-text">${n} pilti valitud</span>
    <button class="btn btn-ghost btn-sm" id="selNone">Tühista valik</button>
    <button class="btn btn-danger btn-sm" id="selDel">Kustuta valitud</button>
  </div>`;
  $('#selNone').onclick = () => { A.photos.selected.clear(); viewPhotos(); };
  $('#selDel').onclick = async () => {
    const ok = await confirmDialog('Kustuta valitud pildid', `${n} pilti kustutatakse jäädavalt. Seda ei saa tagasi võtta.`);
    if (!ok) return;
    const { removed } = await api('/photos/bulk-delete', { method: 'POST', body: { ids: [...A.photos.selected] } });
    A.photos.selected.clear();
    toast(`${removed} pilti kustutatud`, 'ok');
    viewPhotos();
  };
}

async function uploadFiles(files) {
  const images = files.filter((f) => f.type.startsWith('image/'));
  if (!images.length) return;
  let done = 0;
  toast(`Laen üles ${images.length} faili…`);
  for (const file of images) {
    const form = new FormData();
    form.append('photo', file);
    form.append('kind', 'library');
    if (A.filters.photos.storeId) form.append('storeId', A.filters.photos.storeId);
    try {
      await api('/photos', { method: 'POST', body: form });
      done++;
    } catch (err) {
      toast(`${file.name}: ${err.message}`, 'err');
    }
  }
  if (done) toast(`${done} faili üles laaditud`, 'ok');
  viewPhotos();
}

function pagerHtml(page, pages, kind) {
  if (pages <= 1) return '';
  return `<div class="pager">
    <button class="btn btn-ghost btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="goPage('${kind}',${page - 1})">← Eelmine</button>
    <span>Lehekülg ${page} / ${pages}</span>
    <button class="btn btn-ghost btn-sm" ${page >= pages ? 'disabled' : ''} onclick="goPage('${kind}',${page + 1})">Järgmine →</button>
  </div>`;
}
function goPage(kind, page) {
  A[kind].page = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  kind === 'photos' ? viewPhotos() : viewVisits();
}

// ═════════════════════════════ visits ═════════════════════════════
async function viewVisits() {
  const f = A.filters.visits;
  const data = await api(`/visits${qs({ ...f, page: A.visits.page, limit: 40 })}`);
  A.visits = { ...data, items: data.visits };

  const rows = data.visits
    .map((v) => {
      const d = dur(v.check_in_time, v.check_out_time);
      return `<tr class="row-link" data-id="${v.id}">
      <td>
        <div class="cell-stack">
          <span class="td-strong">${esc(v.store_name)}</span>
          <span class="cell-sub">${esc(v.user_name)}</span>
        </div>
      </td>
      <td class="td-mute">
        <div class="cell-stack">
          <span>${fd(v.check_in_time)}</span>
          <span class="cell-sub mono">${ft(v.check_in_time)}–${ft(v.check_out_time)}${d ? ` · ${d}` : ''}</span>
        </div>
      </td>
      <td>${v.photo_count ? `<span class="pill pill-inf">${v.photo_count}</span>` : '<span class="td-mute">—</span>'}</td>
      <td>${v.order_count ? `<span class="pill pill-ok">${v.order_count} · ${eur(v.order_total)}</span>` : '<span class="td-mute">—</span>'}</td>
      <td>${v.delivery_count ? `<span class="pill pill-warn">${v.delivery_count}</span>` : '<span class="td-mute">—</span>'}</td>
      <td>${v.task_count ? `<span class="pill pill-mute">${v.task_done}/${v.task_count}</span>` : '<span class="td-mute">—</span>'}</td>
      <td>${v.status === 'active' ? '<span class="pill pill-warn">Aktiivne</span>' : '<span class="pill pill-ok">Lõpetatud</span>'}</td>
      <td class="td-actions">
        <a class="btn btn-ghost btn-sm" href="${authUrl(`/api/visits/${v.id}/export.csv`)}" onclick="event.stopPropagation()">CSV</a>
        <button class="btn btn-danger btn-sm" data-act="del">Kustuta</button>
      </td>
    </tr>`;
    })
    .join('');

  main.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Külastused</div>
        <div class="page-sub">${data.total} külastust — kliki reale, et avada täisraport</div>
      </div>
    </div>

    <div class="filters">
      <input class="inp filter-search" id="vq" placeholder="Otsi poe, kasutaja või märkmete järgi…" value="${esc(f.q)}">
      <select class="sel" id="vStore">${storeOptions(f.storeId)}</select>
      <select class="sel" id="vUser">${userOptions(f.userId)}</select>
      <input class="inp" id="vFrom" type="date" value="${f.from}" title="Alates">
      <input class="inp" id="vTo" type="date" value="${f.to}" title="Kuni">
      <button class="btn btn-outline btn-sm" id="vClear">Puhasta</button>
    </div>

    ${
      data.visits.length
        ? `<div class="panel"><div class="table-scroll"><table>
            <thead><tr>
              <th>Pood / kasutaja</th><th>Aeg</th><th>Fotod</th><th>Tellimused</th>
              <th>Tarne</th><th>Ülesanded</th><th>Staatus</th><th></th>
            </tr></thead>
            <tbody id="visitRows">${rows}</tbody>
          </table></div></div>`
        : `<div class="empty"><div class="empty-ico">📋</div><div class="empty-t">Külastusi ei leitud</div><div class="empty-s">Muuda filtreid või oota, kuni mobiilirakendus sünkroonib</div></div>`
    }
    ${pagerHtml(data.page, data.pages, 'visits')}`;

  const rerun = () => { A.visits.page = 1; viewVisits(); };
  let t;
  $('#vq').oninput = (e) => { clearTimeout(t); f.q = e.target.value; t = setTimeout(rerun, 320); };
  $('#vStore').onchange = (e) => { f.storeId = e.target.value; rerun(); };
  $('#vUser').onchange = (e) => { f.userId = e.target.value; rerun(); };
  $('#vFrom').onchange = (e) => { f.from = e.target.value; rerun(); };
  $('#vTo').onchange = (e) => { f.to = e.target.value; rerun(); };
  $('#vClear').onclick = () => {
    A.filters.visits = { storeId: '', userId: '', from: '', to: '', q: '' };
    rerun();
  };

  $('#visitRows')?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    if (e.target.closest('[data-act="del"]')) {
      const ok = await confirmDialog('Kustuta külastus', 'Külastus koos kõigi piltide, tellimuste ja tarnetega kustutatakse jäädavalt.');
      if (!ok) return;
      const { removedPhotos } = await api(`/visits/${tr.dataset.id}`, { method: 'DELETE' });
      toast(`Külastus kustutatud${removedPhotos ? ` (${removedPhotos} pilti)` : ''}`, 'ok');
      viewVisits();
      return;
    }
    showReport(tr.dataset.id);
  });
}

async function showReport(visitId) {
  openModal(`<div class="modal-body"><div class="loading"><div class="spinner"></div>Laen raportit…</div></div>`, { wide: true });
  const { visit: v } = await api(`/visits/${visitId}`);

  const before = v.photos.filter((p) => p.kind === 'before');
  const after = v.photos.filter((p) => p.kind === 'after');
  const total = v.orders.reduce((s, o) => s + o.qty * o.price, 0);
  const d = dur(v.checkIn?.time, v.checkOut?.time);
  const sLabel = { delivered: ['pill-ok', 'Tarnitud'], partial: ['pill-warn', 'Osaline'], rejected: ['pill-err', 'Keeldutud'] };

  const strip = (list, label) =>
    list.length
      ? `<div class="rep-sec-h" style="margin-top:12px"><span>${label} (${list.length})</span></div>
         <div class="rep-strip">${list
           .map((p) => `<img loading="lazy" src="${authUrl(p.thumbUrl)}" data-photo="${p.id}" alt="">`)
           .join('')}</div>`
      : '';

  openModal(
    `<div class="modal-head">
      <div>
        <div class="modal-title">${esc(v.storeName)}</div>
        <div class="modal-sub">${esc(v.userName)} · ${fd(v.checkIn?.time)}</div>
      </div>
      <span class="pill ${v.status === 'active' ? 'pill-warn' : 'pill-ok'}">${v.status === 'active' ? 'Aktiivne' : '✓ Lõpetatud'}</span>
    </div>
    <div class="modal-body">
      <div class="rep-grid">
        <div class="rep-box"><div class="rep-box-l">Check-in</div><div class="rep-box-v mono">${ft(v.checkIn?.time)}</div></div>
        <div class="rep-box"><div class="rep-box-l">Check-out</div><div class="rep-box-v mono">${ft(v.checkOut?.time)}</div></div>
        <div class="rep-box"><div class="rep-box-l">Kestus</div><div class="rep-box-v" style="color:var(--a)">${d || '—'}</div></div>
        <div class="rep-box"><div class="rep-box-l">Tellimused</div><div class="rep-box-v" style="color:var(--ok)">${eur(total)}</div></div>
      </div>

      ${
        v.checkIn?.gps || v.checkOut?.gps
          ? `<div class="rep-sec" style="display:flex;gap:8px;flex-wrap:wrap">
              ${v.checkIn?.gps ? `<span class="gps">📍 Sisse ${v.checkIn.gps.lat.toFixed(5)}, ${v.checkIn.gps.lng.toFixed(5)}</span>` : ''}
              ${v.checkOut?.gps ? `<span class="gps">📍 Välja ${v.checkOut.gps.lat.toFixed(5)}, ${v.checkOut.gps.lng.toFixed(5)}</span>` : ''}
              ${v.checkIn?.gps ? `<a class="gps" style="color:var(--a)" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${v.checkIn.gps.lat},${v.checkIn.gps.lng}">Ava kaardil ↗</a>` : ''}
            </div>`
          : ''
      }

      ${
        v.photos.length
          ? `<div class="rep-sec"><div class="rep-sec-h"><span>Fotod</span><span>${v.photos.length}</span></div>
             ${strip(before, 'Enne')}${strip(after, 'Pärast')}</div>`
          : ''
      }

      ${v.notes ? `<div class="rep-sec"><div class="rep-sec-h"><span>Märkmed</span></div><div class="rep-notes">${esc(v.notes)}</div></div>` : ''}

      ${
        v.tasks.length
          ? `<div class="rep-sec"><div class="rep-sec-h"><span>Ülesanded</span><span>${v.tasks.filter((t) => t.done).length}/${v.tasks.length}</span></div>
             ${v.tasks
               .map(
                 (t) => `<div class="rep-line">
                   <span style="${t.done ? 'text-decoration:line-through;color:var(--t3)' : ''}">
                     <span style="color:${t.done ? 'var(--ok)' : 'var(--t3)'};margin-right:7px">${t.done ? '✓' : '○'}</span>${esc(t.text)}
                   </span></div>`
               )
               .join('')}</div>`
          : ''
      }

      ${
        v.orders.length
          ? `<div class="rep-sec"><div class="rep-sec-h"><span>Tellimused</span><span>${eur(total)}</span></div>
             ${v.orders
               .map(
                 (o) => `<div class="rep-line">
                   <span>${esc(o.product)}${o.notes ? `<span class="cell-sub"> · ${esc(o.notes)}</span>` : ''}</span>
                   <span class="mono td-mute">${o.qty} ${esc(o.unit)}${o.price ? ` · ${eur(o.qty * o.price)}` : ''}</span>
                 </div>`
               )
               .join('')}</div>`
          : ''
      }

      ${
        v.deliveries.length
          ? `<div class="rep-sec"><div class="rep-sec-h"><span>Tarne</span><span>${v.deliveries.length}</span></div>
             ${v.deliveries
               .map((x) => {
                 const [cls, lbl] = sLabel[x.status] || sLabel.delivered;
                 return `<div class="rep-line">
                   <span>${esc(x.product)} <span class="td-mute mono">· ${x.qty} ${esc(x.unit)}</span>${x.notes ? `<span class="cell-sub"> · ${esc(x.notes)}</span>` : ''}</span>
                   <span class="pill ${cls}">${lbl}</span></div>`;
               })
               .join('')}</div>`
          : ''
      }
    </div>
    <div class="modal-foot">
      <a class="btn btn-outline" href="${authUrl(`/api/visits/${v.id}/export.csv`)}">Ekspordi CSV</a>
      <button class="btn btn-primary" onclick="closeModal()">Sulge</button>
    </div>`,
    { wide: true }
  );

  // Assigned, not added: openModal reuses the same #modal node on every report.
  $('#modal').onclick = (e) => {
    const img = e.target.closest('[data-photo]');
    if (img) openLightbox(v.photos, v.photos.findIndex((p) => p.id === img.dataset.photo));
  };
}

// ═════════════════════════════ stores ═════════════════════════════
async function viewStores() {
  const { stores } = await api('/stores?all=1');
  A.stores = stores.filter((s) => s.active);

  const rows = stores
    .map(
      (s) => `<tr data-id="${s.id}">
      <td>
        <div class="cell-stack">
          <span class="td-strong">${esc(s.name)}</span>
          ${s.address ? `<span class="cell-sub">${esc(s.address)}</span>` : ''}
        </div>
      </td>
      <td class="td-mute mono">${s.lat != null ? `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}` : '—'}</td>
      <td class="td-mute">${s.visit_count}</td>
      <td class="td-mute">${s.last_visit ? fd(s.last_visit) : '—'}</td>
      <td>${s.active ? '<span class="pill pill-ok">Aktiivne</span>' : '<span class="pill pill-mute">Peidetud</span>'}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" data-act="edit">Muuda</button>
        <button class="btn btn-danger btn-sm" data-act="del">${s.visit_count ? 'Peida' : 'Kustuta'}</button>
      </td>
    </tr>`
    )
    .join('');

  main.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Poed</div>
        <div class="page-sub">${stores.length} poodi — need ilmuvad mobiilirakenduse valikusse</div>
      </div>
      <div class="page-actions"><button class="btn btn-primary btn-sm" id="addStore">+ Lisa pood</button></div>
    </div>
    ${
      stores.length
        ? `<div class="panel"><div class="table-scroll"><table>
            <thead><tr><th>Pood</th><th>Koordinaadid</th><th>Külastusi</th><th>Viimati</th><th>Staatus</th><th></th></tr></thead>
            <tbody id="storeRows">${rows}</tbody></table></div></div>`
        : `<div class="empty"><div class="empty-ico">🏬</div><div class="empty-t">Poode pole</div></div>`
    }`;

  $('#addStore').onclick = () => storeForm(null);
  $('#storeRows')?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!tr || !act) return;
    const store = stores.find((s) => s.id === tr.dataset.id);
    if (act === 'edit') return storeForm(store);
    const ok = await confirmDialog(
      store.visit_count ? 'Peida pood' : 'Kustuta pood',
      store.visit_count
        ? `Poel on ${store.visit_count} külastust, seega see peidetakse (ajalugu säilib).`
        : 'Pood kustutatakse jäädavalt.',
      store.visit_count ? 'Peida' : 'Kustuta'
    );
    if (!ok) return;
    await api(`/stores/${store.id}`, { method: 'DELETE' });
    toast('Salvestatud', 'ok');
    viewStores();
  });
}

function storeForm(store) {
  const editing = !!store;
  openModal(`
    <div class="modal-head"><div><div class="modal-title">${editing ? 'Muuda poodi' : 'Lisa pood'}</div></div></div>
    <div class="modal-body">
      <label class="lbl" for="sName">Nimi</label>
      <input class="inp" id="sName" value="${esc(store?.name || '')}" placeholder="nt Rimi Sõle">
      <label class="lbl" for="sAddr">Aadress</label>
      <input class="inp" id="sAddr" value="${esc(store?.address || '')}" placeholder="Valikuline">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label class="lbl" for="sLat">Laiuskraad</label><input class="inp mono" id="sLat" value="${store?.lat ?? ''}" placeholder="59.4370"></div>
        <div><label class="lbl" for="sLng">Pikkuskraad</label><input class="inp mono" id="sLng" value="${store?.lng ?? ''}" placeholder="24.7536"></div>
      </div>
      ${editing ? `<label class="lbl" for="sActive">Staatus</label><select class="sel" id="sActive">
        <option value="1"${store.active ? ' selected' : ''}>Aktiivne</option>
        <option value="0"${!store.active ? ' selected' : ''}>Peidetud</option></select>` : ''}
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Loobu</button>
      <button class="btn btn-primary" id="sSave">Salvesta</button>
    </div>`);

  $('#sSave').onclick = async () => {
    const body = {
      name: $('#sName').value.trim(),
      address: $('#sAddr').value.trim(),
      lat: $('#sLat').value.trim(),
      lng: $('#sLng').value.trim(),
    };
    if (editing) body.active = $('#sActive').value === '1';
    if (!body.name) return toast('Nimi on kohustuslik', 'err');
    try {
      await api(editing ? `/stores/${store.id}` : '/stores', { method: editing ? 'PATCH' : 'POST', body });
      closeModal();
      toast('Salvestatud', 'ok');
      viewStores();
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

// ═════════════════════════════ users ═════════════════════════════
async function viewUsers() {
  const { users } = await api('/users');
  A.users = users;

  const rows = users
    .map(
      (u) => `<tr data-id="${u.id}">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="who-avatar">${esc(initials(u.name))}</div>
          <div class="cell-stack">
            <span class="td-strong">${esc(u.name)}</span>
            <span class="cell-sub mono">@${esc(u.username)}</span>
          </div>
        </div>
      </td>
      <td>${u.role === 'admin' ? '<span class="pill pill-warn">Administraator</span>' : '<span class="pill pill-inf">Välitöötaja</span>'}</td>
      <td class="td-mute">${u.visit_count}</td>
      <td class="td-mute">${u.last_visit ? fd(u.last_visit) : '—'}</td>
      <td>${u.active ? '<span class="pill pill-ok">Aktiivne</span>' : '<span class="pill pill-mute">Deaktiveeritud</span>'}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" data-act="edit">Muuda</button>
        <button class="btn btn-danger btn-sm" data-act="del" ${u.id === A.user.id ? 'disabled' : ''}>${u.visit_count ? 'Deaktiveeri' : 'Kustuta'}</button>
      </td>
    </tr>`
    )
    .join('');

  main.innerHTML = `
    <div class="page-head">
      <div>
        <div class="page-title">Kasutajad</div>
        <div class="page-sub">${users.length} kontot — välitöötajad logivad nendega mobiilirakendusse</div>
      </div>
      <div class="page-actions"><button class="btn btn-primary btn-sm" id="addUser">+ Lisa kasutaja</button></div>
    </div>
    <div class="panel"><div class="table-scroll"><table>
      <thead><tr><th>Kasutaja</th><th>Roll</th><th>Külastusi</th><th>Viimati</th><th>Staatus</th><th></th></tr></thead>
      <tbody id="userRows">${rows}</tbody></table></div></div>`;

  $('#addUser').onclick = () => userForm(null);
  $('#userRows').addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!tr || !act) return;
    const user = users.find((u) => u.id === tr.dataset.id);
    if (act === 'edit') return userForm(user);
    const ok = await confirmDialog(
      user.visit_count ? 'Deaktiveeri kasutaja' : 'Kustuta kasutaja',
      user.visit_count
        ? `Kasutajal on ${user.visit_count} külastust, seega konto deaktiveeritakse (ajalugu säilib).`
        : 'Konto kustutatakse jäädavalt.',
      user.visit_count ? 'Deaktiveeri' : 'Kustuta'
    );
    if (!ok) return;
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' });
      toast('Salvestatud', 'ok');
      viewUsers();
    } catch (err) {
      toast(err.message, 'err');
    }
  });
}

function userForm(user) {
  const editing = !!user;
  openModal(`
    <div class="modal-head"><div>
      <div class="modal-title">${editing ? 'Muuda kasutajat' : 'Lisa kasutaja'}</div>
      ${editing ? `<div class="modal-sub mono">@${esc(user.username)}</div>` : ''}
    </div></div>
    <div class="modal-body">
      <label class="lbl" for="uName">Nimi</label>
      <input class="inp" id="uName" value="${esc(user?.name || '')}" placeholder="nt Terje Tamm">
      ${
        editing
          ? ''
          : `<label class="lbl" for="uUser">Kasutajanimi</label>
             <input class="inp mono" id="uUser" placeholder="terje" autocapitalize="off">`
      }
      <label class="lbl" for="uPass">${editing ? 'Uus parool (jäta tühjaks, et mitte muuta)' : 'Parool'}</label>
      <input class="inp" id="uPass" type="text" placeholder="vähemalt 6 märki">
      <label class="lbl" for="uRole">Roll</label>
      <select class="sel" id="uRole">
        <option value="field"${user?.role !== 'admin' ? ' selected' : ''}>Välitöötaja — ainult mobiilirakendus</option>
        <option value="admin"${user?.role === 'admin' ? ' selected' : ''}>Administraator — ka haldusliides</option>
      </select>
      ${
        editing
          ? `<label class="lbl" for="uActive">Staatus</label><select class="sel" id="uActive">
              <option value="1"${user.active ? ' selected' : ''}>Aktiivne</option>
              <option value="0"${!user.active ? ' selected' : ''}>Deaktiveeritud</option></select>`
          : ''
      }
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" onclick="closeModal()">Loobu</button>
      <button class="btn btn-primary" id="uSave">Salvesta</button>
    </div>`);

  $('#uSave').onclick = async () => {
    const body = { name: $('#uName').value.trim(), role: $('#uRole').value };
    if (!editing) {
      body.username = $('#uUser').value.trim();
      body.password = $('#uPass').value;
      if (!body.username) return toast('Kasutajanimi on kohustuslik', 'err');
      if (body.password.length < 6) return toast('Parool peab olema vähemalt 6 märki', 'err');
    } else {
      body.active = $('#uActive').value === '1';
      if ($('#uPass').value) body.password = $('#uPass').value;
    }
    try {
      await api(editing ? `/users/${user.id}` : '/users', { method: editing ? 'PATCH' : 'POST', body });
      closeModal();
      toast('Salvestatud', 'ok');
      viewUsers();
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

// ═════════════════════════════ boot ═════════════════════════════
async function boot() {
  const { user } = await api('/auth/me');
  A.user = user;
  if (user.role !== 'admin') {
    logout();
    $('#lgErr').textContent = 'Haldusliidesesse pääsevad ainult administraatorid';
    return;
  }

  $('#login').hidden = true;
  $('#shell').hidden = false;
  $('#whoName').textContent = user.name;
  $('#whoRole').textContent = user.role === 'admin' ? 'Administraator' : 'Välitöötaja';
  $('#whoAvatar').textContent = initials(user.name);

  // Filter dropdowns everywhere depend on these two lists.
  const [{ stores }, { users }] = await Promise.all([api('/stores'), api('/users')]);
  A.stores = stores;
  A.users = users;

  navigate(location.hash.slice(1) || 'dashboard');
}

if (A.token) {
  boot().catch(() => logout());
} else {
  $('#login').hidden = false;
}
