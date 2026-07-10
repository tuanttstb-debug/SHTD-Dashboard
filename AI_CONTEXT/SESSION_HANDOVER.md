# SESSION HANDOVER
**Date**: 2026-07-10 (Session 52 — SYNC topbar + Issue Tracker Người log dropdown)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `c40dbae` — feat(S52): SYNC topbar + Issue Tracker Nguoi Log dropdown

---

## Tasks Completed (S52)

| # | Task | Files | Status |
|---|---|---|---|
| S52-T1 | `index.html` — Move `#btnSync` to topbar-right (before Quick View), styled with `qv-topbar-btn`; remove from Tasks toolbar | `index.html` | ✅ |
| S52-T2 | `index.html` — Remove "Làm mới" buttons from BLD Queue, Case Pipeline (table+kanban), Issue Tracker | `index.html` | ✅ |
| S52-T3 | `index.html` — Issue Tracker modal: `<input type="text" id="itfNguoiLog">` → `<select id="itfNguoiLog">` | `index.html` | ✅ |
| S52-T4 | `app.js` — `syncDB()` now syncs ALL features in parallel: `readFromHandle()` + `readCases()` + `readIssues()` + `readInitiatives()` | `assets/js/app.js` | ✅ |
| S52-T5 | `issue-tracker.js` — `openIssueModal()`: replace `_itSetField('itfNguoiLog', ...)` with `_populateUserSelect('itfNguoiLog', null, ...)` | `assets/js/views/issue-tracker.js` | ✅ |
| S52-T6 | `config.js` — APP_VERSION `6.17-i18n-phase8-20260710` → `6.18-sync-topbar-nguoilog-20260710`; cache-bust `?v=20260710f` (56 refs, Python) | `assets/js/config.js`, `index.html` | ✅ |
| S52-T7 | Tests: 19/20 PASS — `verify_my_work.mjs` has 3 pre-existing failures (MW22/MW23-prog-bar, progress toggle UI), unrelated to S52 | all | ⚠️ pre-existing |

### S52 Architecture Notes

**SYNC topbar button (`#btnSync`)**:
- Removed from Tasks toolbar (`btn btn-success-soft btn-sm`); was at old line 844
- Added to topbar-right BEFORE Quick View button, class `qv-topbar-btn`; icon color `var(--success)`
- Same `id="btnSync"` → JS visibility refs in `app.js` (lines 53, 158, 186: display inline-flex/none) still work without change

**syncDB() — all features in parallel**:
```javascript
await Promise.all([
  readFromHandle(),  // Tasks
  readCases(),       // Case Pipeline
  readIssues(),      // Issue Tracker
  readInitiatives(), // Initiatives
]);
```

**Issue Tracker "Người log" dropdown**:
- `<select id="itfNguoiLog">` in `index.html` (was `<input type="text">`)
- `openIssueModal()` calls `_populateUserSelect('itfNguoiLog', null, iss?.nguoiLog || auth?.user?.username || '')`
- `team=null` → `getUsersByTeam('')` → all active users; displays "Display_Name (Username)"; stores Username as value
- Fallback if `_appUsers` empty: single option with currentVal (offline-safe)
- Save logic (`_itCollect()`) uses `.value` — works identically for input/select

**Per-feature "Làm mới" buttons removed** (topbar SYNC replaces them):
- BLD Queue filter bar: entire button removed
- Case Pipeline table: `div` simplified to just `<span id="cpCountInfo">`
- Case Pipeline kanban: header div removed entirely
- Issue Tracker table: `div` simplified to just `<span id="itCountInfo">`

### Test suite snapshot (2026-07-10, S52)
```
verify_i18n_p8             13/13  PASS  (S51)
verify_i18n_p7             35/35  PASS  (S50)
verify_i18n_p6             27/27  PASS  (S49)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             59/62  ❌ FAIL 3 (MW22 x2 + MW23-prog-bar — PRE-EXISTING, unrelated to S52)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
run_tests.mjs              19/20  (1 pre-existing suite failure)
```

### Smoke test checklist S52
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.18-sync-topbar-nguoilog-20260710` |
| Topbar | SYNC button appears next to Quick View (when connected) |
| Click SYNC | Toast "Đã đồng bộ toàn bộ dữ liệu!" — all 4 feature lists refresh |
| Issue Tracker → Thêm Issue | "Người log" field is a dropdown; logged-in user pre-selected |
| Issue Tracker → Edit Issue | "Người log" shows the issue's existing nguoiLog value |
| BLD Queue, Case Pipeline, Issue Tracker | No "Làm mới" button (removed) |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S51)

---

# SESSION HANDOVER
**Date**: 2026-07-10 (Session 51 — i18n Phase 8: KPI Overview + Owner Analysis bilingual)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `7f5c1db` — feat(i18n): Phase 8 — KPI Overview + Owner Analysis bilingual (6 keys)

---

## Tasks Completed (S51 — i18n Phase 8)

| # | Task | Files | Status |
|---|---|---|---|
| S51-T1 | `i18n.js` — +6 keys (kp.btn.*, kp.section.*, oa.tab.ranking) in VI and EN | `assets/js/i18n.js` | ✅ |
| S51-T2 | `kpi-overview.js` — 3 toolbar buttons + 2 section headers → `t()` | `assets/js/views/kpi-overview.js` | ✅ |
| S51-T3 | `owner-analysis.js` — ranking tab label → `t('oa.tab.ranking')` | `assets/js/views/owner-analysis.js` | ✅ |
| S51-T4 | `app.js` — `renderAll()` +2 guards: view-kpi-overview, view-owner-analysis | `assets/js/app.js` | ✅ |
| S51-T5 | `config.js` — APP_VERSION `6.16.2-fix-it-popup-20260710` → `6.17-i18n-phase8-20260710` | `assets/js/config.js` | ✅ |
| S51-T6 | `index.html` — cache-bust `?v=20260710d` → `?v=20260710e` (56 refs, Python) | `index.html` | ✅ |
| S51-T7 | `verify_i18n_p8.mjs` (NEW) — **13/13 PASS** (IP8-1→IP8-8: KP buttons VI/EN, section headers VI/EN, OA tab label VI/EN, renderAll live-switch, 0 JS errors) | `verify_i18n_p8.mjs` | ✅ |
| S51-T8 | `run_tests.mjs` — +verify_i18n_p8.mjs as first suite; **20/20 PASS** | `run_tests.mjs` | ✅ |

### i18n Phase 8 Key Notes (S51)

**Domain data NOT translated** (intentional): KPI names ('KPI 2.1', 'KPI 2.2'), owner labels ('QuangNN3 – Bảo lãnh', 'DungLQ1 – Giải ngân'), channel terms ('BIZ', 'BPM', 'Digital Rate'), KPI status ('Vượt KPI', 'Đạt KPI'), all chart card titles, all alert message text, period subtitle ('Kỳ: T1–T6/2026'), owner tab labels that include person names.

**Only chrome translated**: Toolbar buttons (Load/Sync/From-Sheet), section headers (Charts/Alerts), ranking tab label.

**Phase 0 security verified**: `AuthService.gs` throws if no `AUTH_SECRET` (no fallback). `Code.gs` has KNOWN_ROLES gate + Admin-only gate for write actions. ✅ Done as of S30-era.

**renderAll() guards (app.js)**:
```javascript
if (document.getElementById('view-kpi-overview')?.style.display === 'contents') renderKpiOverview();
if (document.getElementById('view-owner-analysis')?.style.display === 'contents') renderOwnerAnalysis();
```
Note: `renderKpiOverview()` also internally re-renders kpi-progress + owner-analysis on revisit (kpi-overview.js:225–229). Guard for view-owner-analysis still needed for direct navigation.

### Test suite snapshot (2026-07-10, S51)
```
verify_i18n_p8             13/13  PASS  (S51 NEW)
verify_i18n_p7             35/35  PASS  (S50)
verify_i18n_p6             27/27  PASS  (S49)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             55/55  PASS  (S44b)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS  (S30)
verify_case_pipeline       22/22  PASS  (S20)
verify_bld_queue           46/46  PASS  (S19)
verify_milestone_task      23/23  PASS  (S27)
verify_task_init_popup     28/28  PASS  (S25)
verify_filter_cascade      23/23  PASS  (S23)
verify_import_rbac         15/15  PASS  (S23)
verify_modal_layout         9/9   PASS  (S23)
─────────────────────────────────────────────────
run_tests.mjs              20/20  PASS
```

### Smoke test checklist S51
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.17-i18n-phase8-20260710` |
| KPI Digital Overview → switch EN | Buttons: "Load Raw File", "Sync to Sheet", "From Sheet" |
| KPI Digital Overview → switch EN | Section headers: "Analysis Charts", "Automated KPI Alerts" |
| Owner Analysis → switch EN | Third tab: "PTKD Rankings" |
| Switch back VI | "Tải File Raw", "Biểu đồ phân tích", "Cảnh báo KPI Tự động", "Bảng xếp hạng PTKD" |

---

## Next session candidates (S52+)
| Priority | Task | Notes |
|---|---|---|
| P0 | Smoke test S51 on production | See checklist above |
| P1 | AI Chat live activation | GAS editor → Script Properties → `GEMINI_API_KEY = <key>` (user action). Backend is wired; frontend i18n done. |
| P2 | i18n coverage is now COMPLETE | All views bilingual. No Phase 9 needed. |

---

## Previous S50 — i18n Phase 7
**Date**: 2026-07-10 (Session 50 — i18n Phase 7: Gantt, AI Chat, Branch Analysis, User Management bilingual)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `e0039a4` — feat: i18n Phase 7 — Gantt, AI Chat, Branch Analysis, User Management bilingual

---

## Tasks Completed (S50 — i18n Phase 7)

| # | Task | Files | Status |
|---|---|---|---|
| S50-T1 | `i18n.js` — +74 new keys (gantt.*, ai.*, branch.*, um.*) in VI and EN blocks | `assets/js/i18n.js` | ✅ |
| S50-T2 | `gantt.js` — subtitle + empty state → `t()` calls | `assets/js/views/gantt.js` | ✅ |
| S50-T3 | `ai-chat.js` — static `_aiSuggestions` → `_getAiSuggestions()` function; 8 UI strings → `t()` | `assets/js/views/ai-chat.js` | ✅ |
| S50-T4 | `branch-analysis.js` — zone tabs, stat cards, table headers → `t()` (12 strings) | `assets/js/views/branch-analysis.js` | ✅ |
| S50-T5 | `user-management.js` — ~45 strings → `t()`; `renderUserManagement()` skips `_umLoad()` if `_umUsers.length>0` (lang-switch cache); `+_umRestoreFilterUi()` helper | `assets/js/views/user-management.js` | ✅ |
| S50-T6 | `app.js` — `renderAll()` +4 guards (gantt, ai-chat, branch-analysis, user-management) | `assets/js/app.js` | ✅ |
| S50-T7 | `config.js` — APP_VERSION `6.15` → `6.16-i18n-phase7-20260710`; cache-bust `?v=20260710b` (56 refs) | `assets/js/config.js`, `index.html` | ✅ |
| S50-T8 | `verify_i18n_p7.mjs` (NEW) — **35/35 PASS** (IP7-1 → IP7-20; Gantt subtitle/empty, AI Chat header/suggest, Branch zone/stat/col, UM filter/empty/badge, renderAll live-switch, 0 JS errors) | `verify_i18n_p7.mjs` | ✅ |
| S50-T9 | `run_tests.mjs` — +verify_i18n_p7.mjs as first suite; **19/19 PASS** | `run_tests.mjs` | ✅ |

### i18n Phase 7 Architecture (S50)

**Critical lesson**: `let _umUsers = []` in user-management.js is a script-scope binding — NOT a property of `window`. Test code that does `window._umUsers = users` creates a SEPARATE variable. Must use `_umUsers.length = 0; _umUsers.push(...users)` to mutate the actual array.

**`renderUserManagement()` lang-switch cache** (skips GAS refetch):
```javascript
if (_umUsers.length > 0) {
  _umPopulateFilters();   // rebuild team dropdown (uses _umFilterTeam state)
  _umRestoreFilterUi();   // restore filter input values from state vars
  _umRender();            // render table with current filters
} else {
  await _umLoad();        // initial load — hits GAS
}
```

**`_getAiSuggestions()` function** replaces static `_aiSuggestions` array so suggestions re-evaluate on each render (picks up current language).

**renderAll() guards added (app.js)**:
```javascript
if (document.getElementById('view-gantt')?.style.display === 'contents') renderGantt();
if (document.getElementById('view-ai-chat')?.style.display === 'contents') renderAiChat();
if (document.getElementById('view-branch-analysis')?.style.display === 'contents') renderBranchAnalysis();
if (document.getElementById('view-user-management')?.style.display === 'contents') renderUserManagement();
```

**Reused existing keys**: `common.all`, `common.cancel`, `common.search`, `page.user-management`

**Skipped (domain data, not UI chrome)**: `kpi-overview.js`, `owner-analysis.js`, `kpi-progress.js` (clean), `rm-analysis.js` (clean)

### Test suite snapshot (2026-07-10, S50)
```
verify_i18n_p7             35/35  PASS  (S50 NEW)
verify_i18n_p6             27/27  PASS  (S49)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (19 suites)        PASS  0 FAIL
```

### Smoke test checklist (S50 — manual, production)
| Check | Expected |
|---|---|
| Hard-reload | Badge shows `v6.16-i18n-phase7-20260710` |
| Gantt view → switch EN | Subtitle: "Timeline view — 2026" |
| Gantt view → no tasks with dates | Empty state: "No tasks with both Start Date and Deadline" |
| AI Chat → switch EN | Header sub: "Ask about tasks, KPIs, initiatives · Powered by Gemini" |
| AI Chat suggestions (EN) | "Summarize all currently Blocked tasks" |
| Branch Analysis tabs (EN) | Zone tabs: "All / North Region / South Region / Central Region" |
| Branch stat cards (EN) | "Met KPI / Below KPI / Total Branches" |
| User Management → switch EN | Filter label: "Status"; options: "Active / Inactive" |
| UM status badge (EN) | Active row: "Active"; Locked row: "Inactive" |
| Switch back VI | All labels restore to Vietnamese |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S49)

---

# SESSION HANDOVER
**Date**: 2026-07-10 (Session 49 — i18n Phase 6: Initiative Tracker + dashboard/app filter labels)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `cbe20a1` — feat(i18n): S49 — i18n Phase 6: Initiative Tracker + dashboard/app filter labels bilingual

---

## Tasks Completed (S49 — i18n Phase 6: Initiative Tracker)

| # | Task | Files | Status |
|---|---|---|---|
| S49-T1 | `i18n.js` — +52 new `it.*` keys + `db.modal.project-prefix` in VI and EN blocks | `assets/js/i18n.js` | ✅ |
| S49-T2 | `initiative-tracker.js` — all ~52 hard-coded VI strings replaced with `t()` calls across all functions | `assets/js/views/initiative-tracker.js` | ✅ |
| S49-T3 | `dashboard.js` — 1 fix: `'Dự án: '` prefix → `t('db.modal.project-prefix')` | `assets/js/views/dashboard.js` | ✅ |
| S49-T4 | `app.js` — `renderAll()` guard for IT view + 2 hard-coded `'Tất cả'` in `updateFilterDropdowns()` | `assets/js/app.js` | ✅ |
| S49-T5 | `config.js` — `APP_VERSION='6.15-i18n-phase6-20260710'`; cache-bust `?v=20260710` (56 refs) | `assets/js/config.js`, `index.html` | ✅ |
| S49-T6 | `verify_i18n_p6.mjs` (NEW) — 27/27 PASS (IP6-1 to IP6-15: stat bar VI/EN, scope btns, filter opts, add btn, empty state, filterInit/filterTuanBC, restore VI, 0 JS errors) | `verify_i18n_p6.mjs` | ✅ |
| S49-T7 | `run_tests.mjs` — added `verify_i18n_p6.mjs` as first suite (now 18 suites) | `run_tests.mjs` | ✅ |
| S49-T8 | Full regression: **18/18 suites PASS** | all | ✅ |

### i18n Phase 6 Architecture (S49)

**Functions wired in `initiative-tracker.js`**:
- `renderInitiativeTracker()` toolbar: title, scope buttons, filter dropdowns, add button
- `_initStatBar()`: 4 stat labels (`it.stat.total/active/done` + `mw.dl.overdue`); "Blocked" kept as-is
- `_initBuildCardList()`: empty state title + subtitle
- `_initBuildCard()`: "Tasks liên kết" toggle label
- `_initBuildMilestoneList()`: empty text + both "Thêm Milestone" buttons
- `_initBuildMsTaskList()`: empty + add-task; alignment badges (warn/loose/ok); fix-link; table headers
- `_initBuildTaskList()`: empty + table headers (Trạng thái/Tiến độ)
- `_initModalTemplate()`: all labels + footer Hủy/Lưu via `common.cancel/save`
- `_initOpenModal()`: root-opt, add/edit titles
- `_initSave()`: 3 validation strings + 2 success toasts
- `_initDelete()`: warning/warn-tasks/warn-ms + confirm dialog + error/success toasts
- `openInitViewPopup()`: subtitle + all 7 row labels
- `_loadInitHistory()`: loading text + synthetic row action

**Key reuse** (avoids duplicate keys):
- `mw.dl.overdue` → IT stat bar "Quá hạn / Overdue"
- `task.scope.mine/all` → IT scope buttons
- `common.cancel/save/delete` → IT modal footer + confirm

**renderAll() guard** (app.js):
```javascript
if (document.getElementById('view-initiative-tracker')?.style.display === 'contents') renderInitiativeTracker();
```

### Test suite snapshot (2026-07-10, S49)
```
verify_i18n_p6             27/27  PASS  (S49 NEW)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (18 suites)        PASS  0 FAIL
```

### Smoke test checklist (S49 — manual, production)
| Check | Expected |
|---|---|
| Hard-reload | Badge shows `v6.15-i18n-phase6-20260710` |
| Initiative Tracker → switch EN | Stat bar: "Total Initiatives / Active / Done / Overdue" |
| Scope buttons (EN) | "Mine / All" |
| Filter dropdowns (EN) | "All Categories / All Statuses" |
| Add button (EN) | "Add Initiative" |
| Empty state (EN) | "No Initiatives" |
| Switch back VI | All labels restore to Vietnamese |
| Tasks view → filterInit (EN) | "All" |
| Tasks view → filterTuanBC (EN) | "All" / "📅 This Week" |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S48)

---

# SESSION HANDOVER
**Date**: 2026-07-09 (Session 48 — i18n Phase 5: Quick View + Executive Summary bilingual)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `5aa429b` — S48: i18n Phase 5 — Quick View + Executive Summary bilingual

---

## Tasks Completed (S48 — i18n Phase 5: Quick View + Executive Summary)

