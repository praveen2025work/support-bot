# User Guide

## Getting Started

The chatbot helps you access data, run reports, search documents, and find links — all through natural language.

Just type what you need in plain English. For example:
- "show me active users for this week"
- "what is the error rate?"
- "list all queries"

---

## Available Commands

| Command | What It Does | Example |
|---------|-------------|---------|
| **Run a query** | Execute a data query | "run monthly_revenue" |
| **List queries** | See all available queries | "list queries" or "what queries are available?" |
| **Compare queries** | Run multiple queries together | "show me active_users and error_rate" |
| **Search documents** | Find information in documents | "search auth_spec for MFA" |
| **Get a link** | Open an external URL | "link for servicenow_dashboard" |
| **Get an estimate** | See how long a query takes | "how long will performance take?" |
| **Help** | See what the chatbot can do | "help" or "what can you do?" |

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
Analyze CSV data files with tables, charts, and aggregations.

Examples:
- "run sales_data" — shows the full table with a chart
- "average resolution_hours in support_tickets" — computes an aggregation
- "count rows in employee_metrics" — counts entries

### URL Queries
Open external tools and dashboards in a new browser tab.

Examples: `onboarding_guide`, `servicenow_dashboard`, `architecture_wiki`

---

## Reading Results

### Tables
Data is displayed as a scrollable table. If there are more than 10-20 rows, only a preview is shown.

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

## Tips & Tricks

1. **Natural language works**: You don't need exact query names. "How is performance looking?" works just as well as "run performance".

2. **Aggregations on CSV data**: Ask analytical questions about CSV queries:
   - "what is the average salary in employee_metrics?"
   - "sum of revenue in sales_data"
   - "count critical tickets in support_tickets"

3. **Multi-query comparison**: Run two queries at once to see side-by-side results:
   - "compare error_rate and performance"
   - "show me active_users and customer_churn"

4. **Document search**: Ask questions about document content:
   - "what does the auth spec say about MFA?"
   - "find rollback steps in deployment_runbook"

5. **Quick suggestions**: After each response, look for clickable suggestion buttons to quickly follow up.
