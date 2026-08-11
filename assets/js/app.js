window.onload = async () => {
  // Sync lang toggle buttons with stored preference (i18n.js already set _lang)
  document.getElementById('langVI')?.classList.toggle('active', _lang === 'vi');
  document.getElementById('langEN')?.classList.toggle('active', _lang === 'en');
  applyI18n();

  const auth = getAuthSession();
  if (!auth) {
    showLoginScreen();
    return;
  }
  applyUserToUI(auth.user);
  await startApp();
};

async function startApp() {
  // Reset view scopes so each login re-initializes based on role
  _taskScope = null;
  _cpScope   = null;
  _initScope = null;

  // Startup diagnostics — visible in browser console (F12)
  console.info('%c[SHTD] v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'UNKNOWN') +
    ' — deleteTask uses: ' + (deleteTask.toString().includes('syncAction') ? '⚠️ OLD syncAction' : '✅ _gasTaskDelete'),
    'color:#4ade80;font-weight:bold;');

  loadCache();
  loadCasesFromCache();
  loadIssuesFromCache();
  loadDevFromCache();
  loadNotifsFromCache();
  if (typeof loadH2FromCache === 'function') loadH2FromCache();
  setupListeners();
  renderAll();
  navigateTo('my-work');
  updateClock();
  setInterval(updateClock, 30000);

  if (GS_WEBAPP_URL) {
    await autoConnectDB();
    readInitiatives(); // non-blocking
    readCases();       // non-blocking — load Case_Pipeline sau tasks
    readIssues();      // non-blocking — load Issue_Tracker
    readDev().then(() => {   // non-blocking — load Dev_Plan; refresh My Work if visible
      if (document.getElementById('view-my-work')?.style.display === 'contents') renderMyWork();
      if (document.getElementById('view-dev-plan')?.style.display === 'contents') renderDevPlan();
    });
    loadAppUsers();    // non-blocking — populate Team/PIC dropdowns in modals
    readNotifications();                                   // non-blocking — chuông nhắc việc
    setInterval(readNotifications, 5 * 60 * 1000);         // poll mỗi 5 phút
    if (typeof readH2 === 'function') readH2();             // non-blocking — load domain Quản trị H2 (dormant tới khi có view)
  }
}

async function autoConnectDB() {
  showLoading('Đang tải dữ liệu từ Google Sheets…');
  try {
    await readFromHandle();
    hideLoading();
    renderAll();
    document.getElementById('btnConnect').innerHTML = '<i class="fa-brands fa-google"></i> Đã kết nối';
    document.getElementById('btnConnect').className = 'btn btn-success-soft btn-sm';
    document.getElementById('btnSync').style.display = 'inline-flex';
    document.getElementById('dbDot').className = 'status-dot connected';
    document.getElementById('dbStatus').textContent = 'Google Sheets';
    document.getElementById('sbDb').textContent = 'Google Sheets';
    toast('✅ Đã tải dữ liệu từ Google Sheets!', 'success');
  } catch(e) {
    hideLoading();
    toast('⚠️ Không thể tự động tải dữ liệu. Bấm "Kết nối GG Sheets" để thử lại.', 'warning', 6000);
    console.warn('Auto-connect failed:', e.message);
  }
}

function updateClock() {
  const now = new Date();
  document.getElementById('sbTime').textContent = now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('lastUpdated').textContent = now.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const vBadge = document.getElementById('appVerBadge');
  if (vBadge && typeof APP_VERSION !== 'undefined') vBadge.textContent = 'v' + APP_VERSION;
}

function renderAll() {
  if (typeof normalizeCompleteInMemory === 'function') normalizeCompleteInMemory();  // %HT=100 ⇒ hoàn thành (display)
  updateNavBadges();
  updateFilterDropdowns();
  renderDashboard();
  renderTaskTable();
  renderPerfTable();
  if (document.getElementById('view-my-work')?.style.display === 'contents') renderMyWork();
  if (document.getElementById('view-action-plan')?.style.display === 'contents') renderActionPlan();
  if (document.getElementById('view-bld-queue')?.style.display === 'contents') renderBldQueue();
  if (document.getElementById('view-executive-summary')?.style.display === 'contents') renderExecutiveSummary();
  if (document.getElementById('view-initiative-tracker')?.style.display === 'contents') renderInitiativeTracker();
  if (document.getElementById('view-gantt')?.style.display === 'contents') renderGantt();
  if (document.getElementById('view-ai-chat')?.style.display === 'contents') renderAiChat();
  if (document.getElementById('view-branch-analysis')?.style.display === 'contents') renderBranchAnalysis();
  if (document.getElementById('view-user-management')?.style.display === 'contents') renderUserManagement();
  if (document.getElementById('view-kpi-overview')?.style.display === 'contents') renderKpiOverview();
  if (document.getElementById('view-owner-analysis')?.style.display === 'contents') renderOwnerAnalysis();
  if (document.getElementById('view-dev-plan')?.style.display === 'contents') renderDevPlan();
  if (_qvIsOpen) renderQuickView();
  if (typeof renderNotifBell === 'function') renderNotifBell();
  document.getElementById('sbCount').textContent = db.tasks.length + ' task';
}

