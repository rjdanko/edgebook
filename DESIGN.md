---
name: EdgeBook
description: A calm, restrained productivity tool for trade journaling, executed at Linear/Notion craft.
colors:
  bg-canvas: "oklch(99.2% 0.002 260)"
  bg-surface: "oklch(97% 0.003 260)"
  bg-surface-hover: "oklch(94.5% 0.004 260)"
  border-subtle: "oklch(91% 0.004 260)"
  border-strong: "oklch(84% 0.006 260)"
  text-primary: "oklch(21% 0.01 260)"
  text-secondary: "oklch(46% 0.012 260)"
  text-disabled: "oklch(64% 0.01 260)"
  accent: "oklch(47% 0.18 275)"
  accent-fg: "oklch(99% 0 0)"
  positive: "oklch(46% 0.15 145)"
  negative: "oklch(50% 0.21 25)"
  neutral-warn: "oklch(52% 0.15 75)"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.3
  heading:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  numeral:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  button: "6px"
  card: "10px"
  input: "6px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
  7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.bg-canvas}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "8px 16px"
  card-stat:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "16px"
  pill:
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 12px"
---

# Design System: EdgeBook

## Overview

**Creative North Star: "The Category Standard, Played Straight"**

EdgeBook's shipped interface deliberately reads as a well-made SaaS productivity tool, not a themed metaphor. An earlier direction ("The Ledger," a bookkeeper's-account-book concept with ruled paper, ink colors, and a Spectral serif) was fully replaced; none of that survives in the current code. The user named Linear and Notion as the explicit craft bar and asked for "clean minimalistic modern," so the system is built on near-white/near-black neutral surfaces, one restrained accent, real bordered-and-shadowed cards, and a single UI sans typeface used with discipline rather than decoration.

This is a source-level extraction: derived by reading `tokens.css`, `app.css`, `theme.js`, and the JS view renderers (`dashboard.js`, `trades.js`, `journal.js`, `settings.js`) that emit the actual markup, not from a rendered screenshot. No visual QA pass against the running app occurred for this write. Rust/cargo is not available in this environment to build and run the Tauri shell, and an earlier attempt to verify visually via an OS-level screenshot was abandoned after it captured unrelated content on the user's live desktop; that path was not retried. Treat this document as a source-of-truth extraction from CSS/JS, not a rendered-and-reviewed finish pass.

**Key Characteristics:**
- Neutral OKLCH near-white canvas (light) / near-black canvas (dark), with one restrained accent used only for primary actions, active nav, links, and focus rings.
- Real cards: `.card` has a surface fill, a 1px subtle border, a 10px radius, and a small ambient shadow — this replaces the prior "no boxed cards" rule outright.
- Green/red/amber are reserved strictly for P/L and pass/fail semantics; never decorative.
- Inter (self-hosted variable font, weights 100-900) is the single typeface across the entire UI, chosen deliberately because Linear and Notion both read as Inter-family products.
- Two themes (light/dark) share the identical role structure, selected via `[data-theme]` or `prefers-color-scheme`, with an explicit choice always winning over the system preference.

## Colors

The palette is built entirely in OKLCH: five neutrals for canvas/surface/border/text, three semantic inks for P/L and pass/fail sign, and exactly one user-customizable accent, switched together between light and dark themes.

### Primary
- **Confident Indigo** (`oklch(47% 0.18 275)`, dark theme `oklch(68% 0.16 275)`): the sole accent. Default value, user-customizable in Settings via a native color `<input>` (`#accent-input`, default `#5E6AD2`); `src/js/theme.js` computes an accessible foreground (`accentForeground()`, WCAG relative-luminance check against `#1f1f1f`/`#ffffff`) and applies both as inline `--accent`/`--accent-fg` custom properties on `documentElement`, so any user-chosen accent stays legible. Used sparingly: primary buttons, active nav item (text + 12%-tint background), focus rings, `::selection`, active filter-tab text and underline, checkbox `accent-color`.
- **Accent Foreground** (`oklch(99% 0 0)`, dark `oklch(12% 0 0)`): text/icon color on top of the accent fill; recomputed per custom accent by `theme.js`, not a fixed value.

