'use strict';

/* ── filter state ── */
let _initFilterCat    = '';
let _initFilterStatus = '';
let _initScope        = null;  // null = uninit | 'mine' | 'all'
let _initShowDone     = false; // collapsible "Đã hoàn thành" section (default collapsed)

function _getInitScope() {
  if (_initScope === null) {
    const u = getCurrentUser();
    _initScope = (u && u.role === 'Admin') ? 'all' : 'mine';
  }
  return _initScope;
}

function setInitScope(scope) {
  _initScope = scope;
  renderInitiativeTracker();
}

/* ── main render ── */
function renderInitiativeTracker() {
  const root = document.getElementById('initiativeTrackerRoot');
  if (!root) return;

  const allRoots = _initRealRoots();

  // Scope init + fallback: nếu 'mine' không có initiative nào → auto-switch 'all'
  const scope = _getInitScope();
  if (scope === 'mine') {
    const myRoots = allRoots.filter(i => isCurrentUser(i.accountable));
    if (myRoots.length === 0) _initScope = 'all';
  }

  const currentScope = _initScope; // read after possible fallback

  root.innerHTML = `
    ${_initStatBar()}
    <div class="toolbar" style="margin-bottom:16px;">
      <div class="toolbar-left">
        <div style="font-size:17px;font-weight:800;">${t('page.initiative-tracker')}</div>
        <div style="font-size:12px;color:var(--text-3);">
          ${allRoots.length} initiative · ${(db.initiatives||[]).filter(i=>i.type==='milestone').length} milestone
        </div>
      </div>
      <div class="toolbar-right">
        <div class="scope-toggle">
          <button class="scope-btn ${currentScope==='mine'?'active':''}" onclick="setInitScope('mine')">
            <i class="fa-solid fa-user" style="margin-right:3px;"></i>${t('task.scope.mine')}
          </button>
          <button class="scope-btn ${currentScope!=='mine'?'active':''}" onclick="setInitScope('all')">
            ${t('task.scope.all')}
          </button>
        </div>
        <select class="form-control" style="font-size:12px;padding:6px 10px;width:auto;" onchange="_initSetFilter('cat',this.value)">
          <option value="">${t('it.filter.all-cat')}</option>
          ${_initCategoryOptions()}
        </select>
        <select class="form-control" style="font-size:12px;padding:6px 10px;width:auto;" onchange="_initSetFilter('status',this.value)">
          <option value="">${t('it.filter.all-status')}</option>
          <option value="Active">Active</option>
          <option value="Done">Done</option>
          <option value="Paused">Paused</option>
          <option value="Blocked">Blocked</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="readInitiatives().then(renderInitiativeTracker)" title="Sync từ GG Sheet">
          <i class="fa-solid fa-rotate"></i> Sync GG Sheet
        </button>
        <button class="btn btn-primary btn-sm" onclick="_initOpenModal(null)">
          <i class="fa-solid fa-plus"></i> ${t('it.btn.add-init')}
        </button>
      </div>
    </div>
    <div id="initCardList">${_initBuildCardList()}</div>
    ${_initModalTemplate()}
  `;

  // restore filter selects
  const selCat = root.querySelectorAll('select')[0];
  const selSts = root.querySelectorAll('select')[1];
  if (selCat) selCat.value = _initFilterCat;
  if (selSts) selSts.value = _initFilterStatus;
}

/* ── helper: chỉ lấy initiative gốc; hỗ trợ cả data cũ không có type field ── */
function _initRealRoots() {
  const all = db.initiatives || [];
  if (all.some(i => i.type)) {
    return all.filter(i => i.type === 'initiative');
  }
  return all.filter(i => !i.parentId && i.id !== 'BAU' && i.status !== undefined);
}

/* ── stat base: roots trong phạm vi scope + category (KHÔNG áp filter status,
   vì chính các ô số là bảng phân rã theo status) — dùng chung cho stat bar + popup ── */
function _initStatBase() {
  const scope = _getInitScope();
  return _initRealRoots().filter(i => {
    if (_initFilterCat && i.category !== _initFilterCat)   return false;
    if (scope === 'mine' && !isCurrentUser(i.accountable)) return false;
    return true;
  });
}

/* ── đếm overdue trong 1 tập roots ── */
function _initCountOverdue(roots) {
  const today = new Date();
  return roots.filter(i => {
    if (!i.deadline || i.status === 'Done') return false;
    const d = _initParseDate(i.deadline);
    return d && d < today && i.pct < 100;
  });
}

/* ── stat bar (đồng nhất UI với Case Pipeline: .cp-stat-card, clickable → popup) ── */
function _initStatBar() {
  const base    = _initStatBase();
  const total   = base.length;
  const active  = base.filter(i => i.status === 'Active').length;
  const done    = base.filter(i => i.status === 'Done').length;
  const blocked = base.filter(i => i.status === 'Blocked').length;
  const overdue = _initCountOverdue(base).length;

  const card = (type, icon, iconBg, iconColor, num, label, numColor) => `
    <div class="cp-stat-card" onclick="openInitSummaryPopup('${type}')" style="cursor:pointer;" title="Xem danh sách">
      <div class="cp-stat-icon" style="background:${iconBg};color:${iconColor};"><i class="fa-solid ${icon}"></i></div>
      <div class="cp-stat-body">
        <div class="cp-stat-num"${numColor ? ` style="color:${numColor};"` : ''}>${num}</div>
        <div class="cp-stat-label">${label}</div>
      </div>
    </div>`;

  return `<div class="init-summary-grid">
    ${card('total',   'fa-diagram-project',      'var(--primary-xlight)', 'var(--primary)', total,   t('it.stat.total'),  '')}
    ${card('active',  'fa-play-circle',          'var(--primary-xlight)', 'var(--primary)', active,  t('it.stat.active'), 'var(--primary)')}
    ${card('done',    'fa-circle-check',         'var(--success-bg)',     'var(--success)', done,    t('it.stat.done'),   'var(--success)')}
    ${card('overdue', 'fa-triangle-exclamation', 'var(--danger-bg)',      'var(--danger)',  overdue, t('mw.dl.overdue'),  'var(--danger)')}
    ${card('blocked', 'fa-ban',                  'var(--danger-bg)',      'var(--danger)',  blocked, t('it.stat.blocked'),'var(--danger)')}
  </div>`;
}

