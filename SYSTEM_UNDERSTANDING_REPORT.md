# SYSTEM UNDERSTANDING REPORT
**Project:** SHTD Dashboard – Số Hóa Tín Dụng (Credit Digitalization Dashboard)
**Scanned:** 2026-06-16
**Scope:** Full codebase scan — 120+ files, ~10,000 lines code + docs
**Status:** Draft — items marked ❓ require human confirmation

---

## 1. ALL DETECTED FEATURES

### 1.1 Authentication & Access Control
| Feature | Status | Location |
|---------|--------|----------|
| Login with username/password | ✅ Implemented | `auth.js`, `AuthService.gs` |
| HMAC-SHA256 signed JWT-style tokens | ✅ Implemented | `AuthService.gs` |
| 24-hour session expiration | ✅ Implemented | `AuthService.gs` |
| Role-based access control (Admin / Teamlead / User) | ✅ Implemented | `auth.js`, `Code.gs` |
| Change password (self-service) | ✅ Implemented | `auth.js`, `AuthService.gs` |
| Admin-only reset password for others | ✅ Implemented | `UserService.gs` |
| Last login timestamp tracking | ✅ Implemented | `AuthService.gs` |
| Audit log for all write operations | ✅ Implemented | `AuditService.gs` |
| Active/inactive user flag | ✅ Implemented | `UserService.gs` |

### 1.2 Core Data Views
| Feature | Nav Label | Status | Location |
|---------|-----------|--------|----------|
| Executive Dashboard | Dashboard | ✅ | `views/dashboard.js` |
| Board-level Summary | Tổng hợp BLĐ | ✅ | `views/executive-summary.js` |
| BLD Approval Queue | Phê duyệt BLĐ | ✅ | `views/bld-queue.js` |
| Case Pipeline | Case Pipeline | ✅ | `views/case-pipeline.js` |
| Initiative & Milestone Tracker | Theo dõi Initiative | ✅ | `views/initiative-tracker.js` |
| Task Manager | Quản lý Task | ✅ | `views/tasks.js` |
| Gantt Timeline | Timeline Gantt | ✅ | `views/gantt.js` |
| Performance Analytics | Performance | ✅ | `views/performance.js` |
| KPI Overview | KPI Overview | ✅ | `views/kpi-overview.js` |
| Action Plan Kanban | Action Plan | ✅ | `views/action-plan.js` |
| KPI Progress | KPI Progress | ✅ | `views/kpi-progress.js` |
| Owner Analysis | Owner Analysis | ✅ | `views/owner-analysis.js` |
| Branch Analysis | Branch Analysis | ✅ | `views/branch-analysis.js` |
| RM Analysis | RM Analysis | ✅ | `views/rm-analysis.js` |
| AI Assistant (Gemini) | AI Assistant | ✅ | `views/ai-chat.js`, `AiService.gs` |
| User Management (Admin-only) | Quản lý User | ✅ | `views/user-management.js` |

### 1.3 Task Management Features
- CRUD: Create, Read, Update, Delete tasks
- Auto-generate Task ID from Initiative + Team + Milestone pattern
- Duplicate ID validation (client-side + server-side)
- 7 filter fields: ID, Initiative, Team, PIC Responsible, Status, RAG, Tuần BC
- 4 preset tabs: Đang làm, Tuần BC này, Quá hạn, Tất cả
- Sortable columns (Shift+click for multi-column sort)
- Pagination (20 rows per page)
- Bulk actions: set RAG, set Status, delete (Admin-only)
- Clone task
- Quick View side panel (4 tabs: completed, planned, same initiative, issues)
- Auto-progress suggestions based on status field
- Task type categories: Task, BAU, Dự án, Sáng kiến, Case

