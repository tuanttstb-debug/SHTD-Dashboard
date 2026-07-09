/**
 * verify_i18n_p5.mjs — i18n Phase 5: Quick View + Executive Summary bilingual tests
 * Port: 3045
 * Run: node verify_i18n_p5.mjs
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3045;

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

const today = new Date().toISOString().split('T')[0];
const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toISOString().split('T')[0];

const BASE = { startDate:'', milestone:'', category:'', picAcc:'', noiDungBLD:'', yKienBLD:'', highlight:'N' };
const MOCK_TASKS = [
  { ...BASE, id:'IP5-001', name:'Task hoàn thành', state:'Hoàn thành', progress:'100', status:'Green',
    initiative:'INIT-01', team:'Số', picRes:'TuanTT4', endDate:today, tuanBC:'Tuần 01/2026',
    canBLD:'N', vuongMac:'', nextPlan:'', result:'Xong rồi' },
  { ...BASE, id:'IP5-002', name:'Task cần làm', state:'Đang thực hiện', progress:'50', status:'Amber',
    initiative:'INIT-01', team:'Số', picRes:'TuanTT4', endDate:nextMonth, tuanBC:'Tuần 01/2026',
    canBLD:'Y', vuongMac:'Vướng mắc thực tế', nextPlan:'Kế hoạch tuần tới thực tế', result:'' },
  { ...BASE, id:'IP5-003', name:'Task bị block', state:'Blocked', progress:'20', status:'Red',
    initiative:'INIT-02', team:'BL', picRes:'TestUser', endDate:today, tuanBC:'Tuần 02/2026',
    canBLD:'N', vuongMac:'Bị block rồi', nextPlan:'', result:'' },
  { ...BASE, id:'IP5-004', name:'Task quá hạn', state:'Đang thực hiện', progress:'30', status:'Red',
    initiative:'INIT-01', team:'Số', picRes:'TuanTT4', endDate:'2026-01-01', tuanBC:'Tuần 01/2026',
    canBLD:'N', vuongMac:'', nextPlan:'', result:'' },
  { ...BASE, id:'IP5-005', name:'Task cần chú ý', state:'Đang thực hiện', progress:'60', status:'Amber',
    initiative:'INIT-03', team:'Số', picRes:'TuanTT4', endDate:nextMonth, tuanBC:'Tuần 01/2026',
    canBLD:'N', vuongMac:'', nextPlan:'', result:'' },
];

// ── Inject helper ────────────────────────────────────────────────────────────
async function inject(page) {
  await page.evaluate(({ tasks, user }) => {
    db.tasks = tasks;
    db.initiatives = [];
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token',
      exp: Date.now() + 86400000,
      user
    }));
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
  }, { tasks: MOCK_TASKS, user: MOCK_USER });
  await page.evaluate(() => { navigateTo('my-work'); });
  await page.waitForTimeout(600);
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
await inject(page);

// ── IP5-1: QV filter options — EN ────────────────────────────────────────────
console.log('\nIP5-1: QV filter dropdown options in EN');
await page.evaluate(() => { setLang('en'); openQuickView(); });
await page.waitForTimeout(200);
const qvFilterAllText = await page.$eval('#qvFilterInit option[value=""]', el => el.textContent.trim());
const qvTuanAllText   = await page.$eval('#qvFilterTuan option[value=""]', el => el.textContent.trim());
const qvThisWeekText  = await page.$eval('#qvFilterTuan option[value="__thisweek__"]', el => el.textContent.trim());
ok('QV init filter "All"', qvFilterAllText === 'All');
ok('QV week filter "All Weeks"', qvTuanAllText === 'All Weeks');
ok('QV week filter "📅 This Week"', qvThisWeekText.includes('This Week'));

// ── IP5-2: QV subtitle — EN ───────────────────────────────────────────────────
console.log('\nIP5-2: QV subtitle in EN');
const subtitle = await page.$eval('#qvpSubtitle', el => el.textContent.trim());
ok('QV subtitle contains "tasks"', subtitle.includes('tasks'));
ok('QV subtitle contains "All"', subtitle.includes('All'));

// ── IP5-3: QV done card "Done:" label ────────────────────────────────────────
console.log('\nIP5-3: QV done card "Done:" label in EN');
const doneHtml = await page.$eval('#qvDoneList', el => el.innerHTML);
ok('QV done card shows "Done:"', doneHtml.includes('Done:'));

// ── IP5-4: QV state chip translated in done card ──────────────────────────────
console.log('\nIP5-4: QV state chip translated via tState()');
const issueHtml = await page.$eval('#qvIssueList', el => el.innerHTML);
ok('QV issue: Blocked chip still "Blocked"', issueHtml.includes('Blocked'));

// ── IP5-5: QV plan card next-week plan label ─────────────────────────────────
console.log('\nIP5-5: QV plan card "Next Week Plan" label in EN');
const planHtml = await page.$eval('#qvPlanList', el => el.innerHTML);
ok('QV plan card shows "Next Week Plan"', planHtml.includes('Next Week Plan'));
ok('QV plan card shows work-count "tasks to do"', planHtml.includes('tasks to do'));

// ── IP5-6: QV initiative "Group by Initiative" label ─────────────────────────
console.log('\nIP5-6: QV initiative group-by label in EN');
const initHtml = await page.$eval('#qvInitList', el => el.innerHTML);
ok('QV init shows "Group by Initiative"', initHtml.includes('Group by Initiative'));

// ── IP5-7: QV issue flags EN labels ──────────────────────────────────────────
console.log('\nIP5-7: QV issue flags in EN');
ok('QV issue flag "Pending Approval"', issueHtml.includes('Pending Approval'));
ok('QV issue flag "Issue"', issueHtml.includes('Issue'));

// ── IP5-8: QV time prefix "Updated:" in EN ───────────────────────────────────
console.log('\nIP5-8: QV time prefix in EN');
const qvTime = await page.$eval('#qvpTime', el => el.textContent.trim());
ok('QV time shows "Updated:"', qvTime.startsWith('Updated:'));

// ── IP5-9: QV switch back to VI ───────────────────────────────────────────────
console.log('\nIP5-9: QV switch back to VI');
await page.evaluate(() => { setLang('vi'); });
await page.waitForTimeout(200);
const qvFilterAllVI = await page.$eval('#qvFilterInit option[value=""]', el => el.textContent.trim());
const subtitleVI     = await page.$eval('#qvpSubtitle', el => el.textContent.trim());
const qvTimeVI       = await page.$eval('#qvpTime', el => el.textContent.trim());
ok('QV init filter restored to "Tất cả"', qvFilterAllVI === 'Tất cả');
ok('QV subtitle restored to "Tất cả"', subtitleVI.includes('Tất cả'));
ok('QV time prefix restored to "Cập nhật:"', qvTimeVI.startsWith('Cập nhật:'));
await page.evaluate(() => closeQuickView());

// ── IP5-10: Executive Summary empty state in EN ───────────────────────────────
console.log('\nIP5-10: Executive Summary empty state in EN');
await page.evaluate(() => {
  setLang('en');
  db.tasks = [];
  navigateTo('executive-summary');
  renderExecutiveSummary();
});
await page.waitForTimeout(200);
const esEmptyHtml = await page.$eval('#esInitTableBody', el => el.innerHTML);
ok('ES init table empty shows EN text', esEmptyHtml.includes('No data') || esEmptyHtml.includes('Upload Excel'));

// ── IP5-11: Executive Summary attention labels with data ──────────────────────
console.log('\nIP5-11: Executive Summary attention labels in EN');
await page.evaluate(tasks => { db.tasks = tasks; renderExecutiveSummary(); }, MOCK_TASKS);
await page.waitForTimeout(200);
const esAttenHtml = await page.$eval('#esAttentionList', el => el.innerHTML);
ok('ES attention: "Pending Approval" label', esAttenHtml.includes('Pending Approval'));
ok('ES attention: "Overdue" label', esAttenHtml.includes('Overdue'));

// ── IP5-12: Executive Summary init table status tags in EN ────────────────────
console.log('\nIP5-12: Executive Summary init table status tags in EN');
const esInitHtml = await page.$eval('#esInitTableBody', el => el.innerHTML);
ok('ES init table "High Risk" tag', esInitHtml.includes('High Risk'));
ok('ES init table "Watch" tag', esInitHtml.includes('Watch') || esInitHtml.includes('On Track'));

// ── IP5-13: Executive Summary switch back to VI ───────────────────────────────
console.log('\nIP5-13: Executive Summary switch back to VI');
await page.evaluate(() => { setLang('vi'); renderExecutiveSummary(); });
await page.waitForTimeout(200);
const esAttenVI = await page.$eval('#esAttentionList', el => el.innerHTML);
const esInitVI  = await page.$eval('#esInitTableBody', el => el.innerHTML);
ok('ES attention labels restored to VI', esAttenVI.includes('Cần BLĐ'));
ok('ES init table status tags restored to VI', esInitVI.includes('Rủi ro') || esInitVI.includes('tiến độ'));

// ── IP5-14: No JS errors ──────────────────────────────────────────────────────
console.log('\nIP5-14: No JS errors');
ok('Zero console errors', errors.length === 0);
if (errors.length) errors.forEach(e => console.error('   JS Error:', e));

// ── Teardown ──────────────────────────────────────────────────────────────────
await browser.close();
server.close();

const total = pass + fail;
console.log(`\n─────────────────────────────────────────────────`);
console.log(`verify_i18n_p5  ${pass}/${total}  ${fail === 0 ? 'PASS' : 'FAIL'}`);
if (fail > 0) process.exit(1);
