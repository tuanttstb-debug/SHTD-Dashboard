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
 *  BI14 – Lọc Dự án · Trạng thái · Nhân sự theo họ tên SHTD + chọn/xóa hàng loạt (Admin tất cả, PO ticket mình) + GAS chặn quyền (v6.73)
 *  BI15 – Giao hàng loạt cho PO khác của team (cột PO phụ trách; người nhận thành chủ; import giữ) (v6.74)
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
log('BI4-line-summary', der['DCB-90001'].line === 'HSTD' && der['DCB-90001'].po === 'Po Hai', `Ký số: line HSTD · PO = Reporter "${der['DCB-90001'].po}"`);
log('BI4-line-label', der['DCB-90002'].line === 'GNOL' && der['DCB-90002'].subs.indexOf('GNOL_TuDong') !== -1, 'GNOL + nhãn phụ GNOL_TuDong từ summary');
log('BI4-multi-line', der['DCB-90003'].line === 'GNOL' && der['DCB-90003'].warn.some(w => w.indexOf('nhiều line') !== -1), 'Gắn BLOL+GNOL → chọn theo summary + cảnh báo');
log('BI4-scf-summary', der['DCB-90005'].line === 'SCF' && der['DCB-90005'].po === '', 'SCF từ summary · không có Reporter → PO trống (không ép theo line)');
log('BI4-no-sub-warn', der['DCB-90001'].warn.indexOf('Thiếu Sub-task UI') !== -1 && der['DCB-90001'].warn.indexOf('Thiếu Sub-task BA') !== -1, 'Bảng tay cần UI + TLPT chưa xong mà chưa có sub-task → cảnh báo vi phạm');
log('BI4-ready', der['DCB-90004'].ready === true, 'DCB_Task + không cần UI + TLPT_Xong + golive → Đạt');
log('BI4-not-ready-ui', !der['DCB-90002'].ready && der['DCB-90002'].missing.join('|') === 'UI chưa xong', `Thiếu: ${der['DCB-90002'].missing.join(' · ')}`);
log('BI4-not-ready-all', der['DCB-90001'].missing.length === 4, `Ký số thiếu đủ 4 điều kiện (${der['DCB-90001'].missing.length})`);
log('BI4-golive', der['DCB-90004'].golive === '202611' && der['DCB-90004'].kyEff === '202611', 'Expect_Golive_202611 → kỳ hiệu lực 202611');
log('BI4-stale', der['DCB-90004'].staleDays === 44 && der['DCB-90004'].staleLevel === 'amber', `Không nhích ${der['DCB-90004'].staleDays} ngày → amber`);
log('BI4-no-okr', !('okr' in der['DCB-90002']) && !der['DCB-90002'].warn.some(w => /OKR/.test(w)), 'Bỏ theo dõi OKR (anh chốt 29/10)');
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
log('BI5-gas-payload', imp.wrote && imp.wrote.action === 'ticket-import' && imp.wrote.rows.length === 5 && imp.wrote.rows[0].length === 32, 'Gửi GAS ticket-import 5 dòng × 32 cột');

/* ── BI1/BI6 — render ── */
await page.evaluate(() => navigateTo('backlog-it'));
await page.waitForTimeout(300);
log('BI1-nav', !!(await page.$('[data-view="backlog-it"]')), 'Nav item [data-view="backlog-it"]');
log('BI1-section', await page.$eval('#view-backlog-it', el => el.style.display !== 'none'), 'Section hiển thị');
log('BI1-stat', (await page.$$('.tk-stat')).length === 5, '5 thẻ số liệu (bỏ OKR)');
log('BI1-pf', !!(await page.$('#tkTeamFilter.pf-select')) && !!(await page.$('#tkUserFilter.pf-select')), 'Bộ lọc chuẩn Team + Nhân sự');
const userOpts = await page.$$eval('#tkUserFilter option', os => os.map(o => o.textContent));
log('BI6-pf-label', userOpts.length === 3 && userOpts.includes('Po Hai') && userOpts.includes('Po Mot'), `Nhân sự = đúng tên Reporter Jira: ${userOpts.slice(1).join(' | ')}`);
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
await page.selectOption('#tkUserFilter', 'po hai');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI6-person', rows === 2, `Reporter "Po Hai" → 2 (thực tế ${rows})`);
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
const H = ex.head;
log('BI10-head', H.includes('Sẵn sàng chuyển IT') && H.includes('Người làm UI') && H.includes('Người làm BA') && !H.includes('OKR') && H.includes('Hệ thống') && H.includes('Nguồn yêu cầu (Loại YC NV)') && H.length === 30, `${H.length} cột bảng planning (có người làm UI/BA)`);
const cell = name => ex.row[H.indexOf(name)];
log('BI10-row', cell('Line') === 'BLOL' && cell('Hệ thống') === 'Biz' && cell('Sẵn sàng chuyển IT') === 'Đạt' && cell('Số ngày không nhích') === 44 && cell('PO (Reporter)') === 'Po Hai',
  `BLOL · ${cell('Sẵn sàng chuyển IT')} · ${cell('Số ngày không nhích')} ngày · PO ${cell('PO (Reporter)')}`);

