import 'dotenv/config';
import express from 'express';
import {
  allowLoginAttempt,
  authStatus,
  clearSessionCookie,
  isAuthConfiguredForRequest,
  isAuthRequiredForRequest,
  resetLoginAttempts,
  setSessionCookie,
  validSessionForRequest,
  verifyAppPassword,
} from './auth.js';
import { checkNeo4jHealth, discoverNeo4jSchema, executeNeo4jQuery } from './services/neo4j.js';
import { checkPostgresHealth, discoverPostgresSchema, executePostgresQuery } from './services/postgres.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/api/auth/status', (request, response) => {
  response.json(authStatus(request));
});

app.post('/api/auth/login', (request, response) => {
  const origin = request.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== request.get('host')) return response.status(403).json({ error: 'Sign-in request was rejected.' });
    } catch {
      return response.status(403).json({ error: 'Sign-in request was rejected.' });
    }
  }
  if (!isAuthRequiredForRequest()) return response.json({ authenticated: true });
  if (!isAuthConfiguredForRequest()) return response.status(503).json({ error: 'Secure access has not been configured for this deployment.' });
  if (!allowLoginAttempt(request)) return response.status(429).json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
  if (!verifyAppPassword(request.body?.password)) return response.status(401).json({ error: 'The access password is incorrect.' });
  resetLoginAttempts(request);
  setSessionCookie(request, response);
  return response.json({ authenticated: true });
});

app.post('/api/auth/logout', (request, response) => {
  clearSessionCookie(request, response);
  response.json({ authenticated: false });
});

app.use('/api', (request, response, next) => {
  if (!isAuthRequiredForRequest()) return next();
  if (!isAuthConfiguredForRequest()) return response.status(503).json({ error: 'Secure access has not been configured for this deployment.' });
  if (!validSessionForRequest(request)) return response.status(401).json({ error: 'Sign in to use this database console.' });
  return next();
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'grocery-graph-console-api' });
});

app.get('/api/health/databases', async (_request, response) => {
  const [postgres, neo4j] = await Promise.all([checkPostgresHealth(), checkNeo4jHealth()]);
  response.json({ databases: { postgres, neo4j } });
});

app.get('/api/schema/neo4j', async (_request, response) => {
  const result = await discoverNeo4jSchema();
  response.status(result.error ? 503 : 200).json(result);
});

app.get('/api/schema/postgres', async (_request, response) => {
  const result = await discoverPostgresSchema();
  response.status(result.error ? 503 : 200).json(result);
});

app.post('/api/query/postgres', async (request, response) => {
  const result = await executePostgresQuery(request.body?.query, request.body?.parameters ?? []);
  response.status(result.error ? 400 : 200).json(result);
});

app.post('/api/query/neo4j', async (request, response) => {
  const result = await executeNeo4jQuery(request.body?.query, request.body?.parameters ?? {});
  response.status(result.error ? 400 : 200).json(result);
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint not implemented yet.' });
});

app.use((error, _request, response, _next) => {
  if (response.headersSent) return;
  const status = error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
  response.status(status).json({ error: status === 413 ? 'Request body is too large.' : status === 400 ? 'Request body must be valid JSON.' : 'The local API could not complete the request.' });
});

export default app;
