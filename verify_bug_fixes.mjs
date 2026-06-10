/**
 * verify_bug_fixes.mjs
 * Bug 1: fInit không còn chứa milestones
 * Bug 2: fId readonly + auto-gen khi đổi initiative (ADD & EDIT) + nút Tạo lại
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3030';
const PASS = msg => console.log('✅', msg);
const FAIL = msg => { console.error('❌', msg); process.exitCode = 1; };
const INFO = msg => console.log('   ', msg);

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
const jsErrors = [];
page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
page.on('pageerror', e => jsErrors.push(e.message));

const TEST_TASKS = [
  { id:'INI-001-001', name:'Task A', initiative:'INI-001', milestone:'INI-001-M1',
    team:'Số', picRes:'TuanTT4', picAcc:'TuanTT4', picSupport:'', startDate:'2026-01-01',
    endDate:'2026-03-31', progress:50, state:'Đang thực hiện', status:'Green', type:'Task',
    category:'AI/Năng suất', crossTeam:'N', highlight:'N', tuanBC:'', teamPhoiHop:'',
    result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'' },
  { id:'INI-002-001', name:'Task B', initiative:'INI-002', milestone:'INI-002-M1',
    team:'Số', picRes:'MaiTTT', picAcc:'MaiTTT', picSupport:'', startDate:'2026-01-01',
    endDate:'2026-06-30', progress:30, state:'Đang thực hiện', status:'Green', type:'Task',
    category:'Sản phẩm', crossTeam:'N', highlight:'N', tuanBC:'', teamPhoiHop:'',
    result:'', nextPlan:'', vuongMac:'', canBLD:'N', noiDungBLD:'' },
];

const TEST_INITIATIVES = [
  { id:'INI-001', name:'Chuyển đổi số', parentId:null, type:'initiative',
    category:'AI/Năng suất', accountable:'TuanTT', startDate:'2026-01-01',
    deadline:'2026-12-31', pct:50, status:'Active',
    milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
  { id:'INI-002', name:'Phát triển sản phẩm', parentId:null, type:'initiative',
    category:'Sản phẩm', accountable:'MaiTTT', startDate:'2026-01-01',
    deadline:'2026-12-31', pct:30, status:'Active',
    milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
  // Milestones — phải BỊ LOẠI khỏi fInit
  { id:'INI-001-M1', name:'↳ Giai đoạn 1', parentId:'INI-001', type:'milestone',
    category:'', accountable:'TuanTT', startDate:'2026-01-01',
    deadline:'2026-06-30', pct:80, status:'Active',
    milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
  { id:'INI-001-M2', name:'↳ Giai đoạn 2', parentId:'INI-001', type:'milestone',
    category:'', accountable:'TuanTT', startDate:'2026-07-01',
    deadline:'2026-12-31', pct:20, status:'Active',
    milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
  { id:'INI-002-M1', name:'↳ Milestone A', parentId:'INI-002', type:'milestone',
    category:'', accountable:'MaiTTT', startDate:'2026-01-01',
    deadline:'2026-06-30', pct:40, status:'Active',
    milestoneTracking:'', milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
];

/* ── Step 1: load page, inject localStorage ── */
await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');

await page.evaluate((data) => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'test-token',
    user: { username: 'admin', displayName: 'Admin Test', role: 'Admin', team: 'Số' },
    exp: Date.now() + 3600000
  }));
  localStorage.setItem('shtd_v2', JSON.stringify({
    tasks: data.tasks,
    initiatives: data.initiatives,
    kpi: [],
    _serverTs: null,
  }));
}, { tasks: TEST_TASKS, initiatives: TEST_INITIATIVES });

/* ── Step 2: reload ── */
await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1200);

/* ── Step 3: check login state, inject live if needed ── */
const loginVisible = await page.$eval('#loginOverlay',
  el => !el.classList.contains('hidden') && el.style.display !== 'none'
).catch(() => false);

INFO(`login visible: ${loginVisible}`);