### 1.4 Case Pipeline Features
- CRUD: Create, Read, Update, Delete cases
- Dual view: Table list + Kanban board
- Auto-generate Case ID (CP-XXX format)
- Auto-calculate RAG from deadline (server-agnostic formula)
- 14 pipeline stages with Kanban group mapping
- 5 filter fields: Search, Stage, Team, Loại hình, RAG
- 4 preset tabs: Active, Cần BLĐ, Quá hạn, Tất cả
- Import from Excel (column mapping)
- Export to Excel
- BLD integration (canBLD flag)
- Case types: Món, Dự án, HMTD, Rà soát
- Complexity levels: Cao, Trung bình, Thấp

### 1.5 BLD Approval Workflow
- Unified queue for Tasks + Cases with canBLD=Y
- Filter by Team and Initiative
- Actions per item: Duyệt (approve), Từ chối (reject), Yêu cầu bổ sung (request more info)
- Mini modal with notes field before confirming action
- BLD opinion recorded in `yKienBLD` field
- History section for previously processed items
- Badge counter on nav item (live count)

### 1.6 Initiative & Milestone Tracking
- Full CRUD for Initiatives and nested Milestones
- Accordion card layout with expand/collapse
- Milestone list per Initiative with linked task count
- Status filter (Active, Done, Blocked, Paused)
- Cascade delete: deleting Initiative removes all child Milestones
- Stats bar: total, active, done, blocked, overdue counts
- Sync from Google Sheets

### 1.7 KPI Digital Module
- KPI data ingestion from Excel file (local upload) OR Google Sheets sync
- KPI 2.1 and KPI 2.2 tracking
- 6 KPI header cards with targets and actuals
- Executive insight panel with 6 auto-computed insights (GAP, forecast, top/worst PTKD)
- Charts: GD distribution, KPI line charts, top PTKD bar, BIZ vs BPM stacked bar
- 25 branches with digital rate tracking
- 14 Relationship Managers (RM) with performance ranking
- RAG thresholds: Đỏ (<80%), Vàng (80–99%), Xanh (≥100%)

### 1.8 Reporting & Export
- Weekly Report: Excel export with 4 sheets (Summary, Results, Plan, Issues)
- Export filtered by Tuần BC
- Case Pipeline Excel export
- Task list export
- KPI data export to Google Sheets
- Date format: DD-MMM-YY in exports

### 1.9 AI Assistant
- Gemini 2.5 Flash API integration (via GAS backend)
- Builds system context from: last 300 tasks, all KPI data, all initiatives, last 50 audit entries
- Retains last 10 conversation turns in memory (not persisted)
- Temperature: 0.3 (conservative/factual responses)
- Max output: 1,024 tokens

### 1.10 UX / Cross-cutting Features
- Dark / Light mode toggle (persisted in `shtd_theme`)
- Fully responsive (3 breakpoints: 1024px, 768px, 480px)
- Mobile: hamburger sidebar drawer, Quick View as bottom sheet
- Keyboard shortcuts:
  - `Ctrl+N` — New Task
  - `Ctrl+D` — Dashboard
  - `Ctrl+B` — BLD Queue
  - `Q` — Quick View toggle
  - `G+D/E/B/T/G/P/A/C` — Navigate to specific views
  - `?` — Keyboard shortcut help overlay
  - `ESC` — Close any open modal
- Toast notifications (success, error, info, warning)
- Confirm dialogs for destructive actions
- Offline mode: reads from localStorage cache when GAS unavailable
- Optimistic UI: local update first, then sync to GAS

### 1.11 Data Sync Architecture
- localStorage key `shtd_v2`: main data (tasks, cases, initiatives)
- localStorage key `shtd_auth_v1`: auth token + user info
- localStorage key `shtd_theme`: UI preference
- Read-Then-Patch sync: merges server changes with local changes
- Optimistic locking via `_serverTs` timestamp
- VERSION_CONFLICT detection (client timestamp older than server)
- Write protection: GAS refuses writes of zero tasks (data loss guard)
- Audit log on every write (non-blocking)

---

## 2. MISSING DOCUMENTS

The `AI_CONTEXT/` folder contains 22 documents but the following are absent:

