# Backend Integration Guide

This document describes how to connect data sources to the chatbot. There are two approaches:

1. **REST API integration** — Implement a REST API that the chatbot calls to discover and execute queries (described below)
2. **SQL Database connectors** — Connect directly to SQL Server or Oracle databases using the built-in connector services (see [MSSQL Connector Guide](./mssql-connector-guide.md) and [Oracle Connector Guide](./oracle-connector-guide.md))

---

## Option 1: REST API Integration

The chatbot connects to a backend API to:

1. **Discover queries** — fetch available query definitions
2. **Execute queries** — run queries with optional filters and return tabular results

The backend URL is configured per group via `apiBaseUrl` in `src/config/groups.json`, or globally via the `API_BASE_URL` environment variable (defaults to `http://localhost:8080/api`).

## Required Endpoints

### 1. GET /queries

Returns all available query definitions.

**Response** — JSON array of query objects:

```json
[
  {
    "id": "q1",
    "name": "monthly_revenue",
    "description": "Monthly revenue breakdown by product line and region",
    "estimatedDuration": 3200,
    "url": "https://dashboard.example.com/reports/revenue",
    "source": "finance",
    "filters": ["date_range", "region"]
  }
]
```

**Field reference:**

| Field               | Type         | Required | Description                                                                 |
| ------------------- | ------------ | -------- | --------------------------------------------------------------------------- |
| `id`                | string       | Yes      | Unique identifier (e.g., `"q1"`)                                            |
| `name`              | string       | Yes      | Snake_case query name used for execution (e.g., `"monthly_revenue"`)        |
| `description`       | string       | No       | Human-readable description shown in the chat UI                             |
| `estimatedDuration` | number       | No       | Expected execution time in milliseconds                                     |
| `url`               | string (URL) | No       | Link to a dashboard or documentation page                                   |
| `source`            | string       | No       | Category tag for group-based filtering (e.g., `"finance"`, `"engineering"`) |
| `filters`           | string[]     | No       | Filter keys this query supports (see Filter Contract below)                 |

**Source filtering:** Each chatbot group has a `sources` array in its config. Only queries whose `source` matches one of the group's sources are shown. If sources is empty, all queries are returned.

**Caching:** The chatbot caches this response for 60 seconds via an LRU cache.

### 2. POST /queries/:id/execute

Executes a specific query with optional filters.

**Request body:**

```json
{
  "filters": {
    "date_range": "this_month",
    "region": "US"
  }
}
```

The `filters` object may be empty (`{}`) if the user chose not to apply any filters.

**Response:**

```json
{
  "data": [
    {
      "month": "March",
      "product": "Platform",
      "region": "US",
      "revenue": 141000
    }
  ],
  "rowCount": 4,
  "executionTime": 1533
}
```

| Field           | Type     | Required | Description                                             |
| --------------- | -------- | -------- | ------------------------------------------------------- |
| `data`          | object[] | Yes      | Array of row objects. Each row is a flat key-value map. |
| `rowCount`      | number   | Yes      | Total number of rows returned                           |
| `executionTime` | number   | Yes      | Actual execution time in milliseconds                   |

The chatbot UI renders the first 10 rows in a table and shows "Showing 10 of N rows" if there are more.

### 3. POST /queries/batch (Optional)

Executes multiple queries in a single request. The chatbot currently uses parallel individual calls instead of this endpoint, but it may be used in the future.

**Request body:**

```json
{
  "queries": ["q1", "q3"],
  "filters": { "date_range": "this_month" }
}
```

**Response:**

```json
{
  "results": [
    {
      "queryId": "q1",
      "queryName": "monthly_revenue",
      "data": [...],
      "rowCount": 4,
      "executionTime": 1200
    }
  ],
  "totalExecutionTime": 1500
}
```

## Filter Contract

Queries declare which filters they support via the `filters` array in their definition. The chatbot UI renders appropriate controls for each filter key.

**Built-in filter types** (with UI dropdowns):

| Key           | UI Control      | Options                                                           |
| ------------- | --------------- | ----------------------------------------------------------------- |
| `date_range`  | Select dropdown | today, this_week, this_month, last_week, last_month, last_quarter |
| `region`      | Select dropdown | US, EU, APAC                                                      |
| `environment` | Select dropdown | production, staging, dev                                          |
| `team`        | Select dropdown | engineering, sales, marketing, support                            |
| `severity`    | Text input      | Free-form (e.g., "critical", "high")                              |

