# SESSION HANDOVER
**Date**: 2026-06-16 (Session 23b — Task local-only write refactor)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S21**: `47b9316` — Team/PIC User_Master integration
**Pushed S22**: `2a65710` — User Management search/filter/sort/pagination (TD-030)
**Pushed S23 (→ main via PR #27)**: `b3262eb` → `dfac565` → `6ad6c32` (filter cascade + RBAC + modal fix)
**Pushed S23b**: `11c5770` (ai_context handover) → `65388ae` (task local-only write refactor)
**origin/main HEAD**: `65388ae` ✅

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19, XÁC NHẬN LẠI S23)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**AI/Claude push thẳng lên `main`. `master` đã bị xóa sau S23 (PO đã merge PR #27 xong xóa branch).**

---

## Tasks Completed (S20 — commit `6bf7a75`)

| # | Task | File(s) | Status |
|---|---|---|---|
| CP-UI-1 | index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle, preset bar 4 tabs, filter bar Task Manager pattern, filter chips, #cpTableWrap (default), #cpBoardWrap (hidden) | `index.html` | ✅ |
| CP-UI-2 | case-pipeline.css: +.cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, sort-icon | `assets/css/case-pipeline.css` | ✅ |
| CP-UI-3 | case-pipeline.js: Table-primary (20/page, 10 sortable cols), 4 preset tabs, _cpInitPresetTabs() | `assets/js/views/case-pipeline.js` | ✅ |
| CP-UI-4 | api.js: syncCaseAction + syncDot 'syncing' at start | `assets/js/api.js` | ✅ |
| INI-SYNC | initiatives.js: syncInitiativeAction() gold standard pattern, syncInitiativeAdd/Edit/Delete updated | `assets/js/initiatives.js` | ✅ |
| TEST-S20 | verify_case_pipeline.mjs: 22/22 PASS (+TEST05b, +TEST08b, table row selectors) | `verify_case_pipeline.mjs` | ✅ |

## Tasks Completed (S21 — commit `47b9316`)

| # | Task | File(s) | Status |
|---|---|---|---|
| UM-1 | constants.js: +TEAM_LIST (8 teams, fallback khi GAS offline) | `assets/js/constants.js` | ✅ |
| UM-2 | api.js: +`_appUsers[]`, `loadAppUsers()`, `getAppTeams()`, `getUsersByTeam()`, `_populateTeamSelect()`, `_populateUserSelect()` | `assets/js/api.js` | ✅ |
| UM-3 | app.js: `loadAppUsers()` non-blocking sau `autoConnectDB()` | `assets/js/app.js` | ✅ |
| UM-4 | index.html: Task modal `fTeam`→select+onchange, `fPicAcc`→select; Case modal `cpfTeam`→select+onchange, `cpfPic`→select | `index.html` | ✅ |
| UM-5 | crud.js: `openTaskModal()` dùng `_populateTeamSelect`/`_populateUserSelect`; +`onTaskTeamChange()` (re-filter PIC + autoGenId) | `assets/js/crud.js` | ✅ |
| UM-6 | case-pipeline.js: `openCaseModal()` dùng helpers; +`onCaseTeamChange()` | `assets/js/views/case-pipeline.js` | ✅ |
| UM-7 | initiative-tracker.js: `initFAcc` input→select; `_initOpenModal()` populate via `_populateUserSelect` (all users) | `assets/js/views/initiative-tracker.js` | ✅ |
| TEST-S21 | verify_case_pipeline.mjs: Fix TEST12 `.fill()` → `.selectOption()` cho cpfTeam | `verify_case_pipeline.mjs` | ✅ **22/22 PASS** |
| REG | verify_bld_queue.mjs / verify_ms_tasks.mjs: no regression | — | ✅ **46/46 + 14/14** |

---

## Architecture: Team/PIC User_Master (S21)

```
Luồng:
  startApp() → loadAppUsers() [non-blocking] → GAS 'user-list' → _appUsers[]

_appUsers = [{Username, Display_Name, Role, Team, Email, Active, ...}, ...]
  - In-memory only (KHÔNG persist localStorage — dữ liệu user nhạy cảm)
  - Filter: Active !== 'false'

Helpers (api.js):
  getAppTeams()            → unique teams từ _appUsers, sorted; fallback TEAM_LIST khi empty
  getUsersByTeam(team)     → filter _appUsers by team; '' = tất cả users
  _populateTeamSelect(id, currentVal)
    - required=true  → không có empty option, default to teams[0]
    - required=false → có "– Chọn team –" option
  _populateUserSelect(id, team, currentVal)
    - team=''      → show "– Chọn team trước –" (hint)
    - users empty  → fallback: hiện currentVal nếu có (offline graceful)
    - users exist  → options = Display_Name (Username); currentVal pre-selected
    - currentVal không match option → append extra option (bảo toàn dữ liệu)

Áp dụng:
  Task modal:   fTeam (required) → fPicAcc (required) → fPicRes (required)
                onTaskTeamChange() → re-filter cả hai PIC + autoGenId()
  Case modal:   cpfTeam (optional) → cpfPic (optional)
                onCaseTeamChange() → re-filter cpfPic
  Initiative:   initFAcc → all users (no team filter — initiative không có field team)
  
  populatePicDropdown() — GIỮ NGUYÊN như legacy cho filter bar filterPic
```

---

## Architecture: Case Pipeline UI (S20)

```
Dual-mode:  Table (default, #cpTableWrap) ↔ Kanban (#cpBoardWrap)
Persist:    localStorage 'cp_view'
Presets:    'active' / 'bld' / 'overdue' / 'all' (state: _cpPreset)
Filter:     _cpGetFiltered() = preset + search (debounce) + 4 dropdowns
Table:      10 cols, sortable, 20/page, pagination, empty state
syncInitiativeAction(): showLoading + syncDot syncing/connected + GAS + hideLoading
```

---

## Decisions Made (S20–S21)

1. **Table-primary** (S20): Default view cho Case Pipeline giải quyết 200 cases × 14 cols scalability problem.
2. **_cpInitPresetTabs()** (S20): Gọi trong renderCasePipeline() để sync active class — không phụ thuộc HTML static.
3. **syncInitiativeAction gold standard** (S20): Đồng nhất pattern với syncCaseAction / syncAction.
4. **_appUsers in-memory only** (S21): User data không persist localStorage vì sensitive. Mỗi session load lại từ GAS.
5. **Offline fallback** (S21): getAppTeams() → TEAM_LIST; _populateUserSelect() → hiện currentVal. App vẫn hoạt động khi GAS down.
6. **Extra option for mismatched PIC** (S21): Nếu currentVal không có trong danh sách users của team hiện tại (ví dụ PIC được assign từ team khác), append extra option để tránh mất dữ liệu khi save.
7. **Initiative Accountable no team filter** (S21): Initiative không có field Team trong DB — Accountable hiện tất cả active users.
8. **populatePicDropdown() kept** (S21): Giữ legacy function (không gọi nữa từ modal) để không break filter bar. Marked as legacy trong comment.

---

## Tasks Completed (S22b — undocumented commits between S22 and S23)

These commits appeared on `origin/main` but were NOT in the S22 handover — likely from a session between S22 and S23:

| Commit | Task | Files |
|---|---|---|
| `6f1c23b` | docs(ai_context): update S22 handover | `ai_context/SESSION_HANDOVER.md` etc. |
| `b134d54` | fix(user-management): constrain table-wrap height so only rows scroll | `assets/js/views/user-management.js` |
| `5323b75` | feat: pre-fill Team/PIC from logged-in user on Add modal (Task/Case/Initiative) | `assets/js/crud.js`, `case-pipeline.js`, `initiative-tracker.js` |
| `691ba9b` | rebrand: rename org from 'Số Hóa Tín Dụng / Khối KHDN' to 'Trung tâm SP&GPTD' | `index.html` |
| `ef40075` | fix(initiatives): repair milestone-to-parent linking when sheet has no header row | `assets/js/views/initiative-tracker.js` |

---

## Tasks Completed (S23 — commits `b3262eb`, `dfac565`, `6ad6c32` on master)

| # | Task | Commit | Files | Status |
|---|---|---|---|---|
| S23-T3 | Task filter: PIC cascade từ Team; Case Pipeline: PIC filter cascade + DVKD column + DVKD filter | `b3262eb` | `tasks.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T4 | Import RBAC: restrict Excel import tới Admin + Teamlead (lead-only CSS + canImport() JS guard) | `dfac565` | `auth.css`, `auth.js`, `app.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T5 | Modal grid layout bug: right column bị squeeze — fix `1fr 1fr` → `minmax(0,1fr) minmax(0,1fr)` | `6ad6c32` | `forms.css`, `case-pipeline.css`, `initiative.css`, `verify_modal_layout.mjs` | ✅ on master (pending merge to main) |

---

## Architecture: S23 Changes

### Filter Cascade (S23-T3)
```
tasks.js:
  onFilterTeamChange() → _populateFilterPic(team)
    - uses getUsersByTeam() từ _appUsers[] nếu online
    - fallback: unique picRes từ db.tasks khi offline

case-pipeline.js:
  cpFilterTeamChange() → _cpSyncFilterPic(team)
    - cùng pattern: getUsersByTeam() → fallback từ case data
  DVKD column: _cpRenderTable() thêm cột dvkd sau PIC
  State vars: _cpFilterPic, _cpFilterDvkd

auth.js:
  canImport() → u.role === 'Admin' || u.role === 'Teamlead'

auth.css:
  body[data-role="User"] .lead-only { display: none !important; }
  (cạnh .admin-only đã có — hai lớp RBAC)
```

### Modal Grid Fix (S23-T5)
```
Root cause: `grid-template-columns: 1fr 1fr` = `minmax(auto, 1fr) minmax(auto, 1fr)`
  → auto minimum cho phép cột trái rộng hơn khi có button với white-space:nowrap
  → cột phải bị squeeze

Fix: `minmax(0, 1fr) minmax(0, 1fr)` + .form-group { min-width:0 } + .form-control { width:100%; min-width:0 }

Grids fixed:
  forms.css         → .form-grid (Task modal)
  case-pipeline.css → .cp-modal-grid (Case modal)
  initiative.css    → .init-modal-grid (Initiative modal)

Test: verify_modal_layout.mjs — 9/9 PASS (diff=0.0px trên cả 3 modal)
```

---

## Tasks Completed (S23b — commit `65388ae`)

| # | Task | Files | Status |
|---|---|---|---|
| S23b-T1 | Refactor: Task CRUD/bulk ops write local only; only Excel import writes GAS | `api.js`, `crud.js`, `bulk.js`, `bld-queue.js` | ✅ on main |

### Architecture: Task Write Isolation (S23b)

```
TRƯỚC:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → syncAction() → READ từ GAS → MERGE → WRITE lên GAS

SAU:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → localAction() → persist(localStorage) → renderAll()   ← KHÔNG ghi GAS

CHỈ GHI GAS (giữ nguyên):
  handleImport() — Excel bulk import      → syncAction() ✅
  syncCaseAction() — Case CRUD/BLD        → GAS write ✅
  syncInitiativeAction() — Initiative CRUD → GAS write ✅
  writeToHandle() (initiative-tracker.js)  → GAS write ✅

localAction() (api.js):
  function localAction(mutateFn) {
    if (typeof mutateFn === 'function') mutateFn();
    persist();    // localStorage['shtd_v2']
    renderAll();  // re-render toàn bộ UI
    return true;
  }
```

### Decision: S23b

- **Task write local-only**: PO yêu cầu tách biệt hoàn toàn — task data chỉ lên GAS qua Excel import, không tự động push từ UI. Tránh cache cũ/stale ghi đè Sheet khi user edit/delete ngẫu nhiên.
- **BLD task approval local-only**: Ý kiến BLĐ cho Task cũng local-only. Ý kiến BLĐ cho Case vẫn qua syncCaseAction (GAS write).
- **Bug fix**: `bulkSetState()` và `bulkDelete()` lưu count TRƯỚC khi `selectedIds.clear()` — toast hiện đúng số lượng.

---

## Tasks Completed (S22 — commit `2a65710`)

| # | Task | File(s) | Status |
|---|---|---|---|
| TD-030 | user-management.js: search (username/name/email, debounce 150ms), filter Team/Role/Status, filter chips với clear, sort 5 cols, pagination 15/page với count info, layout toolbar+filter-bar+card khớp pattern case-pipeline | `assets/js/views/user-management.js` | ✅ |

---

## Blockers

| Item | Status |
|---|---|
| Netlify hết credit | ❌ Dùng local Playwright / GitHub Pages |
| AI Chat GAS AiService.gs + GEMINI_API_KEY | ⚠️ Unconfirmed từ S12 |
| ~~Modal fix chưa merge sang main~~ | ✅ PR #27 merged — `41f4018` live |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| **Task edits không lên GAS (S23b)** | 🔴 HIGH | saveTask/deleteTask/bulk/BLD task giờ chỉ lưu localStorage. Nếu user clear cache / đăng xuất / đổi thiết bị mà không export Excel trước → mất toàn bộ task edits. Cần thông báo user workflow mới: edit → export → import khi cần đẩy lên Sheet. |
| **BLD task approval không lên GAS (S23b)** | 🔴 HIGH | Ý kiến BLĐ cho Task (yKienBLD) chỉ lưu local. Sheet không cập nhật cho đến khi Excel import. Case BLD approval vẫn lên GAS bình thường. |
| Team/PIC modal fields đổi từ input→select | 🟡 MEDIUM | fPicAcc từ text input → select. Nếu _appUsers empty (GAS down) và không có currentVal → fPicAcc select rỗng → form submit fail. Cần smoke test khi GAS online. |
| Initiative sync flow changed (S20) | 🟡 MEDIUM | syncInitiativeAdd/Edit/Delete pattern đổi. Cần smoke test initiative CRUD trên live. |
| AI Chat chưa smoke-test live | 🟡 MEDIUM | AiService.gs + GEMINI_API_KEY chưa xác nhận từ S12. |
| DVKD column colspan (S23-T3) | ⚪ LOW | Empty state colspan tăng 10→11. Nếu có test check colspan cứng, cần cập nhật. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_case_pipeline.mjs    # 22/22 PASS (S21)
node verify_bld_queue.mjs        # 46/46 PASS
node verify_ms_tasks.mjs         # 14/14 PASS
node verify_filter_cascade.mjs   # 23/23 PASS (NEW S23)
node verify_import_rbac.mjs      # 15/15 PASS (NEW S23)
node verify_modal_layout.mjs     # 9/9 PASS (NEW S23)
```

---

## Next Steps

1. **UX: thông báo user về workflow mới** — Task edit chỉ lưu local; cần export Excel và import lại để đồng bộ GAS. Cân nhắc thêm banner/toast nhắc nhở.
2. **Smoke test live — Task save**: Edit task → lưu → reload → kiểm tra data vẫn trong cache; Export Excel → kiểm tra dữ liệu đúng.
3. **Smoke test live — Task filter**: Chọn Team → filterPic update đúng users.
4. **Smoke test live — Case Pipeline filter**: Team → cpFilterPic cascade; DVKD filter; DVKD column hiển thị.
5. **Smoke test live — Import RBAC + Modal layout**: Kiểm tra các S23 features trên live.
6. Verify AI Chat trên live (tồn từ S12).
7. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
4. **Smoke test live — Import RBAC**: Login với role User → Import button ẩn; role Admin/Teamlead → visible.
5. **Smoke test live — Modal layout**: Mở Task/Case/Initiative edit modal → 2 cột đều nhau.
6. **Smoke test live — Task/Case modal Team+PIC**: Dropdown có options, cascade đúng.
7. Verify AI Chat trên live (tồn từ S12).
8. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
