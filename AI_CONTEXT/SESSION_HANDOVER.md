# SESSION HANDOVER
**Date**: 2026-06-18 (Session 28 — Context update + tài liệu hướng dẫn)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Last feature commit (S27)**: `104b81c` — feat(initiative): auto-gen milestone ID + add task from milestone
**origin/main HEAD (pre-S28)**: `104b81c` ✅

---

## Tasks Completed (S28 — docs only, no code changes)

| # | Task | Files | Status |
|---|---|---|---|
| S28-T1 | Commit tài liệu HDSD: `USER_MANUAL.md` (56KB), `HDSD/` (10 screenshots), `SYSTEM_UNDERSTANDING_REPORT.md` (33KB) | Documentation | ✅ |
| S28-T2 | Commit reference + utility files: `TPBank_KPI_Dashboard_v2.1.html`, `generate_docx.py`, `screenshot_hdsd.mjs`, `um_test.mjs`, `verify_ms_tasks.png` | Utils/Reference | ✅ |
| S28-T3 | Cập nhật AI_CONTEXT handover + memory files cho cả hai project | `AI_CONTEXT/` | ✅ |

**Không có thay đổi code trong session này.**

---

## Regression (S28)

Không có thay đổi code → không cần chạy regression test.

---

## DATE FROM PREVIOUS SESSION HANDOVER (S27)

---

# SESSION HANDOVER
**Date**: 2026-06-17 (Session 27 — Milestone auto-gen ID + Add Task from Milestone)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S27**: `104b81c` — feat(initiative): auto-gen milestone ID + add task from milestone
**origin/main HEAD**: `104b81c` ✅

---

## Tasks Completed (S27 — commit `104b81c`)

| # | Task | Files | Status |
|---|---|---|---|
| S27-T1 | Auto-gen Milestone ID khi thêm mới: `{parentId}-M{nextNum}` (e.g. `INIT-001-M3`); pre-fill Category từ initiative cha | `initiative-tracker.js` | ✅ |
| S27-T2 | "+ Task" button trên mỗi milestone row → mở task modal pre-filled (initiative, milestone, category, PIC, team, auto-gen ID) | `initiative-tracker.js` | ✅ |
| S27-T3 | "+ Thêm Task" trong empty-state của milestone task panel | `initiative-tracker.js` | ✅ |
| S27-T4 | Test: `verify_milestone_task.mjs` 23/23 PASS | `verify_milestone_task.mjs` | ✅ |

### Architecture: S27 Changes

**`_initNextMsNum(parentId)`** (new helper):
```js
// Tìm max số thứ tự từ các milestone có ID dạng {parentId}-M{n}
const nums = db.initiatives.filter(i => i.parentId === parentId)
  .map(i => { const m = (i.id||'').match(/-M(\d+)$/i); return m ? parseInt(m[1]) : 0; });
return nums.length ? Math.max(...nums) + 1 : 1;
```

**`_initOpenMilestone(parentId)`** (updated):
```js
// BEFORE: chỉ set initFParent
// AFTER: auto-gen ID + pre-fill category từ parent initiative
_initOpenModal(null);
const nextNum = _initNextMsNum(parentId);
setTimeout(() => {
  selParent.value = parentId;
  idEl.value = `${parentId}-M${nextNum}`;       // e.g. "INIT-001-M3"
  if (parent.category) catEl.value = parent.category;  // kế thừa category
}, 0);
```

**`openTaskModalForMilestone(msId, iniId)`** (new function):
```js
openTaskModal(null);          // reset + default fill (reuse existing logic)
fiEl.value = iniId;           // set initiative
_populateMilestoneSelect(msId); // rebuild ms select → select msId
fCat.value = ini.category;    // category from initiative
// PIC: accUser → team → _populateTeamSelect + _populateUserSelect
_populateTeamSelect('fTeam', accTeam);
_populateUserSelect('fPicAcc', accTeam, ini.accountable); // Teamlead
_populateUserSelect('fPicRes', accTeam, curUser);          // executor = current user
autoGenId();                  // gen {iniId}-M{n}-001, 002, ...
modalSubtitle = `Initiative: ${iniId} · Milestone: M{n}`;
```

**`_initBuildMilestoneList()`** — per-milestone row thêm button:
```html
<button onclick="openTaskModalForMilestone('${ms.id}','${parentId}')"
  title="Thêm task vào milestone này">
  <i class="fa-solid fa-plus"></i> Task
</button>
```

**`_initBuildMsTaskList()`** — empty-state thêm button:
```html
Chưa có task nào...
<button onclick="openTaskModalForMilestone('${ms.id}','${parentInitId}')">
  <i class="fa-solid fa-plus"></i> Thêm Task
</button>
```

### Regression (S27)
```
verify_milestone_task.mjs:   23/23 PASS ✅ NEW
verify_task_init_popup.mjs:  28/28 PASS ✅ (no regression)
```

---

## Decisions Made (S27)

