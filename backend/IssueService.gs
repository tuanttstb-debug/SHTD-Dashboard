// ── SHTD Dashboard – Issue_Tracker sheet operations (18 cols A→R) ──
// A=ID, B=Ngày phát sinh, C=Tiêu đề, D=Hệ thống, E=Loại issue,
// F=Mức độ, G=Loại xử lý, H=Trạng thái, I=Phòng ban,
// J=Nguyên nhân, K=Đề xuất, L=Deadline xử lý, M=Ngày giải quyết,
// N=Ticket ngoài, O=Ảnh hưởng NV, P=Người log, Q=Người xử lý, R=Ghi chú

var ISSUE_SHEET_NAME = 'Issue_Tracker';

var ISSUE_HEADER = [
  'ID', 'Ngày phát sinh', 'Tiêu đề', 'Hệ thống', 'Loại issue',
  'Mức độ', 'Loại xử lý', 'Trạng thái', 'Phòng ban',
  'Nguyên nhân', 'Đề xuất', 'Deadline xử lý', 'Ngày giải quyết',
  'Ticket ngoài', 'Ảnh hưởng NV', 'Người log', 'Người xử lý', 'Ghi chú'
];

/**
 * Đọc toàn bộ Issue_Tracker dưới dạng mảng 2D (display values).
 * Tự tạo sheet với header nếu chưa tồn tại.
 */
function issueRead(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(ISSUE_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(ISSUE_SHEET_NAME);
    sheet.getRange(1, 1, 1, ISSUE_HEADER.length).setValues([ISSUE_HEADER]);
    SpreadsheetApp.flush();
    return [ISSUE_HEADER];
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  var lastCol = Math.max(sheet.getLastColumn(), ISSUE_HEADER.length);
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

/**
 * Tìm row theo Issue ID (cột A) và update in-place.
 * Nếu không tìm thấy → append row mới.
 */
function issueUpsertRow(rowValues, issueId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(ISSUE_SHEET_NAME);
  if (!sheet) throw new Error('Sheet không tìm thấy: ' + ISSUE_SHEET_NAME);

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) throw new Error('Issue_Tracker trống, thiếu header row.');

  var targetRow = -1;
  if (lastRow > 1) {
    var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idCol.length; i++) {
      if (String(idCol[i][0]).trim() === String(issueId).trim()) {
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
}

/**
 * Tìm row theo Issue ID (cột A) và xóa row đó.
 */
function issueDeleteRow(issueId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(ISSUE_SHEET_NAME);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]).trim() === String(issueId).trim()) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return;
    }
  }
}
