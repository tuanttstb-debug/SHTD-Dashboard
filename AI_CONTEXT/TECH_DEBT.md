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

**Partial resolution 2026-06-05 (Session 6)**: `verify_initiative_v2.mjs` — **committed** — 37/37 PASS.

**Partial resolution 2026-06-12 (Session 17)**: `verify_bld_queue.mjs` — **34/34 PASS** (up from 18/18 S16). Added TEST11–15 covering submit flow (approve/reject/info), local fallback, badge update. Fixed Playwright infra: Windows import path + `context.route` GAS abort + `waitForFunction` loading overlay.

**Partial resolution 2026-06-12 (Session 18)**: `verify_bld_queue.mjs` — **46/46 PASS**. Added TEST16–20: confirm-btn disable reset, yKienBLD persistence (noiDungBLD untouched), opinion block on card, Task form readonly field, legacy+new history markers. Added `debug_login.mjs` (login diagnostics, not a test suite).

**Partial resolution 2026-06-15 (Session 19)**: `verify_case_pipeline.mjs` — **20/20 PASS** (new). Covers nav, 14-col Kanban, summary cards, filter, CRUD modal, ID gen, validation, BLD Queue case integration.

**Partial resolution 2026-06-15 (Session 20)**: `verify_case_pipeline.mjs` — **22/22 PASS**. +TEST05b (kanban toggle 14 cols), +TEST08b (preset bar 4 tabs). Rewritten TEST05/07/12/13/14/16/17 từ .cp-card → #cpTbody tr để phù hợp table-primary design.

**Committed suites**: `verify_initiative_v2.mjs` (37 — ⚠️ failing, see TD-033), `verify_ms_tasks.mjs` (14), `um_test.mjs` (14), `verify_bld_queue.mjs` (46), `verify_case_pipeline.mjs` (22), `verify_filter_cascade.mjs` (23), `verify_import_rbac.mjs` (15), `verify_modal_layout.mjs` (9) — total **180 checks**.

**Remaining gap**: No CI integration. No unit tests for pure functions. Import paths in test files are machine-specific (Windows vs Linux `/opt/node22/...`).

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

## ~~TD-020: KPI Data Hardcoded — No Refresh Mechanism~~ ✅ PARTIALLY RESOLVED 2026-06-04

**Resolution (Session 4)**: `kpi-parser.js` + `KpiSheetService.gs` added — users can now:
- Load `File raw.xlsx` directly via "Load File Raw" button (KPI Overview toolbar)
- Sync parsed data to/from GG Sheet `KPI_Summary` tab via "Sync GG Sheet" / "Từ GG Sheet" buttons
- `getKpiData()` returns live parsed data when loaded; falls back to static `KPI_DATA` otherwise

**Remaining gap**: Monthly product-level arrays (`products[x].biz[]` etc.) in `kpi-data.js` are still hardcoded. PTKD-level data (quangPTKD/dungPTKD/agg) is now dynamic via parser. Acceptable long-term if File raw.xlsx is kept up to date.

---

## TD-021: Shared Helpers Defined in View Files
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (Phase F)

**Issue**: `_sLabel()` and `_kpProgColor()` are utility functions defined in `kpi-overview.js` and `kpi-progress.js` respectively, but used by all 6 KPI view files. They work because of global scope and load order, but are not in a shared helper file.

**Impact**: If `kpi-overview.js` is removed or load order changes, dependent views break silently.

**Fix**: Move both to `helpers.js` or a new `assets/js/kpi-helpers.js`.

---

## ~~TD-022: quangPTKD Accessed by Hardcoded Index~~ ✅ RESOLVED 2026-06-04

**Resolution (Session 4, commit `55ebc33`)**: `kpi-overview.js` now uses dynamic `.find()` / `needPerMonth` / `bizGapFor22` calculations instead of hardcoded array positions. Insight bullets computed dynamically from sorted data.

---

## TD-023: KPI Tab State Not Restored on Re-render
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (KPI merge)