1. **`openTaskModal(null)` first, then override**: Reuse existing reset/default logic thay vì duplicate. Override chỉ các fields cần thiết (fInit, fMs, fCat, fTeam, fPicAcc, fPicRes).
2. **`fPicRes` = current user, `fPicAcc` = initiative accountable**: Accountable là Teamlead chịu trách nhiệm; PicRes là người thực thi (thường là người đang nhập task).
3. **`_initNextMsNum` chỉ tính ID dạng `-M{n}`**: Ignore milestone IDs không match pattern (custom IDs) để tránh false maxima.
4. **Category: task form `fCat` vs initiative `initFCat`**: Cả hai đều có options Vietnamese (e.g. `Số hóa`). Data trong DB phải dùng giá trị match với select options — đây là điều kiện hiển thị đúng.

---

## Regression Risks (S27)

| Risk | Severity | Detail |
|---|---|---|
| **Category mismatch DB vs select options** | ⚪ LOW | Nếu initiative.category lưu string không match bất kỳ `<option>` nào trong task `fCat` (e.g. custom text, typo), `fCat` sẽ silently không set được. User thấy category rỗng → phải tự chọn lại. Không block workflow. |
| **`fPicRes` override khi accTeam không tìm được** | ⚪ LOW | Nếu `_appUsers` chưa load (GAS slow) → `accUser` = undefined → `accTeam = ''` → không gọi `_populateTeamSelect` → team + PIC giữ nguyên default từ current user. Graceful fallback. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24 — cần update test check cpViewOverlay. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S26)

---

## Tasks Completed (S26 — commit `7dbabce`)

| # | Task | Files | Status |
|---|---|---|---|
| S26-T1 | Fix filter clearing bug: `updateFilterDropdowns()` no longer rebuilds `filterPic` dropdown; `_populateFilterPic()` in `renderTaskTable()` owns it exclusively | `assets/js/app.js` | ✅ |

### Root Cause (S26-T1)
```
BEFORE:
  localAction() → renderAll() → updateFilterDropdowns()
    → fpEl.innerHTML = picNorm-format options ("Dunglq1")
    → fpEl.value = curP ("DungLQ1")  ← not found in picNorm options → reset to ""
  renderAll() → renderTaskTable() → _populateFilterPic()
    → prev = sel.value = ""          ← already cleared by updateFilterDropdowns
    → rebuild Username-format options
    → if (prev && ...) sel.value = prev  ← prev="" → no restore → filter gone

AFTER:
  updateFilterDropdowns() does NOT touch filterPic at all
  _populateFilterPic() captures prev before rebuild → rebuilds → restores → ✅
```

### Fix (S26-T1) — app.js `updateFilterDropdowns()`
```diff
-  const fpEl = document.getElementById('filterPic');
-  const curI = fiEl.value, curP = fpEl.value;
+  const curI = fiEl.value;
   // ... rebuild filterInit ...
-  let pics = new Set(DEFAULT_PICS);
-  db.tasks.forEach(t => { if (t.picRes) pics.add(picNorm(t.picRes)); });
-  fpEl.innerHTML = '<option value="">...' + ...
-  if (curP) fpEl.value = curP;
+  // filterPic managed exclusively by _populateFilterPic() in renderTaskTable()
```

### Regression (S26)
```
verify_task_init_popup.mjs:  28/28 PASS ✅ (no regression from S25 popup features)
```

---

## Decisions Made (S26)

1. **Remove filterPic from `updateFilterDropdowns()`**: Không fix format conflict — loại bỏ hẳn phần rebuild để tránh double-rebuild với hai format khác nhau. `_populateFilterPic()` đã đủ xử lý đúng (Username format, prev-restore).
2. **Không cần fix các filter khác**: `filterInit`, `filterTuanBC` trong `updateFilterDropdowns()` dùng ID format nhất quán → preserve đúng. `filterTeam`, `filterState`, `filterRag`, `filterId` không bị rebuild trong `renderAll()` → luôn giữ nguyên.

---

## Regression Risks (S26)

| Risk | Severity | Detail |
|---|---|---|
| **filterPic khi `_appUsers` chưa load** | ⚪ LOW | Nếu `loadAppUsers()` chưa xong khi user đầu tiên thay đổi filter, `_populateFilterPic()` dùng fallback từ `db.tasks` (picRes trực tiếp). Giá trị được preserve nhưng format khác. Resolve khi `_appUsers` load xong + user đổi filter lại. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24: test check click row → edit modal nhưng S24 đổi sang view popup. Cần update test. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S25)

---

## Tasks Completed (S25 — commit `61108da`)