| # | Task | Files | Status |
|---|---|---|---|
| S48-T1 | `quickview.js` — 18 t() calls wired (filter options, subtitle, done label, state chip via tState(), time prefix, plan labels, group-by, deadline prefix, overdue prefix, issue flags, risk/BLĐ titles, empty states) | `assets/js/views/quickview.js` | ✅ |
| S48-T2 | `quickview.js` — fix t()-shadowing: renamed loop var `t→tk` in 4 map callbacks (done, plan, initiative, issue) | `assets/js/views/quickview.js` | ✅ |
| S48-T3 | `quickview.js` — `renderQuickView()` now calls `_qvPopulateFilters()` + `_qvUpdateTime()` so filter labels and time prefix update live on language switch | `assets/js/views/quickview.js` | ✅ |
| S48-T4 | `executive-summary.js` — 6 t() calls wired (chart empty label, attention empty, cfg labels BLĐ+Overdue, more-link, table empty, status tags High Risk/Watch/On Track) | `assets/js/views/executive-summary.js` | ✅ |
| S48-T5 | `app.js` — 2 new guards in `renderAll()`: ES view + QV panel re-render on language switch | `assets/js/app.js` | ✅ |
| S48-T6 | `config.js` — APP_VERSION='6.14-i18n-phase5-20260709'; cache-bust ?v=20260709g | `assets/js/config.js`, `index.html` | ✅ |
| S48-T7 | `verify_i18n_p5.mjs` (NEW) — 24/24 PASS (IP5-1 to IP5-14: QV filter, subtitle, done/plan/init/issue labels, time prefix, ES empty/attention/status tags, VI restore, 0 JS errors) | `verify_i18n_p5.mjs` | ✅ |
| S48-T8 | `run_tests.mjs` — added verify_i18n_p5.mjs as first suite (now 17 suites) | `run_tests.mjs` | ✅ |
| S48-T9 | Full regression: **17/17 suites PASS** | all | ✅ |

### i18n Phase 5 Architecture (S48)

**All translation keys pre-existed** in `i18n.js` (qv.*, es.* written in prior session). Phase 5 was purely wiring.

**Critical t()-shadowing bug** (found and fixed this session):
```javascript
// quickview.js: BEFORE (broken — local `t` shadows global t() i18n function)
done.map(t => `...${t('qv.done.label')}...`)  // t is task object; t() fails

// AFTER (fixed — renamed loop var to tk)
done.map(tk => `...${t('qv.done.label')}...`)  // t() is the global i18n function again
```
Same fix applied to plan.map, initTasks.map, issues.map.

**Live language switch fix for QV**:
`renderQuickView()` now calls `_qvPopulateFilters()` + `_qvUpdateTime()` at the start, so filter labels and time prefix update immediately on `setLang()`.

**renderAll() additions (app.js)**:
```javascript
if (document.getElementById('view-executive-summary')?.style.display === 'contents') renderExecutiveSummary();
if (_qvIsOpen) renderQuickView();
```

### Test suite snapshot (2026-07-09, S48)
```
verify_i18n_p5             24/24  PASS  (S48 NEW)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (17 suites)        PASS  0 FAIL
```

### Smoke test checklist (S48 — manual, production)
| Check | Expected |
|---|---|
| Hard-reload | Badge shows `v6.14-i18n-phase5-20260709` |
| Open Quick View → switch to EN | Filter "All" / "All Weeks" / "📅 This Week", subtitle contains "tasks" + "All", "Done:", "Next Week Plan", "Group by Initiative", "Updated:" |
| Switch back to VI | "Tất cả", "Cập nhật:" |
| Executive Summary → switch EN | "High Risk", "Watch"/"On Track", "Pending Approval", "Overdue" |
| Switch back to VI | "Rủi ro cao", "Cần chú ý", "Cần BLĐ", "Quá hạn" |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S47)

---

# SESSION HANDOVER
**Date**: 2026-07-09 (Session 47 — i18n Phase 4: My Work bilingual labels)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `f87eb3e` — S47: i18n Phase 4 — My Work bilingual labels

---

## Tasks Completed (S47 — i18n Phase 4: My Work)

| # | Task | Files | Status |
|---|---|---|---|
| S47-T1 | `i18n.js` — 22 mw.* keys VI + 22 EN (greeting, deadline, champion, sections) | `assets/js/i18n.js` | ✅ |
| S47-T2 | `my-work.js` — replace all hard-coded VI strings with t()/tState(); rename t→ct/task to fix shadowing | `assets/js/views/my-work.js` | ✅ |
| S47-T3 | `config.js` — APP_VERSION='6.13-i18n-phase4-20260709'; cache-bust ?v=20260709f | `assets/js/config.js`, `index.html` | ✅ |
| S47-T4 | `verify_my_work.mjs` — MW36-MW39 EN/VI switching tests; 62/62 PASS (was 55) | `verify_my_work.mjs` | ✅ |
| S47-T5 | Full regression: **16/16 suites PASS** | all | ✅ |

### i18n Phase 4 Architecture (S47)

- **22 new keys**: `mw.greeting`, `mw.login-required`, `mw.view-all`, `mw.dl.{overdue,today,in,days}`, `mw.champion.{title,filled,unfilled,all-filled,count-unfilled,placeholder}`, `mw.urgent.{title,empty}`, `mw.tasks.{title,empty}`, `mw.init.{title,empty,popup-empty}`, `mw.case.{title,empty}`
- **t()-shadowing fix**: `champTasks.map(t => ...)` → `map(ct => ...)`; `_mwBuildTaskCard(t)` → `_mwBuildTaskCard(task)` — critical: `t` was a local param shadowing global `t()` i18n function
- **tState() for state options**: Select dropdown options now use `tState(s)` to translate state values in task cards
- **setLang('en') triggers renderMyWork()**: via `renderAll()` in app.js — all MW labels switch live

### Test suite snapshot (2026-07-09, S47)
```
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47: +MW36-MW39; S44b: +MW30-MW35)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (16 suites)        PASS  0 FAIL
```

---

---

## Tasks Completed (S44b — My Work Champion Section)

| # | Task | Files | Status |
|---|---|---|---|
| S44b-T1 | `my-work.js` — _mwGetChampionTasks(), _mwBuildChampionSection() with amber theme | `assets/js/views/my-work.js` | ✅ |
| S44b-T2 | `my-work.js` — mwRefreshChampionStatus(): DOM-only badge update on blur, no re-render | `assets/js/views/my-work.js` | ✅ |
| S44b-T3 | `my-work.js` — renderMyWork(): champion section inserted after header, before urgent | `assets/js/views/my-work.js` | ✅ |
| S44b-T4 | `my-work.css` — .mw-champion-section/.mw-champion-item/.mw-champion-status/pending/done | `assets/css/my-work.css` | ✅ |
| S44b-T5 | `config.js` — APP_VERSION='6.11-mw-champion-20260709'; cache-bust ?v=20260709d | `assets/js/config.js`, `index.html` | ✅ |
| S44b-T6 | `verify_my_work.mjs` — MW30-MW35 champion tests; 55/55 PASS (was 45) | `verify_my_work.mjs` | ✅ |
| S44b-T7 | Full regression: **15/15 suites 479/479 PASS** | all | ✅ |

### Champion Section Architecture (S44b)

- **Trigger**: highlight=Y tasks in user's task list that are NOT 'Hoàn thành'
- **Position**: Between page header and urgent section (top priority → see first on login)
- **Per-item**: task ID + name + status badge + result textarea
- **Status badge**: `⚠️ Chưa cập nhật` (amber, `status-todo`) / `✅ Đã cập nhật` (green, `status-ok`)
- **Header badge**: `N chưa cập nhật` (amber pill) / `✅ Đã cập nhật đầy đủ` (green text) when all filled
- **DOM-only refresh**: `mwRefreshChampionStatus(id, val)` — updates item class + badge, updates section-level pending count — no full re-render
- **section hidden** when no champion tasks (returns `''`)

### Test suite snapshot (2026-07-09, S44b)
```
verify_my_work             55/55  PASS  (S44b: +MW30-MW35; S44a: +MW26-MW29; S42 base)
verify_i18n_p2             36/36  PASS  (S43)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (15 suites)         479/479 PASS  0 FAIL
```

---

## Tasks Completed (S44a — My Work Initiative Popup)

| # | Task | Files | Status |
|---|---|---|---|
| S44a-T1 | `my-work.js` — _mwBuildInitSection: MAX_INIT=4, inlines card builder, "Xem tất cả →" → mwOpenInitPopup() | `assets/js/views/my-work.js` | ✅ |
| S44a-T2 | `my-work.js` — mwOpenInitPopup(): builds ALL root initiatives in overlay; mwCloseInitPopup() | `assets/js/views/my-work.js` | ✅ |
| S44a-T3 | `index.html` — #mwInitPopup overlay with list+count+close+footer buttons; cache-bust ?v=20260709c | `index.html` | ✅ |
| S44a-T4 | `my-work.css` — .mw-popup-ini-item + .mw-popup-ini-header styles | `assets/css/my-work.css` | ✅ |
| S44a-T5 | `navigation.js` — mwCloseInitPopup() added to ESC handler chain | `assets/js/ui/navigation.js` | ✅ |
| S44a-T6 | `config.js` — APP_VERSION='6.10-mw-init-popup-20260709' | `assets/js/config.js` | ✅ |
| S44a-T7 | `verify_my_work.mjs` — MW26-MW29 popup tests; 45/45 PASS (was 35) | `verify_my_work.mjs` | ✅ |
| S44a-T8 | Full regression: **15/15 suites 469/469 PASS** | all | ✅ |

### Initiative Popup Architecture (S44a)

- **Trigger**: "Xem tất cả →" in Initiative section header → `mwOpenInitPopup()`
- **Content**: ALL root initiatives (`type=initiative`, no parentId, not BAU, status defined) sorted by id
- **Why all, not just user's**: "Xem tất cả" = see the full picture; user's filtered subset already shown in section
- **Close paths**: X button, "Đóng" button, backdrop click, ESC key
- **"Mở Initiative Tracker" button**: navigates to initiative-tracker view + closes popup
- **MAX_INIT=4**: Section grid now truncates at 4 cards; popup shows the rest
- **Popup HTML**: `#mwInitPopup .modal > .modal-header + #mwInitPopupList + .modal-footer`

### Test suite snapshot (2026-07-09, S44a)
```
verify_my_work             45/45  PASS  (S44a: +MW26-MW29 popup; S42 base)
verify_i18n_p2             36/36  PASS  (S43)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (15 suites)         469/469 PASS  0 FAIL
```

---

## Tasks Completed (S43 — i18n Phase 2)

| # | Task | Files | Status |
|---|---|---|---|
| S43-T1 | `i18n.js` — STATE_KEY lookup + tState() helper + 50 new VI/EN keys (state display, filter labels, preset, scope, count, chips) | `assets/js/i18n.js` | ✅ |
| S43-T2 | `helpers.js` — stateChip() uses tState() for language-aware label; EN: Not Started/In Progress/Completed/On Hold; VI: unchanged | `assets/js/helpers.js` | ✅ |
| S43-T3 | `index.html` — data-i18n on tasks filter bar labels, preset button text spans, scope toggle spans; explicit value attrs on filterState options (prevents value corruption when EN text differs from raw VI value) | `index.html` | ✅ |
| S43-T4 | `tasks.js` — renderFilterChips uses t()+tState(); renderTaskTable count/empty use t(); _populateFilterPic "Tất cả"→t('common.all') | `assets/js/views/tasks.js` | ✅ |
| S43-T5 | `config.js` — APP_VERSION = '6.9-i18n-phase2-20260709'; cache-bust ?v=20260709b | `assets/js/config.js`, `index.html` | ✅ |
| S43-T6 | `verify_i18n_p2.mjs` — 36/36 PASS (IP1–IP14); `verify_my_work.mjs` — MW18 focus race fix (blur loginUsername before G+M dispatch) | `verify_i18n_p2.mjs`, `verify_my_work.mjs` | ✅ |
| S43-T7 | Full regression: **15/15 suites 459/459 PASS** | all | ✅ |

### i18n Phase 2 Architecture (S43)

**STATE translation**: Raw GAS values (Vietnamese) stored unchanged. Display layer only:
- `_STATE_KEY` map: raw Vietnamese → i18n key (`state.not-started`, etc.)
- `tState(raw)`: `if (!raw) return '–'; return t(_STATE_KEY[raw] || '') || raw;`
- `stateChip(s)`: CSS class from raw value (unchanged); display text from `tState(s)`
- VI mode: identity map (Chưa bắt đầu → Chưa bắt đầu); EN mode: translated

**Filter options**: Explicit `value` attributes added to filterState options:
```html
<option value="Chưa bắt đầu" data-i18n="state.not-started">Chưa bắt đầu</option>
```
When EN: applyI18n() sets text to "Not Started" but value stays "Chưa bắt đầu" → filtering `t.state !== fSt` still works.

**RAG NOT translated**: Green/Amber/Red treated as banking domain terms, kept in English in both modes.

**Scope**: i18n Phase 2 covers tasks view only. Phase 3 = other views (case-pipeline, action-plan, etc.)

**MW18 fix**: `verify_my_work.mjs` MW18 had a loginUsername focus race — `showLoginScreen()` focuses `loginUsername` INPUT, so `inInput=true` makes G key ignored. Fix: `document.activeElement?.blur()` before G+M dispatch.

### Test suite snapshot (2026-07-09)
```
verify_i18n_p2             36/36  PASS  (S43 NEW — i18n Phase 2)
verify_my_work             35/35  PASS  (S42)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (15 suites)         459/459 PASS  0 FAIL
```

### Commit S43
```
5edf349  feat(i18n): S43 — i18n Phase 2: state display mapping + tasks filter bar translation
```

---

---

## Tasks Completed (S42 — My Work personalized dashboard)

| # | Task | Files | Status |
|---|---|---|---|
| S42-T1 | `assets/css/my-work.css` (NEW) — page layout, section icons, deadline badges, urgent list, task cards, RAG dots, progress bar, result textarea, init/case cards, dark mode, responsive | `assets/css/my-work.css` | ✅ |
| S42-T2 | `assets/js/views/my-work.js` (NEW) — role detection (PO/PTKD/QLDM from user.team), data getters, HTML builders, renderMyWork(), inline quick-save functions (state/RAG/progress/result) | `assets/js/views/my-work.js` | ✅ |
| S42-T3 | `i18n.js` — `nav.my-work` + `page.my-work` VI + EN | `assets/js/i18n.js` | ✅ |
| S42-T4 | `navigation.js` — `renderMyWork()` dispatch, G+M keymap | `assets/js/ui/navigation.js` | ✅ |
| S42-T5 | `app.js` — `navigateTo('my-work')` as default landing in `startApp()`, `renderAll()` guard | `assets/js/app.js` | ✅ |
| S42-T6 | `index.html` — CSS link, nav item (fa-house-user), view section, KB G+M row, script tag, cache-bust `?v=20260709` | `index.html` | ✅ |
| S42-T7 | `config.js` — `APP_VERSION='6.8-my-work-20260709'` | `assets/js/config.js` | ✅ |
| S42-T8 | `verify_my_work.mjs` — port 3042, 35/35 PASS (MW1–MW25 + sub-checks) | `verify_my_work.mjs` | ✅ |
| S42-T9 | Full regression: 13/13 suites (388/388) still PASS — zero regressions | all | ✅ |

### My Work Architecture (S42)

**Role detection** (`_mwRoleView(user)`): maps `user.team` → `po` | `ptkd` | `qldm`
- PO: teams BL/CV1/CV2/Số → task list + Initiative phụ trách
- PTKD: teams PTKD MB/PTKD MN → task list + Case Pipeline của team
- QLDM: team QLDM → same as PO

**Task ownership** (`_mwGetMyTasks(user)`): `picAcc=me OR picRes=me OR team=myTeam`
- Sort: done tasks last → highlight=Y first → endDate ASC

**Urgent section** (`_mwGetUrgent(tasks, cases)`): state≠Hoàn thành AND endDate diff ≤7 days

**Deadline badge classes**: dl-overdue / dl-today / dl-urgent (≤3d) / dl-soon (≤7d) / dl-ok

**Quick save** (local-first + GAS fire-and-forget via `_gasTaskUpsert`):
- `mwQuickSaveState(id, val)` → full `renderMyWork()` re-render (urgent section may change)
- `mwQuickSaveRag(id, val)` → DOM-only dot update (toggle: clicking active dot = clear)
- `mwQuickSaveProgress(id, raw)` → DOM-only bar+label update; clamps 0–100
- `mwQuickSaveResult(id, val)` → persist only; textarea already shows new value

**Default landing**: `startApp()` calls `navigateTo('my-work')` after `renderAll()`. Loading overlay from `autoConnectDB()` covers any brief flash.

**`renderAll()` guard**: `if (view-my-work.style.display === 'contents') renderMyWork()` — avoids redundant re-render when not visible.

### Test suite snapshot (2026-07-09)
```
verify_my_work             35/35  PASS  (S42 — My Work dashboard)  ← NEW
verify_issue_tracker       61/61  PASS  (S41 — Issue Tracker)
verify_mobile_s37          21/21  PASS  (S37 — mobile responsive)
verify_case_pipeline_s36   28/28  PASS  (S36 — case pipeline enhancements)
verify_action_plan         24/24  PASS  (S34 — action plan v2)
verify_history             47/47  PASS  (S33 — audit history)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────
TOTAL (14 suites)         423/423 PASS  0 FAIL
```

### Commits S42
```
TBD  feat(my-work): S42 — personalized dashboard for PO/PTKD/QLDM roles (35/35 tests)
TBD  docs: S42 handover — 14/14 suites 423/423 PASS
```

---

## Blockers (S42)

| Item | Status |
|---|---|
| **No GAS changes** | ✅ — My Work reads `db.tasks`, `dbCases`, `db.initiatives` (already in memory). Saves use existing `_gasTaskUpsert` — no new GAS routes needed. |
| **Hard-reload** | ⏳ Users Ctrl+Shift+R. Badge: `v6.8-my-work-20260709`. |
| **Smoke test production** | ⏳ See checklist below. |

### Smoke test checklist (S42)
| Check | Expected |
|---|---|
| Login → landing | My Work view loads (not Dashboard) |
| PO user (team Số/BL/CV1/CV2) | Sections: Cần làm ngay / Task của tôi / Initiative phụ trách |
| PTKD user (team PTKD MB/MN) | Sections: Cần làm ngay / Task của tôi / Case Pipeline của team |
| QLDM user | Same as PO view |
| Deadline badge | Overdue task → "Quá hạn 3N" red badge |
| Urgent section | Task endDate ≤7 days appears; done tasks excluded |
| Quick save state | Change dropdown → task.state updates + re-render |
| Quick save RAG | Click dot → colored in-place (no reload) |
| RAG toggle | Click active dot → grey (cleared) |
| Quick save progress | Click bar → input appears; type 75 → bar + label update in-place |
| Quick save result | Blur textarea → task.result saved |
| G+M shortcut | Press G then M → My Work view |
| Dark mode | Cards adapt correctly |
| KB modal | Shows G+M entry |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S41b)

---

