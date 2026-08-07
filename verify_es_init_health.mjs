/**
 * verify_es_init_health.mjs — S66: Executive Summary "Sức khỏe từng Initiative"
 *   - cột Tên + Phụ trách (join db.initiatives), filter theo Category, click → popup
 *   - droplist Category đồng nhất (modal Thêm + filter) + có "Bất Động Sản"
 * Port: 3047 · Run: node verify_es_init_health.mjs
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3047;

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(filePath);
  const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
                 '.mjs':'application/javascript', '.json':'application/json' }[ext] || 'text/plain';
  res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
  fs.createReadStream(filePath).pipe(res);
});
await new Promise(r => server.listen(PORT, r));

const MOCK_USER = { username:'TuanTT4', role:'Admin', team:'Số', displayName:'Tuấn TT4' };
const today = new Date().toISOString().split('T')[0];

const B = { startDate:'', milestone:'', category:'', picAcc:'', noiDungBLD:'', yKienBLD:'', highlight:'N',
            canBLD:'N', vuongMac:'', nextPlan:'', result:'', tuanBC:'' };
const MOCK_TASKS = [
  { ...B, id:'T1', name:'a', state:'Đang thực hiện', progress:'40', status:'Red',   initiative:'SCF-001', team:'Số', picRes:'A', endDate:today },
  { ...B, id:'T2', name:'b', state:'Hoàn thành',     progress:'100',status:'Green', initiative:'SCF-001', team:'Số', picRes:'A', endDate:today },
  { ...B, id:'T3', name:'c', state:'Đang thực hiện', progress:'50', status:'Amber', initiative:'BDS-001', team:'BL', picRes:'B', endDate:today },
  { ...B, id:'T4', name:'d', state:'Đang thực hiện', progress:'10', status:'Green', initiative:'BAU',     team:'Số', picRes:'A', endDate:today },
];
const MOCK_INITS = [
  { id:'SCF-001', name:'Số hóa chuỗi cung ứng', category:'Số hóa',       accountable:'Nguyen Van A', status:'Active', parentId:null, type:'initiative', pct:60 },
  { id:'BDS-001', name:'Dự án Bất Động Sản',    category:'Bất Động Sản', accountable:'Tran Thi B',   status:'Active', parentId:null, type:'initiative', pct:50 },
];

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));

await page.goto(`http://localhost:${PORT}/`);
await page.waitForTimeout(400);
await page.evaluate(({ tasks, inits, user }) => {
  db.tasks = tasks;
  db.initiatives = inits;
  localStorage.setItem('shtd_auth_v1', JSON.stringify({ token:'mock', exp:Date.now()+86400000, user }));
  const lo = document.getElementById('loginOverlay'); if (lo) lo.style.display = 'none';
}, { tasks: MOCK_TASKS, inits: MOCK_INITS, user: MOCK_USER });

// Render Initiative Tracker first (để dựng modal #initFCat), rồi Executive Summary
await page.evaluate(() => { navigateTo('initiative-tracker'); });
await page.waitForTimeout(300);
await page.evaluate(() => { navigateTo('executive-summary'); });
await page.waitForTimeout(500);

let pass = 0, fail = 0;
const ok = (label, cond) => { if (cond) { console.log(`  ✅ ${label}`); pass++; } else { console.error(`  ❌ ${label}`); fail++; } };

// ── ES health table structure ──
const headers = await page.$$eval('.es-init-table thead th', ths => ths.map(t => t.textContent.trim()));
ok(`ES1 bảng 8 cột (got ${headers.length})`, headers.length === 8);
ok('ES2 có cột "Phụ trách"', headers.includes('Phụ trách'));

const rowText = await page.$eval('#esInitTableBody', tb => tb.textContent);
ok('ES3 hiện TÊN initiative (không phải ID)', rowText.includes('Số hóa chuỗi cung ứng'));
ok('ES4 hiện nhân sự phụ trách', rowText.includes('Nguyen Van A') && rowText.includes('Tran Thi B'));

// ── Category filter droplist ──
const catOpts = await page.$$eval('#esInitCatFilter option', os => os.map(o => o.textContent.trim()));
ok('ES5 filter Category có "Bất Động Sản"', catOpts.includes('Bất Động Sản'));
ok('ES6 filter Category có "Số hóa"', catOpts.includes('Số hóa'));

// Lọc theo "Bất Động Sản" → chỉ còn initiative BDS
await page.evaluate(() => esFilterInitCat('Bất Động Sản'));
await page.waitForTimeout(200);
const filtered = await page.$eval('#esInitTableBody', tb => tb.textContent);
ok('ES7 lọc BĐS: hiện BDS', filtered.includes('Dự án Bất Động Sản'));
ok('ES8 lọc BĐS: ẩn Số hóa', !filtered.includes('Số hóa chuỗi cung ứng'));
await page.evaluate(() => esFilterInitCat(''));
await page.waitForTimeout(200);

// ── Click row → popup chi tiết initiative ──
await page.evaluate(() => openInitViewPopup('SCF-001'));
await page.waitForTimeout(300);
const popupOpen = await page.$eval('#initViewOverlay', el => getComputedStyle(el).display !== 'none');
ok('ES9 click → popup initiative mở', popupOpen);
const popupTitle = await page.$eval('#initViewTitle', el => el.textContent).catch(() => '');
ok('ES10 popup đúng initiative', popupTitle.includes('Số hóa chuỗi cung ứng'));

// ── BAU (không có initiative record) → không click được (không có onclick) ──
const bauClickable = await page.$eval('#esInitTableBody', tb =>
  [...tb.querySelectorAll('tr')].some(tr => tr.textContent.includes('BAU') && tr.getAttribute('onclick')));
ok('ES11 dòng BAU không mở popup (no onclick)', !bauClickable);

// ── Modal Thêm Initiative: droplist Category đồng nhất + có "Bất Động Sản" ──
await page.evaluate(() => { navigateTo('initiative-tracker'); });
await page.waitForTimeout(300);
const modalCats = await page.$$eval('#initFCat option', os => os.map(o => o.textContent.trim()));
ok('ES12 modal Category có "Bất Động Sản"', modalCats.includes('Bất Động Sản'));
ok('ES13 modal Category có đủ 6 mảng cũ', ['Số hóa','Sản phẩm','Đào tạo','Kỹ thuật','Vận hành','Chiến lược'].every(c => modalCats.includes(c)));

ok('ES14 không có JS console error', errors.length === 0);
if (errors.length) console.error('   errors:', errors.slice(0, 5));

console.log(`\n  KẾT QUẢ: ${pass}/${pass + fail} PASS`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);
