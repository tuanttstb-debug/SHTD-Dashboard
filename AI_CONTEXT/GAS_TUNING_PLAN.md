# KẾ HOẠCH TUNING TẦNG GỌI GAS — Giữ kết nối + mượt khi data lớn

**Soạn**: 2026-08-13 · **Bối cảnh**: sau S71 (nới read timeout 90s) vẫn timeout/mất kết nối trên mạng nội bộ.
**Mục tiêu (ưu tiên giảm dần)**: (1) **LUÔN giữ kết nối** — app không bao giờ "đứng hình"; (2) thao tác mượt; (3) chịu được data phình khi H2 mở rộng.
**Quyết định đã chốt với user**: được deploy GAS mới · đổi startup sang **cache-first (không chặn UI)**.

---

## 1. Chẩn đoán — vì sao S71 chưa giải quyết

`startApp()` (`app.js`) bắn **8 request GAS gần đồng thời** tới cùng host `script.google.com`:

| # | Hàm client | Action | Sheet đọc | Chặn UI? |
|---|---|---|---|---|
| 1 | `readFromHandle()` | `read` | Task_Master | ✅ **await → chặn render** |
| 2 | `readInitiatives()` | `initiative-read` | Initiative_Master | nền |
| 3 | `readCases()` | `case-pipeline-read` | Case_Pipeline | nền |
| 4 | `readIssues()` | `issue-read` | Issue_Tracker | nền |
| 5 | `readDev()` | `dev-read` | Dev_Plan | nền |
| 6 | `loadAppUsers()` | `user-list` | User_Master | nền |
| 7 | `readNotifications()` | `notif-read` (+poll 5') | Notifications+User | nền |
| 8 | `readH2()` | `h2-read-all` | **8 sheet H2_*** | nền |

**4 nút thắt cổ chai (S71 không chạm tới):**

1. **Fan-out 8 request → 1 host.** Trình duyệt giới hạn ~6 kết nối đồng thời/host → request 7–8 xếp hàng. Mạng nội bộ bị bóp băng thông → độ trễ **xếp chồng**.
2. **GAS Web App "Execute as Me" tuần tự hoá** request cùng user → tổng wall-time ≈ **TỔNG** các read, không phải max. → "load quá nhiều API 1 lúc" đúng là nguyên nhân.
3. **Mỗi read mở lại spreadsheet nguội.** Mọi handler tự gọi `SpreadsheetApp.openById()` + `getDataRange().getDisplayValues()`. **Không có `CacheService` ở bất kỳ đâu.** Riêng `h2ReadAll()` mở spreadsheet **8 lần** trong 1 request (`_h2Sheet` gọi `openById` mỗi sheet).
4. **`h2-read-all` — request nặng nhất — bắn ngay khởi động** dù view H2 đang ngủ. Đây là lý do "H2 triển khai thì phát sinh vấn đề".

**S71 = chữa triệu chứng**: nới 90s chỉ khiến user chờ overlay chặn lâu hơn; 8 read xếp chồng vượt 90s vẫn fail. `autoConnectDB` **await** read Task trước render → 1 read chậm là app trông như chết.

---

## 2. Nguyên tắc thiết kế

- **Connection-first**: UI render tức thì từ cache; mạng chạy nền; không read nào được chặn màn.
- **Ít request nhất**: gộp nhiều sheet vào **1 round-trip** thay vì N request.
- **Mở spreadsheet 1 lần/ request**: chia sẻ `SpreadsheetApp` handle.
- **Chỉ tải khi cần**: domain ngủ (H2) không tải lúc khởi động.
- **Cache có kiểm soát**: read ấm dưới 1s; invalidate ngay khi có write.
- **Backward-compat**: giữ endpoint lẻ để refresh mục tiêu; batch chỉ thêm, không phá.

---

## 3. PHASE 1 — Frontend (KHÔNG cần deploy GAS) — ✅ ĐÃ TRIỂN KHAI 2026-08-13

> Làm trước, an toàn, phục vụ trực tiếp "ưu tiên #1 giữ kết nối". Đây là hàng rào chống "đứng hình" độc lập với backend.
>
> **Trạng thái**: code xong, `node --check` 6 file OK, full suite **32/32** + `verify_startup_nonblocking` **6/6**. v6.43, `?v=20260813`. **CHƯA push, CHƯA deploy** (Phase 1 thuần FE, không cần deploy GAS). Fan-out khởi động **8 → tối đa 2 concurrent**; H2 lazy; overlay hết chặn.

### 1.1 Cache-first — bỏ chặn UI ở khởi động
- **`app.js` `startApp()`**: đã `loadCache()` + `renderAll()` + `navigateTo('my-work')` TRƯỚC khi gọi mạng → giữ nguyên (app đã hiện cache).
- **`autoConnectDB()`**: **không `await` chặn**. Đổi thành: render cache xong, chạy `readFromHandle()` **nền**; khi xong → cập nhật connection-dot + `renderAll()`. Lỗi/timeout → giữ trạng thái "Ngoại tuyến (cache)" + nút Sync (đã có `_showStartupRetry`), **không toast đỏ hoảng loạn**.
- **`window.onload`**: bỏ `await startApp()` chặn — startup không được để lỗi mạng ném ra màn trắng (đã có try/catch, nhưng giờ mạng nằm trong nền nên onload trả nhanh).
- **Kết quả**: user thấy dữ liệu cache **ngay lập tức**, thanh trạng thái báo "đang đồng bộ…"; kết nối chậm không còn khóa màn.

### 1.2 Lazy-load H2 (gỡ request nặng nhất khỏi startup)
- **`app.js` `startApp()`**: **bỏ** `readH2()` khỏi chuỗi khởi động.
- **`navigation.js`** (dòng 95–97, nơi dispatch `renderH2Dashboard/Tracker/Review`): trước khi render, nếu `!_h2Loaded` → `await readH2()` (có spinner cục bộ trong view H2), set cờ `_h2Loaded = true`.
- **`h2-core.js`**: thêm cờ module `_h2Loaded`; `loadH2FromCache()` vẫn chạy ở startup để nếu user mở H2 có cache hiện ngay, rồi refresh nền.
- **Kết quả**: phiên không mở H2 → **0 request H2**; giảm hẳn 1 (request nặng nhất) khỏi cơn bão.

### 1.3 Stagger reads — pool giới hạn đồng thời
- Thêm helper `_runPool(tasks, size)` (concurrency = 2) trong `app.js`; đưa 5–6 read nền (initiatives/cases/issues/dev/users/notif) qua pool thay vì bắn cùng lúc.
- Giảm tail-latency & xác suất abort do xếp hàng ở trình duyệt + GAS.
- *(Phase 2 sẽ thay hẳn pool này bằng 1 batch-read; pool là cầu nối an toàn khi chưa deploy.)*

### 1.4 Giãn poll notification
- `setInterval(readNotifications, 5')` → **15'**; chỉ chạy khi `document.visibilityState === 'visible'`.
- Giảm request nền định kỳ đè lên các thao tác tương tác.

### Files Phase 1
`assets/js/app.js` (startApp, autoConnectDB, pool, poll), `assets/js/ui/navigation.js` (lazy H2 hook), `assets/js/h2-core.js` (cờ `_h2Loaded`), `assets/js/config.js` (bump version), `index.html` (cache-bust).

### Test Phase 1
- Cache-first: DevTools **Slow 3G/Offline** khi reload → dữ liệu cache hiện **ngay**, không màn trắng, không chặn; bật mạng → tự sync, dot xanh.
- Lazy H2: Network tab — **không** có `h2-read-all` cho tới khi mở menu Quản trị H2.
- Pool: đếm request đồng thời ≤ 2.
- Regression: full suite (baseline 31/32); thêm `verify_startup_nonblocking.mjs` (mock gasPost chậm → assert renderAll chạy trước khi read resolve; assert readH2 không gọi ở startup).

### Rủi ro Phase 1: 🟢 THẤP — thuần FE, additive; luồng optimistic CRUD không đổi.

---

## 4. PHASE 2 — Backend `batch-read` gộp (cần deploy GAS)

> Cú fix cấu trúc: gộp 7–8 request → **1**, mở spreadsheet **1 lần**. Thắng lớn nhất về latency mạng nội bộ.

### 2.1 Endpoint mới `batch-read`
**Contract:**
```
POST { action: 'batch-read', domains?: ['tasks','cases','issues','dev','initiatives','users','notifs','h2'] }
 → { status:'ok', serverTs, data: {
       tasks:      { values:[[...]] },
       cases:      { values:[[...]] },
       issues:     { values:[[...]] },
       dev:        { values:[[...]] },
       initiatives:{ values:[[...]] },
       users:      { header:[...], rows:[[...]] },
       notifs:     [ ... ],           // per-user, cần tokenData.u
       h2:         { ...8 nhóm... }   // CHỈ khi 'h2' có trong domains
   } }
```
- `domains` mặc định = tất cả trừ `h2` (H2 vẫn lazy — client thêm `'h2'` khi mở view H2, hoặc dùng `h2-read-all` cũ).
- **Mở spreadsheet 1 lần**: `var ss = SpreadsheetApp.openById(SPREADSHEET_ID)` rồi truyền `ss` vào từng reader.

### 2.2 Refactor readers nhận `ss` (tùy chọn nhưng nên)
- `sheetRead(ss)`, `caseRead(ss)`, `issueRead(ss)`, `devRead(ss)`, `initiativeRead(ss)`, `userList(ss)`, `notifRead(u, ss)` — nếu `ss` không truyền thì tự `openById` (giữ backward-compat cho endpoint lẻ).
- **`h2ReadAll(ss)` / `_h2Sheet(ss, name)`**: nhận `ss` → mở spreadsheet **1 lần** cho cả 8 sheet H2 (hiện là 8 lần).

### 2.3 Client `readAll()`
- Hàm mới `readAll(domains)` trong `api.js`: 1 `gasPost({action:'batch-read', domains})` rồi phân phối vào `_parseArrayIntoDb`, `_parseCaseArray`, `dbIssues`, `dbDev`, `db.initiatives`, `_appUsers`, `dbNotifs`.
- `startApp()`: thay chuỗi 6–7 read nền bằng **1** `readAll()` (bỏ pool Phase 1).
- `syncDB()`: cũng gọi `readAll()` thay `Promise.all([...6 read...])`.
- Giữ `readFromHandle/readCases/...` lẻ cho refresh mục tiêu (sau CRUD từng entity).

### 2.4 Deploy GAS
1. Cập nhật `Code.gs` (+route `batch-read`), các `*Service.gs` (reader nhận `ss`), `H2Service.gs`.
2. Apps Script editor → paste → **Deploy → Manage deployments → New version** (URL không đổi).
3. Ghi version vào PROJECT_STATE.

### Test Phase 2
- Network: startup chỉ còn **1** request `batch-read` (+ H2 khi mở view).
- So sánh thời gian: batch-read vs tổng 7 read lẻ (kỳ vọng giảm mạnh trên mạng nội bộ).
- `verify_batch_read.mjs` (mock response gộp → assert mọi db được nạp đúng); regression full suite.

### Rủi ro Phase 2: 🟡 TRUNG BÌNH — đổi contract đọc + cần deploy. Giảm thiểu: giữ endpoint lẻ (rollback = client gọi lại read lẻ, không cần revert GAS); response gộp lớn — kiểm tra kích thước (ContentService trả tới ~50MB, dư sức).

---

## 5. PHASE 3 — Cache + trim payload (cần deploy GAS)

> Sau khi đã gộp request, làm read **ấm** dưới 1s và chặn phình data dài hạn.

### 3.1 `CacheService` phía GAS
- Bọc mỗi reader: `CacheService.getScriptCache().get(key)`; key = `sheet + '|' + version`. Miss → đọc sheet, `put(key, json, 60)` (TTL 60s).
- **Invalidation theo version**: 1 script property `DATA_VER` (hoặc per-domain `TS`). Mọi write bump `DATA_VER` → key đổi → batch-read kế tiếp bỏ cache cũ. (Đã có sẵn pattern `_getTaskTs/_setTaskTs` — mở rộng thành generic.)
- **⚠️ Cap 100KB/key**: Task_Master hàng trăm dòng × 24 cột có thể vượt. Chiến lược: (a) nén (JSON→gzip base64 qua `Utilities`), hoặc (b) chunk theo N dòng/key + key index, hoặc (c) chỉ cache các sheet nhỏ (users/config/initiatives/dev/notifs), sheet lớn (tasks/cases) dựa vào batch+single-open là đủ. → Chốt sau khi đo kích thước thật.

### 3.2 Trim payload
- Cân nhắc trả `getValues()` thay `getDisplayValues()` nếu client tự format (đã có `toISODate/fmtDate` chuẩn hoá) — nhẹ hơn, tránh format string tốn kém. **Lưu ý**: hiện reader dùng `getDisplayValues` cho ngày; đổi phải kiểm date round-trip kỹ (S67 canonical ISO). Đánh giá riêng.

### 3.3 Archival (dài hạn khi data còn phình)
- Sheet `Task_Archive` cho task Done/cũ > kỳ; read nóng chỉ quét Task_Master hiện hành. Migration `dryRun/commit` như các migration khác. Giảm tuyến tính chi phí `getValues`.

### Rủi ro Phase 3: 🟡 — cache sai/stale nếu invalidation lỏng; giảm thiểu bằng version-key + TTL ngắn. Archival = migration có backup.

---

## 6. Thứ tự triển khai & rollback

```
Phase 1 (FE, ngay)  → smoke mạng nội bộ → nếu đủ mượt, Phase 2 vẫn nên làm (fix gốc)
Phase 2 (batch-read + deploy) → smoke: 1 request startup
Phase 3 (cache + đo kích thước → chọn chiến lược chunk; archival khi cần)
```
- **Rollback Phase 1**: revert commit FE.
- **Rollback Phase 2**: client quay lại read lẻ (không cần revert GAS vì endpoint lẻ còn nguyên).
- **Rollback Phase 3**: tắt nhánh cache (đọc thẳng sheet); archival giữ backup.

## 7. Chỉ số cần đo (để chốt số & chiến lược cache)
- Kích thước response mỗi read (KB) — quyết định chunk cache.
- Thời gian `exec` từng action trên **mạng nội bộ** (F12 Network) — trước/sau mỗi phase.
- Số dòng thật mỗi sheet (Task_Master, Case_Pipeline, 8 sheet H2) — quyết định archival.

## 8. Câu hỏi mở (không chặn Phase 1)
- Số dòng hiện tại mỗi sheet? (ước lượng để size cache/archival)
- H2 có cần auto-refresh nền định kỳ khi đang mở view không, hay chỉ tải 1 lần + nút Sync?
- `ai-chat` (đang 30s) có nằm trong phạm vi tuning đợt này không (LLM dài, TD-NET-01)?