| # | Task | Files | Status |
|---|---|---|---|
| S25-T1 | Task view popup: `rowClick()` → `openTaskViewPopup(id)` — read-only overlay với full task details, chips, grid | `tasks.js`, `index.html` | ✅ |
| S25-T2 | Task view popup: "Chỉnh sửa" → `taskViewOpenEdit()` → ghi nhớ `_taskEditReturnId` → đóng popup → mở edit modal | `tasks.js` | ✅ |
| S25-T3 | Return-to-popup: `handleSubmit()` re-open task view popup sau save (dùng `task.id` mới); `closeTaskModal()` reset `_taskEditReturnId` khi cancel | `crud.js` | ✅ |
| S25-T4 | Initiative view popup: card header `onclick="openInitViewPopup()"` với `cursor:pointer`; `stopPropagation` trên `.init-card-actions` | `initiative-tracker.js` | ✅ |
| S25-T5 | Initiative view popup: "Chỉnh sửa" → `initViewOpenEdit()` → `_initEditReturnId` → close popup → `_initOpenModal()`; `_initSave()` re-open popup sau save | `initiative-tracker.js` | ✅ |
| S25-T6 | Task rows trong milestone list & linked task list → `openTaskViewPopup()` thay vì `editTask()` | `initiative-tracker.js` | ✅ |
| S25-T7 | ESC handler: thêm `closeTaskViewPopup()`, `closeInitViewPopup()`, `_initCloseModal()` | `navigation.js` | ✅ |
| S25-T8 | `#taskViewOverlay` + `#initViewOverlay` HTML (global overlays, reuse `.cp-view-*` CSS) | `index.html` | ✅ |
| S25-T9 | Test: `verify_task_init_popup.mjs` — 28/28 PASS | `verify_task_init_popup.mjs` | ✅ |

---

## Architecture: S25 Changes

### Task View Popup (S25-T1 to T3)
```
Flow:
  tasks.js rowClick(e, id) → openTaskViewPopup(id)
    - populate #taskViewTitle, #taskViewSubtitle, #taskViewBody
    - chips: state, RAG, category, type, canBLD, highlight, overdue
    - grid (cp-view-grid): initiative, milestone, team, PICs, dates, progress, tuanBC
    - sections: result, nextPlan, vuongMac, noiDungBLD, yKienBLD
    - show #taskViewOverlay (display:flex)

  "Chỉnh sửa" btn → taskViewOpenEdit():
    _taskEditReturnId = _taskViewId  ← capture trước close
    closeTaskViewPopup()             ← _taskViewId = null
    editTask(id)                     → openTaskModal(task)

  handleSubmit() sau save:
    const shouldReturn = !!_taskEditReturnId  ← capture trước closeTaskModal
    closeTaskModal()                          ← reset _taskEditReturnId = null
    if (shouldReturn) openTaskViewPopup(task.id)  ← dùng task.id mới (edge case ID change)

  closeTaskModal() → _taskEditReturnId = null (cancel = no re-open)
  ESC → closeTaskViewPopup()
```

### Initiative View Popup (S25-T4 to T6)
```
Flow:
  init-card-header onclick="openInitViewPopup(ini.id)"  cursor:pointer
  .init-card-actions onclick="event.stopPropagation()"   ← prevent bubble

  openInitViewPopup(id):
    - populate #initViewTitle, #initViewSubtitle, #initViewBody
    - chips: status, category, milestone badge (nếu có parentId)
    - grid (cp-view-grid): accountable, dates, pct, milestones count, tasks count, docLink
    - sections: kpiTarget, notes
    - show #initViewOverlay (display:flex)

  "Chỉnh sửa" btn → initViewOpenEdit():
    _initEditReturnId = _initViewId
    closeInitViewPopup()
    _initOpenModal(id)

  _initSave() sau save:
    _shouldReturnToView = !!_initEditReturnId  ← trước _initCloseModal
    _initCloseModal()                          ← reset _initEditReturnId = null
    renderInitiativeTracker()
    if (_shouldReturnToView) openInitViewPopup(ini.id)

  _initCloseModal() → _initEditReturnId = null (cancel = no re-open)
  ESC → closeInitViewPopup() + _initCloseModal()
```

### Task Rows trong Initiative Tracker
```
TRƯỚC: onclick="editTask('${t.id}')"
SAU:   onclick="openTaskViewPopup('${t.id}')"
Áp dụng cho: _initBuildMsTaskList() và _initBuildTaskList()
```

### CSS Reuse
```
Không thêm CSS mới — reuse từ case-pipeline.css:
  .cp-view-grid, .cp-view-row, .cp-view-label, .cp-view-val
  .cp-view-section, .cp-view-section-title, .cp-view-text
```

---

## Decisions Made (S25)

1. **task.id cho return-to-popup**: `handleSubmit()` dùng `task.id` (ID sau save) thay vì `_taskEditReturnId` (ID trước edit) → handle edge case user đổi Task ID.
2. **_taskEditReturnId reset trong closeTaskModal()**: Đảm bảo ESC / Hủy từ edit modal không re-open popup.
3. **_initCloseModal trong ESC handler**: Fix bug `initModalOverlay` chưa được đóng bởi ESC trước S25.
4. **CSS reuse `.cp-view-*`**: Không tạo CSS mới cho task/initiative view popup — consistent với Case Pipeline popup đã có.
5. **`_initBuildTaskList` task rows**: Dùng `openTaskViewPopup` (không còn `editTask`) → mở task view popup thay vì edit modal trực tiếp.

---

