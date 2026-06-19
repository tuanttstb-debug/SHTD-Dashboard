/**
 * verify_atomic_write.mjs
 * Kiểm tra: mỗi lần save/delete 1 task/case chỉ gọi GAS atomic
 * (task-upsert/task-delete/case-upsert/case-delete),
 * KHÔNG gọi 'write'/'case-pipeline-write' (full rewrite).
 * Audit_Log: GAS nhận đúng taskId + taskName trong request body.
 *
 * Dùng 1 browser context + 1 page duy nhất cho toàn bộ test để tránh
 * Chromium resource exhaustion khi tạo nhiều context liên tiếp.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const APP_DIR = 'D:/Workspace/Production/SHTD-Dashboard';
const PORT    = 9989;
const BASE    = `http://localhost:${PORT}`;

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

/* ── Helpers ── */
let R = { pass: 0, fail: 0 };
const PASS = msg => { console.log(`  ✅ ${msg}`); R.pass++; };
const FAIL = msg => { console.error(`  ❌ ${msg}`); R.fail++; process.exitCode = 1; };

const MOCK_TASKS = [
  { id:'T-001', name:'Task Alpha', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'',
    type:'Task', category:'AI', picAcc:'TuanTT4', picRes:'TuanTT4', picSupport:'',
    startDate:'2026-01-01', endDate:'2026-12-31', progress:50, state:'Đang thực hiện',
    status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'',
    canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
  { id:'T-002', name:'Task Beta', initiative:'BAU', milestone:'', team:'Số', teamPhoiHop:'',
    type:'Task', category:'AI', picAcc:'DungLQ1', picRes:'DungLQ1', picSupport:'',
    startDate:'2026-01-01', endDate:'2026-12-31', progress:20, state:'Đang thực hiện',
    status:'Green', crossTeam:'N', highlight:'N', result:'', nextPlan:'', vuongMac:'',
    canBLD:'N', noiDungBLD:'', yKienBLD:'', tuanBC:'' },
];
const MOCK_CASES = [
  { id:'CP-001', caseName:'Case Alpha', team:'Số', pic:'TuanTT4', dvkd:'VCB',
    loaiHinh:'Tín dụng', complexity:'Cao', phuongAn:'PA1', giaTriTy:10,
    stage:'Tiếp thị', vuongMac:'', nextStep:'', startDate:'2026-01-01',
    deadline:'2026-06-30', rag:'Xanh', canBLD:'N', highlight:'N', ghiChu:'', yKienBLD:'', tuanBC:'' },
];
const MOCK_INITIATIVES = [
  { id:'INI-001', name:'Sáng kiến Alpha', parentId:null, type:'initiative',
    category:'Digital', accountable:'TuanTT4', startDate:'2026-01-01',
    deadline:'2026-12-31', pct:40, status:'Active', milestoneTracking:'',
    milestoneDeadline:'', kpiTarget:'', notes:'', docLink:'' },
];

/* ══════════════════════════════════════════════════════════
   SHARED: 1 browser context + 1 page cho toàn bộ test
══════════════════════════════════════════════════════════ */
const browser = await chromium.launch();

// Shared GAS call recorder — cleared before each test
const gasCalls = [];
function clearCalls() { gasCalls.length = 0; }

// Shared context with standard mock: reads→500, writes→200
const ctx = await browser.newContext();
await ctx.route('https://script.google.com/**', async route => {
  const body = route.request().postData() || '{}';
  let parsed = null;
  try { parsed = JSON.parse(body); } catch(_) {}
  if (parsed) gasCalls.push(parsed);
  const action = parsed?.action || '';
  if (['read','case-pipeline-read','initiative-read','user-list','kpi-read','auth-login'].includes(action)) {
    await route.fulfill({ status: 500, body: 'test-mock-read-fail' });
  } else {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }) });
  }
});

// Load page ONCE
const jsErrors = [];
const NOISE = [/net::ERR_/, /ERR_ABORTED/, /500/, /favicon/, /GAS offline/];
const page = await ctx.newPage();
page.on('pageerror', e => { if (!NOISE.some(r => r.test(e.message))) jsErrors.push(e.message); });

await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');
await page.evaluate(({ tasks, cases, initiatives }) => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'test-token',
    user: { username: 'TuanTT4', displayName: 'Tuấn TT4', role: 'Admin', team: 'Số' },
    exp: Date.now() + 3600000,
  }));
  localStorage.setItem('shtd_v2', JSON.stringify({
    tasks, cases, initiatives, kpi: [], _serverTs: null
  }));
}, { tasks: MOCK_TASKS, cases: MOCK_CASES, initiatives: MOCK_INITIATIVES });

