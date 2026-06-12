# PROJECT STATE
**As of**: 2026-06-12 (Session 18 — Rà soát BLĐ: UI + nút duyệt + trường Ý kiến BLĐ)
**Version in index.html**: v6.2
**Remote HEAD (master)**: `090b94a` — S18: btn-success fix, BUG-04 disable reset, yKienBLD (cột 24), debug_login.mjs
**Remote HEAD (main)**: `1c57999` — PR #20 merged (S17 bugfix đã lên Production); ⏳ chờ PR S18
**⚠️ Schema drift**: `master` ghi 24 cột, `main` ghi 23 cột — merge S18 → main sớm để tránh lệch cột X (xem SESSION_HANDOVER Regression Risks)

---

## Branch Strategy (NGUYÊN TẮC BẮT BUỘC)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `master` | Testing — ⚠️ Netlify hết credit → dùng local Playwright | Developer / AI |
| `main` | Production — GitHub Pages | **PO only** |
| `fix/*` | Bugfix branches → PR → main (PO tạo PR) | AI / Developer |

**Quy trình**:
1. Develop → commit → `git push origin master` (hoặc `fix/*` branch)
2. Verify local: `npx http-server . -p 3030 &` → `node verify_bld_queue.mjs`
3. PO review → PO tạo PR → merge lên `main`
4. **AI/Claude KHÔNG được push hoặc merge lên `main` trừ khi PO chỉ định rõ ràng**

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~890 | ✅ HTML-only shell — all CSS/JS external |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/AiService.gs` | ~75 | ⚠️ Session 12 — model `gemini-2.5-flash` in repo; GAS deploy status unconfirmed; GEMINI_API_KEY may not be set |
| `backend/Code.gs` | ~150 | ✅ ai-chat route; KNOWN_ROLES; debug-auth removed; user CRUD actions (Session 13) |
| `backend/UserService.gs` | ~130 | ✅ NEW Session 13 — userList/Create/Update/ResetPassword; SHA-256 hash; deployed |
| `backend/Config.gs` | 6 | ✅ `SPREADSHEET_ID`, `SHEET_NAME`, `DATA_RANGE` (S18: comment A1:X — backend KHÔNG cần redeploy, schema động theo header) |
| `backend/AuthService.gs` | ~165 | ✅ authLogin(), validateToken(), changePassword(), setupInitialUsers(); no hardcoded fallback |
| `backend/SheetService.gs` | ~65 | ✅ sheetRead() returns {values,serverTs}; sheetWrite() VERSION_CONFLICT check via Script Properties |
| `backend/AuditService.gs` | 32 | ✅ auditLog() appends to Audit_Log sheet |
| `backend/KpiSheetService.gs` | 51 | ✅ KPI Summary GAS backend — deployed + tested |
| `backend/InitiativeService.gs` | 60 | ✅ `initiativeRead()` / `initiativeWrite()` for Initiative_Master |
| `assets/js/config.js` | 5 | ✅ GS_WEBAPP_URL deployment variable; update on every GAS redeploy |
| `assets/css/` | 15 files | ✅ + `bld-queue.css` (S16, 296 lines); `executive-summary.css` (S15); `initiative.css` +71 lines S14; `auth.css` RBAC broadened (S13) |
| `assets/js/` | 33 modules | ✅ + `views/bld-queue.js` (S16→S17 bugfix→S18: BUG-04 disable reset, yKienBLD, `_bldOpinionSrc` legacy fallback); `views/executive-summary.js` (S15); `views/user-management.js` (S13) |
| `assets/js/api.js` | ~166 | ✅ S17 BUG-03 local fallback; S18: `taskToRow` cột 23 `yKienBLD` |
| `debug_login.mjs` | 61 | ✅ NEW S18 — tool chẩn đoán login local với user thật (env LOGIN_USER/LOGIN_PASS) |
| `assets/js/kpi-parser.js` | 164 | ✅ xlsx parse + GG Sheet sync for KPI data |
| `assets/js/initiatives.js` | ~120 | ✅ INI_COLS, parser, CRUD sync functions |

---

## Feature Status

| Feature | Works? | Notes |
|---|---|---|
| **BLD Approval Queue (Phê duyệt BLĐ)** | ✅ | S16 + S17 bugfix + S18: btn-success CSS, BUG-04 nút disable, Ý kiến BLĐ riêng (yKienBLD) hiển thị card/form/QuickView/report — **46/46 Playwright PASS** |
| **Ý kiến Ban lãnh đạo (yKienBLD)** | ✅ | NEW S18 — cột 24 (X) Task_Master; ghi qua màn Phê duyệt BLĐ; readonly trong Task form; backward-compat marker cũ trong noiDungBLD |
| **Executive Summary (Tổng hợp BLĐ)** | ✅ | NEW S15 — 5 KPI cards, RAG donut, Attention list, Initiative health table; G+E shortcut |
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
| **KPI Overview** | ✅ | Browser verified session 7 |
| **KPI Progress** | ✅ | Browser verified session 7 |
| **Owner Analysis** | ✅ | Browser verified session 7 — 3 tabs |
| **KPI Dynamic Pipeline** | ✅ | Load `File raw.xlsx` → parse → update KPI views live; sync to/from GG Sheet `KPI_Summary` |
| **Initiative Tracker** | ✅ | Accordion cards, CRUD modal, cascade delete, filter; milestone short labels (M1…) |
| **Milestone → Task drill-down** | ✅ | Session 14 — per-milestone task sub-panel with alignment badges; auto-fix loose link |
| **Milestone→Task link** | ✅ | Task form `#fMs` auto-populates from Initiative_Master milestones; fallback to M1-M8 |
| **Task ID auto-gen** | ✅ | Session 15 — `fId` readonly; format `{init}-{ms}-{seq}` (e.g. `Econtract-001-M1-001`); nút "Tạo lại mã"; auto-update khi đổi initiative |
| **Task Manager Preset Tabs** | ✅ | Session 15 — 4 tabs: Đang làm (default) / Tuần BC này / Quá hạn / Tất cả; badge counts; persist localStorage |
| **Action Plan Kanban** | ✅ | 4 columns; reads db.tasks where highlight=Y |
| **Branch Analysis** | ✅ | 25 branches; zone filter; rate vs KPI color coding |
| **RM Analysis** | ✅ | 14 RMs sorted by digital rate; top-3 highlighted; KPI threshold 15% |
| Performance view (3 tabs) | ✅ | |
| Quick View Panel (Q / FAB) | ✅ | FAB ⚡ bottom-right; topbar btn hidden on mobile |
| Google Sheets sync — Tasks | ✅ | Read-Then-Patch v6.1 |
| Google Sheets sync — KPI | ✅ | `kpi-write` / `kpi-read` via `KpiSheetService.gs` |
| Excel import | ✅ | Flexible column mapping |
| Excel export | ✅ | Date "22-Apr-26", progress "75%" |
| Dark mode | ✅ | |
| **Login / Auth** | ✅ | Fixed S11 — KNOWN_ROLES includes Teamlead. S18 verified: login local user thật hoạt động end-to-end (TuanTT4, QuangNN3); DungLQ1 role hạ xuống User |
| **AI Assistant** | ⚠️ | Frontend complete; `gemini-2.5-flash` in repo; GAS AiService.gs deploy + GEMINI_API_KEY unconfirmed |
| **User Management** | ✅ | Admin-only menu; list/add/edit/reset-pw/toggle-active; GAS deployed; live-tested Session 13 |
| **Role-based UI** | ✅ | Admin: full access. User/Teamlead: `.admin-only` hidden via `body:not([data-role="Admin"])` |
| **Audit Trail** | ✅ | Audit_Log sheet; every write (task/kpi/initiative/password) logged |
| **Change Password** | ✅ | User-pill dropdown → modal; 6-char min; GAS validates old PW before writing new hash |
| **Optimistic Locking** | ✅ | VERSION_CONFLICT on concurrent task writes; client re-reads from server |
| Mobile sidebar | ✅ | Slide-in overlay; hamburger always visible |
| Mobile layout (general) | ⚠️ | Filter bar/toolbar/Gantt still in backlog (Phase D) |
| Keyboard shortcuts | ✅ | Ctrl+N, Ctrl+D, Ctrl+B, G+x, Q, G+K |
| localStorage cache | ✅ | Key: `shtd_v2` — unchanged |

