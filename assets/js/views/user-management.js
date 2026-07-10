'use strict';

// ── User Management view (Admin only) ──

let _umUsers      = [];
let _umHeaders    = [];
let _umEditTarget = null;

// ── Filter / pagination state ──
let _umPage         = 1;
let _umSearch       = '';
let _umFilterTeam   = '';
let _umFilterRole   = '';
let _umFilterStatus = '';
let _umSort         = { key: 'Username', dir: 'asc' };

const UM_PAGE_SIZE = 15;

// ── Public entry point ──

async function renderUserManagement() {
  const wrap = document.getElementById('view-user-management');
  if (!wrap) return;

  wrap.innerHTML = `
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div style="font-size:17px;font-weight:800;">${t('page.user-management')}</div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary btn-sm" onclick="openUserModal(null)">
          <i class="fa-solid fa-user-plus"></i> ${t('um.btn.add')}
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="filter-group" style="min-width:150px;max-width:220px;">
        <div class="filter-label">${t('common.search')}</div>
        <input type="text" id="umSearch" class="form-control" oninput="umSearchChange()"
          placeholder="${t('um.filter.search-ph')}" style="font-size:12px;padding:7px 10px;">
      </div>
      <div class="filter-group">
        <div class="filter-label">Team</div>
        <select id="umFilterTeam" class="form-control" onchange="umFilterChange()" style="font-size:12px;padding:7px 10px;">
          <option value="">${t('common.all')}</option>
        </select>
      </div>
      <div class="filter-group">
        <div class="filter-label">Role</div>
        <select id="umFilterRole" class="form-control" onchange="umFilterChange()" style="font-size:12px;padding:7px 10px;">
          <option value="">${t('common.all')}</option>
          <option value="Admin">Admin</option>
          <option value="Teamlead">Teamlead</option>
          <option value="User">User</option>
        </select>
      </div>
      <div class="filter-group">
        <div class="filter-label">${t('um.col.status')}</div>
        <select id="umFilterStatus" class="form-control" onchange="umFilterChange()" style="font-size:12px;padding:7px 10px;">
          <option value="">${t('common.all')}</option>
          <option value="active">${t('um.status.active')}</option>
          <option value="inactive">${t('um.status.inactive')}</option>
        </select>
      </div>
      <div style="display:flex;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm" onclick="clearUmFilters()" title="Xóa bộ lọc">
          <i class="fa-solid fa-filter-circle-xmark"></i>
        </button>
      </div>
    </div>
    <div class="filter-chips" id="umFilterChips"></div>

    <!-- Table card -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap" id="umTableWrap" style="max-height:calc(100vh - 370px);overflow-y:auto;">
        <div style="padding:40px;text-align:center;color:var(--text-3);">
          <i class="fa-solid fa-spinner fa-spin" style="font-size:22px;"></i>
          <div style="margin-top:10px;">${t('um.loading')}</div>
        </div>
      </div>
      <div class="pagination" id="umPagination" style="padding:10px 20px;"></div>
    </div>`;

  if (_umUsers.length > 0) {
    _umPopulateFilters();
    _umRestoreFilterUi();
    _umRender();
  } else {
    await _umLoad();
  }
}

async function _umLoad() {
  try {
    const res = await gasPost({ action: 'user-list' });
    if (res.status !== 'ok') throw new Error(res.error || t('um.err.load'));
    _umHeaders = res.data.header;
    _umUsers   = res.data.rows.map(function(row) {
      const obj = {};
      _umHeaders.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });
    _umPopulateFilters();
    _umRender();
  } catch (e) {
    const wrap = document.getElementById('umTableWrap');
    if (wrap) wrap.innerHTML = `<div style="padding:24px;color:var(--danger);">
      <i class="fa-solid fa-triangle-exclamation"></i> ${esc(e.message)}
    </div>`;
  }
}

// ── Filter helpers ──