| Missing Document | Why It Matters |
|-----------------|----------------|
| **API Contract / GAS Endpoint Spec** | No formal spec of what each GAS action accepts/returns. Must be reverse-engineered from `Code.gs`. Risk: breaking changes go unnoticed. |
| **Deployment Runbook** | No step-by-step guide for: redeploying GAS, updating `config.js` with new webapp URL, re-setting Script Properties (GEMINI_API_KEY, secret). |
| **User Manual / HDSD** | Explicitly flagged as in-progress. End users have no reference guide. |
| **Data Dictionary** | No formal definition of every field, its type, allowed values, and business meaning. The schema is spread across `constants.js`, `parsers.js`, `SheetService.gs`, and the Google Sheet headers. |
| **QA / Test Plan** | Playwright scripts exist as ad-hoc verify scripts but no formal test matrix. No negative-case coverage documented. |
| **Security Review** | Auth uses HMAC-SHA256 but no document auditing: token storage (localStorage, not httpOnly cookie), CORS policy on GAS, XSS surface in innerHTML rendering. |
| **Backup & Restore Procedure** | If the Google Sheet is corrupted/deleted, there is no documented recovery path. |
| **Onboarding Guide** | No guide for new team members on: how to get access, which username/password to use, and what permissions each role grants. |
| **KPI Data Format Spec** | `kpi-parser.js` uses flexible column mapping but the exact expected format of `File raw.xlsx` is not documented. |
| **GAS Script Properties Config** | `GEMINI_API_KEY` and HMAC secret are stored in Script Properties but no document lists all required properties and how to set them. |

---

## 3. MISSING SCREENSHOTS

Screenshots captured for HDSD (10 files in `HDSD/` folder) cover basic CRUD flows. The following screens are **not captured**:

| Missing Screenshot | Suggested Filename | Notes |
|-------------------|--------------------|-------|
| Executive Summary view | `09_executive_summary.png` | Board-facing view with alert indicators |
| Gantt timeline | `10_gantt_view.png` | Timeline bars, grouped by Initiative |
| Initiative Tracker (main list view) | `11_initiative_tracker.png` | Accordion card layout |
| Quick View side panel (open) | `12_quick_view.png` | 4-tab panel on right side |
| Bulk action bar (after selecting rows) | `13_bulk_actions.png` | Set RAG, Set Status, Delete |
| Weekly Report export modal | `14_report_modal.png` | Tuần BC selector + export button |
| Keyboard shortcuts overlay | `15_keyboard_shortcuts.png` | `?` key help overlay |
| KPI Overview with charts | `16_kpi_overview.png` | 4 charts + insight panel |
| KPI Progress detail | `17_kpi_progress.png` | KPI 2.1 / 2.2 meter cards |
| Owner Analysis tabs | `18_owner_analysis.png` | QuangNN3 / DungLQ1 tabs |
| Branch Analysis table | `19_branch_analysis.png` | 25 branches RAG table |
| RM Analysis table | `20_rm_analysis.png` | 14 RMs ranking |
| AI Chat conversation | `21_ai_chat.png` | Chat interface with example response |
| User Management (Admin) | `22_user_management.png` | Admin-only user CRUD table |
| Dark mode example | `23_dark_mode.png` | Any view in dark theme |
| Case Pipeline – Kanban view | `24_case_kanban.png` | Board view of 14 stage columns |
| Performance Analytics tabs | `25_performance.png` | 3 tabs: initiative, PIC, team |
| Mobile – Sidebar drawer open | `26_mobile_sidebar.png` | Hamburger clicked, drawer visible |
| Edit Task modal | `27_edit_task.png` | Task overlay with existing data |
| Edit Initiative / Milestone | `28_edit_initiative.png` | Edit modal with existing data |

---

## 4. INCONSISTENT BUSINESS LOGIC

### 4.1 RAG Calculation: Cases vs Tasks
- **Cases** (`api.js:calcCaseRag()`): RAG is **auto-calculated** from deadline — Đỏ if ≤0 days remaining, Vàng if ≤7 days, Xanh otherwise.
- **Tasks**: RAG is a **manually set field** with no auto-calculation.
- **Problem:** A user can mark a task Xanh even if it is overdue. Inconsistent with case behavior. The `isOverdue()` helper in `helpers.js` exists but is only used for display badges, not to enforce RAG on tasks.

