# PROJECT STATE
**As of**: 2026-06-27 (Session 37 — Mobile Responsive Fix)
**Version**: v6.6 (`APP_VERSION = '6.6-mobile-toolbar-fix-20260627c'`, `index.html ?v=20260627c`)
**Remote HEAD (main)**: `6088832` — docs: S37 handover — mobile topbar fix + toolbar stack
**Schema**: Task_Master 24 cột (SCHEMA-01 đã giải quyết sau khi merge)
**GAS URL (current)**: `https://script.google.com/macros/s/AKfycbydyikBtboeDufx9fsloV3pOT-EVgQfpkggImGH3GrQ8Skct5XC1B1KtE7U008G97f2/exec`

---

## Branch Strategy (CONFIRMED S24 — master xóa hoàn toàn)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + Development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**`master` đã xóa cả local lẫn remote từ 2026-06-16 (S24). Không tạo lại.**

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~1360 | ✅ S37: `?v=20260627c` (51 occurrences); S36: +`#cpSummaryOverlay` popup; +`cpFilterTuanBC` filter select; stat cards onclick; S35: `?v=20260624c` on 35 JS script tags + 16 CSS link tags |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/AiService.gs` | ~75 | ⚠️ S12 — model `gemini-2.5-flash` in repo; GAS deploy unconfirmed |
| `backend/Code.gs` | ~170 | ✅ S24: xóa `user-list` khỏi ADMIN_ONLY → tất cả roles load được _appUsers; S19: +case-pipeline routes |
| `backend/UserService.gs` | ~130 | ✅ NEW S13 — deployed |
| `backend/Config.gs` | 6 | ✅ S18: comment A1:X |
| `backend/AuthService.gs` | ~165 | ✅ deployed |
| `backend/SheetService.gs` | ~65 | ✅ deployed |
| `backend/AuditService.gs` | 32 | ✅ deployed |
| `backend/KpiSheetService.gs` | 51 | ✅ deployed |
| `backend/InitiativeService.gs` | 60 | ✅ deployed |
| `backend/CasePipelineService.gs` | ~65 | ✅ NEW S19 — **deployed GAS** (2026-06-15) |
| `assets/js/constants.js` | ~65 | ✅ S31: +`deletedIds: []` in db init; S21: +TEAM_LIST (8 teams — offline fallback) |
| `assets/js/config.js` | 7 | ✅ S37: APP_VERSION = '6.6-mobile-toolbar-fix-20260627c'; S30: new GS_WEBAPP_URL |
| `assets/css/layout.css` | ~132 | ✅ S35: `.sidebar { height:100vh }` + `.nav-menu { min-height:0 }` + sidebar scrollbar CSS — fixes left menu scroll on desktop |
| `assets/css/responsive.css` | ~65 | ✅ S37: `.topbar{position:fixed;top:0;left:0;right:0;z-index:150}` on mobile; `content{padding-top:74/68px}`; `thead{top:62/56px}`; `.toolbar{flex-direction:column}` + full-width left/right; `.path-hint{display:none}` |
| `assets/css/forms.css` | ~25 | ✅ S23: .form-grid → minmax(0,1fr) minmax(0,1fr); .form-group min-width:0; .form-control width:100% min-width:0 |
| `assets/css/case-pipeline.css` | ~425 | ✅ S24: +.cp-view-grid/.cp-view-row/.cp-view-label/.cp-view-val/.cp-view-section CSS cho cpViewOverlay; S23: .cp-modal-grid fix; S20: view toggle, stage chips, RAG dots |
| `assets/css/initiative.css` | ~360 | ✅ S23: .init-modal-grid → minmax(0,1fr) minmax(0,1fr) |
| `assets/css/auth.css` | ~150 | ✅ S23: +body[data-role="User"] .lead-only { display:none !important } |
| `assets/js/auth.js` | ~265 | ✅ S23: +canImport() → Admin || Teamlead |
| `assets/js/views/tasks.js` | ~400 | ✅ S32: `sortBy()` now calls `selectedIds.clear()` — sort reorders tasks across pages, stale selections mislead user; S31: `onFilterChange()` clears sync; `toggleSelectAll` scoped to current page; S24: PA1; S23: +_populateFilterPic |
| `assets/js/views/case-pipeline.js` | ~740 | ✅ S24: +openCaseViewPopup(), closeCaseViewPopup(), cpViewOpenEdit(), _cpViewId; cpOpenDetail() → openCaseViewPopup(); S23: DVKD col+filter, PIC cascade |
| `assets/js/views/performance.js` | ~85 | ✅ S24: +openPerfTaskPopup(key) — click row → detailOverlay với tasks lọc theo perfTab |
| `assets/js/views/initiative-tracker.js` | ~760 | ✅ S29: `_initSave` → async, thêm await trước syncInitiativeAdd/Edit; S27: auto-gen milestone ID + add task from milestone; S25: view popups |
| `assets/js/api.js` | ~390 | ✅ S31: `syncAction` merge skips `db.deletedIds`; `readFromHandle` prunes stale deletedIds; S30: atomic helpers; S24: PA2 _resolvePickerCase |
| `assets/js/parsers.js` | ~325 | ✅ S24: +_resolvePickerCase() — map picRes/picAcc → canonical Username từ _appUsers; gọi cuối _parseArrayIntoDb() |
| `assets/js/ui/navigation.js` | ~120 | ✅ S31: `navigateTo('tasks')` now calls `selectedIds.clear()` before render; removed 7 duplicate filter listeners from `setupListeners`; S24: +closeCaseViewPopup() in Escape handler |
| `assets/js/crud.js` | ~280 | ✅ S31: `deleteTask()` adds id to `db.deletedIds`; `handleSubmit()` splices from `db.deletedIds` on re-add; S29: atomic GAS writes; S21: User_Master dropdowns |
| `assets/js/bulk.js` | ~62 | ✅ S31: `bulkDelete()` pushes ids to `db.deletedIds`; S30: atomic per-row writes; NO syncAction |
| `assets/js/views/bld-queue.js` | ~390 | ✅ S29: task BLD approval → `await syncAction()`; Case BLD still syncCaseAction |
| `assets/js/storage.js` | ~30 | ✅ S31: `loadDb()` now loads `db.deletedIds` from localStorage if present |
| `assets/js/app.js` | ~340 | ✅ S31: `handleImport()` skips tasks in `db.deletedIds` before merging; S30: startup diagnostic; S26: remove filterPic rebuild |
| `assets/js/api.js` | ~380 | ✅ S30: syncAction() logs caller stack on every call (debug trace, temporary); S29: atomic GAS write helpers (_gasTaskUpsert/_gasTaskDelete/_gasCaseUpsert/_gasCaseDelete); S24: _resolvePickerCase() |
| `assets/js/initiatives.js` | ~170 | ✅ S29: syncInitiativeAdd/Edit thêm `return` → expose promise; S20: syncInitiativeAction() gold standard |
| `assets/js/ui/navigation.js` | ~120 | ✅ S19: G+C shortcut, case-pipeline title, renderCasePipeline dispatch |
| `assets/js/app.js` | ~325 | ✅ S21: +loadAppUsers() non-blocking on startup (after autoConnectDB) |
| `assets/js/crud.js` | ~420 | ✅ S21: openTaskModal() uses _populateTeamSelect/_populateUserSelect; +onTaskTeamChange() (re-filter both PICs + autoGenId) |
| `assets/js/views/bld-queue.js` | ~380 | ✅ S18+S19: case card [CASE], _bldGetPendingCases, multi-source approve/reject, yKienBLD |

---

## Feature Status

| Feature | Works? | Notes |
|---|---|---|
| **Milestone auto-gen ID + Add Task** | ✅ | S27: "Thêm Milestone" tự gen ID `{parentId}-M{n}` + pre-fill category; "+ Task" btn trên mỗi milestone → task modal pre-filled (initiative, milestone, category, PIC, team, auto-gen ID) |
| **Task view popup** | ✅ | S25: click row → taskViewOverlay (read-only); Chỉnh sửa → edit modal; sau save → popup re-opens |
| **Initiative view popup** | ✅ | S25: click card header → initViewOverlay (read-only); Chỉnh sửa → _initOpenModal; sau save → popup re-opens |
| **Return-to-popup sau save** | ✅ | S25: _taskEditReturnId / _initEditReturnId pattern; cancel (ESC/Hủy) không re-open |
| **Case Pipeline (Table + Kanban)** | ✅ | S24: +read-only view popup (cpViewOverlay) + Edit btn cho Admin/Teamlead; S20: Table-primary; S19: GAS deployed |
| **Case Pipeline view popup** | ✅ | S24: click row/card → cpViewOverlay (read-only); Edit btn → cpModal (canImport() only) |
| **Case Pipeline DVKD column + filter** | ✅ | S23: Cột ĐVKD thêm vào bảng; filter ĐVKD dropdown trong filter bar; cascade cpFilterPic từ Team |
| **Task filter PIC preserve after save** | ✅ | S26: remove filterPic rebuild from updateFilterDropdowns(); _populateFilterPic() owns filterPic exclusively — value preserved through localAction() |
| **Task filter PIC cascade** | ✅ | S23: cascade; S24: picRes case-insensitive compare + _resolvePickerCase() canonical mapping |
| **Display_Name (Username) dropdowns — tất cả roles** | ✅ | S24: user-list không còn ADMIN_ONLY → non-Admin/Teamlead cũng load _appUsers → dropdowns nhất quán |
| **BLD Queue role gate** | ✅ | S24: Phê duyệt/Từ chối/Yêu cầu bổ sung ẩn với non-Admin; Xem đầy đủ luôn hiện |
| **Performance task popup** | ✅ | S24: click row → openPerfTaskPopup(key) → detailOverlay mở với tasks lọc theo tab |
| **Import Excel RBAC** | ✅ | S23: Import button ẩn với User role (lead-only CSS); canImport() JS guard trong handleImport() và importCasesFromExcel() |
| **Modal 2-column layout** | ✅ | S23: minmax(0,1fr) fix — cả 3 modal grids (Task/Case/Initiative) equal-width columns |
| **Pre-fill Team/PIC từ logged-in user** | ✅ | S22b: Add modal (Task/Case/Initiative) tự pre-fill Team + PIC Accountable từ user hiện tại |
| **Task/Case/Initiative Team+PIC dropdowns** | ✅ | S21: Driven by User_Master (GAS user-list); cascaded Team→PIC; offline fallback to TEAM_LIST + currentVal |
| **Case CRUD** | ✅ | Add/Edit/Delete với validation; auto-gen CP-XXX ID; modal |
| **Case Excel Import/Export** | ✅ | 20 cột; import merge by ID; export với column widths |
| **Case BLD Queue integration** | ✅ | Case canBLD=Y → badge [CASE] trong BLD Queue; approve/reject/info lưu yKienBLD |
| **BLD Approval Queue (Tasks)** | ✅ | S16+S17+S18 — **46/46 PASS** (no regression S19) |
| **Ý kiến Ban lãnh đạo (yKienBLD)** | ✅ | S18 — cột 24 Task_Master; S19 — cột 20 Case_Pipeline |
| **Executive Summary** | ✅ | S15 |
| Dashboard KPIs | ✅ | |
| Task list + filters + presets | ✅ | |
| Task CRUD (GAS sync) | ✅ | S30: Single CRUD + Bulk → atomic per-row writes (`_gasTaskUpsert`/`_gasTaskDelete`). syncAction() chỉ còn cho Excel import. |
| Gantt / Timeline | ✅ | |
| Auto weekly report | ✅ | |
| KPI Overview / Progress / Owner | ✅ | |
| Initiative Tracker | ✅ | S14 milestone drill-down; S20: syncInitiativeAction() — showLoading + syncDot + GAS fallback toast |
| **Action Plan v2** | ✅ | S34: role-aware default (Admin=all teams grouped accordion; User/TL=own team kanban); mixed Tasks+Cases kanban; Blocked/overdue auto-add; Initiatives section; 24/24 tests pass |
| **Audit history tab** | ✅ | S33: Task/Initiative/Case view popups — History tab, lazy load from GAS audit-read; startDate defaults today on Add |
| **AI Assistant** | ⚠️ | Frontend complete; GAS AiService.gs deploy + GEMINI_API_KEY unconfirmed |
| User Management | ✅ | Admin-only; S13 CRUD; S22: search/filter/sort/pagination added (TD-030 resolved) |
| Login / Auth | ✅ | S11+S18 verified |
| Optimistic Locking | ✅ | Task_Master; Case_Pipeline không cần (simple write-all) |
| Dark mode | ✅ | |

---

## Architecture State

```
CURRENT (Session 21 — Team/PIC User_Master + Case Pipeline Table-primary)
─────────────────────────────────────────────────────────
index.html (~1150 lines — HTML only)
assets/
  css/  tokens.css, base.css, layout.css, components.css,
        forms.css, table.css, gantt.css, quickview.css,
        responsive.css, kpi.css, initiative.css, auth.css,
        ai-chat.css, executive-summary.css, bld-queue.css
        case-pipeline.css    ← NEW S19 (260 lines, cp- prefix)
  js/   config.js, constants.js (+CASE_STAGES/COLS/dbCases), helpers.js,
        storage.js, parsers.js, auth.js
        api.js (+Case API: caseToRow/rowToCase/genCaseId/calcCaseRag/
                readCases/writeCases/syncCaseAction/persistCases/loadCasesFromCache)
        ui/toast.js, ui/modal.js, ui/theme.js, ui/navigation.js
          ← S19: G+C shortcut, case-pipeline title, renderCasePipeline dispatch
        crud.js, bulk.js
        views/dashboard.js, views/tasks.js, views/gantt.js,
              views/performance.js, views/quickview.js
        report.js, kpi-data.js, kpi-parser.js
        views/kpi-overview.js, views/action-plan.js, views/kpi-progress.js
        views/owner-analysis.js, views/branch-analysis.js, views/rm-analysis.js
        views/initiative-tracker.js, initiatives.js
        views/ai-chat.js, views/user-management.js, views/executive-summary.js
        views/bld-queue.js   ← S19: case cards, multi-source approve
        views/case-pipeline.js ← S20: Table-primary + preset + filter chips (~600 lines)
        app.js               ← S19: loadCasesFromCache, readCases, navBadgeCase
