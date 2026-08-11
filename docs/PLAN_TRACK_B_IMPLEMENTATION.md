# PLAN — TRACK B: TRIỂN KHAI HỆ THỐNG H2 (phân tích & kế hoạch chi tiết)
### Mapping mục tiêu H2 → tính năng & kiến trúc hiện hữu của SHTD-Dashboard

**Phiên bản**: 1.0 · **Ngày**: 2026-08-11 · Tiền đề: Track A đã xong (`docs/00–03`, `data/04` + 2 sample). Quyết định đã chốt: reuse Task_Master (action), 100%/member weight, đặt trong SPA production (menu mới "Quản trị H2"), RBAC-gated.

> Mục tiêu tài liệu: biến framework H2 thành **kế hoạch code file-by-file**, **tái sử dụng tối đa** pattern hiện có, **không phá vỡ** production. Đây là bản thiết kế để review trước khi build.

---

## 1. NGUYÊN TẮC TRIỂN KHAI
1. **Extend, not rewrite** — clone đúng khuôn mẫu entity hiện có (Dev_Plan là template gần nhất: có ownership gate).
2. **Domain cô lập** — mọi thứ prefix `h2` / `H2_`; sheet/route/view/CSS/i18n riêng; **không đụng** view/route/sheet cũ.
3. **Data-driven** — pillar/priority/category/RAG threshold/tháng nằm ở sheet `H2_Config`, không hard-code.
4. **Reuse engine, không dựng lại** — atomic write + lock + reassign id + audit + notification + RAG board + executive summary đều dùng lại.
5. **Backward-compatible** — client cũ không gọi route mới; route mới không đổi contract cũ.

---

## 2. MA TRẬN MAPPING — Yêu cầu H2 → Tính năng/Kiến trúc hiện hữu

| Yêu cầu H2 (master prompt) | Tái sử dụng từ | Mức | Việc cần làm |
|---|---|---|---|
| **Objective → Milestone → Action** (Layer 1–3) | `Initiative_Master + Milestone` pattern (`InitiativeService.gs`, `initiative-tracker.js`) | Clone khuôn | Sheet `H2_Objectives` + `H2_KPIs` + `H2_Milestones` theo pattern; view mô phỏng initiative-tracker |
| **Action layer** (việc để đạt KPI) | `Task_Master` + toàn bộ engine task (assignment, %HT, deadline, tuần, notification) | Reuse | Soft-link: Action = Task, tham chiếu `taskId` trong milestone/tracking (Phase 1); native column Phase 2 |
| **Member** (member_id, role, scope, capability_level) | `User_Master` + `UserService.gs` + RBAC (`auth.js`, token role) | Reuse + extend | Thêm cột `Capability_Level` + `Product_Scope` vào User_Master (additive) |
| **Monthly tracking T8–T12 + RAG** (Layer 4) | `helpers.js` RAG (`stateChip`, ISO date), `taskReportWeeks` (membership tháng), Action Plan RAG board | Reuse logic | Sheet `H2_MonthlyTracking`; hàm RAG `h2ComputeRag()` trong helpers |
| **Cảnh báo Amber/Red + deadline** | `NotificationService.gs` (`notifScan/notifOnWrite`, 3d/1d/today/overdue, email digest) | Reuse + hook | Thêm entity `h2kpi`/`h2milestone` vào notif scan; RED/AMBER → chuông + Management Action |
| **Dashboard điều hành** (Layer 5, §18–19) | `executive-summary.js` (health/attention/risk tags) + `action-plan.js` (RAG kanban, priority) + `kpi-overview.js` (KPI cards, Chart.js) | Reuse pattern | View `h2-dashboard.js` ghép: exec summary + member/project/RAG/risk/capacity/AI |
| **Priority P1/P2/P3 + P1 view riêng** (§17) | Action Plan priority + filter chips pattern | Reuse pattern | Filter P1/member/project trong `h2-tracker.js` |
| **Weight & scoring 100%/member** (§8) | (mới) — Achievement formula `02_KPI_DESIGN_GUIDE §7` | Mới nhỏ | `h2Score()` trong helpers |
| **Capacity view** (§16) | Đếm theo member/project (giống dashboard count) | Mới nhỏ | `h2Capacity()` aggregate |
| **Management capability 8 chiều** (§11) | `H2_Reviews` + capability scores | Mới | Sheet `H2_Reviews` (cột cap 1–8) + form |
| **H1/T7 self-review + Quarterly** (§12,15) | `03_MEMBER_TEMPLATE` + modal pattern | Mới | Sheet `H2_Reviews` + modal form |
| **Concurrency an toàn** | `Concurrency.gs` (`_acquireWriteLock`, `reassignIdIfExists`) | Reuse | Bọc mọi `h2-*-upsert` |
| **Audit** | `AuditService.gs` (`auditLog`, `audit-read`, History tab) | Reuse | `auditLog(tokenData,'h2-*-upsert',...)` + History tab |
| **Song ngữ / dark / modal / toast / responsive** | Shell (`i18n.js`, `ui/*`, css tokens) | Reuse | +key `h2.*`; modal/toast dùng sẵn |
| **Executive Report generator** (§32) | `report.js` (Excel export) + Track A `EXECUTIVE_REPORT_H2_BLD.md` | Reuse + mới | Nút "Xuất báo cáo BLĐ" → sinh HTML/text copy Word/Email |
| **AI layer** (§21) — để sau | `AiService.gs` (Gemini, `buildContext`) | Kiến trúc chừa sẵn | Thêm H2 vào context khi có data; chưa build đợt này |
| **Validation/flag KPI xấu** (§27, `02 §6`) | (mới) test mjs theo pattern `verify_*.mjs` | Reuse harness | `verify_h2_*.mjs` |

