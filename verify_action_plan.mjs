/**
 * verify_action_plan.mjs — S34 Action Plan v2 tests
 *
 * AP1:  HTML structure — actionPlanRoot + toolbar rendered
 * AP2:  Filter bar — period buttons + RAG buttons present
 * AP3:  Period filter — task outside period hidden; task in period shown
 * AP4:  Admin grouped view — accordion headers per team with data
 * AP5:  Case card appears in kanban with ★CASE badge
 * AP6:  RAG filter — only Red tasks/cases shown when RAG=Red
 * AP7:  Accordion toggle — body collapses and expands on header click
 * AP8:  Initiatives section appears below kanban
 * AP9:  Team dropdown filter — selecting BL shows only BL items
 * AP10: Extended criteria — Blocked task (highlight=N) auto-added with Auto badge
 * AP11: Click task card → #taskViewOverlay opens
 * AP12: Click case card → #cpViewOverlay opens
 * AP13: Empty state when no data in period
 * AP14: No JS console errors
 *
 * EVD screenshots: test-results/action-plan/
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Workspace/Production/SHTD-Dashboard';
const PORT    = 9993;
const BASE    = `http://localhost:${PORT}`;
const EVD_DIR = path.join(APP_DIR, 'test-results', 'action-plan');

/* ── HTTP server ── */
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(APP_DIR, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

/* ── Result helpers ── */
let R = { pass: 0, fail: 0 };
const PASS = (id, msg) => { console.log(`  ✅ [${id}] ${msg}`); R.pass++; };
const FAIL = (id, msg) => { console.error(`  ❌ [${id}] ${msg}`); R.fail++; process.exitCode = 1; };
const SS   = async (page, name) => page.screenshot({ path: path.join(EVD_DIR, `${name}.png`) });

/* ── Today helpers ── */
const NOW   = new Date();
const Y     = NOW.getFullYear(), M = NOW.getMonth();
const pad   = n => String(n).padStart(2, '0');
const inMonth  = `${Y}-${pad(M + 1)}-15`;            // mid current month
const outMonth = `${Y - 1}-12-31`;                    // last year — outside any period

/* ── Mock data ── */
const mkTask = (o) => Object.assign({
  id: 'T-001', name: 'Task Test', team: 'BL', highlight: 'Y',
  state: 'Đang thực hiện', status: 'Green', progress: '50',
  endDate: inMonth, startDate: `${Y}-01-01`,
  initiative: '', milestone: '', type: 'Task', category: '',
  picAcc: 'TuanTT4', picRes: 'TuanTT4', picSupport: '',
  teamPhoiHop: '', canBLD: 'N', noiDungBLD: '', yKienBLD: '', tuanBC: '',
  crossTeam: 'N', result: '', nextPlan: '', vuongMac: '',
}, o);

const mkCase = (o) => Object.assign({
  id: 'CP-001', caseName: 'Case Test', team: 'BL', pic: 'TuanTT4',
  highlight: 'Y', stage: 'Đang phân tích', rag: 'Green',
  deadline: inMonth, startDate: `${Y}-01-01`,
  dvkd: '', loaiHinh: 'Món', complexity: 'Thấp',
  phuongAn: '', giaTriTy: 0, vuongMac: '', nextStep: '',
  canBLD: 'N', ghiChu: '', yKienBLD: '', tuanBC: '',
}, o);

const mkInit = (o) => Object.assign({
  id: 'INIT-001', name: 'Initiative Test', type: 'initiative',
  category: '', accountable: 'DungBL',
  startDate: `${Y}-01-01`, deadline: `${Y}-12-31`,
  pct: 40, status: 'Active', milestoneTracking: '',
  milestoneDeadline: '', kpiTarget: '', notes: '', docLink: '', parentId: null,
}, o);

const MOCK_TASKS = [
  mkTask({ id: 'BL-001', name: 'BL Highlight Task',   team: 'BL',  highlight: 'Y', endDate: inMonth,  status: 'Green' }),
  mkTask({ id: 'BL-RED', name: 'BL Red Task',          team: 'BL',  highlight: 'Y', endDate: inMonth,  status: 'Red' }),
  mkTask({ id: 'CV1-001', name: 'CV1 Highlight Task',  team: 'CV1', highlight: 'Y', endDate: inMonth,  status: 'Green' }),
  mkTask({ id: 'BL-OUT', name: 'BL Outside Period',    team: 'BL',  highlight: 'Y', endDate: outMonth, status: 'Green', state: 'Hoàn thành' }),
  mkTask({ id: 'BL-BLK', name: 'BL Blocked Auto',      team: 'BL',  highlight: 'N', endDate: inMonth,  status: 'Red', state: 'Blocked' }),
];

const MOCK_CASES = [
  mkCase({ id: 'CP-001', caseName: 'Case BL Test', team: 'BL', highlight: 'Y', deadline: inMonth, rag: 'Green' }),
];

const MOCK_INITS = [
  mkInit({ id: 'INIT-BL',  name: 'Initiative BL',  accountable: 'DungBL' }),
  mkInit({ id: 'INIT-CV1', name: 'Initiative CV1', accountable: 'DungCV1' }),
];

const MOCK_USERS = [
  { Username: 'TuanTT4', Display_Name: 'Tuấn TT',  Role: 'Admin', Team: 'Số',  Email: '', Active: 'TRUE' },
  { Username: 'DungBL',  Display_Name: 'Dung BL',   Role: 'User',  Team: 'BL',  Email: '', Active: 'TRUE' },
  { Username: 'DungCV1', Display_Name: 'Dung CV1',  Role: 'User',  Team: 'CV1', Email: '', Active: 'TRUE' },
];

/* ── Browser + GAS mock ── */
const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await ctx.route('https://script.google.com/**', async route => {
  let parsed = null;
  try { parsed = JSON.parse(route.request().postData() || '{}'); } catch(_) {}
  const action = parsed?.action || '';
  if (action === 'user-list') {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: {
        header: ['Username','Display_Name','Role','Team','Email','Active'],
        rows: MOCK_USERS.map(u => [u.Username, u.Display_Name, u.Role, u.Team, u.Email, u.Active]),
      }}) });
  } else if (['read','initiative-read','kpi-read','case-pipeline-read','audit-read'].includes(action)) {
    await route.fulfill({ status: 500, body: 'mock-offline' });
  } else {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', serverTs: Date.now() }) });
  }
});

