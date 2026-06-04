# SYSTEM ARCHITECTURE

## Tổng quan kiến trúc

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER (User)                        │
│                                                              │
│  index.html                                                  │
│  ├── config/env.js          ← APP_CONFIG (base URL, version) │
│  ├── config/routes.js       ← API route builder              │
│  └── assets/js/             ← Business logic (vanilla JS)    │
│       ├── constants.js      ← FIELDS, STEPS definitions      │
│       ├── helpers.js        ← sanitize(), debounce()         │
│       ├── storage.js        ← localStorage wrapper           │
│       ├── api.js            ← fetch() wrapper (Api object)   │
│       ├── validation.js     ← Validator (step1, step2, all)  │
│       ├── toast.js          ← Toast notification UI          │
│       ├── duplicate-check.js← DuplicateChecker               │
│       ├── form-mapper.js    ← FormMapper (collect/populate)  │
│       ├── wizard.js         ← Wizard + FieldBuilder          │
│       └── app.js            ← Entry point (init, submit)     │
│                                                              │
└──────────────────────────────────┬───────────────────────────┘
                                   │ HTTPS / CORS (fetch)
                                   │ URL: script.google.com/macros/s/…
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│              GOOGLE APPS SCRIPT (Web App)                    │
│                                                              │
│  Code.gs           ← Router: doGet / doPost / doPut         │
│  Config.gs         ← Constants: SPREADSHEET_ID, HEADERS     │
│  UseCaseService.gs ← CRUD logic + duplicate check           │
│  LookupService.gs  ← Read LOOKUP sheet                      │
│  DashboardService.gs← Aggregate MASTER for summary          │
│  LoggerService.gs  ← Write to ACTIVITY_LOG sheet            │
│  ValidationService.gs← Server-side validation               │
│  Utils.gs          ← Sheet helpers, JSON response, similarity│
│                                                              │
└──────────────────────────────────┬───────────────────────────┘
                                   │ SpreadsheetApp API
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS (Database)                        │
│                                                              │
│  MASTER_DATA       ← All use case records (63 columns)      │
│  LOOKUP            ← Dropdown options (Field/Value rows)     │
│  ACTIVITY_LOG      ← Audit trail (who did what, when)       │
│  DASHBOARD_READY   ← [UNUSED] Intended for pre-aggregated   │
│  CONFIG            ← Auto-increment ID counter (NEXT_ID)     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Luồng khởi động ứng dụng
```
DOMContentLoaded
  → app.js::init()
      → Api.getLookup()           [GET /lookup]
      → window.__LOOKUP = data
      → (if ?edit=ID) Api.getUseCase(ID), FormMapper.populateData()
      → (else) Storage.load(), confirm restore draft
      → Wizard.init()
           → renderIndicators()
           → renderSteps()
           → FieldBuilder.buildAll()   ← reads window.__LOOKUP
           → updateNav(), bindEvents()
      → bind form.change → Storage.save()
      → bind submitBtn.click → submitForm()
```

## Cơ chế JS load (critical path)
Script tags trong `index.html` phải theo đúng thứ tự — mỗi file phụ thuộc vào globals từ file trước:

```
env.js → routes.js → constants.js → helpers.js → storage.js
→ api.js → validation.js → toast.js → duplicate-check.js
→ form-mapper.js → wizard.js → app.js
```

**Rủi ro:** Nếu đổi thứ tự hoặc thêm file mới sai vị trí → runtime error.

## Cơ chế xác định ID trong GAS
- `Record_ID`: UUID (Utilities.getUuid()) — dùng làm primary key để tìm/cập nhật
- `UseCase_ID`: sequential string format `AIUS-NNNN` — dùng làm business ID thân thiện
- Counter lưu trong sheet CONFIG, dùng `LockService.getScriptLock()` để tránh race condition

## CORS Strategy
GAS Web App deploy ở chế độ "Anyone" → CORS headers `Access-Control-Allow-Origin: *` được set thủ công trong mỗi response.

> **[ASSUMPTION]** GAS không hỗ trợ OPTIONS method natively, nên `doOptions()` trong Code.gs không hoạt động thực tế. CORS preflight có thể thất bại với một số browser configuration. Cần kiểm tra thực tế.

## State Management
Không có state management library. State được phân tán:
| State | Nơi lưu |
|---|---|
| Lookup data | `window.__LOOKUP` (global) |
| Current step | `Wizard.currentStep` (object property) |
| Edit mode flag | `Wizard.isEditMode` (object property) |
| Edit record ID | `currentRecordId` (closure trong app.js) |
| Draft form data | `localStorage['ai_usecase_draft']` |
| DOM form data | DOM elements trực tiếp |