### 4.2 Team Names: Hardcoded List vs Dynamic Loading
- `constants.js` defines `TEAM_LIST = ['BL1', 'BL2', 'CV1', 'CV2', 'PTKD MB', 'PTKD MN', 'QLDM', 'Số']`
- `storage.js:getAppTeams()` loads team list **dynamically** from GAS User_Master sheet
- `Case Pipeline` data uses `'PTKDMB'` (no space) while TEAM_LIST uses `'PTKD MB'` (with space)
- **Problem:** Team filters may not match correctly between Tasks and Cases. A case with team `PTKDMB` won't match a filter for `PTKD MB`.

### 4.3 "Case" as Task Type
- `crud.js` task form includes `"Case"` as one of the `fType` options alongside Task, BAU, Dự án, Sáng kiến
- A standalone `Case Pipeline` module also exists with its own schema and CRUD
- **Problem:** Ambiguous data model. Are "Case" tasks in the task table the same as Case Pipeline cases? They appear to be separate entities with overlapping semantic meaning and no cross-reference.

### 4.4 `handleCaseSubmit()` — Misleading Function Name
- `index.html` line 1191: button labeled **"Lưu Case"** calls `handleCaseSubmit()`
- Function actually **saves/creates the case** (equivalent to `handleSubmit` for tasks)
- `bldSubmitAction()` is the actual BLD submission function
- **Problem:** The word "Submit" in the function name implies BLD submission, not a save. Risk of future confusion when maintaining the code.

### 4.5 Default PIC List Hardcoded
- `constants.js` defines `DEFAULT_PICS = ['Tuantt4', 'Dunglq1', 'Quangnn3']`
- User Management module allows dynamic user creation/deletion
- **Problem:** If new users are added via User Management, they appear in PIC dropdowns dynamically (via `_populateUserSelect()`), but `DEFAULT_PICS` still hardcodes 3 specific names. These are used as fallback. If those 3 users are ever removed, fallback behavior breaks.

### 4.6 Progress (%) Rollup
- Initiative cards show a `progress` field
- Tasks have individual `% HT` progress fields
- **No automatic rollup:** Initiative progress is manually entered, not computed from linked task averages
- **Problem:** An Initiative can show 100% progress while all its linked tasks are at 0%, or vice versa.

### 4.7 Initiative Linking via Text Field
- Tasks reference their milestone in `milestone hiện tại` — a **freetext field**
- In `views/initiative-tracker.js`, milestone-task linking uses `t.milestone === _msShortLabel(ms.id)` comparison
- **Problem:** If a milestone label is renamed, existing task links silently break. No referential integrity enforced.

### 4.8 Action Plan Kanban — Only Highlight Tasks
- `views/action-plan.js` renders only tasks where `highlight === 'Y'`
- **Problem:** Users must manually flag `highlight = Y` to appear on the Action Plan. Tasks with RAG=Đỏ or overdue tasks are not automatically promoted to the Action Plan. A critical blocked task could be invisible here.

### 4.9 AI Context: Only Last 300 Tasks
- `AiService.gs:buildContext()` sends `Math.min(tasks.length, 300)` tasks to Gemini
- Oldest tasks are silently dropped
- **Problem:** If the organization has >300 tasks, AI answers about older initiatives or closed tasks may be inaccurate or incomplete. No indicator tells users when context is truncated.

### 4.10 Version Conflict Resolution
- `storage.js` detects VERSION_CONFLICT (client timestamp older than server) but the resolution is **last-write-wins**: the client data is forced to the server
- `SheetService.gs` blocks zero-task writes but does not block partial-overwrite conflicts
- **Problem:** If two users save simultaneously, the second save silently overwrites the first without merging. No conflict notification to the second user.