if (loginVisible) {
  INFO('Login overlay vẫn hiện — inject db trực tiếp vào runtime');
  await page.evaluate((data) => {
    window.GS_WEBAPP_URL = '';
    db.tasks        = data.tasks;
    db.initiatives  = data.initiatives;
    db.kpi          = [];
    document.body.dataset.role = 'Admin';
    if (typeof updateFilterDropdowns === 'function') updateFilterDropdowns();
    if (typeof hideLoginScreen === 'function') hideLoginScreen();
    if (typeof navigateTo === 'function') navigateTo('tasks');
  }, { tasks: TEST_TASKS, initiatives: TEST_INITIATIVES });
} else {
  await page.evaluate(() => {
    window.GS_WEBAPP_URL = '';
    if (typeof navigateTo === 'function') navigateTo('tasks');
  });
}
await page.waitForTimeout(400);

/* ══════════════════════════════════════════════════════════
   BUG 1 — Initiative dropdown không chứa milestones
   ══════════════════════════════════════════════════════════ */

// Mở modal ADD
await page.evaluate(() => openTaskModal());
await page.waitForTimeout(300);

const fInitOptions = await page.$$eval('#fInit option', opts => opts.map(o => o.value));
INFO(`fInit options: ${fInitOptions.join(', ')}`);

const msInFInit = fInitOptions.filter(v => /-M\d+$/.test(v));
if (msInFInit.length === 0) PASS('Bug1: fInit không chứa milestones');
else FAIL(`Bug1: fInit vẫn chứa milestones: ${msInFInit.join(', ')}`);

if (fInitOptions.includes('INI-001') && fInitOptions.includes('INI-002'))
  PASS('Bug1: fInit có đủ 2 parent initiatives (INI-001, INI-002)');
else FAIL(`Bug1: fInit thiếu parent initiatives — có: ${fInitOptions.join(', ')}`);

// filterInit cũng không chứa milestone
const filterInitOpts = await page.$$eval('#filterInit option', opts => opts.map(o => o.value));
const msInFilter = filterInitOpts.filter(v => /-M\d+$/.test(v));
if (msInFilter.length === 0) PASS('Bug1: filterInit không chứa milestones');
else FAIL(`Bug1: filterInit vẫn chứa milestones: ${msInFilter.join(', ')}`);

/* ══════════════════════════════════════════════════════════
   BUG 2a — fId là readonly, nút Tạo lại tồn tại
   ══════════════════════════════════════════════════════════ */

const isReadonly = await page.$eval('#fId', el => el.readOnly);
if (isReadonly) PASS('Bug2: fId là readonly');
else FAIL('Bug2: fId vẫn editable');

const hasRegenBtn = (await page.$('button[onclick="autoGenId()"]')) !== null;
if (hasRegenBtn) PASS('Bug2: Nút "Tạo lại mã" tồn tại');
else FAIL('Bug2: Không tìm thấy nút "Tạo lại mã"');

/* ══════════════════════════════════════════════════════════
   BUG 2b — ADD mode: ID auto-gen khi mở modal
   ══════════════════════════════════════════════════════════ */

const idOnOpen = await page.$eval('#fId', el => el.value);
if (idOnOpen) PASS(`Bug2 ADD: ID được gen khi mở modal: "${idOnOpen}"`);
else FAIL('Bug2 ADD: fId trống khi mở modal');

/* ══════════════════════════════════════════════════════════
   BUG 2c — ADD mode: ID tự đổi khi chọn initiative
   ══════════════════════════════════════════════════════════ */

await page.evaluate(() => {
  document.getElementById('fInit').value = 'INI-001';
  document.getElementById('fInit').dispatchEvent(new Event('change'));
});
await page.waitForTimeout(200);

const idAfterIni001 = await page.$eval('#fId', el => el.value);
if (idAfterIni001.startsWith('INI-001-'))
  PASS(`Bug2 ADD: ID cập nhật theo INI-001 → "${idAfterIni001}"`);
else
  FAIL(`Bug2 ADD: ID không cập nhật theo INI-001, giá trị: "${idAfterIni001}"`);

await page.evaluate(() => {
  document.getElementById('fInit').value = 'INI-002';
  document.getElementById('fInit').dispatchEvent(new Event('change'));
});
await page.waitForTimeout(200);

const idAfterIni002 = await page.$eval('#fId', el => el.value);
if (idAfterIni002.startsWith('INI-002-'))
  PASS(`Bug2 ADD: ID cập nhật theo INI-002 → "${idAfterIni002}"`);
