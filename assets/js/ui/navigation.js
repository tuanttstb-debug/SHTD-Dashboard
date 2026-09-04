/* ═══════════════════════════════════════════
   NAV GROUPS — menu 2 lớp (gấp/mở + persist + badge dồn)
═══════════════════════════════════════════ */
const NAV_GROUP_KEY = 'shtd_nav_groups';
// Mặc định lần đầu: mở "Quản lý công việc"; các nhóm khác gấp.
const NAV_GROUP_DEFAULT = { bld: false, h2: false, work: true, kpi: false, admin: false };

function _loadNavGroupState() {
  try {
    const saved = JSON.parse(localStorage.getItem(NAV_GROUP_KEY)) || {};
    return { ...NAV_GROUP_DEFAULT, ...saved };
  } catch { return { ...NAV_GROUP_DEFAULT }; }
}
function _saveNavGroupState(st) {
  try { localStorage.setItem(NAV_GROUP_KEY, JSON.stringify(st)); } catch {}
}

/** Áp trạng thái gấp/mở đã lưu lên DOM + mở nhóm chứa view đang active. */
function applyNavGroupState() {
  const st = _loadNavGroupState();
  document.querySelectorAll('.nav-group').forEach(g => {
    g.classList.toggle('open', !!st[g.dataset.group]);
  });
  _expandGroupOfActive();
  updateNavGroupBadges();
}

/** Gấp/mở 1 nhóm (gọi từ onclick header) + lưu localStorage. */
function toggleNavGroup(key) {
  const g = document.querySelector(`.nav-group[data-group="${key}"]`);
  if (!g) return;
  const st = _loadNavGroupState();
  const willOpen = !g.classList.contains('open');
  st[key] = willOpen;
  g.classList.toggle('open', willOpen);
  _saveNavGroupState(st);
  updateNavGroupBadges();
}

/** Bảo đảm nhóm chứa mục đang active được mở (không đóng nhóm khác). */
function _expandGroupOfActive() {
  const active = document.querySelector('.nav-item.active');
  const g = active && active.closest('.nav-group');
  if (g) g.classList.add('open');
}

/** Badge dồn ở nhóm mẹ: chấm đỏ khi nhóm ĐANG GẤP mà có badge cảnh báo (danger) trong con. */
function updateNavGroupBadges() {
  document.querySelectorAll('.nav-group').forEach(g => {
    const hasAlert = [...g.querySelectorAll('.nav-group-body .nav-badge.danger')]
      .some(b => b.style.display !== 'none' && (parseInt(b.textContent, 10) || 0) > 0);
    g.classList.toggle('has-alert', hasAlert);   // chấm góc khi sidebar thu gọn
    const dot = g.querySelector('[data-group-dot]');
    if (dot) dot.style.display = (hasAlert && !g.classList.contains('open')) ? '' : 'none';
  });
}

function setupListeners() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.view));
  });
  applyNavGroupState();

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
      toggleSidebar(); return;
    }
    sb.classList.toggle('collapsed');
    document.getElementById('sidebarChevron').className = sb.classList.contains('collapsed') ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
  });

  // Filter change events are handled by inline onchange/oninput in HTML
  // (onFilterChange / onFilterTeamChange) — no duplicate listeners here.

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
      closeTaskModal(); closeDetailModal(); resolveConfirm(false); closeKbModal(); bldCloseMiniModal(); closeCaseModal(); closeCpSummaryPopup(); closeInitSummaryPopup(); closeCaseViewPopup(); closeTaskViewPopup(); closeInitViewPopup(); _initCloseModal(); closeIssueModal(); closeIssueViewPopup(); mwCloseInitPopup(); closeDevModal(); closeDevViewPopup(); closeNotifPanel(); _h2EscClose(); _h2rEscClose(); if(typeof h2CloseReport==='function')h2CloseReport();
    }
    if (e.ctrlKey && e.key === 'n' && !inInput) { e.preventDefault(); openTaskModal(); }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); toggleDark(); }
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); document.getElementById('sidebarToggle').click(); }
    if (e.key === '?') { openKbModal(); }

    if (e.key === 'g' && !inInput) { gKey = 'g'; return; }
    if (gKey === 'g' && !inInput) {
      const map = { m:'my-work', d:'dashboard', e:'executive-summary', b:'bld-queue', c:'case-pipeline', i:'issue-tracker', v:'dev-plan', t:'tasks', g:'gantt', p:'performance', k:'kpi-overview', a:'ai-chat' };
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
  document.getElementById('pageTitle').textContent = t('page.' + view) || view;
  if (view === 'executive-summary')    renderExecutiveSummary();
  if (view === 'bld-queue')            renderBldQueue();
  if (view === 'case-pipeline')        renderCasePipeline();
  if (view === 'tasks')                { selectedIds.clear(); renderTaskTable(); }
  if (view === 'gantt')                renderGantt();
  if (view === 'performance')          renderPerfTable();
  if (view === 'kpi-overview')         renderKpiOverview();
  if (view === 'action-plan')          renderActionPlan();
  if (view === 'kpi-progress')         renderKpiProgress();
  if (view === 'owner-analysis')       renderOwnerAnalysis();
  if (view === 'branch-analysis')      renderBranchAnalysis();
  if (view === 'rm-analysis')          renderRmAnalysis();
  if (view === 'initiative-tracker')   renderInitiativeTracker();
  if (view === 'issue-tracker')        renderIssueTracker();
  if (view === 'dev-plan')             renderDevPlan();
  if (view === 'h2-dashboard')         { if (typeof _ensureH2Loaded === 'function') _ensureH2Loaded(); renderH2Dashboard(); }
  if (view === 'h2-tracker')           { if (typeof _ensureH2Loaded === 'function') _ensureH2Loaded(); renderH2Tracker(); }
  if (view === 'h2-review')            { if (typeof _ensureH2Loaded === 'function') _ensureH2Loaded(); renderH2Review(); }
  if (view === 'ai-chat')              renderAiChat();
  if (view === 'user-management')      renderUserManagement();
  if (view === 'my-work')              renderMyWork();
  _expandGroupOfActive();
  updateNavGroupBadges();
  closeSidebar();
}

function copyPath() {
  navigator.clipboard?.writeText('\\\\ho-file01\\NHDN\\Noibo\\Team Số Hóa TD\\Báo cáo tuần')
    .then(() => toast(t('toast.path-copied'),'success'))
    .catch(() => toast(t('toast.copy-failed'),'warning'));
}