function updateNavBadges() {
  document.getElementById('navBadgeTotal').textContent = db.tasks.length;
  const ov = db.tasks.filter(t => isOverdue(t.endDate, t.progress)).length;
  const ob = document.getElementById('navBadgeOverdue');
  ob.textContent = ov;
  ob.style.display = ov > 0 ? '' : 'none';
  const bldCount = db.tasks.filter(t => t.canBLD === 'Y').length;
  const bb = document.getElementById('navBadgeBld');
  if (bb) { bb.textContent = bldCount; bb.style.display = bldCount > 0 ? '' : 'none'; }
  const caseCount = (dbCases || []).length;
  const cb = document.getElementById('navBadgeCase');
  if (cb) { cb.textContent = caseCount; cb.style.display = caseCount > 0 ? '' : 'none'; }
}

function updateFilterDropdowns() {
  const fiEl = document.getElementById('filterInit');
  const gi = document.getElementById('ganttFilterInit');
  if (!fiEl) return;
  const curI = fiEl.value;

  let initMap = new Map();
  db.initiatives.forEach(i => { if (i.id !== 'BAU' && !i.parentId) initMap.set(i.id, `${i.id} – ${i.name}`); });
  db.tasks.forEach(t => { if (t.initiative && t.initiative !== 'BAU' && !initMap.has(t.initiative)) initMap.set(t.initiative, t.initiative); });

  const iOpts = [`<option value="">${t('common.all')}</option>`,'<option value="BAU">BAU</option>',
    ...[...initMap.entries()].map(([id,nm]) => `<option value="${id}">${nm}</option>`)].join('');
  fiEl.innerHTML = iOpts;
  if (gi) gi.innerHTML = iOpts;
  if (curI) fiEl.value = curI;

  // filterPic managed exclusively by _populateFilterPic() in renderTaskTable() (Username format, value-preserving)

  const fTuanBCEl = document.getElementById('filterTuanBC');
  if (fTuanBCEl) {
    const curTuan = fTuanBCEl.value;
    const sorted = allReportWeeks();   // union tuần auto+pinned toàn bộ task (membership)
    fTuanBCEl.innerHTML = `<option value="">${t('common.all')}</option><option value="__thisweek__">${t('filter.thisweek')}</option>`
      + sorted.map(v => `<option value="${v}">${v}</option>`).join('');
    if (curTuan) fTuanBCEl.value = curTuan;
  }

  const fInit = document.getElementById('fInit');
  if (fInit) {
    fInit.innerHTML = '<option value="BAU">BAU (Thường xuyên)</option>' + [...initMap.entries()].map(([id,nm]) => `<option value="${id}">${nm}</option>`).join('');
  }
}

async function connectDB() {
  if (!GS_WEBAPP_URL) {
    toast('⚠️ Chưa cấu hình GS_WEBAPP_URL trong mã nguồn. Xem file Apps Script đính kèm.', 'error', 8000);
    return;
  }
  showLoading('Đang tải dữ liệu từ Google Sheets…');
  try {
    await readFromHandle();
    hideLoading(); renderAll();
    toast('✅ Đã kết nối Google Sheets!', 'success');
    document.getElementById('btnConnect').innerHTML = '<i class="fa-brands fa-google"></i> Đã kết nối';
    document.getElementById('btnConnect').className = 'btn btn-success-soft btn-sm';
    document.getElementById('btnSync').style.display = 'inline-flex';
    document.getElementById('dbDot').className = 'status-dot connected';
    document.getElementById('dbStatus').textContent = 'Google Sheets';
    document.getElementById('sbDb').textContent = 'Google Sheets';
  } catch(e) {
    hideLoading();
    toast('Lỗi kết nối: ' + e.message, 'error', 6000);
  }
}

async function syncDB() {
  showLoading('Đang đồng bộ dữ liệu từ Sheets…');
  try {
    await Promise.all([
      readFromHandle(),
      readCases(),
      readIssues(),
      readDev(),
      readInitiatives(),
      readNotifications(),
    ]);
    hideLoading(); renderAll();
    toast('Đã đồng bộ toàn bộ dữ liệu!', 'success');
  } catch(e) { hideLoading(); toast('Lỗi: ' + e.message, 'error'); }
}

