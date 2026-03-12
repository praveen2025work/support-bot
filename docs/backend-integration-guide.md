# Backend Integration Guide

This document describes the REST API contract your backend must implement so the chatbot can discover and execute queries.

## Overview

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (e.g., `"q1"`) |
| `name` | string | Yes | Snake_case query name used for execution (e.g., `"monthly_revenue"`) |
| `description` | string | No | Human-readable description shown in the chat UI |
| `estimatedDuration` | number | No | Expected execution time in milliseconds |
| `url` | string (URL) | No | Link to a dashboard or documentation page |
| `source` | string | No | Category tag for group-based filtering (e.g., `"finance"`, `"engineering"`) |
| `filters` | string[] | No | Filter keys this query supports (see Filter Contract below) |

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
    { "month": "March", "product": "Platform", "region": "US", "revenue": 141000 }
  ],
  "rowCount": 4,
  "executionTime": 1533
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | object[] | Yes | Array of row objects. Each row is a flat key-value map. |
| `rowCount` | number | Yes | Total number of rows returned |
| `executionTime` | number | Yes | Actual execution time in milliseconds |

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

| Key | UI Control | Options |
|-----|-----------|---------|
| `date_range` | Select dropdown | today, this_week, this_month, last_week, last_month, last_quarter |
| `region` | Select dropdown | US, EU, APAC |
| `environment` | Select dropdown | production, staging, dev |
| `team` | Select dropdown | engineering, sales, marketing, support |
| `severity` | Text input | Free-form (e.g., "critical", "high") |

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

| Column | Description |
|--------|-------------|
| `name` | Snake_case query name |
| `description` | Human-readable description |
| `source` | Category tag matching the group's sources |
| `estimated_duration` | Expected duration in ms |
| `url` | Dashboard/documentation URL |
| `filters` | Comma-separated filter keys (e.g., `"date_range, region"`) |

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
