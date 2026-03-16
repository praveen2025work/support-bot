# Chatbot Onboarding Guide

Self-service guide for application teams to integrate the chatbot into their systems.

---

## 1. Quick Start (5 minutes)

### Embed the Widget (Easiest)

Paste this into any HTML page:

```html
<script>
  window.ChatbotWidgetConfig = {
    baseUrl: 'https://your-chatbot-host.com'
  };
</script>
<script src="https://your-chatbot-host.com/widget/chatbot-widget.js"></script>
```

That's it. A chat bubble appears on your page.

### Standalone App

Visit `https://your-chatbot-host.com` directly in your browser.

### Microsoft Teams

Contact the platform team to add the Chatbot app to your Teams workspace. Once installed, message the bot directly in Teams chat.

---

## 2. Register Your API as a Data Source

The chatbot connects to REST APIs to fetch data. To add your application's API:

### Step 1: Define Your Queries

Edit `mock-api/db.json` (for testing) or configure your production API to return queries in this format:

```
GET /api/queries
```

Response format:

```json
[
  {
    "id": "unique-id",
    "name": "your_query_name",
    "description": "What this query does (shown to users)",
    "estimatedDuration": 2000,
    "url": "https://your-dashboard.com/report-link",
    "source": "your-app-name",
    "filters": ["date_range", "region", "team"]
  }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the query |
| `name` | Yes | Machine-readable name (snake_case) |
| `description` | Yes | Human-readable description |
| `estimatedDuration` | No | Expected run time in ms |
| `url` | No | Link to related dashboard/report |
| `source` | No | Which application owns this query |
| `filters` | No | Array of supported filter names |

### Step 2: Implement the Execute Endpoint

```
POST /api/queries/{id}/execute
```

Request body (filters are passed here):

```json
{
  "filters": {
    "date_range": "this_month",
    "region": "US",
    "team": "engineering"
  }
}
```

Response format:

```json
{
  "data": [
    { "column1": "value1", "column2": "value2" }
  ],
  "rowCount": 42,
  "executionTime": 1230
}
```

### Step 3: Register Entity Synonyms

So the bot understands natural language references to your queries, add synonyms in `src/training/corpus.json`:

```json
{
  "entities": {
    "query_name": {
      "options": {
        "your_query_name": ["your query", "friendly name", "alternate name"]
      }
    }
  }
}
```

Example: if your query is `deployment_frequency`, add:
```json
"deployment_frequency": ["deployment frequency", "deploy freq", "deployments", "how often we deploy"]
```

### Step 4: Add Training Utterances (Optional)

If your use case needs custom intents beyond the built-in ones, add utterances to the corpus:

```json
{
  "intent": "query.execute",
  "utterances": [
    "show me @query_name for @time_period",
    "get @query_name filtered by @region"
  ]
}
```

---

## Built-in ML Features

The platform includes built-in ML features that enhance the user experience automatically:

- **Semantic search** — Users can discover queries using natural language (e.g., "something about revenue trends") instead of exact names. Powered by TF-IDF vector indexing.
- **Smart recommendations** — After running a query, the chatbot suggests related queries based on collaborative filtering and user interaction history.
- **Anomaly detection** — Query results are compared against learned baselines to flag unusual values automatically. Admins can configure sensitivity and rebuild baselines from the Admin panel.

These features improve over time as more users interact with the platform. No additional setup is required — the Engine manages ML data in `services/engine/data/`.

---

## 3. What Users Can Say

The chatbot understands these types of requests:

### Run a Query
```
"run the monthly revenue query"
"execute active users"
"show me error rate"
"get me daily orders data"
"run performance filtered by region US"
```

### List Available Queries
```
"what queries are available"
"list all queries"
"what reports do you have"
"what data can I access"
```

### Find a URL/Dashboard
```
"find me a URL for error rate"
"where is the performance dashboard"
"link for monthly revenue"
```

### Get Time Estimation
```
"how long will active users take"
"estimate for monthly revenue"
"time estimate for error rate"
```

### With Filters
```
"run monthly revenue for this quarter"
"show me active users filtered by region US"
"execute daily orders for today"
"get error rate for engineering team"
```

### Multi-Source Queries
```
"show me revenue and active users together"
"run error rate and performance"
"compare daily orders and monthly revenue"
```

---

## 4. Adding Filters to Your API

### Supported Filter Types

| Filter | Example Values | How Users Say It |
|--------|---------------|------------------|
| `date_range` | today, this_week, this_month, this_quarter | "for today", "this month", "last quarter" |
| `region` | US, EU, APAC | "in US", "for EU region" |
| `team` | engineering, sales, marketing | "for engineering team" |
| `environment` | production, staging, dev | "in production", "prod env" |
| `severity` | critical, high, medium, low | "critical only", "high severity" |

### Custom Filters

To add your own filter:

1. Add the filter entity to `src/training/corpus.json`:
```json
{
  "entities": {
    "your_filter": {
      "options": {
        "value1": ["value1", "alias1", "alias2"],
        "value2": ["value2", "alias3"]
      }
    }
  }
}
```

2. Add utterances that use the filter:
```json
{
  "intent": "query.execute",
  "utterances": [
    "run @query_name filtered by @your_filter"
  ]
}
```

3. Your API's execute endpoint receives the filter:
```json
POST /api/queries/{id}/execute
{ "filters": { "your_filter": "value1" } }
```

---

## 5. Multi-Source Integration

The chatbot can combine data from multiple queries in a single response.

### How It Works

When a user says "show me revenue and active users", the chatbot:
1. Identifies both query names from the message
2. Executes both queries in parallel against your API
3. Returns combined results in a single response

### Setting Up Multi-Source

Your API should support a batch endpoint (optional, for better performance):

```
POST /api/queries/batch
```

Request:
```json
{
  "queries": ["q1", "q3"],
  "filters": { "date_range": "this_month" }
}
```

Response:
```json
{
  "results": [
    {
      "queryId": "q1",
      "queryName": "monthly_revenue",
      "data": [...],
      "rowCount": 6,
      "executionTime": 1200
    },
    {
      "queryId": "q3",
      "queryName": "error_rate",
      "data": [...],
      "rowCount": 4,
      "executionTime": 800
    }
  ],
  "totalExecutionTime": 1200
}
```

If no batch endpoint exists, the chatbot falls back to running individual queries in parallel.

---

## 6. Environment Configuration

Set these in `.env.local` (or your deployment environment):

```bash
# Your API base URL (required)
API_BASE_URL=https://your-api.internal.com/api

