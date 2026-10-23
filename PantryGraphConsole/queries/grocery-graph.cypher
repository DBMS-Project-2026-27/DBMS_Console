// PantryGraph Console — Neo4j Aura / Cypher examples
// Copy and run ONE query block at a time. All examples are read-only.

// 1. Sample nodes — works with any labels
MATCH (n)
RETURN n
LIMIT 25;

// 2. Sample relationships and their endpoints — works with any relationship type
MATCH (a)-[r]-(b)
RETURN a, r, b
LIMIT 50;

// 3. Count nodes by label — works with any labels
MATCH (n)
UNWIND labels(n) AS label
RETURN label, count(*) AS node_count
ORDER BY node_count DESC, label;

// 4. Count relationships by type — works with any relationship types
MATCH ()-[r]-()
RETURN type(r) AS relationship_type, count(*) AS relationship_count
ORDER BY relationship_count DESC, relationship_type;

// 5. Find the most connected nodes — works with any labels and relationship types
MATCH (n)
OPTIONAL MATCH (n)-[r]-()
RETURN n, count(r) AS degree
ORDER BY degree DESC
LIMIT 25;

// 6. Explore the grocery relationship types used in this project
MATCH (a)-[r]-(b)
WHERE type(r) IN [
  'PLACED', 'CONTAINS', 'HAS_CART', 'HAS_ADDRESS',
  'ASSIGNED_TO', 'IS_A_CUSTOMER', 'IS_A_DELIVERY_AGENT'
]
RETURN a, r, b
LIMIT 150;

// 7. Explore PLACED relationships
MATCH (a)-[r]-(b)
WHERE type(r) = 'PLACED'
RETURN a, r, b
LIMIT 100;

// 8. Explore CONTAINS relationships
MATCH (a)-[r]-(b)
WHERE type(r) = 'CONTAINS'
RETURN a, r, b
LIMIT 100;

// 9. Explore HAS_CART relationships
MATCH (a)-[r]-(b)
WHERE type(r) = 'HAS_CART'
RETURN a, r, b
LIMIT 100;

// 10. Explore HAS_ADDRESS relationships
MATCH (a)-[r]-(b)
WHERE type(r) = 'HAS_ADDRESS'
RETURN a, r, b
LIMIT 100;

// 11. Explore ASSIGNED_TO relationships
MATCH (a)-[r]-(b)
WHERE type(r) = 'ASSIGNED_TO'
RETURN a, r, b
LIMIT 100;

// 12. Explore IS_A_CUSTOMER relationships
MATCH (a)-[r]-(b)
WHERE type(r) = 'IS_A_CUSTOMER'
RETURN a, r, b
LIMIT 100;

// 13. Explore IS_A_DELIVERY_AGENT relationships
MATCH (a)-[r]-(b)
WHERE type(r) = 'IS_A_DELIVERY_AGENT'
RETURN a, r, b
LIMIT 100;

// 14. Explore two-hop paths using the project's known grocery relationship types
MATCH p = (start)-[r1]-()-[r2]-(finish)
WHERE type(r1) IN [
  'PLACED', 'CONTAINS', 'HAS_CART', 'HAS_ADDRESS',
  'ASSIGNED_TO', 'IS_A_CUSTOMER', 'IS_A_DELIVERY_AGENT'
]
AND type(r2) IN [
  'PLACED', 'CONTAINS', 'HAS_CART', 'HAS_ADDRESS',
  'ASSIGNED_TO', 'IS_A_CUSTOMER', 'IS_A_DELIVERY_AGENT'
]
RETURN p
LIMIT 50;

// 15. Inspect properties on nodes connected by known grocery relationship types
MATCH (a)-[r]-(b)
WHERE type(r) IN [
  'PLACED', 'CONTAINS', 'HAS_CART', 'HAS_ADDRESS',
  'ASSIGNED_TO', 'IS_A_CUSTOMER', 'IS_A_DELIVERY_AGENT'
]
RETURN labels(a) AS start_labels, properties(a) AS start_properties,
       type(r) AS relationship_type, properties(r) AS relationship_properties,
       labels(b) AS end_labels, properties(b) AS end_properties
LIMIT 100;
