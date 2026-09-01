# ĐỀ XUẤT — Kết nối Task/Initiative với Google Calendar (nhắc việc định kỳ)

**Ngày:** 2026-09-01 · **Owner:** [CC] thiết kế, [TT] quyết

> **CẬP NHẬT 2026-09-01 — [TT] THU HẸP SCOPE:** chỉ làm cho **user TuanTT4** (task của chính anh,
> Gmail của chính anh → data-boundary an toàn). **PHA 1 ĐÃ BUILD + VERIFY** (sandbox 32/32,
> my_work 97/97). Tự phát hiện: nếu Gmail đích == tài khoản owner chạy GAS → **ghi thẳng lịch**
> (nhắc chuẩn); khác → guest-invite. Tiêu đề sự kiện = **đầy đủ** (option A — task của chính anh).
> **File:** `backend/CalendarSyncService.gs` (mới) · `backend/Code.gs` (+3 route) ·
> `assets/js/api.js`/`views/my-work.js`/`i18n.js` · `assets/css/my-work.css` · `test/verify_calendar_sync.mjs`.
> **Bỏ (thừa với 1 user):** cột User_Master + toggle Quản trị người dùng → trạng thái lưu Script
> Properties. Phần §5–§7 dưới là thiết kế multi-user gốc (giữ để mở rộng sau).
>
> **[TT] cần:** (1) dán các `.gs` mới → **cấp quyền Calendar** khi được hỏi; (2) `installCalendarSyncTrigger()`;
> (3) redeploy Web App + hard-refresh; (4) vào "Công việc của tôi" → nhập Gmail → Kết nối → kiểm lịch.

---

---

## 1. Mục tiêu & phạm vi (đã chốt với [TT])

- Tính năng trên **"Công việc của tôi"**: user **1 công tắc tổng** (opt-in) để đồng bộ việc lên **Google Calendar cá nhân (Gmail)** và **được gỡ bất kỳ lúc nào** (tắt = gỡ hết sự kiện của user đó).
- **Admin** có thêm nút **đăng ký / gỡ** hộ user tại **Quản trị người dùng**.
- **Phạm vi sync** (việc user là người phụ trách — Res/Acc):
  1. **Task định kỳ** (Tuần/Tháng) → sự kiện **lặp lại** (nhắc mỗi kỳ).
  2. **Task có deadline** (không định kỳ) → sự kiện **1 lần** trên ngày deadline (nhắc trước hạn).
  3. **Initiative có deadline** → sự kiện **1 lần** trên ngày deadline.
- **Email nhận nhắc = Gmail cá nhân** ([TT] xác nhận). Vì login KHÔNG dùng Google OAuth và cột `Email` hiện có thể là email công việc, sẽ dùng **1 trường Gmail sync riêng** user tự khai (xem §5).

---

## 2. Ràng buộc kiến trúc (khảo sát code 2026-09-01)

| Yếu tố | Hiện trạng | Hệ quả cho Calendar |
|---|---|---|
| **Deploy GAS** | `Execute as: Me (owner)`, `Who has access: Anyone` (Code.gs §3-8) | Mọi code server chạy dưới **tài khoản Google của owner (TuanTT4)** — KHÔNG phải của từng user. |
| **Auth** | Tự chế: username/password trên `User_Master` + HMAC token (AuthService.gs). **KHÔNG Google OAuth.** | Hệ thống **không có** quyền ghi calendar cá nhân của user qua OAuth. |
| **User_Master** | Có sẵn cột `Email` (một số user còn trống). Đọc **theo header-name** (thêm cột an toàn). | Thêm cột mới (Cal_Sync_On/Cal_Email…) tự hiện ở admin panel + userList. |
| **Task/Initiative** | Task: `Start Date`,`Deadline`,`% HT`,`Định kỳ`(Z),`Kỳ đã xong`(AA). Initiative: `Start Date`,`Deadline`,`RAG`. | Có đủ trường để map sự kiện. Tái dùng `periodLabelOf`/`taskPeriodStatus` (helpers.js) + `_notifRecur*` (NotificationService.gs). |
| **Trigger định giờ** | `dailyDateGuard`@7h, `notifScan`@8h, `keepWarm` opt-in. Pattern `ScriptApp.newTrigger(...).timeBased()`. | Thêm 1 trigger `calSyncAllDaily`@7h30 (sau DateGuard, trước notifScan). |
| **Ghi/version** | `atomicUpsert_` + version-theo-domain (`_bumpDomainVer`) + batch-read. | Reconcile chỉ chạy khi domain tasks/initiatives/users đổi + safety-net hằng ngày. |
| **Calendar/OAuth code** | **Chưa có gì.** | Xây mới từ đầu, không đụng luồng cũ. |

