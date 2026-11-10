# Nâng cấp UI/UX SHTD theo chuẩn v2 — phương án & kế hoạch

> **✅ 2026-11-10 — anh duyệt, chỉ đạo làm cả 4 đợt trong 1 lượt (chỉ giao diện, thêm/bớt nút phải hỏi). Đã làm v6.75: audit 0 hàng lệch, chỉ 3 mức 32/36/40px, 0 tràn ngang ở 23 màn × 2 khổ. Phông: Be Vietnam Pro. Bảng: độ rộng theo dữ liệu LIVE — chi tiết `AI_CONTEXT/PROJECT_STATE.md` S95. Còn lại: dọn dần style viết thẳng, soát màn KPI trên LIVE.**

> Anh Tuân giao 2026-11-10. Chuẩn: AIOS `03_Skills/design-system` v2 · profile **P1 App tác nghiệp** · làm như đợt AIUS (2026-11-03).
> Phạm vi anh chốt: **toàn app (23 màn), chia đợt** · **giữ màu tím-cam SHTD, chỉ sửa khung** (D02 skill) · **laptop 14" + điện thoại** · mỗi đợt: push → anh check LIVE → làm đợt sau.
> **Mục tiêu chính:** hết dứt điểm tình trạng nút lệch nhau, mỗi màn một kiểu nút/ô lọc.

## 1. Hiện trạng (đo 2026-11-10)

Đo bằng `test/audit_uiux_controls.mjs` (MỚI): app chạy local, dữ liệu giả 30 task + 8 case + 2 initiative, tài khoản Admin, 23 màn × 2 khổ. Script tìm các nút/ô nằm cùng một hàng và báo hàng nào lệch chiều cao hoặc lệch đáy quá 1px.

| Chỉ số | Laptop 1366px | Điện thoại 390px |
|---|---|---|
| Số chiều cao nút/ô nhập khác nhau | **12 mức** (24 · 26 · 27 · 28 · 30 · 31 · 32 · 33 · 34 · 35 · 40 · 68px) | 12 mức |
| Hàng nút lệch nhau | **13 hàng / 6 màn** | **21 hàng / 6 màn** |
| Nút/ô thấp hơn 36px (khó bấm bằng tay) | — | **gần như toàn bộ**, ở 18/23 màn |
| Trang tràn ngang | 0 | 0 (với dữ liệu giả; KPI chưa có dữ liệu nên chưa đo được) |

Các màn bị lệch: **Hàng đợi BLĐ** (8 hàng, nút Duyệt/Trả cao 28 và 30px, link 26px) · **Quản lý Task** (nút Thêm 35px đứng cạnh nút viền 30px) · **Case Pipeline · Issue · Initiative** (nút viền 30px, nút chính 28px; select 32px) · **Backlog IT** (ô tìm 31px, select 33px).

**Gốc lỗi (theo mã nguồn):**
1. **Nút không có chiều cao cố định**, chỉ dựa vào padding. `.btn-outline` có viền 1px, `.btn-primary` không có viền, nên đặt cạnh nhau là lệch 2px. Ô nhập `.form-control` dùng viền **1,5px** và padding 10px, lại cao hơn nút.
2. **Mỗi màn tự định nghĩa cỡ nhỏ riêng.** `.form-control-sm` nằm trong `dev-plan.css` nhưng Backlog IT cũng dùng · `.dev-table td .btn-sm` · `responsive.css` đổi padding nút ở toolbar trên điện thoại · `.bld-ghost-link`, `.overdue-banner-btn`, `.popup-tab`… mỗi cái một cỡ.
3. **Khoảng 15 kiểu thanh công cụ/bộ lọc**: `toolbar`, `tk-toolbar`, `h2-toolbar`, `filter-group`, `h2-filter-group`, `dev-filter-group`, `qvp-filter-row`, `mw-team-filter`… mỗi màn căn hàng một kiểu.
4. **883 chỗ style viết thẳng** trong JS/HTML (nhiều nhất Initiative 77 · Quản lý người dùng 54 · Owner 49 · Action plan 44 · Quickview 42 · Case 40), làm cho sửa CSS chung không ăn hết.
5. **Phông DM Sans không có bộ chữ tiếng Việt**, giống lỗi đã gặp ở AIUS: chữ có dấu rơi về phông khác, nét không đều.

## 2. Gu: giữ tím-cam, chỉ thêm thang kích thước

| Hạng mục | Giữ / đổi |
|---|---|
| Màu `--primary #4B1FAF` · `--accent #FF7A00` · trạng thái · dark mode | **Giữ nguyên** |
| Sidebar tím, menu 2 lớp, badge chỉ đếm mục cần chú ý | Giữ nguyên |
| **Thang chiều cao điều khiển (MỚI)** | `--ctl-h-sm 32px` · `--ctl-h 36px` · trên điện thoại ≤ 768px mọi nút/ô **≥ 40px** |
| Viền | Mọi nút có viền 1px (nút đặc dùng viền cùng màu nền) → nút đặc và nút viền cao bằng nhau · ô nhập viền 1px |
| Phông chữ | **Đề xuất đổi DM Sans → Be Vietnam Pro** (có bộ chữ tiếng Việt, dáng gần DM Sans nên ít khác biệt); dự phòng `Segoe UI` khi máy cơ quan chặn Google Fonts. *Anh có thể chọn giữ DM Sans.* |

