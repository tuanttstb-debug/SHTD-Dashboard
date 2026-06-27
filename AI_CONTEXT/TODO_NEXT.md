# TODO — NEXT SESSION
**Prepared**: 2026-06-27 (Session 36 — Case Pipeline Enhancements)
**Context**: S36 — 4 features: done/blocked no-overdue, default scope=all, tuần BC filter, summary popup with 4 types. 28/28 Playwright PASS. Cache-bust `?v=20260627b`. `APP_VERSION=6.6`. Users need hard-reload (Ctrl+Shift+R).

---

## ✅ COMPLETED S36

- [x] Done/blocked stages: `calcCaseRag()` returns `''` for done/blocked groups; `action-plan.js` overdue check updated
- [x] Default scope = 'all' for all users (removed role check from `_getCpScope()`)
- [x] Filter tuần báo cáo (`cpFilterTuanBC` select, chronological sort, chip, clear)
- [x] Summary popup: `#cpSummaryOverlay`, 4 types (total/value/overdue/bld), clickable rows open detail, ESC closes
- [x] Playwright 28/28 PASS — `verify_case_pipeline_s36.mjs`; EVD in `test-results/cp_s36/`
- [x] Cache-bust `?v=20260627b` (51 occurrences); `APP_VERSION=6.6-case-pipeline-enhancements-20260627`

---

## 🔲 TODO S37 — CANDIDATE TASKS

> Ưu tiên: P1 = blocking / user-reported; P2 = next feature; P3 = tech debt / cleanup

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S36 on production** | Confirm RAG dots gone for done/blocked; scope=all default; tuần BC filter; summary popup. Users must hard-reload first. |
| P2 | **Case Pipeline — table view sort by giaTriTy** | Currently Kanban only. Table view has no sort on value column. |
| P2 | **Case Pipeline — export to Excel** | No export button currently. Should follow pattern of task export. |
| P2 | **Summary popup — pagination** | If `dbCases` grows large (>50 cases), popup body will be very long. Add simple pagination or max-height scroll indicator. |
| P3 | **TD-012: add CI** | 11 test suites, 255 assertions. `npm test` script + GitHub Actions would prevent regressions. |
| P3 | **TD-004: global state** | `let _cpFilterTuanBC`, `let _cpScope`, etc. accumulate as module-level mutable state. Consider encapsulating per-view state in objects. |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S33

- [x] GAS `auditReadByEntity(entityId)` in `AuditService.gs` — reads Audit_Log, filters by Summary prefix match (avoids cross-ID false positives) (`ea55a2b`)
- [x] GAS `audit-read` route in `Code.gs` — no ADMIN_ONLY gate; all authenticated roles can access (`ea55a2b`)
- [x] GAS deployed by user 2026-06-24 — `audit-read` live, URL unchanged (`ea55a2b`)
- [x] `_gasAuditRead(entityId)` + `_buildHistoryTable(rows, synthetic, actionMap)` in `api.js` — lazy fetch, action badges, alternating rows, empty state icon, fmtTs handles ISO/YYYY-MM-DD/DD-MMM-YY (`ea55a2b`)
- [x] CSS: `.popup-tabs`, `.popup-tab`, `.popup-tab.active`, `.badge-info` appended to `components.css` (`ea55a2b`)
- [x] Task history tab: `_taskHistoryLoaded` flag + `_taskTabSwitch()` + `_loadTaskHistory()` in `tasks.js`; synthetic "Tạo mới" row from `t.startDate` (`ea55a2b`)
- [x] Case history tab: same pattern in `case-pipeline.js`; **startDate defaults to today (YYYY-MM-DD)** when `openCaseModal(null)` (`ea55a2b`)
- [x] Initiative history tab: same pattern in `initiative-tracker.js`; **startDate defaults to today (DD-MMM-YY)** using `_MMM` global when `_initOpenModal(null)` (`ea55a2b`)
- [x] `index.html`: tab bars + history panes added to `#taskViewOverlay`, `#initViewOverlay`, `#cpViewOverlay`; cache-bust `?v=20260622` → `?v=20260624` (35 script tags, Python); `APP_VERSION = '6.4-history-20260624'` (`ea55a2b`)
- [x] `verify_history.mjs` (new, port 9992): **47/47 PASS** — H1–H14 covering HTML structure, tab switching, lazy load, history content, synthetic row, startDate defaults; EVD to `test-results/history/` (`ea55a2b`)
- [x] `AI_CONTEXT/PROJECT_STATE.md` updated (v6.4, HEAD `ea55a2b`) (`466f9e9`)

