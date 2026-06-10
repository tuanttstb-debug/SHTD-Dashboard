# TODO — NEXT SESSION
**Prepared**: 2026-06-10 (Session 13 — User Management live)
**Context**: User Management feature complete + GAS deployed + live-tested. AI Chat deploy status unconfirmed.

---

## 🔴 PRIORITY 0 — Verify AI Chat on live

AI Chat code has been in repo since Session 12 (`gemini-2.5-flash`). Status of GAS-side fix unknown.

**Steps to verify:**
1. https://test-shtd.netlify.app → login Admin → AI Assistant
2. Type a question → check response
3. If error: go to GAS editor → `AiService.gs` line 58 must be `gemini-2.5-flash` → Script Properties → `GEMINI_API_KEY` = `AQ.xxx` key → Deploy new version
4. If slow (>10s): add `thinkingBudget: 0` to `generationConfig` in `callGemini()`

---

## 🟡 PRIORITY 0.5 — Push master to remote

```
git push origin master
```
Local commit `1acec34` (milestone drill-down) has NOT been pushed yet.

---

## 🟡 PRIORITY 1 — Full smoke test before merging to main

All these must pass on https://test-shtd.netlify.app before PO approves merge:

| Feature | Check |
|---|---|
| Login — Admin / Teamlead / User roles | Each role sees correct menu |
| User Management — Admin only visible | Teamlead + User must NOT see "Quản trị" section |
| User Management — list loads | Table with user rows |
| User Management — add user | Create + verify appears in list |
| User Management — edit user | Change role/team/active |
| User Management — reset password | New PW works on login |
| User Management — toggle active | Locked user cannot login |
| AI Chat | See P0 above |
| Existing features | Tasks, KPI, Initiative, Gantt, Reports — no regression |

---

## 🟡 PRIORITY 2 — Merge master → main (after PO confirms)

`main` still at `5b165e2`. Sessions 10–13 accumulated on master:
- Auth fix (KNOWN_ROLES + Teamlead)
- AI Chat frontend
- User Management (full stack)

```
git checkout main
git merge master
git push origin main
```
Only after PO confirms all features on Netlify.

---

## W2 — Tech Debt (low priority, tackle in downtime)

| ID | Debt | Effort |
|---|---|---|
| TD-008 | No error boundary in renderAll() — single JS error breaks whole view | Small |
| TD-018 | `fmtExportDate` duplicated app.js vs helpers.js | Tiny |
| TD-023 | `_oaActiveTab` not reset on re-render → visual inconsistency | Tiny |
| AUTH-05 | KNOWN_ROLES hardcoded — role mismatch silently fails | Small |

---

## Session Rules (unchanged)
1. Read SESSION_HANDOVER + PROJECT_STATE first
2. WORKING_RULE.md — do not touch `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. All GAS calls via `gasPost()` — never raw `fetch()`
5. `GS_WEBAPP_URL` in `assets/js/config.js` — update on every GAS redeploy
6. `esc()` on ALL user-supplied content rendered via `innerHTML`
