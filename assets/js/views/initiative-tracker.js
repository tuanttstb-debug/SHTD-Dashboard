'use strict';

/* ── filter state ── */
let _initFilterCat    = '';
let _initFilterStatus = '';

/* ── main render ── */
function renderInitiativeTracker() {
  const root = document.getElementById('initiativeTrackerRoot');
  if (!root) return;

  const roots = _initRealRoots();

  root.innerHTML = `
    ${_initStatBar(roots)}
    <div class="toolbar" style="margin-bottom:16px;">
      <div class="toolbar-left">
        <div style="font-size:17px;font-weight:800;">Theo dõi Initiative</div>
        <div style="font-size:12px;color:var(--text-3);">
          ${roots.length} initiative · ${(db.initiatives||[]).filter(i=>i.type==='milestone').length} milestone
        </div>
      </div>
      <div class="toolbar-right">
        <select class="form-control" style="font-size:12px;padding:6px 10px;width:auto;" onchange="_initSetFilter('cat',this.value)">
          <option value="">Tất cả Category</option>
          ${_initCategoryOptions()}
        </select>
        <select class="form-control" style="font-size:12px;padding:6px 10px;width:auto;" onchange="_initSetFilter('status',this.value)">
          <option value="">Tất cả Trạng thái</option>
          <option value="Active">Active</option>
          <option value="Done">Done</option>
          <option value="Paused">Paused</option>
          <option value="Blocked">Blocked</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="readInitiatives().then(renderInitiativeTracker)" title="Sync từ GG Sheet">
          <i class="fa-solid fa-rotate"></i> Sync GG Sheet
        </button>
        <button class="btn btn-primary btn-sm" onclick="_initOpenModal(null)">
          <i class="fa-solid fa-plus"></i> Thêm Initiative
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

/* ── stat bar ── */
function _initStatBar(roots) {
  const total   = roots.length;
  const active  = roots.filter(i => i.status === 'Active').length;
  const done    = roots.filter(i => i.status === 'Done').length;
  const blocked = roots.filter(i => i.status === 'Blocked').length;
  const today   = new Date();
  const overdue = roots.filter(i => {
    if (!i.deadline || i.status === 'Done') return false;
    const d = _initParseDate(i.deadline);
    return d && d < today && i.pct < 100;
  }).length;

  return `<div class="init-stat-bar">
    <div class="init-stat-item">
      <div class="init-stat-value">${total}</div>
      <div class="init-stat-label">Tổng Initiative</div>
    </div>
    <div class="init-stat-item" style="border-left:3px solid var(--primary);">
      <div class="init-stat-value" style="color:var(--primary);">${active}</div>
      <div class="init-stat-label">Đang Active</div>
    </div>
    <div class="init-stat-item" style="border-left:3px solid var(--success);">
      <div class="init-stat-value" style="color:var(--success);">${done}</div>
      <div class="init-stat-label">Hoàn thành</div>
    </div>
    <div class="init-stat-item" style="border-left:3px solid var(--danger);">
      <div class="init-stat-value" style="color:var(--danger);">${overdue}</div>
      <div class="init-stat-label">Quá hạn</div>
    </div>
    <div class="init-stat-item" style="border-left:3px solid var(--danger);">
      <div class="init-stat-value" style="color:var(--danger);">${blocked}</div>
      <div class="init-stat-label">Blocked</div>
    </div>
  </div>`;
}

/* ── card list ── */
function _initBuildCardList() {
  const roots = _initRealRoots().filter(i => {
    if (_initFilterCat    && i.category !== _initFilterCat)    return false;
    if (_initFilterStatus && i.status   !== _initFilterStatus) return false;
    return true;
  });

  if (!roots.length) {
    return `<div class="init-empty">
      <div class="init-empty-icon"><i class="fa-solid fa-diagram-project"></i></div>
      <div class="init-empty-title">Chưa có Initiative nào</div>
      <div style="font-size:13px;margin-top:6px;">Bấm <strong>+ Thêm Initiative</strong> hoặc <strong>Sync GG Sheet</strong> để tải dữ liệu.</div>
    </div>`;
  }

  return roots.map(ini => _initBuildCard(ini)).join('');
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
    <div class="init-card-header">
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
      <div class="init-card-actions">
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
        <i class="fa-solid fa-list-check"></i> Tasks liên kết
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
    return `<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Chưa có milestone. <button class="btn btn-ghost btn-sm" onclick="_initOpenMilestone('${_esc(parentId)}')"><i class="fa-solid fa-plus"></i> Thêm Milestone</button></div>`;
  }
  const rows = milestones.map(ms => {
    const dotClass = _initMsDotClass(ms.status);
    return `<div class="init-milestone-row">
      <div class="init-step-dot ${dotClass}"></div>
      <span class="init-ms-id">${_esc(_msShortLabel(ms.id))}</span>
      <span class="init-ms-name">${_esc(ms.name.replace(/^↳\s*/,''))}</span>
      <div class="init-prog-wrap">
        <div class="init-prog-bar" style="width:60px;"><div class="init-prog-fill ${dotClass === 'done' ? 'done' : dotClass === 'blocked' ? 'blocked' : ''}" style="width:${ms.pct||0}%;"></div></div>
        <span class="init-prog-pct">${ms.pct||0}%</span>
      </div>
      ${ms.deadline ? `<span class="init-ms-deadline"><i class="fa-solid fa-calendar" style="margin-right:3px;"></i>${_esc(ms.deadline)}</span>` : ''}
      <span class="init-status-chip ${dotClass}" style="font-size:10px;padding:1px 6px;">${_esc(ms.status||'Chưa bắt đầu')}</span>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:11px;" onclick="_initOpenModal('${_esc(ms.id)}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
    </div>`;
  }).join('');

  return rows + `<div style="margin-top:8px;"><button class="btn btn-ghost btn-sm" onclick="_initOpenMilestone('${_esc(parentId)}')"><i class="fa-solid fa-plus"></i> Thêm Milestone</button></div>`;
}

/* ── linked task list (inside card) ── */
function _initBuildTaskList(initiativeId, tasks) {
  if (!tasks.length) {
    return `<div style="font-size:12px;color:var(--text-3);padding:14px 18px;">Không có task nào liên kết với initiative này.</div>`;
  }
  const rows = tasks.map(t => `
    <tr onclick="editTask('${t.id}')" title="Mở task ${t.id}">
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
      <th>ID</th><th>Task</th><th>Milestone</th><th>Trạng thái</th>
      <th>PIC</th><th>Tiến độ</th><th>Deadline</th>
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
        <div class="modal-title" id="initModalTitle">Thêm Initiative</div>
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
              <option value="">(Đây là Initiative gốc)</option>
            </select>
          </div>
          <div class="form-group full">
            <label class="form-label">Tên Initiative / Milestone <span style="color:var(--danger)">*</span></label>
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
            <input class="form-control" id="initFAcc" placeholder="VD: MaiTTT7">
          </div>
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input class="form-control" id="initFStart" placeholder="VD: 15-Jan-26">
          </div>
          <div class="form-group">
            <label class="form-label">Deadline / Target</label>
            <input class="form-control" id="initFDeadline" placeholder="VD: 30-Jun-26">
          </div>
          <div class="form-group">
            <label class="form-label">% Hoàn thành</label>
            <input class="form-control" id="initFPct" type="number" min="0" max="100" placeholder="0–100">
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái</label>
            <select class="form-control" id="initFStatus">
              <option value="Active">Active</option>
              <option value="Done">Done</option>
              <option value="Paused">Paused</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Milestone Đang track</label>
            <input class="form-control" id="initFMsTrack" placeholder="Tên milestone hiện tại…">
          </div>
          <div class="form-group">
            <label class="form-label">Deadline Milestone</label>
            <input class="form-control" id="initFMsDl" placeholder="VD: 15-Apr-26">
          </div>
          <div class="form-group full">
            <label class="form-label">Mục tiêu / KPI đầu ra</label>
            <textarea class="form-control" id="initFKpi" rows="2" placeholder="Mô tả KPI / kết quả mong đợi…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Ghi chú</label>
            <textarea class="form-control" id="initFNotes" rows="2" placeholder="Ghi chú…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Link tài liệu</label>
            <input class="form-control" id="initFDoc" placeholder="https://…">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="_initCloseModal()">Hủy</button>
        <button class="btn btn-primary" onclick="_initSave()"><i class="fa-solid fa-floppy-disk"></i> Lưu</button>
      </div>
    </div>
  </div>`;
}

function _initOpenModal(id) {
  const overlay = document.getElementById('initModalOverlay');
  if (!overlay) { renderInitiativeTracker(); return; }

  // Populate parent dropdown (root initiatives only)
  const selParent = document.getElementById('initFParent');
  selParent.innerHTML = '<option value="">(Đây là Initiative gốc)</option>'
    + (db.initiatives||[]).filter(i => (i.type ? i.type === 'initiative' : !i.parentId) && (id === null || i.id !== id))
        .map(i => `<option value="${_esc(i.id)}">${_esc(i.id)} – ${_esc(i.name)}</option>`).join('');

  if (id === null) {
    // Add mode
    document.getElementById('initModalTitle').textContent = 'Thêm Initiative / Milestone';
    document.getElementById('initOrigId').value = '';
    ['initFId','initFName','initFAcc','initFStart','initFDeadline','initFMsTrack','initFMsDl','initFKpi','initFNotes','initFDoc'].forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
    document.getElementById('initFPct').value = '0';
    document.getElementById('initFStatus').value = 'Active';
    document.getElementById('initFCat').value = '';
    selParent.value = '';
  } else {
    // Edit mode
    const ini = (db.initiatives||[]).find(i => i.id === id);
    if (!ini) return;
    document.getElementById('initModalTitle').textContent = 'Chỉnh sửa – ' + id;
    document.getElementById('initOrigId').value  = id;
    document.getElementById('initFId').value     = ini.id;
    document.getElementById('initFName').value   = ini.name;
    document.getElementById('initFCat').value    = ini.category || '';
    document.getElementById('initFAcc').value    = ini.accountable || '';
    document.getElementById('initFStart').value  = ini.startDate || '';
    document.getElementById('initFDeadline').value = ini.deadline || '';
    document.getElementById('initFPct').value    = ini.pct !== undefined ? ini.pct : 0;
    document.getElementById('initFStatus').value = ini.status || 'Active';
    document.getElementById('initFMsTrack').value = ini.milestoneTracking || '';
    document.getElementById('initFMsDl').value   = ini.milestoneDeadline || '';
    document.getElementById('initFKpi').value    = ini.kpiTarget || '';
    document.getElementById('initFNotes').value  = ini.notes || '';
    document.getElementById('initFDoc').value    = ini.docLink || '';
    selParent.value = ini.parentId || '';
  }

  document.getElementById('initErrId').textContent = '';
  overlay.style.display = 'flex';
}

function _initOpenMilestone(parentId) {
  _initOpenModal(null);
  setTimeout(() => {
    const sel = document.getElementById('initFParent');
    if (sel) sel.value = parentId;
  }, 0);
}

function _initCloseModal() {
  const overlay = document.getElementById('initModalOverlay');
  if (overlay) overlay.style.display = 'none';
}

function _initSave() {
  const origId = document.getElementById('initOrigId').value;
  const newId  = (document.getElementById('initFId').value || '').trim();
  const name   = (document.getElementById('initFName').value || '').trim();
  const errEl  = document.getElementById('initErrId');

  if (!newId) { errEl.textContent = 'ID không được để trống.'; return; }

  // Duplicate check trước name để UX rõ ràng hơn
  if (!origId || origId !== newId) {
    if ((db.initiatives||[]).some(x => x.id === newId)) {
      errEl.textContent = 'ID đã tồn tại.'; return;
    }
  }
  errEl.textContent = '';

  if (!name) { toast('Tên Initiative không được để trống.', 'warning'); return; }

  const parentId = document.getElementById('initFParent').value || null;
  const pctRaw   = parseInt(document.getElementById('initFPct').value) || 0;

  const ini = {
    id:                newId,
    name,
    category:          document.getElementById('initFCat').value,
    accountable:       document.getElementById('initFAcc').value.trim(),
    startDate:         document.getElementById('initFStart').value.trim(),
    deadline:          document.getElementById('initFDeadline').value.trim(),
    pct:               Math.min(100, Math.max(0, pctRaw)),
    milestoneTracking: parentId ? '' : document.getElementById('initFMsTrack').value.trim(),
    milestoneDeadline: parentId ? '' : document.getElementById('initFMsDl').value.trim(),
    status:            document.getElementById('initFStatus').value || (parentId ? 'Chưa bắt đầu' : 'Active'),
    kpiTarget:         parentId ? '' : document.getElementById('initFKpi').value.trim(),
    notes:             document.getElementById('initFNotes').value.trim(),
    docLink:           document.getElementById('initFDoc').value.trim(),
    parentId,
    type:              parentId ? 'milestone' : 'initiative',
  };

  _initCloseModal();

  if (origId) {
    // If ID changed, remove old then add new
    if (origId !== newId) {
      db.initiatives = db.initiatives.filter(x => x.id !== origId);
      syncInitiativeAdd(ini);
    } else {
      syncInitiativeEdit(ini);
    }
    toast('Đã cập nhật initiative!', 'success');
  } else {
    syncInitiativeAdd(ini);
    toast('Đã thêm initiative!', 'success');
  }
  renderInitiativeTracker();
}

async function _initDelete(id) {
  const linkedTasks = (db.tasks||[]).filter(t => t.initiative === id);
  const milestones  = (db.initiatives||[]).filter(i => i.parentId === id);
  let warning = `Xóa <strong>${id}</strong>?`;
  if (linkedTasks.length) warning += `<br><span style="color:var(--danger);">⚠️ ${linkedTasks.length} task đang liên kết sẽ không còn trỏ về initiative này.</span>`;
  if (milestones.length)  warning += `<br><span style="color:var(--warning,orange);">⚠️ ${milestones.length} milestone con sẽ bị xóa theo.</span>`;

  const ok = await uiConfirm('Xóa Initiative', warning, 'danger', 'Xóa');
  if (!ok) return;

  // Also delete child milestones
  const toDelete = [id, ...milestones.map(m => m.id)];
  toDelete.forEach(delId => { db.initiatives = db.initiatives.filter(x => x.id !== delId); });
  persist();
  writeInitiatives().catch(e => toast('⚠️ Xóa GG Sheets lỗi: ' + e.message, 'warning', 5000));

  toast('Đã xóa initiative.', 'success');
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

function _esc(s) {
  return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _initStatusIcon(status) {
  const s = (status||'').toLowerCase();
  if (s === 'done')    return '<i class="fa-solid fa-check-circle"></i>';
  if (s === 'blocked') return '<i class="fa-solid fa-ban"></i>';
  if (s === 'paused')  return '<i class="fa-solid fa-pause-circle"></i>';
  return '<i class="fa-solid fa-play-circle"></i>';
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
