# CHANGE LOG — SHTD Dashboard

---

## [Session 16] 2026-06-10 — BLD Approval Queue (Phê duyệt BLĐ)

**Branch**: `claude/dashboard-leader-features-7nmssw`
**Commit**: `f30af66`

### Mục tiêu
Hàng đợi phê duyệt dành cho lãnh đạo — hiển thị tất cả task có `canBLD=Y`, cho phép approve/reject/yêu cầu bổ sung mà không cần schema mới.

### Tính năng mới

**Pending list:**
- Lọc theo Team và Initiative
- Sort Red-first → Overdue-first
- Badge đỏ trên nav item (navBadgeBld) — ẩn khi = 0
- Chip count + trạng thái empty khi queue trống

**Mini action modal:**
- Approve: `canBLD='N'`, prepend `[✅ BLĐ duyệt DD/MM/YYYY — ghi chú]`
- Reject: `canBLD='N'`, prepend `[❌ BLĐ từ chối DD/MM/YYYY — lý do]`; bắt buộc nhập lý do
- Info: `canBLD='Y'` (vẫn trong queue), prepend `[❓ BLĐ yêu cầu bổ sung DD/MM/YYYY — câu hỏi]`; bắt buộc nhập
- ESC đóng modal; validation error rõ ràng

**History section (7 ngày qua):**
- Hiện task có `canBLD≠Y` và `noiDungBLD` chứa prefix marker
- Parse ngày từ marker để filter 7 ngày; ẩn nếu không có

**No DB schema change:**
- Dùng lại `canBLD` (col 19) + `noiDungBLD` (col 20) — hoàn toàn tương thích GAS sync

### Files thay đổi
- `assets/css/bld-queue.css` — NEW, 296 lines, `bld-` prefix
- `assets/js/views/bld-queue.js` — NEW, 308 lines: renderBldQueue, bldOpenAction, bldSubmitAction, bldCloseMiniModal, filter/history helpers
- `index.html` — nav item + badge, HTML section, mini modal overlay, CSS link, script tag, G+B KB shortcut
- `assets/js/ui/navigation.js` — dispatch + title + G+B key + ESC close
- `assets/js/app.js` — updateNavBadges() drives navBadgeBld
- `verify_bld_queue.mjs` — 18/18 PASS

---

## [Session 15] 2026-06-10 — Executive Summary (Tổng hợp BLĐ)

**Branch**: `claude/dashboard-leader-features-7nmssw`
**Commit**: `a4e57d8`

### Mục tiêu
Thêm trang tổng hợp dành riêng cho lãnh đạo trung tâm — read-only, không filter, luôn hiển thị toàn bộ bức tranh với các items cần ra quyết định ưu tiên cao nhất.

### Tính năng mới

**Zone 1 — 5 KPI Cards headline:**
- Tổng số Task (`#esTotal`)
- Tỷ lệ hoàn thành % (`#esCompletionPct`) — màu theo ngưỡng (≥70% xanh, ≥40% cam, <40% đỏ)
- Đang thực hiện (`#esInProg`) với TB tiến độ
- Quá hạn (`#esOverdue`) — pulse đỏ nếu > 0
- Blocked & Cần BLĐ (`#esBld`) — pulse cam nếu > 0

**Zone 2A — RAG health donut:**
- Chart.js doughnut, guard `typeof Chart === 'undefined'` để resilient khi CDN chậm
- Legend dọc: màu dot + count tuyệt đối + % từng loại

**Zone 2B — Cần xử lý ngay:**
- Sort priority: Cần BLĐ (1) → Blocked (2) → Quá hạn (3)
- Max 8 items hiển thị + "xem thêm N..." link → Tasks view
- Click mỗi item → `editTask()` mở modal chỉnh sửa

**Zone 3 — Initiative health table:**
- Sort: Red-first → Amber → Green; cùng RAG → donePct tăng dần (tệ nhất trên cùng)
- Columns: Initiative | Tổng | Xong | Done % | Avg Progress bar | RAG badge | Status tag
- Progress bar màu: xanh ≥70%, cam 30–70%, đỏ <30%
- Status tags: Đúng tiến độ / Cần chú ý / Rủi ro cao

