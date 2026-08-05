/**
 * verify_report_week.mjs — Tuần báo cáo đa-tuần (ISO) + membership auto∪pinned
 * Kiểm tra hàm gốc trong helpers.js (isoWeekLabel, isoWeeksInRange, taskReportWeeks,
 * parseWeekLabel, weekInput⇄label, taskInReportWeek, taskWeeksBadge) ngay trong trang.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3046;
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

const browser = await chromium.launch();
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');
await page.waitForFunction(() => typeof taskReportWeeks === 'function' && typeof isoWeekLabel === 'function');

console.log('\n=== verify_report_week ===');

// R1: ISO week-year ở biên năm
const r1 = await page.evaluate(() => ({
  jan1: isoWeekLabel(parseVNDate('2026-01-01')),
  dec29: isoWeekLabel(parseVNDate('2025-12-29')),
  aug5: isoWeekLabel(parseVNDate('2026-08-05')),
}));
eq('R1a isoWeekLabel 2026-01-01', r1.jan1, 'Tuần 01/2026');
eq('R1b isoWeekLabel 2025-12-29 (week-year)', r1.dec29, 'Tuần 01/2026');
eq('R1c isoWeekLabel 2026-08-05', r1.aug5, 'Tuần 32/2026');

// R2: range → danh sách tuần liên tiếp
const r2 = await page.evaluate(() => isoWeeksInRange(parseVNDate('2026-04-13'), parseVNDate('2026-04-27')));
eq('R2 isoWeeksInRange 04-13..04-27', r2, ['Tuần 16/2026', 'Tuần 17/2026', 'Tuần 18/2026']);

// R3: parseWeekLabel chuẩn hoá + loại rác
const r3 = await page.evaluate(() => ([
  parseWeekLabel('Tuần 16/2026'), parseWeekLabel('T16/2026'),
  parseWeekLabel('16/2026'), parseWeekLabel('2026-W16'), parseWeekLabel('rác')
]));
eq('R3 parseWeekLabel', r3, ['Tuần 16/2026', 'Tuần 16/2026', 'Tuần 16/2026', 'Tuần 16/2026', '']);

// R4: <input type=week> ⇄ label
const r4 = await page.evaluate(() => ({ toL: weekInputToLabel('2026-W16'), toI: labelToWeekInput('Tuần 16/2026') }));
eq('R4a weekInputToLabel', r4.toL, 'Tuần 16/2026');
eq('R4b labelToWeekInput', r4.toI, '2026-W16');

// R5: taskReportWeeks — task DONE chỉ span gốc
const r5 = await page.evaluate(() =>
  taskReportWeeks({ startDate: '2026-04-13', endDate: '2026-04-27', state: 'Hoàn thành' }));
eq('R5 DONE span 16-18', r5, ['Tuần 16/2026', 'Tuần 17/2026', 'Tuần 18/2026']);

// R6: task QUÁ HẠN chưa xong → kéo tới tuần hiện tại (ISO của hôm nay)
const r6 = await page.evaluate(() => {
  const w = taskReportWeeks({ startDate: '2026-04-13', endDate: '2026-04-27', state: 'Đang thực hiện' });
  return { first: w[0], last: w[w.length - 1], hasToday: w.indexOf(isoWeekLabel(new Date())) !== -1, len: w.length };
});
eq('R6a overdue first = Tuần 16/2026', r6.first, 'Tuần 16/2026');
r6.hasToday ? PASS('R6b overdue chứa tuần hiện tại') : FAIL('R6b overdue KHÔNG chứa tuần hiện tại');
(r6.len > 3) ? PASS(`R6c overdue mở rộng (${r6.len} tuần)`) : FAIL(`R6c overdue không mở rộng (${r6.len})`);

// R7: pinned-only (không ngày) + union auto∪pinned dedupe
const r7 = await page.evaluate(() => ({
  pinnedOnly: taskReportWeeks({ tuanBC: 'Tuần 10/2026; Tuần 11/2026' }),
  union: taskReportWeeks({ startDate: '2026-04-13', endDate: '2026-04-20', state: 'Hoàn thành', tuanBC: 'Tuần 30/2026' }),
}));
eq('R7a pinned-only', r7.pinnedOnly, ['Tuần 10/2026', 'Tuần 11/2026']);
eq('R7b union auto+pinned', r7.union, ['Tuần 16/2026', 'Tuần 17/2026', 'Tuần 30/2026']);

// R8: taskInReportWeek membership + badge
const r8 = await page.evaluate(() => {
  const t = { startDate: '2026-04-13', endDate: '2026-04-27', state: 'Hoàn thành' };
  return { in17: taskInReportWeek(t, 'Tuần 17/2026'), in20: taskInReportWeek(t, 'Tuần 20/2026'), badge: taskWeeksBadge(t) };
});
r8.in17 ? PASS('R8a thuộc Tuần 17') : FAIL('R8a phải thuộc Tuần 17');
!r8.in20 ? PASS('R8b không thuộc Tuần 20') : FAIL('R8b không được thuộc Tuần 20');
eq('R8c badge "+N"', r8.badge, 'Tuần 16/2026 (+2)');

jsErrors.length === 0 ? PASS('R9 không có JS error') : FAIL('R9 JS errors: ' + jsErrors.join(' | '));

console.log(`\n  TOTAL: ${pass + fail} | ✅ ${pass} | ❌ ${fail}`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
