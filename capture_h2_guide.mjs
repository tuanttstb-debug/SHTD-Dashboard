/**
 * capture_h2_guide.mjs — chụp ảnh minh họa cho HƯỚNG DẪN SỬ DỤNG H2 · KPI.
 * Dùng dữ liệu pilot (QuangNN3 / DungLQ1), login Teamlead để hiện đủ nút.
 * Ảnh lưu vào docs/img/h2/. Chạy: node capture_h2_guide.mjs
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3075;
const BASE_URL = `http://localhost:${PORT}`;
const IMG_DIR = path.join(__dirname, 'docs', 'img', 'h2');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[path.extname(fp)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime }); res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
const soon   = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

const MOCK = {
  config: [{ Key: 'max_p1', Value: '3' }, { Key: 'max_objectives', Value: '5' }, { Key: 'rag_amber_pct', Value: '20' }],
  objectives: [
    { ID: 'OBJ-26-001', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'Số hóa quy trình Bảo lãnh (BLOL)', Why: 'Sản phẩm trọng tâm 2026 — rút ngắn TAT, tăng năng suất xử lý.', Owner: 'QuangNN3', Priority: 'P1', Weight: '50', Category: 'A', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-002', Type: 'member', ParentID: '', Pillar: 'P3-AI',  ObjectiveName: 'Ứng dụng AI nâng năng suất', Why: 'AI transformation — đưa ≥2 công cụ AI vào vận hành.', Owner: 'QuangNN3', Priority: 'P1', Weight: '30', Category: 'C', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-003', Type: 'member', ParentID: '', Pillar: 'P2-CAP', ObjectiveName: 'Nâng năng lực quản trị dự án', Why: 'Chuẩn hóa cách quản trị mục tiêu & rủi ro.', Owner: 'QuangNN3', Priority: 'P2', Weight: '20', Category: 'D', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'QuangNN3' },
    { ID: 'OBJ-26-004', Type: 'member', ParentID: '', Pillar: 'P1-BIZ', ObjectiveName: 'GNOL End-to-End giai đoạn 2', Why: 'Hoàn thiện luồng E2E, go-live GĐ2.', Owner: 'DungLQ1', Priority: 'P1', Weight: '60', Category: 'B', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'DungLQ1' },
    { ID: 'OBJ-26-005', Type: 'member', ParentID: '', Pillar: 'P3-AI',  ObjectiveName: 'Chatbot hỗ trợ nghiệp vụ tín dụng', Why: 'Giảm thời gian tra cứu quy định.', Owner: 'DungLQ1', Priority: 'P2', Weight: '40', Category: 'C', Status: 'Đang thực hiện', StartDate: '2026-08-01', DueDate: future, CreatedBy: 'DungLQ1' },
  ],
  kpis: [
    { ID: 'KPI-26-001', ObjectiveID: 'OBJ-26-001', KpiName: 'TAT xử lý bảo lãnh', KpiType: 'A', Baseline: '8', Target: '5', Unit: 'ngày', Weight: '60', Deadline: future, Status: 'Đang thực hiện', Evidence: 'Log hệ thống BPM', Owner: 'QuangNN3' },
    { ID: 'KPI-26-002', ObjectiveID: 'OBJ-26-001', KpiName: 'Tỷ lệ hồ sơ tự động', KpiType: 'A', Baseline: '20', Target: '60', Unit: '%', Weight: '40', Deadline: future, Status: 'Đang thực hiện', Evidence: '', Owner: 'QuangNN3' },
    { ID: 'KPI-26-003', ObjectiveID: 'OBJ-26-002', KpiName: 'Số công cụ AI đưa vào dùng', KpiType: 'C', Baseline: '0', Target: '2', Unit: 'công cụ', Weight: '100', Deadline: future, Status: 'Hoàn thành', Evidence: 'Copilot + Trợ lý nội bộ', Owner: 'QuangNN3' },
    { ID: 'KPI-26-004', ObjectiveID: 'OBJ-26-004', KpiName: 'Go-live GĐ2', KpiType: 'B', Baseline: '', Target: '1', Unit: 'lần', Weight: '70', Deadline: soon, Status: 'Đang thực hiện', Evidence: '', Owner: 'DungLQ1' },
    { ID: 'KPI-26-005', ObjectiveID: 'OBJ-26-004', KpiName: 'Số lỗi sau go-live', KpiType: 'B', Baseline: '', Target: '', Unit: '', Weight: '', Deadline: '', Status: 'Chưa bắt đầu', Evidence: '', Owner: 'DungLQ1' },
    { ID: 'KPI-26-006', ObjectiveID: 'OBJ-26-005', KpiName: 'Độ chính xác chatbot', KpiType: 'C', Baseline: '60', Target: '85', Unit: '%', Weight: '100', Deadline: future, Status: 'Đang thực hiện', Evidence: '', Owner: 'DungLQ1' },
  ],
  milestones: [
    { ID: 'MS-26-001', KpiID: 'KPI-26-001', Month: 'T9',  Quarter: 'Q3', MilestoneName: 'Hoàn tất phân tích quy trình', DueDate: soon,   Owner: 'QuangNN3', Status: 'Hoàn thành',      RAG: 'GREEN', TaskRef: 'SO-26-012' },
    { ID: 'MS-26-002', KpiID: 'KPI-26-001', Month: 'T10', Quarter: 'Q4', MilestoneName: '2 nghiệp vụ go-live thử', DueDate: future,      Owner: 'QuangNN3', Status: 'Đang thực hiện', RAG: 'AMBER', TaskRef: 'SO-26-018' },
    { ID: 'MS-26-003', KpiID: 'KPI-26-004', Month: 'T10', Quarter: 'Q4', MilestoneName: 'UAT giai đoạn 2', DueDate: soon,               Owner: 'DungLQ1',  Status: 'Đang thực hiện', RAG: 'RED', TaskRef: '' },
  ],
  tracking: [
    { ID: 'TRK-26-001', Month: 'T8',  KpiID: 'KPI-26-001', Member: 'QuangNN3', Target: '5', Actual: '7',   Progress: '35', RAG: '', Issue: '', NextAction: '', SupportNeeded: '', UpdatedAt: '' },
    { ID: 'TRK-26-002', Month: 'T9',  KpiID: 'KPI-26-001', Member: 'QuangNN3', Target: '5', Actual: '6.5', Progress: '55', RAG: '', Issue: 'Chờ DCB mở API', NextAction: 'Họp DCB', SupportNeeded: '', UpdatedAt: '' },
    { ID: 'TRK-26-003', Month: 'T10', KpiID: 'KPI-26-001', Member: 'QuangNN3', Target: '5', Actual: '6',   Progress: '70', RAG: '', Issue: '', NextAction: '', SupportNeeded: '', UpdatedAt: '' },
    { ID: 'TRK-26-004', Month: 'T9',  KpiID: 'KPI-26-004', Member: 'DungLQ1',  Target: '1', Actual: '0',   Progress: '40', RAG: '', Issue: 'Phụ thuộc IT delivery', NextAction: '', SupportNeeded: 'Ưu tiên tài nguyên IT', UpdatedAt: '' },
  ],
  risks: [
    { ID: 'RSK-26-001', KpiID: 'KPI-26-001', Risk: 'Phụ thuộc tiến độ mở API của DCB', Impact: 'Cao', Probability: 'TB', Mitigation: 'Bám lịch DCB, có phương án thủ công tạm', Owner: 'QuangNN3', Status: 'Open' },
    { ID: 'RSK-26-002', KpiID: 'KPI-26-004', Risk: 'UAT trượt lịch do thiếu tài nguyên IT', Impact: 'Cao', Probability: 'Cao', Mitigation: 'Escalate BLĐ xin ưu tiên', Owner: 'DungLQ1', Status: 'Open' },
  ],
  deps: [
    { ID: 'DEP-26-001', KpiID: 'KPI-26-004', DependencyType: 'IT delivery (môi trường UAT)', DependencyOwner: 'Khối CNTT', RequiredDate: soon, Status: 'Pending', Note: '' },
    { ID: 'DEP-26-002', KpiID: 'KPI-26-001', DependencyType: 'API bảo lãnh', DependencyOwner: 'DCB', RequiredDate: future, Status: 'Pending', Note: '' },
  ],
  reviews: [
    { ID: 'REV-26-001', Member: 'QuangNN3', ReviewType: 'H1', Period: 'H1/2026',
      Q_commit: 'Cam kết rút ngắn TAT bảo lãnh về 6 ngày.', Q_actual: 'Đạt 6.5 ngày (≈80% mục tiêu H1).', Q_pct: '80', Q_impact: 'Giảm ~25% thời gian chờ hồ sơ.',
      Q_gap: 'Chưa đạt mốc 5 ngày do phụ thuộc API DCB.', Q_rootcause: 'Phụ thuộc bên ngoài chốt trễ.', Q_lesson: 'Chốt dependency & lịch bên thứ 3 ngay từ đầu kỳ.', Q_adjust: 'H2 bám sát lịch DCB, thêm phương án dự phòng.',
      Cap_Goal: '4', Cap_Plan: '4', Cap_Prior: '3', Cap_Own: '5', Cap_Risk: '3', Cap_Dep: '3', Cap_Track: '4', Cap_Exec: '4', CreatedAt: '' },
    { ID: 'REV-26-002', Member: 'DungLQ1', ReviewType: 'Q3', Period: 'Q3/2026',
      Q_commit: 'Go-live GNOL giai đoạn 1.', Q_actual: 'Go-live GĐ1 đúng hạn, ổn định.', Q_pct: '100', Q_impact: 'Rút ngắn luồng E2E ~30%.',
      Q_gap: '', Q_rootcause: '', Q_lesson: 'Test sớm giúp giảm lỗi khi go-live.', Q_adjust: 'Chuẩn bị GĐ2 kỹ phần UAT.',
      Cap_Goal: '5', Cap_Plan: '4', Cap_Prior: '4', Cap_Own: '4', Cap_Risk: '4', Cap_Dep: '5', Cap_Track: '4', Cap_Exec: '5', CreatedAt: '' },
  ]
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route('**://script.google.com/**', route => route.abort());
await page.goto(BASE_URL, { waitUntil: 'load', timeout: 15000 });
await page.waitForTimeout(400);

async function boot(view) {
  await page.evaluate(({ mock, view }) => {
    window.readH2 = async () => {};
    Object.assign(dbH2, { config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] });
    Object.assign(dbH2, JSON.parse(JSON.stringify(mock)));
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      token: 'mock-token', exp: Date.now() + 86400000,
      user: { username: 'TeamleadX', role: 'Teamlead', team: 'Số', displayName: 'Teamlead' }
    }));
    const lo = document.getElementById('loginOverlay'); if (lo) lo.style.display = 'none';
    try { setupListeners(); } catch (e) {}
    navigateTo(view);
  }, { mock: MOCK, view });
  await page.waitForTimeout(600);
}
const cap = (name, opts = {}) => page.screenshot({ path: path.join(IMG_DIR, name), ...opts });

// 1 — Tracker list (full page)
await boot('h2-tracker');
await cap('01_tracker_list.png', { fullPage: true });

// 2 — Add Objective modal
await page.evaluate(() => openH2ObjModal(null));
await page.waitForTimeout(300);
await cap('02_objective_add.png');
await page.evaluate(() => closeH2ObjModal());

// 3 — Add KPI modal (gắn vào Objective 001)
await page.evaluate(() => openH2KpiModal(null, 'OBJ-26-001'));
await page.waitForTimeout(300);
await cap('03_kpi_add.png');
await page.evaluate(() => closeH2KpiModal());

// 4 — Add Milestone modal (gắn vào KPI 001)
await page.evaluate(() => openH2MsModal(null, 'KPI-26-001'));
await page.waitForTimeout(300);
await cap('04_milestone_add.png');
await page.evaluate(() => closeH2MsModal());

// 5 — Objective view popup (read-only chi tiết)
await page.evaluate(() => openH2ObjView('OBJ-26-001'));
await page.waitForTimeout(300);
await cap('05_objective_view.png');
await page.evaluate(() => closeH2ObjView());

// 6 — Dashboard (full page)
await boot('h2-dashboard');
await page.waitForTimeout(600);
await cap('06_dashboard.png', { fullPage: true });

// 7 — Report overlay
await page.evaluate(() => h2OpenReport());
await page.waitForTimeout(400);
await cap('07_report.png');
await page.evaluate(() => h2CloseReport());

// 8 — Review list
await boot('h2-review');
await cap('08_review_list.png', { fullPage: true });

// 9 — Add review modal
await page.evaluate(() => openH2ReviewModal(null));
await page.waitForTimeout(300);
await cap('09_review_add.png');
await page.evaluate(() => closeH2ReviewModal());

// 10 — Edit review (prefilled) để minh họa 8 câu hỏi + năng lực
await page.evaluate(() => openH2ReviewModal('REV-26-001'));
await page.waitForTimeout(300);
await cap('10_review_edit.png');
await page.evaluate(() => closeH2ReviewModal());

console.log('✅ Đã chụp ảnh hướng dẫn vào docs/img/h2/');
const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png')).sort();
files.forEach(f => console.log('  -', f, (fs.statSync(path.join(IMG_DIR, f)).size / 1024).toFixed(0) + 'KB'));
await browser.close();
server.close();
process.exit(0);
