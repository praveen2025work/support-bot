# Oracle Connector Guide

Setup and usage guide for the Oracle database connector service.

---

## Overview

The Oracle Connector is a standalone Express microservice that connects the chatbot to Oracle databases. It provides:

- **Connection management** — Pooled connections with lazy initialization
- **Saved queries** — Reusable SQL queries with dynamic filters
- **Schema introspection** — Browse schemas, tables, columns, and stored procedures
- **Read-only enforcement** — All SQL validated to prevent mutations
- **Credential encryption** — AES-256-GCM encrypted database passwords
- **Admin UI** — Full management via Admin → Connectors in the chatbot UI

---

## Architecture

```
Chat UI → Engine (4001) → Oracle Connector (4003) → Oracle DB (1521)
```

The connector runs as an independent service on port 4003. The engine calls its REST API to execute published queries. Admins manage connectors and queries through the chatbot admin panel.

---

## Tech Stack

| Component     | Technology                          |
| ------------- | ----------------------------------- |
| Runtime       | Node.js 18+                         |
| Language      | TypeScript 5.9 (strict mode)        |
| Framework     | Express 4.21                        |
| Oracle Driver | `oracledb` v6.7 (native driver)     |
| Logging       | Pino 9.4 (structured JSON)          |
| Build         | esbuild (single-file bundle)        |
| Dev server    | `tsx watch` (hot reload)            |
| Encryption    | AES-256-GCM (scrypt key derivation) |
| Rate limiting | express-rate-limit (300 req/min)    |

---

## Prerequisites

- **Node.js 18+**
- **Oracle Instant Client** — Required by the `oracledb` native driver
- **Oracle Database** instance (11g+ recommended) — local, remote, or Docker

### Installing Oracle Instant Client

The `oracledb` driver requires Oracle Instant Client libraries. Follow the instructions for your platform:

**macOS (Homebrew):**

```bash
brew tap InstantClientTap/instantclient
brew install instantclient-basic
```

**Linux (RPM-based):**

```bash
sudo yum install oracle-instantclient-basic
```

**Linux (Debian-based):**

```bash
sudo apt install libaio1
# Download Instant Client from Oracle website and extract to /opt/oracle/instantclient
export LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH
```

**Windows:**

1. Download Instant Client Basic from Oracle website
2. Extract to `C:\oracle\instantclient`
3. Add `C:\oracle\instantclient` to system PATH

### Optional: Sample Database via Docker

```bash
# From project root
npm run db:up      # Starts Oracle XE + SQL Server containers
npm run db:logs    # View database logs
npm run db:down    # Stop containers
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd services/oracle-connector
npm install
```

### 2. Set Environment Variables

Create a `.env` file or set environment variables:

```env
CONNECTOR_PORT=4003
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
npm run dev:oracle   # engine + Oracle + UI
```

### 4. Verify

```bash
curl http://localhost:4003/health
# → { "status": "ok", "type": "oracle", "version": "1.0.0", ... }
```

---

## Environment Variables

| Variable             | Default                 | Required | Description                                       |
| -------------------- | ----------------------- | -------- | ------------------------------------------------- |
| `CONNECTOR_PORT`     | `4003`                  | No       | HTTP listen port                                  |
| `CONNECTOR_TYPE`     | `oracle`                | No       | Connector type identifier                         |
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
2. Click **Add Connector** → select **Oracle**
3. Fill in connection details:

| Field          | Example                         | Description                   |
| -------------- | ------------------------------- | ----------------------------- |
| Name           | Production Oracle               | Human-readable name           |
| Host           | `localhost` or `db.company.com` | Oracle hostname               |
| Port           | `1521`                          | Oracle listener port          |
| Database       | `XEPDB1`                        | Service name or SID           |
| Default Schema | `HR`                            | Default schema for browsing   |
| Auth Type      | `sql_auth`                      | `sql_auth` or `windows_auth`  |
| Username       | `testuser`                      | Oracle username               |
| Password       | `••••••`                        | Encrypted and stored securely |

4. Click **Test Connection** — verifies connectivity and shows Oracle version banner
5. Click **Save**

### Connection String Format

Oracle connections use the format: `host:port/service_name`

Examples:

- `localhost:1521/XEPDB1` — Local Oracle XE
- `db.company.com:1521/ORCL` — Remote Oracle instance
- `rac-scan:1521/PRODDB` — Oracle RAC via SCAN listener

### Browsing Database Schema

Once connected, the Admin UI provides schema introspection:

- **Schemas** — List all available schemas (from `ALL_USERS`, excluding system schemas)
- **Tables & Views** — Browse tables and views per schema (from `ALL_OBJECTS`)
- **Columns** — View column details including primary key detection (from `ALL_TAB_COLUMNS`)
- **Stored Procedures** — List procedures with parameter definitions (from `ALL_PROCEDURES` + `ALL_ARGUMENTS`)

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
SELECT ORDER_ID, CUSTOMER_NAME, ORDER_DATE, STATUS, TOTAL_AMOUNT
FROM ORDERS
```

**JOIN with aggregation:**

```sql
SELECT p.NAME AS PRODUCT_NAME, p.CATEGORY,
       COUNT(oi.ORDER_ITEM_ID) AS TOTAL_ORDERS,
       SUM(oi.SUBTOTAL) AS TOTAL_REVENUE,
       AVG(oi.UNIT_PRICE) AS AVG_UNIT_PRICE
FROM ORDER_ITEMS oi
JOIN PRODUCTS p ON p.PRODUCT_ID = oi.PRODUCT_ID
JOIN ORDERS o ON o.ORDER_ID = oi.ORDER_ID
GROUP BY p.NAME, p.CATEGORY
ORDER BY TOTAL_REVENUE DESC
```

**JOIN with department lookup:**

```sql
SELECT e.EMPLOYEE_ID, e.FIRST_NAME, e.LAST_NAME, e.EMAIL, e.TITLE,
       d.NAME AS DEPARTMENT, d.LOCATION, e.SALARY, e.HIRE_DATE, e.IS_ACTIVE
FROM EMPLOYEES e
JOIN DEPARTMENTS d ON d.DEPARTMENT_ID = e.DEPARTMENT_ID
ORDER BY d.NAME, e.LAST_NAME
```

**Aggregation summary:**

```sql
SELECT o.STATUS,
       COUNT(o.ORDER_ID) AS ORDER_COUNT,
       SUM(o.TOTAL_AMOUNT) AS TOTAL_VALUE,
       AVG(o.TOTAL_AMOUNT) AS AVG_ORDER_VALUE,
       MIN(o.ORDER_DATE) AS EARLIEST_ORDER,
       MAX(o.ORDER_DATE) AS LATEST_ORDER
FROM ORDERS o
GROUP BY o.STATUS
ORDER BY TOTAL_VALUE DESC
```

### Stored Procedure Execution

Oracle stored procedures are called using PL/SQL anonymous blocks:

```sql
BEGIN
  schema.procedure_name(:param1, :param2);
END;
```

Parameters are bound safely using Oracle's named bind syntax (`:paramName`).

### Filter Configuration

Filters allow users to dynamically narrow query results. Each filter generates a parameterized WHERE clause at execution time.

```json
{
  "filters": [
    { "key": "STATUS", "binding": "body" },
    { "key": "DEPARTMENT", "binding": "body" }
  ]
}
```

| Field     | Required | Description                                               |
| --------- | -------- | --------------------------------------------------------- |
| `key`     | Yes      | Filter name (used in Chat: "run query STATUS Completed")  |
| `binding` | Yes      | Where the filter value comes from (`body` = request body) |

### Dynamic WHERE Clause Logic

The connector intelligently builds WHERE clauses (same logic as MSSQL, adapted for Oracle syntax):

1. Removes trailing semicolons from the SQL
2. Detects existing WHERE, GROUP BY, HAVING, ORDER BY clauses
3. If no WHERE exists: inserts `WHERE` before any GROUP BY/ORDER BY
4. If WHERE exists: appends `AND` conditions before trailing clauses
5. Uses `:paramName` bind syntax (Oracle standard)
6. Column names are double-quoted for case sensitivity: `"COLUMN_NAME" = :paramName`

### Oracle vs MSSQL Syntax Differences

| Feature           | Oracle                   | MSSQL                        |
| ----------------- | ------------------------ | ---------------------------- |
| Parameter binding | `:paramName`             | `@paramName`                 |
| Column quoting    | `"COLUMN"`               | `[Column]`                   |
| Procedure call    | `BEGIN proc(:p1); END;`  | `EXEC proc @p1=@p1`          |
| Schema queries    | `ALL_*` dictionary views | `INFORMATION_SCHEMA.*` views |
| Case convention   | UPPERCASE identifiers    | Mixed case                   |
| Connection string | `host:port/service`      | host + port + database       |
| Default port      | 1521                     | 1433                         |

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
3. Users can now run it: "run order_details STATUS Completed"

### Published State

- Queries show a **"Published"** badge when they're registered in the engine
- Re-publishing updates the existing engine record (upsert behavior)
- The published state persists across page reloads

---

## API Reference

### Health Check

```
GET /health
→ { "status": "ok", "type": "oracle", "version": "1.0.0", "uptime": 123.45 }
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
GET    /api/connectors/:id/tables?schema=HR  → List tables
GET    /api/connectors/:id/columns?schema=HR&table=EMPLOYEES  → Get columns
GET    /api/connectors/:id/procedures?schema=HR  → List procedures
POST   /api/connectors/:id/preview       → Execute test query (max 100 rows)
```

### Saved Queries

```
GET    /api/queries                       → List saved queries
GET    /api/queries?connectorId=sample-oracle  → Filter by connector
GET    /api/queries/:queryId             → Get single query
POST   /api/queries                      → Create query
PUT    /api/queries/:queryId             → Update query
DELETE /api/queries/:queryId             → Delete query
POST   /api/queries/:queryId/execute     → Execute query with filters
```

### Execute Request/Response

```bash
curl -X POST http://localhost:4003/api/queries/order_summary/execute \
  -H "Content-Type: application/json" \
  -d '{"filters": {"STATUS": "Completed"}}'
