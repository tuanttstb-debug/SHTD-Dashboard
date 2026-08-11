/**
 * verify_h2_tracker.mjs — B3 H2 Tracker view smoke tests
 *
 *  H2T1  – Structure: nav item, view section, 3 modals, view overlay, stat bar
 *  H2T2  – Navigate via nav click → view visible + page title
 *  H2T3  – Render: member groups + objective cards + kpi rows
 *  H2T4  – Stat bar counts (objectives / kpis / p1)
 *  H2T5  – Weight badge: 100%→ok, 90%→warn
 *  H2T6  – Lead (Teamlead) sees "Thêm Objective" + card action buttons
 *  H2T7  – RAG badge rendered on kpi rows; ≥1 GREEN
 *  H2T8  – Bad-KPI flag shown (missing target)
 *  H2T9  – Open Objective modal → visible + selects populated
 *  H2T10 – Open KPI modal from card → objective preselected
 *  H2T11 – Objective view popup opens + lists KPIs
 *  H2T12 – Filter by member → only that member's objectives
 *  H2T13 – RBAC: User role → no edit buttons / no Add
 *  H2TX  – No JS errors
 *
 * Run: node verify_h2_tracker.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = 3072;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'h2_tracker');
if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[path.extname(fp)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime }); res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let passed = 0, failed = 0;
function log(id, ok, msg) { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); if (ok) passed++; else failed++; }
const shot = (page, n) => page.screenshot({ path: path.join(EVD_DIR, `${n}.png`), fullPage: false });

const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

const MOCK = {
  config: [{ Key: 'max_p1', Value: '3' }, { Key: 'max_objectives', Value: '5' }, { Key: 'rag_amber_pct', Value: '20' }],
  objectives: [
    { ID: 'OBJ-26-001', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'Số hóa BLOL', Why: 'Sản phẩm trọng tâm', Owner: 'QuangNN3', Priority: 'P1', Weight: '60', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-002', Type: 'member', ParentID: '', Pillar: 'P3-AI', ObjectiveName: 'AI năng suất', Why: 'AI transformation', Owner: 'QuangNN3', Priority: 'P1', Weight: '40', Category: 'C', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-003', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'GNOL E2E', Why: 'Roadmap', Owner: 'DungLQ1', Priority: 'P1', Weight: '90', Category: 'B', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'DungLQ1' },
  ],
  kpis: [
    { ID: 'KPI-26-001', ObjectiveID: 'OBJ-26-001', KpiName: 'TAT xử lý BL', KpiType: 'A', Baseline: '8', Target: '5', Unit: 'ngày', Weight: '100', Deadline: future, Status: 'Đang thực hiện', Evidence: '', Owner: 'QuangNN3' },
    { ID: 'KPI-26-002', ObjectiveID: 'OBJ-26-002', KpiName: '≥2 công cụ AI', KpiType: 'C', Baseline: '0', Target: '2', Unit: 'công cụ', Weight: '100', Deadline: future, Status: 'Hoàn thành', Evidence: '', Owner: 'QuangNN3' },
    { ID: 'KPI-26-003', ObjectiveID: 'OBJ-26-003', KpiName: 'Go-live GĐ2', KpiType: 'B', Baseline: '', Target: '', Unit: '', Weight: '', Deadline: '', Status: 'Chưa bắt đầu', Evidence: '', Owner: 'DungLQ1' },
  ],
  milestones: [
    { ID: 'MS-26-001', KpiID: 'KPI-26-001', Month: 'T10', Quarter: 'Q4', MilestoneName: '2 nghiệp vụ go-live', DueDate: future, Owner: 'QuangNN3', Status: 'Đang thực hiện', RAG: 'AMBER', TaskRef: 'SO-26-012' },
  ],
  tracking: [{ ID: 'TRK-26-001', Month: 'T10', KpiID: 'KPI-26-001', Member: 'QuangNN3', Target: '5', Actual: '6.5', Progress: '50', RAG: '', Issue: '', NextAction: '', SupportNeeded: '', UpdatedAt: '' }],
  risks: [{ ID: 'RSK-26-001', KpiID: 'KPI-26-001', Risk: 'Phụ thuộc DCB', Impact: 'Cao', Probability: 'TB', Mitigation: 'Bám lịch', Owner: 'QuangNN3', Status: 'Open' }],
  deps: [{ ID: 'DEP-26-001', KpiID: 'KPI-26-003', DependencyType: 'IT delivery', DependencyOwner: 'IT', RequiredDate: future, Status: 'Pending', Note: '' }],
  reviews: []
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.route('**://script.google.com/**', route => route.abort());

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(400);

async function loginAs(role) {
  await page.evaluate(({ mock, role }) => {
    window.readH2 = async () => {};   // chặn loader thật clobber mock
    Object.assign(dbH2, { config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] });
    Object.assign(dbH2, mock);
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000,
      user: { username: 'TeamleadX', role, team: 'Số', displayName: 'TL' }
    }));
    const lo = document.getElementById('loginOverlay'); if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch (e) {}
    navigateTo('h2-tracker');
  }, { mock: MOCK, role });
  await page.waitForTimeout(400);
}

await loginAs('Teamlead');

/* H2T1 — structure */
for (const [id, sel] of [['nav', '[data-view="h2-tracker"]'], ['view', '#view-h2-tracker'], ['objModal', '#h2ObjModal'], ['kpiModal', '#h2KpiModal'], ['msModal', '#h2MsModal'], ['overlay', '#h2ViewOverlay'], ['statbar', '#h2StatBar']]) {
  log('H2T1-' + id, !!(await page.$(sel)), `${sel} tồn tại`);
}
await shot(page, '01_tracker');

