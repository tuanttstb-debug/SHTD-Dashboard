# WORKING RULES — SHTD Dashboard

## Core Principles

1. **Understand before changing** — Read `SOURCE_CODE_INVENTORY.md` before touching any function
2. **Document every change** — Update `CHANGE_LOG.md` after every modification
3. **Update TODO.md** — Mark tasks complete as soon as done; add new tasks immediately
4. **No assumptions** — Check `ASSUMPTION_LOG.md`; add new assumptions; validate with PO
5. **Preserve business logic** — No changes to sync protocol, data model, or localStorage format without explicit PO approval

---

## Code Change Rules

### Before Any Edit
- [ ] Read the function and its callers from `SOURCE_CODE_INVENTORY.md`
- [ ] Confirm the change is in `REFACTORING_PLAN.md` Phase A, B, or C
- [ ] Check if any `OPEN_QUESTION.md` item blocks this change

### During Edit
- [ ] One logical change per commit
- [ ] Never edit CSS tokens without checking all usages
- [ ] Never rename a function without searching all callers
- [ ] Never change `DB_COLS` order without updating `taskToRow()` and `_parseArrayIntoDb()` simultaneously

### After Edit
- [ ] Test: Dashboard, Tasks, Gantt, Performance, Quick View
- [ ] Test: Add task, Edit task, Delete task, Clone task
- [ ] Test: Import Excel, Export Excel, Sync with Sheet
- [ ] Test: Dark mode, Mobile layout, Keyboard shortcuts
- [ ] Update `CHANGE_LOG.md`
- [ ] Update `TODO.md`

---

## Git Commit Convention

```
<type>(<scope>): <subject>

type: feat | fix | refactor | docs | style | chore
scope: css | js | html | gas | docs | config

Examples:
  fix(js): resolve taskToRow version conflict (v6.2 merge)
  refactor(css): extract tokens to assets/css/tokens.css
  docs: add GITHUB_WORKFLOW.md
  chore: add GAS backend source to /backend/
```

---

## High-Risk Areas (Handle With Extreme Care)

| Area | Why Dangerous |
|---|---|
| `syncAction()` | Core sync logic — multi-user safety, data loss prevention |
| `_parseArrayIntoDb()` | Parses all Sheet data — bugs lose all data |
| `extractWorkbook()` | Parses Excel — format changes break import |
| `taskToRow()` | Sheet write format — column order must match DB_COLS exactly |
| `DB_COLS` constant | Defines the Sheet schema — changing order corrupts data |
| `persist()` | Writes localStorage — format change breaks cache |
| `localStorage['shtd_v2']` | User's data — never clear without explicit user action |

---

## Do NOT (Without PO Approval)

- Do NOT change `GS_WEBAPP_URL` or `GS_SHEET_ID`
- Do NOT change `localStorage` key names (`shtd_v2`, `shtd_theme`)
- Do NOT remove or rename any field in the task data model
- Do NOT change the 23-column `DB_COLS` order
- Do NOT change the `action: 'read'` / `action: 'write'` API protocol
- Do NOT add authentication or access control without discussing deployment implications
- Do NOT delete `GAS.GS` until confirmed that all its patches are verified merged

---

## AI Assistance Rules

When using AI (Claude or other) to help with this codebase:

1. Always share `SOURCE_CODE_INVENTORY.md` as context
2. Always share `TECH_DEBT.md` to prevent debt accumulation
3. Always share `OPEN_QUESTION.md` so AI doesn't assume answers
4. Specify which Phase (A/B/C/D/E/F) the change belongs to
5. Ask AI to identify ALL affected functions before making changes
6. Verify AI output against `ASSUMPTION_LOG.md` — AI may make the same assumptions we flagged
