# Tuần báo cáo (Report Week) — Thiết kế đa-tuần (S62, 2026-08-05)

> Nâng cấp "Tuần BC" của **Task**: từ 1 chuỗi free-text nhập tay → membership **đa tuần** chuẩn ISO,
> auto suy từ ngày + gắn tay khi cần. Case Pipeline **để đợt sau** (cũng có `cpfTuanBC` free-text).

## Yêu cầu chốt (phỏng vấn user)
| # | Quyết định |
|---|---|
| Cơ chế | **Hybrid** — auto suy từ Start–Deadline + cho sửa/thêm tay |
| Nội dung | **Dùng chung 1** Kết quả/Kế hoạch (KHÔNG snapshot theo tuần → không đổi schema nội dung) |
| Chuẩn tuần | **ISO-8601** (thứ 2 đầu tuần, week-year), nhãn `Tuần WW/YYYY` |
| Task quá hạn chưa xong | Auto kéo membership tới **tuần hiện tại** |
| Phạm vi đợt này | **Chỉ Task** (Case sau); migrate data cũ + cập nhật filter/report |

## Mô hình — "membership hợp nhất" (union)
Cột `Tuần BC` (Task_Master, cột 2) đổi ngữ nghĩa: từ 1 chuỗi → **danh sách tuần pin** (phân cách `;`).
Hàm gốc duy nhất (helpers.js), mọi read path gọi nó:

```
taskReportWeeks(task) = autoWeeks(task) ∪ pinnedWeeks(task)   // sorted asc, deduped
  • autoWeeks  = tuần ISO từ Start → max(Deadline, hôm-nay nếu state≠'Hoàn thành')   ← LIVE, không lưu
  • pinnedWeeks = parse cột "Tuần BC" (đa giá trị)                                    ← lưu (chỉ tuần GẮN TAY)
```

**Hệ quả:** task có ngày → pinned rỗng → tuần tự suy hết (0 nhập liệu). Task không ngày → gắn tay.
Task đa tuần / quá hạn → hiện ở mọi tuần liên quan (membership, không phải exact-match).

**Giới hạn v1:** hỗ trợ **thêm** tuần tay, **chưa** hỗ trợ **bớt** 1 tuần auto (auto luôn tính lại).
Nếu cần "bớt" → thêm cột `Tuần loại trừ` (exclude) sau. `REPORT_WEEK_MAX_SPAN = 60` chặn ngày rác.

## API helpers (assets/js/helpers.js)
`isoWeekParts/isoWeekLabel/currentIsoWeekLabel` · `isoWeekMonday/isoWeeksInRange` ·
`weekInputToLabel ⇄ labelToWeekInput` (`2026-W16` ⇄ `Tuần 16/2026`) · `parseWeekLabel` (chuẩn hoá free-text) ·
`parsePinnedWeeks` (đa giá trị) · **`taskReportWeeks`** (gốc) · `taskInReportWeek` · `taskFirstWeekKey` (sort) ·
`taskWeeksBadge` ("tuần đầu (+N)") · `allReportWeeks` (union toàn bộ task → dropdown filter).

3 hàm tuần trùng lặp cũ (`_getThisWeekLabel` tasks.js, `currentWeekLabel` dashboard.js, `_qvCurrentWeek`
quickview.js) — công thức jan4 **lệch ISO** — nay đều delegate `currentIsoWeekLabel()`.

## UX nhập liệu (modal Task — index.html + crud.js)
Thay `<input type="text" #fTuanBC>` bằng control chip:
- **chip auto** (xám, dashed, tooltip "Tự động từ ngày") — cập nhật realtime khi đổi Start/Deadline/Trạng thái.
- **chip pin** (viền primary, có ×) — user thêm qua `<input type="week" #fTuanAdd>` (picker ISO native) + nút "Thêm tuần".
- hidden `#fTuanBC` chỉ lưu **pin ngoài auto** (`_tuanRenderChips` set value = pins.join('; ')).
- crud.js: `_tuanInit/_tuanRenderChips/_tuanAddWeek/_tuanRemove/_tuanAutoWeeks`; `_tuanInit` gọi ở cả 2 nhánh `openTaskModal`.

## Read path đã đổi sang membership
`tasks.js` (preset "week", count, filter, cột bảng badge, sort `taskFirstWeekKey`) ·
`app.js` (populate `filterTuanBC` = `allReportWeeks`, dashboard `weekScope`, `openReportModal`) ·
`report.js` (`weekTasks` — task đa tuần vào **mọi** báo cáo liên quan) · `dashboard.js` · `quickview.js` ·
`performance.js`. Tất cả `(t.tuanBC||'').trim() === X` → `taskInReportWeek(t, X)`.

## Migration data cũ (backend/ReportWeekMigration.gs)
`dryRunNormalizeWeeks()` / `commitNormalizeWeeks()` — chạy trong GAS Editor (không phải Web App route).
Chuẩn hoá `Tuần BC` free-text → nhãn ISO (đa giá trị), giá trị lạ **giữ nguyên + log** để rà tay.

## Test
`verify_report_week.mjs` (NEW, port 3046, **17/17**) — ISO biên năm, range, overdue-extend, union, parse, badge.
`verify_preset.mjs` cập nhật: `THIS_WEEK` dùng ISO; "Tuần này" preset giờ = mọi task chưa 'Hoàn thành'
start trước (membership) → 7 (was exact-match 3).

## ⚠️ Điểm nghiệp vụ cần biết
Với overdue-extension, preset "Tuần này" ≈ **mọi task đang mở** (đã bắt đầu, chưa xong) — không còn là
"chỉ task gắn tag tuần này". Đúng yêu cầu user nhưng là **thay đổi ngữ nghĩa** đáng lưu ý khi đọc báo cáo.

## TODO tương lai
- Áp cùng cơ chế cho **Case Pipeline** (`cpfTuanBC`).
- (Nếu cần) cơ chế "bớt tuần auto" (cột exclude).
- Cân nhắc memoize `taskReportWeeks` nếu số task rất lớn (hiện gọi nhiều lần/ render).