/* ── BI12 — Sub-task UI/BA (rule team 29/10) ── */
const sub = await page.evaluate(() => {
  const mk = o => Object.assign(rowToTicket(new Array(24).fill('')), o);
  dbTickets = [
    mk({ key: 'DCB-90201', type: 'Story', summary: '[KySoHSTD][APP] Cha có UI + BA', status: 'To Do', priority: 'High',
         reporter: 'Po Hai <CVC-SPTDDN.CB>', updated: '2026-08-01', labels: 'HSTD, DCB_Task, Expect_Golive_202612' }),
    mk({ key: 'DCB-90202', type: 'Sub-task', summary: 'DCB-90201 [UI/UX][KySoHSTD][APP] Cha có UI + BA', status: 'In Progress',
         assignee: 'Thiet Ke <UI.IT>', reporter: 'Po Hai <CVC-SPTDDN.CB>', updated: '2026-10-28', labels: 'HSTD' }),
    mk({ key: 'DCB-90203', type: 'Sub-task', summary: 'DCB-90201 [BA][KySoHSTD][APP] Cha có UI + BA', status: 'Done',
         assignee: 'Ba Mot <BA.IT>', reporter: 'Po Hai <CVC-SPTDDN.CB>', updated: '2026-10-20', labels: 'HSTD' }),
    mk({ key: 'DCB-90204', type: 'Sub-task', summary: 'DCB-99999 [UI/UX] Cha không có trong file', status: 'To Do',
         reporter: 'Po Hai <CVC-SPTDDN.CB>', updated: '2026-10-28', labels: 'HSTD' }),
    mk({ key: 'DCB-90205', type: 'Sub-task', summary: 'DCB-90201 Sub-task quên thẻ', status: 'To Do', reporter: 'Po Hai <CVC-SPTDDN.CB>', labels: 'HSTD' }),
  ];
  const idx = tkSubIndex(dbTickets);
  const d1 = tkDerive(dbTickets[0], new Date(2026, 9, 29), idx);
  const d5 = tkDerive(dbTickets[4], new Date(2026, 9, 29), idx);
  // UI sub-task xong → ready
  const done = dbTickets.map(t => t.key === 'DCB-90202' ? Object.assign({}, t, { status: 'Done' }) : t);
  const d1b = tkDerive(done[0], new Date(2026, 9, 29), tkSubIndex(done));
  renderBacklogIt();
  const rowsTxt = [...document.querySelectorAll('.tk-row')].map(r => r.textContent);
  return { idx: Object.keys(idx), d1, d5, d1b, nRows: rowsTxt.length, rowsTxt,
    parentKind: [tkParentKey(dbTickets[1]), tkSubKind(dbTickets[1]), tkSubKind(dbTickets[2])] };
});
log('BI12-parent-key', sub.parentKind.join('|') === 'DCB-90201|UI|BA', `Ghép theo KEY đầu summary: ${sub.parentKind.join(' · ')}`);
log('BI12-ui-state', sub.d1.ui === 'Đang' && sub.d1.uiBy.join() === 'Thiet Ke', `UI = ${sub.d1.ui} · ${sub.d1.uiBy.join()}`);
log('BI12-ba-state', sub.d1.tlpt === 'Xong' && sub.d1.baBy.join() === 'Ba Mot', `TLPT (BA) = ${sub.d1.tlpt} · ${sub.d1.baBy.join()}`);
log('BI12-not-ready', !sub.d1.ready && sub.d1.missing.join('|') === 'UI chưa xong', `Thiếu: ${sub.d1.missing.join(' · ')}`);
log('BI12-ready-after', sub.d1b.ready === true, 'Sub-task UI Done → ticket cha Đạt');
log('BI12-stale-sub', sub.d1.staleDays === 1, `Không nhích tính theo sub-task mới nhất: ${sub.d1.staleDays} ngày (cha cập nhật 01/08)`);
log('BI12-rows', sub.nRows === 2 && sub.rowsTxt.some(t => t.includes('Sub-task của DCB-99999')) && !sub.rowsTxt.some(t => t.startsWith('DCB-90202')),
  `Bảng: sub-task gộp vào cha · mồ côi hiện riêng (${sub.nRows} dòng)`);
log('BI12-subline', sub.rowsTxt.some(t => t.includes('DCB-90202') && t.includes('Thiet Ke') && t.includes('DCB-90203') && t.includes('Sub-task khác 1')), 'Dòng cha hiện sub-task UI/BA + người phụ trách + "Sub-task khác"');
log('BI12-untagged', sub.d5.subKind === 'Khác' && !sub.d5.warn.some(w => /thẻ/.test(w)), 'Sub-task việc dev (không UI/BA) → "Khác", không báo vi phạm');
await shot(page, '03_subtask');

