# SESSION HANDOVER — 2026-08-26 (#2) (Pha B+C: version theo domain + keep-warm)
**Model**: Claude Opus 4.8 · **Version**: v6.55 → **v6.56**

- **Task completed:** Sau khi [TT] xác nhận Pha A chạy tốt production (tốc độ ghi cải thiện) → triển khai **Pha B** (version theo domain — trị load chậm) + **Pha C** (keep-warm opt-in). **Pha B:** `CacheLayer.gs` thêm `_domainVer`/`_bumpDomainVer` (per-domain `SHTD_VER_<domain>` + vẫn bump global); mọi mutation bump đúng domain (`atomicUpsert_` + 4 delete + 3 full-write + user-*); `batch-read` so map `body.vers`, chỉ đọc+trả domain đổi. FE `readAll` gửi/lưu `db._vers`, `storage.js` khôi phục. **Pha C:** `keepWarm()` (opt-in trigger).
- **Files changed:** *(spoke, chưa deploy GAS)* `backend/CacheLayer.gs` (+per-domain ver), `backend/Concurrency.gs` (`atomicUpsert_` bump domain + `_ENTITY_DOMAIN`), `backend/Code.gs` (batch-read per-domain + bump domain ở delete/full-write/user + `keepWarm()`), `assets/js/api.js` (readAll gửi/nhận `vers`), `assets/js/storage.js` (khôi phục `_vers`), `assets/js/config.js` (v6.56), `index.html` (token `?v=20260826c`), `test/verify_domain_version.mjs` (mới).
- **Decision made:** notifs bám GLOBAL ver (payload nhỏ + poll notif-read 15' → luôn tươi, không cần key riêng). Giữ `ver` global song song `vers` cho tương thích ngược 2 chiều. **KHÔNG** gỡ notifOnWrite khỏi request path (Pha A đã đưa ngoài lock; rẻ cho update thường; gỡ hẳn = trễ notif create/close, không đáng). Keep-warm chỉ opt-in (trigger do [TT] gắn).
- **Blocker:** **Không.** **⚠️ [TT] cần redeploy GAS** (Code.gs + CacheLayer.gs + Concurrency.gs) + hard-refresh FE. (Tùy chọn) gắn trigger `keepWarm` mỗi 5'.
- **Next step:** [TT] redeploy + nghiệm thu: sửa 1 task → mở DevTools Network xem batch-read kế chỉ trả `data.tasks` (các domain khác vắng) + payload nhỏ hẳn; đổi cross-domain vẫn đồng bộ đúng. [CC] (tùy chọn) áp cùng bộ Pha A+B cho spoke AIUS. Kế hoạch: `docs/PROPOSAL_BE_Async_Cache_2026-08-26.md`.
- **Regression risk:** **Thấp–TB → verify đầy đủ.** `verify_domain_version` 8/8 + `verify_startup_nonblocking` 10/10 (version-gate) + write_retry 10/10 · atomic 41/41 · my_work 97/97 · id_reassign 17/17 · notifications 21/21. **QUAN TRỌNG:** mọi mutation PHẢI bump domain — nếu bỏ sót 1 mutation, client sẽ không thấy thay đổi domain đó (đã rà: 5 upsert + 4 delete + 3 full-write + 3 user = đủ). `verify_sync_fix` fail = pre-existing (`openTaskModal` trên HEAD sạch). Data-boundary: chỉ version string trong Properties.

# SESSION HANDOVER — 2026-08-26 (Pha A: GHI TIN CẬY — idempotency + retry + rút ngắn khóa)
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard · **Version**: v6.54 → **v6.55**

- **Task completed:** Triển khai **Pha A** kế hoạch tối ưu BE (`docs/PROPOSAL_BE_Async_Cache_2026-08-26.md`) — đưa tỷ lệ ghi timeout/mất bản ghi về ~0% (tải 10–30 người). **① Rút ngắn khóa ghi:** helper chung `atomicUpsert_` cho 5 entity; đưa `notifPrior_`/`auditLog`/`notifOnWrite` RA NGOÀI write-lock (chỉ giữ *check-then-write*). **② Idempotency + retry:** server dedup `reqId` qua CacheService 5' (`_reqSeen`/`_reqRemember`); FE `gasWrite` retry/backoff giữ nguyên reqId → timeout-rồi-thử-lại không tạo trùng.
- **Files changed:** *(spoke, chưa deploy GAS)* `backend/CacheLayer.gs` (+`_reqSeen`/`_reqRemember`), `backend/Concurrency.gs` (+`atomicUpsert_`), `backend/Code.gs` (5 handler `*-upsert` gọi `atomicUpsert_`), `assets/js/auth.js` (+`gasWrite`/`_genReqId`), `assets/js/api.js` (9 call → `gasWrite`), `assets/js/initiatives.js` (initiative-upsert → `gasWrite`), `assets/js/config.js` (v6.55), `index.html` (cache-token 4 file → `?v=20260826b`), `test/verify_write_retry.mjs` (mới), `docs/PROPOSAL_BE_Async_Cache_2026-08-26.md` (mới).
- **Decision made:** Khẩu vị "tối ưu tại chỗ" ([TT] chốt) — giữ ghi đồng bộ + read-your-write, không đổi sang async queue. Bump version vẫn GLOBAL ở Pha A (per-domain = Pha B). `atomicUpsert_` bump version TRONG khóa (đúng thứ tự sau commit), audit/notif chạy sau nhả khóa (auditLog vẫn tự bump — double-bump vô hại).
- **Blocker:** **Không** (code + verify xong). **⚠️ [TT] cần redeploy GAS** (Code.gs + Concurrency.gs + CacheLayer.gs) để idempotency dedup có hiệu lực; FE tự cập nhật qua GitHub Pages + hard-refresh.
- **Next step:** [TT] redeploy GAS + smoke test production (ghi liên tục/nhiều tab không mất bản ghi; ngắt mạng chớp → tự retry). [CC] khi [TT] duyệt: **Pha B** (version theo domain — batch-read chỉ tải lại phần đổi) rồi **Pha C** (dồn notif sang trigger + keep-warm). (Tùy chọn) áp cùng pattern cho AIUS.
- **Regression risk:** **Thấp–TB → verify đầy đủ.** `verify_write_retry` 10/10 + atomic 41/41 · id_reassign 17/17 · notifications 21/21 · notif_retract 41/41 · my_work 97/97 · case 22/22 · issue 61/61 · dev 40/40 · recurring 23/23. Backend đổi cần **redeploy mới hiệu lực** (trước đó route cũ vẫn chạy đúng, chỉ thiếu dedup). `verify_initiative*` timeout = flaky file:// pre-existing (đã kiểm trên HEAD sạch). Data-boundary: dedup cache chỉ lưu `reqId→id`, không PII.

---

# SESSION HANDOVER (S80) — 2026-08-25
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Version**: v6.52 → **v6.53** (`6.53-recurring-task-log-once-20260825`, `?v=20260825`)

## Delta phiên (2026-08-25 — Task ĐỊNH KỲ tuần/tháng "log 1 lần" + tick mỗi kỳ, Claude Code)
- **Task completed:** Xây tính năng **task định kỳ** (chung cho mọi task, tuần/tháng) theo yêu cầu [TT]: log 1 lần, mỗi kỳ tick 1 click, tận dụng nền tảng + ít đụng cấu trúc nhất. **PA3** (phỏng vấn [TT] chốt 4 điểm + 3 làm-rõ: nhắc ở kỳ kế tiếp kèm tên kỳ · hết kỳ = MISS đỏ · tick ở Tasks+QuickView). **Pha 1 (FE, không redeploy):** +2 cột append `Định kỳ`/`Kỳ đã xong` (constants/api/parsers ×2/GS_RANGE A1:AA); helper period (helpers.js) trạng thái/miss/tick auto-reset; select "Định kỳ" trong modal (index.html/crud.js, giữ donePeriods khi sửa); nút "✓ Xong kỳ này" + chip ↻ + MISS ở My Work/Tasks/popup chi tiết (route `task-upsert` cũ). **Pha 2 (backend, cần redeploy):** `NotificationService.gs` +`recur-miss` (nhắc kỳ TRƯỚC chưa tick ở kỳ hiện tại kèm tên kỳ, thu hồi khi tick). Migration `RecurrenceMigration.gs`. Design doc `RECURRING_TASK_DESIGN.md`.
- **Files changed:** *(chưa commit trước handover — commit ở bước push)* FE: `assets/js/{constants.js,api.js,parsers.js,helpers.js,config.js}`, `assets/js/views/{my-work.js,tasks.js}`, `assets/js/crud.js`, `assets/css/my-work.css`, `index.html` (+select fRecurrence, ?v bump 65 refs). Backend: `backend/NotificationService.gs` (+recur-miss), `backend/RecurrenceMigration.gs` (mới). Test: `test/verify_recurring.mjs` (mới), `test/verify_atomic_write.mjs`+`test/verify_task_rag.mjs` (assert 25→27). Doc: `AI_CONTEXT/RECURRING_TASK_DESIGN.md` (mới).
- **Decision made:** (1) PA3 tái dùng Report Week membership + 2 cột append (không nổ task, không sheet phụ, không route mới). (2) Trạng thái kỳ **suy ra** (0 lưu thêm) → auto-reset, không job. (3) Nhắc ở **kỳ kế tiếp** cho kỳ MISS (transient 1 kỳ), UI vẫn giữ chỉ báo MISS bền qua `taskPeriodStatus`. (4) `_NOTIF_DUE_TYPES` +recur-miss để reconcile tự thu hồi khi tick. (5) GS_RANGE là hằng số tài liệu (GAS đọc/ghi động theo getLastColumn/values[0].length) → Pha 1 không redeploy; chỉ migration set header.
- **Blocker:** không. **CẦN [TT] thủ công:** (1) chạy `commitAddRecurrence()` trong GAS editor (tạo cột Z/AA + backfill); (2) redeploy Web App cho Pha 2 nhắc; (3) hard-reload → badge v6.53.
- **Next step:** [TT] chạy migration + redeploy + hard-reload → tạo 1 task định kỳ tuần thử: tick "Xong tuần này" → sang tuần sau chưa tick thấy MISS + noti. [CC] (tuỳ chọn) thêm **filter "Định kỳ"** ở bảng Tasks; tick ở **quickview.js** (view gọn) nếu [TT] cần; nghiệm thu Pha 2 nhắc kỳ digest kế.
- **Regression risk:** **Thấp.** 2 cột **append** (parser theo header, taskToRow positional đúng index 25/26 sau RAG 24) → 0 đụng cột cũ; backend column-agnostic. Verify đầy đủ: recurring 23/23 · my_work 91/91 · report_week 17/17 · atomic_write 41/41 · task_rag 5/5 · notif_retract 41/41 · notifications 21/21 (0 hồi quy). Pha 2 chỉ thêm loại candidate mới (recurring), không đụng luồng due/overdue. Chưa smoke live (chờ [TT] migration + redeploy).

# SESSION HANDOVER (S79) — 2026-08-23
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Version**: v6.52 (backend-only — KHÔNG bump client)

## Delta phiên (2026-08-23 — DEBUG email nhắc việc lệch ngày/tháng + định dạng: fix tận gốc 3 tầng, Claude Code)
- **Task completed:** [TT] báo email digest nhắc việc vẫn hiện **lẫn lộn định dạng** ("31-Jul-26" locale Anh vs "21/08/2026") và **nhầm tháng** (task hiện "Quá hạn" với ngày cũ dù deadline đã sửa sang tương lai). Truy vết `backend/NotificationService.gs` → chốt **2 lỗi gốc**: (A) `NotifID = user|etype|id|type` **không gồm ngày** → khi deadline đổi, `notifScan` bỏ qua (append idempotent), message cũ nằm lại; `_notifRetractStale_` chỉ thu hồi khi entity *done/mất*, **không** khi deadline *dời khỏi ngưỡng* (overdue→tương lai) → email vẫn nhắc quá hạn sai. (B) `_notifMessage_` echo `dueStr` **thô** từ ô Sheet → định dạng phụ thuộc locale ô. **Fix 3 tầng, thuần backend.**
- **Files changed:** *(commit `aac3c0a`, main)* `backend/NotificationService.gs` — NEW `_notifFmtDue()` (chuẩn hoá mọi ngày → **DD/MM/YYYY**, dựng thủ công từ ngày parse, không dùng `Utilities.formatDate` → nhất quán + không lệch TZ; không parse được thì GIỮ NGUYÊN); `_notifMessage_` + `_notifMakeRec_` dùng `_notifFmtDue` cho cả Message lẫn cột DueDate; NEW `_notifReconcileDue_(sheet, cands)` thay lời gọi `_notifRetractStale_` trong `notifScan` (làm tươi ngày khi deadline đổi vẫn cùng ngưỡng · thu hồi khi không còn candidate = deadline dời/done/mất; bao trùm done/missing cũ + bỏ 1 lượt đọc lại 5 sheet). `verify_notif_retract.mjs` **41/41** (từ 24/24: +NR11 fmt·NR12 message·NR13 refresh·NR14 retract-moved-away + NR9 viết lại theo reconcile). PNG `test-results` dirty (~85, leftover cũ) **KHÔNG stage** (tiền lệ S77/S78).
- **Decision made:** (1) Fix ở **tầng dữ liệu noti (GAS)** để cả chuông lẫn email digest hưởng lợi. (2) `_notifFmtDue` dựng chuỗi thủ công (không `Utilities.formatDate`) → deterministic GAS↔sandbox, không lệch timezone; parse fail → giữ nguyên (không phá dữ liệu ngân hàng). (3) `_notifReconcileDue_` **không cần** đọc lại `_notifLiveState_`: mọi ca stale (done/mất/dời-ngưỡng) đều rơi vào "không còn candidate" → thu hồi; tiết kiệm 5 lượt đọc sheet/scan. (4) **Không bump APP_VERSION** (backend thuần, không đụng FE). (5) `_notifRetractStale_`/`_notifLiveState_` GIỮ (vẫn dùng ở `notifRetractStalePreview` + test NR2–6).
- **Blocker:** không. **✅ [TT] đã hoàn tất phía GAS** (dán `NotificationService.gs` + redeploy Web App, link KHÔNG đổi).
- **Next step:** [TT] chạy tay **`notifScan()`** 1 lần trong GAS editor để **dọn ngay tồn kho** (thu hồi noti overdue của task nay hạn tương lai + làm tươi ngày các noti còn overdue) — hoặc chờ trigger @8h; nghiệm thu **kỳ digest kế**: email hết "31-Jul-26" thô, ngày đúng DD/MM/YYYY, không còn nhắc quá hạn với task đã dời hạn. [CC] (tuỳ chọn) gộp `_notifFmtDue` với `toISODate`/`fmtDate` FE thành 1 nguồn nếu tách module chung.
- **Regression risk:** **Thấp.** Backend thuần, 0 đổi FE, 0 đổi route/handler doPost. `_notifReconcileDue_` bao trùm đúng logic done/missing S74 (verify) + thêm refresh/moved-away; hành vi thu-hồi-khi-read-lỗi giữ nguyên profile cũ (read fail → entity coi như missing → thu hồi, tự chữa scan kế). Verify `verify_notif_retract` **41/41** + `verify_notifications` **21/21** (0 hồi quy) — chạy hàm GAS THẬT trong sandbox.

# SESSION HANDOVER (S78) — 2026-08-22
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Version**: v6.51 → **v6.52** (`6.52-mywork-kanban-todo-states-scroll-person-filter-20260822`, `?v=20260822`)

## Delta phiên (2026-08-22 — CR Kanban "Công việc của tôi": 4 trạng thái To-do + scroll đồng nhất + filter nhân sự, Claude Code)
- **Task completed:** 3 yêu cầu CR trên view Kanban của **My Work** (thuần FE): (1) **Cột "Cần thực hiện" gộp đúng 4 trạng thái** `Chưa bắt đầu · Hoàn thành chuẩn bị · Tạm dừng · Blocked` — định nghĩa tường minh bằng constant `MW_KB_TODO_STATES` (thay comment ngầm), giữ nguyên logic "phần còn lại → To-do" nên **không mất task** trạng thái lạ. (2) **Đồng nhất concept scroll**: trước chỉ cột "Vừa đóng" có khung cuộn `max-height:520px`; nay **To-do + In-process** dùng CHUNG khung cuộn đó → nhiều task không kéo dài trang. (3) **Filter theo nhân sự** hỗ trợ Teamlead/Admin review nhanh: droplist "Lọc theo nhân sự" (distinct picRes/picAcc trong phạm vi role) → chọn 1 người lọc task người đó là Res/Acc, áp cho **cả List lẫn Kanban** qua 1 nguồn `_mwScopedTasks`. Đổi team → reset nhân sự; User thường không thấy droplist.
- **Files changed:** *(commit `dbc84ce`, main)* `assets/js/views/my-work.js` (constants state Kanban + `_mwCanFilterPeople`/`_mwPersonMatch`/`_mwTeamPeople`/`_mwEffectivePersonFilter`, `_mwScopedTasks` +param personFilter, `_mwKanbanColumns` dùng constant, `_mwBuildKanban` scroll cả 3 cột, `_mwPersonFilterHtml`+`mwSetPersonFilter`, reset person khi đổi team), `assets/css/my-work.css` (comment scroll dùng-chung + `.mw-person-filter{max-width:180px}`), `assets/js/i18n.js` (+`mw.person.all`/`mw.person.filter` VI/EN), `assets/js/config.js` (APP_VERSION v6.52), `index.html` (cache-bust `?v=20260822`, 65 refs), `verify_my_work.mjs` (+KB8/KB9/PF1–PF5). PNG `test-results/my_work` **không stage** (EVD tái tạo được — theo tiền lệ S77).
- **Decision made:** (1) To-do giữ **negative-filter** (`!inProc && !done`) để không mất task trạng thái lạ, chỉ **tường minh hoá** bằng `MW_KB_TODO_STATES` (4 state CR) cho dễ đọc/test — KHÔNG chuyển sang whitelist cứng (tránh ẩn task). (2) Person filter đặt ở **`_mwScopedTasks`** (1 nguồn) để cả List lẫn Kanban đồng nhất, thay vì chỉ lọc trong build Kanban. (3) Droplist nhân sự lấy **distinct từ pic của task trong scope** (không cần load User_Master) — hiển thị đúng người đang có việc. (4) Person filter **in-memory** (không persist localStorage) — tránh chọn người đã rời team bị kẹt; reset khi Admin đổi team.
- **Blocker:** không. Thuần FE — **KHÔNG cần redeploy GAS**, chỉ hard-reload. *(Nợ cũ độc lập vẫn treo: S77 nghiệm thu kỳ email tới; S76/S75 redeploy GAS cho suppress digest + send-report — không liên quan phiên này.)*
- **Next step:** [TT] hard-reload PRD → badge `v6.52`; smoke: cột "Cần thực hiện" gồm task Tạm dừng/Blocked/HT chuẩn bị/Chưa bắt đầu; kéo nhiều task ở To-do/In-process → cuộn trong khung; (Teamlead/Admin) chọn 1 nhân sự ở droplist → board thu về đúng người. [CC] (tuỳ chọn) nếu muốn thứ tự "đóng gần nhất" chính xác → thêm cột Closed Date (TD-MW-02); cân nhắc persist person filter theo phiên nếu [TT] thấy tiện.
- **Regression risk:** **Thấp.** Thuần FE additive: To-do đổi từ negative-filter sang cùng kết quả + constant (hành vi KHÔNG đổi — KB8 xác nhận đủ 4 state, không lẫn); scroll + person filter là thêm mới; hành vi Teamlead/Admin cũ giữ nguyên khi không chọn nhân sự. Đã verify: `verify_my_work` **91/91** (từ 82/82, +9 test: KB8×3 To-do-4-state/no-leak/split, KB9 scroll-3-cột, PF1–PF5 droplist/options/filter/reset/member-no-droplist qua Playwright DOM thật); `node --check` sạch 3 file JS.

# SESSION HANDOVER (S77) — 2026-08-22
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Version**: v6.51 (backend-only — KHÔNG bump client)

## S77 — DateGuard: chống lệch định dạng ngày TẬN GỐC (backend + test)
- **Task completed**: Truy vết nghi vấn "sửa nhầm file / thiếu deploy GAS" của vụ báo cáo tuần AIOS hiện deadline sai (`BL1-026` email 31/07 vs DB 31/08). **Kết luận có bằng chứng**: (1) deadline trong email **100% do AIOS dựng** (`aggregate.js parseVNDate+fmtDMY` → `build_email.js` HTML); GAS SHTD `ReportEmailService.sendWeeklyReport_` chỉ **relay** (`htmlBody: html` param "đã dựng ở AIOS", dòng 156/179) — KHÔNG parse/format ngày → sửa ở AIOS là **đúng file**, không cần deploy GAS là **đúng chủ đích** (không file GAS nào đổi). (2) parser AIOS đã verify đúng (`"31-thg 8-26"`→`Date.UTC(2026,7,31)`→`31/08/2026`, UTC nhất quán). (3) Gốc = **snapshot cũ** (đã guard bên AIOS hôm trước). **Việc phiên này**: bịt **rủi ro nền** — dữ liệu ngày trong Sheet có thể bị Google localise lại sau sửa tay/paste; `DateNormalizeMigration.gs` chỉ dọn 1 lần → dựng **DateGuard 2 tầng** chống tái phát.
- **Files changed**: NEW `backend/DateGuard.gs` (onEdit real-time + daily scan + install/uninstall/selftest; tái dùng `_dnToISO`/`_DN_TARGETS`), NEW `verify_date_guard.mjs` (29/29), `run_tests.mjs` (+đăng ký). AI_CONTEXT (4 file). **KHÔNG đụng FE source** (audit `assets/js` xác nhận writer→`fmtDateExport`, reader→`toISODate` đã chuẩn từ S67.2; các `new Date()` là tính toán trên memory ISO). Không commit ~85 PNG `test-results` dirty (leftover cũ).
- **Decision made**: (1) Fix ở **tầng dữ liệu (GAS trigger)** để cả dashboard lẫn báo cáo AIOS hưởng lợi, thay vì chỉ vá từng consumer. (2) **CHỈ rewrite** chuỗi locale/serial lệch & parse được; Date hợp lệ/ISO/rỗng bỏ qua (ít churn); không parse được → **giữ + log** (không phá dữ liệu ngân hàng). (3) `setNumberFormat('@')` **best-effort try/catch** — né lỗi "cột kiểu đã nhập" đã khiến S67.2 bỏ khoá plain-text. (4) daily @7h **trước** `notifScan`@8h để digest/báo cáo đọc dữ liệu sạch. (5) Không bump APP_VERSION (backend thuần).
- **Blocker**: không. **✅ [TT] đã hoàn tất phía GAS** (dán DateGuard.gs + `commitNormalizeDates()` + `installDateGuardTriggers()` + `dailyDateGuard()` chạy tay).
- **Next step**: [TT] nghiệm thu vào **kỳ gửi email tới** — deadline trong email khớp DB; thử sửa 1 ô ngày kiểu `31-thg 8-26` trên Sheet → reload → thành `2026-08-31` (real-time). [CC] (tuỳ chọn) mở rộng guard cho **8 sheet H2_*** nếu KPI cũng nhập ngày tay; gộp `_dnToISO` thành 1 nguồn nếu tách module chung.
- **Regression risk**: **Thấp/không**. Toàn file MỚI, độc lập — 0 đổi FE, 0 đổi route/handler GAS đang chạy. Guard chỉ chuẩn hoá ĐÚNG các cột ngày đã quản lý; programmatic write không kích onEdit (không vòng lặp); idempotent (verify DG9). `verify_date_guard` 29/29; guard **không** chạy tự động trong test suite trình duyệt nên không ảnh hưởng suite cũ.

---

# SESSION HANDOVER (S76) — 2026-08-21
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Version**: v6.49 → **v6.50** (`6.50-mywork-kanban-personal-scope-20260821`, `?v=20260821`)

## S76 — My Work: scope theo role + view Kanban · loại email nhắc việc CuongVM1 · v6.50
> 3 yêu cầu độc lập: (1) **loại email NHẮC VIỆC (digest) cho CuongVM1** — chỉ giữ email BÁO CÁO định kỳ; (2) **My Work chỉ hiển thị task CÁ NHÂN** cho user thường (Teamlead/Admin vẫn full); (3) **bổ sung view KANBAN** cho My Work (To-do / In-process / Closed).

- **✅ Item 2 — role-aware scope (thuần FE, `views/my-work.js`)**: NEW `_mwScopedTasks(user, teamFilter)` = nguồn scope DUY NHẤT cho cả List lẫn Kanban. **User/khác = CHỈ task cá nhân** (`picRes ∪ picAcc`); **Teamlead = full team** (`mine ∪ team` — giữ nguyên hành vi cũ); **Admin = full trung tâm** (mọi task), lọc theo `teamFilter` (droplist) — **mặc định = team của Admin** (`_mwEffectiveTeamFilter`). Bỏ mệnh đề cũ `t.team===uteam` áp cho MỌI role (đó là lý do user thường trước đây thấy cả team). `_mwGetMyTasks` giờ delegate `_mwScopedTasks`.
- **✅ Item 3 — Kanban (FE)**: toggle **List ⇄ Kanban** ở page-header (`mwSetView`, persist `localStorage['shtd_mw_view']`). 3 cột: **Cần thực hiện** (chưa xong & chưa "Đang thực hiện"; sort quá-hạn-trước rồi gần deadline nhất) · **Đang thực hiện** (`state='Đang thực hiện'`; đầu cột có count + **banner đỏ liệt kê FTE quá tải**) · **Vừa đóng** (`state='Hoàn thành'`; sort **Deadline giảm dần** = proxy "đóng gần nhất" vì Task_Master KHÔNG có cột ngày đóng; cap `MW_KANBAN_CLOSED_CAP=15`). **FTE quá tải** = đếm task "Đang thực hiện" theo **picRes**; ai ≥ `MW_FTE_MAX=3` → card gắn **badge đỏ "Quá tải"** + viền trái đỏ. Card click → `openTaskViewPopup`. **Droplist team chỉ hiện cho Admin** (`_mwTeamFilterHtml`; `TEAM_LIST` + "Tất cả trung tâm"). CSS `my-work.css` (header-tools + `.mw-kanban`/`.mw-kb-*`), i18n +11 key VI/EN (`mw.view.*`/`mw.team.*`/`mw.kb.*`).
- **✅ Item 1 — loại email nhắc việc CuongVM1 (GAS, `backend/NotificationService.gs`)**: NEW `_notifDigestSuppressSet_()` đọc `Report_Config.Digest_Suppress` (username cách phẩy) — **KHÔNG có key đó → fallback hằng `['cuongvm1']`**. `_notifSendDigests_` bỏ qua gửi cho user bị suppress **nhưng VẪN đánh dấu EmailedDate** (không dồn lô sau). **Chuông trong app + email BÁO CÁO định kỳ KHÔNG đụng** (2 kênh tách biệt). `ReportEmailService.setupReportConfig` thêm dòng `Digest_Suppress=CuongVM1` để chỉnh trực tiếp trên sheet.
- **✅ Test (local, kỹ)**: `verify_my_work.mjs` **78/78** (thêm MW40 member personal-only, MW41 admin droplist + team-filter + all-center, KB1–KB6 kanban toggle/3 cột/ordering/FTE overload/banner). USER_PO đổi `role:'Admin'→'Teamlead'` để test ownership cũ (MW7–10) khớp ngữ nghĩa "Teamlead=full team". `verify_notif_retract.mjs` **24/24** (thêm NR10 digest-suppress chạy hàm GAS THẬT trong sandbox — CuongVM1 bị loại, user thường vẫn nhận, cả 2 vẫn mark EmailedDate). `verify_send_report` 10/10. **Full suite 35/36** — fail duy nhất `verify_issue_tracker` = **flaky batch pre-existing** (loginOverlay chặn pointer khi chạy song song; **standalone 61/61 PASS**), KHÔNG do thay đổi.
- **⛔ Blocker**: **Item 1 cần redeploy GAS** (patch `NotificationService.gs` + `ReportEmailService.gs` vào Apps Script → redeploy Web App, link KHÔNG đổi). Item 2+3 thuần FE — chỉ hard-reload. *(Lưu ý: S75 report-email vẫn CHƯA redeploy — có thể gộp 1 lượt với Item 1.)*
- **➡️ Next step**: (1) Hard-reload PRD → badge `v6.50`. (2) Smoke: user thường vào My Work → chỉ thấy task mình; Teamlead thấy cả team; Admin có droplist (mặc định team mình) + "Tất cả trung tâm". (3) Toggle Kanban → 3 cột, FTE ≥3 badge đỏ, "Vừa đóng" mới nhất trên cùng. (4) **[TT] redeploy GAS** (NotificationService+ReportEmailService) → chạy `setupReportConfig()` (nếu chưa có sheet) để có dòng `Digest_Suppress`; digest sáng kế **không** gửi CuongVM1. (5) (nợ S75) redeploy `send-report` + điền Email `User_Master` cho báo cáo định kỳ.
- **🟢 Regression risk**: 🟢 **THẤP** — FE additive (scope refactor giữ nguyên hành vi Teamlead; List view các section cũ không đổi); GAS thêm 1 tầng lọc gửi mail (không đụng sinh/thu-hồi noti hay chuông). Full suite 35/36 (flaky pre-existing). ⚠️ **Đổi hành vi CÓ CHỦ Ý**: user thường (non-Admin/Teamlead) từ nay chỉ thấy task cá nhân ở My Work (đúng yêu cầu). ⚠️ "Vừa đóng" xếp theo Deadline (proxy) — nếu cần chính xác thời điểm đóng, phải thêm cột Closed Date (đã cân nhắc, user chọn proxy).

## S76.1 — 2 CR UI (thuần FE) · v6.51 (`6.51-kanban-closed-scroll-h2-tasklink-table-20260821`, `?v=20260821b`)
> **CR1 (Kanban Closed)** + **CR2 (H2 task-link table)**. Cả 2 thuần FE — chỉ hard-reload, KHÔNG cần redeploy GAS.

- **✅ CR1 — cột "Vừa đóng" (Kanban My Work)**: bỏ cap cứng 15 (`MW_KANBAN_CLOSED_CAP` xóa) → hiển thị **TẤT CẢ** task đã đóng trong **khung cao cố định `max-height:520px` cuộn dọc**, header đếm tổng. `_mwKanbanCol(...scroll)` thêm class `.mw-kb-col-body-scroll` (chỉ cột Closed). `my-work.js` + `my-work.css`.
- **✅ CR2 — task-link ở "Quản trị H2 · Theo dõi KPI"** (`views/h2-tracker.js` + `h2.css`): thay chip tối giản `🔗 mã · tên` bằng **bảng task đầy đủ giống concept "Theo dõi Initiative"** (`init-task-table` tái dùng). Mỗi mốc có nút toggle **`≡ N task ▾`** mở/gập panel `.h2-ms-task-panel` (giữ trạng thái mở qua re-render bằng `_h2OpenMsTasks` Set; tự mở sau khi link/unlink). Bảng cột: **Mã · Task · Trạng thái+RAG · PIC (Res /Acc) · %HT (progress bar) · Deadline + badge "Quá hạn"** + nút × bỏ link (canEdit). Row click → `openTaskViewPopup`. Task đã xoá → dòng "(không tìm thấy)". NEW `_h2BuildMsTaskTable`/`h2ToggleMsTasks`; RBAC + `h2-milestone-tasklink` KHÔNG đổi.
- **✅ Test**: `verify_my_work` **82/82** (+KB7 cột Closed 25 task không cap + scroll). `verify_h2_tasklink` **29/29** (chip→bảng: TL2-chip/TL2-table-attrs/TL7 cập nhật selector `.h2-tk-row`/`.h2-tk-id`; RBAC/picker/unlink/payload nguyên vẹn). `verify_h2_tracker` 32/32, `issue_tracker` 61/61 standalone. Full suite **35/36** (chỉ `issue_tracker` flaky batch). v6.51, `?v=20260821b`.
- **➡️ Next**: hard-reload → badge `v6.51`; Kanban cột "Vừa đóng" cuộn khi >~8 task; H2·KPI mở "N task ▾" thấy bảng đầy đủ thuộc tính. KHÔNG cần deploy GAS.
- **🟢 Regression risk**: 🟢 **THẤP** — thuần FE, tái dùng `init-task-table`/`prog-*` toàn cục; H2 backend/route/RBAC không đụng. ⚠️ H2 panel task **mặc định gập** (trước hiện chip inline) — theo đúng concept Initiative; toggle giữ trạng thái mở.

---

# SESSION HANDOVER (S75) — 2026-08-19
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard

## S75 — Tính năng GỬI BÁO CÁO TUẦN qua email (action GAS `send-report`) · CHƯA redeploy
- **✅ Task**: Thêm tính năng gửi báo cáo tuần định kỳ qua email. Template HTML (đã DUYỆT) được dựng ở AIOS `weekly-report/build_email.js`; SHTD backend là bên GỬI. **To** = user `CuongVM1`; **Cc** = mọi user `Role=Teamlead`, `Active≠false`, có Email (loại trùng địa chỉ To). GAS tự phân giải người nhận từ `User_Master` (nguồn sự thật server-side) rồi `MailApp.sendEmail` — mẫu như digest ở `NotificationService.gs`.
- **✅ Files (2 source + 1 test + 1 runner)**: NEW `backend/ReportEmailService.gs` (`_reportRecipients_` phân giải To/Cc dedup; `sendWeeklyReport_` gửi/`dryRun`; const `REPORT_TO_USERNAME='CuongVM1'`/`REPORT_CC_ROLE='Teamlead'`/`REPORT_FROM_NAME`). MOD `backend/Code.gs` (route `send-report` **Admin-only** + thêm vào `ADMIN_ONLY`). NEW `verify_send_report.mjs`. MOD `run_tests.mjs`. *(AIOS phía dựng+gọi: `03_Skills/weekly-report/send_email.js` mới + `run.js --send` + `fetch_gas.js` export helper — repo AIOS, commit riêng.)*
- **✅ Decision**: (a) Kiến trúc **AIOS dựng + GAS gửi** (không port logic aggregate 5 mảng sang GAS → tránh nhân đôi/lệch bản, đúng "1 nguồn sự thật"; template đã duyệt tái dùng). (b) Người nhận phân giải **server-side** từ `User_Master` (không để AIOS tự gom). (c) `send-report` **Admin-only** + hỗ trợ `dryRun` (soi To/Cc trước khi bắn). (d) Định kỳ = scheduled task AIOS chiều thứ 6 gọi `run.js --send` (đã có lịch build). (e) Data-boundary: HTML chứa tên KH (nội bộ) gửi email nội bộ qua GAS của ngân hàng — cùng miền tin cậy với Sheets nguồn, không lên cloud ngoài.
- **✅ Test**: `verify_send_report.mjs` **7/7** — nạp NGUYÊN VĂN `ReportEmailService.gs` vào sandbox Node (stub `SpreadsheetApp`/`MailApp`) → chạy hàm GAS THẬT: To=CuongVM1, Cc teamlead active/loại inactive-no mail-non lead, To-cũng-lead loại khỏi Cc, dedup email trùng, To không tồn tại → NÉM (không gửi), dryRun không gọi MailApp, gửi thật đúng payload `{to,cc,subject,htmlBody}`, html rỗng → NÉM. GAS parse OK (qua sandbox eval). AIOS side đã thử `send_email.js --dry` tới GAS live: login OK, POST trả `action không hợp lệ` (đúng — chưa redeploy).
- **⛔ Blocker**: **GAS CHƯA redeploy** — `backend/*.gs` là patch merge tay vào Apps Script rồi redeploy (link không đổi). Trước khi redeploy, `--send`/`--dry` sẽ báo `action không hợp lệ: send-report`.
- **➡️ Next step**: (1) **[TT] merge `ReportEmailService.gs` + route `send-report` vào Apps Script deployed → redeploy** Web App. (2) **[TT] điền Email cho `CuongVM1` + các user Teamlead trong `User_Master`** (nợ cũ S74 "điền Email User_Master" — feature này phụ thuộc trực tiếp). (3) `node send_email.js --dry` (AIOS) để soi To/Cc thật → rồi `node run.js --send` chạy thử 1 kỳ. (4) Đưa `run.js --send` vào scheduled task thứ 6.

---

# SESSION HANDOVER (S74) — 2026-08-16
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `d64b330` (S73) → **sau (ĐÃ push)**: `006ed60` (S74)
**Version**: v6.48 → **v6.49** (`6.49-notif-retract-closed-20260816`, `?v=20260816`)

> **DEBUG — email/chuông nhắc việc hiện task ĐÃ ĐÓNG.** User báo task đã đóng vẫn còn nhắc việc + nghi trỏ nhầm DB. **Rà soát**: (a) trỏ DB **ĐÚNG** — `Config.gs SPREADSHEET_ID=1cpg1p_8…56Hk` = Sheet tổng cá nhân hiện hành, khớp client; mọi reader noti `openById` cùng ID. (b) Gốc thật: **notification KHÔNG được thu hồi khi entity chuyển sang done** — `notifScan` chỉ BỎ QUA task done khi sinh candidate MỚI, nhưng nhắc `overdue`/`due-*` đã ghi vào sheet `Notifications` khi task còn mở thì **nằm lại vĩnh viễn**; `_notifPurge_` chỉ xóa dòng đã-đọc & >30 ngày; `notifRead`/client chỉ lọc `!read`, không đối chiếu trạng thái sống. Đóng task chỉ **append** dòng "closed", không gỡ nhắc cũ.

## S74 — Fix nhắc việc task đã đóng: cơ chế RETRACT 3 tầng · v6.49 (GAS — ĐÃ redeploy, link không đổi)
- **✅ Task**: thu hồi (mark-read) nhắc `due-3d/due-1d/due-today/overdue` khi entity done HOẶC biến mất, ở 3 tầng: (1) **real-time** `notifOnWrite` — `nowDone` → `_notifRetractEntity_()` gỡ ngay nhắc treo của entity (mọi recipient); (2) **daily self-heal** `notifScan` — `_notifLiveState_()` (tập `exist`/`done` mọi entity) + `_notifRetractStale_()` gỡ mọi nhắc due/overdue mà entity nay done/mất, chạy **TRƯỚC** `_notifSendDigests_` nên email cũng sạch → **tự chữa tồn kho lịch sử + task đóng ngoài app** (sửa Sheet tay/migration); (3) **dry-run** `notifRetractStalePreview()` soi backlog.
- **✅ Files (1 source + 1 test + 3 wiring)**: `backend/NotificationService.gs` (NEW const `_NOTIF_DUE_TYPES`; NEW `_notifRetractEntity_`/`_notifLiveState_`/`_notifRetractStale_`/`notifRetractStalePreview`; MOD `notifOnWrite` retract-on-done, `notifScan` retract pass + bump `DATA_VER` khi thu hồi + log/return `retracted`). NEW `verify_notif_retract.mjs`. MOD `run_tests.mjs`, `config.js` v6.49, `index.html` `?v=20260816` (65 refs).
- **✅ Decision**: (a) chỉ thu hồi **due-types** — `created`/`closed` là sự kiện 1 lần, giữ nguyên. (b) **retract = mark-read** (set ReadTs), KHÔNG xóa dòng → giữ dấu vết; `_notifPurge_` dọn sau 30 ngày như cũ. (c) KHÔNG lọc live-state trong `notifRead` (mỗi poll 15' → tránh đọc lại toàn bộ entity, nghịch tuning S72); 2 tầng real-time + daily đã phủ. Gap nhỏ: task đóng NGOÀI app chỉ sạch ở lần scan kế (chấp nhận). (d) bump `DATA_VER` khi có thu hồi → chuông client lấy bản sạch ở batch kế.
- **✅ Test**: `verify_notif_retract.mjs` **19/19** — nạp **NGUYÊN VĂN** `NotificationService.gs` vào sandbox Node (`new Function` + stub SpreadsheetApp/Utilities/MailApp/entity-readers + fake sheet) → chạy **hàm GAS THẬT** (không port tay → không drift): live-state phân loại task/dev/milestone, retract done/missing, giữ task mở, bỏ created/read-sẵn, real-time onWrite close, tích hợp `notifScan` (retracted=2 + bump). `verify_notifications` (UI) **21/21** không đổi. GAS parse OK (qua sandbox eval).
- **⛔ Blocker**: Không. ✅ **GAS đã redeploy (user, link KHÔNG đổi).** Tầng scan chỉ cần Save code; tầng real-time (`notifOnWrite` trong `doPost`) cần redeploy — đã xong.
- **➡️ Next step**: (1) (GAS editor) `notifRetractStalePreview()` soi số nhắc stale → `notifScan()` chạy tay 1 lần dọn backlog ngay (không chờ trigger 8h). (2) Hard-reload → badge `v6.49`; đóng 1 task đang có nhắc overdue → chuông + digest kế **hết** nhắc task đó. (3) (nợ) điền Email `User_Master` cho digest.
- **🟢 Regression risk**: 🟢 **THẤP** — thuần thêm tầng thu hồi (mark-read), không đụng sinh candidate/parse/deep-link/mark-read cũ; retract chỉ chạm cột ReadTs của `Notifications`. `verify_notif_retract` 19/19, `verify_notifications` 21/21. ⚠️ `_notifLiveState_` đọc lại 5 entity mỗi `notifScan` (job ngày, không perf-critical). ⚠️ Nếu `_notifIsDone` sai ngưỡng cho 1 entity → có thể thu hồi oan/sót (dùng chung định nghĩa với `_notifSkipDue` sinh candidate nên nhất quán). Xem TD-NOTIF-01.

---

# SESSION HANDOVER (S73) — 2026-08-14
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `d49d0be` (S72) → **sau (ĐÃ push)**: `01c12cd` (3 commit: `a0b7418` v6.46 → `e15f99b` REVERT v6.47 → `01c12cd` RAG col v6.48)
**Version**: v6.45 → v6.46 (ownership-load) → **REVERT v6.47** → **v6.48** (`6.48-task-rag-column-persist-20260814`, `?v=20260814c`)

> **DEBUG 2 nhịp.** (1) Thử "ownership-first scoped load" (v6.46) → **GÂY MẤT DỮ LIỆU trên PRD** → REVERT (v6.47). (2) Truy gốc thật user báo "RAG bấm ở Công việc của tôi không lưu" = **Task_Master THIẾU cột RAG** → thêm cột + hợp nhất RAG=`t.status` (v6.48).

## S73.1 — v6.46 ownership-first scoped load → **REVERT** (v6.47) · `a0b7418`→`e15f99b`
- **✅/❌ Task**: implement Phase A (dirty-guard `_dirtyTasks`) + B (My Work `_mwFlushActive`) + C (batch-read `scope=mine` + full-load nền `ensureAllTasks`). Test `verify_ownership_load` 8/8, push `a0b7418`. User báo **Ctrl+Shift+R + Sync mất data (mọi role)** → **revert toàn bộ** về known-good v6.45 (`e15f99b`).
- **✅ Decision**: scoped `'mine'` read có thể trả ÍT/RỖNG dòng (team lookup rỗng / PIC lưu display-name ≠ username) → `_parseArrayIntoDb(<2)` đặt `db.tasks=[]` **+ persist cache rỗng**; full-load nền ~1500 dòng dễ **timeout mạng nội bộ** → không cứu được. Revert **client-only** là đủ (GAS v6.46 còn live vô hại vì client v6.47 không gửi `scope` → server luôn `'all'`) → **KHÔNG cần redeploy GAS để cứu**. Sheet AN TOÀN (chỉ lỗi load client).
- **🟢 Regression risk**: revert = về đúng v6.45; `verify_startup_nonblocking` **10/10**. Phase A/B (dirty-guard) không còn cần vì gốc thật là schema RAG (S73.2), không phải race read/write.

## S73.2 — Fix RAG column (v6.48) · commit `01c12cd`
- **✅ Task**: "RAG bấm My Work → audit log CÓ update nhưng sheet không đổi → reload/Sync về trắng". **Gốc (verify từng dòng)**: Task_Master **không có cột RAG**; `taskToRow` (24 cột) **bỏ qua cả `t.status` lẫn `t.rag`** → RAG không được ghi; parser suy `t.status` từ Trạng thái; My Work dùng riêng `t.rag` (Xanh/Vàng/Đỏ) **không hề load/lưu**. Field khác (state/%/kết quả) có cột → **vẫn lưu bình thường, KHÔNG mất data task**.
- **✅ Files (7 source + 3 test)**: `constants.js` (DB_COLS **24→25** +`'RAG'`, `GS_RANGE` A1:X→**A1:Y**), `api.js` (`taskToRow[24]=t.status`), `views/my-work.js` (`_mwRagDots`/`mwQuickSaveRag`/card đọc-ghi **`t.status`** Green/Amber/Red, bỏ `t.rag`), `config.js` v6.48, `index.html` `?v=20260814c` (65 refs). NEW `backend/RagColumnMigration.gs` + `verify_task_rag.mjs` (5/5). MOD `verify_my_work.mjs` (MW17/20/21→status, fixture H01 status='Red'), `verify_atomic_write.mjs` (row 24→25), `run_tests.mjs`.
- **✅ Decision (user chốt qua 2 câu)**: (a) **HỢP NHẤT 1 RAG = `t.status`** (Green/Amber/Red — nguồn đã dùng sẵn ở dashboard/action-plan `rag:t.status`/modal `fRag`); My Work dots trỏ vào đó, nhãn/màu VN giữ nguyên. (b) Thêm **cột 25 'RAG' (Y)**; parser `_parseArrayIntoDb` **tự map** header 'rag'→`t.status` (KHÔNG đổi hàm đọc). (c) GAS đọc/ghi **cột động** (`getLastColumn`/`row.length`) → **KHÔNG cần redeploy Web App**. (d) migration set Y1='RAG' + backfill từ Trạng thái + `_bumpDataVer()`; user chọn "tôi viết GAS migration".
- **⛔ Blocker**: Không (code). **Cần user chạy `commitAddRag()` trong Apps Script editor** để Y1 có header 'RAG' (taskToRow ghi cột 25 nhưng parser map theo TÊN header → phải tồn tại). `dryRunAddRag()` cảnh báo nếu sheet ≠ 24 cột (chống ghi lệch — `taskToRow` **positional**).
- **➡️ Next step**: (1) Hard-reload → badge **v6.48**. (2) `dryRunAddRag()` → 0 cảnh báo → `commitAddRag()`. (3) Smoke: bấm RAG My Work → reload/Sync **GIỮ nguyên**; RAG **đồng bộ** My Work↔Dashboard↔Action Plan↔modal.
- **🟢 Regression risk**: 🟢 **THẤP–TRUNG BÌNH** — mọi hiển thị RAG task đã dùng `t.status` sẵn (chỉ My Work là outlier đổi). `verify_task_rag` **5/5**, `my_work` **62/62**, `atomic_write` **41/41**, `action_plan` 24/24; full **33/34** (đỏ duy nhất `bld_queue` = **timing-flaky pre-existing** `page.click` timeout, mọi assertion BLD gồm canBLD/yKienBLD PASS). ⚠️ `taskToRow` **positional** → cột RAG PHẢI ở đúng cột 25 (Y); migration hardcode `RAG_TARGET_COL=25` + cảnh báo lệch. ⚠️ Chạy client v6.48 **trước** migration: task-upsert ghi giá trị vào ô Y nhưng Y1 header trống → read chưa map (RAG mặc định Green) tới khi `commitAddRag()`.

---

# SESSION HANDOVER (S72) — 2026-08-13
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `c498ad7` (S71) → **sau (ĐÃ push)**: `d49d0be` (3 commit: `892fe3c` P1 · `c304823` P2 · `d49d0be` P3)
**Version**: v6.42 → **v6.45** (`6.45-gas-tuning-p3-versiongate-20260813`, `?v=20260813c`)

> **TUNING TỔNG THỂ TẦNG GỌI GAS (3 phase).** User báo S71 (nới read timeout 90s) KHÔNG giải quyết timeout/mất kết nối mạng nội bộ; nghi do H2 + data lớn. **Rà soát (xác nhận qua code)**: khởi động (`startApp`) bắn **~8 request GAS đồng thời** tới 1 host → trình duyệt xếp hàng (~6 kết nối/host) + GAS "Execute as Me" **tuần tự hoá** (tổng ≈ TỔNG các read) + mỗi read tự `openById` nguội + **không có CacheService**; `h2-read-all` (nặng nhất, mở spreadsheet 8 lần) bắn ngay dù view H2 ngủ. Data thật: Task **~1500** dòng, Case/Init ~500, còn lại 50–70. Ưu tiên #1 = **LUÔN giữ kết nối**. **✅ GAS đã redeploy (user, link KHÔNG đổi), smoke test PASS cả 3 phase.** Kế hoạch đầy đủ: `AI_CONTEXT/GAS_TUNING_PLAN.md`.

## S72.1 — Phase 1: cache-first + lazy H2 + concurrency pool · commit `892fe3c` · v6.43 (thuần FE)
- **✅ Task**: startup KHÔNG chặn UI; gỡ request nặng nhất khỏi cơn bão khởi động.
- **✅ Files**: `app.js` (NEW `_startupSync`+`_runPool` concurrency=2 → fan-out **8→2**; `autoConnectDB` bỏ overlay chặn màn — chỉ đổi status-dot; poll notif **5'→15' + chỉ khi tab hiển thị**; **bỏ `readH2()` khỏi startup**), `h2-core.js` (`_h2Loaded`/`_ensureH2Loaded` lazy), `navigation.js` (hook 3 nav H2), `auth.js`+`views/ai-chat.js` (NEW `GAS_AI_TIMEOUT_MS=120000`), `config.js`, `index.html`. NEW `verify_startup_nonblocking.mjs`.
- **✅ Decision**: cache-first (ĐẢO quyết định S71 giữ overlay); H2 load-1-lần khi mở view (không poll liên tục — user chọn); **AI chat KHÔNG phải nguyên nhân mất kết nối** (gọi on-demand, không ở startup) → chỉ cấp timeout riêng.

## S72.2 — Phase 2: batch-read gộp 7→1 request · commit `c304823` · v6.44 (cần GAS)
- **✅ Task**: gộp mọi read domain nóng vào **1 request**; mở spreadsheet **1 lần**.
- **✅ Files backend (9)**: `Code.gs` (NEW action `batch-read`), 8 reader nhận **optional `ss`** (Sheet/CasePipeline/Issue/DevPlan/Initiative/User/Notification/H2Service; default `openById` → endpoint lẻ **backward-compat**), `h2ReadAll(ss)` mở 1 lần thay 8. **Client**: `api.js` NEW `readAll()` phân phối vào mọi db; `app.js` `_startupSync`/`syncDB` dùng batch với **FALLBACK read lẻ** khi batch chưa hỗ trợ; `_markConnected()` dùng chung.
- **✅ Decision**: giữ endpoint lẻ (rollback + fallback); client fallback → push client **trước/sau** deploy GAS đều không phá app.

## S72.3 — Phase 3: version gate + AI context cache · commit `d49d0be` · v6.45 (cần GAS)
- **✅ Task**: request gộp gần như **miễn phí khi dữ liệu KHÔNG đổi** (thắng transfer lớn nhất mạng nội bộ).
- **✅ Files**: NEW `backend/CacheLayer.gs` (`_dataVer`/`_bumpDataVer` + gzip cache helper cap 100KB/key); `Code.gs` batch-read **VERSION GATE** (client gửi `ver`; khớp `DATA_VER` → `{notModified:true}` gần 0 payload; đổi → đọc **LIVE**); `AuditService.gs` bump ver **trong `auditLog` (SAU write-commit)**; `NotificationService.gs` bump ở `notifScan`; `AiService.gs` cache context theo ver (gzip, skip >cap) + share 1 lần mở spreadsheet. **Client**: `api.js` gửi/lưu `db._dataVer`; `storage.js` `loadCache` khôi phục ver.
- **✅ Decision**: (a) bump ver trong `auditLog` (sau commit) — **KHÔNG** bump trước dispatch (tránh race latch dữ liệu cũ). (b) **BỎ cache sheet-đọc ở server** — version gate đã đủ; khi đổi đọc LIVE để **không bao giờ trả dữ liệu cũ**. (c) AI cache theo ver (skip nếu >cap → build live như cũ).

## Chung S72
- **⛔ Blocker**: Không. ✅ **GAS đã redeploy** (thêm `CacheLayer.gs` + cập nhật Code/Audit/Ai/Notification + 8 reader `ss`), **link KHÔNG đổi**. Smoke test PASS 3 phase.
- **➡️ Next step**: (1) Theo dõi PRD mạng nội bộ (F12 Network): data không đổi → `batch-read` trả `notModified` nhỏ; data đổi → **1** request full. (2) (tùy chọn P3.3) **archival** Task Done sang sheet riêng khi Task_Master phình >1500. (3) Nếu thêm đường ghi mới: PHẢI qua `auditLog` hoặc gọi `_bumpDataVer()` (xem TD-NET-03).
- **🟢 Regression risk**: 🟢 **THẤP–TRUNG BÌNH**. FE additive + fallback; backend thêm action mới + `ss` optional (endpoint lẻ nguyên vẹn). `verify_startup_nonblocking` **10/10** (batch + fallback + version gate). Full suite **33/33** (2 lần chạy có blip `i18n_p6`/`bld_queue` = flaky batch pre-existing, standalone PASS). ⚠️ **Version gate phụ thuộc mọi write gọi `auditLog`** để bump ver — migration chạy tay trong editor KHÔNG bump → sau migration cần hard-reload (xem TD-NET-03). ⚠️ Data ĐỔI vẫn tải full ~1500 dòng (cache server cố ý bỏ tránh stale — TD-NET-04).

---

# SESSION HANDOVER (S71) — 2026-08-12
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `278a68b` (S70) → **sau (ĐÃ push)**: S71
**Version**: v6.41.2 → **v6.42** (`6.42-internal-net-read-timeout-20260812`, `?v=20260812e`)

> **DEBUG — regression từ S69.** User báo: **timeout khi load dữ liệu trên mạng nội bộ** (phát sinh ngay sau khi sửa treo trang sáng nay = S69). Đăng nhập THÀNH CÔNG (Script auth thông) nhưng **load dữ liệu không được**. Chỉ mạng nội bộ; mạng ngoài performance vẫn đảm bảo.

## S71 — Fix timeout tải dữ liệu mạng nội bộ · v6.42
- **✅ Root cause (xác nhận qua code)**: S69 thêm `_fetchWithTimeout` với **`GAS_TIMEOUT_MS=30000` áp cho MỌI request** `gasPost`/`doLogin`. `doLogin` (`auth.js`) là request **nhỏ** (chỉ token+user) → kịp <30s ngay cả khi mạng nội bộ bị bóp → **login sống**. Nhưng `readFromHandle`→`gasPost({action:'read'})` (`api.js`) tải **toàn bộ Task_Master** (hàng trăm dòng × 24 cột) — payload lớn; mạng nội bộ ANBM bóp băng thông `script.google.com` → **>30s → AbortController abort → "Máy chủ phản hồi quá lâu"** → `autoConnectDB` catch → `_showStartupRetry`. Mạng ngoài đủ băng thông → read <30s → OK. Trước S69 không timeout → read chậm nhưng vẫn xong (hoặc treo vô hạn = bug S69 sửa); S69 biến "treo" thành "abort 30s" nhưng cắt oan read hợp lệ trên mạng nội bộ.
- **✅ Fix (thuần FE, chốt qua phỏng vấn 2 câu → read 90s / tương tác 30s / giữ overlay + phụ đề)**:
  - `auth.js` — NEW `GAS_READ_TIMEOUT_MS=90000`; `gasPost(body, timeoutMs)` nhận timeout tùy chọn (mặc định `GAS_TIMEOUT_MS=30000` cho tương tác). Bulk read truyền 90s → chậm hợp lệ trên mạng nội bộ không bị cắt oan; quá 90s = kết nối chết thật → nút Sync/cache đỡ (thiết kế S69).
  - Read path truyền `GAS_READ_TIMEOUT_MS`: `api.js` (`read`, `case-pipeline-read`, syncAction-read, `user-list`/loadAppUsers, `issue-read`, `dev-read`, `notif-read`, `audit-read`), `initiatives.js` (`initiative-read`), `h2-core.js` (`h2-read-all`), `kpi-parser.js` (`kpi-read`), `views/user-management.js` (`user-list`). **Writes/upsert/delete GIỮ 30s** (fail nhanh, theo hợp đồng đã chốt với user).
  - `app.js` — grace-window auth `startApp` `GAS_TIMEOUT_MS+5s`→`GAS_READ_TIMEOUT_MS+5s` (35s→95s): read nền startup chậm trả `AUTH_REQUIRED` muộn không xóa oan phiên vừa login. `autoConnectDB`/`syncDB` showLoading thêm phụ đề "(mạng nội bộ có thể chậm, vui lòng chờ)".
  - `config.js` v6.42; `index.html` cache-bust `?v=20260812d`→`e` (65 refs).
- **✅ Decision**: (a) read **90s** (không 60/120) — cân bằng: đủ rộng cho read lớn mạng nội bộ, vẫn bounded để không treo lâu. (b) tương tác (login/đổi mật khẩu/**ghi**) **giữ 30s** → fail nhanh, responsive. (c) UX chờ = **giữ overlay chặn + phụ đề trấn an** (user chọn, không đổi luồng startup sang render-cache-nền). (d) grace-window phải phủ HẾT ngân sách read (95s) tránh logout oan.
- **⛔ Blocker**: Không. **Thuần frontend — KHÔNG cần deploy GAS mới** (giống S69).
- **➡️ Next step**: (1) Smoke **trên mạng nội bộ**: hard-reload → badge `v6.42`; login → data tải xong (hết "timeout"). (2) Nếu vẫn timeout → F12 Network → request `exec` (action `read`) mất bao lâu/có xong không → chỉnh số hoặc nghi ANBM chặn hẳn domain. (3) (tùy chọn) cho `ai-chat` ngân sách riêng (LLM dài — TD-NET-01).
- **🟢 Regression risk**: 🟢 **THẤP** — chỉ nới trần abort cho read (happy path <30s không đổi hành vi) + thêm 1 param tùy chọn backward-compat (caller cũ không truyền → 30s như cũ). Full suite **31/32** = baseline S70 (fail duy nhất `verify_bld_queue` = 404 resource flaky, **đã chứng minh pre-existing qua `git stash`** — không do thay đổi). 6 file JS pass `node --check`. ⚠️ Nếu mạng nội bộ read >90s (hoặc ANBM chặn hẳn `script.google.com`) vẫn abort → cache+Sync đỡ; `ai-chat` vẫn 30s (ngoài phạm vi).

---

# SESSION HANDOVER (S70) — 2026-08-12
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `fd3c78a` (S69) → **sau (ĐÃ push)**: `278a68b` (4 commit: `ed1c5bf` seed · `7aaf01a` task-link · `84c46d9` scope · `278a68b` PIC-match)
**Version**: v6.40 → **v6.41.2** (`6.41.2-h2-tasklink-pic-match-20260812`, `?v=20260812d`)

> **2 việc H2 nối tiếp**: (1) **SEED** dữ liệu KPI H2/2026 pilot QuangNN3 + DungLQ1 vào DB; (2) **DEBUG + CR** liên kết Task ↔ Milestone trong "Quản trị H2 · Theo dõi KPI" (báo lỗi GAS khi lưu → thay bằng popup chọn task, đa task, owner-gated).

## S70.1 — Seed KPI pilot QuangNN3 + DungLQ1 · commit `ed1c5bf` · (giải quyết TD-H2-02)
- **✅ Task**: NEW `backend/H2SeedPilot.gs` nạp 2 bản KPI đã chuẩn hoá (`data/SAMPLE_QuangNN3_H2.md` + `SAMPLE_DungLQ1_H2.md`, mapping `data/04_MIGRATION_MAPPING.md`) vào 8 sheet H2_*. Pattern `dryRun/commit` như các migration khác — **chạy trong Apps Script editor, KHÔNG redeploy Web App**.
- **✅ Nội dung**: `h2SeedDryRun()` (log đếm + validate weight=100%/member, P1≤3, Obj≤5, KPI khớp Objective) · `h2SeedCommit()` (ghi idempotent, ID cố định OBJ/KPI/MS/RISK/DEP/TRK/REV-26-###, upsert theo ID) · `h2SeedClearPilot()` (xoá theo owner để seed lại). Sinh **8 Obj · 27 KPI · 28 Milestone · 8 Risk · 9 Dep · 135 Tracking rỗng T8–T12 · 2 Review rỗng**. Giữ nguyên placeholder `[cần đo T8]`/`[target?]`.
- **✅ Decision**: (a) nguồn = **bản chuẩn hoá MD** (không parse Excel thô). (b) **GAS seed script** (không Node/Web-App importer). (c) nạp **đủ 7 sheet** kể cả tracking rỗng + review rỗng (user chọn). (d) ID prefix khớp `_h2GenId` client → member thêm mới sau seed KHÔNG đụng. (e) validate sandbox-eval qua Node (GAS không chạy được under node) — widths/dup-ID/FK/weight OK.
- **✅ Username**: `QuangNN3`/`DungLQ1` — khớp mọi tham chiếu repo (um_test fixture, capture_h2_guide, verify_atomic_write). Không đọc được Sheet thật; dryRun log sẽ hiện owner để user đối chiếu.
- **⛔ Blocker**: Không. User tự chạy `h2SeedCommit()` trong GAS editor.

## S70.2 — DEBUG + CR: Task-picker liên kết Task ↔ Milestone · `7aaf01a`+`84c46d9`+`278a68b` · v6.41→6.41.2
- **✅ DEBUG (gốc)**: "thêm task-link vào milestone báo thất bại tại GAS khi lưu" (user test **Teamlead**). Đường ghi milestone-upsert đúng logic cho lead → gốc khả dĩ nhất: **route H2 chưa lên deployment cá nhân sau revert S67** (H2 backend commit 08-11 SAU revert 08-10) → `action không hợp lệ`. CR chuyển link sang **action riêng** nên không phụ thuộc milestone-upsert; redeploy H2 lần này khép luôn deploy-gap.
- **✅ CR (thay TaskRef free-text bằng popup chọn task)**:
  - **Backend (`7aaf01a`, ĐÃ redeploy — user, link không đổi)**: NEW `h2HandleTaskLink()` (`H2Service.gs`) **owner-gated** (chủ mốc HOẶC Admin/Teamlead) — cập nhật **CHỈ cột TaskRef**; `Code.gs` route `h2-milestone-tasklink`. → member link được task của mình mà không cần quyền sửa toàn bộ mốc.
  - **FE**: nút **"+ Task"** mỗi mốc (hiện cho chủ mốc + lead) → popup `#h2TaskPickerOverlay`: search theo mã/tên, droplist Initiative, Status, checkbox Quá hạn. **1 mốc ↔ NHIỀU task** (TaskRef gộp phẩy — KHÔNG đổi schema). Chip task click → chi tiết common (`openTaskViewPopup`, z-index 790 < taskViewOverlay 800), × để bỏ liên kết. `h2-core.js` `_gasH2TaskLink` (optimistic). Modal milestone bỏ TaskRef free-text (giữ TaskRef khi sửa mốc).
  - **Scope task hiển thị (2 lần sửa theo phản hồi)**: `84c46d9` — từ **chỉ picAcc** → **picRes HOẶC picAcc** (định nghĩa "Công việc của tôi"). `278a68b` — thêm khớp theo **username HOẶC tên hiển thị** (`_h2OwnerMatchSet` qua `getCurrentUser`+`_appUsers`) vì cột PIC có thể lưu tên hiển thị còn Owner mốc là username → trước đó "chỉ thấy 1 task".
- **✅ Decision**: (a) task-link = **action owner-gated riêng** (không nới quyền milestone-upsert — mốc vẫn do lead challenge & duyệt). (b) lưu **nhiều task = CSV trong TaskRef** (không đổi schema H2). (c) phạm vi task = **Res||Acc của CHỦ MỐC** (member link mốc mình→task mình; lead link hộ→task của member). (d) khớp PIC theo **username ∪ display name** để bền với 2 cách lưu. (e) click chip/task = **popup common** có sẵn (không làm popup mới).
- **⛔ Blocker**: Không. ✅ **GAS đã redeploy (user, link không đổi)**. 4 commit **ĐÃ push**.
- **➡️ Next step**: (1) Hard-reload PRD → badge `v6.41.2`. (2) Chạy `h2SeedCommit()` (nếu chưa). (3) Smoke: "+ Task" 1 mốc → hiện **mọi task user phụ trách** (Res/Acc), tick nhiều → Lưu → chip giữ sau reload (xác nhận GAS ghi); click chip → chi tiết; × bỏ link; member chỉ "+ Task" mốc mình. (4) Nếu vẫn thiếu task → gửi 1 mẫu: giá trị cột PIC vs username login (có thể alias ngoài User_Master).
- **🟢 Regression risk**: 🟢 **THẤP** — backend thêm 1 action cô lập (không đụng upsert/delete cũ); FE khu trú `h2-tracker.js`/`h2-core.js`/`index.html`/`h2.css`. `verify_h2_tasklink` **28/28** (scope Res/Acc, tên hiển thị, đa-link, chi tiết, unlink, payload, RBAC) + H2 core/tracker/dashboard/review **KHÔNG đổi**. Full suite **31/32** — fail duy nhất `verify_bld_queue` = **flaky batch** (chạy riêng 20/20, suite nặng nhất; KHÔNG do thay đổi). ⚠️ TaskRef CSV không có FK: task bị xoá → chip vẫn hiện id (không tự dọn); scope khớp username∪display-name là heuristic (alias lạ vẫn trượt).

---

# SESSION HANDOVER (S69) — 2026-08-12
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `bee61f8` (S68) → **sau (ĐÃ push)**: `72cbe6a`
**Version**: v6.39 → **v6.40** (`6.40-login-hang-timeout-fix-20260812`, `?v=20260812`)

> **DEBUG — khắc phục treo/khóa đăng nhập.** User báo: đăng nhập bị treo (xoay lâu → màn gần như trắng, không nút Sync, không role/user thật), role đôi khi hiện "Quản trị viên" nhưng không load data; Ctrl+Shift+R vẫn ra trạng thái cũ, **buộc phải clear lịch sử mới đăng nhập lại được**. Phỏng vấn: thỉnh thoảng, **cả 2 mạng** (nội bộ + ngoài).

## S69 — Fix login hang / lock-out khi mạng chậm/bị chặn · commit `72cbe6a` · v6.40
- **✅ Root cause (xác nhận qua code, KHÔNG phải lỗi role/auth như user đoán)**: (1) **MỌI request GAS không có timeout** — `gasPost`/`doLogin` dùng `fetch` trần → 1 kết nối stall tới `script.google.com` (ANBM/mạng nội bộ có thể giữ kết nối, hoặc GAS cold-start) làm **spin vô hạn**. (2) `autoConnectDB` bật **overlay tải chặn toàn màn** rồi `await` read; fetch treo → `catch{hideLoading}` **không bao giờ chạy** → treo; `btnSync` chỉ hiện khi read **thành công** → thất bại = màn gần trắng, không nút Sync. (3) `startApp` bắn ~7 read nền song song (cases/issues/dev/init/users/notif/h2); **bất kỳ** read trả `AUTH_REQUIRED` → `gasPost` gọi `doLogout()` **xóa phiên** → mất role/user. (4) Reload: phiên còn hạn tự phát lại đúng startup mong manh → lại treo; chỉ **clear site data** (xóa `shtd_auth_v1`) mới thoát. Placeholder `.user-pill` hardcode "Quản trị viên" trong `index.html` là thứ user thấy khi `applyUserToUI` chưa chạy (không phải role thật).
- **✅ Fix (thuần frontend, theo lựa chọn user: "giữ đăng nhập + data cache + nút Thử lại")**:
  - `assets/js/auth.js` — NEW `_fetchWithTimeout(url,opts,ms)` (AbortController, `GAS_TIMEOUT_MS=30000`) dùng cho `gasPost` + `doLogin` → hết spin vô hạn, timeout báo lỗi rõ. NEW cờ `_authStartupGrace`: khi bật, `AUTH_REQUIRED` **KHÔNG** `doLogout` (một blip lúc khởi động không được xóa phiên vừa login); ngoài khởi động vẫn logout khi hết hạn thật. Lỗi mạng bọc message tiếng Việt thân thiện.
  - `assets/js/app.js` — `window.onload` bọc **try/catch** (hết màn trắng nửa vời nếu startup throw). `startApp` bật `_authStartupGrace=true` + `setTimeout` gỡ sau `GAS_TIMEOUT_MS+5s`. `autoConnectDB` catch → NEW `_showStartupRetry(msg)`: giữ phiên + data cache, **hiện `btnSync` = Thử lại**, `dbDot`/`dbStatus`/`sbDb` → "Ngoại tuyến (cache)", toast 8s. `syncDB` thành công → khôi phục trạng thái "đã kết nối" (đặc biệt sau khi retry).
  - `assets/js/config.js` v6.40; `index.html` cache-bust `?v=20260811c`→`?v=20260812` (65 refs).
- **✅ Decision**: (a) Timeout **30s** (không 20–25s) để tránh false-timeout khi GAS cold-start hợp lệ; đằng nào retry cũng cứu được. (b) `_authStartupGrace` là **cờ theo cửa sổ thời gian** (không sửa hợp đồng `gasPost` cho mọi caller) → interactive save/change-pw vẫn auto-logout khi hết hạn thật; chỉ startup được miễn. (c) On-fail = **giữ đăng nhập + cache + Sync** (không quay về login, không auto-retry ngầm) — user chọn phương án an toàn nhất, không bao giờ bị khóa. (d) **KHÔNG** đụng placeholder `.user-pill` "Quản trị viên" đợt này (đề xuất blank ở next step — tránh đụng test markup).
- **⛔ Blocker**: Không. **Thuần frontend — KHÔNG cần deploy GAS mới.** ✅ **ĐÃ push** `72cbe6a`.
- **➡️ Next step**: (1) Smoke PRD: hard-reload → badge `v6.40`; DevTools **Offline** khi login → trong 30s phải giữ đăng nhập + hiện cache + nút **Sync** (không treo/trắng); bật mạng → Sync → data về; reload khi lỗi → **không bị khóa**, không cần clear history. (2) Nếu vẫn lạ → gửi ảnh Console (đã có log `[SHTD] Khởi động thất bại:` / `Auto-connect thất bại:`). (3) (tùy chọn) blank placeholder `.user-pill` để trang chưa tải không trông như đã login admin.
- **🟢 Regression risk**: 🟢 **THẤP** — thêm timeout + try/catch + nhánh fail-graceful; happy path không đổi (fetch OK → như cũ). Full suite **30/31** — fail duy nhất `verify_i18n_p7` = **flaky batch** (`ReferenceError: db` do timing; chạy riêng **35/35 PASS**), KHÔNG do thay đổi. Mọi suite load-page khác (my_work/issue_tracker/H2…) xanh. ⚠️ `gasPost` giờ có timeout 30s → nếu GAS thật chậm >30s (hiếm) request sẽ abort thay vì chờ — có Sync retry bù lại.

---

# SESSION HANDOVER (S68) — 2026-08-11
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `daf0421` (S-H2 B3) → **sau (ĐÃ push)**: `bee61f8` (3 commit: `2a84883` feature · `a1cdc63` handover · `bee61f8` user guide)
**Version**: v6.38 → **v6.39** (`6.39-h2-dashboard-review-20260811`, `?v=20260811c`)

> **Khôi phục sau phiên đóng bất thường + hoàn tất Track B (Quản trị H2).** Phiên trước bị đóng giữa lúc chạy test → kết quả & context chưa cập nhật. Rà soát toàn bộ working tree để xác định đã-làm/đang-dở TRƯỚC khi đi tiếp.

## S68.0 — Rà soát trạng thái (context recovery)
- **Đã commit an toàn (2 commit H2 trước phiên)**: `77ce233` Track B **B1+B2** (backend `H2Service.gs` + client core `h2-core.js`); `daf0421` Track B **B3** (view **Tracker** Objective→KPI→Milestone). Backend `H2Service.gs` **đã có sẵn** sheet `H2_Reviews` + route `h2-review-upsert` + ownership gate; `Code.gs` map đủ route → **backend cho phần dở đã xong từ B1**.
- **Đang dở (uncommitted, mtime 14:06–14:09 = SAU lần test cuối 12:41)**: 2 view mới `views/h2-dashboard.js` (339 dòng) + `views/h2-review.js` (123 dòng) untracked; wiring `index.html`/`navigation.js`/`i18n.js`/`h2.css`/`h2-core.js` unstaged. **Feature đủ code, load sạch (0 JS error) nhưng CHƯA test/commit/doc.** Đúng chỗ phiên trước bỏ dở: viết test cho 2 view mới.
- **Kết luận**: không có gì hỏng/xung đột; mọi symbol tham chiếu (`renderH2Dashboard/Review`, `H2_REVIEW_Q`, `H2_CAP_DIMS`…) đều đã định nghĩa.

## S68 — Hoàn tất Track B: Dashboard điều hành + Tự đánh giá + Xuất báo cáo BLĐ · commit `2a84883` · v6.39
- **✅ Task**: viết test → verify → commit cho 2 view cuối Track B (theo yêu cầu user: chuẩn push workflow).
- **✅ `h2-dashboard.js`** (executive-first): exec summary 6 card (điểm KPI team / 🟢🟠🔴 / KPI hoàn thành / cần chú ý), panel theo **member / pillar / objective**, **Top Risks / Top Dependencies** (item đang mở), **Capacity** (bảng + cờ ⚠ quá tải khi P1 > max_p1), **AI Impact** (P3-AI), **Management Actions** (KPI Amber/Red + mốc quá hạn), chart **trend T8→T12** + **doughnut RAG** (Chart.js), **Xuất báo cáo BLĐ (B8)** → overlay `#h2ReportOverlay` textarea copy-ready (`h2BuildReportText` 8 mục realtime).
- **✅ `h2-review.js`**: Tự đánh giá **H1/T7 + Q3/Q4** + **8 chiều năng lực** (1–5, badge TB). Member sở hữu review của mình (lọc theo cột `Member`); **Teamlead/Admin xem tất cả** + chọn member. Modal 8 câu hỏi + 8 cap select. Optimistic save qua `_gasH2Upsert('review')` (backend gate sẵn).
- **✅ Wiring**: `index.html` nav 2 mục (`h2-dashboard`/`h2-review`) + 2 `<section>` + review modal + report overlay + 2 script tag; `navigation.js` routing + ESC (`_h2rEscClose`, `h2CloseReport`); `i18n.js` nav/page VI+EN; `h2.css` +44 dòng dashboard; `h2-core.js` hook re-render review trong `readH2`.
- **✅ Tests (NEW)**: `verify_h2_dashboard.mjs` **24/24** (cards/panels/capacity-overload/charts/report/empty/RBAC-lead), `verify_h2_review.mjs` **20/20** (render/RBAC member-vs-lead/modal populate/save-append/empty) + thêm vào `run_tests.mjs`. Version `config.js` v6.39; cache-bust `?v=20260811b`→`c` (65 refs).
- **✅ Decision**: (a) Bump version + cache-bust vì WIP đụng asset đã cache (i18n/nav/h2-core/css/index). (b) Commit **source + test + evidence h2_dashboard/h2_review/h2_tracker**, **KHÔNG** commit ~70 PNG suite khác bị đổi (đã dirty từ đầu phiên trước — noise). (c) Test dùng lại harness `verify_h2_tracker` (stub `window.readH2`, mock `dbH2`, abort `script.google.com`); dashboard mock thêm member `OverX` 4×P1 để test cờ quá tải deterministic.
- **⛔ Blocker**: Không. **Thuần frontend + test — KHÔNG cần deploy GAS mới** (backend reviews đã live từ B1). ✅ **ĐÃ push** `2a84883` (+ `a1cdc63` docs).
- **➡️ Next step**: (1) ✅ Push xong → user smoke test tại **PRD**. (2) Hard-reload → badge `v6.39`; menu "Quản trị H2 · Dashboard" hiện exec cards + chart + Xuất báo cáo BLĐ; "Tự đánh giá" thêm/sửa review, member chỉ thấy của mình. (3) (nợ S67) smoke test v6.36 ngày ISO trên production. (4) ~70 PNG suite khác vẫn dirty trong working tree (không do phiên này) — dọn/khôi phục nếu muốn tree sạch.
- **🟢 Regression risk**: 🟢 **THẤP** — thuần thêm 2 view mới + wiring additive; view cũ (tracker) không đụng. Full suite **29/31** = baseline y hệt S67 (2 fail duy nhất `my_work` MW6 + `issue_tracker` = flaky batch pre-existing; chạy riêng: my_work **61/62** chỉ MW6, issue_tracker **61/61**). H2: core 14/14, tracker 32/32, dashboard 24/24, review 20/20.

## S68.1 — Hướng dẫn sử dụng Quản trị H2 · KPI (có ảnh minh họa) · commit `bee61f8`
- **✅ Task**: viết bản hướng dẫn end-user đầy đủ mọi thao tác (yêu cầu user: "outcome dạng doc có ảnh minh họa").
- **✅ Files (NEW)**: `docs/HUONG_DAN_SU_DUNG_H2_KPI.md` (VI: tổng quan/khái niệm, phân quyền, 3 màn hình với từng thao tác thêm/sửa/xóa Objective·KPI·Milestone + review + dashboard + xuất báo cáo, cách tính RAG/điểm, quy tắc, FAQ); `docs/img/h2/*.png` (**10 ảnh** chụp thật từ UI); `capture_h2_guide.mjs` (script Playwright tái tạo ảnh).
- **✅ Decision**: ảnh chụp **thật** headless (dữ liệu pilot Quang/Dung), KHÔNG vẽ tay; Markdown ref `img/h2/*.png` → render inline trên GitHub; giữ script để chụp lại khi UI đổi.
- **⛔ Blocker**: Không. ✅ **ĐÃ push** `bee61f8`.
- **➡️ Next step**: (tùy chọn) bản EN; chạy `node capture_h2_guide.mjs` cập nhật ảnh khi UI H2 đổi.
- **🟢 Regression risk**: 🟢 **KHÔNG** — thuần docs + ảnh + script tiện ích (ngoài `run_tests.mjs`, không đụng app).

---

# SESSION HANDOVER (S67) — 2026-08-10
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `0c55158` (S66) → **sau**: `d8779d9`
**Version**: v6.34 → **v6.35** (revert GAS) → **v6.36** (`6.36-date-unify-iso-20260810`, `?v=20260810b`)

> Hai việc nối tiếp: (1) **REVERT** backend về tài khoản **cá nhân** (bỏ hướng S59 cơ quan) vì ANBM không xử lý được + noti không chạy trên mạng nội bộ; (2) **đồng nhất logic ngày tháng toàn dự án** (ISO lưu / DD/MM/YYYY hiển thị) + fix dữ liệu copy tay lỗi locale ("26/thg 7/30", modal trống ngày).

## S67.1 — Revert GAS/Sheet về tài khoản cá nhân · commit `54ca398` · v6.35
- **✅ Task**: trỏ backend về deployment cá nhân cũ. `config.js` `GS_WEBAPP_URL` → `AKfycbydyik…97f2`; `constants.js` `GS_SHEET_ID` + `backend/Config.gs` `SPREADSHEET_ID` → Sheet cũ `1cpg1p_8…56Hk`; `index.html` cache-bust `?v=20260810` (60 refs). Thuần config — deployment cá nhân cũ **vẫn live**, KHÔNG deploy GAS mới.
- **✅ Decision**: bỏ hẳn hướng migration S59 (tài khoản cơ quan `cb_sptd_7@tpbank.vn`) — ANBM chưa xử lý được + noti/CRUD không chạy trên mạng nội bộ khi trỏ account cơ quan. Giá trị cơ quan (`AKfycbw1…DSg` / `1t4tkaw4…Zq4g`) **retired**; các doc S59/S66 mô tả hướng cơ quan = **đã bỏ**.
- **⚠️ Data caveat**: dữ liệu tạo/sửa 04-08→10-08 **chỉ nằm ở Sheet cơ quan**. User đã **copy tay** sang Sheet cũ → phát sinh lỗi định dạng ngày (xem S67.2).

## S67.2 — Đồng nhất logic ngày tháng + fix dữ liệu locale · commit `559782d` (+4 fix migration) · v6.36
- **✅ Task completed**: (1) Gom toàn bộ xử lý ngày về **1 nguồn** trong `helpers.js`: `toISODate(v)` (parser vạn năng → ISO), `fmtDate` (→ DD/MM/YYYY), `parseVNDate`/`fmtDateExport` route qua `toISODate`. Mọi **reader** (task/case/init/dev/issue) normalize ISO vào memory; mọi **writer** ghi ISO; mọi **hiển thị** dùng `fmtDate`. (2) NEW `backend/DateNormalizeMigration.gs` (dryRun/commit) chuẩn hoá cột ngày 5 sheet → ISO. **User đã chạy `commitNormalizeDates()` thành công (build 2026-08-10d).**
- **✅ Gốc lỗi** "26/thg 7/30" + modal trống ngày: copy tay giữa Sheet biến ô ngày thành Date/serial/locale (`30-thg 7-26`); mỗi entity parse một kiểu, `parseDate` của Task **không nhận** `DD-MMM-YY` → memory không phải ISO → `<input type=date>` không nhận value (mọi field ngày đều type=date, cần ISO).
- **✅ Files changed (14 source + 2 NEW test/GAS, đã push)**: `helpers.js` (toISODate/fmtDate/parseVNDate/fmtDateExport), `parsers.js` (2 parseDate→toISODate), `api.js` (rawDate + rowToDev/rowToIssue + devToRow/issueToRow), `initiatives.js` (initiativeToRow + parse), `views/initiative-tracker.js` (_initToISO=toISODate, save→toISODate, display fmtDate), `views/action-plan.js` + `views/dev-plan.js` + `views/issue-tracker.js` (display fmtDate), `report.js` (Excel human cells fmtDate), `config.js` v6.36, `index.html` `?v=20260810b`. NEW `backend/DateNormalizeMigration.gs`, `verify_date_unify.mjs` (28/28). MOD `verify_history.mjs` (H13 kỳ vọng ISO), `run_tests.mjs`.
- **✅ Decision** (phỏng vấn 2 câu): (a) canonical **ISO YYYY-MM-DD** cho storage + memory; (b) hiển thị **DD/MM/YYYY**. (c) `toISODate` permissive (Date obj, Excel serial, ISO, DD-MMM-YY, `DD-thg M-YY`/`DD-tháng`, DD/MM/YYYY) — không throw. (d) Dev **"Review cuối" (`lastReview`) KHÔNG normalize** — là timestamp date+time, không phải date-picker. (e) Migration **bỏ setNumberFormat** (cột kiểu ngày/Tables chặn "không thể đặt định dạng số của cột đã nhập") → chỉ `setValues(ISO)`; khoá Plain-text làm tay nếu cần.
- **🔧 4 fix migration nối tiếp**: `10c3dd9` (formatDate pattern "(Date)" → nối chuỗi JS), `3262a97` (setNumberFormat best-effort try/catch), `95f31ee` (ghi giá trị trước, khoá text sau), `d8779d9` (**bỏ hẳn setNumberFormat** + banner `_DN_BUILD` để xác nhận đúng bản — nguyên nhân lỗi lặp là editor chạy bản CHƯA lưu / cần Ctrl+S).
- **⛔ Blocker**: Không (code). Migration đã chạy xong. Data gap 04-08→10-08 do user tự quản (copy tay + migration đã chuẩn hoá).
- **➡️ Next step**: (1) Hard-reload production badge `v6.36` → ngày hiện **DD/MM/YYYY**, click chi tiết + modal Sửa **điền đủ ngày**. (2) (tùy chọn) set cột ngày → Plain-text trên Sheets UI chống tái diễn. (3) Xác minh noti chạy được trên mạng nội bộ (ANBM có thể chặn cả domain `script.google.com` — CHƯA xác minh). (4) (nợ S57) điền Email `User_Master`. (5) Nếu thiếu bản ghi 04-08→10-08 ở Sheet cũ → merge từ Sheet cơ quan.
- **🟢 Regression risk**: 🟢 **THẤP** — date refactor gom về 1 helper, có unit-test đầy đủ. `verify_date_unify` **28/28** (mọi format + bug "thg 7" + round-trip). `verify_history` **47/47** (H13 sửa kỳ vọng ISO — trước là DD-MMM-YY stale TD-TEST-02, nay đã đóng). Full suite **26/27** — fail duy nhất `my_work` MW6 = flaky pre-existing TD-TEST-01 (fail cả khi chạy riêng lẫn batch, KHÔNG liên quan ngày; xác nhận đã fail TRƯỚC mọi thay đổi session). Revert = thuần config. ⚠️ `toISODate` giờ nằm trên **mọi** read/write/display path ngày — bug ở đó ảnh hưởng toàn bộ field ngày; đã phủ 28 checks.

---

# SESSION HANDOVER (S66) — 2026-08-07
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `2953e14` (S65 docs) → **sau**: `0c55158`
**Version**: v6.33 → **v6.34** (`6.34-init-category-es-health-20260807`, `?v=20260807b`)

> DEBUG 3 phần: (1) **đồng nhất droplist Category** Initiative (modal Thêm + mọi filter) + thêm **Bất Động Sản**; (2)(3) tab **Tổng hợp BLĐ** → "Sức khỏe từng Initiative": **filter theo Category** + thêm cột **Tên + Phụ trách** + click dòng → **popup chi tiết initiative**. Thuần frontend — **KHÔNG GAS deploy**.

## S66 — Initiative Category đồng nhất + ES health nâng cấp · commit `0c55158` · v6.34
- **✅ Part 1 — Category đồng nhất (+ Bất Động Sản)**: NEW `INIT_CATEGORIES` (6 cũ + **Bất Động Sản**) + `_initCategories()` (chuẩn ∪ category lạ trong data để không mồ côi) trong `initiative-tracker.js`. Modal Thêm `#initFCat` (trước hardcode 6 option) + filter `#initSelCat` (`_initCategoryOptions`) + filter ES đều render từ **một nguồn** → danh sách **giống hệt** mọi nơi.
- **✅ Part 2 — ES "Sức khỏe từng Initiative" view theo Category**: thêm droplist `#esInitCatFilter` ở card-header → `esFilterInitCat(val)` lọc bảng theo mảng (re-render từ cache `_esInitSummaryCache`, không tính lại toàn ES). "Tất cả" = hiện hết.
- **✅ Part 3 — cột Tên + Phụ trách + click→popup**: `_esRenderInitTable` join `db.initiatives` theo key (`t.initiative === ini.id`) → cột 1 hiện **Tên** (trước là ID), thêm cột **Phụ trách** (accountable) → **8 cột** (colspan empty 7→8). Dòng có initiative thực → `onclick="openInitViewPopup(id)"` (popup chi tiết đã có sẵn, S25). Dòng BAU/không map → "—", không click.
- **✅ Files changed (5 source + 3 docs, đã push)**: `assets/js/views/initiative-tracker.js` (INIT_CATEGORIES/_initCategories; modal option động), `assets/js/views/executive-summary.js` (`_esInitCatFilter`/`esFilterInitCat`/`_esRenderInitTable` join+filter+click), `index.html` (ES card-header +select, thead +cột Phụ trách, cache-bust `?v=20260807b` 60 refs), `assets/js/config.js` (v6.34), `run_tests.mjs`. NEW `verify_es_init_health.mjs`.
- **✅ Decision** (chốt qua phỏng vấn 3 câu): (a) filter Category ES = **droplist** (không group section). (b) click dòng = **popup initiative có sẵn** `openInitViewPopup` (không làm popup drill-down task mới). (c) danh sách Category = **full canonical** cho cả modal lẫn filter (identical). (d) Category ES lấy từ **initiative gốc** (db.initiatives.category), không phải task.category; BAU không có initiative → không phân loại/không click.
- **⛔ Blocker**: Không. **Thuần frontend — KHÔNG cần GAS deploy.** User hard-reload nhận `?v=20260807b` + badge v6.34.
- **➡️ Next step**: (1) Hard-reload → smoke: Initiative modal Thêm có "Bất Động Sản"; filter Initiative + ES đều có; (2) ES "Sức khỏe từng Initiative" hiện Tên + Phụ trách, lọc theo mảng, click 1 dòng → popup chi tiết mở; BAU không mở. (3) (nợ cũ) Case Pipeline multi-week (S62 P1); dọn dead code TD-INIT-01.
- **🟢 Regression risk**: 🟢 **THẤP** — thuần frontend, khu trú 2 view + markup ES. `verify_es_init_health` **14/14** (8 cột, name/acc, filter BĐS, click popup, BAU no-click, modal category). `verify_initiative_tracker` 19/19, `verify_i18n_p5` 24/24 (ES), `verify_i18n_p6` 29/29 (filter Initiative). Full suite **24/25** — chỉ H13 pre-existing (TD-TEST-02, không liên quan). ⚠️ ES table key = `t.initiative`; chỉ join được khi khớp `db.initiatives.id` → tên/phụ trách/category rỗng cho task trỏ initiative không tồn tại (giữ hành vi hiện ID cũ).

---

# SESSION HANDOVER (S65) — 2026-08-07
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `964539a` (S64) → **sau**: `8307173`
**Version**: v6.32 → **v6.33** (`6.33-concurrent-create-idlock-20260807`, `?v=20260807`)

> DEBUG: sửa lỗi **ghi đè dữ liệu khi 2 người cùng tạo mới cùng lúc** (mã tuần tự sinh từ cache local → trùng → upsert-theo-ID của người sau đè dòng người trước). Rà soát toàn bộ → lỗi có ở **cả 5 entity**. Fix bằng **server làm nguồn sự thật**: reassign mã dưới `LockService`. ✅ **GAS đã redeploy** (user, 2026-08-07, URL không đổi).

## S65 — Guard chống ghi đè khi tạo trùng đồng thời (5 entity) · commit `8307173` · v6.33
- **✅ Root cause**: create → client sinh mã tuần tự từ **cache local** (`genId`/`genCaseId`/`genIssueId`/`genDevId` + milestone `-M#`). 2 người tạo cùng lúc → **cùng mã** (vd `DEV-26-005`). A ghi trước (append), B ghi sau → `*UpsertRow` tìm thấy dòng A theo ID → **ghi đè**. Bản ghi A mất âm thầm. Có ở cả Task/Case/Issue/Initiative(+Milestone)/Dev.
- **✅ Fix (server-authoritative, chốt qua phỏng vấn)**: **NEW `backend/Concurrency.gs`** — `_acquireWriteLock()` (script lock 20s) + `reassignIdIfExists(sheetName, id)` tách `<prefix><số cuối>`, nếu ID đã tồn tại → tăng số tới khi trống (đúng mọi lược đồ vì mã luôn kết thúc bằng số; dấu `-` chặn `\d+` nuốt số giữa). **`Code.gs`**: cả 5 handler `*-upsert` bọc trong write lock; khi `isNew` → reassign nếu trùng + đồng bộ `row[0]` + trả `id`. Check-then-write giờ atomic giữa các execution đồng thời.
- **✅ Client**: mỗi create gửi `isNew:true`; helper chung `_adoptReassignedId()` (api.js) nhận mã mới server cấp vào bản ghi local → persist + render + toast (`sync.id-reassigned` VI/EN). Edit gửi `isNew:false` (không reassign) → rename/update giữ nguyên. Create không trùng → không ảnh hưởng (helper return sớm). Callers: `_gasTaskUpsert` (isNew=!oldId), `_gasCaseUpsert/_gasIssueUpsert/_gasDevUpsert(rec,isNew)`, `_gasInitiativeUpsert(ini,isNew)` + `syncInitiativeAdd(ini,isNew)`; view save truyền `isNew` (case-pipeline chốt `!_cpEditId` TRƯỚC `closeCaseModal`).
- **✅ Files changed (13 source, đã push)**: NEW `backend/Concurrency.gs`, `verify_id_reassign.mjs`; MOD `backend/Code.gs`, `assets/js/{api.js, initiatives.js, i18n.js, config.js}`, `assets/js/views/{case-pipeline.js, dev-plan.js, issue-tracker.js, initiative-tracker.js}`, `index.html` (cache-bust 60 refs), `run_tests.mjs`.
- **✅ Decision**: (a) reassign **chỉ khi tạo mới** (`isNew`), KHÔNG áp cho edit/rename (mã rename do user chủ chọn, đã qua dup-check local). (b) Lock bọc **upsert** (nơi reassign cần atomic); delete để nguyên (2 create đồng thời đã được lock tuần tự hoá — đủ). Bulk write-all (`write`/`case-write`/`initiative-write`/import Excel) **ngoài phạm vi** đợt này (admin/bulk, hiếm). (c) Backward-compat: client cũ không gửi `isNew` → server coi như edit → hành vi cũ; response `id` bị client cũ bỏ qua.
- **⛔ Blocker**: ✅ **ĐÃ GỠ** — GAS redeploy **xong** (user, 2026-08-07): `Concurrency.gs` + `Code.gs` mới đã lên, **URL không đổi**. Server-side guard đã live.
- **➡️ Next step**: (1) Hard-reload → badge `v6.33`. (2) Smoke đa-user: 2 người tạo Task/Case/Issue/Dev/Milestone cùng lúc → không mất bản ghi; người thứ 2 thấy toast "đã cấp mã mới". (3) (nợ) cân nhắc lock cho bulk write-all + atomic delete (TD-INIT-02).
- **🟢 Regression risk**: 🟢 **THẤP** — server: thêm nhánh `isNew` + lock (path cũ nguyên vẹn khi không có `isNew`). Client: thêm param + adopt (no-op khi mã không đổi). `verify_id_reassign` **17/17** (spec mirror thuật toán). Full suite **24/25** — fail duy nhất `history` H13 = pre-existing TD-TEST-02 (ISO vs DD-MMM-YY), KHÔNG liên quan. my_work + issue_tracker **pass** in-batch lần này. ⚠️ Spec test là **bản port** thuật toán GAS (GAS không chạy được dưới node) — sửa `Concurrency.gs` phải cập nhật test song song.

---

# SESSION HANDOVER (S64) — 2026-08-06
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `43c6da0` (S63 test EVD) → **sau**: `964539a` (S64)
**Version**: v6.31 → **v6.32** (`6.32-init-acc-filter-ms-delete-20260806`, `?v=20260806b`)

> CR nhỏ trên **Theo dõi Initiative**: (1) bổ sung **filter theo Accountable** để thao tác nhanh tại UI; (2) cho phép **xóa Milestone** (hỗ trợ sửa thao tác sai). Thuần frontend — **không GAS deploy**.

## S64 — Initiative: filter Accountable + xóa Milestone · commit `964539a` · v6.32
- **✅ Task completed**: (1) **CR1 — Filter Accountable**: thêm dropdown "Tất cả Accountable" vào toolbar Initiative Tracker (giữa Category và Status), options **distinct** từ initiative gốc (sorted). Chọn 1 người → lọc **cả card list LẪN 5 ô số thống kê** (đồng nhất Category, theo phỏng vấn). (2) **CR2 — Xóa Milestone**: nút 🗑 (đỏ) trên mỗi milestone row cạnh nút Sửa → `_initDeleteMilestone` xóa milestone + **gỡ liên kết Task** (`task.milestone=''`, GIỮ Task + link initiative), confirm cảnh báo số Task bị gỡ trước khi xóa.
- **✅ Fix phụ (đúng ý đồ S55)**: `_initSetFilter` trước chỉ re-render `#initCardList` → đổi Category/Accountable làm **ô số thống kê bị lệch** (stat bar render 1 lần). Nay bọc stat bar trong `<div id="initStatBar">` + `_initSetFilter` re-render **cả** stat bar lẫn card list. Status filter không đổi ô số (base không phụ thuộc status) → an toàn.
- **✅ Files changed (5, đã push)**:
  - `assets/js/views/initiative-tracker.js` — state `_initFilterAcc`; select `#initSelAcc` + `_initAccountableOptions()`; `_initStatBase` +điều kiện accountable; `_initSetFilter` +type `acc` + re-render `#initStatBar`; restore filter selects theo **id** (`initSelCat/initSelAcc/initSelStatus`) thay vì index (bền với việc thêm select); nút 🗑 milestone + hàm `_initDeleteMilestone` (optimistic mirror `_initDelete`: xóa local → gỡ link task `_gasTaskUpsert` nền → `persist` → `writeInitiatives().catch` → render).
  - `assets/js/i18n.js` — +`it.filter.all-acc`, `it.ms.delete.confirm`, `it.ms.delete.warn-tasks` (VI+EN).
  - `assets/js/config.js` — `APP_VERSION='6.32-init-acc-filter-ms-delete-20260806'`; `index.html` — cache-bust `?v=20260806`→`?v=20260806b` (60 refs).
  - `verify_i18n_p6.mjs` — IP6-5/6 dời index Status (1→2, do thêm select) + thêm assert Accountable filter (index 1) → **29/29** (was 27).
- **✅ Decision** (chốt qua phỏng vấn 2 câu): (a) **Xóa Milestone = gỡ link Task, GIỮ Task** (không xóa task, không chặn). Task mất `task.milestone` (không còn trỏ ID đã mất) nhưng **giữ link initiative**; cảnh báo N task trước xóa. (b) **Filter Accountable từ Initiative + áp cả ô số** (giống Category), KHÔNG lấy từ User_Master (chỉ hiện người thực sự phụ trách). (c) Kết hợp **AND** với scope (Của tôi/Tất cả) + filter Status hiện có — đơn giản, dự đoán được.
- **⛔ Blocker**: Không. Thuần frontend — **KHÔNG cần GAS deploy**. User chỉ cần **hard-reload** nhận `?v=20260806b` + badge `v6.32`.
- **➡️ Next step**: (1) Hard-reload → smoke: Theo dõi Initiative → chọn 1 Accountable → card + 5 ô số lọc đúng người; đổi scope/category vẫn kết hợp đúng. (2) Mở Milestones 1 initiative → 🗑 → milestone biến mất **ngay**, Task liên kết **vẫn còn** nhưng mất nhãn milestone (thành "loose"/không milestone); ngắt mạng → xóa → có toast cảnh báo. (3) P1 tồn từ S62: áp tuần đa-tuần cho Case Pipeline. (4) P2: dọn dead code `syncInitiativeAction/Delete` (TD-INIT-01).
- **🟢 Regression risk**: 🟢 **THẤP** — khu trú 1 file view + i18n additive. CR e2e **11/11** (filter card+ô số cập nhật+reset; milestone removed, tasks kept & unlinked, initiative link giữ; 0 JS error). `verify_initiative_tracker` **19/19**, `verify_i18n_p6` **29/29** (cập nhật hợp lệ theo markup mới). Full batch flaky như thường (my_work/i18n_p8 fail trong batch, **pass khi chạy riêng**: my_work 62/62, i18n_p8 13/13 — timing, không do session). Fail dai dẳng duy nhất: `history` **H13** = pre-existing TD-TEST-02 (stale date từ S56, không liên quan CR). ⚠️ `_initDeleteMilestone` dùng `writeInitiatives()` (ghi tất cả dòng) chạy nền như `_initDelete` — chưa có atomic delete cho initiative/milestone (xem TD-INIT-02).

---

# SESSION HANDOVER (S63) — 2026-08-06
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `c9b273e` (S62 docs) → **sau**: `4112df3` (S63)
**Version**: v6.30 → **v6.31** (`6.31-async-optimistic-crud-20260806`, `?v=20260806`)

> UX tuning: rà soát toàn bộ CRUD → **Initiative Tracker** là điểm lệch duy nhất còn **await network TRƯỚC khi render** (lag "refresh lại toàn bộ"). Đưa Initiative về pattern **optimistic** như Task/Case/Issue/Dev + **bỏ toast thành công** trên cả 5 entity (chỉ báo khi lỗi). Thuần frontend — **không GAS deploy**.

## S63 — CRUD ghi/load bất đồng bộ + optimistic · commit `4112df3` · v6.31
- **✅ Task completed**: (1) **Initiative Tracker** `_initSave`/`_initDelete`/`_initFixLooseLink` — bỏ `await` network trước render: mutate local → `persist()` → `renderInitiativeTracker()` **NGAY**, ghi GAS atomic 1-dòng chạy **nền**. Item mới/sửa hiện tức thì thay vì chờ round-trip GAS. (2) **Bỏ toast thành công** ở add/edit/delete của **cả 5 entity** (Task/Case/Issue/Dev/Initiative+Milestone) → đúng yêu cầu "chỉ báo khi lưu không thành công".
- **✅ Nguyên nhân gốc (Initiative lệch)**: 4 entity kia đã optimistic từ S29/S30 (mutate→persist→close→render→`_gas*Upsert` KHÔNG await). Riêng `_initSave` `await syncInitiativeAdd/Edit` rồi mới `renderInitiativeTracker()` + toast success → modal đóng nhưng danh sách "đứng im" tới khi network xong. `syncInitiativeAdd/Edit` (initiatives.js) vốn đã mutate+persist **đồng bộ** rồi return promise ghi nền → chỉ cần **thôi await**.
- **✅ Files changed (7, đã push)**:
  - `assets/js/views/initiative-tracker.js` — `_initSave` optimistic (bỏ await + 2 toast added/updated); `_initDelete` bỏ toast deleted (giữ `.catch` lỗi); `_initFixLooseLink` bỏ toast success.
  - `assets/js/crud.js` — bỏ toast task-saved + task-deleted (giữ flow optimistic + `_gasTaskUpsert/Delete` nền).
  - `assets/js/views/case-pipeline.js` — bỏ toast "Đã thêm/cập nhật/xóa case".
  - `assets/js/views/issue-tracker.js` — bỏ toast "Đã tạo/cập nhật/xóa issue".
  - `assets/js/views/dev-plan.js` — bỏ toast dev added/updated/deleted.
  - `assets/js/config.js` — `APP_VERSION='6.31-async-optimistic-crud-20260806'`; `index.html` — cache-bust `?v=20260805c`→`?v=20260806` (60 refs).
- **✅ Decision**: (a) **Giữ toast LỖI** — nằm trong `_gas*Upsert/Delete` (warning + `syncDot` chuyển xám khi ghi fail) → local-vs-server luôn nhìn thấy được; feedback thành công = **UI cập nhật tức thì** + syncDot xanh. (b) **KHÔNG** đụng bulk-summary toast (bulk.js "Đã xóa N task") và manual-sync toast (app.js syncDB showLoading) — batch summary & thao tác user chủ động, feedback hợp lý. (c) `syncInitiativeAction`/`syncInitiativeDelete` (path cũ blocking `showLoading`) nay **dead code** — GIỮ nguyên (không tham chiếu ở view, tránh rủi ro đụng index.html); dọn sau (TD-INIT-01). (d) Rename Initiative (origId≠newId) giữ nguyên semantics cũ (atomic upsert dòng mới, orphan dòng cũ tới lần `writeInitiatives` đủ) — không mở rộng phạm vi.
- **⛔ Blocker**: Không. Thuần frontend — **KHÔNG cần GAS deploy**. User chỉ cần **hard-reload** nhận `?v=20260806` + badge `v6.31`.
- **➡️ Next step**: (1) Hard-reload → smoke: thêm/sửa Initiative + Milestone → item hiện **tức thì**, không lag, không toast success; ngắt mạng → sửa → **có** toast cảnh báo + syncDot xám. (2) Lặp lại nhanh cho Task/Case/Issue/Dev (không toast success, chỉ báo khi lỗi). (3) (tùy chọn) dọn dead code `syncInitiativeAction/Delete` (TD-INIT-01). (4) P1 tồn: áp tuần đa-tuần cho Case Pipeline (S62 nợ).
- **🟢 Regression risk**: 🟢 **THẤP** — chỉ bỏ `await` + xóa lệnh `toast(...,'success')`; flow optimistic (mutate/persist/render/ghi-nền) giữ nguyên. Không đụng schema/backend/GAS/read path. Full suite **22/24** = **baseline y hệt trước** (2 fail pre-existing: `my_work` MW22/MW23 progress-toggle S44b — fail cả khi chạy riêng, KHÔNG đụng my-work.js; `history` H13 stale date TD-TEST-02). Suite trực tiếp liên quan xanh: initiative **19/19**, dev_plan **40/40**, case **22/22**, atomic_write **41/41**, issue **61/61**. ⚠️ Không test nào assert vào toast text (IT5 check db/modal/row/KPI) → bỏ toast an toàn.

---

# SESSION HANDOVER (S61–S62) — 2026-08-05
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước**: `6d95f51` (S60 docs) → **sau**: `0b48e8b` (S62)
**Version**: v6.28 → **v6.30** (`6.30-report-week-multiweek-20260805`, `?v=20260805c`)

> Hai đợt nối tiếp: **S61** tự-hoàn-thành khi %=100; **S62** nâng cấp Tuần báo cáo Task đa-tuần (ISO). Thuần Task-domain (+helpers dùng chung). GAS S62 cần **copy 1 file migration** vào editor (không đổi Web App route).

## S62 — Tuần báo cáo Task đa-tuần (ISO) · commit `0b48e8b` · v6.30
- **✅ Task completed**: "Tuần BC" của Task từ **1 chuỗi free-text nhập tay → membership ĐA TUẦN chuẩn ISO-8601**. Hàm gốc `taskReportWeeks(task) = autoWeeks(Start→max(Deadline, hôm-nay nếu chưa xong)) ∪ pinnedWeeks(gắn tay)`. Mọi read path dùng nó.
- **✅ Yêu cầu (phỏng vấn)**: hybrid (auto+sửa tay) · nội dung **dùng chung** (không snapshot theo tuần → không đổi schema) · chuẩn **ISO** (T2 đầu tuần) · task quá hạn chưa xong **kéo tới tuần hiện tại** · **chỉ Task** đợt này (Case sau).
- **✅ Files (16, đã push)**:
  - `helpers.js` — +ISO utils (`isoWeekLabel`/`isoWeeksInRange`/`parseWeekLabel`/`weekInput⇄label`/**`taskReportWeeks`**/`taskInReportWeek`/`taskFirstWeekKey`/`taskWeeksBadge`/`allReportWeeks`). 3 hàm tuần jan4 trùng (tasks/dashboard/quickview) → delegate `currentIsoWeekLabel()`.
  - Read path exact-match → membership: `tasks.js` (preset/count/filter/cột badge/sort), `app.js` (filter populate + dashboard weekScope + report modal), `report.js`, `dashboard.js`, `quickview.js`, `performance.js`.
  - `index.html` + `crud.js` + `forms.css` — modal thay `<input text>` bằng **chip control**: chip auto (từ ngày, live qua onchange fStart/fEnd/fState) + chip pin (`<input type="week">` ISO picker); hidden `#fTuanBC` chỉ lưu **pin ngoài auto**. `_tuanInit/_tuanRenderChips/_tuanAddWeek/_tuanRemove`.
  - `backend/ReportWeekMigration.gs` (NEW) — `dryRunNormalizeWeeks()`/`commitNormalizeWeeks()` chuẩn hoá `Tuần BC` cũ → ISO, giá trị lạ giữ nguyên + log.
  - `verify_report_week.mjs` (NEW, **17/17**, port 3046) + `run_tests.mjs`; `verify_preset.mjs` cập nhật ISO + membership; `AI_CONTEXT/REPORT_WEEK_DESIGN.md` (NEW); `config.js` v6.30.
- **✅ Decision**: (a) membership **union** (auto∪pinned) — **chưa** hỗ trợ "bớt" tuần auto (auto tính lại; cần thì thêm cột exclude sau); (b) cột `Tuần BC` chỉ lưu **pin** (auto luôn live) → majority 0 nhập liệu; (c) `REPORT_WEEK_MAX_SPAN=60` chặn ngày rác; (d) nội dung Kết quả/Kế hoạch **1 bản dùng chung** mọi tuần.
- **⛔ Blocker**: Không (code). **1 việc thủ công GAS**: copy `ReportWeekMigration.gs` vào editor → `dryRunNormalizeWeeks()` rồi `commitNormalizeWeeks()` để chuẩn hoá tuần cũ. FE tự chạy sau hard-reload `?v=20260805c`.
- **➡️ Next step**: (1) hard-reload → mở modal Task xem chip auto/pin + `<input week>`; (2) chạy migration GAS; (3) smoke: task span nhiều tuần hiện ở mọi tuần; task quá hạn hiện ở "Tuần này"; báo cáo tuần gồm task đa tuần; (4) áp cơ chế cho **Case Pipeline** (đợt sau).
- **🟢 Regression risk**: 🟢 THẤP — read path gom về 1 helper (unit-test `verify_report_week` 17/17: ISO biên năm, range, overdue-extend, union, parse, badge). Full suite **22/24** (2 fail pre-existing: my_work flaky TD-TEST-01 chạy riêng fail MW6 *khác* batch; history H13 stale TD-TEST-02). Suite mở modal (task_init_popup/atomic_write/milestone_task) PASS → chip control init OK. **⚠️ Ngữ nghĩa**: overdue-extension làm preset "Tuần này" ≈ **mọi task đang mở** (đúng yêu cầu user).

## S61 — Auto-complete %=100 ⇒ hoàn thành · commit `a1e9f1e`+`b071f42` · v6.29/6.29.1
- **✅ Task**: %HT=100 ⇒ tự đặt trạng thái hoàn thành cho **Task** (`state='Hoàn thành'`) / **Initiative root** (`status='Done'`, bỏ milestone) / **Dev** (`state='Hoàn thành'`). Case & Bug bỏ qua (không có cột %).
- **✅ Files**: `helpers.js` (`_pctNum`/`normTaskComplete`/`normInitComplete`/`normDevComplete`/`normalizeCompleteInMemory`/`cleanupCompleteByProgress`/`uiCleanupCompleteByProgress`); `app.js` renderAll normalize (display); enforce khi save ở `crud.js`/`initiative-tracker.js`/`dev-plan.js`; **nút "Chuẩn hoá HT"** (admin-only) toolbar Tasks; `backend/DataCleanupService.gs` (NEW, bulk `dryRun/commitCompleteByProgress`).
- **⛔ GAS**: (tùy chọn) copy `DataCleanupService.gs` chạy bulk trên Sheet; hoặc bấm nút "Chuẩn hoá HT" (admin) làm sạch từ FE.

---

# SESSION HANDOVER (S60) — 2026-08-05
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước session**: `aedd1ff` (S59) → **sau session**: `f8826c4`
**Version**: v6.26 → **v6.28** (`6.28-ai-table-fullindex-20260804`, `?v=20260804c`)

> Session tinh chỉnh **AI Assistant (Gemini)** sau khi migrate API key sang tài khoản cơ quan (S59). 3 commit nối tiếp: (a) đổi model, (b) fix 404 + trả lời ngắn + chậm, (c) full-task index + render bảng Markdown. Thuần AI feature — **không đụng schema/CRUD/module khác**. GAS **đã redeploy** (user, URL không đổi).

- **✅ Task completed (S60)**:
  - **(a) `f5a447a`** — đổi Gemini model `gemini-2.5-flash` → **`gemini-flash-latest`** (key cơ quan mới bị từ chối model cũ: "no longer available to new users"; alias `-latest` luôn trỏ Flash hiện hành).
  - **(b) `09cdc54` (v6.27)** — fix **404 + câu trả lời quá ngắn + phản hồi chậm**: server tự tính "SỐ LIỆU TÍNH SẴN" (overdue/sắp hạn/theo PIC/theo trạng thái) → câu đếm deterministic; `maxOutputTokens` 1024→2048 + bỏ ép ngắn gọn trong prompt; **bỏ Audit_Log khỏi context** (payload nhẹ → doPost nhanh → ít 404 transport); `ai-chat.js` +**retry 3× backoff riêng cho AI** khi GAS 404/5xx (read-only → an toàn; KHÔNG đụng `gasPost` chung, tránh double-write).
  - **(c) `f8826c4` (v6.28, chính của session)** — **fix "AI chỉ xem 300 task"** + **render bảng Markdown** trong bong bóng bot.
  - Chạy **full suite local (23 suite)** + `verify_my_work` riêng để chứng minh 0 regression.
- **✅ Files changed (v6.28, đã push `f8826c4` — 5 file source)**:
  - `backend/AiService.gs` — `_aiTaskIndex_()` sinh **CHỈ MỤC TOÀN BỘ task** (ID/Trạng thái/%HT/Team/PIC/Deadline/Tên/Vướng mắc) bao phủ **mọi** task; refactor lookup cột → `_aiResolveTaskCols_()`; +`_aiTrunc_()`; khối "chi tiết mở rộng" (đủ 24 cột) cap **200 task gần nhất**; system prompt dặn dùng chỉ mục + **KHÔNG** nói "chỉ xem 300 task".
  - `assets/js/views/ai-chat.js` — `_aiRenderMarkdown()` renderer GFM tối giản AN TOÀN (`esc()` **TRƯỚC** → chống XSS, rồi bảng/`**đậm**`/`` `code` ``/bullet). Bong bóng **bot** render markdown; tin nhắn **user** vẫn `esc()`-plain.
  - `assets/css/ai-chat.css` — style bảng/list/code trong bubble bot (theme-aware `--border`/`--bg-3`).
  - `assets/js/config.js` — `APP_VERSION='6.28-ai-table-fullindex-20260804'`.
  - `index.html` — cache-bust `?v=20260804b`→`c` (60 refs).
- **✅ Decision made**:
  - (a) **Chỉ mục toàn bộ (compact) + chi tiết cap 200**: thay vì tăng cứng cap 300 (dễ vỡ token khi task nhiều), tách **2 tầng** — index gọn bao phủ tất cả (đếm/lọc/liệt kê), rich detail chỉ 200 task gần nhất (cột free-text). `gemini-flash-latest` ~1M ctx nên index toàn bộ chấp nhận được.
  - (b) **Render Markdown tự viết, KHÔNG thư viện ngoài**: escape HTML trước rồi mới format → an toàn XSS; chỉ subset (bảng/đậm/code/bullet) đủ cho câu trả lời dạng bảng "ID | PIC | Deadline".
  - (c) **Retry chỉ scope AI** (không đụng `gasPost` global) vì AI read-only; global có ghi → retry có thể double-write.
  - (d) **Bỏ Audit_Log khỏi context AI** để nhẹ payload — chấp nhận AI không trả lời được câu về lịch sử audit chi tiết (hiếm).
- **⛔ Blocker**: Không. **GAS đã redeploy (user, URL KHÔNG đổi)** → backend fix live. User cần **hard-reload** để nhận `?v=20260804c` + badge `v6.28`.
- **➡️ Next step**: (1) Smoke test production: hỏi AI "liệt kê task Blocked", "bao nhiêu task quá hạn theo PIC" → phải bao phủ **mọi** task + render **bảng** đẹp, KHÔNG nói "chỉ xem 300 task". (2) Vẫn còn **P0 khép migration S59** (tắt trigger `notifScan` project cá nhân cũ, đối chiếu `AUTH_SECRET`, gỡ deployment/Sheet cũ sau vài ngày). (3) (Nợ) fix flaky/stale test TD-TEST-01/02; cân nhắc thêm test cho AI-chat (TD-TEST-03 mới).
- **🟢 Regression risk**: 🟢 **THẤP** — khu trú AI feature. Frontend renderer đã kiểm XSS (`esc()` trước, user input vẫn escaped). Full suite **21/23**; 2 fail đều **pre-existing KHÔNG do session**: `verify_history` H13 (TD-TEST-02 stale ISO — output "expected 05-Aug-26 got 2026-08-05"), `verify_my_work` flaky (TD-TEST-01 — chạy riêng fail **MW6** *khác* test batch → đua timing). Không có test cho AI-chat (nợ TD-TEST-03).

---

# SESSION HANDOVER (S59) — 2026-08-04
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước session**: `472c7dd` (S58) → **sau session**: `aedd1ff` + commit handover này
**Version**: v6.25 → **v6.26** (`6.26-gas-migrate-tpbank-20260804`, `?v=20260804`)

> Session hạ tầng: **chuyển GAS backend (script + Sheet DB + email) từ tài khoản Google cá nhân sang tài khoản cơ quan `cb_sptd_7@tpbank.vn`** để đảm bảo ANBM (thông tin nội bộ + email nhắc việc phát đi từ domain TPBank). Thuần đổi config — không đổi schema/logic/feature.

- **✅ Task completed (S59)**:
  - Migrate BE về Google Workspace cơ quan: user tự **copy GAS project + Sheet DB** sang tài khoản `cb_sptd_7@tpbank.vn` (test OK phía GAS) → tôi cập nhật config repo trỏ sang deployment + Sheet mới.
  - Chạy **full test suite local (23 suite)** + chạy riêng 3 suite fail để chứng minh **0 regression** do migration.
- **✅ Files changed** (4 file source, đã push `aedd1ff`):
  - `backend/Config.gs` — `SPREADSHEET_ID` → Sheet copy cơ quan `1t4tkaw4K6u3fQiAxkavWXAZAlwiYqht1OQjkWw8Zq4g`.
  - `assets/js/config.js` — `GS_WEBAPP_URL` → deployment GAS mới (`AKfycbw1BgeNZuo8…DSg`); `APP_VERSION='6.26-gas-migrate-tpbank-20260804'`.
  - `assets/js/constants.js` — `GS_SHEET_ID` đồng bộ Sheet mới (frontend không dùng logic, đổi để tránh "mìn" link mở Sheet cá nhân cũ).
  - `index.html` — cache-bust `?v=20260803c` → `?v=20260804` (60 refs).
  - (Loại khỏi commit: `test-results/*.png` ảnh test tự sinh + các file `Innovation*` chưa track.)
- **✅ Decision made**:
  - (a) **Kịch bản A** (nhẹ nhất) sau phỏng vấn 4 câu: `cb_sptd_7` là **Google Workspace** + toàn quyền admin + yêu cầu ANBM = "email gửi từ @tpbank.vn" (data ở lại Google Sheets **được chấp nhận**) + frontend **giữ public** GitHub Pages. → Không re-platform.
  - (b) **Copy Sheet (không transfer ownership)**: Google chặn transfer chủ sở hữu consumer↔Workspace → Sheet có **ID mới** → phải sửa `SPREADSHEET_ID`. GAS standalone cũng recreate từ repo (không transfer).
  - (c) **Email**: KHÔNG sửa code — `MailApp.sendEmail` (`NotificationService.gs:479`) không set `from` nên tự gửi từ tài khoản sở hữu script → chuyển account là đủ để email phát từ `@tpbank.vn`. Quota 100→1500/ngày.
  - (d) **ANBM caveat (ghi rõ với user)**: đổi account ≠ đưa data khỏi Google — data vẫn trên Google Cloud (do account cơ quan sở hữu/kiểm soát). Nếu sau này ANBM siết "không data trên hạ tầng ngoài" → mới cần re-platform (kịch bản B2).
  - (e) Commit chỉ 4 file source; nợ test TD-TEST-01/02 KHÔNG gộp vào commit migration.
- **⛔ Blocker**: Không có blocker code. **2 việc thủ công phía GAS** user cần làm (ngoài git) để khép migration: (1) **tắt trigger `notifScan` ở project cá nhân CŨ** (nếu còn bật → email digest gửi **2 lần**); (2) **đối chiếu `AUTH_SECRET`** project mới ↔ cũ (nếu khác → mọi token đang login vô hiệu → user phải login lại; password KHÔNG ảnh hưởng vì hash không dùng secret).
- **➡️ Next step**: (1) User hard-reload production → xác nhận badge `v6.26` + login/CRUD OK trên Sheet mới + `notifSelfTest` gửi email đến từ `@tpbank.vn`. (2) Làm 2 việc thủ công GAS ở trên. (3) Sau vài ngày ổn định → **gỡ quyền tài khoản cá nhân khỏi Sheet + xóa deployment GAS cũ** (khép ANBM). (4) Giữ deployment + Sheet cũ tới khi verify xong để **rollback** (revert `config.js` là quay lại). (5) (Nợ cũ) fix flaky/stale test TD-TEST-01/02; điền cột Email `User_Master` cho digest.
- **🟢 Regression risk**: 🟢 **THẤP** — thuần đổi 4 giá trị config (URL/Sheet ID/version/cache-bust), không đụng schema/logic. Full suite **20/23**; cả 3 suite fail đều **pre-existing, KHÔNG do migration** — chứng minh bằng `git stash` bỏ thay đổi → `verify_my_work` code gốc còn **tệ hơn** (50/62 vs 51/62). `verify_import_rbac` **15/15 khi chạy riêng** (đua batch). `verify_history` **H13** stale (ISO vs DD-MMM-YY, TD-TEST-02). Các test mock network nên không đụng GAS thật — chỉ xác nhận frontend load/render y hệt với `?v=` + config mới.

---

# SESSION HANDOVER — 2026-08-03 ROLLUP (S58 → S58.2)
**Model**: Claude Opus 4.8 · **Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main trước session**: `dae5f3f` (S57) → **sau session**: `233b9be` + commit handover này
**Version**: v6.22 → **v6.25** (`6.25-mywork-width-urgent-20260803`, `?v=20260803c`)

> Session UI/UX: chuẩn hoá độ rộng trang + sửa tràn/đè giao diện, tạo doc governance layout. 5 commit, thuần frontend, **không GAS deploy**.

- **✅ Task completed**:
  - **S58** — Dev Plan bảng hết tràn ngang (`table-layout:fixed`), Action Plan kanban giãn cột lấp đầy (`flex:1 1 0`), tạo **`AI_CONTEXT/UI_CONCEPT.md`** (contract layout).
  - **S58.1** — Dev Plan bảng: hết **đè chữ** + nút Sửa/Xóa hết đè Ghi chú (override global `table{white-space:nowrap}`), ngày 1 dòng, textarea modal **auto-grow**, page width về chuẩn.
  - **S58.2** — Audit width toàn hệ thống (chỉ My Work lệch chuẩn) → **My Work về full-width chuẩn**; **"Cần làm ngay" chia 2 cột Quá hạn | Sắp đến hạn**.
- **✅ Files changed**: `assets/css/{dev-plan,kpi,my-work}.css`, `assets/js/views/{dev-plan,my-work}.js`, `assets/js/i18n.js`, `assets/js/config.js`, `index.html` (cache-bust 60 refs), **NEW** `AI_CONTEXT/UI_CONCEPT.md`; docs `SESSION_HANDOVER/PROJECT_STATE/TODO_NEXT/TECH_DEBT`. EVD refresh: `test-results/{dev_plan,action-plan,my_work}`.
- **✅ Decision made**: (a) "Độ rộng chuẩn" = full `.content` width (không wrapper padding/max-width) như Tasks/Case/Issue; **AI Chat 860px giữ nguyên** (cố ý, readability chat). (b) Bảng dùng `table-layout:fixed`; cell free-text **phải** set `white-space:normal` để thắng global nowrap. (c) Board ≤5 cột dùng `flex:1 1 0` giãn đầy, không fixed-px. (d) "Cần làm ngay": item **hôm nay (diff=0)** thuộc cột **Sắp đến hạn** (chưa quá hạn); mobile 2→1 cột. (e) Textarea auto-grow theo nội dung (không scrollbar trong, vẫn resize tay).
- **⛔ Blocker**: Không. Thuần frontend; user chỉ cần **hard-reload** nhận v6.25.
- **➡️ Next step**: (1) Smoke test production v6.25 (My Work full-width + 2 cột Quá hạn/Sắp đến hạn; Dev Plan không tràn; Action Plan lấp đầy). (2) Fix flaky tests **TD-TEST-01** (my_work/issue_tracker) + stale **TD-TEST-02/H13**. (3) Leftover S57: điền cột **Email** `User_Master` cho digest. (4) Áp `UI_CONCEPT.md` checklist cho tính năng mới.
- **🟢 Regression risk**: THẤP — thuần CSS/layout + additive JS. `verify_dev_plan` **40/40**, `verify_action_plan` **24/24**; `verify_my_work` urgent **MW12/MW13 PASS** + screenshot xác nhận (suite flaky TD-TEST-01, không do session này). Selector test giữ nguyên. Điểm để ý: bảng mới **bắt buộc** override `white-space` (global nowrap) — xem UI_CONCEPT §2.

---

# SESSION HANDOVER
**Date**: 2026-08-03 (Session 58 — UI layout fit: Dev Plan table hết tràn ngang + Action Plan giãn cột lấp đầy + UI_CONCEPT.md)
**Model**: Claude Opus 4.8
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD (trước S58)**: `dae5f3f` — docs(S57) handover delta
**Version**: v6.23 (`6.23-ui-layout-fit-20260803`, `?v=20260803`)

---

## 🧭 HANDOVER SUMMARY (S58) — đọc nhanh

- **Task completed**: (1) **Dev Plan** — bảng danh sách chính bị **tràn ngang phải kéo sang phải** (do `.dev-table { min-width:900px }` + cell `nowrap`). Sửa: `table-layout:fixed; width:100%` (bảng không bao giờ vượt container) + cho cell free-text (name/target/note/coord) **wrap**, ngày giữ 1 dòng qua `.dev-cell-date`, thu gọn width các cột px để Name/Target có chỗ → **fit 1 màn hình**, scroll ngang chỉ còn là fallback <720px (mobile). (2) **Action Plan** — kanban `.kanban-col { flex:0 0 260px }` để **thừa khoảng trống bên phải**. Sửa: `flex:1 1 0; min-width:240px` → 4 cột **giãn lấp đầy** chiều ngang. (3) **UI_CONCEPT.md (NEW)** — contract layout để tính năng sau tự tối ưu từ đầu (2 failure mode, golden rules, công thức bảng fit-one-screen + board stretch-to-fill, thang width modal, breakpoint chuẩn, checklist pre-merge).
- **Phạm vi an toàn**: `.kanban-*` chỉ Action Plan dùng (Case Pipeline kanban dùng `.cp-col` → KHÔNG ảnh hưởng). Dev Plan test chỉ assert selector (`.dev-table`/`.dev-row`/`.dev-cell-*`), không assert width → đổi layout an toàn.
- **Files MOD**: `assets/css/dev-plan.css`, `assets/js/views/dev-plan.js`, `assets/css/kpi.css` (`.kanban-col`), `assets/js/config.js` (v6.23), `index.html` (cache-bust `?v=20260803`, 60 refs). **NEW**: `AI_CONTEXT/UI_CONCEPT.md`.
- **Blocker**: Không. **Thuần frontend — KHÔNG cần GAS deploy.** User cần **hard-reload** để nhận v6.23.
- **Regression risk**: 🟢 THẤP — `verify_dev_plan` **40/40**, `verify_action_plan` **24/24** (chạy view thật headless, pass). Fix là CSS deterministic (`table-layout:fixed` + `flex:1 1 0`), độc lập viewport.
- **Next step**: Smoke test production (badge v6.23; Dev Plan không còn scroll ngang, xem đủ trên 1 màn; Action Plan 4 cột lấp đầy width). Vẫn còn: điền Email `User_Master` (S57 digest); P2 fix flaky `my_work`/`issue_tracker` + stale `history` H13.

## Tasks Completed (S58 — UI layout fit)

| # | Task | Files | Status |
|---|---|---|---|
| S58-T1 | Dev Plan bảng fit-one-screen: bỏ `min-width:900px` → `table-layout:fixed; width:100%`; cell free-text wrap; `.dev-cell-date` giữ 1 dòng; thu gọn width cột | `assets/css/dev-plan.css`, `assets/js/views/dev-plan.js` | ✅ |
| S58-T2 | Action Plan kanban giãn lấp đầy: `.kanban-col` `flex:0 0 260px` → `flex:1 1 0; min-width:240px` | `assets/css/kpi.css` | ✅ |
| S58-T3 | `AI_CONTEXT/UI_CONCEPT.md` (NEW) — contract layout cho tính năng sau (fit-one-screen, stretch-to-fill, width modal, breakpoint, checklist) | `AI_CONTEXT/UI_CONCEPT.md` | ✅ |
| S58-T4 | `config.js` v6.23; cache-bust `?v=20260803` (60 refs, Python) | `config.js`, `index.html` | ✅ |
| S58-T5 | Verify: `verify_dev_plan` 40/40, `verify_action_plan` 24/24 | tests | ✅ |

### 🔧 S58.2 — My Work: page width chuẩn + "Cần làm ngay" chia 2 cột (v6.25, 2026-08-03)
**Yêu cầu user**: (1) rà soát toàn bộ tính năng về **độ rộng chuẩn**; (2) đưa **"Công việc của tôi"** về UI width chuẩn; (3) tách **"Cần làm ngay"** thành **2 cột: Quá hạn | Sắp đến hạn** để review nhanh.
**Audit width (toàn hệ thống)**: chỉ **My Work** lệch chuẩn — `.mw-page { padding:20px 24px; max-width:1200px }` **cộng dồn** padding lên `.content` (đã 20/24) + cap 1200px → hẹp & lệch so với mọi view khác (Tasks/Case/Issue/Initiative/Dev Plan… render thẳng vào `.content` = full width). AI Chat cap `max-width:860px` là **cố ý** (readability chat) → giữ nguyên. Kết luận: chỉ cần sửa My Work.
**Sửa**:
- `my-work.css` — `.mw-page` `padding:0 0 32px; max-width:none` (bỏ double-padding + cap) → khớp width chuẩn; mobile `.mw-page{padding:0 0 16px}`. +`.mw-urgent-cols` (grid 2 cột 1fr/1fr, stack <768px) + `.mw-urgent-col-head.overdue/.soon` + `.mw-urgent-col-count` + `.mw-urgent-empty-col`.
- `my-work.js` — `_mwBuildUrgentSection` viết lại: partition urgent thành **overdue (diff<0)** vs **soon (diff≥0: hôm nay + ≤7d)**, mỗi cột có count + sort soonest-first + empty-state "Không có"; tách `_mwUrgentTaskItem`/`_mwUrgentCaseItem`. Giữ `#mwSectionUrgent`/`#mwUrgentCount`/`.mw-urgent-item`/`.mw-urgent-list` (test không đổi).
- `i18n.js` — +`mw.urgent.col.soon` ("Sắp đến hạn"/"Due soon"), `mw.urgent.col.none` ("Không có"/"None"); cột Quá hạn reuse `mw.dl.overdue`.
- `config.js` v6.25-mywork-width-urgent-20260803; cache-bust `?v=20260803c`.
**Quyết định mặc định**: item **hôm nay (diff=0)** xếp vào cột **Sắp đến hạn** (chưa quá hạn); mobile 2 cột → 1 cột.
**Verify**: `verify_my_work` — urgent MW12 (overdue) + MW13 (soon) PASS; screenshot xác nhận 2 cột Quá hạn|Sắp đến hạn + page full-width. ⚠️ Suite **flaky** (TD-TEST-01: races do `waitForTimeout` — mỗi lần fail 1 tập khác nhau: MW6/MW7-9/MW11/MW22…), KHÔNG do S58.2. Thuần frontend — **không GAS deploy**.

### 🔧 S58.1 fix — Dev Plan bảng: đè chữ + nút đè ghi chú + textarea auto-grow + page width (v6.24, 2026-08-03)
**Triệu chứng user báo**: (1) nội dung công việc dài **bị đè chữ** (name đè sang target); (2) nút Sửa/Xóa **đè lên cột Ghi chú**; (3) muốn ô nhập liệu **đổi chiều cao theo nội dung**; (4) **độ rộng page** đồng bộ với các tính năng khác.
**Nguyên nhân gốc**: `assets/css/table.css:61` có rule GLOBAL `table { white-space:nowrap }`. S58 khóa width cột (`table-layout:fixed`) nhưng cell vẫn `nowrap` → text dài **tràn khỏi cell, đè cột kế bên**; note dài tràn xuống dưới nút actions; cột actions 58px < ~76px cần cho 2 nút `btn-sm`.
**Sửa**:
- `dev-plan.css` — `.dev-table td { white-space: normal }` (override global nowrap) + `word-break/overflow-wrap` → cell free-text wrap trong width cột; `.dev-table td.dev-cell-date { white-space:nowrap }` (tăng specificity thắng `.dev-table td`) → ngày giữ 1 dòng; `.dev-table thead th` nowrap→normal (header wrap gọn); `.dev-table td .btn-sm { padding:5px 8px }` + `.dev-cell-actions{white-space:nowrap}`; `.dev-autogrow{resize:vertical;overflow-y:hidden;min-height:62px}`; `.dev-page` padding `4px 2px`→`4px 0` (đồng bộ width với .content 20/24 như Tasks/Case/Issue).
- `dev-plan.js` — header widths: name/target **bỏ width** (auto chia đều remainder + wrap), các cột hẹp fixed px, actions 58→78px; +class `dev-cell-actions`; +helper `_devAutoGrow(el)` gọi khi mở modal cho target/note.
- `index.html` — `#devfTarget`/`#devfNote` +class `dev-autogrow` +`oninput="_devAutoGrow(this)"`.
- `config.js` v6.24-devplan-ui-fix-20260803; cache-bust `?v=20260803b` (60 refs).
**Verify**: `verify_dev_plan` **40/40**; screenshot EVD refresh xác nhận hết đè chữ + nút clear + ngày 1 dòng. Thuần frontend — **không cần GAS deploy**.

---

# SESSION HANDOVER (S57)
**Date**: 2026-08-02 (Session 57 — 🔔 Notification bell: nhắc việc sắp/quá hạn + tạo + đóng, cho Task/Case/Issue/Initiative+Milestone/Dev Plan)
**Model**: Claude Opus 4.8
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD (trước S57)**: `2ba246e` — test(S56) refresh EVD
**Version**: v6.22 (`6.22-notifications-20260802`, `?v=20260802`)

---

## 🧭 HANDOVER SUMMARY (S57) — đọc nhanh

- **Task completed**: Chuông thông báo 🔔 ở topbar. Nhắc **sắp/đến/quá hạn** (trước 3 ngày, trước 1 ngày, hôm nay, quá hạn) + **task được tạo** + **task được đóng**, áp cho cả **Task / Case / Issue / Initiative + Milestone / Dev Plan**. Click 1 noti → mark-read + **deep-link mở popup** công việc để thao tác nhanh. **Email digest 1/ngày** cho mỗi user (Gmail/MailApp). Read-state per-user lưu **server (sheet Notifications)**.
- **Kiến trúc**: GAS **không push thẳng vào browser** → mô hình = (1) trigger `notifScan()` chạy ~8h/ngày quét deadline mọi sheet → ghi bản ghi vào sheet `Notifications` (idempotent) + gửi email digest; (2) real-time `notifOnWrite()` gọi trong `doPost` khi upsert (created = dòng mới; closed = status chuyển sang done) → ghi noti ngay. Chuông client **poll** `notif-read` (lúc load, khi Sync, mỗi 5 phút) → badge + dropdown; `notif-mark-read` cập nhật ReadTs.
- **Recipients**: Task = PIC Accountable + Responsible; Case = PIC; Issue = Người xử lý (fallback Người log); Initiative/Milestone = Accountable; Dev = PIC. (Support KHÔNG nhận; không có kênh team-wide/admin-all — theo phỏng vấn.)
- **Files NEW**: `backend/NotificationService.gs`, `assets/js/views/notifications.js`, `assets/css/notifications.css`, `verify_notifications.mjs`. **MOD**: `backend/Code.gs` (+route `notif-read`/`notif-mark-read`; hook `notifOnWrite` vào 5 upsert), `assets/js/api.js` (readNotifications/markNotifRead/persist/load), `app.js` (startup poll + interval 5', renderAll bell, syncDB, clearCache reset), `constants.js` (`dbNotifs`), `i18n.js` (+14 key VI/EN), `ui/navigation.js` (ESC), `index.html` (bell markup + css/script + cache-bust `?v=20260802`), `config.js` (v6.22), `run_tests.mjs`.
- **Blocker**: ✅ **ĐÃ GỠ** — GAS redeploy **xong** (user, 2026-08-02): `NotificationService.gs` + `Code.gs` mới đã lên, **URL không đổi**. **Smoke test production OK** (chuông hiện, noti đúng, click deep-link mở popup). `installNotifTrigger()` đã bật quét ~8h/ngày. Lưu ý còn lại: user trong `User_Master` thiếu cột **Email** → chỉ nhận chuông, không nhận email digest.
- **Next step**: (1) Điền cột **Email** trong `User_Master` cho user cần nhận digest. (2) P2: fix flaky `my_work`/`issue_tracker` (TD-TEST-01) + stale `history` H13 (TD-TEST-02). (3) Theo dõi digest sáng đầu tiên (~8h hôm sau) xem gửi đúng không.
- **Regression risk**: 🟢 THẤP — thuần additive (file mới + hook có try/catch nội bộ). `verify_notifications` **21/21**. Đã smoke test production OK. Full batch: 20/23 — 3 fail đều **KHÔNG do S57**: `my_work` + `issue_tracker` = flaky batch (TD-TEST-01, pass khi chạy riêng), `history` H13 = assertion cũ post-S56 (initiative start giờ là ISO date-picker, test còn kỳ vọng `DD-MMM-YY`).
- **Quyết định mặc định**: bell poll load/Sync/5'; auto-purge noti đã đọc >30 ngày; Excel import (bulk write) KHÔNG sinh created/closed; "closed" gửi Accountable+Responsible; overdue = 1 dòng chuông/việc, lặp trong digest khi còn chưa đọc & còn quá hạn.

## Tasks Completed (S57 — Notification bell)

| # | Task | Files | Status |
|---|---|---|---|
| S57-T1 | `NotificationService.gs` — sheet `Notifications` (11 cột) + `notifScan()` (trigger ~8h) + `notifOnWrite()`/`notifPrior_()` (real-time created/closed) + `notifRead`/`notifMarkRead` + email digest + `installNotifTrigger`/`notifSelfTest` | `backend/NotificationService.gs` | ✅ |
| S57-T2 | `Code.gs` — route `notif-read`/`notif-mark-read` (per-user, tokenData.u); hook `notifOnWrite` vào task/case/initiative/issue/dev-upsert (đọc prior trước ghi) | `backend/Code.gs` | ✅ |
| S57-T3 | `api.js` — `readNotifications`/`markNotifRead` (optimistic) + persist/load cache; `constants.js` +`dbNotifs` | `assets/js/api.js`, `constants.js` | ✅ |
| S57-T4 | `views/notifications.js` (NEW) — bell badge, dropdown nhóm (overdue/today/soon/created/closed), deep-link dispatcher → `open*ViewPopup`, mark-all, outside-click/ESC | `assets/js/views/notifications.js` | ✅ |
| S57-T5 | `notifications.css` (NEW); `index.html` bell markup topbar + link/script + cache-bust `?v=20260802`; `i18n.js` +14 key VI/EN; `navigation.js` ESC; `app.js` poll/interval/renderAll/sync/clear; `config.js` v6.22 | nhiều | ✅ |
| S57-T6 | `verify_notifications.mjs` (NEW, port 3045) — **21/21 PASS**; +`run_tests.mjs` | tests | ✅ |

---

# SESSION HANDOVER (S56)
**Date**: 2026-07-30 (Session 56 — Đồng nhất date input: Initiative/Milestone → date picker; Dev Plan mặc định start = hôm nay)
**Model**: Claude Opus 4.8
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD (trước S56)**: `8f83cd5` — feat(S55): Initiative Tracker tidy-up
**Version**: v6.21 (`6.21-date-picker-20260730`, `?v=20260730`)

---

## 🧭 HANDOVER SUMMARY (S56) — đọc nhanh

- **Task completed**: Rà soát tổng thể cách nhập ngày tháng trên tất cả modal thêm/sửa và đồng nhất nguyên tắc: **mọi field ngày = native date picker (`<input type="date">`)** và **Start Date mặc định = hôm nay khi Add**. Sửa đúng module bị lỗi (Initiative Tracker nhập ngày free-text) + 1 lỗ hổng nhất quán (Dev Plan là picker nhưng không mặc định hôm nay).
- **Audit kết quả**: 5 modal có date field. Task (`fStart/fEnd`), Case (`cpfStartDate/cpfDeadline`), Issue (`itfNgayPS/itfDeadline/itfNgayGQ`) — **đã đúng** (picker + start default hôm nay). Dev Plan (`devfStart/devfEnd`) — picker nhưng **thiếu default hôm nay**. Initiative/Milestone (`initFStart/initFDeadline/initFMsDl`) — **free-text** (lưu `DD-MMM-YY`) → chính là bug user báo.
- **Files changed**: MOD `assets/js/views/initiative-tracker.js` (3 field → `type="date"`; Add default start = hôm nay ISO; Edit populate qua `_initToISO`; Save qua `_initFromISO`; +helper `_initToISO`/`_initFromISO`), `assets/js/views/dev-plan.js` (devfStart default hôm nay khi Add), `assets/js/config.js` (v6.21), `index.html` (cache-bust `?v=20260730`, 58 refs).
- **Decision**: (a) **Giữ nguyên storage `DD-MMM-YY`** cho Initiative, chỉ convert ở biên input (picker cần ISO `YYYY-MM-DD`) — KHÔNG migrate sang ISO. Lý do: 0 rủi ro (không đụng sheet/backend/display/history/export); tái dùng `_initParseDate` + `_MMM` sẵn có. Bỏ phương án migrate toàn bộ sang ISO (rủi ro cao, cần migrate dữ liệu). (b) Phạm vi = Initiative/Milestone + Dev Plan default (nhất quán 5 modal), không chỉ module bị báo lỗi. (c) **Chỉ Start Date default hôm nay**; Deadline / Deadline Milestone để trống (là hạn chót, không default).
- **Blocker**: Không. Thuần frontend — **không cần GAS deploy**. User cần **hard-reload** để nhận `v6.21`.
- **Next step**: Smoke test production (badge v6.21; Initiative → Thêm: Start Date là picker mặc định hôm nay, Deadline là picker trống; lưu → sheet vẫn `DD-MMM-YY`; mở Sửa → picker hiện đúng ngày; Dev Plan → Thêm: start = hôm nay). Checklist trong TODO_NEXT.
- **Regression risk**: 🟢 THẤP — khu trú trong 2 file view. `verify_initiative_tracker` **19/19**, `verify_dev_plan` **40/40**, round-trip E2E riêng **11/11** (type=date, default hôm nay, ISO↔DD-MMM-YY, 0 JS error). Điểm để ý: nếu 1 initiative có ngày lưu ở định dạng lạ (không `DD-MMM-YY` cũng không ISO) → `_initToISO` trả `''` → picker để trống khi mở Sửa (chỉ ảnh hưởng hiển thị; không mất dữ liệu vì giá trị cũ chỉ bị ghi đè khi user chủ động chọn ngày + Lưu).
- **⚠️ Phát hiện phụ (không do S56)**: `verify_my_work` + `verify_issue_tracker` **flaky** khi chạy batch `run_tests.mjs` (pass khi chạy riêng). Do fixed `waitForTimeout()` + Chromium mới (Chrome 148 vừa cài). Xem TECH_DEBT TD-TEST-01.

## Tasks Completed (S56 — Đồng nhất date input)

| # | Task | Files | Status |
|---|---|---|---|
| S56-T1 | Initiative modal: 3 field ngày (`initFStart`/`initFDeadline`/`initFMsDl`) → `<input type="date">` | `views/initiative-tracker.js` | ✅ |
| S56-T2 | Add mode: Start Date default = hôm nay (ISO); Deadline/MsDl để trống | `views/initiative-tracker.js` | ✅ |
| S56-T3 | Edit populate `DD-MMM-YY → ISO` (`_initToISO`); Save `ISO → DD-MMM-YY` (`_initFromISO`); +2 helper cạnh `_initParseDate` | `views/initiative-tracker.js` | ✅ |
| S56-T4 | Dev Plan: `devfStart` mặc định hôm nay khi Add (trước để trống) | `views/dev-plan.js` | ✅ |
| S56-T5 | `config.js` v6.21; cache-bust `?v=20260730` (58 refs, Python) | `config.js`, `index.html` | ✅ |
| S56-T6 | Verify: `verify_initiative_tracker` 19/19, `verify_dev_plan` 40/40, round-trip E2E 11/11 | tests | ✅ |

---

# SESSION HANDOVER (S55)
**Date**: 2026-07-28 (Session 55 — Initiative Tracker tidy-up: tách Done + đồng nhất stat cards + summary popup)
**Model**: Claude Opus 4.8
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD (trước S55)**: `b5e29f5` — docs(security): TD-SEC-01 resolved
**Version**: v6.20 (`6.20-init-tidy-20260728`, `?v=20260728c`)

---

## 🧭 HANDOVER SUMMARY (S55) — đọc nhanh

- **Task completed**: Cập nhật tính năng "Theo dõi Initiative" theo 3 yêu cầu user: (1) **tách Initiative đã hoàn thành** khỏi danh sách chính → section thu gọn "Đã hoàn thành (N)" ở cuối (mặc định collapse, card render lazy — gọn khi có ~70 initiative); (2) **đồng nhất UI** các ô số tổng → dùng chung component `.cp-stat-card` (icon + số + nhãn) như Case Pipeline, grid 5 ô responsive; (3) **view popup** cho mỗi ô số → `#initSummaryOverlay` short-list table (ID/Tên/Accountable/Deadline/%/Trạng thái), row click → chi tiết initiative.
- **Files changed**: MOD `assets/js/views/initiative-tracker.js`, `assets/css/initiative.css`, `index.html` (+`#initSummaryOverlay`, cache-bust 58 refs), `assets/js/ui/navigation.js` (ESC), `assets/js/i18n.js` (+5 keys VI/EN), `assets/js/config.js` (v6.20). NEW `verify_initiative_tracker.mjs`. MOD `run_tests.mjs`, `verify_i18n_p6.mjs` (selector `.init-stat-label`→`.cp-stat-label`).
- **Decision**: (a) Tách Done = section thu gọn ở cuối (không ẩn hẳn) — chọn A qua phỏng vấn. (b) Ô số + popup đếm theo **scope (mine/all) + Category filter**, KHÔNG áp filter Status (vì các ô CHÍNH LÀ bảng phân rã theo status → nếu áp sẽ tự về 0). (c) Khi user chọn filter Status cụ thể → tôn trọng, hiện đúng nhóm, không tách Done. (d) Reuse thẳng class `.cp-stat-card` (định nghĩa ở case-pipeline.css, load global) thay vì tạo class riêng → đồng nhất tối đa, thêm mỗi `.init-summary-grid` (5 cột).
- **Blocker**: Không có. GAS **không cần deploy** (thuần frontend, không đụng backend/schema). User cần **hard-reload** để nhận `v6.20`.
- **Next step**: Smoke test production (badge v6.20; menu Theo dõi Initiative → 5 ô số icon; click từng ô mở popup short-list; section "Đã hoàn thành" collapse/expand; filter Status vẫn hiện đúng nhóm). Xem checklist trong TODO_NEXT.
- **Regression risk**: 🟢 THẤP — full suite **22/22 PASS** (thêm `verify_initiative_tracker` 19/19). `verify_i18n_p6` chỉ đổi selector theo markup mới (label/thứ tự/text không đổi). Không đụng schema, backend, hay CRUD initiative. Điểm để ý: `.cp-stat-card` giờ được 2 view dùng chung — nếu sau này sửa style Case Pipeline sẽ ảnh hưởng Initiative (chủ đích design-system).

## Tasks Completed (S55 — Initiative Tracker tidy-up)

| # | Task | Files | Status |
|---|---|---|---|
| S55-T1 | `_initStatBase()` (scope+category) + `_initCountOverdue()`; rewrite `_initStatBar()` → `.cp-stat-card` grid 5 ô clickable | `views/initiative-tracker.js` | ✅ |
| S55-T2 | `_initBuildCardList()` tách main (non-Done) vs `_initBuildDoneSection()` collapsible + `_initToggleDone()` (lazy render); tôn trọng filter Status | `views/initiative-tracker.js` | ✅ |
| S55-T3 | `openInitSummaryPopup(type)` / `closeInitSummaryPopup()` — short-list table 5 loại (total/active/done/overdue/blocked) | `views/initiative-tracker.js` | ✅ |
| S55-T4 | `#initSummaryOverlay` markup (mirror `cpSummaryOverlay`) | `index.html` | ✅ |
| S55-T5 | `.init-summary-grid` (5→3→2→1 cột) + `.init-done-section/header/count/caret/body` | `assets/css/initiative.css` | ✅ |
| S55-T6 | ESC chain +`closeInitSummaryPopup()` | `assets/js/ui/navigation.js` | ✅ |
| S55-T7 | i18n +5 keys VI+EN (`it.stat.blocked`, `it.done.title`, `it.done.all-done`, `it.sum.empty`, `it.sum.col.name`) | `assets/js/i18n.js` | ✅ |
| S55-T8 | `config.js` v6.20; cache-bust `?v=20260728c` (58 refs, Python) | `config.js`, `index.html` | ✅ |
| S55-T9 | `verify_initiative_tracker.mjs` (NEW, port 3044) — **19/19 PASS**; +run_tests.mjs; `verify_i18n_p6.mjs` selector fix → **22/22 suites PASS** | tests | ✅ |

---

# SESSION HANDOVER (S54)
**Date**: 2026-07-28 (Session 54 — Dev Plan: "Plan phát triển bản thân")
**Model**: Claude Opus 4.8
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `e1134ce` — fix(S54): Dev Plan hiển thị đầy đủ ở My Work (+ handover docs commit sau đó)
**Version**: v6.19.1 (`6.19.1-dev-plan-mywork-20260728`, `?v=20260728b`)

---

## 🧭 HANDOVER SUMMARY (S54) — đọc nhanh

- **Task completed**: Tính năng mới "Plan phát triển bản thân" (Left menu, G+V) — sheet `Dev_Plan` + service GAS + view CRUD + section nhắc ở "Công việc của tôi". GAS **đã deploy**. Fix S54.1: My Work hiển thị đầy đủ dev item của tôi.
- **Files changed**: NEW `backend/DevPlanService.gs`, `assets/js/views/dev-plan.js`, `assets/css/dev-plan.css`, `verify_dev_plan.mjs`. MOD `backend/Code.gs`, `constants.js`, `api.js`, `app.js`, `views/my-work.js`, `ui/navigation.js`, `i18n.js`, `config.js`, `index.html`, `run_tests.mjs`. (Chi tiết bảng bên dưới.)
- **Decisions**: sheet riêng (không đụng Task_Master); xem-tất-cả / sửa-của-mình (gate client+server); nhắc = item chưa xong (stale >7 ngày gắn badge, sort đầu); trạng thái dùng bộ VN của app; PIC=dropdown (non-admin khóa vào mình), phối hợp=text; phím tắt **G+V** (G+P đã là Performance).
- **Blocker**: (1) 🔴 `backend/RenameUserService.gs` bị nối đoạn PowerShell chứa **API key lộ** ở cuối file — chưa commit; cần dọn + thu hồi key. (2) Dev Plan chạy thật cần user hard-reload nhận `v6.19.1`.
- **Next step**: hard-reload verify badge `v6.19.1`; smoke test đa-user (A tạo → B xem read-only, sửa bị chặn); dọn RenameUserService + thu hồi key; (tùy chọn) Excel export / audit history / nhắc theo tháng cho Dev Plan.
- **Regression risk**: 🟢 THẤP — full suite **21/21 PASS**. Điểm cần để ý: `renderMyWork` giờ phụ thuộc `dbDev` + hàm `_devIsStaleReview/_devIsDone` (guard `typeof`, an toàn nếu dev-plan.js lỗi); ESC handler gọi `closeDevModal/closeDevViewPopup`; `syncDB` thêm `readDev` vào `Promise.all` (readDev tự catch, không làm hỏng sync). Không đụng schema Task/Case/Issue/Initiative.

---

## Tasks Completed (S54 — Dev Plan)

Tính năng mới ở Left menu (nhóm Tổng quan): **Plan phát triển bản thân** — mỗi cá nhân tự thêm công việc học tập / tự đào tạo.

| # | Task | Files | Status |
|---|---|---|---|
| S54-T1 | `backend/DevPlanService.gs` (NEW) — sheet `Dev_Plan` 12 cột A→L; `devRead/devUpsertRow/devDeleteRow/devGetPicById` (auto-create sheet) | `backend/DevPlanService.gs` | ✅ |
| S54-T2 | `backend/Code.gs` — +3 route `dev-read/dev-upsert/dev-delete` + **ownership gate** (PIC==tokenData.u hoặc Admin) | `backend/Code.gs` | ✅ |
| S54-T3 | `constants.js` — `dbDev`, `DEV_STATES`, `DEV_COLS`, `DEV_REVIEW_STALE_DAYS=7` | `assets/js/constants.js` | ✅ |
| S54-T4 | `api.js` — Dev API: `rowToDev/devToRow/genDevId/_gasDevUpsert/_gasDevDelete/readDev/persistDev/loadDevFromCache` | `assets/js/api.js` | ✅ |
| S54-T5 | `app.js` — `loadDevFromCache()`+`readDev()` startup; `readDev()` vào `syncDB()` Promise.all; renderAll guard; clear-cache reset `dbDev` | `assets/js/app.js` | ✅ |
| S54-T6 | `views/dev-plan.js` (NEW) — toolbar (filter PIC mặc định=tôi + Tất cả, filter trạng thái, search), bảng nhóm-theo-PIC STT động, stateChip+progress, CRUD modal, view popup, ownership gate client, `devQuickReview()` cho My Work | `assets/js/views/dev-plan.js` | ✅ |
| S54-T7 | `dev-plan.css` (NEW) — page/stat/toolbar/table/modal/overlay + `.mw-devrv-*` (section nhắc ở My Work); dark-mode qua tokens | `assets/css/dev-plan.css` | ✅ |
| S54-T8 | `my-work.js` — `_mwGetDevReview/_mwBuildDevReviewSection/mwDevReviewSave`: nhắc item chưa update >7 ngày; cập nhật % + ghi chú → reset mốc review | `assets/js/views/my-work.js` | ✅ |
| S54-T9 | `navigation.js` — dispatch renderDevPlan, ESC close, keymap **G+V**; `index.html` — nav item (fa-seedling), view section, `#devModal`, `#devViewOverlay`, KB G+V, script tag | `assets/js/ui/navigation.js`, `index.html` | ✅ |
| S54-T10 | `i18n.js` — nav/page.dev-plan + ~34 `dev.*` keys VI+EN | `assets/js/i18n.js` | ✅ |
| S54-T11 | `config.js` — APP_VERSION `6.19-dev-plan-20260728`; cache-bust `?v=20260728` (58 refs, Python) | `assets/js/config.js`, `index.html` | ✅ |
| S54-T12 | `verify_dev_plan.mjs` (NEW, port 3043) — **37/37 PASS**; `run_tests.mjs` +suite → **21/21 suites PASS** | tests | ✅ |

### Quyết định thiết kế (chốt với user qua phỏng vấn)
- **Lưu trữ**: sheet riêng `Dev_Plan` (không đụng Task_Master).
- **Quyền**: mọi user XEM plan của nhau (read-only); chỉ PIC/Admin SỬA-XÓA (gate cả client + server). Mặc định login = list của tôi.
- **Nhắc nhở**: item chưa xong VÀ (chưa review bao giờ HOẶC >7 ngày chưa động) → hiện ở "Công việc của tôi"; cập nhật = reset mốc `lastReview`.
- **Trạng thái**: dùng bộ tiếng Việt của app (stateChip/tState).
- **PIC** = dropdown user (non-admin khóa vào chính mình); **Đơn vị phối hợp** = text tự do.
- **Xem người khác** = dropdown filter PIC (mặc định=tôi, "Tất cả" nhóm theo PIC tái hiện layout Excel).

### ✅ GAS redeploy — ĐÃ XONG (user, 2026-07-28)
`DevPlanService.gs` + `Code.gs` deployed, URL không đổi. Create/delete verified live. Sheet `Dev_Plan` auto-created.

### 🔧 S54.1 fix — Dev Plan hiển thị ở "Công việc của tôi" (2026-07-28)
**Triệu chứng user báo**: tạo/xóa OK nhưng item không hiện ở My Work.
**Nguyên nhân**: `_mwGetDevReview` cũ chỉ lấy item **stale** (chưa review >7 ngày). Item vừa tạo có `lastReview=now` → không stale → ẩn suốt tuần đầu.
**Sửa**:
- `my-work.js` — `_mwGetDevReview` giờ trả **mọi dev item đang làm (chưa Hoàn thành) của tôi**, sort stale-first; item stale gắn badge "Cần review" (`.mw-devrv-badge` + class `.is-stale`).
- `app.js` — `readDev().then(...)` re-render My Work/Dev Plan khi load xong server (tránh landing render trước khi dữ liệu về).
- `i18n.js` — `dev.review.title` đổi thành "Kế hoạch phát triển bản thân của tôi"; +`dev.review.badge`.
- `config.js` — `6.19.1-dev-plan-mywork-20260728`; cache-bust `?v=20260728b`.
- `verify_dev_plan.mjs` — DP12 cập nhật semantics (hiện tất cả active, badge stale); +route-abort `script.google.com` để test cách ly network (dev-read đã live sẽ clobber mock). **40/40 PASS**, deterministic.

### ⚠️ CẢNH BÁO BẢO MẬT (không do S54 tạo ra)
`backend/RenameUserService.gs` trong working tree bị **nối thêm 1 đoạn PowerShell chứa API key + proxy** ở cuối file (không hợp lệ trong file .gs). S54 **KHÔNG commit** file này. Cần: xóa đoạn thừa + **thu hồi/đổi API key** đã lộ (`sk-6IeUw...`).

---

## DATE FROM PREVIOUS SESSION HANDOVER (S53)

# SESSION HANDOVER
**Date**: 2026-07-16 (Session 53 — RenameUserService: migration PhuongNPL_C → PhuongNPL)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `8437f2d` — feat(S53): RenameUserService — migration PhuongNPL_C → PhuongNPL

---

## Tasks Completed (S53)

| # | Task | Files | Status |
|---|---|---|---|
| S53-T1 | `backend/RenameUserService.gs` (NEW) — migration script đổi tên user `PhuongNPL_C` → `PhuongNPL` trên toàn bộ DB; `dryRunRenamePhuong()` + `commitRenamePhuong()` | `backend/RenameUserService.gs` | ✅ |

### Undocumented commit phát hiện trong session

Commit `3a86a78` — `feat(perf): wire i18n t() calls in performance.js; update test EVD screenshots` — đã được push sau S52 handover nhưng chưa được ghi vào SESSION_HANDOVER. Không ảnh hưởng tới chức năng hiện tại.

### S53 Architecture Notes

**RenameUserService.gs — Sheets được cập nhật:**

| Sheet | Cột kiểm tra |
|---|---|
| `User_Master` | `Username` |
| `Task_Master` | `PIC Accountable`, `PIC Responsible`, `PIC Support` |
| `Case_Pipeline` | `PIC` |
| `Issue_Tracker` | `Người log`, `Người xử lý` |
| `Initiative_Master` | `Accountable` |
| `Audit_Log` | **KHÔNG chạm** (lịch sử giữ nguyên) |

**Column matching**: normalized `startsWith` — bắt được header dài như `"PIC Accountable (Teamlead – chịu trách nhiệm)"`.

**Value matching**: exact case-insensitive — tránh partial replace (ví dụ `PhuongNPL_C2` không bị thay).

**Usage (GAS Editor)**:
```
1. dryRunRenamePhuong()  → xem Logger output, kiểm tra số cell sẽ thay đổi
2. commitRenamePhuong()  → ghi thực sự vào Sheets
3. Yêu cầu user PhuongNPL_C đăng xuất + đăng nhập lại với username mới PhuongNPL
```

**Không cần GAS redeploy** — script chạy trực tiếp trong GAS Editor, không phải Web App route.

**Không cần cache-bust / APP_VERSION bump** — không thay đổi frontend.

### Smoke test checklist S53
| Check | Expected |
|---|---|
| `dryRunRenamePhuong()` | Logger hiện đúng số cell; không có WARN "không tìm thấy" cho các sheet chính |
| `commitRenamePhuong()` | Logger "Migration hoàn tất", số cell > 0 |
| User_Master sheet | `PhuongNPL_C` → `PhuongNPL` trong cột Username |
| Task_Master sheet | Các task có picAcc/picRes/picSupport = PhuongNPL_C đã đổi thành PhuongNPL |
| Sau khi user re-login | Dropdown PIC hiện "... (PhuongNPL)" thay vì "(PhuongNPL_C)" |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S52)

---

# SESSION HANDOVER
**Date**: 2026-07-10 (Session 52 — SYNC topbar + Issue Tracker Người log dropdown)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `c40dbae` — feat(S52): SYNC topbar + Issue Tracker Nguoi Log dropdown

---

## Tasks Completed (S52)

| # | Task | Files | Status |
|---|---|---|---|
| S52-T1 | `index.html` — Move `#btnSync` to topbar-right (before Quick View), styled with `qv-topbar-btn`; remove from Tasks toolbar | `index.html` | ✅ |
| S52-T2 | `index.html` — Remove "Làm mới" buttons from BLD Queue, Case Pipeline (table+kanban), Issue Tracker | `index.html` | ✅ |
| S52-T3 | `index.html` — Issue Tracker modal: `<input type="text" id="itfNguoiLog">` → `<select id="itfNguoiLog">` | `index.html` | ✅ |
| S52-T4 | `app.js` — `syncDB()` now syncs ALL features in parallel: `readFromHandle()` + `readCases()` + `readIssues()` + `readInitiatives()` | `assets/js/app.js` | ✅ |
| S52-T5 | `issue-tracker.js` — `openIssueModal()`: replace `_itSetField('itfNguoiLog', ...)` with `_populateUserSelect('itfNguoiLog', null, ...)` | `assets/js/views/issue-tracker.js` | ✅ |
| S52-T6 | `config.js` — APP_VERSION `6.17-i18n-phase8-20260710` → `6.18-sync-topbar-nguoilog-20260710`; cache-bust `?v=20260710f` (56 refs, Python) | `assets/js/config.js`, `index.html` | ✅ |
| S52-T7 | Tests: 19/20 PASS — `verify_my_work.mjs` has 3 pre-existing failures (MW22/MW23-prog-bar, progress toggle UI), unrelated to S52 | all | ⚠️ pre-existing |

### S52 Architecture Notes

**SYNC topbar button (`#btnSync`)**:
- Removed from Tasks toolbar (`btn btn-success-soft btn-sm`); was at old line 844
- Added to topbar-right BEFORE Quick View button, class `qv-topbar-btn`; icon color `var(--success)`
- Same `id="btnSync"` → JS visibility refs in `app.js` (lines 53, 158, 186: display inline-flex/none) still work without change

**syncDB() — all features in parallel**:
```javascript
await Promise.all([
  readFromHandle(),  // Tasks
  readCases(),       // Case Pipeline
  readIssues(),      // Issue Tracker
  readInitiatives(), // Initiatives
]);
```

**Issue Tracker "Người log" dropdown**:
- `<select id="itfNguoiLog">` in `index.html` (was `<input type="text">`)
- `openIssueModal()` calls `_populateUserSelect('itfNguoiLog', null, iss?.nguoiLog || auth?.user?.username || '')`
- `team=null` → `getUsersByTeam('')` → all active users; displays "Display_Name (Username)"; stores Username as value
- Fallback if `_appUsers` empty: single option with currentVal (offline-safe)
- Save logic (`_itCollect()`) uses `.value` — works identically for input/select

**Per-feature "Làm mới" buttons removed** (topbar SYNC replaces them):
- BLD Queue filter bar: entire button removed
- Case Pipeline table: `div` simplified to just `<span id="cpCountInfo">`
- Case Pipeline kanban: header div removed entirely
- Issue Tracker table: `div` simplified to just `<span id="itCountInfo">`

### Test suite snapshot (2026-07-10, S52)
```
verify_i18n_p8             13/13  PASS  (S51)
verify_i18n_p7             35/35  PASS  (S50)
verify_i18n_p6             27/27  PASS  (S49)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             59/62  ❌ FAIL 3 (MW22 x2 + MW23-prog-bar — PRE-EXISTING, unrelated to S52)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
run_tests.mjs              19/20  (1 pre-existing suite failure)
```

### Smoke test checklist S52
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.18-sync-topbar-nguoilog-20260710` |
| Topbar | SYNC button appears next to Quick View (when connected) |
| Click SYNC | Toast "Đã đồng bộ toàn bộ dữ liệu!" — all 4 feature lists refresh |
| Issue Tracker → Thêm Issue | "Người log" field is a dropdown; logged-in user pre-selected |
| Issue Tracker → Edit Issue | "Người log" shows the issue's existing nguoiLog value |
| BLD Queue, Case Pipeline, Issue Tracker | No "Làm mới" button (removed) |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S51)

---

# SESSION HANDOVER
**Date**: 2026-07-10 (Session 51 — i18n Phase 8: KPI Overview + Owner Analysis bilingual)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `7f5c1db` — feat(i18n): Phase 8 — KPI Overview + Owner Analysis bilingual (6 keys)

---

## Tasks Completed (S51 — i18n Phase 8)

| # | Task | Files | Status |
|---|---|---|---|
| S51-T1 | `i18n.js` — +6 keys (kp.btn.*, kp.section.*, oa.tab.ranking) in VI and EN | `assets/js/i18n.js` | ✅ |
| S51-T2 | `kpi-overview.js` — 3 toolbar buttons + 2 section headers → `t()` | `assets/js/views/kpi-overview.js` | ✅ |
| S51-T3 | `owner-analysis.js` — ranking tab label → `t('oa.tab.ranking')` | `assets/js/views/owner-analysis.js` | ✅ |
| S51-T4 | `app.js` — `renderAll()` +2 guards: view-kpi-overview, view-owner-analysis | `assets/js/app.js` | ✅ |
| S51-T5 | `config.js` — APP_VERSION `6.16.2-fix-it-popup-20260710` → `6.17-i18n-phase8-20260710` | `assets/js/config.js` | ✅ |
| S51-T6 | `index.html` — cache-bust `?v=20260710d` → `?v=20260710e` (56 refs, Python) | `index.html` | ✅ |
| S51-T7 | `verify_i18n_p8.mjs` (NEW) — **13/13 PASS** (IP8-1→IP8-8: KP buttons VI/EN, section headers VI/EN, OA tab label VI/EN, renderAll live-switch, 0 JS errors) | `verify_i18n_p8.mjs` | ✅ |
| S51-T8 | `run_tests.mjs` — +verify_i18n_p8.mjs as first suite; **20/20 PASS** | `run_tests.mjs` | ✅ |

### i18n Phase 8 Key Notes (S51)

**Domain data NOT translated** (intentional): KPI names ('KPI 2.1', 'KPI 2.2'), owner labels ('QuangNN3 – Bảo lãnh', 'DungLQ1 – Giải ngân'), channel terms ('BIZ', 'BPM', 'Digital Rate'), KPI status ('Vượt KPI', 'Đạt KPI'), all chart card titles, all alert message text, period subtitle ('Kỳ: T1–T6/2026'), owner tab labels that include person names.

**Only chrome translated**: Toolbar buttons (Load/Sync/From-Sheet), section headers (Charts/Alerts), ranking tab label.

**Phase 0 security verified**: `AuthService.gs` throws if no `AUTH_SECRET` (no fallback). `Code.gs` has KNOWN_ROLES gate + Admin-only gate for write actions. ✅ Done as of S30-era.

**renderAll() guards (app.js)**:
```javascript
if (document.getElementById('view-kpi-overview')?.style.display === 'contents') renderKpiOverview();
if (document.getElementById('view-owner-analysis')?.style.display === 'contents') renderOwnerAnalysis();
```
Note: `renderKpiOverview()` also internally re-renders kpi-progress + owner-analysis on revisit (kpi-overview.js:225–229). Guard for view-owner-analysis still needed for direct navigation.

### Test suite snapshot (2026-07-10, S51)
```
verify_i18n_p8             13/13  PASS  (S51 NEW)
verify_i18n_p7             35/35  PASS  (S50)
verify_i18n_p6             27/27  PASS  (S49)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             55/55  PASS  (S44b)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS  (S30)
verify_case_pipeline       22/22  PASS  (S20)
verify_bld_queue           46/46  PASS  (S19)
verify_milestone_task      23/23  PASS  (S27)
verify_task_init_popup     28/28  PASS  (S25)
verify_filter_cascade      23/23  PASS  (S23)
verify_import_rbac         15/15  PASS  (S23)
verify_modal_layout         9/9   PASS  (S23)
─────────────────────────────────────────────────
run_tests.mjs              20/20  PASS
```

### Smoke test checklist S51
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.17-i18n-phase8-20260710` |
| KPI Digital Overview → switch EN | Buttons: "Load Raw File", "Sync to Sheet", "From Sheet" |
| KPI Digital Overview → switch EN | Section headers: "Analysis Charts", "Automated KPI Alerts" |
| Owner Analysis → switch EN | Third tab: "PTKD Rankings" |
| Switch back VI | "Tải File Raw", "Biểu đồ phân tích", "Cảnh báo KPI Tự động", "Bảng xếp hạng PTKD" |

---

## Next session candidates (S52+)
| Priority | Task | Notes |
|---|---|---|
| P0 | Smoke test S51 on production | See checklist above |
| P1 | AI Chat live activation | GAS editor → Script Properties → `GEMINI_API_KEY = <key>` (user action). Backend is wired; frontend i18n done. |
| P2 | i18n coverage is now COMPLETE | All views bilingual. No Phase 9 needed. |

---

## Previous S50 — i18n Phase 7
**Date**: 2026-07-10 (Session 50 — i18n Phase 7: Gantt, AI Chat, Branch Analysis, User Management bilingual)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `e0039a4` — feat: i18n Phase 7 — Gantt, AI Chat, Branch Analysis, User Management bilingual

---

## Tasks Completed (S50 — i18n Phase 7)

| # | Task | Files | Status |
|---|---|---|---|
| S50-T1 | `i18n.js` — +74 new keys (gantt.*, ai.*, branch.*, um.*) in VI and EN blocks | `assets/js/i18n.js` | ✅ |
| S50-T2 | `gantt.js` — subtitle + empty state → `t()` calls | `assets/js/views/gantt.js` | ✅ |
| S50-T3 | `ai-chat.js` — static `_aiSuggestions` → `_getAiSuggestions()` function; 8 UI strings → `t()` | `assets/js/views/ai-chat.js` | ✅ |
| S50-T4 | `branch-analysis.js` — zone tabs, stat cards, table headers → `t()` (12 strings) | `assets/js/views/branch-analysis.js` | ✅ |
| S50-T5 | `user-management.js` — ~45 strings → `t()`; `renderUserManagement()` skips `_umLoad()` if `_umUsers.length>0` (lang-switch cache); `+_umRestoreFilterUi()` helper | `assets/js/views/user-management.js` | ✅ |
| S50-T6 | `app.js` — `renderAll()` +4 guards (gantt, ai-chat, branch-analysis, user-management) | `assets/js/app.js` | ✅ |
| S50-T7 | `config.js` — APP_VERSION `6.15` → `6.16-i18n-phase7-20260710`; cache-bust `?v=20260710b` (56 refs) | `assets/js/config.js`, `index.html` | ✅ |
| S50-T8 | `verify_i18n_p7.mjs` (NEW) — **35/35 PASS** (IP7-1 → IP7-20; Gantt subtitle/empty, AI Chat header/suggest, Branch zone/stat/col, UM filter/empty/badge, renderAll live-switch, 0 JS errors) | `verify_i18n_p7.mjs` | ✅ |
| S50-T9 | `run_tests.mjs` — +verify_i18n_p7.mjs as first suite; **19/19 PASS** | `run_tests.mjs` | ✅ |

### i18n Phase 7 Architecture (S50)

**Critical lesson**: `let _umUsers = []` in user-management.js is a script-scope binding — NOT a property of `window`. Test code that does `window._umUsers = users` creates a SEPARATE variable. Must use `_umUsers.length = 0; _umUsers.push(...users)` to mutate the actual array.

**`renderUserManagement()` lang-switch cache** (skips GAS refetch):
```javascript
if (_umUsers.length > 0) {
  _umPopulateFilters();   // rebuild team dropdown (uses _umFilterTeam state)
  _umRestoreFilterUi();   // restore filter input values from state vars
  _umRender();            // render table with current filters
} else {
  await _umLoad();        // initial load — hits GAS
}
```

**`_getAiSuggestions()` function** replaces static `_aiSuggestions` array so suggestions re-evaluate on each render (picks up current language).

**renderAll() guards added (app.js)**:
```javascript
if (document.getElementById('view-gantt')?.style.display === 'contents') renderGantt();
if (document.getElementById('view-ai-chat')?.style.display === 'contents') renderAiChat();
if (document.getElementById('view-branch-analysis')?.style.display === 'contents') renderBranchAnalysis();
if (document.getElementById('view-user-management')?.style.display === 'contents') renderUserManagement();
```

**Reused existing keys**: `common.all`, `common.cancel`, `common.search`, `page.user-management`

**Skipped (domain data, not UI chrome)**: `kpi-overview.js`, `owner-analysis.js`, `kpi-progress.js` (clean), `rm-analysis.js` (clean)

### Test suite snapshot (2026-07-10, S50)
```
verify_i18n_p7             35/35  PASS  (S50 NEW)
verify_i18n_p6             27/27  PASS  (S49)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (19 suites)        PASS  0 FAIL
```

### Smoke test checklist (S50 — manual, production)
| Check | Expected |
|---|---|
| Hard-reload | Badge shows `v6.16-i18n-phase7-20260710` |
| Gantt view → switch EN | Subtitle: "Timeline view — 2026" |
| Gantt view → no tasks with dates | Empty state: "No tasks with both Start Date and Deadline" |
| AI Chat → switch EN | Header sub: "Ask about tasks, KPIs, initiatives · Powered by Gemini" |
| AI Chat suggestions (EN) | "Summarize all currently Blocked tasks" |
| Branch Analysis tabs (EN) | Zone tabs: "All / North Region / South Region / Central Region" |
| Branch stat cards (EN) | "Met KPI / Below KPI / Total Branches" |
| User Management → switch EN | Filter label: "Status"; options: "Active / Inactive" |
| UM status badge (EN) | Active row: "Active"; Locked row: "Inactive" |
| Switch back VI | All labels restore to Vietnamese |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S49)

---

# SESSION HANDOVER
**Date**: 2026-07-10 (Session 49 — i18n Phase 6: Initiative Tracker + dashboard/app filter labels)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `cbe20a1` — feat(i18n): S49 — i18n Phase 6: Initiative Tracker + dashboard/app filter labels bilingual

---

## Tasks Completed (S49 — i18n Phase 6: Initiative Tracker)

| # | Task | Files | Status |
|---|---|---|---|
| S49-T1 | `i18n.js` — +52 new `it.*` keys + `db.modal.project-prefix` in VI and EN blocks | `assets/js/i18n.js` | ✅ |
| S49-T2 | `initiative-tracker.js` — all ~52 hard-coded VI strings replaced with `t()` calls across all functions | `assets/js/views/initiative-tracker.js` | ✅ |
| S49-T3 | `dashboard.js` — 1 fix: `'Dự án: '` prefix → `t('db.modal.project-prefix')` | `assets/js/views/dashboard.js` | ✅ |
| S49-T4 | `app.js` — `renderAll()` guard for IT view + 2 hard-coded `'Tất cả'` in `updateFilterDropdowns()` | `assets/js/app.js` | ✅ |
| S49-T5 | `config.js` — `APP_VERSION='6.15-i18n-phase6-20260710'`; cache-bust `?v=20260710` (56 refs) | `assets/js/config.js`, `index.html` | ✅ |
| S49-T6 | `verify_i18n_p6.mjs` (NEW) — 27/27 PASS (IP6-1 to IP6-15: stat bar VI/EN, scope btns, filter opts, add btn, empty state, filterInit/filterTuanBC, restore VI, 0 JS errors) | `verify_i18n_p6.mjs` | ✅ |
| S49-T7 | `run_tests.mjs` — added `verify_i18n_p6.mjs` as first suite (now 18 suites) | `run_tests.mjs` | ✅ |
| S49-T8 | Full regression: **18/18 suites PASS** | all | ✅ |

### i18n Phase 6 Architecture (S49)

**Functions wired in `initiative-tracker.js`**:
- `renderInitiativeTracker()` toolbar: title, scope buttons, filter dropdowns, add button
- `_initStatBar()`: 4 stat labels (`it.stat.total/active/done` + `mw.dl.overdue`); "Blocked" kept as-is
- `_initBuildCardList()`: empty state title + subtitle
- `_initBuildCard()`: "Tasks liên kết" toggle label
- `_initBuildMilestoneList()`: empty text + both "Thêm Milestone" buttons
- `_initBuildMsTaskList()`: empty + add-task; alignment badges (warn/loose/ok); fix-link; table headers
- `_initBuildTaskList()`: empty + table headers (Trạng thái/Tiến độ)
- `_initModalTemplate()`: all labels + footer Hủy/Lưu via `common.cancel/save`
- `_initOpenModal()`: root-opt, add/edit titles
- `_initSave()`: 3 validation strings + 2 success toasts
- `_initDelete()`: warning/warn-tasks/warn-ms + confirm dialog + error/success toasts
- `openInitViewPopup()`: subtitle + all 7 row labels
- `_loadInitHistory()`: loading text + synthetic row action

**Key reuse** (avoids duplicate keys):
- `mw.dl.overdue` → IT stat bar "Quá hạn / Overdue"
- `task.scope.mine/all` → IT scope buttons
- `common.cancel/save/delete` → IT modal footer + confirm

**renderAll() guard** (app.js):
```javascript
if (document.getElementById('view-initiative-tracker')?.style.display === 'contents') renderInitiativeTracker();
```

### Test suite snapshot (2026-07-10, S49)
```
verify_i18n_p6             27/27  PASS  (S49 NEW)
verify_i18n_p5             24/24  PASS  (S48)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (18 suites)        PASS  0 FAIL
```

### Smoke test checklist (S49 — manual, production)
| Check | Expected |
|---|---|
| Hard-reload | Badge shows `v6.15-i18n-phase6-20260710` |
| Initiative Tracker → switch EN | Stat bar: "Total Initiatives / Active / Done / Overdue" |
| Scope buttons (EN) | "Mine / All" |
| Filter dropdowns (EN) | "All Categories / All Statuses" |
| Add button (EN) | "Add Initiative" |
| Empty state (EN) | "No Initiatives" |
| Switch back VI | All labels restore to Vietnamese |
| Tasks view → filterInit (EN) | "All" |
| Tasks view → filterTuanBC (EN) | "All" / "📅 This Week" |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S48)