### 4.11 Quick View — Missing Team Filter
- Dashboard, Tasks, BLD Queue, Gantt all have a Team filter
- Quick View (`views/quickview.js`) only has `qvFilterInit` and `qvFilterTuan` filters — **no Team filter**
- **Problem:** Users cannot filter the Quick View by their own team, inconsistent with all other views.

### 4.12 Executive Summary vs Dashboard — Data Duplication
- Both `view-dashboard` and `view-executive-summary` render KPI summary cards, RAG donut chart, and initiative health tables
- They use different Chart.js instances (`ragChart` vs `esRagChart`) on the same underlying data
- **Problem:** Two views showing similar data from the same source. Any display bug must be fixed in two places. No clear distinction in scope for users.

---

## 5. CODE MODULES DETECTED

### Layer Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│  index.html  (1 file — SPA shell, all views + modals inline)   │
├─────────────┬───────────────────────────────────────────────────┤
│  Entry      │  app.js — startup, renderAll(), nav badges        │
├─────────────┼───────────────────────────────────────────────────┤
│  Config     │  config.js — GAS URL                              │
│             │  constants.js — global state (db, dbCases),       │
│             │                 schema, team lists, stage defs     │
├─────────────┼───────────────────────────────────────────────────┤
│  Core       │  auth.js — login/logout, token, role checks       │
│             │  storage.js — localStorage R/W, GAS sync          │
│             │  api.js — Case-specific GAS calls + RAG calc      │
│             │  initiatives.js — Initiative GAS calls            │
│             │  crud.js — Task form open/save/delete             │
│             │  bulk.js — multi-select actions                   │
│             │  parsers.js — Excel ingestion, column mapping      │
│             │  helpers.js — date, ID gen, display utils         │
│             │  report.js — weekly Excel export                  │
│             │  kpi-data.js — KPI data structure & chart mgmt    │
│             │  kpi-parser.js — KPI Excel parsing                │
├─────────────┼───────────────────────────────────────────────────┤
│  UI Helpers │  ui/toast.js — notifications                      │
│             │  ui/modal.js — open/close helpers                 │
│             │  ui/theme.js — dark/light mode                    │
│             │  ui/navigation.js — routing, keyboard shortcuts   │
├─────────────┼───────────────────────────────────────────────────┤
│  View       │  views/dashboard.js                               │
│  Renderers  │  views/executive-summary.js                       │
│  (18 files) │  views/bld-queue.js                               │
│             │  views/case-pipeline.js                           │
│             │  views/tasks.js                                   │
│             │  views/gantt.js                                   │
│             │  views/performance.js                             │
│             │  views/quickview.js                               │
│             │  views/initiative-tracker.js                      │
│             │  views/kpi-overview.js                            │
│             │  views/action-plan.js                             │
│             │  views/kpi-progress.js                            │
│             │  views/owner-analysis.js                          │
│             │  views/branch-analysis.js                         │
│             │  views/rm-analysis.js                             │
│             │  views/ai-chat.js                                 │
│             │  views/user-management.js                         │
├─────────────┼───────────────────────────────────────────────────┤
│  CSS        │  14 files — tokens, base, layout, components,     │
│  (14 files) │  forms, table, gantt, quickview, responsive,      │
│             │  kpi, initiative, auth, ai-chat, executive-        │
│             │  summary, bld-queue, case-pipeline                │
├─────────────┴───────────────────────────────────────────────────┤
│  GAS BACKEND (Google Apps Script — 10 files)                    │
│  Code.gs — doPost router (14+ action routes)                    │
│  AuthService.gs — login, token sign/verify, password           │
│  UserService.gs — user CRUD (Admin-only)                        │
│  SheetService.gs — Task_Master R/W, conflict detection          │
│  InitiativeService.gs — Initiative_Master R/W                   │
│  CasePipelineService.gs — Case_Pipeline R/W                     │
│  KpiSheetService.gs — KPI_Summary R/W                           │
│  AuditService.gs — Audit_Log append (non-blocking)             │
│  AiService.gs — Gemini 2.5 Flash via REST                       │
│  Config.gs — Spreadsheet ID, sheet names                        │
├─────────────────────────────────────────────────────────────────┤
│  GOOGLE SHEETS (Database — 1 Spreadsheet, 5 sheets)            │
│  Task_Master (A1:X — 24 columns)                               │
│  Initiative_Master (A1:O — 15 columns)                          │
│  Case_Pipeline (A1:T — 20 columns)                              │
│  User_Master (username, display, role, team, email, active...)  │
│  Audit_Log (timestamp, user, role, action, summary)            │
│  KPI_Summary (KPI data cache)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Module Dependency Map (simplified)
```
app.js
  ├── auth.js ──────────── AuthService.gs
  ├── storage.js ────────── SheetService.gs, InitiativeService.gs
  ├── api.js ────────────── CasePipelineService.gs
  ├── crud.js ─────────── (reads db from constants.js)
  ├── bulk.js ─────────── (delegates to storage.js:syncAction)
  ├── report.js ─────────── (pure local, uses db)
  ├── kpi-data.js + kpi-parser.js ── KpiSheetService.gs
  ├── ui/* ─────────────── (pure DOM)
  └── views/* ───────────── (render only, read from db / dbCases)
```

