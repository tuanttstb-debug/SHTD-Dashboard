# TECHNICAL DEBT — SHTD Dashboard v6.2

## Debt Rating Scale
- 🔴 **CRITICAL** — blocks scaling, high risk of breakage
- 🟡 **HIGH** — significant pain in daily development
- 🟢 **MEDIUM** — noticeable friction, addressable in refactoring
- ⚪ **LOW** — minor, cosmetic, nice-to-have

---

## ~~TD-001: Monolithic Single-File Architecture~~ ✅ RESOLVED 2026-06-04

**Resolution**: Phase B complete. `index.html` reduced from 4076 → 736 lines (HTML-only shell).
- 9 CSS files in `assets/css/`
- 17 JS modules in `assets/js/`
- Verified: 25/25 Playwright tests — 0 failures

---

## ~~TD-002: No Real Google Apps Script Backend in Repo~~ ✅ RESOLVED 2026-06-04

**Resolution (A2)**: `backend/Code.gs`, `backend/Config.gs`, `backend/SheetService.gs` added — commit `c18cccb`.
- `doPost()` router handles `read` / `write` actions
- `sheetRead()` / `sheetWrite()` in SheetService.gs
- API contract matches frontend exactly (text/plain POST, JSON response)

**Remaining action (on PO)**: Deploy these files to Google Apps Script → update `GS_WEBAPP_URL` in `constants.js`.
Old manually-deployed backend still active until PO deploys new version.

---

## ~~TD-003: Two Conflicting Versions of taskToRow() and checkDupId()~~ ✅ RESOLVED 2026-06-03

**Resolution**: Applied GAS.GS v6.2 patches to Main.html this session.
- `taskToRow()` now uses `fmtDateExport()` → dates "22-Apr-26", progress "75%"
- `checkDupId()` v6.2 → distinguishes ADD vs EDIT, correct messages
- `GAS.GS` is now fully superseded — all patches merged. Safe to archive.

---

## TD-004: All State in Global Variables
**Rating**: 🟡 HIGH

**Issue**: Application state (`db`, `sort`, `chartInst`, `selectedIds`, `currentPage`, `confirmResolve`, `_qvActiveTab`, `_qvIsOpen`) are all window-level globals.

**Impact**:
- No encapsulation, any function can mutate state
- Race conditions possible if events fire concurrently
- Debugging requires knowing all global names
- No predictable state transitions

**Priority**: Addressable in v7 modularization

---

## TD-005: Inline Styles Scattered Throughout HTML
**Rating**: 🟡 HIGH

**Issue**: Hundreds of `style=""` attributes throughout the HTML — e.g., `style="font-size:13px;color:var(--text-3);"`.

**Impact**:
- Cannot apply design changes globally
- Inconsistent spacing/sizing despite design tokens
- Violates the design system principle (see UIUX_SYSTEM.md)
- Hard to maintain responsiveness

**Count estimate**: 100+ inline style attributes.

---

## TD-006: Hardcoded Dropdown Options
**Rating**: 🟡 HIGH

**Issue**: Team names, state options, category options, and milestone options are hardcoded in HTML `<option>` elements.

```html
<option>Số</option><option>CV1</option><option>CV2</option>...
```

**Impact**:
- Changing a team name requires editing HTML
- Category list cannot be driven by data
- No admin interface to manage options
- Risk of inconsistency between import parser and form options

---

## ~~TD-007: Manual Patch Process (GAS.GS)~~ ✅ RESOLVED 2026-06-04

**Resolution**: `GAS.GS` fully superseded — all v6.1/v6.2 patches merged into modular JS files (`parsers.js`, `crud.js`, `api.js`). File archived in repo history. No future patch process needed.

---

## TD-008: No Error Boundary / Recovery
**Rating**: 🟡 HIGH

**Issue**: If `renderAll()` fails partway through, the app shows partial UI. No try-catch around render calls. No graceful degradation.

**Impact**: Single JS error in render can break the entire view.

