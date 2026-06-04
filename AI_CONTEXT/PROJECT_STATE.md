# PROJECT STATE
**As of**: 2026-06-03 end-of-session  
**Version in Main.html**: v6.2 (patches applied)

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `Main.html` | 4109 | ✅ v6.2 patches applied, orphaned HTML removed |
| `GAS.GS` | 535 | ⚠️ Historical patch file — all patches now in Main.html. Safe to archive. |
| `/backend/Code.gs` | — | ❌ Does not exist yet — GAS backend not in repo |

---

## Patch Merge Status (GAS.GS → Main.html)

| Patch | Function | Status | Line in Main.html |
|---|---|---|---|
| v6.1 FIX 1 | `syncAction()` | ✅ Merged (before this session) | 2431 |
| v6.1 FIX 2 | FAB CSS `bottom:80px` | ✅ Merged (before this session) | ~676 |
| v6.2 FIX 3 | `handleSubmit()` + `_showDuplicateIdBlocker()` | ✅ Merged (before this session) | 3372 |
| v6.2 FIX 4 | `fmtDateExport()` + date format in `taskToRow()` | ✅ **Merged this session** | 2235 / 2274 |
| v6.2 FIX 5 | Progress "75%" in `taskToRow()` | ✅ **Merged this session** | 2276 |
| v6.2 bonus | `checkDupId()` ADD vs EDIT messages | ✅ **Merged this session** | 2181 |
| Extra bonus | dd-mmm-yy parse in `_parseArrayIntoDb` | ✅ **Added this session** | 2341 |

**GAS.GS is now fully superseded.** All its patches are in Main.html.

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
| Gantt / Timeline | ✅ | Poor mobile UX — in backlog |
| Performance view (3 tabs) | ✅ | |
| Quick View Panel (Q / FAB) | ✅ | |
| Quick View **topbar button** | ✅ **Fixed this session** | Was orphaned in CSS, now in body |
| `#qvDot` badge | ✅ **Fixed this session** | Now in correct DOM position |
| Google Sheets sync (read + write) | ✅ | Read-Then-Patch v6.1 |
| Excel import | ✅ | Flexible column mapping |
| Excel export — date format | ✅ **Fixed this session** | Now "22-Apr-26" |
| Excel export — progress format | ✅ **Fixed this session** | Now "75%" string |
| Dark mode | ✅ | |
| Mobile sidebar | ✅ | Slide-in overlay |
| Mobile layout (general) | ⚠️ | Known issues in backlog |
| Keyboard shortcuts | ✅ | Ctrl+N, Ctrl+D, Ctrl+B, G+x, Q |
| localStorage cache | ✅ | Key: `shtd_v2` — unchanged |

---

## Architecture State

```
CURRENT (monolith)                    TARGET (Phase B)
──────────────────                    ────────────────
Main.html (4109 lines)                index.html (~200 lines)
  ├── <style> ~1050 lines      →      assets/css/ (9 files)
  ├── <body>  ~600 lines              assets/js/  (18 modules)
  └── <script> ~2460 lines           backend/Code.gs
```

Phase B not started. No structural changes made.

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
| PERF-01 | Render slowness with 200–500 tasks | 🟡 Phase C |
| MOB-01 | Filter bar cramped on mobile | 🟡 Phase D |
| MOB-02 | Toolbar button overflow on mobile | 🟡 Phase D |
| MOB-03 | Gantt unusable on mobile (280px label column) | 🟢 Phase D |
| DEBT-01 | GAS backend not in repo | 🟡 A2 |
| DEBT-02 | Stale comment line 2702 ("dd/mm/yyyy" is now "dd-mmm-yy") | ⚪ Cosmetic |
| DEBT-03 | `extractWorkbook` parseDate doesn't handle "dd-mmm-yy" import | ⚪ Edge case — only matters if user re-imports an exported file |

---

## Deployment

- **Platform**: GitHub Pages (static)
- **Serve method**: Single HTML file (until Phase B complete)
- **CDN deps**: Chart.js, SheetJS xlsx 0.18.5, Font Awesome 6.4.0, DM Sans/Mono
- **No build step** — direct file edit → commit → deploy
