'use strict';

/* ── Role-view detection (auto-detected from user.team, no new DB field) ──
   PO   : BL, CV1, CV2, Số → task list + deadline + Initiative phụ trách
   PTKD : PTKD MB, PTKD MN → task list + Case Pipeline của team
   QLDM : QLDM              → same as PO view
*/
const _MW_PO_TEAMS   = new Set(['BL', 'CV1', 'CV2', 'Số']);
const _MW_PTKD_TEAMS = new Set(['PTKD MB', 'PTKD MN']);
const _MW_QLDM_TEAMS = new Set(['QLDM']);

// ── View mode (List ⇄ Kanban) + Admin team filter + person filter — persisted ──
let _mwView         = (typeof localStorage !== 'undefined' && localStorage.getItem('shtd_mw_view')) || 'list';
let _mwTeamFilter   = null;        // Admin droplist; null → mặc định = team của Admin
let _mwPersonFilter = null;        // Teamlead/Admin: lọc theo 1 nhân sự (Res/Acc); null → tất cả

const MW_FTE_MAX           = 3;    // FTE chạy đồng thời ≥ ngưỡng này → cảnh báo đỏ
const MW_TEAM_ALL          = '__all__';
const MW_PERSON_ALL        = '__all__';

// Trạng thái Kanban (canonical, khớp droplist state ở modal task):
//   • "Cần thực hiện" (To-do) = 4 trạng thái CR liệt kê: Chưa bắt đầu · Hoàn thành chuẩn bị · Tạm dừng · Blocked.
//   • "Đang thực hiện" (In-process) = MW_KB_INPROGRESS.
//   • "Vừa đóng" (Closed) = MW_KB_DONE.
const MW_KB_INPROGRESS  = 'Đang thực hiện';
const MW_KB_DONE        = 'Hoàn thành';
const MW_KB_TODO_STATES = new Set(['Chưa bắt đầu', 'Hoàn thành chuẩn bị', 'Tạm dừng', 'Blocked']);

function _mwRoleView(user) {
  if (!user) return 'po';
  if (_MW_PTKD_TEAMS.has(user.team)) return 'ptkd';
  if (_MW_QLDM_TEAMS.has(user.team)) return 'qldm';
  return 'po'; // BL, CV1, CV2, Số + unknown
}

// ── Helpers ──

function _mwCmpUser(a, b) {
  return (a || '').toLowerCase() === (b || '').toLowerCase();
}

function _mwDiffDays(endDate) {
  if (!endDate) return null;
  const d = parseVNDate(endDate);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / 86400000);
}

function _mwDeadlineBadge(endDate) {
  const diff = _mwDiffDays(endDate);
  if (diff === null) return '';
  if (diff < 0)  return `<span class="mw-dl-badge dl-overdue">${t('mw.dl.overdue')} ${Math.abs(diff)}${t('mw.dl.days')}</span>`;
  if (diff === 0) return `<span class="mw-dl-badge dl-today">${t('mw.dl.today')}</span>`;
  if (diff <= 3) return `<span class="mw-dl-badge dl-urgent">${t('mw.dl.in')} ${diff}${t('mw.dl.days')}</span>`;
  if (diff <= 7) return `<span class="mw-dl-badge dl-soon">${t('mw.dl.in')} ${diff}${t('mw.dl.days')}</span>`;
  return `<span class="mw-dl-badge dl-ok">${t('mw.dl.in')} ${diff}${t('mw.dl.days')}</span>`;
}

// ── Data getters ──

// Role-aware scope cho My Work (nguồn DUY NHẤT — dùng cho cả List lẫn Kanban):
//   • Admin    : toàn TRUNG TÂM; lọc theo teamFilter (droplist) — mặc định = team của Admin.
//   • Teamlead : toàn TEAM của mình (task cá nhân ∪ team) — giữ nguyên "view full" như cũ.
//   • User/khác: CHỈ task CÁ NHÂN (mình là Responsible HOẶC Accountable).
function _mwTaskInScope(task, user, teamFilter) {
  const role = user.role;
  if (role === 'Admin') {
    if (teamFilter && teamFilter !== MW_TEAM_ALL) return task.team === teamFilter;
    return true;
  }
  const mine = _mwCmpUser(task.picAcc, user.username) || _mwCmpUser(task.picRes, user.username);
  if (role === 'Teamlead') return mine || task.team === user.team;
  return mine;   // User: chỉ task cá nhân
}

function _mwSortTasks(list) {
  return list.sort((a, b) => {
    const aDone = a.state === 'Hoàn thành';
    const bDone = b.state === 'Hoàn thành';
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aHl = a.highlight === 'Y';
    const bHl = b.highlight === 'Y';
    if (aHl !== bHl) return aHl ? -1 : 1;
    const aD = a.endDate || '9999-99-99';
    const bD = b.endDate || '9999-99-99';
    return aD < bD ? -1 : aD > bD ? 1 : 0;
  });
}

// Chỉ Teamlead/Admin mới thấy nhiều người → mới có droplist lọc theo nhân sự.
function _mwCanFilterPeople(user) {
  return !!user && (user.role === 'Admin' || user.role === 'Teamlead');
}

// personFilter khớp khi nhân sự là Responsible HOẶC Accountable (so khớp không phân biệt hoa/thường).
function _mwPersonMatch(task, personFilter) {
  if (!personFilter || personFilter === MW_PERSON_ALL) return true;
  return _mwCmpUser(task.picRes, personFilter) || _mwCmpUser(task.picAcc, personFilter);
}

// teamFilter chỉ áp cho Admin (droplist team); personFilter áp cho Teamlead/Admin (droplist nhân sự).
function _mwScopedTasks(user, teamFilter, personFilter) {
  if (!user) return [];
  return _mwSortTasks((db.tasks || []).filter(t =>
    _mwTaskInScope(t, user, teamFilter) && _mwPersonMatch(t, personFilter)));
}

// Danh sách nhân sự (Res/Acc) DISTINCT trong phạm vi role (đã áp teamFilter, CHƯA áp person)
// → nguồn cho droplist lọc nhanh; giữ nguyên cách viết hoa gặp đầu tiên, sắp theo alphabet.
function _mwTeamPeople(user, teamFilter) {
  if (!user) return [];
  const seen = new Map();   // key thường-hoá → nhãn hiển thị gốc
  (db.tasks || []).forEach(t => {
    if (!_mwTaskInScope(t, user, teamFilter)) return;
    [t.picRes, t.picAcc].forEach(p => {
      const v = (p || '').trim();
      if (!v) return;
      const k = v.toLowerCase();
      if (!seen.has(k)) seen.set(k, v);
    });
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'vi'));
}

