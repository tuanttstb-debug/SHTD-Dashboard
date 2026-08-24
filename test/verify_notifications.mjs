/**
 * verify_notifications.mjs  —  S57 Notification bell smoke tests
 *
 *  NT1  – HTML structure: bell button, panel, badge exist
 *  NT2  – Badge shows unread count; hidden when 0
 *  NT3  – Toggle panel open/close
 *  NT4  – Grouped rendering (overdue / today / soon / created / closed)
 *  NT5  – Item text: entity label + title + suffix
 *  NT6  – Click task noti → deep-link opens Task popup + marks read (badge decrements)
 *  NT7  – Click case noti → deep-link opens Case popup
 *  NT8  – Mark all read → badge hidden, unread = 0
 *  NT9  – i18n EN switch: panel title + mark-all label translate
 *  NT10 – ESC closes panel
 *  NTX  – No JS errors throughout
 *
 * Run: node verify_notifications.mjs
 * EVD: test-results/notifications/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3045;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'notifications');

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
const ISO = new Date().toISOString();

const MOCK_TASKS = [
  { id:'T-1', name:'Task Alpha', initiative:'BAU', team:'Số', category:'',
    picAcc:'TuanTT4', picRes:'TuanTT4', startDate:'2026-07-01', endDate:'2026-07-20',
    progress:0, status:'Red', state:'Đang thực hiện' },
];
const MOCK_CASES = [
  { id:'CP-1', caseName:'Case Beta', tuanBC:'T1', team:'PTKD MB', pic:'TuanTT4',
    stage:'Đang phân tích', startDate:'2026-07-25', deadline:'2026-08-02', giaTriTy:'10' },
];
const MOCK_ISSUES = [
  { id:'IS-26-001', tieuDe:'Issue Gamma', heTong:'BIZ', mucDo:'High', loaiXuLy:'',
    trangThai:'Mới', deadline:'2026-08-05', nguoiXuLy:'TuanTT4', nguoiLog:'TuanTT4' },
];
const MOCK_INITS = [
  { id:'SCF-001', name:'Initiative Delta', category:'CV', accountable:'TuanTT4',
    startDate:'2026-01-01', deadline:'2026-08-04', pct:20, status:'Active', type:'initiative', parentId:null },
];
const MOCK_DEV = [
  { id:'DEV-26-001', name:'Dev Item Eps', target:'x', pic:'TuanTT4', coordUnit:'',
    startDate:'2026-07-01', endDate:'2026-08-05', state:'Đang thực hiện', progress:'30',
    note:'', lastReview: ISO, createdBy:'TuanTT4' },
];

const MOCK_NOTIFS = [
  { id:'n1', type:'overdue',   entityType:'task',       entityId:'T-1',        title:'Task Alpha',      dueDate:'2026-07-20', message:'[Task] ⚠️ Đã quá hạn', createdTs: ISO, read:false },
  { id:'n2', type:'due-today', entityType:'case',       entityId:'CP-1',       title:'Case Beta',       dueDate:'2026-08-02', message:'[Case] 🔥 Đến hạn',   createdTs: ISO, read:false },
  { id:'n3', type:'due-3d',    entityType:'dev',        entityId:'DEV-26-001', title:'Dev Item Eps',    dueDate:'2026-08-05', message:'[Dev Plan] ⏰',       createdTs: ISO, read:false },
  { id:'n4', type:'created',   entityType:'issue',      entityId:'IS-26-001',  title:'Issue Gamma',     dueDate:'',           message:'[Issue] 🆕',         createdTs: ISO, read:true  },
  { id:'n5', type:'closed',    entityType:'initiative', entityId:'SCF-001',    title:'Initiative Delta',dueDate:'',           message:'[Initiative] ✅',    createdTs: ISO, read:true  },
];

const MOCK_USER = { username:'TuanTT4', role:'Admin', team:'Số', displayName:'Tuấn TT' };

/* ════════════════════════════════════════ */
const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

// Cách ly khỏi Google Apps Script thật.
await page.route('**://script.google.com/**', route => route.abort());

console.log('\n══════════════════════════════════════════════');
console.log('  S57 Notifications — Playwright EVD');
console.log('══════════════════════════════════════════════\n');

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(500);

/* ── Inject mock data + auth ── */
await page.evaluate(({ tasks, cases, issues, inits, dev, notifs, user }) => {
  window.readNotifications = async () => {};   // chặn clobber từ network
  db.tasks = tasks; db.initiatives = inits; db.deletedIds = [];
  dbCases = cases; dbIssues = issues; dbDev = dev; dbNotifs = notifs;
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'mock-token', exp: Date.now() + 86400000, user
  }));
  const lo = document.getElementById('loginOverlay');
  if (lo) lo.style.display = 'none';
  try { setupListeners(); } catch(e) {}
  renderNotifBell();
}, { tasks: MOCK_TASKS, cases: MOCK_CASES, issues: MOCK_ISSUES, inits: MOCK_INITS, dev: MOCK_DEV, notifs: MOCK_NOTIFS, user: MOCK_USER });

await page.waitForTimeout(300);

/* ── NT1 — STRUCTURE ── */
log('NT1-btn',    !!(await page.$('#notifBtn')),   '#notifBtn tồn tại');
log('NT1-panel',  !!(await page.$('#notifPanel')), '#notifPanel tồn tại');
log('NT1-badge',  !!(await page.$('#notifBadge')), '#notifBadge tồn tại');
await shot(page, '01_bell');

