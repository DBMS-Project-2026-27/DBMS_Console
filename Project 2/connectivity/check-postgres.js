import { checkPostgresConnection } from './postgres.js';

const result = await checkPostgresConnection();
console.log(`PostgreSQL: ${result.status} — ${result.message}`);
if (result.status !== 'connected') process.exitCode = 1;
