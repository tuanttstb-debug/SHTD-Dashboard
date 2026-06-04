/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        SHTD Dashboard – Patch v6.2 (CUMULATIVE)                  ║
 * ║        File: SHTD_patch_v6.2.js                                  ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  [v6.1] FIX 1: syncAction() – Read-Then-Patch (multi-user safe)  ║
 * ║  [v6.1] FIX 2: .qv-fab bottom – không che pagination             ║
 * ║  [v6.2] FIX 3: Block duplicate ID khi ADD task mới               ║
 * ║  [v6.2] FIX 4: Export ngày sang định dạng dd-mmm-yy              ║
 * ║  [v6.2] FIX 5: Export % hoàn thành dạng "75%"                   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  CÁCH TEST NHANH (không sửa file gốc):                           ║
 * ║    1. Mở dashboard.html trong trình duyệt                        ║
 * ║    2. F12 → Console → Paste toàn bộ file này → Enter            ║
 * ║    3. Tất cả 5 fix có hiệu lực ngay trong session                ║
 * ║                                                                   ║
 * ║  MERGE VÀO dashboard.html: Xem hướng dẫn cuối file              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════
// [v6.1] FIX 1: syncAction – Read-Then-Patch
// ─────────────────────────────────────────────────────────────────
// CHANGELOG: Giữ nguyên từ patch v6.1 (xem chi tiết ở file trước)
// ═══════════════════════════════════════════════════════════════════
async function syncAction(action) {
  showLoading('Đang đồng bộ Google Sheets…');
  document.getElementById('syncDot').className = 'status-dot syncing';

  const idsBefore = new Set(db.tasks.map(t => t.id));

  try {
    if (typeof action === 'function') action();
    const localTasksAfter = db.tasks;

    let serverTasks = null;
    if (GS_WEBAPP_URL) {
      try {
        showLoading('Đang đọc dữ liệu mới nhất từ Sheet…');
        const readRes = await fetch(GS_WEBAPP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'read' }),
        });
        if (readRes.ok) {
          const readJson = await readRes.json();
          if (readJson.status === 'ok' && readJson.values) {
            const tempDb = { tasks: [], initiatives: [] };
            const mainDb = db;
            db = tempDb;
            _parseArrayIntoDb(readJson.values);
            serverTasks = tempDb.tasks;
            db = mainDb;
          }
        }
      } catch (readErr) {
        console.warn('[syncAction] Fallback full-write:', readErr.message);
      }
    }

    let finalTasks;
    if (serverTasks !== null) {
      const localMap  = new Map(localTasksAfter.map(t => [t.id, t]));
      const serverMap = new Map(serverTasks.map(t => [t.id, t]));
      const deletedIds = new Set([...idsBefore].filter(id => !localMap.has(id)));
      const merged = [];
      serverMap.forEach((serverTask, id) => {
        if (deletedIds.has(id)) return;
        merged.push(localMap.has(id) ? localMap.get(id) : serverTask);
      });
      localMap.forEach((localTask, id) => {
        if (!serverMap.has(id) && !deletedIds.has(id)) merged.push(localTask);
      });
      if (merged.length === 0 && serverTasks.length > 0) {
        const ok = await uiConfirm(
          '⚠️ Cảnh báo mất dữ liệu',
          `Thao tác này sẽ xóa toàn bộ <strong>${serverTasks.length} task</strong> trên Google Sheets. Bạn có chắc chắn?`,
          'danger', 'Xóa tất cả'
        );
        if (!ok) {
          db.tasks = serverTasks;
          const iMap = new Map();
          db.tasks.forEach(t => { if (t.initiative && !iMap.has(t.initiative)) iMap.set(t.initiative, t.initiative); });
          db.initiatives = [...iMap.entries()].map(([id]) => ({ id, name: id }));
          persist(); renderAll();
          toast('Đã hủy thao tác.', 'info');
          hideLoading();
          document.getElementById('syncDot').className = 'status-dot connected';
          return false;
        }
      }
      finalTasks = merged;
    } else {
      if (db.tasks.length === 0) throw new Error('BLOCKED: Từ chối ghi dữ liệu rỗng lên Sheet (0 task).');
      finalTasks = db.tasks;
    }

    showLoading('Đang ghi dữ liệu lên Sheet…');
    const writePayload = [DB_COLS, ...finalTasks.map(taskToRow)];
    const writeRes = await fetch(GS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'write', values: writePayload }),
    });
    if (!writeRes.ok) throw new Error('Apps Script lỗi HTTP: ' + writeRes.status);
    const writeJson = await writeRes.json();
    if (writeJson.status !== 'ok') throw new Error('Lỗi ghi: ' + (writeJson.error || 'unknown'));

    db.tasks = finalTasks;
    const iMap = new Map();
    db.tasks.forEach(t => { if (t.initiative && !iMap.has(t.initiative)) iMap.set(t.initiative, t.initiative); });
    db.initiatives = [...iMap.entries()].map(([id]) => ({ id, name: id }));
    persist(); renderAll();
    document.getElementById('syncDot').className = 'status-dot connected';
    return true;

  } catch(e) {
    try {
      const cached = localStorage.getItem('shtd_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.tasks) { db.tasks = parsed.tasks; db.initiatives = parsed.initiatives || []; }
      }
    } catch (_) {}
    renderAll();
    console.error('[syncAction] Error:', e);
    toast('❌ Lỗi đồng bộ: ' + e.message + ' — Dữ liệu local đã được khôi phục.', 'error', 8000);
    document.getElementById('syncDot').className = 'status-dot';
    return false;
  } finally {
    hideLoading();
  }
}

