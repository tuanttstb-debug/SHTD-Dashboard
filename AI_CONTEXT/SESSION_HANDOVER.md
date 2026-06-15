# SESSION HANDOVER
**Date**: 2026-06-15 (Session 19 — Case Pipeline: Kanban view, CRUD, Excel, BLD Queue integration + GAS deployed)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed**: `main` @ `c60e74f` — context sync post-GAS deploy
**origin/main HEAD**: `c60e74f` — Case Pipeline full (S19) + GAS deployed ✅

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | Developer / AI |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**⚠️ Không dùng `master` nữa kể từ S19. Phát triển và push thẳng lên `main`.**

---

## Tasks Completed This Session (S19)

| # | Task | File(s) | Status |
|---|---|---|---|
| FEAT-CP-1 | GAS Backend `CasePipelineService.gs` — caseRead/caseWrite, auto-create sheet | `backend/CasePipelineService.gs` (mới) | ✅ |
| FEAT-CP-2 | Route mới trong Code.gs: `case-pipeline-read`, `case-pipeline-write` | `backend/Code.gs` | ✅ |
| FEAT-CP-3 | Constants: `CASE_STAGES` (14), `CASE_COLS` (20), `CASE_LOAI_HINH`, `CASE_COMPLEXITY`, `dbCases` | `assets/js/constants.js` | ✅ |
| FEAT-CP-4 | API functions: `caseToRow`, `rowToCase`, `genCaseId`, `calcCaseRag`, `readCases`, `writeCases`, `syncCaseAction`, `persistCases`, `loadCasesFromCache` | `assets/js/api.js` | ✅ |
| FEAT-CP-5 | CSS: `case-pipeline.css` — Kanban board, cards, summary cards, CRUD modal, stage color groups | `assets/css/case-pipeline.css` (mới) | ✅ |
| FEAT-CP-6 | View JS: `case-pipeline.js` — renderCasePipeline, Kanban board, summary cards, CRUD modal, filters, Excel import/export | `assets/js/views/case-pipeline.js` (mới) | ✅ |
| FEAT-CP-7 | index.html: CSS link, nav item (G+C), view section, CRUD modal, script tag | `index.html` | ✅ |
| FEAT-CP-8 | Navigation: title map, render dispatch, G+C shortcut, ESC close cpModal | `assets/js/ui/navigation.js` | ✅ |
| FEAT-CP-9 | App.js: `loadCasesFromCache()` on startup, `readCases()` after autoConnectDB, nav badge `navBadgeCase`, `dbCases=[]` on clear | `assets/js/app.js` | ✅ |
| FEAT-CP-10 | BLD Queue integration: case cards với badge [CASE], `_bldGetPendingCases()`, `_bldBuildCaseHTML()`, `bldOpenAction` multi-source, `bldSubmitAction` branch case/task | `assets/js/views/bld-queue.js` | ✅ |
| TEST | `verify_case_pipeline.mjs` — **20/20 PASS** (new); `verify_bld_queue.mjs` 46/46 PASS (no regression); `verify_ms_tasks.mjs` 14/14 PASS | Test files | ✅ |

---

## Architecture: Case Pipeline

```
Sheet GAS: Case_Pipeline (tự tạo khi chưa tồn tại)
  20 cols A→T: ID, Tuần BC, Team, PIC, ĐVKD, Khách hàng/Case,
               Loại hình, Mức độ phức tạp, Phương án, Giá trị (tỷ),
               Stage, Vướng mắc, Next step, Start Date, Deadline, RAG,
               Cần BLĐ?, Highlight dashboard?, Ghi chú, Ý kiến BLĐ

Frontend:
  constants.js  → CASE_STAGES[14], CASE_COLS[20], CASE_LOAI_HINH, CASE_COMPLEXITY, dbCases[]
  api.js        → caseToRow, rowToCase, genCaseId, calcCaseRag,
                  readCases, writeCases, syncCaseAction (GAS fallback local),
                  persistCases, loadCasesFromCache
  views/case-pipeline.js → renderCasePipeline, Kanban, CRUD, Excel import/export
  views/bld-queue.js     → _bldGetPendingCases, _bldBuildCaseHTML, multi-source approve
  case-pipeline.css      → cp- prefix (board, cards, modal, summary)

nav: G+C shortcut; menu vị trí: trước Initiative Tracker
ID format: CP-001, CP-002...
RAG: auto từ Deadline (>7 ngày=Xanh, 1-7=Vàng, ≤0=Đỏ); override manual
BLĐ: case canBLD=Y → xuất hiện BLD Queue với badge [CASE]; approve/reject/info lưu yKienBLD
```

---

## Decisions Made (S19)

1. **20 cột DB** (thêm cột T = `Ý kiến BLĐ` từ đầu để tránh schema drift sau khi tích hợp BLĐ).
2. **GAS backend deployed cùng ngày S19** — PO deploy CasePipelineService.gs + 2 routes vào Apps Script; link không đổi.
3. **syncCaseAction có local fallback** — nếu GAS offline, vẫn lưu local + renderCasePipeline + show warning. Không block UX.
4. **Stage group colors**: new=xanh nhạt, active=info, pending=vàng, done=xanh, blocked=đỏ nhạt.
5. **BLD Queue**: case card dùng `border-left:4px solid var(--info)` để phân biệt với task card.
6. **Git sync protocol**: commit + push lên `origin/main` ngay sau mỗi thay đổi — không để local differ với remote.

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
| AI Chat chưa smoke-test live | 🟡 MEDIUM | AiService.gs + GEMINI_API_KEY chưa xác nhận từ S12. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_case_pipeline.mjs   # 20/20 PASS (S19)
node verify_bld_queue.mjs       # 46/46 PASS (no regression)
node verify_ms_tasks.mjs        # 14/14 PASS (no regression)
```

---

## Next Steps

1. Smoke test đầy đủ Case Pipeline live: Case Pipeline load từ Sheet, sửa/xóa case, BLD Queue [CASE].
2. Verify AI Chat trên live (tồn từ S12).
3. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
