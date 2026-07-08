/**
 * verify_issue_tracker.mjs  —  S41 Issue Tracker smoke tests
 *
 *  IT1  – HTML structure: nav item, view section, KPI cards, chart canvases, modal, overlay
 *  IT2  – Navigate via nav click + G+I keyboard shortcut
 *  IT3  – Add issue: modal opens, nguoiLog auto-fill, severity→deadline auto-fill
 *  IT4  – loaiXuLy toggle: Đơn giản → 4 statuses | Phức tạp → 6 statuses
 *  IT5  – Save issue: toast, row in table, KPI stats update
 *  IT6  – View popup on row click + backdrop click closes
 *  IT7  – Edit issue: pre-fills all fields correctly
 *  IT8  – Preset tabs: open / breach / done / all counts correct
 *  IT9  – Filter by system; clear filters restores full list
 *  IT10 – SLA breach: overdue row gets row-overdue class + nav badge
 *  IT11 – Sort by tieuDe ascending / descending
 *  IT12 – Delete issue: confirm → removed from table
 *  ITX  – No JS errors throughout
 *
 * Run: node verify_issue_tracker.mjs
 * EVD: test-results/issue_tracker/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = 3041;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'issue_tracker');

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
function isoDate(deltaDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Mock issues ── */
const TODAY      = isoDate(0);
const YESTERDAY  = isoDate(-1);
const NEXT_WEEK  = isoDate(7);
const LAST_MONTH = isoDate(-30);

const MOCK_ISSUES = [
  {
    id:'IS-26-001', ngayPhatSinh: LAST_MONTH, tieuDe:'Login timeout trên BIZ',
    heTong:'BIZ', loaiIssue:'Bug', mucDo:'High', loaiXuLy:'Đơn giản',
    trangThai:'Đang xử lý', phongBan:'Dev1', nguyenNhan:'Session expire quá ngắn',
    deXuat:'Tăng timeout lên 30 phút', deadline: NEXT_WEEK, ngayGiaiQuyet:'',
    ticketNgoai:'JIRA-1001', anhHuong:'100 NV không login được buổi sáng',
    nguoiLog:'TuanTT4', nguoiXuLy:'DevA', ghiChu:'',
  },
  {
    id:'IS-26-002', ngayPhatSinh: LAST_MONTH, tieuDe:'Báo cáo BPM chạy chậm',
    heTong:'BPM DXGN', loaiIssue:'Performance', mucDo:'Medium', loaiXuLy:'Phức tạp',
    trangThai:'Testing', phongBan:'Dev3', nguyenNhan:'Query không có index',
    deXuat:'Thêm composite index', deadline: NEXT_WEEK, ngayGiaiQuyet:'',
    ticketNgoai:'', anhHuong:'', nguoiLog:'TuanTT4', nguoiXuLy:'DevB', ghiChu:'',
  },
  {
    id:'IS-26-003', ngayPhatSinh: LAST_MONTH, tieuDe:'Lỗi data sai trên QTGN',
    heTong:'BPM QTGN', loaiIssue:'Data', mucDo:'Critical', loaiXuLy:'Phức tạp',
    trangThai:'Đã xử lý', phongBan:'BIZ', nguyenNhan:'Mapping sai field',
    deXuat:'Fix mapping', deadline: YESTERDAY, ngayGiaiQuyet: TODAY,
    ticketNgoai:'SN-555', anhHuong:'Dữ liệu phê duyệt sai', nguoiLog:'TuanTT4',
    nguoiXuLy:'DevC', ghiChu:'',
  },
  {
    // SLA breach: không done + deadline đã qua
    id:'IS-26-004', ngayPhatSinh: LAST_MONTH, tieuDe:'Config sai môi trường UAT',
    heTong:'BIZ', loaiIssue:'Config', mucDo:'Low', loaiXuLy:'Đơn giản',
    trangThai:'Mới', phongBan:'Dev1', nguyenNhan:'',
    deXuat:'', deadline: YESTERDAY, ngayGiaiQuyet:'',
    ticketNgoai:'', anhHuong:'', nguoiLog:'TuanTT4', nguoiXuLy:'', ghiChu:'',
  },
];

