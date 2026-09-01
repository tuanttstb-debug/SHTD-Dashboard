/**
 * verify_calendar_sync.mjs — CalendarSyncService.gs (Pha 1, TuanTT4)
 *
 * Nạp NGUYÊN VĂN backend/CalendarSyncService.gs vào sandbox Node (stub GAS) và chạy
 * LOGIC THUẦN thật — không port tay. Phần chạm CalendarApp (create/update/delete event)
 * do [TT] smoke live (cần tài khoản Google thật). Ở đây kiểm phần quyết định:
 *
 *  CS1  – _calParseDate: ISO / DD-MMM-YY / DD/MM/YYYY / Date / rỗng
 *  CS2  – _calRecurNorm: Tuần/Tháng/loose/rỗng
 *  CS3  – _calTaskDone / _calInitDone
 *  CS4  – _calRecipMatch: khớp Res/Acc theo username (tách ; , /)
 *  CS5  – _calDesiredEvents: recurring→RECUR · deadline tương lai→DUE · quá hạn→bỏ ·
 *         done→bỏ · không phụ trách→bỏ · initiative deadline→DUE · milestone→bỏ
 *  CS6  – _calContentSig: đổi title/date/freq → hash đổi (→ update)
 *  CS7  – _calDiff: create / update / delete / keep đúng phân loại
 *  CS8  – idempotent: desired == existing (hash khớp) → 0 create/update/delete
 *  CS9  – tắt (desired rỗng) → mọi existing vào del
 *
 * Run: node verify_calendar_sync.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(__dirname, 'backend', 'CalendarSyncService.gs'), 'utf8');

let passed = 0, failed = 0;
const log = (id, ok, msg) => { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); ok ? passed++ : failed++; };
const eq  = (id, got, exp) => log(id, JSON.stringify(got) === JSON.stringify(exp),
  `nhận ${JSON.stringify(got)}${JSON.stringify(got) === JSON.stringify(exp) ? '' : ` (kỳ vọng ${JSON.stringify(exp)})`}`);
const ok  = (id, cond, msg) => log(id, !!cond, msg || '');

// ── Sandbox: chỉ cần source parse; hàm thuần không chạm global GAS khi gọi ──
const factory = new Function(
  'Logger',
  SRC + '\n;return {' +
    '_calParseDate:_calParseDate, _calRecurNorm:_calRecurNorm, _calTaskDone:_calTaskDone,' +
    '_calInitDone:_calInitDone, _calRecipMatch:_calRecipMatch, _calDesiredEvents:_calDesiredEvents,' +
    '_calContentSig:_calContentSig, _calDiff:_calDiff, _calMakeSpec:_calMakeSpec, _calIsoOf:_calIsoOf' +
  '};'
);
const api = factory({ log: () => {} });

console.log('\n=== verify_calendar_sync ===');

/* CS1 — parse date */
eq('CS1a ISO', api._calIsoOf(api._calParseDate('2026-09-10')), '2026-09-10');
eq('CS1b DD-MMM-YY', api._calIsoOf(api._calParseDate('10-Sep-26')), '2026-09-10');
eq('CS1c DD/MM/YYYY', api._calIsoOf(api._calParseDate('10/09/2026')), '2026-09-10');
eq('CS1d Date obj', api._calIsoOf(api._calParseDate(new Date(2026, 8, 10))), '2026-09-10');
ok('CS1e rỗng → null', api._calParseDate('') === null);

/* CS2 — recur norm */
eq('CS2a Tuần', api._calRecurNorm('Tuần'), 'Tuần');
eq('CS2b weekly', api._calRecurNorm('  weekly '), 'Tuần');
eq('CS2c Tháng', api._calRecurNorm('monthly'), 'Tháng');
eq('CS2d rỗng', api._calRecurNorm(''), '');

/* CS3 — done */
ok('CS3a task hoàn thành', api._calTaskDone('Hoàn thành', '') === true);
ok('CS3b task 100%', api._calTaskDone('Đang làm', '100%') === true);
ok('CS3c task chưa xong', api._calTaskDone('Đang làm', '40%') === false);
ok('CS3d init done', api._calInitDone('Done') === true);

/* CS4 — recip match */
ok('CS4a khớp cột 8', api._calRecipMatch(mkTaskRow({ res: 'TuanTT4' }), [8, 9], 'tuantt4') === true);
ok('CS4b khớp cột 9', api._calRecipMatch(mkTaskRow({ acc: 'TuanTT4' }), [8, 9], 'tuantt4') === true);
ok('CS4c list phẩy', api._calRecipMatch(mkTaskRow({ res: 'AnNV; TuanTT4' }), [8, 9], 'tuantt4') === true);
ok('CS4d không khớp', api._calRecipMatch(mkTaskRow({ res: 'AnNV' }), [8, 9], 'tuantt4') === false);

