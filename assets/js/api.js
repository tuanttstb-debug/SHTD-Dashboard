// ── Case Pipeline helpers ──

function calcCaseRag(c) {
  const g = CASE_STAGE_GROUP[c.stage] || 'active';
  if (g === 'done' || g === 'blocked') return '';
  if (!c.deadline) return '';
  const d = parseVNDate(c.deadline);
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.ceil((d - today) / 86400000);
  if (diff <= 0)  return 'Đỏ';
  if (diff <= 7)  return 'Vàng';
  return 'Xanh';
}

function genCaseId() {
  const pfx = 'CP-';
  let max = 0;
  (dbCases || []).forEach(c => {
    if (c.id && c.id.toUpperCase().startsWith('CP-')) {
      const n = parseInt(c.id.slice(3));
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return pfx + String(max + 1).padStart(3, '0');
}

function caseToRow(c) {
  return [
    /* 0  ID                  */ c.id             || '',
    /* 1  Tuần BC             */ c.tuanBC          || '',
    /* 2  Team                */ c.team            || '',
    /* 3  PIC                 */ c.pic             || '',
    /* 4  ĐVKD                */ c.dvkd            || '',
    /* 5  Khách hàng / Case   */ c.caseName        || '',
    /* 6  Loại hình           */ c.loaiHinh        || '',
    /* 7  Mức độ phức tạp     */ c.complexity      || '',
    /* 8  Phương án           */ c.phuongAn        || '',
    /* 9  Giá trị (tỷ đồng)  */ c.giaTriTy != null ? String(c.giaTriTy) : '',
    /* 10 Stage               */ c.stage           || '',
    /* 11 Vướng mắc chính     */ c.vuongMac        || '',
    /* 12 Next step           */ c.nextStep        || '',
    /* 13 Start Date          */ fmtDateExport(c.startDate),
    /* 14 Deadline            */ fmtDateExport(c.deadline),
    /* 15 RAG                 */ c.rag             || '',
    /* 16 Cần BLĐ?            */ c.canBLD          || 'N',
    /* 17 Highlight dashboard?*/ c.highlight       || 'N',
    /* 18 Ghi chú             */ c.ghiChu          || '',
    /* 19 Ý kiến BLĐ          */ c.yKienBLD        || '',
  ];
}

function rowToCase(header, row) {
  const idx = k => header.indexOf(k);
  const v   = i => (row[i] || '').toString().trim();

  const rawDate = s => {
    return toISODate(s);   // unified: any format → ISO 'YYYY-MM-DD'
  };

  return {
    id:          v(idx('ID')),
    tuanBC:      v(idx('Tuần BC')),
    team:        v(idx('Team')),
    pic:         v(idx('PIC')),
    dvkd:        v(idx('ĐVKD')),
    caseName:    v(idx('Khách hàng / Case')),
    loaiHinh:    v(idx('Loại hình')),
    complexity:  v(idx('Mức độ phức tạp')),
    phuongAn:    v(idx('Phương án')),
    giaTriTy:    parseFloat(v(idx('Giá trị (tỷ đồng)'))) || 0,
    stage:       v(idx('Stage')),
    vuongMac:    v(idx('Vướng mắc chính')),
    nextStep:    v(idx('Next step')),
    startDate:   rawDate(v(idx('Start Date'))),
    deadline:    rawDate(v(idx('Deadline'))),
    rag:         v(idx('RAG')),
    canBLD:      v(idx('Cần BLĐ?'))       || 'N',
    highlight:   v(idx('Highlight dashboard?')) || 'N',
    ghiChu:      v(idx('Ghi chú')),
    yKienBLD:    v(idx('Ý kiến BLĐ')),
  };
}

function _parseCaseArray(values) {
  if (!values || values.length < 2) { dbCases = []; return; }
  const header = values[0];
  dbCases = values.slice(1)
    .filter(r => r.some(cell => cell !== ''))
    .map(r => rowToCase(header, r));
}

async function readCases() {
  if (!GS_WEBAPP_URL) return false;
  try {
    const json = await gasPost({ action: 'case-pipeline-read' }, GAS_READ_TIMEOUT_MS);
    if (json.status !== 'ok') throw new Error(json.error || 'unknown');
    _parseCaseArray(json.values);
    persistCases();
    return true;
  } catch(e) {
    console.warn('readCases error:', e.message);
    return false;
  }
}

async function writeCases() {
  if (!GS_WEBAPP_URL) return false;
  const values = [CASE_COLS, ...dbCases.map(caseToRow)];
  const json   = await gasPost({ action: 'case-pipeline-write', values });
  if (json.status !== 'ok') throw new Error(json.error || 'unknown');
  return true;
}

function persistCases() {
  try {
    const raw = localStorage.getItem('shtd_v2') || '{}';
    const obj = JSON.parse(raw);
    obj.cases  = dbCases;
    localStorage.setItem('shtd_v2', JSON.stringify(obj));
  } catch(e) {}
}

function loadCasesFromCache() {
  try {
    const raw = localStorage.getItem('shtd_v2');
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (Array.isArray(obj.cases)) dbCases = obj.cases;
  } catch(e) {}
}

async function syncCaseAction(mutateFn) {
  showLoading('Đang đồng bộ Case Pipeline…');
  document.getElementById('syncDot').className = 'status-dot syncing';
  try {
    if (typeof mutateFn === 'function') mutateFn();

    if (GS_WEBAPP_URL) {
      try {
        await writeCases();
        document.getElementById('syncDot').className = 'status-dot connected';
      } catch(gasErr) {
        // GAS offline — save locally, warn user
        console.warn('syncCaseAction: GAS offline, local save only:', gasErr.message);
        persistCases();
        renderCasePipeline();
        document.getElementById('syncDot').className = 'status-dot';
        toast('⚠️ GAS không phản hồi — đã lưu Case cục bộ. Nhớ đồng bộ khi kết nối lại.', 'warning', 5000);
        return true;
      }
    }

    persistCases();
    renderCasePipeline();
    return true;
  } catch(e) {
    console.error('syncCaseAction error:', e);
    toast('❌ Lỗi đồng bộ Case: ' + e.message, 'error', 6000);
    document.getElementById('syncDot').className = 'status-dot';
    return false;
  } finally {
    hideLoading();
  }
}

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
    /* 11 Start Date        */ fmtDateExport(t.startDate),
    /* 12 Deadline          */ fmtDateExport(t.endDate),
    /* 13 % HT              */ (t.progress != null ? t.progress + '%' : '0%'),
    /* 14 Trạng thái        */ t.state          || 'Chưa bắt đầu',
    /* 15 Milestone         */ t.milestone      || '',
    /* 16 Kết quả tuần qua  */ t.result         || '',
    /* 17 Kế hoạch tuần tới */ t.nextPlan       || '',
    /* 18 Vướng mắc         */ t.vuongMac       || '',
    /* 19 Cần BLĐ           */ t.canBLD         || 'N',
    /* 20 Nội dung BLĐ      */ t.noiDungBLD     || '',
    /* 21 Cross-team        */ t.crossTeam      || 'N',
    /* 22 Highlight         */ t.highlight      || 'N',
    /* 23 Ý kiến BLĐ        */ t.yKienBLD       || '',
  ];
}

async function readFromHandle() {
  if (!GS_WEBAPP_URL) throw new Error('Chưa cấu hình GS_WEBAPP_URL.');
  const json = await gasPost({ action: 'read' }, GAS_READ_TIMEOUT_MS);
  if (json.status !== 'ok') throw new Error('Lỗi đọc: ' + (json.error || 'unknown'));
  _parseArrayIntoDb(json.values);
  if (json.serverTs) db._serverTs = json.serverTs;
  // Clear stale deletedIds: if server has the task, the local "deleted" flag is outdated
  if (db.deletedIds && db.deletedIds.length) {
    const serverIds = new Set(db.tasks.map(t => t.id));
    db.deletedIds = db.deletedIds.filter(id => !serverIds.has(id));
  }
  persist();
  return true;
}

/* ══════════════════════════════════════════
   BATCH READ (Phase 2) — gộp mọi domain nóng vào 1 request GAS.
   Trả:
     true       = batch-read OK, đã phân phối vào các db + persist.
     false      = GAS chưa hỗ trợ batch-read (chưa redeploy) → caller fallback read lẻ.
     (throw)    = lỗi MẠNG (timeout/fetch) → caller hiện "Thử lại", KHÔNG fallback (tránh double-timeout).
══════════════════════════════════════════ */
async function readAll(domains, scope) {
  if (!GS_WEBAPP_URL || !getAuthSession()) return false;
  scope = (scope === 'mine') ? 'mine' : 'all';
  const body = { action: 'batch-read', domains: domains || null, scope };
  // (Phase 3 + C) Version-gate CHỈ khi cache hiện tại ĐÚNG scope đang xin — nếu khác scope
  // (vd cache 'mine' nhưng đang xin 'all'), KHÔNG gửi ver để tránh notModified giữ nhầm cache cũ.
  const sameScope = (db._tasksScope || 'all') === scope;
  const knownVer  = (scope === 'mine') ? db._dataVerMine : db._dataVer;
  if (sameScope && knownVer && db.tasks && db.tasks.length) body.ver = knownVer;
  // Lỗi mạng ở gasPost sẽ THROW ra ngoài (caller xử lý) — không nuốt để tránh fallback double-timeout.
  const json = await gasPost(body, GAS_READ_TIMEOUT_MS);
  if (!json || json.status !== 'ok') {
    console.warn('batch-read chưa hỗ trợ (GAS chưa redeploy?):', json && json.error);
    return false;   // GAS SỐNG nhưng chưa có action → fallback read lẻ an toàn
  }
  if (json.ver) { if (scope === 'mine') db._dataVerMine = json.ver; else db._dataVer = json.ver; }
  // notModified: dữ liệu KHÔNG đổi kể từ lần đọc trước → giữ nguyên cache, chỉ lưu version.
  if (json.notModified) { persist(); return true; }
  if (!json.data) return false;
  const d = json.data;
  // Mỗi domain bọc riêng: 1 domain lỗi parse không kéo đổ các domain khác.
  try {
    if (d.tasks && Array.isArray(d.tasks.values)) {
      _parseArrayIntoDb(d.tasks.values);
      db._tasksScope = scope;   // đánh dấu phạm vi dữ liệu task đang giữ ('mine' | 'all')
      if (json.serverTs) db._serverTs = json.serverTs;
      if (db.deletedIds && db.deletedIds.length) {
        const serverIds = new Set(db.tasks.map(t => t.id));
        db.deletedIds = db.deletedIds.filter(id => !serverIds.has(id));
      }
      persist();
    }
  } catch (e) { console.warn('readAll tasks:', e.message); }
  try { if (d.initiatives && Array.isArray(d.initiatives.values)) { _parseInitiativeArray(d.initiatives.values); persist(); } } catch (e) { console.warn('readAll initiatives:', e.message); }
  try { if (d.cases && Array.isArray(d.cases.values)) { _parseCaseArray(d.cases.values); persistCases(); } } catch (e) { console.warn('readAll cases:', e.message); }
  try {
    if (d.issues && Array.isArray(d.issues.values)) {
      const rows = d.issues.values;
      dbIssues = rows.length <= 1 ? [] : rows.slice(1).map(rowToIssue).filter(i => i.id);
      persistIssues();
    }
  } catch (e) { console.warn('readAll issues:', e.message); }
  try {
    if (d.dev && Array.isArray(d.dev.values)) {
      const rows = d.dev.values;
      dbDev = rows.length <= 1 ? [] : rows.slice(1).map(rowToDev).filter(x => x.id);
      persistDev();
    }
  } catch (e) { console.warn('readAll dev:', e.message); }
  try {
    if (d.users && Array.isArray(d.users.rows)) {
      const header = d.users.header || [];
      _appUsers = d.users.rows
        .map(row => { const o = {}; header.forEach((h, i) => { o[h] = row[i]; }); return o; })
        .filter(u => String(u.Active).toLowerCase() !== 'false');
      if (typeof _resolvePickerCase === 'function') _resolvePickerCase();
    }
  } catch (e) { console.warn('readAll users:', e.message); }
  try {
    if (Array.isArray(d.notifs)) {
      dbNotifs = d.notifs;
      persistNotifs();
      if (typeof renderNotifBell === 'function') renderNotifBell();
    }
  } catch (e) { console.warn('readAll notifs:', e.message); }
  return true;
}

/* ══════════════════════════════════════════
   DIRTY-GUARD — bảo vệ ghi optimistic khỏi bị read nền ghi đè.
   Một quick-save ở "Công việc của tôi" (task-upsert fire-and-forget) mutate db.tasks cục bộ
   RỒI mới ghi GAS. Trong lúc đó, read nền (batch-read/readFromHandle lúc khởi động / full-load /
   poll) trả dữ liệu server CŨ (chưa kịp commit) và _parseArrayIntoDb() thay TOÀN BỘ db.tasks →
   edit vừa sửa bị lật lại → user tưởng "không lưu được". Giữ bản ghi đang sửa ở đây; sau mỗi lần
   parse read nền, phủ lại các bản ghi này lên dữ liệu server (last-writer-wins theo dòng đang sửa).
   Xóa khỏi map khi write xác nhận thành công (server đã có bản mới → read sau trả đúng).
══════════════════════════════════════════ */
let _dirtyTasks = new Map();   // id → task object cục bộ có thay đổi chưa xác nhận / đang bay

function _markTaskDirty(task) {
  if (task && task.id) _dirtyTasks.set(task.id, task);
}
function _clearTaskDirty(id) {
  if (id) _dirtyTasks.delete(id);
}
// Phủ lại bản ghi đang sửa lên db.tasks (gọi cuối _parseArrayIntoDb — sau khi server đã thay mảng).
function _reapplyDirtyTasks() {
  if (!_dirtyTasks.size || !Array.isArray(db.tasks)) return;
  const pos = new Map(db.tasks.map((t, i) => [t.id, i]));
  _dirtyTasks.forEach((localT, id) => {
    if (pos.has(id)) db.tasks[pos.get(id)] = localT;
    else db.tasks.push(localT);
  });
}

// Local-only mutation: update cache + re-render, no GAS write.
// Used for individual Task CRUD and bulk Task operations.
// Only Excel import (handleImport) goes through syncAction to write GAS.
function localAction(mutateFn) {
  if (typeof mutateFn === 'function') mutateFn();
  persist();
  renderAll();
  return true;
}

async function writeToHandle() {
  if (!GS_WEBAPP_URL) {
    throw new Error('Chưa cấu hình GS_WEBAPP_URL. Xem hướng dẫn triển khai Apps Script.');
  }
  if (db.tasks.length === 0) {
    throw new Error('BLOCKED: Từ chối ghi dữ liệu rỗng lên Sheet (0 task). Thao tác đã bị hủy để bảo vệ dữ liệu.');
  }
  const values = [DB_COLS, ...db.tasks.map(taskToRow)];
  const body   = { action: 'write', values };
  if (db._serverTs) body.clientTs = db._serverTs;
  const json = await gasPost(body);
  if (json.status !== 'ok') throw new Error('Lỗi ghi: ' + (json.error || 'unknown'));
}

async function syncAction(action) {
  // Trace: log caller so unexpected syncAction calls can be caught in console
  console.warn('[syncAction] fired — caller:', new Error().stack.split('\n').slice(1, 4).join(' ← '));
  showLoading('Đang đồng bộ Google Sheets…');
  document.getElementById('syncDot').className = 'status-dot syncing';

  const snapshotBefore = db.tasks.map(t => t.id);

  try {
    if (typeof action === 'function') action();

    const localTasks = db.tasks;

    let serverTasks = null;
    if (GS_WEBAPP_URL) {
      try {
        showLoading('Đang đọc dữ liệu mới nhất từ Sheet…');
        const json = await gasPost({ action: 'read' }, GAS_READ_TIMEOUT_MS);
        if (json.status === 'ok' && json.values) {
          const tempDb = { tasks: [], initiatives: [] };
          const savedDb = db;
          db = tempDb;
          _parseArrayIntoDb(json.values);
          serverTasks = tempDb.tasks;
          db = savedDb;
          if (json.serverTs) db._serverTs = json.serverTs;
        }
      } catch (readErr) {
        console.warn('syncAction: không đọc được Sheet, fallback full-write:', readErr.message);
      }
    }

    if (serverTasks !== null) {
      const serverMap = new Map(serverTasks.map(t => [t.id, t]));
      const localIds = new Set(localTasks.map(t => t.id));
      const deletedIds = new Set(snapshotBefore.filter(id => !localIds.has(id)));
      const localMap = new Map(localTasks.map(t => [t.id, t]));
      // Tasks explicitly deleted via UI (before this syncAction) — must not be restored from server
      const persistedDeleted = new Set(db.deletedIds || []);

      const merged = [];
      serverMap.forEach((t, id) => {
        if (deletedIds.has(id)) return;
        if (persistedDeleted.has(id)) return;
        if (localMap.has(id)) {
          merged.push(localMap.get(id));
        } else {
          merged.push(t);
        }
      });
      localMap.forEach((t, id) => {
        if (!serverMap.has(id) && !deletedIds.has(id)) {
          merged.push(t);
        }
      });

      showLoading('Đang ghi dữ liệu lên Sheet…');
      const values    = [DB_COLS, ...merged.map(taskToRow)];
      const writeBody = { action: 'write', values };
      if (db._serverTs) writeBody.clientTs = db._serverTs;

      if (merged.length === 0 && serverTasks.length > 0) {
        const ok = await uiConfirm(
          '⚠️ Cảnh báo mất dữ liệu',
          `Thao tác này sẽ xóa toàn bộ ${serverTasks.length} task trên Google Sheets. Bạn có chắc chắn?`,
          'danger', 'Xóa tất cả'
        );
        if (!ok) {
          db.tasks = serverTasks;
          persist(); renderAll();
          toast('Đã hủy thao tác.', 'info');
          hideLoading();
          document.getElementById('syncDot').className = 'status-dot connected';
          return false;
        }
      }

      const json = await gasPost(writeBody);
      if (json.status !== 'ok') throw new Error('Lỗi ghi: ' + (json.error || 'unknown'));

      db.tasks = merged;

    } else {
      if (db.tasks.length === 0) throw new Error('BLOCKED: Từ chối ghi dữ liệu rỗng (0 task).');
      // GAS không kết nối được (URL chưa cấu hình hoặc mạng lỗi) — lưu cục bộ
      persist(); renderAll();
      document.getElementById('syncDot').className = 'status-dot';
      toast('⚠️ GAS không phản hồi — đã lưu cục bộ. Nhớ đồng bộ Sheets khi kết nối lại.', 'warning', 5000);
      return true;
    }

    persist(); renderAll();
    document.getElementById('syncDot').className = 'status-dot connected';
    return true;

  } catch(e) {
    if (e.message === 'VERSION_CONFLICT' || (e.message && e.message.includes('VERSION_CONFLICT'))) {
      toast('⚠️ Dữ liệu vừa được cập nhật bởi người khác. Đang tải lại dữ liệu mới nhất…', 'warning', 6000);
      try { await readFromHandle(); renderAll(); } catch(_) {}
      hideLoading();
      document.getElementById('syncDot').className = 'status-dot connected';
      return false;
    }
    try {
      const cached = localStorage.getItem('shtd_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.tasks) { db.tasks = parsed.tasks; db.initiatives = parsed.initiatives || []; }
      }
    } catch(_) {}
    renderAll();
    console.error('syncAction error:', e);
    toast('❌ Lỗi đồng bộ: ' + e.message + ' — Dữ liệu local đã được khôi phục.', 'error', 8000);
    document.getElementById('syncDot').className = 'status-dot';
    return false;
  } finally {
    hideLoading();
  }
}
/* ══════════════════════════════════════════
   ATOMIC SINGLE-ROW GAS WRITES
   Single task/case save → 1 GAS row write (not 613).
   Caller mutates local db + persists + renders first (optimistic update),
   then fires one of these helpers to sync that specific row to GAS.
   Bulk import / bulk ops still use the full-rewrite actions.
══════════════════════════════════════════ */

// Server đã cấp mã mới cho 1 bản ghi MỚI vì mã cũ vừa bị người khác dùng
// (guard chống ghi đè khi 2 người cùng tạo). Nhận mã mới vào bản ghi cục bộ.
function _adoptReassignedId(rec, newId, persistFn, renderFn) {
  if (!rec || !newId || newId === rec.id) return;
  const oldId = rec.id;
  rec.id = newId;
  if (typeof persistFn === 'function') persistFn();
  if (typeof renderFn === 'function') renderFn();
  const msg = (typeof t === 'function' ? t('sync.id-reassigned')
    : 'Mã "{old}" vừa được người khác dùng — hệ thống đã cấp mã mới: {new}.')
    .replace('{old}', oldId).replace('{new}', newId);
  toast(msg, 'info', 6000);
}

async function _gasTaskUpsert(task, oldId) {
  if (!GS_WEBAPP_URL) return;
  _markTaskDirty(task);            // giữ bản đang sửa → read nền không ghi đè
  const dirtyKey = task.id;        // khóa dirty theo id lúc bắt đầu (có thể bị reassign sau khi lưu)
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    if (oldId && oldId !== task.id) {
      const delRes = await gasPost({ action: 'task-delete', taskId: oldId, taskName: task.name });
      if (delRes.status !== 'ok') throw new Error('Xóa task cũ [' + oldId + '] thất bại: ' + (delRes.error || 'unknown'));
    }
    const json = await gasPost({ action: 'task-upsert', taskId: task.id, taskName: task.name, row: taskToRow(task), isNew: !oldId });
    if (json.status !== 'ok') throw new Error(json.error || 'task-upsert lỗi');
    _adoptReassignedId(task, json.id, persist, () => { if (typeof renderAll === 'function') renderAll(); });
    if (json.serverTs) { db._serverTs = json.serverTs; persist(); }
    _clearTaskDirty(dirtyKey);                                  // ghi xong → hết dirty
    if (json.id && json.id !== dirtyKey) _clearTaskDirty(json.id); // dọn cả id mới nếu bị reassign
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    // KHÔNG clear dirty: giữ bản cục bộ để read nền không nuốt; lần Sync/lưu sau đẩy lên server.
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS lỗi: ' + e.message + ' — task đã lưu cục bộ. Nhớ đồng bộ khi online.', 'warning', 6000);
  }
}

