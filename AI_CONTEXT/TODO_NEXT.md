# TODO — NEXT SESSION
**Prepared**: 2026-06-04 (Phase F complete — all KPI Digital views live)
**Context**: A–F all done. Remaining work: Phase D (mobile), A2 (GAS backend), tech debt.

---

## Phase F — COMPLETE ✅

All 6 KPI Digital views are implemented and verified:
- KPI Overview, Action Plan, KPI Progress, Owner Analysis, Branch Analysis, RM Analysis
- All views pass Playwright headless test — 0 JS errors

---

## What's Left

### A2 — GAS Backend (BLOCKED on PO)
User must export `Code.gs` from Apps Script Editor → `backend/Code.gs`.
No code changes needed — just the file drop.

### Phase D — Mobile UX (Low priority, deferred)
| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable (280px label column) | Simplified mobile Gantt or hide |

### Tech Debt (all low priority)
| ID | Debt | Action |
|---|---|---|
| DEBT-03 | `extractWorkbook` parseDate ignores "dd-mmm-yy" on re-import | Add format to `_parseArrayIntoDb` |
| DEBT-05 | `fmtExportDate` duplicated in `app.js` vs `helpers.js` | Consolidate to `helpers.js`, remove from `app.js` |
| DEBT-06 | Inline `onchange` + `addEventListener` both fire on filter elements | Remove inline handlers, use only `addEventListener` |

### KPI Data — Update When Ready
When PO has new monthly data (T6 confirmed, T7+):
- Edit `assets/js/kpi-data.js` — update `products[x].biz[5]`, `bpm[5]`, `cust[5]`, `summary.*`
- Add months T7+ by extending `months[]`, `monthsFull[]`, and all monthly arrays
- No structural changes needed

---

## Session Rules (unchanged)
1. Read `PROJECT_STATE.md` first
2. Read `WORKING_RULE.md` — do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. JS globals: use bare `db`, not `window.db`
5. Syntax-check JS with `node -e "new Function(...)"` before committing
6. KPI helper functions `_sLabel` / `_kpProgColor` are global — defined in kpi-overview.js / kpi-progress.js (loaded first)