// ═══════════════════════════════════════════════════════════════════
// [v6.1] FIX 2: FAB position – không che pagination
// ═══════════════════════════════════════════════════════════════════
(function patchFabPosition() {
  let patched = false;
  for (const sheet of document.styleSheets) {
    try {
      for (let i = 0; i < sheet.cssRules.length; i++) {
        const rule = sheet.cssRules[i];
        if (rule.selectorText === '.qv-fab') {
          rule.style.bottom = '80px';
          rule.style.right = '28px';
          rule.style.pointerEvents = 'none';
          patched = true;
        }
        // Patch media query cho mobile
        if (rule.media && rule.cssRules) {
          for (let j = 0; j < rule.cssRules.length; j++) {
            const inner = rule.cssRules[j];
            if (inner.selectorText === '.qv-fab') {
              inner.style.bottom = '76px';
              inner.style.right = '16px';
            }
          }
        }
      }
    } catch(_) {}
  }
  if (!patched) {
    const style = document.createElement('style');
    style.id = 'shtd-patch-fab';
    style.textContent = `
      .qv-fab { bottom:80px!important; right:28px!important; pointer-events:none!important; }
      .qv-fab > * { pointer-events:auto!important; }
      @media(max-width:768px){ .qv-fab { bottom:76px!important; right:16px!important; } }
    `;
    document.head.appendChild(style);
  }
})();

