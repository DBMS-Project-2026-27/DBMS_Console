# Online Grocery Delivery SQL Console

A React and Express SQL console for the existing Neon PostgreSQL database. It does not create, migrate, alter, truncate, or delete database tables.

## Setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` in `.env` to the existing Neon connection string. Do not commit this file.
4. Run `npm run dev` and open the Vite URL shown in the terminal.

## Scripts

- `npm run dev` starts the React app and API together.
- `npm run build` creates a production frontend build.
- `npm test` runs the SQL-request safety tests.

The browser only calls `/api`. The Express server reads `DATABASE_URL`; no credentials are sent to or embedded in frontend code. The query endpoint accepts one `SELECT`, `INSERT`, `UPDATE`, or `DELETE` statement per request. The schema explorer uses PostgreSQL metadata only.