**Kết luận mapping**: ~80% nhu cầu H2 nằm trên engine đã có. Phần "mới thật sự" = schema H2 + logic scoring/RAG/capacity + view dashboard + form review. Không có phần nào cần rewrite.

---

## 3. DATA MODEL (8 sheet cốt lõi — sẽ tách ra `07_DATA_MODEL.md` khi build)

Quy ước: cột A = ID (prefix + số, hợp `reassignIdIfExists`); ngày = ISO `YYYY-MM-DD` (`toISODate`); member = `username` (khớp User_Master).

### 3.1 `H2_Config` — cấu hình data-driven
`[Key, Value, Group, Note]` — pillars, categories(A/B/C/D), priorities(P1/P2/P3), RAG thresholds (amber_pct, red_pct, deadline_amber_days), months(T8..T12), period(H2/2026), max_objectives(5), max_p1(3).

### 3.2 `H2_Objectives` — Team + Member objective (unified)
`[ID, Type, ParentID, Pillar, ObjectiveName, Why, Owner, Priority, Weight, Category, Status, StartDate, DueDate, CreatedBy]`
- `Type` = `team|member`; member objective có `ParentID` = team objective (roll-up). Prefix ID: `OBJ-`.

### 3.3 `H2_KPIs`
`[ID, ObjectiveID, KpiName, KpiType, Baseline, Target, Unit, Weight, Deadline, Status, Evidence, Owner]` — prefix `KPI-`. `KpiType` ∈ A/B/C/D.

### 3.4 `H2_Milestones`
`[ID, KpiID, Month, Quarter, MilestoneName, DueDate, Owner, Status, RAG, TaskRef]` — prefix `MS-`. `TaskRef` = soft-link tới Task_Master ID (Action).

### 3.5 `H2_MonthlyTracking` — nhịp tim
`[ID, Month, KpiID, Member, Target, Actual, Progress, RAG, Issue, NextAction, SupportNeeded, UpdatedAt]` — prefix `TRK-`. 1 dòng / KPI / tháng.

### 3.6 `H2_Risks`
`[ID, KpiID, Risk, Impact, Probability, Mitigation, Owner, Status]` — prefix `RSK-`.

### 3.7 `H2_Dependencies`
`[ID, KpiID, DependencyType, DependencyOwner, RequiredDate, Status, Note]` — prefix `DEP-`.

### 3.8 `H2_Reviews` — H1 self-review + Quarterly + Capability
`[ID, Member, ReviewType, Period, Q_commit, Q_actual, Q_pct, Q_impact, Q_gap, Q_rootcause, Q_lesson, Q_adjust, Cap_Goal, Cap_Plan, Cap_Prior, Cap_Own, Cap_Risk, Cap_Dep, Cap_Track, Cap_Exec, CreatedAt]` — `ReviewType` ∈ H1|Q3|Q4. Cap_* = thang 1–5.

**Người & Việc (reuse, không tạo sheet)**: Member = `User_Master` (+2 cột `Capability_Level`, `Product_Scope`). Action = `Task_Master` (soft-link qua `TaskRef`/tracking). `Audit_Log` dùng chung.

---

## 4. BACKEND (GAS) — file & route

