/**
 * verify_i18n_p6.mjs — i18n Phase 6: Initiative Tracker bilingual tests
 * Port: 3046
 * Run: node verify_i18n_p6.mjs
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3046;

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

const MOCK_TASKS = [
  { id:'IP6-001', name:'Task A', state:'Đang thực hiện', progress:'50', status:'Green',
    initiative:'IP6-INIT-01', team:'Số', picRes:'TuanTT4', endDate:'2026-12-31',
    tuanBC:'Tuần 01/2026', canBLD:'N', milestone:'', category:'', picAcc:'',
    noiDungBLD:'', yKienBLD:'', highlight:'N', startDate:'', vuongMac:'', nextPlan:'', result:'' },
];

const MOCK_INITS = [
  { id:'IP6-INIT-01', name:'Test Initiative Active', type:'initiative', status:'Active',
    pct:50, accountable:'TuanTT4', deadline:'2026-12-31', startDate:'2026-01-01',
    category:'Số hóa', kpiTarget:'', notes:'', docLink:'', parentId:null,
    milestoneTracking:'', milestoneDeadline:'' },
  { id:'IP6-INIT-02', name:'Test Initiative Done', type:'initiative', status:'Done',
    pct:100, accountable:'TuanTT4', deadline:'2026-06-30', startDate:'2026-01-01',
    category:'', kpiTarget:'', notes:'', docLink:'', parentId:null,
    milestoneTracking:'', milestoneDeadline:'' },
];

// ── Inject helper ────────────────────────────────────────────────────────────
async function inject(page, { withInits = true } = {}) {
  await page.evaluate(({ tasks, inits, user }) => {
    db.tasks = tasks;
    db.initiatives = inits;
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000, user
    }));
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch(e) {}
  }, { tasks: MOCK_TASKS, inits: withInits ? MOCK_INITS : [], user: MOCK_USER });
  await page.evaluate(() => { setLang('vi'); navigateTo('initiative-tracker'); });
  await page.waitForTimeout(500);
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
await inject(page, { withInits: true });

// ── IP6-1: IT stat bar — VI labels ───────────────────────────────────────────
console.log('\nIP6-1: IT stat bar labels in VI');
const statLabelsVI = await page.$$eval(
  '#initiativeTrackerRoot .cp-stat-label', els => els.map(el => el.textContent.trim())
);
ok('Stat: "Tổng Initiative"', statLabelsVI[0] === 'Tổng Initiative');
ok('Stat: "Đang Active"',     statLabelsVI[1] === 'Đang Active');
ok('Stat: "Hoàn thành"',     statLabelsVI[2] === 'Hoàn thành');
ok('Stat: "Quá hạn"',        statLabelsVI[3] === 'Quá hạn');

// ── IP6-2: IT stat bar — EN labels ───────────────────────────────────────────
console.log('\nIP6-2: IT stat bar labels in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(300);
const statLabelsEN = await page.$$eval(
  '#initiativeTrackerRoot .cp-stat-label', els => els.map(el => el.textContent.trim())
);
ok('Stat EN: "Total Initiatives"', statLabelsEN[0] === 'Total Initiatives');
ok('Stat EN: "Active"',            statLabelsEN[1] === 'Active');
ok('Stat EN: "Done"',              statLabelsEN[2] === 'Done');
ok('Stat EN: "Overdue"',           statLabelsEN[3] === 'Overdue');

// ── IP6-3: IT scope toggle — VI ──────────────────────────────────────────────
console.log('\nIP6-3: IT scope toggle buttons in VI');
await page.evaluate(() => { setLang('vi'); });
await page.waitForTimeout(200);
const scopeBtnsVI = await page.$$eval(
  '#initiativeTrackerRoot .scope-btn', els => els.map(el => el.textContent.trim())
);
ok('Scope VI: "Của tôi"', scopeBtnsVI[0] === 'Của tôi');
ok('Scope VI: "Tất cả"',  scopeBtnsVI[1] === 'Tất cả');

// ── IP6-4: IT scope toggle — EN ──────────────────────────────────────────────
console.log('\nIP6-4: IT scope toggle buttons in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(200);
const scopeBtnsEN = await page.$$eval(
  '#initiativeTrackerRoot .scope-btn', els => els.map(el => el.textContent.trim())
);
ok('Scope EN: "Mine"', scopeBtnsEN[0] === 'Mine');
ok('Scope EN: "All"',  scopeBtnsEN[1] === 'All');

// ── IP6-5: IT filter dropdowns — VI ──────────────────────────────────────────
console.log('\nIP6-5: IT filter dropdown options in VI');
await page.evaluate(() => { setLang('vi'); });
await page.waitForTimeout(200);
const filterOptsVI = await page.$$eval(
  '#initiativeTrackerRoot .toolbar-right select',
  els => els.map(el => el.options[0]?.textContent.trim())
);
ok('Filter cat VI: "Tất cả Category"',   filterOptsVI[0] === 'Tất cả Category');
ok('Filter status VI: "Tất cả Trạng thái"', filterOptsVI[1] === 'Tất cả Trạng thái');

// ── IP6-6: IT filter dropdowns — EN ──────────────────────────────────────────
console.log('\nIP6-6: IT filter dropdown options in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(200);
const filterOptsEN = await page.$$eval(
  '#initiativeTrackerRoot .toolbar-right select',
  els => els.map(el => el.options[0]?.textContent.trim())
);
ok('Filter cat EN: "All Categories"',   filterOptsEN[0] === 'All Categories');
ok('Filter status EN: "All Statuses"',  filterOptsEN[1] === 'All Statuses');

// ── IP6-7: IT add button — VI ─────────────────────────────────────────────────
console.log('\nIP6-7: IT toolbar add button in VI');
await page.evaluate(() => { setLang('vi'); });
await page.waitForTimeout(200);
const addBtnVI = await page.$eval(
  '#initiativeTrackerRoot .toolbar-right .btn-primary', el => el.textContent.trim()
);
ok('Add btn VI: "Thêm Initiative"', addBtnVI === 'Thêm Initiative');

// ── IP6-8: IT add button — EN ─────────────────────────────────────────────────
console.log('\nIP6-8: IT toolbar add button in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(200);
const addBtnEN = await page.$eval(
  '#initiativeTrackerRoot .toolbar-right .btn-primary', el => el.textContent.trim()
);
ok('Add btn EN: "Add Initiative"', addBtnEN === 'Add Initiative');

// ── IP6-9: IT empty state — VI ───────────────────────────────────────────────
console.log('\nIP6-9: IT empty state in VI');
await page.evaluate(() => {
  setLang('vi');
  db.initiatives = [];
  renderInitiativeTracker();
});
await page.waitForTimeout(200);
const emptyTitleVI = await page.$eval('#initiativeTrackerRoot .init-empty-title', el => el.textContent.trim());
ok('IT empty title VI: "Chưa có Initiative nào"', emptyTitleVI === 'Chưa có Initiative nào');

// ── IP6-10: IT empty state — EN ──────────────────────────────────────────────
console.log('\nIP6-10: IT empty state in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(200);
const emptyTitleEN = await page.$eval('#initiativeTrackerRoot .init-empty-title', el => el.textContent.trim());
ok('IT empty title EN: "No Initiatives"', emptyTitleEN === 'No Initiatives');

// ── IP6-11: filterInit dropdown (Tasks view) — VI ─────────────────────────────
console.log('\nIP6-11: filterInit dropdown "Tất cả" in VI');
await page.evaluate(() => { setLang('vi'); navigateTo('tasks'); });
await page.waitForTimeout(300);
const filterInitVI = await page.$eval('#filterInit option[value=""]', el => el.textContent.trim());
ok('filterInit VI: "Tất cả"', filterInitVI === 'Tất cả');

// ── IP6-12: filterInit dropdown (Tasks view) — EN ─────────────────────────────
console.log('\nIP6-12: filterInit dropdown "All" in EN');
await page.evaluate(() => { setLang('en'); });
await page.waitForTimeout(200);
const filterInitEN = await page.$eval('#filterInit option[value=""]', el => el.textContent.trim());
ok('filterInit EN: "All"', filterInitEN === 'All');

// ── IP6-13: filterTuanBC dropdown — EN ───────────────────────────────────────
console.log('\nIP6-13: filterTuanBC dropdown in EN');
const tuanBCAllEN    = await page.$eval('#filterTuanBC option[value=""]', el => el.textContent.trim());
const tuanBCWeekEN   = await page.$eval('#filterTuanBC option[value="__thisweek__"]', el => el.textContent.trim());
ok('filterTuanBC EN: "All"', tuanBCAllEN === 'All');
ok('filterTuanBC EN: "📅 This Week"', tuanBCWeekEN.includes('This Week'));

// ── IP6-14: Switch back VI → labels restore ───────────────────────────────────
console.log('\nIP6-14: Switch back VI → IT stat labels restore');
await page.evaluate(() => {
  setLang('vi');
  db.initiatives = [
    { id:'IP6-INIT-01', name:'Test Initiative Active', type:'initiative', status:'Active',
      pct:50, accountable:'TuanTT4', deadline:'2026-12-31', startDate:'2026-01-01',
      category:'Số hóa', kpiTarget:'', notes:'', docLink:'', parentId:null,
      milestoneTracking:'', milestoneDeadline:'' },
  ];
  navigateTo('initiative-tracker');
});
await page.waitForTimeout(300);
const statLabelsRestore = await page.$$eval(
  '#initiativeTrackerRoot .cp-stat-label', els => els.map(el => el.textContent.trim())
);
ok('Stat restored VI: "Tổng Initiative"', statLabelsRestore[0] === 'Tổng Initiative');
ok('filterInit VI restored: "Tất cả"',
  await page.$eval('#filterInit option[value=""]', el => el.textContent.trim()).then(v => v === 'Tất cả'));

// ── IP6-15: No JS errors ──────────────────────────────────────────────────────
console.log('\nIP6-15: No JS errors');
ok('Zero console errors', errors.length === 0);
if (errors.length) errors.forEach(e => console.error('   JS Error:', e));

// ── Teardown ──────────────────────────────────────────────────────────────────
await browser.close();
server.close();

const total = pass + fail;
console.log(`\n─────────────────────────────────────────────────`);
console.log(`verify_i18n_p6  ${pass}/${total}  ${fail === 0 ? 'PASS' : 'FAIL'}`);
if (fail > 0) process.exit(1);
