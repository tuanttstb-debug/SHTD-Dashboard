# TODO — NEXT SESSION
**Prepared**: 2026-06-04 (updated — Phase E complete)
**Context**: All planned phases done (A4, C, E). Remaining: A2 (blocked on PO), tech debt, optional Phase D.

---

## Completed (2026-06-04)

```
✅ A1+A3: patches re-applied and verified
✅ Phase B: full CSS+JS extraction (9 CSS + 17 JS modules)
✅ A4: Gantt subtitle dynamic year (83ea790)
✅ A5: Resolved — stale comment never existed
✅ Phase C: single-pass dashboard + debounced filter (7b895a2)
✅ Phase D: Skipped by PO decision
✅ Phase E: Auto weekly report — 4-sheet Excel (307d463)
```

---

## Blocked

### A2 — GAS Backend in Repo `[BLOCKED on user action]`
**User must do**: Open [script.google.com](https://script.google.com) → Open Apps Script project → copy all `.gs` files

**Next session then does**:
```
# Paste into: backend/Code.gs
```

---

## Tech Debt (low priority)

| ID | Item | Effort |
|---|---|---|
| DEBT-05 | Consolidate `fmtExportDate` (app.js) + `fmtDateExport` (helpers.js) | ~5 min |
| DEBT-06 | Remove redundant inline `onchange/oninput` from index.html — navigation.js addEventListener already handles with debounce | ~15 min |

---

## Optional / Future

| Item | Phase | Note |
|---|---|---|
| Mobile UX (filter bar, toolbar, Gantt) | D | Skipped — revisit if PO requests |
| Weekly report: HTML clipboard format | E2 | If PO wants to paste into email/Word |
| Weekly report: auto-open on schedule | E3 | Not possible in static app — would need GAS trigger |

---

## Rules for Next Session

1. **Always read `PROJECT_STATE.md` first**
2. **Always read `WORKING_RULE.md`** — confirms what not to touch
3. **Do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`** without explicit instruction
4. **One logical change per commit**
5. **JS globals are `let`, not `var`** — use bare `db`, not `window.db`