---

## TD-009: Duplicate Parsing Logic
**Rating**: 🟢 MEDIUM

**Issue**: Date parsing, RAG parsing, state normalization, and Y/N parsing are implemented TWICE:
- Once in `extractWorkbook()` (Excel import path)
- Once in `_parseArrayIntoDb()` (GAS read path)

Both implementations have subtle differences (e.g., `dd-mmm-yy` handling in import vs. GAS read).

**Impact**: Behavioral inconsistencies between importing an Excel and reading from Sheet.

---

## TD-010: CDN Dependencies Without SRI / Version Lock
**Rating**: 🟢 MEDIUM

**Issue**: All 4 CDN dependencies (Chart.js, xlsx, Font Awesome, Google Fonts) load from CDN without Subresource Integrity (SRI) hashes.

**Impact**: Supply chain attack vector. CDN outage breaks the app.

---

## ~~TD-011: AI_CONTEXT Describes Wrong Architecture~~ ✅ RESOLVED 2026-06-03

**Resolution**: Created new documentation set this session that accurately reflects the actual codebase. Old files (DESIGN_SYSTEM.md etc.) retained as design references but clearly labelled in PROJECT_OVERVIEW.md as "from another project".

---

## TD-012: No Automated Test Suite
**Rating**: 🟢 MEDIUM → ⚪ LOW (partially addressed)

**Issue**: No committed test suite — no unit tests, no integration tests.

**Partial resolution 2026-06-04 (Phase B)**: Ad-hoc Playwright script (`pw_verify/full_test.js`) — 25 checks, all views. Not committed, not CI.

**Partial resolution 2026-06-04 (Phase F)**: `verify_kpi.mjs` — Playwright headless test for all 6 KPI Digital views, run after implementation. Also not committed.

**Remaining gap**: No CI integration, no unit tests for pure functions (parsers, helpers, kpi-data helpers).

---

## TD-013: Sync "Last Write Wins" Legacy Risk
**Rating**: 🟢 MEDIUM

**Issue**: The `writeToHandle()` function (line 2366) still does a full write (last-write-wins). While `syncAction()` now uses Read-Then-Patch, `writeToHandle()` is called from some legacy paths and is not guarded against concurrent edits.

---

## TD-014: Emoji in Select Options (Anti-pattern)
**Rating**: ⚪ LOW

**Issue**: Select options use emoji: `<option value="Green">🟢 Green – Tốt</option>`. According to the design system (UIUX_SYSTEM.md), emoji should not be used as primary UI indicators in enterprise views.

---

## TD-015: PIC Accountable Hardcoded Default
**Rating**: ⚪ LOW

**Issue**: `<input ... value="Tuantt4">` — PIC Accountable defaults to a specific user's ID. New team members will forget to change this.

---

## TD-020: KPI Data Hardcoded — No Refresh Mechanism
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (Phase F)

**Issue**: `assets/js/kpi-data.js` has hardcoded monthly arrays (`biz[]`, `bpm[]`, `cust[]`). Adding a new month requires manually editing the JS file and committing.

**Impact**: Risk of stale KPI numbers without a clear update signal. Each monthly update needs a deploy.

**Mitigation**: File is well-structured and commented. Acceptable short-term. Long-term: consider a separate JSON file or a GAS read path for KPI data.

---

## TD-021: Shared Helpers Defined in View Files
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (Phase F)

**Issue**: `_sLabel()` and `_kpProgColor()` are utility functions defined in `kpi-overview.js` and `kpi-progress.js` respectively, but used by all 6 KPI view files. They work because of global scope and load order, but are not in a shared helper file.

**Impact**: If `kpi-overview.js` is removed or load order changes, dependent views break silently.

**Fix**: Move both to `helpers.js` or a new `assets/js/kpi-helpers.js`.

---

## TD-022: quangPTKD Accessed by Hardcoded Index
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (KPI merge)

