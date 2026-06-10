# TODO — NEXT SESSION
**Prepared**: 2026-06-10 (Session 14 — end of session)
**Context**: master = main = `45bf54a`. Branch strategy locked: AI → master only; PO → main.

---

## NGUYÊN TẮC BRANCH (đọc trước khi làm bất cứ điều gì)

```
master  →  push tự do (Developer / AI)  →  auto-deploy Netlify (Testing)
main    →  PO ONLY — PO tự commit/merge trên GitHub khi đạt yêu cầu
```

**AI/Claude KHÔNG được push lên `main` trừ khi PO yêu cầu rõ ràng trong message.**

---

## 🔴 PRIORITY 0 — Verify AI Chat trên live

AI Chat frontend đã có từ Session 12. GAS-side chưa được xác nhận.

**Steps:**
1. https://test-shtd.netlify.app → login Admin → AI Assistant
2. Gõ câu hỏi → kiểm tra response
3. Nếu lỗi → GAS editor → `AiService.gs` line 58: `gemini-2.5-flash` → Script Properties → `GEMINI_API_KEY` = `AQ.xxx` → Deploy new version
4. Nếu chậm (>10s) → thêm `thinkingBudget: 0` vào `generationConfig` trong `callGemini()`

---

## 🟡 PRIORITY 1 — Smoke test toàn diện trên Netlify

| Feature | Check |
|---|---|
| Login — Admin / Teamlead / User | Mỗi role thấy đúng menu |
| User Management — Admin only | Teamlead + User KHÔNG thấy mục "Quản trị" |
| User Management — list loads | Bảng user rows xuất hiện |
| User Management — add / edit / reset PW / toggle active | Flow đầy đủ |
| Initiative → Milestone → Tasks | Mở accordion → click milestone → sub-panel tasks; badge alignment đúng; "Cập nhật link" hoạt động |
| AI Chat | Xem P0 |
| Existing features | Tasks, KPI, Gantt, Report — no regression |

---

## W2 — Tech Debt (low priority)

| ID | Debt | Effort |
|---|---|---|
| TD-008 | No error boundary in renderAll() — single JS error breaks whole view | Small |
| TD-018 | `fmtExportDate` duplicated app.js vs helpers.js | Tiny |
| TD-023 | `_oaActiveTab` not reset on re-render → visual inconsistency | Tiny |
| AUTH-05 | KNOWN_ROLES hardcoded — role mismatch silently fails | Small |
| TD-030 | User Management table — no search/pagination (acceptable at current scale ~10 users) | Tiny |

---

## Session Rules

1. **Đọc SESSION_HANDOVER + PROJECT_STATE trước** — không skip
2. **Branch**: push lên `master` trước; KHÔNG push/merge lên `main` — PO tự xử lý
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2']`
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. Test local (Playwright hoặc browser) trước khi push
