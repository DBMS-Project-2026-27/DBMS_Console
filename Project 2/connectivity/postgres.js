import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

/** Verify Neon/PostgreSQL connectivity using a read-only transaction. */
export async function checkPostgresConnection() {
  if (!process.env.NEON_DATABASE_URL) {
    return { status: 'unconfigured', message: 'Set NEON_DATABASE_URL in Project 2/.env.' };
  }

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 5000,
    max: 1,
    options: '-c default_transaction_read_only=on -c statement_timeout=5000 -c idle_in_transaction_session_timeout=5000',
  });
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query('SELECT 1');
    await client.query('COMMIT');
    return { status: 'connected', message: 'Read-only PostgreSQL connection verified.' };
  } catch {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* Do not expose credentials or driver details. */ }
    }
    return { status: 'error', message: 'Could not connect to PostgreSQL. Check NEON_DATABASE_URL and network access.' };
  } finally {
    client?.release();
    await pool.end();
  }
}