// Admin: mặc định lọc theo team của chính Admin; có thể đổi qua droplist → MW_TEAM_ALL.
function _mwEffectiveTeamFilter(user) {
  if (!user || user.role !== 'Admin') return null;
  return _mwTeamFilter || user.team || MW_TEAM_ALL;
}

// personFilter hiệu lực chỉ khi role được phép lọc nhân sự (User thường bỏ qua).
function _mwEffectivePersonFilter(user) {
  return _mwCanFilterPeople(user) ? _mwPersonFilter : null;
}

function _mwGetMyTasks(user) {
  return _mwScopedTasks(user, _mwEffectiveTeamFilter(user), _mwEffectivePersonFilter(user));
}

function _mwGetUrgent(tasks, cases) {
  const urgentTasks = tasks
    .filter(t => {
      if (t.state === 'Hoàn thành') return false;
      const diff = _mwDiffDays(t.endDate);
      return diff !== null && diff <= 7;
    })
    .sort((a, b) => (_mwDiffDays(a.endDate) ?? 999) - (_mwDiffDays(b.endDate) ?? 999));

  const urgentCases = (cases || [])
    .filter(c => {
      const diff = _mwDiffDays(c.deadline);
      return diff !== null && diff <= 7;
    })
    .sort((a, b) => (_mwDiffDays(a.deadline) ?? 999) - (_mwDiffDays(b.deadline) ?? 999));

  return { tasks: urgentTasks, cases: urgentCases };
}

function _mwGetMyInits(user) {
  if (!user) return [];
  const roots = typeof _initRealRoots === 'function'
    ? _initRealRoots()
    : (db.initiatives || []).filter(i =>
        !i.parentId &&
        i.type === 'initiative' &&
        i.id !== 'BAU' &&
        i.status !== undefined
      );

  return roots.filter(i => {
    if (_mwCmpUser(i.accountable, user.username)) return true;
    if (typeof _appUsers !== 'undefined' && Array.isArray(_appUsers) && _appUsers.length) {
      const accUser = _appUsers.find(u => u.Username === i.accountable);
      if (accUser && accUser.Team === user.team) return true;
    }
    return false;
  });
}

function _mwGetMyCases(user) {
  if (!user) return [];
  return (dbCases || []).filter(c => {
    const grp = CASE_STAGE_GROUP[c.stage] || 'active';
    if (grp === 'done') return false;
    return c.team === user.team;
  });
}

// ── Champion tasks (highlight=Y, not done) ──

function _mwGetChampionTasks(tasks) {
  return tasks.filter(t => t.highlight === 'Y' && t.state !== 'Hoàn thành');
}

function _mwBuildChampionSection(champTasks) {
  if (!champTasks || champTasks.length === 0) return '';

  const unfilledCount = champTasks.filter(ct => !ct.result).length;
  const allFilled     = unfilledCount === 0;

  const items = champTasks.map(ct => {
    const id       = esc(ct.id);
    const hasFilled = !!ct.result;
    return `
<div class="mw-champion-item${hasFilled ? ' is-filled' : ''}" data-id="${id}">
  <div class="mw-champion-item-header">
    <span class="mw-init-id">${id}</span>
    <span class="mw-champion-name" title="${esc(ct.name)}">${esc(ct.name)}</span>
    <span class="mw-champion-status ${hasFilled ? 'status-ok' : 'status-todo'}">${hasFilled ? t('mw.champion.filled') : t('mw.champion.unfilled')}</span>
  </div>
  <textarea class="mw-result-area" rows="2"
    placeholder="${t('mw.champion.placeholder')}"
    onblur="mwQuickSaveResult('${id}',this.value);mwRefreshChampionStatus('${id}',this.value)"
  >${esc(ct.result || '')}</textarea>
</div>`;
  }).join('');

  const statusBadge = allFilled
    ? `<span class="mw-champion-done">${t('mw.champion.all-filled')}</span>`
    : `<span class="mw-champion-pending">${unfilledCount} ${t('mw.champion.count-unfilled')}</span>`;

  return `
<div class="mw-section mw-champion-section" id="mwChampionSection">
  <div class="mw-section-header">
    <div class="mw-section-icon champion"><i class="fa-solid fa-star"></i></div>
    <span class="mw-section-title">${t('mw.champion.title')}</span>
    <span class="mw-count">${champTasks.length}</span>
    ${statusBadge}
  </div>
  <div class="mw-champion-list">${items}</div>
</div>`;
}

// ── Dev Plan review reminder (Plan phát triển bản thân) ──

function _mwGetDevReview(user) {
  if (!user || typeof dbDev === 'undefined') return [];
  const uname = (user.username || '').toLowerCase();
  const isDone = d => typeof _devIsDone === 'function' ? _devIsDone(d) : d.state === 'Hoàn thành';
  const isStale = d => typeof _devIsStaleReview === 'function' ? _devIsStaleReview(d) : false;
  return (dbDev || [])
    .filter(d => (d.pic || '').toLowerCase() === uname)  // của tôi
    .filter(d => !isDone(d))                              // đang làm (chưa hoàn thành)
    .sort((a, b) => {
      const as = isStale(a) ? 0 : 1;                     // cần review lên đầu
      const bs = isStale(b) ? 0 : 1;
      if (as !== bs) return as - bs;
      return (a.endDate || '9999') < (b.endDate || '9999') ? -1 : 1;
    });
}

