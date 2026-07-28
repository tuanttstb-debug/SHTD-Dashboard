# TODO — NEXT SESSION
**Prepared**: 2026-07-28 (Session 54 — Dev Plan "Plan phát triển bản thân")
**Context**: S54 + S54.1 done. APP_VERSION=6.19.1-dev-plan-mywork-20260728, ?v=20260728b. HEAD `e1134ce`. **21/21 suites PASS** (verify_dev_plan **40/40** + toàn bộ regression). GAS **đã deploy** (create/delete verified). Code + docs pushed.

---

## ✅ COMPLETED S54 — Dev Plan (Plan phát triển bản thân)

- [x] `backend/DevPlanService.gs` (NEW) — sheet `Dev_Plan` 12 cột; `devRead/devUpsertRow/devDeleteRow/devGetPicById`
- [x] `backend/Code.gs` — +3 route `dev-read/dev-upsert/dev-delete` + ownership gate (PIC==tokenData.u hoặc Admin)
- [x] `constants.js` (`dbDev`,`DEV_STATES`,`DEV_COLS`), `api.js` (Dev API), `app.js` (startup+syncDB+renderAll+clear)
- [x] `views/dev-plan.js` + `css/dev-plan.css` (NEW) — toolbar filter PIC/state/search, bảng nhóm-theo-PIC, CRUD modal, view popup, ownership
- [x] `my-work.js` — section Plan phát triển bản thân; quick save % + note reset mốc
- [x] `navigation.js` (G+V, dispatch, ESC), `index.html` (nav, view, modal, overlay, KB, script), `i18n.js` (dev.* VI+EN)
- [x] `config.js` + cache-bust (Python), `verify_dev_plan.mjs` + `run_tests.mjs`
- [x] **GAS deployed** (user): dev-read/upsert/delete live, URL không đổi

## ✅ COMPLETED S54.1 — Fix: Dev Plan hiển thị ở "Công việc của tôi"
- [x] `my-work.js` `_mwGetDevReview` → hiện **mọi dev item đang làm của tôi** (trước chỉ stale >7 ngày → item vừa tạo bị ẩn); stale gắn badge "Cần review" + sort đầu
- [x] `app.js` `readDev().then()` re-render My Work/Dev Plan sau khi load server
- [x] `i18n.js` `dev.review.title` + `dev.review.badge`; v6.19.1 / ?v=20260728b
- [x] `verify_dev_plan.mjs` DP12 semantics mới + route-abort `script.google.com` (cách ly network) → **40/40 PASS** deterministic

## ✅ DONE — Dọn RenameUserService.gs + kiểm tra key lộ (2026-07-28)
- Đã xóa đoạn PowerShell thừa khỏi `backend/RenameUserService.gs` → file GAS sạch. Xác minh key **chưa từng lên git** (`git log -S` = 0; working copy == committed). Chỉ còn khuyến nghị: đổi/thu hồi key phía provider (precaution). Xem TD-SEC-01.

## 🟡 PRIORITY 1 — Smoke test Dev Plan trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.19.1-dev-plan-mywork-20260728` |
| Menu "Plan phát triển bản thân" (G+V) | Bảng nhóm theo PIC, mặc định lọc = tôi |
| Thêm item | Lưu OK; hiện ngay ở "Công việc của tôi" (không cần chờ 7 ngày) |
| User B xem plan user A | Read-only (icon khóa); sửa/xóa bị chặn (client + server FORBIDDEN) |
| Item >7 ngày chưa update | Badge "Cần review" ở My Work; bấm "Đã review" → badge mất |

## 🟢 PRIORITY 2 — Dev Plan enhancements (tùy chọn, Phase 2)
- Excel export (theo pattern Issue/Case); audit history tab; nhắc review theo **tháng** (escalation >30 ngày badge đỏ); bulk update.

---

---

## ✅ COMPLETED S53 — RenameUserService migration

- [x] `backend/RenameUserService.gs` (NEW) — `dryRunRenamePhuong()` + `commitRenamePhuong()`
  - Sheets: User_Master (Username), Task_Master (PIC Acc/Res/Sup), Case_Pipeline (PIC), Issue_Tracker (Người log/xử lý), Initiative_Master (Accountable)
  - Audit_Log KHÔNG chạm
  - Column match: normalized startsWith; Value match: exact case-insensitive
  - Chạy trực tiếp trong GAS Editor, không cần redeploy Web App

---

## 🔴 PRIORITY 0 — Chạy RenameUserService trên production

| Bước | Action |
|---|---|
| 1 | Mở GAS Editor → thêm file `RenameUserService.gs` (copy từ repo) |
| 2 | Chạy `dryRunRenamePhuong()` → kiểm tra Logger: đúng số cell, không WARN trên các sheet chính |
| 3 | Chạy `commitRenamePhuong()` → xác nhận Logger "Migration hoàn tất" |
| 4 | Yêu cầu user `PhuongNPL_C` đăng xuất + đăng nhập lại với username `PhuongNPL` |
| 5 | Verify: dropdown PIC trong Task modal hiện `PhuongNPL` thay vì `PhuongNPL_C` |

---

## 🔴 PRIORITY 1 — Smoke test S52 on production (còn pending)

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.18-sync-topbar-nguoilog-20260710` |
| Topbar (when connected) | SYNC button visible next to Quick View |
| Click SYNC | Syncs Tasks + Cases + Issues + Initiatives; toast "Đã đồng bộ toàn bộ dữ liệu!" |
| Issue Tracker → Thêm Issue | "Người log" is a dropdown; logged-in user pre-selected |
| BLD Queue / Case Pipeline / Issue Tracker | "Làm mới" button no longer present |

---

## 🔲 CANDIDATE TASKS S54+

| Priority | Task | Notes |
|---|---|---|
| P1 | **Fix verify_my_work pre-existing failures (MW22/MW23)** | MW22: progress `mw-prog-visible` toggle class; MW23-prog-bar: progress bar fill null. Failures từ S44b era trở đi. |
| P2 | **AI Chat live activation** | GAS editor → Script Properties → `GEMINI_API_KEY = <key>`. Backend wired; frontend i18n done. User action only. |
| P3 | **i18n COMPLETE** | Tất cả views bilingual sau Phase 8. Không cần Phase 9. |

---

---

## ✅ COMPLETED S52 — SYNC topbar + Issue Tracker Người log dropdown

## ✅ COMPLETED S52 — SYNC topbar + Issue Tracker Người log dropdown

- [x] `index.html` — `#btnSync` moved to topbar-right (before Quick View), class `qv-topbar-btn`, icon `var(--success)` color
- [x] `index.html` — Removed "Làm mới" from BLD Queue, Case Pipeline (table+kanban), Issue Tracker
- [x] `index.html` — Issue Tracker modal "Người log": `<input type="text">` → `<select id="itfNguoiLog">`
- [x] `app.js` — `syncDB()` now syncs all 4 features in parallel: Tasks + Cases + Issues + Initiatives
- [x] `issue-tracker.js` — `openIssueModal()`: `_itSetField(...)` → `_populateUserSelect('itfNguoiLog', null, ...)` for user dropdown
- [x] `config.js` — APP_VERSION `6.18-sync-topbar-nguoilog-20260710`; cache-bust `?v=20260710f` (56 refs, Python)
- [x] Tests: 19/20 (verify_my_work 3 pre-existing failures MW22/MW23 unrelated to S52)

---

## 🔴 PRIORITY 0 — Smoke test S52 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.18-sync-topbar-nguoilog-20260710` |
| Topbar (when connected) | SYNC button visible next to Quick View |
| Click SYNC | Syncs Tasks + Cases + Issues + Initiatives; toast "Đã đồng bộ toàn bộ dữ liệu!" |
| Issue Tracker → Thêm Issue | "Người log" is a dropdown; logged-in user pre-selected |
| Issue Tracker → Edit Issue | Dropdown shows the issue's existing nguoiLog value |
| BLD Queue / Case Pipeline / Issue Tracker | "Làm mới" button no longer present |

---

## 🔲 CANDIDATE TASKS S53+

| Priority | Task | Notes |
|---|---|---|
| P0 | **Smoke test S52 on production** | See checklist above |
| P1 | **Fix verify_my_work pre-existing failures (MW22/MW23)** | MW22: progress input `mw-prog-visible` toggle class; MW23-prog-bar: progress bar fill null. These failed before S52 (regression from S44b era or earlier). |
| P2 | **AI Chat live activation** | GAS editor → Script Properties → add `GEMINI_API_KEY = <Gemini key>`. Backend wired (Code.gs ai-chat route + AiService.gs). Frontend done (Phase 7). User action only. |
| P3 | **i18n COMPLETE** | All views bilingual after Phase 8. No further i18n phases needed. |

