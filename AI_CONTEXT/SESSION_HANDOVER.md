# SESSION HANDOVER
**Date**: 2026-06-07 / 2026-06-08 (Session 9 — Architecture Review + Phase 0 + Phase 1)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard (branch: master)
**Local HEAD**: `5b165e2`
**Remote HEAD**: `5b165e2` (in sync)
**Previous session HEAD**: `a9ad88d`

---

## Tasks Completed This Session

| # | Task | Commit | Status |
|---|---|---|---|
| GOV | Full architecture governance review — maturity scoring, risk assessment, approved roadmap | — | ✅ Roadmap locked with PO |
| 0-A | Remove hardcoded AUTH_SECRET fallback in AuthService.gs | `142844a` | ✅ Deployed |
| 0-C | RBAC enforcement in Code.gs router (role gate + kpi-write Admin-only) | `88838db` | ✅ Deployed |
| 0-B | XSS fix — esc() in helpers.js; all user data escaped in innerHTML across 8 files | `d0c5fec` | ✅ Pushed |
| 1-A | Role-based UI — `.admin-only` CSS + `data-role` on body; bulk delete + modal delete hidden for User | `b561624` | ✅ Pushed |
| 1-B | Audit Trail — new `AuditService.gs`; every write appends to `Audit_Log` sheet | `0311e02` | ✅ Deployed |
| 1-C | Change password — GAS `changePassword()` + `change-password` route + user-pill dropdown modal | `4bdbe72` | ✅ Deployed |
| 1-E | Config separation — `GS_WEBAPP_URL` extracted to `assets/js/config.js` | `3ec546d` | ✅ Pushed |
| 1-D | Optimistic locking — `TASK_WRITE_TS` in Script Properties; `sheetRead` returns `serverTs`; `sheetWrite` rejects stale `clientTs` | `75f3471` | ✅ Deployed |

---

## Files Changed This Session

| File | Change |
|---|---|
| `backend/AuthService.gs` | Removed hardcoded fallback; added `changePassword()` |
| `backend/Code.gs` | RBAC role gate + unknown-role reject; `kpi-write` Admin-only; `change-password` route; `serverTs` in read response; `clientTs` passed to `sheetWrite`; `auditLog()` hooks on all writes |
| `backend/SheetService.gs` | `_getTaskTs()` / `_setTaskTs()` via Script Properties; `sheetRead()` returns `{values, serverTs}`; `sheetWrite()` checks `clientTs` → throws `VERSION_CONFLICT` on mismatch |
| `backend/AuditService.gs` | NEW — `auditLog(tokenData, action, summary)` → `Audit_Log` sheet |
| `assets/js/config.js` | NEW — `GS_WEBAPP_URL` deployment variable (update this on every GAS redeploy) |
| `assets/js/constants.js` | Removed `GS_WEBAPP_URL`; added `_serverTs: null` to `db` object |
| `assets/js/auth.js` | `applyUserToUI()` sets `document.body.dataset.role`; user-pill dropdown adds "Đổi mật khẩu" item; `showChangePwModal()` + `handleChangePw()` added |
| `assets/js/api.js` | `readFromHandle()` captures `serverTs` → `db._serverTs`; `writeToHandle()` sends `clientTs`; `syncAction()` captures `serverTs` from internal read, sends `clientTs` on write; `VERSION_CONFLICT` catch path re-reads from server |
| `assets/js/helpers.js` | Added `esc()` (escapes `&<>"'`) and `_esc` alias |
| `assets/js/app.js` | XSS: `esc()` applied to `showDetailModal` row builder |
| `assets/js/views/tasks.js` | XSS: `esc()` on all user fields in table row builder |
| `assets/js/views/gantt.js` | XSS: `esc()` on `t.name` and `t.id` in gantt row |
| `assets/js/views/action-plan.js` | XSS: `esc()` on kanban card fields |
| `assets/js/views/dashboard.js` | XSS: `esc()` on initiative table, team stat bar, blocked list |
| `assets/js/views/quickview.js` | XSS: `esc()` on all four panes (name, result, nextPlan, vuongMac, noiDungBLD, …) |
| `assets/js/views/initiative-tracker.js` | Removed local `_esc()` definition — now uses global `esc()` from helpers.js |
| `assets/css/auth.css` | Added `body[data-role="User"] .admin-only { display: none !important; }` |
| `index.html` | Added `<script src="assets/js/config.js">` before constants.js; `admin-only` class on bulk-delete and modal-delete buttons |

---

## Architecture Changes

### Security (Phase 0)
- `AUTH_SECRET` hardcoded fallback eliminated. GAS throws hard error if property missing.
- `kpi-write` is now Admin-only at GAS route level. All other writes require authenticated User or Admin.
- XSS vector closed: `esc()` in `helpers.js` is the canonical escaping function. Use it on ALL user-supplied content in innerHTML. `_esc` is a backward-compat alias pointing to the same function.

