// ── SHTD Dashboard – RAG column migration (Task_Master) ──
//
// Thêm cột 'RAG' (Health: Green/Amber/Red) vào Task_Master để RAG được LƯU vào sheet.
// Trước đây Task_Master không có cột RAG → RAG bấm nhanh ở "Công việc của tôi" (t.rag) và RAG ở
// modal (t.status) KHÔNG được ghi (taskToRow bỏ qua) → audit log có update nhưng sheet không đổi,
// reload/sync → RAG về trắng. Nay hợp nhất: RAG = t.status (Green/Amber/Red), cột 25 (Y).
//
// QUAN TRỌNG: taskToRow ghi theo VỊ TRÍ, cột RAG PHẢI ở đúng cột 25 (Y) để khớp DB_COLS 25 cột.
// Migration đặt header ở cột 25; nếu sheet đang có ≠ 24 cột dữ liệu → CẢNH BÁO (không tự ghi lệch).
//
// Chạy trong Apps Script editor (KHÔNG cần redeploy Web App):
//   1) dryRunAddRag()  → xem log: vị trí cột, phân bố backfill, cảnh báo (nếu có)
//   2) commitAddRag()  → set header Y1='RAG' + backfill ô trống từ Trạng thái + bump DATA_VER

var RAG_HEADER_NAME = 'RAG';
var RAG_TARGET_COL  = 25;   // cột Y — khớp DB_COLS (25 cột) phía client

function _ragDeriveFromState(stateVal) {
  var s = String(stateVal == null ? '' : stateVal).toLowerCase();
  if (s.indexOf('red') !== -1 || s.indexOf('đỏ') !== -1) return 'Red';
  if (s.indexOf('amber') !== -1 || s.indexOf('cam') !== -1) return 'Amber';
  return 'Green';
}

function _ragNorm(h) {
  return String(h == null ? '' : h).toLowerCase().replace(/[\s\n\t_\-\/]+/g, '');
}

function dryRunAddRag() { return _ragMigrate(false); }
function commitAddRag() { return _ragMigrate(true); }

function _ragMigrate(commit) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + SHEET_NAME);

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();

  // Đọc header rộng để dò cột RAG/Trạng thái sẵn có (bao cả vùng có thể mở rộng).
  var scanW  = Math.max(lastCol, RAG_TARGET_COL);
  var header = sh.getRange(1, 1, 1, scanW).getValues()[0];

  var ragCol   = -1;
  var stateCol = -1;
  for (var i = 0; i < header.length; i++) {
    var nh = _ragNorm(header[i]);
    if (ragCol === -1 && nh === 'rag') ragCol = i + 1;
    if (stateCol === -1 && (nh.indexOf('trạngthái') !== -1 || nh.indexOf('trangthai') !== -1)) stateCol = i + 1;
  }
  if (stateCol === -1) throw new Error('Không tìm thấy cột "Trạng thái" trong Task_Master.');

  // Cảnh báo lệch cột: taskToRow ghi RAG ở cột 25. Nếu sheet không đúng 24 cột "gốc" → dễ lệch.
  var warn = [];
  if (ragCol === -1) {
    ragCol = RAG_TARGET_COL;
    if (lastCol !== RAG_TARGET_COL - 1) {
      warn.push('lastCol hiện = ' + lastCol + ' (kỳ vọng 24). Sẽ đặt RAG ở cột ' + RAG_TARGET_COL +
                ' (Y). Kiểm tra Task_Master có đúng 24 cột A→X trước khi commit để taskToRow không ghi lệch.');
    }
  } else if (ragCol !== RAG_TARGET_COL) {
    warn.push('Đã có cột RAG ở cột ' + ragCol + ' nhưng client ghi RAG ở cột ' + RAG_TARGET_COL +
              ' (Y). Cần chuyển cột RAG về đúng cột ' + RAG_TARGET_COL + ' để khớp taskToRow.');
  }

  Logger.log('[RAG migrate] commit=' + commit + ' | RAG col=' + ragCol + ' | State col=' + stateCol +
             ' | rows=' + (lastRow - 1) + ' | lastCol=' + lastCol);
  for (var w = 0; w < warn.length; w++) Logger.log('  ⚠️ ' + warn[w]);

  // Thống kê backfill (ô RAG trống → suy từ Trạng thái).
  var counts = { Green: 0, Amber: 0, Red: 0, kept: 0 };
  var stVals = (lastRow > 1) ? sh.getRange(2, stateCol, lastRow - 1, 1).getValues() : [];
  var exVals = (lastRow > 1 && ragCol <= lastCol) ? sh.getRange(2, ragCol, lastRow - 1, 1).getValues() : null;
  var newRag = [];
  for (var r = 0; r < stVals.length; r++) {
    var cur = exVals ? String(exVals[r][0] == null ? '' : exVals[r][0]).trim() : '';
    if (cur) { counts.kept++; newRag.push([cur]); continue; }
    var derived = _ragDeriveFromState(stVals[r][0]);
    counts[derived]++;
    newRag.push([derived]);
  }

  if (!commit) {
    Logger.log('[RAG migrate] DRY RUN — sẽ set Y1="RAG" + backfill: ' + JSON.stringify(counts));
    return { ragCol: ragCol, stateCol: stateCol, counts: counts, warnings: warn };
  }

  // COMMIT: header + backfill.
  sh.getRange(1, ragCol).setValue(RAG_HEADER_NAME);
  if (newRag.length) {
    sh.getRange(2, ragCol, newRag.length, 1).setValues(newRag);
  }
  SpreadsheetApp.flush();
  if (typeof _bumpDataVer === 'function') _bumpDataVer();   // đổi version → client tải lại (không notModified oan)

  Logger.log('[RAG migrate] COMMIT xong — header + backfill ' +
             (counts.Green + counts.Amber + counts.Red) + ' ô (kept ' + counts.kept + '). Đã bump DATA_VER.');
  return { ragCol: ragCol, counts: counts, warnings: warn };
}