---

## ✅ COMPLETED S32

- [x] docs(S31 handover): SESSION_HANDOVER + PROJECT_STATE + TODO_NEXT + TECH_DEBT updated (`f583f80`)
- [x] `verify_select_bug.mjs` 23/23 PASS — S31 regression tests: selectAll scoped, navigateTo clear, filter clear, goPage clear, deletedIds blacklist (`b95627d`)
- [x] Bug: `sortBy()` now calls `selectedIds.clear()` — column sort reorders tasks across pages; stale selections showed wrong count in bulk bar (`56e3e43`)
- [x] Bug: cache-bust bumped `?v=20260619d` → `?v=20260622` via Python (NOT PowerShell — corrupts Vietnamese UTF-8); `APP_VERSION = '6.3-select-fix-20260622'` (`56e3e43`)
- [x] `verify_select_bug.mjs`: S6 (sortBy test) added → **26/26 PASS**; EVD screenshots s6_before/after_sort.png captured (`56e3e43`)

---

## ✅ COMPLETED S31

- [x] Bug 1: `_gasTaskUpsert` discarding `task-delete` response when task ID changes → task reappears in DB (`689bb10`)
- [x] Bug 2a: `onFilterChange()` missing `selectedIds.clear()` → filter change left stale bulk selections (`5a75f97`)
- [x] Bug 2b: Removed 7 duplicate filter event listeners from `setupListeners()` that were cancelling `onFilterChange`'s debounce (`9e8bfd3`)
- [x] Bug 2c: `navigateTo('tasks')` now calls `selectedIds.clear()` before `renderTaskTable()` → bulk bar no longer shows on page enter (`0cec10b`)
- [x] Bug 3: `db.deletedIds` blacklist — prevents Excel import from re-inserting deleted tasks; persisted in localStorage; pruned on GAS read confirm (`df3339b`)
- [x] `toggleSelectAll` scoped to current page only (`ea8d5d7`)

---

## ✅ COMPLETED S30

- [x] Root cause confirmed: `syncAction` in `bulk.js` → `task-write + N rows` (selectedIds persists across views)
- [x] `bulk.js`: `bulkSetRag/State/Delete` → N × `_gasTaskUpsert`/`_gasTaskDelete` (atomic, optimistic-update) — NO syncAction
- [x] `config.js`: new GAS URL (new deployment with `task-upsert`, `task-delete`, `case-upsert`, `case-delete`, `initiative-upsert` handlers)
- [x] APP_VERSION badge in topbar breadcrumb (`v6.3-no-syncaction-20260619`)
- [x] Startup console diagnostic: confirms version + whether deleteTask uses atomic or old syncAction
- [x] `syncAction()` caller trace: logs stack whenever called (debug, temporary)
- [x] Cache-bust all 35 script tags → `?v=20260619d`
- [x] `verify_atomic_write.mjs`: added T8b + T8c — **41/41 PASS**
- [x] Commit + push `4fc6648`, `origin/main` ✅

---

## ✅ COMPLETED S29

