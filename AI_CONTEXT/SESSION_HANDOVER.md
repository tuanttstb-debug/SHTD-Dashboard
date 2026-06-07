# SESSION HANDOVER
**Date**: 2026-06-06 (Session 8 — OBS-01 fix + Auth login system)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard (branch: master)
**Local HEAD**: `a9ad88d`
**Remote HEAD**: `a9ad88d` (in sync)
**Previous session HEAD**: `768c722`

---

## Tasks Completed This Session

| # | Task | Commit | Status |
|---|---|---|---|
| W0 | Fix OBS-01 — db.initiatives silently overwritten in syncAction() | `5bf9fed` | ✅ Tested local + pushed |
| W1 | Delete 3 temp debug scripts (verify_kpi_zoom, verify_kpi_detail, verify_mobile2) | local only | ✅ Files deleted from disk |
| AUTH | Full login system: GAS AuthService + client auth.js + login UI | `a9ad88d` | ✅ Deployed to production |

---

## Files Changed This Session

| File | Change |
|---|---|
| `assets/js/api.js` | OBS-01 fix (3 lines removed) + all fetch() → gasPost() |
| `assets/js/app.js` | Auth check on startup; startApp() extracted for post-login call |
| `assets/js/initiatives.js` | fetch() → gasPost() |
| `assets/js/kpi-parser.js` | fetch() → gasPost() |
| `assets/js/constants.js` | GS_WEBAPP_URL updated (new GAS deployment with auth) |
| `backend/Code.gs` | auth-login action (no token) + validateToken gate on all other actions |
| `index.html` | Login overlay HTML; auth.css + auth.js script tags added |
| `assets/css/auth.css` | NEW — login screen overlay + user-pill dropdown styles |
| `assets/js/auth.js` | NEW — gasPost() helper, session storage, login/logout UI, applyUserToUI() |
| `backend/AuthService.gs` | NEW — SHA-256 hash, HMAC-SHA256 token, authLogin(), validateToken(), setupInitialUsers() |

---

## Architecture: Auth System

**Token scheme**: Stateless HMAC-SHA256 signed token, 24h expiry
```
payload = JSON.stringify({u, dn, r, t, exp})
token   = base64(payload) + '.' + HMAC-SHA256(payload, AUTH_SECRET)
```
- `AUTH_SECRET` from GAS Script Properties (fallback: `shtd_2026_internal`)
- No session table in sheet — validation is pure crypto, no DB read
- Client stores `{token, user, exp}` in `localStorage['shtd_auth_v1']`

**gasPost(body)** in `auth.js` — single GAS fetch helper:
- Auto-injects token into every request body
- On `AUTH_REQUIRED` response → calls `doLogout()` automatically
- All api.js / initiatives.js / kpi-parser.js now use gasPost()

**GAS User_Master sheet** (9 cols):
`Username | Display_Name | Role | Team | Email | Active | Created_At | Last_Login | Password_Hash`

**Users seeded** (password = Username, case-sensitive):
- TuanTT4 → Admin
- DungLQ1 → Admin
- QuangNN3 → User

---

## Decisions Made

| Decision | Reason |
|---|---|
| Stateless HMAC token (no session sheet) | Avoids GAS quota cost of DB read on every request |
| Password sent plain over HTTPS, hashed in GAS | Acceptable for internal tool; HTTPS protects transport |
| Role stored in token but not enforced in UI yet | Phase 1 = auth gate only; role-based UI = future session |
| AUTH_SECRET hardcoded fallback | Allows deploy without Script Properties setup; upgrade later |

---

## Blockers

None. Production deployed and working.

**Common confusion**: Password_Hash in User_Master sheet is NOT the login password.
Login password = plain text (e.g., `TuanTT4`). GAS hashes it internally.

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| Token expiry mid-session | ⚪ LOW | After 24h, all gasPost() calls get AUTH_REQUIRED → auto-logout. Expected behavior. |
| readInitiatives() background call on AUTH_REQUIRED | ⚪ LOW | If token expires during background load, doLogout() fires. Rare (24h window). |
| All GAS actions now require token | 🟡 MEDIUM | Any GAS call without token returns AUTH_REQUIRED. Verify no code path bypasses gasPost(). |

---

## Next Session

Priority order:
1. **W2 Tech Debt**: TD-008 (error boundary in renderAll), TD-018 (fmtExportDate dedup), TD-023 (_oaActiveTab reset)
2. **W3 Phase D Mobile UX**: MOB-01, MOB-02, MOB-03
3. **Future Auth**: Role-based UI (Admin vs User button visibility), change password UI, Admin user management panel