**Issue**: `_oaActiveTab` in `owner-analysis.js` persists across `navigateTo` calls. On re-render, HTML always shows QuangNN3 tab as active, but `_oaActiveTab` may still be 'dung' or 'rank'. No crash, minor visual inconsistency before first user click.

**Fix**: Reset `_oaActiveTab = 'quang'` at start of `renderOwnerAnalysis()`.

---

## TD-024: Initiative ID Rename Does Not Cascade to Children
**Rating**: ⚪ LOW
**Added**: 2026-06-05 (Session 5 — Initiative Tracker)

**Issue**: In `_initSave()`, when a user edits an initiative and changes its ID (origId ≠ newId), the code removes the old entry and adds the new one — but child milestones with `parentId === origId` are NOT updated to `parentId === newId`. Those milestones become orphans (parentId points to non-existent initiative) and disappear from the Milestone accordion.

**Impact**: Only affects the edge case of renaming an Initiative ID after milestones have been added. Milestones are not deleted — they remain in `db.initiatives` and `Initiative_Master` with a stale `parentId`.

**Fix**: In `_initSave()` before removing the old entry, update all `db.initiatives` entries where `parentId === origId` to `parentId = newId`.

---

## TD-025: `writeInitiatives()` Is Full-Replace (No Patch)
**Rating**: ⚪ LOW
**Added**: 2026-06-05 (Session 5 — Initiative Tracker)

**Issue**: `writeInitiatives()` in `initiatives.js` writes the entire `db.initiatives` array to `Initiative_Master` on every CRUD operation (same pattern as `writeToHandle()` for tasks — TD-013). With multiple users open simultaneously, last-write-wins applies to initiative data.

**Impact**: Low risk in current usage — initiatives are managed by one PO, not multi-user. Acceptable short-term.

**Fix**: Implement a Read-Then-Patch pattern for initiative writes (mirror `syncAction()` for tasks). Deferred until multi-user initiative editing becomes a requirement.

---

## ~~TD-026: Milestone Modal Status Dropdown Uses English; GAS Data Uses Vietnamese~~ ✅ RESOLVED 2026-06-06

**Resolution**: PO confirmed fixed (Session 7). Milestone modal now uses Vietnamese options.

---

## ~~OBS-01: db.initiatives Silently Overwritten in syncAction()~~ ✅ RESOLVED 2026-06-06

**Resolution (Session 8, commit `5bf9fed`)**: Removed 3-line iMap rebuild from `syncAction()`. `db.initiatives` is now owned exclusively by `readInitiatives()` / `_parseInitiativeArray()`. Initiative Tracker data no longer wiped on every task sync.

---

## ~~AUTH-01: AUTH_SECRET Uses Hardcoded Fallback~~ ✅ RESOLVED 2026-06-07

**Resolution (Session 9, commit `142844a`)**: `_authSecret()` now throws hard error if `AUTH_SECRET` Script Property is not set. Fallback `'shtd_2026_internal'` eliminated from codebase.

---

## ~~AUTH-02: Role Stored But Not Enforced in UI~~ ✅ RESOLVED 2026-06-07

**Resolution (Session 9, commit `b561624`)**: `applyUserToUI()` sets `document.body.dataset.role = user.role`. CSS rule `body[data-role="User"] .admin-only { display: none !important; }` hides bulk-delete and modal-delete buttons for User role. `kpi-write` GAS route restricted to Admin-only.

---

## ~~AUTH-03: No Change-Password Feature~~ ✅ RESOLVED 2026-06-07

**Resolution (Session 9, commit `4bdbe72`)**: `changePassword()` in `AuthService.gs` validates old password (SHA-256), enforces 6-char minimum, writes new hash to `User_Master`. GAS `change-password` route added. User-pill dropdown shows "Đổi mật khẩu" → opens inline modal.

---

## AUTH-04: No Session Invalidation on Password Change
**Rating**: ⚪ LOW
**Added**: 2026-06-08 (Session 9)

**Issue**: HMAC tokens are stateless (24h expiry). After a user changes their password, their existing token remains valid until it expires. If a token was compromised before the password change, the attacker retains access for up to 24h.

