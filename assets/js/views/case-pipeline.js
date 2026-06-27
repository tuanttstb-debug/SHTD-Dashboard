/* ===== CASE PIPELINE VIEW ===== */

let _cpViewMode = localStorage.getItem('cp_view') || 'table';
let _cpPreset   = 'active';
let _cpScope    = null; // null = uninit | 'mine' | 'all'
let _cpPage     = 1;
let _cpSort     = { key: 'id', dir: 'asc' };
let _cpSearch   = '';
let _cpFilterTeam   = '';
let _cpFilterRag    = '';
let _cpFilterLoai   = '';
let _cpFilterStage  = '';
let _cpFilterPic    = '';
let _cpFilterDvkd   = '';
let _cpFilterTuanBC = '';
let _cpEditId       = null;

const CP_PAGE_SIZE = 20;

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderCasePipeline() {
  _cpPopulateFilters();

  // Fallback: scope 'mine' nhưng user không có case nào (check raw, không qua preset)
  if (_getCpScope() === 'mine') {
    const rawMine = (dbCases || []).filter(c => isCurrentUser(c.pic));
    if (rawMine.length === 0) {
      _cpScope = 'all';
      _updateCpScopeUI('all');
    }
  }

  _cpRenderSummary();
  updateCpPresetCounts();
  _cpInitViewToggle();
  _cpInitPresetTabs();
  renderCpFilterChips();

  const tableWrap = document.getElementById('cpTableWrap');
  const boardWrap = document.getElementById('cpBoardWrap');

  if (_cpViewMode === 'kanban') {
    if (tableWrap) tableWrap.style.display = 'none';
    if (boardWrap) boardWrap.style.display = '';
    _cpRenderBoard();
  } else {
    if (tableWrap) tableWrap.style.display = '';
    if (boardWrap) boardWrap.style.display = 'none';
    _cpRenderTable();
  }

  const ts = document.getElementById('cpTimestamp');
  if (ts) ts.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString('vi-VN');
}

function _cpInitViewToggle() {
  document.querySelectorAll('.cp-view-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === _cpViewMode);
  });
}

function _cpInitPresetTabs() {
  document.querySelectorAll('.cp-preset-btn').forEach(b => {
    b.classList.toggle('active', b.id === `cp-preset-${_cpPreset}`);
  });
}

function cpToggleView(mode) {
  _cpViewMode = mode;
  localStorage.setItem('cp_view', mode);
  _cpPage = 1;
  renderCasePipeline();
}

function _getCpScope() {
  if (_cpScope === null) {
    const u = getCurrentUser();
    _cpScope = 'all';
    _updateCpScopeUI(_cpScope);
  }
  return _cpScope;
}

function _updateCpScopeUI(scope) {
  document.getElementById('cpScopeMine')?.classList.toggle('active', scope === 'mine');
  document.getElementById('cpScopeAll')?.classList.toggle('active', scope !== 'mine');
}

function setCpScope(scope) {
  _cpScope = scope;
  _updateCpScopeUI(scope);
  _cpPage = 1;
  renderCasePipeline();
}

