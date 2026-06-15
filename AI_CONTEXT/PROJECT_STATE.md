# PROJECT STATE
**As of**: 2026-06-15 (Session 19 — Case Pipeline full implementation)
**Version in index.html**: v6.2
**Remote HEAD (master)**: `090b94a` — S18 (chưa push S19, đang chờ PO)
**Remote HEAD (main)**: `1c57999` — PR #20 merged (S17 bugfix); ⏳ chờ PR S18+S19
**⚠️ Schema drift**: `master` Task_Master ghi 24 cột, `main` ghi 23 cột — merge sớm (SCHEMA-01)

---

## Branch Strategy (NGUYÊN TẮC BẮT BUỘC)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `master` | Testing — ⚠️ Netlify hết credit → dùng local Playwright | Developer / AI |
| `main` | Production — GitHub Pages | **PO only** |
| `fix/*` | Bugfix branches → PR → main (PO tạo PR) | AI / Developer |

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~1150 | ✅ S19: CSS link + nav item + view section + CRUD modal Case Pipeline |
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
| `backend/CasePipelineService.gs` | ~65 | ✅ NEW S19 — **chưa deploy GAS**, chờ PO |
| `assets/js/constants.js` | ~60 | ✅ S19: CASE_STAGES, CASE_COLS, CASE_LOAI_HINH, CASE_COMPLEXITY, dbCases |
| `assets/js/config.js` | 5 | ✅ GS_WEBAPP_URL |
| `assets/css/case-pipeline.css` | ~260 | ✅ NEW S19 |
| `assets/js/views/case-pipeline.js` | ~310 | ✅ NEW S19 — Kanban, CRUD, Excel |
| `assets/js/api.js` | ~280 | ✅ S19: Case API (caseToRow, rowToCase, genCaseId, syncCaseAction...) |
| `assets/js/ui/navigation.js` | ~120 | ✅ S19: G+C shortcut, case-pipeline title, renderCasePipeline dispatch |
| `assets/js/app.js` | ~320 | ✅ S19: loadCasesFromCache, readCases, navBadgeCase, dbCases reset |
| `assets/js/views/bld-queue.js` | ~380 | ✅ S19: case card [CASE], _bldGetPendingCases, multi-source approve/reject |
| `assets/js/views/bld-queue.js` | ~380 | ✅ S18: btn-success fix, BUG-04 disable reset, yKienBLD |

---

## Feature Status

| Feature | Works? | Notes |
|---|---|---|
| **Case Pipeline (Kanban)** | ✅ | NEW S19 — 14-col Kanban, summary cards, filter, G+C shortcut; **GAS deploy pending** |
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
| Initiative Tracker | ✅ | S14 milestone drill-down |
| **AI Assistant** | ⚠️ | Frontend complete; GAS AiService.gs deploy + GEMINI_API_KEY unconfirmed |
| User Management | ✅ | Admin-only; S13 |
| Login / Auth | ✅ | S11+S18 verified |
| Optimistic Locking | ✅ | Task_Master; Case_Pipeline không cần (simple write-all) |
| Dark mode | ✅ | |

---

## Architecture State

```
CURRENT (Session 19 — Case Pipeline)
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
        views/case-pipeline.js ← NEW S19 (310 lines)
        app.js               ← S19: loadCasesFromCache, readCases, navBadgeCase
backend/
  Code.gs (+case-pipeline routes), Config.gs, AuthService.gs,
  SheetService.gs, AuditService.gs, KpiSheetService.gs,
  InitiativeService.gs, UserService.gs, AiService.gs, GAS.GS
  CasePipelineService.gs ← NEW S19 (chưa deploy GAS)
verify_case_pipeline.mjs ← NEW S19 — 20/20 PASS
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
| Case Pipeline backend | ⚠️ **Chưa deploy** — Code.gs routes + CasePipelineService.gs cần PO deploy |
| `GS_SHEET_ID` | `1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk` |
| Task sheet | `Task_Master!A1:X` (24 cột) |
| Case sheet | `Case_Pipeline` (20 cột A→T; tự tạo khi chưa có) |

---

## Known Issues (Active)

| ID | Issue | Priority |
|---|---|---|
| SCHEMA-01 | `main` 23 cột vs `master` 24 cột Task_Master → lệch cột X | 🔴 Merge S18+S19 → main sớm |
| GAS-CP | CasePipelineService.gs + Code.gs routes chưa deploy | 🔴 PO deploy GAS |
| TD-033 | `verify_initiative_v2.mjs` fail local (no auth inject) | 🟡 |
| MOB-01/02/03 | Filter bar, toolbar, Gantt trên mobile | 🟡 Phase D |
| DEBT-03/05/06 | Tech debt nhỏ | ⚪ |

---

## Deployment

| Environment | URL | Branch | Status |
|---|---|---|---|
| **Testing (local)** | `http://localhost:3030` | `master` | ✅ Dùng tạm |
| **Testing (Netlify)** | https://test-shtd.netlify.app | `master` | ❌ **Hết credit** |
| **Production** | GitHub Pages URL | `main` | ✅ Live (1c57999 — S17; chưa có S18+S19) |
