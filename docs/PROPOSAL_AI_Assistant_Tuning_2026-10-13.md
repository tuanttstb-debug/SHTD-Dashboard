# ĐỀ XUẤT — Tuning AI Assistant (Trợ lý thông minh) · 2026-10-13

> Trạng thái: **ĐÃ DUYỆT 13/10 → ĐÃ CODE (S93, v6.68)** — anh chọn: giữ gói **free**, ưu tiên **phản hồi nhanh + tiết kiệm token**, chất lượng xét sau → làm A1–A6 với Flash-Lite làm model chính; B2 (billing) KHÔNG làm. Tiền nhiệm: S59, S84.

## 1. Đo trên LIVE (13/10, TuanTT4, v6.67)

| Nguồn | Kết quả |
|---|---|
| Câu "Có bao nhiêu task quá hạn?" (gọi `gasPost` ai-chat như UI) | **168,8 s** tổng · Gemini **148,3 s** · phần GAS còn lại ~20 s (đọc sheet + dựng context) → đúng 111 task |
| Lần gọi song song trước đó | 503 sau 14 s → retry → OK **112,7 s** |
| `AI_Log` 07/09–09/09 | OK 5,8 – 22,8 s (bình thường) |
| `AI_Log` 12/10 | 18 dòng: **0 thành công** · 503 "high demand" + **429 "Quota exceeded"** dồn dập · 1 lần treo **216 s** |
| Kích thước dữ liệu gửi mỗi câu | ~1.665 task (chỉ mục đủ + 200 task chi tiết 24 cột) + 436 initiative + KPI ≈ **650 nghìn ký tự ≈ 200 nghìn token** |
| FE | timeout `GAS_AI_TIMEOUT_MS` = **120 s** → mọi câu > 120 s user thấy "lỗi mạng" dù server vẫn chạy và vẫn tiêu quota |

## 2. Chẩn đoán gốc (xếp theo mức ảnh hưởng)

1. **Model sau alias `gemini-flash-latest` đã đổi** (Google trỏ alias sang Flash thế hệ mới có *thinking* mặc định) — cùng payload, latency từ ~10–20 s (T9) → 110–150 s (T10). Code không cấu hình `thinkingLevel` nên model "suy nghĩ" trên 200K token cho cả câu đếm đơn giản.
2. **Payload quá lớn (~200K token/câu) ≈ trần gói miễn phí** (Flash free ~250K token/phút, ~10 RPM). 1 câu ăn gần hết quota phút → câu thứ 2 (người khác, hoặc retry) dính **429**. Retry 429 sau 1–4 s là vô ích (quota tính theo phút) mà còn đốt thêm.
3. **Không có model dự phòng thật**: `AI_MODEL_CHAIN` chưa từng được bơm (`refreshAiModelChain()` chưa chạy) → chain chỉ có 1 alias; 503 = chờ + retry cùng model.
4. **Cache context không ăn**: context ~650K ký tự nén vẫn > trần CacheService (100KB) → mỗi câu đọc lại 3 sheet + dựng lại (~10–20 s).
5. **FE timeout 120 s < thời gian xử lý** → user thấy lỗi, bấm Thử lại → nhân đôi tải.
6. ⚠ **Data-boundary**: gói miễn phí Gemini API cho phép Google dùng dữ liệu cải thiện sản phẩm; gói trả phí thì không. Hiện đang gửi toàn bộ task/initiative nội bộ ngân hàng qua gói miễn phí.

## 3. Giải pháp (tham khảo thực hành hiện hành)

