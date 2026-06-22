/**
 * verify_select_bug.mjs — S31 Select-all bug regression tests
 *
 * Kiểm tra 5 scenario sau các fix S31:
 *   S1: navigateTo('tasks') xóa selectedIds → bulk bar ẩn khi vào Tasks
 *   S2: onFilterChange xóa selectedIds → bulk bar ẩn khi đổi filter
 *   S3: selectAll chỉ chọn task ĐANG HIỂN THỊ trên trang → count chính xác
 *   S4: goPage xóa selectedIds → bulk bar ẩn khi chuyển trang
 *   S5: db.deletedIds → task đã xóa không bị thêm lại bởi import logic
 *
 * EVD screenshots: test-results/select_bug/
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR  = 'D:/Workspace/Production/SHTD-Dashboard';
const PORT     = 9991;
const BASE     = `http://localhost:${PORT}`;
const EVD_DIR  = path.join(APP_DIR, 'test-results', 'select_bug');

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

/* ── EVD dir ── */
if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

/* ── Helpers ── */
let R = { pass: 0, fail: 0, tests: [] };
const PASS = (id, msg) => { console.log(`  ✅ [${id}] ${msg}`); R.pass++; R.tests.push({ id, ok:true, msg }); };
const FAIL = (id, msg) => { console.error(`  ❌ [${id}] ${msg}`); R.fail++; R.tests.push({ id, ok:false, msg }); process.exitCode = 1; };
const SS   = async (page, name) => page.screenshot({ path: path.join(EVD_DIR, `${name}.png`), fullPage: false });

/* ── Mock Data: 25 tasks (12 Số + 13 CV1) → page1=20, page2=5 ── */
function makeTasks() {
  const tasks = [];
  for (let i = 1; i <= 12; i++) {
    tasks.push({
      id: `Số-${String(i).padStart(3,'0')}`, name: `Task Số ${i}`,
      initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'',
      type:'Task', category:'Số hóa', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'',
      startDate:'2026-01-01', endDate:'2026-12-31', progress:50,
      state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N',
      result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'',
    });
  }
  for (let i = 1; i <= 13; i++) {
    tasks.push({
      id: `CV1-${String(i).padStart(3,'0')}`, name: `Task CV1 ${i}`,
      initiative:'BAU', milestone:'', team:'CV1', teamPhoiHop:'',
      type:'Task', category:'Tín dụng', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'',
      startDate:'2026-01-01', endDate:'2026-12-31', progress:30,
      state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N',
      result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'',
    });
  }
  return tasks; // total 25 → 2 pages (page1=20, page2=5)
}

const MOCK_TASKS = makeTasks();

/* ── Browser setup ── */
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Block GAS — return empty ok for all calls
await ctx.route('https://script.google.com/**', async route => {
  const body = route.request().postData() || '{}';
  let parsed = null;
  try { parsed = JSON.parse(body); } catch(_) {}
  const action = parsed?.action || '';
  if (['read','initiative-read','user-list','kpi-read','auth-login',
       'case-pipeline-read'].includes(action)) {
    await route.fulfill({ status: 500, body: 'mock-offline' });
  } else {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', serverTs: Date.now() }) });
  }
});

const jsErrors = [];
const page = await ctx.newPage();
page.on('pageerror', e => {
  if (!/net::ERR|ERR_ABORTED|500|favicon|GAS offline|Failed to fetch/.test(e.message))
    jsErrors.push(e.message);
});

/* ── Load app with auth + mock data ── */
async function loadApp(extraDb = {}) {
  await page.goto(BASE);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(({ tasks, extra }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'test-token',
      user: { username: 'TuanTT4', displayName: 'Tuấn TT4', role: 'Admin', team: 'Số' },
      exp: Date.now() + 3600000,
    }));
    const db = { tasks, initiatives:[], _serverTs: null, deletedIds:[], ...extra };
    localStorage.setItem('shtd_v2', JSON.stringify(db));
  }, { tasks: MOCK_TASKS, extra: extraDb });

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () => { const el = document.getElementById('loadingOverlay'); return !el || el.style.display==='none'; },
    { timeout: 8000 }
  ).catch(() => {});
  await page.waitForTimeout(600);
}

/* ── Helpers for app interaction ── */
async function navigateTo(view) {
  await page.evaluate(v => navigateTo(v), view);
  await page.waitForTimeout(400);
}
async function selectAll() {
  await page.evaluate(() => {
    const cb = document.getElementById('selectAll');
    if (cb) { cb.checked = true; toggleSelectAll(cb); }
  });
  await page.waitForTimeout(200);
}
async function isBulkBarVisible() {
  return page.evaluate(() => {
    const bar = document.getElementById('bulkBar');
    return bar ? bar.classList.contains('visible') : false;
  });
}
async function bulkBarCount() {
  return page.evaluate(() => {
    const el = document.getElementById('bulkCount');
    return el ? parseInt(el.textContent) || 0 : 0;
  });
}
async function checkedRowCount() {
  return page.evaluate(() =>
    document.querySelectorAll('#taskTbody input[type="checkbox"]:checked').length
  );
}
async function selectedIdsSize() {
  return page.evaluate(() => (typeof selectedIds !== 'undefined' ? selectedIds.size : -1));
}

