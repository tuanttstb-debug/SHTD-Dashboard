# Đề xuất xử lý triệt để BE: chậm đọc/ghi + timeout + mất bản ghi

> **Trạng thái:** ĐỀ XUẤT — chưa triển khai. Chờ anh Tuân duyệt phương án + phạm vi từng pha.
> **Ngày:** 2026-08-26 · **Người soạn:** Claude Code
> **Mục tiêu:** đưa tỷ lệ **ghi thất bại / timeout / mất bản ghi về tiệm cận 0%**, đồng thời giảm mạnh thời gian load.
> **Khẩu vị đã chốt:** tối ưu tại chỗ (giữ mô hình ghi đồng bộ, giữ "ghi xong thấy ngay"). **Đồng thời cao điểm:** 10–30 người.

---

## 1. Bối cảnh & kiến trúc hiện tại

- FE tĩnh (GitHub Pages) → **1 URL GAS Web App** duy nhất, `fetch` POST `text/plain`, timeout qua AbortController (30s ghi / 90s đọc / 120s AI). Nguồn dữ liệu = **Google Sheets** (`Task_Master` + các sheet domain).
- **Đã có sẵn (giữ nguyên, tận dụng):**
  - `batch-read` gộp 7 domain, mở spreadsheet 1 lần, có **version-gate** `SHTD_DATA_VER` (`CacheLayer.gs`, `Code.gs:81`).
  - **Atomic single-row upsert** thay vì ghi đè cả sheet (`Code.gs:188`, `SheetService.gs:71`).
  - Khóa ghi chống 2 người trùng mã (`Concurrency.gs`).

## 2. Chẩn đoán điểm nghẽn (đã đọc code)

### 2.1 ĐỌC — load chậm
- **Mọi write bump `DATA_VER` toàn cục** (`auditLog` → `_bumpDataVer`). Hệ quả: một write bất kỳ làm **mọi client** phải `batch-read` **đọc LIVE lại cả 7 sheet** (`Code.gs:95-102`). Task ~1500 dòng × 27 cột qua `getDisplayValues()` → payload vài trăm KB; mạng nội bộ bị bóp → vài giây/lần.
- **Không có version theo từng domain** → sửa 1 task vẫn ép tải lại cases/issues/dev/initiatives/users/notifs không liên quan.

### 2.2 GHI — chậm + timeout + "không ghi được"
- **Khóa ghi TOÀN CỤC** — `LockService.getScriptLock()` (`Concurrency.gs:24`) bọc **mọi write của mọi entity/mọi người**, chờ tối đa 20s. Ở 10–30 người cao điểm, các write không liên quan vẫn xếp hàng → dễ chạm 20s → ném lỗi → "không ghi được".
- **Critical section dài + nhiều `SpreadsheetApp.flush()`** mỗi write (`Code.gs:192-206`):
  `reassignIdIfExists` (đọc cả cột ID) → `notifPrior_` (đọc cả sheet notif) → `sheetUpsertTask` (đọc lại cột ID + setValues + **flush**) → `auditLog` (append + bump + flush) → `notifOnWrite` (đọc/append notif + flush). **~2–3 flush/write**, mỗi flush là 1 round-trip Sheets; cộng **cold-start GAS** → 1 write có thể vượt 30s → AbortError.
- **FE KHÔNG có retry/backoff, KHÔNG idempotency** (`auth.js gasPost`). Khi timeout, FE báo "đã lưu cục bộ" nhưng **bản ghi có thể đã commit hoặc chưa** → phân kỳ. Với bản ghi MỚI (server tự cấp lại mã) → retry mù có thể tạo **trùng**. Đây là "timeout giả / mất ghi" — cùng bản chất bài học `WRITE-TRANSPORT-01` bên AIUS.
- Trần đồng thời GAS (~30 execution/script) + execution kéo dài → dồn hàng → timeout dây chuyền.

## 3. Phương án (tối ưu tại chỗ — 3 tầng)

### ① Rút ngắn tối đa vùng khóa ghi  *(giảm cold latency + contention)*
- **Đưa notif ra khỏi critical section.** `notifPrior_` đọc snapshot **trước** khi lấy khóa; `notifOnWrite` chạy **best-effort sau khi nhả khóa** (đã bọc try/catch). Notif là phụ trợ → không được kéo dài đường ghi chính.
- **Gộp còn 1 lần đọc cột ID + 1 flush.** Viết 1 helper `upsertRowAtomic(sheet, id, row, isNew)`: đọc cột ID **một lần**, vừa reassign mã (nếu `isNew`) vừa tìm dòng đích, rồi `setValues` + `flush` **một lần**. Bỏ lần đọc cột ID lặp giữa `reassignIdIfExists` và `sheetUpsertTask`.
- **`auditLog` + bump version ra sau nhả khóa** (vẫn sau khi commit, đúng thứ tự). Critical section chỉ còn: *check-then-write* tối thiểu.
- **Áp cho cả 5 entity** (task/case/issue/initiative/dev) — hiện dùng chung pattern.

**File chạm:** `backend/Concurrency.gs` (helper gộp), `backend/Code.gs` (tất cả `*-upsert`), `backend/SheetService.gs` (+ `CasePipelineService`/`IssueService`/`InitiativeService`/`DevPlanService` các hàm `*UpsertRow`), `backend/NotificationService.gs` (`notifOnWrite` gọi ngoài lock).

