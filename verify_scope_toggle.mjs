/**
 * verify_scope_toggle.mjs
 * Kiểm tra tính năng "Của tôi / Tất cả" scope toggle cho Task / Case / Initiative.
 *
 * Strategy:
 *  - GAS mock trả về HTTP 500 → tất cả GAS sync fail gracefully → data từ localStorage
 *  - localStorage shtd_v2 = { tasks, initiatives, cases } (đúng format của app)
 *  - Navigate đến view trước khi interact (scope buttons nằm trong view sections có display:none)
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Workspace/Production/SHTD-Dashboard';
const PORT    = 9988;
const BASE    = `http://localhost:${PORT}`;

/* ── HTTP server ── */
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(APP_DIR, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

/* ── Test helpers ── */
let R = { pass: 0, fail: 0 };
const PASS = msg => { console.log(`  ✅ ${msg}`); R.pass++; };
const FAIL = msg => { console.error(`  ❌ ${msg}`); R.fail++; process.exitCode = 1; };

/* ── Mock data ──
   Tasks:
     T-001  picRes=TuanTT4  picAcc=TuanTT4   → chỉ TuanTT4
     T-002  picRes=DungLQ1  picAcc=TuanTT4   → cả hai
     T-003  picRes=TuanTT4  picAcc=DungLQ1   → cả hai
     T-004  picRes=DungLQ1  picAcc=DungLQ1   → chỉ DungLQ1
     T-005  picRes=OtherX   picAcc=OtherX    → không ai
   Cases:
     CP-001  pic=TuanTT4
     CP-002  pic=DungLQ1
     CP-003  pic=OtherX
   Initiatives:
     INI-001  accountable=TuanTT4  type=initiative
     INI-002  accountable=DungLQ1  type=initiative
*/
const MOCK_TASKS = [
  { id:'T-001', name:'Task Alpha', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress:50, state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
  { id:'T-002', name:'Task Beta',  initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI', picAcc:'TuanTT4', picRes:'DungLQ1', picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress:30, state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
  { id:'T-003', name:'Task Gamma', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI', picAcc:'DungLQ1', picRes:'TuanTT4', picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress:20, state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
  { id:'T-004', name:'Task Delta', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI', picAcc:'DungLQ1', picRes:'DungLQ1', picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress:10, state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
  { id:'T-005', name:'Task Sigma', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI', picAcc:'OtherX',  picRes:'OtherX',  picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress: 0, state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
];
const MOCK_CASES = [
  { id:'CP-001', caseName:'Case Alpha', team:'Số', pic:'TuanTT4', dvkd:'', loaiHinh:'Món', complexity:'Cao', phuongAn:'', giaTriTy:0, stage:'Tiếp nhận', vuongMac:'', nextStep:'', startDate:'2026-01-01', deadline:'2026-12-31', rag:'Green', canBLD:'N', highlight:'N', notes:'', yKienBLD:'', tuanBC:'' },
  { id:'CP-002', caseName:'Case Beta',  team:'Số', pic:'DungLQ1', dvkd:'', loaiHinh:'Món', complexity:'Cao', phuongAn:'', giaTriTy:0, stage:'Tiếp nhận', vuongMac:'', nextStep:'', startDate:'2026-01-01', deadline:'2026-12-31', rag:'Green', canBLD:'N', highlight:'N', notes:'', yKienBLD:'', tuanBC:'' },
  { id:'CP-003', caseName:'Case Gamma', team:'Số', pic:'OtherX',  dvkd:'', loaiHinh:'Món', complexity:'Cao', phuongAn:'', giaTriTy:0, stage:'Tiếp nhận', vuongMac:'', nextStep:'', startDate:'2026-01-01', deadline:'2026-12-31', rag:'Green', canBLD:'N', highlight:'N', notes:'', yKienBLD:'', tuanBC:'' },
];
const MOCK_INITIATIVES = [
  { id:'INI-001', name:'Init Alpha', parentId:null, type:'initiative', category:'AI', accountable:'TuanTT4', startDate:'2026-01-01', deadline:'2026-12-31', pct:50, status:'Active', milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
  { id:'INI-002', name:'Init Beta',  parentId:null, type:'initiative', category:'AI', accountable:'DungLQ1', startDate:'2026-01-01', deadline:'2026-12-31', pct:30, status:'Active', milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
];

/* ── GAS mock: trả về HTTP 500 → app fallback to localStorage cache ── */
async function makeCtx(browser) {
  const ctx = await browser.newContext();
  await ctx.route('https://script.google.com/**', async (route) => {
    // Trả về 500 → gasPost() throw → autoConnectDB/readCases/readInitiatives bắt lỗi → cache được giữ
    await route.fulfill({ status: 500, body: 'GAS offline (test mock)' });
  });
  return ctx;
}

/* ── Load page với auth + mock data ── */
async function loadPage(ctx, { role = 'Admin', username = 'TuanTT4', preset = 'all' } = {}) {
  const page = await ctx.newPage();
  const jsErrors = [];
  const NOISE = [/net::ERR_/, /ERR_ABORTED/, /Chart is not defined/, /favicon/, /500/];
  page.on('pageerror', e => { if (!NOISE.some(r => r.test(e.message))) jsErrors.push(e.message); });

  await page.goto(BASE);
  await page.waitForLoadState('domcontentloaded');

  // Inject auth + full data (tasks, initiatives, cases đều trong shtd_v2)
  await page.evaluate(({ username, role, tasks, cases, initiatives, preset }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'test-token',
      user: { username, displayName: username, role, team: 'Số' },
      exp: Date.now() + 3600000,
    }));
    // Cases trong shtd_v2.cases — đây là format mà loadCasesFromCache() đọc
    localStorage.setItem('shtd_v2', JSON.stringify({ tasks, initiatives, cases, kpi: [], _serverTs: null }));
    localStorage.setItem('shtd_preset', preset);
  }, { username, role, tasks: MOCK_TASKS, cases: MOCK_CASES, initiatives: MOCK_INITIATIVES, preset });

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  // Đợi loadingOverlay biến mất (hoặc GAS fail → hideLoading)
  await page.waitForFunction(
    () => {
      const el = document.getElementById('loadingOverlay');
      return !el || el.style.display === 'none' || !el.classList.contains('visible');
    },
    { timeout: 8000 }
  ).catch(() => {});
  await page.waitForTimeout(200); // extra wait for render

  page._jsErrors = jsErrors;
  return page;
}

/* ── Navigate đến view ── */
async function navTo(page, view) {
  const navItem = page.locator(`[data-view="${view}"]`);
  await navItem.click();
  await page.waitForTimeout(400);
}

/* ── Đếm task rows thực sự (có onclick) ── */
const countTaskRows = page => page.evaluate(() =>
  document.querySelectorAll('#taskTbody tr[onclick]').length
);
/* ── Đếm case rows ── */
const countCpRows = page => page.evaluate(() =>
  document.querySelectorAll('#cpTbody tr[onclick]').length
);

/* ═══════════════════════════════════════════════════════════
   T1: Toggle HTML tồn tại trong Task view
═══════════════════════════════════════════════════════════ */
console.log('\n[T1] Task scope toggle HTML exists');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'Admin' });
  await navTo(page, 'tasks');

  const mineBtn = await page.$('#taskScopeMine');
  const allBtn  = await page.$('#taskScopeAll');
  mineBtn ? PASS('taskScopeMine button exists') : FAIL('taskScopeMine button NOT FOUND');
  allBtn  ? PASS('taskScopeAll button exists')  : FAIL('taskScopeAll button NOT FOUND');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T2: Admin user → default scope = 'Tất cả'; hiện đủ 5 tasks
═══════════════════════════════════════════════════════════ */
console.log('\n[T2] Admin user defaults to scope = all, sees all 5 tasks');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'Admin', username: 'TuanTT4' });
  await navTo(page, 'tasks');

  const allActive  = await page.evaluate(() => document.getElementById('taskScopeAll')?.classList.contains('active'));
  const mineActive = await page.evaluate(() => document.getElementById('taskScopeMine')?.classList.contains('active'));
  allActive   ? PASS('Admin: taskScopeAll is active')     : FAIL('Admin: taskScopeAll NOT active');
  !mineActive ? PASS('Admin: taskScopeMine NOT active')   : FAIL('Admin: taskScopeMine should NOT be active');

  const rows = await countTaskRows(page);
  rows === 5 ? PASS(`Admin all: ${rows}/5 task rows shown`) : FAIL(`Admin all: expected 5, got ${rows}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T3: Non-Admin user → default scope = 'Của tôi'
═══════════════════════════════════════════════════════════ */
console.log('\n[T3] Non-Admin user defaults to scope = mine');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'tasks');

  const mineActive = await page.evaluate(() => document.getElementById('taskScopeMine')?.classList.contains('active'));
  const allActive  = await page.evaluate(() => document.getElementById('taskScopeAll')?.classList.contains('active'));
  mineActive  ? PASS('User: taskScopeMine is active')   : FAIL('User: taskScopeMine NOT active');
  !allActive  ? PASS('User: taskScopeAll NOT active')   : FAIL('User: taskScopeAll should NOT be active');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T4: Scope 'mine' - DungLQ1 thấy 3 tasks (T-002 picRes, T-003 picAcc, T-004 cả hai)
═══════════════════════════════════════════════════════════ */
console.log('\n[T4] Scope mine: DungLQ1 sees 3 tasks');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'tasks');

  const rows = await countTaskRows(page);
  rows === 3 ? PASS(`Mine: DungLQ1 sees ${rows}/3 tasks (picRes+picAcc match)`)
             : FAIL(`Mine: expected 3 tasks, got ${rows}`);

  // T-001 (TuanTT4 only) không xuất hiện
  const hasT1 = await page.evaluate(() =>
    [...document.querySelectorAll('#taskTbody td')].some(td => td.textContent.trim() === 'T-001')
  );
  !hasT1 ? PASS('Mine: T-001 (TuanTT4 only) not visible') : FAIL('Mine: T-001 should be hidden');

  // T-005 (OtherX) không xuất hiện
  const hasT5 = await page.evaluate(() =>
    [...document.querySelectorAll('#taskTbody td')].some(td => td.textContent.trim() === 'T-005')
  );
  !hasT5 ? PASS('Mine: T-005 (OtherX) not visible') : FAIL('Mine: T-005 should be hidden');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T5: Switch mine → all: hiện đủ 5 tasks
═══════════════════════════════════════════════════════════ */
console.log('\n[T5] Switch mine → all shows all 5 tasks');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'tasks');

  const mineBefore = await countTaskRows(page);
  mineBefore === 3 ? PASS(`Before switch: ${mineBefore} rows (mine=3)`)
                   : FAIL(`Before: expected 3, got ${mineBefore}`);

  await page.click('#taskScopeAll');
  await page.waitForTimeout(200);

  const allRows = await countTaskRows(page);
  allRows === 5 ? PASS(`After switch to all: ${allRows}/5 rows`)
               : FAIL(`After switch: expected 5, got ${allRows}`);

  const allActive = await page.evaluate(() => document.getElementById('taskScopeAll')?.classList.contains('active'));
  allActive ? PASS('taskScopeAll active after switch') : FAIL('taskScopeAll not active after switch');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T6: Switch all → mine lại được
═══════════════════════════════════════════════════════════ */
console.log('\n[T6] Switch all → mine works correctly');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'tasks');

  // Switch to all first
  await page.click('#taskScopeAll');
  await page.waitForTimeout(200);
  const allRows = await countTaskRows(page);

  // Switch back to mine
  await page.click('#taskScopeMine');
  await page.waitForTimeout(200);
  const mineRows = await countTaskRows(page);

  allRows === 5 && mineRows === 3
    ? PASS(`Toggle roundtrip: all=${allRows} → mine=${mineRows}`)
    : FAIL(`Toggle roundtrip: expected all=5 mine=3, got all=${allRows} mine=${mineRows}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T7: Preset counts phản ánh scope (active count = 3 khi mine)
═══════════════════════════════════════════════════════════ */
console.log('\n[T7] Preset counts reflect scope');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1', preset: 'active' });
  await navTo(page, 'tasks');

  const activeCount = await page.evaluate(() => document.getElementById('pcount-active')?.textContent?.trim());
  // DungLQ1's 3 tasks đều state='Đang thực hiện' → active preset count = 3
  activeCount === '3' ? PASS(`pcount-active = ${activeCount} (DungLQ1 scoped)`)
                      : FAIL(`pcount-active: expected '3', got '${activeCount}'`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T8: Fallback — NoTaskUser không có task → auto-switch all
═══════════════════════════════════════════════════════════ */
console.log('\n[T8] Fallback: user with no tasks → auto-switch all');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'NoTaskUser' });
  await navTo(page, 'tasks');

  // NoTaskUser không có task nào → fallback 'all' → 5 tasks
  const rows = await countTaskRows(page);
  rows === 5 ? PASS(`Fallback: NoTaskUser sees all ${rows} tasks`)
             : FAIL(`Fallback: expected 5, got ${rows}`);

  const allActive = await page.evaluate(() => document.getElementById('taskScopeAll')?.classList.contains('active'));
  allActive ? PASS('Fallback: taskScopeAll active after auto-switch')
            : FAIL('Fallback: taskScopeAll NOT active');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T9: Case Pipeline toggle HTML exists
═══════════════════════════════════════════════════════════ */
console.log('\n[T9] Case Pipeline scope toggle HTML exists');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'Admin' });
  await navTo(page, 'case-pipeline');

  const mineBtn = await page.$('#cpScopeMine');
  const allBtn  = await page.$('#cpScopeAll');
  mineBtn ? PASS('cpScopeMine button exists') : FAIL('cpScopeMine button NOT FOUND');
  allBtn  ? PASS('cpScopeAll button exists')  : FAIL('cpScopeAll button NOT FOUND');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T10: Admin: Case default 'all' — 3 cases hiển thị
