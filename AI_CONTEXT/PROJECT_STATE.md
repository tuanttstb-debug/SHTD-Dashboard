# PROJECT STATE
**As of**: 2026-06-08 (Session 9 — Phase 0 security + Phase 1 complete)
**Version in index.html**: v6.2 (patches applied)
**Local HEAD**: `5b165e2`
**Remote HEAD**: `5b165e2` (in sync)

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~791 | ✅ HTML-only shell — all CSS/JS external |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/Code.gs` | ~115 | ✅ Router — RBAC gates, change-password, serverTs on read, clientTs on write, auditLog hooks |
| `backend/Config.gs` | 6 | ✅ `SPREADSHEET_ID`, `SHEET_NAME`, `DATA_RANGE` |
| `backend/AuthService.gs` | ~165 | ✅ authLogin(), validateToken(), changePassword(), setupInitialUsers(); no hardcoded fallback |
| `backend/SheetService.gs` | ~65 | ✅ sheetRead() returns {values,serverTs}; sheetWrite() VERSION_CONFLICT check via Script Properties |
| `backend/AuditService.gs` | 32 | ✅ NEW (Session 9) — auditLog() appends to Audit_Log sheet |
| `backend/KpiSheetService.gs` | 51 | ✅ KPI Summary GAS backend — deployed + tested |
| `backend/InitiativeService.gs` | 60 | ✅ `initiativeRead()` / `initiativeWrite()` for Initiative_Master |
| `assets/js/config.js` | 5 | ✅ NEW (Session 9) — GS_WEBAPP_URL deployment variable; update on every GAS redeploy |
| `assets/css/` | 12 files | ✅ + `initiative.css` + `auth.css` (now includes admin-only RBAC rule) |
| `assets/js/` | 29 modules | ✅ + `initiatives.js`, `views/initiative-tracker.js`, `auth.js`, `config.js` |
| `assets/js/kpi-parser.js` | 164 | ✅ xlsx parse + GG Sheet sync for KPI data |
| `assets/js/initiatives.js` | ~120 | ✅ INI_COLS, parser, CRUD sync functions |

---

## Feature Status

| Feature | Works? | Notes |
|---|---|---|
| Dashboard KPIs | ✅ | Tuần BC filter included |
| RAG doughnut chart | ✅ | Click → detail modal |
| Initiative summary table | ✅ | Click → detail modal |
| Team stats + Blocked list | ✅ | |
| Task list + 7 filters | ✅ | Debounced, filter chips |
| Multi-sort | ✅ | |
| Pagination (20/page) | ✅ | |
| Bulk actions (RAG, state, delete) | ✅ | |
| Task CRUD modal | ✅ | |
| Duplicate ID protection (local + server) | ✅ | v6.2 — ADD vs EDIT distinction |
| Gantt / Timeline | ✅ | Dynamic year subtitle |
| Auto weekly report | ✅ | 4-sheet Excel: Tóm tắt, Kết quả, Kế hoạch, Vướng mắc |
| **KPI Overview** | ✅ | Browser verified session 7 — 0 JS errors |
| **KPI Progress** | ✅ | Browser verified session 7 — 0 JS errors |
| **Owner Analysis** | ✅ | Browser verified session 7 — 3 tabs, 0 JS errors |
| **KPI Dynamic Pipeline** | ✅ | Load `File raw.xlsx` → parse → update KPI views live; sync to/from GG Sheet `KPI_Summary` tab |
| **Initiative Tracker** | ✅ | Accordion cards, CRUD modal, cascade delete, filter; milestone short labels (M1…); Vietnamese status dots; GAS sync 15-col schema; Type col separates initiative/milestone; backward compat |
| **Milestone→Task link** | ✅ | Task form `#fMs` auto-populates from Initiative_Master milestones; fallback to M1-M8 |
| **Action Plan Kanban** | ✅ | 4 columns; reads db.tasks where highlight=Y |
| **Branch Analysis** | ✅ | 25 branches; zone filter; rate vs KPI color coding |
| **RM Analysis** | ✅ | 14 RMs sorted by digital rate; top-3 highlighted; KPI threshold 15% |
| Performance view (3 tabs) | ✅ | |
| Quick View Panel (Q / FAB) | ✅ | FAB ⚡ bottom-right; topbar btn hidden on mobile |
| Google Sheets sync — Tasks | ✅ | Read-Then-Patch v6.1 |
| Google Sheets sync — KPI | ✅ | `kpi-write` / `kpi-read` via `KpiSheetService.gs` (deployed + tested) |
| Excel import | ✅ | Flexible column mapping |
| Excel export | ✅ | Date "22-Apr-26", progress "75%" |
| Dark mode | ✅ | |
| **Login / Auth** | ✅ | Login screen overlay; HMAC-SHA256 token 24h; User_Master GG Sheet; gasPost() auto-injects token |
| **Role-based UI** | ✅ | Admin sees delete buttons; User role hides bulk-delete + modal delete via CSS .admin-only |
| **Audit Trail** | ✅ | Audit_Log sheet tab; every write (task/kpi/initiative/password) logged with user + timestamp |
| **Change Password** | ✅ | User-pill dropdown → modal; 6-char min; GAS validates old password before writing new hash |
| **Optimistic Locking** | ✅ | VERSION_CONFLICT on concurrent task writes; client re-reads from server on conflict |
| Mobile sidebar | ✅ | Slide-in overlay; hamburger always visible (fixed session 7) |
| Mobile layout (general) | ⚠️ | Topbar hamburger fixed. Filter bar/toolbar/Gantt still in backlog (Phase D) |
| Keyboard shortcuts | ✅ | Ctrl+N, Ctrl+D, Ctrl+B, G+x, Q, G+K (KPI Overview) |
| localStorage cache | ✅ | Key: `shtd_v2` — unchanged |