- [x] Audit 8 điểm dùng `localAction()` → save success nhưng không ghi GAS (S23b regression)
- [x] `crud.js`: `handleSubmit` + `deleteTask` → `await syncAction()`
- [x] `bulk.js`: `bulkSetRag/State/Delete` → `await syncAction()`; rename `const synced` tránh duplicate declaration
- [x] `bld-queue.js`: task BLD approval → `await syncAction()` (parity với case BLD)
- [x] `initiatives.js`: `syncInitiativeAdd/Edit` thêm `return` để expose promise
- [x] `initiative-tracker.js`: `_initSave` → `async`, thêm `await` trước sync calls, toast sau sync
- [x] `verify_sync_fix.mjs`: 24/24 PASS — GAS calls verified runtime cho tất cả 8 features
- [x] Commit `2986e51`, push `origin/main`
- [x] TD-034 (CRITICAL data loss) → RESOLVED

---

## ✅ COMPLETED S28

- [x] Commit tài liệu HDSD: `USER_MANUAL.md`, `HDSD/` (10 screenshots), `SYSTEM_UNDERSTANDING_REPORT.md` — từ untracked 2026-06-16
- [x] Commit reference + utility files: `TPBank_KPI_Dashboard_v2.1.html`, `generate_docx.py`, `screenshot_hdsd.mjs`, `um_test.mjs`, `verify_ms_tasks.png`
- [x] Cập nhật AI_CONTEXT handover + memory files cho cả hai project

---

## ✅ COMPLETED S27

- [x] `_initOpenMilestone()`: auto-gen ID = `{parentId}-M{nextNum}`, pre-fill Category từ parent initiative
- [x] `_initNextMsNum(parentId)`: tính số thứ tự milestone tiếp theo (max existing `-M{n}` + 1)
- [x] `openTaskModalForMilestone(msId, iniId)`: mở task modal pre-filled initiative, milestone, category, PIC Accountable (từ ini.accountable), team (từ _appUsers), auto-gen task ID
- [x] "+ Task" button trên mỗi milestone row trong `_initBuildMilestoneList()`
- [x] "+ Thêm Task" trong empty-state của milestone task panel (`_initBuildMsTaskList()`)
- [x] Test: `verify_milestone_task.mjs` 23/23 PASS; `verify_task_init_popup.mjs` 28/28 PASS (no regression)
- [x] Commit `104b81c`, push `origin/main`

---

## ✅ COMPLETED S26

- [x] Fix: `updateFilterDropdowns()` không còn rebuild `filterPic` — tránh format conflict (picNorm vs Username) gây mất filter sau save
- [x] `_populateFilterPic()` trong `renderTaskTable()` là owner duy nhất của `filterPic` dropdown
- [x] Test: `verify_task_init_popup.mjs` 28/28 PASS (no regression)
- [x] Commit `7dbabce`, push `origin/main`

---

## ✅ COMPLETED S25

- [x] Task view popup: `rowClick()` → `openTaskViewPopup(id)` — read-only overlay, full task details, chips, grid, sections
- [x] Task view popup: "Chỉnh sửa" → `taskViewOpenEdit()` → ghi nhớ `_taskEditReturnId` → open edit modal
- [x] Return-to-popup: `handleSubmit()` re-open task view popup sau save; cancel clears `_taskEditReturnId`
- [x] Initiative view popup: card header click → `openInitViewPopup()` (cursor:pointer); stopPropagation trên actions
- [x] Initiative view popup: "Chỉnh sửa" → `initViewOpenEdit()` → `_initEditReturnId` → `_initOpenModal()`
- [x] `_initSave()`: re-open init popup sau save nếu `_initEditReturnId` set
- [x] Task rows trong milestone/linked-task list → `openTaskViewPopup()` (không còn `editTask()`)
- [x] ESC handler: thêm `closeTaskViewPopup()`, `closeInitViewPopup()`, `_initCloseModal()`
- [x] `#taskViewOverlay` + `#initViewOverlay` HTML (reuse `.cp-view-*` CSS)
- [x] Test: `verify_task_init_popup.mjs` 28/28 PASS; all regression tests pass

## ✅ COMPLETED S19