**Navigation:**
- Sidebar nav item: `data-view="executive-summary"`, icon `fa-crown`
- Page title: `Tổng hợp Lãnh đạo`
- Phím tắt: `G+E`
- Print/PDF: nút in + `@media print` layout

### Files thay đổi

| File | Loại | Lines |
|------|------|-------|
| `assets/css/executive-summary.css` | NEW | ~120 |
| `assets/js/views/executive-summary.js` | NEW | ~180 |
| `index.html` | MOD | +~100 |
| `assets/js/ui/navigation.js` | MOD | +4 |

### Tests (Playwright)
- ✅ KPI values đúng với 5 sample tasks (total=5, done%=20%, overdue=3, BLD+blocked=2)
- ✅ Attention items sort đúng (3 items)
- ✅ Initiative table sort Red-first (3 rows: DB, DA, BAU)
- ✅ Empty state (0 tasks) không crash
- ✅ Dark mode đúng CSS variables
- ✅ Phím tắt `G+E` hoạt động
- ✅ Navigate đi/về không crash Chart.js (guard hoạt động)

### Không thay đổi
Dashboard, Tasks, Gantt, Performance, KPI views, Quick View, Initiative Tracker, User Management, AI Chat, GAS backend

---

## [Session 6] 2026-06-05 — Initiative DB Type Column + Milestone Fix + Verify v2

**Commits**: `e9f43e4`, `b88b448`

### Mục tiêu
Giải quyết bài toán DB GAS: Initiative và Milestone cùng 1 flat table, cần tách rõ bằng `Type` column. Fix bug milestone status sai (tất cả dot đều hiện "active"). Thêm short label M1 thay vì GNOL-001-M1. Verify 37/37 PASS.

### Bugs đã fix

| Bug | Root cause | Fix |
|---|---|---|
| Tất cả milestone dot/chip hiện "active" (sai màu) | Col8 `Milestone Đang track` được map → `milestoneTracking` cho MỌI row; milestone `status` default 'Active' vì col10 trống | Parser detect `isMsRow = _isMilestone(id)`: nếu là milestone row thì col8 → `status`, `milestoneTracking = ''` |
| `_initRealRoots()` trả về rỗng với dữ liệu cũ | Strict `type === 'initiative'` fail với data localStorage không có Type field | Fallback: nếu không có item nào có type → dùng guard cũ `!parentId` |
| `verify_initiative.mjs` crash step 3 sau khi GAS deploy | `readInitiatives()` chạy background, ghi đè test data SCF-001 bằng data thật GNOL | `verify_initiative_v2.mjs` dùng `page.route()` block GAS |

### Files thay đổi

**`assets/js/initiatives.js`** (`e9f43e4`):
- `INI_COLS`: 14 → 15 cols, thêm `'Type'` (col O)
- 3 helpers mới: `_isMilestone(id)`, `_msShortLabel(id)`, `_msParentId(id)`
- `_parseInitiativeArray()`: detect `isMsRow`, route col8 → `status` cho milestone rows, derive `type`/`parentId` từ ID pattern nếu col thiếu (backward compat)
- `initiativeToRow()`: thêm `type` field (15th element)

**`assets/js/views/initiative-tracker.js`** (`e9f43e4` + `b88b448`):
- `_initRealRoots()`: dùng `type === 'initiative'` + fallback cho data cũ không có type
- `_initBuildCard()`: milestone filter dùng `type === 'milestone'` + fallback
- `_initBuildMilestoneList()`: hiện short label `M1` qua `_msShortLabel()`; `_initMsDotClass()` map Vietnamese status → CSS class
- `_initSave()`: stamp `type` field; xóa MS-only fields (`milestoneTracking`, `milestoneDeadline`, `kpiTarget`) khi save milestone
- Category dropdown: thêm `Số hóa`, `Đào tạo` (thiếu trong data thực)
- `_initOpenModal()` parent dropdown + `_initCategoryOptions()`: backward compat fallback

**`backend/InitiativeService.gs`** (`e9f43e4`):
- Header array: 14 → 15 cols, thêm `'Type'`
- Thêm schema comment A→O

**`assets/js/constants.js`** (`b88b448`):
- `GS_WEBAPP_URL`: update sang endpoint GAS deployment mới

