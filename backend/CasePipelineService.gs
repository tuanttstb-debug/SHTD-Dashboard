// ── SHTD Dashboard – Case_Pipeline sheet operations (20 cols A→T) ──
// Col semantics:
//   A=ID, B=Tuần BC, C=Team, D=PIC, E=ĐVKD, F=Khách hàng/Case
//   G=Loại hình, H=Mức độ phức tạp, I=Phương án, J=Giá trị (tỷ đồng)
//   K=Stage, L=Vướng mắc chính, M=Next step
//   N=Start Date, O=Deadline, P=RAG
//   Q=Cần BLĐ?, R=Highlight dashboard?, S=Ghi chú
//   T=Ý kiến BLĐ (marker quyết định BLĐ về case)

var CASE_SHEET_NAME = 'Case_Pipeline';

var CASE_HEADER = [
  'ID', 'Tuần BC', 'Team', 'PIC', 'ĐVKD', 'Khách hàng / Case',
  'Loại hình', 'Mức độ phức tạp', 'Phương án', 'Giá trị (tỷ đồng)',
  'Stage', 'Vướng mắc chính', 'Next step',
  'Start Date', 'Deadline', 'RAG',
  'Cần BLĐ?', 'Highlight dashboard?', 'Ghi chú', 'Ý kiến BLĐ'
];

/**
 * Đọc toàn bộ Case_Pipeline dưới dạng mảng 2D (display values).
 * Tự tạo sheet với header nếu chưa tồn tại.
 * @returns {string[][]}
 */
function caseRead() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CASE_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CASE_SHEET_NAME);
    sheet.getRange(1, 1, 1, CASE_HEADER.length).setValues([CASE_HEADER]);
    SpreadsheetApp.flush();
    return [CASE_HEADER];
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  var lastCol = Math.max(sheet.getLastColumn(), CASE_HEADER.length);
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

/**
 * Ghi đè toàn bộ Case_Pipeline.
 * values[0] phải là header row; values[1..] là data rows.
 * @param {Array[]} values
 */
function caseWrite(values) {
  if (!values || values.length === 0) {
    throw new Error('Không thể ghi mảng rỗng lên Sheet Case_Pipeline.');
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CASE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CASE_SHEET_NAME);
  }

  var numCols = values[0].length;
  var oldRows = sheet.getLastRow();
  if (oldRows > 0) {
    var clearCols = Math.max(numCols, sheet.getLastColumn());
    sheet.getRange(1, 1, oldRows, clearCols).clearContent();
  }

  sheet.getRange(1, 1, values.length, numCols).setValues(values);
  SpreadsheetApp.flush();
}
