/**
 * verify_ms_tasks.mjs — Milestone → Task drill-down feature test
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3030';
const PASS = (msg) => console.log('✅', msg);
const FAIL = (msg) => { console.error('❌', msg); process.exitCode = 1; };
const INFO = (msg) => console.log('   ', msg);

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();

const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(e.message));

/* ── Step 1: load page, inject auth + db into localStorage ── */
await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');

await page.evaluate(() => {
  // Correct auth session format: { token, user, exp }
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'test-token',
    user: { username: 'admin', displayName: 'Admin Test', role: 'Admin', team: 'Số' },
    exp: Date.now() + 3600 * 1000
  }));

  // db with test data
  localStorage.setItem('shtd_v2', JSON.stringify({
    tasks: [
      // T-001: exact full ID match → Phù hợp
      { id:'T-001', name:'Task Alpha', initiative:'INI-001', milestone:'INI-001-M1',
        state:'Đang làm', picRes:'TuanTT', progress:50, endDate:'2026-07-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'TuanTT', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
      // T-002: short label M1 (same initiative) → Liên kết lỏng
      { id:'T-002', name:'Task Beta', initiative:'INI-001', milestone:'M1',
        state:'Chưa bắt đầu', picRes:'MaiTTT', progress:0, endDate:'2026-08-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'MaiTTT', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
      // T-003: cross-initiative → Cần xem lại
      { id:'T-003', name:'Task Gamma', initiative:'INI-002', milestone:'INI-001-M1',
        state:'Hoàn thành', picRes:'NhungNTH', progress:100, endDate:'2026-05-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'NhungNTH', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
      // T-004: linked to M2 → Phù hợp (exact)
      { id:'T-004', name:'Task Delta', initiative:'INI-001', milestone:'INI-001-M2',
        state:'Đang làm', picRes:'TuanTT', progress:30, endDate:'2026-09-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'TuanTT', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
    ],
    initiatives: [
      { id:'INI-001', name:'Initiative Test 1', type:'initiative', parentId:null,
        category:'Số hóa', accountable:'TuanTT', startDate:'2026-01-01',
        deadline:'2026-12-31', pct:40, status:'Active',
        milestoneTracking:'M1', milestoneDeadline:'2026-07-01',
        kpiTarget:'Test KPI', notes:'', docLink:'' },
      { id:'INI-001-M1', name:'Milestone 1', type:'milestone', parentId:'INI-001',
        category:'', accountable:'', startDate:'', deadline:'2026-07-01',
        pct:50, status:'Đang làm', milestoneTracking:'', milestoneDeadline:'',
        kpiTarget:'', notes:'', docLink:'' },
      { id:'INI-001-M2', name:'Milestone 2', type:'milestone', parentId:'INI-001',
        category:'', accountable:'', startDate:'', deadline:'2026-09-01',
        pct:30, status:'Chưa bắt đầu', milestoneTracking:'', milestoneDeadline:'',
        kpiTarget:'', notes:'', docLink:'' },
      { id:'INI-002', name:'Initiative Test 2', type:'initiative', parentId:null,
        category:'Sản phẩm', accountable:'MaiTTT', startDate:'2026-01-01',
        deadline:'2026-12-31', pct:20, status:'Active',
        milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
    ],
    _serverTs: null,
  }));
});

/* ── Step 2: reload so the app boots with auth + db data ── */
await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1200);

/* ── Step 3: check if app shows login or main app ── */
const bodyClass = await page.evaluate(() => document.body.className);
const loginVisible = await page.$eval('#loginScreen', el => el.style.display !== 'none').catch(() => false);
INFO(`body class: "${bodyClass}", login visible: ${loginVisible}`);

if (loginVisible) {
  // App is showing login — auth didn't take, inject directly
  INFO('Login screen visible — injecting db+auth directly into live app');
  await page.evaluate(() => {
    // Disable GAS calls
    window.GS_WEBAPP_URL = '';
    // Inject test db
    db.tasks = [
      { id:'T-001', name:'Task Alpha', initiative:'INI-001', milestone:'INI-001-M1',
        state:'Đang làm', picRes:'TuanTT', progress:50, endDate:'2026-07-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'TuanTT', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
      { id:'T-002', name:'Task Beta', initiative:'INI-001', milestone:'M1',
        state:'Chưa bắt đầu', picRes:'MaiTTT', progress:0, endDate:'2026-08-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'MaiTTT', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
      { id:'T-003', name:'Task Gamma', initiative:'INI-002', milestone:'INI-001-M1',
        state:'Hoàn thành', picRes:'NhungNTH', progress:100, endDate:'2026-05-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'NhungNTH', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
      { id:'T-004', name:'Task Delta', initiative:'INI-001', milestone:'INI-001-M2',
        state:'Đang làm', picRes:'TuanTT', progress:30, endDate:'2026-09-01',
        tuanBC:'', category:'', team:'Số', teamPhoiHop:'', type:'Task',
        picAcc:'TuanTT', picSupport:'', startDate:'2026-01-01',
        result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', crossTeam:'N', highlight:'N' },
    ];
    db.initiatives = [
      { id:'INI-001', name:'Initiative Test 1', type:'initiative', parentId:null,
        category:'Số hóa', accountable:'TuanTT', startDate:'2026-01-01',
        deadline:'2026-12-31', pct:40, status:'Active',
        milestoneTracking:'M1', milestoneDeadline:'2026-07-01',
        kpiTarget:'Test KPI', notes:'', docLink:'' },
      { id:'INI-001-M1', name:'Milestone 1', type:'milestone', parentId:'INI-001',
        category:'', accountable:'', startDate:'', deadline:'2026-07-01',
        pct:50, status:'Đang làm', milestoneTracking:'', milestoneDeadline:'',
        kpiTarget:'', notes:'', docLink:'' },
      { id:'INI-001-M2', name:'Milestone 2', type:'milestone', parentId:'INI-001',
        category:'', accountable:'', startDate:'', deadline:'2026-09-01',
        pct:30, status:'Chưa bắt đầu', milestoneTracking:'', milestoneDeadline:'',
        kpiTarget:'', notes:'', docLink:'' },
      { id:'INI-002', name:'Initiative Test 2', type:'initiative', parentId:null,
        category:'Sản phẩm', accountable:'MaiTTT', startDate:'2026-01-01',
        deadline:'2026-12-31', pct:20, status:'Active',
        milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
    ];
    // Apply admin role and show app
    document.body.dataset.role = 'Admin';
    if (typeof hideLoginScreen === 'function') hideLoginScreen();
    if (typeof navigateTo === 'function') navigateTo('initiative-tracker');
  });
} else {
  // Logged in — just navigate
  await page.evaluate(() => {
    window.GS_WEBAPP_URL = '';
    if (typeof navigateTo === 'function') navigateTo('initiative-tracker');
  });
}
await page.waitForTimeout(800);

/* ── Hide loginOverlay if still visible ── */
await page.evaluate(() => {
  const lo = document.getElementById('loginOverlay');
  if (lo) lo.style.display = 'none';
  const ls = document.getElementById('loginScreen');
  if (ls) ls.style.display = 'none';
});

/* ── Check initiative tracker root is visible ── */
const rootVisible = await page.$eval('#initiativeTrackerRoot', el => el.offsetParent !== null || el.innerHTML.length > 100).catch(() => false);
INFO(`Initiative tracker root visible/populated: ${rootVisible}`);

/* ─────────────── TEST 1: Initiative card renders ─────────────── */
const cardExists = await page.$('#init-card-INI-001');
if (cardExists) PASS('T1: Initiative card INI-001 rendered');
else {
  FAIL('T1: Initiative card INI-001 not found — forcing direct render');
  await page.evaluate(() => renderInitiativeTracker());
  await page.waitForTimeout(400);
}

/* ─────────────── TEST 2: Open Milestones panel ─────────────── */
await page.evaluate(() => _initToggleMilestones('INI-001'));
await page.waitForTimeout(300);

const msListOpen = await page.$eval('#ms-list-INI-001', el => el.classList.contains('open')).catch(() => false);
if (msListOpen) PASS('T2: Milestones panel opened');
else FAIL('T2: Milestones panel did not open');

/* ─────────────── TEST 3: Task count buttons present ─────────────── */
const btnM1Exists = await page.$('#ms-task-btn-INI-001-M1') !== null;
const btnM2Exists = await page.$('#ms-task-btn-INI-001-M2') !== null;
if (btnM1Exists) PASS('T3a: Task count button present on INI-001-M1');
else FAIL('T3a: Task count button missing on INI-001-M1');
if (btnM2Exists) PASS('T3b: Task count button present on INI-001-M2');
else FAIL('T3b: Task count button missing on INI-001-M2');

/* ─────────────── TEST 4: Button shows correct task count ─────────────── */
const btnM1Text = await page.$eval('#ms-task-btn-INI-001-M1', el => el.textContent.trim()).catch(() => '');
INFO(`M1 button text: "${btnM1Text}"`);
// M1: T-001 (exact), T-002 (loose M1→same init), T-003 (cross-init exact) = 3
if (btnM1Text.includes('3')) PASS('T4a: M1 task count = 3');
else FAIL(`T4a: M1 task count unexpected: "${btnM1Text}" (expected 3)`);

const btnM2Text = await page.$eval('#ms-task-btn-INI-001-M2', el => el.textContent.trim()).catch(() => '');
INFO(`M2 button text: "${btnM2Text}"`);
if (btnM2Text.includes('1')) PASS('T4b: M2 task count = 1');
else FAIL(`T4b: M2 task count unexpected: "${btnM2Text}" (expected 1)`);

/* ─────────────── TEST 5: Expand M1 sub-panel ─────────────── */
if (btnM1Exists) {
  await page.evaluate(() => _initToggleMsTaskPanel('INI-001-M1'));
  await page.waitForTimeout(300);
}
const panelOpen = await page.$eval('#ms-tasks-INI-001-M1', el => el.classList.contains('open')).catch(() => false);
if (panelOpen) PASS('T5: M1 task sub-panel expanded on click');
else FAIL('T5: M1 task sub-panel did not open');

/* ─────────────── TEST 6: Alignment badges (check by CSS class) ─────────────── */
const panelHtml = await page.$eval('#ms-tasks-INI-001-M1', el => el.innerHTML).catch(() => '');
const hasOk    = panelHtml.includes('init-align-badge ok');
const hasLoose = panelHtml.includes('init-align-badge loose');
const hasWarn  = panelHtml.includes('init-align-badge warn');

if (hasOk)    PASS('T6a: Badge .ok (Phù hợp) present — T-001 exact match');
else FAIL('T6a: Badge .ok (Phù hợp) missing');
if (hasLoose) PASS('T6b: Badge .loose (Liên kết lỏng) present — T-002 short label');
else FAIL('T6b: Badge .loose (Liên kết lỏng) missing');
if (hasWarn)  PASS('T6c: Badge .warn (Cần xem lại) present — T-003 cross-initiative');
else FAIL('T6c: Badge .warn (Cần xem lại) missing');

/* ─────────────── TEST 7: "Cập nhật link" button present ─────────────── */
const fixBtnExists = await page.$('.init-fix-link-btn') !== null;
if (fixBtnExists) PASS('T7: "Cập nhật link" button present');
else FAIL('T7: "Cập nhật link" button not found');

/* ─────────────── TEST 8: Auto-update loose link ─────────────── */
const milestoneBefore = await page.evaluate(() =>
  (db.tasks || []).find(t => t.id === 'T-002')?.milestone
);
INFO(`T-002.milestone before fix: "${milestoneBefore}"`);

if (fixBtnExists) {
  await page.evaluate(() => {
    const btn = document.querySelector('.init-fix-link-btn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);
}
const milestoneAfter = await page.evaluate(() =>
  (db.tasks || []).find(t => t.id === 'T-002')?.milestone
);
INFO(`T-002.milestone after fix: "${milestoneAfter}"`);
if (milestoneAfter === 'INI-001-M1') PASS('T8: T-002 updated "M1" → "INI-001-M1"');
else FAIL(`T8: T-002 not updated — got "${milestoneAfter}"`);

/* ─────────────── TEST 9: Panel re-renders, stays open ─────────────── */
const panelStillOpen = await page.$eval('#ms-tasks-INI-001-M1', el => el.classList.contains('open')).catch(() => false);
if (panelStillOpen) PASS('T9: Panel stays open after fix');
else FAIL('T9: Panel closed after fix (should stay open)');

const htmlAfterFix = await page.$eval('#ms-tasks-INI-001-M1', el => el.innerHTML).catch(() => '');
const looseGone  = !htmlAfterFix.includes('init-align-badge loose');
const okCount    = (htmlAfterFix.match(/init-align-badge ok/g) || []).length;
INFO(`Loose badge after fix: ${looseGone ? 'gone' : 'still present'}`);
INFO(`.ok badge count after fix: ${okCount}`);
if (looseGone)  PASS('T9a: .loose badge removed after fix');
else FAIL('T9a: .loose badge still present after fix');
if (okCount >= 2) PASS(`T9b: .ok badge count = ${okCount} (T-001 + T-002 both exact)`);
else FAIL(`T9b: Expected >=2 .ok badges after fix, got ${okCount}`);

/* ─────────────── TEST 10: Collapse panel ─────────────── */
const taskBtnNow = await page.$('#ms-task-btn-INI-001-M1');
if (taskBtnNow) {
  await page.evaluate(() => _initToggleMsTaskPanel('INI-001-M1'));
  await page.waitForTimeout(200);
  const closed = await page.$eval('#ms-tasks-INI-001-M1', el => !el.classList.contains('open')).catch(() => true);
  if (closed) PASS('T10: Panel collapses on second click');
  else FAIL('T10: Panel did not collapse');
}

/* ─────────────── TEST 11: M2 panel ─────────────── */
if (btnM2Exists) {
  await page.evaluate(() => _initToggleMsTaskPanel('INI-001-M2'));
  await page.waitForTimeout(300);
  const m2Html = await page.$eval('#ms-tasks-INI-001-M2', el => el.innerHTML).catch(() => '');
  if (m2Html.includes('T-004')) PASS('T11: M2 panel shows T-004 correctly');
  else FAIL('T11: M2 panel missing T-004');
  if (m2Html.includes('Phù hợp')) PASS('T11b: T-004 correctly shows "Phù hợp" badge');
  else FAIL('T11b: T-004 missing "Phù hợp" badge');
}

/* ─────────────── TEST 12: warn CSS class on M1 button ─────────────── */
const m1BtnClass = await page.$eval('#ms-task-btn-INI-001-M1', el => el.className).catch(() => '');
INFO(`M1 btn classes: "${m1BtnClass}"`);
if (m1BtnClass.includes('warn')) PASS('T12: M1 btn has "warn" class (T-003 cross-init remains)');
else FAIL('T12: M1 btn should have "warn" class due to T-003');

/* ─────────────── Screenshot ─────────────── */
// Re-open M1 for screenshot
await page.evaluate(() => {
  _initToggleMilestones('INI-001');
  setTimeout(() => _initToggleMsTaskPanel('INI-001-M1'), 100);
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'verify_ms_tasks.png', fullPage: false });
INFO('Screenshot: verify_ms_tasks.png');

/* ─────────────── JS Errors ─────────────── */
if (consoleErrors.length === 0) PASS('No JS console errors');
else consoleErrors.forEach(e => FAIL(`JS error: ${e}`));

await browser.close();
console.log('');
console.log(process.exitCode ? '== SOME TESTS FAILED ==' : '== ALL TESTS PASSED ==');