### 4.1 File mới `backend/H2Service.gs` (clone `DevPlanService.gs` × 8 sheet)
Mỗi sheet 1 bộ: `h2XxxRead()` (auto-create header), `h2XxxUpsertRow(row,id)`, `h2XxxDeleteRow(id)`, `h2XxxGetOwnerById(id)` (ownership). Gom generic hoá: `_h2Read(sheetName, header)`, `_h2Upsert(sheetName, header, row, id)`, `_h2Delete(sheetName, id)`, `_h2Owner(sheetName, ownerCol, id)` → giảm lặp. Header constants theo §3.

### 4.2 Route thêm vào `backend/Code.gs` (theo đúng khuôn `task-upsert`)
Read: `h2-config-read`, `h2-objectives-read`, `h2-kpis-read`, `h2-milestones-read`, `h2-tracking-read`, `h2-risks-read`, `h2-deps-read`, `h2-reviews-read` (gộp được 1 route `h2-read-all` trả object nhiều sheet để giảm round-trip — **khuyến nghị**).
Write (mỗi cái bọc `_acquireWriteLock()` + `isNew` → `reassignIdIfExists()` + `auditLog` + `notifOnWrite` nếu là kpi/milestone):
`h2-objective-upsert/delete`, `h2-kpi-upsert/delete`, `h2-milestone-upsert/delete`, `h2-tracking-upsert`, `h2-risk-upsert/delete`, `h2-dep-upsert/delete`, `h2-review-upsert`.
**RBAC**: đọc = mọi role đã login. Ghi objective/kpi/milestone/config = **Admin/Teamlead** (challenge & duyệt). Ghi tracking/review = **owner (member) hoặc Admin/Teamlead** (ownership gate y hệt dev-upsert: so `tokenData.u` với cột Owner/Member). Team objective/weight/priority = Teamlead-only.

### 4.3 Hook Notification (`NotificationService.gs`)
Thêm nhận diện entity `h2kpi`/`h2milestone` trong `notifScan()` (quét `Deadline`/`DueDate`, sinh due-3d/1d/today/overdue) và `notifOnWrite()` (RED/AMBER khi tracking cập nhật). Deep-link mở popup KPI trong dashboard.

---

## 5. CLIENT (frontend) — file & wiring

### 5.1 `assets/js/constants.js` (additive)
`let dbH2 = { config:[], objectives:[], kpis:[], milestones:[], tracking:[], risks:[], deps:[], reviews:[] };` + các `H2_*_COLS` map (index cột theo §3).

### 5.2 `assets/js/api.js` (clone `_gasDevUpsert/_gasDevDelete` + `_adoptReassignedId`)
`readH2()` (gọi `h2-read-all`, parse vào `dbH2`, `persist`), `writeH2*` per-entity atomic: `_gasH2ObjectiveUpsert`, `_gasH2KpiUpsert`, `_gasH2MilestoneUpsert`, `_gasH2TrackingUpsert`, `_gasH2RiskUpsert`, `_gasH2DepUpsert`, `_gasH2ReviewUpsert` + các `*Delete`. Mỗi hàm: syncDot syncing→connected, toast lỗi khi fail (giữ optimistic như 5 entity hiện có).

### 5.3 `assets/js/helpers.js` (thêm logic H2)
`h2ComputeRag(kpi, tracking, cfg)` (GREEN/AMBER/RED theo threshold config + deadline), `h2Achievement(kpi, actual)` (4 công thức `02 §7`), `h2Score(member)` (Σ weight×achievement), `h2Capacity()` (đếm KPI/P1/project theo member → cờ overload), `h2WeightValidate(member)` (tổng=100%), `h2FlagBadKpi(kpi)` (thiếu target/unit/weight/priority; "target" nhị phân) cho §6 validation.

### 5.4 Views mới `assets/js/views/`
- `h2-tracker.js` — danh sách Objective→KPI→Milestone (clone `initiative-tracker.js`): filter member/project/pillar/priority/RAG; CRUD modal objective/kpi/milestone; view popup + History tab; nút cập nhật tracking tháng.
- `h2-dashboard.js` — Executive dashboard (clone `executive-summary.js` + `kpi-overview.js`): Exec Summary cards (overall achievement, G/A/R, completed, at-risk) → Team Objective progress → Member → Project → Monthly trend (Chart.js) → Top risks → Top dependencies → Capacity → AI impact → **Management Actions** (Teamlead). Drill-down qua popup.
- `h2-review.js` — form H1 self-review + Quarterly + capability 8 chiều (modal), member-scoped.
- (tuỳ chọn) `h2-report.js` — nút "Xuất báo cáo BLĐ" sinh nội dung theo `EXECUTIVE_REPORT_H2_BLD.md` từ data thật (copy Word/Email).