else
  FAIL(`Bug2 ADD: ID không cập nhật theo INI-002, giá trị: "${idAfterIni002}"`);

/* ══════════════════════════════════════════════════════════
   BUG 2d — fMs chỉ chứa milestones của initiative đang chọn
   ══════════════════════════════════════════════════════════ */

const msOptions = await page.$$eval('#fMs option', opts =>
  opts.map(o => o.value).filter(v => v)
);
INFO(`fMs options sau khi chọn INI-002: ${msOptions.join(', ')}`);

const hasIni002Ms = msOptions.some(v => v.startsWith('INI-002'));
const noOtherMs  = !msOptions.some(v => v.startsWith('INI-001'));
if (hasIni002Ms && noOtherMs)
  PASS(`Bug2: fMs chỉ chứa milestones của INI-002`);
else
  FAIL(`Bug2: fMs options sai — có: ${msOptions.join(', ')}`);

/* ══════════════════════════════════════════════════════════
   BUG 2e — Nút "Tạo lại mã" hoạt động (via evaluate)
   ══════════════════════════════════════════════════════════ */

// Chọn INI-001 → ID = INI-001-xxx
await page.evaluate(() => {
  document.getElementById('fInit').value = 'INI-001';
  document.getElementById('fInit').dispatchEvent(new Event('change'));
});
await page.waitForTimeout(200);

// Click "Tạo lại" via evaluate (tránh bị overlay chặn)
await page.evaluate(() => autoGenId());
await page.waitForTimeout(150);

const idAfterRegen = await page.$eval('#fId', el => el.value);
if (idAfterRegen.startsWith('INI-001-'))
  PASS(`Bug2: Nút "Tạo lại mã" gen đúng ID: "${idAfterRegen}"`);
else
  FAIL(`Bug2: Nút "Tạo lại mã" gen sai ID: "${idAfterRegen}"`);

/* ══════════════════════════════════════════════════════════
   BUG 2f — EDIT mode: ID tự update khi đổi initiative
             origId giữ nguyên để handleSubmit lookup đúng
   ══════════════════════════════════════════════════════════ */

await page.evaluate(() => closeTaskModal());
await page.waitForTimeout(200);

await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'INI-001-001');
  openTaskModal(t);
});
await page.waitForTimeout(300);

const origIdVal    = await page.$eval('#origId', el => el.value);
const editIdOnOpen = await page.$eval('#fId',    el => el.value);

if (origIdVal === 'INI-001-001' && editIdOnOpen === 'INI-001-001')
  PASS(`Bug2 EDIT: Modal mở đúng ID gốc "${editIdOnOpen}"`);
else
  FAIL(`Bug2 EDIT: origId="${origIdVal}", fId="${editIdOnOpen}" — kỳ vọng INI-001-001`);

// Đổi initiative → ID phải tự cập nhật
await page.evaluate(() => {
  document.getElementById('fInit').value = 'INI-002';
  document.getElementById('fInit').dispatchEvent(new Event('change'));
});
await page.waitForTimeout(200);

const editIdAfterChange = await page.$eval('#fId', el => el.value);
if (editIdAfterChange.startsWith('INI-002-'))
  PASS(`Bug2 EDIT: ID tự update khi đổi initiative → "${editIdAfterChange}"`);
else
  FAIL(`Bug2 EDIT: ID không update khi đổi initiative, vẫn là "${editIdAfterChange}"`);

// origId phải giữ nguyên để handleSubmit biết xóa record cũ
const origIdAfterChange = await page.$eval('#origId', el => el.value);
if (origIdAfterChange === 'INI-001-001')
  PASS('Bug2 EDIT: origId vẫn giữ "INI-001-001" — handleSubmit sẽ lookup đúng');
else
  FAIL(`Bug2 EDIT: origId bị thay đổi thành "${origIdAfterChange}" — sẽ gây data corruption`);

/* ══════════════════════════════════════════════════════════
   JS errors
   ══════════════════════════════════════════════════════════ */

if (jsErrors.length === 0) PASS('Không có JS errors');
else FAIL(`JS errors:\n  ${jsErrors.join('\n  ')}`);

await browser.close();
console.log('\n=== DONE ===');
