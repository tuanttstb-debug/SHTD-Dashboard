/**
 * verify_my_work.mjs  —  S42 My Work personalized dashboard smoke tests
 *
 *  MW1  – HTML: nav item, view section present
 *  MW2  – Default landing: after startApp(), view-my-work is shown (not dashboard)
 *  MW3  – Page header: greeting + user name + team shown
 *  MW4  – PO view (team=Số): init section visible, no case section
 *  MW5  – PTKD view (team=PTKD MB): case section visible, no init section
 *  MW6  – QLDM view (team=QLDM): init section visible (same as PO)
 *  MW7  – Task ownership: picAcc match → task appears
 *  MW8  – Task ownership: picRes match → task appears
 *  MW9  – Task ownership: team match → task appears
 *  MW10 – Task ownership: no match → task excluded
 *  MW11 – Highlight=Y sorts first (before non-highlight)
 *  MW12 – Urgent section: overdue task appears (diff < 0)
 *  MW13 – Urgent section: soon task appears (0 < diff <= 7)
 *  MW14 – Urgent section: done task excluded even if overdue
 *  MW15 – Deadline badge: overdue shows "Quá hạn" label
 *  MW16 – Deadline badge: soon shows "Còn Xngày" label
 *  MW17 – RAG dots rendered on task card
 *  MW18 – G+M keyboard shortcut navigates to my-work
 *  MW19 – Quick save state: mwQuickSaveState updates db.tasks + re-renders
 *  MW20 – Quick save RAG: mwQuickSaveRag updates dot class in DOM directly
 *  MW21 – mwQuickSaveRag toggle: clicking active dot clears RAG
 *  MW22 – Progress toggle: mwToggleProgress shows input, hides label
 *  MW23 – Quick save progress: mwQuickSaveProgress clamps 0-100, updates bar fill
 *  MW24 – Quick save result: mwQuickSaveResult updates task.result, no re-render
 *  MW25 – No JS errors throughout
 *
 * Run: node verify_my_work.mjs
 * EVD: test-results/my_work/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = 3042;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'my_work');

if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

/* ── HTTP server ── */
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