const jsErrors = [];
const page = await ctx.newPage();
page.on('pageerror', e => {
  if (!/net::ERR|ERR_ABORTED|500|favicon|GAS offline|Failed to fetch|mock-offline/.test(e.message))
    jsErrors.push(e.message);
});

/* ── Load app ── */
async function loadApp(opts = {}) {
  const {
    role = 'Admin', team = 'Số',
    tasks = MOCK_TASKS, cases = MOCK_CASES, inits = MOCK_INITS,
  } = opts;

  await page.goto(BASE);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(({ role, team, tasks, cases, inits }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'test-token',
      user: { username: 'TuanTT4', displayName: 'Tuấn TT', role, team },
      exp: Date.now() + 3600000,
    }));
    localStorage.setItem('shtd_v2', JSON.stringify({
      tasks, initiatives: inits, cases, _serverTs: null, deletedIds: [],
    }));
  }, { role, team, tasks, cases, inits });

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () => { const el = document.getElementById('loadingOverlay'); return !el || el.style.display === 'none'; },
    { timeout: 8000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
}

async function navTo(view) {
  await page.evaluate(v => navigateTo(v), view);
  await page.waitForTimeout(400);
}

/* ══════════════════════════════════════════════════════════
   TEST SUITE
   ══════════════════════════════════════════════════════════ */

console.log('\n── Action Plan v2 Tests ──────────────────────────\n');