async function _gasTaskDelete(taskId, taskName) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'task-delete', taskId, taskName: taskName || '' });
    if (json.status !== 'ok') throw new Error(json.error || 'task-delete lỗi');
    if (json.serverTs) { db._serverTs = json.serverTs; persist(); }
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS không phản hồi — task đã xóa cục bộ. Nhớ đồng bộ khi online.', 'warning', 5000);
  }
}

async function _gasCaseUpsert(c, isNew) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'case-upsert', caseId: c.id, caseName: c.caseName, row: caseToRow(c), isNew: !!isNew });
    if (json.status !== 'ok') throw new Error(json.error || 'case-upsert lỗi');
    _adoptReassignedId(c, json.id, persistCases, () => { if (typeof renderCasePipeline === 'function') renderCasePipeline(); });
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS không phản hồi — Case đã lưu cục bộ. Nhớ đồng bộ khi online.', 'warning', 5000);
  }
}

async function _gasCaseDelete(caseId, caseName) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'case-delete', caseId, caseName: caseName || '' });
    if (json.status !== 'ok') throw new Error(json.error || 'case-delete lỗi');
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS không phản hồi — Case đã xóa cục bộ. Nhớ đồng bộ khi online.', 'warning', 5000);
  }
}

/* ══════════════════════════════════════════
   USER MASTER — global cache for Team/PIC dropdowns
══════════════════════════════════════════ */
let _appUsers = [];