const MOCK_USER = { username:'TuanTT4', role:'Admin', team:'BL', displayName:'Tuấn TT' };

/* ════════════════════════════════════════ */
const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

console.log('\n══════════════════════════════════════════════');
console.log('  S41 Issue Tracker — Playwright EVD');
console.log(`  TODAY=${TODAY} | YESTERDAY=${YESTERDAY} | NEXT_WEEK=${NEXT_WEEK}`);
console.log('══════════════════════════════════════════════\n');

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(500);

/* ── Inject mock data + auth + navigate ── */
await page.evaluate(({ issues, user }) => {
  dbIssues = issues;
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'mock-token',
    exp: Date.now() + 86400000,   // getAuthSession() cần exp còn hạn
    user: { username: user.username, role: user.role, team: user.team, displayName: user.displayName }
  }));
  const lo = document.getElementById('loginOverlay');
  if (lo) lo.style.display = 'none';
  try { setupListeners(); } catch(e) {}
  navigateTo('issue-tracker');
}, { issues: MOCK_ISSUES, user: MOCK_USER });

await page.waitForTimeout(700);

/* ══════════════════════════════════════════
   IT1 — HTML STRUCTURE
══════════════════════════════════════════ */
const navItem   = await page.$('[data-view="issue-tracker"]');
const viewSec   = await page.$('#view-issue-tracker');
const kpiTotal  = await page.$('#itStatTotal');
const kpiOpen   = await page.$('#itStatOpen');
const kpiBreach = await page.$('#itStatBreach');
const kpiMttr   = await page.$('#itStatMttr');
const trendCanvas  = await page.$('#itTrendChart');
const systemCanvas = await page.$('#itSystemChart');
const mttrTable    = await page.$('#itMttrTable');
const rcTable      = await page.$('#itRootCauseTable');
const itModal   = await page.$('#itModal');
const itOverlay = await page.$('#itViewOverlay');
const itTbody   = await page.$('#itTbody');

log('IT1-nav-item',     !!navItem,      'Nav item [data-view="issue-tracker"] tồn tại');
log('IT1-view-section', !!viewSec,      '#view-issue-tracker section tồn tại');
log('IT1-kpi-total',    !!kpiTotal,     '#itStatTotal tồn tại');
log('IT1-kpi-open',     !!kpiOpen,      '#itStatOpen tồn tại');
log('IT1-kpi-breach',   !!kpiBreach,    '#itStatBreach tồn tại');
log('IT1-kpi-mttr',     !!kpiMttr,      '#itStatMttr tồn tại');
log('IT1-trend-canvas', !!trendCanvas,  '#itTrendChart canvas tồn tại');
log('IT1-system-canvas',!!systemCanvas, '#itSystemChart canvas tồn tại');
log('IT1-mttr-table',   !!mttrTable,    '#itMttrTable tồn tại');
log('IT1-rc-table',     !!rcTable,      '#itRootCauseTable tồn tại');
log('IT1-modal',        !!itModal,      '#itModal tồn tại');
log('IT1-overlay',      !!itOverlay,    '#itViewOverlay tồn tại');
log('IT1-tbody',        !!itTbody,      '#itTbody tồn tại');
await shot(page, '01_it1_structure');

/* ══════════════════════════════════════════
   IT2 — NAVIGATE
══════════════════════════════════════════ */
// Nav click
await page.evaluate(() => navigateTo('dashboard'));
await page.waitForTimeout(300);
await page.click('[data-view="issue-tracker"]');
await page.waitForTimeout(500);
const viewVisible = await page.$eval('#view-issue-tracker', el => el.style.display !== 'none');
log('IT2-nav-click', viewVisible, `Nav click → #view-issue-tracker visible = ${viewVisible}`);

