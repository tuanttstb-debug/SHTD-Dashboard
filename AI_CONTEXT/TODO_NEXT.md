# TODO — NEXT SESSION
**Prepared**: 2026-08-23 (Session 79 — DEBUG email nhắc việc lệch ngày/định dạng: fix tận gốc 3 tầng)
**Context**: S79 done (backend-only). v6.52 giữ nguyên. `verify_notif_retract` **41/41**, `verify_notifications` **21/21**. ✅ [TT] đã redeploy GAS (link không đổi).

## ✅ COMPLETED S79 — Email nhắc việc lệch ngày/tháng + định dạng (backend)
- [x] Truy vết `NotificationService.gs` → 2 lỗi gốc: (A) NotifID không gồm ngày → không cập nhật khi deadline đổi + không thu hồi khi deadline dời khỏi ngưỡng; (B) `_notifMessage_` echo ngày thô theo locale ô.
- [x] NEW `_notifFmtDue()` → chuẩn hoá DD/MM/YYYY (thủ công, không lệch TZ, parse fail giữ nguyên).
- [x] `_notifMessage_` + `_notifMakeRec_` dùng `_notifFmtDue` (Message + cột DueDate).
- [x] NEW `_notifReconcileDue_` thay `_notifRetractStale_` trong `notifScan`: làm tươi ngày + thu hồi moved-away/done/mất.
- [x] `verify_notif_retract` **41/41** (+NR11–14); `verify_notifications` **21/21**. ✅ [TT] redeploy GAS.

## 🟡 PRIORITY 1 — Nghiệm thu S79
| Check | Expected |
|---|---|
| [TT] chạy tay `notifScan()` 1 lần (GAS editor) | Log `làm tươi N, thu hồi M`; tồn kho noti dọn ngay |
| Kỳ digest kế | Ngày đúng **DD/MM/YYYY**, hết chuỗi locale "31-Jul-26" thô |
| Task đã dời deadline sang tương lai | KHÔNG còn bị nhắc "Quá hạn" trong email/chuông |
| Task còn overdue thật (deadline quá khứ) | Vẫn nhắc, ngày hiển thị khớp deadline hiện tại |

## 🟢 PRIORITY 2 — Nợ nối tiếp S79 (tùy chọn)
- [CC] Gộp `_notifFmtDue` (backend) với `toISODate`/`fmtDate` (FE) thành 1 nguồn nếu tách module chung — xem TD-NOTIF-03.


## ✅ COMPLETED S78 — CR Kanban "Công việc của tôi" (thuần FE, v6.52)
- [x] Cột "Cần thực hiện" gộp đúng 4 trạng thái (Chưa bắt đầu / Hoàn thành chuẩn bị / Tạm dừng / Blocked) — constant `MW_KB_TODO_STATES`, giữ negative-filter → không mất task lạ.
- [x] Scroll đồng nhất cả 3 cột Kanban (`.mw-kb-col-body-scroll`, `max-height:520px`).
- [x] Filter theo nhân sự (Teamlead/Admin): `_mwPersonFilterHtml`/`mwSetPersonFilter`, distinct picRes/picAcc trong scope, áp cả List+Kanban qua `_mwScopedTasks`; reset khi đổi team; User thường ẩn droplist.
- [x] i18n +2 key VI/EN; bump v6.52 + cache-bust `?v=20260822` (65 refs). `verify_my_work` **91/91** (+KB8/KB9/PF1–PF5).

## 🟡 PRIORITY 1 — Nghiệm thu S78 (hard-reload PRD → badge v6.52)
| Check | Expected |
|---|---|
| Kanban cột "Cần thực hiện" | Gồm task Tạm dừng / Blocked / HT chuẩn bị / Chưa bắt đầu |
| To-do + In-process nhiều task | Cuộn dọc trong khung (không kéo dài trang) như cột "Vừa đóng" |
| (Teamlead/Admin) chọn 1 nhân sự ở droplist | Board thu về đúng task người đó (Res/Acc) ở cả List lẫn Kanban |
| User thường | KHÔNG thấy droplist nhân sự |

## 🟢 PRIORITY 2 — Nợ nối tiếp S78 (tùy chọn)
- [CC] Nếu cần thứ tự "đóng gần nhất" chính xác → thêm cột **Closed Date** (TD-MW-02) thay proxy Deadline desc.
- [CC] Cân nhắc **persist person filter** theo phiên (localStorage) nếu [TT] thấy tiện; hiện in-memory reset khi reload.

---

# (S77) TODO — giữ tham khảo
**Prepared**: 2026-08-22 (Session 77 — DateGuard chống lệch định dạng ngày tận gốc)
**Context**: S77 done. Backend-only (KHÔNG bump client). NEW `backend/DateGuard.gs` + `verify_date_guard.mjs` **29/29**. ✅ [TT] đã cài GAS (migration + trigger). FE đã sạch (audit, 0 đổi).

## ✅ COMPLETED S77 — DateGuard (2 tầng: onEdit real-time + daily scan)
- [x] Truy vết vụ báo cáo AIOS deadline sai → chứng minh **AIOS đúng file, GAS chỉ relay HTML, không cần deploy** (xem HANDOVER S77).
- [x] NEW `backend/DateGuard.gs`: `dateGuardOnEdit` (viết lại ISO khi sửa cột ngày quản lý) + `dailyDateGuard()`@7h + `installDateGuardTriggers`/`uninstall`/`dateGuardSelfTest`. Tái dùng `_dnToISO`/`_DN_TARGETS`.
- [x] Audit FE reader/writer → đã chuẩn S67.2 (writer→`fmtDateExport`, reader→`toISODate`); 0 đổi.
- [x] `verify_date_guard.mjs` 29/29 + `run_tests.mjs`. ✅ **[TT] đã cài GAS + chạy migration + trigger.**

## 🟡 PRIORITY 1 — Nghiệm thu S77 (kỳ gửi email tới)
| Check | Expected |
|---|---|
| Kỳ báo cáo tuần AIOS kế | Deadline trong email **khớp DB** (không lệch như `BL1-026`) |
| Sửa 1 ô ngày kiểu `31-thg 8-26` trên Sheet → reload | Thành `2026-08-31` (onEdit real-time) |
| (GAS editor) xem log `dailyDateGuard` sáng kế | fix/bad hợp lý; ô "bad" (không parse) được liệt kê để rà tay |

## 🟢 PRIORITY 2 — Nợ nối tiếp S77 (tùy chọn)
- **TD-DATE-02**: cột "kiểu đã nhập" chặn khoá '@' → hiển thị có thể localise (giá trị nền vẫn đúng). Gỡ column-type trên Sheet nếu muốn hiển thị ISO tuyệt đối.
- **TD-DATE-03**: mở rộng guard cho 8 sheet H2_* nếu KPI nhập ngày tay.

---

# (S76) TODO — giữ tham khảo
**Prepared**: 2026-08-21 (Session 76 — My Work role-scope + Kanban + loại email nhắc việc CuongVM1)
**Context**: S76 done (code). v6.50-mywork-kanban-personal-scope-20260821, `?v=20260821`. `verify_my_work` **78/78**, `verify_notif_retract` **24/24**, full suite **35/36** (chỉ `issue_tracker` flaky batch — standalone 61/61). Item 2+3 thuần FE; **Item 1 (loại email nhắc việc CuongVM1) CHƯA redeploy GAS**.

## ✅ COMPLETED S76
- [x] **Item 2** — `_mwScopedTasks` role-aware: User=`picRes∪picAcc`, Teamlead=team (giữ cũ), Admin=all-center + droplist (mặc định team Admin). Bỏ `t.team===uteam` áp-mọi-role.
- [x] **Item 3** — toggle List⇄Kanban (persist), 3 cột To-do/In-process/Closed, FTE≥3 (picRes) badge đỏ + banner, Closed proxy Deadline desc cap 15, droplist team cho Admin. CSS + i18n +11 key.
- [x] **Item 1** — `NotificationService._notifDigestSuppressSet_` (Report_Config.Digest_Suppress, fallback `['cuongvm1']`) + `_notifSendDigests_` bỏ gửi user suppress (vẫn mark EmailedDate). `ReportEmailService.setupReportConfig` +dòng Digest_Suppress.
- [x] Tests + version bump v6.50 + cache-bust `?v=20260821` (65 refs).

## ✅ COMPLETED S76.1 — 2 CR UI (thuần FE, v6.51, `?v=20260821b`)
- [x] **CR1** — Kanban cột "Vừa đóng" bỏ cap 15 → hiện TẤT CẢ trong khung `max-height:520px` cuộn dọc + đếm tổng (`.mw-kb-col-body-scroll`, chỉ cột Closed). `verify_my_work` +KB7 → **82/82**.
- [x] **CR2** — H2 "Theo dõi KPI" task-link: bảng đầy đủ giống concept "Theo dõi Initiative" (`init-task-table`), toggle `≡ N task ▾` (giữ mở qua `_h2OpenMsTasks`), cột Mã·Task·Trạng thái+RAG·PIC·%HT·Deadline+badge quá hạn + unlink. `NEW _h2BuildMsTaskTable/h2ToggleMsTasks`. `verify_h2_tasklink` **29/29**. KHÔNG đụng backend/RBAC.
- [x] Full suite **35/36** (issue_tracker flaky batch, standalone 61/61). KHÔNG cần deploy GAS.
- **Smoke**: hard-reload → badge `v6.51`; Kanban "Vừa đóng" cuộn khi >~8 task; H2·KPI bấm "N task ▾" → bảng đầy đủ thuộc tính, badge "Quá hạn" đỏ, × bỏ link.

## 🔴 PRIORITY 0 — Redeploy GAS (Item 1) + smoke
| Bước | Action | Expected |
|---|---|---|
| 1 | Hard-reload PRD (Ctrl+Shift+R) | Badge `v6.50-mywork-kanban-personal-scope-20260821` |
| 2 | User thường vào **Công việc của tôi** | Chỉ thấy task mình (picRes/picAcc), KHÔNG còn cả team |
| 3 | Teamlead / Admin vào My Work | Teamlead = full team; Admin có droplist (mặc định team mình) + "Tất cả trung tâm" |
| 4 | Bấm toggle **Kanban** | 3 cột; To-do quá-hạn trên đầu; In-process banner đỏ + badge "Quá tải" khi 1 người ≥3 task "Đang thực hiện"; "Vừa đóng" mới nhất trên cùng |
| 5 | **[TT] Redeploy GAS** (patch `NotificationService.gs` + `ReportEmailService.gs` → redeploy Web App, link KHÔNG đổi) | route/digest mới live |
| 6 | (GAS editor) `setupReportConfig()` nếu chưa có sheet Report_Config | sheet có dòng `Digest_Suppress=CuongVM1` (chỉnh trực tiếp để đổi) |
| 7 | Digest sáng kế | CuongVM1 **không** nhận email nhắc việc; vẫn nhận chuông + (khi bật) email báo cáo |

## 🟢 PRIORITY 2 — Nợ nối tiếp
- **(nợ S75)** redeploy route `send-report` + điền Email `User_Master` (CuongVM1 + Teamlead) cho báo cáo định kỳ — **gộp cùng lượt redeploy Item 1**.
- **Closed Date thật**: "Vừa đóng" hiện xếp theo Deadline (proxy). Nếu cần chính xác thời điểm đóng → thêm cột Closed Date + set khi state→Hoàn thành (schema change như RAG S73).
- `issue_tracker` flaky batch (loginOverlay chặn pointer khi song song) — thay `page.click` bằng chờ overlay ẩn (TD-TEST).

---

## ✅ COMPLETED S74 — Notification retract (task đã đóng vẫn nhắc)
- [x] **Gốc**: noti KHÔNG thu hồi khi entity chuyển done — `notifScan` chỉ bỏ qua task done khi sinh candidate MỚI; nhắc `overdue`/`due-*` đã ghi khi còn mở thì nằm lại (chỉ `_notifPurge_` xóa khi đã-đọc & >30 ngày); đóng task chỉ append "closed". Trỏ DB **ĐÚNG** (không phải nguyên nhân).
- [x] **Fix RETRACT 3 tầng** (`backend/NotificationService.gs`): (1) real-time `notifOnWrite` `nowDone`→`_notifRetractEntity_()`; (2) daily `notifScan` `_notifLiveState_()`+`_notifRetractStale_()` (trước digest → email sạch, tự chữa tồn kho + đóng ngoài app); (3) `notifRetractStalePreview()` dry-run. Chỉ due-types; retract=mark-read; bump `DATA_VER`.
- [x] `verify_notif_retract.mjs` **19/19** (NEW) + `run_tests.mjs`; `config.js` v6.49; `index.html` `?v=20260816` (65 refs). ✅ **GAS redeployed**.

## 🔴 PRIORITY 0 — Dọn backlog + smoke (S74)
| Bước | Action | Expected |
|---|---|---|
| 1 | (GAS editor) `notifRetractStalePreview()` | Log số nhắc due/overdue sẽ thu hồi + mẫu `[done]/[missing]` |
| 2 | `notifScan()` chạy tay 1 lần | Dọn backlog ngay (không chờ trigger 8h); log `thu hồi N` |
| 3 | Hard-reload (Ctrl+Shift+R) | Badge `v6.49-notif-retract-closed-20260816` |
| 4 | Đóng 1 task đang có nhắc overdue → chuông/reload | Nhắc task đó **biến mất** (không còn task đã đóng trong chuông) |
| 5 | Digest sáng kế | Không còn nhắc task đã đóng |

## 🟢 PRIORITY 2 — Nợ nối tiếp S74 (tùy chọn)
- **Gap task đóng NGOÀI app** (sửa Sheet tay/migration): chỉ sạch ở lần `notifScan` kế (daily). Nếu cần tức thì → thêm live-filter trong `notifRead` (đọc lại entity mỗi poll — nghịch tuning S72, cân nhắc). Xem TD-NOTIF-01.
- **(nợ S57)** điền cột Email `User_Master` cho digest.

---

# (S73) TODO — giữ tham khảo
**Prepared**: 2026-08-14 (Session 73 — REVERT ownership-load + Fix cột RAG Task_Master)
**Context**: S73 done. v6.48-task-rag-column-persist-20260814, `?v=20260814c`. HEAD `01c12cd` (`a0b7418` v6.46 → `e15f99b` REVERT v6.47 → `01c12cd` RAG col v6.48). `verify_task_rag` **5/5**, `my_work` **62/62**, `atomic_write` **41/41**; full suite **33/34** (chỉ `bld_queue` timing-flaky). Client v6.48 **thuần FE + migration** — GAS đọc/ghi cột động nên **KHÔNG cần redeploy Web App**.

---

## ✅ COMPLETED S73
- [x] **S73.1 Ownership-load (v6.46) → REVERT (v6.47)**: Phase A/B/C (dirty-guard + My Work flush + batch-read `scope=mine` + full-load nền). Test 8/8, push `a0b7418`. User báo **mất data khi Ctrl+Shift+R/Sync (mọi role)** → **revert toàn bộ** về v6.45 (`e15f99b`). Gốc: scoped read trả rỗng → `db.tasks=[]` + persist cache rỗng; full-load nền timeout không cứu. Revert client-only đủ (không cần redeploy GAS). **KHÔNG tái áp** (xem TD-LOAD-01).
- [x] **S73.2 Fix cột RAG (v6.48)** `01c12cd`: Task_Master thiếu cột RAG → `taskToRow` bỏ qua → RAG bấm My Work không lưu. **Hợp nhất RAG=`t.status`** (Green/Amber/Red); My Work dots đổi sang t.status; +cột 25 'RAG' (Y); parser tự map header 'rag'→status. NEW `RagColumnMigration.gs` + `verify_task_rag.mjs`.

## 🔴 PRIORITY 0 — Chạy migration RAG + smoke (S73.2)
| Bước | Action | Expected |
|---|---|---|
| 1 | Apps Script editor → thêm `RagColumnMigration.gs` → chạy **`dryRunAddRag()`** | Logger: RAG col=**25 (Y)**, State col, phân bố backfill, **0 cảnh báo**. Nếu cảnh báo "lệch cột / lastCol≠24" → **DỪNG, gửi log** (taskToRow positional) |
| 2 | 0 cảnh báo → chạy **`commitAddRag()`** | set Y1='RAG' + backfill từ Trạng thái + bump DATA_VER |
| 3 | Hard-reload (Ctrl+Shift+R) | badge `v6.48-task-rag-column-persist-20260814` |
| 4 | My Work → bấm RAG (🟢🟡🔴) 1 task → reload/Sync | RAG **GIỮ nguyên** (đã ghi sheet cột Y) |
| 5 | Đối chiếu RAG My Work ↔ Dashboard ↔ Action Plan ↔ modal Sửa | Cùng 1 giá trị (đồng bộ) |

