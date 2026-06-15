# TODO — NEXT SESSION
**Prepared**: 2026-06-15 (Session 21 — Team/PIC User_Master cascade dropdowns)
**Context**: `origin/main` @ `47b9316` — S21 LIVE (S20 Table-primary + S21 User_Master dropdowns deployed).

---

## NGUYÊN TẮC BRANCH (ĐÃ THAY ĐỔI TỪ S19)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  KHÔNG DÙNG NỮA kể từ S19
```

**AI/Claude push thẳng lên `main`. Không cần PR workflow nữa.**

---

## ✅ COMPLETED S19

- [x] GAS Backend: `CasePipelineService.gs` (caseRead, caseWrite, auto-create sheet)
- [x] Code.gs routes: `case-pipeline-read`, `case-pipeline-write`
- [x] Frontend constants: CASE_STAGES (14), CASE_COLS (20), CASE_LOAI_HINH, CASE_COMPLEXITY, dbCases
- [x] API layer: caseToRow, rowToCase, genCaseId, calcCaseRag, readCases, writeCases, syncCaseAction (với GAS fallback), persistCases, loadCasesFromCache
- [x] CSS: `case-pipeline.css` (Kanban, cards, modal, summary, stage groups)
- [x] View: `case-pipeline.js` (renderCasePipeline, Kanban 14 cols, summary cards, CRUD modal, filters, Excel import/export)
- [x] index.html: CSS link, nav item, view section, CRUD modal, G+C shortcut in kb-grid, script tag
- [x] navigation.js: title map, render dispatch, G+C shortcut, ESC close cpModal
- [x] app.js: startup cache load, readCases, navBadgeCase, dbCases reset on clear
- [x] BLD Queue: _bldGetPendingCases, _bldBuildCaseHTML, bldOpenAction multi-source, bldSubmitAction case branch
- [x] Tests: verify_case_pipeline.mjs 20/20 PASS; verify_bld_queue.mjs 46/46 PASS; verify_ms_tasks.mjs 14/14 PASS
- [x] PO deploy GAS: CasePipelineService.gs + Code.gs routes case-pipeline-* (2026-06-15; GS_WEBAPP_URL không đổi)
- [x] Smoke test thêm task live: ✅ thành công

## ✅ COMPLETED S20

- [x] index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle (Table/Kanban), preset bar 4 tabs, filter bar (Task Manager pattern), filter chips, #cpTableWrap (default), #cpBoardWrap (hidden)
- [x] case-pipeline.css: Thêm .cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, .sort-icon styles
- [x] case-pipeline.js: Full rewrite → Table-primary (paginated 20/page, sortable 10 cols), 4 preset tabs, _cpGetFiltered() unified, debounced search, filter chips, _cpInitPresetTabs() on every render
- [x] api.js: syncCaseAction thêm syncDot.className = 'status-dot syncing' tại đầu hàm
- [x] initiatives.js: syncInitiativeAction() (Task Manager gold standard), syncInitiativeAdd/Edit/Delete dùng pattern mới
- [x] verify_case_pipeline.mjs: 22/22 PASS (table-primary — +TEST05b kanban toggle, +TEST08b preset tabs)

## ✅ COMPLETED S21

- [x] constants.js: +TEAM_LIST (8 teams: BL1/BL2/CV1/CV2/PTKD MB/PTKD MN/QLDM/Số) — offline fallback
- [x] api.js: +_appUsers[], loadAppUsers() (GAS 'user-list'), getAppTeams(), getUsersByTeam(), _populateTeamSelect(), _populateUserSelect() với offline fallback + PIC mismatch protection
- [x] app.js: loadAppUsers() non-blocking trên startup
- [x] index.html: Task modal fTeam→select+onchange, fPicAcc/fPicRes→select; Case modal cpfTeam→select+onchange, cpfPic→select
- [x] crud.js: openTaskModal() dùng _populateTeamSelect/_populateUserSelect; +onTaskTeamChange() (re-filter PIC + autoGenId)
- [x] case-pipeline.js: openCaseModal() dùng helpers; +onCaseTeamChange()
- [x] initiative-tracker.js: initFAcc input→select; populate via _populateUserSelect (all users)
- [x] verify_case_pipeline.mjs: Fix TEST12 .fill()→.selectOption() cho cpfTeam — 22/22 PASS
- [x] verify_bld_queue.mjs: 46/46 PASS (no regression); verify_ms_tasks.mjs: 14/14 PASS

---

## 🔴 PRIORITY 1 — Smoke test live: User_Master dropdowns + Case Pipeline (S20+S21)

| Feature | Check |
|---|---|
| **Task modal — Team dropdown** | Mở Thêm/Sửa task → fTeam có options từ User_Master (không rỗng) |
| **Task modal — PIC cascade** | Chọn team → fPicAcc/fPicRes lọc đúng users của team đó |
| **Case modal — Team+PIC** | Mở Thêm/Sửa case → cpfTeam/cpfPic hoạt động giống task modal |
| **Initiative modal — Accountable** | Mở modal → initFAcc có options (tất cả active users) |
| Case Pipeline load | Mở view → Table view là default, hiển thị đúng dữ liệu từ Sheet |
| Preset tabs | Click từng tab Đang xử lý / Cần BLĐ / Quá hạn / Tất cả → count đúng |
| Filter bar | Lọc Stage/Team/Loại hình/RAG + text search → table update |
| Kanban toggle | Click "Kanban" → board 14 cột; click "Danh sách" → back to table |
| Thêm case | Điền form → save → row xuất hiện trong table + ghi vào Sheet |
| Sửa case | Click row → modal pre-fill → save → cập nhật trên table |
| Initiative CRUD | Thêm/sửa/xóa → syncDot syncing→connected, showLoading ẩn đúng |
| BLD Queue | Case canBLD=Y xuất hiện với badge [CASE]; approve → yKienBLD lưu vào Sheet |

---

## 🔴 PRIORITY 2 — Verify AI Chat trên live

AI Chat frontend hoàn chỉnh từ S12. GAS-side chưa xác nhận.

**Steps**:
1. Login Admin → AI Assistant → gõ câu hỏi
2. Nếu lỗi → GAS editor → AiService.gs → Script Properties → `GEMINI_API_KEY` → Deploy new version

---

## 🟡 PRIORITY 3 — Fix Testing Environment (Netlify hết credit)

Options (chưa chọn):
- **A) Cloudflare Pages** (miễn phí, unlimited) — khuyến nghị
- **B) GitHub Pages cho master** (gh-pages branch)
- **C) Local only** — hiện đang dùng tạm

---

## W2 — Tech Debt (low priority)

| ID | Debt | Effort |
|---|---|---|
| TD-033 | `verify_initiative_v2.mjs` không inject auth → fail local; copy pattern verify_bld_queue | Small |
| TD-008 | No error boundary in `renderAll()` | Small |
| TD-018 | `fmtExportDate` duplicated `app.js` vs `helpers.js` | Tiny |
| TD-023 | `_oaActiveTab` not reset on re-render | Tiny |
| AUTH-05 | KNOWN_ROLES hardcoded | Small |
| ~~TD-030~~ | ~~User Management table — no search/pagination~~ | ✅ Done S22 |
| TD-031 | BAU task ID gap sequence khi clone | Tiny |

---

## Session Rules

1. **Đọc SESSION_HANDOVER + PROJECT_STATE trước** — không skip
2. **Branch**: push thẳng lên `main`; `master` không dùng nữa kể từ S19
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2'].tasks` — trừ khi PO yêu cầu
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. **Test local**: `npx http-server . -p 3030 &` → `node verify_case_pipeline.mjs` + `node verify_bld_queue.mjs`
9. `syncCaseAction` có local fallback — khi GAS down vẫn save local.
10. **Git sync**: commit + `git push origin HEAD:main` ngay sau mỗi thay đổi — git remote LUÔN phải đồng bộ với local. Không delay push.
