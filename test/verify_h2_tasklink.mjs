/**
 * verify_h2_tasklink.mjs — CR: liên kết Task ↔ Milestone qua popup chọn task
 *
 *  TL1  – Structure: picker overlay + filters (search/init/status/overdue/list)
 *  TL2  – Lead thấy nút "+ Task" trên mọi milestone; chip TaskRef hiện sẵn
 *  TL3  – openH2TaskPicker → overlay visible; CHỈ hiện task owner (picAcc==owner)
 *  TL4  – Search theo mã lọc đúng
 *  TL5  – Droplist Initiative lọc đúng
 *  TL6  – Checkbox "Quá hạn" chỉ còn task overdue (chưa hoàn thành)
 *  TL7  – Chọn nhiều task + Lưu → TaskRef nhiều mã; chip multi; overlay đóng
 *  TL8  – Bấm task trong popup → mở taskViewOverlay (chi tiết common)
 *  TL9  – Bỏ liên kết 1 chip → TaskRef bớt mã tương ứng
 *  TL10 – _gasH2TaskLink gọi action 'h2-milestone-tasklink' + payload đúng
 *  TL11 – RBAC member: owner (User) thấy "+ Task" mốc mình; KHÔNG thấy mốc người khác
 *  TLX  – No JS errors
 *
 * Run: node verify_h2_tasklink.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3081;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'h2_tasklink');
if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[path.extname(fp)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime }); res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let passed = 0, failed = 0;
function log(id, ok, msg) { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); if (ok) passed++; else failed++; }
const shot = (page, n) => page.screenshot({ path: path.join(EVD_DIR, `${n}.png`), fullPage: false });

const future = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
const past   = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);

const H2MOCK = {
  config: [{ Key: 'max_p1', Value: '3' }, { Key: 'max_objectives', Value: '5' }, { Key: 'rag_amber_pct', Value: '20' }],
  objectives: [
    { ID: 'OBJ-26-001', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'Số hóa BLOL', Why: '', Owner: 'QuangNN3', Priority: 'P1', Weight: '100', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-002', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'GNOL E2E', Why: '', Owner: 'DungLQ1', Priority: 'P1', Weight: '100', Category: 'B', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'DungLQ1' },
  ],
  kpis: [
    { ID: 'KPI-26-001', ObjectiveID: 'OBJ-26-001', KpiName: '2 nghiệp vụ go-live', KpiType: 'A', Baseline: '', Target: '2/2', Unit: 'nghiệp vụ', Weight: '100', Deadline: future, Status: 'Đang thực hiện', Evidence: '', Owner: 'QuangNN3' },
    { ID: 'KPI-26-002', ObjectiveID: 'OBJ-26-002', KpiName: 'Go-live GĐ2', KpiType: 'B', Baseline: '', Target: '1', Unit: 'lần', Weight: '100', Deadline: future, Status: 'Đang thực hiện', Evidence: '', Owner: 'DungLQ1' },
  ],
  milestones: [
    { ID: 'MS-26-001', KpiID: 'KPI-26-001', Month: 'T10', Quarter: 'Q4', MilestoneName: '2 nghiệp vụ go-live', DueDate: future, Owner: 'QuangNN3', Status: 'Đang thực hiện', RAG: 'AMBER', TaskRef: 'SO-26-101' },
    { ID: 'MS-26-002', KpiID: 'KPI-26-002', Month: 'T10', Quarter: 'Q4', MilestoneName: 'UAT GĐ2', DueDate: future, Owner: 'DungLQ1', Status: 'Đang thực hiện', RAG: '', TaskRef: '' },
  ],
  tracking: [], risks: [], deps: [], reviews: []
};

// db.tasks (owner=QuangNN3 phụ trách = picRes HOẶC picAcc):
//   101-104 Quang (Res+Acc) · 105 Quang chỉ Responsible (picAcc=Dung) → PHẢI hiện
//   106 Quang chỉ Support → KHÔNG hiện · 200 của Dung → KHÔNG hiện
const TASKS = [
  { id: 'SO-26-101', name: 'Viết BRD giải toả tạm ứng', picAcc: 'QuangNN3', picRes: 'QuangNN3', picSupport: '', team: 'Số', initiative: 'INIT-BLOL', state: 'Đang thực hiện', deadline: future },
  { id: 'SO-26-102', name: 'UAT nghiệp vụ hồ sơ',       picAcc: 'QuangNN3', picRes: 'QuangNN3', picSupport: '', team: 'Số', initiative: 'INIT-BLOL', state: 'Chưa bắt đầu', deadline: past },
  { id: 'SO-26-103', name: 'Nghiên cứu AI thư BL',      picAcc: 'QuangNN3', picRes: 'QuangNN3', picSupport: '', team: 'Số', initiative: 'INIT-AI',   state: 'Đang thực hiện', deadline: future },
  { id: 'SO-26-104', name: 'Task đã hoàn thành',        picAcc: 'QuangNN3', picRes: 'QuangNN3', picSupport: '', team: 'Số', initiative: 'INIT-AI',   state: 'Hoàn thành', deadline: past },
  { id: 'SO-26-105', name: 'Task Quang chỉ thực hiện',  picAcc: 'DungLQ1',  picRes: 'QuangNN3', picSupport: '', team: 'Số', initiative: 'INIT-BLOL', state: 'Đang thực hiện', deadline: future },
  { id: 'SO-26-106', name: 'Task Quang chỉ hỗ trợ',     picAcc: 'DungLQ1',  picRes: 'DungLQ1',  picSupport: 'QuangNN3', team: 'Số', initiative: 'INIT-GNOL', state: 'Đang thực hiện', deadline: future },
  { id: 'SO-26-107', name: 'Task PIC lưu tên hiển thị', picAcc: 'DungLQ1',  picRes: 'Quang NN3', picSupport: '', team: 'Số', initiative: 'INIT-BLOL', state: 'Đang thực hiện', deadline: future },
  { id: 'SO-26-200', name: 'Task của Dung',             picAcc: 'DungLQ1',  picRes: 'DungLQ1',  picSupport: '', team: 'Số', initiative: 'INIT-GNOL', state: 'Đang thực hiện', deadline: future },
];

// User directory (User_Master): username ↔ tên hiển thị — để khớp PIC lưu dạng tên.
const USERS = [
  { Username: 'QuangNN3', Display_Name: 'Quang NN3', Role: 'User', Team: 'Số', Active: 'TRUE' },
  { Username: 'DungLQ1',  Display_Name: 'Dung LQ1',  Role: 'User', Team: 'Số', Active: 'TRUE' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.route('**://script.google.com/**', route => route.abort());

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(400);

async function loginAs(role, username) {
  await page.evaluate(({ mock, tasks, users, role, username }) => {
    window.readH2 = async () => {};
    window.__gas = [];
    window.gasPost = async (payload) => { window.__gas.push(payload); return { status: 'ok', id: payload.id }; };
    Object.assign(dbH2, { config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] });
    Object.assign(dbH2, JSON.parse(JSON.stringify(mock)));
    if (typeof db === 'undefined') { window.db = {}; }
    db.tasks = JSON.parse(JSON.stringify(tasks));
    try { _appUsers = JSON.parse(JSON.stringify(users)); } catch (e) {}
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000,
      user: { username, role, team: 'Số', displayName: username }
    }));
    const lo = document.getElementById('loginOverlay'); if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch (e) {}
    navigateTo('h2-tracker');
  }, { mock: H2MOCK, tasks: TASKS, users: USERS, role, username });
  await page.waitForTimeout(350);
}

await loginAs('Teamlead', 'TeamleadX');

/* TL1 — structure */
for (const [id, sel] of [['overlay', '#h2TaskPickerOverlay'], ['search', '#h2pkSearch'], ['init', '#h2pkInit'], ['status', '#h2pkStatus'], ['overdue', '#h2pkOverdue'], ['list', '#h2pkList']]) {
  log('TL1-' + id, !!(await page.$(sel)), `${sel} tồn tại`);
}

