# TECHNICAL DEBT — SHTD Dashboard v6.2

## Debt Rating Scale
- 🔴 **CRITICAL** — blocks scaling, high risk of breakage
- 🟡 **HIGH** — significant pain in daily development
- 🟢 **MEDIUM** — noticeable friction, addressable in refactoring
- ⚪ **LOW** — minor, cosmetic, nice-to-have

---

## 🆕 DELTA — Session 70 (2026-08-12) — Seed KPI pilot H2 + Task↔Milestone linking picker

### ✅ TD-H2-02 RESOLVED: `backend/H2SeedPilot.gs` đã tạo (S70.1)
Empty-state H2 dashboard nhắc "chạy seed pilot" nay có file thật: `h2SeedDryRun`/`h2SeedCommit`/`h2SeedClearPilot`, idempotent ID cố định, chạy trong Apps Script editor. Nợ B7 seed đóng.

### TD-H2-04: `TaskRef` lưu nhiều task = chuỗi CSV, KHÔNG có FK/tự dọn 🟢 MEDIUM
S70.2 gộp nhiều task ID vào cột `TaskRef` (phẩy) để không đổi schema H2_Milestones. **Hệ quả**: (a) nếu task bị **xoá** khỏi Task_Master, chip trên mốc **vẫn hiện id** (renderer chỉ mất phần tên, không tự loại). (b) không join chuẩn — không truy vấn ngược "task này thuộc mốc nào". Giảm thiểu: `_h2MsRow` đã tra `db.tasks` để hiện tên (id lạ → chỉ hiện id, click no-op). → Nếu cần sạch: lọc chip theo task còn tồn tại, hoặc tách bảng liên kết H2_TaskLink (đổi schema — cân nhắc sau).

### TD-H2-05: Scope task trong popup = heuristic khớp username ∪ display name 🟢 MEDIUM
`_h2OwnerMatchSet` (h2-tracker.js) gom username + tên hiển thị của chủ mốc (qua `getCurrentUser` + `_appUsers`) rồi so với `picRes/picAcc`. Cần vì cột PIC lưu **2 namespace lẫn lộn** (username hoặc display name). **Rủi ro biên**: nếu 1 task gán PIC bằng **alias KHÔNG nằm trong User_Master** (viết tắt lạ, sai chính tả) thì vẫn trượt → popup thiếu task đó. Cũng phụ thuộc `_appUsers` đã load cho ca lead-link-hộ-member (ca tự-link thì `getCurrentUser` phủ sẵn). → Fix gốc: chuẩn hoá PIC về canonical username ở mọi writer (mở rộng `_resolvePickerCase`), hoặc thêm cột PIC-username riêng.

### TD-DEPLOY-01: Gốc bug "GAS lỗi khi lưu milestone" (lead) chưa xác nhận 100% ⚪ LOW
User test **Teamlead** vẫn fail lưu task-link cũ. Đường ghi milestone-upsert đúng logic cho lead → **giả thuyết mạnh nhất = route H2 chưa lên deployment cá nhân** (H2 backend commit 08-11 SAU revert S67 08-10) → `action không hợp lệ`. Chưa lấy được text lỗi chính xác để chốt. CR đã né bằng action riêng + redeploy → khép dù nguyên nhân gì. Nếu tái diễn ở route H2 khác: kiểm deployment cá nhân có đủ code H2Service/Code.gs mới.

### TD-TEST-06: `verify_bld_queue.mjs` gia nhập nhóm flaky-under-batch 🟢 MEDIUM
S70: `run_tests.mjs` fail `verify_bld_queue` **2 lần**, chạy riêng **20/20 + 0 JS error** cả 2 lần. Suite **nặng nhất** (~50–62s) → áp lực timing batch tràn. Cùng bản chất my_work/issue_tracker/i18n_p7 (fixed `waitForTimeout` + Chromium mới). Nhóm flaky batch hiện tại = **my_work, issue_tracker, bld_queue, i18n_p7**. → Đừng quy fail này cho feature vừa đổi trừ khi đụng `bld-queue.js`. Fix gốc: `waitForSelector`/`expect.poll`.

---

## 🆕 DELTA — Session 69 (2026-08-12) — Fix login hang/lock-out khi mạng chậm/bị chặn

### TD-NET-01: Timeout GAS cứng 30s ở tầng client, KHÔNG có auto-retry ngầm 🟢 MEDIUM
S69 thêm `_fetchWithTimeout` (AbortController `GAS_TIMEOUT_MS=30000`) cho **`gasPost` + `doLogin`**. Lợi: hết spin vô hạn. **Đánh đổi**: nếu GAS thật chậm >30s (cold-start nặng / Sheet lớn) request sẽ **abort** thay vì chờ → user phải bấm **Sync** (retry thủ công). Chưa có exponential-backoff auto-retry ở tầng chung (AI-chat có retry riêng từ S60, không đụng). Nếu PRD thấy 30s vẫn hay timeout oan → nâng hằng số hoặc thêm 1 lần retry ngầm trước khi hiện banner. Giá trị nằm ở `auth.js` (1 chỗ).

### TD-NET-02: `_authStartupGrace` là cờ theo cửa sổ thời gian (không phải theo-request) 🟢 MEDIUM
Trong `startApp`, cờ bật rồi `setTimeout` gỡ sau `GAS_TIMEOUT_MS+5s` (~35s). Mục đích: ~7 read nền startup có blip `AUTH_REQUIRED` **không** xóa phiên vừa login. **Rủi ro biên**: nếu phiên **thật sự hết hạn** đúng trong 35s đầu sau khi mở app, `AUTH_REQUIRED` bị nuốt (không logout) tới khi hết grace hoặc lần gọi interactive kế tiếp — chấp nhận được (token 24h, hiếm hết hạn ngay lúc mở). Nếu cần chặt hơn: đổi sang cờ **per-request** (đánh dấu chỉ các read startup) thay vì theo thời gian.

### TD-AUTH-01: Placeholder `.user-pill` hardcode "Quản trị viên" gây hiểu nhầm ⚪ LOW
`index.html` (~dòng 236) mặc định hiện avatar "AD" + "Quản trị viên" + "TT SP&GPTD" **trước khi** `applyUserToUI` chạy. Khi startup lỗi/chưa xác thực, user thấy **giống đã login admin** dù chưa (chính là "role hiển thị quản trị viên" trong bug report S69). Không vỡ chức năng. → Blank/ẩn placeholder tới khi `applyUserToUI` set user thật. S69 **cố ý chưa sửa** (tránh đụng markup mà test đang assert). Xem PRIORITY 2 (TODO).

### TD-TEST-05: Không có suite tự động cho auth/startup-resilience ⚪ LOW
Fix S69 (timeout/grace/fail-graceful) **không có test tự động** — `verify_*` mock/abort network chỉ kiểm render từ cache, không mô phỏng "fetch treo rồi timeout" hay "AUTH_REQUIRED nền lúc startup". `debug_login.mjs` chạy với GAS thật (không CI). Verify bằng smoke tay (DevTools Offline). → Cân nhắc suite Playwright chặn route với `delay`/`abort` để assert: timeout→`_showStartupRetry`, grace giữ phiên, Sync khôi phục "connected".

---

## 🆕 DELTA — Session 68 (2026-08-11) — Hoàn tất Track B Quản trị H2 (Dashboard + Tự đánh giá) + hướng dẫn

### TD-H2-01: Test H2 view = smoke với mock, KHÔNG chạy GAS thật 🟢 MEDIUM
`verify_h2_dashboard` (24/24) + `verify_h2_review` (20/20) + tracker/core dùng chung harness: stub `window.readH2`, nạp `dbH2` mock, **abort `script.google.com`**. Kiểm được render/RBAC/compute/modal/empty nhưng **KHÔNG** kiểm đường ghi backend thật (`_gasH2Upsert`/`h2-review-upsert`, ownership gate GAS, reassign ID). Riêng H2R7 (save review) còn **stub `window._gasH2Upsert`** để test append cục bộ. → Backend H2 (Concurrency/ownership) chưa có test tự động (GAS không chạy dưới node — xem TD-TEST-04). Giảm thiểu: verify khi user thao tác thật trên PRD; cân nhắc port spec ownership như `verify_id_reassign`.

### TD-H2-02: `H2SeedPilot.gs` được tham chiếu nhưng CHƯA tồn tại (dead reference) ⚪ LOW
Empty-state của `h2-dashboard.js` gợi ý *"chạy seed pilot (H2SeedPilot.gs)"* nhưng file này **chưa được tạo** (B7 seed Quang/Dung còn nợ). Không vỡ (chỉ là text hướng dẫn) nhưng gây nhầm khi user đi tìm. → Tạo `backend/H2SeedPilot.gs` (B7) hoặc bỏ nhắc tên file trong empty-state.

### TD-H2-03: Track B còn nợ B6 notif-hook + docs 06/07 ⚪ LOW
Hoàn tất B1–B3 (backend+tracker) + B4 review + B5 dashboard + B8 report. **Còn nợ**: (a) **B6** — hook Notifications cho KPI/milestone (RAG đỏ / mốc quá hạn chưa bắn chuông+email như 5 entity kia); (b) docs `06_DASHBOARD_SPEC`/`07_DATA_MODEL` được nhắc trong framework nhưng chưa có; (c) B7 seed (xem TD-H2-02). Không block — module đã dùng được đầy đủ CRUD + xem + báo cáo.