async function loadAppUsers() {
  if (!GS_WEBAPP_URL || !getAuthSession()) return;
  try {
    const res = await gasPost({ action: 'user-list' }, GAS_READ_TIMEOUT_MS);
    if (res.status !== 'ok' || !res.data) return;
    const { header, rows } = res.data;
    _appUsers = rows
      .map(row => {
        const obj = {};
        header.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      })
      .filter(u => String(u.Active).toLowerCase() !== 'false');
    // Tasks có thể đã load từ cache trước khi user list về — resolve lại case
    if (typeof _resolvePickerCase === 'function') _resolvePickerCase();
  } catch(e) {
    console.warn('loadAppUsers failed:', e.message);
  }
}

function getAppTeams() {
  if (_appUsers.length) {
    return [...new Set(_appUsers.map(u => u.Team).filter(Boolean))].sort();
  }
  return TEAM_LIST;
}

function getUsersByTeam(team) {
  if (!_appUsers.length) return [];
  return _appUsers.filter(u => !team || u.Team === team);
}

function _populateTeamSelect(selectId, currentVal) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const teams  = getAppTeams();
  const isReq  = el.hasAttribute('required');
  el.innerHTML = (!isReq ? '<option value="">– Chọn team –</option>' : '')
    + teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  if (currentVal && teams.includes(currentVal)) el.value = currentVal;
  else if (isReq && teams.length) el.value = teams[0];
}