backend/
  Code.gs (+case-pipeline routes), Config.gs, AuthService.gs,
  SheetService.gs, AuditService.gs, KpiSheetService.gs,
  InitiativeService.gs, UserService.gs, AiService.gs, GAS.GS
  CasePipelineService.gs ← NEW S19 (deployed 2026-06-15)
verify_mobile_s37.mjs     ← S37 NEW — 21/21 PASS (M1–M10: topbar fixed, content pad, hamburger, sidebar, toolbar stack, path-hint, thead offset, scroll)
verify_case_pipeline.mjs  ← S20 — 22/22 PASS
verify_bld_queue.mjs      ← 46/46 PASS
verify_ms_tasks.mjs       ← 14/14 PASS
verify_filter_cascade.mjs ← S23 NEW — 23/23 PASS (Task PIC cascade + Case DVKD/PIC filter)
verify_import_rbac.mjs    ← S23 NEW — 15/15 PASS (3 roles × 5 assertions)
verify_modal_layout.mjs   ← S23 NEW — 9/9 PASS (3 modal grids, 0.0px column diff)
verify_action_plan.mjs    ← S34 NEW — 24/24 PASS (AP1–AP14: toolbar, period/RAG, accordion, kanban, initiatives)
verify_sync_fix.mjs       ← S29 — 24/24 PASS ⚠️ STALE after S30: bulk tests expect syncAction, now atomic
verify_atomic_write.mjs   ← S30 NEW — 41/41 PASS (single + bulk atomic: task-upsert/delete/case-upsert/delete)
verify_kpi_views.mjs      ← 3/3 PASS (S7)
um_test.mjs               ← 14/14 PASS (S13)
debug_login.mjs           ← S18 login diagnostics
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | In `assets/js/config.js`; **updated S30** — new deployment với atomic action handlers |
| Task backend | ✅ Deployed — 24 cột (S18) |
| Case Pipeline backend | ✅ **Deployed** 2026-06-15 — Code.gs routes + CasePipelineService.gs live; GS_WEBAPP_URL không đổi |
| `GS_SHEET_ID` | `1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk` |
| Task sheet | `Task_Master!A1:X` (24 cột) |
| Case sheet | `Case_Pipeline` (20 cột A→T; tự tạo khi chưa có) |

