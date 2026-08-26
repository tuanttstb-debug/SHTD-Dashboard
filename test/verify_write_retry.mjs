/**
 * verify_write_retry.mjs  (Pha A — ghi tin cậy)
 * Kiểm tra tầng gasWrite: idempotency reqId + retry/backoff.
 *   A. Mọi write gắn reqId (chuỗi ổn định) trong body.
 *   B. Lỗi tạm thời (HTTP 500) → retry, GIỮ NGUYÊN reqId qua các lần thử, cuối cùng thành công.
 *   C. Lỗi kéo dài → sau maxRetry vẫn KHÔNG throw ra ngoài (_gas*Upsert nuốt → lưu cục bộ).
 *   D. Lỗi LOGIC server (status:'error') → KHÔNG retry (trả về ngay).
 *
 * 1 browser context + 1 page; mock GAS chuyển chế độ qua biến closure Node.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Workspace/Production/SHTD-Dashboard';
const PORT    = 9991;
const BASE    = `http://localhost:${PORT}`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(APP_DIR, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let R = { pass: 0, fail: 0 };
const PASS = msg => { console.log(`  ✅ ${msg}`); R.pass++; };
const FAIL = msg => { console.error(`  ❌ ${msg}`); R.fail++; process.exitCode = 1; };

const MOCK_TASKS = [
  { id:'T-001', name:'Task Alpha', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'',
    type:'Task', category:'AI', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'',
    startDate:'2026-01-01', endDate:'2026-12-31', progress:50, state:'Đang thực hiện',
    status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'',
    canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
];

/* ── GAS mock có thể chuyển chế độ ── */
const gasCalls = [];
function clearCalls() { gasCalls.length = 0; }
// mode: 'ok' | 'failN' (fail N lần đầu rồi ok) | 'fail' (luôn 500) | 'logicErr'
let mockMode = 'ok';
let failLeft = 0;

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route('https://script.google.com/**', async route => {
  const body = route.request().postData() || '{}';
  let parsed = null;
  try { parsed = JSON.parse(body); } catch(_) {}
  if (parsed) gasCalls.push(parsed);
  const action = parsed?.action || '';
  // reads luôn fail để app dùng cache (không cản test ghi)
  if (['read','case-pipeline-read','initiative-read','user-list','kpi-read','batch-read','notif-read','issue-read','dev-read'].includes(action)) {
    return route.fulfill({ status: 500, body: 'mock-read-off' });
  }
  if (mockMode === 'logicErr') {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'error', error: 'FORBIDDEN' }) });
  }
  if (mockMode === 'fail') {
    return route.fulfill({ status: 500, body: 'always-fail' });
  }
  if (mockMode === 'failN' && failLeft > 0) {
    failLeft--;
    return route.fulfill({ status: 500, body: 'transient-fail' });
  }
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ status: 'ok', id: parsed?.taskId || 'T-001', serverTs: '123' }) });
});

const page = await ctx.newPage();
await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');
await page.evaluate(({ tasks }) => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'test-token',
    user: { username: 'TuanTT4', displayName: 'Tuấn TT4', role: 'Admin', team: 'Số' },
    exp: Date.now() + 3600000,
  }));
  localStorage.setItem('shtd_v2', JSON.stringify({ tasks, cases: [], initiatives: [], kpi: [], _serverTs: null }));
}, { tasks: MOCK_TASKS });
await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForFunction(
  () => { const el = document.getElementById('loadingOverlay'); return !el || el.style.display === 'none'; },
  { timeout: 8000 }
).catch(() => {});
await page.waitForTimeout(300);

async function fireUpsert() {
  await page.evaluate(async () => {
    const task = { ...db.tasks.find(t => t.id === 'T-001'), name: 'retry test' };
    await _gasTaskUpsert(task, '');   // isNew (oldId rỗng)
  });
}

/* ════ A: reqId có mặt trong body ════ */
console.log('\n[A] gasWrite gắn reqId vào body task-upsert');
{
  mockMode = 'ok'; clearCalls();
  await fireUpsert();
  await page.waitForTimeout(200);
  const ups = gasCalls.filter(c => c?.action === 'task-upsert');
  if (ups.length === 1) PASS('1 lần task-upsert khi server OK'); else FAIL(`task-upsert ${ups.length} lần (expected 1)`);
  const rid = ups[0]?.reqId;
  if (typeof rid === 'string' && rid.startsWith('r-')) PASS(`body.reqId = "${rid}"`);
  else FAIL(`body.reqId thiếu/không hợp lệ: ${JSON.stringify(rid)}`);
}