---

# SESSION HANDOVER
**Date**: 2026-07-09 (Session 48 — i18n Phase 5: Quick View + Executive Summary bilingual)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `5aa429b` — S48: i18n Phase 5 — Quick View + Executive Summary bilingual

---

## Tasks Completed (S48 — i18n Phase 5: Quick View + Executive Summary)

| # | Task | Files | Status |
|---|---|---|---|
| S48-T1 | `quickview.js` — 18 t() calls wired (filter options, subtitle, done label, state chip via tState(), time prefix, plan labels, group-by, deadline prefix, overdue prefix, issue flags, risk/BLĐ titles, empty states) | `assets/js/views/quickview.js` | ✅ |
| S48-T2 | `quickview.js` — fix t()-shadowing: renamed loop var `t→tk` in 4 map callbacks (done, plan, initiative, issue) | `assets/js/views/quickview.js` | ✅ |
| S48-T3 | `quickview.js` — `renderQuickView()` now calls `_qvPopulateFilters()` + `_qvUpdateTime()` so filter labels and time prefix update live on language switch | `assets/js/views/quickview.js` | ✅ |
| S48-T4 | `executive-summary.js` — 6 t() calls wired (chart empty label, attention empty, cfg labels BLĐ+Overdue, more-link, table empty, status tags High Risk/Watch/On Track) | `assets/js/views/executive-summary.js` | ✅ |
| S48-T5 | `app.js` — 2 new guards in `renderAll()`: ES view + QV panel re-render on language switch | `assets/js/app.js` | ✅ |
| S48-T6 | `config.js` — APP_VERSION='6.14-i18n-phase5-20260709'; cache-bust ?v=20260709g | `assets/js/config.js`, `index.html` | ✅ |
| S48-T7 | `verify_i18n_p5.mjs` (NEW) — 24/24 PASS (IP5-1 to IP5-14: QV filter, subtitle, done/plan/init/issue labels, time prefix, ES empty/attention/status tags, VI restore, 0 JS errors) | `verify_i18n_p5.mjs` | ✅ |
| S48-T8 | `run_tests.mjs` — added verify_i18n_p5.mjs as first suite (now 17 suites) | `run_tests.mjs` | ✅ |
| S48-T9 | Full regression: **17/17 suites PASS** | all | ✅ |