// ═══════════════════════════════════════════════════════════════════
// [v6.2] FIX 3: handleSubmit – Block duplicate ID khi ADD task mới
// ─────────────────────────────────────────────────────────────────
// ROOT CAUSE:
//   handleSubmit() cũ hỏi "ghi đè?" khi ID trùng → cho phép 2 người
//   cùng lúc thêm task trùng mã → last-write-wins, mất dữ liệu người kia.
//
// FIX:
//   1. Phân biệt rõ 2 mode:
//      - ADD (origId rỗng)  → ID trùng = BLOCK hoàn toàn, hiện modal
//        hướng dẫn user đi vào edit task đó, KHÔNG cho lưu
//      - EDIT (origId có giá trị) → nếu ID bị đổi sang ID đã tồn tại
//        thì cũng BLOCK (không cho đổi ID thành ID người khác)
//   2. Trước khi ghi, đọc server để kiểm tra xem ID đã tồn tại chưa
//      (chống race condition: 2 người cùng mở form ADD cùng lúc)
// ═══════════════════════════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();

  const newId  = document.getElementById('fId').value.trim();
  const origId = document.getElementById('origId').value; // rỗng = ADD, có giá trị = EDIT
  const isAdd  = !origId;

  // ── Validate progress ──
  const prog = parseInt(document.getElementById('fProg').value) || 0;
  if (prog > 100) { toast('Tiến độ không được vượt quá 100%!', 'error'); return; }

  // ── [FIX 3] Kiểm tra duplicate ID ──
  // Khi ADD: không cho tồn tại dù trong local hay server
  // Khi EDIT: không cho đổi ID sang ID đã tồn tại của task khác
  const localDup = isAdd
    ? db.tasks.some(t => t.id.trim().toLowerCase() === newId.toLowerCase())
    : db.tasks.some(t => t.id.trim().toLowerCase() === newId.toLowerCase() && t.id !== origId);

  if (localDup) {
    // Tìm task trùng để hiển thị thông tin cho user
    const dupTask = db.tasks.find(t => t.id.trim().toLowerCase() === newId.toLowerCase());
    if (isAdd) {
      // Block hoàn toàn: hướng dẫn đi vào edit task đó
      await _showDuplicateIdBlocker(newId, dupTask);
    } else {
      // EDIT đổi sang ID trùng: cũng block
      await uiConfirm(
        'ID đã tồn tại',
        `Mã <strong>${newId}</strong> đã thuộc task khác:<br>
         <em style="color:var(--text-2);">${dupTask?.name || ''}</em><br><br>
         Không thể đổi ID sang mã đã tồn tại.`,
        'danger', 'Đã hiểu'
      );
    }
    return; // KHÔNG cho lưu trong cả 2 trường hợp
  }

  // ── [FIX 3] Server-side check trước khi ghi (chống race condition) ──
  // Chỉ check khi ADD mới và có kết nối Sheet
  if (isAdd && GS_WEBAPP_URL) {
    showLoading('Đang kiểm tra ID trên Server…');
    try {
      const checkRes = await fetch(GS_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'read' }),
      });
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        if (checkJson.status === 'ok' && checkJson.values && checkJson.values.length > 1) {
          // Đọc cột ID (cột đầu tiên, index 0) từ server
          const serverIds = checkJson.values
            .slice(1)                           // bỏ header row
            .map(row => (row[0] || '').toString().trim().toLowerCase())
            .filter(Boolean);
          const serverDup = serverIds.includes(newId.toLowerCase());
          if (serverDup) {
            hideLoading();
            // Parse để lấy thông tin task trùng từ server (hiển thị cho user)
            const tempDb = { tasks: [], initiatives: [] };
            const mainDb = db;
            db = tempDb;
            _parseArrayIntoDb(checkJson.values);
            const serverDupTask = tempDb.tasks.find(t => t.id.trim().toLowerCase() === newId.toLowerCase());
            db = mainDb;
            // Cập nhật local cache với data server mới nhất để tránh lag
            if (serverDupTask && !db.tasks.some(t => t.id === serverDupTask.id)) {
              db.tasks.push(serverDupTask);
              persist();
            }
            await _showDuplicateIdBlocker(newId, serverDupTask || { id: newId, name: '(Task đã tồn tại trên server)' });
            return;
          }
        }
      }
    } catch (checkErr) {
      console.warn('[handleSubmit] Server ID check failed, proceed with local check only:', checkErr.message);
    } finally {
      hideLoading();
    }
  }

  // ── Build task object ──
  const task = {
    id:          newId,
    tuanBC:      document.getElementById('fTuanBC').value.trim(),
    initiative:  document.getElementById('fInit').value,
    category:    document.getElementById('fCat').value,
    type:        document.getElementById('fType').value,
    name:        document.getElementById('fName').value,
    milestone:   document.getElementById('fMs').value,
    team:        document.getElementById('fTeam').value,
    teamPhoiHop: document.getElementById('fTeamPh').value,
    picAcc:      document.getElementById('fPicAcc').value,
    picRes:      picNorm(document.getElementById('fPicRes').value),
    picSupport:  document.getElementById('fPicSup').value.trim(),
    startDate:   document.getElementById('fStart').value,
    endDate:     document.getElementById('fEnd').value,
    progress:    prog,
    state:       document.getElementById('fState').value,
    status:      document.getElementById('fRag').value,
    crossTeam:   document.getElementById('fCross').value,
    highlight:   document.getElementById('fHl').value,
    result:      document.getElementById('fResult').value,
    nextPlan:    document.getElementById('fNext').value,
    vuongMac:    document.getElementById('fIssue').value,
    canBLD:      document.getElementById('fBLD').value,
    noiDungBLD:  document.getElementById('fBLDTxt').value,
  };

  // ── Confirm lưu ──
  const ok = await uiConfirm(
    isAdd ? 'Xác nhận thêm Task mới' : 'Xác nhận cập nhật Task',
    `<strong>${task.id}</strong> – ${task.name}<br>
     <small style="color:var(--text-3);">Deadline: ${fmtDate(task.endDate)} · PIC: ${task.picRes} · ${task.state}</small>`,
    'info', isAdd ? 'Thêm Task' : 'Lưu thay đổi'
  );
  if (!ok) return;

  const success = await syncAction(() => {
    const idx = db.tasks.findIndex(x => x.id === task.id);
    if (idx > -1) db.tasks[idx] = task; else db.tasks.push(task);
  });
  if (success) {
    closeTaskModal();
    toast(`${isAdd ? 'Đã thêm' : 'Đã cập nhật'} task <strong>${task.id}</strong>!`, 'success');
  }
}

