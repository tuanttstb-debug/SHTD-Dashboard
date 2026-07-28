// ── SHTD Dashboard – Dev_Plan sheet operations (12 cols A→L) ──
// A=ID, B=Nội dung công việc, C=Sản phẩm/Kết quả mục tiêu, D=PIC,
// E=Đơn vị phối hợp/phụ thuộc, F=Thời gian bắt đầu, G=Thời gian dự kiến kết thúc,
// H=Trạng thái, I=Tỷ lệ hoàn thành, J=Ghi chú, K=Review cuối, L=Người tạo
//
// "Plan phát triển bản thân" — mỗi cá nhân tự thêm công việc học tập / tự đào tạo.
// Ownership: chỉ PIC (chủ dòng) hoặc Admin được ghi/xóa — enforce ở Code.gs.

var DEV_SHEET_NAME = 'Dev_Plan';

var DEV_HEADER = [
  'ID', 'Nội dung công việc', 'Sản phẩm/Kết quả mục tiêu', 'PIC',
  'Đơn vị phối hợp/phụ thuộc', 'Thời gian bắt đầu', 'Thời gian dự kiến kết thúc',
  'Trạng thái', 'Tỷ lệ hoàn thành', 'Ghi chú', 'Review cuối', 'Người tạo'
];

/**
 * Đọc toàn bộ Dev_Plan dưới dạng mảng 2D (display values).
 * Tự tạo sheet với header nếu chưa tồn tại.
 */
function devRead() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(DEV_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(DEV_SHEET_NAME);
    sheet.getRange(1, 1, 1, DEV_HEADER.length).setValues([DEV_HEADER]);
    SpreadsheetApp.flush();
    return [DEV_HEADER];
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  var lastCol = Math.max(sheet.getLastColumn(), DEV_HEADER.length);
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

/**
 * Trả về giá trị PIC (cột D) hiện có của 1 ID — dùng cho ownership check.
 * Trả về null nếu ID chưa tồn tại (dòng mới → ai cũng tạo được cho chính mình).
 */
function devGetPicById(devId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(DEV_SHEET_NAME);
  if (!sheet) return null;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues(); // A..D
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(devId).trim()) {
      return String(data[i][3] || '').trim(); // cột D = PIC
    }
  }
  return null;
}

/**
 * Tìm row theo Dev ID (cột A) và update in-place. Nếu không có → append row mới.
 */
function devUpsertRow(rowValues, devId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(DEV_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DEV_SHEET_NAME);
    sheet.getRange(1, 1, 1, DEV_HEADER.length).setValues([DEV_HEADER]);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    sheet.getRange(1, 1, 1, DEV_HEADER.length).setValues([DEV_HEADER]);
    lastRow = 1;
  }

  var targetRow = -1;
  if (lastRow > 1) {
    var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idCol.length; i++) {
      if (String(idCol[i][0]).trim() === String(devId).trim()) {
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
 * Tìm row theo Dev ID (cột A) và xóa row đó.
 */
function devDeleteRow(devId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(DEV_SHEET_NAME);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]).trim() === String(devId).trim()) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return;
    }
  }
}