function _mwBuildDevReviewSection(devItems) {
  if (!devItems || devItems.length === 0) return '';

  const items = devItems.map(d => {
    const id    = esc(d.id);
    const prog  = Math.min(Math.max(parseInt(d.progress) || 0, 0), 100);
    const stale = typeof _devIsStaleReview === 'function' && _devIsStaleReview(d);
    return `
<div class="mw-devrv-item${stale ? ' is-stale' : ''}" data-id="${id}">
  <div class="mw-devrv-head">
    <span class="mw-init-id">${id}</span>
    <span class="mw-devrv-name" title="${esc(d.name)}">${esc(d.name)}</span>
    ${stateChip(d.state)}
    ${stale ? `<span class="mw-devrv-badge"><i class="fa-solid fa-bell"></i> ${t('dev.review.badge')}</span>` : ''}
    ${_mwDeadlineBadge(d.endDate)}
  </div>
  <div class="mw-devrv-controls">
    <label class="mw-devrv-lbl">${t('dev.col.progress')}</label>
    <input class="mw-devrv-prog" id="mwDevrvP-${id}" type="number" min="0" max="100" value="${prog}">
    <input class="mw-devrv-note" id="mwDevrvN-${id}" type="text"
      placeholder="${t('dev.col.note')}…" value="${esc(d.note || '')}">
    <button class="btn btn-primary btn-sm" onclick="mwDevReviewSave('${id}')">
      <i class="fa-solid fa-check"></i> ${t('dev.review.save')}
    </button>
  </div>
</div>`;
  }).join('');

  return `
<div class="mw-section mw-devrv-section" id="mwDevReviewSection">
  <div class="mw-section-header">
    <div class="mw-section-icon champion"><i class="fa-solid fa-seedling"></i></div>
    <span class="mw-section-title">${t('dev.review.title')}</span>
    <span class="mw-count">${devItems.length}</span>
    <span class="mw-section-link" onclick="navigateTo('dev-plan')">${t('mw.view-all')}</span>
  </div>
  <div class="mw-devrv-list">${items}</div>
</div>`;
}

function mwDevReviewSave(id) {
  const pEl = document.getElementById('mwDevrvP-' + id);
  const nEl = document.getElementById('mwDevrvN-' + id);
  const prog = pEl ? pEl.value : null;
  const note = nEl ? nEl.value : null;
  if (typeof devQuickReview === 'function') devQuickReview(id, prog, note);
  toast(t('dev.review.saved'), 'success');
  renderMyWork(); // item đã review → rời khỏi danh sách nhắc
}

// ── Build HTML ──

function _mwRagDots(taskId, currentRag) {
  const id = esc(taskId);
  // Giá trị = t.status (Green/Amber/Red) — nguồn RAG DUY NHẤT, đồng bộ dashboard/action-plan/modal
  // và LƯU được vào cột RAG của Task_Master. Nhãn/màu vẫn hiển thị tiếng Việt.
  const dots = [
    { val: 'Green', cls: 'active-xanh', title: '🟢 Xanh' },
    { val: 'Amber', cls: 'active-vang', title: '🟡 Vàng' },
    { val: 'Red',   cls: 'active-do',   title: '🔴 Đỏ' },
  ];
  const html = dots.map(d => {
    const isActive = currentRag === d.val;
    const newVal   = isActive ? '' : d.val; // click active dot → clear
    return `<span class="mw-rag-dot${isActive ? ' ' + d.cls : ''}"
      title="${d.title}"
      onclick="mwQuickSaveRag('${id}','${esc(newVal)}')"></span>`;
  }).join('');
  return `<div class="mw-rag-wrap" title="RAG">${html}</div>`;
}

function _mwBuildTaskCard(task) {
  const id    = esc(task.id);
  const prog  = Math.min(Math.max(parseInt(task.progress) || 0, 0), 100);
  const isDone = task.state === 'Hoàn thành';
  const isHl   = task.highlight === 'Y';
  const STATES = [
    'Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành chuẩn bị',
    'Hoàn thành', 'Tạm dừng', 'Blocked',
  ];
  const opts = STATES.map(s =>
    `<option value="${esc(s)}"${task.state === s ? ' selected' : ''}>${esc(tState(s))}</option>`
  ).join('');
  const periodBadge = taskPeriodBadgeHtml(task, 'mwTogglePeriod');

  return `
<div class="mw-task-card${isHl ? ' is-highlight' : ''}${isDone ? ' is-done' : ''}" data-id="${id}">
  <div class="mw-task-card-top">
    <span class="mw-task-id">${esc(task.id)}</span>
    <span class="mw-task-name" title="${esc(task.name)}">${esc(task.name)}</span>
    ${normRecurrence(task.recurrence) ? `<span class="rt-recur-chip" title="Task định kỳ">${normRecurrence(task.recurrence) === 'Tuần' ? '↻ Tuần' : '↻ Tháng'}</span>` : ''}
    ${isHl ? '<i class="fa-solid fa-star mw-task-star" title="Highlight báo cáo"></i>' : ''}
    ${_mwDeadlineBadge(task.endDate)}
  </div>
  <div class="mw-controls">
    <select class="mw-state-sel" onchange="mwQuickSaveState('${id}',this.value)">${opts}</select>
    ${_mwRagDots(task.id, task.status)}
  </div>
  ${periodBadge ? `<div class="mw-controls mw-period-row">${periodBadge}</div>` : ''}
  <div class="mw-controls">
    <div class="mw-prog-wrap">
      <div class="mw-prog-bar-bg" onclick="mwToggleProgress('${id}')" title="Click để sửa">
        <div class="mw-prog-bar-fill" style="width:${prog}%"></div>
      </div>
      <span class="mw-prog-label" id="mwPl-${id}" onclick="mwToggleProgress('${id}')">${prog}%</span>
      <input class="mw-prog-input" id="mwPi-${id}" type="number" min="0" max="100"
        value="${prog}"
        onblur="mwQuickSaveProgress('${id}',this.value)"
        onkeydown="if(event.key==='Enter')this.blur()">
    </div>
  </div>
  <textarea class="mw-result-area" rows="2"
    placeholder="${t('mw.champion.placeholder')}"
    onblur="mwQuickSaveResult('${id}',this.value)"
  >${esc(task.result || '')}</textarea>
</div>`;
}

function _mwUrgentTaskItem(t) {
  const diff = _mwDiffDays(t.endDate);
  const cls  = diff < 0 ? 'is-overdue' : diff === 0 ? 'is-today' : 'is-soon';
  const prog = Math.min(Math.max(parseInt(t.progress) || 0, 0), 100);
  const recur = normRecurrence(t.recurrence);
  return `
<div class="mw-urgent-item ${cls}" onclick="openTaskViewPopup('${esc(t.id)}')">
  <span class="mw-urgent-type type-task">Task</span>
  <span class="mw-urgent-id">${esc(t.id)}</span>
  <span class="mw-urgent-name">${esc(t.name)}</span>
  ${recur ? `<span class="rt-recur-chip" title="Task định kỳ">${recur === 'Tuần' ? '↻ Tuần' : '↻ Tháng'}</span>` : ''}
  <span class="mw-urgent-prog" title="Tiến độ ${prog}%">
    <span class="mw-urgent-prog-bar"><span class="mw-urgent-prog-fill" style="width:${prog}%"></span></span>
    <span class="mw-urgent-prog-label">${prog}%</span>
  </span>
  ${_mwDeadlineBadge(t.endDate)}
  ${stateChip(t.state)}
</div>`;
}