### Neutral
- **Canvas** (`oklch(99.2% 0.002 260)`, dark `oklch(17% 0.006 260)`): page background (`--bg-canvas`); also the resting fill for inputs and calendar cells.
- **Surface** (`oklch(97% 0.003 260)`, dark `oklch(21% 0.007 260)`): sidebar fill, card fill, table-row hover fill — one step off the canvas.
- **Surface Hover** (`oklch(94.5% 0.004 260)`, dark `oklch(25% 0.008 260)`): hover fill for nav items and secondary buttons.
- **Border Subtle** (`oklch(91% 0.004 260)`, dark `oklch(28% 0.008 260)`): default card/input/table/calendar borders and divider rules.
- **Border Strong** (`oklch(84% 0.006 260)`, dark `oklch(36% 0.01 260)`): hover/active border state, secondary-button border.
- **Text Primary** (`oklch(21% 0.01 260)`, dark `oklch(95% 0.004 260)`): headings, body text, stat values, active nav.
- **Text Secondary** (`oklch(46% 0.012 260)`, dark `oklch(68% 0.012 260)`): labels, captions, resting nav text, table footers — and deliberately also empty-placeholder text (`.empty-placeholder`), not a lighter disabled tone; see Named Rule below.
- **Text Disabled** (`oklch(64% 0.01 260)`, dark `oklch(48% 0.012 260)`): muted/disabled text and scrollbar-thumb hover only.

### Semantic (not decorative)
- **Positive** (`oklch(46% 0.15 145)`, dark `oklch(68% 0.15 145)`): positive net P/L figures and text, "on track" objective pills, positive calendar-cell tint and P/L text.
- **Negative** (`oklch(50% 0.21 25)`, dark `oklch(68% 0.18 25)`): negative net P/L figures, "off track" objective pills, negative calendar-cell tint, the destructive `.btn-secondary.negative` (delete) button.
- **Neutral Warn** (`oklch(52% 0.15 75)`, dark `oklch(72% 0.13 80)`): breakeven/warn calendar cells and any non-positive/non-negative sign case.

### Named Rules
**The One Accent Rule.** The accent appears only on primary buttons, the active nav item, focus rings, `::selection`, and active tab underlines — never as a large fill (page background, card background, full row). Green/red/amber never substitute for it as decoration; they are reserved for P/L and pass/fail sign only.

**The Legible-Placeholder Rule.** Empty-state and placeholder copy (`.empty-placeholder`) uses `--text-secondary`, not `--text-disabled`. Semantic and accent colors were hand-darkened from initial picks specifically to clear 4.5:1 contrast on the near-white canvas; don't lighten placeholder text back toward `--text-disabled` for a "quieter" look — it was deliberately kept legible instead.

## Typography