await loadApp();

/* AP1: HTML structure */
{
  await navTo('action-plan');
  await SS(page, 'ap1_initial');
  const root = await page.$('#actionPlanRoot');
  if (!root) { FAIL('AP1', '#actionPlanRoot missing'); } else {
    const html = await page.$eval('#actionPlanRoot', el => el.innerHTML);
    const hasToolbar = html.includes('Action Plan') && html.includes('ap-filter-bar');
    if (hasToolbar) PASS('AP1', 'HTML structure: #actionPlanRoot + toolbar rendered');
    else FAIL('AP1', 'Toolbar or filter-bar missing in rendered HTML');
  }
}

/* AP2: Filter bar — period + RAG buttons */
{
  const periodBtns = await page.$$('.ap-period-btn');
  const ragBtns    = await page.$$('.ap-rag-btn');
  if (periodBtns.length === 3) PASS('AP2a', `Period buttons: ${periodBtns.length}/3 found`);
  else FAIL('AP2a', `Period buttons: expected 3, got ${periodBtns.length}`);
  if (ragBtns.length === 4) PASS('AP2b', `RAG buttons: ${ragBtns.length}/4 found`);
  else FAIL('AP2b', `RAG buttons: expected 4, got ${ragBtns.length}`);
  // "Tháng này" should be active by default
  const activeLabel = await page.$eval('.ap-period-btn.active', el => el.textContent.trim()).catch(() => '');
  if (activeLabel === 'Tháng này') PASS('AP2c', '"Tháng này" active by default');
  else FAIL('AP2c', `Active period btn = "${activeLabel}", expected "Tháng này"`);
}

/* AP3: Period filter — task outside month hidden when "Tháng này" active */
{
  const html = await page.$eval('#actionPlanRoot', el => el.innerHTML);
  // BL-OUT has endDate last year → should NOT be in current month view
  const hasOutside = html.includes('BL Outside Period');
  // BL-001 has endDate this month → SHOULD appear
  const hasInside  = html.includes('BL Highlight Task');
  if (!hasOutside) PASS('AP3a', 'Task outside period (last year) correctly hidden');
  else FAIL('AP3a', 'Task outside period incorrectly shown');
  if (hasInside) PASS('AP3b', 'Task in current month correctly shown');
  else FAIL('AP3b', 'Task in current month not shown');
}

/* AP4: Admin grouped view — accordion headers per team */
{
  const accordions = await page.$$('.ap-accordion');
  // Should see BL and CV1 accordions (both have data this month)
  const html = await page.$eval('#actionPlanRoot', el => el.innerHTML);
  const hasBL  = html.includes('>BL<');
  const hasCV1 = html.includes('>CV1<');
  await SS(page, 'ap4_grouped_view');
  if (accordions.length >= 2) PASS('AP4a', `Accordion count ≥ 2 (${accordions.length} found)`);
  else FAIL('AP4a', `Expected ≥ 2 accordions, got ${accordions.length}`);
  if (hasBL && hasCV1) PASS('AP4b', 'BL and CV1 accordion headers present');
  else FAIL('AP4b', `BL: ${hasBL}, CV1: ${hasCV1}`);
  // Count badges should be present
  const counts = await page.$$('.ap-acc-count');
  if (counts.length >= 2) PASS('AP4c', 'Team count badges rendered');
  else FAIL('AP4c', `Expected ≥ 2 count badges, got ${counts.length}`);
}

/* AP5: Case card with ★CASE badge */
{
  const caseBadges = await page.$$('.ap-case-badge');
  if (caseBadges.length > 0) PASS('AP5a', `Case badge found (${caseBadges.length})`);
  else FAIL('AP5a', 'No .ap-case-badge found — case not in kanban');
  // case card should have kanban-card-case class
  const casCards = await page.$$('.kanban-card-case');
  if (casCards.length > 0) PASS('AP5b', `Case card (.kanban-card-case) found (${casCards.length})`);
  else FAIL('AP5b', 'No .kanban-card-case found');
}

