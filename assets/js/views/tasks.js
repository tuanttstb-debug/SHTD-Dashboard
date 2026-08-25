let _taskScope = null; // null = uninit | 'mine' | 'all'

function _getTaskScope() {
  if (_taskScope === null) {
    const u = getCurrentUser();
    _taskScope = (u && u.role === 'Admin') ? 'all' : 'mine';
    _updateTaskScopeUI(_taskScope);
  }
  return _taskScope;
}

function _updateTaskScopeUI(scope) {
  document.getElementById('taskScopeMine')?.classList.toggle('active', scope === 'mine');
  document.getElementById('taskScopeAll')?.classList.toggle('active', scope !== 'mine');
}

function setTaskScope(scope) {
  _taskScope = scope;
  _updateTaskScopeUI(scope);
  currentPage = 1;
  selectedIds.clear();
  renderTaskTable();
  renderFilterChips();
}

function _getThisWeekLabel() { return currentIsoWeekLabel(); }   // ISO week (helpers.js)

function _applyPreset(tasks) {
  if (activePreset === 'active')  return tasks.filter(t => t.state !== 'Hoàn thành' && t.state !== 'Tạm dừng');
  if (activePreset === 'week')    return tasks.filter(t => taskInReportWeek(t, _getThisWeekLabel()));
  if (activePreset === 'overdue') return tasks.filter(t => isOverdue(t.endDate, t.progress));
  return tasks;
}

function setPreset(name) {
  activePreset = name;
  localStorage.setItem('shtd_preset', name);
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`preset-${name}`)?.classList.add('active');
  currentPage = 1;
  selectedIds.clear();
  renderTaskTable();
  renderFilterChips();
}