function _mwUrgentCaseItem(c) {
  const diff = _mwDiffDays(c.deadline);
  const cls  = diff < 0 ? 'is-overdue' : diff === 0 ? 'is-today' : 'is-soon';
  return `
<div class="mw-urgent-item ${cls}" onclick="cpOpenDetail('${esc(c.id)}')">
  <span class="mw-urgent-type type-case">Case</span>
  <span class="mw-urgent-id">${esc(c.id)}</span>
  <span class="mw-urgent-name">${esc(c.caseName)}</span>
  ${_mwDeadlineBadge(c.deadline)}
</div>`;
}

// "Cần làm ngay" split into 2 columns for fast review: Quá hạn (diff<0) | Sắp đến hạn
// (diff>=0, today + upcoming ≤7d). Each column keeps its own count + soonest-first sort.
function _mwBuildUrgentSection(urgent) {
  const overdue = [];
  const soon    = [];
  urgent.tasks.forEach(t => {
    const diff = _mwDiffDays(t.endDate);
    (diff < 0 ? overdue : soon).push({ diff, html: _mwUrgentTaskItem(t) });
  });
  urgent.cases.forEach(c => {
    const diff = _mwDiffDays(c.deadline);
    (diff < 0 ? overdue : soon).push({ diff, html: _mwUrgentCaseItem(c) });
  });
  overdue.sort((a, b) => a.diff - b.diff);   // most overdue first
  soon.sort((a, b)    => a.diff - b.diff);   // soonest first
  const total = overdue.length + soon.length;

  const header = `
  <div class="mw-section-header">
    <div class="mw-section-icon urgent"><i class="fa-solid fa-triangle-exclamation"></i></div>
    <span class="mw-section-title">${t('mw.urgent.title')}</span>
    <span class="mw-count" id="mwUrgentCount">${total}</span>
  </div>`;

  if (total === 0) {
    return `
<div class="mw-section" id="mwSectionUrgent">
  ${header}
  <div class="mw-empty"><i class="fa-solid fa-circle-check" style="color:#22c55e;margin-right:6px;"></i>${t('mw.urgent.empty')}</div>
</div>`;
  }

  const col = (cls, icon, label, list) => `
    <div class="mw-urgent-col">
      <div class="mw-urgent-col-head ${cls}">
        <i class="fa-solid ${icon}"></i>
        <span>${label}</span>
        <span class="mw-urgent-col-count">${list.length}</span>
      </div>
      ${list.length === 0
        ? `<div class="mw-empty mw-urgent-empty-col">${t('mw.urgent.col.none')}</div>`
        : `<div class="mw-urgent-list">${list.map(x => x.html).join('')}</div>`}
    </div>`;

  return `
<div class="mw-section" id="mwSectionUrgent">
  ${header}
  <div class="mw-urgent-cols">
    ${col('overdue', 'fa-circle-exclamation', t('mw.dl.overdue'), overdue)}
    ${col('soon',    'fa-clock',              t('mw.urgent.col.soon'), soon)}
  </div>
</div>`;
}

function _mwBuildTaskSection(tasks) {
  const MAX = 20;
  const shown   = tasks.slice(0, MAX);
  const hasMore = tasks.length > MAX;

  const body = shown.length === 0
    ? `<div class="mw-empty">${t('mw.tasks.empty')}</div>`
    : `<div class="mw-task-grid">${shown.map(_mwBuildTaskCard).join('')}</div>`;

  return `
<div class="mw-section">
  <div class="mw-section-header">
    <div class="mw-section-icon tasks"><i class="fa-solid fa-list-check"></i></div>
    <span class="mw-section-title">${t('mw.tasks.title')}</span>
    <span class="mw-count">${tasks.length}</span>
    ${hasMore ? `<span class="mw-section-link" onclick="navigateTo('tasks')">${t('mw.view-all')}</span>` : ''}
  </div>
  ${body}
</div>`;
}

function _mwInitStatusClass(status) {
  if (!status) return 's-active';
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes('đang'))  return 's-active';
  if (s.includes('pending')|| s.includes('chờ'))   return 's-pending';
  if (s.includes('pause')  || s.includes('tạm'))   return 's-paused';
  if (s.includes('done')   || s.includes('hoàn'))  return 's-done';
  return 's-active';
}

function _mwBuildInitSection(inits) {
  // Hiển thị TẤT CẢ initiative phụ trách — số card phải khớp badge đếm.
  // (Trước cap cứng 4 → user phụ trách 5 chỉ thấy 4 card dù badge ghi 5.)
  const shown    = inits;

  const body = inits.length === 0
    ? `<div class="mw-empty">${t('mw.init.empty')}</div>`
    : `<div class="mw-init-grid">${shown.map(ini => {
        const msCnt   = (db.initiatives || []).filter(x => x.parentId === ini.id && x.type === 'milestone').length;
        const taskCnt = (db.tasks || []).filter(t => t.initiative === ini.id).length;
        return `
<div class="mw-init-card" onclick="navigateTo('initiative-tracker')">
  <div class="mw-init-header">
    <span class="mw-init-id">${esc(ini.id)}</span>
    <span class="mw-init-name" title="${esc(ini.name)}">${esc(ini.name)}</span>
  </div>
  <div class="mw-init-meta">
    <span class="mw-init-status ${_mwInitStatusClass(ini.status)}">${esc(ini.status || 'Active')}</span>
    ${ini.category ? `<span style="font-size:11px;color:var(--text-3);">${esc(ini.category)}</span>` : ''}
    <span class="mw-init-stats">${msCnt} MS · ${taskCnt} task</span>
  </div>
  ${ini.accountable ? `<div style="font-size:11px;color:var(--text-3);"><i class="fa-solid fa-user" style="margin-right:3px;"></i>${esc(ini.accountable)}</div>` : ''}
</div>`;
      }).join('')}</div>`;

  return `
<div class="mw-section" id="mwSectionThird">
  <div class="mw-section-header">
    <div class="mw-section-icon third"><i class="fa-solid fa-diagram-project"></i></div>
    <span class="mw-section-title">${t('mw.init.title')}</span>
    <span class="mw-count">${inits.length}</span>
    <span class="mw-section-link" onclick="mwOpenInitPopup()">${t('mw.view-all')}</span>
  </div>
  ${body}
</div>`;
}