function _populateUserSelect(selectId, team, currentVal) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const isReq = el.hasAttribute('required');

  if (team === '') {
    el.innerHTML = '<option value="">– Chọn team trước –</option>'
      + (currentVal ? `<option value="${esc(currentVal)}">${esc(currentVal)}</option>` : '');
    if (currentVal) el.value = currentVal;
    return;
  }

  // team === null → show all users (no team filter); team string → filter by team
  const users = getUsersByTeam(team || '');

  if (!users.length) {
    el.innerHTML = (!isReq ? '<option value="">– Chọn –</option>' : '')
      + (currentVal ? `<option value="${esc(currentVal)}">${esc(currentVal)}</option>` : '');
    if (currentVal) el.value = currentVal;
    return;
  }

  el.innerHTML = (!isReq ? '<option value="">– Chọn –</option>' : '')
    + users.map(u => {
        const label = u.Display_Name
          ? `${esc(u.Display_Name)} (${esc(u.Username)})`
          : esc(u.Username);
        return `<option value="${esc(u.Username)}">${label}</option>`;
      }).join('');

  if (currentVal) el.value = currentVal;
  else if (isReq && users.length) el.value = users[0].Username;

  if (currentVal && el.value !== currentVal) {
    el.innerHTML += `<option value="${esc(currentVal)}">${esc(currentVal)}</option>`;
    el.value = currentVal;
  }
}