**Impact**: Acceptable for internal tool; risk window is bounded to 24h.

**Fix** (if needed): Maintain a token revocation list in Script Properties or a Sheet tab. On validateToken(), check revocation list. Expensive (one extra read per request). Defer unless security audit requires it.

---

## SEC-01: onclick Attributes With User IDs Not JSON-Escaped
**Rating**: ⚪ LOW
**Added**: 2026-06-08 (Session 9)

**Issue**: Patterns like `onclick="editTask('${t.id}')"` use `esc()` for display fields but task IDs in onclick attributes are not wrapped in `JSON.stringify()`. If a task ID contained a single quote (e.g., from a malformed import), the onclick handler would break or potentially allow injection.

**Impact**: Task IDs are generated by `genId()` which produces only alphanumeric + hyphen characters. Import path could theoretically produce malformed IDs. Risk is LOW given format validation.

**Fix**: Replace `onclick="editTask('${t.id}')"` patterns with `onclick="editTask(${esc(JSON.stringify(t.id))})"` across tasks.js, gantt.js, dashboard.js, app.js, initiative-tracker.js.

---

## TD-027: Initiative Writes Not Covered by Optimistic Locking
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-08 (Session 9)

**Issue**: Task writes now have VERSION_CONFLICT protection via `TASK_WRITE_TS` Script Property (Session 9, 1-D). Initiative writes (`initiativeWrite()` in `InitiativeService.gs`) do not have equivalent locking. Concurrent initiative edits are still last-write-wins.

**Impact**: Low risk — initiatives are managed by PO only, not multi-user. Acceptable until multi-user initiative editing is required.

**Fix**: Mirror the task locking pattern: add `INI_WRITE_TS` Script Property; `initiativeRead()` returns `{values, serverTs}`; `initiativeWrite()` checks `clientTs`.

---

## ~~TD-028: TEMP debug-auth Endpoint in Code.gs~~ ✅ RESOLVED 2026-06-08

**Resolution (Session 11, commit `1c828fc`)**: Entire `debug-auth` block removed from `Code.gs`. GAS redeployed. No unauthenticated endpoint remains.

---

## ~~TD-029: TEMP Debug Log in api.js readFromHandle~~ ✅ RESOLVED 2026-06-08

**Resolution (Session 11, commit `1c828fc`)**: `[DBG]` log and `window._lastGasToken` removed from `auth.js`; `[DBG]` log removed from `api.js`. No token-related console output remains.

---

## AUTH-05: KNOWN_ROLES Not Validated Against User_Master Sheet
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-08 (Session 11)

**Issue**: `KNOWN_ROLES` in `Code.gs` is a hardcoded array. If a user's role in User_Master sheet is set to a value not in this array (e.g. `Teamlead`, `Manager`, `Viewer`), every post-login GAS call silently returns `AUTH_REQUIRED` with no diagnostic message. Root cause of Session 10–11 auth blocker.

**Impact**: Any future role rename in the sheet breaks all affected users immediately with no clear error.

**Fix**: Either (a) validate roles at `setupInitialUsers` / changePassword time, or (b) replace the whitelist with an allowlist check against a Script Property `ALLOWED_ROLES` so it can be updated without code deploy.

---

## ~~TD-030: User Management Has No Pagination / Search~~ ✅ RESOLVED 2026-06-15

**Resolution (Session 22, commit `2a65710`)**: `user-management.js` now has: search (username/name/email, debounce 150ms), filter Team/Role/Status, filter chips với clear, sort 5 cols, pagination 15/page với count info. TD-030 fully addressed.

---

## TD-031: Loose-link Detection Assumes `PARENT-Mn` Milestone ID Pattern
**Rating**: 🟢 LOW
**Added**: 2026-06-10 (Session 14)

**Issue**: `_initGetMsTasks` and alignment badge logic use `_msShortLabel(ms.id)` (regex `/-M\d+$/`) to detect "loose link" tasks that used generic M1/M2 labels. If a milestone ID doesn't follow the `PARENT-Mn` pattern (e.g. free-text IDs), the short-label fallback silently never matches — tasks remain "unlinked" even when user intended a link.

