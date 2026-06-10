# TODO — NEXT SESSION
**Prepared**: 2026-06-10 (Session 15 — end of session)
**Context**: Feature branch `claude/dashboard-leader-features-7nmssw` HEAD `a4e57d8`. master/main = `45bf54a`.

---

## NGUYÊN TẮC BRANCH (đọc trước khi làm bất cứ điều gì)

```
claude/dashboard-leader-features-7nmssw  →  feature branch hiện tại (S15)
master  →  push tự do (Developer / AI)   →  auto-deploy Netlify (⚠️ hết credit)
main    →  PO ONLY — PO tự commit/merge trên GitHub khi đạt yêu cầu
```

**AI/Claude KHÔNG được push lên `main` trừ khi PO yêu cầu rõ ràng trong message.**

---

## ✅ COMPLETED THIS SESSION (S15)

- [x] Executive Summary view (Tổng hợp BLĐ) — 5 KPI cards, RAG donut, Attention list, Initiative health table
- [x] Nav item + G+E shortcut + print support
- [x] Playwright tests: empty, dark mode, keyboard, re-render — PASS

---

## 🔴 PRIORITY 0 — Fix Testing Environment (Netlify hết credit)

Netlify hết credit (xác nhận 2026-06-10) — môi trường Testing KHÔNG còn auto-deploy từ `master`.

**Options:**
- **A) Nâng cấp Netlify plan** — giữ nguyên workflow, tốn phí
- **B) Migrate sang Cloudflare Pages** (miễn phí, unlimited bandwidth) — đổi CI target
- **C) Dùng GitHub Pages cho cả master** (dùng branch `gh-pages` hoặc folder `/docs`) — không cần service ngoài
- **D) Verify local only** bằng Playwright + `http-server` — tạm thời, không có public URL

**Tạm thời**: verify bằng local server (`npx http-server . -p 3030`) + Playwright tests.

---

## 🟡 PRIORITY 1 — Merge feature branch vào main

Branch `claude/dashboard-leader-features-7nmssw` đã ready. PO review trên GitHub, merge vào main.

---

## 🔴 PRIORITY 2 — Verify AI Chat trên live

AI Chat frontend đã có từ Session 12. GAS-side chưa được xác nhận.

**Steps:**
1. https://test-shtd.netlify.app → login Admin → AI Assistant
2. Gõ câu hỏi → kiểm tra response
3. Nếu lỗi → GAS editor → `AiService.gs` line 58: `gemini-2.5-flash` → Script Properties → `GEMINI_API_KEY` = `AQ.xxx` → Deploy new version
4. Nếu chậm (>10s) → thêm `thinkingBudget: 0` vào `generationConfig` trong `callGemini()`

---

## 🟡 PRIORITY 3 — Smoke test toàn diện trên Netlify

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