### TD-DOC-02: ~70 PNG suite khác còn dirty trong working tree ⚪ LOW
Từ đầu phiên (leftover phiên trước đóng bất thường) ~70 ảnh `test-results/*` của các suite KHÔNG-H2 (action-plan/cp_s36/dev_plan/history/my_work…) hiện `modified` do test tự sinh lại. S68 **cố ý không commit** (noise, không phải thay đổi logic). Muốn tree sạch: `git restore test-results/` (an toàn — ảnh tự sinh) hoặc commit gộp 1 lần "chore: refresh test evidence".

### Ghi chú S68 — nợ có kiểm soát
- **Ảnh hướng dẫn `docs/img/h2/*.png`** chụp bằng `capture_h2_guide.mjs` với **dữ liệu mock pilot** (Quang/Dung) — không phải data thật. Khi UI H2 đổi phải **chạy lại script** để ảnh khớp; nếu không sẽ lệch giao diện thật. Script ngoài `run_tests.mjs` (không chạy trong CI).
- **`_gasH2Upsert('review')`** ở `h2-review.js` là optimistic (persist+render trước, await ghi nền sau) như 5 entity kia — lỗi ghi chỉ báo toast, dữ liệu giữ cục bộ. RBAC client (`_h2rCanEdit`) chỉ là lớp UX; **gate thật ở GAS** (`H2_Reviews` owner=Member).
- **Version bump 6.38→6.39 + cache-bust b→c (65 refs)**: mọi asset H2 phục vụ `?v=20260811c`. Lần deploy H2 tiếp theo phải bump tiếp (đụng i18n/nav/core dùng chung toàn app).

---

## 🆕 DELTA — Session 67 (2026-08-10) — Revert GAS cá nhân + đồng nhất logic ngày tháng ISO

### TD-DATE-01: `toISODate` nằm trên MỌI read/write/display path ngày 🟢 MEDIUM
S67 gom toàn bộ xử lý ngày về **1 hàm** `toISODate()` (helpers.js) + `fmtDate`. Lợi: hết phân mảnh (trước mỗi entity 1 parser, `parseDate` của Task còn không nhận `DD-MMM-YY`). **Rủi ro tập trung**: bug trong `toISODate` ảnh hưởng **toàn bộ** field ngày (task/case/init/dev/issue, cả read lẫn write). Giảm thiểu bằng `verify_date_unify.mjs` **28/28** (Date obj, Excel serial, ISO, DD-MMM-YY, `DD-thg M-YY`, DD/MM/YYYY, round-trip, junk→''). Sửa `toISODate` phải chạy suite này.

### TD-DATE-02: Chống tái diễn locale = thao tác tay (migration bỏ setNumberFormat) ⚪ LOW
`DateNormalizeMigration.gs` (S67) chỉ `setValues(ISO)` — **bỏ hẳn `setNumberFormat('@')`** vì cột ngày có "kiểu cột" (Google Sheets Tables/imported) chặn → lỗi "không thể đặt định dạng số của cột đã nhập" abort commit. Hệ quả: cột kiểu ngày sẽ **lưu ISO thành Date cell** (Sheets tự parse) — FE `toISODate` đọc Date object vẫn đúng nên **không sai**, nhưng Sheet không giữ ISO-as-text. Muốn khoá text chống Sheets re-localise Jul→"thg 7" phải **set Plain-text tay** (Format → Number → Plain text) nếu column type cho phép. Không block.

### TD-DATE-03: Ô ngày "unparseable" được giữ nguyên (không mất, nhưng lệch canonical) ⚪ LOW
Migration: ô có nội dung nhưng `_dnToISO` trả '' → **giữ raw** (không ghi đè, đếm `unparseable`). Trên FE, `fmtDate` của các ô đó hiện `–`. Nếu Logger commit báo `unparseable > 0` → có định dạng ngày lạ chưa phủ; cần lấy mẫu, mở rộng regex `toISODate` (FE) **và** `_dnToISO` (GAS) song song rồi chạy lại migration.

### Ghi chú S67 — nợ có kiểm soát
- **Backend revert về cá nhân** (bỏ S59 cơ quan): giá trị cơ quan (`AKfycbw1…DSg`/`1t4tkaw4…Zq4g`) **retired** nhưng vẫn nằm rải rác trong doc S59/S66 — khi đọc handover cũ phải nhớ hướng đó đã bỏ. Sheet cơ quan còn giữ để merge data 04-08→10-08.
- **`fmtDateExport` giờ = `toISODate`** (đổi ngữ nghĩa: trước ra `DD-MMM-YY`, nay ra ISO). Tên giữ nguyên để không phải sửa call-site `*ToRow`. Report Excel human cells chuyển sang `fmtDate` (DD/MM/YYYY) cho dễ đọc.
- **Dev `lastReview` KHÔNG normalize** (là timestamp date+time). Nếu sau này thêm date-picker cho lastReview thì mới đưa vào `toISODate`.
- **TD-TEST-02/H13 ĐÃ ĐÓNG**: `verify_history` H13 trước kỳ vọng initiative start = `DD-MMM-YY` (stale từ S56) → S67 sửa thành ISO hôm nay (field là `<input type=date>`). History 47/47.
- **`my_work` MW6 flaky (TD-TEST-01) còn đó**: fail cả batch lẫn chạy riêng, KHÔNG liên quan ngày (QLDM initiative section timing) — xác nhận fail TRƯỚC mọi thay đổi S67.

---

## 🆕 DELTA — Session 66 (2026-08-07) — Initiative Category đồng nhất + ES health nâng cấp

### TD-006 (nối): Category list vẫn code-defined, chưa data/admin-managed 🟢 MEDIUM
S66 **cải thiện một phần** TD-006: gộp category Initiative rải rác (modal hardcode 6 option + filter data-driven) về **1 nguồn** `INIT_CATEGORIES` + `_initCategories()` (dùng chung modal Thêm + filter Initiative + filter ES) → thêm/sửa mảng chỉ 1 chỗ. **Nợ còn lại**: list vẫn nằm trong code (`initiative-tracker.js`), thêm mảng mới phải sửa JS + cache-bust; chưa có màn admin quản lý. `_initCategories()` có union với category lạ trong data để không mồ côi. Không block.

### TD-ES-01: ES "Sức khỏe từng Initiative" join theo `t.initiative === ini.id` ⚪ LOW
`_esRenderInitTable` (S66) lấy Tên + Phụ trách + Category bằng cách tìm `db.initiatives` theo key = `task.initiative`. Task trỏ tới initiative **không tồn tại** trong `db.initiatives` (vd 'BAU', hoặc initiative đã xóa) → cột Tên hiện raw key, Phụ trách/Category rỗng ("—"), **không mở popup** (không có onclick). **Đúng ý đồ** (chỉ initiative thực mới có chi tiết); ghi lại để biết khi debug "sao dòng này không click được".

### Ghi chú S66 — nợ có kiểm soát
- **`_esInitCatFilter` + `_esInitSummaryCache`** = thêm module-global state cho Executive Summary (nối dài TD-004). `esFilterInitCat` re-render bảng từ cache (không tính lại toàn ES) — chấp nhận.
- **ES table `onclick="openInitViewPopup('${esc(k)}')`** dùng single-quote inline như phần còn lại của app (SEC-01) — initiative ID do genId/user nhập, format-controlled; rủi ro thấp. Nếu siết SEC-01 toàn cục thì gộp luôn chỗ này.
- `verify_es_init_health.mjs` (NEW, 14/14) phụ thuộc **số cột = 8** và text "Phụ trách" — đổi layout bảng ES phải cập nhật test.

---

## 🆕 DELTA — Session 65 (2026-08-07) — Guard chống ghi đè khi tạo trùng đồng thời

### TD-CONC-01: Bulk write-all + atomic delete CHƯA nằm dưới write lock ⚪ LOW
S65 thêm `LockService.getScriptLock()` + `reassignIdIfExists()` cho **5 handler `*-upsert`** (create atomic) → hết ghi đè khi 2 người cùng tạo. **Ngoài phạm vi (còn nợ)**: (a) các route ghi-tất-cả `write`/`case-pipeline-write`/`initiative-write`/`kpi-write` + import Excel **không** lấy lock → 2 full-write đồng thời vẫn last-write-wins (hiếm: admin/bulk); (b) các `*-delete` không lock (2 create đồng thời đã được lock tuần tự hoá nên đủ cho bug đã báo). Gộp với TD-013/TD-025/TD-027 (last-write-wins). Không block.

### TD-TEST-04: `verify_id_reassign.mjs` là BẢN PORT thuật toán GAS ⚪ LOW
GAS không chạy được dưới node → `verify_id_reassign.mjs` (17/17) **sao chép** logic `reassignIdIfExists` (backend/Concurrency.gs) thành hàm `nextFreeId` để test spec. **Rủi ro drift**: sửa `Concurrency.gs` mà quên cập nhật test → test vẫn xanh nhưng lệch thực tế. Đã ghi cảnh báo ở đầu 2 file. Dài hạn: tách core thành file dùng chung được cả 2 (khó vì GAS/ESM khác nhau) — chấp nhận drift-with-warning.

