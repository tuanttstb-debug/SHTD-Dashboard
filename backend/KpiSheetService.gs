// ── KPI Summary Sheet operations ──
// Tab name: "KPI_Summary" – trong cùng SPREADSHEET_ID với Task_Master
//
// Schema ghi:
//   [SECTION, quangPTKD]
//   [ptkd, biz, bpm, total, rate]
//   ... rows ...
//   [SECTION, dungPTKD]
//   [ptkd, biz, bpm, total, rate, oldBiz, oldRate]
//   ... rows ...
//   [SECTION, agg]
//   [key, value]
//   ...

var KPI_SHEET_NAME = 'KPI_Summary';

/**
 * Ghi payload (mảng rows 2D) vào tab KPI_Summary.
 * Tạo tab mới nếu chưa tồn tại.
 */
function kpiSheetWrite(rows) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(KPI_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(KPI_SHEET_NAME);
  }
  sheet.clearContents();
  if (!rows || !rows.length) return;

  // Normalize: ensure all rows have same column count
  var maxCols = rows.reduce(function(m, r) { return Math.max(m, r.length); }, 0);
  var normalized = rows.map(function(r) {
    while (r.length < maxCols) r.push('');
    return r;
  });

  sheet.getRange(1, 1, normalized.length, maxCols).setValues(normalized);
}

/**
 * Đọc toàn bộ tab KPI_Summary.
 * Trả về mảng rows 2D, hoặc [] nếu tab chưa tồn tại.
 */
function kpiSheetRead() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(KPI_SHEET_NAME);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  return sheet.getDataRange().getValues();
}
