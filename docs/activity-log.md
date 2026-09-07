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

## Phase 8 - UX refinement pass
- Dashboard calendar (`dashboard.js`) is now navigable (prev/next month buttons, `calendar-header`/`calendar-nav`), instead of being hardcoded to the current real-world month. Profit/loss cell tint bumped from 10%/25% to 16%/32% (`app.css`) so a profitable day reads clearly at a glance.
- Net P/L stat now gets a distinct `.neutral-info` (accent-blue) color when there are zero trades, instead of reusing the amber breakeven/warning color for an empty state that isn't actually a warning.
- Trade/Journal "New" flow no longer eagerly creates a DB record on click: `renderDetail` now accepts a draft object with no `id`, shows a single "Save" action (trades) or auto-creates fluidly on first blur/paste (journal, matching its new doc-like feel), and Export/Delete only appear once a record actually exists. Removed the manual "Breakeven" checkbox from the Trade form (`is_breakeven` still exists in the schema, `#[serde(default)]` now, and win/loss classification derives purely from `net_pl` sign); dropped it from the seed field-def list in `db.rs` for new installs.
- Symbol, Session (Trades) and Type (Journal) are now `<input list>` (datalist) fields, suggesting previously-used values from the already-loaded trade/journal list client-side - no new backend command.
- Journal entries (`journal.js`) are rewritten as a single freeform `contenteditable` stream (title + auto-stamped, non-editable date + type + inline content/images) instead of a separate title/date/content/screenshot-gallery form, per the user's "more like a word document" request. Screenshots are still saved as real files via the existing `save_attachment`/`attachments` table (not blobbed into the DB) - the `content` column only keeps a `data-attachment-id` reference per image, resolved back to a `data_url` for display (`resolveImages`) and re-resolved in `export.js` for PDF export; orphaned attachments (image deleted from the doc) are cleaned up on save. Paste and drag-drop both insert inline via `document.execCommand('insertHTML', ...)`; no rich-text toolbar (bare/paste-only, matching the app's dependency-light philosophy).
- Settings (`settings.js`): custom-field "kind" dropdown and the read-only kind column now show plain labels (`KIND_LABELS`: "Yes / No", "Choice list", "Paragraph", etc.) instead of raw type names (`boolean`, `enum`, `long_text`). Theme control replaced the `system/light/dark` text `<select>` with a segmented icon toggle (sun/moon/monitor, sliding highlight) - new `sun`/`moon`/`monitor` entries added to `icons.js`.
- General spacing: button rows following form/detail content now use a shared `.detail-actions` class (`margin-top: var(--space-6)`) instead of an inline `margin-top:16px`, for clearer separation between content and actions app-wide.

## Phase 9 - Post-test-pass fixes
- Net P/L zero-trades color was accidentally tied to `--accent` (user-customizable) - moved to a new fixed `--info` token (navy blue, independent of the user's chosen accent color) so it stays blue regardless of accent choice.
- Calendar nav buttons moved to flank the month label directly (`‹ September 2026 ›`) instead of being grouped together after it.
- Added a fixed 9-color tag palette (`--tag-gray/brown/orange/yellow/green/blue/purple/pink/red` in `tokens.css`) and a `.tag-pill` component, used everywhere Symbol/Session/Journal-Type render (table cells, journal cards, the picker itself) - addresses "color coding for the tags."
- Replaced the native `<input list>` datalist for Symbol, Session, and Journal Type with a custom `tag-select.js` component: a styled trigger showing a colored pill, opening a floating searchable panel ("Search for an option... / Select an option or create one") with inline color-cycle and delete per option, matching the user's reference screenshot. Colors and option lists persist on the existing `field_defs.options` JSON column (schema already had a `{value, color}` comment reserved for this - no migration needed). Skipped drag-to-reorder (options stay in creation order) and a full swatch-grid color picker (recolor cycles one step per click instead) - both explicitly deferred by the user to keep scope down; upgrade paths are there if wanted later.
- Replaced all three native `confirm()` calls (delete trade, delete journal entry, delete custom field) with a shared `confirm-dialog.js` styled modal (`--shadow-md`, matches app chrome) instead of the unstyled OS dialog.
- `db.rs` seed defaults: Symbol/Session now seed as `tag` kind (was `text`) for new installs, matching the new picker; existing installs are unaffected (only shows as a cosmetic kind-label difference in Settings, the picker itself doesn't depend on the stored `kind` string).
