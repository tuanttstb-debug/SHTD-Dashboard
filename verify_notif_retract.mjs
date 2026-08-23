/**
 * verify_notif_retract.mjs — S74 Notification retraction (fix "task đã đóng vẫn nhắc")
 *
 * Nạp NGUYÊN VĂN backend/NotificationService.gs vào sandbox Node (stub GAS APIs +
 * entity readers), rồi kiểm tra logic thu hồi nhắc due/overdue THẬT — không port tay
 * (tránh drift giữa test và GAS).
 *
 *  NR1  – _notifLiveState_: exist/done phân loại đúng (task/dev/milestone)
 *  NR2  – _notifRetractStale_: thu hồi due/overdue của entity đã done
 *  NR3  – _notifRetractStale_: thu hồi khi entity biến mất (missing)
 *  NR4  – _notifRetractStale_: GIỮ due/overdue của entity còn mở
 *  NR5  – _notifRetractStale_: KHÔNG đụng created/closed (chỉ due-types)
 *  NR6  – _notifRetractStale_: KHÔNG đụng bản ghi đã đọc sẵn
 *  NR7  – notifOnWrite: entity đóng → gỡ nhắc due/overdue cũ + append 'closed'
 *  NR8  – notifOnWrite: entity vẫn mở → không gỡ, không sự kiện
 *  NR9  – notifScan (integration, reconcile): giữ+làm tươi task còn hạn; thu hồi moved-away+done+missing
 *  NR10 – digest suppress: CuongVM1 KHÔNG nhận email nhắc việc; user thường vẫn nhận
 *  NR11 – _notifFmtDue: chuẩn hoá mọi ngày về DD/MM/YYYY (fix "nhầm định dạng")
 *  NR12 – _notifMessage_: luôn xuất DD/MM/YYYY, không echo locale thô
 *  NR13 – reconcile REFRESH: deadline đổi (vẫn overdue) → làm tươi ngày trong message (fix "nhầm tháng")
 *  NR14 – reconcile RETRACT: deadline dời tương lai → thu hồi nhắc overdue sai
 *
 * Run: node verify_notif_retract.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, 'backend', 'NotificationService.gs'), 'utf8');

/* ── test harness ── */
let passed = 0, failed = 0;
function log(id, ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`);
  ok ? passed++ : failed++;
}

/* ── Fake Google Sheets ── */
function makeSheet(rows) {
  // rows = 2D array incl. header at index 0. Mutated in place.
  const sheet = {
    _rows: rows,
    getLastRow() { return this._rows.length; },
    setFrozenRows() {},
    appendRow(arr) { this._rows.push(arr.slice()); },
    deleteRow(r) { this._rows.splice(r - 1, 1); },
    getDataRange() {
      const self = this;
      return { getValues() { return self._rows.map(r => r.slice()); } };
    },
    getRange(r, c, nr, nc) {
      const self = this;
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = self._rows[r - 1 + i] || [];
            const slice = [];
            for (let j = 0; j < nc; j++) slice.push(row[c - 1 + j]);
            out.push(slice);
          }
          return out;
        },
        setValues(vals) {
          for (let i = 0; i < vals.length; i++) {
            const ri = r - 1 + i;
            if (!self._rows[ri]) self._rows[ri] = [];
            for (let j = 0; j < vals[i].length; j++) self._rows[ri][c - 1 + j] = vals[i][j];
          }
        }
      };
    }
  };
  return sheet;
}

function buildEnv({ notifRows, tasks, cases, issues, inits, dev, users }) {
  const notifSheet = makeSheet(notifRows);
  const userSheet  = makeSheet(users);
  const registry = { Notifications: notifSheet, User_Master: userSheet };
  const fakeSS = {
    getSheetByName(name) { return registry[name] || null; },
    insertSheet(name) { const s = makeSheet([[]]); registry[name] = s; return s; }
  };
  const mails = [];
  const env = {
    SpreadsheetApp: { openById: () => fakeSS, flush: () => {} },
    Utilities: { formatDate: (d) => new Date(d).toISOString().slice(0, 10) },
    Session: { getScriptTimeZone: () => 'Asia/Ho_Chi_Minh' },
    MailApp: { sendEmail: (o) => { mails.push(o); } },
    Logger: { log: () => {} },
    SPREADSHEET_ID: 'fake',
    USER_SHEET_NAME: 'User_Master',
    sheetRead: () => ({ values: tasks }),
    caseRead: () => cases,
    issueRead: () => issues,
    initiativeRead: () => inits,
    devRead: () => dev,
    _bumpDataVer: () => { env._bumped = (env._bumped || 0) + 1; }
  };

  const factory = new Function(
    'SpreadsheetApp', 'Utilities', 'Session', 'MailApp', 'Logger',
    'SPREADSHEET_ID', 'USER_SHEET_NAME',
    'sheetRead', 'caseRead', 'issueRead', 'initiativeRead', 'devRead', '_bumpDataVer',
    SRC + '\n;return {' +
      'notifOnWrite:notifOnWrite, notifScan:notifScan, notifRead:notifRead,' +
      '_notifRetractEntity_:_notifRetractEntity_, _notifRetractStale_:_notifRetractStale_,' +
      '_notifLiveState_:_notifLiveState_, _notifIsDone:_notifIsDone, _notifSheet_:_notifSheet_,' +
      '_notifSendDigests_:_notifSendDigests_, _notifDigestSuppressSet_:_notifDigestSuppressSet_,' +
      '_notifFmtDue:_notifFmtDue, _notifMessage_:_notifMessage_,' +
      '_notifReconcileDue_:_notifReconcileDue_, _notifDueCandidates_:_notifDueCandidates_' +
    '};'
  );
  const api = factory(
    env.SpreadsheetApp, env.Utilities, env.Session, env.MailApp, env.Logger,
    env.SPREADSHEET_ID, env.USER_SHEET_NAME,
    env.sheetRead, env.caseRead, env.issueRead, env.initiativeRead, env.devRead, env._bumpDataVer
  );
  return { api, notifSheet, env, mails };
}

/* ── Entity fixtures ── (arrays incl. header row; only referenced cols must be correct)
   task cfg: id0 title7 deadline12 progress13 status14 recips[8,9]
   dev  cfg: id0 title1 deadline6 status7 recips[3]
   init cfg: id0 title1 deadline5 status9 type14 recips[3]  */
function taskRow(id, title, deadline, progress, state, acc, res) {
  const r = new Array(25).fill('');
  r[0] = id; r[7] = title; r[12] = deadline; r[13] = progress; r[14] = state; r[8] = acc; r[9] = res;
  return r;
}
function devRow(id, title, deadline, state, pic) {
  const r = new Array(12).fill('');
  r[0] = id; r[1] = title; r[6] = deadline; r[7] = state; r[3] = pic;
  return r;
}
function initRow(id, title, deadline, status, type, acc) {
  const r = new Array(15).fill('');
  r[0] = id; r[1] = title; r[5] = deadline; r[9] = status; r[14] = type; r[3] = acc;
  return r;
}

const TASK_HDR = new Array(25).fill('h');
const DEV_HDR  = new Array(12).fill('h');
const INIT_HDR = new Array(15).fill('h');
const USER_ROWS = [['Username', 'Display_Name', 'Email', 'Active'], ['tuan', 'Tuan', '', 'TRUE']];

const FUT = '2099-01-01';   // deadline xa → không sinh candidate mới
const TASKS = [TASK_HDR,
  taskRow('T-OPEN', 'Task Open', FUT, 0,   'Đang thực hiện', 'tuan', 'tuan'),
  taskRow('T-DONE', 'Task Done', FUT, 100, 'Hoàn thành',     'tuan', 'tuan')
];
const DEV   = [DEV_HDR, devRow('DEV-DONE', 'Dev Done', FUT, 'Hoàn thành', 'tuan')];
const INITS = [INIT_HDR, initRow('SCF-001-M1', 'MS Done', FUT, 'Done', 'milestone', 'tuan')];
const CASES = [new Array(20).fill('h')];
const ISSUES = [new Array(18).fill('h')];

/* notif row builder: [id,user,type,etype,eid,title,due,msg,createdTs,readTs,emailed] */
const OLD = '2026-01-01T00:00:00.000Z';
const NOW = new Date().toISOString();           // gần đây → sống sót _notifPurge_ (>30 ngày)
function nrow(id, type, etype, eid, read, ts) {
  ts = ts || OLD;
  return [id, 'tuan', type, etype, eid, eid, '', '[x] ' + type, ts, read ? OLD : '', ''];
}

console.log('\n══════════════════════════════════════════════');
console.log('  S74 Notification Retraction — GAS sandbox EVD');
console.log('══════════════════════════════════════════════\n');

/* ══ NR1 — live state ══ */
{
  const { api } = buildEnv({ notifRows: [['h']], tasks: TASKS, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const live = api._notifLiveState_();
  log('NR1-exist',  live.exist['task|T-OPEN'] && live.exist['task|T-DONE'] && live.exist['dev|DEV-DONE'] && live.exist['milestone|SCF-001-M1'], 'exist gồm mọi entity còn tồn tại');
  log('NR1-done',   live.done['task|T-DONE'] && live.done['dev|DEV-DONE'] && live.done['milestone|SCF-001-M1'], 'done gồm task/dev/milestone đã đóng');
  log('NR1-open',   !live.done['task|T-OPEN'], 'task còn mở KHÔNG nằm trong done');
}

/* ══ NR2–NR6 — retract stale ══ */
{
  const notifRows = [
    ['NotifID', 'Username', 'Type', 'EntityType', 'EntityID', 'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'],
    nrow('n-done',    'overdue',   'task',      'T-DONE',       false), // → retract (done)
    nrow('n-open',    'due-today', 'task',      'T-OPEN',       false), // keep (open)
    nrow('n-missing', 'overdue',   'task',      'T-GONE',       false), // → retract (missing)
    nrow('n-dev',     'due-3d',    'dev',       'DEV-DONE',     false), // → retract (done)
    nrow('n-ms',      'overdue',   'milestone', 'SCF-001-M1',   false), // → retract (done)
    nrow('n-created', 'created',   'task',      'T-DONE',       false), // keep (not due-type)
    nrow('n-read',    'overdue',   'task',      'T-DONE',       true)   // keep (already read)
  ];
  const { api, notifSheet } = buildEnv({ notifRows, tasks: TASKS, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const changed = api._notifRetractStale_(notifSheet, api._notifLiveState_());
  const byId = {};
  notifSheet._rows.slice(1).forEach(r => { byId[r[0]] = r[9]; }); // ReadTs
  log('NR2-done',    !!byId['n-done'],    'nhắc overdue của task DONE bị thu hồi (ReadTs set)');
  log('NR3-missing', !!byId['n-missing'], 'nhắc overdue của task biến mất bị thu hồi');
  log('NR2-dev',     !!byId['n-dev'],     'nhắc due-3d của dev DONE bị thu hồi');
  log('NR2-ms',      !!byId['n-ms'],      'nhắc overdue của milestone DONE bị thu hồi');
  log('NR4-open',    !byId['n-open'],     'nhắc due-today của task MỞ được GIỮ (chưa đọc)');
  log('NR5-created', !byId['n-created'],  'created KHÔNG bị thu hồi (chỉ due-types)');
  log('NR6-read',    byId['n-read'] === OLD, 'bản ghi đã đọc sẵn không bị đụng');
  log('NR2-count',   changed === 4, `số thu hồi = ${changed} (expected 4)`);
}

/* ══ NR7 — real-time onWrite: close ══ */
{
  const notifRows = [
    ['NotifID', 'Username', 'Type', 'EntityType', 'EntityID', 'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'],
    nrow('rt-overdue', 'overdue', 'task', 'T-OPEN', false)
  ];
  const { api, notifSheet } = buildEnv({ notifRows, tasks: TASKS, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const closedRow = taskRow('T-OPEN', 'Task Open', FUT, 100, 'Hoàn thành', 'tuan', 'tuan');
  api.notifOnWrite('task', 'T-OPEN', closedRow, { existed: true, done: false });
  const rows = notifSheet._rows.slice(1);
  const retracted = rows.find(r => r[0] === 'rt-overdue');
  const closedEvt = rows.find(r => r[2] === 'closed' && r[4] === 'T-OPEN');
  log('NR7-retract', !!retracted[9], 'đóng task → nhắc overdue cũ bị thu hồi ngay (real-time)');
  log('NR7-closed',  !!closedEvt,    'append 1 sự kiện "closed" cho recipient');
}

/* ══ NR8 — onWrite: still open → no-op ══ */
{
  const notifRows = [
    ['NotifID', 'Username', 'Type', 'EntityType', 'EntityID', 'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'],
    nrow('rt-keep', 'overdue', 'task', 'T-OPEN', false)
  ];
  const { api, notifSheet } = buildEnv({ notifRows, tasks: TASKS, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const openRow = taskRow('T-OPEN', 'Task Open', FUT, 40, 'Đang thực hiện', 'tuan', 'tuan');
  api.notifOnWrite('task', 'T-OPEN', openRow, { existed: true, done: false });
  const r = notifSheet._rows.slice(1);
  log('NR8-keep', !r[0][9], 'task vẫn mở → nhắc overdue KHÔNG bị thu hồi');
  log('NR8-noevt', r.length === 1, 'không append sự kiện thừa');
}

/* ══ NR9 — notifScan integration (reconcile: giữ+làm tươi / thu hồi moved-away+done+missing) ══ */
{
  const TODAY = new Date().toISOString().slice(0, 10);   // ISO → due-today
  const tasksNr9 = [TASK_HDR,
    taskRow('T-DUE',   'Task Due Today', TODAY, 0,   'Đang thực hiện', 'tuan', 'tuan'), // còn hạn hôm nay → giữ
    taskRow('T-MOVED', 'Task Moved',     FUT,   0,   'Đang thực hiện', 'tuan', 'tuan'), // deadline dời xa → moved-away
    taskRow('T-DONE',  'Task Done',      FUT,   100, 'Hoàn thành',     'tuan', 'tuan')  // done
  ];
  const notifRows = [
    ['NotifID', 'Username', 'Type', 'EntityType', 'EntityID', 'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'],
    nrow('tuan|task|T-DUE|due-today', 'due-today', 'task', 'T-DUE',   false, NOW), // giữ + làm tươi
    nrow('tuan|task|T-MOVED|overdue', 'overdue',   'task', 'T-MOVED', false, NOW), // thu hồi (moved-away)
    nrow('tuan|task|T-DONE|overdue',  'overdue',   'task', 'T-DONE',  false, NOW), // thu hồi (done)
    nrow('tuan|task|T-GONE|overdue',  'overdue',   'task', 'T-GONE',  false, NOW)  // thu hồi (missing)
  ];
  const { api, notifSheet, env } = buildEnv({ notifRows, tasks: tasksNr9, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const res = api.notifScan();
  const byId = {};
  notifSheet._rows.slice(1).forEach(r => { byId[r[0]] = { read: r[9], msg: r[7], due: r[6] }; });
  log('NR9-retract-count', res.retracted === 3, `notifScan.retracted = ${res.retracted} (expected 3: moved+done+missing)`);
  log('NR9-moved',   !!byId['tuan|task|T-MOVED|overdue'].read, 'overdue của task deadline dời TƯƠNG LAI → thu hồi (fix gốc)');
  log('NR9-done',    !!byId['tuan|task|T-DONE|overdue'].read && !!byId['tuan|task|T-GONE|overdue'].read, 'done + missing → thu hồi');
  log('NR9-keep',    !byId['tuan|task|T-DUE|due-today'].read, 'nhắc của task VẪN đến hạn hôm nay được GIỮ (chưa đọc)');
  log('NR9-refresh', res.refreshed === 1 && byId['tuan|task|T-DUE|due-today'].due !== '', 'nhắc còn hạn được LÀM TƯƠI (DueDate/message cập nhật từ live)');
  log('NR9-bump',    env._bumped >= 1, 'DATA_VER được bump khi có thay đổi');
}

/* ══ NR10 — digest email suppress (CuongVM1 no nhắc-việc email, keep report email) ══ */
{
  const H = ['NotifID', 'Username', 'Type', 'EntityType', 'EntityID', 'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'];
  const mkrow = (id, user, type) => [id, user, type, 'task', 'E-' + id, 'title', '', '[x] ' + type, NOW, '', ''];
  const notifRows = [H, mkrow('d-cuong', 'cuongvm1', 'overdue'), mkrow('d-tuan', 'tuan', 'overdue')];
  const { api, notifSheet, mails } = buildEnv({ notifRows, tasks: TASKS, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  // No Report_Config sheet in env → _notifDigestSuppressSet_ falls back to default ['cuongvm1'].
  const suppress = api._notifDigestSuppressSet_();
  const users = {
    cuongvm1: { username: 'CuongVM1', display: 'Cuong', email: 'cuong@x', active: true },
    tuan:     { username: 'Tuan',     display: 'Tuan',  email: 'tuan@x',  active: true }
  };
  const sent = api._notifSendDigests_(notifSheet, users);
  const toCuong = mails.some(m => m.to === 'cuong@x');
  const toTuan  = mails.some(m => m.to === 'tuan@x');
  const byId = {}; notifSheet._rows.slice(1).forEach(r => { byId[r[0]] = r[10]; });
  log('NR10-default-set',    !!suppress['cuongvm1'],  'suppress-set mặc định gồm cuongvm1');
  log('NR10-suppress-cuong', !toCuong,                'CuongVM1 KHÔNG nhận email digest nhắc việc');
  log('NR10-send-tuan',      toTuan,                  'user thường vẫn nhận email digest');
  log('NR10-marked',         !!byId['d-cuong'] && !!byId['d-tuan'], 'cả 2 dòng vẫn đánh dấu EmailedDate (không lặp lô sau)');
  log('NR10-sent-count',     sent === 1,              `sent=${sent} (chỉ 1 email — user thường)`);
}

/* ══ NR11 — _notifFmtDue: chuẩn hoá mọi ngày về DD/MM/YYYY ══ */
{
  const { api } = buildEnv({ notifRows: [['h']], tasks: TASKS, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  log('NR11-mmm-en',  api._notifFmtDue('31-Jul-26')  === '31/07/2026', 'locale Anh "31-Jul-26" → 31/07/2026');
  log('NR11-mmm-aug', api._notifFmtDue('24-Jul-26')  === '24/07/2026', '"24-Jul-26" → 24/07/2026');
  log('NR11-iso',     api._notifFmtDue('2026-08-31')  === '31/08/2026', 'ISO "2026-08-31" → 31/08/2026');
  log('NR11-slash',   api._notifFmtDue('21/08/2026')  === '21/08/2026', 'DD/MM/YYYY giữ nguyên chuẩn');
  log('NR11-empty',   api._notifFmtDue('')            === '',           'rỗng → rỗng');
  log('NR11-bad',     api._notifFmtDue('không-ngày')  === 'không-ngày', 'không parse được → GIỮ NGUYÊN (không phá)');
}

/* ══ NR12 — _notifMessage_ luôn xuất DD/MM/YYYY (không echo locale thô) ══ */
{
  const { api } = buildEnv({ notifRows: [['h']], tasks: TASKS, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const m = api._notifMessage_('task', 'overdue', 'Cập nhật user', '31-Jul-26');
  log('NR12-has-slash', m.indexOf('31/07/2026') !== -1, 'message overdue chứa 31/07/2026');
  log('NR12-no-raw',    m.indexOf('31-Jul-26') === -1,   'message KHÔNG còn "31-Jul-26" thô');
}

/* ══ NR13 — reconcile REFRESH: deadline đổi (vẫn overdue) → làm tươi ngày trong message ══ */
{
  const OVD = '2026-08-20';   // quá khứ (hôm nay 2026-08-2x+) → vẫn overdue → có candidate
  const tasks13 = [TASK_HDR, taskRow('T-RE', 'Task Refresh', OVD, 0, 'Đang thực hiện', 'tuan', 'tuan')];
  const notifRows = [
    ['NotifID', 'Username', 'Type', 'EntityType', 'EntityID', 'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'],
    // bản ghi cũ mang ngày SAI (locale/tháng cũ)
    ['tuan|task|T-RE|overdue', 'tuan', 'overdue', 'task', 'T-RE', 'Task Refresh', '31-Jul-26',
     '[Task] ⚠️ Đã quá hạn: "Task Refresh" (hạn 31-Jul-26)', NOW, '', '']
  ];
  const { api, notifSheet } = buildEnv({ notifRows, tasks: tasks13, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const cands = api._notifDueCandidates_('task');
  const rec = api._notifReconcileDue_(notifSheet, cands);
  const row = notifSheet._rows.slice(1).find(r => r[0] === 'tuan|task|T-RE|overdue');
  log('NR13-refreshed', rec.refreshed === 1 && rec.retracted === 0, `refreshed=${rec.refreshed} retracted=${rec.retracted} (1/0)`);
  log('NR13-newdate',   String(row[7]).indexOf('20/08/2026') !== -1, 'message làm tươi theo deadline live → 20/08/2026');
  log('NR13-nostale',   String(row[7]).indexOf('31-Jul-26') === -1,  'message KHÔNG còn ngày cũ "31-Jul-26"');
  log('NR13-duecol',    String(row[6]) === '20/08/2026',             'cột DueDate cũng cập nhật DD/MM/YYYY');
  log('NR13-unread',    !row[9],                                     'vẫn CHƯA đọc (task còn quá hạn — không thu hồi)');
}

/* ══ NR14 — reconcile RETRACT: deadline dời TƯƠNG LAI → task không còn overdue → thu hồi ══ */
{
  const tasks14 = [TASK_HDR, taskRow('T-FWD', 'Task Forward', FUT, 0, 'Đang thực hiện', 'tuan', 'tuan')];
  const notifRows = [
    ['NotifID', 'Username', 'Type', 'EntityType', 'EntityID', 'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'],
    ['tuan|task|T-FWD|overdue', 'tuan', 'overdue', 'task', 'T-FWD', 'Task Forward', '31-Jul-26',
     '[Task] ⚠️ Đã quá hạn: "Task Forward" (hạn 31-Jul-26)', NOW, '', '']
  ];
  const { api, notifSheet } = buildEnv({ notifRows, tasks: tasks14, cases: CASES, issues: ISSUES, inits: INITS, dev: DEV, users: USER_ROWS });
  const cands = api._notifDueCandidates_('task');
  const rec = api._notifReconcileDue_(notifSheet, cands);
  const row = notifSheet._rows.slice(1).find(r => r[0] === 'tuan|task|T-FWD|overdue');
  log('NR14-retracted', rec.retracted === 1 && rec.refreshed === 0, `retracted=${rec.retracted} refreshed=${rec.refreshed} (1/0)`);
  log('NR14-read',      !!row[9], 'nhắc overdue của task nay hạn tương lai bị thu hồi (mark-read) → email hết nhắc sai');
}

console.log('\n──────────────────────────────────────────────');
console.log(`  ${passed}/${passed + failed} PASS` + (failed ? `  (${failed} FAIL)` : ''));
console.log('──────────────────────────────────────────────\n');
process.exit(failed ? 1 : 0);
