/**
 * verify_startup_nonblocking.mjs — Phase 1 GAS tuning (cache-first, lazy H2, pool)
 *
 *  SNB1 – Startup KHÔNG gọi 'h2-read-all' (H2 lazy-load, không nằm trong cơn bão khởi động)
 *  SNB2 – Startup có gọi các read domain nóng (read, initiative-read, case-pipeline-read,
 *         issue-read, dev-read, user-list, notif-read)
 *  SNB3 – Concurrency request GAS lúc khởi động ≤ 2 (pool giới hạn — hết fan-out 8 đồng thời)
 *  SNB4 – Cache-first: loadingOverlay KHÔNG bị bật chặn màn trong lúc đang đồng bộ nền;
 *         view mặc định (my-work) đã hiển thị ngay (render trước khi read resolve)
 *  SNB5 – Lazy H2: sau khi mở view H2 → 'h2-read-all' MỚI được gọi (đúng 1 lần)
 *  SNB6 – Không có JS error khi load
 *
 * Run: node verify_startup_nonblocking.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

const browser = await chromium.launch();
const page    = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

// ── Ghi nhận mọi request GAS + đo concurrency ──
const actions   = [];        // { action, t } theo thứ tự bắt đầu
let inflight    = 0;
let maxInflight = 0;

await page.route('**script.google.com**', async (route) => {
  let action = '?';
  try { action = (JSON.parse(route.request().postData() || '{}').action || '?').toLowerCase(); } catch {}
  actions.push({ action, t: Date.now() });
  inflight++; if (inflight > maxInflight) maxInflight = inflight;

  // Giữ response chậm để lộ concurrency (nếu fan-out sẽ thấy inflight cao)
  await new Promise(r => setTimeout(r, 150));

  // Trả JSON hợp lệ tối thiểu cho mọi action đọc
  const body = {
    status:  'ok',
    values:  [['ID']],
    data:    { header: [], rows: [],
               config: [['Key']], objectives: [['ID']], kpis: [['ID']], milestones: [['ID']],
               tracking: [['ID']], risks: [['ID']], deps: [['ID']], reviews: [['ID']] },
    notifs:  [],
    serverTs:'0',
  };
  inflight--;
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

// Phiên đăng nhập giả (client-only) để startApp chạy nhánh mạng
await page.addInitScript(() => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'test-token',
    user:  { username: 'tester', displayName: 'Tester', role: 'Admin', team: 'BC' },
    exp:   Date.now() + 3600000,
  }));
});

await page.goto(BASE_URL, { waitUntil: 'load' });

// Ngay sau load (trước khi read chậm resolve): view mặc định đã render + overlay không chặn
const immediate = await page.evaluate(() => ({
  myWorkShown:    document.getElementById('view-my-work')?.style.display === 'contents',
  overlayBlocking: document.getElementById('loadingOverlay')?.classList.contains('visible') === true,
}));

// Chờ pool khởi động chạy xong (7 job × 150ms / 2 ≈ 600ms) + biên an toàn
await page.waitForTimeout(1600);

const startupActions = actions.map(a => a.action);
const H2_AT_STARTUP  = startupActions.includes('h2-read-all');
const expectedReads  = ['read', 'initiative-read', 'case-pipeline-read', 'issue-read', 'dev-read', 'user-list', 'notif-read'];
const missingReads   = expectedReads.filter(a => !startupActions.includes(a));

log('SNB1', !H2_AT_STARTUP, `Khởi động ${H2_AT_STARTUP ? 'CÓ' : 'KHÔNG'} gọi h2-read-all (kỳ vọng KHÔNG)`);
log('SNB2', missingReads.length === 0, `Read domain nóng: ${missingReads.length ? 'thiếu ' + missingReads.join(',') : 'đủ ' + expectedReads.length}`);
log('SNB3', maxInflight <= 2, `Concurrency tối đa lúc khởi động = ${maxInflight} (kỳ vọng ≤ 2)`);
log('SNB4', immediate.myWorkShown && !immediate.overlayBlocking,
    `Cache-first: my-work hiển thị=${immediate.myWorkShown}, overlay chặn=${immediate.overlayBlocking} (kỳ vọng shown & !blocking)`);

// ── Lazy H2: mở view H2 → h2-read-all mới được gọi ──
const beforeH2 = actions.filter(a => a.action === 'h2-read-all').length;
await page.evaluate(() => { if (typeof navigateTo === 'function') navigateTo('h2-tracker'); });
await page.waitForTimeout(600);
const afterH2 = actions.filter(a => a.action === 'h2-read-all').length;

log('SNB5', beforeH2 === 0 && afterH2 === 1, `h2-read-all: trước mở H2=${beforeH2}, sau=${afterH2} (kỳ vọng 0→1)`);
log('SNB6', jsErrors.length === 0, jsErrors.length ? 'JS errors: ' + jsErrors.join(' | ') : 'Không có JS error');

console.log(`\n${passed}/${passed + failed} checks passed`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
