# Developer Setup Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)
- **Docker** (optional, for containerized deployments)

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd chatbot

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your API settings

# 4. Train the NLP model
npm run train

# 5. Start the mock API + dev server
npm run dev:full
```

The app is now available at `http://localhost:3000`.

- **Chat UI**: http://localhost:3000
- **Admin panel**: http://localhost:3000/admin
- **Widget preview**: http://localhost:3000/widget
- **Mock API**: http://localhost:8080/api/queries

---

## Environment Configuration

Create a `.env.local` file in the project root:

```env
# REST API Configuration
API_BASE_URL=http://localhost:8080/api    # Your backend API base URL
API_TOKEN=your-api-token-here             # Bearer token for API authentication

# Teams Bot Configuration (optional)
# TEAMS_APP_ID=
# TEAMS_APP_PASSWORD=
```

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | Yes | Base URL for the backend API that serves query data |
| `API_TOKEN` | No | Bearer token sent with every API request |
| `TEAMS_APP_ID` | No | Microsoft Teams bot app ID |
| `TEAMS_APP_PASSWORD` | No | Microsoft Teams bot password |

---

## Project Structure

```
chatbot/
├── src/
│   ├── app/                  # Next.js App Router pages & API routes
│   │   ├── admin/            # Admin panel (group management, onboarding)
│   │   ├── api/              # REST API endpoints (/chat, /queries, /filters)
│   │   └── widget/           # Embeddable widget page
│   ├── components/chat/      # Chat UI components (MessageBubble, DataChart, etc.)
│   ├── config/               # Group configs, filter configs
│   ├── core/                 # Business logic
│   │   ├── api-connector/    # API client, query service, types
│   │   ├── nlp/              # NLP classifier (nlpjs + fuzzy matching)
│   │   └── response/         # Response generator
│   ├── hooks/                # React hooks (useChat)
│   ├── lib/                  # Utilities (config, logger, errors, dates)
│   └── training/             # NLP corpus files and training scripts
├── mock-api/                 # Mock API server (json-server)
│   ├── db.json               # Query definitions
│   └── server.js             # Custom routes & mock data
├── data/                     # Sample data files (CSV, documents)
├── public/widget/            # Widget embed script
├── docs/                     # Documentation
├── Dockerfile                # Production Docker image
└── docker-compose.yml        # Full-stack Docker Compose
```

---

## Standalone Node.js Deployment

### Build

```bash
npm run build
```

This produces a `.next` directory with a `standalone` folder (enabled by `output: 'standalone'` in `next.config.mjs`).

### Run

```bash
# Copy static assets (required for standalone mode)
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Start the production server
NODE_ENV=production node .next/standalone/server.js
```

The server runs on port 3000 by default. Override with `PORT=8000 node .next/standalone/server.js`.

### Process Management with PM2

```bash
npm install -g pm2

# Start with PM2
pm2 start .next/standalone/server.js --name chatbot \
  --env NODE_ENV=production

# Monitor
pm2 logs chatbot
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name chatbot.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Docker Deployment

### Build the Image

```bash
docker build -t chatbot .
```

### Run with Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e API_BASE_URL=http://your-api-host:8080/api \
  -e API_TOKEN=your-token \
  --name chatbot \
  chatbot
```

### Docker Compose (Full Stack)

Start both the chatbot and mock API together:

```bash
docker-compose up -d
```

This starts:
- **chatbot** on port 3000
- **mock-api** on port 8080

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Multi-Host / Org-Department Setup

The chatbot supports **group-based multi-tenancy**, allowing different departments or teams to have their own configuration while sharing the same deployment.

### How Groups Work

Each group can have:
- Its own **API base URL** (pointing to department-specific backends)
- Custom **NLP corpus** (department-specific queries and vocabulary)
- Custom **greeting/farewell templates**
- Filtered **query sources** (only show relevant queries)

### Configuration

Groups are defined in `src/config/groups.json`:

```json
{
  "groups": {
    "default": {
      "name": "General",
      "description": "Default group",
      "sources": [],
      "apiBaseUrl": null,
      "templates": null,
      "corpus": null,
      "faq": null
    },
    "engineering": {
      "name": "Engineering",
      "description": "Engineering team chatbot",
      "sources": ["engineering", "devops"],
      "apiBaseUrl": "https://eng-api.yourcompany.com/api",
      "templates": null,
      "corpus": "corpus-engineering",
      "faq": null
    },
    "analytics": {
      "name": "Analytics",
      "description": "Analytics team chatbot",
      "sources": ["analytics"],
      "apiBaseUrl": "https://analytics-api.yourcompany.com/api",
      "templates": null,
      "corpus": "corpus-analytics",
      "faq": null
    }
  }
}
```

### Deployment Options

**Option A: Single Instance, Multiple Groups**

Deploy one chatbot instance. Each department accesses via their group URL:
- Engineering: `https://chatbot.yourcompany.com/widget?group=engineering`
- Analytics: `https://chatbot.yourcompany.com/widget?group=analytics`

**Option B: Separate Instances Per Department**

Deploy separate instances, each configured for a specific group:

```bash
# Engineering instance
docker run -d -p 3001:3000 \
  -e API_BASE_URL=https://eng-api.yourcompany.com/api \
  --name chatbot-engineering chatbot

# Analytics instance
docker run -d -p 3002:3000 \
  -e API_BASE_URL=https://analytics-api.yourcompany.com/api \
  --name chatbot-analytics chatbot
```

### Adding a New Group

1. Add the group to `src/config/groups.json`
2. (Optional) Create a group-specific corpus in `src/training/groups/`
3. Retrain NLP: `npm run train`
4. Restart the server

Or use the **Admin Panel** at `/admin/onboard` to create groups via the UI.

---

## Mock API Server

The mock API (`mock-api/server.js`) simulates a real backend for development.

### Start

```bash
npm run mock-api
```

Runs on port 8080 with these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queries` | List all query definitions |
| POST | `/api/queries/:id/execute` | Execute a query with filters |
| POST | `/api/queries/batch` | Execute multiple queries |
| GET/POST | `/api/users/:userId/profile` | Path variable demo |
| GET/POST | `/api/logs?service=X&level=Y` | Query parameter demo |
| POST | `/api/reports/generate` | Request body demo |

### Adding a New Query

1. Add the query definition to `mock-api/db.json`
2. Add mock data in the `getRawData()` function in `mock-api/server.js`
3. Add NLP entity synonyms in `src/training/corpus.json`
4. Retrain: `npm run train`

---

## NLP Training

### Corpus Files

- `src/training/corpus.json` — Main corpus (all groups)
- `src/training/groups/corpus-*.json` — Group-specific corpora

### Train

```bash
npm run train
```

### Evaluate

```bash
npm run evaluate
```

### Adding Queries to NLP

1. Add the query name to the `query_name` entity options with synonyms:
   ```json
   "my_query": ["my_query", "my query", "custom query name"]
   ```

2. Ensure the intent utterances cover common phrasings
3. Retrain and evaluate

---

## Backend Integration

For connecting to real backend APIs, see [Backend Integration Guide](./backend-integration-guide.md).

### Binding Types

Queries support three filter binding types:

- **`body`** — Filters sent as JSON in the POST request body
- **`query_param`** — Filters sent as URL query parameters
- **`path`** — Filters interpolated into the URL path

Example query definition:
```json
{
  "id": "q21",
  "name": "user_profile",
  "type": "api",
  "endpoint": "/users/{user_id}/profile",
  "filters": [
    { "key": "user_id", "binding": "path" }
  ]
}
```

When the user provides `user_id=101`, the chatbot calls `GET /users/101/profile`.
