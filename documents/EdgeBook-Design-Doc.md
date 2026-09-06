# EdgeBook — Design Document

**Version:** 1.0 (Draft for Claude Code implementation)
**Companion to:** EdgeBook-PRD.md
**Status:** Ready for review

---

## 1. Design Philosophy

EdgeBook should feel like a calm, personal productivity tool that happens to be about trading — not a flashy "trading terminal" and not a generic SaaS dashboard. The bar is Notion and Linear: quiet surfaces, restrained color, clear type hierarchy, and generous-but-not-wasteful spacing. Nothing should compete for attention except the data itself. Red and green (for P/L) are the only colors allowed to carry real meaning by default — everything else stays neutral so those two colors stand out immediately.

Guiding principles:
- **Calm first.** Borders and whitespace do the organizing, not color or heavy shadows.
- **Data is the hero.** Numbers, tags, and charts should never compete with decorative UI chrome.
- **Consistent density.** Every table, card, and list follows the same spacing rhythm — no section feels cramped next to another that feels sparse.
- **Customizable, not opinionated.** The accent color and fields are user-editable; the design system needs to hold up no matter what accent color is chosen.

---

## 2. Color System

### 2.1 Light mode (default)

| Token | Hex | Usage |
|---|---|---|
| `bg-canvas` | `#FFFFFF` | App background |
| `bg-surface` | `#F7F7F5` | Sidebar, cards, table headers |
| `border-subtle` | `#E9E9E7` | Dividers, card borders, table gridlines |
| `text-primary` | `#1F1F1F` | Headings, primary content |
| `text-secondary` | `#6B6B68` | Labels, metadata, muted text |
| `text-disabled` | `#B8B8B5` | Placeholder text, empty states |
| `accent-default` | `#2A9D8F` (muted teal) | Links, active nav item, primary buttons, focus rings — **user-customizable in Settings** |
| `positive` | `#1E8E5A` (muted green) | Profit, wins, "pass" indicators |
| `negative` | `#D1453B` (muted red) | Loss, "fail" indicators |
| `neutral-warn` | `#B8860B` (muted amber) | Breakeven, warnings |

### 2.2 Dark mode

| Token | Hex | Usage |
|---|---|---|
| `bg-canvas` | `#191919` | App background |
| `bg-surface` | `#202020` | Sidebar, cards, table headers |
| `border-subtle` | `#2F2F2F` | Dividers, borders |
| `text-primary` | `#EDEDEC` | Headings, primary content |
| `text-secondary` | `#9B9B98` | Labels, metadata |
| `text-disabled` | `#5C5C5A` | Placeholder text |
| `accent-default` | `#4FBDAF` (brightened teal for dark bg) | Same roles as light mode |
| `positive` | `#4CAF7D` | Brightened for dark-bg contrast |
| `negative` | `#E5675F` | Brightened for dark-bg contrast |
| `neutral-warn` | `#D4A017` | Brightened for dark-bg contrast |

**Accent customization:** Settings exposes a single "Accent color" swatch picker. Whatever color is chosen replaces `accent-default` app-wide (nav highlight, buttons, links, active tab underline, focus states) — it never touches `positive`/`negative`, which stay reserved for P/L semantics regardless of accent choice.

### 2.3 Color usage rules

- Green/red are reserved exclusively for win/loss/pass-fail meaning — never used decoratively.
- Tag pills (Journal `type` field) use low-saturation background tints derived from a small fixed palette (not the accent color), so tags stay visually distinct from interactive/accent elements.
- No gradients. Flat fills only, consistent with the calm/Notion-like direction.

---

## 3. Typography

**Font:** System font stack — no custom typeface, per direction to keep it plain and clean.

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

Numbers (P/L values, dates, statistics) use the same system stack — no monospace treatment, per feedback to keep typography simple rather than adding technical texture.

### Type scale

| Level | Size | Weight | Usage |
|---|---|---|---|
| Display | 28px | 600 | Page titles ("Dashboard", "Trades") |
| Heading | 18px | 600 | Section headers ("Statistics", "Objectives") |
| Body | 14px | 400 | Table content, form fields, paragraph text |
| Label | 13px | 500 | Field labels, table column headers |
| Caption | 12px | 400 | Metadata, timestamps, helper text |

Line height: 1.5 for body text, 1.3 for headings. Line length in journal entry content capped around 70–75 characters for readability.

---

## 4. Layout & Spacing

**Spacing scale (4px base unit):** 4, 8, 12, 16, 24, 32, 48px — used consistently for padding, gaps, and margins throughout.