function updatePresetCounts() {
  const wkLabel = _getThisWeekLabel();
  const scope = _taskScope || 'all'; // safe: don't trigger lazy-init here
  const base = (scope === 'mine')
    ? db.tasks.filter(t => isCurrentUser(t.picRes) || isCurrentUser(t.picAcc))
    : db.tasks;
  const counts = {
    active:  base.filter(t => t.state !== 'Hoàn thành' && t.state !== 'Tạm dừng').length,
    week:    base.filter(t => taskInReportWeek(t, wkLabel)).length,
    overdue: base.filter(t => isOverdue(t.endDate, t.progress)).length,
    all:     base.length,
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
  const scope   = _getTaskScope();
  const fId     = (document.getElementById('filterId')?.value||'').trim().toLowerCase();
  const fInit   = document.getElementById('filterInit')?.value||'';
  const fTeam   = document.getElementById('filterTeam')?.value||'';
  const fPic    = document.getElementById('filterPic')?.value||'';
  const fSt     = document.getElementById('filterState')?.value||'';
  const fRag    = document.getElementById('filterRag')?.value||'';
  const fTuanBC = document.getElementById('filterTuanBC')?.value||'';
  const thisWeekLabel = _getThisWeekLabel();
  const base = (scope === 'mine')
    ? db.tasks.filter(t => isCurrentUser(t.picRes) || isCurrentUser(t.picAcc))
    : db.tasks;
  const byBar = base.filter(t => {
    if (fId   && !(t.id||'').toLowerCase().includes(fId)) return false;
    if (fInit && t.initiative !== fInit) return false;
    if (fTeam && t.team !== fTeam) return false;
    if (fPic) {
      const fp = fPic.toLowerCase();
      if ((t.picRes||'').toLowerCase() !== fp && (t.picAcc||'').toLowerCase() !== fp) return false;
    }
    if (fSt   && t.state !== fSt) return false;
    if (fRag  && t.status !== fRag) return false;
    if (fTuanBC) {
      const val = fTuanBC === '__thisweek__' ? thisWeekLabel : fTuanBC;
      if (!taskInReportWeek(t, val)) return false;
    }
    return true;
  });
  return _applyPreset(byBar);
}

function renderFilterChips() {
  const labels = {
    filterInit:  v => `${t('chip.initiative')}: ${v}`,
    filterTeam:  v => `${t('chip.team')}: ${v}`,
    filterPic:   v => `${t('chip.pic')}: ${v}`,
    filterState: v => `${t('chip.state')}: ${tState(v)}`,
    filterRag:   v => `${t('chip.rag')}: ${v}`,
    filterId:    v => `${t('chip.id')}: ${v}`,
    filterTuanBC: v => `${t('chip.tuanbc')}: ${v === '__thisweek__' ? t('chip.thisweek') : v}`,
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
  selectedIds.clear();
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
  selectedIds.clear();
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
    // Include both picRes and picAcc; normalize case to avoid duplicates
    const rawPics = [...tasks.map(t => t.picRes), ...tasks.map(t => t.picAcc)].filter(Boolean);
    const seen = new Map();
    rawPics.forEach(p => { const k = p.toLowerCase(); if (!seen.has(k)) seen.set(k, p); });
    const pics = [...seen.values()].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    opts = pics.map(p => ({ value: p, label: p }));
  }
  sel.innerHTML = `<option value="">${t('common.all')}</option>`
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
  selectedIds.clear();
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
  selectedIds.clear();
  renderTaskTable();
}

function renderTaskTable() {
  _initPresetUI();
  _populateFilterPic(document.getElementById('filterTeam')?.value || '');

  // Fallback: scope 'mine' nhưng user không có task nào (check raw, không qua preset)
  if (_getTaskScope() === 'mine') {
    const rawMine = db.tasks.filter(t => isCurrentUser(t.picRes) || isCurrentUser(t.picAcc));
    if (rawMine.length === 0) {
      _taskScope = 'all';
      _updateTaskScopeUI('all');
    }
  }
  updatePresetCounts();

  const tbody = document.getElementById('taskTbody');
  let tasks = getFiltered().sort((a,b) => {
    let va = a[sort.key]||'', vb = b[sort.key]||'';
    if (sort.key === 'progress') { va = parseInt(va); vb = parseInt(vb); }
    if (sort.key === 'tuanBC')   { va = taskFirstWeekKey(a); vb = taskFirstWeekKey(b); }   // sort theo tuần sớm nhất
    if (va < vb) return sort.dir === 'asc' ? -1 : 1;
    if (va > vb) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  const total = tasks.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const paged = tasks.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

  const from = (currentPage-1)*PAGE_SIZE+1;
  const to   = Math.min(currentPage*PAGE_SIZE, total);
  document.getElementById('taskCountInfo').textContent =
    `${t('task.count.showing')} ${from}–${to} ${t('task.count.of')} ${total} ${t('task.count.unit')}`;

  if (paged.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:28px;color:var(--text-3);">
      <i class="fa-solid fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
      ${t('task.empty')}
    </td></tr>`;
  } else {
    tbody.innerHTML = paged.map(t => {
      const ov = isOverdue(t.endDate, t.progress);
      const sel = selectedIds.has(t.id) ? 'row-selected' : '';
      const ovCls = ov ? 'row-overdue' : '';
      let init = esc(t.initiative||'–');
      if (t.milestone) init += `<br><span style="font-size:10px;background:var(--primary-xlight);padding:2px 5px;border-radius:3px;color:var(--primary);font-weight:700;">${esc(t.milestone)}</span>`;
      const _freq = normRecurrence(t.recurrence);
      const _recurChip = _freq ? `<span class="rt-recur-chip" title="Task định kỳ">${_freq === 'Tuần' ? '↻ Tuần' : '↻ Tháng'}</span>` : '';
      const _pb = taskPeriodBadgeHtml(t, 'tasksTogglePeriod');
      return `<tr class="${ovCls} ${sel}" onclick="rowClick(event,'${t.id}')">
        <td onclick="event.stopPropagation()"><input type="checkbox" data-id="${t.id}" ${selectedIds.has(t.id)?'checked':''} onchange="toggleSelect('${t.id}',this.checked)"></td>
        <td><span style="font-family:var(--mono);color:var(--primary);font-weight:700;">${esc(t.id||'–')}</span></td>
        <td style="max-width:220px;" title="${esc(t.name)}"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.name)}${_recurChip}</div>${_pb ? `<div onclick="event.stopPropagation()" style="margin-top:4px;">${_pb}</div>` : ''}</td>
        <td>${init}</td>
        <td><span style="font-size:11px;background:var(--info-bg);color:var(--info);padding:2px 7px;border-radius:4px;font-weight:600;white-space:nowrap;">${esc(t.category||'–')}</span></td>
        <td>${esc(t.team||'–')}</td>
        <td>${esc(t.picRes||'–')}</td>
        <td ${ov?'class="text-danger-bold"':''}>${fmtDate(t.startDate)}</td>
        <td ${ov?'class="text-danger-bold"':''}>${fmtDate(t.endDate)}</td>
        <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress}%;"></div></div><span class="prog-pct">${t.progress}%</span></div></td>
        <td>${stateChip(t.state)}</td>
        <td>${ragBadge(t.status)}</td>
        <td><span style="font-size:12px;color:var(--text-2);font-family:var(--mono);" title="${esc(taskReportWeeks(t).join('; '))}">${esc(taskWeeksBadge(t))}</span></td>
      </tr>`;
    }).join('');
  }

  renderPagination(totalPages);
  document.getElementById('selectAll').checked = paged.length > 0 && paged.every(t => selectedIds.has(t.id));
  updateBulkBar();
}

let _taskViewId = null;
let _taskEditReturnId = null;
let _taskHistoryLoaded = false;

function tasksTogglePeriod(id) {
  if (taskTogglePeriodDone(id)) renderTaskTable();   // mutate + lưu (helpers.js) → re-render bảng
}

function qvTogglePeriod(id) {
  if (taskTogglePeriodDone(id)) openTaskViewPopup(id);   // mutate + lưu → refresh popup chi tiết
}

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
      ${(function () {
        const st = taskPeriodStatus(t);
        if (!st.isRecurring) return '';
        const missTxt = st.hasMissed ? `<div style="font-size:11px;color:#b91c1c;margin-top:4px;">Chưa hoàn thành: ${esc(st.missed.join(', '))}</div>` : '';
        return `<div class="cp-view-row" style="margin-bottom:14px;align-items:flex-start;">
          <span class="cp-view-label"><i class="fa-solid fa-repeat"></i>Định kỳ ${st.freq === 'Tuần' ? 'hàng tuần' : 'hàng tháng'}</span>
          <span class="cp-view-val">${taskPeriodBadgeHtml(t, 'qvTogglePeriod')}${missTxt}
            <div style="font-size:11px;color:var(--text-3,#888);margin-top:4px;">Đã xong ${st.doneCount}/${st.total} kỳ · kỳ hiện tại: ${esc(st.curLabel)}</div>
          </span></div>`;
      })()}
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
        ${row('newspaper', 'Tuần BC', esc(taskReportWeeks(t).join('; ') || '–'))}
        ${t.crossTeam === 'Y' ? row('arrow-right-arrow-left', 'Cross-team', 'Có') : ''}
      </div>
      ${section('flag-checkered', 'Kết quả', t.result)}
      ${section('arrow-right', 'Kế hoạch tiếp theo', t.nextPlan)}
      ${section('triangle-exclamation', 'Vướng mắc', t.vuongMac)}
      ${t.noiDungBLD ? section('comment', 'Nội dung xin ý kiến BLĐ', t.noiDungBLD) : ''}
      ${t.yKienBLD ? `<div class="cp-view-section" style="background:var(--info-bg);border-left:3px solid var(--info);"><div class="cp-view-section-title" style="color:var(--info);"><i class="fa-solid fa-comment-dots"></i>Ý kiến Ban lãnh đạo</div><div class="cp-view-text">${esc(t.yKienBLD)}</div></div>` : ''}
    </div>`;

  _taskHistoryLoaded = false;
  _taskTabSwitch('detail');
  document.getElementById('taskViewOverlay').style.display = 'flex';
}

function _taskTabSwitch(tab) {
  document.getElementById('taskTabDetail')?.classList.toggle('active', tab === 'detail');
  document.getElementById('taskTabHistory')?.classList.toggle('active', tab === 'history');
  const bodyEl = document.getElementById('taskViewBody');
  const histEl = document.getElementById('taskViewHistory');
  if (bodyEl) bodyEl.style.display = tab === 'detail'  ? '' : 'none';
  if (histEl) histEl.style.display = tab === 'history' ? '' : 'none';
  if (tab === 'history' && !_taskHistoryLoaded) _loadTaskHistory();
}

async function _loadTaskHistory() {
  const t = db.tasks.find(x => x.id === _taskViewId);
  if (!t) return;
  const el = document.getElementById('taskViewHistory');
  if (!el) return;
  el.innerHTML = '<div style="padding:28px 16px;text-align:center;color:var(--text-3);">'
               + '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lịch sử...</div>';

  const rows = await _gasAuditRead(t.id);
  _taskHistoryLoaded = true;

  const synthetic = t.startDate
    ? [t.startDate, '', 'Dữ liệu ban đầu', '', '__create__', t.id + (t.name ? ' | ' + t.name : '')]
    : null;

  el.innerHTML = _buildHistoryTable(rows, synthetic);
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

function goPage(p) { currentPage = p; selectedIds.clear(); renderTaskTable(); }