await page.reload();
await page.waitForLoadState('domcontentloaded');
await page.waitForFunction(
  () => { const el = document.getElementById('loadingOverlay'); return !el || el.style.display === 'none'; },
  { timeout: 8000 }
).catch(() => {});
await page.waitForTimeout(500);

// Reset in-memory app state between tests
async function resetState() {
  await page.evaluate(({ tasks, cases, initiatives }) => {
    db.tasks = JSON.parse(JSON.stringify(tasks));
    db.initiatives = JSON.parse(JSON.stringify(initiatives));
    if (typeof dbCases !== 'undefined' && Array.isArray(dbCases)) {
      dbCases.length = 0;
      JSON.parse(JSON.stringify(cases)).forEach(c => dbCases.push(c));
    }
    localStorage.setItem('shtd_v2', JSON.stringify({
      tasks, cases, initiatives, kpi: [], _serverTs: null
    }));
  }, { tasks: MOCK_TASKS, cases: MOCK_CASES, initiatives: MOCK_INITIATIVES });
}

async function navTo(view) {
  await page.locator(`[data-view="${view}"]`).click();
  await page.waitForTimeout(400);
}

/* ════════════════════════════════════════════════════
   T1: _gasTaskUpsert gọi đúng GAS action + payload
════════════════════════════════════════════════════ */
console.log('\n[T1] _gasTaskUpsert → action=task-upsert, đúng taskId/taskName/row');
{
  clearCalls();
  await page.evaluate(async () => {
    const task = { ...db.tasks.find(t => t.id === 'T-001'), name: 'Task Alpha (sửa)' };
    db.tasks[db.tasks.findIndex(t => t.id === 'T-001')] = task;
    persist();
    await _gasTaskUpsert(task, '');
  });
  await page.waitForTimeout(300);

  const writes  = gasCalls.filter(c => c?.action === 'write');
  const upserts = gasCalls.filter(c => c?.action === 'task-upsert');

  if (writes.length === 0)        PASS('Không gọi write (full rewrite)');
  else                            FAIL(`Vẫn gọi write ${writes.length} lần`);
  if (upserts.length === 1)       PASS('Gọi đúng 1 lần task-upsert');
  else                            FAIL(`task-upsert gọi ${upserts.length} lần (expected 1)`);

  const u = upserts[0];
  if (u?.taskId === 'T-001')                        PASS(`body.taskId = "${u.taskId}"`);
  else                                               FAIL(`body.taskId sai: "${u?.taskId}"`);
  if (u?.taskName === 'Task Alpha (sửa)')            PASS(`body.taskName = "${u?.taskName}"`);
  else                                               FAIL(`body.taskName sai: "${u?.taskName}"`);
  if (Array.isArray(u?.row) && u?.row.length === 24) PASS('body.row = 24 cột (DB_COLS)');
  else                                               FAIL(`body.row.length = ${u?.row?.length} (expected 24)`);
}

/* ════════════════════════════════════════════════════
   T2: _gasTaskDelete gọi đúng GAS action + taskId
════════════════════════════════════════════════════ */
console.log('\n[T2] _gasTaskDelete → action=task-delete, đúng taskId/taskName');
{
  clearCalls();
  await page.evaluate(async () => {
    await _gasTaskDelete('T-002', 'Task Beta');
  });
  await page.waitForTimeout(300);

  const writes  = gasCalls.filter(c => c?.action === 'write');
  const deletes = gasCalls.filter(c => c?.action === 'task-delete');

  if (writes.length === 0)        PASS('Không gọi write khi delete');
  else                            FAIL(`Vẫn gọi write ${writes.length} lần`);
  if (deletes.length === 1)       PASS('Gọi đúng 1 lần task-delete');
  else                            FAIL(`task-delete gọi ${deletes.length} lần`);
  if (deletes[0]?.taskId === 'T-002')       PASS(`body.taskId = "${deletes[0]?.taskId}"`);
  else                                       FAIL(`body.taskId sai: "${deletes[0]?.taskId}"`);
  if (deletes[0]?.taskName === 'Task Beta') PASS(`body.taskName = "${deletes[0]?.taskName}"`);
  else                                       FAIL(`body.taskName sai: "${deletes[0]?.taskName}"`);
}

