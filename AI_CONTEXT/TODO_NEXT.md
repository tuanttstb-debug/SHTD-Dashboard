# TODO — NEXT SESSION
**Prepared**: 2026-06-10 (Session 15 — end of session)
**Context**: master = `11d054a` (4 commits ahead of main). Branch strategy locked.

---

## NGUYÊN TẮC BRANCH (đọc trước khi làm bất cứ điều gì)

```
master  →  push tự do (Developer / AI)  →  verify local (Netlify ❌ hết credit)
main    →  PO ONLY — PO tự commit/merge trên GitHub khi đạt yêu cầu
```

**AI/Claude KHÔNG được push lên `main` trừ khi PO yêu cầu rõ ràng trong message.**

---

## 🔴 PRIORITY 0 — Fix Testing Environment (Netlify hết credit)

Netlify hết credit (xác nhận 2026-06-10) — KHÔNG còn auto-deploy từ `master`.

**Options:**
- **A) Nâng cấp Netlify plan** — giữ nguyên workflow, tốn phí
- **B) Migrate sang Cloudflare Pages** (miễn phí, unlimited) — đổi CI target
- **C) GitHub Pages cho master** (branch `gh-pages` hoặc `/docs`) — không cần service ngoài
- **D) Verify local only** bằng `npx http-server . -p 3030` + Playwright — tạm thời

**Tạm thời hiện tại**: dùng local server + Playwright (các test suite đều dùng localhost:3030).

---

## 🔴 PRIORITY 1 — Verify AI Chat trên live

AI Chat frontend hoàn chỉnh từ S12. GAS-side chưa xác nhận.

**Steps:**
1. Mở app (GitHub Pages hoặc local) → login Admin → AI Assistant
2. Gõ câu hỏi → kiểm tra response
3. Nếu lỗi → GAS editor → `AiService.gs` L58: `gemini-2.5-flash` → Script Properties → `GEMINI_API_KEY` → Deploy new version
4. Nếu chậm >10s → thêm `thinkingBudget: 0` vào `generationConfig` trong `callGemini()`

---

## 🟡 PRIORITY 2 — Smoke test features mới S15

Tất cả verify bằng local server (Netlify down):

| Feature | Check |
|---|---|
| Task form: `fInit` dropdown | Không còn milestone trong list |
| Task ADD: ID auto-gen | Chọn Initiative + Milestone → ID = `{init}-{ms}-{seq}` |
| Task EDIT: ID auto-update | Đổi initiative → ID tự thay, lưu đúng record |
| Task EDIT: nút "Tạo lại mã" | Click → gen lại theo initiative+milestone hiện tại |
| Preset "Đang làm" (default) | Ẩn Hoàn thành + Tạm dừng; badge count đúng |
| Preset "Tuần BC này" | Chỉ hiện task có tuanBC = tuần hiện tại |
| Preset "Quá hạn" | Badge đỏ; chỉ task endDate < hôm nay, progress < 100 |
| Preset persist | Đổi tab → reload → vẫn giữ tab đã chọn |
| Filter bar AND preset | Chọn preset + filter thêm → kết quả AND đúng |

---

## 🟡 PRIORITY 3 — Xem xét toast warning khi EDIT đổi initiative

Khi user đang EDIT task và đổi `fInit`, ID tự động thay đổi mà không có cảnh báo.
- Nguy cơ: user đổi nhầm initiative → ID đổi → confuse
- Giải pháp nhẹ: toast "Mã Task đã cập nhật: {newId}" khi autoGenId() chạy trong EDIT mode

---

## W2 — Tech Debt (low priority)

| ID | Debt | Effort |
|---|---|---|
| TD-008 | No error boundary in renderAll() — single JS error breaks whole view | Small |
| TD-018 | `fmtExportDate` duplicated app.js vs helpers.js | Tiny |
| TD-023 | `_oaActiveTab` not reset on re-render → visual inconsistency | Tiny |
| AUTH-05 | KNOWN_ROLES hardcoded — role mismatch silently fails | Small |
| TD-030 | User Management table — no search/pagination (acceptable ~10 users) | Tiny |
| TD-031 | BAU task ID: `Số001` (cũ) vs `Số-001` (mới) — gap sequence khi clone | Tiny |

---

## Session Rules

1. **Đọc SESSION_HANDOVER + PROJECT_STATE trước** — không skip
2. **Branch**: push `master` trước; KHÔNG push/merge `main` — PO tự xử lý
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2']`
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. Test local (Playwright `localhost:3030`) trước khi push
9. `genId(init, team, ms, extra)` — luôn pass đủ 3 args từ form
