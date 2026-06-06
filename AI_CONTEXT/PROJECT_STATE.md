# PROJECT STATE
**As of**: 2026-06-06 (Session 7 — final, all blockers cleared)
**Version in index.html**: v6.2 (patches applied)
**Local HEAD**: `768c722`
**Remote HEAD**: `768c722` (in sync)

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~791 | ✅ HTML-only shell — all CSS/JS external |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/Code.gs` | 76 | ✅ `doPost()` router — task + KPI routes |
| `backend/Config.gs` | 6 | ✅ `SPREADSHEET_ID`, `SHEET_NAME`, `DATA_RANGE` |
| `backend/SheetService.gs` | 48 | ✅ `sheetRead()` / `sheetWrite()` for Task_Master |
| `backend/KpiSheetService.gs` | 51 | ✅ KPI Summary GAS backend — **not yet deployed to Apps Script** |
| `backend/InitiativeService.gs` | 60 | ✅ `initiativeRead()` / `initiativeWrite()` for Initiative_Master |
| `assets/css/` | 11 files | ✅ + `initiative.css` |
| `assets/js/` | 27 modules | ✅ + `initiatives.js`, `views/initiative-tracker.js` |
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
| Mobile sidebar | ✅ | Slide-in overlay; hamburger always visible (fixed session 7) |
| Mobile layout (general) | ⚠️ | Topbar hamburger fixed. Filter bar/toolbar/Gantt still in backlog (Phase D) |
| Keyboard shortcuts | ✅ | Ctrl+N, Ctrl+D, Ctrl+B, G+x, Q, G+K (KPI Overview) |
| localStorage cache | ✅ | Key: `shtd_v2` — unchanged |

---

## Architecture State

```
CURRENT (Phase B + E + F + KPI pipeline complete)
────────────────────────────────────────────────
index.html (~791 lines — HTML only)
assets/
  css/  tokens.css, base.css, layout.css, components.css,
        forms.css, table.css, gantt.css, quickview.css,
        responsive.css, kpi.css, initiative.css
  js/   constants.js, helpers.js, storage.js, parsers.js, api.js
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
        views/initiative-tracker.js
        initiatives.js
        app.js
backend/
  Code.gs            ← task + KPI routes
  Config.gs
  SheetService.gs
  KpiSheetService.gs ← DEPLOYED + tested
  InitiativeService.gs ← DEPLOYED (15 cols)
  GAS.GS             ← archived patch v6.2
verify_initiative_v2.mjs ← 37/37 PASS Playwright suite
verify_kpi_views.mjs     ← NEW session 7 — 3/3 PASS
verify_mobile.mjs        ← NEW session 7 — 4/4 PASS (mobile topbar)
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | Updated — new GAS deployment (commit `b88b448`); Initiative + KPI routes active |
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
