import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Công việc/Vibecode/SHTD-Dashboard';
const PORT = 9989;
const BASE = `http://localhost:${PORT}`;

const MOCK_USERS = {
  header: ['Username','Display_Name','Role','Team','Email','Active'],
  rows: [
    ['TuanTT4','Tran The Tuan','Admin','So','t@b.vn','TRUE'],
    ['DungLQ1','Le Quang Dung','User','So','d@b.vn','TRUE'],
  ]
};

const MOCK_TASKS = [
  ['ID','Tuan BC','Initiative ID','Category','Team chinh','Team phoi hop','Loai (Task/BAU/DA/SK)','Task / Deliverable (1 dong = 1 deliverable cu the)','PIC Accountable (Teamlead - chiu trach nhiem)','PIC Responsible (Member - nguoi thuc thi)','PIC Support (Member - nguoi ho tro)','Start Date','Deadline','% HT','Trang thai','Milestone hien tai','Ket qua tuan qua','Ke hoach tuan toi','Vuong mac','Can BLD (Y/N)','Noi dung can BLD quyet','Cross-team? (Y/N)','Highlight bao cao len dashboard? (Y/N)','Y kien BLD'],
  ['T001','Tuan 01/2026','INIT-001','Du an','So','','Task','Task Alpha','TuanTT4','TuanTT4','','2026-01-01','2026-06-30','50%','Dang thuc hien','INIT-001-M1','KQ 1','KH 1','VM 1','Y','Xin y kien BLD','N','N',''],
  ['T002','Tuan 02/2026','INIT-001','BAU','So','','Task','Task Beta','TuanTT4','DungLQ1','','2026-02-01','2026-07-31','80%','Dang thuc hien','','','','','N','','N','Y',''],
];

const MOCK_CASES = [
  ['ID','Tuan BC','Team','PIC','DVKD','Khach hang / Case','Loai hinh','Muc do phuc tap','Phuong an','Gia tri (ty dong)','Stage','Vuong mac chinh','Next step','Start Date','Deadline','RAG','Can BLD?','Highlight dashboard?','Ghi chu','Y kien BLD'],
  ['CP001','Tuan 01/2026','So','TuanTT4','CN 1','KH ABC','Cho vay','Cao','PA1','10','Tiep nhan','','','10/01/2026','30/07/2026','Vang','N','N','',''],
];

