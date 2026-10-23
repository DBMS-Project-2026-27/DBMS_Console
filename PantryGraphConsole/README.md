# PantryGraph Data Console

A local developer console for exploring an existing online grocery platform across Neon PostgreSQL and Neo4j Aura. The app does not create, seed, or migrate either database.

## Current status

The React/Vite workspace shell and Express API support read-only health checks, live schema inspection, Neon SQL queries, and Neo4j Cypher queries. PostgreSQL queries run in read-only transactions; Neo4j queries use read transactions. Both workspaces support JSON parameters and cap records returned to the browser at 500.

## Requirements

- Node.js 20.19+ or 22.12+
- Credentials for the existing Neon PostgreSQL and Neo4j Aura databases

## Local setup

From the repository root, enter this folder with `cd PantryGraphConsole`, then:

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and enter your own connection details locally.
3. Start the frontend and backend with `npm run dev`.
4. Open the Vite URL printed in the terminal (normally `http://localhost:5173`).

Environment variables:

| Variable | Purpose |
| --- | --- |
| `NEON_DATABASE_URL` | Neon PostgreSQL connection URL |
| `NEO4J_URI` | Neo4j Aura Bolt URI |
| `NEO4J_USERNAME` | Neo4j database username |
| `NEO4J_PASSWORD` | Neo4j database password |
| `NEO4J_DATABASE` | Neo4j database name (defaults to `neo4j`) |
| `APP_PASSWORD` | Private app sign-in password (required in production, at least 24 characters) |
| `PORT` | Express API port (defaults to `3000`) |

Keep `.env` private. Credentials must only be used by the backend and must never be committed or pasted into chat.

## Available scripts

- `npm run dev` — start the Vite frontend and Express API
- `npm run build` — build the frontend for production
- `npm test` — run the query validation and Neo4j serialization unit tests
- `npm start` — start the Express API

The API exposes `GET /api/health`, `GET /api/health/databases`, `GET /api/schema/postgres`, `GET /api/schema/neo4j`, `POST /api/query/postgres`, and `POST /api/query/neo4j`. SQL uses `$1`, `$2`, etc. with parameters supplied as a JSON array. Cypher uses `$name` with parameters supplied as a JSON object. Schema-derived presets appear after opening the Schema tab. Query history stays in the browser's local storage and is not sent to a remote service. Locally, the Express API binds to `127.0.0.1`.

Both query endpoints impose a five-second database statement timeout, a 10,000-character query limit, a 100-parameter limit, and a 500-record response cap. Read-only transactions reject database writes independently of UI or keyword checks.

## Vercel deployment

The Vercel build serves the Vite frontend as static output. Explicit API functions under `api/` delegate to the shared Express app through `api/_handler.js`. Set `PantryGraphConsole` as the Vercel project root when deploying this folder independently. Production requires `APP_PASSWORD`; sign-in uses a short-lived, signed, secure, HttpOnly, SameSite=Strict cookie, and login attempts are throttled. Database connection URLs/passwords are server-only Vercel environment variables. Never place them in `VITE_*` variables or commit `.env` files.

Add `NEON_DATABASE_URL`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, optional `NEO4J_DATABASE`, and `APP_PASSWORD` as Vercel environment variables. Use Sensitive/Secret values for credentials. `.vercelignore` excludes local environment files and workspace artifacts from uploads.
