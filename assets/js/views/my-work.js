'use strict';

/* ── Role-view detection (auto-detected from user.team, no new DB field) ──
   PO   : BL, CV1, CV2, Số → task list + deadline + Initiative phụ trách
   PTKD : PTKD MB, PTKD MN → task list + Case Pipeline của team
   QLDM : QLDM              → same as PO view
*/
const _MW_PO_TEAMS   = new Set(['BL', 'CV1', 'CV2', 'Số']);
const _MW_PTKD_TEAMS = new Set(['PTKD MB', 'PTKD MN']);
const _MW_QLDM_TEAMS = new Set(['QLDM']);

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

function _mwGetMyTasks(user) {
  if (!user) return [];
  const uname = user.username;
  const uteam = user.team;

  return (db.tasks || [])
    .filter(t =>
      _mwCmpUser(t.picAcc, uname) ||
      _mwCmpUser(t.picRes, uname) ||
      t.team === uteam
    )
    .sort((a, b) => {
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

  return `
<div class="mw-task-card${isHl ? ' is-highlight' : ''}${isDone ? ' is-done' : ''}" data-id="${id}">
  <div class="mw-task-card-top">
    <span class="mw-task-id">${esc(task.id)}</span>
    <span class="mw-task-name" title="${esc(task.name)}">${esc(task.name)}</span>
    ${isHl ? '<i class="fa-solid fa-star mw-task-star" title="Highlight báo cáo"></i>' : ''}
    ${_mwDeadlineBadge(task.endDate)}
  </div>
  <div class="mw-controls">
    <select class="mw-state-sel" onchange="mwQuickSaveState('${id}',this.value)">${opts}</select>
    ${_mwRagDots(task.id, task.status)}
  </div>
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
  return `
<div class="mw-urgent-item ${cls}" onclick="openTaskViewPopup('${esc(t.id)}')">
  <span class="mw-urgent-type type-task">Task</span>
  <span class="mw-urgent-id">${esc(t.id)}</span>
  <span class="mw-urgent-name">${esc(t.name)}</span>
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
  const MAX_INIT = 4;
  const shown    = inits.slice(0, MAX_INIT);

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

// ── Main render ──

function renderMyWork() {
  const root = document.getElementById('view-my-work');
  if (!root) return;

  const user = getCurrentUser();
  if (!user) {
    root.innerHTML = `<div class="mw-page"><div class="mw-empty">${t('mw.login-required')}</div></div>`;
    return;
  }

  const roleView    = _mwRoleView(user);
  const myTasks     = _mwGetMyTasks(user);
  const myCases     = roleView === 'ptkd' ? _mwGetMyCases(user) : [];
  const urgent      = _mwGetUrgent(myTasks, myCases);
  const champTasks  = _mwGetChampionTasks(myTasks);
  const devReview   = _mwGetDevReview(user);

  const section3 = roleView === 'ptkd'
    ? _mwBuildCaseSection(myCases)
    : _mwBuildInitSection(_mwGetMyInits(user));

  const roleLabel = { po: 'PO', ptkd: 'PTKD', qldm: 'QLDM' }[roleView] || '';
  const todayStr  = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });

  root.innerHTML = `
<div class="mw-page">
  <div class="mw-page-header">
    <div>
      <div class="mw-greeting">${t('mw.greeting')} ${esc(user.displayName || user.username)} 👋</div>
      <div class="mw-sub">${esc(user.team)} · ${esc(roleLabel)} view · ${todayStr}</div>
    </div>
  </div>
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