### Ghi chú S65 — nợ có kiểm soát
- **Reassign chỉ khi `isNew`** (create thuần): edit/rename gửi `isNew:false` → **không** auto đổi mã (tôn trọng mã user chọn, đã qua dup-check local). Rename tới mã người khác vừa tạo vẫn có thể đè — edge hiếm, giữ hành vi cũ.
- **Client cũ (chưa hard-reload)** không gửi `isNew` → server coi như edit (không reassign) → **backward-compatible**, không vỡ; chỉ mất guard tới khi user reload nhận v6.33.

---

## 🆕 DELTA — Session 64 (2026-08-06) — Initiative filter Accountable + xóa Milestone

### TD-INIT-02: Xóa initiative/milestone dùng `writeInitiatives()` (ghi TẤT CẢ dòng), chưa atomic ⚪ LOW
`_initDeleteMilestone` (S64) + `_initDelete` (S63) đều xóa local rồi gọi `writeInitiatives()` chạy nền (ghi lại toàn bộ Initiative_Master) thay vì atomic 1-dòng — vì **chưa có route `_gasInitiativeDelete`**. Chấp nhận: đã non-blocking + `.catch`. Nếu Initiative_Master lớn hoặc nhiều thao tác xóa đồng thời → cân nhắc thêm route atomic delete (giống `_gasTaskDelete`). Không block.

### Ghi chú S64 — nợ có kiểm soát
- **Xóa Milestone gỡ link task (không xóa task)**: task mất `task.milestone` (không còn trỏ ID đã mất) nhưng **giữ `task.initiative`** → task trở thành "loose" (không milestone) trong initiative. **Đúng yêu cầu user** ("xóa khi thao tác sai", giữ task). Ghi GAS mỗi task đổi qua `_gasTaskUpsert` nền — nếu 1 milestone có rất nhiều task, sẽ bắn N request atomic song song (chấp nhận; giống pattern `_initFixLooseLink`).
- **Filter Accountable + Category giờ re-render cả stat bar**: `_initSetFilter` bọc `#initStatBar` để đồng bộ ô số. Nếu sau này thêm filter mới → nhớ nó cũng đi qua `_initSetFilter` (không tự thêm select rời). Restore selects đã đổi từ index → **id** (`initSelCat/initSelAcc/initSelStatus`) → thêm/bớt select không vỡ. Test `verify_i18n_p6` IP6-5/6 phụ thuộc **thứ tự** select trong `.toolbar-right` (cat, acc, status) — nếu đổi thứ tự phải cập nhật index test.

---

## 🆕 DELTA — Session 63 (2026-08-06) — Async/Optimistic CRUD

### TD-INIT-01: `syncInitiativeAction` / `syncInitiativeDelete` là dead code ⚪ LOW
S63 đưa Initiative save/delete về optimistic + atomic (`_gasInitiativeUpsert` / `writeInitiatives().catch`). Hai hàm cũ `syncInitiativeAction` (blocking `showLoading`) + `syncInitiativeDelete` (initiatives.js:155/212) **không còn view nào gọi**. Giữ tạm để tránh rủi ro đụng `index.html`/`onclick`. **Action**: grep xác nhận 0 tham chiếu → xoá cả 2 hàm. Không block.

### Ghi chú S63 — nợ có kiểm soát
- **Bỏ toast success toàn CRUD**: feedback thành công giờ = UI cập nhật tức thì + `syncDot` xanh. Đánh đổi: user quen "toast xác nhận" có thể hụt hẫng lúc đầu. **Đúng yêu cầu user** ("chỉ báo khi lưu không thành công"). Nếu cần hoàn tác → thêm lại toast ở tầng view (không ở `_gas*`).
- **Rename Initiative (origId≠newId)** vẫn để **orphan dòng cũ** trong Sheet tới lần `writeInitiatives()` đủ (atomic chỉ upsert dòng mới). Pre-existing từ trước S63, **không** phát sinh do session này; S63 giữ nguyên semantics. Nếu cần sạch ngay → thêm `_gasInitiativeDelete(origId)` atomic khi rename.
- **`_initDelete` dùng `writeInitiatives()` (ghi TẤT CẢ dòng) chạy nền** thay vì atomic 1-dòng (chưa có `_gasInitiativeDelete`). Chấp nhận: đã non-blocking + `.catch`. Nếu Initiative_Master lớn → cân nhắc route atomic delete.

---

## 🆕 DELTA — Session 62 (2026-08-05) — Tuần báo cáo đa-tuần

### TD-RW-01: Membership union chưa hỗ trợ "bớt" tuần auto ⚪ LOW
`taskReportWeeks = auto ∪ pinned`. User thêm tuần tay được, **không xoá** được 1 tuần auto (auto tính lại mỗi lần đọc). Chấp nhận để đạt "0 nhập liệu" cho đa số. Nếu cần → thêm cột `Tuần loại trừ` (exclude) + trừ khỏi membership. Ghi trong REPORT_WEEK_DESIGN.md.

### TD-RW-02: Ngữ nghĩa "Tuần này" đổi (không phải nợ, cần biết) 🟢 MEDIUM
Overdue-extension (task chưa xong kéo tới tuần hiện tại) làm preset/filter "Tuần này" ≈ **mọi task đang mở đã bắt đầu** — không còn "chỉ task gắn tag tuần này". **Đúng yêu cầu user** nhưng khác hành vi cũ; lưu ý khi đọc báo cáo/train user. `verify_preset` T3b/T5b đã cập nhật 3→7 theo ngữ nghĩa mới.

### TD-RW-03: `taskReportWeeks` gọi nhiều lần, chưa memoize ⚪ LOW
Hàm gốc parse ngày + tính ISO range mỗi lần gọi (filter/dashboard/report… × mỗi task × mỗi render). Vài nghìn task vẫn ms-level, nhưng nếu scale lớn → memoize theo (startDate,endDate,state,tuanBC). Chưa cần.

### TD-RW-04: Case Pipeline vẫn free-text tuần ⚪ LOW
`cpfTuanBC` chưa nâng cấp (S62 chỉ Task, theo chốt user). Đợt sau áp cùng cơ chế + migration Case_Pipeline.

### Ghi chú test S62
`verify_report_week.mjs` (NEW, 17/17, port 3046) trong batch. `verify_preset.mjs` **KHÔNG** nằm trong `run_tests.mjs` (standalone, cần server ngoài :3030) — đã fix ISO + membership nhưng chỉ chạy tay. Cân nhắc thêm vào runner (đổi self-serve port) sau.

---

## 🆕 DELTA — Session 60 (2026-08-05)

### TD-TEST-03 (mới): AI Assistant chưa có test tự động ⚪ LOW
**Issue**: `views/ai-chat.js` (`_aiRenderMarkdown()` — renderer GFM + XSS guard) và `backend/AiService.gs` (`_aiTaskIndex_`/`_aiTaskSummary_`/`_aiResolveTaskCols_`) **không nằm trong `run_tests.mjs`**. Backend cần Gemini API + GAS live nên khó test headless; frontend renderer thì test được (thuần hàm DOM).
**Impact**: Thấp — logic renderer đơn giản, đã review XSS bằng tay (esc trước, user input escaped). Nhưng thay đổi tương lai không có lưới an toàn.
**Action**: (tùy chọn) thêm `verify_ai_chat.mjs` test riêng `_aiRenderMarkdown()`: bảng GFM → `<table>`, `<script>` trong input → escaped, bullet/bold/code. Không block.

### Ghi chú S60 (AI tuning) — nợ có kiểm soát, không phát sinh nợ nặng
- **`_aiTaskIndex_` không giới hạn số dòng** 🟢 MEDIUM: trước cap 300 (token), giờ index TOÀN BỘ task. Trên `gemini-flash-latest` (~1M ctx) ổn với hàng trăm→vài nghìn task; nếu task tăng rất lớn → prompt phình, doPost chậm + chi phí tăng. **Ngưỡng cần theo dõi**: nếu > ~3–4k task, cân nhắc index phân trang / lọc theo scope trước khi gửi. Hiện chấp nhận.
- **Bỏ Audit_Log khỏi context AI** (v6.27): payload nhẹ → nhanh → ít 404. Đánh đổi: AI không trả lời được câu hỏi về lịch sử audit chi tiết. Nếu cần → thêm lại có chọn lọc (chỉ audit gần đây / theo yêu cầu).
- **Retry scope-AI** (`ai-chat.js`) tách khỏi `gasPost` global **cố ý** — chỉ áp cho read (AI). KHÔNG mở retry cho `gasPost` chung (có ghi → double-write). Giữ nguyên nguyên tắc này.
- **Markdown renderer tự viết** (không lib): an toàn XSS nhờ `esc()` chạy TRƯỚC mọi format; chỉ hỗ trợ subset (bảng/đậm/code/bullet). Nếu Gemini trả markdown phức tạp hơn (heading/nested/link) → render thô (an toàn, không vỡ). Mở rộng khi cần.

---

## 🆕 DELTA — Session 59 (2026-08-04)