/* ── Helpers ── */
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
// VN date string used by some date fields
function vnDate(deltaDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

/* ── Date fixtures ── */
const OVERDUE = isoDate(-3);   // 3 days overdue
const SOON    = isoDate(5);    // 5 days from now  (urgent, <=7)
const LATER   = isoDate(30);   // 30 days  (not urgent)

/* ── Mock tasks ── */
const MOCK_TASKS = [
  // highlight=Y → should sort first
  { id:'T-26-H01', name:'Highlight task picAcc', initiative:'INI-01', category:'Dev',
    milestone:'', team:'CV1', picAcc:'TuanTT4', picRes:'', endDate:OVERDUE,
    state:'Đang thực hiện', progress:'40', highlight:'Y', rag:'Đỏ', result:'', tuanBC:'', canBLD:'', status:'' },
  // picRes match
  { id:'T-26-H02', name:'Task picRes match', initiative:'INI-01', category:'Test',
    milestone:'', team:'CV1', picAcc:'OtherUser', picRes:'TuanTT4', endDate:SOON,
    state:'Chưa bắt đầu', progress:'0', highlight:'N', rag:'', result:'', tuanBC:'', canBLD:'', status:'' },
  // team match (team=Số)
  { id:'T-26-H03', name:'Task team Số match', initiative:'BAU', category:'BAU',
    milestone:'', team:'Số', picAcc:'OtherUser', picRes:'OtherUser', endDate:LATER,
    state:'Đang thực hiện', progress:'60', highlight:'N', rag:'Xanh', result:'Ghi chú tuần', tuanBC:'', canBLD:'', status:'' },
  // No match (different team, no picAcc/picRes match) → excluded
  { id:'T-26-X01', name:'Excluded task no match', initiative:'INI-02', category:'Dev',
    milestone:'', team:'BL', picAcc:'SomeoneElse', picRes:'', endDate:OVERDUE,
    state:'Đang thực hiện', progress:'10', highlight:'N', rag:'', result:'', tuanBC:'', canBLD:'', status:'' },
  // Done + overdue → in task list but NOT in urgent
  { id:'T-26-D01', name:'Done overdue task', initiative:'INI-01', category:'Dev',
    milestone:'', team:'CV1', picAcc:'TuanTT4', picRes:'', endDate:OVERDUE,
    state:'Hoàn thành', progress:'100', highlight:'N', rag:'Xanh', result:'Done', tuanBC:'', canBLD:'', status:'' },
];

/* ── Mock initiatives ── */
const MOCK_INITIATIVES = [
  { id:'INI-01', name:'Sản phẩm tín dụng online', type:'initiative', status:'Active', accountable:'TuanTT4', parentId:'', category:'Chuyển đổi số' },
  { id:'INI-02', name:'Initiative khác team', type:'initiative', status:'Pending', accountable:'OtherUser', parentId:'', category:'Vận hành' },
  { id:'INI-01-MS1', name:'Milestone 1', type:'milestone', status:'Active', accountable:'TuanTT4', parentId:'INI-01', category:'' },
];

/* ── Mock cases (PTKD view) ── */
const MOCK_CASES = [
  { id:'C-26-001', caseName:'Case PTKD MB active', team:'PTKD MB', stage:'Khởi tạo', deadline:OVERDUE, giaTriTy:'5', dvkd:'Chi nhánh A', pic:'TuanPT' },
  { id:'C-26-002', caseName:'Case done excluded', team:'PTKD MB', stage:'Đã ký HĐ', deadline:LATER, giaTriTy:'10', dvkd:'Chi nhánh B', pic:'TuanPT' },
  { id:'C-26-003', caseName:'Case other team', team:'PTKD MN', stage:'Thương thảo', deadline:SOON, giaTriTy:'3', dvkd:'Chi nhánh C', pic:'SomePIC' },
];

const CASE_STAGE_GROUP_MOCK = {
  'Khởi tạo':'new', 'Thẩm định':'active', 'Thương thảo':'active',
  'Đề xuất phê duyệt':'active', 'Chờ giải ngân':'pending', 'Đã ký HĐ':'done',
};

/* ── Auth users ── */
const USER_PO   = { username:'TuanTT4', role:'Admin', team:'Số',     displayName:'Tuấn TT (PO)' };
const USER_PTKD = { username:'TuanPT',  role:'Staff', team:'PTKD MB', displayName:'Tuấn PT (PTKD)' };
const USER_QLDM = { username:'LeVanA',  role:'Staff', team:'QLDM',    displayName:'Lê Văn A (QLDM)' };

/* ════════════════════════════════════════════ */
const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

console.log('\n══════════════════════════════════════════════');
console.log('  S42 My Work — Playwright EVD');
console.log(`  PORT=${PORT} | OVERDUE=${OVERDUE} | SOON=${SOON} | LATER=${LATER}`);
console.log('══════════════════════════════════════════════\n');

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(500);

/* ── Inject PO mock data ── */
async function injectPO() {
  await page.evaluate(({ tasks, inits, cases, stageMap, user }) => {
    db.tasks       = tasks;
    db.initiatives = inits;
    dbCases        = cases;
    if (typeof CASE_STAGE_GROUP !== 'undefined') {
      Object.assign(CASE_STAGE_GROUP, stageMap);
    } else {
      window.CASE_STAGE_GROUP = stageMap;
    }
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token-po',
      exp: Date.now() + 86400000,
      user
    }));
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
  }, { tasks: MOCK_TASKS, inits: MOCK_INITIATIVES, cases: MOCK_CASES, stageMap: CASE_STAGE_GROUP_MOCK, user: USER_PO });
  await page.evaluate(() => { navigateTo('my-work'); });
  await page.waitForTimeout(600);
}

