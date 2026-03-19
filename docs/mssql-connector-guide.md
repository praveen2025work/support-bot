# MSSQL Connector Guide

Setup and usage guide for the SQL Server database connector service.

---

## Overview

The MSSQL Connector is a standalone Express microservice that connects the chatbot to Microsoft SQL Server databases. It provides:

- **Connection management** — Pooled connections with lazy initialization
- **Saved queries** — Reusable SQL queries with dynamic filters
- **Schema introspection** — Browse schemas, tables, columns, and stored procedures
- **Read-only enforcement** — All SQL validated to prevent mutations
- **Credential encryption** — AES-256-GCM encrypted database passwords
- **Admin UI** — Full management via Admin → Connectors in the chatbot UI

---

## Architecture

```
Chat UI → Engine (4001) → MSSQL Connector (4002) → SQL Server (1433)
```

The connector runs as an independent service on port 4002. The engine calls its REST API to execute published queries. Admins manage connectors and queries through the chatbot admin panel.

---

## Tech Stack

| Component     | Technology                                  |
| ------------- | ------------------------------------------- |
| Runtime       | Node.js 18+                                 |
| Language      | TypeScript 5.9 (strict mode)                |
| Framework     | Express 4.21                                |
| SQL Driver    | `mssql` v11 (pure JavaScript, TDS protocol) |
| Logging       | Pino 9.4 (structured JSON)                  |
| Build         | esbuild (single-file bundle)                |
| Dev server    | `tsx watch` (hot reload)                    |
| Encryption    | AES-256-GCM (scrypt key derivation)         |
| Rate limiting | express-rate-limit (300 req/min)            |

---

## Prerequisites

- **Node.js 18+**
- **SQL Server** instance (2016+ recommended) — local, remote, or Docker
- **Network access** to the SQL Server port (default 1433)

### Optional: Sample Database via Docker

```bash
# From project root
npm run db:up      # Starts SQL Server + Oracle XE containers
npm run db:logs    # View database logs
npm run db:down    # Stop containers
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd services/mssql-connector
npm install
```

### 2. Set Environment Variables

Create a `.env` file or set environment variables:

```env
CONNECTOR_PORT=4002
UI_ORIGIN=http://localhost:3001
SQL_CREDENTIAL_KEY=your-secret-key-for-encrypting-passwords
LOG_LEVEL=debug
```

### 3. Start the Service

```bash
# Standalone
npm run dev

# Or with all services from project root
npm run dev:sql      # mock + engine + MSSQL + Oracle + UI
npm run dev:mssql    # engine + MSSQL + UI
```

### 4. Verify

```bash
curl http://localhost:4002/health
# → { "status": "ok", "type": "mssql", "version": "1.0.0", ... }
```

---

## Environment Variables

