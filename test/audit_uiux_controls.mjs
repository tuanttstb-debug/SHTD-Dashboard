/**
 * audit_uiux_controls.mjs — đo lệch nút / ô nhập / select theo từng màn (UI/UX đợt nâng cấp khung)
 *
 *  Với mỗi view × khổ (1366, 390):
 *   - Hàng điều khiển: phần tử cha có ≥2 control (button/select/input/a.btn) hiển thị, cùng hàng (top lệch < 12px)
 *     → lệch chiều cao (max−min > 1px) hoặc lệch đáy (bottom) > 1px = 1 "hàng lệch"
 *   - Thang chiều cao control đang dùng (đếm theo px)
 *   - Tràn ngang trang (scrollWidth > innerWidth)
 *   - Control < 36px trên khổ điện thoại
 *
 * Run: node test/audit_uiux_controls.mjs [--json out.json]
 * EVD: test-results/uiux_audit/
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3097;
const EVD_DIR = path.join(ROOT, 'test-results', 'uiux_audit');
fs.mkdirSync(EVD_DIR, { recursive: true });
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : path.join(EVD_DIR, 'audit.json');

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const fp = path.join(ROOT, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(fp)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

const USER_ADMIN = { username: 'TuanTT4', role: 'Admin', team: 'Số', displayName: 'Tuấn TT (Admin)' };
const WIDTHS = [1366, 390];

const browser = await chromium.launch({ headless: true });
const report = { generated: new Date().toISOString(), views: [] };

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: width > 500 ? 900 : 844 } });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  await page.route('**/script.google.com/**', r => r.abort());
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(u => localStorage.setItem('shtd_auth_v1', JSON.stringify({ token: 'mock', exp: Date.now() + 86400000, user: u })), USER_ADMIN);
  await page.reload({ waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const lo = document.getElementById('loginOverlay'); if (lo) lo.style.display = 'none'; });
  // dữ liệu giả để màn có toolbar/bảng (không có dữ liệu thật)
  await page.evaluate(() => {
    const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}/${x.getFullYear()}`; };
    const teams = ['Số', 'CV', 'PTKD MB', 'PTKD MN', 'BL'];
    db.tasks = Array.from({ length: 30 }, (_, i) => ({ id: `T-26-${String(i).padStart(3,'0')}`, name: `Task mẫu số ${i} có tên khá dài để thử xuống dòng trên điện thoại`, initiative: i % 3 ? 'INI-01' : 'BAU', category: ['Dev','Test','BAU'][i%3], milestone: '', team: teams[i%5], picAcc: 'TuanTT4', picRes: i%2 ? 'TuanTT4' : 'DungNT', endDate: d(i-10), startDate: d(i-30), state: ['Đang thực hiện','Chưa bắt đầu','Hoàn thành','Tạm dừng'][i%4], progress: String((i*7)%100), highlight: i%5?'N':'Y', rag: ['Đỏ','Vàng','Xanh'][i%3], result: 'Ghi chú tuần', tuanBC: '', canBLD: i%4?'':'Y', status: '' }));
    db.initiatives = [{ id:'INI-01', name:'Sản phẩm tín dụng online', type:'initiative', status:'Active', accountable:'TuanTT4', parentId:'', category:'Chuyển đổi số' }, { id:'INI-01-MS1', name:'Milestone 1', type:'milestone', status:'Active', accountable:'TuanTT4', parentId:'INI-01', category:'' }];
    if (typeof dbCases !== 'undefined') dbCases = Array.from({ length: 8 }, (_, i) => ({ id:`C-26-00${i}`, caseName:`Case mẫu ${i}`, team: i%2?'PTKD MB':'PTKD MN', stage:['Khởi tạo','Thương thảo','Thẩm định'][i%3], deadline: d(i-3), giaTriTy: String(i+2), dvkd:'Chi nhánh A', pic:'TuanTT4' }));
  });

  const views = await page.$$eval('.nav-item[data-view]', els => [...new Set(els.map(e => e.dataset.view))]);
  for (const view of views) {
    await page.evaluate(v => { try { navigateTo(v); } catch (e) { console.error(e); } }, view);
    await page.waitForTimeout(450);
    const r = await page.evaluate(() => {
      const vis = el => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
      const scope = [...document.querySelectorAll('.view-section')].find(s => getComputedStyle(s).display !== 'none') || document.body;
      // nhóm nút chuyển chế độ (segmented) đo theo cả nhóm; thẻ thống kê (.tk-stat) không phải nút điều khiển
      const SEG = '.scope-toggle,.mw-view-toggle,.cp-view-toggle,.ap-period-group,.ap-rag-group,.it-trend-toggle';
      const raw = [...scope.querySelectorAll('button, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]), a.btn')]
        .filter(vis).filter(c => !c.closest('.tk-stat, .init-toggle-bar, .popup-tabs, .preset-bar, .page-btn'));
      const ctrls = [...new Set(raw.map(c => (c.parentElement && c.parentElement.matches(SEG)) ? c.parentElement : c))];
      const heights = {};
      ctrls.forEach(c => { const h = Math.round(c.getBoundingClientRect().height); heights[h] = (heights[h] || 0) + 1; });
      // gom theo cha trực tiếp, chỉ control cùng hàng
      const byParent = new Map();
      ctrls.forEach(c => { const p = c.parentElement; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p).push(c); });
      const bad = [];
      for (const [p, list] of byParent) {
        if (list.length < 2) continue;
        const rows = [];
        list.forEach(c => { const b = c.getBoundingClientRect(); let row = rows.find(rw => Math.abs(rw.top - b.top) < 12); if (!row) rows.push(row = { top: b.top, items: [] }); row.items.push({ c, b }); });
        rows.forEach(rw => {
          if (rw.items.length < 2) return;
          const hs = rw.items.map(i => i.b.height), bs = rw.items.map(i => i.b.bottom);
          const dh = Math.max(...hs) - Math.min(...hs), db = Math.max(...bs) - Math.min(...bs);
          if (dh > 1 || db > 1) {
            const cls = (p.className && typeof p.className === 'string') ? p.className.split(' ')[0] : p.tagName.toLowerCase();
            bad.push({ parent: cls, dh: Math.round(dh), db: Math.round(db), items: rw.items.map(i => `${i.c.tagName.toLowerCase()}.${(i.c.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')}:${Math.round(i.b.height)}`) });
          }
        });
      }
      const small = ctrls.filter(c => c.getBoundingClientRect().height < 36).length;
      const SCALE = [28, 32, 36, 40];
      const off = {};
      ctrls.filter(c => c.tagName !== 'TEXTAREA').forEach(c => { const h = Math.round(c.getBoundingClientRect().height); if (!SCALE.includes(h)) { const k = `${c.tagName.toLowerCase()}.${(c.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')}:${h}`; off[k] = (off[k] || 0) + 1; } });
      return { nCtrl: ctrls.length, heights, bad, small, off, overflow: document.documentElement.scrollWidth - window.innerWidth };
    });
    report.views.push({ width, view, ...r });
    if (r.bad.length || process.env.SHOTS) await page.screenshot({ path: path.join(EVD_DIR, `${width}_${view}.png`) });
  }
  report[`jsErrors_${width}`] = [...new Set(jsErrors)].slice(0, 10);
  await page.close();
}
await browser.close();
server.close();
fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));

// tóm tắt
for (const width of WIDTHS) {
  const vs = report.views.filter(v => v.width === width);
  const all = {}; vs.forEach(v => Object.entries(v.heights).forEach(([h, n]) => all[h] = (all[h] || 0) + n));
  console.log(`\n=== ${width}px · ${vs.length} màn · hàng lệch: ${vs.reduce((s, v) => s + v.bad.length, 0)} · màn tràn ngang: ${vs.filter(v => v.overflow > 0).length}`);
  console.log('  thang chiều cao control (px:số): ' + Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([h, n]) => `${h}:${n}`).join(' '));
  vs.filter(v => v.bad.length || v.overflow > 0 || (width < 500 && v.small)).forEach(v =>
    console.log(`  ${v.view.padEnd(20)} ctrl=${String(v.nCtrl).padStart(3)} lệch=${v.bad.length}${v.overflow > 0 ? ` tràn=${v.overflow}px` : ''}${width < 500 ? ` <36px=${v.small}` : ''}${v.bad[0] ? `  vd [${v.bad[0].parent}] Δh${v.bad[0].dh} Δđáy${v.bad[0].db}: ${v.bad[0].items.join(' | ')}` : ''}`));
  const offAll = {}; vs.forEach(v => Object.entries(v.off || {}).forEach(([k, n]) => offAll[`${v.view} ${k}`] = n));
  const offKeys = Object.keys(offAll);
  console.log(`  ngoài thang 28/32/36/40: ${offKeys.length} loại`);
  offKeys.slice(0, 40).forEach(k => console.log(`    ${k}×${offAll[k]}`));
  if (report[`jsErrors_${width}`].length) console.log('  JS errors:', report[`jsErrors_${width}`].join(' || '));
}
console.log(`\nJSON: ${jsonOut}`);
// cổng chặn UI/UX v2: 0 hàng lệch · mọi control nằm trên thang 28/32/36/40 · không tràn ngang
const nBad = report.views.reduce((s, v) => s + v.bad.length + Object.keys(v.off || {}).length + (v.overflow > 0 ? 1 : 0), 0);
console.log(nBad ? `❌ UI/UX audit: ${nBad} lỗi` : '✅ UI/UX audit: 0 lệch · 0 ngoài thang · 0 tràn ngang');
process.exit(nBad ? 1 : 0);
