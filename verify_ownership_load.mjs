/**
 * verify_ownership_load.mjs — Phase A (dirty-guard) + B (My Work quick-save) + C (ownership-first load)
 *
 *  Scenario A — User thường (scope 'mine' trước, full-load nền sau):
 *   OL1 – Khởi động: batch-read ĐẦU TIÊN có scope==='mine'
 *   OL2 – Sau mine-load, full-load nền fires batch-read scope==='all' → db._tasksScope==='all', db.tasks đủ (2)
 *   OL3 – Version gate theo scope: db._dataVerMine='VMINE' (mine) & db._dataVer='VALL' (all) lưu riêng
 *   OL4 – Dirty-guard: edit optimistic + _markTaskDirty → _parseArrayIntoDb(stale) KHÔNG lật edit
 *   OL5 – Sau _clearTaskDirty → read nền ghi đè bình thường (server thắng)
 *   OL6 – My Work quick-save: mwQuickSaveState fires 'task-upsert' + cập nhật state cục bộ
 *   OL7 – Không JS error
 *
 *  Scenario B — Admin (KHÔNG scope, luôn full):
 *   OL8 – Khởi động chỉ có batch-read scope==='all', KHÔNG có 'mine'; db.tasks đủ (2)
 *
 * Run: node verify_ownership_load.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = 3098;
const BASE_URL  = `http://localhost:${PORT}`;

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
server.listen(PORT);

let passed = 0, failed = 0;
function log(id, ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`);
  if (ok) passed++; else failed++;
}

const TASK_HDR = ['ID', 'Task / Deliverable (1 dòng)', 'Team chính', 'PIC Responsible', 'Trạng thái', 'Deadline', '% HT'];
const ROW_MINE = ['SO-26-001', 'Task của tôi', 'BL', 'tester', 'Đang thực hiện', '2099-01-01', '10'];
const ROW_OTHER= ['SO-26-002', 'Task đội khác', 'CV1', 'someone', 'Đang thực hiện', '2099-01-01', '20'];

function batchPayload(scope) {
  const tasks = (scope === 'mine')
    ? { values: [TASK_HDR, ROW_MINE] }            // scope 'mine' → chỉ 1 task
    : { values: [TASK_HDR, ROW_MINE, ROW_OTHER] };// scope 'all'  → đủ 2 task
  return {
    status: 'ok', ver: scope === 'mine' ? 'VMINE' : 'VALL', scope,
    serverTs: '0',
    data: {
      tasks,
      cases:       { values: [['ID']] },
      issues:      { values: [['ID']] },
      dev:         { values: [['ID']] },
      initiatives: { values: [['ID', 'Tên Initiative / Milestone']] },
      users:       { header: ['Username', 'Team', 'Active'], rows: [['tester', 'BL', 'true']] },
      notifs:      [],
    },
  };
}

async function bootPage(browser, { role, team }) {
  const page     = await browser.newPage();
  const jsErrors = [];
  const reqs     = [];   // {action, scope, taskId}
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.route('**script.google.com**', async (route) => {
    let b = {};
    try { b = JSON.parse(route.request().postData() || '{}'); } catch {}
    const action = (b.action || '?').toLowerCase();
    reqs.push({ action, scope: b.scope || null, taskId: b.taskId || null, ver: b.ver || null });
    await new Promise(r => setTimeout(r, 60));
    let body;
    if (action === 'batch-read')       body = batchPayload(b.scope === 'mine' ? 'mine' : 'all');
    else if (action === 'task-upsert') body = { status: 'ok', id: b.taskId, serverTs: '0' };
    else                               body = { status: 'ok', values: [['ID']], notifs: [], serverTs: '0' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.addInitScript(([role, team]) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'test-token',
      user:  { username: 'tester', displayName: 'Tester', role, team },
      exp:   Date.now() + 3600000,
    }));
  }, [role, team]);

  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return { page, jsErrors, reqs };
}

const browser = await chromium.launch();

// ── Scenario A — User thường ──
{
  const { page, jsErrors, reqs } = await bootPage(browser, { role: 'User', team: 'BL' });
  const batchReqs = reqs.filter(r => r.action === 'batch-read');
  const firstScope = batchReqs.length ? batchReqs[0].scope : null;
  log('OL1', firstScope === 'mine', `batch-read đầu tiên scope=${firstScope} (kỳ vọng 'mine')`);

  const sawAll = batchReqs.some(r => r.scope === 'all');
  const scopeState = await page.evaluate(() => ({ scope: db._tasksScope, n: db.tasks.length, vm: db._dataVerMine, va: db._dataVer }));
  log('OL2', sawAll && scopeState.scope === 'all' && scopeState.n === 2,
      `full-load 'all'=${sawAll}, db._tasksScope=${scopeState.scope}, db.tasks=${scopeState.n} (kỳ vọng all/2)`);
  log('OL3', scopeState.vm === 'VMINE' && scopeState.va === 'VALL',
      `db._dataVerMine=${scopeState.vm}, db._dataVer=${scopeState.va} (kỳ vọng VMINE/VALL)`);

  // Dirty-guard (deterministic, gọi trực tiếp logic)
  const guard = await page.evaluate(() => {
    const tid = db.tasks[0].id;
    db.tasks[0].state = 'Blocked';
    _markTaskDirty(db.tasks[0]);
    const stale = [['ID', 'Task / Deliverable', 'Trạng thái'], [tid, 'x', 'Đang thực hiện']];
    _parseArrayIntoDb(stale);
    const kept = (db.tasks.find(t => t.id === tid) || {}).state;
    _clearTaskDirty(tid);
    _parseArrayIntoDb(stale);
    const overwritten = (db.tasks.find(t => t.id === tid) || {}).state;
    return { kept, overwritten };
  });
  log('OL4', guard.kept === 'Blocked', `edit optimistic sau read nền = ${guard.kept} (kỳ vọng Blocked = giữ)`);
  log('OL5', guard.overwritten === 'Đang thực hiện', `sau clear dirty = ${guard.overwritten} (kỳ vọng server thắng)`);

  // My Work quick-save fires task-upsert + cập nhật cục bộ
  await page.evaluate(() => { navigateTo('my-work'); });
  await page.waitForTimeout(150);
  const before = reqs.length;
  const localState = await page.evaluate(() => {
    // đảm bảo có task SO-26-001 trong db (full-load có thể đã thêm ROW_OTHER)
    if (!db.tasks.find(t => t.id === 'SO-26-001')) return { fired: false, state: null };
    mwQuickSaveState('SO-26-001', 'Blocked');
    return { fired: true, state: (db.tasks.find(t => t.id === 'SO-26-001') || {}).state };
  });
  await page.waitForTimeout(300);
  const upsertReq = reqs.slice(before).find(r => r.action === 'task-upsert' && r.taskId === 'SO-26-001');
  log('OL6', !!upsertReq && localState.state === 'Blocked',
      `mwQuickSaveState → task-upsert fired=${!!upsertReq}, state cục bộ=${localState.state} (kỳ vọng fired/Blocked)`);
  log('OL7', jsErrors.length === 0, jsErrors.length ? 'JS errors: ' + jsErrors.join(' | ') : 'Không có JS error');
  await page.close();
}

// ── Scenario B — Admin (không scope) ──
{
  const { page, jsErrors, reqs } = await bootPage(browser, { role: 'Admin', team: 'BC' });
  const batchReqs = reqs.filter(r => r.action === 'batch-read');
  const anyMine = batchReqs.some(r => r.scope === 'mine');
  const st = await page.evaluate(() => ({ scope: db._tasksScope, n: db.tasks.length }));
  log('OL8', !anyMine && st.scope === 'all' && st.n === 2 && jsErrors.length === 0,
      `Admin: có 'mine'=${anyMine}, scope=${st.scope}, tasks=${st.n}, jsErr=${jsErrors.length} (kỳ vọng no-mine/all/2/0)`);
  await page.close();
}

console.log(`\n${passed}/${passed + failed} checks passed`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
