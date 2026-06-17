function _getThisWeekLabel() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const wk = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `Tuần ${String(wk).padStart(2,'0')}/${now.getFullYear()}`;
}

function _applyPreset(tasks) {
  if (activePreset === 'active')  return tasks.filter(t => t.state !== 'Hoàn thành' && t.state !== 'Tạm dừng');
  if (activePreset === 'week')    return tasks.filter(t => (t.tuanBC||'').trim() === _getThisWeekLabel());
  if (activePreset === 'overdue') return tasks.filter(t => isOverdue(t.endDate, t.progress));
  return tasks;
}

function setPreset(name) {
  activePreset = name;
  localStorage.setItem('shtd_preset', name);
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`preset-${name}`)?.classList.add('active');
  currentPage = 1;
  renderTaskTable();
  renderFilterChips();
}

function updatePresetCounts() {
  const wkLabel = _getThisWeekLabel();
  const all = db.tasks;
  const counts = {
    active:  all.filter(t => t.state !== 'Hoàn thành' && t.state !== 'Tạm dừng').length,
    week:    all.filter(t => (t.tuanBC||'').trim() === wkLabel).length,
    overdue: all.filter(t => isOverdue(t.endDate, t.progress)).length,
    all:     all.length,
  };
  Object.entries(counts).forEach(([key, n]) => {
    const el = document.getElementById(`pcount-${key}`);
    if (el) el.textContent = n > 0 ? n : '';
  });
}

function _initPresetUI() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`preset-${activePreset}`)?.classList.add('active');
}

function getFiltered() {
  const fId     = (document.getElementById('filterId')?.value||'').trim().toLowerCase();
  const fInit   = document.getElementById('filterInit')?.value||'';
  const fTeam   = document.getElementById('filterTeam')?.value||'';
  const fPic    = document.getElementById('filterPic')?.value||'';
  const fSt     = document.getElementById('filterState')?.value||'';
  const fRag    = document.getElementById('filterRag')?.value||'';
  const fTuanBC = document.getElementById('filterTuanBC')?.value||'';
  const thisWeekLabel = _getThisWeekLabel();
  const byBar = db.tasks.filter(t => {
    if (fId   && !(t.id||'').toLowerCase().includes(fId)) return false;
    if (fInit && t.initiative !== fInit) return false;
    if (fTeam && t.team !== fTeam) return false;
    if (fPic  && (t.picRes||'').toLowerCase() !== fPic.toLowerCase()) return false;
    if (fSt   && t.state !== fSt) return false;
    if (fRag  && t.status !== fRag) return false;
    if (fTuanBC) {
      const val = fTuanBC === '__thisweek__' ? thisWeekLabel : fTuanBC;
      if ((t.tuanBC||'').trim() !== val) return false;
    }
    return true;
  });
  return _applyPreset(byBar);
}

function renderFilterChips() {
  const labels = {
    filterInit: v => `Initiative: ${v}`,
    filterTeam: v => `Team: ${v}`,
    filterPic:  v => `PIC: ${v}`,
    filterState:v => `Trạng thái: ${v}`,
    filterRag:  v => `RAG: ${v}`,
    filterId:   v => `ID: ${v}`,
    filterTuanBC: v => `Tuần BC: ${v === '__thisweek__' ? 'Tuần này' : v}`,
  };
  const chips = [];
  Object.entries(labels).forEach(([id, label]) => {
    const v = document.getElementById(id)?.value;
    if (v) chips.push(`<span class="chip">${label(v)}<span class="chip-x" onclick="clearFilter('${id}')">✕</span></span>`);
  });
  document.getElementById('filterChips').innerHTML = chips.join('');
}

function clearFilter(id) {
  const el = document.getElementById(id);
  if (el) el.value = '';
  if (id === 'filterTeam') { _populateFilterPic(''); }
  currentPage = 1;
  renderTaskTable();
  renderFilterChips();
}