**`verify_initiative_v2.mjs`** (`b88b448`) — **NEW FILE**:
- Inject GNOL/BLOL GAS-format data (14-col, không có Type col → test backward compat parsing)
- Verify: type derivation, parentId derivation, Vietnamese status mapping, short labels, status dots
- Test: add milestone → delete → add initiative → delete → duplicate guard → category filter
- Block GAS via `page.route('**/script.google.com/**')` để isolate test
- **37/37 PASS**

### Schema Initiative_Master sau fix
```
A=ID, B=Tên, C=Category, D=Accountable, E=Start, F=Deadline/Target
G=%HT, H=Milestone Đang track (initiative: tracked-MS name; milestone: blank)
I=Deadline Milestone (initiative only), J=Trạng thái
K=KPI, L=Ghi chú, M=Link tài liệu, N=Parent ID, O=Type
```

### Backward Compat
- Data cũ không có `Type` col → parser derive từ ID pattern `/-M\d+$/`
- Data localStorage không có `type` field → UI filter fallback `!parentId`

---

## [Session 4] 2026-06-04 — KPI Dynamic Data Pipeline + GAS URL Update

**Commits**: `20d6a66`, `55ebc33`, `8a811ef`

### Mục tiêu
Build dynamic KPI data pipeline: người dùng có thể load `File raw.xlsx` trực tiếp trong browser → KPI views tự cập nhật mà không cần sửa code. Đồng thời sửa data lỗi trong dungPTKD và cập nhật GAS_WEBAPP_URL.

### Files thay đổi

**`assets/js/kpi-data.js`** (`20d6a66` + `55ebc33`) — 2 changes:
- `20d6a66`: Fix dungPTKD — 18 rows thay data cũ (~3% rate) bằng data Sheet1 mới (~25% rate); update agg totals (totalGD 24662→27244, bizTotal 5744→8326, dungTotal 9779→12361, dungBiz 279→2861)
- `55ebc33`: Thêm `KPI_LIVE`, `KPI_LIVE_TS`, `getKpiData()`, `setKpiLive()` — live data overlay pattern

**`assets/js/kpi-parser.js`** (`55ebc33`) — **NEW FILE** (164 lines):
- `kpiParseXlsx(file)` — FileReader + SheetJS parse File raw.xlsx
- `_kpiBuildSummary(rows)` — compute quangPTKD[], dungPTKD[], agg{} từ raw rows
- Column map: Kênh / PTKD / Owner (exact header names)
- `kpiWriteToSheet(data)` / `kpiReadFromSheet()` — GG Sheet sync via GS_WEBAPP_URL, non-blocking

**`assets/js/views/kpi-overview.js`** (`55ebc33`) — +100 lines:
- 3 toolbar buttons: [Load File Raw] / [Sync GG Sheet] / [Từ GG Sheet]
- Fix TD-022: replace `quangPTKD[1]`, `[2]`, `[10]`, `[12]` với dynamic `.find()` + sorted insight bullets
- `needPerMonth` / `bizGapFor22` computed dynamically

**`assets/js/views/kpi-progress.js`** (`55ebc33`) — minor:
- `KPI_DATA` → `getKpiData()` (1 line change)

**`assets/js/views/owner-analysis.js`** (`55ebc33`) — minor:
- `KPI_DATA` → `getKpiData()` (1 line change)

**`backend/Code.gs`** (`55ebc33`) — +12 lines:
- Add `kpi-write` and `kpi-read` action routes to doPost() router

**`backend/KpiSheetService.gs`** (`55ebc33`) — **NEW FILE** (51 lines):
- `kpiSheetWrite(data)` — write serialized KPI data to `KPI_Summary` tab
- `kpiSheetRead()` — read from `KPI_Summary` tab → return JSON

**`index.html`** (`55ebc33`) — +1 line:
- Load `kpi-parser.js` before `kpi-overview.js`

**`assets/js/constants.js`** (`8a811ef`) — GAS URL:
- `GS_WEBAPP_URL` updated to new deployed endpoint

### Không thay đổi
Dashboard, Tasks, Gantt, Performance, Action Plan, Branch Analysis, RM Analysis, Quick View

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
