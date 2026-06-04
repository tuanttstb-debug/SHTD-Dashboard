# TODO — NEXT SESSION
**Prepared**: 2026-06-04 (updated — A4 complete)
**Context**: Phase B complete + all Phase A fixes done. Next: Phase C or A2 (blocked on PO).

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
✅ All committed and pushed to GitHub (commits: b892079, 387ce50, 37423f6, da205dc, 39e9e28)
✅ A5: Resolved — stale comment never existed in extracted parsers.js
✅ A4: Fixed — Gantt subtitle now dynamic (commit 83ea790, pushed)
```

---

## Phase A — Remaining

### A2 — GAS Backend in Repo `[BLOCKED on user action]`
**User must do**: Open [script.google.com](https://script.google.com) → Open the Apps Script project for this dashboard → Download / copy all `.gs` files

**Next session then does**:
```
# Paste GAS code into:
backend/Code.gs
```
No code changes to index.html or JS modules needed.

---

## Phase B — ✅ COMPLETE
B0 + B1 + B2 done. index.html = 736 lines. 9 CSS files + 17 JS modules extracted.

---

## Backlog (Phase C–E)

| Item | Phase | Priority |
|---|---|---|
| Render performance 200–500 tasks | C | 🟡 |
| Mobile filter bar collapse | D | 🟡 |
| Mobile toolbar grouping | D | 🟡 |
| Gantt mobile simplification | D | 🟢 |
| Auto weekly report generation | E (Feature) | ⭐ PO requested |

---

## Rules for Next Session

1. **Always read `PROJECT_STATE.md` first** — confirms what is live
2. **Always read `WORKING_RULE.md`** — confirms what not to touch
3. **Do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`** without explicit instruction
4. **One logical change per commit** — don't bundle Phase C + D in one commit
5. **JS globals are `let`, not `var`** — use bare `db`, not `window.db`