## 🟢 PRIORITY 2 — Nợ nối tiếp S73 (tùy chọn)
- **exportExcel `ws['!cols']`** thiếu 1 width cho cột RAG (cosmetic — cột vẫn xuất, default width).
- **Phase A/B (dirty-guard)** đã bỏ theo revert — chỉ làm lại nếu xác nhận có race optimistic-write THẬT (gốc bug thật là schema RAG, không phải race).
- **(nợ cũ)** ~70 PNG `test-results` dirty → `git restore test-results/`; blank `.user-pill` (TD-AUTH-01); `bld_queue` timing-flaky (TD-TEST-06).

---

# (S72) TODO — giữ tham khảo
**Prepared**: 2026-08-13 (Session 72 — Tuning tổng thể tầng gọi GAS P1–P3)
**Context**: S72 done. v6.45-gas-tuning-p3-versiongate-20260813, `?v=20260813c`. HEAD `d49d0be` (3 commit P1 `892fe3c` / P2 `c304823` / P3 `d49d0be`). ✅ **GAS redeploy xong (link KHÔNG đổi), smoke PASS.** `verify_startup_nonblocking` **10/10**; full suite 33/33 (2 flaky batch pre-existing: i18n_p6/bld_queue).

---

## ✅ COMPLETED S72 — Tuning tầng gọi GAS (giữ kết nối + mượt khi data lớn)
- [x] **Gốc**: khởi động bắn ~8 request GAS đồng thời (1 host → xếp hàng + GAS tuần tự hoá; `h2-read-all` mở 8 sheet bắn ngay dù H2 ngủ; Task ~1500 dòng). S71 nới timeout chỉ chữa triệu chứng.
- [x] **P1 (`892fe3c`, v6.43, thuần FE)**: cache-first không chặn UI (`_startupSync`+`_runPool` concurrency=2 → fan-out **8→2**), lazy-load H2 (`_ensureH2Loaded`), poll notif **5'→15'+visibility**, `GAS_AI_TIMEOUT_MS=120s`. NEW `verify_startup_nonblocking.mjs`.
- [x] **P2 (`c304823`, v6.44, GAS)**: NEW action `batch-read` gộp 7→**1** + spreadsheet mở 1 lần (8 reader optional `ss`); client `readAll()` + **fallback** read lẻ; `_markConnected()`.
- [x] **P3 (`d49d0be`, v6.45, GAS)**: NEW `CacheLayer.gs` `DATA_VER`; **version gate** (`notModified` khi không đổi; LIVE khi đổi); bump ver trong `auditLog`+`notifScan`; AI context cache theo ver. Client gửi/lưu `db._dataVer` (loadCache khôi phục).
- [x] ✅ **GAS redeploy** (thêm `CacheLayer.gs` + Code/Audit/Ai/Notification + reader `ss`), link KHÔNG đổi. Smoke PASS 3 phase.

## 🟢 PRIORITY 2 — Nợ nối tiếp S72 (tùy chọn)
- **P3.3 Archival** (chưa làm): khi Task_Master phình >1500 dòng đáng kể → tách sheet `Task_Archive` (Done cũ), read nóng quét ít dòng. Migration dryRun/commit. Chỉ cần khi data còn phình.
- **Transfer khi data ĐỔI vẫn nặng** (TD-NET-04): version gate miễn phí khi KHÔNG đổi; khi đổi tải full ~1500 dòng (cache server cố ý bỏ tránh stale). Nếu thành nút thắt: delta-read theo dòng đổi (phức tạp).
- **⚠️ Sau MIGRATION chạy tay** (DateNormalize/ReportWeek/Seed…): migration KHÔNG bump `DATA_VER` → client có thể `notModified` oan → **hard-reload** (hoặc thêm `_bumpDataVer()` cuối migration). Xem TD-NET-03.
- **Test backend GAS** (TD-TEST-07): batch-read/version-gate/cache chỉ verify qua MOCK; đường GAS thật = smoke tay.
- **(nợ cũ)** ~70 PNG `test-results` dirty → `git restore test-results/`; blank `.user-pill` (TD-AUTH-01).

---

# (S71) TODO — giữ tham khảo
**Prepared**: 2026-08-12 (Session 71 — Fix timeout load dữ liệu mạng nội bộ (regression S69))
**Context**: S71 done. v6.42-internal-net-read-timeout-20260812, `?v=20260812e` (65 refs). Full suite **31/32** (fail duy nhất `verify_bld_queue` = 404 flaky pre-existing, đã chứng minh qua `git stash`). **Thuần frontend — KHÔNG deploy GAS mới.**

---

## ✅ COMPLETED S71 — Fix timeout tải dữ liệu trên mạng nội bộ (regression từ S69)
- [x] **Gốc**: S69 áp timeout **phẳng 30s** cho MỌI request (`gasPost`). Login (payload nhỏ) sống; nhưng **read** dữ liệu (toàn bộ sheet, payload lớn) trên mạng nội bộ bị ANBM bóp băng thông cần >30s → AbortController cắt oan → "timeout". Mạng ngoài đủ băng thông nên OK.
- [x] **Fix (thuần FE, chốt qua phỏng vấn user)**: tách timeout theo loại request. `auth.js` NEW `GAS_READ_TIMEOUT_MS=90000` + `gasPost(body, timeoutMs)` (mặc định 30s cho tương tác). Mọi **bulk read** truyền 90s: `read`/`case-pipeline-read`/syncAction-read/`user-list`/`issue-read`/`dev-read`/`notif-read`/`audit-read` (api.js), `initiative-read` (initiatives.js), `h2-read-all` (h2-core.js), `kpi-read` (kpi-parser.js), UM `user-list` (user-management.js). **Writes/upsert/delete GIỮ 30s** (fail nhanh).
- [x] `app.js` — grace-window auth `35s→95s` (`GAS_READ_TIMEOUT_MS+5s`) để read chậm trả `AUTH_REQUIRED` muộn không xóa oan phiên; 2 overlay (`autoConnectDB`/`syncDB`) thêm phụ đề "mạng nội bộ có thể chậm, vui lòng chờ".
- [x] `config.js` v6.42; cache-bust `?v=20260812d`→`e` (65 refs). 6 file JS pass `node --check`; full suite 31/32 (bld_queue 404 flaky pre-existing).

## 🔴 PRIORITY 0 — Smoke test S71 trên MẠNG NỘI BỘ
| Bước | Action | Expected |
|---|---|---|
| 1 | Hard-reload (Ctrl+Shift+R) | Badge `v6.42-internal-net-read-timeout-20260812` |
| 2 | Đăng nhập trên mạng nội bộ | Dữ liệu **tải xong** (không còn "timeout"); overlay có phụ đề "mạng nội bộ có thể chậm" |
| 3 | Nếu VẪN timeout | F12 → Network → request `exec` (action `read`): xem mất bao lâu / có xong không → gửi số để chỉnh ngân sách (hoặc nghi ANBM chặn hẳn `script.google.com`) |
| 4 | Login/đổi mật khẩu/ghi (upsert) | Vẫn phản hồi nhanh (giữ 30s), không treo |

## 🟢 PRIORITY 2 — Nợ nối tiếp S71 (tùy chọn)
- **`ai-chat` vẫn ở 30s**: câu hỏi AI dài (LLM) trên mạng nội bộ có thể bị cắt; có retry riêng nhưng cân nhắc cho AI ngân sách riêng. Xem TD-NET-01.
- Nếu read >90s là bình thường trên mạng nội bộ → cân nhắc chuyển startup sang **render cache ngay + sync nền** (option đã đề xuất, user chọn giữ overlay lần này).

---

## ✅ COMPLETED S70 — Seed KPI pilot + Task↔Milestone linking picker
- [x] **S70.1 Seed**: NEW `backend/H2SeedPilot.gs` (`h2SeedDryRun`/`h2SeedCommit`/`h2SeedClearPilot`) nạp 8 sheet H2_* từ `data/SAMPLE_*_H2.md`; idempotent ID cố định; 8 Obj·27 KPI·28 MS·8 Risk·9 Dep·135 Tracking rỗng·2 Review. Validate Node sandbox. Giải quyết TD-H2-02.
- [x] **S70.2 DEBUG+CR**: backend NEW `h2HandleTaskLink` owner-gated + route `h2-milestone-tasklink`; FE popup "+ Task" (search/filter, đa task, TaskRef CSV), chip→chi tiết common, unlink; `_gasH2TaskLink`. Scope task = Res\|\|Acc chủ mốc khớp username∪display-name.
- [x] `verify_h2_tasklink.mjs` **28/28** + run_tests.mjs; v6.41→6.41.2; cache-bust `?v=20260812d` (65 refs). ✅ GAS redeployed.

## 🔴 PRIORITY 0 — Smoke test S70 trên production
| Bước | Action | Expected |
|---|---|---|
| 1 | Hard-reload (Ctrl+Shift+R) | Badge `v6.41.2-h2-tasklink-pic-match-20260812` |
| 2 | (GAS editor) chạy `h2SeedDryRun()` rồi `h2SeedCommit()` nếu chưa seed | Log 0 cảnh báo; 8 sheet H2_* có data QuangNN3+DungLQ1 |
| 3 | Quản trị H2 · Theo dõi KPI → 1 mốc → nút **"+ Task"** | Popup hiện **mọi task user phụ trách** (Res/Acc); search/Initiative/Status/Quá hạn lọc đúng |
| 4 | Tick nhiều task → Lưu → reload | Chip giữ (xác nhận GAS ghi); click chip → chi tiết task; × bỏ link |
| 5 | Đăng nhập **member** (User) | "+ Task" chỉ hiện trên mốc của chính mình, không hiện mốc người khác |
| 6 | Nếu popup vẫn thiếu task | Gửi 1 mẫu: giá trị cột PIC của task đó vs username login (alias ngoài User_Master?) |

## 🟢 PRIORITY 2 — Nợ nối tiếp S70 (tùy chọn)
- **TaskRef CSV không FK**: task bị xoá → chip mốc vẫn hiện id (không tự dọn). Cân nhắc lọc chip theo `db.tasks` tồn tại. Xem TD-H2-04.
- **B6 notif-hook H2** (RAG đỏ / mốc quá hạn bắn chuông+email) + docs `06_DASHBOARD_SPEC`/`07_DATA_MODEL` vẫn nợ (TD-H2-03).
- **(nợ S69)** blank placeholder `.user-pill` (TD-AUTH-01); **~70 PNG** leftover `git restore test-results/`.

---

---

## ✅ COMPLETED S69 — Fix login hang / lock-out khi mạng chậm/bị chặn
- [x] **Root cause** (xác nhận qua code): không timeout ở mọi request GAS + overlay tải chặn toàn màn + startup tự phát lại khi reload → 1 blip mạng tới `script.google.com` treo/khóa; chỉ clear site data mới thoát. AUTH_REQUIRED từ read nền startup xóa phiên → mất role/user.
- [x] `auth.js` — `_fetchWithTimeout` (AbortController `GAS_TIMEOUT_MS=30000`) cho `gasPost`+`doLogin`; cờ `_authStartupGrace` (blip AUTH_REQUIRED lúc khởi động không logout)
- [x] `app.js` — `window.onload` try/catch; `startApp` bật/tắt grace; `autoConnectDB` lỗi → `_showStartupRetry` (giữ phiên+cache+nút Sync=Thử lại, trạng thái ngoại tuyến); `syncDB` OK khôi phục "đã kết nối"
- [x] `config.js` v6.40; `index.html` cache-bust `?v=20260812` (65 refs); commit+push `72cbe6a`

## 🔴 PRIORITY 0 — Smoke test S69 (v6.40) trên production
| Bước | Action | Expected |
|---|---|---|
| 1 | Hard-reload (Ctrl+Shift+R) | Badge `v6.40-login-hang-timeout-fix-20260812` |
| 2 | Đăng nhập bình thường | Data tải OK như cũ |
| 3 | DevTools (F12) → Network → **Offline** → reload/đăng nhập | Trong ~30s: **giữ đăng nhập** + hiện **data cache** + nút **Sync** + trạng thái "Ngoại tuyến (cache)"; KHÔNG treo, KHÔNG màn trắng |
| 4 | Bật lại mạng → bấm **Sync** | Data tải lại; trạng thái về "Google Sheets" |
| 5 | Reload lần nữa khi đang lỗi | **KHÔNG bị khóa**; không cần clear history |
| 6 | Nếu vẫn lạ | Gửi ảnh Console F12 (log `[SHTD] Khởi động thất bại:` / `Auto-connect thất bại:`) |

## 🟢 PRIORITY 2 — Tùy chọn nối tiếp S69
- **Blank placeholder `.user-pill`** ("Quản trị viên" hardcode trong `index.html`) → trang chưa `applyUserToUI` không trông như đã login admin. Chưa làm (tránh đụng test markup). Xem TD-AUTH-01.
- **(nợ S68)** Smoke H2 Dashboard/Review; `H2SeedPilot.gs` chưa tồn tại; docs 06/07.
- **~70 PNG suite khác** vẫn dirty (leftover) — `git restore test-results/` nếu muốn tree sạch.

---

# (S68) TODO — giữ tham khảo
**Prepared**: 2026-08-11 (Session 68 — Hoàn tất Track B Quản trị H2: Dashboard + Tự đánh giá)
**Context**: S68 done. v6.39-h2-dashboard-review-20260811, `?v=20260811c`. **Local HEAD `2a84883` — CHƯA push.** verify_h2_dashboard 24/24 + verify_h2_review 20/20 + core 14/14 + tracker 32/32; full suite 29/31 (2 flaky pre-existing: my_work MW6 61/62 riêng, issue_tracker 61/61 riêng). Thuần frontend + test — không deploy GAS mới (backend reviews live từ B1).

---

## ✅ COMPLETED S68 — Hoàn tất Track B (Quản trị H2): Dashboard + Tự đánh giá + Report
- [x] **Context recovery**: rà soát working tree sau phiên đóng bất thường → xác định B1–B3 đã commit (`77ce233`,`daf0421`), dashboard/review viết xong nhưng chưa test/commit/doc
- [x] `views/h2-dashboard.js` — exec summary, member/pillar/objective, risks/deps, capacity (cờ quá tải), AI impact, mgmt actions, chart trend+RAG, **Xuất báo cáo BLĐ (B8)**
- [x] `views/h2-review.js` — self-review H1/Q3/Q4 + 8 chiều năng lực; RBAC member-vs-lead; save qua `_gasH2Upsert('review')`
- [x] Wiring index.html (nav/section/modal/overlay/script) + navigation.js (route+ESC) + i18n VI/EN + h2.css + h2-core hook
- [x] `verify_h2_dashboard.mjs` **24/24** + `verify_h2_review.mjs` **20/20** + run_tests.mjs; config v6.39; cache-bust `?v=20260811c` (65 refs)
- [x] Commit local `2a84883` (source + test + evidence h2_dashboard/review/tracker; loại ~70 PNG suite khác đã dirty từ trước)
- [x] ✅ **Push xong** — Remote HEAD `bee61f8` (`2a84883` feature · `a1cdc63` handover · `bee61f8` guide)
- [x] **Hướng dẫn sử dụng** (`bee61f8`): `docs/HUONG_DAN_SU_DUNG_H2_KPI.md` (VI, mọi thao tác) + `docs/img/h2/*.png` (10 ảnh chụp thật qua `capture_h2_guide.mjs`)

## 🔴 PRIORITY 0 — Smoke test S68 tại PRD (user đang test)
| Bước | Action | Expected |
|---|---|---|
| 1 | Hard-reload (Ctrl+Shift+R) | Badge `v6.39-h2-dashboard-review-20260811` |
| 3 | Menu "Quản trị H2 · Dashboard" | Exec cards + chart trend/RAG + panel member/pillar/risk/dep/capacity/AI/mgmt; nút "Xuất báo cáo BLĐ" mở overlay copy-ready |
| 4 | Menu "Quản trị H2 · Tự đánh giá" | Thêm/sửa review; **member chỉ thấy review của mình**, Teamlead thấy tất cả + chọn member; badge Năng lực TB |