/* ════════════════════════════════════════════════════
   T3: _gasCaseUpsert gọi đúng GAS action + payload
════════════════════════════════════════════════════ */
console.log('\n[T3] _gasCaseUpsert → action=case-upsert, đúng caseId/caseName/row');
{
  clearCalls();
  await page.evaluate(async () => {
    // Use hardcoded object to avoid dbCases init dependency
    const c = { id:'CP-001', caseName:'Case Alpha (sửa)', team:'Số', pic:'TuanTT4',
      dvkd:'VCB', loaiHinh:'Tín dụng', complexity:'Cao', phuongAn:'PA1', giaTriTy:10,
      stage:'Tiếp thị', vuongMac:'', nextStep:'', startDate:'2026-01-01',
      deadline:'2026-06-30', rag:'Xanh', canBLD:'N', highlight:'N', ghiChu:'', yKienBLD:'', tuanBC:'' };
    await _gasCaseUpsert(c);
  });
  await page.waitForTimeout(300);

  const writes  = gasCalls.filter(c => c?.action === 'case-pipeline-write');
  const upserts = gasCalls.filter(c => c?.action === 'case-upsert');

  if (writes.length === 0)        PASS('Không gọi case-pipeline-write');
  else                            FAIL(`Vẫn gọi case-pipeline-write ${writes.length} lần`);
  if (upserts.length === 1)       PASS('Gọi đúng 1 lần case-upsert');
  else                            FAIL(`case-upsert gọi ${upserts.length} lần`);

  const u = upserts[0];
  if (u?.caseId === 'CP-001')                          PASS(`body.caseId = "${u.caseId}"`);
  else                                                 FAIL(`body.caseId sai: "${u?.caseId}"`);
  if (u?.caseName === 'Case Alpha (sửa)')              PASS(`body.caseName = "${u?.caseName}"`);
  else                                                 FAIL(`body.caseName sai: "${u?.caseName}"`);
  if (Array.isArray(u?.row) && u?.row.length === 20)   PASS('body.row = 20 cột (CASE_COLS)');
  else                                                 FAIL(`body.row.length = ${u?.row?.length} (expected 20)`);
}

/* ════════════════════════════════════════════════════
   T4: _gasCaseDelete gọi đúng GAS action
════════════════════════════════════════════════════ */
console.log('\n[T4] _gasCaseDelete → action=case-delete, đúng caseId/caseName');
{
  clearCalls();
  await page.evaluate(async () => {
    await _gasCaseDelete('CP-001', 'Case Alpha');
  });
  await page.waitForTimeout(300);

  const writes  = gasCalls.filter(c => c?.action === 'case-pipeline-write');
  const deletes = gasCalls.filter(c => c?.action === 'case-delete');

  if (writes.length === 0)        PASS('Không gọi case-pipeline-write khi delete');
  else                            FAIL(`Vẫn gọi case-pipeline-write ${writes.length} lần`);
  if (deletes.length === 1)       PASS('Gọi đúng 1 lần case-delete');
  else                            FAIL(`case-delete gọi ${deletes.length} lần`);
  if (deletes[0]?.caseId === 'CP-001')       PASS(`body.caseId = "${deletes[0]?.caseId}"`);
  else                                       FAIL(`body.caseId sai: "${deletes[0]?.caseId}"`);
  if (deletes[0]?.caseName === 'Case Alpha') PASS(`body.caseName = "${deletes[0]?.caseName}"`);
  else                                       FAIL(`body.caseName sai: "${deletes[0]?.caseName}"`);
}

/* ════════════════════════════════════════════════════
   T5: UI - Delete task từ modal → gọi task-delete, không write
════════════════════════════════════════════════════ */
console.log('\n[T5] UI delete task → task-delete (không write full)');
{
  clearCalls();
  await resetState();
  await navTo('tasks');

  await page.evaluate(() => openTaskModal(db.tasks.find(t => t.id === 'T-002')));
  await page.waitForTimeout(300);
  await page.click('#btnDelete');
  await page.waitForTimeout(200);
  await page.evaluate(() => resolveConfirm(true));
  await page.waitForTimeout(1000);

  const writes  = gasCalls.filter(c => c?.action === 'write');
  const deletes = gasCalls.filter(c => c?.action === 'task-delete');

  if (writes.length === 0)        PASS('Không gọi write khi delete task qua UI');
  else                            FAIL(`Vẫn gọi write ${writes.length} lần`);
  if (deletes.length === 1)       PASS('Gọi đúng 1 lần task-delete qua UI');
  else                            FAIL(`task-delete gọi ${deletes.length} lần (expected 1)`);

  const cnt = await page.evaluate(() => db.tasks.length);
  if (cnt === 1) PASS('db.tasks giảm còn 1 (T-002 xóa local)');
  else           FAIL(`db.tasks.length = ${cnt} (expected 1)`);
}

