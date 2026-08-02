'use strict';

/* ── Notification bell (topbar 🔔) ──
   Nguồn dữ liệu: dbNotifs (từ readNotifications()). Mỗi noti = {id, type,
   entityType, entityId, title, dueDate, message, createdTs, read}.
   Click 1 noti → mark-read + mở popup công việc tương ứng (deep-link). */

// Deep-link: entityType → hàm mở popup xem nhanh (đã có sẵn ở các view).
const _NOTIF_OPENERS = {
  task:       id => (typeof openTaskViewPopup === 'function') && openTaskViewPopup(id),
  case:       id => (typeof openCaseViewPopup === 'function') && openCaseViewPopup(id),
  issue:      id => (typeof openIssueViewPopup === 'function') && openIssueViewPopup(id),
  initiative: id => (typeof openInitViewPopup === 'function') && openInitViewPopup(id),
  milestone:  id => (typeof openInitViewPopup === 'function') && openInitViewPopup(id),
  dev:        id => (typeof openDevViewPopup === 'function') && openDevViewPopup(id),
};

// type → nhóm hiển thị + icon.
const _NOTIF_TYPE_META = {
  'overdue':   { grp: 'overdue', icon: '⚠️', suf: 'notif.suf.overdue' },
  'due-today': { grp: 'today',   icon: '🔥', suf: 'notif.suf.due-today' },
  'due-1d':    { grp: 'soon',    icon: '⏰', suf: 'notif.suf.due-1d' },
  'due-3d':    { grp: 'soon',    icon: '⏰', suf: 'notif.suf.due-3d' },
  'created':   { grp: 'created', icon: '🆕', suf: 'notif.suf.created' },
  'closed':    { grp: 'closed',  icon: '✅', suf: 'notif.suf.closed' },
};

const _NOTIF_GROUPS = [
  { key: 'overdue', i18n: 'notif.group.overdue' },
  { key: 'today',   i18n: 'notif.group.today' },
  { key: 'soon',    i18n: 'notif.group.soon' },
  { key: 'created', i18n: 'notif.group.created' },
  { key: 'closed',  i18n: 'notif.group.closed' },
];

const _NOTIF_ENTITY_LABEL = {
  task: 'Task', case: 'Case', issue: 'Issue',
  initiative: 'Initiative', milestone: 'Milestone', dev: 'Dev Plan',
};

function _notifUnreadCount() {
  return (dbNotifs || []).filter(n => !n.read).length;
}

/** Cập nhật badge số chưa đọc; nếu panel đang mở thì render lại danh sách. */
function renderNotifBell() {
  const badge = document.getElementById('notifBadge');
  if (badge) {
    const n = _notifUnreadCount();
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = n > 0 ? 'flex' : 'none';
  }
  const btn = document.getElementById('notifBtn');
  if (btn) btn.classList.toggle('has-unread', _notifUnreadCount() > 0);

  const panel = document.getElementById('notifPanel');
  if (panel && panel.style.display !== 'none') _notifBuildList();

  // Đóng panel khi click ra ngoài — gắn 1 lần.
  if (!window._notifClickBound) {
    document.addEventListener('click', _notifDocClick, true);
    window._notifClickBound = true;
  }
}

function _notifDocClick(e) {
  const panel = document.getElementById('notifPanel');
  if (!panel || panel.style.display === 'none') return;
  const wrap = e.target.closest && e.target.closest('.notif-wrap');
  if (!wrap) closeNotifPanel();
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    _notifBuildList();
    panel.style.display = 'flex';
    readNotifications(); // refresh khi mở
  } else {
    closeNotifPanel();
  }
}

function closeNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.style.display = 'none';
}

function _notifItemText(n) {
  const meta = _NOTIF_TYPE_META[n.type] || { icon: '•', suf: '' };
  const lbl = _NOTIF_ENTITY_LABEL[n.entityType] || n.entityType || '';
  const suf = meta.suf ? t(meta.suf) : '';
  const due = (n.dueDate && (n.type.startsWith('due') || n.type === 'overdue'))
    ? ` · ${esc(n.dueDate)}` : '';
  return `${meta.icon} <span class="notif-ent">[${esc(lbl)}]</span> `
       + `<span class="notif-item-title">${esc(n.title || n.entityId)}</span>`
       + `<span class="notif-item-suf"> — ${esc(suf)}${due}</span>`;
}

function _notifBuildList() {
  const body = document.getElementById('notifPanelBody');
  if (!body) return;

  const list = (dbNotifs || []).slice();
  if (!list.length) {
    body.innerHTML = `<div class="notif-empty">${esc(t('notif.empty'))}</div>`;
    return;
  }

  // Gom theo nhóm.
  const grouped = {};
  list.forEach(n => {
    const meta = _NOTIF_TYPE_META[n.type];
    const g = meta ? meta.grp : 'soon';
    (grouped[g] || (grouped[g] = [])).push(n);
  });

  let html = '';
  _NOTIF_GROUPS.forEach(grp => {
    const items = grouped[grp.key];
    if (!items || !items.length) return;
    html += `<div class="notif-group-title">${esc(t(grp.i18n))} <span>(${items.length})</span></div>`;
    items.forEach(n => {
      html += `<div class="notif-item${n.read ? '' : ' unread'}" onclick="notifOpenItem('${esc(String(n.id))}')">`
            + `<div class="notif-item-line">${_notifItemText(n)}</div>`
            + `</div>`;
    });
  });

  body.innerHTML = html || `<div class="notif-empty">${esc(t('notif.empty'))}</div>`;
}

/** Click 1 noti: mark-read + deep-link mở popup công việc. */
function notifOpenItem(id) {
  const n = (dbNotifs || []).find(x => String(x.id) === String(id));
  closeNotifPanel();
  if (n && !n.read) markNotifRead([n.id], false);
  if (!n) return;
  const opener = _NOTIF_OPENERS[n.entityType];
  if (opener) {
    try { opener(n.entityId); }
    catch(e) { console.warn('notifOpenItem opener error:', e.message); }
  }
}

function notifMarkAllRead() {
  markNotifRead(null, true);
}
