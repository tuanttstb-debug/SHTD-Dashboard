# 01 — H2/2026 TEAM MANAGEMENT FRAMEWORK
### Team Số hóa tín dụng — Trung tâm Sản phẩm và Giải pháp Tín dụng

**Phiên bản**: 1.0 · **Ngày**: 2026-08-11 · **Kỳ áp dụng**: H2/2026 (T7–T12) · **Trạng thái**: Pilot (QuangNN3, DungLQ1)

> Tài liệu này là **hiến pháp quản trị H2** của team: định nghĩa cách đặt mục tiêu, phân rã KPI, lập kế hoạch, tracking, cảnh báo, review và đánh giá cuối kỳ. Mọi member và Teamlead tuân theo cùng một chuẩn → **single source of truth**.

---

## 1. MỤC ĐÍCH & TRIẾT LÝ

BLĐ không chỉ yêu cầu "lập KPI". BLĐ muốn team nâng 4 năng lực: **đặt mục tiêu · lập kế hoạch · ưu tiên & bao quát · tracking & chủ động điều chỉnh**. Framework này biến 4 năng lực đó thành thói quen vận hành hàng tháng.

**Nguyên tắc thiết kế**: `STANDARDIZE → SIMPLIFY → TRACK → AUTOMATE → AI → SCALE`. Không over-engineering. Dễ dùng với member, Teamlead nhìn nhanh, BLĐ đọc trong 3 phút, dữ liệu có cấu trúc, mở rộng được.

**Câu hỏi hệ thống phải trả lời được cho mỗi người, mỗi lúc:**
> Tôi phải **đạt gì** · **làm gì** · **khi nào** · đang **ở đâu** · có **nguy cơ gì** · cần **hành động gì tiếp theo**.

---

## 2. BA TRỤ CỘT (PILLAR)

Mọi Objective phải thuộc **đúng 1 trong 3 trụ cột** của Trung tâm:

| Mã | Pillar | Ý nghĩa | Ví dụ |
|---|---|---|---|
| **P1-BIZ** | **Tài chính / Business Value** | Tạo giá trị kinh doanh đo được | ↑ giao dịch/adoption GNOL·BLOL, ↓ TAT, ↓ effort vận hành, ↑ hiệu quả sản phẩm |
| **P2-CAP** | **Phát triển bản thân / Capability** | Nâng năng lực bền vững | Product/PM, quản trị dự án, phân tích, công nghệ, leadership, backup/successor, chứng chỉ |
| **P3-AI** | **AI Transformation** | AI hoá công việc tạo năng suất → giá trị | Use case chuẩn hoá, automation, AI assistant, đo hiệu quả, nhân rộng |

**Quy tắc AI (P3-AI)** — KPI AI **không được** dừng ở "dùng AI". Bắt buộc chuỗi giá trị:
> **Use AI → tạo output → tạo productivity (đo được) → tạo business value.**

---

## 3. KIẾN TRÚC 5 TẦNG

```
Layer 1 — STRATEGY     Center Pillar → Team Objective → Strategic Priority
        ↓
Layer 2 — KPI          Team KPI → Member Objective → Member KPI (Weight, Target)
        ↓
Layer 3 — EXECUTION    Milestone → Monthly/Quarterly Plan → Action (Owner, Dependency)
        ↓
Layer 4 — CONTROL      Actual → Progress → RAG → Risk → Issue → Escalation
        ↓
Layer 5 — MANAGEMENT   Dashboard → Monthly/Quarterly Review → Executive Report → Performance Review
```

Mỗi tầng dưới **phân rã** tầng trên và **roll-up** ngược lên: Action hoàn thành → Milestone tiến → KPI cập nhật → Objective đạt → Team Objective đạt.

---

## 4. HỆ CẤP KHÁI NIỆM (phân biệt rõ — chống lỗi phổ biến)

