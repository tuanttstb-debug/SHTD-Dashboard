# 04 — MIGRATION MAPPING: KPI cũ → Framework chuẩn hoá
### Pilot: QuangNN3 & DungLQ1

**Ngày**: 2026-08-11 · Nguồn: `Mẫu tham khảo/KPI_H2_2026_QuangNN3 + DungLQ1.xlsx` · Chuẩn: `docs/01_FRAMEWORK` + `docs/02_KPI_DESIGN_GUIDE`

> **Nguyên tắc**: KHÔNG tự ý đổi ý nghĩa KPI của member. Giữ nguyên nội dung & mốc gốc; chỉ **chuẩn hoá cấu trúc** và **flag** những chỗ chưa đạt chuẩn (thiếu baseline/target/weight/priority/pillar; task giả dạng KPI). Các con số target còn thiếu là **của member bổ sung** trước khi trình sếp.

---

## PHẦN 1 — MAPPING QUANGNN3

Bản gốc: 3 "Chỉ tiêu", chỉ CT3 có trọng số (0.2/0.4/0.25/0.15). Chuẩn hoá thành **3 Objective**, weight tổng = 100%.

| Member | KPI cũ (rút gọn) | KPI chuẩn hoá | Gap phát hiện | Recommendation |
|---|---|---|---|---|
| Quang | CT1: Xây & ban hành quy trình quản lý công việc 5 bước; áp dụng 100% đầu việc; mở rộng theo dõi BLOL | **Obj1 (P2-CAP, cat D, P2)**: Nâng năng lực & chuẩn hoá quản lý công việc. **KPI**: (a) Ban hành quy trình + áp dụng thử ≥1 việc thực tế (Q3); (b) **100% đầu việc quan trọng** được theo dõi theo quy trình mới (Q4); (c) BLOL có báo cáo định kỳ đủ **5 nội dung** (dùng/vận hành/dữ liệu/lỗi/cải tiến) | Trọng số trống ("-"); phần lớn là **Action/Milestone**, không có outcome đo; mốc "Quý 3/4" thô | Gán weight; tách rõ KPI (100% coverage — đo được) vs Action (viết quy trình); quy mốc quý → milestone tháng; đây là **pillar Capability** đúng trọng tâm BLĐ (kỹ năng quản lý việc còn yếu) |
| Quang | CT2: Số hóa BLOL — gộp hệ thống dùng chung; hoàn thiện 2 nghiệp vụ (giải toả tạm ứng, quản lý hồ sơ sau phát hành); nghiên cứu AI đọc thư BL; tổng kết + đề xuất 2027 | **Obj2 (P1-BIZ, cat A/B, P1)**: Hoàn thiện & mở rộng số hóa BLOL. **KPI**: (a) Phương án hệ thống dùng chung **được duyệt** (T8–9); (b) **2 nghiệp vụ go-live** + UAT pass ≥[target] (T8–11); (c) Đề xuất giải pháp AT đọc/kiểm thư BL (T10–12); (d) Đề xuất kế hoạch 2027 trình BLĐ (T12) | Kết quả nhị phân ("hoàn thành/đưa vào sử dụng"); thiếu target chất lượng (UAT pass %, TAT); thiếu weight | Thêm target đo được (UAT pass %, TAT xử lý BL ↓, số lỗi) + baseline T8; đây là **P1 must-win** (cam kết BLĐ) |
| Quang | CT3: Học & ứng dụng AI — học Colab/Python + công cụ AI; ≥2 công cụ vào dùng; **giảm ≥30% thời gian**; 2 buổi chia sẻ + 1 tài liệu + 1 công cụ nhân rộng | **Obj3 (P3-AI, cat C, P1)**: AI hóa công việc tạo năng suất. **KPI**: (a) Hoàn thành 2 khoá đúng hạn 11/10 *(Action/điều kiện)*; (b) **≥2 công cụ** vào dùng thực tế; (c) **↓ ≥30% thời gian xử lý** (đo trước/sau); (d) 2 buổi chia sẻ + 1 tài liệu + **1 công cụ nhân rộng** | KPI tốt nhất trong file (đã có target đo + trọng số nội bộ 0.2/0.4/0.25/0.15); nhưng "học công cụ" là Action, không phải KPI | Giữ nguyên target; đánh dấu "học" = Action/điều kiện; outcome KPI = **↓30% thời gian** + công cụ nhân rộng (đúng quy tắc AI→business value) |

**Weight đề xuất Quang (tổng 100%, Teamlead duyệt):** Obj2 BLOL **45%** (P1) · Obj3 AI **30%** (P1) · Obj1 Capability **25%** (P2).
**Cảnh báo:** Quang chỉ có 2 P1 — hợp lệ. Baseline TAT/thời gian BLOL: **cần đo T8**.

---

## PHẦN 2 — MAPPING DUNGLQ1

Bản gốc: 2 "Chỉ tiêu" với sub-project lồng; **không có cột trọng số**. Chuẩn hoá thành **5 Objective**, weight tổng = 100%.