/* ══════════════════════════════════════════
   PRESET
══════════════════════════════════════════ */
function cpSetPreset(name) {
  _cpPreset = name;
  _cpPage = 1;
  document.querySelectorAll('.cp-preset-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`cp-preset-${name}`)?.classList.add('active');
  _cpRenderSummary();
  if (_cpViewMode === 'kanban') _cpRenderBoard();
  else _cpRenderTable();
}

function _cpApplyPreset(cases) {
  if (_cpPreset === 'active') {
    return cases.filter(c => {
      const g = CASE_STAGE_GROUP[c.stage] || 'active';
      return g !== 'done' && g !== 'blocked';
    });
  }
  if (_cpPreset === 'bld')     return cases.filter(c => c.canBLD === 'Y');
  if (_cpPreset === 'overdue') return cases.filter(c => _cpCalcRagLabel(c) === 'Đỏ');
  return cases;
}

function updateCpPresetCounts() {
  const scope = _cpScope || 'all'; // safe: don't trigger lazy-init here
  const base = (scope === 'mine')
    ? (dbCases || []).filter(c => isCurrentUser(c.pic))
    : (dbCases || []);
  const counts = {
    active:  base.filter(c => { const g = CASE_STAGE_GROUP[c.stage] || 'active'; return g !== 'done' && g !== 'blocked'; }).length,
    bld:     base.filter(c => c.canBLD === 'Y').length,
    overdue: base.filter(c => _cpCalcRagLabel(c) === 'Đỏ').length,
    all:     base.length,
  };
  Object.entries(counts).forEach(([key, n]) => {
    const el = document.getElementById(`cp-pcount-${key}`);
    if (el) el.textContent = n > 0 ? n : '';
  });
}

/* ══════════════════════════════════════════
   FILTER + SEARCH (unified)
══════════════════════════════════════════ */
function _cpGetFiltered() {
  const scope = _getCpScope();
  let cases = _cpApplyPreset(dbCases || []);

  if (scope === 'mine') {
    cases = cases.filter(c => isCurrentUser(c.pic));
  }

  const fSearch = (_cpSearch || '').trim().toLowerCase();
  if (fSearch) {
    cases = cases.filter(c =>
      (c.id       || '').toLowerCase().includes(fSearch) ||
      (c.caseName || '').toLowerCase().includes(fSearch) ||
      (c.pic      || '').toLowerCase().includes(fSearch) ||
      (c.dvkd     || '').toLowerCase().includes(fSearch)
    );
  }

  return cases.filter(c => {
    if (_cpFilterTeam   && c.team              !== _cpFilterTeam)                        return false;
    if (_cpFilterLoai   && c.loaiHinh          !== _cpFilterLoai)                        return false;
    if (_cpFilterStage  && c.stage             !== _cpFilterStage)                       return false;
    if (_cpFilterRag    && _cpCalcRagLabel(c)  !== _cpFilterRag)                         return false;
    if (_cpFilterPic    && (c.pic||'').toLowerCase() !== _cpFilterPic.toLowerCase())     return false;
    if (_cpFilterDvkd   && c.dvkd              !== _cpFilterDvkd)                        return false;
    if (_cpFilterTuanBC && c.tuanBC            !== _cpFilterTuanBC)                      return false;
    return true;
  });
}

/* ── keep _cpApplyFilters for legacy board path ── */
function _cpApplyFilters(cases) {
  return cases.filter(c => {
    if (_cpFilterTeam   && c.team              !== _cpFilterTeam)                        return false;
    if (_cpFilterLoai   && c.loaiHinh          !== _cpFilterLoai)                        return false;
    if (_cpFilterStage  && c.stage             !== _cpFilterStage)                       return false;
    if (_cpFilterRag    && _cpCalcRagLabel(c)  !== _cpFilterRag)                         return false;
    if (_cpFilterPic    && (c.pic||'').toLowerCase() !== _cpFilterPic.toLowerCase())     return false;
    if (_cpFilterDvkd   && c.dvkd              !== _cpFilterDvkd)                        return false;
    if (_cpFilterTuanBC && c.tuanBC            !== _cpFilterTuanBC)                      return false;
    return true;
  });
}

/* Populate cpFilterPic based on selected team (User_Master or case data fallback) */
function _cpSyncFilterPic(team) {
  const sel = document.getElementById('cpFilterPic');
  if (!sel) return;
  const prev = sel.value;
  let opts;
  if (typeof getUsersByTeam === 'function' && typeof _appUsers !== 'undefined' && _appUsers.length) {
    opts = getUsersByTeam(team || '').map(u => ({
      value: u.Username,
      label: u.Display_Name ? `${esc(u.Display_Name)} (${esc(u.Username)})` : esc(u.Username)
    }));
  } else {
    const cases = team ? (dbCases || []).filter(c => c.team === team) : (dbCases || []);
    const pics  = [...new Set(cases.map(c => c.pic).filter(Boolean))].sort();
    opts = pics.map(p => ({ value: p, label: p }));
  }
  sel.innerHTML = '<option value="">Tất cả</option>'
    + opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  else sel.value = '';
}

/* Called when Team filter changes — cascade-resets PIC then re-filters */
function cpFilterTeamChange() {
  const picSel = document.getElementById('cpFilterPic');
  if (picSel) picSel.value = '';
  _cpSyncFilterPic((document.getElementById('cpFilterTeam') || {}).value || '');
  cpFilterChange();
}

function cpFilterChange() {
  _cpFilterTeam   = (document.getElementById('cpFilterTeam')   || {}).value || '';
  _cpFilterLoai   = (document.getElementById('cpFilterLoai')   || {}).value || '';
  _cpFilterStage  = (document.getElementById('cpFilterStage')  || {}).value || '';
  _cpFilterRag    = (document.getElementById('cpFilterRag')    || {}).value || '';
  _cpFilterPic    = (document.getElementById('cpFilterPic')    || {}).value || '';
  _cpFilterDvkd   = (document.getElementById('cpFilterDvkd')   || {}).value || '';
  _cpFilterTuanBC = (document.getElementById('cpFilterTuanBC') || {}).value || '';
  _cpSearch       = (document.getElementById('cpSearch')       || {}).value || '';
  _cpPage = 1;
  _cpRenderSummary();
  renderCpFilterChips();
  if (_cpViewMode === 'kanban') _cpRenderBoard();
  else _cpRenderTable();
}

function cpSearchChange() {
  _cpSearch = (document.getElementById('cpSearch') || {}).value || '';
  _cpPage = 1;
  clearTimeout(window._cpSearchTimer);
  window._cpSearchTimer = setTimeout(() => {
    _cpRenderSummary();
    renderCpFilterChips();
    if (_cpViewMode === 'kanban') _cpRenderBoard();
    else _cpRenderTable();
  }, 150);
}

function renderCpFilterChips() {
  const labels = {
    cpFilterStage:  v => `Stage: ${v}`,
    cpFilterTeam:   v => `Team: ${v}`,
    cpFilterPic:    v => `PIC: ${v}`,
    cpFilterLoai:   v => `Loại: ${v}`,
    cpFilterRag:    v => `RAG: ${v}`,
    cpFilterDvkd:   v => `ĐVKD: ${v}`,
    cpFilterTuanBC: v => `Tuần BC: ${v}`,
    cpSearch:       v => `Tìm: "${v}"`,
  };
  const chips = [];
  Object.entries(labels).forEach(([id, label]) => {
    const v = (document.getElementById(id) || {}).value;
    if (v) chips.push(`<span class="chip">${label(v)}<span class="chip-x" onclick="clearCpFilter('${id}')">✕</span></span>`);
  });
  const el = document.getElementById('cpFilterChips');
  if (el) el.innerHTML = chips.join('');
}

function clearCpFilter(id) {
  const el = document.getElementById(id);
  if (el) el.value = '';
  if (id === 'cpFilterTeam') { _cpSyncFilterPic(''); }
  cpFilterChange();
}

function clearCpFilters() {
  ['cpFilterTeam','cpFilterLoai','cpFilterStage','cpFilterRag','cpFilterPic','cpFilterDvkd','cpFilterTuanBC','cpSearch'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _cpSyncFilterPic('');
  cpFilterChange();
}

/* ──────────────────────────────────────────
   FILTER POPULATE
────────────────────────────────────────── */
function _cpPopulateFilters() {
  const cases    = dbCases || [];
  const teamSel  = document.getElementById('cpFilterTeam');
  const stageSel = document.getElementById('cpFilterStage');
  const dvkdSel  = document.getElementById('cpFilterDvkd');

  if (teamSel) {
    const teams = [...new Set(cases.map(c => c.team).filter(Boolean))].sort();
    const prev  = teamSel.value;
    teamSel.innerHTML = '<option value="">Tất cả</option>' +
      teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    teamSel.value = teams.includes(prev) ? prev : '';
    _cpFilterTeam = teamSel.value;
  }

  if (stageSel) {
    const prev = stageSel.value;
    stageSel.innerHTML = '<option value="">Tất cả</option>' +
      CASE_STAGES.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    stageSel.value = CASE_STAGES.includes(prev) ? prev : '';
    _cpFilterStage = stageSel.value;
  }

  if (dvkdSel) {
    const dvkds = [...new Set(cases.map(c => c.dvkd).filter(Boolean))].sort();
    const prev  = dvkdSel.value;
    dvkdSel.innerHTML = '<option value="">Tất cả</option>' +
      dvkds.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
    dvkdSel.value = dvkds.includes(prev) ? prev : '';
    _cpFilterDvkd = dvkdSel.value;
  }

  const tuanSel = document.getElementById('cpFilterTuanBC');
  if (tuanSel) {
    const weeks = [...new Set((dbCases || []).map(c => c.tuanBC).filter(Boolean))]
      .sort((a, b) => {
        const parse = s => { const m = s.match(/(\d+)\/(\d+)/); return m ? +m[2] * 100 + +m[1] : 0; };
        return parse(a) - parse(b);
      });
    const prevW = tuanSel.value;
    tuanSel.innerHTML = '<option value="">Tất cả</option>'
      + weeks.map(w => `<option value="${esc(w)}">${esc(w)}</option>`).join('');
    tuanSel.value = weeks.includes(prevW) ? prevW : '';
    _cpFilterTuanBC = tuanSel.value;
  }

  // Sync PIC dropdown based on current team selection
  _cpSyncFilterPic(_cpFilterTeam);
}

/* ──────────────────────────────────────────
   RAG helpers
────────────────────────────────────────── */
function _cpCalcRagLabel(c) {
  if (c.rag) return c.rag;
  return calcCaseRag(c);
}

function _cpRagClass(rag) {
  if (!rag) return 'none';
  return { 'Đỏ': 'red', 'Vàng': 'amber', 'Xanh': 'green' }[rag] || 'none';
}

/* ══════════════════════════════════════════
   SUMMARY CARDS
══════════════════════════════════════════ */
function _cpRenderSummary() {
  const filtered    = _cpGetFiltered();
  const totalVal    = filtered.reduce((s, c) => s + (c.giaTriTy || 0), 0);
  const overdueList = filtered.filter(c => _cpCalcRagLabel(c) === 'Đỏ');
  const bldList = filtered.filter(c => c.canBLD === 'Y');
  const fmt = n => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const el  = id => document.getElementById(id);
  if (el('cpStatTotal'))   el('cpStatTotal').textContent   = filtered.length;
  if (el('cpStatValue'))   el('cpStatValue').textContent   = fmt(totalVal) + ' tỷ';
  if (el('cpStatOverdue')) el('cpStatOverdue').textContent = overdueList.length;
  if (el('cpStatBld'))     el('cpStatBld').textContent     = bldList.length;
}

/* ══════════════════════════════════════════
   TABLE VIEW
══════════════════════════════════════════ */
function _cpRenderTable() {
  const filtered = _cpGetFiltered().sort((a, b) => {
    let va = a[_cpSort.key] ?? '', vb = b[_cpSort.key] ?? '';
    if (_cpSort.key === 'giaTriTy') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
    if (va < vb) return _cpSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return _cpSort.dir === 'asc' ?  1 : -1;
    return 0;
  });

  const total      = filtered.length;
  const totalPages = Math.ceil(total / CP_PAGE_SIZE) || 1;
  if (_cpPage > totalPages) _cpPage = totalPages;
  const paged = filtered.slice((_cpPage - 1) * CP_PAGE_SIZE, _cpPage * CP_PAGE_SIZE);

  const countEl = document.getElementById('cpCountInfo');
  if (countEl) {
    const start = (_cpPage - 1) * CP_PAGE_SIZE + 1;
    const end   = Math.min(_cpPage * CP_PAGE_SIZE, total);
    countEl.textContent = total > 0
      ? `Hiển thị ${start}–${end} / ${total} case`
      : 'Không có case nào';
  }

  const tbody = document.getElementById('cpTbody');
  if (!tbody) return;

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--text-3);">
      <i class="fa-solid fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
      Không có case nào. Thử thay đổi bộ lọc hoặc thêm mới.
    </td></tr>`;
  } else {
    tbody.innerHTML = paged.map(c => {
      const rag = _cpCalcRagLabel(c);
      const rc  = _cpRagClass(rag);
      const val = c.giaTriTy ? Number(c.giaTriTy).toLocaleString('vi-VN') + ' tỷ' : '–';
      const grp = CASE_STAGE_GROUP[c.stage] || 'active';

      let complexChip = '';
      if (c.complexity) {
        const cxCls = { 'Cao': 'cao', 'Trung bình': 'tb', 'Thấp': 'thap' }[c.complexity] || 'tb';
        complexChip = `<span class="cp-chip cp-chip-complex-${cxCls}" style="font-size:10px;">${esc(c.complexity)}</span>`;
      }
      const bldChip = c.canBLD === 'Y'
        ? `<span class="cp-chip cp-chip-bld" style="font-size:10px;">BLĐ</span>` : '';

      return `<tr onclick="cpOpenDetail('${esc(c.id)}')" class="${rc === 'red' ? 'row-overdue' : ''}">
        <td><span style="font-family:var(--mono);color:var(--primary);font-weight:700;font-size:12px;">${esc(c.id || '–')}</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(c.caseName || '')}"><strong>${esc(c.caseName || '–')}</strong></td>
        <td><span class="cp-stage-chip group-${grp}">${esc(c.stage || '–')}</span></td>
        <td>${esc(c.team || '–')}</td>
        <td style="white-space:nowrap;">${esc(c.pic || '–')}</td>
        <td style="white-space:nowrap;font-size:11px;color:var(--text-2);">${esc(c.dvkd || '–')}</td>
        <td style="font-weight:700;color:var(--primary);font-family:var(--mono);white-space:nowrap;">${val}</td>
        <td ${rc === 'red' ? 'class="text-danger-bold"' : ''} style="white-space:nowrap;">${fmtDate(c.deadline) || '–'}</td>
        <td style="text-align:center;"><span class="cp-rag-dot ${rc}"></span></td>
        <td><span class="cp-chip cp-chip-loai" style="font-size:10px;">${esc(c.loaiHinh || '–')}</span></td>
        <td style="white-space:nowrap;">${complexChip}${bldChip ? ' ' + bldChip : ''}</td>
      </tr>`;
    }).join('');
  }

  _cpRenderTablePagination(totalPages);
}

function _cpRenderTablePagination(totalPages) {
  const el = document.getElementById('cpPagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="cpGoPage(${_cpPage - 1})" ${_cpPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - _cpPage) > 1) {
      if (p === 3 || p === totalPages - 2) html += `<span class="page-info">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${p === _cpPage ? 'active' : ''}" onclick="cpGoPage(${p})">${p}</button>`;
  }
  html += `<button class="page-btn" onclick="cpGoPage(${_cpPage + 1})" ${_cpPage === totalPages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function cpGoPage(p) { _cpPage = p; _cpRenderTable(); }

function cpSortBy(key) {
  if (_cpSort.key === key) _cpSort.dir = _cpSort.dir === 'asc' ? 'desc' : 'asc';
  else { _cpSort.key = key; _cpSort.dir = 'asc'; }
  _cpPage = 1;
  _cpRenderTable();
}

/* ══════════════════════════════════════════
   KANBAN BOARD
══════════════════════════════════════════ */
function _cpRenderBoard() {
  const board = document.getElementById('cpBoard');
  if (!board) return;

  const filtered = _cpGetFiltered();
  const byStage  = {};
  CASE_STAGES.forEach(s => { byStage[s] = []; });
  filtered.forEach(c => {
    const s = c.stage || '';
    if (byStage[s] !== undefined) byStage[s].push(c);
    else byStage[s] = [c];
  });

  board.innerHTML = CASE_STAGES.map(stage => {
    const items = byStage[stage] || [];
    const group = CASE_STAGE_GROUP[stage] || 'active';
    const cards = items.length
      ? items.map(c => _cpCardHtml(c)).join('')
      : `<div class="cp-col-empty">Không có case</div>`;
    return `
      <div class="cp-col">
        <div class="cp-col-header group-${group}">
          <span class="cp-col-title" title="${esc(stage)}">${esc(stage)}</span>
          <span class="cp-col-count">${items.length}</span>
        </div>
        <div class="cp-col-body">${cards}</div>
      </div>`;
  }).join('');
}

function _cpCardHtml(c) {
  const rag = _cpCalcRagLabel(c);
  const rc  = _cpRagClass(rag);
  const val = c.giaTriTy ? `${Number(c.giaTriTy).toLocaleString('vi-VN')} tỷ` : '–';

  let chips = `<span class="cp-chip cp-chip-loai">${esc(c.loaiHinh || '–')}</span>`;
  if (c.complexity) {
    const cxClass = { 'Cao': 'cao', 'Trung bình': 'tb', 'Thấp': 'thap' }[c.complexity] || 'tb';
    chips += ` <span class="cp-chip cp-chip-complex-${cxClass}">${esc(c.complexity)}</span>`;
  }
  if (c.canBLD === 'Y')    chips += ` <span class="cp-chip cp-chip-bld">Cần BLĐ</span>`;
  if (c.highlight === 'Y') chips += ` <span class="cp-chip cp-chip-hl">★ Highlight</span>`;

  return `
    <div class="cp-card rag-${rc}" onclick="cpOpenDetail('${esc(c.id)}')" title="Click để xem / sửa">
      <div class="cp-card-top">
        <div class="cp-card-name">${esc(c.caseName || c.id)}</div>
        <div class="cp-card-rag ${rc}"></div>
      </div>
      <div class="cp-card-sub"><i class="fa-solid fa-user" style="margin-right:3px;opacity:.6;"></i>${esc(c.pic || '–')}</div>
      ${c.phuongAn ? `<div class="cp-card-sub" style="margin-top:2px;">${esc(c.phuongAn.length > 50 ? c.phuongAn.slice(0,50) + '…' : c.phuongAn)}</div>` : ''}
      <div class="cp-card-value">${val}</div>
      <div class="cp-card-chips">${chips}</div>
      ${c.deadline ? `<div class="cp-card-sub" style="margin-top:5px;"><i class="fa-solid fa-calendar-xmark" style="margin-right:3px;opacity:.6;"></i>${esc(fmtDate(c.deadline))}</div>` : ''}
    </div>`;
}

/* ══════════════════════════════════════════
   CRUD MODAL
══════════════════════════════════════════ */
function openCaseModal(id) {
  _cpEditId = id || null;
  const c   = id ? (dbCases || []).find(x => x.id === id) : null;

  document.getElementById('cpModalTitle').textContent = c ? 'Sửa Case' : 'Thêm Case mới';

  const fv = (fId, val) => {
    const el = document.getElementById(fId);
    if (el) el.value = val != null ? val : '';
  };

  fv('cpfId',         c ? c.id          : genCaseId());
  fv('cpfTuanBC',     c ? c.tuanBC      : _cpCurrentWeek());
  const _cpCu = !c ? getCurrentUser() : null;
  const _cpDefTeam = _cpCu ? (_cpCu.team || '') : '';
  const _cpDefUser = _cpCu ? (_cpCu.username || '') : '';
  _populateTeamSelect('cpfTeam', c ? c.team : _cpDefTeam);
  _populateUserSelect('cpfPic',  c ? c.team : _cpDefTeam, c ? c.pic : _cpDefUser);
  fv('cpfDvkd',       c ? c.dvkd        : '');
  fv('cpfCaseName',   c ? c.caseName    : '');
  fv('cpfLoaiHinh',   c ? c.loaiHinh    : '');
  fv('cpfComplexity', c ? c.complexity  : '');
  fv('cpfPhuongAn',   c ? c.phuongAn    : '');
  fv('cpfGiaTri',     c ? (c.giaTriTy || '') : '');
  fv('cpfStage',      c ? c.stage       : CASE_STAGES[0]);
  fv('cpfVuongMac',   c ? c.vuongMac    : '');
  fv('cpfNextStep',   c ? c.nextStep    : '');
  const _cpTd = new Date();
  const _cpTodayISO = `${_cpTd.getFullYear()}-${String(_cpTd.getMonth()+1).padStart(2,'0')}-${String(_cpTd.getDate()).padStart(2,'0')}`;
  fv('cpfStartDate',  c ? c.startDate   : _cpTodayISO);
  fv('cpfDeadline',   c ? c.deadline    : '');
  fv('cpfRag',        c ? c.rag         : '');
  fv('cpfCanBLD',     c ? c.canBLD      : 'N');
  fv('cpfHighlight',  c ? c.highlight   : 'N');
  fv('cpfGhiChu',     c ? c.ghiChu      : '');

  const delBtn = document.getElementById('cpModalDeleteBtn');
  if (delBtn) delBtn.style.display = (c && canImport()) ? 'inline-flex' : 'none';

  document.getElementById('cpModal').style.display = 'flex';
}

function onCaseTeamChange() {
  const team = (document.getElementById('cpfTeam') || {}).value || '';
  _populateUserSelect('cpfPic', team, '');
}

function closeCaseModal() {
  document.getElementById('cpModal').style.display = 'none';
  _cpEditId = null;
}

function handleCaseSubmit() {
  const fv = id => (document.getElementById(id) || {}).value?.trim() || '';

  const caseName = fv('cpfCaseName');
  if (!caseName) { toast('Vui lòng nhập Khách hàng / Case.', 'warning'); return; }
  const stage = fv('cpfStage');
  if (!stage) { toast('Vui lòng chọn Stage.', 'warning'); return; }

  const newCase = {
    id:         _cpEditId || fv('cpfId') || genCaseId(),
    tuanBC:     fv('cpfTuanBC'),
    team:       fv('cpfTeam'),
    pic:        fv('cpfPic'),
    dvkd:       fv('cpfDvkd'),
    caseName,
    loaiHinh:   fv('cpfLoaiHinh'),
    complexity: fv('cpfComplexity'),
    phuongAn:   fv('cpfPhuongAn'),
    giaTriTy:   parseFloat(fv('cpfGiaTri')) || 0,
    stage,
    vuongMac:   fv('cpfVuongMac'),
    nextStep:   fv('cpfNextStep'),
    startDate:  fv('cpfStartDate'),
    deadline:   fv('cpfDeadline'),
    rag:        fv('cpfRag'),
    canBLD:     fv('cpfCanBLD')    || 'N',
    highlight:  fv('cpfHighlight') || 'N',
    ghiChu:     fv('cpfGhiChu'),
    yKienBLD:   _cpEditId ? ((dbCases || []).find(x => x.id === _cpEditId)?.yKienBLD || '') : '',
  };

  // Optimistic update: mutate local + persist immediately
  if (_cpEditId) {
    const idx = dbCases.findIndex(x => x.id === _cpEditId);
    if (idx !== -1) dbCases[idx] = newCase;
    else dbCases.push(newCase);
  } else {
    dbCases.push(newCase);
  }
  persistCases();

  closeCaseModal();
  toast(_cpEditId ? 'Đã cập nhật case.' : 'Đã thêm case mới.', 'success');
  renderCasePipeline();

  // Fire atomic GAS write in background (1 row, not all cases)
  _gasCaseUpsert(newCase);
}

async function deleteCaseItem() {
  if (!_cpEditId) return;
  if (!canImport()) { toast('Bạn không có quyền xóa case.', 'error'); return; }
  const c = (dbCases || []).find(x => x.id === _cpEditId);
  const ok = await uiConfirm(
    'Xóa Case',
    `Bạn có chắc muốn xóa case <strong>${esc(c?.caseName || _cpEditId)}</strong>?`,
    'danger', 'Xóa'
  );
  if (!ok) return;

  const delId   = _cpEditId;
  const delName = c?.caseName || '';
  // Optimistic update: remove locally + persist immediately
  dbCases = (dbCases || []).filter(x => x.id !== delId);
  persistCases();

  closeCaseModal();
  toast('Đã xóa case.', 'success');
  renderCasePipeline();

  // Fire atomic GAS delete in background (1 row, not all cases)
  _gasCaseDelete(delId, delName);
}

let _cpViewId = null;
let _cpHistoryLoaded = false;

function cpOpenDetail(id) { openCaseViewPopup(id); }

function openCaseViewPopup(id) {
  const c = (dbCases || []).find(x => x.id === id);
  if (!c) return;
  _cpViewId = id;

  const rag = _cpCalcRagLabel(c);
  const ragIcon = { 'Đỏ': '🔴', 'Vàng': '🟡', 'Xanh': '🟢' }[rag] || '⚪';
  const ragCls  = { 'Đỏ': 'badge-red', 'Vàng': 'badge-amber', 'Xanh': 'badge-green' }[rag] || 'badge-gray';
  const grp     = CASE_STAGE_GROUP[c.stage] || 'active';

  document.getElementById('cpViewTitle').textContent = c.caseName || c.id;
  document.getElementById('cpViewSubtitle').textContent = `ID: ${c.id}  ·  ${c.tuanBC || ''}`;

  const editBtn = document.getElementById('cpViewEditBtn');
  if (editBtn) editBtn.style.display = getCurrentUser() ? 'inline-flex' : 'none';

  const fmt = (label, val, icon) => val
    ? `<div class="cp-view-row"><span class="cp-view-label"><i class="fa-solid fa-${icon}"></i>${label}</span><span class="cp-view-val">${val}</span></div>`
    : '';

  document.getElementById('cpViewBody').innerHTML = `
    <div style="padding:0 4px 8px;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        <span class="cp-stage-chip group-${grp}">${esc(c.stage || '–')}</span>
        <span class="badge ${ragCls}">${ragIcon} ${esc(rag || '–')}</span>
        ${c.loaiHinh ? `<span class="cp-chip cp-chip-loai">${esc(c.loaiHinh)}</span>` : ''}
        ${c.complexity ? `<span class="cp-chip cp-chip-complex-${({'Cao':'cao','Trung bình':'tb','Thấp':'thap'}[c.complexity]||'tb')}">${esc(c.complexity)}</span>` : ''}
        ${c.canBLD === 'Y' ? `<span class="cp-chip cp-chip-bld">Cần BLĐ</span>` : ''}
        ${c.highlight === 'Y' ? `<span class="cp-chip cp-chip-hl">★ Highlight</span>` : ''}
      </div>
      <div class="cp-view-grid">
        ${fmt('Team', esc(c.team), 'users')}
        ${fmt('PIC', esc(c.pic), 'user')}
        ${fmt('ĐVKD', esc(c.dvkd), 'building')}
        ${fmt('Giá trị', c.giaTriTy ? Number(c.giaTriTy).toLocaleString('vi-VN') + ' tỷ' : null, 'sack-dollar')}
        ${fmt('Bắt đầu', esc(fmtDate(c.startDate)), 'calendar-plus')}
        ${fmt('Deadline', esc(fmtDate(c.deadline)), 'calendar-xmark')}
      </div>
      ${c.phuongAn ? `<div class="cp-view-section"><div class="cp-view-section-title"><i class="fa-solid fa-lightbulb"></i>Phương án</div><div class="cp-view-text">${esc(c.phuongAn)}</div></div>` : ''}
      ${c.vuongMac ? `<div class="cp-view-section"><div class="cp-view-section-title"><i class="fa-solid fa-triangle-exclamation"></i>Vướng mắc</div><div class="cp-view-text">${esc(c.vuongMac)}</div></div>` : ''}
      ${c.nextStep ? `<div class="cp-view-section"><div class="cp-view-section-title"><i class="fa-solid fa-arrow-right"></i>Bước tiếp theo</div><div class="cp-view-text">${esc(c.nextStep)}</div></div>` : ''}
      ${c.ghiChu ? `<div class="cp-view-section"><div class="cp-view-section-title"><i class="fa-solid fa-note-sticky"></i>Ghi chú</div><div class="cp-view-text">${esc(c.ghiChu)}</div></div>` : ''}
      ${c.yKienBLD ? `<div class="cp-view-section" style="background:var(--info-bg);border-left:3px solid var(--info);"><div class="cp-view-section-title" style="color:var(--info);"><i class="fa-solid fa-comment-dots"></i>Ý kiến Ban lãnh đạo</div><div class="cp-view-text">${esc(c.yKienBLD)}</div></div>` : ''}
    </div>`;

  _cpHistoryLoaded = false;
  _cpTabSwitch('detail');
  document.getElementById('cpViewOverlay').style.display = 'flex';
}

function _cpTabSwitch(tab) {
  document.getElementById('cpTabDetail')?.classList.toggle('active', tab === 'detail');
  document.getElementById('cpTabHistory')?.classList.toggle('active', tab === 'history');
  const bodyEl = document.getElementById('cpViewBody');
  const histEl = document.getElementById('cpViewHistory');
  if (bodyEl) bodyEl.style.display = tab === 'detail'  ? '' : 'none';
  if (histEl) histEl.style.display = tab === 'history' ? '' : 'none';
  if (tab === 'history' && !_cpHistoryLoaded) _loadCpHistory();
}

async function _loadCpHistory() {
  const c = (dbCases || []).find(x => x.id === _cpViewId);
  if (!c) return;
  const el = document.getElementById('cpViewHistory');
  if (!el) return;
  el.innerHTML = '<div style="padding:28px 16px;text-align:center;color:var(--text-3);">'
               + '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lịch sử...</div>';

  const rows = await _gasAuditRead(c.id);
  _cpHistoryLoaded = true;

  const synthetic = c.startDate
    ? [c.startDate, '', 'Dữ liệu ban đầu', '', '__create__', c.id + (c.caseName ? ' | ' + c.caseName : '')]
    : null;

  el.innerHTML = _buildHistoryTable(rows, synthetic);
}

function closeCaseViewPopup() {
  document.getElementById('cpViewOverlay').style.display = 'none';
  _cpViewId = null;
}

function cpViewOpenEdit() {
  const id = _cpViewId;
  closeCaseViewPopup();
  if (id) openCaseModal(id);
}

function _cpCurrentWeek() {
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const wk   = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `Tuần ${wk}/${now.getFullYear()}`;
}

/* ══════════════════════════════════════════
   EXCEL EXPORT
══════════════════════════════════════════ */
function exportCasesToExcel() {
  const cases = _cpGetFiltered();
  if (!cases.length) { toast('Không có case nào để xuất.', 'warning'); return; }

  const rows = [CASE_COLS, ...cases.map(caseToRow)];
  const ws   = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    {wch:10},{wch:14},{wch:12},{wch:12},{wch:10},{wch:30},
    {wch:12},{wch:16},{wch:35},{wch:12},
    {wch:35},{wch:30},{wch:30},
    {wch:12},{wch:12},{wch:8},
    {wch:10},{wch:18},{wch:25},{wch:30},
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Case_Pipeline');
  XLSX.writeFile(wb, `CasePipeline_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Đã xuất Excel thành công.', 'success');
}

