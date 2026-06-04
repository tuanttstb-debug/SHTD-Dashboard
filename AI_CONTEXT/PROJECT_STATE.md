# PROJECT STATE
**As of**: 2026-06-04 (Phase A2 + KPI merge complete)
**Version in index.html**: v6.2 (patches applied)
**HEAD**: `f7e8ddd`

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~790 | ✅ HTML-only shell — all CSS/JS external |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/Code.gs` | 64 | ✅ **NEW A2** — deployable GAS doPost() router |
| `backend/Config.gs` | 6 | ✅ **NEW A2** — SPREADSHEET_ID, SHEET_NAME |
| `backend/SheetService.gs` | 48 | ✅ **NEW A2** — sheetRead() / sheetWrite() |
| `assets/css/` | 10 files | ✅ Phase B1 + F0 + KPI merge complete |
| `assets/js/` | 24 modules | ✅ Phase B2 + E + F + KPI merge complete |

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
| Gantt / Timeline | ✅ | Subtitle dynamic year fixed (A4) |
| Auto weekly report | ✅ | 4-sheet Excel: Tóm tắt, Kết quả, Kế hoạch, Vướng mắc |
| **KPI Overview** | ✅ **KPI merge** | 6 header cards, exec insight panel, 4 charts (channel/KPI/PTKD), 4 auto alerts |
| **Action Plan Kanban** | ✅ **Phase F** | 4 columns; reads db.tasks where highlight=Y |
| **KPI Progress** | ✅ **KPI merge** | KPI 2.1/2.2 meter cards + PTKD table QuangNN3 + digital rate chart + DungLQ1 table |
| **Owner Analysis** | ✅ **KPI merge** | 3 tabs: QuangNN3 / DungLQ1 / Rankings; PTKD card grid; adoption alerts |
| **Branch Analysis** | ✅ **Phase F** | 25 branches; zone filter (Bắc/Nam/Trung); rate vs KPI color coding |
| **RM Analysis** | ✅ **Phase F** | 14 RMs sorted by digital rate; top-3 highlighted; KPI threshold 15% |
| Performance view (3 tabs) | ✅ | |
| Quick View Panel (Q / FAB) | ✅ | |
| Google Sheets sync (read + write) | ✅ | Read-Then-Patch v6.1 |
| Excel import | ✅ | Flexible column mapping |
| Excel export | ✅ | Date "22-Apr-26", progress "75%" |
| Dark mode | ✅ | |
| Mobile sidebar | ✅ | Slide-in overlay |
| Mobile layout (general) | ⚠️ | Known issues in backlog (Phase D — deferred) |
| Keyboard shortcuts | ✅ | Ctrl+N, Ctrl+D, Ctrl+B, G+x, Q, G+K (KPI Overview) |
| localStorage cache | ✅ | Key: `shtd_v2` — unchanged |

---

## Architecture State

```
ACHIEVED (Phase B + E + F complete)
────────────────────────────────────
index.html (~790 lines — HTML only)
assets/
  css/  tokens.css, base.css, layout.css, components.css,
        forms.css, table.css, gantt.css, quickview.css,
        responsive.css, kpi.css              ← Phase F
  js/   constants.js, helpers.js, storage.js, parsers.js, api.js
        ui/toast.js, ui/modal.js, ui/theme.js, ui/navigation.js
        crud.js, bulk.js
        views/dashboard.js, views/tasks.js, views/gantt.js,
              views/performance.js, views/quickview.js
        report.js                             ← Phase E
        kpi-data.js                           ← Phase F
        views/kpi-overview.js                 ← Phase F
        views/action-plan.js                  ← Phase F
        views/kpi-progress.js                 ← Phase F
        views/owner-analysis.js               ← Phase F
        views/branch-analysis.js              ← Phase F
        views/rm-analysis.js                  ← Phase F
        app.js
backend/
  Code.gs           ← A2 (new — needs Apps Script deploy)
  Config.gs         ← A2
  SheetService.gs   ← A2
  GAS.GS            ← archived patch v6.2
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | `https://script.google.com/macros/s/AKfycbz.../exec` |
| `GS_SHEET_ID` | `1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk` |
| `GS_RANGE` | `Task_Master!A1:W` |
| Backend source | ✅ In repo (`backend/Code.gs` etc.) — **not yet deployed to Apps Script** |
| Sheet columns | 23 — `DB_COLS` constant unchanged |
| localStorage key | `shtd_v2` — schema unchanged |

---

## Known Issues (Active)

| ID | Issue | Priority |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | 🟡 Phase D |
| MOB-02 | Toolbar button overflow on mobile | 🟡 Phase D |
| MOB-03 | Gantt unusable on mobile | 🟢 Phase D |
| DEBT-01 | GAS backend not DEPLOYED (in repo ✅, needs Apps Script deploy + URL update) | 🟡 Action on PO |
| DEBT-03 | `extractWorkbook` parseDate doesn't handle "dd-mmm-yy" import | ⚪ Edge case |
| DEBT-05 | `fmtExportDate` duplicated in `app.js` vs `helpers.js` | ⚪ Cosmetic |
| DEBT-06 | Inline `onchange` + `addEventListener` double handlers on filter elements | ⚪ No double render — cleanup later |

---

## Deployment

- **Platform**: GitHub Pages (static)
- **Serve method**: `index.html` + `assets/` folder
- **CDN deps**: Chart.js, SheetJS xlsx 0.18.5, Font Awesome 6.4.0, DM Sans/Mono
- **No build step** — direct file edit → commit → push → deploy
