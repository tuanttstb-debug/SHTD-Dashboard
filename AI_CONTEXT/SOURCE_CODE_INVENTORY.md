# SOURCE CODE INVENTORY — SHTD Dashboard v6.2

## File Summary

| File | Lines | Role | Risk |
|---|---|---|---|
| `Main.html` | 4076 | Entire application (CSS + HTML + JS) | 🔴 HIGH — single point of failure |
| `GAS.GS` | 535 | v6.2 patch file (historical, merged) | 🟡 MEDIUM — may cause confusion |

---

## Main.html — Section Breakdown

### 1. HEAD / DEPENDENCIES (Lines 1–11)

| Item | Type | Source |
|---|---|---|
| DM Sans + DM Mono fonts | External CSS | Google Fonts CDN |
| Font Awesome 6.4.0 | External CSS | cdnjs.cloudflare.com |
| Chart.js | External JS | cdn.jsdelivr.net |
| SheetJS xlsx 0.18.5 | External JS | cdnjs.cloudflare.com |

**Risk**: All 4 CDN dependencies — no lockfile, no offline fallback, no SRI hashes.

---

### 2. CSS STYLES (Lines 11–1062, ~1050 lines)

| Module | Lines (approx) | Responsibility |
|---|---|---|
| Design tokens (`:root`) | 12–51 | All CSS variables: colors, spacing, shadows, fonts |
| Dark mode overrides | 52–65 | `[data-theme="dark"]` color overrides |
| Reset + base | 66–73 | `*` reset, body, links, scrollbars |
| Sidebar | 74–138 | `.sidebar`, `.sidebar.collapsed`, `.brand`, `.nav-*` |
| Main + Topbar | 140–211 | `.main`, `.topbar`, `.icon-btn`, `.status-dot`, `.user-pill` |
| Content area | 214–219 | `.content`, `.view-section` |
| Animations | 219–222 | `fadeUp`, `pulse`, `slideIn`, `slideOut` |
| Card system | 224–228 | `.card`, `.card-header`, `.card-title` |
| KPI grid | 231–259 | `.kpi-grid`, `.kpi-card`, `.kpi-icon`, `.kpi-value` |
| Overdue banner | 261–278 | `.overdue-banner` |
| Dashboard grid | 281–282 | `.dash-grid` (1fr 2fr) |
| Buttons | 284–304 | `.btn`, `.btn-primary/secondary/outline/ghost/danger` |
| Toolbar | 306–310 | `.toolbar`, `.toolbar-left/right` |
| Path hint | 312–319 | `.path-hint` |
| Filter bar + chips | 321–344 | `.filter-bar`, `.chip` |
| Table system | 346–363 | `table`, `thead`, `th`, `td`, row states |
| Badges | 365–390 | `.badge-*`, `.state-chip`, `.type-pill` |
| Progress bars | 392–397 | `.prog-wrap`, `.prog-bar`, `.prog-fill` |
| Tabs | 399–406 | `.tabs`, `.tab-btn` |
| Bulk action bar | 408–425 | `.bulk-bar`, `.btn-bulk` |
| Pagination | 429–441 | `.pagination`, `.page-btn` |
| Modal system | 443–491 | `.overlay`, `.modal`, `.modal-header/body/footer`, `.confirm-modal` |
| Form system | 493–515 | `.form-grid`, `.form-group`, `.form-control`, `.form-error` |
| Toast system | 517–542 | `.toast-container`, `.toast`, `.toast-success/error/warning/info` |
| Loading overlay | 544–561 | `.loading-overlay`, `.loading-box`, `.spinner` |
| Gantt chart | 563–586 | `.gantt-wrap`, `.gantt-row`, `.gantt-bar`, `.gantt-header` |
| Stat grid | 588–595 | `.stat-row`, `.stat-bar` |
| Status bar | 597–603 | `.statusbar` |
| Initiative table | 605–607 | `.init-table` |
| Keyboard modal | 609–619 | `.kb-grid`, `.kb-row`, `.kbd` |
| Detail modal | 621–622 | `.detail-modal` |
| Responsive mobile | 624–674 | `@media(max-width:768px)`, `@media(max-width:480px)` |
| Quick View FAB | 675–737 | `.qv-fab`, `.qv-fab-btn`, `.qv-topbar-btn` |
| Quick View overlay | 739–748 | `.qv-overlay` |
| Quick View panel | 750–1057 | `#quickViewPanel`, `.qvp-*` (full panel CSS) |

---

### 3. HTML BODY (Lines 1063–1656, ~593 lines)

