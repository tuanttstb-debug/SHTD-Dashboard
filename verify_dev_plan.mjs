/**
 * verify_dev_plan.mjs  —  S54 Dev Plan (Plan phát triển bản thân) smoke tests
 *
 *  DP1  – HTML structure: nav item, view section, modal, view overlay, KB row
 *  DP2  – Navigate via nav click + G+V keyboard shortcut
 *  DP3  – Default filter = current user (login shows only my items)
 *  DP4  – Stat bar counts (total / active / done / stale-review)
 *  DP5  – Filter "Tất cả" → grouped by PIC (group rows appear)
 *  DP6  – Ownership: other user's row is read-only (lock, no edit buttons)
 *  DP7  – Add modal: PIC prefilled=me + locked for non-admin; default state
 *  DP8  – Save new item: row appears, dbDev grows, lastReview set
 *  DP9  – Edit own item pre-fills; editing other user's item is blocked
 *  DP10 – View popup opens; Edit button only for owner
 *  DP11 – Delete own item removes it from table
 *  DP12 – My Work reminder: stale items listed; review save removes item
 *  DP13 – i18n EN switch: nav label + title translate; VI restores
 *  DPX  – No JS errors throughout
 *
 * Run: node verify_dev_plan.mjs
 * EVD: test-results/dev_plan/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = 3043;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'dev_plan');

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

/* ── Mock data ── */
const OLD_ISO = new Date(Date.now() - 10 * 86400000).toISOString(); // stale (10 ngày)
const NEW_ISO = new Date().toISOString();                            // fresh

const MOCK_DEV = [
  { id:'DEV-26-001', name:'Nghiên cứu API / Data Flow / Core banking', target:'Kiến thức nền tảng',
    pic:'TuanTT4', coordUnit:'', startDate:'2026-01-08', endDate:'2026-08-15',
    state:'Đang thực hiện', progress:'20', note:'', lastReview: OLD_ISO, createdBy:'TuanTT4' },
  { id:'DEV-26-002', name:'Xây dựng thư viện prompt mẫu', target:'10 prompt PO',
    pic:'TuanTT4', coordUnit:'', startDate:'2026-07-25', endDate:'2026-08-08',
    state:'Hoàn thành', progress:'100', note:'done', lastReview: NEW_ISO, createdBy:'TuanTT4' },
  { id:'DEV-26-003', name:'Khóa học AI của Nguyệt', target:'2 khóa AI',
    pic:'NguyetTT2', coordUnit:'', startDate:'2026-07-25', endDate:'2026-08-08',
    state:'Đang thực hiện', progress:'30', note:'', lastReview: NEW_ISO, createdBy:'NguyetTT2' },
  { id:'DEV-26-004', name:'Đọc sách về ngân hàng số', target:'Tóm tắt 3 chương',
    pic:'TuanTT4', coordUnit:'', startDate:'2026-07-25', endDate:'2026-09-01',
    state:'Chưa bắt đầu', progress:'0', note:'', lastReview:'', createdBy:'TuanTT4' },
];

const MOCK_USER = { username:'TuanTT4', role:'User', team:'Số', displayName:'Tuấn TT' };

/* ════════════════════════════════════════ */
const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

// Cách ly khỏi Google Apps Script thật — mọi loader background (readDev/readCases/…)
// bị chặn để không ghi đè mock dbDev giữa test (dev-read đã deploy lên production).
await page.route('**://script.google.com/**', route => route.abort());

console.log('\n══════════════════════════════════════════════');
console.log('  S54 Dev Plan — Playwright EVD');
console.log('══════════════════════════════════════════════\n');

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(500);

/* ── Inject mock data + auth + navigate ── */
await page.evaluate(({ dev, user }) => {
  // Cách ly khỏi network thật: chặn các loader background ghi đè mock dbDev
  // (GAS dev-read đã deploy → readDev() thật sẽ clobber dbDev giữa chừng).
  window.readDev = async () => {};
  dbDev = dev;
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'mock-token',
    exp: Date.now() + 86400000,
    user: { username: user.username, role: user.role, team: user.team, displayName: user.displayName }
  }));
  const lo = document.getElementById('loginOverlay');
  if (lo) lo.style.display = 'none';
  try { setupListeners(); } catch(e) {}
  navigateTo('dev-plan');
}, { dev: MOCK_DEV, user: MOCK_USER });

