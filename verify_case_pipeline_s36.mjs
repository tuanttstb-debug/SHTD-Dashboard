/**
 * verify_case_pipeline_s36.mjs
 * S36 Case Pipeline enhancements:
 *   CP0   – All users default scope = 'all'
 *   CP1   – Done/Blocked stages không tính overdue (calcCaseRag)
 *   CP2   – Filter tuần báo cáo (cpFilterTuanBC)
 *   CP3   – Summary card click → popup danh sách
 *   CPX   – Không JS errors
 *
 * Run: node verify_case_pipeline_s36.mjs
 * EVD: test-results/cp_s36/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = 3036;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'cp_s36');

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

/* ── Tính date string relative (ISO YYYY-MM-DD) ── */
function relDate(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function weekLabel(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wk   = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `Tuần ${wk}/${d.getFullYear()}`;
}

/* ── Mock data — dùng relative dates để luôn đúng bất kể system date ── */
// weekLabel(0) = tuần hiện tại, weekLabel(-7) = 1 tuần trước, weekLabel(-14) = 2 tuần trước
const WK_THIS  = weekLabel(0);
const WK_PREV  = weekLabel(-7);
const WK_PREV2 = weekLabel(-14);

const MOCK_CASES = [
  {
    id:'CP-001', tuanBC: WK_THIS,  team:'BL', pic:'TuanTT4',
    dvkd:'HCM', caseName:'Case A – Active sắp đến hạn', loaiHinh:'Món',
    complexity:'Cao', phuongAn:'', giaTriTy:5, stage:'Đang phân tích',
    vuongMac:'', nextStep:'', startDate: relDate(-30), deadline: relDate(30),
    rag:'', canBLD:'Y', highlight:'N', ghiChu:'', yKienBLD:'',
  },
  {
    id:'CP-002', tuanBC: WK_PREV,  team:'BL', pic:'DungLQ1',
    dvkd:'HN', caseName:'Case B – Active QUÁ HẠN', loaiHinh:'Dự án',
    complexity:'Trung bình', phuongAn:'', giaTriTy:8, stage:'Chờ TTĐ/Thẩm định',
    vuongMac:'', nextStep:'', startDate: relDate(-90), deadline: relDate(-10),
    rag:'', canBLD:'N', highlight:'N', ghiChu:'', yKienBLD:'',
  },
  {
    id:'CP-003', tuanBC: WK_THIS,  team:'BL', pic:'TuanTT4',
    dvkd:'HCM', caseName:'Case C – Đã phê duyệt (done, deadline qua)', loaiHinh:'Món',
    complexity:'Thấp', phuongAn:'', giaTriTy:12, stage:'Đã phê duyệt',
    vuongMac:'', nextStep:'', startDate: relDate(-60), deadline: relDate(-20),
    rag:'', canBLD:'N', highlight:'N', ghiChu:'', yKienBLD:'',
  },
  {
    id:'CP-004', tuanBC: WK_PREV2, team:'CV1', pic:'TuanTT4',
    dvkd:'HCM', caseName:'Case D – Chờ GN/triển khai (done, deadline qua)', loaiHinh:'HMTD',
    complexity:'Cao', phuongAn:'', giaTriTy:20, stage:'Chờ giải ngân/triển khai',
    vuongMac:'', nextStep:'', startDate: relDate(-90), deadline: relDate(-30),
    rag:'', canBLD:'N', highlight:'N', ghiChu:'', yKienBLD:'',
  },
  {
    id:'CP-005', tuanBC: WK_THIS,  team:'BL', pic:'DungLQ1',
    dvkd:'HN', caseName:'Case E – Tạm dừng/Blocked (no overdue)', loaiHinh:'Dự án',
    complexity:'Cao', phuongAn:'', giaTriTy:3, stage:'Tạm dừng/Blocked',
    vuongMac:'Blocked vì thiếu hồ sơ', nextStep:'', startDate: relDate(-45), deadline: relDate(-5),
    rag:'', canBLD:'N', highlight:'N', ghiChu:'', yKienBLD:'',
  },
  {
    id:'CP-006', tuanBC: WK_PREV,  team:'CV1', pic:'TuanTT4',
    dvkd:'HCM', caseName:'Case F – Đang triển khai (done, deadline qua)', loaiHinh:'Rà soát',
    complexity:'Thấp', phuongAn:'', giaTriTy:7, stage:'Đang triển khai',
    vuongMac:'', nextStep:'', startDate: relDate(-120), deadline: relDate(-40),
    rag:'', canBLD:'Y', highlight:'N', ghiChu:'', yKienBLD:'',
  },
];

const MOCK_USER = { username:'TuanTT4', role:'User', team:'BL', displayName:'Tuấn TT' };

/* ════════════════════════════════════════ */
const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

console.log('\n══════════════════════════════════════════════');
console.log('  S36 Case Pipeline Enhancements — Playwright EVD');
console.log(`  WK_THIS="${WK_THIS}" | WK_PREV="${WK_PREV}" | WK_PREV2="${WK_PREV2}"`);
console.log('══════════════════════════════════════════════\n');

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(500);

/* ── Inject data + navigate trong 1 evaluate (atomic, no race) ── */
await page.evaluate(({ cases, user }) => {
  // Set global let variable trực tiếp (không phải window.dbCases)
  dbCases = cases;
  // Set localStorage for auth
  localStorage.setItem('shtd_auth', JSON.stringify({
    token: 'mock-token',
    user: { username: user.username, role: user.role, team: user.team, displayName: user.displayName }
  }));
  // Ẩn loginOverlay (mock token không qua GAS auth → overlay chặn click)
  const lo = document.getElementById('loginOverlay');
  if (lo) lo.style.display = 'none';
  const app = document.getElementById('appContainer') || document.getElementById('app');
  if (app) app.style.display = '';
  // window.onload trả về sớm khi không có auth → setupListeners() chưa chạy → không có ESC handler
  try { setupListeners(); } catch(e) { /* bỏ qua nếu đã được gọi rồi */ }
  // Navigate + re-render với mock data
  navigateTo('case-pipeline');
}, { cases: MOCK_CASES, user: MOCK_USER });

await page.waitForTimeout(700);

/* ══════════════════════════════════════════
   CP0 — Default scope = 'all' cho mọi role
══════════════════════════════════════════ */
const allBtnActive = await page.$eval('#cpScopeAll', el => el.classList.contains('active'));
const mineBtnActive = await page.$eval('#cpScopeMine', el => el.classList.contains('active'));
log('CP0-scope-all-active',  allBtnActive,   `"Tất cả" button active = ${allBtnActive}`);
log('CP0-scope-mine-inactive', !mineBtnActive, `"Của tôi" button inactive = ${!mineBtnActive}`);
await shot(page, 'cp0_scope_default_all');

/* ══════════════════════════════════════════
   CP1 — Done/Blocked stages không tính overdue
══════════════════════════════════════════ */

/* CP1-A: calcCaseRag trả '' cho done/blocked stages (kể cả deadline đã qua) */
const ragResults = await page.evaluate(() => {
  return dbCases
    .filter(c => ['Đã phê duyệt','Chờ giải ngân/triển khai','Đang triển khai','Tạm dừng/Blocked'].includes(c.stage))
    .map(c => ({ id: c.id, stage: c.stage, rag: calcCaseRag(c) }));
});
const allDoneBlocked_EmptyRag = ragResults.every(r => r.rag === '');
log('CP1-A-calcCaseRag-done-blocked', allDoneBlocked_EmptyRag,
  `Done/Blocked calcCaseRag = '' cho tất cả: ${JSON.stringify(ragResults)}`);

/* CP1-B: Summary card "Quá hạn" = 1 (chỉ CP-002: active + deadline qua) */
const statOverdue = await page.$eval('#cpStatOverdue', el => el.textContent.trim());
log('CP1-B-summary-overdue-count', statOverdue === '1',
  `cpStatOverdue = "${statOverdue}" (expected "1" — chỉ CP-002 active quá hạn)`);
await shot(page, 'cp1_overdue_stat_count');

/* CP1-C: Table rows của done/blocked stages không có class row-overdue */
const doneRowsHaveRedClass = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#cpTbody tr'));
  return rows.filter(tr => {
    const text = tr.textContent;
    const hasDone = ['Đã phê duyệt','Chờ giải ngân/triển khai','Đang triển khai','Tạm dừng/Blocked']
      .some(s => text.includes(s));
    return hasDone && tr.classList.contains('row-overdue');
  }).length;
});
log('CP1-C-no-row-overdue-for-done', doneRowsHaveRedClass === 0,
  `Số done/blocked rows có class row-overdue = ${doneRowsHaveRedClass} (expected 0)`);

