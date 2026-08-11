# 02 — KPI DESIGN GUIDE
### Hướng dẫn viết KPI đạt chuẩn + Bộ checklist Teamlead challenge

**Phiên bản**: 1.0 · **Ngày**: 2026-08-11 · Đi kèm `01_H2_MANAGEMENT_FRAMEWORK.md`

> Mục tiêu: giúp member viết KPI **outcome, đo được, trackable**; giúp Teamlead **challenge** nhanh và nhất quán. Đây là tài liệu chống lại lỗi phổ biến nhất: **viết Task rồi gọi là KPI**.

---

## 1. NGUYÊN TẮC VÀNG

1. **KPI đo kết quả, không mô tả việc.** Nếu bỏ được chữ "Hoàn thành/Xây dựng/Triển khai" ở đầu mà vẫn còn 1 con số → đúng là KPI.
2. **Mọi KPI có target là số + đơn vị + (baseline).** "Tăng adoption" ❌ → "Số KH dùng GNOL tự động ↑ từ 120 → 300 (+150%)" ✅.
3. **Milestone là mốc, Action là việc.** Chúng nằm **dưới** KPI, không thay KPI.
4. **AI KPI phải chạm business value.** "Học Python" là Action; KPI là "Giảm ≥30% thời gian làm báo cáo tiến độ nhờ công cụ tự động".
5. **3–5 Objective/member. Tối đa 2–3 P1.** Ít mà chất.

---

## 2. CÔNG THỨC VIẾT KPI

```
[Động từ đo lường] [đối tượng] từ [baseline] → [target] [đơn vị], hạn [deadline]
```

| Thành phần | Xấu | Tốt |
|---|---|---|
| Động từ | "Xây dựng", "Triển khai" (việc) | "Giảm", "Tăng", "Đạt", "Duy trì" (đo) |
| Đối tượng | "quy trình", "hệ thống" | "TAT xử lý BL", "số KH dùng SP", "% đầu việc theo dõi" |
| Baseline | (không có) | "từ 8 ngày" / "từ 120 KH" / "cần đo T8" |
| Target | "cải thiện" | "≤5 ngày" / "≥300 KH" / "100%" |
| Deadline | "Quý 4" | "31/10/2026" |

**Ví dụ chuyển hoá Task → KPI:**

| Task (bản gốc member) | KPI chuẩn hoá |
|---|---|
| "Hoàn thiện 2 nghiệp vụ BLOL" | **KPI**: 2 nghiệp vụ (giải toả tạm ứng, quản lý hồ sơ sau phát hành) **go-live T11** + đạt UAT ≥95% pass · *(2 nghiệp vụ = Milestone/Action bên dưới)* |
| "Học Colab/Python và công cụ AI" | **KPI**: Hoàn thành 2 khoá đúng hạn (11/10) → tạo ≥2 công cụ vào dùng thực tế · **Outcome KPI**: ↓ ≥30% thời gian xử lý báo cáo |
| "Áp dụng quy trình quản lý công việc" | **KPI**: 100% đầu việc quan trọng được theo dõi theo quy trình mới (đo: số đầu việc trong hệ thống / tổng đầu việc) |
| "Đẩy adoption GNOL tự động" | **KPI**: Số KH dùng GNOL tự động ↑ từ [baseline T8] → [target] trong T11–T12 |

---

## 3. BAT-KO (BAD → GOOD) BẢNG THAM CHIẾU NHANH

| Dấu hiệu KPI xấu | Vì sao | Sửa thế nào |
|---|---|---|
| Bắt đầu bằng "Xây dựng/Ban hành/Triển khai" | Là Action | Hỏi "để đạt outcome nào?" → viết outcome đó |
| Kết quả = "Hoàn thành/đưa vào sử dụng" | Nhị phân, không đo mức độ | Thêm chất lượng/định lượng: %, số, thời gian, UAT pass rate |
| "Tăng/Giảm/Cải thiện" không số | Không đo được | Thêm baseline → target + đơn vị |
| Không deadline cụ thể ("Quý 4") | Không track tháng | Quy về due_date + milestone tháng |
| Trọng số trống hoặc tổng ≠ 100% | Không chấm điểm được | Phân bổ đủ 100%/member |
| Không priority | Không biết việc must-win | Gán P1/P2/P3 |
| "Dùng AI" là mục tiêu | Vi phạm quy tắc AI | Nối tới productivity/business value đo được |