await page.waitForTimeout(600);

/* ── DP1 — STRUCTURE ── */
log('DP1-nav-item',    !!(await page.$('[data-view="dev-plan"]')), 'Nav item [data-view="dev-plan"] tồn tại');
log('DP1-view',        !!(await page.$('#view-dev-plan')),         '#view-dev-plan section tồn tại');
log('DP1-modal',       !!(await page.$('#devModal')),              '#devModal tồn tại');
log('DP1-overlay',     !!(await page.$('#devViewOverlay')),        '#devViewOverlay tồn tại');
log('DP1-table',       !!(await page.$('.dev-table')),             '.dev-table render');
log('DP1-statbar',     !!(await page.$('#devStatBar')),            '#devStatBar tồn tại');
await shot(page, '01_structure');

/* ── DP2 — NAVIGATE ── */
await page.evaluate(() => navigateTo('dashboard'));
await page.waitForTimeout(200);
await page.click('[data-view="dev-plan"]');
await page.waitForTimeout(300);
log('DP2-nav-click', await page.$eval('#view-dev-plan', el => el.style.display !== 'none'), 'Nav click → view visible');

await page.evaluate(() => navigateTo('dashboard'));
await page.waitForTimeout(200);
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key:'g', bubbles:true })));
await page.waitForTimeout(80);
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key:'v', bubbles:true })));
await page.waitForTimeout(300);
log('DP2-gv-shortcut', await page.$eval('[data-view="dev-plan"]', el => el.classList.contains('active')), 'G+V shortcut → nav active');

/* ── DP3 — DEFAULT FILTER = ME ── */
const defPic = await page.$eval('#devFilterPic', el => el.value);
log('DP3-default-filter', defPic === 'TuanTT4', `Filter PIC mặc định = "${defPic}" (expected TuanTT4)`);
let rowCount = await page.$$eval('.dev-row', els => els.length);
log('DP3-my-rows-only', rowCount === 3, `Chỉ hiện 3 item của tôi (thực tế ${rowCount})`);
const hasNguyet = await page.$$eval('.dev-row .dev-cell-name', els => els.some(e => e.textContent.includes('Nguyệt')));
log('DP3-others-hidden', !hasNguyet, 'Item của NguyetTT2 KHÔNG hiện ở filter mặc định');

/* ── DP4 — STAT BAR ── */
const stats = await page.$$eval('#devStatBar .dev-stat-num', els => els.map(e => e.textContent));
log('DP4-stat-total', stats[0] === '3', `Tổng = ${stats[0]} (expected 3)`);
log('DP4-stat-done',  stats[2] === '1', `Hoàn thành = ${stats[2]} (expected 1)`);
log('DP4-stat-stale', stats[3] === '2', `Cần review = ${stats[3]} (expected 2: 001+004)`);

/* ── DP5 — FILTER ALL → GROUPED ── */
await page.evaluate(() => { document.getElementById('devFilterPic').value = ''; devFilterChange(); });
await page.waitForTimeout(200);
const groupRows = await page.$$eval('.dev-group-row', els => els.length);
log('DP5-grouped', groupRows === 2, `Filter Tất cả → ${groupRows} nhóm PIC (expected 2)`);
await shot(page, '02_grouped');

/* ── DP6 — OWNERSHIP READ-ONLY ── */
const lockCount = await page.$$eval('.dev-readonly', els => els.length);
log('DP6-lock-other', lockCount === 1, `Item người khác read-only (lock=${lockCount}, expected 1)`);

/* reset filter về me */
await page.evaluate(() => { document.getElementById('devFilterPic').value = 'TuanTT4'; devFilterChange(); });
await page.waitForTimeout(150);