// G+I keyboard shortcut
await page.evaluate(() => navigateTo('dashboard'));
await page.waitForTimeout(300);
await page.evaluate(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'g', bubbles:true }));
});
await page.waitForTimeout(100);
await page.evaluate(() => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key:'i', bubbles:true }));
});
await page.waitForTimeout(500);
const navActiveIT = await page.$eval('[data-view="issue-tracker"]', el => el.classList.contains('active'));
log('IT2-gi-shortcut', navActiveIT, `G+I shortcut → nav item active = ${navActiveIT}`);
await shot(page, '02_it2_navigate');

/* ══════════════════════════════════════════
   IT3 — MODAL OPEN + AUTO-FILL
══════════════════════════════════════════ */
await page.evaluate(() => openIssueModal(null));
await page.waitForTimeout(400);

const modalVisible = await page.$eval('#itModal', el => el.style.display === 'flex' || el.style.display === '');
log('IT3-modal-open', modalVisible, `Modal #itModal visible = ${modalVisible}`);

// nguoiLog auto-filled từ mock session
const nguoiLog = await page.$eval('#itfNguoiLog', el => el.value);
log('IT3-auto-fill-nguoilog', nguoiLog === 'TuanTT4', `nguoiLog auto-filled = "${nguoiLog}" (expected TuanTT4)`);

// Deadline còn trống lúc đầu
const deadlineBefore = await page.$eval('#itfDeadline', el => el.value);
log('IT3-deadline-empty-before-severity', deadlineBefore === '', `Deadline trống trước khi chọn severity = "${deadlineBefore}"`);

// Chọn severity = Critical → deadline tự điền (1 ngày từ hôm nay)
await page.selectOption('#itfMucDo', 'Critical');
await page.waitForTimeout(200);
const deadlineAfter = await page.$eval('#itfDeadline', el => el.value);
const tomorrow = isoDate(1);
log('IT3-sla-auto-deadline', deadlineAfter === tomorrow,
  `Severity=Critical → deadline tự điền = "${deadlineAfter}" (expected "${tomorrow}")`);

// Chọn severity = High → deadline 3 ngày
await page.fill('#itfDeadline', ''); // clear
await page.selectOption('#itfMucDo', 'High');
await page.waitForTimeout(200);
const deadlineHigh = await page.$eval('#itfDeadline', el => el.value);
log('IT3-sla-high-3days', deadlineHigh === isoDate(3),
  `Severity=High → deadline = "${deadlineHigh}" (expected "${isoDate(3)}")`);

await shot(page, '03_it3_modal_autofill');

/* ══════════════════════════════════════════
   IT4 — LOAI XU LY → STATUS OPTIONS
══════════════════════════════════════════ */
// Đơn giản → 4 options
await page.selectOption('#itfLoaiXuLy', 'Đơn giản');
await page.waitForTimeout(200);
const simpleOpts = await page.$$eval('#itfTrangThai option', opts => opts.map(o => o.value));
log('IT4-simple-4-statuses', simpleOpts.length === 4,
  `Đơn giản → ${simpleOpts.length} statuses: ${JSON.stringify(simpleOpts)}`);
log('IT4-simple-has-dang-xu-ly', simpleOpts.includes('Đang xử lý'),
  `Đơn giản có "Đang xử lý" = ${simpleOpts.includes('Đang xử lý')}`);
log('IT4-simple-no-testing', !simpleOpts.includes('Testing'),
  `Đơn giản không có "Testing" = ${!simpleOpts.includes('Testing')}`);

// Phức tạp → 6 options (bao gồm Dev xử lý, Testing, UAT)
await page.selectOption('#itfLoaiXuLy', 'Phức tạp');
await page.waitForTimeout(200);
const complexOpts = await page.$$eval('#itfTrangThai option', opts => opts.map(o => o.value));
log('IT4-complex-6-statuses', complexOpts.length === 6,
  `Phức tạp → ${complexOpts.length} statuses: ${JSON.stringify(complexOpts)}`);
log('IT4-complex-has-testing', complexOpts.includes('Testing'),
  `Phức tạp có "Testing" = ${complexOpts.includes('Testing')}`);
log('IT4-complex-has-uat', complexOpts.includes('UAT'),
  `Phức tạp có "UAT" = ${complexOpts.includes('UAT')}`);