---

## Architecture State

```
CURRENT (Session 17 — BLD Queue Bugfix)
─────────────────────────────────────────────────
index.html (~960 lines — HTML only)
assets/
  css/  tokens.css, base.css, layout.css, components.css,
        forms.css, table.css (+preset CSS), gantt.css, quickview.css,
        responsive.css, kpi.css, initiative.css, auth.css, ai-chat.css
        executive-summary.css   ← NEW Session 15 (120 lines, es- prefix)
        bld-queue.css           ← NEW Session 16 (296 lines, bld- prefix)
  js/   config.js          ← GS_WEBAPP_URL (update on each GAS redeploy)
        constants.js (+activePreset), helpers.js (genId 3-param), storage.js, parsers.js
        api.js (+ serverTs/clientTs optimistic locking)
        auth.js (+ applyUserToUI data-role, changePw modal)
        ui/toast.js, ui/modal.js, ui/theme.js, ui/navigation.js
          ← S15: navigateTo('tasks') → renderTaskTable(); fInit/fTeam/fMs listeners
        crud.js ← S15: fId readonly, autoGenId+cloneTask pass ms, handleSubmit origId lookup
        bulk.js
        views/dashboard.js, views/tasks.js ← S15: preset logic (5 new fns)
              views/gantt.js, views/performance.js, views/quickview.js
        report.js, kpi-data.js, kpi-parser.js
        views/kpi-overview.js, views/action-plan.js, views/kpi-progress.js
        views/owner-analysis.js, views/branch-analysis.js, views/rm-analysis.js
        views/initiative-tracker.js ← S14: milestone drill-down + alignment badges
        initiatives.js
        views/ai-chat.js
        views/user-management.js    ← NEW Session 13
        views/executive-summary.js  ← NEW Session 15 (180 lines)
        views/bld-queue.js          ← NEW Session 16 (308 lines)
        app.js
backend/
  Code.gs, Config.gs, AuthService.gs, SheetService.gs
  AuditService.gs, KpiSheetService.gs, InitiativeService.gs
  UserService.gs     ← DEPLOYED (Session 13)
  AiService.gs       ← gemini-2.5-flash in repo; GAS deploy unconfirmed
  GAS.GS             ← archived patch v6.2
verify_initiative_v2.mjs ← ⚠️ fail local từ khi có auth (không inject token — TD-033)
verify_kpi_views.mjs     ← 3/3 PASS (session 7)
verify_mobile.mjs        ← 4/4 PASS (session 7)
um_test.mjs              ← 14/14 PASS (session 13)
verify_ms_tasks.mjs      ← 14/14 PASS (re-verified S18)
verify_bld_queue.mjs     ← 46/46 PASS (S18 — +TEST16-20: disable reset, yKienBLD, form, legacy history)
debug_login.mjs          ← NEW S18 — login diagnostics
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | **In `assets/js/config.js`**; current: `AKfycbzzezX0...` — unchanged Session 13 |
| Initiative backend | ✅ Deployed (15 cols, InitiativeService.gs) |
| `GS_SHEET_ID` | `1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk` |
| `GS_RANGE` | `Task_Master!A1:X` (S18 — 24 cột) |
| `KPI_RANGE` | `KPI_Summary` tab |
| Task backend | ✅ Deployed — KHÔNG cần redeploy cho cột 24 (schema động) |
| KPI backend | ✅ Deployed + tested |
| Sheet columns | **24** — S18 thêm 'Ý kiến BLĐ' (PO approve); cột X tự xuất hiện ở lần ghi đầu từ client 24-cột |
| localStorage key | `shtd_v2` — schema unchanged |

---

## Known Issues (Active)

| ID | Issue | Priority |
|---|---|---|
| SCHEMA-01 | `main` (23 cột) vs `master` (24 cột) ghi chung sheet → cột X có thể lệch/stale đến khi merge | 🟡 Merge S18 → main sớm |
| TD-033 | `verify_initiative_v2.mjs` không inject auth → fail local (pre-existing) | 🟡 Copy pattern từ verify_bld_queue |
| MOB-01 | Filter bar cramped on mobile | 🟡 Phase D |
| MOB-02 | Toolbar button overflow on mobile | 🟡 Phase D |
| MOB-03 | Gantt unusable on mobile | 🟢 Phase D |
| DEBT-03 | `extractWorkbook` parseDate doesn't handle "dd-mmm-yy" import | ⚪ Edge case |
| DEBT-05 | `fmtExportDate` duplicated in `app.js` vs `helpers.js` | ⚪ Cosmetic |
| DEBT-06 | Inline `onchange` + `addEventListener` double handlers on filter elements | ⚪ No double render |

---

## Deployment

| Environment | URL | Branch | Managed by | Status |
|---|---|---|---|---|
| **Testing (local)** | `http://localhost:3030` | `master` | `npx http-server . -p 3030` | ✅ Dùng tạm — Playwright 34/34 |
| **Testing (Netlify)** | https://test-shtd.netlify.app | `master` | Auto-deploy | ❌ **Hết credit — không deploy** |
| **Production** | GitHub Pages URL | `main` | **PO only** | ✅ Live (1c57999 — có S17 bugfix; chưa có S18) |

- **No build step** — direct file edit → commit → push → auto-deploy
- **Workflow S17**: develop → `fix/*` branch → push → PO tạo PR → merge `main`
- **Test command (Windows)**: `npx http-server . -p 3030 --silent & node verify_bld_queue.mjs`
- **CDN deps**: Chart.js, SheetJS xlsx 0.18.5, Font Awesome 6.4.0, DM Sans/Mono
- **⚠️ Netlify hết credit** (xác nhận 2026-06-10). Options: Cloudflare Pages (khuyến nghị) / GitHub Pages / local only.
