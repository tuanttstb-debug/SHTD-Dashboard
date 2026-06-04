# BUSINESS FLOW — SHTD Dashboard

## Weekly Reporting Cycle (Core Business Flow)

```
MONDAY (or weekly trigger)
│
├── 1. USER OPENS DASHBOARD
│       → Auto-loads from Google Sheets (auto-connect on startup)
│       → localStorage cache shown immediately (no white screen)
│
├── 2. USER REVIEWS DASHBOARD
│       → KPI cards: Total / Done / In Progress / Overdue
│       → Overdue banner appears if any task past deadline
│       → RAG doughnut chart: Green / Amber / Red
│       → Initiative summary table: totals + avg progress
│       → Team stat list: task distribution
│       → Blocked/BLD list: items needing attention
│
├── 3. USER NAVIGATES TO TASK LIST (G+T)
│       → Views all tasks with current status
│       → Filters by: ID, Initiative, Team, PIC, State, RAG, Tuần BC
│       → Sorts by: any column
│
├── 4. USER UPDATES TASKS (weekly cycle)
│       → Clicks row to open Edit modal
│       → Updates: Progress %, State, RAG, Result, NextPlan, Issues
│       → Sets Tuần BC (e.g. "Tuần 16/2026")
│       → Saves → triggers syncAction (Read-Then-Patch)
│
├── 5. SYNC FLOW (syncAction v6.1)
│       a) Apply local change
│       b) Read current Sheet data
│       c) Merge: local changes + server data (preserves concurrent edits)
│       d) Write merged result to Sheet
│       e) Update localStorage cache
│
├── 6. EXPORT WEEKLY REPORT
│       → Export Excel → Send to management
│       → Columns: 23 fields including dd-mmm-yy dates, "75%" format
│
└── 7. BOARD / BLĐ REVIEW
        → Quick View panel (Q key): Issues tab shows Blocked + BLD items
        → Detail modal: drill-down by clicking KPI cards or chart
```

---

## User Journey — Adding a New Task

```
User clicks "+ Thêm Task" (or Ctrl+N)
│
├── Form opens (modal)
│   ├── Mã Task (ID) — auto-generated from Initiative + Team prefix
│   ├── Phân loại: Task / BAU / Dự án / Sáng kiến / Case
│   ├── Category: Sản phẩm / Số hóa / AI-Năng suất / etc.
│   ├── Tên công việc (Task Name)
│   ├── Initiative (dropdown from db.initiatives)
│   ├── Milestone: M1–M12 or none
│   ├── Team chính / Team phối hợp
│   ├── PIC Accountable / PIC Responsible / PIC Support
│   ├── Start Date / Deadline
│   ├── Trạng thái / Progress %
│   ├── Health RAG: Green / Amber / Red
│   ├── Cross-team? / Highlight báo cáo?
│   ├── Weekly report fields: Kết quả / Kế hoạch / Vướng mắc
│   └── Cần BLĐ quyết? / Nội dung BLĐ
│
├── Duplicate ID check
│   ├── Real-time: red border if ID exists locally
│   ├── On submit: server-side check before write (v6.2)
│   └── If duplicate: block + offer "open existing task to edit"
│
├── Confirm dialog → User confirms
│
└── syncAction() → Write to Google Sheets → Toast success
```

---

## Dashboard Workflow Diagram

```
┌──────────────────────────────────────────────────────┐
│                    EXECUTIVE VIEW                    │
│                                                      │
│  [Filter: Tuần BC ▾]   [📊 Tất cả task]             │
│                                                      │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐   │
│  │  TOTAL │ │  DONE  │ │ IN PROG  │ │  OVERDUE │   │
│  │  N     │ │  N     │ │  N       │ │  N 🔴    │   │
│  └────────┘ └────────┘ └──────────┘ └──────────┘   │
│  (click → Detail Modal with filtered task list)      │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ RAG Doughnut     │  │ Initiative Summary Table │ │
│  │ 🟢 G / 🟡 A /   │  │ Init | Total | Done | %  │ │
│  │ 🔴 R            │  │ (click → filtered list)  │ │
│  └──────────────────┘  └──────────────────────────┘ │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ Team Stats       │  │ Blocked & Cần BLĐ        │ │
│  │ Team | Count |▓▓ │  │ Task | PIC | Status      │ │
│  └──────────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## Data States

| State | Meaning |
|---|---|
| Chưa bắt đầu | Not started |
| Đang thực hiện | In progress |
| Hoàn thành chuẩn bị | Preparation complete |
| Hoàn thành | Done (100%) |
| Tạm dừng | Paused |
| Blocked | Blocked — appears in issues view |

| RAG | Meaning |
|---|---|
| Green | On track |
| Amber | At risk |
| Red | Behind / Critical |

---

## Import Flow (Excel)

```
User clicks "Import"
→ File picker (xlsx / xls / csv)
→ SheetJS reads workbook
→ extractWorkbook() finds "task_master" sheet
→ Flexible header mapping (25+ column name variants)
→ Auto-generate IDs for rows missing ID
→ Parse dates (ISO, VN, Excel serial), RAG, state, Y/N flags
→ Merge into db.tasks
→ Populate initiatives from task list
→ Render all views
```
