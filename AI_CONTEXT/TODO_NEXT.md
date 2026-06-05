# TODO — NEXT SESSION
**Prepared**: 2026-06-05 (Session 6 — DB fix + verify 37/37)
**Context**: Initiative Tracker fully fixed. GAS deployed (InitiativeService.gs 15 cols). Verify v2 37/37 PASS. KPI views not browser-tested. Phase A cleanup pending.

---

## ⚠️ MUST DO FIRST

### 1. Xác nhận GAS Initiative Sync hoạt động end-to-end
GAS đã deploy (URL mới trong constants.js). Cần test thực tế:
1. Mở `index.html` → Initiative Tracker
2. Bấm **Sync GG Sheet** → data load từ `Initiative_Master` tab
3. Kiểm tra: milestone hiện short label (M1, M2…), status dot đúng màu
4. Thêm 1 milestone → bấm Sync → kiểm tra ghi lên Sheet
5. Nếu lỗi "Không tìm thấy InitiativeService" → re-deploy Apps Script với file 15-col mới

### 2. Browser Verify — KPI Views (chưa test từ Session 3+4)
Mở `index.html` → navigate:
- [ ] **KPI Overview** — renders, Load File Raw button works, 0 JS errors
- [ ] **KPI Progress** — renders correctly
- [ ] **Owner Analysis** — 3 tabs, no errors
- [ ] Console: 0 JS errors

---

## Phase A — Remaining Quick Wins

### A4 — Remove merge instruction residue (~10 min)
- Grep `index.html` for `<!-- MERGE -->` comments
- Grep `assets/js/` for leftover merge `console.log` residue

### A5 — Remove debug buttons (~30 min)
- Search `index.html` + `assets/js/` for `loadDemoData` / `clearDemoData`
- PO confirmed: **remove entirely**

---

## GAS Deploy Checklist

| File | Status | Action |
|---|---|---|
| `backend/InitiativeService.gs` | ✅ Deployed (15 cols) | Test Sync button |
| `backend/KpiSheetService.gs` | 🔴 NOT deployed | Paste → re-deploy → test KPI Sync |

---

## Initiative Tracker — Future Enhancements (deferred)

| Enhancement | Notes |
|---|---|
| Initiative ID rename: cascade update children's `parentId` | Current: rename ID + children still point to old parentId |
| Import initiatives from Excel | Add `initiative_master` sheet detection in `extractWorkbook()` |
| Keyboard shortcut G+I → Initiative Tracker | Add to navigation.js gKey map |
| Deadline countdown badge on cards | "X ngày còn lại" / "Quá hạn X ngày" |
| Milestone status dropdown: dùng Vietnamese options | Current modal dùng Active/Done/Paused; real data dùng Xong/Đang làm/Chưa bắt đầu |

---

## Phase D — Mobile UX (Low priority, deferred)

| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable on mobile | Simplified mobile Gantt or hide |

---

## Tech Debt (all low priority)

| ID | Debt | Action |
|---|---|---|
| TD-004 | Global state (`db`, sort, etc.) | Phase D |
| TD-008 | No error boundary in renderAll() | Add try-catch around each render call |
| TD-009 | Duplicate parseDate in extractWorkbook vs _parseArrayIntoDb | Consolidate to parsers.js |
| TD-018 | `fmtExportDate` duplicated | Remove from app.js:exportExcel, use helpers.js version |
| TD-021 | `_sLabel`/`_kpProgColor` defined in view files, used globally | Move to `helpers.js` |
| TD-023 | `_oaActiveTab` not reset on re-render | Add `_oaActiveTab = 'quang'` at start of `renderOwnerAnalysis()` |
| TD-026 | Milestone modal `#initFStatus` dùng English (Active/Done); GAS data dùng Vietnamese (Xong/Đang làm) | Swap options khi parentId được chọn |

---

## Session Rules (unchanged)
1. Read `PROJECT_STATE.md` first
2. Read `WORKING_RULE.md` — do not touch `syncAction()`, `DB_COLS`, `localStorage['shtd_v2']`
3. One logical change per commit
4. JS globals: use bare `db`, not `window.db`
5. KPI globals: `fmtKN`, `kpiChip`, `dungChip`, `kpiAlertClass`, `dungAlertClass` in `kpi-data.js`
6. KPI live data: always use `getKpiData()` not `KPI_DATA` directly in KPI views
7. Initiative views: always use `_initRealRoots()` for root initiative list
8. `syncInitiativeAdd/Edit/Delete()` in `initiatives.js` are the only safe Initiative CRUD entry points
9. Chart instances: destroyed on re-render via `try { c.destroy() }`
10. Verify scripts: use `page.route('**/script.google.com/**', r => r.abort())` để isolate khỏi GAS background load
