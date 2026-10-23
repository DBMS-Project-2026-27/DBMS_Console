# PantryGraph Cypher query library

This folder contains read-only Cypher examples for exploring the grocery graph in Neo4j Aura. Open `grocery-graph.cypher`, copy **one query at a time**, paste it into the PantryGraph Console with **Neo4j Aura / Cypher** selected, then run it. The queries return nodes and relationships so the console can show graph results when records contain graph entities.

The examples use the relationship types visible in the project’s graph query examples: `PLACED`, `CONTAINS`, `HAS_CART`, `HAS_ADDRESS`, `ASSIGNED_TO`, `IS_A_CUSTOMER`, and `IS_A_DELIVERY_AGENT`. Check the live **Schema** tab first: if a type is absent or named differently in your Neo4j database, skip or edit that example. The general exploration queries do not depend on specific labels or relationship types.

All examples use `MATCH`, `OPTIONAL MATCH`, `UNWIND`, and `RETURN`; they do not create, update, or delete data. Each section is a separate query. Do not paste the section headings or run the whole file as one query.
