# TODO — NEXT SESSION
**Prepared**: 2026-06-06 (Session 7 final — all blockers cleared)
**Context**: Không còn must-do nào. GAS fully deployed & tested. TD-026 resolved. Mobile hamburger fixed. KPI views 3/3 PASS. Backlog chỉ còn Phase D mobile UX + tech debt nhỏ.

---

## GAS Deploy Checklist

| File | Status |
|---|---|
| `backend/InitiativeService.gs` | ✅ Deployed + tested end-to-end |
| `backend/KpiSheetService.gs` | ✅ Deployed + KPI Sync working |

---

## Phase D — Mobile UX (low priority, deferred)

| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable on mobile | Simplified mobile Gantt or hide |

---

## Initiative Tracker — Future Enhancements (deferred)

| Enhancement | Notes |
|---|---|
| Initiative ID rename: cascade update children's `parentId` | Current: rename ID + children still point to old parentId |
| Import initiatives from Excel | Add `initiative_master` sheet detection in `extractWorkbook()` |
| Keyboard shortcut G+I → Initiative Tracker | Add to navigation.js gKey map |
| Deadline countdown badge on cards | "X ngày còn lại" / "Quá hạn X ngày" |

---

## Tech Debt (all low priority)

| ID | Debt | Action |
|---|---|---|
| TD-004 | Global state (`db`, sort, etc.) | Phase D |
| TD-008 | No error boundary in renderAll() | Add try-catch around each render call |
| TD-009 | Duplicate parseDate in extractWorkbook vs _parseArrayIntoDb | Consolidate to parsers.js |
| TD-018 | `fmtExportDate` duplicated | Remove from app.js:exportExcel, use helpers.js version |
| TD-021 | `_sLabel`/`_kpProgColor` defined in view files, used globally | Move to `helpers.js` |
| TD-023 | `_oaActiveTab` not reset on re-render | Add `_oaActiveTab = 'quang'` at start of `renderOwnerAnalysis()` |

---

## Session Rules (unchanged)
1. Read `PROJECT_STATE.md` first
2. Read `WORKING_RULE.md` — do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. JS globals: use bare `db`, not `window.db`
5. KPI globals: `fmtKN`, `kpiChip`, `dungChip`, `kpiAlertClass`, `dungAlertClass` in `kpi-data.js`
6. KPI live data: always use `getKpiData()` not `KPI_DATA` directly in KPI views
7. Initiative views: always use `_initRealRoots()` for root initiative list
8. `syncInitiativeAdd/Edit/Delete()` in `initiatives.js` are the only safe Initiative CRUD entry points
9. Chart instances: destroyed on re-render via `try { c.destroy() }`
10. Verify scripts: use `page.route('**/script.google.com/**', r => r.abort())` để isolate khỏi GAS background load