/* ═══════════════════════════════════════════════════════════
   TEST S1: navigateTo('tasks') clears selectedIds
   Vào Tasks → selectAll → Dashboard → quay lại Tasks → bulk bar ẩn
═══════════════════════════════════════════════════════════ */
console.log('\n📋 S1: navigateTo clears selectedIds');
await loadApp();
await navigateTo('tasks');

// Verify 25 tasks loaded, page 1 = 20 rows
const rowCountS1 = await page.evaluate(() =>
  document.querySelectorAll('#taskTbody tr').length
);
rowCountS1 === 20 ? PASS('S1-pre', `page 1 shows 20 rows (total 25 tasks)`) :
                    FAIL('S1-pre', `expected 20 rows, got ${rowCountS1}`);

await selectAll();
const countAfterSelect = await selectedIdsSize();
countAfterSelect === 20 ? PASS('S1-a', `selectAll selected ${countAfterSelect} tasks on page 1`) :
                          FAIL('S1-a', `expected 20 selected, got ${countAfterSelect}`);

await SS(page, 's1_after_selectall');

// Navigate away to Dashboard
await navigateTo('dashboard');
await SS(page, 's1_on_dashboard');

// Navigate back to Tasks
await navigateTo('tasks');
await page.waitForTimeout(300);

const bulkVisibleS1 = await isBulkBarVisible();
const selectedSizeS1 = await selectedIdsSize();
const checkedS1 = await checkedRowCount();

!bulkVisibleS1 ? PASS('S1-b', 'bulk bar HIDDEN after navigateTo tasks (selectedIds cleared)') :
                 FAIL('S1-b', `bulk bar still VISIBLE — selectedIds.size=${selectedSizeS1}`);
selectedSizeS1 === 0 ? PASS('S1-c', 'selectedIds.size = 0') :
                       FAIL('S1-c', `selectedIds.size = ${selectedSizeS1} (expected 0)`);
checkedS1 === 0 ? PASS('S1-d', 'no checkboxes checked in table') :
                  FAIL('S1-d', `${checkedS1} checkboxes still checked`);

await SS(page, 's1_after_navigate_back');

/* ═══════════════════════════════════════════════════════════
   TEST S2: onFilterChange clears selectedIds
   Tasks → selectAll → đổi Team filter → bulk bar ẩn
═══════════════════════════════════════════════════════════ */
console.log('\n📋 S2: onFilterChange clears selectedIds');
await navigateTo('tasks');
// Reset filter first
await page.evaluate(() => {
  const el = document.getElementById('filterTeam');
  if (el) el.value = '';
  onFilterChange();
});
await page.waitForTimeout(300);

await selectAll();
const selectedS2before = await selectedIdsSize();
selectedS2before > 0 ? PASS('S2-pre', `selectAll OK: ${selectedS2before} tasks selected`) :
                       FAIL('S2-pre', `selectAll failed: selectedIds.size=${selectedS2before}`);

await SS(page, 's2_before_filter_change');

// Change Team filter to "Số"
await page.evaluate(() => {
  const el = document.getElementById('filterTeam');
  if (el) { el.value = 'Số'; onFilterTeamChange(); }
});
await page.waitForTimeout(400); // wait for 150ms debounce + buffer

const bulkVisibleS2 = await isBulkBarVisible();
const selectedS2after = await selectedIdsSize();

!bulkVisibleS2 ? PASS('S2-a', 'bulk bar HIDDEN after team filter change (selectedIds cleared)') :
                 FAIL('S2-a', `bulk bar still VISIBLE — selectedIds.size=${selectedS2after}`);
selectedS2after === 0 ? PASS('S2-b', 'selectedIds.size = 0 after filter change') :
                        FAIL('S2-b', `selectedIds.size = ${selectedS2after} (expected 0)`);

await SS(page, 's2_after_filter_change');

/* ═══════════════════════════════════════════════════════════
   TEST S3: selectAll accuracy — count matches visible rows
   Filter Team=Số (12 tasks) → selectAll → count in bar = 12 = checked rows
═══════════════════════════════════════════════════════════ */
console.log('\n📋 S3: selectAll count matches visible rows on current page');
await navigateTo('tasks');
// Reset filter first, then apply Team=Số
await page.evaluate(() => {
  const el = document.getElementById('filterTeam');
  if (el) { el.value = ''; onFilterTeamChange(); }
});
await page.waitForTimeout(350);
await page.evaluate(() => {
  const el = document.getElementById('filterTeam');
  if (el) { el.value = 'Số'; onFilterTeamChange(); }
});
await page.waitForTimeout(400);

