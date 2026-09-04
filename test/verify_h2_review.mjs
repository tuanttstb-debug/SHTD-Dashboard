/**
 * verify_h2_review.mjs — H2 Self-review view smoke tests
 *
 *  H2R1  – Structure: nav item, view section, review modal
 *  H2R2  – Navigate via nav click → view visible + page title
 *  H2R3  – Lead sees ALL reviews (2 cards)
 *  H2R4  – Capability average badge shown on a scored review
 *  H2R5  – Add modal: opens; type (3) + capability (6) selects populated; lead member select enabled
 *  H2R6  – Edit modal: existing review prefilled (Q_actual)
 *  H2R7  – Save (new) appends a review + re-renders card
 *  H2R8  – Member sees ONLY own review (1 card) + can edit it
 *  H2R9  – RBAC: member cannot open another member's review (modal stays closed)
 *  H2R10 – Empty state when no reviews
 *  H2RX  – No JS errors
 *
 * Run: node verify_h2_review.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3074;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'h2_review');
if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[path.extname(fp)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime }); res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let passed = 0, failed = 0;
function log(id, ok, msg) { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); if (ok) passed++; else failed++; }
const shot = (page, n) => page.screenshot({ path: path.join(EVD_DIR, `${n}.png`), fullPage: false });

const MOCK = {
  config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [],
  reviews: [
    { ID: 'REV-26-001', Member: 'QuangNN3', ReviewType: 'H1', Period: 'H1/2026',
      Q_commit: 'Cam kết H1', Q_actual: 'Đạt 80% mục tiêu', Q_pct: '80', Q_impact: 'Giảm TAT 30%',
      Q_gap: 'Thiếu API', Q_rootcause: 'Phụ thuộc DCB', Q_lesson: 'Chốt phụ thuộc sớm', Q_adjust: 'Bám lịch DCB',
      Cap_Goal: '4', Cap_Plan: '4', Cap_Prior: '3', Cap_Own: '5', Cap_Risk: '3', Cap_Dep: '3', Cap_Track: '4', Cap_Exec: '4', CreatedAt: '' },
    { ID: 'REV-26-002', Member: 'DungLQ1', ReviewType: 'Q3', Period: 'Q3/2026',
      Q_commit: 'Cam kết Q3', Q_actual: 'Go-live GĐ1', Q_pct: '100', Q_impact: 'E2E rút ngắn',
      Q_gap: '', Q_rootcause: '', Q_lesson: 'Test sớm', Q_adjust: '',
      Cap_Goal: '5', Cap_Plan: '4', Cap_Prior: '4', Cap_Own: '4', Cap_Risk: '4', Cap_Dep: '5', Cap_Track: '4', Cap_Exec: '5', CreatedAt: '' },
  ]
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.route('**://script.google.com/**', route => route.abort());

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(400);

async function loginAs(username, role) {
  await page.evaluate(({ mock, username, role }) => {
    window.readH2 = async () => {};   // chặn loader thật clobber mock
    Object.assign(dbH2, { config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] });
    Object.assign(dbH2, JSON.parse(JSON.stringify(mock)));
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000,
      user: { username, role, team: 'Số', displayName: username }
    }));
    const lo = document.getElementById('loginOverlay'); if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch (e) {}
    navigateTo('h2-review');
  }, { mock: MOCK, username, role });
  await page.waitForTimeout(400);
}

/* ── Lead (Teamlead) ── */
await loginAs('TeamleadX', 'Teamlead');

/* H2R1 — structure */
for (const [id, sel] of [['nav', '[data-view="h2-review"]'], ['view', '#view-h2-review'], ['modal', '#h2ReviewModal']]) {
  log('H2R1-' + id, !!(await page.$(sel)), `${sel} tồn tại`);
}
await shot(page, '01_review');

/* H2R2 — navigate */
await page.evaluate(() => navigateTo('dashboard'));
await page.waitForTimeout(150);
await page.evaluate(() => { const it=document.querySelector('[data-view="h2-review"]'); const g=it&&it.closest('.nav-group'); if(g)g.classList.add('open'); });
await page.click('[data-view="h2-review"]');
await page.waitForTimeout(250);
log('H2R2-visible', await page.$eval('#view-h2-review', el => el.style.display !== 'none'), 'Nav click → view visible');
log('H2R2-title', (await page.$eval('#pageTitle', el => el.textContent)).includes('H2'), `Page title = "${await page.$eval('#pageTitle', el => el.textContent)}"`);