/* ── BI11 — file HTML xuất Jira (Jira cơ quan chỉ cho xuất HTML) ── */
const html = await page.evaluate(() => {
  const doc = `<html><head><title>Jira</title></head><body>
    <table border="1"><tr><td colspan="11"><img alt="Jira"></td></tr>
      <tr><td colspan="11"><a href="#">Jira</a></td></tr>
      <tr><td colspan="11">Displaying <strong>2</strong> issues at <strong>29/Oct/26 8:58 AM</strong>.</td></tr></table>
    <issuetable-web-component data-content="issues"><table id="issuetable" border="1">
      <thead><tr class="rowHeader">
        <th class="colHeaderLink headerrow-issuetype" data-id="issuetype">
            Issue Type
        </th>
        <th data-id="issuekey"> Key </th><th data-id="summary"> Summary </th><th data-id="description"> Description </th>
        <th data-id="assignee"> Assignee </th><th data-id="reporter"> Reporter </th><th data-id="priority"> Priority </th>
        <th data-id="status"> Status </th><th data-id="resolution"> Resolution </th><th data-id="created"> Created </th>
        <th data-id="updated"> Updated </th><th data-id="labels"> Labels </th></tr></thead>
      <tbody>
        <tr id="issuerow1" data-issuekey="DCB-90101" class="issuerow">
          <td class="issuetype">    Story
</td>
          <td class="issuekey"><a class="issue-link" href="#">DCB-90101</a></td>
          <td class="summary"><p>
                [KySoHSTD][APP] Ticket HTML giả lập
    </p></td>
          <td class="description">Dòng một<br>Dòng hai</td>
          <td class="assignee">            Dev Mot &lt;TN-EDF.IT&gt;
    </td>
          <td class="reporter">Po Hai &lt;CVC-SPTDDN.CB&gt;</td>
          <td class="priority">           High
    </td>
          <td class="status"><span class="jira-issue-status-lozenge">To Do</span></td>
          <td class="resolution">    <em>Unresolved</em></td>
          <td class="created"> 28/Oct/26 4:56 PM </td>
          <td class="updated"> 28/Oct/26 4:56 PM </td>
          <td class="labels">    HSTD</td>
        </tr>
        <tr id="issuerow2" data-issuekey="DCB-90102" class="issuerow">
          <td class="issuetype">Story</td>
          <td class="issuekey"><a class="issue-link" href="#">DCB-90102</a></td>
          <td class="summary"><p>[KySoHSTD][WEB] Ticket đã golive</p></td>
          <td class="description"></td>
          <td class="assignee">Dev Mot &lt;TN-EDF.IT&gt;</td>
          <td class="reporter">Po Hai &lt;CVC-SPTDDN.CB&gt;</td>
          <td class="priority">Medium</td>
          <td class="status"><span>Done</span></td>
          <td class="resolution">Done</td>
          <td class="created"> 03/Sep/26 9:10 AM </td>
          <td class="updated"> 09/Oct/26 6:02 PM </td>
          <td class="labels">    DCB, GOLIVE_20261009, HSTD, expect_Golive_202610</td>
        </tr>
      </tbody></table></issuetable-web-component></body></html>`;
  const r = tkParseWorkbook(tkHtmlToWorkbook(doc));
  const by = Object.fromEntries(r.tickets.map(t => [t.key, t]));
  const d2 = by['DCB-90102'] ? tkDerive(by['DCB-90102'], new Date(2026, 9, 29)) : {};
  return { n: r.tickets.length, sheets: r.sheets, a: by['DCB-90101'], b: by['DCB-90102'], d2,
    looks: [tkLooksHtml('Jira 2026-10-29T08_58_09+0700.html', ''), tkLooksHtml('x.xlsx', 'PK')] };
});
log('BI11-count', html.n === 2 && html.sheets.length === 1 && html.sheets[0].indexOf('issuetable') === 0, `HTML: 2 ticket, chỉ bảng issuetable (${html.sheets.join(', ')})`);
log('BI11-fields', html.a && html.a.type === 'Story' && html.a.summary === '[KySoHSTD][APP] Ticket HTML giả lập'
  && html.a.status === 'To Do' && html.a.priority === 'High' && html.a.resolution === 'Unresolved', 'Bỏ khoảng trắng/xuống dòng thừa, đọc span trạng thái');
log('BI11-entities', html.a && html.a.assignee === 'Dev Mot <TN-EDF.IT>', `&lt;…&gt; → "${html.a && html.a.assignee}"`);
log('BI11-desc-br', html.a && html.a.desc === 'Dòng một\nDòng hai', 'Description giữ xuống dòng từ <br>');
log('BI11-dates', html.a && html.a.created === '2026-10-28' && html.b.updated === '2026-10-09', `Ngày "28/Oct/26 4:56 PM" → ${html.a && html.a.created}`);
log('BI11-labels', html.b && html.b.labels === 'DCB, GOLIVE_20261009, HSTD, expect_Golive_202610', `Labels: ${html.b && html.b.labels}`);
log('BI11-golive', html.d2.golive === '202610' && html.d2.golivedOn === '2026-10-09' && html.d2.open === false, 'expect_Golive (chữ thường) → 202610 · GOLIVE_20261009 → đã golive · Done → đóng');
log('BI11-detect', html.looks[0] === true && html.looks[1] === false, 'Nhận diện file .html');

