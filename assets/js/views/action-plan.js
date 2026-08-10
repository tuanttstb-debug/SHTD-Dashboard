'use strict';

/* ── filter state ── */
let _apFilterTeam   = null;    // null = uninit; '' = all teams; 'BL1'... = specific
let _apFilterPeriod = 'month'; // 'month' | 'quarter' | 'prev-month'
let _apFilterRag    = '';      // '' | 'Red' | 'Amber' | 'Green'
let _apAccordionOpen = {};     // { [team]: boolean } — persists across navigations

/* ── accordion ID: index-based to handle Vietnamese/spaced team names safely ── */
function _apTid(team) {
  return 'ap-acc-' + TEAM_LIST.indexOf(team);
}

/* ── period range → { s: Date, e: Date } ── */
function _apPeriodRange(p) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  if (p === 'quarter') {
    const q = Math.floor(m / 3);
    return { s: new Date(y, q * 3, 1), e: new Date(y, q * 3 + 3, 0) };
  }
  if (p === 'prev-month') {
    return { s: new Date(y, m - 1, 1), e: new Date(y, m, 0) };
  }
  /* month (default) */
  return { s: new Date(y, m, 1), e: new Date(y, m + 1, 0) };
}

/* ── is dateStr within [range.s, range.e]? ── */
function _apInRange(dateStr, range) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d) && d >= range.s && d <= range.e;
}

/* ── default team from auth session (cached until page reload) ── */
function _apDefaultTeam() {
  if (_apFilterTeam !== null) return _apFilterTeam;
  const u = getCurrentUser();
  _apFilterTeam = (u && u.role !== 'Admin' && u.team) ? u.team : '';
  return _apFilterTeam;
}

/* ── filter: tasks
   Primary:  highlight=Y AND deadline in range
   Extended: Blocked/Tạm dừng (in range or no deadline) OR overdue (deadline ≤ period end)
── */
function _apGetTasks(team, range, rag) {
  const today = new Date();
  return (db.tasks || []).filter(t => {
    if (team && t.team !== team) return false;
    if (rag && t.status !== rag) return false;
    const inRange  = _apInRange(t.endDate, range);
    const isHL     = t.highlight === 'Y' && inRange;
    const isBlk    = (t.state === 'Blocked' || t.state === 'Tạm dừng')
                     && (inRange || !t.endDate);
    const isOvd    = t.endDate && new Date(t.endDate) < today
                     && t.state !== 'Hoàn thành'
                     && new Date(t.endDate) <= range.e;
    return isHL || isBlk || isOvd;
  });
}

/* ── filter: cases (highlight=Y, deadline in range) ── */
function _apGetCases(team, range, rag) {
  return (dbCases || []).filter(c => {
    if (c.highlight !== 'Y') return false;
    if (team && c.team !== team) return false;
    if (!_apInRange(c.deadline, range)) return false;
    if (rag && c.rag !== rag) return false;
    return true;
  });
}

/* ── filter: parent initiatives, filtered by accountable user's team ── */
function _apGetInits(team) {
  const roots = (typeof _initRealRoots === 'function')
    ? _initRealRoots()
    : (db.initiatives || []).filter(i => !i.parentId && i.id !== 'BAU' && i.status !== undefined);
  if (!team) return roots;
  return roots.filter(i => {
    const u = (_appUsers || []).find(u => u.Username === i.accountable);
    return u ? u.Team === team : false;
  });
}

/* ── case stage → kanban column key ── */
const _AP_CASE_COL = {
  'Tiếp nhận':                                        'todo',
  'Đã gặp KH/đang bổ sung thông tin':                'doing',
  'Chờ dữ liệu/ĐVKD':                               'doing',
  'Chờ bổ sung hồ sơ':                               'doing',
  'Đang phân tích':                                   'doing',
  'Chờ TTĐ/Thẩm định':                              'doing',
  'Trình nội bộ':                                     'doing',
  'Đã xong phương án':                               'doing',
  'Đã trình TTV BĐS, đang phối hợp để báo cáo lại': 'doing',
  'Trình phê duyệt':                                  'doing',
  'Chờ giải ngân/triển khai':                        'done',
  'Đã phê duyệt':                                    'done',
  'Đang triển khai':                                  'done',
  'Tạm dừng/Blocked':                                 'blocked',
};

