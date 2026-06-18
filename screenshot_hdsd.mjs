/**
 * screenshot_hdsd.mjs — Chụp ảnh màn hình cho Hướng dẫn sử dụng (HDSD)
 * Run: node screenshot_hdsd.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
const HDSD_DIR = path.join(__dirname, 'HDSD');
if (!fs.existsSync(HDSD_DIR)) fs.mkdirSync(HDSD_DIR, { recursive: true });

const ss = async (page, name) => {
  const p = path.join(HDSD_DIR, name);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  ✅ Đã lưu: HDSD/${name}`);
  return p;
};

/* ── Sample data ── */
const SAMPLE_INITIATIVES = [
  {
    id: 'SCF-001', type: 'initiative',
    name: 'Số hóa quy trình nghiệp vụ',
    status: 'Active', owner: 'TuanTT4', team: 'Số',
    deadline: '2026-12-31', progress: 45
  },
  {
    id: 'SCF-002', type: 'initiative',
    name: 'Nâng cấp hệ thống phân tích dữ liệu',
    status: 'Active', owner: 'HungNV', team: 'PTKDMB',
    deadline: '2026-09-30', progress: 20
  }
];

const SAMPLE_TASKS = [
  {
    id: 'S-001', name: 'Triển khai hệ thống dashboard KPI',
    type: 'Task', category: 'Dashboard/BC',
    initiative: 'SCF-001', team: 'Số',
    picAcc: 'TuanTT4', picRes: 'HungNV', picSup: '',
    status: 'In Progress', deadline: '2026-07-31',
    canBLD: 'Y', progress: 60, yKienBLD: '', noiDungBLD: ''
  },
  {
    id: 'S-002', name: 'Xây dựng module báo cáo tự động',
    type: 'Task', category: 'AI/Năng suất',
    initiative: 'SCF-001', team: 'Số',
    picAcc: 'TuanTT4', picRes: 'AnhDT24', picSup: '',
    status: 'Todo', deadline: '2026-08-15',
    canBLD: 'N', progress: 0, yKienBLD: '', noiDungBLD: ''
  },
  {
    id: 'P-001', name: 'Phân tích nhu cầu khách hàng doanh nghiệp',
    type: 'Task', category: 'Bán hàng',
    initiative: 'SCF-002', team: 'PTKDMB',
    picAcc: 'HungNV', picRes: 'HungNV', picSup: '',
    status: 'In Progress', deadline: '2026-07-20',
    canBLD: 'Y', progress: 35, yKienBLD: '', noiDungBLD: ''
  }
];

const SAMPLE_CASES = [
  {
    id: 'CP-001', tuanBC: 'Tuần 22/2026', team: 'PTKDMB', pic: 'AnhDT24',
    dvkd: 'HDG', caseName: 'Wego Việt Nam – Nhà máy linh kiện',
    loaiHinh: 'Món', complexity: 'Cao',
    phuongAn: 'Tài trợ trung hạn nhà máy linh kiện nhựa',
    giaTriTy: 220, stage: 'Đang phân tích',
    vuongMac: 'Cần làm rõ dự án', nextStep: 'Trình chủ trương GĐK',
    startDate: '2026-05-01', deadline: '2026-07-31',
    rag: 'Đỏ', canBLD: 'Y', highlight: 'N', ghiChu: '', yKienBLD: ''
  },
  {
    id: 'CP-002', tuanBC: 'Tuần 23/2026', team: 'PTKDMB', pic: 'HungNV',
    dvkd: 'SHB', caseName: 'ABC Corp – Dự án nhà xưởng',
    loaiHinh: 'Dự án', complexity: 'Trung bình',
    phuongAn: 'Cho vay đầu tư nhà xưởng sản xuất',
    giaTriTy: 85, stage: 'Tiếp nhận',
    vuongMac: '', nextStep: 'Gửi hồ sơ thẩm định',
    startDate: '2026-05-15', deadline: '2026-08-30',
    rag: 'Vàng', canBLD: 'N', highlight: 'Y', ghiChu: 'Case tiềm năng', yKienBLD: ''
  }
];

const AUTH = {
  token: 'local-test-token',
  user: { username: 'TuanTT4', displayName: 'Trần Tuấn', role: 'Admin', team: 'Số' },
  exp: Date.now() + 3600 * 1000
};

/* ── Helpers ── */
async function injectAuthAndData(page) {
  await page.evaluate(({ auth, tasks, cases, initiatives }) => {
    localStorage.setItem('shtd_auth_v1', JSON.stringify(auth));
    const db = JSON.parse(localStorage.getItem('shtd_v2') || '{}');
    db.tasks = tasks;
    db.cases = cases;
    db.initiatives = initiatives;
    localStorage.setItem('shtd_v2', JSON.stringify(db));
  }, { auth: AUTH, tasks: SAMPLE_TASKS, cases: SAMPLE_CASES, initiatives: SAMPLE_INITIATIVES });
}

async function waitForApp(page) {
  await page.waitForFunction(
    () => {
      const el = document.getElementById('loadingOverlay');
      return !el || !el.classList.contains('visible');
    },
    { timeout: 10000 }
  ).catch(() => {});
  await page.waitForTimeout(600);
}

async function navigate(page, view) {
  await page.locator(`.nav-item[data-view="${view}"]`).click();
  await page.waitForTimeout(500);
}

