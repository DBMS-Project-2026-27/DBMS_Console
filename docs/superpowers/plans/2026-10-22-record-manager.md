# Database Operations Implementation Plan

Goal: Add a standalone database operations section similar to the user's alumni SQL console and refresh the whole frontend's colours.

Architecture: Keep the SQL editor, explorer, history, and results. Place Database Operations below the console, with ADD/UPDATE/DELETE tabs, a schema-driven form, and a Generated SQL panel. Validate previews on the backend without modifying data, then execute the same structured input with bound parameters. Require complete primary keys for updates/deletes, support composite keys, and keep generated fields automatic. Use charcoal surfaces, teal actions, amber highlights, and readable muted text throughout.

Tech stack: Existing React 18, Express 4, pg, Vite, node:test, local PostgreSQL, Playwright browser verification.

- [x] Add PostgreSQL API tests for metadata, defaults, constraints, validation, composite keys, preview without writes, and targeted mutations.
- [x] Extract injectable Express application and implement metadata-aware CRUD plus SQL preview routes.
- [x] Build operation tabs and table selector, Add form, Update key/field/value form, Delete key form, Preview/Reset/Execute flow, delete confirmation, error and affected-record output.
- [x] Invalidate old previews on edits, block repeated execution, and disable ambiguous operations on tables without primary keys.
- [x] Refresh colours across all frontend panels and verify the responsive two-panel layout.
- [x] Update README with actual React/Express/PostgreSQL setup, API details, and operation instructions.
- [x] Run final PostgreSQL tests, production build, desktop/mobile browser checks, and diff review.
- Publish the verified changes to main as requested.