---

## Known Issues (Active)

| ID | Issue | Priority |
|---|---|---|
| TD-033 | `verify_initiative_v2.mjs` fail local (no auth inject) | 🟡 |
| MOB-01/02 | Topbar + toolbar trên mobile | ✅ **FIXED S37** — `position:fixed` + column stack |
| MOB-03 | Gantt trên mobile | 🟡 Phase D |
| DEBT-03/05/06 | Tech debt nhỏ | ⚪ |

---

## Deployment

| Environment | URL | Branch | Status |
|---|---|---|---|
| **Testing (local)** | `http://localhost:3030` | `main` | ✅ Dùng tạm |
| **Testing (Netlify)** | https://test-shtd.netlify.app | — | ❌ **Hết credit** |
| **Production** | GitHub Pages URL | `main` | ✅ Live (`41f4018` — S23 tất cả features merged via PR #27) |

---

## Deployment Process (Git Sync Protocol)

> **Quy tắc bắt buộc**: git tại remote phải LUÔN đồng bộ với local. Không để local differ với `origin/main`.

### Quy trình chuẩn mỗi thay đổi:
```
1. Thay đổi file(s) → chạy test local nếu có
2. git add <files>
3. git commit -m "type: mô tả ngắn"
4. git push origin HEAD:main   ← LUÔN push ngay, không delay
```

### Quy trình GAS deploy:
```
1. Sửa file backend/*.gs trong repo (git commit + push trước)
2. Copy nội dung vào Apps Script editor
3. Deploy → New deployment (hoặc Manage deployments → chọn version)
4. GS_WEBAPP_URL không đổi nếu dùng cùng deployment ID
5. Ghi chú version mới vào PROJECT_STATE.md → commit + push
```

### Không được phép:
- Code local mà không commit + push ngay
- Deploy GAS trước khi commit code vào git
- Để `master` differ với `main` (master không dùng từ S19)
