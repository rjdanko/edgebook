# EdgeBook — Product Requirements Document

**Version:** 1.0 (Draft for Claude Code implementation)
**Owner:** [User]
**Type:** Local-first desktop application
**Status:** Ready for development

---

## 1. Summary

EdgeBook is a lightweight desktop app for tracking trading/backtesting sessions: structured trade logs, freeform journal notes with inline chart screenshots, a dashboard of performance statistics, and a calendar view of daily P/L. It replaces a Notion-based workflow that has two core problems: copy-paste from table cells drops embedded images, and export tooling is gated behind paid plans.

EdgeBook stores all data as real local files (images, notes, and a local database) on the user's machine, runs natively via a small installer, and is built to feel instant even on low-spec hardware. Its standout capability versus the old workflow is one-click, reliable export to PDF — of a single entry, a date range, or the whole journal — for feeding into an LLM for analysis.

---

## 2. Goals

- Replicate the useful parts of the user's current Notion setup (trade log, journal notes, calendar, dashboard stats) as native local software.
- Guarantee that screenshots + notes travel together — no more images getting dropped on copy/export.
- Make PDF export trivial and reliable: single entry, date range, or full journal.
- Keep the app lightweight: fast startup, low memory/CPU footprint, runs comfortably on weak/older PCs.
- Let the user customize fields on both Trade and Journal Note entries — defaults ship out of the box, but nothing is hardcoded.
- Store everything locally as plain files + a local database. No account, no cloud, no server dependency.

## 3. Non-Goals (for v1)

- No multi-device sync or cloud backup (user can manually back up the local folder).
- No mobile app.
- No multi-user / collaboration features (comments, sharing).
- No live broker/exchange integration — trade data is entered manually.
- No built-in charting/annotation tool — screenshots are pasted in already-annotated (as the user already does in TradingView/etc.).

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| App shell | **Tauri** (Rust core + OS native webview) | Installer typically <10MB, low idle RAM, no bundled Chromium — runs well on weak hardware. Alternative (Electron) rejected for being 15-30x heavier. |
| Backend logic | **Rust** | File I/O, SQLite access, PDF generation, stats calculations. Claude Code will author this; deep Rust knowledge not required from the user. |
| Frontend UI | **HTML/CSS/JS** (vanilla or a minimal framework, e.g. lightweight reactive lib) | Renders in the OS webview. Should stay dependency-light to preserve startup speed. |
| Local database | **SQLite** (via `rusqlite` or similar) | Structured data (trades, journal entries, objectives, custom field defs) for fast stats/calendar aggregation without parsing files on every load. |
| File storage | **Local filesystem** | Screenshots stored as real `.png`/`.jpg` files; DB stores paths/references, not blobs. |
| PDF export | **Local Rust PDF generation crate** (e.g. `printpdf` or headless-webview print-to-PDF) | Bundles entry text + images into a clean PDF, no internet dependency. |
| Packaging | **Tauri bundler** (per-OS installer) | Produces a native installer (.msi/.exe on Windows, .dmg on Mac, etc.) |
| Dev tool | **Claude Code** | Builds, tests, and packages the app iteratively via terminal access. |

---

## 5. Information Architecture

