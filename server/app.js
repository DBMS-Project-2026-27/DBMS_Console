import cors from 'cors';
import express from 'express';
import { recordRoutes, loadSchema } from './records.js';
import { validateSql } from './sqlSafety.js';

export function createApp(pool, { schemaName = 'public' } = {}) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_request, response) => {
    try {
      await pool.query('SELECT 1');
      response.json({ status: 'ok' });
    } catch (error) {
      response.status(503).json({ status: 'unavailable', error: error.message });
    }
  });

  app.get('/api/schema', async (_request, response) => {
    try {
      const tables = await loadSchema(pool, schemaName);
      response.json({ tables });
    } catch (error) {
      response.status(500).json({ error: 'Could not load database schema.', detail: error.message });
    }
  });

  app.use('/api/tables', recordRoutes(pool, schemaName));

  app.post('/api/query', async (request, response) => {
    const { sql } = request.body ?? {};
    const validationError = validateSql(sql);
    if (validationError) return response.status(400).json({ error: validationError });

    const startedAt = performance.now();
    try {
      const result = await pool.query(sql);
      response.json({
        columns: result.fields.map((field) => field.name),
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command,
        executionTimeMs: Number((performance.now() - startedAt).toFixed(2)),
      });
    } catch (error) {
      response.status(400).json({
        error: error.message,
        code: error.code,
        position: error.position,
        executionTimeMs: Number((performance.now() - startedAt).toFixed(2)),
      });
    }
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError) return response.status(400).json({ error: 'Request body must be valid JSON.' });
    response.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}