function _mwBuildCaseSection(cases) {
  const items = cases.map(c => `
<div class="mw-case-card" onclick="cpOpenDetail('${esc(c.id)}')">
  <div class="mw-case-header">
    <span class="mw-case-id">${esc(c.id)}</span>
    <span class="mw-case-name" title="${esc(c.caseName)}">${esc(c.caseName)}</span>
  </div>
  <div class="mw-case-meta">
    <span class="mw-case-stage">${esc(c.stage || '–')}</span>
    ${_mwDeadlineBadge(c.deadline)}
    ${c.giaTriTy ? `<span style="font-size:11px;color:var(--text-3);">${c.giaTriTy} tỷ</span>` : ''}
  </div>
  ${c.dvkd ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px;">${esc(c.dvkd)}</div>` : ''}
</div>`);

  const body = cases.length === 0
    ? `<div class="mw-empty">${t('mw.case.empty')}</div>`
    : `<div class="mw-case-grid">${items.join('')}</div>`;

  return `
<div class="mw-section" id="mwSectionThird">
  <div class="mw-section-header">
    <div class="mw-section-icon third"><i class="fa-solid fa-filter-circle-dollar"></i></div>
    <span class="mw-section-title">${t('mw.case.title')}</span>
    <span class="mw-count">${cases.length}</span>
    <span class="mw-section-link" onclick="navigateTo('case-pipeline')">${t('mw.view-all')}</span>
  </div>
  ${body}
</div>`;
}

// ── Kanban view (To-do / In-process / Closed) ──

// Chia scope task thành 3 cột theo trạng thái.
//   To-do    = Chưa bắt đầu / Hoàn thành chuẩn bị / Tạm dừng / Blocked (MW_KB_TODO_STATES)
//              + mọi trạng thái lạ khác (không phải In-process/Done) → không mất task nào.
//   Process  = "Đang thực hiện"
//   Closed   = "Hoàn thành"
function _mwKanbanColumns(tasks) {
  const todo   = tasks.filter(t => t.state !== MW_KB_INPROGRESS && t.state !== MW_KB_DONE);
  const inProc = tasks.filter(t => t.state === MW_KB_INPROGRESS);
  const done   = tasks.filter(t => t.state === MW_KB_DONE);

  // To-do: quá hạn trước, rồi gần đến hạn nhất (deadline tăng dần, không có ngày → cuối).
  todo.sort((a, b) => (_mwDiffDays(a.endDate) ?? 1e9) - (_mwDiffDays(b.endDate) ?? 1e9));
  // Closed: "vừa đóng" lên đầu — proxy theo Deadline giảm dần (Task_Master không có ngày đóng).
  // Hiển thị TẤT CẢ (không cap) — cột cuộn dọc trong khung cố định để dễ theo dõi khi nhiều.
  done.sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));

  return { todo, inProc, done };
}

// Đếm task "Đang thực hiện" theo picRes → tập FTE đang chạy ≥ MW_FTE_MAX task đồng thời.
function _mwOverloadedFtes(inProc) {
  const counts = {};
  inProc.forEach(t => {
    const p = (t.picRes || '').trim().toLowerCase();
    if (!p) return;
    counts[p] = (counts[p] || 0) + 1;
  });
  const over = new Set();
  Object.keys(counts).forEach(p => { if (counts[p] >= MW_FTE_MAX) over.add(p); });
  return { counts, over };
}

function _mwKanbanCard(task, overSet) {
  const id     = esc(task.id);
  const isOver = task.picRes && overSet.has(task.picRes.trim().toLowerCase());
  const ragCls = { Green: 'rag-green', Amber: 'rag-amber', Red: 'rag-red' }[task.status] || '';
  const prog   = Math.min(Math.max(parseInt(task.progress) || 0, 0), 100);
  const recur  = normRecurrence(task.recurrence);
  // Nút tick định kỳ — dùng chung badge helper; wrapper stopPropagation để không mở popup khi tick.
  const periodBadge = taskPeriodBadgeHtml(task, 'mwKbTogglePeriod');
  return `
<div class="mw-kb-card${isOver ? ' is-overload' : ''}" data-id="${id}" onclick="openTaskViewPopup('${id}')">
  <div class="mw-kb-card-top">
    <span class="mw-kb-id">${id}</span>
    ${ragCls ? `<span class="mw-kb-rag ${ragCls}"></span>` : ''}
    ${recur ? `<span class="rt-recur-chip" title="Task định kỳ">${recur === 'Tuần' ? '↻ Tuần' : '↻ Tháng'}</span>` : ''}
    ${_mwDeadlineBadge(task.endDate)}
  </div>
  <div class="mw-kb-name" title="${esc(task.name)}">${esc(task.name)}</div>
  <div class="mw-kb-prog" title="Tiến độ ${prog}%">
    <div class="mw-kb-prog-bar"><div class="mw-kb-prog-fill" style="width:${prog}%"></div></div>
    <span class="mw-kb-prog-label">${prog}%</span>
  </div>
  ${periodBadge ? `<div class="mw-kb-period" onclick="event.stopPropagation()">${periodBadge}</div>` : ''}
  <div class="mw-kb-meta">
    ${task.picRes ? `<span class="mw-kb-pic${isOver ? ' pic-over' : ''}"><i class="fa-solid fa-user"></i> ${esc(task.picRes)}</span>` : ''}
    ${isOver ? `<span class="mw-kb-overbadge" title="FTE đang chạy ≥${MW_FTE_MAX} task đồng thời"><i class="fa-solid fa-triangle-exclamation"></i> ${t('mw.kb.overload')}</span>` : ''}
  </div>
</div>`;
}

function _mwKanbanCol(cls, icon, title, list, overSet, headExtra, scroll) {
  const body = list.length === 0
    ? `<div class="mw-empty mw-kb-empty">${t('mw.kb.empty-col')}</div>`
    : list.map(tk => _mwKanbanCard(tk, overSet)).join('');
  const bodyCls = scroll ? 'mw-kb-col-body mw-kb-col-body-scroll' : 'mw-kb-col-body';
  return `
<div class="mw-kb-col">
  <div class="mw-kb-col-head ${cls}">
    <i class="fa-solid ${icon}"></i>
    <span class="mw-kb-col-title">${title}</span>
    <span class="mw-kb-col-count">${list.length}</span>
  </div>
  ${headExtra || ''}
  <div class="${bodyCls}">${body}</div>
</div>`;
}

function _mwBuildKanban(tasks) {
  const { todo, inProc, done } = _mwKanbanColumns(tasks);
  const { over } = _mwOverloadedFtes(inProc);

  // Cảnh báo tổng ở đầu cột "Đang thực hiện" khi có FTE quá tải (liệt kê tên).
  let procWarn = '';
  if (over.size) {
    const names = [...over].map(p => {
      const orig = inProc.find(x => (x.picRes || '').trim().toLowerCase() === p);
      return esc(orig ? orig.picRes : p);
    }).join(', ');
    procWarn = `
    <div class="mw-kb-overwarn" title="Ngưỡng ${MW_FTE_MAX} task đồng thời">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>${t('mw.kb.overload-warn')}: ${names}</span>
    </div>`;
  }

  // Cả 3 cột dùng CHUNG khung cuộn dọc cố định (đồng nhất concept): nhiều task không kéo dài trang.
  return `
<div class="mw-kanban">
  ${_mwKanbanCol('kb-todo', 'fa-clipboard-list',   t('mw.kb.todo'),       todo,   over, '',       true)}
  ${_mwKanbanCol('kb-proc', 'fa-spinner',          t('mw.kb.inprogress'), inProc, over, procWarn, true)}
  ${_mwKanbanCol('kb-done', 'fa-circle-check',      t('mw.kb.done'),       done,   over, '',       true)}
</div>`;
}

// ── Header tools (view toggle + Admin team droplist + person droplist) ──

function _mwViewToggleHtml() {
  const btn = (mode, icon, label) =>
    `<button class="mw-view-btn${_mwView === mode ? ' active' : ''}" onclick="mwSetView('${mode}')">
      <i class="fa-solid ${icon}"></i> ${label}</button>`;
  return `<div class="mw-view-toggle">
    ${btn('list',   'fa-list',          t('mw.view.list'))}
    ${btn('kanban', 'fa-table-columns', t('mw.view.kanban'))}
  </div>`;
}

function _mwTeamFilterHtml(user, teamFilter) {
  if (!user || user.role !== 'Admin') return '';
  const teams = (typeof TEAM_LIST !== 'undefined' && Array.isArray(TEAM_LIST)) ? TEAM_LIST : [];
  const opt = (val, lbl) =>
    `<option value="${esc(val)}"${teamFilter === val ? ' selected' : ''}>${esc(lbl)}</option>`;
  const opts = [opt(MW_TEAM_ALL, t('mw.team.all'))]
    .concat(teams.map(tm => opt(tm, tm))).join('');
  return `<select class="mw-team-filter" title="${t('mw.team.filter')}" onchange="mwSetTeamFilter(this.value)">${opts}</select>`;
}

// Droplist lọc theo nhân sự — hỗ trợ Teamlead/Admin review nhanh 1 người trong team/trung tâm.
function _mwPersonFilterHtml(user, teamFilter, personFilter) {
  if (!_mwCanFilterPeople(user)) return '';
  const people = _mwTeamPeople(user, teamFilter);
  if (!people.length) return '';
  const cur = personFilter || MW_PERSON_ALL;
  const opt = (val, lbl) =>
    `<option value="${esc(val)}"${cur === val ? ' selected' : ''}>${esc(lbl)}</option>`;
  const opts = [opt(MW_PERSON_ALL, t('mw.person.all'))]
    .concat(people.map(p => opt(p, p))).join('');
  return `<select class="mw-team-filter mw-person-filter" title="${t('mw.person.filter')}" onchange="mwSetPersonFilter(this.value)">${opts}</select>`;
}

function mwSetView(mode) {
  _mwView = mode === 'kanban' ? 'kanban' : 'list';
  try { localStorage.setItem('shtd_mw_view', _mwView); } catch (e) {}
  renderMyWork();
}

function mwSetTeamFilter(val) {
  _mwTeamFilter = val || MW_TEAM_ALL;
  _mwPersonFilter = null;   // đổi team → reset nhân sự (danh sách người đổi theo)
  renderMyWork();
}

function mwSetPersonFilter(val) {
  _mwPersonFilter = val || MW_PERSON_ALL;
  renderMyWork();
}

// ── Main render ──

function renderMyWork() {
  const root = document.getElementById('view-my-work');
  if (!root) return;

  const user = getCurrentUser();
  if (!user) {
    root.innerHTML = `<div class="mw-page"><div class="mw-empty">${t('mw.login-required')}</div></div>`;
    return;
  }

  const roleView     = _mwRoleView(user);
  const teamFilter   = _mwEffectiveTeamFilter(user);
  const personFilter = _mwEffectivePersonFilter(user);
  const myTasks      = _mwScopedTasks(user, teamFilter, personFilter);

  const roleLabel = { po: 'PO', ptkd: 'PTKD', qldm: 'QLDM' }[roleView] || '';
  const todayStr  = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const header = `
  <div class="mw-page-header">
    <div>
      <div class="mw-greeting">${t('mw.greeting')} ${esc(user.displayName || user.username)} 👋</div>
      <div class="mw-sub">${esc(user.team)} · ${esc(roleLabel)} view · ${todayStr}</div>
    </div>
    <div class="mw-header-tools">
      ${_mwTeamFilterHtml(user, teamFilter)}
      ${_mwPersonFilterHtml(user, teamFilter, personFilter)}
      ${_mwViewToggleHtml()}
    </div>
  </div>
  ${_mwCalCardShell(user)}`;

  // Calendar sync (chỉ user whitelist) — nạp trạng thái sau khi innerHTML đã set.
  if (_mwCalWL(user)) setTimeout(mwCalRefresh, 0);

  if (_mwView === 'kanban') {
    root.innerHTML = `<div class="mw-page">${header}${_mwBuildKanban(myTasks)}</div>`;
    return;
  }

  const myCases    = roleView === 'ptkd' ? _mwGetMyCases(user) : [];
  const urgent     = _mwGetUrgent(myTasks, myCases);
  const champTasks = _mwGetChampionTasks(myTasks);
  const devReview  = _mwGetDevReview(user);

  const section3 = roleView === 'ptkd'
    ? _mwBuildCaseSection(myCases)
    : _mwBuildInitSection(_mwGetMyInits(user));

  root.innerHTML = `
<div class="mw-page">
  ${header}
  ${_mwBuildChampionSection(champTasks)}
  ${_mwBuildDevReviewSection(devReview)}
  ${_mwBuildUrgentSection(urgent)}
  ${_mwBuildTaskSection(myTasks)}
  ${section3}
</div>`;
}

// ── Quick save functions (local-first + GAS background) ──

function _mwFindTask(taskId) {
  return (db.tasks || []).find(t => t.id === taskId);
}

function _mwInlineSave(task) {
  persist();
  _gasTaskUpsert(task, task.id); // fire-and-forget
}

function mwQuickSaveState(taskId, val) {
  const t = _mwFindTask(taskId);
  if (!t || t.state === val) return;
  t.state = val;
  _mwInlineSave(t);
  renderMyWork(); // re-render: urgent section may change, done styling applies
}

function mwQuickSaveRag(taskId, val) {
  const t = _mwFindTask(taskId);
  if (!t || t.status === val) return;
  t.status = val;   // RAG = t.status (Green/Amber/Red) → lưu vào cột RAG qua taskToRow
  _mwInlineSave(t);
  // Lightweight: only update the dots in this card
  const card = document.querySelector(`.mw-task-card[data-id="${CSS.escape(taskId)}"]`);
  if (card) {
    const wrap = card.querySelector('.mw-rag-wrap');
    if (wrap) wrap.outerHTML = _mwRagDots(taskId, val);
  }
}

function mwTogglePeriod(taskId) {
  const st = taskTogglePeriodDone(taskId);   // mutate donePeriods + lưu (helpers.js)
  if (!st) return;
  const t = _mwFindTask(taskId);
  const card = document.querySelector(`.mw-task-card[data-id="${CSS.escape(taskId)}"]`);
  if (card && t) {
    const row = card.querySelector('.mw-period-row');
    if (row) row.innerHTML = taskPeriodBadgeHtml(t, 'mwTogglePeriod');
  }
}

// Tick "xong kỳ này" từ card Kanban → mutate + lưu (helpers) + cập nhật đúng card (không re-render cả view).
function mwKbTogglePeriod(taskId) {
  const st = taskTogglePeriodDone(taskId);   // mutate donePeriods + lưu (helpers.js)
  if (!st) return;
  const t = _mwFindTask(taskId);
  const card = document.querySelector(`.mw-kb-card[data-id="${CSS.escape(taskId)}"]`);
  if (card && t) {
    const row = card.querySelector('.mw-kb-period');
    if (row) row.innerHTML = taskPeriodBadgeHtml(t, 'mwKbTogglePeriod');
  }
}

function mwToggleProgress(taskId) {
  const inp = document.getElementById('mwPi-' + taskId);
  const lbl = document.getElementById('mwPl-' + taskId);
  if (!inp || !lbl) return;
  const show = !inp.classList.contains('mw-prog-visible');
  inp.classList.toggle('mw-prog-visible', show);
  lbl.style.display = show ? 'none' : '';
  if (show) { inp.focus(); inp.select(); }
}

function mwQuickSaveProgress(taskId, rawVal) {
  const t = _mwFindTask(taskId);
  if (!t) return;
  const val = Math.min(Math.max(parseInt(rawVal) || 0, 0), 100);
  if (t.progress === val) {
    // just hide input
    const inp = document.getElementById('mwPi-' + taskId);
    const lbl = document.getElementById('mwPl-' + taskId);
    if (inp) inp.classList.remove('mw-prog-visible');
    if (lbl) lbl.style.display = '';
    return;
  }
  t.progress = val;
  _mwInlineSave(t);
  // Update DOM in-place
  const lbl  = document.getElementById('mwPl-' + taskId);
  const inp  = document.getElementById('mwPi-' + taskId);
  const card = document.querySelector(`.mw-task-card[data-id="${CSS.escape(taskId)}"]`);
  if (lbl) { lbl.textContent = val + '%'; lbl.style.display = ''; }
  if (inp) { inp.classList.remove('mw-prog-visible'); inp.value = val; }
  if (card) {
    const fill = card.querySelector('.mw-prog-bar-fill');
    if (fill) fill.style.width = val + '%';
  }
}

function mwQuickSaveResult(taskId, val) {
  const t = _mwFindTask(taskId);
  if (!t || t.result === val) return;
  t.result = val;
  _mwInlineSave(t);
  // No DOM update needed — textarea already shows updated value
}

function mwRefreshChampionStatus(taskId, val) {
  const item = document.querySelector(`#mwChampionSection .mw-champion-item[data-id="${CSS.escape(taskId)}"]`);
  if (!item) return;
  const hasFilled = !!(val && val.trim());
  item.classList.toggle('is-filled', hasFilled);
  const badge = item.querySelector('.mw-champion-status');
  if (badge) {
    badge.className = `mw-champion-status ${hasFilled ? 'status-ok' : 'status-todo'}`;
    badge.textContent = hasFilled ? t('mw.champion.filled') : t('mw.champion.unfilled');
  }
  // Update section-level pending count
  const section = document.getElementById('mwChampionSection');
  if (!section) return;
  const items    = section.querySelectorAll('.mw-champion-item');
  const unfilled = [...items].filter(el => !el.classList.contains('is-filled')).length;
  const pending  = section.querySelector('.mw-champion-pending');
  const done     = section.querySelector('.mw-champion-done');
  if (unfilled === 0) {
    if (pending) { pending.className = 'mw-champion-done'; pending.textContent = t('mw.champion.all-filled'); }
    if (done)   done.textContent = t('mw.champion.all-filled');
  } else {
    if (pending) pending.textContent = `${unfilled} ${t('mw.champion.count-unfilled')}`;
    if (done)   { done.className = 'mw-champion-pending'; done.textContent = `${unfilled} ${t('mw.champion.count-unfilled')}`; }
  }
}