/* ══════════════════════════════════════════
   AUDIT HISTORY — per-entity read from Audit_Log sheet
══════════════════════════════════════════ */

async function _gasAuditRead(entityId) {
  if (!GS_WEBAPP_URL) return [];
  try {
    const res = await gasPost({ action: 'audit-read', entityId }, GAS_READ_TIMEOUT_MS);
    if (!res || res.status !== 'ok') return [];
    return Array.isArray(res.rows) ? res.rows : [];
  } catch(e) {
    console.warn('[audit-read] error:', e.message);
    return [];
  }
}

function _buildHistoryTable(rows, syntheticRow, actionMap) {
  const base = {
    '__create__':         { label: 'Tạo mới',    cls: 'badge-green' },
    'task-upsert':        { label: 'Cập nhật',   cls: 'badge-info'  },
    'task-delete':        { label: 'Xóa',         cls: 'badge-red'   },
    'task-write':         { label: 'Sync import', cls: 'badge-gray'  },
    'case-upsert':        { label: 'Cập nhật',   cls: 'badge-info'  },
    'case-delete':        { label: 'Xóa',         cls: 'badge-red'   },
    'case-pipeline-write':{ label: 'Sync import', cls: 'badge-gray'  },
    'initiative-upsert':  { label: 'Cập nhật',   cls: 'badge-info'  },
    'initiative-write':   { label: 'Sync import', cls: 'badge-gray'  },
  };
  const aMap = Object.assign({}, base, actionMap || {});

  const all = syntheticRow ? [syntheticRow, ...rows] : [...rows];

  if (!all.length) {
    return '<div style="padding:32px 16px;text-align:center;color:var(--text-3);">'
         + '<i class="fa-solid fa-clock-rotate-left" style="font-size:24px;margin-bottom:10px;display:block;opacity:.3;"></i>'
         + 'Chưa có lịch sử ghi nhận.</div>';
  }

  const fmtTs = ts => {
    try {
      const d = new Date(String(ts).includes('T') ? ts : ts + 'T00:00:00');
      if (isNaN(d)) return ts || '—';
      return d.toLocaleDateString('vi-VN') + ' '
           + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch { return ts || '—'; }
  };

  const rowsHtml = all.map((r, i) => {
    const info   = aMap[r[4]] || { label: r[4] || '?', cls: 'badge-gray' };
    const detail = (r[5] || '').split(' | ').slice(1).join(' | ');
    const bg     = i % 2 ? 'background:var(--surface-2,#f8f9fa);' : '';
    return `<tr style="${bg}">
      <td style="padding:9px 12px;white-space:nowrap;font-size:12px;color:var(--text-2);">${fmtTs(r[0])}</td>
      <td style="padding:9px 12px;font-size:13px;font-weight:500;">${esc(r[2] || r[1] || '—')}</td>
      <td style="padding:9px 12px;"><span class="badge ${info.cls}" style="font-size:11px;">${esc(info.label)}</span></td>
      <td style="padding:9px 12px;font-size:12px;color:var(--text-3);">${esc(detail)}</td>
    </tr>`;
  }).join('');

  return `<div style="padding:4px 0 8px;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="border-bottom:2px solid var(--border);">
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;">Thời gian</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;">Người thực hiện</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;">Thao tác</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px;">Chi tiết</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>`;
}

/* ══════════════════════════════════════════
   ISSUE TRACKER API
══════════════════════════════════════════ */

function rowToIssue(r) {
  return {
    id:            String(r[0]  || '').trim(),
    ngayPhatSinh:  toISODate(r[1]),
    tieuDe:        String(r[2]  || '').trim(),
    heTong:        String(r[3]  || '').trim(),
    loaiIssue:     String(r[4]  || '').trim(),
    mucDo:         String(r[5]  || '').trim(),
    loaiXuLy:      String(r[6]  || '').trim(),
    trangThai:     String(r[7]  || '').trim(),
    phongBan:      String(r[8]  || '').trim(),
    nguyenNhan:    String(r[9]  || '').trim(),
    deXuat:        String(r[10] || '').trim(),
    deadline:      toISODate(r[11]),
    ngayGiaiQuyet: toISODate(r[12]),
    ticketNgoai:   String(r[13] || '').trim(),
    anhHuong:      String(r[14] || '').trim(),
    nguoiLog:      String(r[15] || '').trim(),
    nguoiXuLy:     String(r[16] || '').trim(),
    ghiChu:        String(r[17] || '').trim(),
  };
}

function issueToRow(iss) {
  return [
    iss.id, toISODate(iss.ngayPhatSinh), iss.tieuDe, iss.heTong,
    iss.loaiIssue, iss.mucDo, iss.loaiXuLy, iss.trangThai, iss.phongBan,
    iss.nguyenNhan, iss.deXuat, toISODate(iss.deadline), toISODate(iss.ngayGiaiQuyet),
    iss.ticketNgoai, iss.anhHuong, iss.nguoiLog, iss.nguoiXuLy, iss.ghiChu,
  ];
}

function genIssueId() {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = 'IS-' + yy + '-';
  const existing = dbIssues.filter(i => i.id.startsWith(prefix));
  if (!existing.length) return prefix + '001';
  const max = Math.max(...existing.map(i => parseInt((i.id.split('-')[2]) || '0', 10)));
  return prefix + String(max + 1).padStart(3, '0');
}

async function _gasIssueUpsert(iss, isNew) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'issue-upsert', issueId: iss.id, issueName: iss.tieuDe, row: issueToRow(iss), isNew: !!isNew });
    if (json.status !== 'ok') throw new Error(json.error || 'issue-upsert lỗi');
    _adoptReassignedId(iss, json.id, persistIssues, () => { if (typeof renderIssueTracker === 'function') renderIssueTracker(); });
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS lỗi: ' + e.message + ' — issue đã lưu cục bộ.', 'warning', 6000);
  }
}

