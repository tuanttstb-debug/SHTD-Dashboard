# TODO — NEXT SESSION
**Prepared**: 2026-06-04 (updated — Phase C complete)
**Context**: Phase B + all Phase A fixes + Phase C done. Next: Phase D (mobile UX) or Phase E (weekly report).

---

## Completed (2026-06-04)

```
✅ git init + remote added to GitHub
✅ Main.html renamed → index.html
✅ A1+A3 patches re-applied and verified (Playwright)
✅ Phase B0: folder structure created
✅ Phase B1: CSS extracted into 9 files (assets/css/)
✅ Phase B2: JS extracted into 17 modules (assets/js/)
✅ Full test: 25/25 PASS, 0 FAIL, 0 JS errors
✅ All committed and pushed to GitHub
✅ A5: Resolved — stale comment never existed in extracted parsers.js
✅ A4: Fixed — Gantt subtitle now dynamic (83ea790)
✅ Phase C: Single-pass dashboard stats + debounced filter (7b895a2)
```

---

## Phase A — Remaining

### A2 — GAS Backend in Repo `[BLOCKED on user action]`
**User must do**: Open [script.google.com](https://script.google.com) → Open the Apps Script project → Download all `.gs` files

**Next session then does**:
```
# Paste GAS code into:
backend/Code.gs
```
No code changes to index.html or JS modules needed.

---

## Phase D — Mobile UX `[NEXT]`

| Item | Detail |
|---|---|
| MOB-01 | Filter bar cramped on mobile — needs collapse/expand |
| MOB-02 | Toolbar button overflow on mobile — needs grouping |
| MOB-03 | Gantt unusable on mobile (280px label column) — simplify or hide |

---

## Phase E — Auto Weekly Report `[FEATURE — PO requested]`

Generate weekly report automatically from task data.
No spec yet — clarify with PO before starting.

---

## Tech Debt (low priority)

| ID | Item |
|---|---|
| DEBT-05 | Consolidate `fmtExportDate` (app.js) + `fmtDateExport` (helpers.js) — cosmetic |
| DEBT-06 | Remove redundant inline `onchange/oninput` from index.html — navigation.js addEventListener already handles all filters with debounce |

---

## Rules for Next Session

1. **Always read `PROJECT_STATE.md` first** — confirms what is live
2. **Always read `WORKING_RULE.md`** — confirms what not to touch
3. **Do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`** without explicit instruction
4. **One logical change per commit**
5. **JS globals are `let`, not `var`** — use bare `db`, not `window.db`
