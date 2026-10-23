import 'dotenv/config';
import neo4j from 'neo4j-driver';

/** Verify Neo4j Aura connectivity using a read-only session. */
export async function checkNeo4jConnection() {
  const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
    return { status: 'unconfigured', message: 'Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD in PantryGraphConsole/.env.' };
  }

  let driver;
  let session;
  try {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
      { connectionTimeout: 5000, maxConnectionLifetime: 60 * 60 * 1000 },
    );
    session = driver.session({
      database: process.env.NEO4J_DATABASE || 'neo4j',
      defaultAccessMode: neo4j.session.READ,
    });
    await session.run('RETURN 1 AS ok', {}, { timeout: 5000 });
    return { status: 'connected', message: 'Read-only Neo4j connection verified.' };
  } catch {
    return { status: 'error', message: 'Could not connect to Neo4j. Check Aura URI, credentials, database name, and network access.' };
  } finally {
    await session?.close();
    await driver?.close();
  }
}
