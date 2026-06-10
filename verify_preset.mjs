/**
 * verify_preset.mjs — Preset Tab Bar feature tests
 * Tests: UI render, badge counts, filter logic (AND), clearFilters, localStorage persist
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3030';
const PASS = msg => console.log('✅', msg);
const FAIL = msg => { console.error('❌', msg); process.exitCode = 1; };
const INFO = msg => console.log('   ', msg);

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
const jsErrors = [];
page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
page.on('pageerror', e => jsErrors.push(e.message));

// ── Test data: 10 tasks với trạng thái, tuanBC, deadline đa dạng ─────────────
const today = new Date();
const pastDate  = d => { const x = new Date(today); x.setDate(x.getDate()-d); return x.toISOString().slice(0,10); };
const futureDate= d => { const x = new Date(today); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };
const jan4 = new Date(today.getFullYear(), 0, 4);
const wkNum = Math.ceil(((today - jan4) / 86400000 + jan4.getDay() + 1) / 7);
const THIS_WEEK = `Tuần ${String(wkNum).padStart(2,'0')}/${today.getFullYear()}`;
const LAST_WEEK = `Tuần ${String(wkNum-1).padStart(2,'0')}/${today.getFullYear()}`;

const mkTask = (id, state, endDate, tuanBC='') => ({
  id, name:`Task ${id}`, initiative:'INI-001', milestone:'', team:'Số',
  picRes:'TuanTT4', picAcc:'TuanTT4', picSupport:'', startDate:pastDate(30),
  endDate, progress: state === 'Hoàn thành' ? 100 : 30,
  state, status:'Green', type:'Task', category:'AI/Năng suất',
  crossTeam:'N', highlight:'N', tuanBC, teamPhoiHop:'',
  result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'',
});

const TEST_TASKS = [
  mkTask('T-001', 'Đang thực hiện', futureDate(10), THIS_WEEK),   // active, tuần này
  mkTask('T-002', 'Đang thực hiện', pastDate(5),   THIS_WEEK),    // active, quá hạn, tuần này
  mkTask('T-003', 'Chưa bắt đầu',   futureDate(20), ''),          // active
  mkTask('T-004', 'Blocked',         pastDate(2),   ''),           // active, quá hạn
  mkTask('T-005', 'Tạm dừng',        futureDate(5), ''),           // paused → ẩn ở "Đang làm"
  mkTask('T-006', 'Hoàn thành',      pastDate(10),  LAST_WEEK),   // done → ẩn ở "Đang làm"
  mkTask('T-007', 'Hoàn thành',      pastDate(20),  ''),           // done
  mkTask('T-008', 'Hoàn thành',      pastDate(30),  ''),           // done
  mkTask('T-009', 'Đang thực hiện',  futureDate(15), LAST_WEEK),  // active, không phải tuần này
  mkTask('T-010', 'Hoàn thành chuẩn bị', pastDate(1), THIS_WEEK), // active, quá hạn, tuần này
];
// Expected counts:
// active  = T-001,T-002,T-003,T-004,T-009,T-010 → 6  (không gồm Tạm dừng T-005 và Hoàn thành T-006..8)
// week    = T-001,T-002,T-010 → 3
// overdue = T-002,T-004,T-010 → 3  (progress<100 AND endDate < today)
// all     = 10

const TEST_INITIATIVES = [
  { id:'INI-001', name:'Initiative Test', parentId:null, type:'initiative',
    category:'AI/Năng suất', accountable:'TuanTT', startDate:pastDate(60),
    deadline:futureDate(90), pct:50, status:'Active',
    milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
];

/* ── Inject + load ── */
await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');

await page.evaluate((d) => {
  localStorage.removeItem('shtd_preset');
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token:'test-token',
    user:{ username:'admin', displayName:'Admin', role:'Admin', team:'Số' },
    exp: Date.now() + 3600000
  }));
  localStorage.setItem('shtd_v2', JSON.stringify({ tasks:d.tasks, initiatives:d.ini, kpi:[], _serverTs:null }));
}, { tasks: TEST_TASKS, ini: TEST_INITIATIVES });

await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1200);

const loginVisible = await page.$eval('#loginOverlay',
  el => !el.classList.contains('hidden') && el.style.display !== 'none'
).catch(() => false);