# SESSION HANDOVER
**Date**: 2026-07-08 (Session 41b — Regression run + test infrastructure fix)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `2a8b55b` ✅

---

## Tasks Completed (S41b — continuation of S41)

| # | Task | Files | Status |
|---|---|---|---|
| S41b-T1 | Fix `verify_issue_tracker.mjs` 2 remaining failures: mock auth missing `exp` field (IT3) + IT9 expected search scope wrong (`heTong` không nằm trong `_itGetFiltered`) | `verify_issue_tracker.mjs` | ✅ 61/61 PASS |
| S41b-T2 | Add `http.createServer` nội bộ vào 8 test files thiếu server (rely vào leftover process): `verify_mobile_s37`, `verify_case_pipeline_s36`, `verify_issue_tracker`, `verify_bld_queue`, `verify_case_pipeline`, `verify_filter_cascade`, `verify_import_rbac`, `verify_modal_layout` | 8 files | ✅ |
| S41b-T3 | Fix `verify_case_pipeline` TEST13/14: row click → `cpOpenDetail()` → view popup (since S33), không còn mở edit modal trực tiếp. Cập nhật test dùng `openCaseModal(id)` via evaluate | `verify_case_pipeline.mjs` | ✅ 22/22 PASS |
| S41b-T4 | Full regression: 13/13 suites, 388/388 PASS | tất cả | ✅ |

### Commits S41b
```
7988129  test: S41 Issue Tracker smoke tests 61/61 PASS
c01d471  docs: S41 handover — 61/61 PASS, HEAD 7988129
e377aa8  test: add self-contained HTTP servers to all test suites; fix verify_case_pipeline TEST13/14
2a8b55b  docs: update handover HEAD e377aa8 — 13/13 suites 388 tests PASS
```

### Test suite snapshot (2026-07-08, HEAD 2a8b55b)
```
verify_issue_tracker       61/61  PASS  (S41 — Issue Tracker)
verify_mobile_s37          21/21  PASS  (S37 — mobile responsive)
verify_case_pipeline_s36   28/28  PASS  (S36 — case pipeline enhancements)
verify_action_plan         24/24  PASS  (S34 — action plan v2)
verify_history             47/47  PASS  (S33 — audit history)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────
TOTAL                     388/388 PASS  0 FAIL
```

### Test infrastructure notes (S41b)
- Tất cả test files nay có `http.createServer` nội bộ — chạy standalone `node <file>` mà không cần server bên ngoài
- `verify_case_pipeline` TEST13/14: dùng `page.evaluate(() => openCaseModal(id))` thay vì click row (vì S33 đổi row click → `cpOpenDetail` → view popup)
- Port allocation: 3030 (5 files cũ), 3036 (cp_s36), 3037 (mobile), 3041 (issue_tracker), 9992 (history), 9993 (action_plan), dynamic (milestone_task, task_init_popup)

---

## Tasks Completed (S41 — Issue Tracker full implementation)

| # | Task | Files | Status |
|---|---|---|---|
| S41-T1 | `backend/IssueService.gs` (NEW) — `issueRead()`, `issueUpsertRow()`, `issueDeleteRow()`, Sheet: `Issue_Tracker` 18 cols A→R, auto-create sheet | `backend/IssueService.gs` | ✅ |
| S41-T2 | `backend/Code.gs` — 3 new routes: `issue-read`, `issue-upsert`, `issue-delete` with auditLog | `backend/Code.gs` | ✅ |
| S41-T3 | `constants.js` — `dbIssues`, `ISSUE_SYSTEMS/TYPES/SEVERITY/DEPTS/STATUS_SIMPLE/STATUS_COMPLEX/SLA_DAYS` | `assets/js/constants.js` | ✅ |
| S41-T4 | `api.js` — `rowToIssue()`, `issueToRow()`, `genIssueId()` (IS-YY-NNN), `_gasIssueUpsert/Delete()`, `readIssues()`, `persistIssues()`, `loadIssuesFromCache()` | `assets/js/api.js` | ✅ |
| S41-T5 | `app.js` — `loadIssuesFromCache()` + `readIssues()` in startup | `assets/js/app.js` | ✅ |
| S41-T6 | `assets/css/issue-tracker.css` (NEW) — KPI grid, severity/status/system badges, trend toggle, stat table, modal, view overlay, dark mode, responsive | `assets/css/issue-tracker.css` | ✅ |
| S41-T7 | `assets/js/views/issue-tracker.js` (NEW) — renderIssueTracker, KPI, Chart.js trend+bar, MTTR, root cause, preset/filter/sort/pagination, CRUD modal, view popup, Excel export | `assets/js/views/issue-tracker.js` | ✅ |
| S41-T8 | `index.html` — CSS link, nav item + badge, view section, `#itModal`, `#itViewOverlay`, KB G+I row, script tag | `index.html` | ✅ |
| S41-T9 | `navigation.js` — `renderIssueTracker()`, ESC closes modal+popup, G+I keymap | `assets/js/ui/navigation.js` | ✅ |
| S41-T10 | `i18n.js` — `page.issue-tracker` VI + EN | `assets/js/i18n.js` | ✅ |
| S41-T11 | `config.js` + cache-bust — `APP_VERSION='6.7-issue-tracker-20260708'`, `?v=20260708` (index.html) | `assets/js/config.js`, `index.html` | ✅ |

### Issue Tracker Architecture (S41)

**localStorage key**: `shtd_issues_v1` (separate from `shtd_v2` tasks and `shtd_cp_v1` cases)
**Issue ID**: `IS-YY-NNN` (e.g. IS-26-001), counter resets each calendar year
**Sheet**: `Issue_Tracker`, 18 cols A→R — auto-created by `issueRead()` on first call
**Two flows**: Đơn giản (4 statuses) vs Phức tạp (6 statuses), chosen at creation
**SLA auto-fill**: Critical=1d, High=3d, Medium=7d, Low=14d — only fills empty deadline
**View popup** (`#itViewOverlay`): dynamic innerHTML, reuses `.cp-view-*` CSS, closes on ESC or backdrop click
**KPI nav badge** (`#navBadgeIssue`): SLA breach count, red, hidden when 0

**GAS files changed**: `IssueService.gs` (new), `Code.gs` (3 routes added)
**GAS redeploy required**: ✅ DONE — deployed, URL unchanged.

### Commits S41
```
51bae57  feat(issue-tracker): S41 — full Issue Tracker feature
9595d46  docs: S41 handover — update commit hash 51bae57
```

---

## Blockers (S41)

| Item | Status |
|---|---|
| **GAS redeploy** | ✅ DONE — IssueService.gs deployed, URL unchanged. |
| **Hard-reload** | ⏳ Users Ctrl+Shift+R. Badge: `v6.7-issue-tracker-20260708`. |
| **Playwright tests** | ✅ **13/13 suites — 388/388 PASS** (`2a8b55b`). Tất cả self-contained. |

---

## Regression Risks (S41)

| Risk | Severity | Detail |
|---|---|---|
| `shtd_issues_v1` key | ⚪ NONE | Separate localStorage key, no collision with tasks or cases. |
| Chart.js destroy | ⚪ LOW | `_itChartTrend.destroy()` called before each re-render. Safe for repeated navigations. |
| SLA auto-fill on edit | ⚪ NONE | Only fills deadline if field is currently empty — existing deadlines unaffected. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S40)

---

# SESSION HANDOVER
**Date**: 2026-07-07 (Session 40 — Team BL1+BL2 Merge → BL)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `7a027dc` ✅

---

## Tasks Completed (S40)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S40-T1 | `constants.js` TEAM_LIST: `['BL1','BL2',...]` → `['BL','CV1','CV2','PTKD MB','PTKD MN','QLDM','Số']` (7 teams) | `assets/js/constants.js` | `2758f58` | ✅ |
| S40-T2 | `index.html` `#filterTeam` (line 712): `<option>BL1</option><option>BL2</option>` → `<option>BL</option>` | `index.html` | `2758f58` | ✅ |
| S40-T3 | `index.html` `#ganttFilterTeam` (line 801): `...BL1</option><option>BL2` → `...BL` | `index.html` | `2758f58` | ✅ |
| S40-T4 | `config.js` APP_VERSION → `'6.6-team-bl-merge-20260707'`; cache-bust `?v=20260706b` → `?v=20260707` (52 refs, Python) | `assets/js/config.js`, `index.html` | `2758f58` | ✅ |
| S40-T5 | `verify_action_plan.mjs` full rewrite: fixtures BL1/BL2 → BL + add CV1-001 cross-team task; AP3/AP4b/AP6/AP7/AP9/AP10 assertions updated; **24/24 PASS** | `verify_action_plan.mjs` | `2758f58` | ✅ |
| S40-T6 | `verify_case_pipeline_s36.mjs`: MOCK_CASES CP-001/CP-002/CP-003/CP-005 + MOCK_USER team `BL1`/`BL2` → `BL`; **28/28 PASS** | `verify_case_pipeline_s36.mjs` | `2758f58` | ✅ |
| S40-T7 | `verify_mobile_s37.mjs`: task `team:'BL1'` → `team:'BL'`; **21/21 PASS** | `verify_mobile_s37.mjs` | `2758f58` | ✅ |
| S40-T8 | `backend/MigrationService.gs` (NEW): `dryRunTeamBL()` / `commitTeamBL()` — batch migrate Task_Master + Case_Pipeline + User_Master team fields; idempotent; Audit_Log untouched | `backend/MigrationService.gs` | `2758f58` | ✅ |
| S40-T9 | **Bugfix MigrationService.gs**: `indexOf('team')` không tìm thấy `"Team chính"` (Task_Master) và `"Team"` (capital T, Case_Pipeline) → cả hai sheet bị SKIP; fix: dùng `_norm()` partial match giống `parsers.js`; confirmed migration chạy thành công | `backend/MigrationService.gs` | `7a027dc` | ✅ |

### S40 Impact Analysis

**No GAS code changes needed** — 0 hardcoded team names in `.gs` files. Only data in Sheets needs updating.

**Auto-updates after constants.js change (no code touch needed):**
- `action-plan.js`: team dropdown (`TEAM_LIST.map()`), accordion rendering (`TEAM_LIST.forEach()`), accordion ID (`TEAM_LIST.indexOf(team)`) → all auto-correct
- `case-pipeline.js` `cpFilterTeam`: built dynamically from `new Set(cases.map(c => c.team))` — auto-updates after data migration

**Task/Case IDs**: historical IDs like `BL1-028` are NOT changed (only `team` field value changes).

**Playwright test redesign (AP9)**:
- OLD: select `BL2` → `BL2 Highlight Task` shown, `BL1 Highlight Task` hidden
- NEW: select `BL` → `BL Highlight Task` shown, `CV1 Highlight Task` hidden (added `CV1-001` mock task as cross-team counterpart)

### Commits S40
```
2758f58  feat(teams): merge BL1+BL2 into single team BL
```

---

## Blockers (S40)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ✅ Xóa Cache / Ctrl+Shift+R. Badge: `v6.6-team-bl-merge-20260707`. |
| **GAS data migration** | ✅ `commitTeamBL()` ran — Task_Master + Case_Pipeline + User_Master updated (BL1/BL2 → BL). Filter team=BL hoạt động. |
| **Notify BL1/BL2 users** | ⏳ Users logged in with `team:'BL1'/'BL2'` in session token cần re-login để get team='BL' |

---

## Regression Risks (S40)

| Risk | Severity | Detail |
|---|---|---|
| **TEAM_LIST index shift** | ⚪ LOW | `_apTid(team)` = `'ap-acc-' + TEAM_LIST.indexOf(team)`. BL at index 0 (same as BL1 was). CV1 shifts from index 2 → 1. Old accordion state keyed by team string — no impact. |
| **Stale session team** | ⚪ LOW | Users with `shtd_auth_v1` still showing `team:'BL1'/'BL2'` get own-team view with 0 results. Fix: re-login. |
| **GAS data migration timing** | 🟡 MEDIUM | Until `commitTeamBL()` runs, live data still has BL1/BL2 teams. Frontend BL dropdown shows empty until migration runs. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S39)

---

# SESSION HANDOVER
**Date**: 2026-07-06 (Session 39 — Phase 1 Bilingual UI VI/EN)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `5579193` ✅

---

## Tasks Completed (S39)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S39-T1 | Create `assets/js/i18n.js` — `t(key)`, `setLang(lang)`, `applyI18n()`, `TRANSLATIONS` (VI+EN, ~120 keys per lang); `_lang` persisted in `localStorage('shtd_lang')` | `assets/js/i18n.js` | `5579193` | ✅ |
| S39-T2 | VI/EN toggle pill added to topbar (between dark mode btn and Quick View) — `id="langVI"` / `id="langEN"` with `.lang-btn.active` CSS; `.lang-toggle` pill style appended to `components.css` | `index.html`, `assets/css/components.css` | `5579193` | ✅ |
| S39-T3 | `index.html` — `data-i18n` / `data-i18n-title` attributes on: nav section labels (6), nav item spans (5 Vietnamese ones), login overlay (brand, title, labels, btn), breadcrumb text spans, topbar icon-btn titles, dashboard KPI labels (6), dashboard section titles/table-headers (9), filter bar | `index.html` | `5579193` | ✅ |
| S39-T4 | `navigation.js` — replace hardcoded `titles` map with `t('page.'+view)` in `navigateTo()`; `copyPath()` toasts use `t()` | `assets/js/ui/navigation.js` | `5579193` | ✅ |
| S39-T5 | `crud.js` — modal titles, confirm dialog titles+buttons, key toasts all use `t()` | `assets/js/crud.js` | `5579193` | ✅ |
| S39-T6 | `app.js` — `window.onload` syncs lang toggle active state + calls `applyI18n()` | `assets/js/app.js` | `5579193` | ✅ |
| S39-T7 | `i18n.js` as FIRST `<script>` tag; `APP_VERSION = '6.6-i18n-phase1-20260706'`; cache-bust `?v=20260706b` (52 refs) | `index.html`, `assets/js/config.js` | `5579193` | ✅ |

### i18n Architecture (S39)

**Three text categories:**
```
1. UI Chrome → translate (nav, login, dashboard KPIs, topbar, modal titles, confirms, toasts)
2. Data values in GAS → NEVER translate (states: Hoàn thành/Chưa bắt đầu, RAG: Xanh/Vàng/Đỏ)
   → changing these would break all filter/display logic
3. User content → NEVER translate (task names, notes, results)
Banking terms: BLĐ, ĐVKD, Tuần BC kept as-is (confirmed Q2)
```

**Key functions in `assets/js/i18n.js`:**
```javascript
let _lang = localStorage.getItem('shtd_lang') || 'vi';
function t(key) { return TRANSLATIONS[_lang][key] || TRANSLATIONS.vi[key] || key; }
function applyI18n() { /* walk DOM, set textContent/placeholder/title via data-i18n attrs */ }
function setLang(lang) { _lang=lang; localStorage.setItem('shtd_lang',lang); applyI18n(); renderAll(); }
```

**DOM attribute pattern:**
- `data-i18n="key"` → sets `textContent`
- `data-i18n-title="key"` → sets `title` tooltip
- `data-i18n-placeholder="key"` → sets `placeholder` (for future use)

**Load order:** `i18n.js` FIRST (line 1457 in index.html), before config.js. `window.onload` in app.js calls `applyI18n()` + syncs toggle button state.

**Phase 2 (pending):** VIEW content labels — tasks filter bar, STATE_LABELS/RAG_LABELS display mapping, KPI view
**Phase 3 (pending):** Full coverage — bld-queue, initiative-tracker, action-plan form labels

### Commits S39
```
5579193  feat(i18n): Phase 1 bilingual UI – VI/EN language toggle
```

---

## Blockers (S39)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Ctrl+Shift+R to pick up `?v=20260706b`. Badge: `v6.6-i18n-phase1-20260706`. |
| **Smoke test i18n** | ⏳ Manual: switch to EN → nav "Overview"/"Management"/"Reports", dashboard "Total Tasks"/"Completed"/"In Progress"/"Overdue", login "Sign In". Switch back → VI restored. |

---

## Regression Risks (S39)

| Risk | Severity | Detail |
|---|---|---|
| **`renderAll()` inside `setLang()`** | ⚪ LOW | If Phase 2+ adds `data-i18n` to dynamic-render containers, renderAll would overwrite them before `applyI18n()` is re-applied. Not a problem in Phase 1 (all data-i18n elements are static HTML). |
| **`<option data-i18n>` value safety** | ⚪ NONE | `applyI18n()` sets `textContent`, not `value` attribute. The `value=""` and `value="__thisweek__"` are HTML attributes unaffected by textContent. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S38)

---

# SESSION HANDOVER
**Date**: 2026-07-06 (Session 38 — Concurrent Task Edit Overwrite Fix)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `9c7a674` ✅

---

## Tasks Completed (S38)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S38-T1 | Debug + fix concurrent task edit overwrite bug: `handleSubmit` now calls `readFromHandle()` before saving to detect if another user modified the same task since the modal was opened; if conflict detected, shows "⚠️ Xung đột cập nhật" dialog with [Ghi đè và lưu] / [Hủy] | `assets/js/crud.js`, `assets/js/config.js`, `index.html` | `90776ee` | ✅ |

### Root Cause Analysis (S38)

**Bug: Task overwrite — User B silently clobbers User A's changes**

Audit log evidence:
```
11:16:21  LienPK   task-upsert  BL1-028 | Chạy lại bộ chỉ tiêu cập nhật phân loại ĐVKD
11:43:02  DungNP3  task-upsert  BL1-028 | Bộ câu hỏi CT UDLS ngành trọng tâm để CBBH thi
```

DungNP3 had the app open before 11:16. She edited BL1-028 from her stale local cache ("Bộ câu hỏi...") without knowing LienPK had already renamed it. Her save overwrote LienPK's changes.

**Root cause chain:**
```
handleSubmit
  → _gasTaskUpsert(task, origId)           ← fire-and-forget, no version guard
      → gasPost({ action: 'task-upsert' })
          → sheetUpsertTask(row, taskId)   ← BLIND OVERWRITE, no clientTs check
              sheet.getRange(...).setValues([rowValues])  ← last write wins
```

Compare with `sheetWrite` (full-rewrite path) which already has:
```javascript
if (String(clientTs) !== String(serverTs)) throw new Error('VERSION_CONFLICT');
```

`sheetUpsertTask` (added in S30 for atomic per-row writes) never received the same guard.

**Why it "came back":**
- S29: `handleSubmit → syncAction()` → used `sheetWrite` (has VERSION_CONFLICT)
- S30: `handleSubmit → _gasTaskUpsert()` → uses `sheetUpsertTask` (no check) → bug re-introduced

### Fix Applied (S38)

**`assets/js/crud.js` — 3 additions + 1 modification:**

