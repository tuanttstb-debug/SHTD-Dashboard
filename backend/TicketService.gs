// ── SHTD Dashboard – Ticket_Master sheet operations (24 cols A→X) ──
// Backlog IT: ticket Jira DCB của team, nạp bằng file xuất Jira (hub AIOS D22, 2026-10-29).
// Jira là nơi nhập duy nhất → import upsert theo Key; SHTD chỉ giữ cột quản trị của team.
//
//   A..N (0..13)  cột Jira — import GHI ĐÈ:
//     Key, Issue Type, Summary, Description, Status, Resolution, Priority,
//     Assignee, Reporter, Created, Updated, Labels, Epic Link, Linked Issues
//   O..Q (14..16) cột chuyển tiếp (UI, TLPT, Loại backlog) — import chỉ ghi khi file có giá trị
//                 (bảng tay của PO); label chuẩn trên Jira được ưu tiên ở client.
//   R..V (17..21) cột team — import KHÔNG đụng, sửa trên SHTD:
//     Ưu tiên team, Quyết định planning, Kỳ planning, Initiative ID, Ghi chú
//   W..X (22..23) Import lúc, Import bởi

var TICKET_SHEET_NAME = 'Ticket_Master';

var TICKET_HEADER = [
  'Key', 'Issue Type', 'Summary', 'Description', 'Status', 'Resolution', 'Priority',
  'Assignee', 'Reporter', 'Created', 'Updated', 'Labels', 'Epic Link', 'Linked Issues',
  'UI', 'TLPT', 'Loại backlog',
  'Ưu tiên team', 'Quyết định planning', 'Kỳ planning', 'Initiative ID', 'Ghi chú',
  'Import lúc', 'Import bởi'
];

var _TK_JIRA_N   = 14;              // A..N
var _TK_TRANS    = [14, 15, 16];    // O..Q
var _TK_TEAM     = [17, 18, 19, 20, 21];
var _TK_IMP_AT   = 22;
var _TK_IMP_BY   = 23;

function _tkSheet(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(TICKET_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TICKET_SHEET_NAME);
    // Toàn bộ là text thuần → Sheets không tự đổi '2026-10-28' sang ngày theo locale.
    try { sheet.getRange(1, 1, sheet.getMaxRows(), TICKET_HEADER.length).setNumberFormat('@'); } catch (e) {}
    sheet.getRange(1, 1, 1, TICKET_HEADER.length).setValues([TICKET_HEADER]);
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  return sheet;
}

/** Đọc toàn bộ Ticket_Master (display values). Tự tạo sheet nếu chưa có. */
function ticketRead(ss) {
  var sheet = _tkSheet(ss);
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [TICKET_HEADER];
  var lastCol = Math.max(sheet.getLastColumn(), TICKET_HEADER.length);
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

function _tkPad(row) {
  var out = [];
  for (var i = 0; i < TICKET_HEADER.length; i++) out.push(row && row[i] != null ? String(row[i]) : '');
  return out;
}

/**
 * Import hàng loạt: rows = mảng dòng theo TICKET_HEADER (client đã parse file Jira).
 * Ticket đã có → ghi đè cột Jira, cột chuyển tiếp chỉ ghi khi có giá trị, giữ cột team.
 * Ticket mới → thêm dòng. Không xóa ticket vắng mặt (mỗi PO import line của mình).
 * @returns {{added:number, updated:number, total:number}}
 */
function ticketImport(rows, username) {
  var lock = _acquireWriteLock();
  try {
    var sheet = _tkSheet();
    var lastRow = sheet.getLastRow();
    var cur = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, TICKET_HEADER.length).getValues()
      : [];
    var idx = {};
    for (var i = 0; i < cur.length; i++) {
      var k = String(cur[i][0]).trim().toUpperCase();
      if (k) idx[k] = i;
    }
    var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd HH:mm");
    var added = 0, updated = 0, appendRows = [];
    var seen = {};
    for (var r = 0; r < rows.length; r++) {
      var inc = _tkPad(rows[r]);
      var key = inc[0].trim().toUpperCase();
      if (!key || seen[key]) continue;
      seen[key] = true;
      inc[0] = key;
      inc[_TK_IMP_AT] = now;
      inc[_TK_IMP_BY] = username || '';
      if (idx.hasOwnProperty(key)) {
        var row = cur[idx[key]].map(function (v) { return v == null ? '' : String(v); });
        for (var c = 0; c < _TK_JIRA_N; c++) row[c] = inc[c];
        _TK_TRANS.forEach(function (c) { if (inc[c] !== '') row[c] = inc[c]; });
        row[_TK_IMP_AT] = now;
        row[_TK_IMP_BY] = inc[_TK_IMP_BY];
        cur[idx[key]] = row;
        updated++;
      } else {
        _TK_TEAM.forEach(function (c) { inc[c] = ''; });
        appendRows.push(inc);
        added++;
      }
    }
    if (cur.length) {
      var rng = sheet.getRange(2, 1, cur.length, TICKET_HEADER.length);
      try { rng.setNumberFormat('@'); } catch (e) {}
      rng.setValues(cur.map(_tkPad));
    }
    if (appendRows.length) {
      var rng2 = sheet.getRange(cur.length + 2, 1, appendRows.length, TICKET_HEADER.length);
      try { rng2.setNumberFormat('@'); } catch (e) {}
      rng2.setValues(appendRows);
    }
    SpreadsheetApp.flush();
    return { added: added, updated: updated, total: cur.length + appendRows.length };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sửa cột quản trị của 1 ticket (UI/TLPT/Loại + cột team). patch = { colIndex: value }.
 * Chỉ nhận chỉ số trong _TK_TRANS + _TK_TEAM — cột Jira không sửa trên SHTD.
 */
function ticketUpdate(key, patch) {
  var allowed = _TK_TRANS.concat(_TK_TEAM);
  var lock = _acquireWriteLock();
  try {
    var sheet = _tkSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('Không tìm thấy ticket ' + key);
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var target = -1, want = String(key).trim().toUpperCase();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]).trim().toUpperCase() === want) { target = i + 2; break; }
    }
    if (target === -1) throw new Error('Không tìm thấy ticket ' + key);
    for (var c in patch) {
      var ci = parseInt(c, 10);
      if (allowed.indexOf(ci) === -1) continue;
      var cell = sheet.getRange(target, ci + 1);
      try { cell.setNumberFormat('@'); } catch (e) {}
      cell.setValue(patch[c] == null ? '' : String(patch[c]));
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

/** Xóa 1 ticket (Admin) — vd ticket nhập nhầm line khác. */
function ticketDelete(key) {
  var sheet = _tkSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var want = String(key).trim().toUpperCase();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim().toUpperCase() === want) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return;
    }
  }
}
