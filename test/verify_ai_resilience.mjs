/**
 * verify_ai_resilience.mjs — AiService.gs (Nhóm 1: retry+backoff+fallback+phân loại lỗi)
 *
 * Nạp NGUYÊN VĂN backend/AiService.gs vào sandbox Node (stub GAS globals) và chạy LOGIC
 * THUẦN thật của callGemini + helpers — không port tay. Mock UrlFetchApp qua hàng đợi phản hồi
 * để mô phỏng 503/404/400/200. Kiểm:
 *
 *  MC  – _aiModelChain: property rỗng→[primary] · phẩy · JSON array · dedup giữ thứ tự
 *  BO  – _aiBackoffMs_: 1s/2s + jitter đúng khoảng
 *  EC  – _aiErrClass_: 503/429→TRANSIENT · 404/NOT_FOUND→MODEL_DEAD · 400→BADREQUEST · 403→AUTH
 *  CG  – callGemini: 503→retry→ok · hết retry→fallback model · tất cả 503→throw OVERLOADED ·
 *        404→nhảy model NGAY (không retry) · 400→throw BADREQUEST không fallback · ok phát đầu ·
 *        empty(SAFETY)→thử model kế · thiếu API key→throw
 *  ER  – _aiErrorResponse_: OVERLOADED→retriable+degraded · BADREQUEST→không retriable/degraded ·
 *        _aiSummaryFromContext_ cắt đúng ở marker
 *
 * Run: node verify_ai_resilience.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(__dirname, 'backend', 'AiService.gs'), 'utf8');

let passed = 0, failed = 0;
const log = (id, ok, msg) => { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); ok ? passed++ : failed++; if (!ok) process.exitCode = 1; };
const eq  = (id, got, exp) => log(id, JSON.stringify(got) === JSON.stringify(exp),
  `nhận ${JSON.stringify(got)}${JSON.stringify(got) === JSON.stringify(exp) ? '' : ` (kỳ vọng ${JSON.stringify(exp)})`}`);
const ok  = (id, cond, msg) => log(id, !!cond, msg || '');

/* ── Stub GAS globals (điều khiển được) ── */
const props = {};
const PropertiesService = { getScriptProperties: () => ({
  getProperty: k => (k in props ? props[k] : null),
  setProperty: (k, v) => { props[k] = v; },
}) };

let fetchQueue = [];   // [{code, body}] tiêu thụ theo thứ tự
let fetchLog = [];     // url mỗi lần gọi
const UrlFetchApp = { fetch(url) {
  fetchLog.push(url);
  const r = fetchQueue.shift() || { code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'DEFAULT' }] } }] }) };
  return { getResponseCode: () => r.code, getContentText: () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) };
} };

let sleepLog = [];
const Utilities = { sleep: ms => sleepLog.push(ms), formatDate: () => '2026-09-04' };

// SpreadsheetApp stub cho _aiLog_ (best-effort — chỉ cần không ném)
const SpreadsheetApp = { openById: () => ({
  getSheetByName: () => ({ appendRow: () => {} }),
  insertSheet: () => ({ appendRow: () => {} }),
}) };
const Logger = { log: () => {} };
const Session = { getScriptTimeZone: () => 'Asia/Ho_Chi_Minh' };

const factory = new Function(
  'PropertiesService', 'UrlFetchApp', 'Utilities', 'SpreadsheetApp', 'Logger', 'Session', 'SPREADSHEET_ID',
  SRC + '\n;return {' +
    'callGemini:callGemini, _aiModelChain:_aiModelChain, _aiBackoffMs_:_aiBackoffMs_,' +
    '_aiErrClass_:_aiErrClass_, _aiErrorResponse_:_aiErrorResponse_, _aiSummaryFromContext_:_aiSummaryFromContext_' +
  '};'
);
const api = factory(PropertiesService, UrlFetchApp, Utilities, SpreadsheetApp, Logger, Session, 'SHEET_ID_TEST');