- [x] GAS Backend: `CasePipelineService.gs` (caseRead, caseWrite, auto-create sheet)
- [x] Code.gs routes: `case-pipeline-read`, `case-pipeline-write`
- [x] Frontend constants: CASE_STAGES (14), CASE_COLS (20), CASE_LOAI_HINH, CASE_COMPLEXITY, dbCases
- [x] API layer: caseToRow, rowToCase, genCaseId, calcCaseRag, readCases, writeCases, syncCaseAction (với GAS fallback), persistCases, loadCasesFromCache
- [x] CSS: `case-pipeline.css` (Kanban, cards, modal, summary, stage groups)
- [x] View: `case-pipeline.js` (renderCasePipeline, Kanban 14 cols, summary cards, CRUD modal, filters, Excel import/export)
- [x] index.html: CSS link, nav item, view section, CRUD modal, G+C shortcut in kb-grid, script tag
- [x] navigation.js: title map, render dispatch, G+C shortcut, ESC close cpModal
- [x] app.js: startup cache load, readCases, navBadgeCase, dbCases reset on clear
- [x] BLD Queue: _bldGetPendingCases, _bldBuildCaseHTML, bldOpenAction multi-source, bldSubmitAction case branch
- [x] Tests: verify_case_pipeline.mjs 20/20 PASS; verify_bld_queue.mjs 46/46 PASS; verify_ms_tasks.mjs 14/14 PASS
- [x] PO deploy GAS: CasePipelineService.gs + Code.gs routes case-pipeline-* (2026-06-15; GS_WEBAPP_URL không đổi)
- [x] Smoke test thêm task live: ✅ thành công

## ✅ COMPLETED S20

- [x] index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle (Table/Kanban), preset bar 4 tabs, filter bar (Task Manager pattern), filter chips, #cpTableWrap (default), #cpBoardWrap (hidden)
- [x] case-pipeline.css: Thêm .cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, .sort-icon styles
- [x] case-pipeline.js: Full rewrite → Table-primary (paginated 20/page, sortable 10 cols), 4 preset tabs, _cpGetFiltered() unified, debounced search, filter chips, _cpInitPresetTabs() on every render
- [x] api.js: syncCaseAction thêm syncDot.className = 'status-dot syncing' tại đầu hàm
- [x] initiatives.js: syncInitiativeAction() (Task Manager gold standard), syncInitiativeAdd/Edit/Delete dùng pattern mới
- [x] verify_case_pipeline.mjs: 22/22 PASS (table-primary — +TEST05b kanban toggle, +TEST08b preset tabs)

## ✅ COMPLETED S21

- [x] constants.js: +TEAM_LIST (8 teams: BL1/BL2/CV1/CV2/PTKD MB/PTKD MN/QLDM/Số) — offline fallback
- [x] api.js: +_appUsers[], loadAppUsers() (GAS 'user-list'), getAppTeams(), getUsersByTeam(), _populateTeamSelect(), _populateUserSelect() với offline fallback + PIC mismatch protection
- [x] app.js: loadAppUsers() non-blocking trên startup
- [x] index.html: Task modal fTeam→select+onchange, fPicAcc/fPicRes→select; Case modal cpfTeam→select+onchange, cpfPic→select
- [x] crud.js: openTaskModal() dùng _populateTeamSelect/_populateUserSelect; +onTaskTeamChange() (re-filter PIC + autoGenId)
- [x] case-pipeline.js: openCaseModal() dùng helpers; +onCaseTeamChange()
- [x] initiative-tracker.js: initFAcc input→select; populate via _populateUserSelect (all users)
- [x] verify_case_pipeline.mjs: Fix TEST12 .fill()→.selectOption() cho cpfTeam — 22/22 PASS
- [x] verify_bld_queue.mjs: 46/46 PASS (no regression); verify_ms_tasks.mjs: 14/14 PASS

## ✅ COMPLETED S22b (undocumented — commits between S22 và S23 trên main)