// ── Initiative popup ──

function mwOpenInitPopup() {
  const overlay = document.getElementById('mwInitPopup');
  if (!overlay) return;

  const allRoots = (db.initiatives || [])
    .filter(i => !i.parentId && i.type === 'initiative' && i.id !== 'BAU' && i.status !== undefined)
    .sort((a, b) => (a.id || '').localeCompare(b.id || ''));

  const items = allRoots.map(ini => {
    const msCnt   = (db.initiatives || []).filter(x => x.parentId === ini.id && x.type === 'milestone').length;
    const taskCnt = (db.tasks || []).filter(x => x.initiative === ini.id).length;
    return `
<div class="mw-popup-ini-item" onclick="navigateTo('initiative-tracker');mwCloseInitPopup()">
  <div class="mw-popup-ini-header">
    <span class="mw-init-id">${esc(ini.id)}</span>
    <span class="mw-init-name">${esc(ini.name)}</span>
  </div>
  <div class="mw-init-meta" style="margin-top:4px;">
    <span class="mw-init-status ${_mwInitStatusClass(ini.status)}">${esc(ini.status || 'Active')}</span>
    ${ini.accountable ? `<span style="font-size:11px;color:var(--text-3);">${esc(ini.accountable)}</span>` : ''}
    <span class="mw-init-stats">${msCnt} MS · ${taskCnt} task</span>
  </div>
</div>`;
  });

  const list = document.getElementById('mwInitPopupList');
  if (list) {
    list.innerHTML = allRoots.length === 0
      ? `<div class="mw-empty" style="margin:16px;">${t('mw.init.popup-empty')}</div>`
      : items.join('');
  }
  const cnt = document.getElementById('mwInitPopupCount');
  if (cnt) cnt.textContent = allRoots.length;
  overlay.style.display = 'flex';
}