/* TL2 — lead: + Task trên mọi milestone (2) + chip TaskRef sẵn (SO-26-101) */
log('TL2-addbtn', (await page.$$('.h2-ms-addtask')).length === 2, `nút "+ Task" = ${(await page.$$('.h2-ms-addtask')).length} (expect 2)`);
log('TL2-chip', (await page.$$eval('.h2-tk-id', els => els.map(e => e.textContent))).some(t => t.includes('SO-26-101')), 'task SO-26-101 hiện trong bảng task của MS-26-001');
// CR2: bảng task đầy đủ thuộc tính (concept Theo dõi Initiative) — mã/tên/PIC/deadline
const tl2cols = await page.$$eval('.h2-ms-block', blocks => {
  const b = blocks.find(x => (x.querySelector('.h2-ms-name') || {}).textContent?.includes('2 nghiệp vụ'));
  if (!b) return null;
  const r = b.querySelector('.h2-tk-row');
  return r ? {
    hasId:   !!r.querySelector('.h2-tk-id'),
    hasName: !!r.querySelector('.init-task-name'),
    hasPic:  !!r.querySelector('.h2-tk-pic'),
    hasProg: !!r.querySelector('.prog-fill'),
    hasDl:   !!r.querySelector('.h2-tk-dl'),
  } : null;
});
log('TL2-table-attrs', tl2cols && tl2cols.hasId && tl2cols.hasName && tl2cols.hasPic && tl2cols.hasProg && tl2cols.hasDl,
  `bảng task có đủ Mã/Tên/PIC/%HT/Deadline [${JSON.stringify(tl2cols)}]`);