| Variable             | Default                 | Required | Description                                       |
| -------------------- | ----------------------- | -------- | ------------------------------------------------- |
| `CONNECTOR_PORT`     | `4002`                  | No       | HTTP listen port                                  |
| `CONNECTOR_TYPE`     | `mssql`                 | No       | Connector type identifier                         |
| `DATA_DIR`           | `./data`                | No       | Data directory for configs and queries            |
| `UI_ORIGIN`          | `http://localhost:3001` | No       | CORS allowed origin                               |
| `CONNECTOR_API_KEY`  | (none)                  | No       | API key for request authentication                |
| `SQL_CREDENTIAL_KEY` | (none)                  | Yes      | Encryption key for stored database passwords      |
| `LOG_LEVEL`          | `info`                  | No       | Pino log level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV`           | `development`           | No       | Environment mode                                  |
| `RATE_LIMIT`         | `300`                   | No       | Max requests per minute                           |

---

## Configuration via Admin UI

### Creating a Connector

1. Go to **Admin → Connectors** in the chatbot UI
2. Click **Add Connector** → select **MSSQL**
3. Fill in connection details:

| Field          | Example                         | Description                   |
| -------------- | ------------------------------- | ----------------------------- |
| Name           | Production DB                   | Human-readable name           |
| Host           | `localhost` or `db.company.com` | SQL Server hostname           |
| Port           | `1433`                          | SQL Server port               |
| Database       | `MyDatabase`                    | Database name                 |
| Default Schema | `dbo`                           | Default schema for browsing   |
| Auth Type      | `sql_auth`                      | `sql_auth` or `windows_auth`  |
| Username       | `sa`                            | SQL login username            |
| Password       | `••••••`                        | Encrypted and stored securely |

4. Click **Test Connection** — verifies connectivity and shows SQL Server version
5. Click **Save**

### Browsing Database Schema

Once connected, the Admin UI provides schema introspection:

- **Schemas** — List all available schemas
- **Tables & Views** — Browse tables and views per schema
- **Columns** — View column details (name, type, nullable, primary key)
- **Stored Procedures** — List procedures with parameter definitions

---

## Saved Queries

### Creating a Saved Query

In the Saved Queries tab of a connector:

1. Click **New Query**
2. Enter query details:

| Field          | Required | Description                                        |
| -------------- | -------- | -------------------------------------------------- |
| ID             | Yes      | Unique identifier (used as the query name in Chat) |
| Name           | Yes      | Display name                                       |
| Description    | No       | What this query does                               |
| SQL Text       | Yes\*    | The SELECT statement                               |
| Procedure Name | Yes\*    | Stored procedure name (alternative to SQL)         |
| Filters        | No       | Dynamic filter definitions                         |
| Max Rows       | No       | Row limit (default 10,000)                         |

\*Either SQL Text or Procedure Name is required.

3. Click **Preview** to test (capped at 100 rows)
4. Click **Save**

### SQL Query Examples

**Simple query:**

```sql
SELECT OrderId, CustomerName, OrderDate, Status, TotalAmount
FROM dbo.Orders
```

**JOIN with aggregation:**

```sql
SELECT p.Name AS ProductName, p.Category,
       COUNT(oi.OrderItemId) AS TotalOrders,
       SUM(oi.Subtotal) AS TotalRevenue,
       AVG(oi.UnitPrice) AS AvgUnitPrice
FROM dbo.OrderItems oi
JOIN dbo.Products p ON p.ProductId = oi.ProductId
JOIN dbo.Orders o ON o.OrderId = oi.OrderId
GROUP BY p.Name, p.Category
ORDER BY TotalRevenue DESC
```

**JOIN with department lookup:**

```sql
SELECT e.EmployeeId, e.FirstName, e.LastName, e.Email, e.Title,
       d.Name AS Department, d.Location, e.Salary, e.HireDate, e.IsActive
FROM dbo.Employees e
JOIN dbo.Departments d ON d.DepartmentId = e.DepartmentId
ORDER BY d.Name, e.LastName
```

**Aggregation summary:**

```sql
SELECT o.Status,
       COUNT(o.OrderId) AS OrderCount,
       SUM(o.TotalAmount) AS TotalValue,
       AVG(o.TotalAmount) AS AvgOrderValue,
       MIN(o.OrderDate) AS EarliestOrder,
       MAX(o.OrderDate) AS LatestOrder