```

Response:

```json
{
  "data": [
    {
      "STATUS": "Completed",
      "ORDER_COUNT": 42,
      "TOTAL_VALUE": 125000,
      "AVG_ORDER_VALUE": 2976.19
    }
  ],
  "rowCount": 1,
  "executionTime": 38,
  "columns": ["STATUS", "ORDER_COUNT", "TOTAL_VALUE", "AVG_ORDER_VALUE"],
  "truncated": false
}
```

---

## Data Files

```
services/oracle-connector/data/
├── connectors/
│   ├── connectors.json         # Connector configurations
│   └── credentials.enc.json    # AES-256-GCM encrypted passwords
└── queries/
    └── queries.json            # Saved query definitions (created on first use)
```

---

## Connection Pooling

| Setting             | Default | Description                      |
| ------------------- | ------- | -------------------------------- |
| `poolMax`           | 10      | Maximum connections in pool      |
| `poolMin`           | 0       | Minimum idle connections         |
| `poolTimeout`       | 60      | Close idle connections after 60s |
| `connectionTimeout` | 30,000  | Connection attempt timeout       |
| `requestTimeout`    | 60,000  | Query execution timeout          |

Pools are created lazily on first use and closed gracefully on shutdown via `oracledb.getPool().close()`.

---

## Security

| Feature                  | Implementation                                  |
| ------------------------ | ----------------------------------------------- |
| SQL injection prevention | Named bind parameters via `:paramName`          |
| Read-only enforcement    | Regex validation blocks all mutation statements |
| Credential encryption    | AES-256-GCM with scrypt key derivation          |
| Rate limiting            | 300 requests/minute (configurable)              |
| CORS                     | Restricted to `UI_ORIGIN`                       |
| API key auth             | Optional `X-API-Key` or `Bearer` token          |
| Log redaction            | Sensitive fields auto-masked in logs            |

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
cd services/oracle-connector
npm run build
# → dist/server.js (single file, ~25ms build)
```

### Run

```bash
NODE_ENV=production CONNECTOR_PORT=4003 SQL_CREDENTIAL_KEY=your-key node dist/server.js
```

### Oracle Instant Client in Production

Ensure Oracle Instant Client is installed and accessible on the production server:

```bash
# Verify Instant Client is available
node -e "const oracledb = require('oracledb'); console.log(oracledb.versionString)"
```

If using Docker, include Instant Client in the image:

```dockerfile
FROM node:18-slim
RUN apt-get update && apt-get install -y libaio1
COPY --from=oracle/instantclient:21 /usr/lib/oracle /usr/lib/oracle
ENV LD_LIBRARY_PATH=/usr/lib/oracle/21/client64/lib
```

### Windows (NSSM)

See the [NSSM section in SETUP.md](./SETUP.md#windows-deployment-with-nssm) for installing as a Windows service.

---

## Troubleshooting

| Problem                                                      | Solution                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `DPI-1047: Cannot locate a 64-bit Oracle Client library`     | Install Oracle Instant Client and ensure it's in PATH / LD_LIBRARY_PATH |
| Connection refused                                           | Check Oracle listener is running: `lsnrctl status`                      |
| `ORA-12541: TNS:no listener`                                 | Verify host and port; check Oracle listener configuration               |
| `ORA-01017: invalid username/password`                       | Re-enter credentials via Admin UI                                       |
| `ORA-12514: TNS:listener does not currently know of service` | Check service name matches `database` field in connector config         |
| "Invalid column name"                                        | Oracle stores identifiers in UPPERCASE; use correct case in filters     |
| Port 4003 in use                                             | `lsof -ti:4003 \| xargs kill -9` (Mac/Linux)                            |
| Slow queries                                                 | Check explain plan in SQL Developer; add indexes                        |
| "SQL blocked" error                                          | Only SELECT/WITH statements are allowed; remove any mutation keywords   |
| Case sensitivity issues                                      | Oracle identifiers are uppercase by default; filters are case-sensitive |
