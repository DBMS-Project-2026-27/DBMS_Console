import { Router } from 'express';
import pg from 'pg';

const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export async function loadSchema(pool, schemaName = 'public', tableName = null) {
  const { rows } = await pool.query(`
    SELECT c.table_name, c.column_name, c.data_type, c.is_nullable,
      c.column_default, c.is_identity, c.is_generated,
      EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage k
          ON k.constraint_catalog = tc.constraint_catalog
          AND k.constraint_schema = tc.constraint_schema
          AND k.constraint_name = tc.constraint_name
          AND k.table_name = tc.table_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = c.table_schema AND tc.table_name = c.table_name
          AND k.column_name = c.column_name
      ) AS primary_key
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = $1 AND t.table_type = 'BASE TABLE'
      AND ($2::text IS NULL OR c.table_name = $2)
    ORDER BY c.table_name, c.ordinal_position
  `, [schemaName, tableName]);
  const tables = Object.create(null);
  for (const column of rows) {
    (tables[column.table_name] ??= []).push({
      name: column.column_name,
      type: column.data_type,
      nullable: column.is_nullable === 'YES',
      primaryKey: column.primary_key,
      hasDefault: column.column_default !== null || column.is_identity === 'YES',
      readOnly: column.is_identity === 'YES' || column.is_generated === 'ALWAYS',
    });
  }
  return tables;
}

function validateValues(values, columns, updating) {
  if (!isObject(values)) throw invalid('values must be an object.');
  const entries = Object.entries(values);
  if (updating && !entries.length) throw invalid('Choose at least one field to update.');
  for (const [name, value] of entries) {
    const column = columns.find((item) => item.name === name);
    if (!column) throw invalid(`Unknown column: ${name}.`);
    if (column.readOnly || (updating && column.primaryKey)) throw invalid(`Column ${name} cannot be changed.`);
    if (value === null && !column.nullable) throw invalid(`${name} cannot be NULL.`);
  }
  if (!updating) {
    for (const column of columns) {
      if (!column.nullable && !column.hasDefault && !column.readOnly && !Object.hasOwn(values, column.name)) {
        throw invalid(`${column.name} is required.`);
      }
    }
  }
  return entries;
}

function validateKeys(keys, columns) {
  const primaryKeys = columns.filter((column) => column.primaryKey);
  if (!primaryKeys.length) throw invalid('This table has no primary key; update and delete are disabled.');
  if (!isObject(keys) || Object.keys(keys).length !== primaryKeys.length ||
    primaryKeys.some((column) => !Object.hasOwn(keys, column.name) || keys[column.name] === null ||
      !['string', 'number', 'boolean'].includes(typeof keys[column.name]))) {
    throw invalid('Provide every primary-key column, and no other columns, in keys.');
  }
  return primaryKeys.map((column) => [column.name, keys[column.name]]);
}

function mutationStatement(method, table, columns, body) {
  if (method === 'POST') {
    const entries = validateValues(body?.values, columns, false);
    return {
      sql: entries.length
        ? `INSERT INTO ${table} (${entries.map(([name]) => quote(name)).join(', ')}) VALUES (${entries.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`
        : `INSERT INTO ${table} DEFAULT VALUES RETURNING *`,
      values: entries.map(([, value]) => value),
    };
  }
  const keys = validateKeys(body?.keys, columns);
  const entries = method === 'PATCH' ? validateValues(body?.values, columns, true) : [];
  const where = keys.map(([name], i) => `${quote(name)} = $${entries.length + i + 1}`).join(' AND ');
  return {
    sql: method === 'PATCH'
      ? `UPDATE ${table} SET ${entries.map(([name], i) => `${quote(name)} = $${i + 1}`).join(', ')} WHERE ${where} RETURNING *`
      : `DELETE FROM ${table} WHERE ${where} RETURNING *`,
    values: [...entries, ...keys].map(([, value]) => value),
  };
}

function sqlLiteral(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return pg.escapeLiteral(typeof value === 'object' ? JSON.stringify(value) : String(value));
}

export function recordRoutes(pool, schemaName = 'public') {
  const router = Router();
  router.all('/:table/:action', async (request, response, next) => {
    const preview = request.params.action === 'preview' && request.method === 'POST';
    if (!preview && (request.params.action !== 'records' || !['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method))) return next();
    try {
      const tables = await loadSchema(pool, schemaName, request.params.table);
      const columns = tables[request.params.table];
      if (!columns) throw invalid('Table not found.', 404);
      const table = `${quote(schemaName)}.${quote(request.params.table)}`;
      if (request.method === 'GET') {
        const rawOffset = request.query.offset ?? '0';
        if (typeof rawOffset !== 'string' || !/^\d+$/.test(rawOffset) || !Number.isSafeInteger(Number(rawOffset))) {
          throw invalid('offset must be a non-negative integer.');
        }
        const keys = columns.filter((c) => c.primaryKey);
        const order = keys.length ? ` ORDER BY ${keys.map((c) => quote(c.name)).join(', ')}` : '';
        const result = await pool.query(`SELECT * FROM ${table}${order} LIMIT 51 OFFSET $1`, [Number(rawOffset)]);
        return response.json({ columns, rows: result.rows.slice(0, 50), hasMore: result.rows.length > 50 });
      }
      const methods = new Map([['add', 'POST'], ['update', 'PATCH'], ['delete', 'DELETE']]);
      const method = preview ? methods.get(request.body?.operation) : request.method;
      if (!method) throw invalid('Choose add, update, or delete.');
      const statement = mutationStatement(method, table, columns, request.body);
      if (preview) {
        // Display only. Execution always rebuilds this statement with bound parameters.
        const sql = statement.sql.replace(/\$(\d+)\b/g, (_, n) => sqlLiteral(statement.values[Number(n) - 1]));
        return response.json({ sql: `${sql};` });
      }
      const result = await pool.query(statement.sql, statement.values);
      if (!result.rowCount) throw invalid('Record no longer exists. Check its primary key and try again.', 404);
      response.status(method === 'POST' ? 201 : 200).json({ row: result.rows[0], rowCount: result.rowCount });
    } catch (error) {
      response.status(error.status || (error.code?.startsWith('23') || error.code?.startsWith('22') ? 400 : 500))
        .json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
    }
  });
  return router;
}
