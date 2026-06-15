# SESSION HANDOVER
**Date**: 2026-06-15 (Session 21 — Team/PIC dropdowns driven by User_Master + Case Pipeline UI redesign + Initiative sync)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S20**: `6bf7a75` — Case Pipeline UI redesign (Table-primary) + Initiative sync standardization
**Pushed S21**: `47b9316` — Team/PIC User_Master integration
**origin/main HEAD**: `47b9316` ✅

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | Developer / AI |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**⚠️ Không dùng `master` nữa kể từ S19.**

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

## Blockers

| Item | Status |
|---|---|
| Netlify hết credit | ❌ Dùng local Playwright / GitHub Pages |
| AI Chat GAS AiService.gs + GEMINI_API_KEY | ⚠️ Unconfirmed từ S12 |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| Team/PIC modal fields đổi từ input→select | 🟡 MEDIUM | fPicAcc từ text input → select. Task submit đọc .value vẫn đúng. Nếu _appUsers empty (GAS down) và không có currentVal → fPicAcc select rỗng → form submit sẽ fail required validation. Cần smoke test khi GAS online. |
| Initiative sync flow changed (S20) | 🟡 MEDIUM | syncInitiativeAdd/Edit/Delete pattern đổi. Cần smoke test initiative CRUD trên live. |
| AI Chat chưa smoke-test live | 🟡 MEDIUM | AiService.gs + GEMINI_API_KEY chưa xác nhận từ S12. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_case_pipeline.mjs   # 22/22 PASS (S21)
node verify_bld_queue.mjs       # 46/46 PASS (no regression)
node verify_ms_tasks.mjs        # 14/14 PASS (no regression)
```

---

## Next Steps

1. **Smoke test live — Task modal**: Mở Add/Edit task → Team dropdown có options từ User_Master → chọn team → PIC Accountable/Responsible lọc đúng users.
2. **Smoke test live — Case Pipeline**: Team + PIC dropdown trên Case modal; table-primary view; preset tabs; filter.
3. **Smoke test live — Initiative**: Accountable dropdown có options từ User_Master.
4. **Smoke test — Initiative CRUD**: syncInitiativeAction() → syncDot animation + toast feedback đúng.
5. Verify AI Chat trên live (tồn từ S12).
6. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
