/**
 * verify_filter_cascade.mjs
 * Test: Task filter PIC cascade + Case Pipeline PIC/DVKD filter + DVKD column
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

const AUTH = {
  token: 'local-test-token',
  user: { username: 'TuanTT4', displayName: 'Trần Tuấn', role: 'Admin', team: 'Số' },
  exp: Date.now() + 3600 * 1000,
};

// Use 'PTKD MB' (with space) to match the hardcoded filterTeam dropdown options
const TASKS = [
  { id: 'S-001', name: 'Task A', type: 'Task', category: 'Dashboard/BC',
    initiative: '', team: 'Số', picAcc: 'TuanTT4', picRes: 'TuanTT4',
    status: 'Green', state: 'Đang thực hiện', deadline: '2026-12-31', progress: 50,
    canBLD: 'N', yKienBLD: '', noiDungBLD: '' },
  { id: 'P-001', name: 'Task B', type: 'Task', category: 'Bán hàng',
    initiative: '', team: 'PTKD MB', picAcc: 'HungNV', picRes: 'HungNV',
    status: 'Green', state: 'Chưa bắt đầu', deadline: '2026-12-31', progress: 0,
    canBLD: 'N', yKienBLD: '', noiDungBLD: '' },
];

const CASES = [
  { id: 'CP-001', tuanBC: 'Tuần 22/2026', team: 'PTKD MB', pic: 'HungNV',
    dvkd: 'HDG', caseName: 'Wego Việt Nam', loaiHinh: 'Món', complexity: 'Cao',
    phuongAn: 'Tài trợ', giaTriTy: 220, stage: 'Đang phân tích',
    vuongMac: '', nextStep: '', startDate: '2026-05-01', deadline: '2026-07-31',
    rag: 'Đỏ', canBLD: 'Y', highlight: 'N', ghiChu: '', yKienBLD: '' },
  { id: 'CP-002', tuanBC: 'Tuần 23/2026', team: 'Số', pic: 'TuanTT4',
    dvkd: 'SHB', caseName: 'ABC Corp', loaiHinh: 'Dự án', complexity: 'Trung bình',
    phuongAn: 'Cho vay', giaTriTy: 85, stage: 'Tiếp nhận',
    vuongMac: '', nextStep: '', startDate: '2026-05-15', deadline: '2026-08-30',
    rag: 'Vàng', canBLD: 'N', highlight: 'Y', ghiChu: '', yKienBLD: '' },
];

// Fake user list — Team names match TEAM_LIST in constants.js ('PTKD MB' with space)
const APP_USERS = [
  { Username: 'TuanTT4', Display_Name: 'Trần Tuấn', Role: 'Admin', Team: 'Số',     Active: 'true' },
  { Username: 'AnhDT',   Display_Name: 'Đặng Tuấn Anh', Role: 'User', Team: 'Số',   Active: 'true' },
  { Username: 'HungNV',  Display_Name: 'Nguyễn Văn Hùng', Role: 'User', Team: 'PTKD MB', Active: 'true' },
  { Username: 'LinhNT',  Display_Name: 'Nguyễn Thị Linh', Role: 'User', Team: 'PTKD MB', Active: 'true' },
];

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log(`✅ ${label}`); pass++; }
  else       { console.error(`❌ ${label}`); fail++; }
}

async function loadWithData(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ auth, tasks, cases, users }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify(auth));
    const db = JSON.parse(localStorage.getItem('shtd_v2') || '{}');
    db.tasks = tasks;
    db.cases = cases;
    localStorage.setItem('shtd_v2', JSON.stringify(db));
    // Inject _appUsers into the page global after reload via window.__testUsers
    window.__testUsers = users;
  }, { auth: AUTH, tasks: TASKS, cases: CASES, users: APP_USERS });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.getElementById('loginOverlay')?.style.display
    || document.getElementById('loginOverlay')?.style.display === 'none', { timeout: 8000 }).catch(() => {});
  // Inject _appUsers directly into page context
  await page.evaluate((users) => {
    if (typeof _appUsers !== 'undefined') {
      _appUsers.length = 0;
      users.forEach(u => _appUsers.push(u));
    }
  }, APP_USERS);
  await page.waitForTimeout(400);
}

async function nav(page, view) {
  await page.locator(`.nav-item[data-view="${view}"]`).click();
  await page.waitForTimeout(500);
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  verify_filter_cascade — Task PIC cascade + Case DVKD/PIC');
  console.log('══════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/script.google.com/**', r => r.abort());
  await ctx.route('**/macros/**', r => r.abort());
  const page = await ctx.newPage();

  page.on('console', m => { if (m.type() === 'error') console.error('  [JS ERR]', m.text()); });

  await loadWithData(page);

  /* ════════════════════════════════════
     BLOCK 1: TASK filter cascade
  ════════════════════════════════════ */
  await nav(page, 'tasks');

  // T1: filterPic exists
  const picSelTask = page.locator('#filterPic');
  ok('T1: #filterPic exists in Task view', await picSelTask.count() > 0);

  // T2: filterPic is populated on render (should have options from tasks data or _appUsers)
  const taskPicOpts = await picSelTask.locator('option').count();
  ok('T2: filterPic has ≥2 options (Tất cả + at least 1 user)', taskPicOpts >= 2);

  // T3: Select team "Số" → filterPic repopulates only Số users
  await page.selectOption('#filterTeam', 'Số');
  await page.waitForTimeout(300);
  const picAfterTeamSo = await page.evaluate(() => {
    const sel = document.getElementById('filterPic');
    return [...sel.options].map(o => o.value).filter(v => v !== '');
  });
  // With _appUsers injected: Số team has TuanTT4 and AnhDT
  ok('T3: After selecting Team=Số, filterPic shows ≥1 user', picAfterTeamSo.length >= 1);

  // T4: Users from other team not in filterPic when Số selected
  const soHasHung = picAfterTeamSo.includes('HungNV');
  ok('T4: HungNV (PTKDMB) NOT in filterPic when Team=Số', !soHasHung);

  // T5: Select team "PTKDMB" → filterPic resets selection and shows PTKDMB users
  await page.selectOption('#filterTeam', 'PTKD MB');
  await page.waitForTimeout(300);
  const picAfterPTKDMB = await page.evaluate(() => {
    const sel = document.getElementById('filterPic');
    return [...sel.options].map(o => o.value).filter(v => v !== '');
  });
  const ptkdmbHasHung = picAfterPTKDMB.includes('HungNV');
  ok('T5: After selecting Team=PTKDMB, HungNV appears in filterPic', ptkdmbHasHung);

  // T6: PIC filter selected value was reset on team change
  const picVal = await page.evaluate(() => document.getElementById('filterPic')?.value);
  ok('T6: filterPic value reset to "" when team changed', picVal === '');

  // T7: Clear team → filterPic repopulates all users
  await page.selectOption('#filterTeam', '');
  await page.waitForTimeout(300);
  const picAfterClear = await page.evaluate(() => {
    const sel = document.getElementById('filterPic');
    return [...sel.options].map(o => o.value).filter(v => v !== '');
  });
  ok('T7: After clearing Team, filterPic shows all users (≥2)', picAfterClear.length >= 2);

  // T8: Filter by PIC=TuanTT4 → only S-001 shows (picRes=TuanTT4)
  await page.selectOption('#filterPic', 'TuanTT4');
  await page.waitForTimeout(300);
  const rowsAfterPicFilter = await page.locator('#taskTbody tr').count();
  ok('T8: Filtering PIC=TuanTT4 → 1 row (S-001)', rowsAfterPicFilter === 1);

  // T9: clearFilters resets PIC dropdown to full list
  await page.click('button[onclick="clearFilters()"]');
  await page.waitForTimeout(300);
  const picAfterClearFilters = await page.evaluate(() => {
    const sel = document.getElementById('filterPic');
    return { value: sel?.value, optCount: sel?.options.length };
  });
  ok('T9: clearFilters() resets filterPic value to ""', picAfterClearFilters.value === '');

  /* ════════════════════════════════════
     BLOCK 2: CASE PIPELINE filter + DVKD column
  ════════════════════════════════════ */
  await nav(page, 'case-pipeline');

  // Re-inject _appUsers (may have been reset)
  await page.evaluate((users) => {
    if (typeof _appUsers !== 'undefined') {
      _appUsers.length = 0;
      users.forEach(u => _appUsers.push(u));
    }
  }, APP_USERS);
  await page.waitForTimeout(300);

  // C1: cpFilterPic exists
  ok('C1: #cpFilterPic exists', await page.locator('#cpFilterPic').count() > 0);

  // C2: cpFilterDvkd exists
  ok('C2: #cpFilterDvkd exists', await page.locator('#cpFilterDvkd').count() > 0);

  // C3: DVKD column header in table
  const dvkdHeader = await page.locator('#cpTable thead th').allTextContents();
  const hasDvkd = dvkdHeader.some(h => h.includes('ĐVKD'));
  ok('C3: DVKD column header present in Case table', hasDvkd);

  // C4: DVKD filter populated from data (HDG, SHB)
  const dvkdOpts = await page.evaluate(() => {
    const sel = document.getElementById('cpFilterDvkd');
    return [...(sel?.options || [])].map(o => o.value).filter(v => v !== '');
  });
  ok('C4: cpFilterDvkd has ≥1 DVKD option from data', dvkdOpts.length >= 1);

  // C5: DVKD column shows data in table rows
  const dvkdCellText = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#cpTbody tr')];
    // DVKD is column index 5 (0-based: ID=0,Case=1,Stage=2,Team=3,PIC=4,DVKD=5)
    return rows.map(r => r.cells[5]?.textContent?.trim()).filter(Boolean);
  });
  ok('C5: DVKD data appears in table cells (HDG or SHB)', dvkdCellText.some(v => v === 'HDG' || v === 'SHB'));

  // C6: Filter by DVKD=HDG → only CP-001 shows
  await page.selectOption('#cpFilterDvkd', 'HDG');
  await page.waitForTimeout(300);
  const cpRowsAfterDvkd = await page.locator('#cpTbody tr').count();
  ok('C6: Filter DVKD=HDG → 1 row (CP-001)', cpRowsAfterDvkd === 1);

  // C7: Filter chip appears for DVKD
  const chips = await page.locator('#cpFilterChips .chip').allTextContents();
  ok('C7: Filter chip shows "ĐVKD: HDG"', chips.some(c => c.includes('ĐVKD') && c.includes('HDG')));

  // C8: Clear DVKD chip → back to 2 rows
  await page.locator('#cpFilterChips .chip-x').first().click();
  await page.waitForTimeout(300);
  const cpRowsAfterClear = await page.locator('#cpTbody tr').count();
  ok('C8: After clearing DVKD chip → 2 rows again', cpRowsAfterClear === 2);

  // C9: PIC filter — cpFilterPic populated on page load
  const cpPicOpts = await page.evaluate(() => {
    const sel = document.getElementById('cpFilterPic');
    return [...(sel?.options || [])].map(o => o.value).filter(v => v !== '');
  });
  ok('C9: cpFilterPic has ≥1 user option', cpPicOpts.length >= 1);

  // C10: Team cascade for Case: select Team=PTKDMB → cpFilterPic shows HungNV
  await page.selectOption('#cpFilterTeam', 'PTKD MB');
  await page.waitForTimeout(300);
  const cpPicAfterTeam = await page.evaluate(() => {
    const sel = document.getElementById('cpFilterPic');
    return [...(sel?.options || [])].map(o => o.value).filter(v => v !== '');
  });
  ok('C10: After Team=PTKDMB, HungNV appears in cpFilterPic', cpPicAfterTeam.includes('HungNV'));
  ok('C10b: TuanTT4 (Số team) NOT in cpFilterPic when PTKDMB selected', !cpPicAfterTeam.includes('TuanTT4'));

  // C11: Filter CP by PIC=HungNV → 1 row (CP-001)
  await page.selectOption('#cpFilterPic', 'HungNV');
  await page.waitForTimeout(300);
  const cpRowsHung = await page.locator('#cpTbody tr').count();
  ok('C11: Filter PIC=HungNV (PTKDMB) → 1 row (CP-001)', cpRowsHung === 1);

  // C12: clearCpFilters resets all
  await page.click('button[onclick="clearCpFilters()"]');
  await page.waitForTimeout(300);
  const cpRowsAll = await page.locator('#cpTbody tr').count();
  ok('C12: clearCpFilters() → all 2 rows visible again', cpRowsAll === 2);

  // C13: PIC chip visible when filtering
  await page.selectOption('#cpFilterPic', 'TuanTT4');
  await page.waitForTimeout(300);
  const cpChipsPic = await page.locator('#cpFilterChips .chip').allTextContents();
  ok('C13: PIC filter chip shows "PIC: TuanTT4"', cpChipsPic.some(c => c.includes('PIC') && c.includes('TuanTT4')));

  await ctx.close();
  await browser.close();
  server.close();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  verify_filter_cascade: ${pass}/${pass + fail} PASS${fail > 0 ? ` (${fail} FAIL)` : ''}`);
  console.log(`${'─'.repeat(50)}\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
