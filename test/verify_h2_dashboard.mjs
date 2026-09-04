/**
 * verify_h2_dashboard.mjs — H2 Dashboard view (executive) smoke tests
 *
 *  H2D1  – Structure: nav item, view section, report overlay
 *  H2D2  – Navigate via nav click → view visible + page title
 *  H2D3  – Exec summary: 6 KPI cards; team-score card ends with '%'
 *  H2D4  – By-member panel: one row per member
 *  H2D5  – By-pillar panel: one row per pillar (3)
 *  H2D6  – Objective progress: one row per objective
 *  H2D7  – Capacity table renders + overload row flagged
 *  H2D8  – Top Risks / Top Dependencies list open items
 *  H2D9  – AI Impact panel renders for P3-AI
 *  H2D10 – Management Actions container renders
 *  H2D11 – Charts: trend + rag canvases present
 *  H2D12 – Executive report overlay opens with report text; close works
 *  H2D13 – Empty state when no objectives
 *  H2DX  – No JS errors
 *
 * Run: node verify_h2_dashboard.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3073;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'h2_dashboard');
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
    { ID: 'OBJ-26-001', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'Số hóa BLOL', Why: 'Sản phẩm', Owner: 'QuangNN3', Priority: 'P1', Weight: '60', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-002', Type: 'member', ParentID: '', Pillar: 'P3-AI',  ObjectiveName: 'AI năng suất', Why: 'AI',      Owner: 'QuangNN3', Priority: 'P1', Weight: '40', Category: 'C', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-003', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'GNOL E2E',    Why: 'Roadmap',   Owner: 'DungLQ1',  Priority: 'P1', Weight: '90', Category: 'B', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'DungLQ1' },
    // Overload member: 4 × P1 objectives → p1 (4) > max_p1 (3)
    { ID: 'OBJ-26-010', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'OL-1', Why: '', Owner: 'OverX', Priority: 'P1', Weight: '25', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'OverX' },
    { ID: 'OBJ-26-011', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'OL-2', Why: '', Owner: 'OverX', Priority: 'P1', Weight: '25', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'OverX' },
    { ID: 'OBJ-26-012', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'OL-3', Why: '', Owner: 'OverX', Priority: 'P1', Weight: '25', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'OverX' },
    { ID: 'OBJ-26-013', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'OL-4', Why: '', Owner: 'OverX', Priority: 'P1', Weight: '25', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'OverX' },
  ],
  kpis: [
    { ID: 'KPI-26-001', ObjectiveID: 'OBJ-26-001', KpiName: 'TAT xử lý BL', KpiType: 'A', Baseline: '8', Target: '5', Unit: 'ngày', Weight: '100', Deadline: future, Status: 'Đang thực hiện', Evidence: '', Owner: 'QuangNN3' },
    { ID: 'KPI-26-002', ObjectiveID: 'OBJ-26-002', KpiName: '≥2 công cụ AI', KpiType: 'C', Baseline: '0', Target: '2', Unit: 'công cụ', Weight: '100', Deadline: future, Status: 'Hoàn thành', Evidence: '', Owner: 'QuangNN3' },
    { ID: 'KPI-26-003', ObjectiveID: 'OBJ-26-003', KpiName: 'Go-live GĐ2', KpiType: 'B', Baseline: '', Target: '', Unit: '', Weight: '', Deadline: '', Status: 'Chưa bắt đầu', Evidence: '', Owner: 'DungLQ1' },
  ],
  milestones: [
    { ID: 'MS-26-001', KpiID: 'KPI-26-001', Month: 'T10', Quarter: 'Q4', MilestoneName: '2 nghiệp vụ go-live', DueDate: future, Owner: 'QuangNN3', Status: 'Đang thực hiện', RAG: 'AMBER', TaskRef: 'SO-26-012' },
  ],
  tracking: [{ ID: 'TRK-26-001', Month: 'T10', KpiID: 'KPI-26-001', Member: 'QuangNN3', Target: '5', Actual: '6.5', Progress: '50', RAG: '', Issue: 'Chờ DCB mở API', NextAction: '', SupportNeeded: '', UpdatedAt: '' }],
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

async function loginAndRender() {
  await page.evaluate(({ mock }) => {
    window.readH2 = async () => {};   // chặn loader thật clobber mock
    Object.assign(dbH2, { config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] });
    Object.assign(dbH2, mock);
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000,
      user: { username: 'TeamleadX', role: 'Teamlead', team: 'Số', displayName: 'TL' }
    }));
    const lo = document.getElementById('loginOverlay'); if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch (e) {}
    navigateTo('h2-dashboard');
  }, { mock: MOCK });
  await page.waitForTimeout(500);
}

await loginAndRender();

/* H2D1 — structure */
for (const [id, sel] of [['nav', '[data-view="h2-dashboard"]'], ['view', '#view-h2-dashboard'], ['reportOverlay', '#h2ReportOverlay']]) {
  log('H2D1-' + id, !!(await page.$(sel)), `${sel} tồn tại`);
}
await shot(page, '01_dashboard');