---

---

## ✅ COMPLETED S50 — i18n Phase 7: Gantt, AI Chat, Branch Analysis, User Management

- [x] `i18n.js` — +74 keys (gantt.*, ai.*, branch.*, um.*) VI + EN
- [x] `gantt.js` — subtitle + empty state → `t()` (2 strings)
- [x] `ai-chat.js` — static `_aiSuggestions` → `_getAiSuggestions()` fn; 8 UI strings → `t()`; renamed loop var `t` → `turn` (t()-shadowing fix)
- [x] `branch-analysis.js` — zone tabs, stat cards, table headers → `t()` (12 strings); zoneLabel short → `t('branch.zone.*-short')`
- [x] `user-management.js` — ~45 strings → `t()`; `renderUserManagement()` skips `_umLoad()` if `_umUsers.length > 0` (lang-switch cache); `+_umRestoreFilterUi()` to restore filter DOM; renamed map param `t` → `tk` (t()-shadowing fix)
- [x] `app.js` — `renderAll()` +4 guards: gantt, ai-chat, branch-analysis, user-management
- [x] `config.js` — APP_VERSION `6.15` → `6.16-i18n-phase7-20260710`; cache-bust `?v=20260710b` (56 refs, Python)
- [x] `verify_i18n_p7.mjs` — NEW; **35/35 PASS** (IP7-1→IP7-20: Gantt subtitle/empty, AI Chat header/suggest, Branch zone/stat/col, UM filter/empty/badge, renderAll live-switch, 0 JS errors)
- [x] `run_tests.mjs` — +verify_i18n_p7.mjs as first suite; **19/19 PASS**
- [x] **Key lesson**: `let _umUsers = []` (script-scope lexical) ≠ `window._umUsers`. Tests must use `_umUsers.length = 0; _umUsers.push(...users)` not `window._umUsers = users`.
- [x] **Reused**: `common.all`, `common.cancel`, `common.search`, `page.user-management`
- [x] **Skipped** (domain data): `kpi-overview.js`, `owner-analysis.js`; `kpi-progress.js`, `rm-analysis.js` (already clean)

---

## 🔴 PRIORITY 0 — Smoke test S50 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.16-i18n-phase7-20260710` |
| Gantt view → switch EN | Subtitle: "Timeline view — 2026" |
| Gantt view → no tasks with dates | Empty state: "No tasks with both Start Date and Deadline" |
| AI Chat → switch EN | Header sub: "Ask about tasks, KPIs, initiatives · Powered by Gemini" |
| AI Chat suggestions (EN) | First: "Summarize all currently Blocked tasks" |
| Branch Analysis tabs (EN) | "All / North Region / South Region / Central Region" |
| Branch stat cards (EN) | "Met KPI / Below KPI / Total Branches" |
| User Management → switch EN | Filter label: "Status"; options: "Active / Inactive" |
| UM status badge (EN) | Active row: "Active"; Locked row: "Inactive" |
| Switch back VI | All labels restore to Vietnamese |

---

## 🔲 CANDIDATE TASKS S51+

| Priority | Task | Notes |
|---|---|---|
| P0 | **Smoke test S50 on production** | See checklist above |
| P1 | **Phase 0 security hardening** | Per arch roadmap — input sanitization, RBAC audit |
| P2 | **i18n Phase 8** | `kpi-overview.js`, `owner-analysis.js` — domain KPI data mixed with chrome; needs careful separation |

---

---

## ✅ COMPLETED S49 — i18n Phase 6: Initiative Tracker

- [x] `i18n.js` — +52 `it.*` keys + `db.modal.project-prefix` in VI and EN blocks
- [x] `initiative-tracker.js` — all ~52 hard-coded VI strings → `t()` calls across all 13 functions
- [x] `dashboard.js` — fix `'Dự án: '` prefix → `t('db.modal.project-prefix')`
- [x] `app.js` — `renderAll()` guard for IT view + `updateFilterDropdowns()` filterInit+filterTuanBC via `t()`
- [x] `config.js` — `APP_VERSION='6.15-i18n-phase6-20260710'`; cache-bust `?v=20260710` (56 refs)
- [x] `verify_i18n_p6.mjs` — NEW; **27/27 PASS** (IP6-1 → IP6-15; stat bar VI/EN, scope, filter opts, add btn, empty state, filterInit/filterTuanBC, restore VI, 0 JS errors)
- [x] `run_tests.mjs` — +verify_i18n_p6.mjs as first suite; **18/18 PASS**
- [x] **Key reuse**: `mw.dl.overdue` (IT "Overdue"), `task.scope.mine/all` (IT scope), `common.cancel/save/delete` (IT modal/confirm) — no duplicate keys created
- [x] **Kept as-is** (English banking terms): "Blocked" stat, "Milestones" toggle, category values from GAS

---

## 🔴 PRIORITY 0 — Smoke test S49 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.15-i18n-phase6-20260710` |
| Initiative Tracker → switch EN | Stat bar: "Total Initiatives / Active / Done / Overdue" |
| Scope buttons (EN) | "Mine / All" |
| Filter dropdowns (EN) | "All Categories / All Statuses" |
| Add button (EN) | "Add Initiative" |
| Empty state (EN, clear all inits) | "No Initiatives" |
| Switch back VI | All labels restore to Vietnamese |
| Tasks view → filterInit dropdown (EN) | "All" |
| Tasks view → filterTuanBC dropdown (EN) | "All" / "📅 This Week" |
| Dashboard → initiative table row click (EN) | Modal title "Project: …" (not "Dự án: …") |

---

## ✅ COMPLETED S48 — i18n Phase 5: Quick View + Executive Summary

- [x] `i18n.js` — +12 qv.* keys + 9 es.* keys VI + EN (filter labels, subtitle, time prefix, attention labels, status tags, empty states)
- [x] `quickview.js` — t()-shadowing fix: map var `t` → `tk` in 4 callbacks; `renderQuickView()` calls `_qvPopulateFilters()` + `_qvUpdateTime()` for live lang switch
- [x] `executive-summary.js` — 6 `t()` calls wired: chart empty, attention empty, cfg labels, more-link, init table empty, status tags via `t('es.risk.*')`
- [x] `app.js` — `renderAll()` +2 lines: executiveSummary guard + `if (_qvIsOpen) renderQuickView()`
- [x] `config.js` — APP_VERSION='6.14-i18n-phase5-20260709'; cache-bust `?v=20260709g`
- [x] `verify_i18n_p5.mjs` — NEW; **24/24 PASS** (IP5-1 → IP5-14; covers QV filter/subtitle/labels, ES attention/init-table, EN↔VI switch)
- [x] `run_tests.mjs` — +verify_i18n_p5.mjs as first suite; **17/17 PASS**
- [x] **Bug fixed**: `t()` shadowing in quickview.js map callbacks (loop var `t` shadowed global `t()`) → renamed to `tk`
- [x] **Bug fixed**: `_qvPopulateFilters()` only called in `openQuickView()`, not in `renderQuickView()` → filter labels now update on lang switch

---

## 🔴 PRIORITY 0 — Smoke test S48 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.14-i18n-phase5-20260709` |
| Open Quick View (QV button) | Panel opens; filter dropdowns in VI ("Tất cả") |
| Switch EN → QV open | Filter: "All" / "All Weeks" / "📅 This Week"; subtitle includes "tasks" |
| QV done card | Shows "Done:" label |
| QV plan card | Shows "Next Week Plan" / "tasks to do" |
| QV issue card | Shows "Pending Approval" / "Issue" flags |
| Switch VI → QV open | Filter: "Tất cả"; subtitle includes "Tất cả"; time "Cập nhật:" |
| Navigate → Executive Summary | View loads |
| Switch EN → ES | Attention items show "Pending Approval" / "Overdue"; init table shows "High Risk"/"Watch" |
| Switch VI → ES | Attention shows "Cần BLĐ"; init table shows "Rủi ro"/"Theo dõi" |

---

## ✅ COMPLETED S47 — i18n Phase 4: My Work