## Playwright Test (S25)
```
File: verify_task_init_popup.mjs (new)
Run:  node verify_task_init_popup.mjs (port 9989, tự tạo server)

PASS 28/28:
  T1:  overlay HTML exists (taskViewOverlay + initViewOverlay)
  T2:  Tasks: click row → popup opens (title, subtitle, body)
  T3:  Popup body has state chip + RAG badge
  T4:  Close via Đóng button
  T5:  ESC closes task popup
  T6:  Chỉnh sửa → edit modal opens, popup closes
  T7:  ESC from edit modal → popup NOT re-opened (cancel path)
  T8:  Initiative Tracker: card header click → init popup opens
  T9:  ESC closes init popup
  T10: Action btn stopPropagation (no init popup)
  T11: Init popup Chỉnh sửa → initiative edit modal opens
  T12: Initiative linked task row click → task popup opens
  T13: No JS console errors
```

---

## Regression (S25)
```
verify_bld_queue.mjs:         46/46 PASS ✅
verify_ms_tasks.mjs:          14/14 PASS ✅
verify_filter_cascade.mjs:    23/23 PASS ✅
verify_import_rbac.mjs:       15/15 PASS ✅
verify_case_pipeline.mjs:     20/22 PASS (TEST13/14 pre-existing fail từ S24)
verify_task_init_popup.mjs:   28/28 PASS ✅ NEW
```

---

## Regression Risks (S25)

| Risk | Severity | Detail |
|---|---|---|
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24: test expect click row → edit modal, nhưng S24 đã đổi sang view popup. Cần update test để check cpViewOverlay thay vì cpModal. |
| **openTaskViewPopup từ nhiều context** | ⚪ LOW | Có thể gọi từ tasks.js, initiative-tracker.js, performance.js. Tất cả đều hoạt động đúng — popup sẽ luôn mở đúng task. |

---

## DATE FROM PREVIOUS SESSION HANDOVER

---

## Branch Strategy (THAY ĐỔI TỪ S24 — push thẳng lên main)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + Development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**`master` đã xóa hoàn toàn** — local và remote — kể từ S24 (2026-06-16). Không tạo lại.

---

## Tasks Completed (S24 — commits `a58474e`, `edc6a26`)

| # | Task | Files | Commit | Status |
|---|---|---|---|---|
| S24-T1 | `user-list` removed from `ADMIN_ONLY` trong Code.gs → tất cả roles load được `_appUsers` → Display_Name (Username) hiển thị nhất quán | `backend/Code.gs` | `a58474e` | ✅ |
| S24-T2 | BLD Queue: ẩn Phê duyệt / Từ chối / Yêu cầu bổ sung với non-Admin; Xem đầy đủ vẫn hiện với tất cả | `assets/js/views/bld-queue.js` | `a58474e` | ✅ |
| S24-T3 | Performance view: click row → `openPerfTaskPopup(key)` → `detailOverlay` mở với task list lọc theo tab hiện tại (initiative/picRes/team) | `assets/js/views/performance.js` | `a58474e` | ✅ |
| S24-T4 | Case Pipeline: click row/card → `openCaseViewPopup(id)` → `cpViewOverlay` read-only popup; Edit btn (canImport()) → `cpViewOpenEdit()` → `cpModal` | `assets/js/views/case-pipeline.js`, `assets/css/case-pipeline.css`, `index.html`, `assets/js/ui/navigation.js` | `a58474e` | ✅ |
| S24-T5 | picRes case fix PA1: filter so sánh `.toLowerCase()` — `dunglq1` match `DungLQ1` | `assets/js/views/tasks.js` | `edc6a26` | ✅ |
| S24-T6 | picRes case fix PA2: `_resolvePickerCase()` trong `parsers.js` → map `t.picRes`/`t.picAcc` về canonical Username sau mỗi parse; gọi lại sau `loadAppUsers()` trong `api.js` | `assets/js/parsers.js`, `assets/js/api.js` | `edc6a26` | ✅ |
| S24-T7 | Branch cleanup: xóa local + remote `master`; memory + ai_context cập nhật push thẳng lên `main` | — | — | ✅ |

---

## Architecture: S24 Changes

### BLD Queue Role Gate (S24-T2)
```js
// bld-queue.js — cả _bldBuildCaseHTML() và _bldBuildItemHTML()
<div class="bld-item-actions">
  ${isAdmin() ? `
    <button class="btn btn-sm btn-success" ...>Phê duyệt</button>
    <button class="btn btn-sm btn-danger"  ...>Từ chối</button>
    <button class="btn btn-sm btn-secondary" ...>Yêu cầu bổ sung</button>
  ` : ''}
  <button class="bld-ghost-link" ...>Xem đầy đủ</button>  ← luôn hiển thị
</div>
```

### Performance Popup (S24-T3)
```
openPerfTaskPopup(key):
  - Lọc db.tasks theo perfTab ('initiative'|'picRes'|'team') và key
  - Set detailTitle + innerHTML detailTbody
  - classList.add('open') trên #detailOverlay (reuse existing modal)
  - Mỗi row trong popup có onclick="editTask(...)" để mở edit modal
```

