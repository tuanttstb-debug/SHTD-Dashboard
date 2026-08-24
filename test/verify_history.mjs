/**
 * verify_history.mjs — S33 History tab feature tests
 *
 * Kiểm tra:
 *   H1:  Tab bar HTML tồn tại trong 3 view popups (task/init/case)
 *   H2:  Task popup mở → tab "Chi tiết" active, body visible, history hidden
 *   H3:  Click "Lịch sử" tab → history pane visible, body hidden
 *   H4:  Click "Chi tiết" tab → body visible, history hidden
 *   H5:  Đóng và mở lại popup → reset về "Chi tiết"
 *   H6:  History pane load → spinner → table rendered với mock GAS data
 *   H7:  History table có cột: Thời gian, Người thực hiện, Thao tác, Chi tiết
 *   H8:  Synthetic "Tạo mới" row hiện đầu tiên (từ task.startDate)
 *   H9:  Initiative popup tabs hoạt động đúng
 *   H10: Case popup tabs hoạt động đúng
 *   H11: Thêm Task mới → startDate tự điền hôm nay
 *   H12: Thêm Case mới → startDate tự điền hôm nay
 *   H13: Thêm Initiative mới → startDate tự điền hôm nay (ISO YYYY-MM-DD)
 *   H14: Không có JS console errors
 *
 * EVD screenshots: test-results/history/
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Workspace/Production/SHTD-Dashboard';
const PORT    = 9992;
const BASE    = `http://localhost:${PORT}`;
const EVD_DIR = path.join(APP_DIR, 'test-results', 'history');

/* ── HTTP server ── */
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(APP_DIR, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

/* ── EVD dir ── */
if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

/* ── Result helpers ── */
let R = { pass: 0, fail: 0, tests: [] };
const PASS = (id, msg) => { console.log(`  ✅ [${id}] ${msg}`); R.pass++; R.tests.push({ id, ok:true, msg }); };
const FAIL = (id, msg) => { console.error(`  ❌ [${id}] ${msg}`); R.fail++; R.tests.push({ id, ok:false, msg }); process.exitCode = 1; };
const SS   = async (page, name) => page.screenshot({ path: path.join(EVD_DIR, `${name}.png`), fullPage: false });

/* ── Mock Data ── */
const MOCK_TASK = {
  id: 'Số-001', name: 'Task Alpha Kiểm tra Lịch sử',
  initiative: 'INIT-001', milestone: 'INIT-001-M1', team: 'Số', teamPhoiHop: '',
  type: 'Task', category: 'Số hóa', picAcc: 'TuanTT4', picRes: 'TuanTT4', picSupport: '',
  startDate: '2026-06-01', endDate: '2026-12-31', progress: 60,
  state: 'Đang thực hiện', status: 'Green', crossTeam: 'N', highlight: 'N',
  result: 'Kết quả alpha', nextPlan: '', vuongMac: '', canBLD: 'N', noiDungBLD: '', yKienBLD: '', tuanBC: '',
};

const MOCK_INITIATIVE = {
  id: 'INIT-001', name: 'Initiative Kiểm tra', type: 'initiative',
  category: 'Số hóa', accountable: 'TuanTT4',
  startDate: '01-Jun-26', deadline: '31-Dec-26', pct: 40, status: 'Active',
  milestoneTracking: '', milestoneDeadline: '', kpiTarget: '', notes: '', docLink: '', parentId: '',
};

const MOCK_CASE = {
  id: 'CP-001', tuanBC: 'Tuần 25/2026', team: 'Số', pic: 'TuanTT4',
  dvkd: 'Chi nhánh HCM', caseName: 'Case Kiểm tra Lịch sử', loaiHinh: 'Món',
  complexity: 'Trung bình', phuongAn: 'PA thử nghiệm', giaTriTy: 5,
  stage: 'Đang phân tích', vuongMac: '', nextStep: '', startDate: '2026-06-01',
  deadline: '2026-12-31', rag: 'Xanh', canBLD: 'N', highlight: 'N', ghiChu: '', yKienBLD: '',
};

const MOCK_AUDIT_ROWS = [
  ['2026-06-20T10:00:00.000Z', 'TuanTT4', 'Trần Thế Tuấn', 'Admin', 'task-upsert', 'Số-001 | Task Alpha Kiểm tra Lịch sử'],
  ['2026-06-22T14:30:00.000Z', 'DungLQ1', 'Lê Quang Dũng', 'User',  'task-upsert', 'Số-001 | Task Alpha Kiểm tra Lịch sử'],
];
const MOCK_AUDIT_CASE = [
  ['2026-06-20T09:00:00.000Z', 'TuanTT4', 'Trần Thế Tuấn', 'Admin', 'case-upsert', 'CP-001 | Case Kiểm tra Lịch sử'],
];
const MOCK_AUDIT_INIT = [
  ['2026-06-18T08:00:00.000Z', 'TuanTT4', 'Trần Thế Tuấn', 'Admin', 'initiative-upsert', 'INIT-001 | Initiative Kiểm tra'],
];

/* ── Browser setup ── */
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// GAS mock — intercept all GAS calls
await ctx.route('https://script.google.com/**', async route => {
  let parsed = null;
  try { parsed = JSON.parse(route.request().postData() || '{}'); } catch(_) {}
  const action = parsed?.action || '';
  const entityId = parsed?.entityId || '';

  if (action === 'audit-read') {
    let rows = [];
    if (entityId.startsWith('Số-') || entityId.startsWith('CV1-')) rows = MOCK_AUDIT_ROWS;
    else if (entityId.startsWith('CP-'))   rows = MOCK_AUDIT_CASE;
    else if (entityId.startsWith('INIT-')) rows = MOCK_AUDIT_INIT;
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', rows }) });
  } else if (['read','initiative-read','kpi-read','case-pipeline-read'].includes(action)) {
    await route.fulfill({ status: 500, body: 'mock-offline' });
  } else if (action === 'user-list') {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: {
        header: ['Username','Display_Name','Role','Team','Email','Active'],
        rows: [['TuanTT4','Trần Thế Tuấn','Admin','Số','t@b.vn','TRUE']],
      }}) });
  } else {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', serverTs: Date.now() }) });
  }
});