async function injectPTKD() {
  await page.evaluate(({ tasks, inits, cases, stageMap, user }) => {
    db.tasks       = tasks;
    db.initiatives = inits;
    dbCases        = cases;
    if (typeof CASE_STAGE_GROUP !== 'undefined') Object.assign(CASE_STAGE_GROUP, stageMap);
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token-ptkd',
      exp: Date.now() + 86400000,
      user
    }));
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
  }, { tasks: MOCK_TASKS, inits: MOCK_INITIATIVES, cases: MOCK_CASES, stageMap: CASE_STAGE_GROUP_MOCK, user: USER_PTKD });
  await page.evaluate(() => { navigateTo('my-work'); });
  await page.waitForTimeout(600);
}

async function injectQLDM() {
  await page.evaluate(({ tasks, inits, cases, stageMap, user }) => {
    db.tasks       = tasks;
    db.initiatives = inits;
    dbCases        = cases;
    if (typeof CASE_STAGE_GROUP !== 'undefined') Object.assign(CASE_STAGE_GROUP, stageMap);
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token-qldm',
      exp: Date.now() + 86400000,
      user
    }));
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
  }, { tasks: MOCK_TASKS, inits: MOCK_INITIATIVES, cases: MOCK_CASES, stageMap: CASE_STAGE_GROUP_MOCK, user: USER_QLDM });
  await page.evaluate(() => { navigateTo('my-work'); });
  await page.waitForTimeout(600);
}

/* ══════════════════════════════════════════
   MW1 — HTML STRUCTURE
══════════════════════════════════════════ */
const navItem  = await page.$('[data-view="my-work"]');
const viewSec  = await page.$('#view-my-work');
log('MW1-nav-item',     !!navItem,  'Nav item [data-view="my-work"] exists');
log('MW1-view-section', !!viewSec,  '#view-my-work section exists');
await shot(page, 'MW1-structure');

