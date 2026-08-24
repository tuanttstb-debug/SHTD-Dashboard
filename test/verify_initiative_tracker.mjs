/**
 * verify_initiative_tracker.mjs
 * S55 Initiative Tracker tidy-up:
 *   IT1 – Stat bar dùng .cp-stat-card (5 ô, clickable → openInitSummaryPopup)
 *   IT2 – Stat counts đúng theo scope (Admin=all)
 *   IT3 – Main list KHÔNG có Done; có section "Đã hoàn thành (N)" collapsible
 *   IT4 – Done section mặc định thu gọn (chưa render card)
 *   IT5 – Toggle done section → render card Done
 *   IT6 – Click ô Tổng → #initSummaryOverlay mở, đủ rows
 *   IT7 – Click ô Done → đúng số rows
 *   IT8 – Click ô Overdue → đúng số rows
 *   IT9 – Row click → đóng summary, mở initViewOverlay
 *   IT10– ESC đóng summary popup
 *   ITX – Không JS errors
 *
 * Run: node verify_initiative_tracker.mjs
 * EVD: test-results/init_tracker/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3044;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'init_tracker');

if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

/* ── HTTP server ── */
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

/* ── helpers ── */
let passed = 0, failed = 0;
const results = [];
function log(id, ok, msg) {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${id}: ${msg}`);
  results.push({ id, ok, msg });
  if (ok) passed++; else failed++;
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(EVD_DIR, `${name}.png`), fullPage: false });
}
function relDate(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Mock initiatives (type='initiative' → tất cả là root) ── */
const MOCK_INITS = [
  { id:'INI-01', type:'initiative', name:'Active — còn hạn',   status:'Active',  pct:40, accountable:'TuanTT4', category:'Số hóa',  deadline: relDate(30) },
  { id:'INI-02', type:'initiative', name:'Active — QUÁ HẠN',   status:'Active',  pct:30, accountable:'DungLQ1', category:'Số hóa',  deadline: relDate(-10) },
  { id:'INI-03', type:'initiative', name:'Đã hoàn thành A',     status:'Done',    pct:100,accountable:'TuanTT4', category:'Sản phẩm',deadline: relDate(-5) },
  { id:'INI-04', type:'initiative', name:'Đã hoàn thành B',     status:'Done',    pct:100,accountable:'TuanTT4', category:'Sản phẩm',deadline: relDate(-40) },
  { id:'INI-05', type:'initiative', name:'Blocked — no overdue',status:'Blocked', pct:10, accountable:'DungLQ1', category:'Kỹ thuật',deadline: relDate(60) },
  { id:'INI-06', type:'initiative', name:'Paused — còn hạn',    status:'Paused',  pct:20, accountable:'TuanTT4', category:'Vận hành',deadline: relDate(45) },
];

const MOCK_USER = { username:'TuanTT4', role:'Admin', team:'BL', displayName:'Tuấn TT' };

/* ════════════════════════════════════════ */
const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

console.log('\n══════════════════════════════════════════════');
console.log('  Initiative Tracker tidy-up — Playwright EVD');
console.log('══════════════════════════════════════════════\n');

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(500);

await page.evaluate(({ inits, user }) => {
  db.initiatives = inits;
  db.tasks = [];
  localStorage.setItem('shtd_auth', JSON.stringify({
    token: 'mock-token',
    user: { username: user.username, role: user.role, team: user.team, displayName: user.displayName }
  }));
  const lo = document.getElementById('loginOverlay');
  if (lo) lo.style.display = 'none';
  const app = document.getElementById('appContainer') || document.getElementById('app');
  if (app) app.style.display = '';
  try { setupListeners(); } catch (e) { /* đã gọi rồi */ }
  navigateTo('initiative-tracker');
}, { inits: MOCK_INITS, user: MOCK_USER });

await page.waitForTimeout(700);

/* ══ IT1 — Stat cards ══ */
const cards = await page.$$eval('#initiativeTrackerRoot .init-summary-grid .cp-stat-card', els =>
  els.map(c => c.getAttribute('onclick') || '')
);
log('IT1-five-stat-cards', cards.length === 5, `${cards.length}/5 .cp-stat-card`);
log('IT1-cards-clickable', cards.length === 5 && cards.every(o => o.includes('openInitSummaryPopup')),
  `tất cả card có onclick=openInitSummaryPopup`);
await shot(page, 'it1_stat_cards');

/* ══ IT2 — Stat counts (order: total, active, done, overdue, blocked) ══ */
const nums = await page.$$eval('#initiativeTrackerRoot .init-summary-grid .cp-stat-num',
  els => els.map(e => e.textContent.trim()));
log('IT2-total',   nums[0] === '6', `total = ${nums[0]} (expected 6)`);
log('IT2-active',  nums[1] === '2', `active = ${nums[1]} (expected 2)`);
log('IT2-done',    nums[2] === '2', `done = ${nums[2]} (expected 2)`);
log('IT2-overdue', nums[3] === '1', `overdue = ${nums[3]} (expected 1: chỉ INI-02)`);
log('IT2-blocked', nums[4] === '1', `blocked = ${nums[4]} (expected 1)`);

/* ══ IT3 — Main list excludes Done; done section present ══ */
const mainCards = await page.$$eval('#initCardList > .init-card', els => els.map(e => e.id));
log('IT3-main-excludes-done', mainCards.length === 4,
  `main .init-card = ${mainCards.length} (expected 4: INI-01,02,05,06) — ${mainCards.join(',')}`);
const doneCount = await page.$eval('.init-done-count', el => el.textContent.trim());
log('IT3-done-section-count', doneCount === '2', `done section count badge = "${doneCount}" (expected 2)`);

/* ══ IT4 — Done section collapsed by default (cards chưa render) ══ */
const doneBodyOpen0 = await page.$eval('#initDoneBody', el => el.classList.contains('open'));
const doneCards0    = await page.$$('#initDoneBody .init-card');
log('IT4-done-collapsed', !doneBodyOpen0 && doneCards0.length === 0,
  `done body open=${doneBodyOpen0}, rendered cards=${doneCards0.length} (expected collapsed, 0)`);
await shot(page, 'it4_done_collapsed');

/* ══ IT5 — Toggle done section → cards render ══ */
await page.click('.init-done-header');
await page.waitForTimeout(300);
const doneBodyOpen1 = await page.$eval('#initDoneBody', el => el.classList.contains('open'));
const doneCards1    = await page.$$('#initDoneBody .init-card');
log('IT5-done-expands', doneBodyOpen1 && doneCards1.length === 2,
  `done body open=${doneBodyOpen1}, rendered cards=${doneCards1.length} (expected open, 2)`);
await shot(page, 'it5_done_expanded');

/* ══ IT6 — Click ô Tổng (real click) → summary popup ══ */
await page.click('#initiativeTrackerRoot .init-summary-grid .cp-stat-card:nth-child(1)');
await page.waitForTimeout(400);
const sumDisplay = await page.$eval('#initSummaryOverlay', el => el.style.display);
const totalRows  = await page.$$('#initSummaryBody tbody tr');
log('IT6-total-popup-opens', sumDisplay === 'flex', `#initSummaryOverlay display="${sumDisplay}"`);
log('IT6-total-popup-rows', totalRows.length === 6, `rows = ${totalRows.length} (expected 6)`);
await shot(page, 'it6_total_popup');
await page.evaluate(() => closeInitSummaryPopup());

/* ══ IT7 — Ô Done ══ */
await page.evaluate(() => openInitSummaryPopup('done'));
await page.waitForTimeout(300);
const doneRows = await page.$$('#initSummaryBody tbody tr');
log('IT7-done-popup-rows', doneRows.length === 2, `done popup rows = ${doneRows.length} (expected 2)`);

/* ══ IT8 — Ô Overdue ══ */
await page.evaluate(() => { closeInitSummaryPopup(); openInitSummaryPopup('overdue'); });
await page.waitForTimeout(300);
const overdueRows = await page.$$('#initSummaryBody tbody tr');
const overdueFirst = overdueRows.length ? await page.$eval('#initSummaryBody tbody tr:first-child td:first-child', el => el.textContent.trim()) : '';
log('IT8-overdue-popup-rows', overdueRows.length === 1 && overdueFirst === 'INI-02',
  `overdue rows = ${overdueRows.length}, first = "${overdueFirst}" (expected 1, INI-02)`);
await shot(page, 'it8_overdue_popup');

/* ══ IT9 — Row click → mở initViewOverlay ══ */
await page.evaluate(() => { closeInitSummaryPopup(); openInitSummaryPopup('total'); });
await page.waitForTimeout(300);
const firstRow = await page.$('#initSummaryBody tbody tr');
await firstRow.click();
await page.waitForTimeout(400);
const sumGone  = await page.$eval('#initSummaryOverlay', el => el.style.display);
const viewOpen = await page.$eval('#initViewOverlay', el => el.style.display);
log('IT9-row-closes-summary', sumGone === 'none', `summary display="${sumGone}"`);
log('IT9-row-opens-detail',   viewOpen === 'flex', `initViewOverlay display="${viewOpen}"`);
await shot(page, 'it9_row_opens_detail');
await page.evaluate(() => closeInitViewPopup());

/* ══ IT10 — ESC đóng summary ══ */
await page.evaluate(() => openInitSummaryPopup('total'));
await page.waitForTimeout(200);
const beforeEsc = await page.$eval('#initSummaryOverlay', el => el.style.display);
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
await page.waitForTimeout(300);
const afterEsc = await page.$eval('#initSummaryOverlay', el => el.style.display);
log('IT10-esc-closes', beforeEsc === 'flex' && afterEsc === 'none', `ESC: before=${beforeEsc} → after=${afterEsc}`);

/* ══ ITX — Không JS errors ══ */
log('ITX-no-js-errors', jsErrors.length === 0,
  jsErrors.length === 0 ? 'Không có JS error' : `Lỗi: ${jsErrors.slice(0,3).join(' | ')}`);

/* ── Tổng hợp ── */
await browser.close();
server.close();

console.log('\n══════════════════════════════════════════════');
console.log(`  KẾT QUẢ: ${passed}/${passed + failed} PASS`);
console.log('══════════════════════════════════════════════');
results.forEach(r => console.log(`  ${r.ok ? '✅' : '❌'} ${r.id}: ${r.msg}`));
console.log(`\n📁 EVD screenshots → ${EVD_DIR}\n`);

if (failed > 0) process.exit(1);
