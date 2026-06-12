/* ===== BLD APPROVAL QUEUE VIEW ===== */

let _bldCurrentAction = null; // { type: 'approve'|'reject'|'info', taskId: string }
let _bldFilterTeam = '';
let _bldFilterInit = '';

/* ─── Main render ─── */
function renderBldQueue() {
  _bldPopulateFilters();
  const pending = _bldGetPending();
  const history = _bldGetHistory();
  _bldRenderPending(pending);
  _bldRenderHistory(history);

  // Count chip
  const chip = document.getElementById('bldCountChip');
  if (chip) {
    chip.textContent = pending.length
      ? `${pending.length} chờ phê duyệt`
      : 'Không có mục nào';
    chip.classList.toggle('none', pending.length === 0);
  }

  // Timestamp
  const ts = document.getElementById('bldTimestamp');
  if (ts) ts.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString('vi-VN');
}

/* ─── Data helpers ─── */
function _bldGetPending() {
  return (db.tasks || [])
    .filter(t => t.canBLD === 'Y')
    .filter(t => !_bldFilterTeam || t.team === _bldFilterTeam)
    .filter(t => !_bldFilterInit || t.initiative === _bldFilterInit)
    .sort((a, b) => {
      // Red first, then overdue
      const ragOrder = { Red: 0, Amber: 1, Green: 2 };
      const ra = ragOrder[a.status] ?? 3;
      const rb = ragOrder[b.status] ?? 3;
      if (ra !== rb) return ra - rb;
      const aOver = isOverdue(a.endDate, a.progress) ? 0 : 1;
      const bOver = isOverdue(b.endDate, b.progress) ? 0 : 1;
      return aOver - bOver;
    });
}

/* Nguồn chứa marker quyết định của BLĐ:
   - Mới: trường riêng yKienBLD (cột "Ý kiến BLĐ" trên Sheet)
   - Cũ (legacy): marker từng được prepend vào noiDungBLD */
function _bldOpinionSrc(t) {
  const yk = (t.yKienBLD || '').trim();
  return yk || (t.noiDungBLD || '').trim();
}

function _bldGetHistory() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const markerRe = /^\[(✅|❌|❓) BLĐ .+ (\d{2}\/\d{2}\/\d{4})/;
  return (db.tasks || [])
    .filter(t => t.canBLD !== 'Y' && markerRe.test(_bldOpinionSrc(t)))
    .filter(t => {
      const m = markerRe.exec(_bldOpinionSrc(t));
      if (!m) return false;
      const [d, mo, y] = m[2].split('/').map(Number);
      const dt = new Date(y, mo - 1, d);
      return dt.getTime() >= cutoff;
    })
    .sort((a, b) => {
      const m = markerRe.exec(_bldOpinionSrc(b));
      const n = markerRe.exec(_bldOpinionSrc(a));
      if (!m || !n) return 0;
      const parseDate = s => { const [d, mo, y] = s.split('/').map(Number); return new Date(y, mo - 1, d); };
      return parseDate(m[2]) - parseDate(n[2]);
    })
    .slice(0, 20);
}

/* ─── Filter dropdowns ─── */
function _bldPopulateFilters() {
  const pending = (db.tasks || []).filter(t => t.canBLD === 'Y');

  const teams = [...new Set(pending.map(t => t.team).filter(Boolean))].sort();
  const inits = [...new Set(pending.map(t => t.initiative).filter(Boolean))].sort();

  const teamSel = document.getElementById('bldFilterTeam');
  const initSel = document.getElementById('bldFilterInit');

  if (teamSel) {
    const prev = teamSel.value;
    teamSel.innerHTML = '<option value="">Tất cả đội</option>' +
      teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    teamSel.value = teams.includes(prev) ? prev : '';
    _bldFilterTeam = teamSel.value;
  }
  if (initSel) {
    const prev = initSel.value;
    initSel.innerHTML = '<option value="">Tất cả sáng kiến</option>' +
      inits.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('');
    initSel.value = inits.includes(prev) ? prev : '';
    _bldFilterInit = initSel.value;
  }
}

/* ─── Render pending list ─── */
function _bldRenderPending(items) {
  const el = document.getElementById('bldPendingList');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = `<div class="bld-empty-state">
      <div class="bld-empty-icon"><i class="fa-solid fa-circle-check"></i></div>
      <div class="bld-empty-title">Không có mục chờ phê duyệt</div>
      <div class="bld-empty-sub">Tất cả yêu cầu đã được xử lý hoặc chưa có mục nào.</div>
    </div>`;
    return;
  }
  el.innerHTML = items.map(t => _bldBuildItemHTML(t)).join('');
}