### Ghi chú S59 (migrate GAS về tài khoản cơ quan) — không phát sinh nợ code, nhưng có 2 điểm cần theo dõi
- **Trạng thái dual-deployment tạm thời** ⚪ LOW: đang giữ **cả deployment + Sheet cũ (cá nhân) lẫn mới (cơ quan)** để rollback. Rủi ro nếu **cả 2 trigger `notifScan` cùng bật** → email digest gửi 2 lần; và nếu ai đó còn ghi vào Sheet cũ → data phân mảnh. **Action**: sau vài ngày ổn định phải **xóa deployment cũ + gỡ quyền account cá nhân khỏi Sheet cũ** (xem TODO_NEXT P0). Đây là nợ có thời hạn, không để tồn lâu.
- **ANBM caveat — data vẫn trên Google Cloud** 🟢 MEDIUM (nợ kiến trúc, không phải bug): đổi owner sang account cơ quan **không** đưa data ra khỏi hạ tầng Google; chỉ đạt "email từ @tpbank.vn" + kiểm soát bằng Workspace admin (2FA/DLP/retention). Nếu chính sách ANBM về sau siết "dữ liệu nội bộ không đặt trên hạ tầng ngoài" → phải **re-platform** (kịch bản B2: web service + DB nội bộ). Đã ghi rõ với user; hiện chấp nhận.
- **Web App "Anyone, even anonymous"** ⚪ LOW: frontend public (GitHub Pages) gọi Web App ẩn danh — phụ thuộc policy Workspace ngân hàng cho phép. Auth thực sự nằm ở token HMAC (`AUTH_SECRET`) chứ không ở access-control của GAS. Nếu ANBM yêu cầu chặn ẩn danh → phải đưa frontend vào nội bộ/VPN/SSO (đã hỏi user S59, chọn giữ public).

### TD-TEST-01 mở rộng — `verify_import_rbac` cũng flaky batch
S59 batch run: `verify_import_rbac` fail (set role "User" + loạt `ERR_FAILED`) nhưng **15/15 khi chạy riêng**. Cùng bản chất đua batch như `my_work`/`issue_tracker`. Gộp vào TD-TEST-01. Quy tắc giữ nguyên: **batch báo suite này fail → chạy lại riêng để xác nhận trước khi coi là regression.**

---

## 🆕 DELTA — Session 58 (2026-08-03)

### TD-UI-02: Global `table { white-space:nowrap }` (table.css:61) là bẫy ngầm cho bảng mới 🟢 MEDIUM
**Issue**: `assets/css/table.css:61` set `white-space:nowrap` cho **mọi** `<table>`. Bảng mới dùng `table-layout:fixed` (fit-one-screen) sẽ **tràn/đè chữ sang cột kế** nếu không chủ động set `white-space:normal` trên cell free-text (đúng lỗi S58 → S58.1 phải sửa). Ngược lại, cell ngày cần nowrap phải tăng specificity (`.x-table td.x-cell-date`) mới thắng `.x-table td`.
**Impact**: Trung bình — dễ tái phát ở mọi feature bảng tương lai; triệu chứng là "đè chữ" khó đoán nếu không biết nguồn global.
**Action**: Đã ghi vào **`UI_CONCEPT.md` §2** (gotcha + công thức). Dài hạn (v7 CSS modularize): cân nhắc bỏ `white-space:nowrap` khỏi selector `table` chung, chuyển nowrap về từng cột cần. Không xử lý ngay.

### Ghi chú S58 (UI layout) — governance mới, giảm nợ UI
- **NEW `AI_CONTEXT/UI_CONCEPT.md`** = contract layout (fit-one-screen table, stretch-to-fill board, thang width modal, page-container width chuẩn, breakpoint, checklist pre-merge). Mọi feature/bảng/board mới bám checklist §7 → giảm phát sinh nợ UI kiểu tràn ngang / thừa khoảng trống / lệch width.
- **Width chuẩn hoá**: `.mw-page` (My Work) + `.dev-page` (Dev Plan) bỏ wrapper padding/max-width → khớp `.content`. AI Chat `max-width:860px` giữ lại (cố ý). Không còn view lệch width chuẩn tính đến S58.2.
- Textarea auto-grow (`_devAutoGrow` ở dev-plan) là pattern cục bộ; nếu tái dùng nhiều nơi → tách helper chung. Chưa cần.

---

## 🆕 DELTA — Session 57 (2026-08-02)

### TD-TEST-02: `verify_history` H13 — assertion cũ sau khi S56 đổi date input 🟢 MEDIUM
**Issue**: `verify_history.mjs` **H13** kỳ vọng ô "Start Date" của modal Initiative khi Thêm mới = định dạng `DD-MMM-YY` (vd `02-Aug-26`). Nhưng **S56** đã đổi field này sang native date-picker (`<input type="date">`, giá trị ISO `2026-08-02`). → H13 fail cả khi chạy riêng (không phải flaky), là **assertion lỗi thời**, KHÔNG phải regression code.
**Impact**: Trung bình — 1 "false red" trong batch runner, dễ nhầm là regression.
**Action**: Cập nhật H13 kỳ vọng thành ISO hôm nay (`YYYY-MM-DD`) — cùng đợt fix TD-TEST-01. Trước mắt: coi H13 là đã biết, không block.

### Ghi chú S57 (Notification bell) — không phát sinh nợ mới đáng kể
- Real-time created/closed đọc trạng thái trước ghi (`notifPrior_`) = **thêm 1 lần đọc sheet mỗi upsert**. Chấp nhận cho single-row write; nếu sau này tần suất ghi cao → có thể tối ưu.
- `_notifAppendIfNew_` quét cột NotifID mỗi lần (real-time) — O(n) mỗi event; scan hàng loạt đã index sẵn nên không ảnh hưởng. Sheet auto-purge noti đã đọc >30 ngày giữ n nhỏ.
- Bulk Excel import (`write`/`case-pipeline-write`) **cố ý KHÔNG** sinh created/closed (tránh spam). Nếu cần noti cho import → xử lý riêng.
- GAS đã deploy 2026-08-02, trigger `notifScan` ~8h/ngày đã bật; smoke test production OK.

---

## 🆕 DELTA — Session 56 (2026-07-30)

### TD-TEST-01: `verify_my_work` + `verify_issue_tracker` flaky trong batch runner 🟢 MEDIUM
**Issue**: Khi chạy `node run_tests.mjs` (22 suite liên tiếp), `verify_my_work.mjs` và `verify_issue_tracker.mjs` **fail không ổn định** — nhưng **pass khi chạy riêng lẻ** (`verify_issue_tracker` = 61/61; `verify_my_work` fail *khác nhau* mỗi lần: lần MW7–17, lần MW6). Không phải regression code.
**Nguyên nhân**: 2 suite dùng `waitForTimeout()` cố định + ẩn `loginOverlay` + async re-render `readDev()`/`readInitiatives()` (thêm ở S54.1). `issue_tracker` fail kiểu `loginOverlay intercepts pointer events` timeout. Khuếch đại bởi Chromium mới: máy chưa cài browser Playwright; `npx playwright install chromium` kéo **Chrome 148** (playwright v1223), mới hơn nhiều so với thời điểm viết test.
**Impact**: Trung bình — gây "false red" trong CI/batch, dễ hiểu nhầm là regression. Chức năng thực tế OK.
**Action**: Thay `waitForTimeout()` cố định bằng `waitForSelector`/`expect.poll`-style wait trong 2 suite. Trước mắt: khi batch báo 2 suite này fail → **chạy lại riêng lẻ để xác nhận** trước khi coi là regression. (Ngoài ra `verify_my_work` còn có MW22/MW23 fail pre-existing từ thời S44b — progress-bar toggle.)

---

## 🆕 DELTA — Session 55 (2026-07-28)

### TD-UI-01: `.cp-stat-card` dùng chung 2 view (Case Pipeline + Initiative) ⚪ LOW
**Issue**: S55 reuse thẳng class `.cp-stat-card`/`.cp-stat-icon`/`.cp-stat-num`/`.cp-stat-label` (định nghĩa trong `case-pipeline.css`) cho stat bar của Initiative Tracker. Sửa style Case Pipeline sẽ ảnh hưởng Initiative.
**Impact**: Thấp — đây là chủ đích "đồng nhất UI" (design-system component dùng chung). Rủi ro chỉ là coupling ngầm về vị trí file (component nằm ở `case-pipeline.css` thay vì file token/shared).
**Action**: Khi v7 modularize CSS → tách các class stat-card ra file shared (`components.css` hoặc `stat-card.css`) và đổi tên trung tính (vd `.stat-card`). Không cần xử lý ngay.

### TD-DEV-03 (nối TD-004): state module-global cho Initiative ⚪ LOW
**Issue**: `_initShowDone` thêm vào cụm `_initFilter*`/`_initScope` module-level mutable state (giống `_cp*`, `_dev*`).
**Action**: Gộp vào TD-004 (v7 modularization). Không xử lý riêng.

---

## 🆕 DELTA — Session 54 (2026-07-28)

### TD-SEC-01: API key lộ trong `backend/RenameUserService.gs` ✅ RESOLVED 2026-07-28 (còn 1 khuyến nghị)
**Issue**: Working tree của `backend/RenameUserService.gs` bị nối thêm 1 đoạn PowerShell (function `claude-mkp`) chứa `MKP_API_KEY` + proxy nội bộ ở cuối file `.gs` (nội dung rác, không hợp lệ trong GAS).
**Resolution**: Đã xóa đoạn thừa (dòng `$env:MKP_API_BASE...` → hết file); file trở về đúng bản GAS sạch. **Xác minh key CHƯA từng bị commit/push**: `git log --all -S "<key>"` → 0 kết quả; working copy sau khi dọn == bản committed (không có diff). Vậy key chỉ tồn tại ở file cục bộ, KHÔNG lên GitHub.
**Khuyến nghị còn lại (⚪ precaution)**: Vẫn nên **đổi/thu hồi key** phía nhà cung cấp vì đã hiển thị cục bộ (có thể đã dùng trong shell). Không bắt buộc về mặt lộ repo.

