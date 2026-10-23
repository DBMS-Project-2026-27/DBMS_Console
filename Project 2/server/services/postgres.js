import pg from 'pg';
import Cursor from 'pg-cursor';

const { Pool } = pg;
let pool;

function getPool() {
  if (!process.env.NEON_DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      max: 3,
      // Keep every connection read-only by default. Query endpoints will also
      // enforce read-only transactions when they are added.
      options: '-c default_transaction_read_only=on -c statement_timeout=5000 -c idle_in_transaction_session_timeout=5000',
    });
    pool.on('error', () => {
      // Do not log driver errors: they may contain connection details.
    });
  }
  return pool;
}

export async function checkPostgresHealth() {
  const clientPool = getPool();
  if (!clientPool) return { status: 'unconfigured', message: 'NEON_DATABASE_URL is not set.' };

  let client;
  try {
    client = await clientPool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query('SELECT 1');
    await client.query('ROLLBACK');
    return { status: 'connected', message: 'Read-only connection verified.' };
  } catch {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* Keep the response credential-safe. */ }
    }
    return { status: 'error', message: 'Could not connect. Check the local Neon settings and network access.' };
  } finally {
    client?.release();
  }
}

export async function discoverPostgresSchema() {
  const clientPool = getPool();
  if (!clientPool) {
    return { error: 'Neon is not configured. Set NEON_DATABASE_URL in the local .env file.' };
  }

  let client;
  try {
    client = await clientPool.connect();
    await client.query('BEGIN READ ONLY');
    const [tablesResult, columnsResult, constraintsResult] = await Promise.all([
      client.query(`
        SELECT table_schema, table_name, table_type
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
          AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_schema, table_name
      `),
      client.query(`
        SELECT table_schema, table_name, column_name, data_type, udt_name,
               is_nullable, column_default, ordinal_position
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name, ordinal_position
      `),
      client.query(`
        SELECT tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type,
               kcu.column_name, ccu.table_schema AS foreign_table_schema,
               ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        LEFT JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_catalog = kcu.constraint_catalog
          AND tc.constraint_schema = kcu.constraint_schema
          AND tc.constraint_name = kcu.constraint_name
          AND tc.table_name = kcu.table_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON tc.constraint_catalog = ccu.constraint_catalog
          AND tc.constraint_schema = ccu.constraint_schema
          AND tc.constraint_name = ccu.constraint_name
          AND tc.table_name = ccu.table_name
        WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY tc.table_schema, tc.table_name, tc.constraint_name
      `),
    ]);
    await client.query('COMMIT');

    const tables = tablesResult.rows.map((table) => ({
      schema: table.table_schema,
      name: table.table_name,
      kind: table.table_type === 'VIEW' ? 'view' : 'table',
      columns: columnsResult.rows
        .filter((column) => column.table_schema === table.table_schema && column.table_name === table.table_name)
        .map((column) => ({
          name: column.column_name,
          type: column.data_type,
          databaseType: column.udt_name,
          nullable: column.is_nullable === 'YES',
          default: column.column_default,
          position: column.ordinal_position,
        })),
      constraints: constraintsResult.rows
        .filter((constraint) => constraint.table_schema === table.table_schema && constraint.table_name === table.table_name)
        .map((constraint) => ({
          name: constraint.constraint_name,
          type: constraint.constraint_type,
          column: constraint.column_name,
          references: constraint.foreign_table_name ? {
            schema: constraint.foreign_table_schema,
            table: constraint.foreign_table_name,
            column: constraint.foreign_column_name,
          } : null,
        })),
    }));
    return { engine: 'postgres', tables };
  } catch {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* Do not expose driver details. */ }
    }
    return { error: 'Could not read PostgreSQL metadata. Check the connection and metadata permissions.' };
  } finally {
    client?.release();
  }
}

export function validatePostgresQueryInput(query, parameters = []) {
  if (typeof query !== 'string' || !query.trim()) return 'Enter a SQL query first.';
  if (query.length > 10000) return 'Query is too long (maximum 10,000 characters).';
  if (!Array.isArray(parameters) || parameters.length > 100) return 'Parameters must be a JSON array with no more than 100 values.';
  return null;
}

export async function executePostgresQuery(query, parameters = []) {
  const clientPool = getPool();
  if (!clientPool) return { error: 'Neon is not configured. Set NEON_DATABASE_URL in the local .env file.' };
  const inputError = validatePostgresQueryInput(query, parameters);
  if (inputError) return { error: inputError };

  let client;
  let cursor;
  const started = Date.now();
  try {
    client = await clientPool.connect();
    await client.query('BEGIN READ ONLY');
    cursor = client.query(new Cursor(query, parameters));
    // pg-cursor resolves read() with the rows array. Its callback also
    // provides the pg Result object, which contains the column metadata.
    const { rows, columns } = await new Promise((resolve, reject) => {
      cursor.read(501, (error, resultRows, result) => {
        if (error) return reject(error);
        resolve({ rows: resultRows, columns: result?.fields || [] });
      });
    });
    await cursor.close();
    cursor = null;
    await client.query('COMMIT');
    const truncated = rows.length > 500;
    const visibleRows = truncated ? rows.slice(0, 500) : rows;
    if (Buffer.byteLength(JSON.stringify(visibleRows)) > 2_000_000) {
      return { error: 'The query result is too large to display. Return fewer columns or smaller values.' };
    }
    return {
      columns: columns.map((field) => ({ name: field.name, type: field.dataTypeID })),
      rows: visibleRows,
      rowCount: visibleRows.length,
      truncated,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    if (cursor) {
      try { await new Promise((resolve) => cursor.close(() => resolve())); } catch { /* Keep response safe. */ }
    }
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* Keep response safe. */ }
    }
    const knownErrors = {
      '42601': 'SQL syntax error. Check the query and try again.',
      '42P01': 'That table or view was not found. Check its name in Schema.',
      '42703': 'That column was not found. Check its name in Schema.',
      '42501': 'The database role does not have permission to read that data.',
      '25006': 'The query attempted to change data. Only read-only queries are allowed.',
      '57014': 'The query timed out. Try a simpler query.',
      '28P01': 'Neon rejected the database login. Check the username and password in the local .env file.',
      '3D000': 'That database name was not found. Check the database name in the Neon URL.',
      '08001': 'Could not reach Neon. Check the network connection and Neon project status.',
      '08006': 'The Neon connection was lost. Check the network and try again.',
    };
    return { error: knownErrors[error?.code] || 'Query failed. Check the SQL and database connection.' };
  } finally {
    client?.release();
  }
}

export async function closePostgresPool() {
  if (pool) {
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
  }
}
