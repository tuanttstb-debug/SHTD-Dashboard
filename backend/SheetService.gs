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