/* ── (tùy chọn) file thật, không commit ── */
const REAL_HTML = process.env.TK_REAL_HTML;
if (REAL_HTML && fs.existsSync(REAL_HTML)) {
  const txt = fs.readFileSync(REAL_HTML, 'utf-8');
  const realH = await page.evaluate((txt) => {
    const r = tkParseWorkbook(tkHtmlToWorkbook(txt));
    const today = new Date();
    const idx = tkSubIndex(r.tickets);
    return { n: r.tickets.length, rows: r.tickets.map(t => { const d = tkDerive(t, today, idx);
      return [t.key, t.type, t.status, t.priority, d.line, t.created, t.updated, t.labels, d.golive, d.golivedOn, d.open ? 'mở' : 'đóng',
        d.isSub ? 'cha=' + d.parentKey + ' ' + d.subKind : 'UI=' + d.ui + (d.uiBy.length ? '(' + d.uiBy.join() + ')' : '') + ' TLPT=' + d.tlpt,
        'PO=' + d.po, d.ready ? 'Đạt' : 'Chưa: ' + d.missing.join('/')]; }) };
  }, txt);
  console.log(`\n   [HTML thật] ${realH.n} ticket`);
  if (realH.n <= 30) realH.rows.forEach(r => console.log('   ' + r.join(' | ')));
  else {
    // File lớn: chỉ in thống kê (không in nội dung ticket)
    const cnt = f => realH.rows.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
    console.log('   line:', JSON.stringify(cnt(r => r[4] || '(trống)')));
    console.log('   PO:', JSON.stringify(cnt(r => r[12])));
    console.log('   sub-task kind:', JSON.stringify(cnt(r => r[1].toLowerCase().startsWith('sub') ? (r[11].split(' ')[1] || '(không rõ)') : 'cha')));
    console.log('   ngày trống:', realH.rows.filter(r => !r[5] || !r[6]).length, '· mở:', realH.rows.filter(r => r[10] === 'mở').length);
  }
  const withLine = realH.rows.filter(r => r[4]).length;
  log('REAL-HTML', realH.n > 0 && realH.rows.every(r => r[5] && r[6]) && withLine >= realH.n * 0.98,
    `HTML thật: ${realH.n} ticket, đủ ngày, có line ${withLine}/${realH.n} (còn lại = cảnh báo "Chưa xác định line")`);
}
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

const dts = await page.evaluate(() => [tkParseDate('Thu Oct 29 2026 15:55:00 GMT+0700 (GMT+07:00)'), tkParseDate('28/10/2026 16:56'), tkParseDate('2026-10-29 08:55')]);
log('BI3-date-sheet', dts[0] === '2026-10-29' && dts[1] === '2026-10-28' && dts[2] === '2026-10-29', `String(Date) / dd/MM/yyyy HH:mm / ISO giờ → ${dts.join(' · ')}`);

/* ── BI13 — Project > Component > Label · hệ thống · đóng theo Resolution · golive quá hạn · sub-task theo từ đầu ── */
const r13 = await page.evaluate(() => {
  const mk = o => Object.assign(rowToTicket(new Array(31).fill('')), o);
  const T = new Date(2026, 9, 29);
  const list = [
    mk({ key: 'BLOB-1', type: 'Story', summary: '[GNOL] Ticket BPM', project: 'Bảo Lãnh online (BLOL)', components: 'Giải ngân online', labels: 'GNOL', status: 'Open', resolution: 'Unresolved', reporter: 'Po Hai <X>' }),
    mk({ key: 'DCB-1', type: 'Story', summary: 'Không tiền tố', project: 'Digital CB', components: 'SCF', labels: 'BLOL', status: 'To Do', resolution: 'Unresolved' }),
    mk({ key: 'DCB-2', type: 'Story', summary: 'x', project: 'Digital CB', components: 'Notifications BIZ', status: 'To Do' }),
    mk({ key: 'DCB-3', type: 'Story', summary: 'x', project: 'Digital CB', components: 'Bảo lãnh online, Chứng từ số, Giải ngân online', status: 'To Do' }),
    mk({ key: 'DCB-4', type: 'Story', summary: 'x', project: 'Digital CB', labels: 'HSTD, Expect_Golive_202604', status: 'To Do' }),
    mk({ key: 'GNOL-9', type: 'Story', summary: 'x', project: 'Giải Ngân Online (GNOL.EndToEnd)', status: 'Resolved', resolution: 'Fixed', resolvedAt: '2026-10-27' }),
    mk({ key: 'DCB-5', type: 'Story', summary: 'Cha', project: 'Digital CB', components: 'Bảo lãnh online', status: 'To Do',
         subKeys: 'DCB-6, DCB-7, DCB-8, DCB-99', goliveDate: '2026-12-15', receivedAt: '2026-06-17' }),
    mk({ key: 'DCB-6', type: 'Sub-task', summary: 'DCB-5 [BLOL - APP] UI Từ chối giao dịch', status: 'To Do', assignee: 'Thiet Ke <UI>' }),
    mk({ key: 'DCB-7', type: 'Sub-task', summary: 'DCB-5 BA - Admin bổ sung', status: 'In Progress', assignee: 'Ba Mot <BA>' }),
    mk({ key: 'DCB-8', type: 'Sub-task', summary: 'DCB-5 Cập nhật TLPT', status: 'Done', resolution: 'Done' }),
  ];
  const idx = tkSubIndex(list);
  const by = Object.fromEntries(list.map(t => [t.key, tkDerive(t, T, idx)]));
  const pick = k => ({ line: by[k].line, src: by[k].lineSrc, sys: by[k].system, open: by[k].open, warn: by[k].warn, golive: by[k].golive,
    ui: by[k].ui, tlpt: by[k].tlpt, kind: by[k].subKind, out: by[k].subOutside, recv: by[k].receivedDays, uiSubs: by[k].uiSubs.length, baSubs: by[k].baSubs.length });
  return Object.fromEntries(list.map(t => [t.key, pick(t.key)]));
});
log('BI13-project-first', r13['BLOB-1'].line === 'BLOL' && r13['BLOB-1'].src === 'Project' && r13['BLOB-1'].sys === 'BPM'
  && r13['BLOB-1'].warn.some(w => w.indexOf('Label line lệch') !== -1), `Project > Component > Label: BLOB-1 → ${r13['BLOB-1'].line} (${r13['BLOB-1'].src}, ${r13['BLOB-1'].sys}) + cảnh báo label lệch`);