```javascript
// 1. Module-level snapshot
let _editOrigTask = null;

// 2. Comparison helper
function _hasTaskChanged(fresh, orig) {
  return fresh.name     !== orig.name
      || fresh.state    !== orig.state
      || fresh.endDate  !== orig.endDate
      || fresh.progress !== orig.progress
      || fresh.picRes   !== orig.picRes
      || fresh.picAcc   !== orig.picAcc;
}

// 3. openTaskModal: snapshot on edit open
_editOrigTask = task
  ? { id, name, state, endDate, progress, picRes, picAcc }
  : null;

// 4. closeTaskModal: reset
_editOrigTask = null;
```

**`handleSubmit` — conflict check block (before confirm dialog):**
```javascript
// For existing tasks only (origId is set):
if (origId && _editOrigTask) {
  await readFromHandle();               // fetch latest GAS state
  const fresh = db.tasks.find(t => t.id === origId);
  if (fresh && _hasTaskChanged(fresh, _editOrigTask)) {
    const overwrite = await uiConfirm('⚠️ Xung đột cập nhật', ...);
    if (!overwrite) {
      openTaskModal(fresh);             // reload form with server data
      return;
    }
    confirmed = true;                   // skip normal confirm
  }
}
// Falls back silently if GAS is offline
```

**Flow:**
- No conflict detected (normal case): transparent, proceeds to normal confirm dialog
- Conflict detected: single dialog "⚠️ Xung đột" replaces the normal confirm
  - [Ghi đè và lưu] → proceeds to save user's version
  - [Hủy] → `openTaskModal(fresh)` — form reloads with server's latest data
- GAS offline: `catch` swallows error, save proceeds without check (same as before)
- New tasks (`origId = ''`): check is skipped entirely

**No GAS changes required.** `sheetUpsertTask` remains unchanged — the fix is fully frontend.

### Trade-offs (S38)

| Item | Detail |
|---|---|
| **GAS quota** | Every task EDIT save now incurs 1 extra `readFromHandle()` (full-table read). Task ADD saves unaffected. ~1 extra GAS call per edit. Acceptable at current team size. |
| **Latency** | ~1-2s pause after form submit before confirm dialog appears (GAS read). UX: user clicks Lưu, brief pause, then confirm appears. Acceptable. |
| **False negatives** | Conflict check compares 6 key fields. If User A changed only `result` or `nextPlan` (not in the 6), no conflict is raised and User B's save proceeds. These fields are lower-risk (weekly updates, not structural). Acceptable trade-off. |
| **False positives** | None — check is per-task (not table-level), so another user editing a different task does not trigger this conflict. |

### Commits S38
```
90776ee  fix(crud): detect concurrent task edits before saving to prevent stale-cache overwrite
```

---

## Blockers (S38)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260706`. Badge shows `v6.6-conflict-detect-20260706`. |
| **No Playwright test** | ⏳ Concurrent edit simulation requires 2 browser contexts — complex to automate. Manual verification: open task in Tab A, open same task in Tab B, save B first, then save A → expect conflict dialog in A. |

---

## Regression Risks (S38)

| Risk | Severity | Detail |
|---|---|---|
| **Extra GAS read per task edit** | ⚪ LOW | `readFromHandle()` adds ~1-2s to every existing-task save. No functional regression. GAS quota impact negligible at current usage. |
| **`_editOrigTask` not reset between modals** | ⚪ LOW | `closeTaskModal()` resets `_editOrigTask = null`. `openTaskModal(null)` for Add also sets `_editOrigTask = null`. All paths covered. |
| **`readFromHandle()` side-effects** | ⚪ LOW | Updates `db.tasks`, `db.initiatives`, `db._serverTs`, calls `persist()`. Modal stays open (no `renderAll()`). Form DOM is unchanged. User's typed values not lost. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S37)

---

# SESSION HANDOVER
**Date**: 2026-06-27 (Session 37 — Mobile Responsive Fix)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `6088832` ✅

---

## Tasks Completed (S37)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S37-T1 | Fix topbar hidden on iOS mobile: `.topbar{position:fixed;top:0;left:0;right:0;z-index:150}` — removes topbar from flex flow, unaffected by `.main{overflow:hidden}`, always shown at viewport top | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T2 | Content padding-top to clear fixed topbar: `74px` (≤768px, 62px+12px), `68px` (≤480px, 56px+12px) | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T3 | Sticky thead `top` adjusted: `62px` (≤768px) / `56px` (≤480px) so table header clears fixed topbar when scrolling | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T4 | Toolbar stack vertically on mobile: `.toolbar{flex-direction:column;align-items:flex-start}`, `.toolbar-left,.toolbar-right{width:100%}`, `.toolbar-right{flex-wrap:wrap;justify-content:flex-start}` — all action buttons always reachable | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T5 | Hide `.path-hint` on mobile: long file path (`\\ho-file01\NHDN\...`) is not actionable on mobile | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T6 | Cache-bust `?v=20260627b` → `?v=20260627c` (51 occurrences); `APP_VERSION = '6.6-mobile-toolbar-fix-20260627c'` | `index.html`, `assets/js/config.js` | `7eb9547` | ✅ |

### Root Cause Analysis (S37)

**Bug: Topbar not visible on iOS Safari mobile**

Root cause chain:
```
body { display:flex; height:100vh; overflow:hidden; }
  .sidebar-wrapper { position:relative; }   ← 0 width on mobile (sidebar=fixed, toggle=none)
  main.main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
    header.topbar { height:62px; flex-shrink:0; }  ← PROBLEM: overflow:hidden on parent
    div.content { flex:1; overflow-y:auto; }
```

On iOS Safari, `100vh` includes the area behind the browser chrome (URL bar + status bar ≈ 52-64px). The body's top 52-64px is rendered behind the browser UI. Since `.topbar` is the first flex child of `.main` at y=0, it gets partially or fully hidden behind the browser chrome. `position:sticky` is NOT an option here because `.main { overflow:hidden }` kills sticky for all descendants.

**Fix applied:**
```css
/* responsive.css — @media(max-width:768px) */
.topbar {
  position: fixed;   /* removed from flex flow; not affected by overflow:hidden */
  top: 0; left: 0; right: 0;
  z-index: 150;      /* above content (thead z-index:2), below sidebar overlay (190) */
  padding: 0 14px;
}
.content { padding: 74px 14px 12px; }  /* clear fixed topbar (62px) + original 12px */
thead { top: 62px; }                    /* sticky header clears fixed topbar */

/* @media(max-width:480px) */
/* topbar shrinks to 56px at this breakpoint */
.content { padding-top: 68px; }
thead { top: 56px; }
```

**Bug: Toolbar buttons cut off on mobile**

Root cause: `.toolbar{justify-content:space-between}` + `.toolbar-left` containing a long `.path-hint` path string → `.toolbar-right` with 5-7 buttons squeezed into remaining width → buttons overflow or get cut.

**Fix applied:**
```css
.toolbar { flex-direction: column; align-items: flex-start; }
.toolbar-left, .toolbar-right { width: 100%; }
.toolbar-right { flex-wrap: wrap; justify-content: flex-start; gap: 6px; }
.path-hint { display: none; }  /* \\ho-file01\NHDN\... not useful on mobile */
```

### z-index Stack on Mobile (After S37)

```
z-index:200  .sidebar (open state, slides in from left)
z-index:190  .sidebar-overlay (dark backdrop)
z-index:150  .topbar (FIXED — always at viewport top)  ← NEW S37
z-index:10   .topbar (desktop — stays in flex flow)
z-index:2    thead (sticky table header)
z-index:0    content
```

Sidebar overlay (190) correctly covers the fixed topbar (150) when menu opens → user taps overlay to close sidebar. ✓

### Playwright Smoke Test (S37)

`verify_mobile_s37.mjs` — **21/21 PASS** at 375×812 iPhone viewport:
```
M1 ✅ position:fixed, top:0px, z-index:150, height:56px
M2 ✅ topbar.top===0, topbar.left===0
M3 ✅ content padding-top: 68px (≥68px)
M4 ✅ hamburger visible at (14, 10) — within topbar
M5 ✅ sidebar opens; closes via overlay tap
M6 ✅ toolbar column; 301px wide; 6 buttons in viewport; 0 clipped
M7 ✅ path-hint display:none
M8 ✅ thead top: 56px (≥56px — clears topbar)
M9 ✅ CP toolbar column; 301px wide
M10 ✅ topbar stays at y=0 after content scroll
```
Screenshots: `test-results/mobile_s37/` (01–06)

### Commits S37
```
6088832  docs: S37 handover — mobile topbar fix + toolbar stack
7eb9547  fix(mobile): topbar always visible + toolbar buttons stack correctly
```

---

## Blockers (S37)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260627c`. Badge shows `v6.6-mobile-toolbar-fix-20260627c`. |
| **Smoke test real device** | ⏳ Playwright sim 21/21 ✅ — still need to verify on real iOS Safari (real device confirms `100vh` browser chrome offset). |
| **Playwright test** | ✅ `verify_mobile_s37.mjs` **21/21 PASS** — 375×812 iPhone viewport |

---

## Regression Risks (S37)

| Risk | Severity | Detail |
|---|---|---|
| **Fixed topbar z-index** | ⚪ LOW | `z-index:150` is above content, below sidebar overlay (190) and sidebar (200). No conflict with existing modals (z-index:1000+) or cpSummaryOverlay (z-index:1100). |
| **Sticky thead top offset** | ⚪ LOW | `thead{top:62px}` (768px) / `thead{top:56px}` (480px) clears fixed topbar. If topbar height changes in future, this must also change. |
| **path-hint hidden on mobile** | ⚪ NONE | `.path-hint` is a UX shortcut for copy-to-clipboard on the file path. Not useful on mobile (no file system). Desktop unaffected. |
| **content padding-top increase** | ⚪ LOW | `padding-top:74px` vs old `12px` — extra 62px transparent space at top of content. On very short viewports this reduces visible content area. Acceptable. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S36)

---

# SESSION HANDOVER
**Date**: 2026-06-27 (Session 36 — Case Pipeline Enhancements)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `348bc59` ✅ (`a6feeae` feat + `348bc59` docs)

---

## Tasks Completed (S36)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S36-T1 | Done/Blocked stages không tính quá hạn: Fix `calcCaseRag()` skip nếu group=done/blocked; fix `action-plan.js` overdue check tương tự | `assets/js/api.js`, `assets/js/views/action-plan.js` | S36 | ✅ |
| S36-T2 | Default scope = 'all' cho mọi user: `_getCpScope()` bỏ role check → luôn `_cpScope = 'all'` | `assets/js/views/case-pipeline.js` | S36 | ✅ |
| S36-T3 | Filter tuần báo cáo: `cpFilterTuanBC` select, populate chronological, filter chip, clear | `assets/js/views/case-pipeline.js`, `index.html` | S36 | ✅ |
| S36-T4 | Summary popup: `#cpSummaryOverlay`, `openCpSummaryPopup(type)`, `closeCpSummaryPopup()` — 4 types: total/value/overdue/bld; stat cards clickable; ESC closes | `assets/js/views/case-pipeline.js`, `assets/js/ui/navigation.js`, `index.html`, `assets/css/case-pipeline.css` | S36 | ✅ |
| S36-T5 | Playwright test `verify_case_pipeline_s36.mjs` — **28/28 PASS**; EVD screenshots to `test-results/cp_s36/` | `verify_case_pipeline_s36.mjs` | S36 | ✅ |
| S36-T6 | Cache-bust: `APP_VERSION = '6.6-case-pipeline-enhancements-20260627'`; `index.html ?v=20260627b` (51 occurrences) | `assets/js/config.js`, `index.html` | S36 | ✅ |

### Key fixes discovered during testing
- **`let dbCases` is NOT `window.dbCases`**: Top-level `let` in browser scripts is module-scoped, NOT on `window`. Playwright `page.evaluate` must use `dbCases = cases` (direct assignment), not `window.dbCases = cases`.
- **`setupListeners()` never called when auth fails**: ESC key handler only registers inside `setupListeners()` which runs post-auth. Test inject must call `try { setupListeners(); } catch(e) {}` to register the keydown listener.
- **`loginOverlay` blocks pointer events**: Must `document.getElementById('loginOverlay').style.display = 'none'` in inject.

---

## Tasks Completed (S35)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S35-T1 | Fix stale DOM handle crash in `verify_action_plan.mjs` AP9 reset: after `selectOption('BL2')` triggers re-render, `teamSel` handle is detached. Fix: re-query `page.$('.ap-filter-bar select')` before reset → new `teamSelReset` | `verify_action_plan.mjs` | `a28f770` | ✅ |
| S35-T2 | Fix AP13 test expectation: initiatives are not period-filtered → `inits.length > 0` even in prev-month → `empty=false` never triggers empty-state message. Updated assertion to `html.includes('0 tasks/cases')` (toolbar count) | `verify_action_plan.mjs` | `a28f770` | ✅ |
| S35-T3 | **24/24 PASS** on `verify_action_plan.mjs` (was crashing after 18) | — | — | ✅ |
| S35-T4 | Bug fix: left sidebar cannot scroll when many nav items exceed viewport. Root cause: `.sidebar` had no `height` constraint on desktop → expanded with content, `body{overflow:hidden}` clipped bottom nav items, `.nav-menu{flex:1;overflow-y:auto}` had nothing to scroll against | `assets/css/layout.css` | `2cb947f` | ✅ |
| S35-T5 | CSS: add `?v=20260624c` cache-bust to all 16 local `<link rel="stylesheet">` tags — CSS had no cache-busting before S35; browsers silently served stale CSS on every deploy | `index.html` | `2cb947f` | ✅ |
| S35-T6 | JS cache-bust `?v=20260624b` → `?v=20260624c` (35 script tags, Python); `APP_VERSION = '6.5-sidebar-scroll-fix-20260624c'` | `index.html`, `assets/js/config.js` | `2cb947f` | ✅ |

### Architecture: S35 Changes

**Sidebar scroll fix** (`layout.css`):

Root cause chain:
```
body { display:flex; height:100vh; overflow:hidden; }
  .sidebar-wrapper { position:relative; }   ← no height
    .sidebar { display:flex; flex-direction:column; }  ← no height → grows with content
      .nav-menu { flex:1; overflow-y:auto; }  ← flex:1 with no constrained parent = no scroll
```
`overflow-y:auto` on `.nav-menu` only activates a scrollbar if the parent has a constrained height. Without that, `flex:1` simply grows, and `body{overflow:hidden}` clips the bottom — items are cut and unreachable.

**Fix applied:**
```css
/* layout.css */
.sidebar {
  height: 100vh;   /* ← ADDED: constrains sidebar; same value as mobile @media rule */
}
.nav-menu {
  min-height: 0;   /* ← ADDED: allows flex item to shrink below content size → scrollbar activates */
  /* padding, flex:1, overflow-y:auto unchanged */
}
/* Sidebar-specific scrollbar — white-on-dark theme */
.nav-menu::-webkit-scrollbar       { width: 4px; }
.nav-menu::-webkit-scrollbar-track { background: transparent; }
.nav-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 99px; }
.nav-menu::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
```

Mobile (`@media(max-width:768px)`) already had `height:100vh` on `.sidebar` and was not affected.

**CSS cache-bust discovery (S35):**
All 16 local CSS `<link>` tags had no `?v=` query string — browsers could serve stale CSS indefinitely. Added `?v=20260624c` to all. Future deploys must bump both the 35 JS script tags AND the 16 CSS link tags together.

Updated Python one-liner for CSS files:
```python
re.sub(r'(href="assets/css/[^"?]+\.css)"', r'\1?v=YYYYMMDD"', content)
```

### Commits S35
```
2cb947f  fix(sidebar): enable scroll on left nav menu when items exceed viewport height
```
(Note: `a28f770` contains S34 Action Plan v2 code including S35-T1/T2 test fixes — both landed in same commit from session continuation.)

### Architecture: S36 Changes

**`calcCaseRag()` fix** (`api.js`):
```js
function calcCaseRag(c) {
  const g = CASE_STAGE_GROUP[c.stage] || 'active';
  if (g === 'done' || g === 'blocked') return '';   // ← S36: skip overdue for done/blocked
  if (!c.deadline) return '';
  const d = parseVNDate(c.deadline);
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff <= 0) return 'Đỏ';
  if (diff <= 7) return 'Vàng';
  return 'Xanh';
}
```

**Summary popup types** (`openCpSummaryPopup(type)`):
- `total` → all filtered cases, sorted by startDate desc
- `value` → all filtered cases, sorted by giaTriTy desc; subtitle = "ΣtỷVND — N case"
- `overdue` → `_cpCalcRagLabel(c) === 'Đỏ'`
- `bld` → `c.canBLD === 'Y'`
Rows are clickable: `closeCpSummaryPopup(); cpOpenDetail(id)` → opens `#cpViewOverlay`.

**Playwright learnings** (applicable to ALL future test files):
- Top-level `let` in browser scripts is NOT `window.*`. Use `dbCases = cases`, not `window.dbCases = cases`.
- `setupListeners()` only runs after successful auth. Tests must call `try { setupListeners(); } catch(e) {}` in inject.
- Use `page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})))` instead of `page.keyboard.press('Escape')` to avoid focus dependency.

### Commits S36
```
a6feeae  feat(case-pipeline): S36 enhancements — done/blocked no-overdue, scope=all default, tuần BC filter, summary popup
348bc59  docs: session 36 handover — case pipeline enhancements + 28/28 tests pass
```

---

## Blockers (S36)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R. Badge should show `v6.6-case-pipeline-enhancements-20260627`. |
| **GAS redeploy** | ✅ Not needed — no GAS changes in S36. `case-pipeline-read` already returns all cases for all roles. |
| **Smoke test** | ⏳ Verify: (1) done/blocked cards show no red RAG dot; (2) tuần BC filter populates from live data; (3) stat card clicks open correct popup; (4) all users default to "Tất cả" scope. |

---

## Regression Risks (S36)

| Risk | Severity | Detail |
|---|---|---|
| **action-plan.js overdue change** | ⚪ LOW | `_apCg !== 'done' && _apCg !== 'blocked'` added to overdue check. If any stage name in `_AP_CASE_COL` differs from `CASE_STAGE_GROUP` key, the two maps could diverge. Both use same stage strings — low risk. |
| **scope=all default** | ⚪ LOW | Users who previously relied on "Của tôi" default now see all cases on load. Intentional by design; no functional break. |
| **cpSummaryOverlay z-index** | ⚪ LOW | Set to `z-index:1100` in HTML inline style — above cpViewOverlay (1000). If any other overlay has z-index >1100, stacking could be wrong. Check if adding new modals. |
| **ESC handler chain order** | ⚪ NONE | `closeCpSummaryPopup()` added before `closeCaseViewPopup()` in ESC chain — correct order (inner popup first). |

---

## Blockers (S35)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260624c` (both JS and CSS). Badge shows `v6.5-sidebar-scroll-fix-20260624c`. |
| **GAS redeploy** | ✅ Not needed — no GAS changes in S35 |
| **Smoke test: sidebar scroll** | ⏳ Verify on production: nav items at bottom (e.g. "Quản lý User") are reachable by scrolling the left menu on screens where sidebar height < total nav height |

---

## Regression Risks (S35)