/* ══════════════════════════════════════════
   SUMMARY POPUP
══════════════════════════════════════════ */
function openCpSummaryPopup(type) {
  const base = _cpGetFiltered();
  let cases, title, subtitle;

  if (type === 'total') {
    cases    = base;
    title    = 'Tổng số Case';
    subtitle = `${cases.length} case đang theo dõi`;
  } else if (type === 'value') {
    cases    = base.filter(c => c.giaTriTy > 0).sort((a, b) => b.giaTriTy - a.giaTriTy);
    const tv = cases.reduce((s, c) => s + (c.giaTriTy || 0), 0);
    subtitle = `${tv.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ — ${cases.length} case`;
    title    = 'Tổng giá trị pipeline';
  } else if (type === 'overdue') {
    cases    = base.filter(c => _cpCalcRagLabel(c) === 'Đỏ');
    title    = 'Quá hạn deadline';
    subtitle = `${cases.length} case cần xử lý ngay`;
  } else if (type === 'bld') {
    cases    = base.filter(c => c.canBLD === 'Y');
    title    = 'Cần BLĐ duyệt';
    subtitle = `${cases.length} case đang chờ phê duyệt`;
  } else { return; }

  document.getElementById('cpSummaryTitle').textContent    = title;
  document.getElementById('cpSummarySubtitle').textContent = subtitle;

  const body = document.getElementById('cpSummaryBody');
  if (!cases || !cases.length) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3);">
      <i class="fa-solid fa-inbox" style="font-size:28px;display:block;margin-bottom:10px;"></i>
      Không có case nào.
    </div>`;
  } else {
    body.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);color:var(--text-2);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">
            <th style="padding:8px 6px;text-align:left;font-weight:600;">ID</th>
            <th style="padding:8px 6px;text-align:left;font-weight:600;">Khách hàng / Case</th>
            <th style="padding:8px 6px;text-align:left;font-weight:600;">Stage</th>
            <th style="padding:8px 6px;font-weight:600;">PIC</th>
            <th style="padding:8px 6px;font-weight:600;">Deadline</th>
            <th style="padding:8px 6px;text-align:center;font-weight:600;">RAG</th>
          </tr>
        </thead>
        <tbody>
          ${cases.map(c => {
            const rag = _cpCalcRagLabel(c);
            const rc  = _cpRagClass(rag);
            const grp = CASE_STAGE_GROUP[c.stage] || 'active';
            return `<tr onclick="closeCpSummaryPopup();cpOpenDetail('${esc(c.id)}')"
                        style="cursor:pointer;border-bottom:1px solid var(--border);"
                        onmouseover="this.style.background='var(--bg-2)'"
                        onmouseout="this.style.background=''">
              <td style="padding:8px 6px;font-family:var(--mono);color:var(--primary);font-weight:700;white-space:nowrap;">${esc(c.id)}</td>
              <td style="padding:8px 6px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(c.caseName || '')}">${esc(c.caseName || '–')}</td>
              <td style="padding:8px 6px;"><span class="cp-stage-chip group-${grp}" style="font-size:10px;">${esc(c.stage || '–')}</span></td>
              <td style="padding:8px 6px;white-space:nowrap;font-size:12px;">${esc(c.pic || '–')}</td>
              <td style="padding:8px 6px;white-space:nowrap;font-size:12px;${rc === 'red' ? 'color:var(--danger);font-weight:600;' : ''}">${fmtDate(c.deadline) || '–'}</td>
              <td style="padding:8px 6px;text-align:center;"><span class="cp-rag-dot ${rc}"></span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  document.getElementById('cpSummaryOverlay').style.display = 'flex';
}

