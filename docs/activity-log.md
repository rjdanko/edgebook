# Activity Log

## Phase 3 - Journal core
- Added `src-tauri/src/journal.rs`: CRUD commands mirroring `trades.rs` (list/create/update/delete), reusing `attachments::delete_all_for_owner` on delete.
- Registered commands in `lib.rs`.
- `src/js/journal.js`: card-list view + detail editor (title/date/type/content textarea), reusing `mountAttachments` for screenshots, same as Trade detail.
- Content is a plain textarea, not a rich/WYSIWYG editor - matches the existing Trade narrative field pattern and keeps inline images to the same paste-to-attach flow already built for Trades, instead of a contentEditable rich-text engine.

## Phase 4 - Dashboard
- Added `src-tauri/src/objectives.rs`: read-only `list_objectives`.
- Stats (win rate, net P/L, profit factor) and the monthly calendar are computed client-side in `dashboard.js` from `listTrades()` - no new Rust aggregation command, since the frontend already has the full trade list in memory and trade volume for a personal journal is small.
- Objective pass/fail and Discipline Score: `comparison` field decides pass rule (`min` -> current >= target, `max` -> current <= target, `exact` -> equality). Discipline Score = plain pass-rate over active objectives. This is a placeholder formula (the PRD leaves the exact Discipline/Consistency Score formula as an open question) - revisit if the user wants a weighted version.

## Phase 5 - Customization
- Added `src-tauri/src/field_defs.rs`: CRUD for `field_defs` (default fields can be relabeled/hidden but not deleted; custom fields get an auto-generated `custom_<uuid8>` key).
- Added `update_setting` command (upsert into `settings` table).
- `src/js/custom-fields.js`: shared renderer/reader for custom_fields inputs (text/long_text/number/boolean/date/enum/tag), used by both Trade and Journal detail forms.
- `settings.js`: theme/accent/starting-balance controls + per-entity field manager (add/rename/hide/delete custom fields). No drag-reorder UI - out of scope for v1, sort_order stays as inserted.
- Data-folder relocation (`db::set_data_root`) was scaffolded in Phase 1 but has no Settings UI yet - not called out explicitly in the Phase 5 PRD bullet, left for a fast-follow if needed.

## Phase 6 - Export
- `src/js/export.js` + `export-page.js`: builds a print-styled HTML document (entry fields + embedded screenshot data-URLs) and calls the browser's native `window.print()`, so the user picks "Save as PDF" / "Microsoft Print to PDF" from the OS print dialog.
- Chose this over a `printpdf`-based generator to avoid a new dependency and hand-rolled PDF layout/pagination for something the OS already does reliably (no external libraries unless absolutely necessary, per CLAUDE.md).
- Single-entry export buttons on Trade/Journal detail views; a dedicated Export page handles date-range/all exports across Trades, Journal, or both.

## Phase 7 - Polish & packaging
- Cargo release profile (`codegen-units=1`, `lto`, `opt-level=3`, `panic=abort`, `strip`) was already set in Phase 1.
- Ran `npx tauri build` to produce the Windows installer (msi/nsis) as the packaging deliverable; cross-platform (Mac/Linux) builds are out of scope on this Windows dev machine - PRD's open question on target OS(es) is answered as "Windows first."