/* ── task state → kanban column key ── */
function _apTaskCol(t) {
  if (t.state === 'Blocked' || t.state === 'Tạm dừng')           return 'blocked';
  if (t.state === 'Hoàn thành')                                   return 'done';
  if (t.state === 'Đang thực hiện' || t.state === 'Hoàn thành chuẩn bị') return 'doing';
  return 'todo';
}

/* ══════════════════════════════════════════════════════════
   MAIN RENDER
   ══════════════════════════════════════════════════════════ */
function renderActionPlan() {
  const root = document.getElementById('actionPlanRoot');
  if (!root) return;

  const team  = _apDefaultTeam();
  const range = _apPeriodRange(_apFilterPeriod);
  const rag   = _apFilterRag;
  const tasks = _apGetTasks(team, range, rag);
  const cases = _apGetCases(team, range, rag);
  const inits = _apGetInits(team);
  const empty = tasks.length === 0 && cases.length === 0 && inits.length === 0;

  root.innerHTML =
    _apToolbar(team, tasks.length + cases.length, inits.length)
    + (empty
        ? _apEmpty()
        : team === ''
          ? _apRenderGrouped(tasks, cases, inits)
          : _apSummaryStrip(tasks, cases) + _apKanban(tasks, cases) + _apInitSection(inits));
}

/* ── toolbar (filter bar) ── */
function _apToolbar(team, itemCount, initCount) {
  const u = getCurrentUser();
  const isAdminUser = u && u.role === 'Admin';

  const teamOpts = TEAM_LIST.map(t =>
    `<option value="${esc(t)}" ${team === t ? 'selected' : ''}>${esc(t)}</option>`
  ).join('');

  const periods = [
    { k: 'month',      l: t('ap.period.month') },
    { k: 'quarter',    l: t('ap.period.quarter') },
    { k: 'prev-month', l: t('ap.period.prev-month') },
  ];

  const rags = [
    { k: '',      l: t('common.all'),  s: '' },
    { k: 'Red',   l: '■ Red',   s: 'color:var(--danger)' },
    { k: 'Amber', l: '■ Amber', s: 'color:var(--warning)' },
    { k: 'Green', l: '■ Green', s: 'color:var(--success)' },
  ];

  return `
  <div class="toolbar" style="flex-wrap:wrap;gap:8px 0;margin-bottom:12px;align-items:flex-start;">
    <div class="toolbar-left" style="flex-direction:column;align-items:flex-start;gap:8px;">
      <div style="font-size:17px;font-weight:800;">Action Plan</div>
      <div class="ap-filter-bar">
        ${isAdminUser
          ? `<select class="form-control" style="font-size:12px;padding:5px 10px;width:auto;height:auto;"
               onchange="_apSetTeam(this.value)">
               <option value="" ${team === '' ? 'selected' : ''}>${t('ap.all-teams')}</option>
               ${teamOpts}
             </select>`
          : `<span class="type-pill" style="font-size:12px;padding:4px 10px;">
               <i class="fa-solid fa-users" style="margin-right:4px;"></i>${esc(team || 'Tất cả')}
             </span>`
        }
        <div class="ap-period-group">
          ${periods.map(p =>
            `<button class="ap-period-btn ${_apFilterPeriod === p.k ? 'active' : ''}"
               onclick="_apSetPeriod('${p.k}')">${p.l}</button>`
          ).join('')}
        </div>
        <div class="ap-rag-group">
          ${rags.map(r =>
            `<button class="ap-rag-btn ${_apFilterRag === r.k ? 'active' : ''}"
               onclick="_apSetRag('${r.k}')"
               ${r.s ? `style="${r.s}"` : ''}>${r.l}</button>`
          ).join('')}
        </div>
      </div>
    </div>
    <div class="toolbar-right" style="font-size:12px;color:var(--text-3);">
      ${itemCount} tasks/cases &nbsp;·&nbsp; ${initCount} initiatives
    </div>
  </div>`;
}

