# CHANGE LOG — SHTD Dashboard

---

## [KPI Merge] 2026-06-04 — KPI Views Updated từ TPBank_KPI_Dashboard_final.html

**Changed by**: AI Implementation Session (Claude Sonnet 4.6)

### Mục tiêu
Merge format trình bày từ `TPBank_KPI_Dashboard_final.html` vào 3 view KPI của SHTD Dashboard.
Chỉ thay đổi: **KPI Overview**, **KPI Progress**, **Owner Analysis**. Không động vào các view khác.

### Files thay đổi

**`assets/js/kpi-data.js`** — Thêm dữ liệu PTKD-level từ TPBank file:
- `quangPTKD[14]` — BIZ/BPM/rate từng PTKD của QuangNN3 (Bảo lãnh)
- `dungPTKD[14]`  — BIZ/BPM/rate từng PTKD của DungLQ1 (Giải ngân)
- `sheet2PTKD[15]` — GN Sheet2 Hoàn thành
- `agg` object — aggregate totals (totalGD, kpi21/22 actual/target/forecast, v.v.)
- Helpers: `fmtKN()`, `kpiChip()`, `dungChip()`, `kpiAlertClass()`, `dungAlertClass()`

**`assets/css/kpi.css`** — Thêm CSS classes mới (adapted SHTD variables):
- `.kpi-ov-grid`, `.kpi-ov-card`, `.koi-*` — KPI Overview header cards
- `.kpi-meter`, `.kpi-meter-*`, `.kpi-meter-fill.*` — KPI progress meter bar
- `.kpi-compare-grid`, `.kpi-compare-card` — Side-by-side comparison cards
- `.channel-split`, `.channel-pill` — Channel breakdown pills
- `.ptkd-grid`, `.ptkd-card`, `.ptkd-*` — PTKD cards with alert colors
- `.owner-block`, `.owner-block-header.quang/.dung`, `.owner-stat-*` — Owner blocks
- `.owner-tabs-kpi`, `.owner-tab-kpi` — Tab navigation
- `.rank-tabs`, `.rank-tab` — Ranking subtabs
- `.kpi-chip-*` — Color-coded badge chips
- `.kpi-table`, `.td-*` — KPI data table
- `.kpi-alert-grid`, `.kpi-alert-item`, `.kpi-alert-*` — Alert grid items
- `.kpi-insight-panel`, `.kpi-insight-*` — Executive insight panel

**`assets/js/views/kpi-overview.js`** — Rewritten (TPBank Overview page format):
- 6 KPI header cards (total GD, KPI 2.1, KPI 2.2, QuangNN3, DungLQ1, GN HT)
- Executive insights panel với 6 bullet điểm
- 4 charts: Channel/Owner bar, KPI progress, Top PTKD Quang, Top PTKD Dung
- 4 auto-generated KPI alert items

**`assets/js/views/kpi-progress.js`** — Rewritten (TPBank KPI 2.1/2.2 page format):
- 2 KPI comparison cards side-by-side với KPI meter bar
- PTKD analysis table QuangNN3 (BIZ, BPM, rate, gap vs 40%, % đóng góp KPI 2.1)
- Digital rate bar chart với KPI 40% target line
- DungLQ1 channel table

**`assets/js/views/owner-analysis.js`** — Rewritten (TPBank Owner pages format):
- 3-tab navigation: QuangNN3 | DungLQ1 | Bảng xếp hạng
- Owner block header với stats (tổng GD, BIZ, BPM, rate, số PTKD)
- PTKD grid cards với color-coded alert borders + progress bar
- 2 charts per owner: digital rate + stacked BIZ/BPM
- Auto-generated adoption alert grid (critical/warning/ok)
- Ranking tab với 3 subtabs (QuangNN3 / DungLQ1 / Sheet2)

### Không thay đổi
Dashboard, Tasks, Gantt, Performance, Action Plan, Branch Analysis, RM Analysis

---

## [Phase A2] 2026-06-04 — GAS Backend Source Added

**Changed by**: AI Implementation Session (Claude Sonnet 4.6)

### Actions
- **Created** `backend/Code.gs` — `doPost()` router, `doGet()` health check
- **Created** `backend/SheetService.gs` — `sheetRead()` / `sheetWrite()` operations
- **Created** `backend/Config.gs` — `SPREADSHEET_ID`, `SHEET_NAME`, `DATA_RANGE`

