/**
 * verify_nav_group.mjs — CR Left-menu 2 lớp (gom nhóm menu mẹ)
 *
 *  NG1  – Structure: 5 nav-group (bld/h2/work/kpi/admin) + mục phẳng (my-work/dev-plan/dashboard/ai-chat)
 *  NG2  – Không mất view: đủ 22 nav-item [data-view] (mọi view cũ còn nguyên)
 *  NG3  – Mặc định lần đầu (localStorage sạch): 'work' mở, bld/h2/kpi gấp
 *  NG4  – toggleNavGroup mở nhóm đang gấp + lưu localStorage
 *  NG5  – toggleNavGroup lần 2 gấp lại + lưu localStorage
 *  NG6  – Persist qua reload: đặt kpi mở → reload → kpi vẫn mở
 *  NG7  – Auto-expand nhóm chứa view active: navigateTo('rm-analysis') → nhóm kpi mở
 *  NG8  – navigateTo view trong nhóm vẫn hoạt động (issue-tracker active + section hiện)
 *  NG9  – Phím tắt g+k → kpi-overview active (view nằm trong nhóm)
 *  NG10 – Badge dồn: child danger badge hiện trong nhóm GẤP → group-dot hiện + has-alert
 *  NG11 – Badge dồn: khi nhóm MỞ → group-dot ẩn (child tự hiện badge)
 *  NG12 – Sidebar thu gọn 68px: hover header nhóm → flyout body hiện (display:block)
 *  NG13 – Không có JS error xuyên suốt
 *
 * Run: node verify_nav_group.mjs
 * EVD: test-results/nav_group/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3051;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'nav_group');
if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let passed = 0, failed = 0;
const results = [];
function log(id, ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`);
  results.push({ id, ok, msg });
  if (ok) passed++; else failed++;
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(EVD_DIR, `${name}.png`), fullPage: false });
}

const USER_ADMIN = { username:'TuanTT4', role:'Admin', team:'Số', displayName:'Tuấn TT (Admin)' };

const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.route('**/script.google.com/**', r => r.abort());

console.log('\n══════════════════════════════════════════════');
console.log('  CR Left-menu 2 lớp — Playwright EVD');
console.log(`  PORT=${PORT}`);
console.log('══════════════════════════════════════════════\n');

// Auth + clear nav-group state để test mặc định "lần đầu"
await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.evaluate((user) => {
  localStorage.removeItem('shtd_nav_groups');
  localStorage.setItem('shtd_auth_v1', JSON.stringify({ token:'mock', exp: Date.now()+86400000, user }));
}, USER_ADMIN);
await page.reload({ waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(800);
await page.evaluate(() => { const lo=document.getElementById('loginOverlay'); if(lo) lo.style.display='none'; });

/* ── NG1: structure ── */
const groups = await page.$$eval('.nav-group', els => els.map(e => e.dataset.group));
const hasAllGroups = ['bld','h2','work','kpi','admin'].every(k => groups.includes(k));
const flatViews = await page.$$eval('.nav-menu > .nav-item', els => els.map(e => e.dataset.view));
const flatOk = ['my-work','dev-plan','dashboard','ai-chat'].every(v => flatViews.includes(v));
log('NG1-groups', hasAllGroups, `5 nav-group: [${groups.join(', ')}]`);
log('NG1-flat',   flatOk,       `mục phẳng top-level: [${flatViews.join(', ')}]`);
await shot(page, 'NG1-structure');

/* ── NG2: không mất view ── */
const allViews = await page.$$eval('.nav-item[data-view]', els => els.map(e => e.dataset.view));
const EXPECTED = ['my-work','dev-plan','dashboard','executive-summary','bld-queue','h2-dashboard',
  'h2-tracker','h2-review','case-pipeline','issue-tracker','initiative-tracker','tasks','gantt',
  'performance','kpi-overview','action-plan','kpi-progress','owner-analysis','branch-analysis',
  'rm-analysis','ai-chat','user-management'];
const missing = EXPECTED.filter(v => !allViews.includes(v));
log('NG2-no-view-lost', missing.length === 0 && allViews.length === EXPECTED.length,
  `${allViews.length}/${EXPECTED.length} view; thiếu: [${missing.join(', ') || 'none'}]`);

/* ── NG3: mặc định lần đầu ── */
const defState = await page.evaluate(() => {
  const isOpen = k => document.querySelector(`.nav-group[data-group="${k}"]`)?.classList.contains('open');
  return { work: isOpen('work'), bld: isOpen('bld'), h2: isOpen('h2'), kpi: isOpen('kpi') };
});
log('NG3-default', defState.work === true && defState.bld === false && defState.h2 === false && defState.kpi === false,
  `work=${defState.work} bld=${defState.bld} h2=${defState.h2} kpi=${defState.kpi}`);

/* ── NG4: toggle mở nhóm gấp ── */
await page.click('.nav-group[data-group="kpi"] .nav-group-header');
await page.waitForTimeout(200);
const kpiOpen = await page.evaluate(() => document.querySelector('.nav-group[data-group="kpi"]').classList.contains('open'));
const kpiSaved = await page.evaluate(() => (JSON.parse(localStorage.getItem('shtd_nav_groups'))||{}).kpi);
log('NG4-toggle-open', kpiOpen === true && kpiSaved === true, `kpi open=${kpiOpen}, saved=${kpiSaved}`);
await shot(page, 'NG4-kpi-open');

