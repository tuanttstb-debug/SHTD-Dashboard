/**
 * verify_task_rag.mjs — RAG column persist (v6.48)
 *   RG1 – Parse: cột 'RAG' trong sheet → t.status (Green/Amber/Red)
 *   RG2 – Ghi: taskToRow() serialize t.status vào cột RAG (index 24) + DB_COLS 25 cột
 *   RG3 – My Work quick RAG: mwQuickSaveRag set t.status + fires 'task-upsert' với row[24] đúng
 *   RG4 – My Work dots đọc theo t.status (dot active khớp Green/Amber/Red)
 *   RG5 – Không JS error
 *
 * Run: node verify_task_rag.mjs
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let passed = 0, failed = 0;
const log = (id, ok, msg) => { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); ok ? passed++ : failed++; };

// Sheet có cột 'RAG' = 'Red' cho task T1 (team BL, PIC tester → thuộc My Work).
const TASK_HDR = ['ID', 'Task / Deliverable', 'Team chính', 'PIC Responsible', 'Trạng thái', '% HT', 'RAG'];
const TASK_ROW = ['T1', 'Task một', 'BL', 'tester', 'Đang thực hiện', '30', 'Red'];

const browser = await chromium.launch();
const page = await browser.newPage();
const jsErrors = [];
const upserts = [];
page.on('pageerror', e => jsErrors.push(e.message));

await page.route('**script.google.com**', async (route) => {
  let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch {}
  const action = (b.action || '?').toLowerCase();
  if (action === 'task-upsert') upserts.push({ taskId: b.taskId, row: b.row });
  let body;
  if (action === 'batch-read') {
    body = { status: 'ok', ver: 'V1', serverTs: '0', data: {
      tasks: { values: [TASK_HDR, TASK_ROW] },
      users: { header: ['Username', 'Team', 'Active'], rows: [['tester', 'BL', 'true']] },
      cases: { values: [['ID']] }, issues: { values: [['ID']] }, dev: { values: [['ID']] },
      initiatives: { values: [['ID', 'Tên Initiative / Milestone']] }, notifs: [],
    }};
  } else if (action === 'task-upsert') body = { status: 'ok', id: b.taskId, serverTs: '0' };
  else body = { status: 'ok', values: [['ID']], notifs: [], serverTs: '0' };
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});

await page.addInitScript(() => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 't', user: { username: 'tester', displayName: 'Tester', role: 'Admin', team: 'BL' }, exp: Date.now() + 3600000,
  }));
});

await page.goto(BASE_URL, { waitUntil: 'load' });
await page.waitForTimeout(1200);

// RG1 — parse cột RAG → status
const parsed = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T1');
  return t ? t.status : null;
});
log('RG1', parsed === 'Red', `parse cột RAG → t.status = ${parsed} (kỳ vọng Red)`);

// RG2 — DB_COLS 25 cột + taskToRow[24] = status
const ser = await page.evaluate(() => {
  const t = db.tasks.find(x => x.id === 'T1');
  const row = taskToRow(t);
  return { cols: DB_COLS.length, ragHdr: DB_COLS[24], len: row.length, rag: row[24] };
});
log('RG2', ser.cols === 25 && ser.ragHdr === 'RAG' && ser.len === 25 && ser.rag === 'Red',
    `DB_COLS=${ser.cols}, col24=${ser.ragHdr}, taskToRow.len=${ser.len}, row[24]=${ser.rag} (kỳ vọng 25/RAG/25/Red)`);

// RG3 — mwQuickSaveRag đổi RAG → status + task-upsert row[24]
const before = upserts.length;
const local = await page.evaluate(() => { mwQuickSaveRag('T1', 'Amber'); return db.tasks.find(x => x.id === 'T1').status; });
await page.waitForTimeout(300);
const up = upserts.slice(before).find(u => u.taskId === 'T1');
log('RG3', local === 'Amber' && up && up.row && up.row[24] === 'Amber',
    `sau quick RAG: status cục bộ=${local}, task-upsert row[24]=${up && up.row ? up.row[24] : 'n/a'} (kỳ vọng Amber/Amber)`);

// RG4 — dots đọc theo status: render My Work, dot Amber active
const dotActive = await page.evaluate(() => {
  navigateTo('my-work');
  const card = document.querySelector('.mw-task-card[data-id="T1"]');
  if (!card) return 'no-card';
  const amber = card.querySelector('.mw-rag-dot.active-vang');
  return amber ? 'amber-active' : 'not-active';
});
log('RG4', dotActive === 'amber-active', `dot RAG sau đổi Amber = ${dotActive} (kỳ vọng amber-active)`);

log('RG5', jsErrors.length === 0, jsErrors.length ? 'JS errors: ' + jsErrors.join(' | ') : 'Không có JS error');

console.log(`\n${passed}/${passed + failed} checks passed`);
await page.close();
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
