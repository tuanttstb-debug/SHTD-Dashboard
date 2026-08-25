/**
 * verify_recurring.mjs — Task định kỳ (S80): key kỳ tuần/tháng + trạng thái + tick.
 * Kiểm tra hàm gốc trong helpers.js (normRecurrence, periodLabelOf, monthLabel, monthsInRange,
 * parseDonePeriods, taskPeriodStatus, togglePeriodDone) ngay trong trang.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3047;
const BASE = `http://localhost:${PORT}`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let pass = 0, fail = 0;
const PASS = m => { pass++; console.log('  ✅ ' + m); };
const FAIL = m => { fail++; console.log('  ❌ ' + m); };
const eq   = (name, got, exp) => (JSON.stringify(got) === JSON.stringify(exp))
  ? PASS(`${name} = ${JSON.stringify(got)}`)
  : FAIL(`${name}: nhận ${JSON.stringify(got)}, kỳ vọng ${JSON.stringify(exp)}`);
const ok   = (name, cond) => cond ? PASS(name) : FAIL(name);

const browser = await chromium.launch();
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');
await page.waitForFunction(() => typeof taskPeriodStatus === 'function' && typeof togglePeriodDone === 'function');

console.log('\n=== verify_recurring ===');

// R1 — normRecurrence
const r1 = await page.evaluate(() => ({
  tuan: normRecurrence('Tuần'), tuanLoose: normRecurrence('  weekly '), thang: normRecurrence('Tháng'),
  m: normRecurrence('monthly'), empty: normRecurrence(''), junk: normRecurrence('xyz'),
}));
eq('R1a normRecurrence Tuần', r1.tuan, 'Tuần');
eq('R1b normRecurrence weekly', r1.tuanLoose, 'Tuần');
eq('R1c normRecurrence Tháng', r1.thang, 'Tháng');
eq('R1d normRecurrence monthly', r1.m, 'Tháng');
eq('R1e normRecurrence rỗng', r1.empty, '');
eq('R1f normRecurrence rác', r1.junk, '');

// R2 — nhãn kỳ theo tần suất (ngày cố định)
const r2 = await page.evaluate(() => ({
  wk: periodLabelOf('Tuần', parseVNDate('2026-08-05')),
  mo: periodLabelOf('Tháng', parseVNDate('2026-08-05')),
  mo1: monthLabel(parseVNDate('2026-01-31')),
  none: periodLabelOf('', new Date()),
}));
eq('R2a tuần 2026-08-05', r2.wk, 'Tuần 32/2026');
eq('R2b tháng 2026-08-05', r2.mo, 'Tháng 08/2026');
eq('R2c monthLabel 2026-01-31', r2.mo1, 'Tháng 01/2026');
eq('R2d không tần suất → rỗng', r2.none, '');

// R3 — monthsInRange (giao năm)
const r3 = await page.evaluate(() => monthsInRange(parseVNDate('2025-11-15'), parseVNDate('2026-02-03')));
eq('R3 monthsInRange 11/2025→02/2026', r3, ['Tháng 11/2025','Tháng 12/2025','Tháng 01/2026','Tháng 02/2026']);

// R4 — parseDonePeriods
const r4 = await page.evaluate(() => parseDonePeriods('Tuần 34/2026; Tháng 08/2026 ,  '));
eq('R4 parseDonePeriods', r4, ['Tuần 34/2026','Tháng 08/2026']);

// R5 — togglePeriodDone thêm/gỡ kỳ HIỆN TẠI (dùng currentPeriodLabel làm mốc)
const r5 = await page.evaluate(() => {
  const t = { recurrence: 'Tuần', donePeriods: '', startDate: '2026-01-01' };
  const cur = currentPeriodLabel('Tuần');
  const after1 = togglePeriodDone(t);            // bật
  const t2 = { ...t, donePeriods: after1 };
  const after2 = togglePeriodDone(t2);           // tắt
  return { cur, after1HasCur: parseDonePeriods(after1).includes(cur), after2HasCur: parseDonePeriods(after2).includes(cur) };
});
ok('R5a toggle bật → có kỳ hiện tại', r5.after1HasCur);
ok('R5b toggle tắt → hết kỳ hiện tại', !r5.after2HasCur);

// R6 — taskPeriodStatus: kỳ hiện tại chưa tick + có kỳ trước bị miss
const r6 = await page.evaluate(() => {
  const t = { recurrence: 'Tuần', donePeriods: '', startDate: '2026-01-01' };
  const st = taskPeriodStatus(t);
  return { isRec: st.isRecurring, freq: st.freq, done: st.done, hasMissed: st.hasMissed, curIsThisWeek: st.curLabel === currentIsoWeekLabel() };
});
ok('R6a isRecurring', r6.isRec);
eq('R6b freq', r6.freq, 'Tuần');
ok('R6c chưa tick kỳ hiện tại', r6.done === false);
ok('R6d có kỳ trước bị miss', r6.hasMissed === true);
ok('R6e curLabel = tuần hiện tại', r6.curIsThisWeek);

// R7 — taskPeriodStatus: đã tick kỳ hiện tại → done=true
const r7 = await page.evaluate(() => {
  const cur = currentPeriodLabel('Tháng');
  const t = { recurrence: 'Tháng', donePeriods: cur, startDate: '2026-08-01' };
  const st = taskPeriodStatus(t);
  return { done: st.done, doneCount: st.doneCount };
});
ok('R7a đã tick kỳ hiện tại → done', r7.done === true);
ok('R7b doneCount ≥ 1', r7.doneCount >= 1);

// R8 — task KHÔNG định kỳ → isRecurring false
const r8 = await page.evaluate(() => taskPeriodStatus({ recurrence: '', donePeriods: '' }).isRecurring);
ok('R8 task thường không phải định kỳ', r8 === false);

ok('JS errors = 0', jsErrors.length === 0);
if (jsErrors.length) console.log('   ', jsErrors);

console.log(`\n=== KẾT QUẢ: ${pass}/${pass + fail} PASS ===`);
await browser.close();
server.close();
process.exit(fail > 0 ? 1 : 0);
