# PROJECT STATE
**As of**: 2026-06-15 (Session 21 — Team/PIC User_Master integration + Case Pipeline UI redesign)
**Version in index.html**: v6.2
**Remote HEAD (main)**: `47b9316` — S21 Team/PIC User_Master LIVE
**Schema**: Task_Master 24 cột (SCHEMA-01 đã giải quyết sau khi merge)

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | Developer / AI |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**⚠️ Không dùng `master` nữa kể từ S19.**

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~1220 | ✅ S20: #view-case-pipeline restructure — card wrapper, toolbar+view toggle, preset bar, filter bar, table wrap, board wrap |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/AiService.gs` | ~75 | ⚠️ S12 — model `gemini-2.5-flash` in repo; GAS deploy unconfirmed |
| `backend/Code.gs` | ~170 | ✅ S19: thêm routes `case-pipeline-read`, `case-pipeline-write` |
| `backend/UserService.gs` | ~130 | ✅ NEW S13 — deployed |
| `backend/Config.gs` | 6 | ✅ S18: comment A1:X |
| `backend/AuthService.gs` | ~165 | ✅ deployed |
| `backend/SheetService.gs` | ~65 | ✅ deployed |
| `backend/AuditService.gs` | 32 | ✅ deployed |
| `backend/KpiSheetService.gs` | 51 | ✅ deployed |
| `backend/InitiativeService.gs` | 60 | ✅ deployed |
| `backend/CasePipelineService.gs` | ~65 | ✅ NEW S19 — **deployed GAS** (2026-06-15) |
| `assets/js/constants.js` | ~65 | ✅ S21: +TEAM_LIST (8 teams: BL1/BL2/CV1/CV2/PTKD MB/PTKD MN/QLDM/Số — offline fallback) |
| `assets/js/config.js` | 5 | ✅ GS_WEBAPP_URL |
| `assets/css/case-pipeline.css` | ~370 | ✅ S20: +view toggle, stage chips, RAG dots, row-overdue, sort icons |
| `assets/js/views/case-pipeline.js` | ~630 | ✅ S21: +openCaseModal uses _populateTeamSelect/_populateUserSelect; +onCaseTeamChange() |
| `assets/js/views/initiative-tracker.js` | ~340 | ✅ S21: initFAcc input→select; _initOpenModal() populate via _populateUserSelect (all users, no team filter) |
| `assets/js/api.js` | ~350 | ✅ S21: +_appUsers[], loadAppUsers(), getAppTeams(), getUsersByTeam(), _populateTeamSelect(), _populateUserSelect() — User_Master driven dropdowns with offline fallback |
| `assets/js/initiatives.js` | ~170 | ✅ S20: syncInitiativeAction() (Task Manager gold standard), syncInitiativeAdd/Edit/Delete dùng pattern mới |
| `assets/js/ui/navigation.js` | ~120 | ✅ S19: G+C shortcut, case-pipeline title, renderCasePipeline dispatch |
| `assets/js/app.js` | ~325 | ✅ S21: +loadAppUsers() non-blocking on startup (after autoConnectDB) |
| `assets/js/crud.js` | ~420 | ✅ S21: openTaskModal() uses _populateTeamSelect/_populateUserSelect; +onTaskTeamChange() (re-filter both PICs + autoGenId) |
| `assets/js/views/bld-queue.js` | ~380 | ✅ S18+S19: case card [CASE], _bldGetPendingCases, multi-source approve/reject, yKienBLD |

---

## Feature Status

| Feature | Works? | Notes |
|---|---|---|
| **Case Pipeline (Table + Kanban)** | ✅ | S20: Table-primary (paginated, sortable, 4 preset tabs, filter bar+chips, filter search); Kanban toggle secondary. S19: GAS deployed 2026-06-15 |
| **Task/Case/Initiative Team+PIC dropdowns** | ✅ | S21: Driven by User_Master (GAS user-list); cascaded Team→PIC; offline fallback to TEAM_LIST + currentVal |
| **Case CRUD** | ✅ | Add/Edit/Delete với validation; auto-gen CP-XXX ID; modal |
| **Case Excel Import/Export** | ✅ | 20 cột; import merge by ID; export với column widths |
| **Case BLD Queue integration** | ✅ | Case canBLD=Y → badge [CASE] trong BLD Queue; approve/reject/info lưu yKienBLD |
| **BLD Approval Queue (Tasks)** | ✅ | S16+S17+S18 — **46/46 PASS** (no regression S19) |
| **Ý kiến Ban lãnh đạo (yKienBLD)** | ✅ | S18 — cột 24 Task_Master; S19 — cột 20 Case_Pipeline |
| **Executive Summary** | ✅ | S15 |
| Dashboard KPIs | ✅ | |
| Task list + filters + presets | ✅ | |
| Task CRUD | ✅ | |
| Gantt / Timeline | ✅ | |
| Auto weekly report | ✅ | |
| KPI Overview / Progress / Owner | ✅ | |
| Initiative Tracker | ✅ | S14 milestone drill-down; S20: syncInitiativeAction() — showLoading + syncDot + GAS fallback toast |
| **AI Assistant** | ⚠️ | Frontend complete; GAS AiService.gs deploy + GEMINI_API_KEY unconfirmed |
| User Management | ✅ | Admin-only; S13 |
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
verify_case_pipeline.mjs ← S20 — 22/22 PASS (table-primary, +TEST05b/08b)
verify_bld_queue.mjs     ← 46/46 PASS (no regression)
verify_ms_tasks.mjs      ← 14/14 PASS (no regression)
verify_kpi_views.mjs     ← 3/3 PASS (S7)
um_test.mjs              ← 14/14 PASS (S13)
debug_login.mjs          ← S18 login diagnostics
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | In `assets/js/config.js`; unchanged S19 |
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
| MOB-01/02/03 | Filter bar, toolbar, Gantt trên mobile | 🟡 Phase D |
| DEBT-03/05/06 | Tech debt nhỏ | ⚪ |

---

## Deployment

| Environment | URL | Branch | Status |
|---|---|---|---|
| **Testing (local)** | `http://localhost:3030` | `main` | ✅ Dùng tạm |
| **Testing (Netlify)** | https://test-shtd.netlify.app | — | ❌ **Hết credit** |
| **Production** | GitHub Pages URL | `main` | ✅ Live (`c60e74f` — S19 Case Pipeline + GAS deployed); **S20 local chưa push** |

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
