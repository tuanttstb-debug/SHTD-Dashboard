# SESSION HANDOVER
**Date**: 2026-06-03  
**Session**: Discovery + Phase A1 + A3  
**Model**: Claude Sonnet 4.6  
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard

---

## What Was Done This Session

### 1. Full Project Discovery (Phase 0–4)
Read and analysed all 3 source files + 5 pre-existing AI_CONTEXT docs.

**Critical finding**: Pre-existing AI_CONTEXT docs (`SYSTEM_ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, etc.) describe a **different project** (TPBank BIZ). They are design references, not documentation of this codebase. All new docs carry the `_CURRENT` suffix or new names to avoid confusion.

**Critical finding**: `GAS.GS` is not a GAS backend — it is a JS patch file with manual merge instructions. The actual Apps Script backend lives on `script.google.com` and is **not in this repo**.

**Critical finding (confirmed by code diff)**: GAS.GS FIX 4 (date format) and FIX 5 (progress %) were **not yet merged** into Main.html when this session started.

### 2. PO Interview — 12 Questions Answered
Key decisions captured (full log → OPEN_QUESTION.md):

| Decision | Answer |
|---|---|
| Deployment | **GitHub Pages** (static) |
| GAS backend | On Apps Script Editor — needs export |
| Priority | Bug fix → Refactor → Feature |
| Users | 5–20 people, desktop + mobile |
| Export date format | **dd-mmm-yy** confirmed |
| Broken features | Performance + Mobile + Sync |
| Data volume | **200–500 tasks** |
| Debug buttons | **Delete** |
| Quick View | **Used frequently** — keep + improve |
| Refactor style | **Multi-file** (index.html + assets/) |
| Next feature | **Auto weekly report** |

### 3. Code Changes Applied

#### Phase A1 — Fix Orphaned HTML in `<style>` Block
**Root cause**: During Quick View Panel merge, HTML was accidentally pasted inside the `<style>` block (lines 154–178 of the original). The browser silently ignored it — users never saw those elements.

**Changes**:
- Removed `loadDemoData()`, `clearDemoData()` buttons (orphaned, functions may not exist)
- Removed merge guide `<div>` (developer artifact, never rendered)
- **Moved** `<button class="qv-topbar-btn">` + `#qvDot` to actual `.topbar-right` in `<body>` (line 1108) — Quick View button now renders for the first time

#### Phase A3 — Apply GAS.GS v6.2 Patches
- **Added** `const _MMM` (line 2230) — month abbreviation array
- **Added** `function fmtDateExport(d)` (line 2235) — converts YYYY-MM-DD → "22-Apr-26"
- **Replaced** `taskToRow()` — dates now "dd-mmm-yy", progress now "75%" string
- **Replaced** `checkDupId()` — v6.2: distinguishes ADD vs EDIT, shows different messages with icon
- **Bonus** — added `_mmmIdx` + dd-mmm-yy branch in `_parseArrayIntoDb.parseDate` for safe round-trip

---

## Files Changed

| File | Change | Lines Before → After |
|---|---|---|
| `Main.html` | A1 + A3 edits | 4076 → 4109 |
| `AI_CONTEXT/TODO.md` | Marked A1+A3 complete | updated |
| `AI_CONTEXT/CHANGE_LOG.md` | Added v6.2-merged entry | updated |
| `AI_CONTEXT/OPEN_QUESTION.md` | Marked 15 questions resolved | updated |

**Files created this session** (documentation only, no code):
`PROJECT_OVERVIEW.md`, `BUSINESS_FLOW.md`, `SYSTEM_ARCHITECTURE_CURRENT.md`, `SOURCE_CODE_INVENTORY.md`, `UI_AUDIT.md`, `TECH_DEBT.md`, `REFACTORING_PLAN.md`, `IMPACT_ANALYSIS.md`, `ASSUMPTION_LOG.md`, `WORKING_RULE.md`, `GITHUB_WORKFLOW.md`, `SESSION_HANDOVER.md`, `PROJECT_STATE.md`, `TODO_NEXT.md`

---

## Decisions Made

| # | Decision | Rationale |
|---|---|---|
| D1 | Keep Quick View Panel, add topbar button | PO confirmed frequent use |
| D2 | Delete `loadDemoData`/`clearDemoData` | PO confirmed not needed |
| D3 | Apply dd-mmm-yy format immediately | User-visible export bug, confirmed by PO |
| D4 | Add round-trip parse for dd-mmm-yy | Prevent silent data corruption on read-back |
| D5 | Multi-file refactor (Phase B) | GitHub Pages deployment supports it; PO chose this path |
| D6 | Hardcoded team names OK for now | PO: stable, changes ~1-2x/year |

---

## Blockers

| Blocker | Impact | Owner |
|---|---|---|
| GAS backend source not in repo | Cannot audit/version backend; deploy process undocumented | **PO** — export from Apps Script Editor |
| Phase B not started | CSS/JS still monolith | Unblocked — waiting for next session |
| A2 pending | `/backend/Code.gs` not yet created | Needs PO to export `.gs` file |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| `taskToRow()` writes "75%" string | 🟡 LOW | GAS `doPost write` receives array with "75%" — GAS backend must handle string parse. Likely fine since `parseInt("75%") = 75`. Verify in Sheet after next sync. |
| `taskToRow()` writes "22-Apr-26" | 🟡 LOW | Google Sheets auto-detects as date. If locale prevents detection, dates become text strings in Sheet. Monitor after first sync. |
| `_parseArrayIntoDb` parseDate changed | 🟡 LOW | New branch for dd-mmm-yy added, existing ISO + VN branches restructured. Logic equivalent but test with: ISO "2026-04-22" ✓, VN "22/04/2026" ✓, dd-mmm-yy "22-Apr-26" ✓ |
| `checkDupId` sets `innerHTML` | ⚪ NONE | `errId` div starts with static content, now dynamic. Only changes when `exists=true`. No XSS risk (no user input injected). |
| QV topbar button now visible | ⚪ NONE | `qvDot` JS at line 3633 now finds the element → badge dot logic activates. No risk. |
| Stale comment at line 2702 | ⚪ NONE | Comment says "dd/mm/yyyy (đầu ra của taskToRow)" — now stale since output is "dd-mmm-yy". Cosmetic only. |

---

## What Was NOT Touched

These functions are untouched and unchanged:
- `syncAction()` — line 2431 (multi-user Read-Then-Patch logic intact)
- `handleSubmit()` — line 3372 (duplicate ID blocker intact)
- `_showDuplicateIdBlocker()` — intact
- `readFromHandle()` — line 2291 (GAS read protocol intact)
- `writeToHandle()` — line 2399 (full-write fallback intact)
- `extractWorkbook()` — Excel import untouched
- All render functions — `renderDashboard`, `renderTaskTable`, `renderGantt`, `renderPerfTable`
- Quick View JS — `renderQuickView`, all `_qv*` functions
- `localStorage` format — `shtd_v2` key and schema unchanged
- `DB_COLS` constant — unchanged (column order preserved)
- `GS_WEBAPP_URL` / `GS_SHEET_ID` — unchanged

---

## Handover Checklist for Next Session

- [ ] Commit current Main.html to GitHub (`fix: apply v6.2 patches + fix orphaned HTML`)
- [ ] Test Quick View topbar button renders and opens panel
- [ ] Test Export Excel — verify dates show "22-Apr-26" and progress shows "75%"
- [ ] Test Add Task → duplicate ID shows correct message ("Không thể thêm mới" vs "đã được dùng bởi task khác")
- [ ] Do A2: get GAS backend `.gs` file from user → create `/backend/Code.gs`
- [ ] Start Phase B: `assets/` folder structure + CSS extraction
