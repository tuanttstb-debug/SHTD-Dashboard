/**
 * verify_modal_layout.mjs
 * Test: Modal 2-column grids have equal column widths (no right-column squeezing)
 * Opens create modals (no existing data needed) and checks CSS Grid column equality.
 * Covers: Task (.form-grid), Case (.cp-modal-grid), Initiative (.init-modal-grid)
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3030';

function makeAuth(role = 'Admin') {
  return {
    token: 'local-test-token',
    user: { username: 'TuanTT4', displayName: 'Tuan', role, team: 'Số' },
    exp: Date.now() + 3600 * 1000,
  };
}

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else       { console.error(`  ❌ ${label}`); fail++; }
}

async function setupPage(browser) {
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/script.google.com/**', r => r.abort());
  await ctx.route('**/macros/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.error('  [JS ERR]', m.text()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((auth) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify(auth));
  }, makeAuth());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    !document.getElementById('loginOverlay') ||
    document.getElementById('loginOverlay')?.style.display === 'none',
    { timeout: 8000 }
  ).catch(() => {});
  await page.waitForTimeout(600);
  return { ctx, page };
}

async function nav(page, view) {
  await page.locator(`.nav-item[data-view="${view}"]`).click({ timeout: 10000 });
  await page.waitForTimeout(500);
}

/**
 * Measure widths of first two non-full-span cells in a CSS grid.
 * Returns { col1, col2 } widths in px, or null if grid/cells not found.
 */
async function getGridColumnWidths(page, gridSelector) {
  return page.evaluate((sel) => {
    const grid = document.querySelector(sel);
    if (!grid) return null;
    const children = [...grid.children].filter(el => {
      const cs = getComputedStyle(el);
      const start = cs.gridColumnStart;
      const end   = cs.gridColumnEnd;
      // skip full-span: grid-column: 1 / -1 or span 2
      return !(start === '1' && end === '-1') && !(end === 'span 2');
    });
    const col1 = children[0];
    const col2 = children[1];
    if (!col1 || !col2) return null;
    return {
      col1: col1.getBoundingClientRect().width,
      col2: col2.getBoundingClientRect().width,
    };
  }, gridSelector);
}

async function checkEqualColumns(page, gridSelector, label) {
  const widths = await getGridColumnWidths(page, gridSelector);
  if (!widths) {
    ok(`${label}: grid + 2 non-full-span columns found`, false);
    return;
  }
  ok(`${label}: grid found`, true);
  const diff = Math.abs(widths.col1 - widths.col2);
  ok(`${label}: columns equal (diff=${diff.toFixed(1)}px ≤ 2px)`, diff <= 2);
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  verify_modal_layout — Modal grid equal-column widths');
  console.log('══════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const { ctx, page } = await setupPage(browser);

  /* ── Task modal (Thêm Task) ── */
  console.log('[Task modal — .form-grid]');
  await nav(page, 'tasks');
  await page.evaluate(() => { if (typeof openTaskModal === 'function') openTaskModal(); });
  await page.waitForTimeout(400);
  const taskModalOpen = await page.locator('#taskOverlay.open').count() > 0;
  ok('Task modal opens via openTaskModal()', taskModalOpen);
  if (taskModalOpen) {
    await checkEqualColumns(page, '#taskOverlay .form-grid', 'Task .form-grid');
  }
  await page.evaluate(() => { if (typeof closeTaskModal === 'function') closeTaskModal(); });
  await page.waitForTimeout(200);

  /* ── Case modal (Thêm Case) — overlay id="cpModal" ── */
  console.log('\n[Case modal — .cp-modal-grid]');
  await nav(page, 'case-pipeline');
  await page.evaluate(() => { if (typeof openCaseModal === 'function') openCaseModal(null); });
  await page.waitForTimeout(400);
  const cpModalOpen = await page.evaluate(() => {
    const el = document.getElementById('cpModal');
    return el && el.style.display !== 'none';
  });
  ok('Case modal opens via openCaseModal(null)', cpModalOpen);
  if (cpModalOpen) {
    await checkEqualColumns(page, '#cpModal .cp-modal-grid', 'Case .cp-modal-grid');
  }
  await page.evaluate(() => { if (typeof closeCaseModal === 'function') closeCaseModal(); });
  await page.waitForTimeout(200);

  /* ── Initiative modal (Thêm Initiative) — overlay id="initModalOverlay" ── */
  console.log('\n[Initiative modal — .init-modal-grid]');
  await nav(page, 'initiative-tracker');
  await page.evaluate(() => { if (typeof _initOpenModal === 'function') _initOpenModal(null); });
  await page.waitForTimeout(400);
  const initModalOpen = await page.evaluate(() => {
    const el = document.getElementById('initModalOverlay');
    return el && el.style.display !== 'none';
  });
  ok('Initiative modal opens via _initOpenModal(null)', initModalOpen);
  if (initModalOpen) {
    await checkEqualColumns(page, '#initModalOverlay .init-modal-grid', 'Initiative .init-modal-grid');
  }
  await page.evaluate(() => {
    const el = document.getElementById('initModalOverlay');
    if (el) el.style.display = 'none';
  });
  await page.waitForTimeout(200);

  await ctx.close();
  await browser.close();

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`  verify_modal_layout: ${pass}/${pass + fail} PASS${fail > 0 ? ` (${fail} FAIL)` : ''}`);
  console.log(`${'─'.repeat(52)}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
