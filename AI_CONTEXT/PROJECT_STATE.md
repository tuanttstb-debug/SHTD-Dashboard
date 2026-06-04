# PROJECT STATE
**As of**: 2026-06-04 (Phase E done, Phase F planned — awaiting PO decisions)
**Version in index.html**: v6.2 (patches applied)

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | 736 | ✅ HTML-only shell — all CSS/JS external |
| `GAS.GS` | 535 | ✅ Archived — all patches merged into index.html |
| `assets/css/` | 9 files | ✅ Phase B1 complete — fully extracted |
| `assets/js/` | 17 modules | ✅ Phase B2 complete — fully extracted |
| `backend/` | — | ✅ Folder exists — waiting for Code.gs |
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

**GAS.GS is now fully superseded.** All its patches are in `assets/js/` modules.

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
| Gantt / Timeline | ✅ | Subtitle dynamic year fixed (A4). Poor mobile UX — skipped (Phase D) |
| Auto weekly report | ✅ **Phase E** | 4-sheet Excel: Tóm tắt, Kết quả, Kế hoạch, Vướng mắc. Toolbar button + week picker modal |
| KPI Digital views | ⏳ **Phase F** | Plan done — 6 views: KPI Overview, KPI Progress, Action Plan, Owner, Branch, RM. Awaiting PO on 3 questions (see TODO_NEXT) |
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
ACHIEVED (Phase B complete)
────────────────────────────
index.html (736 lines — HTML only)
assets/
  css/  tokens.css, base.css, layout.css, components.css,
        forms.css, table.css, gantt.css, quickview.css, responsive.css
  js/   constants.js, helpers.js, storage.js, parsers.js, api.js
        ui/toast.js, ui/modal.js, ui/theme.js, ui/navigation.js
        crud.js, bulk.js
        views/dashboard.js, views/tasks.js, views/gantt.js,
        views/performance.js, views/quickview.js
        app.js
backend/ (empty — waiting for Code.gs from PO)
```

Phase B fully complete. Verified 25/25 Playwright tests — 0 failures.

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
| ~~PERF-01~~ | ~~Render slowness with 200–500 tasks~~ | ✅ Resolved — single-pass dashboard + debounce filter (`7b895a2`) |
| MOB-01 | Filter bar cramped on mobile | 🟡 Phase D |
| MOB-02 | Toolbar button overflow on mobile | 🟡 Phase D |
| MOB-03 | Gantt unusable on mobile (280px label column) | 🟢 Phase D |
| DEBT-01 | GAS backend not in repo | 🟡 A2 — blocked on PO |
| ~~DEBT-02~~ | ~~Stale comment ("dd/mm/yyyy")~~ | ✅ Resolved — comment never existed in extracted parsers.js |
| DEBT-03 | `extractWorkbook` parseDate doesn't handle "dd-mmm-yy" import | ⚪ Edge case — only matters if user re-imports an exported file |
| ~~DEBT-04~~ | ~~Gantt subtitle hardcoded "2025–2026"~~ | ✅ Resolved — dynamic year via `renderGantt()` (`83ea790`) |
| DEBT-05 | `fmtExportDate` duplicated in `app.js:exportExcel` vs `helpers.js:fmtDateExport` | ⚪ Cosmetic — consolidate later |
| DEBT-06 | Inline `onchange/oninput` in `index.html` + `navigation.js` addEventListener both fire on same filter elements | ⚪ Share `debounceTimer`, no double render — cleanup when convenient |

---

## Deployment

- **Platform**: GitHub Pages (static)
- **Serve method**: `index.html` + `assets/` folder (Phase B complete)
- **CDN deps**: Chart.js, SheetJS xlsx 0.18.5, Font Awesome 6.4.0, DM Sans/Mono
- **No build step** — direct file edit → commit → deploy
