'use strict';

function renderActionPlan() {
  const root = document.getElementById('actionPlanRoot');
  if (!root) return;

  const tasks = (db && db.tasks || []).filter(t => t.highlight === 'Y');

  const cols = [
    { key: 'todo',    label: 'Chưa bắt đầu',       color: 'var(--text-3)',   states: ['Chưa bắt đầu'] },
    { key: 'doing',   label: 'Đang thực hiện',       color: 'var(--info)',     states: ['Đang thực hiện', 'Hoàn thành chuẩn bị'] },
    { key: 'blocked', label: 'Blocked / Tạm dừng',   color: 'var(--danger)',   states: ['Blocked', 'Tạm dừng'] },
    { key: 'done',    label: 'Hoàn thành',           color: 'var(--success)',  states: ['Hoàn thành'] },
  ];

  const empty = `
    <div class="card" style="text-align:center;padding:48px;color:var(--text-3);">
      <i class="fa-solid fa-clipboard-list" style="font-size:36px;margin-bottom:14px;display:block;"></i>
      <div style="font-size:15px;font-weight:600;">Chưa có task nào được highlight</div>
      <div style="font-size:12px;margin-top:6px;">
        Vào <strong>Quản lý Task</strong> → chỉnh sửa task → bật <strong>Highlight báo cáo = Y</strong>
      </div>
    </div>`;

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">Action Plan</div>
      <div style="font-size:12px;color:var(--text-3);">${tasks.length} task highlight &nbsp;·&nbsp; Lọc từ db.tasks (highlight = Y)</div>
    </div><div class="toolbar-right">
      <button class="btn btn-outline btn-sm" onclick="navigateTo('tasks')">
        <i class="fa-solid fa-list-check"></i> Quản lý Task
      </button>
    </div></div>
    ${tasks.length === 0 ? empty : `
    <div class="kanban-board">
      ${cols.map(col => {
        const colTasks = tasks.filter(t => col.states.includes(t.state));
        return `<div class="kanban-col">
          <div class="kanban-col-header">
            <span class="kanban-col-title" style="color:${col.color};">${col.label}</span>
            <span class="kanban-col-count">${colTasks.length}</span>
          </div>
          <div class="kanban-cards">
            ${colTasks.length === 0
              ? '<div class="kanban-empty">Không có task</div>'
              : colTasks.map(_apCard).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`}`;
}

function _apCard(t) {
  const ragColor = { Green: 'var(--success)', Amber: 'var(--warning)', Red: 'var(--danger)' }[t.status] || 'var(--text-3)';
  const prog = parseInt(t.progress) || 0;
  const overdue = t.endDate && new Date(t.endDate) < new Date() && t.state !== 'Hoàn thành';
  return `
    <div class="kanban-card">
      <div class="kanban-card-title">${t.name}</div>
      ${prog > 0 ? `<div class="prog-wrap" style="margin-bottom:6px;">
        <div class="prog-bar" style="width:100%;"><div class="prog-fill" style="width:${prog}%;"></div></div>
        <span class="prog-pct">${prog}%</span>
      </div>` : ''}
      <div class="kanban-card-meta">
        <span class="type-pill">${t.id}</span>
        ${t.team ? `<span class="type-pill">${t.team}</span>` : ''}
        <i class="fa-solid fa-circle" style="font-size:8px;color:${ragColor};margin-left:auto;" title="RAG: ${t.status}"></i>
      </div>
      <div class="kanban-card-owner">
        <i class="fa-solid fa-user" style="margin-right:3px;"></i>${t.picRes || '–'}
        ${t.endDate ? `<span style="margin-left:8px;${overdue ? 'color:var(--danger);font-weight:700;' : 'color:var(--text-3);'}">
          <i class="fa-solid fa-calendar-day" style="margin-right:2px;"></i>${t.endDate}
        </span>` : ''}
      </div>
    </div>`;
}