/* ── card list ── */
function _initBuildCardList() {
  const base = _initStatBase();

  // Khi user chọn filter status cụ thể → tôn trọng lựa chọn: hiện đúng nhóm đó,
  // không tách section "Đã hoàn thành". Ngược lại: tách Done ra section thu gọn ở cuối.
  let mainRoots, doneRoots;
  if (_initFilterStatus) {
    mainRoots = base.filter(i => i.status === _initFilterStatus);
    doneRoots = [];
  } else {
    mainRoots = base.filter(i => i.status !== 'Done');
    doneRoots = base.filter(i => i.status === 'Done');
  }

  if (!mainRoots.length && !doneRoots.length) {
    return `<div class="init-empty">
      <div class="init-empty-icon"><i class="fa-solid fa-diagram-project"></i></div>
      <div class="init-empty-title">${t('it.empty.title')}</div>
      <div style="font-size:13px;margin-top:6px;">${t('it.empty.sub')}</div>
    </div>`;
  }

  let html = '';
  if (mainRoots.length) {
    html += mainRoots.map(ini => _initBuildCard(ini)).join('');
  } else if (doneRoots.length) {
    // Không còn initiative đang hoạt động, nhưng có mục đã hoàn thành phía dưới
    html += `<div style="text-align:center;padding:28px 16px;color:var(--text-3);font-size:13px;">
      <i class="fa-solid fa-circle-check" style="color:var(--success);margin-right:6px;"></i>${t('it.done.all-done')}</div>`;
  }
  if (doneRoots.length) {
    html += _initBuildDoneSection(doneRoots);
  }
  return html;
}

/* ── collapsible "Đã hoàn thành" section (mặc định thu gọn; card render lazy) ── */
function _initBuildDoneSection(doneRoots) {
  const open = _initShowDone;
  return `<div class="init-done-section">
    <button class="init-done-header ${open ? 'open' : ''}" onclick="_initToggleDone()">
      <i class="fa-solid fa-circle-check"></i>
      <span>${t('it.done.title')}</span>
      <span class="init-done-count">${doneRoots.length}</span>
      <i class="fa-solid fa-chevron-down init-done-caret" style="margin-left:auto;font-size:11px;"></i>
    </button>
    <div class="init-done-body ${open ? 'open' : ''}" id="initDoneBody">
      ${open ? doneRoots.map(ini => _initBuildCard(ini)).join('') : ''}
    </div>
  </div>`;
}

function _initToggleDone() {
  _initShowDone = !_initShowDone;
  const list = document.getElementById('initCardList');
  if (list) list.innerHTML = _initBuildCardList();
}

/* ── single initiative card ── */
function _initBuildCard(ini) {
  const milestones = (db.initiatives || []).filter(i =>
    (i.type ? i.type === 'milestone' : (!!i.parentId && i.status !== undefined)) && i.parentId === ini.id
  );
  const linkedTasks = (db.tasks || []).filter(t => t.initiative === ini.id);
  const statusKey = (ini.status || 'active').toLowerCase();
  const fillClass = statusKey === 'done' ? 'done' : statusKey === 'blocked' ? 'blocked' : statusKey === 'paused' ? 'paused' : '';

  return `
  <div class="init-card status-${statusKey}" id="init-card-${ini.id}">
    <div class="init-card-header" onclick="openInitViewPopup('${_esc(ini.id)}')" style="cursor:pointer;" title="Xem chi tiết">
      <span class="init-card-id">${_esc(ini.id)}</span>
      <span class="init-card-name" title="${_esc(ini.name)}">${_esc(ini.name)}</span>
      <div class="init-card-meta">
        <div class="init-prog-wrap">
          <div class="init-prog-bar"><div class="init-prog-fill ${fillClass}" style="width:${ini.pct||0}%;"></div></div>
          <span class="init-prog-pct">${ini.pct||0}%</span>
        </div>
        <span class="init-status-chip ${statusKey}">${_initStatusIcon(ini.status)} ${_esc(ini.status||'Active')}</span>
        ${ini.accountable ? `<span style="font-size:12px;color:var(--text-3);"><i class="fa-solid fa-user" style="margin-right:3px;"></i>${_esc(ini.accountable)}</span>` : ''}
        ${ini.deadline ? `<span style="font-size:12px;color:var(--text-3);"><i class="fa-solid fa-calendar" style="margin-right:3px;"></i>${_esc(ini.deadline)}</span>` : ''}
        ${ini.category ? `<span style="font-size:11px;background:var(--info-bg);color:var(--info);padding:2px 7px;border-radius:99px;font-weight:600;">${_esc(ini.category)}</span>` : ''}
      </div>
      <div class="init-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="_initOpenModal('${_esc(ini.id)}')" title="Chỉnh sửa"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="_initDelete('${_esc(ini.id)}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
    ${ini.kpiTarget ? `<div style="padding:0 18px 10px;font-size:12px;color:var(--text-3);"><i class="fa-solid fa-bullseye" style="margin-right:5px;color:var(--primary);"></i>${_esc(ini.kpiTarget)}</div>` : ''}
    <div class="init-toggle-bar">
      <button class="init-toggle-btn" id="btn-ms-${ini.id}" onclick="_initToggleMilestones('${ini.id}')">
        <i class="fa-solid fa-list-ol"></i> Milestones
        <span class="init-toggle-count">${milestones.length}</span>
        <i class="fa-solid fa-chevron-down" style="margin-left:auto;font-size:10px;"></i>
      </button>
      <button class="init-toggle-btn" id="btn-tk-${ini.id}" onclick="_initToggleTasks('${ini.id}')">
        <i class="fa-solid fa-list-check"></i> ${t('it.tasks-linked')}
        <span class="init-toggle-count">${linkedTasks.length}</span>
        <i class="fa-solid fa-chevron-down" style="margin-left:auto;font-size:10px;"></i>
      </button>
    </div>
    <div class="init-milestone-list" id="ms-list-${ini.id}">
      ${_initBuildMilestoneList(ini.id, milestones)}
    </div>
    <div class="init-task-list" id="tk-list-${ini.id}">
      ${_initBuildTaskList(ini.id, linkedTasks)}
    </div>
  </div>`;
}