async function uiClearCache() {
  const ok = await uiConfirm('Ngắt kết nối',
    'Xóa dữ liệu khỏi giao diện. Dữ liệu trên Google Sheets KHÔNG bị ảnh hưởng.',
    'warn', 'Ngắt kết nối');
  if (!ok) return;
  localStorage.removeItem('shtd_v2');
  localStorage.removeItem('shtd_notifs_v1');
  db.tasks = []; db.initiatives = []; dbCases = []; dbDev = []; dbNotifs = [];
  document.getElementById('btnConnect').innerHTML = '<i class="fa-brands fa-google"></i> Kết nối GG Sheets';
  document.getElementById('btnConnect').className = 'btn btn-outline btn-sm';
  document.getElementById('btnSync').style.display = 'none';
  document.getElementById('dbDot').className = 'status-dot';
  document.getElementById('dbStatus').textContent = 'Chưa kết nối';
  document.getElementById('sbDb').textContent = 'Offline';
  clearFilters(); renderAll();
  toast('Đã ngắt kết nối.', 'info');
}

function handleImport(e) {
  if (!canImport()) { toast('Bạn không có quyền import dữ liệu.', 'error'); e.target.value = ''; return; }
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      showLoading('Đang đọc file…');
      const wb = XLSX.read(new Uint8Array(ev.target.result), {type:'array', cellDates:true});
      const ext = extractWorkbook(wb);
      if (!ext || !ext.tasks.length) { hideLoading(); toast('Không tìm thấy dữ liệu hợp lệ trong file!','error'); return; }
      const n = ext.tasks.length;
      hideLoading();
      const ok = await uiConfirm('Import Excel', `Tìm thấy <strong>${n} task</strong> trong file. Những task trùng ID sẽ được cập nhật (merge), task mới sẽ được thêm vào.`, 'info', `Import ${n} task`);
      if (!ok) return;
      await syncAction(() => {
        const deletedSet = new Set(db.deletedIds || []);
        ext.tasks.forEach(t => {
          if (deletedSet.has(t.id)) return; // skip tasks explicitly deleted from the app
          const idx = db.tasks.findIndex(x => x.id === t.id);
          if (idx > -1) db.tasks[idx] = {...db.tasks[idx], ...t};
          else db.tasks.push(t);
        });
        ext.initiatives.forEach(i => { if (!db.initiatives.some(x=>x.id===i.id)) db.initiatives.push(i); });
      });
      toast(`Import thành công ${n} task!`,'success');
    } catch(err) { hideLoading(); toast('Lỗi đọc file: ' + err.message,'error'); }
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}

