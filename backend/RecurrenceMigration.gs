// ── SHTD Dashboard – Recurrence columns migration (Task_Master) — S80 ──
//
// Thêm 2 cột cho task ĐỊNH KỲ (log 1 lần, tick mỗi kỳ):
//   • Cột 26 (Z)  = 'Định kỳ'     — '' | 'Tuần' | 'Tháng'
//   • Cột 27 (AA) = 'Kỳ đã xong'  — danh sách nhãn kỳ đã tick (phân cách '; ')
// Khớp DB_COLS (27 cột) + taskToRow (append index 25,26) phía client.
// Xem AI_CONTEXT/RECURRING_TASK_DESIGN.md.
//
// QUAN TRỌNG: taskToRow ghi theo VỊ TRÍ — 2 cột này PHẢI ở đúng cột 26 (Z) & 27 (AA),
// tức RAG đang ở cột 25 (Y). Nếu sheet không đúng 25 cột A→Y → CẢNH BÁO (không tự ghi lệch).
//
// Chạy trong Apps Script editor (KHÔNG cần redeploy Web App):
//   1) dryRunAddRecurrence()  → xem log: vị trí cột, cảnh báo (nếu có)
//   2) commitAddRecurrence()  → set Z1='Định kỳ', AA1='Kỳ đã xong' + backfill rỗng + bump DATA_VER

var RECUR_HEADER   = 'Định kỳ';
var RECUR_COL      = 26;   // cột Z
var DONEP_HEADER   = 'Kỳ đã xong';
var DONEP_COL      = 27;   // cột AA
var RAG_COL_EXPECT = 25;   // RAG phải đang ở cột Y

function _recNorm(h) { return String(h == null ? '' : h).toLowerCase().replace(/[\s\n\t_\-\/]+/g, ''); }

function dryRunAddRecurrence() { return _recMigrate(false); }
function commitAddRecurrence() { return _recMigrate(true); }

function _recMigrate(commit) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + SHEET_NAME);

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var scanW   = Math.max(lastCol, DONEP_COL);
  var header  = sh.getRange(1, 1, 1, scanW).getValues()[0];

  // Dò cột sẵn có theo header-name.
  var recCol = -1, doneCol = -1, ragCol = -1;
  for (var i = 0; i < header.length; i++) {
    var nh = _recNorm(header[i]);
    if (recCol  === -1 && nh === 'địnhkỳ')  recCol  = i + 1;
    if (doneCol === -1 && nh === 'kỳđãxong') doneCol = i + 1;
    if (ragCol  === -1 && nh === 'rag')      ragCol  = i + 1;
  }

  var warn = [];
  if (ragCol !== -1 && ragCol !== RAG_COL_EXPECT) {
    warn.push('RAG đang ở cột ' + ragCol + ' (kỳ vọng ' + RAG_COL_EXPECT + '/Y). Kiểm tra lại thứ tự cột trước khi commit.');
  }
  if (recCol === -1)  recCol  = RECUR_COL;
  else if (recCol !== RECUR_COL)  warn.push('Đã có cột "Định kỳ" ở cột ' + recCol + ' (client ghi ở cột ' + RECUR_COL + '/Z).');
  if (doneCol === -1) doneCol = DONEP_COL;
  else if (doneCol !== DONEP_COL) warn.push('Đã có cột "Kỳ đã xong" ở cột ' + doneCol + ' (client ghi ở cột ' + DONEP_COL + '/AA).');
  if (lastCol !== RAG_COL_EXPECT && recCol === RECUR_COL) {
    warn.push('lastCol hiện = ' + lastCol + ' (kỳ vọng 25 = A→Y sau khi có RAG). Đảm bảo Task_Master đúng 25 cột trước khi commit để 2 cột mới không ghi lệch.');
  }

  Logger.log('[Recur migrate] commit=' + commit + ' | Định kỳ col=' + recCol + ' | Kỳ đã xong col=' + doneCol +
             ' | RAG col=' + ragCol + ' | rows=' + (lastRow - 1) + ' | lastCol=' + lastCol);
  for (var w = 0; w < warn.length; w++) Logger.log('  ⚠️ ' + warn[w]);

  if (!commit) {
    Logger.log('[Recur migrate] DRY RUN — sẽ set Z1="' + RECUR_HEADER + '", AA1="' + DONEP_HEADER + '" + backfill rỗng ' + (lastRow - 1) + ' dòng.');
    return { recCol: recCol, doneCol: doneCol, ragCol: ragCol, warnings: warn };
  }

  // COMMIT: set 2 header + backfill ô trống (materialize cột) chỉ khi ô đang rỗng.
  sh.getRange(1, recCol).setValue(RECUR_HEADER);
  sh.getRange(1, doneCol).setValue(DONEP_HEADER);
  if (lastRow > 1) {
    var n = lastRow - 1;
    var recVals  = (recCol  <= lastCol) ? sh.getRange(2, recCol,  n, 1).getValues() : null;
    var doneVals = (doneCol <= lastCol) ? sh.getRange(2, doneCol, n, 1).getValues() : null;
    var outRec = [], outDone = [];
    for (var r = 0; r < n; r++) {
      outRec.push([ recVals  ? (recVals[r][0]  == null ? '' : recVals[r][0])  : '' ]);
      outDone.push([ doneVals ? (doneVals[r][0] == null ? '' : doneVals[r][0]) : '' ]);
    }
    sh.getRange(2, recCol,  n, 1).setValues(outRec);
    sh.getRange(2, doneCol, n, 1).setValues(outDone);
  }
  SpreadsheetApp.flush();
  if (typeof _bumpDataVer === 'function') _bumpDataVer();

  Logger.log('[Recur migrate] COMMIT xong — set 2 header (Z/AA) + backfill rỗng ' + (lastRow - 1) + ' dòng. Đã bump DATA_VER.');
  return { recCol: recCol, doneCol: doneCol, warnings: warn };
}