- [x] `i18n.js` — +22 mw.* keys VI + EN (greeting, dl.*, champion.*, urgent.*, tasks.*, init.*, case.*)
- [x] `my-work.js` — all hard-coded VI strings → t()/tState(); fixed t-shadowing by renaming map params t→ct, task
- [x] `config.js` — APP_VERSION='6.13-i18n-phase4-20260709'; cache-bust ?v=20260709f
- [x] `verify_my_work.mjs` — +MW36-MW39 EN/VI switching; **62/62 PASS**
- [x] Full regression: **16/16 suites PASS**

---

## ✅ COMPLETED S46 — CI (TD-012)

- [x] `run_tests.mjs` — sequential runner: 16 suites, ✅/❌ per suite, exits 1 on failure
- [x] `package.json` — `"test": "node run_tests.mjs"` + `"engines": { "node": ">=18" }`
- [x] `.github/workflows/ci.yml` — ubuntu-latest, Node 20, playwright chromium, `npm test`
- [x] Local smoke: **16/16 PASS** in ~5 min

---

## ✅ COMPLETED S45 — i18n Phase 3

- [x] `i18n.js` — +32 keys (cp.stat.*, cp.view.*, cp.preset.*, cp.filter.*, bld.*, ap.*) VI + EN
- [x] `index.html` — data-i18n on CP stat cards, preset spans, view toggle, scope toggle, CP filter labels, BLD filter label/refresh/history; cache-bust ?v=20260709e
- [x] `action-plan.js` — period buttons + summary strip + all-teams option via t()
- [x] `bld-queue.js` — count chip + empty state + filter selects via t()
- [x] `app.js` — renderAll() re-renders AP + BLD when views visible (live lang switch)

---

## 🔴 PRIORITY 0 — Smoke test on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.13-i18n-phase4-20260709` |
| Switch EN: My Work greeting | "Hello, [name] 👋" |
| Switch EN: section titles | "Action Needed / My Tasks / My Initiatives / Team Case Pipeline" |
| Switch EN: deadline badges | "Overdue Xd / Today! / In Xd" |
| Switch EN: champion section | "Weekly Champion / ✅ Updated / ⚠️ Not updated" |
| Switch back VI | All labels restore to Vietnamese |
| CI green | https://github.com/tuanttstb-debug/SHTD-Dashboard/actions |

---

## 🔲 CANDIDATE TASKS S50+

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S49 on production** | See checklist above |
| P2 | **i18n Phase 7** — remaining views | `gantt.js`, `kpi-overview.js`, `kpi-progress.js`, `owner-analysis.js` — low-priority, less user-facing |
| P2 | **Phase 0 security hardening** | Per arch roadmap — input sanitization, RBAC audit |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S44a

- [x] `my-work.js` — _mwBuildInitSection MAX_INIT=4; "Xem tất cả →" calls mwOpenInitPopup(); mwOpenInitPopup/mwCloseInitPopup functions
- [x] `index.html` — #mwInitPopup overlay + #mwInitPopupList + #mwInitPopupCount; cache-bust ?v=20260709c
- [x] `my-work.css` — .mw-popup-ini-item + .mw-popup-ini-header
- [x] `navigation.js` — mwCloseInitPopup() in ESC chain
- [x] `config.js` — APP_VERSION='6.10-mw-init-popup-20260709'
- [x] `verify_my_work.mjs` — MW26-MW29; **45/45 PASS** (was 35)
- [x] Full regression: **15/15 suites 469/469 PASS**

---

## 🔴 PRIORITY 0 — Smoke test on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.10-mw-init-popup-20260709` |
| My Work → Initiative section | Shows up to 4 initiative cards |
| "Xem tất cả →" click | Popup opens (NOT navigating to initiative-tracker) |
| Popup content | Shows ALL root initiatives with status badges, ms/task counts |
| "Mở Initiative Tracker" in popup | Navigates to Initiative Tracker + closes popup |
| ESC key | Closes popup |
| Backdrop click | Closes popup |

---

## 🔲 CANDIDATE TASKS S45

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S44a Initiative Popup** | See checklist above |
| P1 | **Smoke test S43 i18n Phase 2** | Badge v6.9; switch EN → Status/Not Started/Active; switch back → VI restored |
| P1 | **Smoke test S42 My Work** | Login → My Work default landing; role views; quick-save; G+M shortcut |
| P1 | **Smoke test S41 Issue Tracker** | GAS redeploy needed (IssueService.gs) |
| P2 | **My Work — Highlight task champion** | Weekly update reminder for tasks with highlight=Y |
| P2 | **i18n Phase 3** | Extend to other views: bld-queue, case-pipeline filter labels, action-plan |
| P3 | **TD-012: add CI** | npm test + GitHub Actions for 15 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S43

- [x] `i18n.js` — `STATE_KEY` map + `tState()` helper + 50 new VI/EN keys
- [x] `helpers.js` — `stateChip()` uses `tState()` for language-aware display text
- [x] `index.html` — `data-i18n` on filter bar labels, preset button spans, scope toggle spans; explicit `value` attrs on `filterState` options
- [x] `tasks.js` — `renderFilterChips()` uses `t()+tState()`; `renderTaskTable()` count/empty text uses `t()`; `_populateFilterPic()` uses `t('common.all')`
- [x] `config.js` — `APP_VERSION='6.9-i18n-phase2-20260709'`; cache-bust `?v=20260709b`
- [x] `verify_i18n_p2.mjs` — **36/36 PASS** (IP1–IP14)
- [x] `verify_my_work.mjs` — MW18 `loginUsername` focus race fix
- [x] Full regression: **15/15 suites 459/459 PASS** (0 regressions)

---

## 🔴 PRIORITY 0 — Smoke test on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.9-i18n-phase2-20260709` |
| Switch to EN | Filter bar: "Task ID", "Status", "Health (RAG)", "Report Week" |
| State chips (EN) | Task rows show "Not Started", "In Progress", "Completed" |
| Preset buttons (EN) | "Active", "This Week", "Overdue", "All" |
| Scope toggle (EN) | "Mine", "All" |
| Filter chip (EN) | Select Status filter → chip shows "Status: In Progress" |
| Switch back to VI | All labels restore to Vietnamese |
| filterState option value | Select "In Progress" in EN → `filterState.value === "Đang thực hiện"` (filtering still works) |

---

## 🔲 CANDIDATE TASKS S44

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S43 i18n Phase 2** | See checklist above |
| P1 | **Smoke test S42 My Work** | Login → My Work default landing; role views; quick-save; G+M shortcut |
| P1 | **Smoke test S41 Issue Tracker** | GAS redeploy first (IssueService.gs route). |
| P2 | **i18n Phase 3** | Extend to other views: bld-queue, case-pipeline filter labels, action-plan |
| P2 | **My Work — "Xem tất cả Initiative" popup** | Click "Xem tất cả →" → overlay with full initiative list |
| P2 | **My Work — Highlight task champion** | Weekly update reminder for tasks with highlight=Y |
| P3 | **TD-012: add CI** | npm test + GitHub Actions for 15 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S42

- [x] `assets/css/my-work.css` (NEW) — full styles: page, sections, urgent list, task cards, RAG dots, progress, init/case cards, dark mode, responsive
- [x] `assets/js/views/my-work.js` (NEW) — role detection, data getters, HTML builders, `renderMyWork()`, quick-save functions (state/RAG/progress/result)
- [x] `i18n.js` — `nav.my-work` + `page.my-work` VI + EN
- [x] `navigation.js` — `renderMyWork()` dispatch, G+M keymap
- [x] `app.js` — default landing `navigateTo('my-work')` in `startApp()`, `renderAll()` guard
- [x] `index.html` — CSS link, nav item (fa-house-user icon), view section, KB G+M row, script tag, cache-bust `?v=20260709`
- [x] `config.js` — `APP_VERSION='6.8-my-work-20260709'`
- [x] `verify_my_work.mjs` — **35/35 PASS** (port 3042, MW1–MW25)
- [x] Full regression: **14/14 suites 423/423 PASS** (13 existing + new my-work suite)

---

## 🔴 PRIORITY 0 — Smoke test My Work on production

| Check | Expected |
|---|---|
| Login → landing | My Work view loads (not Dashboard) |
| PO user (team Số/BL/CV1/CV2) | 3 sections: Cần làm ngay / Task của tôi / Initiative phụ trách |
| PTKD user (team PTKD MB/MN) | Sections: Cần làm ngay / Task của tôi / Case Pipeline của team |
| Deadline badge | Overdue → "Quá hạn 3N"; soon → "Còn 5N" |
| Urgent section | Tasks ≤7 days appear; done excluded |
| Quick save state | Dropdown change → task saves + re-renders |
| Quick save RAG | Click dot → colors in-place |
| Quick save progress | Click bar → input; blur → bar updates |
| Quick save result | Blur textarea → saved |
| G+M shortcut | Press G then M → My Work |

