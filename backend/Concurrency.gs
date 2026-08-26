// ── SHTD Dashboard – Write concurrency guard ──
//
// Bug fixed: khi 2 người cùng bấm "Tạo mới" ở cùng thời điểm, client tự sinh
// mã tuần tự từ cache LOCAL của mình → cả hai ra CÙNG một mã (vd DEV-26-005).
// Người A ghi trước (append), người B ghi sau → upsert-theo-ID tìm thấy dòng
// của A và GHI ĐÈ lên nó (coi dòng mới của B là "sửa" dòng của A). Bản ghi của
// A biến mất âm thầm.
//
// Cách xử lý (server là nguồn sự thật):
//   1. Mọi ghi 1-dòng (create/edit) chạy trong LockService.getScriptLock() →
//      các execution đồng thời được tuần tự hoá, "kiểm tra rồi ghi" là atomic.
//   2. Với bản ghi MỚI (isNew), nếu mã đã tồn tại trên sheet → cấp mã mới bằng
//      cách tăng phần số cuối của prefix cho tới khi trống.
//
// Áp dụng cho cả 5 entity: Task / Case / Issue / Initiative(+Milestone) / Dev.

var _WRITE_LOCK_MS = 20000;

/**
 * Lấy script lock để tuần tự hoá các thao tác ghi. Ném lỗi nếu không lấy được
 * trong _WRITE_LOCK_MS (được doPost bắt → client giữ bản cục bộ + báo cảnh báo).
 * @returns {Lock}
 */
function _acquireWriteLock() {
  var lock = LockService.getScriptLock();
  lock.waitLock(_WRITE_LOCK_MS);
  return lock;
}

/**
 * Trả về mã DUY NHẤT cho 1 dòng MỚI trên sheet chỉ định.
 *   - Nếu `id` chưa có trong cột A  → trả `id` nguyên trạng (không đụng gì).
 *   - Nếu `id` đã tồn tại           → tăng phần số cuối của prefix tới khi trống.
 *
 * Tách "<prefix><số cuối>": phần chữ số liền nhau ở CUỐI chuỗi là số, phần còn
 * lại là prefix. Đúng cho mọi lược đồ hiện có vì mã luôn kết thúc bằng số:
 *   SO-005 · CP-005 · IS-26-005 · DEV-26-005 · SCF-001 · SCF-001-M3
 * (dấu "-" ngăn không cho \d+ nuốt nhầm phần số ở giữa.)
 *
 * PHẢI gọi khi đang giữ write lock (xem _acquireWriteLock) để tránh 2 create
 * đồng thời cùng đọc ra một max.
 *
 * @param {string} sheetName
 * @param {string} id
 * @returns {string} mã đã đảm bảo không trùng
 */
function reassignIdIfExists(sheetName, id) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return id;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return id;   // chỉ có header (hoặc rỗng) → chưa thể trùng

  var raw   = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var taken = {};
  for (var i = 0; i < raw.length; i++) {
    taken[String(raw[i][0]).trim().toLowerCase()] = true;
  }

  var key = String(id).trim().toLowerCase();
  if (!taken[key]) return id;   // không trùng → giữ nguyên

  // Tách prefix + số cuối.
  var m = String(id).match(/^(.*?)(\d+)$/);
  if (!m) {
    // Mã không kết thúc bằng số → gắn hậu tố -2, -3, …
    var base = String(id), n = 2, cand = base + '-' + n;
    while (taken[cand.toLowerCase()]) { n++; cand = base + '-' + n; }
    return cand;
  }

  var pfx   = m[1];
  var width = m[2].length;
  var pfxLc = pfx.toLowerCase();
  var max   = 0;
  for (var j = 0; j < raw.length; j++) {
    var s = String(raw[j][0]).trim();
    if (s.toLowerCase().indexOf(pfxLc) === 0) {          // cùng prefix
      var num = parseInt(s.substring(pfx.length), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }

  var next = max + 1;
  var out  = pfx + _padNum(next, width);
  while (taken[out.toLowerCase()]) { next++; out = pfx + _padNum(next, width); }
  return out;
}

/** Zero-pad số về tối thiểu `width` ký tự (an toàn trên mọi runtime). */
function _padNum(n, width) {
  var s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

/**
 * (Pha A) Ghi 1-dòng ATOMIC với khóa TỐI THIỂU + idempotency + defer notif/audit.
 *
 * Mục tiêu: đưa tỷ lệ ghi timeout/mất bản ghi về ~0% ở tải 10–30 người đồng thời.
 *  - Vùng KHÓA chỉ còn "check-then-write" cần atomic: (dedup reqId) → (cấp mã mới nếu isNew)
 *    → (upsert 1 dòng) → (bump version). Bỏ ra khỏi khóa: đọc trạng thái trước (notifPrior_,
 *    cả 1 sheet) + ghi Audit_Log (append) + sinh notification — vốn là phần chậm nhất trước đây.
 *  - Idempotency: reqId (client sinh, giữ nguyên qua retry) → nếu đã xử lý thì trả lại mã cũ,
 *    KHÔNG upsert lần 2 (chống trùng khi client timeout rồi thử lại).
 *
 * @param {Object} body       payload doPost (đã validate row + id ở handler).
 * @param {Object} tokenData  phiên đã xác thực (cho auditLog).
 * @param {Object} spec       { sheetName, entityType, upsertFn(row,id), idKey, nameKey, action, withServerTs }
 * @returns {Object} { status:'ok', id, [serverTs] }
 */
function atomicUpsert_(body, tokenData, spec) {
  var origId = body[spec.idKey];
  var isNew  = !!body.isNew;

  // ── NGOÀI KHÓA: đọc trạng thái trước-ghi cho notification (best-effort).
  //    Bản ghi MỚI thì chắc chắn chưa tồn tại → khỏi đọc sheet.
  var prior = isNew ? { existed: false, done: false }
                    : notifPrior_(spec.entityType, origId);

  var lock = _acquireWriteLock();
  var finalId, dedup = false;
  try {
    var seen = _reqSeen(body.reqId);
    if (seen && seen.id) {
      finalId = seen.id;              // request này đã commit ở lần trước → trả lại mã cũ
      dedup   = true;
    } else {
      finalId = isNew ? reassignIdIfExists(spec.sheetName, origId) : origId;
      if (finalId !== origId) body.row[0] = finalId;   // đồng bộ ô ID trong dòng
      spec.upsertFn(body.row, finalId);                // đọc cột ID + setValues + flush (1 lần)
      if (typeof _bumpDataVer === 'function') _bumpDataVer();
      _reqRemember(body.reqId, finalId);
    }
  } finally {
    lock.releaseLock();
  }

  // ── NGOÀI KHÓA: audit + notification (không chặn đường ghi chính; đã bọc try/catch nội bộ).
  //    Bỏ qua khi dedup vì lần commit đầu đã ghi audit/notif rồi.
  if (!dedup) {
    try {
      auditLog(tokenData, spec.action, finalId + (body[spec.nameKey] ? ' | ' + body[spec.nameKey] : ''));
    } catch (e) { Logger.log('atomicUpsert_ audit: ' + e.message); }
    try {
      notifOnWrite(spec.entityType, finalId, body.row, prior);
    } catch (e) { Logger.log('atomicUpsert_ notif: ' + e.message); }
  }

  var resp = { status: 'ok', id: finalId };
  if (spec.withServerTs) resp.serverTs = _getTaskTs();
  return resp;
}