| # | Giải pháp | Tác động kỳ vọng | Công | Rủi ro |
|---|---|---|---|---|
| A1 | Đặt `thinkingConfig.thinkingLevel = "low"` (chat tra cứu không cần suy luận sâu) + ghi `modelVersion` thực tế vào `AI_Log` | latency ÷ 3–5 | 0,5 h | thấp |
| A2 | Chuỗi model cố định có dự phòng **Flash → Flash-Lite** (bơm `AI_MODEL_CHAIN` qua `refreshAiModelChain`), **429 quota → không retry cùng model, nhảy model kế** | hết chuỗi 429 dồn | 1 h | thấp |
| A3 | **Trả lời tất định không qua LLM** cho nhóm câu đếm/thống kê (quá hạn, sắp hạn, theo PIC/trạng thái/team) — server đã tính sẵn | các câu này < 5 s, 0 token | 2–3 h | trung bình (nhận diện câu hỏi) |
| A4 | **Thu gọn context theo câu hỏi** (lọc trước ở server): mặc định chỉ task *chưa hoàn thành* + task liên quan từ khóa/PIC/team/ID trong câu; bỏ khối 200 task × 24 cột, chỉ lấy cột free-text cho task khớp; initiative dạng gọn | 200K → **20–40K token** → nhanh ×4–6, hết 429 | 0,5–1 ngày | trung bình (câu hỏi "toàn bộ lịch sử" cần nhánh riêng) |
| A5 | Cache context theo phần (task / initiative / KPI tách khóa, chunk) để vượt trần 100KB | −10–15 s/câu | 2 h | thấp |
| A6 | FE: hiện đồng hồ "đang xử lý… Ns", timeout 150 s, khóa Thử lại khi request cũ còn chạy | trải nghiệm, bớt tải kép | 1 h | thấp |
| B1 | **Function calling** (LLM gọi công cụ `query_tasks(filter)` thay vì nhận cả DB) — chuẩn agent hiện nay | payload nhỏ nhất, chính xác nhất | 2–3 ngày | cao hơn (2 vòng gọi, đổi kiến trúc) |
| B2 | Bật **billing (Tier 1)** cho project Gemini | ít 503 hơn, quota lớn, dữ liệu không dùng huấn luyện | anh quyết | chi phí: sau A4 ≈ 30K token/câu → cỡ vài trăm đồng/câu |
| B3 | Chuyển sang AI nội bộ TPB khi có (như BeneMatch) | đúng data-boundary | — | phụ thuộc IT |

Loại trừ: streaming (GAS Web App không stream được) · OpenRouter/bên thứ 3 (data-boundary).

## 4. Khuyến nghị

**Làm Đợt 1 = A1 + A2 + A3 + A4 + A5 + A6** (≈ 1,5 ngày công em), mục tiêu:
- câu đếm/thống kê **< 5 s**; câu tra cứu/tổng hợp **p50 < 20 s, p95 < 45 s**; 0 lỗi 429 khi 3 người hỏi cùng lúc.
- Nghiệm thu: bộ 10 câu chuẩn chạy trên LIVE trước/sau, ghi bảng so sánh vào `AI_Log` + file này.

**B2 (billing)**: em khuyến nghị bật, chủ yếu vì data-boundary (dữ liệu nội bộ đang qua gói miễn phí) — anh quyết. B1 để Đợt 2 nếu A4 chưa đạt mục tiêu.

## 5. Việc cần anh làm sau khi code xong
1. Redeploy GAS (AiService.gs + Code.gs) · 2. Chạy `refreshAiModelChain()` 1 lần trong editor · 3. hard-refresh.

## 6. Kết quả Đợt 1 (S93)
| Hạng mục | Trước | Sau (test local, dữ liệu giả lập 1.665 task) |
|---|---|---|
| Câu đếm/liệt kê theo quá hạn · sắp hạn · team · trạng thái · PIC | qua Gemini, ~650K ký tự | **trả tất định, 0 token, 0 lần gọi Gemini** |
| Câu mở (không lọc) | ~650K ký tự | **22,9K** ký tự (120 task mở, quá hạn/gần hạn trước) |
| Câu nhắc ID task | ~650K ký tự | **1,2K** ký tự |
| Câu về initiative | ~650K ký tự | **31K** ký tự |
| Model | `gemini-flash-latest`, thinking mặc định | `gemini-flash-lite-latest` → dự phòng Flash, thinking low |
| 429 quota | retry cùng model 1–4 s | nhảy model kế ngay |
| Đo LIVE sau redeploy | 168,8 s | _chờ anh redeploy GAS_ |
