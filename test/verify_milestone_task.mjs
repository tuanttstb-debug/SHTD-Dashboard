import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Công việc/Vibecode/SHTD-Dashboard';
const PORT = 9991;
const BASE = `http://localhost:${PORT}`;

const MOCK_USERS = {
  header: ['Username','Display_Name','Role','Team','Email','Active'],
  rows: [
    ['TuanTT4','Tran The Tuan','Admin','So','t@b.vn','TRUE'],
    ['DungLQ1','Le Quang Dung','User','So','d@b.vn','TRUE'],
  ]
};

const MOCK_TASKS = [
  ['ID','Tuan BC','Initiative ID','Category','Team chinh','Team phoi hop','Loai (Task/BAU/DA/SK)','Task / Deliverable','PIC Accountable','PIC Responsible','PIC Support','Start Date','Deadline','% HT','Trang thai','Milestone hien tai','Ket qua tuan qua','Ke hoach tuan toi','Vuong mac','Can BLD (Y/N)','Noi dung can BLD quyet','Cross-team? (Y/N)','Highlight bao cao len dashboard? (Y/N)','Y kien BLD'],
  ['T001','Tuan 01/2026','INIT-001','So hoa','So','','Task','Task Alpha','TuanTT4','TuanTT4','','2026-01-01','2026-06-30','50%','Dang thuc hien','INIT-001-M1','','','','N','','N','N',''],
];

const MOCK_CASES = [
  ['ID','Tuan BC','Team','PIC','DVKD','Khach hang / Case','Loai hinh','Muc do phuc tap','Phuong an','Gia tri (ty dong)','Stage','Vuong mac chinh','Next step','Start Date','Deadline','RAG','Can BLD?','Highlight dashboard?','Ghi chu','Y kien BLD'],
  ['CP001','Tuan 01/2026','So','TuanTT4','CN 1','KH ABC','Cho vay','Cao','PA1','10','Tiep nhan','','','10/01/2026','30/07/2026','Vang','N','N','',''],
];