| Khái niệm | Định nghĩa | Câu hỏi kiểm tra | Ví dụ ĐÚNG |
|---|---|---|---|
| **Objective** | Kết quả lớn cần đạt (outcome) | "Đạt được điều này thì thay đổi gì?" | *Số hoá hoàn chỉnh nghiệp vụ BLOL để giảm thời gian & rủi ro* |
| **KPI** | Cách **đo** kết quả (metric + target) | "Đo bằng con số nào?" | *TAT xử lý bảo lãnh ↓ ≥30% (từ X → Y ngày)* |
| **Milestone** | Mốc quan trọng trên đường đi | "Mốc nào chứng tỏ đang tiến?" | *T10: 2 nghiệp vụ giải toả tạm ứng + quản lý hồ sơ go-live* |
| **Action** | Việc cụ thể cần làm (= **Task_Master**) | "Ai làm gì, hạn nào?" | *Viết BRD giải toả tạm ứng — Quang — 30/09* |
| **Evidence** | Bằng chứng hoàn thành | "Chứng minh bằng gì?" | *Link biên bản go-live, dashboard TAT, tài liệu duyệt* |

> **KPI ≠ Task.** Nếu một dòng trả lời được "ai làm, hạn nào" nhưng **không có con số outcome** → đó là **Action/Milestone**, phải nằm dưới một KPI, không đứng ngang KPI.

---

## 5. CHUẨN MỘT OBJECTIVE (bắt buộc đủ 8 thành phần)

Mỗi member có **3–5 Objective** (không nhiều hơn). Mỗi Objective phải đủ chuỗi:

```
WHY → KPI → TARGET → MILESTONE → ACTION → RISK → DEPENDENCY → EVIDENCE
```

| # | Thành phần | Bắt buộc | Ghi chú |
|---|---|---|---|
| 1 | **WHY** | ✅ | Lý do chiến lược — bám Team Objective / pillar |
| 2 | **KPI** (1–3/objective) | ✅ | Metric đo outcome |
| 3 | **TARGET** (+ baseline, unit) | ✅ | Có số; nếu chưa có baseline → phải ghi "cần đo baseline T8" |
| 4 | **MILESTONE** (theo tháng/quý) | ✅ | Mốc T8→T12, có due_date + RAG |
| 5 | **ACTION** | ✅ | = Task trong Task_Master, link về KPI |
| 6 | **RISK** | ⚠️ nếu có | Risk + impact + probability + mitigation |
| 7 | **DEPENDENCY** | ⚠️ nếu có | Bên phụ thuộc + ngày cần + trạng thái |
| 8 | **EVIDENCE** | ✅ khi đóng | Link/mô tả bằng chứng |

---

## 6. PHÂN LOẠI KPI (KPI CATEGORY)

Chuẩn hoá 4 nhóm (đủ, không phức tạp hoá):

| Mã | Category | Đo gì | Gắn pillar chính |
|---|---|---|---|
| **A** | **Business / Product Outcome** | Giá trị sản phẩm/kinh doanh (adoption, TAT, doanh thu, KH) | P1-BIZ |
| **B** | **Delivery / Operational Excellence** | Giao hàng đúng hạn/chất lượng (go-live, UAT pass, SLA, CR) | P1-BIZ / P3-AI |
| **C** | **AI / Improvement** | Năng suất từ AI/automation/cải tiến (giảm effort/thời gian) | P3-AI |
| **D** | **Capability Development** | Năng lực cá nhân (chứng chỉ, kỹ năng, chia sẻ, backup) | P2-CAP |

---

## 7. PRIORITY (ƯU TIÊN)

| Mã | Nhãn | Ý nghĩa | Quy tắc |
|---|---|---|---|
| **P1** | **MUST WIN** | Bắt buộc đạt — cam kết BLĐ | **Tối đa 2–3 P1/member.** Dashboard hiển thị P1 riêng |
| **P2** | **IMPORTANT** | Quan trọng, đóng góp lớn | — |
| **P3** | **BAU / SUPPORT** | Duy trì vận hành, hỗ trợ | Không chiếm quá nhiều weight |