log('BI13-component', r13['DCB-1'].line === 'SCF' && r13['DCB-1'].src === 'Component' && r13['DCB-1'].sys === 'Biz', `Digital CB + component SCF → ${r13['DCB-1'].line} (${r13['DCB-1'].src}, ${r13['DCB-1'].sys})`);
log('BI13-chung', r13['DCB-2'].line === 'Chung', `Notifications BIZ → ${r13['DCB-2'].line}`);
log('BI13-multi-comp', r13['DCB-3'].line === 'BLOL', `Nhiều component → line đầu tiên khác "Chung": ${r13['DCB-3'].line}`);
log('BI13-label-fallback', r13['DCB-4'].line === 'HSTD' && r13['DCB-4'].src === 'Label', `Không project/component → label: ${r13['DCB-4'].line}`);
log('BI13-golive-overdue', r13['DCB-4'].warn.some(w => w.indexOf('Quá tháng golive') !== -1), 'Expect_Golive_202604 còn mở → "Quá tháng golive dự kiến"');
log('BI13-resolution', r13['GNOL-9'].open === false && r13['GNOL-9'].line === 'GNOL' && r13['GNOL-9'].sys === 'BPM', 'Status Resolved + Resolution Fixed → đóng · project GNOL.EndToEnd → GNOL/BPM');
log('BI13-golive-field', r13['DCB-5'].golive === '202612' && r13['DCB-5'].recv === 134, `Trường "Ngày dự kiến golive" → ${r13['DCB-5'].golive} · nhận YC ${r13['DCB-5'].recv} ngày`);
log('BI13-sub-leading', r13['DCB-6'].kind === 'UI' && r13['DCB-7'].kind === 'BA' && r13['DCB-8'].kind === 'BA',
  `"[BLOL - APP] UI …" → ${r13['DCB-6'].kind} · "BA - …" → ${r13['DCB-7'].kind} · "Cập nhật TLPT" → ${r13['DCB-8'].kind}`);
log('BI13-sub-state', r13['DCB-5'].ui === 'Cần' && r13['DCB-5'].tlpt === 'Đang' && r13['DCB-5'].baSubs === 2, `Cha: UI ${r13['DCB-5'].ui} · BA ${r13['DCB-5'].tlpt} (1 Done + 1 In Progress)`);
log('BI13-sub-outside', r13['DCB-5'].out === 1 && r13['DCB-5'].warn.some(w => w.indexOf('ngoài file') !== -1), 'Cột Sub-Tasks liệt kê DCB-99 không có trong file → "1 sub-task ngoài file"');

/* ── BI14 — lọc Dự án · Trạng thái · Nhân sự theo họ tên SHTD + chọn/xóa hàng loạt theo quyền (v6.73) ── */
const r14 = await page.evaluate(() => {
  const mk = (o) => Object.assign(rowToTicket(new Array(31).fill('')), o);
  dbTickets = [
    mk({ key: 'DCB-801', type: 'Story', summary: '[GNOL] Của Tuân', status: 'To Do', project: 'Digital CB', components: 'Giải ngân online', reporter: 'Tuan Tran The <CG-SPTDDN.CB>', updated: '2026-10-20' }),
    mk({ key: 'DCB-802', type: 'Sub-task', summary: 'DCB-801 [UI/UX]Của Tuân', status: 'To Do', project: 'Digital CB', reporter: 'Dung Le Quang <CVCC-SPTDDN.CB>', updated: '2026-10-20' }),
    mk({ key: 'DCB-803', type: 'Story', summary: '[BLOL] Của Dũng', status: 'Open', project: 'Digital CB', components: 'Bảo lãnh online', reporter: 'Dung Le Quang <CVCC-SPTDDN.CB>', updated: '2026-10-20' }),
    mk({ key: 'BLOB-804', type: 'Improvement', summary: 'BPM của Tuân', status: 'Done', resolution: 'Done', project: 'Bảo Lãnh online (BLOL)', reporter: 'Tuan Tran The <CG-SPTDDN.CB>', updated: '2026-10-20' }),
  ];
  return {
    key: [tkNameKey('Tuan Tran The <CG-SPTDDN.CB>'), tkNameKey('Trần Thế Tuân'), tkNameKey('Dung Le Quang <CVCC-SPTDDN.CB> [X]'), tkNameKey('Lê Quang Dũng')],
    u: tkUserOf('Tuan Tran The <CG-SPTDDN.CB>', _appUsers),
    none: tkUserOf('Po Hai <CVC-SPTDDN.CB>', _appUsers),
  };
});
log('BI14-namekey', r14.key[0] === r14.key[1] && r14.key[2] === r14.key[3] && r14.key[0] === 'the tran tuan', `Jira "Tuan Tran The" ≡ "Trần Thế Tuân" → "${r14.key[0]}" · Dũng (đ, [X]) khớp`);
log('BI14-userof', r14.u && r14.u.username === 'TuanTT4' && r14.none === null, 'Reporter → user SHTD theo họ tên; không khớp → null');