## 🟢 PRIORITY 2 — Việc còn treo
- **(nợ S67)** Smoke test v6.36 ngày ISO trên production (badge → DD/MM/YYYY, modal Sửa điền đủ ngày).
- **~70 PNG suite khác** vẫn dirty trong working tree (không do S68 — leftover phiên trước). Dọn/`git restore` nếu muốn tree sạch.
- **(nợ S57)** điền cột Email `User_Master` cho digest.
- **Track B tùy chọn**: seed pilot GAS (`H2SeedPilot.gs` — được nhắc trong empty-state dashboard, chưa tồn tại); docs `06_DASHBOARD_SPEC`/`07_DATA_MODEL` (chưa có).

---

# (S67) TODO — giữ tham khảo
**Prepared**: 2026-08-10 (Session 67 — Revert GAS cá nhân + đồng nhất logic ngày tháng ISO)
**Context**: S67 done. v6.36-date-unify-iso-20260810, `?v=20260810b`. HEAD `d8779d9`. `verify_date_unify` 28/28; `verify_history` 47/47 (H13 fixed); full suite 26/27 (chỉ my_work MW6 flaky pre-existing). Code pushed. Migration GAS **đã chạy commit xong** (user, build 2026-08-10d). Backend đã revert về **tài khoản cá nhân**.

---

## ✅ COMPLETED S67 — Revert GAS cá nhân + đồng nhất logic ngày tháng
- [x] **S67.1 Revert**: `config.js` GS_WEBAPP_URL → `AKfycbydyik…97f2` (v6.35); `constants.js` GS_SHEET_ID + `Config.gs` SPREADSHEET_ID → Sheet cũ `1cpg1p_8…56Hk`; cache-bust `?v=20260810`. Bỏ hướng cơ quan S59 (ANBM + noti nội bộ).
- [x] **S67.2 Date unify**: `helpers.js` `toISODate`/`fmtDate`/`parseVNDate`/`fmtDateExport` — canonical ISO storage+memory, hiển thị DD/MM/YYYY. Mọi reader→ISO memory, writer→ISO, display→fmtDate (parsers/api/initiatives/initiative-tracker/action-plan/dev-plan/issue-tracker/report). v6.36, cache-bust `?v=20260810b`.
- [x] NEW `backend/DateNormalizeMigration.gs` (dryRun/commit, bỏ setNumberFormat) — **user chạy commit xong**. NEW `verify_date_unify.mjs` 28/28 + run_tests.mjs; `verify_history` H13 → ISO (47/47).

## 🟡 PRIORITY 1 — Smoke test S67 (v6.36) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.36-date-unify-iso-20260810` |
| Cột ngày mọi view (Task/Case/Issue/Init/Dev) | Hiện **DD/MM/YYYY**, không còn `26/thg 7/30` |
| Click 1 dòng → popup + modal Sửa | Ngày bắt đầu/kết thúc **điền đủ**, không trống |
| Thêm mới bất kỳ entity | Ngày lưu vào Sheet dạng ISO `YYYY-MM-DD` |
| Ô ngày lẻ hiển thị `–` | = giá trị migration không parse được (unparseable, giữ nguyên) → gửi mẫu để bổ sung parser |

## 🟢 PRIORITY 2 — Việc còn treo S67 (tùy chọn)
- **Chống tái diễn locale**: set cột ngày → Plain-text trên Sheets UI (migration đã bỏ setNumberFormat vì cột kiểu ngày chặn).
- **Xác minh noti mạng nội bộ**: nếu ANBM chặn cả domain `script.google.com` → đổi account KHÔNG cứu được noti/CRUD; cần xác minh sau reload.
- **Data gap 04-08→10-08**: nếu thiếu bản ghi ở Sheet cũ → merge từ Sheet cơ quan `1t4tkaw4…Zq4g` (còn giữ). Có thể viết GAS merge-by-ID nếu cần.
- **(nợ S57)** điền cột Email `User_Master` cho digest.

---

## ✅ COMPLETED S66 — Initiative Category đồng nhất + ES health nâng cấp
- [x] **Part 1** — `INIT_CATEGORIES` (6 cũ + **Bất Động Sản**) + `_initCategories()` (chuẩn ∪ data) dùng CHUNG: modal Thêm `#initFCat` (bỏ hardcode 6 option) + filter Initiative `#initSelCat` + filter ES → danh sách giống hệt
- [x] **Part 2** — ES "Sức khỏe từng Initiative": droplist `#esInitCatFilter` + `esFilterInitCat()` lọc theo Category (re-render từ cache)
- [x] **Part 3** — `_esRenderInitTable` join `db.initiatives`: cột **Tên** (thay ID) + **Phụ trách** (8 cột); dòng initiative thực → click `openInitViewPopup`; BAU không click
- [x] `verify_es_init_health.mjs` (NEW, 14/14) + run_tests.mjs; config v6.34; cache-bust `?v=20260807b` (60 refs)

## 🟡 PRIORITY 1 — Smoke test S66 (v6.34) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.34-init-category-es-health-20260807` |
| Initiative → Thêm → droplist Category | Có **Bất Động Sản** + 6 mảng cũ; giống filter Initiative |
| Tổng hợp BLĐ → "Sức khỏe từng Initiative" | Cột **Tên** + **Phụ trách** hiện đúng; droplist Category ở header |
| Chọn 1 mảng ở droplist ES | Bảng chỉ còn initiative thuộc mảng đó |
| Click 1 dòng initiative | Popup chi tiết initiative mở (như popup chung); dòng BAU không mở |

---