### External Dependencies (CDN, no npm)
| Library | Version | Used For |
|---------|---------|----------|
| Chart.js | latest CDN | RAG donut, KPI line/bar charts |
| SheetJS (XLSX) | 0.18.5 | Excel import/export |
| Font Awesome | 6.4.0 | All icons |
| Google Fonts (DM Sans, DM Mono) | variable | Typography |

---

## 6. ESTIMATED SYSTEM WORKFLOW

### 6.1 Application Startup
```
User opens index.html
       │
       ▼
app.js: window.onload → startApp()
       │
       ├─ loadCache() → reads shtd_v2 from localStorage
       ├─ getAuthSession() → reads shtd_auth_v1
       │
       ├── [No valid token] ──► showLoginScreen()
       │                              │
       │                        User submits credentials
       │                              │
       │                        gasPost({ action: 'auth-login' })
       │                              │
       │                        AuthService.gs validates SHA-256 password
       │                        Signs token (HMAC-SHA256)
       │                              │
       │                        Token stored → applyUserToUI()
       │                              │
       └── [Valid token] ──────► autoConnectDB()
                                       │
                      ┌────────────────┼────────────────┐
                      ▼                ▼                ▼
              readFromHandle()  readInitiatives()  readCases()
              (Task_Master)     (Initiative_Master) (Case_Pipeline)
                      │                │                │
                      └────────────────┴────────────────┘
                                       │
                               persist() → shtd_v2
                               renderAll() → all views rendered
                               updateNavBadges() → BLD count, task count
```

### 6.2 Task CRUD Flow
```
User clicks "Thêm Task" (or Ctrl+N)
       │
openTaskModal(null) → blank form, auto-gen ID
       │
User fills form → handleSubmit(event)
       │
       ├─ checkDupId() → validate locally
       ├─ Build task object from form fields
       ├─ push to db.tasks (optimistic)
       ├─ renderAll() → UI updates immediately
       └─ syncAction('upsert', task) → gasPost({ action: 'write' })
                                              │
                                     SheetService.gs
                                     checks VERSION_CONFLICT
                                     appends/updates row
                                     updates TASK_WRITE_TS
                                     auditLog(token, 'write', summary)
```

### 6.3 BLD Approval Workflow
```
Task/Case created with canBLD = 'Y'
       │
       ▼
Badge appears on "Phê duyệt BLĐ" nav item (updateNavBadges)
       │
BLD member navigates to BLD Queue
       │
Views: pending tasks + pending cases grouped separately
       │
Clicks "Duyệt" on an item → bldOpenAction('approve', id, source)
       │
#bldActionOverlay opens:
  - Title: "Phê duyệt yêu cầu"
  - Item preview (name + ID)
  - Notes textarea (optional for approve, required for reject)
  - Buttons: Hủy | Xác nhận phê duyệt
       │
User clicks "Xác nhận" → bldSubmitAction()
       │
  - Updates yKienBLD field with "[BLĐ duyệt MM/DD/YYYY]: notes"
  - Sets canBLD = 'N' (removes from queue)
  - syncAction() → writes to GAS → auditLog()
  - Item moves to History section
```

