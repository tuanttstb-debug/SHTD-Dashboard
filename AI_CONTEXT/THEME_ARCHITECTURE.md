# Theme Architecture — TPBank BIZ

## Token Inheritance Model

```
variables.css (defines all :root tokens)
    ↓
base.css      (reset, body font/color from tokens)
    ↓
layout.css    (sidebar, topbar, app-shell — all via tokens)
components.css (buttons, cards, modals — all via tokens)
forms.css     (inputs, pills — focus ring from tokens)
wizard.css    (stepper — colors from tokens)
dashboard.css (KPI, charts, tables — colors from tokens)
portal.css    (service list — colors from tokens)
login.css     (auth card — gradient from tokens)
states.css    (skeleton shimmer — border from tokens)
responsive.css (overrides — layout tokens)
```

**Rule:** Never hardcode a hex color or pixel value in a component file. Always use a token.

---

## Primary Color Override

To change the primary brand color across the entire app, only `variables.css` needs to change:

```css
/* Change entire app from purple to, say, teal: */
:root {
  --color-primary:         #00695C;
  --color-primary-dark:    #004D40;
  --color-primary-light:   #E0F2F1;
  --color-primary-surface: #F5FFFE;
  --sidebar-gradient: linear-gradient(180deg, #00695C 0%, #004D40 100%);
}
```

This updates: sidebar, header, buttons, focus rings, active states, pill selections, badges — everywhere.

---

## Dark Mode Readiness

The token system supports dark mode via `@media (prefers-color-scheme: dark)` in `variables.css`. Not yet implemented, but the architecture allows it:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:      #0F0F14;
    --color-surface: #1A1A24;
    --color-border:  #2A2A38;
    --color-text:    #E8E8F0;
    /* sidebar gradient stays dark purple — already correct */
  }
}
```

---

## Font Stack

```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
```

Loaded from Google Fonts in `base.css`. Weights: 400, 500, 600, 700.

Fallback chain ensures identical rendering across Windows, macOS, Linux.

---

## CSS Custom Property Scoping

All tokens live on `:root` (global). No component-scoped tokens.

If component isolation is needed in the future, use CSS layers:

```css
@layer tokens, base, components, utilities;
```

---

## Sidebar Gradient Technical Note

The sidebar uses a `linear-gradient` CSS value as a token:

```css
--sidebar-gradient: linear-gradient(180deg, #7B2CBF 0%, #6622B4 100%);
```

Applied via `background: var(--sidebar-gradient)` on:
- `.app-sidebar`
- `.portal-header`
- `.login-header`
- `.login-card-top`
- `.app-header` (standalone pages)

This ensures visual consistency across all purple header surfaces.
