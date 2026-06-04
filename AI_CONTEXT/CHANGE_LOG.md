# CHANGE LOG — SHTD Dashboard

---

## [v6.2-merged] 2026-06-03 — Phase A1 + A3 Applied to Main.html

**Changed by**: AI Implementation Session

### A1 — Fix Orphaned HTML in `<style>` Block
- **Removed** từ CSS block (lines 154–178): debug buttons `loadDemoData`, `clearDemoData`, duplicate dark toggle, merge guide instructions — tất cả các phần tử này không bao giờ hiện ra trên giao diện (bị kẹt trong CSS)
- **Added** `<button class="qv-topbar-btn">` vào đúng vị trí trong `.topbar-right` của body (line 1108) — Quick View button giờ thực sự hiện ra trên topbar
- `#qvDot` (badge dot) giờ được đặt đúng vị trí → JS reference tại line 3633 hoạt động

### A3 — Apply GAS.GS v6.2 Patches
- **Added** `const _MMM` (line 2230) — mảng tháng viết tắt tiếng Anh
- **Added** `function fmtDateExport(d)` (line 2233) — chuyển date sang "dd-mmm-yy" cho export
- **Replaced** `taskToRow()` → v6.2: dates dùng `fmtDateExport()` ("22-Apr-26"), progress xuất "75%" thay vì 75
- **Replaced** `checkDupId()` → v6.2: phân biệt ADD vs EDIT, hiển thị đúng message với icon
- **Bonus**: Thêm `_mmmIdx` + parse "dd-mmm-yy" vào `_parseArrayIntoDb` → round-trip an toàn khi đọc lại từ Sheet

### Files Changed
- `Main.html`: 4076 → 4109 lines (+33)
- `AI_CONTEXT/TODO.md`: updated task status
- `AI_CONTEXT/CHANGE_LOG.md`: this entry

### Verified
- `loadDemoData`, `clearDemoData`: 0 occurrences (removed)
- `fmtDateExport`, `_MMM`, `_mmmIdx`: present at correct lines
- `qv-topbar-btn` in body at line 1108: confirmed
- `qvDot` JS update at line 3633: will now work correctly

---

## [AI-Context v2] 2026-06-03 — Product Owner Interview Round 1

**Updated by**: AI Discovery Session

### Answers Confirmed
- Deployment: **GitHub Pages** (static hosting) → multi-file structure fully supported
- GAS backend: Exists on Apps Script Editor → needs export to `/backend/`
- Priority order: **Bug fix → Refactor → Feature**
- Users: **5–20 người, desktop + mobile** → mobile UX cần cải thiện
- Export format: **dd-mmm-yy** confirmed → FIX 4+5 phải apply
- Performance issues: **200–500 task** → render optimization cần thiết
- Debug buttons: **Xóa luôn** → cleanup Phase A1
- Quick View: **Dùng thường xuyên** → keep và improve
- Refactor approach: **Tách file** → multi-file (index.html + assets/)
- Next feature: **Tóm tắt báo cáo tuần tự động**

### Files Updated
- `OPEN_QUESTION.md` — đánh dấu 15 câu hỏi đã có câu trả lời
- `TODO.md` — cập nhật priorities dựa trên PO answers

---

## [AI-Context v1] 2026-06-03 — Phase 0–4 Discovery & Documentation

**Created by**: AI Discovery Session

### Files Created
- `PROJECT_OVERVIEW.md`, `BUSINESS_FLOW.md`, `SYSTEM_ARCHITECTURE_CURRENT.md`
- `SOURCE_CODE_INVENTORY.md`, `UI_AUDIT.md`, `TECH_DEBT.md`
- `REFACTORING_PLAN.md`, `IMPACT_ANALYSIS.md`, `GITHUB_WORKFLOW.md`
- `ASSUMPTION_LOG.md`, `OPEN_QUESTION.md`, `WORKING_RULE.md`
- `TODO.md`, `CHANGE_LOG.md`

### Key Findings
1. 4076-line monolith — CSS + HTML + JS in single file
2. `GAS.GS` là patch file, không phải GAS backend
3. FIX 4+5 (taskToRow v6.2) CHƯA được merge vào Main.html
4. Lines 154–178 là orphaned HTML bên trong `<style>` block — không bao giờ render
5. Existing AI_CONTEXT files mô tả project khác (TPBank BIZ)

### No Code Changes
Discovery phase only.

---

## [v6.2] (date unknown) — Patch Created (chưa fully merged)

- FIX 3: `handleSubmit()` → Block duplicate ID — ✅ đã merge
- FIX 4: `taskToRow()` date dd-mmm-yy — ❌ CHƯA merge vào Main.html
- FIX 5: `taskToRow()` progress "75%" — ❌ CHƯA merge vào Main.html
- `checkDupId()` v6.2 — ❌ CHƯA merge vào Main.html

## [v6.1] (date unknown) — Patch Merged

- FIX 1: `syncAction()` Read-Then-Patch — ✅ đã merge
- FIX 2: FAB position 80px — ✅ đã merge

## [v6.0] (date unknown) — Quick View Panel Added

## [v5.x and earlier] — Historical
Core dashboard, task list, Gantt, Performance, GSheets sync, Excel import/export