function clearFilters() {
  ['filterId','filterInit','filterTeam','filterPic','filterState','filterRag','filterTuanBC'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _populateFilterPic('');
  currentPage = 1;
  renderTaskTable();
  renderFilterChips();
}

/* Populate filterPic based on team selection (User_Master or task data fallback) */
function _populateFilterPic(team) {
  const sel = document.getElementById('filterPic');
  if (!sel) return;
  const prev = sel.value;
  let opts;
  if (typeof getUsersByTeam === 'function' && typeof _appUsers !== 'undefined' && _appUsers.length) {
    opts = getUsersByTeam(team || '').map(u => ({
      value: u.Username,
      label: u.Display_Name ? `${esc(u.Display_Name)} (${esc(u.Username)})` : esc(u.Username)
    }));
  } else {
    const tasks = team ? db.tasks.filter(t => t.team === team) : db.tasks;
    const pics  = [...new Set(tasks.map(t => t.picRes).filter(Boolean))].sort();
    opts = pics.map(p => ({ value: p, label: p }));
  }
  sel.innerHTML = '<option value="">Tất cả</option>'
    + opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}

/* Called when Team filter changes — cascade-resets PIC then re-filters */
function onFilterTeamChange() {
  const picSel = document.getElementById('filterPic');
  if (picSel) picSel.value = '';
  _populateFilterPic(document.getElementById('filterTeam')?.value || '');
  onFilterChange();
}

function onFilterChange() {
  currentPage = 1;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    renderTaskTable();
    renderFilterChips();
  }, 150);
}

