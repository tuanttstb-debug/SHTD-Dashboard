# SESSION HANDOVER
**Date**: 2026-06-05 (session 5 — Initiative Management feature + verify + fix)
**Session**: Full Initiative Tracker built (I-A→I-E), local Playwright verify, 3 bugs fixed, pushed
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard (branch: master)
**Local HEAD**: `f99e723`
**Remote HEAD**: `f99e723` (in sync)
**Previous session HEAD**: `8c8dee7`

---

## Tasks Completed This Session

| # | Task | Commit | Status |
|---|---|---|---|
| I-A | GAS: `InitiativeService.gs` + `initiative-read/write` routes in `Code.gs` | `35f4b62` | ✅ Done |
| I-B | Data layer: `initiatives.js` — INI_COLS[14], parser, `readInitiatives/writeInitiatives`, CRUD sync | `9c4673d` | ✅ Done |
| I-C | CSS: `initiative.css` — card, stat bar, progress, milestone step, task table, modal grid | `8b87d49` | ✅ Done |
| I-D | View: `initiative-tracker.js` — accordion cards, CRUD modal, cascade delete, filter, nav item | `68a2aa5` | ✅ Done |
| I-E | Task form: `_populateMilestoneSelect()` — fMs dropdown from Initiative_Master by initiative | `06d423c` | ✅ Done |
| fix | 3 bugs: validation order, BAU stub filter, parsers.js hasRichData guard | `4ba8ec6` | ✅ Done |
| verify | Playwright 30/30 PASS — `verify_initiative.mjs` | — | ✅ Done |

---

## Files Changed This Session

| File | Change |
|---|---|
| `backend/InitiativeService.gs` | **NEW** — `initiativeRead()` / `initiativeWrite()` for `Initiative_Master` tab (auto-creates if missing, 14 cols) |
| `backend/Code.gs` | +14 lines: `initiative-read` and `initiative-write` routes |
| `assets/js/initiatives.js` | **NEW** — INI_COLS[14], `initiativeToRow()`, `_parseInitiativeArray()`, `readInitiatives()`, `writeInitiatives()`, `syncInitiativeAdd/Edit/Delete()` |
| `assets/js/parsers.js` | Guard `_parseArrayIntoDb()` + `extractWorkbook()` to not override rich initiative data; `.some()` for hasRichData |
| `assets/js/app.js` | Call `readInitiatives()` non-blocking after `autoConnectDB()` |
| `assets/css/initiative.css` | **NEW** — `.init-card`, `.init-stat-*`, `.init-prog-*`, `.init-status-chip`, `.init-toggle-*`, `.init-milestone-*`, `.init-task-table`, `.init-modal-grid`, `.init-empty` |
| `assets/js/views/initiative-tracker.js` | **NEW** — `renderInitiativeTracker()`, `_initRealRoots()`, accordion cards, CRUD modal 14 fields, cascade delete, filter, toggle panels |
| `assets/js/ui/navigation.js` | Add `initiative-tracker` title + render call; `_populateMilestoneSelect('')` on fInit change |
| `assets/js/crud.js` | Add `_populateMilestoneSelect()` — dynamic by initiative, fallback to M1-M8 |
| `index.html` | Nav item, view section, CSS link, 2 script tags; `#fMs` options stripped (dynamic) |

**NOT changed**: Dashboard, KPI views, Gantt, Performance, Action Plan, Branch Analysis, RM Analysis, Quick View

---

## Commits This Session

| Hash | Message |
|---|---|
| `35f4b62` | feat(I-A): GAS backend – initiative-read/write routes + InitiativeService.gs |
| `9c4673d` | feat(I-B): initiative data layer – INI_COLS, parser, sync functions |
| `8b87d49` | feat(I-C): initiative CSS – card, milestone, progress, task-list styles |
| `68a2aa5` | feat(I-D): initiative tracker view – accordion cards, CRUD modal, GAS sync |
| `06d423c` | feat(I-E): task form – milestone select from Initiative_Master |
| `4ba8ec6` | fix(initiative): 3 bugs found in local verify session |
| `f99e723` | Merge remote main (GAS URL update) |

