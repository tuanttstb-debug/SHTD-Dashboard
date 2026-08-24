/**
 * verify_startup_nonblocking.mjs — GAS tuning P1 (cache-first, lazy H2, pool) + P2 (batch-read)
 *
 *  Scenario A — batch-read HỖ TRỢ (GAS đã redeploy):
 *   SNB1 – Khởi động gọi ĐÚNG 1 'batch-read', KHÔNG gọi read lẻ (read/case-pipeline-read/…)
 *   SNB2 – Khởi động KHÔNG gọi 'h2-read-all' (H2 lazy)
 *   SNB3 – Concurrency request GAS lúc khởi động ≤ 2
 *   SNB4 – Cache-first: loadingOverlay KHÔNG chặn màn + view my-work đã hiển thị ngay
 *   SNB5 – Lazy H2: mở view H2 → 'h2-read-all' MỚI được gọi (đúng 1 lần)
 *   SNB6 – Không có JS error
 *
 *  Scenario B — batch-read CHƯA hỗ trợ (GAS chưa redeploy) → FALLBACK:
 *   SNB7 – batch-read trả lỗi → client fallback gọi các read lẻ (read + case-pipeline-read + …)
 *   SNB8 – Fallback không có JS error
 *
 * Run: node verify_startup_nonblocking.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3097;
const BASE_URL  = `http://localhost:${PORT}`;

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

let passed = 0, failed = 0;
function log(id, ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`);
  if (ok) passed++; else failed++;
}

// Payload batch-read hợp lệ (đủ shape cho readAll phân phối). Tasks có 1 dòng để db.tasks.length ≥ 1
// (cần cho version gate: client chỉ gửi ver khi đang có dữ liệu).
const BATCH_DATA = {
  tasks:       { values: [['ID', 'Task / Deliverable'], ['SO-26-001', 'Test task']] },
  cases:       { values: [['ID']] },
  issues:      { values: [['ID']] },
  dev:         { values: [['ID']] },
  initiatives: { values: [['ID', 'Tên Initiative / Milestone']] },
  users:       { header: ['Username', 'Active'], rows: [['tester', 'true']] },
  notifs:      [],
};
const H2_DATA = {
  config: [['Key']], objectives: [['ID']], kpis: [['ID']], milestones: [['ID']],
  tracking: [['ID']], risks: [['ID']], deps: [['ID']], reviews: [['ID']],
};

async function bootPage(browser, { batchSupported }) {
  const page      = await browser.newPage();
  const jsErrors  = [];
  const actions   = [];
  const batchVers = [];   // ver client gửi kèm mỗi batch-read
  let inflight = 0, maxInflight = 0;
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.route('**script.google.com**', async (route) => {
    let action = '?', reqVer = null;
    try { const b = JSON.parse(route.request().postData() || '{}'); action = (b.action || '?').toLowerCase(); reqVer = b.ver || null; } catch {}
    actions.push(action);
    inflight++; if (inflight > maxInflight) maxInflight = inflight;
    await new Promise(r => setTimeout(r, 120));   // giữ chậm để lộ concurrency

    let body;
    if (action === 'batch-read') {
      batchVers.push(reqVer);
      if (!batchSupported) body = { status: 'error', error: 'action không hợp lệ: batch-read' };   // giả lập GAS chưa redeploy
      else if (reqVer === 'V1') body = { status: 'ok', ver: 'V1', notModified: true };              // version gate khớp
      else body = { status: 'ok', ver: 'V1', serverTs: '0', data: BATCH_DATA };
    } else if (action === 'h2-read-all') {
      body = { status: 'ok', data: H2_DATA };
    } else {
      // read lẻ (fallback) + user-list/notif-read
      body = { status: 'ok', values: [['ID']], data: { header: [], rows: [] }, notifs: [], serverTs: '0' };
    }
    inflight--;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.addInitScript(() => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'test-token',
      user:  { username: 'tester', displayName: 'Tester', role: 'Admin', team: 'BC' },
      exp:   Date.now() + 3600000,
    }));
  });

  await page.goto(BASE_URL, { waitUntil: 'load' });
  const immediate = await page.evaluate(() => ({
    myWorkShown:     document.getElementById('view-my-work')?.style.display === 'contents',
    overlayBlocking: document.getElementById('loadingOverlay')?.classList.contains('visible') === true,
  }));
  await page.waitForTimeout(1400);
  return { page, jsErrors, actions, batchVers, maxInflight, immediate };
}

const browser = await chromium.launch();

// ── Scenario A: batch-read hỗ trợ ──
{
  const { page, jsErrors, actions, batchVers, maxInflight, immediate } = await bootPage(browser, { batchSupported: true });
  const indivReads = ['read', 'case-pipeline-read', 'issue-read', 'dev-read', 'initiative-read', 'user-list', 'notif-read'];
  const batchCount = actions.filter(a => a === 'batch-read').length;
  const indivFired = indivReads.filter(a => actions.includes(a));

  log('SNB1', batchCount === 1 && indivFired.length === 0,
      `batch-read=${batchCount}, read lẻ nổ=${indivFired.length ? indivFired.join(',') : 'không'} (kỳ vọng 1 & 0)`);
  log('SNB2', !actions.includes('h2-read-all'), `h2-read-all lúc khởi động: ${actions.includes('h2-read-all') ? 'CÓ' : 'KHÔNG'} (kỳ vọng KHÔNG)`);
  log('SNB3', maxInflight <= 2, `concurrency tối đa = ${maxInflight} (kỳ vọng ≤ 2)`);
  log('SNB4', immediate.myWorkShown && !immediate.overlayBlocking,
      `my-work hiển thị=${immediate.myWorkShown}, overlay chặn=${immediate.overlayBlocking}`);

  const beforeH2 = actions.filter(a => a === 'h2-read-all').length;
  await page.evaluate(() => { if (typeof navigateTo === 'function') navigateTo('h2-tracker'); });
  await page.waitForTimeout(500);
  const h2After = actions.filter(a => a === 'h2-read-all').length;
  log('SNB5', beforeH2 === 0 && h2After === 1, `h2-read-all trước=${beforeH2}, sau mở H2=${h2After} (kỳ vọng 0→1)`);
  log('SNB6', jsErrors.length === 0, jsErrors.length ? 'JS errors: ' + jsErrors.join(' | ') : 'Không có JS error');

  // ── Version gate (Phase 3) ──
  const storedVer = await page.evaluate(() => (typeof db !== 'undefined' ? db._dataVer : null));
  log('SNB9', storedVer === 'V1', `client lưu ver = ${storedVer} sau batch đầu (kỳ vọng V1)`);

  const before = await page.evaluate(() => db.tasks.length);
  const r2 = await page.evaluate(async () => readAll(['tasks', 'cases', 'issues', 'dev', 'initiatives', 'users', 'notifs']));
  await page.waitForTimeout(200);
  const lastVer = batchVers[batchVers.length - 1];
  const after   = await page.evaluate(() => db.tasks.length);
  log('SNB10', r2 === true && lastVer === 'V1' && after === before,
      `readAll lần 2: gửi ver=${lastVer}, trả=${r2}, task ${before}→${after} (kỳ vọng V1/true/giữ nguyên = notModified)`);

  await page.close();
}

// ── Scenario B: batch-read chưa hỗ trợ → fallback read lẻ ──
{
  const { page, jsErrors, actions } = await bootPage(browser, { batchSupported: false });
  const mustFallback = ['read', 'case-pipeline-read', 'issue-read', 'dev-read', 'initiative-read'];
  const firedFallback = mustFallback.filter(a => actions.includes(a));
  log('SNB7', actions.includes('batch-read') && firedFallback.length === mustFallback.length,
      `sau batch-read lỗi, read lẻ fallback nổ: ${firedFallback.length}/${mustFallback.length} (${firedFallback.join(',')})`);
  log('SNB8', jsErrors.length === 0, jsErrors.length ? 'JS errors: ' + jsErrors.join(' | ') : 'Không có JS error');
  await page.close();
}

console.log(`\n${passed}/${passed + failed} checks passed`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
