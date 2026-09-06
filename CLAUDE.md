# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Pre-scaffold: only `documents/EdgeBook-PRD.md` exists. No Tauri project, no source tree, no build/test/lint commands yet — the first implementation task is the Phase 1 scaffold below.

## Architecture (per PRD)

EdgeBook is a local-first desktop app for trade journaling (Tauri + Rust backend, HTML/CSS/JS frontend, SQLite, local filesystem for screenshots). Full spec: [documents/EdgeBook-PRD.md](documents/EdgeBook-PRD.md).

- **App shell:** Tauri (Rust core + OS webview) — chosen over Electron for footprint (target <150MB idle, <2s startup).
- **Backend (Rust):** file I/O, SQLite access (`rusqlite`), PDF generation, stats calculations.
- **Frontend:** dependency-light HTML/CSS/JS in the OS webview.
- **Data:** SQLite (`edgebook.db`) holds structured data (trades, journal entries, objectives, field defs); screenshots are stored as real files under `attachments/{trades,journal}/{id}/`, referenced by path, not blobbed. Entire `EdgeBook/` data folder is user-relocatable and self-contained for backup/portability.
- **Core entities:** Trade, Journal Entry, Objective, Tag/Field Definitions — all support user-defined custom fields (`custom_fields` JSON column) since no fields are hardcoded in the UI.
- **Build order:** scaffold -> trade log CRUD -> journal CRUD -> dashboard/stats -> settings/customization -> PDF export -> packaging. Follow this sequence (§9 of the PRD) rather than jumping ahead.

## General Principles

- Generate concise, short solutions for new modules or code.
- Watch for over-engineering, oversized files needing refactor.
- Watch for weird syntax/style mismatching rest of codebase.
- Watch for obvious bugs.
- Prioritize concise, precise code and docs changes.
- No emojis or special characters in comments.
- Write activity-log.md in /docs to refer back if confused.
- Make to-do list, run major changes by user first.
- Review existing files before refactor or change.
- Markdown files use kebab naming (ex. some-description-changes.md).
- Don't auto-commit activity logs and docs.
- Comments: one-liner, one sentence.

## Code Quality

- Right data structures and algorithms for problem.
- Don't expose data needlessly (least privilege).
- No external libraries unless absolutely necessary.
- Use project dependency file for correct versions.
- Avoid redundancy unless improves usability.

## Version Control

- Commit after significant changes, clear messages.
- Keep commits focused, atomic.
- No auto-push any branch.

## AI Restrictions

- No customer personal data - names, contacts, account numbers, transactions (unless approved exemption).
- No credentials - passwords, API keys, tokens, connection strings.