**Custom filters:** Any filter key not in the list above gets rendered as a text input with an auto-generated label. For example, a filter key of `"book_id"` renders as a "Book Id" text input.

**Backend responsibility:** Your backend receives the selected filter values in the `POST /queries/:id/execute` request body and must apply them when generating results. The chatbot does not validate filter values — it sends whatever the user selected.

## Authentication

If the `API_TOKEN` environment variable is set, the chatbot sends it as a Bearer token:

```
Authorization: Bearer <API_TOKEN>
```

Your backend should validate this token if you require authentication. Configure it in `.env.local`:

```
API_TOKEN=your-secret-token
```

## Group Configuration

Each group can point to a different backend by setting `apiBaseUrl` in `src/config/groups.json`:

```json
{
  "finance": {
    "name": "Finance Bot",
    "sources": ["finance", "commerce"],
    "apiBaseUrl": "https://finance-api.example.com/api",
    ...
  }
}
```

If `apiBaseUrl` is `null`, the group uses the global `API_BASE_URL`.

## Adding Queries via Onboarding

New queries can be added through the Excel onboarding flow (`/onboard` or `/admin/onboard`). The Queries sheet in the template has columns:

| Column               | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `name`               | Snake_case query name                                      |
| `description`        | Human-readable description                                 |
| `source`             | Category tag matching the group's sources                  |
| `estimated_duration` | Expected duration in ms                                    |
| `url`                | Dashboard/documentation URL                                |
| `filters`            | Comma-separated filter keys (e.g., `"date_range, region"`) |

## ML Feature Endpoints

The platform includes built-in ML features with the following API endpoints. These are served by the Engine service, not the tenant backend.

### Semantic Search

```
GET /api/queries/search?q=<search-term>
```

Returns queries ranked by semantic similarity to the search term using TF-IDF vector matching. This powers natural language query discovery in the chat interface (e.g., "find something about revenue trends").

### Anomaly Detection

```
GET /api/admin/anomaly/baselines
```

Returns the current anomaly detection baselines (expected value ranges, standard deviations) computed from historical query results.

```
POST /api/admin/anomaly/rebuild-baselines
```

Triggers a rebuild of anomaly baselines from stored interaction history. Use this after bulk data changes or to reset detection thresholds.

```
GET /api/admin/anomaly/config
```

Returns the anomaly detection configuration (sensitivity thresholds, enabled metrics, alert rules).

### Anomaly History

```
GET /api/admin/anomaly/history?groupId=default&queryName=monthly_revenue&limit=100
```

Returns persisted anomaly events with severity, direction, detection method, and acknowledgement status. Supports filtering by `queryName` and pagination via `limit`.

```
POST /api/admin/anomaly/history/:id/acknowledge
```

Marks an anomaly event as acknowledged. Body: `{ "groupId": "default" }`.

### Business Rules

```
GET /api/admin/anomaly/rules?groupId=default
```

Returns all user-defined anomaly business rules.

```
POST /api/admin/anomaly/rules
```

Creates a new business rule. Body:

```json
{
  "groupId": "default",
  "columnName": "error_rate",
  "operator": ">",
  "threshold": 5,
  "severity": "critical",
  "message": "Error rate exceeds 5%",
  "enabled": true
}
```

Supported operators: `>`, `<`, `>=`, `<=`, `==`, `!=`.

```
DELETE /api/admin/anomaly/rules/:id?groupId=default
```

Removes a business rule by ID.

### Recommendations & Smart Suggestions

Recommendations are generated inline within chat responses using collaborative filtering. There is no separate API endpoint — the Engine automatically appends relevant query suggestions based on user interaction history and preference profiles.

Smart suggestions combine 5 signal sources (anomaly data, analysis context, follow-up chain, ML recommendations, and handler defaults), ranked by relevance score, and returned as `suggestions` in the bot response.

### Cross-Surface Actions

Bot responses may include a `crossSurfaceActions` array with action buttons for the UI to render:

```json
{
  "text": "Here are the results...",
  "crossSurfaceActions": [
    {
      "type": "pin_to_dashboard",
      "label": "Pin to Dashboard",
      "payload": { "queryName": "monthly_revenue", "displayMode": "table" }
    },
    {
      "type": "open_in_gridboard",
      "label": "Open in GridBoard",
      "payload": {
        "queryName": "monthly_revenue",
        "columns": ["month", "revenue", "region"]
      }
    },
    {
      "type": "export",
      "label": "Export as CSV",
      "payload": { "queryName": "monthly_revenue", "format": "csv" }
    }
  ]
}
```