function _bldBuildItemHTML(t) {
  const overdue = isOverdue(t.endDate, t.progress);
  const dueCls = overdue ? ' overdue' : '';
  const dueIcon = overdue ? 'fa-circle-exclamation' : 'fa-calendar';
  const dueText = t.endDate ? fmtDate(t.endDate) : '—';

  const ragIcon = { Red: '🔴', Amber: '🟡', Green: '🟢' }[t.status] || '⚪';

  const textPreview = (t.noiDungBLD || '').trim() || '<em style="color:var(--text-3)">Không có nội dung</em>';
  const opinion = (t.yKienBLD || '').trim();

  return `<div class="bld-item" id="bldItem-${esc(t.id)}">
    <div class="bld-item-header">
      <div class="bld-item-name" title="${esc(t.name)}">${esc(t.name)}</div>
      ${t.team ? `<span class="bld-team-pill">${esc(t.team)}</span>` : ''}
      ${ragBadge(t.status)}
    </div>
    <div class="bld-item-meta">
      <span class="bld-meta-chip${dueCls}"><i class="fa-solid ${dueIcon}"></i>${dueText}</span>
      ${t.picRes ? `<span class="bld-meta-chip"><i class="fa-solid fa-user"></i>${esc(t.picRes)}</span>` : ''}
      ${t.initiative ? `<span class="bld-meta-chip"><i class="fa-solid fa-diagram-project"></i>${esc(t.initiative)}</span>` : ''}
      ${t.progress != null ? `<span class="bld-meta-chip"><i class="fa-solid fa-percent"></i>${t.progress}%</span>` : ''}
    </div>
    <div class="bld-item-body">
      <div class="bld-body-label"><i class="fa-solid fa-message"></i>Nội dung cần BLĐ quyết</div>
      <div class="bld-body-text">${textPreview}</div>
    </div>
    ${opinion ? `<div class="bld-item-opinion">
      <div class="bld-opinion-label"><i class="fa-solid fa-comment-dots"></i>Ý kiến Ban lãnh đạo</div>
      <div class="bld-body-text">${esc(opinion)}</div>
    </div>` : ''}
    <div class="bld-item-actions">
      <button class="btn btn-sm btn-success" onclick="bldOpenAction('approve','${esc(t.id)}')">
        <i class="fa-solid fa-check"></i> Phê duyệt
      </button>
      <button class="btn btn-sm btn-danger" onclick="bldOpenAction('reject','${esc(t.id)}')">
        <i class="fa-solid fa-xmark"></i> Từ chối
      </button>
      <button class="btn btn-sm btn-secondary" onclick="bldOpenAction('info','${esc(t.id)}')">
        <i class="fa-solid fa-circle-question"></i> Yêu cầu bổ sung
      </button>
      <button class="bld-ghost-link" onclick="editTask('${esc(t.id)}')">
        <i class="fa-solid fa-pen-to-square"></i> Xem đầy đủ
      </button>
    </div>
  </div>`;
}