---

## Architecture State

```
CURRENT (Phase 0 security + Phase 1 complete — Session 9)
──────────────────────────────────────────────────────────
index.html (~793 lines — HTML only)
assets/
  css/  tokens.css, base.css, layout.css, components.css,
        forms.css, table.css, gantt.css, quickview.css,
        responsive.css, kpi.css, initiative.css, auth.css
  js/   config.js          ← GS_WEBAPP_URL (update on each GAS redeploy)
        constants.js, helpers.js (+ esc()/_esc alias), storage.js, parsers.js
        api.js (+ serverTs/clientTs optimistic locking)
        auth.js (+ applyUserToUI data-role, changePw modal)
        ui/toast.js, ui/modal.js, ui/theme.js, ui/navigation.js
        crud.js, bulk.js
        views/dashboard.js, views/tasks.js, views/gantt.js,
              views/performance.js, views/quickview.js
        report.js
        kpi-data.js
        kpi-parser.js
        views/kpi-overview.js
        views/action-plan.js
        views/kpi-progress.js
        views/owner-analysis.js
        views/branch-analysis.js
        views/rm-analysis.js
        views/initiative-tracker.js (uses global esc(), not local _esc)
        initiatives.js
        app.js
backend/
  Code.gs            ← RBAC gates + audit hooks + serverTs + change-password
  Config.gs
  AuthService.gs     ← no hardcoded fallback; changePassword() added
  SheetService.gs    ← optimistic locking (TASK_WRITE_TS Script Property)
  AuditService.gs    ← NEW Session 9 — Audit_Log sheet
  KpiSheetService.gs ← DEPLOYED + tested
  InitiativeService.gs ← DEPLOYED (15 cols)
  GAS.GS             ← archived patch v6.2
verify_initiative_v2.mjs ← 37/37 PASS Playwright suite
verify_kpi_views.mjs     ← 3/3 PASS (session 7)
verify_mobile.mjs        ← 4/4 PASS (session 7)
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | **In `assets/js/config.js`** (moved from constants.js Session 9); current: `AKfycbyld2038CH86TP-...` |
| Initiative backend | ✅ Deployed (15 cols, InitiativeService.gs) — Sync button should work |
| `GS_SHEET_ID` | `1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk` |
| `GS_RANGE` | `Task_Master!A1:W` |
| `KPI_RANGE` | `KPI_Summary` tab (new — for KPI pipeline sync) |
| Task backend | ✅ Deployed — URL updated |
| KPI backend | ✅ Deployed + tested (`backend/KpiSheetService.gs`) |
| Sheet columns | 23 — `DB_COLS` constant unchanged |
| localStorage key | `shtd_v2` — schema unchanged |

---

## Known Issues (Active)

| ID | Issue | Priority |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | 🟡 Phase D |
| MOB-02 | Toolbar button overflow on mobile | 🟡 Phase D |
| MOB-03 | Gantt unusable on mobile | 🟢 Phase D |
| DEBT-03 | `extractWorkbook` parseDate doesn't handle "dd-mmm-yy" import | ⚪ Edge case |
| DEBT-05 | `fmtExportDate` duplicated in `app.js` vs `helpers.js` | ⚪ Cosmetic |
| DEBT-06 | Inline `onchange` + `addEventListener` double handlers on filter elements | ⚪ No double render — cleanup later |

---

## Deployment

- **Platform**: GitHub Pages (static)
- **Serve method**: `index.html` + `assets/` folder
- **CDN deps**: Chart.js, SheetJS xlsx 0.18.5, Font Awesome 6.4.0, DM Sans/Mono
- **No build step** — direct file edit → commit → push → deploy
