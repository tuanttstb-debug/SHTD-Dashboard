# TODO — NEXT SESSION
**Prepared**: 2026-06-08 (Session 11 — AUTH resolved)
**Context**: Auth blocker fully resolved. All features on master work. Ready for Phase 2 AI Chat completion and pre-merge verification.

---

## 🔴 PRIORITY 0 — Deploy AiService.gs to GAS

AI Chat route is live in Code.gs but `buildContext()` and `callGemini()` are in `AiService.gs` which has never been deployed. Until deployed, clicking AI Chat returns an error from GAS.

**Steps:**
1. Copy `backend/AiService.gs` from repo → paste as new file in GAS project → Save
2. Deploy → Manage deployments → New version (same URL)
3. Test AI Chat on Netlify: type a question about tasks/KPIs
4. Verify `GEMINI_API_KEY` is set in Script Properties

---

## 🟡 PRIORITY 1 — Verify full app on Netlify before merging to main

Now that auth works, verify all features end-to-end on https://test-shtd.netlify.app:

| Feature | Check |
|---|---|
| Login / Logout | ✅ confirmed working |
| Task list, filters, CRUD | smoke test |
| Google Sheets sync (read + write) | smoke test |
| Initiative Tracker | smoke test |
| KPI views | smoke test |
| AI Chat | requires AiService.gs deploy (Priority 0) |
| Change password | smoke test |

---

## 🟡 PRIORITY 2 — Merge master → main (after PO confirms Netlify)

`main` branch is still at `5b165e2` (before Session 10). Sessions 10+11 changes are only on `master`.

**What's accumulated on master since main:**
- Phase 2 AI Chat (frontend complete, GAS pending AiService.gs)
- Auth fix: KNOWN_ROLES + Teamlead
- AuthService.gs base64 \n strip
- initiatives.js session guard
- .gitignore
- AI_CONTEXT docs

**Merge procedure:**
```
git checkout main
git merge master
git push origin main
```
Only after PO confirms all features on Netlify.

---

## W2 — Tech Debt (low priority)

| ID | Debt | Action |
|---|---|---|
| TD-008 | No error boundary in renderAll() | Wrap each view render in try-catch |
| TD-018 | `fmtExportDate` duplicated in app.js vs helpers.js | Remove from app.js |
| TD-023 | `_oaActiveTab` not reset on re-render | Reset at start of renderOwnerAnalysis() |

---

## Session Rules (unchanged)
1. Read `SESSION_HANDOVER.md` + `PROJECT_STATE.md` first
2. Read `WORKING_RULE.md` — do not touch `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. All GAS calls MUST go through `gasPost()` — never raw fetch()
5. `GS_WEBAPP_URL` lives in `assets/js/config.js` — update on every GAS redeploy
6. `esc()` on ALL user-supplied content rendered via innerHTML
