/**
 * SHTD Dashboard – Google Apps Script Web App
 * ─────────────────────────────────────────────
 * Chức năng: Nhận dữ liệu POST từ dashboard HTML
 *            và ghi đè vào sheet Task_Master.
 *
 * HƯỚNG DẪN TRIỂN KHAI (làm 1 lần):
 * 1. Mở Google Sheet: https://docs.google.com/spreadsheets/d/1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk
 * 2. Menu → Extensions → Apps Script
 * 3. Xóa code mặc định, dán toàn bộ file này vào
 * 4. Nhấn Save (Ctrl+S)
 * 5. Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me (tài khoản Google của bạn)
 *    - Who has access: Anyone   ← quan trọng
 * 6. Nhấn Deploy → Copy Web App URL
 * 7. Dán URL vào file HTML tại dòng:
 *    const GS_WEBAPP_URL = 'PASTE_URL_HERE';
 * 8. Mỗi khi sửa script này → Deploy → New deployment (version mới)
 */

const SPREADSHEET_ID = '1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk';
const SHEET_NAME     = 'Task_Master';

// ── GET: health check (dùng để test deployment) ──
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'SHTD Apps Script is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: nhận dữ liệu từ dashboard và ghi vào Sheets ──
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload.action === 'write') {
      return handleWrite(payload.values);
    }

    return jsonResponse({ status: 'error', error: 'Unknown action: ' + payload.action });

  } catch (err) {
    return jsonResponse({ status: 'error', error: err.toString() });
  }
}

// ── Ghi đè toàn bộ sheet Task_Master ──
function handleWrite(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return jsonResponse({ status: 'error', error: 'No data received' });
  }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return jsonResponse({ status: 'error', error: 'Sheet "' + SHEET_NAME + '" not found' });
  }

  // Xóa nội dung cũ (giữ header nếu muốn, nhưng values[0] đã là header)
  sheet.clearContents();

  // Ghi toàn bộ dữ liệu mới (header + data rows)
  const numRows = values.length;
  const numCols = values[0].length;
  sheet.getRange(1, 1, numRows, numCols).setValues(values);

  // Format hàng header: in đậm, nền xanh nhạt
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#E3F2FD');
  headerRange.setWrap(true);

  // Freeze hàng header
  sheet.setFrozenRows(1);

  // Tự động điều chỉnh độ rộng cột
  sheet.autoResizeColumns(1, numCols);

  // Ghi log thời gian cập nhật vào cell ngoài vùng data (dòng 1, cột cuối + 2)
  try {
    sheet.getRange(1, numCols + 2).setValue('Cập nhật lần cuối:');
    sheet.getRange(1, numCols + 3).setValue(new Date());
  } catch(e) { /* bỏ qua nếu lỗi */ }

  return jsonResponse({
    status: 'ok',
    rows_written: numRows - 1,  // trừ header
    updated_at: new Date().toISOString(),
  });
}

// ── Helper: trả về JSON response với CORS headers ──
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