| Component | Element | Key IDs |
|---|---|---|
| Loading overlay | `.loading-overlay` | `#loadingOverlay`, `#loadingText` |
| Toast container | `.toast-container` | `#toastContainer` |
| Sidebar overlay | `.sidebar-overlay` | `#sidebarOverlay` |
| Sidebar | `aside.sidebar` | `#sidebar`, `#navBadgeTotal`, `#navBadgeOverdue` |
| Sidebar toggle | `.sidebar-toggle` | `#sidebarToggle`, `#sidebarChevron` |
| Topbar | `header.topbar` | `#pageTitle`, `#pageBreadcrumb`, `#lastUpdated` |
| Topbar right | `.topbar-right` | `#syncDot`, `#darkModeBtn` |
| Dashboard section | `#view-dashboard` | `#dashFilterTuan`, `#overdueBannerWrap`, `#kpiGrid` |
| KPI cards | `.kpi-card` | `#kpiTotal`, `#kpiDone`, `#kpiInProgress`, `#kpiOverdue` |
| Dashboard charts | `.dash-grid` | `#ragChart`, `#ragLegend`, `#initTableBody` |
| Team/blocked cards | `.dash-grid` | `#teamStatList`, `#blockedList` |
| Tasks section | `#view-tasks` | Full task management card |
| Task toolbar | `.toolbar` | `#btnConnect`, `#btnSync`, `#importFile` |
| Filter bar | `.filter-bar` | `#filterId`, `#filterInit`, `#filterTeam`, `#filterPic`, `#filterState`, `#filterRag`, `#filterTuanBC` |
| Filter chips | `.filter-chips` | `#filterChips` |
| Bulk bar | `.bulk-bar` | `#bulkBar`, `#bulkCount` |
| Task table | `#taskTable` | `#selectAll`, `#taskTbody` |
| Pagination | `.pagination` | `#pagination`, `#taskCountInfo` |
| Gantt section | `#view-gantt` | `#ganttFilterTeam`, `#ganttFilterInit`, `#ganttWrap` |
| Performance section | `#view-performance` | `#perfHead`, `#perfTbody` |
| Status bar | `.statusbar` | `#sbDb`, `#sbCount`, `#sbTime` |
| Task modal | `.overlay#taskOverlay` | Full 23-field CRUD form |
| Task form fields | form `#taskForm` | `#fId`, `#origId`, `#fType`, `#fCat`, `#fName`, `#fInit`, `#fMs`, `#fTeam`, `#fTeamPh`, `#fPicAcc`, `#fPicRes`, `#fPicSup`, `#fStart`, `#fEnd`, `#fState`, `#fProg`, `#fRag`, `#fCross`, `#fHl`, `#fResult`, `#fNext`, `#fIssue`, `#fBLD`, `#fBLDTxt`, `#fTuanBC` |
| Confirm modal | `#confirmOverlay` | `#confirmIcon`, `#confirmTitle`, `#confirmBody`, `#confirmOkBtn` |
| Detail modal | `#detailOverlay` | `#detailTitle`, `#detailTbody` |
| Keyboard modal | `#kbOverlay` | Static content |
| Quick View panel | `#quickViewPanel` | `#qvFilterInit`, `#qvFilterTuan`, tabs, panes |
| Quick View FAB | `.qv-fab` | `#qvFabBtn` |

---

### 4. JAVASCRIPT — Block 1 (Lines 1656–3483, ~1827 lines)

#### 4a. Constants & State (1657–1677)

| Symbol | Type | Value / Purpose |
|---|---|---|
| `db` | `{tasks:[], initiatives:[]}` | Main data store |
| `sort` | `{key, dir}` | Table sort state |
| `perfTab` | string | `'initiative'` |
| `fileHandle` | null | Legacy — unused |
| `chartInst` | Chart | Chart.js instance |
| `selectedIds` | Set | Bulk selection set |
| `currentPage` | number | Pagination page |
| `PAGE_SIZE` | const 20 | Items per page |
| `confirmResolve` | Function | Confirm dialog resolver |
| `DEFAULT_PICS` | array | `['Tuantt4','Dunglq1','Quangnn3']` |
| `gKeyBuffer` | string | G+key nav buffer |
| `debounceTimer` | Timer | Filter debounce |
| `GS_WEBAPP_URL` | const string | Apps Script endpoint |
| `GS_SHEET_ID` | const string | Spreadsheet ID |
| `GS_RANGE` | const string | `'Task_Master!A1:W'` |

#### 4b. Initialization (1682–1730)

| Function | Lines | Responsibility |
|---|---|---|
| `window.onload` | 1683–1707 | Boot: load cache → render → auto-connect |
| `autoConnectDB()` | 1710–1730 | Auto-read from GAS on startup |
| `persist()` | 1732–1734 | Save db to localStorage |
| `updateClock()` | 1736–1740 | Update time display |

#### 4c. UI Utilities (1742–1874)

