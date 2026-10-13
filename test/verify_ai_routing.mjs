/**
 * verify_ai_routing.mjs — S93 AI Assistant tuning (nhanh + tiết kiệm token)
 *
 * Nạp NGUYÊN VĂN backend/AiService.gs vào sandbox Node (stub GAS globals), dữ liệu GIẢ LẬP
 * cùng quy mô thật (1.665 task · 436 initiative). Kiểm:
 *  BD – _aiBuildBundle_: rút gọn đúng cột, dd (ngày tới hạn), bỏ dòng rỗng
 *  PQ – _aiParseQuery_: nhận diện quá hạn/sắp hạn/team/trạng thái/PIC/ý định/từ khóa → tất định hay LLM
 *  DA – _aiDeterministicAnswer_: số đếm đúng ngữ nghĩa FE (Hoàn thành/Tạm dừng không quá hạn)
 *  PR – _aiBuildPrompt_: context ≤ ngân sách (so với ~650K ký tự trước S93), lọc theo từ khóa/ID
 *  CH – aiChatHandle_: câu tất định KHÔNG gọi Gemini; câu khác gọi 1 lần; lỗi → degraded; cache bundle
 *
 * Run: node verify_ai_routing.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'backend', 'AiService.gs'), 'utf8');

let passed = 0, failed = 0;
const log = (id, ok, msg) => { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); ok ? passed++ : failed++; };
const eq  = (id, got, exp) => log(id, JSON.stringify(got) === JSON.stringify(exp),
  `nhận ${JSON.stringify(got)}${JSON.stringify(got) === JSON.stringify(exp) ? '' : ` (kỳ vọng ${JSON.stringify(exp)})`}`);
const ok  = (id, cond, msg) => log(id, !!cond, msg || '');

/* ── Dữ liệu giả lập ── */
const HEADER = ['ID','Tuần BC','Initiative ID','Category','Team chính','Team phối hợp','Loại (Task/BAU/DA/SK)',
  'Task / Deliverable (1 dòng = 1 deliverable cụ thể)','PIC Accountable (Teamlead – chịu trách nhiệm)',
  'PIC Responsible (Member – người thực thi)','PIC Support (Member – người hỗ trợ)','Start Date','Deadline','% HT',
  'Trạng thái','Milestone hiện tại','Kết quả tuần qua','Kế hoạch tuần tới','Vướng mắc','Cần BLĐ (Y/N)',
  'Nội dung cần BLĐ quyết','Cross-team? (Y/N)','Highlight báo cáo lên dashboard? (Y/N)','Ý kiến BLĐ'];
const NOW = new Date(2026, 9, 13, 10, 0, 0);
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (n) => { const d = new Date(2026, 9, 13); d.setDate(d.getDate() + n); return iso(d); };
const mkRow = (o) => {
  const r = HEADER.map(() => '');
  r[0] = o.id; r[2] = o.ini || ''; r[4] = o.team; r[7] = o.name; r[8] = o.acc || 'LeadA';
  r[9] = o.res || ''; r[12] = o.dl || ''; r[13] = o.p == null ? '0%' : o.p + '%'; r[14] = o.st;
  r[16] = o.kq || ''; r[17] = o.kh || ''; r[18] = o.vm || '';
  return r;
};

// Bộ nhỏ có đáp án biết trước
const SMALL = [HEADER,
  mkRow({ id: 'T-1', team: 'BL',      name: 'Triển khai ký số HĐTD', res: 'QuangNV', dl: addDays(-3),  st: 'Đang thực hiện', p: 50, vm: 'chờ CR IT' }),   // quá hạn
  mkRow({ id: 'T-2', team: 'BL',      name: 'BRD SLA giải ngân',     res: 'DungNT',  dl: addDays(-10), st: 'Blocked', p: 20 }),                        // quá hạn
  mkRow({ id: 'T-3', team: 'CV',      name: 'Bản tin ngành BĐS',      res: 'TuanVVA2', dl: addDays(-1), st: 'Hoàn thành', p: 60 }),                    // KHÔNG (hoàn thành)
  mkRow({ id: 'T-4', team: 'CV',      name: 'Dọn worklog',            res: 'TuanVVA2', dl: addDays(-5), st: 'Tạm dừng', p: 0 }),                       // KHÔNG (tạm dừng)
  mkRow({ id: 'T-5', team: 'PTKD MB', name: 'Kế hoạch việc lớn MB',   res: 'NhungPTH7', dl: addDays(3), st: 'Đang thực hiện', p: 30 }),                // sắp hạn
  mkRow({ id: 'T-6', team: 'PTKD MN', name: 'Công cụ công nợ 131-331', res: 'HuongPTT22', dl: addDays(-2), st: 'Đang thực hiện', p: 100 }),           // KHÔNG (100%)
  mkRow({ id: 'T-7', team: 'Số',      name: 'Nghiệm thu SHTD v6.67',  res: 'TuanTT4', dl: addDays(20), st: 'Chưa bắt đầu', p: 0, kq: 'đã redeploy' }),
  mkRow({ id: 'T-8', team: 'BL',      name: '',                       res: 'X', dl: addDays(-3), st: 'Đang thực hiện' }),                               // dòng rỗng tên → bỏ
];
const INIT_HEADER = ['ID','Tên Initiative / Milestone','Category','Accountable','Start Date','Deadline / Target','% HT',
  'Milestone Đang track','Deadline Milestone','Trạng thái','Mục tiêu / KPI đầu ra','Ghi chú','Link tài liệu','Parent ID','Type'];