/* ── Helper tạo phản hồi ── */
const rOk    = (text = 'ANSWER') => ({ code: 200, body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) });
const r503   = () => ({ code: 503, body: JSON.stringify({ error: { message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' } }) });
const r404   = () => ({ code: 404, body: JSON.stringify({ error: { message: 'model not found', status: 'NOT_FOUND' } }) });
const r400   = () => ({ code: 400, body: JSON.stringify({ error: { message: 'bad payload', status: 'INVALID_ARGUMENT' } }) });
const rEmpty = (fr = 'SAFETY') => ({ code: 200, body: JSON.stringify({ candidates: [{ finishReason: fr }] }) });

function resetCall(chain) {
  fetchQueue = []; fetchLog = []; sleepLog = [];
  props['GEMINI_API_KEY'] = 'test-key';
  if (chain === undefined) delete props['AI_MODEL_CHAIN'];
  else props['AI_MODEL_CHAIN'] = JSON.stringify(chain);
}

console.log('\n=== verify_ai_resilience ===');

/* ════ MC — model chain ════ */
delete props['AI_MODEL_CHAIN'];
eq('MC1 rỗng→[primary]', api._aiModelChain(), ['gemini-flash-latest']);
props['AI_MODEL_CHAIN'] = 'gemini-flash-latest, model-b , model-c';
eq('MC2 phẩy', api._aiModelChain(), ['gemini-flash-latest', 'model-b', 'model-c']);
props['AI_MODEL_CHAIN'] = JSON.stringify(['gemini-flash-latest', 'model-b']);
eq('MC3 JSON array', api._aiModelChain(), ['gemini-flash-latest', 'model-b']);
props['AI_MODEL_CHAIN'] = JSON.stringify(['a', 'a', 'b', 'a']);
eq('MC4 dedup giữ thứ tự', api._aiModelChain(), ['a', 'b']);

/* ════ BO — backoff ════ */
const b0 = api._aiBackoffMs_(0), b1 = api._aiBackoffMs_(1);
ok('BO1 attempt0 ∈ [1000,1500)', b0 >= 1000 && b0 < 1500, `= ${b0}`);
ok('BO2 attempt1 ∈ [2000,2500)', b1 >= 2000 && b1 < 2500, `= ${b1}`);

/* ════ EC — phân loại lỗi ════ */
eq('EC1 503→TRANSIENT', api._aiErrClass_(503, 'UNAVAILABLE'), 'TRANSIENT');
eq('EC2 429→TRANSIENT', api._aiErrClass_(429, ''), 'TRANSIENT');
eq('EC3 404→MODEL_DEAD', api._aiErrClass_(404, ''), 'MODEL_DEAD');
eq('EC4 400→BADREQUEST', api._aiErrClass_(400, 'INVALID_ARGUMENT'), 'BADREQUEST');
eq('EC5 403→AUTH', api._aiErrClass_(403, ''), 'AUTH');
eq('EC6 NOT_FOUND→MODEL_DEAD', api._aiErrClass_(200, 'NOT_FOUND'), 'MODEL_DEAD');

/* ════ CG — callGemini ════ */
// CG1: 503 rồi ok trên model chính → thành công, 2 fetch, 1 sleep
resetCall();
fetchQueue = [r503(), rOk()];
eq('CG1 kết quả', api.callGemini('ctx', [], 'q'), 'ANSWER');
eq('CG1 số fetch', fetchLog.length, 2);
eq('CG1 số sleep (backoff 1 lần)', sleepLog.length, 1);

// CG2: chính 3×503 → fallback model → ok. 4 fetch, url cuối = fallback
resetCall(['gemini-flash-latest', 'fallback-model']);
fetchQueue = [r503(), r503(), r503(), rOk('FB')];
eq('CG2 kết quả fallback', api.callGemini('ctx', [], 'q'), 'FB');
eq('CG2 số fetch (3 chính + 1 fallback)', fetchLog.length, 4);
ok('CG2 fetch cuối = fallback-model', /fallback-model:/.test(fetchLog[3]), fetchLog[3]);

// CG3: tất cả 503 → throw GEMINI_OVERLOADED, đúng 4 fetch (3+1)
resetCall(['gemini-flash-latest', 'fallback-model']);
fetchQueue = [r503(), r503(), r503(), r503()];
let cg3 = '';
try { api.callGemini('ctx', [], 'q'); } catch (e) { cg3 = e.message; }
ok('CG3 throw OVERLOADED', cg3.indexOf('GEMINI_OVERLOADED|') === 0, cg3);
eq('CG3 số fetch (không quá ngân sách)', fetchLog.length, 4);

// CG4: 404 model chính → NHẢY model kế NGAY (không retry 3 lần), fallback ok
resetCall(['gemini-flash-latest', 'fallback-model']);
fetchQueue = [r404(), rOk('FB')];
eq('CG4 kết quả', api.callGemini('ctx', [], 'q'), 'FB');
eq('CG4 model chính CHỈ thử 1 lần (404 không retry)', fetchLog.length, 2);
eq('CG4 không sleep (404 nhảy ngay)', sleepLog.length, 0);

// CG5: 400 → throw BADREQUEST, KHÔNG fallback (1 fetch)
resetCall(['gemini-flash-latest', 'fallback-model']);
fetchQueue = [r400()];
let cg5 = '';
try { api.callGemini('ctx', [], 'q'); } catch (e) { cg5 = e.message; }
ok('CG5 throw BADREQUEST', cg5.indexOf('GEMINI_BADREQUEST|') === 0, cg5);
eq('CG5 không fallback (1 fetch)', fetchLog.length, 1);

// CG6: ok phát đầu → 1 fetch, 0 sleep
resetCall();
fetchQueue = [rOk()];
eq('CG6 ok phát đầu', api.callGemini('ctx', [], 'q'), 'ANSWER');
eq('CG6 1 fetch', fetchLog.length, 1);
eq('CG6 0 sleep', sleepLog.length, 0);

// CG7: empty(SAFETY) model chính → thử model kế (ok)
resetCall(['gemini-flash-latest', 'fallback-model']);
fetchQueue = [rEmpty('SAFETY'), rOk('FB')];
eq('CG7 empty→fallback', api.callGemini('ctx', [], 'q'), 'FB');
eq('CG7 2 fetch (chính 1 + fallback 1)', fetchLog.length, 2);

// CG8: thiếu API key → throw ngay
delete props['GEMINI_API_KEY'];
let cg8 = '';
try { api.callGemini('ctx', [], 'q'); } catch (e) { cg8 = e.message; }
ok('CG8 thiếu key → throw', /GEMINI_API_KEY/.test(cg8), cg8);
props['GEMINI_API_KEY'] = 'test-key';

/* ════ ER — errorResponse + summary slice ════ */
const CTX = '=== SỐ LIỆU TÍNH SẴN ===\nTổng số task: 5\n\n=== CHỈ MỤC TOÀN BỘ TASK ===\nID | ...';
const er1 = api._aiErrorResponse_(new Error('GEMINI_OVERLOADED|high demand'), CTX);
eq('ER1 errorCode', er1.errorCode, 'GEMINI_OVERLOADED');
ok('ER1 retriable', er1.retriable === true);
ok('ER1 có degraded (số liệu tính sẵn)', typeof er1.degraded === 'string' && /SỐ LIỆU TÍNH SẴN/.test(er1.degraded));
ok('ER1 degraded KHÔNG chứa chỉ mục task', er1.degraded.indexOf('CHỈ MỤC TOÀN BỘ') === -1);
ok('ER1 error đã bỏ prefix mã', er1.error === 'high demand', er1.error);

const er2 = api._aiErrorResponse_(new Error('GEMINI_BADREQUEST|bad'), CTX);
eq('ER2 errorCode', er2.errorCode, 'GEMINI_BADREQUEST');
ok('ER2 KHÔNG retriable', er2.retriable === false);
ok('ER2 KHÔNG degraded', !('degraded' in er2));

const er3 = api._aiErrorResponse_(new Error('GEMINI_MODELDEAD|model-x: gone'), CTX);
eq('ER3 model-dead → user thấy OVERLOADED', er3.errorCode, 'GEMINI_OVERLOADED');
ok('ER3 retriable', er3.retriable === true);

eq('ER4 summary cắt đúng marker', api._aiSummaryFromContext_(CTX),
  '=== SỐ LIỆU TÍNH SẴN ===\nTổng số task: 5');

/* ── Tổng kết ── */
const total = passed + failed;
console.log(`\n${'═'.repeat(52)}`);
console.log(`verify_ai_resilience.mjs: ${passed}/${total} ${failed === 0 ? 'PASS' : 'FAIL'}`);
console.log(`${'═'.repeat(52)}\n`);
process.exit(failed > 0 ? 1 : 0);
