# KẾ HOẠCH H2/2026 CHUẨN HOÁ — DungLQ1 (PILOT)
**Chuẩn**: `docs/01_FRAMEWORK` + `03_MEMBER_TEMPLATE` · Nguồn: KPI gốc DungLQ1 · Ngày: 2026-08-11
> ⚠️ `[cần đo T8]` / `[target?]` = member bổ sung số trước khi trình sếp. Mục tiêu cá nhân (chạy/đọc) tách khỏi KPI chấm điểm (theo dõi riêng).

## Header
| Member | Role | Scope | Manager | Capability level |
|---|---|---|---|---|
| DungLQ1 | Product Owner / PM | GNOL (E2E, tự động), BLOL/GNOL trên BIZ/BPM, SCF, Sale Agent, AI | Teamlead | 4/5 |

**Tổng quan weight (100%)**: Obj1 GNOL E2E 25% (P1) · Obj2 GNOL tự động 25% (P1) · Obj3 Quy hoạch+SLA 15% (P2) · Obj4 AI 20% (P2) · Obj5 Capability+BAU 15% (P2/P3)

---

## OBJECTIVE 1 — Giao GNOL E2E đúng lộ trình  ⭐P1 MUST-WIN
**Pillar** P1-BIZ · **Priority** P1 · **Weight** 25% · **Category** B (Delivery)
**WHY**: GNOL E2E là dự án lõi số hóa tín dụng; go-live GĐ2 & chuẩn bị GĐ3/4 quyết định tiến độ roadmap.

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K1.1 UAT GĐ2 pass + Go-live đúng phạm vi | — | UAT ≥95% pass, **Go-live T9–10** | % / mốc | 12% |
| K1.2 BRD + tài liệu phân tích GĐ3 được duyệt | — | Duyệt | mốc | 8% |
| K1.3 Báo cáo khả thi GĐ4 có phương án đề xuất | — | Hoàn thành + đề xuất | mốc | 5% |

**Milestones**: T9–10 UAT+Go-live GĐ2 (due 31/10) · T10–12 BRD GĐ3 duyệt (31/12) · T11–12 khả thi GĐ4 (31/12).
**Actions (→ Task_Master)**: chạy UAT GĐ2; xử lý defect; go-live; viết BRD GĐ3; nghiên cứu GĐ4.
**Risk**: defect UAT kéo dài → trễ go-live · mitigation: UAT sớm, ưu tiên defect P1. **Dependency**: IT delivery GĐ2. **Evidence**: UAT report, biên bản go-live, BRD duyệt.

---

## OBJECTIVE 2 — Nâng cấp & tăng adoption GNOL tự động  ⭐P1 MUST-WIN
**Pillar** P1-BIZ · **Priority** P1 · **Weight** 25% · **Category** A (Business Outcome)
**WHY**: Giảm rủi ro thao túng KH (chỉ đạo TGĐ) + mở rộng số KH dùng sản phẩm = giá trị kinh doanh trực tiếp.

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K2.1 3 nội dung go-live: (1) AI kiểm hóa đơn/nội dung CT, (2) trustlist KH/đối tác mới, (3) điều chỉnh hạn mức + loại hình | — | **3/3 go-live** | nội dung | 13% |
| K2.2 Số KH dùng GNOL tự động tăng | **[cần đo T8]** | **↑ [target?]** (đề xuất +[x]%) | KH | 12% |

**Milestones**: T8–10 hoàn thiện 3 nội dung → go-live (due 31/10) · T11–12 phối hợp SME MASS đẩy adoption (31/12).
**Actions (→ Task_Master)**: BRD 3 nội dung; tích hợp AI hóa đơn; xây trustlist; điều chỉnh hạn mức; chiến dịch adoption với SME MASS; đo số KH.
**Risk**: adoption thấp nếu thiếu phối hợp SME MASS · mitigation: chốt kế hoạch chung sớm. **Dependency**: dự án SME MASS; IT. **Evidence**: biên bản go-live, dashboard số KH trước/sau.
> Ghi chú: nội dung (1) AI kiểm hóa đơn đóng góp cả pillar **P3-AI** — tính điểm chính ở đây (business), ghi nhận AI ở review.

---

## OBJECTIVE 3 — Quy hoạch tín dụng thống nhất trên BIZ/BPM + SLA
**Pillar** P1-BIZ · **Priority** P2 · **Weight** 15% · **Category** B (Delivery)
**WHY**: Gộp giải ngân/bảo lãnh về một hệ thống dùng chung hành trình/dữ liệu/hồ sơ + đo SLA = nền tảng mở rộng bền vững.

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K3.1 Phương án quy hoạch dùng chung được duyệt (đồng bộ nâng cấp DCB) | — | Duyệt | mốc | 6% |
| K3.2 Hệ thống báo cáo SLA (GNOL GĐ2) go-live; đánh giá cho BLOL GĐ5 | — | **SLA go-live** | mốc | 6% |
| K3.3 Đề xuất kế hoạch ưu tiên 2027 trình BLĐ | — | Trình + duyệt | mốc | 3% |