const INITS = [INIT_HEADER, ['I-1','Số hóa ký số HĐTD','','LeadA','',addDays(30),'40%','UAT',addDays(10),'Đang thực hiện','','','','','Initiative']];

/* ── Stub GAS ── */
const props = { GEMINI_API_KEY: 'k' };
const PropertiesService = { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) };
let fetchQueue = [], fetchLog = [];
const UrlFetchApp = { fetch(url, opts) {
  fetchLog.push({ url, opts });
  const r = fetchQueue.shift() || { code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'LLM' }] } }] }) };
  return { getResponseCode: () => r.code, getContentText: () => r.body };
} };
const store = {};
const CacheService = { getScriptCache: () => ({
  get: k => (k in store ? store[k] : null),
  getAll: ks => { const o = {}; ks.forEach(k => { if (k in store) o[k] = store[k]; }); return o; },
  putAll: (m) => { Object.assign(store, m); }
}) };
const Utilities = {
  sleep: () => {},
  newBlob: (x) => ({ bytes: Buffer.isBuffer(x) ? x : Buffer.from(String(x), 'utf8') }),
  gzip: (b) => ({ getBytes: () => b.bytes }),            // "nén" giả (identity) — chỉ kiểm vòng đời cache
  base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
  base64Decode: (s) => Buffer.from(s, 'base64'),
  ungzip: (b) => ({ getDataAsString: () => b.bytes.toString('utf8') }),
};
const SpreadsheetApp = { openById: () => ({ getSheetByName: () => ({ appendRow: () => {} }), insertSheet: () => ({ appendRow: () => {} }) }) };
const Logger = { log: () => {} };
const Session = { getScriptTimeZone: () => 'Asia/Ho_Chi_Minh' };
let sheetReads = 0, curTasks = SMALL, curInits = INITS;
const sheetRead = () => { sheetReads++; return { values: curTasks }; };
const initiativeRead = () => curInits;
const kpiSheetRead = () => [['KPI','Chỉ tiêu','Thực hiện'], ['Số UC AI','10','4']];
const _dataVer = () => 'V1';

const names = ['callGemini','aiChatHandle_','_aiBuildBundle_','_aiParseQuery_','_aiDeterministicAnswer_','_aiBuildPrompt_',
  '_aiApplyFilters_','_aiNorm_','_aiSummaryText_'];
const factory = new Function('PropertiesService','UrlFetchApp','Utilities','SpreadsheetApp','Logger','Session','CacheService',
  'sheetRead','initiativeRead','kpiSheetRead','_dataVer','SPREADSHEET_ID',
  SRC + '\n;return {' + names.map(n => n + ':' + n).join(',') + '};');
const api = factory(PropertiesService, UrlFetchApp, Utilities, SpreadsheetApp, Logger, Session, CacheService,
  sheetRead, initiativeRead, kpiSheetRead, _dataVer, 'SID');

console.log('\n=== verify_ai_routing ===');

/* ════ BD ════ */
const B = api._aiBuildBundle_(SMALL, INITS, [], NOW);
eq('BD1 bỏ dòng tên rỗng → 7 task', B.tasks.length, 7);
eq('BD2 today', B.today, '2026-10-13');
eq('BD3 T-1 dd=-3 · pic=Responsible', [B.tasks[0].dd, B.tasks[0].pic], [-3, 'QuangNV']);
ok('BD4 chi tiết free-text vào dt', /Kết quả: đã redeploy/.test(B.tasks[6].dt), B.tasks[6].dt);
eq('BD5 initiative gọn có header + 1 dòng', B.inits.length, 2);

