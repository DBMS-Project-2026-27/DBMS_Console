# Database connectivity examples

These runnable Node.js examples verify the PantryGraph Console connections to Neon PostgreSQL and Neo4j Aura. They use the same `.env` variable names and drivers as the application, make only a read-only `SELECT 1` / `RETURN 1` check, and never print connection strings or passwords.

## Setup and run

From the `Project 2/` folder, make sure dependencies are installed and `.env` contains the connection settings. Then run either database check or both:

```bash
npm run check:postgres
npm run check:neo4j
npm run check:databases
```

The check exits with a non-zero status if the requested database is not configured or cannot be reached. The environment variable names and meanings are documented in the [main README](../README.md).

## Source files

- `postgres.js` — creates a short-lived `pg` pool, begins a read-only transaction, runs `SELECT 1`, then closes the pool.
- `neo4j.js` — opens a Neo4j driver session in read mode, runs `RETURN 1`, then closes the session and driver.
- `check-postgres.js`, `check-neo4j.js`, `check-databases.js` — command-line entry points for the checks.

The production API has its own long-lived connection services in [`server/services/postgres.js`](../server/services/postgres.js) and [`server/services/neo4j.js`](../server/services/neo4j.js). Those are used by the web console; these examples are standalone diagnostics.