### TD-DEV-01: Dev Plan — write fire-and-forget, không optimistic-lock ⚪ LOW
**Issue**: `_gasDevUpsert/_gasDevDelete` là local-first + fire-and-forget (giống Issue Tracker), không read-then-patch / không version conflict như Task_Master.
**Impact**: Thấp — mỗi user chỉ sửa item của mình (ownership gate), xác suất ghi đè đồng thời gần như không. Admin sửa cho người khác thì có rủi ro nhỏ.
**Action**: Chấp nhận cho MVP; nếu cần multi-editor an toàn → thêm serverTs/last-write check.

### TD-DEV-02: State module-global cho Dev Plan (nối dài TD-004) ⚪ LOW
**Issue**: `_devFilterPic/_devFilterState/_devSearch/_devSort/_devEditId/_devViewId` là biến module-level (giống `_it*`, `_cp*`). Tích lũy thêm global mutable state.
**Action**: Gộp vào TD-004 (v7 modularization). Không cần xử lý riêng.

---

## ~~TD-001: Monolithic Single-File Architecture~~ ✅ RESOLVED 2026-06-04

**Resolution**: Phase B complete. `index.html` reduced from 4076 → 736 lines (HTML-only shell).
- 9 CSS files in `assets/css/`
- 17 JS modules in `assets/js/`
- Verified: 25/25 Playwright tests — 0 failures

---

## ~~TD-002: No Real Google Apps Script Backend in Repo~~ ✅ RESOLVED 2026-06-04

**Resolution (A2)**: `backend/Code.gs`, `backend/Config.gs`, `backend/SheetService.gs` added — commit `c18cccb`.
- `doPost()` router handles `read` / `write` actions
- `sheetRead()` / `sheetWrite()` in SheetService.gs
- API contract matches frontend exactly (text/plain POST, JSON response)

**Remaining action (on PO)**: Deploy these files to Google Apps Script → update `GS_WEBAPP_URL` in `constants.js`.
Old manually-deployed backend still active until PO deploys new version.

---

## ~~TD-003: Two Conflicting Versions of taskToRow() and checkDupId()~~ ✅ RESOLVED 2026-06-03

**Resolution**: Applied GAS.GS v6.2 patches to Main.html this session.
- `taskToRow()` now uses `fmtDateExport()` → dates "22-Apr-26", progress "75%"
- `checkDupId()` v6.2 → distinguishes ADD vs EDIT, correct messages
- `GAS.GS` is now fully superseded — all patches merged. Safe to archive.

---

## TD-004: All State in Global Variables
**Rating**: 🟡 HIGH

**Issue**: Application state (`db`, `sort`, `chartInst`, `selectedIds`, `currentPage`, `confirmResolve`, `_qvActiveTab`, `_qvIsOpen`) are all window-level globals.

**Impact**:
- No encapsulation, any function can mutate state
- Race conditions possible if events fire concurrently
- Debugging requires knowing all global names
- No predictable state transitions

**Priority**: Addressable in v7 modularization

---

## TD-005: Inline Styles Scattered Throughout HTML
**Rating**: 🟡 HIGH

**Issue**: Hundreds of `style=""` attributes throughout the HTML — e.g., `style="font-size:13px;color:var(--text-3);"`.

**Impact**:
- Cannot apply design changes globally
- Inconsistent spacing/sizing despite design tokens
- Violates the design system principle (see UIUX_SYSTEM.md)
- Hard to maintain responsiveness

**Count estimate**: 100+ inline style attributes.

---

## TD-006: Hardcoded Dropdown Options
**Rating**: 🟡 HIGH

**Issue**: Team names, state options, category options, and milestone options are hardcoded in HTML `<option>` elements.

```html
<option>Số</option><option>CV1</option><option>CV2</option>...
```

**Impact**:
- Changing a team name requires editing HTML
- Category list cannot be driven by data
- No admin interface to manage options
- Risk of inconsistency between import parser and form options

---

## ~~TD-007: Manual Patch Process (GAS.GS)~~ ✅ RESOLVED 2026-06-04

**Resolution**: `GAS.GS` fully superseded — all v6.1/v6.2 patches merged into modular JS files (`parsers.js`, `crud.js`, `api.js`). File archived in repo history. No future patch process needed.

---

## TD-008: No Error Boundary / Recovery
**Rating**: 🟡 HIGH

**Issue**: If `renderAll()` fails partway through, the app shows partial UI. No try-catch around render calls. No graceful degradation.

**Impact**: Single JS error in render can break the entire view.

---

## TD-009: Duplicate Parsing Logic
**Rating**: 🟢 MEDIUM

**Issue**: Date parsing, RAG parsing, state normalization, and Y/N parsing are implemented TWICE:
- Once in `extractWorkbook()` (Excel import path)
- Once in `_parseArrayIntoDb()` (GAS read path)

Both implementations have subtle differences (e.g., `dd-mmm-yy` handling in import vs. GAS read).

**Impact**: Behavioral inconsistencies between importing an Excel and reading from Sheet.

---

## TD-010: CDN Dependencies Without SRI / Version Lock
**Rating**: 🟢 MEDIUM

**Issue**: All 4 CDN dependencies (Chart.js, xlsx, Font Awesome, Google Fonts) load from CDN without Subresource Integrity (SRI) hashes.

**Impact**: Supply chain attack vector. CDN outage breaks the app.

---

## ~~TD-011: AI_CONTEXT Describes Wrong Architecture~~ ✅ RESOLVED 2026-06-03

**Resolution**: Created new documentation set this session that accurately reflects the actual codebase. Old files (DESIGN_SYSTEM.md etc.) retained as design references but clearly labelled in PROJECT_OVERVIEW.md as "from another project".

---

## TD-012: No Automated Test Suite
**Rating**: 🟢 MEDIUM → ⚪ LOW (partially addressed)

**Issue**: No committed test suite — no unit tests, no integration tests.

**Partial resolution 2026-06-04 (Phase B)**: Ad-hoc Playwright script (`pw_verify/full_test.js`) — 25 checks, all views. Not committed, not CI.

**Partial resolution 2026-06-04 (Phase F)**: `verify_kpi.mjs` — Playwright headless test for all 6 KPI Digital views, run after implementation. Also not committed.

**Partial resolution 2026-06-05 (Session 6)**: `verify_initiative_v2.mjs` — **committed** — 37/37 PASS.

**Partial resolution 2026-06-12 (Session 17)**: `verify_bld_queue.mjs` — **34/34 PASS** (up from 18/18 S16). Added TEST11–15 covering submit flow (approve/reject/info), local fallback, badge update. Fixed Playwright infra: Windows import path + `context.route` GAS abort + `waitForFunction` loading overlay.

**Partial resolution 2026-06-12 (Session 18)**: `verify_bld_queue.mjs` — **46/46 PASS**. Added TEST16–20: confirm-btn disable reset, yKienBLD persistence (noiDungBLD untouched), opinion block on card, Task form readonly field, legacy+new history markers. Added `debug_login.mjs` (login diagnostics, not a test suite).

**Partial resolution 2026-06-15 (Session 19)**: `verify_case_pipeline.mjs` — **20/20 PASS** (new). Covers nav, 14-col Kanban, summary cards, filter, CRUD modal, ID gen, validation, BLD Queue case integration.

**Partial resolution 2026-06-15 (Session 20)**: `verify_case_pipeline.mjs` — **22/22 PASS**. +TEST05b (kanban toggle 14 cols), +TEST08b (preset bar 4 tabs). Rewritten TEST05/07/12/13/14/16/17 từ .cp-card → #cpTbody tr để phù hợp table-primary design.

**Committed suites**: `verify_initiative_v2.mjs` (37 — ⚠️ failing, see TD-033), `verify_ms_tasks.mjs` (14), `um_test.mjs` (14), `verify_bld_queue.mjs` (46), `verify_case_pipeline.mjs` (22), `verify_filter_cascade.mjs` (23), `verify_import_rbac.mjs` (15), `verify_modal_layout.mjs` (9) — total **180 checks**.

**Remaining gap**: No CI integration. No unit tests for pure functions. Import paths in test files are machine-specific (Windows vs Linux `/opt/node22/...`).

---

## TD-013: Sync "Last Write Wins" Legacy Risk
**Rating**: 🟢 MEDIUM

**Issue**: The `writeToHandle()` function (line 2366) still does a full write (last-write-wins). While `syncAction()` now uses Read-Then-Patch, `writeToHandle()` is called from some legacy paths and is not guarded against concurrent edits.

---

## TD-014: Emoji in Select Options (Anti-pattern)
**Rating**: ⚪ LOW

**Issue**: Select options use emoji: `<option value="Green">🟢 Green – Tốt</option>`. According to the design system (UIUX_SYSTEM.md), emoji should not be used as primary UI indicators in enterprise views.

---

## TD-015: PIC Accountable Hardcoded Default
**Rating**: ⚪ LOW

**Issue**: `<input ... value="Tuantt4">` — PIC Accountable defaults to a specific user's ID. New team members will forget to change this.

---

## ~~TD-020: KPI Data Hardcoded — No Refresh Mechanism~~ ✅ PARTIALLY RESOLVED 2026-06-04

