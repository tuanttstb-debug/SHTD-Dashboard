# KẾ HOẠCH H2/2026 CHUẨN HOÁ — QuangNN3 (PILOT)
**Chuẩn**: `docs/01_FRAMEWORK` + `03_MEMBER_TEMPLATE` · Nguồn: KPI gốc QuangNN3 · Ngày: 2026-08-11
> ⚠️ Các ô `[cần đo T8]` / `[target?]` = member bổ sung số trước khi trình sếp. Nội dung & mốc giữ nguyên bản gốc.

## Header
| Member | Role | Scope | Manager | Capability level |
|---|---|---|---|---|
| QuangNN3 | Product Owner / BA | BLOL, Quản lý công việc, AI | Teamlead | 3/5 |

**Tổng quan weight (100%)**: Obj2 BLOL 45% (P1) · Obj3 AI 30% (P1) · Obj1 Capability 25% (P2)

---

## OBJECTIVE 1 — Chuẩn hoá & nâng năng lực quản lý công việc
**Pillar** P2-CAP · **Priority** P2 · **Weight** 25% · **Category** D (Capability)
**WHY**: BLĐ nhận định kỹ năng setup mục tiêu/lập kế hoạch/tracking còn yếu → chuẩn hoá cách quản lý việc là nền tảng nâng năng lực cả team & bảo đảm bao quát BLOL sau go-live.

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K1.1 Quy trình 5 bước ban hành + áp dụng thử ≥1 việc thực tế | chưa có | Ban hành + 1 pilot | mốc | 8% |
| K1.2 Tỷ lệ đầu việc quan trọng theo dõi theo quy trình mới | 0% | **100%** | % | 10% |
| K1.3 BLOL có báo cáo định kỳ đủ 5 nội dung (dùng/vận hành/dữ liệu/lỗi/cải tiến) | 0/5 | **5/5** nội dung, định kỳ | nội dung | 7% |

**Milestones**
| Tháng | Milestone | Due | RAG |
|---|---|---|---|
| T8–9 | Soạn & lấy ý kiến quy trình 5 bước | 30/09 | — |
| Q3 (T9) | Ban hành chính thức + pilot 1 việc | 30/09 | — |
| Q4 (T10–12) | 100% đầu việc quan trọng vào quy trình | 31/12 | — |
| Q4 (T10→) | Báo cáo theo dõi BLOL định kỳ đủ 5 nội dung | 31/12 | — |

**Actions (→ Task_Master)**: Viết dự thảo quy trình; họp thống nhất; áp dụng danh mục công việc; thiết lập báo cáo BLOL.
**Risk**: Quy trình không được tuân thủ → mitigation: Teamlead review hàng tháng. **Dependency**: — **Evidence**: quy trình ban hành, ảnh hệ thống theo dõi, báo cáo BLOL định kỳ.

---

## OBJECTIVE 2 — Hoàn thiện & mở rộng số hoá BLOL  ⭐P1 MUST-WIN
**Pillar** P1-BIZ · **Priority** P1 · **Weight** 45% · **Category** A/B (Business + Delivery)
**WHY**: BLOL là sản phẩm trọng tâm; hoàn thiện nghiệp vụ còn thiếu + gộp hệ thống dùng chung tạo giá trị vận hành và giảm rủi ro.

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K2.1 Phương án hệ thống tín dụng dùng chung được duyệt | — | Duyệt | mốc | 8% |
| K2.2 2 nghiệp vụ (giải toả tạm ứng, quản lý hồ sơ sau phát hành) go-live + UAT pass | — | **2/2 go-live**, UAT ≥95% | nghiệp vụ / % | 20% |
| K2.3 Đề xuất giải pháp AI đọc/kiểm thư bảo lãnh + cảnh báo giải toả bất hợp lý | — | Đề xuất được duyệt | mốc | 9% |
| K2.4 Đề xuất kế hoạch mở rộng 2027 trình BLĐ | — | Trình + duyệt | mốc | 8% |
| *(khuyến nghị)* K2.5 TAT xử lý bảo lãnh sau go-live | **[cần đo T8]** | ↓ [target?]% | ngày | *(gộp K2.2)* |

**Milestones**
| Tháng | Milestone | Due | RAG |
|---|---|---|---|
| T8–9 | Thiết kế hệ thống dùng chung được duyệt (đồng bộ nâng cấp DCB) | 30/09 | — |
| T8–11 | 2 nghiệp vụ hoàn thiện → UAT → go-live | 30/11 | — |
| T10–12 | Nghiên cứu AI thư BL → đề xuất giải pháp | 31/12 | — |
| T12 | Đề xuất kế hoạch 2027 | 31/12 | — |

**Actions (→ Task_Master)**: BRD giải toả tạm ứng; BRD quản lý hồ sơ sau phát hành; phối hợp thiết kế hệ thống chung; nghiên cứu OCR/AI thư BL.
**Risk**: Phụ thuộc tiến độ DCB → chậm gộp hệ thống · mitigation: bám lịch DCB, phương án dự phòng độc lập. **Dependency**: Dự án DCB (nâng cấp song song) — cần mốc T8–9. **Evidence**: biên bản duyệt, biên bản go-live, UAT report, tờ trình 2027.

---

## OBJECTIVE 3 — AI hoá công việc tạo năng suất  ⭐P1 MUST-WIN
**Pillar** P3-AI · **Priority** P1 · **Weight** 30% · **Category** C (AI/Improvement)
**WHY**: AI Transformation là trọng tâm Trung tâm; Quang tiên phong tạo công cụ + nhân rộng cho team/Trung tâm. Chuỗi: **Use AI → công cụ → ↓ thời gian → nhân rộng**.

| KPI | Baseline | Target | Unit | Weight |
|---|---|---|---|---|
| K3.1 *(điều kiện/Action)* Hoàn thành 2 khoá (Colab/Python; công cụ AI) đúng hạn 11/10 | — | 2/2 đúng hạn | khoá | 6% |
| K3.2 Số công cụ/sản phẩm AI vào dùng thực tế | 0 | **≥2** | công cụ | 12% |
| K3.3 Giảm thời gian xử lý công việc sau khi áp dụng công cụ | **[cần đo T8]** | **↓ ≥30%** | % | 7% |
| K3.4 Chia sẻ & nhân rộng: buổi chia sẻ + tài liệu + công cụ nhân rộng | 0 | **2 buổi + 1 tài liệu + 1 công cụ nhân rộng** | — | 5% |

**Milestones**
| Tháng | Milestone | Due | RAG |
|---|---|---|---|
| 03/08–20/09 | Học Colab/Python (xử lý dữ liệu/báo cáo) | 20/09 | — |
| 21/09–11/10 | Học công cụ AI tổng hợp/phân tích | 11/10 | — |
| Từ T10 | ≥2 công cụ (tự động tổng hợp báo cáo tiến độ; phân tích BLOL) vào dùng | 30/11 | — |
| Từ T10 | Đo thời gian trước/sau → xác nhận ↓≥30% | 31/12 | — |
| T11–12 | 2 buổi chia sẻ + 1 bộ tài liệu + 1 công cụ nhân rộng | 31/12 | — |

**Actions (→ Task_Master)**: Học tập; build công cụ tổng hợp báo cáo; build công cụ phân tích BLOL; đo benchmark thời gian; tổ chức chia sẻ.
**Risk**: Công cụ không được adoption → chỉ là demo · mitigation: gắn công cụ vào quy trình thật (Obj1). **Dependency**: dữ liệu BLOL (Obj2). **Evidence**: link công cụ, bảng đo thời gian trước/sau, tài liệu HD, biên bản chia sẻ.

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
