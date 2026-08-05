// ── SHTD Dashboard – Data Cleanup: %HT = 100 ⇒ trạng thái "hoàn thành" ──
// One-off migration chạy TRỰC TIẾP trong GAS Editor (không phải Web App route).
// Áp cho 3 sheet có cột phần trăm: Task_Master, Initiative_Master, Dev_Plan.
// Case_Pipeline & Issue_Tracker KHÔNG có cột % (chạy theo stage/status) → CỐ Ý bỏ qua.
//
// Cách dùng:
//   1. dryRunCompleteByProgress()  → xem Logger: mỗi sheet bao nhiêu dòng SẼ đổi (không ghi)
//   2. commitCompleteByProgress()  → ghi thực sự vào Sheets
//
// Quy tắc: nếu %HT >= 100 và trạng thái CHƯA phải "hoàn thành" → set về giá trị hoàn thành.
// Initiative: chỉ áp cho ROOT (bỏ milestone `-M\d+`, vì milestone dùng "Xong").

var DC_PCT_DONE = 100;

// Cấu hình 3 mục tiêu. doneVal = giá trị trạng thái "hoàn thành" của từng entity.
var DC_TARGETS = [
  {
    sheet:      'Task_Master',
    pctMatch:   ['%ht', 'progress'],
    stateMatch: ['trangthai', 'state'],
    doneVal:    'Hoàn thành',
    skipMilestone: false
  },
  {
    sheet:      'Initiative_Master',
    pctMatch:   ['%ht', 'progress'],
    stateMatch: ['trangthai', 'state'],
    doneVal:    'Done',
    skipMilestone: true      // bỏ milestone (-M\d+) — milestone dùng "Xong", không phải "Done"
  },
  {
    sheet:      'Dev_Plan',
    pctMatch:   ['tylehoanthanh', 'progress', '%ht'],
    stateMatch: ['trangthai', 'state'],
    doneVal:    'Hoàn thành',
    skipMilestone: false
  }
];

function _dcNorm_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[\s\n\t_\-\/%()]+/g, '');
}

// Tìm index cột theo danh sách từ khoá (khớp "chứa" trên header đã normalize).
function _dcFindCol_(header, matchers) {
  var H = header.map(_dcNorm_);
  for (var m = 0; m < matchers.length; m++) {
    var key = _dcNorm_(matchers[m]);
    for (var i = 0; i < H.length; i++) {
      if (H[i].indexOf(key) !== -1) return i;
    }
  }
  return -1;
}

// Parse "80%" | "80" | 80 | 0.8 → số 0..100.
function _dcPct_(v) {
  if (v == null || v === '') return 0;
  var raw = String(v).trim();
  var n = parseFloat(raw.replace('%', ''));
  if (isNaN(n)) return 0;
  // Dạng phân số 0..1 (không có dấu %) → quy về phần trăm.
  if (raw.indexOf('%') === -1 && n > 0 && n <= 1) n = n * 100;
  return n;
}

var _DC_MS_RE = /-M\d+$/;

// Lõi dùng chung cho dry-run & commit. write=false chỉ đếm; write=true ghi lại.
function _dcProcessTarget_(ss, cfg, write) {
  var sheet = ss.getSheetByName(cfg.sheet);
  var res = { sheet: cfg.sheet, found: !!sheet, rows: 0, changed: 0, samples: [], error: '' };
  if (!sheet) { res.error = 'Sheet không tồn tại'; return res; }

  var rng    = sheet.getDataRange();
  var values = rng.getValues();
  if (values.length < 2) return res;

  var header  = values[0];
  var cPct    = _dcFindCol_(header, cfg.pctMatch);
  var cState  = _dcFindCol_(header, cfg.stateMatch);
  var cId     = _dcFindCol_(header, ['id']);
  if (cPct === -1 || cState === -1) {
    res.error = 'Không tìm thấy cột % (' + cPct + ') hoặc cột trạng thái (' + cState + ')';
    return res;
  }

  res.rows = values.length - 1;
  var doneNorm = _dcNorm_(cfg.doneVal);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id  = cId !== -1 ? String(row[cId] || '').trim() : '';
    if (cId !== -1 && !id) continue;                            // dòng trống
    if (cfg.skipMilestone && _DC_MS_RE.test(id)) continue;      // bỏ milestone

    var pct       = _dcPct_(row[cPct]);
    var stateNorm = _dcNorm_(row[cState]);
    if (pct >= DC_PCT_DONE && stateNorm !== doneNorm) {
      res.changed++;
      if (res.samples.length < 8) {
        res.samples.push(id + ' [' + String(row[cState] || '').trim() + ' → ' + cfg.doneVal + ']');
      }
      if (write) values[i][cState] = cfg.doneVal;
    }
  }

  if (write && res.changed > 0) rng.setValues(values);          // ghi 1 lần cho cả sheet
  return res;
}

function _dcRun_(write) {
  var ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tag = write ? 'COMMIT' : 'DRY-RUN';
  var total = 0;
  Logger.log('════ Data Cleanup (%HT=100 ⇒ hoàn thành) — ' + tag + ' ════');
  for (var t = 0; t < DC_TARGETS.length; t++) {
    var r = _dcProcessTarget_(ss, DC_TARGETS[t], write);
    total += r.changed;
    if (!r.found)      { Logger.log('• %s: ⚠️ %s', r.sheet, r.error); continue; }
    if (r.error)       { Logger.log('• %s: ⚠️ %s', r.sheet, r.error); continue; }
    Logger.log('• %s: %s/%s dòng %s', r.sheet, r.changed, r.rows,
               write ? 'đã cập nhật' : 'sẽ cập nhật');
    if (r.samples.length) Logger.log('    ví dụ: %s', r.samples.join('  |  '));
  }
  Logger.log('──── TỔNG: %s dòng %s ────', total, write ? 'đã đổi' : 'sẽ đổi');
  return total;
}

/** Chỉ ĐẾM — không ghi. Xem Logger để kiểm tra trước khi commit. */
function dryRunCompleteByProgress() { return _dcRun_(false); }

/** GHI THẬT vào Sheets. Nên chạy dryRunCompleteByProgress() trước. */
function commitCompleteByProgress() { return _dcRun_(true); }