**Sidebar:** Fixed width 240px, `bg-surface`, containing nav items (Dashboard / Trades / Journal / Settings) with icon + label. Active item indicated by accent-colored left border + tinted background, not by a filled icon or bold text alone.

**Main content area:** Max content width ~1100px, centered, with 32px outer padding. This keeps tables and cards from stretching uncomfortably wide on large monitors while still feeling native/full-window on smaller ones.

**Density target ("balanced — Notion-like"):**
- Table rows: 40px height, 12px horizontal cell padding.
- Cards: 20px internal padding, 16px gap between cards in a grid.
- Section spacing: 32px between major dashboard sections (e.g. between Statistics and Calendar).

This sits between a spacious single-focus layout and a dense terminal — enough breathing room to feel calm, but multiple stat cards and a full calendar month should still fit on one screen without scrolling on a standard 1080p display.

---

## 5. Components

### 5.1 Cards (Statistics, Discipline Score)
- `bg-surface`, 1px `border-subtle`, 8px border radius.
- No drop shadow — border does the separation, consistent with the flat/calm direction.
- Stat cards: label (Caption style, `text-secondary`) above a large value (Display style, `text-primary`), optional small trend indicator in `positive`/`negative`.

### 5.2 Discipline Score gauge
- Semi-circular gauge, banded red → amber → green across the arc (fixed semantic colors, not tied to accent).
- Center value in Display size, qualitative label (e.g. "Very Good") in Body size beneath it.

### 5.3 Tables (Trades, Daily Summary, Objectives)
- Header row: Label-style text, `text-secondary`, `bg-surface`, bottom border only.
- Row hover: subtle `bg-surface` tint, no border color change.
- Numeric columns (P/L, etc.) right-aligned; text columns left-aligned.
- Pass/fail and win/loss indicated with a small colored dot or check/x icon plus color, never color alone (accessibility).

### 5.4 Calendar
- 7-column grid, each day cell showing the date (Caption, `text-secondary`) and that day's net P/L (Body/Label weight, colored `positive`/`negative`; empty days show no value, not a zero).
- Today's cell gets an accent-colored ring, not a filled background (keeps semantic colors unambiguous).
- Month navigation (prev/next/today) as plain text/icon buttons in the calendar header, matching the Notion reference style.

### 5.5 Tags/Pills (Journal type, custom tag fields)
- Rounded-full pill, 4px vertical / 10px horizontal padding, Caption-size text.
- Background from a small fixed set of muted tints (not accent-driven), auto-assigned per tag with manual override available in Settings.

### 5.6 Buttons
- Primary: filled accent background, white text, 6px border radius.
- Secondary: `bg-surface` background, `border-subtle` border, `text-primary` text.
- No all-caps labels, no icon-only primary actions without a text label (clarity over minimalism for a personal tool used daily).

### 5.7 Forms / Entry detail views
- Field label above input (Label style), input below (Body style) — matches the "Properties" list style from the user's Notion trade page.
- Empty fields show `text-disabled` placeholder text ("Empty"), matching the familiar Notion pattern the user already expects.

### 5.8 Journal content editor
- Supports bullet + nested sub-bullet blocks and inline images placed at the cursor position within the flow of text (matching the user's current annotated-chart-under-a-bullet workflow).
- Pasted images render at a constrained max-width within the content column, click to view full size.

---

## 6. Iconography

- Simple line icons (1.5px stroke), no filled/duotone style — matches the plain, non-decorative direction.
- Icons always paired with text labels in navigation; icon-only usage limited to small inline actions (delete, close, expand) where the action is unambiguous from context.

---

## 7. Motion

- Minimal, functional only: 120–150ms ease-out for hover states, tab switches, and panel open/close.
- No entrance animations on page load, no scroll-triggered effects — consistent with a calm productivity tool rather than a marketing site.
- Dark/light mode toggle transitions with a quick (150ms) cross-fade rather than an instant snap.

---

## 8. Accessibility

- All color-coded meaning (win/loss/pass-fail) paired with a non-color signal (icon, +/- sign, or label).
- Minimum contrast ratio 4.5:1 for body text against its background in both themes.
- Visible keyboard focus states using the accent color as an outline/ring.
- Respect reduced-motion OS setting — disable the theme cross-fade and hover transitions if set.

---

## 9. Reference Direction

Closest visual comparables: **Notion** (calm surfaces, restrained color, Properties-style detail views) and **Linear** (clean type hierarchy, subtle borders over shadows, disciplined spacing). EdgeBook should read as a natural sibling to both — recognizable as "that kind of app" — without copying either's specific chrome or branding.

---

*End of design doc draft — pending review.*