// Two milestones under INIT-001: M1 and M2
const MOCK_INITS = [
  ['ID','Name','Status','Category','Accountable','Start_Date','Deadline','Pct','Type','Parent_ID','KPI_Target','Notes','Doc_Link','Milestone_Tracking','Milestone_Deadline'],
  ['INIT-001','Initiative Alpha','Active','Số hóa','TuanTT4','2026-01-01','2026-12-31','60','initiative','','Tang 20% KPI','Ghi chu test','','MS1','2026-06-30'],
  ['INIT-001-M1','Milestone 1','Active','','TuanTT4','2026-01-01','2026-06-30','40','milestone','INIT-001','','','',''],
  ['INIT-001-M2','Milestone 2','Chưa bắt đầu','','TuanTT4','2026-07-01','2026-09-30','0','milestone','INIT-001','','','',''],
];

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let fp = path.join(APP_DIR, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext = path.extname(fp);
    const mime = {'.html':'text/html','.js':'application/javascript','.css':'text/css'}[ext]||'text/plain';
    res.writeHead(200, {'Content-Type':mime,'Access-Control-Allow-Origin':'*'});
    res.end(data);
  } catch(e) { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let results = { pass: 0, fail: 0 };
const check = (cond, msg) => {
  if (cond) { console.log(`  PASS -- ${msg}`); results.pass++; }
  else       { console.log(`  FAIL -- ${msg}`); results.fail++; }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  await context.addInitScript((exp) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'pw-mock',
      user: { username: 'TuanTT4', displayName: 'Tran The Tuan', role: 'Admin', team: 'So' },
      exp
    }));
  }, Date.now() + 3600000);

  await context.route('https://script.google.com/**', async (route) => {
    const body = route.request().postData();
    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch(e) {}
    const action = payload.action || '';
    let response = { status: 'ok' };
    if (action === 'user-list')               response = { status:'ok', data: MOCK_USERS };
    else if (action === 'read')               response = { status:'ok', values: MOCK_TASKS, serverTs: Date.now() };
    else if (action === 'case-pipeline-read') response = { status:'ok', values: MOCK_CASES };
    else if (action === 'initiative-read')    response = { status:'ok', values: MOCK_INITS };
    await route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(response) });
  });

  const page = await context.newPage();
  const jsErrors = [];
  page.on('console', m => { if (m.type()==='error') jsErrors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);

  const session = await page.evaluate(() => typeof getCurrentUser === 'function' ? getCurrentUser() : null);
  if (!session) {
    console.log('AUTH FAILED -- aborting'); await browser.close(); server.close(); process.exit(1);
  }
  console.log('Logged in as: ' + session.username + ' (' + session.role + ')');

  // Navigate to initiative tracker
  await page.evaluate(() => navigateTo('initiative-tracker'));
  await page.waitForTimeout(1200);

  // ── T1: Verify milestones exist in DOM ──────────────────────────────────────
  console.log('\n[T1] Milestones loaded');
  const initCardExists = await page.$('#init-card-INIT-001') !== null;
  check(initCardExists, 'INIT-001 card rendered');

  // Expand milestones
  await page.click('#btn-ms-INIT-001');
  await page.waitForTimeout(400);

  const msRows = await page.$$('.init-milestone-row');
  check(msRows.length >= 2, `At least 2 milestone rows (got ${msRows.length})`);

  // ── T2: "+ Task" button exists on each milestone row ────────────────────────
  console.log('\n[T2] "+ Task" button exists on milestone rows');
  const addTaskBtns = await page.$$('.init-milestone-row button[title="Thêm task vào milestone này"]');
  check(addTaskBtns.length >= 2, `At least 2 "Thêm Task" buttons (got ${addTaskBtns.length})`);

  // ── T3: Click "+ Task" on M1 → task modal opens pre-filled ─────────────────
  console.log('\n[T3] Click "+ Task" on M1 -> task modal opens pre-filled');
  await addTaskBtns[0].click();
  await page.waitForTimeout(500);

  const modalOpen = await page.$eval('#taskOverlay', el => el.classList.contains('open'));
  check(modalOpen, 'Task modal opened');

  const fInit = await page.$eval('#fInit', el => el.value);
  check(fInit === 'INIT-001', `fInit = "INIT-001" (got "${fInit}")`);

  const fMs = await page.$eval('#fMs', el => el.value);
  check(fMs === 'INIT-001-M1', `fMs = "INIT-001-M1" (got "${fMs}")`);

  const fCat = await page.$eval('#fCat', el => el.value);
  check(fCat === 'Số hóa', `fCat = "Số hóa" from initiative (got "${fCat}")`);

  const taskId = await page.$eval('#fId', el => el.value);
  check(taskId.startsWith('INIT-001'), `Auto-gen task ID starts with "INIT-001" (got "${taskId}")`);
  check(taskId.length > 0, `Task ID is non-empty: "${taskId}"`);

  const subtitle = await page.$eval('#modalSubtitle', el => el.textContent);
  check(subtitle.includes('INIT-001') && subtitle.includes('M1'), `Subtitle shows initiative + milestone: "${subtitle}"`);

  const picAcc = await page.$eval('#fPicAcc', el => el.value);
  check(picAcc === 'TuanTT4', `fPicAcc = "TuanTT4" from initiative accountable (got "${picAcc}")`);

  // Close via ESC
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── T4: Click "+ Task" on M2 → different milestone pre-filled ──────────────
  console.log('\n[T4] Click "+ Task" on M2 -> M2 milestone pre-filled');
  await addTaskBtns[1].click();
  await page.waitForTimeout(500);

  const fMs2 = await page.$eval('#fMs', el => el.value);
  check(fMs2 === 'INIT-001-M2', `fMs = "INIT-001-M2" (got "${fMs2}")`);

  const taskId2 = await page.$eval('#fId', el => el.value);
  check(taskId2.includes('M2'), `Auto-gen ID for M2 context (got "${taskId2}")`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ── T5: Expand M1 tasks panel → "Thêm Task" in empty state ────────────────
  console.log('\n[T5] Milestone task panel empty state has "+ Thêm Task" button');
  // M2 has no tasks → its panel empty state should show "+ Thêm Task"
  const msTaskBtns = await page.$$('.init-ms-task-btn');
  check(msTaskBtns.length >= 2, `At least 2 task-toggle buttons (got ${msTaskBtns.length})`);

  // Toggle M2 task panel (no tasks → empty state)
  await msTaskBtns[1].click();
  await page.waitForTimeout(300);

  const emptyStateBtn = await page.$('.init-ms-task-panel.open button[title="Thêm task vào milestone này"]');
  check(emptyStateBtn !== null, '"+ Thêm Task" button in empty milestone task panel');

  if (emptyStateBtn) {
    await emptyStateBtn.click();
    await page.waitForTimeout(400);
    const m2Open = await page.$eval('#taskOverlay', el => el.classList.contains('open'));
    check(m2Open, 'Task modal opened from empty-state button');
    const fMs2b = await page.$eval('#fMs', el => el.value);
    check(fMs2b === 'INIT-001-M2', `fMs pre-filled "INIT-001-M2" from empty-state button (got "${fMs2b}")`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // ── T6: "Thêm Milestone" auto-gen ID ──────────────────────────────────────
  console.log('\n[T6] "Thêm Milestone" auto-generates ID as {iniId}-M{next}');
  // Currently M1 and M2 exist → next should be M3
  const addMsBtns = await page.$$('button[onclick*="_initOpenMilestone"]');
  check(addMsBtns.length > 0, '"Thêm Milestone" button found');

  if (addMsBtns.length) {
    await addMsBtns[0].click();
    await page.waitForTimeout(400);
    const msModalOpen = await page.evaluate(() => {
      const el = document.getElementById('initModalOverlay');
      return el ? el.style.display !== 'none' : false;
    });
    check(msModalOpen, 'Milestone modal opened');

    const autoMsId = await page.$eval('#initFId', el => el.value);
    check(autoMsId === 'INIT-001-M3', `Auto-gen milestone ID = "INIT-001-M3" (got "${autoMsId}")`);

    const parentSel = await page.$eval('#initFParent', el => el.value);
    check(parentSel === 'INIT-001', `Parent dropdown = "INIT-001" (got "${parentSel}")`);

    const autoMsCat = await page.$eval('#initFCat', el => el.value);
    check(autoMsCat === 'Số hóa', `Category pre-filled from parent initiative: "${autoMsCat}"`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // ── T7: No JS errors ────────────────────────────────────────────────────────
  console.log('\n[T7] No JS console errors');
  if (jsErrors.length) jsErrors.forEach(e => console.log('  JS error: ' + e));
  check(jsErrors.length === 0, 'No JS errors (' + jsErrors.length + ' found)');

  await browser.close();
  server.close();

  const total = results.pass + results.fail;
  console.log('\n' + '='.repeat(50));
  console.log('TOTAL: ' + total + ' | PASS: ' + results.pass + ' | FAIL: ' + results.fail);
  console.log('='.repeat(50));
  process.exit(results.fail > 0 ? 1 : 0);
})();
