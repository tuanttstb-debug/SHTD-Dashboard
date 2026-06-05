# TODO — NEXT SESSION
**Prepared**: 2026-06-05 (Session 5 — Initiative Tracker complete + verified)
**Context**: Initiative Tracker 30/30 Playwright pass. KPI views not browser-tested yet. Phase A cleanup pending.

---

## ⚠️ MUST DO FIRST

### 1. PO Deploy — GAS Updates (Action on PO)
Two new GAS files in `backend/` not yet deployed to Apps Script:

**`backend/InitiativeService.gs`** (new):
1. Open Apps Script project → Add file `InitiativeService.gs`
2. Paste content → re-deploy as Web App (Update existing deployment)
3. Test: Initiative Tracker → "Sync GG Sheet" → should write to `Initiative_Master` tab

**`backend/KpiSheetService.gs`** (from Session 4, still not deployed):
1. Add file `KpiSheetService.gs` to Apps Script → re-deploy
2. Test: KPI Overview → "Sync GG Sheet"

### 2. Browser Verify — KPI Views (not tested since Session 3+4)
Open `index.html` → navigate to:
- [ ] **KPI Overview** — renders, Load File Raw button works, 0 JS errors
- [ ] **KPI Progress** — renders correctly
- [ ] **Owner Analysis** — 3 tabs, no errors
- [ ] **Initiative Tracker** — confirm looks correct in real browser (Playwright verified logic, not visuals)
- [ ] Console: 0 JS errors

---

## Phase A — Remaining Quick Wins

### A4 — Remove visible merge instructions (~10 min)
- Grep `index.html` for `<!-- MERGE -->` comments or instruction text
- Grep `assets/js/` for leftover merge `console.log` residue

### A5 — Remove debug buttons (~30 min)
- Search `index.html` + `assets/js/` for `loadDemoData` / `clearDemoData`
- PO confirmed: **remove entirely**

---

## Initiative Tracker — Potential Enhancements (future)

| Enhancement | Notes |
|---|---|
| Initiative ID rename: cascade update children's `parentId` | Current: rename ID + children still point to old parentId |
| Import initiatives from Excel | Add `initiative_master` sheet detection in `extractWorkbook()` with full 14-col schema |
| Keyboard shortcut G+I → Initiative Tracker | Add to navigation.js gKey map |
| Deadline countdown badge on cards | Show "X ngày còn lại" / "Quá hạn X ngày" |

---

## Phase D — Mobile UX (Low priority, deferred)

| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable on mobile | Simplified mobile Gantt or hide |

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
7. Initiative views: always use `_initRealRoots()` for root initiative list (excludes BAU + stubs)
8. `syncInitiativeAdd/Edit/Delete()` in `initiatives.js` are the only safe Initiative CRUD entry points
9. Chart instances: destroyed on re-render via `try { c.destroy() }`
