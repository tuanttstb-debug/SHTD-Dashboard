# OPEN QUESTIONS — SHTD Dashboard

## Status
**Vòng phỏng vấn 1 hoàn thành — 2026-06-03**
Tất cả câu hỏi quan trọng đã được trả lời. Các mục còn lại là low-priority hoặc sẽ tự rõ khi implement.

---

## ✅ Đã có câu trả lời

| ID | Câu hỏi | Trả lời |
|---|---|---|
| OQ-001 | GAS backend ở đâu? | Trên Apps Script Editor — cần export vào `/backend/` |
| OQ-002 | FIX 4+5 đã merge chưa? | **CHƯA** — cần apply ngay (date dd-mmm-yy, progress "75%") |
| OQ-003 | Debug buttons có dùng không? | Xóa luôn — không cần nữa |
| OQ-004 | Merge guide HTML có intentional? | Xóa luôn |
| OQ-005 | Deployment model là gì? | **GitHub Pages** / static hosting |
| OQ-006 | Một Sheet chung cho tất cả user? | Có — multi-user sync là bắt buộc |
| OQ-007 | Export date format mong muốn? | **dd-mmm-yy** ('22-Apr-26') — cần fix |
| OQ-008 | Target browser? | Desktop + Mobile, 5-20 người dùng |
| OQ-009 | Team names có stable không? | **Ổn định** — hardcode chấp nhận được |
| OQ-010 | Quick View có được dùng không? | **Dùng thường xuyên** — keep và cải thiện |
| OQ-011 | Refactor theo hướng nào? | **Tách file**: index.html + assets/css/ + assets/js/ |
| OQ-012 | Data volume hiện tại? | **200–500 task** — render optimization quan trọng |
| OQ-013 | Vấn đề hiện tại? | Performance + Mobile layout + Sync GSheets |
| OQ-014 | Feature tiếp theo? | **Tóm tắt báo cáo tuần tự động** |
| OQ-015 | PIC list có hay thay không? | Chỉ PIC hay thay, team ổn định |

---

## ⏳ Còn mở (low priority)

| ID | Câu hỏi | Khi nào cần |
|---|---|---|
| OQ-016 | Có dev Sheet riêng với prod Sheet không? | Khi setup CI/CD |
| OQ-017 | Có cần audit log (ai sửa gì, lúc nào)? | Khi implement role-based |
| OQ-018 | Format báo cáo tuần tự động muốn là Word, PDF hay email? | Khi implement feature |
