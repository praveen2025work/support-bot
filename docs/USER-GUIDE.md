# User Guide

## Getting Started

The chatbot helps you access data, run reports, search documents, and find links — all through natural language.

Just type what you need in plain English. For example:

- "show me active users for this week"
- "what is the error rate?"
- "list all queries"

---

## Available Commands

| Command              | What It Does                     | Example                                         |
| -------------------- | -------------------------------- | ----------------------------------------------- |
| **Run a query**      | Execute a data query             | "run monthly_revenue"                           |
| **List queries**     | See all available queries        | "list queries" or "what queries are available?" |
| **Compare queries**  | Run multiple queries together    | "show me active_users and error_rate"           |
| **Search queries**   | Find queries by natural language | "show me revenue data" or "find user metrics"   |
| **Search documents** | Find information in documents    | "search auth_spec for MFA"                      |
| **Get a link**       | Open an external URL             | "link for servicenow_dashboard"                 |
| **Get an estimate**  | See how long a query takes       | "how long will performance take?"               |
| **Help**             | See what the chatbot can do      | "help" or "what can you do?"                    |

---

## Using Filters

Many queries support filters to narrow down results. When you run a query that has filters, the chatbot will show a filter form.

### Supported Filter Types

- **Time Period**: "this week", "last month", "this quarter", "today"
- **Region**: "US", "EU", "APAC"
- **Team**: "engineering", "sales", "marketing", "support"
- **Environment**: "production", "staging", "dev"

### Examples with Filters

```
"run monthly_revenue for this month"
"show me active_users for last week"
"get error_rate in production"
"run headcount for engineering team"
"show daily_orders in US for this week"
```

You can also combine filters:

```
"run monthly_revenue for this quarter in EU"
```

### SQL Database Filters

SQL queries support inline filters — just add the filter name and value after the query name:

```
"run order_details status Completed"
"run employee_directory Department Engineering"
"run revenue_by_product Category Electronics"
```

These filters are applied as dynamic WHERE clauses on the SQL query, so results are filtered at the database level for accuracy and performance.

If you run a query without specifying filters, the chatbot will show a form where you can fill in or skip filters.

---

## Query Types

### API Queries

Fetch live data from backend APIs. Results are shown as tables with optional charts.

Examples: `active_users`, `monthly_revenue`, `error_rate`, `performance`

### Document Queries

Search through internal documents (specs, runbooks, incident reports).

Examples:

- "search auth_spec for password reset" — finds relevant sections
- "run deployment_runbook" — shows the full document
- "what does incident_report say about root cause?" — searches for specific content

### CSV Queries

Analyze CSV data files with tables, charts, and aggregations. Supports multiple delimiters: comma, tab, semicolon, and pipe — auto-detected by the engine. CSV files saved from Excel (with BOM encoding) are handled automatically.

Examples:

- "run sales_data" — shows the full table with a chart
- "average resolution_hours in support_tickets" — computes an aggregation
- "count rows in employee_metrics" — counts entries

### XLSX / Excel Queries

Read Excel spreadsheet files directly. Multi-sheet workbooks are auto-registered as separate queries (one per sheet). Supports the same aggregation features as CSV.

Examples:

- "run employee_compensation" — shows Excel data as a table with charts
- "average salary in employee_compensation" — computes aggregation on Excel data

Files can be in the engine's data directory or on a shared network folder (configured via `fileBaseDir` per query or `FILE_BASE_DIR` globally).

### SQL Database Queries

Execute saved SQL queries directly against SQL Server or Oracle databases. Queries are created and managed by admins through the Connectors admin panel, then published to the engine for use in Chat.

SQL queries support:

