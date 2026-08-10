/* ═══════════════════════════════════════════════════════════════════════
   DateNormalizeMigration.gs  —  one-off data fix (run in GAS editor)
   ───────────────────────────────────────────────────────────────────────
   Purpose: after hand-copying data between Sheets, date cells became mixed /
   locale-mangled (real Date cells, Excel serials, "30-thg 7-26", DD-MMM-YY,
   DD/MM/YYYY …). The frontend now treats ISO 'YYYY-MM-DD' as canonical.
   This script rewrites every date column across all 5 entity sheets to ISO
   text AND locks those columns to Plain-text ('@') number format so Google
   Sheets never re-localises them (Jul → "thg 7") again.

   Usage in the Apps Script editor:
     1) Run  dryRunNormalizeDates()   → read the Logger; verify counts/samples.
     2) Run  commitNormalizeDates()   → writes ISO text + sets '@' format.
   No Web App redeploy needed (does not touch doGet/doPost).

   NOTE: "Review cuối" (Dev_Plan) is a full timestamp, not a date-picker
   field → intentionally EXCLUDED so its time-of-day is preserved.
════════════════════════════════════════════════════════════════════════ */

// Target date columns per sheet, matched by header keyword (normalized),
// with a 1-based positional fallback if the header can't be found.
var _DN_TARGETS = [
  { sheet: 'Task_Master',       cols: [
      { kw: 'start',           pos: 12 },
      { kw: 'deadline',        pos: 13 } ] },
  { sheet: 'Case_Pipeline',     cols: [
      { kw: 'start',           pos: 14 },
      { kw: 'deadline',        pos: 15 } ] },
  { sheet: 'Initiative_Master', cols: [
      { kw: 'start',           pos: 5  },
      { kw: 'deadline/target', pos: 6  },
      { kw: 'deadlinemilestone', pos: 9 } ] },
  { sheet: 'Issue_Tracker',     cols: [
      { kw: 'ngayphatsinh',    pos: 2  },
      { kw: 'deadline',        pos: 12 },
      { kw: 'ngaygiaiquyet',   pos: 13 } ] },
  { sheet: 'Dev_Plan',          cols: [
      { kw: 'thoigianbatdau',  pos: 6  },
      { kw: 'thoigiandukienketthuc', pos: 7 } ] },
];

function _dnNorm(s) { return (s || '').toString().toLowerCase().replace(/[\s\n\t_\-\/]+/g, ''); }

var _DN_MMM = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

// Any cell value → ISO 'YYYY-MM-DD' (or '' if empty/unparseable). Mirrors FE toISODate().
function _dnToISO(v, tz) {
  if (v === null || v === undefined || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (typeof v === 'number') {
    var d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  if (!s) return '';
  var yr = function (y) { var n = parseInt(y, 10); return n < 100 ? (n < 50 ? 2000 + n : 1900 + n) : n; };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var iso = function (y, m1, d) {
    if (!(y >= 1900 && y <= 2200) || m1 < 1 || m1 > 12 || d < 1 || d > 31) return '';
    return y + '-' + pad(m1) + '-' + pad(d);
  };
  var m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))                       return iso(+m[1], +m[2], +m[3]);          // ISO
  if ((m = s.match(/^(\d{1,2})[\-\/]([A-Za-z]{3,})[\-\/](\d{2,4})$/))) {                                             // DD-MMM-YY
    var mo = _DN_MMM[m[2].slice(0, 3).toLowerCase()];
    if (mo !== undefined) return iso(yr(m[3]), mo + 1, +m[1]);
  }
  if ((m = s.match(/^(\d{1,2})[\-\/\s]+(?:thg|tháng)\.?\s*(\d{1,2})[\-\/\s,]+(\d{2,4})$/i)))                          // DD-thg M-YY (VN)
    return iso(yr(m[3]), +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/)))            return iso(+m[3], +m[2], +m[1]);           // DD/MM/YYYY
  var d2 = new Date(s);
  return isNaN(d2.getTime()) ? '' : Utilities.formatDate(d2, tz, 'yyyy-MM-dd');
}

function dryRunNormalizeDates() { return _dnRun_(false); }
function commitNormalizeDates() { return _dnRun_(true); }

function _dnRun_(commit) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var grand = { changed: 0, unparseable: 0, scanned: 0 };
  Logger.log('=== DateNormalize %s === tz=%s', commit ? 'COMMIT' : 'DRY-RUN', tz);

  _DN_TARGETS.forEach(function (tgt) {
    var sh = ss.getSheetByName(tgt.sheet);
    if (!sh) { Logger.log('· [%s] SKIP — sheet not found', tgt.sheet); return; }
    var lastRow = sh.getLastRow();
    if (lastRow < 2) { Logger.log('· [%s] empty', tgt.sheet); return; }
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var hnorm = header.map(_dnNorm);

    tgt.cols.forEach(function (c) {
      var idx = -1;
      for (var k = 0; k < hnorm.length; k++) { if (hnorm[k].indexOf(_dnNorm(c.kw)) !== -1) { idx = k; break; } }
      var col = idx !== -1 ? idx + 1 : c.pos;        // 1-based
      var headName = header[col - 1] || ('col#' + col);

      var n = lastRow - 1;
      var rng = sh.getRange(2, col, n, 1);
      var vals = rng.getValues();
      var out = [], changed = 0, bad = 0, samples = [];
      for (var i = 0; i < n; i++) {
        var raw = vals[i][0];
        var isoV = _dnToISO(raw, tz);
        if (raw !== '' && raw !== null && raw !== undefined && isoV === '') {
          bad++;                                       // had content but couldn't parse → leave as-is
          out.push([raw]);
          continue;
        }
        out.push([isoV]);
        var rawStr = (Object.prototype.toString.call(raw) === '[object Date]')
          ? (Utilities.formatDate(raw, tz, 'yyyy-MM-dd') + ' (Date)') : String(raw);
        if (rawStr !== isoV) { changed++; if (samples.length < 8) samples.push(rawStr + '  →  ' + isoV); }
      }
      grand.scanned += n; grand.changed += changed; grand.unparseable += bad;
      Logger.log('· [%s] col %s "%s": %s/%s change, %s unparseable', tgt.sheet, col, headName, changed, n, bad);
      samples.forEach(function (s) { Logger.log('      %s', s); });

      if (commit) {
        // 1) Write the normalised ISO values FIRST — this is never blocked by a column
        //    type, so data is always fixed even if the format step below fails.
        rng.setValues(out);
        // 2) Best-effort: lock the column to plain text so ISO strings stay text and never
        //    re-localise (Jul → "thg 7"). BLOCKED when the column has an enforced "column
        //    type" (Google Sheets Tables) — that's fine: values are already written, Sheets
        //    keeps them as proper Date cells, and the frontend's toISODate() reads Dates OK.
        try {
          sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@');
        } catch (fmtErr) {
          Logger.log('      ⚠ không khoá được Plain-text cho cột %s (%s) — dữ liệu ISO ĐÃ ghi xong, FE vẫn đọc đúng', col, fmtErr.message);
        }
      }
    });
  });

  Logger.log('=== %s — scanned %s cells, %s would-change, %s unparseable(kept) ===',
    commit ? 'COMMITTED' : 'DRY-RUN (no writes)', grand.scanned, grand.changed, grand.unparseable);
  return grand;
}