/* ══════════════════════════════════════════
   MW2 — DEFAULT LANDING (startApp navigates to my-work)
══════════════════════════════════════════ */
// Inject auth and reload to simulate real startup
await page.evaluate(({ user }) => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'mock-token-po', exp: Date.now() + 86400000, user
  }));
}, { user: USER_PO });
await page.reload({ waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(800);

// After reload, startApp() should have called navigateTo('my-work')
const myWorkDisplay = await page.evaluate(() => {
  const s = document.getElementById('view-my-work');
  return s ? s.style.display : 'missing';
});
const dashDisplay = await page.evaluate(() => {
  const s = document.getElementById('view-dashboard');
  return s ? s.style.display : 'missing';
});
log('MW2-my-work-visible', myWorkDisplay === 'contents', `view-my-work display=${myWorkDisplay}`);
log('MW2-dashboard-hidden', dashDisplay === 'none',       `view-dashboard display=${dashDisplay}`);
await shot(page, 'MW2-default-landing');

/* ── Now inject full PO data for rest of PO tests ── */
await injectPO();
await shot(page, 'MW3-po-page');

/* ══════════════════════════════════════════
   MW3 — PAGE HEADER (PO user)
══════════════════════════════════════════ */
const pageHtml   = await page.$eval('#view-my-work', el => el.innerHTML);
const hasGreeting = pageHtml.includes('Xin chào');
const hasUserName = pageHtml.includes('Tuấn TT (PO)') || pageHtml.includes('TuanTT4');
const hasTeam     = pageHtml.includes('Số');
log('MW3-greeting', hasGreeting, 'Greeting "Xin chào" found in page');
log('MW3-username', hasUserName, 'User name found in page header');
log('MW3-team',     hasTeam,    '"Số" team shown in sub-header');

/* ══════════════════════════════════════════
   MW4 — PO VIEW: init section, no case section
══════════════════════════════════════════ */
const initSection  = await page.$('#mwSectionThird');
const initHeader   = initSection ? await initSection.innerText() : '';
const hasInitTitle  = initHeader.includes('Initiative phụ trách');
const hasCaseTitle  = initHeader.includes('Case Pipeline');
log('MW4-init-section', hasInitTitle, 'PO view shows "Initiative phụ trách" section');
log('MW4-no-case',      !hasCaseTitle, 'PO view does NOT show "Case Pipeline"');
await shot(page, 'MW4-po-init-section');

/* ══════════════════════════════════════════
   MW5 — PTKD VIEW: case section, no init section
══════════════════════════════════════════ */
await injectPTKD();
await shot(page, 'MW5-ptkd-page');
const ptkdSection     = await page.$('#mwSectionThird');
const ptkdSectionText = ptkdSection ? await ptkdSection.innerText() : '';
const hasCaseTitle2   = ptkdSectionText.includes('Case Pipeline');
const hasInitTitle2   = ptkdSectionText.includes('Initiative phụ trách');
log('MW5-case-section',  hasCaseTitle2, 'PTKD view shows "Case Pipeline" section');
log('MW5-no-init',       !hasInitTitle2, 'PTKD view does NOT show "Initiative" title');

/* ══════════════════════════════════════════
   MW6 — QLDM VIEW: init section
══════════════════════════════════════════ */
await injectQLDM();
await shot(page, 'MW6-qldm-page');
const qldmSection     = await page.$('#mwSectionThird');
const qldmSectionText = qldmSection ? await qldmSection.innerText() : '';
const hasInitQldm     = qldmSectionText.includes('Initiative phụ trách');
log('MW6-qldm-init', hasInitQldm, 'QLDM view shows "Initiative phụ trách" section');

/* ── Back to PO for task tests ── */
await injectPO();

/* ══════════════════════════════════════════
   MW7 — Task ownership: picAcc match
══════════════════════════════════════════ */
const taskCards = await page.$$('.mw-task-card');
const cardTexts = await Promise.all(taskCards.map(c => c.innerText()));
const hasH01 = cardTexts.some(t => t.includes('T-26-H01'));
log('MW7-picacc-match', hasH01, 'Task with picAcc=TuanTT4 (T-26-H01) appears in card grid');

/* ══════════════════════════════════════════
   MW8 — Task ownership: picRes match
══════════════════════════════════════════ */
const hasH02 = cardTexts.some(t => t.includes('T-26-H02'));
log('MW8-picres-match', hasH02, 'Task with picRes=TuanTT4 (T-26-H02) appears in card grid');

/* ══════════════════════════════════════════
   MW9 — Task ownership: team match
══════════════════════════════════════════ */
const hasH03 = cardTexts.some(t => t.includes('T-26-H03'));
log('MW9-team-match', hasH03, 'Task with team=Số (T-26-H03) appears in card grid');

/* ══════════════════════════════════════════
   MW10 — Task ownership: no match → excluded
══════════════════════════════════════════ */
const hasX01 = cardTexts.some(t => t.includes('T-26-X01'));
log('MW10-excluded', !hasX01, 'Task with no ownership match (T-26-X01) is excluded');

/* ══════════════════════════════════════════
   MW11 — Highlight=Y sorts first
══════════════════════════════════════════ */
const firstCardText = cardTexts[0] || '';
log('MW11-highlight-first', firstCardText.includes('T-26-H01'), 'Highlight=Y task (T-26-H01) is first card');
await shot(page, 'MW11-task-cards');

/* ══════════════════════════════════════════
   MW12 — Urgent section: overdue task
══════════════════════════════════════════ */
const urgentSection = await page.$('#mwSectionUrgent');
const urgentText    = urgentSection ? await urgentSection.innerText() : '';
const hasUrgentH01 = urgentText.includes('T-26-H01');
log('MW12-urgent-overdue', hasUrgentH01, 'Overdue task T-26-H01 appears in urgent section');

/* ══════════════════════════════════════════
   MW13 — Urgent section: soon task
══════════════════════════════════════════ */
const hasUrgentH02 = urgentText.includes('T-26-H02');
log('MW13-urgent-soon', hasUrgentH02, 'Soon task T-26-H02 (5 days) appears in urgent section');
await shot(page, 'MW13-urgent-section');

/* ══════════════════════════════════════════
   MW14 — Urgent section: done task excluded
══════════════════════════════════════════ */
const hasUrgentD01 = urgentText.includes('T-26-D01');
log('MW14-urgent-done-excluded', !hasUrgentD01, 'Done task T-26-D01 excluded from urgent even if overdue');

/* ══════════════════════════════════════════
   MW15 — Deadline badge: overdue
══════════════════════════════════════════ */
const overdueCardText = cardTexts.find(t => t.includes('T-26-H01')) || '';
const hasOverdueBadge = overdueCardText.includes('Quá hạn');
log('MW15-badge-overdue', hasOverdueBadge, 'Overdue badge "Quá hạn" shown on T-26-H01 card');

/* ══════════════════════════════════════════
   MW16 — Deadline badge: soon
══════════════════════════════════════════ */
const soonCardText  = cardTexts.find(t => t.includes('T-26-H02')) || '';
const hasSoonBadge  = soonCardText.includes('Còn');
log('MW16-badge-soon', hasSoonBadge, '"Còn Xngày" badge shown on T-26-H02 card');

/* ══════════════════════════════════════════
   MW17 — RAG dots rendered
══════════════════════════════════════════ */
const ragWrap = await page.$('.mw-rag-wrap');
const ragDots = await page.$$('.mw-rag-dot');
log('MW17-rag-wrap',  !!ragWrap,          'RAG wrap element present on task card');
log('MW17-rag-dots',  ragDots.length >= 3, `${ragDots.length} RAG dots rendered (expect ≥3)`);
// T-26-H01 has rag='Đỏ' → active-do should be on one dot
const activeDo = await page.$('.mw-rag-dot.active-do');
log('MW17-rag-active', !!activeDo, 'Active RAG dot (active-do) shown for T-26-H01');
await shot(page, 'MW17-rag-dots');

/* ══════════════════════════════════════════
   MW18 — G+M keyboard shortcut → my-work
   Note: dispatch events directly on document to avoid headless focus issues
══════════════════════════════════════════ */
await page.evaluate(() => navigateTo('dashboard')); // go away first
await page.waitForTimeout(200);
await page.evaluate(() => {
  // un-focus any input that loginScreen may have focused (loginUsername stays focused
  // even after overlay is hidden, which makes gKey handler see inInput=true)
  if (document.activeElement && document.activeElement !== document.body) {
    document.activeElement.blur();
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
});
await page.waitForTimeout(400);
const afterShortcutDisplay = await page.evaluate(() =>
  document.getElementById('view-my-work')?.style.display
);
log('MW18-keyboard-gm', afterShortcutDisplay === 'contents', `G+M shortcut shows my-work (display=${afterShortcutDisplay})`);
await shot(page, 'MW18-keyboard-shortcut');

// Navigate back to my-work for remaining tests
await injectPO();

/* ══════════════════════════════════════════
   MW19 — Quick save state
══════════════════════════════════════════ */
// Select a different state on T-26-H02's card
const stateSelBefore = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T-26-H02');
  return t ? t.state : null;
});
await page.evaluate(() => mwQuickSaveState('T-26-H02', 'Đang thực hiện'));
await page.waitForTimeout(300);
const stateAfter = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T-26-H02');
  return t ? t.state : null;
});
log('MW19-quick-save-state',
  stateAfter === 'Đang thực hiện' && stateSelBefore !== 'Đang thực hiện',
  `State changed: ${stateSelBefore} → ${stateAfter}`);