- [x] docs: update S22 ai_context handover (`6f1c23b`)
- [x] fix(user-management): constrain table-wrap height so only rows scroll (`b134d54`)
- [x] feat: pre-fill Team/PIC from logged-in user on Add modal — Task/Case/Initiative (`5323b75`)
- [x] rebrand: org name 'Số Hóa Tín Dụng / Khối KHDN' → 'Trung tâm SP&GPTD' (`691ba9b`)
- [x] fix(initiatives): repair milestone-to-parent linking when sheet has no header row (`ef40075`)

## ✅ COMPLETED S23

- [x] Task filter: PIC cascade từ Team — `_populateFilterPic(team)`, `onFilterTeamChange()` trong tasks.js (`b3262eb`)
- [x] Case Pipeline filter: PIC cascade từ Team — `_cpSyncFilterPic()`, `cpFilterTeamChange()` (`b3262eb`)
- [x] Case Pipeline: DVKD column trong bảng + DVKD filter dropdown (`b3262eb`)
- [x] Import RBAC: `lead-only` CSS class + `canImport()` JS guard — restrict import tới Admin+Teamlead (`dfac565`)
- [x] Modal grid fix: `minmax(0,1fr)` trong forms.css + case-pipeline.css + initiative.css (`6ad6c32`)
- [x] Tests: verify_filter_cascade.mjs 23/23, verify_import_rbac.mjs 15/15, verify_modal_layout.mjs 9/9
- [x] ai_context handover S23 (`11c5770`)

## ✅ COMPLETED S23b

- [x] refactor(sync): Task CRUD/bulk/BLD-approval → `localAction()` (local only, no GAS write) (`65388ae`)

## ✅ COMPLETED S24

- [x] Code.gs: xóa `user-list` khỏi `ADMIN_ONLY` → tất cả roles load `_appUsers` (`a58474e`)
- [x] bld-queue.js: `${isAdmin() ? '...' : ''}` gate trên Phê duyệt/Từ chối/Yêu cầu bổ sung — cả `_bldBuildCaseHTML` + `_bldBuildItemHTML` (`a58474e`)
- [x] performance.js: +`openPerfTaskPopup(key)` — click row → detailOverlay với filtered tasks (`a58474e`)
- [x] case-pipeline.js: +`openCaseViewPopup(id)`, `closeCaseViewPopup()`, `cpViewOpenEdit()`, `_cpViewId`; `cpOpenDetail()` → popup (`a58474e`)
- [x] index.html: +`#cpViewOverlay` HTML (read-only case detail modal) (`a58474e`)
- [x] case-pipeline.css: +`.cp-view-grid` CSS layout cho popup (`a58474e`)
- [x] navigation.js: +`closeCaseViewPopup()` trong Escape handler (`a58474e`)
- [x] tasks.js: picRes filter case-insensitive `.toLowerCase()` — PA1 (`edc6a26`)
- [x] parsers.js: +`_resolvePickerCase()` — canonical Username resolve; gọi cuối `_parseArrayIntoDb()` — PA2 (`edc6a26`)
- [x] api.js: gọi `_resolvePickerCase()` sau `loadAppUsers()` — handle cache-before-users race — PA2 (`edc6a26`)
- [x] Branch cleanup: local + remote `master` đã xóa; push thẳng `main` từ nay
  - `api.js`: +`localAction()` function
  - `crud.js`: saveTask(), deleteTask() use localAction
  - `bulk.js`: bulkSetRag(), bulkSetState(), bulkDelete() use localAction; fixed count-before-clear bug
  - `bld-queue.js`: task BLD approval path uses localAction; Case BLD still syncCaseAction (unchanged)
  - Only `handleImport()` in app.js retains `syncAction()` — sole GAS write path for tasks

---

## ✅ COMPLETED S35