# API authentication token (required if your API needs auth)
API_TOKEN=your-bearer-token

# Teams Bot (optional)
TEAMS_APP_ID=your-teams-app-id
TEAMS_APP_PASSWORD=your-teams-app-password
```

---

## 7. Testing Your Integration

### Local Testing with Mock API

```bash
# 1. Start mock API server (port 8080)
npm run mock-api

# 2. Start chatbot (port 3001)
npm run dev:mock

# 3. Open http://localhost:3001
```

### Add Your Queries to Mock Data

Edit `mock-api/db.json` to add your queries, then add mock responses in `mock-api/server.js` in the `generateMockData()` function:

```javascript
case 'your_query_name':
  return {
    data: [
      { col1: 'val1', col2: 'val2' },
      { col1: 'val3', col2: 'val4' }
    ],
  };
```

### Verify with curl

```bash
# List queries
curl http://localhost:8080/api/queries

# Execute a query
curl -X POST http://localhost:8080/api/queries/q1/execute \
  -H "Content-Type: application/json" \
  -d '{"filters": {"date_range": "this_month"}}'
```

---

## 8. Checklist for New Application Onboarding

- [ ] API returns queries at `GET /api/queries` in the documented format
- [ ] API handles `POST /api/queries/{id}/execute` with filters
- [ ] Query names added as entity synonyms in `corpus.json`
- [ ] Tested locally with mock API
- [ ] `.env.local` configured with API_BASE_URL and API_TOKEN
- [ ] Widget embedded in your application (or Teams bot added)
- [ ] Users informed about supported commands (share Section 3)

---

## 9. Troubleshooting

| Problem | Solution |
|---------|----------|
| Bot says "I didn't understand" | Add more utterance variations to `corpus.json` |
| Bot says "Unable to fetch queries" | Check API_BASE_URL and API_TOKEN in `.env.local` |
| Query not found | Ensure query name in corpus matches API response exactly |
| Filters not applied | Verify your execute endpoint reads `filters` from request body |
| Widget not appearing | Check browser console for CORS errors; ensure baseUrl is correct |
| Slow responses | Check `estimatedDuration` in API; consider adding caching |