### 6.4 KPI Data Flow
```
Option A: Local Excel Upload
  User clicks "Load File" → file input → parseKpiFile()
  kpi-parser.js reads xlsx → extractKpiData() → stores in memory
  renderKpiOverview() → renders charts + insights

Option B: Google Sheets Sync
  User clicks "Sync GG Sheet" → gasPost({ action: 'kpi-read' })
  KpiSheetService.gs → reads KPI_Summary sheet
  Data returned → kpi-parser processes → stores in memory
  renderKpiOverview() re-renders

Option C: Push local KPI to Sheet
  User clicks "Lưu lên GG Sheet" → gasPost({ action: 'kpi-write' })
  Stores parsed KPI data to KPI_Summary for team sharing
```

### 6.5 Initiative ↔ Task ↔ Milestone Linking
```
Initiative (ID: SCF-001)
       │
       ├── Milestone 1 (parentId: SCF-001, type: 'milestone')
       │         │
       │         └── Task S-001 (initiative: 'SCF-001', milestone: 'M1 label')
       │
       └── Milestone 2 (parentId: SCF-001, type: 'milestone')
                 │
                 └── Task S-002 (initiative: 'SCF-001', milestone: 'M2 label')

Links:
  Task → Initiative: task.initiative = ini.id  [foreign key]
  Task → Milestone: task.milestone = _msShortLabel(ms.id)  [text match ⚠️]
  Initiative → Milestone: ms.parentId = ini.id  [foreign key]
```

### 6.6 AI Chat Flow
```
User types message → sendMessage()
       │
gasPost({ action: 'ai-chat', message, history: last10turns })
       │
AiService.gs:
  buildContext() assembles system prompt:
    - Last 300 tasks (trimmed if >300)
    - All KPI data
    - All initiatives/milestones
    - Last 50 audit log entries
       │
callGemini(systemPrompt, history, message)
  → REST POST to Gemini 2.5 Flash API
  → temperature: 0.3, maxOutputTokens: 1024
       │
Response text returned → appended to chat UI
History kept in-memory (not persisted across page reloads)
```

---

## 7. UNKNOWN FUNCTIONS REQUIRING HUMAN CONFIRMATION

The following functions, behaviors, or design decisions were detected in code but their intent, trigger, or business rule could not be determined from code alone:

| # | Function / Behavior | File | Question |
|---|---------------------|------|----------|
| 1 | `setupInitialUsers()` | `AuthService.gs` | Creates 3 hardcoded admin users (TuanTT4, DungLQ1, QuangNN3). **When is this called?** It is defined but no call site was found in the backend. Is it triggered manually from the GAS editor, or is it dead code? |
| 2 | `DEFAULT_PICS` hardcoding | `constants.js` | `DEFAULT_PICS = ['Tuantt4', 'Dunglq1', 'Quangnn3']` — are these the actual permanent staff or temporary placeholders? If a new person becomes PIC, does this list need manual updating? |
| 3 | Case RAG override | `api.js` | `calcCaseRag()` auto-calculates RAG from deadline. The stored `rag` field in the Case schema (column 16) also exists. **Does the stored value get overridden on every load, or can a user manually set RAG that persists?** Logic is unclear. |
| 4 | `VERSION_CONFLICT` UX | `storage.js` | Code detects when `clientTs < serverTs` and flags a VERSION_CONFLICT. **What does the user see when this happens?** No toast or error message for this case was found in the UI layer. |
| 5 | Drag-and-drop on Action Plan | `views/action-plan.js` | Comments indicate Kanban columns are "visual only" and drag-drop is not implemented. **Is drag-drop a planned feature or permanently out of scope?** |
| 6 | Task type `"Case"` in task form | `crud.js` | The task form includes `"Case"` as a `fType` option. This overlaps with the Case Pipeline module. **Are Case-type tasks expected to appear in Case Pipeline? Are they the same concept or different?** |
| 7 | `_bldOpinionSrc()` dual-field logic | `views/bld-queue.js` | Checks `yKienBLD` first, then falls back to `noiDungBLD`. Comment says `noiDungBLD` is "legacy". **Are there live tasks/cases still using `noiDungBLD`? Is there a migration plan?** |
| 8 | `GS_WEBAPP_URL` update process | `config.js` | GAS requires a new deployment URL every time the script is redeployed. **Is there a process for updating `config.js` and re-deploying the frontend?** This is a single-point-of-failure with no automation. |
| 9 | `GEMINI_API_KEY` management | `AiService.gs` | API key stored in GAS Script Properties. **Who has access to set/rotate this key? What happens if it expires or is revoked?** No fallback behavior was found. |
| 10 | `readFromHandle()` sequence | `storage.js` | On startup, data is fetched from GAS (tasks, initiatives, cases) in parallel. **If GAS is down, the app falls back to localStorage. Is the user notified? Is the offline cache time-bounded?** No cache expiry mechanism was found. |
| 11 | AI context truncation | `AiService.gs` | Only last 300 tasks are sent to Gemini. **Who decided this limit and is it based on Gemini token limits or GAS execution time limits?** As task count grows, older data becomes invisible to AI. |
| 12 | `Tuần BC` field format | Multiple files | Tasks use a `tuanBC` field like `"Tuần 22/2026"`. This is a string, not a date. **How is this value set — auto-generated or manually typed? Is there validation on format?** |
| 13 | Cross-team flag | `constants.js`, tasks schema | Column 22: `Cross-team? (Y/N)` exists in schema. **No view was found that filters or displays this flag.** Is it collected but unused in the UI, or was the feature removed? |
| 14 | `executive-summary` vs `dashboard` | Two views | Both render very similar data (KPI summary, RAG chart, initiative table). **What is the intended audience difference?** Dashboard appears to be for team leads; Executive Summary appears to be for board members — but no access restriction prevents any user from seeing either. |
| 15 | `loadAppUsers()` on startup | `storage.js` | Fetches user list from GAS on every page load. **Is this necessary every time, or can it be cached?** On slow connections, this adds to startup time. |
| 16 | Password hash algorithm | `AuthService.gs` | Uses SHA-256 for password hashing with **no salt** mentioned in code. **Is a salt applied server-side in a GAS property?** Unsalted SHA-256 is vulnerable to rainbow table attacks. |
| 17 | `File raw.xlsx` | Root directory | A file named `File raw.xlsx` exists at project root. **Is this a template for KPI upload, real production data, or a test fixture?** It should not be committed to version control if it contains real data. |
| 18 | Soft delete vs hard delete | `crud.js`, `bulk.js` | Task deletion removes the row from `db.tasks` and writes to GAS. **Is there a recycle bin or soft-delete mechanism?** No evidence of one was found. Deleted tasks are permanently gone. |

---

## APPENDIX: KEY FILES QUICK REFERENCE

| Need to change... | Edit this file |
|-------------------|----------------|
| GAS webapp URL | `assets/js/config.js` |
| Team list | `assets/js/constants.js` → `TEAM_LIST` |
| Case stages | `assets/js/constants.js` → `CASE_STAGES` |
| Task column mapping | `assets/js/parsers.js` |
| Login / auth logic | `assets/js/auth.js` + `backend/AuthService.gs` |
| Navigation & keyboard shortcuts | `assets/js/ui/navigation.js` |
| AI system prompt | `backend/AiService.gs` → `buildContext()` |
| KPI thresholds (Đỏ/Vàng/Xanh) | `assets/js/kpi-data.js` |
| New GAS action route | `backend/Code.gs` → `doPost()` |
| Dark mode colors | `assets/css/tokens.css` |
| Mobile breakpoints | `assets/css/responsive.css` |

---

*End of report. Items marked ❓ in section 7 require answers from the development team or product owner before documentation can be finalized.*