Primary navigation (left sidebar, matching the user's existing mental model from Notion):

1. **Dashboard** — landing view, stats + calendar + objectives
2. **Trades** — structured trade log (table view)
3. **Journal** — freeform session notes list
4. **Settings** — customize fields, tags, data folder location, export defaults

---

## 6. Data Model

### 6.1 Trade

Default fields (all user-editable — can rename, remove, reorder, or add custom fields):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Internal |
| `date` | Date | |
| `symbol` | Text | e.g. "XAUUSD" |
| `position` | Enum (Long / Short) | |
| `session` | Text | e.g. "London", "NY" |
| `net_pl` | Number (currency) | Drives win/loss/breakeven and all stats |
| `is_breakeven` | Boolean | Manual override — a trade can net ~$0 and still be flagged breakeven explicitly |
| `confluences` | Long text | |
| `narrative` | Long text | The reasoning/thesis behind the trade |
| `emotions` | Long text | |
| `attachments` | Image[] | One or more chart screenshots, pasted via Ctrl+V or file picker |
| `custom_fields` | JSON | User-defined additional fields |

`is_win` / `is_loss` are derived from `net_pl` sign (not stored redundantly), with `is_breakeven` as a manual override that takes precedence.

### 6.2 Journal Entry

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `title` | Text | e.g. "July 6–10 – Week Review" |
| `date` | Date | |
| `type` | Tag (customizable, colored) | e.g. "Daily Market Analysis", "Backtesting", "Weekly Market Review" |
| `content` | Rich text block list | Supports bullet points, nested sub-bullets, and inline images placed anywhere within the text (matching the user's current Notion layout, where an annotated chart sits directly under a bullet point) |
| `custom_fields` | JSON | User-defined additional fields |

### 6.3 Objective (trading rule, shown on Dashboard)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `label` | Text | e.g. "Minimum 4 trading days", "Max daily loss" |
| `target_value` | Number | e.g. -$500 |
| `comparison` | Enum (min / max / exact) | Determines pass/fail logic |
| `computed_result` | Derived | Calculated live from Trade data over the selected period |
| `status` | Derived (Pass / Fail) | Green check / red X |

### 6.4 Tag / Field Definitions (Settings)

Stores user customizations: which fields exist on Trade and Journal Entry, their order, display names, and colors for tag-type fields. Defaults are seeded on first launch but fully editable.

### 6.5 Local File Structure

```
EdgeBook/                      (root data folder, user-configurable location)
├── edgebook.db                (SQLite — trades, journal entries, objectives, field defs)
├── attachments/
│   ├── trades/{trade_id}/     (screenshot files for that trade)
│   └── journal/{entry_id}/    (screenshot files for that entry)
└── exports/                   (generated PDFs land here by default)
```

---

## 7. Feature Detail

### 7.1 Dashboard

- **Discipline Score** — a gauge (0–100%, red→yellow→green bands) with a qualitative label (e.g. "90% Very Good"). Computed from objective pass rate over the selected period (exact formula to be finalized during build — likely a weighted pass ratio across active Objectives).
- **Objectives table** — Label / Target / Result / Pass-Fail icon, per §6.3.
- **Statistics cards** — Equity, Balance, Win rate, Average profit, Average loss, Number of trades, Loss count, Sharpe ratio, Average R:R, Consistency score, Profit factor. All computed from the Trade table.
- **Daily Summary table** — Date / Trades count / Lots / Result ($), scrollable, most recent first.
- **Monthly calendar** — each day cell shows that day's net P/L (colored red/green by sign), with a monthly total and prev/next/today navigation. Clicking a day filters/jumps to that day's trades and journal entries.
- **Tabs** to switch the calendar panel between Daily P/L view, a combined notes/trades list, and a Charts view (placeholder for v1 — can scope down to just the calendar + list if charts add too much time).

### 7.2 Trades (structured log)

- Table view of all trades (Date, Name/Symbol, Net P/L, Position, Symbol, custom columns).
- Filter tabs: All Trades / Profit / Loss / Breakeven.
- Row count and sum of P/L shown at the bottom of the filtered view.
- Click a row to open the full Trade detail (all fields + attachments), matching the "New Trade" detail view the user showed.
- Add/paste multiple chart screenshots per trade.

### 7.3 Journal (notes log)

- List view of journal entries (Title, Date, Type tag).
- Click an entry to open the full note: title, type tag, and rich content with inline images and bullet/sub-bullet structure.
- Paste screenshots directly into the content at the cursor position (matching current Notion workflow — annotated chart images pasted inline with surrounding bullet commentary).

### 7.4 Customization (Settings)

- Add, remove, rename, and reorder fields on both Trade and Journal Entry.
- Manage tag options and colors for tag-type fields (e.g. Journal `type`).
- Set the local data folder location.
- Set default export behavior (e.g. default export folder).

### 7.5 Export

- Export scope options: **Single entry**, **Date range**, **All entries** — user's choice each time, applies to both Trades and Journal Notes (or a combination).
- Output: a clean, readable PDF with entry metadata, notes, and all attached images in place — generated locally, no browser print dialog dependency.
- Default save location: `EdgeBook/exports/`, with a file save dialog to choose elsewhere.

---

## 8. Non-Functional Requirements

- **Startup time:** under ~2 seconds on modest hardware.
- **Idle memory footprint:** target under ~150MB (Tauri baseline is far below Electron's typical 300MB+).
- **No internet dependency** for core functionality (entry, export, stats). 
- **Data durability:** all writes go to local SQLite + filesystem; no in-memory-only state that could be lost on crash. Autosave on field blur / after paste actions.
- **Portability:** the entire `EdgeBook/` data folder should be self-contained, so the user can copy it to back up or move machines.

---

## 9. Suggested Build Phases (for Claude Code)

1. **Scaffold** — Tauri project setup, SQLite integration, basic window with sidebar nav (Dashboard / Trades / Journal / Settings) rendering static placeholders.
2. **Trade log core** — CRUD for Trades, table view with filters, detail view, image paste/attach + local file storage.
3. **Journal core** — CRUD for Journal Entries, list view, rich content editor with inline image paste.
4. **Dashboard** — Statistics calculations, calendar view with daily P/L coloring, Objectives table, Discipline Score.
5. **Customization** — Settings screen for field/tag management, wiring custom fields through Trade/Journal forms.
6. **Export** — PDF generation for single/range/all, file save flow.
7. **Polish & packaging** — performance pass on low-end hardware, installer builds per OS.

---

## 10. Open Questions (to resolve before or during build)

- Exact formula for **Discipline Score** and **Consistency score** — needs a concrete definition (e.g. weighted average of objective pass rate + trading-day adherence?).
- Whether **Sharpe ratio** is meaningful/desired for a discretionary manual trade log at this stage, or a placeholder for later.
- Whether the **Charts tab** (equity curve, PnL by month/week charts seen in the Notion template) is in scope for v1 or a fast-follow.
- Target OS(es) for the initial build — Windows only, or Windows + Mac?

---

*End of PRD draft — pending review.*
