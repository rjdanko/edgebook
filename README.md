# EdgeBook

A desktop trade journal built with Tauri and SQLite. No account, no cloud, no subscription: everything lives in one folder on your machine.

I built this to replace a Notion setup that kept breaking in two specific ways: pasting a table into a doc drops the embedded screenshots, and the export tools I actually needed were behind a paid plan. EdgeBook keeps screenshots attached to the entry they belong to and exports to PDF through the OS print dialog, no paywall involved.

## What it does

- **Trade log** - date, symbol, long/short, session, net P/L, confluences, narrative, emotions, screenshots, plus any custom fields you add.
- **Journal** - freeform entries with inline pasted screenshots (Ctrl+V or file picker), tagged by type.
- **Dashboard** - win rate, net P/L, profit factor, and other stats computed from your trades, plus a calendar view of daily P/L.
- **Objectives** - set a target (min, max, or exact) for any stat and see it pass or fail against your actual data.
- **Custom fields** - nothing on Trade or Journal entries is hardcoded. Add, rename, reorder, or hide fields from Settings.
- **PDF export** - single entry, a date range, or everything, rendered as print-ready HTML.

## Why Tauri instead of Electron

Idle memory and startup time matter more to me than cross-platform breadth right now. A Rust core with the OS webview keeps the app under 150MB idle and starting in under 2 seconds, which an Electron shell running two Chromium copies wasn't going to hit. The tradeoff is Windows-only for now; Mac and Linux aren't built or tested.

## Data and storage

Everything lives under one `EdgeBook/` folder:

- `edgebook.db` (SQLite, via `rusqlite`) holds trades, journal entries, objectives, and field definitions.
- Screenshots are saved as real files under `attachments/{trades,journal}/{id}/` and referenced by path. Nothing gets blobbed into the database.

Move or back up that one folder and you have the whole app's data. There's no server, no sync, and no telemetry.

## Stack

- **Backend:** Rust (Tauri 2), `rusqlite`, `chrono`, `uuid`, `serde`
- **Frontend:** plain HTML/CSS/JS in the OS webview, no framework
- **Database:** SQLite
- **Packaging:** MSI and NSIS installers via `tauri build`

## Status

Phases 1 through 7 of the build (scaffold, trade log, journal, dashboard, customization, PDF export, packaging) are done, and a release build produces working Windows installers. See `docs/activity-log.md` for the build history and `documents/EdgeBook-PRD.md` for the full spec.

This is a personal project I'm now shaping for other discretionary traders, not just my own workflow, so some UI and defaults are still settling.

## Running it

```
npm install
npm run tauri dev
```

Requires the Rust toolchain and the Tauri 2 prerequisites for your platform (see the [Tauri docs](https://tauri.app/start/prerequisites/)).

## Building an installer

```
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/`.

## Known limitations

No multi-device sync, no cloud backup, no live broker integration, and no built-in screenshot annotation (paste screenshots pre-annotated). All of that is intentional for v1, not an oversight.

## License

Not yet decided.