---

## Bugs Fixed This Session (from verify)

| Bug | Root Cause | Fix |
|---|---|---|
| Duplicate ID check didn't fire when name was empty | `_initSave()` checked name before duplicate — `!name` returned early first | Moved duplicate check before name check |
| BAU appeared as initiative card after deleting user-added initiatives | BAU auto-discovered from tasks gets into `db.initiatives` without `status` field; `parentId` is undefined → falsy → not filtered as child | Added `_initRealRoots()` that filters `id !== 'BAU'` and `status !== undefined`; applied to all card list/stat renders |
| `parsers.js` guard could be bypassed if BAU was first item in cached array | `db.initiatives[0].status` checked index 0 — if BAU was first, guard returned false and reset initiatives | Changed to `.some(x => x.status !== undefined)` |

---

## Decisions Made

| Decision | Reason |
|---|---|
| `INI_COLS` 14 columns — added `Parent ID` col vs positional detection | Explicit parent FK is more reliable than detecting hierarchy by row position |
| `_initRealRoots()` helper filters BAU + auto-discovered stubs | BAU is a task classification, not a real initiative; stubs have no `status` field |
| Cascade delete: milestones deleted when parent initiative deleted | Orphan milestones (parentId points to non-existent initiative) would never show in any view — clean up on parent delete |
| fMs dropdown falls back to M1-M8 when no milestones in Initiative_Master | Backward compat — existing tasks using M1-M8 naming still work even without Initiative_Master data |

---

## Blockers

| Blocker | Impact | Action needed |
|---|---|---|
| `InitiativeService.gs` not yet deployed to Apps Script | GAS sync buttons (`Sync GG Sheet`) in Initiative Tracker won't work | PO: add `backend/InitiativeService.gs` to Apps Script → re-deploy → test sync button |
| `KpiSheetService.gs` not yet deployed | KPI GG Sheet sync non-functional | PO: same — paste + re-deploy |
| KPI views not browser-tested (sessions 3+4) | May have minor JS errors from KPI pipeline changes | Next session: open index.html → navigate KPI views → check console |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| `_populateMilestoneSelect()` called globally — requires `fMs` element to exist | ⚪ LOW | Called on `fInit` change. If modal is closed when event fires, `getElementById('fMs')` returns null and the function does an early return. No crash. |
| `writeInitiatives()` fires non-blocking after every CRUD op | ⚪ LOW | If GAS URL fails (offline), writes are silently lost for that session. Data stays in `db.initiatives` + localStorage. GAS sync happens on next explicit sync. |
| Other views | ⚪ NONE | Zero changes to Dashboard/Tasks/KPI/etc. |

---

## Key File Locations (updated)

| Concern | File |
|---|---|
| Initiative data + CRUD sync | `assets/js/initiatives.js` ← NEW |
| Initiative Tracker view | `assets/js/views/initiative-tracker.js` ← NEW |
| Initiative CSS | `assets/css/initiative.css` ← NEW |
| GAS initiative backend | `backend/InitiativeService.gs` ← NEW |
| GAS task backend | `backend/Code.gs`, `Config.gs`, `SheetService.gs` |
| GAS KPI backend | `backend/KpiSheetService.gs` |
| KPI data + live overlay | `assets/js/kpi-data.js` |
| KPI xlsx parser | `assets/js/kpi-parser.js` |
| GS_WEBAPP_URL config | `assets/js/constants.js` |

---

## Next Session — Must Do First

1. **PO Deploy GAS**: Add `backend/InitiativeService.gs` + `backend/KpiSheetService.gs` to Apps Script → re-deploy → test sync buttons
2. **Browser verify KPI views**: Open `index.html` → KPI Overview → KPI Progress → Owner Analysis → 0 JS errors
3. **A4**: Remove merge instruction residue in HTML/JS (~10 min)
4. **A5**: Remove `loadDemoData`/`clearDemoData` debug buttons (~30 min)