/* ── DP7 — ADD MODAL ── */
await page.evaluate(() => openDevModal(null));
await page.waitForTimeout(250);
log('DP7-modal-open', await page.$eval('#devModal', el => el.style.display === 'flex'), 'Modal Thêm mở');
const picVal      = await page.$eval('#devfPic', el => el.value);
const picDisabled = await page.$eval('#devfPic', el => el.disabled);
log('DP7-pic-prefill', picVal === 'TuanTT4', `PIC prefilled = "${picVal}"`);
log('DP7-pic-locked', picDisabled === true, `PIC khóa cho non-admin = ${picDisabled}`);
const stVal = await page.$eval('#devfState', el => el.value);
log('DP7-state-default', stVal === 'Chưa bắt đầu', `Trạng thái mặc định = "${stVal}"`);
await shot(page, '03_add_modal');

/* ── DP8 — SAVE NEW ── */
await page.evaluate(() => {
  document.getElementById('devfName').value = 'Task test từ Playwright';
  document.getElementById('devfTarget').value = 'Kết quả test';
  document.getElementById('devfProgress').value = '15';
  devSaveItem();
});
await page.waitForTimeout(300);
const grew = await page.evaluate(() => dbDev.length);
log('DP8-db-grew', grew === 5, `dbDev tăng lên ${grew} (expected 5)`);
const newHasReview = await page.evaluate(() =>
  !!dbDev.find(d => d.name === 'Task test từ Playwright' && d.lastReview));
log('DP8-lastreview-set', newHasReview, 'Item mới có lastReview (mốc review)');
const newInTable = await page.$$eval('.dev-cell-name', els => els.some(e => e.textContent.includes('Task test từ Playwright')));
log('DP8-row-shown', newInTable, 'Item mới hiện trong bảng');

/* ── DP9 — EDIT OWN vs OTHER ── */
await page.evaluate(() => openDevModal('DEV-26-001'));
await page.waitForTimeout(200);
const editName = await page.$eval('#devfName', el => el.value);
log('DP9-edit-own-prefill', editName.includes('Nghiên cứu API'), `Edit của mình prefill = "${editName.slice(0,20)}…"`);
await page.evaluate(() => closeDevModal());
await page.waitForTimeout(100);

await page.evaluate(() => openDevModal('DEV-26-003')); // của NguyetTT2
await page.waitForTimeout(200);
const otherModalOpen = await page.$eval('#devModal', el => el.style.display === 'flex');
log('DP9-edit-other-blocked', !otherModalOpen, `Sửa item người khác bị chặn (modal mở = ${otherModalOpen})`);

/* ── DP10 — VIEW POPUP ── */
await page.evaluate(() => openDevViewPopup('DEV-26-001'));
await page.waitForTimeout(200);
log('DP10-popup-open', await page.$eval('#devViewOverlay', el => el.style.display === 'flex'), 'View popup mở');
const ownHasEdit = await page.$$eval('#devViewOverlay button', els => els.some(b => /Chỉnh sửa|Edit/.test(b.textContent)));
log('DP10-own-edit-btn', ownHasEdit, 'Popup item của mình có nút Chỉnh sửa');
await page.evaluate(() => closeDevViewPopup());
await page.waitForTimeout(100);

await page.evaluate(() => openDevViewPopup('DEV-26-003'));
await page.waitForTimeout(200);
const otherHasEdit = await page.$$eval('#devViewOverlay button', els => els.some(b => /Chỉnh sửa|Edit/.test(b.textContent)));
log('DP10-other-no-edit', !otherHasEdit, 'Popup item người khác KHÔNG có nút Chỉnh sửa');
await page.evaluate(() => closeDevViewPopup());
await shot(page, '04_view_popup');

/* ── DP11 — DELETE OWN ── */
await page.evaluate(() => { window._origUiConfirm = window.uiConfirm; window.uiConfirm = async () => true; });
await page.evaluate(() => devDeleteItem('DEV-26-004'));
await page.waitForTimeout(300);
const afterDel = await page.evaluate(() => dbDev.some(d => d.id === 'DEV-26-004'));
log('DP11-deleted', !afterDel, 'DEV-26-004 đã bị xóa khỏi dbDev');
await page.evaluate(() => { if (window._origUiConfirm) window.uiConfirm = window._origUiConfirm; });

