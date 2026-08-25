# Task định kỳ (Recurring Task) — Thiết kế "log 1 lần" (S80, 2026-08-25)

> Theo dõi task **định kỳ tuần/tháng** mà chỉ **log 1 lần** + mỗi kỳ **tick 1 click**. Tái dùng tối đa
> nền tảng (Report Week membership S62 + hạ tầng noti), **ít đụng cấu trúc nhất** (2 cột append, 0 route mới).

## Yêu cầu chốt (phỏng vấn [TT] 2026-08-25)
| # | Quyết định |
|---|---|
| Phạm vi | **Tính năng chung** cho mọi task (không chỉ AIUS-001) |
| Tần suất | **Cả Tuần và Tháng** |
| Mức theo dõi | **Trạng thái kỳ hiện tại + nhắc** (chưa cần lịch sử tuân thủ/%; nhưng dữ liệu đủ để mở rộng) |
| Cách log | **Owner tự tick 1 click** mỗi kỳ ("Xong kỳ này") |
| Nhắc | Task tuần chưa tick → **nhắc ở tuần KẾ TIẾP**, message ghi rõ **task tuần nào** (nhắc hồi tố kỳ miss). Tháng tương tự (kỳ kế). |
| Quá kỳ | Hết tuần/tháng chưa tick = **MISS** (giữ hiển thị đỏ) |
| Vị trí nút tick | **My Work + bảng Tasks + Quick View** |

## Đánh giá phương án
- ❌ **Nổ task mỗi kỳ**: vi phạm "log 1 lần" + phình DB.
- ❌ **Tiền tố text `[Định kỳ]`** (AIUS-001 đang dùng): không theo dõi được từng kỳ.
- ✅ **PA3 — Report Week membership + 2 cột append** (chọn): log 1 lần, tick 1 click, auto-reset, ít đụng cấu trúc.
- ❌ Sheet phụ `Recurring_Log`: thêm cấu trúc, chưa cần.

## Mô hình dữ liệu — +2 cột APPEND (không đụng 25 cột cũ)
| Cột | Header | Ý nghĩa |
|---|---|---|
| **Z (26)** | `Định kỳ` | `''` (một lần, mặc định) · `Tuần` · `Tháng` |
| **AA (27)** | `Kỳ đã xong` | Danh sách kỳ đã hoàn thành, phân cách `; ` — vd `Tuần 34/2026; Tháng 08/2026` |

- `taskToRow` (api.js) append 2 phần tử: `t.recurrence`, `t.donePeriods`.
- Parser (parsers.js × 2) map theo **header-name** (`ci(['địnhkỳ'])`/`ci(['kỳđãxong'])`) → `t.recurrence`, `t.donePeriods`.
- `GS_RANGE` `A1:Y`→`A1:AA` (thực ra chỉ là hằng số tài liệu — GAS đọc/ghi động theo `getLastColumn`/`values[0].length`).

## Key kỳ (helpers.js — tái dùng ISO week sẵn có)
- Tuần: `isoWeekLabelOf(date)` → `Tuần WW/YYYY` (đã có `currentIsoWeekLabel`/`isoWeekParts`).
- Tháng: NEW `monthLabelOf(date)` → `Tháng MM/YYYY`; `currentMonthLabel()`.
- `periodKeyOf(freq, date)` → nhãn kỳ theo tần suất.

## Trạng thái kỳ = SUY RA (0 lưu thêm) — `taskPeriodStatus(t)`
```
freq = t.recurrence ('Tuần'|'Tháng'|''); nếu '' → không phải định kỳ.
done = parse(t.donePeriods)                    // set nhãn đã xong
curLabel = periodKeyOf(freq, hôm nay)
status:
  • ✓ Xong kỳ này   nếu curLabel ∈ done
  • Chưa            nếu chưa (kỳ hiện tại còn hạn)
missed = các kỳ trong [Start … kỳ trước hiện tại] KHÔNG ∈ done  // MISS (đỏ), giữ hiển thị
```
→ **Auto-reset**: sang kỳ mới `curLabel` đổi → tự về "Chưa", **không job reset**.
- Tuần: tập kỳ = `taskReportWeeks(t)` giới hạn ≤ tuần hiện tại. Tháng: `monthsInRange(Start, hôm nay)`.

## Log 1 click — `toggleTaskPeriodDone(taskId)`
- Nút **"✓ Xong kỳ này"** → append `curLabel` vào `Kỳ đã xong`; bấm lại = gỡ.
- Lưu qua **route `task-upsert` cũ** (optimistic như CRUD hiện tại) — **0 route mới**.

## Nhắc (Pha 2 — NotificationService.gs, cần redeploy GAS)
- `notifScan`: task `Định kỳ` mà **kỳ TRƯỚC** (tuần/tháng liền trước hiện tại) không ∈ `Kỳ đã xong` → sinh noti
  **"Task định kỳ [tên] chưa hoàn thành [Tuần WW/YYYY]"** (nhắc ở kỳ kế tiếp, ghi rõ kỳ miss).
- Thu hồi khi owner tick kỳ đó (reconcile như S79). NotifID gồm nhãn kỳ để không trùng/không kẹt.

## Phân pha
| Pha | Nội dung | Redeploy Web App? |
|---|---|---|
| **1 (FE)** | 2 cột + parser + taskToRow + helper period + trạng thái/miss + nút tick (My Work/Tasks/QuickView) + select Định kỳ trong modal + filter | **Không** (chỉ chạy `RecurrenceMigration.gs` 1 lần) |
| **2 (Backend)** | Nhắc theo kỳ trong NotificationService.gs | **Có** |

## Migration — `backend/RecurrenceMigration.gs`
`dryRunAddRecurrence()` / `commitAddRecurrence()` — set `Z1='Định kỳ'`, `AA1='Kỳ đã xong'` + backfill rỗng + bump DATA_VER. Chạy trong GAS editor (không phải Web App route).

## Test — `verify_recurring.mjs`
Period key biên tuần/tháng (giao năm), trạng thái ✓/Chưa/MISS, toggle tick, parse donePeriods, membership tuần bound ≤ hiện tại.

## Rủi ro / lưu ý
- **`taskToRow` positional** → append đúng cuối (index 25,26); parser theo header nên an toàn thứ tự.
- Migration phải set header trước khi tick (parser map theo header) — nếu chưa có header, recurrence/donePeriods fallback `''`.
- Tháng dùng **key song song** (`Tháng MM/YYYY`) tách khỏi report-week (không đụng logic tuần).
- Không bump nhiều cache: cache-bust `?v=` khi đổi FE.
