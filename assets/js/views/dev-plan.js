// ── SHTD Dashboard – Dev Plan view (Plan phát triển bản thân) ──
//
// Mỗi cá nhân tự thêm công việc học tập / tự đào tạo để phát triển bản thân.
// • Mặc định login → hiển thị danh sách của tôi (filter PIC = current user).
// • Mọi user xem được plan của nhau (read-only); chỉ PIC/Admin sửa-xóa.
// • Nhắc review định kỳ ở "Công việc của tôi" (xem my-work.js).

let _devFilterPic   = undefined;  // undefined = chưa init → set = current user
let _devFilterState = '';
let _devSearch      = '';
let _devSort        = { key: 'endDate', dir: 'asc' };
let _devEditId      = null;
let _devViewId      = null;

/* ══════════════════════ helpers ══════════════════════ */

function _devCanEdit(d) {
  if (!d) return false;
  return (typeof isAdmin === 'function' && isAdmin())
      || (typeof isCurrentUser === 'function' && isCurrentUser(d.pic));
}

function _devProg(d) {
  return Math.min(Math.max(parseInt(d.progress) || 0, 0), 100);
}

function _devIsDone(d) {
  return d.state === 'Hoàn thành' || _devProg(d) >= 100;
}

// Số ngày kể từ lần review cuối; null nếu chưa review bao giờ.
function _devReviewAgeDays(d) {
  if (!d.lastReview) return null;
  const last = new Date(d.lastReview);
  if (isNaN(last)) return null;
  return Math.floor((Date.now() - last.getTime()) / 86400000);
}

// Item cần nhắc review: chưa xong VÀ (chưa review bao giờ HOẶC quá hạn stale-days).
function _devIsStaleReview(d) {
  if (_devIsDone(d)) return false;
  const age = _devReviewAgeDays(d);
  if (age === null) return true;
  return age > DEV_REVIEW_STALE_DAYS;
}

function _devNowIso() {
  return new Date().toISOString();
}

function _devMyName() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return u ? u.username : '';
}

function _devFind(id) {
  return (dbDev || []).find(d => d.id === id);
}

/* ══════════════════════ data ══════════════════════ */

function _devGetFiltered() {
  let list = (dbDev || []).slice();

  if (_devFilterPic) list = list.filter(d => (d.pic || '').toLowerCase() === _devFilterPic.toLowerCase());
  if (_devFilterState) list = list.filter(d => d.state === _devFilterState);
  if (_devSearch) {
    const q = _devSearch.toLowerCase();
    list = list.filter(d =>
      (d.id || '').toLowerCase().includes(q) ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.target || '').toLowerCase().includes(q) ||
      (d.note || '').toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    const av = (a[_devSort.key] || '') + '';
    const bv = (b[_devSort.key] || '') + '';
    if (av < bv) return _devSort.dir === 'asc' ? -1 : 1;
    if (av > bv) return _devSort.dir === 'asc' ?  1 : -1;
    return 0;
  });
  return list;
}

// Danh sách PIC phân biệt (cho dropdown filter), luôn kèm current user.
function _devDistinctPics() {
  const set = new Map();
  (dbDev || []).forEach(d => { if (d.pic) set.set(d.pic.toLowerCase(), d.pic); });
  const me = _devMyName();
  if (me && !set.has(me.toLowerCase())) set.set(me.toLowerCase(), me);
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}

// Nhãn hiển thị "Display_Name (Username)" nếu có trong _appUsers.
function _devPicLabel(username) {
  if (typeof _appUsers !== 'undefined' && Array.isArray(_appUsers)) {
    const u = _appUsers.find(x => (x.Username || '').toLowerCase() === (username || '').toLowerCase());
    if (u && u.Display_Name) return `${u.Display_Name} (${u.Username})`;
  }
  return username || '–';
}

/* ══════════════════════ render ══════════════════════ */