/* ── NG5: toggle gấp lại ── */
await page.click('.nav-group[data-group="kpi"] .nav-group-header');
await page.waitForTimeout(200);
const kpiClosed = await page.evaluate(() => document.querySelector('.nav-group[data-group="kpi"]').classList.contains('open'));
const kpiSaved2 = await page.evaluate(() => (JSON.parse(localStorage.getItem('shtd_nav_groups'))||{}).kpi);
log('NG5-toggle-close', kpiClosed === false && kpiSaved2 === false, `kpi open=${kpiClosed}, saved=${kpiSaved2}`);

/* ── NG6: persist qua reload ── */
await page.evaluate(() => { toggleNavGroup('kpi'); });   // set kpi open + save
await page.waitForTimeout(150);
await page.reload({ waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(700);
await page.evaluate(() => { const lo=document.getElementById('loginOverlay'); if(lo) lo.style.display='none'; });
const kpiAfterReload = await page.evaluate(() => document.querySelector('.nav-group[data-group="kpi"]').classList.contains('open'));
log('NG6-persist', kpiAfterReload === true, `kpi mở lại sau reload = ${kpiAfterReload}`);

/* ── NG7: auto-expand nhóm chứa active ── */
await page.evaluate(() => { toggleNavGroup('kpi'); }); // đóng kpi trước
await page.waitForTimeout(100);
await page.evaluate(() => { navigateTo('rm-analysis'); });
await page.waitForTimeout(200);
const kpiAutoOpen = await page.evaluate(() => document.querySelector('.nav-group[data-group="kpi"]').classList.contains('open'));
log('NG7-auto-expand', kpiAutoOpen === true, `nhóm kpi auto-mở khi vào rm-analysis = ${kpiAutoOpen}`);

/* ── NG8: navigateTo view trong nhóm ── */
await page.evaluate(() => { navigateTo('issue-tracker'); });
await page.waitForTimeout(300);
const issueActive = await page.evaluate(() => document.querySelector('[data-view="issue-tracker"]').classList.contains('active'));
const issueShown  = await page.evaluate(() => { const s=document.getElementById('view-issue-tracker'); return s ? s.style.display : 'missing'; });
log('NG8-nav-grouped', issueActive === true && issueShown === 'contents', `issue active=${issueActive}, section=${issueShown}`);

/* ── NG9: phím tắt g+k → kpi-overview ── */
await page.evaluate(() => { navigateTo('my-work'); }); // reset
await page.waitForTimeout(150);
await page.keyboard.press('g');
await page.keyboard.press('k');
await page.waitForTimeout(250);
const kpiOvActive = await page.evaluate(() => document.querySelector('[data-view="kpi-overview"]').classList.contains('active'));
log('NG9-shortcut', kpiOvActive === true, `g+k → kpi-overview active = ${kpiOvActive}`);

/* ── NG10 + NG11: badge dồn ở nhóm mẹ ── */
// Ép: đóng nhóm work, hiện badge issue danger → group-dot phải hiện
const rollup = await page.evaluate(() => {
  const g = document.querySelector('.nav-group[data-group="work"]');
  g.classList.remove('open');
  const ib = document.getElementById('navBadgeIssue');
  ib.textContent = '3'; ib.style.display = '';
  updateNavGroupBadges();
  const dot = g.querySelector('[data-group-dot]');
  const closedDot = dot ? dot.style.display !== 'none' : false;
  const hasAlert = g.classList.contains('has-alert');
  // giờ mở nhóm → dot phải ẩn
  g.classList.add('open');
  updateNavGroupBadges();
  const openDot = dot ? dot.style.display !== 'none' : false;
  return { closedDot, hasAlert, openDot };
});
log('NG10-rollup-closed', rollup.closedDot === true && rollup.hasAlert === true,
  `nhóm gấp có danger → dot hiện=${rollup.closedDot}, has-alert=${rollup.hasAlert}`);
log('NG11-rollup-open', rollup.openDot === false, `nhóm mở → dot ẩn=${!rollup.openDot}`);

/* ── NG12: flyout khi sidebar thu gọn 68px ── */
await page.evaluate(() => { document.getElementById('sidebar').classList.add('collapsed'); });
await page.waitForTimeout(150);
await page.hover('.nav-group[data-group="kpi"] .nav-group-header');
await page.waitForTimeout(250);
const flyoutDisplay = await page.evaluate(() => {
  const body = document.querySelector('.nav-group[data-group="kpi"] .nav-group-body');
  return getComputedStyle(body).display;
});
log('NG12-flyout', flyoutDisplay === 'block', `hover nhóm (collapsed) → body display=${flyoutDisplay}`);
await shot(page, 'NG12-flyout-collapsed');
await page.evaluate(() => { document.getElementById('sidebar').classList.remove('collapsed'); });

/* ── NG13: no JS errors ── */
log('NG13-no-errors', jsErrors.length === 0, jsErrors.length ? jsErrors.join(' | ') : 'no JS errors');

await shot(page, 'NG-final');
await browser.close();
server.close();

console.log(`\n${passed}/${passed+failed} PASS`);
if (failed) process.exit(1);
