# Online Grocery Delivery SQL Console

> A browser-based SQL and PL/SQL console for the Online Grocery Delivery Platform, connected to an Oracle Database. Explore the 19-table database schema, execute SQL queries, inspect results, and demonstrate PL/SQL functionality through an interactive web interface.

## 🌐 Live Demo

**[Open Online Grocery Delivery SQL Console](https://dbms-console.vercel.app/)**


## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Web Console](#web-console)
- [API Reference](#api-reference)
- [SQL & PL/SQL Features](#sql--plsql-features)
- [Troubleshooting](#troubleshooting)

---

## 📌 Overview

The **Online Grocery Delivery SQL Console** is a DBMS project that implements the database of an Online Grocery Delivery Platform using **Oracle SQL and PL/SQL**.

The database contains **20 relations** covering customers, products, carts, orders, payments, delivery, warehouses, reviews, returns, refunds, and invoices.

A browser-based SQL Console is provided as the interface to interact with the Oracle database. Users can execute SQL statements, explore database tables, view query results, and demonstrate PL/SQL components.

The application follows this architecture:

```text
Browser
   ↓
SQL Console
   ↓
Flask Backend
   ↓
python-oracledb
   ↓
Oracle FREEPDB1
   ↓
20 Database Relations

 Features
-> Web SQL Console
Interactive SQL editor
Execute SQL statements directly against Oracle
Formatted query results
Row count and execution time
SQL error display
Clear and Copy query options
Session query history

  ->Database Explorer

Displays all 20 project relations
Clickable table explorer
View table records directly from the browser
Dynamically retrieves data from Oracle

-> Query Library

Includes examples for:

1.Basic SQL
2.Aggregate queries
3.Joins
4.Subqueries
5.PL/SQL

   Database Automation
Oracle sequences for ID generation
Automatic ID-generation triggers
Compound trigger for cart-total calculation
Stored procedures
PL/SQL function
Explicit cursor
PL/SQL package
Exception handling

 Tech Stack
Layer	Technology
Database	Oracle Database 26ai
Database Service	FREEPDB1
Query Language	SQL
Procedural Language	PL/SQL
Backend	Python + Flask
Oracle Driver	python-oracledb
Frontend	HTML5, CSS3, JavaScript
Development	Visual Studio Code
Version Control	Git + GitHub


   Project Structure
OnlineGrocerySQLConsole/
│
├── app.py                  # Flask backend and API routes
├── database.py             # Oracle database connection
├── load_sql.py             # SQL/PLSQL script execution utility
├── requirements.txt        # Python dependencies
├── .env                    # Local database configuration
│
├── templates/
│   ├── index.html          # Landing page
│   └── console.html        # SQL Console interface
│
├── static/
│   ├── css/
│   │   ├── landing.css     # Landing page styling
│   │   └── console.css     # Console styling
│   │
│   └── js/
│       ├── landing.js      # Landing page interactions
│       └── console.js      # Console functionality
│
└── README.md


->   Database Schema

The database consists of 20 relations designed for the Online Grocery Delivery Platform.

#	Table	Description
1	PINCODE_INFO	Pincode and location information
2	CATEGORY	Grocery product categories
3	WAREHOUSE	Warehouse information
4	PAYMENT_METHOD	Available payment methods
5	DELIVERY_AGENT	Delivery agent details
6	CUSTOMER	Customer information
7	ADDRESS	Customer delivery addresses
8	PRODUCT	Grocery product details
9	DELIVERY_SCHEDULE	Delivery scheduling information
10	STORED_IN_SLOT	Product warehouse-slot mapping
11	STORED_IN_QTY	Product quantities
12	OFFERS	Product offers
13	CART	Customer shopping carts
14	RETURNS	Return records
15	CONTAINS	Products contained in carts
16	ORDERS	Customer orders
17	REVIEW	Product reviews and ratings
18	REFUND	Refund information
19	PAYMENT	Payment transactions
20	INVOICE	Generated invoices


->Database Integrity
The database uses:

Primary Keys
Foreign Keys
Unique constraints
NOT NULL constraints
Composite keys where required
Referential integrity

   -> Getting Started
Prerequisites

Make sure the following are installed:

Python 3.x
Oracle Database 26ai
Git
A modern web browser
1. Clone the Repository
git clone YOUR_GITHUB_REPOSITORY_URL
cd OnlineGrocerySQLConsole
2. Create a Virtual Environment

For Windows:

python -m venv venv
venv\Scripts\activate
3. Install Dependencies
pip install -r requirements.txt
4. Configure Oracle

Configure the Oracle connection details in .env.

The application uses:

Host: localhost
Port: 1521
Service: FREEPDB1
5. Start the Application
python app.py

Open the application in your browser:

http://127.0.0.1:5000
-> Web Console

The SQL Console provides a browser-based interface for interacting with the Oracle database.

Main Components
┌─────────────────────────────────────────────────────┐
│ grocery.sql                    ● FREEPDB1 Connected │
├───────────────┬─────────────────────────────────────┤
│ SQL Console   │                                     │
│               │       SQL Editor                    │
│ Database      │                                     │
│ Explorer      │  SELECT * FROM CUSTOMER;            │
│               │                                     │
│ Query Library │       [ Execute ]                   │
│               │                                     │
│ 20 Relations  │       Query Results                 │
│               │                                     │
│ CUSTOMER      │  CUSTOMER_ID | CUSTOMER_NAME       │
│ PRODUCT       │  C021        | ...                 │
│ ORDERS        │                                     │
│ PAYMENT       │                                     │
└───────────────┴─────────────────────────────────────┘
Database Explorer

Selecting a table from the sidebar retrieves its records directly from Oracle.

For example:

PRODUCT
   ↓
SELECT * FROM PRODUCT
   ↓
Formatted Results
Query History

Queries executed during the current browser session can be viewed through the Query History section.

🔌 API Reference

The Flask backend provides API endpoints used by the frontend.

Method	Endpoint	Description
GET	/	Loads the landing page
GET	/sql-console	Loads the SQL Console
GET	/api/tables	Returns the 20 database tables
GET	/api/table/<table_name>	Returns records from a table
POST	/api/execute	Executes an SQL statement
POST /api/execute

Example request:

{
  "sql": "SELECT * FROM CUSTOMER"
}

For a successful query, the backend returns:

Columns
Rows
Row count
Execution time

For DML statements, the response contains the number of affected rows.

-> SQL & PL/SQL Features

The project demonstrates major DBMS concepts through Oracle SQL and PL/SQL.

SQL
DDL
DML
SELECT queries
Aggregate functions
GROUP BY
Joins
Subqueries
Filtering and sorting
PL/SQL
Procedures
SP_PLACE_ORDER
SP_PROCESS_RETURN
SP_PRINT_ORDER_HISTORY
Function
FN_PRODUCT_REVIEW_AVG

Calculates the average rating of a product.

Package
PKG_ORDERS

Provides:

place_order()
cancel_order()
get_order_status()
Triggers

The database includes automatic ID-generation triggers and:

TRG_UPDATE_CART_TOTALS

The cart trigger automatically recalculates:

Total_Items
Total_Price

whenever cart contents change.

Exception Handling

PL/SQL procedures handle situations such as:

Empty carts
Missing orders
Invalid customer/cart combinations
Database constraint violations
-> Order Workflow

The database represents the core grocery ordering flow:

CUSTOMER
    ↓
CART
    ↓
CONTAINS
    ↓
ORDERS
    ↓
PAYMENT
    ↓
INVOICE

Additional entities handle:

PRODUCT
CATEGORY
WAREHOUSE
DELIVERY
REVIEW
RETURNS
REFUND
-> Sample SQL Queries

The console can be used to demonstrate queries such as:

View Customers
SELECT * FROM CUSTOMER;
View Products
SELECT * FROM PRODUCT;
Aggregate Query
SELECT CATEGORY_NAME, COUNT(*) AS PRODUCT_COUNT
FROM PRODUCT
GROUP BY CATEGORY_NAME;
Join Query
SELECT
    C.Customer_Name,
    O.Order_ID,
    O.Total_Amount
FROM CUSTOMER C
JOIN ORDERS O
    ON C.Customer_ID = O.Customer_ID;
Subquery
SELECT *
FROM PRODUCT
WHERE Price_Of_Item >
      (SELECT AVG(Price_Of_Item)
       FROM PRODUCT);
-> Troubleshooting
Oracle Connection Error

Check that the Oracle database service is running and verify:

Host: localhost
Port: 1521
Service: FREEPDB1
Flask Not Starting

Make sure the virtual environment is activated:

venv\Scripts\activate

Then run:

python app.py
Dependency Error

Install the required packages:

pip install -r requirements.txt