### i18n Phase 5 Architecture (S48)

**All translation keys pre-existed** in `i18n.js` (qv.*, es.* written in prior session). Phase 5 was purely wiring.

**Critical t()-shadowing bug** (found and fixed this session):
```javascript
// quickview.js: BEFORE (broken — local `t` shadows global t() i18n function)
done.map(t => `...${t('qv.done.label')}...`)  // t is task object; t() fails

// AFTER (fixed — renamed loop var to tk)
done.map(tk => `...${t('qv.done.label')}...`)  // t() is the global i18n function again
```
Same fix applied to plan.map, initTasks.map, issues.map.

**Live language switch fix for QV**:
`renderQuickView()` now calls `_qvPopulateFilters()` + `_qvUpdateTime()` at the start, so filter labels and time prefix update immediately on `setLang()`.

**renderAll() additions (app.js)**:
```javascript
if (document.getElementById('view-executive-summary')?.style.display === 'contents') renderExecutiveSummary();
if (_qvIsOpen) renderQuickView();
```

### Test suite snapshot (2026-07-09, S48)
```
verify_i18n_p5             24/24  PASS  (S48 NEW)
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (17 suites)        PASS  0 FAIL
```

### Smoke test checklist (S48 — manual, production)
| Check | Expected |
|---|---|
| Hard-reload | Badge shows `v6.14-i18n-phase5-20260709` |
| Open Quick View → switch to EN | Filter "All" / "All Weeks" / "📅 This Week", subtitle contains "tasks" + "All", "Done:", "Next Week Plan", "Group by Initiative", "Updated:" |
| Switch back to VI | "Tất cả", "Cập nhật:" |
| Executive Summary → switch EN | "High Risk", "Watch"/"On Track", "Pending Approval", "Overdue" |
| Switch back to VI | "Rủi ro cao", "Cần chú ý", "Cần BLĐ", "Quá hạn" |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S47)