---

## 🔲 CANDIDATE TASKS S43

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S42 My Work** | See checklist above. Hard-reload first (v6.8-my-work-20260709). |
| P1 | **Smoke test S41 Issue Tracker** | GAS redeploy first (IssueService.gs). |
| P2 | **My Work — "Xem tất cả Initiative" popup** | Click "Xem tất cả →" → overlay with full list (currently navigates to initiative-tracker view). Optional enhancement. |
| P2 | **My Work — Highlight task champion** | Weekly update smoke test (PO requirement from S41 notes). |
| P2 | **i18n Phase 2** | Translate view content labels: tasks filter bar, STATE/RAG display mapping |
| P3 | **TD-012: add CI** | npm test + GitHub Actions for 14 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S41

- [x] `backend/IssueService.gs` (NEW) — Sheet `Issue_Tracker` 18 cols, `issueRead/UpsertRow/DeleteRow()`
- [x] `backend/Code.gs` — 3 routes: `issue-read`, `issue-upsert`, `issue-delete` + auditLog
- [x] `constants.js` — `dbIssues`, all ISSUE_* constants, `ISSUE_SLA_DAYS`
- [x] `api.js` — complete Issue API section: `rowToIssue/issueToRow/genIssueId/_gasIssueUpsert/Delete/readIssues/persistIssues/loadIssuesFromCache`
- [x] `app.js` — `loadIssuesFromCache()` + `readIssues()` on startup
- [x] `assets/css/issue-tracker.css` (NEW, 220 lines) — KPI grid, badges, charts, modal, overlay, dark mode
- [x] `assets/js/views/issue-tracker.js` (NEW, 430 lines) — full view: KPI, charts, MTTR, root cause, table, CRUD modal, view popup, export
- [x] `index.html` — CSS link + nav item (badge) + view section + `#itModal` + `#itViewOverlay` + KB shortcut G+I + script tag + cache-bust `?v=20260708`
- [x] `navigation.js` — `renderIssueTracker()` dispatch, ESC chain, G+I keymap
- [x] `i18n.js` — `page.issue-tracker` VI + EN
- [x] `config.js` — `APP_VERSION='6.7-issue-tracker-20260708'`

---

## 🔴 PRIORITY 0 — GAS redeploy (BLOCKING for Issue Tracker to work)

1. Open GAS editor → New file → paste contents of `backend/IssueService.gs`
2. `Code.gs` already has the 3 new routes (update `Code.gs` in GAS editor too)
3. Deploy → New deployment → Web app → Execute as Me, Anyone
4. URL should stay the same (just a new version)
5. Verify: open Issue Tracker → add test issue → check `Issue_Tracker` sheet auto-created

---

## 🔴 PRIORITY 0b — Smoke test Issue Tracker

| Check | Expected |
|---|---|
| Navigate G+I | Issue Tracker view loads; KPI cards show 0/0/0/– |
| Thêm Issue | Modal opens; severity→ deadline auto-fills; Loại xử lý → status options update |
| Save issue | Toast "✅ Đã tạo issue IS-26-001"; row appears in table; `syncDot` blinks |
| SLA Breach highlight | Set deadline to yesterday → row turns red (`row-overdue` class) |
| Charts | After 3+ issues: Trend line shows data points; System bar shows counts |
| MTTR table | After 1 resolved issue with ngayGiaiQuyet set: table shows dept row |
| Export Excel | Click Export → `.xlsx` downloaded with correct headers |
| View popup | Click table row → view overlay opens; backdrop click closes |
| ESC | Modal + popup both close on ESC |
| Dark mode | Severity/status badge colors adjust correctly |

---

## 🔲 TODO S42 — CANDIDATE TASKS

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S41 Issue Tracker** | See table above. GAS redeploy first. |
| P1 | **Smoke test S40 BL migration** | Confirm GAS data migrated (all `team='BL1'/'BL2'` → `'BL'`); users re-logged in to refresh session token. |
| P2 | **Issue Tracker — comment/log thread** | Add per-issue notes timeline (Ghi chú entries with timestamp+user), similar to audit history tab |
| P2 | **Issue Tracker — bulk status update** | Select multiple issues → change status/dept together |
| P2 | **i18n Phase 2** | Translate VIEW content labels: tasks filter bar, STATE/RAG display mapping |
| P3 | **TD-012: add CI** | `npm test` + GitHub Actions for 11 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S40

- [x] `constants.js` TEAM_LIST: `['BL1','BL2',...]` → `['BL','CV1','CV2','PTKD MB','PTKD MN','QLDM','Số']`
- [x] `index.html` `#filterTeam` + `#ganttFilterTeam`: BL1/BL2 → BL
- [x] `config.js` APP_VERSION → `'6.6-team-bl-merge-20260707'`; cache-bust → `?v=20260707`
- [x] `verify_action_plan.mjs`, `verify_case_pipeline_s36.mjs`, `verify_mobile_s37.mjs`: BL1/BL2 → BL; **all pass**
- [x] `backend/MigrationService.gs` (NEW): `dryRunTeamBL()` / `commitTeamBL()` — batch migrate sheets

---

## ✅ COMPLETED S39

- [x] Create `assets/js/i18n.js` — `t()`, `setLang()`, `applyI18n()`, TRANSLATIONS VI+EN (~120 keys)
- [x] VI/EN toggle pill to topbar; `.lang-toggle` CSS in `components.css`
- [x] `index.html` — `data-i18n` on 30+ elements
- [x] `navigation.js` — `t('page.'+view)`; `copyPath()` toasts use `t()`
- [x] `crud.js` — modal/confirm/toast use `t()`
- [x] `app.js` — `applyI18n()` + toggle sync on `window.onload`
- [x] cache-bust `?v=20260706b` (52 refs); `APP_VERSION='6.6-i18n-phase1-20260706'`

---

## ✅ COMPLETED S39

- [x] Create `assets/js/i18n.js` — `t()`, `setLang()`, `applyI18n()`, TRANSLATIONS object VI+EN (~120 keys each), `_lang` in localStorage (`5579193`)
- [x] Add VI/EN toggle pill to topbar; `.lang-toggle` + `.lang-btn` CSS in `components.css` (`5579193`)
- [x] `index.html` — `data-i18n`/`data-i18n-title` on nav sections (6), nav items (5), login overlay, breadcrumb, topbar icon titles, dashboard KPI cards+section titles+filter bar (30+ elements) (`5579193`)
- [x] `navigation.js` — `titles` map removed, replaced with `t('page.'+view)`; `copyPath()` toasts use `t()` (`5579193`)
- [x] `crud.js` — modal titles, confirm titles+buttons, key toasts now use `t()` (`5579193`)
- [x] `app.js` — `window.onload` calls `applyI18n()` + syncs lang toggle button active state (`5579193`)
- [x] `i18n.js` as FIRST script tag; cache-bust `?v=20260706b` (52 occurrences); `APP_VERSION='6.6-i18n-phase1-20260706'` (`5579193`)

---

## 🔲 TODO S40 — CANDIDATE TASKS

> Ưu tiên: P1 = blocking / user-reported; P2 = next feature; P3 = tech debt / cleanup

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S39 i18n** | Manual: switch to EN → nav shows "Overview"/"Management"/"Reports"/"Assistant"/"Administration"; nav items show "BLĐ Approval"/"Initiative Tracker"/"Task Management"/"User Management"; dashboard KPIs show "Total Tasks"/"Completed"/"In Progress"/"Overdue"; login shows "Sign In"/"Username"/"Password". Switch back → VI restored. Badge `v6.6-i18n-phase1-20260706`. |
| P1 | **Smoke test S38 conflict detection** | Manual: open same task in 2 tabs, save Tab B first, then save Tab A → "⚠️ Xung đột cập nhật" dialog. Verify [Hủy] reloads form with Tab B's data; [Ghi đè và lưu] writes Tab A's version. |
| P1 | **Smoke test S37 on real iOS device** | Playwright 21/21 ✅ confirmed. Real-device: topbar always visible, toolbar buttons reachable, sticky thead clears topbar when scrolling. |
| P1 | **Smoke test S36 on production** | Confirm RAG dots gone for done/blocked; scope=all default; tuần BC filter; summary popup. |
| P2 | **i18n Phase 2** | Translate VIEW content labels: tasks filter bar (Lọc theo, Tìm kiếm...), STATE_LABELS/RAG_LABELS display mapping (display-only, not raw data), KPI view labels. Requires careful display-layer mapping: `STATE_DISPLAY[lang][rawValue]` pattern so raw GAS values unchanged. |
| P2 | **Case Pipeline — table view sort by giaTriTy** | Currently Kanban only. Table view has no sort on value column. |
| P2 | **Case Pipeline — export to Excel** | No export button currently. Should follow pattern of task export. |
| P3 | **i18n Phase 3** | Full coverage: bld-queue, initiative-tracker, action-plan form labels. |
| P3 | **TD-012: add CI** | 11 test suites, 255 assertions. `npm test` script + GitHub Actions would prevent regressions. |
| P3 | **TD-004: global state** | `let _cpFilterTuanBC`, `let _cpScope`, etc. accumulate as module-level mutable state. |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S37