/* AP6: RAG filter — only Red items shown */
{
  // Click "■ Red" RAG button
  await page.click('.ap-rag-btn:has-text("Red")');
  await page.waitForTimeout(400);
  await SS(page, 'ap6_rag_red');
  const html = await page.$eval('#actionPlanRoot', el => el.innerHTML);
  const hasGreenTask = html.includes('BL Highlight Task') && !html.includes('BL Highlight Task');
  // BL-RED (Red) should show; CV1-001 (Green) should NOT
  const showsRedTask  = html.includes('BL Red Task');
  const hidesGreenCV1 = !html.includes('CV1 Highlight Task');
  if (showsRedTask) PASS('AP6a', 'Red task shown when RAG=Red filter active');
  else FAIL('AP6a', 'Red task not shown with RAG=Red filter');
  if (hidesGreenCV1) PASS('AP6b', 'Green task from CV1 hidden when RAG=Red');
  else FAIL('AP6b', 'Green task from CV1 still visible with RAG=Red');
  // Reset RAG filter
  await page.click('.ap-rag-btn:first-child');
  await page.waitForTimeout(400);
}

/* AP7: Accordion toggle — first BL accordion is open, click to collapse */
{
  // Find BL accordion header and its body
  const bl1Header = await page.$('.ap-accordion-header[data-team="BL"]');
  if (!bl1Header) { FAIL('AP7', 'BL accordion header not found'); }
  else {
    const tid = await page.evaluate(h => {
      const acc = h.closest('.ap-accordion');
      return acc ? acc.id : null;
    }, bl1Header);
    const bodySelector = `#${tid} .ap-accordion-body`;
    const beforeDisplay = await page.$eval(bodySelector, el => el.style.display).catch(() => 'missing');
    // Click to toggle
    await bl1Header.click();
    await page.waitForTimeout(300);
    const afterDisplay = await page.$eval(bodySelector, el => el.style.display).catch(() => 'missing');
    // Click again to re-open
    await bl1Header.click();
    await page.waitForTimeout(300);
    if (beforeDisplay === 'block' && afterDisplay === 'none')
      PASS('AP7', 'Accordion collapses on click then re-opens on second click');
    else
      FAIL('AP7', `Toggle: before="${beforeDisplay}", after="${afterDisplay}" (expected block→none)`);
  }
}

/* AP8: Initiatives section */
{
  await SS(page, 'ap8_initiatives');
  const initSections = await page.$$('.ap-init-section');
  if (initSections.length > 0) PASS('AP8a', `Initiatives section found (${initSections.length})`);
  else FAIL('AP8a', 'No .ap-init-section found');
  const initRows = await page.$$('.ap-init-row');
  if (initRows.length > 0) PASS('AP8b', `Initiative rows found (${initRows.length})`);
  else FAIL('AP8b', 'No .ap-init-row found');
}

/* AP9: Team dropdown filter — select BL → only BL items */
{
  // Select BL in the team dropdown (Admin only)
  const teamSel = await page.$('.ap-filter-bar select');
  if (!teamSel) { FAIL('AP9', 'Team dropdown not found (Admin required)'); }
  else {
    await teamSel.selectOption('BL');
    await page.waitForTimeout(400);
    await SS(page, 'ap9_team_bl');
    const html = await page.$eval('#actionPlanRoot', el => el.innerHTML);
    const showsBL   = html.includes('BL Highlight Task');
    const hidesCV1  = !html.includes('CV1 Highlight Task');
    if (showsBL) PASS('AP9a', 'BL task shown after team filter = BL');
    else FAIL('AP9a', 'BL task not shown after team filter');
    if (hidesCV1) PASS('AP9b', 'CV1 task hidden after team filter = BL');
    else FAIL('AP9b', 'CV1 task still visible after team filter = BL');
    // Re-query: selectOption('BL') triggered re-render so teamSel handle is stale
    const teamSelReset = await page.$('.ap-filter-bar select');
    if (teamSelReset) await teamSelReset.selectOption('');
    await page.waitForTimeout(400);
  }
}