### ② Ghi tin cậy phía client  *(đòn quyết định cho ~0% mất ghi)*
- **Idempotency key.** Client sinh `reqId` (uuid) **một lần cho mỗi thao tác logic**, retry dùng lại. Server dedup qua `CacheService` (TTL ~5 phút): `reqId → {id đã commit}`. Retry trùng `reqId` đã xử lý → trả lại **đúng mã cũ**, không tạo trùng. Kiểm trong critical section (rẻ, in-memory cache).
- **Retry + backoff trên FE.** Bọc mọi write trong `gasWrite(body, {reqId})`: gặp lỗi mạng/AbortError/HTTP 429/5xx → retry tối đa 3 lần, backoff lũy tiến + jitter (~0.5s / 1.5s / 4s), **giữ nguyên `reqId`**. Thành công → adopt mã server trả về (đã có `_adoptReassignedId`). Hết retry mới xếp vào hàng "lưu cục bộ + tự thử lại".
- **Server luôn trả mã đã commit** (đã có `id` trong response) → FE reconcile chắc chắn, hết "timeout giả".

**File chạm:** `assets/js/auth.js` (thêm `gasWrite` retry/backoff), `assets/js/api.js` (mọi `_gas*Upsert/_gas*Delete` đi qua `gasWrite`, gắn `reqId`), `backend/Code.gs` (đọc `body.reqId`, dedup cache trong các `*-upsert`), `backend/CacheLayer.gs` (helper `_reqSeen`/`_reqRemember`).

### ③ Version theo từng domain  *(đánh gốc "load chậm")*
- Thay `SHTD_DATA_VER` đơn bằng **`DATA_VER_<domain>`** (tasks/cases/issues/dev/initiatives/users/notifs/h2). Write chỉ bump version **domain bị ảnh hưởng**.
- `batch-read`: client gửi `vers: {tasks, cases, ...}`; server so từng domain, **chỉ trả data domain đổi** + versions hiện tại; domain không đổi → bỏ qua (client giữ cache). → Sửa 1 task = **chỉ tải lại tasks**.
- **Tương thích ngược:** giữ `ver` global làm fallback; `vers` là field mới, client cũ vẫn chạy; server cũ (chưa deploy) → client fallback như hiện tại.

**File chạm:** `backend/CacheLayer.gs` (per-domain ver), `backend/Code.gs` (`batch-read` so `vers`, bump theo domain trong từng write), `backend/AuditService.gs` (hàm bump nhận `domain`), `assets/js/api.js` (`readAll` gửi/nhận `vers`, merge từng domain — đã tách sẵn theo domain).

### Phụ (tùy chọn, ưu tiên thấp)
- **Keep-warm:** trigger thời gian mỗi ~5 phút gọi hàm nhẹ để giảm cold-start (hiệu quả biên).
- Sau khi ổn định: **dồn hẳn sinh notif sang trigger định kỳ** (bỏ khỏi đường ghi hoàn toàn).

## 4. Phân pha triển khai (verify từng bước, deploy tương thích ngược)

| Pha | Nội dung | Mục tiêu | Rủi ro |
|-----|----------|----------|--------|
| **A** | ② retry+idempotency FE + server dedup **và** ① rút ngắn critical section | Ghi ~0% mất/timeout | Thấp (additive; FE degrade an toàn) |
| **B** | ③ version theo domain | Load nhanh (chỉ tải phần đổi) | Thấp–TB (giữ fallback global ver) |
| **C** | Dồn notif sang trigger + keep-warm + dọn dead code | Đường ghi mảnh nhất | Thấp |

**Thứ tự deploy mỗi pha:** GAS trước (thay đổi thuần additive) → FE sau. Không phá tương thích 2 chiều (như batch-read đã làm).

## 5. Kiểm thử (end-to-end)

- **GAS/unit hiện có (giữ xanh):** `verify_my_work`, atomic 41/41, `verify_notifications` 21/21, `verify_notif_retract`, `report_week`, `task_rag`, `verify_recurring`.
- **Bổ sung:**
  - Idempotent create: gửi cùng `reqId` 2 lần → **1 dòng** trên sheet, trả cùng mã.
  - Retry-on-timeout: giả lập abort lần 1 → retry lần 2 thành công, không trùng, adopt đúng mã.
  - Per-domain gate: write 1 task → `batch-read` chỉ trả `tasks`, các domain khác `notModified`.
  - Concurrency: 2 tab ghi 2 task khác nhau đồng thời → **không mất bản ghi**, không chờ vượt ngưỡng.
- **Đo trước/sau:** payload `batch-read` sau khi sửa 1 domain; thời gian 1 write p50/p95.

## 6. Ranh giới dữ liệu
Không đụng dữ liệu khách hàng. Dedup cache chỉ lưu `reqId → id`. Toàn bộ là metadata công việc nội bộ.

## 7. Việc cần anh Tuân
1. Duyệt phương án + thứ tự pha (đề xuất bắt đầu **Pha A**).
2. Sau mỗi pha: **redeploy GAS** (New version) + hard-refresh; anh nghiệm thu trên production.
3. (Tùy) cấp 1 tài khoản test để em chạy Playwright kịch bản retry/đồng thời trên live.
