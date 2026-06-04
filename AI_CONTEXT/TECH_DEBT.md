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

## TD-002: No Real Google Apps Script Backend in Repo
**Rating**: 🔴 CRITICAL

**Issue**: The actual GAS backend (deployed at `script.google.com/macros/s/...`) is not version-controlled. Its source code is not in this repo.

**Impact**:
- Cannot audit the backend logic
- Cannot test the read/write operations locally
- Backend changes are invisible to git history
- Deploy process is manual and undocumented

**Priority**: CRITICAL — add GAS source to repo immediately

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

## TD-007: Manual Patch Process (GAS.GS)
**Rating**: 🟡 HIGH

**Issue**: The versioning system relies on manually merging patches from `GAS.GS` into `Main.html` by searching for function names and replacing code blocks.

**Impact**:
- Highly error-prone process
- No automated merge, no CI
- Partial merges can leave the app in a broken state
- GAS.GS v6.2 merge guide still pending for some functions

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

**Partial resolution 2026-06-04**: Ad-hoc Playwright script (`pw_verify/full_test.js`) covers 25 checks across all views. Not committed to repo, not part of CI. Still manual trigger.

**Remaining gap**: No CI integration, no unit tests for pure functions (parsers, helpers).

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

## Debt Summary
**Last updated**: 2026-06-04

| ID | Rating | Issue | Effort | Status |
|---|---|---|---|---|
| ~~TD-001~~ | ~~🔴~~ | ~~Monolith~~ | Large | ✅ **Resolved 2026-06-04** — Phase B complete |
| TD-002 | 🔴 | GAS backend not in repo | Small | Open — A2 pending |
| TD-003 | ~~🔴~~ | Conflicting function versions | Small | ✅ **Resolved 2026-06-03** |
| TD-004 | 🟡 | Global state | Medium | Open — Phase D |
| TD-005 | 🟡 | Inline styles | Medium | Open — Phase B |
| TD-006 | 🟡 | Hardcoded dropdowns | Medium | Accepted — PO confirmed stable |
| TD-007 | 🟡 | Manual patch process | Medium | ✅ **Resolved** — GAS.GS superseded |
| TD-008 | 🟡 | No error boundary | Small | Open |
| TD-009 | 🟢 | Duplicate parsing logic | Small | Open — Phase B (parsers.js unifies) |
| TD-010 | 🟢 | CDN SRI missing | Small | Open |
| TD-011 | ~~🟢~~ | Wrong AI_CONTEXT docs | Small | ✅ **Resolved 2026-06-03** |
| TD-012 | 🟢 | No tests | Large | Open |
| TD-013 | 🟢 | Legacy full-write path | Small | Open |
| TD-014 | ⚪ | Emoji in selects | Tiny | Open |
| TD-015 | ⚪ | Hardcoded default PIC | Tiny | Open |
| ~~TD-016~~ | ~~⚪~~ | ~~Stale comment line 2702~~ | Tiny | ✅ **Resolved 2026-06-04** — never existed in extracted parsers.js |
| TD-017 | ⚪ | Gantt subtitle hardcoded "2025–2026" at `index.html:329` | Tiny | Open — A4 fix pending |
| TD-018 | ⚪ | `fmtExportDate` duplicated in `app.js` vs `helpers.js:fmtDateExport` | Tiny | Open — consolidate in Phase C |