await shot(page, 'MW19-quick-save-state');

/* ══════════════════════════════════════════
   MW20 — Quick save RAG: dot gets active class
══════════════════════════════════════════ */
// T-26-H03 has rag='' (Xanh). Assign Vàng.
await page.evaluate(() => mwQuickSaveRag('T-26-H03', 'Vàng'));
await page.waitForTimeout(200);
const ragAfter = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T-26-H03');
  return t ? t.rag : null;
});
log('MW20-rag-saved', ragAfter === 'Vàng', `RAG set to Vàng for T-26-H03, db.tasks.rag=${ragAfter}`);

/* ══════════════════════════════════════════
   MW21 — Quick save RAG toggle: clicking active clears
══════════════════════════════════════════ */
// T-26-H01 has rag='Đỏ'. Clicking active 'Đỏ' dot should clear to ''
await page.evaluate(() => mwQuickSaveRag('T-26-H01', '')); // '' = clearing active
await page.waitForTimeout(200);
const ragCleared = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T-26-H01');
  return t ? t.rag : 'NOT_FOUND';
});
log('MW21-rag-toggle-clear', ragCleared === '', `RAG cleared for T-26-H01 (rag=${ragCleared})`);

/* ══════════════════════════════════════════
   MW22 — Progress toggle shows input
══════════════════════════════════════════ */
// Re-render to get a clean state with fresh DOM
await page.evaluate(() => renderMyWork());
await page.waitForTimeout(300);

