# PROJECT STATE
**As of**: 2026-08-16 (Session 74 — Fix email/chuông nhắc việc hiện task đã đóng: cơ chế RETRACT)
**Version**: v6.49 (`APP_VERSION = '6.49-notif-retract-closed-20260816'`, `index.html ?v=20260816`)
**Remote HEAD (main)**: S74 (đã push)

> **S74 (Notification retract — DEBUG)**: User báo task **đã đóng vẫn còn nhắc việc** (chuông + email) + nghi trỏ nhầm DB. Rà soát: (a) trỏ DB **ĐÚNG** (`Config.gs SPREADSHEET_ID=1cpg1p_8…56Hk` = Sheet tổng cá nhân, khớp client). (b) Gốc: **noti không được thu hồi khi entity chuyển done** — `notifScan` chỉ bỏ qua task done khi sinh candidate MỚI; nhắc `overdue`/`due-*` đã ghi khi task còn mở thì nằm lại (chỉ `_notifPurge_` xóa khi đã-đọc & >30 ngày); đóng task chỉ append "closed", không gỡ nhắc cũ. **Fix (RETRACT 3 tầng)** trong `backend/NotificationService.gs`: (1) real-time `notifOnWrite` `nowDone`→`_notifRetractEntity_()`; (2) daily `notifScan` `_notifLiveState_()`+`_notifRetractStale_()` gỡ nhắc due/overdue của entity done/mất, chạy TRƯỚC digest → email sạch, tự chữa tồn kho + đóng ngoài app; (3) dry-run `notifRetractStalePreview()`. Chỉ thu hồi due-types (created/closed giữ); retract=mark-read (không xóa); bump `DATA_VER` khi thu hồi. `verify_notif_retract` **19/19** (sandbox Node chạy hàm GAS thật, không port tay), `verify_notifications` 21/21. ✅ **GAS đã redeploy (link KHÔNG đổi)**. v6.49, `?v=20260816`. Xem TD-NOTIF-01.
> **S73.2 (RAG column — DEBUG)**: User báo "RAG bấm ở Công việc của tôi: audit log CÓ update nhưng sheet không đổi → reload/Sync về trắng". Gốc: **Task_Master không có cột RAG** — `taskToRow` (24 cột) bỏ qua cả `t.status` lẫn `t.rag`; parser suy `t.status` từ Trạng thái; My Work dùng riêng `t.rag` (Xanh/Vàng/Đỏ) không load/lưu. Field khác vẫn lưu → KHÔNG mất data task. **Fix (hợp nhất 1 RAG)**: RAG = **`t.status`** (Green/Amber/Red — nguồn đã dùng ở dashboard/action-plan/modal); My Work dots đổi sang `t.status`; thêm **cột 25 'RAG' (Y)** (DB_COLS 24→25, GS_RANGE A1:Y, `taskToRow[24]=t.status`); parser tự map header 'rag'→status. GAS cột động → **KHÔNG redeploy Web App**. NEW `backend/RagColumnMigration.gs` (`dryRunAddRag`/`commitAddRag`: set Y1='RAG' + backfill từ Trạng thái + bump DATA_VER) — **user chạy 1 lần trong editor**. `verify_task_rag` 5/5; my_work 62/62; atomic_write 41/41; full 33/34 (chỉ bld_queue timing-flaky). v6.48, `01c12cd`. ⚠️ `taskToRow` positional → RAG phải đúng cột 25.
> **S73.1 (Ownership-first scoped load — REVERT)**: v6.46 (`a0b7418`) thử batch-read `scope=mine` + full-load nền để giảm data lần load đầu → **GÂY MẤT DỮ LIỆU trên PRD (mọi role)**: scoped read trả ÍT/RỖNG → `_parseArrayIntoDb(<2)` đặt `db.tasks=[]` + persist cache rỗng; full-load nền ~1500 dòng timeout mạng nội bộ không cứu được. **Đã REVERT toàn bộ** về known-good v6.45 (`e15f99b`, v6.47) — client-only, GAS v6.46 còn live vô hại (client không gửi scope → server luôn 'all'). Sheet AN TOÀN. `verify_startup_nonblocking` 10/10. **KHÔNG tái áp scoped-load** trừ khi read hẹp không bao giờ shrink cache đầy + full-load nhỏ (xem TECH_DEBT TD-LOAD-01).
> **S72 (GAS call tuning 3 phase — PERF/DEBUG)**: S71 nới timeout không đủ. Gốc = khởi động bắn **~8 request GAS đồng thời** tới 1 host (browser xếp hàng + GAS tuần tự hoá + mỗi read `openById` nguội, không cache; `h2-read-all` mở 8 sheet bắn ngay dù H2 ngủ; Task ~1500 dòng). **P1 (v6.43, `892fe3c`, thuần FE)**: cache-first không chặn UI (`_startupSync`+`_runPool` concurrency=2 → fan-out **8→2**), lazy-load H2 (`_ensureH2Loaded`), poll notif 5'→15'+visibility, `GAS_AI_TIMEOUT_MS=120s`. **P2 (v6.44, `c304823`, cần GAS)**: NEW action `batch-read` gộp 7 read→**1** + mở spreadsheet 1 lần (8 reader nhận optional `ss`); client `readAll()` + **fallback** read lẻ. **P3 (v6.45, `d49d0be`, cần GAS)**: NEW `backend/CacheLayer.gs` `DATA_VER`; batch-read **version gate** (client gửi ver; khớp → `{notModified}` gần 0 payload; đổi → đọc LIVE); bump ver trong `auditLog` (sau commit) + `notifScan`; AI context cache theo ver (gzip). ✅ **GAS redeploy xong (link KHÔNG đổi), smoke PASS 3 phase.** `verify_startup_nonblocking` **10/10**; full suite 33/33 (2 flaky batch pre-existing). Kế hoạch: `AI_CONTEXT/GAS_TUNING_PLAN.md`.
> **S71 (Internal-net read timeout — DEBUG, regression từ S69)**: Mạng nội bộ báo **timeout khi load dữ liệu** (login thành công nhưng data không tải được); mạng ngoài OK. Gốc: S69 áp timeout **phẳng 30s** cho MỌI request `gasPost` → login (payload nhỏ) sống nhưng **read** (toàn bộ sheet, payload lớn) trên mạng nội bộ bị ANBM bóp băng thông cần >30s → AbortController cắt oan. Fix (thuần FE): tách timeout theo loại request — `auth.js` NEW `GAS_READ_TIMEOUT_MS=90000` + `gasPost(body, timeoutMs)` (mặc định 30s); mọi **bulk read** truyền 90s (`read`/`case-pipeline-read`/syncAction-read/`user-list`/`issue-read`/`dev-read`/`notif-read`/`audit-read`/`initiative-read`/`h2-read-all`/`kpi-read`), **writes giữ 30s**. `app.js` grace-window auth 35s→95s (read chậm trả `AUTH_REQUIRED` muộn không xóa oan phiên) + overlay thêm phụ đề "mạng nội bộ có thể chậm". Full suite **31/32** (bld_queue 404 flaky pre-existing). **KHÔNG deploy GAS mới.** v6.42, `?v=20260812e`.
> **S70.2 (H2 Task↔Milestone linking — DEBUG + CR)**: "thêm task-link vào milestone báo lỗi GAS khi lưu" → thay TaskRef free-text bằng **popup chọn task**. Backend NEW action **owner-gated** `h2-milestone-tasklink` (`H2Service.gs` `h2HandleTaskLink` chỉ sửa cột TaskRef; `Code.gs` route) → chủ mốc (member) HOẶC lead link được, không cần quyền sửa toàn mốc. FE: nút "+ Task" mỗi mốc → `#h2TaskPickerOverlay` (search mã/tên + droplist Initiative/Status + checkbox Quá hạn); **1 mốc ↔ NHIỀU task** (TaskRef gộp phẩy, không đổi schema); chip click → chi tiết common `openTaskViewPopup`; × bỏ link; `_gasH2TaskLink` optimistic (h2-core.js). **Scope task = picRes||picAcc của CHỦ MỐC, khớp username∪display-name** (`_h2OwnerMatchSet` qua getCurrentUser+_appUsers — vì cột PIC có thể lưu tên hiển thị). `verify_h2_tasklink` **28/28**; full suite 31/32 (chỉ bld_queue flaky batch). ✅ **GAS đã redeploy (user, link không đổi)**. v6.41.2, cache-bust `?v=20260812d`.
> **S70.1 (Seed KPI pilot — data)**: NEW `backend/H2SeedPilot.gs` — nạp 2 bản KPI chuẩn hoá (`data/SAMPLE_QuangNN3_H2.md`+`SAMPLE_DungLQ1_H2.md`) vào 8 sheet H2_*. `dryRun/commit` idempotent (ID cố định, upsert theo ID) + `h2SeedClearPilot()`. Sinh 8 Obj·27 KPI·28 MS·8 Risk·9 Dep·135 Tracking rỗng·2 Review rỗng; giữ placeholder `[cần đo T8]`. Validate sandbox-eval Node (widths/dup/FK/weight OK). Chạy trong Apps Script editor — **KHÔNG redeploy Web App**. Giải quyết TD-H2-02. Owner=`QuangNN3`/`DungLQ1`.
> **S69 (Login hang fix — DEBUG)**: Khắc phục treo/khóa đăng nhập khi mạng chậm/bị chặn (thỉnh thoảng, cả 2 mạng). Gốc: **mọi request GAS không có timeout** (`gasPost`/`doLogin` `fetch` trần) → 1 kết nối stall tới `script.google.com` spin vô hạn; overlay tải **chặn toàn màn** + `catch{hideLoading}` không chạy khi fetch treo → màn treo/gần trắng, `btnSync` chỉ hiện khi read thành công; ~7 read nền startup — bất kỳ read `AUTH_REQUIRED` → `doLogout` **xóa phiên** → mất role/user; reload tự phát lại startup → chỉ **clear site data** mới thoát. Fix (thuần FE): `auth.js` NEW `_fetchWithTimeout` (AbortController 30s) cho `gasPost`+`doLogin` + cờ `_authStartupGrace` (blip `AUTH_REQUIRED` lúc khởi động KHÔNG logout); `app.js` `window.onload` try/catch + `autoConnectDB` lỗi → `_showStartupRetry` (giữ phiên+cache+nút **Sync**=Thử lại, trạng thái ngoại tuyến), `syncDB` OK khôi phục "đã kết nối". v6.40, `?v=20260812` (65 refs). Full suite **30/31** (i18n_p7 flaky batch, riêng 35/35). **KHÔNG deploy GAS mới.**
> **S68 (H2 Track B hoàn tất — FEATURE)**: Khôi phục sau phiên đóng bất thường (context/test chưa cập nhật) rồi hoàn tất 2 view cuối **Quản trị H2**. `views/h2-dashboard.js`: executive dashboard — exec summary 6 card, theo member/pillar/objective, Top Risks/Dependencies, Capacity (cờ quá tải), AI Impact (P3-AI), Management Actions, chart trend T8→T12 + doughnut RAG (Chart.js), **Xuất báo cáo BLĐ (B8)** overlay copy-ready. `views/h2-review.js`: Tự đánh giá H1/T7 + Q3/Q4 + 8 chiều năng lực (1–5); member sở hữu review mình, Teamlead/Admin xem tất cả (RBAC client, backend gate `h2-review-upsert` sẵn từ B1). Wiring index/nav/i18n/h2.css/h2-core. Nền tảng: `77ce233` B1+B2 (H2Service.gs + h2-core.js), `daf0421` B3 (Tracker view). `verify_h2_dashboard` **24/24** + `verify_h2_review` **20/20** (+ core 14/14, tracker 32/32); full suite 29/31 (2 fail flaky pre-existing my_work MW6 + issue_tracker batch). Thuần frontend + test — **KHÔNG deploy GAS mới**. v6.39, cache-bust `?v=20260811c`. **+ Hướng dẫn sử dụng** (`bee61f8`): `docs/HUONG_DAN_SU_DUNG_H2_KPI.md` (VI, mọi thao tác) + `docs/img/h2/*.png` (10 ảnh chụp thật) + `capture_h2_guide.mjs` (script tái tạo ảnh).
> **S67.2 (Date unify — DEBUG)**: Gom toàn bộ xử lý ngày về **1 nguồn** `helpers.js`: `toISODate(v)` (parser vạn năng → **ISO YYYY-MM-DD**), `fmtDate` (→ **DD/MM/YYYY**), `parseVNDate`/`fmtDateExport` route qua `toISODate`. **Canonical = ISO cho storage + memory**; hiển thị DD/MM/YYYY. Mọi reader (task/case/init/dev/issue) normalize ISO vào memory; mọi writer ghi ISO; mọi hiển thị dùng `fmtDate`. Gốc lỗi "26/thg 7/30" + modal trống ngày: copy tay biến ô thành Date/serial/locale (`30-thg 7-26`), `parseDate` của Task không nhận `DD-MMM-YY`. NEW `backend/DateNormalizeMigration.gs` (dryRun/commit, **bỏ setNumberFormat** vì cột kiểu ngày chặn) — **user đã chạy commit xong**. Dev "Review cuối" giữ nguyên (timestamp). `verify_date_unify` **28/28**; `verify_history` **47/47** (H13 → ISO); full suite 26/27 (chỉ my_work MW6 flaky). v6.36.
> **S67.1 (Revert GAS — hạ tầng)**: Trỏ backend **về tài khoản cá nhân** (bỏ hướng S59 cơ quan) vì **ANBM không xử lý được + noti không chạy trên mạng nội bộ**. `config.js` GS_WEBAPP_URL → `AKfycbydyik…97f2`; `constants.js` GS_SHEET_ID + `Config.gs` SPREADSHEET_ID → Sheet cũ `1cpg1p_8…56Hk`. Thuần config, deployment cá nhân cũ vẫn live (không deploy GAS mới). ⚠️ Giá trị cơ quan (`AKfycbw1…DSg`/`1t4tkaw4…Zq4g`) **retired**; doc S59/S66 mô tả hướng cơ quan = **đã bỏ**. Data 04-08→10-08 chỉ ở Sheet cơ quan → user copy tay (đã chuẩn hoá qua migration S67.2). v6.35.
> **S66 (Initiative Category + ES health — DEBUG)**: (1) **Đồng nhất droplist Category** Initiative: NEW `INIT_CATEGORIES` (6 cũ + **Bất Động Sản**) + `_initCategories()` (chuẩn ∪ data) dùng CHUNG cho modal Thêm (`#initFCat`, trước hardcode) + filter Initiative (`#initSelCat`) + filter ES → danh sách giống hệt. (2)(3) Tab **Tổng hợp BLĐ** "Sức khỏe từng Initiative": droplist `#esInitCatFilter` (`esFilterInitCat`) **lọc theo Category**; `_esRenderInitTable` join `db.initiatives` → thêm cột **Tên** (thay ID) + **Phụ trách** (8 cột); dòng initiative thực → click mở `openInitViewPopup` (popup chi tiết có sẵn), BAU không click. Thuần frontend — **KHÔNG GAS deploy**. `verify_es_init_health` **14/14**; full suite 24/25 (chỉ H13 pre-existing). v6.34.
> **S65 (Concurrency guard — DEBUG)**: Sửa lỗi **ghi đè khi 2 người cùng tạo mới cùng lúc** ở **cả 5 entity** (Task/Case/Issue/Initiative+Milestone/Dev). Gốc: client sinh mã tuần tự từ **cache local** → trùng → upsert-theo-ID của người sau đè dòng người trước. Fix **server-authoritative**: NEW `backend/Concurrency.gs` (`_acquireWriteLock` script-lock + `reassignIdIfExists` tăng số cuối của prefix khi trùng); `Code.gs` bọc 5 handler `*-upsert` trong lock, `isNew` → reassign + trả `id`. Client gửi `isNew:true` khi create + `_adoptReassignedId()` nhận mã mới (toast `sync.id-reassigned`); edit gửi `isNew:false`. `verify_id_reassign` **17/17**; full suite **24/25** (chỉ H13 pre-existing). ✅ **GAS đã redeploy** (user, 2026-08-07, URL không đổi). v6.33.
> **S64 (Initiative CR)**: Trên **Theo dõi Initiative** — (1) **filter theo Accountable**: dropdown mới ở toolbar (distinct từ initiative gốc), lọc **cả card list lẫn 5 ô số** (đồng nhất Category); tiện thể fix `_initSetFilter` re-render cả `#initStatBar` (trước đổi Category/Accountable làm ô số lệch). (2) **Xóa Milestone**: nút 🗑 mỗi milestone row → `_initDeleteMilestone` xóa milestone + **gỡ link Task** (`task.milestone=''`, giữ Task + link initiative), confirm cảnh báo N task; optimistic (ghi GAS nền). Thuần frontend — **không GAS deploy**. i18n +3 key VI/EN. CR e2e **11/11**; `verify_initiative_tracker` 19/19; `verify_i18n_p6` **29/29** (cập nhật index + coverage Accountable). Fail dai dẳng: history H13 pre-existing. v6.32.
> **S63 (Async/Optimistic CRUD)**: Rà soát toàn bộ CRUD. **Initiative Tracker** là điểm lệch duy nhất còn **await network GAS TRƯỚC khi render** → đưa `_initSave`/`_initDelete`/`_initFixLooseLink` về **optimistic** (mutate local → persist → render NGAY; ghi GAS atomic chạy nền) như Task/Case/Issue/Dev đã làm từ S29/S30. **Bỏ toast thành công** ở add/edit/delete cả **5 entity** → "chỉ báo khi lưu không thành công" (toast lỗi vẫn ở `_gas*Upsert/Delete` + `syncDot`). Giữ bulk-summary toast & manual-sync. `syncInitiativeAction/Delete` giờ dead code (giữ, dọn sau). Thuần frontend — **không GAS deploy**. Full suite **22/24** (2 fail pre-existing: my_work MW22/MW23, history H13 — 0 regression); suite liên quan xanh: initiative 19/19, dev 40/40, case 22/22, atomic 41/41, issue 61/61. v6.31.
> **S62 (Report Week)**: "Tuần BC" của Task từ **1 chuỗi free-text → membership ĐA TUẦN chuẩn ISO-8601**. Hàm gốc `taskReportWeeks(task)=autoWeeks(Start→max(Deadline, hôm-nay nếu chưa xong)) ∪ pinnedWeeks(gắn tay)` — mọi read path (preset/filter/report/dashboard/quickview/performance) dùng chung. Modal thay `<input text>` bằng **chip control** (chip auto từ ngày + chip pin qua `<input type="week">` ISO). Cột `Tuần BC` chỉ lưu **pin ngoài auto** → majority 0 nhập liệu. Migration `backend/ReportWeekMigration.gs` (dry-run/commit) chuẩn hoá free-text cũ. Chỉ Task (Case sau). `verify_report_week` **17/17**; full suite 22/24 (2 pre-existing). ⚠️ Ngữ nghĩa: overdue-extension → "Tuần này" ≈ mọi task đang mở. Xem `AI_CONTEXT/REPORT_WEEK_DESIGN.md`.
> **S61 (Auto-complete)**: %HT=100 ⇒ tự đặt trạng thái hoàn thành (Task `state='Hoàn thành'` / Initiative root `status='Done'` / Dev). Case & Bug bỏ qua (không có %). `helpers.js` norm* + `normalizeCompleteInMemory` (renderAll display) + enforce khi save + nút **"Chuẩn hoá HT"** (admin, toolbar Tasks) + `backend/DataCleanupService.gs` (bulk). v6.29/6.29.1.
> **S60 (AI Assistant)**: Tinh chỉnh AI Chat (Gemini) sau migrate key cơ quan (S59), 3 commit. (a) model `gemini-2.5-flash`→**`gemini-flash-latest`** (key mới từ chối model cũ). (b) v6.27: server tự tính "SỐ LIỆU TÍNH SẴN" (đếm deterministic) + `maxOutputTokens` 1024→2048 + bỏ ép ngắn + **bỏ Audit_Log khỏi context** (nhẹ → nhanh → ít 404) + `ai-chat.js` **retry 3× backoff riêng cho AI** (read-only, không đụng `gasPost` global). (c) v6.28: `_aiTaskIndex_()` sinh **CHỈ MỤC TOÀN BỘ task** (fix "AI chỉ xem 300 task") + rich detail cap 200 gần nhất; `_aiRenderMarkdown()` render **bảng/đậm/code/bullet** trong bubble bot (esc TRƯỚC → chống XSS, user msg vẫn plain). **GAS đã redeploy (URL không đổi)** → live. Thuần AI feature. Tests: full suite **21/23** (2 fail pre-existing: H13 stale TD-TEST-02, my_work flaky TD-TEST-01 — 0 regression).
> **S59 (hạ tầng)**: Chuyển toàn bộ **GAS backend (script + Sheet DB + email nhắc việc)** từ tài khoản Google **cá nhân → tài khoản cơ quan `cb_sptd_7@tpbank.vn`** (Google Workspace) để đảm bảo ANBM. Thuần đổi config, **không đổi schema/logic/feature**. Sửa 4 file: `Config.gs` (SPREADSHEET_ID → Sheet copy cơ quan `1t4tkaw4…Zq4g`), `config.js` (GS_WEBAPP_URL → deployment mới `AKfycbw1…DSg`; v6.26), `constants.js` (GS_SHEET_ID sync), `index.html` (cache-bust `?v=20260804`). Email digest giờ phát từ `@tpbank.vn` (MailApp dùng account sở hữu script — không sửa code). **Quyết định**: kịch bản A (Workspace, data ở lại Google được chấp nhận, frontend giữ public); Sheet **copy** (ID mới) vì không transfer ownership consumer↔Workspace được. **Còn thủ công phía GAS**: tắt trigger `notifScan` project cá nhân cũ (tránh email 2 lần) + đối chiếu `AUTH_SECRET`. **Rollback**: giữ deployment+Sheet cũ, revert `config.js`. Tests: full suite 20/23, 3 fail đều pre-existing (chứng minh qua git stash) — 0 regression do migration.
> **S58.2**: **My Work** — page width về **chuẩn** (`.mw-page` bỏ double-padding + cap 1200px → full-width như mọi view; AI Chat 860px giữ nguyên vì cố ý). **"Cần làm ngay" chia 2 cột: Quá hạn (diff<0) | Sắp đến hạn (diff≥0, hôm nay+≤7d)** — mỗi cột count + sort soonest-first + empty "Không có"; mobile stack 1 cột. +i18n `mw.urgent.col.soon/none`. Audit toàn hệ thống: chỉ My Work lệch chuẩn. v6.25. Tests: urgent MW12/MW13 PASS (suite flaky TD-TEST-01, không do S58.2).
> **S58.1 FIX**: Dev Plan bảng — sửa **đè chữ** (name đè target) + **nút Sửa/Xóa đè cột Ghi chú** + textarea modal **auto-grow theo nội dung** + **page width đồng bộ** .content. Gốc: global `table{white-space:nowrap}` (table.css:61) làm cell `table-layout:fixed` (S58) vẫn tràn. Sửa: `.dev-table td{white-space:normal}` (+ `.dev-table td.dev-cell-date` nowrap giữ ngày 1 dòng), header wrap, buttons compact + cột actions 58→78px, `.dev-autogrow` + `_devAutoGrow()`, `.dev-page` padding 2px→0. v6.24. Tests `verify_dev_plan` **40/40**.
> **S58 NEW**: **UI layout fit** — (1) **Dev Plan** bảng danh sách hết tràn ngang: bỏ `min-width:900px` → `table-layout:fixed; width:100%`, cell free-text wrap, `.dev-cell-date` giữ 1 dòng, thu gọn width cột → fit 1 màn hình (scroll ngang chỉ là fallback <720px). (2) **Action Plan** kanban giãn lấp đầy: `.kanban-col` `flex:0 0 260px` → `flex:1 1 0; min-width:240px`. (3) **`AI_CONTEXT/UI_CONCEPT.md` (NEW)** — contract layout để tính năng sau tự tối ưu (fit-one-screen table, stretch-to-fill board, thang width modal, breakpoint chuẩn, checklist pre-merge). Thuần frontend — **không cần GAS deploy**. `.kanban-*` chỉ Action Plan dùng (Case Pipeline = `.cp-col`). Tests: `verify_dev_plan` **40/40**, `verify_action_plan` **24/24**.
> **S57 NEW**: Chuông 🔔 topbar — nhắc **sắp/đến/quá hạn** (3d/1d/hôm nay/quá hạn) + **tạo** + **đóng** cho Task/Case/Issue/Initiative+Milestone/Dev Plan. Click noti → deep-link mở popup công việc. **Email digest 1/ngày** (MailApp). Read-state per-user ở sheet `Notifications`. GAS = (1) trigger `notifScan()` ~8h ghi sheet + gửi email; (2) real-time `notifOnWrite()` trong doPost (created/closed). Chuông client poll `notif-read` (load/Sync/5'). **✅ GAS đã deploy (2026-08-02, URL không đổi) + `installNotifTrigger()` đã bật; smoke test production OK.** Tests: `verify_notifications` **21/21**.
> **S56 NEW**: Đồng nhất date input trên mọi modal thêm/sửa. Initiative/Milestone (`initFStart/initFDeadline/initFMsDl`) từ **free-text → `<input type="date">`**; **giữ nguyên storage `DD-MMM-YY`** (convert ở biên: `_initToISO` khi mở Sửa, `_initFromISO` khi Lưu → 0 rủi ro sheet/backend/history/export). Dev Plan `devfStart` giờ **mặc định hôm nay** khi Add. Quy tắc chốt: mọi date field = native picker; **chỉ Start Date default hôm nay**, Deadline để trống. Thuần frontend — **không cần GAS deploy**. Tests: `verify_initiative_tracker` **19/19**, `verify_dev_plan` **40/40**, round-trip E2E **11/11**.
> **S55 NEW**: "Theo dõi Initiative" — (1) tách Done ra section thu gọn "Đã hoàn thành (N)" ở cuối (collapse mặc định, lazy render; gọn khi ~70 initiative); (2) ô số tổng đồng nhất `.cp-stat-card` (icon+số+nhãn) grid 5 ô như Case Pipeline; (3) mỗi ô số → view popup `#initSummaryOverlay` short-list table (row → chi tiết). Ô số + popup đếm theo **scope + Category** (không áp Status). Thuần frontend — **không cần GAS deploy**. Tests: `verify_initiative_tracker` **19/19** → **22/22 suites PASS**.
> **S54 NEW**: Left menu "Plan phát triển bản thân" (nhóm Tổng quan, G+V). Sheet `Dev_Plan` (12 cột) + `DevPlanService.gs` + 3 route `dev-*` (ownership gate). View `dev-plan.js` + section ở My Work. GAS **đã deploy** (dev-read/upsert/delete live, URL không đổi). Tests: **40/40** (verify_dev_plan).
> **S54.1 fix**: My Work giờ hiện **toàn bộ dev item đang làm của tôi** (trước chỉ hiện item quá hạn review >7 ngày → item vừa tạo bị ẩn cả tuần). Item quá hạn gắn badge "Cần review" + xếp đầu. `readDev()` re-render My Work khi load xong.
> **⚠️** `backend/RenameUserService.gs` bị nối đoạn PowerShell chứa API key ở cuối (không do S54) — chưa commit; cần dọn + thu hồi key.
**Schema**: Task_Master **25 cột** (S73: +cột 25 'RAG'=Health Green/Amber/Red; A1:Y). ⚠️ `taskToRow` positional — cột mới PHẢI append cuối + migration set header.
**GAS URL (current)**: `https://script.google.com/macros/s/AKfycbydyikBtboeDufx9fsloV3pOT-EVgQfpkggImGH3GrQ8Skct5XC1B1KtE7U008G97f2/exec` (S67 — REVERT về tài khoản **cá nhân**; Sheet `1cpg1p_8…56Hk`)
**GAS URL (retired, S59 cơ quan — KHÔNG dùng)**: `AKfycbw1…DSg/exec` + Sheet `1t4tkaw4…Zq4g` (tài khoản `cb_sptd_7@tpbank.vn`) — bỏ vì ANBM + noti nội bộ. Giữ tham chiếu để merge data 04-08→10-08 nếu cần.
**Owner tài khoản GAS/Sheet (current)**: tài khoản **cá nhân** (S67 revert). Hướng cơ quan S59 = đã bỏ.

---

## Branch Strategy (CONFIRMED S24 — master xóa hoàn toàn)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + Development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**`master` đã xóa cả local lẫn remote từ 2026-06-16 (S24). Không tạo lại.**

---

## Source Files

| File | Lines | Status |
|---|---|---|
| `index.html` | ~1870 | ✅ S49: cache-bust `?v=20260710` (56 refs); S44a: +#mwInitPopup overlay; S43: data-i18n on tasks filter labels |
| `backend/GAS.GS` | 535 | ✅ Archived patch — moved from root to backend/ |
| `backend/AiService.gs` | ~250 | ✅ S60: model `gemini-flash-latest`; `_aiTaskIndex_()` (chỉ mục toàn bộ task) + `_aiResolveTaskCols_()`/`_aiTrunc_()` + `_aiTaskSummary_()` deterministic + rich detail cap 200; drop Audit_Log; maxOutputTokens 2048. **GAS deployed (URL không đổi)** |
| `backend/Code.gs` | ~200 | ✅ S65: 5 handler `*-upsert` bọc `_acquireWriteLock()` + reassign khi `isNew` + trả `id`; S24: xóa `user-list` khỏi ADMIN_ONLY; S19: +case-pipeline routes |
| `backend/Concurrency.gs` | ~95 | ✅ S65: NEW — `_acquireWriteLock()` (script lock 20s) + `reassignIdIfExists(sheetName,id)` (tăng số cuối prefix khi trùng) chống ghi đè create đồng thời |
| `backend/UserService.gs` | ~130 | ✅ NEW S13 — deployed |
| `backend/Config.gs` | 6 | ✅ S18: comment A1:X |
| `backend/AuthService.gs` | ~165 | ✅ deployed |
| `backend/SheetService.gs` | ~65 | ✅ deployed |
| `backend/AuditService.gs` | 32 | ✅ deployed |
| `backend/KpiSheetService.gs` | 51 | ✅ deployed |
| `backend/InitiativeService.gs` | 60 | ✅ deployed |
| `backend/CasePipelineService.gs` | ~65 | ✅ NEW S19 — **deployed GAS** (2026-06-15) |
| `assets/js/constants.js` | ~65 | ✅ S40: TEAM_LIST 8→7 teams (BL1+BL2 merged → BL); S31: +`deletedIds: []` in db init; S21: +TEAM_LIST (offline fallback) |
| `assets/css/my-work.css` | ~560 | ✅ S44b: .mw-champion-section/item/status/pending/done; S44a: .mw-popup-ini-item; S42 base styles |
| `assets/js/views/my-work.js` | ~380 | ✅ S44b: _mwGetChampionTasks/BuildChampionSection/mwRefreshChampionStatus; S44a: mwOpenInitPopup/Close, MAX_INIT=4; S42 base |
| `assets/js/config.js` | 7 | ✅ S66: APP_VERSION = '6.34-init-category-es-health-20260807'; S59: GS_WEBAPP_URL → deployment cơ quan `AKfycbw1…DSg` |
| `assets/js/views/executive-summary.js` | ~350 | ✅ S66: `_esRenderInitTable` join `db.initiatives` (Tên+Phụ trách, 8 cột) + `esFilterInitCat`/`_esInitCatFilter` (filter Category) + click→`openInitViewPopup`; S48: i18n |
| `assets/js/helpers.js` | ~230 | ✅ S62: ISO week utils + `taskReportWeeks` (gốc membership đa-tuần) + `allReportWeeks`/`taskWeeksBadge`; S61: auto-complete norm* + `cleanupCompleteByProgress` |
| `backend/ReportWeekMigration.gs` | ~90 | ✅ S62: NEW — `dryRunNormalizeWeeks()`/`commitNormalizeWeeks()` chuẩn hoá `Tuần BC` free-text → ISO (đa giá trị) |
| `backend/DataCleanupService.gs` | ~140 | ✅ S61: NEW — `dryRun/commitCompleteByProgress()` bulk %=100 ⇒ hoàn thành (Task/Initiative/Dev) |
| `verify_report_week.mjs` | ~130 | ✅ S62: NEW — 17/17 (ISO biên năm, range, overdue-extend, union, parse, badge) |
| `assets/js/crud.js` | ~330 | ✅ S62: chip control tuần (`_tuanInit/_tuanRenderChips/_tuanAddWeek/_tuanRemove`); S61: `normTaskComplete` khi save |
| `assets/js/views/ai-chat.js` | ~200 | ✅ S60: `_aiRenderMarkdown()` renderer GFM an toàn (esc trước; bảng/đậm/code/bullet) cho bubble bot; retry 3× backoff scope-AI khi GAS 404/5xx |
| `assets/css/ai-chat.css` | ~240 | ✅ S60: `.ai-md-table`/`.ai-md-list`/`code` style trong bubble bot (theme-aware) |
| `assets/css/my-work.css` | ~600 | ✅ S58.2: `.mw-page` full-width (bỏ padding 20/24 + max-width 1200) + `.mw-urgent-cols` grid 2 cột (Quá hạn|Sắp đến hạn); S44b base |
| `assets/js/views/my-work.js` | ~410 | ✅ S58.2: `_mwBuildUrgentSection` chia 2 cột overdue/soon + `_mwUrgentTaskItem/CaseItem`; S54.1: dev review all active; S44b base |
| `assets/css/dev-plan.css` | ~250 | ✅ S58.1: `.dev-table td{white-space:normal}` (override global nowrap) + `td.dev-cell-date` nowrap + header wrap + `.btn-sm` compact + `.dev-autogrow` + `.dev-page` pad 2px→0; S58: `table-layout:fixed; width:100%`; S54: base |
| `assets/js/views/dev-plan.js` | ~490 | ✅ S58.1: header name/target auto-width + actions 78px + `_devAutoGrow()`; S58: thu gọn width cột + `.dev-cell-date`; S54.1: My Work all active; S54: base |
| `assets/css/kpi.css` | ~90+ | ✅ S58: `.kanban-col` `flex:1 1 0; min-width:240px` (giãn lấp đầy, was 0 0 260px) — chỉ Action Plan dùng |
| `AI_CONTEXT/UI_CONCEPT.md` | NEW | ✅ S58: contract layout (fit-one-screen table, stretch-to-fill board, width modal, breakpoint, checklist pre-merge) |
| `backend/NotificationService.gs` | ~620 | ✅ S74: RETRACT nhắc due/overdue khi entity done/mất — `_NOTIF_DUE_TYPES` + `_notifRetractEntity_` (real-time trong `notifOnWrite`) + `_notifLiveState_`/`_notifRetractStale_` (daily trong `notifScan`, trước digest) + `notifRetractStalePreview` dry-run + bump `DATA_VER`. **✅ Redeployed (link không đổi)**. S57: NEW — sheet `Notifications` + `notifScan()` (trigger ~8h) + `notifOnWrite`/`notifPrior_` + `notifRead`/`notifMarkRead` + email digest |
| `assets/js/views/notifications.js` | ~185 | ✅ S57: NEW — bell badge + dropdown nhóm + deep-link dispatcher (`open*ViewPopup`) + mark-all + outside-click/ESC |
| `assets/css/notifications.css` | ~160 | ✅ S57: NEW — bell/badge/panel/item, dark-mode |
| `backend/MigrationService.gs` | ~55 | ✅ S40: NEW — `dryRunTeamBL()` / `commitTeamBL()` for Task_Master+Case_Pipeline+User_Master BL1/BL2→BL migration |
| `backend/RenameUserService.gs` | ~90 | ✅ S53: NEW — `dryRunRenamePhuong()` / `commitRenamePhuong()` — rename PhuongNPL_C → PhuongNPL trên 5 sheets (User_Master, Task_Master, Case_Pipeline, Issue_Tracker, Initiative_Master); Audit_Log KHÔNG chạm |
| `assets/css/layout.css` | ~132 | ✅ S35: `.sidebar { height:100vh }` + `.nav-menu { min-height:0 }` + sidebar scrollbar CSS — fixes left menu scroll on desktop |
| `assets/css/responsive.css` | ~65 | ✅ S37: `.topbar{position:fixed;top:0;left:0;right:0;z-index:150}` on mobile; `content{padding-top:74/68px}`; `thead{top:62/56px}`; `.toolbar{flex-direction:column}` + full-width left/right; `.path-hint{display:none}` |
| `assets/css/forms.css` | ~25 | ✅ S23: .form-grid → minmax(0,1fr) minmax(0,1fr); .form-group min-width:0; .form-control width:100% min-width:0 |
| `assets/css/case-pipeline.css` | ~425 | ✅ S24: +.cp-view-grid/.cp-view-row/.cp-view-label/.cp-view-val/.cp-view-section CSS cho cpViewOverlay; S23: .cp-modal-grid fix; S20: view toggle, stage chips, RAG dots |
| `assets/css/initiative.css` | ~360 | ✅ S23: .init-modal-grid → minmax(0,1fr) minmax(0,1fr) |
| `assets/css/auth.css` | ~150 | ✅ S23: +body[data-role="User"] .lead-only { display:none !important } |
| `assets/js/auth.js` | ~265 | ✅ S23: +canImport() → Admin || Teamlead |
| `assets/js/crud.js` | ~295 | ✅ S38: `_editOrigTask` snapshot + `_hasTaskChanged()` + conflict check in `handleSubmit` (readFromHandle before save, VERSION_CONFLICT dialog); S31: deleteTask adds to deletedIds; S29: atomic GAS writes |
| `assets/js/views/tasks.js` | ~400 | ✅ S43: renderFilterChips uses t()+tState(); renderTaskTable count/empty use t(); _populateFilterPic "Tất cả"→t('common.all'); S32: sortBy() clears selectedIds; S31: onFilterChange clears; S24: PA1; S23: +_populateFilterPic |
| `assets/js/i18n.js` | ~595 | ✅ S51: +6 kp.*/oa.* keys (Phase 8 — KPI Overview + Owner Analysis); S50: +74 gantt.*/ai.*/branch.*/um.* keys; S49: +52 it.* keys; S43: STATE_KEY+tState(); S39: Phase 1 |
| `assets/js/helpers.js` | ~80 | ✅ S43: stateChip() uses tState() for language-aware label |
| `assets/js/views/case-pipeline.js` | ~740 | ✅ S24: +openCaseViewPopup(), closeCaseViewPopup(), cpViewOpenEdit(), _cpViewId; cpOpenDetail() → openCaseViewPopup(); S23: DVKD col+filter, PIC cascade |
| `assets/js/views/performance.js` | ~85 | ✅ S24: +openPerfTaskPopup(key) — click row → detailOverlay với tasks lọc theo perfTab |
| `assets/js/views/initiative-tracker.js` | ~975 | ✅ S66: `INIT_CATEGORIES`(+Bất Động Sản)/`_initCategories()` dùng chung modal+filter; S64: filter Accountable (`_initFilterAcc`/`#initSelAcc`/`_initAccountableOptions`; `_initSetFilter` re-render cả `#initStatBar`); `_initDeleteMilestone` (xóa milestone + gỡ link task, optimistic); S63: `_initSave`/`_initDelete`/`_initFixLooseLink` optimistic; S56: 3 date field → `<input type="date">` (storage `DD-MMM-YY` qua `_initToISO`/`_initFromISO`); S55: stat bar `.cp-stat-card`, tách Done, summary popup; S49: i18n; S27: ms auto-gen ID; S25: view popups |
| `assets/js/api.js` | ~390 | ✅ S31: `syncAction` merge skips `db.deletedIds`; `readFromHandle` prunes stale deletedIds; S30: atomic helpers; S24: PA2 _resolvePickerCase |
| `assets/js/parsers.js` | ~325 | ✅ S24: +_resolvePickerCase() — map picRes/picAcc → canonical Username từ _appUsers; gọi cuối _parseArrayIntoDb() |
| `assets/js/ui/navigation.js` | ~120 | ✅ S31: `navigateTo('tasks')` now calls `selectedIds.clear()` before render; removed 7 duplicate filter listeners from `setupListeners`; S24: +closeCaseViewPopup() in Escape handler |
| `assets/js/crud.js` | ~280 | ✅ S31: `deleteTask()` adds id to `db.deletedIds`; `handleSubmit()` splices from `db.deletedIds` on re-add; S29: atomic GAS writes; S21: User_Master dropdowns |
| `assets/js/bulk.js` | ~62 | ✅ S31: `bulkDelete()` pushes ids to `db.deletedIds`; S30: atomic per-row writes; NO syncAction |
| `assets/js/views/bld-queue.js` | ~390 | ✅ S29: task BLD approval → `await syncAction()`; Case BLD still syncCaseAction |
| `assets/js/storage.js` | ~30 | ✅ S31: `loadDb()` now loads `db.deletedIds` from localStorage if present |
| `assets/js/app.js` | ~365 | ✅ S51: renderAll() +2 guards (kpi-overview/owner-analysis); S50: +4 guards (gantt/ai-chat/branch-analysis/user-management); S31: handleImport skips deletedIds |
| `assets/js/views/quickview.js` | ~480 | ✅ S48: t()-shadowing fix (map t→tk in 4 callbacks); renderQuickView() calls _qvPopulateFilters()+_qvUpdateTime() for live lang switch |
| `assets/js/views/executive-summary.js` | ~310 | ✅ S48: 6 t() calls wired (chart empty, attention empty, cfg labels, more-link, init table empty, status tags via t('es.risk.*')) |
| `verify_i18n_p5.mjs` | ~194 | ✅ S48: NEW — 24/24 PASS; covers QV filter/subtitle/labels, ES attention/init-table, EN/VI switch |
| `assets/js/api.js` | ~380 | ✅ S30: syncAction() logs caller stack on every call (debug trace, temporary); S29: atomic GAS write helpers (_gasTaskUpsert/_gasTaskDelete/_gasCaseUpsert/_gasCaseDelete); S24: _resolvePickerCase() |
| `assets/js/initiatives.js` | ~170 | ✅ S29: syncInitiativeAdd/Edit thêm `return` → expose promise; S20: syncInitiativeAction() gold standard |
| `assets/js/ui/navigation.js` | ~120 | ✅ S19: G+C shortcut, case-pipeline title, renderCasePipeline dispatch |
| `assets/js/app.js` | ~325 | ✅ S21: +loadAppUsers() non-blocking on startup (after autoConnectDB) |
| `assets/js/crud.js` | ~420 | ✅ S21: openTaskModal() uses _populateTeamSelect/_populateUserSelect; +onTaskTeamChange() (re-filter both PICs + autoGenId) |
| `assets/js/views/bld-queue.js` | ~380 | ✅ S18+S19: case card [CASE], _bldGetPendingCases, multi-source approve/reject, yKienBLD |

---

## Feature Status

| Feature | Works? | Notes |
|---|---|---|
| **🔗 H2 Task↔Milestone linking (popup chọn task)** | ✅ | S70: nút "+ Task" mỗi mốc → popup search/filter task theo Res\|\|Acc của chủ mốc (khớp username∪display-name); 1 mốc↔nhiều task (TaskRef CSV); owner-gated `h2-milestone-tasklink`; chip→chi tiết common; × unlink. 28/28 test. **GAS redeployed (link không đổi)** |
| **🌱 H2 Seed pilot (QuangNN3+DungLQ1)** | ✅ | S70: `backend/H2SeedPilot.gs` dryRun/commit idempotent nạp 8 sheet H2_* từ SAMPLE MD; chạy trong GAS editor. Giải quyết TD-H2-02 |
| **🩺 ES Sức khỏe Initiative (name/acc/filter/popup)** | ✅ | S66: bảng join `db.initiatives` → cột Tên + Phụ trách; droplist filter Category; click dòng → `openInitViewPopup`. 14/14 test. Thuần frontend |
| **🏷️ Initiative Category đồng nhất (+Bất Động Sản)** | ✅ | S66: `INIT_CATEGORIES`/`_initCategories()` dùng chung modal Thêm + mọi filter; thêm "Bất Động Sản" |
| **🔒 Guard tạo trùng đồng thời (5 entity)** | ✅ | S65: server reassign mã dưới `LockService` khi 2 người tạo cùng lúc → hết ghi đè. `Concurrency.gs` + `isNew`/`_adoptReassignedId`. 17/17 spec test. **GAS deployed (2026-08-07, URL không đổi)** |
| **📅 Tuần báo cáo Task (đa-tuần ISO)** | ✅ | S62: membership `taskReportWeeks` = auto(Start→max(Deadline,hôm nay)) ∪ pinned; modal chip control (`<input type="week">`); migration `ReportWeekMigration.gs`. Chỉ Task (Case sau). 17/17 tests. ⚠️ "Tuần này" ≈ mọi task đang mở |
| **✅ Auto-complete %=100** | ✅ | S61: %HT=100 ⇒ trạng thái hoàn thành (Task/Initiative root/Dev); nút "Chuẩn hoá HT" admin + `DataCleanupService.gs` bulk. Case/Bug bỏ qua (không có %) |
| **🔔 Notification bell** | ✅ | S74: **RETRACT** nhắc due/overdue khi entity done/mất (real-time onWrite + daily scan + dry-run) → hết "task đã đóng vẫn nhắc". S57: nhắc sắp/quá hạn + tạo + đóng cho 5 entity; deep-link popup; email digest 1/ngày; read-state per-user (sheet `Notifications`); trigger `notifScan()` ~8h + real-time `notifOnWrite()`. 19/19 retract + 21/21 UI tests. **GAS redeployed (link không đổi)** |
| **i18n Phase 8 — KPI Overview + Owner Analysis** | ✅ | S51: +6 keys (kp.btn.*, kp.section.*, oa.tab.ranking); toolbar buttons + section headers + ranking tab; domain KPI data intentionally kept; 13/13 + 20/20 regression |
| **i18n Phase 7 — Gantt, AI Chat, Branch, UM** | ✅ | S50: +74 keys; gantt subtitle/empty; ai-chat header/suggestions (_getAiSuggestions() fn); branch zones/stats/cols; UM ~45 strings + _umUsers cache skip + _umRestoreFilterUi(); 35/35 + 19/19 regression |
| **i18n Phase 6 — Initiative Tracker** | ✅ | S49: all ~52 IT hard-coded VI strings → t(); dashboard 'Dự án: ' fix; app.js filterInit/filterTuanBC; 27/27 PASS + 18/18 regression |
| **i18n Phase 5 — Quick View + Executive Summary** | ✅ | S48: QV filter/subtitle/labels + ES attention/init-table/status-tags bilingual; t()-shadowing fix (map t→tk); renderQuickView() live lang switch; 24/24 PASS + 17/17 regression |
| **Milestone auto-gen ID + Add Task** | ✅ | S27: "Thêm Milestone" tự gen ID `{parentId}-M{n}` + pre-fill category; "+ Task" btn trên mỗi milestone → task modal pre-filled (initiative, milestone, category, PIC, team, auto-gen ID) |
| **Task view popup** | ✅ | S25: click row → taskViewOverlay (read-only); Chỉnh sửa → edit modal; sau save → popup re-opens |
| **Initiative view popup** | ✅ | S25: click card header → initViewOverlay (read-only); Chỉnh sửa → _initOpenModal; sau save → popup re-opens |
| **Return-to-popup sau save** | ✅ | S25: _taskEditReturnId / _initEditReturnId pattern; cancel (ESC/Hủy) không re-open |
| **Case Pipeline (Table + Kanban)** | ✅ | S24: +read-only view popup (cpViewOverlay) + Edit btn cho Admin/Teamlead; S20: Table-primary; S19: GAS deployed |
| **Case Pipeline view popup** | ✅ | S24: click row/card → cpViewOverlay (read-only); Edit btn → cpModal (canImport() only) |
| **Case Pipeline DVKD column + filter** | ✅ | S23: Cột ĐVKD thêm vào bảng; filter ĐVKD dropdown trong filter bar; cascade cpFilterPic từ Team |
| **Task filter PIC preserve after save** | ✅ | S26: remove filterPic rebuild from updateFilterDropdowns(); _populateFilterPic() owns filterPic exclusively — value preserved through localAction() |
| **Task filter PIC cascade** | ✅ | S23: cascade; S24: picRes case-insensitive compare + _resolvePickerCase() canonical mapping |
| **Display_Name (Username) dropdowns — tất cả roles** | ✅ | S24: user-list không còn ADMIN_ONLY → non-Admin/Teamlead cũng load _appUsers → dropdowns nhất quán |
| **BLD Queue role gate** | ✅ | S24: Phê duyệt/Từ chối/Yêu cầu bổ sung ẩn với non-Admin; Xem đầy đủ luôn hiện |
| **Performance task popup** | ✅ | S24: click row → openPerfTaskPopup(key) → detailOverlay mở với tasks lọc theo tab |
| **Import Excel RBAC** | ✅ | S23: Import button ẩn với User role (lead-only CSS); canImport() JS guard trong handleImport() và importCasesFromExcel() |
| **Modal 2-column layout** | ✅ | S23: minmax(0,1fr) fix — cả 3 modal grids (Task/Case/Initiative) equal-width columns |
| **Pre-fill Team/PIC từ logged-in user** | ✅ | S22b: Add modal (Task/Case/Initiative) tự pre-fill Team + PIC Accountable từ user hiện tại |
| **Task/Case/Initiative Team+PIC dropdowns** | ✅ | S21: Driven by User_Master (GAS user-list); cascaded Team→PIC; offline fallback to TEAM_LIST + currentVal |
| **Case CRUD** | ✅ | Add/Edit/Delete với validation; auto-gen CP-XXX ID; modal |
| **Case Excel Import/Export** | ✅ | 20 cột; import merge by ID; export với column widths |
| **Case BLD Queue integration** | ✅ | Case canBLD=Y → badge [CASE] trong BLD Queue; approve/reject/info lưu yKienBLD |
| **BLD Approval Queue (Tasks)** | ✅ | S16+S17+S18 — **46/46 PASS** (no regression S19) |
| **Ý kiến Ban lãnh đạo (yKienBLD)** | ✅ | S18 — cột 24 Task_Master; S19 — cột 20 Case_Pipeline |
| **Executive Summary** | ✅ | S15 |
| Dashboard KPIs | ✅ | |
| Task list + filters + presets | ✅ | |
| Task CRUD (GAS sync) | ✅ | S30: Single CRUD + Bulk → atomic per-row writes (`_gasTaskUpsert`/`_gasTaskDelete`). syncAction() chỉ còn cho Excel import. |
| Gantt / Timeline | ✅ | |
| Auto weekly report | ✅ | |
| KPI Overview / Progress / Owner | ✅ | |
| Initiative Tracker | ✅ | S64: filter **Accountable** (lọc card + ô số) + **xóa Milestone** (gỡ link task, giữ task); S56: date field → native picker (storage `DD-MMM-YY`), Start default hôm nay; S55: tách Done, stat cards `.cp-stat-card`, summary popup; S14 milestone drill-down; S20: syncInitiativeAction() |
| **Action Plan v2** | ✅ | S34: role-aware default (Admin=all teams grouped accordion; User/TL=own team kanban); mixed Tasks+Cases kanban; Blocked/overdue auto-add; Initiatives section; 24/24 tests pass |
| **Audit history tab** | ✅ | S33: Task/Initiative/Case view popups — History tab, lazy load from GAS audit-read; startDate defaults today on Add |
| **AI Assistant** | ✅ | S60: model `gemini-flash-latest`; chỉ mục toàn bộ task (fix "chỉ 300 task") + số liệu deterministic + render bảng Markdown; retry 404/5xx. **GAS deployed, GEMINI_API_KEY (key cơ quan) live.** ⚠️ chưa có test tự động (TD-TEST-03) |
| User Management | ✅ | Admin-only; S13 CRUD; S22: search/filter/sort/pagination added (TD-030 resolved) |
| Login / Auth | ✅ | S11+S18 verified |
| Optimistic Locking | ✅ | Task_Master; Case_Pipeline không cần (simple write-all) |
| Dark mode | ✅ | |

---

## Architecture State

```
CURRENT (Session 21 — Team/PIC User_Master + Case Pipeline Table-primary)
─────────────────────────────────────────────────────────
index.html (~1150 lines — HTML only)
assets/
  css/  tokens.css, base.css, layout.css, components.css,
        forms.css, table.css, gantt.css, quickview.css,
        responsive.css, kpi.css, initiative.css, auth.css,
        ai-chat.css, executive-summary.css, bld-queue.css
        case-pipeline.css    ← NEW S19 (260 lines, cp- prefix)
  js/   config.js, constants.js (+CASE_STAGES/COLS/dbCases), helpers.js,
        storage.js, parsers.js, auth.js
        api.js (+Case API: caseToRow/rowToCase/genCaseId/calcCaseRag/
                readCases/writeCases/syncCaseAction/persistCases/loadCasesFromCache)
        ui/toast.js, ui/modal.js, ui/theme.js, ui/navigation.js
          ← S19: G+C shortcut, case-pipeline title, renderCasePipeline dispatch
        crud.js, bulk.js
        views/dashboard.js, views/tasks.js, views/gantt.js,
              views/performance.js, views/quickview.js
        report.js, kpi-data.js, kpi-parser.js
        views/kpi-overview.js, views/action-plan.js, views/kpi-progress.js
        views/owner-analysis.js, views/branch-analysis.js, views/rm-analysis.js
        views/initiative-tracker.js, initiatives.js
        views/ai-chat.js, views/user-management.js, views/executive-summary.js
        views/bld-queue.js   ← S19: case cards, multi-source approve
        views/case-pipeline.js ← S20: Table-primary + preset + filter chips (~600 lines)
        app.js               ← S19: loadCasesFromCache, readCases, navBadgeCase
backend/
  Code.gs (+case-pipeline routes), Config.gs, AuthService.gs,
  SheetService.gs, AuditService.gs, KpiSheetService.gs,
  InitiativeService.gs, UserService.gs, AiService.gs, GAS.GS
  CasePipelineService.gs ← NEW S19 (deployed 2026-06-15)
verify_mobile_s37.mjs     ← S37 NEW — 21/21 PASS (M1–M10: topbar fixed, content pad, hamburger, sidebar, toolbar stack, path-hint, thead offset, scroll)
verify_case_pipeline.mjs  ← S20 — 22/22 PASS
verify_bld_queue.mjs      ← 46/46 PASS
verify_ms_tasks.mjs       ← 14/14 PASS
verify_filter_cascade.mjs ← S23 NEW — 23/23 PASS (Task PIC cascade + Case DVKD/PIC filter)
verify_import_rbac.mjs    ← S23 NEW — 15/15 PASS (3 roles × 5 assertions)
verify_modal_layout.mjs   ← S23 NEW — 9/9 PASS (3 modal grids, 0.0px column diff)
verify_action_plan.mjs    ← S34 NEW — 24/24 PASS (AP1–AP14: toolbar, period/RAG, accordion, kanban, initiatives)
verify_sync_fix.mjs       ← S29 — 24/24 PASS ⚠️ STALE after S30: bulk tests expect syncAction, now atomic
verify_atomic_write.mjs   ← S30 NEW — 41/41 PASS (single + bulk atomic: task-upsert/delete/case-upsert/delete)
verify_kpi_views.mjs      ← 3/3 PASS (S7)
um_test.mjs               ← 14/14 PASS (S13)
debug_login.mjs           ← S18 login diagnostics
```

---

## Google Sheets Connection

| Config | Value |
|---|---|
| `GS_WEBAPP_URL` | In `assets/js/config.js`; **updated S30** — new deployment với atomic action handlers |
| Task backend | ✅ Deployed — 24 cột (S18) |
| Case Pipeline backend | ✅ **Deployed** 2026-06-15 — Code.gs routes + CasePipelineService.gs live; GS_WEBAPP_URL không đổi |
| `GS_SHEET_ID` | `1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk` (S67 — REVERT về Sheet cá nhân; Sheet cơ quan `1t4tkaw4…Zq4g` retired) |
| Task sheet | `Task_Master!A1:Y` (25 cột — S73: +cột 25 'RAG') |
| Case sheet | `Case_Pipeline` (20 cột A→T; tự tạo khi chưa có) |

---

## Known Issues (Active)

| ID | Issue | Priority |
|---|---|---|
| TD-033 | `verify_initiative_v2.mjs` fail local (no auth inject) | 🟡 |
| MOB-01/02 | Topbar + toolbar trên mobile | ✅ **FIXED S37** — `position:fixed` + column stack |
| MOB-03 | Gantt trên mobile | 🟡 Phase D |
| DEBT-03/05/06 | Tech debt nhỏ | ⚪ |

---

## Deployment

| Environment | URL | Branch | Status |
|---|---|---|---|
| **Testing (local)** | `http://localhost:3030` | `main` | ✅ Dùng tạm |
| **Testing (Netlify)** | https://test-shtd.netlify.app | — | ❌ **Hết credit** |
| **Production** | GitHub Pages URL | `main` | ✅ Live (`41f4018` — S23 tất cả features merged via PR #27) |

---

## Deployment Process (Git Sync Protocol)

> **Quy tắc bắt buộc**: git tại remote phải LUÔN đồng bộ với local. Không để local differ với `origin/main`.

### Quy trình chuẩn mỗi thay đổi:
```
1. Thay đổi file(s) → chạy test local nếu có
2. git add <files>
3. git commit -m "type: mô tả ngắn"
4. git push origin HEAD:main   ← LUÔN push ngay, không delay
```

### Quy trình GAS deploy:
```
1. Sửa file backend/*.gs trong repo (git commit + push trước)
2. Copy nội dung vào Apps Script editor
3. Deploy → New deployment (hoặc Manage deployments → chọn version)
4. GS_WEBAPP_URL không đổi nếu dùng cùng deployment ID
5. Ghi chú version mới vào PROJECT_STATE.md → commit + push
```

### Không được phép:
- Code local mà không commit + push ngay
- Deploy GAS trước khi commit code vào git
- Để `master` differ với `main` (master không dùng từ S19)