═══════════════════════════════════════════════════════════ */
console.log('\n[T10] Admin: Case Pipeline default all, sees 3 cases');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'Admin', username: 'TuanTT4' });
  await navTo(page, 'case-pipeline');

  const allActive = await page.evaluate(() => document.getElementById('cpScopeAll')?.classList.contains('active'));
  allActive ? PASS('Admin: cpScopeAll active') : FAIL('Admin: cpScopeAll NOT active');

  const rows = await countCpRows(page);
  // Preset active: stage=Tiếp nhận → thuộc group 'new' (không phải done/blocked) → hiện trong preset active
  rows === 3 ? PASS(`Admin all: ${rows}/3 cases shown`) : FAIL(`Admin all: expected 3, got ${rows}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T11: Non-Admin DungLQ1: Case 'mine' — chỉ thấy CP-002
═══════════════════════════════════════════════════════════ */
console.log('\n[T11] Non-Admin: Case scope mine shows only DungLQ1 cases');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'case-pipeline');

  const mineActive = await page.evaluate(() => document.getElementById('cpScopeMine')?.classList.contains('active'));
  mineActive ? PASS('DungLQ1: cpScopeMine is active') : FAIL('DungLQ1: cpScopeMine NOT active');

  const rows = await countCpRows(page);
  rows === 1 ? PASS(`Case mine: DungLQ1 sees ${rows}/1 case (CP-002)`)
             : FAIL(`Case mine: expected 1, got ${rows}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T12: Case switch mine → all
═══════════════════════════════════════════════════════════ */
console.log('\n[T12] Case scope switch mine → all');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'case-pipeline');

  await page.click('#cpScopeAll');
  await page.waitForTimeout(300);

  const rows = await countCpRows(page);
  rows === 3 ? PASS(`Case all: ${rows}/3 cases after switch`)
             : FAIL(`Case all: expected 3, got ${rows}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T13: Case fallback: NoCaseUser → auto-switch all
═══════════════════════════════════════════════════════════ */
console.log('\n[T13] Case fallback: user with no cases → auto-switch all');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'NoCaseUser' });
  await navTo(page, 'case-pipeline');

  const rows = await countCpRows(page);
  rows === 3 ? PASS(`Case fallback: NoCaseUser sees all ${rows} cases`)
             : FAIL(`Case fallback: expected 3, got ${rows}`);

  const allActive = await page.evaluate(() => document.getElementById('cpScopeAll')?.classList.contains('active'));
  allActive ? PASS('Case fallback: cpScopeAll active') : FAIL('Case fallback: cpScopeAll NOT active');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T14: Initiative scope toggle rendered trong toolbar
═══════════════════════════════════════════════════════════ */
console.log('\n[T14] Initiative scope toggle exists in toolbar');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'Admin' });
  await navTo(page, 'initiative-tracker');

  await page.waitForSelector('#initiativeTrackerRoot .scope-toggle', { timeout: 3000 }).catch(() => {});

  const exists = await page.evaluate(() => !!document.querySelector('#initiativeTrackerRoot .scope-toggle'));
  exists ? PASS('Initiative scope toggle rendered') : FAIL('Initiative scope toggle NOT found');

  const btnTexts = await page.evaluate(() =>
    [...document.querySelectorAll('#initiativeTrackerRoot .scope-btn')].map(b => b.textContent.trim())
  );
  btnTexts.some(t => t.includes('Của tôi')) ? PASS('"Của tôi" button found') : FAIL('"Của tôi" NOT found');
  btnTexts.some(t => t.includes('Tất cả'))  ? PASS('"Tất cả" button found')  : FAIL('"Tất cả" NOT found');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T15: Admin: Initiative default 'all' — thấy 2 initiatives
═══════════════════════════════════════════════════════════ */
console.log('\n[T15] Admin: Initiative default all, sees 2 initiatives');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'Admin', username: 'TuanTT4' });
  await navTo(page, 'initiative-tracker');
  await page.waitForTimeout(300);

  const cards = await page.evaluate(() =>
    document.querySelectorAll('#initiativeTrackerRoot .init-card').length
  );
  cards === 2 ? PASS(`Admin all: ${cards}/2 initiative cards`) : FAIL(`Admin all: expected 2, got ${cards}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T16: DungLQ1: Initiative scope 'mine' → chỉ INI-002
═══════════════════════════════════════════════════════════ */
console.log('\n[T16] Non-Admin: Initiative mine shows only DungLQ1 initiative');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'initiative-tracker');
  await page.waitForTimeout(300);

  const cards = await page.evaluate(() =>
    document.querySelectorAll('#initiativeTrackerRoot .init-card').length
  );
  cards === 1 ? PASS(`Initiative mine: DungLQ1 sees ${cards}/1 initiative`)
              : FAIL(`Initiative mine: expected 1, got ${cards}`);

  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('#initiativeTrackerRoot .init-card-id')].map(el => el.textContent.trim())
  );
  !ids.includes('INI-001') ? PASS('INI-001 (TuanTT4) not visible')   : FAIL('INI-001 should be hidden');
  ids.includes('INI-002')  ? PASS('INI-002 (DungLQ1) is visible')    : FAIL('INI-002 should be visible');

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T17: Initiative switch mine → all
═══════════════════════════════════════════════════════════ */
console.log('\n[T17] Initiative scope switch mine → all');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });
  await navTo(page, 'initiative-tracker');
  await page.waitForTimeout(200);

  // Click "Tất cả" trong initiative toolbar
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#initiativeTrackerRoot .scope-btn')];
    const allBtn = btns.find(b => b.textContent.includes('Tất cả'));
    if (allBtn) allBtn.click();
  });
  await page.waitForTimeout(400);

  const cards = await page.evaluate(() =>
    document.querySelectorAll('#initiativeTrackerRoot .init-card').length
  );
  cards === 2 ? PASS(`Initiative all: ${cards}/2 cards after switch`) : FAIL(`Initiative all: expected 2, got ${cards}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T18: Initiative fallback: NoInitUser → auto-switch all
═══════════════════════════════════════════════════════════ */
console.log('\n[T18] Initiative fallback: user with no initiatives → auto-switch all');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'NoInitUser' });
  await navTo(page, 'initiative-tracker');
  await page.waitForTimeout(300);

  const cards = await page.evaluate(() =>
    document.querySelectorAll('#initiativeTrackerRoot .init-card').length
  );
  cards === 2 ? PASS(`Initiative fallback: NoInitUser sees all ${cards} initiatives`)
              : FAIL(`Initiative fallback: expected 2, got ${cards}`);

  await browser.close();
}

/* ═══════════════════════════════════════════════════════════
   T19: Không có JS errors khi navigate qua 3 views
═══════════════════════════════════════════════════════════ */
console.log('\n[T19] No JS errors across all 3 views');
{
  const browser = await chromium.launch({ headless: true });
  const ctx  = await makeCtx(browser);
  const page = await loadPage(ctx, { role: 'User', username: 'DungLQ1' });

  await navTo(page, 'tasks');
  await navTo(page, 'case-pipeline');
  await navTo(page, 'initiative-tracker');
  await page.waitForTimeout(300);

  const errs = page._jsErrors || [];
  errs.length === 0
    ? PASS('No JS errors (Tasks / Case Pipeline / Initiative)')
    : FAIL(`JS errors: ${errs.join('; ')}`);

  await browser.close();
}

/* ── Summary ── */
server.close();
console.log(`\n${'═'.repeat(52)}`);
console.log(`verify_scope_toggle.mjs: ${R.pass}/${R.pass + R.fail} PASS`);
if (R.fail > 0) console.error(`  ${R.fail} test(s) FAILED`);
console.log('═'.repeat(52));
