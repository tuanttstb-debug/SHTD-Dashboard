# 00 — DISCOVERY: H2/2026 Team Management & KPI System

**Ngày**: 2026-08-11 · **Người thực hiện**: AI (Solution Architect) · **Bối cảnh**: Yêu cầu BLĐ — mỗi team tự tổng kết H1/T7, xây Mục tiêu/KPI/Action Plan H2 (phân rã tháng/quý), báo cáo BLĐ **chậm nhất Thứ 7 tuần này**.

> Mục tiêu tài liệu: chốt hiện trạng (repo + dữ liệu KPI member), vấn đề, tài sản tái sử dụng, rủi ro — làm nền cho Implementation Proposal. **Chưa code ở giai đoạn này.**

---

## 1. CURRENT STATE — Ứng dụng đang chạy

**SHTD-Dashboard** = SPA vanilla JS (không framework), 1 `index.html` + `assets/js/views/*` + `assets/css/*`, backend **Google Apps Script (GAS) → Google Sheets**. Production live trên GitHub Pages. Version hiện tại **v6.36** (HEAD `d8779d9`).

### 1.1 Kiến trúc thực tế
```
Browser (SPA)
  index.html  →  sidebar nav + topbar + view-* sections + modals (task/case/init/dev/issue) + Quick View + Notification bell
  assets/js/
    config.js (GS_WEBAPP_URL, APP_VERSION)   constants.js (db, *_COLS, TEAM_LIST)
    api.js (atomic upsert/delete helpers, read-then-patch)   helpers.js (date ISO unify, RAG, weeks)
    i18n.js (VI/EN đầy đủ)   parsers.js   storage.js (localStorage cache)   auth.js (RBAC)
    ui/{toast,modal,theme,navigation}.js
    views/*.js (20 views)
        ↓ fetch POST (text/plain, CORS any-origin)
GAS Web App (Code.gs router → *Service.gs)
    Concurrency.gs (LockService + reassignIdIfExists)   AuditService.gs
        ↓ SpreadsheetApp
Google Sheets (personal account — S67 revert)  Sheet 1cpg1p_8…56Hk
    Tabs: Task_Master(24c) · Case_Pipeline(20c) · Issue_Tracker · Initiative_Master · Dev_Plan(12c)
          User_Master · Notifications · KPI_Summary · Audit_Log
```

### 1.2 Các module & pattern đã có (mỗi entity theo cùng khuôn mẫu)
Mỗi thực thể nghiệp vụ đều có **đủ bộ**: 1 Sheet tab + 1 `*Service.gs` + `db*` array & `*_COLS` (constants.js) + view file + nav registration + CRUD modal + view-popup read-only + History (audit) tab + hook notification. Các entity hiện có:

| Entity | Sheet | Bản chất | Liên quan H2 |
|---|---|---|---|
| **Task_Master** (24 cột) | Task_Master | Công việc: PIC, team, %HT, deadline, state, RAG, Tuần BC (đa-tuần ISO), initiative/milestone link | **= lớp ACTION** cần cho H2 |
| **Initiative_Master + Milestone** | Initiative_Master | Sáng kiến/dự án → milestone → task; có accountable, category, status, %HT | **= khuôn mẫu OBJECTIVE→MILESTONE** |
| **Dev_Plan** (12 cột) | Dev_Plan | Kế hoạch phát triển cá nhân theo PIC (ownership gate) | **= Pillar 2 (Capability)** |
| Case_Pipeline / Issue_Tracker | … | Pipeline case / quản lý lỗi | Tham chiếu (dependency/issue) |
| User_Master | User_Master | Người dùng, role (Admin/Teamlead/User), team | **= nguồn MEMBER** |
| Notifications | Notifications | Nhắc deadline (3d/1d/today/overdue) + email digest | **= engine cảnh báo RAG/deadline** |

### 1.3 Hạ tầng dùng lại được (rất mạnh)
- **Shell UI**: sidebar/topbar/nav, dark mode, responsive, modal/toast/confirm.
- **i18n VI/EN** đầy đủ (`t()`, `tState()`).
- **RBAC**: Admin / Teamlead / User; ownership gate (Dev_Plan là ví dụ chuẩn: chỉ owner/Admin sửa).
- **GAS CRUD chuẩn hoá**: router `Code.gs`, atomic per-row upsert/delete, `Concurrency.gs` (chống ghi đè khi tạo trùng — LockService + reassign id).
- **Audit_Log** + History tab lazy-load.
- **RAG / priority board**: `action-plan.js` (kanban RAG, overdue auto-add, priority), **Executive Summary** view (`executive-summary.js` — đã có "Sức khỏe từng Initiative", attention list, risk tags).
- **Date đã đồng nhất ISO** (S67): `toISODate`/`fmtDate` — mọi ngày lưu ISO, hiển thị DD/MM/YYYY.
- **Membership tuần/tháng**: `taskReportWeeks` (auto∪pinned, ISO) — có thể mở rộng cho monthly tracking T8–T12.
- **Notification/deadline engine** sẵn sàng gắn cho KPI milestone.

