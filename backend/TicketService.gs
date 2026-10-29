// ── SHTD Dashboard – Ticket_Master sheet operations (32 cols A→AF) ──
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
//   Y..AE (24..30) cột Jira nối đuôi v6.72 — import GHI ĐÈ:
//     Project, Component/s, Loại yêu cầu NV, Sub-Tasks, Ngày nhận yêu cầu, Ngày dự kiến golive, Resolved
//   AF (31) PO phụ trách (username SHTD) v6.74 — cột team, chỉ ghi qua giao hàng loạt; trống = theo Reporter
//   Sheet cũ (24/31 cột) tự được thêm cột + header ở lần gọi đầu (_tkSheet).
//
// KHÔNG gọi setNumberFormat: sheet có thể ở dạng Bảng (cột đã nhập kiểu) → Sheets ném
// "không thể đặt định dạng số…" lúc flush, try/catch không bắt được (bài học S67.2, LIVE 29/10).
// Ngày Sheets tự đổi sang dd/MM/yyyy → client tkParseDate đọc được.

var TICKET_SHEET_NAME = 'Ticket_Master';

var TICKET_HEADER = [
  'Key', 'Issue Type', 'Summary', 'Description', 'Status', 'Resolution', 'Priority',
  'Assignee', 'Reporter', 'Created', 'Updated', 'Labels', 'Epic Link', 'Linked Issues',
  'UI', 'TLPT', 'Loại backlog',
  'Ưu tiên team', 'Quyết định planning', 'Kỳ planning', 'Initiative ID', 'Ghi chú',
  'Import lúc', 'Import bởi',
  'Project', 'Component/s', 'Loại yêu cầu NV', 'Sub-Tasks', 'Ngày nhận yêu cầu', 'Ngày dự kiến golive', 'Resolved',
  'PO phụ trách'
];

// Cột Jira (import ghi đè): A..N + Y..AE
var _TK_JIRA_COLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 24, 25, 26, 27, 28, 29, 30];
var _TK_TRANS    = [14, 15, 16];    // O..Q
var _TK_TEAM     = [17, 18, 19, 20, 21];
var _TK_IMP_AT   = 22;
var _TK_IMP_BY   = 23;
var _TK_PO       = 31;              // PO phụ trách — import không đụng, ticket-update không sửa

function _tkSheet(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(TICKET_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TICKET_SHEET_NAME);
    sheet.getRange(1, 1, 1, TICKET_HEADER.length).setValues([TICKET_HEADER]);
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  // Nâng schema sheet cũ: đủ số cột + header nối đuôi (chỉ ghi khi thiếu)
  if (sheet.getMaxColumns() < TICKET_HEADER.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), TICKET_HEADER.length - sheet.getMaxColumns());
  }
  var hdr = sheet.getRange(1, 1, 1, TICKET_HEADER.length).getDisplayValues()[0];
  if (String(hdr[TICKET_HEADER.length - 1]).trim() !== TICKET_HEADER[TICKET_HEADER.length - 1]) {
    sheet.getRange(1, 1, 1, TICKET_HEADER.length).setValues([TICKET_HEADER]);
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
    // getDisplayValues (KHÔNG getValues): Sheets tự đổi chuỗi ngày đã ghi sang Date →
    // String(Date) ra "Thu Oct 29 2026 …" + lệch múi giờ khi ghi lại dòng cũ (LIVE 29/10).
    var cur = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, TICKET_HEADER.length).getDisplayValues()
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
        while (row.length < TICKET_HEADER.length) row.push('');
        _TK_JIRA_COLS.forEach(function (c) { row[c] = inc[c]; });
        _TK_TRANS.forEach(function (c) { if (inc[c] !== '') row[c] = inc[c]; });
        row[_TK_IMP_AT] = now;
        row[_TK_IMP_BY] = inc[_TK_IMP_BY];
        cur[idx[key]] = row;
        updated++;
      } else {
        _TK_TEAM.forEach(function (c) { inc[c] = ''; });
        inc[_TK_PO] = '';
        appendRows.push(inc);
        added++;
      }
    }
    if (cur.length) {
      sheet.getRange(2, 1, cur.length, TICKET_HEADER.length).setValues(cur.map(_tkPad));
    }
    if (appendRows.length) {
      sheet.getRange(cur.length + 2, 1, appendRows.length, TICKET_HEADER.length).setValues(appendRows);
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
      sheet.getRange(target, ci + 1).setValue(patch[c] == null ? '' : String(patch[c]));
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

// Khóa so tên Jira ↔ User_Master (cùng thuật toán tkNameKey ở tickets-core.js):
// "Tuan Tran The <CG-SPTDDN.CB>" ≡ "Trần Thế Tuân" → "the tran tuan"
function _tkNameKey(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\[[^\]]*\]/g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().split(/[^a-z0-9]+/).filter(function (x) { return x; }).sort().join(' ');
}

