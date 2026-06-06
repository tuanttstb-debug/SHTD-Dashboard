# TODO — NEXT SESSION
**Prepared**: 2026-06-06 (Session 7 — Mobile fix + KPI verify)
**Context**: Mobile hamburger fixed. KPI views 3/3 PASS. Phase A (A4/A5) confirmed clean. TD-026 and KpiSheetService.gs deploy remain.

---

## ⚠️ MUST DO FIRST

### 1. Xác nhận GAS Initiative Sync hoạt động end-to-end (PO action)
GAS đã deploy (URL mới trong constants.js). Cần test thực tế:
1. Mở `index.html` → Initiative Tracker
2. Bấm **Sync GG Sheet** → data load từ `Initiative_Master` tab
3. Kiểm tra: milestone hiện short label (M1, M2…), status dot đúng màu
4. Thêm 1 milestone → bấm Sync → kiểm tra ghi lên Sheet
5. Nếu lỗi "Không tìm thấy InitiativeService" → re-deploy Apps Script với file 15-col mới

---

## Step 4 — TD-026: Milestone status dropdown Vietnamese

**File**: `index.html` — `#initFStatus` select in Initiative modal  
**Problem**: Modal dùng English values (Active/Done/Paused/Blocked) nhưng GAS data dùng Vietnamese (Xong/Đang làm/Chưa bắt đầu) → inconsistent stored values  
**Fix**: Khi `#fParentId` có giá trị (milestone row), swap `#initFStatus` options sang Vietnamese:
- `Xong` / `Đang làm` / `Chưa bắt đầu`
Khi là initiative (no parentId): giữ nguyên Active/Done/Paused/Blocked

---

## GAS Deploy Checklist

| File | Status | Action |
|---|---|---|
| `backend/InitiativeService.gs` | ✅ Deployed (15 cols) | Test Sync button with real data |
| `backend/KpiSheetService.gs` | 🔴 NOT deployed | Paste → re-deploy → test KPI Sync |

---

## Phase D — Mobile UX (remaining, low priority)

| ID | Issue | Fix |
|---|---|---|
| MOB-01 | Filter bar cramped on mobile | Collapsible filter drawer |
| MOB-02 | Toolbar button overflow on mobile | Overflow menu or icon-only mode |
| MOB-03 | Gantt unusable on mobile | Simplified mobile Gantt or hide |

Note: MOB hamburger (was: MOB-00) — **FIXED** in session 7 (`788e396`).

---

## Initiative Tracker — Future Enhancements (deferred)

| Enhancement | Notes |
|---|---|
| Initiative ID rename: cascade update children's `parentId` | Current: rename ID + children still point to old parentId |
| Import initiatives from Excel | Add `initiative_master` sheet detection in `extractWorkbook()` |
| Keyboard shortcut G+I → Initiative Tracker | Add to navigation.js gKey map |
| Deadline countdown badge on cards | "X ngày còn lại" / "Quá hạn X ngày" |

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
| TD-026 | Milestone modal `#initFStatus` dùng English (Active/Done); GAS data dùng Vietnamese (Xong/Đang làm) | Swap options khi parentId được chọn — **next priority** |

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