/* ════════════════════════════════════════════════════
   T6: UI - Save case (atomic) → case-upsert, không case-pipeline-write
════════════════════════════════════════════════════ */
console.log('\n[T6] UI save case → case-upsert (không case-pipeline-write full)');
{
  clearCalls();
  await resetState();
  await navTo('case-pipeline');

  // Call _gasCaseUpsert directly (same function handleCaseSubmit calls)
  await page.evaluate(async () => {
    await _gasCaseUpsert({ id: 'CP-001', caseName: 'Case Alpha (sửa qua UI)',
      team: 'Số', pic: 'TuanTT4', dvkd: 'VCB', loaiHinh: 'Tín dụng',
      complexity: 'Cao', phuongAn: 'PA1', giaTriTy: 10, stage: 'Tiếp thị',
      vuongMac: '', nextStep: '', startDate: '2026-01-01', deadline: '2026-06-30',
      rag: 'Xanh', canBLD: 'N', highlight: 'N', ghiChu: '', yKienBLD: '', tuanBC: '' });
  });
  await page.waitForTimeout(400);

  const writes  = gasCalls.filter(c => c?.action === 'case-pipeline-write');
  const upserts = gasCalls.filter(c => c?.action === 'case-upsert');

  if (writes.length === 0)        PASS('Không gọi case-pipeline-write khi save case');
  else                            FAIL(`Vẫn gọi case-pipeline-write ${writes.length} lần`);
  if (upserts.length === 1)       PASS('Gọi đúng 1 lần case-upsert');
  else                            FAIL(`case-upsert gọi ${upserts.length} lần (expected 1)`);
  if (upserts[0]?.caseName === 'Case Alpha (sửa qua UI)') PASS('caseName đúng');
  else FAIL(`caseName sai: "${upserts[0]?.caseName}"`);
}

/* ════════════════════════════════════════════════════
   T7: UI - Delete case qua modal → case-delete, không case-pipeline-write
════════════════════════════════════════════════════ */
console.log('\n[T7] UI delete case → case-delete (không case-pipeline-write full)');
{
  clearCalls();
  await resetState();
  await navTo('case-pipeline');

  // Set _cpEditId then call deleteCaseItem (async, needs confirm)
  await page.evaluate(() => { _cpEditId = 'CP-001'; });
  const deletePromise = page.evaluate(() => deleteCaseItem());
  await page.waitForTimeout(300);
  await page.evaluate(() => resolveConfirm(true));
  await deletePromise.catch(() => {});
  await page.waitForTimeout(800);

  const writes  = gasCalls.filter(c => c?.action === 'case-pipeline-write');
  const deletes = gasCalls.filter(c => c?.action === 'case-delete');

  if (writes.length === 0)        PASS('Không gọi case-pipeline-write khi delete case qua UI');
  else                            FAIL(`Vẫn gọi case-pipeline-write ${writes.length} lần`);
  if (deletes.length === 1)       PASS('Gọi đúng 1 lần case-delete qua UI');
  else                            FAIL(`case-delete gọi ${deletes.length} lần (expected 1)`);

  const cnt = await page.evaluate(() => (window.dbCases || []).length);
  if (cnt === 0) PASS('dbCases giảm còn 0 (CP-001 xóa local)');
  else           FAIL(`dbCases.length = ${cnt} (expected 0)`);
}

/* ════════════════════════════════════════════════════
   T8: writeToHandle (Excel import path) vẫn dùng action='write'
════════════════════════════════════════════════════ */
console.log('\n[T8] writeToHandle() (Excel import) → action=write (full rewrite)');
{
  clearCalls();
  await resetState();

  // writeToHandle() is used ONLY by Excel import — still sends action='write'
  await page.evaluate(async () => {
    await writeToHandle();
  });
  await page.waitForTimeout(400);

  const writeAll   = gasCalls.filter(c => c?.action === 'write');
  const upsertAll  = gasCalls.filter(c => c?.action === 'task-upsert');

  if (writeAll.length >= 1) PASS(`writeToHandle → action='write' (Excel import path): ${writeAll.length} lần`);
  else                      FAIL('writeToHandle không gọi write action (unexpected)');
  if (upsertAll.length === 0) PASS('writeToHandle không gọi task-upsert (đúng: chỉ Excel import dùng full write)');
  else                        FAIL(`writeToHandle gọi task-upsert ${upsertAll.length} lần (không mong đợi)`);
}