async function _gasIssueDelete(issueId, issueName) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'issue-delete', issueId, issueName: issueName || '' });
    if (json.status !== 'ok') throw new Error(json.error || 'issue-delete lỗi');
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS lỗi: ' + e.message + ' — đã xóa cục bộ.', 'warning', 6000);
  }
}

async function readIssues() {
  if (!GS_WEBAPP_URL) return;
  try {
    const json = await gasPost({ action: 'issue-read' }, GAS_READ_TIMEOUT_MS);
    if (json.status !== 'ok') return;
    const rows = json.values || [];
    if (rows.length <= 1) { dbIssues = []; persistIssues(); return; }
    dbIssues = rows.slice(1).map(rowToIssue).filter(i => i.id);
    persistIssues();
  } catch(e) {
    console.warn('readIssues error:', e.message);
  }
}

function persistIssues() {
  try { localStorage.setItem('shtd_issues_v1', JSON.stringify(dbIssues)); } catch(e) {}
}

function loadIssuesFromCache() {
  try {
    const cached = localStorage.getItem('shtd_issues_v1');
    if (cached) dbIssues = JSON.parse(cached);
  } catch(e) {}
}

/* ══════════════════════════════════════════
   DEV PLAN API  (Plan phát triển bản thân)
══════════════════════════════════════════ */