### RBAC (Phase 1-A)
- Pattern: `applyUserToUI(user)` → sets `document.body.dataset.role = user.role`
- CSS rule hides `.admin-only` elements for `User` role via `!important` (overrides any inline `style.display`)
- Current admin-only elements: bulk-delete button (`#bulkBar`), task modal delete button (`#btnDelete`)
- To add new admin-only elements: just add class `admin-only`

### Audit Trail (Phase 1-B)
- `Audit_Log` sheet auto-created on first write
- Schema: `Timestamp | Username | Display_Name | Role | Action | Summary`
- Fires on: `task-write`, `kpi-write`, `initiative-write`, `change-password`
- Failure is silent (never breaks main action) — `Logger.log` only
- **This is a Phase 2 AI prerequisite** — AI chat needs change history from this log

### Optimistic Locking (Phase 1-D)
- `TASK_WRITE_TS` key in GAS Script Properties stores Unix ms of last write
- `sheetRead()` returns `{values, serverTs}` — BREAKING change from previous plain array return
- `Code.gs` already updated to handle `result.values` / `result.serverTs`
- `db._serverTs` on client: `null` on cold start (first write skips check — safe)
- `VERSION_CONFLICT` error: client shows warning toast and re-reads from server
- Covers task writes only. Initiative writes (`initiativeWrite`) do not yet have locking.

### Config Separation (Phase 1-E)
- `GS_WEBAPP_URL` is now in `assets/js/config.js`
- **On every GAS redeployment**: edit `config.js` only, commit, push
- `constants.js` now contains only app state and schema constants

---

## Decisions Made

| Decision | Reason |
|---|---|
| GAS stack stays — no backend migration | 5–10 concurrent peak; GAS viable at this scale |
| AI via Gemini API free tier, called from GAS | Zero infra cost; natural Google integration |
| Optimistic locking via Script Properties timestamp | No schema change needed; simple to implement |
| RBAC via CSS `body[data-role]` not JS logic | CSS `!important` overrides inline styles set by crud.js; no crud.js changes needed |
| `_esc` kept as alias in helpers.js | initiative-tracker.js already used `_esc` — backward compat, no rename needed |
| `kpi-write` Admin-only; all other writes open to authenticated users | Users need to sync task updates; kpi-write is an admin pipeline operation |

---

## Blockers

None. Phase 0 and Phase 1 complete. Production deployed and verified by PO.

**Verification still pending** (PO should test before Phase 2):
1. Login as QuangNN3 (User) → bulk delete + modal delete buttons should be hidden
2. Any user syncs a change → Audit_Log tab appears in Google Sheet
3. User-pill → Đổi mật khẩu → change succeeds; old password rejected
4. Two browser tabs writing simultaneously → tab B gets VERSION_CONFLICT warning

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| `sheetRead()` returns object, not array | 🔴 CRITICAL | If any code calls `sheetRead()` directly and treats result as an array, it will break. Only `Code.gs` calls it — already updated. GAS console calls will need `result.values`. |
| `db._serverTs` null on cold start | ⚪ LOW | First write after page load skips optimistic locking check. Expected — safe behavior since we just loaded fresh data. |
| Token valid 24h after password change | ⚪ LOW | Stateless tokens. Changing password does not invalidate existing sessions. Existing session remains valid until expiry. Expected for stateless design. |
| Initiative writes not covered by locking | 🟡 MEDIUM | `initiativeWrite()` has no version check. Concurrent initiative edits still last-write-wins. |
| `!important` CSS specificity for admin-only | ⚪ LOW | If any other CSS rule uses `!important` to show `.admin-only`, it will leak to User role. Currently no such rule exists. |

---

## Deployment URLs

| Environment | URL | Branch |
|---|---|---|
| Testing | https://test-shtd.netlify.app | `master` (Netlify auto-deploy) |
| Production | GitHub Pages | `main` |

---

## Next Session — Phase 2: AI Chat (Gemini)

**Prerequisite**: Gemini API key stored in GAS Script Properties as `GEMINI_API_KEY` before coding starts.

Priority order:
1. **Phase 2 AI Chat**: New GAS action `ai-chat` + new `AiService.gs` file + frontend `views/ai-chat.js` + `assets/css/ai-chat.css` + nav item (shortcut G+A)
2. **W2 Tech Debt** (if time): TD-008 (`renderAll` error boundary), TD-018 (`fmtExportDate` dedup), TD-023 (`_oaActiveTab` reset)
3. **W3 Mobile UX**: MOB-01, MOB-02, MOB-03

**Phase 2 AI architecture**:
- Pattern: RAG (Retrieval-Augmented Generation) — GAS reads current Sheet data, builds Vietnamese prompt, calls Gemini API via `UrlFetchApp`
- New GAS route: `ai-chat` (requires valid token, any role)
- Context sent to Gemini: full task list (filtered by date/team if needed), KPI summary, initiative list, recent Audit_Log rows
- Response: Gemini answer → returned to client → rendered in chat UI
- Rate limit: Gemini 1.5 Flash free tier ~15 RPM — show "Đang xử lý…" state
- Conversation is session-local only (not persisted to Sheet)
- System prompt must be in Vietnamese, scoped to SHTD project data only
