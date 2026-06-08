# TODO — NEXT SESSION
**Prepared**: 2026-06-08 (Session 10 — Phase 2 complete, AUTH blocker active)
**Context**: Phase 2 AI Chat code pushed to master. AUTH system broken — GAS returns AUTH_REQUIRED for all post-login calls. Must resolve before any other work.

---

## 🔴 PRIORITY 0 — Resolve AUTH Blocker (do this FIRST)

### Step 1 — Read [DBG] log from Netlify
1. Open https://test-shtd.netlify.app → F12 → Console → log in
2. Find line: `[DBG] session khi gọi read:`
3. Report result:
   - `token=eyJ...` → token exists, GAS rejecting it → GAS-side issue
   - `NULL` → session cleared before read → race condition

### Step 2A — If token=eyJ... (GAS rejecting valid token)
Deploy fresh Code.gs to GAS (WITH debug-auth endpoint, WITHOUT changing anything else):
1. Copy `backend/Code.gs` from repo → paste into Apps Script → Save → **New version deploy**
2. In browser console: `fetch(GS_WEBAPP_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'debug-auth',token:''})}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d)))`
3. Expected: `{"status":"ok","hasSecret":true,"secretLen":32,"roundtrip":"PASS"}`
4. If `roundtrip: "FAIL"` → AUTH_SECRET mismatch → reset AUTH_SECRET and re-run `setupInitialUsers()`

### Step 2B — If NULL (race condition)
The issue is `autoConnectDB` calling `doLogout()` which clears the session before `readInitiatives` runs.
Fix: add guard in `gasPost()` — do not call `doLogout()` if `startApp` is still initializing.

### Step 3 — After auth is fixed
- Remove TEMP `debug-auth` block from `backend/Code.gs`
- Remove TEMP `[DBG]` log from `assets/js/api.js`
- Commit as "fix: remove debug scaffolding"

---

## GAS Deploy Checklist (Session 10 state)

| File | Status |
|---|---|
| `backend/AuthService.gs` | ✅ Deployed (Session 9) |
| `backend/Code.gs` | ⚠️ UNCERTAIN — debug-auth version may or may not be deployed |
| `backend/SheetService.gs` | ✅ Deployed (Session 9) |
| `backend/AuditService.gs` | ✅ Deployed (Session 9) |
| `backend/AiService.gs` | ❌ NEW — NOT YET DEPLOYED (must deploy for ai-chat to work) |
| `backend/InitiativeService.gs` | ✅ Deployed (Session 9) |
| `backend/KpiSheetService.gs` | ✅ Deployed (Session 9) |

**Script Properties required:**
| Key | Value |
|---|---|
| `AUTH_SECRET` | `SHTD@2026#SecretKey!XyZ123456789` |
| `GEMINI_API_KEY` | (stored in GAS Script Properties only — not in repo) |
| `TASK_WRITE_TS` | Auto-created on first task write |

---

## Phase 2 — AI Chat Assistant (NEXT PRIORITY)

**Architecture decided**: RAG via new GAS action `ai-chat`. Gemini API called from GAS via `UrlFetchApp`. Session-local chat (not persisted to Sheet).

### GAS side (new file: `backend/AiService.gs`)
| Task | Detail |
|---|---|
| `buildContext(tokenData)` | Read Task_Master, KPI_Summary, Initiative_Master, last 50 Audit_Log rows → format as Vietnamese structured prompt |
| `callGemini(systemPrompt, history, userMessage)` | `UrlFetchApp.fetch()` to Gemini 1.5 Flash API; include GEMINI_API_KEY from Script Properties |
| Context size guard | If task count > 300 rows, filter to last 4 weeks before sending to Gemini |

### Code.gs additions
| Task | Detail |
|---|---|
| `ai-chat` route | Requires valid token (any role); calls `buildContext()` + `callGemini()`; returns `{status:'ok', reply}` |
| System prompt | Vietnamese; scoped to SHTD project data only; instruct to refuse off-topic questions |

