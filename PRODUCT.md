# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: discretionary traders who journal their trades and backtesting sessions and want structured logs, calendar P/L, and dashboard stats without a Notion-based workflow. Originally built for the developer's own personal use; the product direction is now to scale it for other traders too, so the UI should not assume a single hardcoded persona but should stay usable and clear for a broader trading audience.

## Product Purpose

EdgeBook is a local-first desktop app for trade journaling: structured trade logs, freeform journal notes with inline chart screenshots, a performance dashboard, and a calendar of daily P/L. It replaces a Notion-based workflow that had two core problems: copy-paste from table cells drops embedded images, and export tooling is gated behind paid plans. Success means screenshots and notes always travel together, and exporting a clean PDF (single entry, date range, or full journal) is trivial and reliable.

## Positioning

Runs entirely local-first: real files (SQLite + filesystem, no blobs) that the user can back up or move by copying one folder, no account/cloud/server dependency, and no fields hardcoded in the UI — every field on Trade and Journal entries is user-defined/renameable. Built to stay lightweight (Tauri, not Electron) so it runs comfortably on weak hardware, versus notebook/SaaS journaling tools that assume always-on internet and a subscription.

## Operating Context

- Desktop app (Tauri + Rust backend, HTML/CSS/JS frontend in the OS webview), packaged as a native Windows installer (msi/nsis) today; Mac/Linux out of scope for now.
- Navigation: Dashboard (stats + calendar + objectives), Trades (structured log), Journal (freeform notes), Settings (field/tag customization, data folder, export defaults).
- Screenshots are pasted (Ctrl+V) or attached via file picker directly onto Trade/Journal entries; content is a plain textarea (not rich/WYSIWYG) with the same paste-to-attach flow.
- PDF export renders a print-styled HTML document and calls the OS print dialog ("Save as PDF"), for single entry, date range, or all entries.
- Entire `EdgeBook/` data folder (db + attachments + exports) is user-relocatable and self-contained.

## Capabilities and Constraints

- Trade fields: date, symbol, position (long/short), session, net P/L, breakeven override, confluences, narrative, emotions, attachments, plus unlimited custom fields (JSON). Win/loss derived from net P/L sign unless breakeven is manually flagged.
- Journal entries: title, date, type (customizable colored tag), freeform content with inline images, plus custom fields.
- Objectives: label, target value, comparison (min/max/exact), computed live from trade data, pass/fail.
- Dashboard stats computed client-side from the in-memory trade list (win rate, net P/L, profit factor, etc.) — no server-side aggregation, since data volume for a personal/small-team journal stays small.
- Discipline Score is currently a placeholder formula (plain pass-rate over active objectives); exact weighting is an open product decision.
- No multi-device sync, no cloud backup, no live broker integration, no built-in chart annotation tool (screenshots are pasted pre-annotated) — all by design for v1.
- No accessibility requirement has been specified beyond general good practice.

## Brand Commitments

App name ("EdgeBook") and icon are fixed. Visual direction: the user rejected a themed visual world ("The Ledger", a bookkeeper's-account-book concept) in favor of the category standard, played straight — a clean, minimal, modern product UI, craft-level bar set to **Linear + Notion** (crisp neutral surfaces, restrained accent color, tight type hierarchy, subtle borders over shadows, calm productivity-tool craft). This is a standing preference for future visual work on this app, not a one-off.

## Evidence on Hand

- Full PRD at `documents/EdgeBook-PRD.md` (data model, feature detail, non-functional requirements).
- Build history in `docs/activity-log.md` — Phases 1-7 (scaffold through packaging) are complete; app currently builds a working Windows installer.
- No real trade data, testimonials, or case studies to display — do not fabricate sample content beyond clearly-labeled placeholder/demo data.

## Product Principles

- No fields hardcoded in the UI — Trade and Journal entries must stay fully user-customizable (add/rename/reorder/hide).
- Screenshots and notes must never be separable — every image-carrying flow (paste, attach, export) keeps them attached to their entry.
- Stay lightweight and fast — avoid heavy frontend dependencies or patterns that would hurt startup time / idle footprint on weak hardware.
- Local-first and portable — no design decision should assume network access or imply cloud storage.
- Now designing for a broader trader audience, not just the original single user — avoid overly personal/idiosyncratic UI choices that wouldn't generalize.
