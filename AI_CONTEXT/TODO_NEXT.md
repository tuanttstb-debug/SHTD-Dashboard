# TODO — NEXT SESSION
**Prepared**: 2026-06-04 (A2 + KPI merge complete)
**Context**: Phase A2 done, KPI views merged. Verify in browser first, then remaining Phase A items.

---

## ⚠️ MUST DO FIRST (before any new work)

### Browser Verify — KPI Views (not tested this session)
No Playwright run was done after the KPI merge. Open `index.html` in browser and navigate to:
- [ ] **KPI Overview** — 6 cards, exec panel, 4 charts, 4 alerts render correctly
- [ ] **KPI Progress** — KPI 2.1/2.2 meter cards, PTKD table, rate chart, DungLQ1 table
- [ ] **Owner Analysis** — 3 tabs, PTKD grid cards, charts, adoption alerts
- [ ] Check browser console — 0 JS errors

---

## Phase A — Remaining Quick Wins

### A4 — Remove visible merge instructions (Tiny, ~10 min)
Visible merge guide text may still appear in rendered HTML (residue from old patches).
- Check `index.html` for any `<!-- MERGE ... -->` comments or leftover instructions visible to users
- Check `assets/js/` for any `console.log` merge instructions left in comments

### A5 — Replace debug buttons with dev-only guards (Small, ~30 min)
`loadDemoData()` and `clearDemoData()` buttons may still be in the UI.
- Search `index.html` + `assets/js/` for these function calls
- Wrap with `if (location.hostname === 'localhost')` guard OR remove entirely (PO confirmed: remove)

---

## GAS Backend — Action on PO

Phase A2 added `backend/Code.gs`, `Config.gs`, `SheetService.gs` to repo.
PO needs to:
1. Open [script.google.com](https://script.google.com) → New project
2. Create 3 files, paste content from `backend/`
3. Deploy → Web App (Execute as: Me, Access: Anyone)
4. Copy `/exec` URL → update `GS_WEBAPP_URL` in `assets/js/constants.js`
5. Test connection: click "Kết nối GG Sheets" button in dashboard

---

## KPI Data — Update When Ready (T6 confirmed, T7+)
When PO has new monthly data:
- Edit `assets/js/kpi-data.js`
- Update `products[x].biz[5]`, `.bpm[5]`, `.cust[5]` (index 5 = T6)
- Update `agg` object totals
- Add months T7+: extend `months[]`, `monthsFull[]`, and all monthly arrays
- No structural changes needed

**Important**: `quangPTKD` / `dungPTKD` arrays are total-only (not monthly). Regenerate from source data when updated.

---

## Phase D — Mobile UX (Low priority, deferred)

| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable (280px label column) | Simplified mobile Gantt or hide |

---

## Tech Debt (all low priority)

| ID | Debt | Action |
|---|---|---|
| TD-004 | Global state (`db`, sort, etc.) | Phase D |
| TD-008 | No error boundary in renderAll() | Add try-catch around each render call |
| TD-009 | Duplicate parseDate in extractWorkbook vs _parseArrayIntoDb | Consolidate to parsers.js |
| TD-018 | `fmtExportDate` duplicated | Remove from app.js:exportExcel, use helpers.js version |
| TD-021 | `_sLabel`/`_kpProgColor` defined in view files, used globally | Move to `helpers.js` |
| TD-022 | `quangPTKD[1]`, `[2]`, `[10]`, `[12]` accessed by hardcoded index in `kpi-overview.js` | Use `.find()` by ptkd name |

---

## Session Rules (unchanged)
1. Read `PROJECT_STATE.md` first
2. Read `WORKING_RULE.md` — do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. JS globals: use bare `db`, not `window.db`
5. New KPI globals: `fmtKN`, `kpiChip`, `dungChip`, `kpiAlertClass`, `dungAlertClass` defined in `kpi-data.js`
6. Chart instances: `_ovCharts`, `_progCharts`, `_oaCharts` (const objects) — destroyed on re-render via `try { c.destroy() }`
7. `_oaSwitch()` and `_oaRankSwitch()` are globals defined in `owner-analysis.js` — used via onclick in generated HTML
