import { checkNeo4jConnection } from './neo4j.js';
import { checkPostgresConnection } from './postgres.js';

const [postgres, neo4j] = await Promise.all([
  checkPostgresConnection(),
  checkNeo4jConnection(),
]);

console.log(`PostgreSQL: ${postgres.status} — ${postgres.message}`);
console.log(`Neo4j Aura: ${neo4j.status} — ${neo4j.message}`);
if (postgres.status !== 'connected' || neo4j.status !== 'connected') process.exitCode = 1;