const jsErrors = [];
const page = await ctx.newPage();
page.on('pageerror', e => {
  if (!/net::ERR|ERR_ABORTED|500|favicon|GAS offline|Failed to fetch|mock-offline/.test(e.message))
    jsErrors.push(e.message);
});

/* ── Load app with auth + mock data ── */
async function loadApp() {
  await page.goto(BASE);
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(({ task, ini, c }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'test-token',
      user: { username: 'TuanTT4', displayName: 'Trần Thế Tuấn', role: 'Admin', team: 'Số' },
      exp: Date.now() + 3600000,
    }));
    localStorage.setItem('shtd_v2', JSON.stringify({
      tasks: [task], initiatives: [ini], cases: [c], _serverTs: null, deletedIds: [],
    }));
  }, { task: MOCK_TASK, ini: MOCK_INITIATIVE, c: MOCK_CASE });

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () => { const el = document.getElementById('loadingOverlay'); return !el || el.style.display === 'none'; },
    { timeout: 8000 }
  ).catch(() => {});
  await page.waitForTimeout(600);
}

async function navTo(view) {
  await page.evaluate(v => navigateTo(v), view);
  await page.waitForTimeout(400);
}

/* ══════════════════════════════════════════
   TESTS
══════════════════════════════════════════ */
await loadApp();

/* ─ H1: Tab bar HTML exists in all 3 overlays ─ */
console.log('\n📋 H1: Tab bar HTML tồn tại trong 3 view popups');
{
  const taskTabs  = await page.$('#taskViewOverlay .popup-tabs');
  const initTabs  = await page.$('#initViewOverlay .popup-tabs');
  const cpTabs    = await page.$('#cpViewOverlay .popup-tabs');
  const taskHist  = await page.$('#taskViewHistory');
  const initHist  = await page.$('#initViewHistory');
  const cpHist    = await page.$('#cpViewHistory');
  PASS('H1-a', taskTabs  ? 'taskViewOverlay có popup-tabs'   : 'FAIL') ;
  PASS('H1-b', initTabs  ? 'initViewOverlay có popup-tabs'   : 'FAIL');
  PASS('H1-c', cpTabs    ? 'cpViewOverlay có popup-tabs'     : 'FAIL');
  PASS('H1-d', taskHist  ? 'taskViewHistory pane tồn tại'    : 'FAIL');
  PASS('H1-e', initHist  ? 'initViewHistory pane tồn tại'    : 'FAIL');
  PASS('H1-f', cpHist    ? 'cpViewHistory pane tồn tại'      : 'FAIL');

  if (!taskTabs)  FAIL('H1-a', 'taskViewOverlay THIẾU popup-tabs');
  if (!initTabs)  FAIL('H1-b', 'initViewOverlay THIẾU popup-tabs');
  if (!cpTabs)    FAIL('H1-c', 'cpViewOverlay THIẾU popup-tabs');
  if (!taskHist)  FAIL('H1-d', 'taskViewHistory KHÔNG tồn tại');
  if (!initHist)  FAIL('H1-e', 'initViewHistory KHÔNG tồn tại');
  if (!cpHist)    FAIL('H1-f', 'cpViewHistory KHÔNG tồn tại');
}

