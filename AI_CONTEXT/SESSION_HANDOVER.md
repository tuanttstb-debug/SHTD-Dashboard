# SESSION HANDOVER
**Date**: 2026-06-12 (Session 18 — Rà soát BLĐ: UI consistency + nút duyệt + trường Ý kiến BLĐ + login debug)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed**: `master` @ `090b94a` (commits `4243363` + `090b94a`)
**origin/main HEAD**: `1c57999` — PR #20 merged (S17 bugfix đã lên Production)

---

## Branch Strategy

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `master` | Testing → local Playwright (Netlify ❌ hết credit) | Developer / AI |
| `main` | Production → GitHub Pages | **PO ONLY** |

**Rule: AI/Claude KHÔNG push `main` trừ khi PO yêu cầu rõ ràng.**

---

## Tasks Completed This Session (S18)

| # | Task | File | Status |
|---|---|---|---|
| UI-01 | `.btn-success` **chưa từng được định nghĩa** → nút "Phê duyệt" trong suốt. Thêm style solid green | `assets/css/components.css:76` | ✅ |
| UI-02 | Đồng nhất page title với nav label: "Tổng hợp BLĐ" / "Phê duyệt BLĐ" | `assets/js/ui/navigation.js:86` | ✅ |
| BUG-04 | `bldMiniConfirmBtn` không reset `disabled` khi mở modal lần 2 → duyệt 1 mục xong, mục sau không bấm được | `assets/js/views/bld-queue.js:243` | ✅ |
| FEAT-01 | Trường mới `yKienBLD` — cột 24 (X) "Ý kiến BLĐ" trên Task_Master | constants/api/parsers/crud/index/Config.gs | ✅ |
| FEAT-02 | Marker duyệt/từ chối/bổ sung lưu vào `yKienBLD` — **không còn ghi đè** `noiDungBLD` của team | `bld-queue.js:300` | ✅ |
| FEAT-03 | Hiển thị Ý kiến BLĐ: card pending (khối info), Task form (readonly `#fYKien`), Quick View, Excel report | bld-queue.js / index.html / quickview.js / report.js | ✅ |
| COMPAT | History đọc cả marker cũ (noiDungBLD) lẫn mới (yKienBLD) qua `_bldOpinionSrc()` | `bld-queue.js:50` | ✅ |
| TEST | verify_bld_queue: 34 → **46 tests, 46/46 PASS** (TEST16–20) | `verify_bld_queue.mjs` | ✅ |
| LOGIN | Debug "local không đăng nhập được user thật" → **KHÔNG có bug** (xem dưới) | `debug_login.mjs` (mới) | ✅ |

---

## Login Investigation — Kết luận: KHÔNG có bug code

- Login local hoạt động end-to-end: verified UI tại localhost:3030 với **TuanTT4/Thuha@123** (Admin, "Trần Thế Tuân") và **QuangNN3/QuangNN3** — đăng nhập OK, load data OK, không bị đá ra.
- Nguyên nhân báo lỗi: nhập sai mật khẩu (mặc định seed `TuanTT4` đã bị đổi thành `Thuha@123` từ trước).
- Phát hiện: `DungLQ1` bị hạ role Admin → **User**. `TuanTT4` có thể là Admin duy nhất.
- Tool mới: `node debug_login.mjs` (env `LOGIN_USER`/`LOGIN_PASS`) — test login UI thật, in GAS response.

---

## Decisions Made

1. **`DB_COLS` 23 → 24 cột** (PO yêu cầu trường Ý kiến BLĐ lưu DB). `GS_RANGE` → `A1:X`.
2. **GAS backend KHÔNG cần redeploy**: `sheetRead()` dùng `getLastColumn()`, `sheetWrite()` dùng `values[0].length` — schema động theo header client gửi lên. `Config.gs DATA_RANGE` chỉ sửa comment.
3. Ý kiến BLĐ **chỉ ghi qua màn Phê duyệt BLĐ** — Task form hiển thị readonly (hiện khi task có ý kiến hoặc `canBLD='Y'`); `handleSubmit` preserve giá trị.
4. `.btn-success` chọn solid green (song song `.btn-primary`/`.btn-secondary` solid; `.btn-success-soft` đã có sẵn cho biến thể nhạt).

---

## Blockers

| Item | Status |
|---|---|
| GAS AiService.gs + GEMINI_API_KEY | ⚠️ UNCONFIRMED từ S12 |
| Netlify hết credit | ❌ — dùng local Playwright |
| PR `master` → `main` (S18) | ⏳ Chờ PO |
| `verify_initiative_v2.mjs` fail local | ⚠️ Pre-existing — không inject auth, loginOverlay chặn (TD-033) |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| **Mixed-version clients ghi lệch cột X** | 🟡 MEDIUM | Production (`main`) hiện vẫn ghi 23 cột. Nếu client 24-cột ghi trước, rồi client 23-cột ghi sau: `sheetWrite` chỉ clear 23 cột → cột X (Ý kiến BLĐ) **bị lệch hàng/stale**. Mitigation: merge S18 lên `main` sớm; ý kiến mới sẽ được ghi lại đúng ở lần ghi 24-cột kế tiếp. |
| yKienBLD mất khi edit task bằng client cũ | 🟢 LOW | Client 23-cột rebuild task object không có yKienBLD → trường rỗng khi ghi đè. Hết rủi ro sau khi merge main. |
| Legacy marker trong noiDungBLD | 🟢 LOW | Dữ liệu cũ giữ nguyên; history fallback đọc được. Không migrate tự động. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_bld_queue.mjs     # 46/46 PASS (S18)
node verify_ms_tasks.mjs      # PASS
node debug_login.mjs          # login flow với user thật
# verify_initiative_v2.mjs — fail pre-existing (TD-033), không phải regression
```

---

## Next Steps

1. **PO tạo PR `master` → `main`** (gồm S18: `4243363`, `090b94a`) — ưu tiên cao vì rủi ro lệch cột X.
2. Smoke test live sau merge: BLD queue (duyệt liên tiếp 2 mục), Ý kiến BLĐ hiển thị ở card/form/QuickView, Excel report cột mới.
3. Verify AI Chat trên live (tồn từ S12).
4. Fix `verify_initiative_v2.mjs`: thêm auth inject + GAS route abort (copy pattern từ `verify_bld_queue.mjs`).