### API Contract (preserved exactly from index.html)
- `POST { action: 'read' }` → `{ status: 'ok', values: [[header], [row...]] }`
- `POST { action: 'write', values: [...] }` → `{ status: 'ok' }`
- `Content-Type: text/plain` (tránh CORS preflight)
- Lỗi → `{ status: 'error', error: '<message>' }`

### Deploy Steps
1. Extensions → Apps Script → tạo 3 file từ `backend/`
2. Deploy → New deployment → Web App (Execute as: Me, Access: Anyone)
3. Copy Web App URL → dán vào `GS_WEBAPP_URL` trong `assets/js/constants.js`

### Note
`backend/GAS.GS` giữ nguyên là archive của patch v6.2 (client-side, đã merge).
Ba file mới là GAS backend thực sự chạy trên script.google.com.

---

## [Phase B1+B2] 2026-06-04 — Multi-File Refactor Complete

**Changed by**: AI Implementation Session (Claude Sonnet 4.6)

### B1 — CSS Extracted (9 files)
- `assets/css/tokens.css` — design tokens & dark mode vars
- `assets/css/base.css` — reset, body, scrollbar, keyframes
- `assets/css/layout.css` — sidebar, topbar, main, statusbar
- `assets/css/components.css` — buttons, cards, modal, toast, badges
- `assets/css/forms.css` — form controls, validation
- `assets/css/table.css` — table, filter bar, chips, pagination
- `assets/css/gantt.css` — Gantt chart styles
- `assets/css/quickview.css` — Quick View panel & FAB
- `assets/css/responsive.css` — media queries (768px, 480px)

### B2 — JS Extracted (17 modules)
- `assets/js/constants.js`, `helpers.js`, `storage.js`, `parsers.js`, `api.js`
- `assets/js/ui/toast.js`, `modal.js`, `theme.js`, `navigation.js`
- `assets/js/crud.js`, `bulk.js`
- `assets/js/views/dashboard.js`, `tasks.js`, `gantt.js`, `performance.js`, `quickview.js`
- `assets/js/app.js`

### Result
- `index.html`: 4090 → 736 lines (HTML-only shell)
- Commits: `37423f6` (B1), `da205dc` (B2)

### Verified (Playwright — 25/25 PASS, 0 FAIL)
- Page load, KPIs, dashboard, initiative table ✅
- Dark mode toggle ✅
- Task list, filter chips, pagination ✅
- Add Task modal + auto ID ✅
- checkDupId ADD msg ("Không thể thêm mới") ✅
- checkDupId EDIT msg ("đã được dùng bởi task khác") ✅
- Gantt view, Performance view + tab switch ✅
- Quick View panel open/close, tab switch, Escape, Q key ✅
- Ctrl+N, ? keyboard shortcuts ✅
- Detail modal from KPI card click ✅
- fmtDateExport('2026-04-22') → "22-Apr-26" ✅
- All core JS functions accessible ✅
- 121 tasks in db ✅
- Zero JS errors ✅

---

## [Phase B0] 2026-06-04 — Repo Initialized + Phase B0 Structure

**Changed by**: AI Implementation Session (Claude Sonnet 4.6)

### Actions
- **Initialized git repo** — `git init` + remote added (GitHub)
- **Renamed** `Main.html` → `index.html` (GitHub Pages compatibility)
- **Created** folder structure: `assets/css/`, `assets/js/ui/`, `assets/js/views/`, `backend/`
- **Re-applied** A1+A3 patches (lost during `git reset --hard origin/main` on first pull)
- **Committed** AI_CONTEXT docs, GAS.GS archive, and B0 structure to GitHub

### Root Cause Note
A1+A3 patches from 2026-06-03 were never committed. When pulling fresh repo they were overwritten. Now committed at `387ce50`.

### Commits
- `b892079` — docs: add AI context files, archive GAS.GS, scaffold Phase B0 structure
- `387ce50` — fix: re-apply v6.2 patches (A1 + A3)

### Verified (Playwright)
- `fmtDateExport('2026-04-22')` → `"22-Apr-26"` ✅
- QV topbar button visible and opens panel ✅
- No console errors ✅
- 4 KPI cards rendered ✅

---

## [v6.2-merged] 2026-06-03 — Phase A1 + A3 Applied to Main.html

**Changed by**: AI Implementation Session

### A1 — Fix Orphaned HTML in `<style>` Block
- **Removed** từ CSS block (lines 154–178): debug buttons `loadDemoData`, `clearDemoData`, duplicate dark toggle, merge guide instructions — tất cả các phần tử này không bao giờ hiện ra trên giao diện (bị kẹt trong CSS)
- **Added** `<button class="qv-topbar-btn">` vào đúng vị trí trong `.topbar-right` của body (line 1108) — Quick View button giờ thực sự hiện ra trên topbar
- `#qvDot` (badge dot) giờ được đặt đúng vị trí → JS reference tại line 3633 hoạt động