/* CS5 — desired events */
const NOW = new Date(2026, 8, 1); // 2026-09-01
const taskVals = [
  mkTaskHeader(),
  mkTaskRow({ id: 'T-RECUR', title: 'Báo cáo tuần', res: 'TuanTT4', start: '2026-08-31', recur: 'Tuần', progress: '20%' }),
  mkTaskRow({ id: 'T-DUE',   title: 'Nộp hồ sơ',   res: 'TuanTT4', deadline: '2026-09-10', progress: '0%' }),
  mkTaskRow({ id: 'T-PAST',  title: 'Việc quá hạn', res: 'TuanTT4', deadline: '2026-08-20', progress: '0%' }),
  mkTaskRow({ id: 'T-DONE',  title: 'Đã xong',      res: 'TuanTT4', deadline: '2026-09-10', progress: '100%' }),
  mkTaskRow({ id: 'T-OTHER', title: 'Việc người khác', res: 'AnNV', deadline: '2026-09-10' }),
];
const initVals = [
  mkInitHeader(),
  mkInitRow({ id: 'INI-1',   title: 'Sáng kiến A', recip: 'TuanTT4', deadline: '2026-12-31', status: 'Đang làm' }),
  mkInitRow({ id: 'INI-2-M3', title: 'Mốc phụ',    recip: 'TuanTT4', deadline: '2026-10-01', type: 'milestone' }),
  mkInitRow({ id: 'INI-3',   title: 'Đã xong',     recip: 'TuanTT4', deadline: '2026-12-31', status: 'Done' }),
];
const desired = api._calDesiredEvents('TuanTT4', taskVals, initVals, NOW);
const dKeys = desired.map(s => s.key).sort();
eq('CS5a tập key mong muốn', dKeys, ['initiative|INI-1|DUE', 'task|T-DUE|DUE', 'task|T-RECUR|RECUR']);
const recurSpec = desired.find(s => s.entityId === 'T-RECUR');
eq('CS5b recur freq', recurSpec.freq, 'Tuần');
eq('CS5c recur date = start', recurSpec.dateISO, '2026-08-31');
const dueSpec = desired.find(s => s.entityId === 'T-DUE');
eq('CS5d due date', dueSpec.dateISO, '2026-09-10');

/* CS6 — content sig đổi */
const base = api._calMakeSpec('task', 'X', 'due', 'A', '2026-09-10', '');
ok('CS6a đổi title → hash khác', base.hash !== api._calMakeSpec('task', 'X', 'due', 'B', '2026-09-10', '').hash);
ok('CS6b đổi date → hash khác',  base.hash !== api._calMakeSpec('task', 'X', 'due', 'A', '2026-09-11', '').hash);
ok('CS6c giống hệt → hash bằng', base.hash === api._calMakeSpec('task', 'X', 'due', 'A', '2026-09-10', '').hash);

/* CS7 — diff */
const existing = [
  { key: 'task|T-RECUR|RECUR', eventId: 'ev1', hash: recurSpec.hash },        // keep (khớp)
  { key: 'task|T-DUE|DUE',     eventId: 'ev2', hash: 'OLDHASH' },              // update (đổi)
  { key: 'task|T-GONE|DUE',    eventId: 'ev3', hash: 'h' },                    // delete (mất khỏi desired)
];
const diff = api._calDiff(desired, existing);
eq('CS7a create keys', diff.create.map(s => s.key).sort(), ['initiative|INI-1|DUE']);
eq('CS7b update keys', diff.update.map(u => u.spec.key), ['task|T-DUE|DUE']);
eq('CS7c delete keys', diff.del.map(d => d.key), ['task|T-GONE|DUE']);
eq('CS7d keep keys',   diff.keep.map(k => k.spec.key), ['task|T-RECUR|RECUR']);
ok('CS7e update giữ eventId', diff.update[0].eventId === 'ev2');
ok('CS7f delete giữ eventId', diff.del[0].eventId === 'ev3');

/* CS8 — idempotent */
const existAll = desired.map(s => ({ key: s.key, eventId: 'e', hash: s.hash }));
const diff2 = api._calDiff(desired, existAll);
ok('CS8 idempotent (0 thay đổi)', diff2.create.length === 0 && diff2.update.length === 0 && diff2.del.length === 0 && diff2.keep.length === desired.length);

/* CS9 — tắt: desired rỗng → mọi existing vào del */
const diff3 = api._calDiff([], existing);
ok('CS9 tắt → del toàn bộ', diff3.del.length === existing.length && diff3.create.length === 0);

/* ── helpers dựng dòng ── */
function mkTaskHeader() { const a = new Array(27).fill(''); a[0] = 'ID'; a[7] = 'Task'; return a; }
function mkTaskRow(o) {
  const a = new Array(27).fill('');
  a[0] = o.id || 'T'; a[7] = o.title || ''; a[8] = o.res || ''; a[9] = o.acc || '';
  a[11] = o.start || ''; a[12] = o.deadline || ''; a[13] = o.progress || ''; a[14] = o.status || '';
  a[25] = o.recur || '';
  return a;
}
function mkInitHeader() { const a = new Array(15).fill(''); a[0] = 'ID'; a[1] = 'Name'; return a; }
function mkInitRow(o) {
  const a = new Array(15).fill('');
  a[0] = o.id || 'I'; a[1] = o.title || ''; a[3] = o.recip || ''; a[5] = o.deadline || '';
  a[9] = o.status || ''; a[14] = o.type || '';
  return a;
}

console.log(`\n${failed === 0 ? '✅ PASS' : '❌ FAIL'} — ${passed} pass, ${failed} fail`);
process.exit(failed === 0 ? 0 : 1);