function closeCpSummaryPopup() {
  document.getElementById('cpSummaryOverlay').style.display = 'none';
}

/* ══════════════════════════════════════════
   EXCEL IMPORT
══════════════════════════════════════════ */
function importCasesFromExcel(file) {
  if (!canImport()) { toast('Bạn không có quyền import dữ liệu.', 'error'); return; }
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb  = XLSX.read(e.target.result, { type: 'binary', cellDates: false });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!raw || raw.length < 2) { toast('File không có dữ liệu.', 'warning'); return; }

      const header   = raw[0].map(h => String(h).trim());
      const imported = [];
      const existing = new Set((dbCases || []).map(c => c.id));
      let newCount = 0, updateCount = 0, errCount = 0;

      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (row.every(cell => cell === '')) continue;
        try {
          const c = rowToCase(header, row.map(v => String(v ?? '').trim()));
          if (!c.caseName && !c.id) { errCount++; continue; }
          if (!c.id) c.id = genCaseId() + '_' + i;
          if (!CASE_STAGES.includes(c.stage)) c.stage = CASE_STAGES[0];
          if (existing.has(c.id)) updateCount++; else newCount++;
          imported.push(c);
        } catch(_) { errCount++; }
      }

      if (!imported.length) { toast('Không có dòng hợp lệ nào để import.', 'warning'); return; }

      uiConfirm(
        'Xác nhận import',
        `Tìm thấy <strong>${imported.length}</strong> case (${newCount} mới, ${updateCount} cập nhật${errCount ? ', ' + errCount + ' lỗi' : ''}).<br>Tiếp tục import?`,
        'primary', 'Import'
      ).then(ok => {
        if (!ok) return;
        syncCaseAction(() => {
          const idMap = new Map((dbCases || []).map(c => [c.id, c]));
          imported.forEach(c => { idMap.set(c.id, c); });
          dbCases = [...idMap.values()];
          toast(`Import thành công: ${newCount} mới, ${updateCount} cập nhật.`, 'success');
        });
      });
    } catch(err) {
      toast('Lỗi đọc file Excel: ' + err.message, 'error');
    }
  };
  reader.readAsBinaryString(file);
}