- [x] Fix topbar hidden on iOS Safari: `.topbar{position:fixed;top:0;left:0;right:0;z-index:150}` — removed from flex flow, unaffected by `.main{overflow:hidden}` (`7eb9547`)
- [x] Content padding-top: 74px (≤768px) / 68px (≤480px) to clear fixed topbar (`7eb9547`)
- [x] Sticky thead top: 62px (≤768px) / 56px (≤480px) to clear fixed topbar when scrolling (`7eb9547`)
- [x] Toolbar stack vertically on mobile: `flex-direction:column` + `width:100%` for left/right + `flex-wrap:wrap;justify-content:flex-start` for buttons (`7eb9547`)
- [x] `.path-hint{display:none}` on mobile — long file path not actionable on mobile (`7eb9547`)
- [x] Cache-bust `?v=20260627c` (51 occurrences); `APP_VERSION='6.6-mobile-toolbar-fix-20260627c'` (`7eb9547`)
- [x] Playwright smoke test `verify_mobile_s37.mjs` **21/21 PASS** at 375×812 iPhone viewport — M1–M10 covering topbar fixed, content padding, hamburger, sidebar, toolbar stack, path-hint, thead offset, scroll behavior

---

## 🔲 TODO S38 — CANDIDATE TASKS

> Ưu tiên: P1 = blocking / user-reported; P2 = next feature; P3 = tech debt / cleanup

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S37 on real iOS device** | Playwright 21/21 ✅ already confirmed. Real-device check confirms `100vh` browser chrome offset on actual iOS Safari. Verify: (1) topbar always visible, not hidden behind URL bar; (2) toolbar buttons in Tasks + Case Pipeline all reachable; (3) sticky thead clears topbar when scrolling; (4) sidebar slide-in still works. Badge shows `v6.6-mobile-toolbar-fix-20260627c`. |
| P1 | **Smoke test S36 on production** | Confirm RAG dots gone for done/blocked; scope=all default; tuần BC filter; summary popup. |
| P2 | **Case Pipeline — table view sort by giaTriTy** | Currently Kanban only. Table view has no sort on value column. |
| P2 | **Case Pipeline — export to Excel** | No export button currently. Should follow pattern of task export. |
| P2 | **Summary popup — pagination** | If `dbCases` grows large (>50 cases), popup body will be very long. Add simple pagination or max-height scroll indicator. |
| P3 | **TD-012: add CI** | 11 test suites, 255 assertions. `npm test` script + GitHub Actions would prevent regressions. |
| P3 | **TD-004: global state** | `let _cpFilterTuanBC`, `let _cpScope`, etc. accumulate as module-level mutable state. Consider encapsulating per-view state in objects. |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S36

- [x] Done/blocked stages: `calcCaseRag()` returns `''` for done/blocked groups; `action-plan.js` overdue check updated
- [x] Default scope = 'all' for all users (removed role check from `_getCpScope()`)
- [x] Filter tuần báo cáo (`cpFilterTuanBC` select, chronological sort, chip, clear)
- [x] Summary popup: `#cpSummaryOverlay`, 4 types (total/value/overdue/bld), clickable rows open detail, ESC closes
- [x] Playwright 28/28 PASS — `verify_case_pipeline_s36.mjs`; EVD in `test-results/cp_s36/`
- [x] Cache-bust `?v=20260627b` (51 occurrences); `APP_VERSION=6.6-case-pipeline-enhancements-20260627`

---

## 🔲 TODO S37 — CANDIDATE TASKS

> Ưu tiên: P1 = blocking / user-reported; P2 = next feature; P3 = tech debt / cleanup

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S36 on production** | Confirm RAG dots gone for done/blocked; scope=all default; tuần BC filter; summary popup. Users must hard-reload first. |
| P2 | **Case Pipeline — table view sort by giaTriTy** | Currently Kanban only. Table view has no sort on value column. |
| P2 | **Case Pipeline — export to Excel** | No export button currently. Should follow pattern of task export. |
| P2 | **Summary popup — pagination** | If `dbCases` grows large (>50 cases), popup body will be very long. Add simple pagination or max-height scroll indicator. |
| P3 | **TD-012: add CI** | 11 test suites, 255 assertions. `npm test` script + GitHub Actions would prevent regressions. |
| P3 | **TD-004: global state** | `let _cpFilterTuanBC`, `let _cpScope`, etc. accumulate as module-level mutable state. Consider encapsulating per-view state in objects. |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S33

- [x] GAS `auditReadByEntity(entityId)` in `AuditService.gs` — reads Audit_Log, filters by Summary prefix match (avoids cross-ID false positives) (`ea55a2b`)
- [x] GAS `audit-read` route in `Code.gs` — no ADMIN_ONLY gate; all authenticated roles can access (`ea55a2b`)
- [x] GAS deployed by user 2026-06-24 — `audit-read` live, URL unchanged (`ea55a2b`)
- [x] `_gasAuditRead(entityId)` + `_buildHistoryTable(rows, synthetic, actionMap)` in `api.js` — lazy fetch, action badges, alternating rows, empty state icon, fmtTs handles ISO/YYYY-MM-DD/DD-MMM-YY (`ea55a2b`)
- [x] CSS: `.popup-tabs`, `.popup-tab`, `.popup-tab.active`, `.badge-info` appended to `components.css` (`ea55a2b`)
- [x] Task history tab: `_taskHistoryLoaded` flag + `_taskTabSwitch()` + `_loadTaskHistory()` in `tasks.js`; synthetic "Tạo mới" row from `t.startDate` (`ea55a2b`)
- [x] Case history tab: same pattern in `case-pipeline.js`; **startDate defaults to today (YYYY-MM-DD)** when `openCaseModal(null)` (`ea55a2b`)
- [x] Initiative history tab: same pattern in `initiative-tracker.js`; **startDate defaults to today (DD-MMM-YY)** using `_MMM` global when `_initOpenModal(null)` (`ea55a2b`)
- [x] `index.html`: tab bars + history panes added to `#taskViewOverlay`, `#initViewOverlay`, `#cpViewOverlay`; cache-bust `?v=20260622` → `?v=20260624` (35 script tags, Python); `APP_VERSION = '6.4-history-20260624'` (`ea55a2b`)
- [x] `verify_history.mjs` (new, port 9992): **47/47 PASS** — H1–H14 covering HTML structure, tab switching, lazy load, history content, synthetic row, startDate defaults; EVD to `test-results/history/` (`ea55a2b`)
- [x] `AI_CONTEXT/PROJECT_STATE.md` updated (v6.4, HEAD `ea55a2b`) (`466f9e9`)

---

## ✅ COMPLETED S32

- [x] docs(S31 handover): SESSION_HANDOVER + PROJECT_STATE + TODO_NEXT + TECH_DEBT updated (`f583f80`)
- [x] `verify_select_bug.mjs` 23/23 PASS — S31 regression tests: selectAll scoped, navigateTo clear, filter clear, goPage clear, deletedIds blacklist (`b95627d`)
- [x] Bug: `sortBy()` now calls `selectedIds.clear()` — column sort reorders tasks across pages; stale selections showed wrong count in bulk bar (`56e3e43`)
- [x] Bug: cache-bust bumped `?v=20260619d` → `?v=20260622` via Python (NOT PowerShell — corrupts Vietnamese UTF-8); `APP_VERSION = '6.3-select-fix-20260622'` (`56e3e43`)
- [x] `verify_select_bug.mjs`: S6 (sortBy test) added → **26/26 PASS**; EVD screenshots s6_before/after_sort.png captured (`56e3e43`)

---

## ✅ COMPLETED S31

