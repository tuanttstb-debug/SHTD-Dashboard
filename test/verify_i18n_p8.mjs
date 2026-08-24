/**
 * verify_i18n_p8.mjs — i18n Phase 8: KPI Overview + Owner Analysis
 * Port: 3048
 * Run: node verify_i18n_p8.mjs
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3048;

// ── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(filePath);
  const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
                 '.mjs':'application/javascript', '.json':'application/json' }[ext] || 'text/plain';
  res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
  fs.createReadStream(filePath).pipe(res);
});
await new Promise(r => server.listen(PORT, r));

const MOCK_USER = { username:'TuanTT4', role:'Admin', team:'Số', displayName:'Tuấn TT4' };

// ── Inject helper ─────────────────────────────────────────────────────────────
async function baseInject(page) {
  await page.evaluate(({ user }) => {
    db.tasks = [];
    db.initiatives = [];
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000, user
    }));
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch(e) {}
  }, { user: MOCK_USER });
}

// ── Test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else       { console.error(`  ❌ ${label}`); fail++; }
}

// ── Browser ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await baseInject(page);

// ── IP8-1: KPI Overview toolbar buttons — VI ─────────────────────────────────
console.log('\nIP8-1: KPI Overview toolbar buttons in VI');
await page.evaluate(() => { setLang('vi'); navigateTo('kpi-overview'); });
await page.waitForTimeout(500);
const btnTextsVI = await page.$$eval(
  '#kpiOverviewRoot .toolbar-right button',
  els => els.map(el => el.textContent.trim())
);
ok('Load btn VI contains "Tải File Raw"', (btnTextsVI[0] || '').includes('Tải File Raw'));
ok('From-sheet btn VI contains "Từ GG Sheet"', btnTextsVI.some(t => t.includes('Từ GG Sheet')));

// ── IP8-2: KPI Overview toolbar buttons — EN ─────────────────────────────────
console.log('\nIP8-2: KPI Overview toolbar buttons in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const btnTextsEN = await page.$$eval(
  '#kpiOverviewRoot .toolbar-right button',
  els => els.map(el => el.textContent.trim())
);
ok('Load btn EN contains "Load Raw File"', (btnTextsEN[0] || '').includes('Load Raw File'));
ok('From-sheet btn EN contains "From Sheet"', btnTextsEN.some(t => t.includes('From Sheet')));

// ── IP8-3: KPI Overview section headers — VI ─────────────────────────────────
console.log('\nIP8-3: KPI Overview section headers in VI');
await page.evaluate(() => { setLang('vi'); });
await page.waitForTimeout(300);
const headersVI = await page.$$eval(
  '#kpiOverviewRoot .section-header-title',
  els => els.map(el => el.textContent.trim())
);
ok('Section header VI[0] = "Biểu đồ phân tích"', (headersVI[0] || '').includes('Biểu đồ phân tích'));
ok('Section header VI[1] = "Cảnh báo KPI Tự động"', (headersVI[1] || '').includes('Cảnh báo KPI Tự động'));

// ── IP8-4: KPI Overview section headers — EN ─────────────────────────────────
console.log('\nIP8-4: KPI Overview section headers in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const headersEN = await page.$$eval(
  '#kpiOverviewRoot .section-header-title',
  els => els.map(el => el.textContent.trim())
);
ok('Section header EN[0] = "Analysis Charts"', (headersEN[0] || '').includes('Analysis Charts'));
ok('Section header EN[1] = "Automated KPI Alerts"', (headersEN[1] || '').includes('Automated KPI Alerts'));

// ── IP8-5: Owner Analysis ranking tab label — VI ──────────────────────────────
console.log('\nIP8-5: Owner Analysis ranking tab label in VI');
await page.evaluate(() => { setLang('vi'); navigateTo('owner-analysis'); });
await page.waitForTimeout(500);
const oaTabsVI = await page.$$eval(
  '#ownerAnalysisRoot .owner-tab-kpi',
  els => els.map(el => el.textContent.trim())
);
ok('Owner tab VI[2] contains "Bảng xếp hạng PTKD"', (oaTabsVI[2] || '').includes('Bảng xếp hạng PTKD'));

// ── IP8-6: Owner Analysis ranking tab label — EN ──────────────────────────────
console.log('\nIP8-6: Owner Analysis ranking tab label in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const oaTabsEN = await page.$$eval(
  '#ownerAnalysisRoot .owner-tab-kpi',
  els => els.map(el => el.textContent.trim())
);
ok('Owner tab EN[2] contains "PTKD Rankings"', (oaTabsEN[2] || '').includes('PTKD Rankings'));

// ── IP8-7: renderAll() live switch on kpi-overview ───────────────────────────
console.log('\nIP8-7: renderAll() live switch on kpi-overview');
await page.evaluate(() => { setLang('vi'); navigateTo('kpi-overview'); });
await page.waitForTimeout(400);
const loadBtnBefore = await page.$$eval(
  '#kpiOverviewRoot .toolbar-right button',
  els => els[0]?.textContent.trim() || ''
).catch(() => '');
ok('Load btn VI before switch', loadBtnBefore.includes('Tải File Raw'));
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const loadBtnAfter = await page.$$eval(
  '#kpiOverviewRoot .toolbar-right button',
  els => els[0]?.textContent.trim() || ''
).catch(() => '');
ok('Load btn EN after renderAll() switch', loadBtnAfter.includes('Load Raw File'));

// ── IP8-8: No JS errors ───────────────────────────────────────────────────────
console.log('\nIP8-8: No JS errors');
ok('Zero console errors', errors.length === 0);
if (errors.length) errors.forEach(e => console.error('   JS Error:', e));

// ── Teardown ──────────────────────────────────────────────────────────────────
await browser.close();
server.close();

const total = pass + fail;
console.log(`\n─────────────────────────────────────────────────`);
console.log(`verify_i18n_p8  ${pass}/${total}  ${fail === 0 ? 'PASS' : 'FAIL'}`);
if (fail > 0) process.exit(1);