**Impact**: Low. All milestones created via the CRUD modal follow the pattern. Only affects ad-hoc or imported milestone IDs.

**Fix** (if needed): Extend `_initGetMsTasks` to also search by milestone `name` substring match as a third fallback tier.

---

## TD-033: verify_initiative_v2.mjs Không Inject Auth — Fail Local
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-12 (Session 18)

**Issue**: `verify_initiative_v2.mjs` chặn GAS routes nhưng KHÔNG inject `shtd_auth_v1` vào localStorage → `loginOverlay` chặn mọi click → test fail tại `navigate()`. Xác nhận fail y hệt trên code gốc (git stash) — pre-existing từ khi auth được thêm (S9), không phải regression.

**Fix**: Copy pattern `loadWithData()` từ `verify_bld_queue.mjs` (inject auth + `context.route` abort + `waitForFunction` loading overlay).

---

## ~~TD-034: Task Data Loss Risk — Local-Only Write Without User Warning~~ ✅ RESOLVED 2026-06-18

**Resolution (Session 29, commit `2986e51`)**: S23b local-only decision đã bị revert. Task CRUD (`saveTask`, `deleteTask`, `bulkSetRag/State/Delete`) và task BLD approval đều gọi `await syncAction()` — read-merge-write đến GAS. Toast chỉ hiện sau khi GAS xác nhận. `localAction()` không còn được gọi từ bất kỳ đâu (dead code).

---

## ~~SCHEMA-01: Mixed-Version Clients — Cột X (Ý kiến BLĐ) Lệch/Stale~~ ✅ RESOLVED 2026-06-15

**Resolution (Session 19, commit `a00a611`)**: S18+S19 merged trực tiếp vào `main`. `master` branch bỏ từ S19. Mọi client giờ ghi Task_Master 24 cột đồng nhất. Không cần migration.

---

## TD-035: `picNorm()` Không Produce Canonical Username — Partial Workaround
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-16 (Session 24)

**Issue**: `picNorm(n)` chỉ capitalize chữ đầu và lowercase phần còn lại: `'DungLQ1' → 'Dunglq1'`. Đây không phải canonical username — mất thông tin case ở giữa (`LQ1`). Kết quả là `t.picRes` sau parse không match `u.Username` từ `_appUsers`.

**Mitigation đã có (S24)**:
- PA1: filter comparison `.toLowerCase()` — tasks.js:58
- PA2: `_resolvePickerCase()` resolve picRes/picAcc về canonical sau parse và sau loadAppUsers

**Remaining gap**: 
- `picNorm()` vẫn được dùng khi **save** task từ form (`crud.js:193`): `picRes: picNorm(document.getElementById('fPicRes').value)` — nếu user select dropdown value là `'DungLQ1'`, sau `picNorm` thành `'Dunglq1'`, nhưng `_resolvePickerCase()` sau `localAction()` sẽ fix lại. OK vì `_resolvePickerCase()` gọi trong `renderAll()` → không, thực ra không gọi trong `renderAll()`. Chỉ gọi sau parse và sau loadAppUsers. Nên task mới tạo/edit có picRes='Dunglq1' sẽ ở lại trạng thái đó cho đến lần reload tiếp theo.
- `report.js` và `taskToRow()` dùng `t.picRes` trực tiếp — nếu picRes='Dunglq1' thì Sheet cũng nhận 'Dunglq1' khi import.

**Fix proper**: Thay `picNorm()` bằng lookup từ `_appUsers` khi save:
```js
// crud.js:193
picRes: _resolveOneUser(document.getElementById('fPicRes').value),

function _resolveOneUser(raw) {
  if (!raw || !_appUsers?.length) return raw;
  const canon = _appUsers.find(u => u.Username.toLowerCase() === raw.toLowerCase());
  return canon ? canon.Username : raw;
}
```