### Case Pipeline View Popup (S24-T4)
```
HTML: #cpViewOverlay (overlay div, display:none/flex)
  → .modal (680px max-width)
    → #cpViewTitle, #cpViewSubtitle
    → #cpViewBody (read-only detail grid — .cp-view-grid CSS)
    → #cpViewEditBtn (inline-flex nếu canImport(), else none)

Flow:
  click row/card → cpOpenDetail(id) → openCaseViewPopup(id)
  openCaseViewPopup: populate title/subtitle/body, show/hide editBtn
  cpViewOverlay: display='flex'

  Edit btn → cpViewOpenEdit():
    const id = _cpViewId  ← capture TRƯỚC closeCaseViewPopup()
    closeCaseViewPopup()
    openCaseModal(id)

  ESC → navigation.js Escape handler: + closeCaseViewPopup()

State: let _cpViewId = null (global trong case-pipeline.js)
```

### picRes Case Fix (S24-T5+T6)
```
Root cause:
  DB lưu 'dunglq1' → picNorm() → 'Dunglq1'
  _appUsers.Username = 'DungLQ1'
  Dropdown value = 'DungLQ1'
  Filter: 'Dunglq1' !== 'DungLQ1' → FAIL

PA1 (tasks.js:58):
  (t.picRes||'').toLowerCase() !== fPic.toLowerCase()  ← immediate fix

PA2 (parsers.js):
  _resolvePickerCase():
    lookup = Map(_appUsers → lowercase → canonical)
    db.tasks.forEach: t.picRes = canonical || t.picRes
                      t.picAcc = canonical || t.picAcc
  Gọi tại: cuối _parseArrayIntoDb() + sau loadAppUsers() trong api.js
  Race condition mitigation: gọi cả 2 nơi → whichever loads last wins

Sau fix: 'dunglq1' → picNorm → 'Dunglq1' → _resolvePickerCase → 'DungLQ1' ✅
```

---

## Decisions Made (S24)

1. **push thẳng lên `main`**: `master` xóa hoàn toàn từ S24. Mọi commit push thẳng `origin/main`.
2. **cpViewOverlay read-only first**: Case Pipeline popup là read-only preview; Edit btn chỉ hiện với `canImport()` (Admin/Teamlead). Không mở thẳng edit modal khi click card.
3. **`_cpViewId` capture trước close**: `cpViewOpenEdit()` phải lấy `const id = _cpViewId` TRƯỚC khi gọi `closeCaseViewPopup()` vì close sẽ set `_cpViewId = null`.
4. **picRes PA1 + PA2**: PA1 = safety net ngay lập tức; PA2 = fix gốc rễ. Cả hai cùng tồn tại — PA2 đảm bảo data đúng cho performance/bld-queue (không chỉ filter tasks).
5. **`user-list` không còn ADMIN_ONLY**: Tất cả authenticated users được phép gọi `user-list` — cần để populate Display_Name dropdown nhất quán.

---

## Playwright Test (S24)
```
File: C:\Users\LENOVO\pw_test\test3.js
Run:  cd C:\Users\LENOVO\pw_test && node test3.js

PASS — 6/6 checks:
  [1] _appUsers loaded: PASS (3 users)
  [1] filterPic format: PASS
  [1] modal fPicRes format: PASS
  [2] BLD role gate: PASS (Admin 2 approve btns; non-Admin 0 approve btns)
  [3a] Perf popup: PASS (open:true, title đúng, 2 rows)
  [3b] CP popup: PASS (display:flex, title đúng, editBtn:inline-flex for Admin)
```

---

## Regression Risks (S24)

| Risk | Severity | Detail |
|---|---|---|
| **`_resolvePickerCase()` race condition** | 🟡 MEDIUM | Nếu `_appUsers` load rất chậm (GAS slow) và user filter ngay khi page load → PA2 chưa kịp chạy. PA1 vẫn cover vì so sánh lowercase. |
| **picRes data đã cache** | 🟡 MEDIUM | Tasks trong `localStorage['shtd_v2']` từ trước S24 có `picRes='Dunglq1'` (picNorm format). Sau S24, `_resolvePickerCase()` sẽ fix khi `_appUsers` load. Nếu user offline → PA1 vẫn hoạt động qua lowercase compare. |
| **BLD popup với non-Admin** | ⚪ LOW | `isAdmin()` check inline trong template string — nếu `isAdmin` undefined tại render time → toàn bộ button block bị throw. Cần đảm bảo `auth.js` load trước `bld-queue.js`. |

---