function _umIsActive(u) {
  return u.Active === true || String(u.Active).toLowerCase() === 'true';
}

function _umGetFiltered() {
  let users = _umUsers.slice();

  const q = _umSearch.trim().toLowerCase();
  if (q) {
    users = users.filter(function(u) {
      return (u.Username     || '').toLowerCase().includes(q) ||
             (u.Display_Name || '').toLowerCase().includes(q) ||
             (u.Email        || '').toLowerCase().includes(q);
    });
  }
  if (_umFilterTeam)   users = users.filter(function(u) { return u.Team === _umFilterTeam; });
  if (_umFilterRole)   users = users.filter(function(u) { return u.Role === _umFilterRole; });
  if (_umFilterStatus === 'active')   users = users.filter(_umIsActive);
  if (_umFilterStatus === 'inactive') users = users.filter(function(u) { return !_umIsActive(u); });

  users.sort(function(a, b) {
    const valA = String(a[_umSort.key] || '').toLowerCase();
    const valB = String(b[_umSort.key] || '').toLowerCase();
    if (valA < valB) return _umSort.dir === 'asc' ? -1 : 1;
    if (valA > valB) return _umSort.dir === 'asc' ?  1 : -1;
    return 0;
  });
  return users;
}

function _umPopulateFilters() {
  const sel = document.getElementById('umFilterTeam');
  if (!sel) return;
  const teams = [...new Set(_umUsers.map(function(u) { return u.Team; }).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">${t('common.all')}</option>` +
    teams.map(function(tk) { return `<option value="${esc(tk)}">${esc(tk)}</option>`; }).join('');
  if (teams.includes(_umFilterTeam)) sel.value = _umFilterTeam;
  _umFilterTeam = sel.value;
}

function _umRestoreFilterUi() {
  const s = document.getElementById('umSearch');
  if (s) s.value = _umSearch;
  const fr = document.getElementById('umFilterRole');
  if (fr) fr.value = _umFilterRole;
  const fs = document.getElementById('umFilterStatus');
  if (fs) fs.value = _umFilterStatus;
}

// ── Search / filter events ──

function umSearchChange() {
  _umSearch = (document.getElementById('umSearch') || {}).value || '';
  _umPage = 1;
  clearTimeout(window._umSearchTimer);
  window._umSearchTimer = setTimeout(function() { _umRender(); }, 150);
}

function umFilterChange() {
  _umFilterTeam   = (document.getElementById('umFilterTeam')   || {}).value || '';
  _umFilterRole   = (document.getElementById('umFilterRole')   || {}).value || '';
  _umFilterStatus = (document.getElementById('umFilterStatus') || {}).value || '';
  _umPage = 1;
  _umRender();
}

function clearUmFilter(id) {
  const el = document.getElementById(id);
  if (el) el.value = '';
  umFilterChange();
}

function clearUmFilters() {
  ['umSearch', 'umFilterTeam', 'umFilterRole', 'umFilterStatus'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  _umSearch = ''; _umFilterTeam = ''; _umFilterRole = ''; _umFilterStatus = '';
  _umPage = 1;
  _umRender();
}

// ── Sort ──

function umSortBy(key) {
  if (_umSort.key === key) _umSort.dir = _umSort.dir === 'asc' ? 'desc' : 'asc';
  else { _umSort.key = key; _umSort.dir = 'asc'; }
  _umPage = 1;
  _umRender();
}

// ── Filter chips ──

function _umRenderFilterChips() {
  const chips = [];
  const labels = {
    umSearch:       function(v) { return `${t('um.chip.search')}: "${v}"`; },
    umFilterTeam:   function(v) { return `Team: ${v}`; },
    umFilterRole:   function(v) { return `Role: ${v}`; },
    umFilterStatus: function(v) { return v === 'active' ? t('um.status.active') : t('um.status.inactive'); },
  };
  Object.entries(labels).forEach(function(entry) {
    const id = entry[0]; const label = entry[1];
    const el = document.getElementById(id);
    const v  = el ? el.value : '';
    if (v) chips.push(`<span class="chip">${label(v)}<span class="chip-x" onclick="clearUmFilter('${id}')">✕</span></span>`);
  });
  const el = document.getElementById('umFilterChips');
  if (el) el.innerHTML = chips.join('');
}

// ── Main render ──

function _umRender() {
  _umRenderFilterChips();
  const wrap = document.getElementById('umTableWrap');
  if (!wrap) return;

  const filtered   = _umGetFiltered();
  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / UM_PAGE_SIZE));
  if (_umPage > totalPages) _umPage = totalPages;
  const paged = filtered.slice((_umPage - 1) * UM_PAGE_SIZE, _umPage * UM_PAGE_SIZE);

  const roleTag = {
    Admin:    `<span class="um-badge um-badge-admin">Admin</span>`,
    Teamlead: `<span class="um-badge um-badge-teamlead">Teamlead</span>`,
    User:     `<span class="um-badge um-badge-user">User</span>`,
  };

  const sortIcon = function(key) {
    if (_umSort.key !== key) return `<i class="fa-solid fa-sort sort-icon" style="opacity:.3;margin-left:4px;font-size:10px;"></i>`;
    return _umSort.dir === 'asc'
      ? `<i class="fa-solid fa-sort-up sort-icon active" style="margin-left:4px;font-size:10px;color:var(--primary);"></i>`
      : `<i class="fa-solid fa-sort-down sort-icon active" style="margin-left:4px;font-size:10px;color:var(--primary);"></i>`;
  };

  const thStyle = 'cursor:pointer;user-select:none;white-space:nowrap;';

  if (!paged.length) {
    wrap.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-3);">
      <i class="fa-solid fa-inbox" style="font-size:24px;display:block;margin-bottom:8px;"></i>
      ${t('um.empty')}
    </div>`;
    _umRenderPagination(totalPages, total);
    return;
  }

  const rows = paged.map(function(u) {
    const isActive  = _umIsActive(u);
    const statusHtml = isActive
      ? `<span class="um-status active"><i class="fa-solid fa-circle-check"></i> ${t('um.status.active')}</span>`
      : `<span class="um-status inactive"><i class="fa-solid fa-circle-xmark"></i> ${t('um.status.inactive')}</span>`;
    const toggleLabel = isActive ? t('um.confirm.lock-title') : t('um.btn.unlock');
    const toggleIcon  = isActive ? 'fa-lock' : 'fa-lock-open';

    return `<tr>
      <td style="font-weight:600;font-family:var(--mono);">${esc(u.Username)}</td>
      <td>${esc(u.Display_Name)}</td>
      <td>${roleTag[u.Role] || esc(u.Role)}</td>
      <td>${esc(u.Team || '–')}</td>
      <td style="color:var(--text-2);">${esc(u.Email || '–')}</td>
      <td>${statusHtml}</td>
      <td style="white-space:nowrap;color:var(--text-2);">${_fmtDate(u.Created_At)}</td>
      <td style="white-space:nowrap;color:var(--text-2);">${_fmtDate(u.Last_Login)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-ghost btn-sm" title="Chỉnh sửa" onclick="openUserModal('${esc(u.Username)}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-ghost btn-sm" title="${t('um.modal.reset-pw-title')}" onclick="openResetPwModal('${esc(u.Username)}')">
            <i class="fa-solid fa-key"></i>
          </button>
          <button class="btn btn-ghost btn-sm" title="${toggleLabel}" onclick="handleToggleActive('${esc(u.Username)}',${isActive})">
            <i class="fa-solid ${toggleIcon}"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="kpi-table" style="width:100%;">
      <thead>
        <tr>
          <th style="${thStyle}" onclick="umSortBy('Username')">Username${sortIcon('Username')}</th>
          <th style="${thStyle}" onclick="umSortBy('Display_Name')">${t('um.col.display-name')}${sortIcon('Display_Name')}</th>
          <th style="${thStyle}" onclick="umSortBy('Role')">Role${sortIcon('Role')}</th>
          <th style="${thStyle}" onclick="umSortBy('Team')">Team${sortIcon('Team')}</th>
          <th>Email</th>
          <th style="${thStyle}" onclick="umSortBy('Active')">${t('um.col.status')}${sortIcon('Active')}</th>
          <th style="${thStyle}" onclick="umSortBy('Created_At')">${t('um.col.created')}${sortIcon('Created_At')}</th>
          <th style="${thStyle}" onclick="umSortBy('Last_Login')">${t('um.col.last-login')}${sortIcon('Last_Login')}</th>
          <th>${t('um.col.actions')}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  _umRenderPagination(totalPages, total);
}

function _umRenderPagination(totalPages, total) {
  const el = document.getElementById('umPagination');
  if (!el) return;

  const start = (_umPage - 1) * UM_PAGE_SIZE + 1;
  const end   = Math.min(_umPage * UM_PAGE_SIZE, total);
  const info  = total > 0 ? `<span class="page-info">${start}–${end} / ${total} ${t('um.pag.users')}</span>` : '';

  if (totalPages <= 1) {
    el.innerHTML = info;
    return;
  }

  let html = info + `<button class="page-btn" onclick="umGoPage(${_umPage - 1})" ${_umPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - _umPage) > 1) {
      if (p === 3 || p === totalPages - 2) html += `<span class="page-info">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${p === _umPage ? 'active' : ''}" onclick="umGoPage(${p})">${p}</button>`;
  }
  html += `<button class="page-btn" onclick="umGoPage(${_umPage + 1})" ${_umPage === totalPages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function umGoPage(p) {
  _umPage = p;
  _umRender();
  const wrap = document.getElementById('umTableWrap');
  if (wrap) wrap.scrollTop = 0;
}

function _fmtDate(val) {
  if (!val) return '–';
  try {
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch(_) { return String(val); }
}

// ── Add / Edit modal ──

function openUserModal(username) {
  _umEditTarget = username || null;
  const isEdit  = !!_umEditTarget;
  const user    = isEdit ? _umUsers.find(function(u) { return u.Username === username; }) : null;

  let overlay = document.getElementById('umUserOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'umUserOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  overlay.innerHTML = `
    <div class="modal" style="max-width:460px;">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fa-solid fa-${isEdit ? 'pen-to-square' : 'user-plus'}" style="margin-right:6px;"></i>
          ${t(isEdit ? 'um.modal.edit-title' : 'um.modal.add-title')}
        </div>
        <button class="icon-btn" onclick="_umCloseModal('umUserOverlay')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">

        <div class="form-group">
          <label class="form-label">Username <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="umUsername" type="text" placeholder="VD: NguyenVA1"
            value="${isEdit ? esc(user.Username) : ''}" ${isEdit ? 'readonly style="background:var(--hover);color:var(--text-3);"' : ''}>
        </div>

        <div class="form-group">
          <label class="form-label">${t('um.form.display-name')} <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="umDisplayName" type="text" placeholder="VD: Nguyễn Văn A"
            value="${isEdit ? esc(user.Display_Name) : ''}">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Role <span style="color:var(--danger)">*</span></label>
            <select class="form-control" id="umRole">
              <option value="User"     ${(!isEdit || user.Role==='User')     ? 'selected':''}>User</option>
              <option value="Teamlead" ${(isEdit && user.Role==='Teamlead')  ? 'selected':''}>Teamlead</option>
              <option value="Admin"    ${(isEdit && user.Role==='Admin')     ? 'selected':''}>Admin</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Team</label>
            <input class="form-control" id="umTeam" type="text" placeholder="VD: Số"
              value="${isEdit ? esc(user.Team || '') : ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" id="umEmail" type="email" placeholder="VD: user@example.com"
            value="${isEdit ? esc(user.Email || '') : ''}">
        </div>

        ${!isEdit ? `
        <div class="form-group">
          <label class="form-label">${t('um.form.password')} <span style="color:var(--danger)">*</span>
            <span style="font-weight:400;color:var(--text-3);">${t('um.form.pw-hint')}</span>
          </label>
          <input class="form-control" id="umPassword" type="password" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label">${t('um.form.confirm-pw')} <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="umPassword2" type="password" autocomplete="new-password">
        </div>` : ''}

        ${isEdit ? `
        <div class="form-group">
          <label class="form-label">${t('um.col.status')}</label>
          <select class="form-control" id="umActive">
            <option value="true"  ${(user.Active===true||String(user.Active).toLowerCase()==='true') ? 'selected':''}>${t('um.status.active')}</option>
            <option value="false" ${(user.Active===false||String(user.Active).toLowerCase()==='false') ? 'selected':''}>${t('um.status.inactive')}</option>
          </select>
        </div>` : ''}

        <div id="umUserError" style="display:none;color:var(--danger);font-size:13px;padding:8px 12px;background:var(--danger-bg);border-radius:8px;"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="_umCloseModal('umUserOverlay')">${t('common.cancel')}</button>
        <button class="btn btn-primary" id="umSaveBtn" onclick="handleSaveUser()">
          <i class="fa-solid fa-floppy-disk"></i> ${t(isEdit ? 'um.btn.save' : 'um.btn.create')}
        </button>
      </div>
    </div>`;

  setTimeout(function() {
    const first = isEdit
      ? document.getElementById('umDisplayName')
      : document.getElementById('umUsername');
    if (first) first.focus();
  }, 50);
}

async function handleSaveUser() {
  const isEdit = !!_umEditTarget;
  const errEl  = document.getElementById('umUserError');
  const btn    = document.getElementById('umSaveBtn');

  const setErr = function(msg) {
    errEl.textContent = msg;
    errEl.style.display = msg ? 'block' : 'none';
  };

  setErr('');

  const username    = isEdit ? _umEditTarget : (document.getElementById('umUsername')?.value || '').trim();
  const displayName = (document.getElementById('umDisplayName')?.value || '').trim();
  const role        = document.getElementById('umRole')?.value;
  const team        = (document.getElementById('umTeam')?.value || '').trim();
  const email       = (document.getElementById('umEmail')?.value || '').trim();

  if (!username)    { setErr(t('um.err.username-required')); return; }
  if (!displayName) { setErr(t('um.err.display-required')); return; }
  if (!role)        { setErr(t('um.err.role-required')); return; }

  let payload;

  if (!isEdit) {
    const pw  = document.getElementById('umPassword')?.value  || '';
    const pw2 = document.getElementById('umPassword2')?.value || '';
    if (!pw)           { setErr(t('um.err.pw-required')); return; }
    if (pw.length < 6) { setErr(t('um.err.pw-short')); return; }
    if (pw !== pw2)    { setErr(t('um.err.pw-mismatch')); return; }

    payload = { action: 'user-create', user: { username, displayName, role, team, email, password: pw, active: true } };
  } else {
    const activeVal = document.getElementById('umActive')?.value;
    const active    = activeVal === 'true';
    payload = { action: 'user-update', user: { username, displayName, role, team, email, active } };
  }

  btn.disabled  = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('um.saving')}`;

  try {
    const res = await gasPost(payload);
    if (res.status !== 'ok') throw new Error(res.error || t('um.err.unknown'));
    _umCloseModal('umUserOverlay');
    toast(t(isEdit ? 'um.toast.updated' : 'um.toast.created'), 'success');
    await _umLoad();
  } catch (e) {
    setErr(e.message);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${t(isEdit ? 'um.btn.save' : 'um.btn.create')}`;
  }
}

// ── Reset password modal ──

function openResetPwModal(username) {
  let overlay = document.getElementById('umResetPwOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'umResetPwOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  overlay.innerHTML = `
    <div class="modal" style="max-width:380px;">
      <div class="modal-header">
        <div class="modal-title"><i class="fa-solid fa-key" style="margin-right:6px;"></i>${t('um.modal.reset-pw-title')}</div>
        <button class="icon-btn" onclick="_umCloseModal('umResetPwOverlay')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">
        <div style="font-size:13px;color:var(--text-2);">
          ${t('um.modal.reset-pw-for')}<strong>${esc(username)}</strong>
        </div>
        <div class="form-group">
          <label class="form-label">${t('um.form.new-pw')} <span style="color:var(--danger)">*</span>
            <span style="font-weight:400;color:var(--text-3);">${t('um.form.pw-hint')}</span>
          </label>
          <input class="form-control" id="umRpNew" type="password" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label">${t('um.form.confirm-new-pw')} <span style="color:var(--danger)">*</span></label>
          <input class="form-control" id="umRpNew2" type="password" autocomplete="new-password">
        </div>
        <div id="umRpError" style="display:none;color:var(--danger);font-size:13px;padding:8px 12px;background:var(--danger-bg);border-radius:8px;"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="_umCloseModal('umResetPwOverlay')">${t('common.cancel')}</button>
        <button class="btn btn-primary" id="umRpBtn" onclick="handleResetPassword('${esc(username)}')">
          <i class="fa-solid fa-rotate-right"></i> ${t('um.btn.reset-pw')}
        </button>
      </div>
    </div>`;

  setTimeout(function() { document.getElementById('umRpNew')?.focus(); }, 50);
}

async function handleResetPassword(username) {
  const errEl  = document.getElementById('umRpError');
  const btn    = document.getElementById('umRpBtn');
  const setErr = function(msg) { errEl.textContent = msg; errEl.style.display = msg ? 'block' : 'none'; };

  setErr('');
  const pw  = document.getElementById('umRpNew')?.value  || '';
  const pw2 = document.getElementById('umRpNew2')?.value || '';

  if (!pw)           { setErr(t('um.err.new-pw-required')); return; }
  if (pw.length < 6) { setErr(t('um.err.new-pw-short')); return; }
  if (pw !== pw2)    { setErr(t('um.err.pw-mismatch')); return; }

  btn.disabled  = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t('um.saving')}`;

  try {
    const res = await gasPost({ action: 'user-reset-password', username, newPassword: pw });
    if (res.status !== 'ok') throw new Error(res.error || t('um.err.unknown'));
    _umCloseModal('umResetPwOverlay');
    toast(t('um.toast.reset-pw-prefix') + username, 'success');
  } catch (e) {
    setErr(e.message);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> ${t('um.btn.reset-pw')}`;
  }
}

// ── Toggle active ──

async function handleToggleActive(username, currentActive) {
  const ok = await uiConfirm(
    t(currentActive ? 'um.confirm.lock-title' : 'um.confirm.unlock-title'),
    `${t(currentActive ? 'um.confirm.lock-body' : 'um.confirm.unlock-body')} <strong>${esc(username)}</strong>?`,
    currentActive ? 'warn' : 'info',
    t(currentActive ? 'um.btn.lock' : 'um.btn.unlock')
  );
  if (!ok) return;

  try {
    const res = await gasPost({ action: 'user-update', user: { username, active: !currentActive } });
    if (res.status !== 'ok') throw new Error(res.error || t('um.err.unknown'));
    toast(t(currentActive ? 'um.toast.locked' : 'um.toast.unlocked') + ' ' + username + '.', 'success');
    await _umLoad();
  } catch (e) {
    toast('❌ ' + e.message, 'error');
  }
}

// ── Helpers ──

function _umCloseModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