FROM dbo.Orders o
GROUP BY o.Status
ORDER BY TotalValue DESC
```

### Filter Configuration

Filters allow users to dynamically narrow query results. Each filter generates a parameterized WHERE clause at execution time.

```json
{
  "filters": [
    { "key": "status", "binding": "body" },
    { "key": "Department", "binding": "body", "column": "d.Name" },
    { "key": "IsActive", "binding": "body", "column": "e.IsActive" },
    { "key": "Category", "binding": "body", "column": "p.Category" }
  ]
}
```

| Field     | Required | Description                                                                  |
| --------- | -------- | ---------------------------------------------------------------------------- |
| `key`     | Yes      | Filter name (used in Chat: "run query status Completed")                     |
| `binding` | Yes      | Where the filter value comes from (`body` = request body)                    |
| `column`  | No       | Explicit column reference for JOINs (e.g., `d.Name` instead of `Department`) |

**Why use `column`?** In JOIN queries, the filter key may not match the actual column name. For example, `Department` is an alias for `d.Name` — using `column: "d.Name"` tells the connector to generate `WHERE d.Name = @Department` instead of `WHERE [Department] = @Department`.

### Dynamic WHERE Clause Logic

The connector intelligently builds WHERE clauses:

1. Removes trailing semicolons from the SQL
2. Detects existing WHERE, GROUP BY, HAVING, ORDER BY clauses
3. If no WHERE exists: inserts `WHERE` before any GROUP BY/ORDER BY
4. If WHERE exists: appends `AND` conditions before trailing clauses
5. Uses `@paramName` parameter binding (safe from SQL injection)
6. Qualified column refs (containing `.`) are used as-is; others are bracketed (`[column]`)

### Read-Only Enforcement

All SQL is validated before execution. The following are **blocked**:

- `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`
- `CREATE`, `MERGE`, `REPLACE`
- `EXEC` / `EXECUTE` (in ad-hoc SQL — stored procedures are handled separately)

Only `SELECT` and `WITH` (CTE) statements are allowed.

---

## Publishing Queries to Engine

After creating and testing a saved query, publish it to the engine to make it available in Chat:

1. Click **Publish to Engine** on the saved query
2. The query is registered in the engine's query catalog
3. Users can now run it: "run order_details status Completed"

### Published State

- Queries show a **"Published"** badge when they're registered in the engine
- Re-publishing updates the existing engine record (upsert behavior)
- The published state persists across page reloads

### What Gets Published

| Field           | Sent to Engine                    |
| --------------- | --------------------------------- |
| Query name (ID) | Used as the query name in Chat    |
| Description     | Shown to users                    |
| Base URL        | Connector's API URL for execution |
| Filters         | Available filter options          |
| Column config   | Auto-detected column types        |
| Chart config    | Default chart settings            |

---

## API Reference

### Health Check

```
GET /health
→ { "status": "ok", "type": "mssql", "version": "1.0.0", "uptime": 123.45 }
```

### Connectors

```
GET    /api/connectors                    → List all connectors
GET    /api/connectors/:id               → Get connector details
POST   /api/connectors                   → Create connector
PUT    /api/connectors/:id               → Update connector
DELETE /api/connectors/:id               → Delete connector
POST   /api/connectors/:id/test          → Test connection
GET    /api/connectors/:id/schemas       → List schemas
GET    /api/connectors/:id/tables?schema=dbo  → List tables
GET    /api/connectors/:id/columns?schema=dbo&table=Orders  → Get columns
GET    /api/connectors/:id/procedures?schema=dbo  → List procedures
POST   /api/connectors/:id/preview       → Execute test query (max 100 rows)
```

### Saved Queries

```
GET    /api/queries                       → List saved queries
GET    /api/queries?connectorId=sample-mssql  → Filter by connector
GET    /api/queries/:queryId             → Get single query
POST   /api/queries                      → Create query
PUT    /api/queries/:queryId             → Update query
DELETE /api/queries/:queryId             → Delete query
POST   /api/queries/:queryId/execute     → Execute query with filters
```

### Execute Request/Response

```bash
curl -X POST http://localhost:4002/api/queries/revenue_by_product/execute \
  -H "Content-Type: application/json" \
  -d '{"filters": {"Category": "Electronics"}}'
```

Response:

```json
{
  "data": [
    {
      "ProductName": "Laptop Pro",
      "Category": "Electronics",
      "TotalOrders": 42,
      "TotalRevenue": 125000
    }
  ],
  "rowCount": 5,
  "executionTime": 45,
  "columns": ["ProductName", "Category", "TotalOrders", "TotalRevenue"],
  "truncated": false
}
```

---

## Data Files

```
services/mssql-connector/data/
├── connectors/
│   ├── connectors.json         # Connector configurations
│   └── credentials.enc.json    # AES-256-GCM encrypted passwords
└── queries/
    └── queries.json            # Saved query definitions
