import { checkNeo4jConnection } from './neo4j.js';

const result = await checkNeo4jConnection();
console.log(`Neo4j Aura: ${result.status} — ${result.message}`);
if (result.status !== 'connected') process.exitCode = 1;