await login('Admin');
await page.evaluate(() => { _tkPreset = 'open'; _tkProject = ''; _tkStatus = ''; _tkSel.clear(); renderBacklogIt(); });
const projOpts = await page.$$eval('#tkProjectFilter option', os => os.map(o => o.value));
const statOpts = await page.$$eval('#tkStatusFilter option', os => os.map(o => o.value));
log('BI14-proj-opts', projOpts.join('|') === '|Bảo Lãnh online (BLOL)|Digital CB', `Dự án lấy từ dữ liệu: ${projOpts.slice(1).join(' · ')}`);
log('BI14-status-opts', statOpts.join('|') === '|Done|Open|To Do', `Trạng thái lấy từ dữ liệu: ${statOpts.slice(1).join(' · ')}`);
const pfOpts = await page.$$eval('#tkUserFilter option', os => os.map(o => o.value + '=' + o.textContent));
log('BI14-pf-std', pfOpts.includes('tuantt4=TuanTT4-Trần Thế Tuân') && pfOpts.includes('dunglq1=DungLQ1-Lê Quang Dũng'), `Nhân sự nhãn chuẩn Username-Họ tên: ${pfOpts.slice(1).join(' | ')}`);
await page.selectOption('#tkProjectFilter', 'Digital CB');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI14-proj', rows === 2, `Dự án Digital CB → 2 dòng (sub-task gộp vào cha) (thực tế ${rows})`);
await page.selectOption('#tkProjectFilter', '');
await page.selectOption('#tkStatusFilter', 'Done');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI14-status-done', rows === 1, `Trạng thái Done → 1 (tự bỏ lọc "Đang mở") (thực tế ${rows})`);
await page.selectOption('#tkStatusFilter', '');
await page.selectOption('#tkUserFilter', 'tuantt4');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI14-person', rows === 2, `Nhân sự TuanTT4 → 2 (DCB-801 + BLOB-804) (thực tế ${rows})`);
await page.selectOption('#tkUserFilter', '');
const adminChk = await page.$$eval('.tk-sel', els => els.map(e => !e.disabled));
log('BI14-admin-all', adminChk.length === 3 && adminChk.every(Boolean), `Admin: ${adminChk.filter(Boolean).length}/${adminChk.length} dòng chọn được`);

// User thường (TuanTT4): chỉ ticket mình là PO
await login('User');
await page.evaluate(() => { window.uiConfirm = async () => true; window.__tkWrites = []; _tkSel.clear(); renderBacklogIt(); });
const userChk = await page.$$eval('.tk-row', els => els.map(e => e.querySelector('.tk-key').textContent + ':' + !e.querySelector('.tk-sel').disabled));
log('BI14-user-own', userChk.includes('DCB-801:true') && userChk.includes('BLOB-804:true') && userChk.includes('DCB-803:false'), `User: ${userChk.join(' · ')}`);
log('BI14-bar-hidden', !(await page.$eval('#tkBulkBar', el => el.classList.contains('visible'))), 'Chưa chọn → ẩn thanh hàng loạt');
await page.check('#tkChkAll');
const sel14 = await page.evaluate(() => ({ n: _tkSel.size, keys: [..._tkSel].sort(), bar: document.getElementById('tkBulkBar').classList.contains('visible'), txt: document.getElementById('tkBulkCount').textContent }));
log('BI14-select-all', sel14.n === 2 && sel14.keys.join() === 'BLOB-804,DCB-801' && sel14.bar && sel14.txt === '2 ticket đã chọn', `Chọn tất cả → chỉ ticket của mình: ${sel14.keys.join(', ')} · "${sel14.txt}"`);
log('BI14-no-modal', !(await page.$eval('#tkModal', el => el.classList.contains('open')).catch(() => false)), 'Tích ô không mở modal');
await shot(page, '04_bulk_select');
await page.uncheck('.tk-sel[data-key="BLOB-804"]');
log('BI14-uncheck', await page.evaluate(() => _tkSel.size === 1 && document.getElementById('tkChkAll').indeterminate), 'Bỏ 1 dòng → ô tổng ở trạng thái lửng');
await page.click('#tkBulkBar .btn-bulk.danger');
await page.waitForTimeout(250);
const del14 = await page.evaluate(() => ({ w: window.__tkWrites.find(x => x.action === 'ticket-delete-bulk'), left: dbTickets.map(t => t.key).sort() }));
log('BI14-payload', del14.w && del14.w.keys.slice().sort().join() === 'DCB-801,DCB-802', `Gửi GAS: ${del14.w && del14.w.keys.join(', ')} (kèm sub-task UI của cha)`);
log('BI14-local', del14.left.join() === 'BLOB-804,DCB-803', `Còn lại: ${del14.left.join(', ')}`);

