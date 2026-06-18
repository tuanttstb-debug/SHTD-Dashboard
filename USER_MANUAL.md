# HƯỚNG DẪN SỬ DỤNG
# SHTD Dashboard — Số Hóa Tín Dụng

**Phiên bản:** v6.2
**Ngày cập nhật:** 2026-06-16
**Đối tượng:** Người dùng cuối — Nhân viên, Team Lead, Quản lý, BLĐ
**Nguồn tài liệu:** Toàn bộ thông tin được trích xuất trực tiếp từ mã nguồn và tài liệu dự án hiện có.

---

> **Ghi chú tài liệu:** Mọi tính năng mô tả trong tài liệu này đều được xác nhận tồn tại trong mã nguồn (`assets/js/`, `backend/*.gs`, `index.html`). Các mục được đánh dấu `[NEED HUMAN VALIDATION]` cần xác nhận từ nhóm phát triển.

---

## MỤC LỤC

- [PHẦN I — GIỚI THIỆU HỆ THỐNG](#phần-i--giới-thiệu-hệ-thống)
- [PHẦN II — BẮT ĐẦU SỬ DỤNG](#phần-ii--bắt-đầu-sử-dụng)
- [PHẦN III — TÍNH NĂNG CHÍNH](#phần-iii--tính-năng-chính)
  - [3.1 Dashboard — Trang Tổng Quan](#31-dashboard--trang-tổng-quan)
  - [3.2 Quản Lý Task (Công Việc)](#32-quản-lý-task-công-việc)
  - [3.3 Case Pipeline — Cơ Hội Kinh Doanh](#33-case-pipeline--cơ-hội-kinh-doanh)
  - [3.4 Theo Dõi Initiative & Milestone](#34-theo-dõi-initiative--milestone)
  - [3.5 Phê Duyệt BLĐ](#35-phê-duyệt-blđ)
  - [3.6 Timeline (Gantt)](#36-timeline-gantt)
  - [3.7 Báo Cáo Hiệu Suất](#37-báo-cáo-hiệu-suất)
  - [3.8 AI Assistant](#38-ai-assistant)
  - [3.9 Tổng Hợp BLĐ (Executive Summary)](#39-tổng-hợp-blđ-executive-summary)
  - [3.10 KPI Digital](#310-kpi-digital)
- [PHẦN IV — BÁO CÁO & XUẤT DỮ LIỆU](#phần-iv--báo-cáo--xuất-dữ-liệu)
- [PHẦN V — QUẢN TRỊ HỆ THỐNG (Admin)](#phần-v--quản-trị-hệ-thống-admin)
- [PHẦN VI — TÀI LIỆU THAM KHẢO](#phần-vi--tài-liệu-tham-khảo)
- [PHỤ LỤC A — BẢNG KIỂM THỬ](#phụ-lục-a--bảng-kiểm-thử)
- [PHỤ LỤC B — BÁO CÁO KHÔNG NHẤT QUÁN](#phụ-lục-b--báo-cáo-không-nhất-quán)

---

# PHẦN I — GIỚI THIỆU HỆ THỐNG

## 1.1 Mục Đích

**SHTD Dashboard** (Số Hóa Tín Dụng) là ứng dụng web nội bộ phục vụ **Khối Khách Hàng Doanh Nghiệp (KHDN)** của ngân hàng. Hệ thống cung cấp:

- Theo dõi tiến độ công việc (Task) theo thời gian thực
- Quản lý cơ hội kinh doanh (Case Pipeline)
- Báo cáo tuần gửi Ban Lãnh Đạo
- Theo dõi KPI Số Hóa Tín Dụng (KPI 2.1, 2.2)
- Quy trình phê duyệt BLĐ (Ban Lãnh Đạo)
- Trợ lý AI tích hợp (Gemini 2.5 Flash)

## 1.2 Đối Tượng Sử Dụng

| Vai trò | Quyền hạn | Chức năng chính |
|---------|-----------|-----------------|
| **Admin (Quản trị viên)** | Toàn quyền | CRUD đầy đủ, quản lý user, xóa hàng loạt, đồng bộ GG Sheets |
| **Teamlead (Trưởng nhóm)** | Đọc + Sửa | Theo dõi task nhóm, cập nhật tiến độ, xem báo cáo |
| **User (Nhân viên)** | Đọc + Sửa | Cập nhật task bản thân, báo cáo tuần |
| **Manager / BLĐ** | Đọc + Phê duyệt | Xem dashboard, phê duyệt yêu cầu trong BLD Queue |

## 1.3 Kiến Trúc Kỹ Thuật

```
Trình duyệt (index.html)
       │
       ├─ Dữ liệu offline: localStorage (shtd_v2)
       │
       └─ Đồng bộ ← Google Apps Script (GAS Web App)
                              │
                    Google Sheets (cơ sở dữ liệu)
                    ├── Task_Master (24 cột)
                    ├── Initiative_Master (15 cột)
                    ├── Case_Pipeline (20 cột)
                    ├── User_Master
                    ├── KPI_Summary
                    └── Audit_Log
```

**Lưu ý quan trọng:**
- Hệ thống hoạt động **offline** với dữ liệu cache. Khi kết nối GG Sheets thành công, dữ liệu sẽ được đồng bộ.
- Mọi thay đổi được lưu vào **Google Sheets** là nguồn dữ liệu chính thức.
- Mọi thao tác ghi đều được ghi vào **Audit_Log** tự động.

## 1.4 Yêu Cầu Truy Cập

- **Trình duyệt:** Chrome, Edge, Firefox (phiên bản mới nhất)
- **Kết nối internet:** Cần thiết để đồng bộ GG Sheets; có thể dùng offline với cache
- **Tài khoản:** Được cấp bởi Admin — bao gồm tên đăng nhập và mật khẩu
- **Phân quyền:** Do Admin thiết lập trên hệ thống

---

# PHẦN II — BẮT ĐẦU SỬ DỤNG

## 2.1 Đăng Nhập

**Screenshot:** `HDSD/01_login.png`

### Các bước đăng nhập:

1. Mở file `index.html` hoặc truy cập URL hệ thống trong trình duyệt
2. Màn hình đăng nhập xuất hiện với logo **SHTD — Web Nội Bộ**
3. Nhập **Tên đăng nhập** (VD: `TuanTT4`)
4. Nhập **Mật khẩu**
5. Nhấn nút **"Đăng nhập"** hoặc phím `Enter`

### Quy tắc đăng nhập:
- Tên đăng nhập **không phân biệt hoa/thường**
- Phiên làm việc tự động hết hạn sau **24 giờ**
- Sau khi đăng nhập, hệ thống tự động tải dữ liệu từ Google Sheets

### Thông báo lỗi khi đăng nhập:

| Thông báo | Nguyên nhân | Cách xử lý |
|-----------|-------------|------------|
| `Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.` | Để trống một trong hai trường | Điền đầy đủ cả hai trường |
| `Đăng nhập thất bại.` | Sai tên đăng nhập hoặc mật khẩu | Kiểm tra lại, liên hệ Admin nếu quên mật khẩu |
| `Apps Script lỗi HTTP: [số]` | Lỗi kết nối server | Kiểm tra internet, thử lại sau |
| `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.` | Token 24h hết hạn | Đăng nhập lại bình thường |

### Đăng xuất:
1. Nhấp vào **avatar** (2 chữ cái đầu tên) ở góc trên cùng bên phải
2. Chọn **"Đăng xuất"** trong menu dropdown
3. Xác nhận trong hộp thoại
4. Hệ thống quay về màn hình đăng nhập

## 2.2 Giao Diện Tổng Quan

**Screenshot:** `HDSD/02_dashboard.png`

Sau khi đăng nhập, giao diện chính gồm 3 vùng:

```
┌─────────────────────────────────────────────────────────────────┐
│  THANH TRÊN (Topbar)                                            │
│  [Nút sidebar] [Tiêu đề trang]         [Nút kết nối] [Avatar]  │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│  THANH BÊN   │              NỘI DUNG CHÍNH                       │
│  (Sidebar)   │         (View được chọn hiển thị ở đây)          │
│              │                                                   │
│  - Dashboard │                                                   │
│  - Task      │                                                   │
│  - Case      │                                                   │
│  - ...       │                                                   │
│              │                                                   │
│  [Trạng thái │                                                   │
│   kết nối]   │                                                   │
│  [Đồng hồ]   │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

### Thanh bên trái (Sidebar) — Danh mục điều hướng:

**Tổng quan:**
- Dashboard
- Tổng hợp BLĐ
- Phê duyệt BLĐ *(có badge số lượng)*

**Quản lý:**
- Case Pipeline *(có badge số lượng)*
- Theo dõi Initiative
- Quản lý Task *(có badge số lượng)*
- Timeline (Gantt)

**Báo cáo:**
- Performance

**KPI Digital:**
- KPI Overview
- Action Plan
- KPI Progress
- Owner Analysis
- Branch Analysis
- RM Analysis

**Trợ lý:**
- AI Assistant

**Quản trị** *(chỉ Admin):*
- Quản lý User

### Thanh trên cùng (Topbar):
- **Nút hamburger** — Thu gọn/mở rộng sidebar (desktop) hoặc mở drawer (mobile)
- **Tiêu đề trang** — Tên view đang hiển thị
- **Nút "Kết nối GG Sheets"** — Kết nối/đồng bộ dữ liệu
- **Đèn trạng thái** — Màu xanh = đã kết nối, xám = offline
- **Avatar người dùng** — Tên, vai trò, menu đăng xuất/đổi mật khẩu

### Thanh trạng thái đáy sidebar:
- Trạng thái kết nối: `Offline` / `Google Sheets`
- Số lượng task
- Đồng hồ thời gian thực

## 2.3 Phím Tắt

Nhấn **`?`** bất kỳ lúc nào để xem bảng phím tắt đầy đủ.

| Phím | Chức năng |
|------|-----------|
| `Ctrl + N` | Tạo Task mới |
| `Ctrl + D` | Bật/tắt chế độ tối (Dark mode) |
| `Ctrl + B` | Thu gọn/mở rộng sidebar |
| `Q` | Mở/đóng Quick View |
| `?` | Xem bảng phím tắt |
| `Esc` | Đóng modal/overlay đang mở |
| `G` → `D` | Đến Dashboard |
| `G` → `E` | Đến Tổng hợp BLĐ |
| `G` → `B` | Đến Phê duyệt BLĐ |
| `G` → `C` | Đến Case Pipeline |
| `G` → `T` | Đến Quản lý Task |
| `G` → `G` | Đến Timeline (Gantt) |
| `G` → `P` | Đến Performance |
| `G` → `K` | Đến KPI Overview |
| `G` → `A` | Đến AI Assistant |

> **Lưu ý:** Phím `G` → `[phím]` là tổ hợp 2 phím liên tiếp (nhấn G trước, rồi phím thứ hai). Không nhấn đồng thời.
> Phím tắt **không hoạt động** khi con trỏ đang ở trong ô nhập liệu.

## 2.4 Đổi Mật Khẩu

1. Nhấp vào **avatar** góc trên phải
2. Chọn **"Đổi mật khẩu"**
3. Nhập **Mật khẩu hiện tại**
4. Nhập **Mật khẩu mới** (tối thiểu 6 ký tự)
5. Nhập lại **Mật khẩu mới** để xác nhận
6. Nhấn **"Lưu mật khẩu"**

**Quy tắc mật khẩu:**
- Tối thiểu **6 ký tự**
- Mật khẩu mới và xác nhận phải **khớp nhau**

**Thông báo lỗi:**

| Thông báo | Nguyên nhân |
|-----------|-------------|
| `Vui lòng nhập đầy đủ các trường.` | Để trống ô nào đó |
| `Mật khẩu mới nhập lại không khớp.` | Hai trường mật khẩu khác nhau |
| `Mật khẩu mới phải có ít nhất 6 ký tự.` | Mật khẩu quá ngắn |

## 2.5 Chế Độ Tối / Sáng

Nhấn **`Ctrl + D`** hoặc tìm nút chuyển theme để bật/tắt chế độ tối.
Thiết lập được lưu vào trình duyệt và giữ nguyên sau khi đóng trang.

## 2.6 Kết Nối Google Sheets

Khi đăng nhập, hệ thống tự động kết nối GG Sheets. Nếu thất bại:

1. Nhấn nút **"Kết nối GG Sheets"** trên thanh topbar
2. Đợi thông báo: `✅ Đã tải dữ liệu từ Google Sheets!`
3. Nếu thất bại: `Lỗi kết nối: [thông báo lỗi]` — kiểm tra kết nối internet

**Đồng bộ thủ công:** Nhấn nút **"Đồng bộ"** (xuất hiện sau khi kết nối thành công) để tải dữ liệu mới nhất từ Sheets.

**Ngắt kết nối:** Nhấn **"Xóa Cache"** để xóa dữ liệu khỏi giao diện (dữ liệu trên Google Sheets KHÔNG bị ảnh hưởng).

---

# PHẦN III — TÍNH NĂNG CHÍNH

## 3.1 Dashboard — Trang Tổng Quan

**Screenshot:** `HDSD/02_dashboard.png`
**Điều hướng:** Sidebar → Dashboard | Phím tắt: `G` → `D`

Dashboard là trang mặc định sau khi đăng nhập, cung cấp cái nhìn tổng quan về toàn bộ công việc.

### 3.1.1 Bộ Lọc Dashboard

Ở đầu trang có **2 bộ lọc:**

| Bộ lọc | Mô tả |
|--------|-------|
| **Xem theo tuần** | Lọc dữ liệu theo Tuần BC cụ thể. Chọn "Tất cả" để xem toàn bộ. |
| **Tất cả task / [filter khác]** | Lọc thêm theo phạm vi hiển thị. |

### 3.1.2 Các Thẻ KPI (Summary Cards)

Hàng đầu tiên hiển thị **4 thẻ tổng hợp** — có thể nhấp để xem chi tiết:

| Thẻ | Nội dung | Màu | Khi nhấp |
|-----|----------|-----|-----------|
| **TỔNG SỐ TASK** | Tổng số task trong hệ thống | Bình thường | Mở danh sách tất cả task |
| **HOÀN THÀNH** | Số task progress ≥ 100% hoặc trạng thái "Hoàn thành" | Xanh | Mở danh sách task đã xong |
| **ĐANG THỰC HIỆN** | Task chưa hoàn thành | Cam | Mở danh sách đang làm |
| **QUÁ HẠN** | Task qua deadline mà chưa hoàn thành | Đỏ | Mở danh sách quá hạn |

> Nhấp vào bất kỳ thẻ nào sẽ mở **modal chi tiết** với danh sách task tương ứng. Nhấp vào từng dòng trong modal để mở form chỉnh sửa task đó.

### 3.1.3 Biểu Đồ RAG

**Biểu đồ vòng tròn (doughnut)** phân loại task theo trạng thái sức khỏe:

| Màu | Ý nghĩa | Tiếng Anh |
|-----|---------|-----------|
| 🟢 Xanh | Đúng tiến độ | Green — On track |
| 🟡 Vàng | Có rủi ro | Amber — At risk |
| 🔴 Đỏ | Trễ / Nghiêm trọng | Red — Behind |

> Nhấp vào màu trên biểu đồ để xem danh sách task theo màu RAG đó.

### 3.1.4 Bảng Tổng Hợp Theo Initiative

Hiển thị từng Initiative với:
- **Tổng** số task
- **Xong** (đã hoàn thành)
- **Tiến độ** trung bình (%)
- **RAG** tổng thể

> Nhấp vào dòng Initiative để xem danh sách task thuộc Initiative đó.

### 3.1.5 Phân Bố Theo Team

Hiển thị số lượng task theo từng team, kèm thanh tỷ lệ trực quan.

### 3.1.6 Blocked & Cần BLĐ

Danh sách nhanh các task:
- Đang **Blocked** (bị chặn, chưa thể tiếp tục)
- Cần **BLĐ quyết định** (`canBLD = Y`)

> Nhấp vào task trong danh sách này để mở form chỉnh sửa.

---

## 3.2 Quản Lý Task (Công Việc)

**Screenshot tạo task:** `HDSD/03_create_task.png`
**Điều hướng:** Sidebar → Quản lý Task | Phím tắt: `G` → `T` hoặc `Ctrl + N`

### 3.2.1 Danh Sách Task

Hiển thị bảng tất cả task với **4 tab preset:**

| Tab | Lọc hiển thị |
|-----|-------------|
| **Đang làm** | Task chưa hoàn thành (mặc định) |
| **Tuần BC này** | Task có `tuanBC` = tuần hiện tại |
| **Quá hạn** | Task đã qua deadline và chưa hoàn thành |
| **Tất cả** | Toàn bộ task trong hệ thống |

Badge số trên tab hiển thị số lượng task phù hợp.

### 3.2.2 Bộ Lọc Task

**7 bộ lọc** có thể dùng đồng thời:

| Bộ lọc | Loại | Mô tả |
|--------|------|-------|
| **Mã Task** | Nhập text | Tìm theo ID task (tìm kiếm từng phần) |
| **Initiative** | Dropdown | Lọc theo Initiative hoặc BAU |
| **Team** | Dropdown | Lọc theo team chính |
| **PIC Responsible** | Dropdown | Lọc theo người thực hiện |
| **Trạng thái** | Dropdown | Lọc theo trạng thái công việc |
| **Health (RAG)** | Dropdown | Lọc theo Green/Amber/Red |
| **Tuần BC** | Dropdown | Lọc theo tuần báo cáo; chọn "📅 Tuần này" để lọc tuần hiện tại |

> Bộ lọc hoạt động theo thời gian thực (debounce 200ms). Mọi bộ lọc đang áp dụng hiển thị dưới dạng **chip** phía trên bảng — nhấp **X** trên chip để bỏ lọc đó.

### 3.2.3 Sắp Xếp

- Nhấp vào **tiêu đề cột** để sắp xếp theo cột đó
- Nhấp lần 2 để đảo chiều (tăng/giảm)
- Giữ **Shift** và nhấp nhiều cột để sắp xếp nhiều cấp

### 3.2.4 Phân Trang

- Hiển thị **20 task mỗi trang**
- Thanh phân trang ở đáy bảng để chuyển trang

### 3.2.5 Tạo Task Mới

**Screenshot:** `HDSD/03_create_task.png`

**Cách mở:**
- Nhấn nút **"+ Thêm Task"** trong view Quản lý Task
- Hoặc nhấn **`Ctrl + N`** từ bất kỳ đâu

**Form tạo task gồm các trường:**

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| **Mã Task (ID)** | ✅ | Tự động tạo; có thể tạo lại bằng nút "Tạo lại" |
| **Phân loại** | ✅ | Task / BAU / Dự án / Sáng kiến / Case |
| **Category** | ✅ | Nhóm công việc: Sản phẩm, Số hóa, AI/Năng suất, Room/GHTD, Bán hàng, Rủi ro/QLDM, Đào tạo, Dashboard/BC, Hỗn hợp |
| **Tên công việc (Task Name)** | ✅ | Mô tả ngắn gọn công việc cụ thể |
| **Initiative** | ✅ | Chọn Initiative hoặc BAU (thường xuyên) |
| **Milestone** | Không | Liên kết với milestone trong Initiative |
| **Team chính** | ✅ | Team chính phụ trách |
| **Team phối hợp** | Không | Các team cùng tham gia |
| **PIC Accountable** | ✅ | Người chịu trách nhiệm (team lead) |
| **PIC Responsible** | ✅ | Người trực tiếp thực hiện |
| **PIC Support** | Không | Người hỗ trợ |
| **Start Date** | Không | Ngày bắt đầu (mặc định = ngày hôm nay) |
| **Deadline** | Không | Ngày kết thúc |
| **Tiến độ (%)** | Không | 0–100% |
| **Trạng thái** | Không | Xem bảng trạng thái bên dưới |
| **Health (RAG)** | Không | Green / Amber / Red |
| **Cross-team?** | Không | Y / N |
| **Highlight báo cáo?** | Không | Y / N — Hiển thị trên Action Plan |
| **Kết quả tuần qua** | Không | Tóm tắt kết quả đã đạt |
| **Kế hoạch tuần tới** | Không | Dự kiến công việc tuần sau |
| **Vướng mắc** | Không | Khó khăn, trở ngại hiện tại |
| **Cần BLĐ quyết?** | Không | Y / N — Hiển thị trong BLD Queue |
| **Nội dung cần BLĐ quyết** | Không | Mô tả vấn đề cần BLĐ quyết định |
| **Tuần BC** | Không | Định dạng `Tuần XX/YYYY` (nhập số tuần, tự động format) |

> **Mẹo nhập Tuần BC:** Gõ số tuần (ví dụ `22`) rồi nhấn Tab — hệ thống tự chuyển thành `Tuần 22/2026`.

**Quy tắc tự động:**
- **ID tự động:** Được tạo từ Initiative + Team + Milestone. Thay đổi Initiative/Team/Milestone sẽ tự cập nhật ID đề xuất.
- **Trạng thái "Hoàn thành":** Khi chọn trạng thái này, Tiến độ tự đặt về 100%.
- **Tiến độ > 100%:** Hệ thống từ chối, hiển thị `Tiến độ không được vượt quá 100%!`

### 3.2.6 Các Trạng Thái Task

| Trạng thái | Ý nghĩa |
|------------|---------|
| **Chưa bắt đầu** | Chưa khởi động |
| **Đang thực hiện** | Đang trong quá trình thực hiện |
| **Hoàn thành chuẩn bị** | Đã xong phần chuẩn bị, chờ triển khai |
| **Hoàn thành** | Đã hoàn thành (tiến độ 100%) |
| **Tạm dừng** | Tạm ngừng có kế hoạch |
| **Blocked** | Bị chặn, không thể tiếp tục — xuất hiện trong mục Issues |

### 3.2.7 Lưu Task

1. Nhấn **"Lưu Task"**
2. Hộp thoại xác nhận hiện ra với thông tin tóm tắt (ID, tên, deadline, PIC, trạng thái)
3. Nhấn **"Lưu"** để xác nhận
4. Hệ thống lưu vào localStorage và đồng bộ lên Google Sheets
5. Thông báo: `Đã lưu task [ID]!`

**Lỗi khi lưu:**

| Lỗi | Nguyên nhân |
|-----|-------------|
| `ID đã tồn tại – Không thể thêm mới với mã này!` | Mã task trùng với task khác đang có trong hệ thống |
| `Tiến độ không được vượt quá 100%!` | Nhập tiến độ > 100 |

### 3.2.8 Chỉnh Sửa Task

1. Nhấp vào **dòng task** trong bảng để mở form chỉnh sửa
2. Form hiện tiêu đề **"Chỉnh sửa Task"** và ID của task
3. Nút **"Xóa"** và **"Nhân bản"** xuất hiện ở góc trái dưới
4. Chỉnh sửa các trường cần thiết
5. Nhấn **"Lưu Task"** → xác nhận → đồng bộ

### 3.2.9 Nhân Bản Task (Clone)

1. Mở task cần nhân bản
2. Nhấn nút **"Nhân bản"** ở footer modal
3. Form chuyển sang chế độ thêm mới với ID mới tự động
4. Điền **Tên task** và **Deadline** mới (các trường khác giữ nguyên)
5. Nhấn "Lưu Task"

> Thông báo: `Đã nhân bản. Điền tên & deadline mới rồi lưu.`

### 3.2.10 Xóa Task

1. Mở task cần xóa
2. Nhấn nút **"Xóa"** (màu đỏ)
3. Xác nhận: `Bạn có chắc chắn muốn xóa task [ID]? Hành động này không thể hoàn tác.`
4. Nhấn **"Xóa"** để xác nhận

> ⚠️ **Xóa là vĩnh viễn — không có thùng rác hay khôi phục.**

### 3.2.11 Xử Lý Hàng Loạt (Bulk Actions)

*(Chỉ hiển thị sau khi chọn ít nhất 1 task)*

1. Tích vào **checkbox** đầu mỗi dòng để chọn task (hoặc tích **chọn tất cả**)
2. Thanh **Bulk Actions** xuất hiện ở trên bảng
3. Chọn hành động:
   - **Đặt RAG:** Áp dụng Green / Amber / Red cho tất cả task được chọn
   - **Đặt Trạng thái:** Áp dụng trạng thái cho tất cả task được chọn
   - **Xóa** *(chỉ Admin):* Xóa tất cả task được chọn (có xác nhận)
4. Nhấn **"Bỏ chọn"** để hủy selection

### 3.2.12 Quick View Panel

**Phím tắt:** `Q`

Mở panel bên phải (desktop) hoặc sheet từ dưới lên (mobile) với 4 tab:

| Tab | Nội dung |
|-----|---------|
| **Đã hoàn thành** | Task đã xong trong tuần/giai đoạn được chọn |
| **Kế hoạch** | Task sắp tới (chưa hoàn thành) |
| **Cùng Initiative** | Task cùng Initiative với task đang xem |
| **Vướng mắc** | Task có vướng mắc hoặc đang Blocked |

Nhấn `Q` hoặc `Esc` để đóng panel.

---

## 3.3 Case Pipeline — Cơ Hội Kinh Doanh

**Screenshot tạo case:** `HDSD/03_create_case.png`
**Screenshot chỉnh sửa:** `HDSD/04_edit_case.png`
**Screenshot export:** `HDSD/07_export.png`
**Điều hướng:** Sidebar → Case Pipeline | Phím tắt: `G` → `C`

Case Pipeline quản lý các cơ hội kinh doanh tín dụng doanh nghiệp theo từng giai đoạn xử lý.

### 3.3.1 Hai Chế Độ Hiển Thị

| Chế độ | Mô tả | Lưu trữ |
|--------|-------|---------|
| **Danh sách (Table)** | Bảng dữ liệu với phân trang 20 dòng | Ghi nhớ lựa chọn |
| **Kanban** | Board chia theo nhóm giai đoạn | Ghi nhớ lựa chọn |

Nhấn nút **"Danh sách"** hoặc **"Kanban"** ở góc trên bên phải để chuyển đổi.

### 3.3.2 Thẻ Thống Kê Case

Hàng thẻ tổng hợp phía trên:
- **Tổng số Case**
- **Cần BLĐ**
- **Quá hạn (RAG đỏ)**
- **Đã hoàn thành / Blocked**

### 3.3.3 Preset Tabs

| Tab | Lọc |
|-----|-----|
| **Active** | Case đang trong giai đoạn xử lý (không phải Done/Blocked) |
| **Cần BLĐ** | Case có `canBLD = Y` |
| **Quá hạn** | Case có RAG = Đỏ |
| **Tất cả** | Toàn bộ case |

### 3.3.4 Bộ Lọc Case

| Bộ lọc | Mô tả |
|--------|-------|
| **Tìm kiếm** | Tìm theo tên khách hàng, ID, ĐVKD |
| **Stage** | Lọc theo giai đoạn xử lý |
| **Team** | Lọc theo team phụ trách |
| **Loại hình** | Món / Dự án / HMTD / Rà soát |
| **RAG** | Đỏ / Vàng / Xanh |

### 3.3.5 Tạo Case Mới

**Screenshot:** `HDSD/03_create_case.png`

Nhấn nút **"+ Thêm Case"**:

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| **Mã Case (ID)** | ✅ | Tự động tạo dạng `CP-XXX` |
| **Tuần BC** | Không | Tuần báo cáo |
| **Team** | Không | Team phụ trách |
| **PIC** | Không | Người phụ trách |
| **ĐVKD** | Không | Đơn vị kinh doanh liên quan |
| **Khách hàng / Case** | ✅ | Tên khách hàng hoặc mô tả cơ hội |
| **Loại hình** | Không | Món / Dự án / HMTD / Rà soát |
| **Mức độ phức tạp** | Không | Cao / Trung bình / Thấp |
| **Phương án** | Không | Mô tả phương án tín dụng |
| **Giá trị (tỷ đồng)** | Không | Giá trị giao dịch dự kiến |
| **Stage** | Không | Giai đoạn xử lý (14 giai đoạn) |
| **Vướng mắc chính** | Không | Khó khăn đang gặp phải |
| **Next step** | Không | Bước tiếp theo |
| **Start Date** | Không | Ngày bắt đầu xử lý |
| **Deadline** | Không | Ngày mục tiêu hoàn thành |
| **RAG** | Tự động | Tính tự động từ deadline (xem bên dưới) |
| **Cần BLĐ?** | Không | Y / N |
| **Highlight dashboard?** | Không | Y / N |
| **Ghi chú** | Không | Thông tin bổ sung |

### 3.3.6 Các Giai Đoạn (Stage) Case Pipeline

Case Pipeline sử dụng 14 giai đoạn chia theo 4 nhóm Kanban:

| Nhóm Kanban | Giai đoạn |
|-------------|----------|
| **Mới** | Tiếp nhận |
| **Đang xử lý** | Chờ dữ liệu/ĐVKD, Đang phân tích, Trình chủ trương GĐK, Chờ hội đồng TD, Đang soạn thảo, Đang ký kết, Trình nội bộ, Trình phê duyệt |
| **Chờ** | Tạm dừng, Chờ giải ngân |
| **Hoàn thành** | Đã giải ngân, Đã từ chối |
| **Blocked** | Blocked |

### 3.3.7 RAG Tự Động Cho Case

Khác với Task (RAG thủ công), **Case RAG được tính tự động** từ deadline:

| Điều kiện | RAG |
|-----------|-----|
| Deadline đã qua (≤ 0 ngày còn lại) | 🔴 Đỏ |
| Còn ≤ 7 ngày đến deadline | 🟡 Vàng |
| Còn > 7 ngày | 🟢 Xanh |

### 3.3.8 Chỉnh Sửa Case

**Screenshot:** `HDSD/04_edit_case.png`

Nhấp vào **dòng case** trong bảng → form chỉnh sửa mở ra với tiêu đề **"Sửa Case"**.

### 3.3.9 Xuất Excel Case

**Screenshot:** `HDSD/07_export.png`

Nhấn nút **"Export"** ở góc trên phải của view Case Pipeline.
File xuất: `SHTD_Cases_YYYY-MM-DD.xlsx`

### 3.3.10 Import Case Từ Excel

Nhấn nút **"Import"** → chọn file `.xlsx` hoặc `.xls` → hệ thống đọc và merge dữ liệu.

---

## 3.4 Theo Dõi Initiative & Milestone

**Screenshot:** `HDSD/03_create_initiative.png`
**Điều hướng:** Sidebar → Theo dõi Initiative

### 3.4.1 Tổng Quan

Initiative là các sáng kiến/dự án lớn. Mỗi Initiative có thể có nhiều **Milestone** (mốc tiến độ). Task được liên kết với Initiative và Milestone.

### 3.4.2 Thanh Thống Kê

Phía trên hiển thị 4 chỉ số tóm tắt:
- **Tổng số Initiative**
- **Đang hoạt động (Active)**
- **Hoàn thành (Done)**
- **Bị chặn (Blocked)**
- **Quá hạn** (có deadline đã qua, chưa Done)

### 3.4.3 Bộ Lọc Initiative

Lọc theo **Trạng thái:** Active / Done / Blocked / Paused (hoặc Tất cả)

### 3.4.4 Tạo Initiative Mới

**Screenshot:** `HDSD/03_create_initiative.png`

Nhấn **"+ Thêm Initiative"**:

| Trường | Mô tả |
|--------|-------|
| **Tên Initiative** | Tên đầy đủ |
| **Category** | Phân loại |
| **Accountable** | Người chịu trách nhiệm |
| **Start Date** | Ngày bắt đầu |
| **Deadline / Target** | Mục tiêu hoàn thành |
| **% HT** | Tiến độ (nhập thủ công) |
| **Trạng thái** | Active / Done / Blocked / Paused |
| **Mục tiêu / KPI đầu ra** | KPI mong đợi |
| **Ghi chú** | Thông tin bổ sung |
| **Link tài liệu** | URL tài liệu liên quan |

### 3.4.5 Thêm Milestone Vào Initiative

1. Mở rộng Initiative (nhấp vào dòng Initiative)
2. Nhấn **"+ Thêm Milestone"** bên dưới danh sách milestone
3. Điền thông tin milestone (tên, deadline, trạng thái)
4. Lưu

### 3.4.6 Xóa Initiative

> ⚠️ **Xóa Initiative sẽ xóa CASCADE tất cả Milestone con của nó.**

1. Nhấp biểu tượng **xóa** (thùng rác) trên card Initiative
2. Xác nhận trong hộp thoại
3. Initiative và tất cả Milestone của nó bị xóa

### 3.4.7 Task Liên Kết

Trong mỗi card Initiative, tab **"Tasks"** hiển thị số lượng task đang liên kết với Initiative đó.

---

## 3.5 Phê Duyệt BLĐ

**Screenshot submit (queue):** `HDSD/05_submit.png`
**Screenshot approve (modal):** `HDSD/06_approve.png`
**Điều hướng:** Sidebar → Phê duyệt BLĐ | Phím tắt: `G` → `B`

### 3.5.1 Mục Đích

BLD Queue tập hợp tất cả Task và Case có **"Cần BLĐ? = Y"** để Ban Lãnh Đạo xem xét và ra quyết định.

### 3.5.2 Badge Đếm

Số lượng mục chờ BLĐ hiển thị **badge đỏ** trên nav item "Phê duyệt BLĐ".

### 3.5.3 Bộ Lọc BLD Queue

| Bộ lọc | Mô tả |
|--------|-------|
| **Team** | Lọc theo team |
| **Initiative** | Lọc theo Initiative |

### 3.5.4 Danh Sách Chờ Phê Duyệt

**Screenshot:** `HDSD/05_submit.png`

Hiển thị 2 phần riêng biệt:
- **[TASK]** — Task có `canBLD = Y`
- **[CASE]** — Case có `canBLD = Y`

Mỗi mục hiển thị:
- Tên task/case
- Team
- RAG badge
- PIC Responsible (task) hoặc PIC (case)
- Initiative liên kết
- Tiến độ (%)
- **3 nút hành động:** Duyệt | Từ chối | Bổ sung

### 3.5.5 Quy Trình Phê Duyệt

**Bước 1:** Nhấn **"Duyệt"**, **"Từ chối"**, hoặc **"Bổ sung"** trên mục cần xử lý.

**Bước 2:** Modal xác nhận hiện ra:

**Screenshot:** `HDSD/06_approve.png`

| Hành động | Tiêu đề Modal | Ghi chú | Bắt buộc ghi chú? |
|-----------|--------------|---------|-------------------|
| **Duyệt** | "Phê duyệt yêu cầu" | Ghi chú phê duyệt | Không |
| **Từ chối** | "Từ chối yêu cầu" | Lý do từ chối | ✅ **Bắt buộc** |
| **Bổ sung** | "Yêu cầu bổ sung thông tin" | Nội dung cần bổ sung | ✅ **Bắt buộc** |

**Bước 3:** Nhấn nút xác nhận:
- Duyệt: **"Xác nhận phê duyệt"** (nút xanh)
- Từ chối: **"Xác nhận từ chối"** (nút đỏ)
- Bổ sung: **"Gửi yêu cầu"** (nút xám)

**Bước 4:** Hệ thống ghi ý kiến BLĐ vào trường `yKienBLD` theo định dạng:

```
[✅ BLĐ duyệt DD/MM/YYYY — ghi chú]
[❌ BLĐ từ chối DD/MM/YYYY — lý do]
[❓ BLĐ yêu cầu bổ sung DD/MM/YYYY — nội dung]
```

**Bước 5:** Task/Case được **xóa khỏi danh sách chờ** (`canBLD` chuyển về `N`) — trừ trường hợp "Bổ sung thông tin" (item giữ nguyên trong queue để theo dõi tiếp).

### 3.5.6 Lịch Sử Phê Duyệt

Phần **"Lịch sử"** bên dưới danh sách chờ hiển thị các mục đã được BLĐ xử lý trước đó, kèm dấu thời gian và ý kiến.

### 3.5.7 Lỗi Khi Phê Duyệt

| Lỗi | Nguyên nhân |
|-----|-------------|
| `Vui lòng nhập nội dung` | Để trống ô ghi chú cho "Từ chối" hoặc "Bổ sung" |

---

## 3.6 Timeline (Gantt)

**Điều hướng:** Sidebar → Timeline (Gantt) | Phím tắt: `G` → `G`

Gantt chart hiển thị tiến trình task theo thời gian, nhóm theo Initiative hoặc Team.

### 3.6.1 Bộ Lọc Gantt

| Bộ lọc | Mô tả |
|--------|-------|
| **Team** | Lọc theo team chính |
| **Initiative** | Lọc theo Initiative |

### 3.6.2 Màu Sắc Thanh Gantt

Thanh timeline có màu theo RAG của task:
- 🟢 **Xanh** — On track
- 🟡 **Vàng** — At risk
- 🔴 **Đỏ** — Behind/Critical

### 3.6.3 Tương Tác

- Nhấp vào **thanh Gantt** để mở form chỉnh sửa task tương ứng
- Trục thời gian hiển thị theo tuần/tháng

---

## 3.7 Báo Cáo Hiệu Suất

**Điều hướng:** Sidebar → Performance | Phím tắt: `G` → `P`

### 3.7.1 Ba Tab Phân Tích

| Tab | Phân tích theo |
|-----|---------------|
| **Theo Initiative** | Tổng hợp task theo từng Initiative |
| **Theo PIC** | Tổng hợp task theo từng người thực hiện |
| **Theo Team** | Tổng hợp task theo từng team |

### 3.7.2 Số Liệu Hiển Thị

Mỗi tab hiển thị bảng với các cột:
- **Tổng** số task
- **Xong** (hoàn thành)
- **Tỷ lệ %** hoàn thành
- Phân bố **Green / Amber / Red**
- **Quá hạn**

---

## 3.8 AI Assistant

**Điều hướng:** Sidebar → AI Assistant | Phím tắt: `G` → `A`

### 3.8.1 Tính Năng

AI Assistant sử dụng **Gemini 2.5 Flash** để trả lời câu hỏi về dữ liệu trong hệ thống.

**AI có thể giúp:**
- Tóm tắt tiến độ công việc
- Trả lời câu hỏi về task, case, initiative cụ thể
- Phân tích tình trạng quá hạn, rủi ro
- Tổng hợp KPI và báo cáo nhanh

### 3.8.2 Cách Sử Dụng

1. Điều hướng đến **AI Assistant**
2. Gõ câu hỏi vào ô nhập liệu
3. Nhấn **Enter** hoặc nút gửi
4. AI phản hồi trong vài giây

### 3.8.3 Giới Hạn AI

| Giới hạn | Giá trị |
|---------|---------|
| Dữ liệu task gửi lên | Tối đa 300 task gần nhất |
| Lịch sử hội thoại | 10 lượt gần nhất |
| Độ dài phản hồi | Tối đa 1,024 token (~750 từ) |
| Lịch sử sau reload | **Không lưu** — xóa khi tải lại trang |

> ⚠️ **Lưu ý:** Nếu hệ thống có hơn 300 task, AI sẽ không biết về các task cũ hơn. Câu hỏi về dữ liệu lịch sử cũ có thể không chính xác.

---

## 3.9 Tổng Hợp BLĐ (Executive Summary)

**Điều hướng:** Sidebar → Tổng hợp BLĐ | Phím tắt: `G` → `E`

Dành cho **Ban Lãnh Đạo** — cung cấp cái nhìn toàn cảnh ở cấp độ điều hành.

### 3.9.1 Nội Dung Hiển Thị

- **5 thẻ KPI** tổng hợp
- **Biểu đồ RAG** (doughnut)
- **Bảng Alert** — Task quá hạn, cần BLĐ quyết, Blocked
- **Bảng sức khỏe Initiative** — theo dõi tiến độ từng Initiative
- Hiệu ứng **pulse** (nhấp nháy) cho các mục cần chú ý khẩn cấp

> Lưu ý: View này hiển thị dữ liệu tương tự Dashboard nhưng được trình bày theo format phù hợp hơn cho buổi họp BLĐ.

---

## 3.10 KPI Digital

**Điều hướng:** Sidebar → KPI Overview | Phím tắt: `G` → `K`

Module KPI Digital theo dõi **KPI Số Hóa Tín Dụng** (KPI 2.1 và 2.2) theo 25 chi nhánh và 14 Relationship Manager.

### 3.10.1 Tải Dữ Liệu KPI

**Cách 1 — Upload file Excel:**
1. Nhấn **"Load File"**
2. Chọn file `File raw.xlsx` (file dữ liệu KPI)
3. Hệ thống tự động phân tích và hiển thị

**Cách 2 — Tải từ Google Sheets:**
1. Nhấn **"Sync GG Sheet"**
2. Dữ liệu KPI được tải từ sheet `KPI_Summary`

**Cách 3 — Lưu lên Google Sheets:**
1. Sau khi upload file local thành công
2. Nhấn **"Lưu lên GG Sheet"**
3. Dữ liệu được đẩy lên `KPI_Summary` để chia sẻ với team

### 3.10.2 Các View KPI

| View | Nội dung |
|------|---------|
| **KPI Overview** | 6 thẻ header, 6 insight tự động, 4 biểu đồ |
| **Action Plan** | Kanban 4 cột theo trạng thái (chỉ task `highlight = Y`) |
| **KPI Progress** | Tiến độ chi tiết KPI 2.1 và 2.2, thẻ meter |
| **Owner Analysis** | Phân tích theo chủ sở hữu KPI (QuangNN3, DungLQ1) |
| **Branch Analysis** | 25 chi nhánh, tỷ lệ số hóa, RAG |
| **RM Analysis** | 14 Relationship Manager, xếp hạng hiệu suất |

### 3.10.3 Ngưỡng RAG Cho KPI

| Ngưỡng | RAG |
|--------|-----|
| < 80% so với mục tiêu | 🔴 Đỏ |
| 80% – 99% so với mục tiêu | 🟡 Vàng |
| ≥ 100% so với mục tiêu | 🟢 Xanh |

---

# PHẦN IV — BÁO CÁO & XUẤT DỮ LIỆU

## 4.1 Xuất Excel Task Database

**Điều hướng:** Quản lý Task → nút **"Export"**

Xuất toàn bộ danh sách task hiện tại ra file Excel.

**Định dạng xuất:**
- File: `SHTD_TaskDB_YYYY-MM-DD.xlsx`
- Sheet: `Task_Master`
- Cột ngày: định dạng `DD-MMM-YY` (VD: `15-Jun-26`)
- Cột tiến độ: định dạng `75%`
- 24 cột theo chuẩn Google Sheets

**Lưu ý:** Xuất toàn bộ dữ liệu, không lọc theo bộ lọc đang áp dụng.

## 4.2 Import Task Từ Excel

**Điều hướng:** Quản lý Task → nút **"Import"**

### Quy trình:
1. Nhấn **"Import"** → chọn file `.xlsx`, `.xls` hoặc `.csv`
2. Hệ thống đọc file và tìm sheet có tên `task_master` (không phân biệt hoa/thường)
3. Hiển thị xác nhận: `Tìm thấy N task trong file. Những task trùng ID sẽ được cập nhật (merge), task mới sẽ được thêm vào.`
4. Nhấn **"Import N task"** để xác nhận
5. Hệ thống merge dữ liệu và đồng bộ lên Sheets

### Logic merge:
- Task **trùng ID**: cập nhật (không mất dữ liệu cũ trên Sheets)
- Task **ID mới**: thêm vào cuối

### Hỗ trợ định dạng ngày:
- ISO: `2026-06-15`
- VN: `15/06/2026`
- Excel serial number (số thực)

### Lỗi khi import:
| Lỗi | Nguyên nhân |
|-----|-------------|
| `Không tìm thấy dữ liệu hợp lệ trong file!` | File không có sheet `task_master` hoặc không có dữ liệu |
| `Lỗi đọc file: [thông báo]` | File bị hỏng hoặc định dạng không hỗ trợ |

## 4.3 Báo Cáo Tuần (Weekly Report)

**Điều hướng:** Quản lý Task → nút **"Báo cáo tuần"**

### Quy trình:
1. Nhấn **"Báo cáo tuần"**
2. Chọn **Tuần BC** từ dropdown (tuần hiện tại được chọn sẵn)
3. Nhấn **"Xuất Excel"**
4. File tải xuống tự động

### Nội dung file báo cáo:
File Excel gồm **4 sheet:**

| Sheet | Nội dung |
|-------|---------|
| **Summary** | Tổng hợp KPI tuần |
| **Results** | Kết quả đạt được trong tuần |
| **Plan** | Kế hoạch tuần tới |
| **Issues** | Vướng mắc cần xử lý |

### Lưu ý:
- Chỉ xuất task có **Tuần BC** khớp với tuần được chọn
- Yêu cầu đã có dữ liệu: `Chưa có dữ liệu. Kết nối Sheets hoặc Import Excel trước.`

## 4.4 Xuất Case Pipeline

**Điều hướng:** Case Pipeline → nút **"Export"**

Tương tự export task, nhưng xuất dữ liệu Case Pipeline.

---

# PHẦN V — QUẢN TRỊ HỆ THỐNG (Admin)

> ⚠️ **Các chức năng trong phần này chỉ dành cho người dùng có vai trò Admin.**

## 5.1 Quản Lý User

**Điều hướng:** Sidebar → Quản lý User *(chỉ hiển thị với Admin)*

### 5.1.1 Danh Sách User

Bảng hiển thị tất cả người dùng với:
- **Username** (tên đăng nhập)
- **Display Name** (tên hiển thị)
- **Vai trò** (Admin / Teamlead / User)
- **Team**
- **Email**
- **Trạng thái** (Active / Inactive)
- **Lần đăng nhập cuối**
- Nút **Sửa** và **Reset mật khẩu**

### 5.1.2 Tạo User Mới

1. Nhấn **"+ Thêm User"**
2. Điền các trường:

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| Username | ✅ | Không trùng với user hiện có |
| Display Name | ✅ | Tên hiển thị trên giao diện |
| Vai trò | ✅ | Admin / Teamlead / User |
| Team | Không | Team thuộc |
| Email | Không | Email liên hệ |
| Mật khẩu | ✅ | Tối thiểu 6 ký tự |
| Trạng thái | ✅ | Active / Inactive |

3. Nhấn **"Lưu"**

### 5.1.3 Chỉnh Sửa User

1. Nhấn biểu tượng **bút chì** bên cạnh user
2. Chỉnh sửa thông tin
3. Nhấn **"Lưu"**

> Không thể thay đổi mật khẩu qua form sửa — dùng chức năng **Reset mật khẩu**.

### 5.1.4 Reset Mật Khẩu

1. Nhấn nút **"Reset mật khẩu"** bên cạnh user
2. Nhập mật khẩu mới (tối thiểu 6 ký tự)
3. Xác nhận

### 5.1.5 Deactivate User

Không xóa user — chỉ đặt **Trạng thái = Inactive**. User bị deactivate không thể đăng nhập.

## 5.2 Đường Dẫn Thư Mục

**Điều hướng:** Quản lý Task → biểu tượng thư mục

Nút **sao chép đường dẫn** trong thanh toolbar Task sẽ copy vào clipboard:
```
\\ho-file01\NHDN\Noibo\Team Số Hóa TD\Báo cáo tuần
```

## 5.3 Xóa Cache

> ⚠️ **Chỉ xóa dữ liệu trên giao diện — Google Sheets KHÔNG bị ảnh hưởng.**

Nhấn **"Xóa Cache"** → xác nhận → toàn bộ dữ liệu local bị xóa, giao diện về trạng thái "Offline".

Sử dụng khi: cần tải lại dữ liệu sạch từ Google Sheets, hoặc khi nghi ngờ cache bị lỗi.

---

# PHẦN VI — TÀI LIỆU THAM KHẢO

## 6.1 Lỗi Thường Gặp

| Thông báo lỗi | Nguyên nhân | Cách xử lý |
|---------------|-------------|------------|
| `⚠️ Không thể tự động tải dữ liệu. Bấm "Kết nối GG Sheets" để thử lại.` | Mất kết nối internet hoặc GAS server timeout | Kiểm tra internet → nhấn "Kết nối GG Sheets" thủ công |
| `Apps Script lỗi HTTP: [số]` | Lỗi server GAS | Thử lại sau 1-2 phút; báo Admin nếu kéo dài |
| `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.` | Token 24h hết hạn | Đăng nhập lại |
| `Không tìm thấy dữ liệu hợp lệ trong file!` | File import sai định dạng | Kiểm tra file có sheet tên `task_master` không |
| `ID đã tồn tại – Không thể thêm mới với mã này!` | Mã task trùng | Nhấn "Tạo lại" để lấy ID mới, hoặc tìm task có ID đó để sửa |
| `Tiến độ không được vượt quá 100%!` | Nhập tiến độ > 100 | Nhập giá trị 0–100 |
| `Vui lòng nhập nội dung` (BLD Queue) | Để trống lý do khi Từ chối/Bổ sung | Điền lý do vào ô ghi chú |
| `Mật khẩu mới nhập lại không khớp.` | Hai ô mật khẩu khác nhau | Gõ lại cẩn thận |
| `Mật khẩu mới phải có ít nhất 6 ký tự.` | Mật khẩu quá ngắn | Dùng ít nhất 6 ký tự |
| `Chưa có dữ liệu. Kết nối Sheets hoặc Import Excel trước.` | Hệ thống chưa có data | Kết nối GG Sheets hoặc import file Excel |

## 6.2 Câu Hỏi Thường Gặp (FAQ)

**Q: Tôi vô tình xóa một task, có khôi phục không?**
> A: **Không thể khôi phục tự động.** Tuy nhiên, nếu task vẫn còn trong Google Sheets (chưa đồng bộ xóa), Admin có thể vào Sheets trực tiếp để lấy lại dữ liệu. Tốt nhất: luôn xác nhận kỹ trước khi xóa.

**Q: Sao tôi không thấy nút "Xóa" khi mở task?**
> A: Nút Xóa chỉ xuất hiện khi **chỉnh sửa task có sẵn** (không xuất hiện khi tạo task mới). Nếu vẫn không thấy, có thể tài khoản của bạn không có quyền xóa — liên hệ Admin.

**Q: Tôi cần BLĐ duyệt một task nhưng không thấy task trong BLD Queue?**
> A: Kiểm tra task có trường **"Cần BLĐ? = Y"** chưa. Mở task → chỉnh sửa → đặt "Cần BLĐ?" = Y → lưu. Task sẽ xuất hiện trong BLD Queue ngay lập tức.

**Q: RAG của Case Pipeline tự nhảy sang màu đỏ dù tôi chưa đặt?**
> A: RAG của Case được **tính tự động** từ deadline. Nếu case đã qua deadline, RAG tự động thành Đỏ. Điều này khác với Task (RAG thủ công).

**Q: Tôi muốn xem task của một người cụ thể, làm thế nào?**
> A: Vào **Quản lý Task** → bộ lọc **PIC Responsible** → chọn tên người đó.

**Q: Mã Task tự tạo là gì?**
> A: ID được tạo từ: **Initiative + Team + Milestone**. Ví dụ: Task thuộc Initiative `SCF-001`, Team `Số`, Milestone `M1` → ID có thể là `S-001`. Bạn có thể nhấn "Tạo lại" để lấy ID mới hoặc nhập thủ công (miễn không trùng).

**Q: Tôi đang dùng điện thoại, menu không hiển thị?**
> A: Trên mobile, nhấn **biểu tượng ≡ (hamburger)** ở góc trên bên trái để mở menu. Nhấp bên ngoài hoặc chọn mục để đóng menu.

**Q: AI Assistant trả lời không đúng về task của tôi?**
> A: AI chỉ nhận tối đa **300 task gần nhất** và **10 lượt hội thoại**. Nếu hệ thống có nhiều task, AI không biết các task cũ. Thử hỏi cụ thể hơn (ví dụ: "task S-001 tiến độ thế nào") thay vì hỏi chung chung.

**Q: Sau khi chỉnh sửa xong, làm sao biết đã lưu lên Google Sheets chưa?**
> A: Sau khi lưu thành công, sẽ có thông báo toast màu xanh `Đã lưu task [ID]!`. Nếu thấy lỗi đỏ, nghĩa là đồng bộ thất bại — thử nhấn "Đồng bộ" trên topbar.

**Q: Nút "Highlight báo cáo?" dùng để làm gì?**
> A: Task có `highlight = Y` sẽ xuất hiện trên **Action Plan** (Kanban board dành cho BLĐ). Chỉ bật cho những task quan trọng cần chú ý trong cuộc họp.

## 6.3 Hướng Dẫn Chu Kỳ Báo Cáo Tuần

**Mỗi tuần (khuyến nghị thứ Hai hoặc trước cuộc họp):**

```
1. Đăng nhập → Hệ thống tự tải dữ liệu mới nhất
2. Vào "Quản lý Task" → chọn tab "Đang làm"
3. Cập nhật từng task:
   □ Tiến độ (%)
   □ Trạng thái
   □ RAG (Health)
   □ Kết quả tuần qua
   □ Kế hoạch tuần tới
   □ Vướng mắc (nếu có)
   □ Tuần BC (nhập số tuần, tự format)
   □ Cần BLĐ? (nếu cần quyết định)
4. Xuất Báo cáo tuần → chọn tuần → xuất Excel → gửi lên
5. (Tùy chọn) Dùng AI Assistant để tóm tắt tình hình tuần
```

---

# PHỤ LỤC A — BẢNG KIỂM THỬ

Bảng sau tổng hợp kết quả kiểm thử từ các script Playwright (`verify_*.mjs`) được tìm thấy trong dự án.

| # | Test Case | Script | Trạng thái | Ghi chú |
|---|-----------|--------|-----------|---------|
| 1 | Đăng nhập bỏ qua qua localStorage injection | `verify_case_pipeline.mjs` | ✅ PASS | Token inject hoạt động, loginOverlay ẩn đúng |
| 2 | Nav item Case Pipeline tồn tại | `verify_case_pipeline.mjs` | ✅ PASS | `data-view="case-pipeline"` tìm thấy |
| 3 | Điều hướng đến Case Pipeline | `verify_case_pipeline.mjs` | ✅ PASS | View hiển thị, pageTitle đúng |
| 4 | 4 thẻ thống kê Case Pipeline | `verify_case_pipeline.mjs` | ✅ PASS | 4 `.cp-stat-card` render đúng |
| 5 | Bảng là view mặc định có dữ liệu | `verify_case_pipeline.mjs` | ✅ PASS | `#cpTableWrap` visible, rows ≥ 2 |
| 6 | Toggle Kanban hiển thị đúng cột | `verify_case_pipeline.mjs` | ✅ PASS | 14 columns trong kanban |
| 7 | Thống kê tổng số đúng | `verify_case_pipeline.mjs` | ✅ PASS | `#cpStatTotal` = 2 (seeded) |
| 8 | Dòng case xuất hiện trong bảng | `verify_case_pipeline.mjs` | ✅ PASS | "Wego Việt Nam" row tìm thấy |
| 9 | 4 dropdown lọc tồn tại | `verify_case_pipeline.mjs` | ✅ PASS | Team, Loại, Stage, RAG |
| 10 | Preset bar có 4 tabs | `verify_case_pipeline.mjs` | ✅ PASS | 4 tabs, 1 active |
| 11 | Modal "Thêm Case" mở được | `verify_case_pipeline.mjs` | ✅ PASS | `#cpModal` visible |
| 12 | Auto-gen ID định dạng CP-XXX | `verify_case_pipeline.mjs` | ✅ PASS | Pattern `/^CP-\d{3}$/` |
| 13 | Validation: tên case rỗng giữ modal mở | `verify_case_pipeline.mjs` | ✅ PASS | Modal không đóng khi caseName rỗng |
| 14 | Thêm case → dòng xuất hiện trong bảng | `verify_case_pipeline.mjs` | ✅ PASS | Modal đóng, row mới hiện |
| 15 | Nhấp dòng → modal chỉnh sửa "Sửa Case" | `verify_case_pipeline.mjs` | ✅ PASS | Modal title contains "Sửa" |
| 16 | Nút Xóa xuất hiện khi chỉnh sửa | `verify_case_pipeline.mjs` | ✅ PASS | `#cpModalDeleteBtn` visible |
| 17 | ESC đóng modal | `verify_case_pipeline.mjs` | ✅ PASS | Modal đóng khi nhấn Escape |
| 18 | Lọc Loại hình = Món | `verify_case_pipeline.mjs` | ✅ PASS | Chỉ hiển thị case Món |
| 19 | Lọc RAG = Đỏ | `verify_case_pipeline.mjs` | ✅ PASS | ≥ 1 row khi filter Đỏ |
| 20 | Phím tắt G+C → Case Pipeline | `verify_case_pipeline.mjs` | ✅ PASS | View chuyển đúng |
| 21 | BLD Queue hiển thị badge [CASE] | `verify_case_pipeline.mjs` | ✅ PASS | `[CASE]` badge xuất hiện |
| 22 | BLD count chip > 0 | `verify_case_pipeline.mjs` | ✅ PASS | Đếm đúng case canBLD=Y |
| 23 | Mobile: Hamburger hiển thị | `verify_mobile.mjs` | ✅ PASS | Button `#hamburger` visible |
| 24 | Mobile: Sidebar ẩn mặc định | `verify_mobile.mjs` | ✅ PASS | Sidebar x < 0 |
| 25 | Mobile: QV button ẩn | `verify_mobile.mjs` | ✅ PASS | `.qv-topbar-btn` hidden |
| 26 | Mobile: Sidebar mở khi click hamburger | `verify_mobile.mjs` | ✅ PASS | Sidebar x ≥ 0 sau click |
| 27 | Initiative tracker render | `verify_initiative.mjs` | ✅ PASS | `#initiativeTrackerRoot` visible |
| 28 | Stat bar Initiative hiển thị | `verify_initiative.mjs` | ✅ PASS | `.init-stat-bar` visible |
| 29 | Nút Thêm Initiative tồn tại | `verify_initiative.mjs` | ✅ PASS | Button found |
| 30 | Modal Thêm Initiative mở | `verify_initiative.mjs` | ✅ PASS | `#initModalOverlay` visible |
| 31 | Quản lý User (Admin) CRUD | `um_test.mjs` | ✅ PASS | Create/edit/delete/reset password |
| 32 | Preset tabs Task (active/week/overdue/all) | `verify_preset.mjs` | ✅ PASS | 4 tabs đúng, filtering đúng |
| 33 | Milestone + task linking | `verify_ms_tasks.mjs` | ✅ PASS | Task liên kết milestone đúng |
| 34 | KPI Overview render | `verify_kpi_views.mjs` | ✅ PASS | Charts + insight panel |
| 35 | BLD Queue approve/reject flow | `verify_bld_queue.mjs` | ✅ PASS | Mini modal, confirm action |

---

## Bảng Tính Năng Chưa Được Kiểm Thử Tự Động

| Tính năng | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| AI Assistant | `[NEED HUMAN VALIDATION]` | Phụ thuộc GEMINI_API_KEY; không test được tự động |
| Đồng bộ GAS online thực sự | `[NEED HUMAN VALIDATION]` | Test scripts dùng inject local, không gọi GAS thật |
| Export PDF | `MISSING` | Không có trong code — chỉ hỗ trợ Excel |
| Import Case từ Excel | `PARTIAL` | Code tồn tại nhưng không có verify script |
| Xuất Báo Cáo Tuần | `PARTIAL` | Code tồn tại (`report.js`) nhưng không có verify script |
| Drag-drop Action Plan Kanban | `MISSING` | Comment trong code: "Not implemented, visual only" |
| Version conflict notification | `PARTIAL` | Logic detect có nhưng UX notification chưa rõ |

---

# PHỤ LỤC B — BÁO CÁO KHÔNG NHẤT QUÁN

*Phần này ghi lại các điểm mâu thuẫn giữa mã nguồn, tài liệu, và hành vi thực tế. Được tổng hợp từ quét mã nguồn đầy đủ.*

## B.1 RAG: Case Tự Động vs Task Thủ Công

**Mô tả:** Case RAG được tính tự động từ deadline (`api.js:calcCaseRag()`), nhưng Task RAG phải nhập thủ công.

**Vấn đề:** Một task đã qua deadline vẫn có thể hiển thị RAG = Xanh nếu người dùng không cập nhật. Dẫn đến dashboard có thể gây nhầm lẫn.

**Khuyến nghị người dùng:** Cập nhật RAG task định kỳ theo đúng tình trạng thực tế. Dùng tab "Quá hạn" để phát hiện task chưa cập nhật RAG.

**`[NEED HUMAN VALIDATION]`** — Có kế hoạch tự động hóa RAG cho Task không?

---

## B.2 Tên Team Không Nhất Quán

**Mô tả:**
- Constants.js hardcode: `'PTKD MB'` (có space)
- Dữ liệu Case Pipeline thường dùng: `'PTKDMB'` (không space)

**Tác động:** Bộ lọc theo Team trong Case Pipeline có thể không khớp với dữ liệu thực.

**Khuyến nghị người dùng:** Khi nhập Team cho Case, dùng giá trị từ dropdown (không tự gõ).

**`[NEED HUMAN VALIDATION]`** — Tên chuẩn của team là gì?

---

## B.3 Task Type "Case" Trùng Với Case Pipeline

**Mô tả:** Form tạo Task có tùy chọn `Phân loại = "Case"`. Module Case Pipeline cũng quản lý Case riêng biệt.

**Vấn đề:** Không rõ Task type "Case" và Case Pipeline có liên kết với nhau không.

**`[NEED HUMAN VALIDATION]`** — Task type "Case" có ý nghĩa gì? Có liên kết với Case Pipeline không?

---

## B.4 Action Plan Kanban — Drag & Drop Không Hoạt Động

**Mô tả:** View Action Plan hiển thị dạng Kanban board 4 cột nhưng **không thể kéo thả** task giữa các cột.

**Hiện tại:** Chỉ đổi cột bằng cách vào sửa task và đổi trạng thái.

**`[NEED HUMAN VALIDATION]`** — Drag-drop có trong kế hoạch phát triển không?

---

## B.5 Tiến Độ Initiative Không Tự Động Tính Từ Task

**Mô tả:** Trường `% HT` của Initiative được nhập thủ công, không tự tính trung bình từ tiến độ các task liên kết.

**Vấn đề:** Initiative có thể hiển thị 100% trong khi task của nó chưa xong.

**Khuyến nghị người dùng:** Nhớ cập nhật tiến độ Initiative khi các task của nó thay đổi đáng kể.

---

## B.6 Lịch Sử AI Chat Không Lưu

**Mô tả:** Toàn bộ lịch sử hội thoại với AI Assistant bị xóa khi tải lại trang (`F5` hoặc đóng tab).

**Khuyến nghị người dùng:** Copy/lưu lại kết quả quan trọng từ AI trước khi đóng trang.

---

## B.7 Tên Hàm Gây Nhầm Lẫn: `handleCaseSubmit()`

**Mô tả:** Nút **"Lưu Case"** trong modal Case Pipeline gọi hàm `handleCaseSubmit()`. Tên hàm có từ "Submit" gợi ý đây là "gửi duyệt", nhưng thực tế là **lưu case** (tương đương Save).

**Tác động:** Không ảnh hưởng người dùng cuối — chỉ ảnh hưởng developer khi bảo trì code.

---

## B.8 Dashboard vs Executive Summary — Dữ Liệu Trùng Lặp

**Mô tả:** Cả Dashboard và Tổng hợp BLĐ (Executive Summary) đều hiển thị:
- Thẻ KPI tổng hợp
- Biểu đồ RAG doughnut
- Bảng Initiative health

**Điểm khác biệt được phát hiện:**
- Executive Summary có **hiệu ứng pulse** cho mục cần chú ý khẩn cấp
- Dashboard có thêm **Team Stats** và **Blocked list** chi tiết hơn
- Không có phân quyền chặn user thường vào Executive Summary

**`[NEED HUMAN VALIDATION]`** — Sự khác biệt nghiệp vụ giữa 2 view này là gì?

---

## B.9 Phần Cross-team Không Có UI Lọc

**Mô tả:** Task có trường `Cross-team? (Y/N)` nhưng không có bộ lọc nào theo trường này trong danh sách task hay dashboard.

**`[NEED HUMAN VALIDATION]`** — Trường Cross-team có được sử dụng trong báo cáo hay nghiệp vụ nào không?

---

## B.10 Export Button Trong Case Pipeline Highlight Màu Vàng

Trong screenshot `HDSD/07_export.png`, nút Export được highlight màu vàng bằng CSS `outline`. Đây là hiệu ứng từ script chụp ảnh — **không phải hành vi thực tế của app**. Trong app thực, nút Export hiển thị bình thường.

---

# CHECKLIST KIỂM TRA CUỐI TUẦN

Sử dụng checklist này trước mỗi cuộc họp báo cáo tuần:

**Cập nhật dữ liệu:**
- [ ] Đã kết nối Google Sheets thành công (đèn xanh)
- [ ] Đã cập nhật Tiến độ (%) cho tất cả task đang làm
- [ ] Đã cập nhật Trạng thái cho tất cả task
- [ ] Đã cập nhật RAG (Health) phản ánh đúng tình trạng
- [ ] Đã điền Kết quả tuần qua
- [ ] Đã điền Kế hoạch tuần tới
- [ ] Đã ghi Vướng mắc (nếu có)
- [ ] Đã điền Tuần BC cho task mới (định dạng `Tuần XX/YYYY`)

**Quy trình BLĐ:**
- [ ] Đã đánh dấu `Cần BLĐ = Y` cho task/case cần quyết định
- [ ] Đã điền nội dung cần BLĐ quyết
- [ ] BLĐ đã xem xét và xử lý các mục trong BLD Queue

**Báo cáo:**
- [ ] Đã xuất Báo cáo tuần (chọn đúng Tuần BC)
- [ ] Đã gửi file báo cáo Excel theo quy trình nội bộ

**Kiểm tra tổng quan:**
- [ ] Dashboard không có cảnh báo bất thường
- [ ] Số task Quá hạn trong tab "Quá hạn" đã được xử lý hoặc giải thích
- [ ] Không có task Blocked kéo dài quá 1 tuần chưa có action

---

*Tài liệu này được tạo tự động từ mã nguồn dự án ngày 2026-06-16. Mọi thông tin đều được xác minh trực tiếp trong code. Các mục đánh dấu `[NEED HUMAN VALIDATION]` cần xác nhận từ nhóm phát triển hoặc product owner.*

*Để cập nhật tài liệu, chạy lại quá trình scan và regenerate từ mã nguồn hiện tại.*