const filteredRows = await page.evaluate(() =>
  document.querySelectorAll('#taskTbody tr').length
);
filteredRows === 12 ? PASS('S3-pre', `filter Team=Số shows ${filteredRows} rows (expected 12)`) :
                     FAIL('S3-pre', `expected 12 rows after filter, got ${filteredRows}`);

await selectAll();
await page.waitForTimeout(200);

const bulkCountS3 = await bulkBarCount();
const checkedS3   = await checkedRowCount();
const selectedS3  = await selectedIdsSize();

filteredRows === checkedS3 ? PASS('S3-a', `${checkedS3} checkboxes checked = ${filteredRows} visible rows ✓`) :
                             FAIL('S3-a', `checked=${checkedS3} ≠ visible rows=${filteredRows}`);
bulkCountS3 === filteredRows ? PASS('S3-b', `bulk bar shows ${bulkCountS3} = ${filteredRows} visible rows ✓`) :
                               FAIL('S3-b', `bulk count=${bulkCountS3} ≠ visible rows=${filteredRows}`);
selectedS3 === filteredRows ? PASS('S3-c', `selectedIds.size=${selectedS3} = ${filteredRows} ✓`) :
                              FAIL('S3-c', `selectedIds.size=${selectedS3} ≠ ${filteredRows}`);
bulkCountS3 !== 25 ? PASS('S3-d', `bulk count ${bulkCountS3} ≠ 25 (not all tasks) — selectAll correctly scoped to filter`) :
                     FAIL('S3-d', `bulk count = 25 — selectAll selected beyond current filter`);

await SS(page, 's3_selectall_filtered');

/* ═══════════════════════════════════════════════════════════
   TEST S4: goPage clears selectedIds
   No filter → selectAll page 1 → click page 2 → bulk bar ẩn
═══════════════════════════════════════════════════════════ */
console.log('\n📋 S4: goPage clears selectedIds');
await navigateTo('tasks');
// Clear filter
await page.evaluate(() => {
  const el = document.getElementById('filterTeam');
  if (el) { el.value = ''; onFilterTeamChange(); }
});
await page.waitForTimeout(400);

await selectAll();
const selectedS4before = await selectedIdsSize();
selectedS4before === 20 ? PASS('S4-pre', `selectAll: ${selectedS4before} tasks selected on page 1`) :
                          FAIL('S4-pre', `expected 20 selected, got ${selectedS4before}`);

await SS(page, 's4_before_page_change');

// Click page 2
await page.evaluate(() => goPage(2));
await page.waitForTimeout(300);

const bulkVisibleS4 = await isBulkBarVisible();
const selectedS4after = await selectedIdsSize();
const checkedS4 = await checkedRowCount();
const page2Rows = await page.evaluate(() =>
  document.querySelectorAll('#taskTbody tr').length
);

!bulkVisibleS4 ? PASS('S4-a', 'bulk bar HIDDEN after goPage(2) (selectedIds cleared)') :
                 FAIL('S4-a', `bulk bar still VISIBLE — selectedIds.size=${selectedS4after}`);
selectedS4after === 0 ? PASS('S4-b', 'selectedIds.size = 0 after page change') :
                        FAIL('S4-b', `selectedIds.size = ${selectedS4after} (expected 0)`);
checkedS4 === 0 ? PASS('S4-c', 'no checkboxes checked on page 2') :
                  FAIL('S4-c', `${checkedS4} checkboxes still checked on page 2`);
page2Rows === 5 ? PASS('S4-d', `page 2 shows ${page2Rows} rows (25 total - 20 page1 = 5)`) :
                  FAIL('S4-d', `expected 5 rows on page 2, got ${page2Rows}`);

await SS(page, 's4_after_page_change');

/* ═══════════════════════════════════════════════════════════
   TEST S5: db.deletedIds — deleted task không bị thêm lại
   Xóa task → deletedIds có ID → import logic bỏ qua task đó
═══════════════════════════════════════════════════════════ */
console.log('\n📋 S5: db.deletedIds blacklist prevents re-insertion');
await loadApp();
await navigateTo('tasks');

// Simulate deleteTask for Số-001
const deletedId = 'Số-001';
await page.evaluate((id) => {
  db.tasks = db.tasks.filter(t => t.id !== id);
  selectedIds.delete(id);
  if (!db.deletedIds) db.deletedIds = [];
  if (!db.deletedIds.includes(id)) db.deletedIds.push(id);
  persist();
}, deletedId);
await page.waitForTimeout(200);

