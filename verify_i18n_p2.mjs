/**
 * verify_i18n_p2.mjs — S43: i18n Phase 2 (State display, filter bar labels)
 * Port: 3043  |  14 tests
 *
 * Tests:
 *   IP1  STATE display: VI mode → Vietnamese state names (stateChip unchanged)
 *   IP2  STATE display: EN mode → English state names in task table chips
 *   IP3  Filter label: VI → 'Trạng thái'; EN → 'Status'
 *   IP4  Filter label: VI → 'Mã Task'; EN → 'Task ID'
 *   IP5  Preset label: VI → 'Đang làm'; EN → 'Active'
 *   IP6  Scope toggle: VI → 'Của tôi'; EN → 'Mine'
 *   IP7  Task count: VI → 'Hiển thị'; EN → 'Showing'
 *   IP8  Empty state: VI → 'Không có task'; EN → 'No tasks found'
 *   IP9  Filter chip (state): VI → 'Trạng thái: Đang thực hiện'; EN → 'Status: In Progress'
 *   IP10 filterState option value preserved in EN (still 'Đang thực hiện', not 'In Progress')
 *   IP11 Switching VI→EN→VI: filter label restores to Vietnamese
 *   IP12 tState() helper: returns correct translations
 *   IP13 stateChip() renders EN text in EN mode
 *   IP14 No JS errors throughout
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3043;
const BASE = `http://localhost:${PORT}`;

// ── local server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html':'text/html;charset=utf-8', '.js':'application/javascript;charset=utf-8',
    '.css':'text/css', '.png':'image/png', '.ico':'image/x-icon',
  }[ext] || 'text/plain';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, r));

// ── helpers ───────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const ok  = msg => { console.log(`  ✅ ${msg}`); pass++; };
const ko  = (msg, got) => { console.log(`  ❌ ${msg}${got ? ` — got: ${JSON.stringify(got)}` : ''}`); fail++; };
const chk = (label, cond, got) => cond ? ok(label) : ko(label, got);

async function injectAuth(page) {
  await page.evaluate(() => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      username: 'TuanTT4', displayName: 'Tuấn TT', role: 'Admin', team: 'Số'
    }));
    localStorage.setItem('shtd_lang', 'vi');
    // inject sample tasks with known states
    const tasks = [
      { id:'T-001', name:'Task A', state:'Chưa bắt đầu', status:'Green', team:'Số',
        picAcc:'TuanTT4', picRes:'TuanTT4', progress:0, endDate:'2026-12-31',
        initiative:'INI-01', category:'Cat1', highlight:'N', type:'Task', tuanBC:'Tuần 01/2026' },
      { id:'T-002', name:'Task B', state:'Đang thực hiện', status:'Amber', team:'Số',
        picAcc:'TuanTT4', picRes:'TuanTT4', progress:50, endDate:'2026-12-31',
        initiative:'INI-01', category:'Cat1', highlight:'Y', type:'Task', tuanBC:'Tuần 01/2026' },
      { id:'T-003', name:'Task C', state:'Hoàn thành', status:'Green', team:'Số',
        picAcc:'TuanTT4', picRes:'TuanTT4', progress:100, endDate:'2026-12-31',
        initiative:'INI-01', category:'Cat1', highlight:'N', type:'Task', tuanBC:'Tuần 01/2026' },
    ];
    localStorage.setItem('shtd_v2', JSON.stringify({ tasks, initiatives: [], _serverTs: null, deletedIds: [] }));
    localStorage.removeItem('shtd_cp_v1');
  });
}

async function setup(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await injectAuth(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.getElementById('loginOverlay').style.display = 'none';
    loadCache();           // force-load tasks from localStorage (bypasses async GAS flow)
    try { setupListeners(); } catch(e) {}
    navigateTo('tasks');
    renderTaskTable();
  });
  await page.waitForTimeout(300);
}

async function setEN(page) {
  await page.evaluate(() => { setLang('en'); navigateTo('tasks'); if (db.tasks.length === 0) loadCache(); renderTaskTable(); });
  await page.waitForTimeout(200);
}
async function setVI(page) {
  await page.evaluate(() => { setLang('vi'); navigateTo('tasks'); if (db.tasks.length === 0) loadCache(); renderTaskTable(); });
  await page.waitForTimeout(200);
}

// ── Test suite ─────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page    = await context.newPage();

const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await setup(page);

// ── IP1: VI mode stateChip shows Vietnamese ───────────────────────────────────
console.log('\nIP1: VI mode — stateChip shows Vietnamese state names');
{
  await setVI(page);
  await page.evaluate(() => { if (typeof renderTaskTable === 'function') renderTaskTable(); });
  await page.waitForTimeout(200);
  const chips = await page.$$eval('.state-chip', els => els.map(e => e.textContent.trim()));
  const hasVI = chips.some(c => c === 'Chưa bắt đầu' || c === 'Đang thực hiện' || c === 'Hoàn thành');
  chk('state-chip shows Vietnamese in VI', hasVI, chips);
}

// ── IP2: EN mode stateChip shows English ─────────────────────────────────────
console.log('\nIP2: EN mode — stateChip shows English state names');
{
  await setEN(page);
  // switch to 'all' preset to show completed tasks too
  await page.evaluate(() => { setPreset('all'); renderTaskTable(); });
  await page.waitForTimeout(200);
  const chips = await page.$$eval('.state-chip', els => els.map(e => e.textContent.trim()));
  chk('state-chip has "Not Started"',  chips.some(c => c === 'Not Started'),  chips);
  chk('state-chip has "In Progress"',  chips.some(c => c === 'In Progress'),  chips);
  chk('state-chip has "Completed"',    chips.some(c => c === 'Completed'),    chips);
  // restore preset
  await page.evaluate(() => setPreset('active'));
}

// ── IP3: Filter label State — VI/EN ──────────────────────────────────────────
console.log('\nIP3: Filter label "Trạng thái" / "Status"');
{
  await setVI(page);
  const viLabel = await page.$eval('.filter-bar .filter-label[data-i18n="filter.state"]', e => e.textContent.trim());
  chk('VI filter.state = "Trạng thái"', viLabel === 'Trạng thái', viLabel);

  await setEN(page);
  const enLabel = await page.$eval('.filter-bar .filter-label[data-i18n="filter.state"]', e => e.textContent.trim());
  chk('EN filter.state = "Status"', enLabel === 'Status', enLabel);
}

// ── IP4: Filter label ID — VI/EN ─────────────────────────────────────────────
console.log('\nIP4: Filter label "Mã Task" / "Task ID"');
{
  await setVI(page);
  const viLabel = await page.$eval('.filter-bar .filter-label[data-i18n="filter.id"]', e => e.textContent.trim());
  chk('VI filter.id = "Mã Task"', viLabel === 'Mã Task', viLabel);

  await setEN(page);
  const enLabel = await page.$eval('.filter-bar .filter-label[data-i18n="filter.id"]', e => e.textContent.trim());
  chk('EN filter.id = "Task ID"', enLabel === 'Task ID', enLabel);
}

// ── IP5: Preset label — VI/EN ────────────────────────────────────────────────
console.log('\nIP5: Preset label "Đang làm" / "Active"');
{
  await setVI(page);
  const viPreset = await page.$eval('[data-i18n="preset.active"]', e => e.textContent.trim());
  chk('VI preset.active = "Đang làm"', viPreset === 'Đang làm', viPreset);

  await setEN(page);
  const enPreset = await page.$eval('[data-i18n="preset.active"]', e => e.textContent.trim());
  chk('EN preset.active = "Active"', enPreset === 'Active', enPreset);
}

// ── IP6: Scope toggle — VI/EN ────────────────────────────────────────────────
console.log('\nIP6: Scope toggle "Của tôi" / "Mine"');
{
  await setVI(page);
  const viScope = await page.$eval('[data-i18n="task.scope.mine"]', e => e.textContent.trim());
  chk('VI task.scope.mine = "Của tôi"', viScope === 'Của tôi', viScope);

  await setEN(page);
  const enScope = await page.$eval('[data-i18n="task.scope.mine"]', e => e.textContent.trim());
  chk('EN task.scope.mine = "Mine"', enScope === 'Mine', enScope);
}

// ── IP7: Task count text — VI/EN ─────────────────────────────────────────────
console.log('\nIP7: Task count text "Hiển thị" / "Showing"');
{
  await setVI(page);
  await page.evaluate(() => { if (typeof renderTaskTable === 'function') renderTaskTable(); });
  await page.waitForTimeout(200);
  const viCount = await page.$eval('#taskCountInfo', e => e.textContent.trim());
  chk('VI count starts with "Hiển thị"', viCount.startsWith('Hiển thị'), viCount);

  await setEN(page);
  await page.evaluate(() => { if (typeof renderTaskTable === 'function') renderTaskTable(); });
  await page.waitForTimeout(200);
  const enCount = await page.$eval('#taskCountInfo', e => e.textContent.trim());
  chk('EN count starts with "Showing"', enCount.startsWith('Showing'), enCount);
  chk('EN count ends with "tasks"', enCount.includes('tasks'), enCount);
}

// ── IP8: Empty state text — VI/EN ────────────────────────────────────────────
console.log('\nIP8: Empty state text');
{
  await setVI(page);
  // Apply a filter that returns 0 results
  await page.evaluate(() => { document.getElementById('filterId').value = 'NORESULT_XYZ'; onFilterChange(); });
  await page.waitForTimeout(300);
  const viEmpty = await page.$eval('#taskTbody', e => e.textContent.trim());
  chk('VI empty contains "Không có task"', viEmpty.includes('Không có task'), viEmpty.substring(0,60));

  await setEN(page);
  await page.evaluate(() => { if (typeof renderTaskTable === 'function') renderTaskTable(); });
  await page.waitForTimeout(200);
  const enEmpty = await page.$eval('#taskTbody', e => e.textContent.trim());
  chk('EN empty contains "No tasks found"', enEmpty.includes('No tasks found'), enEmpty.substring(0,60));

  // restore filter
  await page.evaluate(() => { document.getElementById('filterId').value = ''; clearFilters(); });
  await page.waitForTimeout(200);
}

// ── IP9: Filter chip with state — VI/EN ──────────────────────────────────────
console.log('\nIP9: Filter chip state label');
{
  // set filterState to 'Đang thực hiện'
  await setVI(page);
  await page.evaluate(() => {
    document.getElementById('filterState').value = 'Đang thực hiện';
    onFilterChange();
  });
  await page.waitForTimeout(300);
  const viChip = await page.$eval('#filterChips', e => e.textContent.trim());
  chk('VI chip contains "Trạng thái"', viChip.includes('Trạng thái'), viChip.substring(0,80));
  chk('VI chip contains "Đang thực hiện"', viChip.includes('Đang thực hiện'), viChip.substring(0,80));

  await setEN(page);
  await page.evaluate(() => { if (typeof renderFilterChips === 'function') renderFilterChips(); });
  await page.waitForTimeout(200);
  const enChip = await page.$eval('#filterChips', e => e.textContent.trim());
  chk('EN chip contains "Status"', enChip.includes('Status'), enChip.substring(0,80));
  chk('EN chip contains "In Progress"', enChip.includes('In Progress'), enChip.substring(0,80));

  // clear filter
  await page.evaluate(() => { document.getElementById('filterState').value = ''; clearFilters(); });
  await page.waitForTimeout(200);
}

// ── IP10: filterState option value preserved in EN ───────────────────────────
console.log('\nIP10: filterState option value = raw Vietnamese even in EN');
{
  await setEN(page);
  const optionValues = await page.$$eval('#filterState option', opts =>
    opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
  );
  const inProgress = optionValues.find(o => o.text === 'In Progress');
  chk('EN "In Progress" option exists', !!inProgress, JSON.stringify(optionValues));
  chk('EN "In Progress" option value = "Đang thực hiện"',
    inProgress && inProgress.value === 'Đang thực hiện', inProgress?.value);
}

// ── IP11: VI → EN → VI round-trip ────────────────────────────────────────────
console.log('\nIP11: VI → EN → VI round-trip restores Vietnamese labels');
{
  await setVI(page);
  await setEN(page);
  await setVI(page);
  const viLabel = await page.$eval('[data-i18n="filter.state"]', e => e.textContent.trim());
  chk('After VI→EN→VI, filter.state = "Trạng thái"', viLabel === 'Trạng thái', viLabel);
  const viPreset = await page.$eval('[data-i18n="preset.active"]', e => e.textContent.trim());
  chk('After VI→EN→VI, preset.active = "Đang làm"', viPreset === 'Đang làm', viPreset);
}

// ── IP12: tState() helper function ───────────────────────────────────────────
console.log('\nIP12: tState() helper returns correct translations');
{
  await setVI(page);
  const viResult = await page.evaluate(() => [
    tState('Chưa bắt đầu'),
    tState('Đang thực hiện'),
    tState('Hoàn thành'),
    tState('Tạm dừng'),
    tState('Blocked'),
  ]);
  chk('VI tState("Chưa bắt đầu") = "Chưa bắt đầu"', viResult[0] === 'Chưa bắt đầu', viResult[0]);
  chk('VI tState("Đang thực hiện") = "Đang thực hiện"', viResult[1] === 'Đang thực hiện', viResult[1]);

  await setEN(page);
  const enResult = await page.evaluate(() => [
    tState('Chưa bắt đầu'),
    tState('Đang thực hiện'),
    tState('Hoàn thành'),
    tState('Tạm dừng'),
    tState('Blocked'),
  ]);
  chk('EN tState("Chưa bắt đầu") = "Not Started"',    enResult[0] === 'Not Started', enResult[0]);
  chk('EN tState("Đang thực hiện") = "In Progress"',   enResult[1] === 'In Progress', enResult[1]);
  chk('EN tState("Hoàn thành") = "Completed"',         enResult[2] === 'Completed',   enResult[2]);
  chk('EN tState("Tạm dừng") = "On Hold"',             enResult[3] === 'On Hold',     enResult[3]);
  chk('EN tState("Blocked") = "Blocked"',              enResult[4] === 'Blocked',     enResult[4]);
}

// ── IP13: stateChip() renders EN text in EN mode ─────────────────────────────
console.log('\nIP13: stateChip() HTML contains EN text in EN mode');
{
  await setEN(page);
  const chipHtml = await page.evaluate(() => stateChip('Đang thực hiện'));
  chk('stateChip EN contains "In Progress"', chipHtml.includes('In Progress'), chipHtml);
  chk('stateChip EN keeps CSS class s1', chipHtml.includes('s1'), chipHtml);
  // raw Vietnamese should NOT be in the displayed text (it may be in value attr but not chip text)
  const chipText = chipHtml.replace(/<[^>]+>/g, '');
  chk('stateChip EN text is not Vietnamese', chipText.trim() === 'In Progress', chipText);
}

// ── IP14: No JS errors ───────────────────────────────────────────────────────
console.log('\nIP14: No JS errors');
{
  await setVI(page);
  await page.evaluate(() => { if (typeof renderTaskTable === 'function') renderTaskTable(); });
  await page.waitForTimeout(300);
  const relevant = errors.filter(e =>
    !e.includes('favicon') && !e.includes('404') && !e.includes('net::ERR')
    && !e.includes('google.com') && !e.includes('CORS') && !e.includes('googleapis')
  );
  chk('No JS errors', relevant.length === 0, relevant.slice(0,3));
}

// ── Teardown ──────────────────────────────────────────────────────────────────
await browser.close();
server.close();

console.log(`\n${'─'.repeat(55)}`);
console.log(`verify_i18n_p2  ${pass + fail} tests  ${pass} PASS  ${fail} FAIL`);
if (fail > 0) process.exit(1);