/**
 * _showDuplicateIdBlocker – Modal block khi ID đã tồn tại khi ADD mới.
 * Cung cấp nút "Mở task đó để sửa" để user không bị bối rối.
 * @param {string} dupId   - ID bị trùng
 * @param {object} dupTask - Task object (có thể là {} nếu không tìm thấy)
 */
async function _showDuplicateIdBlocker(dupId, dupTask) {
  // Dùng uiConfirm với 1 nút OK duy nhất rồi xử lý sau
  const goEdit = await uiConfirm(
    '🚫 Mã Task đã tồn tại',
    `<div style="margin-bottom:12px;">
       Mã <strong style="font-family:var(--mono);color:var(--primary);">${dupId}</strong>
       đã được sử dụng bởi task sau:
     </div>
     <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">
       <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${dupTask?.name || '–'}</div>
       <div style="font-size:12px;color:var(--text-3);display:flex;gap:12px;flex-wrap:wrap;">
         ${dupTask?.team     ? `<span>👥 ${dupTask.team}</span>` : ''}
         ${dupTask?.picRes   ? `<span>👤 ${dupTask.picRes}</span>` : ''}
         ${dupTask?.endDate  ? `<span>📅 ${fmtDate(dupTask.endDate)}</span>` : ''}
         ${dupTask?.state    ? `<span>📌 ${dupTask.state}</span>` : ''}
       </div>
     </div>
     <div style="font-size:13px;color:var(--text-2);">
       Bạn có muốn <strong>mở task đó để chỉnh sửa</strong> thay vì tạo mới?
     </div>`,
    'warn',
    'Mở task để sửa'
  );

  if (goEdit && dupTask?.id) {
    closeTaskModal();
    // Mở edit modal của task đã tồn tại
    editTask(dupTask.id);
    toast(`Đã mở task <strong>${dupId}</strong> để chỉnh sửa.`, 'info');
  }
  // Nếu user bấm "Hủy" → đóng confirm, quay lại form ADD (không closeTaskModal)
}

// ═══════════════════════════════════════════════════════════════════
// [v6.2] FIX 4 + FIX 5: taskToRow – định dạng ngày dd-mmm-yy và %
// ─────────────────────────────────────────────────────────────────
// FIX 4: Start Date / Deadline xuất sang Excel dạng "22-Apr-26"
//        thay vì "22/04/2026" → dễ đọc, Excel nhận dạng được ngay
// FIX 5: % HT xuất dạng "75%" thay vì số nguyên 75
//        → Sheets hiển thị đúng cột phần trăm, không bị coi là số lẻ
// ─────────────────────────────────────────────────────────────────
// LƯU Ý: hàm này override taskToRow() trong file gốc.
//         Khi merge tay → tìm "function taskToRow(t)" và thay toàn bộ.
// ═══════════════════════════════════════════════════════════════════

/** Tháng viết tắt 3 ký tự tiếng Anh (ISO) */
const _MMM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * fmtDateExport – chuyển YYYY-MM-DD hoặc DD/MM/YYYY → "dd-mmm-yy"
 * Ví dụ: "2026-04-22" → "22-Apr-26"
 *         "22/04/2026" → "22-Apr-26"
 *         ""           → ""
 */
