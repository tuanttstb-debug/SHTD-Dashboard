# SESSION HANDOVER
**Date**: 2026-06-08 (Session 10 — Phase 2 AI Chat + Auth Incident)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Remote HEAD**: `a40e9b0` (master — after merge from remote)
**Previous session HEAD**: `5b165e2`

---

## Tasks Completed This Session

| # | Task | Commit | Status |
|---|---|---|---|
| 2-A | `backend/AiService.gs` — `buildContext()` + `callGemini()` via UrlFetchApp | `4bde525` | ✅ Pushed (GAS deploy UNCONFIRMED — see Blocker) |
| 2-B | `Code.gs` — `ai-chat` route before auth wall | `4bde525` | ✅ Pushed |
| 2-C | `assets/css/ai-chat.css` — chat bubbles, typing dots, suggestion chips | `3cadf1b` | ✅ Pushed |
| 2-D | `assets/js/views/ai-chat.js` — chat UI, `gasPost()` call, session-local history | `3cadf1b` | ✅ Pushed |
| 2-E | `navigation.js` + `index.html` — ai-chat nav, G+A shortcut, KB modal entry | `be911b7` | ✅ Pushed |
| INF | Branching strategy: `master`=Testing (Netlify), `main`=Production (GitHub Pages) | — | ✅ Confirmed with PO |
| INF | Netlify staging set up at https://test-shtd.netlify.app | — | ✅ Live |
| INF | `.gitignore` added — excludes `node_modules/`, `_verify_screenshots/`, `File raw.xlsx` | `86a1f66` | ✅ Pushed |
| FIX | `handleLogin` `finally` block — login button no longer freezes on auth failure | `e4cb975` | ✅ Pushed |
| DBG | Temp debug log in `api.js readFromHandle` — shows session state before GAS call | `d094669` | ⚠️ TEMP — must remove |

---

## 🔴 ACTIVE BLOCKER — AUTH_REQUIRED on all GAS calls after login

### Symptoms
- Login call (`auth-login`) completes successfully — user object returned, session stored
- Every subsequent GAS call (`read`, `initiative-read`, etc.) returns `AUTH_REQUIRED`
- `doLogout()` fires inside `gasPost()` → clears session → login screen re-shown
- `startApp()` never throws so `handleLogin` exits normally → UI appears to hang (now fixed with `finally`)

### Root cause — NOT YET CONFIRMED
Diagnostic steps taken:
1. `doGet` URL test → ✅ GAS alive
2. GAS `diagTokenRoundTrip` run independently → ✅ validateToken works
3. GAS `diagTokenRoundTrip` inside project → logs not visible (possible wrong project)
4. `debug-auth` endpoint added to Code.gs before validateToken → still returns `AUTH_REQUIRED` (new code not deployed by user)
5. `localStorage.clear()` + fresh login → still fails
6. **[PENDING]** Debug log `[DBG] session khi gọi read:` added to `api.js` → user has NOT yet reported output

### Next diagnostic step
After Netlify deploys latest push (`a40e9b0`):
1. User opens test-shtd.netlify.app → F12 Console → logs in
2. Looks for `[DBG] session khi gọi read:` line
3. If `token=eyJ...` → token IS sent, GAS is rejecting → GAS-side problem
4. If `NULL` → session cleared before read call → race condition in `startApp` / `doLogout` timing

### Known facts
- `AUTH_SECRET` = `SHTD@2026#SecretKey!XyZ123456789` (32 chars) — set in Script Properties
- `GEMINI_API_KEY` = set in Script Properties (key value not stored in repo)
- GAS URL (old, used by both branches): `AKfycbzzezX0qvu73U7EBrsj7VeBoPbzg6edLNt818-pzlle2Gx2xfB-NQuxJYfx3jGHRcc`
- New deployment URL created this session (`AKfycbyNWuk85hb...`) — NOT in use, config.js reverted to old URL
- GAS `debug-auth` endpoint deployment is UNCERTAIN — user may not have deployed new Code.gs version

---

## Files Changed This Session

| File | Change | State |
|---|---|---|
| `backend/AiService.gs` | NEW — `buildContext()` reads 4 sheets; `callGemini()` → Gemini 1.5 Flash | Pushed, GAS deploy unconfirmed |
| `backend/Code.gs` | `ai-chat` route + TEMP `debug-auth` endpoint (pre-validateToken) | Pushed, has TEMP code |
| `assets/css/ai-chat.css` | NEW — full chat UI styles | Pushed |
| `assets/js/views/ai-chat.js` | NEW — chat panel, session history, typing indicator | Pushed |
| `assets/js/ui/navigation.js` | `ai-chat` in titles + `G+A` shortcut + `renderAiChat()` call | Pushed |
| `index.html` | CSS/JS links, sidebar nav item, `#view-ai-chat`, KB modal entry | Pushed |
| `assets/js/config.js` | URL changed to new deployment then reverted to old | Pushed (old URL) |
| `assets/js/auth.js` | `finally` block in `handleLogin` — button always re-enables | Pushed ✅ |
| `assets/js/api.js` | TEMP `[DBG]` log in `readFromHandle` | Pushed ⚠️ MUST REMOVE |
| `.gitignore` | NEW — excludes node_modules, screenshots, raw xlsx | Pushed ✅ |
| `AI_CONTEXT/*.md` | Deployment URLs, branching strategy, session 10 delta | Pushed |

---

## Decisions Made

| Decision | Reason |
|---|---|
| `master` = Testing (Netlify), `main` = Production (GitHub Pages) | PO needs staging before promoting to prod |
| Never merge to `main` until PO confirms on Netlify | Prevents broken code reaching production |
| Revert to old GAS deployment URL | New deployment URL broke login (POST redirect behavior); old URL was stable |
| `AUTH_SECRET` set to `SHTD@2026#SecretKey!XyZ123456789` | PO changed secret during incident investigation |
| AI context only — session-local chat history | No Sheet persistence; simplifies Phase 2 architecture |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| TEMP `debug-auth` in Code.gs | 🔴 HIGH | Unauthenticated endpoint returns GAS diagnostic info. **Must remove before merging to `main`** |
| TEMP `[DBG]` log in api.js | 🟡 MEDIUM | Exposes token prefix in console. **Must remove before merging to `main`** |
| `auth.js finally` changes `handleLogin` flow | 🟡 MEDIUM | Button re-enables even on network failure mid-startApp. Tested path: login success → startApp error → button re-enables. Expected behavior. |
| AUTH_SECRET changed this session | 🟡 MEDIUM | All users with cached tokens (localStorage) will get AUTH_REQUIRED on next load. They must log in fresh. Self-resolving within 24h. |
| `main` branch not updated | 🟡 MEDIUM | All session 10 work (Phase 2, auth.js fix, .gitignore) is only on `master`. `main` still at `5b165e2`. Do NOT merge until AUTH blocker is resolved. |
| AiService.gs not confirmed deployed | 🟡 MEDIUM | `ai-chat` route in Code.gs references `buildContext()` / `callGemini()`. If AiService.gs missing in GAS project, `ai-chat` action throws ReferenceError (caught by doPost, returned as error — no crash). |

---

## Deployment State

| Environment | URL | Branch | Status |
|---|---|---|---|
| Testing | https://test-shtd.netlify.app | `master` | Live — AUTH BROKEN |
| Production | GitHub Pages | `main` | Live — AUTH BROKEN (same GAS backend) |
| GAS Backend | `AKfycbzzezX0...` | — | Live, auth issue under investigation |
