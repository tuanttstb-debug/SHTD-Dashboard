# REFACTORING PLAN — SHTD Dashboard

## Target Architecture

The goal is to evolve from a 4076-line monolith into a maintainable, modular codebase while preserving 100% of existing business behavior.

### Recommended Target Structure

```
SHTD-Dashboard/
├── index.html                    ← Thin shell (head, body skeleton)
├── assets/
│   ├── css/
│   │   ├── tokens.css            ← All CSS custom properties
│   │   ├── base.css              ← Reset, body
│   │   ├── layout.css            ← Sidebar, topbar, main
│   │   ├── components.css        ← Cards, buttons, badges, modals
│   │   ├── forms.css             ← Form controls, validation
│   │   ├── table.css             ← Table, pagination, bulk bar
│   │   ├── gantt.css             ← Gantt specific
│   │   ├── quickview.css         ← Quick View Panel
│   │   └── responsive.css        ← Media queries
│   └── js/
│       ├── constants.js          ← DB_COLS, GS_WEBAPP_URL, DEFAULT_PICS
│       ├── state.js              ← db, sort, selectedIds, currentPage
│       ├── helpers.js            ← picNorm, fmtDate, parseVNDate, isOverdue, genId
│       ├── parsers.js            ← _parseArrayIntoDb, extractWorkbook (unified)
│       ├── storage.js            ← persist(), loadCache()
│       ├── api.js                ← readFromHandle, writeToHandle, syncAction
│       ├── ui/
│       │   ├── toast.js          ← toast()
│       │   ├── modal.js          ← uiConfirm, loading, openTaskModal, closeTaskModal
│       │   ├── navigation.js     ← navigateTo, setupListeners, toggleSidebar
│       │   └── theme.js          ← toggleDark, applySavedTheme
│       ├── views/
│       │   ├── dashboard.js      ← renderDashboard, populateDashFilter
│       │   ├── tasks.js          ← renderTaskTable, getFiltered, renderFilterChips
│       │   ├── gantt.js          ← renderGantt
│       │   ├── performance.js    ← renderPerfTable, switchPerfTab
│       │   └── quickview.js      ← openQuickView, renderQuickView, all _qv* funcs
│       ├── crud.js               ← editTask, handleSubmit, deleteTask, cloneTask
│       ├── bulk.js               ← bulkSetRag, bulkSetState, bulkDelete
│       └── app.js                ← init, window.onload, renderAll
├── backend/
│   ├── Code.gs                   ← GAS doPost() router
│   ├── SheetService.gs           ← read / write operations
│   └── Config.gs                 ← SPREADSHEET_ID, SHEET_NAME
├── docs/                         ← This directory → move AI_CONTEXT here
└── AI_CONTEXT/                   ← Reference docs (keep as-is)
```

---

## Migration Roadmap

### Phase A — Quick Wins (0 risk, no behavioral change)

| Task | What | Risk | Effort |
|---|---|---|---|
| A1 | Fix broken HTML at lines 153–178 (merge artifacts, debug buttons) | 🔴 HIGH PRIORITY | Small |
| A2 | Add GAS backend source code to `/backend/` folder | None | Small |
| A3 | Merge GAS.GS patches: verify `taskToRow()` and `checkDupId()` are v6.2 in Main.html | None | Small |
| A4 | Remove visible merge instructions from rendered HTML | None | Tiny |
| A5 | Replace `loadDemoData()` / `clearDemoData()` debug buttons with proper dev-only guards | Low | Small |
| A6 | Update Gantt subtitle from hardcoded "2025–2026" to dynamic | None | Tiny |

### Phase B — CSS Extraction (low risk)

| Task | What | Risk | Effort |
|---|---|---|---|
| B1 | Extract all CSS from `<style>` into `assets/css/*.css` files | Low | Medium |
| B2 | Add `<link rel="stylesheet">` tags in `<head>` | Low | Tiny |
| B3 | Replace inline `style=""` attributes with utility classes | Medium | Medium |
| B4 | Add SRI hashes to CDN links | Low | Small |

### Phase C — JS Modularization (medium risk)

| Task | What | Risk | Effort |
|---|---|---|---|
| C1 | Extract constants to `constants.js` | Low | Tiny |
| C2 | Extract helpers to `helpers.js` | Low | Small |
| C3 | Unify two date/RAG/state parser implementations into `parsers.js` | Medium | Small |
| C4 | Extract storage to `storage.js` | Low | Small |
| C5 | Extract API calls to `api.js` | Low | Small |
| C6 | Extract UI utilities (toast, modal, loading) | Low | Small |
| C7 | Extract view renders (dashboard, tasks, gantt, performance) | Medium | Medium |
| C8 | Extract Quick View to `quickview.js` | Low | Small |
| C9 | Extract CRUD to `crud.js` | Medium | Medium |
| C10 | Create `app.js` as entry point | Low | Small |

### Phase D — State Management (medium risk)

| Task | What | Risk | Effort |
|---|---|---|---|
| D1 | Create `state.js` with encapsulated state and getter/setter API | Medium | Medium |
| D2 | Replace all global `let` access with state API | Medium | Medium |

### Phase E — Backend (low risk, high value)

| Task | What | Risk | Effort |
|---|---|---|---|
| E1 | Add GAS source to `/backend/` | None | Small |
| E2 | Add `clasp.json` for GAS version control | None | Small |
| E3 | Document deploy process | None | Small |

### Phase F — Quality (future)

| Task | What | Risk | Effort |
|---|---|---|---|
| F1 | Add unit tests for parsers and helpers | None | Large |
| F2 | Add accessibility (aria attributes, focus traps) | Low | Medium |
| F3 | Replace hardcoded dropdown options with config-driven approach | Medium | Medium |
| F4 | TypeScript migration | High | Very Large |

---

## Rollback Strategy

**For each Phase A task**: Git commit before and after. Revert = `git revert`.

**For Phase B (CSS extraction)**:
- Keep original `<style>` block commented out
- Test all views after each CSS file extraction
- Rollback = uncomment original `<style>`

**For Phase C (JS extraction)**:
- Use `<script src="...">` tags in dependency order
- Test each extracted module independently in console
- Rollback = revert to inline `<script>` block

**Backward Compatibility Rule**: All existing localStorage keys (`shtd_v2`, `shtd_theme`) must be preserved exactly. All `GS_WEBAPP_URL` behavior must be preserved exactly.

---

## Non-Negotiable Constraints

1. **Business logic is frozen** — No changes to data model, sync logic, or parsing until explicitly approved
2. **Backward compatibility** — localStorage format `shtd_v2` must not change
3. **API compatibility** — `GS_WEBAPP_URL` protocol (read/write actions) must not change
4. **Zero downtime** — Users can access the dashboard at any time; no maintenance windows
5. **Vietnamese content** — All user-facing text stays in Vietnamese
