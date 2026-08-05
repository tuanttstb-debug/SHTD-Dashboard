// ── SHTD Dashboard – Chuẩn hoá cột "Tuần BC" (Task_Master) về nhãn ISO ──
// One-off migration chạy TRỰC TIẾP trong GAS Editor (không phải Web App route).
// Chuẩn hoá free-text tuần báo cáo → 'Tuần WW/YYYY' (ISO), hỗ trợ đa giá trị (phân cách ; hoặc ,).
// Giá trị không parse được → GIỮ NGUYÊN + log để rà tay (không làm mất tag cũ).
//
// Cách dùng:
//   1. dryRunNormalizeWeeks()  → xem Logger: bao nhiêu ô sẽ đổi + các giá trị lạ
//   2. commitNormalizeWeeks()  → ghi thật vào cột "Tuần BC"
//
// Lưu ý: mô hình mới (FE) suy tuần auto từ Start→Deadline; cột "Tuần BC" chỉ còn giữ tuần GẮN TAY.
// Migration này KHÔNG xoá tuần trùng span (read path tự union+dedupe) — chỉ chuẩn hoá định dạng.

function _rwParseWeek_(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return '';
  var m = /^(\d{4})-W(\d{1,2})$/i.exec(s);
  if (m) { var w = +m[2]; if (w >= 1 && w <= 53) return 'Tuần ' + ('0' + w).slice(-2) + '/' + m[1]; }
  m = /(\d{1,2})\s*[\/\-]\s*(\d{4})/.exec(s);
  if (m) { var w2 = +m[1]; if (w2 >= 1 && w2 <= 53) return 'Tuần ' + ('0' + w2).slice(-2) + '/' + m[2]; }
  m = /(\d{4})\D+W?\s*(\d{1,2})/i.exec(s);
  if (m) { var w3 = +m[2]; if (w3 >= 1 && w3 <= 53) return 'Tuần ' + ('0' + w3).slice(-2) + '/' + m[1]; }
  return '';
}

// Chuẩn hoá 1 ô đa-giá-trị. Trả {value, changed, bad[]}.
function _rwNormCell_(raw) {
  var parts = String(raw == null ? '' : raw).split(/[;,]/).map(function (x) { return x.trim(); }).filter(String);
  var out = [], bad = [], seen = {};
  for (var i = 0; i < parts.length; i++) {
    var canon = _rwParseWeek_(parts[i]);
    var val = canon || parts[i];            // không parse được → giữ nguyên
    if (!canon) bad.push(parts[i]);
    if (!seen[val]) { seen[val] = true; out.push(val); }
  }
  var joined = out.join('; ');
  return { value: joined, changed: joined !== String(raw == null ? '' : raw).trim(), bad: bad };
}

function _rwNorm_(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s\n\t_\-\/]+/g, ''); }
function _rwFindCol_(header, keys) {
  var H = header.map(_rwNorm_);
  for (var k = 0; k < keys.length; k++) {
    var key = _rwNorm_(keys[k]);
    for (var i = 0; i < H.length; i++) if (H[i].indexOf(key) !== -1) return i;
  }
  return -1;
}

function _rwRun_(write) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);   // 'Task_Master' (Config.gs)
  var tag   = write ? 'COMMIT' : 'DRY-RUN';
  Logger.log('════ Chuẩn hoá Tuần BC (Task_Master) — ' + tag + ' ════');
  if (!sheet) { Logger.log('⚠️ Không thấy sheet ' + SHEET_NAME); return 0; }

  var rng = sheet.getDataRange(), values = rng.getValues();
  if (values.length < 2) { Logger.log('Sheet rỗng.'); return 0; }

  var cId   = _rwFindCol_(values[0], ['id']);
  var cWeek = _rwFindCol_(values[0], ['tuầnbc', 'tuanbc', 'tuần bc']);
  if (cWeek === -1) { Logger.log('⚠️ Không tìm thấy cột "Tuần BC".'); return 0; }

  var changed = 0, badRows = [];
  for (var i = 1; i < values.length; i++) {
    var res = _rwNormCell_(values[i][cWeek]);
    if (res.bad.length) badRows.push((cId !== -1 ? values[i][cId] : ('row' + (i + 1))) + ': ' + res.bad.join(', '));
    if (res.changed) {
      changed++;
      if (write) values[i][cWeek] = res.value;
    }
  }
  if (write && changed > 0) rng.setValues(values);

  Logger.log('• %s/%s ô %s', changed, values.length - 1, write ? 'đã chuẩn hoá' : 'sẽ chuẩn hoá');
  if (badRows.length) {
    Logger.log('⚠️ %s ô có giá trị KHÔNG parse được (giữ nguyên, cần rà tay):', badRows.length);
    Logger.log('   ' + badRows.slice(0, 30).join('  |  '));
  }
  return changed;
}

/** Chỉ ĐẾM — không ghi. Xem Logger. */
function dryRunNormalizeWeeks() { return _rwRun_(false); }

/** GHI THẬT vào cột "Tuần BC". Nên chạy dryRunNormalizeWeeks() trước. */
function commitNormalizeWeeks() { return _rwRun_(true); }
