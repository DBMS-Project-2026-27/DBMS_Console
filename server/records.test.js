import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createApp } from './app.js';

const connectionString = process.env.TEST_DATABASE_URL;
test('record API against PostgreSQL', { skip: !connectionString }, async (t) => {
  const pool = new pg.Pool({ connectionString });
  const schemaName = `crud_test_${process.pid}_${Date.now()}`;
  await pool.query(`CREATE SCHEMA "${schemaName}"`);
  let server;
  try {
    await pool.query(`CREATE TABLE "${schemaName}"."Items" (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL UNIQUE, price numeric NOT NULL DEFAULT 0,
      notes text, computed text GENERATED ALWAYS AS (upper(name)) STORED
    );
    CREATE TABLE "${schemaName}".links (a integer, b integer, label text, PRIMARY KEY (a, b));
    CREATE TABLE "${schemaName}".no_key (name text);
    CREATE TABLE "${schemaName}".children (id integer PRIMARY KEY, item_id bigint REFERENCES "${schemaName}"."Items"(id));
    INSERT INTO "${schemaName}".links VALUES (1, 1, 'one'), (1, 2, 'two');`);
    server = createApp(pool, { schemaName }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (path, method = 'GET', body) => {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    await t.test('schema exposes keys, defaults, and generated columns', async () => {
      const { body } = await request('/api/schema');
      assert.equal(body.tables.Items.find(c => c.name === 'id').primaryKey, true);
      assert.equal(body.tables.Items.find(c => c.name === 'id').readOnly, true);
      assert.equal(body.tables.Items.find(c => c.name === 'price').hasDefault, true);
      assert.equal(body.tables.Items.find(c => c.name === 'computed').readOnly, true);
    });
    let id;
    await t.test('adds quoted values safely with defaults and explicit null', async () => {
      const result = await request('/api/tables/Items/records', 'POST', { values: { name: "O'Reilly; DROP TABLE links; --", notes: null } });
      assert.equal(result.status, 201);
      id = result.body.row.id;
      assert.equal(result.body.row.price, '0');
      assert.equal(result.body.row.notes, null);
    });
    await t.test('lists records and validates pagination', async () => {
      const result = await request('/api/tables/Items/records?offset=0');
      assert.equal(result.status, 200);
      assert.equal(result.body.rows.length, 1);
      assert.equal(result.body.hasMore, false);
      assert.equal((await request('/api/tables/Items/records?offset=-1')).status, 400);
    });
    await t.test('updates only the record identified by a composite key', async () => {
      const result = await request('/api/tables/links/records', 'PATCH', { keys: { a: 1, b: 2 }, values: { label: 'changed' } });
      assert.equal(result.status, 200);
      const { body } = await request('/api/tables/links/records');
      assert.deepEqual(body.rows.map(r => r.label), ['one', 'changed']);
    });
    await t.test('rejects invalid mutations without changing records', async () => {
      for (const body of [
        { keys: {}, values: { label: 'bad' } },
        { keys: { a: 1 }, values: { label: 'bad' } },
        { keys: { a: 1, b: 2, label: 'changed' }, values: { label: 'bad' } },
        { keys: { a: null, b: 2 }, values: { label: 'bad' } },
        { keys: { a: 1, b: 2 }, values: { a: 9 } },
        { keys: { a: 1, b: 2 }, values: {} },
        { keys: { a: 1, b: 2 }, values: { unknown: 'bad' } },
      ]) assert.equal((await request('/api/tables/links/records', 'PATCH', body)).status, 400);
      assert.equal((await request('/api/tables/Items/records', 'POST', { values: { id: 99, name: 'bad' } })).status, 400);
      assert.equal((await request('/api/tables/Items/records', 'POST', { values: { computed: 'bad', name: 'bad' } })).status, 400);
      assert.equal((await request('/api/tables/Items/records', 'POST', { values: [] })).status, 400);
      assert.equal((await request('/api/tables/no_key/records', 'DELETE', { keys: {} })).status, 400);
      assert.equal((await request('/api/tables/unknown/records')).status, 404);
      assert.equal((await request('/api/tables/links%22%3B--/records')).status, 404);
    });
    await t.test('returns database validation errors and missing-row errors', async () => {
      assert.equal((await request('/api/tables/Items/records', 'POST', { values: {} })).status, 400);
      assert.equal((await request('/api/tables/Items/records', 'PATCH', { keys: { id }, values: { name: null } })).status, 400);
      assert.equal((await request('/api/tables/Items/records', 'DELETE', { keys: { id: 99999 } })).status, 404);
    });
    await t.test('rejects unique and foreign-key violations without partial changes', async () => {
      const duplicate = await request('/api/tables/Items/records', 'POST', { values: { name: "O'Reilly; DROP TABLE links; --" } });
      assert.equal(duplicate.status, 400);
      assert.equal(duplicate.body.code, '23505');
      await pool.query(`INSERT INTO "${schemaName}".children VALUES (1, $1)`, [id]);
      const referenced = await request('/api/tables/Items/records', 'DELETE', { keys: { id } });
      assert.equal(referenced.status, 400);
      assert.equal(referenced.body.code, '23503');
      assert.equal((await request('/api/tables/Items/records')).body.rows.length, 1);
    });
    await t.test('preserves empty strings and allows explicit NULL on update', async () => {
      const empty = await request('/api/tables/Items/records', 'PATCH', { keys: { id }, values: { notes: '' } });
      assert.equal(empty.status, 200);
      assert.equal(empty.body.row.notes, '');
      const nulled = await request('/api/tables/Items/records', 'PATCH', { keys: { id }, values: { notes: null } });
      assert.equal(nulled.status, 200);
      assert.equal(nulled.body.row.notes, null);
    });
    await t.test('paginates in primary-key order and reports another page', async () => {
      await pool.query(`INSERT INTO "${schemaName}"."Items" (name) SELECT 'page ' || n FROM generate_series(1, 51) n`);
      const first = (await request('/api/tables/Items/records')).body;
      const second = (await request('/api/tables/Items/records?offset=50')).body;
      assert.equal(first.rows.length, 50);
      assert.equal(first.hasMore, true);
      assert.equal(second.rows.length, 2);
      assert.equal(second.hasMore, false);
      assert.equal(new Set([...first.rows, ...second.rows].map(row => row.id)).size, 52);
    });
    await t.test('existing query and health endpoints still work', async () => {
      assert.equal((await request('/api/health')).status, 200);
      const result = await request('/api/query', 'POST', { sql: 'SELECT 1 AS value' });
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.rows, [{ value: 1 }]);
      assert.equal((await request('/api/query', 'POST', { sql: 'DROP TABLE links' })).status, 400);
    });
    await t.test('previews the exact mutation without modifying data', async () => {
      const preview = await request('/api/tables/links/preview', 'POST', { operation: 'update', keys: { a: 1, b: 2 }, values: { label: "preview's value" } });
      assert.equal(preview.status, 200);
      assert.match(preview.body.sql, /UPDATE/);
      assert.match(preview.body.sql, /preview''s value/);
      const rows = (await request('/api/tables/links/records')).body.rows;
      assert.equal(rows.find(row => row.b === 2).label, 'changed');
      for (const operation of ['drop', 'toString', '__proto__']) {
        assert.equal((await request('/api/tables/links/preview', 'POST', { operation })).status, 400);
      }
      assert.equal((await request('/api/tables/links/preview', 'POST', { operation: 'delete', keys: { a: 1 } })).status, 400);
    });
    await t.test('deletes exactly one row', async () => {
      assert.equal((await request('/api/tables/links/records', 'DELETE', { keys: { a: 1, b: 2 } })).status, 200);
      const { body } = await request('/api/tables/links/records');
      assert.equal(body.rows.length, 1);
      assert.equal(body.rows[0].b, 1);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await pool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    await pool.end();
  }
});
