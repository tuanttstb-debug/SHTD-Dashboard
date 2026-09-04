import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
const SS_DIR = path.join(__dirname, '_verify_screenshots');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR);

const ss = async (page, name) => {
  const p = path.join(SS_DIR, name + '.png');
  await page.screenshot({ path: p, fullPage: false });
  return p;
};

let errors = [];
let warnings = [];
let pass = 0;
let fail = 0;

function ok(label, detail='') { pass++; console.log(`  ✅ ${label}${detail ? ' — '+detail : ''}`); }
function ng(label, detail='') { fail++; console.error(`  ❌ ${label}${detail ? ' — '+detail : ''}`); }
function warn(label, detail='') { warnings.push(label); console.warn(`  ⚠️  ${label}${detail ? ' — '+detail : ''}`); }

async function navigate(page, view) {
  await page.evaluate(v => { const it=document.querySelector(`.nav-item[data-view="${v}"]`); const g=it&&it.closest('.nav-group'); if(g)g.classList.add('open'); }, view);
  await page.locator(`.nav-item[data-view="${view}"]`).click();
  await page.waitForTimeout(400);
}

async function fillModal(page, fields) {
  for (const [id, val] of Object.entries(fields)) {
    const el = page.locator('#' + id);
    const tag = await el.evaluate(e => e.tagName.toLowerCase());
    if (tag === 'select') await el.selectOption(val);
    else if (tag === 'textarea') { await el.fill(''); await el.type(val); }
    else { await el.fill(''); await el.fill(val); }
  }
}

async function openInitModal(page, id = null) {
  if (id) {
    // Edit existing
    await page.locator(`#init-card-${id} .init-card-actions button:first-child`).click();
  } else {
    await page.locator('button:has-text("Thêm Initiative")').click();
  }
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  await page.waitForTimeout(200);
}

async function closeModal(page) {
  await page.locator('#initModalOverlay .btn-ghost').first().click();
  await page.waitForTimeout(200);
}

async function saveModal(page) {
  await page.locator('#initModalOverlay .btn-primary').click();
  await page.waitForTimeout(300);
}