function mwCloseInitPopup() {
  const overlay = document.getElementById('mwInitPopup');
  if (overlay) overlay.style.display = 'none';
}

/* ══════════════ Calendar Sync (Pha 1 — giới hạn TuanTT4) ══════════════ */

let _mwCalState = null;

// Whitelist client (backend cũng chặn — đây chỉ để ẩn UI cho user khác).
function _mwCalWL(user) {
  return !!user && String(user.username || '').toLowerCase() === 'tuantt4';
}

function _mwCalCardShell(user) {
  if (!_mwCalWL(user)) return '';
  return `<div class="mw-cal-card" id="mwCalCard"><div class="mw-cal-loading">${t('mw.cal.loading')}</div></div>`;
}

function _mwCalCardHtml(st) {
  if (!st || !st.allowed) return '';
  const titleHtml = `<span class="mw-cal-title">🔔 ${t('mw.cal.title')}</span>`;
  if (st.on) {
    const when = st.syncedAt ? new Date(st.syncedAt).toLocaleString('vi-VN') : '';
    return `
      <div class="mw-cal-head">${titleHtml}<span class="mw-cal-badge on">● ${t('mw.cal.on')}</span></div>
      <div class="mw-cal-body">
        <div class="mw-cal-info">${t('mw.cal.synced-to')}: <b>${esc(st.email)}</b>${when ? ` · ${t('mw.cal.last')}: ${esc(when)}` : ''}</div>
        <div class="mw-cal-actions">
          <button class="btn btn-ghost btn-sm" onclick="mwCalSyncNow()"><i class="fa-solid fa-rotate"></i> ${t('mw.cal.resync')}</button>
          <button class="btn btn-ghost btn-sm mw-cal-danger" onclick="mwCalDisable()"><i class="fa-solid fa-link-slash"></i> ${t('mw.cal.disconnect')}</button>
        </div>
      </div>`;
  }
  const hasEmail = !!(st.email && st.email.trim());
  return `
    <div class="mw-cal-head">${titleHtml}<span class="mw-cal-badge off">○ ${t('mw.cal.off')}</span></div>
    <div class="mw-cal-body">
      <div class="mw-cal-info">${t('mw.cal.hint')}</div>
      ${hasEmail ? `
      <div class="mw-cal-connect">
        <span class="mw-cal-emailline">${t('mw.cal.will-use')}: <b>${esc(st.email)}</b></span>
        <button class="btn btn-primary btn-sm" onclick="mwCalEnable()"><i class="fa-brands fa-google"></i> ${t('mw.cal.connect')}</button>
      </div>` : `
      <div class="mw-cal-info mw-cal-err">${t('mw.cal.no-email')}</div>`}
    </div>`;
}