**Issue**: `kpi-overview.js` references `quangPTKD[1]`, `[2]`, `[10]`, `[12]` by position to extract PTKD names for insight bullets. If array order in `kpi-data.js` ever changes, wrong names will silently appear.

**Fix**: Replace with `.find(x => x.ptkd === 'AnhDT24')` etc. or compute top/bottom dynamically.

---

## TD-023: KPI Tab State Not Restored on Re-render
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (KPI merge)

**Issue**: `_oaActiveTab` in `owner-analysis.js` persists across `navigateTo` calls. On re-render, HTML always shows QuangNN3 tab as active, but `_oaActiveTab` may still be 'dung' or 'rank'. No crash, minor visual inconsistency before first user click.

**Fix**: Reset `_oaActiveTab = 'quang'` at start of `renderOwnerAnalysis()`.

---

## Debt Summary
**Last updated**: 2026-06-04

| ID | Rating | Issue | Effort | Status |
|---|---|---|---|---|
| ~~TD-001~~ | ~~🔴~~ | ~~Monolith~~ | Large | ✅ **Resolved 2026-06-04** — Phase B complete |
| ~~TD-002~~ | ~~🔴~~ | ~~GAS backend not in repo~~ | Small | ✅ **Resolved 2026-06-04** — `backend/` added, deploy pending PO |
| TD-003 | ~~🔴~~ | Conflicting function versions | Small | ✅ **Resolved 2026-06-03** |
| TD-004 | 🟡 | Global state | Medium | Open — Phase D |
| TD-005 | 🟡 | Inline styles | Medium | Open — Phase B |
| TD-006 | 🟡 | Hardcoded dropdowns | Medium | Accepted — PO confirmed stable |
| ~~TD-007~~ | ~~🟡~~ | ~~Manual patch process~~ | Medium | ✅ **Resolved 2026-06-04** — GAS.GS fully superseded |
| TD-008 | 🟡 | No error boundary | Small | Open |
| TD-009 | 🟢 | Duplicate parsing logic | Small | Open — Phase B (parsers.js unifies) |
| TD-010 | 🟢 | CDN SRI missing | Small | Open |
| TD-011 | ~~🟢~~ | Wrong AI_CONTEXT docs | Small | ✅ **Resolved 2026-06-03** |
| TD-012 | 🟢 | No tests | Large | Open |
| TD-013 | 🟢 | Legacy full-write path | Small | Open |
| TD-014 | ⚪ | Emoji in selects | Tiny | Open |
| TD-015 | ⚪ | Hardcoded default PIC | Tiny | Open |
| ~~TD-016~~ | ~~⚪~~ | ~~Stale comment line 2702~~ | Tiny | ✅ **Resolved 2026-06-04** — never existed in extracted parsers.js |
| ~~TD-017~~ | ~~⚪~~ | ~~Gantt subtitle hardcoded "2025–2026"~~ | Tiny | ✅ **Resolved 2026-06-04** — dynamic year `83ea790` |
| TD-018 | ⚪ | `fmtExportDate` duplicated in `app.js:exportExcel` vs `helpers.js:fmtDateExport` | Tiny | Open — defer to Phase F cleanup |
| TD-019 | ⚪ | Inline `onchange/oninput` in `index.html` + `navigation.js` addEventListener both fire on same filter elements — share `debounceTimer`, no bug but redundant | Tiny | Open — cleanup when convenient |
| TD-020 | ⚪ | KPI data hardcoded in `kpi-data.js` — monthly update requires file edit + deploy | Tiny | Open — acceptable short-term |
| TD-021 | ⚪ | `_sLabel()` / `_kpProgColor()` defined in view files, used globally — load-order dependency | Tiny | Open — move to `helpers.js` |
| TD-022 | ⚪ | `quangPTKD[1/2/10/12]` hardcoded index in `kpi-overview.js` | Tiny | Open — use `.find()` |
| TD-023 | ⚪ | `_oaActiveTab` not reset on re-render — visual inconsistency only | Tiny | Open — add reset line |