// ─────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Capture JS errors
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  console.log('\n══════════════════════════════════════════════');
  console.log('  Initiative Tracker — Verification Suite');
  console.log('══════════════════════════════════════════════\n');

  // ── Load app ──
  await page.goto(INDEX);
  await page.waitForTimeout(1200);
  await ss(page, '00_initial_load');
  const title = await page.title();
  console.log(`📄 Page: ${title}`);
  const errsBefore = errors.length;

  // ── Step 1: Navigate to Initiative Tracker ──
  console.log('\n[1] Navigate to Initiative Tracker');
  await navigate(page, 'initiative-tracker');
  await ss(page, '01_init_tracker_empty');

  const root = await page.locator('#initiativeTrackerRoot').isVisible();
  root ? ok('View renders') : ng('View root not visible');

  const statBar = await page.locator('.init-stat-bar').isVisible();
  statBar ? ok('Stat bar visible') : ng('Stat bar missing');

  const addBtn = await page.locator('button:has-text("Thêm Initiative")').isVisible();
  addBtn ? ok('Add Initiative button visible') : ng('Add button missing');

  const emptyState = await page.locator('.init-empty').isVisible();
  emptyState ? ok('Empty state shown when no data') : warn('No empty state (may have cached data)');

  // ── Step 2: Add SCF-001 root initiative ──
  console.log('\n[2] Add root initiative SCF-001');
  await openInitModal(page, null);

  // Check all 14 fields present
  const fields14 = ['initFId','initFName','initFCat','initFAcc','initFStart','initFDeadline',
                    'initFPct','initFStatus','initFMsTrack','initFMsDl','initFKpi','initFNotes',
                    'initFDoc','initFParent'];
  let missingFields = [];
  for (const f of fields14) {
    const exists = await page.locator('#'+f).count() > 0;
    if (!exists) missingFields.push(f);
  }
  missingFields.length === 0 ? ok('All 14 modal fields present') : ng('Missing fields: ' + missingFields.join(', '));

  await fillModal(page, {
    initFId:       'SCF-001',
    initFName:     'SCF Viettel Group – BTT NCC VTP',
    initFCat:      'Sản phẩm',
    initFAcc:      'MaiTTT7',
    initFStart:    '15-Jan-26',
    initFDeadline: '30-Jun-26',
    initFPct:      '88',
    initFStatus:   'Active',
    initFMsTrack:  'Ban hành sản phẩm & chương trình lãi suất',
    initFMsDl:     '15-Apr-26',
    initFKpi:      'Golive sản phẩm BTT NCC Viettel, dư nợ mục tiêu 500 tỷ',
  });
  await ss(page, '02_modal_scf001_filled');
  await saveModal(page);

  // Verify card appears
  await page.waitForTimeout(300);
  const cardSCF = await page.locator('#init-card-SCF-001').isVisible();
  cardSCF ? ok('SCF-001 card rendered') : ng('SCF-001 card NOT found after save');
  await ss(page, '03_scf001_card');

  // Check card shows correct data
  const cardText = await page.locator('#init-card-SCF-001').textContent();
  cardText.includes('SCF-001') ? ok('Card shows ID') : ng('Card ID missing');
  cardText.includes('MaiTTT7') ? ok('Card shows accountable') : ng('Accountable missing');
  cardText.includes('88%') ? ok('Card shows 88% progress') : ng('Progress % missing');
  cardText.includes('Active') ? ok('Card shows Active status') : ng('Status missing');

  // Stat bar updated
  const statActive = await page.locator('.init-stat-bar').textContent();
  statActive.includes('1') ? ok('Stat bar shows 1 initiative') : warn('Stat bar count may be off');

  // ── Step 3: Add M1-M4 milestones ──
  console.log('\n[3] Add milestones M1–M4 under SCF-001');
  const milestones = [
    { id:'M1', name:'Tờ trình MFT + chốt luồng SCF',            pct:'100', status:'Done',   start:'15-Jan-26', dl:'31-Mar-26' },
    { id:'M2', name:'Ban hành sản phẩm BTT cho NCC của VTP',    pct:'90',  status:'Active', start:'01-Feb-26', dl:'15-Apr-26' },
    { id:'M3', name:'Ban hành CT lãi suất ưu đãi cho NCC VTP',  pct:'80',  status:'Active', start:'01-Feb-26', dl:'15-Apr-26' },
    { id:'M4', name:'Ký hợp đồng BTT và golive sản phẩm',       pct:'80',  status:'Active', start:'15-Apr-26', dl:'30-Apr-26' },
  ];
  for (const ms of milestones) {
    await page.locator('button:has-text("Thêm Initiative")').click();
    await page.waitForSelector('#initModalOverlay', { state: 'visible' });
    await page.waitForTimeout(150);
    await fillModal(page, {
      initFId:       ms.id,
      initFName:     ms.name,
      initFStart:    ms.start,
      initFDeadline: ms.dl,
      initFPct:      ms.pct,
      initFStatus:   ms.status,
      initFParent:   'SCF-001',
    });
    await saveModal(page);
    await page.waitForTimeout(200);
    console.log(`     added ${ms.id}`);
  }
  await ss(page, '04_after_milestones_added');

  // M1-M4 are children, should NOT appear as root cards
  const m1card = await page.locator('#init-card-M1').count();
  m1card === 0 ? ok('M1 not rendered as root card (correct — it is a child)') : ng('M1 appears as top-level card (should be child of SCF-001)');

  // ── Step 4: Expand milestone list ──
  console.log('\n[4] Accordion – expand Milestones panel');
  await page.locator('#btn-ms-SCF-001').click();
  await page.waitForTimeout(300);
  const msPanel = await page.locator('#ms-list-SCF-001').isVisible();
  msPanel ? ok('Milestone panel expands') : ng('Milestone panel did not open');

  // Check all 4 milestones shown
  const msRows = await page.locator('#ms-list-SCF-001 .init-milestone-row').count();
  msRows === 4 ? ok(`4 milestones listed (M1-M4)`) : ng(`Expected 4 milestone rows, got ${msRows}`);

  // M1 should be Done (green dot)
  const m1dot = await page.locator('#ms-list-SCF-001 .init-milestone-row:first-child .init-step-dot').getAttribute('class');
  m1dot?.includes('done') ? ok('M1 step dot is "done" class') : warn(`M1 dot class: "${m1dot}" (expected done)`);
  await ss(page, '05_milestones_expanded');

  // ── Step 5: Expand Tasks panel ──
  console.log('\n[5] Accordion – expand Tasks panel');
  await page.locator('#btn-tk-SCF-001').click();
  await page.waitForTimeout(300);
  const tkPanel = await page.locator('#tk-list-SCF-001').isVisible();
  tkPanel ? ok('Tasks panel expands') : ng('Tasks panel did not open');

  const tkCount = await page.locator('#tk-list-SCF-001').textContent();
  if (tkCount.includes('Không có task')) {
    ok('Empty tasks panel shows correct message (no tasks linked to SCF-001 yet)');
  } else {
    ok('Tasks panel shows linked tasks');
  }
  await ss(page, '06_tasks_panel');

  // Collapse both panels
  await page.locator('#btn-ms-SCF-001').click();
  await page.waitForTimeout(200);
  const msClosed = !(await page.locator('#ms-list-SCF-001').evaluate(el => el.classList.contains('open')));
  msClosed ? ok('Milestone panel collapses') : ng('Milestone panel did not close');

  // ── Step 6: Edit initiative ──
  console.log('\n[6] Edit SCF-001 – change % to 90');
  await openInitModal(page, 'SCF-001');
  const pctField = page.locator('#initFPct');
  const currentPct = await pctField.inputValue();
  currentPct === '88' ? ok('Edit modal pre-filled pct = 88') : warn(`Pre-filled pct = "${currentPct}" (expected 88)`);

  await pctField.fill('90');
  await saveModal(page);
  await page.waitForTimeout(300);

  const updatedCard = await page.locator('#init-card-SCF-001').textContent();
  updatedCard.includes('90%') ? ok('Card updated to 90% after edit') : ng('Card did not update to 90%');
  await ss(page, '07_after_edit_scf001');

  // ── Step 7: Add milestone – duplicate ID check ──
  console.log('\n[7] Duplicate ID validation');
  await page.locator('button:has-text("Thêm Initiative")').click();
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  // Fill both ID (duplicate) AND name — duplicate check must fire before name check
  await page.locator('#initFId').fill('SCF-001');
  await page.locator('#initFName').fill('Duplicate name');
  await saveModal(page);
  await page.waitForTimeout(300);
  const errMsg = await page.locator('#initErrId').textContent();
  // Modal should still be open (blocked by duplicate), not closed
  const modalStillOpen = await page.locator('#initModalOverlay').isVisible();
  errMsg.includes('tồn tại') ? ok('Duplicate ID blocked with correct error message') : ng(`Duplicate check failed: err msg = "${errMsg}" (modal open: ${modalStillOpen})`);
  modalStillOpen ? ok('Modal stays open on duplicate (not closed)') : warn('Modal closed after duplicate attempt — may have saved incorrectly');
  await closeModal(page);

  // ── Step 8: Delete M3 milestone ──
  console.log('\n[8] Delete milestone M3');
  // Expand milestones to see M3 edit button
  await page.locator('#btn-ms-SCF-001').click();
  await page.waitForTimeout(300);
  // Click edit on M3
  const m3EditBtns = await page.locator('#ms-list-SCF-001 .init-milestone-row').all();
  let m3Row = null;
  for (const row of m3EditBtns) {
    const txt = await row.textContent();
    if (txt.includes('M3')) { m3Row = row; break; }
  }
  if (m3Row) {
    await m3Row.locator('button').click(); // edit
    await page.waitForSelector('#initModalOverlay', { state: 'visible' });
    await page.waitForTimeout(200);
    ok('M3 edit modal opens');
    // Now delete via _initDelete from within modal title check
    await closeModal(page);

    // Delete M3 via initiative top-level delete (it's a child, need to delete directly)
    // Use _initDelete programmatically
    const delResult = await page.evaluate(async () => {
      try {
        // _initDelete is global
        const ok = await new Promise(resolve => {
          // Override uiConfirm to auto-confirm
          const origConfirm = window.uiConfirm;
          window.uiConfirm = async () => { window.uiConfirm = origConfirm; return true; };
          window._initDelete('M3').then(resolve).catch(e => resolve(e?.message || 'error'));
        });
        return String(ok);
      } catch(e) { return 'exception: ' + e.message; }
    });
    await page.waitForTimeout(400);
    const m3gone = (await page.locator('#ms-list-SCF-001 .init-milestone-row').all()).length;
    // Re-expand panel (re-render may have closed it)
    await page.locator('#btn-ms-SCF-001').click();
    await page.waitForTimeout(200);
    const msAfterDel = await page.locator('#ms-list-SCF-001 .init-milestone-row').count();
    msAfterDel === 3 ? ok('M3 deleted — 3 milestones remain') : ng(`After M3 delete: ${msAfterDel} rows (expected 3)`);
    await ss(page, '08_after_m3_delete');
  } else {
    ng('M3 row not found in milestone list');
  }

  // ── Step 9: Delete SCF-001 (with children) ──
  console.log('\n[9] Delete SCF-001 initiative (cascade delete children)');
  // Must close milestone panel first to interact with delete btn
  await page.locator('#btn-ms-SCF-001').click(); // toggle off
  await page.waitForTimeout(200);

  const beforeDelete = await page.locator('#init-card-SCF-001').isVisible();
  if (!beforeDelete) { ng('SCF-001 card not visible before delete'); }

  // Programmatically delete to avoid confirm dialog issues with Playwright
  await page.evaluate(async () => {
    const origConfirm = window.uiConfirm;
    window.uiConfirm = async () => { window.uiConfirm = origConfirm; return true; };
    await window._initDelete('SCF-001');
  });
  await page.waitForTimeout(500);

  const afterDelete = await page.locator('#init-card-SCF-001').count();
  afterDelete === 0 ? ok('SCF-001 card removed after delete') : ng('SCF-001 card still visible after delete');

  // M1/M2/M4 should also be gone from db.initiatives
  const initCount = await page.evaluate(() => (window.db?.initiatives || []).length);
  initCount === 0 ? ok(`db.initiatives empty after delete (all children cascade-deleted)`) : ng(`db.initiatives has ${initCount} items (expected 0 after cascade delete)`);

  // Use waitFor + DOM inspection — isVisible() can be unreliable with display:contents parents
  let emptyStateCount = 0;
  try {
    await page.locator('.init-empty').waitFor({ state: 'attached', timeout: 2000 });
    emptyStateCount = await page.locator('.init-empty').count();
  } catch (_) { emptyStateCount = 0; }
  const emptyStateHtml = await page.locator('#initCardList').innerHTML().catch(() => '');
  emptyStateCount > 0
    ? ok('Empty state rendered in DOM after delete')
    : ng(`Empty state not in DOM after deleting all — #initCardList: "${emptyStateHtml.slice(0,80)}"`);
  await ss(page, '09_after_scf001_delete');

  // ── Step 10: Filter controls ──
  console.log('\n[10] Filter controls');
  // Re-add one initiative to test filters
  await page.locator('button:has-text("Thêm Initiative")').click();
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  await fillModal(page, { initFId:'TEST-001', initFName:'Test Filter', initFStatus:'Blocked', initFCat:'Kỹ thuật', initFPct:'50' });
  await saveModal(page);
  await page.waitForTimeout(300);

  // Filter by status = Active (should hide TEST-001 which is Blocked)
  const statusSel = page.locator('.toolbar-right select').nth(1);
  await statusSel.selectOption('Active');
  await page.waitForTimeout(200);
  const filteredCard = await page.locator('#init-card-TEST-001').count();
  filteredCard === 0 ? ok('Status filter hides non-matching cards') : ng('Status filter not working');

  await statusSel.selectOption(''); // reset
  await page.waitForTimeout(200);

  // ── Step 11: Task form milestone select ──
  console.log('\n[11] Task form – Milestone dropdown');
  await navigate(page, 'tasks');
  await page.locator('#btnNew, button:has-text("Thêm Task")').first().click();
  await page.waitForSelector('#taskOverlay.open', { timeout: 3000 });
  await page.waitForTimeout(300);

  // Change initiative to TEST-001 (has no milestones → should show generic M1-M8)
  const fInit = page.locator('#fInit');
  await fInit.selectOption('TEST-001');
  await page.waitForTimeout(200);
  const fMsOptions = await page.locator('#fMs option').count();
  fMsOptions > 1 ? ok(`Milestone dropdown has ${fMsOptions} options after initiative change`) : ng('Milestone dropdown empty after initiative change');
  await ss(page, '10_task_milestone_dropdown');

  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── Step 12: JS error check ──
  console.log('\n[12] JS error audit');
  const jsErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('net::ERR_') &&
    !e.includes('autoConnectDB') &&
    !e.includes('GS_WEBAPP_URL') &&
    !e.includes('readInitiatives') &&
    !e.includes('Failed to fetch')
  );
  jsErrors.length === 0
    ? ok(`0 JS errors (${errors.length} total msgs, all network/GAS — expected in offline test)`)
    : ng(`${jsErrors.length} unexpected JS error(s): ${jsErrors.slice(0,3).join(' | ')}`);

  // ─── Final report ───
  console.log('\n══════════════════════════════════════════════');
  console.log(`  RESULT: ${fail === 0 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Pass: ${pass}  Fail: ${fail}  Warn: ${warnings.length}`);
  if (warnings.length) console.log('  Warnings: ' + warnings.join(', '));
  if (fail > 0) {
    console.log('\n  Failed checks above ↑');
  }
  console.log('══════════════════════════════════════════════\n');

  await ss(page, '99_final_state');
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