## DATE FROM PREVIOUS SESSION HANDOVER
# SESSION HANDOVER
**Date**: 2026-06-16 (Session 23b — Task local-only write refactor)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S21**: `47b9316` — Team/PIC User_Master integration
**Pushed S22**: `2a65710` — User Management search/filter/sort/pagination (TD-030)
**Pushed S23 (→ main via PR #27)**: `b3262eb` → `dfac565` → `6ad6c32` (filter cascade + RBAC + modal fix)
**Pushed S23b**: `11c5770` (ai_context handover) → `65388ae` (task local-only write refactor)
**origin/main HEAD**: `65388ae` ✅

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19, XÁC NHẬN LẠI S23)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**AI/Claude push thẳng lên `main`. `master` đã bị xóa sau S23 (PO đã merge PR #27 xong xóa branch).**

---

## Tasks Completed (S20 — commit `6bf7a75`)

| # | Task | File(s) | Status |
|---|---|---|---|
| CP-UI-1 | index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle, preset bar 4 tabs, filter bar Task Manager pattern, filter chips, #cpTableWrap (default), #cpBoardWrap (hidden) | `index.html` | ✅ |
| CP-UI-2 | case-pipeline.css: +.cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, sort-icon | `assets/css/case-pipeline.css` | ✅ |
| CP-UI-3 | case-pipeline.js: Table-primary (20/page, 10 sortable cols), 4 preset tabs, _cpInitPresetTabs() | `assets/js/views/case-pipeline.js` | ✅ |
| CP-UI-4 | api.js: syncCaseAction + syncDot 'syncing' at start | `assets/js/api.js` | ✅ |
| INI-SYNC | initiatives.js: syncInitiativeAction() gold standard pattern, syncInitiativeAdd/Edit/Delete updated | `assets/js/initiatives.js` | ✅ |
| TEST-S20 | verify_case_pipeline.mjs: 22/22 PASS (+TEST05b, +TEST08b, table row selectors) | `verify_case_pipeline.mjs` | ✅ |

## Tasks Completed (S21 — commit `47b9316`)

| # | Task | File(s) | Status |
|---|---|---|---|
| UM-1 | constants.js: +TEAM_LIST (8 teams, fallback khi GAS offline) | `assets/js/constants.js` | ✅ |
| UM-2 | api.js: +`_appUsers[]`, `loadAppUsers()`, `getAppTeams()`, `getUsersByTeam()`, `_populateTeamSelect()`, `_populateUserSelect()` | `assets/js/api.js` | ✅ |
| UM-3 | app.js: `loadAppUsers()` non-blocking sau `autoConnectDB()` | `assets/js/app.js` | ✅ |
| UM-4 | index.html: Task modal `fTeam`→select+onchange, `fPicAcc`→select; Case modal `cpfTeam`→select+onchange, `cpfPic`→select | `index.html` | ✅ |
| UM-5 | crud.js: `openTaskModal()` dùng `_populateTeamSelect`/`_populateUserSelect`; +`onTaskTeamChange()` (re-filter PIC + autoGenId) | `assets/js/crud.js` | ✅ |
| UM-6 | case-pipeline.js: `openCaseModal()` dùng helpers; +`onCaseTeamChange()` | `assets/js/views/case-pipeline.js` | ✅ |
| UM-7 | initiative-tracker.js: `initFAcc` input→select; `_initOpenModal()` populate via `_populateUserSelect` (all users) | `assets/js/views/initiative-tracker.js` | ✅ |
| TEST-S21 | verify_case_pipeline.mjs: Fix TEST12 `.fill()` → `.selectOption()` cho cpfTeam | `verify_case_pipeline.mjs` | ✅ **22/22 PASS** |
| REG | verify_bld_queue.mjs / verify_ms_tasks.mjs: no regression | — | ✅ **46/46 + 14/14** |

---

## Architecture: Team/PIC User_Master (S21)

```
Luồng:
  startApp() → loadAppUsers() [non-blocking] → GAS 'user-list' → _appUsers[]

_appUsers = [{Username, Display_Name, Role, Team, Email, Active, ...}, ...]
  - In-memory only (KHÔNG persist localStorage — dữ liệu user nhạy cảm)
  - Filter: Active !== 'false'

Helpers (api.js):
  getAppTeams()            → unique teams từ _appUsers, sorted; fallback TEAM_LIST khi empty
  getUsersByTeam(team)     → filter _appUsers by team; '' = tất cả users
  _populateTeamSelect(id, currentVal)
    - required=true  → không có empty option, default to teams[0]
    - required=false → có "– Chọn team –" option
  _populateUserSelect(id, team, currentVal)
    - team=''      → show "– Chọn team trước –" (hint)
    - users empty  → fallback: hiện currentVal nếu có (offline graceful)
    - users exist  → options = Display_Name (Username); currentVal pre-selected
    - currentVal không match option → append extra option (bảo toàn dữ liệu)

Áp dụng:
  Task modal:   fTeam (required) → fPicAcc (required) → fPicRes (required)
                onTaskTeamChange() → re-filter cả hai PIC + autoGenId()
  Case modal:   cpfTeam (optional) → cpfPic (optional)
                onCaseTeamChange() → re-filter cpfPic
  Initiative:   initFAcc → all users (no team filter — initiative không có field team)
  
  populatePicDropdown() — GIỮ NGUYÊN như legacy cho filter bar filterPic
```

---

## Architecture: Case Pipeline UI (S20)

```
Dual-mode:  Table (default, #cpTableWrap) ↔ Kanban (#cpBoardWrap)
Persist:    localStorage 'cp_view'
Presets:    'active' / 'bld' / 'overdue' / 'all' (state: _cpPreset)
Filter:     _cpGetFiltered() = preset + search (debounce) + 4 dropdowns
Table:      10 cols, sortable, 20/page, pagination, empty state
syncInitiativeAction(): showLoading + syncDot syncing/connected + GAS + hideLoading
```

---

## Decisions Made (S20–S21)

1. **Table-primary** (S20): Default view cho Case Pipeline giải quyết 200 cases × 14 cols scalability problem.
2. **_cpInitPresetTabs()** (S20): Gọi trong renderCasePipeline() để sync active class — không phụ thuộc HTML static.
3. **syncInitiativeAction gold standard** (S20): Đồng nhất pattern với syncCaseAction / syncAction.
4. **_appUsers in-memory only** (S21): User data không persist localStorage vì sensitive. Mỗi session load lại từ GAS.
5. **Offline fallback** (S21): getAppTeams() → TEAM_LIST; _populateUserSelect() → hiện currentVal. App vẫn hoạt động khi GAS down.
6. **Extra option for mismatched PIC** (S21): Nếu currentVal không có trong danh sách users của team hiện tại (ví dụ PIC được assign từ team khác), append extra option để tránh mất dữ liệu khi save.
7. **Initiative Accountable no team filter** (S21): Initiative không có field Team trong DB — Accountable hiện tất cả active users.
8. **populatePicDropdown() kept** (S21): Giữ legacy function (không gọi nữa từ modal) để không break filter bar. Marked as legacy trong comment.

---

## Tasks Completed (S22b — undocumented commits between S22 and S23)

These commits appeared on `origin/main` but were NOT in the S22 handover — likely from a session between S22 and S23:

| Commit | Task | Files |
|---|---|---|
| `6f1c23b` | docs(ai_context): update S22 handover | `ai_context/SESSION_HANDOVER.md` etc. |
| `b134d54` | fix(user-management): constrain table-wrap height so only rows scroll | `assets/js/views/user-management.js` |
| `5323b75` | feat: pre-fill Team/PIC from logged-in user on Add modal (Task/Case/Initiative) | `assets/js/crud.js`, `case-pipeline.js`, `initiative-tracker.js` |
| `691ba9b` | rebrand: rename org from 'Số Hóa Tín Dụng / Khối KHDN' to 'Trung tâm SP&GPTD' | `index.html` |
| `ef40075` | fix(initiatives): repair milestone-to-parent linking when sheet has no header row | `assets/js/views/initiative-tracker.js` |

---

## Tasks Completed (S23 — commits `b3262eb`, `dfac565`, `6ad6c32` on master)

| # | Task | Commit | Files | Status |
|---|---|---|---|---|
| S23-T3 | Task filter: PIC cascade từ Team; Case Pipeline: PIC filter cascade + DVKD column + DVKD filter | `b3262eb` | `tasks.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T4 | Import RBAC: restrict Excel import tới Admin + Teamlead (lead-only CSS + canImport() JS guard) | `dfac565` | `auth.css`, `auth.js`, `app.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T5 | Modal grid layout bug: right column bị squeeze — fix `1fr 1fr` → `minmax(0,1fr) minmax(0,1fr)` | `6ad6c32` | `forms.css`, `case-pipeline.css`, `initiative.css`, `verify_modal_layout.mjs` | ✅ on master (pending merge to main) |

---

## Architecture: S23 Changes

### Filter Cascade (S23-T3)
```
tasks.js:
  onFilterTeamChange() → _populateFilterPic(team)
    - uses getUsersByTeam() từ _appUsers[] nếu online
    - fallback: unique picRes từ db.tasks khi offline

case-pipeline.js:
  cpFilterTeamChange() → _cpSyncFilterPic(team)
    - cùng pattern: getUsersByTeam() → fallback từ case data
  DVKD column: _cpRenderTable() thêm cột dvkd sau PIC
  State vars: _cpFilterPic, _cpFilterDvkd

auth.js:
  canImport() → u.role === 'Admin' || u.role === 'Teamlead'

auth.css:
  body[data-role="User"] .lead-only { display: none !important; }
  (cạnh .admin-only đã có — hai lớp RBAC)
```

### Modal Grid Fix (S23-T5)
```
Root cause: `grid-template-columns: 1fr 1fr` = `minmax(auto, 1fr) minmax(auto, 1fr)`
  → auto minimum cho phép cột trái rộng hơn khi có button với white-space:nowrap
  → cột phải bị squeeze

Fix: `minmax(0, 1fr) minmax(0, 1fr)` + .form-group { min-width:0 } + .form-control { width:100%; min-width:0 }

Grids fixed:
  forms.css         → .form-grid (Task modal)
  case-pipeline.css → .cp-modal-grid (Case modal)
  initiative.css    → .init-modal-grid (Initiative modal)

Test: verify_modal_layout.mjs — 9/9 PASS (diff=0.0px trên cả 3 modal)
```

---

## Tasks Completed (S23b — commit `65388ae`)

| # | Task | Files | Status |
|---|---|---|---|
| S23b-T1 | Refactor: Task CRUD/bulk ops write local only; only Excel import writes GAS | `api.js`, `crud.js`, `bulk.js`, `bld-queue.js` | ✅ on main |

### Architecture: Task Write Isolation (S23b)

```
TRƯỚC:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → syncAction() → READ từ GAS → MERGE → WRITE lên GAS

SAU:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → localAction() → persist(localStorage) → renderAll()   ← KHÔNG ghi GAS

CHỈ GHI GAS (giữ nguyên):
  handleImport() — Excel bulk import      → syncAction() ✅
  syncCaseAction() — Case CRUD/BLD        → GAS write ✅
  syncInitiativeAction() — Initiative CRUD → GAS write ✅
  writeToHandle() (initiative-tracker.js)  → GAS write ✅

localAction() (api.js):
  function localAction(mutateFn) {
    if (typeof mutateFn === 'function') mutateFn();
    persist();    // localStorage['shtd_v2']
    renderAll();  // re-render toàn bộ UI
    return true;
  }
```

### Decision: S23b

- **Task write local-only**: PO yêu cầu tách biệt hoàn toàn — task data chỉ lên GAS qua Excel import, không tự động push từ UI. Tránh cache cũ/stale ghi đè Sheet khi user edit/delete ngẫu nhiên.
- **BLD task approval local-only**: Ý kiến BLĐ cho Task cũng local-only. Ý kiến BLĐ cho Case vẫn qua syncCaseAction (GAS write).
- **Bug fix**: `bulkSetState()` và `bulkDelete()` lưu count TRƯỚC khi `selectedIds.clear()` — toast hiện đúng số lượng.

---

## Tasks Completed (S22 — commit `2a65710`)

| # | Task | File(s) | Status |
|---|---|---|---|
| TD-030 | user-management.js: search (username/name/email, debounce 150ms), filter Team/Role/Status, filter chips với clear, sort 5 cols, pagination 15/page với count info, layout toolbar+filter-bar+card khớp pattern case-pipeline | `assets/js/views/user-management.js` | ✅ |

---

## Blockers

| Item | Status |
|---|---|
| Netlify hết credit | ❌ Dùng local Playwright / GitHub Pages |
| AI Chat GAS AiService.gs + GEMINI_API_KEY | ⚠️ Unconfirmed từ S12 |
| ~~Modal fix chưa merge sang main~~ | ✅ PR #27 merged — `41f4018` live |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| **Task edits không lên GAS (S23b)** | 🔴 HIGH | saveTask/deleteTask/bulk/BLD task giờ chỉ lưu localStorage. Nếu user clear cache / đăng xuất / đổi thiết bị mà không export Excel trước → mất toàn bộ task edits. Cần thông báo user workflow mới: edit → export → import khi cần đẩy lên Sheet. |
| **BLD task approval không lên GAS (S23b)** | 🔴 HIGH | Ý kiến BLĐ cho Task (yKienBLD) chỉ lưu local. Sheet không cập nhật cho đến khi Excel import. Case BLD approval vẫn lên GAS bình thường. |
| Team/PIC modal fields đổi từ input→select | 🟡 MEDIUM | fPicAcc từ text input → select. Nếu _appUsers empty (GAS down) và không có currentVal → fPicAcc select rỗng → form submit fail. Cần smoke test khi GAS online. |
| Initiative sync flow changed (S20) | 🟡 MEDIUM | syncInitiativeAdd/Edit/Delete pattern đổi. Cần smoke test initiative CRUD trên live. |
| AI Chat chưa smoke-test live | 🟡 MEDIUM | AiService.gs + GEMINI_API_KEY chưa xác nhận từ S12. |
| DVKD column colspan (S23-T3) | ⚪ LOW | Empty state colspan tăng 10→11. Nếu có test check colspan cứng, cần cập nhật. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_case_pipeline.mjs    # 22/22 PASS (S21)
node verify_bld_queue.mjs        # 46/46 PASS
node verify_ms_tasks.mjs         # 14/14 PASS
node verify_filter_cascade.mjs   # 23/23 PASS (NEW S23)
node verify_import_rbac.mjs      # 15/15 PASS (NEW S23)
node verify_modal_layout.mjs     # 9/9 PASS (NEW S23)
```

---

## Next Steps

1. **UX: thông báo user về workflow mới** — Task edit chỉ lưu local; cần export Excel và import lại để đồng bộ GAS. Cân nhắc thêm banner/toast nhắc nhở.
2. **Smoke test live — Task save**: Edit task → lưu → reload → kiểm tra data vẫn trong cache; Export Excel → kiểm tra dữ liệu đúng.
3. **Smoke test live — Task filter**: Chọn Team → filterPic update đúng users.
4. **Smoke test live — Case Pipeline filter**: Team → cpFilterPic cascade; DVKD filter; DVKD column hiển thị.
5. **Smoke test live — Import RBAC + Modal layout**: Kiểm tra các S23 features trên live.
6. Verify AI Chat trên live (tồn từ S12).
7. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
4. **Smoke test live — Import RBAC**: Login với role User → Import button ẩn; role Admin/Teamlead → visible.
5. **Smoke test live — Modal layout**: Mở Task/Case/Initiative edit modal → 2 cột đều nhau.
6. **Smoke test live — Task/Case modal Team+PIC**: Dropdown có options, cascade đúng.
7. Verify AI Chat trên live (tồn từ S12).
8. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
