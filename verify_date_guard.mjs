/**
 * verify_date_guard.mjs — DateGuard.gs (chống lệch định dạng ngày tái phát)
 *
 * Nạp NGUYÊN VĂN backend/DateNormalizeMigration.gs + backend/DateGuard.gs vào
 * sandbox Node (stub GAS APIs + Sheet giả), chạy logic THẬT — không port tay.
 *
 *  DG1  – _dnToISO: mọi định dạng (ISO/locale VN/DD-MMM/DD-MM-YYYY/serial/Date) → ISO
 *  DG2  – _dgInspectCell_: Date hợp lệ / ISO sẵn / rỗng → KHÔNG fix (canonical)
 *  DG3  – _dgInspectCell_: chuỗi locale + serial lệch → fix=true + iso đúng
 *  DG4  – _dgInspectCell_: chuỗi không parse được → fix=false, bad=true (giữ nguyên)
 *  DG5  – dateGuardOnEdit: sửa ô Deadline (locale) → tự viết lại ISO tại chỗ
 *  DG6  – dateGuardOnEdit: sửa cột KHÔNG phải ngày → không đụng; sửa header (row 1) → bỏ
 *  DG7  – dateGuardOnEdit: paste khối nhiều ô → chỉ cột ngày được chuẩn hoá
 *  DG8  – dailyDateGuard: quét sheet trộn → fix locale/serial, GIỮ Date/ISO, đếm bad
 *  DG9  – dailyDateGuard: idempotent — chạy lần 2 fix=0
 *  DG10 – setNumberFormat bị chặn (cột kiểu đã nhập) → vẫn ghi ISO, không ném
 *
 * Run: node verify_date_guard.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_MIG = fs.readFileSync(path.join(__dirname, 'backend', 'DateNormalizeMigration.gs'), 'utf8');
const SRC_DG  = fs.readFileSync(path.join(__dirname, 'backend', 'DateGuard.gs'), 'utf8');

let passed = 0, failed = 0;
const log = (id, ok, msg) => { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); ok ? passed++ : failed++; };
const eq  = (id, got, exp) => log(id, JSON.stringify(got) === JSON.stringify(exp),
  `nhận ${JSON.stringify(got)}${JSON.stringify(got) === JSON.stringify(exp) ? '' : ` (kỳ vọng ${JSON.stringify(exp)})`}`);

/* ── Sheet giả ── */
function makeSheet(name, rows, opts = {}) {
  const sheet = {
    _rows: rows, _name: name, _tz: 'Asia/Ho_Chi_Minh', _blockFormat: !!opts.blockFormat,
    getName() { return this._name; },
    getParent() { const self = this; return { getSpreadsheetTimeZone: () => self._tz }; },
    getLastRow() { return this._rows.length; },
    getLastColumn() { return this._rows.reduce((m, r) => Math.max(m, r.length), 0); },
    getRange(r, c, nr = 1, nc = 1) {
      const self = this;
      return {
        getSheet: () => self,
        getColumn: () => c, getRow: () => r, getNumRows: () => nr, getNumColumns: () => nc,
        getValue: () => (self._rows[r - 1] || [])[c - 1],
        setValue: (v) => { if (!self._rows[r - 1]) self._rows[r - 1] = []; self._rows[r - 1][c - 1] = v; },
        getValues: () => {
          const out = [];
          for (let i = 0; i < nr; i++) { const row = self._rows[r - 1 + i] || []; const s = []; for (let j = 0; j < nc; j++) s.push(row[c - 1 + j]); out.push(s); }
          return out;
        },
        setValues: (vals) => {
          for (let i = 0; i < vals.length; i++) { const ri = r - 1 + i; if (!self._rows[ri]) self._rows[ri] = []; for (let j = 0; j < vals[i].length; j++) self._rows[ri][c - 1 + j] = vals[i][j]; }
        },
        setNumberFormat: () => { if (self._blockFormat) throw new Error('không thể đặt định dạng số của cột đã nhập'); }
      };
    }
  };
  return sheet;
}

