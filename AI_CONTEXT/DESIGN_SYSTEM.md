# Design System — TPBank BIZ

## Overview

Enterprise banking UI system. Purple-first. Card-driven. Minimal noise.

See `DESIGN_TOKENS.md` for all token values.

---

## CSS Architecture

```
assets/css/
├── variables.css     ← All design tokens (EDIT HERE FIRST)
├── base.css          ← Reset, html/body, focus styles
├── typography.css    ← Heading/text utility classes
├── layout.css        ← App shell: sidebar, topbar, app-main, app-content
├── components.css    ← Buttons, cards, badges, toast, modal, table
├── forms.css         ← Inputs, selects, radio/checkbox pills
├── wizard.css        ← Multi-step stepper, progress bar, step dots
├── dashboard.css     ← KPI cards, chart bars, pending cards, dash-tabs
├── portal.css        ← Service portal home page
├── login.css         ← Authentication page
├── states.css        ← Skeleton loading
└── responsive.css    ← Breakpoints: 1280 / 1024 / 768 / 480
```

**Load order matters.** `variables.css` must always be first.

---

## Component Reference

### Sidebar
```html
<aside class="app-sidebar" id="appSidebar">
  <a href="#" class="sidebar-brand">...</a>
  <nav class="sidebar-nav">
    <span class="sidebar-section-label">Label</span>
    <a href="#" class="sidebar-nav-item is-active">
      <i class="sidebar-nav-icon">icon</i>
      <span class="sidebar-nav-label">Nav Item</span>
    </a>
  </nav>
  <div class="sidebar-footer">...</div>
</aside>
```

### TopBar
```html
<header class="app-topbar">
  <button class="topbar-sidebar-toggle">☰</button>
  <h1 class="topbar-title">Page Title</h1>
  <div class="topbar-actions">
    <button class="topbar-icon-btn">↻</button>
    <div class="topbar-user-chip">...</div>
  </div>
</header>
```

### Card
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
    <span class="card-meta">Meta text</span>
  </div>
  <!-- content -->
</div>
```

### KPI Card
```html
<div class="kpi-card kpi-success">
  <div class="kpi-icon">✅</div>
  <div class="kpi-value">42</div>
  <div class="kpi-label">Đã duyệt</div>
</div>
```
Modifiers: `.kpi-success` `.kpi-warning` `.kpi-info`

### Button
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-outline">Secondary</button>
<button class="btn btn-success">Submit</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-ghost">Ghost</button>

<!-- Sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary btn-lg">Large</button>
<button class="btn btn-primary btn-full">Full width</button>
```

### Form Input
```html
<div class="form-group">
  <label class="field-label" for="field">
    Label <span class="field-required-mark">*</span>
  </label>
  <input type="text" id="field" class="form-control" placeholder="...">
  <span class="field-helper">Helper text</span>
  <span class="field-error">Error message</span>
</div>
```

### Radio Pill (TPBank BIZ style)
```html
<div class="radio-group">
  <label class="radio-pill">
    <input type="radio" name="opt" value="a">
    <span>Option A</span>
  </label>
  <label class="radio-pill">
    <input type="radio" name="opt" value="b">
    <span>Option B</span>
  </label>
</div>
```

### Badge / Status
```html
<span class="badge badge-success">Đã duyệt</span>
<span class="badge badge-warning">Chờ duyệt</span>
<span class="badge badge-error">Từ chối</span>
<span class="badge badge-primary">Submitted</span>
```

### Toast
Injected by `assets/js/toast.js`. Classes:
`.toast-success` `.toast-error` `.toast-warning` `.toast-info`

### Modal
```html
<div class="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-card">
    <div class="modal-header">
      <h3>Title</h3>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">...</div>
    <div class="modal-footer">
      <button class="btn btn-outline">Cancel</button>
      <button class="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Tab Navigation
```html
<div class="dash-tabs" role="tablist">
  <button class="dash-tab active" data-tab="overview" role="tab">
    Overview
  </button>
  <button class="dash-tab" data-tab="pending" role="tab">
    Pending <span class="tab-badge">3</span>
  </button>
</div>
<div id="tab-overview" class="tab-panel" role="tabpanel">...</div>
<div id="tab-pending"  class="tab-panel hidden" role="tabpanel">...</div>
```

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Desktop | 1440px+ | Full sidebar (252px) |
| Desktop S | 1280px | Sidebar 240px |
| Tablet L | 1024px | Sidebar collapses to off-canvas |
| Tablet | 768px | 2-col KPI grid, compact topbar |
| Mobile | 480px | 1-col layout, full-width forms |

Sidebar collapse trigger: **1024px** (controlled by `.is-open` class + overlay).

---

## Naming Convention

### CSS Classes
- Block: `.component-name` (e.g. `.dash-card`)
- Element: `.component-name-element` (e.g. `.dash-card-header`)
- Modifier: `.is-state` or `.component-modifier` (e.g. `.is-active`, `.kpi-success`)

### JS
- Module IIFE pattern: `(function() { ... })()`
- State prefix: `_varName` for private module state
- Public API: `window.ModuleName = { method }`

---

## Do / Don't

| Do | Don't |
|---|---|
| Use `var(--color-primary)` | Hard-code `#7B2CBF` inline |
| Use `var(--space-6)` for card padding | Use `padding: 24px` inline |
| Use `var(--radius-xl)` for cards | Use `border-radius: 20px` inline |
| Use semantic token names | Reach into the purple palette for one-off uses |
| Keep shadow minimal | Add `box-shadow: 0 10px 30px rgba(0,0,0,0.2)` |