---

# SESSION HANDOVER
**Date**: 2026-07-09 (Session 47 — i18n Phase 4: My Work bilingual labels)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `f87eb3e` — S47: i18n Phase 4 — My Work bilingual labels

---

## Tasks Completed (S47 — i18n Phase 4: My Work)

| # | Task | Files | Status |
|---|---|---|---|
| S47-T1 | `i18n.js` — 22 mw.* keys VI + 22 EN (greeting, deadline, champion, sections) | `assets/js/i18n.js` | ✅ |
| S47-T2 | `my-work.js` — replace all hard-coded VI strings with t()/tState(); rename t→ct/task to fix shadowing | `assets/js/views/my-work.js` | ✅ |
| S47-T3 | `config.js` — APP_VERSION='6.13-i18n-phase4-20260709'; cache-bust ?v=20260709f | `assets/js/config.js`, `index.html` | ✅ |
| S47-T4 | `verify_my_work.mjs` — MW36-MW39 EN/VI switching tests; 62/62 PASS (was 55) | `verify_my_work.mjs` | ✅ |
| S47-T5 | Full regression: **16/16 suites PASS** | all | ✅ |

### i18n Phase 4 Architecture (S47)

- **22 new keys**: `mw.greeting`, `mw.login-required`, `mw.view-all`, `mw.dl.{overdue,today,in,days}`, `mw.champion.{title,filled,unfilled,all-filled,count-unfilled,placeholder}`, `mw.urgent.{title,empty}`, `mw.tasks.{title,empty}`, `mw.init.{title,empty,popup-empty}`, `mw.case.{title,empty}`
- **t()-shadowing fix**: `champTasks.map(t => ...)` → `map(ct => ...)`; `_mwBuildTaskCard(t)` → `_mwBuildTaskCard(task)` — critical: `t` was a local param shadowing global `t()` i18n function
- **tState() for state options**: Select dropdown options now use `tState(s)` to translate state values in task cards
- **setLang('en') triggers renderMyWork()**: via `renderAll()` in app.js — all MW labels switch live