function rowToDev(r) {
  return {
    id:         String(r[0]  || '').trim(),
    name:       String(r[1]  || '').trim(),
    target:     String(r[2]  || '').trim(),
    pic:        String(r[3]  || '').trim(),
    coordUnit:  String(r[4]  || '').trim(),
    startDate:  toISODate(r[5]),
    endDate:    toISODate(r[6]),
    state:      String(r[7]  || '').trim(),
    progress:   String(r[8]  || '').trim(),
    note:       String(r[9]  || '').trim(),
    lastReview: String(r[10] || '').trim(),   // full timestamp (date+time) — NOT a date-picker field
    createdBy:  String(r[11] || '').trim(),
  };
}

function devToRow(d) {
  return [
    d.id, d.name, d.target, d.pic, d.coordUnit,
    toISODate(d.startDate), toISODate(d.endDate), d.state, d.progress,
    d.note, d.lastReview, d.createdBy,
  ];
}

function genDevId() {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = 'DEV-' + yy + '-';
  const existing = (dbDev || []).filter(d => d.id.startsWith(prefix));
  if (!existing.length) return prefix + '001';
  const max = Math.max(...existing.map(d => parseInt((d.id.split('-')[2]) || '0', 10)));
  return prefix + String(max + 1).padStart(3, '0');
}