await shot(page, '01_tracker_chips');

/* TL3 — open picker → visible + chỉ task của owner QuangNN3 (4 task, không có SO-26-200) */
await page.evaluate(() => openH2TaskPicker('MS-26-001'));
await page.waitForTimeout(200);
log('TL3-visible', await page.$eval('#h2TaskPickerOverlay', el => el.style.display === 'flex'), 'picker overlay visible');
let ids = await page.$$eval('#h2pkList .h2pk-id', els => els.map(e => e.textContent));
log('TL3-scope', ids.length === 6 && !ids.includes('SO-26-200') && !ids.includes('SO-26-106'),
  `list=${ids.length} (expect 6, loại SO-26-200 & SO-26-106) → ${ids.join(',')}`);
log('TL3-res', ids.includes('SO-26-105'), 'task user chỉ Responsible (picRes) VẪN hiện (không cần là Accountable)');
log('TL3-dispname', ids.includes('SO-26-107'), 'task PIC lưu TÊN HIỂN THỊ vẫn khớp owner (username)');
log('TL3-nosupport', !ids.includes('SO-26-106'), 'task user chỉ Support KHÔNG hiện');
log('TL3-precheck', await page.$$eval('#h2pkList .h2pk-cb', els => els.filter(c => c.checked).length) === 1, 'SO-26-101 đã tick sẵn (đang liên kết)');
await shot(page, '02_picker_open');

/* TL4 — search theo mã */
await page.fill('#h2pkSearch', '103');
await page.waitForTimeout(150);
ids = await page.$$eval('#h2pkList .h2pk-id', els => els.map(e => e.textContent));
log('TL4-search', ids.length === 1 && ids[0] === 'SO-26-103', `search "103" → ${ids.join(',')}`);
await page.fill('#h2pkSearch', '');
await page.waitForTimeout(120);

/* TL5 — filter initiative */
await page.selectOption('#h2pkInit', 'INIT-AI');
await page.waitForTimeout(150);
ids = await page.$$eval('#h2pkList .h2pk-id', els => els.map(e => e.textContent));
log('TL5-init', ids.length === 2 && ids.includes('SO-26-103') && ids.includes('SO-26-104'), `INIT-AI → ${ids.join(',')} (expect 103,104)`);
await page.selectOption('#h2pkInit', '');
await page.waitForTimeout(120);

/* TL6 — overdue (chỉ 102: past & chưa xong; 104 past nhưng Hoàn thành → loại) */
await page.check('#h2pkOverdue');
await page.waitForTimeout(150);
ids = await page.$$eval('#h2pkList .h2pk-id', els => els.map(e => e.textContent));
log('TL6-overdue', ids.length === 1 && ids[0] === 'SO-26-102', `overdue → ${ids.join(',')} (expect SO-26-102)`);
await page.uncheck('#h2pkOverdue');
await page.waitForTimeout(120);