> Một member **không được có quá nhiều P1**. Teamlead challenge nếu >3.

---

## 8. TRỌNG SỐ & CHẤM ĐIỂM (WEIGHT & SCORING)

**Quy tắc chốt (Teamlead duyệt):**
- Mỗi member: tổng weight các Objective = **100%**, phân bổ **tự do theo pillar** (không ép tỷ lệ pillar cố định).
- Trong 1 Objective: nếu có nhiều KPI, tổng weight KPI = weight Objective.
- **Điểm KPI cuối kỳ** = Σ (weight_kpi × achievement_kpi%), với achievement chuẩn hoá về [0–100%] (cap 100% nếu không thưởng vượt; Teamlead quyết chính sách vượt).
- Khuyến nghị phân bổ tham khảo (không bắt buộc): ưu tiên P1-BIZ đủ trọng số để phản ánh cam kết BLĐ; P3-AI đủ lớn để tạo động lực chuyển đổi; P2-CAP giữ mức hợp lý.

**Ví dụ hợp lệ (member A):** Obj1 (P1-BIZ) 40% · Obj2 (P1-BIZ) 25% · Obj3 (P3-AI) 20% · Obj4 (P2-CAP) 15% = **100%**.

---

## 9. TRACKING HÀNG THÁNG & RAG

Nhịp tracking bắt buộc: **T8 → T9 → T10 → T11 → T12**. Mỗi KPI mỗi tháng nhìn được: **Target · Actual · Progress · RAG · Risk · Next Action · Support Needed**.

**RAG (không chỉ % completion — phản ánh nguy cơ):**

| RAG | Nghĩa | Tiêu chí (mặc định, cấu hình được ở CONFIG) |
|---|---|---|
| 🟢 **GREEN** | Đúng kế hoạch | Progress ≥ kế hoạch theo mốc; không risk nghiêm trọng |
| 🟠 **AMBER** | Nguy cơ trễ / cần can thiệp | Chậm nhẹ (5–20%) HOẶC có risk/dependency chưa xử lý HOẶC deadline ≤14 ngày mà progress thấp |
| 🔴 **RED** | Đã trễ / nguy cơ cao không đạt | Trễ >20%, quá hạn, hoặc blocker chưa gỡ |

> AMBER/RED **tự động** đẩy vào Risk view + Management Action của Teamlead (tái sử dụng Notification/Action Plan engine).

---

## 10. NĂNG LỰC QUẢN TRỊ (MANAGEMENT CAPABILITY) — 8 CHIỀU

Ngoài "KPI đạt hay không", Teamlead đánh giá **8 chiều năng lực** (không phải 8 KPI độc lập — là thang review):

| # | Chiều | Câu hỏi Teamlead | Nguồn dữ liệu |
|---|---|---|---|
| 1 | **Goal Setting** | Đặt mục tiêu đúng (outcome, đo được)? | Chất lượng Objective/KPI khi duyệt |
| 2 | **Planning** | Phân rã milestone/action hợp lý? | Độ đầy đủ milestone/action |
| 3 | **Prioritization** | Biết việc nào quan trọng nhất? | Phân bổ P1/P2/P3 + weight |
| 4 | **Ownership** | Chủ động chịu trách nhiệm? | Tần suất tự cập nhật, không đợi nhắc |
| 5 | **Risk Management** | Nhận diện & cảnh báo sớm? | Số risk khai báo trước khi thành RED |
| 6 | **Dependency Mgmt** | Chủ động quản lý bên phụ thuộc? | Dependency được theo dõi/escalate đúng lúc |
| 7 | **Tracking** | Cập nhật tiến độ đều? | Tỷ lệ tháng cập nhật đúng hạn |
| 8 | **Execution** | Đưa việc tới outcome cuối? | Achievement thực tế + evidence |

