/**
 * verify_sync_fix.mjs
 * Verify rằng sau khi fix: lưu/xóa task, bulk ops, BLĐ feedback task,
 * và lưu initiative đều thực sự gọi GAS API (không còn chỉ lưu localStorage).
 *
 * Mỗi test đếm số GAS calls thực tế và kiểm tra action payload.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR   = 'D:/Công việc/Vibecode/SHTD-Dashboard';
const PORT      = 9997;
const BASE      = `http://localhost:${PORT}`;

/* ── HTTP server phục vụ static files ── */
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(APP_DIR, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

/* ── Test helpers ── */
let results = { pass: 0, fail: 0 };
const PASS = msg => { console.log(`  ✅ ${msg}`); results.pass++; };
const FAIL = msg => { console.error(`  ❌ ${msg}`); results.fail++; process.exitCode = 1; };
const INFO = msg => console.log(`     ${msg}`);

/* ── Mock data ── */
const MOCK_USERS = {
  header: ['Username', 'Display_Name', 'Role', 'Team', 'Email', 'Active'],
  rows: [
    ['TuanTT4', 'Tuan TT', 'Admin', 'Số', 't@b.vn', 'TRUE'],
    ['DungLQ1', 'Dung LQ', 'User',  'Số', 'd@b.vn', 'TRUE'],
  ],
};

const MOCK_TASK_ROWS = [
  ['ID','Tuần BC','Initiative ID','Category','Team chính','Team phối hợp','Loại','Task / Deliverable','PIC Accountable','PIC Responsible','PIC Support','Start Date','Deadline','% HT','Trạng thái','Milestone','Kết quả tuần qua','Kế hoạch tuần tới','Vướng mắc','Cần BLĐ','Nội dung BLĐ','Cross-team','Highlight','Ý kiến BLĐ'],
  ['T-001','','INI-001','AI/Năng suất','Số','','Task','Task Alpha','TuanTT4','TuanTT4','','2026-01-01','2026-12-31','50%','Đang thực hiện','','','','','Y','Cần phê duyệt','N','N',''],
  ['T-002','','INI-001','AI/Năng suất','Số','','Task','Task Beta','TuanTT4','TuanTT4','','2026-01-01','2026-12-31','30%','Đang thực hiện','','','','','N','','N','N',''],
  ['T-003','','INI-001','AI/Năng suất','Số','','Task','Task Gamma','TuanTT4','TuanTT4','','2026-01-01','2026-12-31','20%','Chưa bắt đầu','','','','','N','','N','N',''],
];

const MOCK_INITS_ROWS = [
  ['ID','Name','Status','Category','Accountable','Start_Date','Deadline','Pct','Type','Parent_ID','KPI_Target','Notes','Doc_Link','Milestone_Tracking','Milestone_Deadline'],
  ['INI-001','Initiative Alpha','Active','AI/Năng suất','TuanTT4','2026-01-01','2026-12-31','50','initiative','','KPI test','','','',''],
];

const MOCK_CASES_ROWS = [
  ['ID','Tuần BC','Team','PIC','ĐVKD','Khách hàng / Case','Loại hình','Mức độ phức tạp','Phương án','Giá trị (tỷ đồng)','Stage','Vướng mắc chính','Next step','Start Date','Deadline','RAG','Cần BLĐ?','Highlight dashboard?','Ghi chú','Ý kiến BLĐ'],
];

/* ── Playwright setup ── */
const browser = await chromium.launch({ headless: true });

/**
 * Tạo context mới với GAS interceptor.
 * Trả về { context, gasLog } — gasLog là mảng các { action, body } nhận được.
 */
async function makeContext() {
  const ctx    = await browser.newContext();
  const gasLog = [];

  await ctx.route('https://script.google.com/**', async (route) => {
    const rawBody = route.request().postData() || '{}';
    let payload = {};
    try { payload = JSON.parse(rawBody); } catch (e) {}
    const action = payload.action || 'unknown';
    gasLog.push({ action, body: payload });

    let resp = { status: 'ok' };
    if (action === 'user-list')               resp = { status: 'ok', data: MOCK_USERS };
    else if (action === 'read')               resp = { status: 'ok', values: MOCK_TASK_ROWS, serverTs: Date.now() };
    else if (action === 'write')              resp = { status: 'ok' };
    else if (action === 'case-pipeline-read') resp = { status: 'ok', values: MOCK_CASES_ROWS };
    else if (action === 'case-pipeline-write')resp = { status: 'ok' };
    else if (action === 'initiative-read')    resp = { status: 'ok', values: MOCK_INITS_ROWS };
    else if (action === 'initiative-write')   resp = { status: 'ok' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resp) });
  });

  return { ctx, gasLog };
}

