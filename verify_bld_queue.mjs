/**
 * verify_bld_queue.mjs — BLD Approval Queue feature tests
 */
import { chromium } from './node_modules/playwright/index.mjs';

const BASE = 'http://localhost:3030';
const PASS = (msg) => console.log('✅', msg);
const FAIL = (msg) => { console.error('❌', msg); process.exitCode = 1; };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

// Chặn TẤT CẢ GAS requests — tránh: (1) loadingOverlay treo, (2) AUTH_REQUIRED → doLogout()
await context.route('**/script.google.com/**', route => route.abort());

const page = await context.newPage();

const consoleErrors = [];
// Bỏ qua CDN lỗi mạng + GAS abort (net::ERR_ABORTED là do route abort ở trên)
const CDN_NOISE = [/ERR_CERT_AUTHORITY_INVALID/, /Chart is not defined/, /net::ERR_/, /ERR_ABORTED/];
page.on('console', m => {
  if (m.type() === 'error' && !CDN_NOISE.some(r => r.test(m.text()))) consoleErrors.push(m.text());
});
page.on('pageerror', e => {
  if (!CDN_NOISE.some(r => r.test(e.message))) consoleErrors.push(e.message);
});

/* ── Helpers ── */
const makeTask = (overrides) => ({
  id: 'T-001', name: 'Task Alpha', initiative: 'INI-001', milestone: '',
  state: 'Đang làm', picRes: 'TuanTT4', progress: 50, endDate: '2026-08-01',
  tuanBC: '', category: '', team: 'Số', teamPhoiHop: '', type: 'Task',
  picAcc: 'TuanTT4', picSupport: '', startDate: '2026-01-01',
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
    // Dùng account TuanTT4 / Admin — đã được PO approve cho local test
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'local-test-token',
      user: { username: 'TuanTT4', displayName: 'TuanTT4', role: 'Admin', team: 'Số' },
      exp: Date.now() + 3600 * 1000
    }));
    localStorage.setItem('shtd_v2', JSON.stringify({ tasks, initiatives: [] }));
  }, tasks);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  // Chờ loadingOverlay biến mất (autoConnectDB fail nhanh do route abort)
  await page.waitForFunction(
    () => { const el = document.getElementById('loadingOverlay'); return !el || !el.classList.contains('visible'); },
    { timeout: 8000 }
  );
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

/* ══════════════════════════════════════════════════════
   SUBMIT FLOW TESTS (test trực tiếp 3 bug đã fix S17)
   - BUG1: draft param → db.tasks (TypeError fix)
   - BUG2: syncAction return value check
   - BUG3: local fallback khi GAS offline
   ══════════════════════════════════════════════════════ */

/* ═══ TEST 11: Approve — task biến khỏi pending, xuất hiện trong history ═══ */
{
  await loadWithData([ makeTask({ id: 'T-APPROVE', name: 'Task cần phê duyệt' }) ]);

  // Mở modal approve
  const approveBtn = await page.$('.btn-success');
  if (!approveBtn) { FAIL('TEST11: Approve button missing'); }
  else {
    await approveBtn.click();
    await page.waitForTimeout(200);

    // Điền ghi chú (tùy chọn) và submit
    await page.fill('#bldMiniTextarea', 'Đồng ý triển khai Q3');
    await page.click('#bldMiniConfirmBtn');

    // Chờ toast và re-render (local save, không cần GAS)
    await page.waitForTimeout(800);

    // Kiểm tra modal đã đóng
    const overlayHidden = await page.$eval('#bldActionOverlay', el => el.style.display === 'none');
    if (overlayHidden) PASS('TEST11: Approve modal đóng sau khi submit');
    else FAIL('TEST11: Approve modal vẫn mở sau submit');

    // Kiểm tra task KHÔNG còn trong pending list
    const pendingItems = await page.$$('.bld-item');
    if (pendingItems.length === 0) PASS('TEST11: Task biến mất khỏi pending sau approve');
    else FAIL(`TEST11: Pending list vẫn còn ${pendingItems.length} item sau approve`);

    // Kiểm tra count chip cập nhật
    const chip = await page.$('#bldCountChip');
    const chipNone = chip ? await chip.evaluate(el => el.classList.contains('none')) : false;
    if (chipNone) PASS('TEST11: Count chip chuyển sang trạng thái empty');
    else FAIL('TEST11: Count chip không cập nhật');

    // Kiểm tra history section xuất hiện với marker ✅
    const histVisible = await page.$eval('#bldHistoryWrap', el => el.style.display !== 'none');
    if (histVisible) PASS('TEST11: History section hiện sau approve');
    else FAIL('TEST11: History section không xuất hiện');

    const histItems = await page.$$('.bld-history-item');
    if (histItems.length >= 1) PASS(`TEST11: History có ${histItems.length} mục`);
    else FAIL('TEST11: History không có mục nào');

    // Kiểm tra nav badge giảm về 0
    const badge = await page.$('#navBadgeBld');
    const badgeHidden = badge ? !(await badge.isVisible()) : true;
    if (badgeHidden) PASS('TEST11: Nav badge ẩn sau khi queue rỗng');
    else FAIL('TEST11: Nav badge vẫn hiển thị dù queue rỗng');
  }
}