### A3 — Apply GAS.GS v6.2 Patches
- **Added** `const _MMM` (line 2230) — mảng tháng viết tắt tiếng Anh
- **Added** `function fmtDateExport(d)` (line 2233) — chuyển date sang "dd-mmm-yy" cho export
- **Replaced** `taskToRow()` → v6.2: dates dùng `fmtDateExport()` ("22-Apr-26"), progress xuất "75%" thay vì 75
- **Replaced** `checkDupId()` → v6.2: phân biệt ADD vs EDIT, hiển thị đúng message với icon
- **Bonus**: Thêm `_mmmIdx` + parse "dd-mmm-yy" vào `_parseArrayIntoDb` → round-trip an toàn khi đọc lại từ Sheet

### Files Changed
- `Main.html`: 4076 → 4109 lines (+33)
- `AI_CONTEXT/TODO.md`: updated task status
- `AI_CONTEXT/CHANGE_LOG.md`: this entry

### Verified
- `loadDemoData`, `clearDemoData`: 0 occurrences (removed)
- `fmtDateExport`, `_MMM`, `_mmmIdx`: present at correct lines
- `qv-topbar-btn` in body at line 1108: confirmed
- `qvDot` JS update at line 3633: will now work correctly

---

## [AI-Context v2] 2026-06-03 — Product Owner Interview Round 1

**Updated by**: AI Discovery Session

### Answers Confirmed
- Deployment: **GitHub Pages** (static hosting) → multi-file structure fully supported
- GAS backend: Exists on Apps Script Editor → needs export to `/backend/`
- Priority order: **Bug fix → Refactor → Feature**
- Users: **5–20 người, desktop + mobile** → mobile UX cần cải thiện
- Export format: **dd-mmm-yy** confirmed → FIX 4+5 phải apply
- Performance issues: **200–500 task** → render optimization cần thiết
- Debug buttons: **Xóa luôn** → cleanup Phase A1
- Quick View: **Dùng thường xuyên** → keep và improve
- Refactor approach: **Tách file** → multi-file (index.html + assets/)
- Next feature: **Tóm tắt báo cáo tuần tự động**

### Files Updated
- `OPEN_QUESTION.md` — đánh dấu 15 câu hỏi đã có câu trả lời
- `TODO.md` — cập nhật priorities dựa trên PO answers

---

## [AI-Context v1] 2026-06-03 — Phase 0–4 Discovery & Documentation

**Created by**: AI Discovery Session

### Files Created
- `PROJECT_OVERVIEW.md`, `BUSINESS_FLOW.md`, `SYSTEM_ARCHITECTURE_CURRENT.md`
- `SOURCE_CODE_INVENTORY.md`, `UI_AUDIT.md`, `TECH_DEBT.md`
- `REFACTORING_PLAN.md`, `IMPACT_ANALYSIS.md`, `GITHUB_WORKFLOW.md`
- `ASSUMPTION_LOG.md`, `OPEN_QUESTION.md`, `WORKING_RULE.md`
- `TODO.md`, `CHANGE_LOG.md`

### Key Findings
1. 4076-line monolith — CSS + HTML + JS in single file
2. `GAS.GS` là patch file, không phải GAS backend
3. FIX 4+5 (taskToRow v6.2) CHƯA được merge vào Main.html
4. Lines 154–178 là orphaned HTML bên trong `<style>` block — không bao giờ render
5. Existing AI_CONTEXT files mô tả project khác (TPBank BIZ)

### No Code Changes
Discovery phase only.

---

## [v6.2] (date unknown) — Patch Created (chưa fully merged)

- FIX 3: `handleSubmit()` → Block duplicate ID — ✅ đã merge
- FIX 4: `taskToRow()` date dd-mmm-yy — ❌ CHƯA merge vào Main.html
- FIX 5: `taskToRow()` progress "75%" — ❌ CHƯA merge vào Main.html
- `checkDupId()` v6.2 — ❌ CHƯA merge vào Main.html

## [v6.1] (date unknown) — Patch Merged

- FIX 1: `syncAction()` Read-Then-Patch — ✅ đã merge
- FIX 2: FAB position 80px — ✅ đã merge

## [v6.0] (date unknown) — Quick View Panel Added

## [v5.x and earlier] — Historical
Core dashboard, task list, Gantt, Performance, GSheets sync, Excel import/export