function exportExcel() {
  if (!db.tasks.length) { toast('Không có dữ liệu để xuất.','warning'); return; }
  const wb = XLSX.utils.book_new();
  const aoa = [DB_COLS, ...db.tasks.map(taskToRow)];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtExportDate = (str) => {
    if (!str || typeof str !== 'string') return str;
    let d, m, y;
    const parts1 = str.split('/');
    if (parts1.length === 3 && parts1[2].length === 4) {
      d = parseInt(parts1[0], 10);
      m = parseInt(parts1[1], 10) - 1;
      y = parseInt(parts1[2], 10);
    } else {
      const dt = new Date(str);
      if (!isNaN(dt)) {
        d = dt.getDate();
        m = dt.getMonth();
        y = dt.getFullYear();
      } else {
        return str;
      }
    }
    if (isNaN(d) || isNaN(m) || isNaN(y)) return str;
    return `${String(d).padStart(2,'0')}-${months[m]}-${String(y).slice(-2)}`;
  };

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (row[11] !== undefined) row[11] = fmtExportDate(row[11]);
    if (row[12] !== undefined) row[12] = fmtExportDate(row[12]);
    const progVal = row[13];
    if (progVal !== undefined && progVal !== '') {
      if (!String(progVal).includes('%')) {
        row[13] = progVal + '%';
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    {wch:14},{wch:14},{wch:16},{wch:18},
    {wch:10},{wch:16},
    {wch:12},
    {wch:50},
    {wch:22},{wch:22},{wch:22},
    {wch:12},{wch:12},{wch:6},
    {wch:20},{wch:12},
    {wch:40},{wch:40},{wch:40},
    {wch:14},{wch:40},
    {wch:14},{wch:30}
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Task_Master');
  XLSX.writeFile(wb, `SHTD_TaskDB_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('Đã xuất file Excel!', 'success');
}

function showDetailModal(filter, title) {
  document.getElementById('detailTitle').textContent = title;

  let weekScope = null;
  let innerFilter = filter;
  const tuanPrefixes = ['tuanoverdue-','tuandone-','tuaninprog-','tuanstatus-','tuaninit-','tuan-'];
  for (const pfx of tuanPrefixes) {
    if (filter.startsWith(pfx)) {
      const rest = filter.slice(pfx.length);
      const dashIdx = rest.indexOf('-', rest.indexOf('/') + 1);
      weekScope  = dashIdx > -1 ? rest.slice(0, dashIdx) : rest;
      innerFilter = pfx.replace('tuan','').replace(/-$/,'') || 'all';
      if (pfx === 'tuanstatus-') {
        innerFilter = 'status-' + rest.slice(weekScope.length + 1);
      } else if (pfx === 'tuaninit-') {
        innerFilter = 'initiative-' + rest.slice(weekScope.length + 1);
      } else if (pfx === 'tuanoverdue-') { innerFilter = 'overdue'; }
      else if (pfx === 'tuandone-')    { innerFilter = 'done'; }
      else if (pfx === 'tuaninprog-')  { innerFilter = 'inprogress'; }
      else if (pfx === 'tuan-')        { innerFilter = 'all'; }
      break;
    }
  }

  let tasks = db.tasks.filter(t => {
    if (weekScope && !taskInReportWeek(t, weekScope)) return false;
    if (innerFilter === 'all') return true;
    if (innerFilter === 'done') return parseInt(t.progress) >= 100 || t.state === 'Hoàn thành';
    if (innerFilter === 'inprogress') return parseInt(t.progress) < 100 && t.state !== 'Hoàn thành';
    if (innerFilter === 'overdue') return isOverdue(t.endDate, t.progress);
    if (innerFilter.startsWith('status-')) return (t.status||'').toLowerCase() === innerFilter.split('-')[1].toLowerCase();
    if (innerFilter.startsWith('initiative-')) return t.initiative === innerFilter.substring(11);
    return true;
  });
  const body = document.getElementById('detailTbody');
  body.innerHTML = tasks.length === 0
    ? `<tr><td colspan="12" style="text-align:center;padding:24px;color:var(--text-3);">Không có task nào.</td></tr>`
    : tasks.map(t => `<tr onclick="editTask('${t.id}')" style="cursor:pointer;">
        <td><span style="font-family:var(--mono);color:var(--primary);font-weight:700;">${esc(t.id)}</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${esc(t.name)}">${esc(t.name)}</td>
        <td>${esc(t.initiative||'–')}</td>
        <td><span style="font-size:11px;background:var(--info-bg);color:var(--info);padding:2px 6px;border-radius:4px;font-weight:600;">${esc(t.category||'–')}</span></td>
        <td>${t.milestone ? `<span style="font-size:11px;background:var(--primary-xlight);padding:2px 6px;border-radius:3px;color:var(--primary);font-weight:700;">${esc(t.milestone)}</span>` : '–'}</td>
        <td>${esc(t.team||'–')}</td><td>${esc(t.picRes||'–')}</td>
        <td ${isOverdue(t.endDate,t.progress)?'class="text-danger-bold"':''}>${fmtDate(t.endDate)}</td>
        <td><span style="font-size:11px;color:var(--text-2);font-family:var(--mono);" title="${esc(taskReportWeeks(t).join('; '))}">${esc(taskWeeksBadge(t))}</span></td>
        <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress}%;"></div></div><span class="prog-pct">${t.progress}%</span></div></td>
        <td>${stateChip(t.state)}</td><td>${ragBadge(t.status)}</td>
      </tr>`).join('');
  document.getElementById('detailOverlay').classList.add('open');
}

function closeDetailModal() { document.getElementById('detailOverlay').classList.remove('open'); }

function openKbModal() { document.getElementById('kbOverlay').classList.add('open'); }
function closeKbModal() { document.getElementById('kbOverlay').classList.remove('open'); }

function openReportModal() {
  if (!db.tasks.length) { toast('Chưa có dữ liệu. Kết nối Sheets hoặc Import Excel trước.', 'warning'); return; }
  const sel = document.getElementById('reportWeekSelect');
  const sorted = allReportWeeks();   // union membership toàn bộ task
  const thisWeek = currentWeekLabel();
  sel.innerHTML = '<option value="">-- Chọn tuần --</option>'
    + sorted.map(v => `<option value="${v}"${v === thisWeek ? ' selected' : ''}>${v}</option>`).join('');
  document.getElementById('reportOverlay').classList.add('open');
}

function closeReportModal() { document.getElementById('reportOverlay').classList.remove('open'); }
