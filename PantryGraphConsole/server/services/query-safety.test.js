import test from 'node:test';
import assert from 'node:assert/strict';
import neo4j from 'neo4j-driver';
import { normalizeNeo4jRecords, streamNeo4jRecords, validateNeo4jQueryInput } from './neo4j.js';
import { validatePostgresQueryInput } from './postgres.js';

function marked(marker, values) {
  return Object.defineProperty({ ...values }, marker, { value: true });
}

test('SQL query input requires a query and JSON-array parameters', () => {
  assert.equal(validatePostgresQueryInput('  ', []), 'Enter a SQL query first.');
  assert.equal(validatePostgresQueryInput('SELECT $1', {}), 'Parameters must be a JSON array with no more than 100 values.');
  assert.equal(validatePostgresQueryInput(`SELECT 1 ${' '.repeat(10001)}`, []), 'Query is too long (maximum 10,000 characters).');
  assert.equal(validatePostgresQueryInput('SELECT $1', [42]), null);
});

test('Cypher query input requires a query and JSON-object parameters', () => {
  assert.equal(validateNeo4jQueryInput('', {}), 'Enter a Cypher query first.');
  assert.equal(validateNeo4jQueryInput('RETURN $value', []), 'Parameters must be a JSON object with no more than 100 values.');
  assert.equal(validateNeo4jQueryInput('RETURN $value', { value: 1 }), null);
});

test('Neo4j records normalize graph entities, remove duplicate nodes, and preserve parallel relationships', () => {
  const nodeA = marked('__isNode__', { elementId: 'node-a', labels: ['Product'], properties: { name: 'Apple' } });
  const nodeB = marked('__isNode__', { elementId: 'node-b', labels: ['Category'], properties: { title: 'Fruit' } });
  const rel1 = marked('__isRelationship__', { elementId: 'rel-1', startNodeElementId: 'node-a', endNodeElementId: 'node-b', type: 'BELONGS_TO', properties: {} });
  const rel2 = marked('__isRelationship__', { elementId: 'rel-2', startNodeElementId: 'node-a', endNodeElementId: 'node-b', type: 'BELONGS_TO', properties: {} });
  const records = [
    { keys: ['product', 'category', 'link'], get: (index) => [nodeA, nodeB, rel1][index] },
    { keys: ['product', 'category', 'link'], get: (index) => [nodeA, nodeB, rel2][index] },
  ];

  const result = normalizeNeo4jRecords(records);
  assert.equal(result.resultType, 'graph');
  assert.equal(result.graph.nodes.length, 2);
  assert.equal(result.graph.relationships.length, 2);
  assert.equal(result.rows[0].product.properties.name, 'Apple');
});

test('Neo4j serialization caps exposed records at 500 and marks truncation', () => {
  const records = Array.from({ length: 501 }, (_, index) => ({ keys: ['value'], get: () => index }));
  const result = normalizeNeo4jRecords(records);
  assert.equal(result.rows.length, 500);
  assert.equal(result.truncated, true);
  assert.equal(result.resultType, 'table');
});

test('Neo4j 64-bit integers serialize as exact decimal strings', () => {
  const value = neo4j.int('9007199254740993');
  const result = normalizeNeo4jRecords([{ keys: ['count'], get: () => value }]);
  assert.equal(result.rows[0].count, '9007199254740993');
});

test('Neo4j graph entity payload is capped without merging distinct edges', () => {
  const nodes = Array.from({ length: 501 }, (_, index) => marked('__isNode__', {
    elementId: `node-${index}`, labels: ['Product'], properties: { name: `Item ${index}` },
  }));
  const result = normalizeNeo4jRecords([{ keys: ['nodes'], get: () => nodes }]);
  assert.equal(result.graph.nodes.length, 500);
  assert.equal(result.truncated, true);
});

test('Neo4j streaming consumes records and keeps only the bounded sample', async () => {
  const node = marked('__isNode__', { elementId: 'node-streamed', labels: ['Product'], properties: {} });
  const rows = Array.from({ length: 700 }, (_, index) => ({ keys: ['n', 'index'], get: (key) => key === 'n' ? node : index }));
  const result = await streamNeo4jRecords({
    subscribe(observer) {
      observer.onKeys(['n', 'index']);
      rows.forEach((row) => observer.onNext(row));
      observer.onCompleted({});
    },
  });
  assert.equal(result.recordCount, 700);
  assert.equal(result.records.length, 501);
  assert.deepEqual([...result.nodeIds], ['node-streamed']);
});