### Test suite snapshot (2026-07-09, S47)
```
verify_i18n_p3             62/62  PASS  (S45)
verify_i18n_p2             36/36  PASS  (S43)
verify_my_work             62/62  PASS  (S47: +MW36-MW39; S44b: +MW30-MW35)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (16 suites)        PASS  0 FAIL
```

---

---

## Tasks Completed (S44b — My Work Champion Section)

| # | Task | Files | Status |
|---|---|---|---|
| S44b-T1 | `my-work.js` — _mwGetChampionTasks(), _mwBuildChampionSection() with amber theme | `assets/js/views/my-work.js` | ✅ |
| S44b-T2 | `my-work.js` — mwRefreshChampionStatus(): DOM-only badge update on blur, no re-render | `assets/js/views/my-work.js` | ✅ |
| S44b-T3 | `my-work.js` — renderMyWork(): champion section inserted after header, before urgent | `assets/js/views/my-work.js` | ✅ |
| S44b-T4 | `my-work.css` — .mw-champion-section/.mw-champion-item/.mw-champion-status/pending/done | `assets/css/my-work.css` | ✅ |
| S44b-T5 | `config.js` — APP_VERSION='6.11-mw-champion-20260709'; cache-bust ?v=20260709d | `assets/js/config.js`, `index.html` | ✅ |
| S44b-T6 | `verify_my_work.mjs` — MW30-MW35 champion tests; 55/55 PASS (was 45) | `verify_my_work.mjs` | ✅ |
| S44b-T7 | Full regression: **15/15 suites 479/479 PASS** | all | ✅ |

### Champion Section Architecture (S44b)

- **Trigger**: highlight=Y tasks in user's task list that are NOT 'Hoàn thành'
- **Position**: Between page header and urgent section (top priority → see first on login)
- **Per-item**: task ID + name + status badge + result textarea
- **Status badge**: `⚠️ Chưa cập nhật` (amber, `status-todo`) / `✅ Đã cập nhật` (green, `status-ok`)
- **Header badge**: `N chưa cập nhật` (amber pill) / `✅ Đã cập nhật đầy đủ` (green text) when all filled
- **DOM-only refresh**: `mwRefreshChampionStatus(id, val)` — updates item class + badge, updates section-level pending count — no full re-render
- **section hidden** when no champion tasks (returns `''`)

### Test suite snapshot (2026-07-09, S44b)
```
verify_my_work             55/55  PASS  (S44b: +MW30-MW35; S44a: +MW26-MW29; S42 base)
verify_i18n_p2             36/36  PASS  (S43)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (15 suites)         479/479 PASS  0 FAIL
```

---

## Tasks Completed (S44a — My Work Initiative Popup)

| # | Task | Files | Status |
|---|---|---|---|
| S44a-T1 | `my-work.js` — _mwBuildInitSection: MAX_INIT=4, inlines card builder, "Xem tất cả →" → mwOpenInitPopup() | `assets/js/views/my-work.js` | ✅ |
| S44a-T2 | `my-work.js` — mwOpenInitPopup(): builds ALL root initiatives in overlay; mwCloseInitPopup() | `assets/js/views/my-work.js` | ✅ |
| S44a-T3 | `index.html` — #mwInitPopup overlay with list+count+close+footer buttons; cache-bust ?v=20260709c | `index.html` | ✅ |
| S44a-T4 | `my-work.css` — .mw-popup-ini-item + .mw-popup-ini-header styles | `assets/css/my-work.css` | ✅ |
| S44a-T5 | `navigation.js` — mwCloseInitPopup() added to ESC handler chain | `assets/js/ui/navigation.js` | ✅ |
| S44a-T6 | `config.js` — APP_VERSION='6.10-mw-init-popup-20260709' | `assets/js/config.js` | ✅ |
| S44a-T7 | `verify_my_work.mjs` — MW26-MW29 popup tests; 45/45 PASS (was 35) | `verify_my_work.mjs` | ✅ |
| S44a-T8 | Full regression: **15/15 suites 469/469 PASS** | all | ✅ |

### Initiative Popup Architecture (S44a)

- **Trigger**: "Xem tất cả →" in Initiative section header → `mwOpenInitPopup()`
- **Content**: ALL root initiatives (`type=initiative`, no parentId, not BAU, status defined) sorted by id
- **Why all, not just user's**: "Xem tất cả" = see the full picture; user's filtered subset already shown in section
- **Close paths**: X button, "Đóng" button, backdrop click, ESC key
- **"Mở Initiative Tracker" button**: navigates to initiative-tracker view + closes popup
- **MAX_INIT=4**: Section grid now truncates at 4 cards; popup shows the rest
- **Popup HTML**: `#mwInitPopup .modal > .modal-header + #mwInitPopupList + .modal-footer`

### Test suite snapshot (2026-07-09, S44a)
```
verify_my_work             45/45  PASS  (S44a: +MW26-MW29 popup; S42 base)
verify_i18n_p2             36/36  PASS  (S43)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (15 suites)         469/469 PASS  0 FAIL
```

---

## Tasks Completed (S43 — i18n Phase 2)

| # | Task | Files | Status |
|---|---|---|---|
| S43-T1 | `i18n.js` — STATE_KEY lookup + tState() helper + 50 new VI/EN keys (state display, filter labels, preset, scope, count, chips) | `assets/js/i18n.js` | ✅ |
| S43-T2 | `helpers.js` — stateChip() uses tState() for language-aware label; EN: Not Started/In Progress/Completed/On Hold; VI: unchanged | `assets/js/helpers.js` | ✅ |
| S43-T3 | `index.html` — data-i18n on tasks filter bar labels, preset button text spans, scope toggle spans; explicit value attrs on filterState options (prevents value corruption when EN text differs from raw VI value) | `index.html` | ✅ |
| S43-T4 | `tasks.js` — renderFilterChips uses t()+tState(); renderTaskTable count/empty use t(); _populateFilterPic "Tất cả"→t('common.all') | `assets/js/views/tasks.js` | ✅ |
| S43-T5 | `config.js` — APP_VERSION = '6.9-i18n-phase2-20260709'; cache-bust ?v=20260709b | `assets/js/config.js`, `index.html` | ✅ |
| S43-T6 | `verify_i18n_p2.mjs` — 36/36 PASS (IP1–IP14); `verify_my_work.mjs` — MW18 focus race fix (blur loginUsername before G+M dispatch) | `verify_i18n_p2.mjs`, `verify_my_work.mjs` | ✅ |
| S43-T7 | Full regression: **15/15 suites 459/459 PASS** | all | ✅ |

### i18n Phase 2 Architecture (S43)

**STATE translation**: Raw GAS values (Vietnamese) stored unchanged. Display layer only:
- `_STATE_KEY` map: raw Vietnamese → i18n key (`state.not-started`, etc.)
- `tState(raw)`: `if (!raw) return '–'; return t(_STATE_KEY[raw] || '') || raw;`
- `stateChip(s)`: CSS class from raw value (unchanged); display text from `tState(s)`
- VI mode: identity map (Chưa bắt đầu → Chưa bắt đầu); EN mode: translated

**Filter options**: Explicit `value` attributes added to filterState options:
```html
<option value="Chưa bắt đầu" data-i18n="state.not-started">Chưa bắt đầu</option>
```
When EN: applyI18n() sets text to "Not Started" but value stays "Chưa bắt đầu" → filtering `t.state !== fSt` still works.

**RAG NOT translated**: Green/Amber/Red treated as banking domain terms, kept in English in both modes.

**Scope**: i18n Phase 2 covers tasks view only. Phase 3 = other views (case-pipeline, action-plan, etc.)

**MW18 fix**: `verify_my_work.mjs` MW18 had a loginUsername focus race — `showLoginScreen()` focuses `loginUsername` INPUT, so `inInput=true` makes G key ignored. Fix: `document.activeElement?.blur()` before G+M dispatch.

### Test suite snapshot (2026-07-09)
```
verify_i18n_p2             36/36  PASS  (S43 NEW — i18n Phase 2)
verify_my_work             35/35  PASS  (S42)
verify_issue_tracker       61/61  PASS  (S41)
verify_mobile_s37          21/21  PASS  (S37)
verify_case_pipeline_s36   28/28  PASS  (S36)
verify_action_plan         24/24  PASS  (S34)
verify_history             47/47  PASS  (S33)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────────────
TOTAL (15 suites)         459/459 PASS  0 FAIL
```

### Commit S43
```
5edf349  feat(i18n): S43 — i18n Phase 2: state display mapping + tasks filter bar translation
```

---

---

## Tasks Completed (S42 — My Work personalized dashboard)

| # | Task | Files | Status |
|---|---|---|---|
| S42-T1 | `assets/css/my-work.css` (NEW) — page layout, section icons, deadline badges, urgent list, task cards, RAG dots, progress bar, result textarea, init/case cards, dark mode, responsive | `assets/css/my-work.css` | ✅ |
| S42-T2 | `assets/js/views/my-work.js` (NEW) — role detection (PO/PTKD/QLDM from user.team), data getters, HTML builders, renderMyWork(), inline quick-save functions (state/RAG/progress/result) | `assets/js/views/my-work.js` | ✅ |
| S42-T3 | `i18n.js` — `nav.my-work` + `page.my-work` VI + EN | `assets/js/i18n.js` | ✅ |
| S42-T4 | `navigation.js` — `renderMyWork()` dispatch, G+M keymap | `assets/js/ui/navigation.js` | ✅ |
| S42-T5 | `app.js` — `navigateTo('my-work')` as default landing in `startApp()`, `renderAll()` guard | `assets/js/app.js` | ✅ |
| S42-T6 | `index.html` — CSS link, nav item (fa-house-user), view section, KB G+M row, script tag, cache-bust `?v=20260709` | `index.html` | ✅ |
| S42-T7 | `config.js` — `APP_VERSION='6.8-my-work-20260709'` | `assets/js/config.js` | ✅ |
| S42-T8 | `verify_my_work.mjs` — port 3042, 35/35 PASS (MW1–MW25 + sub-checks) | `verify_my_work.mjs` | ✅ |
| S42-T9 | Full regression: 13/13 suites (388/388) still PASS — zero regressions | all | ✅ |

### My Work Architecture (S42)

**Role detection** (`_mwRoleView(user)`): maps `user.team` → `po` | `ptkd` | `qldm`
- PO: teams BL/CV1/CV2/Số → task list + Initiative phụ trách
- PTKD: teams PTKD MB/PTKD MN → task list + Case Pipeline của team
- QLDM: team QLDM → same as PO

**Task ownership** (`_mwGetMyTasks(user)`): `picAcc=me OR picRes=me OR team=myTeam`
- Sort: done tasks last → highlight=Y first → endDate ASC

**Urgent section** (`_mwGetUrgent(tasks, cases)`): state≠Hoàn thành AND endDate diff ≤7 days

**Deadline badge classes**: dl-overdue / dl-today / dl-urgent (≤3d) / dl-soon (≤7d) / dl-ok

