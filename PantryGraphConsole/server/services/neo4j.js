import neo4j from 'neo4j-driver';

let driver;

function getDriver() {
  const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) return null;
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
      { connectionTimeout: 5000, maxConnectionLifetime: 60 * 60 * 1000 },
    );
  }
  return driver;
}

export async function checkNeo4jHealth() {
  const databaseDriver = getDriver();
  if (!databaseDriver) {
    return { status: 'unconfigured', message: 'Neo4j connection settings are incomplete.' };
  }

  const session = databaseDriver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
    defaultAccessMode: neo4j.session.READ,
  });
  try {
    await session.run('RETURN 1 AS ok');
    return { status: 'connected', message: 'Read-only connection verified.' };
  } catch (error) {
    const code = String(error?.code || '');
    if (code.includes('Security.Unauthorized')) {
      return { status: 'error', message: 'Aura rejected authentication. Compare NEO4J_USERNAME and NEO4J_PASSWORD with the Aura credentials.' };
    }
    if (code.includes('DatabaseNotFound')) {
      return { status: 'error', message: 'Aura could not find that database. Check NEO4J_DATABASE against the Aura credentials.' };
    }
    if (code.includes('ServiceUnavailable') || code.includes('DatabaseUnavailable') || error?.name === 'ServiceUnavailable') {
      return { status: 'error', message: 'Could not reach Aura. Verify the URI and that this network allows secure Neo4j connections.' };
    }
    return { status: 'error', message: 'Neo4j connection failed. Check the Aura URI, username, password, and database name.' };
  } finally {
    await session.close();
  }
}

export async function discoverNeo4jSchema() {
  const databaseDriver = getDriver();
  if (!databaseDriver) {
    return { error: 'Neo4j is not configured. Check the local Aura settings in .env.' };
  }

  const session = databaseDriver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
    defaultAccessMode: neo4j.session.READ,
  });
  try {
    // A Neo4j session supports one active query at a time, so keep these
    // metadata calls sequential instead of sharing a session across parallel work.
    const labelsResult = await session.run(
      'CALL db.labels() YIELD label RETURN label ORDER BY label', {}, { timeout: 5000 },
    );
    const relationshipTypesResult = await session.run(
      'CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType', {}, { timeout: 5000 },
    );
    const nodePropertiesResult = await session.run(
      'CALL db.schema.nodeTypeProperties()', {}, { timeout: 5000 },
    );
    const relationshipPropertiesResult = await session.run(
      'CALL db.schema.relTypeProperties()', {}, { timeout: 5000 },
    );

    const nodeProperties = new Map();
    for (const record of nodePropertiesResult.records) {
      const prop = {
        name: record.get('propertyName'),
        types: record.get('propertyTypes') || [],
        mandatory: record.get('mandatory') ?? false,
      };
      for (const label of record.get('nodeLabels') || []) {
        if (!nodeProperties.has(label)) nodeProperties.set(label, []);
        nodeProperties.get(label).push(prop);
      }
    }

    const relationshipProperties = new Map();
    for (const record of relationshipPropertiesResult.records) {
      const name = record.get('relType');
      if (!relationshipProperties.has(name)) relationshipProperties.set(name, []);
      relationshipProperties.get(name).push({
        name: record.get('propertyName'),
        types: record.get('propertyTypes') || [],
        mandatory: record.get('mandatory') ?? false,
      });
    }

    return {
      engine: 'neo4j',
      labels: labelsResult.records.map((record) => {
        const name = record.get('label');
        return { name, properties: nodeProperties.get(name) || [] };
      }),
      relationshipTypes: relationshipTypesResult.records.map((record) => {
        const name = record.get('relationshipType');
        return { name, properties: relationshipProperties.get(name) || [] };
      }),
    };
  } catch (error) {
    const code = String(error?.code || '');
    if (code.includes('Procedure.ProcedureNotFound')) {
      return { error: 'This Neo4j server does not provide one of the schema procedures requested.' };
    }
    if (code.includes('Security.Forbidden')) {
      return { error: 'The Neo4j account can connect, but its role cannot read schema metadata.' };
    }
    if (code.includes('DatabaseNotFound')) {
      return { error: 'The configured Neo4j database name was not found.' };
    }
    return { error: 'Could not read Neo4j schema metadata. Check the connection and database permissions.' };
  } finally {
    await session.close();
  }
}

