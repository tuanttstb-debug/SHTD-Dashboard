# TODO — SHTD Dashboard

## Status Legend
- [ ] Not started
- [x] Completed
- [~] In progress

---

## Phase 0 — Discovery ✅ DONE
- [x] Read Main.html, GAS.GS, AI_CONTEXT files
- [x] Understand business context
- [x] Interview Product Owner (vòng 1 — 2026-06-03)

---

## Phase A — Quick Wins (Bug Fixes, Zero Behavior Risk)
**Làm trước, không cần thay đổi kiến trúc.**

- [x] **A1** — Xóa orphaned HTML trong `<style>` block (lines 154–178) ✅ 2026-06-03
  - [x] Xóa debug buttons (`loadDemoData`, `clearDemoData`)
  - [x] Xóa merge guide instructions
  - [x] Di chuyển `qv-topbar-btn` vào đúng vị trí trong `<body>` topbar (line 1108)
- [ ] **A2** — Export GAS backend từ Apps Script Editor → lưu vào `/backend/Code.gs`
- [x] **A3** — Apply FIX 4+5 từ GAS.GS vào Main.html ✅ 2026-06-03
  - [x] Thêm `const _MMM` + `function fmtDateExport(d)` (line 2230–2256)
  - [x] Replace `taskToRow()` sang phiên bản v6.2 (date: dd-mmm-yy, progress: "75%")
  - [x] Replace `checkDupId()` sang phiên bản v6.2 (phân biệt ADD vs EDIT message)
  - [x] Bonus: thêm dd-mmm-yy parse vào `_parseArrayIntoDb` để round-trip an toàn
- [ ] **A4** — Cập nhật Gantt subtitle từ hardcoded "2025–2026" sang dynamic

---

## Phase B — Tách File (CSS + JS Modularization)
**Theo quyết định của PO: tách thành multi-file structure.**

### B1 — Setup project structure
- [ ] Tạo thư mục: `assets/css/`, `assets/js/`, `assets/js/views/`, `backend/`
- [ ] Đổi tên `Main.html` → `index.html`

### B2 — CSS Extraction
- [ ] `assets/css/tokens.css` — Design tokens (`:root` vars + dark mode)
- [ ] `assets/css/base.css` — Reset, body, scrollbars
- [ ] `assets/css/layout.css` — Sidebar, topbar, main, statusbar
- [ ] `assets/css/components.css` — Buttons, cards, badges, modals, toast, loading
- [ ] `assets/css/forms.css` — Form controls, validation
- [ ] `assets/css/table.css` — Table, filter bar, chips, bulk bar, pagination
- [ ] `assets/css/gantt.css` — Gantt chart styles
- [ ] `assets/css/quickview.css` — Quick View Panel + FAB
- [ ] `assets/css/responsive.css` — @media queries

### B3 — JS Extraction (theo dependency order)
- [ ] `assets/js/constants.js` — GS_WEBAPP_URL, DB_COLS, DEFAULT_PICS, PAGE_SIZE
- [ ] `assets/js/helpers.js` — picNorm, fmtDate, parseVNDate, isOverdue, genId, ragBadge, stateChip
- [ ] `assets/js/parsers.js` — Gộp _parseArrayIntoDb + extractWorkbook thành 1 module (xóa duplicate logic)
- [ ] `assets/js/storage.js` — persist(), loadCache()
- [ ] `assets/js/api.js` — readFromHandle, writeToHandle, syncAction
- [ ] `assets/js/ui/toast.js` — toast()
- [ ] `assets/js/ui/modal.js` — uiConfirm, showLoading, hideLoading
- [ ] `assets/js/ui/navigation.js` — navigateTo, setupListeners, toggleSidebar
- [ ] `assets/js/ui/theme.js` — toggleDark, applySavedTheme
- [ ] `assets/js/views/dashboard.js` — renderDashboard, populateDashFilter
- [ ] `assets/js/views/tasks.js` — renderTaskTable, getFiltered, renderFilterChips, sortBy, renderPagination
- [ ] `assets/js/views/gantt.js` — renderGantt
- [ ] `assets/js/views/performance.js` — renderPerfTable, switchPerfTab
- [ ] `assets/js/views/quickview.js` — openQuickView, renderQuickView, _qv* funcs
- [ ] `assets/js/crud.js` — editTask, handleSubmit, deleteTask, cloneTask
- [ ] `assets/js/bulk.js` — bulkSetRag, bulkSetState, bulkDelete
- [ ] `assets/js/app.js` — init, window.onload, renderAll (entry point)

---

## Phase C — Performance (200–500 task range)
- [ ] Benchmark render time với mock 500 tasks
- [ ] Virtual scrolling hoặc smarter DOM diffing cho task table (nếu cần)
- [ ] Debounce filter tối ưu (hiện 200ms — có thể tăng lên 300ms)
- [ ] Lazy render Gantt (chỉ render khi tab active — đã có, kiểm tra lại)

---

## Phase D — Mobile UX Improvement
- [ ] Audit filter bar trên mobile (quá nhiều filter → collapse/accordion)
- [ ] Toolbar buttons overflow trên mobile → nhóm lại hoặc dùng dropdown
- [ ] Gantt mobile → simplify hoặc thêm scroll hint
- [ ] Quick View panel trên mobile → kiểm tra 88vh behavior
- [ ] Touch targets tất cả buttons ≥ 44px

---

## Phase E — Future Feature: Auto Weekly Report
*(Sau khi Phase A + B hoàn thành)*
- [ ] Xác định format output: Word / PDF / Email / Google Doc
- [ ] Design template: Kết quả tuần qua / Kế hoạch tuần tới / Vướng mắc / BLĐ
- [ ] Implement export function

---

## Immediate Next Actions (Hôm nay)

1. [ ] **Apply Phase A3** — Fix `taskToRow()` v6.2 (export bug đang ảnh hưởng user)
2. [ ] **Apply Phase A1** — Dọn orphaned HTML, thêm Quick View button vào topbar
3. [ ] **Apply Phase A2** — Export GAS backend và commit vào repo
4. [ ] **Commit AI_CONTEXT docs** lên GitHub