| Member | KPI cũ (rút gọn) | KPI chuẩn hoá | Gap phát hiện | Recommendation |
|---|---|---|---|---|
| Dung | CT1.1: GNOL E2E — UAT+Go-live GĐ2; BRD GĐ3; khả thi GĐ4 | **Obj1 (P1-BIZ, cat B, P1)**: Giao GNOL E2E đúng lộ trình. **KPI**: (a) UAT GĐ2 pass ≥[target] + **Go-live T9–10**; (b) BRD+phân tích GĐ3 **được duyệt** (T10–12); (c) Báo cáo khả thi GĐ4 có phương án (T11–12) | Thiếu target chất lượng UAT; mốc theo tháng ổn nhưng thiếu weight/priority | Thêm UAT pass %, đúng phạm vi; **P1 must-win** |
| Dung | CT1.2: GNOL tự động — 3 nội dung (AI check hóa đơn, trustlist, hạn mức); đẩy adoption với SME MASS | **Obj2 (P1-BIZ, cat A, P1)**: Nâng cấp & tăng adoption GNOL tự động. **KPI**: (a) **3 nội dung go-live** (T8–10); (b) **Số KH dùng ↑ từ [baseline] → [target]** (T11–12) | "Tăng số KH" **không có số** (member đã tự ghi chú thiếu số liệu); (1) AI check hóa đơn liên quan pillar AI | Bổ sung baseline+target KH (đo T8); nội dung AI check hóa đơn có thể tính đóng góp P3-AI; **P1 must-win** |
| Dung | CT1.3: Quy hoạch BLOL/GNOL trên BIZ/BPM; SLA report GNOL; đề xuất 2027 | **Obj3 (P1-BIZ, cat B, P2)**: Quy hoạch tín dụng thống nhất trên BIZ/BPM + SLA. **KPI**: (a) Phương án quy hoạch **được duyệt** (T8–9); (b) **Hệ thống SLA go-live** (T10–11); (c) Đề xuất 2027 trình BLĐ (T12) | Kết quả nhị phân; phụ thuộc DCB (nâng cấp song song) | Khai báo **dependency DCB**; thêm chỉ tiêu chất lượng SLA (coverage %) |
| Dung | CT2.1: Ứng dụng AI — ≥1 dashboard theo dõi; ≥1 công cụ AI tổng hợp/phân tích | **Obj4 (P3-AI, cat C, P2)**: AI hóa báo cáo & phân tích. **KPI**: (a) **≥1 dashboard** vào dùng (T8–9); (b) **≥1 công cụ AI** vào dùng (T10–11); (c) *(khuyến nghị bổ sung)* ↓ % thời gian tổng hợp báo cáo | Có target tối thiểu nhưng **thiếu outcome business value** (chỉ "có công cụ") | Thêm KPI năng suất (↓ thời gian / tăng chất lượng quyết định) theo quy tắc AI→value |
| Dung | CT2.2: PMI-CPA cert; + mục tiêu cá nhân (chạy 400km, đọc 14 sách); CT1.4: CR FlowX, Sale Agent survey, SCF | **Obj5 (P2-CAP + P3-BAU, P2/P3)**: Năng lực & vận hành hỗ trợ. **KPI**: (a) **Đạt chứng chỉ PMI-CPA** (T8–11) *(P2-CAP)*; (b) BAU: CR FlowX đúng hạn, Sale Agent có quyết định rõ, SCF sẵn sàng khi có IT *(P3, tracked as Action)* | Trộn **mục tiêu cá nhân** (chạy/đọc) vào KPI công việc; BAU không có weight/priority; SCF **phụ thuộc IT không mốc** | **Tách mục tiêu cá nhân** (chạy 400km, đọc 14 sách) ra khỏi KPI chấm điểm — theo dõi cá nhân riêng; SCF khai **dependency IT** rõ; BAU gộp P3 |

**Weight đề xuất Dung (tổng 100%, Teamlead duyệt):** Obj1 GNOL E2E **25%** (P1) · Obj2 GNOL tự động **25%** (P1) · Obj3 Quy hoạch+SLA **15%** (P2) · Obj4 AI **20%** (P2) · Obj5 Capability+BAU **15%** (P2/P3).
**Cảnh báo:** 2 P1 — hợp lệ. 5 Objective = đúng trần. Baseline adoption GNOL: **cần đo T8**.

---

## PHẦN 3 — TỔNG HỢP GAP TOÀN PILOT

| Gap | Quang | Dung | Xử lý trong framework |
|---|---|---|---|
| Task giả dạng KPI | CT1, phần CT2 | CT1.x nhiều mục | Tách KPI (outcome) vs Milestone/Action; Action → Task_Master |
| Thiếu baseline | TAT/thời gian BLOL | Adoption GNOL, thời gian báo cáo | Đánh dấu "đo baseline T8" |
| Target thiếu số | Một số mục CT1/CT2 | "tăng số KH" (tự nhận) | Member bổ sung số trước khi trình sếp |
| Trọng số thiếu/không nhất quán | CT1,CT2 trống | Không có cột | Gán weight tổng 100%/member |
| Thiếu priority | Toàn bộ | Toàn bộ | Gán P1/P2/P3 (≤3 P1) |
| Thiếu pillar chuẩn | Ngầm | Ngầm | Map 3 pillar P1-BIZ/P2-CAP/P3-AI |
| Risk/Dependency prose | — | SCF↔IT, DCB | Khai báo có cấu trúc |
| Mục tiêu cá nhân lẫn KPI | — | chạy/đọc | Tách khỏi KPI chấm điểm |
| Mốc thời gian thô | Quý 3/4 | vài mục | Quy về milestone tháng T8–T12 |

➡️ 2 bản KPI chuẩn hoá đầy đủ: `data/SAMPLE_QuangNN3_H2.md`, `data/SAMPLE_DungLQ1_H2.md`.