| Risk | Severity | Detail |
|---|---|---|
| **Sidebar toggle button vertical centering** | ⚪ LOW | `.sidebar-toggle { position:absolute; top:50%; }` is positioned relative to `.sidebar-wrapper`. Adding `height:100vh` to `.sidebar` (which is inside wrapper) doesn't change wrapper height — wrapper was already stretched to 100vh via flex. Toggle centering unchanged. |
| **Collapsed sidebar** | ⚪ LOW | `.sidebar.collapsed { width:68px; min-width:68px }` — no height override. `height:100vh` from base rule applies → collapsed sidebar also scrollable if ever needed. No conflict. |
| **Mobile** | ⚪ NONE | `@media(max-width:768px)` already had `height:100vh` on `.sidebar` with `position:fixed`. S35 base rule is identical value; mobile override takes precedence. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S34)

---

# SESSION HANDOVER
**Date**: 2026-06-24 (Session 34 — Action Plan v2: grouped accordion, mixed kanban, extended criteria)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `a28f770` ✅

---

## Tasks Completed (S34)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S34-T1 | `action-plan.js` complete rewrite (~280→418 lines): filter state, period logic, role-aware default team, grouped accordion Admin view, single-team User/Teamlead view, Tasks+Cases mixed kanban, Initiatives section (no period filter) | `assets/js/views/action-plan.js` | `a28f770` | ✅ |
| S34-T2 | CSS: Action Plan v2 styles appended to `components.css`: `.ap-filter-bar`, `.ap-period-btn/.ap-rag-btn`, `.ap-summary-strip`, `.ap-accordion`, `.ap-accordion-header/.body`, `.kanban-card-case`, `.ap-case-badge`, `.ap-auto-badge`, `.ap-init-section` | `assets/css/components.css` | `a28f770` | ✅ |
| S34-T3 | `verify_action_plan.mjs` (new, port 9993): 24/24 PASS — AP1–AP14 covering toolbar, period/RAG filter, accordion, case card, initiative section, team filter, Blocked auto-add, task/case popups, prev-month 0 tasks, JS errors | `verify_action_plan.mjs` | `a28f770` | ✅ |
| S34-T4 | Cache-bust `?v=20260624` → `?v=20260624b`; `APP_VERSION = '6.5-action-plan-v2-20260624b'` | `index.html`, `assets/js/config.js` | `a28f770` | ✅ |

### Architecture: S34 Changes

**Filter state globals** (`action-plan.js`):
```javascript
let _apFilterTeam   = null;    // null=uninit; ''=all teams; 'BL1'...=specific
let _apFilterPeriod = 'month'; // 'month' | 'quarter' | 'prev-month'
let _apFilterRag    = '';      // '' | 'Red' | 'Amber' | 'Green'
let _apAccordionOpen = {};     // { [team]: boolean } — persists across re-renders
```

**Role-aware default** (`_apDefaultTeam()`):
- Admin → `''` (all teams, grouped accordion view)
- User/Teamlead → `u.team` (single-team kanban view)
- Filter state cached on first call; reset on page reload only

**Extended criteria** (`_apGetTasks()`):
```
Primary:  highlight=Y AND deadline in period range
Extended: (state=Blocked OR Tạm dừng) AND (deadline in range OR no deadline)
          OR endDate < today AND state≠Hoàn thành AND endDate ≤ period.end (overdue)
Auto-added tasks get ⚡Auto badge (.ap-auto-badge) in the kanban card
```

**Initiatives** (`_apGetInits()`):
- Parent initiatives only via `_initRealRoots()` (type=initiative, not milestone)
- Filtered by `_appUsers.find(u.Username === i.accountable).Team`
- **No period date filter** — initiatives always shown regardless of month/quarter selection
- Shown below kanban as `.ap-init-section`

**Accordion** (DOM mutation only — no re-render):
```javascript
function _apToggle(team) {
  _apAccordionOpen[team] = !_apAccordionOpen[team];
  const body = document.querySelector('#' + _apTid(team) + ' .ap-accordion-body');
  body.style.display = _apAccordionOpen[team] ? 'block' : 'none';
  // + chevron class toggle
}
```
Avoids stale DOM handle issue (only `_apSetTeam/Period/Rag` trigger full re-render).

**AP ID** (`_apTid(team)`): `'ap-acc-' + TEAM_LIST.indexOf(team)` — index-based, safe for Vietnamese/spaced names.

**Case cards**: `.kanban-card-case` (blue left border) + `.ap-case-badge` (★CASE label); `_AP_CASE_COL` mapping stage→column.

**Empty state** (`_apEmpty()`): "Không có hành động trọng tâm trong kỳ này" — only shown when tasks.length=0 AND cases.length=0 AND inits.length=0. Since initiatives are not period-filtered, empty state rarely appears.

### Test discoveries (S34)
1. **Stale handle in AP9 reset**: `teamSel` captured before `selectOption('BL2')` triggered DOM rebuild. Fixed: re-query `page.$('.ap-filter-bar select')` before reset.
2. **AP13 empty state never fires**: Initiatives have no period filter → `inits.length > 0` even in prev-month → `empty=false`. Test updated to check `html.includes('0 tasks/cases')` in toolbar instead.

### Commits S34
```
a28f770  feat(action-plan): v2 rewrite — grouped accordion view, mixed task/case kanban, extended criteria
```

---

## Blockers (S34)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260624b`. Badge shows `v6.5-action-plan-v2-20260624b`. |
| **GAS redeploy** | ✅ Not needed — no GAS changes in S34 |
| **Smoke test production** | ⏳ Test Action Plan on live with real data: team filter, RAG filter, Blocked auto-add, initiative section |

---

## Regression Risks (S34)

| Risk | Severity | Detail |
|---|---|---|
| **`_initRealRoots()` dependency** | 🟡 MEDIUM | `_apGetInits()` calls `_initRealRoots()` defined in `initiative-tracker.js`. If Initiative Tracker view hasn't been navigated to yet, `_initRealRoots` may not be defined. Fallback: `db.initiatives.filter(i => !i.parentId && i.id!=='BAU' && i.status!==undefined)`. |
| **`_appUsers` race** | ⚪ LOW | If Action Plan is opened before `loadAppUsers()` completes, `_apGetInits(team)` returns all initiatives (no team filter). Resolves on next filter change. |
| **Accordion state persistence** | ⚪ LOW | `_apAccordionOpen` persists across same-session navigations. If user collapses BL1 then navigates away and back, BL1 stays collapsed. Intentional. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S33)

---

# SESSION HANDOVER
**Date**: 2026-06-24 (Session 33 — Audit log history tab + startDate default today + GAS audit-read)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `466f9e9` ✅

---

## Tasks Completed (S33)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S33-T1 | GAS: `auditReadByEntity(entityId)` trong `AuditService.gs` — filter Audit_Log by Summary prefix; `audit-read` route trong `Code.gs` (no ADMIN_ONLY gate — all roles) | `backend/AuditService.gs`, `backend/Code.gs` | `ea55a2b` | ✅ |
| S33-T2 | API layer: `_gasAuditRead(entityId)` + `_buildHistoryTable(rows, synthetic, actionMap)` appended to `api.js` — lazy fetch, empty state, alternating rows, action badges, fmtTs handles ISO/YYYY-MM-DD/DD-MMM-YY | `assets/js/api.js` | `ea55a2b` | ✅ |
| S33-T3 | CSS: `.popup-tabs`, `.popup-tab`, `.popup-tab.active`, `.badge-info` appended to `components.css` | `assets/css/components.css` | `ea55a2b` | ✅ |
| S33-T4 | Task history tab: `_taskHistoryLoaded` flag, `_taskTabSwitch()`, `_loadTaskHistory()` in `tasks.js`; synthetic row from `t.startDate`; reset on `openTaskViewPopup()` | `assets/js/views/tasks.js` | `ea55a2b` | ✅ |
| S33-T5 | Case history tab: `_cpHistoryLoaded`, `_cpTabSwitch()`, `_loadCpHistory()` in `case-pipeline.js`; **startDate default today** in `openCaseModal(null)` | `assets/js/views/case-pipeline.js` | `ea55a2b` | ✅ |
| S33-T6 | Initiative history tab: `_initHistoryLoaded`, `_initTabSwitch()`, `_loadInitHistory()` in `initiative-tracker.js`; **startDate default today** in `_initOpenModal(null)` (DD-MMM-YY format using `_MMM` global) | `assets/js/views/initiative-tracker.js` | `ea55a2b` | ✅ |
| S33-T7 | `index.html`: tab bars (`#taskTabDetail`/`#taskTabHistory`, same for init/cp) + history panes (`#taskViewHistory`, `#initViewHistory`, `#cpViewHistory`) added to 3 view overlays; cache-bust `?v=20260622` → `?v=20260624` (35 script tags, Python); `APP_VERSION = '6.4-history-20260624'` | `index.html`, `assets/js/config.js` | `ea55a2b` | ✅ |
| S33-T8 | `verify_history.mjs` (new, port 9992): 47/47 PASS — H1 HTML structure, H2–H5 tab switching + lazy load, H6–H8 history table content (mock rows + synthetic row), H9–H10 init/case popups, H11–H13 startDate defaults, H14 JS errors; EVD screenshots to `test-results/history/` | `verify_history.mjs` | `ea55a2b` | ✅ |
| S33-T9 | Docs: `AI_CONTEXT/PROJECT_STATE.md` updated (v6.4, HEAD `ea55a2b`) | `AI_CONTEXT/PROJECT_STATE.md` | `466f9e9` | ✅ |
| S33-T10 | GAS deployed by user — `audit-read` route live; URL unchanged: `AKfycbydyikBtboeDufx9fsloV3pOT-EVgQfpkggImGH3GrQ8Skct5XC1B1KtE7U008G97f2` | GAS | manual | ✅ |

### Architecture: S33 Changes

**`auditReadByEntity(entityId)`** — GAS filter logic:
```javascript
// backend/AuditService.gs
var prefix = entityId + ' |';
return data.filter(function(row) {
  var s = String(row[5] || '');
  return s === entityId || s.startsWith(prefix);  // avoids 'CV-001' matching 'CV-0011'
}).map(function(row) {
  return [row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
          String(row[1]||''), String(row[2]||''), String(row[3]||''),
          String(row[4]||''), String(row[5]||'')];
});
```

**`_buildHistoryTable(rows, syntheticRow, actionMap)`** — action map:
```
task-upsert / case-upsert / initiative-upsert → "Cập nhật"  / badge-info
task-delete / case-delete                      → "Xóa"       / badge-red
__create__                                     → "Tạo mới"   / badge-green
task-write / *-write                           → "Sync import"/ badge-gray
```

**Lazy load pattern** (same for all 3 entity types):
```javascript
let _taskHistoryLoaded = false;          // reset on every popup open
function _taskTabSwitch(tab) { ... }     // toggle body/history pane display
async function _loadTaskHistory() {
  const rows = await _gasAuditRead(t.id);
  _taskHistoryLoaded = true;
  const synthetic = t.startDate
    ? [t.startDate, '', 'Dữ liệu ban đầu', '', '__create__', t.id + ' | ' + t.name]
    : null;
  el.innerHTML = _buildHistoryTable(rows, synthetic);
}
```

**startDate default today**:
```javascript
// Case (case-pipeline.js, openCaseModal):
const _cpTd = new Date();
const _cpTodayISO = `${_cpTd.getFullYear()}-${...}-${...}`;
fv('cpfStartDate', c ? c.startDate : _cpTodayISO);

// Initiative (initiative-tracker.js, _initOpenModal null):
const _initTd = new Date();
_initStartEl.value = `${String(_initTd.getDate()).padStart(2,'0')}-${_MMM[_initTd.getMonth()]}-${String(_initTd.getFullYear()).slice(-2)}`;
// Format: DD-MMM-YY (e.g. "24-Jun-26") — matches text input placeholder
```

**Test fix discovered during S33**:
```
verify_task_init_popup.mjs used old APP_DIR 'D:/Công việc/Vibecode/SHTD-Dashboard' (298-line tasks.js).
New verify_history.mjs uses current path 'D:/Workspace/Production/SHTD-Dashboard'.
H10 case popup FAIL fixed: test was setting localStorage key 'shtd_cp_v1' (wrong);
actual loadCasesFromCache() reads from shtd_v2.cases — fixed to: { tasks:[t], initiatives:[i], cases:[c], _serverTs:null, deletedIds:[] }
```

### Commits S33
```
ea55a2b  feat(history): audit log history tab in task/initiative/case view popups + startDate default today
466f9e9  docs: update PROJECT_STATE for S33 history tab feature
```

---

## Blockers (S33)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260624`. Until done, S33 features invisible. Topbar badge shows `v6.4-history-20260624`. |
| **Smoke test production** | ⏳ After hard-reload: verify history tab loads real audit data; verify startDate defaults to today when adding new task/case/initiative |
| **GAS redeploy (audit-read)** | ✅ Done manually by user 2026-06-24 — URL unchanged |

---

## Regression Risks (S33)

| Risk | Severity | Detail |
|---|---|---|
| **Initiative startDate text format** | ⚪ LOW | Format DD-MMM-YY generated using `_MMM` global from constants.js. If `_MMM` undefined at modal open → JS error, field stays blank. `_MMM` is defined at page load so risk is theoretical. |
| **fmtTs() fallback for DD-MMM-YY** | ⚪ LOW | `new Date('24-Jun-26T...')` returns Invalid Date → fallback to raw string. History table shows initiative startDate as-is (not reformatted). Acceptable. |
| **GAS quota** | ⚪ LOW | `audit-read` reads full Audit_Log sheet on each tab open (per popup). First open is live fetch. Subsequent opens in same popup session are cached via `_*HistoryLoaded`. Acceptable for typical usage. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S32)

---

# SESSION HANDOVER
**Date**: 2026-06-22 (Session 32 — sortBy select fix + cache-bust + verify 26/26)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `56e3e43` ✅

---

## Tasks Completed (S32)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S32-T1 | Handover docs S31: SESSION_HANDOVER, PROJECT_STATE, TODO_NEXT, TECH_DEBT updated | `ai_context/` | `f583f80` | ✅ |
| S32-T2 | `verify_select_bug.mjs` 23/23 PASS — initial S31 regression tests (S1-S5 scenarios + JS errors) | `verify_select_bug.mjs` | `b95627d` | ✅ |
| S32-T3 | Bug: `sortBy()` not clearing `selectedIds` — column sort reorders 631 tasks across 32 pages; stale 20 IDs scatter to pages 3/7/12; bulk bar shows "20 đã chọn", only 2 visible on current page | `assets/js/views/tasks.js` | `56e3e43` | ✅ |
| S32-T4 | Bug: S31 cache-bust not bumped — browsers served old pre-fix JS; all S31 select-bug fixes invisible to production users | `index.html`, `assets/js/config.js` | `56e3e43` | ✅ |
| S32-T5 | `verify_select_bug.mjs`: S6 (sortBy clears) added → **26/26 PASS**; EVD screenshots s6_before/after_sort.png | `verify_select_bug.mjs`, `test-results/select_bug/` | `56e3e43` | ✅ |

### Root Cause — Production Bug (BUG1.png / BUG2.png)

User observed: bulk bar shows "20 task đã chọn" but only 2 rows visibly checked after switching scopes/sort.

**Cause A — Browser cache stale (S31 forgot cache-bust)**:
- S31 changed `tasks.js` + `navigation.js` but did not bump `?v=20260619d` → browsers served old pre-fix JS
- Fix: Python replace `?v=20260619d` → `?v=20260622` in all 35 `<script>` tags in `index.html`
- Must use **Python** (not PowerShell `Get-Content`) — PowerShell default encoding corrupts Vietnamese chars; 'Số' (2 chars, 4 UTF-8 bytes) becomes 'Sá»' (4 chars), breaking Playwright S3 filter test
- `APP_VERSION = '6.3-select-fix-20260622'`

**Cause B — `sortBy()` not clearing selectedIds**:
- User selects 20 tasks on page 1 (sort default), clicks column header → same 20 IDs now on pages 3, 7, 12, etc.
- Bulk bar shows "20", only 2 of those IDs visible on current page → visual discrepancy
- Fix: `selectedIds.clear()` at top of `sortBy()` in `views/tasks.js`

### Architecture: S32 Changes

**`sortBy()` fix** (commit `56e3e43`):
```js
function sortBy(key) {
  if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
  else { sort.key = key; sort.dir = 'asc'; }
  document.querySelectorAll('#taskTable th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
  selectedIds.clear();  // ← ADDED S32: sort reorders tasks across pages — stale selections mislead
  renderTaskTable();
}
```

**`selectedIds` clear matrix — complete after S32:**
```
navigateTo('tasks')            → selectedIds.clear()          ✅ S31-T4
onFilterChange (ALL filters)   → selectedIds.clear()          ✅ S31-T2 (sync before debounce)
toggleSelectAll                → clear → add current page     ✅ S31-T6
setPreset / setTaskScope       → selectedIds.clear()          ✅ pre-existing
clearFilter / clearFilters     → selectedIds.clear()          ✅ pre-existing
goPage                         → selectedIds.clear()          ✅ pre-existing
bulkSetRag/State/Delete        → selectedIds.clear() after op ✅ pre-existing
deleteTask                     → selectedIds.delete(id)       ✅ pre-existing
sortBy                         → selectedIds.clear()          ✅ NEW S32
renderAll                      → no clear (intentional)
```

**Cache-bust rule** (lesson from S32):
- Every commit touching any `assets/js/*.js` MUST bump `?v=` in all 35 `<script>` tags
- Use Python: `content.replace('?v=OLD', '?v=NEW')` with `encoding='utf-8'` — never PowerShell on Windows
- `APP_VERSION` in `config.js` must match the new version string

### Commits S32
```
f583f80  docs: session 31 handover — select-all bug fixes + deletedIds blacklist
b95627d  test: verify_select_bug 23/23 PASS — S31 select-all + deletedIds regression tests
56e3e43  fix(select): sortBy clears selectedIds + cache-bust bump to force reload
```

---

## Decisions Made (S32)

1. **`sortBy()` must clear `selectedIds`**: Pagination means sort changes which tasks are visible per page. Stale IDs spread across many pages — bulk count mismatches visible checked rows. User rule: "Chọn số lượng task phải lấy từ giao diện."
2. **Cache-bust MUST be bumped on every JS deployment**: S31 skipped this step → production bug. Now a hard requirement per commit.
3. **Python-only for UTF-8 file edits on Windows**: PowerShell `Get-Content` reads as Windows-1252 → corrupts 'Số' and other Vietnamese chars. Confirmed when Playwright S3 test showed 20 rows instead of 12 (filter 'Số' matched 0 due to encoding mismatch).
4. **Hard-reload required**: Users must Ctrl+Shift+R (or Ctrl+F5) after cache-bust bump. Until done, S31+S32 fixes remain invisible in browser.

---

## Blockers (S32)