/* ── DP12 — MY WORK: hiện toàn bộ dev item ĐANG LÀM của tôi ── */
await page.evaluate(() => navigateTo('my-work'));
await page.waitForTimeout(400);
log('DP12-section', !!(await page.$('#mwDevReviewSection')), 'My Work có section Plan phát triển bản thân');
// Của tôi & chưa xong: 001 (stale) + item vừa tạo ở DP8 (fresh). 002 done, 004 đã xóa, 003 người khác.
const devrvItems = await page.$$eval('.mw-devrv-item', els => els.length);
log('DP12-active-count', devrvItems === 2, `Số dev item đang làm hiện ở My Work = ${devrvItems} (expected 2: 001 + item mới)`);
const staleBadges = await page.$$eval('.mw-devrv-badge', els => els.length);
log('DP12-stale-badge', staleBadges === 1, `Badge "Cần review" = ${staleBadges} (expected 1: chỉ 001 quá hạn)`);
const freshShown = await page.$$eval('.mw-devrv-name', els => els.some(e => e.textContent.includes('Task test từ Playwright')));
log('DP12-fresh-shown', freshShown, 'Item vừa tạo (fresh) VẪN hiện ở My Work');

// Review item stale (001, xếp đầu) → cập nhật % + reset mốc → badge biến mất, item vẫn còn
await page.evaluate(() => {
  const p = document.querySelector('.mw-devrv-item.is-stale .mw-devrv-prog')
         || document.querySelector('.mw-devrv-prog');
  if (p) p.value = '55';
  const id = (document.querySelector('.mw-devrv-item.is-stale')
           || document.querySelector('.mw-devrv-item'))?.getAttribute('data-id');
  if (id) mwDevReviewSave(id);
});
await page.waitForTimeout(300);
const afterBadges = await page.$$eval('.mw-devrv-badge', els => els.length);
log('DP12-badge-cleared', afterBadges === 0, `Sau review → badge "Cần review" hết (còn ${afterBadges})`);
const stillShown = await page.$$eval('.mw-devrv-item', els => els.length);
log('DP12-still-shown', stillShown === 2, `Item đã review VẪN trong danh sách (còn ${stillShown})`);
const prog001 = await page.evaluate(() => dbDev.find(d => d.id === 'DEV-26-001')?.progress);
log('DP12-progress-saved', prog001 === '55', `Tiến độ đã lưu = ${prog001}% (expected 55)`);
await shot(page, '05_mywork_reminder');

/* ── DP13 — i18n EN ── */
await page.evaluate(() => setLang('en'));
await page.waitForTimeout(250);
const navEn = await page.$eval('[data-view="dev-plan"] .nav-label', el => el.textContent.trim());
log('DP13-nav-en', navEn === 'Personal Dev Plan', `Nav EN = "${navEn}"`);
await page.evaluate(() => navigateTo('dev-plan'));
await page.waitForTimeout(300);
const titleEn = await page.$eval('.dev-title', el => el.textContent.trim());
log('DP13-title-en', /Personal Development Plan/.test(titleEn), `Title EN = "${titleEn}"`);
await page.evaluate(() => setLang('vi'));
await page.waitForTimeout(200);
await page.evaluate(() => navigateTo('dev-plan'));
await page.waitForTimeout(250);
const titleVi = await page.$eval('.dev-title', el => el.textContent.trim());
log('DP13-title-vi-restore', /Plan phát triển bản thân/.test(titleVi), `Title VI khôi phục = "${titleVi}"`);
await shot(page, '06_i18n');

/* ── DPX — NO JS ERRORS ── */
log('DPX-no-js-errors', jsErrors.length === 0,
  jsErrors.length === 0 ? 'Không có JS error' : `${jsErrors.length} lỗi: ${jsErrors.slice(0,3).join(' | ')}`);

/* ── SUMMARY ── */
await browser.close();
server.close();

console.log('\n══════════════════════════════════════════════');
console.log(`  RESULT: ${passed}/${passed + failed} PASS`);
if (failed > 0) {
  console.log('\n  FAILED:');
  results.filter(r => !r.ok).forEach(r => console.log(`    ❌ ${r.id}: ${r.msg}`));
}
console.log('══════════════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