## 3. Cách làm — phương án

| Phương án | Mô tả | Đánh giá |
|---|---|---|
| A. Thay hẳn bằng starter AIOS | Viết lại class trong 25 file view | ❌ Rủi ro cao, vỡ 56 file test, không chia đợt được |
| **B. Giữ class, chuẩn hóa từ gốc (khuyến nghị)** | Đợt 1 đặt thang kích thước cho `.btn*`, `.form-control*`, select, ô tìm kiếm; gom các biến thể toolbar/bộ lọc về một khung chuẩn bằng CSS (class cũ trỏ sang khung mới, chưa cần sửa JS) → cả app cao bằng nhau ngay đợt 1. Các đợt sau sửa từng nhóm màn: gỡ style viết thẳng, gỡ class riêng | ✅ Hết lệch toàn app ngay đợt 1, mỗi đợt nhỏ, dễ quay lui |

**Chọn B.** Mỗi đợt: sửa → chạy toàn bộ test (`run_tests.mjs`) → chạy `audit_uiux_controls.mjs` (cổng chặn: **0 hàng lệch**, **≤ 3 mức chiều cao**, điện thoại 0 nút < 40px ở màn đã làm) → ảnh 1366 + 390 → bump cache `?v=` → push `main` → anh check LIVE. **Chỉ đụng giao diện, không cần redeploy GAS.**

## 4. Kế hoạch 4 đợt

| Đợt | Nội dung | Màn | Xong khi |
|---|---|---|---|
| **1. Nền + nút/ô chung** | Token thang kích thước · `.btn` mọi biến thể (đặc, viền, ghost, nguy hiểm, thành công, nhỏ) cao bằng nhau · `.form-control` / select / ô tìm cùng chiều cao với nút · gom `.form-control-sm` về `forms.css` · khung chuẩn `.toolbar` / `.filter-bar` + bí danh cho class cũ · nút/ô ≥ 40px trên điện thoại · phông có tiếng Việt · audit chạy được bằng `run_tests` | Toàn app | Audit: 0 hàng lệch ở cả 23 màn × 2 khổ · test cũ xanh |
| **2. Màn dùng hằng ngày** | My Work · Quản lý Task · Gantt · Quickview (popup task) · Case Pipeline · Issue · Initiative · Hàng đợi BLĐ · Backlog IT: gỡ style viết thẳng ở hàng nút/bộ lọc, nút trong bảng, bộ lọc Team + Nhân sự đúng chuẩn | 9 | Audit sạch · 0 tràn ngang ở 390px · popup không vỡ trên điện thoại |
| **3. H2 + KPI + báo cáo** | H2 Dashboard / Tracker / Review · KPI tổng quan · Action plan · Tiến độ KPI · Owner / Chi nhánh / RM · Dashboard · Executive Summary · Dev plan | 12 | Như trên, đo với dữ liệu KPI thật trên LIVE (dữ liệu giả chưa phủ) |
| **4. Dọn + tài liệu** | AI Chat · Quản lý người dùng · Thông báo · đăng nhập · gỡ phần còn lại trong 883 style viết thẳng · dọn CSS chết · cập nhật `REF-UIUX-COMPONENT-CONTRACT` ở hub (luật: nút mới phải dùng thang chiều cao) · `/design-review` LIVE cả app | 4 + dọn | `/design-review` không còn lỗi Chặn/Cao |

Mỗi đợt ước 1 phiên. Đợt 1 là đợt quyết định mục tiêu "hết lệch"; đợt 2–4 làm cho mã sạch để lỗi không quay lại.

## 5. Rủi ro & cách giữ

| Rủi ro | Giữ bằng |
|---|---|
| Nút cao lên 36px làm bảng dày, nút trong bảng chiếm chỗ | Nút trong bảng dùng cỡ nhỏ 32px; chỉ điện thoại mới lên 40px |
| Đổi phông làm chữ dài ra, vỡ dòng ở thẻ KPI / Gantt | Be Vietnam Pro rộng gần DM Sans; đo 23 màn trước khi push; anh có thể giữ DM Sans |
| Class cũ trỏ sang khung chuẩn làm đổi bố cục ngoài ý muốn | Bí danh chỉ đặt chiều cao + căn hàng, không đổi hướng cột/hàng; ảnh trước/sau từng màn |
| Người dùng đang mở bản cũ trong cache | Bump `?v=` mọi file CSS đã sửa |
| Test Playwright bám selector | Giữ class (phương án B); test vỡ → chỉ sửa test khi đổi có chủ đích |

## 6. Cần anh duyệt
1. Phương án **B** + 4 đợt như mục 4.
2. Thang kích thước: **32 / 36px trên laptop, ≥ 40px trên điện thoại**.
3. Phông: **đổi sang Be Vietnam Pro** (khuyến nghị) hay giữ DM Sans.
4. Đợt 1 làm ngay sau khi anh duyệt.