| Function | Lines | Responsibility |
|---|---|---|
| `toast(msg, type, duration)` | 1745–1755 | Toast notification system |
| `uiConfirm(title, body, type, okLabel)` | 1760–1774 | Async promise-based confirm dialog |
| `resolveConfirm(val)` | 1775–1778 | Resolve confirm dialog |
| `showLoading(msg)` | 1783–1786 | Show blocking loading overlay |
| `hideLoading()` | 1787–1789 | Hide loading overlay |
| `toggleDark()` | 1794–1799 | Toggle dark/light mode |
| `setupListeners()` | 1806–1875 | Bind all DOM events |

#### 4d. Navigation (1877–1910)

| Function | Lines | Responsibility |
|---|---|---|
| `toggleSidebar()` | 1878–1887 | Mobile: toggle sidebar open/close |
| `closeSidebar()` | 1888–1891 | Close mobile sidebar |
| `navigateTo(view)` | 1893–1904 | Switch between pages |
| `copyPath()` | 1906–1910 | Copy network path to clipboard |

#### 4e. Excel Import (1912–2129)

| Function | Lines | Responsibility |
|---|---|---|
| `extractWorkbook(wb)` | 1915–2129 | Parse xlsx workbook → `{tasks, initiatives}` |

Sub-logic:
- Finds `initiative_master` sheet for initiative names
- Finds `task_master` (or first sheet) for tasks
- 25+ flexible column name variants via `colIdxExact()`
- Date parsing: ISO, DD/MM/YYYY, Excel serial, Date objects
- RAG parsing: Red/Amber/Green from various string formats
- State normalization
- ID auto-generation for rows without ID

#### 4f. Data Helpers (2131–2215)

| Function | Lines | Responsibility |
|---|---|---|
| `picNorm(n)` | 2134 | Normalize PIC name: first char uppercase, rest lower |
| `fmtTuanBC(el)` | 2137–2148 | Auto-format "Tuần XX/YYYY" as user types |
| `fmtDate(d)` | 2149 | YYYY-MM-DD → DD/MM/YYYY for display |
| `parseVNDate(s)` | 2152–2163 | String → Date object (ISO or VN format) |
| `isOverdue(endDate, progress)` | 2164–2176 | Check if task is past deadline and incomplete |
| `ragBadge(s)` | 2176 | Returns HTML badge for RAG status |
| `stateChip(s)` | 2177–2180 | Returns HTML chip for state |
| `genId(init, team, extra)` | 2182–2192 | Auto-generate sequential task ID |
| `autoGenId()` | 2194–2198 | Update form ID field from current initiative/team |
| `checkDupId(id)` | 2200–2208 | Real-time duplicate ID visual check |
| `autoProgress()` | 2210–2215 | Auto-set progress % when state = 'Hoàn thành' |

#### 4g. DB Operations (2217–2552)

| Function | Lines | Responsibility |
|---|---|---|
| `DB_COLS` | 2222–2235 | Const: 23 column header names |
| `taskToRow(t)` | 2238–2261 | Task object → 23-element array (for Sheet write) |
| `readFromHandle()` | 2265–2278 | Fetch read from GAS → parse into db |
| `_parseArrayIntoDb(values)` | 2282–2363 | Parse 2D array from GAS → db.tasks |
| `writeToHandle()` | 2366–2385 | Write db.tasks → GAS (full write, legacy) |
| `syncAction(action)` | 2398–2552 | v6.1 Read-Then-Patch sync (safe multi-user) |

#### 4h. UI Update Functions (2553–2951)

| Function | Lines | Responsibility |
|---|---|---|
| `renderAll()` | ~2553 | Call all render functions |
| `populateFilters()` | ~2560 | Populate filter dropdowns from db |
| `currentWeekLabel()` | ~2780 | Compute current week label (ISO week) |
| `populateDashFilter()` | 2800–2813 | Populate dashboard week filter |
| `renderDashboard()` | 2815–2951 | Full dashboard render: KPIs, chart, tables |

#### 4i. Task Table (2953–3120)

| Function | Lines | Responsibility |
|---|---|---|
| `getFiltered()` | 2956–2984 | Apply all 7 filters → filtered task array |
| `renderFilterChips()` | 2986–3003 | Render active filter chips |
| `clearFilter(id)` | ~3005 | Clear a single filter |
| `clearFilters()` | ~3010 | Clear all filters |
| `onFilterChange()` | ~3015 | Debounced filter update |
| `renderTaskTable()` | ~3020 | Render paginated task table |
| `sortBy(key)` | ~3080 | Toggle sort state → re-render |
| `renderPagination(total)` | ~3090 | Render page number buttons |

#### 4j. Bulk Operations (~3100–3200)