/* ════ PQ ════ */
const P = (m, h) => api._aiParseQuery_(m, B, h || []);
let q = P('Có bao nhiêu task quá hạn?');
eq('PQ1 đếm quá hạn → tất định', [q.intent, q.overdue, q.deterministic], ['count', true, true]);
q = P('Liệt kê task quá hạn của team BL');
eq('PQ2 list + team BL', [q.intent, q.team, q.overdue, q.deterministic], ['list', 'BL', true, true]);
q = P('Bao nhiêu task đang Blocked?');
eq('PQ3 trạng thái từ dữ liệu', [q.state, q.deterministic], ['Blocked', true]);
q = P('Task sắp đến hạn của TuanTT4');
eq('PQ4 sắp hạn + PIC (list ngầm? không) → LLM vì không có ý định đếm/liệt kê', [q.soon, q.pic, q.deterministic], [true, 'TuanTT4', false]);
q = P('Danh sách task sắp đến hạn của TuanTT4');
eq('PQ5 danh sách sắp hạn + PIC → tất định', [q.soon, q.pic, q.deterministic], [true, 'TuanTT4', true]);
q = P('Có bao nhiêu task quá hạn liên quan ký số?');
eq('PQ6 còn từ khóa lạ → LLM', [q.deterministic, q.keywords.includes('ky')], [false, true]);
q = P('Tóm tắt tiến độ T-1');
eq('PQ7 nhắc ID → LLM + ids', [q.deterministic, q.ids], [false, ['T-1']]);
q = P('Có bao nhiêu task?');
eq('PQ8 đếm tổng → tất định', q.deterministic, true);
q = P('Số lượng task team số quá hạn');
eq('PQ9 "team số" → team Số (không nhầm "số lượng")', [q.team, q.deterministic], ['Số', true]);
q = P('Đánh giá rủi ro dự án tháng này');
eq('PQ10 câu mở → LLM', q.deterministic, false);

/* ════ DA ════ */
let a = api._aiDeterministicAnswer_(B, P('Có bao nhiêu task quá hạn?'));
ok('DA1 quá hạn = 2 (bỏ Hoàn thành/Tạm dừng/100%)', /\*\*2\*\* task quá hạn/.test(a), a.split('\n')[0]);
ok('DA2 bảng có T-2 (quá hạn lâu nhất) trước T-1', a.indexOf('| T-2 |') !== -1 && a.indexOf('| T-2 |') < a.indexOf('| T-1 |'));
ok('DA3 không chứa T-3/T-4/T-6', !/\| T-[346] \|/.test(a));
ok('DA4 có chú thích không qua AI', /không qua AI/.test(a));
a = api._aiDeterministicAnswer_(B, P('Liệt kê task quá hạn của team BL'));
ok('DA5 BL quá hạn = 2', /\*\*2\*\* task quá hạn, team BL/.test(a), a.split('\n')[0]);
a = api._aiDeterministicAnswer_(B, P('Có bao nhiêu task?'));
ok('DA6 đếm tổng = 7 + theo team, không bảng', /\*\*7\*\* task/.test(a) && /Theo team/.test(a) && a.indexOf('| ID |') === -1);
a = api._aiDeterministicAnswer_(B, P('Bao nhiêu task quá hạn của team PTKD MB?'));
ok('DA7 0 kết quả → câu ngắn', /\*\*0\*\*/.test(a));