log('IT4-complex-has-dev-xu-ly', complexOpts.includes('Dev xử lý'),
  `Phức tạp có "Dev xử lý" = ${complexOpts.includes('Dev xử lý')}`);

await shot(page, '04_it4_status_options');

/* ══════════════════════════════════════════
   IT5 — SAVE ISSUE + TABLE + KPI
══════════════════════════════════════════ */
// Reset modal → Đơn giản; fill required fields
await page.selectOption('#itfLoaiXuLy', 'Đơn giản');
await page.waitForTimeout(200);
await page.fill('#itfTieuDe', 'Test Issue Mới từ Playwright');
await page.selectOption('#itfHeTong', 'BIZ');
await page.selectOption('#itfMucDo', 'Medium');
await page.fill('#itfDeadline', NEXT_WEEK);
await page.selectOption('#itfTrangThai', 'Mới');

const issueCountBefore = await page.evaluate(() => dbIssues.length);
await page.evaluate(() => itSaveIssue());
await page.waitForTimeout(500);

const issueCountAfter = await page.evaluate(() => dbIssues.length);
log('IT5-issue-added-to-db', issueCountAfter === issueCountBefore + 1,
  `dbIssues length: ${issueCountBefore} → ${issueCountAfter}`);

// Modal đóng sau save
const modalAfterSave = await page.$eval('#itModal', el => el.style.display);
log('IT5-modal-closed-after-save', modalAfterSave === 'none' || modalAfterSave === '',
  `Modal display = "${modalAfterSave}" sau khi save`);

// Row mới xuất hiện trong table (preset = 'open')
await page.evaluate(() => itSetPreset('all'));
await page.waitForTimeout(300);
const newRowExists = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#itTbody tr'));
  return rows.some(tr => tr.textContent.includes('Test Issue Mới từ Playwright'));
});
log('IT5-row-in-table', newRowExists, `Hàng "Test Issue Mới từ Playwright" xuất hiện trong bảng`);

// KPI total tăng
const kpiTotalVal = await page.$eval('#itStatTotal', el => parseInt(el.textContent) || 0);
log('IT5-kpi-total-updated', kpiTotalVal === issueCountAfter,
  `#itStatTotal = ${kpiTotalVal} (expected ${issueCountAfter})`);

await shot(page, '05_it5_save_issue');

/* ══════════════════════════════════════════
   IT6 — VIEW POPUP + BACKDROP CLOSE
══════════════════════════════════════════ */
// Click vào row IS-26-001
const firstRowSelector = '#itTbody tr:first-child';
await page.click(firstRowSelector);
await page.waitForTimeout(400);

const overlayVisible = await page.$eval('#itViewOverlay', el => el.style.display === 'flex');
log('IT6-view-popup-opens', overlayVisible, `#itViewOverlay display=flex sau khi click row`);

// Popup hiển thị đúng tiêu đề (một trong mock issues)
const popupContent = await page.$eval('#itViewOverlay', el => el.innerHTML);
const hasIssueTitle = popupContent.includes('IS-26-') || popupContent.includes('Login timeout') || popupContent.includes('Báo cáo BPM') || popupContent.includes('Config sai');
log('IT6-popup-content', hasIssueTitle, `Popup chứa nội dung issue`);

// Backdrop click đóng popup — click vào góc top-left (tránh modal box bên trong)
await page.click('#itViewOverlay', { position: { x: 5, y: 5 } });
await page.waitForTimeout(300);
const overlayAfterClick = await page.$eval('#itViewOverlay', el => el.style.display);
log('IT6-backdrop-closes-popup', overlayAfterClick === 'none',
  `Backdrop click → overlay display = "${overlayAfterClick}"`);

await shot(page, '06_it6_view_popup');

/* ══════════════════════════════════════════
   IT7 — EDIT: PRE-FILLS CORRECTLY
══════════════════════════════════════════ */
await page.evaluate(() => openIssueModal('IS-26-001'));
await page.waitForTimeout(400);

const editModalVisible = await page.$eval('#itModal', el => el.style.display === 'flex');
log('IT7-edit-modal-opens', editModalVisible, `Edit modal opens = ${editModalVisible}`);