Thang điểm mỗi chiều: **1–5** (1 Yếu → 5 Xuất sắc). Dùng cho review quý/cuối kỳ, làm cơ sở đánh giá năng lực & thưởng.

---

## 11. QUẢN TRỊ NGUỒN LỰC (CAPACITY)

Góc nhìn bắt buộc: **Member × Project × KPI × Capacity** (không tính phức tạp). Phát hiện:
- Member **overload** (quá nhiều P1/KPI/action song song).
- **Project thiếu owner**.
- Một người gánh **quá nhiều P1**.
- **Dependency tập trung** vào 1 người (single point of failure).
- **Khoảng trống backup/successor**.

Chỉ số đơn giản gợi ý: đếm KPI/Action đang mở theo member; đếm P1/member; đếm project/member; cờ đỏ khi vượt ngưỡng CONFIG.

---

## 12. WORKFLOW TỔNG

```
H1/T7 Review → Team Objective → Member Objective → KPI Definition
   → Teamlead Challenge → Approval → Monthly Action Plan → Execution
   → Weekly Update → Monthly Review → RAG → Intervention
   → Quarterly Review (Q3/Q4) → Final Assessment
```

**Teamlead** (xem toàn bộ, filter member/project/P1, xem RED/AMBER, deadline 7/14/30 ngày, workload, dependency; ghi management action & support-cần-BLĐ; xuất Executive Report).
**Member** (xem KPI của mình, milestone; cập nhật progress/actual/risk/next-action; upload evidence; submit monthly review) — thao tác **<5 phút**.

---

## 13. LỊCH VẬN HÀNH (OPERATING CADENCE)

| Nhịp | Ai | Việc |
|---|---|---|
| **Hàng tuần** | Member | Cập nhật progress/actual/next-action các KPI đang chạy |
| **Cuối tháng (T8–T12)** | Member | Submit Monthly Review (target/actual/RAG/issue/support) |
| **Cuối tháng** | Teamlead | Review RAG toàn team, ghi Management Action, escalate BLĐ |
| **Cuối quý (Q3=T9, Q4=T12)** | Cả team | Quarterly Review (achievement, capability, adjust) |
| **Cuối H2 (T12)** | Teamlead | Final Assessment + Executive Report |

---

## 14. QUY TẮC CẤM & BẮT BUỘC

**Cấm**: biến Task thành KPI · KPI không target · KPI không đo được · quá nhiều KPI · dashboard chỉ để trình bày · hard-code dữ liệu · duplicate data · mỗi member tự định nghĩa cấu trúc riêng · over-engineering.

**Bắt buộc**: Single Source of Truth · Standardized · Measurable · Trackable · Auditable · Scalable.

---

## 15. LỘ TRÌNH TRIỂN KHAI (2 TRACK)

- **Track A — Nội dung (ưu tiên, hạn Thứ 7)**: tài liệu này + `02_KPI_DESIGN_GUIDE` + `03_MEMBER_TEMPLATE` + chuẩn hoá KPI Quang & Dung + Executive Report cho BLĐ. Không cần phần mềm.
- **Track B — Hệ thống (sau)**: sheets + GAS services + views + dashboard trong SPA production (menu "Quản trị H2", RBAC-gated), reuse Task_Master (action) / Initiative-pattern (objective) / Dev_Plan (capability) / Notifications (RAG). Xem `06_DASHBOARD_SPEC` + `07_DATA_MODEL`.

---

## 16. ĐỊNH NGHĨA HOÀN THÀNH (khung)

Objective/KPI đạt chuẩn khi: có pillar · có priority · có weight (tổng 100%/member) · KPI phân biệt rõ Outcome/Milestone/Action · có target đo được (+baseline) · có monthly plan T8–T12 · có risk & dependency (nếu có) · có evidence khi đóng · có RAG. Xem checklist đầy đủ trong `02_KPI_DESIGN_GUIDE §Checklist`.