/* H2D2 — navigate */
await page.evaluate(() => navigateTo('dashboard'));
await page.waitForTimeout(150);
await page.evaluate(() => { const it=document.querySelector('[data-view="h2-dashboard"]'); const g=it&&it.closest('.nav-group'); if(g)g.classList.add('open'); });
await page.click('[data-view="h2-dashboard"]');
await page.waitForTimeout(300);
log('H2D2-visible', await page.$eval('#view-h2-dashboard', el => el.style.display !== 'none'), 'Nav click → view visible');
log('H2D2-title', (await page.$eval('#pageTitle', el => el.textContent)).includes('H2'), `Page title = "${await page.$eval('#pageTitle', el => el.textContent)}"`);

/* H2D3 — exec summary cards */
const cardNums = await page.$$eval('.h2-kpi-card .h2-kpi-card-num', els => els.map(e => e.textContent.trim()));
log('H2D3-count', cardNums.length === 6, `exec cards = ${cardNums.length} (expect 6)`);
log('H2D3-score', /%$/.test(cardNums[0] || ''), `team-score card = "${cardNums[0]}" (ends with %)`);

/* H2D4 — by member (dynamic vs member count) */
const memberCount = await page.evaluate(() => _h2Members().length);
const byMemberRows = await page.$$eval('#h2ByMember .h2-mrow', els => els.length);
log('H2D4', byMemberRows === memberCount, `by-member rows = ${byMemberRows} (expect ${memberCount})`);

/* H2D5 — by pillar (3) */
const byPillarRows = await page.$$eval('#h2ByPillar .h2-mrow', els => els.length);
log('H2D5', byPillarRows === 3, `by-pillar rows = ${byPillarRows} (expect 3)`);

/* H2D6 — objective progress (one row per objective) */
const objCount = await page.evaluate(() => _h2AllObjs().length);
const objRows = await page.$$eval('#h2ObjProgress .h2-mrow', els => els.length);
log('H2D6', objRows === objCount, `obj-progress rows = ${objRows} (expect ${objCount})`);

/* H2D7 — capacity table + overload */
log('H2D7-table', !!(await page.$('#h2Capacity table.h2-cap-table')), 'Capacity table rendered');
const overloadRows = await page.$$eval('#h2Capacity tr.is-overload', els => els.length);
log('H2D7-overload', overloadRows >= 1, `overload rows = ${overloadRows} (expect ≥1: OverX 4×P1)`);
log('H2D7-badge', !!(await page.$('#h2Capacity .h2-overload')), 'Overload badge shown');

/* H2D8 — risks + deps */
log('H2D8-risk', (await page.$$('#h2TopRisks .h2-listrow')).length >= 1, `top-risk rows = ${(await page.$$('#h2TopRisks .h2-listrow')).length} (expect ≥1)`);
log('H2D8-dep',  (await page.$$('#h2TopDeps .h2-listrow')).length >= 1, `top-dep rows = ${(await page.$$('#h2TopDeps .h2-listrow')).length} (expect ≥1)`);

/* H2D9 — AI impact (P3-AI objective exists) */
const aiHtml = await page.$eval('#h2AiImpact', el => el.innerHTML);
log('H2D9', /h2-ai-head|h2-listrow/.test(aiHtml), 'AI Impact panel rendered (P3-AI)');

/* H2D10 — management actions container */
log('H2D10', !!(await page.$('#h2MgmtActions')) && (await page.$eval('#h2MgmtActions', el => el.innerHTML.length > 0)), 'Management Actions rendered');

/* H2D11 — charts */
log('H2D11-trend', !!(await page.$('#h2TrendChart')), 'Trend chart canvas present');
log('H2D11-rag',   !!(await page.$('#h2RagChart')),   'RAG chart canvas present');

/* H2D12 — executive report overlay */
await page.evaluate(() => h2OpenReport());
await page.waitForTimeout(250);
log('H2D12-open', await page.$eval('#h2ReportOverlay', el => el.style.display === 'flex'), 'Report overlay visible');
const reportText = await page.$eval('#h2ReportText', el => el.value).catch(() => '');
log('H2D12-text', /BÁO CÁO BLĐ/.test(reportText), 'Report text generated');
await shot(page, '02_report');
await page.evaluate(() => h2CloseReport());
log('H2D12-close', await page.$eval('#h2ReportOverlay', el => el.style.display === 'none'), 'Report overlay closed');

/* H2D13 — empty state */
await page.evaluate(() => { dbH2.objectives = []; renderH2Dashboard(); });
await page.waitForTimeout(200);
log('H2D13', !!(await page.$('#view-h2-dashboard .h2-empty')), 'Empty state shown when no objectives');
await shot(page, '03_empty');

/* H2DX — no JS errors */
log('H2DX', jsErrors.length === 0, jsErrors.length ? `errors: ${jsErrors.join(' | ')}` : 'no JS errors');

console.log(`\n── H2 dashboard: ${passed}/${passed + failed} passed ──`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