**Resolution (Session 4)**: `kpi-parser.js` + `KpiSheetService.gs` added — users can now:
- Load `File raw.xlsx` directly via "Load File Raw" button (KPI Overview toolbar)
- Sync parsed data to/from GG Sheet `KPI_Summary` tab via "Sync GG Sheet" / "Từ GG Sheet" buttons
- `getKpiData()` returns live parsed data when loaded; falls back to static `KPI_DATA` otherwise

**Remaining gap**: Monthly product-level arrays (`products[x].biz[]` etc.) in `kpi-data.js` are still hardcoded. PTKD-level data (quangPTKD/dungPTKD/agg) is now dynamic via parser. Acceptable long-term if File raw.xlsx is kept up to date.

---

## TD-021: Shared Helpers Defined in View Files
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (Phase F)

**Issue**: `_sLabel()` and `_kpProgColor()` are utility functions defined in `kpi-overview.js` and `kpi-progress.js` respectively, but used by all 6 KPI view files. They work because of global scope and load order, but are not in a shared helper file.

**Impact**: If `kpi-overview.js` is removed or load order changes, dependent views break silently.

**Fix**: Move both to `helpers.js` or a new `assets/js/kpi-helpers.js`.

---

## ~~TD-022: quangPTKD Accessed by Hardcoded Index~~ ✅ RESOLVED 2026-06-04

**Resolution (Session 4, commit `55ebc33`)**: `kpi-overview.js` now uses dynamic `.find()` / `needPerMonth` / `bizGapFor22` calculations instead of hardcoded array positions. Insight bullets computed dynamically from sorted data.

---

## TD-023: KPI Tab State Not Restored on Re-render
**Rating**: ⚪ LOW
**Added**: 2026-06-04 (KPI merge)

**Issue**: `_oaActiveTab` in `owner-analysis.js` persists across `navigateTo` calls. On re-render, HTML always shows QuangNN3 tab as active, but `_oaActiveTab` may still be 'dung' or 'rank'. No crash, minor visual inconsistency before first user click.

**Fix**: Reset `_oaActiveTab = 'quang'` at start of `renderOwnerAnalysis()`.

---

## TD-024: Initiative ID Rename Does Not Cascade to Children
**Rating**: ⚪ LOW
**Added**: 2026-06-05 (Session 5 — Initiative Tracker)

**Issue**: In `_initSave()`, when a user edits an initiative and changes its ID (origId ≠ newId), the code removes the old entry and adds the new one — but child milestones with `parentId === origId` are NOT updated to `parentId === newId`. Those milestones become orphans (parentId points to non-existent initiative) and disappear from the Milestone accordion.

**Impact**: Only affects the edge case of renaming an Initiative ID after milestones have been added. Milestones are not deleted — they remain in `db.initiatives` and `Initiative_Master` with a stale `parentId`.

**Fix**: In `_initSave()` before removing the old entry, update all `db.initiatives` entries where `parentId === origId` to `parentId = newId`.

---

## TD-025: `writeInitiatives()` Is Full-Replace (No Patch)
**Rating**: ⚪ LOW
**Added**: 2026-06-05 (Session 5 — Initiative Tracker)

**Issue**: `writeInitiatives()` in `initiatives.js` writes the entire `db.initiatives` array to `Initiative_Master` on every CRUD operation (same pattern as `writeToHandle()` for tasks — TD-013). With multiple users open simultaneously, last-write-wins applies to initiative data.

**Impact**: Low risk in current usage — initiatives are managed by one PO, not multi-user. Acceptable short-term.

**Fix**: Implement a Read-Then-Patch pattern for initiative writes (mirror `syncAction()` for tasks). Deferred until multi-user initiative editing becomes a requirement.

---

## ~~TD-026: Milestone Modal Status Dropdown Uses English; GAS Data Uses Vietnamese~~ ✅ RESOLVED 2026-06-06

**Resolution**: PO confirmed fixed (Session 7). Milestone modal now uses Vietnamese options.

---

## ~~OBS-01: db.initiatives Silently Overwritten in syncAction()~~ ✅ RESOLVED 2026-06-06

**Resolution (Session 8, commit `5bf9fed`)**: Removed 3-line iMap rebuild from `syncAction()`. `db.initiatives` is now owned exclusively by `readInitiatives()` / `_parseInitiativeArray()`. Initiative Tracker data no longer wiped on every task sync.

---

## ~~AUTH-01: AUTH_SECRET Uses Hardcoded Fallback~~ ✅ RESOLVED 2026-06-07

**Resolution (Session 9, commit `142844a`)**: `_authSecret()` now throws hard error if `AUTH_SECRET` Script Property is not set. Fallback `'shtd_2026_internal'` eliminated from codebase.

---

## ~~AUTH-02: Role Stored But Not Enforced in UI~~ ✅ RESOLVED 2026-06-07

**Resolution (Session 9, commit `b561624`)**: `applyUserToUI()` sets `document.body.dataset.role = user.role`. CSS rule `body[data-role="User"] .admin-only { display: none !important; }` hides bulk-delete and modal-delete buttons for User role. `kpi-write` GAS route restricted to Admin-only.

---

## ~~AUTH-03: No Change-Password Feature~~ ✅ RESOLVED 2026-06-07

**Resolution (Session 9, commit `4bdbe72`)**: `changePassword()` in `AuthService.gs` validates old password (SHA-256), enforces 6-char minimum, writes new hash to `User_Master`. GAS `change-password` route added. User-pill dropdown shows "Đổi mật khẩu" → opens inline modal.

---

## AUTH-04: No Session Invalidation on Password Change
**Rating**: ⚪ LOW
**Added**: 2026-06-08 (Session 9)

**Issue**: HMAC tokens are stateless (24h expiry). After a user changes their password, their existing token remains valid until it expires. If a token was compromised before the password change, the attacker retains access for up to 24h.

**Impact**: Acceptable for internal tool; risk window is bounded to 24h.

**Fix** (if needed): Maintain a token revocation list in Script Properties or a Sheet tab. On validateToken(), check revocation list. Expensive (one extra read per request). Defer unless security audit requires it.

---

## SEC-01: onclick Attributes With User IDs Not JSON-Escaped
**Rating**: ⚪ LOW
**Added**: 2026-06-08 (Session 9)

**Issue**: Patterns like `onclick="editTask('${t.id}')"` use `esc()` for display fields but task IDs in onclick attributes are not wrapped in `JSON.stringify()`. If a task ID contained a single quote (e.g., from a malformed import), the onclick handler would break or potentially allow injection.

**Impact**: Task IDs are generated by `genId()` which produces only alphanumeric + hyphen characters. Import path could theoretically produce malformed IDs. Risk is LOW given format validation.

**Fix**: Replace `onclick="editTask('${t.id}')"` patterns with `onclick="editTask(${esc(JSON.stringify(t.id))})"` across tasks.js, gantt.js, dashboard.js, app.js, initiative-tracker.js.

---

## TD-027: Initiative Writes Not Covered by Optimistic Locking
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-08 (Session 9)

**Issue**: Task writes now have VERSION_CONFLICT protection via `TASK_WRITE_TS` Script Property (Session 9, 1-D). Initiative writes (`initiativeWrite()` in `InitiativeService.gs`) do not have equivalent locking. Concurrent initiative edits are still last-write-wins.

**Impact**: Low risk — initiatives are managed by PO only, not multi-user. Acceptable until multi-user initiative editing is required.

**Fix**: Mirror the task locking pattern: add `INI_WRITE_TS` Script Property; `initiativeRead()` returns `{values, serverTs}`; `initiativeWrite()` checks `clientTs`.

---

## ~~TD-028: TEMP debug-auth Endpoint in Code.gs~~ ✅ RESOLVED 2026-06-08

**Resolution (Session 11, commit `1c828fc`)**: Entire `debug-auth` block removed from `Code.gs`. GAS redeployed. No unauthenticated endpoint remains.

---

## ~~TD-029: TEMP Debug Log in api.js readFromHandle~~ ✅ RESOLVED 2026-06-08

**Resolution (Session 11, commit `1c828fc`)**: `[DBG]` log and `window._lastGasToken` removed from `auth.js`; `[DBG]` log removed from `api.js`. No token-related console output remains.

---

## AUTH-05: KNOWN_ROLES Not Validated Against User_Master Sheet
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-08 (Session 11)

**Issue**: `KNOWN_ROLES` in `Code.gs` is a hardcoded array. If a user's role in User_Master sheet is set to a value not in this array (e.g. `Teamlead`, `Manager`, `Viewer`), every post-login GAS call silently returns `AUTH_REQUIRED` with no diagnostic message. Root cause of Session 10–11 auth blocker.

**Impact**: Any future role rename in the sheet breaks all affected users immediately with no clear error.

**Fix**: Either (a) validate roles at `setupInitialUsers` / changePassword time, or (b) replace the whitelist with an allowlist check against a Script Property `ALLOWED_ROLES` so it can be updated without code deploy.

---

## ~~TD-030: User Management Has No Pagination / Search~~ ✅ RESOLVED 2026-06-15

**Resolution (Session 22, commit `2a65710`)**: `user-management.js` now has: search (username/name/email, debounce 150ms), filter Team/Role/Status, filter chips với clear, sort 5 cols, pagination 15/page với count info. TD-030 fully addressed.

---

## TD-031: Loose-link Detection Assumes `PARENT-Mn` Milestone ID Pattern
**Rating**: 🟢 LOW
**Added**: 2026-06-10 (Session 14)