function serializeValue(value, graph) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value;
  if (neo4j.isInt(value)) return value.toString();
  if (neo4j.isNode(value)) {
    const id = value.elementId || value.identity?.toString();
    const node = { id: String(id), labels: value.labels || [], properties: serializeProperties(value.properties || {}) };
    graph.nodes.set(node.id, node);
    return { kind: 'node', ...node };
  }
  if (neo4j.isRelationship(value)) {
    const rel = {
      id: String(value.elementId || value.identity?.toString()),
      startNodeId: String(value.startNodeElementId || value.start?.toString()),
      endNodeId: String(value.endNodeElementId || value.end?.toString()),
      type: value.type,
      properties: serializeProperties(value.properties || {}),
    };
    graph.relationships.set(rel.id, rel);
    return { kind: 'relationship', ...rel };
  }
  if (neo4j.isPath(value)) {
    const nodes = [];
    const relationships = [];
    for (const segment of value.segments || []) {
      const start = serializeValue(segment.start, graph);
      const relationship = serializeValue(segment.relationship, graph);
      const end = serializeValue(segment.end, graph);
      nodes.push(start.id, end.id);
      relationships.push(relationship.id);
    }
    if (value.start) {
      const start = serializeValue(value.start, graph);
      nodes.unshift(start.id);
    }
    return { kind: 'path', nodes: [...new Set(nodes)], relationships };
  }
  if (Array.isArray(value)) return value.map((item) => serializeValue(item, graph));
  if (typeof value === 'object') {
    if (value.toString !== Object.prototype.toString) return value.toString();
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item, graph)]));
  }
  return String(value);
}

function serializeProperties(properties) {
  const graph = { nodes: new Map(), relationships: new Map() };
  return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, serializeValue(value, graph)]));
}

export function normalizeNeo4jRecords(records, fieldKeys = null) {
  const graph = { nodes: new Map(), relationships: new Map() };
  const columns = (fieldKeys || records[0]?.keys || []).map(String);
  const rows = records.slice(0, 500).map((record) => Object.fromEntries(
    columns.map((key, index) => [key, serializeValue(record.get(index), graph)]),
  ));
  const nodes = [...graph.nodes.values()].slice(0, 500);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const relationships = [...graph.relationships.values()]
    .filter((relationship) => nodeIds.has(relationship.startNodeId) && nodeIds.has(relationship.endNodeId))
    .slice(0, 500);
  const entityTruncated = graph.nodes.size > nodes.length || graph.relationships.size > relationships.length;
  return {
    columns,
    rows,
    graph: { nodes, relationships },
    rowCount: rows.length,
    entityCount: nodes.length + relationships.length,
    truncated: records.length > 500 || entityTruncated,
    resultType: nodes.length || relationships.length ? 'graph' : 'table',
  };
}

function collectGraphIds(value, endpointIds, nodeIds) {
  if (neo4j.isNode(value)) {
    if (value.elementId) nodeIds.add(value.elementId);
  } else if (neo4j.isRelationship(value)) {
    if (value.startNodeElementId) endpointIds.add(value.startNodeElementId);
    if (value.endNodeElementId) endpointIds.add(value.endNodeElementId);
  } else if (neo4j.isPath(value)) {
    for (const segment of value.segments || []) {
      collectGraphIds(segment.start, endpointIds, nodeIds);
      collectGraphIds(segment.relationship, endpointIds, nodeIds);
      collectGraphIds(segment.end, endpointIds, nodeIds);
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectGraphIds(item, endpointIds, nodeIds));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectGraphIds(item, endpointIds, nodeIds));
  }
}

export function validateNeo4jQueryInput(query, parameters = {}) {
  if (typeof query !== 'string' || !query.trim()) return 'Enter a Cypher query first.';
  if (query.length > 10000) return 'Query is too long (maximum 10,000 characters).';
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters) || Object.keys(parameters).length > 100) {
    return 'Parameters must be a JSON object with no more than 100 values.';
  }
  return null;
}