/* ─ H2: Task popup opens với Chi tiết tab active ─ */
console.log('\n📋 H2: Task popup mở → Chi tiết tab active mặc định');
{
  await navTo('tasks');
  await page.waitForSelector('#taskTable tbody tr', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => openTaskViewPopup('Số-001'));
  await page.waitForTimeout(400);

  const overlayDisplay = await page.$eval('#taskViewOverlay', el => el.style.display);
  const detailActive   = await page.$eval('#taskTabDetail',  el => el.classList.contains('active'));
  const histInactive   = await page.$eval('#taskTabHistory', el => el.classList.contains('active'));
  const bodyVisible    = await page.$eval('#taskViewBody',   el => el.style.display !== 'none');
  const histHidden     = await page.$eval('#taskViewHistory',el => el.style.display === 'none');

  overlayDisplay === 'flex' ? PASS('H2-a', 'Overlay hiển thị') : FAIL('H2-a', `overlay display=${overlayDisplay}`);
  detailActive             ? PASS('H2-b', 'Chi tiết tab active') : FAIL('H2-b', 'Chi tiết tab KHÔNG active');
  !histInactive            ? PASS('H2-c', 'Lịch sử tab inactive') : FAIL('H2-c', 'Lịch sử tab sai trạng thái');
  bodyVisible              ? PASS('H2-d', 'taskViewBody visible') : FAIL('H2-d', 'taskViewBody HIDDEN');
  histHidden               ? PASS('H2-e', 'taskViewHistory hidden') : FAIL('H2-e', 'taskViewHistory visible sai');

  await SS(page, 'h2_task_popup_detail_tab');
}

/* ─ H3: Click Lịch sử tab → switch ─ */
console.log('\n📋 H3: Click Lịch sử tab → history pane visible');
{
  await page.click('#taskTabHistory');
  await page.waitForTimeout(300);

  const histActive  = await page.$eval('#taskTabHistory',  el => el.classList.contains('active'));
  const detInactive = await page.$eval('#taskTabDetail',   el => el.classList.contains('active'));
  const histVisible = await page.$eval('#taskViewHistory', el => el.style.display !== 'none');
  const bodyHidden  = await page.$eval('#taskViewBody',    el => el.style.display === 'none');

  histActive   ? PASS('H3-a', 'Lịch sử tab active')    : FAIL('H3-a', 'Lịch sử tab KHÔNG active');
  !detInactive ? PASS('H3-b', 'Chi tiết tab inactive')  : FAIL('H3-b', 'Chi tiết tab vẫn active');
  histVisible  ? PASS('H3-c', 'taskViewHistory visible') : FAIL('H3-c', 'taskViewHistory HIDDEN');
  bodyHidden   ? PASS('H3-d', 'taskViewBody hidden')     : FAIL('H3-d', 'taskViewBody vẫn visible');

  await SS(page, 'h3_task_history_tab_loading');
}

/* ─ H6: History table loaded từ mock GAS ─ */
console.log('\n📋 H6: History table rendered sau GAS call');
{
  // Wait for loading to finish (spinner → table)
  await page.waitForFunction(
    () => {
      const el = document.getElementById('taskViewHistory');
      return el && !el.innerHTML.includes('fa-spinner');
    },
    { timeout: 8000 }
  ).catch(() => {});
  await page.waitForTimeout(300);

  const html = await page.$eval('#taskViewHistory', el => el.innerHTML);
  const hasTable   = html.includes('<table');
  const hasRows    = html.includes('<tbody');
  const notLoading = !html.includes('fa-spinner');

  hasTable   ? PASS('H6-a', 'Table HTML rendered')     : FAIL('H6-a', 'KHÔNG có <table> trong history pane');
  hasRows    ? PASS('H6-b', 'tbody tồn tại')            : FAIL('H6-b', 'KHÔNG có <tbody>');
  notLoading ? PASS('H6-c', 'Spinner đã biến mất')      : FAIL('H6-c', 'Spinner vẫn còn');

  await SS(page, 'h6_task_history_table_loaded');
}