/* CP1-D: CP-002 (active, quá hạn) phải có class row-overdue trong table
   Cần switch preset = 'all' để thấy tất cả, sau đó kiểm tra */
await page.evaluate(() => cpSetPreset('all'));
await page.waitForTimeout(300);
const cp002HasRedRow = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#cpTbody tr'));
  return rows.some(tr => tr.textContent.includes('CP-002') && tr.classList.contains('row-overdue'));
});
log('CP1-D-active-overdue-has-row-red', cp002HasRedRow,
  `CP-002 (active quá hạn) có class row-overdue = ${cp002HasRedRow}`);
await shot(page, 'cp1_active_overdue_row');

// Reset về active preset
await page.evaluate(() => cpSetPreset('active'));
await page.waitForTimeout(300);

/* ══════════════════════════════════════════
   CP2 — Filter tuần báo cáo
══════════════════════════════════════════ */

/* CP2-A: Select #cpFilterTuanBC tồn tại trong DOM */
const tuanBCsel = await page.$('#cpFilterTuanBC');
log('CP2-A-filter-element-exists', tuanBCsel !== null, `#cpFilterTuanBC select exists in DOM`);

/* CP2-B: Options đúng và sorted theo tuần (WK_PREV2 < WK_PREV < WK_THIS) */
const weekOpts = await page.$$eval('#cpFilterTuanBC option', opts =>
  opts.filter(o => o.value).map(o => o.value)
);
// Sort chronological: WK_PREV2 first, then WK_PREV, then WK_THIS
// (mỗi tuần có ít nhất 1 case)
const hasAll3 = weekOpts.includes(WK_THIS) && weekOpts.includes(WK_PREV) && weekOpts.includes(WK_PREV2);
const isSorted = weekOpts.length === 3 && weekOpts[0] === WK_PREV2 && weekOpts[1] === WK_PREV && weekOpts[2] === WK_THIS;
log('CP2-B-options-contain-all-weeks', hasAll3,
  `Weeks: ${JSON.stringify(weekOpts)} (need ${WK_PREV2}, ${WK_PREV}, ${WK_THIS})`);