**Issue**: `_initGetMsTasks` and alignment badge logic use `_msShortLabel(ms.id)` (regex `/-M\d+$/`) to detect "loose link" tasks that used generic M1/M2 labels. If a milestone ID doesn't follow the `PARENT-Mn` pattern (e.g. free-text IDs), the short-label fallback silently never matches — tasks remain "unlinked" even when user intended a link.

**Impact**: Low. All milestones created via the CRUD modal follow the pattern. Only affects ad-hoc or imported milestone IDs.

**Fix** (if needed): Extend `_initGetMsTasks` to also search by milestone `name` substring match as a third fallback tier.

---

## TD-033: verify_initiative_v2.mjs Không Inject Auth — Fail Local
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-12 (Session 18)

**Issue**: `verify_initiative_v2.mjs` chặn GAS routes nhưng KHÔNG inject `shtd_auth_v1` vào localStorage → `loginOverlay` chặn mọi click → test fail tại `navigate()`. Xác nhận fail y hệt trên code gốc (git stash) — pre-existing từ khi auth được thêm (S9), không phải regression.

**Fix**: Copy pattern `loadWithData()` từ `verify_bld_queue.mjs` (inject auth + `context.route` abort + `waitForFunction` loading overlay).

---

## ~~TD-034: Task Data Loss Risk — Local-Only Write Without User Warning~~ ✅ RESOLVED 2026-06-18

**Resolution (Session 29, commit `2986e51`)**: S23b local-only decision đã bị revert. Task CRUD (`saveTask`, `deleteTask`, `bulkSetRag/State/Delete`) và task BLD approval đều gọi `await syncAction()` — read-merge-write đến GAS. Toast chỉ hiện sau khi GAS xác nhận. `localAction()` không còn được gọi từ bất kỳ đâu (dead code).

---

## ~~SCHEMA-01: Mixed-Version Clients — Cột X (Ý kiến BLĐ) Lệch/Stale~~ ✅ RESOLVED 2026-06-15

**Resolution (Session 19, commit `a00a611`)**: S18+S19 merged trực tiếp vào `main`. `master` branch bỏ từ S19. Mọi client giờ ghi Task_Master 24 cột đồng nhất. Không cần migration.

---

## TD-035: `picNorm()` Không Produce Canonical Username — Partial Workaround
**Rating**: 🟢 MEDIUM
**Added**: 2026-06-16 (Session 24)

**Issue**: `picNorm(n)` chỉ capitalize chữ đầu và lowercase phần còn lại: `'DungLQ1' → 'Dunglq1'`. Đây không phải canonical username — mất thông tin case ở giữa (`LQ1`). Kết quả là `t.picRes` sau parse không match `u.Username` từ `_appUsers`.

**Mitigation đã có (S24)**:
- PA1: filter comparison `.toLowerCase()` — tasks.js:58
- PA2: `_resolvePickerCase()` resolve picRes/picAcc về canonical sau parse và sau loadAppUsers

**Remaining gap**: 
- `picNorm()` vẫn được dùng khi **save** task từ form (`crud.js:193`): `picRes: picNorm(document.getElementById('fPicRes').value)` — nếu user select dropdown value là `'DungLQ1'`, sau `picNorm` thành `'Dunglq1'`, nhưng `_resolvePickerCase()` sau `localAction()` sẽ fix lại. OK vì `_resolvePickerCase()` gọi trong `renderAll()` → không, thực ra không gọi trong `renderAll()`. Chỉ gọi sau parse và sau loadAppUsers. Nên task mới tạo/edit có picRes='Dunglq1' sẽ ở lại trạng thái đó cho đến lần reload tiếp theo.
- `report.js` và `taskToRow()` dùng `t.picRes` trực tiếp — nếu picRes='Dunglq1' thì Sheet cũng nhận 'Dunglq1' khi import.

**Fix proper**: Thay `picNorm()` bằng lookup từ `_appUsers` khi save:
```js
// crud.js:193
picRes: _resolveOneUser(document.getElementById('fPicRes').value),

function _resolveOneUser(raw) {
  if (!raw || !_appUsers?.length) return raw;
  const canon = _appUsers.find(u => u.Username.toLowerCase() === raw.toLowerCase());
  return canon ? canon.Username : raw;
}
```

**Priority**: Thấp vì PA1+PA2 cover read-path; chỉ ảnh hưởng write-path khi import lại Sheet.

---

## TD-036: `localAction()` Dead Code in api.js
**Rating**: ⚪ LOW
**Added**: 2026-06-18 (Session 29)

**Issue**: `localAction()` trong `api.js` không còn caller nào sau S29 revert. Khai báo còn đó nhưng không được gọi.

**Fix**: Xóa hàm sau khi xác nhận `grep -r "localAction" assets/js/` cho ra 0 caller.

---

## TD-037: `syncAction` Caller Trace in api.js — Temporary Debug Code
**Rating**: ⚪ LOW (temporary)
**Added**: 2026-06-19 (Session 30)

**Issue**: `syncAction()` in `api.js` logs `[syncAction] fired — caller: ...` on every call. Added for debugging — not for production.

**Impact**: None functionally. Clutters browser console. If syncAction is called frequently (Excel import), log fires repeatedly.

**Fix**: Remove line `console.warn('[syncAction] fired — caller:', ...)` from `api.js:244` after production verification complete.

---

## TD-038: Startup Diagnostic Console Log in app.js — Temporary Debug Code
**Rating**: ⚪ LOW (temporary)
**Added**: 2026-06-19 (Session 30)

**Issue**: `startApp()` logs version + deleteTask source check on every login. Added to verify stale-cache issue was resolved.

**Impact**: None functionally. Shows green console message on every login — acceptable for internal tool but not clean production code.

**Fix**: Remove `console.info(...)` block from `app.js:18` after production verification complete (same cleanup pass as TD-037).

---

## ~~TD-037b: bulk.js syncAction causing task-write + N rows on every bulk op~~ ✅ RESOLVED 2026-06-19

**Resolution (Session 30, commit `701fe7f`)**: `bulkSetRag`, `bulkSetState`, `bulkDelete` now use N × `_gasTaskUpsert`/`_gasTaskDelete` (atomic, optimistic-update, fire-and-forget). `syncAction()` completely removed from `bulk.js`. GAS Audit_Log now shows N entries of `task-upsert | ID` or `task-delete | ID`, never `task-write + N rows` from bulk ops.

---

## TD-039: `db.deletedIds` Grows Indefinitely
**Rating**: ⚪ LOW
**Added**: 2026-06-22 (Session 31)

**Issue**: Task IDs added to `db.deletedIds` (via `deleteTask` or `bulkDelete`) are only pruned from `readFromHandle` when the task reappears on the GAS server (a `re-add` scenario). For tasks that stay deleted, the IDs accumulate in `localStorage['shtd_v2'].deletedIds` forever.

**Impact**: At current task volume (a few hundred tasks), localStorage impact is negligible. No functional impact. If over years the list grows very large, localStorage quota (5MB) could theoretically be affected, but only if tens of thousands of unique task IDs are deleted.

**Fix** (if ever needed): Cap list at e.g. 500 entries with a FIFO eviction, or prune on every GAS read by checking if the ID existed in the last N months of audit log.

---

## TD-040: Cache-Bust Process Not Enforced — Deployment Step Missed
**Rating**: 🟡 HIGH (process risk)
**Added**: 2026-06-22 (Session 32)

**Issue**: S31 changed `tasks.js` + `navigation.js` but did not bump `?v=` in 35 `<script>` tags in `index.html`. Browsers served stale pre-fix JS → S31 select-bug fixes invisible in production until S32 fixed it.

**Root cause**: No checklist or automation enforces the cache-bust bump. Relies on developer memory.

**Impact**: Any deployment that forgets to bump `?v=` silently ships broken/missing features. Users see no error — old JS loads quietly. This happened in S31 and caused a production regression.

**Additional hazard**: PowerShell `Get-Content`/`Set-Content` on Windows reads files as Windows-1252, corrupting Vietnamese chars (e.g. 'Số' → 'Sá»'). Python with `encoding='utf-8'` is required.

**Fix**: Add to CLAUDE.md or deployment checklist:
```
EVERY commit touching assets/js/*.js → bump ?v=YYYYMMDD in all 35 <script> tags in index.html
Method: Python replace with encoding='utf-8'  (NOT PowerShell Get-Content)
APP_VERSION in config.js must match the bumped version string
Verify: topbar badge shows new version after hard-reload (Ctrl+Shift+R)
```

---

## TD-041: CSS Files Had No Cache-Bust Versioning
**Rating**: ⚪ LOW (resolved in S35)
**Added**: 2026-06-24 (Session 35)

**Issue**: All 16 local `<link rel="stylesheet" href="assets/css/*.css">` tags had no `?v=` query string. Every CSS change since the project started (S1–S34) required users to manually clear their CSS cache — `Ctrl+Shift+R` alone was insufficient if the browser had a long-lived cache for `.css` URLs without version params.

**Discovery**: S35 bug fix to `layout.css` (sidebar scroll) would have been invisible to users who had previously cached the CSS, regardless of hard-reload, because only JS tags had `?v=`.

**Resolution (S35, commit `2cb947f`)**: Added `?v=20260624c` to all 16 CSS `<link>` tags via Python regex:
```python
re.sub(r'(href="assets/css/[^"?]+\.css)"', r'\1?v=YYYYMMDD"', content)
```