/* H2T2 — navigate */
await page.evaluate(() => navigateTo('dashboard'));
await page.waitForTimeout(150);
await page.click('[data-view="h2-tracker"]');
await page.waitForTimeout(250);
log('H2T2-visible', await page.$eval('#view-h2-tracker', el => el.style.display !== 'none'), 'Nav click → view visible');
log('H2T2-title', (await page.$eval('#pageTitle', el => el.textContent)).includes('H2'), `Page title = "${await page.$eval('#pageTitle', el => el.textContent)}"`);

/* H2T3 — render */
const groups = await page.$$eval('.h2-member-group', els => els.length);
const cards  = await page.$$eval('.h2-obj-card', els => els.length);
const kpiRows = await page.$$eval('.h2-kpi-row', els => els.length);
log('H2T3-groups', groups === 2, `member groups = ${groups} (expect 2)`);
log('H2T3-cards', cards === 3, `objective cards = ${cards} (expect 3)`);
log('H2T3-kpis', kpiRows === 3, `kpi rows = ${kpiRows} (expect 3)`);

/* H2T4 — stat bar */
const stats = await page.$$eval('#h2StatBar .h2-stat-num', els => els.map(e => e.textContent));
log('H2T4-obj', stats[0] === '3', `stat objectives = ${stats[0]} (expect 3)`);
log('H2T4-kpi', stats[1] === '3', `stat kpis = ${stats[1]} (expect 3)`);
log('H2T4-p1', stats[2] === '3', `stat P1 = ${stats[2]} (expect 3)`);

/* H2T5 — weight badges */
const wbadges = await page.$$eval('.h2-wbadge', els => els.map(e => ({ t: e.textContent.trim(), warn: e.classList.contains('warn') })));
log('H2T5-ok', wbadges.some(b => b.t.includes('100') && !b.warn), 'Quang Σ100% → ok badge');
log('H2T5-warn', wbadges.some(b => b.t.includes('90') && b.warn), 'Dung Σ90% → warn badge');

/* H2T6 — lead edit affordances */
log('H2T6-add', await page.$$eval('button', els => els.some(b => /Thêm Objective/.test(b.textContent))), 'Teamlead thấy "Thêm Objective"');
log('H2T6-cardact', (await page.$$('.h2-card-actions')).length === 3, `card action groups = ${(await page.$$('.h2-card-actions')).length} (expect 3)`);

/* H2T7 — RAG badges + ≥1 green */
const rags = await page.$$eval('.h2-kpi-row .h2-rag', els => els.map(e => e.className));
log('H2T7-rag', rags.length >= 3, `RAG badges on kpi rows = ${rags.length}`);
log('H2T7-green', rags.some(c => /h2-rag-green/.test(c)), 'KPI Hoàn thành → có ≥1 GREEN');

/* H2T8 — flag on incomplete KPI */
log('H2T8-flag', (await page.$$('.h2-flag')).length >= 1, `bad-KPI flags = ${(await page.$$('.h2-flag')).length} (expect ≥1: KPI-26-003)`);

/* H2T9 — open objective modal */
await page.evaluate(() => openH2ObjModal('OBJ-26-001'));
await page.waitForTimeout(200);
log('H2T9-visible', await page.$eval('#h2ObjModal', el => el.style.display === 'flex'), 'Objective modal visible');
log('H2T9-name', (await page.$eval('#h2ofName', el => el.value)) === 'Số hóa BLOL', 'Name prefilled');
log('H2T9-pillar', (await page.$$eval('#h2ofPillar option', els => els.length)) === 3, 'Pillar select có 3 option');
await shot(page, '02_obj_modal');
await page.evaluate(() => closeH2ObjModal());

/* H2T10 — open KPI modal from card (objective preselected) */
await page.evaluate(() => openH2KpiModal(null, 'OBJ-26-002'));
await page.waitForTimeout(200);
log('H2T10-preselect', (await page.$eval('#h2kfObjective', el => el.value)) === 'OBJ-26-002', 'KPI modal objective preselected = OBJ-26-002');
await page.evaluate(() => closeH2KpiModal());

/* H2T11 — objective view popup */
await page.evaluate(() => openH2ObjView('OBJ-26-001'));
await page.waitForTimeout(200);
log('H2T11-visible', await page.$eval('#h2ViewOverlay', el => el.style.display === 'flex'), 'View overlay visible');
log('H2T11-kpis', await page.$$eval('#h2ViewOverlay .h2-view-kpi', els => els.length >= 1), 'View popup lists KPIs');
await shot(page, '03_obj_view');
await page.evaluate(() => closeH2ObjView());

/* H2T12 — filter by member */
await page.evaluate(() => _h2SetFilter('member', 'DungLQ1'));
await page.waitForTimeout(200);
const dungCards = await page.$$eval('.h2-obj-card', els => els.length);
log('H2T12-filter', dungCards === 1, `filter Dung → ${dungCards} card (expect 1)`);
await page.evaluate(() => _h2SetFilter('member', ''));

/* H2T13 — RBAC: User role hides edits */
await loginAs('User');
log('H2T13-no-add', !(await page.$$eval('button', els => els.some(b => /Thêm Objective/.test(b.textContent)))), 'User KHÔNG thấy "Thêm Objective"');
log('H2T13-no-cardact', (await page.$$('.h2-card-actions')).length === 0, 'User KHÔNG thấy nút sửa/xóa trên card');
await shot(page, '04_user_readonly');

/* H2TX — no JS errors */
log('H2TX', jsErrors.length === 0, jsErrors.length ? `errors: ${jsErrors.join(' | ')}` : 'no JS errors');

console.log(`\n── H2 tracker: ${passed}/${passed + failed} passed ──`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
