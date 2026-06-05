# SESSION HANDOVER
**Date**: 2026-06-05 (session 6 — Initiative DB fix + verify 37/37)
**Session**: Type col, milestone status fix, backward compat, verify suite v2
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard (branch: master)
**Local HEAD**: `f919f5c`
**Remote HEAD**: `f919f5c` (in sync)
**Previous session HEAD**: `f99e723`

---

## Tasks Completed This Session

| # | Task | Commit | Status |
|---|---|---|---|
| DB-1 | Add `Type` col to INI_COLS (15 cols A→O); 3 ID helpers | `e9f43e4` | ✅ |
| DB-2 | Fix milestone status mapping: col8 → `status` for milestone rows (not `milestoneTracking`) | `e9f43e4` | ✅ |
| DB-3 | `_initSave()`: stamp `type` field; clear MS-only fields for milestone rows | `e9f43e4` | ✅ |
| DB-4 | Category dropdown: add Số hóa, Đào tạo | `e9f43e4` | ✅ |
| DB-5 | Milestone display: short label M1 not GNOL-001-M1; `_initMsDotClass()` for Vietnamese status | `e9f43e4` | ✅ |
| BC-1 | Backward compat: all type-based filters fall back to old logic when `type` missing | `b88b448` | ✅ |
| BC-2 | Root cause identified: old `verify_initiative.mjs` failed because deployed GAS overwrote test data | `b88b448` | ✅ |
| V2 | `verify_initiative_v2.mjs` — 37/37 PASS with GAS-format data injection | `b88b448` | ✅ |
| GAS | `GS_WEBAPP_URL` updated to new deployment URL | `b88b448` | ✅ |
| CTX | ai_context docs updated (CHANGE_LOG, SESSION_HANDOVER, PROJECT_STATE, TODO_NEXT) | `f919f5c` | ✅ |

---

## Files Changed This Session

| File | Change |
|---|---|
| `assets/js/initiatives.js` | INI_COLS 15 cols; 3 helpers `_isMilestone/_msShortLabel/_msParentId`; parser fixes |
| `assets/js/views/initiative-tracker.js` | `_initRealRoots` (backward compat); milestone filter; short label; `_initMsDotClass`; `_initSave` type; category opts; backward compat fallbacks across all type filters |
| `backend/InitiativeService.gs` | Header updated to 15 cols + schema comment |
| `assets/js/constants.js` | `GS_WEBAPP_URL` updated to new GAS deployment endpoint |
| `verify_initiative_v2.mjs` | **NEW** — 37/37 PASS; GAS-format data; blocks GAS via page.route(); tests parse, labels, dots, add, delete, filter, duplicate |
| `AI_CONTEXT/*.md` | Session 6 delta: CHANGE_LOG, SESSION_HANDOVER, PROJECT_STATE, TODO_NEXT, TECH_DEBT |

---

## Root Cause: Old Verify Failure
`verify_initiative.mjs` was designed when GAS wasn't deployed. After deployment, `readInitiatives()` fires in background and overwrites test data (SCF-001) with real GAS data. New script uses `page.route('**/script.google.com/**', route => route.abort())` to isolate test environment.

---

## Schema After Fix

```
A: ID
B: Tên Initiative / Milestone
C: Category
D: Accountable
E: Start Date
F: Deadline / Target
G: % HT
H: Milestone Đang track    ← [initiative] tracked-MS name; [milestone] blank (cleared on save)
I: Deadline Milestone       ← [initiative] deadline of tracked MS; [milestone] blank
J: Trạng thái               ← [initiative] Active/Done/Paused; [milestone] Xong/Đang làm/Chưa bắt đầu
K: Mục tiêu / KPI đầu ra   ← [initiative] only
L: Ghi chú
M: Link tài liệu
N: Parent ID                ← auto-derived from ID pattern if missing
O: Type                     ← "initiative" | "milestone"; auto-derived if missing
```

## Backward Compat
- Old data WITHOUT `Type` col: parser derives type from ID pattern `/-M\d+$/`
- Old data WITHOUT `Parent ID` col: parser derives from ID for milestones
- Old localStorage (no `type` field): all UI filters fall back to `!parentId` / `!!parentId` logic
- Milestone names with `↳ ` prefix: display strips them; new saves no longer add prefix

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| Milestone modal status dropdown vs. real data | ⚪ LOW | Modal uses English values (Active/Done/Paused/Blocked); GAS data uses Vietnamese (Xong/Đang làm/Chưa bắt đầu). `_initMsDotClass` handles both, but newly created milestones via modal will store English status while GAS-synced milestones store Vietnamese. No crash, just inconsistent stored values — see TD-026. |
| `_initRealRoots()` fallback path | ⚪ LOW | If ALL items in db have `type` set but one initiative has `type = undefined` (e.g., BAU stub), it still gets filtered by the new check `all.some(i => i.type)` → `true` → strict path → BAU excluded. Correct behavior. |
| `parsers.js` hasRichData guard | ⚪ LOW | Guard `.some(x => x.status !== undefined)` — milestone rows now always have `status` set. BAU stubs (no status) still correctly excluded. Guard still works. |
| Other views | ⚪ NONE | Zero changes to Dashboard, Tasks, KPI, Gantt, Performance, Action Plan, Branch/RM Analysis. |

---

## Blockers

| Blocker | Status |
|---|---|
| `InitiativeService.gs` GAS deploy — 15 cols | ✅ User deployed (new URL in constants.js) |
| `KpiSheetService.gs` GAS deploy | 🔴 Still pending (PO action) |
| KPI views not browser-tested | 🟡 Next session |

---

## Next Session — Must Do First

1. **PO**: Confirm `InitiativeService.gs` works end-to-end — open Initiative Tracker → Sync GG Sheet → data loads from Initiative_Master tab ← test with REAL GAS data (not mock)
2. **A4**: Remove `<!-- MERGE -->` residue in HTML/JS (~10 min)
3. **A5**: Remove `loadDemoData`/`clearDemoData` debug buttons (~30 min)
4. **Browser verify KPI views**: KPI Overview → KPI Progress → Owner Analysis → 0 errors
5. **Deploy KpiSheetService.gs**: add to Apps Script → re-deploy → test KPI Sync
