# TODO — NEXT SESSION
**Prepared**: 2026-06-04 (end-of-session handover)
**Context**: E done. Phase F plan approved in principle — 3 PO decisions needed before coding starts.

---

## ⚠️ START HERE — 3 Questions for PO (Phase F blocker)

Before implementing any Phase F code, get answers to:

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | **kpi-data.js số liệu** | A) Dùng số thực tế ngay | B) Placeholder trước, update sau | B — placeholder, unblock dev |
| 2 | **Action Plan scope** | A) Reuse `db.tasks` (highlight=Y) | B) Hardcode riêng trong kpi-data.js | A — tái dụng, ít trùng lặp |
| 3 | **View priority** | A) Full 6 views theo thứ tự | B) KPI Overview + Action Plan trước | B — ship value faster |

---

## Phase F — KPI Digital Integration (PLANNED, not started)

### Sub-phases (proposed order if PO picks option B for Q3)

| Sub | View | New files | Priority |
|---|---|---|---|
| F0 | CSS/Token extension | `tokens.css`, `components.css`, `kpi.css` | First (unblocks all others) |
| F1 | Data layer | `kpi-data.js` | First (unblocks all views) |
| F2 | Nav + HTML shell | `index.html` | First |
| F3 | KPI Overview | `views/kpi-overview.js` | High |
| F4 | Action Plan Kanban | `views/action-plan.js` | High |
| F5 | KPI Progress + Bullet charts | `views/kpi-progress.js` | Medium |
| F6 | Owner Analysis | `views/owner-analysis.js` | Medium |
| F7 | Branch Analysis | `views/branch-analysis.js` | Low |
| F8 | RM Analysis | `views/rm-analysis.js` | Low |

### Files to create (Phase F total)
```
assets/js/kpi-data.js          ← KPI_DATA object (products, branches, RMs, targets)
assets/js/views/kpi-overview.js
assets/js/views/kpi-progress.js
assets/js/views/action-plan.js
assets/js/views/owner-analysis.js
assets/js/views/branch-analysis.js
assets/js/views/rm-analysis.js
assets/css/kpi.css             ← bullet chart, exec-summary, alert-item, kanban, zone-card
```

### Files to edit (Phase F)
```
assets/css/tokens.css          ← add --purple, --cyan, --gold, --gold2
assets/css/components.css      ← extend .badge (ahead/on-track/behind/critical)
index.html                     ← nav section + 6 view divs + script/link tags
assets/js/app.js               ← lazy init hooks for new views
assets/js/ui/navigation.js     ← wire 6 new nav items
```

### UI concept rules (apply to ALL views)
- Left-border color accent on KPI-type cards
- Delta indicators (▲/▼ + color) on metric values
- Section headers: `title + flex-1 divider line`
- Status badges: `.badge.ahead/.on-track/.behind/.critical` (new, alongside existing RAG)
- Font: keep **DM Sans** — do NOT switch to Barlow
- Card hover: `box-shadow: var(--shadow)` consistent across all cards

---

## Blocked

### A2 — GAS Backend
User must export Code.gs from Apps Script Editor → `backend/Code.gs`.
No code changes needed — just the file.

---

## Tech Debt (see TECH_DEBT.md)
- DEBT-03, DEBT-05, DEBT-06 — all low priority, safe to defer past Phase F

---

## Session Rules (unchanged)
1. Read `PROJECT_STATE.md` first
2. Read `WORKING_RULE.md` — do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. JS globals: use bare `db`, not `window.db`
5. Syntax-check JS with `node -e "new Function(...)"` before committing