/* TL7 — chọn thêm 102 & 103, Lưu → TaskRef 3 mã, overlay đóng, chip multi */
await page.evaluate(() => { _h2PickerToggle('SO-26-102', true); _h2PickerToggle('SO-26-103', true); });
await page.evaluate(() => h2PickerSave());
await page.waitForTimeout(250);
const ref = await page.evaluate(() => _h2FindMs('MS-26-001').TaskRef);
log('TL7-ref', ['SO-26-101', 'SO-26-102', 'SO-26-103'].every(x => ref.includes(x)), `TaskRef="${ref}"`);
log('TL7-closed', await page.$eval('#h2TaskPickerOverlay', el => el.style.display === 'none'), 'overlay đóng sau lưu');
const chipCount = await page.$$eval('.h2-ms-block', blocks => {
  const b = blocks.find(x => (x.querySelector('.h2-ms-name') || {}).textContent?.includes('2 nghiệp vụ'));
  return b ? b.querySelectorAll('.h2-tk-row').length : 0;
});
log('TL7-chips', chipCount >= 3, `task rows trên MS-26-001 = ${chipCount} (expect ≥3)`);
await shot(page, '03_after_link');

/* TL8 — bấm task trong popup → mở taskViewOverlay (chi tiết common) */
await page.evaluate(() => openH2TaskPicker('MS-26-001'));
await page.waitForTimeout(150);
await page.evaluate(() => openTaskViewPopup('SO-26-103'));  // giả lập click .h2pk-open
await page.waitForTimeout(200);
log('TL8-detail', await page.$eval('#taskViewOverlay', el => el.style.display === 'flex'), 'taskViewOverlay (chi tiết common) mở');
log('TL8-title', (await page.$eval('#taskViewTitle', el => el.textContent)).includes('Nghiên cứu AI'), 'popup đúng task SO-26-103');
await page.evaluate(() => { closeTaskViewPopup(); closeH2TaskPicker(); });

/* TL9 — unlink 1 chip */
await page.evaluate(() => h2UnlinkTask('MS-26-001', 'SO-26-102'));
await page.waitForTimeout(200);
const ref2 = await page.evaluate(() => _h2FindMs('MS-26-001').TaskRef);
log('TL9-unlink', !ref2.includes('SO-26-102') && ref2.includes('SO-26-101'), `sau unlink TaskRef="${ref2}"`);

/* TL10 — action + payload gửi GAS */
const gasCalls = await page.evaluate(() => window.__gas.filter(p => p.action === 'h2-milestone-tasklink'));
log('TL10-action', gasCalls.length >= 2, `số call h2-milestone-tasklink = ${gasCalls.length} (save + unlink)`);
log('TL10-payload', gasCalls.every(c => c.id === 'MS-26-001' && typeof c.taskRef === 'string'), 'payload {id:MS-26-001, taskRef}');

/* TL11 — RBAC member: owner QuangNN3 thấy + Task mốc mình, KHÔNG thấy mốc Dung */
await loginAs('User', 'QuangNN3');
await page.waitForTimeout(200);
const addForOwner = await page.$$eval('.h2-ms-row', rows => rows.map(r => ({
  hasAdd: !!r.querySelector('.h2-ms-addtask'),
  name: (r.querySelector('.h2-ms-name') || {}).textContent || ''
})));
const msQuang = addForOwner.find(r => r.name.includes('2 nghiệp vụ'));
const msDung  = addForOwner.find(r => r.name.includes('UAT GĐ2'));
log('TL11-owner', !!msQuang && msQuang.hasAdd, 'member QuangNN3 thấy "+ Task" trên mốc của mình');
log('TL11-other', !!msDung && !msDung.hasAdd, 'member QuangNN3 KHÔNG thấy "+ Task" trên mốc của Dung');
await shot(page, '04_member_rbac');

/* TLX — no JS errors */
log('TLX-noerr', jsErrors.length === 0, jsErrors.length ? `JS errors: ${jsErrors.join(' | ')}` : 'no JS errors');

console.log(`\n${passed}/${passed + failed} checks passed`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