- [x] Fix stale DOM handle in `verify_action_plan.mjs` AP9: re-query `page.$('.ap-filter-bar select')` after `selectOption('BL2')` triggers re-render — new `teamSelReset` const (`a28f770`)
- [x] Fix AP13 test: initiatives have no period filter → empty state never fires in prev-month; assert `html.includes('0 tasks/cases')` in toolbar count instead (`a28f770`)
- [x] **24/24 PASS** on verify_action_plan.mjs (previously crashing at AP9 reset after 18 tests)
- [x] Bug fix: left sidebar not scrollable on desktop — `.sidebar { height:100vh }` + `.nav-menu { min-height:0 }` in `layout.css`; sidebar scrollbar styled rgba(255,255,255,0.2) for dark bg (`2cb947f`)
- [x] CSS cache-bust: added `?v=20260624c` to all 16 local `<link rel="stylesheet">` tags — CSS had no versioning before S35 (`2cb947f`)
- [x] JS cache-bust `?v=20260624b` → `?v=20260624c` (35 script tags, Python); `APP_VERSION = '6.5-sidebar-scroll-fix-20260624c'` (`2cb947f`)

---

## ✅ COMPLETED S34

- [x] `action-plan.js` complete rewrite: filter state, role-aware default team, period range, extended criteria (Blocked/overdue auto-add), grouped accordion Admin view, single-team User/TL view, Tasks+Cases mixed kanban, Initiatives section (no period filter) (`a28f770`)
- [x] CSS: Action Plan v2 styles appended to `components.css` (`a28f770`)
- [x] `verify_action_plan.mjs` (new, port 9993): **24/24 PASS** — AP1–AP14 (`a28f770`)
- [x] Cache-bust `?v=20260624` → `?v=20260624b`; `APP_VERSION = '6.5-action-plan-v2-20260624b'` (`a28f770`)
- [x] Docs: PROJECT_STATE, SESSION_HANDOVER, TODO_NEXT updated

---

## ✅ COMPLETED S33

- [x] GAS `auditReadByEntity(entityId)` + `audit-read` route — all roles, deployed 2026-06-24 (`ea55a2b`)
- [x] `_gasAuditRead()` + `_buildHistoryTable()` in `api.js` (`ea55a2b`)
- [x] History tab in Task/Case/Initiative view popups — lazy load (`ea55a2b`)
- [x] startDate defaults to today for new Case (YYYY-MM-DD) and Initiative (DD-MMM-YY) (`ea55a2b`)
- [x] CSS: `.popup-tabs`, `.popup-tab.active`, `.badge-info` (`ea55a2b`)
- [x] `verify_history.mjs` 47/47 PASS (`ea55a2b`)

---

## 🔴 PRIORITY 0 — User hard-reload required (Ctrl+Shift+R)

Cache-bust `?v=20260624c` pushed in `2cb947f`. Users must hard-reload to pick up **both JS and CSS** changes from S34+S35:

- **Windows/Linux**: Ctrl+Shift+R (or Ctrl+F5)
- **Mac**: Cmd+Shift+R
- **Verify**: Topbar badge shows `v6.5-sidebar-scroll-fix-20260624c`
- **Verify sidebar**: Nav menu scrolls when items exceed viewport height (e.g. "Quản lý User" accessible at bottom)

⚠️ **CSS cache-bust was missing before S35** — if users did Ctrl+Shift+R after S33/S34 they still got old CSS. S35 is the first release where CSS is properly versioned.

---

## 🔴 PRIORITY 0b — Smoke test production: Action Plan v2

Sau hard-reload, smoke test trên live:

| Scenario | Steps | Expected |
|---|---|---|
| **Admin view** | Login Admin → Action Plan | Accordion nhóm theo team; số task/case mỗi team; first team mở sẵn |
| **User/TL view** | Login User/Teamlead → Action Plan | Hiển thị kanban của team chính; summary strip phía trên |
| **Period filter** | Click "Quý này" / "Tháng trước" | Kanban cập nhật đúng deadline trong kỳ |
| **RAG filter** | Click "■ Red" | Chỉ hiện task/case RAG=Red |
| **Team dropdown (Admin)** | Chọn BL1 từ dropdown | Chuyển sang single-team kanban view cho BL1 |
| **Auto badge** | Tìm task Blocked (highlight=N) | Xuất hiện trong kanban với ⚡Auto badge |
| **Initiatives section** | Xem bên dưới kanban | Hiện danh sách parent initiatives của team |
| **Accordion toggle** | Click header team để thu/mở | Body ẩn/hiện không re-render toàn bộ |
| **Task card click** | Click card trong kanban | taskViewOverlay mở đúng task |
| **Case card click** | Click card có ★CASE badge | cpViewOverlay mở đúng case |

---

## ✅ PRIORITY 0c — GAS redeploy — RESOLVED 2026-06-24

- `audit-read` route deployed — URL unchanged
- `task-upsert`/`task-delete` returning `serverTs` — also confirmed in S30 GAS

---

## 🔴 PRIORITY 0d — Verify production atomic writes (S30)

| Check | Expected GAS Audit_Log |
|---|---|
| **Delete single task via modal** | `task-delete \| CV-xxx \| Task Name` — KHÔNG có `task-write + N rows` |
| **Save/edit single task via modal** | `task-upsert \| CV-xxx \| Task Name` |
| **Bulk RAG change** | N × `task-upsert \| ID` (1 per task) — KHÔNG có `task-write + N rows` |
| **Bulk delete** | N × `task-delete \| ID` — KHÔNG có `task-write + N rows` |
| **Excel import (expected)** | `task-write + N rows` — đây là ĐÚNG, chỉ path này còn dùng syncAction |
| **Verify badge** | Topbar hiện `v6.3-no-syncaction-20260619` |
| **Verify console** | `[SHTD] v6.3-... — deleteTask uses: ✅ _gasTaskDelete` |

**Sau khi verify OK**: Xóa debug trace khỏi `api.js` (syncAction caller log) và startup diagnostic khỏi `app.js`.

---

## 🔴 PRIORITY 0e — Fix verify_sync_fix.mjs (stale after S30)

`verify_sync_fix.mjs` (S29, 24/24) test bulk ops gọi `syncAction`. Sau S30 bulk dùng atomic → những tests sẽ FAIL. Options:
- Update tests T3–T5 để expect `task-upsert`/`task-delete` thay vì `write`
- Hoặc deprecate file (coverage đã có trong verify_atomic_write.mjs T8b/T8c)

---

## 🔴 PRIORITY 0f — Smoke test live: S29 + S25–S27 features (còn hiệu lực)

| Feature | Check |
|---|---|
| **Task save → GAS** | Edit task → Lưu → syncDot hiện "syncing" rồi "connected"; reload page → data vẫn đúng trên Sheet |
| **Task delete → GAS** | Xóa task → Sheet mất task đó ngay (không cần import) |
| **Bulk ops → GAS** | Chọn 2+ tasks → bulk RAG/State/Delete → Sheet cập nhật (atomic per row) |
| **BLD approve task → GAS** | BLD approve task → yKienBLD lên Sheet (parity với Case BLD) |
| **Initiative save → GAS** | Thêm/sửa initiative → syncDot syncing→connected; Sheet cập nhật |
| **Milestone auto-gen ID** | Mở Initiative Tracker → bấm "Thêm Milestone" → ID tự điền dạng `{iniId}-M{n}` → Category pre-filled từ initiative cha |
| **Add Task from Milestone** | Bấm "+ Task" trên milestone row → task modal mở → fInit, fMs, fCat, fPicAcc pre-filled đúng; task ID tự gen theo pattern `{iniId}-M{n}-001` |
| **Add Task from empty milestone panel** | Mở task panel của milestone chưa có task → bấm "+ Thêm Task" → modal pre-filled đúng |
| **Task view popup** | Click task row → taskViewOverlay hiện đúng data; Chỉnh sửa → edit modal; ESC đóng |
| **Initiative view popup** | Click card header → initViewOverlay hiện đúng data; Chỉnh sửa → initiative modal; ESC đóng |
| **Return-to-popup sau save** | Edit task từ view popup → save → popup re-opens với data mới |
| **Filter preserved after save** | Chọn filter PIC → edit/add task → save → filter PIC còn nguyên trong dropdown |
| **Display_Name (Username) dropdowns — non-Admin** | Login với role User/Teamlead → mở Task modal → fPicRes có format "Tên (username)" |
| **GAS deploy confirm** | Xác nhận GAS đã deploy với user-list không còn ADMIN_ONLY |

