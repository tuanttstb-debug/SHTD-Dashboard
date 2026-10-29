// ── SHTD Dashboard – Backlog IT view (ticket Jira DCB) ──
// Hub AIOS D22 (2026-10-29). Nhập liệu ở Jira (label chuẩn) → PO bấm "Nạp file Jira" →
// màn này tự tính: sẵn sàng chuyển IT · số ngày không nhích · thiếu sub-task · lệch ưu tiên.
// Trên SHTD chỉ chốt: ưu tiên team · quyết định planning · kỳ (Teamlead/Admin) + ghi chú.

let _tkPreset = 'open';      // open | ready | notready | stale | all
let _tkLine   = '';
let _tkSys    = '';       // '' | 'Biz' | 'BPM'
let _tkKy     = '';
let _tkProject = '';      // Project Jira (Digital CB · BLOL · GNOL.EndToEnd…)
let _tkStatus = '';       // Status Jira
let _tkSearch = '';
let _tkSort   = { key: 'stale', dir: 'desc' };
let _tkEditKey = null;
let _tkPf     = null;
let _tkSel    = new Set();   // key ticket đang chọn (chỉ ticket được xóa + đang hiện)

/* ══════════════ helpers ══════════════ */

function _tkCanLead() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return !!(u && (u.role === 'Admin' || u.role === 'Teamlead'));
}

// Quyền xóa: Admin xóa mọi ticket · người khác chỉ ticket mình là PO (Reporter Jira khớp họ tên User_Master).
// Server kiểm lại cùng luật (ticket-delete-bulk).
function _tkCanDelete(x) {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!u) return false;
  if (u.role === 'Admin') return true;
  return !!(x.u && String(x.u.username).toLowerCase() === String(u.username || '').toLowerCase());
}

function _tkUsers() {
  return typeof _appUsers !== 'undefined' && Array.isArray(_appUsers) ? _appUsers : [];
}

// PO = Reporter trên Jira, hiển thị đúng tên Jira (không ép về username SHTD — anh chốt 29/10)
function _tkPerson(name) {
  return name || '–';
}

// "Dung Vu Van <TN-EDF.IT>" → "Dung Vu Van"
function _tkShortName(s) {
  return tkPersonName(s) || '–';
}

function _tkKyLabel(k) {
  return k && k.length === 6 ? `T${parseInt(k.slice(4), 10)}/${k.slice(0, 4)}` : (k || '–');
}

// Ticket cha + sub-task "mồ côi" (không thấy cha) hoặc thiếu thẻ [UI/UX]/[BA] (để thấy cảnh báo).
// Sub-task UI/BA có cha → gộp vào dòng cha.
function _tkAll(today) {
  const list = dbTickets || [];
  const idx = tkSubIndex(list);
  const keys = new Set(list.map(t => t.key));
  const users = _tkUsers(), byName = {};
  const userOf = po => (po in byName ? byName[po] : (byName[po] = tkUserOf(po, users)));
  return list
    .filter(t => !(tkIsSubtask(t) && tkSubKind(t) && keys.has(tkParentKey(t))))
    .map(t => { const d = tkDerive(t, today, idx); return { t, d, u: userOf(d.po) }; });
}

// Nhân sự phụ trách = PO: username SHTD nếu khớp họ tên, chưa khớp thì tên Jira
function _tkPoKey(x) {
  return x.u ? x.u.username : x.d.po;
}