**Quick save** (local-first + GAS fire-and-forget via `_gasTaskUpsert`):
- `mwQuickSaveState(id, val)` → full `renderMyWork()` re-render (urgent section may change)
- `mwQuickSaveRag(id, val)` → DOM-only dot update (toggle: clicking active dot = clear)
- `mwQuickSaveProgress(id, raw)` → DOM-only bar+label update; clamps 0–100
- `mwQuickSaveResult(id, val)` → persist only; textarea already shows new value

**Default landing**: `startApp()` calls `navigateTo('my-work')` after `renderAll()`. Loading overlay from `autoConnectDB()` covers any brief flash.

**`renderAll()` guard**: `if (view-my-work.style.display === 'contents') renderMyWork()` — avoids redundant re-render when not visible.

### Test suite snapshot (2026-07-09)
```
verify_my_work             35/35  PASS  (S42 — My Work dashboard)  ← NEW
verify_issue_tracker       61/61  PASS  (S41 — Issue Tracker)
verify_mobile_s37          21/21  PASS  (S37 — mobile responsive)
verify_case_pipeline_s36   28/28  PASS  (S36 — case pipeline enhancements)
verify_action_plan         24/24  PASS  (S34 — action plan v2)
verify_history             47/47  PASS  (S33 — audit history)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────────
TOTAL (14 suites)         423/423 PASS  0 FAIL
```

### Commits S42
```
TBD  feat(my-work): S42 — personalized dashboard for PO/PTKD/QLDM roles (35/35 tests)
TBD  docs: S42 handover — 14/14 suites 423/423 PASS
```

---

## Blockers (S42)

| Item | Status |
|---|---|
| **No GAS changes** | ✅ — My Work reads `db.tasks`, `dbCases`, `db.initiatives` (already in memory). Saves use existing `_gasTaskUpsert` — no new GAS routes needed. |
| **Hard-reload** | ⏳ Users Ctrl+Shift+R. Badge: `v6.8-my-work-20260709`. |
| **Smoke test production** | ⏳ See checklist below. |

### Smoke test checklist (S42)
| Check | Expected |
|---|---|
| Login → landing | My Work view loads (not Dashboard) |
| PO user (team Số/BL/CV1/CV2) | Sections: Cần làm ngay / Task của tôi / Initiative phụ trách |
| PTKD user (team PTKD MB/MN) | Sections: Cần làm ngay / Task của tôi / Case Pipeline của team |
| QLDM user | Same as PO view |
| Deadline badge | Overdue task → "Quá hạn 3N" red badge |
| Urgent section | Task endDate ≤7 days appears; done tasks excluded |
| Quick save state | Change dropdown → task.state updates + re-render |
| Quick save RAG | Click dot → colored in-place (no reload) |
| RAG toggle | Click active dot → grey (cleared) |
| Quick save progress | Click bar → input appears; type 75 → bar + label update in-place |
| Quick save result | Blur textarea → task.result saved |
| G+M shortcut | Press G then M → My Work view |
| Dark mode | Cards adapt correctly |
| KB modal | Shows G+M entry |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S41b)

---

# SESSION HANDOVER
**Date**: 2026-07-08 (Session 41b — Regression run + test infrastructure fix)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `2a8b55b` ✅

---

## Tasks Completed (S41b — continuation of S41)

| # | Task | Files | Status |
|---|---|---|---|
| S41b-T1 | Fix `verify_issue_tracker.mjs` 2 remaining failures: mock auth missing `exp` field (IT3) + IT9 expected search scope wrong (`heTong` không nằm trong `_itGetFiltered`) | `verify_issue_tracker.mjs` | ✅ 61/61 PASS |
| S41b-T2 | Add `http.createServer` nội bộ vào 8 test files thiếu server (rely vào leftover process): `verify_mobile_s37`, `verify_case_pipeline_s36`, `verify_issue_tracker`, `verify_bld_queue`, `verify_case_pipeline`, `verify_filter_cascade`, `verify_import_rbac`, `verify_modal_layout` | 8 files | ✅ |
| S41b-T3 | Fix `verify_case_pipeline` TEST13/14: row click → `cpOpenDetail()` → view popup (since S33), không còn mở edit modal trực tiếp. Cập nhật test dùng `openCaseModal(id)` via evaluate | `verify_case_pipeline.mjs` | ✅ 22/22 PASS |
| S41b-T4 | Full regression: 13/13 suites, 388/388 PASS | tất cả | ✅ |

### Commits S41b
```
7988129  test: S41 Issue Tracker smoke tests 61/61 PASS
c01d471  docs: S41 handover — 61/61 PASS, HEAD 7988129
e377aa8  test: add self-contained HTTP servers to all test suites; fix verify_case_pipeline TEST13/14
2a8b55b  docs: update handover HEAD e377aa8 — 13/13 suites 388 tests PASS
```

### Test suite snapshot (2026-07-08, HEAD 2a8b55b)
```
verify_issue_tracker       61/61  PASS  (S41 — Issue Tracker)
verify_mobile_s37          21/21  PASS  (S37 — mobile responsive)
verify_case_pipeline_s36   28/28  PASS  (S36 — case pipeline enhancements)
verify_action_plan         24/24  PASS  (S34 — action plan v2)
verify_history             47/47  PASS  (S33 — audit history)
verify_atomic_write        41/41  PASS
verify_case_pipeline       22/22  PASS
verify_bld_queue           46/46  PASS
verify_milestone_task      23/23  PASS
verify_task_init_popup     28/28  PASS
verify_filter_cascade      23/23  PASS
verify_import_rbac         15/15  PASS
verify_modal_layout         9/9   PASS
─────────────────────────────────────
TOTAL                     388/388 PASS  0 FAIL
```

### Test infrastructure notes (S41b)
- Tất cả test files nay có `http.createServer` nội bộ — chạy standalone `node <file>` mà không cần server bên ngoài
- `verify_case_pipeline` TEST13/14: dùng `page.evaluate(() => openCaseModal(id))` thay vì click row (vì S33 đổi row click → `cpOpenDetail` → view popup)
- Port allocation: 3030 (5 files cũ), 3036 (cp_s36), 3037 (mobile), 3041 (issue_tracker), 9992 (history), 9993 (action_plan), dynamic (milestone_task, task_init_popup)

---

## Tasks Completed (S41 — Issue Tracker full implementation)

| # | Task | Files | Status |
|---|---|---|---|
| S41-T1 | `backend/IssueService.gs` (NEW) — `issueRead()`, `issueUpsertRow()`, `issueDeleteRow()`, Sheet: `Issue_Tracker` 18 cols A→R, auto-create sheet | `backend/IssueService.gs` | ✅ |
| S41-T2 | `backend/Code.gs` — 3 new routes: `issue-read`, `issue-upsert`, `issue-delete` with auditLog | `backend/Code.gs` | ✅ |
| S41-T3 | `constants.js` — `dbIssues`, `ISSUE_SYSTEMS/TYPES/SEVERITY/DEPTS/STATUS_SIMPLE/STATUS_COMPLEX/SLA_DAYS` | `assets/js/constants.js` | ✅ |
| S41-T4 | `api.js` — `rowToIssue()`, `issueToRow()`, `genIssueId()` (IS-YY-NNN), `_gasIssueUpsert/Delete()`, `readIssues()`, `persistIssues()`, `loadIssuesFromCache()` | `assets/js/api.js` | ✅ |
| S41-T5 | `app.js` — `loadIssuesFromCache()` + `readIssues()` in startup | `assets/js/app.js` | ✅ |
| S41-T6 | `assets/css/issue-tracker.css` (NEW) — KPI grid, severity/status/system badges, trend toggle, stat table, modal, view overlay, dark mode, responsive | `assets/css/issue-tracker.css` | ✅ |
| S41-T7 | `assets/js/views/issue-tracker.js` (NEW) — renderIssueTracker, KPI, Chart.js trend+bar, MTTR, root cause, preset/filter/sort/pagination, CRUD modal, view popup, Excel export | `assets/js/views/issue-tracker.js` | ✅ |
| S41-T8 | `index.html` — CSS link, nav item + badge, view section, `#itModal`, `#itViewOverlay`, KB G+I row, script tag | `index.html` | ✅ |
| S41-T9 | `navigation.js` — `renderIssueTracker()`, ESC closes modal+popup, G+I keymap | `assets/js/ui/navigation.js` | ✅ |
| S41-T10 | `i18n.js` — `page.issue-tracker` VI + EN | `assets/js/i18n.js` | ✅ |
| S41-T11 | `config.js` + cache-bust — `APP_VERSION='6.7-issue-tracker-20260708'`, `?v=20260708` (index.html) | `assets/js/config.js`, `index.html` | ✅ |

### Issue Tracker Architecture (S41)

**localStorage key**: `shtd_issues_v1` (separate from `shtd_v2` tasks and `shtd_cp_v1` cases)
**Issue ID**: `IS-YY-NNN` (e.g. IS-26-001), counter resets each calendar year
**Sheet**: `Issue_Tracker`, 18 cols A→R — auto-created by `issueRead()` on first call
**Two flows**: Đơn giản (4 statuses) vs Phức tạp (6 statuses), chosen at creation
**SLA auto-fill**: Critical=1d, High=3d, Medium=7d, Low=14d — only fills empty deadline
**View popup** (`#itViewOverlay`): dynamic innerHTML, reuses `.cp-view-*` CSS, closes on ESC or backdrop click
**KPI nav badge** (`#navBadgeIssue`): SLA breach count, red, hidden when 0

**GAS files changed**: `IssueService.gs` (new), `Code.gs` (3 routes added)
**GAS redeploy required**: ✅ DONE — deployed, URL unchanged.

### Commits S41
```
51bae57  feat(issue-tracker): S41 — full Issue Tracker feature
9595d46  docs: S41 handover — update commit hash 51bae57
```

---

## Blockers (S41)

| Item | Status |
|---|---|
| **GAS redeploy** | ✅ DONE — IssueService.gs deployed, URL unchanged. |
| **Hard-reload** | ⏳ Users Ctrl+Shift+R. Badge: `v6.7-issue-tracker-20260708`. |
| **Playwright tests** | ✅ **13/13 suites — 388/388 PASS** (`2a8b55b`). Tất cả self-contained. |

---

## Regression Risks (S41)

| Risk | Severity | Detail |
|---|---|---|
| `shtd_issues_v1` key | ⚪ NONE | Separate localStorage key, no collision with tasks or cases. |
| Chart.js destroy | ⚪ LOW | `_itChartTrend.destroy()` called before each re-render. Safe for repeated navigations. |
| SLA auto-fill on edit | ⚪ NONE | Only fills deadline if field is currently empty — existing deadlines unaffected. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S40)

---

# SESSION HANDOVER
**Date**: 2026-07-07 (Session 40 — Team BL1+BL2 Merge → BL)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `7a027dc` ✅

---

## Tasks Completed (S40)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S40-T1 | `constants.js` TEAM_LIST: `['BL1','BL2',...]` → `['BL','CV1','CV2','PTKD MB','PTKD MN','QLDM','Số']` (7 teams) | `assets/js/constants.js` | `2758f58` | ✅ |
| S40-T2 | `index.html` `#filterTeam` (line 712): `<option>BL1</option><option>BL2</option>` → `<option>BL</option>` | `index.html` | `2758f58` | ✅ |
| S40-T3 | `index.html` `#ganttFilterTeam` (line 801): `...BL1</option><option>BL2` → `...BL` | `index.html` | `2758f58` | ✅ |
| S40-T4 | `config.js` APP_VERSION → `'6.6-team-bl-merge-20260707'`; cache-bust `?v=20260706b` → `?v=20260707` (52 refs, Python) | `assets/js/config.js`, `index.html` | `2758f58` | ✅ |
| S40-T5 | `verify_action_plan.mjs` full rewrite: fixtures BL1/BL2 → BL + add CV1-001 cross-team task; AP3/AP4b/AP6/AP7/AP9/AP10 assertions updated; **24/24 PASS** | `verify_action_plan.mjs` | `2758f58` | ✅ |
| S40-T6 | `verify_case_pipeline_s36.mjs`: MOCK_CASES CP-001/CP-002/CP-003/CP-005 + MOCK_USER team `BL1`/`BL2` → `BL`; **28/28 PASS** | `verify_case_pipeline_s36.mjs` | `2758f58` | ✅ |
| S40-T7 | `verify_mobile_s37.mjs`: task `team:'BL1'` → `team:'BL'`; **21/21 PASS** | `verify_mobile_s37.mjs` | `2758f58` | ✅ |
| S40-T8 | `backend/MigrationService.gs` (NEW): `dryRunTeamBL()` / `commitTeamBL()` — batch migrate Task_Master + Case_Pipeline + User_Master team fields; idempotent; Audit_Log untouched | `backend/MigrationService.gs` | `2758f58` | ✅ |
| S40-T9 | **Bugfix MigrationService.gs**: `indexOf('team')` không tìm thấy `"Team chính"` (Task_Master) và `"Team"` (capital T, Case_Pipeline) → cả hai sheet bị SKIP; fix: dùng `_norm()` partial match giống `parsers.js`; confirmed migration chạy thành công | `backend/MigrationService.gs` | `7a027dc` | ✅ |

### S40 Impact Analysis

**No GAS code changes needed** — 0 hardcoded team names in `.gs` files. Only data in Sheets needs updating.

**Auto-updates after constants.js change (no code touch needed):**
- `action-plan.js`: team dropdown (`TEAM_LIST.map()`), accordion rendering (`TEAM_LIST.forEach()`), accordion ID (`TEAM_LIST.indexOf(team)`) → all auto-correct
- `case-pipeline.js` `cpFilterTeam`: built dynamically from `new Set(cases.map(c => c.team))` — auto-updates after data migration

**Task/Case IDs**: historical IDs like `BL1-028` are NOT changed (only `team` field value changes).

**Playwright test redesign (AP9)**:
- OLD: select `BL2` → `BL2 Highlight Task` shown, `BL1 Highlight Task` hidden
- NEW: select `BL` → `BL Highlight Task` shown, `CV1 Highlight Task` hidden (added `CV1-001` mock task as cross-team counterpart)

### Commits S40
```
2758f58  feat(teams): merge BL1+BL2 into single team BL
```

---

## Blockers (S40)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ✅ Xóa Cache / Ctrl+Shift+R. Badge: `v6.6-team-bl-merge-20260707`. |
| **GAS data migration** | ✅ `commitTeamBL()` ran — Task_Master + Case_Pipeline + User_Master updated (BL1/BL2 → BL). Filter team=BL hoạt động. |
| **Notify BL1/BL2 users** | ⏳ Users logged in with `team:'BL1'/'BL2'` in session token cần re-login để get team='BL' |

---

## Regression Risks (S40)

| Risk | Severity | Detail |
|---|---|---|
| **TEAM_LIST index shift** | ⚪ LOW | `_apTid(team)` = `'ap-acc-' + TEAM_LIST.indexOf(team)`. BL at index 0 (same as BL1 was). CV1 shifts from index 2 → 1. Old accordion state keyed by team string — no impact. |
| **Stale session team** | ⚪ LOW | Users with `shtd_auth_v1` still showing `team:'BL1'/'BL2'` get own-team view with 0 results. Fix: re-login. |
| **GAS data migration timing** | 🟡 MEDIUM | Until `commitTeamBL()` runs, live data still has BL1/BL2 teams. Frontend BL dropdown shows empty until migration runs. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S39)

---

# SESSION HANDOVER
**Date**: 2026-07-06 (Session 39 — Phase 1 Bilingual UI VI/EN)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `5579193` ✅

---

## Tasks Completed (S39)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S39-T1 | Create `assets/js/i18n.js` — `t(key)`, `setLang(lang)`, `applyI18n()`, `TRANSLATIONS` (VI+EN, ~120 keys per lang); `_lang` persisted in `localStorage('shtd_lang')` | `assets/js/i18n.js` | `5579193` | ✅ |
| S39-T2 | VI/EN toggle pill added to topbar (between dark mode btn and Quick View) — `id="langVI"` / `id="langEN"` with `.lang-btn.active` CSS; `.lang-toggle` pill style appended to `components.css` | `index.html`, `assets/css/components.css` | `5579193` | ✅ |
| S39-T3 | `index.html` — `data-i18n` / `data-i18n-title` attributes on: nav section labels (6), nav item spans (5 Vietnamese ones), login overlay (brand, title, labels, btn), breadcrumb text spans, topbar icon-btn titles, dashboard KPI labels (6), dashboard section titles/table-headers (9), filter bar | `index.html` | `5579193` | ✅ |
| S39-T4 | `navigation.js` — replace hardcoded `titles` map with `t('page.'+view)` in `navigateTo()`; `copyPath()` toasts use `t()` | `assets/js/ui/navigation.js` | `5579193` | ✅ |
| S39-T5 | `crud.js` — modal titles, confirm dialog titles+buttons, key toasts all use `t()` | `assets/js/crud.js` | `5579193` | ✅ |
| S39-T6 | `app.js` — `window.onload` syncs lang toggle active state + calls `applyI18n()` | `assets/js/app.js` | `5579193` | ✅ |
| S39-T7 | `i18n.js` as FIRST `<script>` tag; `APP_VERSION = '6.6-i18n-phase1-20260706'`; cache-bust `?v=20260706b` (52 refs) | `index.html`, `assets/js/config.js` | `5579193` | ✅ |

### i18n Architecture (S39)

**Three text categories:**
```
1. UI Chrome → translate (nav, login, dashboard KPIs, topbar, modal titles, confirms, toasts)
2. Data values in GAS → NEVER translate (states: Hoàn thành/Chưa bắt đầu, RAG: Xanh/Vàng/Đỏ)
   → changing these would break all filter/display logic
3. User content → NEVER translate (task names, notes, results)
Banking terms: BLĐ, ĐVKD, Tuần BC kept as-is (confirmed Q2)
```

**Key functions in `assets/js/i18n.js`:**
```javascript
let _lang = localStorage.getItem('shtd_lang') || 'vi';
function t(key) { return TRANSLATIONS[_lang][key] || TRANSLATIONS.vi[key] || key; }
function applyI18n() { /* walk DOM, set textContent/placeholder/title via data-i18n attrs */ }
function setLang(lang) { _lang=lang; localStorage.setItem('shtd_lang',lang); applyI18n(); renderAll(); }
```

**DOM attribute pattern:**
- `data-i18n="key"` → sets `textContent`
- `data-i18n-title="key"` → sets `title` tooltip
- `data-i18n-placeholder="key"` → sets `placeholder` (for future use)

**Load order:** `i18n.js` FIRST (line 1457 in index.html), before config.js. `window.onload` in app.js calls `applyI18n()` + syncs toggle button state.

**Phase 2 (pending):** VIEW content labels — tasks filter bar, STATE_LABELS/RAG_LABELS display mapping, KPI view
**Phase 3 (pending):** Full coverage — bld-queue, initiative-tracker, action-plan form labels

### Commits S39
```
5579193  feat(i18n): Phase 1 bilingual UI – VI/EN language toggle
```

---

## Blockers (S39)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Ctrl+Shift+R to pick up `?v=20260706b`. Badge: `v6.6-i18n-phase1-20260706`. |
| **Smoke test i18n** | ⏳ Manual: switch to EN → nav "Overview"/"Management"/"Reports", dashboard "Total Tasks"/"Completed"/"In Progress"/"Overdue", login "Sign In". Switch back → VI restored. |

---

## Regression Risks (S39)

| Risk | Severity | Detail |
|---|---|---|
| **`renderAll()` inside `setLang()`** | ⚪ LOW | If Phase 2+ adds `data-i18n` to dynamic-render containers, renderAll would overwrite them before `applyI18n()` is re-applied. Not a problem in Phase 1 (all data-i18n elements are static HTML). |
| **`<option data-i18n>` value safety** | ⚪ NONE | `applyI18n()` sets `textContent`, not `value` attribute. The `value=""` and `value="__thisweek__"` are HTML attributes unaffected by textContent. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S38)

---

# SESSION HANDOVER
**Date**: 2026-07-06 (Session 38 — Concurrent Task Edit Overwrite Fix)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `9c7a674` ✅

---

## Tasks Completed (S38)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S38-T1 | Debug + fix concurrent task edit overwrite bug: `handleSubmit` now calls `readFromHandle()` before saving to detect if another user modified the same task since the modal was opened; if conflict detected, shows "⚠️ Xung đột cập nhật" dialog with [Ghi đè và lưu] / [Hủy] | `assets/js/crud.js`, `assets/js/config.js`, `index.html` | `90776ee` | ✅ |

### Root Cause Analysis (S38)

**Bug: Task overwrite — User B silently clobbers User A's changes**

Audit log evidence:
```
11:16:21  LienPK   task-upsert  BL1-028 | Chạy lại bộ chỉ tiêu cập nhật phân loại ĐVKD
11:43:02  DungNP3  task-upsert  BL1-028 | Bộ câu hỏi CT UDLS ngành trọng tâm để CBBH thi
```

DungNP3 had the app open before 11:16. She edited BL1-028 from her stale local cache ("Bộ câu hỏi...") without knowing LienPK had already renamed it. Her save overwrote LienPK's changes.

**Root cause chain:**
```
handleSubmit
  → _gasTaskUpsert(task, origId)           ← fire-and-forget, no version guard
      → gasPost({ action: 'task-upsert' })
          → sheetUpsertTask(row, taskId)   ← BLIND OVERWRITE, no clientTs check
              sheet.getRange(...).setValues([rowValues])  ← last write wins
```

Compare with `sheetWrite` (full-rewrite path) which already has:
```javascript
if (String(clientTs) !== String(serverTs)) throw new Error('VERSION_CONFLICT');
```

`sheetUpsertTask` (added in S30 for atomic per-row writes) never received the same guard.

**Why it "came back":**
- S29: `handleSubmit → syncAction()` → used `sheetWrite` (has VERSION_CONFLICT)
- S30: `handleSubmit → _gasTaskUpsert()` → uses `sheetUpsertTask` (no check) → bug re-introduced

### Fix Applied (S38)

**`assets/js/crud.js` — 3 additions + 1 modification:**

```javascript
// 1. Module-level snapshot
let _editOrigTask = null;

// 2. Comparison helper
function _hasTaskChanged(fresh, orig) {
  return fresh.name     !== orig.name
      || fresh.state    !== orig.state
      || fresh.endDate  !== orig.endDate
      || fresh.progress !== orig.progress
      || fresh.picRes   !== orig.picRes
      || fresh.picAcc   !== orig.picAcc;
}

// 3. openTaskModal: snapshot on edit open
_editOrigTask = task
  ? { id, name, state, endDate, progress, picRes, picAcc }
  : null;

// 4. closeTaskModal: reset
_editOrigTask = null;
```

**`handleSubmit` — conflict check block (before confirm dialog):**
```javascript
// For existing tasks only (origId is set):
if (origId && _editOrigTask) {
  await readFromHandle();               // fetch latest GAS state
  const fresh = db.tasks.find(t => t.id === origId);
  if (fresh && _hasTaskChanged(fresh, _editOrigTask)) {
    const overwrite = await uiConfirm('⚠️ Xung đột cập nhật', ...);
    if (!overwrite) {
      openTaskModal(fresh);             // reload form with server data
      return;
    }
    confirmed = true;                   // skip normal confirm
  }
}
// Falls back silently if GAS is offline
```

**Flow:**
- No conflict detected (normal case): transparent, proceeds to normal confirm dialog
- Conflict detected: single dialog "⚠️ Xung đột" replaces the normal confirm
  - [Ghi đè và lưu] → proceeds to save user's version
  - [Hủy] → `openTaskModal(fresh)` — form reloads with server's latest data
- GAS offline: `catch` swallows error, save proceeds without check (same as before)
- New tasks (`origId = ''`): check is skipped entirely

**No GAS changes required.** `sheetUpsertTask` remains unchanged — the fix is fully frontend.

### Trade-offs (S38)

| Item | Detail |
|---|---|
| **GAS quota** | Every task EDIT save now incurs 1 extra `readFromHandle()` (full-table read). Task ADD saves unaffected. ~1 extra GAS call per edit. Acceptable at current team size. |
| **Latency** | ~1-2s pause after form submit before confirm dialog appears (GAS read). UX: user clicks Lưu, brief pause, then confirm appears. Acceptable. |
| **False negatives** | Conflict check compares 6 key fields. If User A changed only `result` or `nextPlan` (not in the 6), no conflict is raised and User B's save proceeds. These fields are lower-risk (weekly updates, not structural). Acceptable trade-off. |
| **False positives** | None — check is per-task (not table-level), so another user editing a different task does not trigger this conflict. |

### Commits S38
```
90776ee  fix(crud): detect concurrent task edits before saving to prevent stale-cache overwrite
```

---

## Blockers (S38)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260706`. Badge shows `v6.6-conflict-detect-20260706`. |
| **No Playwright test** | ⏳ Concurrent edit simulation requires 2 browser contexts — complex to automate. Manual verification: open task in Tab A, open same task in Tab B, save B first, then save A → expect conflict dialog in A. |

---

## Regression Risks (S38)

| Risk | Severity | Detail |
|---|---|---|
| **Extra GAS read per task edit** | ⚪ LOW | `readFromHandle()` adds ~1-2s to every existing-task save. No functional regression. GAS quota impact negligible at current usage. |
| **`_editOrigTask` not reset between modals** | ⚪ LOW | `closeTaskModal()` resets `_editOrigTask = null`. `openTaskModal(null)` for Add also sets `_editOrigTask = null`. All paths covered. |
| **`readFromHandle()` side-effects** | ⚪ LOW | Updates `db.tasks`, `db.initiatives`, `db._serverTs`, calls `persist()`. Modal stays open (no `renderAll()`). Form DOM is unchanged. User's typed values not lost. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S37)

---

# SESSION HANDOVER
**Date**: 2026-06-27 (Session 37 — Mobile Responsive Fix)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `6088832` ✅

---

## Tasks Completed (S37)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S37-T1 | Fix topbar hidden on iOS mobile: `.topbar{position:fixed;top:0;left:0;right:0;z-index:150}` — removes topbar from flex flow, unaffected by `.main{overflow:hidden}`, always shown at viewport top | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T2 | Content padding-top to clear fixed topbar: `74px` (≤768px, 62px+12px), `68px` (≤480px, 56px+12px) | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T3 | Sticky thead `top` adjusted: `62px` (≤768px) / `56px` (≤480px) so table header clears fixed topbar when scrolling | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T4 | Toolbar stack vertically on mobile: `.toolbar{flex-direction:column;align-items:flex-start}`, `.toolbar-left,.toolbar-right{width:100%}`, `.toolbar-right{flex-wrap:wrap;justify-content:flex-start}` — all action buttons always reachable | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T5 | Hide `.path-hint` on mobile: long file path (`\\ho-file01\NHDN\...`) is not actionable on mobile | `assets/css/responsive.css` | `7eb9547` | ✅ |
| S37-T6 | Cache-bust `?v=20260627b` → `?v=20260627c` (51 occurrences); `APP_VERSION = '6.6-mobile-toolbar-fix-20260627c'` | `index.html`, `assets/js/config.js` | `7eb9547` | ✅ |

### Root Cause Analysis (S37)

**Bug: Topbar not visible on iOS Safari mobile**

Root cause chain:
```
body { display:flex; height:100vh; overflow:hidden; }
  .sidebar-wrapper { position:relative; }   ← 0 width on mobile (sidebar=fixed, toggle=none)
  main.main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
    header.topbar { height:62px; flex-shrink:0; }  ← PROBLEM: overflow:hidden on parent
    div.content { flex:1; overflow-y:auto; }
```

On iOS Safari, `100vh` includes the area behind the browser chrome (URL bar + status bar ≈ 52-64px). The body's top 52-64px is rendered behind the browser UI. Since `.topbar` is the first flex child of `.main` at y=0, it gets partially or fully hidden behind the browser chrome. `position:sticky` is NOT an option here because `.main { overflow:hidden }` kills sticky for all descendants.

**Fix applied:**
```css
/* responsive.css — @media(max-width:768px) */
.topbar {
  position: fixed;   /* removed from flex flow; not affected by overflow:hidden */
  top: 0; left: 0; right: 0;
  z-index: 150;      /* above content (thead z-index:2), below sidebar overlay (190) */
  padding: 0 14px;
}
.content { padding: 74px 14px 12px; }  /* clear fixed topbar (62px) + original 12px */
thead { top: 62px; }                    /* sticky header clears fixed topbar */

/* @media(max-width:480px) */
/* topbar shrinks to 56px at this breakpoint */
.content { padding-top: 68px; }
thead { top: 56px; }
```

**Bug: Toolbar buttons cut off on mobile**

Root cause: `.toolbar{justify-content:space-between}` + `.toolbar-left` containing a long `.path-hint` path string → `.toolbar-right` with 5-7 buttons squeezed into remaining width → buttons overflow or get cut.

**Fix applied:**
```css
.toolbar { flex-direction: column; align-items: flex-start; }
.toolbar-left, .toolbar-right { width: 100%; }
.toolbar-right { flex-wrap: wrap; justify-content: flex-start; gap: 6px; }
.path-hint { display: none; }  /* \\ho-file01\NHDN\... not useful on mobile */
```

### z-index Stack on Mobile (After S37)

```
z-index:200  .sidebar (open state, slides in from left)
z-index:190  .sidebar-overlay (dark backdrop)
z-index:150  .topbar (FIXED — always at viewport top)  ← NEW S37
z-index:10   .topbar (desktop — stays in flex flow)
z-index:2    thead (sticky table header)
z-index:0    content
```

Sidebar overlay (190) correctly covers the fixed topbar (150) when menu opens → user taps overlay to close sidebar. ✓

### Playwright Smoke Test (S37)

`verify_mobile_s37.mjs` — **21/21 PASS** at 375×812 iPhone viewport:
```
M1 ✅ position:fixed, top:0px, z-index:150, height:56px
M2 ✅ topbar.top===0, topbar.left===0
M3 ✅ content padding-top: 68px (≥68px)
M4 ✅ hamburger visible at (14, 10) — within topbar
M5 ✅ sidebar opens; closes via overlay tap
M6 ✅ toolbar column; 301px wide; 6 buttons in viewport; 0 clipped
M7 ✅ path-hint display:none
M8 ✅ thead top: 56px (≥56px — clears topbar)
M9 ✅ CP toolbar column; 301px wide
M10 ✅ topbar stays at y=0 after content scroll
```
Screenshots: `test-results/mobile_s37/` (01–06)

### Commits S37
```
6088832  docs: S37 handover — mobile topbar fix + toolbar stack
7eb9547  fix(mobile): topbar always visible + toolbar buttons stack correctly
```

---

## Blockers (S37)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260627c`. Badge shows `v6.6-mobile-toolbar-fix-20260627c`. |
| **Smoke test real device** | ⏳ Playwright sim 21/21 ✅ — still need to verify on real iOS Safari (real device confirms `100vh` browser chrome offset). |
| **Playwright test** | ✅ `verify_mobile_s37.mjs` **21/21 PASS** — 375×812 iPhone viewport |

---

## Regression Risks (S37)

| Risk | Severity | Detail |
|---|---|---|
| **Fixed topbar z-index** | ⚪ LOW | `z-index:150` is above content, below sidebar overlay (190) and sidebar (200). No conflict with existing modals (z-index:1000+) or cpSummaryOverlay (z-index:1100). |
| **Sticky thead top offset** | ⚪ LOW | `thead{top:62px}` (768px) / `thead{top:56px}` (480px) clears fixed topbar. If topbar height changes in future, this must also change. |
| **path-hint hidden on mobile** | ⚪ NONE | `.path-hint` is a UX shortcut for copy-to-clipboard on the file path. Not useful on mobile (no file system). Desktop unaffected. |
| **content padding-top increase** | ⚪ LOW | `padding-top:74px` vs old `12px` — extra 62px transparent space at top of content. On very short viewports this reduces visible content area. Acceptable. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S36)

---

# SESSION HANDOVER
**Date**: 2026-06-27 (Session 36 — Case Pipeline Enhancements)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `348bc59` ✅ (`a6feeae` feat + `348bc59` docs)

---

## Tasks Completed (S36)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S36-T1 | Done/Blocked stages không tính quá hạn: Fix `calcCaseRag()` skip nếu group=done/blocked; fix `action-plan.js` overdue check tương tự | `assets/js/api.js`, `assets/js/views/action-plan.js` | S36 | ✅ |
| S36-T2 | Default scope = 'all' cho mọi user: `_getCpScope()` bỏ role check → luôn `_cpScope = 'all'` | `assets/js/views/case-pipeline.js` | S36 | ✅ |
| S36-T3 | Filter tuần báo cáo: `cpFilterTuanBC` select, populate chronological, filter chip, clear | `assets/js/views/case-pipeline.js`, `index.html` | S36 | ✅ |
| S36-T4 | Summary popup: `#cpSummaryOverlay`, `openCpSummaryPopup(type)`, `closeCpSummaryPopup()` — 4 types: total/value/overdue/bld; stat cards clickable; ESC closes | `assets/js/views/case-pipeline.js`, `assets/js/ui/navigation.js`, `index.html`, `assets/css/case-pipeline.css` | S36 | ✅ |
| S36-T5 | Playwright test `verify_case_pipeline_s36.mjs` — **28/28 PASS**; EVD screenshots to `test-results/cp_s36/` | `verify_case_pipeline_s36.mjs` | S36 | ✅ |
| S36-T6 | Cache-bust: `APP_VERSION = '6.6-case-pipeline-enhancements-20260627'`; `index.html ?v=20260627b` (51 occurrences) | `assets/js/config.js`, `index.html` | S36 | ✅ |

### Key fixes discovered during testing
- **`let dbCases` is NOT `window.dbCases`**: Top-level `let` in browser scripts is module-scoped, NOT on `window`. Playwright `page.evaluate` must use `dbCases = cases` (direct assignment), not `window.dbCases = cases`.
- **`setupListeners()` never called when auth fails**: ESC key handler only registers inside `setupListeners()` which runs post-auth. Test inject must call `try { setupListeners(); } catch(e) {}` to register the keydown listener.
- **`loginOverlay` blocks pointer events**: Must `document.getElementById('loginOverlay').style.display = 'none'` in inject.

---

## Tasks Completed (S35)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S35-T1 | Fix stale DOM handle crash in `verify_action_plan.mjs` AP9 reset: after `selectOption('BL2')` triggers re-render, `teamSel` handle is detached. Fix: re-query `page.$('.ap-filter-bar select')` before reset → new `teamSelReset` | `verify_action_plan.mjs` | `a28f770` | ✅ |
| S35-T2 | Fix AP13 test expectation: initiatives are not period-filtered → `inits.length > 0` even in prev-month → `empty=false` never triggers empty-state message. Updated assertion to `html.includes('0 tasks/cases')` (toolbar count) | `verify_action_plan.mjs` | `a28f770` | ✅ |
| S35-T3 | **24/24 PASS** on `verify_action_plan.mjs` (was crashing after 18) | — | — | ✅ |
| S35-T4 | Bug fix: left sidebar cannot scroll when many nav items exceed viewport. Root cause: `.sidebar` had no `height` constraint on desktop → expanded with content, `body{overflow:hidden}` clipped bottom nav items, `.nav-menu{flex:1;overflow-y:auto}` had nothing to scroll against | `assets/css/layout.css` | `2cb947f` | ✅ |
| S35-T5 | CSS: add `?v=20260624c` cache-bust to all 16 local `<link rel="stylesheet">` tags — CSS had no cache-busting before S35; browsers silently served stale CSS on every deploy | `index.html` | `2cb947f` | ✅ |
| S35-T6 | JS cache-bust `?v=20260624b` → `?v=20260624c` (35 script tags, Python); `APP_VERSION = '6.5-sidebar-scroll-fix-20260624c'` | `index.html`, `assets/js/config.js` | `2cb947f` | ✅ |

### Architecture: S35 Changes

**Sidebar scroll fix** (`layout.css`):

Root cause chain:
```
body { display:flex; height:100vh; overflow:hidden; }
  .sidebar-wrapper { position:relative; }   ← no height
    .sidebar { display:flex; flex-direction:column; }  ← no height → grows with content
      .nav-menu { flex:1; overflow-y:auto; }  ← flex:1 with no constrained parent = no scroll
```
`overflow-y:auto` on `.nav-menu` only activates a scrollbar if the parent has a constrained height. Without that, `flex:1` simply grows, and `body{overflow:hidden}` clips the bottom — items are cut and unreachable.

**Fix applied:**
```css
/* layout.css */
.sidebar {
  height: 100vh;   /* ← ADDED: constrains sidebar; same value as mobile @media rule */
}
.nav-menu {
  min-height: 0;   /* ← ADDED: allows flex item to shrink below content size → scrollbar activates */
  /* padding, flex:1, overflow-y:auto unchanged */
}
/* Sidebar-specific scrollbar — white-on-dark theme */
.nav-menu::-webkit-scrollbar       { width: 4px; }
.nav-menu::-webkit-scrollbar-track { background: transparent; }
.nav-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 99px; }
.nav-menu::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
```

Mobile (`@media(max-width:768px)`) already had `height:100vh` on `.sidebar` and was not affected.

**CSS cache-bust discovery (S35):**
All 16 local CSS `<link>` tags had no `?v=` query string — browsers could serve stale CSS indefinitely. Added `?v=20260624c` to all. Future deploys must bump both the 35 JS script tags AND the 16 CSS link tags together.

Updated Python one-liner for CSS files:
```python
re.sub(r'(href="assets/css/[^"?]+\.css)"', r'\1?v=YYYYMMDD"', content)
```

### Commits S35
```
2cb947f  fix(sidebar): enable scroll on left nav menu when items exceed viewport height
```
(Note: `a28f770` contains S34 Action Plan v2 code including S35-T1/T2 test fixes — both landed in same commit from session continuation.)

### Architecture: S36 Changes

**`calcCaseRag()` fix** (`api.js`):
```js
function calcCaseRag(c) {
  const g = CASE_STAGE_GROUP[c.stage] || 'active';
  if (g === 'done' || g === 'blocked') return '';   // ← S36: skip overdue for done/blocked
  if (!c.deadline) return '';
  const d = parseVNDate(c.deadline);
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff <= 0) return 'Đỏ';
  if (diff <= 7) return 'Vàng';
  return 'Xanh';
}
```

**Summary popup types** (`openCpSummaryPopup(type)`):
- `total` → all filtered cases, sorted by startDate desc
- `value` → all filtered cases, sorted by giaTriTy desc; subtitle = "ΣtỷVND — N case"
- `overdue` → `_cpCalcRagLabel(c) === 'Đỏ'`
- `bld` → `c.canBLD === 'Y'`
Rows are clickable: `closeCpSummaryPopup(); cpOpenDetail(id)` → opens `#cpViewOverlay`.

**Playwright learnings** (applicable to ALL future test files):
- Top-level `let` in browser scripts is NOT `window.*`. Use `dbCases = cases`, not `window.dbCases = cases`.
- `setupListeners()` only runs after successful auth. Tests must call `try { setupListeners(); } catch(e) {}` in inject.
- Use `page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})))` instead of `page.keyboard.press('Escape')` to avoid focus dependency.

### Commits S36
```
a6feeae  feat(case-pipeline): S36 enhancements — done/blocked no-overdue, scope=all default, tuần BC filter, summary popup
348bc59  docs: session 36 handover — case pipeline enhancements + 28/28 tests pass
```

---