// GAS: ticketDeleteBulk chặn quyền trên sheet giả lập
const vm = await import('vm');
const gasSrc = fs.readFileSync(path.join(__dirname, 'backend', 'TicketService.gs'), 'utf8');
function gasRun(role, username, keys, steps) {
  const H = ['Key', 'Issue Type', 'Summary']; const pad = r => { const o = new Array(32).fill(''); r.forEach((v, i) => { o[i] = v; }); return o; };
  const tk = (key, type, sum, rep, subs) => { const r = pad([key, type, sum]); r[8] = rep; r[27] = subs || ''; return r; };
  let data = [pad(['Key']),
    tk('DCB-801', 'Story', '[GNOL] A', 'Tuan Tran The <CG-SPTDDN.CB>', 'DCB-805'),
    tk('DCB-802', 'Sub-task', 'DCB-801 [UI/UX]A', 'Dung Le Quang <CVCC-SPTDDN.CB>'),
    tk('DCB-803', 'Story', '[BLOL] B', 'Dung Le Quang <CVCC-SPTDDN.CB>'),
    tk('DCB-805', 'Sub-task', 'Việc dev', 'Dung Le Quang <CVCC-SPTDDN.CB>')];
  data[0] = pad(H); data[0][31] = 'PO phụ trách';
  const users = [['Username', 'Display_Name', 'Team', 'Active'], ['TuanTT4', 'Trần Thế Tuân', 'Số', 'TRUE'], ['DungLQ1', 'Lê Quang Dũng', 'Số', 'TRUE'], ['OldUser', 'Cũ', 'Số', 'FALSE']];
  const rng = (r, c, nr, nc) => ({
    getDisplayValues: () => data.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)),
    setValues: v => { v.forEach((row, i) => { const t = data[r - 1 + i] || (data[r - 1 + i] = pad([])); row.forEach((x, j) => { t[c - 1 + j] = x; }); }); },
    clearContent: () => { data = data.slice(0, r - 1); },
  });
  const sheet = { getMaxColumns: () => 32, getLastRow: () => data.length, getRange: rng, insertColumnsAfter() {}, setFrozenRows() {} };
  const ctx = { SPREADSHEET_ID: 'x', USER_SHEET_NAME: 'User_Master', _acquireWriteLock: () => ({ releaseLock() {} }),
    SpreadsheetApp: { flush() {}, openById: () => ({ getSheetByName: n => n === 'User_Master' ? { getDataRange: () => ({ getDisplayValues: () => users }) } : sheet }) } };
  vm.createContext(ctx); vm.runInContext(gasSrc, ctx);
  if (steps) return steps(ctx, () => data);
  const res = ctx.ticketDeleteBulk(keys, username, role);
  return { res, left: data.slice(1).map(r => r[0]) };
}
const g1 = gasRun('User', 'TuanTT4', ['DCB-801', 'DCB-802', 'DCB-803', 'DCB-805']);
log('BI14-gas-owner', g1.res.deleted === 3 && g1.res.denied.join() === 'DCB-803' && g1.left.join() === 'DCB-803',
  `User xóa: ${g1.res.deleted} (cha + sub-task theo summary + theo cột Sub-Tasks) · chặn ${g1.res.denied.join(', ')} · còn ${g1.left.join(', ')}`);
const g2 = gasRun('User', 'DungLQ1', ['DCB-801']);
log('BI14-gas-denied', g2.res.deleted === 0 && g2.res.denied.join() === 'DCB-801' && g2.left.length === 4, 'Xóa ticket người khác → bị chặn, sheet giữ nguyên');
const g3 = gasRun('Admin', 'TuanTT4', ['DCB-801', 'DCB-803']);
log('BI14-gas-admin', g3.res.deleted === 2 && !g3.res.denied.length && g3.left.join() === 'DCB-802,DCB-805', 'Admin xóa mọi ticket');

/* ── BI15 — giao hàng loạt cho PO khác của team (cột PO phụ trách, v6.74) ── */
// GAS: chủ ticket giao → người nhận thành chủ; người giao mất quyền; user không Active / không tồn tại → BAD_USER
const g4 = gasRun(null, null, null, (ctx, data) => {
  const a = ctx.ticketAssignBulk(['DCB-801', 'DCB-803'], 'dunglq1', 'TuanTT4', 'User');
  const col = data().slice(1).map(r => r[0] + '=' + r[31]).join(',');
  const afterTuan = ctx.ticketDeleteBulk(['DCB-801'], 'TuanTT4', 'User');
  const afterDung = ctx.ticketDeleteBulk(['DCB-801', 'DCB-802'], 'DungLQ1', 'User');
  let bad = ''; try { ctx.ticketAssignBulk(['DCB-803'], 'OldUser', 'TuanTT4', 'Admin'); } catch (e) { bad = e.message; }
  let none = ''; try { ctx.ticketAssignBulk(['DCB-803'], 'khongco', 'TuanTT4', 'Admin'); } catch (e) { none = e.message; }
  return { a, col, afterTuan, afterDung, bad, none, left: data().slice(1).map(r => r[0]).join(',') };
});
log('BI15-gas-assign', g4.a.assigned === 1 && g4.a.denied.join() === 'DCB-803' && g4.col.startsWith('DCB-801=DungLQ1,DCB-802=,DCB-803=,'),
  `Tuân giao DCB-801 → ghi username chuẩn "DungLQ1" · DCB-803 (của Dũng) bị chặn: ${g4.col}`);