- **Simple tables**: `SELECT` from a single table
- **JOINs**: Multi-table queries combining data across related tables
- **Aggregations**: `GROUP BY`, `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- **Dynamic filters**: Filter by any column defined in the query's filter config

Examples:

- "run order_details" — shows all orders
- "run order_details status Completed" — filters to completed orders only
- "run revenue_by_product" — shows revenue aggregated by product with JOINs
- "run employee_directory Department Engineering" — filters employees by department
- "run order_summary" — shows order counts and totals grouped by status

Date and timestamp values are automatically formatted for readability (e.g., `Jan 15, 2025` instead of `2025-01-15T00:00:00.000Z`).

Results are capped at 500 rows in Chat to protect browser performance. The full count is shown in the response (e.g., "showing first 500 of 1,200 rows").

### URL Queries

Open external tools and dashboards in a new browser tab.

Examples: `onboarding_guide`, `servicenow_dashboard`, `architecture_wiki`

---

## Reading Results

### Tables

Data is displayed as a scrollable, paginated table. Large result sets are automatically limited:

- **Chat results**: Capped at 500 rows (the total count is shown, e.g., "showing first 500 of 1,200 rows")
- **Admin preview**: Capped at 100 rows for performance

### Date & Timestamp Formatting

Date values are automatically detected and formatted for readability:

- Date-only values: `Jan 15, 2025` (instead of `2025-01-15T00:00:00.000Z`)
- Date + time values: `Jan 15, 2025, 2:30:00 PM` (when time component is non-zero)

### Charts

When data has a clear visual pattern, a chart is automatically displayed below the table:

- **Line charts** for time-series data (dates + numbers)
- **Bar charts** for categorical comparisons
- **Pie charts** for small datasets with a single metric

### Document Search Results

When searching documents, results are shown as matching sections with headings and content.

---

## Widget Usage

The chatbot can be embedded on any web page as a floating widget.

### How It Works

1. A circular bot icon appears in the bottom-right corner of the page
2. Click the icon to open the chat window
3. Type your questions in the message input
4. Click the icon again (or the X) to close

### Tips

- The widget remembers your conversation within the current session
- You can click on suggested queries in the response to run them quickly
- Click on query cards in the "list queries" response to run that query directly

---

## Semantic Search

The chatbot includes intelligent query search. Instead of remembering exact query names, describe what you're looking for:

```
"show me revenue data"
"find something about user metrics"
"anything related to error rates"
```

The search bar on the dashboard also supports this — type naturally and results are ranked by relevance using TF-IDF similarity scoring.

---

## Smart Recommendations

The chatbot learns from usage patterns to suggest relevant queries:

- **Co-occurrence**: Queries frequently run together are recommended as follow-ups
- **Collaborative filtering**: Based on what similar users run
- **Time patterns**: Queries commonly run at certain times of day or days of the week
- **User clustering**: Recommendations based on your usage profile group

Recommendations appear as suggestion chips below bot responses and on the dashboard.

---

## Anomaly Detection

When query results contain unusual numeric patterns, the chatbot automatically flags them:

- **Warning** (yellow badge): Values 2+ standard deviations from baseline
- **Critical** (red badge): Values 3+ standard deviations from baseline

Anomaly badges appear on query result cards. Baselines are built automatically after 5+ executions of the same query. Admins can configure thresholds and view anomaly history at **Admin → Anomaly Detection**.

---

## Tips & Tricks

1. **Natural language works**: You don't need exact query names. "How is performance looking?" works just as well as "run performance".

2. **Aggregations on CSV data**: Ask analytical questions about CSV queries:
   - "what is the average salary in employee_metrics?"
   - "sum of revenue in sales_data"
   - "count critical tickets in support_tickets"

3. **CSV delimiter support**: The engine auto-detects delimiters in CSV files — comma, tab, semicolon, and pipe all work. CSV files saved from Excel (UTF-8 with BOM) are handled automatically.

4. **XLSX multi-sheet support**: When you register an XLSX file with multiple sheets, each sheet becomes a separate query automatically (e.g., `sales_data_sheet1`, `sales_data_sheet2`).

5. **Shared folder files**: CSV/XLSX queries can reference files on shared network folders. Set the `fileBaseDir` per query in Admin, or configure `FILE_BASE_DIR` globally.

6. **Multi-query comparison**: Run two queries at once to see side-by-side results:
   - "compare error_rate and performance"
   - "show me active_users and customer_churn"

7. **Document search**: Ask questions about document content:
   - "what does the auth spec say about MFA?"
   - "find rollback steps in deployment_runbook"

8. **Quick suggestions**: After each response, look for clickable suggestion buttons to quickly follow up.

9. **Semantic search**: Don't remember the query name? Use the dashboard search bar or type naturally — "find revenue data" works even if the query is named `monthly_revenue`.

10. **Anomaly alerts**: Watch for yellow/red badges on results — they indicate unusual values compared to historical baselines.

11. **Favorites**: Star frequently-used queries from the dashboard to access them with one click.

12. **SQL database queries**: SQL queries from MSSQL and Oracle connectors work just like any other query. Run them by name, apply filters inline, and view results as tables with charts.

13. **Date formatting**: All date/timestamp columns are automatically formatted. No special syntax needed — just run the query and dates display in your locale format.

14. **Large result handling**: If a query returns thousands of rows, the chatbot shows the first 500 with a count of the total. Use filters to narrow results before running.
