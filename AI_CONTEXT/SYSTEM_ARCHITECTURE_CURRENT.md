# SYSTEM ARCHITECTURE — CURRENT STATE (v6.2)

> ⚠️ This document describes the **actual current architecture** as of v6.2.
> The file `SYSTEM_ARCHITECTURE.md` describes a **target future architecture** from a different project reference. Do not confuse the two.

---

## File Structure (Reality)

```
SHTD-Dashboard/
├── Main.html          ← 4076 lines — ENTIRE app (HTML + CSS + JS)
├── GAS.GS             ←  535 lines — v6.2 PATCH FILE (not GAS backend!)
└── AI_CONTEXT/
    ├── PROJECT_OVERVIEW.md          ← NEW: actual overview
    ├── BUSINESS_FLOW.md             ← NEW: actual business flow
    ├── SYSTEM_ARCHITECTURE_CURRENT.md ← THIS FILE
    ├── SOURCE_CODE_INVENTORY.md     ← NEW: full inventory
    ├── DESIGN_SYSTEM.md             ← REF: from another project
    ├── SYSTEM_ARCHITECTURE.md       ← REF: target arch (different project)
    ├── THEME_ARCHITECTURE.md        ← REF: from another project
    ├── RESPONSIVE_GUIDE.md          ← REF: from another project
    └── UIUX_SYSTEM.md               ← REF: from another project
```

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────┐
│                    BROWSER (User)                     │
│                                                       │
│  Main.html (single file)                              │
│  ├── <head>                                           │
│  │    ├── CDN: DM Sans + DM Mono (Google Fonts)       │
│  │    ├── CDN: Font Awesome 6.4.0                     │
│  │    ├── CDN: Chart.js                               │
│  │    └── CDN: SheetJS / xlsx 0.18.5                  │
│  ├── <style>  (≈ 1060 lines)                          │
│  │    ├── Design tokens (:root CSS vars)              │
│  │    ├── Dark mode overrides ([data-theme="dark"])   │
│  │    ├── Layout: sidebar, topbar, content            │
│  │    ├── Components: cards, table, modal, toast      │
│  │    ├── Gantt chart styles                          │
│  │    ├── Quick View Panel styles                     │
│  │    └── Responsive @media queries (768px, 480px)   │
│  ├── <body>  (≈ 700 lines)                            │
│  │    ├── Loading overlay                             │
│  │    ├── Toast container                             │
│  │    ├── Sidebar (nav: Dashboard/Tasks/Gantt/Perf)   │
│  │    ├── Main > Topbar + Content + StatusBar         │
│  │    │    ├── view-dashboard section                 │
│  │    │    ├── view-tasks section (table + filters)   │
│  │    │    ├── view-gantt section                     │
│  │    │    └── view-performance section               │
│  │    ├── Task Modal (CRUD form)                      │
│  │    ├── Confirm Modal                               │
│  │    ├── Detail Modal (drill-down lists)             │
│  │    ├── Keyboard Shortcut Modal                     │
│  │    ├── Quick View Panel (side panel)               │
│  │    └── FAB button                                  │
│  ├── <script> block 1  (≈ 1820 lines — main logic)    │
│  │    ├── Global State (let db, sort, etc.)           │
│  │    ├── Constants (GS_WEBAPP_URL, DB_COLS)          │
│  │    ├── window.onload init                          │
│  │    ├── Toast + Loading + Confirm systems           │
│  │    ├── Dark mode                                   │
│  │    ├── Navigation (navigateTo, setupListeners)     │
│  │    ├── Excel import (extractWorkbook)              │
│  │    ├── Data parsing helpers                        │
│  │    ├── DB operations (read/write/sync)             │
│  │    ├── Dashboard render (renderDashboard)          │
│  │    ├── Task table render (renderTaskTable)         │
│  │    ├── Gantt render (renderGantt)                  │
│  │    ├── Performance render (renderPerfTable)        │
│  │    ├── Task CRUD (open/close/edit/delete/clone)    │
│  │    ├── Bulk operations                             │
│  │    ├── Detail modal                                │
│  │    └── Keyboard modal                              │
│  └── <script> block 2  (≈ 490 lines — Quick View)    │
│       └── Quick View Panel logic (prefixed `_qv`)    │
│                                                       │
│  State stored in:                                     │
│    - window globals: db, sort, chartInst, etc.        │
│    - localStorage['shtd_v2'] (JSON cache)             │
│    - localStorage['shtd_theme'] (dark/light)          │
│                                                       │
└──────────────────────────┬────────────────────────────┘
                           │ fetch() POST (text/plain)
                           │ CORS: any origin
                           ▼