/* ══════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════ */
async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  SHTD Dashboard — Chụp ảnh HDSD');
  console.log('══════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  /* ── 1. LOGIN SCREEN ── */
  console.log('[1/10] Chụp màn hình Login...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(INDEX, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    // Ensure login overlay is visible (clear any stale auth)
    await page.evaluate(() => {
      localStorage.removeItem('shtd_auth_v1');
      const overlay = document.getElementById('loginOverlay');
      if (overlay) overlay.style.display = 'flex';
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await ss(page, '01_login.png');
    await ctx.close();
  }

  /* ── Load with auth + data (reused for steps 2-8) ── */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/script.google.com/**', r => r.abort());
  await ctx.route('**/macros/**', r => r.abort());
  const page = await ctx.newPage();

  await page.goto(INDEX, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await injectAuthAndData(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForApp(page);

  /* ── 2. DASHBOARD ── */
  console.log('[2/10] Chụp màn hình Dashboard...');
  await navigate(page, 'dashboard');
  await page.waitForTimeout(500);
  await ss(page, '02_dashboard.png');

  /* ── 3a. TẠO CASE ── */
  console.log('[3/10] Chụp màn hình Tạo Case...');
  await navigate(page, 'case-pipeline');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Thêm Case")').first().click();
  await page.waitForSelector('#cpModal', { state: 'visible' });
  await page.waitForTimeout(400);
  await ss(page, '03_create_case.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ── 3b. TẠO TASK ── */
  console.log('[4/10] Chụp màn hình Tạo Task...');
  await navigate(page, 'tasks');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Thêm Task")').first().click();
  await page.waitForSelector('#taskOverlay', { state: 'visible' });
  await page.waitForTimeout(400);
  await ss(page, '03_create_task.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ── 3c. TẠO INITIATIVE ── */
  console.log('[5/10] Chụp màn hình Tạo Initiative...');
  await navigate(page, 'initiative-tracker');
  await page.waitForTimeout(600);
  await page.locator('button:has-text("Thêm Initiative")').first().click();
  await page.waitForSelector('#initModalOverlay', { state: 'visible' });
  await page.waitForTimeout(400);
  await ss(page, '03_create_initiative.png');
  // Đóng modal initiative bằng JS trực tiếp
  await page.evaluate(() => {
    const overlay = document.getElementById('initModalOverlay');
    if (overlay) overlay.style.display = 'none';
  });
  await page.waitForTimeout(400);

  /* ── 4. EDIT CASE ── */
  console.log('[6/10] Chụp màn hình Sửa Case...');
  await navigate(page, 'case-pipeline');
  await page.waitForTimeout(500);
  // Click first row to open edit modal
  const firstRow = page.locator('#cpTbody tr').first();
  await firstRow.click();
  await page.waitForSelector('#cpModal', { state: 'visible' });
  await page.waitForTimeout(400);
  await ss(page, '04_edit_case.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ── 5. SUBMIT (BLD Queue — danh sách chờ phê duyệt) ── */
  console.log('[7/10] Chụp màn hình Submit (BLD Queue)...');
  await navigate(page, 'bld-queue');
  await page.waitForTimeout(600);
  await ss(page, '05_submit.png');

  /* ── 6. APPROVE (BLD mini modal) ── */
  console.log('[8/10] Chụp màn hình Approve...');
  // Click "Duyệt" on first pending item
  const approveBtn = page.locator('.btn-success:has-text("Duyệt")').first();
  const approveBtnCount = await approveBtn.count();
  if (approveBtnCount > 0) {
    await approveBtn.click();
    await page.waitForSelector('#bldActionOverlay', { state: 'visible' });
    await page.waitForTimeout(400);
    await ss(page, '06_approve.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    // Fallback: show BLD queue without modal
    await ss(page, '06_approve.png');
    console.log('  ⚠️  Không tìm thấy nút Duyệt — đã chụp BLD Queue thay thế');
  }

  /* ── 7. EXPORT ── */
  console.log('[9/10] Chụp màn hình Export...');
  await navigate(page, 'case-pipeline');
  await page.waitForTimeout(500);
  // Highlight export button before screenshot
  await page.evaluate(() => {
    const btn = document.querySelector('button[onclick*="exportCases"]');
    if (btn) {
      btn.style.outline = '3px solid #f59e0b';
      btn.style.outlineOffset = '3px';
    }
  });
  await page.waitForTimeout(200);
  await ss(page, '07_export.png');
  // Reset highlight
  await page.evaluate(() => {
    const btn = document.querySelector('button[onclick*="exportCases"]');
    if (btn) { btn.style.outline = ''; btn.style.outlineOffset = ''; }
  });

  await ctx.close();

  /* ── 8. MOBILE VIEW ── */
  console.log('[10/10] Chụp màn hình Mobile View...');
  {
    const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mCtx.route('**/script.google.com/**', r => r.abort());
    await mCtx.route('**/macros/**', r => r.abort());
    const mPage = await mCtx.newPage();

    await mPage.goto(INDEX, { waitUntil: 'domcontentloaded' });
    await mPage.waitForTimeout(800);
    await injectAuthAndData(mPage);
    await mPage.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(mPage);
    // Trên mobile, điều hướng qua JS trực tiếp (sidebar bị ẩn)
    await mPage.evaluate(() => {
      if (typeof showView === 'function') showView('tasks');
      else if (typeof switchView === 'function') switchView('tasks');
      else {
        document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
        const tv = document.getElementById('view-tasks');
        if (tv) tv.style.display = 'block';
      }
    });
    await mPage.waitForTimeout(600);
    await ss(mPage, '08_mobile_view.png');
    await mCtx.close();
  }

  await browser.close();

  console.log('\n══════════════════════════════════════════');
  console.log('  Hoàn thành! Ảnh được lưu tại: HDSD/');
  console.log('══════════════════════════════════════════');
  console.log('\nDanh sách ảnh:');
  fs.readdirSync(HDSD_DIR).forEach(f => console.log(`  📷 ${f}`));
}

main().catch(err => { console.error('Lỗi:', err); process.exit(1); });