/* ── NT2 — BADGE COUNT ── */
const badgeTxt = await page.$eval('#notifBadge', el => el.textContent);
const badgeVis = await page.$eval('#notifBadge', el => el.style.display !== 'none');
log('NT2-count', badgeTxt === '3', `Badge = ${badgeTxt} (expected 3 chưa đọc)`);
log('NT2-visible', badgeVis, 'Badge hiển thị khi có chưa đọc');

/* ── NT3 — TOGGLE OPEN ── */
await page.click('#notifBtn');
await page.waitForTimeout(200);
log('NT3-open', await page.$eval('#notifPanel', el => el.style.display === 'flex'), 'Panel mở khi click chuông');
await shot(page, '02_panel_open');

/* ── NT4 — GROUPED ── */
const groupTitles = await page.$$eval('.notif-group-title', els => els.map(e => e.textContent));
log('NT4-groups', groupTitles.length === 5, `5 nhóm hiển thị (thực tế ${groupTitles.length})`);
const itemCount = await page.$$eval('.notif-item', els => els.length);
log('NT4-items', itemCount === 5, `5 item hiển thị (thực tế ${itemCount})`);

/* ── NT5 — ITEM TEXT ── */
const firstText = await page.$eval('.notif-item', el => el.textContent);
log('NT5-label', firstText.includes('[Task]'), `Item chứa nhãn entity: "${firstText.trim().slice(0, 40)}…"`);
log('NT5-title', firstText.includes('Task Alpha'), 'Item chứa tiêu đề công việc');
log('NT5-suffix', firstText.toLowerCase().includes('quá hạn'), 'Item chứa hậu tố trạng thái (quá hạn)');

/* ── NT6 — CLICK TASK → DEEP-LINK + MARK READ ── */
await page.click('.notif-item'); // n1 = overdue task (first)
await page.waitForTimeout(250);
const taskTitle = await page.$eval('#taskViewTitle', el => el.textContent).catch(() => '');
log('NT6-deeplink', taskTitle === 'Task Alpha', `Popup Task mở đúng: "${taskTitle}"`);
log('NT6-panel-closed', await page.$eval('#notifPanel', el => el.style.display === 'none'), 'Panel đóng sau khi click');
const badgeAfter = await page.$eval('#notifBadge', el => el.textContent);
log('NT6-badge-dec', badgeAfter === '2', `Badge giảm còn ${badgeAfter} (expected 2)`);
await page.evaluate(() => { if (typeof closeTaskViewPopup === 'function') closeTaskViewPopup(); });
await shot(page, '03_task_deeplink');

/* ── NT7 — CLICK CASE → DEEP-LINK ── */
await page.click('#notifBtn'); // reopen
await page.waitForTimeout(200);
// click the case item (due-today group) by matching text
await page.evaluate(() => {
  const el = [...document.querySelectorAll('.notif-item')].find(e => e.textContent.includes('Case Beta'));
  if (el) el.click();
});
await page.waitForTimeout(250);
const caseTitle = await page.$eval('#cpViewTitle', el => el.textContent).catch(() => '');
log('NT7-case-deeplink', caseTitle === 'Case Beta', `Popup Case mở đúng: "${caseTitle}"`);
await page.evaluate(() => { if (typeof closeCaseViewPopup === 'function') closeCaseViewPopup(); });

/* ── NT8 — MARK ALL READ ── */
await page.click('#notifBtn'); // reopen
await page.waitForTimeout(150);
await page.click('#notifMarkAll');
await page.waitForTimeout(200);
const unreadAfter = await page.evaluate(() => dbNotifs.filter(n => !n.read).length);
log('NT8-all-read', unreadAfter === 0, `Sau "đánh dấu tất cả": còn ${unreadAfter} chưa đọc (expected 0)`);
const badgeHidden = await page.$eval('#notifBadge', el => el.style.display === 'none');
log('NT8-badge-hidden', badgeHidden, 'Badge ẩn khi hết chưa đọc');
await shot(page, '04_all_read');

/* ── NT9 — i18n EN ── */
await page.evaluate(() => setLang('en'));
await page.waitForTimeout(200);
const headTitle = await page.$eval('.notif-panel-head span[data-i18n="notif.title"]', el => el.textContent);
log('NT9-title-en', headTitle === 'Notifications', `Tiêu đề panel EN = "${headTitle}"`);
const markAllEn = await page.$eval('#notifMarkAll', el => el.textContent);
log('NT9-markall-en', markAllEn === 'Mark all read', `Nút mark-all EN = "${markAllEn}"`);
await page.evaluate(() => setLang('vi'));
await page.waitForTimeout(150);

/* ── NT10 — ESC CLOSES ── */
await page.click('#notifBtn'); // open
await page.waitForTimeout(150);
await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true })));
await page.waitForTimeout(150);
log('NT10-esc', await page.$eval('#notifPanel', el => el.style.display === 'none'), 'ESC đóng panel');

/* ── NTX — NO JS ERRORS ── */
log('NTX-no-errors', jsErrors.length === 0, jsErrors.length ? `JS errors: ${jsErrors.join(' | ')}` : 'Không có JS error');

/* ════════════════════════════════════════ */
console.log('\n──────────────────────────────────────────────');
console.log(`  ${passed}/${passed + failed} PASS` + (failed ? `  (${failed} FAIL)` : ''));
console.log('──────────────────────────────────────────────\n');

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
