# TODO — NEXT SESSION
**Prepared**: 2026-06-10 (Session 13 — User Management feature)
**Context**: User Management complete on master. GAS redeploy still pending (AI Chat + UserService).

---

## 🔴 PRIORITY 0 — GAS Redeploy (2 things needed)

### P0-A: AI Chat fix (từ Session 12)
1. GAS editor → `AiService.gs` line 58: đổi thành `gemini-2.5-flash`
2. GAS → Project Settings → Script Properties → `GEMINI_API_KEY` = key mới (`AQ.xxx`)
3. Deploy → Manage deployments → New version (giữ nguyên URL)

### P0-B: User Management — copy mới vào GAS (Session 13)
1. GAS editor → tạo file mới `UserService.gs` → paste nội dung từ `backend/UserService.gs`
2. GAS editor → `Code.gs` → cập nhật: thêm 4 action mới + ADMIN_ONLY array (xem `backend/Code.gs`)
3. Save → Deploy new version (cùng URL)
4. Test trên https://test-shtd.netlify.app → login Admin → Quản trị → Quản lý User

---

## 🟡 PRIORITY 1 — Smoke test Netlify sau GAS redeploy

| Feature | Check |
|---|---|
| Login Admin / Teamlead / User | Smoke test |
| User Management — xem danh sách | Requires GAS redeploy |
| User Management — thêm user mới | Requires GAS redeploy |
| User Management — edit + toggle active | Requires GAS redeploy |
| AI Chat | Requires P0-A |
| RBAC: Teamlead/User không thấy menu Quản trị | Test ngay trên Netlify |

---

## 🟡 PRIORITY 2 — Merge master → main (sau PO confirm)

`main` branch still at `5b165e2`. Sessions 10–13 only on `master`.

```
git checkout main
git merge master
git push origin main
```

---

## W2 — Tech Debt (low priority)

| ID | Debt |
|---|---|
| TD-008 | No error boundary in renderAll() |
| TD-018 | `fmtExportDate` duplicated in app.js vs helpers.js |
| TD-023 | `_oaActiveTab` not reset on re-render |

---

## Session Rules (unchanged)
1. Read SESSION_HANDOVER + PROJECT_STATE first
2. WORKING_RULE.md — do not touch DB_COLS, localStorage['shtd_v2']
3. One logical change per commit
4. All GAS calls via gasPost() — never raw fetch()
5. GS_WEBAPP_URL in assets/js/config.js — update on every GAS redeploy
6. esc() on ALL user-supplied content via innerHTML