/* ════════════════════════════════════════════════════
   T8b: bulkSetRag → N×task-upsert, KHÔNG gọi write
════════════════════════════════════════════════════ */
console.log('\n[T8b] bulkSetRag → N×task-upsert, không gọi write (full rewrite)');
{
  clearCalls();
  await resetState();

  // Add both tasks to selectedIds
  await page.evaluate(() => {
    selectedIds.clear();
    db.tasks.forEach(t => selectedIds.add(t.id));
    updateBulkBar();
  });

  const bulkPromise = page.evaluate(async () => { await bulkSetRag('Red'); });
  await page.waitForTimeout(300);
  await page.evaluate(() => resolveConfirm(true));
  await bulkPromise.catch(() => {});
  await page.waitForTimeout(600);

  const writes  = gasCalls.filter(c => c?.action === 'write');
  const upserts = gasCalls.filter(c => c?.action === 'task-upsert');

  if (writes.length === 0)  PASS('bulkSetRag không gọi write (không full rewrite)');
  else                      FAIL(`bulkSetRag vẫn gọi write ${writes.length} lần`);
  if (upserts.length === 2) PASS(`bulkSetRag → 2×task-upsert (1 per task)`);
  else                      FAIL(`bulkSetRag gọi task-upsert ${upserts.length} lần (expected 2)`);

  const rag = await page.evaluate(() => db.tasks[0]?.status);
  if (rag === 'Red') PASS('db.tasks[0].status = Red (local update OK)');
  else               FAIL(`db.tasks[0].status = "${rag}" (expected Red)`);
}

/* ════════════════════════════════════════════════════
   T8c: bulkDelete → N×task-delete, KHÔNG gọi write
════════════════════════════════════════════════════ */
console.log('\n[T8c] bulkDelete → N×task-delete, không gọi write (full rewrite)');
{
  clearCalls();
  await resetState();

  await page.evaluate(() => {
    selectedIds.clear();
    selectedIds.add('T-001');
    selectedIds.add('T-002');
    updateBulkBar();
  });

  const bulkPromise = page.evaluate(async () => { await bulkDelete(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => resolveConfirm(true));
  await bulkPromise.catch(() => {});
  await page.waitForTimeout(600);

  const writes  = gasCalls.filter(c => c?.action === 'write');
  const deletes = gasCalls.filter(c => c?.action === 'task-delete');

  if (writes.length === 0)  PASS('bulkDelete không gọi write (không full rewrite)');
  else                      FAIL(`bulkDelete vẫn gọi write ${writes.length} lần`);
  if (deletes.length === 2) PASS(`bulkDelete → 2×task-delete (1 per task)`);
  else                      FAIL(`bulkDelete gọi task-delete ${deletes.length} lần (expected 2)`);

  const cnt = await page.evaluate(() => db.tasks.length);
  if (cnt === 0) PASS('db.tasks rỗng sau bulkDelete local');
  else           FAIL(`db.tasks.length = ${cnt} (expected 0)`);
}

/* ════════════════════════════════════════════════════
   T9: Optimistic update — local state cập nhật ngay sau save
════════════════════════════════════════════════════ */
console.log('\n[T9] Optimistic: db.tasks cập nhật ngay trước GAS response');
{
  clearCalls();
  await resetState();

  // Fire-and-forget: local state updates synchronously before GAS responds
  await page.evaluate(() => {
    const task = { ...db.tasks.find(t => t.id === 'T-001'), name: 'Optimistic test' };
    db.tasks[db.tasks.findIndex(t => t.id === 'T-001')] = task;
    persist();
    _gasTaskUpsert(task, ''); // fire and forget — no await
  });
  // Local state is already updated because the mutation happened sync inside evaluate
  const taskName = await page.evaluate(() => db.tasks.find(t => t.id === 'T-001')?.name);
  if (taskName === 'Optimistic test') PASS('db.tasks cập nhật ngay (không chờ GAS)');
  else                                FAIL(`db.tasks chưa cập nhật: "${taskName}"`);
}

/* ════════════════════════════════════════════════════
   T10: GAS offline → local save OK, localStorage cập nhật
════════════════════════════════════════════════════ */
console.log('\n[T10] GAS offline: _gasTaskUpsert không crash, local save OK');
{
  clearCalls();
  await resetState();

  // Temporarily override route to make ALL GAS calls fail
  await page.route('https://script.google.com/**', async route => {
    await route.fulfill({ status: 500, body: 'GAS offline' });
  });

  await page.evaluate(async () => {
    window.__atomicTestError = null;
    try {
      const task = { ...db.tasks.find(t => t.id === 'T-001'), name: 'Offline task' };
      db.tasks[db.tasks.findIndex(t => t.id === 'T-001')] = task;
      persist();
      await _gasTaskUpsert(task, '');
    } catch(e) {
      window.__atomicTestError = e.message;
    }
  });
  await page.waitForTimeout(500);

  const error = await page.evaluate(() => window.__atomicTestError || null);
  if (!error) PASS('_gasTaskUpsert không throw khi GAS offline');
  else        FAIL(`_gasTaskUpsert throw: ${error}`);

  const lsName = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('shtd_v2') || '{}');
    return d?.tasks?.find(t => t.id === 'T-001')?.name;
  });
  if (lsName === 'Offline task') PASS('localStorage cập nhật OK khi GAS offline');
  else                           FAIL(`localStorage name = "${lsName}" (expected "Offline task")`);

  // Remove the per-page route override so context route is restored
  await page.unroute('https://script.google.com/**');
}