**Display Font:** Inter (self-hosted variable font, `src/fonts/inter-var.woff2`, weight range 100-900, latin subset, `font-display: swap`), falling back to `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
**Body Font:** the same Inter stack — one typeface for the entire UI.

**Character:** Inter is used for everything — titles, body, labels, numerals — at varying weight and size rather than switching families. This is a deliberate choice matching the named craft bar (Linear and Notion both read as Inter-family products), not a default reflex. The design-detector's "overused font" warning fired on this single-typeface usage during the build and was reviewed and accepted for that reason; it is recorded here rather than pretended away.

### Hierarchy
- **Display** (650, 26px/1.3): page titles (`h1.page-title`, `-0.02em` tracking), and the dashboard's large stat values (`.stat-value`, set at 24px with `-0.015em` tracking as an in-component override).
- **Heading** (600, 15px/1.4): section titles (`h2.section-title`) and journal-card headlines.
- **Body** (400, 14px/1.55): default body text, table cells, form inputs, journal excerpts, nav item labels (at 500 weight).
- **Numeral** (500, 14px/1.4, tabular): monetary/numeric figures — data-table numeric columns, stat values, calendar P/L, table footers all set `font-variant-numeric: tabular-nums` so figures align vertically in a column.
- **Label** (500, 12.5px/1.4): table headers, form labels, stat labels — no forced uppercase or letter-spacing in the shipped CSS (unlike the prior ledger direction's uppercase register-label voice).
- **Caption** (400, 12px/1.5): calendar day numbers, secondary metadata.

### Named Rules
**The One Typeface Rule.** Inter is the only typeface in the system, carried across every role by weight and size, not family-switching. No serif, no display face, no system-font fallback substitution beyond the declared cross-platform stack.

## Layout

The shell is a fixed two-column frame: a 232px sidebar (`.sidebar`, fixed width, no collapse behavior observed) with a right-hand 1px subtle border, and a flexed main content column capped at `max-width: 1180px`, padded `32px 48px` (`--space-6 --space-7`).

Spacing is an 8-point-derived scale: `4 / 8 / 12 / 16 / 24 / 32 / 48px` (`--space-1` through `--space-7`), used consistently for padding, gaps, and vertical rhythm (`h2.section-title` gets `32px` top margin, tightened to `0` for the first heading on a page).

The dashboard's stat strip (`.card-grid`) is a responsive grid (`repeat(auto-fit, minmax(168px, 1fr))`, `12px` gap) of individually bordered, shadowed, softly-padded cards — a real card grid, not a single ruled row.

Tables and the calendar grid use subtle hairline row/cell separators inside their own bordered container context (cards or bare table markup), and the calendar renders as a 7-column grid of individually bordered rounded cells rather than one ruled block.

## Elevation & Depth

The system uses real, restrained elevation: a subtle ambient shadow plus a 1px border, applied to genuine card and popover-like surfaces. This is a deliberate reversal of the prior "flat, no shadow" ledger rule.

### Shadow Vocabulary
- **shadow-sm** (`box-shadow: 0 1px 2px oklch(0% 0 0 / 4%)`, dark `/ 20%`): default card, primary-button, attachment-thumbnail-hover, journal-card-hover, calendar-cell-hover elevation.
- **shadow-md** (`box-shadow: 0 4px 16px oklch(0% 0 0 / 8%), 0 1px 2px oklch(0% 0 0 / 6%)`, dark `/32%, /24%`): defined in tokens for higher-elevation surfaces (dropdowns/modals); not yet observed applied to a shipped component in `app.css`, so treat it as reserved for popover/modal-class UI when those are built, not as evidence of an existing modal pattern.

### Named Rules
**The Real Card Rule.** `.card` (and its variants: stat cards, journal cards) get a surface background, a 1px `--border-subtle` border, a `--radius-card` (10px) corner, and `--shadow-sm`. This is the opposite of a flat/no-elevation system: cards are meant to read as lifted, bordered containers.

## Shapes

Corners are consistently rounded at small radii: `6px` for buttons and inputs (`--radius-button`, `--radius-input`), `10px` for cards (`--radius-card`), and full-round (`999px`) for pills, the accent's active-nav dot-equivalent tint, and the scrollbar thumb. There is no near-square or sharp-corner treatment anywhere in the shipped CSS.

Borders are hairline (1px) in two weights (`--border-subtle`, `--border-strong`), used on cards, inputs, tables, calendar cells, and attachment thumbnails. Focus states add a visible ring rather than a color-only change: `:focus-visible` gets a 2px accent outline generally, and form fields get a 3px accent-tinted `box-shadow` halo (`color-mix(in oklch, var(--accent) 18%, transparent)`) instead of the browser default outline.

## Components

### Buttons
- **Shape:** 6px radius (`--radius-button`).
- **Primary:** accent fill (`--accent`) with computed-accessible foreground text (`--accent-fg`), `8px 16px` padding, `shadow-sm`, hover darkens the fill via `color-mix(in oklch, var(--accent) 88%, black)`, active state scales to 0.98.
- **Secondary:** canvas fill with a strong-hairline border and primary text color; hover shifts fill to `--bg-surface-hover`. A `.btn-secondary.negative` variant (destructive actions, e.g. "Delete trade") recolors border and text to `--negative`, same shape.
- Both variants use body typography at 500 weight, 13.5px (a slightly denser in-component size than the 14px body token).

### Chips / Pills
- **Style:** `999px` radius, `3px 12px` padding, label typography at 600 weight (a slightly heavier in-component override than the 500-weight label token).
- **State:** `.pill.positive` / `.pill.negative` tint background to a 16% mix of the semantic color with matching text color — used for objective pass/fail status ("On track" / "Off track"). This is the generic pill primitive applied to a specific meaning, not a distinct bespoke component.

### Cards / Containers
- **Corner Style:** 10px radius (`--radius-card`).
- **Background:** `--bg-surface` fill over the canvas.
- **Shadow Strategy:** `--shadow-sm` at rest (see Elevation & Depth: The Real Card Rule).
- **Border:** full 1px `--border-subtle` border on all sides.
- **Internal Padding:** `24px` (`--space-5`) standalone; stat cards inside `.card-grid` use a tighter `16px` (`--space-4`).

### Inputs / Fields
- **Style:** boxed inputs — `--bg-canvas` fill, full 1px `--border-subtle` border, `6px` radius (`--radius-input`), `8px 12px` padding. Applies uniformly to `input`, `select`, `textarea` inside `.form-row`.
- **Hover:** border strengthens to `--border-strong`.
- **Focus:** default outline removed, border shifts to `--accent`, and a 3px accent-tinted `box-shadow` halo is added (`0 0 0 3px color-mix(in oklch, var(--accent) 18%, transparent)`) — a glow ring, not an underline-only treatment.
- Checkboxes use native rendering with `accent-color: var(--accent)`; textareas cap at `65ch`, min-height `72px`, vertically resizable only.

### Navigation
- **Style:** a vertical list of icon+label rows in the sidebar, body typography at 500 weight, `--text-secondary` at rest, `6px` rounded-rect item shape.
- **Hover:** text darkens to `--text-primary`, background tints to `--bg-surface-hover`.
- **Active:** text colors to `--accent`, background tints to a 12% accent mix (`color-mix(in oklch, var(--accent) 12%, transparent)`) — a soft filled pill/tint, not a thick colored border.
- Icons are inline SVG (18x18px, 1.75px stroke, `stroke: currentColor`, no fill) — a minimal line-icon vocabulary, not glyph/icon-font characters.

### Data Table
- Header row: label typography over a 1px `--border-subtle` bottom rule; body rows separated by the same subtle hairline, no zebra striping.
- Numeric columns (`.numeric`) right-align and use tabular-nums; hovering a row tints it to `--bg-surface`, and rows representing an actual record (`.trade-row`) switch cursor to pointer.

### Calendar / Monthly P/L Grid (signature component)
A 7-column grid (`.calendar-grid`, `8px` gap) of individually bordered, rounded (`6px`) cells, aspect-ratio 1. Each day cell shows a caption-weight day number and, where a trading day exists, a tabular-numeral P/L figure. Sign is conveyed two ways at once: the cell background is tinted 10% toward the semantic color over the canvas with a 25%-mixed border, and the P/L figure text itself is colored with the full semantic color (`.calendar-cell.positive .calendar-pl` etc.) — color is not cell-tint-only. Empty leading cells (days before the 1st) render as a plain, borderless, backgroundless placeholder.

## Do's and Don'ts

### Do:
- **Do** give every card, stat card, and journal card a `--bg-surface` fill, 1px `--border-subtle` border, `10px` radius, and `--shadow-sm` — real bordered/shadowed cards are the system, not an exception.
- **Do** keep the accent to primary buttons, active nav, focus rings, `::selection`, and active tab underlines only; never as a page or card background fill.
- **Do** use Inter for every text role in the UI, varying weight/size instead of introducing a second family.
- **Do** apply `font-variant-numeric: tabular-nums` to any new numeric/money column so figures align.
- **Do** color P/L and pass/fail state with the three semantic colors (positive/negative/neutral-warn) tied to actual sign only, and color both the cell/pill background and the text/figure itself for calendar-style sign displays, matching the shipped `.calendar-cell.positive .calendar-pl` pattern.
- **Do** give focus states a visible ring (2px outline, or a 3px accent-tinted box-shadow halo on form fields) rather than a color-only change.
- **Do** keep placeholder/empty-state text at `--text-secondary` contrast, not `--text-disabled`.

### Don't:
- **Don't** remove the border/shadow/radius from `.card` or reintroduce a flat, hairline-only "ruled" surface — that was the prior direction and is no longer the system.
- **Don't** use the accent as a large fill (row, page, or card background) — every incumbent use is text, a thin ring, or a light (≤16%) tint.
- **Don't** introduce a second typeface (serif, display face, or a distinct mono/label face) — the system is Inter end to end by deliberate choice, not oversight.
- **Don't** revert to uppercase, heavily letter-spaced labels — the shipped label style is sentence-case at 500 weight, no forced text-transform.