/**
 * Load trang, inject auth + data, đợi app sẵn sàng.
 * Trả về page đã login.
 */
async function loadPage(ctx, extraLocalStorage = {}) {
  const page = await ctx.newPage();
  const jsErrors = [];
  const CDN_NOISE = [/ERR_CERT_AUTHORITY_INVALID/, /Chart is not defined/, /net::ERR_/, /ERR_ABORTED/];
  page.on('console', m => {
    if (m.type() === 'error' && !CDN_NOISE.some(r => r.test(m.text()))) jsErrors.push(m.text());
  });
  page.on('pageerror', e => {
    if (!CDN_NOISE.some(r => r.test(e.message))) jsErrors.push(e.message);
  });

  await page.goto(BASE);
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(({ extra }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'local-test-token',
      user: { username: 'TuanTT4', displayName: 'TuanTT4', role: 'Admin', team: 'Số' },
      exp: Date.now() + 3600000,
    }));
    localStorage.setItem('shtd_v2', JSON.stringify({
      tasks: [
        { id:'T-001', name:'Task Alpha', initiative:'INI-001', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI/Năng suất', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress:50, state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'Y', noiDungBLD:'Cần BLĐ phê duyệt', yKienBLD:'', tuanBC:'' },
        { id:'T-002', name:'Task Beta',  initiative:'INI-001', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI/Năng suất', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress:30, state:'Đang thực hiện', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'',   yKienBLD:'', tuanBC:'' },
        { id:'T-003', name:'Task Gamma', initiative:'INI-001', milestone:'', team:'Số', teamPhoiHop:'', type:'Task', category:'AI/Năng suất', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'', startDate:'2026-01-01', endDate:'2026-12-31', progress:20, state:'Chưa bắt đầu', status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'',   yKienBLD:'', tuanBC:'' },
      ],
      initiatives: [
        { id:'INI-001', name:'Initiative Alpha', parentId:null, type:'initiative', category:'AI/Năng suất', accountable:'TuanTT4', startDate:'2026-01-01', deadline:'2026-12-31', pct:50, status:'Active', milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
      ],
      kpi: [], _serverTs: null,
    }));
    Object.entries(extra || {}).forEach(([k, v]) => localStorage.setItem(k, v));
  }, { extra: extraLocalStorage });

  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  // Đợi loadingOverlay biến mất
  await page.waitForFunction(
    () => { const el = document.getElementById('loadingOverlay'); return !el || !el.classList.contains('visible'); },
    { timeout: 10000 }
  );

  page._jsErrors = jsErrors;
  return page;
}

/** Auto-click confirm modal khi xuất hiện */
async function autoConfirm(page) {
  return page.waitForSelector('#confirmOverlay.open', { timeout: 5000 })
    .then(() => page.click('#confirmOkBtn'))
    .catch(() => {});
}