async function _gasDevUpsert(d, isNew) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'dev-upsert', devId: d.id, devName: d.name, row: devToRow(d), isNew: !!isNew });
    if (json.status !== 'ok') throw new Error(json.error || 'dev-upsert lỗi');
    _adoptReassignedId(d, json.id, persistDev, () => { if (typeof renderDevPlan === 'function') renderDevPlan(); });
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS lỗi: ' + e.message + ' — đã lưu cục bộ.', 'warning', 6000);
  }
}

async function _gasDevDelete(devId, devName) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'dev-delete', devId, devName: devName || '' });
    if (json.status !== 'ok') throw new Error(json.error || 'dev-delete lỗi');
    if (dot) dot.className = 'status-dot connected';
  } catch(e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS lỗi: ' + e.message + ' — đã xóa cục bộ.', 'warning', 6000);
  }
}

async function readDev() {
  if (!GS_WEBAPP_URL) return;
  try {
    const json = await gasPost({ action: 'dev-read' }, GAS_READ_TIMEOUT_MS);
    if (json.status !== 'ok') return;
    const rows = json.values || [];
    if (rows.length <= 1) { dbDev = []; persistDev(); return; }
    dbDev = rows.slice(1).map(rowToDev).filter(d => d.id);
    persistDev();
  } catch(e) {
    console.warn('readDev error:', e.message);
  }
}

function persistDev() {
  try { localStorage.setItem('shtd_dev_v1', JSON.stringify(dbDev)); } catch(e) {}
}

function loadDevFromCache() {
  try {
    const cached = localStorage.getItem('shtd_dev_v1');
    if (cached) dbDev = JSON.parse(cached);
  } catch(e) {}
}

/* ══════════════════════════════════════════
   NOTIFICATIONS API  (chuông nhắc việc)
   Nguồn: GAS notif-read (server sinh định kỳ + real-time).
   Read-state per-user lưu ở server; client poll + optimistic mark-read.
══════════════════════════════════════════ */

async function readNotifications() {
  if (!GS_WEBAPP_URL || !getAuthSession()) return;
  try {
    const json = await gasPost({ action: 'notif-read' }, GAS_READ_TIMEOUT_MS);
    if (json.status !== 'ok') return;
    dbNotifs = Array.isArray(json.notifs) ? json.notifs : [];
    persistNotifs();
    if (typeof renderNotifBell === 'function') renderNotifBell();
  } catch(e) {
    console.warn('readNotifications error:', e.message);
  }
}

// mark-read: optimistic (cập nhật cục bộ + render ngay), rồi đồng bộ server.
async function markNotifRead(ids, all) {
  const idSet = new Set(all ? [] : (ids || []).map(String));
  dbNotifs.forEach(n => { if (all || idSet.has(String(n.id))) n.read = true; });
  persistNotifs();
  if (typeof renderNotifBell === 'function') renderNotifBell();
  if (!GS_WEBAPP_URL || !getAuthSession()) return;
  try {
    const body = all ? { action: 'notif-mark-read', all: true }
                     : { action: 'notif-mark-read', ids: (ids || []).map(String) };
    const json = await gasPost(body);
    if (json.status !== 'ok') throw new Error(json.error || 'notif-mark-read lỗi');
  } catch(e) {
    console.warn('markNotifRead error:', e.message);
  }
}

function persistNotifs() {
  try { localStorage.setItem('shtd_notifs_v1', JSON.stringify(dbNotifs)); } catch(e) {}
}

function loadNotifsFromCache() {
  try {
    const cached = localStorage.getItem('shtd_notifs_v1');
    if (cached) dbNotifs = JSON.parse(cached);
  } catch(e) {}
}