- [x] Bug 1: `_gasTaskUpsert` discarding `task-delete` response when task ID changes → task reappears in DB (`689bb10`)
- [x] Bug 2a: `onFilterChange()` missing `selectedIds.clear()` → filter change left stale bulk selections (`5a75f97`)
- [x] Bug 2b: Removed 7 duplicate filter event listeners from `setupListeners()` that were cancelling `onFilterChange`'s debounce (`9e8bfd3`)
- [x] Bug 2c: `navigateTo('tasks')` now calls `selectedIds.clear()` before `renderTaskTable()` → bulk bar no longer shows on page enter (`0cec10b`)
- [x] Bug 3: `db.deletedIds` blacklist — prevents Excel import from re-inserting deleted tasks; persisted in localStorage; pruned on GAS read confirm (`df3339b`)
- [x] `toggleSelectAll` scoped to current page only (`ea8d5d7`)

---

## ✅ COMPLETED S30

- [x] Root cause confirmed: `syncAction` in `bulk.js` → `task-write + N rows` (selectedIds persists across views)
- [x] `bulk.js`: `bulkSetRag/State/Delete` → N × `_gasTaskUpsert`/`_gasTaskDelete` (atomic, optimistic-update) — NO syncAction
- [x] `config.js`: new GAS URL (new deployment with `task-upsert`, `task-delete`, `case-upsert`, `case-delete`, `initiative-upsert` handlers)
- [x] APP_VERSION badge in topbar breadcrumb (`v6.3-no-syncaction-20260619`)
- [x] Startup console diagnostic: confirms version + whether deleteTask uses atomic or old syncAction
- [x] `syncAction()` caller trace: logs stack whenever called (debug, temporary)
- [x] Cache-bust all 35 script tags → `?v=20260619d`
- [x] `verify_atomic_write.mjs`: added T8b + T8c — **41/41 PASS**
- [x] Commit + push `4fc6648`, `origin/main` ✅

---

## ✅ COMPLETED S29

- [x] Audit 8 điểm dùng `localAction()` → save success nhưng không ghi GAS (S23b regression)
- [x] `crud.js`: `handleSubmit` + `deleteTask` → `await syncAction()`
- [x] `bulk.js`: `bulkSetRag/State/Delete` → `await syncAction()`; rename `const synced` tránh duplicate declaration
- [x] `bld-queue.js`: task BLD approval → `await syncAction()` (parity với case BLD)
- [x] `initiatives.js`: `syncInitiativeAdd/Edit` thêm `return` để expose promise
- [x] `initiative-tracker.js`: `_initSave` → `async`, thêm `await` trước sync calls, toast sau sync
- [x] `verify_sync_fix.mjs`: 24/24 PASS — GAS calls verified runtime cho tất cả 8 features
- [x] Commit `2986e51`, push `origin/main`
- [x] TD-034 (CRITICAL data loss) → RESOLVED

---

## ✅ COMPLETED S28

- [x] Commit tài liệu HDSD: `USER_MANUAL.md`, `HDSD/` (10 screenshots), `SYSTEM_UNDERSTANDING_REPORT.md` — từ untracked 2026-06-16
- [x] Commit reference + utility files: `TPBank_KPI_Dashboard_v2.1.html`, `generate_docx.py`, `screenshot_hdsd.mjs`, `um_test.mjs`, `verify_ms_tasks.png`
- [x] Cập nhật AI_CONTEXT handover + memory files cho cả hai project

---

## ✅ COMPLETED S27

- [x] `_initOpenMilestone()`: auto-gen ID = `{parentId}-M{nextNum}`, pre-fill Category từ parent initiative
- [x] `_initNextMsNum(parentId)`: tính số thứ tự milestone tiếp theo (max existing `-M{n}` + 1)
- [x] `openTaskModalForMilestone(msId, iniId)`: mở task modal pre-filled initiative, milestone, category, PIC Accountable (từ ini.accountable), team (từ _appUsers), auto-gen task ID
- [x] "+ Task" button trên mỗi milestone row trong `_initBuildMilestoneList()`
- [x] "+ Thêm Task" trong empty-state của milestone task panel (`_initBuildMsTaskList()`)
- [x] Test: `verify_milestone_task.mjs` 23/23 PASS; `verify_task_init_popup.mjs` 28/28 PASS (no regression)
- [x] Commit `104b81c`, push `origin/main`

---

## ✅ COMPLETED S26

- [x] Fix: `updateFilterDropdowns()` không còn rebuild `filterPic` — tránh format conflict (picNorm vs Username) gây mất filter sau save
- [x] `_populateFilterPic()` trong `renderTaskTable()` là owner duy nhất của `filterPic` dropdown
- [x] Test: `verify_task_init_popup.mjs` 28/28 PASS (no regression)
- [x] Commit `7dbabce`, push `origin/main`

---

## ✅ COMPLETED S25

- [x] Task view popup: `rowClick()` → `openTaskViewPopup(id)` — read-only overlay, full task details, chips, grid, sections
- [x] Task view popup: "Chỉnh sửa" → `taskViewOpenEdit()` → ghi nhớ `_taskEditReturnId` → open edit modal
- [x] Return-to-popup: `handleSubmit()` re-open task view popup sau save; cancel clears `_taskEditReturnId`
- [x] Initiative view popup: card header click → `openInitViewPopup()` (cursor:pointer); stopPropagation trên actions
- [x] Initiative view popup: "Chỉnh sửa" → `initViewOpenEdit()` → `_initEditReturnId` → `_initOpenModal()`
- [x] `_initSave()`: re-open init popup sau save nếu `_initEditReturnId` set
- [x] Task rows trong milestone/linked-task list → `openTaskViewPopup()` (không còn `editTask()`)
- [x] ESC handler: thêm `closeTaskViewPopup()`, `closeInitViewPopup()`, `_initCloseModal()`
- [x] `#taskViewOverlay` + `#initViewOverlay` HTML (reuse `.cp-view-*` CSS)
- [x] Test: `verify_task_init_popup.mjs` 28/28 PASS; all regression tests pass

## ✅ COMPLETED S19

- [x] GAS Backend: `CasePipelineService.gs` (caseRead, caseWrite, auto-create sheet)
- [x] Code.gs routes: `case-pipeline-read`, `case-pipeline-write`
- [x] Frontend constants: CASE_STAGES (14), CASE_COLS (20), CASE_LOAI_HINH, CASE_COMPLEXITY, dbCases
- [x] API layer: caseToRow, rowToCase, genCaseId, calcCaseRag, readCases, writeCases, syncCaseAction (với GAS fallback), persistCases, loadCasesFromCache
- [x] CSS: `case-pipeline.css` (Kanban, cards, modal, summary, stage groups)
- [x] View: `case-pipeline.js` (renderCasePipeline, Kanban 14 cols, summary cards, CRUD modal, filters, Excel import/export)
- [x] index.html: CSS link, nav item, view section, CRUD modal, G+C shortcut in kb-grid, script tag
- [x] navigation.js: title map, render dispatch, G+C shortcut, ESC close cpModal
- [x] app.js: startup cache load, readCases, navBadgeCase, dbCases reset on clear
- [x] BLD Queue: _bldGetPendingCases, _bldBuildCaseHTML, bldOpenAction multi-source, bldSubmitAction case branch
- [x] Tests: verify_case_pipeline.mjs 20/20 PASS; verify_bld_queue.mjs 46/46 PASS; verify_ms_tasks.mjs 14/14 PASS
- [x] PO deploy GAS: CasePipelineService.gs + Code.gs routes case-pipeline-* (2026-06-15; GS_WEBAPP_URL không đổi)
- [x] Smoke test thêm task live: ✅ thành công

## ✅ COMPLETED S20

- [x] index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle (Table/Kanban), preset bar 4 tabs, filter bar (Task Manager pattern), filter chips, #cpTableWrap (default), #cpBoardWrap (hidden)
- [x] case-pipeline.css: Thêm .cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, .sort-icon styles
- [x] case-pipeline.js: Full rewrite → Table-primary (paginated 20/page, sortable 10 cols), 4 preset tabs, _cpGetFiltered() unified, debounced search, filter chips, _cpInitPresetTabs() on every render
- [x] api.js: syncCaseAction thêm syncDot.className = 'status-dot syncing' tại đầu hàm
- [x] initiatives.js: syncInitiativeAction() (Task Manager gold standard), syncInitiativeAdd/Edit/Delete dùng pattern mới
- [x] verify_case_pipeline.mjs: 22/22 PASS (table-primary — +TEST05b kanban toggle, +TEST08b preset tabs)

