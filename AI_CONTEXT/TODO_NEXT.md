# TODO — NEXT SESSION
**Prepared**: 2026-06-15 (Session 19 — Case Pipeline full implementation)
**Context**: `master` chưa push (đang chờ PO). `origin/main` @ `1c57999` (chưa có S18, S19).

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

---

## 🔴 PRIORITY 1 — PO tạo PR: master → main (S18 + S19)

`master` chưa push session này (chờ lệnh PO). Sau khi PO cho phép:
1. `git push origin master`
2. PO tạo PR `master` → `main` trên GitHub
3. **Lý do ưu tiên cao**: SCHEMA-01 (S18) — `master` ghi Task_Master 24 cột, `main` ghi 23 cột.

**Commits sẽ include**: S18 (2 commits) + S19 (nhiều files, Case Pipeline full)

---

## 🔴 PRIORITY 2 — PO deploy GAS (Case Pipeline routes)

**Các file GAS cần thêm vào Apps Script project**:
- `backend/CasePipelineService.gs` → copy toàn bộ nội dung
- `backend/Code.gs` → thêm 2 routes case-pipeline-read và case-pipeline-write (đã có sẵn trong file)

**Sau khi deploy**: không cần thay đổi `GS_WEBAPP_URL` (dùng chung deployment).

---

## 🔴 PRIORITY 3 — Smoke test sau khi merge + deploy

| Feature | Check |
|---|---|
| Case Pipeline load | Mở view → board render 14 cột |
| Case từ Sheet | readCases() lấy dữ liệu từ Case_Pipeline sheet |
| Thêm case | Điền form → save → card xuất hiện trên board + ghi vào Sheet |
| Sửa case | Click card → modal pre-fill → save → cập nhật trên board |
| BLD Queue | Case canBLD=Y xuất hiện với badge [CASE]; approve → yKienBLD lưu vào Sheet |
| Excel export | Xuất file CasePipeline_*.xlsx với 20 cột đúng |
| Excel import | Import file mẫu → merge vào dbCases |
| G+C shortcut | Chuyển sang Case Pipeline từ bất kỳ view nào |
| S18 regression | BLD Queue task approve/reject vẫn hoạt động 46/46 |

---

## 🔴 PRIORITY 4 — Verify AI Chat trên live

AI Chat frontend hoàn chỉnh từ S12. GAS-side chưa xác nhận.

**Steps**:
1. Login Admin → AI Assistant → gõ câu hỏi
2. Nếu lỗi → GAS editor → AiService.gs → Script Properties → `GEMINI_API_KEY` → Deploy new version

---

## 🟡 PRIORITY 5 — Fix Testing Environment (Netlify hết credit)

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
| TD-030 | User Management table — no search/pagination | Tiny |
| TD-031 | BAU task ID gap sequence khi clone | Tiny |

---

## Session Rules

1. **Đọc SESSION_HANDOVER + PROJECT_STATE trước** — không skip
2. **Branch**: phát triển trên `master` hoặc `fix/*`; KHÔNG push/merge lên `main` — PO tự xử lý
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2'].tasks` — trừ khi PO yêu cầu
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. **Test local**: `npx http-server . -p 3030 &` → `node verify_case_pipeline.mjs` + `node verify_bld_queue.mjs`
9. `syncCaseAction` có local fallback — khi GAS down vẫn save local.
