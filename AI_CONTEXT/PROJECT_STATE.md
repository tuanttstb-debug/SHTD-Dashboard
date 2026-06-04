# PROJECT STATE
**As of**: 2026-06-04 (Phase F complete — all KPI Digital views live)
**Version in index.html**: v6.2 (patches applied)

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~790 | ✅ HTML-only shell — all CSS/JS external |
| `GAS.GS` | 535 | ✅ Archived — all patches merged into index.html |
| `assets/css/` | 10 files | ✅ Phase B1 + F0 complete |
| `assets/js/` | 24 modules | ✅ Phase B2 + E + F complete |
| `backend/` | — | ✅ Folder exists — waiting for Code.gs |
| `/backend/Code.gs` | — | ❌ Does not exist yet — GAS backend not in repo |

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
| **KPI Overview** | ✅ **Phase F** | Bullet charts for 2 KPIs, BL/GN/IDNES summary tiles, monthly trend chart |
| **Action Plan Kanban** | ✅ **Phase F** | 4 columns; reads db.tasks where highlight=Y |
| **KPI Progress** | ✅ **Phase F** | Product YTD table + monthly digital rate line chart |
| **Owner Analysis** | ✅ **Phase F** | QuangNN3 (BL) / DungLQ1 (GN) panels + monthly bar chart |
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
backend/ (empty — waiting for Code.gs from PO)
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | `https://script.google.com/macros/s/AKfycbz.../exec` |
| `GS_SHEET_ID` | `1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk` |
| `GS_RANGE` | `Task_Master!A1:W` |
| Backend source | **NOT in repo** — on Apps Script Editor only |
| Sheet columns | 23 — `DB_COLS` constant unchanged |
| localStorage key | `shtd_v2` — schema unchanged |

---

## Known Issues (Active)

| ID | Issue | Priority |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | 🟡 Phase D |
| MOB-02 | Toolbar button overflow on mobile | 🟡 Phase D |
| MOB-03 | Gantt unusable on mobile | 🟢 Phase D |
| DEBT-01 | GAS backend not in repo | 🟡 A2 — blocked on PO |
| DEBT-03 | `extractWorkbook` parseDate doesn't handle "dd-mmm-yy" import | ⚪ Edge case |
| DEBT-05 | `fmtExportDate` duplicated in `app.js` vs `helpers.js` | ⚪ Cosmetic |
| DEBT-06 | Inline `onchange` + `addEventListener` double handlers on filter elements | ⚪ No double render — cleanup later |

---

## Deployment

- **Platform**: GitHub Pages (static)
- **Serve method**: `index.html` + `assets/` folder
- **CDN deps**: Chart.js, SheetJS xlsx 0.18.5, Font Awesome 6.4.0, DM Sans/Mono
- **No build step** — direct file edit → commit → push → deploy