/* ─ H7: History table columns ─ */
console.log('\n📋 H7: History table có đúng 4 cột header');
{
  const headers = await page.$$eval('#taskViewHistory thead th', ths => ths.map(th => th.textContent.trim().toLowerCase()));
  const hasTime  = headers.some(h => h.includes('thời gian'));
  const hasUser  = headers.some(h => h.includes('người'));
  const hasAct   = headers.some(h => h.includes('thao tác'));
  const hasDet   = headers.some(h => h.includes('chi tiết'));

  hasTime ? PASS('H7-a', 'Cột Thời gian')          : FAIL('H7-a', `Thiếu cột Thời gian. Headers: ${headers}`);
  hasUser ? PASS('H7-b', 'Cột Người thực hiện')     : FAIL('H7-b', 'Thiếu cột Người thực hiện');
  hasAct  ? PASS('H7-c', 'Cột Thao tác')            : FAIL('H7-c', 'Thiếu cột Thao tác');
  hasDet  ? PASS('H7-d', 'Cột Chi tiết')            : FAIL('H7-d', 'Thiếu cột Chi tiết');
}

/* ─ H8: Synthetic "Tạo mới" row ─ */
console.log('\n📋 H8: Synthetic "Tạo mới" row là dòng đầu tiên');
{
  const rows = await page.$$eval('#taskViewHistory tbody tr', trs => trs.map(tr => tr.textContent));
  const firstRow   = rows[0] || '';
  const hasSynth   = firstRow.toLowerCase().includes('tạo mới') || firstRow.toLowerCase().includes('tao moi');
  const rowCount   = rows.length; // synthetic (1) + 2 mock rows = 3

  hasSynth       ? PASS('H8-a', `Dòng đầu có "Tạo mới" (tổng ${rowCount} dòng)`)
                 : FAIL('H8-a', `Dòng đầu KHÔNG có Tạo mới. Nội dung: "${firstRow.slice(0,80)}"`);
  rowCount >= 3  ? PASS('H8-b', `Đủ rows: ${rowCount} (synthetic + 2 mock)`)
                 : FAIL('H8-b', `Chỉ có ${rowCount} rows, expected >= 3`);

  await SS(page, 'h8_task_history_rows');
}

/* ─ H4: Click Chi tiết tab → switch back ─ */
console.log('\n📋 H4: Click Chi tiết tab → switch về Chi tiết');
{
  await page.click('#taskTabDetail');
  await page.waitForTimeout(200);

  const detActive  = await page.$eval('#taskTabDetail',  el => el.classList.contains('active'));
  const bodyVis    = await page.$eval('#taskViewBody',   el => el.style.display !== 'none');
  const histHidden = await page.$eval('#taskViewHistory',el => el.style.display === 'none');

  detActive  ? PASS('H4-a', 'Chi tiết tab active lại') : FAIL('H4-a', 'Chi tiết tab KHÔNG active');
  bodyVis    ? PASS('H4-b', 'taskViewBody visible')     : FAIL('H4-b', 'taskViewBody vẫn hidden');
  histHidden ? PASS('H4-c', 'taskViewHistory hidden')   : FAIL('H4-c', 'taskViewHistory vẫn visible');
}