| Action Type         | When Generated                                          |
| ------------------- | ------------------------------------------------------- |
| `pin_to_dashboard`  | Query, follow-up, or analysis results                   |
| `open_in_gridboard` | Tabular results (csv_table, query_result, csv_group_by) |
| `export`            | Any non-error rich content                              |

### Cross-Surface Tracking

The chat endpoint accepts an optional `surface` field in the POST body to track which UI surface the message originated from:

```json
POST /api/chat
{
  "text": "run monthly_revenue",
  "surface": "dashboard",
  ...
}
```

Valid surfaces: `chat`, `dashboard`, `gridboard`, `widget`, `admin`. This data feeds into the learning system for cross-surface analytics and is visible in **Admin → Learning → Surface Breakdown**.

---

## Running the Mock API

The project includes a reference mock API implementation:

```bash
npm run mock-api
```

This starts a JSON Server on port 8080 with:

- `GET /api/queries` — serves queries from `mock-api/db.json`
- `POST /api/queries/:id/execute` — executes with filter handling
- `POST /api/queries/batch` — batch execution

See `mock-api/server.js` for the reference implementation of filter handling and response formatting.

---

## Option 2: SQL Database Connectors

Instead of implementing a REST API, you can connect directly to SQL Server or Oracle databases using the built-in connector services.

### How It Works

1. **Admin creates a connector** — Configure database connection (host, port, credentials) via Admin → Connectors
2. **Admin creates saved queries** — Write SQL queries with optional filters in the connector's Saved Queries tab
3. **Admin publishes queries** — Publish saved queries to the engine, making them available in Chat
4. **Users run queries** — Users interact via natural language just like any other query

### Architecture

```
User → Chat UI → Engine → SQL Connector Service → Database
                              (port 4002/4003)       (SQL Server / Oracle)
```

The connector services act as middleware between the engine and databases, providing:

- **Connection pooling** — Managed pools with configurable limits
- **Read-only enforcement** — All SQL validated to prevent mutations
- **Dynamic filtering** — WHERE clauses generated at runtime from user input
- **Row limiting** — Configurable caps (default 10,000 per query, 500 in chat, 100 in preview)
- **Credential encryption** — AES-256-GCM encrypted database passwords
- **Schema introspection** — Browse schemas, tables, columns, and procedures

### SQL Connector API Contract

Each connector exposes the same REST API (identical to the standard query contract):

```
GET  /api/queries                    → List saved queries
POST /api/queries/:id/execute        → Execute with filters
GET  /api/connectors                 → List database connections
POST /api/connectors/:id/test        → Test connectivity
GET  /api/connectors/:id/schemas     → List schemas
GET  /api/connectors/:id/tables      → List tables in schema
GET  /api/connectors/:id/columns     → Get column metadata
```

### Filter Handling in SQL Queries

SQL connector queries support dynamic filtering. When a query is executed with filters:

1. The connector looks up the saved query's filter definitions
2. For each filter value provided, it generates a parameterized WHERE clause
3. WHERE is inserted intelligently — before GROUP BY/ORDER BY/HAVING clauses
4. Parameters are bound safely (no SQL injection risk)

Example filter definition in a saved query:

```json
{
  "filters": [
    { "key": "status", "binding": "body" },
    { "key": "Department", "binding": "body", "column": "d.Name" }
  ]
}
```

The optional `column` field maps a filter key to a specific column reference (useful for JOINs where the column name differs from the filter key).

### Result Limits

| Context         | Max Rows | Purpose                      |
| --------------- | -------- | ---------------------------- |
| Chat response   | 500      | Protects browser performance |
| Admin preview   | 100      | Quick data verification      |
| Query execution | 10,000   | Default per-query ceiling    |

When results are truncated, the response includes `"truncated": true` and the chat shows "showing first 500 of N rows".

### Date/Timestamp Formatting

ISO date strings in query results (e.g., `2025-01-15T00:00:00.000Z`) are automatically formatted in the UI:

- Date-only: `Jan 15, 2025`
- Date + time: `Jan 15, 2025, 2:30:00 PM`

### Getting Started

See the dedicated connector guides:

- [MSSQL Connector Guide](./mssql-connector-guide.md)
- [Oracle Connector Guide](./oracle-connector-guide.md)