---

## 3. Phương án kỹ thuật

### ✅ Phương án A — Guest-invite qua CalendarApp (CHỌN)
Owner tạo sự kiện trên **1 lịch phụ riêng** ("SHTD – Nhắc việc", owner sở hữu, có thể ẩn khỏi lịch chính) rồi **mời Gmail của user làm khách** (`addGuest` + `sendInvites`). Sự kiện xuất hiện trên Google Calendar của user và **bắn nhắc theo mặc định lịch của họ**.

- **Hợp mô hình hiện tại**: vẫn `Execute as owner`, chỉ cần owner **cấp quyền Calendar 1 lần** khi redeploy.
- **Gỡ bất kỳ lúc nào**: tắt công tắc → server xóa sự kiện/gỡ khách của user đó (dựa sổ ánh xạ CAL_SYNC_MAP).
- **Định kỳ**: `CalendarApp.newRecurrence().addWeeklyRule()/addMonthlyRule()` → 1 chuỗi sự kiện lặp.
- **Hạn chế đã biết** (nêu để [TT] biết trước):
  - **Nhắc của khách theo mặc định lịch user**, không ép được offset tùy biến trên bản-copy-của-khách (offset do organizer đặt chỉ chắc trên bản của organizer). → Sự kiện vẫn hiện + có nhắc mặc định (all-day thường nhắc hôm trước; timed nhắc 10' trước). Đủ cho "nhắc việc"; nếu cần nhắc chính xác tuyệt đối vẫn có **chuông + email digest in-app** (đã có) làm nguồn chuẩn.
  - **Quota CalendarApp** (đặc biệt nếu owner là Gmail thường): giới hạn số sự kiện/lời mời mỗi ngày → **bắt buộc sync tăng dần** (chỉ tạo/sửa/xóa phần thay đổi, không dựng lại toàn bộ). Sổ CAL_SYNC_MAP lo việc này.

### ❌ Phương án B — OAuth từng user (LOẠI)
Sạch nhất (ghi thẳng calendar user) nhưng phải **thêm luồng đăng nhập/authorize Google** song song login hiện tại, lưu & refresh token, user phải có tài khoản Google đăng nhập app. Rất nặng, xung đột mô hình. Để dành nếu sau này cần nhắc offset chính xác + không muốn qua owner.

### ❌ Phương án C — ICS subscription feed (LOẠI)
`doGet` trả feed `.ics` per-user, user "Subscribe from URL". Nhẹ, không cần quyền Calendar. **Nhưng Google KHÔNG bắn thông báo cho lịch subscribe từ URL** → **hỏng yêu cầu nhắc việc**. Loại.

---

## 4. ⚠️ ĐIỂM CHỐT DATA-BOUNDARY (cần [TT] quyết trước khi code)

Tiêu đề task ở SHTD **có thể chứa dữ liệu nhạy cảm** (tên khách hàng, số tiền — như báo cáo tuần vẫn hiển thị nội bộ). Đưa nguyên tiêu đề lên **Gmail cá nhân** = đẩy dữ liệu nội bộ ra tài khoản cloud cá nhân → **vi phạm nguyên tắc data-boundary của repo**.

**3 lựa chọn nội dung sự kiện** (đề xuất mặc định = B):

| | Tiêu đề sự kiện | Rủi ro lộ | Ghi chú |
|---|---|---|---|
| A | `[SHTD] <tiêu đề task đầy đủ>` | **Cao** (tên KH/số tiền lên Gmail) | Chỉ dùng nếu [TT] chấp nhận |
| **B (mặc định đề xuất)** | `[SHTD] <Mã task> – Việc định kỳ/Đến hạn` + mô tả "Mở app để xem chi tiết" (link) | **Thấp** | Nhắc đúng lịch, không lộ nội dung; user bấm vào app xem chi tiết |
| C | Chỉ mã + nhãn kỳ, không link | Rất thấp | Kém tiện |

→ **Cần [TT] chốt A/B/C.** Em code theo B trừ khi anh đổi.

---

## 5. Thiết kế dữ liệu

### 5.1 `User_Master` — thêm 3 cột (append, header-driven, an toàn)
- `Cal_Sync_On` (bool) — công tắc tổng của user.
- `Cal_Email` (text) — Gmail user tự khai để nhận nhắc (fallback = `Email` nếu trống & là Gmail).
- `Cal_Synced_At` (ISO) — mốc reconcile gần nhất (chẩn đoán).

Migration `CalendarColumnMigration.gs` (chạy 1 lần trong editor, giống RagColumnMigration/RecurrenceMigration): set header + backfill rỗng.

### 5.2 Sheet mới `CAL_SYNC_MAP` — sổ ánh xạ (idempotency ledger)
| Cột | Ý nghĩa |
|---|---|
| Username | chủ sự kiện |
| Entity_Type | `task` \| `initiative` |
| Entity_Id | mã task/initiative |
| Occurrence_Key | `''` (1 lần) \| nhãn kỳ (định kỳ) |
| Event_Id | id sự kiện Google trả về |
| Calendar_Id | id lịch phụ |
| Content_Hash | hash nội dung (đổi → update) |
| State | `active` \| `deleted` |
| Updated_At | ISO |

Sổ này là nguồn để **sync tăng dần**: so tập "mong muốn" (tính từ task/initiative của user) với tập "đã tạo" → **create/update/delete** đúng phần chênh.

---

## 6. Thiết kế backend — `CalendarSyncService.gs` (mới)

**Helper lịch phụ:** `_calGetOrCreateCalendar()` — tạo/tìm lịch phụ "SHTD – Nhắc việc" của owner (lưu id vào Script Properties).

**Tính tập mong muốn:** `_calDesiredEventsFor(username)` — quét task/initiative user phụ trách (Res/Acc), sinh danh sách event mong muốn:
- Task định kỳ Tuần/Tháng → 1 recurring event (RRULE tương ứng), mốc bắt đầu = Start Date / kỳ hiện tại.
- Task deadline (không định kỳ, chưa done) → 1 all-day event trên Deadline.
- Initiative deadline (chưa đóng) → 1 all-day event trên Deadline.
- Loại: task/initiative đã hoàn thành, đã đổi người phụ trách, mất → không có trong tập mong muốn → reconcile xóa.

**Reconcile 1 user:** `calSyncUserNow(username)` — diff tập mong muốn ↔ CAL_SYNC_MAP → create/update/delete qua CalendarApp + `addGuest(cal_email)`. Cập nhật MAP + `Cal_Synced_At`. Bọc quota/try-catch, best-effort (lỗi 1 event không hỏng cả mẻ).

**Bật/tắt:**
- `calSyncEnable(username, email)` — validate email dạng Gmail, set `Cal_Sync_On=true`+`Cal_Email`, gọi `calSyncUserNow`.
- `calSyncDisable(username)` — xóa mọi event active của user trong MAP (gỡ khách/xóa series) → set `Cal_Sync_On=false`.

**Trigger:** `calSyncAllDaily()` — duyệt user `Cal_Sync_On=true`, reconcile từng người (bắt kịp task mới/đổi deadline/hoàn thành/gỡ). Cài qua `installCalendarSyncTrigger()` (@7h30). Tùy chọn: reconcile tức thì sau write (bump domain) — giai đoạn sau.

**Routes trong Code.gs (doPost):**
| Action | Quyền | Việc |
|---|---|---|
| `cal-status` | user | trả trạng thái sync của chính mình |
| `cal-enable` | user | bật cho **chính mình** (kèm Gmail) |
| `cal-disable` | user | tắt cho **chính mình** |
| `cal-admin-set` | **Admin** | bật/tắt hộ user bất kỳ (thêm vào `ADMIN_ONLY`) |

Mọi write đi qua pattern hiện có (audit + bump domain `users`). Backward-compat: client cũ không gọi action mới → không vỡ (giống batch-read).

---

## 7. Thiết kế frontend

### 7.1 "Công việc của tôi" (`views/my-work.js` + `my-work.css`)
- Thẻ/nút **"🔔 Đồng bộ Google Calendar"** ở đầu view: trạng thái (Bật/Tắt + Gmail đang dùng + mốc sync).
- Bật lần đầu → ô nhập **Gmail** + nút "Kết nối" (gọi `cal-enable`). Đang bật → nút "Ngắt kết nối" (`cal-disable`) + "Đồng bộ lại ngay".
- Chỉ hiện cho mọi role (ai cũng có việc của mình). Optimistic UI + toast, theo pattern hiện có.

### 7.2 "Quản trị người dùng" (`views/user-management.js`)
- Bảng đọc header động → thêm **cột "Calendar"** hiển thị ✅/—; nút bật/tắt hộ (`handleCalToggle(username,on)` → `cal-admin-set`), mirror pattern `handleToggleActive`.
- Khi admin bật hộ mà user chưa khai Gmail → nhắc nhập/dùng `Email` sẵn có.

### 7.3 i18n
Thêm key VI/EN (nhãn nút, trạng thái, lỗi email) như các phiên trước.

---

## 8. Đồng bộ trạng thái (edge cases)

| Sự kiện | Hành vi reconcile |
|---|---|
| Task hoàn thành (100%/done) | Xóa event (không nhắc việc đã xong) |
| Đổi deadline | Update event sang ngày mới (Content_Hash đổi) |
| Đổi người phụ trách | Xóa ở người cũ, tạo ở người mới (nếu người mới bật sync) |
| Bỏ định kỳ / đổi Tuần↔Tháng | Xóa series cũ, tạo lại đúng RRULE |
| User tắt sync | Xóa toàn bộ event của user |
| User đổi Gmail | Xóa event Gmail cũ (gỡ khách) + tạo lại mời Gmail mới |
| Xóa task | Không còn trong tập mong muốn → xóa |

---

## 9. Redeploy & quyền (việc [TT])
1. Dán các `.gs` mới + sửa → **owner re-authorize** (lần đầu gọi CalendarApp GAS xin scope Calendar). Vẫn `Execute as owner`.
2. Chạy `CalendarColumnMigration.commit()` (tạo 3 cột User_Master) + `installCalendarSyncTrigger()` (trigger @7h30).
3. Redeploy Web App (link không đổi) + hard-refresh FE.

## 10. Kế hoạch test
- `verify_calendar_sync.mjs` (sandbox Node chạy hàm GAS thật — pattern verify_notif_retract): tính tập mong muốn (định kỳ/deadline/initiative), diff create/update/delete, idempotent (chạy 2 lần không tạo trùng), tắt → xóa hết, đổi Gmail → di chuyển, đổi deadline → update.
- Regression: my_work · notif · atomic · domain_version.
- **Smoke live** ([TT], vì CalendarApp cần owner thật): bật cho 1 user test → kiểm event xuất hiện trên Gmail đó + nhắc; tắt → biến mất; đổi deadline → dời.

## 11. Phân pha
- **Pha 1 — Nền + bật/tắt thủ công (MVP):** cột User_Master + CAL_SYNC_MAP + CalendarSyncService (desired/reconcile/enable/disable) + routes + trigger daily + FE toggle My Work + admin toggle. Nội dung theo mặc định B. → *đủ dùng*.
- **Pha 2 — Hoàn thiện:** reconcile tức thì sau write (không đợi daily); UI liệt kê việc đã đưa lên lịch; xử lý quota lớn (chunk); tùy chọn nội dung A/C nếu [TT] đổi.
- **Pha 3 (tùy chọn):** nếu cần nhắc offset chính xác trên máy user → cân nhắc OAuth (PA B) cho nhóm cần.

## 12. Rủi ro & nợ
- **Data-boundary** (§4) — rủi ro cao nhất, phải chốt trước.
- **Quota CalendarApp** owner Gmail thường — giảm bằng sync tăng dần; theo dõi log.
- **Nhắc theo mặc định khách** — không ép offset; nguồn nhắc chuẩn vẫn là chuông/email in-app.
- **Gmail sai/không phải Google** — validate + báo lỗi; không phá luồng.
- **Owner phụ thuộc** — mọi event do owner sở hữu; owner đổi tài khoản deploy → cần dựng lại lịch phụ (ghi vào TECH_DEBT).

## 13. Câu hỏi còn mở cho [TT]
1. **Nội dung sự kiện A/B/C** (§4) — em mặc định **B** (mã + nhãn, không lộ nội dung).
2. **Nhắc trước bao lâu** cho task deadline (mặc định đề xuất: all-day trên ngày deadline + để mặc định lịch user; hoặc thêm 1 ngày trước)?
3. **Lịch phụ riêng** ("SHTD – Nhắc việc") hay tạo thẳng trên lịch chính owner? (đề xuất: lịch phụ, gọn.)