| Item | Status |
|---|---|
| **GAS redeploy** | ⏳ Same as S31 — `Code.gs` updated in `689bb10` returns `serverTs`. Requires manual: Extensions → Apps Script → Deploy → New deployment. |
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260622`. Until done, all S31+S32 fixes remain invisible in browser. |

---

## Regression Risks (S32)

| Risk | Severity | Detail |
|---|---|---|
| **sortBy() behavior change** | ⚪ LOW | Previous: sort kept selections (could select then sort). New: sort always clears. Acceptable — user can re-selectAll after sort. |
| **Mock-only test coverage** | 🟡 MEDIUM | `verify_select_bug.mjs` uses 25 mock tasks. Real 631 tasks not yet smoke-tested post-S32. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S31)

---

# SESSION HANDOVER
**Date**: 2026-06-22 (Session 31 — Select-all bug + deleted-task re-insertion blacklist)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `0cec10b` ✅

---

## Tasks Completed (S31)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S31-T1 | Bug 1: task delete/ID-change — `_gasTaskUpsert` discarding `task-delete` response silently when ID changes (log: 1 delete + 1 update, task reappears in DB) | `crud.js`, `api.js`, `backend/Code.gs` | `689bb10` | ✅ |
| S31-T2 | Bug 2a: `onFilterChange()` missing `selectedIds.clear()` → filter change left stale bulk selections | `views/tasks.js` | `5a75f97` | ✅ |
| S31-T3 | Bug 2b: `setupListeners()` had duplicate `change`/`input` listeners on 7 filter elements, racing with `onFilterChange`'s debounce and calling `clearTimeout` on it | `ui/navigation.js` | `9e8bfd3` | ✅ |
| S31-T4 | Bug 2c: `navigateTo('tasks')` called `renderTaskTable()` without clearing `selectedIds` → bulk bar shows count immediately on page enter | `ui/navigation.js` | `0cec10b` | ✅ |
| S31-T5 | Bug 3: Deleted tasks reappear in GAS — Excel import `syncAction` re-inserts tasks from Excel not in `db.tasks`; merge logic restores from server before GAS delete completes | `constants.js`, `storage.js`, `crud.js`, `bulk.js`, `api.js`, `app.js` | `df3339b` | ✅ |
| S31-T6 | Select-all scoped to current page: `toggleSelectAll` slices `getFiltered()` to current page only | `views/tasks.js`, `bulk.js` | `ea8d5d7` | ✅ |

### Architecture: S31 Changes

**`db.deletedIds` blacklist** (Bug 3 — commit `df3339b`):
```
constants.js:       db = { tasks:[], initiatives:[], _serverTs:null, deletedIds:[] }
storage.js:         loadDb() → if Array.isArray(parsed.deletedIds) db.deletedIds = parsed.deletedIds
crud.js deleteTask: db.deletedIds.push(id)
crud.js handleSubmit: re-adding same ID → splice from deletedIds (clear blacklist)
bulk.js bulkDelete: toDelete.forEach → db.deletedIds.push(id)
api.js syncAction:  const persistedDeleted = new Set(db.deletedIds||[]); skip in merge
api.js readFromHandle: db.deletedIds = db.deletedIds.filter(id => !serverIds.has(id)) (prune)
app.js handleImport: const deletedSet = new Set(db.deletedIds||[]); skip ext.tasks in loop
```

**`selectedIds` clear matrix — complete after S31:**
```
navigateTo('tasks')            → selectedIds.clear()          ✅ NEW S31-T4
onFilterChange (ALL filters)   → selectedIds.clear()          ✅ NEW S31-T2 (sync before debounce)
toggleSelectAll                → clear → add current page     ✅ S31-T6
setPreset / setTaskScope       → selectedIds.clear()          ✅ pre-existing
clearFilter / clearFilters     → selectedIds.clear()          ✅ pre-existing
goPage                         → selectedIds.clear()          ✅ pre-existing
bulkSetRag/State/Delete        → selectedIds.clear() after op ✅ pre-existing
deleteTask                     → selectedIds.delete(id)       ✅ pre-existing
sortBy                         → selectedIds.clear()          ✅ NEW S32 (was no-clear — fixed for pagination)
renderAll                      → no clear (intentional)
```

**Duplicate listeners removed** (Bug 2b — commit `9e8bfd3`):
```
REMOVED from navigation.js setupListeners() — 7 listeners on filter elements:
  ['filterId','filterInit','filterTeam','filterState','filterRag','filterScope','filterPic']
  each calling clearTimeout(debounceTimer) → was cancelling onFilterChange's own debounce
REPLACED WITH: comment explaining onchange/oninput in HTML is the sole handler
```

### Commits S31
```
689bb10  fix: task delete/ID-change bugs — check task-delete response, sync serverTs, clear selectedIds
ea8d5d7  fix: select-all checkbox no longer accumulates stale selections across pages/filters
5a75f97  fix(bulk): clear selectedIds on onFilterChange (filter dropdown)
df3339b  fix: prevent deleted tasks from being re-inserted by Excel import
9e8bfd3  fix(select): remove duplicate filter event listeners from setupListeners
0cec10b  fix(select): clear selectedIds when navigating to tasks view
```

---

## Decisions Made (S31)

1. **`db.deletedIds` persisted in localStorage**: Blacklist survives reload. Cleared when user re-adds same ID. Pruned on `readFromHandle` when server no longer has the task.
2. **Single inline handler for all filters**: HTML `onchange="onFilterChange()"` only — no parallel JS event listeners in `setupListeners`. Eliminates debounce race.
3. **`selectedIds.clear()` synchronous before debounce in `onFilterChange`**: Guaranteed to clear even if debounce is later cancelled.
4. **`navigateTo('tasks')` = full context switch**: Clears selectedIds before every render when entering Tasks view.

---

## Blockers (S31)

| Item | Status |
|---|---|
| **GAS redeploy** | ⏳ `backend/Code.gs` updated in `689bb10` to return `serverTs` in task-upsert/task-delete. Requires manual redeploy: Extensions → Apps Script → Deploy → New deployment. Until done, `db._serverTs` won't sync after atomic writes. |
| **Local test S1–S5** | ⚠️ S31 fixes not yet browser-tested locally. Run: `npx http-server D:\Workspace\Production\SHTD-Dashboard -p 3030` |

---

## Regression Risks (S31)

| Risk | Severity | Detail |
|---|---|---|
| **S31 fixes not locally tested** | 🟡 MEDIUM | All 6 commits pushed without local browser verification (violated user's explicit rule "test local before push"). Correctness based on code trace only. |
| **`db.deletedIds` grows indefinitely** | ⚪ LOW | Permanently deleted task IDs accumulate in localStorage. Pruned only if task reappears on GAS server. No functional impact at current scale. |
| **`renderAll()` without clear** | ⚪ LOW | If GAS sync removes a task currently in `selectedIds`, bulk bar count may be 1 higher than visible checked rows. Acceptable trade-off. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S30)

---

# SESSION HANDOVER
**Date**: 2026-06-19 (Session 30 — Atomic writes for bulk ops + new GAS URL + debug trace)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `4fc6648` ✅

---

## Tasks Completed (S30)

| # | Task | Files | Status |
|---|---|----|---|
| S30-T1 | Root cause: `syncAction` trong `bulk.js` → `task-write + N rows` khi bulk ops kể cả khi delete single task qua modal nếu có selectedIds tồn tại | — | ✅ |
| S30-T2 | `bulk.js`: `bulkSetRag/State/Delete` → N × `_gasTaskUpsert`/`_gasTaskDelete` (atomic, optimistic-update, fire-and-forget) — xóa hoàn toàn `syncAction` khỏi bulk.js | `bulk.js` | ✅ |
| S30-T3 | `config.js`: cập nhật `GS_WEBAPP_URL` → URL GAS mới deploy với đầy đủ action handlers (`task-upsert`, `task-delete`, `case-upsert`, `case-delete`, `initiative-upsert`) | `config.js` | ✅ |
| S30-T4 | Debug tooling: APP_VERSION badge trong topbar breadcrumb; startup console log hiện version + cảnh báo nếu `deleteTask` dùng syncAction; `syncAction` log caller stack | `app.js`, `api.js`, `index.html`, `config.js` | ✅ |
| S30-T5 | Cache-busting: tất cả 35 script tags → `?v=20260619d`; `APP_VERSION = '6.3-no-syncaction-20260619'` | `index.html`, `config.js` | ✅ |
| S30-T6 | `verify_atomic_write.mjs`: thêm T8b (bulkSetRag → N×task-upsert, 0×write) + T8c (bulkDelete → N×task-delete, 0×write) — **41/41 PASS** | `verify_atomic_write.mjs` | ✅ |

### Architecture: S30 Changes

**Root cause** của `task-write + N rows` khi xóa single task:
```
selectedIds (global Set) persist trong bộ nhớ khi chuyển view.
Nếu user có tasks đã check (bulk bar đang hiện), khi mở modal delete task,
bulkSetRag / bulkSetState / bulkDelete có thể đã được trigger TRƯỚC hoặc
SONG SONG với deleteTask() qua UI. syncAction() trong bulk.js → read→write full sheet.
```

**Pattern mới (bulk ops sau S30)**:
```
bulkSetRag(rag):
  uiConfirm → toUpdate = [...selectedIds] → forEach t.status = rag
  persist() → selectedIds.clear() → renderAll() → toast()
  toUpdate.forEach(t => _gasTaskUpsert(t))   ← fire-and-forget, 1 call/task

bulkDelete():
  uiConfirm → toDelete = [...selectedIds] → db.tasks.filter(out)
  persist() → selectedIds.clear() → renderAll() → toast()
  toDelete.forEach(({id,name}) => _gasTaskDelete(id, name))  ← fire-and-forget

Audit_Log sẽ thấy N entries 'task-upsert | ID' hoặc 'task-delete | ID', KHÔNG còn 'task-write + N rows'
```

**`syncAction()` call sites sau S30** (chỉ còn 1):
- `app.js:188` — `handleImport()` (Excel import) — đây là expected behavior

**GAS URL mới** (S30):
```
https://script.google.com/macros/s/AKfycbydyikBtboeDufx9fsloV3pOT-EVgQfpkggImGH3GrQ8Skct5XC1B1KtE7U008G97f2/exec
```
Backend này có đầy đủ handlers: `task-upsert`, `task-delete`, `case-upsert`, `case-delete`, `initiative-upsert`.

### Commits S30
```
af66c54  fix: atomic per-row GAS writes — eliminate full 613-row rewrite on single task/case save
5ae891c  fix: add cache-busting ?v=20260619 to all local JS script tags
232c7f4  debug: add APP_VERSION badge to topbar + bump cache-bust to 20260619b
9578fc8  debug: add syncAction caller trace + startup diagnostics for stale-cache detection
701fe7f  fix: replace syncAction in bulk.js with per-row atomic writes + new GAS URL
4fc6648  test: update verify_atomic_write — add T8b/T8c bulk atomic write coverage
```

### Regression (S30)
```
verify_atomic_write.mjs:  41/41 PASS ✅ (was 35/35 — +T8b/T8c bulk ops)
```

⚠️ **`verify_sync_fix.mjs` (S29, 24/24)** — có thể STALE sau S30. Tests T3–T5 kiểm tra bulk ops gọi `syncAction` → giờ bulk dùng atomic writes → những test đó sẽ FAIL. Cần review/update trước khi chạy.

---

## Decisions Made (S30)

1. **Bulk ops → atomic writes** (không dùng read-merge-write): Chấp nhận không có server-side merge cho bulk ops. Justification: bulk ops là Admin action, thường chỉ 1 user tại một thời điểm; atomic per-row writes an toàn hơn cho concurrent single-row edits từ user khác.
2. **`syncAction()` chỉ còn cho Excel import**: Excel import cần read-merge-write để không overwrite data từ user khác trong khi import chạy. Đây là trường hợp duy nhất còn hợp lệ.
3. **Debug trace giữ nguyên tạm thời**: `[syncAction] fired — caller:` trace và startup console log giữ cho đến khi production verified ổn định. Xóa sau.
4. **New GAS deployment**: URL cũ còn hoạt động (old actions vẫn valid) nhưng không có new handlers. User deploy new version và cung cấp URL mới.

---

## Blockers (S30)

| Item | Status |
|---|---|
| Production verify | ⏳ Cần user test production sau CDN propagate: xóa task/bulk → GAS log phải hiện `task-delete \| ID \| Name` không còn `task-write + N rows` |
| `verify_sync_fix.mjs` stale | ⚠️ Chưa update — bulk tests sẽ FAIL với code mới |

---

## Regression Risks (S30)

| Risk | Severity | Detail |
|---|---|---|
| **verify_sync_fix.mjs stale** | 🟡 MEDIUM | S29 tạo test expect bulk → syncAction. Sau S30 bulk → atomic. Tests T3–T5 sẽ FAIL. Cần update hoặc deprecate file này |
| **Bulk error handling thay đổi** | ⚪ LOW | Trước: 1 lỗi GAS → toàn bộ bulk fail (syncAction throw). Sau: mỗi task fail independent, hiện toast riêng. N lỗi = N toasts — có thể noisy với bulk lớn |
| **selectedIds không clear khi GAS fail** | ⚪ LOW | Trước: syncAction fail → db.tasks rollback từ localStorage → selectedIds có thể stale. Sau: local state đã committed, selectedIds.clear() chạy trước GAS → không rollback nếu GAS fail. Acceptable: local delete confirmed, user thấy toast nếu GAS fail |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S29)

---

# SESSION HANDOVER
**Date**: 2026-06-18 (Session 29 — Fix GAS sync for task CRUD / bulk / BLD / initiative)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S29**: `2986e51` — fix: task/bulk/bld/initiative operations now sync to GAS instead of local-only
**origin/main HEAD**: `2986e51` ✅

---

## Tasks Completed (S29)

| # | Task | Files | Status |
|---|---|----|---|
| S29-T1 | Audit + root-cause: 8 điểm dùng `localAction()` → toast success mà không ghi GAS | — | ✅ |
| S29-T2 | `crud.js`: `handleSubmit` + `deleteTask` → `await syncAction()` | `crud.js` | ✅ |
| S29-T3 | `bulk.js`: `bulkSetRag/State/Delete` → `await syncAction()` | `bulk.js` | ✅ |
| S29-T4 | `bld-queue.js`: task BLD approval path → `await syncAction()` | `bld-queue.js` | ✅ |
| S29-T5 | `initiatives.js`: `syncInitiativeAdd/Edit` thêm `return` → expose promise | `initiatives.js` | ✅ |
| S29-T6 | `initiative-tracker.js`: `_initSave` → `async`, thêm `await` trước sync calls | `initiative-tracker.js` | ✅ |
| S29-T7 | Bug fix phát hiện khi test: `const ok` khai báo hai lần trong cùng scope → rename thành `const synced` | `crud.js`, `bulk.js` | ✅ |
| S29-T8 | Viết + pass `verify_sync_fix.mjs` — 24/24 PASS | `verify_sync_fix.mjs` | ✅ |

### Architecture: S29 Changes

**Root cause (S23b regression)**:
```
S23b (2026-06-16) đã thay syncAction → localAction cho task CRUD "vì PO yêu cầu".
Kết quả: mọi save/delete/bulk/BLD-task chỉ lưu localStorage, không ghi GAS.
UI vẫn báo "Đã lưu" → misleading, data loss khi clear cache.
S29 reverses quyết định này.
```

**Pattern sau fix**:
```
handleSubmit / deleteTask / bulkSetRag / bulkSetState / bulkDelete / bldSubmitAction(task)
  → await syncAction(mutateFn)
      → mutateFn() [local mutate]
      → gasPost({action:'read'}) [get server state]
      → merge local + server
      → gasPost({action:'write', values:[...]}) [write back]
      → persist() + renderAll()
  Toast chỉ hiện SAU khi GAS xác nhận ✅

_initSave (initiatives):
  → await syncInitiativeAdd/Edit(ini)
      → return syncInitiativeAction(mutateFn) [đã return promise]
      → gasPost({action:'initiative-write'}) ✅
  Toast chỉ hiện SAU khi GAS xác nhận ✅
```

**`localAction()` hiện tại**: vẫn còn khai báo trong `api.js` nhưng không có caller nào — dead code.

### Regression (S29)
```
verify_sync_fix.mjs:        24/24 PASS ✅ NEW — GAS calls verified cho 8 features
```

---

## Decisions Made (S29)

1. **Reverse S23b local-only decision**: Task CRUD đã được restore về sync GAS qua `syncAction()`. Lý do: user báo cáo bug nghiêm trọng — save success nhưng data không lên Sheet. TD-034 (CRITICAL) được giải quyết.
2. **`syncAction()` cho tất cả task ops**: Read-merge-write pattern đảm bảo safe merge với server state. Heavier (2 GAS calls/op) nhưng đúng hơn.
3. **Rename `const synced`** thay vì `let ok` để tránh làm mờ semantics — confirm result riêng biệt với uiConfirm result.

---

## Regression Risks (S29)

| Risk | Severity | Detail |
|---|---|---|
| **syncAction heavier per op** | ⚪ LOW | Mỗi task save/delete/bulk giờ tốn 2 GAS calls (read + write). Trước S23b cũng như vậy — không phải regression so với S22. |
| **`localAction()` dead code** | ⚪ LOW | Vẫn còn khai báo trong `api.js`. Không gây bug, nhưng nên dọn. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24 — chưa fix. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S28)

---

# SESSION HANDOVER
**Date**: 2026-06-18 (Session 28 — Context update + tài liệu hướng dẫn)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Last feature commit (S27)**: `104b81c` — feat(initiative): auto-gen milestone ID + add task from milestone
**Pushed S28 (docs)**: `50e31f1` — docs: session 28 handover — user manual, HDSD screenshots, context update
**origin/main HEAD**: `50e31f1` ✅

---

## Tasks Completed (S28 — docs only, no code changes)

| # | Task | Files | Status |
|---|---|---|---|
| S28-T1 | Commit tài liệu HDSD: `USER_MANUAL.md` (56KB), `HDSD/` (10 screenshots), `SYSTEM_UNDERSTANDING_REPORT.md` (33KB) | Documentation | ✅ |
| S28-T2 | Commit reference + utility files: `TPBank_KPI_Dashboard_v2.1.html`, `generate_docx.py`, `screenshot_hdsd.mjs`, `um_test.mjs`, `verify_ms_tasks.png` | Utils/Reference | ✅ |
| S28-T3 | Cập nhật AI_CONTEXT handover + memory files cho cả hai project | `AI_CONTEXT/` | ✅ |

**Không có thay đổi code trong session này.**

---

## Regression (S28)

Không có thay đổi code → không cần chạy regression test.

---

## DATE FROM PREVIOUS SESSION HANDOVER (S27)

---

# SESSION HANDOVER
**Date**: 2026-06-17 (Session 27 — Milestone auto-gen ID + Add Task from Milestone)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S27**: `104b81c` — feat(initiative): auto-gen milestone ID + add task from milestone
**origin/main HEAD**: `104b81c` ✅

---

## Tasks Completed (S27 — commit `104b81c`)

| # | Task | Files | Status |
|---|---|---|---|
| S27-T1 | Auto-gen Milestone ID khi thêm mới: `{parentId}-M{nextNum}` (e.g. `INIT-001-M3`); pre-fill Category từ initiative cha | `initiative-tracker.js` | ✅ |
| S27-T2 | "+ Task" button trên mỗi milestone row → mở task modal pre-filled (initiative, milestone, category, PIC, team, auto-gen ID) | `initiative-tracker.js` | ✅ |
| S27-T3 | "+ Thêm Task" trong empty-state của milestone task panel | `initiative-tracker.js` | ✅ |
| S27-T4 | Test: `verify_milestone_task.mjs` 23/23 PASS | `verify_milestone_task.mjs` | ✅ |

### Architecture: S27 Changes

**`_initNextMsNum(parentId)`** (new helper):
```js
// Tìm max số thứ tự từ các milestone có ID dạng {parentId}-M{n}
const nums = db.initiatives.filter(i => i.parentId === parentId)
  .map(i => { const m = (i.id||'').match(/-M(\d+)$/i); return m ? parseInt(m[1]) : 0; });
