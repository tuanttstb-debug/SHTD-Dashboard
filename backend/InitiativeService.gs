// ── SHTD Dashboard – Initiative_Master sheet operations ──

var INI_SHEET_NAME = 'Initiative_Master';

/**
 * Đọc toàn bộ dữ liệu Initiative_Master dưới dạng mảng 2D (display values).
 * Tạo sheet mới với header nếu chưa tồn tại.
 * @returns {string[][]}
 */
function initiativeRead() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(INI_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(INI_SHEET_NAME);
    var header = ['ID','Tên Initiative / Milestone','Category','Accountable',
                  'Start Date','Deadline / Target','% HT','Milestone Đang track',
                  'Deadline Milestone','Trạng thái','Mục tiêu / KPI đầu ra',
                  'Ghi chú','Link tài liệu','Parent ID'];
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    SpreadsheetApp.flush();
    return [header];
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  var lastCol = sheet.getLastColumn();
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

/**
 * Ghi đè toàn bộ Initiative_Master bằng mảng 2D mới.
 * values[0] phải là header row (INI_COLS); values[1..] là data rows.
 * @param {Array[]} values
 */
function initiativeWrite(values) {
  if (!values || values.length === 0) {
    throw new Error('Không thể ghi mảng rỗng lên Sheet Initiative_Master.');
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(INI_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(INI_SHEET_NAME);
  }

  var numCols = values[0].length;
  var oldRows = sheet.getLastRow();
  if (oldRows > 0) {
    sheet.getRange(1, 1, oldRows, numCols).clearContent();
  }

  var targetRange = sheet.getRange(1, 1, values.length, numCols);
  targetRange.setValues(values);

  SpreadsheetApp.flush();
}