log('BI15-gas-owner-moves', g4.afterTuan.deleted === 0 && g4.afterDung.deleted === 2 && g4.left === 'DCB-803,DCB-805',
  'Sau khi giao: Tuân mất quyền · Dũng xóa được cha + sub-task');
log('BI15-gas-bad-user', g4.bad === 'BAD_USER' && g4.none === 'BAD_USER', 'Người nhận không Active / không tồn tại → BAD_USER');

// FE
await login('Admin');
const r15 = await page.evaluate(async () => {
  const mk = (o) => Object.assign(rowToTicket(new Array(32).fill('')), o);
  dbTickets = [
    mk({ key: 'DCB-901', type: 'Story', summary: '[GNOL] A', status: 'To Do', project: 'Digital CB', reporter: 'Tuan Tran The <CG-SPTDDN.CB>', updated: '2026-10-20' }),
    mk({ key: 'DCB-902', type: 'Story', summary: '[GNOL] B', status: 'To Do', project: 'Digital CB', reporter: 'Tuan Tran The <CG-SPTDDN.CB>', updated: '2026-10-20' }),
    mk({ key: 'DCB-903', type: 'Story', summary: '[BLOL] C', status: 'To Do', project: 'Digital CB', reporter: 'Dung Le Quang <CVCC-SPTDDN.CB>', updated: '2026-10-20' }),
  ];
  _tkSel.clear(); _tkPreset = 'open'; renderBacklogIt();
  return { opts: [...document.querySelectorAll('#tkAssignTo option')].map(o => o.value + '=' + o.textContent) };
});
log('BI15-team-list', r15.opts.length === 4 && r15.opts.includes('QuangNN3=QuangNN3-Nguyễn Ngọc Quang') && r15.opts[0] === '=Giao cho…',
  `Ô "Giao cho…" = nhân sự team Số, nhãn chuẩn: ${r15.opts.slice(1).join(' | ')}`);
await page.evaluate(() => { window.__tkWrites = []; window.uiConfirm = async () => true; });
await page.check('.tk-sel[data-key="DCB-901"]');
await page.check('.tk-sel[data-key="DCB-902"]');
await page.click('#tkBulkBar .btn-bulk:not(.danger) >> text=Giao');
await page.waitForTimeout(200);
log('BI15-need-target', await page.evaluate(() => !window.__tkWrites.length && _tkSel.size === 2), 'Chưa chọn người nhận → không gửi, giữ lựa chọn');
await shot(page, '05_bulk_assign');
await page.selectOption('#tkAssignTo', 'QuangNN3');
await page.click('#tkBulkBar .btn-bulk:not(.danger) >> text=Giao');
await page.waitForTimeout(250);
const a15 = await page.evaluate(() => ({
  w: window.__tkWrites.find(x => x.action === 'ticket-assign-bulk'),
  po: dbTickets.map(t => t.key + '=' + t.poAssign).join(','),
  cell: [...document.querySelectorAll('.tk-row')].map(r => r.textContent).find(t => t.includes('DCB-901')) || '',
}));
log('BI15-payload', a15.w && a15.w.to === 'QuangNN3' && a15.w.keys.slice().sort().join() === 'DCB-901,DCB-902', `Gửi GAS: ${a15.w && a15.w.keys.join(', ')} → ${a15.w && a15.w.to}`);
log('BI15-local', a15.po === 'DCB-901=QuangNN3,DCB-902=QuangNN3,DCB-903=', `Cục bộ: ${a15.po}`);
log('BI15-cell', a15.cell.includes('QuangNN3-Nguyễn Ngọc Quang') && a15.cell.includes('Jira: Tuan Tran The'), 'Ô PO: người nhận (nhãn chuẩn) + "Jira: Reporter"');
await page.selectOption('#tkUserFilter', 'quangnn3');
rows = await page.$$eval('.tk-row', els => els.length);
log('BI15-filter', rows === 2, `Lọc Nhân sự QuangNN3 → 2 ticket vừa giao (thực tế ${rows})`);
await page.selectOption('#tkUserFilter', '');
// Tuân (User) mất quyền với ticket đã giao; nạp lại Jira không xóa phần giao
await login('User');
await page.evaluate(() => { _tkSel.clear(); renderBacklogIt(); });
const u15 = await page.$$eval('.tk-row', els => els.map(e => e.querySelector('.tk-key').textContent + ':' + !e.querySelector('.tk-sel').disabled).join(' · '));
log('BI15-user-lost', u15.includes('DCB-901:false') && u15.includes('DCB-902:false'), `Tuân sau khi giao: ${u15}`);
const keep15 = await page.evaluate(() => {
  _mergeTicketsLocal([Object.assign(rowToTicket(new Array(32).fill('')), { key: 'DCB-901', summary: '[GNOL] A v2', status: 'In Progress', reporter: 'Tuan Tran The <CG-SPTDDN.CB>' })]);
  const t = dbTickets.find(x => x.key === 'DCB-901');
  return t.poAssign + '|' + t.status;
});
log('BI15-import-keeps', keep15 === 'QuangNN3|In Progress', `Nạp lại Jira: giữ PO phụ trách, cập nhật cột Jira (${keep15})`);
await login('Admin');

log('BIX-no-js-errors', jsErrors.length === 0, jsErrors.length ? jsErrors.join(' | ') : 'Không lỗi JS');

console.log(`\n${passed} passed · ${failed} failed`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