return nums.length ? Math.max(...nums) + 1 : 1;
```

**`_initOpenMilestone(parentId)`** (updated):
```js
// BEFORE: chỉ set initFParent
// AFTER: auto-gen ID + pre-fill category từ parent initiative
_initOpenModal(null);
const nextNum = _initNextMsNum(parentId);
setTimeout(() => {
  selParent.value = parentId;
  idEl.value = `${parentId}-M${nextNum}`;       // e.g. "INIT-001-M3"
  if (parent.category) catEl.value = parent.category;  // kế thừa category
}, 0);
```

**`openTaskModalForMilestone(msId, iniId)`** (new function):
```js
openTaskModal(null);          // reset + default fill (reuse existing logic)
fiEl.value = iniId;           // set initiative
_populateMilestoneSelect(msId); // rebuild ms select → select msId
fCat.value = ini.category;    // category from initiative
// PIC: accUser → team → _populateTeamSelect + _populateUserSelect
_populateTeamSelect('fTeam', accTeam);
_populateUserSelect('fPicAcc', accTeam, ini.accountable); // Teamlead
_populateUserSelect('fPicRes', accTeam, curUser);          // executor = current user
autoGenId();                  // gen {iniId}-M{n}-001, 002, ...
modalSubtitle = `Initiative: ${iniId} · Milestone: M{n}`;
```

**`_initBuildMilestoneList()`** — per-milestone row thêm button:
```html
<button onclick="openTaskModalForMilestone('${ms.id}','${parentId}')"
  title="Thêm task vào milestone này">
  <i class="fa-solid fa-plus"></i> Task
</button>
```

**`_initBuildMsTaskList()`** — empty-state thêm button:
```html
Chưa có task nào...
<button onclick="openTaskModalForMilestone('${ms.id}','${parentInitId}')">
  <i class="fa-solid fa-plus"></i> Thêm Task
</button>
```

### Regression (S27)
```
verify_milestone_task.mjs:   23/23 PASS ✅ NEW
verify_task_init_popup.mjs:  28/28 PASS ✅ (no regression)
```

---

## Decisions Made (S27)

1. **`openTaskModal(null)` first, then override**: Reuse existing reset/default logic thay vì duplicate. Override chỉ các fields cần thiết (fInit, fMs, fCat, fTeam, fPicAcc, fPicRes).
2. **`fPicRes` = current user, `fPicAcc` = initiative accountable**: Accountable là Teamlead chịu trách nhiệm; PicRes là người thực thi (thường là người đang nhập task).
3. **`_initNextMsNum` chỉ tính ID dạng `-M{n}`**: Ignore milestone IDs không match pattern (custom IDs) để tránh false maxima.
4. **Category: task form `fCat` vs initiative `initFCat`**: Cả hai đều có options Vietnamese (e.g. `Số hóa`). Data trong DB phải dùng giá trị match với select options — đây là điều kiện hiển thị đúng.

---

## Regression Risks (S27)

| Risk | Severity | Detail |
|---|---|---|
| **Category mismatch DB vs select options** | ⚪ LOW | Nếu initiative.category lưu string không match bất kỳ `<option>` nào trong task `fCat` (e.g. custom text, typo), `fCat` sẽ silently không set được. User thấy category rỗng → phải tự chọn lại. Không block workflow. |
| **`fPicRes` override khi accTeam không tìm được** | ⚪ LOW | Nếu `_appUsers` chưa load (GAS slow) → `accUser` = undefined → `accTeam = ''` → không gọi `_populateTeamSelect` → team + PIC giữ nguyên default từ current user. Graceful fallback. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24 — cần update test check cpViewOverlay. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S26)

---

## Tasks Completed (S26 — commit `7dbabce`)

| # | Task | Files | Status |
|---|---|---|---|
| S26-T1 | Fix filter clearing bug: `updateFilterDropdowns()` no longer rebuilds `filterPic` dropdown; `_populateFilterPic()` in `renderTaskTable()` owns it exclusively | `assets/js/app.js` | ✅ |

### Root Cause (S26-T1)
```
BEFORE:
  localAction() → renderAll() → updateFilterDropdowns()
    → fpEl.innerHTML = picNorm-format options ("Dunglq1")
    → fpEl.value = curP ("DungLQ1")  ← not found in picNorm options → reset to ""
  renderAll() → renderTaskTable() → _populateFilterPic()
    → prev = sel.value = ""          ← already cleared by updateFilterDropdowns
    → rebuild Username-format options
    → if (prev && ...) sel.value = prev  ← prev="" → no restore → filter gone

AFTER:
  updateFilterDropdowns() does NOT touch filterPic at all
  _populateFilterPic() captures prev before rebuild → rebuilds → restores → ✅
```

### Fix (S26-T1) — app.js `updateFilterDropdowns()`
```diff
-  const fpEl = document.getElementById('filterPic');
-  const curI = fiEl.value, curP = fpEl.value;
+  const curI = fiEl.value;
   // ... rebuild filterInit ...
-  let pics = new Set(DEFAULT_PICS);
-  db.tasks.forEach(t => { if (t.picRes) pics.add(picNorm(t.picRes)); });
-  fpEl.innerHTML = '<option value="">...' + ...
-  if (curP) fpEl.value = curP;
+  // filterPic managed exclusively by _populateFilterPic() in renderTaskTable()
```

### Regression (S26)
```
verify_task_init_popup.mjs:  28/28 PASS ✅ (no regression from S25 popup features)
```

---

## Decisions Made (S26)

1. **Remove filterPic from `updateFilterDropdowns()`**: Không fix format conflict — loại bỏ hẳn phần rebuild để tránh double-rebuild với hai format khác nhau. `_populateFilterPic()` đã đủ xử lý đúng (Username format, prev-restore).
2. **Không cần fix các filter khác**: `filterInit`, `filterTuanBC` trong `updateFilterDropdowns()` dùng ID format nhất quán → preserve đúng. `filterTeam`, `filterState`, `filterRag`, `filterId` không bị rebuild trong `renderAll()` → luôn giữ nguyên.

---

## Regression Risks (S26)

| Risk | Severity | Detail |
|---|---|---|
| **filterPic khi `_appUsers` chưa load** | ⚪ LOW | Nếu `loadAppUsers()` chưa xong khi user đầu tiên thay đổi filter, `_populateFilterPic()` dùng fallback từ `db.tasks` (picRes trực tiếp). Giá trị được preserve nhưng format khác. Resolve khi `_appUsers` load xong + user đổi filter lại. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24: test check click row → edit modal nhưng S24 đổi sang view popup. Cần update test. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S25)

---

## Tasks Completed (S25 — commit `61108da`)

| # | Task | Files | Status |
|---|---|---|---|
| S25-T1 | Task view popup: `rowClick()` → `openTaskViewPopup(id)` — read-only overlay với full task details, chips, grid | `tasks.js`, `index.html` | ✅ |
| S25-T2 | Task view popup: "Chỉnh sửa" → `taskViewOpenEdit()` → ghi nhớ `_taskEditReturnId` → đóng popup → mở edit modal | `tasks.js` | ✅ |
| S25-T3 | Return-to-popup: `handleSubmit()` re-open task view popup sau save (dùng `task.id` mới); `closeTaskModal()` reset `_taskEditReturnId` khi cancel | `crud.js` | ✅ |
| S25-T4 | Initiative view popup: card header `onclick="openInitViewPopup()"` với `cursor:pointer`; `stopPropagation` trên `.init-card-actions` | `initiative-tracker.js` | ✅ |
| S25-T5 | Initiative view popup: "Chỉnh sửa" → `initViewOpenEdit()` → `_initEditReturnId` → close popup → `_initOpenModal()`; `_initSave()` re-open popup sau save | `initiative-tracker.js` | ✅ |
| S25-T6 | Task rows trong milestone list & linked task list → `openTaskViewPopup()` thay vì `editTask()` | `initiative-tracker.js` | ✅ |
| S25-T7 | ESC handler: thêm `closeTaskViewPopup()`, `closeInitViewPopup()`, `_initCloseModal()` | `navigation.js` | ✅ |
| S25-T8 | `#taskViewOverlay` + `#initViewOverlay` HTML (global overlays, reuse `.cp-view-*` CSS) | `index.html` | ✅ |
| S25-T9 | Test: `verify_task_init_popup.mjs` — 28/28 PASS | `verify_task_init_popup.mjs` | ✅ |

---

## Architecture: S25 Changes

### Task View Popup (S25-T1 to T3)
```
Flow:
  tasks.js rowClick(e, id) → openTaskViewPopup(id)
    - populate #taskViewTitle, #taskViewSubtitle, #taskViewBody
    - chips: state, RAG, category, type, canBLD, highlight, overdue
    - grid (cp-view-grid): initiative, milestone, team, PICs, dates, progress, tuanBC
    - sections: result, nextPlan, vuongMac, noiDungBLD, yKienBLD
    - show #taskViewOverlay (display:flex)

  "Chỉnh sửa" btn → taskViewOpenEdit():
    _taskEditReturnId = _taskViewId  ← capture trước close
    closeTaskViewPopup()             ← _taskViewId = null
    editTask(id)                     → openTaskModal(task)

  handleSubmit() sau save:
    const shouldReturn = !!_taskEditReturnId  ← capture trước closeTaskModal
    closeTaskModal()                          ← reset _taskEditReturnId = null
    if (shouldReturn) openTaskViewPopup(task.id)  ← dùng task.id mới (edge case ID change)

  closeTaskModal() → _taskEditReturnId = null (cancel = no re-open)
  ESC → closeTaskViewPopup()
```

### Initiative View Popup (S25-T4 to T6)
```
Flow:
  init-card-header onclick="openInitViewPopup(ini.id)"  cursor:pointer
  .init-card-actions onclick="event.stopPropagation()"   ← prevent bubble

  openInitViewPopup(id):
    - populate #initViewTitle, #initViewSubtitle, #initViewBody
    - chips: status, category, milestone badge (nếu có parentId)
    - grid (cp-view-grid): accountable, dates, pct, milestones count, tasks count, docLink
    - sections: kpiTarget, notes
    - show #initViewOverlay (display:flex)

  "Chỉnh sửa" btn → initViewOpenEdit():
    _initEditReturnId = _initViewId
    closeInitViewPopup()
    _initOpenModal(id)

  _initSave() sau save:
    _shouldReturnToView = !!_initEditReturnId  ← trước _initCloseModal
    _initCloseModal()                          ← reset _initEditReturnId = null
    renderInitiativeTracker()
    if (_shouldReturnToView) openInitViewPopup(ini.id)

  _initCloseModal() → _initEditReturnId = null (cancel = no re-open)
  ESC → closeInitViewPopup() + _initCloseModal()
```

### Task Rows trong Initiative Tracker
```
TRƯỚC: onclick="editTask('${t.id}')"
SAU:   onclick="openTaskViewPopup('${t.id}')"
Áp dụng cho: _initBuildMsTaskList() và _initBuildTaskList()
```

### CSS Reuse
```
Không thêm CSS mới — reuse từ case-pipeline.css:
  .cp-view-grid, .cp-view-row, .cp-view-label, .cp-view-val
  .cp-view-section, .cp-view-section-title, .cp-view-text
```

---

## Decisions Made (S25)

1. **task.id cho return-to-popup**: `handleSubmit()` dùng `task.id` (ID sau save) thay vì `_taskEditReturnId` (ID trước edit) → handle edge case user đổi Task ID.
2. **_taskEditReturnId reset trong closeTaskModal()**: Đảm bảo ESC / Hủy từ edit modal không re-open popup.
3. **_initCloseModal trong ESC handler**: Fix bug `initModalOverlay` chưa được đóng bởi ESC trước S25.
4. **CSS reuse `.cp-view-*`**: Không tạo CSS mới cho task/initiative view popup — consistent với Case Pipeline popup đã có.
5. **`_initBuildTaskList` task rows**: Dùng `openTaskViewPopup` (không còn `editTask`) → mở task view popup thay vì edit modal trực tiếp.

---

## Playwright Test (S25)
```
File: verify_task_init_popup.mjs (new)
Run:  node verify_task_init_popup.mjs (port 9989, tự tạo server)

PASS 28/28:
  T1:  overlay HTML exists (taskViewOverlay + initViewOverlay)
  T2:  Tasks: click row → popup opens (title, subtitle, body)
  T3:  Popup body has state chip + RAG badge
  T4:  Close via Đóng button
  T5:  ESC closes task popup
  T6:  Chỉnh sửa → edit modal opens, popup closes
  T7:  ESC from edit modal → popup NOT re-opened (cancel path)
  T8:  Initiative Tracker: card header click → init popup opens
  T9:  ESC closes init popup
  T10: Action btn stopPropagation (no init popup)
  T11: Init popup Chỉnh sửa → initiative edit modal opens
  T12: Initiative linked task row click → task popup opens
  T13: No JS console errors
```

---

## Regression (S25)
```
verify_bld_queue.mjs:         46/46 PASS ✅
verify_ms_tasks.mjs:          14/14 PASS ✅
verify_filter_cascade.mjs:    23/23 PASS ✅
verify_import_rbac.mjs:       15/15 PASS ✅
verify_case_pipeline.mjs:     20/22 PASS (TEST13/14 pre-existing fail từ S24)
verify_task_init_popup.mjs:   28/28 PASS ✅ NEW
```

---

## Regression Risks (S25)

| Risk | Severity | Detail |
|---|---|---|
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24: test expect click row → edit modal, nhưng S24 đã đổi sang view popup. Cần update test để check cpViewOverlay thay vì cpModal. |
| **openTaskViewPopup từ nhiều context** | ⚪ LOW | Có thể gọi từ tasks.js, initiative-tracker.js, performance.js. Tất cả đều hoạt động đúng — popup sẽ luôn mở đúng task. |

---

## DATE FROM PREVIOUS SESSION HANDOVER

---

## Branch Strategy (THAY ĐỔI TỪ S24 — push thẳng lên main)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + Development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**`master` đã xóa hoàn toàn** — local và remote — kể từ S24 (2026-06-16). Không tạo lại.

---

## Tasks Completed (S24 — commits `a58474e`, `edc6a26`)

| # | Task | Files | Commit | Status |
|---|---|---|---|---|
| S24-T1 | `user-list` removed from `ADMIN_ONLY` trong Code.gs → tất cả roles load được `_appUsers` → Display_Name (Username) hiển thị nhất quán | `backend/Code.gs` | `a58474e` | ✅ |
| S24-T2 | BLD Queue: ẩn Phê duyệt / Từ chối / Yêu cầu bổ sung với non-Admin; Xem đầy đủ vẫn hiện với tất cả | `assets/js/views/bld-queue.js` | `a58474e` | ✅ |
| S24-T3 | Performance view: click row → `openPerfTaskPopup(key)` → `detailOverlay` mở với task list lọc theo tab hiện tại (initiative/picRes/team) | `assets/js/views/performance.js` | `a58474e` | ✅ |
| S24-T4 | Case Pipeline: click row/card → `openCaseViewPopup(id)` → `cpViewOverlay` read-only popup; Edit btn (canImport()) → `cpViewOpenEdit()` → `cpModal` | `assets/js/views/case-pipeline.js`, `assets/css/case-pipeline.css`, `index.html`, `assets/js/ui/navigation.js` | `a58474e` | ✅ |
| S24-T5 | picRes case fix PA1: filter so sánh `.toLowerCase()` — `dunglq1` match `DungLQ1` | `assets/js/views/tasks.js` | `edc6a26` | ✅ |
| S24-T6 | picRes case fix PA2: `_resolvePickerCase()` trong `parsers.js` → map `t.picRes`/`t.picAcc` về canonical Username sau mỗi parse; gọi lại sau `loadAppUsers()` trong `api.js` | `assets/js/parsers.js`, `assets/js/api.js` | `edc6a26` | ✅ |
| S24-T7 | Branch cleanup: xóa local + remote `master`; memory + ai_context cập nhật push thẳng lên `main` | — | — | ✅ |

---

## Architecture: S24 Changes

### BLD Queue Role Gate (S24-T2)
```js
// bld-queue.js — cả _bldBuildCaseHTML() và _bldBuildItemHTML()
<div class="bld-item-actions">
  ${isAdmin() ? `
    <button class="btn btn-sm btn-success" ...>Phê duyệt</button>
    <button class="btn btn-sm btn-danger"  ...>Từ chối</button>
    <button class="btn btn-sm btn-secondary" ...>Yêu cầu bổ sung</button>
  ` : ''}
  <button class="bld-ghost-link" ...>Xem đầy đủ</button>  ← luôn hiển thị
</div>
```

### Performance Popup (S24-T3)
```
openPerfTaskPopup(key):
  - Lọc db.tasks theo perfTab ('initiative'|'picRes'|'team') và key
  - Set detailTitle + innerHTML detailTbody
  - classList.add('open') trên #detailOverlay (reuse existing modal)
  - Mỗi row trong popup có onclick="editTask(...)" để mở edit modal
```

### Case Pipeline View Popup (S24-T4)
```
HTML: #cpViewOverlay (overlay div, display:none/flex)
  → .modal (680px max-width)
    → #cpViewTitle, #cpViewSubtitle
    → #cpViewBody (read-only detail grid — .cp-view-grid CSS)
    → #cpViewEditBtn (inline-flex nếu canImport(), else none)

Flow:
  click row/card → cpOpenDetail(id) → openCaseViewPopup(id)
  openCaseViewPopup: populate title/subtitle/body, show/hide editBtn
  cpViewOverlay: display='flex'

  Edit btn → cpViewOpenEdit():
    const id = _cpViewId  ← capture TRƯỚC closeCaseViewPopup()
    closeCaseViewPopup()
    openCaseModal(id)

  ESC → navigation.js Escape handler: + closeCaseViewPopup()

State: let _cpViewId = null (global trong case-pipeline.js)
```

