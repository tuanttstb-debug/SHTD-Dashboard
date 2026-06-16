# TODO — NEXT SESSION
**Prepared**: 2026-06-16 (Session 23 — Filter cascade, Import RBAC, Modal grid fix)
**Context**: `origin/main` @ `dfac565`; `origin/master` @ `6ad6c32` (modal fix pending PO merge).

---

## NGUYÊN TẮC BRANCH (ĐÃ THAY ĐỔI TỪ S19, XÁC NHẬN LẠI S23)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA sau PR #27 (S23)
```

**AI/Claude push thẳng lên `main`.**

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

## ✅ COMPLETED S22b (undocumented — commits between S22 và S23 trên main)

- [x] docs: update S22 ai_context handover (`6f1c23b`)
- [x] fix(user-management): constrain table-wrap height so only rows scroll (`b134d54`)
- [x] feat: pre-fill Team/PIC from logged-in user on Add modal — Task/Case/Initiative (`5323b75`)
- [x] rebrand: org name 'Số Hóa Tín Dụng / Khối KHDN' → 'Trung tâm SP&GPTD' (`691ba9b`)
- [x] fix(initiatives): repair milestone-to-parent linking when sheet has no header row (`ef40075`)

## ✅ COMPLETED S23

- [x] Task filter: PIC cascade từ Team — `_populateFilterPic(team)`, `onFilterTeamChange()` trong tasks.js (`b3262eb`)
- [x] Case Pipeline filter: PIC cascade từ Team — `_cpSyncFilterPic()`, `cpFilterTeamChange()` (`b3262eb`)
- [x] Case Pipeline: DVKD column trong bảng + DVKD filter dropdown (`b3262eb`)
- [x] Import RBAC: `lead-only` CSS class + `canImport()` JS guard — restrict import tới Admin+Teamlead (`dfac565`)
- [x] Modal grid fix: `minmax(0,1fr)` trong forms.css + case-pipeline.css + initiative.css (`6ad6c32` — master only, pending merge)
- [x] Tests: verify_filter_cascade.mjs 23/23, verify_import_rbac.mjs 15/15, verify_modal_layout.mjs 9/9

---

## 🔴 PRIORITY 1 — Smoke test live: S23 features + User_Master dropdowns + Case Pipeline

| Feature | Check |
|---|---|
| **Task filter — PIC cascade** | Chọn Team trong filter bar → filterPic dropdown update đúng users |
| **Case filter — PIC cascade** | Chọn Team → cpFilterPic update; DVKD column hiển thị trong bảng; filter DVKD hoạt động |
| **Import RBAC** | Login User → Import button ẩn; login Teamlead/Admin → visible; JS guard block khi gọi trực tiếp |
| **Modal layout** | Mở Edit modal Task/Case/Initiative → 2 cột đều nhau, không bị squeeze |
| **Pre-fill Add modal** | Mở Thêm Task/Case/Initiative → Team và PIC pre-fill từ logged-in user |
| **Task modal — Team dropdown** | Mở Thêm/Sửa task → fTeam có options từ User_Master (không rỗng) |
| **Task modal — PIC cascade** | Chọn team → fPicAcc/fPicRes lọc đúng users của team đó |
| **Case modal — Team+PIC** | Mở Thêm/Sửa case → cpfTeam/cpfPic hoạt động giống task modal |
| Case Pipeline load | Mở view → Table view là default, hiển thị đúng dữ liệu từ Sheet |
| Preset tabs | Click từng tab Đang xử lý / Cần BLĐ / Quá hạn / Tất cả → count đúng |
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
