// ── SHTD Dashboard – Backlog IT view (ticket Jira DCB) ──
// Hub AIOS D22 (2026-10-29). Nhập liệu ở Jira (label chuẩn) → PO bấm "Nạp file Jira" →
// màn này tự tính: sẵn sàng chuyển IT · số ngày không nhích · thiếu OKR · lệch ưu tiên.
// Trên SHTD chỉ chốt: ưu tiên team · quyết định planning · kỳ (Teamlead/Admin) + ghi chú.

let _tkPreset = 'open';      // open | ready | notready | stale | all
let _tkLine   = '';
let _tkKy     = '';
let _tkSearch = '';
let _tkSort   = { key: 'stale', dir: 'desc' };
let _tkEditKey = null;
let _tkPf     = null;

/* ══════════════ helpers ══════════════ */

function _tkCanLead() {
  const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return !!(u && (u.role === 'Admin' || u.role === 'Teamlead'));
}

function _tkName(username) {
  if (typeof _appUsers !== 'undefined' && Array.isArray(_appUsers)) {
    const u = _appUsers.find(x => (x.Username || '').toLowerCase() === String(username || '').toLowerCase());
    if (u && u.Display_Name) return u.Display_Name;
  }
  return '';
}

// Chuẩn nhãn: "Tuantt4-Trần Thế Tuân" (SHTD lưu username hoa/thường lẫn → hạ thường trước khi gắn nhãn)
function _tkPerson(username) {
  return username ? PeopleFilter.label(String(username).toLowerCase(), _tkName(username)) : '–';
}

// "Dung Vu Van <TN-EDF.IT>" → "Dung Vu Van"
function _tkShortName(s) {
  return String(s || '').replace(/<[^>]*>/g, '').trim() || '–';
}

function _tkKyLabel(k) {
  return k && k.length === 6 ? `T${parseInt(k.slice(4), 10)}/${k.slice(0, 4)}` : (k || '–');
}

function _tkAll(today) {
  return (dbTickets || []).map(t => ({ t, d: tkDerive(t, today) }));
}

function _tkKyOptions(items) {
  const set = new Set();
  items.forEach(x => { if (x.d.kyEff) set.add(x.d.kyEff); });
  return [...set].sort();
}

function _tkFiltered(items) {
  let list = items;
  if (_tkPf) list = list.filter(x => _tkPf.match(x.d.team, x.d.po));
  if (_tkLine) list = list.filter(x => x.d.line === _tkLine);
  if (_tkKy) list = list.filter(x => x.d.kyEff === _tkKy);
  if (_tkSearch) {
    const q = _tkSearch.toLowerCase();
    list = list.filter(x => (x.t.key + ' ' + x.t.summary + ' ' + x.t.labels + ' ' + x.t.assignee + ' ' + x.t.note).toLowerCase().includes(q));
  }
  return list;
}