---

## 🟡 PRIORITY 1 — Smoke test live: S23 features (cascade filter, RBAC, modal)

| Feature | Check |
|---|---|
| **Task filter — PIC cascade** | Chọn Team trong filter bar → filterPic dropdown update đúng users |
| **Case filter — PIC cascade** | Chọn Team → cpFilterPic update; DVKD column hiển thị; filter DVKD hoạt động |
| **Import RBAC** | Login User → Import button ẩn; login Teamlead/Admin → visible |
| **Modal layout** | Mở Edit modal Task/Case/Initiative → 2 cột đều nhau, không bị squeeze |
| **Case BLD approval** | BLD approve case → yKienBLD lưu vào Sheet ngay (syncCaseAction) |
| Case Pipeline load | Mở view → Table view là default, hiển thị đúng dữ liệu từ Sheet |

---

## 🟡 PRIORITY 1b — Dọn dead code: `localAction()` và debug trace

1. **`localAction()`** trong `api.js` — không còn caller sau S29. Xác nhận: `grep -r "localAction" assets/js/` = 0 ngoài khai báo → xóa.
2. **syncAction caller trace** trong `api.js:244` — debug log tạm thời, xóa khi production stable.
3. **Startup diagnostic** trong `app.js:18` — debug log tạm thời, xóa khi production stable.

---

## 🔴 PRIORITY 2 — Verify AI Chat trên live

AI Chat frontend hoàn chỉnh từ S12. GAS-side chưa xác nhận.

**Steps**:
1. Login Admin → AI Assistant → gõ câu hỏi
2. Nếu lỗi → GAS editor → AiService.gs → Script Properties → `GEMINI_API_KEY` → Deploy new version

---

## 🟡 PRIORITY 3 — Fix Testing Environment (Netlify hết credit)

Options (chưa chọn):
- **A) Cloudflare Pages** (miễn phí, unlimited) — khuyến nghị
- **B) GitHub Pages cho master** (gh-pages branch)
- **C) Local only** — hiện đang dùng tạm

---

## W2 — Tech Debt (low priority)

| ID | Debt | Effort |
|---|---|---|
| TD-033 | `verify_initiative_v2.mjs` không inject auth → fail local; copy pattern verify_bld_queue | Small |
| TD-008 | No error boundary in `renderAll()` | Small |
| TD-018 | `fmtExportDate` duplicated `app.js` vs `helpers.js` | Tiny |
| TD-023 | `_oaActiveTab` not reset on re-render | Tiny |
| AUTH-05 | KNOWN_ROLES hardcoded | Small |
| ~~TD-030~~ | ~~User Management table — no search/pagination~~ | ✅ Done S22 |
| TD-031 | BAU task ID gap sequence khi clone | Tiny |

---

## Session Rules

1. **Đọc SESSION_HANDOVER + PROJECT_STATE trước** — không skip
2. **Branch**: push thẳng lên `main`; `master` không dùng nữa kể từ S19
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2'].tasks` — trừ khi PO yêu cầu
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. **Test local**: `npx http-server . -p 3030 &` → `node verify_case_pipeline.mjs` + `node verify_bld_queue.mjs`
9. `syncCaseAction` có local fallback — khi GAS down vẫn save local.
10. **Git sync**: commit + `git push origin HEAD:main` ngay sau mỗi thay đổi — git remote LUÔN phải đồng bộ với local. Không delay push.