log('CP2-C-options-sorted-chrono', isSorted,
  `Sorted chronologically: ${isSorted}`);
await shot(page, 'cp2_tuan_bc_filter');

/* CP2-D: Chọn WK_THIS → filter đúng count */
await page.evaluate(() => cpSetPreset('all'));
await page.waitForTimeout(200);
await page.selectOption('#cpFilterTuanBC', WK_THIS);
await page.waitForTimeout(400);
const countInfoW = await page.$eval('#cpCountInfo', el => el.textContent.trim());
// WK_THIS: CP-001, CP-003, CP-005 = 3 cases
log('CP2-D-filter-week-count', countInfoW.includes('3'),
  `Filter ${WK_THIS} → ${countInfoW} (expected 3 cases)`);
await shot(page, 'cp2_filter_week_this');

/* CP2-E: Chip hiển thị khi filter active */
const chip = await page.$eval('#cpFilterChips', el => el.textContent.trim());
log('CP2-E-filter-chip-shown', chip.includes('Tuần BC:'),
  `Filter chip: "${chip}"`);

/* CP2-F: Clear filter → reset */
await page.evaluate(() => clearCpFilters());
await page.waitForTimeout(300);
const tuanAfterClear = await page.$eval('#cpFilterTuanBC', el => el.value);
log('CP2-F-filter-clears', tuanAfterClear === '',
  `#cpFilterTuanBC after clearCpFilters() = "${tuanAfterClear}" (expected "")`);

await page.evaluate(() => cpSetPreset('all'));
await page.waitForTimeout(300);
await shot(page, 'cp2_filter_cleared');

/* ══════════════════════════════════════════
   CP3 — Summary card click → popup
══════════════════════════════════════════ */

/* CP3-A: 4 cards đều có onclick attribute */
const cardOnclicks = await page.$$eval('.cp-stat-card', cards =>
  cards.map(c => c.getAttribute('onclick') || '').filter(Boolean)
);
log('CP3-A-cards-have-onclick', cardOnclicks.length === 4,
  `${cardOnclicks.length}/4 stat cards có onclick`);

/* CP3-B: Click "Tổng số Case" → #cpSummaryOverlay mở, title đúng */
await page.click('.cp-stat-card:nth-child(1)');
await page.waitForTimeout(500);
const summaryDisplay = await page.$eval('#cpSummaryOverlay', el => el.style.display);
const summaryTitle   = await page.$eval('#cpSummaryTitle',   el => el.textContent.trim());
log('CP3-B-total-popup-opens', summaryDisplay === 'flex',
  `#cpSummaryOverlay display = "${summaryDisplay}" (expected "flex")`);
log('CP3-B-total-popup-title', summaryTitle === 'Tổng số Case',
  `Popup title = "${summaryTitle}"`);
await shot(page, 'cp3_total_popup');

/* CP3-C: Popup "Tổng" hiện đủ rows (6 cases trong dbCases) */
const totalRows = await page.$$('#cpSummaryBody tbody tr');
log('CP3-C-total-popup-row-count', totalRows.length === MOCK_CASES.length,
  `Total popup rows = ${totalRows.length} (expected ${MOCK_CASES.length})`);