/* AP10: Extended criteria — Blocked task (highlight=N) appears with Auto badge */
{
  const html = await page.$eval('#actionPlanRoot', el => el.innerHTML);
  // BL-BLK is Blocked + highlight=N → should be auto-added
  const showsBlocked = html.includes('BL Blocked Auto');
  const hasAutoBadge = html.includes('ap-auto-badge');
  if (showsBlocked) PASS('AP10a', 'Blocked task (highlight=N) auto-added to kanban');
  else FAIL('AP10a', 'Blocked task (highlight=N) missing from kanban');
  if (hasAutoBadge) PASS('AP10b', '.ap-auto-badge present on auto-added task');
  else FAIL('AP10b', 'No .ap-auto-badge found');
}

/* AP11: Click task card → taskViewOverlay opens */
{
  // Find a task card and click it (first one in BL kanban)
  const taskCard = await page.$('.kanban-card:not(.kanban-card-case)');
  if (!taskCard) { FAIL('AP11', 'No task kanban card found to click'); }
  else {
    await taskCard.click();
    await page.waitForTimeout(500);
    await SS(page, 'ap11_task_popup');
    const overlayDisplay = await page.$eval('#taskViewOverlay', el => el.style.display).catch(() => 'missing');
    if (overlayDisplay === 'flex') PASS('AP11', '#taskViewOverlay opens on task card click');
    else FAIL('AP11', `#taskViewOverlay display="${overlayDisplay}", expected "flex"`);
    // Close
    await page.evaluate(() => closeTaskViewPopup && closeTaskViewPopup());
    await page.waitForTimeout(300);
  }
}

/* AP12: Click case card → cpViewOverlay opens */
{
  const caseCard = await page.$('.kanban-card-case');
  if (!caseCard) { FAIL('AP12', 'No case kanban card found to click'); }
  else {
    await caseCard.click();
    await page.waitForTimeout(500);
    await SS(page, 'ap12_case_popup');
    const overlayDisplay = await page.$eval('#cpViewOverlay', el => el.style.display).catch(() => 'missing');
    if (overlayDisplay === 'flex') PASS('AP12', '#cpViewOverlay opens on case card click');
    else FAIL('AP12', `#cpViewOverlay display="${overlayDisplay}", expected "flex"`);
    await page.evaluate(() => closeCaseViewPopup && closeCaseViewPopup());
    await page.waitForTimeout(300);
  }
}

/* AP13: Tháng trước — no tasks/cases in range (all deadlines are this month); initiatives still show */
{
  await page.click('.ap-period-btn:has-text("Tháng trước")');
  await page.waitForTimeout(400);
  await SS(page, 'ap13_prev_month');
  const html = await page.$eval('#actionPlanRoot', el => el.innerHTML);
  // Toolbar shows "0 tasks/cases" when no tasks or cases match the period
  const hasNoTasksCases = html.includes('0 tasks/cases');
  if (hasNoTasksCases) PASS('AP13', 'Prev-month shows 0 tasks/cases (initiatives still shown)');
  else FAIL('AP13', 'Tasks/cases still visible in prev-month — expected 0 tasks/cases');
  // Reset to this month (re-query to avoid stale handle after re-renders)
  await page.click('.ap-period-btn:has-text("Tháng này")');
  await page.waitForTimeout(400);
}

/* AP14: No JS errors */
{
  if (jsErrors.length === 0) PASS('AP14', 'No JS console errors');
  else FAIL('AP14', `JS errors: ${jsErrors.slice(0, 3).join(' | ')}`);
}

/* ── Summary ── */
console.log(`\n══ Action Plan v2: ${R.pass}/${R.pass + R.fail} PASS ══\n`);

await browser.close();
server.close();
