# UI CONCEPT — Layout Principles (SHTD Dashboard)

> **Purpose**: The design contract every new feature must follow so the UI is
> optimized *from development*, not patched afterwards. When you build or review a
> view, modal, table, or board, apply these rules before writing markup.
>
> **North star**: *One screen shows the whole picture.* No unnecessary horizontal
> scroll; no large dead space on the right. The content adapts to the width it has.
>
> **Created**: 2026-08-03 (S58 — after Dev Plan overflow + Action Plan dead-space fixes).

---

## 0. The two failure modes we are fixing

| Anti-pattern | Symptom | Root cause | Correct pattern |
|---|---|---|---|
| **Overflow** (Dev Plan table) | Have to scroll right to see all columns | Fixed `min-width` (e.g. `900px`) + `white-space:nowrap` cells force the layout wider than the container | `table-layout:fixed; width:100%` + wrapping text cells (§2) |
| **Dead space** (Action Plan board) | Columns hug the left, big empty gap on the right | `flex:0 0 <fixed>px` columns that never grow | `flex:1 1 0; min-width:<floor>` so columns stretch to fill (§3) |

Both come from the same mistake: **hard-coding a width instead of letting the
element respond to its container.** Prefer responsive sizing; use fixed px only for
genuinely fixed things (icon buttons, a single date column, a spinner).

---

## 1. Golden rules (apply to every view)

1. **The container owns the width, not the content.** A view must fit the content
   area (viewport minus the ~240px sidebar) at common desktop widths (1280–1920)
   with **no horizontal page scroll**.
2. **Fill the width; don't waste it, don't exceed it.** If you have extra room,
   stretch/wrap into it. If you're short, wrap or collapse — never push the page wide.
3. **Horizontal scroll is a *mobile fallback only.*** Wrap the widest element in an
   `overflow-x:auto` container so a truly narrow phone can scroll — but that must
   never trigger on desktop.
4. **Use design tokens, not literals.** Colors, spacing, radius, shadow come from
   the CSS custom properties (`--surface`, `--border`, `--text-1/2/3`, `--primary`,
   `--radius`, `--shadow`, …). Avoid new inline `style="color:#..."`. (See UI_AUDIT
   UI-001 — inline styles are existing debt; don't add more.)
5. **Both themes, always.** Everything must read correctly in light and dark. Use
   tokens (they flip via `[data-theme="dark"]`) rather than raw colors.

---

## 2. Tables — the "fit one screen" recipe

Use this for any data table (Dev Plan, Issue Tracker, Case Pipeline table, Tasks…).

```css
.x-table-scroll { overflow-x: auto; }         /* mobile fallback ONLY */
.x-table {
  width: 100%;
  table-layout: fixed;                         /* table can't exceed its container */
  border-collapse: collapse;
}
.x-table td { word-break: break-word; overflow-wrap: anywhere; }  /* long text wraps */
@media (max-width: 720px) { .x-table { min-width: 720px; } }      /* only now allow scroll */
```

- **`table-layout: fixed` is the key.** With `width:100%` the table locks to its
  container; column widths become ratios of that width and text wraps to fit.
- **Give fixed widths only to short columns** (STT/#, dates, a compact status chip,
  the action-button cell). Express them in `px` for truly fixed cells and `%` for
  everything else. Let the 1–2 free-text columns (name, description, note) take the
  remaining space and **wrap**.
- **Do NOT** set a large `min-width` on the table itself, and **do NOT** put
  `white-space:nowrap` on free-text cells — those are exactly what forces overflow.
- Keep short values (dates) on one line with a dedicated class
  (`.x-cell-date { white-space:nowrap }`), not a blanket `nowrap`.
- Rule of thumb: sum of fixed-px columns should leave **≥ 40%** of the table for
  the free-text columns at 1280px content width.

---

## 3. Kanban / card boards — the "stretch to fill" recipe

Use for any multi-column board (Action Plan, Case Pipeline kanban).

```css
.x-board { display: flex; gap: 16px; overflow-x: auto; }   /* mobile fallback */
.x-col   { flex: 1 1 0; min-width: 240px; }                /* grow equally to fill */
```

- `flex:1 1 0` makes columns **share the full width equally**; `min-width` is the
  floor at which the board starts scrolling on narrow screens.
- Never `flex:0 0 <fixed>px` for a small, known number of columns (≤ ~5) — that
  leaves dead space. Fixed-width columns are only appropriate when the *count is
  large/unbounded* and horizontal scroll is the intended interaction.
- Cards inside stretch to `width:100%` of the column automatically.

---

## 4. Modals, popups & detail views

- **Width scale** (max-width, `width:min(95vw, <max>)` so it never overflows small
  screens): compact form **560–640px** · standard form **680–720px** · wide/detail
  or drill-down list **900–1100px**. Reuse an existing tier; don't invent a new one.
- Always cap height: `max-height: 90vh; overflow-y: auto;`.
- Center with the overlay (`position:fixed; inset:0; display:flex; align/justify:center; padding:16px`).
- Detail/read-only field grids use the shared `.cp-view-*` pattern (2-col grid that
  collapses to 1 column below ~500px).
- Every modal/popup closes on **ESC** (wire it into `navigation.js` ESC chain) and
  on backdrop click.

---

## 5. Breakpoints (canonical set — reuse, don't add new ones)

| Width | Meaning |
|---|---|
| `≤ 768px` | Tablet / mobile: topbar becomes `position:fixed`, toolbars stack (`flex-direction:column`), sidebar slides in. **Primary breakpoint** — 9 of the CSS files already use it. |
| `≤ 640px` / `≤ 600px` | Multi-column grids (stat bars, form grids) collapse 2→1. |
| `≤ 480px` | Small phone: tighter padding, hide non-essential hints (`.path-hint`). |
| `≤ 720px` | Table min-width fallback floor (see §2). |

Prefer these existing values over introducing a new one.

---

## 6. Spacing, density & consistency

- Reuse shared components before creating new ones: `.card`/`.card-header`,
  `.cp-stat-card` (stat tiles), `.badge-*` / `.state-chip`, `.btn` variants,
  `.form-grid` (2-col, `minmax(0,1fr)`), toast, confirm dialog.
- Stat/summary tiles use `.cp-stat-card` in a responsive grid
  (`grid-template-columns: repeat(N, 1fr)` → collapses on mobile). This is the
  cross-view standard (Case Pipeline, Initiative Tracker).
- Form grids must use `minmax(0,1fr)` columns + `min-width:0` on children so long
  values never blow out the grid (UI_AUDIT lesson).

---

## 7. Pre-merge UI checklist (run before committing any view change)

- [ ] At 1280px and 1920px content width: **no horizontal page scroll**, and **no
      large empty gap** on the right.
- [ ] Tables use `table-layout:fixed; width:100%`; free-text cells wrap; no big
      table `min-width`; horizontal scroll only kicks in below ~720px.
- [ ] Boards use `flex:1 1 0` columns that fill the width.
- [ ] Modals use a standard width tier, `max-height:90vh`, ESC + backdrop close.
- [ ] Colors/spacing use tokens; no new hard-coded hex; works in light **and** dark.
- [ ] Reused existing breakpoints and shared components; no near-duplicate CSS.
- [ ] Bumped `APP_VERSION` (config.js) + cache-bust `?v=` (index.html) for the change.

---

## 8. Change log

- **2026-08-03** — Doc created. Fixed Dev Plan detail table overflow (removed
  `min-width:900px` → `table-layout:fixed` + wrapping cells) and Action Plan board
  dead space (`flex:0 0 260px` → `flex:1 1 0; min-width:240px`). v6.23.