export function streamNeo4jRecords(result) {
  return new Promise((resolve, reject) => {
    const records = [];
    const endpointIds = new Set();
    const nodeIds = new Set();
    let keys = [];
    let recordCount = 0;
    result.subscribe({
      onKeys: (fieldKeys) => { keys = fieldKeys; },
      onNext: (record) => {
        recordCount += 1;
        if (records.length < 501) records.push(record);
        if (records.length <= 500) {
          record.keys.forEach((key) => collectGraphIds(record.get(key), endpointIds, nodeIds));
        }
      },
      onCompleted: () => resolve({ records, endpointIds, nodeIds, keys, recordCount }),
      onError: reject,
    });
  });
}

export async function executeNeo4jQuery(query, parameters = {}) {
  const databaseDriver = getDriver();
  if (!databaseDriver) return { error: 'Neo4j is not configured. Check the local Aura settings in .env.' };
  const inputError = validateNeo4jQueryInput(query, parameters);
  if (inputError) return { error: inputError };

  const session = databaseDriver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
    defaultAccessMode: neo4j.session.READ,
  });
  const started = Date.now();
  try {
    const resultData = await session.executeRead(async (transaction) => {
      const result = transaction.run(query, parameters, { timeout: 5000 });
      const stream = await streamNeo4jRecords(result);
      const { endpointIds, nodeIds } = stream;
      nodeIds.forEach((id) => endpointIds.delete(id));
      let endpointRecords = [];
      if (endpointIds.size) {
        const endpoints = await transaction.run(
          'MATCH (n) WHERE elementId(n) IN $ids RETURN n',
          { ids: [...endpointIds] },
          { timeout: 5000 },
        );
        endpointRecords = endpoints.records;
      }
      return { records: stream.records, endpointRecords, recordCount: stream.recordCount };
    }, { timeout: 7000 });
    const normalized = normalizeNeo4jRecords(resultData.records, resultData.keys);
    const endpointGraph = normalizeNeo4jRecords(resultData.endpointRecords).graph;
    const allNodes = [...new Map([...normalized.graph.nodes, ...endpointGraph.nodes].map((node) => [node.id, node])).values()];
    normalized.truncated ||= allNodes.length > 500;
    normalized.graph.nodes = allNodes.slice(0, 500);
    const finalNodeIds = new Set(normalized.graph.nodes.map((node) => node.id));
    normalized.graph.relationships = normalized.graph.relationships
      .filter((rel) => finalNodeIds.has(rel.startNodeId) && finalNodeIds.has(rel.endNodeId))
      .slice(0, 500);
    normalized.entityCount = normalized.graph.nodes.length + normalized.graph.relationships.length;
    if (!normalized.graph.nodes.length) normalized.resultType = 'table';
    if (Buffer.byteLength(JSON.stringify(normalized)) > 2_000_000) {
      return { error: 'The query result is too large to display. Return fewer columns or smaller properties.' };
    }
    return {
      durationMs: Date.now() - started,
      truncated: resultData.recordCount > 500,
      ...normalized,
    };
  } catch (error) {
    const code = String(error?.code || '');
    if (code.includes('SyntaxError') || code.includes('InvalidSemantics')) return { error: 'Cypher syntax or semantics error. Check the query and the live schema.' };
    if (code.includes('Security.Forbidden') || code.includes('Write')) return { error: 'This query is not permitted in the read-only console.' };
    if (code.includes('DatabaseNotFound')) return { error: 'The configured Neo4j database name was not found.' };
    if (code.includes('ServiceUnavailable') || code.includes('DatabaseUnavailable')) return { error: 'Could not reach Aura. Check the connection and try again.' };
    if (code.includes('TransactionTimedOut') || code.includes('Timeout')) return { error: 'The query timed out. Try a simpler query.' };
    return { error: 'Cypher query failed. Check the query, parameters, and live schema.' };
  } finally {
    await session.close();
  }
}

export async function closeNeo4jDriver() {
  if (driver) {
    const currentDriver = driver;
    driver = undefined;
    await currentDriver.close();
  }
}