**Priority**: Thấp vì PA1+PA2 cover read-path; chỉ ảnh hưởng write-path khi import lại Sheet.

---

## TD-036: `localAction()` Dead Code in api.js
**Rating**: ⚪ LOW
**Added**: 2026-06-18 (Session 29)

**Issue**: `localAction()` trong `api.js` không còn caller nào sau S29 revert. Khai báo còn đó nhưng không được gọi.

**Fix**: Xóa hàm sau khi xác nhận `grep -r "localAction" assets/js/` cho ra 0 caller.

---

## Debt Summary
**Last updated**: 2026-06-18 (Session 29 — TD-034 resolved; TD-036 added)

| ID | Rating | Issue | Effort | Status |
|---|---|---|---|---|
| ~~TD-001~~ | ~~🔴~~ | ~~Monolith~~ | Large | ✅ **Resolved 2026-06-04** — Phase B complete |
| ~~TD-002~~ | ~~🔴~~ | ~~GAS backend not in repo~~ | Small | ✅ **Resolved 2026-06-04** — `backend/` added + URL updated |
| TD-003 | ~~🔴~~ | Conflicting function versions | Small | ✅ **Resolved 2026-06-03** |
| TD-004 | 🟡 | Global state | Medium | Open — Phase D |
| TD-005 | 🟡 | Inline styles | Medium | Open — Phase B |
| TD-006 | 🟡→🟢 | Hardcoded dropdowns | Medium | **Partial S21** — Team/PIC now driven by User_Master. Other option sets (Stage, Loại hình, Complexity, RAG) still hardcoded in HTML |
| ~~TD-007~~ | ~~🟡~~ | ~~Manual patch process~~ | Medium | ✅ **Resolved 2026-06-04** — GAS.GS fully superseded |
| TD-008 | 🟡 | No error boundary | Small | Open |
| TD-009 | 🟢 | Duplicate parsing logic | Small | Open — Phase B (parsers.js unifies) |
| TD-010 | 🟢 | CDN SRI missing | Small | Open |
| TD-011 | ~~🟢~~ | Wrong AI_CONTEXT docs | Small | ✅ **Resolved 2026-06-03** |
| TD-012 | 🟢→⚪ | No tests | Large | Partial — 9 committed suites: 37+14+14+46+22+23+15+9+23=203 (initiative_v2 failing — TD-033); no CI |
| TD-013 | 🟢 | Legacy full-write path | Small | Open |
| TD-014 | ⚪ | Emoji in selects | Tiny | Open |
| TD-015 | ~~⚪~~ | ~~Hardcoded default PIC~~ | Tiny | ✅ **Resolved S21** — fPicAcc/fPicRes now populated from User_Master; no hardcoded 'Tuantt4' default |
| ~~TD-016~~ | ~~⚪~~ | ~~Stale comment line 2702~~ | Tiny | ✅ **Resolved 2026-06-04** — never existed in extracted parsers.js |
| ~~TD-017~~ | ~~⚪~~ | ~~Gantt subtitle hardcoded "2025–2026"~~ | Tiny | ✅ **Resolved 2026-06-04** — dynamic year |
| TD-018 | ⚪ | `fmtExportDate` duplicated in `app.js:exportExcel` vs `helpers.js:fmtDateExport` | Tiny | Open — defer to Phase F cleanup |
| TD-019 | ⚪ | Inline `onchange/oninput` double handlers | Tiny | Open — cleanup when convenient |
| ~~TD-020~~ | ~~⚪~~ | ~~KPI data hardcoded — no refresh~~ | Tiny | ✅ **Partially resolved 2026-06-04** — kpi-parser.js + GG Sheet sync for PTKD/agg; product monthly arrays still static |
| TD-021 | ⚪ | `_sLabel()` / `_kpProgColor()` defined in view files, used globally | Tiny | Open — move to `helpers.js` |
| ~~TD-022~~ | ~~⚪~~ | ~~`quangPTKD[1/2/10/12]` hardcoded index~~ | Tiny | ✅ **Resolved 2026-06-04** — `55ebc33` uses dynamic `.find()` |
| TD-023 | ⚪ | `_oaActiveTab` not reset on re-render — visual inconsistency only | Tiny | Open — add reset line |
| TD-024 | ⚪ | Initiative ID rename doesn't cascade `parentId` in child milestones | Tiny | Open — fix in `_initSave()` |
| TD-025 | ⚪ | `writeInitiatives()` full-replace, no patch — last-write-wins | Tiny | Open — acceptable until multi-user initiative editing needed |
| ~~TD-026~~ | ~~⚪~~ | ~~Milestone modal status dropdown English vs. GAS Vietnamese~~ | Tiny | ✅ **Resolved 2026-06-06** — PO confirmed fixed |
| ~~OBS-01~~ | ~~🔴~~ | ~~db.initiatives overwritten in syncAction()~~ | Tiny | ✅ **Resolved 2026-06-06** — commit `5bf9fed` |
| ~~AUTH-01~~ | ~~⚪~~ | ~~AUTH_SECRET hardcoded fallback~~ | Tiny | ✅ **Resolved 2026-06-07** — commit `142844a`, hard throw if missing |
| ~~AUTH-02~~ | ~~⚪~~ | ~~Role not enforced in UI~~ | Small | ✅ **Resolved 2026-06-07** — commit `b561624`, CSS .admin-only |
| ~~AUTH-03~~ | ~~⚪~~ | ~~No change-password UI~~ | Small | ✅ **Resolved 2026-06-07** — commit `4bdbe72`, GAS + modal |
| AUTH-04 | ⚪ | No session invalidation on password change | Small | Open — stateless tokens, 24h window |
| SEC-01 | ⚪ | onclick attributes with IDs not JSON-escaped | Tiny | Open — low risk, IDs are format-controlled |
| TD-027 | 🟢 | Initiative writes not covered by optimistic locking | Small | Open — acceptable until multi-user initiative editing needed |
| ~~TD-028~~ | ~~🔴~~ | ~~TEMP debug-auth endpoint~~ | Tiny | ✅ **Resolved 2026-06-08** — commit `1c828fc` |
| ~~TD-029~~ | ~~🟡~~ | ~~TEMP [DBG] token log in api.js~~ | Tiny | ✅ **Resolved 2026-06-08** — commit `1c828fc` |
| AUTH-05 | 🟢 | KNOWN_ROLES hardcoded — role mismatch silently returns AUTH_REQUIRED | Small | Open |
| ~~TD-030~~ | ~~⚪~~ | ~~User Management table has no search/pagination~~ | Tiny | ✅ **Resolved S22** — search/filter/sort/pagination added |
| TD-031 | 🟢 | Loose-link detection assumes `PARENT-Mn` milestone ID pattern | Tiny | Open — low risk |
| TD-032 | ⚪ | BAU task ID format changed `Số001` → `Số-001`; clone of old tasks gets gap in sequence | Tiny | Open — one-time migration or accept gap |
| TD-033 | 🟢 | `verify_initiative_v2.mjs` không inject auth → fail local (pre-existing) | Small | Open — copy pattern verify_bld_queue |
| ~~TD-034~~ | ~~🔴~~ | ~~Task data loss risk — CRUD/BLD local-only, no GAS write~~ | Small | ✅ **Resolved 2026-06-18** — S29 commit `2986e51`: syncAction() restored for all task ops |
| TD-036 | ⚪ | `localAction()` dead code in api.js — no callers after S29 | Tiny | Open — xóa sau xác nhận grep |
| TD-035 | 🟢 | `picNorm()` không produce canonical username — S26: removed filterPic rebuild từ updateFilterDropdowns() (conflict resolved); write-path crud.js still saves picNorm format | Small | Partial — fix proper: lookup từ _appUsers khi save trong crud.js |
| ~~SCHEMA-01~~ | ~~🟡~~ | ~~Mixed-version clients cột X lệch/stale~~ | — | ✅ **Resolved 2026-06-15** — S18+S19 merged to main, master abandoned |
