# TODO — NEXT SESSION
**Prepared**: 2026-06-04
**Context**: Phase B fully complete. Refactor done — index.html is 736 lines, all CSS/JS external.

---

## Completed This Session (2026-06-04)

```
✅ git init + remote added to GitHub
✅ Main.html renamed → index.html
✅ A1+A3 patches re-applied and verified (Playwright)
✅ Phase B0: folder structure created
✅ Phase B1: CSS extracted into 9 files (assets/css/)
✅ Phase B2: JS extracted into 17 modules (assets/js/)
✅ Full test: 25/25 PASS, 0 FAIL, 0 JS errors
✅ All committed and pushed to GitHub (commits: b892079, 387ce50, 37423f6, da205dc)
```

---

## Phase A — Remaining

### A2 — GAS Backend in Repo `[BLOCKED on user action]`
**User must do**: Open [script.google.com](https://script.google.com) → Open the Apps Script project for this dashboard → Download / copy all `.gs` files

**Next session then does**:
```
mkdir backend/
# Paste GAS code into:
backend/Code.gs
```
No code changes to Main.html needed.

### A4 — Fix Gantt hardcoded date range `[Small, 5 min]`
**Location**: Task section subtitle (~line 1348 approx)
**Fix**: Replace `"2025–2026"` with dynamic `new Date().getFullYear()` range
```js
// Before: "Hiển thị tiến độ theo thời gian trong năm 2025–2026"
// After:  `Hiển thị tiến độ theo thời gian — ${new Date().getFullYear()}`
```

### A5 — Fix stale comment at line 2702 `[Cosmetic, 1 min]`
```js
// Before: // Hỗ trợ dd/mm/yyyy (đầu ra của taskToRow) và yyyy-mm-dd
// After:  // Hỗ trợ dd-mmm-yy (đầu ra của taskToRow v6.2) và yyyy-mm-dd
```

---

## Phase B — Multi-File Refactor
**Decision confirmed by PO**: Split into index.html + assets/css/ + assets/js/

### B0 — Setup structure `[10 min]`
```
mkdir assets/
mkdir assets/css/
mkdir assets/js/
mkdir assets/js/ui/
mkdir assets/js/views/
mkdir backend/
```
Rename `Main.html` → `index.html` (or create `index.html` that links to assets).

### B1 — Extract CSS (do file by file, test after each) `[~2h total]`
Extract in this order — each file is independent:

| File | Content | Lines (approx) |
|---|---|---|
| `assets/css/tokens.css` | `:root` vars + `[data-theme="dark"]` | ~55 |
| `assets/css/base.css` | `*` reset, body, scrollbars, animations | ~20 |
| `assets/css/layout.css` | sidebar, topbar, main, statusbar | ~120 |
| `assets/css/components.css` | buttons, cards, badges, toast, loading, modal | ~220 |
| `assets/css/forms.css` | form-grid, form-group, form-control, errors | ~40 |
| `assets/css/table.css` | table, filter-bar, chips, bulk-bar, pagination | ~130 |
| `assets/css/gantt.css` | gantt-* styles | ~30 |
| `assets/css/quickview.css` | qv-fab, qv-overlay, #quickViewPanel, qvp-* | ~380 |
| `assets/css/responsive.css` | @media (768px), @media (480px) | ~40 |

**Add to `<head>` in order**:
```html
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/layout.css">
<link rel="stylesheet" href="assets/css/components.css">
<link rel="stylesheet" href="assets/css/forms.css">
<link rel="stylesheet" href="assets/css/table.css">
<link rel="stylesheet" href="assets/css/gantt.css">
<link rel="stylesheet" href="assets/css/quickview.css">
<link rel="stylesheet" href="assets/css/responsive.css">
```

### B2 — Extract JS (after B1 complete) `[~4h total]`
Extract in **strict dependency order** (each file depends on globals from files before it):

```
1. assets/js/constants.js     ← GS_WEBAPP_URL, DB_COLS, DEFAULT_PICS, PAGE_SIZE
2. assets/js/helpers.js       ← picNorm, fmtDate, parseVNDate, isOverdue, ragBadge, stateChip, genId
                                  ← fmtDateExport, _MMM (moved here from inline)
3. assets/js/storage.js       ← persist(), loadCache()
4. assets/js/parsers.js       ← extractWorkbook() + _parseArrayIntoDb() (unified, deduped)
5. assets/js/api.js           ← readFromHandle, writeToHandle, syncAction
6. assets/js/ui/toast.js      ← toast()
7. assets/js/ui/modal.js      ← uiConfirm, resolveConfirm, showLoading, hideLoading
8. assets/js/ui/theme.js      ← toggleDark, applySavedTheme
9. assets/js/ui/navigation.js ← navigateTo, setupListeners, toggleSidebar, closeSidebar, copyPath
10. assets/js/crud.js         ← openTaskModal, closeTaskModal, editTask, handleSubmit,
                                  deleteTask, cloneTask, _showDuplicateIdBlocker,
                                  checkDupId, autoGenId, autoProgress, fmtTuanBC,
                                  populateInitSelect, populatePicSelect
11. assets/js/bulk.js         ← toggleSelectAll, toggleSelect, clearSelection,
                                  updateBulkBar, bulkSetRag, bulkSetState, bulkDelete
12. assets/js/views/dashboard.js  ← renderDashboard, populateDashFilter, currentWeekLabel
13. assets/js/views/tasks.js      ← renderTaskTable, getFiltered, renderFilterChips,
                                      clearFilter, clearFilters, onFilterChange,
                                      sortBy, renderPagination
14. assets/js/views/gantt.js      ← renderGantt
15. assets/js/views/performance.js← renderPerfTable, switchPerfTab
16. assets/js/views/quickview.js  ← all _qv* functions + openQuickView/closeQuickView
17. assets/js/app.js              ← init, window.onload, renderAll, populateFilters,
                                      updateClock, uiClearCache, connectDB, syncDB,
                                      handleImport, exportExcel,
                                      showDetailModal, closeDetailModal,
                                      openKbModal, closeKbModal
```

**Add to `index.html` before `</body>`**:
```html
<script src="assets/js/constants.js"></script>
<script src="assets/js/helpers.js"></script>
<script src="assets/js/storage.js"></script>
<script src="assets/js/parsers.js"></script>
<script src="assets/js/api.js"></script>
<script src="assets/js/ui/toast.js"></script>
<script src="assets/js/ui/modal.js"></script>
<script src="assets/js/ui/theme.js"></script>
<script src="assets/js/ui/navigation.js"></script>
<script src="assets/js/crud.js"></script>
<script src="assets/js/bulk.js"></script>
<script src="assets/js/views/dashboard.js"></script>
<script src="assets/js/views/tasks.js"></script>
<script src="assets/js/views/gantt.js"></script>
<script src="assets/js/views/performance.js"></script>
<script src="assets/js/views/quickview.js"></script>
<script src="assets/js/app.js"></script>
```

---

## Backlog (Phase C–E, do after B)

| Item | Phase | Priority |
|---|---|---|
| Render performance 200–500 tasks | C | 🟡 |
| Mobile filter bar collapse | D | 🟡 |
| Mobile toolbar grouping | D | 🟡 |
| Gantt mobile simplification | D | 🟢 |
| Auto weekly report generation | E (Feature) | ⭐ PO requested |

---

## Rules for Next Session

1. **Always read `PROJECT_STATE.md` first** — confirms what is live
2. **Always read `WORKING_RULE.md`** — confirms what not to touch
3. **Do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`** without explicit instruction
4. **Run verify checklist above** before starting any Phase B work
5. **One logical change per commit** — don't bundle A2 + B1 in one commit
