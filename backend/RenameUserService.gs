/**
 * RenameUserService.gs — One-time migration: PhuongNPL_C → PhuongNPL
 *
 * Sheets updated (case-insensitive exact-value match):
 *   User_Master      : col "Username"
 *   Task_Master      : cols "PIC Accountable", "PIC Responsible", "PIC Support"
 *   Case_Pipeline    : col "PIC"
 *   Issue_Tracker    : cols "Người log", "Người xử lý"
 *   Initiative_Master: col "Accountable"
 *
 * Sheets NOT touched: Audit_Log (lịch sử giữ nguyên)
 *
 * Usage (GAS Editor):
 *   1. Run dryRunRenamePhuong()  → xem Logger output, kiểm tra số cell sẽ thay đổi
 *   2. Run commitRenamePhuong()  → ghi thực sự vào Sheets
 *
 * Sau khi commit: yêu cầu user PhuongNPL_C đăng xuất và đăng nhập lại bằng
 * username mới "PhuongNPL" để session token được cấp lại với username đúng.
 */

var _REN_OLD = 'PhuongNPL_C';
var _REN_NEW = 'PhuongNPL';

/* ── Public entry points ── */
function dryRunRenamePhuong()  { _runRenamePhuong(true);  }
function commitRenamePhuong()  { _runRenamePhuong(false); }

/* ── Core migration ── */
function _runRenamePhuong(dryRun) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var label = dryRun ? '[DRY RUN]' : '[COMMIT]';
  Logger.log('%s ════════════════════════════════════════', label);
  Logger.log('%s Rename user: "%s" → "%s"', label, _REN_OLD, _REN_NEW);
  Logger.log('%s ════════════════════════════════════════', label);

  var allChanges = [];

  allChanges = allChanges.concat(
    _renameInSheet(ss, 'User_Master',       ['Username'],                                   dryRun)
  );
  allChanges = allChanges.concat(
    _renameInSheet(ss, 'Task_Master',       ['PIC Accountable', 'PIC Responsible', 'PIC Support'], dryRun)
  );
  allChanges = allChanges.concat(
    _renameInSheet(ss, 'Case_Pipeline',     ['PIC'],                                        dryRun)
  );
  allChanges = allChanges.concat(
    _renameInSheet(ss, 'Issue_Tracker',     ['Người log', 'Người xử lý'],                  dryRun)
  );
  allChanges = allChanges.concat(
    _renameInSheet(ss, 'Initiative_Master', ['Accountable'],                                dryRun)
  );

  Logger.log('%s ────────────────────────────────────────', label);
  Logger.log('%s TOTAL cells %s: %s',
    label, dryRun ? 'sẽ được cập nhật' : 'đã cập nhật', allChanges.length);

  if (allChanges.length === 0) {
    Logger.log('%s Không tìm thấy "%s" trong bất kỳ sheet nào (đã migrate rồi?)', label, _REN_OLD);
  }

  for (var i = 0; i < allChanges.length; i++) {
    var c = allChanges[i];
    Logger.log('  %s | %-20s | row %-4s | col %-3s | header: "%-25s" | "%s" → "%s"',
      label, c.sheet, c.row, c.col, c.header, c.oldVal, _REN_NEW);
  }

  if (!dryRun && allChanges.length > 0) {
    Logger.log('%s ════════════════════════════════════════', label);
    Logger.log('[COMMIT] Migration hoàn tất.');
    Logger.log('[COMMIT] Yêu cầu user "%s" đăng xuất và đăng nhập lại với username mới "%s".',
      _REN_OLD, _REN_NEW);
  }
}

/**
 * Scan một sheet, tìm OLD_USERNAME trong các cột chỉ định, thay bằng NEW_USERNAME.
 *
 * Column matching: chuẩn hóa (lowercase, bỏ khoảng trắng) rồi so sánh startsWith,
 * để bắt được tên cột dài như "PIC Accountable (Teamlead – chịu trách nhiệm)".
 *
 * Value matching: exact case-insensitive (trim), tránh partial replace.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string}   sheetName
 * @param {string[]} colKeywords   Danh sách tên cột cần kiểm tra
 * @param {boolean}  dryRun        true = chỉ log, không ghi
 * @returns {Object[]} Danh sách change records
 */
function _renameInSheet(ss, sheetName, colKeywords, dryRun) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('WARN: sheet "%s" không tìm thấy — bỏ qua', sheetName);
    return [];
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('INFO: sheet "%s" trống (< 2 rows) — bỏ qua', sheetName);
    return [];
  }

  var headers = data[0];

  /* Tìm index của từng cột theo keyword (normalized startsWith) */
  var targets = [];   // [{ idx: number, header: string }]
  for (var k = 0; k < colKeywords.length; k++) {
    var kw    = colKeywords[k];
    var nkw   = _renNorm(kw);
    var found = -1;
    var foundHeader = '';

    for (var h = 0; h < headers.length; h++) {
      var nh = _renNorm(String(headers[h]));
      /* startsWith: "picaccountable(teamlead..." bắt đầu bằng "picaccountable" */
      if (nh === nkw || nh.indexOf(nkw) === 0) {
        found = h;
        foundHeader = String(headers[h]).trim();
        break;
      }
    }

    if (found === -1) {
      Logger.log('WARN: [%s] cột "%s" không tìm thấy — bỏ qua. Headers hiện tại: [%s]',
        sheetName, kw, headers.map(function(h) { return '"' + h + '"'; }).join(', '));
    } else {
      targets.push({ idx: found, header: foundHeader });
      Logger.log('INFO: [%s] cột "%s" → khớp với "%s" (col %s)',
        sheetName, kw, foundHeader, found + 1);
    }
  }

  if (targets.length === 0) return [];

  var oldNorm  = _renNorm(_REN_OLD);
  var changes  = [];

  for (var i = 1; i < data.length; i++) {
    for (var t = 0; t < targets.length; t++) {
      var colIdx = targets[t].idx;
      var val    = String(data[i][colIdx] || '').trim();

      /* Exact case-insensitive match (không partial replace) */
      if (_renNorm(val) === oldNorm) {
        changes.push({
          sheet:  sheetName,
          row:    i + 1,
          col:    colIdx + 1,
          header: targets[t].header,
          oldVal: val,
        });
        if (!dryRun) {
          sheet.getRange(i + 1, colIdx + 1).setValue(_REN_NEW);
        }
      }
    }
  }

  if (!dryRun && changes.length > 0) {
    SpreadsheetApp.flush();
  }

  Logger.log('  → [%s] %s cell(s) %s trong [%s]',
    sheetName,
    changes.length,
    dryRun ? 'sẽ thay đổi' : 'đã thay đổi',
    colKeywords.join(', '));

  return changes;
}

/* Normalize: lowercase + strip whitespace, dấu gạch, dấu gạch chéo */
function _renNorm(s) {
  return String(s || '').toLowerCase().replace(/[\s\t\-\/]+/g, '');
}