function _tkApplyPreset(list) {
  if (_tkPreset === 'all') return list;
  list = list.filter(x => x.d.open);
  if (_tkPreset === 'ready')    return list.filter(x => x.d.ready);
  if (_tkPreset === 'notready') return list.filter(x => !x.d.ready);
  if (_tkPreset === 'stale')    return list.filter(x => x.d.staleLevel === 'red');
  if (_tkPreset === 'nookr')    return list.filter(x => !x.d.okr.length);
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

  root.innerHTML = `
<div class="tk-page">
  <div class="tk-head">
    <div>
      <div class="tk-title"><i class="fa-solid fa-ticket"></i> Backlog IT — ticket Jira DCB</div>
      <div class="tk-sub">Nhập ở Jira bằng label chuẩn → nạp file xuất Jira · SHTD chỉ chốt ưu tiên, quyết định planning, kỳ</div>
    </div>
    <div class="tk-actions">
      <button class="btn btn-ghost btn-sm" onclick="tkShowGuide()"><i class="fa-solid fa-tags"></i> Quy ước label</button>
      <button class="btn btn-ghost btn-sm" onclick="tkExportExcel()"><i class="fa-solid fa-file-excel"></i> Xuất bảng planning</button>
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('tkFileInput').click()"><i class="fa-solid fa-file-import"></i> Nạp file Jira</button>
      <input type="file" id="tkFileInput" accept=".xlsx,.xls,.csv" style="display:none" onchange="tkHandleImport(event)">
    </div>
  </div>
  <div id="tkStatBar" class="tk-stat-bar"></div>
  <div class="tk-toolbar">
    <input id="tkSearch" type="text" class="form-control form-control-sm tk-search" placeholder="Tìm key, nội dung, label, dev…" value="${esc(_tkSearch)}" oninput="tkSearchInput(this.value)">
    <select id="tkTeamFilter" class="form-control form-control-sm pf-select pf-select--team"></select>
    <select id="tkUserFilter" class="form-control form-control-sm pf-select"></select>
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
  all.forEach(x => { if (x.d.po) people.push({ username: x.d.po.toLowerCase(), name: _tkName(x.d.po), team: x.d.team }); });
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
    nookr: open.filter(x => !x.d.okr.length).length,
    all: scope.length,
  };
  const card = (key, label, cls) => `<button class="tk-stat ${cls}${_tkPreset === key ? ' is-on' : ''}" data-preset="${key}" onclick="tkSetPreset('${key}')">
    <span class="tk-stat-num">${n[key]}</span><span class="tk-stat-lbl">${label}</span></button>`;
  el.innerHTML =
    card('open', 'Đang mở', '') +
    card('ready', 'Sẵn sàng chuyển IT', 'is-good') +
    card('notready', 'Chưa sẵn sàng', n.notready ? 'is-warn' : '') +
    card('stale', `Trôi ≥ ${TK_STALE_RED} ngày`, n.stale ? 'is-bad' : '') +
    card('nookr', 'Chưa gắn OKR', n.nookr ? 'is-warn' : '') +
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
      <div><b>Chưa có ticket.</b> Xuất filter Jira (Excel) gồm Key · Summary · Status · Priority · Assignee · Updated · Labels… rồi bấm <b>Nạp file Jira</b>.</div></div>`;
    return;
  }
  if (!list.length) {
    wrap.innerHTML = `<div class="tk-empty"><i class="fa-solid fa-filter"></i><div>Không có ticket khớp bộ lọc.</div></div>`;
    return;
  }
  const rows = list.map(x => _tkRowHtml(x.t, x.d)).join('');
  wrap.innerHTML = `<div class="tk-table-scroll"><table class="tk-table">
    <thead><tr>
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
    <div class="tk-foot">${list.length} ticket · bấm dòng để chốt ưu tiên / quyết định / ghi chú</div>`;
}