if (loginVisible) {
  await page.evaluate((d) => {
    window.GS_WEBAPP_URL = '';
    db.tasks = d.tasks; db.initiatives = d.ini; db.kpi = [];
    document.body.dataset.role = 'Admin';
    if (typeof updateFilterDropdowns === 'function') updateFilterDropdowns();
    if (typeof hideLoginScreen === 'function') hideLoginScreen();
    if (typeof navigateTo === 'function') navigateTo('tasks');
  }, { tasks: TEST_TASKS, ini: TEST_INITIATIVES });
} else {
  await page.evaluate(() => {
    window.GS_WEBAPP_URL = '';
    if (typeof navigateTo === 'function') navigateTo('tasks');
  });
}
await page.waitForTimeout(500);

/* ══ T1: Preset bar hiển thị 4 nút ══════════════════════════════════════════ */
const btnIds = ['preset-active','preset-week','preset-overdue','preset-all'];
const btnsExist = await Promise.all(btnIds.map(id => page.$(`#${id}`).then(el => !!el)));
if (btnsExist.every(Boolean)) PASS('T1: 4 preset buttons tồn tại');
else FAIL(`T1: Thiếu buttons: ${btnIds.filter((_,i)=>!btnsExist[i]).join(', ')}`);

/* ══ T2: Default preset = "active" (từ localStorage clear) ═══════════════════ */
const activeActive = await page.$eval('#preset-active', el => el.classList.contains('active'));
if (activeActive) PASS('T2: Default preset = "Đang làm" (active)');
else FAIL('T2: Default preset không phải "active"');

/* ══ T3: Badge counts đúng ═══════════════════════════════════════════════════ */
const counts = {};
for (const key of ['active','week','overdue','all']) {
  counts[key] = await page.$eval(`#pcount-${key}`, el => el.textContent.trim());
}
INFO(`Badge counts: active=${counts.active} week=${counts.week} overdue=${counts.overdue} all=${counts.all}`);

if (counts.active  === '6') PASS('T3a: Badge "Đang làm" = 6');
else FAIL(`T3a: Badge "Đang làm" kỳ vọng 6, nhận ${counts.active}`);

if (counts.week    === '3') PASS('T3b: Badge "Tuần này" = 3');
else FAIL(`T3b: Badge "Tuần này" kỳ vọng 3, nhận ${counts.week}`);

if (counts.overdue === '3') PASS('T3c: Badge "Quá hạn" = 3');
else FAIL(`T3c: Badge "Quá hạn" kỳ vọng 3, nhận ${counts.overdue}`);

if (counts.all     === '10') PASS('T3d: Badge "Tất cả" = 10');
else FAIL(`T3d: Badge "Tất cả" kỳ vọng 10, nhận ${counts.all}`);

/* ══ T4: Preset "Đang làm" — table rows đúng ════════════════════════════════ */
const rowCount = await page.$$eval('#taskTbody tr', rows => rows.length);
INFO(`Rows rendered (active preset): ${rowCount}`);
if (rowCount === 6) PASS('T4: Preset "Đang làm" hiển thị đúng 6 rows');
else FAIL(`T4: Kỳ vọng 6 rows, nhận ${rowCount}`);

// T-005 (Tạm dừng) và T-006/7/8 (Hoàn thành) không được hiển thị
const rowIds = await page.$$eval('#taskTbody td:nth-child(2)', tds => tds.map(td => td.textContent.trim()));
INFO(`Visible IDs: ${rowIds.join(', ')}`);
if (!rowIds.includes('T-005') && !rowIds.includes('T-006'))
  PASS('T4b: "Tạm dừng" và "Hoàn thành" bị ẩn ở preset "Đang làm"');
else FAIL(`T4b: Preset "Đang làm" vẫn hiện task Tạm dừng/Hoàn thành`);

/* ══ T5: Click preset "Tuần BC này" ════════════════════════════════════════  */
await page.evaluate(() => setPreset('week'));
await page.waitForTimeout(200);

const weekActive = await page.$eval('#preset-week', el => el.classList.contains('active'));
const activeOff  = await page.$eval('#preset-active', el => el.classList.contains('active'));
if (weekActive && !activeOff) PASS('T5a: Preset "Tuần này" active, "Đang làm" inactive');
else FAIL(`T5a: Active state sai — week=${weekActive} active=${activeOff}`);

const weekRows = await page.$$eval('#taskTbody tr', rows => rows.length);
if (weekRows === 3) PASS(`T5b: Preset "Tuần này" hiển thị đúng 3 rows`);
else FAIL(`T5b: Kỳ vọng 3 rows, nhận ${weekRows}`);

/* ══ T6: Click preset "Quá hạn" ════════════════════════════════════════════ */
await page.evaluate(() => setPreset('overdue'));
await page.waitForTimeout(200);