/* ─── Render history ─── */
function _bldRenderHistory(items) {
  const wrap = document.getElementById('bldHistoryWrap');
  const list = document.getElementById('bldHistoryList');
  if (!wrap || !list) return;
  if (!items.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  const iconMap = { '✅': '✅', '❌': '❌', '❓': '❓' };
  const markerRe = /^\[(✅|❌|❓) BLĐ (.+?) (\d{2}\/\d{2}\/\d{4})(?:\s*[—–-]\s*(.+?))?\]/;

  list.innerHTML = items.map(t => {
    const m = markerRe.exec(_bldOpinionSrc(t));
    const icon = m ? iconMap[m[1]] || '📋' : '📋';
    const note = m && m[4] ? m[4].trim() : '';
    const date = m ? m[3] : '';
    return `<div class="bld-history-item">
      <div class="bld-history-icon">${icon}</div>
      <div class="bld-history-body">
        <div class="bld-history-name">${esc(t.name)}</div>
        ${note ? `<div class="bld-history-note">${esc(note)}</div>` : ''}
      </div>
      <div class="bld-history-date">${date}</div>
    </div>`;
  }).join('');
}

/* ─── Mini action modal ─── */
function bldOpenAction(type, taskId) {
  const task = (db.tasks || []).find(t => t.id === taskId);
  if (!task) return;
  _bldCurrentAction = { type, taskId };

  const overlay = document.getElementById('bldActionOverlay');
  if (!overlay) return;

  const cfg = {
    approve: {
      title: 'Phê duyệt yêu cầu',
      sub: 'Xác nhận phê duyệt và ghi chú (tùy chọn)',
      label: 'Ghi chú phê duyệt (tùy chọn)',
      confirm: 'Xác nhận phê duyệt',
      cls: 'btn-success',
      req: false
    },
    reject: {
      title: 'Từ chối yêu cầu',
      sub: 'Nêu lý do từ chối để đội nhóm cập nhật',
      label: 'Lý do từ chối *',
      confirm: 'Xác nhận từ chối',
      cls: 'btn-danger',
      req: true
    },
    info: {
      title: 'Yêu cầu bổ sung thông tin',
      sub: 'Đặt câu hỏi / yêu cầu thêm nội dung',
      label: 'Nội dung cần bổ sung *',
      confirm: 'Gửi yêu cầu',
      cls: 'btn-secondary',
      req: true
    }
  }[type];

  if (!cfg) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('bldMiniTitle', cfg.title);
  set('bldMiniSubtitle', cfg.sub);
  set('bldMiniTaskName', task.name);
  set('bldMiniTaskId', task.id);

  const lbl = document.getElementById('bldMiniLabel');
  if (lbl) lbl.textContent = cfg.label;

  const ta = document.getElementById('bldMiniTextarea');
  if (ta) { ta.value = ''; ta.classList.remove('error'); }

  const err = document.getElementById('bldMiniError');
  if (err) { err.textContent = ''; err.classList.remove('visible'); }

  const btn = document.getElementById('bldMiniConfirmBtn');
  // Reset disabled — nút có thể còn bị khóa từ lần submit trước (bug: duyệt 1 mục xong, mục sau không bấm được)
  if (btn) { btn.disabled = false; btn.textContent = cfg.confirm; btn.className = `btn ${cfg.cls}`; }

  overlay.style.display = 'flex';
  if (ta) setTimeout(() => ta.focus(), 60);
}

function bldCloseMiniModal() {
  const overlay = document.getElementById('bldActionOverlay');
  if (overlay) overlay.style.display = 'none';
  _bldCurrentAction = null;
}

async function bldSubmitAction() {
  if (!_bldCurrentAction) return;
  const { type, taskId } = _bldCurrentAction;

  const ta = document.getElementById('bldMiniTextarea');
  const err = document.getElementById('bldMiniError');
  const note = ta ? ta.value.trim() : '';

  const needsNote = type === 'reject' || type === 'info';
  if (needsNote && !note) {
    if (ta) ta.classList.add('error');
    if (err) { err.textContent = 'Vui lòng nhập nội dung'; err.classList.add('visible'); }
    return;
  }
  if (ta) ta.classList.remove('error');
  if (err) err.classList.remove('visible');

  const btn = document.getElementById('bldMiniConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu…'; }

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;

  const markerMap = {
    approve: '✅',
    reject: '❌',
    info: '❓'
  };
  const actionLabel = { approve: 'BLĐ duyệt', reject: 'BLĐ từ chối', info: 'BLĐ yêu cầu bổ sung' }[type];
  const marker = note
    ? `[${markerMap[type]} ${actionLabel} ${dateStr} — ${note}]`
    : `[${markerMap[type]} ${actionLabel} ${dateStr}]`;

  try {
    const success = await syncAction(() => {
      const t = db.tasks.find(r => r.id === taskId);
      if (!t) return;
      // Ý kiến BLĐ lưu vào trường riêng yKienBLD — không ghi đè nội dung xin ý kiến của team
      const prev = (t.yKienBLD || '').trim();
      t.yKienBLD = prev ? `${marker}\n${prev}` : marker;
      if (type !== 'info') {
        t.canBLD = 'N';
      }
      // type === 'info' keeps canBLD = 'Y' (stays in queue)
    });

    if (!success) {
      if (btn) { btn.disabled = false; btn.textContent = 'Thử lại'; }
      return;
    }

    if (btn) btn.disabled = false;
    bldCloseMiniModal();
    toast(
      type === 'approve' ? 'Đã phê duyệt thành công' :
      type === 'reject'  ? 'Đã ghi nhận từ chối'     :
                           'Đã gửi yêu cầu bổ sung',
      type === 'approve' ? 'success' : type === 'reject' ? 'error' : 'info'
    );
    renderBldQueue();
    if (typeof updateNavBadges === 'function') updateNavBadges();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Thử lại'; }
    toast('Lỗi khi lưu: ' + (e.message || e), 'error');
  }
}
