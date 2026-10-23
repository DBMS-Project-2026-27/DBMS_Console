-- ================================================================
-- ONLINE GROCERY DELIVERY SQL CONSOLE
-- DDL + DML PRACTICE QUERIES
-- Target: PostgreSQL / Neon
-- ================================================================
--
-- IMPORTANT:
-- 1. This file is for practice and revision.
-- 2. Do NOT run DROP/TRUNCATE on the live project tables.
-- 3. Destructive DDL examples below use a TEMP table wherever possible.
-- 4. DML examples on PRODUCT are wrapped in a transaction and end with
--    ROLLBACK, so the live database is not permanently changed.
-- 5. SELECT queries are DQL, not DML, but a small practice section is
--    included because SELECT is commonly used with DML/DDL practice.
--
-- Current project tables:
-- PERSON, CUSTOMER, DELIVERY_AGENT, ADDRESS, CATEGORY, PRODUCT,
-- WAREHOUSE, STORED_IN, CART, CONTAINS, OFFERS, REVIEW, ORDERS,
-- PAYMENT_METHOD, PAYMENT, RETURN, REFUND, INVOICE, DELIVERY_SCHEDULE
--
-- ================================================================
-- 1. DDL - DATA DEFINITION LANGUAGE
-- ================================================================

-- ------------------------------------------------
-- 1.1 CREATE TABLE
-- ------------------------------------------------
-- CREATE defines a new table and its structure.

CREATE TEMP TABLE practice_product (
    product_id INTEGER PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price_of_item NUMERIC(10,2) NOT NULL,
    category_name VARCHAR(50)
);

-- Check the temporary table
SELECT * FROM practice_product;


-- ------------------------------------------------
-- 1.2 ALTER TABLE - ADD COLUMN
-- ------------------------------------------------
ALTER TABLE practice_product
ADD COLUMN stock_quantity INTEGER DEFAULT 0;

SELECT * FROM practice_product;


-- ------------------------------------------------
-- 1.3 ALTER TABLE - RENAME COLUMN
-- ------------------------------------------------
ALTER TABLE practice_product
RENAME COLUMN stock_quantity TO quantity_in_stock;


-- ------------------------------------------------
-- 1.4 ALTER TABLE - ALTER COLUMN
-- ------------------------------------------------
ALTER TABLE practice_product
ALTER COLUMN quantity_in_stock SET DEFAULT 10;


-- ------------------------------------------------
-- 1.5 ALTER TABLE - ADD CONSTRAINT
-- ------------------------------------------------
ALTER TABLE practice_product
ADD CONSTRAINT chk_practice_product_price
CHECK (price_of_item >= 0);


-- ------------------------------------------------
-- 1.6 ALTER TABLE - RENAME TABLE
-- ------------------------------------------------
ALTER TABLE practice_product
RENAME TO practice_product_demo;


-- ------------------------------------------------
-- 1.7 TRUNCATE TABLE
-- ------------------------------------------------
-- TRUNCATE removes all rows but keeps the table structure.
-- Safe here because this is a TEMP table.

TRUNCATE TABLE practice_product_demo;


-- ------------------------------------------------
-- 1.8 DROP TABLE
-- ------------------------------------------------
-- DROP removes the table itself.
-- Safe here because this is a TEMP table.

DROP TABLE practice_product_demo;


-- ================================================================
-- 2. DML - DATA MANIPULATION LANGUAGE
-- ================================================================
-- DML changes rows inside existing tables.
-- Main commands: INSERT, UPDATE, DELETE
-- ================================================================


-- ------------------------------------------------
-- 2.1 INSERT - single row
-- ------------------------------------------------
BEGIN;

INSERT INTO PRODUCT
(product_id, product_name, price_of_item, category_name)
VALUES
(998, 'Practice Grocery Item', 150.00, 'Snacks');

SELECT *
FROM PRODUCT
WHERE product_id = 998;

ROLLBACK;


-- ------------------------------------------------
-- 2.2 INSERT - multiple rows
-- ------------------------------------------------
BEGIN;

INSERT INTO PRODUCT
(product_id, product_name, price_of_item, category_name)
VALUES
(997, 'Practice Rice', 80.00, 'Grains'),
(996, 'Practice Biscuits', 45.00, 'Snacks');

SELECT *
FROM PRODUCT
WHERE product_id IN (997, 996);

ROLLBACK;


-- ------------------------------------------------
-- 2.3 UPDATE - one row
-- ------------------------------------------------
BEGIN;

UPDATE PRODUCT
SET price_of_item = 175.00
WHERE product_id = 999;

SELECT *
FROM PRODUCT
WHERE product_id = 999;

ROLLBACK;


-- ------------------------------------------------
-- 2.4 UPDATE - multiple rows
-- ------------------------------------------------
BEGIN;

UPDATE PRODUCT
SET price_of_item = price_of_item + 10
WHERE category_name = 'Snacks';

SELECT product_id, product_name, price_of_item, category_name
FROM PRODUCT
WHERE category_name = 'Snacks';

ROLLBACK;


-- ------------------------------------------------
-- 2.5 DELETE - one row
-- ------------------------------------------------
BEGIN;

INSERT INTO PRODUCT
(product_id, product_name, price_of_item, category_name)
VALUES
(995, 'Temporary Delete Item', 50.00, 'Snacks');

DELETE FROM PRODUCT
WHERE product_id = 995;

SELECT *
FROM PRODUCT
WHERE product_id = 995;

ROLLBACK;


-- ------------------------------------------------
-- 2.6 DELETE - multiple rows
-- ------------------------------------------------
-- Practice only inside a transaction.
-- The condition is deliberately based on the temporary practice rows.

BEGIN;