function sortBy(key) {
  if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
  else { sort.key = key; sort.dir = 'asc'; }
  document.querySelectorAll('#taskTable th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
  renderTaskTable();
}

function renderTaskTable() {
  _initPresetUI();
  updatePresetCounts();
  _populateFilterPic(document.getElementById('filterTeam')?.value || '');
  const tbody = document.getElementById('taskTbody');
  let tasks = getFiltered().sort((a,b) => {
    let va = a[sort.key]||'', vb = b[sort.key]||'';
    if (sort.key === 'progress') { va = parseInt(va); vb = parseInt(vb); }
    if (va < vb) return sort.dir === 'asc' ? -1 : 1;
    if (va > vb) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = tasks.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const paged = tasks.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

  document.getElementById('taskCountInfo').textContent = `Hiển thị ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE,total)} / ${total} task`;

  if (paged.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:28px;color:var(--text-3);">
      <i class="fa-solid fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
      Không có task nào. Thêm mới hoặc Import file Excel.
    </td></tr>`;
  } else {
    tbody.innerHTML = paged.map(t => {
      const ov = isOverdue(t.endDate, t.progress);
      const sel = selectedIds.has(t.id) ? 'row-selected' : '';
      const ovCls = ov ? 'row-overdue' : '';
      let init = esc(t.initiative||'–');
      if (t.milestone) init += `<br><span style="font-size:10px;background:var(--primary-xlight);padding:2px 5px;border-radius:3px;color:var(--primary);font-weight:700;">${esc(t.milestone)}</span>`;
      return `<tr class="${ovCls} ${sel}" onclick="rowClick(event,'${t.id}')">
        <td onclick="event.stopPropagation()"><input type="checkbox" data-id="${t.id}" ${selectedIds.has(t.id)?'checked':''} onchange="toggleSelect('${t.id}',this.checked)"></td>
        <td><span style="font-family:var(--mono);color:var(--primary);font-weight:700;">${esc(t.id||'–')}</span></td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;" title="${esc(t.name)}">${esc(t.name)}</td>
        <td>${init}</td>
        <td><span style="font-size:11px;background:var(--info-bg);color:var(--info);padding:2px 7px;border-radius:4px;font-weight:600;white-space:nowrap;">${esc(t.category||'–')}</span></td>
        <td>${esc(t.team||'–')}</td>
        <td>${esc(t.picRes||'–')}</td>
        <td ${ov?'class="text-danger-bold"':''}>${fmtDate(t.startDate)}</td>
        <td ${ov?'class="text-danger-bold"':''}>${fmtDate(t.endDate)}</td>
        <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress}%;"></div></div><span class="prog-pct">${t.progress}%</span></div></td>
        <td>${stateChip(t.state)}</td>
        <td>${ragBadge(t.status)}</td>
        <td><span style="font-size:12px;color:var(--text-2);font-family:var(--mono);">${esc(t.tuanBC||'–')}</span></td>
      </tr>`;
    }).join('');
  }

  renderPagination(totalPages);
  document.getElementById('selectAll').checked = paged.length > 0 && paged.every(t => selectedIds.has(t.id));
  updateBulkBar();
}

let _taskViewId = null;
let _taskEditReturnId = null;

function rowClick(e, id) {
  if (e.target.type === 'checkbox') return;
  openTaskViewPopup(id);
}

function openTaskViewPopup(id) {
  const t = db.tasks.find(x => x.id === id);
  if (!t) return;
  _taskViewId = id;

  document.getElementById('taskViewTitle').textContent = t.name || t.id;
  document.getElementById('taskViewSubtitle').textContent = `ID: ${t.id}  ·  ${t.initiative || 'BAU'}  ·  ${t.team || ''}`;

  const ov = isOverdue(t.endDate, t.progress);
  const ragMap = { Green:'badge-green', Amber:'badge-amber', Red:'badge-red' };
  const ragCls = ragMap[t.status] || 'badge-gray';

  const row = (icon, label, val) => val
    ? `<div class="cp-view-row"><span class="cp-view-label"><i class="fa-solid fa-${icon}"></i>${label}</span><span class="cp-view-val">${val}</span></div>`
    : '';

  const section = (icon, label, val) => val
    ? `<div class="cp-view-section"><div class="cp-view-section-title"><i class="fa-solid fa-${icon}"></i>${label}</div><div class="cp-view-text">${esc(val)}</div></div>`
    : '';

  document.getElementById('taskViewBody').innerHTML = `
    <div style="padding:0 4px 8px;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        ${stateChip(t.state)}
        <span class="badge ${ragCls}">${esc(t.status || '–')}</span>
        ${t.category ? `<span style="font-size:11px;background:var(--info-bg);color:var(--info);padding:2px 8px;border-radius:99px;font-weight:600;">${esc(t.category)}</span>` : ''}
        ${t.type && t.type !== 'Task' ? `<span style="font-size:11px;background:var(--primary-xlight);color:var(--primary);padding:2px 8px;border-radius:99px;font-weight:600;">${esc(t.type)}</span>` : ''}
        ${t.canBLD === 'Y' ? `<span style="font-size:11px;background:#fff3cd;color:#856404;padding:2px 8px;border-radius:99px;font-weight:600;">Cần BLĐ</span>` : ''}
        ${t.highlight === 'Y' ? `<span style="font-size:11px;background:#d4edda;color:#155724;padding:2px 8px;border-radius:99px;font-weight:600;">★ Highlight</span>` : ''}
        ${ov ? `<span style="font-size:11px;background:var(--danger-bg,#fce8e8);color:var(--danger);padding:2px 8px;border-radius:99px;font-weight:600;">Quá hạn</span>` : ''}
      </div>
      <div class="cp-view-grid">
        ${row('diagram-project', 'Initiative', esc(t.initiative || 'BAU'))}
        ${row('list-ol', 'Milestone', esc(t.milestone || ''))}
        ${row('users', 'Team', esc(t.team || ''))}
        ${t.teamPhoiHop ? row('handshake', 'Team phối hợp', esc(t.teamPhoiHop)) : ''}
        ${row('user-check', 'PIC Accountable', esc(t.picAcc || ''))}
        ${row('user', 'PIC Responsible', esc(t.picRes || ''))}
        ${t.picSupport ? row('user-plus', 'PIC Support', esc(t.picSupport)) : ''}
        ${row('calendar-plus', 'Bắt đầu', fmtDate(t.startDate))}
        ${row('calendar-xmark', 'Deadline', `<span${ov ? ' style="color:var(--danger);font-weight:700;"' : ''}>${fmtDate(t.endDate)}</span>`)}
        ${row('percent', 'Tiến độ', `${t.progress || 0}%`)}
        ${row('newspaper', 'Tuần BC', esc(t.tuanBC || ''))}
        ${t.crossTeam === 'Y' ? row('arrow-right-arrow-left', 'Cross-team', 'Có') : ''}
      </div>
      ${section('flag-checkered', 'Kết quả', t.result)}
      ${section('arrow-right', 'Kế hoạch tiếp theo', t.nextPlan)}
      ${section('triangle-exclamation', 'Vướng mắc', t.vuongMac)}
      ${t.noiDungBLD ? section('comment', 'Nội dung xin ý kiến BLĐ', t.noiDungBLD) : ''}
      ${t.yKienBLD ? `<div class="cp-view-section" style="background:var(--info-bg);border-left:3px solid var(--info);"><div class="cp-view-section-title" style="color:var(--info);"><i class="fa-solid fa-comment-dots"></i>Ý kiến Ban lãnh đạo</div><div class="cp-view-text">${esc(t.yKienBLD)}</div></div>` : ''}
    </div>`;

  document.getElementById('taskViewOverlay').style.display = 'flex';
}

function closeTaskViewPopup() {
  document.getElementById('taskViewOverlay').style.display = 'none';
  _taskViewId = null;
}

function taskViewOpenEdit() {
  const id = _taskViewId;
  _taskEditReturnId = id;
  closeTaskViewPopup();
  if (id) editTask(id);
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && p > 2 && p < totalPages-1 && Math.abs(p-currentPage) > 1) {
      if (p === 3 || p === totalPages-2) html += `<span class="page-info">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${p===currentPage?'active':''}" onclick="goPage(${p})">${p}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>`;
  el.innerHTML = html;
}

function goPage(p) { currentPage = p; renderTaskTable(); }