// User_Master: { username, nameKey, team, active } theo username (không phân biệt hoa/thường); không có → null
function _tkUserInfo(username) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USER_SHEET_NAME);
  if (!sheet) return null;
  var data = sheet.getDataRange().getDisplayValues();
  var H = data[0].map(function (h) { return String(h).trim(); });
  var iUser = H.indexOf('Username'), iDisp = H.indexOf('Display_Name'), iTeam = H.indexOf('Team'), iAct = H.indexOf('Active');
  var want = String(username || '').trim().toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][iUser]).trim().toLowerCase() !== want) continue;
    return {
      username: String(data[i][iUser]).trim(),
      nameKey: _tkNameKey(data[i][iDisp]),
      team: iTeam >= 0 ? String(data[i][iTeam]).trim() : '',
      active: iAct < 0 || String(data[i][iAct]).toLowerCase() !== 'false'
    };
  }
  return null;
}

/**
 * Luật quyền thao tác hàng loạt (xóa · giao): Admin mọi ticket · người khác chỉ ticket mình là PO
 * = cột "PO phụ trách" là mình, hoặc cột đó trống và Reporter khớp họ tên User_Master
 * + sub-task của ticket đó (cột Sub-Tasks của cha hoặc KEY đầu summary).
 * @returns {function(row):boolean}
 */
function _tkOwnerCheck(cur, username, role) {
  if (role === 'Admin') return function () { return true; };
  var info = _tkUserInfo(username);
  var me = String(username || '').trim().toLowerCase();
  var owned = {}, parentByCol = {};
  cur.forEach(function (r) {
    var key = String(r[0]).trim().toUpperCase();
    var assigned = String(r[_TK_PO] || '').trim().toLowerCase();
    if (assigned ? assigned === me : !!(info && info.nameKey && _tkNameKey(r[8]) === info.nameKey)) owned[key] = true;
    (String(r[27] || '').toUpperCase().match(/[A-Z][A-Z0-9]+-\d+/g) || []).forEach(function (k) { parentByCol[k] = key; });
  });
  return function (r) {
    var key = String(r[0]).trim().toUpperCase();
    if (owned[key]) return true;
    var p = parentByCol[key] || '';
    if (!p && /sub-?\s*task/i.test(String(r[1]))) {
      var m = String(r[2] || '').match(/^\s*([A-Z][A-Z0-9]+-\d+)\b/);
      p = m ? m[1].toUpperCase() : '';
    }
    return !!(p && owned[p]);
  };
}

function _tkWantSet(keys) {
  var want = {};
  (keys || []).forEach(function (k) { k = String(k).trim().toUpperCase(); if (k) want[k] = true; });
  return want;
}

/**
 * Xóa hàng loạt theo _tkOwnerCheck. Ghi lại khối dữ liệu 1 lần (không deleteRow từng dòng — chậm với vài trăm dòng).
 * @returns {{deleted:number, denied:string[]}}
 */
function ticketDeleteBulk(keys, username, role) {
  var want = _tkWantSet(keys);
  var lock = _acquireWriteLock();
  try {
    var sheet = _tkSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { deleted: 0, denied: [] };
    var cur = sheet.getRange(2, 1, lastRow - 1, TICKET_HEADER.length).getDisplayValues();
    var can = _tkOwnerCheck(cur, username, role);
    var keep = [], deleted = 0, denied = [];
    cur.forEach(function (r) {
      var key = String(r[0]).trim().toUpperCase();
      if (!want[key]) { keep.push(r); return; }
      if (can(r)) deleted++; else { denied.push(key); keep.push(r); }
    });
    if (deleted) {
      sheet.getRange(2, 1, cur.length, TICKET_HEADER.length).clearContent();
      if (keep.length) sheet.getRange(2, 1, keep.length, TICKET_HEADER.length).setValues(keep.map(_tkPad));
      SpreadsheetApp.flush();
    }
    return { deleted: deleted, denied: denied };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Giao hàng loạt: ghi cột "PO phụ trách" = username người nhận (phải có trong User_Master, đang Active).
 * Quyền theo _tkOwnerCheck — giao xong người nhận thành chủ ticket (người giao mất quyền, trừ Admin).
 * Chỉ ghi 1 cột (không ghi lại cả khối).
 * @returns {{assigned:number, denied:string[]}}
 */
function ticketAssignBulk(keys, to, username, role) {
  var target = _tkUserInfo(to);
  if (!target || !target.active) throw new Error('BAD_USER');
  var want = _tkWantSet(keys);
  var lock = _acquireWriteLock();
  try {
    var sheet = _tkSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { assigned: 0, denied: [] };
    var cur = sheet.getRange(2, 1, lastRow - 1, TICKET_HEADER.length).getDisplayValues();
    var can = _tkOwnerCheck(cur, username, role);
    var col = cur.map(function (r) { return [String(r[_TK_PO] || '')]; });
    var assigned = 0, denied = [];
    cur.forEach(function (r, i) {
      var key = String(r[0]).trim().toUpperCase();
      if (!want[key]) return;
      if (can(r)) { col[i][0] = target.username; assigned++; } else denied.push(key);
    });
    if (assigned) {
      sheet.getRange(2, _TK_PO + 1, col.length, 1).setValues(col);
      SpreadsheetApp.flush();
    }
    return { assigned: assigned, denied: denied };
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