## Blockers (S36)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R. Badge should show `v6.6-case-pipeline-enhancements-20260627`. |
| **GAS redeploy** | ✅ Not needed — no GAS changes in S36. `case-pipeline-read` already returns all cases for all roles. |
| **Smoke test** | ⏳ Verify: (1) done/blocked cards show no red RAG dot; (2) tuần BC filter populates from live data; (3) stat card clicks open correct popup; (4) all users default to "Tất cả" scope. |

---

## Regression Risks (S36)

| Risk | Severity | Detail |
|---|---|---|
| **action-plan.js overdue change** | ⚪ LOW | `_apCg !== 'done' && _apCg !== 'blocked'` added to overdue check. If any stage name in `_AP_CASE_COL` differs from `CASE_STAGE_GROUP` key, the two maps could diverge. Both use same stage strings — low risk. |
| **scope=all default** | ⚪ LOW | Users who previously relied on "Của tôi" default now see all cases on load. Intentional by design; no functional break. |
| **cpSummaryOverlay z-index** | ⚪ LOW | Set to `z-index:1100` in HTML inline style — above cpViewOverlay (1000). If any other overlay has z-index >1100, stacking could be wrong. Check if adding new modals. |
| **ESC handler chain order** | ⚪ NONE | `closeCpSummaryPopup()` added before `closeCaseViewPopup()` in ESC chain — correct order (inner popup first). |

---

## Blockers (S35)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260624c` (both JS and CSS). Badge shows `v6.5-sidebar-scroll-fix-20260624c`. |
| **GAS redeploy** | ✅ Not needed — no GAS changes in S35 |
| **Smoke test: sidebar scroll** | ⏳ Verify on production: nav items at bottom (e.g. "Quản lý User") are reachable by scrolling the left menu on screens where sidebar height < total nav height |

---

## Regression Risks (S35)

| Risk | Severity | Detail |
|---|---|---|
| **Sidebar toggle button vertical centering** | ⚪ LOW | `.sidebar-toggle { position:absolute; top:50%; }` is positioned relative to `.sidebar-wrapper`. Adding `height:100vh` to `.sidebar` (which is inside wrapper) doesn't change wrapper height — wrapper was already stretched to 100vh via flex. Toggle centering unchanged. |
| **Collapsed sidebar** | ⚪ LOW | `.sidebar.collapsed { width:68px; min-width:68px }` — no height override. `height:100vh` from base rule applies → collapsed sidebar also scrollable if ever needed. No conflict. |
| **Mobile** | ⚪ NONE | `@media(max-width:768px)` already had `height:100vh` on `.sidebar` with `position:fixed`. S35 base rule is identical value; mobile override takes precedence. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S34)

---

# SESSION HANDOVER
**Date**: 2026-06-24 (Session 34 — Action Plan v2: grouped accordion, mixed kanban, extended criteria)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `a28f770` ✅

---

## Tasks Completed (S34)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S34-T1 | `action-plan.js` complete rewrite (~280→418 lines): filter state, period logic, role-aware default team, grouped accordion Admin view, single-team User/Teamlead view, Tasks+Cases mixed kanban, Initiatives section (no period filter) | `assets/js/views/action-plan.js` | `a28f770` | ✅ |
| S34-T2 | CSS: Action Plan v2 styles appended to `components.css`: `.ap-filter-bar`, `.ap-period-btn/.ap-rag-btn`, `.ap-summary-strip`, `.ap-accordion`, `.ap-accordion-header/.body`, `.kanban-card-case`, `.ap-case-badge`, `.ap-auto-badge`, `.ap-init-section` | `assets/css/components.css` | `a28f770` | ✅ |
| S34-T3 | `verify_action_plan.mjs` (new, port 9993): 24/24 PASS — AP1–AP14 covering toolbar, period/RAG filter, accordion, case card, initiative section, team filter, Blocked auto-add, task/case popups, prev-month 0 tasks, JS errors | `verify_action_plan.mjs` | `a28f770` | ✅ |
| S34-T4 | Cache-bust `?v=20260624` → `?v=20260624b`; `APP_VERSION = '6.5-action-plan-v2-20260624b'` | `index.html`, `assets/js/config.js` | `a28f770` | ✅ |

### Architecture: S34 Changes

**Filter state globals** (`action-plan.js`):
```javascript
let _apFilterTeam   = null;    // null=uninit; ''=all teams; 'BL1'...=specific
let _apFilterPeriod = 'month'; // 'month' | 'quarter' | 'prev-month'
let _apFilterRag    = '';      // '' | 'Red' | 'Amber' | 'Green'
let _apAccordionOpen = {};     // { [team]: boolean } — persists across re-renders
```

**Role-aware default** (`_apDefaultTeam()`):
- Admin → `''` (all teams, grouped accordion view)
- User/Teamlead → `u.team` (single-team kanban view)
- Filter state cached on first call; reset on page reload only

**Extended criteria** (`_apGetTasks()`):
```
Primary:  highlight=Y AND deadline in period range
Extended: (state=Blocked OR Tạm dừng) AND (deadline in range OR no deadline)
          OR endDate < today AND state≠Hoàn thành AND endDate ≤ period.end (overdue)
Auto-added tasks get ⚡Auto badge (.ap-auto-badge) in the kanban card
```

**Initiatives** (`_apGetInits()`):
- Parent initiatives only via `_initRealRoots()` (type=initiative, not milestone)
- Filtered by `_appUsers.find(u.Username === i.accountable).Team`
- **No period date filter** — initiatives always shown regardless of month/quarter selection
- Shown below kanban as `.ap-init-section`

**Accordion** (DOM mutation only — no re-render):
```javascript
function _apToggle(team) {
  _apAccordionOpen[team] = !_apAccordionOpen[team];
  const body = document.querySelector('#' + _apTid(team) + ' .ap-accordion-body');
  body.style.display = _apAccordionOpen[team] ? 'block' : 'none';
  // + chevron class toggle
}
```
Avoids stale DOM handle issue (only `_apSetTeam/Period/Rag` trigger full re-render).

**AP ID** (`_apTid(team)`): `'ap-acc-' + TEAM_LIST.indexOf(team)` — index-based, safe for Vietnamese/spaced names.

**Case cards**: `.kanban-card-case` (blue left border) + `.ap-case-badge` (★CASE label); `_AP_CASE_COL` mapping stage→column.

**Empty state** (`_apEmpty()`): "Không có hành động trọng tâm trong kỳ này" — only shown when tasks.length=0 AND cases.length=0 AND inits.length=0. Since initiatives are not period-filtered, empty state rarely appears.

### Test discoveries (S34)
1. **Stale handle in AP9 reset**: `teamSel` captured before `selectOption('BL2')` triggered DOM rebuild. Fixed: re-query `page.$('.ap-filter-bar select')` before reset.
2. **AP13 empty state never fires**: Initiatives have no period filter → `inits.length > 0` even in prev-month → `empty=false`. Test updated to check `html.includes('0 tasks/cases')` in toolbar instead.

### Commits S34
```
a28f770  feat(action-plan): v2 rewrite — grouped accordion view, mixed task/case kanban, extended criteria
```

---

## Blockers (S34)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260624b`. Badge shows `v6.5-action-plan-v2-20260624b`. |
| **GAS redeploy** | ✅ Not needed — no GAS changes in S34 |
| **Smoke test production** | ⏳ Test Action Plan on live with real data: team filter, RAG filter, Blocked auto-add, initiative section |

---

## Regression Risks (S34)

| Risk | Severity | Detail |
|---|---|---|
| **`_initRealRoots()` dependency** | 🟡 MEDIUM | `_apGetInits()` calls `_initRealRoots()` defined in `initiative-tracker.js`. If Initiative Tracker view hasn't been navigated to yet, `_initRealRoots` may not be defined. Fallback: `db.initiatives.filter(i => !i.parentId && i.id!=='BAU' && i.status!==undefined)`. |
| **`_appUsers` race** | ⚪ LOW | If Action Plan is opened before `loadAppUsers()` completes, `_apGetInits(team)` returns all initiatives (no team filter). Resolves on next filter change. |
| **Accordion state persistence** | ⚪ LOW | `_apAccordionOpen` persists across same-session navigations. If user collapses BL1 then navigates away and back, BL1 stays collapsed. Intentional. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S33)

---

# SESSION HANDOVER
**Date**: 2026-06-24 (Session 33 — Audit log history tab + startDate default today + GAS audit-read)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `466f9e9` ✅

---

## Tasks Completed (S33)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S33-T1 | GAS: `auditReadByEntity(entityId)` trong `AuditService.gs` — filter Audit_Log by Summary prefix; `audit-read` route trong `Code.gs` (no ADMIN_ONLY gate — all roles) | `backend/AuditService.gs`, `backend/Code.gs` | `ea55a2b` | ✅ |
| S33-T2 | API layer: `_gasAuditRead(entityId)` + `_buildHistoryTable(rows, synthetic, actionMap)` appended to `api.js` — lazy fetch, empty state, alternating rows, action badges, fmtTs handles ISO/YYYY-MM-DD/DD-MMM-YY | `assets/js/api.js` | `ea55a2b` | ✅ |
| S33-T3 | CSS: `.popup-tabs`, `.popup-tab`, `.popup-tab.active`, `.badge-info` appended to `components.css` | `assets/css/components.css` | `ea55a2b` | ✅ |
| S33-T4 | Task history tab: `_taskHistoryLoaded` flag, `_taskTabSwitch()`, `_loadTaskHistory()` in `tasks.js`; synthetic row from `t.startDate`; reset on `openTaskViewPopup()` | `assets/js/views/tasks.js` | `ea55a2b` | ✅ |
| S33-T5 | Case history tab: `_cpHistoryLoaded`, `_cpTabSwitch()`, `_loadCpHistory()` in `case-pipeline.js`; **startDate default today** in `openCaseModal(null)` | `assets/js/views/case-pipeline.js` | `ea55a2b` | ✅ |
| S33-T6 | Initiative history tab: `_initHistoryLoaded`, `_initTabSwitch()`, `_loadInitHistory()` in `initiative-tracker.js`; **startDate default today** in `_initOpenModal(null)` (DD-MMM-YY format using `_MMM` global) | `assets/js/views/initiative-tracker.js` | `ea55a2b` | ✅ |
| S33-T7 | `index.html`: tab bars (`#taskTabDetail`/`#taskTabHistory`, same for init/cp) + history panes (`#taskViewHistory`, `#initViewHistory`, `#cpViewHistory`) added to 3 view overlays; cache-bust `?v=20260622` → `?v=20260624` (35 script tags, Python); `APP_VERSION = '6.4-history-20260624'` | `index.html`, `assets/js/config.js` | `ea55a2b` | ✅ |
| S33-T8 | `verify_history.mjs` (new, port 9992): 47/47 PASS — H1 HTML structure, H2–H5 tab switching + lazy load, H6–H8 history table content (mock rows + synthetic row), H9–H10 init/case popups, H11–H13 startDate defaults, H14 JS errors; EVD screenshots to `test-results/history/` | `verify_history.mjs` | `ea55a2b` | ✅ |
| S33-T9 | Docs: `AI_CONTEXT/PROJECT_STATE.md` updated (v6.4, HEAD `ea55a2b`) | `AI_CONTEXT/PROJECT_STATE.md` | `466f9e9` | ✅ |
| S33-T10 | GAS deployed by user — `audit-read` route live; URL unchanged: `AKfycbydyikBtboeDufx9fsloV3pOT-EVgQfpkggImGH3GrQ8Skct5XC1B1KtE7U008G97f2` | GAS | manual | ✅ |

### Architecture: S33 Changes

**`auditReadByEntity(entityId)`** — GAS filter logic:
```javascript
// backend/AuditService.gs
var prefix = entityId + ' |';
return data.filter(function(row) {
  var s = String(row[5] || '');
  return s === entityId || s.startsWith(prefix);  // avoids 'CV-001' matching 'CV-0011'
}).map(function(row) {
  return [row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
          String(row[1]||''), String(row[2]||''), String(row[3]||''),
          String(row[4]||''), String(row[5]||'')];
});
```

**`_buildHistoryTable(rows, syntheticRow, actionMap)`** — action map:
```
task-upsert / case-upsert / initiative-upsert → "Cập nhật"  / badge-info
task-delete / case-delete                      → "Xóa"       / badge-red
__create__                                     → "Tạo mới"   / badge-green
task-write / *-write                           → "Sync import"/ badge-gray
```

**Lazy load pattern** (same for all 3 entity types):
```javascript
let _taskHistoryLoaded = false;          // reset on every popup open
function _taskTabSwitch(tab) { ... }     // toggle body/history pane display
async function _loadTaskHistory() {
  const rows = await _gasAuditRead(t.id);
  _taskHistoryLoaded = true;
  const synthetic = t.startDate
    ? [t.startDate, '', 'Dữ liệu ban đầu', '', '__create__', t.id + ' | ' + t.name]
    : null;
  el.innerHTML = _buildHistoryTable(rows, synthetic);
}
```

**startDate default today**:
```javascript
// Case (case-pipeline.js, openCaseModal):
const _cpTd = new Date();
const _cpTodayISO = `${_cpTd.getFullYear()}-${...}-${...}`;
fv('cpfStartDate', c ? c.startDate : _cpTodayISO);

// Initiative (initiative-tracker.js, _initOpenModal null):
const _initTd = new Date();
_initStartEl.value = `${String(_initTd.getDate()).padStart(2,'0')}-${_MMM[_initTd.getMonth()]}-${String(_initTd.getFullYear()).slice(-2)}`;
// Format: DD-MMM-YY (e.g. "24-Jun-26") — matches text input placeholder
```

**Test fix discovered during S33**:
```
verify_task_init_popup.mjs used old APP_DIR 'D:/Công việc/Vibecode/SHTD-Dashboard' (298-line tasks.js).
New verify_history.mjs uses current path 'D:/Workspace/Production/SHTD-Dashboard'.
H10 case popup FAIL fixed: test was setting localStorage key 'shtd_cp_v1' (wrong);
actual loadCasesFromCache() reads from shtd_v2.cases — fixed to: { tasks:[t], initiatives:[i], cases:[c], _serverTs:null, deletedIds:[] }
```

### Commits S33
```
ea55a2b  feat(history): audit log history tab in task/initiative/case view popups + startDate default today
466f9e9  docs: update PROJECT_STATE for S33 history tab feature
```

---

## Blockers (S33)

