# TODO — NEXT SESSION
**Prepared**: 2026-06-06 (Session 8 — Auth deployed, W0+W1 done)
**Context**: Auth gate live on production. No must-do blockers. Next: W2 tech debt, W3 mobile UX, future auth enhancements.

---

## GAS Deploy Checklist

| File | Status |
|---|---|
| `backend/AuthService.gs` | ✅ Deployed + tested (session 8) |
| `backend/InitiativeService.gs` | ✅ Deployed + tested |
| `backend/KpiSheetService.gs` | ✅ Deployed + tested |

---

## W2 — Tech Debt (next priority)

| ID | Debt | Action |
|---|---|---|
| TD-008 | No error boundary in renderAll() | Wrap each render call in try-catch; one broken view must not freeze whole app |
| TD-018 | `fmtExportDate` duplicated in `app.js` vs `helpers.js` | Remove from app.js:exportExcel, use helpers.js version |
| TD-023 | `_oaActiveTab` not reset on re-render | Add `_oaActiveTab = 'quang'` at start of `renderOwnerAnalysis()` |

---

## W3 — Phase D Mobile UX (low priority)

| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable on mobile | Simplified mobile Gantt or hide |

---

## Auth — Future Enhancements (deferred)

| Enhancement | Notes |
|---|---|
| Role-based UI enforcement | Admin: full access; User: hide delete/bulk-delete buttons |
| Change password UI | User can change own password from user-pill dropdown |
| Admin user management panel | Add/deactivate users without editing GAS sheet manually |
| AUTH_SECRET via Script Properties | Currently uses hardcoded fallback — set `AUTH_SECRET` property for production hardening |

---

## Initiative Tracker — Future Enhancements (deferred)

| Enhancement | Notes |
|---|---|
| Initiative ID rename: cascade update children's `parentId` | Current: rename ID + children still point to old parentId |
| Import initiatives from Excel | Add `initiative_master` sheet detection in `extractWorkbook()` |
| Keyboard shortcut G+I → Initiative Tracker | Add to navigation.js gKey map |
| Deadline countdown badge on cards | "X ngày còn lại" / "Quá hạn X ngày" |

---

## Remaining Tech Debt (low priority)

| ID | Debt | Action |
|---|---|---|
| TD-004 | Global state (`db`, sort, etc.) | Phase D |
| TD-009 | Duplicate parseDate in extractWorkbook vs _parseArrayIntoDb | Consolidate to parsers.js |
| TD-021 | `_sLabel`/`_kpProgColor` defined in view files, used globally | Move to `helpers.js` |

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
10. All GAS calls MUST go through `gasPost()` in `auth.js` — never use raw fetch() for GAS endpoints
11. Verify scripts: use `page.route('**/script.google.com/**', r => r.abort())` to isolate from GAS background load
