/* ═══════════════════════════════════════════════════════════════════════
   DateGuard.gs  —  root-cause guard chống lệch định dạng ngày (tái phát)
   ───────────────────────────────────────────────────────────────────────
   VẤN ĐỀ: DateNormalizeMigration.gs chỉ dọn dữ liệu MỘT LẦN. Sau đó, mỗi khi
   ai đó sửa tay / paste / copy vào ô ngày trong Sheet, Google Sheets có thể
   lưu lại dưới dạng locale ("31-thg 8-26"), serial (46265) hay Date-obj lẫn
   lộn → dữ liệu ngày lại lệch, các consumer (báo cáo tuần AIOS, export…) đọc
   sai/thiếu. Migration cũ không ngăn được điều này.

   GIẢI PHÁP (2 tầng, không cần redeploy Web App):
     1) Installable onEdit `dateGuardOnEdit(e)` — REAL-TIME: khi ô ngày ở cột
        quản lý bị sửa/paste → tự viết lại ISO 'YYYY-MM-DD' NGAY (best-effort
        khoá plain-text). Người sửa ngoài app cũng được chuẩn hoá tức thì.
     2) Time-based `dailyDateGuard()` — SAFETY NET: quét 5 sheet mỗi ngày
        (đặt TRƯỚC notifScan) dọn ô còn sót + log ô không parse được để người
        rà. Bắt cả thay đổi mà onEdit bỏ lỡ (API/import/khôi phục lịch sử).

   NGUYÊN TẮC AN TOÀN:
     • CHỈ rewrite chuỗi locale/serial LỆCH & parse được. Ô đã là Date hợp lệ
       hoặc đã ISO → BỎ QUA (không churn). Ô không parse được → GIỮ NGUYÊN + log
       (không bao giờ phá dữ liệu người nhập).
     • setNumberFormat('@') bọc try/catch: cột "kiểu đã nhập" (Sheets Tables/
       imported) chặn call này (lý do S67.2 bỏ nó) → nuốt lỗi, giá trị ISO vẫn ghi.
     • Programmatic setValue của script KHÔNG kích lại onEdit → không vòng lặp.

   CÀI ĐẶT (chạy 1 lần trong Apps Script editor, KHÔNG redeploy):
     1) installDateGuardTriggers()   → cài onEdit + daily (authorize khi hỏi).
     2) (tuỳ chọn) dateGuardSelfTest() → xác nhận _dnToISO parse đúng mọi format.
     3) uninstallDateGuardTriggers()  → gỡ nếu cần.

   PHỤ THUỘC (cùng project GAS — tái dùng, không nhân đôi):
     _DN_TARGETS, _dnToISO, _dnNorm   ← khai báo trong DateNormalizeMigration.gs
════════════════════════════════════════════════════════════════════════ */

var _DG_BUILD = '2026-08-22a';
var _DG_DAILY_HOUR = 7;                       // chạy TRƯỚC notifScan (8h) → digest đọc dữ liệu sạch
var _DG_LOCK_PLAINTEXT = true;                // best-effort khoá '@' (bỏ qua nếu cột chặn)

/* ── Resolve các cột ngày quản lý của 1 sheet → [{col1, head}] ──
   Dò theo header keyword (như migration), fallback vị trí cứng. */
function _dgResolveCols_(sheet, tgt) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var hnorm = header.map(_dnNorm);
  return tgt.cols.map(function (c) {
    var idx = -1;
    for (var k = 0; k < hnorm.length; k++) { if (hnorm[k].indexOf(_dnNorm(c.kw)) !== -1) { idx = k; break; } }
    var col = idx !== -1 ? idx + 1 : c.pos;
    return { col1: col, head: header[col - 1] || ('col#' + col) };
  });
}

/* ── Quyết định 1 ô có cần chuẩn hoá không ──
   Trả {fix, iso}. Chỉ fix chuỗi locale/serial lệch & parse được.
   Date hợp lệ / ISO sẵn / rỗng → fix=false. Không parse được → fix=false (giữ + đánh dấu bad). */
function _dgInspectCell_(raw, tz) {
  if (raw === '' || raw === null || raw === undefined) return { fix: false, iso: '', bad: false };
  // Date obj hợp lệ = đã canonical (getValues trả Date → consumer đọc đúng). Bỏ qua.
  if (Object.prototype.toString.call(raw) === '[object Date]') {
    return { fix: false, iso: '', bad: isNaN(raw.getTime()) };
  }
  // Chuỗi đã đúng ISO 'YYYY-MM-DD' → bỏ qua.
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return { fix: false, iso: raw.trim(), bad: false };
  }
  var iso = _dnToISO(raw, tz);                 // '' nếu không parse được
  if (iso === '') return { fix: false, iso: '', bad: true };   // có nội dung nhưng không hiểu → giữ + log
  return { fix: true, iso: iso, bad: false };
}

/* ── Ghi ISO vào 1 range 1 ô + best-effort khoá plain-text ── */
function _dgWriteISO_(range, iso) {
  if (_DG_LOCK_PLAINTEXT) { try { range.setNumberFormat('@'); } catch (e) { /* cột kiểu đã nhập chặn — bỏ qua */ } }
  range.setValue(iso);
}

