/**
 * verify_i18n_p7.mjs — i18n Phase 7: Gantt, AI Chat, Branch Analysis, User Management
 * Port: 3047
 * Run: node verify_i18n_p7.mjs
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3047;

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

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_USER = { username:'TuanTT4', role:'Admin', team:'Số', displayName:'Tuấn TT4' };

const MOCK_TASKS_NO_DATES = [
  { id:'IP7-T01', name:'Task No Dates', state:'Đang thực hiện', progress:'30', status:'Green',
    initiative:'', team:'Số', picRes:'TuanTT4', endDate:'', tuanBC:'', canBLD:'N',
    milestone:'', category:'', picAcc:'', noiDungBLD:'', yKienBLD:'', highlight:'N',
    startDate:'', vuongMac:'', nextPlan:'', result:'' },
];

const MOCK_UM_USERS = [
  { Username:'TuanTT4', Display_Name:'Tuấn TT4', Role:'Admin', Team:'Số',
    Email:'tuan@example.com', Active: true, Created_At:'2026-01-01', Last_Login:'2026-07-01' },
  { Username:'NguyenVA', Display_Name:'Nguyễn Văn A', Role:'User', Team:'BL',
    Email:'nguyen@example.com', Active: false, Created_At:'2026-02-01', Last_Login:'2026-06-01' },
];

// ── Inject helper ────────────────────────────────────────────────────────────
async function baseInject(page) {
  await page.evaluate(({ tasks, user }) => {
    db.tasks = tasks;
    db.initiatives = [];
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000, user
    }));
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch(e) {}
  }, { tasks: MOCK_TASKS_NO_DATES, user: MOCK_USER });
}

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else       { console.error(`  ❌ ${label}`); fail++; }
}

// ── Browser ──────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await baseInject(page);
await page.evaluate(() => { setLang('vi'); navigateTo('gantt'); });
await page.waitForTimeout(500);

// ── IP7-1: Gantt subtitle — VI ────────────────────────────────────────────────
console.log('\nIP7-1: Gantt subtitle in VI');
const ganttSubVI = await page.$eval('#ganttSubtitle', el => el.textContent.trim()).catch(() => '');
ok('Subtitle VI contains "Hiển thị tiến độ theo thời gian"',
  ganttSubVI.includes('Hiển thị tiến độ theo thời gian'));

// ── IP7-2: Gantt subtitle — EN ────────────────────────────────────────────────
console.log('\nIP7-2: Gantt subtitle in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const ganttSubEN = await page.$eval('#ganttSubtitle', el => el.textContent.trim()).catch(() => '');
ok('Subtitle EN contains "Timeline view"', ganttSubEN.includes('Timeline view'));

// ── IP7-3: Gantt empty state — VI ─────────────────────────────────────────────
console.log('\nIP7-3: Gantt empty state in VI');
await page.evaluate(() => { setLang('vi'); renderGantt(); });
await page.waitForTimeout(200);
const ganttEmptyVI = await page.$eval('#ganttWrap', el => el.textContent.trim()).catch(() => '');
ok('Empty VI contains "Không có task nào"', ganttEmptyVI.includes('Không có task nào'));

// ── IP7-4: Gantt empty state — EN ─────────────────────────────────────────────
console.log('\nIP7-4: Gantt empty state in EN');
await page.evaluate(() => { setLang('en'); renderGantt(); });
await page.waitForTimeout(200);
const ganttEmptyEN = await page.$eval('#ganttWrap', el => el.textContent.trim()).catch(() => '');
ok('Empty EN contains "No tasks with both"', ganttEmptyEN.includes('No tasks with both'));

// ── IP7-5: AI Chat header subtitle — VI ──────────────────────────────────────
console.log('\nIP7-5: AI Chat header subtitle in VI');
await page.evaluate(() => { setLang('vi'); navigateTo('ai-chat'); clearAiChat(); });
await page.waitForTimeout(400);
const aiSubVI = await page.$eval('.ai-chat-header-sub', el => el.textContent.trim()).catch(() => '');
ok('AI sub VI contains "Hỏi về task"', aiSubVI.includes('Hỏi về task'));

// ── IP7-6: AI Chat header subtitle — EN ──────────────────────────────────────
console.log('\nIP7-6: AI Chat header subtitle in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const aiSubEN = await page.$eval('.ai-chat-header-sub', el => el.textContent.trim()).catch(() => '');
ok('AI sub EN contains "Ask about tasks"', aiSubEN.includes('Ask about tasks'));

// ── IP7-7: AI Chat suggestions — VI ──────────────────────────────────────────
console.log('\nIP7-7: AI Chat suggestions in VI');
await page.evaluate(() => { setLang('vi'); renderAiChat(); });
await page.waitForTimeout(200);
const suggestBtnsVI = await page.$$eval('.ai-chat-suggestion', els => els.map(el => el.textContent.trim()));
ok('Suggest VI[0] contains "Blocked"', (suggestBtnsVI[0] || '').includes('Blocked'));
ok('Suggest VI[3] contains "hoàn thành"', (suggestBtnsVI[3] || '').includes('hoàn thành'));

// ── IP7-8: AI Chat suggestions — EN ──────────────────────────────────────────
console.log('\nIP7-8: AI Chat suggestions in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const suggestBtnsEN = await page.$$eval('.ai-chat-suggestion', els => els.map(el => el.textContent.trim()));
ok('Suggest EN[0] contains "Blocked"', (suggestBtnsEN[0] || '').includes('Blocked'));
ok('Suggest EN[3] contains "completed"', (suggestBtnsEN[3] || '').toLowerCase().includes('completed'));

// ── IP7-9: Branch zone tabs — VI ─────────────────────────────────────────────
console.log('\nIP7-9: Branch zone tabs in VI');
await page.evaluate(() => { setLang('vi'); navigateTo('branch-analysis'); });
await page.waitForTimeout(400);
const zoneBtnsVI = await page.$$eval('#branchAnalysisRoot .btn', els => els.map(el => el.textContent.trim()));
ok('Zone tab VI[0] includes "Tất cả"', (zoneBtnsVI[0] || '').includes('Tất cả'));
ok('Zone tab VI[1] includes "Miền Bắc"', (zoneBtnsVI[1] || '').includes('Miền Bắc'));
ok('Zone tab VI[2] includes "Miền Nam"', (zoneBtnsVI[2] || '').includes('Miền Nam'));

// ── IP7-10: Branch zone tabs — EN ────────────────────────────────────────────
console.log('\nIP7-10: Branch zone tabs in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const zoneBtnsEN = await page.$$eval('#branchAnalysisRoot .btn', els => els.map(el => el.textContent.trim()));
ok('Zone tab EN[0] includes "All"', (zoneBtnsEN[0] || '').includes('All'));
ok('Zone tab EN[1] includes "North Region"', (zoneBtnsEN[1] || '').includes('North Region'));
ok('Zone tab EN[2] includes "South Region"', (zoneBtnsEN[2] || '').includes('South Region'));

// ── IP7-11: Branch stat cards — VI ───────────────────────────────────────────
console.log('\nIP7-11: Branch stat cards in VI');
await page.evaluate(() => { setLang('vi'); });
await page.waitForTimeout(300);
const statCardsVI = await page.$$eval(
  '#branchAnalysisRoot .kpi-accent-card > div:first-child',
  els => els.map(el => el.textContent.trim())
);
ok('Stat VI[0] includes "Đạt KPI"', (statCardsVI[0] || '').includes('Đạt KPI'));
ok('Stat VI[1] includes "Chưa đạt KPI"', (statCardsVI[1] || '').includes('Chưa đạt KPI'));
ok('Stat VI[2] includes "Tổng chi nhánh"', (statCardsVI[2] || '').includes('Tổng chi nhánh'));

// ── IP7-12: Branch stat cards — EN ───────────────────────────────────────────
console.log('\nIP7-12: Branch stat cards in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const statCardsEN = await page.$$eval(
  '#branchAnalysisRoot .kpi-accent-card > div:first-child',
  els => els.map(el => el.textContent.trim())
);
ok('Stat EN[0] includes "Met KPI"', (statCardsEN[0] || '').includes('Met KPI'));
ok('Stat EN[1] includes "Below KPI"', (statCardsEN[1] || '').includes('Below KPI'));
ok('Stat EN[2] includes "Total Branches"', (statCardsEN[2] || '').includes('Total Branches'));

// ── Setup: Inject UM users before navigating ──────────────────────────────────
// _umUsers is a script-scope let — mutate the array directly (window._umUsers is a different binding)
await page.evaluate(({ users }) => { _umUsers.length = 0; _umUsers.push(...users); }, { users: MOCK_UM_USERS });

// ── IP7-13: UM filter status options — VI ────────────────────────────────────
console.log('\nIP7-13: UM filter status options in VI');
await page.evaluate(async () => { setLang('vi'); navigateTo('user-management'); });
await page.waitForTimeout(500);
const umStatusOptsVI = await page.$$eval(
  '#umFilterStatus option', els => els.map(el => el.textContent.trim())
);
ok('UM status opt VI[1] = "Hoạt động"', umStatusOptsVI[1] === 'Hoạt động');
ok('UM status opt VI[2] = "Đã khóa"', umStatusOptsVI[2] === 'Đã khóa');

// ── IP7-14: UM filter status options — EN ────────────────────────────────────
console.log('\nIP7-14: UM filter status options in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const umStatusOptsEN = await page.$$eval(
  '#umFilterStatus option', els => els.map(el => el.textContent.trim())
);
ok('UM status opt EN[1] = "Active"', umStatusOptsEN[1] === 'Active');
ok('UM status opt EN[2] = "Inactive"', umStatusOptsEN[2] === 'Inactive');

// ── IP7-15: UM table empty state — VI ────────────────────────────────────────
console.log('\nIP7-15: UM empty state in VI');
await page.evaluate(() => {
  setLang('vi');
  _umSearch = 'xxxxxxxxxxxxxxxxxxx';
  _umPage = 1;
  _umRender();
});
await page.waitForTimeout(200);
const umEmptyVI = await page.$eval('#umTableWrap', el => el.textContent.trim()).catch(() => '');
ok('UM empty VI contains "Không tìm thấy"', umEmptyVI.includes('Không tìm thấy'));

// ── IP7-16: UM table empty state — EN ────────────────────────────────────────
console.log('\nIP7-16: UM empty state in EN');
await page.evaluate(() => { setLang('en'); _umRender(); });
await page.waitForTimeout(200);
const umEmptyEN = await page.$eval('#umTableWrap', el => el.textContent.trim()).catch(() => '');
ok('UM empty EN contains "No users found"', umEmptyEN.includes('No users found'));

// ── IP7-17: UM status badge — VI ─────────────────────────────────────────────
console.log('\nIP7-17: UM status badges in VI');
await page.evaluate(() => {
  _umSearch = '';
  _umPage = 1;
  setLang('vi');   // renderAll → renderUserManagement with _umSearch='' → shows all users
});
await page.waitForTimeout(300);
const activeBadgeVI   = await page.$eval('#umTableWrap .um-status.active',   el => el.textContent.trim()).catch(() => '');
const inactiveBadgeVI = await page.$eval('#umTableWrap .um-status.inactive', el => el.textContent.trim()).catch(() => '');
ok('Active badge VI contains "Hoạt động"', activeBadgeVI.includes('Hoạt động'));
ok('Inactive badge VI contains "Đã khóa"', inactiveBadgeVI.includes('Đã khóa'));

// ── IP7-18: UM status badge — EN ─────────────────────────────────────────────
console.log('\nIP7-18: UM status badges in EN');
await page.evaluate(() => { setLang('en'); }); // _umSearch still '' → shows all users with EN labels
await page.waitForTimeout(300);
const activeBadgeEN   = await page.$eval('#umTableWrap .um-status.active',   el => el.textContent.trim()).catch(() => '');
const inactiveBadgeEN = await page.$eval('#umTableWrap .um-status.inactive', el => el.textContent.trim()).catch(() => '');
ok('Active badge EN contains "Active"', activeBadgeEN.includes('Active'));
ok('Inactive badge EN contains "Inactive"', inactiveBadgeEN.includes('Inactive'));

// ── IP7-19: renderAll() live switch on Gantt ──────────────────────────────────
console.log('\nIP7-19: renderAll() live switch on Gantt');
await page.evaluate(() => { setLang('vi'); navigateTo('gantt'); });
await page.waitForTimeout(400);
const ganttSubBefore = await page.$eval('#ganttSubtitle', el => el.textContent.trim()).catch(() => '');
ok('Gantt subtitle VI before switch', ganttSubBefore.includes('Hiển thị tiến độ'));
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const ganttSubAfter = await page.$eval('#ganttSubtitle', el => el.textContent.trim()).catch(() => '');
ok('Gantt subtitle EN after setLang switch', ganttSubAfter.includes('Timeline view'));

// ── IP7-20: No JS errors ──────────────────────────────────────────────────────
console.log('\nIP7-20: No JS errors');
ok('Zero console errors', errors.length === 0);
if (errors.length) errors.forEach(e => console.error('   JS Error:', e));

// ── Teardown ──────────────────────────────────────────────────────────────────
await browser.close();
server.close();

const total = pass + fail;
console.log(`\n─────────────────────────────────────────────────`);
console.log(`verify_i18n_p7  ${pass}/${total}  ${fail === 0 ? 'PASS' : 'FAIL'}`);
if (fail > 0) process.exit(1);