function _mwCalSetLoading(msg) {
  const el = document.getElementById('mwCalCard');
  if (el) el.innerHTML = `<div class="mw-cal-loading">${esc(msg)}</div>`;
}
function _mwCalRender(st) {
  _mwCalState = st;
  const el = document.getElementById('mwCalCard');
  if (el) el.innerHTML = _mwCalCardHtml(st);
}

async function mwCalRefresh() {
  const el = document.getElementById('mwCalCard');
  if (!el) return;
  try { _mwCalRender(await apiCalStatus()); }
  catch (e) { el.innerHTML = `<div class="mw-cal-err">${t('mw.cal.err')}: ${esc(e.message)}</div>`; }
}

async function mwCalEnable() {
  // Không bắt nhập email — server dùng Email đăng ký trong User_Master.
  _mwCalSetLoading(t('mw.cal.connecting'));
  try { _mwCalRender(await apiCalEnable()); toast(t('mw.cal.connected'), 'success'); }
  catch (e) { toast(t('mw.cal.err') + ': ' + e.message, 'error'); mwCalRefresh(); }
}

async function mwCalDisable() {
  _mwCalSetLoading(t('mw.cal.disconnecting'));
  try { _mwCalRender(await apiCalDisable()); toast(t('mw.cal.disconnected'), 'success'); }
  catch (e) { toast(t('mw.cal.err') + ': ' + e.message, 'error'); mwCalRefresh(); }
}

async function mwCalSyncNow() {
  const email = _mwCalState ? _mwCalState.email : '';
  if (!email) { mwCalRefresh(); return; }
  _mwCalSetLoading(t('mw.cal.syncing'));
  try { _mwCalRender(await apiCalEnable(email)); toast(t('mw.cal.synced'), 'success'); }
  catch (e) { toast(t('mw.cal.err') + ': ' + e.message, 'error'); mwCalRefresh(); }
}