## ✅ COMPLETED S65 — Guard chống ghi đè khi tạo trùng đồng thời (5 entity)
- [x] NEW `backend/Concurrency.gs` — `_acquireWriteLock()` (script lock 20s) + `reassignIdIfExists(sheetName,id)` (tách `<prefix><số cuối>`, tăng số khi trùng — đúng SO-/CP-/IS-YY-/DEV-YY-/-M#)
- [x] `Code.gs` — 5 handler `*-upsert` bọc write lock; `isNew` → reassign + đồng bộ `row[0]` + trả `id`
- [x] Client: create gửi `isNew:true`; `_adoptReassignedId()` (api.js) nhận mã mới + toast `sync.id-reassigned` (VI/EN); edit `isNew:false`. `_gasTaskUpsert`(isNew=!oldId), `_gasCase/Issue/Dev Upsert(rec,isNew)`, `_gasInitiativeUpsert(ini,isNew)` + `syncInitiativeAdd(ini,isNew)`; view save truyền isNew (case chốt `!_cpEditId` trước close)
- [x] `verify_id_reassign.mjs` (NEW, 17/17) + run_tests.mjs; config v6.33; cache-bust `?v=20260807` (60 refs)

## ✅ DONE — GAS redeploy (user, 2026-08-07, URL không đổi)
- [x] Apps Script editor: thêm `Concurrency.gs` + cập nhật `Code.gs` → Deploy New version → server-side guard live.

## 🟡 PRIORITY 1 — Smoke test S65 (v6.33) đa-user trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.33-concurrent-create-idlock-20260807` |
| 2 người cùng tạo Task/Case/Issue/Dev cùng lúc | **Không mất** bản ghi nào; người thứ 2 nhận mã kế tiếp |
| Người thứ 2 (bị cấp lại mã) | Toast "Mã … đã được người khác dùng — đã cấp mã mới: …"; list hiện mã mới |
| Tạo Milestone `{parent}-M#` khi trùng | Cấp `-M(n+1)`, parent không bị đụng |
| Sửa/rename 1 mục | KHÔNG bị auto đổi mã (chỉ create mới reassign) |

## 🟢 PRIORITY 2 — Mở rộng (tùy chọn)
- Lock cho bulk write-all (`write`/`case-write`/`initiative-write`/import Excel) + atomic delete cho initiative/milestone (TD-INIT-02) — hiện ngoài phạm vi S65.
- `verify_id_reassign.mjs` là **port** thuật toán GAS → sửa `Concurrency.gs` phải cập nhật test song song.

---

## ✅ COMPLETED S64 — Initiative: filter Accountable + xóa Milestone
- [x] **CR1 — Filter Accountable**: `initiative-tracker.js` +state `_initFilterAcc`, select `#initSelAcc` + `_initAccountableOptions()` (distinct từ initiative gốc, sorted); `_initStatBase` áp accountable → lọc **cả card list lẫn 5 ô số**; `_initSetFilter` re-render cả `#initStatBar` (fix ô số lệch khi đổi Category/Accountable); restore selects theo **id** thay vì index
- [x] **CR2 — Xóa Milestone**: nút 🗑 mỗi milestone row + `_initDeleteMilestone` (optimistic mirror `_initDelete`) — confirm cảnh báo N task → xóa milestone + **gỡ link Task** (`task.milestone=''`, giữ Task + link initiative) → `_gasTaskUpsert` nền + `writeInitiatives().catch` + render ngay
- [x] i18n +`it.filter.all-acc` / `it.ms.delete.confirm` / `it.ms.delete.warn-tasks` (VI+EN); config v6.32; cache-bust `?v=20260806b` (60 refs)
- [x] `verify_i18n_p6` cập nhật index Status (dời do thêm select) + coverage Accountable → **29/29**; CR e2e **11/11**; initiative suite 19/19

## 🟡 PRIORITY 1 — Smoke test S64 (v6.32) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.32-init-acc-filter-ms-delete-20260806` |
| Theo dõi Initiative → dropdown Accountable | Liệt kê đúng người đang phụ trách; chọn 1 người → card list + 5 ô số lọc đúng |
| Kết hợp scope (Của tôi/Tất cả) + Category + Accountable | Lọc AND đúng, ô số cập nhật theo |
| Mở Milestones 1 initiative → nút 🗑 | Confirm cảnh báo số Task; xác nhận → milestone biến mất **ngay** |
| Task từng thuộc milestone vừa xóa | **Vẫn còn** trong Task/initiative, mất nhãn milestone (thành "loose"/trống) |
| Ngắt mạng → xóa milestone | Có toast cảnh báo lỗi ghi; UI vẫn cập nhật cục bộ |

---

## ✅ COMPLETED S63 — CRUD ghi/load bất đồng bộ + optimistic (mượt UX, chỉ báo khi lỗi)
- [x] `initiative-tracker.js` — `_initSave`/`_initDelete`/`_initFixLooseLink` optimistic: mutate local → persist → render NGAY; ghi GAS atomic chạy nền (bỏ `await` trước render) → item hiện tức thì, hết lag "refresh lại toàn bộ"
- [x] Bỏ toast **thành công** ở add/edit/delete cả 5 entity (Task/Case/Issue/Dev/Initiative+Milestone) → "chỉ báo khi lưu không thành công" (toast lỗi vẫn ở `_gas*Upsert/Delete` + `syncDot`)
- [x] Giữ bulk-summary toast (bulk.js) + manual-sync toast (app.js syncDB) — feedback hợp lý cho batch/thao tác chủ động
- [x] config v6.31; cache-bust `?v=20260806` (60 refs); 7 file source. Full suite 22/24 (baseline); suite liên quan xanh (initiative 19/19, dev 40/40, case 22/22, atomic 41/41, issue 61/61)

## 🟡 PRIORITY 1 — Smoke test UX optimistic (v6.31) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.31-async-optimistic-crud-20260806` |
| Initiative → Thêm/Sửa Initiative + Milestone | Item hiện **tức thì** sau khi bấm Lưu (không chờ network), **không** toast "thành công" |
| Task/Case/Issue/Dev → Thêm/Sửa/Xóa | Cập nhật tức thì, không toast success |
| Ngắt mạng → sửa 1 mục | **CÓ** toast cảnh báo "đã lưu cục bộ" + `syncDot` chuyển xám |
| Xóa 1 mục | Biến mất ngay khỏi list (đã qua confirm dialog), không toast success |

## 🟢 PRIORITY 2 — Dọn dead code (TD-INIT-01)
`syncInitiativeAction`/`syncInitiativeDelete` (initiatives.js) không còn view nào gọi (delete dùng `writeInitiatives().catch` trực tiếp). Xoá sau khi xác nhận không tham chiếu trong index.html/onclick.

---

## ✅ COMPLETED S62 — Tuần báo cáo Task đa-tuần (ISO)
- [x] `helpers.js` — ISO week utils + hàm gốc `taskReportWeeks` (auto∪pinned) + `allReportWeeks`/`taskWeeksBadge`/`taskInReportWeek`/`taskFirstWeekKey`; 3 hàm tuần jan4 trùng → delegate `currentIsoWeekLabel()`
- [x] Read path exact-match → membership: tasks/app/report/dashboard/quickview/performance
- [x] Modal chip control (auto + pin qua `<input type="week">`); hidden `#fTuanBC` chỉ lưu pin; forms.css `.tuan-chip`
- [x] `backend/ReportWeekMigration.gs` (dry-run/commit chuẩn hoá free-text cũ); `verify_report_week.mjs` 17/17; `verify_preset` fix ISO; `REPORT_WEEK_DESIGN.md`; config v6.30

## 🔴 PRIORITY 0 — Việc thủ công GAS (S62)
| Bước | Action | Vì sao |
|---|---|---|
| 1 | Copy `backend/ReportWeekMigration.gs` vào GAS Editor → `dryRunNormalizeWeeks()` rồi `commitNormalizeWeeks()` | Chuẩn hoá `Tuần BC` free-text cũ → nhãn ISO (không đổi Web App route) |
| 2 | Hard-reload → mở modal Task: chip auto/pin + `<input week>`; task span nhiều tuần hiện ở mọi tuần; task quá hạn ở "Tuần này"; báo cáo tuần gồm task đa tuần | Xác nhận membership + UX |

## 🟡 PRIORITY 1 — Áp cơ chế tuần đa-tuần cho **Case Pipeline** (đợt sau)
`cpfTuanBC` cũng free-text; áp cùng `taskReportWeeks`-style + chip control + migration Case_Pipeline.

## 🟢 PRIORITY 2 — Tuỳ chọn Report Week
Cơ chế "bớt tuần auto" (cột exclude) nếu user cần; memoize `taskReportWeeks` nếu số task rất lớn.

---

## ✅ COMPLETED S60 — AI Assistant tuning (full-task index + Markdown table)
- [x] `f5a447a` — Gemini model `gemini-2.5-flash` → **`gemini-flash-latest`** (key cơ quan từ chối model cũ)
- [x] `09cdc54` (v6.27) — server "SỐ LIỆU TÍNH SẴN" (đếm deterministic) + `maxOutputTokens` 1024→2048 + bỏ ép ngắn gọn + **bỏ Audit_Log khỏi context** (nhẹ/nhanh/ít 404) + `ai-chat.js` retry 3× backoff scope-AI khi 404/5xx
- [x] `f8826c4` (v6.28) — `_aiTaskIndex_()` **chỉ mục TOÀN BỘ task** (fix "chỉ xem 300 task") + rich detail cap 200; `_aiRenderMarkdown()` render bảng/đậm/code/bullet trong bubble bot (esc TRƯỚC → XSS-safe)
- [x] GAS **redeploy** (user, URL không đổi) → backend live; full suite 21/23 (2 fail pre-existing) → push main

## 🟡 PRIORITY 1 — Smoke test AI Assistant (v6.28) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.28-ai-table-fullindex-20260804` |
| Hỏi AI "liệt kê task Blocked" / "task quá hạn theo PIC" | Bao phủ **mọi** task (không cắt); KHÔNG nói "chỉ xem được 300 task" |
| Câu trả lời dạng bảng | Render **bảng Markdown** đẹp trong bubble bot (không còn `\|---\|` thô) |
| Câu đếm (bao nhiêu task quá hạn/sắp hạn) | Số khớp "SỐ LIỆU TÍNH SẴN" (deterministic), không lệch |
| Gõ ký tự HTML (`<b>`, `<script>`) trong câu hỏi | Hiển thị nguyên văn escaped (không thực thi) |
| Lỗi transient GAS | Tự retry, không hiện 404 ngay lần đầu |

---

## ✅ COMPLETED S59 — Migrate GAS backend về tài khoản cơ quan (TPBank)
- [x] Phỏng vấn 4 câu → chốt **kịch bản A**: `cb_sptd_7@tpbank.vn` = Google Workspace + toàn quyền admin + ANBM = "email từ @tpbank.vn" (data ở lại Google Sheets được) + frontend giữ public
- [x] User copy GAS project + Sheet DB sang tài khoản cơ quan (test OK phía GAS)
- [x] `backend/Config.gs` — `SPREADSHEET_ID` → Sheet copy `1t4tkaw4…Zq4g`
- [x] `assets/js/config.js` — `GS_WEBAPP_URL` → deployment mới `AKfycbw1…DSg`; `APP_VERSION` v6.26
- [x] `assets/js/constants.js` — `GS_SHEET_ID` sync; `index.html` — cache-bust `?v=20260804` (60 refs)
- [x] Full test suite 23 + chạy riêng 3 suite fail; `git stash` chứng minh 3 fail là pre-existing (my_work code gốc 50/62 < 51/62; import_rbac 15/15 riêng; history H13 stale) → 0 regression
- [x] Commit `aedd1ff` (chỉ 4 file source; loại test-results PNG) + push main

## 🔴 PRIORITY 0 — Việc thủ công phía GAS để KHÉP migration (ngoài git)
| Bước | Action | Vì sao |
|---|---|---|
| 1 | User **hard-reload** production → badge `v6.26`; login + CRUD 1 task; `notifSelfTest()` | Xác nhận trỏ đúng GAS + Sheet cơ quan; email đến từ `@tpbank.vn` |
| 2 | **Tắt trigger `notifScan` ở project GAS cá nhân CŨ** | Còn bật → email digest gửi **2 lần** |
| 3 | **Đối chiếu `AUTH_SECRET`** project mới ↔ cũ | Khác → mọi token login vô hiệu, user phải login lại (password KHÔNG ảnh hưởng) |
| 4 | Sau vài ngày ổn định → **gỡ quyền tài khoản cá nhân khỏi Sheet + xóa deployment GAS cũ** | Khép ANBM; giữ tới lúc đó để **rollback** (revert `config.js`) |
| 5 | (Nợ S57) điền cột **Email** `User_Master` cho user cần nhận digest | Thiếu email → chỉ nhận chuông |

## 🟢 PRIORITY 2 — Fix flaky/stale tests (TD-TEST-01 + TD-TEST-02/H13)
Không do S59. `verify_my_work`/`verify_issue_tracker`/`verify_import_rbac` flaky batch (thay `waitForTimeout` bằng `waitForSelector`/poll); `verify_history` H13 kỳ vọng `DD-MMM-YY` → cập nhật thành ISO hôm nay.

---

## ✅ COMPLETED S58.2 — My Work: page width chuẩn + "Cần làm ngay" 2 cột
- [x] **Audit width toàn hệ thống**: chỉ My Work lệch chuẩn (`.mw-page` double-padding + cap 1200px). AI Chat 860px = cố ý (chat readability), giữ nguyên. Các view khác đã full-width chuẩn.
- [x] `my-work.css` — `.mw-page` `padding:0 0 32px; max-width:none` (mobile `0 0 16px`) → width chuẩn khớp Tasks/Case/Issue/Dev Plan
- [x] **"Cần làm ngay" chia 2 cột**: Quá hạn (diff<0) | Sắp đến hạn (diff≥0: hôm nay + ≤7d); mỗi cột count + sort soonest-first + empty "Không có"; mobile stack 1 cột
- [x] `my-work.js` `_mwBuildUrgentSection` viết lại + `_mwUrgentTaskItem/CaseItem`; giữ selector test (`#mwSectionUrgent`/`#mwUrgentCount`/`.mw-urgent-item`)
- [x] `i18n.js` +`mw.urgent.col.soon` / `mw.urgent.col.none` (VI+EN); config v6.25; cache-bust `?v=20260803c`
- [x] Verify: urgent MW12/MW13 PASS + screenshot 2 cột; suite flaky (TD-TEST-01) không do thay đổi này

## ✅ COMPLETED S58.1 — Dev Plan table fix (đè chữ + nút đè ghi chú + textarea auto-grow + page width)
- [x] Sửa **đè chữ**: `.dev-table td { white-space: normal }` override global `table{white-space:nowrap}` (table.css:61) → cell free-text wrap trong width cột (S58 fixed-layout nhưng cell vẫn nowrap → tràn đè cột kế)
- [x] Ngày giữ 1 dòng: `.dev-table td.dev-cell-date { white-space:nowrap }` (tăng specificity thắng `.dev-table td`)
- [x] Header wrap gọn (`thead th` nowrap→normal); nút Sửa/Xóa hết đè Ghi chú: `.btn-sm` compact + cột actions 58→78px + `.dev-cell-actions`
- [x] **Textarea auto-grow theo nội dung**: `_devAutoGrow()` + `.dev-autogrow` (resize:vertical, overflow hidden) cho `#devfTarget`/`#devfNote` (gọi khi mở modal + oninput)
- [x] **Page width đồng bộ**: `.dev-page` padding `4px 2px`→`4px 0` (khớp .content 20/24 như Tasks/Case/Issue)
- [x] config v6.24-devplan-ui-fix-20260803; cache-bust `?v=20260803b`; `verify_dev_plan` 40/40; EVD refresh

## ✅ COMPLETED S58 — UI layout fit (Dev Plan + Action Plan + UI_CONCEPT.md)
- [x] Dev Plan bảng danh sách: bỏ `min-width:900px` → `table-layout:fixed; width:100%`; cell free-text (name/target/note/coord) wrap; `.dev-cell-date` giữ ngày 1 dòng; thu gọn width cột px → **fit 1 màn hình**, scroll ngang chỉ fallback <720px
- [x] Action Plan kanban: `.kanban-col` `flex:0 0 260px` → `flex:1 1 0; min-width:240px` → 4 cột **giãn lấp đầy** (verify `.kanban-*` chỉ Action Plan; Case Pipeline = `.cp-col`)
- [x] `AI_CONTEXT/UI_CONCEPT.md` (NEW) — contract layout cho tính năng sau (2 failure mode, golden rules, công thức table/board, thang width modal, breakpoint, checklist pre-merge)
- [x] `config.js` v6.23; cache-bust `?v=20260803` (60 refs, Python)
- [x] Verify: verify_dev_plan 40/40, verify_action_plan 24/24, 0 JS error

## 🟡 PRIORITY 1 — Smoke test UI layout (v6.23) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.23-ui-layout-fit-20260803` |
| Plan phát triển bản thân (G+V) | Bảng danh sách **không còn scroll ngang**; xem đủ mọi cột trên 1 màn hình; text dài wrap |
| Dev Plan trên màn hẹp (~<720px) | Mới xuất hiện scroll ngang (fallback mobile) — chấp nhận được |
| Action Plan | 4 cột kanban **giãn lấp đầy** chiều ngang, không còn khoảng trống lớn bên phải |
| Áp dụng UI_CONCEPT.md | Tính năng/bảng/board mới bám checklist §7 (fit-one-screen + stretch-to-fill) |

---

## 📎 (S57) — Notification bell 🔔
**Prepared cũ**: 2026-08-02 (Session 57 — 🔔 Notification bell)
**Context**: S57 done + **deployed**. v6.22-notifications-20260802, `?v=20260802`. `verify_notifications` **21/21**. Code + docs pushed. **GAS redeploy XONG (2026-08-02, URL không đổi) + `installNotifTrigger()` bật; smoke test production OK.**

---

## ✅ COMPLETED S57 — Notification bell 🔔
- [x] `backend/NotificationService.gs` (NEW) — sheet `Notifications` (11 cột), `notifScan()` (quét deadline mọi sheet, sinh due-3d/1d/today/overdue, gửi email digest), `notifOnWrite`/`notifPrior_` (real-time created/closed trong doPost), `notifRead`/`notifMarkRead`, `installNotifTrigger`/`notifSelfTest`
- [x] `Code.gs` — route `notif-read`/`notif-mark-read` (per-user); hook `notifOnWrite` vào 5 upsert (task/case/initiative/issue/dev), đọc prior trước khi ghi
- [x] `api.js` (readNotifications/markNotifRead/persist/load) + `constants.js` (`dbNotifs`)
- [x] `views/notifications.js` + `notifications.css` (NEW) — bell badge, dropdown nhóm, deep-link `open*ViewPopup`, mark-all, outside-click/ESC
- [x] `app.js` (poll load/Sync/5', renderAll, clearCache), `i18n.js` (+14 key VI/EN), `navigation.js` (ESC), `index.html` (bell + cache-bust `?v=20260802`), `config.js` v6.22
- [x] `verify_notifications.mjs` (NEW, 21/21) + `run_tests.mjs`

## ✅ DONE — GAS redeploy + bật trigger + smoke test (2026-08-02)
- [x] GAS Editor: thêm `NotificationService.gs` + cập nhật `Code.gs`; Deploy New version (URL **không đổi**)
- [x] `installNotifTrigger()` bật trigger `notifScan` ~8h/ngày
- [x] Smoke test production OK: chuông hiện, noti đúng nhóm, click deep-link mở popup, mark-read/mark-all chạy
- [ ] **Còn lại**: điền cột **Email** trong `User_Master` cho user cần nhận email digest (thiếu email → chỉ nhận chuông); theo dõi digest sáng đầu tiên

## 🟢 PRIORITY 2 — Fix flaky/stale tests (TD-TEST-01 + TD-TEST-02/H13)
- `verify_my_work.mjs` + `verify_issue_tracker.mjs`: thay `waitForTimeout()` cố định bằng `waitForSelector`/`expect.poll` (flaky batch, pass khi chạy riêng).
- `verify_history.mjs` **H13**: assertion cũ kỳ vọng initiative start = `DD-MMM-YY`; S56 đã đổi sang date-picker ISO → cập nhật kỳ vọng thành ISO hôm nay.

---

## 📎 (S56) — Đồng nhất date input
**Prepared cũ**: 2026-07-30 (Session 56 — Đồng nhất date input)
**Context**: S56 done. v6.21-date-picker-20260730, `?v=20260730`. Thuần frontend (không GAS deploy). `verify_initiative_tracker` **19/19** + `verify_dev_plan` **40/40** + round-trip E2E **11/11**. Code + docs pushed.

---

## ✅ COMPLETED S56 — Đồng nhất date input (Initiative/Milestone picker + Dev Plan default)
- [x] Initiative modal: `initFStart`/`initFDeadline`/`initFMsDl` free-text → `<input type="date">`
- [x] Giữ storage `DD-MMM-YY`, convert ở biên: `_initToISO` (populate Sửa), `_initFromISO` (Lưu) — 0 rủi ro sheet/backend/history/export
- [x] Add mode: Start Date default = hôm nay (ISO); Deadline/MsDl để trống
- [x] Dev Plan: `devfStart` default hôm nay khi Add (trước để trống)
- [x] config v6.21, cache-bust `?v=20260730` (58 refs, Python)
- [x] Verify: verify_initiative_tracker 19/19, verify_dev_plan 40/40, round-trip E2E 11/11, 0 JS error

## 🟡 PRIORITY 1 — Smoke test date picker (v6.21) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.21-date-picker-20260730` |
| Initiative → Thêm | "Start Date" là lịch chọn ngày, mặc định **hôm nay**; "Deadline" + "Deadline Milestone" là lịch, **để trống** |
| Lưu initiative mới | Sheet `Initiative_Master` vẫn lưu ngày dạng `DD-MMM-YY` (VD `30-Jul-26`); card/list hiển thị đúng |
| Mở Sửa initiative cũ | Picker hiện đúng ngày đã lưu (convert `DD-MMM-YY → ISO`) |
| Thêm Milestone | Deadline Milestone dùng picker; ID auto-gen như cũ |
| Dev Plan → Thêm | "Ngày bắt đầu" mặc định = **hôm nay** |

## 🟢 PRIORITY 2 — Fix flaky test suites (TD-TEST-01)
Thay `waitForTimeout()` cố định bằng `waitForSelector`/`expect.poll` trong `verify_my_work.mjs` + `verify_issue_tracker.mjs` (flaky khi chạy batch, pass khi chạy riêng — xem TECH_DEBT).

---

## ✅ COMPLETED S55 — Initiative Tracker tidy-up
- [x] Tách Initiative Done → section thu gọn "Đã hoàn thành (N)" ở cuối (collapse mặc định, lazy render)
- [x] Ô số tổng đồng nhất `.cp-stat-card` (icon+số+nhãn), grid 5 ô responsive như Case Pipeline
- [x] View popup mỗi ô số → `#initSummaryOverlay` short-list table (ID/Tên/Accountable/Deadline/%/Trạng thái), row → chi tiết
- [x] Ô số + popup đếm theo **scope + Category** (không áp Status); filter Status cụ thể → tôn trọng, không tách Done
- [x] i18n +5 keys, config v6.20, cache-bust `?v=20260728c` (Python), ESC chain, `verify_initiative_tracker.mjs` 19/19, `verify_i18n_p6` selector fix

## 🟡 PRIORITY 1 — Smoke test Initiative Tracker (v6.20) trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.20-init-tidy-20260728` |
| Theo dõi Initiative (G+?/menu) | 5 ô số kiểu icon+số+nhãn, cân đối như Case Pipeline |
| Click từng ô (Tổng/Active/Done/Overdue/Blocked) | Popup short-list đúng tập; row click → chi tiết initiative |
| Danh sách chính | Chỉ Active/Paused/Blocked; section "Đã hoàn thành (N)" ở cuối, mặc định thu gọn |
| Bấm section "Đã hoàn thành" | Mở ra, hiện card Done; bấm lại → thu gọn |
| Filter Status = Done | Hiện đúng nhóm Done trong list chính (không tách section) |
| Đổi scope Của tôi / Tất cả, filter Category | Ô số + popup cập nhật theo phạm vi |

---

## 📎 (S54) — Dev Plan
**Prepared cũ**: 2026-07-28 (Session 54 — Dev Plan "Plan phát triển bản thân")
**Context**: S54 + S54.1 done. APP_VERSION=6.19.1-dev-plan-mywork-20260728, ?v=20260728b. HEAD `e1134ce`. **21/21 suites PASS** (verify_dev_plan **40/40** + toàn bộ regression). GAS **đã deploy** (create/delete verified). Code + docs pushed.

---

## ✅ COMPLETED S54 — Dev Plan (Plan phát triển bản thân)

- [x] `backend/DevPlanService.gs` (NEW) — sheet `Dev_Plan` 12 cột; `devRead/devUpsertRow/devDeleteRow/devGetPicById`
- [x] `backend/Code.gs` — +3 route `dev-read/dev-upsert/dev-delete` + ownership gate (PIC==tokenData.u hoặc Admin)
- [x] `constants.js` (`dbDev`,`DEV_STATES`,`DEV_COLS`), `api.js` (Dev API), `app.js` (startup+syncDB+renderAll+clear)
- [x] `views/dev-plan.js` + `css/dev-plan.css` (NEW) — toolbar filter PIC/state/search, bảng nhóm-theo-PIC, CRUD modal, view popup, ownership
- [x] `my-work.js` — section Plan phát triển bản thân; quick save % + note reset mốc
- [x] `navigation.js` (G+V, dispatch, ESC), `index.html` (nav, view, modal, overlay, KB, script), `i18n.js` (dev.* VI+EN)
- [x] `config.js` + cache-bust (Python), `verify_dev_plan.mjs` + `run_tests.mjs`
- [x] **GAS deployed** (user): dev-read/upsert/delete live, URL không đổi

## ✅ COMPLETED S54.1 — Fix: Dev Plan hiển thị ở "Công việc của tôi"
- [x] `my-work.js` `_mwGetDevReview` → hiện **mọi dev item đang làm của tôi** (trước chỉ stale >7 ngày → item vừa tạo bị ẩn); stale gắn badge "Cần review" + sort đầu
- [x] `app.js` `readDev().then()` re-render My Work/Dev Plan sau khi load server
- [x] `i18n.js` `dev.review.title` + `dev.review.badge`; v6.19.1 / ?v=20260728b
- [x] `verify_dev_plan.mjs` DP12 semantics mới + route-abort `script.google.com` (cách ly network) → **40/40 PASS** deterministic

## ✅ DONE — Dọn RenameUserService.gs + kiểm tra key lộ (2026-07-28)
- Đã xóa đoạn PowerShell thừa khỏi `backend/RenameUserService.gs` → file GAS sạch. Xác minh key **chưa từng lên git** (`git log -S` = 0; working copy == committed). Chỉ còn khuyến nghị: đổi/thu hồi key phía provider (precaution). Xem TD-SEC-01.

## 🟡 PRIORITY 1 — Smoke test Dev Plan trên production
| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge `v6.19.1-dev-plan-mywork-20260728` |
| Menu "Plan phát triển bản thân" (G+V) | Bảng nhóm theo PIC, mặc định lọc = tôi |
| Thêm item | Lưu OK; hiện ngay ở "Công việc của tôi" (không cần chờ 7 ngày) |
| User B xem plan user A | Read-only (icon khóa); sửa/xóa bị chặn (client + server FORBIDDEN) |
| Item >7 ngày chưa update | Badge "Cần review" ở My Work; bấm "Đã review" → badge mất |

## 🟢 PRIORITY 2 — Dev Plan enhancements (tùy chọn, Phase 2)
- Excel export (theo pattern Issue/Case); audit history tab; nhắc review theo **tháng** (escalation >30 ngày badge đỏ); bulk update.

---

---

## ✅ COMPLETED S53 — RenameUserService migration

- [x] `backend/RenameUserService.gs` (NEW) — `dryRunRenamePhuong()` + `commitRenamePhuong()`
  - Sheets: User_Master (Username), Task_Master (PIC Acc/Res/Sup), Case_Pipeline (PIC), Issue_Tracker (Người log/xử lý), Initiative_Master (Accountable)
  - Audit_Log KHÔNG chạm
  - Column match: normalized startsWith; Value match: exact case-insensitive
  - Chạy trực tiếp trong GAS Editor, không cần redeploy Web App

---

## 🔴 PRIORITY 0 — Chạy RenameUserService trên production

| Bước | Action |
|---|---|
| 1 | Mở GAS Editor → thêm file `RenameUserService.gs` (copy từ repo) |
| 2 | Chạy `dryRunRenamePhuong()` → kiểm tra Logger: đúng số cell, không WARN trên các sheet chính |
| 3 | Chạy `commitRenamePhuong()` → xác nhận Logger "Migration hoàn tất" |
| 4 | Yêu cầu user `PhuongNPL_C` đăng xuất + đăng nhập lại với username `PhuongNPL` |
| 5 | Verify: dropdown PIC trong Task modal hiện `PhuongNPL` thay vì `PhuongNPL_C` |

---

## 🔴 PRIORITY 1 — Smoke test S52 on production (còn pending)

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.18-sync-topbar-nguoilog-20260710` |
| Topbar (when connected) | SYNC button visible next to Quick View |
| Click SYNC | Syncs Tasks + Cases + Issues + Initiatives; toast "Đã đồng bộ toàn bộ dữ liệu!" |
| Issue Tracker → Thêm Issue | "Người log" is a dropdown; logged-in user pre-selected |
| BLD Queue / Case Pipeline / Issue Tracker | "Làm mới" button no longer present |

---

## 🔲 CANDIDATE TASKS S54+

| Priority | Task | Notes |
|---|---|---|
| P1 | **Fix verify_my_work pre-existing failures (MW22/MW23)** | MW22: progress `mw-prog-visible` toggle class; MW23-prog-bar: progress bar fill null. Failures từ S44b era trở đi. |
| P2 | **AI Chat live activation** | GAS editor → Script Properties → `GEMINI_API_KEY = <key>`. Backend wired; frontend i18n done. User action only. |
| P3 | **i18n COMPLETE** | Tất cả views bilingual sau Phase 8. Không cần Phase 9. |

---

---

## ✅ COMPLETED S52 — SYNC topbar + Issue Tracker Người log dropdown

## ✅ COMPLETED S52 — SYNC topbar + Issue Tracker Người log dropdown

- [x] `index.html` — `#btnSync` moved to topbar-right (before Quick View), class `qv-topbar-btn`, icon `var(--success)` color
- [x] `index.html` — Removed "Làm mới" from BLD Queue, Case Pipeline (table+kanban), Issue Tracker
- [x] `index.html` — Issue Tracker modal "Người log": `<input type="text">` → `<select id="itfNguoiLog">`
- [x] `app.js` — `syncDB()` now syncs all 4 features in parallel: Tasks + Cases + Issues + Initiatives
- [x] `issue-tracker.js` — `openIssueModal()`: `_itSetField(...)` → `_populateUserSelect('itfNguoiLog', null, ...)` for user dropdown
- [x] `config.js` — APP_VERSION `6.18-sync-topbar-nguoilog-20260710`; cache-bust `?v=20260710f` (56 refs, Python)
- [x] Tests: 19/20 (verify_my_work 3 pre-existing failures MW22/MW23 unrelated to S52)

---

## 🔴 PRIORITY 0 — Smoke test S52 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.18-sync-topbar-nguoilog-20260710` |
| Topbar (when connected) | SYNC button visible next to Quick View |
| Click SYNC | Syncs Tasks + Cases + Issues + Initiatives; toast "Đã đồng bộ toàn bộ dữ liệu!" |
| Issue Tracker → Thêm Issue | "Người log" is a dropdown; logged-in user pre-selected |
| Issue Tracker → Edit Issue | Dropdown shows the issue's existing nguoiLog value |
| BLD Queue / Case Pipeline / Issue Tracker | "Làm mới" button no longer present |

---

## 🔲 CANDIDATE TASKS S53+

| Priority | Task | Notes |
|---|---|---|
| P0 | **Smoke test S52 on production** | See checklist above |
| P1 | **Fix verify_my_work pre-existing failures (MW22/MW23)** | MW22: progress input `mw-prog-visible` toggle class; MW23-prog-bar: progress bar fill null. These failed before S52 (regression from S44b era or earlier). |
| P2 | **AI Chat live activation** | GAS editor → Script Properties → add `GEMINI_API_KEY = <Gemini key>`. Backend wired (Code.gs ai-chat route + AiService.gs). Frontend done (Phase 7). User action only. |
| P3 | **i18n COMPLETE** | All views bilingual after Phase 8. No further i18n phases needed. |

---

---

## ✅ COMPLETED S50 — i18n Phase 7: Gantt, AI Chat, Branch Analysis, User Management

- [x] `i18n.js` — +74 keys (gantt.*, ai.*, branch.*, um.*) VI + EN
- [x] `gantt.js` — subtitle + empty state → `t()` (2 strings)
- [x] `ai-chat.js` — static `_aiSuggestions` → `_getAiSuggestions()` fn; 8 UI strings → `t()`; renamed loop var `t` → `turn` (t()-shadowing fix)
- [x] `branch-analysis.js` — zone tabs, stat cards, table headers → `t()` (12 strings); zoneLabel short → `t('branch.zone.*-short')`
- [x] `user-management.js` — ~45 strings → `t()`; `renderUserManagement()` skips `_umLoad()` if `_umUsers.length > 0` (lang-switch cache); `+_umRestoreFilterUi()` to restore filter DOM; renamed map param `t` → `tk` (t()-shadowing fix)
- [x] `app.js` — `renderAll()` +4 guards: gantt, ai-chat, branch-analysis, user-management
- [x] `config.js` — APP_VERSION `6.15` → `6.16-i18n-phase7-20260710`; cache-bust `?v=20260710b` (56 refs, Python)
- [x] `verify_i18n_p7.mjs` — NEW; **35/35 PASS** (IP7-1→IP7-20: Gantt subtitle/empty, AI Chat header/suggest, Branch zone/stat/col, UM filter/empty/badge, renderAll live-switch, 0 JS errors)
- [x] `run_tests.mjs` — +verify_i18n_p7.mjs as first suite; **19/19 PASS**
- [x] **Key lesson**: `let _umUsers = []` (script-scope lexical) ≠ `window._umUsers`. Tests must use `_umUsers.length = 0; _umUsers.push(...users)` not `window._umUsers = users`.
- [x] **Reused**: `common.all`, `common.cancel`, `common.search`, `page.user-management`
- [x] **Skipped** (domain data): `kpi-overview.js`, `owner-analysis.js`; `kpi-progress.js`, `rm-analysis.js` (already clean)

---

## 🔴 PRIORITY 0 — Smoke test S50 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.16-i18n-phase7-20260710` |
| Gantt view → switch EN | Subtitle: "Timeline view — 2026" |
| Gantt view → no tasks with dates | Empty state: "No tasks with both Start Date and Deadline" |
| AI Chat → switch EN | Header sub: "Ask about tasks, KPIs, initiatives · Powered by Gemini" |
| AI Chat suggestions (EN) | First: "Summarize all currently Blocked tasks" |
| Branch Analysis tabs (EN) | "All / North Region / South Region / Central Region" |
| Branch stat cards (EN) | "Met KPI / Below KPI / Total Branches" |
| User Management → switch EN | Filter label: "Status"; options: "Active / Inactive" |
| UM status badge (EN) | Active row: "Active"; Locked row: "Inactive" |
| Switch back VI | All labels restore to Vietnamese |

---

## 🔲 CANDIDATE TASKS S51+

| Priority | Task | Notes |
|---|---|---|
| P0 | **Smoke test S50 on production** | See checklist above |
| P1 | **Phase 0 security hardening** | Per arch roadmap — input sanitization, RBAC audit |
| P2 | **i18n Phase 8** | `kpi-overview.js`, `owner-analysis.js` — domain KPI data mixed with chrome; needs careful separation |

---

---

## ✅ COMPLETED S49 — i18n Phase 6: Initiative Tracker

- [x] `i18n.js` — +52 `it.*` keys + `db.modal.project-prefix` in VI and EN blocks
- [x] `initiative-tracker.js` — all ~52 hard-coded VI strings → `t()` calls across all 13 functions
- [x] `dashboard.js` — fix `'Dự án: '` prefix → `t('db.modal.project-prefix')`
- [x] `app.js` — `renderAll()` guard for IT view + `updateFilterDropdowns()` filterInit+filterTuanBC via `t()`
- [x] `config.js` — `APP_VERSION='6.15-i18n-phase6-20260710'`; cache-bust `?v=20260710` (56 refs)
- [x] `verify_i18n_p6.mjs` — NEW; **27/27 PASS** (IP6-1 → IP6-15; stat bar VI/EN, scope, filter opts, add btn, empty state, filterInit/filterTuanBC, restore VI, 0 JS errors)
- [x] `run_tests.mjs` — +verify_i18n_p6.mjs as first suite; **18/18 PASS**
- [x] **Key reuse**: `mw.dl.overdue` (IT "Overdue"), `task.scope.mine/all` (IT scope), `common.cancel/save/delete` (IT modal/confirm) — no duplicate keys created
- [x] **Kept as-is** (English banking terms): "Blocked" stat, "Milestones" toggle, category values from GAS

---

## 🔴 PRIORITY 0 — Smoke test S49 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.15-i18n-phase6-20260710` |
| Initiative Tracker → switch EN | Stat bar: "Total Initiatives / Active / Done / Overdue" |
| Scope buttons (EN) | "Mine / All" |
| Filter dropdowns (EN) | "All Categories / All Statuses" |
| Add button (EN) | "Add Initiative" |
| Empty state (EN, clear all inits) | "No Initiatives" |
| Switch back VI | All labels restore to Vietnamese |
| Tasks view → filterInit dropdown (EN) | "All" |
| Tasks view → filterTuanBC dropdown (EN) | "All" / "📅 This Week" |
| Dashboard → initiative table row click (EN) | Modal title "Project: …" (not "Dự án: …") |

---

## ✅ COMPLETED S48 — i18n Phase 5: Quick View + Executive Summary

- [x] `i18n.js` — +12 qv.* keys + 9 es.* keys VI + EN (filter labels, subtitle, time prefix, attention labels, status tags, empty states)
- [x] `quickview.js` — t()-shadowing fix: map var `t` → `tk` in 4 callbacks; `renderQuickView()` calls `_qvPopulateFilters()` + `_qvUpdateTime()` for live lang switch
- [x] `executive-summary.js` — 6 `t()` calls wired: chart empty, attention empty, cfg labels, more-link, init table empty, status tags via `t('es.risk.*')`
- [x] `app.js` — `renderAll()` +2 lines: executiveSummary guard + `if (_qvIsOpen) renderQuickView()`
- [x] `config.js` — APP_VERSION='6.14-i18n-phase5-20260709'; cache-bust `?v=20260709g`
- [x] `verify_i18n_p5.mjs` — NEW; **24/24 PASS** (IP5-1 → IP5-14; covers QV filter/subtitle/labels, ES attention/init-table, EN↔VI switch)
- [x] `run_tests.mjs` — +verify_i18n_p5.mjs as first suite; **17/17 PASS**
- [x] **Bug fixed**: `t()` shadowing in quickview.js map callbacks (loop var `t` shadowed global `t()`) → renamed to `tk`
- [x] **Bug fixed**: `_qvPopulateFilters()` only called in `openQuickView()`, not in `renderQuickView()` → filter labels now update on lang switch

---

## 🔴 PRIORITY 0 — Smoke test S48 on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.14-i18n-phase5-20260709` |
| Open Quick View (QV button) | Panel opens; filter dropdowns in VI ("Tất cả") |
| Switch EN → QV open | Filter: "All" / "All Weeks" / "📅 This Week"; subtitle includes "tasks" |
| QV done card | Shows "Done:" label |
| QV plan card | Shows "Next Week Plan" / "tasks to do" |
| QV issue card | Shows "Pending Approval" / "Issue" flags |
| Switch VI → QV open | Filter: "Tất cả"; subtitle includes "Tất cả"; time "Cập nhật:" |
| Navigate → Executive Summary | View loads |
| Switch EN → ES | Attention items show "Pending Approval" / "Overdue"; init table shows "High Risk"/"Watch" |
| Switch VI → ES | Attention shows "Cần BLĐ"; init table shows "Rủi ro"/"Theo dõi" |

---

## ✅ COMPLETED S47 — i18n Phase 4: My Work

- [x] `i18n.js` — +22 mw.* keys VI + EN (greeting, dl.*, champion.*, urgent.*, tasks.*, init.*, case.*)
- [x] `my-work.js` — all hard-coded VI strings → t()/tState(); fixed t-shadowing by renaming map params t→ct, task
- [x] `config.js` — APP_VERSION='6.13-i18n-phase4-20260709'; cache-bust ?v=20260709f
- [x] `verify_my_work.mjs` — +MW36-MW39 EN/VI switching; **62/62 PASS**
- [x] Full regression: **16/16 suites PASS**

---

## ✅ COMPLETED S46 — CI (TD-012)

- [x] `run_tests.mjs` — sequential runner: 16 suites, ✅/❌ per suite, exits 1 on failure
- [x] `package.json` — `"test": "node run_tests.mjs"` + `"engines": { "node": ">=18" }`
- [x] `.github/workflows/ci.yml` — ubuntu-latest, Node 20, playwright chromium, `npm test`
- [x] Local smoke: **16/16 PASS** in ~5 min

---

## ✅ COMPLETED S45 — i18n Phase 3

- [x] `i18n.js` — +32 keys (cp.stat.*, cp.view.*, cp.preset.*, cp.filter.*, bld.*, ap.*) VI + EN
- [x] `index.html` — data-i18n on CP stat cards, preset spans, view toggle, scope toggle, CP filter labels, BLD filter label/refresh/history; cache-bust ?v=20260709e
- [x] `action-plan.js` — period buttons + summary strip + all-teams option via t()
- [x] `bld-queue.js` — count chip + empty state + filter selects via t()
- [x] `app.js` — renderAll() re-renders AP + BLD when views visible (live lang switch)

---

## 🔴 PRIORITY 0 — Smoke test on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.13-i18n-phase4-20260709` |
| Switch EN: My Work greeting | "Hello, [name] 👋" |
| Switch EN: section titles | "Action Needed / My Tasks / My Initiatives / Team Case Pipeline" |
| Switch EN: deadline badges | "Overdue Xd / Today! / In Xd" |
| Switch EN: champion section | "Weekly Champion / ✅ Updated / ⚠️ Not updated" |
| Switch back VI | All labels restore to Vietnamese |
| CI green | https://github.com/tuanttstb-debug/SHTD-Dashboard/actions |

---

## 🔲 CANDIDATE TASKS S50+

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S49 on production** | See checklist above |
| P2 | **i18n Phase 7** — remaining views | `gantt.js`, `kpi-overview.js`, `kpi-progress.js`, `owner-analysis.js` — low-priority, less user-facing |
| P2 | **Phase 0 security hardening** | Per arch roadmap — input sanitization, RBAC audit |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S44a

- [x] `my-work.js` — _mwBuildInitSection MAX_INIT=4; "Xem tất cả →" calls mwOpenInitPopup(); mwOpenInitPopup/mwCloseInitPopup functions
- [x] `index.html` — #mwInitPopup overlay + #mwInitPopupList + #mwInitPopupCount; cache-bust ?v=20260709c
- [x] `my-work.css` — .mw-popup-ini-item + .mw-popup-ini-header
- [x] `navigation.js` — mwCloseInitPopup() in ESC chain
- [x] `config.js` — APP_VERSION='6.10-mw-init-popup-20260709'
- [x] `verify_my_work.mjs` — MW26-MW29; **45/45 PASS** (was 35)
- [x] Full regression: **15/15 suites 469/469 PASS**

---

## 🔴 PRIORITY 0 — Smoke test on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.10-mw-init-popup-20260709` |
| My Work → Initiative section | Shows up to 4 initiative cards |
| "Xem tất cả →" click | Popup opens (NOT navigating to initiative-tracker) |
| Popup content | Shows ALL root initiatives with status badges, ms/task counts |
| "Mở Initiative Tracker" in popup | Navigates to Initiative Tracker + closes popup |
| ESC key | Closes popup |
| Backdrop click | Closes popup |

---

## 🔲 CANDIDATE TASKS S45

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S44a Initiative Popup** | See checklist above |
| P1 | **Smoke test S43 i18n Phase 2** | Badge v6.9; switch EN → Status/Not Started/Active; switch back → VI restored |
| P1 | **Smoke test S42 My Work** | Login → My Work default landing; role views; quick-save; G+M shortcut |
| P1 | **Smoke test S41 Issue Tracker** | GAS redeploy needed (IssueService.gs) |
| P2 | **My Work — Highlight task champion** | Weekly update reminder for tasks with highlight=Y |
| P2 | **i18n Phase 3** | Extend to other views: bld-queue, case-pipeline filter labels, action-plan |
| P3 | **TD-012: add CI** | npm test + GitHub Actions for 15 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S43

- [x] `i18n.js` — `STATE_KEY` map + `tState()` helper + 50 new VI/EN keys
- [x] `helpers.js` — `stateChip()` uses `tState()` for language-aware display text
- [x] `index.html` — `data-i18n` on filter bar labels, preset button spans, scope toggle spans; explicit `value` attrs on `filterState` options
- [x] `tasks.js` — `renderFilterChips()` uses `t()+tState()`; `renderTaskTable()` count/empty text uses `t()`; `_populateFilterPic()` uses `t('common.all')`
- [x] `config.js` — `APP_VERSION='6.9-i18n-phase2-20260709'`; cache-bust `?v=20260709b`
- [x] `verify_i18n_p2.mjs` — **36/36 PASS** (IP1–IP14)
- [x] `verify_my_work.mjs` — MW18 `loginUsername` focus race fix
- [x] Full regression: **15/15 suites 459/459 PASS** (0 regressions)

---

## 🔴 PRIORITY 0 — Smoke test on production

| Check | Expected |
|---|---|
| Hard-reload (Ctrl+Shift+R) | Badge shows `v6.9-i18n-phase2-20260709` |
| Switch to EN | Filter bar: "Task ID", "Status", "Health (RAG)", "Report Week" |
| State chips (EN) | Task rows show "Not Started", "In Progress", "Completed" |
| Preset buttons (EN) | "Active", "This Week", "Overdue", "All" |
| Scope toggle (EN) | "Mine", "All" |
| Filter chip (EN) | Select Status filter → chip shows "Status: In Progress" |
| Switch back to VI | All labels restore to Vietnamese |
| filterState option value | Select "In Progress" in EN → `filterState.value === "Đang thực hiện"` (filtering still works) |

---

## 🔲 CANDIDATE TASKS S44

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S43 i18n Phase 2** | See checklist above |
| P1 | **Smoke test S42 My Work** | Login → My Work default landing; role views; quick-save; G+M shortcut |
| P1 | **Smoke test S41 Issue Tracker** | GAS redeploy first (IssueService.gs route). |
| P2 | **i18n Phase 3** | Extend to other views: bld-queue, case-pipeline filter labels, action-plan |
| P2 | **My Work — "Xem tất cả Initiative" popup** | Click "Xem tất cả →" → overlay with full initiative list |
| P2 | **My Work — Highlight task champion** | Weekly update reminder for tasks with highlight=Y |
| P3 | **TD-012: add CI** | npm test + GitHub Actions for 15 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S42

- [x] `assets/css/my-work.css` (NEW) — full styles: page, sections, urgent list, task cards, RAG dots, progress, init/case cards, dark mode, responsive
- [x] `assets/js/views/my-work.js` (NEW) — role detection, data getters, HTML builders, `renderMyWork()`, quick-save functions (state/RAG/progress/result)
- [x] `i18n.js` — `nav.my-work` + `page.my-work` VI + EN
- [x] `navigation.js` — `renderMyWork()` dispatch, G+M keymap
- [x] `app.js` — default landing `navigateTo('my-work')` in `startApp()`, `renderAll()` guard
- [x] `index.html` — CSS link, nav item (fa-house-user icon), view section, KB G+M row, script tag, cache-bust `?v=20260709`
- [x] `config.js` — `APP_VERSION='6.8-my-work-20260709'`
- [x] `verify_my_work.mjs` — **35/35 PASS** (port 3042, MW1–MW25)
- [x] Full regression: **14/14 suites 423/423 PASS** (13 existing + new my-work suite)

---

## 🔴 PRIORITY 0 — Smoke test My Work on production

| Check | Expected |
|---|---|
| Login → landing | My Work view loads (not Dashboard) |
| PO user (team Số/BL/CV1/CV2) | 3 sections: Cần làm ngay / Task của tôi / Initiative phụ trách |
| PTKD user (team PTKD MB/MN) | Sections: Cần làm ngay / Task của tôi / Case Pipeline của team |
| Deadline badge | Overdue → "Quá hạn 3N"; soon → "Còn 5N" |
| Urgent section | Tasks ≤7 days appear; done excluded |
| Quick save state | Dropdown change → task saves + re-renders |
| Quick save RAG | Click dot → colors in-place |
| Quick save progress | Click bar → input; blur → bar updates |
| Quick save result | Blur textarea → saved |
| G+M shortcut | Press G then M → My Work |

---

## 🔲 CANDIDATE TASKS S43

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S42 My Work** | See checklist above. Hard-reload first (v6.8-my-work-20260709). |
| P1 | **Smoke test S41 Issue Tracker** | GAS redeploy first (IssueService.gs). |
| P2 | **My Work — "Xem tất cả Initiative" popup** | Click "Xem tất cả →" → overlay with full list (currently navigates to initiative-tracker view). Optional enhancement. |
| P2 | **My Work — Highlight task champion** | Weekly update smoke test (PO requirement from S41 notes). |
| P2 | **i18n Phase 2** | Translate view content labels: tasks filter bar, STATE/RAG display mapping |
| P3 | **TD-012: add CI** | npm test + GitHub Actions for 14 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S41

- [x] `backend/IssueService.gs` (NEW) — Sheet `Issue_Tracker` 18 cols, `issueRead/UpsertRow/DeleteRow()`
- [x] `backend/Code.gs` — 3 routes: `issue-read`, `issue-upsert`, `issue-delete` + auditLog
- [x] `constants.js` — `dbIssues`, all ISSUE_* constants, `ISSUE_SLA_DAYS`
- [x] `api.js` — complete Issue API section: `rowToIssue/issueToRow/genIssueId/_gasIssueUpsert/Delete/readIssues/persistIssues/loadIssuesFromCache`
- [x] `app.js` — `loadIssuesFromCache()` + `readIssues()` on startup
- [x] `assets/css/issue-tracker.css` (NEW, 220 lines) — KPI grid, badges, charts, modal, overlay, dark mode
- [x] `assets/js/views/issue-tracker.js` (NEW, 430 lines) — full view: KPI, charts, MTTR, root cause, table, CRUD modal, view popup, export
- [x] `index.html` — CSS link + nav item (badge) + view section + `#itModal` + `#itViewOverlay` + KB shortcut G+I + script tag + cache-bust `?v=20260708`
- [x] `navigation.js` — `renderIssueTracker()` dispatch, ESC chain, G+I keymap
- [x] `i18n.js` — `page.issue-tracker` VI + EN
- [x] `config.js` — `APP_VERSION='6.7-issue-tracker-20260708'`

---

## 🔴 PRIORITY 0 — GAS redeploy (BLOCKING for Issue Tracker to work)

1. Open GAS editor → New file → paste contents of `backend/IssueService.gs`
2. `Code.gs` already has the 3 new routes (update `Code.gs` in GAS editor too)
3. Deploy → New deployment → Web app → Execute as Me, Anyone
4. URL should stay the same (just a new version)
5. Verify: open Issue Tracker → add test issue → check `Issue_Tracker` sheet auto-created

---

## 🔴 PRIORITY 0b — Smoke test Issue Tracker

| Check | Expected |
|---|---|
| Navigate G+I | Issue Tracker view loads; KPI cards show 0/0/0/– |
| Thêm Issue | Modal opens; severity→ deadline auto-fills; Loại xử lý → status options update |
| Save issue | Toast "✅ Đã tạo issue IS-26-001"; row appears in table; `syncDot` blinks |
| SLA Breach highlight | Set deadline to yesterday → row turns red (`row-overdue` class) |
| Charts | After 3+ issues: Trend line shows data points; System bar shows counts |
| MTTR table | After 1 resolved issue with ngayGiaiQuyet set: table shows dept row |
| Export Excel | Click Export → `.xlsx` downloaded with correct headers |
| View popup | Click table row → view overlay opens; backdrop click closes |
| ESC | Modal + popup both close on ESC |
| Dark mode | Severity/status badge colors adjust correctly |

---

## 🔲 TODO S42 — CANDIDATE TASKS

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S41 Issue Tracker** | See table above. GAS redeploy first. |
| P1 | **Smoke test S40 BL migration** | Confirm GAS data migrated (all `team='BL1'/'BL2'` → `'BL'`); users re-logged in to refresh session token. |
| P2 | **Issue Tracker — comment/log thread** | Add per-issue notes timeline (Ghi chú entries with timestamp+user), similar to audit history tab |
| P2 | **Issue Tracker — bulk status update** | Select multiple issues → change status/dept together |
| P2 | **i18n Phase 2** | Translate VIEW content labels: tasks filter bar, STATE/RAG display mapping |
| P3 | **TD-012: add CI** | `npm test` + GitHub Actions for 11 test suites |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S40

- [x] `constants.js` TEAM_LIST: `['BL1','BL2',...]` → `['BL','CV1','CV2','PTKD MB','PTKD MN','QLDM','Số']`
- [x] `index.html` `#filterTeam` + `#ganttFilterTeam`: BL1/BL2 → BL
- [x] `config.js` APP_VERSION → `'6.6-team-bl-merge-20260707'`; cache-bust → `?v=20260707`
- [x] `verify_action_plan.mjs`, `verify_case_pipeline_s36.mjs`, `verify_mobile_s37.mjs`: BL1/BL2 → BL; **all pass**
- [x] `backend/MigrationService.gs` (NEW): `dryRunTeamBL()` / `commitTeamBL()` — batch migrate sheets

---

## ✅ COMPLETED S39

- [x] Create `assets/js/i18n.js` — `t()`, `setLang()`, `applyI18n()`, TRANSLATIONS VI+EN (~120 keys)
- [x] VI/EN toggle pill to topbar; `.lang-toggle` CSS in `components.css`
- [x] `index.html` — `data-i18n` on 30+ elements
- [x] `navigation.js` — `t('page.'+view)`; `copyPath()` toasts use `t()`
- [x] `crud.js` — modal/confirm/toast use `t()`
- [x] `app.js` — `applyI18n()` + toggle sync on `window.onload`
- [x] cache-bust `?v=20260706b` (52 refs); `APP_VERSION='6.6-i18n-phase1-20260706'`

---

## ✅ COMPLETED S39

- [x] Create `assets/js/i18n.js` — `t()`, `setLang()`, `applyI18n()`, TRANSLATIONS object VI+EN (~120 keys each), `_lang` in localStorage (`5579193`)
- [x] Add VI/EN toggle pill to topbar; `.lang-toggle` + `.lang-btn` CSS in `components.css` (`5579193`)
- [x] `index.html` — `data-i18n`/`data-i18n-title` on nav sections (6), nav items (5), login overlay, breadcrumb, topbar icon titles, dashboard KPI cards+section titles+filter bar (30+ elements) (`5579193`)
- [x] `navigation.js` — `titles` map removed, replaced with `t('page.'+view)`; `copyPath()` toasts use `t()` (`5579193`)
- [x] `crud.js` — modal titles, confirm titles+buttons, key toasts now use `t()` (`5579193`)
- [x] `app.js` — `window.onload` calls `applyI18n()` + syncs lang toggle button active state (`5579193`)
- [x] `i18n.js` as FIRST script tag; cache-bust `?v=20260706b` (52 occurrences); `APP_VERSION='6.6-i18n-phase1-20260706'` (`5579193`)

---

## 🔲 TODO S40 — CANDIDATE TASKS

> Ưu tiên: P1 = blocking / user-reported; P2 = next feature; P3 = tech debt / cleanup

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S39 i18n** | Manual: switch to EN → nav shows "Overview"/"Management"/"Reports"/"Assistant"/"Administration"; nav items show "BLĐ Approval"/"Initiative Tracker"/"Task Management"/"User Management"; dashboard KPIs show "Total Tasks"/"Completed"/"In Progress"/"Overdue"; login shows "Sign In"/"Username"/"Password". Switch back → VI restored. Badge `v6.6-i18n-phase1-20260706`. |
| P1 | **Smoke test S38 conflict detection** | Manual: open same task in 2 tabs, save Tab B first, then save Tab A → "⚠️ Xung đột cập nhật" dialog. Verify [Hủy] reloads form with Tab B's data; [Ghi đè và lưu] writes Tab A's version. |
| P1 | **Smoke test S37 on real iOS device** | Playwright 21/21 ✅ confirmed. Real-device: topbar always visible, toolbar buttons reachable, sticky thead clears topbar when scrolling. |
| P1 | **Smoke test S36 on production** | Confirm RAG dots gone for done/blocked; scope=all default; tuần BC filter; summary popup. |
| P2 | **i18n Phase 2** | Translate VIEW content labels: tasks filter bar (Lọc theo, Tìm kiếm...), STATE_LABELS/RAG_LABELS display mapping (display-only, not raw data), KPI view labels. Requires careful display-layer mapping: `STATE_DISPLAY[lang][rawValue]` pattern so raw GAS values unchanged. |
| P2 | **Case Pipeline — table view sort by giaTriTy** | Currently Kanban only. Table view has no sort on value column. |
| P2 | **Case Pipeline — export to Excel** | No export button currently. Should follow pattern of task export. |
| P3 | **i18n Phase 3** | Full coverage: bld-queue, initiative-tracker, action-plan form labels. |
| P3 | **TD-012: add CI** | 11 test suites, 255 assertions. `npm test` script + GitHub Actions would prevent regressions. |
| P3 | **TD-004: global state** | `let _cpFilterTuanBC`, `let _cpScope`, etc. accumulate as module-level mutable state. |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S37

- [x] Fix topbar hidden on iOS Safari: `.topbar{position:fixed;top:0;left:0;right:0;z-index:150}` — removed from flex flow, unaffected by `.main{overflow:hidden}` (`7eb9547`)
- [x] Content padding-top: 74px (≤768px) / 68px (≤480px) to clear fixed topbar (`7eb9547`)
- [x] Sticky thead top: 62px (≤768px) / 56px (≤480px) to clear fixed topbar when scrolling (`7eb9547`)
- [x] Toolbar stack vertically on mobile: `flex-direction:column` + `width:100%` for left/right + `flex-wrap:wrap;justify-content:flex-start` for buttons (`7eb9547`)
- [x] `.path-hint{display:none}` on mobile — long file path not actionable on mobile (`7eb9547`)
- [x] Cache-bust `?v=20260627c` (51 occurrences); `APP_VERSION='6.6-mobile-toolbar-fix-20260627c'` (`7eb9547`)
- [x] Playwright smoke test `verify_mobile_s37.mjs` **21/21 PASS** at 375×812 iPhone viewport — M1–M10 covering topbar fixed, content padding, hamburger, sidebar, toolbar stack, path-hint, thead offset, scroll behavior

---

## 🔲 TODO S38 — CANDIDATE TASKS

> Ưu tiên: P1 = blocking / user-reported; P2 = next feature; P3 = tech debt / cleanup

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S37 on real iOS device** | Playwright 21/21 ✅ already confirmed. Real-device check confirms `100vh` browser chrome offset on actual iOS Safari. Verify: (1) topbar always visible, not hidden behind URL bar; (2) toolbar buttons in Tasks + Case Pipeline all reachable; (3) sticky thead clears topbar when scrolling; (4) sidebar slide-in still works. Badge shows `v6.6-mobile-toolbar-fix-20260627c`. |
| P1 | **Smoke test S36 on production** | Confirm RAG dots gone for done/blocked; scope=all default; tuần BC filter; summary popup. |
| P2 | **Case Pipeline — table view sort by giaTriTy** | Currently Kanban only. Table view has no sort on value column. |
| P2 | **Case Pipeline — export to Excel** | No export button currently. Should follow pattern of task export. |
| P2 | **Summary popup — pagination** | If `dbCases` grows large (>50 cases), popup body will be very long. Add simple pagination or max-height scroll indicator. |
| P3 | **TD-012: add CI** | 11 test suites, 255 assertions. `npm test` script + GitHub Actions would prevent regressions. |
| P3 | **TD-004: global state** | `let _cpFilterTuanBC`, `let _cpScope`, etc. accumulate as module-level mutable state. Consider encapsulating per-view state in objects. |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S36

- [x] Done/blocked stages: `calcCaseRag()` returns `''` for done/blocked groups; `action-plan.js` overdue check updated
- [x] Default scope = 'all' for all users (removed role check from `_getCpScope()`)
- [x] Filter tuần báo cáo (`cpFilterTuanBC` select, chronological sort, chip, clear)
- [x] Summary popup: `#cpSummaryOverlay`, 4 types (total/value/overdue/bld), clickable rows open detail, ESC closes
- [x] Playwright 28/28 PASS — `verify_case_pipeline_s36.mjs`; EVD in `test-results/cp_s36/`
- [x] Cache-bust `?v=20260627b` (51 occurrences); `APP_VERSION=6.6-case-pipeline-enhancements-20260627`

---

## 🔲 TODO S37 — CANDIDATE TASKS

> Ưu tiên: P1 = blocking / user-reported; P2 = next feature; P3 = tech debt / cleanup

| Priority | Task | Notes |
|---|---|---|
| P1 | **Smoke test S36 on production** | Confirm RAG dots gone for done/blocked; scope=all default; tuần BC filter; summary popup. Users must hard-reload first. |
| P2 | **Case Pipeline — table view sort by giaTriTy** | Currently Kanban only. Table view has no sort on value column. |
| P2 | **Case Pipeline — export to Excel** | No export button currently. Should follow pattern of task export. |
| P2 | **Summary popup — pagination** | If `dbCases` grows large (>50 cases), popup body will be very long. Add simple pagination or max-height scroll indicator. |
| P3 | **TD-012: add CI** | 11 test suites, 255 assertions. `npm test` script + GitHub Actions would prevent regressions. |
| P3 | **TD-004: global state** | `let _cpFilterTuanBC`, `let _cpScope`, etc. accumulate as module-level mutable state. Consider encapsulating per-view state in objects. |

---

## NGUYÊN TẮC BRANCH (CONFIRMED S24)

```
main   →  push trực tiếp (Developer / AI) — Production + development
fix/*  →  hotfix isolate nếu cần (tùy chọn)
master →  ĐÃ XÓA hoàn toàn (local + remote) từ 2026-06-16 (S24)
```

**AI/Claude push thẳng lên `main`. Không tạo lại master.**

---

## ✅ COMPLETED S33

- [x] GAS `auditReadByEntity(entityId)` in `AuditService.gs` — reads Audit_Log, filters by Summary prefix match (avoids cross-ID false positives) (`ea55a2b`)
- [x] GAS `audit-read` route in `Code.gs` — no ADMIN_ONLY gate; all authenticated roles can access (`ea55a2b`)
- [x] GAS deployed by user 2026-06-24 — `audit-read` live, URL unchanged (`ea55a2b`)
- [x] `_gasAuditRead(entityId)` + `_buildHistoryTable(rows, synthetic, actionMap)` in `api.js` — lazy fetch, action badges, alternating rows, empty state icon, fmtTs handles ISO/YYYY-MM-DD/DD-MMM-YY (`ea55a2b`)
- [x] CSS: `.popup-tabs`, `.popup-tab`, `.popup-tab.active`, `.badge-info` appended to `components.css` (`ea55a2b`)
- [x] Task history tab: `_taskHistoryLoaded` flag + `_taskTabSwitch()` + `_loadTaskHistory()` in `tasks.js`; synthetic "Tạo mới" row from `t.startDate` (`ea55a2b`)
- [x] Case history tab: same pattern in `case-pipeline.js`; **startDate defaults to today (YYYY-MM-DD)** when `openCaseModal(null)` (`ea55a2b`)
- [x] Initiative history tab: same pattern in `initiative-tracker.js`; **startDate defaults to today (DD-MMM-YY)** using `_MMM` global when `_initOpenModal(null)` (`ea55a2b`)
- [x] `index.html`: tab bars + history panes added to `#taskViewOverlay`, `#initViewOverlay`, `#cpViewOverlay`; cache-bust `?v=20260622` → `?v=20260624` (35 script tags, Python); `APP_VERSION = '6.4-history-20260624'` (`ea55a2b`)
- [x] `verify_history.mjs` (new, port 9992): **47/47 PASS** — H1–H14 covering HTML structure, tab switching, lazy load, history content, synthetic row, startDate defaults; EVD to `test-results/history/` (`ea55a2b`)
- [x] `AI_CONTEXT/PROJECT_STATE.md` updated (v6.4, HEAD `ea55a2b`) (`466f9e9`)

---

## ✅ COMPLETED S32

- [x] docs(S31 handover): SESSION_HANDOVER + PROJECT_STATE + TODO_NEXT + TECH_DEBT updated (`f583f80`)
- [x] `verify_select_bug.mjs` 23/23 PASS — S31 regression tests: selectAll scoped, navigateTo clear, filter clear, goPage clear, deletedIds blacklist (`b95627d`)
- [x] Bug: `sortBy()` now calls `selectedIds.clear()` — column sort reorders tasks across pages; stale selections showed wrong count in bulk bar (`56e3e43`)
- [x] Bug: cache-bust bumped `?v=20260619d` → `?v=20260622` via Python (NOT PowerShell — corrupts Vietnamese UTF-8); `APP_VERSION = '6.3-select-fix-20260622'` (`56e3e43`)
- [x] `verify_select_bug.mjs`: S6 (sortBy test) added → **26/26 PASS**; EVD screenshots s6_before/after_sort.png captured (`56e3e43`)

---

## ✅ COMPLETED S31

- [x] Bug 1: `_gasTaskUpsert` discarding `task-delete` response when task ID changes → task reappears in DB (`689bb10`)
- [x] Bug 2a: `onFilterChange()` missing `selectedIds.clear()` → filter change left stale bulk selections (`5a75f97`)
- [x] Bug 2b: Removed 7 duplicate filter event listeners from `setupListeners()` that were cancelling `onFilterChange`'s debounce (`9e8bfd3`)
- [x] Bug 2c: `navigateTo('tasks')` now calls `selectedIds.clear()` before `renderTaskTable()` → bulk bar no longer shows on page enter (`0cec10b`)
- [x] Bug 3: `db.deletedIds` blacklist — prevents Excel import from re-inserting deleted tasks; persisted in localStorage; pruned on GAS read confirm (`df3339b`)
- [x] `toggleSelectAll` scoped to current page only (`ea8d5d7`)

---

## ✅ COMPLETED S30

- [x] Root cause confirmed: `syncAction` in `bulk.js` → `task-write + N rows` (selectedIds persists across views)
- [x] `bulk.js`: `bulkSetRag/State/Delete` → N × `_gasTaskUpsert`/`_gasTaskDelete` (atomic, optimistic-update) — NO syncAction
- [x] `config.js`: new GAS URL (new deployment with `task-upsert`, `task-delete`, `case-upsert`, `case-delete`, `initiative-upsert` handlers)
- [x] APP_VERSION badge in topbar breadcrumb (`v6.3-no-syncaction-20260619`)
- [x] Startup console diagnostic: confirms version + whether deleteTask uses atomic or old syncAction
- [x] `syncAction()` caller trace: logs stack whenever called (debug, temporary)
- [x] Cache-bust all 35 script tags → `?v=20260619d`
- [x] `verify_atomic_write.mjs`: added T8b + T8c — **41/41 PASS**
- [x] Commit + push `4fc6648`, `origin/main` ✅

---

## ✅ COMPLETED S29

- [x] Audit 8 điểm dùng `localAction()` → save success nhưng không ghi GAS (S23b regression)
- [x] `crud.js`: `handleSubmit` + `deleteTask` → `await syncAction()`
- [x] `bulk.js`: `bulkSetRag/State/Delete` → `await syncAction()`; rename `const synced` tránh duplicate declaration
- [x] `bld-queue.js`: task BLD approval → `await syncAction()` (parity với case BLD)
- [x] `initiatives.js`: `syncInitiativeAdd/Edit` thêm `return` để expose promise
- [x] `initiative-tracker.js`: `_initSave` → `async`, thêm `await` trước sync calls, toast sau sync
- [x] `verify_sync_fix.mjs`: 24/24 PASS — GAS calls verified runtime cho tất cả 8 features
- [x] Commit `2986e51`, push `origin/main`
- [x] TD-034 (CRITICAL data loss) → RESOLVED

---

## ✅ COMPLETED S28

- [x] Commit tài liệu HDSD: `USER_MANUAL.md`, `HDSD/` (10 screenshots), `SYSTEM_UNDERSTANDING_REPORT.md` — từ untracked 2026-06-16
- [x] Commit reference + utility files: `TPBank_KPI_Dashboard_v2.1.html`, `generate_docx.py`, `screenshot_hdsd.mjs`, `um_test.mjs`, `verify_ms_tasks.png`
- [x] Cập nhật AI_CONTEXT handover + memory files cho cả hai project

---

## ✅ COMPLETED S27

- [x] `_initOpenMilestone()`: auto-gen ID = `{parentId}-M{nextNum}`, pre-fill Category từ parent initiative
- [x] `_initNextMsNum(parentId)`: tính số thứ tự milestone tiếp theo (max existing `-M{n}` + 1)
- [x] `openTaskModalForMilestone(msId, iniId)`: mở task modal pre-filled initiative, milestone, category, PIC Accountable (từ ini.accountable), team (từ _appUsers), auto-gen task ID
- [x] "+ Task" button trên mỗi milestone row trong `_initBuildMilestoneList()`
- [x] "+ Thêm Task" trong empty-state của milestone task panel (`_initBuildMsTaskList()`)
- [x] Test: `verify_milestone_task.mjs` 23/23 PASS; `verify_task_init_popup.mjs` 28/28 PASS (no regression)
- [x] Commit `104b81c`, push `origin/main`

---

## ✅ COMPLETED S26

- [x] Fix: `updateFilterDropdowns()` không còn rebuild `filterPic` — tránh format conflict (picNorm vs Username) gây mất filter sau save
- [x] `_populateFilterPic()` trong `renderTaskTable()` là owner duy nhất của `filterPic` dropdown
- [x] Test: `verify_task_init_popup.mjs` 28/28 PASS (no regression)
- [x] Commit `7dbabce`, push `origin/main`

---

## ✅ COMPLETED S25

- [x] Task view popup: `rowClick()` → `openTaskViewPopup(id)` — read-only overlay, full task details, chips, grid, sections
- [x] Task view popup: "Chỉnh sửa" → `taskViewOpenEdit()` → ghi nhớ `_taskEditReturnId` → open edit modal
- [x] Return-to-popup: `handleSubmit()` re-open task view popup sau save; cancel clears `_taskEditReturnId`
- [x] Initiative view popup: card header click → `openInitViewPopup()` (cursor:pointer); stopPropagation trên actions
- [x] Initiative view popup: "Chỉnh sửa" → `initViewOpenEdit()` → `_initEditReturnId` → `_initOpenModal()`
- [x] `_initSave()`: re-open init popup sau save nếu `_initEditReturnId` set
- [x] Task rows trong milestone/linked-task list → `openTaskViewPopup()` (không còn `editTask()`)
- [x] ESC handler: thêm `closeTaskViewPopup()`, `closeInitViewPopup()`, `_initCloseModal()`
- [x] `#taskViewOverlay` + `#initViewOverlay` HTML (reuse `.cp-view-*` CSS)
- [x] Test: `verify_task_init_popup.mjs` 28/28 PASS; all regression tests pass

## ✅ COMPLETED S19

- [x] GAS Backend: `CasePipelineService.gs` (caseRead, caseWrite, auto-create sheet)
- [x] Code.gs routes: `case-pipeline-read`, `case-pipeline-write`
- [x] Frontend constants: CASE_STAGES (14), CASE_COLS (20), CASE_LOAI_HINH, CASE_COMPLEXITY, dbCases
- [x] API layer: caseToRow, rowToCase, genCaseId, calcCaseRag, readCases, writeCases, syncCaseAction (với GAS fallback), persistCases, loadCasesFromCache
- [x] CSS: `case-pipeline.css` (Kanban, cards, modal, summary, stage groups)
- [x] View: `case-pipeline.js` (renderCasePipeline, Kanban 14 cols, summary cards, CRUD modal, filters, Excel import/export)
- [x] index.html: CSS link, nav item, view section, CRUD modal, G+C shortcut in kb-grid, script tag
- [x] navigation.js: title map, render dispatch, G+C shortcut, ESC close cpModal
- [x] app.js: startup cache load, readCases, navBadgeCase, dbCases reset on clear
- [x] BLD Queue: _bldGetPendingCases, _bldBuildCaseHTML, bldOpenAction multi-source, bldSubmitAction case branch
- [x] Tests: verify_case_pipeline.mjs 20/20 PASS; verify_bld_queue.mjs 46/46 PASS; verify_ms_tasks.mjs 14/14 PASS
- [x] PO deploy GAS: CasePipelineService.gs + Code.gs routes case-pipeline-* (2026-06-15; GS_WEBAPP_URL không đổi)
- [x] Smoke test thêm task live: ✅ thành công

## ✅ COMPLETED S20

- [x] index.html: Restructure #view-case-pipeline — card wrapper, toolbar + view toggle (Table/Kanban), preset bar 4 tabs, filter bar (Task Manager pattern), filter chips, #cpTableWrap (default), #cpBoardWrap (hidden)
- [x] case-pipeline.css: Thêm .cp-view-toggle/.cp-view-btn, .cp-stage-chip.group-*, .cp-rag-dot, .row-overdue, .text-danger-bold, .sort-icon styles
- [x] case-pipeline.js: Full rewrite → Table-primary (paginated 20/page, sortable 10 cols), 4 preset tabs, _cpGetFiltered() unified, debounced search, filter chips, _cpInitPresetTabs() on every render
- [x] api.js: syncCaseAction thêm syncDot.className = 'status-dot syncing' tại đầu hàm
- [x] initiatives.js: syncInitiativeAction() (Task Manager gold standard), syncInitiativeAdd/Edit/Delete dùng pattern mới
- [x] verify_case_pipeline.mjs: 22/22 PASS (table-primary — +TEST05b kanban toggle, +TEST08b preset tabs)

## ✅ COMPLETED S21

- [x] constants.js: +TEAM_LIST (8 teams: BL1/BL2/CV1/CV2/PTKD MB/PTKD MN/QLDM/Số) — offline fallback
- [x] api.js: +_appUsers[], loadAppUsers() (GAS 'user-list'), getAppTeams(), getUsersByTeam(), _populateTeamSelect(), _populateUserSelect() với offline fallback + PIC mismatch protection
- [x] app.js: loadAppUsers() non-blocking trên startup
- [x] index.html: Task modal fTeam→select+onchange, fPicAcc/fPicRes→select; Case modal cpfTeam→select+onchange, cpfPic→select
- [x] crud.js: openTaskModal() dùng _populateTeamSelect/_populateUserSelect; +onTaskTeamChange() (re-filter PIC + autoGenId)
- [x] case-pipeline.js: openCaseModal() dùng helpers; +onCaseTeamChange()
- [x] initiative-tracker.js: initFAcc input→select; populate via _populateUserSelect (all users)
- [x] verify_case_pipeline.mjs: Fix TEST12 .fill()→.selectOption() cho cpfTeam — 22/22 PASS
- [x] verify_bld_queue.mjs: 46/46 PASS (no regression); verify_ms_tasks.mjs: 14/14 PASS

## ✅ COMPLETED S22b (undocumented — commits between S22 và S23 trên main)

- [x] docs: update S22 ai_context handover (`6f1c23b`)
- [x] fix(user-management): constrain table-wrap height so only rows scroll (`b134d54`)
- [x] feat: pre-fill Team/PIC from logged-in user on Add modal — Task/Case/Initiative (`5323b75`)
- [x] rebrand: org name 'Số Hóa Tín Dụng / Khối KHDN' → 'Trung tâm SP&GPTD' (`691ba9b`)
- [x] fix(initiatives): repair milestone-to-parent linking when sheet has no header row (`ef40075`)

## ✅ COMPLETED S23

- [x] Task filter: PIC cascade từ Team — `_populateFilterPic(team)`, `onFilterTeamChange()` trong tasks.js (`b3262eb`)
- [x] Case Pipeline filter: PIC cascade từ Team — `_cpSyncFilterPic()`, `cpFilterTeamChange()` (`b3262eb`)
- [x] Case Pipeline: DVKD column trong bảng + DVKD filter dropdown (`b3262eb`)
- [x] Import RBAC: `lead-only` CSS class + `canImport()` JS guard — restrict import tới Admin+Teamlead (`dfac565`)
- [x] Modal grid fix: `minmax(0,1fr)` trong forms.css + case-pipeline.css + initiative.css (`6ad6c32`)
- [x] Tests: verify_filter_cascade.mjs 23/23, verify_import_rbac.mjs 15/15, verify_modal_layout.mjs 9/9
- [x] ai_context handover S23 (`11c5770`)

## ✅ COMPLETED S23b

- [x] refactor(sync): Task CRUD/bulk/BLD-approval → `localAction()` (local only, no GAS write) (`65388ae`)

## ✅ COMPLETED S24

- [x] Code.gs: xóa `user-list` khỏi `ADMIN_ONLY` → tất cả roles load `_appUsers` (`a58474e`)
- [x] bld-queue.js: `${isAdmin() ? '...' : ''}` gate trên Phê duyệt/Từ chối/Yêu cầu bổ sung — cả `_bldBuildCaseHTML` + `_bldBuildItemHTML` (`a58474e`)
- [x] performance.js: +`openPerfTaskPopup(key)` — click row → detailOverlay với filtered tasks (`a58474e`)
- [x] case-pipeline.js: +`openCaseViewPopup(id)`, `closeCaseViewPopup()`, `cpViewOpenEdit()`, `_cpViewId`; `cpOpenDetail()` → popup (`a58474e`)
- [x] index.html: +`#cpViewOverlay` HTML (read-only case detail modal) (`a58474e`)
- [x] case-pipeline.css: +`.cp-view-grid` CSS layout cho popup (`a58474e`)
- [x] navigation.js: +`closeCaseViewPopup()` trong Escape handler (`a58474e`)
- [x] tasks.js: picRes filter case-insensitive `.toLowerCase()` — PA1 (`edc6a26`)
- [x] parsers.js: +`_resolvePickerCase()` — canonical Username resolve; gọi cuối `_parseArrayIntoDb()` — PA2 (`edc6a26`)
- [x] api.js: gọi `_resolvePickerCase()` sau `loadAppUsers()` — handle cache-before-users race — PA2 (`edc6a26`)
- [x] Branch cleanup: local + remote `master` đã xóa; push thẳng `main` từ nay
  - `api.js`: +`localAction()` function
  - `crud.js`: saveTask(), deleteTask() use localAction
  - `bulk.js`: bulkSetRag(), bulkSetState(), bulkDelete() use localAction; fixed count-before-clear bug
  - `bld-queue.js`: task BLD approval path uses localAction; Case BLD still syncCaseAction (unchanged)
  - Only `handleImport()` in app.js retains `syncAction()` — sole GAS write path for tasks

---

## ✅ COMPLETED S35

- [x] Fix stale DOM handle in `verify_action_plan.mjs` AP9: re-query `page.$('.ap-filter-bar select')` after `selectOption('BL2')` triggers re-render — new `teamSelReset` const (`a28f770`)
- [x] Fix AP13 test: initiatives have no period filter → empty state never fires in prev-month; assert `html.includes('0 tasks/cases')` in toolbar count instead (`a28f770`)
- [x] **24/24 PASS** on verify_action_plan.mjs (previously crashing at AP9 reset after 18 tests)
- [x] Bug fix: left sidebar not scrollable on desktop — `.sidebar { height:100vh }` + `.nav-menu { min-height:0 }` in `layout.css`; sidebar scrollbar styled rgba(255,255,255,0.2) for dark bg (`2cb947f`)
- [x] CSS cache-bust: added `?v=20260624c` to all 16 local `<link rel="stylesheet">` tags — CSS had no versioning before S35 (`2cb947f`)
- [x] JS cache-bust `?v=20260624b` → `?v=20260624c` (35 script tags, Python); `APP_VERSION = '6.5-sidebar-scroll-fix-20260624c'` (`2cb947f`)

---

## ✅ COMPLETED S34

- [x] `action-plan.js` complete rewrite: filter state, role-aware default team, period range, extended criteria (Blocked/overdue auto-add), grouped accordion Admin view, single-team User/TL view, Tasks+Cases mixed kanban, Initiatives section (no period filter) (`a28f770`)
- [x] CSS: Action Plan v2 styles appended to `components.css` (`a28f770`)
- [x] `verify_action_plan.mjs` (new, port 9993): **24/24 PASS** — AP1–AP14 (`a28f770`)
- [x] Cache-bust `?v=20260624` → `?v=20260624b`; `APP_VERSION = '6.5-action-plan-v2-20260624b'` (`a28f770`)
- [x] Docs: PROJECT_STATE, SESSION_HANDOVER, TODO_NEXT updated

---

## ✅ COMPLETED S33

- [x] GAS `auditReadByEntity(entityId)` + `audit-read` route — all roles, deployed 2026-06-24 (`ea55a2b`)
- [x] `_gasAuditRead()` + `_buildHistoryTable()` in `api.js` (`ea55a2b`)
- [x] History tab in Task/Case/Initiative view popups — lazy load (`ea55a2b`)
- [x] startDate defaults to today for new Case (YYYY-MM-DD) and Initiative (DD-MMM-YY) (`ea55a2b`)
- [x] CSS: `.popup-tabs`, `.popup-tab.active`, `.badge-info` (`ea55a2b`)
- [x] `verify_history.mjs` 47/47 PASS (`ea55a2b`)

---

## 🔴 PRIORITY 0 — User hard-reload required (Ctrl+Shift+R)

Cache-bust `?v=20260624c` pushed in `2cb947f`. Users must hard-reload to pick up **both JS and CSS** changes from S34+S35:

- **Windows/Linux**: Ctrl+Shift+R (or Ctrl+F5)
- **Mac**: Cmd+Shift+R
- **Verify**: Topbar badge shows `v6.5-sidebar-scroll-fix-20260624c`
- **Verify sidebar**: Nav menu scrolls when items exceed viewport height (e.g. "Quản lý User" accessible at bottom)

⚠️ **CSS cache-bust was missing before S35** — if users did Ctrl+Shift+R after S33/S34 they still got old CSS. S35 is the first release where CSS is properly versioned.

---

## 🔴 PRIORITY 0b — Smoke test production: Action Plan v2

Sau hard-reload, smoke test trên live:

| Scenario | Steps | Expected |
|---|---|---|
| **Admin view** | Login Admin → Action Plan | Accordion nhóm theo team; số task/case mỗi team; first team mở sẵn |
| **User/TL view** | Login User/Teamlead → Action Plan | Hiển thị kanban của team chính; summary strip phía trên |
| **Period filter** | Click "Quý này" / "Tháng trước" | Kanban cập nhật đúng deadline trong kỳ |
| **RAG filter** | Click "■ Red" | Chỉ hiện task/case RAG=Red |
| **Team dropdown (Admin)** | Chọn BL1 từ dropdown | Chuyển sang single-team kanban view cho BL1 |
| **Auto badge** | Tìm task Blocked (highlight=N) | Xuất hiện trong kanban với ⚡Auto badge |
| **Initiatives section** | Xem bên dưới kanban | Hiện danh sách parent initiatives của team |
| **Accordion toggle** | Click header team để thu/mở | Body ẩn/hiện không re-render toàn bộ |
| **Task card click** | Click card trong kanban | taskViewOverlay mở đúng task |
| **Case card click** | Click card có ★CASE badge | cpViewOverlay mở đúng case |

---

## ✅ PRIORITY 0c — GAS redeploy — RESOLVED 2026-06-24

- `audit-read` route deployed — URL unchanged
- `task-upsert`/`task-delete` returning `serverTs` — also confirmed in S30 GAS

---

## 🔴 PRIORITY 0d — Verify production atomic writes (S30)

| Check | Expected GAS Audit_Log |
|---|---|
| **Delete single task via modal** | `task-delete \| CV-xxx \| Task Name` — KHÔNG có `task-write + N rows` |
| **Save/edit single task via modal** | `task-upsert \| CV-xxx \| Task Name` |
| **Bulk RAG change** | N × `task-upsert \| ID` (1 per task) — KHÔNG có `task-write + N rows` |
| **Bulk delete** | N × `task-delete \| ID` — KHÔNG có `task-write + N rows` |
| **Excel import (expected)** | `task-write + N rows` — đây là ĐÚNG, chỉ path này còn dùng syncAction |
| **Verify badge** | Topbar hiện `v6.3-no-syncaction-20260619` |
| **Verify console** | `[SHTD] v6.3-... — deleteTask uses: ✅ _gasTaskDelete` |

**Sau khi verify OK**: Xóa debug trace khỏi `api.js` (syncAction caller log) và startup diagnostic khỏi `app.js`.

---

## 🔴 PRIORITY 0e — Fix verify_sync_fix.mjs (stale after S30)

`verify_sync_fix.mjs` (S29, 24/24) test bulk ops gọi `syncAction`. Sau S30 bulk dùng atomic → những tests sẽ FAIL. Options:
- Update tests T3–T5 để expect `task-upsert`/`task-delete` thay vì `write`
- Hoặc deprecate file (coverage đã có trong verify_atomic_write.mjs T8b/T8c)

---

## 🔴 PRIORITY 0f — Smoke test live: S29 + S25–S27 features (còn hiệu lực)

| Feature | Check |
|---|---|
| **Task save → GAS** | Edit task → Lưu → syncDot hiện "syncing" rồi "connected"; reload page → data vẫn đúng trên Sheet |
| **Task delete → GAS** | Xóa task → Sheet mất task đó ngay (không cần import) |
| **Bulk ops → GAS** | Chọn 2+ tasks → bulk RAG/State/Delete → Sheet cập nhật (atomic per row) |
| **BLD approve task → GAS** | BLD approve task → yKienBLD lên Sheet (parity với Case BLD) |
| **Initiative save → GAS** | Thêm/sửa initiative → syncDot syncing→connected; Sheet cập nhật |
| **Milestone auto-gen ID** | Mở Initiative Tracker → bấm "Thêm Milestone" → ID tự điền dạng `{iniId}-M{n}` → Category pre-filled từ initiative cha |
| **Add Task from Milestone** | Bấm "+ Task" trên milestone row → task modal mở → fInit, fMs, fCat, fPicAcc pre-filled đúng; task ID tự gen theo pattern `{iniId}-M{n}-001` |
| **Add Task from empty milestone panel** | Mở task panel của milestone chưa có task → bấm "+ Thêm Task" → modal pre-filled đúng |
| **Task view popup** | Click task row → taskViewOverlay hiện đúng data; Chỉnh sửa → edit modal; ESC đóng |
| **Initiative view popup** | Click card header → initViewOverlay hiện đúng data; Chỉnh sửa → initiative modal; ESC đóng |
| **Return-to-popup sau save** | Edit task từ view popup → save → popup re-opens với data mới |
| **Filter preserved after save** | Chọn filter PIC → edit/add task → save → filter PIC còn nguyên trong dropdown |
| **Display_Name (Username) dropdowns — non-Admin** | Login với role User/Teamlead → mở Task modal → fPicRes có format "Tên (username)" |
| **GAS deploy confirm** | Xác nhận GAS đã deploy với user-list không còn ADMIN_ONLY |

---

## 🟡 PRIORITY 1 — Smoke test live: S23 features (cascade filter, RBAC, modal)

| Feature | Check |
|---|---|
| **Task filter — PIC cascade** | Chọn Team trong filter bar → filterPic dropdown update đúng users |
| **Case filter — PIC cascade** | Chọn Team → cpFilterPic update; DVKD column hiển thị; filter DVKD hoạt động |
| **Import RBAC** | Login User → Import button ẩn; login Teamlead/Admin → visible |
| **Modal layout** | Mở Edit modal Task/Case/Initiative → 2 cột đều nhau, không bị squeeze |
| **Case BLD approval** | BLD approve case → yKienBLD lưu vào Sheet ngay (syncCaseAction) |
| Case Pipeline load | Mở view → Table view là default, hiển thị đúng dữ liệu từ Sheet |

---

## 🟡 PRIORITY 1b — Dọn dead code: `localAction()` và debug trace

1. **`localAction()`** trong `api.js` — không còn caller sau S29. Xác nhận: `grep -r "localAction" assets/js/` = 0 ngoài khai báo → xóa.
2. **syncAction caller trace** trong `api.js:244` — debug log tạm thời, xóa khi production stable.
3. **Startup diagnostic** trong `app.js:18` — debug log tạm thời, xóa khi production stable.

---

## 🔴 PRIORITY 2 — Verify AI Chat trên live

AI Chat frontend hoàn chỉnh từ S12. GAS-side chưa xác nhận.

**Steps**:
1. Login Admin → AI Assistant → gõ câu hỏi
2. Nếu lỗi → GAS editor → AiService.gs → Script Properties → `GEMINI_API_KEY` → Deploy new version

---

## 🟡 PRIORITY 3 — Fix Testing Environment (Netlify hết credit)

Options (chưa chọn):
- **A) Cloudflare Pages** (miễn phí, unlimited) — khuyến nghị
- **B) GitHub Pages cho master** (gh-pages branch)
- **C) Local only** — hiện đang dùng tạm

