function setupListeners() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.view));
  });

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
      toggleSidebar(); return;
    }
    sb.classList.toggle('collapsed');
    document.getElementById('sidebarChevron').className = sb.classList.contains('collapsed') ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
  });

  ['filterId','filterInit','filterTeam','filterPic','filterState','filterRag','filterTuanBC'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { currentPage = 1; renderTaskTable(); renderFilterChips(); }, 200);
    });
  });

  document.getElementById('fProg').addEventListener('input', e => {
    const v = parseInt(e.target.value) || 0;
    document.getElementById('progPreview').style.width = Math.min(v,100) + '%';
    const err = document.getElementById('errProg');
    if (v > 100) { err.classList.add('visible'); e.target.classList.add('error'); }
    else { err.classList.remove('visible'); e.target.classList.remove('error'); }
  });

  document.getElementById('fInit').addEventListener('change', () => {
    autoGenId();
    _populateMilestoneSelect('');
  });
  document.getElementById('fTeam').addEventListener('change', () => autoGenId());
  document.getElementById('fMs').addEventListener('change', () => {
    if (!document.getElementById('origId').value) autoGenId();
  });

  let gKey = null;
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    const inInput = ['INPUT','TEXTAREA','SELECT'].includes(tag);

    if (e.key === 'Escape') {
      closeTaskModal(); closeDetailModal(); resolveConfirm(false); closeKbModal(); bldCloseMiniModal(); closeCaseModal(); closeCaseViewPopup(); closeTaskViewPopup(); closeInitViewPopup(); _initCloseModal();
    }
    if (e.ctrlKey && e.key === 'n' && !inInput) { e.preventDefault(); openTaskModal(); }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); toggleDark(); }
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); document.getElementById('sidebarToggle').click(); }
    if (e.key === '?') { openKbModal(); }

    if (e.key === 'g' && !inInput) { gKey = 'g'; return; }
    if (gKey === 'g' && !inInput) {
      const map = { d:'dashboard', e:'executive-summary', b:'bld-queue', c:'case-pipeline', t:'tasks', g:'gantt', p:'performance', k:'kpi-overview', a:'ai-chat' };
      if (map[e.key]) navigateTo(map[e.key]);
      gKey = null;
    }
  });
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const isOpen = sb.classList.contains('open');
  if (isOpen) { closeSidebar(); }
  else {
    sb.classList.add('open');
    ov.classList.add('visible');
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
}

function navigateTo(view) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
  const sec = document.getElementById(`view-${view}`);
  if (sec) { sec.style.display = 'contents'; sec.style.animation = 'none'; void sec.offsetWidth; sec.style.animation = ''; }
  const titles = {
    dashboard:'Executive Dashboard', 'executive-summary':'Tổng hợp BLĐ', 'bld-queue':'Phê duyệt BLĐ',
    'case-pipeline':'Case Pipeline – Cơ hội kinh doanh',
    tasks:'Quản lý Công việc',
    gantt:'Timeline (Gantt)', performance:'Báo cáo Hiệu suất',
    'kpi-overview':'KPI Digital Overview', 'action-plan':'Action Plan – Kế hoạch hành động',
    'kpi-progress':'KPI Progress – Tiến độ từng sản phẩm',
    'owner-analysis':'Owner Analysis – Theo chủ sở hữu',
    'branch-analysis':'Branch Analysis – Theo chi nhánh',
    'rm-analysis':'RM Analysis – Theo Relationship Manager',
    'initiative-tracker':'Theo dõi Initiative',
    'ai-chat':'AI Assistant – Trợ lý thông minh',
    'user-management':'Quản lý User',
  };
  document.getElementById('pageTitle').textContent = titles[view] || view;
  if (view === 'executive-summary')    renderExecutiveSummary();
  if (view === 'bld-queue')            renderBldQueue();
  if (view === 'case-pipeline')        renderCasePipeline();
  if (view === 'tasks')                renderTaskTable();
  if (view === 'gantt')                renderGantt();
  if (view === 'performance')          renderPerfTable();
  if (view === 'kpi-overview')         renderKpiOverview();
  if (view === 'action-plan')          renderActionPlan();
  if (view === 'kpi-progress')         renderKpiProgress();
  if (view === 'owner-analysis')       renderOwnerAnalysis();
  if (view === 'branch-analysis')      renderBranchAnalysis();
  if (view === 'rm-analysis')          renderRmAnalysis();
  if (view === 'initiative-tracker')   renderInitiativeTracker();
  if (view === 'ai-chat')              renderAiChat();
  if (view === 'user-management')      renderUserManagement();
  closeSidebar();
}

function copyPath() {
  navigator.clipboard?.writeText('\\\\ho-file01\\NHDN\\Noibo\\Team Số Hóa TD\\Báo cáo tuần')
    .then(() => toast('Đã copy đường dẫn!','success'))
    .catch(() => toast('Copy không thành công, vui lòng copy thủ công.','warning'));
}
