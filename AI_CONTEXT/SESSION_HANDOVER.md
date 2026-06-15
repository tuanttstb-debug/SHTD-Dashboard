# SESSION HANDOVER
**Date**: 2026-06-15 (Session 20 — Case Pipeline UI redesign: Table-primary + Kanban toggle + Initiative sync standardization)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed**: `main` @ `c60e74f` (S19 — chưa push S20, đang chờ lệnh)
**origin/main HEAD**: `c60e74f` — Case Pipeline full (S19) + GAS deployed ✅

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | Developer / AI |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**⚠️ Không dùng `master` nữa kể từ S19. Phát triển và push thẳng lên `main`.**

---

## Tasks Completed This Session (S20)

| # | Task | File(s) | Status |
|---|---|---|---|
| FEAT-CP-UI-1 | index.html: Restructure #view-case-pipeline — summary cards above .card, toolbar với view toggle, preset bar 4 tabs, filter bar pattern Task Manager, filter chips, table wrap (default), board wrap (hidden) | `index.html` | ✅ |
| FEAT-CP-UI-2 | case-pipeline.css: Thêm .cp-view-toggle / .cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, .sort-icon | `assets/css/case-pipeline.css` | ✅ |
| FEAT-CP-UI-3 | case-pipeline.js: Thêm _cpInitPresetTabs() (sync active class cho preset buttons on render), gọi từ renderCasePipeline() | `assets/js/views/case-pipeline.js` | ✅ |
| FEAT-CP-UI-4 | api.js: Thêm syncDot.className = 'status-dot syncing' tại đầu syncCaseAction | `assets/js/api.js` | ✅ |
| FEAT-INI-SYNC | initiatives.js: Thêm syncInitiativeAction() (Task Manager gold standard — showLoading + syncDot + GAS fallback + toast), cập nhật syncInitiativeAdd/Edit/Delete dùng pattern mới thay vì fire-and-forget | `assets/js/initiatives.js` | ✅ |
| TEST | verify_case_pipeline.mjs: Cập nhật 20 test → 22 test cho table-primary design (thêm TEST05b kanban toggle + TEST05b preset tabs, đổi TEST05/07/12/13/14/16/17 từ .cp-card → #cpTbody tr) | `verify_case_pipeline.mjs` | ✅ **22/22 PASS** |
| REG | verify_bld_queue.mjs: Không regression | — | ✅ **46/46 PASS** |

---

## Architecture: Case Pipeline UI (S20)

```
Dual-mode view:
  Default:  Table view  (#cpTableWrap visible, #cpBoardWrap hidden)
  Toggle:   Kanban view (#cpBoardWrap visible, #cpTableWrap hidden)
  Persist:  localStorage 'cp_view'

Preset tabs (4):
  'active'  → Đang xử lý  — group NOT in ['done','blocked']
  'bld'     → Cần BLĐ     — canBLD === 'Y'
  'overdue' → Quá hạn     — RAG Đỏ
  'all'     → Tất cả

Filter bar (Task Manager pattern):
  Text search: #cpSearch (debounce 150ms)
  Dropdowns: #cpFilterStage, #cpFilterTeam, #cpFilterLoai, #cpFilterRag
  Active chips: #cpFilterChips

Table:
  10 cols: ID | Khách hàng/Case | Stage | Team | PIC | Giá trị | Deadline | RAG | Loại hình | Phức tạp/BLĐ
  Sortable headers, 20 rows/page, pagination, empty state
  Overdue rows: class row-overdue (danger-bg background)
  Stage chips: .cp-stage-chip.group-* (same group colors as Kanban headers)
  RAG dots: .cp-rag-dot.red/amber/green/none

Initiative sync (S20):
  Old: syncInitiativeAdd/Edit/Delete → fire-and-forget writeInitiatives().catch(toast)
  New: syncInitiativeAction(mutateFn) → showLoading + syncDot syncing + GAS + syncDot connected/reset + hideLoading
       Same pattern as syncCaseAction (same as syncAction Task Manager)
```

---

## Decisions Made (S20)

1. **Table-primary**: Table là default view (paginated 20/page, sortable). Kanban là toggle phụ. Giải quyết vấn đề 200 cases × 14 columns = 3360px min-width impossible to navigate.
2. **4 preset tabs**: Đang xử lý / Cần BLĐ / Quá hạn / Tất cả — mapping với workflow thực tế ngân hàng.
3. **Initiative sync scope**: Case Pipeline + Initiative (không phải tất cả features). Timeline và các view khác không dùng direct GAS write nên không cần sync standardization.
4. **_cpInitPresetTabs()**: Thêm vào renderCasePipeline() để sync active class cho preset buttons mỗi khi re-render — không để phụ thuộc vào trạng thái HTML static.
5. **syncInitiativeAction pattern**: Wraps mutateFn (db mutation + persist) + GAS write trong một unified function với UX feedback đầy đủ. syncInitiativeDelete giữ async/await để caller có thể await nếu cần.

---

## Blockers

| Item | Status |
|---|---|
| Netlify hết credit | ❌ Dùng local Playwright |
| AI Chat GAS AiService.gs + GEMINI_API_KEY | ⚠️ Unconfirmed từ S12 |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| Initiative sync flow changed | 🟡 MEDIUM | syncInitiativeAdd/Edit/Delete đã đổi pattern. Nếu writeInitiatives() throw unexpected error, showLoading có thể không hide (finally block handle). Cần smoke test initiative CRUD trên live. |
| AI Chat chưa smoke-test live | 🟡 MEDIUM | AiService.gs + GEMINI_API_KEY chưa xác nhận từ S12. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_case_pipeline.mjs   # 22/22 PASS (S20)
node verify_bld_queue.mjs       # 46/46 PASS (no regression)
node verify_ms_tasks.mjs        # 14/14 PASS (no regression)
```

---

## Next Steps

1. Smoke test Case Pipeline live: Table view load, filter, preset tabs, add/edit/delete case, kanban toggle, excel export.
2. Smoke test Initiative CRUD live — verify syncInitiativeAction() hoạt động đúng sau khi đổi pattern.
3. Verify AI Chat trên live (tồn từ S12).
4. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