const editTieuDe  = await page.$eval('#itfTieuDe', el => el.value);
const editHeTong  = await page.$eval('#itfHeTong', el => el.value);
const editMucDo   = await page.$eval('#itfMucDo', el => el.value);
const editNguoiLog = await page.$eval('#itfNguoiLog', el => el.value);
const editOrigId  = await page.$eval('#itOrigId', el => el.value);

log('IT7-prefill-tieude',   editTieuDe === 'Login timeout trên BIZ',
  `#itfTieuDe = "${editTieuDe}"`);
log('IT7-prefill-hetong',   editHeTong === 'BIZ',
  `#itfHeTong = "${editHeTong}"`);
log('IT7-prefill-mucdo',    editMucDo === 'High',
  `#itfMucDo = "${editMucDo}"`);
log('IT7-prefill-nguoilog', editNguoiLog === 'TuanTT4',
  `#itfNguoiLog = "${editNguoiLog}"`);
log('IT7-origid-set',       editOrigId === 'IS-26-001',
  `#itOrigId = "${editOrigId}"`);

// Dùng evaluate để tránh toast overlay chặn click
await page.evaluate(() => closeIssueModal());
await page.waitForTimeout(300);
await shot(page, '07_it7_edit_prefill');

/* ══════════════════════════════════════════
   IT8 — PRESET TABS
══════════════════════════════════════════ */
const allCount = await page.evaluate(() => dbIssues.length);

// Preset: all
await page.evaluate(() => itSetPreset('all'));
await page.waitForTimeout(300);
const countAll = await page.evaluate(() => {
  const rows = document.querySelectorAll('#itTbody tr');
  return Array.from(rows).filter(r => !r.querySelector('td[colspan]')).length;
});
log('IT8-preset-all', countAll === allCount,
  `Preset "all" → ${countAll} rows (dbIssues.length = ${allCount})`);

// Preset: done
await page.evaluate(() => itSetPreset('done'));
await page.waitForTimeout(300);
const countDone = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#itTbody tr'));
  return rows.filter(r => !r.querySelector('td[colspan]')).length;
});
const expectedDone = await page.evaluate(() => dbIssues.filter(i => i.trangThai === 'Đã xử lý').length);
log('IT8-preset-done', countDone === expectedDone,
  `Preset "done" → ${countDone} rows (expected ${expectedDone})`);

// Preset: open
await page.evaluate(() => itSetPreset('open'));
await page.waitForTimeout(300);
const countOpen = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#itTbody tr'));
  return rows.filter(r => !r.querySelector('td[colspan]')).length;
});
const expectedOpen = await page.evaluate(() => dbIssues.filter(i => i.trangThai !== 'Đã xử lý').length);
log('IT8-preset-open', countOpen === expectedOpen,
  `Preset "open" → ${countOpen} rows (expected ${expectedOpen})`);

// preset-count badges
const pcOpen   = await page.$eval('#it-pcount-open',   el => el.textContent.trim());
const pcDone   = await page.$eval('#it-pcount-done',   el => el.textContent.trim());
const pcAll    = await page.$eval('#it-pcount-all',    el => el.textContent.trim());
log('IT8-pcount-open',   pcOpen   === String(expectedOpen),   `#it-pcount-open = "${pcOpen}"`);
log('IT8-pcount-done',   pcDone   === String(expectedDone),   `#it-pcount-done = "${pcDone}"`);
log('IT8-pcount-all',    pcAll    === String(allCount),       `#it-pcount-all  = "${pcAll}"`);

await shot(page, '08_it8_presets');

/* ══════════════════════════════════════════
   IT9 — FILTER BY SYSTEM + CLEAR
══════════════════════════════════════════ */
await page.evaluate(() => itSetPreset('all'));
await page.waitForTimeout(300);

await page.selectOption('#itFSystem', 'BIZ');
await page.waitForTimeout(300);
const bizRows = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#itTbody tr'))
    .filter(r => !r.querySelector('td[colspan]')).length;
});
const expectedBiz = await page.evaluate(() => dbIssues.filter(i => i.heTong === 'BIZ').length);
log('IT9-filter-biz', bizRows === expectedBiz,
  `Filter BIZ → ${bizRows} rows (expected ${expectedBiz})`);

