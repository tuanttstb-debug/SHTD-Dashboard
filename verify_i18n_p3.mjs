/**
 * verify_i18n_p3.mjs — S45: i18n Phase 3
 * Port: 3044  |  30 tests
 *
 * Tests:
 *   P3-01  CP stat label VI: Tổng số Case / Tổng giá trị pipeline / Quá hạn deadline / Cần BLĐ duyệt
 *   P3-02  CP stat label EN: Total Cases / Total Pipeline Value / Overdue / Needs Approval
 *   P3-03  CP preset VI: Đang xử lý / Cần BLĐ / Quá hạn / Tất cả
 *   P3-04  CP preset EN: In Progress / Needs Approval / Overdue / All
 *   P3-05  CP view toggle VI: Danh sách / Kanban
 *   P3-06  CP view toggle EN: List / Kanban
 *   P3-07  CP scope toggle VI: Của tôi / Tất cả
 *   P3-08  CP scope toggle EN: Mine / All
 *   P3-09  CP filter labels VI: Tìm case / Stage / Team / PIC / ĐVKD / Loại hình / RAG
 *   P3-10  CP filter labels EN: Search case / Stage / Team / PIC / Branch / Type / RAG
 *   P3-11  BLD filter label VI: Lọc:
 *   P3-12  BLD filter label EN: Filter:
 *   P3-13  BLD history title VI: Đã xử lý (7 ngày qua)
 *   P3-14  BLD history title EN: Processed (last 7 days)
 *   P3-15  BLD count chip VI: N chờ phê duyệt
 *   P3-16  BLD count chip EN: N pending approval
 *   P3-17  BLD empty state VI: Không có mục chờ phê duyệt
 *   P3-18  BLD empty state EN: No pending items
 *   P3-19  BLD filter selects VI: Tất cả đội / Tất cả sáng kiến
 *   P3-20  BLD filter selects EN: All Teams / All Initiatives
 *   P3-21  AP period buttons VI: Tháng này / Quý này / Tháng trước
 *   P3-22  AP period buttons EN: This Month / This Quarter / Last Month
 *   P3-23  AP summary strip VI: hành động / Đang TH
 *   P3-24  AP summary strip EN: actions / In Progress
 *   P3-25  AP all-teams option VI: Tất cả team
 *   P3-26  AP all-teams option EN: All Teams
 *   P3-27  renderAll() re-renders BLD when visible on lang switch
 *   P3-28  renderAll() re-renders AP when visible on lang switch
 *   P3-29  VI→EN→VI roundtrip: CP stat label restores to Vietnamese
 *   P3-30  No JS errors throughout
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3044;
const BASE = `http://localhost:${PORT}`;

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html;charset=utf-8', '.js': 'application/javascript;charset=utf-8',
    '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon',
  }[ext] || 'text/plain';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});
await new Promise(r => server.listen(PORT, r));

let pass = 0, fail = 0;
const ok  = msg => { console.log(`  ✅ ${msg}`); pass++; };
const ko  = (msg, got) => { console.log(`  ❌ ${msg}${got !== undefined ? ` — got: ${JSON.stringify(got)}` : ''}`); fail++; };
const chk = (label, cond, got) => cond ? ok(label) : ko(label, got);

// Use a date in the current month so AP period filter (month) matches
const _now = new Date();
const _midMonth = new Date(_now.getFullYear(), _now.getMonth(), 15).toISOString().split('T')[0];

const MOCK_TASKS = [
  { id: 'T-P3-01', name: 'Task P3 A', state: 'Đang thực hiện', status: 'Amber',
    team: 'Số', picAcc: 'TuanTT4', picRes: 'TuanTT4', progress: 30,
    endDate: _midMonth, initiative: 'INI-01', category: 'Cat1',
    highlight: 'Y', type: 'Task', tuanBC: 'Tuần 01/2026', canBLD: 'Y' },
  { id: 'T-P3-02', name: 'Task P3 B', state: 'Chưa bắt đầu', status: 'Green',
    team: 'BL', picAcc: 'User2', picRes: 'User2', progress: 0,
    endDate: _midMonth, initiative: 'INI-01', category: 'Cat1',
    highlight: 'Y', type: 'Task', tuanBC: 'Tuần 01/2026', canBLD: 'N' },
];

const MOCK_CASES = [
  { id: 'CP-P3-01', caseName: 'Case P3 Alpha', team: 'PTKD MB', stage: 'Tiếp nhận',
    pic: 'TuanTT4', rag: 'Xanh', dvkd: 'Chi nhánh A', deadline: '2026-12-31',
    highlight: 'Y', canBLD: 'N', progress: 0 },
];

async function injectAuth(page) {
  await page.evaluate(({ tasks, cases }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      username: 'TuanTT4', displayName: 'Tuấn TT', role: 'Admin', team: 'Số'
    }));
    localStorage.setItem('shtd_lang', 'vi');
    localStorage.setItem('shtd_v2', JSON.stringify({
      tasks, initiatives: [{ id: 'INI-01', name: 'Sáng kiến 01', parentId: null, status: 'active', accountable: 'TuanTT4' }],
      _serverTs: null, deletedIds: []
    }));
    localStorage.setItem('shtd_cp_v1', JSON.stringify({ cases, _serverTs: null }));
  }, { tasks: MOCK_TASKS, cases: MOCK_CASES });
}

async function setup(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await injectAuth(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => {
    document.getElementById('loginOverlay').style.display = 'none';
    loadCache();
    try { setupListeners(); } catch(e) {}
    navigateTo('tasks');
  });
  await page.waitForTimeout(300);
}

async function navTo(page, view) {
  await page.evaluate(v => navigateTo(v), view);
  await page.waitForTimeout(300);
}

async function setLangVI(page) {
  await page.evaluate(() => { setLang('vi'); });
  await page.waitForTimeout(200);
}

async function setLangEN(page) {
  await page.evaluate(() => { setLang('en'); });
  await page.waitForTimeout(200);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page    = await context.newPage();
const errors  = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await setup(page);

// ── P3-01: CP stat label VI ──────────────────────────────────────────────────
console.log('\nP3-01: CP stat labels — VI');
{
  await setLangVI(page);
  await navTo(page, 'case-pipeline');
  const labels = await page.$$eval('[data-i18n^="cp.stat."]', els => els.map(e => e.textContent.trim()));
  chk('cp.stat.total VI = "Tổng số Case"',          labels.includes('Tổng số Case'), labels);
  chk('cp.stat.value VI = "Tổng giá trị pipeline"', labels.includes('Tổng giá trị pipeline'), labels);
  chk('cp.stat.overdue VI = "Quá hạn deadline"',    labels.includes('Quá hạn deadline'), labels);
  chk('cp.stat.bld VI = "Cần BLĐ duyệt"',          labels.includes('Cần BLĐ duyệt'), labels);
}

// ── P3-02: CP stat label EN ──────────────────────────────────────────────────
console.log('\nP3-02: CP stat labels — EN');
{
  await setLangEN(page);
  const labels = await page.$$eval('[data-i18n^="cp.stat."]', els => els.map(e => e.textContent.trim()));
  chk('cp.stat.total EN = "Total Cases"',          labels.includes('Total Cases'), labels);
  chk('cp.stat.value EN = "Total Pipeline Value"', labels.includes('Total Pipeline Value'), labels);
  chk('cp.stat.overdue EN = "Overdue"',            labels.some(l => l === 'Overdue'), labels);
  chk('cp.stat.bld EN = "Needs Approval"',         labels.some(l => l === 'Needs Approval'), labels);
}

// ── P3-03: CP preset labels VI ───────────────────────────────────────────────
console.log('\nP3-03: CP preset labels — VI');
{
  await setLangVI(page);
  const active  = await page.$eval('[data-i18n="cp.preset.active"]',  e => e.textContent.trim());
  const bld     = await page.$eval('[data-i18n="cp.preset.bld"]',     e => e.textContent.trim());
  const overdue = await page.$eval('[data-i18n="cp.preset.overdue"]', e => e.textContent.trim());
  const all     = await page.$eval('[data-i18n="cp.preset.all"]',     e => e.textContent.trim());
  chk('cp.preset.active VI = "Đang xử lý"',  active  === 'Đang xử lý',  active);
  chk('cp.preset.bld VI = "Cần BLĐ"',        bld     === 'Cần BLĐ',     bld);
  chk('cp.preset.overdue VI = "Quá hạn"',    overdue === 'Quá hạn',     overdue);
  chk('cp.preset.all VI = "Tất cả"',         all     === 'Tất cả',      all);
}

// ── P3-04: CP preset labels EN ───────────────────────────────────────────────
console.log('\nP3-04: CP preset labels — EN');
{
  await setLangEN(page);
  const active  = await page.$eval('[data-i18n="cp.preset.active"]',  e => e.textContent.trim());
  const bld     = await page.$eval('[data-i18n="cp.preset.bld"]',     e => e.textContent.trim());
  const overdue = await page.$eval('[data-i18n="cp.preset.overdue"]', e => e.textContent.trim());
  const all     = await page.$eval('[data-i18n="cp.preset.all"]',     e => e.textContent.trim());
  chk('cp.preset.active EN = "In Progress"',     active  === 'In Progress',    active);
  chk('cp.preset.bld EN = "Needs Approval"',     bld     === 'Needs Approval', bld);
  chk('cp.preset.overdue EN = "Overdue"',        overdue === 'Overdue',        overdue);
  chk('cp.preset.all EN = "All"',               all     === 'All',            all);
}

// ── P3-05: CP view toggle VI ─────────────────────────────────────────────────
console.log('\nP3-05: CP view toggle — VI');
{
  await setLangVI(page);
  const table  = await page.$eval('[data-i18n="cp.view.table"]',  e => e.textContent.trim());
  const kanban = await page.$eval('[data-i18n="cp.view.kanban"]', e => e.textContent.trim());
  chk('cp.view.table VI = "Danh sách"', table  === 'Danh sách', table);
  chk('cp.view.kanban VI = "Kanban"',   kanban === 'Kanban',    kanban);
}

// ── P3-06: CP view toggle EN ─────────────────────────────────────────────────
console.log('\nP3-06: CP view toggle — EN');
{
  await setLangEN(page);
  const table  = await page.$eval('[data-i18n="cp.view.table"]',  e => e.textContent.trim());
  const kanban = await page.$eval('[data-i18n="cp.view.kanban"]', e => e.textContent.trim());
  chk('cp.view.table EN = "List"',   table  === 'List',   table);
  chk('cp.view.kanban EN = "Kanban"',kanban === 'Kanban', kanban);
}

// ── P3-07: CP scope toggle VI ────────────────────────────────────────────────
console.log('\nP3-07: CP scope toggle — VI');
{
  await setLangVI(page);
  const mine = await page.$eval('#cpScopeMine [data-i18n="task.scope.mine"]', e => e.textContent.trim());
  const all  = await page.$eval('#cpScopeAll  [data-i18n="task.scope.all"]',  e => e.textContent.trim());
  chk('cpScopeMine VI = "Của tôi"', mine === 'Của tôi', mine);
  chk('cpScopeAll  VI = "Tất cả"',  all  === 'Tất cả',  all);
}

// ── P3-08: CP scope toggle EN ────────────────────────────────────────────────
console.log('\nP3-08: CP scope toggle — EN');
{
  await setLangEN(page);
  const mine = await page.$eval('#cpScopeMine [data-i18n="task.scope.mine"]', e => e.textContent.trim());
  const all  = await page.$eval('#cpScopeAll  [data-i18n="task.scope.all"]',  e => e.textContent.trim());
  chk('cpScopeMine EN = "Mine"', mine === 'Mine', mine);
  chk('cpScopeAll  EN = "All"',  all  === 'All',  all);
}

// ── P3-09: CP filter labels VI ───────────────────────────────────────────────
console.log('\nP3-09: CP filter labels — VI');
{
  await setLangVI(page);
  const search = await page.$eval('[data-i18n="cp.filter.search"]', e => e.textContent.trim());
  const stage  = await page.$eval('[data-i18n="cp.filter.stage"]',  e => e.textContent.trim());
  const team   = await page.$$eval('[data-i18n="filter.team"]',     els => els.map(e => e.textContent.trim()));
  const pic    = await page.$eval('[data-i18n="cp.filter.pic"]',    e => e.textContent.trim());
  const dvkd   = await page.$eval('[data-i18n="cp.filter.dvkd"]',   e => e.textContent.trim());
  const loai   = await page.$eval('[data-i18n="cp.filter.loai"]',   e => e.textContent.trim());
  const rag    = await page.$eval('[data-i18n="cp.filter.rag"]',    e => e.textContent.trim());
  chk('cp.filter.search VI = "Tìm case"',   search === 'Tìm case',   search);
  chk('cp.filter.stage VI = "Stage"',       stage  === 'Stage',      stage);
  chk('filter.team in CP VI = "Team"',      team.some(t => t === 'Team'), team);
  chk('cp.filter.pic VI = "PIC"',           pic    === 'PIC',         pic);
  chk('cp.filter.dvkd VI = "ĐVKD"',        dvkd   === 'ĐVKD',        dvkd);
  chk('cp.filter.loai VI = "Loại hình"',    loai   === 'Loại hình',   loai);
  chk('cp.filter.rag VI = "RAG"',           rag    === 'RAG',         rag);
}

// ── P3-10: CP filter labels EN ───────────────────────────────────────────────
console.log('\nP3-10: CP filter labels — EN');
{
  await setLangEN(page);
  const search = await page.$eval('[data-i18n="cp.filter.search"]', e => e.textContent.trim());
  const dvkd   = await page.$eval('[data-i18n="cp.filter.dvkd"]',   e => e.textContent.trim());
  const loai   = await page.$eval('[data-i18n="cp.filter.loai"]',   e => e.textContent.trim());
  chk('cp.filter.search EN = "Search case"', search === 'Search case', search);
  chk('cp.filter.dvkd EN = "Branch"',        dvkd   === 'Branch',      dvkd);
  chk('cp.filter.loai EN = "Type"',          loai   === 'Type',         loai);
}

// ── P3-11: BLD filter label VI ───────────────────────────────────────────────
console.log('\nP3-11: BLD filter label — VI');
{
  await setLangVI(page);
  await navTo(page, 'bld-queue');
  const label = await page.$eval('[data-i18n="bld.filter.label"]', e => e.textContent.trim());
  chk('bld.filter.label VI = "Lọc:"', label === 'Lọc:', label);
}

// ── P3-12: BLD filter label EN ───────────────────────────────────────────────
console.log('\nP3-12: BLD filter label — EN');
{
  await setLangEN(page);
  const label = await page.$eval('[data-i18n="bld.filter.label"]', e => e.textContent.trim());
  chk('bld.filter.label EN = "Filter:"', label === 'Filter:', label);
}

// ── P3-13: BLD history title VI ──────────────────────────────────────────────
console.log('\nP3-13: BLD history title — VI');
{
  await setLangVI(page);
  const title = await page.$eval('[data-i18n="bld.history.title"]', e => e.textContent.trim());
  chk('bld.history.title VI = "Đã xử lý (7 ngày qua)"', title === 'Đã xử lý (7 ngày qua)', title);
}

// ── P3-14: BLD history title EN ──────────────────────────────────────────────
console.log('\nP3-14: BLD history title — EN');
{
  await setLangEN(page);
  const title = await page.$eval('[data-i18n="bld.history.title"]', e => e.textContent.trim());
  chk('bld.history.title EN = "Processed (last 7 days)"', title === 'Processed (last 7 days)', title);
}

// ── P3-15: BLD count chip VI ─────────────────────────────────────────────────
console.log('\nP3-15: BLD count chip — VI');
{
  await setLangVI(page);
  await page.evaluate(() => renderBldQueue());
  await page.waitForTimeout(200);
  const chip = await page.$eval('#bldCountChip', e => e.textContent.trim());
  chk('count chip VI contains "chờ phê duyệt"', chip.includes('chờ phê duyệt'), chip);
}

// ── P3-16: BLD count chip EN ─────────────────────────────────────────────────
console.log('\nP3-16: BLD count chip — EN');
{
  await setLangEN(page);
  await page.evaluate(() => renderBldQueue());
  await page.waitForTimeout(200);
  const chip = await page.$eval('#bldCountChip', e => e.textContent.trim());
  chk('count chip EN contains "pending approval"', chip.includes('pending approval'), chip);
}

// ── P3-17: BLD empty state VI ────────────────────────────────────────────────
console.log('\nP3-17: BLD empty state — VI (no pending items)');
{
  await setLangVI(page);
  // Temporarily clear canBLD to force empty state
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('shtd_v2'));
    const orig = JSON.stringify(saved);
    saved.tasks.forEach(t => { t._origCanBLD = t.canBLD; t.canBLD = 'N'; });
    localStorage.setItem('shtd_v2', JSON.stringify(saved));
    loadCache();
    renderBldQueue();
    // restore
    const restored = JSON.parse(orig);
    localStorage.setItem('shtd_v2', orig);
    loadCache();
  });
  await page.waitForTimeout(200);
  const el = await page.$('.bld-empty-title');
  const txt = el ? await el.textContent() : '';
  chk('bld empty title VI = "Không có mục chờ phê duyệt"', txt.trim() === 'Không có mục chờ phê duyệt', txt);
}

// ── P3-18: BLD empty state EN ────────────────────────────────────────────────
console.log('\nP3-18: BLD empty state — EN (no pending items)');
{
  await setLangEN(page);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('shtd_v2'));
    saved.tasks.forEach(t => { t.canBLD = 'N'; });
    localStorage.setItem('shtd_v2', JSON.stringify(saved));
    loadCache();
    renderBldQueue();
  });
  await page.waitForTimeout(200);
  const el = await page.$('.bld-empty-title');
  const txt = el ? await el.textContent() : '';
  chk('bld empty title EN = "No pending items"', txt.trim() === 'No pending items', txt);
  // Restore canBLD
  await page.evaluate(({ tasks }) => {
    localStorage.setItem('shtd_v2', JSON.stringify({
      tasks, initiatives: [{ id: 'INI-01', name: 'Sáng kiến 01', parentId: null, status: 'active', accountable: 'TuanTT4' }],
      _serverTs: null, deletedIds: []
    }));
    loadCache();
    renderBldQueue();
  }, { tasks: MOCK_TASKS });
  await page.waitForTimeout(200);
}

// ── P3-19: BLD filter selects VI ─────────────────────────────────────────────
console.log('\nP3-19: BLD filter selects — VI');
{
  await setLangVI(page);
  await page.evaluate(() => renderBldQueue());
  await page.waitForTimeout(200);
  const teamFirst = await page.$eval('#bldFilterTeam option:first-child', e => e.textContent.trim());
  const initFirst = await page.$eval('#bldFilterInit option:first-child', e => e.textContent.trim());
  chk('bldFilterTeam first option VI = "Tất cả đội"',       teamFirst === 'Tất cả đội',       teamFirst);
  chk('bldFilterInit first option VI = "Tất cả sáng kiến"', initFirst === 'Tất cả sáng kiến', initFirst);
}

// ── P3-20: BLD filter selects EN ─────────────────────────────────────────────
console.log('\nP3-20: BLD filter selects — EN');
{
  await setLangEN(page);
  await page.evaluate(() => renderBldQueue());
  await page.waitForTimeout(200);
  const teamFirst = await page.$eval('#bldFilterTeam option:first-child', e => e.textContent.trim());
  const initFirst = await page.$eval('#bldFilterInit option:first-child', e => e.textContent.trim());
  chk('bldFilterTeam first option EN = "All Teams"',       teamFirst === 'All Teams',       teamFirst);
  chk('bldFilterInit first option EN = "All Initiatives"', initFirst === 'All Initiatives', initFirst);
}

// ── P3-21: AP period buttons VI ──────────────────────────────────────────────
console.log('\nP3-21: AP period buttons — VI');
{
  await setLangVI(page);
  await navTo(page, 'action-plan');
  const btns = await page.$$eval('.ap-period-btn', els => els.map(e => e.textContent.trim()));
  chk('ap.period.month VI = "Tháng này"',       btns.includes('Tháng này'),   btns);
  chk('ap.period.quarter VI = "Quý này"',       btns.includes('Quý này'),     btns);
  chk('ap.period.prev-month VI = "Tháng trước"',btns.includes('Tháng trước'), btns);
}

// ── P3-22: AP period buttons EN ──────────────────────────────────────────────
console.log('\nP3-22: AP period buttons — EN');
{
  await setLangEN(page);
  await page.evaluate(() => renderActionPlan());
  await page.waitForTimeout(200);
  const btns = await page.$$eval('.ap-period-btn', els => els.map(e => e.textContent.trim()));
  chk('ap.period.month EN = "This Month"',        btns.includes('This Month'),   btns);
  chk('ap.period.quarter EN = "This Quarter"',    btns.includes('This Quarter'), btns);
  chk('ap.period.prev-month EN = "Last Month"',   btns.includes('Last Month'),   btns);
}

// ── P3-23: AP summary strip VI ───────────────────────────────────────────────
console.log('\nP3-23: AP summary strip — VI');
{
  await setLangVI(page);
  // Force single-team view (summary strip renders when team != '')
  await page.evaluate(() => { _apFilterTeam = 'Số'; renderActionPlan(); });
  await page.waitForTimeout(200);
  const strip = await page.$('.ap-summary-strip');
  const text  = strip ? await strip.textContent() : '';
  chk('ap summary VI contains "hành động"', text.includes('hành động'), text.slice(0, 80));
  chk('ap summary VI contains "Đang TH"',   text.includes('Đang TH'),   text.slice(0, 80));
}

// ── P3-24: AP summary strip EN ───────────────────────────────────────────────
console.log('\nP3-24: AP summary strip — EN');
{
  await setLangEN(page);
  await page.evaluate(() => { _apFilterTeam = 'Số'; renderActionPlan(); });
  await page.waitForTimeout(200);
  const strip = await page.$('.ap-summary-strip');
  const text  = strip ? await strip.textContent() : '';
  chk('ap summary EN contains "actions"',     text.includes('actions'),     text.slice(0, 80));
  chk('ap summary EN contains "In Progress"', text.includes('In Progress'), text.slice(0, 80));
}

// ── P3-25: AP all-teams key VI ───────────────────────────────────────────────
console.log('\nP3-25: AP all-teams i18n key — VI');
{
  await setLangVI(page);
  const key = await page.evaluate(() => t('ap.all-teams'));
  chk('t("ap.all-teams") VI = "Tất cả team"', key === 'Tất cả team', key);
}

// ── P3-26: AP all-teams key EN ────────────────────────────────────────────────
console.log('\nP3-26: AP all-teams i18n key — EN');
{
  await setLangEN(page);
  const key = await page.evaluate(() => t('ap.all-teams'));
  chk('t("ap.all-teams") EN = "All Teams"', key === 'All Teams', key);
}

// ── P3-27: renderAll() triggers BLD re-render on lang switch ─────────────────
console.log('\nP3-27: renderAll() re-renders BLD when view visible');
{
  await navTo(page, 'bld-queue');
  await setLangVI(page);
  await page.waitForTimeout(200);
  const chipVI = await page.$eval('#bldCountChip', e => e.textContent.trim());
  await setLangEN(page);
  await page.waitForTimeout(200);
  const chipEN = await page.$eval('#bldCountChip', e => e.textContent.trim());
  chk('BLD chip switches from VI to EN via renderAll()',
    chipEN.includes('pending approval') && chipVI.includes('chờ phê duyệt'),
    { chipVI, chipEN });
}

// ── P3-28: renderAll() triggers AP re-render on lang switch ──────────────────
console.log('\nP3-28: renderAll() re-renders AP when view visible');
{
  await navTo(page, 'action-plan');
  await setLangVI(page);
  await page.waitForTimeout(200);
  const btnsVI = await page.$$eval('.ap-period-btn', els => els.map(e => e.textContent.trim()));
  await setLangEN(page);
  await page.waitForTimeout(200);
  const btnsEN = await page.$$eval('.ap-period-btn', els => els.map(e => e.textContent.trim()));
  chk('AP period btns switch VI→EN via renderAll()',
    btnsVI.includes('Tháng này') && btnsEN.includes('This Month'),
    { btnsVI, btnsEN });
}

// ── P3-29: VI→EN→VI roundtrip CP stat label ──────────────────────────────────
console.log('\nP3-29: VI→EN→VI roundtrip CP stat label');
{
  await navTo(page, 'case-pipeline');
  await setLangVI(page);
  const vi1 = await page.$eval('[data-i18n="cp.stat.total"]', e => e.textContent.trim());
  await setLangEN(page);
  const en  = await page.$eval('[data-i18n="cp.stat.total"]', e => e.textContent.trim());
  await setLangVI(page);
  const vi2 = await page.$eval('[data-i18n="cp.stat.total"]', e => e.textContent.trim());
  chk('cp.stat.total: VI="Tổng số Case", EN="Total Cases", back VI="Tổng số Case"',
    vi1 === 'Tổng số Case' && en === 'Total Cases' && vi2 === 'Tổng số Case',
    { vi1, en, vi2 });
}

// ── P3-30: No JS errors ───────────────────────────────────────────────────────
console.log('\nP3-30: No JS errors throughout');
{
  chk('No JS errors', errors.length === 0, errors.slice(0, 3));
}

// ── Summary ───────────────────────────────────────────────────────────────────
await browser.close();
server.close();
console.log(`\n${'─'.repeat(50)}`);
console.log(`Result: ${pass}/${pass + fail} PASS`);
if (fail > 0) { console.log(`FAILED: ${fail} test(s)`); process.exit(1); }
else { console.log('All tests passed ✅'); }
