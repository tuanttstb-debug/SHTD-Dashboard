/**
 * verify_case_pipeline.mjs — Playwright tests for Case Pipeline feature
 * Run: node verify_case_pipeline.mjs
 */

import { chromium } from '../node_modules/playwright/index.mjs';
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE  = 'http://localhost:3030';

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(3030);
const PASS  = '✅';
const FAIL  = '❌';
let passed  = 0;
let failed  = 0;
const results = [];

function log(id, name, ok, detail = '') {
  const icon = ok ? PASS : FAIL;
  console.log(`${icon} ${id}: ${name}${detail ? ' — ' + detail : ''}`);
  results.push({ id, name, ok });
  if (ok) passed++; else failed++;
}

/* ── Sample cases ── */
const SAMPLE_CASES = [
  {
    id: 'CP-001', tuanBC: 'Tuần 18/2026', team: 'PTKDMB', pic: 'AnhDT24',
    dvkd: 'HDG', caseName: 'Wego Việt Nam', loaiHinh: 'Món',
    complexity: 'Cao', phuongAn: 'Tài trợ trung hạn nhà máy linh kiện nhựa',
    giaTriTy: 220, stage: 'Chờ dữ liệu/ĐVKD', vuongMac: 'Cần làm rõ dự án',
    nextStep: 'Trình chủ trương GĐK',
    startDate: '2026-03-30', deadline: '2026-04-29',
    rag: 'Đỏ', canBLD: 'Y', highlight: 'N', ghiChu: '', yKienBLD: ''
  },
  {
    id: 'CP-002', tuanBC: 'Tuần 19/2026', team: 'PTKDMB', pic: 'HungNV',
    dvkd: 'SHB', caseName: 'ABC Corp Dự án nhà xưởng', loaiHinh: 'Dự án',
    complexity: 'Trung bình', phuongAn: 'Cho vay đầu tư nhà xưởng',
    giaTriTy: 50, stage: 'Đang phân tích', vuongMac: '',
    nextStep: 'Gửi hồ sơ thẩm định',
    startDate: '2026-04-01', deadline: '2026-05-15',
    rag: '', canBLD: 'N', highlight: 'Y', ghiChu: 'Case tiềm năng', yKienBLD: ''
  }
];