### 5.5 `index.html` (điểm chèn chính xác)
- **CSS**: `<link ... href="assets/css/h2.css?v=...">` (cạnh dev-plan.css, dòng ~29).
- **Nav** (sau `data-view="dev-plan"` dòng 91): nhóm menu mới **"Quản trị H2"** với `nav-item` `data-view="h2-dashboard"`, `data-view="h2-tracker"`, `data-view="h2-review"` (gate `lead-only`/`admin-only` phù hợp; member thấy tracker/review của mình).
- **View sections** (cạnh `view-dev-plan` dòng 240): `<section class="view-section" id="view-h2-dashboard">`, `id="view-h2-tracker"`, `id="view-h2-review"`.
- **Modals/overlays**: modal objective/kpi/milestone/tracking/review + view popups (clone khối modal dev-plan/initiative).
- **Script**: `<script src="assets/js/views/h2-*.js?v=...">` (cạnh dòng 1952) + cập nhật cache-bust `?v=` toàn bộ 60 refs (theo quy trình hiện có).

### 5.6 `assets/js/ui/navigation.js`
- `navigateTo()`: thêm `if (view==='h2-dashboard') renderH2Dashboard();` `h2-tracker` → `renderH2Tracker()`; `h2-review` → `renderH2Review()`.
- ESC chain: thêm `closeH2Modal(); closeH2ViewPopup();`.
- (tuỳ chọn) phím tắt `g h` → h2-dashboard.

### 5.7 `assets/js/app.js`
- Startup (sau `readDev()` dòng ~43): `readH2(); // non-blocking`.
- `syncDB()` (dòng ~179): thêm `readH2()` vào Promise.all.
- `renderAll()` (dòng ~81): guard re-render h2 views khi visible.

### 5.8 `assets/js/i18n.js` + `assets/css/h2.css`
Thêm block `h2.*` (VI+EN): nav, pillar, priority, RAG, section titles, modal labels, review fields. CSS clone token `.cp-stat-card`/table/modal (theme-aware).

---