/* ═══ TEST 12: Reject — yêu cầu lý do, task biến khỏi pending ═══ */
{
  await loadWithData([ makeTask({ id: 'T-REJECT', name: 'Task cần từ chối' }) ]);

  const rejectBtn = await page.$('.btn-danger');
  if (!rejectBtn) { FAIL('TEST12: Reject button missing'); }
  else {
    await rejectBtn.click();
    await page.waitForTimeout(200);

    // Submit không điền lý do → phải báo lỗi (validation)
    await page.click('#bldMiniConfirmBtn');
    await page.waitForTimeout(100);
    const errVisible = await page.$eval('#bldMiniError', el => el.classList.contains('visible'));
    if (errVisible) PASS('TEST12: Validation chặn reject không có lý do');
    else FAIL('TEST12: Validation không hoạt động cho reject');

    // Điền lý do và submit lại
    await page.fill('#bldMiniTextarea', 'Chưa đủ tài liệu minh chứng');
    await page.click('#bldMiniConfirmBtn');
    await page.waitForTimeout(800);

    // Task biến khỏi pending
    const pendingItems = await page.$$('.bld-item');
    if (pendingItems.length === 0) PASS('TEST12: Task biến mất khỏi pending sau reject');
    else FAIL(`TEST12: Pending vẫn còn ${pendingItems.length} item sau reject`);

    // History hiện marker ❌
    const histVisible = await page.$eval('#bldHistoryWrap', el => el.style.display !== 'none');
    if (histVisible) PASS('TEST12: History section hiện sau reject');
    else FAIL('TEST12: History section không xuất hiện sau reject');
  }
}

/* ═══ TEST 13: Info request — task VẪN ở pending (canBLD=Y giữ nguyên) ═══ */
{
  await loadWithData([ makeTask({ id: 'T-INFO', name: 'Task yêu cầu bổ sung' }) ]);

  const infoBtn = await page.$('.btn-secondary');
  if (!infoBtn) { FAIL('TEST13: Info button missing'); }
  else {
    await infoBtn.click();
    await page.waitForTimeout(200);

    // Điền nội dung yêu cầu và submit
    await page.fill('#bldMiniTextarea', 'Cần bổ sung báo cáo tài chính Q2');
    await page.click('#bldMiniConfirmBtn');
    await page.waitForTimeout(800);

    // Task VẪN còn trong pending (canBLD='Y' không đổi)
    const pendingItems = await page.$$('.bld-item');
    if (pendingItems.length === 1) PASS('TEST13: Task VẪN ở pending sau info request (canBLD=Y)');
    else FAIL(`TEST13: Pending có ${pendingItems.length} items, cần đúng 1`);

    // Nav badge vẫn hiển thị
    const badge = await page.$('#navBadgeBld');
    const badgeVisible = badge ? await badge.isVisible() : false;
    if (badgeVisible) PASS('TEST13: Nav badge vẫn hiển thị (task chưa xử lý xong)');
    else FAIL('TEST13: Nav badge bị ẩn dù task vẫn cần xử lý');

    // History KHÔNG xuất hiện (task chưa có quyết định)
    const histVisible = await page.$eval('#bldHistoryWrap', el => el.style.display !== 'none');
    if (!histVisible) PASS('TEST13: History ẩn sau info request (chưa quyết định)');
    else FAIL('TEST13: History sai — không nên hiện khi task vẫn ở pending');
  }
}

/* ═══ TEST 14: Approve không cần ghi chú (note là optional) ═══ */
{
  await loadWithData([ makeTask({ id: 'T-APPROVE-NONOTE', name: 'Task approve không ghi chú' }) ]);

  const approveBtn = await page.$('.btn-success');
  if (approveBtn) {
    await approveBtn.click();
    await page.waitForTimeout(200);

    // KHÔNG điền ghi chú, submit thẳng
    await page.click('#bldMiniConfirmBtn');
    await page.waitForTimeout(800);

    const pendingItems = await page.$$('.bld-item');
    if (pendingItems.length === 0) PASS('TEST14: Approve không cần ghi chú — hoạt động đúng');
    else FAIL('TEST14: Approve bị chặn dù ghi chú là tùy chọn');
  } else FAIL('TEST14: Approve button missing');
}

/* ═══ TEST 15: Approve nhiều tasks — badge đếm đúng từng bước ═══ */
{
  const tasks = [
    makeTask({ id: 'T-M1', name: 'Task Multi 1' }),
    makeTask({ id: 'T-M2', name: 'Task Multi 2' }),
    makeTask({ id: 'T-M3', name: 'Task Multi 3' }),
  ];
  await loadWithData(tasks);

  // Badge phải hiện 3
  const badge = await page.$('#navBadgeBld');
  const badgeTxt = badge ? (await badge.textContent()).trim() : '';
  if (badgeTxt === '3') PASS('TEST15: Badge hiện đúng 3 khi có 3 tasks');
  else FAIL(`TEST15: Badge sai — expected 3, got "${badgeTxt}"`);

  // Approve task đầu tiên
  const firstApproveBtn = await page.$('.bld-item:first-child .btn-success');
  if (firstApproveBtn) {
    await firstApproveBtn.click();
    await page.waitForTimeout(200);
    await page.click('#bldMiniConfirmBtn');
    await page.waitForTimeout(800);

    const remainingItems = await page.$$('.bld-item');
    if (remainingItems.length === 2) PASS('TEST15: Sau approve 1 còn đúng 2 items');
    else FAIL(`TEST15: Expected 2 items, got ${remainingItems.length}`);

    const badgeTxtAfter = badge ? (await badge.textContent()).trim() : '';
    if (badgeTxtAfter === '2') PASS('TEST15: Badge cập nhật đúng còn 2');
    else FAIL(`TEST15: Badge sau approve sai — expected 2, got "${badgeTxtAfter}"`);
  } else FAIL('TEST15: Không tìm thấy approve button của item đầu tiên');
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
