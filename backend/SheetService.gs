// ── SHTD Dashboard – Sheet read/write operations ──

/**
 * Đọc toàn bộ dữ liệu Task_Master dưới dạng mảng 2D (display values).
 * Row 0 là header; từ row 1 trở đi là dữ liệu.
 * @returns {string[][]}
 */
function sheetRead() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + SHEET_NAME);

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  var lastCol = sheet.getLastColumn();
  var range   = sheet.getRange(1, 1, lastRow, lastCol);
  return range.getDisplayValues();
}

/**
 * Ghi đè toàn bộ Task_Master bằng mảng 2D mới.
 * values[0] phải là header row (DB_COLS); values[1..] là data rows.
 * Xóa nội dung cũ trước khi ghi để tránh orphan rows.
 * @param {Array[]} values
 */
function sheetWrite(values) {
  if (!values || values.length === 0) {
    throw new Error('Không thể ghi mảng rỗng lên Sheet.');
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet: ' + SHEET_NAME);

  // Xóa vùng dữ liệu cũ (giữ nguyên format ô, chỉ clear content)
  var numCols = values[0].length;
  var oldRows = sheet.getLastRow();
  if (oldRows > 0) {
    sheet.getRange(1, 1, oldRows, numCols).clearContent();
  }

  // Ghi dữ liệu mới bắt đầu từ A1
  var targetRange = sheet.getRange(1, 1, values.length, numCols);
  targetRange.setValues(values);

  SpreadsheetApp.flush();
}