// Clear filters restores full list
await page.evaluate(() => itClearFilters());
await page.waitForTimeout(300);
const afterClear = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#itTbody tr'))
    .filter(r => !r.querySelector('td[colspan]')).length;
});
log('IT9-clear-filters', afterClear === allCount,
  `clearFilters → ${afterClear} rows (expected ${allCount})`);

// Filter search text
await page.fill('#itFSearch', 'BPM');
await page.waitForTimeout(300);
const searchRows = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('#itTbody tr'))
    .filter(r => !r.querySelector('td[colspan]')).length;
});
const expectedSearch = await page.evaluate(() =>
  dbIssues.filter(i =>
    i.id.toLowerCase().includes('bpm') ||
    i.tieuDe.toLowerCase().includes('bpm') ||
    i.nguyenNhan.toLowerCase().includes('bpm')
  ).length
);
log('IT9-search-text', searchRows === expectedSearch,
  `Search "BPM" → ${searchRows} rows (expected ${expectedSearch})`);
await page.fill('#itFSearch', '');
await page.evaluate(() => itClearFilters());
await page.waitForTimeout(300);
await shot(page, '09_it9_filters');

/* ══════════════════════════════════════════
   IT10 — SLA BREACH: row-overdue + nav badge
══════════════════════════════════════════ */
await page.evaluate(() => itSetPreset('all'));
await page.waitForTimeout(300);

// IS-26-004 có deadline=yesterday, trangThai=Mới → phải có row-overdue
const breachRowExists = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#itTbody tr'));
  return rows.some(tr => tr.textContent.includes('IS-26-004') && tr.classList.contains('row-overdue'));
});
log('IT10-breach-row-overdue', breachRowExists,
  `IS-26-004 (deadline yesterday, not done) có class row-overdue = ${breachRowExists}`);

// IS-26-003 done → KHÔNG có row-overdue
const doneNoBreachRow = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#itTbody tr'));
  const doneRow = rows.find(tr => tr.textContent.includes('IS-26-003'));
  return doneRow ? !doneRow.classList.contains('row-overdue') : null;
});
log('IT10-done-no-row-overdue', doneNoBreachRow === true,
  `IS-26-003 (Đã xử lý) không có row-overdue = ${doneNoBreachRow}`);

// KPI breach stat = 1 (chỉ IS-26-004)
const breachStat = await page.$eval('#itStatBreach', el => parseInt(el.textContent) || 0);
const expectedBreach = await page.evaluate(() => {
  const today = new Date(); today.setHours(0,0,0,0);
  return dbIssues.filter(i => {
    if (i.trangThai === 'Đã xử lý' || !i.deadline) return false;
    const d = new Date(i.deadline); d.setHours(0,0,0,0);
    return d < today;
  }).length;
});
log('IT10-kpi-breach-stat', breachStat === expectedBreach,
  `#itStatBreach = ${breachStat} (expected ${expectedBreach})`);

// Nav badge visible + correct count
const navBadgeText    = await page.$eval('#navBadgeIssue', el => el.textContent.trim());
const navBadgeDisplay = await page.$eval('#navBadgeIssue', el => el.style.display);
log('IT10-nav-badge-count',   navBadgeText === String(expectedBreach),
  `#navBadgeIssue text = "${navBadgeText}" (expected "${expectedBreach}")`);
log('IT10-nav-badge-visible', navBadgeDisplay !== 'none',
  `#navBadgeIssue display = "${navBadgeDisplay}" (expected not "none")`);

// Preset breach
await page.evaluate(() => itSetPreset('breach'));
await page.waitForTimeout(300);
const breachPresetRows = await page.evaluate(() =>
  Array.from(document.querySelectorAll('#itTbody tr')).filter(r => !r.querySelector('td[colspan]')).length
);
log('IT10-preset-breach-count', breachPresetRows === expectedBreach,
  `Preset "breach" → ${breachPresetRows} rows (expected ${expectedBreach})`);