/* CP3-D: Đóng bằng nút "Đóng" */
await page.click('#cpSummaryOverlay .modal-footer .btn-outline');
await page.waitForTimeout(300);
const closedDisplay = await page.$eval('#cpSummaryOverlay', el => el.style.display);
log('CP3-D-close-button-works', closedDisplay === 'none',
  `Popup sau khi bấm Đóng: display="${closedDisplay}"`);

/* CP3-E: Click "Quá hạn" card → popup chỉ CP-002 */
await page.click('.cp-stat-card:nth-child(3)');
await page.waitForTimeout(500);
const overdueTitle = await page.$eval('#cpSummaryTitle', el => el.textContent.trim());
const overdueRows  = await page.$$('#cpSummaryBody tbody tr');
log('CP3-E-overdue-popup-title', overdueTitle === 'Quá hạn deadline',
  `Overdue popup title = "${overdueTitle}"`);
log('CP3-E-overdue-popup-count', overdueRows.length === 1,
  `Overdue popup rows = ${overdueRows.length} (expected 1: chỉ CP-002)`);
await shot(page, 'cp3_overdue_popup');

/* CP3-F: Click row trong popup → đóng summary, mở detail (cpViewOverlay) */
if (overdueRows.length > 0) {
  await overdueRows[0].click();
  await page.waitForTimeout(500);
  const summaryGone = await page.$eval('#cpSummaryOverlay', el => el.style.display);
  const viewOpen    = await page.$eval('#cpViewOverlay',    el => el.style.display);
  log('CP3-F-row-closes-summary',    summaryGone === 'none', `Summary đóng = ${summaryGone}`);
  log('CP3-F-row-opens-case-detail', viewOpen    === 'flex', `CaseView mở  = ${viewOpen}`);
  await shot(page, 'cp3_row_click_opens_detail');
  await page.evaluate(() => closeCaseViewPopup());
  await page.waitForTimeout(200);
}

/* CP3-G: ESC đóng summary popup */
await page.click('.cp-stat-card:nth-child(1)');
await page.waitForTimeout(300);
const beforeEsc = await page.$eval('#cpSummaryOverlay', el => el.style.display);
// Dispatch ESC trực tiếp trong page context (không cần focus) thay vì page.keyboard.press
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
await page.waitForTimeout(300);
const afterEsc = await page.$eval('#cpSummaryOverlay', el => el.style.display);
log('CP3-G-esc-closes-popup', beforeEsc === 'flex' && afterEsc === 'none',
  `ESC: before=${beforeEsc} → after=${afterEsc}`);
await shot(page, 'cp3_esc_closes_popup');

/* CP3-H: Click "Cần BLĐ" card → CP-001 + CP-006 (canBLD=Y) */
await page.click('.cp-stat-card:nth-child(4)');
await page.waitForTimeout(400);
const bldTitle = await page.$eval('#cpSummaryTitle', el => el.textContent.trim());
const bldRows  = await page.$$('#cpSummaryBody tbody tr');
log('CP3-H-bld-popup-title', bldTitle === 'Cần BLĐ duyệt',
  `BLD popup title = "${bldTitle}"`);
log('CP3-H-bld-popup-count', bldRows.length === 2,
  `BLD popup rows = ${bldRows.length} (expected 2: CP-001, CP-006)`);
await shot(page, 'cp3_bld_popup');
await page.evaluate(() => closeCpSummaryPopup());

/* CP3-I: Click "Giá trị" card → sorted by giaTriTy desc, first = CP-004 (20 tỷ) */
await page.click('.cp-stat-card:nth-child(2)');
await page.waitForTimeout(400);
const valueTitle   = await page.$eval('#cpSummaryTitle',    el => el.textContent.trim());
const valueSub     = await page.$eval('#cpSummarySubtitle', el => el.textContent.trim());
const firstRowText = await page.$eval('#cpSummaryBody tbody tr:first-child td:first-child',
                       el => el.textContent.trim());
log('CP3-I-value-popup-title', valueTitle === 'Tổng giá trị pipeline',
  `Value popup title = "${valueTitle}"`);
log('CP3-I-value-popup-subtitle-has-ty', valueSub.includes('tỷ'),
  `Value subtitle: "${valueSub}"`);
log('CP3-I-value-sorted-desc-first', firstRowText === 'CP-004',
  `First row (highest value 20 tỷ) = "${firstRowText}" (expected CP-004)`);
await shot(page, 'cp3_value_popup_sorted');
await page.evaluate(() => closeCpSummaryPopup());

/* ══════════════════════════════════════════
   CPX — Không JS errors
══════════════════════════════════════════ */
log('CPX-no-js-errors', jsErrors.length === 0,
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