### Frontend (new files)
| Task | Detail |
|---|---|
| `assets/js/views/ai-chat.js` | Chat panel: conversation array (session-local); `renderAiChat()`; `sendAiMessage()`; typing indicator |
| `assets/css/ai-chat.css` | Chat bubble styles; user vs AI message styling; typing dots animation |
| `index.html` | Add AI Chat section `<div id="aiChatRoot">` + script/css tags |
| `assets/js/ui/navigation.js` | Add `ai-chat` to nav sections; keyboard shortcut `G+A` |
| Sidebar nav item | `<i class="fa-solid fa-robot"></i> AI Chat` link in sidebar |

### Scope constraints for AI system prompt
- Answer only about tasks, KPIs, initiatives, and milestones in this project
- Use Vietnamese
- Cite task IDs or initiative IDs when referring to specific items
- Do not make up data; if data is unavailable say so
- Rate limit: Gemini free tier ~15 RPM — client shows "Đang xử lý…" state during call

---

## W2 — Tech Debt (after Phase 2)

| ID | Debt | Action |
|---|---|---|
| TD-008 | No error boundary in renderAll() | Wrap each render call in try-catch; one broken view must not freeze whole app |
| TD-018 | `fmtExportDate` duplicated in `app.js` vs `helpers.js` | Remove from app.js:exportExcel, use helpers.js version |
| TD-023 | `_oaActiveTab` not reset on re-render | Add `_oaActiveTab = 'quang'` at start of `renderOwnerAnalysis()` |

---

## W3 — Phase D Mobile UX (low priority)

| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable on mobile | Simplified mobile Gantt or hide |

---

## Auth — Future Enhancements (deferred)

| Enhancement | Notes |
|---|---|
| Admin user management panel | Add/deactivate users without editing GAS sheet manually |
| Force password change on first login | Default password = Username is still in use unless users changed it |
| Session invalidation on password change | Stateless tokens remain valid 24h after password change — AUTH-04 |

---

## Initiative Tracker — Future Enhancements (deferred)

| Enhancement | Notes |
|---|---|
| Initiative ID rename: cascade update children's `parentId` | TD-024 — fix in `_initSave()` |
| Import initiatives from Excel | Add `initiative_master` sheet detection in `extractWorkbook()` |
| Keyboard shortcut G+I → Initiative Tracker | Add to navigation.js gKey map |
| Deadline countdown badge on cards | "X ngày còn lại" / "Quá hạn X ngày" |
| Optimistic locking for initiative writes | Currently still last-write-wins (TD-025) |

---

## Session Rules (updated Session 9)
1. Read `SESSION_HANDOVER.md` + `PROJECT_STATE.md` first
2. Read `WORKING_RULE.md` — do not touch `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. JS globals: use bare `db`, not `window.db`
5. KPI globals: `fmtKN`, `kpiChip`, `dungChip`, `kpiAlertClass`, `dungAlertClass` in `kpi-data.js`
6. KPI live data: always use `getKpiData()` not `KPI_DATA` directly in KPI views
7. Initiative views: always use `_initRealRoots()` for root initiative list
8. `syncInitiativeAdd/Edit/Delete()` in `initiatives.js` are the only safe Initiative CRUD entry points
9. Chart instances: destroyed on re-render via `try { c.destroy() }`
10. All GAS calls MUST go through `gasPost()` in `auth.js` — never use raw fetch() for GAS endpoints
11. Verify scripts: use `page.route('**/script.google.com/**', r => r.abort())` to isolate from GAS background load
12. **NEW**: `GS_WEBAPP_URL` lives in `assets/js/config.js` — update config.js on every GAS redeploy, not constants.js
13. **NEW**: Use `esc()` (from helpers.js) on ALL user-supplied content rendered via innerHTML — never raw `${t.name}` in templates
14. **NEW**: `sheetRead()` in GAS now returns `{values, serverTs}` object — not a plain array. `Code.gs` handles this; do not call `sheetRead()` directly expecting an array.