/* ─ H5: Đóng và mở lại → reset về Chi tiết ─ */
console.log('\n📋 H5: Đóng và mở lại popup → reset về tab Chi tiết');
{
  // Switch to history first
  await page.click('#taskTabHistory');
  await page.waitForTimeout(200);
  // Close popup
  await page.evaluate(() => closeTaskViewPopup());
  await page.waitForTimeout(200);
  // Reopen
  await page.evaluate(() => openTaskViewPopup('Số-001'));
  await page.waitForTimeout(300);

  const detActive = await page.$eval('#taskTabDetail',  el => el.classList.contains('active'));
  const bodyVis   = await page.$eval('#taskViewBody',   el => el.style.display !== 'none');
  const histHid   = await page.$eval('#taskViewHistory',el => el.style.display === 'none');

  detActive ? PASS('H5-a', 'Reopen → Chi tiết tab active') : FAIL('H5-a', 'Reopen → Chi tiết KHÔNG active');
  bodyVis   ? PASS('H5-b', 'taskViewBody visible')          : FAIL('H5-b', 'taskViewBody hidden');
  histHid   ? PASS('H5-c', 'taskViewHistory hidden')        : FAIL('H5-c', 'taskViewHistory không hidden');

  await SS(page, 'h5_task_popup_reopen_reset');
  await page.evaluate(() => closeTaskViewPopup());
}

/* ─ H9: Initiative popup tabs ─ */
console.log('\n📋 H9: Initiative popup tabs hoạt động');
{
  await navTo('initiative-tracker');
  await page.waitForTimeout(500);
  await page.evaluate(() => openInitViewPopup('INIT-001'));
  await page.waitForTimeout(400);

  const overlayOk  = await page.$eval('#initViewOverlay', el => el.style.display === 'flex');
  const detActive  = await page.$eval('#initTabDetail',   el => el.classList.contains('active'));
  const bodyVis    = await page.$eval('#initViewBody',    el => el.style.display !== 'none');
  const histHid    = await page.$eval('#initViewHistory', el => el.style.display === 'none');

  overlayOk ? PASS('H9-a', 'Initiative overlay mở')           : FAIL('H9-a', 'Initiative overlay KHÔNG mở');
  detActive ? PASS('H9-b', 'Chi tiết tab active mặc định')    : FAIL('H9-b', 'Chi tiết tab KHÔNG active');
  bodyVis   ? PASS('H9-c', 'initViewBody visible')             : FAIL('H9-c', 'initViewBody hidden');
  histHid   ? PASS('H9-d', 'initViewHistory hidden ban đầu')   : FAIL('H9-d', 'initViewHistory visible sai');

  await page.click('#initTabHistory');
  await page.waitForTimeout(300);
  await page.waitForFunction(
    () => { const el = document.getElementById('initViewHistory'); return el && !el.innerHTML.includes('fa-spinner'); },
    { timeout: 8000 }
  ).catch(() => {});

  const histActive  = await page.$eval('#initTabHistory',  el => el.classList.contains('active'));
  const histVisible = await page.$eval('#initViewHistory', el => el.style.display !== 'none');
  const initHtml    = await page.$eval('#initViewHistory', el => el.innerHTML);
  const hasTable    = initHtml.includes('<table');

  histActive ? PASS('H9-e', 'Lịch sử tab active sau click') : FAIL('H9-e', 'Lịch sử tab KHÔNG active');
  histVisible? PASS('H9-f', 'initViewHistory visible')      : FAIL('H9-f', 'initViewHistory KHÔNG visible');
  hasTable   ? PASS('H9-g', 'Initiative history table rendered') : FAIL('H9-g', 'KHÔNG có table trong init history');

  await SS(page, 'h9_initiative_history_tab');
  await page.evaluate(() => closeInitViewPopup());
}

