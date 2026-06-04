# UI AUDIT — SHTD Dashboard v6.2

## Design System Consistency

### What's Working Well

| Area | Assessment |
|---|---|
| Color tokens | ✅ Comprehensive CSS custom properties, consistent usage |
| Dark mode | ✅ Works via `[data-theme="dark"]` class toggle |
| Typography | ✅ DM Sans + DM Mono — consistent, professional |
| Card system | ✅ Consistent `.card` + `.card-header` pattern |
| Badge system | ✅ `.badge-green/amber/red/gray` + `.state-chip` patterns |
| Button variants | ✅ Full set: primary, secondary, outline, ghost, danger, sm |
| Toast system | ✅ Animated, 4 types, auto-dismiss, close button |
| Loading overlay | ✅ Full-screen with spinner + message text |
| Confirm dialog | ✅ Async promise-based, 3 types (warn/danger/info) |
| Sidebar navigation | ✅ Active state, badge counts, collapse on desktop |

### Inconsistencies Found

| ID | Area | Issue | Severity |
|---|---|---|---|
| UI-001 | Inline styles | 100+ `style=""` attributes bypass token system | 🔴 HIGH |
| UI-002 | Form labels | Mix of `.form-label` class and raw `style="font-size:..."` labels | 🟡 MEDIUM |
| UI-003 | Modal sizing | Task modal max-width 900px; Detail modal uses `.detail-modal` class (1100px); OK but not documented | ⚪ LOW |
| UI-004 | Emoji in options | `🟢 Green`, `📊 Tất cả task`, `📅 Tuần này` — anti-pattern per design system | 🟢 MEDIUM |
| UI-005 | Button in topbar | Demo/debug buttons ("Load demo data", "Xóa data", "Toggle Dark") appear in production topbar | 🔴 HIGH |
| UI-006 | Broken topbar HTML | Lines 153–166 contain raw HTML fragments (a `<button>` and `<div>` block) that appear to be outside proper structure | 🔴 HIGH |
| UI-007 | Merge instructions in HTML | Lines 168–178 contain visible user-facing "hướng dẫn merge" HTML that should not appear in the rendered app | 🔴 CRITICAL |
| UI-008 | Quick View subtitle update | `qvpSubtitle` updates correctly, but text truncates on mobile | 🟢 MEDIUM |
| UI-009 | Status dot colors | `dbDot` and `syncDot` share `.status-dot` class but serve different purposes — not differentiated | ⚪ LOW |
| UI-010 | Gantt dates | Subtitle says "2025–2026" — hardcoded, will be stale | 🟡 MEDIUM |

---

## Critical Issue: Broken HTML Structure at Lines 153–178

**Finding**: The HTML between the topbar `<div class="topbar-right">` and the end of the topbar contains what appears to be improperly positioned/merged code:

```html
<!-- Line 153-166: These elements appear to be floating without proper context -->
<button class="qv-topbar-btn" onclick="openQuickView()" ...>
<button class="btn btn-outline" onclick="loadDemoData()">Load demo data</button>
<button class="btn btn-outline" onclick="clearDemoData()">Xóa data</button>
<button class="btn btn-outline" onclick="document.documentElement...">Toggle Dark</button>

<!-- Line 168-178: Merge instructions visible as HTML content -->
<div style="...">
  <strong>Hướng dẫn merge vào dashboard.html gốc</strong>
  <ol>...</ol>
</div>
```

**Risk**: These elements appear in the live DOM. `loadDemoData()` and `clearDemoData()` functions may not exist (not found in JS), which would cause console errors. The merge guide appears as visible text to users.

**Action Required**: Audit lines 153–178 carefully before ANY other changes.

---

## Navigation UX

| Feature | Status | Notes |
|---|---|---|
| Sidebar collapse (desktop) | ✅ Works | Ctrl+B shortcut |
| Mobile sidebar overlay | ✅ Works | Slide-in from left |
| Keyboard navigation | ✅ Works | G+D, G+T, G+G, G+P |
| Active state indicator | ✅ Works | Left orange bar |
| Badge counts | ✅ Works | Total task count, overdue count |
| Quick View (Q key) | ✅ Works | FAB + topbar button + keyboard |
| Page title update | ✅ Works | Updates on navigate |

---

## Component Reusability Assessment

| Component | Currently Reusable? | Notes |
|---|---|---|
| Toast system | ✅ Yes | Used across all operations |
| Confirm dialog | ✅ Yes | Used in delete, sync, clone |
| Loading overlay | ✅ Yes | Used in sync, connect, load |
| Modal (task form) | ⚠️ Partly | Single instance, reused via populate |
| Detail modal | ⚠️ Partly | Driven by filter parameter |
| KPI cards | ❌ No | Hardcoded HTML in dashboard section |
| Filter bar | ❌ No | Single instance, hardcoded |
| Gantt chart | ❌ No | One-off render function |
| Table rows | ⚠️ Template strings | Inline HTML in `renderTaskTable()` |

---

## Accessibility Gaps

| Issue | Severity |
|---|---|
| Modals lack `role="dialog"` and `aria-modal="true"` | 🟡 MEDIUM |
| Tables lack `role="table"` and `scope` on headers | 🟡 MEDIUM |
| No focus trap in modals | 🟡 MEDIUM |
| Form errors not linked via `aria-describedby` | 🟡 MEDIUM |
| Icon-only buttons lack `aria-label` | 🟡 MEDIUM |
| Color alone used to convey RAG status (no pattern) | 🟢 LOW |
| Tab order not explicitly managed | ⚪ LOW |

---

## Mobile UX Assessment

| Feature | Status | Notes |
|---|---|---|
| Sidebar mobile slide-in | ✅ Good | `.sidebar.open`, overlay backdrop |
| Mobile modal bottom-sheet | ✅ Good | Slides up from bottom |
| KPI 2-col grid on mobile | ✅ Good | 1-col at 480px |
| Table horizontal scroll | ✅ Good | `-webkit-overflow-scrolling: touch` |
| Filter bar wrapping | ⚠️ OK | Many filters, gets cramped |
| Toolbar button overflow | ⚠️ OK | `flex-wrap: wrap`, but can get very tall |
| Pagination + FAB overlap | ✅ Fixed | v6.1 raised FAB to 76px/80px |
| Quick View panel mobile | ✅ Good | Full-width bottom sheet, 88vh |
| Touch target size | ⚠️ Mixed | Buttons ≥36px but some icon-btns are 36px (below 44px recommendation) |
| Gantt on mobile | ❌ Poor | Horizontal scroll but label column is 280px — takes most of screen |