---

## 4. QUY TRÌNH TỪ OBJECTIVE → EVIDENCE (mẫu điền)

```
Objective:  [Outcome lớn] — Pillar [P1-BIZ/P2-CAP/P3-AI], Priority [P1/P2/P3], Weight [%]
  WHY:      [Bám Team Objective nào / giá trị gì]
  KPI 1:    [metric] · baseline [x] · target [y] · unit [..] · category [A/B/C/D] · weight [%]
    Milestone T8: [..] (due, RAG)
    Milestone T9: [..] 
    ...
    Action:   [task] → Owner, due (nằm ở Task_Master, link KPI)
  Risk:     [risk] · impact [C/T/T] · prob [C/T/T] · mitigation [..] · owner
  Dependency:[bên] · cần gì · ngày cần · trạng thái
  Evidence: [link/mô tả khi đóng]
```

---

## 5. CHECKLIST TEAMLEAD CHALLENGE (dùng khi duyệt & khi review)

Duyệt 1 Objective chỉ khi **tất cả** ✅ (hoặc có lý do ghi rõ):

**Cấu trúc**
- [ ] Thuộc đúng 1 pillar (P1-BIZ / P2-CAP / P3-AI)
- [ ] Có Priority (P1/P2/P3); member không quá 2–3 P1
- [ ] Có Weight; tổng weight toàn member = 100%
- [ ] Nằm trong giới hạn 3–5 Objective/member

**Chất lượng KPI**
- [ ] KPI đo **outcome**, không phải mô tả việc
- [ ] Có **target = số + đơn vị**
- [ ] Có **baseline** (hoặc kế hoạch đo baseline T8 nếu chưa có)
- [ ] Phân biệt rõ KPI / Milestone / Action
- [ ] KPI AI chạm tới productivity/business value

**Kế hoạch & kiểm soát**
- [ ] Có Milestone theo tháng T8–T12 (due_date)
- [ ] Có Action (Task_Master) gắn về KPI, có owner + hạn
- [ ] Risk & Dependency được khai báo (nếu có), có mitigation/owner
- [ ] Có kế hoạch Evidence khi đóng

**Nguồn lực**
- [ ] Không gây overload (đối chiếu Capacity view)
- [ ] Dependency không dồn hết vào 1 người; có backup nếu là single point

---

## 6. CỜ CẢNH BÁO TỰ ĐỘNG (dùng cho Track B — validation)

Hệ thống nên tự flag khi:
- KPI thiếu `target` / `unit` / `weight` / `owner` / `priority` / `pillar`.
- Tổng weight/member ≠ 100%.
- Member có >3 P1, hoặc >5 Objective.
- KPI có "target" là text nhị phân (Hoàn thành/Xong) mà không có số.
- Trùng lặp KPI giữa các member (duplicate).
- Milestone quá hạn mà RAG chưa cập nhật.
- Dependency tập trung 1 owner vượt ngưỡng.

---

## 7. THANG ACHIEVEMENT (chuẩn hoá % đạt để chấm điểm)

| Loại KPI | Cách tính achievement% |
|---|---|
| Định lượng ↑ (adoption, KH) | min(100, actual / target × 100) |
| Định lượng ↓ (TAT, effort, thời gian) | min(100, (baseline − actual) / (baseline − target) × 100) |
| Nhị phân (go-live, chứng chỉ) | 100% nếu đạt, theo mốc từng phần nếu chưa (VD 2/2 nghiệp vụ = 100%, 1/2 = 50%) |
| Milestone-based | Σ milestone hoàn thành có trọng số |

Điểm Objective = Σ(weight_kpi × achievement_kpi). Điểm member = Σ điểm Objective (đã là 100% weight).