**Process update**: Future deploys touching any `.css` file must bump both:
1. `?v=` on 35 JS `<script>` tags (existing rule from TD-040)
2. `?v=` on 16 CSS `<link>` tags (new rule from S35)

Use same Python pattern for both. One version string for everything (e.g. `20260624c`).

---

## Debt Summary
**Last updated**: 2026-06-24 (Session 35). **Nợ mới sau S35 ghi ở các khối "🆕 DELTA — Session N" đầu file** (S36→S66), không nhập lại bảng dưới đây.

| ID | Rating | Issue | Effort | Status |
|---|---|---|---|---|
| ~~TD-001~~ | ~~🔴~~ | ~~Monolith~~ | Large | ✅ **Resolved 2026-06-04** — Phase B complete |
| ~~TD-002~~ | ~~🔴~~ | ~~GAS backend not in repo~~ | Small | ✅ **Resolved 2026-06-04** — `backend/` added + URL updated |
| TD-003 | ~~🔴~~ | Conflicting function versions | Small | ✅ **Resolved 2026-06-03** |
| TD-004 | 🟡 | Global state | Medium | Open — Phase D |
| TD-005 | 🟡 | Inline styles | Medium | Open — Phase B |
| TD-006 | 🟡→🟢 | Hardcoded dropdowns | Medium | **Partial S21** — Team/PIC now driven by User_Master. Other option sets (Stage, Loại hình, Complexity, RAG) still hardcoded in HTML |
| ~~TD-007~~ | ~~🟡~~ | ~~Manual patch process~~ | Medium | ✅ **Resolved 2026-06-04** — GAS.GS fully superseded |
| TD-008 | 🟡 | No error boundary | Small | Open |
| TD-009 | 🟢 | Duplicate parsing logic | Small | Open — Phase B (parsers.js unifies) |
| TD-010 | 🟢 | CDN SRI missing | Small | Open |
| TD-011 | ~~🟢~~ | Wrong AI_CONTEXT docs | Small | ✅ **Resolved 2026-06-03** |
| TD-012 | 🟢→⚪ | No tests | Large | Partial — 11 committed suites: 37+14+14+46+22+23+15+9+23+24+**28**=255 (initiative_v2 failing — TD-033; verify_case_pipeline_s36 **28/28** added S36); no CI |
| TD-013 | 🟢 | Legacy full-write path | Small | Open |
| TD-014 | ⚪ | Emoji in selects | Tiny | Open |
| TD-015 | ~~⚪~~ | ~~Hardcoded default PIC~~ | Tiny | ✅ **Resolved S21** — fPicAcc/fPicRes now populated from User_Master; no hardcoded 'Tuantt4' default |
| ~~TD-016~~ | ~~⚪~~ | ~~Stale comment line 2702~~ | Tiny | ✅ **Resolved 2026-06-04** — never existed in extracted parsers.js |
| ~~TD-017~~ | ~~⚪~~ | ~~Gantt subtitle hardcoded "2025–2026"~~ | Tiny | ✅ **Resolved 2026-06-04** — dynamic year |
| TD-018 | ⚪ | `fmtExportDate` duplicated in `app.js:exportExcel` vs `helpers.js:fmtDateExport` | Tiny | Open — defer to Phase F cleanup |
| ~~TD-019~~ | ~~⚪~~ | ~~Inline `onchange/oninput` double handlers~~ | Tiny | ✅ **Resolved 2026-06-22** — S31 `9e8bfd3`: removed 7 duplicate JS listeners from setupListeners(); HTML inline handlers are now sole owner |
| ~~TD-020~~ | ~~⚪~~ | ~~KPI data hardcoded — no refresh~~ | Tiny | ✅ **Partially resolved 2026-06-04** — kpi-parser.js + GG Sheet sync for PTKD/agg; product monthly arrays still static |
| TD-021 | ⚪ | `_sLabel()` / `_kpProgColor()` defined in view files, used globally | Tiny | Open — move to `helpers.js` |
| ~~TD-022~~ | ~~⚪~~ | ~~`quangPTKD[1/2/10/12]` hardcoded index~~ | Tiny | ✅ **Resolved 2026-06-04** — `55ebc33` uses dynamic `.find()` |
| TD-023 | ⚪ | `_oaActiveTab` not reset on re-render — visual inconsistency only | Tiny | Open — add reset line |
| TD-024 | ⚪ | Initiative ID rename doesn't cascade `parentId` in child milestones | Tiny | Open — fix in `_initSave()` |
| TD-025 | ⚪ | `writeInitiatives()` full-replace, no patch — last-write-wins | Tiny | Open — acceptable until multi-user initiative editing needed |
| ~~TD-026~~ | ~~⚪~~ | ~~Milestone modal status dropdown English vs. GAS Vietnamese~~ | Tiny | ✅ **Resolved 2026-06-06** — PO confirmed fixed |
| ~~OBS-01~~ | ~~🔴~~ | ~~db.initiatives overwritten in syncAction()~~ | Tiny | ✅ **Resolved 2026-06-06** — commit `5bf9fed` |
| ~~AUTH-01~~ | ~~⚪~~ | ~~AUTH_SECRET hardcoded fallback~~ | Tiny | ✅ **Resolved 2026-06-07** — commit `142844a`, hard throw if missing |
| ~~AUTH-02~~ | ~~⚪~~ | ~~Role not enforced in UI~~ | Small | ✅ **Resolved 2026-06-07** — commit `b561624`, CSS .admin-only |
| ~~AUTH-03~~ | ~~⚪~~ | ~~No change-password UI~~ | Small | ✅ **Resolved 2026-06-07** — commit `4bdbe72`, GAS + modal |
| AUTH-04 | ⚪ | No session invalidation on password change | Small | Open — stateless tokens, 24h window |
| SEC-01 | ⚪ | onclick attributes with IDs not JSON-escaped | Tiny | Open — low risk, IDs are format-controlled |
| TD-027 | 🟢 | Initiative writes not covered by optimistic locking | Small | Open — acceptable until multi-user initiative editing needed |
| ~~TD-028~~ | ~~🔴~~ | ~~TEMP debug-auth endpoint~~ | Tiny | ✅ **Resolved 2026-06-08** — commit `1c828fc` |
| ~~TD-029~~ | ~~🟡~~ | ~~TEMP [DBG] token log in api.js~~ | Tiny | ✅ **Resolved 2026-06-08** — commit `1c828fc` |
| AUTH-05 | 🟢 | KNOWN_ROLES hardcoded — role mismatch silently returns AUTH_REQUIRED | Small | Open |
| ~~TD-030~~ | ~~⚪~~ | ~~User Management table has no search/pagination~~ | Tiny | ✅ **Resolved S22** — search/filter/sort/pagination added |
| TD-031 | 🟢 | Loose-link detection assumes `PARENT-Mn` milestone ID pattern | Tiny | Open — low risk |
| TD-032 | ⚪ | BAU task ID format changed `Số001` → `Số-001`; clone of old tasks gets gap in sequence | Tiny | Open — one-time migration or accept gap |
| TD-033 | 🟢 | `verify_initiative_v2.mjs` không inject auth → fail local (pre-existing) | Small | Open — copy pattern verify_bld_queue |
| ~~TD-034~~ | ~~🔴~~ | ~~Task data loss risk — CRUD/BLD local-only, no GAS write~~ | Small | ✅ **Resolved 2026-06-18** — S29 commit `2986e51`: syncAction() restored for all task ops |
| TD-036 | ⚪ | `localAction()` dead code in api.js — no callers after S29 | Tiny | Open — xóa sau xác nhận grep |
| TD-035 | 🟢 | `picNorm()` không produce canonical username — S26: removed filterPic rebuild từ updateFilterDropdowns() (conflict resolved); write-path crud.js still saves picNorm format | Small | Partial — fix proper: lookup từ _appUsers khi save trong crud.js |
| ~~SCHEMA-01~~ | ~~🟡~~ | ~~Mixed-version clients cột X lệch/stale~~ | — | ✅ **Resolved 2026-06-15** — S18+S19 merged to main, master abandoned |
| TD-037 | ⚪ | `syncAction` caller trace log in `api.js:244` — temp debug code | Tiny | Open — xóa sau production verify |
| TD-038 | ⚪ | Startup diagnostic console.info in `app.js:18` — temp debug code | Tiny | Open — xóa cùng pass với TD-037 |
| ~~TD-037b~~ | ~~🟡~~ | ~~bulk.js syncAction → task-write + N rows on every bulk op~~ | Small | ✅ **Resolved 2026-06-19** — S30: bulk ops → N×atomic writes |
| verify_sync_fix.mjs stale | 🟡 | S29 test expects bulk → syncAction; S30 bulk → atomic → tests FAIL | Small | Open — update T3–T5 hoặc deprecate |
| TD-039 | ⚪ | `db.deletedIds` grows indefinitely — permanently deleted IDs never pruned from localStorage | Tiny | Open — negligible at current scale; cap at 500 if ever needed |
| TD-040 | 🟡 | Cache-bust bump not enforced on every JS deployment — S31 missed it → production regression; must use Python not PowerShell for UTF-8 safety | Small | Open — add to CLAUDE.md/deployment checklist |
| ~~TD-041~~ | ~~⚪~~ | ~~CSS files had no `?v=` cache-bust versioning — S1–S34 CSS changes could be cached indefinitely by browser~~ | Tiny | ✅ **Resolved S35** — `?v=20260624c` added to all 16 CSS `<link>` tags; future deploys must bump both JS+CSS |