/* ─ H10: Case popup tabs ─ */
console.log('\n📋 H10: Case popup tabs hoạt động');
{
  await navTo('case-pipeline');
  await page.waitForTimeout(500);
  await page.evaluate(() => openCaseViewPopup('CP-001'));
  await page.waitForTimeout(400);

  const overlayOk = await page.$eval('#cpViewOverlay', el => el.style.display === 'flex');
  const detActive = await page.$eval('#cpTabDetail',   el => el.classList.contains('active'));
  const bodyVis   = await page.$eval('#cpViewBody',    el => el.style.display !== 'none');

  overlayOk ? PASS('H10-a', 'Case overlay mở')              : FAIL('H10-a', 'Case overlay KHÔNG mở');
  detActive ? PASS('H10-b', 'Chi tiết tab active mặc định') : FAIL('H10-b', 'Chi tiết tab KHÔNG active');
  bodyVis   ? PASS('H10-c', 'cpViewBody visible')            : FAIL('H10-c', 'cpViewBody hidden');

  await page.click('#cpTabHistory');
  await page.waitForTimeout(300);
  await page.waitForFunction(
    () => { const el = document.getElementById('cpViewHistory'); return el && !el.innerHTML.includes('fa-spinner'); },
    { timeout: 8000 }
  ).catch(() => {});

  const histActive  = await page.$eval('#cpTabHistory',  el => el.classList.contains('active'));
  const histVisible = await page.$eval('#cpViewHistory', el => el.style.display !== 'none');
  const cpHtml      = await page.$eval('#cpViewHistory', el => el.innerHTML);
  const hasTable    = cpHtml.includes('<table');

  histActive ? PASS('H10-d', 'Lịch sử tab active sau click') : FAIL('H10-d', 'Lịch sử tab KHÔNG active');
  histVisible? PASS('H10-e', 'cpViewHistory visible')         : FAIL('H10-e', 'cpViewHistory KHÔNG visible');
  hasTable   ? PASS('H10-f', 'Case history table rendered')   : FAIL('H10-f', 'KHÔNG có table trong case history');

  await SS(page, 'h10_case_history_tab');
  await page.evaluate(() => closeCaseViewPopup());
}

/* ─ H11: New task modal → startDate = today ─ */
console.log('\n📋 H11: Thêm Task mới → startDate tự điền hôm nay');
{
  await navTo('tasks');
  await page.waitForTimeout(400);
  await page.evaluate(() => openTaskModal(null));
  await page.waitForTimeout(400);

  const startVal = await page.$eval('#fStart', el => el.value);
  const today    = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  startVal === todayISO ? PASS('H11', `startDate = hôm nay (${todayISO})`)
                        : FAIL('H11', `startDate = "${startVal}", expected "${todayISO}"`);

  await SS(page, 'h11_task_modal_startdate_today');
  await page.evaluate(() => document.getElementById('taskOverlay').classList.remove('open'));
}

/* ─ H12: New case modal → startDate = today ─ */
console.log('\n📋 H12: Thêm Case mới → startDate tự điền hôm nay');
{
  await navTo('case-pipeline');
  await page.waitForTimeout(400);
  await page.evaluate(() => openCaseModal(null));
  await page.waitForTimeout(400);

  const startVal = await page.$eval('#cpfStartDate', el => el.value);
  const today    = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  startVal === todayISO ? PASS('H12', `cpfStartDate = hôm nay (${todayISO})`)
                        : FAIL('H12', `cpfStartDate = "${startVal}", expected "${todayISO}"`);

  await SS(page, 'h12_case_modal_startdate_today');
  await page.evaluate(() => closeCaseModal());
}

/* ─ H13: New initiative modal → startDate = today DD-MMM-YY ─ */
console.log('\n📋 H13: Thêm Initiative mới → startDate tự điền hôm nay (ISO YYYY-MM-DD)');
{
  await navTo('initiative-tracker');
  await page.waitForTimeout(500);
  await page.evaluate(() => _initOpenModal(null));
  await page.waitForTimeout(400);

  // #initFStart is <input type="date"> → its .value is always ISO YYYY-MM-DD.
  // Project canonical (S67) is ISO for storage + memory, so today's default is ISO.
  const startVal = await page.$eval('#initFStart', el => el.value);
  const today    = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  startVal === todayISO ? PASS('H13', `initFStart = hôm nay (${todayISO})`)
                        : FAIL('H13', `initFStart = "${startVal}", expected "${todayISO}"`);

  await SS(page, 'h13_initiative_modal_startdate_today');
  await page.evaluate(() => document.getElementById('initModalOverlay').style.display = 'none');
}

/* ─ H14: No JS errors ─ */
console.log('\n📋 H14: Không có JS console errors');
{
  jsErrors.length === 0
    ? PASS('H14', `0 JS errors`)
    : FAIL('H14', `${jsErrors.length} JS errors: ${jsErrors.slice(0,3).join(' | ')}`);
}

/* ══════════════════════════════════════════
   RESULT
══════════════════════════════════════════ */
await browser.close();
server.close();

console.log('\n' + '═'.repeat(55));
console.log(`RESULT: ${R.pass + R.fail} checks — ${R.pass} PASS / ${R.fail} FAIL`);
console.log(`EVD screenshots: ${EVD_DIR}`);
console.log('═'.repeat(55));

if (R.fail > 0) process.exit(1);
