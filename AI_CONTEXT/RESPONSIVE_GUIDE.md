# Responsive Guide — TPBank BIZ

## Strategy: Desktop-First

All base styles target 1440px. Media queries progressively simplify for smaller screens.

## Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Desktop XL | 1440px+ | Full layout, sidebar 252px |
| Desktop | 1280px | Sidebar 240px, content padding 24px |
| Tablet L | 1024px | **Sidebar collapses to off-canvas** |
| Tablet | 768px | KPI 2-col, compact topbar, smaller tabs |
| Mobile | 480px | KPI 1-col, full-width forms, bottom nav |

## Sidebar Responsive Behavior

```
1440px → sidebar always visible (252px)
1280px → sidebar always visible (240px)
1024px → sidebar hidden (translateX(-100%))
         toggle button appears in topbar
         opening sidebar adds overlay
```

## KPI Grid Responsive

```
1440–1025px → 4 columns
1024–769px  → 2 columns
480px       → 1 column
```

## Wizard Form Responsive

```
Desktop  → padding 32px sides
Tablet   → padding 20px sides
Mobile   → padding 16px sides
           step labels hidden
           nav buttons stack vertically
```

## Topbar Responsive

```
Desktop  → [Title] [Refresh] [User chip with name]
Tablet   → [Sidebar Toggle] [Title] [Refresh] [Avatar only]
Mobile   → [Sidebar Toggle] [Title] [Refresh]
```

## Typography Responsive

Typography scale uses rem-based values and does not change at breakpoints.
Font size stays consistent — only layout/padding adapts.

## Touch Targets

All interactive elements maintain `min-height: 40px` (buttons) or `min-height: 44px` (sidebar nav items) to meet mobile touch target standards.