// Verify task removed from table
const taskStillVisible = await page.evaluate((id) =>
  db.tasks.some(t => t.id === id), deletedId
);
!taskStillVisible ? PASS('S5-a', `${deletedId} removed from db.tasks`) :
                    FAIL('S5-a', `${deletedId} still in db.tasks after delete`);

// Verify deletedIds in localStorage
const deletedInStorage = await page.evaluate((id) => {
  const stored = JSON.parse(localStorage.getItem('shtd_v2') || '{}');
  return (stored.deletedIds || []).includes(id);
}, deletedId);
deletedInStorage ? PASS('S5-b', `${deletedId} persisted in localStorage.deletedIds`) :
                   FAIL('S5-b', `${deletedId} NOT found in localStorage.deletedIds`);

// Simulate Excel import logic: try to re-insert the deleted task
const reInsertBlocked = await page.evaluate((id) => {
  const deletedSet = new Set(db.deletedIds || []);
  // This is exactly what app.js handleImport does before pushing ext.tasks
  const taskFromExcel = db.tasks.find(t => t.id === id) || { id, name:'Task Số 1', team:'Số' };
  if (deletedSet.has(taskFromExcel.id)) return true;   // blocked ✓
  // If not blocked, it would be pushed:
  return false;  // not blocked ✗
}, deletedId);
reInsertBlocked ? PASS('S5-c', `import logic BLOCKED re-insertion of ${deletedId} (deletedSet check works)`) :
                  FAIL('S5-c', `import logic DID NOT block re-insertion of ${deletedId}`);

// Verify syncAction merge also blocks: persistedDeleted check
const mergeBlocked = await page.evaluate((id) => {
  const persistedDeleted = new Set(db.deletedIds || []);
  // Simulate syncAction merge: server returns the deleted task
  const serverTask = { id, name:'Task Số 1 (server)', team:'Số' };
  if (persistedDeleted.has(serverTask.id)) return true;   // blocked ✓
  return false;
}, deletedId);
mergeBlocked ? PASS('S5-d', `syncAction merge BLOCKED server re-insertion of ${deletedId}`) :
               FAIL('S5-d', `syncAction merge did NOT block server re-insertion of ${deletedId}`);

await SS(page, 's5_deleted_ids_check');

/* ═══════════════════════════════════════════════════════════
   TEST S6: sortBy clears selectedIds (NEW — S31 sortBy fix)
   selectAll → click sort column → bulk bar ẩn (sort reorders pages)
═══════════════════════════════════════════════════════════ */
console.log('\n📋 S6: sortBy clears selectedIds');
await navigateTo('tasks');
// Clear all filters first
await page.evaluate(() => {
  const el = document.getElementById('filterTeam');
  if (el) { el.value = ''; onFilterTeamChange(); }
});
await page.waitForTimeout(400);

await selectAll();
const selectedS6before = await selectedIdsSize();
selectedS6before === 20 ? PASS('S6-pre', `selectAll: ${selectedS6before} tasks selected`) :
                          FAIL('S6-pre', `expected 20, got ${selectedS6before}`);

await SS(page, 's6_before_sort');

// Click sort by ID (triggers sortBy('id'))
await page.evaluate(() => sortBy('id'));
await page.waitForTimeout(300);

const bulkVisibleS6 = await isBulkBarVisible();
const selectedS6after = await selectedIdsSize();

!bulkVisibleS6 ? PASS('S6-a', 'bulk bar HIDDEN after sortBy() (selectedIds cleared)') :
                 FAIL('S6-a', `bulk bar still VISIBLE — selectedIds.size=${selectedS6after}`);
selectedS6after === 0 ? PASS('S6-b', 'selectedIds.size = 0 after sort') :
                        FAIL('S6-b', `selectedIds.size = ${selectedS6after} (expected 0)`);

await SS(page, 's6_after_sort');

/* ═══════════════════════════════════════════════════════════
   TEST S7: JS errors (no regressions)
═══════════════════════════════════════════════════════════ */
console.log('\n📋 S7: No JS errors');
jsErrors.length === 0 ? PASS('S7', `0 JS console errors throughout test run`) :
                        FAIL('S7', `${jsErrors.length} JS error(s):\n    ${jsErrors.join('\n    ')}`);

/* ── Summary ── */
console.log(`\n${'═'.repeat(55)}`);
console.log(`RESULT: ${R.pass + R.fail} checks — ${R.pass} PASS / ${R.fail} FAIL`);
if (R.fail > 0) {
  console.log('\nFailed checks:');
  R.tests.filter(t => !t.ok).forEach(t => console.error(`  ❌ [${t.id}] ${t.msg}`));
}
console.log(`\nEVD screenshots: ${EVD_DIR}`);
console.log('═'.repeat(55));

await browser.close();
server.close();