**Milestones**: T8–9 phương án duyệt · T10–11 SLA go-live · T12 đề xuất 2027.
**Actions (→ Task_Master)**: phối hợp dự án BLOL quy hoạch; triển khai SLA report; rà GĐ5 BLOL; viết đề xuất 2027.
**Risk**: phụ thuộc nâng cấp DCB → trễ · mitigation: bám lịch DCB. **Dependency**: **Dự án DCB** (nâng cấp song song) — cần mốc T8–9; dự án BLOL. **Evidence**: phương án duyệt, SLA report live, tờ trình 2027.

---

## OBJECTIVE 4 — AI hoá báo cáo & phân tích
**Pillar** P3-AI · **Priority** P2 · **Weight** 20% · **Category** C (AI/Improvement)
**WHY**: Dùng AI xây dashboard theo dõi số liệu + công cụ tổng hợp/phân tích → quyết định nhanh & chính xác hơn (business value).

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K4.1 Dashboard/bảng theo dõi số liệu vào dùng thực tế | 0 | **≥1** | công cụ | 8% |
| K4.2 Công cụ AI hỗ trợ tổng hợp/phân tích dữ liệu vào dùng | 0 | **≥1** | công cụ | 8% |
| K4.3 *(khuyến nghị bổ sung)* Giảm thời gian tổng hợp báo cáo chuyển đổi | **[cần đo T8]** | ↓ [target?]% | % | 4% |

**Milestones**: T8–9 ≥1 dashboard live · T10–11 ≥1 công cụ AI live · T11–12 đo hiệu quả năng suất.
**Actions (→ Task_Master)**: xây dashboard chuyển đổi; build công cụ AI phân tích chất lượng sản phẩm; đo benchmark thời gian.
**Risk**: công cụ không adoption · mitigation: gắn vào báo cáo định kỳ thật. **Dependency**: nguồn dữ liệu GNOL/BLOL. **Evidence**: link dashboard/công cụ, bảng đo thời gian.

---

## OBJECTIVE 5 — Năng lực & vận hành hỗ trợ
**Pillar** P2-CAP (+ P3-BAU) · **Priority** P2/P3 · **Weight** 15% · **Category** D + B
**WHY**: Nâng năng lực quản trị dự án (PMI-CPA) + duy trì các CR/dự án hỗ trợ đúng hạn để không gián đoạn Trung tâm.

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K5.1 Đạt chứng chỉ **PMI-CPA** *(P2-CAP)* | chưa có | **Đạt** | cert | 8% |
| K5.2 BAU — CR & luồng nghiệp vụ FlowX đúng hạn *(P3)* | — | 100% đúng hạn cam kết | % | 3% |
| K5.3 BAU — Sale Agent: báo cáo tổng hợp khảo sát + **quyết định rõ** (tiếp tục/điều chỉnh) *(P3)* | — | Quyết định được duyệt | mốc | 2% |
| K5.4 BAU — SCF sẵn sàng phương án khi có nguồn lực IT *(P3)* | — | Sẵn sàng | mốc | 2% |

**Milestones**: T8–11 học+thi PMI-CPA · T8–9 CR FlowX + quyết định Sale Agent · SCF theo điều kiện IT.
**Actions (→ Task_Master)**: khoá PMI-CPA; xử lý CR FlowX; tổng hợp khảo sát Sale Agent; chuẩn bị phương án SCF.
**Risk**: SCF vô thời hạn do IT · mitigation: chuẩn bị sẵn, escalate khi IT có nguồn lực. **Dependency**: **Nguồn lực IT (SCF — chưa có mốc)** → khai báo & theo dõi. **Evidence**: chứng chỉ, CR log, báo cáo Sale Agent, phương án SCF.

> **TÁCH RIÊNG — Mục tiêu cá nhân (KHÔNG tính điểm KPI công việc)**: chạy 400km; đọc 14 sách (T8–T12). Theo dõi cá nhân, ghi nhận tinh thần phát triển bản thân, không đưa vào weight chấm điểm.

---

## TỰ TỔNG KẾT H1/T7 (điền trước khi trình)
| # | Mục | Trả lời |
|---|---|---|
| 1 | Cam kết H1 | *(member điền)* |
| 2 | Kết quả thực tế | |
| 3 | % hoàn thành | |
| 4 | Business impact | |
| 5 | Gap | |
| 6 | Root cause | |
| 7 | Lesson learned | |
| 8 | H2 adjustment | |

## Management Capability (Teamlead đánh giá đầu kỳ, thang 1–5)
Goal Setting _ · Planning _ · Prioritization _ · Ownership _ · Risk _ · Dependency _ · Tracking _ · Execution _
