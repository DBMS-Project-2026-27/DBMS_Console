
## 🌐 Live Demo

**[Open Online Grocery Delivery SQL Console](https://dbms-console.vercel.app/)**

# Online Grocery Delivery Platform — SQL Console

 A browser-based SQL and PL/SQL console for the Online Grocery Delivery Platform, connected to an Oracle Database. Explore the complete 20-table database schema, execute SQL queries, inspect results, and demonstrate PL/SQL functionality through an interactive web interface.

## Live Demo

[Open SQL Console](https://dbms-console.vercel.app/)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Web Console](#web-console)
- [API Reference](#api-reference)
- [SQL and PL/SQL](#sql-and-plsql)
- [Order Workflow](#order-workflow)
- [Example Queries](#example-queries)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Project Information](#project-information)

## Overview

The Online Grocery Delivery Platform is a Database Management Systems project implemented using Oracle SQL and PL/SQL.

The database contains 20 relations covering customers, products, categories, carts, orders, payments, delivery, warehouses, reviews, returns, refunds, and invoices.

A custom web-based SQL Console is developed to interact with the Oracle database through a Flask backend.

---

## Features

### SQL Console

- Execute SQL queries through a web interface
- Display query results in a formatted table
- Show execution time and row count
- Display SQL errors
- Clear and copy queries
- Query library for commonly used SQL commands

### Database Explorer

- View all 20 project tables
- Select a table from the database explorer
- Retrieve table records directly from Oracle
- Display column names and data dynamically

### SQL and PL/SQL Support

The project demonstrates:

- DDL commands
- DML commands
- SELECT queries
- Aggregate functions
- Joins
- Subqueries
- Stored procedures
- Functions
- Triggers
- Cursors
- Packages
- Exception handling

---

## Tech Stack

| Component | Technology |
|---|---|
| Database | Oracle Database 26ai |
| Database Service | FREEPDB1 |
| Query Language | SQL |
| Procedural Language | PL/SQL |
| Backend | Python + Flask |
| Oracle Driver | python-oracledb |
| Frontend | HTML5, CSS3, JavaScript |
| IDE | Visual Studio Code |
| Version Control | Git + GitHub |

---

## Project Structure

```text
OnlineGrocerySQLConsole/
├── app.py
├── database.py
├── load_sql.py
├── requirements.txt
├── .env
│
├── templates/
│   ├── index.html
│   └── console.html
│
├── static/
│   ├── css/
│   │   ├── landing.css
│   │   └── console.css
│   │
│   └── js/
│       ├── landing.js
│       └── console.js
│
└── README.md
```
## Database Schema

The database contains the following 20 relations:
| No. | Relation            | Description                          |
| --: | ------------------- | ------------------------------------ |
|   1 | `PINCODE_INFO`      | Pincode and location information     |
|   2 | `CATEGORY`          | Grocery product categories           |
|   3 | `WAREHOUSE`         | Warehouse information                |
|   4 | `PAYMENT_METHOD`    | Payment method details               |
|   5 | `DELIVERY_AGENT`    | Delivery agent information           |
|   6 | `CUSTOMER`          | Customer details                     |
|   7 | `ADDRESS`           | Customer address information         |
|   8 | `PRODUCT`           | Grocery product details              |
|   9 | `DELIVERY_SCHEDULE` | Delivery scheduling information      |
|  10 | `STORED_IN_SLOT`    | Warehouse slot allocation            |
|  11 | `STORED_IN_QTY`     | Product quantity stored in warehouse |
|  12 | `OFFERS`            | Product offer information            |
|  13 | `CART`              | Customer shopping carts              |
|  14 | `RETURNS`           | Product return records               |
|  15 | `CONTAINS`          | Products contained in carts          |
|  16 | `ORDERS`            | Customer order information           |
|  17 | `REVIEW`            | Product reviews and ratings          |
|  18 | `REFUND`            | Refund information                   |
|  19 | `PAYMENT`           | Payment transaction details          |
|  20 | `INVOICE`           | Invoice information                  |

The database uses primary keys, foreign keys, unique constraints, NOT NULL constraints, and composite keys to maintain data integrity.

## Getting Started
### Prerequisites

Make sure the following are installed:

- Python 3.x
- Oracle Database 26ai
- Git
- Visual Studio Code
- A modern web browser

### Clone the Repository

```bash
git clone https://github.com/DBMS-Project-2026-27/DBMS_Console.git
cd DBMS_Console
```
### Create Virtual Environment
### For Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

### Install Dependencies:

```bash
pip install -r requirements.txt
```

### Configure Oracle Database

Configure the Oracle database connection using environment variables in the .env file.
```bash
Host=localhost
Port=1521
Service=FREEPDB1
```
Do not add the actual database password to the README or GitHub repository.

### Run the Application
```bash
python app.py
```
The application will be available at:
```bash
http://127.0.0.1:5000
```
## Web Console

The web interface provides an interactive SQL environment connected to the Oracle database.

The console includes:

- SQL Editor
- Execute button
- Clear button
- Copy query option
- Query Results section
- Database Explorer
- Query Library
- Database connection status

The Database Explorer allows users to select a table and retrieve its records directly from Oracle.

## API Reference
The Flask backend provides the following API endpoints:

| Method | Endpoint                  | Description                           |
| ------ | ------------------------- | ------------------------------------- |
| `GET`  | `/`                       | Displays the landing page             |
| `GET`  | `/sql-console`            | Opens the SQL Console                 |
| `GET`  | `/api/tables`             | Returns the list of project tables    |
| `GET`  | `/api/table/<table_name>` | Returns records from a selected table |
| `POST` | `/api/execute`            | Executes an SQL statement             |

Example API Request:
```bash
{
  "sql": "SELECT * FROM CUSTOMER"
}
```
The API returns query results along with information such as row count and execution time.

## SQL and PL/SQL

The project implements SQL and PL/SQL concepts required for the database system.

### SQL Concepts

- Data Definition Language
- Data Manipulation Language
- SELECT statements
- Aggregate functions
- GROUP BY
- Joins
- Subqueries
- Filtering
- Sorting

### Stored Procedures

The project includes the following procedures:

```sql
SP_PLACE_ORDER
SP_PROCESS_RETURN
SP_PRINT_ORDER_HISTORY
```

#### Function:
```bash
FN_PRODUCT_REVIEW_AVG
```
This function calculates the average review rating for a product.

#### Package:
```bash
PKG_ORDERS
```
The package provides:
```bash
place_order()
cancel_order()
get_order_status()
```
### Triggers

Sequences and triggers are used for automatic ID generation.

The project also contains a compound trigger:
```bash
TRG_UPDATE_CART_TOTALS
```
This trigger automatically updates:
```bash
Total_Items
Total_Price
```
in the CART relation when records in the CONTAINS relation are inserted, updated, or deleted.

### Cursor
A cursor-based procedure is implemented to display order history.

### Exception Handling
PL/SQL exception handling is used to handle invalid operations and database-related errors.


## Order Workflow

The main order-related database flow is:

```text
CUSTOMER
   |
   v
CART
   |
   v
CONTAINS
   |
   v
ORDERS
   |
   v
PAYMENT
   |
   v
INVOICE
```
Supporting relations include:
```bash
PRODUCT
CATEGORY
WAREHOUSE
DELIVERY_AGENT
DELIVERY_SCHEDULE
REVIEW
RETURNS
```

## Example Queries
### Display Customers:
```bash
SELECT * FROM CUSTOMER;
```
### Display Products:
```bash
SELECT * FROM PRODUCT;
```
### Count Products by Category:
```bash
SELECT CATEGORY_NAME, COUNT(*) AS PRODUCT_COUNT
FROM PRODUCT
GROUP BY CATEGORY_NAME;
```

### Display Customer Orders:
```bash
SELECT
    C.Customer_Name,
    O.Order_ID,
    O.Total_Amount
FROM CUSTOMER C
JOIN ORDERS O
    ON C.Customer_ID = O.Customer_ID;
```

### Products Above Average Price:
```bash
SELECT *
FROM PRODUCT
WHERE Price_Of_Item >
      (SELECT AVG(Price_Of_Item)
       FROM PRODUCT);
```

## Security

Database credentials are stored using environment variables.

The `.env` file should never be committed to GitHub.

Recommended `.gitignore` entries:

```text
.env
venv/
__pycache__/
```
## Troubleshooting

### Oracle Connection Error

Make sure the Oracle Database service is running and verify:

```text
Host: localhost
Port: 1521
Service: FREEPDB1
```

## Flask Application Not Starting

Activate the virtual environment:
```bash
venv\Scripts\activate
```

Then run:
```bash
python app.py
```

## Missing Python Package
Install the required dependencies:
```bash
pip install -r requirements.txt
```

## SQL Execution Error
Check the SQL statement and read the Oracle error displayed by the console.
For foreign-key errors, make sure the referenced parent record exists before inserting a child record.


## Project Information
| Field           | Details                          |
| --------------- | -------------------------------- |
| Project         | Online Grocery Delivery Platform |
| Database        | Oracle Database 26ai             |
| Backend         | Python Flask                     |
| Frontend        | HTML, CSS, JavaScript            |
| Oracle Driver   | python-oracledb                  |
| Version Control | GitHub                           |

The project demonstrates database design, SQL implementation, PL/SQL programming, database constraints, triggers, procedures, functions, packages, and integration with a web-based SQL Console.