/* ── filter change handlers (global, called from onclick) ── */
function _apSetTeam(v)   { _apFilterTeam   = v; renderActionPlan(); }
function _apSetPeriod(v) { _apFilterPeriod  = v; renderActionPlan(); }
function _apSetRag(v)    { _apFilterRag     = v; renderActionPlan(); }

/* ── summary strip (count bar) ── */
function _apSummaryStrip(tasks, cases) {
  const items = [
    ...tasks.map(t => ({ col: _apTaskCol(t), rag: t.status })),
    ...cases.map(c => ({ col: _AP_CASE_COL[c.stage] || 'todo', rag: c.rag })),
  ];
  const doing   = items.filter(x => x.col === 'doing').length;
  const blocked = items.filter(x => x.col === 'blocked').length;
  const done    = items.filter(x => x.col === 'done').length;
  const red     = items.filter(x => x.rag === 'Red').length;
  return `
  <div class="ap-summary-strip">
    <span><b>${items.length}</b> ${t('ap.actions')}</span>
    <span class="ap-sum-sep">|</span>
    <span style="color:var(--info);">◉ ${doing} ${t('ap.doing')}</span>
    <span class="ap-sum-sep">|</span>
    <span style="color:var(--danger);">⛔ ${blocked} Blocked</span>
    <span class="ap-sum-sep">|</span>
    <span style="color:var(--success);">✓ ${done} Done</span>
    ${red > 0 ? `<span class="ap-sum-sep">|</span>
    <span style="color:var(--danger);font-weight:700;">■ ${red} Red</span>` : ''}
  </div>`;
}

/* ── grouped view: each team is an accordion ── */
function _apRenderGrouped(allTasks, allCases, allInits) {
  let html = '';
  let firstWithContent = true;

  TEAM_LIST.forEach(team => {
    const tTasks = allTasks.filter(t => t.team === team);
    const tCases = allCases.filter(c => c.team === team);
    const tInits = allInits.filter(i => {
      const u = (_appUsers || []).find(u => u.Username === i.accountable);
      return u ? u.Team === team : false;
    });
    if (tTasks.length === 0 && tCases.length === 0 && tInits.length === 0) return;

    if (_apAccordionOpen[team] === undefined) {
      _apAccordionOpen[team] = firstWithContent; // first team with content opens by default
    }
    firstWithContent = false;

    const isOpen = _apAccordionOpen[team];
    const tid    = _apTid(team);

    // mini stats for header
    const allItems = [
      ...tTasks.map(t => ({ col: _apTaskCol(t), rag: t.status })),
      ...tCases.map(c => ({ col: _AP_CASE_COL[c.stage] || 'todo', rag: c.rag })),
    ];
    const doing   = allItems.filter(x => x.col === 'doing').length;
    const blocked = allItems.filter(x => x.col === 'blocked').length;
    const done    = allItems.filter(x => x.col === 'done').length;
    const red     = allItems.filter(x => x.rag === 'Red').length;

    html += `
    <div class="ap-accordion" id="${tid}">
      <div class="ap-accordion-header" onclick="_apToggle(this.dataset.team)" data-team="${esc(team)}">
        <div class="ap-acc-left">
          <i class="fa-solid fa-chevron-${isOpen ? 'down' : 'right'} ap-acc-chevron"></i>
          <span class="ap-acc-team">${esc(team)}</span>
          <span class="ap-acc-count">${allItems.length}</span>
          <span class="ap-acc-stat" style="color:var(--info);">◉ ${doing}</span>
          ${blocked > 0 ? `<span class="ap-acc-stat" style="color:var(--danger);">⛔ ${blocked}</span>` : ''}
          ${red > 0 ? `<span class="ap-acc-stat" style="color:var(--danger);font-weight:700;">■ ${red} Red</span>` : ''}
          <span class="ap-acc-stat" style="color:var(--success);">✓ ${done}</span>
        </div>
      </div>
      <div class="ap-accordion-body" style="display:${isOpen ? 'block' : 'none'};">
        ${_apKanban(tTasks, tCases)}
        ${_apInitSection(tInits)}
      </div>
    </div>`;
  });

  return html || _apEmpty();
}