---

## 2. CURRENT KPI MODEL trong app (KHÁC domain — cần phân biệt)

`kpi-overview.js`, `kpi-progress.js`, `owner-analysis.js`, `branch-analysis.js`, `rm-analysis.js`, `KpiSheetService.gs` (tab `KPI_Summary`), `TPBank_KPI_Dashboard_v2.1.html` → **KPI kinh doanh số (PTKD/biz/bpm, RM, chi nhánh)** nhập từ file Excel raw.

➡️ **Đây KHÔNG phải KPI quản trị đội ngũ/OKR cá nhân.** H2 Team Management là **domain mới**. Không sửa các view này (tránh phá production). Chỉ **mượn pattern** (KPI cards, chart, sheet-sync).

---

## 3. PHÂN TÍCH FILE KPI MEMBER (`Mẫu tham khảo/KPI_H2_2026_QuangNN3 + DungLQ1.xlsx`)

2 sheet, mỗi member 1 sheet phẳng free-text.

### 3.1 QuangNN3 — 3 "Chỉ tiêu", 8 cột (STT · Nội dung · Kết quả đo được · Thời gian · Trọng số · Tỷ lệ HT · Tình trạng · Ghi chú)
- **CT1** Chuẩn hoá cách quản lý công việc (quy trình 5 bước; áp dụng 100% đầu việc; mở rộng theo dõi BLOL). Mốc Quý 3–4/2026. **Trọng số "-" (trống)**.
- **CT2** Lộ trình số hoá BLOL (gộp hệ thống dùng chung; hoàn thiện 2 nghiệp vụ giải toả tạm ứng + quản lý hồ sơ sau phát hành; nghiên cứu AI đọc thư BL; tổng kết + đề xuất 2027). Mốc T8–12. **Trọng số "-"**.
- **CT3** Học & ứng dụng AI (học Colab/Python + công cụ AI; ≥2 công cụ vào dùng thực tế; **giảm ≥30% thời gian**; 2 buổi chia sẻ + 1 tài liệu + 1 công cụ nhân rộng). **Trọng số có: 0.2/0.4/0.25/0.15 = 1.0**.

### 3.2 DungLQ1 — 2 "Chỉ tiêu", 7 cột (KHÔNG có cột Trọng số), có sub-project lồng
- **CT1** Roadmap số hoá tín dụng: (1) GNOL E2E — UAT+Go-live GĐ2, BRD GĐ3, khả thi GĐ4; (2) GNOL tự động — 3 nội dung (AI check hoá đơn, trustlist, hạn mức) + đẩy adoption với SME MASS; (3) Quy hoạch BLOL/GNOL trên BIZ/BPM + SLA report; (4) CR FlowX, Sale Agent survey, **SCF (phụ thuộc nguồn lực IT — chưa có mốc)**.
- **CT2** Học tập & phát triển: ứng dụng AI (≥1 dashboard, ≥1 công cụ AI); **PMI-CPA cert**; mục tiêu cá nhân (chạy 400km, đọc 14 sách).

### 3.3 Members & Projects nhận diện
- **QuangNN3**: BLOL, quy trình quản lý công việc, AI/Python.
- **DungLQ1**: GNOL (E2E + tự động), BLOL/GNOL trên BIZ/BPM, FlowX/CR, Sale Agent, SCF, AI, PMI-CPA.
- **Projects**: GNOL E2E, GNOL tự động, BLOL, SCF, Sale Agent, BIZ/BPM, FlowX, DCB (nâng cấp song song), AI use cases, BAU/CR.

---

## 4. PROBLEMS / GAP (dữ liệu member hiện tại)

