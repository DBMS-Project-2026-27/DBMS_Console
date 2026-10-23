import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSql } from './sqlSafety.js';

test('allows the four supported statement types', () => {
  for (const sql of ['SELECT * FROM PRODUCT', 'INSERT INTO CART VALUES (1)', 'UPDATE CART SET customer_id = 1', 'DELETE FROM CART']) {
    assert.equal(validateSql(sql), null);
  }
});

test('rejects database administration statements', () => {
  assert.match(validateSql('DROP TABLE PRODUCT'), /Only SELECT/);
  assert.match(validateSql('CREATE ROLE admin'), /Only SELECT/);
});

test('rejects an appended second statement', () => {
  assert.equal(validateSql('SELECT 1; DELETE FROM PRODUCT'), 'Submit one SQL statement at a time.');
});
