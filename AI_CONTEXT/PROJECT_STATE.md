# PROJECT STATE
**As of**: 2026-08-05 (Session 60 — AI Assistant tuning: full-task index + Markdown table)
**Version**: v6.28 (`APP_VERSION = '6.28-ai-table-fullindex-20260804'`, `index.html ?v=20260804c`)
**Remote HEAD (main)**: `f8826c4` (S60) + commit handover này

> **S60 (AI Assistant)**: Tinh chỉnh AI Chat (Gemini) sau migrate key cơ quan (S59), 3 commit. (a) model `gemini-2.5-flash`→**`gemini-flash-latest`** (key mới từ chối model cũ). (b) v6.27: server tự tính "SỐ LIỆU TÍNH SẴN" (đếm deterministic) + `maxOutputTokens` 1024→2048 + bỏ ép ngắn + **bỏ Audit_Log khỏi context** (nhẹ → nhanh → ít 404) + `ai-chat.js` **retry 3× backoff riêng cho AI** (read-only, không đụng `gasPost` global). (c) v6.28: `_aiTaskIndex_()` sinh **CHỈ MỤC TOÀN BỘ task** (fix "AI chỉ xem 300 task") + rich detail cap 200 gần nhất; `_aiRenderMarkdown()` render **bảng/đậm/code/bullet** trong bubble bot (esc TRƯỚC → chống XSS, user msg vẫn plain). **GAS đã redeploy (URL không đổi)** → live. Thuần AI feature. Tests: full suite **21/23** (2 fail pre-existing: H13 stale TD-TEST-02, my_work flaky TD-TEST-01 — 0 regression).
> **S59 (hạ tầng)**: Chuyển toàn bộ **GAS backend (script + Sheet DB + email nhắc việc)** từ tài khoản Google **cá nhân → tài khoản cơ quan `cb_sptd_7@tpbank.vn`** (Google Workspace) để đảm bảo ANBM. Thuần đổi config, **không đổi schema/logic/feature**. Sửa 4 file: `Config.gs` (SPREADSHEET_ID → Sheet copy cơ quan `1t4tkaw4…Zq4g`), `config.js` (GS_WEBAPP_URL → deployment mới `AKfycbw1…DSg`; v6.26), `constants.js` (GS_SHEET_ID sync), `index.html` (cache-bust `?v=20260804`). Email digest giờ phát từ `@tpbank.vn` (MailApp dùng account sở hữu script — không sửa code). **Quyết định**: kịch bản A (Workspace, data ở lại Google được chấp nhận, frontend giữ public); Sheet **copy** (ID mới) vì không transfer ownership consumer↔Workspace được. **Còn thủ công phía GAS**: tắt trigger `notifScan` project cá nhân cũ (tránh email 2 lần) + đối chiếu `AUTH_SECRET`. **Rollback**: giữ deployment+Sheet cũ, revert `config.js`. Tests: full suite 20/23, 3 fail đều pre-existing (chứng minh qua git stash) — 0 regression do migration.
> **S58.2**: **My Work** — page width về **chuẩn** (`.mw-page` bỏ double-padding + cap 1200px → full-width như mọi view; AI Chat 860px giữ nguyên vì cố ý). **"Cần làm ngay" chia 2 cột: Quá hạn (diff<0) | Sắp đến hạn (diff≥0, hôm nay+≤7d)** — mỗi cột count + sort soonest-first + empty "Không có"; mobile stack 1 cột. +i18n `mw.urgent.col.soon/none`. Audit toàn hệ thống: chỉ My Work lệch chuẩn. v6.25. Tests: urgent MW12/MW13 PASS (suite flaky TD-TEST-01, không do S58.2).
> **S58.1 FIX**: Dev Plan bảng — sửa **đè chữ** (name đè target) + **nút Sửa/Xóa đè cột Ghi chú** + textarea modal **auto-grow theo nội dung** + **page width đồng bộ** .content. Gốc: global `table{white-space:nowrap}` (table.css:61) làm cell `table-layout:fixed` (S58) vẫn tràn. Sửa: `.dev-table td{white-space:normal}` (+ `.dev-table td.dev-cell-date` nowrap giữ ngày 1 dòng), header wrap, buttons compact + cột actions 58→78px, `.dev-autogrow` + `_devAutoGrow()`, `.dev-page` padding 2px→0. v6.24. Tests `verify_dev_plan` **40/40**.
> **S58 NEW**: **UI layout fit** — (1) **Dev Plan** bảng danh sách hết tràn ngang: bỏ `min-width:900px` → `table-layout:fixed; width:100%`, cell free-text wrap, `.dev-cell-date` giữ 1 dòng, thu gọn width cột → fit 1 màn hình (scroll ngang chỉ là fallback <720px). (2) **Action Plan** kanban giãn lấp đầy: `.kanban-col` `flex:0 0 260px` → `flex:1 1 0; min-width:240px`. (3) **`AI_CONTEXT/UI_CONCEPT.md` (NEW)** — contract layout để tính năng sau tự tối ưu (fit-one-screen table, stretch-to-fill board, thang width modal, breakpoint chuẩn, checklist pre-merge). Thuần frontend — **không cần GAS deploy**. `.kanban-*` chỉ Action Plan dùng (Case Pipeline = `.cp-col`). Tests: `verify_dev_plan` **40/40**, `verify_action_plan` **24/24**.
> **S57 NEW**: Chuông 🔔 topbar — nhắc **sắp/đến/quá hạn** (3d/1d/hôm nay/quá hạn) + **tạo** + **đóng** cho Task/Case/Issue/Initiative+Milestone/Dev Plan. Click noti → deep-link mở popup công việc. **Email digest 1/ngày** (MailApp). Read-state per-user ở sheet `Notifications`. GAS = (1) trigger `notifScan()` ~8h ghi sheet + gửi email; (2) real-time `notifOnWrite()` trong doPost (created/closed). Chuông client poll `notif-read` (load/Sync/5'). **✅ GAS đã deploy (2026-08-02, URL không đổi) + `installNotifTrigger()` đã bật; smoke test production OK.** Tests: `verify_notifications` **21/21**.
> **S56 NEW**: Đồng nhất date input trên mọi modal thêm/sửa. Initiative/Milestone (`initFStart/initFDeadline/initFMsDl`) từ **free-text → `<input type="date">`**; **giữ nguyên storage `DD-MMM-YY`** (convert ở biên: `_initToISO` khi mở Sửa, `_initFromISO` khi Lưu → 0 rủi ro sheet/backend/history/export). Dev Plan `devfStart` giờ **mặc định hôm nay** khi Add. Quy tắc chốt: mọi date field = native picker; **chỉ Start Date default hôm nay**, Deadline để trống. Thuần frontend — **không cần GAS deploy**. Tests: `verify_initiative_tracker` **19/19**, `verify_dev_plan` **40/40**, round-trip E2E **11/11**.
> **S55 NEW**: "Theo dõi Initiative" — (1) tách Done ra section thu gọn "Đã hoàn thành (N)" ở cuối (collapse mặc định, lazy render; gọn khi ~70 initiative); (2) ô số tổng đồng nhất `.cp-stat-card` (icon+số+nhãn) grid 5 ô như Case Pipeline; (3) mỗi ô số → view popup `#initSummaryOverlay` short-list table (row → chi tiết). Ô số + popup đếm theo **scope + Category** (không áp Status). Thuần frontend — **không cần GAS deploy**. Tests: `verify_initiative_tracker` **19/19** → **22/22 suites PASS**.
> **S54 NEW**: Left menu "Plan phát triển bản thân" (nhóm Tổng quan, G+V). Sheet `Dev_Plan` (12 cột) + `DevPlanService.gs` + 3 route `dev-*` (ownership gate). View `dev-plan.js` + section ở My Work. GAS **đã deploy** (dev-read/upsert/delete live, URL không đổi). Tests: **40/40** (verify_dev_plan).
> **S54.1 fix**: My Work giờ hiện **toàn bộ dev item đang làm của tôi** (trước chỉ hiện item quá hạn review >7 ngày → item vừa tạo bị ẩn cả tuần). Item quá hạn gắn badge "Cần review" + xếp đầu. `readDev()` re-render My Work khi load xong.
> **⚠️** `backend/RenameUserService.gs` bị nối đoạn PowerShell chứa API key ở cuối (không do S54) — chưa commit; cần dọn + thu hồi key.
**Schema**: Task_Master 24 cột (SCHEMA-01 đã giải quyết sau khi merge)
**GAS URL (current)**: `https://script.google.com/macros/s/AKfycbw1BgeNZuo8WVBpwjB0zj7HC-yr5DEHZtO3saHEnJ1g7m7XJdPhif9hmYKPNhk6cg9DSg/exec` (S59 — tài khoản cơ quan `cb_sptd_7@tpbank.vn`)
**GAS URL (cũ, giữ để rollback)**: `…AKfycbydyik…97f2/exec` (tài khoản cá nhân — xóa deployment sau khi verify ổn định)
**Owner tài khoản GAS/Sheet**: `cb_sptd_7@tpbank.vn` (Google Workspace TPBank) — trước S59 là mail cá nhân

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
| `index.html` | ~1870 | ✅ S49: cache-bust `?v=20260710` (56 refs); S44a: +#mwInitPopup overlay; S43: data-i18n on tasks filter labels |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/AiService.gs` | ~250 | ✅ S60: model `gemini-flash-latest`; `_aiTaskIndex_()` (chỉ mục toàn bộ task) + `_aiResolveTaskCols_()`/`_aiTrunc_()` + `_aiTaskSummary_()` deterministic + rich detail cap 200; drop Audit_Log; maxOutputTokens 2048. **GAS deployed (URL không đổi)** |
| `backend/Code.gs` | ~170 | ✅ S24: xóa `user-list` khỏi ADMIN_ONLY → tất cả roles load được _appUsers; S19: +case-pipeline routes |
| `backend/UserService.gs` | ~130 | ✅ NEW S13 — deployed |
| `backend/Config.gs` | 6 | ✅ S18: comment A1:X |
| `backend/AuthService.gs` | ~165 | ✅ deployed |
| `backend/SheetService.gs` | ~65 | ✅ deployed |
| `backend/AuditService.gs` | 32 | ✅ deployed |
| `backend/KpiSheetService.gs` | 51 | ✅ deployed |
| `backend/InitiativeService.gs` | 60 | ✅ deployed |
| `backend/CasePipelineService.gs` | ~65 | ✅ NEW S19 — **deployed GAS** (2026-06-15) |
| `assets/js/constants.js` | ~65 | ✅ S40: TEAM_LIST 8→7 teams (BL1+BL2 merged → BL); S31: +`deletedIds: []` in db init; S21: +TEAM_LIST (offline fallback) |
| `assets/css/my-work.css` | ~560 | ✅ S44b: .mw-champion-section/item/status/pending/done; S44a: .mw-popup-ini-item; S42 base styles |
| `assets/js/views/my-work.js` | ~380 | ✅ S44b: _mwGetChampionTasks/BuildChampionSection/mwRefreshChampionStatus; S44a: mwOpenInitPopup/Close, MAX_INIT=4; S42 base |
| `assets/js/config.js` | 7 | ✅ S60: APP_VERSION = '6.28-ai-table-fullindex-20260804'; S59: GS_WEBAPP_URL → deployment cơ quan `AKfycbw1…DSg` |
| `assets/js/views/ai-chat.js` | ~200 | ✅ S60: `_aiRenderMarkdown()` renderer GFM an toàn (esc trước; bảng/đậm/code/bullet) cho bubble bot; retry 3× backoff scope-AI khi GAS 404/5xx |
| `assets/css/ai-chat.css` | ~240 | ✅ S60: `.ai-md-table`/`.ai-md-list`/`code` style trong bubble bot (theme-aware) |
| `assets/css/my-work.css` | ~600 | ✅ S58.2: `.mw-page` full-width (bỏ padding 20/24 + max-width 1200) + `.mw-urgent-cols` grid 2 cột (Quá hạn|Sắp đến hạn); S44b base |
| `assets/js/views/my-work.js` | ~410 | ✅ S58.2: `_mwBuildUrgentSection` chia 2 cột overdue/soon + `_mwUrgentTaskItem/CaseItem`; S54.1: dev review all active; S44b base |
| `assets/css/dev-plan.css` | ~250 | ✅ S58.1: `.dev-table td{white-space:normal}` (override global nowrap) + `td.dev-cell-date` nowrap + header wrap + `.btn-sm` compact + `.dev-autogrow` + `.dev-page` pad 2px→0; S58: `table-layout:fixed; width:100%`; S54: base |
| `assets/js/views/dev-plan.js` | ~490 | ✅ S58.1: header name/target auto-width + actions 78px + `_devAutoGrow()`; S58: thu gọn width cột + `.dev-cell-date`; S54.1: My Work all active; S54: base |
| `assets/css/kpi.css` | ~90+ | ✅ S58: `.kanban-col` `flex:1 1 0; min-width:240px` (giãn lấp đầy, was 0 0 260px) — chỉ Action Plan dùng |
| `AI_CONTEXT/UI_CONCEPT.md` | NEW | ✅ S58: contract layout (fit-one-screen table, stretch-to-fill board, width modal, breakpoint, checklist pre-merge) |
| `backend/NotificationService.gs` | ~470 | ✅ S57: NEW — sheet `Notifications` + `notifScan()` (trigger ~8h) + `notifOnWrite`/`notifPrior_` (real-time) + `notifRead`/`notifMarkRead` + email digest + `installNotifTrigger`/`notifSelfTest`. **✅ Deployed + trigger bật (2026-08-02)** |
| `assets/js/views/notifications.js` | ~185 | ✅ S57: NEW — bell badge + dropdown nhóm + deep-link dispatcher (`open*ViewPopup`) + mark-all + outside-click/ESC |
| `assets/css/notifications.css` | ~160 | ✅ S57: NEW — bell/badge/panel/item, dark-mode |
| `backend/MigrationService.gs` | ~55 | ✅ S40: NEW — `dryRunTeamBL()` / `commitTeamBL()` for Task_Master+Case_Pipeline+User_Master BL1/BL2→BL migration |
| `backend/RenameUserService.gs` | ~90 | ✅ S53: NEW — `dryRunRenamePhuong()` / `commitRenamePhuong()` — rename PhuongNPL_C → PhuongNPL trên 5 sheets (User_Master, Task_Master, Case_Pipeline, Issue_Tracker, Initiative_Master); Audit_Log KHÔNG chạm |
| `assets/css/layout.css` | ~132 | ✅ S35: `.sidebar { height:100vh }` + `.nav-menu { min-height:0 }` + sidebar scrollbar CSS — fixes left menu scroll on desktop |
| `assets/css/responsive.css` | ~65 | ✅ S37: `.topbar{position:fixed;top:0;left:0;right:0;z-index:150}` on mobile; `content{padding-top:74/68px}`; `thead{top:62/56px}`; `.toolbar{flex-direction:column}` + full-width left/right; `.path-hint{display:none}` |
| `assets/css/forms.css` | ~25 | ✅ S23: .form-grid → minmax(0,1fr) minmax(0,1fr); .form-group min-width:0; .form-control width:100% min-width:0 |
| `assets/css/case-pipeline.css` | ~425 | ✅ S24: +.cp-view-grid/.cp-view-row/.cp-view-label/.cp-view-val/.cp-view-section CSS cho cpViewOverlay; S23: .cp-modal-grid fix; S20: view toggle, stage chips, RAG dots |
| `assets/css/initiative.css` | ~360 | ✅ S23: .init-modal-grid → minmax(0,1fr) minmax(0,1fr) |
| `assets/css/auth.css` | ~150 | ✅ S23: +body[data-role="User"] .lead-only { display:none !important } |
| `assets/js/auth.js` | ~265 | ✅ S23: +canImport() → Admin || Teamlead |
| `assets/js/crud.js` | ~295 | ✅ S38: `_editOrigTask` snapshot + `_hasTaskChanged()` + conflict check in `handleSubmit` (readFromHandle before save, VERSION_CONFLICT dialog); S31: deleteTask adds to deletedIds; S29: atomic GAS writes |
| `assets/js/views/tasks.js` | ~400 | ✅ S43: renderFilterChips uses t()+tState(); renderTaskTable count/empty use t(); _populateFilterPic "Tất cả"→t('common.all'); S32: sortBy() clears selectedIds; S31: onFilterChange clears; S24: PA1; S23: +_populateFilterPic |
| `assets/js/i18n.js` | ~595 | ✅ S51: +6 kp.*/oa.* keys (Phase 8 — KPI Overview + Owner Analysis); S50: +74 gantt.*/ai.*/branch.*/um.* keys; S49: +52 it.* keys; S43: STATE_KEY+tState(); S39: Phase 1 |
| `assets/js/helpers.js` | ~80 | ✅ S43: stateChip() uses tState() for language-aware label |
| `assets/js/views/case-pipeline.js` | ~740 | ✅ S24: +openCaseViewPopup(), closeCaseViewPopup(), cpViewOpenEdit(), _cpViewId; cpOpenDetail() → openCaseViewPopup(); S23: DVKD col+filter, PIC cascade |
| `assets/js/views/performance.js` | ~85 | ✅ S24: +openPerfTaskPopup(key) — click row → detailOverlay với tasks lọc theo perfTab |
| `assets/js/views/initiative-tracker.js` | ~920 | ✅ S56: 3 date field → `<input type="date">`; giữ storage `DD-MMM-YY` qua `_initToISO`/`_initFromISO`; Add default Start = hôm nay ISO; S55: stat bar → `.cp-stat-card`, tách Done, summary popup; S49: ~52 VI → t(); S27: ms auto-gen ID; S25: view popups |
| `assets/js/api.js` | ~390 | ✅ S31: `syncAction` merge skips `db.deletedIds`; `readFromHandle` prunes stale deletedIds; S30: atomic helpers; S24: PA2 _resolvePickerCase |
| `assets/js/parsers.js` | ~325 | ✅ S24: +_resolvePickerCase() — map picRes/picAcc → canonical Username từ _appUsers; gọi cuối _parseArrayIntoDb() |
| `assets/js/ui/navigation.js` | ~120 | ✅ S31: `navigateTo('tasks')` now calls `selectedIds.clear()` before render; removed 7 duplicate filter listeners from `setupListeners`; S24: +closeCaseViewPopup() in Escape handler |
| `assets/js/crud.js` | ~280 | ✅ S31: `deleteTask()` adds id to `db.deletedIds`; `handleSubmit()` splices from `db.deletedIds` on re-add; S29: atomic GAS writes; S21: User_Master dropdowns |
| `assets/js/bulk.js` | ~62 | ✅ S31: `bulkDelete()` pushes ids to `db.deletedIds`; S30: atomic per-row writes; NO syncAction |
| `assets/js/views/bld-queue.js` | ~390 | ✅ S29: task BLD approval → `await syncAction()`; Case BLD still syncCaseAction |
| `assets/js/storage.js` | ~30 | ✅ S31: `loadDb()` now loads `db.deletedIds` from localStorage if present |
| `assets/js/app.js` | ~365 | ✅ S51: renderAll() +2 guards (kpi-overview/owner-analysis); S50: +4 guards (gantt/ai-chat/branch-analysis/user-management); S31: handleImport skips deletedIds |
| `assets/js/views/quickview.js` | ~480 | ✅ S48: t()-shadowing fix (map t→tk in 4 callbacks); renderQuickView() calls _qvPopulateFilters()+_qvUpdateTime() for live lang switch |
| `assets/js/views/executive-summary.js` | ~310 | ✅ S48: 6 t() calls wired (chart empty, attention empty, cfg labels, more-link, init table empty, status tags via t('es.risk.*')) |
| `verify_i18n_p5.mjs` | ~194 | ✅ S48: NEW — 24/24 PASS; covers QV filter/subtitle/labels, ES attention/init-table, EN/VI switch |
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
| **🔔 Notification bell** | ✅ | S57: nhắc sắp/quá hạn + tạo + đóng cho 5 entity; deep-link popup; email digest 1/ngày; read-state per-user (sheet `Notifications`); trigger `notifScan()` ~8h + real-time `notifOnWrite()`. 21/21 tests. **GAS deployed + trigger bật + smoke test production OK (2026-08-02)** |
| **i18n Phase 8 — KPI Overview + Owner Analysis** | ✅ | S51: +6 keys (kp.btn.*, kp.section.*, oa.tab.ranking); toolbar buttons + section headers + ranking tab; domain KPI data intentionally kept; 13/13 + 20/20 regression |
| **i18n Phase 7 — Gantt, AI Chat, Branch, UM** | ✅ | S50: +74 keys; gantt subtitle/empty; ai-chat header/suggestions (_getAiSuggestions() fn); branch zones/stats/cols; UM ~45 strings + _umUsers cache skip + _umRestoreFilterUi(); 35/35 + 19/19 regression |
| **i18n Phase 6 — Initiative Tracker** | ✅ | S49: all ~52 IT hard-coded VI strings → t(); dashboard 'Dự án: ' fix; app.js filterInit/filterTuanBC; 27/27 PASS + 18/18 regression |
| **i18n Phase 5 — Quick View + Executive Summary** | ✅ | S48: QV filter/subtitle/labels + ES attention/init-table/status-tags bilingual; t()-shadowing fix (map t→tk); renderQuickView() live lang switch; 24/24 PASS + 17/17 regression |
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
| Initiative Tracker | ✅ | S56: date field → native date picker (giữ storage `DD-MMM-YY`), Start default hôm nay; S55: tách Done, stat cards `.cp-stat-card`, summary popup; S14 milestone drill-down; S20: syncInitiativeAction() |
| **Action Plan v2** | ✅ | S34: role-aware default (Admin=all teams grouped accordion; User/TL=own team kanban); mixed Tasks+Cases kanban; Blocked/overdue auto-add; Initiatives section; 24/24 tests pass |
| **Audit history tab** | ✅ | S33: Task/Initiative/Case view popups — History tab, lazy load from GAS audit-read; startDate defaults today on Add |
| **AI Assistant** | ✅ | S60: model `gemini-flash-latest`; chỉ mục toàn bộ task (fix "chỉ 300 task") + số liệu deterministic + render bảng Markdown; retry 404/5xx. **GAS deployed, GEMINI_API_KEY (key cơ quan) live.** ⚠️ chưa có test tự động (TD-TEST-03) |
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
| `GS_SHEET_ID` | `1t4tkaw4K6u3fQiAxkavWXAZAlwiYqht1OQjkWw8Zq4g` (S59 — Sheet copy tài khoản cơ quan; ID cũ `1cpg1p_8…56Hk` giữ để rollback) |
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
