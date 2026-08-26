/**
 * verify_domain_version.mjs  (Pha B — version theo domain)
 * Kiểm tra giao thức readAll ↔ batch-read per-domain:
 *   A. readAll gửi body.vers (map version theo domain) khi client đã có dữ liệu.
 *   B. Nhận json.vers → lưu db._vers; nhận json.ver → lưu db._dataVer (tương thích).
 *   C. notModified (vers) → giữ nguyên cache (db.tasks không đổi), trả true.
 *   D. Response chỉ chứa 1 domain (data.cases) → domain KHÁC (db.tasks) KHÔNG bị đụng.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Workspace/Production/SHTD-Dashboard';
const PORT    = 9992;
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
const PASS = m => { console.log(`  ✅ ${m}`); R.pass++; };
const FAIL = m => { console.error(`  ❌ ${m}`); R.fail++; process.exitCode = 1; };

const MOCK_TASKS = [
  { id:'T-001', name:'Task Alpha', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'',
    type:'Task', category:'AI', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'',
    startDate:'2026-01-01', endDate:'2026-12-31', progress:50, state:'Đang thực hiện',
    status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'',
    canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
];

// Mock có thể chuyển chế độ + ghi lại body batch-read
const batchBodies = [];
let mode = 'full';   // 'full' | 'notmod' | 'partial-cases'
const CUR_VERS = { tasks:'t1', cases:'c1', issues:'i1', dev:'d1', initiatives:'n1', users:'u1', notifs:'nf1' };

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route('https://script.google.com/**', async route => {
  const raw = route.request().postData() || '{}';
  let b = null; try { b = JSON.parse(raw); } catch(_) {}
  const action = b?.action || '';
  if (action === 'batch-read') {
    batchBodies.push(b);
    if (mode === 'notmod') {
      return route.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ status:'ok', ver:'g2', vers: CUR_VERS, notModified:true }) });
    }
    if (mode === 'partial-cases') {
      // chỉ trả domain cases (values rỗng/đơn giản) → tasks KHÔNG có trong data
      return route.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ status:'ok', ver:'g3', vers: CUR_VERS,
          data: { cases: { values: [] } } }) });
    }
    // full: không kèm data.tasks để khỏi phụ thuộc parse header — chỉ kiểm protocol vers
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ status:'ok', ver:'g1', vers: CUR_VERS, data: {} }) });
  }
  // reads lẻ off
  return route.fulfill({ status:500, body:'off' });
});

const page = await ctx.newPage();
await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');
await page.evaluate(({ tasks }) => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token:'test-token', user:{ username:'TuanTT4', displayName:'Tuấn', role:'Admin', team:'Số' },
    exp: Date.now()+3600000 }));
  localStorage.setItem('shtd_v2', JSON.stringify({ tasks, initiatives:[], _dataVer:'g0',
    _vers:{ tasks:'t0', cases:'c0', issues:'i0', dev:'d0', initiatives:'n0', users:'u0', notifs:'nf0' } }));
}, { tasks: MOCK_TASKS });
await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForFunction(() => { const el=document.getElementById('loadingOverlay'); return !el||el.style.display==='none'; }, { timeout:8000 }).catch(()=>{});
await page.waitForTimeout(300);

/* ── A + B: gửi vers, lưu vers ── */
console.log('\n[A/B] readAll gửi body.vers + lưu json.vers → db._vers');
{
  mode = 'full';
  // Reset version về mốc đã biết (startup có thể đã gọi readAll 1 lần → db._vers đổi).
  await page.evaluate(() => {
    db._dataVer = 'g0';
    db._vers = { tasks:'t0', cases:'c0', issues:'i0', dev:'d0', initiatives:'n0', users:'u0', notifs:'nf0' };
  });
  batchBodies.length = 0;
  await page.evaluate(async () => { window.__r = await readAll(); });
  await page.waitForTimeout(150);
  const sent = batchBodies[batchBodies.length - 1];
  if (sent && sent.vers && sent.vers.tasks === 't0') PASS(`body.vers gửi lên (tasks=${sent.vers.tasks})`);
  else FAIL(`body.vers không gửi đúng: ${JSON.stringify(sent && sent.vers)}`);
  if (sent && sent.ver === 'g0') PASS('kèm body.ver global (tương thích server cũ)');
  else FAIL(`body.ver = ${sent && sent.ver}`);
  const storedVers = await page.evaluate(() => db._vers);
  if (storedVers && storedVers.tasks === 't1') PASS('db._vers cập nhật theo json.vers (tasks=t1)');
  else FAIL(`db._vers = ${JSON.stringify(storedVers)}`);
  const dv = await page.evaluate(() => db._dataVer);
  if (dv === 'g1') PASS('db._dataVer = json.ver (g1)'); else FAIL(`db._dataVer = ${dv}`);
}

/* ── C: notModified giữ cache ── */
console.log('\n[C] notModified → giữ cache, trả true');
{
  mode = 'notmod'; batchBodies.length = 0;
  const before = await page.evaluate(() => db.tasks.length);
  const ret = await page.evaluate(async () => await readAll());
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => db.tasks.length);
  if (ret === true) PASS('readAll trả true khi notModified'); else FAIL(`readAll trả ${ret}`);
  if (after === before) PASS(`db.tasks giữ nguyên (${after})`); else FAIL(`db.tasks đổi: ${before}→${after}`);
  const dv = await page.evaluate(() => db._vers && db._vers.tasks);
  if (dv === 't1') PASS('db._vers vẫn được lưu ở notModified'); else FAIL(`db._vers.tasks = ${dv}`);
}

/* ── D: response chỉ cases → tasks không bị đụng ── */
console.log('\n[D] data chỉ có cases → db.tasks KHÔNG đổi (chỉ tải domain đổi)');
{
  mode = 'partial-cases'; batchBodies.length = 0;
  await page.evaluate(() => { db.tasks = [{ id:'T-KEEP', name:'giữ nguyên' }]; persist(); });
  await page.evaluate(async () => await readAll());
  await page.waitForTimeout(120);
  const tasks = await page.evaluate(() => db.tasks.map(t => t.id));
  if (tasks.length === 1 && tasks[0] === 'T-KEEP') PASS('db.tasks KHÔNG bị đụng khi response không có domain tasks');
  else FAIL(`db.tasks bị đổi: ${JSON.stringify(tasks)}`);
}

await ctx.close(); await browser.close(); server.close();
const total = R.pass + R.fail;
console.log(`\n${'═'.repeat(52)}`);
console.log(`verify_domain_version.mjs: ${R.pass}/${total} ${R.fail === 0 ? 'PASS' : 'FAIL'}`);
console.log(`${'═'.repeat(52)}\n`);
process.exit(R.fail > 0 ? 1 : 0);