/* ── accordion toggle (no full re-render: DOM mutation only) ── */
function _apToggle(team) {
  _apAccordionOpen[team] = !_apAccordionOpen[team];
  const tid  = _apTid(team);
  const body = document.querySelector('#' + tid + ' .ap-accordion-body');
  const chev = document.querySelector('#' + tid + ' .ap-acc-chevron');
  if (body) body.style.display = _apAccordionOpen[team] ? 'block' : 'none';
  if (chev) {
    chev.classList.toggle('fa-chevron-down',  !!_apAccordionOpen[team]);
    chev.classList.toggle('fa-chevron-right', !_apAccordionOpen[team]);
  }
}

/* ── kanban 4 cols with tasks + cases mixed ── */
function _apKanban(tasks, cases) {
  const COLS = [
    { key: 'todo',    label: 'Chưa bắt đầu',     color: 'var(--text-3)',  taskStates: ['Chưa bắt đầu'] },
    { key: 'doing',   label: 'Đang thực hiện',     color: 'var(--info)',    taskStates: ['Đang thực hiện', 'Hoàn thành chuẩn bị'] },
    { key: 'blocked', label: 'Blocked / Tạm dừng', color: 'var(--danger)',  taskStates: ['Blocked', 'Tạm dừng'] },
    { key: 'done',    label: 'Hoàn thành',          color: 'var(--success)', taskStates: ['Hoàn thành'] },
  ];
  return `
  <div class="kanban-board">
    ${COLS.map(col => {
      const cTasks = tasks.filter(t => col.taskStates.includes(t.state));
      const cCases = cases.filter(c => (_AP_CASE_COL[c.stage] || 'todo') === col.key);
      const total  = cTasks.length + cCases.length;
      return `<div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:${col.color};">${col.label}</span>
          <span class="kanban-col-count">${total}</span>
        </div>
        <div class="kanban-cards">
          ${total === 0
            ? '<div class="kanban-empty">Không có</div>'
            : cTasks.map(_apTaskCard).join('') + cCases.map(_apCaseCard).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ── task card ── */
function _apTaskCard(t) {
  const ragColor = { Green: 'var(--success)', Amber: 'var(--warning)', Red: 'var(--danger)' }[t.status] || 'var(--text-3)';
  const prog     = parseInt(t.progress) || 0;
  const overdue  = t.endDate && new Date(t.endDate) < new Date() && t.state !== 'Hoàn thành';
  const isAuto   = t.highlight !== 'Y'; // extended-criteria auto-added card
  return `
  <div class="kanban-card" onclick="openTaskViewPopup('${esc(t.id)}')" style="cursor:pointer;">
    ${isAuto ? `<div class="ap-auto-badge"><i class="fa-solid fa-bolt" style="margin-right:2px;font-size:9px;"></i>Auto</div>` : ''}
    <div class="kanban-card-title">${esc(t.name)}</div>
    ${prog > 0 ? `<div class="prog-wrap" style="margin-bottom:6px;width:100%;">
      <div class="prog-bar" style="flex:1;width:auto;"><div class="prog-fill" style="width:${prog}%;"></div></div>
      <span class="prog-pct">${prog}%</span>
    </div>` : ''}
    <div class="kanban-card-meta">
      <span class="type-pill">${esc(t.id)}</span>
      ${t.team ? `<span class="type-pill">${esc(t.team)}</span>` : ''}
      <i class="fa-solid fa-circle" style="font-size:8px;color:${ragColor};margin-left:auto;" title="RAG: ${t.status || '–'}"></i>
    </div>
    <div class="kanban-card-owner">
      <i class="fa-solid fa-user" style="margin-right:3px;"></i>${esc(t.picRes || '–')}
      ${t.endDate ? `<span style="margin-left:8px;${overdue ? 'color:var(--danger);font-weight:700;' : 'color:var(--text-3);'}">
        <i class="fa-solid fa-calendar-day" style="margin-right:2px;"></i>${fmtDate(t.endDate)}
      </span>` : ''}
    </div>
  </div>`;
}

/* ── case card ── */
function _apCaseCard(c) {
  const ragColor = { Green: 'var(--success)', Amber: 'var(--warning)', Red: 'var(--danger)' }[c.rag] || 'var(--text-3)';
  const _apCg   = _AP_CASE_COL[c.stage] || 'active';
  const overdue  = c.deadline && new Date(c.deadline) < new Date() && _apCg !== 'done' && _apCg !== 'blocked';
  return `
  <div class="kanban-card kanban-card-case" onclick="openCaseViewPopup('${esc(c.id)}')" style="cursor:pointer;">
    <div class="ap-case-badge"><i class="fa-solid fa-star" style="font-size:9px;margin-right:2px;"></i>CASE</div>
    <div class="kanban-card-title">${esc(c.caseName || c.id)}</div>
    <div class="kanban-card-meta">
      <span class="type-pill">${esc(c.id)}</span>
      ${c.stage ? `<span class="type-pill" style="background:var(--primary-xlight);color:var(--primary);
          max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${esc(c.stage)}">${esc(c.stage)}</span>` : ''}
      <i class="fa-solid fa-circle" style="font-size:8px;color:${ragColor};margin-left:auto;" title="RAG: ${c.rag || '–'}"></i>
    </div>
    <div class="kanban-card-owner">
      <i class="fa-solid fa-user" style="margin-right:3px;"></i>${esc(c.pic || '–')}
      ${c.deadline ? `<span style="margin-left:8px;${overdue ? 'color:var(--danger);font-weight:700;' : 'color:var(--text-3);'}">
        <i class="fa-solid fa-calendar-day" style="margin-right:2px;"></i>${fmtDate(c.deadline)}
      </span>` : ''}
    </div>
  </div>`;
}

/* ── initiatives section (below kanban) ── */
function _apInitSection(inits) {
  if (!inits || inits.length === 0) return '';
  return `
  <div class="ap-init-section">
    <div class="ap-init-section-title">
      <i class="fa-solid fa-bullseye" style="color:var(--primary);"></i>
      Initiatives (${inits.length})
    </div>
    ${inits.map(i => {
      const milestones  = (db.initiatives || []).filter(m =>
        (m.type ? m.type === 'milestone' : !!m.parentId) && m.parentId === i.id
      );
      const linkedTasks = (db.tasks || []).filter(t => t.initiative === i.id);
      const pct         = i.pct || 0;
      const sColor      = { Active: 'var(--success)', Done: 'var(--info)', Blocked: 'var(--danger)', Paused: 'var(--text-3)' }[i.status] || 'var(--text-3)';
      return `
      <div class="ap-init-row" onclick="openInitViewPopup('${esc(i.id)}')">
        <span class="type-pill" style="font-family:var(--mono);flex-shrink:0;font-size:11px;">${esc(i.id)}</span>
        <span class="ap-init-name">${esc(i.name || '–')}</span>
        <div class="prog-wrap" style="flex-shrink:0;">
          <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;"></div></div>
          <span class="prog-pct">${pct}%</span>
        </div>
        <span class="ap-init-meta">${milestones.length} MS · ${linkedTasks.length} task</span>
        <span class="ap-init-meta" style="color:${sColor};font-weight:600;">${esc(i.status || '')}</span>
        ${i.deadline ? `<span class="ap-init-meta">
          <i class="fa-solid fa-calendar-day" style="margin-right:2px;"></i>${fmtDate(i.deadline)}
        </span>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

/* ── empty state ── */
function _apEmpty() {
  return `
  <div class="card" style="text-align:center;padding:48px;color:var(--text-3);">
    <i class="fa-solid fa-clipboard-list" style="font-size:36px;margin-bottom:14px;display:block;"></i>
    <div style="font-size:15px;font-weight:600;">Không có hành động trọng tâm trong kỳ này</div>
    <div style="font-size:12px;margin-top:6px;">
      Thử chọn kỳ khác, hoặc vào <strong>Quản lý Task</strong> → chỉnh sửa task → bật
      <strong>Highlight báo cáo = Y</strong>
    </div>
  </div>`;
}
