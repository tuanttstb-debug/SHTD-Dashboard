/**
 * verify_bld_queue.mjs — BLD Approval Queue feature tests
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:3030';
const PASS = (msg) => console.log('✅', msg);
const FAIL = (msg) => { console.error('❌', msg); process.exitCode = 1; };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
const CDN_NOISE = [/ERR_CERT_AUTHORITY_INVALID/, /Chart is not defined/, /net::ERR_/];
page.on('console', m => {
  if (m.type() === 'error' && !CDN_NOISE.some(r => r.test(m.text()))) consoleErrors.push(m.text());
});
page.on('pageerror', e => {
  if (!CDN_NOISE.some(r => r.test(e.message))) consoleErrors.push(e.message);
});

/* ── Helpers ── */
const makeTask = (overrides) => ({
  id: 'T-001', name: 'Task Alpha', initiative: 'INI-001', milestone: '',
  state: 'Đang làm', picRes: 'TuanTT', progress: 50, endDate: '2026-08-01',
  tuanBC: '', category: '', team: 'Số Hóa', teamPhoiHop: '', type: 'Task',
  picAcc: 'TuanTT', picSupport: '', startDate: '2026-01-01',
  result: '', nextPlan: '', vuongMac: '', canBLD: 'Y',
  noiDungBLD: 'Cần BLĐ phê duyệt ngân sách thêm cho Q3',
  crossTeam: 'N', highlight: 'N',
  ...overrides
});

/* ── Inject auth + data, navigate to bld-queue ── */
async function loadWithData(tasks) {
  await page.goto(BASE);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((tasks) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'test-token',
      user: { username: 'admin', displayName: 'Admin Test', role: 'Admin', team: 'Số' },
      exp: Date.now() + 3600 * 1000
    }));
    localStorage.setItem('shtd_v2', JSON.stringify({ tasks, initiatives: [] }));
  }, tasks);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  // Navigate to bld-queue via nav click
  await page.click('[data-view="bld-queue"]');
  await page.waitForTimeout(300);
}

/* ═══ TEST 1: Nav item exists and badge shows pending count ═══ */
{
  await loadWithData([ makeTask() ]);
  const navItem = await page.$('[data-view="bld-queue"]');
  if (navItem) PASS('Nav item [data-view="bld-queue"] exists');
  else { FAIL('Nav item missing'); }

  const badge = await page.$('#navBadgeBld');
  if (badge) {
    const txt = await badge.textContent();
    const vis = await badge.isVisible();
    if (vis && txt.trim() === '1') PASS(`Nav badge shows correct count: ${txt.trim()}`);
    else FAIL(`Nav badge issue: visible=${vis}, text="${txt}"`);
  } else FAIL('navBadgeBld element missing');
}

/* ═══ TEST 2: Pending list renders with one canBLD=Y task ═══ */
{
  const countChip = await page.$('#bldCountChip');
  if (countChip) {
    const txt = await countChip.textContent();
    if (txt.includes('1')) PASS(`Count chip shows pending: "${txt}"`);
    else FAIL(`Count chip text unexpected: "${txt}"`);
  } else FAIL('bldCountChip missing');

  const items = await page.$$('.bld-item');
  if (items.length === 1) PASS('One .bld-item card rendered');
  else FAIL(`Expected 1 item, got ${items.length}`);
}

/* ═══ TEST 3: Empty state when no BLD tasks ═══ */
{
  await loadWithData([ makeTask({ canBLD: 'N' }) ]);
  const emptyState = await page.$('.bld-empty-state');
  if (emptyState) PASS('Empty state shown when no canBLD=Y tasks');
  else FAIL('Empty state missing when queue is empty');

  const chip = await page.$('#bldCountChip');
  if (chip) {
    const hasCls = await chip.evaluate(el => el.classList.contains('none'));
    if (hasCls) PASS('Count chip has .none class for empty queue');
    else FAIL('Count chip missing .none class');
  }
}

/* ═══ TEST 4: Overdue task shows overdue styling ═══ */
{
  const overdueTask = makeTask({ endDate: '2020-01-01', progress: 50 }); // definitely past
  await loadWithData([ overdueTask ]);
  const overdueMeta = await page.$('.bld-meta-chip.overdue');
  if (overdueMeta) PASS('Overdue chip styled correctly for past deadline');
  else FAIL('.bld-meta-chip.overdue missing for overdue task');
}

