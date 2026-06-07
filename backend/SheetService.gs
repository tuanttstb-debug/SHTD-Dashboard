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

function sheetRead() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
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