---

## W2 — Tech Debt (low priority)

| ID | Debt | Effort |
|---|---|---|
| TD-033 | `verify_initiative_v2.mjs` không inject auth → fail local; copy pattern verify_bld_queue | Small |
| TD-008 | No error boundary in `renderAll()` | Small |
| TD-018 | `fmtExportDate` duplicated `app.js` vs `helpers.js` | Tiny |
| TD-023 | `_oaActiveTab` not reset on re-render | Tiny |
| AUTH-05 | KNOWN_ROLES hardcoded | Small |
| ~~TD-030~~ | ~~User Management table — no search/pagination~~ | ✅ Done S22 |
| TD-031 | BAU task ID gap sequence khi clone | Tiny |

---

## Session Rules

1. **Đọc SESSION_HANDOVER + PROJECT_STATE trước** — không skip
2. **Branch**: push thẳng lên `main`; `master` không dùng nữa kể từ S19
3. Không thay đổi `DB_COLS`, `localStorage['shtd_v2'].tasks` — trừ khi PO yêu cầu
4. One logical change per commit
5. Tất cả GAS calls qua `gasPost()` — không raw `fetch()`
6. `GS_WEBAPP_URL` trong `assets/js/config.js` — cập nhật mỗi lần GAS redeploy
7. `esc()` trên mọi user-supplied content render qua `innerHTML`
8. **Test local**: `npx http-server . -p 3030 &` → `node verify_case_pipeline.mjs` + `node verify_bld_queue.mjs`
9. `syncCaseAction` có local fallback — khi GAS down vẫn save local.
10. **Git sync**: commit + `git push origin HEAD:main` ngay sau mỗi thay đổi — git remote LUÔN phải đồng bộ với local. Không delay push.