const MOCK_INITS = [
  ['ID','Name','Status','Category','Accountable','Start_Date','Deadline','Pct','Type','Parent_ID','KPI_Target','Notes','Doc_Link','Milestone_Tracking','Milestone_Deadline'],
  ['INIT-001','Initiative Alpha','Active','So hoa','TuanTT4','2026-01-01','2026-12-31','60','initiative','','Tang 20% KPI','Ghi chu test','','MS1','2026-06-30'],
  ['INIT-001-M1','Milestone 1','Active','','TuanTT4','2026-01-01','2026-06-30','40','milestone','INIT-001','','','','',''],
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

  // T1: Overlays exist in DOM
  console.log('\n[T1] Overlay HTML exists');
  check(await page.$('#taskViewOverlay') !== null, '#taskViewOverlay exists');
  check(await page.$('#initViewOverlay') !== null, '#initViewOverlay exists');
  check(await page.$('#taskViewTitle') !== null, '#taskViewTitle exists');
  check(await page.$('#initViewTitle') !== null, '#initViewTitle exists');

  // T2: Tasks view -- click row opens task popup
  console.log('\n[T2] Tasks: click row -> task view popup');
  await page.evaluate(() => navigateTo('tasks'));
  await page.waitForTimeout(800);

  const firstRow = await page.$('#taskTbody tr');
  check(!!firstRow, 'Task table has rows');

  let taskId = '';
  if (firstRow) {
    taskId = await firstRow.$eval('td:nth-child(2) span', el => el.textContent.trim());
    await firstRow.click();
    await page.waitForTimeout(300);

    check(await page.$eval('#taskViewOverlay', el => el.style.display) === 'flex', 'Task popup opened for ' + taskId);
    const title = await page.$eval('#taskViewTitle', el => el.textContent.trim());
    check(title.length > 0, 'taskViewTitle populated: "' + title + '"');
    const subtitle = await page.$eval('#taskViewSubtitle', el => el.textContent.trim());
    check(subtitle.includes(taskId), 'subtitle contains task ID');
    const bodyHtml = await page.$eval('#taskViewBody', el => el.innerHTML.trim());
    check(bodyHtml.length > 100, 'taskViewBody has content');

    // T3: Popup content
    console.log('\n[T3] Popup content: state chip + RAG badge');
    check(bodyHtml.includes('state-chip'), 'State chip present');
    check(bodyHtml.includes('badge'), 'RAG badge present');

    // T4: Close via Dong button
    console.log('\n[T4] Close via Dong button');
    await page.click('#taskViewOverlay .btn-outline');
    await page.waitForTimeout(200);
    check(await page.$eval('#taskViewOverlay', el => el.style.display) === 'none', 'Closed via Dong');

    // T5: ESC closes popup
    console.log('\n[T5] ESC closes task popup');
    await firstRow.click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check(await page.$eval('#taskViewOverlay', el => el.style.display) === 'none', 'Closed via ESC');

    // T6: Chinh sua -> edit modal opens
    console.log('\n[T6] Chinh sua -> edit modal opens, popup closes');
    await firstRow.click();
    await page.waitForTimeout(200);
    await page.click('#taskViewOverlay .btn-primary');
    await page.waitForTimeout(400);
    check(await page.$eval('#taskViewOverlay', el => el.style.display) === 'none', 'Popup closed on Chinh sua');
    check(await page.$eval('#taskOverlay', el => el.classList.contains('open')), 'Edit modal opened');

    // T7: ESC from edit modal -- popup NOT re-opened
    console.log('\n[T7] ESC from edit modal -> popup NOT re-opened (cancel)');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check(!await page.$eval('#taskOverlay', el => el.classList.contains('open')), 'Edit modal closed');
    check(await page.$eval('#taskViewOverlay', el => el.style.display) === 'none', 'Popup not re-opened after cancel');
  }

  // T8: Initiative Tracker card header clickable
  console.log('\n[T8] Initiative Tracker: card header click -> init popup');
  await page.evaluate(() => navigateTo('initiative-tracker'));
  await page.waitForTimeout(1200);

  const initCard = await page.$('.init-card-header');
  check(!!initCard, 'Init card header found');

  if (initCard) {
    const cursor = await initCard.evaluate(el => window.getComputedStyle(el).cursor);
    check(cursor === 'pointer', 'Card header cursor:pointer (got ' + cursor + ')');

    await initCard.click();
    await page.waitForTimeout(300);
    check(await page.$eval('#initViewOverlay', el => el.style.display) === 'flex', 'Init popup opened');
    const initTitle = await page.$eval('#initViewTitle', el => el.textContent.trim());
    check(initTitle.length > 0, 'initViewTitle: "' + initTitle + '"');
    const initSubtitle = await page.$eval('#initViewSubtitle', el => el.textContent.trim());
    check(initSubtitle.includes('INIT-001'), 'initViewSubtitle contains ID');

    // T9: ESC closes init popup
    console.log('\n[T9] ESC closes init popup');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check(await page.$eval('#initViewOverlay', el => el.style.display) === 'none', 'Init popup ESC closed');

    // T10: Action btn stopPropagation
    console.log('\n[T10] Action btn does NOT open init popup');
    const editBtnInActions = await page.$('.init-card-actions .btn-ghost');
    if (editBtnInActions) {
      await editBtnInActions.click();
      await page.waitForTimeout(300);
      check(await page.$eval('#initViewOverlay', el => el.style.display) !== 'flex', 'Init popup not opened by action btn');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    } else {
      check(false, 'No action btn found');
    }

    // T11: Init popup Chinh sua -> edit modal
    console.log('\n[T11] Init popup Chinh sua -> initiative edit modal');
    await initCard.click();
    await page.waitForTimeout(200);
    await page.click('#initViewOverlay .btn-primary');
    await page.waitForTimeout(400);
    check(await page.$eval('#initViewOverlay', el => el.style.display) === 'none', 'Init popup closed on Chinh sua');
    const initModalOpen = await page.evaluate(() => {
      const el = document.getElementById('initModalOverlay');
      return el ? el.style.display !== 'none' : false;
    });
    check(initModalOpen, 'Initiative edit modal opened');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // T12: Task rows in initiative linked task list -> task popup
  console.log('\n[T12] Initiative linked task rows open task popup');
  await page.evaluate(() => navigateTo('initiative-tracker'));
  await page.waitForTimeout(800);
  const taskToggle = await page.$('[id^="btn-tk-"]');
  if (taskToggle) {
    await taskToggle.click();
    await page.waitForTimeout(400);
    // Use tbody tr to skip the thead header row
    const taskRowInInit = await page.$('.init-task-list tbody tr');
    if (taskRowInInit) {
      const onclickAttr = await taskRowInInit.getAttribute('onclick');
      console.log('  task row onclick: ' + onclickAttr);
      await taskRowInInit.click();
      await page.waitForTimeout(300);
      check(await page.$eval('#taskViewOverlay', el => el.style.display) === 'flex', 'Task popup from linked task row');
      await page.keyboard.press('Escape');
    } else {
      // Debug: how many tasks linked to initiative?
      const debugInfo = await page.evaluate(() => {
        const tasks = (db.tasks || []).filter(t => t.initiative === 'INIT-001');
        return { count: tasks.length, ids: tasks.map(t => t.id) };
      });
      console.log('  Debug: linked tasks for INIT-001:', JSON.stringify(debugInfo));
      check(false, 'No task data rows in linked task list (tbody tr)');
    }
  } else {
    check(false, 'No task toggle btn found');
  }

  // T13: No JS errors
  console.log('\n[T13] No JS console errors');
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