/* ═══════════════ TẦNG 1 — REAL-TIME (installable onEdit) ═══════════════ */
function dateGuardOnEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    var name = sh.getName();
    var tgt = null;
    for (var t = 0; t < _DN_TARGETS.length; t++) { if (_DN_TARGETS[t].sheet === name) { tgt = _DN_TARGETS[t]; break; } }
    if (!tgt) return;                          // sheet không quản lý ngày → thoát nhanh

    var cols = _dgResolveCols_(sh, tgt);
    if (!cols.length) return;
    var colSet = {}; cols.forEach(function (c) { colSet[c.col1] = true; });

    var editC0 = e.range.getColumn();
    var editR0 = e.range.getRow();
    var nR = e.range.getNumRows();
    var nC = e.range.getNumColumns();
    var tz = sh.getParent().getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';

    for (var dc = 0; dc < nC; dc++) {
      var col = editC0 + dc;
      if (!colSet[col]) continue;              // chỉ xử lý cột ngày quản lý
      for (var dr = 0; dr < nR; dr++) {
        var row = editR0 + dr;
        if (row < 2) continue;                 // bỏ header
        var cell = sh.getRange(row, col);
        var v = _dgInspectCell_(cell.getValue(), tz);
        if (v.fix) _dgWriteISO_(cell, v.iso);
      }
    }
  } catch (err) {
    // onEdit KHÔNG được ném (nuốt để không chặn thao tác người dùng); log để rà.
    try { Logger.log('dateGuardOnEdit error: %s', err && err.message); } catch (e2) {}
  }
}

/* ═══════════════ TẦNG 2 — DAILY SAFETY NET (time-based) ═══════════════ */
function dailyDateGuard() { return _dgScanAll_(true); }
function dateGuardDryRun() { return _dgScanAll_(false); }   // xem sẽ đổi gì mà không ghi

function _dgScanAll_(commit) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var grand = { scanned: 0, fixed: 0, bad: 0 };
  Logger.log('=== DateGuard %s === build=%s tz=%s', commit ? 'DAILY(commit)' : 'DRY-RUN', _DG_BUILD, tz);

  _DN_TARGETS.forEach(function (tgt) {
    var sh = ss.getSheetByName(tgt.sheet);
    if (!sh) { Logger.log('· [%s] SKIP — không thấy sheet', tgt.sheet); return; }
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return;
    var cols = _dgResolveCols_(sh, tgt);

    cols.forEach(function (c) {
      var n = lastRow - 1;
      var rng = sh.getRange(2, c.col1, n, 1);
      var vals = rng.getValues();
      var out = [], fixed = 0, bad = 0, badSamples = [], fixSamples = [];
      var touched = false;
      for (var i = 0; i < n; i++) {
        var raw = vals[i][0];
        var insp = _dgInspectCell_(raw, tz);
        if (insp.fix) {
          out.push([insp.iso]); fixed++; touched = true;
          if (fixSamples.length < 5) fixSamples.push(String(raw) + '  →  ' + insp.iso);
        } else {
          out.push([raw]);
          if (insp.bad) { bad++; if (badSamples.length < 5) badSamples.push('row ' + (i + 2) + ': ' + JSON.stringify(raw)); }
        }
      }
      grand.scanned += n; grand.fixed += fixed; grand.bad += bad;
      Logger.log('· [%s] col %s "%s": %s fix, %s bad / %s', tgt.sheet, c.col1, c.head, fixed, bad, n);
      fixSamples.forEach(function (s) { Logger.log('      fix: %s', s); });
      badSamples.forEach(function (s) { Logger.log('      ⚠ bad: %s', s); });
      if (commit && touched) {
        if (_DG_LOCK_PLAINTEXT) { try { rng.setNumberFormat('@'); } catch (e) { /* cột kiểu đã nhập chặn */ } }
        rng.setValues(out);
      }
    });
  });

  Logger.log('=== DateGuard %s — scanned %s, fixed %s, bad(kept) %s ===',
    commit ? 'DONE' : 'DRY-RUN', grand.scanned, grand.fixed, grand.bad);
  return grand;
}

/* ═══════════════ CÀI / GỠ TRIGGER ═══════════════ */
function installDateGuardTriggers() {
  uninstallDateGuardTriggers();                // idempotent — xoá bản cũ trước
  ScriptApp.newTrigger('dateGuardOnEdit').forSpreadsheet(SPREADSHEET_ID).onEdit().create();
  ScriptApp.newTrigger('dailyDateGuard').timeBased().atHour(_DG_DAILY_HOUR).everyDays(1).create();
  Logger.log('DateGuard: đã cài onEdit + daily@%sh (build %s). Chạy dailyDateGuard() 1 lần để dọn ngay.', _DG_DAILY_HOUR, _DG_BUILD);
}

function uninstallDateGuardTriggers() {
  var gone = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'dateGuardOnEdit' || fn === 'dailyDateGuard') { ScriptApp.deleteTrigger(t); gone++; }
  });
  if (gone) Logger.log('DateGuard: gỡ %s trigger cũ.', gone);
  return gone;
}

/* ═══════════════ SELF-TEST (parity với verify_date_guard.mjs) ═══════════════ */
function dateGuardSelfTest() {
  var tz = 'Asia/Ho_Chi_Minh';
  var cases = [
    ['2026-08-31', '2026-08-31'],
    ['31-thg 8-26', '2026-08-31'],
    ['31 tháng 8 2026', '2026-08-31'],
    ['31-Aug-26', '2026-08-31'],
    ['31/08/2026', '2026-08-31'],
    [new Date(Date.UTC(2026, 7, 31)), '2026-08-31'],
    ['', ''],
    ['không rõ', '']
  ];
  var ok = 0, ng = 0;
  cases.forEach(function (c) {
    var got = _dnToISO(c[0], tz);
    if (got === c[1]) { ok++; Logger.log('  ✓ %s → %s', c[0], got); }
    else { ng++; Logger.log('  ✗ %s → %s (kỳ vọng %s)', c[0], got, c[1]); }
  });
  Logger.log('dateGuardSelfTest: %s pass, %s fail', ok, ng);
  return { ok: ok, ng: ng };
}