/* ════ PR — kích thước prompt trên quy mô thật (giả lập) ════ */
const BIG = [HEADER];
const teams = ['BL', 'CV', 'PTKD MB', 'PTKD MN', 'Số'];
const sts = ['Đang thực hiện', 'Hoàn thành', 'Chưa bắt đầu', 'Blocked', 'Tạm dừng'];
for (let i = 1; i <= 1665; i++) {
  BIG.push(mkRow({ id: 'T-' + i, team: teams[i % 5], st: sts[i % 5], p: (i % 5 === 1) ? 100 : (i % 90),
    name: 'Công việc số ' + i + ' về chuẩn hóa quy trình tín dụng doanh nghiệp và báo cáo định kỳ cho ban lãnh đạo khối',
    res: 'User' + (i % 40), dl: addDays((i % 120) - 60), vm: i % 7 ? '' : 'Chờ phản hồi đơn vị IT về yêu cầu thay đổi hệ thống',
    kq: 'Đã hoàn thành phần phân tích và gửi bản nháp cho các bên liên quan góp ý', kh: 'Tiếp tục hoàn thiện và trình duyệt' }));
}
const BIGI = [INIT_HEADER];
for (let i = 1; i <= 436; i++) BIGI.push(['I-' + i, 'Initiative ' + i + ' chuyển đổi số tín dụng', '', 'Lead' + (i % 9), '', addDays(i % 90), '50%', 'MS ' + i, addDays(i % 30), 'Đang thực hiện', '', '', '', '', 'Initiative']);
const BB = api._aiBuildBundle_(BIG, BIGI, [], NOW);
const sizes = {};
for (const [label, msg] of [
  ['mo', 'Đánh giá tổng quan tiến độ tuần này'],
  ['kw', 'Các việc liên quan báo cáo định kỳ đang vướng gì?'],
  ['id', 'Tóm tắt T-120'],
  ['init', 'Initiative nào đang chậm?'],
]) {
  sizes[label] = api._aiBuildPrompt_(BB, api._aiParseQuery_(msg, BB, [])).length;
}
console.log('   kích thước prompt (ký tự):', JSON.stringify(sizes), '— trước S93 ≈ 650.000');
ok('PR1 câu mở ≤ 40K ký tự', sizes.mo <= 40000, sizes.mo);
ok('PR2 câu từ khóa ≤ 40K ký tự', sizes.kw <= 40000, sizes.kw);
ok('PR3 câu ID ≤ 40K ký tự', sizes.id <= 40000, sizes.id);
ok('PR4 câu initiative ≤ 50K ký tự', sizes.init <= 50000, sizes.init);
const pId = api._aiBuildPrompt_(BB, api._aiParseQuery_('Tóm tắt T-120', BB, []));
ok('PR5 câu ID: T-120 đứng đầu danh sách + có chi tiết', /\nT-120 \|/.test(pId) && /T-120: /.test(pId));
const pSmall = api._aiBuildPrompt_(B, api._aiParseQuery_('Có bao nhiêu task quá hạn liên quan ký số?', B, []));
ok('PR6 lọc quá hạn + từ khóa "ký số" → có T-1, không T-2', /\nT-1 \|/.test(pSmall) && !/\nT-2 \|/.test(pSmall));
ok('PR7 luôn có SỐ LIỆU TÍNH SẴN', /SỐ LIỆU TÍNH SẴN/.test(pSmall));

/* ════ CH — aiChatHandle_ end-to-end (stub) ════ */
curTasks = SMALL; sheetReads = 0; fetchLog = []; for (const k in store) delete store[k];
let r = api.aiChatHandle_('Có bao nhiêu task quá hạn?', []);
eq('CH1 tất định: ok + mode det + 0 lần gọi Gemini', [r.status, r.mode, fetchLog.length], ['ok', 'det', 0]);
r = api.aiChatHandle_('Có bao nhiêu task quá hạn liên quan ký số?', []);
eq('CH2 LLM: 1 lần gọi Gemini, mode llm', [r.status, r.mode, fetchLog.length], ['ok', 'llm', 1]);
eq('CH3 bundle cache: 2 câu chỉ đọc sheet 1 lần', sheetReads, 1);
const sent = JSON.parse(fetchLog[0].opts.payload).system_instruction.parts[0].text;
ok('CH4 câu không hỏi KPI → không gửi KPI', !/DỮ LIỆU KPI/.test(sent));
fetchLog = [];
api.aiChatHandle_('KPI số UC AI đạt bao nhiêu so chỉ tiêu?', []);
ok('CH5 câu hỏi KPI → có KPI', /DỮ LIỆU KPI/.test(JSON.parse(fetchLog[0].opts.payload).system_instruction.parts[0].text));
fetchQueue = [{ code: 429, body: '{"error":{"message":"quota","status":"RESOURCE_EXHAUSTED"}}' },
              { code: 503, body: '{"error":{"message":"busy","status":"UNAVAILABLE"}}' }];
r = api.aiChatHandle_('Đánh giá rủi ro tuần này', []);
eq('CH6 lỗi → OVERLOADED + degraded số liệu', [r.status, r.errorCode, /SỐ LIỆU TÍNH SẴN/.test(r.degraded || '')], ['error', 'GEMINI_OVERLOADED', true]);

const total = passed + failed;
console.log(`\n${'═'.repeat(52)}\nverify_ai_routing.mjs: ${passed}/${total} ${failed === 0 ? 'PASS' : 'FAIL'}\n${'═'.repeat(52)}\n`);
process.exit(failed > 0 ? 1 : 0);