```

### Sample queries.json Entry

```json
{
  "id": "revenue_by_product",
  "name": "Revenue by Product",
  "description": "Product revenue with order counts — JOIN across OrderItems, Products, and Orders",
  "connectorId": "sample-mssql",
  "sqlText": "SELECT p.Name AS ProductName, p.Category, COUNT(oi.OrderItemId) AS TotalOrders, SUM(oi.Subtotal) AS TotalRevenue FROM dbo.OrderItems oi JOIN dbo.Products p ON p.ProductId = oi.ProductId JOIN dbo.Orders o ON o.OrderId = oi.OrderId GROUP BY p.Name, p.Category ORDER BY TotalRevenue DESC",
  "filters": [{ "key": "Category", "binding": "body", "column": "p.Category" }],
  "maxRows": 10000
}
```

---

## Connection Pooling

| Setting             | Default | Description                      |
| ------------------- | ------- | -------------------------------- |
| `maxPoolSize`       | 10      | Maximum connections in pool      |
| `min`               | 0       | Minimum idle connections         |
| `idleTimeoutMillis` | 30,000  | Close idle connections after 30s |
| `connectionTimeout` | 30,000  | Connection attempt timeout       |
| `requestTimeout`    | 60,000  | Query execution timeout          |

Pools are created lazily on first use and closed gracefully on shutdown.

---

## Security

| Feature                  | Implementation                                   |
| ------------------------ | ------------------------------------------------ |
| SQL injection prevention | Parameterized queries via `request.input()`      |
| Read-only enforcement    | Regex validation blocks all mutation statements  |
| Credential encryption    | AES-256-GCM with scrypt key derivation           |
| Rate limiting            | 300 requests/minute (configurable)               |
| CORS                     | Restricted to `UI_ORIGIN`                        |
| API key auth             | Optional `X-API-Key` or `Bearer` token           |
| Log redaction            | Sensitive fields auto-masked in logs             |
| TLS                      | Database connections encrypted (`encrypt: true`) |

---

## Result Limits

| Context         | Limit       | Configurable                            |
| --------------- | ----------- | --------------------------------------- |
| Admin preview   | 100 rows    | No (hardcoded in UI)                    |
| Chat response   | 500 rows    | `MAX_CHAT_ROWS` in engine query handler |
| Query execution | 10,000 rows | `maxRows` per query definition          |

When results are truncated, the response includes `"truncated": true` and Chat shows "showing first 500 of N rows".

---

## Production Deployment

### Build

```bash
cd services/mssql-connector
npm run build
# → dist/server.js (single file, ~25ms build)
```

### Run

```bash
NODE_ENV=production CONNECTOR_PORT=4002 SQL_CREDENTIAL_KEY=your-key node dist/server.js
```

### Windows (NSSM)

See the [NSSM section in SETUP.md](./SETUP.md#windows-deployment-with-nssm) for installing as a Windows service.

### Docker

Build and run as a Docker container:

```bash
docker build -t chatbot-mssql-connector -f services/mssql-connector/Dockerfile services/mssql-connector/
docker run -p 4002:4002 -e SQL_CREDENTIAL_KEY=your-key chatbot-mssql-connector
```

---

## Troubleshooting

| Problem                    | Solution                                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| Connection refused         | Check SQL Server is running and accessible on the configured host:port |
| Login failed               | Verify username/password in Admin UI; check SQL Server auth mode       |
| "Invalid column name"      | Use `column` field in filter config for aliased columns in JOINs       |
| WHERE after ORDER BY       | Connector auto-handles this; ensure query SQL is well-formed           |
| Port 4002 in use           | `lsof -ti:4002 \| xargs kill -9` (Mac/Linux) or check with `netstat`   |
| Encrypted credentials lost | Re-enter passwords via Admin UI; they're re-encrypted automatically    |
| Slow queries               | Check query plan in SSMS; add indexes; reduce `maxRows`                |
| "SQL blocked" error        | Only SELECT/WITH statements are allowed; remove any mutation keywords  |