function fmtDateExport(d) {
  if (!d) return '';
  d = String(d).trim();

  let day, month0based, year4;

  // Định dạng ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const parts = d.split('-');
    year4     = parseInt(parts[0], 10);
    month0based = parseInt(parts[1], 10) - 1;
    day       = parseInt(parts[2], 10);
  }
  // Định dạng VN: DD/MM/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const parts = d.split('/');
    day         = parseInt(parts[0], 10);
    month0based = parseInt(parts[1], 10) - 1;
    year4       = parseInt(parts[2], 10);
  }
  // Không nhận dạng được → trả nguyên
  else {
    return d;
  }

  if (month0based < 0 || month0based > 11) return d; // bảo vệ index

  const dd  = String(day).padStart(2, '0');
  const mmm = _MMM[month0based];
  const yy  = String(year4).slice(-2);          // lấy 2 số cuối: 2026 → "26"

  return `${dd}-${mmm}-${yy}`;
}

/**
 * taskToRow v6.2 – Thay thế taskToRow() gốc.
 * Thay đổi so với v6.0:
 *   - Cột Start Date (index 11) / Deadline (index 12): dùng fmtDateExport()
 *   - Cột % HT (index 13): xuất dạng "75%" thay vì 75
 */
function taskToRow(t) {
  return [
    /* 0  ID                */ t.id            || '',
    /* 1  Tuần BC           */ t.tuanBC         || '',
    /* 2  Initiative ID     */ t.initiative     || '',
    /* 3  Category          */ t.category       || '',
    /* 4  Team chính        */ t.team           || '',
    /* 5  Team phối hợp     */ t.teamPhoiHop    || '',
    /* 6  Loại              */ t.type           || 'Task',
    /* 7  Task/Deliverable  */ t.name           || '',
    /* 8  PIC Accountable   */ t.picAcc         || '',
    /* 9  PIC Responsible   */ t.picRes         || '',
    /* 10 PIC Support       */ t.picSupport     || '',
    /* 11 Start Date        */ fmtDateExport(t.startDate),   // [FIX 4] dd-mmm-yy
    /* 12 Deadline          */ fmtDateExport(t.endDate),     // [FIX 4] dd-mmm-yy
    /* 13 % HT              */ (t.progress != null ? t.progress + '%' : '0%'), // [FIX 5] "75%"
    /* 14 Trạng thái        */ t.state          || 'Chưa bắt đầu',
    /* 15 Milestone         */ t.milestone      || '',
    /* 16 Kết quả tuần qua  */ t.result         || '',
    /* 17 Kế hoạch tuần tới */ t.nextPlan       || '',
    /* 18 Vướng mắc         */ t.vuongMac       || '',
    /* 19 Cần BLĐ           */ t.canBLD         || 'N',
    /* 20 Nội dung BLĐ      */ t.noiDungBLD     || '',
    /* 21 Cross-team        */ t.crossTeam      || 'N',
    /* 22 Highlight         */ t.highlight      || 'N',
  ];
}

// ── Patch checkDupId() để khớp với hành vi mới (chỉ warning, không block ở form) ──
// Giờ việc block đã được xử lý hoàn toàn trong handleSubmit → checkDupId chỉ
// dùng để highlight ô input real-time, không còn dùng để quyết định có lưu không.
function checkDupId(id) {
  const orig   = document.getElementById('origId').value;
  const isAdd  = !orig;
  const exists = id && db.tasks.some(t =>
    t.id.trim().toLowerCase() === id.trim().toLowerCase() &&
    (isAdd || t.id !== orig)   // ADD: check all; EDIT: bỏ qua chính nó
  );
  const err = document.getElementById('errId');
  const inp = document.getElementById('fId');
  if (exists) {
    err.classList.add('visible');
    inp.classList.add('error');
    // Cập nhật text lỗi tùy mode
    err.innerHTML = isAdd
      ? '<i class="fa-solid fa-ban"></i> ID đã tồn tại – Không thể thêm mới với mã này!'
      : '<i class="fa-solid fa-triangle-exclamation"></i> ID đã được dùng bởi task khác!';
  } else {
    err.classList.remove('visible');
    inp.classList.remove('error');
  }
  return exists;
}

