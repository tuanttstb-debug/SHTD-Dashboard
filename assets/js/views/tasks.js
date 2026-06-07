function getFiltered() {
  const fId   = (document.getElementById('filterId')?.value||'').trim().toLowerCase();
  const fInit = document.getElementById('filterInit')?.value||'';
  const fTeam = document.getElementById('filterTeam')?.value||'';
  const fPic  = document.getElementById('filterPic')?.value||'';
  const fSt   = document.getElementById('filterState')?.value||'';
  const fRag    = document.getElementById('filterRag')?.value||'';
  const fTuanBC = document.getElementById('filterTuanBC')?.value||'';
  const thisWeekLabel = (() => {
    const now = new Date();
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const wk = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
    return `Tuần ${String(wk).padStart(2,'0')}/${now.getFullYear()}`;
  })();
  return db.tasks.filter(t => {
    if (fId   && !(t.id||'').toLowerCase().includes(fId)) return false;
    if (fInit && t.initiative !== fInit) return false;
    if (fTeam && t.team !== fTeam) return false;
    if (fPic  && t.picRes !== fPic) return false;
    if (fSt   && t.state !== fSt) return false;
    if (fRag  && t.status !== fRag) return false;
    if (fTuanBC) {
      const val = fTuanBC === '__thisweek__' ? thisWeekLabel : fTuanBC;
      if ((t.tuanBC||'').trim() !== val) return false;
    }
    return true;
  });
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
  currentPage = 1;
  renderTaskTable();
  renderFilterChips();
}

function clearFilters() {
  ['filterId','filterInit','filterTeam','filterPic','filterState','filterRag','filterTuanBC'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  currentPage = 1;
  renderTaskTable();
  renderFilterChips();
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

function rowClick(e, id) {
  if (e.target.type === 'checkbox') return;
  editTask(id);
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