## 6. DASHBOARD SPEC (tóm tắt — chi tiết sẽ ra `06_DASHBOARD_SPEC.md`)
Executive-first, ≤3 phút. Thứ tự block: **Exec Summary** (overall achievement %, G/A/R count, completed, at-risk) → **Team Objectives** (progress bar mỗi objective) → **Member** (KPI theo member + achievement) → **Project** (GNOL/BLOL/SCF/AI/khác) → **Monthly Trend** (Chart.js line, T8–T12) → **Top Risks** → **Top Dependencies** → **Capacity** (member × #KPI/#P1/#project, cờ overload) → **AI Impact** → **Management Actions** (KPI Red/Amber cần Teamlead). Filter: member/project/P1/RAG/deadline 7-14-30d. Drill-down: Exec→Team→Member→KPI→Milestone→Action(task).

---

## 7. MIGRATION DỮ LIỆU PILOT
1. Từ `data/SAMPLE_QuangNN3_H2.md` + `SAMPLE_DungLQ1_H2.md` → sinh rows cho `H2_Objectives/KPIs/Milestones/Risks/Dependencies`.
2. Cách nạp: (a) **Seed script** `backend/H2SeedPilot.gs` (dryRun/commit) ghi thẳng vào sheet — nhanh, chuẩn; hoặc (b) nhập tay qua modal sau khi view chạy. **Khuyến nghị (a)** cho pilot, (b) để kiểm chứng UX.
3. Không đổi ý nghĩa KPI; giữ `[cần đo T8]` là ô trống + flag.

---

## 8. VALIDATION / TEST (theo §27, harness `verify_*.mjs` + Playwright)
| Test | Nội dung | File |
|---|---|---|
| T1 | Member 5 KPI → dashboard tính đúng achievement/score | `verify_h2_dashboard.mjs` |
| T2 | KPI → GREEN → dashboard cập nhật | `verify_h2_rag.mjs` |
| T3 | KPI → RED → xuất hiện trong Risk view + Management Action | `verify_h2_rag.mjs` |
| T4 | Đổi deadline → dashboard/RAG phản ánh | `verify_h2_rag.mjs` |
| T5 | Member nhiều project → capacity đúng | `verify_h2_capacity.mjs` |
| T6 | Xuất Executive Summary được | `verify_h2_report.mjs` |
| T7 | Duplicate KPI được phát hiện | `verify_h2_validate.mjs` |
| T8 | Thiếu Target/Weight/Owner → cảnh báo | `verify_h2_validate.mjs` |
| + | CRUD atomic + ownership gate + weight=100% | `verify_h2_crud.mjs` |
Thêm vào `run_tests.mjs`; đảm bảo suite cũ 26/27 không đổi (regression).

---

## 9. TRÌNH TỰ BUILD (phân pha, mỗi pha commit + push)

| Pha | Nội dung | Deliverable | Ước lượng |
|---|---|---|---|
| **B0** | Docs còn lại: `07_DATA_MODEL`, `06_DASHBOARD_SPEC`, `05_TEAMLEAD_OPERATING_MODEL`, `08_USER_GUIDE`, `README` | docs đầy đủ | Nhỏ |
| **B1** | Backend: `H2Service.gs` (8 sheet, generic helpers) + routes `Code.gs` + RBAC/ownership + audit; deploy GAS | Backend live, test qua Postman/console | TB |
| **B2** | Client core: `constants` + `api.readH2/_gasH2*` + `helpers` (RAG/score/capacity/validate) | Data đọc/ghi được | TB |
| **B3** | View `h2-tracker` (CRUD Objective/KPI/Milestone + filter + view popup + History) | Nhập/sửa KPI trên UI | Lớn |
| **B4** | `h2-review` (H1 self-review + quarterly + capability) | Member submit review | TB |
| **B5** | `h2-dashboard` (Exec summary + member/project/trend/risk/dep/capacity/AI/mgmt-action + drill-down) | Dashboard điều hành | Lớn |
| **B6** | Notification hook (RED/AMBER + deadline KPI/milestone) | Cảnh báo tự động | Nhỏ |
| **B7** | Migration pilot (`H2SeedPilot.gs`) → nạp Quang+Dung | Pilot data live | Nhỏ |
| **B8** | Executive Report generator (nút xuất) | Báo cáo copy Word/Email | Nhỏ |
| **B9** | Tests `verify_h2_*` + `run_tests.mjs` + regression + smoke | Xanh + 0 regression | TB |

**Thứ tự bắt buộc**: B1→B2→(B3∥B4)→B5→B6→B7→B8→B9. B0 làm song song.

---

## 10. RỦI RO & ROLLBACK
| Rủi ro | Giảm thiểu |
|---|---|
| Đụng schema Task_Master (24 cột) nếu native-link | **Phase 1 dùng soft-link `TaskRef`** (không đổi Task schema); native column là Phase 2 có cân nhắc |
| Nhiều sheet → nhiều round-trip chậm | Route gộp `h2-read-all`; đọc non-blocking startup |
| Phá vỡ view cũ | Domain cô lập, prefix `h2`; route mới thuần thêm; test regression suite cũ |
| GAS deploy quên → route 404 | Theo quy trình: commit code trước, deploy sau, ghi version |
| ANBM/mạng nội bộ chặn `script.google.com` | Dùng đúng hạ tầng hiện hành (S67 cá nhân); không đổi account |
| Member không cập nhật | UX <5 phút; auto RAG; nhắc qua chuông |
Rollback: mỗi pha 1 commit; route/sheet mới độc lập → gỡ menu + không gọi route = trở lại trạng thái cũ; không migration phá dữ liệu cũ.

---

## 11. QUYẾT ĐỊNH CẦN TEAMLEAD XÁC NHẬN TRƯỚC KHI BUILD
1. ✅ **CHỐT (2026-08-11)**: **Action linkage = soft-link `TaskRef`** (không đụng Task_Master 24 cột). Native column để Phase 2.
2. ✅ **CHỐT (2026-08-11)**: **Pilot gọn trước** — build **B1–B3 + B5 + B7** (backend + tracker + dashboard + nạp Quang/Dung), review với 2 member, rồi mới B4/B6/B8/B9.
3. **RBAC chi tiết**: member chỉ thấy KPI của mình ở tracker (đề xuất) hay thấy cả team read-only? Team objective/weight ai chốt (Teamlead-only đề xuất)?
4. **Nạp pilot**: seed script (nhanh) hay nhập tay qua UI (kiểm chứng UX)? → *Khuyến nghị seed + 1 bản nhập tay để test.*
5. **Config trọng số**: có áp gợi ý phân bổ pillar mặc định ở `H2_Config` không, hay để trống 100%/member tự do (đã chốt tự do — chỉ xác nhận có cần cảnh báo mềm khi lệch nhiều)?

➡️ Sau khi chốt mục 1–5, bắt đầu **B0 + B1**.
