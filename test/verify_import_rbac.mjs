/**
 * verify_import_rbac.mjs
 * Test: Import buttons hidden for User role, visible for Admin and Teamlead
 * Also tests JS-level guard (canImport) blocks User even if button is somehow clicked
 */
import { chromium } from 'playwright';
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://localhost:3030';

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

function makeAuth(role) {
  return {
    token: 'local-test-token',
    user: { username: 'TestUser', displayName: 'Test', role, team: 'Số' },
    exp: Date.now() + 3600 * 1000,
  };
}

const TASKS = [{
  id: 'S-001', name: 'Task A', type: 'Task', category: 'Dashboard/BC',
  initiative: '', team: 'Số', picAcc: 'TuanTT4', picRes: 'TuanTT4',
  status: 'Green', state: 'Đang thực hiện', deadline: '2026-12-31', progress: 50,
  canBLD: 'N', yKienBLD: '', noiDungBLD: '',
}];
const CASES = [{
  id: 'CP-001', tuanBC: '', team: 'Số', pic: 'TuanTT4', dvkd: 'HDG',
  caseName: 'Test Case', loaiHinh: 'Món', complexity: 'Cao', phuongAn: '',
  giaTriTy: 100, stage: 'Tiếp nhận', vuongMac: '', nextStep: '',
  startDate: '2026-01-01', deadline: '2026-12-31',
  rag: 'Xanh', canBLD: 'N', highlight: 'N', ghiChu: '', yKienBLD: '',
}];

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else       { console.error(`  ❌ ${label}`); fail++; }
}

async function setupPage(browser, role) {
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/script.google.com/**', r => r.abort());
  await ctx.route('**/macros/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.error('  [JS ERR]', m.text()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ auth, tasks, cases }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify(auth));
    const db = JSON.parse(localStorage.getItem('shtd_v2') || '{}');
    db.tasks = tasks; db.cases = cases;
    localStorage.setItem('shtd_v2', JSON.stringify(db));
  }, { auth: makeAuth(role), tasks: TASKS, cases: CASES });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    !document.getElementById('loginOverlay') ||
    document.getElementById('loginOverlay')?.style.display === 'none',
    { timeout: 8000 }
  ).catch(() => {});
  await page.waitForTimeout(400);
  return { ctx, page };
}

async function nav(page, view) {
  await page.evaluate(v => { const it=document.querySelector(`.nav-item[data-view="${v}"]`); const g=it&&it.closest('.nav-group'); if(g)g.classList.add('open'); }, view);
  await page.locator(`.nav-item[data-view="${view}"]`).click();
  await page.waitForTimeout(400);
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  verify_import_rbac — Import button RBAC (Admin/Teamlead only)');
  console.log('══════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  /* ════════════════════════════
     Role: User — buttons must be HIDDEN
  ════════════════════════════ */
  console.log('[User role]');
  {
    const { ctx, page } = await setupPage(browser, 'User');

    await nav(page, 'tasks');
    const taskImportBtn = page.locator('#view-tasks button.lead-only:has-text("Import")');
    const taskImportBtnVisible = await taskImportBtn.isVisible().catch(() => false);
    ok('Task Import button HIDDEN for User', !taskImportBtnVisible);

    // Verify body[data-role] is set correctly
    const bodyRole = await page.evaluate(() => document.body.dataset.role);
    ok('body[data-role] = "User"', bodyRole === 'User');

    // Verify canImport() returns false for User
    const canImp = await page.evaluate(() => typeof canImport === 'function' ? canImport() : 'fn-missing');
    ok('canImport() = false for User', canImp === false);

    await nav(page, 'case-pipeline');
    const caseImportBtn = page.locator('#view-case-pipeline button.lead-only:has-text("Import")');
    const caseImportBtnVisible = await caseImportBtn.isVisible().catch(() => false);
    ok('Case Import button HIDDEN for User', !caseImportBtnVisible);

    // JS guard: simulate calling importCasesFromExcel directly — should show error toast
    const toastMsg = await page.evaluate(async () => {
      return new Promise(resolve => {
        const orig = window.toast;
        window.toast = (msg, type) => { window.toast = orig; resolve({ msg, type }); };
        importCasesFromExcel(new File(['x'], 'test.xlsx'));
      });
    });
    ok('JS guard: importCasesFromExcel shows error toast for User', toastMsg.type === 'error');
    ok('JS guard: error message mentions permission', toastMsg.msg.includes('quyền'));

    // JS guard: simulate calling handleImport directly
    const toastMsg2 = await page.evaluate(async () => {
      return new Promise(resolve => {
        const orig = window.toast;
        window.toast = (msg, type) => { window.toast = orig; resolve({ msg, type }); };
        const fakeEvent = { target: { files: [new File(['x'], 'test.xlsx')], value: '' } };
        handleImport(fakeEvent);
      });
    });
    ok('JS guard: handleImport shows error toast for User', toastMsg2.type === 'error');

    await ctx.close();
  }

  /* ════════════════════════════
     Role: Teamlead — buttons must be VISIBLE
  ════════════════════════════ */
  console.log('\n[Teamlead role]');
  {
    const { ctx, page } = await setupPage(browser, 'Teamlead');

    await nav(page, 'tasks');
    const bodyRole = await page.evaluate(() => document.body.dataset.role);
    ok('body[data-role] = "Teamlead"', bodyRole === 'Teamlead');

    const canImp = await page.evaluate(() => typeof canImport === 'function' ? canImport() : false);
    ok('canImport() = true for Teamlead', canImp === true);

    const taskImportBtnVisible = await page.locator('#view-tasks button.lead-only').first().isVisible().catch(() => false);
    ok('Task Import button VISIBLE for Teamlead', taskImportBtnVisible);

    await nav(page, 'case-pipeline');
    const caseImportBtnVisible = await page.locator('#view-case-pipeline button.lead-only').first().isVisible().catch(() => false);
    ok('Case Import button VISIBLE for Teamlead', caseImportBtnVisible);

    await ctx.close();
  }

  /* ════════════════════════════
     Role: Admin — buttons must be VISIBLE
  ════════════════════════════ */
  console.log('\n[Admin role]');
  {
    const { ctx, page } = await setupPage(browser, 'Admin');

    await nav(page, 'tasks');
    const bodyRole = await page.evaluate(() => document.body.dataset.role);
    ok('body[data-role] = "Admin"', bodyRole === 'Admin');

    const canImp = await page.evaluate(() => typeof canImport === 'function' ? canImport() : false);
    ok('canImport() = true for Admin', canImp === true);

    const taskImportBtnVisible = await page.locator('#view-tasks button.lead-only').first().isVisible().catch(() => false);
    ok('Task Import button VISIBLE for Admin', taskImportBtnVisible);

    await nav(page, 'case-pipeline');
    const caseImportBtnVisible = await page.locator('#view-case-pipeline button.lead-only').first().isVisible().catch(() => false);
    ok('Case Import button VISIBLE for Admin', caseImportBtnVisible);

    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`  verify_import_rbac: ${pass}/${pass + fail} PASS${fail > 0 ? ` (${fail} FAIL)` : ''}`);
  console.log(`${'─'.repeat(52)}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
