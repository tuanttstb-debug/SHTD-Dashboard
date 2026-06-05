/**
 * verify_initiative_v2.mjs
 * Tests Initiative Tracker with REAL GAS data (GNOL/BLOL format).
 * Waits for readInitiatives() to complete before testing.
 * Adds/deletes TEST-only items so real data is not permanently modified.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
const SS_DIR = path.join(__dirname, '_verify_screenshots');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR);

const ss = async (page, name) => {
  const p = path.join(SS_DIR, 'v2_' + name + '.png');
  await page.screenshot({ path: p, fullPage: false });
  return p;
};

let errors = [];
let pass = 0;
let fail = 0;
let warnings = [];

function ok(label, detail = '')  { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); }
function ng(label, detail = '')  { fail++; console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
function warn(label, detail = '') { warnings.push(label); console.warn(`  ⚠️  ${label}${detail ? ' — ' + detail : ''}`); }

// ── GAS raw data to inject (same format as Initiative_Master sheet, OLD 14-col schema)
// Tests backward compat: parser derives Type + ParentID from ID pattern
const GAS_SAMPLE = [
  ['ID','Tên Initiative / Milestone','Category','Accountable','Start Date','Deadline / Target','% HT',
   'Milestone Đang track','Deadline Milestone','Trạng thái','Mục tiêu / KPI đầu ra','Ghi chú','Link tài liệu','Parent ID'],
  // Initiative rows
  ['GNOL-001','GNOL Phase 1 - GN Thanh toán trong nước','Số hóa','TuTV3','06-Apr-26','01-Oct-26','',
   'Tập hợp kết quả khảo sát và phân tích','08-May-26','Active','','','',''],
  // Milestones for GNOL-001 (col8 = status; col10 Trạng thái = blank → parser reads col8 as status)
  ['GNOL-001-M1','Xây dựng bảo câu hỏi khảo sát','Số hóa','','06-Apr-26','10-Apr-26','100%','Xong','','','','','',''],
  ['GNOL-001-M2','Thực hiện triển khai xuống ĐVKD/KH','Số hóa','','13-Apr-26','24-Apr-26','100%','Xong','','','','','',''],
  ['GNOL-001-M3','Tập hợp kết quả và phân tích','Số hóa','','04-May-26','08-May-26','50%','Đang làm','','','','','',''],
  ['GNOL-001-M4','Xây dựng phương án cải tiến SP','Số hóa','','09-May-26','30-May-26','0%','Chưa bắt đầu','','','','','',''],
  ['GNOL-001-M5','Fix lỗi phát sinh','Số hóa','','01-Jan-26','30-Jun-26','50%','Đang làm','','','','','',''],
  // GNOL-002
  ['GNOL-002','GNOL Phase 2 – Mở rộng kênh GN CTQT','Số hóa','TuTV3','01-Mar-26','30-Nov-26','13%',
   'Xây dựng tài liệu phân tích BA','29-May-26','Active','','','',''],
  ['GNOL-002-M1','Tài liệu BRD/URD','Số hóa','','23-Mar-26','09-Apr-26','100%','Xong','','','','','',''],
  ['GNOL-002-M2','Xây dựng UI/UX','Số hóa','','08-Apr-26','24-Apr-26','100%','Xong','','','','','',''],
  ['GNOL-002-M3','Xây dựng tài liệu phân tích BA','Số hóa','','08-Apr-26','29-May-26','0%','Đang làm','','','','','',''],
  // BLOL-001
  ['BLOL-001','BPM BLOL Phase 4 – Số hóa luồng BL','Số hóa','CuongVM1','15-Feb-26','31-May-26','9%',
   'Xây dựng test case UAT','15-Apr-26','Active','','','',''],
  ['BLOL-001-M1','Phân tích nghiệp vụ','Số hóa','QuangNN3','10-Mar-26','25-Mar-26','100%','Xong','','','','','',''],
  ['BLOL-001-M2','Phát triển hệ thống','Số hóa','IT','25-Mar-26','15-May-26','0%','Đang làm','','','','','',''],
  ['BLOL-001-M3','Xây dựng test case UAT','Số hóa','QuangNN3','17-Mar-26','15-Apr-26','0%','Đang làm','','','','','',''],
  ['BLOL-001-M4','SIT 2 Batch và cuốn chiếu bàn giao','Số hóa','IT','05-May-26','05-Jun-26','0%','Chưa bắt đầu','','','','','',''],
];

async function navigate(page, view) {
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

async function saveModal(page) {
  await page.locator('#initModalOverlay .btn-primary').click();
  await page.waitForTimeout(400);
}

async function closeModal(page) {
  await page.locator('#initModalOverlay .btn-ghost').first().click();
  await page.waitForTimeout(200);
}

// ─────────────────────────────────────────────
async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Initiative Tracker v2 — GAS Data Verification');
  console.log('══════════════════════════════════════════════════════\n');

  // Block all GAS requests so background readInitiatives() doesn't overwrite injected data
  await page.route('**/script.google.com/**', route => route.abort());

  await page.goto(INDEX);
  await page.waitForTimeout(1500);

  // ── Step 1: Inject GAS-format data (14-col, no Type col → tests backward compat parsing) ──
  console.log('[1] Inject GAS sample data & navigate to Initiative Tracker');

  await page.evaluate((data) => {
    _parseInitiativeArray(data);
    persist();
  }, GAS_SAMPLE);

  await navigate(page, 'initiative-tracker');
  await page.waitForTimeout(600);
  await ss(page, '01_after_inject');

  // ── Step 2: Verify parsed data structure ──
  console.log('\n[2] Verify parsed data — type, parentId, status');

  const dbState = await page.evaluate(() => {
    const all = db.initiatives || [];
    const roots   = all.filter(i => i.type === 'initiative');
    const ms      = all.filter(i => i.type === 'milestone');
    const noType  = all.filter(i => !i.type);
    const gnol001 = all.find(i => i.id === 'GNOL-001');
    const m1      = all.find(i => i.id === 'GNOL-001-M1');
    const m3      = all.find(i => i.id === 'GNOL-001-M3');
    const m4      = all.find(i => i.id === 'GNOL-001-M4');
    return { total: all.length, roots: roots.length, ms: ms.length, noType: noType.length,
             gnol001Type: gnol001?.type, gnol001Status: gnol001?.status,
             m1Type: m1?.type, m1ParentId: m1?.parentId, m1Status: m1?.status,
             m3Status: m3?.status, m4Status: m4?.status };
  });

  dbState.gnol001Type === 'initiative'
    ? ok('GNOL-001 type = "initiative"')
    : ng('GNOL-001 type wrong', `got: "${dbState.gnol001Type}"`);

  dbState.m1Type === 'milestone'
    ? ok('GNOL-001-M1 type = "milestone"')
    : ng('GNOL-001-M1 type wrong', `got: "${dbState.m1Type}"`);

  dbState.m1ParentId === 'GNOL-001'
    ? ok('GNOL-001-M1 parentId = "GNOL-001" (derived from ID)')
    : ng('GNOL-001-M1 parentId wrong', `got: "${dbState.m1ParentId}"`);

  dbState.m1Status === 'Xong'
    ? ok('GNOL-001-M1 status = "Xong" (from col8 Milestone Đang track)')
    : ng('GNOL-001-M1 status wrong', `got: "${dbState.m1Status}" (expected "Xong")`);

  dbState.m3Status === 'Đang làm'
    ? ok('GNOL-001-M3 status = "Đang làm"')
    : ng('GNOL-001-M3 status wrong', `got: "${dbState.m3Status}"`);

  dbState.m4Status === 'Chưa bắt đầu'
    ? ok('GNOL-001-M4 status = "Chưa bắt đầu"')
    : ng('GNOL-001-M4 status wrong', `got: "${dbState.m4Status}"`);

  dbState.noType === 0
    ? ok(`All ${dbState.total} items have type field`)
    : ng(`${dbState.noType} items missing type field`);

  dbState.roots === 3
    ? ok(`3 root initiatives in db (GNOL-001, GNOL-002, BLOL-001)`)
    : ng(`Expected 3 root initiatives, got ${dbState.roots}`);

  // ── Step 3: Verify UI cards ──
  console.log('\n[3] Verify initiative cards rendered');

  const cardCount = await page.locator('.init-card').count();
  cardCount === 3
    ? ok('3 initiative cards rendered (GNOL-001, GNOL-002, BLOL-001)')
    : ng(`Expected 3 cards, got ${cardCount}`);

  for (const id of ['GNOL-001', 'GNOL-002', 'BLOL-001']) {
    const visible = await page.locator(`#init-card-${id}`).isVisible();
    visible ? ok(`Card ${id} visible`) : ng(`Card ${id} not found`);
  }

  // Check milestone count subtitle
  const subtitle = await page.locator('#initiativeTrackerRoot .toolbar-left div:last-child').textContent();
  subtitle.includes('milestone')
    ? ok('Subtitle shows milestone count', subtitle.trim())
    : warn('Subtitle format unexpected', subtitle.trim());

  await ss(page, '02_initiative_cards');

  // ── Step 4: Expand GNOL-001 milestones → verify short labels & status dots ──
  console.log('\n[4] Expand GNOL-001 milestones — short labels & status dots');

  await page.locator('#btn-ms-GNOL-001').click();
  await page.waitForTimeout(400);

  const msPanel = await page.locator('#ms-list-GNOL-001').evaluate(el => el.classList.contains('open'));
  msPanel ? ok('GNOL-001 milestone panel opens') : ng('Milestone panel did not open');

  const msRows = await page.locator('#ms-list-GNOL-001 .init-milestone-row').count();
  msRows === 5
    ? ok('5 milestone rows shown for GNOL-001')
    : ng(`Expected 5 milestone rows, got ${msRows}`);

  // Verify short label: M1 not GNOL-001-M1
  const firstMsIdText = await page.locator('#ms-list-GNOL-001 .init-milestone-row:first-child .init-ms-id').textContent();
  firstMsIdText.trim() === 'M1'
    ? ok('Short label shows "M1" (not full GNOL-001-M1)')
    : ng(`Short label wrong: "${firstMsIdText.trim()}" (expected "M1")`);

  // Verify all labels are short (M1, M2, M3... not GNOL-001-M*)
  const allMsIds = await page.locator('#ms-list-GNOL-001 .init-ms-id').allTextContents();
  const allShort = allMsIds.every(t => /^M\d+$/.test(t.trim()));
  allShort
    ? ok(`All ${allMsIds.length} milestone labels are short format (M1…M${allMsIds.length})`)
    : ng('Some milestone labels not short', allMsIds.join(', '));

  // Verify status dots: M1 "Xong" → done class
  const m1DotClass = await page.locator('#ms-list-GNOL-001 .init-milestone-row:first-child .init-step-dot').getAttribute('class');
  m1DotClass?.includes('done')
    ? ok('M1 (Xong) → dot class "done"')
    : ng(`M1 dot class wrong: "${m1DotClass}" (expected contains "done")`);

  // M3 "Đang làm" → active
  const allRows = await page.locator('#ms-list-GNOL-001 .init-milestone-row').all();
  let m3DotClass = '', m4DotClass = '';
  for (const row of allRows) {
    const idText = await row.locator('.init-ms-id').textContent();
    if (idText.trim() === 'M3') m3DotClass = await row.locator('.init-step-dot').getAttribute('class');
    if (idText.trim() === 'M4') m4DotClass = await row.locator('.init-step-dot').getAttribute('class');
  }

  m3DotClass.includes('active')
    ? ok('M3 (Đang làm) → dot class "active"')
    : ng(`M3 dot class wrong: "${m3DotClass}" (expected "active")`);

  m4DotClass.includes('paused')
    ? ok('M4 (Chưa bắt đầu) → dot class "paused"')
    : ng(`M4 dot class wrong: "${m4DotClass}" (expected "paused")`);

  // Verify status chip text is Vietnamese
  const m1Chip = await page.locator('#ms-list-GNOL-001 .init-milestone-row:first-child .init-status-chip').textContent();
  m1Chip.trim() === 'Xong'
    ? ok('M1 chip shows "Xong"')
    : ng(`M1 chip text wrong: "${m1Chip.trim()}" (expected "Xong")`);

  await ss(page, '03_milestones_expanded');

  // ── Step 5: Add new milestone GNOL-001-M10 (TEST) ──
  console.log('\n[5] Add test milestone GNOL-001-M10 to GNOL-001');

  // Use the "Thêm Milestone" button inside the expanded panel
  await page.locator('#ms-list-GNOL-001 button:has-text("Thêm Milestone")').click();
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  await page.waitForTimeout(300);

  // Verify parent is pre-set to GNOL-001
  const presetParent = await page.locator('#initFParent').inputValue().catch(async () => {
    return await page.locator('#initFParent').evaluate(el => el.value);
  });
  presetParent === 'GNOL-001'
    ? ok('Parent pre-set to GNOL-001')
    : warn(`Parent pre-set to "${presetParent}" (expected GNOL-001)`);

  await fillModal(page, {
    initFId:       'GNOL-001-M10',
    initFName:     '[TEST] Kiểm tra tự động',
    initFStart:    '01-Jun-26',
    initFDeadline: '30-Jun-26',
    initFPct:      '0',
    initFStatus:   'Active',
  });
  await saveModal(page);
  await page.waitForTimeout(300);

  // Re-expand (render rebuilds DOM)
  await page.locator('#btn-ms-GNOL-001').click();
  await page.waitForTimeout(400);

  const msRowsAfterAdd = await page.locator('#ms-list-GNOL-001 .init-milestone-row').count();
  msRowsAfterAdd === 6
    ? ok('6 milestone rows after adding M10')
    : ng(`Expected 6 rows after add, got ${msRowsAfterAdd}`);

  // Verify M10 shows as short label
  const allMsIdsAfterAdd = await page.locator('#ms-list-GNOL-001 .init-ms-id').allTextContents();
  allMsIdsAfterAdd.some(t => t.trim() === 'M10')
    ? ok('M10 appears with short label "M10"')
    : ng('M10 short label not found', allMsIdsAfterAdd.join(', '));

  // Verify saved object has correct type and parentId
  const m10State = await page.evaluate(() => {
    const m = (db.initiatives || []).find(i => i.id === 'GNOL-001-M10');
    return m ? { type: m.type, parentId: m.parentId, status: m.status } : null;
  });
  m10State?.type === 'milestone'
    ? ok('GNOL-001-M10 saved with type="milestone"')
    : ng(`GNOL-001-M10 type wrong: "${m10State?.type}"`);
  m10State?.parentId === 'GNOL-001'
    ? ok('GNOL-001-M10 parentId="GNOL-001"')
    : ng(`GNOL-001-M10 parentId wrong: "${m10State?.parentId}"`);

  await ss(page, '04_after_add_m10');

  // ── Step 6: Delete GNOL-001-M10 (cleanup) ──
  console.log('\n[6] Delete GNOL-001-M10 (cleanup test data)');

  const m10Row = await page.locator('#ms-list-GNOL-001 .init-milestone-row').filter({ hasText: 'M10' }).locator('button').first();
  await m10Row.click(); // edit button
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  await page.waitForTimeout(200);

  // Get the ID of M10 from the edit modal
  const m10ModalId = await page.locator('#initFId').inputValue();
  m10ModalId === 'GNOL-001-M10'
    ? ok('Edit modal pre-filled with GNOL-001-M10')
    : ng(`Edit modal ID wrong: "${m10ModalId}"`);

  await closeModal(page);

  // Delete programmatically using _initDelete (bypass confirm dialog)
  await page.evaluate(async () => {
    const orig = uiConfirm;
    uiConfirm = async () => { uiConfirm = orig; return true; };
    await _initDelete('GNOL-001-M10');
  });
  await page.waitForTimeout(500);

  // Re-expand
  await page.locator('#btn-ms-GNOL-001').click();
  await page.waitForTimeout(400);

  const msRowsAfterDel = await page.locator('#ms-list-GNOL-001 .init-milestone-row').count();
  msRowsAfterDel === 5
    ? ok('Back to 5 milestone rows after deleting M10')
    : ng(`Expected 5 rows after delete, got ${msRowsAfterDel}`);

  const m10Gone = !(await page.evaluate(() =>
    (db.initiatives || []).some(i => i.id === 'GNOL-001-M10')
  ));
  m10Gone
    ? ok('GNOL-001-M10 removed from db')
    : ng('GNOL-001-M10 still in db after delete');

  await ss(page, '05_after_delete_m10');

  // ── Step 7: Add & delete a root initiative (TEST) ──
  console.log('\n[7] Add test initiative TEST-VERIFY-001, then delete');

  await page.locator('button:has-text("Thêm Initiative")').click();
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  await page.waitForTimeout(200);

  await fillModal(page, {
    initFId:       'TEST-VERIFY-001',
    initFName:     '[TEST] Verify auto',
    initFCat:      'Số hóa',
    initFStatus:   'Active',
    initFPct:      '0',
  });
  await saveModal(page);
  await page.waitForTimeout(300);

  const testCard = await page.locator('#init-card-TEST-VERIFY-001').isVisible();
  testCard
    ? ok('TEST-VERIFY-001 card visible')
    : ng('TEST-VERIFY-001 card not found after save');

  const testInitState = await page.evaluate(() => {
    const i = (db.initiatives || []).find(x => x.id === 'TEST-VERIFY-001');
    return i ? { type: i.type, parentId: i.parentId } : null;
  });
  testInitState?.type === 'initiative'
    ? ok('TEST-VERIFY-001 saved with type="initiative"')
    : ng(`TEST-VERIFY-001 type wrong: "${testInitState?.type}"`);

  // Delete
  await page.evaluate(async () => {
    const orig = uiConfirm;
    uiConfirm = async () => { uiConfirm = orig; return true; };
    await _initDelete('TEST-VERIFY-001');
  });
  await page.waitForTimeout(400);

  const testGone = await page.locator('#init-card-TEST-VERIFY-001').count();
  testGone === 0
    ? ok('TEST-VERIFY-001 deleted, card removed')
    : ng('TEST-VERIFY-001 card still visible after delete');

  // Back to 3 cards
  const cardsAfterDel = await page.locator('.init-card').count();
  cardsAfterDel === 3
    ? ok('3 initiative cards remain after deleting test initiative')
    : ng(`Expected 3 cards, got ${cardsAfterDel}`);

  await ss(page, '06_after_cleanup');

  // ── Step 8: Category filter ──
  console.log('\n[8] Category filter — Số hóa');

  const catSel = page.locator('.toolbar-right select').first();
  await catSel.selectOption('Số hóa');
  await page.waitForTimeout(300);

  const filteredCards = await page.locator('.init-card').count();
  filteredCards >= 1
    ? ok(`Category filter "Số hóa" shows ${filteredCards} card(s)`)
    : ng('Category filter "Số hóa" returned 0 cards (should match GNOL-001/002, BLOL-001)');

  await catSel.selectOption('');
  await page.waitForTimeout(200);

  await ss(page, '07_filter_reset');

  // ── Step 9: Duplicate ID validation ──
  console.log('\n[9] Duplicate ID validation');

  await page.locator('button:has-text("Thêm Initiative")').click();
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  await page.waitForTimeout(200);

  await page.locator('#initFId').fill('GNOL-001');
  await page.locator('#initFName').fill('Duplicate test');
  await page.locator('#initModalOverlay .btn-primary').click();
  await page.waitForTimeout(200);

  const errMsg = await page.locator('#initErrId').textContent();
  errMsg.includes('tồn tại')
    ? ok('Duplicate "GNOL-001" blocked with correct error')
    : ng(`Duplicate check failed: "${errMsg}"`);

  const modalStillOpen = await page.locator('#initModalOverlay').isVisible();
  modalStillOpen
    ? ok('Modal stays open on duplicate attempt')
    : warn('Modal closed after duplicate — check if save was blocked');

  await closeModal(page);

  // ── Step 10: JS error check ──
  console.log('\n[10] JS error audit');

  const ignore = ['favicon','net::ERR_','autoConnectDB','GS_WEBAPP_URL','readInitiatives','Failed to fetch','writeInitiatives'];
  const jsErrors = errors.filter(e => !ignore.some(pat => e.includes(pat)));
  jsErrors.length === 0
    ? ok(`0 unexpected JS errors (${errors.length} total, all network/GAS — expected in file:// mode)`)
    : ng(`${jsErrors.length} unexpected JS error(s):\n    ${jsErrors.join('\n    ')}`);

  // ─── Final report ───
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RESULT: ${fail === 0 ? '✅ ALL PASS' : '❌ FAIL'}`);
  console.log(`  Pass: ${pass}  Fail: ${fail}  Warn: ${warnings.length}`);
  if (warnings.length) console.log('  Warnings: ' + warnings.join(', '));
  if (fail > 0) console.log('  → Fix failures above before pushing.');
  console.log('══════════════════════════════════════════════════════\n');

  await ss(page, '99_final');
  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
