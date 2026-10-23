# PantryGraph Console

**Live application:** [https://pantrygraph-console.vercel.app](https://pantrygraph-console.vercel.app/)

PantryGraph Console is a private, browser-based workspace for exploring the existing grocery delivery data in PostgreSQL and Neo4j. Sign in with the application access password, select a database, inspect its live schema, and run read-only SQL or Cypher queries. Neo4j results can be viewed as an interactive graph or as a table.

The console connects to existing databases. It does **not** create databases, seed data, change schemas, or migrate data.

## Databases

| Database | Service used | What the console does |
| --- | --- | --- |
| PostgreSQL | Neon serverless PostgreSQL, accessed with the `pg` driver and `pg-cursor` | Checks the connection, reads table, view, column, and constraint metadata, and executes read-only SQL with positional parameters. |
| Graph database | Neo4j Aura, accessed with the official `neo4j-driver` | Checks the connection, reads labels, relationship types, and property metadata, and executes read-only Cypher with named parameters. Node and relationship results are serialized for display in the graph view. |

The two databases are independent connections. Configure the credentials for each database that should be available; the health indicator reports each connection separately.

## Frontend

- **React 19** builds the single-page database workspace.
- **Vite 7** serves the frontend during development and creates the static production build in `dist/`.
- **Cytoscape.js** displays Neo4j nodes and relationships as an interactive graph, with layout switching, fit-to-view controls, and entity details.
- The SQL and Cypher editors accept query text and JSON parameters. Results show columns, rows, query duration, errors, and truncation status. Neo4j graph-shaped results can be switched between graph and table views.
- The Schema tab loads current PostgreSQL tables, views, columns, and constraints, or Neo4j labels, relationship types, and properties from the configured database.
- Query history is kept in that browser’s local storage; the application does not send it to a separate history service.

## Backend and API

The backend is a **Node.js 20.19+ or 22.12+ and Express 5** API. `server/app.js` implements the HTTP routes; `server/services/postgres.js` and `server/services/neo4j.js` own their respective database connections, metadata discovery, query execution, and result formatting. The frontend never receives database connection strings or database passwords.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/status` | Reports whether sign-in is required and whether the current browser session is authenticated. |
| `POST` | `/api/auth/login` | Verifies the configured application password and starts a session. |
| `POST` | `/api/auth/logout` | Clears the current session. |
| `GET` | `/api/health` | Checks that the API is responding. |
| `GET` | `/api/health/databases` | Checks PostgreSQL and Neo4j connectivity separately. |
| `GET` | `/api/schema/postgres` | Returns live PostgreSQL table, view, column, and constraint metadata. |
| `GET` | `/api/schema/neo4j` | Returns live Neo4j labels, relationship types, and property metadata. |
| `POST` | `/api/query/postgres` | Runs a read-only SQL query. Body: `{ "query": "SELECT * FROM review LIMIT $1", "parameters": [25] }`. |
| `POST` | `/api/query/neo4j` | Runs a read-only Cypher query. Body: `{ "query": "MATCH (n) RETURN n LIMIT $limit", "parameters": { "limit": 25 } }`. |

SQL parameters use PostgreSQL placeholders such as `$1` and `$2`, supplied as a JSON array. Cypher parameters use `$name` placeholders, supplied as a JSON object. Use parameters for values instead of inserting user-provided values into query strings.

## Read-only and request limits

Queries run in read-only transactions/access mode. PostgreSQL connections also default to read-only, and the Neo4j driver uses read access and `executeRead`. Database-level safeguards reject write attempts even if a write query is submitted directly to the API. Use a database account with only the read permissions the console needs.

The API limits query text to 10,000 characters, parameters to 100 values, database statement execution to about five seconds, and returned data to 500 records/entities. Responses above the size limit are rejected. These limits help keep requests and rendered results bounded; they do not replace database permissions.

## Sign-in and credentials

For production, set `APP_PASSWORD` in the Vercel project. Sign-in creates a signed, short-lived `Secure`, `HttpOnly`, `SameSite=Strict` session cookie, and repeated failed login attempts are throttled. Do not put database credentials in frontend variables such as `VITE_*`; those variables are included in browser assets.

Configure these environment variables in the local `.env` file for development and in Vercel **Project Settings → Environment Variables** for production:

| Variable | Required | Description |
| --- | --- | --- |
| `NEON_DATABASE_URL` | For PostgreSQL | Neon PostgreSQL connection URL. Keep it server-side. |
| `NEO4J_URI` | For Neo4j | Neo4j Aura connection URI, normally using the secure `neo4j+s://` scheme. |
| `NEO4J_USERNAME` | For Neo4j | Neo4j database username. |
| `NEO4J_PASSWORD` | For Neo4j | Neo4j database password. Store it as a sensitive Vercel variable. |
| `NEO4J_DATABASE` | Optional | Neo4j database name; defaults to `neo4j`. |
| `APP_PASSWORD` | Required in production | Password required to open the console. Use a strong private value; the application requires at least 24 characters. |
| `PORT` | Optional | Local Express port; defaults to `3000`. |

Never commit `.env`, share production credentials, or put secrets in this README. `.env.example` lists variable names with blank values and is safe to commit.

## Run locally

Requirements: Node.js **20.19+** or **22.12+**, npm, and credentials for whichever existing database(s) you want to connect.

From the repository root:

```bash
cd PantryGraphConsole
npm install
```

Copy `.env.example` to `.env` and add your local database credentials. Then start the Vite frontend and Express API together:

```bash
npm run dev
```

Open the local URL printed by Vite, normally [http://localhost:5173](http://localhost:5173). Vite proxies `/api` requests to the local Express API on port `3000`.

Other scripts:

```bash
npm run build  # Build the frontend into dist/
npm start      # Start the Express API only
npm test       # Run the Node.js test suite
```

## Deploy on Vercel

The production site is [pantrygraph-console.vercel.app](https://pantrygraph-console.vercel.app/). The PantryGraph folder is a self-contained Vercel project:

1. Create or select the Vercel project connected to this Git repository and set **Root Directory** to `PantryGraphConsole`.
2. Set the production environment variables listed above for the databases you want to enable, plus `APP_PASSWORD`.
3. Build with `npm run build`; the output directory is `dist`. The repository’s `vercel.json` defines these settings and security response headers.
4. Deploy and open the production URL. If you change environment variables, create a new deployment for the changes to take effect.

The frontend is served as static Vite output. Explicit files under `api/` are Vercel serverless function entry points; each delegates to the shared Express application through `api/_handler.js`. The database drivers and credentials run on the server side. `.vercelignore` excludes local environment files, dependencies, and build output from deployment uploads.

## Project layout

```text
PantryGraphConsole/
├── api/                         # Vercel function routes; delegate to Express
├── src/
│   ├── App.jsx                  # Workspace, editors, schema, results, graph view
│   ├── main.jsx                 # React entry point
│   └── styles.css               # Workspace styles
├── server/
│   ├── app.js                   # Express API and authentication middleware
│   ├── auth.js                  # Password verification and signed sessions
│   ├── index.js                 # Local API server startup
│   └── services/
│       ├── postgres.js          # Neon PostgreSQL health, schema, and queries
│       └── neo4j.js             # Neo4j Aura health, schema, and queries
├── queries/
│   ├── README.md                # How to use the Cypher examples
│   └── grocery-graph.cypher     # Read-only graph query collection
├── .env.example                 # Names of local environment variables
├── vercel.json                 # Vercel build and security headers
└── package.json                # Dependencies and npm scripts
```

## Main dependencies

| Package | Role |
| --- | --- |
| `react`, `react-dom` | Browser interface |
| `vite`, `@vitejs/plugin-react` | Development server and frontend build |
| `cytoscape` | Interactive graph visualization |
| `express` | Backend API |
| `pg`, `pg-cursor` | PostgreSQL driver and bounded result streaming |
| `neo4j-driver` | Neo4j driver |
| `dotenv` | Local environment variable loading |
| `concurrently` | Runs local frontend and API together |

## Cypher examples

The [`queries/`](queries/) folder contains a copy-and-run library of read-only Neo4j graph queries, including general schema-independent exploration, relationship counts, graph connectivity, and examples for the grocery relationship types used in this project. Run one query block at a time in the console’s **Neo4j Aura / Cypher** editor. Check the live Schema tab if a database uses different relationship type names.