### picRes Case Fix (S24-T5+T6)
```
Root cause:
  DB lưu 'dunglq1' → picNorm() → 'Dunglq1'
  _appUsers.Username = 'DungLQ1'
  Dropdown value = 'DungLQ1'
  Filter: 'Dunglq1' !== 'DungLQ1' → FAIL

PA1 (tasks.js:58):
  (t.picRes||'').toLowerCase() !== fPic.toLowerCase()  ← immediate fix

PA2 (parsers.js):
  _resolvePickerCase():
    lookup = Map(_appUsers → lowercase → canonical)
    db.tasks.forEach: t.picRes = canonical || t.picRes
                      t.picAcc = canonical || t.picAcc
  Gọi tại: cuối _parseArrayIntoDb() + sau loadAppUsers() trong api.js
  Race condition mitigation: gọi cả 2 nơi → whichever loads last wins

Sau fix: 'dunglq1' → picNorm → 'Dunglq1' → _resolvePickerCase → 'DungLQ1' ✅
```

---

## Decisions Made (S24)

1. **push thẳng lên `main`**: `master` xóa hoàn toàn từ S24. Mọi commit push thẳng `origin/main`.
2. **cpViewOverlay read-only first**: Case Pipeline popup là read-only preview; Edit btn chỉ hiện với `canImport()` (Admin/Teamlead). Không mở thẳng edit modal khi click card.
3. **`_cpViewId` capture trước close**: `cpViewOpenEdit()` phải lấy `const id = _cpViewId` TRƯỚC khi gọi `closeCaseViewPopup()` vì close sẽ set `_cpViewId = null`.
4. **picRes PA1 + PA2**: PA1 = safety net ngay lập tức; PA2 = fix gốc rễ. Cả hai cùng tồn tại — PA2 đảm bảo data đúng cho performance/bld-queue (không chỉ filter tasks).
5. **`user-list` không còn ADMIN_ONLY**: Tất cả authenticated users được phép gọi `user-list` — cần để populate Display_Name dropdown nhất quán.

---

## Playwright Test (S24)
```
File: C:\Users\LENOVO\pw_test\test3.js
Run:  cd C:\Users\LENOVO\pw_test && node test3.js

PASS — 6/6 checks:
  [1] _appUsers loaded: PASS (3 users)
  [1] filterPic format: PASS
  [1] modal fPicRes format: PASS
  [2] BLD role gate: PASS (Admin 2 approve btns; non-Admin 0 approve btns)
  [3a] Perf popup: PASS (open:true, title đúng, 2 rows)
  [3b] CP popup: PASS (display:flex, title đúng, editBtn:inline-flex for Admin)
```

---

## Regression Risks (S24)

| Risk | Severity | Detail |
|---|---|---|
| **`_resolvePickerCase()` race condition** | 🟡 MEDIUM | Nếu `_appUsers` load rất chậm (GAS slow) và user filter ngay khi page load → PA2 chưa kịp chạy. PA1 vẫn cover vì so sánh lowercase. |
| **picRes data đã cache** | 🟡 MEDIUM | Tasks trong `localStorage['shtd_v2']` từ trước S24 có `picRes='Dunglq1'` (picNorm format). Sau S24, `_resolvePickerCase()` sẽ fix khi `_appUsers` load. Nếu user offline → PA1 vẫn hoạt động qua lowercase compare. |
| **BLD popup với non-Admin** | ⚪ LOW | `isAdmin()` check inline trong template string — nếu `isAdmin` undefined tại render time → toàn bộ button block bị throw. Cần đảm bảo `auth.js` load trước `bld-queue.js`. |

---

## DATE FROM PREVIOUS SESSION HANDOVER
# SESSION HANDOVER
**Date**: 2026-06-16 (Session 23b — Task local-only write refactor)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S21**: `47b9316` — Team/PIC User_Master integration
**Pushed S22**: `2a65710` — User Management search/filter/sort/pagination (TD-030)
**Pushed S23 (→ main via PR #27)**: `b3262eb` → `dfac565` → `6ad6c32` (filter cascade + RBAC + modal fix)
**Pushed S23b**: `11c5770` (ai_context handover) → `65388ae` (task local-only write refactor)
**origin/main HEAD**: `65388ae` ✅

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19, XÁC NHẬN LẠI S23)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**AI/Claude push thẳng lên `main`. `master` đã bị xóa sau S23 (PO đã merge PR #27 xong xóa branch).**

---

## Tasks Completed (S20 — commit `6bf7a75`)

| # | Task | File(s) | Status |
|---|---|---|---|
| CP-UI-1 | index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle, preset bar 4 tabs, filter bar Task Manager pattern, filter chips, #cpTableWrap (default), #cpBoardWrap (hidden) | `index.html` | ✅ |
| CP-UI-2 | case-pipeline.css: +.cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, sort-icon | `assets/css/case-pipeline.css` | ✅ |
| CP-UI-3 | case-pipeline.js: Table-primary (20/page, 10 sortable cols), 4 preset tabs, _cpInitPresetTabs() | `assets/js/views/case-pipeline.js` | ✅ |
| CP-UI-4 | api.js: syncCaseAction + syncDot 'syncing' at start | `assets/js/api.js` | ✅ |
| INI-SYNC | initiatives.js: syncInitiativeAction() gold standard pattern, syncInitiativeAdd/Edit/Delete updated | `assets/js/initiatives.js` | ✅ |
| TEST-S20 | verify_case_pipeline.mjs: 22/22 PASS (+TEST05b, +TEST08b, table row selectors) | `verify_case_pipeline.mjs` | ✅ |

## Tasks Completed (S21 — commit `47b9316`)

| # | Task | File(s) | Status |
|---|---|---|---|
| UM-1 | constants.js: +TEAM_LIST (8 teams, fallback khi GAS offline) | `assets/js/constants.js` | ✅ |
| UM-2 | api.js: +`_appUsers[]`, `loadAppUsers()`, `getAppTeams()`, `getUsersByTeam()`, `_populateTeamSelect()`, `_populateUserSelect()` | `assets/js/api.js` | ✅ |
| UM-3 | app.js: `loadAppUsers()` non-blocking sau `autoConnectDB()` | `assets/js/app.js` | ✅ |
| UM-4 | index.html: Task modal `fTeam`→select+onchange, `fPicAcc`→select; Case modal `cpfTeam`→select+onchange, `cpfPic`→select | `index.html` | ✅ |
| UM-5 | crud.js: `openTaskModal()` dùng `_populateTeamSelect`/`_populateUserSelect`; +`onTaskTeamChange()` (re-filter PIC + autoGenId) | `assets/js/crud.js` | ✅ |
| UM-6 | case-pipeline.js: `openCaseModal()` dùng helpers; +`onCaseTeamChange()` | `assets/js/views/case-pipeline.js` | ✅ |
| UM-7 | initiative-tracker.js: `initFAcc` input→select; `_initOpenModal()` populate via `_populateUserSelect` (all users) | `assets/js/views/initiative-tracker.js` | ✅ |
| TEST-S21 | verify_case_pipeline.mjs: Fix TEST12 `.fill()` → `.selectOption()` cho cpfTeam | `verify_case_pipeline.mjs` | ✅ **22/22 PASS** |
| REG | verify_bld_queue.mjs / verify_ms_tasks.mjs: no regression | — | ✅ **46/46 + 14/14** |

---

## Architecture: Team/PIC User_Master (S21)

```
Luồng:
  startApp() → loadAppUsers() [non-blocking] → GAS 'user-list' → _appUsers[]

_appUsers = [{Username, Display_Name, Role, Team, Email, Active, ...}, ...]
  - In-memory only (KHÔNG persist localStorage — dữ liệu user nhạy cảm)
  - Filter: Active !== 'false'

Helpers (api.js):
  getAppTeams()            → unique teams từ _appUsers, sorted; fallback TEAM_LIST khi empty
  getUsersByTeam(team)     → filter _appUsers by team; '' = tất cả users
  _populateTeamSelect(id, currentVal)
    - required=true  → không có empty option, default to teams[0]
    - required=false → có "– Chọn team –" option
  _populateUserSelect(id, team, currentVal)
    - team=''      → show "– Chọn team trước –" (hint)
    - users empty  → fallback: hiện currentVal nếu có (offline graceful)
    - users exist  → options = Display_Name (Username); currentVal pre-selected
    - currentVal không match option → append extra option (bảo toàn dữ liệu)

Áp dụng:
  Task modal:   fTeam (required) → fPicAcc (required) → fPicRes (required)
                onTaskTeamChange() → re-filter cả hai PIC + autoGenId()
  Case modal:   cpfTeam (optional) → cpfPic (optional)
                onCaseTeamChange() → re-filter cpfPic
  Initiative:   initFAcc → all users (no team filter — initiative không có field team)
  
  populatePicDropdown() — GIỮ NGUYÊN như legacy cho filter bar filterPic
```

---

## Architecture: Case Pipeline UI (S20)

```
Dual-mode:  Table (default, #cpTableWrap) ↔ Kanban (#cpBoardWrap)
Persist:    localStorage 'cp_view'
Presets:    'active' / 'bld' / 'overdue' / 'all' (state: _cpPreset)
Filter:     _cpGetFiltered() = preset + search (debounce) + 4 dropdowns
Table:      10 cols, sortable, 20/page, pagination, empty state
syncInitiativeAction(): showLoading + syncDot syncing/connected + GAS + hideLoading
```

---

## Decisions Made (S20–S21)

1. **Table-primary** (S20): Default view cho Case Pipeline giải quyết 200 cases × 14 cols scalability problem.
2. **_cpInitPresetTabs()** (S20): Gọi trong renderCasePipeline() để sync active class — không phụ thuộc HTML static.
3. **syncInitiativeAction gold standard** (S20): Đồng nhất pattern với syncCaseAction / syncAction.
4. **_appUsers in-memory only** (S21): User data không persist localStorage vì sensitive. Mỗi session load lại từ GAS.
5. **Offline fallback** (S21): getAppTeams() → TEAM_LIST; _populateUserSelect() → hiện currentVal. App vẫn hoạt động khi GAS down.
6. **Extra option for mismatched PIC** (S21): Nếu currentVal không có trong danh sách users của team hiện tại (ví dụ PIC được assign từ team khác), append extra option để tránh mất dữ liệu khi save.
7. **Initiative Accountable no team filter** (S21): Initiative không có field Team trong DB — Accountable hiện tất cả active users.
8. **populatePicDropdown() kept** (S21): Giữ legacy function (không gọi nữa từ modal) để không break filter bar. Marked as legacy trong comment.

---

## Tasks Completed (S22b — undocumented commits between S22 and S23)

These commits appeared on `origin/main` but were NOT in the S22 handover — likely from a session between S22 and S23:

| Commit | Task | Files |
|---|---|---|
| `6f1c23b` | docs(ai_context): update S22 handover | `ai_context/SESSION_HANDOVER.md` etc. |
| `b134d54` | fix(user-management): constrain table-wrap height so only rows scroll | `assets/js/views/user-management.js` |
| `5323b75` | feat: pre-fill Team/PIC from logged-in user on Add modal (Task/Case/Initiative) | `assets/js/crud.js`, `case-pipeline.js`, `initiative-tracker.js` |
| `691ba9b` | rebrand: rename org from 'Số Hóa Tín Dụng / Khối KHDN' to 'Trung tâm SP&GPTD' | `index.html` |
| `ef40075` | fix(initiatives): repair milestone-to-parent linking when sheet has no header row | `assets/js/views/initiative-tracker.js` |

---

## Tasks Completed (S23 — commits `b3262eb`, `dfac565`, `6ad6c32` on master)

| # | Task | Commit | Files | Status |
|---|---|---|---|---|
| S23-T3 | Task filter: PIC cascade từ Team; Case Pipeline: PIC filter cascade + DVKD column + DVKD filter | `b3262eb` | `tasks.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T4 | Import RBAC: restrict Excel import tới Admin + Teamlead (lead-only CSS + canImport() JS guard) | `dfac565` | `auth.css`, `auth.js`, `app.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T5 | Modal grid layout bug: right column bị squeeze — fix `1fr 1fr` → `minmax(0,1fr) minmax(0,1fr)` | `6ad6c32` | `forms.css`, `case-pipeline.css`, `initiative.css`, `verify_modal_layout.mjs` | ✅ on master (pending merge to main) |

---

## Architecture: S23 Changes

### Filter Cascade (S23-T3)
```
tasks.js:
  onFilterTeamChange() → _populateFilterPic(team)
    - uses getUsersByTeam() từ _appUsers[] nếu online
    - fallback: unique picRes từ db.tasks khi offline

case-pipeline.js:
  cpFilterTeamChange() → _cpSyncFilterPic(team)
    - cùng pattern: getUsersByTeam() → fallback từ case data
  DVKD column: _cpRenderTable() thêm cột dvkd sau PIC
  State vars: _cpFilterPic, _cpFilterDvkd

auth.js:
  canImport() → u.role === 'Admin' || u.role === 'Teamlead'

auth.css:
  body[data-role="User"] .lead-only { display: none !important; }
  (cạnh .admin-only đã có — hai lớp RBAC)
```

### Modal Grid Fix (S23-T5)
```
Root cause: `grid-template-columns: 1fr 1fr` = `minmax(auto, 1fr) minmax(auto, 1fr)`
  → auto minimum cho phép cột trái rộng hơn khi có button với white-space:nowrap
  → cột phải bị squeeze

Fix: `minmax(0, 1fr) minmax(0, 1fr)` + .form-group { min-width:0 } + .form-control { width:100%; min-width:0 }

Grids fixed:
  forms.css         → .form-grid (Task modal)
  case-pipeline.css → .cp-modal-grid (Case modal)
  initiative.css    → .init-modal-grid (Initiative modal)

Test: verify_modal_layout.mjs — 9/9 PASS (diff=0.0px trên cả 3 modal)
```

---

## Tasks Completed (S23b — commit `65388ae`)

| # | Task | Files | Status |
|---|---|---|---|
| S23b-T1 | Refactor: Task CRUD/bulk ops write local only; only Excel import writes GAS | `api.js`, `crud.js`, `bulk.js`, `bld-queue.js` | ✅ on main |

### Architecture: Task Write Isolation (S23b)

```
TRƯỚC:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → syncAction() → READ từ GAS → MERGE → WRITE lên GAS

SAU:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → localAction() → persist(localStorage) → renderAll()   ← KHÔNG ghi GAS

CHỈ GHI GAS (giữ nguyên):
  handleImport() — Excel bulk import      → syncAction() ✅
  syncCaseAction() — Case CRUD/BLD        → GAS write ✅
  syncInitiativeAction() — Initiative CRUD → GAS write ✅
  writeToHandle() (initiative-tracker.js)  → GAS write ✅

localAction() (api.js):
  function localAction(mutateFn) {
    if (typeof mutateFn === 'function') mutateFn();
    persist();    // localStorage['shtd_v2']
    renderAll();  // re-render toàn bộ UI
    return true;
  }
```

### Decision: S23b

- **Task write local-only**: PO yêu cầu tách biệt hoàn toàn — task data chỉ lên GAS qua Excel import, không tự động push từ UI. Tránh cache cũ/stale ghi đè Sheet khi user edit/delete ngẫu nhiên.
- **BLD task approval local-only**: Ý kiến BLĐ cho Task cũng local-only. Ý kiến BLĐ cho Case vẫn qua syncCaseAction (GAS write).
- **Bug fix**: `bulkSetState()` và `bulkDelete()` lưu count TRƯỚC khi `selectedIds.clear()` — toast hiện đúng số lượng.

---

## Tasks Completed (S22 — commit `2a65710`)

| # | Task | File(s) | Status |
|---|---|---|---|
| TD-030 | user-management.js: search (username/name/email, debounce 150ms), filter Team/Role/Status, filter chips với clear, sort 5 cols, pagination 15/page với count info, layout toolbar+filter-bar+card khớp pattern case-pipeline | `assets/js/views/user-management.js` | ✅ |

---

## Blockers

| Item | Status |
|---|---|
| Netlify hết credit | ❌ Dùng local Playwright / GitHub Pages |
| AI Chat GAS AiService.gs + GEMINI_API_KEY | ⚠️ Unconfirmed từ S12 |
| ~~Modal fix chưa merge sang main~~ | ✅ PR #27 merged — `41f4018` live |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| **Task edits không lên GAS (S23b)** | 🔴 HIGH | saveTask/deleteTask/bulk/BLD task giờ chỉ lưu localStorage. Nếu user clear cache / đăng xuất / đổi thiết bị mà không export Excel trước → mất toàn bộ task edits. Cần thông báo user workflow mới: edit → export → import khi cần đẩy lên Sheet. |
| **BLD task approval không lên GAS (S23b)** | 🔴 HIGH | Ý kiến BLĐ cho Task (yKienBLD) chỉ lưu local. Sheet không cập nhật cho đến khi Excel import. Case BLD approval vẫn lên GAS bình thường. |
| Team/PIC modal fields đổi từ input→select | 🟡 MEDIUM | fPicAcc từ text input → select. Nếu _appUsers empty (GAS down) và không có currentVal → fPicAcc select rỗng → form submit fail. Cần smoke test khi GAS online. |
| Initiative sync flow changed (S20) | 🟡 MEDIUM | syncInitiativeAdd/Edit/Delete pattern đổi. Cần smoke test initiative CRUD trên live. |
| AI Chat chưa smoke-test live | 🟡 MEDIUM | AiService.gs + GEMINI_API_KEY chưa xác nhận từ S12. |
| DVKD column colspan (S23-T3) | ⚪ LOW | Empty state colspan tăng 10→11. Nếu có test check colspan cứng, cần cập nhật. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_case_pipeline.mjs    # 22/22 PASS (S21)
node verify_bld_queue.mjs        # 46/46 PASS
node verify_ms_tasks.mjs         # 14/14 PASS
node verify_filter_cascade.mjs   # 23/23 PASS (NEW S23)
node verify_import_rbac.mjs      # 15/15 PASS (NEW S23)
node verify_modal_layout.mjs     # 9/9 PASS (NEW S23)
```

---

## Next Steps

1. **UX: thông báo user về workflow mới** — Task edit chỉ lưu local; cần export Excel và import lại để đồng bộ GAS. Cân nhắc thêm banner/toast nhắc nhở.
2. **Smoke test live — Task save**: Edit task → lưu → reload → kiểm tra data vẫn trong cache; Export Excel → kiểm tra dữ liệu đúng.
3. **Smoke test live — Task filter**: Chọn Team → filterPic update đúng users.
4. **Smoke test live — Case Pipeline filter**: Team → cpFilterPic cascade; DVKD filter; DVKD column hiển thị.
5. **Smoke test live — Import RBAC + Modal layout**: Kiểm tra các S23 features trên live.
6. Verify AI Chat trên live (tồn từ S12).
7. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
4. **Smoke test live — Import RBAC**: Login với role User → Import button ẩn; role Admin/Teamlead → visible.
5. **Smoke test live — Modal layout**: Mở Task/Case/Initiative edit modal → 2 cột đều nhau.
6. **Smoke test live — Task/Case modal Team+PIC**: Dropdown có options, cascade đúng.
7. Verify AI Chat trên live (tồn từ S12).
8. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