/* ════ B: retry giữ nguyên reqId, cuối cùng thành công ════ */
console.log('\n[B] Lỗi 500 ×2 → retry (cùng reqId) → thành công, không throw');
{
  mockMode = 'failN'; failLeft = 2; clearCalls();
  let threw = false;
  await page.evaluate(async () => {
    window.__err = null;
    try {
      const task = { ...db.tasks.find(t => t.id === 'T-001'), name: 'retry test B' };
      await _gasTaskUpsert(task, '');
    } catch (e) { window.__err = e.message; }
  });
  await page.waitForTimeout(200);
  threw = await page.evaluate(() => window.__err);
  const ups = gasCalls.filter(c => c?.action === 'task-upsert');
  if (ups.length === 3) PASS('3 lần thử (2 fail + 1 success)'); else FAIL(`task-upsert ${ups.length} lần (expected 3)`);
  const ids = [...new Set(ups.map(c => c.reqId))];
  if (ids.length === 1 && ids[0]) PASS(`reqId GIỮ NGUYÊN qua 3 lần: "${ids[0]}"`);
  else FAIL(`reqId không ổn định: ${JSON.stringify(ups.map(c => c.reqId))}`);
  if (!threw) PASS('_gasTaskUpsert không throw'); else FAIL(`throw: ${threw}`);
}

/* ════ C: lỗi kéo dài → sau maxRetry(3) vẫn không throw (lưu cục bộ) ════ */
console.log('\n[C] Lỗi 500 liên tục → 4 lần thử (1+3) → nuốt lỗi, lưu cục bộ');
{
  mockMode = 'fail'; clearCalls();
  const err = await page.evaluate(async () => {
    window.__err = null;
    try {
      // Luồng thật: optimistic-save cục bộ TRƯỚC rồi mới gọi GAS (fire helper).
      const idx = db.tasks.findIndex(t => t.id === 'T-001');
      db.tasks[idx] = { ...db.tasks[idx], name: 'retry test C' };
      persist();
      await _gasTaskUpsert(db.tasks[idx], '');
    } catch (e) { window.__err = e.message; }
    return window.__err;
  });
  await page.waitForTimeout(200);
  const ups = gasCalls.filter(c => c?.action === 'task-upsert');
  if (ups.length === 4) PASS('4 lần thử (initial + 3 retry)'); else FAIL(`task-upsert ${ups.length} lần (expected 4)`);
  const ids = [...new Set(ups.map(c => c.reqId))];
  if (ids.length === 1) PASS('reqId giữ nguyên qua cả 4 lần'); else FAIL(`reqId đổi: ${JSON.stringify(ups.map(c=>c.reqId))}`);
  if (!err) PASS('_gasTaskUpsert nuốt lỗi (không throw ra UI)'); else FAIL(`throw: ${err}`);
  const lsName = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('shtd_v2') || '{}');
    return d?.tasks?.find(t => t.id === 'T-001')?.name;
  });
  if (lsName === 'retry test C') PASS('localStorage giữ bản ghi cục bộ'); else FAIL(`localStorage name = "${lsName}"`);
}

/* ════ D: lỗi logic server → KHÔNG retry ════ */
console.log('\n[D] status:error (FORBIDDEN) → không retry (1 lần thử)');
{
  mockMode = 'logicErr'; clearCalls();
  await page.evaluate(async () => {
    try { const task = { ...db.tasks.find(t => t.id === 'T-001'), name: 'retry test D' }; await _gasTaskUpsert(task, ''); } catch(_) {}
  });
  await page.waitForTimeout(200);
  const ups = gasCalls.filter(c => c?.action === 'task-upsert');
  if (ups.length === 1) PASS('1 lần thử (không retry lỗi logic)'); else FAIL(`task-upsert ${ups.length} lần (expected 1)`);
}

await ctx.close();
await browser.close();
server.close();
const total = R.pass + R.fail;
console.log(`\n${'═'.repeat(52)}`);
console.log(`verify_write_retry.mjs: ${R.pass}/${total} ${R.fail === 0 ? 'PASS' : 'FAIL'}`);
console.log(`${'═'.repeat(52)}\n`);
process.exit(R.fail > 0 ? 1 : 0);