function _tkRowHtml(t, d) {
  const key = esc(t.key);
  const chips = [];
  d.subs.forEach(s => chips.push(`<span class="tk-chip">${esc(s)}</span>`));
  d.okr.forEach(s => chips.push(`<span class="tk-chip is-okr">${esc(s)}</span>`));
  if (d.dxct) chips.push('<span class="tk-chip is-dxct">ĐXCT</span>');
  d.deps.forEach(s => chips.push(`<span class="tk-chip is-dep">${esc(s)}</span>`));
  d.warn.filter(w => w.indexOf('Lệch') === -1).forEach(w => chips.push(`<span class="tk-chip is-warn">${esc(w)}</span>`));

  const ready = d.ready
    ? '<span class="tk-ok"><i class="fa-solid fa-circle-check"></i> Đạt</span>'
    : `<span class="tk-no"><i class="fa-solid fa-circle-xmark"></i> Chưa</span><div class="tk-missing">${d.missing.map(esc).join(' · ')}</div>`;
  const stale = d.staleDays == null ? '–'
    : `<span class="tk-stale ${d.staleLevel ? 'is-' + d.staleLevel : ''}">${d.staleDays} ngày</span><div class="tk-muted">${fmtDate(t.updated)}</div>`;
  const prio = `<div>${esc(t.priority || '–')}</div><div class="tk-muted${d.prioMismatch ? ' tk-mismatch' : ''}">${d.prioTeam ? 'Team: ' + d.prioTeam : 'Team: –'}</div>`;
  const dec = t.quyetDinh ? `<span class="tk-dec is-${t.quyetDinh === 'Đưa vào kỳ' ? 'in' : t.quyetDinh === 'Bỏ' ? 'drop' : 'hold'}">${esc(t.quyetDinh)}</span>` : '<span class="tk-muted">Chưa chốt</span>';

  return `<tr class="tk-row${d.open ? '' : ' is-done'}" onclick="tkOpenModal('${key}')">
    <td><a class="tk-key" href="${TK_JIRA_BROWSE}${key}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${key}</a><div class="tk-muted">${esc(t.type || '')}</div></td>
    <td><div class="tk-sum">${esc(t.summary || '–')}</div>${chips.length ? `<div class="tk-chips">${chips.join('')}</div>` : ''}</td>
    <td><div><b>${esc(TK_LINE_LABEL[d.line] || '–')}</b></div><div class="tk-muted">${esc(_tkPerson(d.po))}</div></td>
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
function tkSetKy(v)     { _tkKy = v; _tkRenderBody(); }
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

/* ══════════════ import / export ══════════════ */

function tkHandleImport(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    let parsed;
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array', cellDates: true });
      parsed = tkParseWorkbook(wb);
    } catch (err) { toast('Không đọc được file: ' + err.message, 'error'); return; }
    if (!parsed.tickets.length) {
      toast('Không thấy cột Key + Summary trong file. Xuất lại filter Jira dạng Excel.', 'error', 6000);
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
  reader.readAsArrayBuffer(file);
}

function tkExportExcel() {
  const list = _tkSorted(_tkApplyPreset(_tkFiltered(_tkAll(new Date()))));
  if (!list.length) { toast('Không có ticket để xuất.', 'warning'); return; }
  const aoa = tkExportRows(list.map(x => x.t), new Date());
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = aoa[0].map((h, i) => ({ wch: i === 4 ? 60 : i === 17 ? 36 : Math.max(10, h.length + 2) }));
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
      <div><b>UI_Can</b> / <b>UI_Xong</b>: cần UI / UI đã xong (không gắn = không cần UI)</div>
      <div><b>TLPT_Xong</b>: TLPT/SRS đã xong</div>
      <div><b>Expect_Golive_YYYYMM</b>: tháng golive dự kiến</div>
      <div><b>OKR_&lt;KR&gt;</b> (vd OKR_KR2_Trustlist) · <b>DXCT_QLCT</b> · <b>Dep_BPM / Dep_FCC / Dep_CCP</b></div>
      <div style="margin-top:8px"><b>Sẵn sàng chuyển IT</b> = DCB_Task + (không cần UI hoặc UI_Xong) + TLPT_Xong + Expect_Golive.<br>
      Ticket không nhích ≥ ${TK_STALE_RED} ngày → chốt làm hoặc bỏ ở buổi planning.</div>
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
  const d = tkDerive(t, new Date());
  const lead = _tkCanLead();
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
      <div><span>Line · PO</span><b>${esc(TK_LINE_LABEL[d.line] || '–')}</b> · ${esc(_tkPerson(d.po))}</div>
      <div><span>Dev</span>${esc(_tkShortName(t.assignee))}</div>
      <div><span>Reporter</span>${esc(_tkShortName(t.reporter))}</div>
      <div><span>Tạo · cập nhật</span>${fmtDate(t.created)} · ${fmtDate(t.updated)} (${d.staleDays == null ? '–' : d.staleDays + ' ngày'})</div>
      <div class="tk-full"><span>Labels</span>${esc(t.labels || '–')}</div>
      <div class="tk-full"><span>Sẵn sàng chuyển IT</span>${d.ready ? '<b class="tk-ok">Đạt</b>' : '<b class="tk-no">Chưa</b> — ' + d.missing.map(esc).join(' · ')}</div>
      ${t.desc ? `<div class="tk-full tk-desc"><span>Description</span>${esc(t.desc)}</div>` : ''}
    </div>
    <div class="tk-form">
      <label>UI<select id="tkfUi" class="form-control form-control-sm">${_tkOpts(TK_UI_VALUES, t.ui, '– theo label –')}</select></label>
      <label>TLPT<select id="tkfTlpt" class="form-control form-control-sm">${_tkOpts(TK_TLPT_VALUES, t.tlpt, '– theo label –')}</select></label>
      <label>Loại backlog<select id="tkfLoai" class="form-control form-control-sm">${_tkOpts(TK_LOAI_VALUES, t.loai, '–')}</select></label>
      <label>Ưu tiên team<select id="tkfUuTien" class="form-control form-control-sm"${dis}>${_tkOpts(['1', '2', '3'], t.uuTien, '–')}</select></label>
      <label>Quyết định planning<select id="tkfDec" class="form-control form-control-sm"${dis}>${_tkOpts(TK_DECISIONS, t.quyetDinh, 'Chưa chốt')}</select></label>
      <label>Kỳ planning (YYYYMM)<input id="tkfKy" class="form-control form-control-sm" placeholder="${esc(d.golive || '202612')}" value="${esc(t.ky)}"${dis}></label>
      <label class="tk-full">Initiative<select id="tkfInit" class="form-control form-control-sm"><option value="">–</option>${inits.map(i => `<option value="${esc(i.id)}"${t.initId === i.id ? ' selected' : ''}>${esc(i.id)} · ${esc(i.name || '')}</option>`).join('')}</select></label>
      <label class="tk-full">Ghi chú<textarea id="tkfNote" class="form-control form-control-sm" rows="2">${esc(t.note)}</textarea></label>
    </div>
    <div class="tk-modal-foot">
      <span class="tk-muted">Cột Jira sửa ở Jira rồi nạp lại file. UI/TLPT: ưu tiên label UI_Xong · TLPT_Xong.</span>
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