/* ═══════════════════════════════════════════════════════════════
   TEST 1: Lưu Task — handleSubmit phải gọi GAS read + write
═══════════════════════════════════════════════════════════════ */
console.log('\n[T1] Lưu Task (handleSubmit)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  // Mở modal edit T-001
  await page.evaluate(() => openTaskModal(db.tasks.find(t => t.id === 'T-001')));
  await page.waitForSelector('#taskOverlay.open', { timeout: 3000 });

  // Thay đổi tên task
  await page.fill('#fName', 'Task Alpha EDITED');

  // Submit form → modal xác nhận → auto click OK
  const confirmPromise = autoConfirm(page);
  await page.click('#btnSave');
  await confirmPromise;

  // Đợi GAS calls xong
  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(500);

  const readCalls  = gasLog.filter(c => c.action === 'read').length;
  const writeCalls = gasLog.filter(c => c.action === 'write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (readCalls >= 1)  PASS('T1a: GAS read được gọi (đọc dữ liệu server trước khi merge)');
  else                 FAIL('T1a: GAS read KHÔNG được gọi');
  if (writeCalls >= 1) PASS('T1b: GAS write được gọi (dữ liệu được ghi lên Sheet)');
  else                 FAIL('T1b: GAS write KHÔNG được gọi');

  // Kiểm tra dữ liệu merged có task đã edit
  const taskInDb = await page.evaluate(() => db.tasks.find(t => t.id === 'T-001'));
  if (taskInDb?.name === 'Task Alpha EDITED') PASS('T1c: Task được cập nhật trong db.tasks sau sync');
  else FAIL(`T1c: Task không được cập nhật — name="${taskInDb?.name}"`);

  // JS errors?
  if (page._jsErrors.length === 0) PASS('T1d: Không có JS errors');
  else FAIL(`T1d: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ═══════════════════════════════════════════════════════════════
   TEST 2: Xóa Task — deleteTask phải gọi GAS
═══════════════════════════════════════════════════════════════ */
console.log('\n[T2] Xóa Task (deleteTask)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  // Mở modal edit T-002
  await page.evaluate(() => openTaskModal(db.tasks.find(t => t.id === 'T-002')));
  await page.waitForSelector('#taskOverlay.open', { timeout: 3000 });

  // Click nút xóa → confirm
  const confirmPromise = autoConfirm(page);
  await page.click('#btnDelete');
  await confirmPromise;

  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(500);

  const writeCalls = gasLog.filter(c => c.action === 'write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (writeCalls >= 1) PASS('T2a: GAS write được gọi khi xóa task');
  else                 FAIL('T2a: GAS write KHÔNG được gọi khi xóa task');

  const taskGone = await page.evaluate(() => !db.tasks.find(t => t.id === 'T-002'));
  if (taskGone) PASS('T2b: Task đã bị xóa khỏi db.tasks');
  else          FAIL('T2b: Task vẫn còn trong db.tasks sau xóa');

  if (page._jsErrors.length === 0) PASS('T2c: Không có JS errors');
  else FAIL(`T2c: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ═══════════════════════════════════════════════════════════════
   TEST 3: Bulk RAG update — bulkSetRag phải gọi GAS
═══════════════════════════════════════════════════════════════ */
console.log('\n[T3] Bulk RAG update (bulkSetRag)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  // Select T-002, T-003 rồi gọi bulkSetRag
  await page.evaluate(() => {
    selectedIds.add('T-002');
    selectedIds.add('T-003');
  });

  const confirmPromise = autoConfirm(page);
  await page.evaluate(() => bulkSetRag('Đỏ'));
  await confirmPromise;

  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(500);

  const writeCalls = gasLog.filter(c => c.action === 'write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (writeCalls >= 1) PASS('T3a: GAS write được gọi khi bulk update RAG');
  else                 FAIL('T3a: GAS write KHÔNG được gọi khi bulk update RAG');

  const t2rag = await page.evaluate(() => db.tasks.find(t=>t.id==='T-002')?.status);
  if (t2rag === 'Đỏ') PASS('T3b: T-002 RAG = Đỏ sau sync');
  else                FAIL(`T3b: T-002 RAG = "${t2rag}" (mong đợi Đỏ)`);

  if (page._jsErrors.length === 0) PASS('T3c: Không có JS errors');
  else FAIL(`T3c: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ═══════════════════════════════════════════════════════════════
   TEST 4: Bulk State update — bulkSetState phải gọi GAS
═══════════════════════════════════════════════════════════════ */
console.log('\n[T4] Bulk State update (bulkSetState)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  await page.evaluate(() => { selectedIds.add('T-002'); selectedIds.add('T-003'); });

  const confirmPromise = autoConfirm(page);
  await page.evaluate(() => bulkSetState('Hoàn thành'));
  await confirmPromise;

  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(500);

  const writeCalls = gasLog.filter(c => c.action === 'write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (writeCalls >= 1) PASS('T4a: GAS write được gọi khi bulk update trạng thái');
  else                 FAIL('T4a: GAS write KHÔNG được gọi khi bulk update trạng thái');

  const t3state = await page.evaluate(() => db.tasks.find(t=>t.id==='T-003')?.state);
  if (t3state === 'Hoàn thành') PASS('T4b: T-003 state = Hoàn thành sau sync');
  else                          FAIL(`T4b: T-003 state = "${t3state}"`);

  if (page._jsErrors.length === 0) PASS('T4c: Không có JS errors');
  else FAIL(`T4c: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ═══════════════════════════════════════════════════════════════
   TEST 5: Bulk Delete — bulkDelete phải gọi GAS
═══════════════════════════════════════════════════════════════ */
console.log('\n[T5] Bulk Delete (bulkDelete)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  await page.evaluate(() => { selectedIds.add('T-003'); });

  const confirmPromise = autoConfirm(page);
  await page.evaluate(() => bulkDelete());
  await confirmPromise;

  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(500);

  const writeCalls = gasLog.filter(c => c.action === 'write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (writeCalls >= 1) PASS('T5a: GAS write được gọi khi bulk delete');
  else                 FAIL('T5a: GAS write KHÔNG được gọi khi bulk delete');

  const taskGone = await page.evaluate(() => !db.tasks.find(t => t.id === 'T-003'));
  if (taskGone) PASS('T5b: Task đã bị xóa khỏi db.tasks sau bulk delete');
  else          FAIL('T5b: Task vẫn còn trong db.tasks');

  if (page._jsErrors.length === 0) PASS('T5c: Không có JS errors');
  else FAIL(`T5c: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ═══════════════════════════════════════════════════════════════
   TEST 6: BLĐ feedback cho task — bldSubmitAction phải gọi GAS
═══════════════════════════════════════════════════════════════ */
console.log('\n[T6] BLĐ feedback task (bldSubmitAction)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  // Navigate sang bld-queue
  await page.evaluate(() => navigateTo('bld-queue'));
  await page.waitForTimeout(800);

  // Kích hoạt bldOpenMiniModal cho T-001 (approve)
  await page.evaluate(() => {
    if (typeof bldOpenMiniModal === 'function') {
      bldOpenMiniModal('approve', 'T-001', 'task');
    }
  });
  await page.waitForTimeout(300);

  // Click confirm trong mini modal
  const miniConfirmBtn = page.locator('#bldMiniConfirmBtn');
  const miniVisible = await miniConfirmBtn.isVisible().catch(() => false);
  if (miniVisible) {
    await miniConfirmBtn.click();
  } else {
    // Fallback: gọi trực tiếp
    await page.evaluate(() => {
      _bldCurrentAction = { type: 'approve', taskId: 'T-001', source: 'task' };
      bldSubmitAction();
    });
  }

  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(800);

  const writeCalls = gasLog.filter(c => c.action === 'write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (writeCalls >= 1) PASS('T6a: GAS write được gọi khi BLĐ phản hồi task');
  else                 FAIL('T6a: GAS write KHÔNG được gọi khi BLĐ phản hồi task');

  const t1 = await page.evaluate(() => db.tasks.find(t=>t.id==='T-001'));
  const hasMarker = (t1?.yKienBLD || '').includes('BLĐ duyệt');
  if (hasMarker) PASS('T6b: yKienBLD của task có marker phê duyệt');
  else           FAIL(`T6b: yKienBLD = "${t1?.yKienBLD}" — thiếu marker`);

  if (page._jsErrors.length === 0) PASS('T6c: Không có JS errors');
  else FAIL(`T6c: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ═══════════════════════════════════════════════════════════════
   TEST 7: Lưu Initiative mới — _initSave phải gọi GAS initiative-write
═══════════════════════════════════════════════════════════════ */
console.log('\n[T7] Lưu Initiative mới (_initSave)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  // Navigate sang initiative-tracker
  await page.evaluate(() => navigateTo('initiative-tracker'));
  await page.waitForTimeout(800);

  // Mở modal thêm initiative mới
  await page.evaluate(() => _initOpenModal(null));
  // overlay dùng style.display='flex', không dùng .open class
  await page.waitForFunction(
    () => { const el = document.getElementById('initModalOverlay'); return el && el.style.display !== 'none' && el.style.display !== ''; },
    { timeout: 5000 }
  );
  await page.waitForTimeout(300);

  // Fill form
  await page.fill('#initFId',   'INI-NEW');
  await page.fill('#initFName', 'Initiative Mới Test');

  // Click nút Lưu (gọi _initSave)
  await page.click('#initModalOverlay button:has-text("Lưu")');

  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(1000);

  const iniWriteCalls = gasLog.filter(c => c.action === 'initiative-write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (iniWriteCalls >= 1) PASS('T7a: GAS initiative-write được gọi khi lưu initiative mới');
  else                    FAIL('T7a: GAS initiative-write KHÔNG được gọi khi lưu initiative mới');

  if (page._jsErrors.length === 0) PASS('T7b: Không có JS errors');
  else FAIL(`T7b: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ═══════════════════════════════════════════════════════════════
   TEST 8: Thêm Task mới — handleSubmit ADD mode phải gọi GAS
═══════════════════════════════════════════════════════════════ */
console.log('\n[T8] Thêm Task mới (handleSubmit ADD)');
{
  const { ctx, gasLog } = await makeContext();
  const page = await loadPage(ctx);

  // Mở modal thêm task mới
  await page.evaluate(() => openTaskModal(null));
  await page.waitForSelector('#taskOverlay.open', { timeout: 3000 });
  await page.waitForTimeout(600); // đợi user-list & selects populate

  // Điền đầy đủ các trường required + force-set dropdowns
  await page.evaluate(() => {
    document.getElementById('fName').value = 'Task Mới Test Playwright';
    document.getElementById('fEnd').value  = '2026-12-31';
    // fInit
    const fi = document.getElementById('fInit');
    if (fi && fi.options.length > 0 && !fi.value) fi.selectedIndex = 0;
    // fCat (required)
    const fc = document.getElementById('fCat');
    if (fc && fc.options.length > 0 && !fc.value) fc.selectedIndex = Math.max(0, Array.from(fc.options).findIndex(o => o.value));
    // fPicAcc, fPicRes
    ['fPicAcc','fPicRes'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value && el.options.length > 0)
        el.value = el.options[el.options.length - 1].value; // last = most likely a real user
    });
  });

  // Gọi handleSubmit trực tiếp để bypass HTML5 validation
  const confirmPromise = autoConfirm(page);
  await page.evaluate(() => handleSubmit(new Event('submit', { cancelable: true })));
  await confirmPromise;

  await page.waitForFunction(
    () => !document.getElementById('loadingOverlay')?.classList.contains('visible'),
    { timeout: 8000 }
  );
  await page.waitForTimeout(500);

  const writeCalls = gasLog.filter(c => c.action === 'write').length;
  INFO(`GAS calls: ${gasLog.map(c=>c.action).join(', ')}`);

  if (writeCalls >= 1) PASS('T8a: GAS write được gọi khi thêm task mới');
  else                 FAIL('T8a: GAS write KHÔNG được gọi khi thêm task mới');

  const newTask = await page.evaluate(() => db.tasks.find(t => t.name === 'Task Mới Test Playwright'));
  if (newTask) PASS(`T8b: Task mới có trong db.tasks (id: ${newTask.id})`);
  else         FAIL('T8b: Task mới KHÔNG có trong db.tasks');

  if (page._jsErrors.length === 0) PASS('T8c: Không có JS errors');
  else FAIL(`T8c: JS errors: ${page._jsErrors.join('; ')}`);

  await ctx.close();
}

/* ── Tổng kết ── */
await browser.close();
server.close();

console.log(`\n${'─'.repeat(50)}`);
console.log(`Kết quả: ${results.pass} PASS  |  ${results.fail} FAIL`);
if (results.fail === 0) console.log('✅ Tất cả tests PASS — GAS sync hoạt động đúng sau fix.');
else                    console.error(`❌ ${results.fail} test(s) FAILED.`);