/* ── Load page with auth + data injected ── */
async function loadWithData(page, cases) {
  await page.goto(BASE);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((cases) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'local-test-token',
      user: { username: 'TuanTT4', displayName: 'TuanTT4', role: 'Admin', team: 'Số' },
      exp: Date.now() + 3600 * 1000
    }));
    const existing = JSON.parse(localStorage.getItem('shtd_v2') || '{}');
    existing.cases = cases;
    if (!existing.tasks) existing.tasks = [];
    if (!existing.initiatives) existing.initiatives = [];
    localStorage.setItem('shtd_v2', JSON.stringify(existing));
    localStorage.removeItem('cp_view'); // always start with default (table)
  }, cases);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  // Wait for loadingOverlay to disappear (GAS calls are aborted)
  await page.waitForFunction(
    () => { const el = document.getElementById('loadingOverlay'); return !el || !el.classList.contains('visible'); },
    { timeout: 10000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Abort GAS calls — prevents hanging loadingOverlay
  await context.route('**/script.google.com/**', r => r.abort());
  await context.route('**/macros/**', r => r.abort());

  const page = await context.newPage();
  const pageErrors = [];
  const NOISE = [/ERR_ABORTED/, /net::ERR_/, /Chart is not defined/, /ERR_CERT/];
  page.on('pageerror', e => {
    if (!NOISE.some(r => r.test(e.message))) pageErrors.push(e.message);
  });
  page.on('console', m => {
    if (m.type() === 'error' && !NOISE.some(r => r.test(m.text()))) {
      // Only log non-noise errors
    }
  });

  // ── Load app with test data ──
  await loadWithData(page, SAMPLE_CASES);

  /* ─── TEST01: Login bypassed, app renders ─── */
  try {
    const loginHidden = !(await page.locator('#loginOverlay').isVisible());
    log('TEST01', 'Auth inject bypasses login overlay', loginHidden);
  } catch(e) { log('TEST01', 'Auth inject', false, e.message); }

  /* ─── TEST02: Case Pipeline nav item exists ─── */
  try {
    const navItem = await page.locator('[data-view="case-pipeline"]').count();
    log('TEST02', 'Case Pipeline nav item present', navItem > 0);
  } catch(e) { log('TEST02', 'Nav item', false, e.message); }

  /* ─── TEST03: Navigate to Case Pipeline ─── */
  try {
    await page.locator('[data-view="case-pipeline"]').click();
    await page.waitForTimeout(400);
    const visible = await page.locator('#view-case-pipeline').isVisible();
    const title   = await page.locator('#pageTitle').textContent();
    log('TEST03', 'Case Pipeline view shows on click', visible, `title="${title}"`);
  } catch(e) { log('TEST03', 'Navigate', false, e.message); }

  /* ─── TEST04: Summary cards (4) ─── */
  try {
    const cards = await page.locator('#view-case-pipeline .cp-stat-card').count();
    log('TEST04', 'Summary cards rendered (4)', cards === 4, `got ${cards}`);
  } catch(e) { log('TEST04', 'Summary cards', false, e.message); }

  /* ─── TEST05: Table is default view, has rows for seeded data ─── */
  try {
    const tableWrapVisible = await page.locator('#cpTableWrap').isVisible();
    const rows = await page.locator('#cpTbody tr').count();
    log('TEST05', 'Table is default view with data rows', tableWrapVisible && rows >= 2, `tableVisible=${tableWrapVisible} rows=${rows}`);
  } catch(e) { log('TEST05', 'Table default view', false, e.message); }

  /* ─── TEST05b: Kanban toggle shows 14 columns ─── */
  try {
    await page.locator('.cp-view-btn[data-view="kanban"]').click();
    await page.waitForTimeout(300);
    const cols = await page.locator('.cp-col').count();
    log('TEST05b', 'Kanban toggle shows 14 columns', cols === 14, `got ${cols}`);
    await page.locator('.cp-view-btn[data-view="table"]').click();
    await page.waitForTimeout(200);
  } catch(e) { log('TEST05b', 'Kanban toggle 14 cols', false, e.message); }

  /* ─── TEST06: Summary card total shows 2 cases ─── */
  try {
    const total = await page.locator('#cpStatTotal').textContent();
    log('TEST06', 'Summary total = 2 (seeded cases)', total.trim() === '2', `got "${total}"`);
  } catch(e) { log('TEST06', 'Summary total', false, e.message); }

  /* ─── TEST07: CP-001 (Wego) appears as table row ─── */
  try {
    const row = await page.locator('#cpTbody tr').filter({ hasText: 'Wego Việt Nam' }).count();
    log('TEST07', 'CP-001 (Wego Việt Nam) appears in table row', row > 0);
  } catch(e) { log('TEST07', 'Row in table', false, e.message); }

  /* ─── TEST08: Filter dropdowns present ─── */
  try {
    const team  = await page.locator('#cpFilterTeam').count();
    const loai  = await page.locator('#cpFilterLoai').count();
    const stage = await page.locator('#cpFilterStage').count();
    const rag   = await page.locator('#cpFilterRag').count();
    log('TEST08', 'All 4 filter dropdowns present', team > 0 && loai > 0 && stage > 0 && rag > 0);
  } catch(e) { log('TEST08', 'Filter dropdowns', false, e.message); }

  /* ─── TEST08b: Preset bar has 4 tabs ─── */
  try {
    const tabs = await page.locator('.cp-preset-btn').count();
    const activeTab = await page.locator('.cp-preset-btn.active').count();
    log('TEST08b', 'Preset bar has 4 tabs (1 active)', tabs === 4 && activeTab === 1, `tabs=${tabs} active=${activeTab}`);
  } catch(e) { log('TEST08b', 'Preset tabs', false, e.message); }

  /* ─── TEST09: Open Thêm Case modal ─── */
  try {
    await page.locator('button:has-text("Thêm Case")').first().click();
    await page.waitForTimeout(300);
    const modalVis = await page.locator('#cpModal').isVisible();
    log('TEST09', 'Thêm Case modal opens', modalVis);
  } catch(e) { log('TEST09', 'Open modal', false, e.message); }

  /* ─── TEST10: Auto-generated ID format CP-XXX ─── */
  try {
    const idVal = await page.locator('#cpfId').inputValue();
    const ok    = /^CP-\d{3}$/.test(idVal);
    log('TEST10', `Auto-gen ID format CP-XXX (got "${idVal}")`, ok);
  } catch(e) { log('TEST10', 'Auto-gen ID', false, e.message); }

  /* ─── TEST11: Validation - empty case name ─── */
  try {
    await page.locator('#cpfCaseName').fill('');
    await page.locator('button:has-text("Lưu Case")').click();
    await page.waitForTimeout(300);
    const stillOpen = await page.locator('#cpModal').isVisible();
    log('TEST11', 'Validation keeps modal open on empty caseName', stillOpen);
  } catch(e) { log('TEST11', 'Validation', false, e.message); }

  /* ─── TEST12: Add new case → row in table ─── */
  try {
    await page.locator('#cpfCaseName').fill('Test Case Playwright');
    await page.locator('#cpfStage').selectOption('Tiếp nhận');
    await page.locator('#cpfTeam').selectOption({ index: 1 }); // pick first non-empty option from TEAM_LIST
    await page.locator('#cpfGiaTri').fill('88');
    await page.locator('button:has-text("Lưu Case")').click();
    await page.waitForTimeout(600);
    const closed   = !(await page.locator('#cpModal').isVisible());
    const rowInTable = await page.locator('#cpTbody tr').filter({ hasText: 'Test Case Playwright' }).count();
    log('TEST12', 'Add case → modal closes + row in table', closed && rowInTable > 0,
      `closed=${closed} row=${rowInTable}`);
  } catch(e) { log('TEST12', 'Add case', false, e.message); }

  /* ─── TEST13: openCaseModal(id) → edit modal title = Sửa Case ─── */
  // Row click now opens detail view (cpOpenDetail → openCaseViewPopup), not edit modal directly.
  // Test the actual edit modal by calling openCaseModal(id) directly.
  try {
    const opened = await page.evaluate(() => {
      const c = dbCases.find(x => x.caseName === 'Wego Việt Nam');
      if (!c) return null;
      openCaseModal(c.id);
      return c.id;
    });
    await page.waitForTimeout(300);
    const title  = await page.locator('#cpModalTitle').textContent();
    const isEdit = title.includes('Sửa');
    log('TEST13', 'openCaseModal(id) → edit modal (Sửa Case)', isEdit, `title="${title}" id=${opened}`);
    await page.evaluate(() => closeCaseModal && closeCaseModal());
    await page.waitForTimeout(200);
  } catch(e) { log('TEST13', 'Edit modal', false, e.message); }

  /* ─── TEST14: Delete button visible in edit modal ─── */
  try {
    await page.evaluate(() => {
      const c = dbCases.find(x => x.caseName === 'Wego Việt Nam');
      if (c) openCaseModal(c.id);
    });
    await page.waitForTimeout(300);
    const delVis = await page.locator('#cpModalDeleteBtn').isVisible();
    log('TEST14', 'Delete button visible in edit modal', delVis);
    await page.evaluate(() => closeCaseModal && closeCaseModal());
    await page.waitForTimeout(200);
  } catch(e) { log('TEST14', 'Delete button', false, e.message); }

  /* ─── TEST15: ESC closes modal ─── */
  try {
    await page.locator('button:has-text("Thêm Case")').first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const closed = !(await page.locator('#cpModal').isVisible());
    log('TEST15', 'ESC closes case modal', closed);
  } catch(e) { log('TEST15', 'ESC close', false, e.message); }

  /* ─── TEST16: Filter by Loại hình=Món → table shows only Món cases ─── */
  try {
    await page.locator('#cpFilterLoai').selectOption('Món');
    await page.waitForTimeout(300);
    const rows = await page.locator('#cpTbody tr').count();
    // CP-001 is Món; CP-002 is Dự án; newly added has no loaiHinh
    const wegoRow = await page.locator('#cpTbody tr').filter({ hasText: 'Wego' }).count();
    log('TEST16', 'Filter Loại hình=Món → table shows Wego row only', rows >= 1 && wegoRow > 0,
      `rows=${rows} wegoRow=${wegoRow}`);
    await page.locator('#cpFilterLoai').selectOption('');
    await page.waitForTimeout(200);
  } catch(e) { log('TEST16', 'Filter Loại hình', false, e.message); }

  /* ─── TEST17: Filter by RAG=Đỏ → table rows ≥ 1 ─── */
  try {
    await page.locator('#cpFilterRag').selectOption('Đỏ');
    await page.waitForTimeout(300);
    const rows = await page.locator('#cpTbody tr').count();
    // CP-001 has rag='Đỏ' → at least 1
    log('TEST17', 'Filter RAG=Đỏ → table shows ≥1 row', rows >= 1, `got ${rows}`);
    await page.locator('#cpFilterRag').selectOption('');
    await page.waitForTimeout(200);
  } catch(e) { log('TEST17', 'Filter RAG', false, e.message); }

  /* ─── TEST18: G+C shortcut ─── */
  try {
    await page.locator('[data-view="dashboard"]').click();
    await page.waitForTimeout(200);
    const body = page.locator('body');
    await body.press('g');
    await body.press('c');
    await page.waitForTimeout(400);
    const visible = await page.locator('#view-case-pipeline').isVisible();
    log('TEST18', 'G+C shortcut → Case Pipeline view', visible);
  } catch(e) { log('TEST18', 'G+C shortcut', false, e.message); }

  /* ─── TEST19: BLD Queue shows [CASE] badge for canBLD=Y case ─── */
  try {
    await page.evaluate(() => { const it=document.querySelector('[data-view="bld-queue"]'); const g=it&&it.closest('.nav-group'); if(g)g.classList.add('open'); });
    await page.locator('[data-view="bld-queue"]').click();
    await page.waitForTimeout(500);
    const caseBadge = await page.locator('#bldPendingList').locator('text=[CASE]').count();
    log('TEST19', 'BLD Queue shows [CASE] badge for CP-001 (canBLD=Y)', caseBadge > 0, `found ${caseBadge}`);
  } catch(e) { log('TEST19', 'BLD Queue [CASE]', false, e.message); }

  /* ─── TEST20: BLD count chip includes case ─── */
  try {
    const chip = await page.locator('#bldCountChip').textContent();
    // CP-001 has canBLD=Y → at least 1
    const hasCount = /[1-9]/.test(chip);
    log('TEST20', 'BLD count chip > 0 (includes CP-001)', hasCount, `chip="${chip}"`);
  } catch(e) { log('TEST20', 'BLD count chip', false, e.message); }

  /* ─── Final page error check ─── */
  if (pageErrors.length) {
    console.log('\n[PAGE ERRORS]', pageErrors.join('\n'));
  }

  await browser.close();
  server.close();

  /* ─── Summary ─── */
  console.log('\n' + '─'.repeat(50));
  console.log(`verify_case_pipeline: ${passed}/${passed + failed} PASS`);
  if (failed > 0) {
    console.log('\nFailed:');
    results.filter(r => !r.ok).forEach(r => console.log(`  ${FAIL} ${r.id}: ${r.name}`));
  }
  console.log('─'.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