// ═══════════════════════════════════════════════════════════════════
// Runtime confirm: tất cả 5 fix đã apply
// ═══════════════════════════════════════════════════════════════════
console.group('%c[SHTD Patch v6.2] ✅ Applied 5 fixes', 'color:#3fb950;font-weight:bold;font-size:14px;');
console.log('%c[v6.1] FIX 1%c syncAction() → Read-Then-Patch (multi-user safe)',   'color:#58a6ff;font-weight:bold;','color:#e6edf3;');
console.log('%c[v6.1] FIX 2%c .qv-fab bottom: 80px (không che pagination)',        'color:#58a6ff;font-weight:bold;','color:#e6edf3;');
console.log('%c[v6.2] FIX 3%c handleSubmit() → Block duplicate ID khi ADD',         'color:#f0883e;font-weight:bold;','color:#e6edf3;');
console.log('%c[v6.2] FIX 4%c taskToRow() → ngày xuất dd-mmm-yy (22-Apr-26)',      'color:#f0883e;font-weight:bold;','color:#e6edf3;');
console.log('%c[v6.2] FIX 5%c taskToRow() → % HT xuất "75%" thay vì 75',           'color:#f0883e;font-weight:bold;','color:#e6edf3;');
console.groupEnd();


/*
 * ═══════════════════════════════════════════════════════════════════
 * HƯỚNG DẪN MERGE VÀO dashboard.html
 * ═══════════════════════════════════════════════════════════════════
 *
 * ┌─ [v6.1] FIX 1 – syncAction ──────────────────────────────────────
 * │  Ctrl+F → "async function syncAction(action) {"
 * │  Xóa toàn bộ hàm (đến dấu } cuối) → Paste hàm syncAction mới
 * └────────────────────────────────────────────────────────────────────
 *
 * ┌─ [v6.1] FIX 2 – FAB CSS ──────────────────────────────────────────
 * │  Trong <style>, tìm: ".qv-fab {"
 * │  Thay:
 * │    bottom: 48px;  →  bottom: 80px;
 * │    right: 24px;   →  right: 28px;
 * │  Thêm vào cuối block:
 * │    pointer-events: none;
 * │  Thêm rule mới sau block:
 * │    .qv-fab > * { pointer-events: auto; }
 * │
 * │  Trong @media (max-width: 768px), tìm:
 * │    .qv-fab { bottom: 40px; right: 16px; }
 * │  Thay bằng:
 * │    .qv-fab { bottom: 76px; right: 16px; }
 * └────────────────────────────────────────────────────────────────────
 *
 * ┌─ [v6.2] FIX 3 – handleSubmit ─────────────────────────────────────
 * │  Ctrl+F → "async function handleSubmit(e) {"
 * │  Xóa toàn bộ hàm → Paste hàm handleSubmit mới từ file này
 * │  Sau hàm handleSubmit, thêm hàm _showDuplicateIdBlocker() mới
 * │  Thay toàn bộ hàm checkDupId() bằng phiên bản mới
 * └────────────────────────────────────────────────────────────────────
 *
 * ┌─ [v6.2] FIX 4 + 5 – taskToRow ────────────────────────────────────
 * │  Ctrl+F → "function taskToRow(t) {"
 * │  Xóa toàn bộ hàm → Paste const _MMM + function fmtDateExport
 * │  rồi paste function taskToRow mới
 * └────────────────────────────────────────────────────────────────────
 *
 * CHECKLIST KIỂM TRA SAU KHI MERGE:
 *   □ [FIX 1] Tab A thêm task → Tab B (chưa sync) sửa task khác →
 *             Cả 2 tồn tại trên Sheet
 *   □ [FIX 2] Ở trang Danh sách có nhiều trang → FAB không che số "2"
 *   □ [FIX 3] Form Thêm Task, nhập ID đã tồn tại → hiện modal block,
 *             bấm "Mở task để sửa" → mở form edit đúng task đó
 *   □ [FIX 3] Nhập ID trùng → hiện viền đỏ + text "Không thể thêm mới"
 *   □ [FIX 4] Export Excel → cột Start Date / Deadline hiện "22-Apr-26"
 *   □ [FIX 5] Export Excel → cột % HT hiện "75%" không phải 75
 * ═══════════════════════════════════════════════════════════════════
 */