/* ── milestone list (inside card) ── */
function _initBuildMilestoneList(parentId, milestones) {
  if (!milestones.length) {
    return `<div style="font-size:12px;color:var(--text-3);padding:8px 0;">${t('it.ms.empty')} <button class="btn btn-ghost btn-sm" onclick="_initOpenMilestone('${_esc(parentId)}')"><i class="fa-solid fa-plus"></i> ${t('it.btn.add-ms')}</button></div>`;
  }
  const rows = milestones.map(ms => {
    const dotClass   = _initMsDotClass(ms.status);
    const msTasks    = _initGetMsTasks(ms, parentId);
    const warnCount  = msTasks.filter(t => t.initiative !== parentId).length;
    const looseCount = msTasks.filter(t => t.milestone !== ms.id).length;
    const btnExtra   = warnCount ? ' warn' : looseCount ? ' loose' : '';
    return `
    <div class="init-ms-block">
      <div class="init-milestone-row">
        <div class="init-step-dot ${dotClass}"></div>
        <span class="init-ms-id">${_esc(_msShortLabel(ms.id))}</span>
        <span class="init-ms-name">${_esc(ms.name.replace(/^↳\s*/,''))}</span>
        <div class="init-prog-wrap">
          <div class="init-prog-bar" style="width:60px;"><div class="init-prog-fill ${dotClass === 'done' ? 'done' : dotClass === 'blocked' ? 'blocked' : ''}" style="width:${ms.pct||0}%;"></div></div>
          <span class="init-prog-pct">${ms.pct||0}%</span>
        </div>
        ${ms.deadline ? `<span class="init-ms-deadline"><i class="fa-solid fa-calendar" style="margin-right:3px;"></i>${_esc(ms.deadline)}</span>` : ''}
        <span class="init-status-chip ${dotClass}" style="font-size:10px;padding:1px 6px;">${_esc(ms.status||'Chưa bắt đầu')}</span>
        <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:11px;" onclick="_initOpenModal('${_esc(ms.id)}')" title="Sửa milestone"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:11px;color:var(--primary);" onclick="openTaskModalForMilestone('${_esc(ms.id)}','${_esc(parentId)}')" title="Thêm task vào milestone này"><i class="fa-solid fa-plus"></i> Task</button>
        <button class="init-ms-task-btn${btnExtra}" id="ms-task-btn-${_esc(ms.id)}" onclick="_initToggleMsTaskPanel('${_esc(ms.id)}')">
          <i class="fa-solid fa-list-check"></i> ${msTasks.length} task
          <i class="fa-solid fa-chevron-down" style="font-size:9px;"></i>
        </button>
      </div>
      <div class="init-ms-task-panel" id="ms-tasks-${_esc(ms.id)}">
        ${_initBuildMsTaskList(ms, parentId)}
      </div>
    </div>`;
  }).join('');

  return rows + `<div style="margin-top:8px;padding-left:4px;display:flex;gap:8px;">
    <button class="btn btn-ghost btn-sm" onclick="_initOpenMilestone('${_esc(parentId)}')"><i class="fa-solid fa-plus"></i> ${t('it.btn.add-ms')}</button>
  </div>`;
}

/* ── tasks belonging to a milestone (exact ID + short-label fallback) ── */
function _initGetMsTasks(ms, parentInitId) {
  return (db.tasks || []).filter(t =>
    t.milestone === ms.id ||
    (t.milestone === _msShortLabel(ms.id) && t.initiative === parentInitId)
  );
}