INSERT INTO PRODUCT
(product_id, product_name, price_of_item, category_name)
VALUES
(994, 'Delete Practice A', 10.00, 'Snacks'),
(993, 'Delete Practice B', 20.00, 'Snacks');

DELETE FROM PRODUCT
WHERE product_id IN (994, 993);

SELECT *
FROM PRODUCT
WHERE product_id IN (994, 993);

ROLLBACK;


-- ================================================================
-- 3. DQL - SELECT PRACTICE
-- ================================================================
-- SELECT is formally DQL, but these queries are useful for practicing
-- alongside DDL/DML.
-- ================================================================

-- 3.1 SELECT all rows
SELECT * FROM PRODUCT;


-- 3.2 SELECT selected columns
SELECT product_id, product_name, price_of_item
FROM PRODUCT;


-- 3.3 WHERE
SELECT product_name, price_of_item
FROM PRODUCT
WHERE price_of_item > 100;


-- 3.4 ORDER BY
SELECT product_name, price_of_item
FROM PRODUCT
ORDER BY price_of_item DESC;


-- 3.5 DISTINCT
SELECT DISTINCT category_name
FROM PRODUCT;


-- 3.6 BETWEEN
SELECT product_name, price_of_item
FROM PRODUCT
WHERE price_of_item BETWEEN 50 AND 200;


-- 3.7 LIKE
SELECT product_name
FROM PRODUCT
WHERE product_name ILIKE '%rice%';


-- 3.8 IN
SELECT product_name, category_name
FROM PRODUCT
WHERE category_name IN ('Snacks', 'Fruits');


-- 3.9 Aggregate functions
SELECT
    COUNT(*) AS total_products,
    MIN(price_of_item) AS minimum_price,
    MAX(price_of_item) AS maximum_price,
    AVG(price_of_item) AS average_price
FROM PRODUCT;


-- 3.10 GROUP BY
SELECT category_name, COUNT(*) AS product_count
FROM PRODUCT
GROUP BY category_name
ORDER BY product_count DESC;


-- 3.11 HAVING
SELECT category_name, COUNT(*) AS product_count
FROM PRODUCT
GROUP BY category_name
HAVING COUNT(*) > 1;


-- 3.12 JOIN
SELECT
    p.product_id,
    p.product_name,
    p.price_of_item,
    c.category_name,
    c.description
FROM PRODUCT p
JOIN CATEGORY c
    ON p.category_name = c.category_name
ORDER BY p.product_id;


-- 3.13 Subquery
SELECT product_name, price_of_item
FROM PRODUCT
WHERE price_of_item > (
    SELECT AVG(price_of_item)
    FROM PRODUCT
)
ORDER BY price_of_item DESC;


-- 3.14 Customer + Orders JOIN
SELECT
    p.name AS customer_name,
    o.order_id,
    o.status,
    o.total_amount
FROM PERSON p
JOIN CUSTOMER c
    ON p.person_id = c.person_id
JOIN ORDERS o
    ON c.person_id = o.customer_id;


-- 3.15 Orders + Payment + Payment Method
SELECT
    o.order_id,
    o.total_amount,
    pm.method_name,
    p.pay_amount
FROM ORDERS o
JOIN PAYMENT p
    ON o.order_id = p.order_id
JOIN PAYMENT_METHOD pm
    ON p.method_name = pm.method_name;


-- 3.16 Delivery agents
SELECT
    p.name AS agent_name,
    d.vehicle_no,
    d.status
FROM PERSON p
JOIN DELIVERY_AGENT d
    ON p.person_id = d.person_id;


-- ================================================================
-- 4. TRANSACTION CONTROL FOR SAFE DML PRACTICE
-- ================================================================

-- Start a transaction
BEGIN;

-- Make a practice change
UPDATE PRODUCT
SET price_of_item = price_of_item + 1
WHERE product_id = 999;

-- Check the change before deciding
SELECT product_id, product_name, price_of_item
FROM PRODUCT
WHERE product_id = 999;

-- Undo the change
ROLLBACK;


-- If you intentionally want to keep a DML change in a personal
-- development database, use COMMIT instead of ROLLBACK.
-- COMMIT;


-- ================================================================
-- 5. QUICK COMMAND CHEAT SHEET
-- ================================================================
--
-- DDL:
-- CREATE      -> create database objects
-- ALTER       -> change structure
-- TRUNCATE    -> remove all rows, keep structure
-- DROP        -> remove database object
-- RENAME      -> rename an object
--
-- DML:
-- INSERT      -> add rows
-- UPDATE      -> modify rows
-- DELETE      -> remove rows
--
-- DQL:
-- SELECT      -> retrieve rows
--
-- TCL:
-- BEGIN       -> start transaction
-- COMMIT      -> permanently save transaction changes
-- ROLLBACK    -> undo transaction changes
--
-- ================================================================
-- 6. PROJECT-SPECIFIC DML EXAMPLES USED IN THE LIVE CONSOLE
-- ================================================================

-- INSERT
INSERT INTO PRODUCT
(product_id, product_name, price_of_item, category_name)
VALUES
(998, 'Demo Grocery Item', 150.00, 'Snacks');

-- SELECT
SELECT *
FROM PRODUCT
WHERE product_id = 998;

-- UPDATE
UPDATE PRODUCT
SET price_of_item = 175.00
WHERE product_id = 998;

-- SELECT again
SELECT *
FROM PRODUCT
WHERE product_id = 998;

-- DELETE
DELETE FROM PRODUCT
WHERE product_id = 998;

-- Final verification
SELECT *
FROM PRODUCT
WHERE product_id = 998;


-- ================================================================
-- END OF DDL + DML PRACTICE FILE
-- ================================================================