const overdueRows = await page.$$eval('#taskTbody tr', rows => rows.length);
if (overdueRows === 3) PASS(`T6: Preset "Quá hạn" hiển thị đúng 3 rows`);
else FAIL(`T6: Kỳ vọng 3 rows, nhận ${overdueRows}`);

/* ══ T7: Click preset "Tất cả" ══════════════════════════════════════════════ */
await page.evaluate(() => setPreset('all'));
await page.waitForTimeout(200);

const allRows = await page.$$eval('#taskTbody tr', rows => rows.length);
if (allRows === 10) PASS(`T7: Preset "Tất cả" hiển thị đúng 10 rows`);
else FAIL(`T7: Kỳ vọng 10 rows, nhận ${allRows}`);

/* ══ T8: Filter bar AND logic với preset ═══════════════════════════════════  */
// Preset "Đang làm" + filterState = "Hoàn thành chuẩn bị" → chỉ T-010
await page.evaluate(() => setPreset('active'));
await page.waitForTimeout(200);
await page.evaluate(() => {
  document.getElementById('filterState').value = 'Hoàn thành chuẩn bị';
  document.getElementById('filterState').dispatchEvent(new Event('change'));
});
await page.waitForTimeout(200);

const andRows = await page.$$eval('#taskTbody tr', rows => rows.length);
if (andRows === 1) PASS('T8: Preset AND filterState = 1 row (T-010)');
else FAIL(`T8: AND logic sai — kỳ vọng 1 row, nhận ${andRows}`);

/* ══ T9: clearFilters() giữ preset, chỉ reset filter bar ═══════════════════ */
await page.evaluate(() => clearFilters());
await page.waitForTimeout(200);

const afterClearPreset = await page.evaluate(() => activePreset);
const afterClearRows   = await page.$$eval('#taskTbody tr', rows => rows.length);
const presetStillActive = await page.$eval('#preset-active', el => el.classList.contains('active'));

if (afterClearPreset === 'active') PASS('T9a: clearFilters() giữ nguyên activePreset = "active"');
else FAIL(`T9a: activePreset bị reset thành "${afterClearPreset}"`);

if (afterClearRows === 6) PASS('T9b: Sau clearFilters() preset "Đang làm" vẫn lọc đúng 6 rows');
else FAIL(`T9b: Kỳ vọng 6 rows sau clear, nhận ${afterClearRows}`);

if (presetStillActive) PASS('T9c: Nút "Đang làm" vẫn có class active sau clearFilters');
else FAIL('T9c: Nút "Đang làm" mất class active sau clearFilters');

/* ══ T10: localStorage persist ══════════════════════════════════════════════ */
await page.evaluate(() => setPreset('overdue'));
await page.waitForTimeout(200);
const stored = await page.evaluate(() => localStorage.getItem('shtd_preset'));
if (stored === 'overdue') PASS('T10a: setPreset() persist đúng vào localStorage');
else FAIL(`T10a: localStorage value = "${stored}", kỳ vọng "overdue"`);

// Reload → preset được restore
await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1200);

const loginAfterReload = await page.$eval('#loginOverlay',
  el => !el.classList.contains('hidden') && el.style.display !== 'none'
).catch(() => false);
if (loginAfterReload) {
  await page.evaluate((d) => {
    window.GS_WEBAPP_URL = '';
    db.tasks = d.tasks; db.initiatives = d.ini;
    document.body.dataset.role = 'Admin';
    if (typeof updateFilterDropdowns === 'function') updateFilterDropdowns();
    if (typeof hideLoginScreen === 'function') hideLoginScreen();
    if (typeof navigateTo === 'function') navigateTo('tasks');
  }, { tasks: TEST_TASKS, ini: TEST_INITIATIVES });
  await page.waitForTimeout(400);
}

const restoredPreset = await page.evaluate(() => activePreset);
const restoredActive = await page.$eval('#preset-overdue', el => el.classList.contains('active')).catch(() => false);
if (restoredPreset === 'overdue') PASS('T10b: Preset "overdue" được restore sau reload');
else FAIL(`T10b: Preset sau reload = "${restoredPreset}", kỳ vọng "overdue"`);

if (restoredActive) PASS('T10c: Nút "Quá hạn" có class active sau reload');
else FAIL('T10c: Nút "Quá hạn" không có class active sau reload');

/* ══ JS errors ══════════════════════════════════════════════════════════════ */
if (jsErrors.length === 0) PASS('Không có JS errors');
else FAIL(`JS errors:\n  ${jsErrors.join('\n  ')}`);

await browser.close();
console.log('\n=== DONE ===');