function renderDevPlan() {
  const root = document.getElementById('view-dev-plan');
  if (!root) return;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) {
    root.innerHTML = `<div class="dev-page"><div class="dev-empty">${t('dev.login-required')}</div></div>`;
    return;
  }

  // Mặc định lần đầu: lọc theo chính mình
  if (_devFilterPic === undefined) _devFilterPic = user.username;

  const pics = _devDistinctPics();
  const picOpts = [`<option value="">${t('dev.filter.all-pic')}</option>`]
    .concat(pics.map(p =>
      `<option value="${esc(p)}"${_devFilterPic.toLowerCase() === p.toLowerCase() ? ' selected' : ''}>${esc(_devPicLabel(p))}</option>`
    )).join('');

  const stateOpts = [`<option value="">${t('dev.filter.all-state')}</option>`]
    .concat(DEV_STATES.map(s =>
      `<option value="${esc(s)}"${_devFilterState === s ? ' selected' : ''}>${esc(tState(s))}</option>`
    )).join('');

  root.innerHTML = `
<div class="dev-page">
  <div class="dev-page-header">
    <div>
      <div class="dev-title"><i class="fa-solid fa-seedling"></i> ${t('dev.title')}</div>
      <div class="dev-sub">${t('dev.subtitle')}</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openDevModal(null)">
      <i class="fa-solid fa-plus"></i> ${t('dev.add')}
    </button>
  </div>

  <div id="devStatBar" class="dev-stat-bar"></div>

  <div class="dev-toolbar">
    <div class="dev-filter-group">
      <label class="dev-filter-label">${t('dev.col.pic')}</label>
      <select id="devFilterPic" class="form-control form-control-sm" onchange="devFilterChange()">${picOpts}</select>
    </div>
    <div class="dev-filter-group">
      <label class="dev-filter-label">${t('dev.col.state')}</label>
      <select id="devFilterState" class="form-control form-control-sm" onchange="devFilterChange()">${stateOpts}</select>
    </div>
    <div class="dev-filter-group dev-filter-search">
      <label class="dev-filter-label">${t('common.search')}</label>
      <input id="devSearch" type="text" class="form-control form-control-sm"
        placeholder="${t('dev.search-ph')}" value="${esc(_devSearch)}" oninput="devSearchInput(this.value)">
    </div>
  </div>

  <div id="devTableWrap"></div>
</div>`;

  _devRenderStat();
  _devRenderTable();
}

function _devRenderStat() {
  const el = document.getElementById('devStatBar');
  if (!el) return;
  const scope = _devGetFiltered();
  const total   = scope.length;
  const active  = scope.filter(d => !_devIsDone(d) && d.state !== 'Chưa bắt đầu').length;
  const done    = scope.filter(d => _devIsDone(d)).length;
  const stale   = scope.filter(_devIsStaleReview).length;

  const card = (val, label, cls) =>
    `<div class="dev-stat ${cls || ''}"><div class="dev-stat-num">${val}</div><div class="dev-stat-lbl">${label}</div></div>`;

  el.innerHTML =
    card(total,  t('dev.stat.total'), '') +
    card(active, t('dev.stat.active'), 'is-active') +
    card(done,   t('dev.stat.done'), 'is-done') +
    card(stale,  t('dev.stat.stale'), stale > 0 ? 'is-stale' : '');
}