┌───────────────────────────────────────────────────────┐
│         GOOGLE APPS SCRIPT WEB APP (External)         │
│                                                       │
│  URL: script.google.com/macros/s/AKfycbz.../exec     │
│  Source: NOT in this repository                       │
│                                                       │
│  Handles:                                             │
│    POST { action: 'read' }  → returns 2D array       │
│    POST { action: 'write', values: [[...], ...] }    │
│       → writes to Google Sheets                       │
│                                                       │
└──────────────────────────┬────────────────────────────┘
                           │ SpreadsheetApp API
                           ▼
┌───────────────────────────────────────────────────────┐
│              GOOGLE SHEETS (Database)                 │
│                                                       │
│  Sheet ID: 1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk │
│  Sheet:    Task_Master!A1:W (23 columns)              │
│                                                       │
│  Row 1: Header (DB_COLS)                              │
│  Row 2+: Task data (one row per task)                 │
└───────────────────────────────────────────────────────┘
```

---

## Data Flow

```
User Action
    │
    ▼
DOM Event Handler (onclick / oninput / onchange)
    │
    ├── Immediate: Update UI state (filter chips, progress preview)
    │
    └── On Save/Sync:
            │
            ▼
        syncAction(mutationFn)        [Read-Then-Patch v6.1]
            ├── 1. mutationFn() → modify db.tasks locally
            ├── 2. fetch(GS_WEBAPP_URL, { action: 'read' })
            ├── 3. _parseArrayIntoDb() → serverTasks
            ├── 4. Merge: local diff + server data
            ├── 5. fetch(GS_WEBAPP_URL, { action: 'write', values: merged })
            ├── 6. db.tasks = mergedTasks
            ├── 7. persist() → localStorage['shtd_v2']
            └── 8. renderAll() → update all views
```

---

## Startup Flow

```
window.onload
    │
    ├── 1. Load localStorage cache → db (avoids white screen)
    ├── 2. setupListeners() → bind all events
    ├── 3. renderAll() → render with cached data
    ├── 4. updateClock() + setInterval(30s)
    └── 5. if GS_WEBAPP_URL → autoConnectDB()
                │
                ├── showLoading()
                ├── readFromHandle() → fetch Sheet data
                ├── _parseArrayIntoDb() → db.tasks
                ├── persist() → update cache
                ├── renderAll() → update UI
                └── Update connection status UI
```

---

## Key Global State Variables

| Variable | Type | Purpose |
|---|---|---|
| `db` | `{tasks: [], initiatives: []}` | In-memory data store |
| `sort` | `{key, dir}` | Current table sort |
| `perfTab` | string | Active performance sub-tab |
| `fileHandle` | null | (legacy, unused) |
| `chartInst` | Chart instance | Current Chart.js instance |
| `selectedIds` | Set<string> | Bulk selection |
| `currentPage` | number | Pagination state |
| `confirmResolve` | Function | Promise resolver for confirm dialog |
| `debounceTimer` | Timer | Filter debounce |
| `_qvActiveTab` | string | Quick View active tab |
| `_qvIsOpen` | boolean | Quick View open state |

---

## GAS.GS — Patch File (NOT a Backend)

`GAS.GS` is a **v6.2 patch file** containing newer versions of 5 functions that must be manually merged into Main.html:

| Function in GAS.GS | Patch version | Notes |
|---|---|---|
| `syncAction()` | v6.1 | Read-Then-Patch (already merged into Main.html) |
| `patchFabPosition()` IIFE | v6.1 | CSS runtime patch (already merged) |
| `handleSubmit()` | v6.2 | Duplicate ID block (already merged) |
| `_showDuplicateIdBlocker()` | v6.2 | New helper (already merged) |
| `taskToRow()` + `fmtDateExport()` | v6.2 | Date/percent format (already merged) |
| `checkDupId()` | v6.2 | Updated behavior (already merged) |

> **Status**: All patches from GAS.GS appear to already be merged into Main.html based on version comments. GAS.GS can be considered historical/reference only at this point.