## ✅ COMPLETED S21

- [x] constants.js: +TEAM_LIST (8 teams: BL1/BL2/CV1/CV2/PTKD MB/PTKD MN/QLDM/Số) — offline fallback
- [x] api.js: +_appUsers[], loadAppUsers() (GAS 'user-list'), getAppTeams(), getUsersByTeam(), _populateTeamSelect(), _populateUserSelect() với offline fallback + PIC mismatch protection
- [x] app.js: loadAppUsers() non-blocking trên startup
- [x] index.html: Task modal fTeam→select+onchange, fPicAcc/fPicRes→select; Case modal cpfTeam→select+onchange, cpfPic→select
- [x] crud.js: openTaskModal() dùng _populateTeamSelect/_populateUserSelect; +onTaskTeamChange() (re-filter PIC + autoGenId)
- [x] case-pipeline.js: openCaseModal() dùng helpers; +onCaseTeamChange()
- [x] initiative-tracker.js: initFAcc input→select; populate via _populateUserSelect (all users)
- [x] verify_case_pipeline.mjs: Fix TEST12 .fill()→.selectOption() cho cpfTeam — 22/22 PASS
- [x] verify_bld_queue.mjs: 46/46 PASS (no regression); verify_ms_tasks.mjs: 14/14 PASS

## ✅ COMPLETED S22b (undocumented — commits between S22 và S23 trên main)

- [x] docs: update S22 ai_context handover (`6f1c23b`)
- [x] fix(user-management): constrain table-wrap height so only rows scroll (`b134d54`)
- [x] feat: pre-fill Team/PIC from logged-in user on Add modal — Task/Case/Initiative (`5323b75`)
- [x] rebrand: org name 'Số Hóa Tín Dụng / Khối KHDN' → 'Trung tâm SP&GPTD' (`691ba9b`)
- [x] fix(initiatives): repair milestone-to-parent linking when sheet has no header row (`ef40075`)

## ✅ COMPLETED S23

- [x] Task filter: PIC cascade từ Team — `_populateFilterPic(team)`, `onFilterTeamChange()` trong tasks.js (`b3262eb`)
- [x] Case Pipeline filter: PIC cascade từ Team — `_cpSyncFilterPic()`, `cpFilterTeamChange()` (`b3262eb`)
- [x] Case Pipeline: DVKD column trong bảng + DVKD filter dropdown (`b3262eb`)
- [x] Import RBAC: `lead-only` CSS class + `canImport()` JS guard — restrict import tới Admin+Teamlead (`dfac565`)
- [x] Modal grid fix: `minmax(0,1fr)` trong forms.css + case-pipeline.css + initiative.css (`6ad6c32`)
- [x] Tests: verify_filter_cascade.mjs 23/23, verify_import_rbac.mjs 15/15, verify_modal_layout.mjs 9/9
- [x] ai_context handover S23 (`11c5770`)

## ✅ COMPLETED S23b

- [x] refactor(sync): Task CRUD/bulk/BLD-approval → `localAction()` (local only, no GAS write) (`65388ae`)

## ✅ COMPLETED S24

- [x] Code.gs: xóa `user-list` khỏi `ADMIN_ONLY` → tất cả roles load `_appUsers` (`a58474e`)
- [x] bld-queue.js: `${isAdmin() ? '...' : ''}` gate trên Phê duyệt/Từ chối/Yêu cầu bổ sung — cả `_bldBuildCaseHTML` + `_bldBuildItemHTML` (`a58474e`)
- [x] performance.js: +`openPerfTaskPopup(key)` — click row → detailOverlay với filtered tasks (`a58474e`)
- [x] case-pipeline.js: +`openCaseViewPopup(id)`, `closeCaseViewPopup()`, `cpViewOpenEdit()`, `_cpViewId`; `cpOpenDetail()` → popup (`a58474e`)
- [x] index.html: +`#cpViewOverlay` HTML (read-only case detail modal) (`a58474e`)
- [x] case-pipeline.css: +`.cp-view-grid` CSS layout cho popup (`a58474e`)
- [x] navigation.js: +`closeCaseViewPopup()` trong Escape handler (`a58474e`)
- [x] tasks.js: picRes filter case-insensitive `.toLowerCase()` — PA1 (`edc6a26`)
- [x] parsers.js: +`_resolvePickerCase()` — canonical Username resolve; gọi cuối `_parseArrayIntoDb()` — PA2 (`edc6a26`)
- [x] api.js: gọi `_resolvePickerCase()` sau `loadAppUsers()` — handle cache-before-users race — PA2 (`edc6a26`)
- [x] Branch cleanup: local + remote `master` đã xóa; push thẳng `main` từ nay
  - `api.js`: +`localAction()` function
  - `crud.js`: saveTask(), deleteTask() use localAction
  - `bulk.js`: bulkSetRag(), bulkSetState(), bulkDelete() use localAction; fixed count-before-clear bug
  - `bld-queue.js`: task BLD approval path uses localAction; Case BLD still syncCaseAction (unchanged)
  - Only `handleImport()` in app.js retains `syncAction()` — sole GAS write path for tasks

---

## ✅ COMPLETED S35

- [x] Fix stale DOM handle in `verify_action_plan.mjs` AP9: re-query `page.$('.ap-filter-bar select')` after `selectOption('BL2')` triggers re-render — new `teamSelReset` const (`a28f770`)
- [x] Fix AP13 test: initiatives have no period filter → empty state never fires in prev-month; assert `html.includes('0 tasks/cases')` in toolbar count instead (`a28f770`)
- [x] **24/24 PASS** on verify_action_plan.mjs (previously crashing at AP9 reset after 18 tests)
- [x] Bug fix: left sidebar not scrollable on desktop — `.sidebar { height:100vh }` + `.nav-menu { min-height:0 }` in `layout.css`; sidebar scrollbar styled rgba(255,255,255,0.2) for dark bg (`2cb947f`)
- [x] CSS cache-bust: added `?v=20260624c` to all 16 local `<link rel="stylesheet">` tags — CSS had no versioning before S35 (`2cb947f`)
- [x] JS cache-bust `?v=20260624b` → `?v=20260624c` (35 script tags, Python); `APP_VERSION = '6.5-sidebar-scroll-fix-20260624c'` (`2cb947f`)

---

## ✅ COMPLETED S34

- [x] `action-plan.js` complete rewrite: filter state, role-aware default team, period range, extended criteria (Blocked/overdue auto-add), grouped accordion Admin view, single-team User/TL view, Tasks+Cases mixed kanban, Initiatives section (no period filter) (`a28f770`)
- [x] CSS: Action Plan v2 styles appended to `components.css` (`a28f770`)
- [x] `verify_action_plan.mjs` (new, port 9993): **24/24 PASS** — AP1–AP14 (`a28f770`)
- [x] Cache-bust `?v=20260624` → `?v=20260624b`; `APP_VERSION = '6.5-action-plan-v2-20260624b'` (`a28f770`)
- [x] Docs: PROJECT_STATE, SESSION_HANDOVER, TODO_NEXT updated

---

## ✅ COMPLETED S33

- [x] GAS `auditReadByEntity(entityId)` + `audit-read` route — all roles, deployed 2026-06-24 (`ea55a2b`)
- [x] `_gasAuditRead()` + `_buildHistoryTable()` in `api.js` (`ea55a2b`)
- [x] History tab in Task/Case/Initiative view popups — lazy load (`ea55a2b`)
- [x] startDate defaults to today for new Case (YYYY-MM-DD) and Initiative (DD-MMM-YY) (`ea55a2b`)
- [x] CSS: `.popup-tabs`, `.popup-tab.active`, `.badge-info` (`ea55a2b`)
- [x] `verify_history.mjs` 47/47 PASS (`ea55a2b`)

---

## 🔴 PRIORITY 0 — User hard-reload required (Ctrl+Shift+R)

Cache-bust `?v=20260624c` pushed in `2cb947f`. Users must hard-reload to pick up **both JS and CSS** changes from S34+S35:

- **Windows/Linux**: Ctrl+Shift+R (or Ctrl+F5)
- **Mac**: Cmd+Shift+R
- **Verify**: Topbar badge shows `v6.5-sidebar-scroll-fix-20260624c`
- **Verify sidebar**: Nav menu scrolls when items exceed viewport height (e.g. "Quản lý User" accessible at bottom)

⚠️ **CSS cache-bust was missing before S35** — if users did Ctrl+Shift+R after S33/S34 they still got old CSS. S35 is the first release where CSS is properly versioned.