| # | Vấn đề | Bằng chứng |
|---|---|---|
| P1 | **Mỗi member 1 sheet phẳng riêng** → không single-source, không tổng hợp được | 2 sheet cấu trúc khác nhau |
| P2 | **Cấu trúc không nhất quán giữa member** | Quang 8 cột (có Trọng số), Dung 7 cột (không); Quang 3 CT phẳng, Dung 2 CT lồng sub-project |
| P3 | **Phần lớn dòng là TASK/MILESTONE, không phải KPI outcome** | "Ban hành quy trình", "Hoàn thiện 2 nghiệp vụ", "UAT+Go-live" = hành động; kết quả = "Hoàn thành/đưa vào sử dụng" (nhị phân), không đo outcome |
| P4 | **Thiếu baseline** hầu hết | Không có điểm gốc để tính % cải thiện |
| P5 | **Target không đo được / thiếu số** | "tăng số lượng KH" (không có số); Dung tự ghi chú "chưa có số liệu mục tiêu chính xác" |
| P6 | **Trọng số không đầy đủ / thiếu** | Quang CT1,CT2 = "-"; Dung không có cột trọng số nào |
| P7 | **Thiếu Priority (P1/P2/P3)** | Không phân biệt việc must-win vs BAU |
| P8 | **Thiếu RAG, Risk, Dependency có cấu trúc** | SCF phụ thuộc IT chỉ ghi prose; không có cột risk/mitigation |
| P9 | **Mốc thời gian thô** (Quý/khoảng tháng) | "Quý 3", "T8–9" → khó tracking hàng tháng T8→T12 |
| P10 | **Chưa map 3 trụ cột chuẩn** | Ngầm: Quang CT1=capability, CT2=business, CT3=AI; Dung CT1=business, CT2=capability+AI — chưa chuẩn hoá |
| P11 | **Không cơ chế tracking** | Tình trạng = "Chưa bắt đầu", Tỷ lệ HT = 0 toàn bộ; không có actual/progress theo tháng |
| P12 | **Thiếu Evidence, Owner (ngầm), Deadline cụ thể** | Không cột bằng chứng; owner = mặc định người sở hữu sheet |

---

## 5. REUSABLE ASSETS (cơ hội tái sử dụng — không rewrite)

| Cần cho H2 | Tái sử dụng từ | Ghi chú |
|---|---|---|
| Objective → Milestone | **Initiative_Master + Milestone pattern** | Khuôn mẫu gần như 1-1 |
| Action layer | **Task_Master** (link `kpi_id`/objective) | Cả engine assignment/tracking/tuần/notification |
| Capability (Pillar 2) | **Dev_Plan** | Ownership gate sẵn |
| Member | **User_Master** (+ `capability_level`) | Single source người dùng |
| Cảnh báo deadline/RAG | **Notifications engine** | 3d/1d/today/overdue + email digest |
| Dashboard điều hành | **Executive Summary + Action Plan** | Health/attention/risk/priority board có sẵn |
| CRUD an toàn đa người | **Concurrency.gs + atomic upsert** | Lock + reassign id |
| Ngày tháng | **toISODate/fmtDate** | Đã đồng nhất ISO |
| Song ngữ, dark mode, RBAC, modal/toast, History tab | Shell hiện hữu | Không phải viết lại |

---

## 6. RISKS

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **Deadline BLĐ Thứ 7 tuần này** — không kịp cả hệ thống phần mềm | 🔴 Cao | Tách 2 luồng: (A) **Nội dung** (framework + 2 KPI mẫu chuẩn hoá + report) giao trước hạn; (B) **Hệ thống** (dashboard) làm sau |
| Phá vỡ dashboard production khi thêm module | 🟡 | Domain mới, sheet/route/view riêng; không đụng view cũ; test regression |
| Over-engineering (13 sheet, AI sớm) | 🟡 | Pilot 2 member, mô hình 8 sheet cốt lõi, AI để sau (chỉ chừa kiến trúc) |
| Member không chịu cập nhật (kỹ năng tracking kém — chính BLĐ nêu) | 🟡 | UX cập nhật <5 phút; auto RAG; nhắc qua notification |
| Thiếu số liệu baseline/target | 🟡 | Framework bắt buộc field; flag KPI thiếu; Teamlead challenge trước duyệt |
| Backend cá nhân + mạng nội bộ ANBM (S67) | 🟡 | Dùng lại đúng hạ tầng hiện hành; không đổi account |

---

## 7. KẾT LUẬN DISCOVERY
- H2 Team Management = **domain mới** trên **nền tảng SPA + GAS + Sheets đã có** → **mở rộng, không rewrite** (đúng §30).
- Tái sử dụng lớn: Initiative→Milestone (objective), Task_Master (action), Dev_Plan (capability), Notifications (RAG/deadline), Executive Summary + Action Plan (dashboard), Concurrency + audit + i18n + RBAC.
- Dữ liệu member hiện tại: nhiều Task giả dạng KPI, thiếu baseline/target/weight/priority/RAG/risk/dependency, không nhất quán, không single-source → framework mới phải chuẩn hoá.
- **Ràng buộc thời gian**: nội dung cho BLĐ phải xong trước hệ thống → sequencing 2 luồng.

➡️ Xem **Implementation Proposal** (mục kế tiếp) để chốt kiến trúc + các quyết định cần Teamlead xác nhận trước khi build.