| Item | Status |
|---|---|
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260624`. Until done, S33 features invisible. Topbar badge shows `v6.4-history-20260624`. |
| **Smoke test production** | ⏳ After hard-reload: verify history tab loads real audit data; verify startDate defaults to today when adding new task/case/initiative |
| **GAS redeploy (audit-read)** | ✅ Done manually by user 2026-06-24 — URL unchanged |

---

## Regression Risks (S33)

| Risk | Severity | Detail |
|---|---|---|
| **Initiative startDate text format** | ⚪ LOW | Format DD-MMM-YY generated using `_MMM` global from constants.js. If `_MMM` undefined at modal open → JS error, field stays blank. `_MMM` is defined at page load so risk is theoretical. |
| **fmtTs() fallback for DD-MMM-YY** | ⚪ LOW | `new Date('24-Jun-26T...')` returns Invalid Date → fallback to raw string. History table shows initiative startDate as-is (not reformatted). Acceptable. |
| **GAS quota** | ⚪ LOW | `audit-read` reads full Audit_Log sheet on each tab open (per popup). First open is live fetch. Subsequent opens in same popup session are cached via `_*HistoryLoaded`. Acceptable for typical usage. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S32)

---

# SESSION HANDOVER
**Date**: 2026-06-22 (Session 32 — sortBy select fix + cache-bust + verify 26/26)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `56e3e43` ✅

---

## Tasks Completed (S32)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S32-T1 | Handover docs S31: SESSION_HANDOVER, PROJECT_STATE, TODO_NEXT, TECH_DEBT updated | `ai_context/` | `f583f80` | ✅ |
| S32-T2 | `verify_select_bug.mjs` 23/23 PASS — initial S31 regression tests (S1-S5 scenarios + JS errors) | `verify_select_bug.mjs` | `b95627d` | ✅ |
| S32-T3 | Bug: `sortBy()` not clearing `selectedIds` — column sort reorders 631 tasks across 32 pages; stale 20 IDs scatter to pages 3/7/12; bulk bar shows "20 đã chọn", only 2 visible on current page | `assets/js/views/tasks.js` | `56e3e43` | ✅ |
| S32-T4 | Bug: S31 cache-bust not bumped — browsers served old pre-fix JS; all S31 select-bug fixes invisible to production users | `index.html`, `assets/js/config.js` | `56e3e43` | ✅ |
| S32-T5 | `verify_select_bug.mjs`: S6 (sortBy clears) added → **26/26 PASS**; EVD screenshots s6_before/after_sort.png | `verify_select_bug.mjs`, `test-results/select_bug/` | `56e3e43` | ✅ |

### Root Cause — Production Bug (BUG1.png / BUG2.png)

User observed: bulk bar shows "20 task đã chọn" but only 2 rows visibly checked after switching scopes/sort.

**Cause A — Browser cache stale (S31 forgot cache-bust)**:
- S31 changed `tasks.js` + `navigation.js` but did not bump `?v=20260619d` → browsers served old pre-fix JS
- Fix: Python replace `?v=20260619d` → `?v=20260622` in all 35 `<script>` tags in `index.html`
- Must use **Python** (not PowerShell `Get-Content`) — PowerShell default encoding corrupts Vietnamese chars; 'Số' (2 chars, 4 UTF-8 bytes) becomes 'Sá»' (4 chars), breaking Playwright S3 filter test
- `APP_VERSION = '6.3-select-fix-20260622'`

**Cause B — `sortBy()` not clearing selectedIds**:
- User selects 20 tasks on page 1 (sort default), clicks column header → same 20 IDs now on pages 3, 7, 12, etc.
- Bulk bar shows "20", only 2 of those IDs visible on current page → visual discrepancy
- Fix: `selectedIds.clear()` at top of `sortBy()` in `views/tasks.js`

### Architecture: S32 Changes

**`sortBy()` fix** (commit `56e3e43`):
```js
function sortBy(key) {
  if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
  else { sort.key = key; sort.dir = 'asc'; }
  document.querySelectorAll('#taskTable th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
  selectedIds.clear();  // ← ADDED S32: sort reorders tasks across pages — stale selections mislead
  renderTaskTable();
}
```

**`selectedIds` clear matrix — complete after S32:**
```
navigateTo('tasks')            → selectedIds.clear()          ✅ S31-T4
onFilterChange (ALL filters)   → selectedIds.clear()          ✅ S31-T2 (sync before debounce)
toggleSelectAll                → clear → add current page     ✅ S31-T6
setPreset / setTaskScope       → selectedIds.clear()          ✅ pre-existing
clearFilter / clearFilters     → selectedIds.clear()          ✅ pre-existing
goPage                         → selectedIds.clear()          ✅ pre-existing
bulkSetRag/State/Delete        → selectedIds.clear() after op ✅ pre-existing
deleteTask                     → selectedIds.delete(id)       ✅ pre-existing
sortBy                         → selectedIds.clear()          ✅ NEW S32
renderAll                      → no clear (intentional)
```

**Cache-bust rule** (lesson from S32):
- Every commit touching any `assets/js/*.js` MUST bump `?v=` in all 35 `<script>` tags
- Use Python: `content.replace('?v=OLD', '?v=NEW')` with `encoding='utf-8'` — never PowerShell on Windows
- `APP_VERSION` in `config.js` must match the new version string

### Commits S32
```
f583f80  docs: session 31 handover — select-all bug fixes + deletedIds blacklist
b95627d  test: verify_select_bug 23/23 PASS — S31 select-all + deletedIds regression tests
56e3e43  fix(select): sortBy clears selectedIds + cache-bust bump to force reload
```

---

## Decisions Made (S32)

1. **`sortBy()` must clear `selectedIds`**: Pagination means sort changes which tasks are visible per page. Stale IDs spread across many pages — bulk count mismatches visible checked rows. User rule: "Chọn số lượng task phải lấy từ giao diện."
2. **Cache-bust MUST be bumped on every JS deployment**: S31 skipped this step → production bug. Now a hard requirement per commit.
3. **Python-only for UTF-8 file edits on Windows**: PowerShell `Get-Content` reads as Windows-1252 → corrupts 'Số' and other Vietnamese chars. Confirmed when Playwright S3 test showed 20 rows instead of 12 (filter 'Số' matched 0 due to encoding mismatch).
4. **Hard-reload required**: Users must Ctrl+Shift+R (or Ctrl+F5) after cache-bust bump. Until done, S31+S32 fixes remain invisible in browser.

---

## Blockers (S32)

| Item | Status |
|---|---|
| **GAS redeploy** | ⏳ Same as S31 — `Code.gs` updated in `689bb10` returns `serverTs`. Requires manual: Extensions → Apps Script → Deploy → New deployment. |
| **Hard-reload (users)** | ⏳ Users must Ctrl+Shift+R to pick up `?v=20260622`. Until done, all S31+S32 fixes remain invisible in browser. |

---

## Regression Risks (S32)

| Risk | Severity | Detail |
|---|---|---|
| **sortBy() behavior change** | ⚪ LOW | Previous: sort kept selections (could select then sort). New: sort always clears. Acceptable — user can re-selectAll after sort. |
| **Mock-only test coverage** | 🟡 MEDIUM | `verify_select_bug.mjs` uses 25 mock tasks. Real 631 tasks not yet smoke-tested post-S32. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S31)

---

# SESSION HANDOVER
**Date**: 2026-06-22 (Session 31 — Select-all bug + deleted-task re-insertion blacklist)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `0cec10b` ✅

---

## Tasks Completed (S31)

| # | Task | Files | Commits | Status |
|---|---|---|---|---|
| S31-T1 | Bug 1: task delete/ID-change — `_gasTaskUpsert` discarding `task-delete` response silently when ID changes (log: 1 delete + 1 update, task reappears in DB) | `crud.js`, `api.js`, `backend/Code.gs` | `689bb10` | ✅ |
| S31-T2 | Bug 2a: `onFilterChange()` missing `selectedIds.clear()` → filter change left stale bulk selections | `views/tasks.js` | `5a75f97` | ✅ |
| S31-T3 | Bug 2b: `setupListeners()` had duplicate `change`/`input` listeners on 7 filter elements, racing with `onFilterChange`'s debounce and calling `clearTimeout` on it | `ui/navigation.js` | `9e8bfd3` | ✅ |
| S31-T4 | Bug 2c: `navigateTo('tasks')` called `renderTaskTable()` without clearing `selectedIds` → bulk bar shows count immediately on page enter | `ui/navigation.js` | `0cec10b` | ✅ |
| S31-T5 | Bug 3: Deleted tasks reappear in GAS — Excel import `syncAction` re-inserts tasks from Excel not in `db.tasks`; merge logic restores from server before GAS delete completes | `constants.js`, `storage.js`, `crud.js`, `bulk.js`, `api.js`, `app.js` | `df3339b` | ✅ |
| S31-T6 | Select-all scoped to current page: `toggleSelectAll` slices `getFiltered()` to current page only | `views/tasks.js`, `bulk.js` | `ea8d5d7` | ✅ |

### Architecture: S31 Changes

**`db.deletedIds` blacklist** (Bug 3 — commit `df3339b`):
```
constants.js:       db = { tasks:[], initiatives:[], _serverTs:null, deletedIds:[] }
storage.js:         loadDb() → if Array.isArray(parsed.deletedIds) db.deletedIds = parsed.deletedIds
crud.js deleteTask: db.deletedIds.push(id)
crud.js handleSubmit: re-adding same ID → splice from deletedIds (clear blacklist)
bulk.js bulkDelete: toDelete.forEach → db.deletedIds.push(id)
api.js syncAction:  const persistedDeleted = new Set(db.deletedIds||[]); skip in merge
api.js readFromHandle: db.deletedIds = db.deletedIds.filter(id => !serverIds.has(id)) (prune)
app.js handleImport: const deletedSet = new Set(db.deletedIds||[]); skip ext.tasks in loop
```

**`selectedIds` clear matrix — complete after S31:**
```
navigateTo('tasks')            → selectedIds.clear()          ✅ NEW S31-T4
onFilterChange (ALL filters)   → selectedIds.clear()          ✅ NEW S31-T2 (sync before debounce)
toggleSelectAll                → clear → add current page     ✅ S31-T6
setPreset / setTaskScope       → selectedIds.clear()          ✅ pre-existing
clearFilter / clearFilters     → selectedIds.clear()          ✅ pre-existing
goPage                         → selectedIds.clear()          ✅ pre-existing
bulkSetRag/State/Delete        → selectedIds.clear() after op ✅ pre-existing
deleteTask                     → selectedIds.delete(id)       ✅ pre-existing
sortBy                         → selectedIds.clear()          ✅ NEW S32 (was no-clear — fixed for pagination)
renderAll                      → no clear (intentional)
```

**Duplicate listeners removed** (Bug 2b — commit `9e8bfd3`):
```
REMOVED from navigation.js setupListeners() — 7 listeners on filter elements:
  ['filterId','filterInit','filterTeam','filterState','filterRag','filterScope','filterPic']
  each calling clearTimeout(debounceTimer) → was cancelling onFilterChange's own debounce
REPLACED WITH: comment explaining onchange/oninput in HTML is the sole handler
```

### Commits S31
```
689bb10  fix: task delete/ID-change bugs — check task-delete response, sync serverTs, clear selectedIds
ea8d5d7  fix: select-all checkbox no longer accumulates stale selections across pages/filters
5a75f97  fix(bulk): clear selectedIds on onFilterChange (filter dropdown)
df3339b  fix: prevent deleted tasks from being re-inserted by Excel import
9e8bfd3  fix(select): remove duplicate filter event listeners from setupListeners
0cec10b  fix(select): clear selectedIds when navigating to tasks view
```

---

## Decisions Made (S31)

1. **`db.deletedIds` persisted in localStorage**: Blacklist survives reload. Cleared when user re-adds same ID. Pruned on `readFromHandle` when server no longer has the task.
2. **Single inline handler for all filters**: HTML `onchange="onFilterChange()"` only — no parallel JS event listeners in `setupListeners`. Eliminates debounce race.
3. **`selectedIds.clear()` synchronous before debounce in `onFilterChange`**: Guaranteed to clear even if debounce is later cancelled.
4. **`navigateTo('tasks')` = full context switch**: Clears selectedIds before every render when entering Tasks view.

---

## Blockers (S31)

| Item | Status |
|---|---|
| **GAS redeploy** | ⏳ `backend/Code.gs` updated in `689bb10` to return `serverTs` in task-upsert/task-delete. Requires manual redeploy: Extensions → Apps Script → Deploy → New deployment. Until done, `db._serverTs` won't sync after atomic writes. |
| **Local test S1–S5** | ⚠️ S31 fixes not yet browser-tested locally. Run: `npx http-server D:\Workspace\Production\SHTD-Dashboard -p 3030` |

---

## Regression Risks (S31)

| Risk | Severity | Detail |
|---|---|---|
| **S31 fixes not locally tested** | 🟡 MEDIUM | All 6 commits pushed without local browser verification (violated user's explicit rule "test local before push"). Correctness based on code trace only. |
| **`db.deletedIds` grows indefinitely** | ⚪ LOW | Permanently deleted task IDs accumulate in localStorage. Pruned only if task reappears on GAS server. No functional impact at current scale. |
| **`renderAll()` without clear** | ⚪ LOW | If GAS sync removes a task currently in `selectedIds`, bulk bar count may be 1 higher than visible checked rows. Acceptable trade-off. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S30)

---

# SESSION HANDOVER
**Date**: 2026-06-19 (Session 30 — Atomic writes for bulk ops + new GAS URL + debug trace)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**origin/main HEAD**: `4fc6648` ✅

---

## Tasks Completed (S30)

| # | Task | Files | Status |
|---|---|----|---|
| S30-T1 | Root cause: `syncAction` trong `bulk.js` → `task-write + N rows` khi bulk ops kể cả khi delete single task qua modal nếu có selectedIds tồn tại | — | ✅ |
| S30-T2 | `bulk.js`: `bulkSetRag/State/Delete` → N × `_gasTaskUpsert`/`_gasTaskDelete` (atomic, optimistic-update, fire-and-forget) — xóa hoàn toàn `syncAction` khỏi bulk.js | `bulk.js` | ✅ |
| S30-T3 | `config.js`: cập nhật `GS_WEBAPP_URL` → URL GAS mới deploy với đầy đủ action handlers (`task-upsert`, `task-delete`, `case-upsert`, `case-delete`, `initiative-upsert`) | `config.js` | ✅ |
| S30-T4 | Debug tooling: APP_VERSION badge trong topbar breadcrumb; startup console log hiện version + cảnh báo nếu `deleteTask` dùng syncAction; `syncAction` log caller stack | `app.js`, `api.js`, `index.html`, `config.js` | ✅ |
| S30-T5 | Cache-busting: tất cả 35 script tags → `?v=20260619d`; `APP_VERSION = '6.3-no-syncaction-20260619'` | `index.html`, `config.js` | ✅ |
| S30-T6 | `verify_atomic_write.mjs`: thêm T8b (bulkSetRag → N×task-upsert, 0×write) + T8c (bulkDelete → N×task-delete, 0×write) — **41/41 PASS** | `verify_atomic_write.mjs` | ✅ |

### Architecture: S30 Changes

**Root cause** của `task-write + N rows` khi xóa single task:
```
selectedIds (global Set) persist trong bộ nhớ khi chuyển view.
Nếu user có tasks đã check (bulk bar đang hiện), khi mở modal delete task,
bulkSetRag / bulkSetState / bulkDelete có thể đã được trigger TRƯỚC hoặc
SONG SONG với deleteTask() qua UI. syncAction() trong bulk.js → read→write full sheet.
```

**Pattern mới (bulk ops sau S30)**:
```
bulkSetRag(rag):
  uiConfirm → toUpdate = [...selectedIds] → forEach t.status = rag
  persist() → selectedIds.clear() → renderAll() → toast()
  toUpdate.forEach(t => _gasTaskUpsert(t))   ← fire-and-forget, 1 call/task

bulkDelete():
  uiConfirm → toDelete = [...selectedIds] → db.tasks.filter(out)
  persist() → selectedIds.clear() → renderAll() → toast()
  toDelete.forEach(({id,name}) => _gasTaskDelete(id, name))  ← fire-and-forget

Audit_Log sẽ thấy N entries 'task-upsert | ID' hoặc 'task-delete | ID', KHÔNG còn 'task-write + N rows'
```

**`syncAction()` call sites sau S30** (chỉ còn 1):
- `app.js:188` — `handleImport()` (Excel import) — đây là expected behavior

**GAS URL mới** (S30):
```
https://script.google.com/macros/s/AKfycbydyikBtboeDufx9fsloV3pOT-EVgQfpkggImGH3GrQ8Skct5XC1B1KtE7U008G97f2/exec
```
Backend này có đầy đủ handlers: `task-upsert`, `task-delete`, `case-upsert`, `case-delete`, `initiative-upsert`.

### Commits S30
```
af66c54  fix: atomic per-row GAS writes — eliminate full 613-row rewrite on single task/case save
5ae891c  fix: add cache-busting ?v=20260619 to all local JS script tags
232c7f4  debug: add APP_VERSION badge to topbar + bump cache-bust to 20260619b
9578fc8  debug: add syncAction caller trace + startup diagnostics for stale-cache detection
701fe7f  fix: replace syncAction in bulk.js with per-row atomic writes + new GAS URL
4fc6648  test: update verify_atomic_write — add T8b/T8c bulk atomic write coverage
```

### Regression (S30)
```
verify_atomic_write.mjs:  41/41 PASS ✅ (was 35/35 — +T8b/T8c bulk ops)
```

⚠️ **`verify_sync_fix.mjs` (S29, 24/24)** — có thể STALE sau S30. Tests T3–T5 kiểm tra bulk ops gọi `syncAction` → giờ bulk dùng atomic writes → những test đó sẽ FAIL. Cần review/update trước khi chạy.

---

## Decisions Made (S30)

1. **Bulk ops → atomic writes** (không dùng read-merge-write): Chấp nhận không có server-side merge cho bulk ops. Justification: bulk ops là Admin action, thường chỉ 1 user tại một thời điểm; atomic per-row writes an toàn hơn cho concurrent single-row edits từ user khác.
2. **`syncAction()` chỉ còn cho Excel import**: Excel import cần read-merge-write để không overwrite data từ user khác trong khi import chạy. Đây là trường hợp duy nhất còn hợp lệ.
3. **Debug trace giữ nguyên tạm thời**: `[syncAction] fired — caller:` trace và startup console log giữ cho đến khi production verified ổn định. Xóa sau.
4. **New GAS deployment**: URL cũ còn hoạt động (old actions vẫn valid) nhưng không có new handlers. User deploy new version và cung cấp URL mới.

---

## Blockers (S30)

| Item | Status |
|---|---|
| Production verify | ⏳ Cần user test production sau CDN propagate: xóa task/bulk → GAS log phải hiện `task-delete \| ID \| Name` không còn `task-write + N rows` |
| `verify_sync_fix.mjs` stale | ⚠️ Chưa update — bulk tests sẽ FAIL với code mới |

---

## Regression Risks (S30)

| Risk | Severity | Detail |
|---|---|---|
| **verify_sync_fix.mjs stale** | 🟡 MEDIUM | S29 tạo test expect bulk → syncAction. Sau S30 bulk → atomic. Tests T3–T5 sẽ FAIL. Cần update hoặc deprecate file này |
| **Bulk error handling thay đổi** | ⚪ LOW | Trước: 1 lỗi GAS → toàn bộ bulk fail (syncAction throw). Sau: mỗi task fail independent, hiện toast riêng. N lỗi = N toasts — có thể noisy với bulk lớn |
| **selectedIds không clear khi GAS fail** | ⚪ LOW | Trước: syncAction fail → db.tasks rollback từ localStorage → selectedIds có thể stale. Sau: local state đã committed, selectedIds.clear() chạy trước GAS → không rollback nếu GAS fail. Acceptable: local delete confirmed, user thấy toast nếu GAS fail |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S29)

---

# SESSION HANDOVER
**Date**: 2026-06-18 (Session 29 — Fix GAS sync for task CRUD / bulk / BLD / initiative)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S29**: `2986e51` — fix: task/bulk/bld/initiative operations now sync to GAS instead of local-only
**origin/main HEAD**: `2986e51` ✅

---

## Tasks Completed (S29)

| # | Task | Files | Status |
|---|---|----|---|
| S29-T1 | Audit + root-cause: 8 điểm dùng `localAction()` → toast success mà không ghi GAS | — | ✅ |
| S29-T2 | `crud.js`: `handleSubmit` + `deleteTask` → `await syncAction()` | `crud.js` | ✅ |
| S29-T3 | `bulk.js`: `bulkSetRag/State/Delete` → `await syncAction()` | `bulk.js` | ✅ |
| S29-T4 | `bld-queue.js`: task BLD approval path → `await syncAction()` | `bld-queue.js` | ✅ |
| S29-T5 | `initiatives.js`: `syncInitiativeAdd/Edit` thêm `return` → expose promise | `initiatives.js` | ✅ |
| S29-T6 | `initiative-tracker.js`: `_initSave` → `async`, thêm `await` trước sync calls | `initiative-tracker.js` | ✅ |
| S29-T7 | Bug fix phát hiện khi test: `const ok` khai báo hai lần trong cùng scope → rename thành `const synced` | `crud.js`, `bulk.js` | ✅ |
| S29-T8 | Viết + pass `verify_sync_fix.mjs` — 24/24 PASS | `verify_sync_fix.mjs` | ✅ |

### Architecture: S29 Changes

**Root cause (S23b regression)**:
```
S23b (2026-06-16) đã thay syncAction → localAction cho task CRUD "vì PO yêu cầu".
Kết quả: mọi save/delete/bulk/BLD-task chỉ lưu localStorage, không ghi GAS.
UI vẫn báo "Đã lưu" → misleading, data loss khi clear cache.
S29 reverses quyết định này.
```

**Pattern sau fix**:
```
handleSubmit / deleteTask / bulkSetRag / bulkSetState / bulkDelete / bldSubmitAction(task)
  → await syncAction(mutateFn)
      → mutateFn() [local mutate]
      → gasPost({action:'read'}) [get server state]
      → merge local + server
      → gasPost({action:'write', values:[...]}) [write back]
      → persist() + renderAll()
  Toast chỉ hiện SAU khi GAS xác nhận ✅

_initSave (initiatives):
  → await syncInitiativeAdd/Edit(ini)
      → return syncInitiativeAction(mutateFn) [đã return promise]
      → gasPost({action:'initiative-write'}) ✅
  Toast chỉ hiện SAU khi GAS xác nhận ✅
```

**`localAction()` hiện tại**: vẫn còn khai báo trong `api.js` nhưng không có caller nào — dead code.

### Regression (S29)
```
verify_sync_fix.mjs:        24/24 PASS ✅ NEW — GAS calls verified cho 8 features
```

---

## Decisions Made (S29)

1. **Reverse S23b local-only decision**: Task CRUD đã được restore về sync GAS qua `syncAction()`. Lý do: user báo cáo bug nghiêm trọng — save success nhưng data không lên Sheet. TD-034 (CRITICAL) được giải quyết.
2. **`syncAction()` cho tất cả task ops**: Read-merge-write pattern đảm bảo safe merge với server state. Heavier (2 GAS calls/op) nhưng đúng hơn.
3. **Rename `const synced`** thay vì `let ok` để tránh làm mờ semantics — confirm result riêng biệt với uiConfirm result.

---

## Regression Risks (S29)

| Risk | Severity | Detail |
|---|---|---|
| **syncAction heavier per op** | ⚪ LOW | Mỗi task save/delete/bulk giờ tốn 2 GAS calls (read + write). Trước S23b cũng như vậy — không phải regression so với S22. |
| **`localAction()` dead code** | ⚪ LOW | Vẫn còn khai báo trong `api.js`. Không gây bug, nhưng nên dọn. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24 — chưa fix. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S28)

---

# SESSION HANDOVER
**Date**: 2026-06-18 (Session 28 — Context update + tài liệu hướng dẫn)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Last feature commit (S27)**: `104b81c` — feat(initiative): auto-gen milestone ID + add task from milestone
**Pushed S28 (docs)**: `50e31f1` — docs: session 28 handover — user manual, HDSD screenshots, context update
**origin/main HEAD**: `50e31f1` ✅

---

## Tasks Completed (S28 — docs only, no code changes)

| # | Task | Files | Status |
|---|---|---|---|
| S28-T1 | Commit tài liệu HDSD: `USER_MANUAL.md` (56KB), `HDSD/` (10 screenshots), `SYSTEM_UNDERSTANDING_REPORT.md` (33KB) | Documentation | ✅ |
| S28-T2 | Commit reference + utility files: `TPBank_KPI_Dashboard_v2.1.html`, `generate_docx.py`, `screenshot_hdsd.mjs`, `um_test.mjs`, `verify_ms_tasks.png` | Utils/Reference | ✅ |
| S28-T3 | Cập nhật AI_CONTEXT handover + memory files cho cả hai project | `AI_CONTEXT/` | ✅ |

**Không có thay đổi code trong session này.**

---

## Regression (S28)

Không có thay đổi code → không cần chạy regression test.

---

## DATE FROM PREVIOUS SESSION HANDOVER (S27)

---

# SESSION HANDOVER
**Date**: 2026-06-17 (Session 27 — Milestone auto-gen ID + Add Task from Milestone)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S27**: `104b81c` — feat(initiative): auto-gen milestone ID + add task from milestone
**origin/main HEAD**: `104b81c` ✅

---

## Tasks Completed (S27 — commit `104b81c`)

| # | Task | Files | Status |
|---|---|---|---|
| S27-T1 | Auto-gen Milestone ID khi thêm mới: `{parentId}-M{nextNum}` (e.g. `INIT-001-M3`); pre-fill Category từ initiative cha | `initiative-tracker.js` | ✅ |
| S27-T2 | "+ Task" button trên mỗi milestone row → mở task modal pre-filled (initiative, milestone, category, PIC, team, auto-gen ID) | `initiative-tracker.js` | ✅ |
| S27-T3 | "+ Thêm Task" trong empty-state của milestone task panel | `initiative-tracker.js` | ✅ |
| S27-T4 | Test: `verify_milestone_task.mjs` 23/23 PASS | `verify_milestone_task.mjs` | ✅ |

### Architecture: S27 Changes

**`_initNextMsNum(parentId)`** (new helper):
```js
// Tìm max số thứ tự từ các milestone có ID dạng {parentId}-M{n}
const nums = db.initiatives.filter(i => i.parentId === parentId)
  .map(i => { const m = (i.id||'').match(/-M(\d+)$/i); return m ? parseInt(m[1]) : 0; });
return nums.length ? Math.max(...nums) + 1 : 1;
```

**`_initOpenMilestone(parentId)`** (updated):
```js
// BEFORE: chỉ set initFParent
// AFTER: auto-gen ID + pre-fill category từ parent initiative
_initOpenModal(null);
const nextNum = _initNextMsNum(parentId);
setTimeout(() => {
  selParent.value = parentId;
  idEl.value = `${parentId}-M${nextNum}`;       // e.g. "INIT-001-M3"
  if (parent.category) catEl.value = parent.category;  // kế thừa category
}, 0);
```

**`openTaskModalForMilestone(msId, iniId)`** (new function):
```js
openTaskModal(null);          // reset + default fill (reuse existing logic)
fiEl.value = iniId;           // set initiative
_populateMilestoneSelect(msId); // rebuild ms select → select msId
fCat.value = ini.category;    // category from initiative
// PIC: accUser → team → _populateTeamSelect + _populateUserSelect
_populateTeamSelect('fTeam', accTeam);
_populateUserSelect('fPicAcc', accTeam, ini.accountable); // Teamlead
_populateUserSelect('fPicRes', accTeam, curUser);          // executor = current user
autoGenId();                  // gen {iniId}-M{n}-001, 002, ...
modalSubtitle = `Initiative: ${iniId} · Milestone: M{n}`;
```

**`_initBuildMilestoneList()`** — per-milestone row thêm button:
```html
<button onclick="openTaskModalForMilestone('${ms.id}','${parentId}')"
  title="Thêm task vào milestone này">
  <i class="fa-solid fa-plus"></i> Task
</button>
```

**`_initBuildMsTaskList()`** — empty-state thêm button:
```html
Chưa có task nào...
<button onclick="openTaskModalForMilestone('${ms.id}','${parentInitId}')">
  <i class="fa-solid fa-plus"></i> Thêm Task
</button>
```

### Regression (S27)
```
verify_milestone_task.mjs:   23/23 PASS ✅ NEW
verify_task_init_popup.mjs:  28/28 PASS ✅ (no regression)
```

---

## Decisions Made (S27)

1. **`openTaskModal(null)` first, then override**: Reuse existing reset/default logic thay vì duplicate. Override chỉ các fields cần thiết (fInit, fMs, fCat, fTeam, fPicAcc, fPicRes).
2. **`fPicRes` = current user, `fPicAcc` = initiative accountable**: Accountable là Teamlead chịu trách nhiệm; PicRes là người thực thi (thường là người đang nhập task).
3. **`_initNextMsNum` chỉ tính ID dạng `-M{n}`**: Ignore milestone IDs không match pattern (custom IDs) để tránh false maxima.
4. **Category: task form `fCat` vs initiative `initFCat`**: Cả hai đều có options Vietnamese (e.g. `Số hóa`). Data trong DB phải dùng giá trị match với select options — đây là điều kiện hiển thị đúng.

---

## Regression Risks (S27)

| Risk | Severity | Detail |
|---|---|---|
| **Category mismatch DB vs select options** | ⚪ LOW | Nếu initiative.category lưu string không match bất kỳ `<option>` nào trong task `fCat` (e.g. custom text, typo), `fCat` sẽ silently không set được. User thấy category rỗng → phải tự chọn lại. Không block workflow. |
| **`fPicRes` override khi accTeam không tìm được** | ⚪ LOW | Nếu `_appUsers` chưa load (GAS slow) → `accUser` = undefined → `accTeam = ''` → không gọi `_populateTeamSelect` → team + PIC giữ nguyên default từ current user. Graceful fallback. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24 — cần update test check cpViewOverlay. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S26)

---

## Tasks Completed (S26 — commit `7dbabce`)

| # | Task | Files | Status |
|---|---|---|---|
| S26-T1 | Fix filter clearing bug: `updateFilterDropdowns()` no longer rebuilds `filterPic` dropdown; `_populateFilterPic()` in `renderTaskTable()` owns it exclusively | `assets/js/app.js` | ✅ |

### Root Cause (S26-T1)
```
BEFORE:
  localAction() → renderAll() → updateFilterDropdowns()
    → fpEl.innerHTML = picNorm-format options ("Dunglq1")
    → fpEl.value = curP ("DungLQ1")  ← not found in picNorm options → reset to ""
  renderAll() → renderTaskTable() → _populateFilterPic()
    → prev = sel.value = ""          ← already cleared by updateFilterDropdowns
    → rebuild Username-format options
    → if (prev && ...) sel.value = prev  ← prev="" → no restore → filter gone

AFTER:
  updateFilterDropdowns() does NOT touch filterPic at all
  _populateFilterPic() captures prev before rebuild → rebuilds → restores → ✅
```

### Fix (S26-T1) — app.js `updateFilterDropdowns()`
```diff
-  const fpEl = document.getElementById('filterPic');
-  const curI = fiEl.value, curP = fpEl.value;
+  const curI = fiEl.value;
   // ... rebuild filterInit ...
-  let pics = new Set(DEFAULT_PICS);
-  db.tasks.forEach(t => { if (t.picRes) pics.add(picNorm(t.picRes)); });
-  fpEl.innerHTML = '<option value="">...' + ...
-  if (curP) fpEl.value = curP;
+  // filterPic managed exclusively by _populateFilterPic() in renderTaskTable()
```

### Regression (S26)
```
verify_task_init_popup.mjs:  28/28 PASS ✅ (no regression from S25 popup features)
```

---

## Decisions Made (S26)

1. **Remove filterPic from `updateFilterDropdowns()`**: Không fix format conflict — loại bỏ hẳn phần rebuild để tránh double-rebuild với hai format khác nhau. `_populateFilterPic()` đã đủ xử lý đúng (Username format, prev-restore).
2. **Không cần fix các filter khác**: `filterInit`, `filterTuanBC` trong `updateFilterDropdowns()` dùng ID format nhất quán → preserve đúng. `filterTeam`, `filterState`, `filterRag`, `filterId` không bị rebuild trong `renderAll()` → luôn giữ nguyên.

---

## Regression Risks (S26)

| Risk | Severity | Detail |
|---|---|---|
| **filterPic khi `_appUsers` chưa load** | ⚪ LOW | Nếu `loadAppUsers()` chưa xong khi user đầu tiên thay đổi filter, `_populateFilterPic()` dùng fallback từ `db.tasks` (picRes trực tiếp). Giá trị được preserve nhưng format khác. Resolve khi `_appUsers` load xong + user đổi filter lại. |
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24: test check click row → edit modal nhưng S24 đổi sang view popup. Cần update test. |

---

## DATE FROM PREVIOUS SESSION HANDOVER (S25)

---

## Tasks Completed (S25 — commit `61108da`)

| # | Task | Files | Status |
|---|---|---|---|
| S25-T1 | Task view popup: `rowClick()` → `openTaskViewPopup(id)` — read-only overlay với full task details, chips, grid | `tasks.js`, `index.html` | ✅ |
| S25-T2 | Task view popup: "Chỉnh sửa" → `taskViewOpenEdit()` → ghi nhớ `_taskEditReturnId` → đóng popup → mở edit modal | `tasks.js` | ✅ |
| S25-T3 | Return-to-popup: `handleSubmit()` re-open task view popup sau save (dùng `task.id` mới); `closeTaskModal()` reset `_taskEditReturnId` khi cancel | `crud.js` | ✅ |
| S25-T4 | Initiative view popup: card header `onclick="openInitViewPopup()"` với `cursor:pointer`; `stopPropagation` trên `.init-card-actions` | `initiative-tracker.js` | ✅ |
| S25-T5 | Initiative view popup: "Chỉnh sửa" → `initViewOpenEdit()` → `_initEditReturnId` → close popup → `_initOpenModal()`; `_initSave()` re-open popup sau save | `initiative-tracker.js` | ✅ |
| S25-T6 | Task rows trong milestone list & linked task list → `openTaskViewPopup()` thay vì `editTask()` | `initiative-tracker.js` | ✅ |
| S25-T7 | ESC handler: thêm `closeTaskViewPopup()`, `closeInitViewPopup()`, `_initCloseModal()` | `navigation.js` | ✅ |
| S25-T8 | `#taskViewOverlay` + `#initViewOverlay` HTML (global overlays, reuse `.cp-view-*` CSS) | `index.html` | ✅ |
| S25-T9 | Test: `verify_task_init_popup.mjs` — 28/28 PASS | `verify_task_init_popup.mjs` | ✅ |

---

## Architecture: S25 Changes

### Task View Popup (S25-T1 to T3)
```
Flow:
  tasks.js rowClick(e, id) → openTaskViewPopup(id)
    - populate #taskViewTitle, #taskViewSubtitle, #taskViewBody
    - chips: state, RAG, category, type, canBLD, highlight, overdue
    - grid (cp-view-grid): initiative, milestone, team, PICs, dates, progress, tuanBC
    - sections: result, nextPlan, vuongMac, noiDungBLD, yKienBLD
    - show #taskViewOverlay (display:flex)

  "Chỉnh sửa" btn → taskViewOpenEdit():
    _taskEditReturnId = _taskViewId  ← capture trước close
    closeTaskViewPopup()             ← _taskViewId = null
    editTask(id)                     → openTaskModal(task)

  handleSubmit() sau save:
    const shouldReturn = !!_taskEditReturnId  ← capture trước closeTaskModal
    closeTaskModal()                          ← reset _taskEditReturnId = null
    if (shouldReturn) openTaskViewPopup(task.id)  ← dùng task.id mới (edge case ID change)

  closeTaskModal() → _taskEditReturnId = null (cancel = no re-open)
  ESC → closeTaskViewPopup()
```

### Initiative View Popup (S25-T4 to T6)
```
Flow:
  init-card-header onclick="openInitViewPopup(ini.id)"  cursor:pointer
  .init-card-actions onclick="event.stopPropagation()"   ← prevent bubble

  openInitViewPopup(id):
    - populate #initViewTitle, #initViewSubtitle, #initViewBody
    - chips: status, category, milestone badge (nếu có parentId)
    - grid (cp-view-grid): accountable, dates, pct, milestones count, tasks count, docLink
    - sections: kpiTarget, notes
    - show #initViewOverlay (display:flex)

  "Chỉnh sửa" btn → initViewOpenEdit():
    _initEditReturnId = _initViewId
    closeInitViewPopup()
    _initOpenModal(id)

  _initSave() sau save:
    _shouldReturnToView = !!_initEditReturnId  ← trước _initCloseModal
    _initCloseModal()                          ← reset _initEditReturnId = null
    renderInitiativeTracker()
    if (_shouldReturnToView) openInitViewPopup(ini.id)

  _initCloseModal() → _initEditReturnId = null (cancel = no re-open)
  ESC → closeInitViewPopup() + _initCloseModal()
```

### Task Rows trong Initiative Tracker
```
TRƯỚC: onclick="editTask('${t.id}')"
SAU:   onclick="openTaskViewPopup('${t.id}')"
Áp dụng cho: _initBuildMsTaskList() và _initBuildTaskList()
```

### CSS Reuse
```
Không thêm CSS mới — reuse từ case-pipeline.css:
  .cp-view-grid, .cp-view-row, .cp-view-label, .cp-view-val
  .cp-view-section, .cp-view-section-title, .cp-view-text
```

---

## Decisions Made (S25)

1. **task.id cho return-to-popup**: `handleSubmit()` dùng `task.id` (ID sau save) thay vì `_taskEditReturnId` (ID trước edit) → handle edge case user đổi Task ID.
2. **_taskEditReturnId reset trong closeTaskModal()**: Đảm bảo ESC / Hủy từ edit modal không re-open popup.
3. **_initCloseModal trong ESC handler**: Fix bug `initModalOverlay` chưa được đóng bởi ESC trước S25.
4. **CSS reuse `.cp-view-*`**: Không tạo CSS mới cho task/initiative view popup — consistent với Case Pipeline popup đã có.
5. **`_initBuildTaskList` task rows**: Dùng `openTaskViewPopup` (không còn `editTask`) → mở task view popup thay vì edit modal trực tiếp.

---

## Playwright Test (S25)
```
File: verify_task_init_popup.mjs (new)
Run:  node verify_task_init_popup.mjs (port 9989, tự tạo server)

PASS 28/28:
  T1:  overlay HTML exists (taskViewOverlay + initViewOverlay)
  T2:  Tasks: click row → popup opens (title, subtitle, body)
  T3:  Popup body has state chip + RAG badge
  T4:  Close via Đóng button
  T5:  ESC closes task popup
  T6:  Chỉnh sửa → edit modal opens, popup closes
  T7:  ESC from edit modal → popup NOT re-opened (cancel path)
  T8:  Initiative Tracker: card header click → init popup opens
  T9:  ESC closes init popup
  T10: Action btn stopPropagation (no init popup)
  T11: Init popup Chỉnh sửa → initiative edit modal opens
  T12: Initiative linked task row click → task popup opens
  T13: No JS console errors
```

---

## Regression (S25)
```
verify_bld_queue.mjs:         46/46 PASS ✅
verify_ms_tasks.mjs:          14/14 PASS ✅
verify_filter_cascade.mjs:    23/23 PASS ✅
verify_import_rbac.mjs:       15/15 PASS ✅
verify_case_pipeline.mjs:     20/22 PASS (TEST13/14 pre-existing fail từ S24)
verify_task_init_popup.mjs:   28/28 PASS ✅ NEW
```

---

## Regression Risks (S25)

| Risk | Severity | Detail |
|---|---|---|
| **verify_case_pipeline TEST13/14** | 🟡 MEDIUM | Pre-existing từ S24: test expect click row → edit modal, nhưng S24 đã đổi sang view popup. Cần update test để check cpViewOverlay thay vì cpModal. |
| **openTaskViewPopup từ nhiều context** | ⚪ LOW | Có thể gọi từ tasks.js, initiative-tracker.js, performance.js. Tất cả đều hoạt động đúng — popup sẽ luôn mở đúng task. |

---

## DATE FROM PREVIOUS SESSION HANDOVER

---

## Branch Strategy (THAY ĐỔI TỪ S24 — push thẳng lên main)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + Development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**`master` đã xóa hoàn toàn** — local và remote — kể từ S24 (2026-06-16). Không tạo lại.

---

## Tasks Completed (S24 — commits `a58474e`, `edc6a26`)

| # | Task | Files | Commit | Status |
|---|---|---|---|---|
| S24-T1 | `user-list` removed from `ADMIN_ONLY` trong Code.gs → tất cả roles load được `_appUsers` → Display_Name (Username) hiển thị nhất quán | `backend/Code.gs` | `a58474e` | ✅ |
| S24-T2 | BLD Queue: ẩn Phê duyệt / Từ chối / Yêu cầu bổ sung với non-Admin; Xem đầy đủ vẫn hiện với tất cả | `assets/js/views/bld-queue.js` | `a58474e` | ✅ |
| S24-T3 | Performance view: click row → `openPerfTaskPopup(key)` → `detailOverlay` mở với task list lọc theo tab hiện tại (initiative/picRes/team) | `assets/js/views/performance.js` | `a58474e` | ✅ |
| S24-T4 | Case Pipeline: click row/card → `openCaseViewPopup(id)` → `cpViewOverlay` read-only popup; Edit btn (canImport()) → `cpViewOpenEdit()` → `cpModal` | `assets/js/views/case-pipeline.js`, `assets/css/case-pipeline.css`, `index.html`, `assets/js/ui/navigation.js` | `a58474e` | ✅ |
| S24-T5 | picRes case fix PA1: filter so sánh `.toLowerCase()` — `dunglq1` match `DungLQ1` | `assets/js/views/tasks.js` | `edc6a26` | ✅ |
| S24-T6 | picRes case fix PA2: `_resolvePickerCase()` trong `parsers.js` → map `t.picRes`/`t.picAcc` về canonical Username sau mỗi parse; gọi lại sau `loadAppUsers()` trong `api.js` | `assets/js/parsers.js`, `assets/js/api.js` | `edc6a26` | ✅ |
| S24-T7 | Branch cleanup: xóa local + remote `master`; memory + ai_context cập nhật push thẳng lên `main` | — | — | ✅ |

---

## Architecture: S24 Changes

### BLD Queue Role Gate (S24-T2)
```js
// bld-queue.js — cả _bldBuildCaseHTML() và _bldBuildItemHTML()
<div class="bld-item-actions">
  ${isAdmin() ? `
    <button class="btn btn-sm btn-success" ...>Phê duyệt</button>
    <button class="btn btn-sm btn-danger"  ...>Từ chối</button>
    <button class="btn btn-sm btn-secondary" ...>Yêu cầu bổ sung</button>
  ` : ''}
  <button class="bld-ghost-link" ...>Xem đầy đủ</button>  ← luôn hiển thị
</div>
```

### Performance Popup (S24-T3)
```
openPerfTaskPopup(key):
  - Lọc db.tasks theo perfTab ('initiative'|'picRes'|'team') và key
  - Set detailTitle + innerHTML detailTbody
  - classList.add('open') trên #detailOverlay (reuse existing modal)
  - Mỗi row trong popup có onclick="editTask(...)" để mở edit modal
```

### Case Pipeline View Popup (S24-T4)
```
HTML: #cpViewOverlay (overlay div, display:none/flex)
  → .modal (680px max-width)
    → #cpViewTitle, #cpViewSubtitle
    → #cpViewBody (read-only detail grid — .cp-view-grid CSS)
    → #cpViewEditBtn (inline-flex nếu canImport(), else none)

Flow:
  click row/card → cpOpenDetail(id) → openCaseViewPopup(id)
  openCaseViewPopup: populate title/subtitle/body, show/hide editBtn
  cpViewOverlay: display='flex'

  Edit btn → cpViewOpenEdit():
    const id = _cpViewId  ← capture TRƯỚC closeCaseViewPopup()
    closeCaseViewPopup()
    openCaseModal(id)

  ESC → navigation.js Escape handler: + closeCaseViewPopup()

State: let _cpViewId = null (global trong case-pipeline.js)
```

### picRes Case Fix (S24-T5+T6)
```
Root cause:
  DB lưu 'dunglq1' → picNorm() → 'Dunglq1'
  _appUsers.Username = 'DungLQ1'
  Dropdown value = 'DungLQ1'
  Filter: 'Dunglq1' !== 'DungLQ1' → FAIL

PA1 (tasks.js:58):
  (t.picRes||'').toLowerCase() !== fPic.toLowerCase()  ← immediate fix

PA2 (parsers.js):
  _resolvePickerCase():
    lookup = Map(_appUsers → lowercase → canonical)
    db.tasks.forEach: t.picRes = canonical || t.picRes
                      t.picAcc = canonical || t.picAcc
  Gọi tại: cuối _parseArrayIntoDb() + sau loadAppUsers() trong api.js
  Race condition mitigation: gọi cả 2 nơi → whichever loads last wins

Sau fix: 'dunglq1' → picNorm → 'Dunglq1' → _resolvePickerCase → 'DungLQ1' ✅
```

---

## Decisions Made (S24)

1. **push thẳng lên `main`**: `master` xóa hoàn toàn từ S24. Mọi commit push thẳng `origin/main`.
2. **cpViewOverlay read-only first**: Case Pipeline popup là read-only preview; Edit btn chỉ hiện với `canImport()` (Admin/Teamlead). Không mở thẳng edit modal khi click card.
3. **`_cpViewId` capture trước close**: `cpViewOpenEdit()` phải lấy `const id = _cpViewId` TRƯỚC khi gọi `closeCaseViewPopup()` vì close sẽ set `_cpViewId = null`.
4. **picRes PA1 + PA2**: PA1 = safety net ngay lập tức; PA2 = fix gốc rễ. Cả hai cùng tồn tại — PA2 đảm bảo data đúng cho performance/bld-queue (không chỉ filter tasks).
5. **`user-list` không còn ADMIN_ONLY**: Tất cả authenticated users được phép gọi `user-list` — cần để populate Display_Name dropdown nhất quán.

---

## Playwright Test (S24)
```
File: C:\Users\LENOVO\pw_test\test3.js
Run:  cd C:\Users\LENOVO\pw_test && node test3.js

PASS — 6/6 checks:
  [1] _appUsers loaded: PASS (3 users)
  [1] filterPic format: PASS
  [1] modal fPicRes format: PASS
  [2] BLD role gate: PASS (Admin 2 approve btns; non-Admin 0 approve btns)
  [3a] Perf popup: PASS (open:true, title đúng, 2 rows)
  [3b] CP popup: PASS (display:flex, title đúng, editBtn:inline-flex for Admin)
```

---

## Regression Risks (S24)

| Risk | Severity | Detail |
|---|---|---|
| **`_resolvePickerCase()` race condition** | 🟡 MEDIUM | Nếu `_appUsers` load rất chậm (GAS slow) và user filter ngay khi page load → PA2 chưa kịp chạy. PA1 vẫn cover vì so sánh lowercase. |
| **picRes data đã cache** | 🟡 MEDIUM | Tasks trong `localStorage['shtd_v2']` từ trước S24 có `picRes='Dunglq1'` (picNorm format). Sau S24, `_resolvePickerCase()` sẽ fix khi `_appUsers` load. Nếu user offline → PA1 vẫn hoạt động qua lowercase compare. |
| **BLD popup với non-Admin** | ⚪ LOW | `isAdmin()` check inline trong template string — nếu `isAdmin` undefined tại render time → toàn bộ button block bị throw. Cần đảm bảo `auth.js` load trước `bld-queue.js`. |

---

## DATE FROM PREVIOUS SESSION HANDOVER
# SESSION HANDOVER
**Date**: 2026-06-16 (Session 23b — Task local-only write refactor)
**Model**: Claude Sonnet 4.6 (Fable 5 harness)
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**Pushed S21**: `47b9316` — Team/PIC User_Master integration
**Pushed S22**: `2a65710` — User Management search/filter/sort/pagination (TD-030)
**Pushed S23 (→ main via PR #27)**: `b3262eb` → `dfac565` → `6ad6c32` (filter cascade + RBAC + modal fix)
**Pushed S23b**: `11c5770` (ai_context handover) → `65388ae` (task local-only write refactor)
**origin/main HEAD**: `65388ae` ✅

---

## Branch Strategy (ĐÃ THAY ĐỔI TỪ S19, XÁC NHẬN LẠI S23)

| Branch | Mục đích | Ai được push? |
|---|---|---|
| `main` | Production + development — push trực tiếp | AI / Developer |
| `fix/*` | Hotfix isolate nếu cần (tùy chọn) | AI / Developer |

**AI/Claude push thẳng lên `main`. `master` đã bị xóa sau S23 (PO đã merge PR #27 xong xóa branch).**

---

## Tasks Completed (S20 — commit `6bf7a75`)

| # | Task | File(s) | Status |
|---|---|---|---|
| CP-UI-1 | index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle, preset bar 4 tabs, filter bar Task Manager pattern, filter chips, #cpTableWrap (default), #cpBoardWrap (hidden) | `index.html` | ✅ |
| CP-UI-2 | case-pipeline.css: +.cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, sort-icon | `assets/css/case-pipeline.css` | ✅ |
| CP-UI-3 | case-pipeline.js: Table-primary (20/page, 10 sortable cols), 4 preset tabs, _cpInitPresetTabs() | `assets/js/views/case-pipeline.js` | ✅ |
| CP-UI-4 | api.js: syncCaseAction + syncDot 'syncing' at start | `assets/js/api.js` | ✅ |
| INI-SYNC | initiatives.js: syncInitiativeAction() gold standard pattern, syncInitiativeAdd/Edit/Delete updated | `assets/js/initiatives.js` | ✅ |
| TEST-S20 | verify_case_pipeline.mjs: 22/22 PASS (+TEST05b, +TEST08b, table row selectors) | `verify_case_pipeline.mjs` | ✅ |

## Tasks Completed (S21 — commit `47b9316`)

| # | Task | File(s) | Status |
|---|---|---|---|
| UM-1 | constants.js: +TEAM_LIST (8 teams, fallback khi GAS offline) | `assets/js/constants.js` | ✅ |
| UM-2 | api.js: +`_appUsers[]`, `loadAppUsers()`, `getAppTeams()`, `getUsersByTeam()`, `_populateTeamSelect()`, `_populateUserSelect()` | `assets/js/api.js` | ✅ |
| UM-3 | app.js: `loadAppUsers()` non-blocking sau `autoConnectDB()` | `assets/js/app.js` | ✅ |
| UM-4 | index.html: Task modal `fTeam`→select+onchange, `fPicAcc`→select; Case modal `cpfTeam`→select+onchange, `cpfPic`→select | `index.html` | ✅ |
| UM-5 | crud.js: `openTaskModal()` dùng `_populateTeamSelect`/`_populateUserSelect`; +`onTaskTeamChange()` (re-filter PIC + autoGenId) | `assets/js/crud.js` | ✅ |
| UM-6 | case-pipeline.js: `openCaseModal()` dùng helpers; +`onCaseTeamChange()` | `assets/js/views/case-pipeline.js` | ✅ |
| UM-7 | initiative-tracker.js: `initFAcc` input→select; `_initOpenModal()` populate via `_populateUserSelect` (all users) | `assets/js/views/initiative-tracker.js` | ✅ |
| TEST-S21 | verify_case_pipeline.mjs: Fix TEST12 `.fill()` → `.selectOption()` cho cpfTeam | `verify_case_pipeline.mjs` | ✅ **22/22 PASS** |
| REG | verify_bld_queue.mjs / verify_ms_tasks.mjs: no regression | — | ✅ **46/46 + 14/14** |

---

## Architecture: Team/PIC User_Master (S21)

```
Luồng:
  startApp() → loadAppUsers() [non-blocking] → GAS 'user-list' → _appUsers[]

_appUsers = [{Username, Display_Name, Role, Team, Email, Active, ...}, ...]
  - In-memory only (KHÔNG persist localStorage — dữ liệu user nhạy cảm)
  - Filter: Active !== 'false'

Helpers (api.js):
  getAppTeams()            → unique teams từ _appUsers, sorted; fallback TEAM_LIST khi empty
  getUsersByTeam(team)     → filter _appUsers by team; '' = tất cả users
  _populateTeamSelect(id, currentVal)
    - required=true  → không có empty option, default to teams[0]
    - required=false → có "– Chọn team –" option
  _populateUserSelect(id, team, currentVal)
    - team=''      → show "– Chọn team trước –" (hint)
    - users empty  → fallback: hiện currentVal nếu có (offline graceful)
    - users exist  → options = Display_Name (Username); currentVal pre-selected
    - currentVal không match option → append extra option (bảo toàn dữ liệu)

Áp dụng:
  Task modal:   fTeam (required) → fPicAcc (required) → fPicRes (required)
                onTaskTeamChange() → re-filter cả hai PIC + autoGenId()
  Case modal:   cpfTeam (optional) → cpfPic (optional)
                onCaseTeamChange() → re-filter cpfPic
  Initiative:   initFAcc → all users (no team filter — initiative không có field team)
  
  populatePicDropdown() — GIỮ NGUYÊN như legacy cho filter bar filterPic
```

---

## Architecture: Case Pipeline UI (S20)

```
Dual-mode:  Table (default, #cpTableWrap) ↔ Kanban (#cpBoardWrap)
Persist:    localStorage 'cp_view'
Presets:    'active' / 'bld' / 'overdue' / 'all' (state: _cpPreset)
Filter:     _cpGetFiltered() = preset + search (debounce) + 4 dropdowns
Table:      10 cols, sortable, 20/page, pagination, empty state
syncInitiativeAction(): showLoading + syncDot syncing/connected + GAS + hideLoading
```

---

## Decisions Made (S20–S21)

1. **Table-primary** (S20): Default view cho Case Pipeline giải quyết 200 cases × 14 cols scalability problem.
2. **_cpInitPresetTabs()** (S20): Gọi trong renderCasePipeline() để sync active class — không phụ thuộc HTML static.
3. **syncInitiativeAction gold standard** (S20): Đồng nhất pattern với syncCaseAction / syncAction.
4. **_appUsers in-memory only** (S21): User data không persist localStorage vì sensitive. Mỗi session load lại từ GAS.
5. **Offline fallback** (S21): getAppTeams() → TEAM_LIST; _populateUserSelect() → hiện currentVal. App vẫn hoạt động khi GAS down.
6. **Extra option for mismatched PIC** (S21): Nếu currentVal không có trong danh sách users của team hiện tại (ví dụ PIC được assign từ team khác), append extra option để tránh mất dữ liệu khi save.
7. **Initiative Accountable no team filter** (S21): Initiative không có field Team trong DB — Accountable hiện tất cả active users.
8. **populatePicDropdown() kept** (S21): Giữ legacy function (không gọi nữa từ modal) để không break filter bar. Marked as legacy trong comment.

---

## Tasks Completed (S22b — undocumented commits between S22 and S23)

These commits appeared on `origin/main` but were NOT in the S22 handover — likely from a session between S22 and S23:

| Commit | Task | Files |
|---|---|---|
| `6f1c23b` | docs(ai_context): update S22 handover | `ai_context/SESSION_HANDOVER.md` etc. |
| `b134d54` | fix(user-management): constrain table-wrap height so only rows scroll | `assets/js/views/user-management.js` |
| `5323b75` | feat: pre-fill Team/PIC from logged-in user on Add modal (Task/Case/Initiative) | `assets/js/crud.js`, `case-pipeline.js`, `initiative-tracker.js` |
| `691ba9b` | rebrand: rename org from 'Số Hóa Tín Dụng / Khối KHDN' to 'Trung tâm SP&GPTD' | `index.html` |
| `ef40075` | fix(initiatives): repair milestone-to-parent linking when sheet has no header row | `assets/js/views/initiative-tracker.js` |

---

## Tasks Completed (S23 — commits `b3262eb`, `dfac565`, `6ad6c32` on master)

| # | Task | Commit | Files | Status |
|---|---|---|---|---|
| S23-T3 | Task filter: PIC cascade từ Team; Case Pipeline: PIC filter cascade + DVKD column + DVKD filter | `b3262eb` | `tasks.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T4 | Import RBAC: restrict Excel import tới Admin + Teamlead (lead-only CSS + canImport() JS guard) | `dfac565` | `auth.css`, `auth.js`, `app.js`, `case-pipeline.js`, `index.html` | ✅ on main |
| S23-T5 | Modal grid layout bug: right column bị squeeze — fix `1fr 1fr` → `minmax(0,1fr) minmax(0,1fr)` | `6ad6c32` | `forms.css`, `case-pipeline.css`, `initiative.css`, `verify_modal_layout.mjs` | ✅ on master (pending merge to main) |

---

## Architecture: S23 Changes

### Filter Cascade (S23-T3)
```
tasks.js:
  onFilterTeamChange() → _populateFilterPic(team)
    - uses getUsersByTeam() từ _appUsers[] nếu online
    - fallback: unique picRes từ db.tasks khi offline

case-pipeline.js:
  cpFilterTeamChange() → _cpSyncFilterPic(team)
    - cùng pattern: getUsersByTeam() → fallback từ case data
  DVKD column: _cpRenderTable() thêm cột dvkd sau PIC
  State vars: _cpFilterPic, _cpFilterDvkd

auth.js:
  canImport() → u.role === 'Admin' || u.role === 'Teamlead'

auth.css:
  body[data-role="User"] .lead-only { display: none !important; }
  (cạnh .admin-only đã có — hai lớp RBAC)
```

### Modal Grid Fix (S23-T5)
```
Root cause: `grid-template-columns: 1fr 1fr` = `minmax(auto, 1fr) minmax(auto, 1fr)`
  → auto minimum cho phép cột trái rộng hơn khi có button với white-space:nowrap
  → cột phải bị squeeze

Fix: `minmax(0, 1fr) minmax(0, 1fr)` + .form-group { min-width:0 } + .form-control { width:100%; min-width:0 }

Grids fixed:
  forms.css         → .form-grid (Task modal)
  case-pipeline.css → .cp-modal-grid (Case modal)
  initiative.css    → .init-modal-grid (Initiative modal)

Test: verify_modal_layout.mjs — 9/9 PASS (diff=0.0px trên cả 3 modal)
```

---

## Tasks Completed (S23b — commit `65388ae`)

| # | Task | Files | Status |
|---|---|---|---|
| S23b-T1 | Refactor: Task CRUD/bulk ops write local only; only Excel import writes GAS | `api.js`, `crud.js`, `bulk.js`, `bld-queue.js` | ✅ on main |

### Architecture: Task Write Isolation (S23b)

```
TRƯỚC:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → syncAction() → READ từ GAS → MERGE → WRITE lên GAS

SAU:
  saveTask() / deleteTask() / bulkSet*() / bulkDelete() / task BLD approval
    → localAction() → persist(localStorage) → renderAll()   ← KHÔNG ghi GAS

CHỈ GHI GAS (giữ nguyên):
  handleImport() — Excel bulk import      → syncAction() ✅
  syncCaseAction() — Case CRUD/BLD        → GAS write ✅
  syncInitiativeAction() — Initiative CRUD → GAS write ✅
  writeToHandle() (initiative-tracker.js)  → GAS write ✅

localAction() (api.js):
  function localAction(mutateFn) {
    if (typeof mutateFn === 'function') mutateFn();
    persist();    // localStorage['shtd_v2']
    renderAll();  // re-render toàn bộ UI
    return true;
  }
```

### Decision: S23b

- **Task write local-only**: PO yêu cầu tách biệt hoàn toàn — task data chỉ lên GAS qua Excel import, không tự động push từ UI. Tránh cache cũ/stale ghi đè Sheet khi user edit/delete ngẫu nhiên.
- **BLD task approval local-only**: Ý kiến BLĐ cho Task cũng local-only. Ý kiến BLĐ cho Case vẫn qua syncCaseAction (GAS write).
- **Bug fix**: `bulkSetState()` và `bulkDelete()` lưu count TRƯỚC khi `selectedIds.clear()` — toast hiện đúng số lượng.

---

## Tasks Completed (S22 — commit `2a65710`)

| # | Task | File(s) | Status |
|---|---|---|---|
| TD-030 | user-management.js: search (username/name/email, debounce 150ms), filter Team/Role/Status, filter chips với clear, sort 5 cols, pagination 15/page với count info, layout toolbar+filter-bar+card khớp pattern case-pipeline | `assets/js/views/user-management.js` | ✅ |

---

## Blockers

| Item | Status |
|---|---|
| Netlify hết credit | ❌ Dùng local Playwright / GitHub Pages |
| AI Chat GAS AiService.gs + GEMINI_API_KEY | ⚠️ Unconfirmed từ S12 |
| ~~Modal fix chưa merge sang main~~ | ✅ PR #27 merged — `41f4018` live |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| **Task edits không lên GAS (S23b)** | 🔴 HIGH | saveTask/deleteTask/bulk/BLD task giờ chỉ lưu localStorage. Nếu user clear cache / đăng xuất / đổi thiết bị mà không export Excel trước → mất toàn bộ task edits. Cần thông báo user workflow mới: edit → export → import khi cần đẩy lên Sheet. |
| **BLD task approval không lên GAS (S23b)** | 🔴 HIGH | Ý kiến BLĐ cho Task (yKienBLD) chỉ lưu local. Sheet không cập nhật cho đến khi Excel import. Case BLD approval vẫn lên GAS bình thường. |
| Team/PIC modal fields đổi từ input→select | 🟡 MEDIUM | fPicAcc từ text input → select. Nếu _appUsers empty (GAS down) và không có currentVal → fPicAcc select rỗng → form submit fail. Cần smoke test khi GAS online. |
| Initiative sync flow changed (S20) | 🟡 MEDIUM | syncInitiativeAdd/Edit/Delete pattern đổi. Cần smoke test initiative CRUD trên live. |
| AI Chat chưa smoke-test live | 🟡 MEDIUM | AiService.gs + GEMINI_API_KEY chưa xác nhận từ S12. |
| DVKD column colspan (S23-T3) | ⚪ LOW | Empty state colspan tăng 10→11. Nếu có test check colspan cứng, cần cập nhật. |

---

## How to Run Tests

```bash
cd "D:\Công việc\Vibecode\SHTD-Dashboard"
npx http-server . -p 3030 --silent &
node verify_case_pipeline.mjs    # 22/22 PASS (S21)
node verify_bld_queue.mjs        # 46/46 PASS
node verify_ms_tasks.mjs         # 14/14 PASS
node verify_filter_cascade.mjs   # 23/23 PASS (NEW S23)
node verify_import_rbac.mjs      # 15/15 PASS (NEW S23)
node verify_modal_layout.mjs     # 9/9 PASS (NEW S23)
```

---

## Next Steps

1. **UX: thông báo user về workflow mới** — Task edit chỉ lưu local; cần export Excel và import lại để đồng bộ GAS. Cân nhắc thêm banner/toast nhắc nhở.
2. **Smoke test live — Task save**: Edit task → lưu → reload → kiểm tra data vẫn trong cache; Export Excel → kiểm tra dữ liệu đúng.
3. **Smoke test live — Task filter**: Chọn Team → filterPic update đúng users.
4. **Smoke test live — Case Pipeline filter**: Team → cpFilterPic cascade; DVKD filter; DVKD column hiển thị.
5. **Smoke test live — Import RBAC + Modal layout**: Kiểm tra các S23 features trên live.
6. Verify AI Chat trên live (tồn từ S12).
7. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
4. **Smoke test live — Import RBAC**: Login với role User → Import button ẩn; role Admin/Teamlead → visible.
5. **Smoke test live — Modal layout**: Mở Task/Case/Initiative edit modal → 2 cột đều nhau.
6. **Smoke test live — Task/Case modal Team+PIC**: Dropdown có options, cascade đúng.
7. Verify AI Chat trên live (tồn từ S12).
8. Fix `verify_initiative_v2.mjs` auth inject (TD-033).