/* H2R3 — lead sees all */
const leadCards = await page.$$eval('#h2ReviewList .h2-obj-card', els => els.length);
log('H2R3', leadCards === 2, `lead review cards = ${leadCards} (expect 2)`);

/* H2R4 — capability avg badge */
const hasCapBadge = await page.$$eval('#h2ReviewList .h2-wbadge', els => els.some(e => /Năng lực/.test(e.textContent)));
log('H2R4', hasCapBadge, 'Capability average badge rendered');

/* H2R5 — add modal populate */
await page.evaluate(() => openH2ReviewModal(null));
await page.waitForTimeout(200);
log('H2R5-open', await page.$eval('#h2ReviewModal', el => el.style.display === 'flex'), 'Add modal visible');
log('H2R5-type', (await page.$$eval('#h2rType option', els => els.length)) === 3, `type options = ${await page.$$eval('#h2rType option', els => els.length)} (expect 3)`);
log('H2R5-cap',  (await page.$$eval('#h2r_Cap_Goal option', els => els.length)) === 6, `capability options = ${await page.$$eval('#h2r_Cap_Goal option', els => els.length)} (expect 6)`);
log('H2R5-member', await page.$eval('#h2rMember', el => !el.disabled), 'Lead: member select enabled');
await shot(page, '02_add_modal');
await page.evaluate(() => closeH2ReviewModal());

/* H2R6 — edit prefilled */
await page.evaluate(() => openH2ReviewModal('REV-26-001'));
await page.waitForTimeout(200);
log('H2R6-title', (await page.$eval('#h2ReviewModalTitle', el => el.textContent)).includes('Sửa'), 'Edit modal title = Sửa');
log('H2R6-actual', (await page.$eval('#h2r_Q_actual', el => el.value)) === 'Đạt 80% mục tiêu', 'Q_actual prefilled');
await page.evaluate(() => closeH2ReviewModal());

/* H2R7 — save new appends */
const before = await page.evaluate(() => dbH2.reviews.length);
await page.evaluate(() => {
  window._gasH2Upsert = async () => {};        // stub network (route aborted)
  openH2ReviewModal(null);
  document.getElementById('h2rType').value = 'Q4';
  document.getElementById('h2rPeriod').value = 'Q4/2026';
  document.getElementById('h2r_Q_actual').value = 'Test review mới';
  document.getElementById('h2rMember').value = 'QuangNN3';
});
await page.evaluate(() => h2SaveReview());
await page.waitForTimeout(300);
const after = await page.evaluate(() => dbH2.reviews.length);
log('H2R7-count', after === before + 1, `reviews ${before} → ${after} (expect +1)`);
log('H2R7-card', (await page.$$eval('#h2ReviewList .h2-obj-card', els => els.length)) === 3, 'List re-rendered with new card');

/* ── Member (User role) ── */
await loginAs('QuangNN3', 'User');
const myCards = await page.$$eval('#h2ReviewList .h2-obj-card', els => els.length);
log('H2R8-own', myCards === 1, `member sees own only = ${myCards} card (expect 1)`);
log('H2R8-edit', (await page.$$('#h2ReviewList .h2-card-actions')).length === 1, 'Member can edit own review (action button present)');
await shot(page, '03_member');

/* H2R9 — RBAC: member cannot open another's review */
await page.evaluate(() => openH2ReviewModal('REV-26-002'));   // Dung's review
await page.waitForTimeout(200);
log('H2R9', await page.$eval('#h2ReviewModal', el => el.style.display !== 'flex'), 'Member blocked from other member review (modal closed)');

/* H2R10 — empty state */
await page.evaluate(() => { dbH2.reviews = []; renderH2Review(); });
await page.waitForTimeout(150);
log('H2R10', !!(await page.$('#view-h2-review .h2-empty')), 'Empty state shown when no reviews');

/* H2RX — no JS errors */
log('H2RX', jsErrors.length === 0, jsErrors.length ? `errors: ${jsErrors.join(' | ')}` : 'no JS errors');

console.log(`\n── H2 review: ${passed}/${passed + failed} passed ──`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
