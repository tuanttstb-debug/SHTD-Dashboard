# PROJECT OVERVIEW — SHTD Dashboard

## Executive Summary

**SHTD Dashboard** ("Số Hóa Tín Dụng" — Credit Digitalization Dashboard) is an internal web application used by the Corporate Customer Block (Khối KHDN) of a Vietnamese bank. It provides real-time task tracking, weekly reporting, and executive-level visibility into the team's initiatives.

The application is a **single-file monolithic SPA** (Single Page Application) currently at patch version **v6.2**.

---

## Business Context

| Item | Value |
|---|---|
| Organization | Khối Khách Hàng Doanh Nghiệp (KHDN) |
| Initiative | Số Hóa Tín Dụng (Credit Digitalization) |
| Users | Team leads, PICs, Managers, Board-level reviewers |
| Data source | Google Sheets (Task_Master sheet, 23 columns) |
| Language | Vietnamese (vi-VN) |

---

## User Groups

| Role | Primary Use |
|---|---|
| Quản trị viên (Admin) | Full CRUD, sync, export |
| Team Lead (PIC Accountable) | Monitor team tasks, update status |
| Member (PIC Responsible) | Update progress, report weekly |
| Manager / BLĐ | Read-only dashboard view, approve decisions |

---

## Primary Workflows

1. **Weekly Reporting Cycle** — Every week, users update task progress, status (RAG), weekly results, next-week plan, and issues
2. **Task Management** — Create / Edit / Delete tasks with full 23-field form
3. **Dashboard Review** — Monitor KPIs, RAG health, by-initiative and by-team summaries
4. **Export** — Export to Excel for external reporting
5. **Sync** — Two-way sync with Google Sheets as source of truth

---

## Current Capabilities

| Feature | Status |
|---|---|
| Dashboard with KPI cards | ✅ Live |
| RAG doughnut chart | ✅ Live |
| Task list with 7-way filtering | ✅ Live |
| Multi-column sort | ✅ Live |
| Pagination (20/page) | ✅ Live |
| Bulk actions (RAG, state, delete) | ✅ Live |
| Task CRUD modal | ✅ Live |
| Gantt / Timeline view | ✅ Live |
| Performance tab (by initiative / PIC / team) | ✅ Live |
| Quick View side panel | ✅ Live |
| Google Sheets sync (read + write) | ✅ Live |
| Excel import / export | ✅ Live |
| Dark mode | ✅ Live |
| Responsive / mobile layout | ✅ Partial |
| Keyboard shortcuts | ✅ Live |
| Duplicate ID protection (local + server) | ✅ v6.2 |
| Multi-user safe sync (Read-Then-Patch) | ✅ v6.1 |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5 + CSS3 + ES2020 JS (monolith) |
| Charts | Chart.js (CDN) |
| Excel | SheetJS / xlsx (CDN) |
| Icons | Font Awesome 6.4.0 (CDN) |
| Fonts | DM Sans + DM Mono (Google Fonts) |
| Backend | Google Apps Script Web App (external) |
| Database | Google Sheets (Task_Master sheet) |
| Persistence | localStorage (`shtd_v2`) |

---

## Key Configuration

```js
GS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbz.../exec'
GS_SHEET_ID   = '1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk'
GS_RANGE      = 'Task_Master!A1:W'
```

---

## Critical Notes

> ⚠️ **GAS.GS is a PATCH FILE, not a server-side Apps Script.**
> It contains JS functions intended to be manually merged into Main.html.
> The actual Google Apps Script backend is deployed separately and not present in this repo.

> ⚠️ **AI_CONTEXT files (DESIGN_SYSTEM.md, SYSTEM_ARCHITECTURE.md, etc.) describe a DIFFERENT project** (TPBank BIZ multi-file architecture). They are reference/inspiration documents, NOT the current system architecture.
