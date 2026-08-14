// ── SHTD Dashboard – Sheet read/write operations ──

/**
 * Đọc toàn bộ dữ liệu Task_Master dưới dạng mảng 2D (display values).
 * Row 0 là header; từ row 1 trở đi là dữ liệu.
 * @returns {string[][]}
 */
function _getTaskTs() {
  return PropertiesService.getScriptProperties().getProperty('TASK_WRITE_TS') || '0';
}

function _setTaskTs() {
  PropertiesService.getScriptProperties().setProperty('TASK_WRITE_TS', String(Date.now()));
}

function sheetRead(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + SHEET_NAME);

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return { values: [], serverTs: _getTaskTs() };

  var lastCol = sheet.getLastColumn();
  var range   = sheet.getRange(1, 1, lastRow, lastCol);
  return { values: range.getDisplayValues(), serverTs: _getTaskTs() };
}

/**
 * Ghi đè toàn bộ Task_Master bằng mảng 2D mới.
 * values[0] phải là header row (DB_COLS); values[1..] là data rows.
 * clientTs: timestamp client đọc lần cuối — nếu khác serverTs → VERSION_CONFLICT.
 * @param {Array[]} values
 * @param {string|undefined} clientTs
 */
function sheetWrite(values, clientTs) {
  if (!values || values.length === 0) {
    throw new Error('Không thể ghi mảng rỗng lên Sheet.');
  }

  if (clientTs !== undefined && clientTs !== null && clientTs !== '') {
    var serverTs = _getTaskTs();
    if (String(clientTs) !== String(serverTs)) {
      throw new Error('VERSION_CONFLICT');
    }
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + SHEET_NAME);

  var numCols = values[0].length;
  var oldRows = sheet.getLastRow();
  if (oldRows > 0) {
    sheet.getRange(1, 1, oldRows, numCols).clearContent();
  }

  var targetRange = sheet.getRange(1, 1, values.length, numCols);
  targetRange.setValues(values);
  SpreadsheetApp.flush();

  _setTaskTs();
}

/**
 * Tìm row theo Task ID (cột A) và update in-place.
 * Nếu không tìm thấy ID → append row mới ở cuối.
 * @param {Array} rowValues   - mảng 24 phần tử (DB_COLS)
 * @param {string} taskId
 */
function sheetUpsertTask(rowValues, taskId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet không tìm thấy: ' + SHEET_NAME);

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) throw new Error('Task_Master trống, thiếu header row.');

  var targetRow = -1;
  if (lastRow > 1) {
    var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idCol.length; i++) {
      if (String(idCol[i][0]).trim() === String(taskId).trim()) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow !== -1) {
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.getRange(lastRow + 1, 1, 1, rowValues.length).setValues([rowValues]);
  }
  SpreadsheetApp.flush();
  _setTaskTs();
}

// ── Ownership-first scoped read (Phase C) ──
// Đọc CHỈ các task "của tôi + team tôi" đang mở (gồm quá hạn) để giảm payload lần load đầu.
// Chỉ áp cho User thường (Admin/Teamlead vẫn đọc full ở Code.gs). Client sẽ full-load nền ngay sau.

function _normLc(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

// Tìm cột theo từ khóa (so khớp sau khi bỏ dấu cách/gạch → "chứa"). Bền với đuôi mô tả dài trong header.
function _hIdx(H, kw) {
  var nkw = String(kw).toLowerCase().replace(/[\s\n\t_\-\/]+/g, '');
  for (var i = 0; i < H.length; i++) {
    var nh = String(H[i] == null ? '' : H[i]).toLowerCase().replace(/[\s\n\t_\-\/]+/g, '');
    if (nh.indexOf(nkw) !== -1) return i;
  }
  return -1;
}

// Team của user (đọc từ User_Master theo Username). Rỗng nếu không tra được.
function resolveUserTeam(ss, username) {
  try {
    var ul   = userList(ss);
    var H    = ul.header, rows = ul.rows;
    var iU   = H.indexOf('Username');
    var iT   = H.indexOf('Team');
    if (iU < 0 || iT < 0) return '';
    var me = _normLc(username);
    for (var i = 0; i < rows.length; i++) {
      if (_normLc(rows[i][iU]) === me) return String(rows[i][iT] || '').trim();
    }
  } catch (e) {}
  return '';
}

// Trả [header, ...rows] chỉ gồm task thuộc phạm vi "của tôi + team" và CHƯA hoàn thành
// (quá hạn ⇒ chưa xong nên đã nằm trong). Khớp ngữ nghĩa _mwGetMyTasks phía client.
function taskRowsScopedMine(ss, username, team) {
  var res    = sheetRead(ss);
  var values = res.values;
  if (!values || values.length < 2) return values || [];

  var H     = values[0];
  var iAcc  = _hIdx(H, 'PIC Accountable');
  var iRes  = _hIdx(H, 'PIC Responsible');
  var iTeam = _hIdx(H, 'Team chính');
  var iState= _hIdx(H, 'Trạng thái');
  var iProg = _hIdx(H, '% HT');

  var me     = _normLc(username);
  var myTeam = _normLc(team);
  var doneLc = _normLc('Hoàn thành');

  var out = [H];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var own = (iAcc  > -1 && _normLc(r[iAcc]) === me) ||
              (iRes  > -1 && _normLc(r[iRes]) === me) ||
              (myTeam && iTeam > -1 && _normLc(r[iTeam]) === myTeam);
    if (!own) continue;
    var prog = parseInt(String(iProg > -1 ? r[iProg] : '').replace(/[^0-9]/g, ''), 10) || 0;
    var done = (iState > -1 && _normLc(r[iState]) === doneLc) || prog >= 100;
    if (done) continue;   // bỏ task đã hoàn thành (full-load nền sẽ bổ sung sau)
    out.push(r);
  }
  return out;
}

/**
 * Tìm row theo Task ID (cột A) và xóa row đó.
 * @param {string} taskId
 */
function sheetDeleteTask(taskId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]).trim() === String(taskId).trim()) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      _setTaskTs();
      return;
    }
  }
}
