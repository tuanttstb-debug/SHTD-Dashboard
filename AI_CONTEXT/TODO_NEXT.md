# TODO — NEXT SESSION
**Prepared**: 2026-06-12 (Session 18 — Rà soát BLĐ + yKienBLD + login debug)
**Context**: `master` @ `090b94a` (pushed). `origin/main` @ `1c57999` (đã có S17, chưa có S18).

---

## NGUYÊN TẮC BRANCH

```
master  →  push tự do (Developer / AI)  →  local Playwright test (Netlify ❌ hết credit)
main    →  PO ONLY — PO tự merge trên GitHub
fix/*   →  bugfix branches → PR → main (PO tạo PR)
```

**AI/Claude KHÔNG push lên `main` trừ khi PO yêu cầu rõ ràng.**

---

## ✅ COMPLETED S18

- [x] Fix `.btn-success` chưa định nghĩa — nút "Phê duyệt" trong suốt (components.css)
- [x] Fix BUG-04: `bldMiniConfirmBtn` không reset disabled → mục thứ 2 không bấm được
- [x] Trường mới `yKienBLD` (cột 24/X "Ý kiến BLĐ") — lưu DB, không ghi đè noiDungBLD
- [x] Hiển thị Ý kiến BLĐ: card pending, Task form readonly, Quick View, Excel report
- [x] Backward-compat history (`_bldOpinionSrc` fallback marker cũ)
- [x] Đồng nhất page title với nav label (Tổng hợp BLĐ / Phê duyệt BLĐ)
- [x] verify_bld_queue 34 → 46 tests — 46/46 PASS; verify_ms_tasks re-verified PASS
- [x] Debug login local: KHÔNG có bug — TuanTT4/Thuha@123 + QuangNN3 đăng nhập OK; thêm `debug_login.mjs`
- [x] Push `master` `6952fe7..090b94a`

---

## ✅ COMPLETED S17

- [x] Fix BUG-01: `draft` param undefined → `db.tasks.find()` trong `bldSubmitAction`
- [x] Fix BUG-02: check return value `syncAction` → `if (!success) return`
- [x] Fix BUG-03: local fallback khi GAS offline — `persist()` + return true
- [x] Fix Playwright test: import path, `context.route` GAS abort, `waitForFunction`
- [x] Thêm TEST11–15: submit flow approve/reject/info — 34/34 PASS
- [x] Merge `fix/bld-queue-submit` → `master`

---

## ✅ COMPLETED S16

- [x] BLD Approval Queue view — pending list, approve/reject/info modal, history 7 days
- [x] Nav badge `navBadgeBld` + G+B shortcut + 18/18 Playwright PASS

## ✅ COMPLETED S15

- [x] Executive Summary view — 5 KPI cards, RAG donut, Attention list, G+E shortcut

---

## 🔴 PRIORITY 0 — Fix Testing Environment (Netlify hết credit)

**Options** (chưa chọn):
- **A) Nâng cấp Netlify plan** — giữ workflow, tốn phí
- **B) Cloudflare Pages** (miễn phí, unlimited) — **khuyến nghị**
- **C) GitHub Pages cho master** (`gh-pages` branch hoặc `/docs`)
- **D) Local only** — `npx http-server . -p 3030` + Playwright — hiện đang dùng tạm

**Hiện tại**: option D — chạy `node verify_bld_queue.mjs` + `node verify_ms_tasks.mjs` + `node verify_initiative_v2.mjs` để verify.

---

## 🔴 PRIORITY 1 — PO tạo PR: master → main (S18)

`master` @ `090b94a` đã push (S17 đã merge vào main qua PR #20 — chỉ còn S18).

**Lý do ưu tiên cao**: `master` ghi sheet 24 cột, `main` ghi 23 cột — client cũ ghi sau client mới sẽ làm **lệch/stale cột X (Ý kiến BLĐ)** (SCHEMA-01). Merge sớm để đồng bộ schema.

**Commits trong PR**: `4243363` (fix+feat BLĐ S18, 13 files), `090b94a` (debug_login.mjs).

---

## 🔴 PRIORITY 2 — Verify AI Chat trên live

AI Chat frontend hoàn chỉnh từ S12. GAS-side chưa xác nhận từ S12.

**Steps:**
1. Login Admin → AI Assistant → gõ câu hỏi
2. Nếu lỗi → GAS editor → `AiService.gs` → Script Properties → `GEMINI_API_KEY` → Deploy new version
3. Nếu chậm >10s → thêm `thinkingBudget: 0` vào `generationConfig` trong `callGemini()`

---

## 🟡 PRIORITY 3 — Smoke test toàn diện sau khi merge

| Feature | Check |
|---|---|
| Login — Admin / Teamlead / User | Mỗi role thấy đúng menu |
| BLD Queue | canBLD=Y tasks hiện; **duyệt liên tiếp 2 mục không bị khóa nút**; task biến mất sau approve/reject; task giữ sau info; history 7 days |
| **Ý kiến BLĐ (S18)** | Sau approve/info: cột X trên Sheet có marker; card pending hiện khối info; Task form hiện `#fYKien` readonly; Quick View + Excel report có cột mới; noiDungBLD KHÔNG bị ghi đè |
| Executive Summary | 5 KPI cards; RAG donut; Attention list |
| Tasks / KPI / Gantt / Report | No regression |
| User Management | Admin only; list/add/edit/reset PW |

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
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2']` — trừ khi PO yêu cầu rõ (S18: PO approve thêm cột 24 'Ý kiến BLĐ')
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. **Test local**: `npx http-server . -p 3030 &` → `node verify_bld_queue.mjs` (Windows, không cần PLAYWRIGHT_BROWSERS_PATH)
9. `syncAction` giờ có local fallback — khi GAS down vẫn save local. Nhắc user sync sau.