/* ── env GAS + factory ── */
function buildEnv(registry) {
  const pad = n => ('0' + n).slice(-2);
  const env = {
    SpreadsheetApp: {
      openById: () => ({
        getSpreadsheetTimeZone: () => 'Asia/Ho_Chi_Minh',
        getSheetByName: (n) => registry[n] || null
      })
    },
    Utilities: { formatDate: (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` },
    Logger: { log: () => {} },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ forSpreadsheet: () => ({ onEdit: () => ({ create: () => {} }) }), timeBased: () => ({ atHour: () => ({ everyDays: () => ({ create: () => {} }) }) }) }), deleteTrigger: () => {} },
    SPREADSHEET_ID: 'fake'
  };
  const factory = new Function(
    'SpreadsheetApp', 'Utilities', 'Logger', 'ScriptApp', 'SPREADSHEET_ID',
    SRC_MIG + '\n' + SRC_DG + '\n;return {' +
      '_dnToISO:_dnToISO, _dgInspectCell_:_dgInspectCell_, dateGuardOnEdit:dateGuardOnEdit,' +
      'dailyDateGuard:dailyDateGuard, _dgScanAll_:_dgScanAll_' +
    '};'
  );
  return factory(env.SpreadsheetApp, env.Utilities, env.Logger, env.ScriptApp, env.SPREADSHEET_ID);
}

console.log('\n=== verify_date_guard ===');
const TZ = 'Asia/Ho_Chi_Minh';
const api = buildEnv({});

/* DG1 — _dnToISO mọi format */
eq('DG1a ISO passthrough', api._dnToISO('2026-08-31', TZ), '2026-08-31');
eq('DG1b locale VN "31-thg 8-26"', api._dnToISO('31-thg 8-26', TZ), '2026-08-31');
eq('DG1c "31 tháng 8 2026"', api._dnToISO('31 tháng 8 2026', TZ), '2026-08-31');
eq('DG1d DD-MMM-YY "31-Aug-26"', api._dnToISO('31-Aug-26', TZ), '2026-08-31');
eq('DG1e DD/MM/YYYY', api._dnToISO('31/08/2026', TZ), '2026-08-31');
eq('DG1f Date obj', api._dnToISO(new Date(Date.UTC(2026, 7, 31)), TZ), '2026-08-31');
eq('DG1g Excel serial 46265', api._dnToISO(46265, TZ), '2026-08-31');
eq('DG1h empty', api._dnToISO('', TZ), '');
eq('DG1i junk', api._dnToISO('không rõ', TZ), '');

/* DG2 — canonical → không fix */
eq('DG2a Date hợp lệ → skip', api._dgInspectCell_(new Date(Date.UTC(2026, 7, 31)), TZ).fix, false);
eq('DG2b ISO sẵn → skip', api._dgInspectCell_('2026-08-31', TZ).fix, false);
eq('DG2c rỗng → skip, not bad', api._dgInspectCell_('', TZ), { fix: false, iso: '', bad: false });

/* DG3 — lệch → fix */
eq('DG3a locale → fix', api._dgInspectCell_('31-thg 8-26', TZ), { fix: true, iso: '2026-08-31', bad: false });
eq('DG3b serial → fix', api._dgInspectCell_(46265, TZ), { fix: true, iso: '2026-08-31', bad: false });

/* DG4 — không parse được → giữ + bad */
eq('DG4 junk → bad, giữ', api._dgInspectCell_('ngày mai', TZ), { fix: false, iso: '', bad: true });

/* DG5/DG6/DG7 — dateGuardOnEdit */
{
  const header = Array(25).fill(''); header[11] = 'Start Date'; header[12] = 'Deadline'; header[0] = 'Mã';
  const rows = [header, ['BL1-026', ...Array(10).fill(''), '', '31-thg 8-26'], ['BL1-027', ...Array(10).fill(''), '', '2026-09-01']];
  const sh = makeSheet('Task_Master', rows);
  const g = buildEnv({ Task_Master: sh });
  // DG5: sửa ô Deadline (row2,col13) chứa locale
  g.dateGuardOnEdit({ range: sh.getRange(2, 13, 1, 1) });
  eq('DG5 Deadline locale → ISO', sh._rows[1][12], '2026-08-31');
  // DG6a: sửa cột Mã (col1) — không phải ngày
  sh._rows[1][0] = 'BL1-026x';
  g.dateGuardOnEdit({ range: sh.getRange(2, 1, 1, 1) });
  eq('DG6a cột không-ngày → không đụng', sh._rows[1][0], 'BL1-026x');
  // DG6b: "sửa" header row → bỏ qua (đặt locale vào header, edit row1, phải giữ nguyên)
  sh._rows[0][12] = '31-thg 8-26';
  g.dateGuardOnEdit({ range: sh.getRange(1, 13, 1, 1) });
  eq('DG6b header row → bỏ qua', sh._rows[0][12], '31-thg 8-26');
  // DG7: paste khối 2x13 phủ cả col Mã..Deadline; chỉ Start(12)/Deadline(13) chuẩn hoá
  sh._rows[1][11] = '31-Aug-26'; sh._rows[1][12] = '31/08/2026';
  g.dateGuardOnEdit({ range: sh.getRange(2, 1, 1, 13) });
  eq('DG7a Start trong khối → ISO', sh._rows[1][11], '2026-08-31');
  eq('DG7b Deadline trong khối → ISO', sh._rows[1][12], '2026-08-31');
}

/* DG8/DG9 — dailyDateGuard scan + idempotent */
{
  const header = Array(25).fill(''); header[11] = 'Start Date'; header[12] = 'Deadline'; header[0] = 'Mã';
  const rows = [
    header,
    ['A', ...Array(10).fill(''), '31-thg 8-26', '2026-09-01'],          // Start locale→fix, Deadline ISO→keep
    ['B', ...Array(10).fill(''), 46265, new Date(Date.UTC(2026, 8, 1))], // Start serial→fix, Deadline Date→keep
    ['C', ...Array(10).fill(''), 'ngày mai', '']                        // Start junk→bad, Deadline empty→keep
  ];
  const sh = makeSheet('Task_Master', rows);
  const g = buildEnv({ Task_Master: sh });
  const r1 = g.dailyDateGuard();
  eq('DG8a fixed = 2 (locale+serial)', r1.fixed, 2);
  eq('DG8b bad(kept) = 1', r1.bad, 1);
  eq('DG8c Start A → ISO', sh._rows[1][11], '2026-08-31');
  eq('DG8d Start B serial → ISO', sh._rows[2][11], '2026-08-31');
  eq('DG8e Deadline ISO giữ', sh._rows[1][12], '2026-09-01');
  eq('DG8f Start junk giữ nguyên', sh._rows[3][11], 'ngày mai');
  const r2 = g.dailyDateGuard();
  eq('DG9 idempotent — lần 2 fixed=0', r2.fixed, 0);
}

/* DG10 — setNumberFormat chặn (cột kiểu đã nhập) → vẫn ghi ISO, không ném */
{
  const header = Array(25).fill(''); header[11] = 'Start Date'; header[12] = 'Deadline';
  const rows = [header, ['A', ...Array(10).fill(''), '31-thg 8-26', '']];
  const sh = makeSheet('Task_Master', rows, { blockFormat: true });
  const g = buildEnv({ Task_Master: sh });
  let threw = false;
  try { g.dateGuardOnEdit({ range: sh.getRange(2, 12, 1, 1) }); } catch (e) { threw = true; }
  eq('DG10a không ném khi format bị chặn', threw, false);
  eq('DG10b vẫn ghi ISO', sh._rows[1][11], '2026-08-31');
}

console.log(`\n${failed === 0 ? '🎉' : '⚠️'} verify_date_guard: ${passed} pass, ${failed} fail`);
process.exit(failed === 0 ? 0 : 1);