/* ── per-milestone task table with alignment badges ── */
function _initBuildMsTaskList(ms, parentInitId) {
  const tasks = _initGetMsTasks(ms, parentInitId);
  if (!tasks.length) {
    return `<div style="font-size:12px;color:var(--text-3);padding:10px 4px;display:flex;align-items:center;gap:10px;">
      <span>${t('it.ms.no-tasks')}</span>
      <button class="btn btn-ghost btn-sm" style="color:var(--primary);" onclick="openTaskModalForMilestone('${_esc(ms.id)}','${_esc(parentInitId)}')" title="Thêm task vào milestone này"><i class="fa-solid fa-plus"></i> ${t('it.btn.add-task')}</button>
    </div>`;
  }
  const rows = tasks.map(tk => {
    const isExact    = tk.milestone === ms.id;
    const isCrossInit = tk.initiative !== parentInitId;
    let alignBadge;
    if (isCrossInit) {
      alignBadge = `<span class="init-align-badge warn" title="Task thuộc initiative ${_esc(tk.initiative||'?')} — khác initiative này">${t('it.badge.warn')}</span>`;
    } else if (!isExact) {
      alignBadge = `<span class="init-align-badge loose" title="Đang link qua nhãn tắt '${_esc(tk.milestone)}' — chưa dùng ID đầy đủ">
        ${t('it.badge.loose')}
        <button class="init-fix-link-btn" onclick="event.stopPropagation();_initFixLooseLink('${_esc(tk.id)}','${_esc(ms.id)}','${_esc(ms.id)}')" title="Cập nhật sang ${_esc(ms.id)}">
          ${t('it.btn.fix-link')}
        </button>
      </span>`;
    } else {
      alignBadge = `<span class="init-align-badge ok">${t('it.badge.ok')}</span>`;
    }
    return `<tr onclick="openTaskViewPopup('${_esc(tk.id)}')" title="Xem task ${_esc(tk.id)}">
      <td><span class="init-task-id">${_esc(tk.id)}</span></td>
      <td><span class="init-task-name" title="${_esc(tk.name)}">${_esc(tk.name)}</span></td>
      <td>${stateChip(tk.state)}</td>
      <td style="color:var(--text-3);">${_esc(tk.picRes||'–')}</td>
      <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${tk.progress}%;"></div></div><span class="prog-pct">${tk.progress}%</span></div></td>
      <td ${isOverdue(tk.endDate,tk.progress)?'style="color:var(--danger);font-weight:700;"':''}>${fmtDate(tk.endDate)||'–'}</td>
      <td onclick="event.stopPropagation()">${alignBadge}</td>
    </tr>`;
  }).join('');
  return `<table class="init-task-table">
    <thead><tr>
      <th>ID</th><th>Task</th><th>${t('it.col.state')}</th>
      <th>PIC</th><th>${t('it.col.progress')}</th><th>Deadline</th><th>${t('it.col.assessment')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* ── toggle milestone task sub-panel ── */
function _initToggleMsTaskPanel(msId) {
  const panel = document.getElementById('ms-tasks-' + msId);
  const btn   = document.getElementById('ms-task-btn-' + msId);
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('open', isOpen);
}

/* ── fix loose link: update task.milestone from short label → full ID ── */
async function _initFixLooseLink(taskId, fullMsId, msId) {
  const task = (db.tasks || []).find(t => t.id === taskId);
  if (!task) return;
  task.milestone = fullMsId;
  persist();
  toast(`Task ${_esc(taskId)}: milestone → ${_esc(fullMsId)}`, 'success');

  // Re-render the milestone list section for the parent initiative
  const ms = (db.initiatives || []).find(i => i.id === msId);
  if (ms) {
    const milestones = (db.initiatives || []).filter(i =>
      (i.type ? i.type === 'milestone' : (!!i.parentId && i.status !== undefined)) && i.parentId === ms.parentId
    );
    const msListEl = document.getElementById('ms-list-' + ms.parentId);
    if (msListEl) {
      msListEl.innerHTML = _initBuildMilestoneList(ms.parentId, milestones);
      // Re-open the panel that was just updated
      const panel = document.getElementById('ms-tasks-' + msId);
      if (panel) panel.classList.add('open');
      const btn = document.getElementById('ms-task-btn-' + msId);
      if (btn) btn.classList.add('open');
    }
  }

  // Atomic write: only update the 1 task row that changed (not all tasks)
  _gasTaskUpsert(task);
}

/* ── linked task list (inside card) ── */
function _initBuildTaskList(initiativeId, tasks) {
  if (!tasks.length) {
    return `<div style="font-size:12px;color:var(--text-3);padding:14px 18px;">${t('it.no-linked-tasks')}</div>`;
  }
  const rows = tasks.map(t => `
    <tr onclick="openTaskViewPopup('${t.id}')" title="Xem task ${t.id}">
      <td><span class="init-task-id">${_esc(t.id)}</span></td>
      <td><span class="init-task-name" title="${_esc(t.name)}">${_esc(t.name)}</span></td>
      <td>${t.milestone ? `<span style="font-size:11px;background:var(--primary-xlight);color:var(--primary);padding:2px 6px;border-radius:3px;font-weight:700;">${_esc(t.milestone)}</span>` : '<span style="color:var(--text-4);">–</span>'}</td>
      <td>${stateChip(t.state)}</td>
      <td style="color:var(--text-3);">${_esc(t.picRes||'–')}</td>
      <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress}%;"></div></div><span class="prog-pct">${t.progress}%</span></div></td>
      <td ${isOverdue(t.endDate,t.progress)?'style="color:var(--danger);font-weight:700;"':''}>${fmtDate(t.endDate)||'–'}</td>
    </tr>`).join('');

  return `<table class="init-task-table">
    <thead><tr>
      <th>ID</th><th>Task</th><th>Milestone</th><th>${t('it.col.state')}</th>
      <th>PIC</th><th>${t('it.col.progress')}</th><th>Deadline</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

/* ── toggle handlers (global — dùng inline onclick) ── */
function _initToggleMilestones(id) {
  const panel = document.getElementById('ms-list-' + id);
  const btn   = document.getElementById('btn-ms-' + id);
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('open', isOpen);
}

function _initToggleTasks(id) {
  const panel = document.getElementById('tk-list-' + id);
  const btn   = document.getElementById('btn-tk-' + id);
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('open', isOpen);
}

/* ── filter ── */
function _initSetFilter(type, val) {
  if (type === 'cat')    _initFilterCat    = val;
  if (type === 'status') _initFilterStatus = val;
  const list = document.getElementById('initCardList');
  if (list) list.innerHTML = _initBuildCardList();
}