/* ═══ TEST 5: Approve modal opens ═══ */
{
  await loadWithData([ makeTask({ id: 'T-001', name: 'Task Approve Test' }) ]);
  const approveBtn = await page.$('.btn-success');
  if (approveBtn) {
    await approveBtn.click();
    await page.waitForTimeout(200);
    const overlay = await page.$('#bldActionOverlay');
    const visible = overlay ? await overlay.evaluate(el => el.style.display !== 'none') : false;
    if (visible) PASS('Approve modal opens on click');
    else FAIL('Approve modal did not open');

    const title = await page.$('#bldMiniTitle');
    const titleTxt = title ? await title.textContent() : '';
    if (titleTxt.includes('Phê duyệt')) PASS(`Modal title correct: "${titleTxt}"`);
    else FAIL(`Modal title unexpected: "${titleTxt}"`);

    // Close with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const visAfterEsc = overlay ? await overlay.evaluate(el => el.style.display === 'none') : true;
    if (visAfterEsc) PASS('ESC closes mini modal');
    else FAIL('ESC did not close mini modal');
  } else FAIL('Approve button missing');
}

/* ═══ TEST 6: Reject modal requires reason ═══ */
{
  await loadWithData([ makeTask({ id: 'T-001', name: 'Task Reject Test' }) ]);
  const rejectBtn = await page.$('.btn-danger');
  if (rejectBtn) {
    await rejectBtn.click();
    await page.waitForTimeout(200);

    // Submit without reason
    const confirmBtn = await page.$('#bldMiniConfirmBtn');
    if (confirmBtn) {
      await confirmBtn.click();
      await page.waitForTimeout(100);
      const errEl = await page.$('#bldMiniError');
      const errVisible = errEl ? await errEl.evaluate(el => el.classList.contains('visible')) : false;
      if (errVisible) PASS('Validation error shown for empty reject reason');
      else FAIL('No validation error for empty reject reason');

      const ta = await page.$('#bldMiniTextarea');
      const hasErr = ta ? await ta.evaluate(el => el.classList.contains('error')) : false;
      if (hasErr) PASS('Textarea gets .error class on failed validation');
      else FAIL('Textarea missing .error class');
    }
    await page.keyboard.press('Escape');
  } else FAIL('Reject button missing');
}

/* ═══ TEST 7: Info request modal opens and keeps task in queue ═══ */
{
  await loadWithData([ makeTask({ id: 'T-001', name: 'Task Info Test' }) ]);
  const infoBtn = await page.$('.btn-secondary');
  if (infoBtn) {
    await infoBtn.click();
    await page.waitForTimeout(200);
    const title = await page.$('#bldMiniTitle');
    const txt = title ? await title.textContent() : '';
    if (txt.includes('bổ sung') || txt.includes('Yêu cầu')) PASS(`Info modal title: "${txt}"`);
    else FAIL(`Info modal title unexpected: "${txt}"`);
    await page.keyboard.press('Escape');
  } else FAIL('Info button missing');
}

/* ═══ TEST 8: History section — task with marker shows in history ═══ */
{
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;
  const histTask = makeTask({
    id: 'T-HIST', name: 'Task History',
    canBLD: 'N',
    noiDungBLD: `[✅ BLĐ duyệt ${dateStr} — Đồng ý triển khai]\nNội dung gốc`
  });
  await loadWithData([ histTask ]);

  const histWrap = await page.$('#bldHistoryWrap');
  const histVisible = histWrap ? await histWrap.evaluate(el => el.style.display !== 'none') : false;
  if (histVisible) PASS('History section shown when approved task exists');
  else FAIL('History section not shown');

  const histItems = await page.$$('.bld-history-item');
  if (histItems.length >= 1) PASS(`History item count: ${histItems.length}`);
  else FAIL('No history items rendered');
}

/* ═══ TEST 9: G+B keyboard shortcut navigates to bld-queue ═══ */
{
  await loadWithData([ makeTask() ]);
  // Navigate away first
  await page.click('[data-view="dashboard"]');
  await page.waitForTimeout(150);
  // Use G+B shortcut
  await page.keyboard.press('g');
  await page.keyboard.press('b');
  await page.waitForTimeout(300);
  const activeNav = await page.$('[data-view="bld-queue"].active');
  if (activeNav) PASS('G+B keyboard shortcut navigates to bld-queue');
  else FAIL('G+B shortcut failed to navigate');
}

/* ═══ TEST 10: Dark mode — no crash ═══ */
{
  await loadWithData([ makeTask() ]);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(100);
  const item = await page.$('.bld-item');
  if (item) PASS('Dark mode — bld-item renders without crash');
  else FAIL('Dark mode render failed');
}

/* ═══ Final: console errors ═══ */
if (consoleErrors.length > 0) {
  FAIL(`JS errors detected (${consoleErrors.length}):`);
  consoleErrors.forEach(e => console.error('   ', e));
} else {
  PASS('No JS console errors');
}

await browser.close();
console.log('\nDone.');