| Function | Lines | Responsibility |
|---|---|---|
| `toggleSelectAll(cb)` | ~3100 | Select/deselect all visible rows |
| `toggleSelect(id, cb)` | ~3115 | Toggle single row selection |
| `clearSelection()` | ~3130 | Clear all selections |
| `updateBulkBar()` | ~3140 | Show/hide bulk action bar |
| `bulkSetRag(rag)` | ~3150 | Bulk update RAG status |
| `bulkSetState(state)` | ~3165 | Bulk update state |
| `bulkDelete()` | ~3178 | Bulk delete with confirm |

#### 4k. CRUD Operations (~3200–3420)

| Function | Lines | Responsibility |
|---|---|---|
| `openTaskModal()` | ~3200 | Open empty task form |
| `closeTaskModal()` | ~3225 | Close and reset form |
| `editTask(id)` | ~3230 | Populate form with existing task data |
| `populateInitSelect(sel)` | ~3280 | Populate initiative dropdown |
| `populatePicSelect(sel)` | ~3290 | Populate PIC responsible dropdown |
| `handleSubmit(e)` | ~3300 | Form submit: validate + duplicate check + save |
| `deleteTask()` | ~3370 | Delete current task with confirm |
| `cloneTask()` | ~3390 | Clone current task with new ID |

#### 4l. View Renders (~3100–3420)

| Function | Lines | Responsibility |
|---|---|---|
| `renderGantt()` | ~3050 | Render Gantt timeline chart |
| `renderPerfTable()` | ~3200 | Render performance breakdown table |
| `switchPerfTab(tab)` | ~3250 | Switch perf sub-tab |

#### 4m. Modal Helpers (~3420–3483)

| Function | Lines | Responsibility |
|---|---|---|
| `showDetailModal(filter, title)` | 3423–3475 | Show filtered task list modal |
| `closeDetailModal()` | 3476 | Close detail modal |
| `openKbModal()` | 3481 | Open keyboard shortcut modal |
| `closeKbModal()` | 3482 | Close keyboard shortcut modal |

---

### 5. JAVASCRIPT — Block 2: Quick View Panel (Lines 3484–3976, ~492 lines)

| Function | Lines | Responsibility |
|---|---|---|
| `openQuickView()` | 3496–3503 | Open panel, populate filters, render |
| `closeQuickView()` | 3506–3511 | Close panel |
| `refreshQuickView()` | 3513–3521 | Animate refresh + re-render |
| `switchQvTab(tab)` | 3524–3530 | Switch panel tab |
| `_qvPopulateFilters()` | 3533–3563 | Populate initiative + tuần BC filters |
| `renderQuickView()` | 3566–3600 | Main render: dispatch to 4 tab renders |
| `_qvRenderDone(tasks)` | ~3600 | Tab 1: Completed tasks |
| `_qvRenderPlan(tasks)` | ~3660 | Tab 2: Next month plan |
| `_qvRenderInitiative(tasks, filterInit)` | ~3710 | Tab 3: By initiative (grouped) |
| `_qvToggleInitGroup(initId)` | 3879–3887 | Toggle initiative group expand/collapse |
| `_qvRenderIssue(tasks)` | 3890–3957 | Tab 4: Blocked/BLD/issues |
| `_qvOpenTask(id)` | ~3958 | Open edit modal for a task |
| `_qvCurrentWeek()` | ~3965 | Fallback week label computation |
| Keyboard listener | 3964–3973 | Q key = open/close, ESC = close |

---

## GAS.GS — Patch File Inventory

| Function | Patch | Status |
|---|---|---|
| `syncAction(action)` | v6.1 | ✅ Already in Main.html |
| `patchFabPosition()` IIFE | v6.1 | ✅ Already in Main.html |
| `handleSubmit(e)` | v6.2 | ✅ Already in Main.html |
| `_showDuplicateIdBlocker(id, task)` | v6.2 | ✅ Already in Main.html |
| `fmtDateExport(d)` | v6.2 | ✅ Already in Main.html |
| `taskToRow(t)` | v6.2 | ⚠️ TWO VERSIONS EXIST (Main.html has older) |
| `checkDupId(id)` | v6.2 | ⚠️ TWO VERSIONS EXIST (Main.html has older) |
| `_MMM` const | v6.2 | ⚠️ Only in GAS.GS, not Main.html |

> **⚠️ RISK**: `taskToRow()` and `checkDupId()` exist in both files with different behavior. The GAS.GS versions are newer. Need to verify which version is actually in Main.html.

---

## Dependencies Map

```
handleSubmit()
  └── syncAction()
        ├── readFromHandle() → _parseArrayIntoDb()
        ├── writeToHandle()
        ├── uiConfirm()
        ├── showLoading() / hideLoading()
        ├── persist()
        └── renderAll()
              ├── renderDashboard()
              ├── renderTaskTable()
              ├── renderGantt()
              ├── renderPerfTable()
              ├── populateFilters()
              └── (quickViewPanel if open)
```