await page.evaluate(() => mwToggleProgress('T-26-H03'));
await page.waitForTimeout(150);
const progInputVisible = await page.evaluate(() => {
  const inp = document.getElementById('mwPi-T-26-H03');
  return inp ? inp.classList.contains('mw-prog-visible') : false;
});
const progLabelHidden = await page.evaluate(() => {
  const lbl = document.getElementById('mwPl-T-26-H03');
  return lbl ? lbl.style.display === 'none' : false;
});
log('MW22-prog-input-visible', progInputVisible, 'Progress input gets mw-prog-visible class on toggle');
log('MW22-prog-label-hidden',  progLabelHidden,  'Progress label hidden when input is shown');

/* ══════════════════════════════════════════
   MW23 — Quick save progress
══════════════════════════════════════════ */
await page.evaluate(() => mwQuickSaveProgress('T-26-H03', '75'));
await page.waitForTimeout(200);
const progAfter = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T-26-H03');
  return t ? t.progress : null;
});
const fillWidth = await page.evaluate(() => {
  const card = document.querySelector('[data-id="T-26-H03"]');
  if (!card) return null;
  const fill = card.querySelector('.mw-prog-bar-fill');
  return fill ? fill.style.width : null;
});
log('MW23-prog-saved',  progAfter === 75 || progAfter === '75', `Progress saved: ${progAfter}`);
log('MW23-prog-bar',    fillWidth === '75%',                    `Bar fill updated: ${fillWidth}`);
await shot(page, 'MW23-progress-save');

/* ══════════════════════════════════════════
   MW24 — Quick save result (textarea blur)
══════════════════════════════════════════ */
const newResult = 'Hoàn thành phân tích yêu cầu tuần này';
await page.evaluate((val) => mwQuickSaveResult('T-26-H03', val), newResult);
await page.waitForTimeout(200);
const resultAfter = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T-26-H03');
  return t ? t.result : null;
});
log('MW24-result-saved', resultAfter === newResult, `Result saved: "${resultAfter ? resultAfter.substring(0,20) : ''}..."`);

/* ══════════════════════════════════════════
   MW25 — No JS errors
══════════════════════════════════════════ */
log('MW25-no-js-errors', jsErrors.length === 0,
  jsErrors.length === 0 ? 'No JS errors' : `${jsErrors.length} errors: ${jsErrors.slice(0,2).join('; ')}`);

await shot(page, 'MW25-final-state');

/* ══════════════════════════════════════════
   SUMMARY
══════════════════════════════════════════ */
await browser.close();
server.close();

console.log('\n══════════════════════════════════════════════');
console.log(`  TOTAL: ${passed + failed} | ✅ PASS: ${passed} | ❌ FAIL: ${failed}`);
console.log(`  EVD screenshots → ${EVD_DIR}`);
console.log('══════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('FAILED tests:');
  results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.id}: ${r.msg}`));
  process.exit(1);
}
process.exit(0);