function _devRenderTable() {
  const wrap = document.getElementById('devTableWrap');
  if (!wrap) return;

  const list = _devGetFiltered();
  if (!list.length) {
    wrap.innerHTML = `<div class="dev-empty"><i class="fa-solid fa-seedling"></i> ${t('dev.empty')}</div>`;
    return;
  }

  // Nhóm theo PIC (tái hiện layout Excel: mỗi người 1 nhóm, STT chạy trong nhóm)
  const groups = new Map();
  list.forEach(d => {
    const key = d.pic || '—';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
  });

  // UI_CONCEPT fit-one-screen: table-layout is fixed (see dev-plan.css). Only the
  // narrow columns get a fixed width; Name + Target have no width so they absorb the
  // remaining space equally and wrap — this always fits without over-100% scaling.
  const headHtml = `<tr>
    <th style="width:40px;">STT</th>
    <th>${t('dev.col.name')}</th>
    <th>${t('dev.col.target')}</th>
    <th style="width:90px;">${t('dev.col.coord')}</th>
    <th style="width:92px;">${t('dev.col.start')}</th>
    <th style="width:92px;">${t('dev.col.end')}</th>
    <th style="width:104px;">${t('dev.col.state')}</th>
    <th style="width:90px;">${t('dev.col.progress')}</th>
    <th style="width:130px;">${t('dev.col.note')}</th>
    <th style="width:78px;"></th>
  </tr>`;

  let body = '';
  const multi = groups.size > 1;
  for (const [pic, items] of groups) {
    if (multi) {
      body += `<tr class="dev-group-row"><td colspan="10">
        <i class="fa-solid fa-user"></i> ${esc(_devPicLabel(pic))}
        <span class="dev-group-count">${items.length}</span>
      </td></tr>`;
    }
    items.forEach((d, idx) => { body += _devRowHtml(d, idx + 1); });
  }

  wrap.innerHTML = `<div class="dev-table-scroll"><table class="dev-table">
    <thead>${headHtml}</thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function _devRowHtml(d, stt) {
  const prog    = _devProg(d);
  const canEdit = _devCanEdit(d);
  const stale   = _devIsStaleReview(d);
  const id      = esc(d.id);

  const actions = canEdit ? `
    <div style="display:flex;gap:4px;justify-content:flex-end;">
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDevModal('${id}')" title="${t('common.edit')}"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();devDeleteItem('${id}')" title="${t('common.delete')}"><i class="fa-solid fa-trash"></i></button>
    </div>` : `<span class="dev-readonly" title="${t('dev.readonly')}"><i class="fa-solid fa-lock"></i></span>`;

  return `<tr class="dev-row${_devIsDone(d) ? ' is-done' : ''}" onclick="openDevViewPopup('${id}')" style="cursor:pointer;">
    <td class="dev-stt">${stt}</td>
    <td>
      <div class="dev-cell-name">${esc(d.name || '–')}</div>
      <div class="dev-cell-id">${id}</div>
    </td>
    <td class="dev-cell-target" title="${esc(d.target)}">${esc(d.target || '–')}</td>
    <td class="dev-cell-muted">${esc(d.coordUnit || '–')}</td>
    <td class="dev-cell-muted dev-cell-date">${fmtDate(d.startDate)}</td>
    <td class="dev-cell-muted dev-cell-date">${fmtDate(d.endDate)}</td>
    <td>${stateChip(d.state)}</td>
    <td>
      <div class="dev-prog"><div class="dev-prog-fill" style="width:${prog}%"></div></div>
      <div class="dev-prog-row">
        <span class="dev-prog-lbl">${prog}%</span>
        ${stale ? `<span class="dev-review-flag" title="${t('dev.review.stale-tip')}"><i class="fa-solid fa-bell"></i></span>` : ''}
      </div>
    </td>
    <td class="dev-cell-note" title="${esc(d.note)}">${esc(d.note || '–')}</td>
    <td class="dev-cell-actions" onclick="event.stopPropagation();">${actions}</td>
  </tr>`;
}

/* ══════════════════════ filters ══════════════════════ */

function devFilterChange() {
  _devFilterPic   = document.getElementById('devFilterPic')?.value ?? _devFilterPic;
  _devFilterState = document.getElementById('devFilterState')?.value || '';
  _devRenderStat();
  _devRenderTable();
}

function devSearchInput(val) {
  _devSearch = val || '';
  _devRenderStat();
  _devRenderTable();
}

/* ══════════════════════ CRUD modal ══════════════════════ */

function openDevModal(id) {
  const d = id ? _devFind(id) : null;

  // Ownership guard cho edit
  if (d && !_devCanEdit(d)) {
    toast(t('dev.readonly'), 'warning');
    return;
  }

  _devEditId = id || null;
  const me = _devMyName();
  const admin = typeof isAdmin === 'function' && isAdmin();

  document.getElementById('devModalTitle').textContent = d ? t('dev.modal.edit') : t('dev.modal.add');
  document.getElementById('devOrigId').value = d?.id || '';

  const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v; };
  set('devfName',      d?.name      || '');
  set('devfTarget',    d?.target    || '');
  set('devfCoord',     d?.coordUnit || '');
  const _devTd = new Date();
  const _devTodayISO = `${_devTd.getFullYear()}-${String(_devTd.getMonth()+1).padStart(2,'0')}-${String(_devTd.getDate()).padStart(2,'0')}`;
  set('devfStart',     d?.startDate || _devTodayISO);
  set('devfEnd',       d?.endDate   || '');
  set('devfNote',      d?.note      || '');

  // State dropdown
  const stSel = document.getElementById('devfState');
  if (stSel) {
    stSel.innerHTML = DEV_STATES.map(s =>
      `<option value="${esc(s)}"${(d?.state || 'Chưa bắt đầu') === s ? ' selected' : ''}>${esc(tState(s))}</option>`
    ).join('');
  }

  // Progress
  set('devfProgress', d ? _devProg(d) : 0);

  // PIC dropdown — non-Admin khóa vào chính mình
  const picSel = document.getElementById('devfPic');
  if (picSel) {
    const cur = d?.pic || me;
    _populateUserSelect('devfPic', null, cur);
    picSel.disabled = !admin;   // chỉ Admin đổi PIC
    if (!admin) picSel.value = me; // ép về mình
  }

  document.getElementById('devModal').style.display = 'flex';
  // Auto-grow textareas to fit their content (esp. when editing existing long text)
  _devAutoGrow(document.getElementById('devfTarget'));
  _devAutoGrow(document.getElementById('devfNote'));
  setTimeout(() => document.getElementById('devfName')?.focus(), 50);
}

// Grow a textarea's height to match its content (called on open + oninput)
function _devAutoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight + 2) + 'px';
}

function closeDevModal() {
  const m = document.getElementById('devModal');
  if (m) m.style.display = 'none';
  _devEditId = null;
}

async function devSaveItem() {
  const name = (document.getElementById('devfName')?.value || '').trim();
  if (!name) { toast(t('dev.err.name'), 'warning'); return; }

  const origId = document.getElementById('devOrigId')?.value || '';
  const isNew  = !origId;
  const me     = _devMyName();
  const admin  = typeof isAdmin === 'function' && isAdmin();

  const prev = isNew ? null : _devFind(origId);
  // Ownership guard (defense-in-depth; server cũng chặn)
  if (prev && !_devCanEdit(prev)) { toast(t('dev.readonly'), 'warning'); return; }

  let pic = (document.getElementById('devfPic')?.value || me).trim();
  if (!admin) pic = me;   // non-Admin chỉ tạo/sửa của mình

  const prog = Math.min(Math.max(parseInt(document.getElementById('devfProgress')?.value) || 0, 0), 100);

  const d = {
    id:         isNew ? genDevId() : origId,
    name,
    target:     (document.getElementById('devfTarget')?.value || '').trim(),
    pic,
    coordUnit:  (document.getElementById('devfCoord')?.value || '').trim(),
    startDate:  document.getElementById('devfStart')?.value || '',
    endDate:    document.getElementById('devfEnd')?.value   || '',
    state:      document.getElementById('devfState')?.value || 'Chưa bắt đầu',
    progress:   String(prog),
    note:       (document.getElementById('devfNote')?.value || '').trim(),
    lastReview: _devNowIso(),                         // lưu = 1 lần review
    createdBy:  isNew ? me : (prev?.createdBy || me),
  };
  if (typeof normDevComplete === 'function') normDevComplete(d);  // %HT=100 ⇒ Hoàn thành

  if (isNew) {
    dbDev.push(d);
  } else {
    const idx = dbDev.findIndex(x => x.id === origId);
    if (idx >= 0) dbDev[idx] = d; else dbDev.push(d);
  }

  persistDev();
  closeDevModal();
  renderDevPlan();
  if (typeof renderMyWork === 'function' &&
      document.getElementById('view-my-work')?.style.display === 'contents') renderMyWork();
  _gasDevUpsert(d, isNew);
}

async function devDeleteItem(id) {
  const d = _devFind(id);
  if (!d) return;
  if (!_devCanEdit(d)) { toast(t('dev.readonly'), 'warning'); return; }

  const ok = await uiConfirm(
    t('dev.del.title'),
    `${t('dev.del.confirm')} <strong>${esc(d.name)}</strong>?`,
    'danger', t('common.delete')
  );
  if (!ok) return;

  dbDev = dbDev.filter(x => x.id !== id);
  persistDev();
  renderDevPlan();
  _gasDevDelete(id, d.name);
}

/* ══════════════════════ view popup (read-only) ══════════════════════ */

function openDevViewPopup(id) {
  const d = _devFind(id);
  if (!d) return;
  _devViewId = id;

  const canEdit = _devCanEdit(d);
  const prog    = _devProg(d);

  const el = document.getElementById('devViewOverlay');
  el.innerHTML = `
    <div class="cp-view-modal" style="max-width:640px;">
      <div class="cp-view-header">
        <div>
          <div style="font-size:11px;font-family:monospace;color:var(--text-3);margin-bottom:4px;">${esc(d.id)}</div>
          <div style="font-size:17px;font-weight:700;line-height:1.35;">${esc(d.name)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center;">
            ${stateChip(d.state)}
            <span class="dev-prog" style="width:120px;display:inline-block;vertical-align:middle;"><span class="dev-prog-fill" style="width:${prog}%"></span></span>
            <span style="font-size:12px;font-weight:700;">${prog}%</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-start;flex-shrink:0;">
          ${canEdit ? `<button class="btn btn-outline btn-sm" onclick="closeDevViewPopup();openDevModal('${esc(d.id)}')"><i class="fa-solid fa-pen"></i> ${t('common.edit')}</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="closeDevViewPopup()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="cp-view-body">
        <div class="cp-view-grid">
          ${_devVR(t('dev.col.pic'),   _devPicLabel(d.pic))}
          ${_devVR(t('dev.col.coord'), d.coordUnit)}
          ${_devVR(t('dev.col.start'), d.startDate ? fmtDate(d.startDate) : '')}
          ${_devVR(t('dev.col.end'),   d.endDate ? fmtDate(d.endDate) : '')}
          ${_devVR(t('dev.review.last'), d.lastReview ? new Date(d.lastReview).toLocaleString('vi-VN') : '')}
        </div>
        ${d.target ? `<div class="cp-view-section"><div class="cp-view-label">${t('dev.col.target')}</div><div class="cp-view-val" style="white-space:pre-wrap;">${esc(d.target)}</div></div>` : ''}
        ${d.note   ? `<div class="cp-view-section"><div class="cp-view-label">${t('dev.col.note')}</div><div class="cp-view-val" style="white-space:pre-wrap;">${esc(d.note)}</div></div>` : ''}
      </div>
    </div>`;
  el.style.display = 'flex';
}

function _devVR(label, val) {
  if (!val) return '';
  return `<div class="cp-view-row">
    <div class="cp-view-label">${esc(label)}</div>
    <div class="cp-view-val">${esc(val)}</div>
  </div>`;
}

function closeDevViewPopup() {
  const el = document.getElementById('devViewOverlay');
  if (el) el.style.display = 'none';
  _devViewId = null;
}

/* ══════════════════════ My Work quick review ══════════════════════
   Cập nhật nhanh % + ghi chú từ section nhắc nhở ở "Công việc của tôi".
   Reset mốc review → item rời khỏi danh sách nhắc.
*/
function devQuickReview(id, progressVal, noteVal) {
  const d = _devFind(id);
  if (!d) return;
  if (!_devCanEdit(d)) { toast(t('dev.readonly'), 'warning'); return; }

  if (progressVal !== null && progressVal !== undefined) {
    const p = Math.min(Math.max(parseInt(progressVal) || 0, 0), 100);
    d.progress = String(p);
    if (p >= 100 && d.state !== 'Hoàn thành') d.state = 'Hoàn thành';
  }
  if (noteVal !== null && noteVal !== undefined) d.note = noteVal;
  d.lastReview = _devNowIso();

  persistDev();
  _gasDevUpsert(d);
}
