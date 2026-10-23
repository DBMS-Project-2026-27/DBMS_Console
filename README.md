# Online Grocery Delivery — SQL Console

[Open the live console](https://dbms-console.vercel.app/)

A React frontend and Express API for exploring the grocery delivery database in PostgreSQL (Neon), running SQL, and managing records without writing SQL.

## Features

- SQL editor supporting SELECT, INSERT, UPDATE, and DELETE, with results, timing, errors, and local query history.
- Database Explorer showing the live public database schema.
- A standalone **Database Operations** section, inspired by the alumni console, with ADD/UPDATE/DELETE tabs and a table selector.
- Side-by-side operation form and Generated SQL panels, with Preview SQL, Reset, and Execute SQL controls.
- A charcoal and teal theme with amber highlights across the console, explorer, history, and operation panels.
- Forms generated from live column metadata, including required fields, defaults, generated fields, and primary keys.
- Composite primary-key support, explicit NULL values, and database constraint errors displayed in the form.
- Preview validation without changing data; editing a form clears its previous preview.
- Delete confirmation, returned record details, and desktop/mobile layouts.

## Run locally

Requires Node.js 20.19+ or 22.12+ and a PostgreSQL database.

```bash
git clone https://github.com/DBMS-Project-2026-27/DBMS_Console.git
cd DBMS_Console
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to your PostgreSQL connection string. The current production connection configuration uses SSL, as required by Neon. Never commit credentials.

```bash
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Vite proxies `/api` to the Express server on port 3001. `PORT` can override the backend port; update the Vite proxy if using a different port.

```bash
npm run build  # Build the frontend into dist/
npm start      # Start the backend
npm test       # Run unit tests; database integration tests skip without TEST_DATABASE_URL
```

To run the integration tests against a disposable PostgreSQL test database:

```bash
TEST_DATABASE_URL=postgresql://user:password@localhost/test_database npm test
```

The test role must be able to create schemas. Tests create a unique schema, run real API/database operations, and drop that schema afterward. Use a dedicated local test database.

## Database Operations

1. Choose **ADD**, **UPDATE**, or **DELETE**, and select a table.
2. For Add, fill the schema-driven form. Blank optional fields use their database defaults (or NULL); generated fields are supplied automatically. Check **Set NULL** for an explicit null.
3. For Update, enter the record's primary key, choose **Field to update**, and enter its new value. Composite keys require every key field. Key and generated columns cannot be updated. An empty text value and an explicit NULL remain distinct.
4. For Delete, enter the complete primary key.
5. Click **PREVIEW SQL** to validate the request and see the generated SQL. Preview does not modify records. Changing any input, table, or operation clears the old preview.
6. Click **EXECUTE SQL** to apply the previewed operation. Deletion requires **Confirm delete**. Successful execution shows the affected record and disables repeat execution until a new preview is generated.
7. Use **RESET** to clear the form, preview, and result.

Tables without a declared primary key support Add, but Update and Delete are disabled to prevent ambiguous mutations. PostgreSQL enforces foreign keys, unique constraints, checks, required fields, and triggers. Database errors preserve the form input for correction.

Numeric, boolean, date/time, JSON, and array values use PostgreSQL input formats, such as `12.50`, `true`, `2026-10-22`, `{"name":"value"}`, and `{one,two}`. The SQL preview displays escaped values for review; execution rebuilds and validates the operation on the server and uses bound parameters.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Database connectivity |
| GET | `/api/schema` | Public base tables and column metadata |
| POST | `/api/query` | Execute one supported SQL statement: `{ "sql": "SELECT * FROM product LIMIT 25" }` |
| GET | `/api/tables/:table/records?offset=0` | Up to 50 rows, column metadata, and `hasMore` |
| POST | `/api/tables/:table/preview` | Validate and preview `{ "operation": "add", "values": { "name": "Apples" } }` without writing |
| POST | `/api/tables/:table/records` | Insert `{ "values": { "name": "Apples" } }` |
| PATCH | `/api/tables/:table/records` | Update `{ "keys": { "id": 1 }, "values": { "name": "Pears" } }` |
| DELETE | `/api/tables/:table/records` | Delete `{ "keys": { "id": 1 } }` |

Use the exact table and column names returned by `/api/schema`. Mutation responses contain `row` and `rowCount`; inserts return HTTP 201. Missing tables/records return 404. Invalid fields, incomplete keys, and data/constraint errors return 400 with an `error` message. Composite keys require every primary-key column in `keys`. Other columns are rejected in `keys`.

Metadata includes `name`, `type`, `nullable`, `primaryKey`, `hasDefault`, and `readOnly`. Omitted insert fields use defaults. Update requests must include at least one writable field. Identifiers are validated against database metadata and quoted; record values use bound parameters.

## Grocery database model

The project's grocery model defines these 20 relations (the explorer reads whichever tables are present in the connected PostgreSQL database):
| No. | Relation            | Description                          |
| --: | ------------------- | ------------------------------------ |
|   1 | `PINCODE_INFO`      | Pincode and location information     |
|   2 | `CATEGORY`          | Grocery product categories           |
|   3 | `WAREHOUSE`         | Warehouse information                |
|   4 | `PAYMENT_METHOD`    | Payment method details               |
|   5 | `DELIVERY_AGENT`    | Delivery agent information           |
|   6 | `CUSTOMER`          | Customer details                     |
|   7 | `ADDRESS`           | Customer address information         |
|   8 | `PRODUCT`           | Grocery product details              |
|   9 | `DELIVERY_SCHEDULE` | Delivery scheduling information      |
|  10 | `STORED_IN_SLOT`    | Warehouse slot allocation            |
|  11 | `STORED_IN_QTY`     | Product quantity stored in warehouse |
|  12 | `OFFERS`            | Product offer information            |
|  13 | `CART`              | Customer shopping carts              |
|  14 | `RETURNS`           | Product return records               |
|  15 | `CONTAINS`          | Products contained in carts          |
|  16 | `ORDERS`            | Customer order information           |
|  17 | `REVIEW`            | Product reviews and ratings          |
|  18 | `REFUND`            | Refund information                   |
|  19 | `PAYMENT`           | Payment transaction details          |
|  20 | `INVOICE`           | Invoice information                  |

The database uses primary keys, foreign keys, unique constraints, NOT NULL constraints, and composite keys to maintain data integrity.


## Structure and deployment

```text
src/App.jsx             SQL editor, results, schema explorer, history
src/RecordManager.jsx   Database Operations tabs, forms, SQL preview, execution
src/styles.css          Shared and responsive styles
server/index.js         Production startup
server/app.js           Express app and existing query/health endpoints
server/records.js       Schema metadata, validated preview, parameterized CRUD
server/records.test.js  PostgreSQL API integration tests
server/db.js            Server-side database connection
server/sqlSafety.js     SQL console statement validation
```

The frontend is deployed on Vercel. `vercel.json` forwards `/api` to the Express backend on Render. Deploy both frontend and backend from the updated repository for the new container to work. Database credentials stay in the backend environment.

The console grants database write access to anyone who can reach its API, matching the existing SQL console. Use a restricted database role and restrict deployment access when working with non-demo data. The record endpoints do not add authentication.

The grocery schema covers customers, products, categories, carts, orders, payments, deliveries, warehouses, reviews, returns, refunds, and invoices. `SQL_DDL_DML_Practice_Queries.sql` contains separate practice SQL; it is not executed automatically by the app.

## PantryGraph Console

The separate `PantryGraphConsole/` folder contains the PantryGraph database console frontend, Express API, Neon PostgreSQL and Neo4j Aura connectivity, Vercel API functions, and setup documentation. Follow its [README](PantryGraphConsole/README.md) to run it. Keep local `.env` credentials private; only `.env.example` belongs in Git.