await shot(page, '10_it10_sla_breach');

/* ══════════════════════════════════════════
   IT11 — SORT
══════════════════════════════════════════ */
await page.evaluate(() => { itSetPreset('all'); itClearFilters(); });
await page.waitForTimeout(300);

// Sort by tieuDe asc
await page.evaluate(() => itSortBy('tieuDe'));
await page.waitForTimeout(300);
const titlesAsc = await page.evaluate(() =>
  Array.from(document.querySelectorAll('#itTbody tr td:nth-child(2)'))
    .map(td => td.textContent.trim()).filter(Boolean)
);
const isSortedAsc = titlesAsc.every((t, i) => i === 0 || titlesAsc[i-1].localeCompare(t, 'vi') <= 0);
log('IT11-sort-asc', isSortedAsc || titlesAsc.length <= 1,
  `Sort tieuDe asc → sorted=${isSortedAsc} (first 3: ${titlesAsc.slice(0,3).join(' | ')})`);

// Sort by tieuDe desc (click lại)
await page.evaluate(() => itSortBy('tieuDe'));
await page.waitForTimeout(300);
const titlesDesc = await page.evaluate(() =>
  Array.from(document.querySelectorAll('#itTbody tr td:nth-child(2)'))
    .map(td => td.textContent.trim()).filter(Boolean)
);
const isSortedDesc = titlesDesc.every((t, i) => i === 0 || titlesDesc[i-1].localeCompare(t, 'vi') >= 0);
log('IT11-sort-desc', isSortedDesc || titlesDesc.length <= 1,
  `Sort tieuDe desc → sorted=${isSortedDesc} (first 3: ${titlesDesc.slice(0,3).join(' | ')})`);

log('IT11-sort-reverses', JSON.stringify(titlesAsc) !== JSON.stringify(titlesDesc) || titlesAsc.length <= 1,
  `Asc ≠ Desc (order changed)`);
await shot(page, '11_it11_sort');

/* ══════════════════════════════════════════
   IT12 — DELETE ISSUE
══════════════════════════════════════════ */
await page.evaluate(() => { itSetPreset('all'); itSortBy('id'); });
await page.waitForTimeout(300);

const countBeforeDelete = await page.evaluate(() => dbIssues.length);

// Override uiConfirm → resolve true ngay lập tức (mock confirm)
await page.evaluate(() => {
  window._origUiConfirm = window.uiConfirm;
  window.uiConfirm = () => Promise.resolve(true);
});

// Xóa issue cuối cùng (test issue từ IT5)
await page.evaluate(() => {
  const last = dbIssues[dbIssues.length - 1];
  if (last) _itDeleteIssue(last.id);
});
await page.waitForTimeout(400);

const countAfterDelete = await page.evaluate(() => dbIssues.length);
log('IT12-delete-removes-issue', countAfterDelete === countBeforeDelete - 1,
  `dbIssues: ${countBeforeDelete} → ${countAfterDelete} sau xóa`);

// Row không còn trong bảng
const deletedStillInTable = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#itTbody tr'));
  return rows.some(tr => tr.textContent.includes('Test Issue Mới từ Playwright'));
});
log('IT12-row-removed-from-table', !deletedStillInTable,
  `"Test Issue Mới từ Playwright" còn trong bảng = ${deletedStillInTable} (expected false)`);

// Restore uiConfirm
await page.evaluate(() => { if (window._origUiConfirm) window.uiConfirm = window._origUiConfirm; });
await shot(page, '12_it12_delete');

/* ══════════════════════════════════════════
   ITX — KHÔNG CÓ JS ERRORS
══════════════════════════════════════════ */
const noJsErrors = jsErrors.length === 0;
log('ITX-no-js-errors', noJsErrors,
  noJsErrors ? 'Không có JS error trong suốt quá trình test'
             : `${jsErrors.length} JS error: ${jsErrors.slice(0,3).join(' | ')}`);

/* ══════════════════════════════════════════
   FINAL SUMMARY
══════════════════════════════════════════ */
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