/* ── categories helper ── */
function _initCategoryOptions() {
  const cats = [...new Set((db.initiatives||[]).filter(i=>i.type?i.type==='initiative':!i.parentId).map(i=>i.category).filter(Boolean))];
  return cats.map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`).join('');
}

/* ── CRUD Modal ── */
function _initModalTemplate() {
  return `
  <div class="overlay" id="initModalOverlay" style="display:none;">
    <div class="modal" style="max-width:620px;">
      <div class="modal-header">
        <div class="modal-title" id="initModalTitle">${t('it.modal.add-title')}</div>
        <button class="icon-btn" onclick="_initCloseModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="initOrigId">
        <div class="init-modal-grid">
          <div class="form-group">
            <label class="form-label">ID <span style="color:var(--danger)">*</span></label>
            <input class="form-control" id="initFId" placeholder="VD: SCF-001" maxlength="30">
            <div class="form-error" id="initErrId"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Parent Initiative</label>
            <select class="form-control" id="initFParent">
              <option value="">${t('it.modal.root-opt')}</option>
            </select>
          </div>
          <div class="form-group full">
            <label class="form-label">${t('it.modal.name-label')} <span style="color:var(--danger)">*</span></label>
            <input class="form-control" id="initFName" placeholder="Tên đầy đủ…">
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-control" id="initFCat">
              <option value="">– Chọn –</option>
              <option>Số hóa</option>
              <option>Sản phẩm</option>
              <option>Đào tạo</option>
              <option>Kỹ thuật</option>
              <option>Vận hành</option>
              <option>Chiến lược</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Accountable</label>
            <select class="form-control" id="initFAcc">
              <option value="">– Chọn –</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" class="form-control" id="initFStart">
          </div>
          <div class="form-group">
            <label class="form-label">Deadline / Target</label>
            <input type="date" class="form-control" id="initFDeadline">
          </div>
          <div class="form-group">
            <label class="form-label">${t('it.modal.pct-label')}</label>
            <input class="form-control" id="initFPct" type="number" min="0" max="100" placeholder="0–100">
          </div>
          <div class="form-group">
            <label class="form-label">${t('it.modal.state-label')}</label>
            <select class="form-control" id="initFStatus">
              <option value="Active">Active</option>
              <option value="Done">Done</option>
              <option value="Paused">Paused</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('it.modal.ms-track')}</label>
            <input class="form-control" id="initFMsTrack" placeholder="Tên milestone hiện tại…">
          </div>
          <div class="form-group">
            <label class="form-label">Deadline Milestone</label>
            <input type="date" class="form-control" id="initFMsDl">
          </div>
          <div class="form-group full">
            <label class="form-label">${t('it.modal.kpi-label')}</label>
            <textarea class="form-control" id="initFKpi" rows="2" placeholder="Mô tả KPI / kết quả mong đợi…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">${t('it.modal.notes-label')}</label>
            <textarea class="form-control" id="initFNotes" rows="2" placeholder="Ghi chú…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">${t('it.modal.doc-label')}</label>
            <input class="form-control" id="initFDoc" placeholder="https://…">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="_initCloseModal()">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="_initSave()"><i class="fa-solid fa-floppy-disk"></i> ${t('common.save')}</button>
      </div>
    </div>
  </div>`;
}

function _initOpenModal(id) {
  const overlay = document.getElementById('initModalOverlay');
  if (!overlay) { renderInitiativeTracker(); return; }

  // Populate parent dropdown (root initiatives only)
  const selParent = document.getElementById('initFParent');
  selParent.innerHTML = `<option value="">${t('it.modal.root-opt')}</option>`
    + (db.initiatives||[]).filter(i => (i.type ? i.type === 'initiative' : !i.parentId) && (id === null || i.id !== id))
        .map(i => `<option value="${_esc(i.id)}">${_esc(i.id)} – ${_esc(i.name)}</option>`).join('');

  if (id === null) {
    // Add mode
    document.getElementById('initModalTitle').textContent = t('it.modal.add-title');
    document.getElementById('initOrigId').value = '';
    ['initFId','initFName','initFStart','initFDeadline','initFMsTrack','initFMsDl','initFKpi','initFNotes','initFDoc'].forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
    const _initTd = new Date();
    const _initStartEl = document.getElementById('initFStart');
    if (_initStartEl) _initStartEl.value = `${_initTd.getFullYear()}-${String(_initTd.getMonth()+1).padStart(2,'0')}-${String(_initTd.getDate()).padStart(2,'0')}`;
    document.getElementById('initFPct').value = '0';
    document.getElementById('initFStatus').value = 'Active';
    document.getElementById('initFCat').value = '';
    selParent.value = '';
    const _initCu = getCurrentUser();
    _populateUserSelect('initFAcc', null, (_initCu && _initCu.username) || '');
  } else {
    // Edit mode
    const ini = (db.initiatives||[]).find(i => i.id === id);
    if (!ini) return;
    document.getElementById('initModalTitle').textContent = t('it.modal.edit-prefix') + id;
    document.getElementById('initOrigId').value  = id;
    document.getElementById('initFId').value     = ini.id;
    document.getElementById('initFName').value   = ini.name;
    document.getElementById('initFCat').value    = ini.category || '';
    _populateUserSelect('initFAcc', null, ini.accountable || '');
    document.getElementById('initFStart').value  = _initToISO(ini.startDate);
    document.getElementById('initFDeadline').value = _initToISO(ini.deadline);
    document.getElementById('initFPct').value    = ini.pct !== undefined ? ini.pct : 0;
    document.getElementById('initFStatus').value = ini.status || 'Active';
    document.getElementById('initFMsTrack').value = ini.milestoneTracking || '';
    document.getElementById('initFMsDl').value   = _initToISO(ini.milestoneDeadline);
    document.getElementById('initFKpi').value    = ini.kpiTarget || '';
    document.getElementById('initFNotes').value  = ini.notes || '';
    document.getElementById('initFDoc').value    = ini.docLink || '';
    selParent.value = ini.parentId || '';
  }

  document.getElementById('initErrId').textContent = '';
  overlay.style.display = 'flex';
}

function _initNextMsNum(parentId) {
  const nums = (db.initiatives || [])
    .filter(i => i.parentId === parentId)
    .map(i => { const m = (i.id || '').match(/-M(\d+)$/i); return m ? parseInt(m[1]) : 0; });
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function _initOpenMilestone(parentId) {
  _initOpenModal(null);
  const parent  = (db.initiatives || []).find(x => x.id === parentId);
  const nextNum = _initNextMsNum(parentId);
  setTimeout(() => {
    const selParent = document.getElementById('initFParent');
    if (selParent) selParent.value = parentId;
    const idEl = document.getElementById('initFId');
    if (idEl) idEl.value = `${parentId}-M${nextNum}`;
    if (parent && parent.category) {
      const catEl = document.getElementById('initFCat');
      if (catEl) catEl.value = parent.category;
    }
  }, 0);
}

function _initCloseModal() {
  const overlay = document.getElementById('initModalOverlay');
  if (overlay) overlay.style.display = 'none';
  _initEditReturnId = null;
}

async function _initSave() {
  const origId = document.getElementById('initOrigId').value;
  const newId  = (document.getElementById('initFId').value || '').trim();
  const name   = (document.getElementById('initFName').value || '').trim();
  const errEl  = document.getElementById('initErrId');

  if (!newId) { errEl.textContent = t('it.err.id-empty'); return; }

  // Duplicate check trước name để UX rõ ràng hơn
  if (!origId || origId !== newId) {
    if ((db.initiatives||[]).some(x => x.id === newId)) {
      errEl.textContent = t('it.err.id-exists'); return;
    }
  }
  errEl.textContent = '';

  if (!name) { toast(t('it.err.name-empty'), 'warning'); return; }

  let parentId = document.getElementById('initFParent').value || null;
  // Auto-derive parent from ID pattern when dropdown wasn't set explicitly.
  // e.g. typing "SCF-001-M5" without selecting a parent still links it correctly.
  if (!parentId && _isMilestone(newId)) {
    const _derived = _msParentId(newId);
    if (_derived && (db.initiatives||[]).some(x => x.id === _derived)) {
      parentId = _derived;
      document.getElementById('initFParent').value = _derived;
    }
  }
  const pctRaw   = parseInt(document.getElementById('initFPct').value) || 0;

  const ini = {
    id:                newId,
    name,
    category:          document.getElementById('initFCat').value,
    accountable:       document.getElementById('initFAcc').value.trim(),
    startDate:         _initFromISO(document.getElementById('initFStart').value),
    deadline:          _initFromISO(document.getElementById('initFDeadline').value),
    pct:               Math.min(100, Math.max(0, pctRaw)),
    milestoneTracking: parentId ? '' : document.getElementById('initFMsTrack').value.trim(),
    milestoneDeadline: parentId ? '' : _initFromISO(document.getElementById('initFMsDl').value),
    status:            document.getElementById('initFStatus').value || (parentId ? 'Chưa bắt đầu' : 'Active'),
    kpiTarget:         parentId ? '' : document.getElementById('initFKpi').value.trim(),
    notes:             document.getElementById('initFNotes').value.trim(),
    docLink:           document.getElementById('initFDoc').value.trim(),
    parentId,
    type:              parentId ? 'milestone' : 'initiative',
  };
  if (typeof normInitComplete === 'function') normInitComplete(ini);  // %HT=100 ⇒ Done (root only)

  const _shouldReturnToView = !!_initEditReturnId;
  _initCloseModal();

  if (origId) {
    if (origId !== newId) {
      db.initiatives = db.initiatives.filter(x => x.id !== origId);
      await syncInitiativeAdd(ini);
    } else {
      await syncInitiativeEdit(ini);
    }
    toast(t('it.toast.updated'), 'success');
  } else {
    await syncInitiativeAdd(ini);
    toast(t('it.toast.added'), 'success');
  }
  renderInitiativeTracker();
  if (_shouldReturnToView) openInitViewPopup(ini.id);
}

async function _initDelete(id) {
  const linkedTasks = (db.tasks||[]).filter(t => t.initiative === id);
  const milestones  = (db.initiatives||[]).filter(i => i.parentId === id);
  let warning = `${t('common.delete')} <strong>${id}</strong>?`;
  if (linkedTasks.length) warning += `<br><span style="color:var(--danger);">⚠️ ${linkedTasks.length} ${t('it.delete.warn-tasks')}</span>`;
  if (milestones.length)  warning += `<br><span style="color:var(--warning,orange);">⚠️ ${milestones.length} ${t('it.delete.warn-ms')}</span>`;

  const ok = await uiConfirm(t('it.delete.confirm'), warning, 'danger', t('common.delete'));
  if (!ok) return;

  // Also delete child milestones
  const toDelete = [id, ...milestones.map(m => m.id)];
  toDelete.forEach(delId => { db.initiatives = db.initiatives.filter(x => x.id !== delId); });
  persist();
  writeInitiatives().catch(e => toast(t('it.toast.delete-error') + e.message, 'warning', 5000));

  toast(t('it.toast.deleted'), 'success');
  renderInitiativeTracker();
}

/* ── utilities ── */
function _initMsDotClass(status) {
  const s = (status || '').toLowerCase().trim();
  if (s === 'xong' || s === 'done') return 'done';
  if (s === 'blocked') return 'blocked';
  if (s === 'chưa bắt đầu' || s === 'pending' || s === 'waiting') return 'paused';
  return 'active';
}

function _initStatusIcon(status) {
  const s = (status||'').toLowerCase();
  if (s === 'done')    return '<i class="fa-solid fa-check-circle"></i>';
  if (s === 'blocked') return '<i class="fa-solid fa-ban"></i>';
  if (s === 'paused')  return '<i class="fa-solid fa-pause-circle"></i>';
  return '<i class="fa-solid fa-play-circle"></i>';
}

/* ── Initiative View Popup ── */
let _initViewId = null;
let _initEditReturnId = null;
let _initHistoryLoaded = false;

function openInitViewPopup(id) {
  const ini = (db.initiatives || []).find(x => x.id === id);
  if (!ini) return;
  _initViewId = id;

  const statusKey = (ini.status || 'active').toLowerCase();
  const isMilestone = !!(ini.parentId);

  document.getElementById('initViewTitle').textContent = ini.name || ini.id;
  document.getElementById('initViewSubtitle').textContent =
    `ID: ${ini.id}${isMilestone ? '  ·  ' + t('it.view.ms-of') + ini.parentId : ''}${ini.category ? '  ·  ' + ini.category : ''}`;

  const row = (icon, label, val) => val
    ? `<div class="cp-view-row"><span class="cp-view-label"><i class="fa-solid fa-${icon}"></i>${label}</span><span class="cp-view-val">${val}</span></div>`
    : '';

  const section = (icon, label, val) => val
    ? `<div class="cp-view-section"><div class="cp-view-section-title"><i class="fa-solid fa-${icon}"></i>${label}</div><div class="cp-view-text">${_esc(val)}</div></div>`
    : '';

  const linkedTasks = (db.tasks || []).filter(t => t.initiative === id);
  const milestones  = (db.initiatives || []).filter(i => i.parentId === id && i.type === 'milestone');

  document.getElementById('initViewBody').innerHTML = `
    <div style="padding:0 4px 8px;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        <span class="init-status-chip ${statusKey}">${_initStatusIcon(ini.status)} ${_esc(ini.status||'Active')}</span>
        ${ini.category ? `<span style="font-size:11px;background:var(--info-bg);color:var(--info);padding:2px 8px;border-radius:99px;font-weight:600;">${_esc(ini.category)}</span>` : ''}
        ${isMilestone ? `<span style="font-size:11px;background:var(--primary-xlight);color:var(--primary);padding:2px 8px;border-radius:99px;font-weight:600;">Milestone</span>` : ''}
      </div>
      <div class="cp-view-grid">
        ${row('user-check', 'Accountable', _esc(ini.accountable || ''))}
        ${row('calendar-plus', t('it.view.start'), _esc(ini.startDate || ''))}
        ${row('calendar-xmark', 'Deadline', _esc(ini.deadline || ''))}
        ${row('percent', t('it.view.pct'), ini.pct !== undefined ? ini.pct + '%' : '')}
        ${!isMilestone && milestones.length ? row('list-ol', 'Milestones', milestones.length + ' milestone') : ''}
        ${!isMilestone && linkedTasks.length ? row('list-check', t('it.view.linked-tasks'), linkedTasks.length + ' task') : ''}
        ${ini.milestoneTracking ? row('flag', 'Milestone đang track', _esc(ini.milestoneTracking)) : ''}
        ${ini.milestoneDeadline ? row('clock', 'Deadline Milestone', _esc(ini.milestoneDeadline)) : ''}
        ${ini.docLink ? `<div class="cp-view-row"><span class="cp-view-label"><i class="fa-solid fa-link"></i>${t('it.view.doc')}</span><span class="cp-view-val"><a href="${_esc(ini.docLink)}" target="_blank" rel="noopener" style="color:var(--primary);">${t('it.view.open-link')}</a></span></div>` : ''}
      </div>
      ${section('bullseye', t('it.view.kpi'), ini.kpiTarget)}
      ${section('note-sticky', t('it.view.notes'), ini.notes)}
    </div>`;

  _initHistoryLoaded = false;
  _initTabSwitch('detail');
  document.getElementById('initViewOverlay').style.display = 'flex';
}

function _initTabSwitch(tab) {
  document.getElementById('initTabDetail')?.classList.toggle('active', tab === 'detail');
  document.getElementById('initTabHistory')?.classList.toggle('active', tab === 'history');
  const bodyEl = document.getElementById('initViewBody');
  const histEl = document.getElementById('initViewHistory');
  if (bodyEl) bodyEl.style.display = tab === 'detail'  ? '' : 'none';
  if (histEl) histEl.style.display = tab === 'history' ? '' : 'none';
  if (tab === 'history' && !_initHistoryLoaded) _loadInitHistory();
}

async function _loadInitHistory() {
  const ini = (db.initiatives || []).find(x => x.id === _initViewId);
  if (!ini) return;
  const el = document.getElementById('initViewHistory');
  if (!el) return;
  el.innerHTML = '<div style="padding:28px 16px;text-align:center;color:var(--text-3);">'
               + `<i class="fa-solid fa-spinner fa-spin"></i> ${t('it.history.loading')}</div>`;

  const rows = await _gasAuditRead(ini.id);
  _initHistoryLoaded = true;

  const synthetic = ini.startDate
    ? [ini.startDate, '', t('it.history.initial'), '', '__create__', ini.id + (ini.name ? ' | ' + ini.name : '')]
    : null;

  el.innerHTML = _buildHistoryTable(rows, synthetic);
}

function closeInitViewPopup() {
  document.getElementById('initViewOverlay').style.display = 'none';
  _initViewId = null;
}

/* ── Stat-box Summary Popup (short-list table, đồng nhất với Case Pipeline) ── */
function openInitSummaryPopup(type) {
  const base = _initStatBase();
  let roots, title;

  if (type === 'total')        { roots = base;                                        title = t('it.stat.total'); }
  else if (type === 'active')  { roots = base.filter(i => i.status === 'Active');     title = t('it.stat.active'); }
  else if (type === 'done')    { roots = base.filter(i => i.status === 'Done');       title = t('it.stat.done'); }
  else if (type === 'blocked') { roots = base.filter(i => i.status === 'Blocked');    title = t('it.stat.blocked'); }
  else if (type === 'overdue') { roots = _initCountOverdue(base);                     title = t('mw.dl.overdue'); }
  else return;

  const titleEl = document.getElementById('initSummaryTitle');
  const subEl   = document.getElementById('initSummarySubtitle');
  const body    = document.getElementById('initSummaryBody');
  if (!titleEl || !body) return;

  titleEl.textContent = title;
  subEl.textContent   = `${roots.length} initiative`;

  if (!roots.length) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3);">
      <i class="fa-solid fa-inbox" style="font-size:28px;display:block;margin-bottom:10px;"></i>
      ${t('it.sum.empty')}
    </div>`;
  } else {
    body.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);color:var(--text-2);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">
            <th style="padding:8px 6px;text-align:left;font-weight:600;">ID</th>
            <th style="padding:8px 6px;text-align:left;font-weight:600;">${t('it.sum.col.name')}</th>
            <th style="padding:8px 6px;text-align:left;font-weight:600;">Accountable</th>
            <th style="padding:8px 6px;font-weight:600;">Deadline</th>
            <th style="padding:8px 6px;text-align:center;font-weight:600;">%</th>
            <th style="padding:8px 6px;text-align:center;font-weight:600;">${t('it.col.state')}</th>
          </tr>
        </thead>
        <tbody>
          ${roots.map(i => {
            const statusKey = (i.status || 'active').toLowerCase();
            const od = i.deadline && i.status !== 'Done' && i.pct < 100 && (() => { const d = _initParseDate(i.deadline); return d && d < new Date(); })();
            return `<tr onclick="closeInitSummaryPopup();openInitViewPopup('${_esc(i.id)}')"
                        style="cursor:pointer;border-bottom:1px solid var(--border);"
                        onmouseover="this.style.background='var(--bg)'"
                        onmouseout="this.style.background=''">
              <td style="padding:8px 6px;font-family:var(--mono);color:var(--primary);font-weight:700;white-space:nowrap;">${_esc(i.id)}</td>
              <td style="padding:8px 6px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${_esc(i.name || '')}">${_esc(i.name || '–')}</td>
              <td style="padding:8px 6px;white-space:nowrap;font-size:12px;">${_esc(i.accountable || '–')}</td>
              <td style="padding:8px 6px;white-space:nowrap;font-size:12px;${od ? 'color:var(--danger);font-weight:600;' : ''}">${_esc(i.deadline || '–')}</td>
              <td style="padding:8px 6px;text-align:center;font-family:var(--mono);font-weight:700;">${i.pct != null ? i.pct : 0}%</td>
              <td style="padding:8px 6px;text-align:center;"><span class="init-status-chip ${statusKey}">${_initStatusIcon(i.status)} ${_esc(i.status || 'Active')}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  document.getElementById('initSummaryOverlay').style.display = 'flex';
}

function closeInitSummaryPopup() {
  const el = document.getElementById('initSummaryOverlay');
  if (el) el.style.display = 'none';
}

function initViewOpenEdit() {
  const id = _initViewId;
  _initEditReturnId = id;
  closeInitViewPopup();
  if (id) _initOpenModal(id);
}

/* ── open task-add modal pre-filled for a specific milestone ── */
function openTaskModalForMilestone(msId, iniId) {
  // Open in add mode — handles reset, default user pre-fill, updateFilterDropdowns
  openTaskModal(null);

  const ini = (db.initiatives || []).find(x => x.id === iniId);

  // Set initiative (fInit already has all options from updateFilterDropdowns inside openTaskModal)
  const fiEl = document.getElementById('fInit');
  if (fiEl) fiEl.value = iniId;

  // Rebuild milestone select for this initiative, then select msId
  _populateMilestoneSelect(msId);

  // Category from parent initiative
  const cat = (ini && ini.category) || '';
  if (cat) {
    const catEl = document.getElementById('fCat');
    if (catEl) catEl.value = cat;
  }

  // PIC Accountable from initiative; derive team from _appUsers
  if (ini && ini.accountable) {
    const users   = (typeof _appUsers !== 'undefined') ? _appUsers : [];
    const accUser = users.find(u => u.Username === ini.accountable);
    const accTeam = (accUser && accUser.Team) || '';
    const _cu     = getCurrentUser();
    const curUser = (_cu && _cu.username) || '';
    if (accTeam) {
      _populateTeamSelect('fTeam', accTeam);
      _populateUserSelect('fPicAcc', accTeam, ini.accountable);
      _populateUserSelect('fPicRes', accTeam, curUser);
    } else {
      _populateUserSelect('fPicAcc', '', ini.accountable);
    }
  }

  // Re-gen task ID with correct initiative + milestone context
  autoGenId();

  // Update subtitle so user knows the context
  const msLabel = _msShortLabel(msId);
  const subEl = document.getElementById('modalSubtitle');
  if (subEl) subEl.textContent = `Initiative: ${iniId}  ·  Milestone: ${msLabel}`;
}

// Stored DD-MMM-YY (or any _initParseDate-able value) → YYYY-MM-DD for <input type="date">.
// Returns '' when empty/unparseable so the picker shows blank.
function _initToISO(str) {
  const d = _initParseDate(str);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// YYYY-MM-DD from <input type="date"> → stored DD-MMM-YY. Passes through anything non-ISO.
function _initFromISO(str) {
  const s = (str || '').trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}-${_MMM[parseInt(m[2],10)-1]}-${m[1].slice(-2)}`;
}

function _initParseDate(str) {
  if (!str) return null;
  // "DD-Mon-YY" or "DD-Mon-YYYY" or ISO
  const dmy = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (dmy) {
    const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const mi = months[dmy[2].toLowerCase()];
    if (mi === undefined) return null;
    const yy = parseInt(dmy[3]);
    const year = yy < 100 ? (yy + (yy < 50 ? 2000 : 1900)) : yy;
    return new Date(year, mi, parseInt(dmy[1]));
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}