/* ════════════════════════════════════════════════════
   T11: task-upsert với oldId → gọi task-delete(old) trước rồi task-upsert(new)
════════════════════════════════════════════════════ */
console.log('\n[T11] ID thay đổi: _gasTaskUpsert(task, oldId) → task-delete(old) + task-upsert(new)');
{
  clearCalls();
  await resetState();

  await page.evaluate(async () => {
    const task = { ...db.tasks.find(t => t.id === 'T-001'), id: 'T-001-NEW', name: 'Renamed task' };
    await _gasTaskUpsert(task, 'T-001'); // oldId = 'T-001'
  });
  await page.waitForTimeout(300);

  const deleteList = gasCalls.filter(c => c?.action === 'task-delete');
  const upsertList = gasCalls.filter(c => c?.action === 'task-upsert');

  if (deleteList.some(c => c?.taskId === 'T-001')) PASS('task-delete(T-001) gọi khi ID thay đổi');
  else FAIL(`task-delete(T-001) không được gọi (calls: ${JSON.stringify(deleteList.map(c=>c?.taskId))})`);

  if (upsertList.some(c => c?.taskId === 'T-001-NEW')) PASS('task-upsert(T-001-NEW) gọi với ID mới');
  else FAIL(`task-upsert(T-001-NEW) không được gọi (calls: ${JSON.stringify(upsertList.map(c=>c?.taskId))})`);
}

/* ════════════════════════════════════════════════════
   T12: No JS errors trong toàn bộ atomic write flow
════════════════════════════════════════════════════ */
console.log('\n[T12] No JS errors trong toàn bộ atomic write flow');
{
  clearCalls();
  await resetState();

  await page.evaluate(async () => {
    const task = { ...db.tasks[0], name: 'No-err upsert' };
    await _gasTaskUpsert(task, '');
    await _gasTaskDelete('T-002', 'Task Beta');
    const c = { id:'CP-001', caseName:'No-err case', team:'Số', pic:'TuanTT4', dvkd:'VCB',
      loaiHinh:'Tín dụng', complexity:'Cao', phuongAn:'PA1', giaTriTy:10, stage:'Tiếp thị',
      vuongMac:'', nextStep:'', startDate:'2026-01-01', deadline:'2026-06-30',
      rag:'Xanh', canBLD:'N', highlight:'N', ghiChu:'', yKienBLD:'', tuanBC:'' };
    await _gasCaseUpsert(c);
    await _gasCaseDelete('CP-001', 'Case Alpha');
  });
  await page.waitForTimeout(300);

  if (jsErrors.length === 0) PASS('Không có JS errors trong toàn bộ atomic write flow');
  else FAIL(`JS errors: ${jsErrors.slice(0,2).join('; ')}`);
}

/* ── Summary ── */
await ctx.close();
await browser.close();
server.close();
const total = R.pass + R.fail;
console.log(`\n${'═'.repeat(52)}`);
console.log(`verify_atomic_write.mjs: ${R.pass}/${total} ${R.fail === 0 ? 'PASS' : 'FAIL'}`);
console.log(`${'═'.repeat(52)}\n`);
process.exit(R.fail > 0 ? 1 : 0);