function _tkDistinct(items, get) {
  return [...new Set(items.map(get).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
}

function _tkSubIdx() {
  return tkSubIndex(dbTickets || []);
}

function _tkKyOptions(items) {
  const set = new Set();
  items.forEach(x => { if (x.d.kyEff) set.add(x.d.kyEff); });
  return [...set].sort();
}

function _tkFiltered(items) {
  let list = items;
  if (_tkPf) list = list.filter(x => _tkPf.match(x.d.team, _tkPoKey(x)));
  if (_tkProject) list = list.filter(x => x.t.project === _tkProject);
  if (_tkStatus) list = list.filter(x => x.t.status === _tkStatus);
  if (_tkSys) list = list.filter(x => x.d.system === _tkSys);
  if (_tkLine) list = list.filter(x => x.d.line === _tkLine);
  if (_tkKy) list = list.filter(x => x.d.kyEff === _tkKy);
  if (_tkSearch) {
    const q = _tkSearch.toLowerCase();
    const subText = x => x.d.uiSubs.concat(x.d.baSubs).map(s => s.key + ' ' + s.assignee).join(' ');
    list = list.filter(x => (x.t.key + ' ' + x.t.summary + ' ' + x.t.labels + ' ' + x.t.assignee + ' ' + x.t.reporter + ' ' + x.t.note + ' ' + subText(x)).toLowerCase().includes(q));
  }
  return list;
}

function _tkApplyPreset(list) {
  if (_tkPreset === 'all') return list;
  list = list.filter(x => x.d.open);
  if (_tkPreset === 'ready')    return list.filter(x => x.d.ready);
  if (_tkPreset === 'notready') return list.filter(x => !x.d.ready);
  if (_tkPreset === 'stale')    return list.filter(x => x.d.staleLevel === 'red');
  return list;
}

function _tkSorted(list) {
  const k = _tkSort.key, dir = _tkSort.dir === 'asc' ? 1 : -1;
  const val = x => {
    if (k === 'stale') return x.d.staleDays == null ? -1 : x.d.staleDays;
    if (k === 'prio')  return x.d.prioTeam || x.d.prioJira || 9;
    if (k === 'key')   return parseInt(String(x.t.key).replace(/\D/g, ''), 10) || 0;
    if (k === 'line')  return x.d.line;
    if (k === 'ky')    return x.d.kyEff || '999999';
    if (k === 'ready') return x.d.ready ? 1 : 0;
    return String(x.t[k] || '');
  };
  return list.slice().sort((a, b) => {
    const av = val(a), bv = val(b);
    return av < bv ? -dir : av > bv ? dir : 0;
  });
}

// Badge menu = ticket đang mở không nhích ≥ 60 ngày (chỉ mục cần chú ý).
function tkUpdateBadge() {
  const el = document.getElementById('navBadgeTicket');
  if (!el) return;
  const n = _tkAll(new Date()).filter(x => x.d.open && x.d.staleLevel === 'red').length;
  el.textContent = n;
  el.style.display = n > 0 ? '' : 'none';
  if (typeof updateNavGroupBadges === 'function') updateNavGroupBadges();
}

/* ══════════════ render ══════════════ */

function renderBacklogIt() {
  const root = document.getElementById('view-backlog-it');
  if (!root) return;
  const today = new Date();
  const all = _tkAll(today);
  const kyOpts = _tkKyOptions(all);
  if (_tkKy && kyOpts.indexOf(_tkKy) === -1) _tkKy = '';
  const projOpts = _tkDistinct(all, x => x.t.project);
  if (_tkProject && projOpts.indexOf(_tkProject) === -1) _tkProject = '';
  const statusOpts = _tkDistinct(all, x => x.t.status);
  if (_tkStatus && statusOpts.indexOf(_tkStatus) === -1) _tkStatus = '';

  root.innerHTML = `
<div class="tk-page">
  <div class="tk-head">
    <div>
      <div class="tk-title"><i class="fa-solid fa-ticket"></i> Backlog IT — ticket Jira (Biz + BPM)</div>
      <div class="tk-sub">Nhập ở Jira bằng label chuẩn → nạp file xuất Jira · SHTD chỉ chốt ưu tiên, quyết định planning, kỳ</div>
    </div>
    <div class="tk-actions">
      <button class="btn btn-ghost btn-sm" onclick="tkShowGuide()"><i class="fa-solid fa-tags"></i> Quy ước label</button>
      <button class="btn btn-ghost btn-sm" onclick="tkExportExcel()"><i class="fa-solid fa-file-excel"></i> Xuất bảng planning</button>
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('tkFileInput').click()"><i class="fa-solid fa-file-import"></i> Nạp file Jira</button>
      <input type="file" id="tkFileInput" accept=".html,.htm,.xlsx,.xls,.csv" style="display:none" onchange="tkHandleImport(event)">
    </div>
  </div>
  <div id="tkStatBar" class="tk-stat-bar"></div>
  <div class="tk-toolbar">
    <input id="tkSearch" type="text" class="form-control form-control-sm tk-search" placeholder="Tìm key, nội dung, label, dev…" value="${esc(_tkSearch)}" oninput="tkSearchInput(this.value)">
    <select id="tkTeamFilter" class="form-control form-control-sm pf-select pf-select--team"></select>
    <select id="tkUserFilter" class="form-control form-control-sm pf-select" title="Nhân sự phụ trách = PO (Reporter Jira)"></select>
    <select id="tkProjectFilter" class="form-control form-control-sm" onchange="tkSetProject(this.value)" title="Project trên Jira">
      <option value="">Tất cả dự án</option>
      ${projOpts.map(p => `<option value="${esc(p)}"${_tkProject === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}
    </select>
    <select id="tkStatusFilter" class="form-control form-control-sm" onchange="tkSetStatus(this.value)" title="Status trên Jira">
      <option value="">Tất cả trạng thái</option>
      ${statusOpts.map(s => `<option value="${esc(s)}"${_tkStatus === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}
    </select>
    <select id="tkSysFilter" class="form-control form-control-sm" onchange="tkSetSys(this.value)" title="Biz = project Digital CB (DCB) · BPM = project BLOL / GNOL.EndToEnd…">
      <option value="">Biz + BPM</option>
      ${['Biz', 'BPM'].map(s => `<option value="${s}"${_tkSys === s ? ' selected' : ''}>${s}</option>`).join('')}
    </select>
    <select id="tkLineFilter" class="form-control form-control-sm" onchange="tkSetLine(this.value)">
      <option value="">Tất cả line</option>
      ${TK_LINES.map(l => `<option value="${l}"${_tkLine === l ? ' selected' : ''}>${TK_LINE_LABEL[l]}</option>`).join('')}
    </select>
    <select id="tkKyFilter" class="form-control form-control-sm" onchange="tkSetKy(this.value)" title="Kỳ đã chốt, chưa chốt thì theo tháng golive (Expect_Golive)">
      <option value="">Tất cả kỳ</option>
      ${kyOpts.map(k => `<option value="${k}"${_tkKy === k ? ' selected' : ''}>Kỳ ${_tkKyLabel(k)}</option>`).join('')}
    </select>
  </div>
  <div id="tkTableWrap"></div>
</div>`;

  _tkPf = PeopleFilter.bind({ team: 'tkTeamFilter', user: 'tkUserFilter', onChange: _tkRenderBody });
  const people = [];
  all.forEach(x => { if (x.d.po) people.push({ username: _tkPoKey(x), name: x.u ? x.u.name : '', team: x.d.team }); });
  _tkPf.setPeople(people);
  _tkRenderBody();
  tkUpdateBadge();
}

function _tkRenderBody() {
  const today = new Date();
  const scope = _tkFiltered(_tkAll(today));
  _tkRenderStat(scope);
  _tkRenderTable(_tkSorted(_tkApplyPreset(scope)));
}

function _tkRenderStat(scope) {
  const el = document.getElementById('tkStatBar');
  if (!el) return;
  const open = scope.filter(x => x.d.open);
  const n = {
    open: open.length,
    ready: open.filter(x => x.d.ready).length,
    notready: open.filter(x => !x.d.ready).length,
    stale: open.filter(x => x.d.staleLevel === 'red').length,
    all: scope.length,
  };
  const card = (key, label, cls) => `<button class="tk-stat ${cls}${_tkPreset === key ? ' is-on' : ''}" data-preset="${key}" onclick="tkSetPreset('${key}')">
    <span class="tk-stat-num">${n[key]}</span><span class="tk-stat-lbl">${label}</span></button>`;
  el.innerHTML =
    card('open', 'Đang mở', '') +
    card('ready', 'Sẵn sàng chuyển IT', 'is-good') +
    card('notready', 'Chưa sẵn sàng', n.notready ? 'is-warn' : '') +
    card('stale', `Trôi ≥ ${TK_STALE_RED} ngày`, n.stale ? 'is-bad' : '') +
    card('all', 'Tất cả (gồm Done)', '');
}

function _tkTh(key, label, width) {
  const on = _tkSort.key === key;
  const arrow = on ? (_tkSort.dir === 'asc' ? '▲' : '▼') : '';
  return `<th${width ? ` style="width:${width}px"` : ''} class="tk-sortable" onclick="tkSort('${key}')">${label} <span class="tk-arrow">${arrow}</span></th>`;
}

function _tkRenderTable(list) {
  const wrap = document.getElementById('tkTableWrap');
  if (!wrap) return;
  if (!(dbTickets || []).length) {
    wrap.innerHTML = `<div class="tk-empty"><i class="fa-solid fa-file-import"></i>
      <div><b>Chưa có ticket.</b> Trên Jira: Export → <b>HTML report</b> (hoặc Excel) với cột Key · Summary · Status · Priority · Assignee · Updated · Labels… rồi bấm <b>Nạp file Jira</b>.</div></div>`;
    return;
  }
  // Chỉ giữ chọn những ticket đang hiện + được xóa (đổi bộ lọc không xóa nhầm dòng đã khuất)
  const canDel = new Set(list.filter(_tkCanDelete).map(x => x.t.key));
  _tkSel = new Set([..._tkSel].filter(k => canDel.has(k)));
  _tkVisibleDel = [...canDel];
  if (!list.length) {
    wrap.innerHTML = `<div class="tk-empty"><i class="fa-solid fa-filter"></i><div>Không có ticket khớp bộ lọc.</div></div>`;
    return;
  }
  const rows = list.map(x => _tkRowHtml(x.t, x.d, canDel.has(x.t.key))).join('');
  wrap.innerHTML = `
    <div class="bulk-bar tk-bulk" id="tkBulkBar">
      <i class="fa-solid fa-check-square"></i>
      <span class="bulk-bar-count" id="tkBulkCount"></span>
      <span class="bulk-spacer"></span>
      <button class="btn-bulk danger" onclick="tkDeleteSelected()"><i class="fa-solid fa-trash"></i> Xóa</button>
      <button class="btn-bulk" onclick="tkClearSel()" title="Bỏ chọn"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="tk-table-scroll"><table class="tk-table">
    <thead><tr>
      <th class="tk-chk" style="width:36px"><input type="checkbox" id="tkChkAll" aria-label="Chọn tất cả ticket được xóa"${canDel.size ? '' : ' disabled title="Không có ticket bạn được xóa trong danh sách"'} onchange="tkToggleAll(this.checked)"></th>
      ${_tkTh('key', 'Ticket', 108)}
      ${_tkTh('summary', 'Nội dung')}
      ${_tkTh('line', 'Line · PO', 150)}
      ${_tkTh('status', 'Jira', 118)}
      ${_tkTh('prio', 'Ưu tiên', 86)}
      ${_tkTh('ready', 'Sẵn sàng chuyển IT', 178)}
      ${_tkTh('stale', 'Không nhích', 92)}
      ${_tkTh('ky', 'Kỳ · Quyết định', 128)}
    </tr></thead>
    <tbody>${rows}</tbody></table></div>
    <div class="tk-foot">${list.length} ticket · bấm dòng để chốt ưu tiên / quyết định / ghi chú · tích ô đầu dòng để xóa hàng loạt (ticket mình là PO; Admin xóa mọi ticket)</div>`;
  _tkUpdateBulk();
}

let _tkVisibleDel = [];

function _tkUpdateBulk() {
  const bar = document.getElementById('tkBulkBar');
  if (bar) {
    bar.classList.toggle('visible', _tkSel.size > 0);
    const c = document.getElementById('tkBulkCount');
    if (c) c.textContent = `${_tkSel.size} ticket đã chọn`;
  }
  const all = document.getElementById('tkChkAll');
  if (all) {
    all.checked = _tkVisibleDel.length > 0 && _tkSel.size === _tkVisibleDel.length;
    all.indeterminate = _tkSel.size > 0 && _tkSel.size < _tkVisibleDel.length;
  }
}

function _tkRowHtml(t, d, canDel) {
  const key = esc(t.key);
  const chips = [];
  d.subs.forEach(s => chips.push(`<span class="tk-chip">${esc(s)}</span>`));
  if (d.dxct) chips.push('<span class="tk-chip is-dxct">ĐXCT</span>');
  if (d.golivedOn) chips.push(`<span class="tk-chip is-good">Đã golive ${fmtDate(d.golivedOn)}</span>`);
  d.deps.forEach(s => chips.push(`<span class="tk-chip is-dep">${esc(s)}</span>`));
  d.warn.filter(w => w.indexOf('Lệch') === -1).forEach(w => chips.push(`<span class="tk-chip is-warn">${esc(w)}</span>`));

  // Sub-task UI / BA gộp dưới ticket cha: trạng thái + người phụ trách + mã sub-task
  const subLine = (label, state, subsList) => subsList.length
    ? `<div class="tk-subline"><b>${label}</b> ${esc(state)} · ${subsList.map(s => `<a class="tk-key" href="${TK_JIRA_BROWSE}${esc(s.key)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(s.key)}</a> ${esc(_tkShortName(s.assignee))}`).join(', ')}</div>`
    : '';
  const ready = (d.ready
    ? '<span class="tk-ok"><i class="fa-solid fa-circle-check"></i> Đạt</span>'
    : `<span class="tk-no"><i class="fa-solid fa-circle-xmark"></i> Chưa</span><div class="tk-missing">${d.missing.map(esc).join(' · ')}</div>`)
    + subLine('UI', d.ui, d.uiSubs) + subLine('BA', d.tlpt, d.baSubs)
    + (d.otherSubs.length ? `<div class="tk-subline"><b>Sub-task khác</b> ${d.otherSubs.length}</div>` : '');
  const lineTitle = `Theo ${d.lineSrc || '–'}${t.project ? ' · Project: ' + t.project : ''}${t.components ? ' · Component: ' + t.components : ''}`;
  const stale = d.staleDays == null ? '–'
    : `<span class="tk-stale ${d.staleLevel ? 'is-' + d.staleLevel : ''}">${d.staleDays} ngày</span><div class="tk-muted">${fmtDate(d.lastUpd)}</div>`;
  const typeLine = d.isSub && d.parentKey ? `Sub-task của ${esc(d.parentKey)}` : esc(t.type || '');
  const prio = `<div>${esc(t.priority || '–')}</div><div class="tk-muted${d.prioMismatch ? ' tk-mismatch' : ''}">${d.prioTeam ? 'Team: ' + d.prioTeam : 'Team: –'}</div>`;
  const dec = t.quyetDinh ? `<span class="tk-dec is-${t.quyetDinh === 'Đưa vào kỳ' ? 'in' : t.quyetDinh === 'Bỏ' ? 'drop' : 'hold'}">${esc(t.quyetDinh)}</span>` : '<span class="tk-muted">Chưa chốt</span>';

  const chk = canDel
    ? `<input type="checkbox" class="tk-sel" data-key="${key}"${_tkSel.has(t.key) ? ' checked' : ''} aria-label="Chọn ${key}" onchange="tkToggleRow('${key}', this.checked)">`
    : `<input type="checkbox" class="tk-sel" disabled title="Chỉ PO của ticket hoặc Admin được xóa">`;
  return `<tr class="tk-row${d.open ? '' : ' is-done'}${_tkSel.has(t.key) ? ' is-sel' : ''}" onclick="tkOpenModal('${key}')">
    <td class="tk-chk" onclick="event.stopPropagation()">${chk}</td>
    <td><a class="tk-key" href="${TK_JIRA_BROWSE}${key}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${key}</a><div class="tk-muted">${typeLine}</div></td>
    <td><div class="tk-sum">${esc(t.summary || '–')}</div>${chips.length ? `<div class="tk-chips">${chips.join('')}</div>` : ''}</td>
    <td title="${esc(lineTitle)}"><div><b>${esc(TK_LINE_LABEL[d.line] || '–')}</b> <span class="tk-sys is-${esc(d.system.toLowerCase())}">${esc(d.system)}</span></div><div class="tk-muted">${esc(_tkPerson(d.po))}</div></td>
    <td><div>${esc(t.status || '–')}</div><div class="tk-muted" title="${esc(t.assignee)}">${esc(_tkShortName(t.assignee))}</div></td>
    <td>${prio}</td>
    <td>${ready}</td>
    <td>${stale}</td>
    <td><div>${d.kyEff ? 'Kỳ ' + _tkKyLabel(d.kyEff) : '–'}</div>${dec}</td>
  </tr>`;
}

/* ══════════════ filter events ══════════════ */

function tkSetPreset(p) { _tkPreset = p; _tkRenderBody(); }
function tkSetLine(v)   { _tkLine = v; _tkRenderBody(); }
function tkSetSys(v)    { _tkSys = v; _tkRenderBody(); }
function tkSetKy(v)     { _tkKy = v; _tkRenderBody(); }
function tkSetProject(v) { _tkProject = v; _tkRenderBody(); }
// Chọn 1 trạng thái cụ thể → bỏ lọc "Đang mở" (để chọn Done/Closed vẫn thấy dòng)
function tkSetStatus(v) { _tkStatus = v; if (v && _tkPreset === 'open') _tkPreset = 'all'; _tkRenderBody(); }
function tkSearchInput(v) {
  _tkSearch = v;
  clearTimeout(tkSearchInput._t);
  tkSearchInput._t = setTimeout(_tkRenderBody, 200);
}
function tkSort(key) {
  if (_tkSort.key === key) _tkSort.dir = _tkSort.dir === 'asc' ? 'desc' : 'asc';
  else _tkSort = { key, dir: key === 'stale' ? 'desc' : 'asc' };
  _tkRenderBody();
}

/* ══════════════ chọn + xóa hàng loạt ══════════════ */

function tkToggleRow(key, on) {
  if (on) _tkSel.add(key); else _tkSel.delete(key);
  const cb = document.querySelector(`.tk-sel[data-key="${key}"]`);
  if (cb) cb.closest('tr').classList.toggle('is-sel', on);
  _tkUpdateBulk();
}

function tkToggleAll(on) {
  _tkSel = new Set(on ? _tkVisibleDel : []);
  document.querySelectorAll('.tk-sel[data-key]').forEach(cb => {
    cb.checked = _tkSel.has(cb.dataset.key);
    cb.closest('tr').classList.toggle('is-sel', cb.checked);
  });
  _tkUpdateBulk();
}

function tkClearSel() { tkToggleAll(false); }

async function tkDeleteSelected() {
  if (!_tkSel.size) return;
  const keys = [..._tkSel];
  // Sub-task UI/BA/khác gộp dưới dòng cha → xóa theo cha (không để lại sub-task mồ côi)
  const idx = _tkSubIdx();
  const subs = [];
  keys.forEach(k => (idx[k] || []).forEach(s => { if (!_tkSel.has(s.key)) subs.push(s.key); }));
  const all = keys.concat([...new Set(subs)]);
  const preview = keys.slice(0, 8).map(esc).join(', ') + (keys.length > 8 ? ` … (+${keys.length - 8})` : '');
  const ok = await uiConfirm('Xóa ticket khỏi Backlog IT',
    `Xóa <strong>${keys.length} ticket</strong>${subs.length ? ` + <strong>${subs.length} sub-task</strong> đi kèm` : ''} khỏi SHTD: ${preview}.<br>
     Cột team (ưu tiên, quyết định, kỳ, ghi chú) của các ticket này mất theo. Ticket trên Jira không bị ảnh hưởng — nạp lại file Jira có ticket đó thì nó quay lại.`,
    'danger', `Xóa ${all.length}`);
  if (!ok) return;
  if (typeof showLoading === 'function') showLoading('Đang xóa ticket…');
  const res = await _gasTicketDeleteBulk(all);
  if (typeof hideLoading === 'function') hideLoading();
  _tkSel.clear();
  if (!res.error) {
    toast(`Đã xóa ${res.deleted} ticket${res.denied.length ? ` · ${res.denied.length} ticket không có quyền xóa: ${res.denied.slice(0, 5).join(', ')}` : ''}${res.offline ? ' (cục bộ)' : ''}.`,
      res.denied.length || res.offline ? 'warning' : 'success', res.denied.length ? 7000 : 4000);
  }
  renderBacklogIt();
}

/* ══════════════ import / export ══════════════ */

function tkHandleImport(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const isHtml = tkLooksHtml(file.name, '');
  const reader = new FileReader();
  reader.onload = async ev => {
    let parsed;
    try {
      // Jira cơ quan chỉ cho xuất HTML ("Export → HTML report"); vẫn nhận Excel/CSV
      const wb = isHtml
        ? tkHtmlToWorkbook(ev.target.result)
        : XLSX.read(new Uint8Array(ev.target.result), { type: 'array', cellDates: true });
      parsed = tkParseWorkbook(wb);
    } catch (err) { toast('Không đọc được file: ' + err.message, 'error'); return; }
    if (!parsed.tickets.length) {
      toast('Không thấy cột Key + Summary trong file. Xuất lại filter Jira (HTML report hoặc Excel).', 'error', 6000);
      return;
    }
    const have = new Set((dbTickets || []).map(t => t.key));
    const nNew = parsed.tickets.filter(t => !have.has(t.key)).length;
    const noLabel = parsed.tickets.filter(t => !t.labels).length;
    const ok = await uiConfirm('Nạp file Jira',
      `Đọc được <b>${parsed.tickets.length} ticket</b> từ sheet: ${parsed.sheets.map(esc).join(', ')}.<br>
       Mới: <b>${nNew}</b> · cập nhật: <b>${parsed.tickets.length - nNew}</b>${noLabel ? ` · <span style="color:var(--warning)">${noLabel} ticket chưa có label</span>` : ''}.<br>
       Cột Jira được ghi đè theo file; ưu tiên team, quyết định, kỳ, ghi chú giữ nguyên.`,
      'info', `Nạp ${parsed.tickets.length} ticket`);
    if (!ok) return;
    if (typeof showLoading === 'function') showLoading('Đang nạp ticket…');
    const res = await _gasTicketImport(parsed.tickets);
    if (typeof hideLoading === 'function') hideLoading();
    toast(`Đã nạp: ${res.result.added} mới · ${res.result.updated} cập nhật${res.offline ? ' (cục bộ)' : ''}.`, res.offline ? 'warning' : 'success');
    renderBacklogIt();
  };
  if (isHtml) reader.readAsText(file, 'utf-8'); else reader.readAsArrayBuffer(file);
}

function tkExportExcel() {
  const list = _tkSorted(_tkApplyPreset(_tkFiltered(_tkAll(new Date()))));
  if (!list.length) { toast('Không có ticket để xuất.', 'warning'); return; }
  const aoa = tkExportRows(list.map(x => x.t), new Date(), _tkSubIdx());
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = aoa[0].map((h, i) => ({ wch: i === 4 ? 60 : (h === 'Thiếu' || h === 'Cảnh báo') ? 36 : Math.max(10, h.length + 2) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: aoa[0].length - 1 } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planning');
  const ky = _tkKy ? '_Ky' + _tkKy : '';
  XLSX.writeFile(wb, `Planning_DCB${ky}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function tkShowGuide() {
  uiConfirm('Quy ước label Jira (team Số hóa)', `
    <div class="tk-guide">
      <div><b>Line</b> (bắt buộc 1): GNOL · BLOL · HSTD (Ký số) · ThauChi · SCF — nhãn phụ: CKTC · IDNES · TT134 · GNOL_TuDong</div>
      <div><b>DCB_Task</b>: đã chốt yêu cầu với IT</div>
      <div><b>Expect_Golive_YYYYMM</b>: tháng golive dự kiến · <b>GOLIVE_YYYYMMDD</b>: đã golive</div>
      <div><b>DXCT_QLCT</b> · <b>Dep_BPM / Dep_FCC / Dep_CCP</b></div>
      <div style="margin-top:8px"><b>UI / TLPT = Sub-task</b> dưới ticket cha (Story/Improvement/Bug), assign người phụ trách:<br>
      &nbsp;· UI: <code>DCB-xxxxx [UI/UX]&lt;tên ticket cha&gt;</code><br>
      &nbsp;· TLPT: <code>DCB-xxxxx [BA]&lt;tên ticket cha&gt;</code><br>
      Không có sub-task = không cần. Sub-task Done hết → Xong.</div>
      <div style="margin-top:8px"><b>Sẵn sàng chuyển IT</b> = DCB_Task + UI xong/không cần + TLPT xong/không cần + Expect_Golive.<br>
      Ticket (tính cả sub-task) không nhích ≥ ${TK_STALE_RED} ngày → chốt làm hoặc bỏ ở buổi planning.<br>
      Khi xuất Jira: filter <b>gồm cả Sub-task</b>.</div>
    </div>`, 'info', 'Đã hiểu');
}

/* ══════════════ modal chốt ticket ══════════════ */

function _tkEnsureModal() {
  if (document.getElementById('tkModal')) return;
  const el = document.createElement('div');
  el.id = 'tkModal';
  el.innerHTML = '<div class="tk-modal-box" id="tkModalBox"></div>';
  el.addEventListener('click', ev => { if (ev.target === el) tkCloseModal(); });
  document.body.appendChild(el);
}

function _tkOpts(values, cur, blank) {
  return (blank != null ? `<option value="">${blank}</option>` : '') +
    values.map(v => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(v)}</option>`).join('');
}

function tkOpenModal(key) {
  const t = (dbTickets || []).find(x => x.key === key);
  if (!t) return;
  _tkEnsureModal();
  _tkEditKey = key;
  const d = tkDerive(t, new Date(), _tkSubIdx());
  const lead = _tkCanLead();
  const subInfo = (label, state, list) => list.length
    ? `<div class="tk-full"><span>Sub-task ${label} · ${esc(state)}</span>${list.map(s => `<a class="tk-key" href="${TK_JIRA_BROWSE}${esc(s.key)}" target="_blank" rel="noopener">${esc(s.key)}</a> ${esc(_tkShortName(s.assignee))} · ${esc(s.status)}`).join('<br>')}</div>`
    : '';
  const dis = lead ? '' : ' disabled title="Teamlead/Admin chốt"';
  const inits = (db.initiatives || []).filter(i => !i.parentId && i.type !== 'milestone');
  const box = document.getElementById('tkModalBox');
  box.innerHTML = `
    <div class="tk-modal-head">
      <div>
        <a class="tk-key" href="${TK_JIRA_BROWSE}${esc(t.key)}" target="_blank" rel="noopener">${esc(t.key)}</a>
        <span class="tk-muted"> · ${esc(t.type)} · ${esc(t.status)} · ${esc(t.priority)}</span>
        <div class="tk-modal-title">${esc(t.summary)}</div>
      </div>
      <div class="modal-close" onclick="tkCloseModal()"><i class="fa-solid fa-xmark"></i></div>
    </div>
    <div class="tk-modal-info">
      <div><span>Line (theo ${esc(d.lineSrc || '–')}) · Hệ thống</span><b>${esc(TK_LINE_LABEL[d.line] || '–')}</b> · ${esc(d.system || '–')}</div>
      <div><span>PO (Reporter) · Dev</span>${esc(_tkPerson(d.po))} · ${esc(_tkShortName(t.assignee))}</div>
      <div><span>Project</span>${esc(t.project || '–')}</div>
      <div><span>Component</span>${esc(t.components || '–')}</div>
      <div><span>Nhận YC · Tạo · nhích gần nhất</span>${fmtDate(t.receivedAt)}${d.receivedDays == null ? '' : ' (' + d.receivedDays + ' ngày)'} · ${fmtDate(t.created)} · ${fmtDate(d.lastUpd)} (${d.staleDays == null ? '–' : d.staleDays + ' ngày'})</div>
      <div><span>Golive dự kiến · Resolved</span>${d.golive ? 'T' + parseInt(d.golive.slice(4), 10) + '/' + d.golive.slice(0, 4) : '–'}${t.goliveDate ? ' (trường Jira)' : ''} · ${fmtDate(t.resolvedAt)}</div>
      <div><span>UI · TLPT (BA)</span>${esc(d.ui)} · ${esc(d.tlpt)}</div>
      <div><span>Nguồn yêu cầu</span>${esc(t.reqType || '–')}</div>
      <div class="tk-full"><span>Labels</span>${esc(t.labels || '–')}</div>
      ${subInfo('UI', d.ui, d.uiSubs)}${subInfo('BA', d.tlpt, d.baSubs)}${subInfo('khác', d.otherSubs.length + ' việc', d.otherSubs)}
      ${d.subOutside ? `<div class="tk-full"><span>Sub-task ngoài file</span>${d.subOutside} sub-task Jira liệt kê nhưng file không có (xuất filter gồm cả sub-task để thấy trạng thái)</div>` : ''}
      <div class="tk-full"><span>Sẵn sàng chuyển IT</span>${d.ready ? '<b class="tk-ok">Đạt</b>' : '<b class="tk-no">Chưa</b> — ' + d.missing.map(esc).join(' · ')}${d.warn.length ? '<br><span class="tk-mismatch">' + d.warn.map(esc).join(' · ') + '</span>' : ''}</div>
      ${t.desc ? `<div class="tk-full tk-desc"><span>Description</span>${esc(t.desc)}</div>` : ''}
    </div>
    <div class="tk-form">
      <label>UI<select id="tkfUi" class="form-control form-control-sm">${_tkOpts(TK_UI_VALUES, t.ui, '– theo Sub-task –')}</select></label>
      <label>TLPT<select id="tkfTlpt" class="form-control form-control-sm">${_tkOpts(TK_TLPT_VALUES, t.tlpt, '– theo Sub-task –')}</select></label>
      <label>Loại backlog<select id="tkfLoai" class="form-control form-control-sm">${_tkOpts(TK_LOAI_VALUES, t.loai, '–')}</select></label>
      <label>Ưu tiên team<select id="tkfUuTien" class="form-control form-control-sm"${dis}>${_tkOpts(['1', '2', '3'], t.uuTien, '–')}</select></label>
      <label>Quyết định planning<select id="tkfDec" class="form-control form-control-sm"${dis}>${_tkOpts(TK_DECISIONS, t.quyetDinh, 'Chưa chốt')}</select></label>
      <label>Kỳ planning (YYYYMM)<input id="tkfKy" class="form-control form-control-sm" placeholder="${esc(d.golive || '202612')}" value="${esc(t.ky)}"${dis}></label>
      <label class="tk-full">Initiative<select id="tkfInit" class="form-control form-control-sm"><option value="">–</option>${inits.map(i => `<option value="${esc(i.id)}"${t.initId === i.id ? ' selected' : ''}>${esc(i.id)} · ${esc(i.name || '')}</option>`).join('')}</select></label>
      <label class="tk-full">Ghi chú<textarea id="tkfNote" class="form-control form-control-sm" rows="2">${esc(t.note)}</textarea></label>
    </div>
    <div class="tk-modal-foot">
      <span class="tk-muted">Cột Jira sửa ở Jira rồi nạp lại file. UI/TLPT lấy theo Sub-task [UI/UX] · [BA] trên Jira.</span>
      <button class="btn btn-ghost btn-sm" onclick="tkCloseModal()">Đóng</button>
      <button class="btn btn-primary btn-sm" onclick="tkSaveModal()"><i class="fa-solid fa-check"></i> Lưu</button>
    </div>`;
  document.getElementById('tkModal').classList.add('open');
}

function tkCloseModal() {
  const m = document.getElementById('tkModal');
  if (m) m.classList.remove('open');
  _tkEditKey = null;
}

async function tkSaveModal() {
  const t = (dbTickets || []).find(x => x.key === _tkEditKey);
  if (!t) return;
  const ky = document.getElementById('tkfKy').value.replace(/\D/g, '');
  if (ky && !/^20\d{2}(0[1-9]|1[0-2])$/.test(ky)) { toast('Kỳ planning dạng YYYYMM, vd 202612.', 'warning'); return; }
  const next = {
    ui: document.getElementById('tkfUi').value,
    tlpt: document.getElementById('tkfTlpt').value,
    loai: document.getElementById('tkfLoai').value,
    initId: document.getElementById('tkfInit').value,
    note: document.getElementById('tkfNote').value.trim(),
  };
  if (_tkCanLead()) {
    next.uuTien = document.getElementById('tkfUuTien').value;
    next.quyetDinh = document.getElementById('tkfDec').value;
    next.ky = ky;
  }
  const patch = {};
  Object.keys(next).forEach(f => { if (String(t[f] || '') !== String(next[f] || '')) patch[f] = next[f]; });
  tkCloseModal();
  if (!Object.keys(patch).length) return;
  const ok = await _gasTicketUpdate(t.key, patch);
  if (ok) toast('Đã lưu ' + t.key, 'success');
  _tkRenderBody();
  tkUpdateBadge();
}
