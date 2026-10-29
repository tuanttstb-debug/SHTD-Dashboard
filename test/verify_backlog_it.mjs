/**
 * verify_backlog_it.mjs  —  S94 Backlog IT (ticket Jira DCB, hub AIOS D22) — v6.69
 *
 *  BI1  – Cấu trúc: nav item, section, stat bar, bộ lọc chuẩn Team + Nhân sự
 *  BI2  – Đọc workbook dạng file mẫu: sheet xuất Jira (header dòng 3, từ cột B) + bảng tay PO → gộp theo Key
 *  BI3  – Ngày: Date · ISO · "28/Oct/26 4:56 PM" · "10/28/2026 16:56" · dd/MM/yyyy · serial
 *  BI4  – Suy ra: line (label > summary) · nhiều line · golive · sẵn sàng + lý do thiếu · lệch ưu tiên · trôi
 *  BI5  – Import: ticket mới thêm, ticket cũ ghi đè cột Jira, GIỮ cột team (ưu tiên/quyết định/kỳ/ghi chú)
 *  BI6  – Render bảng + lọc nhanh (stat card) + line + kỳ + nhân sự (PeopleFilter, nhãn Username-Họ tên)
 *  BI7  – Modal: Admin sửa được cột lead; patch gửi GAS theo chỉ số cột Ticket_Master
 *  BI8  – Role User: cột lead bị khóa, không gửi uuTien/quyetDinh/ky
 *  BI9  – Badge menu = ticket mở không nhích ≥ 60 ngày
 *  BI10 – Bảng planning xuất Excel: header + giá trị suy ra
 *  BIX  – Không lỗi JS
 *
 * Dữ liệu test là GIẢ LẬP (repo public). Kiểm thêm file thật (không commit):
 *   TK_REAL_FILE="D:/…/Planning T12.xlsx" node test/verify_backlog_it.mjs
 * EVD: test-results/backlog_it/
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3094;
const BASE_URL  = `http://localhost:${PORT}`;
const EVD_DIR   = path.join(__dirname, 'test-results', 'backlog_it');
if (!fs.existsSync(EVD_DIR)) fs.mkdirSync(EVD_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : decodeURIComponent(url));
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let passed = 0, failed = 0;
function log(id, ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`);
  if (ok) passed++; else failed++;
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(EVD_DIR, `${name}.png`), fullPage: false });
}

const browser  = await chromium.launch({ headless: true });
const page     = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
await page.route('**://script.google.com/**', route => route.abort());

console.log('\n══════════════════════════════════════════════');
console.log('  S94 Backlog IT — Playwright EVD');
console.log('══════════════════════════════════════════════\n');

await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(400);

async function login(role) {
  await page.evaluate(({ role }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000,
      user: { username: 'TuanTT4', role, team: 'Số', displayName: 'Trần Thế Tuân' }
    }));
    _appUsers = [
      { Username: 'TuanTT4', Display_Name: 'Trần Thế Tuân', Team: 'Số', Active: 'TRUE' },
      { Username: 'DungLQ1', Display_Name: 'Lê Quang Dũng', Team: 'Số', Active: 'TRUE' },
      { Username: 'QuangNN3', Display_Name: 'Nguyễn Ngọc Quang', Team: 'Số', Active: 'TRUE' },
    ];
    // Cách ly GAS: ghi lại payload, trả ok
    window.__tkWrites = [];
    window.gasWrite = async (body) => { window.__tkWrites.push(JSON.parse(JSON.stringify(body))); return { status: 'ok', result: null }; };
    window.readTickets = async () => {};
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
  }, { role });
}

await login('Admin');
await page.evaluate(() => { try { setupListeners(); } catch (e) {} });

/* ── BI2/BI3 — parse workbook giả lập cùng cấu trúc file mẫu ── */
const parsed = await page.evaluate(() => {
  const wb = XLSX.utils.book_new();
  // Sheet xuất Jira: 2 dòng trống, header dòng 3 bắt đầu cột B (đúng file "Planning T12.xlsx")
  const jira = [
    [], [],
    ['', 'Issue Type', 'Key', 'Summary', 'Assignee', 'Reporter', 'Priority', 'Status', 'Resolution', 'Created', 'Updated', 'Labels', 'Labels'],
    ['', 'Story', 'DCB-90001', '[KySoHSTD][APP] Tính năng giả lập A', 'Dev Mot <TN-EDF.IT>', 'Po Hai <CVC-SPTDDN.CB>', 'High', 'To Do', 'Unresolved',
      new Date(2026, 9, 28, 16, 56), new Date(2026, 9, 28, 16, 56), 'HSTD', ''],
    ['', 'Improvement', 'DCB-90002', '[GNOL tự động] - Rule giả lập B', 'Dev Mot <TN-EDF.IT>', 'Po Mot <CVCC-SPTDDN.CB>', 'Medium', 'To Do', 'Unresolved',
      '23/Sep/26 10:35 AM', '21/Oct/26 11:07 AM', 'GNOL, DCB_Task', 'Expect_Golive_202612'],
    ['', 'Improvement', 'DCB-90003', '[GNOL] - Sửa giả lập C', 'Dev Hai <CVC-EDF.IT>', 'Po Mot <CVCC-SPTDDN.CB>', 'Medium', 'In Progress', 'Unresolved',
      '9/29/2026 16:12', '10/28/2026 15:32', 'BLOL, GNOL', 'Expect_Golive_202612'],
    ['', 'Improvement', 'DCB-90004', '[BLOL] Job giả lập D', 'Dev Mot <TN-EDF.IT>', 'Po Hai <CVC-SPTDDN.CB>', 'Highest', 'To Do', 'Unresolved',
      46275, '15/09/2026', 'BLOL, DCB_Task, TLPT_Xong', 'Expect_Golive_202611'],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(jira), 'Temp jira');
  // Bảng tay PO (như "Sheet1")
  const manual = [
    ['Issue Type', 'Key', 'Summary', 'Có yêu cầu UI/UX không', 'Đã xong UI/UX chưa', 'Đã xong TLPT', 'Loại backlog', 'Mức độ ưu tiên', 'Kết quả cam kết'],
    ['Story', 'DCB-90001', 'x', 'Có', 'Chưa', 'Chưa', 'Tính năng', 1, 'Theo timeline'],
    ['Improvement', 'DCB-90002', 'x', 'Có', 0.5, 'Done', 'Tính năng', 1, 'Theo tiến độ'],
    ['Improvement', 'DCB-90003', 'x', 'Không', 'Không', 'Chưa', 'Sửa nhỏ', 3, 'Theo tiến độ'],
    ['Improvement', 'DCB-90005', '[SCF] Chỉ có ở bảng tay', 'Không', 'Không', 'Done', 'Lỗi', 2, ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(manual), 'Sheet1');
  // round-trip qua file nhị phân như khi người dùng chọn file
  const bin = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const wb2 = XLSX.read(new Uint8Array(bin), { type: 'array', cellDates: true });
  const r = tkParseWorkbook(wb2);
  window.__tkParsed = r.tickets;
  return { n: r.tickets.length, sheets: r.sheets, map: Object.fromEntries(r.tickets.map(t => [t.key, t])) };
});
log('BI2-sheets', parsed.sheets.length === 2, `Nhận 2 sheet có Key+Summary (${parsed.sheets.join(', ')})`);
log('BI2-count', parsed.n === 5, `Gộp theo Key → 5 ticket (thực tế ${parsed.n})`);
const m = parsed.map;
log('BI2-jira-fields', m['DCB-90001'] && m['DCB-90001'].status === 'To Do' && m['DCB-90001'].priority === 'High', 'Cột Jira lấy từ sheet xuất Jira');
log('BI2-summary-jira-wins', m['DCB-90001'] && m['DCB-90001'].summary.indexOf('Tính năng giả lập A') !== -1, 'Summary giữ theo sheet Jira (không bị bảng tay "x" đè)');
log('BI2-multi-labels', m['DCB-90002'] && m['DCB-90002'].labels === 'GNOL, DCB_Task, Expect_Golive_202612', `Nhiều cột Labels gộp: "${m['DCB-90002'] && m['DCB-90002'].labels}"`);
log('BI2-manual-ui', m['DCB-90001'].ui === 'Cần' && m['DCB-90002'].ui === 'Đang' && m['DCB-90003'].ui === 'Không cần', `UI từ bảng tay: ${m['DCB-90001'].ui}/${m['DCB-90002'].ui}/${m['DCB-90003'].ui}`);
log('BI2-manual-tlpt', m['DCB-90002'].tlpt === 'Xong' && m['DCB-90001'].tlpt === 'Chưa', 'TLPT từ bảng tay (Done → Xong)');
log('BI2-manual-only', !!m['DCB-90005'] && m['DCB-90005'].loai === 'Lỗi', 'Ticket chỉ có ở bảng tay vẫn được nhận');
log('BI3-date-obj', m['DCB-90001'].created === '2026-10-28', `Date → ${m['DCB-90001'].created}`);
log('BI3-date-jira-csv', m['DCB-90002'].created === '2026-09-23' && m['DCB-90002'].updated === '2026-10-21', `"23/Sep/26 10:35 AM" → ${m['DCB-90002'].created}`);
log('BI3-date-us', m['DCB-90003'].created === '2026-09-29' && m['DCB-90003'].updated === '2026-10-28', `"9/29/2026 16:12" → ${m['DCB-90003'].created}`);
log('BI3-date-vn-serial', m['DCB-90004'].updated === '2026-09-15' && m['DCB-90004'].created === '2026-09-10', `dd/MM/yyyy → ${m['DCB-90004'].updated} · serial → ${m['DCB-90004'].created}`);

/* ── BI4 — derive ── */
const der = await page.evaluate(() => {
  const today = new Date(2026, 9, 29);
  const by = Object.fromEntries(window.__tkParsed.map(t => [t.key, tkDerive(t, today)]));
  return by;
});
log('BI4-line-summary', der['DCB-90001'].line === 'HSTD' && der['DCB-90001'].po === 'TuanTT4', 'Ký số: line HSTD → PO TuanTT4');
log('BI4-line-label', der['DCB-90002'].line === 'GNOL' && der['DCB-90002'].subs.indexOf('GNOL_TuDong') !== -1, 'GNOL + nhãn phụ GNOL_TuDong từ summary');
log('BI4-multi-line', der['DCB-90003'].line === 'GNOL' && der['DCB-90003'].warn.some(w => w.indexOf('nhiều line') !== -1), 'Gắn BLOL+GNOL → chọn theo summary + cảnh báo');
log('BI4-scf-summary', der['DCB-90005'].line === 'SCF' && der['DCB-90005'].po === 'DungLQ1', 'SCF từ summary → PO DungLQ1');
log('BI4-ready', der['DCB-90004'].ready === true, 'DCB_Task + không cần UI + TLPT_Xong + golive → Đạt');
log('BI4-not-ready-ui', !der['DCB-90002'].ready && der['DCB-90002'].missing.join('|') === 'UI chưa xong', `Thiếu: ${der['DCB-90002'].missing.join(' · ')}`);
log('BI4-not-ready-all', der['DCB-90001'].missing.length === 4, `Ký số thiếu đủ 4 điều kiện (${der['DCB-90001'].missing.length})`);
log('BI4-golive', der['DCB-90004'].golive === '202611' && der['DCB-90004'].kyEff === '202611', 'Expect_Golive_202611 → kỳ hiệu lực 202611');
log('BI4-stale', der['DCB-90004'].staleDays === 44 && der['DCB-90004'].staleLevel === 'amber', `Không nhích ${der['DCB-90004'].staleDays} ngày → amber`);
log('BI4-no-okr', der['DCB-90002'].warn.indexOf('Chưa gắn OKR') !== -1, 'Cảnh báo chưa gắn OKR');
const mis = await page.evaluate(() => tkDerive({ summary: '[BLOL] x', labels: 'BLOL', priority: 'Medium', uuTien: '1', updated: '2026-08-01' }, new Date(2026, 9, 29)));
log('BI4-prio-mismatch', mis.prioMismatch && mis.staleLevel === 'red', 'Jira Medium ↔ team 1 → lệch · 89 ngày → red');

/* ── BI5 — import giữ cột team ── */
const imp = await page.evaluate(async () => {
  dbTickets = [Object.assign(rowToTicket(new Array(24).fill('')), {
    key: 'DCB-90004', summary: 'cũ', status: 'Backlog', uuTien: '1', quyetDinh: 'Đưa vào kỳ', ky: '202612', note: 'giữ', ui: 'Xong' })];
  window.__tkWrites = [];
  const r = await _gasTicketImport(window.__tkParsed);
  const t4 = dbTickets.find(t => t.key === 'DCB-90004');
  return { r: r.result, n: dbTickets.length, t4, wrote: window.__tkWrites[0] };
});
log('BI5-counts', imp.r.added === 4 && imp.r.updated === 1 && imp.n === 5, `added=${imp.r.added} updated=${imp.r.updated} total=${imp.n}`);
log('BI5-jira-overwrite', imp.t4.summary.indexOf('Job giả lập D') !== -1 && imp.t4.status === 'To Do', 'Cột Jira ghi đè theo file');
log('BI5-team-kept', imp.t4.uuTien === '1' && imp.t4.quyetDinh === 'Đưa vào kỳ' && imp.t4.ky === '202612' && imp.t4.note === 'giữ', 'Ưu tiên · quyết định · kỳ · ghi chú giữ nguyên');
log('BI5-trans-kept', imp.t4.ui === 'Xong', 'Cột UI không bị xóa khi file không có giá trị');
log('BI5-gas-payload', imp.wrote && imp.wrote.action === 'ticket-import' && imp.wrote.rows.length === 5 && imp.wrote.rows[0].length === 24, 'Gửi GAS ticket-import 5 dòng × 24 cột');

/* ── BI1/BI6 — render ── */
await page.evaluate(() => navigateTo('backlog-it'));
await page.waitForTimeout(300);
log('BI1-nav', !!(await page.$('[data-view="backlog-it"]')), 'Nav item [data-view="backlog-it"]');
log('BI1-section', await page.$eval('#view-backlog-it', el => el.style.display !== 'none'), 'Section hiển thị');
log('BI1-stat', (await page.$$('.tk-stat')).length === 6, '6 thẻ số liệu');
log('BI1-pf', !!(await page.$('#tkTeamFilter.pf-select')) && !!(await page.$('#tkUserFilter.pf-select')), 'Bộ lọc chuẩn Team + Nhân sự');
const userOpts = await page.$$eval('#tkUserFilter option', os => os.map(o => o.textContent));
log('BI6-pf-label', userOpts.includes('Dunglq1-Lê Quang Dũng') && userOpts.includes('Tuantt4-Trần Thế Tuân'), `Nhãn Username-Họ tên: ${userOpts.slice(1).join(' | ')}`);
let rows = await page.$$eval('.tk-row', els => els.length);
log('BI6-rows-open', rows === 5, `Đang mở: 5 dòng (thực tế ${rows})`);
await shot(page, '01_backlog_open');

await page.click('.tk-stat[data-preset="ready"]');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI6-preset-ready', rows === 1, `Lọc "Sẵn sàng" → 1 (thực tế ${rows})`);
await page.click('.tk-stat[data-preset="open"]');
await page.selectOption('#tkLineFilter', 'GNOL');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI6-line', rows === 2, `Line GNOL → 2 (thực tế ${rows})`);
await page.selectOption('#tkLineFilter', '');
await page.selectOption('#tkKyFilter', '202612');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI6-ky', rows === 3, `Kỳ T12/2026 → 3 (DCB-90004 đã chốt kỳ 202612 + 2 golive T12) (thực tế ${rows})`);
await page.selectOption('#tkKyFilter', '');
await page.selectOption('#tkUserFilter', 'quangnn3');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI6-person', rows === 1, `Nhân sự Quangnn3 → 1 (thực tế ${rows})`);
await page.selectOption('#tkUserFilter', '');
await page.fill('#tkSearch', 'giả lập C');
await page.waitForTimeout(300);
rows = await page.$$eval('.tk-row', els => els.length);
log('BI6-search', rows === 1, `Tìm "giả lập C" → 1 (thực tế ${rows})`);
await page.fill('#tkSearch', '');
await page.waitForTimeout(300);

/* ── BI7 — modal Admin ── */
await page.evaluate(() => { window.__tkWrites = []; tkOpenModal('DCB-90002'); });
await page.waitForTimeout(150);
log('BI7-modal', await page.$eval('#tkModal', el => el.classList.contains('open')), 'Modal mở');
log('BI7-lead-enabled', !(await page.$eval('#tkfDec', el => el.disabled)), 'Admin: ô Quyết định mở');
await shot(page, '02_modal_admin');
await page.selectOption('#tkfUuTien', '2');
await page.selectOption('#tkfDec', 'Đưa vào kỳ');
await page.fill('#tkfKy', '202612');
await page.fill('#tkfNote', 'gộp CR');
await page.click('.tk-modal-foot .btn-primary');
await page.waitForTimeout(200);
const w = await page.evaluate(() => window.__tkWrites[0]);
log('BI7-patch', w && w.action === 'ticket-update' && w.key === 'DCB-90002'
  && w.patch['17'] === '2' && w.patch['18'] === 'Đưa vào kỳ' && w.patch['19'] === '202612' && w.patch['21'] === 'gộp CR',
  `Patch theo chỉ số cột: ${JSON.stringify(w && w.patch)}`);
const decCell = await page.$$eval('.tk-row', els => els.map(e => e.textContent).find(t => t.includes('DCB-90002')) || '');
log('BI7-render', decCell.includes('Đưa vào kỳ'), 'Bảng cập nhật quyết định');
await page.evaluate(() => { tkOpenModal('DCB-90002'); });
await page.fill('#tkfKy', '2026-13');
await page.click('.tk-modal-foot .btn-primary');
log('BI7-ky-validate', await page.$eval('#tkModal', el => el.classList.contains('open')), 'Kỳ sai định dạng → không lưu');
await page.evaluate(() => tkCloseModal());

/* ── BI8 — User ── */
await login('User');
await page.evaluate(() => { window.__tkWrites = []; tkOpenModal('DCB-90001'); });
log('BI8-lead-locked', await page.$eval('#tkfDec', el => el.disabled) && await page.$eval('#tkfUuTien', el => el.disabled), 'User: ưu tiên + quyết định bị khóa');
await page.fill('#tkfNote', 'ghi chú PO');
await page.click('.tk-modal-foot .btn-primary');
await page.waitForTimeout(200);
const w2 = await page.evaluate(() => window.__tkWrites[0]);
log('BI8-patch', w2 && w2.patch['21'] === 'ghi chú PO' && !('17' in w2.patch) && !('18' in w2.patch) && !('19' in w2.patch), `User chỉ gửi ghi chú: ${JSON.stringify(w2 && w2.patch)}`);
await login('Admin');

/* ── BI9 — badge ── */
const badge = await page.evaluate(() => {
  dbTickets.push(Object.assign(rowToTicket(new Array(24).fill('')), { key: 'DCB-90009', summary: '[BLOL] cũ', status: 'To Do', updated: '2026-06-01', labels: 'BLOL' }));
  dbTickets.push(Object.assign(rowToTicket(new Array(24).fill('')), { key: 'DCB-90010', summary: '[BLOL] cũ đã xong', status: 'Done', updated: '2026-06-01', labels: 'BLOL' }));
  tkUpdateBadge();
  const el = document.getElementById('navBadgeTicket');
  return { txt: el.textContent, shown: el.style.display !== 'none' };
});
log('BI9-badge', badge.shown && badge.txt === '1', `Badge = ${badge.txt} (chỉ ticket mở ≥ 60 ngày, bỏ Done)`);

/* ── BI10 — export rows ── */
const ex = await page.evaluate(() => {
  const aoa = tkExportRows(dbTickets.filter(t => t.key === 'DCB-90004'), new Date(2026, 9, 29));
  return { head: aoa[0], row: aoa[1] };
});
log('BI10-head', ex.head.includes('Sẵn sàng chuyển IT') && ex.head.includes('Số ngày không nhích') && ex.head.length === 23, '23 cột bảng planning');
log('BI10-row', ex.row[0] === 'BLOL' && ex.row[16] === 'Đạt' && ex.row[21] === 44, `BLOL · Đạt · 44 ngày (${ex.row[0]} · ${ex.row[16]} · ${ex.row[21]})`);

/* ── (tùy chọn) file thật, không commit ── */
const REAL = process.env.TK_REAL_FILE;
if (REAL && fs.existsSync(REAL)) {
  const b64 = fs.readFileSync(REAL).toString('base64');
  const real = await page.evaluate((b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const r = tkParseWorkbook(XLSX.read(bin, { type: 'array', cellDates: true }));
    const today = new Date();
    return { n: r.tickets.length, sheets: r.sheets,
      rows: r.tickets.map(t => { const d = tkDerive(t, today); return [t.key, d.line, d.po, d.ui, d.tlpt, t.created, t.updated, d.ready ? 'Đạt' : 'Chưa: ' + d.missing.join('/'), d.staleDays]; }) };
  }, b64);
  console.log(`\n   [file thật] ${real.n} ticket từ ${real.sheets.join(', ')}`);
  real.rows.forEach(r => console.log('   ' + r.join(' | ')));
  log('REAL-parse', real.n > 0 && real.rows.every(r => r[1]), `File thật: ${real.n} ticket, đủ line`);
}

log('BIX-no-js-errors', jsErrors.length === 0, jsErrors.length ? jsErrors.join(' | ') : 'Không lỗi JS');

console.log(`\n${passed} passed · ${failed} failed`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