---

## 🔴 PRIORITY 0b — Smoke test production: Action Plan v2

Sau hard-reload, smoke test trên live:

| Scenario | Steps | Expected |
|---|---|---|
| **Admin view** | Login Admin → Action Plan | Accordion nhóm theo team; số task/case mỗi team; first team mở sẵn |
| **User/TL view** | Login User/Teamlead → Action Plan | Hiển thị kanban của team chính; summary strip phía trên |
| **Period filter** | Click "Quý này" / "Tháng trước" | Kanban cập nhật đúng deadline trong kỳ |
| **RAG filter** | Click "■ Red" | Chỉ hiện task/case RAG=Red |
| **Team dropdown (Admin)** | Chọn BL1 từ dropdown | Chuyển sang single-team kanban view cho BL1 |
| **Auto badge** | Tìm task Blocked (highlight=N) | Xuất hiện trong kanban với ⚡Auto badge |
| **Initiatives section** | Xem bên dưới kanban | Hiện danh sách parent initiatives của team |
| **Accordion toggle** | Click header team để thu/mở | Body ẩn/hiện không re-render toàn bộ |
| **Task card click** | Click card trong kanban | taskViewOverlay mở đúng task |
| **Case card click** | Click card có ★CASE badge | cpViewOverlay mở đúng case |

---

## ✅ PRIORITY 0c — GAS redeploy — RESOLVED 2026-06-24

- `audit-read` route deployed — URL unchanged
- `task-upsert`/`task-delete` returning `serverTs` — also confirmed in S30 GAS

---

## 🔴 PRIORITY 0d — Verify production atomic writes (S30)

| Check | Expected GAS Audit_Log |
|---|---|
| **Delete single task via modal** | `task-delete \| CV-xxx \| Task Name` — KHÔNG có `task-write + N rows` |
| **Save/edit single task via modal** | `task-upsert \| CV-xxx \| Task Name` |
| **Bulk RAG change** | N × `task-upsert \| ID` (1 per task) — KHÔNG có `task-write + N rows` |
| **Bulk delete** | N × `task-delete \| ID` — KHÔNG có `task-write + N rows` |
| **Excel import (expected)** | `task-write + N rows` — đây là ĐÚNG, chỉ path này còn dùng syncAction |
| **Verify badge** | Topbar hiện `v6.3-no-syncaction-20260619` |
| **Verify console** | `[SHTD] v6.3-... — deleteTask uses: ✅ _gasTaskDelete` |

**Sau khi verify OK**: Xóa debug trace khỏi `api.js` (syncAction caller log) và startup diagnostic khỏi `app.js`.

---

## 🔴 PRIORITY 0e — Fix verify_sync_fix.mjs (stale after S30)

`verify_sync_fix.mjs` (S29, 24/24) test bulk ops gọi `syncAction`. Sau S30 bulk dùng atomic → những tests sẽ FAIL. Options:
- Update tests T3–T5 để expect `task-upsert`/`task-delete` thay vì `write`
- Hoặc deprecate file (coverage đã có trong verify_atomic_write.mjs T8b/T8c)

---

## 🔴 PRIORITY 0f — Smoke test live: S29 + S25–S27 features (còn hiệu lực)

| Feature | Check |
|---|---|
| **Task save → GAS** | Edit task → Lưu → syncDot hiện "syncing" rồi "connected"; reload page → data vẫn đúng trên Sheet |
| **Task delete → GAS** | Xóa task → Sheet mất task đó ngay (không cần import) |
| **Bulk ops → GAS** | Chọn 2+ tasks → bulk RAG/State/Delete → Sheet cập nhật (atomic per row) |
| **BLD approve task → GAS** | BLD approve task → yKienBLD lên Sheet (parity với Case BLD) |
| **Initiative save → GAS** | Thêm/sửa initiative → syncDot syncing→connected; Sheet cập nhật |
| **Milestone auto-gen ID** | Mở Initiative Tracker → bấm "Thêm Milestone" → ID tự điền dạng `{iniId}-M{n}` → Category pre-filled từ initiative cha |
| **Add Task from Milestone** | Bấm "+ Task" trên milestone row → task modal mở → fInit, fMs, fCat, fPicAcc pre-filled đúng; task ID tự gen theo pattern `{iniId}-M{n}-001` |
| **Add Task from empty milestone panel** | Mở task panel của milestone chưa có task → bấm "+ Thêm Task" → modal pre-filled đúng |
| **Task view popup** | Click task row → taskViewOverlay hiện đúng data; Chỉnh sửa → edit modal; ESC đóng |
| **Initiative view popup** | Click card header → initViewOverlay hiện đúng data; Chỉnh sửa → initiative modal; ESC đóng |
| **Return-to-popup sau save** | Edit task từ view popup → save → popup re-opens với data mới |
| **Filter preserved after save** | Chọn filter PIC → edit/add task → save → filter PIC còn nguyên trong dropdown |
| **Display_Name (Username) dropdowns — non-Admin** | Login với role User/Teamlead → mở Task modal → fPicRes có format "Tên (username)" |
| **GAS deploy confirm** | Xác nhận GAS đã deploy với user-list không còn ADMIN_ONLY |

---

## 🟡 PRIORITY 1 — Smoke test live: S23 features (cascade filter, RBAC, modal)

| Feature | Check |
|---|---|
| **Task filter — PIC cascade** | Chọn Team trong filter bar → filterPic dropdown update đúng users |
| **Case filter — PIC cascade** | Chọn Team → cpFilterPic update; DVKD column hiển thị; filter DVKD hoạt động |
| **Import RBAC** | Login User → Import button ẩn; login Teamlead/Admin → visible |
| **Modal layout** | Mở Edit modal Task/Case/Initiative → 2 cột đều nhau, không bị squeeze |
| **Case BLD approval** | BLD approve case → yKienBLD lưu vào Sheet ngay (syncCaseAction) |
| Case Pipeline load | Mở view → Table view là default, hiển thị đúng dữ liệu từ Sheet |

---

## 🟡 PRIORITY 1b — Dọn dead code: `localAction()` và debug trace

1. **`localAction()`** trong `api.js` — không còn caller sau S29. Xác nhận: `grep -r "localAction" assets/js/` = 0 ngoài khai báo → xóa.
2. **syncAction caller trace** trong `api.js:244` — debug log tạm thời, xóa khi production stable.
3. **Startup diagnostic** trong `app.js:18` — debug log tạm thời, xóa khi production stable.

---

## 🔴 PRIORITY 2 — Verify AI Chat trên live

AI Chat frontend hoàn chỉnh từ S12. GAS-side chưa xác nhận.

**Steps**:
1. Login Admin → AI Assistant → gõ câu hỏi
2. Nếu lỗi → GAS editor → AiService.gs → Script Properties → `GEMINI_API_KEY` → Deploy new version

---

## 🟡 PRIORITY 3 — Fix Testing Environment (Netlify hết credit)

Options (chưa chọn):
- **A) Cloudflare Pages** (miễn phí, unlimited) — khuyến nghị
- **B) GitHub Pages cho master** (gh-pages branch)
- **C) Local only** — hiện đang dùng tạm

---

## W2 — Tech Debt (low priority)

| ID | Debt | Effort |
|---|---|---|
| TD-033 | `verify_initiative_v2.mjs` không inject auth → fail local; copy pattern verify_bld_queue | Small |
| TD-008 | No error boundary in `renderAll()` | Small |
| TD-018 | `fmtExportDate` duplicated `app.js` vs `helpers.js` | Tiny |
| TD-023 | `_oaActiveTab` not reset on re-render | Tiny |
| AUTH-05 | KNOWN_ROLES hardcoded | Small |
| ~~TD-030~~ | ~~User Management table — no search/pagination~~ | ✅ Done S22 |
| TD-031 | BAU task ID gap sequence khi clone | Tiny |

---

## Session Rules

1. **Đọc SESSION_HANDOVER + PROJECT_STATE trước** — không skip
2. **Branch**: push thẳng lên `main`; `master` không dùng nữa kể từ S19
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2'].tasks` — trừ khi PO yêu cầu
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. **Test local**: `npx http-server . -p 3030 &` → `node verify_case_pipeline.mjs` + `node verify_bld_queue.mjs`
9. `syncCaseAction` có local fallback — khi GAS down vẫn save local.
10. **Git sync**: commit + `git push origin HEAD:main` ngay sau mỗi thay đổi — git remote LUÔN phải đồng bộ với local. Không delay push.
