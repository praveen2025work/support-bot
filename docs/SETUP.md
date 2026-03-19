# Developer Setup Guide

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (comes with Node.js)
- **Docker** (optional, for containerized deployments)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌───────────────────────┐
│   Next.js UI    │────▶│   Engine Service     │────▶│  Data API (per-group) │
│   port 3001     │     │   port 4001          │     │  port 8080 (mock)     │
│                 │     │                      │     │  or real tenant APIs  │
│ src/app/        │     │ services/engine/src/ │     │ services/mock-api/    │
└─────────────────┘     └─────────────────────┘     └───────────────────────┘
                                │
                   ┌────────────┴────────────┐
                   ▼                         ▼
        ┌──────────────────┐      ┌──────────────────┐
        │ MSSQL Connector  │      │ Oracle Connector  │
        │   port 4002      │      │   port 4003       │
        │                  │      │                   │
        │ services/        │      │ services/         │
        │ mssql-connector/ │      │ oracle-connector/ │
        └──────────────────┘      └──────────────────┘
```

- **UI** (Next.js) — All `/api/*` routes proxy to Engine via `src/lib/engine-proxy.ts`
- **Engine** (Express) — NLP, query execution, admin API, tenant context
- **Data API** — Mock API for dev, or real per-group tenant APIs in production
- **MSSQL Connector** (Express) — SQL Server database connector with saved queries, connection pooling, schema introspection
- **Oracle Connector** (Express) — Oracle database connector with saved queries, connection pooling, schema introspection

> See [MSSQL Connector Guide](./mssql-connector-guide.md) and [Oracle Connector Guide](./oracle-connector-guide.md) for detailed setup instructions.

---

## Quick Start (Mock Environment)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Chatbot

# 2. Install root dependencies
npm install

# 3. Install service dependencies
cd services/engine && npm install && cd ../..
cd services/mock-api && npm install && cd ../..

# 4. Copy environment template
cp .env.example .env.mock

# 5. Train the NLP model
npm run train

# 6. Start all 3 services
npm run dev:mock
```

This starts:

| Service      | Port | What it runs                                |
| ------------ | ---- | ------------------------------------------- |
| **mock-api** | 8080 | `services/mock-api/server.js` (json-server) |
| **engine**   | 4001 | `services/engine/src/server.ts` (Express)   |
| **ui**       | 3001 | `src/app/` (Next.js dev server)             |

### With SQL Connectors

To also start the MSSQL and/or Oracle connectors:

```bash
# All services (mock + engine + MSSQL + Oracle + UI)
npm run dev:sql

# Engine + MSSQL connector + UI only
npm run dev:mssql

# Engine + Oracle connector + UI only
npm run dev:oracle
```

This adds:

| Service              | Port | What it runs                                        |
| -------------------- | ---- | --------------------------------------------------- |
| **mssql-connector**  | 4002 | `services/mssql-connector/src/server.ts` (Express)  |
| **oracle-connector** | 4003 | `services/oracle-connector/src/server.ts` (Express) |

Access points:

- **Chat UI**: http://localhost:3001
- **Admin panel**: http://localhost:3001/admin
- **Admin → Connectors**: http://localhost:3001/admin/connectors (manage SQL connectors)
- **Widget preview**: http://localhost:3001/widget
- **Engine API docs**: http://localhost:4001/api/docs
- **Mock API**: http://localhost:8080/api/queries
- **MSSQL Connector API**: http://localhost:4002/api/queries
- **Oracle Connector API**: http://localhost:4003/api/queries

---

## Project Structure

```
Chatbot/
├── src/                              # Next.js UI source
│   ├── app/                          # App Router pages & API route handlers
│   │   ├── admin/                    # Admin panel pages
│   │   ├── api/                      # API routes (proxy to engine)
│   │   │   ├── chat/route.ts
│   │   │   ├── health/route.ts
│   │   │   ├── queries/route.ts
│   │   │   └── admin/               # Admin API proxies
│   │   └── widget/                   # Embeddable widget page
│   ├── components/
│   │   └── chat/                     # Chat UI components
│   │       ├── ChatWindow.tsx        # Main chat window (widget + web)
│   │       ├── ChatInput.tsx         # Message input
│   │       ├── MessageList.tsx       # Message display
│   │       ├── MessageBubble.tsx     # Individual message
│   │       ├── SuggestionChips.tsx   # Quick reply chips
│   │       └── ErrorBoundary.tsx     # Error boundary
│   ├── contexts/
│   │   └── UserContext.tsx           # User info context provider
│   ├── hooks/
│   │   └── useChat.ts               # Chat state & API hook
│   ├── lib/
│   │   ├── engine-proxy.ts          # Proxy helper: Next.js → Engine
│   │   ├── csrf.ts                  # CSRF token utility
│   │   ├── db.ts                    # File-level locking
│   │   └── log-encryption.ts        # AES-256-GCM log encryption
│   └── training/
│       ├── corpus.json              # Main NLP corpus (all groups)
│       ├── groups/                   # Group-specific corpora
│       │   ├── corpus-finance.json
│       │   ├── corpus-engineering.json
│       │   └── corpus-analytics.json
│       └── scripts/
│           ├── train.ts             # NLP training script
│           └── evaluate.ts          # NLP evaluation script
│
├── services/
│   ├── engine/                       # Express API service
│   │   ├── src/
│   │   │   ├── server.ts            # Entry point (Express app)
│   │   │   ├── config/
│   │   │   │   ├── groups.json      # Group definitions (per-group API config)
│   │   │   │   ├── settings.json    # Runtime settings (thresholds, cache TTL)
│   │   │   │   └── group-config.ts  # Group config loader & validator
│   │   │   ├── core/
│   │   │   │   ├── api-connector/
│   │   │   │   │   ├── api-client.ts       # HTTP client (retry + circuit breaker)
│   │   │   │   │   ├── query-service.ts    # Query execution & auth resolution
│   │   │   │   │   ├── circuit-breaker.ts  # Circuit breaker (per-URL)
│   │   │   │   │   ├── bam-auth.ts         # BAM token authentication
│   │   │   │   │   └── types.ts            # Query & auth type definitions
│   │   │   │   ├── nlp/
│   │   │   │   │   └── nlp-service.ts      # NLP classifier (nlpjs + fuzzy)
│   │   │   │   └── response/
│   │   │   │       └── handlers/           # Response handler modules
│   │   │   ├── lib/
│   │   │   │   ├── config.ts        # Environment config loader
│   │   │   │   ├── logger.ts        # Pino logger
│   │   │   │   ├── singleton.ts     # Engine instance cache (per-group)
│   │   │   │   ├── rbac.ts          # Role definitions & permissions
│   │   │   │   ├── audit-logger.ts  # JSONL audit trail
│   │   │   │   └── log-encryption.ts # AES-256-GCM encryption
│   │   │   ├── middleware/
│   │   │   │   ├── tenant-context.ts # AsyncLocalStorage tenant context
│   │   │   │   └── rbac.ts          # requirePermission() middleware
│   │   │   └── routes/
│   │   │       ├── chat.ts          # POST /api/chat
│   │   │       ├── queries.ts       # GET /api/queries, GET /api/groups
│   │   │       ├── health.ts        # GET /api/health
│   │   │       ├── stats.ts         # GET /api/stats/*
│   │   │       ├── user.ts          # GET /api/user
│   │   │       ├── docs.ts          # GET /api/docs (Swagger UI)
│   │   │       └── admin/           # Admin API routes
│   │   │           ├── index.ts     # Router aggregator
│   │   │           ├── groups.ts    # Group CRUD
│   │   │           ├── queries.ts   # Query CRUD
│   │   │           ├── templates.ts # Template management
│   │   │           ├── settings.ts  # Settings management
│   │   │           ├── corpus.ts    # Corpus / NLP training
│   │   │           ├── faq.ts       # FAQ management
│   │   │           ├── import.ts    # CSV/XLSX import
│   │   │           ├── learning.ts  # Learning stats
│   │   │           └── logs.ts      # Log viewer
│   │   ├── docs/
│   │   │   └── openapi.yaml         # OpenAPI 3.0 spec
│   │   ├── esbuild.config.mjs         # esbuild bundler config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mock-api/                     # Mock data API (json-server)
│   │   ├── server.js                 # Custom Express server with mock data
│   │   ├── db.json                   # Query definitions & sample data
│   │   └── package.json
│   │
│   ├── mssql-connector/              # SQL Server database connector
│   │   ├── src/
│   │   │   ├── server.ts             # Entry point (Express, port 4002)
│   │   │   ├── core/
│   │   │   │   ├── mssql-connector.ts    # SQL Server driver (mssql + connection pooling)
│   │   │   │   ├── connection-manager.ts # Lazy connector lifecycle management
│   │   │   │   ├── query-store.ts        # Saved queries (JSON file persistence)
│   │   │   │   ├── query-executor.ts     # Read-only validation & row limiting
│   │   │   │   ├── credential-store.ts   # AES-256-GCM encrypted credentials
│   │   │   │   └── types.ts             # TypeScript interfaces
│   │   │   ├── routes/
│   │   │   │   ├── connectors.ts     # Connector CRUD & schema introspection
│   │   │   │   ├── queries.ts        # Saved query CRUD & execute endpoint
│   │   │   │   └── health.ts         # Health check
│   │   │   ├── middleware/auth.ts    # Optional API key auth
│   │   │   └── lib/                  # Config, logger
│   │   ├── data/
│   │   │   ├── connectors/           # Connector configs + encrypted credentials
│   │   │   └── queries/queries.json  # Saved query definitions
│   │   ├── esbuild.config.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── oracle-connector/             # Oracle database connector
│       ├── src/                      # Same structure as mssql-connector
│       │   ├── server.ts             # Entry point (Express, port 4003)
│       │   ├── core/
│       │   │   ├── oracle-connector.ts   # Oracle driver (oracledb + connection pooling)
│       │   │   └── ...               # Same modules as MSSQL
│       │   ├── routes/               # Same route structure
│       │   ├── middleware/
│       │   └── lib/
│       ├── data/
│       │   └── connectors/           # Connector configs
│       ├── package.json
│       └── tsconfig.json
│
├── public/
│   └── widget/
│       └── chatbot-widget.js         # Embeddable widget script
│
├── tests/
│   ├── nlp/                          # NLP classifier tests
│   ├── csv/                          # CSV analyzer tests
│   ├── auth/                         # Auth middleware tests
│   └── api/                          # API route tests
│
├── data/                             # Runtime data (gitignored)
│   ├── conversations/                # Chat logs
│   ├── learning/                     # Learning feedback
│   └── audit/                        # Audit trail
│
├── .storybook/                        # Storybook configuration
│   ├── main.ts                       # Stories glob, addons, framework
│   └── preview.ts                    # Global decorators, backgrounds
│
├── .env.example                      # Environment variable template
├── .env.mock                         # Mock environment config
├── .env.dev                          # Dev environment config (real APIs)
├── .env.prod                         # Production config
├── .husky/pre-commit                 # Git pre-commit hook (lint-staged)
├── package.json                      # Root scripts & dependencies
├── next.config.mjs                   # Next.js config (proxy rewrites, bundle analyzer)
├── tsconfig.json                     # Root TypeScript config
├── jest.config.ts                    # Jest test config
├── eslint.config.mjs                 # ESLint flat config
├── Dockerfile                        # UI Docker image
├── docker-compose.yml                # Demo: mock-api + engine + UI
├── docker-compose.dev.yml            # Dev: engine + UI (real APIs)
└── docker-compose.prod.yml           # Prod: engine + UI
```

---

## Environment Configuration

### File: `.env.example` (template)

```env
# ── Core ──
NODE_ENV=development

# ── Engine Service ──
ENGINE_URL=http://localhost:4001
ENGINE_PORT=4001

# ── User Authentication ──
USER_INFO_URL=                          # AD/SSO userinfo endpoint. Empty = mock user

# ── Data API (global fallback — groups can override) ──
API_BASE_URL=http://localhost:8080/api
API_TOKEN=

# ── Security ──
ENGINE_API_KEY=                         # Secures Engine admin API (required in prod)
LOG_ENCRYPTION_KEY=                     # AES-256-GCM for conversation logs (optional)

# ── CORS ──
UI_ORIGIN=http://localhost:3001

# ── Teams Bot (optional) ──
# TEAMS_APP_ID=
# TEAMS_APP_PASSWORD=
```

### Variable Reference

| Variable             | Default                     | Required | Description                                 |
| -------------------- | --------------------------- | -------- | ------------------------------------------- |
| `NODE_ENV`           | `development`               | No       | `development` or `production`               |
| `ENGINE_URL`         | `http://localhost:4001`     | No       | URL where Engine service runs               |
| `ENGINE_PORT`        | `4001`                      | No       | Port for Engine service                     |
| `USER_INFO_URL`      | (empty)                     | No       | AD/SSO endpoint. Empty → mock user fallback |
| `API_BASE_URL`       | `http://localhost:8080/api` | Yes      | Global fallback for tenant API              |
| `API_TOKEN`          | (empty)                     | No       | Global bearer token for APIs                |
| `ENGINE_API_KEY`     | (empty)                     | Prod     | Secures admin API endpoints                 |
| `LOG_ENCRYPTION_KEY` | (empty)                     | No       | AES-256-GCM key for log encryption          |
| `UI_ORIGIN`          | `http://localhost:3001`     | No       | CORS origin for Engine                      |

---

## Development Modes

### Mode 1: Mock Environment (Recommended for local dev)

Uses sample data — no real APIs needed.

**Env file**: `.env.mock`

```env
NODE_ENV=development
API_BASE_URL=http://localhost:8080/api
USER_INFO_URL=
```

**Start command**:

```bash
npm run dev:mock
```

**What runs**:

- `services/mock-api/server.js` → port 8080
- `services/engine/src/server.ts` → port 4001
- `src/app/` (Next.js dev) → port 3001

---

### Mode 2: Dev Environment (Real APIs)

Uses real tenant APIs and AD/SSO authentication.

**Env file**: `.env.dev`

```env
NODE_ENV=development
USER_INFO_URL=https://your-org-sso.company.com/api/userinfo
API_BASE_URL=https://api-dev.yourcompany.com/api
API_TOKEN=your-dev-bearer-token
```

**Start command**:

```bash
npm run dev
```

**What runs** (no mock-api):

- `services/engine/src/server.ts` → port 4001
- `src/app/` (Next.js dev) → port 3001

---

### Mode 3: Production

**Env file**: `.env.prod`

```env
NODE_ENV=production
ENGINE_URL=http://engine:4001
ENGINE_API_KEY=your-secure-key
USER_INFO_URL=https://sso.yourcompany.com/api/userinfo
API_BASE_URL=https://api.yourcompany.com/api
API_TOKEN=your-prod-token
```

**Build & start**:

```bash
npm run build:prod            # Build Next.js + Engine (esbuild) in one step
npm run start:prod            # Start Engine + UI in production mode
# or start all 3 (including mock-api) from production builds:
npm run start:all
```

---

## Per-Group Tenant API Configuration

API configuration lives at the **group level** and **query level** — not just globally.

### File: `services/engine/src/config/groups.json`

Each group can override the global `API_BASE_URL`:

```json
{
  "groups": {
    "default": {
      "name": "General Assistant",
      "sources": [],
      "apiBaseUrl": null
    },
    "finance": {
      "name": "Finance Bot",
      "sources": ["finance", "commerce"],
      "apiBaseUrl": "https://finance-api.yourcompany.com/api"
    },
    "engineering": {
      "name": "Engineering Bot",
      "sources": ["engineering", "devops"],
      "apiBaseUrl": "https://eng-api.yourcompany.com/api"
    }
  }
}
```

### Per-Query Authentication

Each query can use a different auth mechanism:

| `authType` | How it works                                 | Configured in                          |
| ---------- | -------------------------------------------- | -------------------------------------- |
| `none`     | No auth headers                              | Query definition                       |
| `bearer`   | Uses global `API_TOKEN` from env             | Query definition                       |
| `windows`  | Forwards user's AD/SSO headers               | Query definition                       |
| `bam`      | Fetches short-lived token from `bamTokenUrl` | Query definition + `bamTokenUrl` field |

**Query definition** (in `services/mock-api/db.json` or real data store):

```json
{
  "id": "q1",
  "name": "monthly_revenue",
  "authType": "bam",
  "bamTokenUrl": "https://auth.yourcompany.com/bam/token",
  "endpoint": "/reports/revenue",
  "filters": [...]
}
```

### Config Priority (highest to lowest)

1. **Query-level** `authType` + `bamTokenUrl` → per-query auth
2. **Group-level** `apiBaseUrl` in `groups.json` → per-group API endpoint
3. **Global** `API_BASE_URL` + `API_TOKEN` in env → fallback

### Runtime Flow

```
Request (groupId=finance)
  → tenantContextMiddleware extracts groupId
  → getEngine("finance") creates/returns cached engine
  → Engine uses finance group's apiBaseUrl
  → Query "monthly_revenue" resolves its own authType (bam)
  → Fetches BAM token from bamTokenUrl
  → Calls finance API with BAM token
```

---

## NPM Scripts Reference

### File: `package.json` (root)

| Script                    | What it does                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev:mock`        | Start mock-api + engine + UI (uses `.env.mock`)               |
| `npm run dev:mock:3svc`   | Same as `dev:mock`                                            |
| `npm run dev`             | Start engine + UI with real APIs (uses `.env.dev`)            |
| `npm run start:demo`      | Production build with mock-api                                |
| `npm run start:prod`      | Production build with real APIs (uses `.env.prod`)            |
| `npm run build:prod`      | Production build: Next.js + Engine (esbuild)                  |
| `npm run start:all`       | Start mock-api + engine + UI from production builds           |
| `npm run svc:mock-api`    | Start mock-api only (`services/mock-api/server.js`)           |
| `npm run svc:engine`      | Start engine only (`services/engine/src/server.ts`)           |
| `npm run dev:sql`         | Start mock + engine + MSSQL + Oracle + UI (all 5 services)    |
| `npm run dev:mssql`       | Start engine + MSSQL connector + UI                           |
| `npm run dev:oracle`      | Start engine + Oracle connector + UI                          |
| `npm run svc:mssql`       | Start MSSQL connector only                                    |
| `npm run svc:oracle`      | Start Oracle connector only                                   |
| `npm run svc:ui`          | Start UI only (Next.js dev)                                   |
| `npm run build`           | Build Next.js for production                                  |
| `npm run build:engine`    | Compile engine TypeScript to `services/engine/dist/`          |
| `npm run build:mssql`     | Compile MSSQL connector to `services/mssql-connector/dist/`   |
| `npm run build:oracle`    | Compile Oracle connector to `services/oracle-connector/dist/` |
| `npm run db:up`           | Start sample databases via Docker Compose                     |
| `npm run db:down`         | Stop sample databases                                         |
| `npm run db:logs`         | Tail sample database logs                                     |
| `npm run train`           | Train NLP model (`src/training/scripts/train.ts`)             |
| `npm run evaluate`        | Evaluate NLP model accuracy                                   |
| `npm test`                | Run Jest tests                                                |
| `npm run lint`            | Run ESLint                                                    |
| `npm run analyze`         | Bundle analysis (opens interactive treemap)                   |
| `npm run storybook`       | Start Storybook dev server (port 6006)                        |
| `npm run build:storybook` | Build static Storybook site to `storybook-static/`            |

### File: `services/engine/package.json`

| Script                    | What it does                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev`             | Start engine with auto-reload (`tsx watch src/server.ts`)     |
| `npm run build`           | Bundle with esbuild → single `dist/server.js` (~357KB, ~25ms) |
| `npm run build:typecheck` | TypeScript type-checking only (`tsc --noEmit`)                |
| `npm start`               | Run compiled `dist/server.js` (production)                    |
| `npm run train`           | Train NLP model                                               |

---

## Key Configuration Files

| File                                                        | Purpose                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `.env.example`                                              | Environment variable template                             |
| `.env.mock`                                                 | Mock environment (local dev with sample data)             |
| `.env.dev`                                                  | Dev environment (real APIs)                               |
| `.env.prod`                                                 | Production environment                                    |
| `next.config.mjs`                                           | Next.js config (proxy rewrites to engine)                 |
| `services/engine/src/config/groups.json`                    | Group definitions (per-group API URL, sources, templates) |
| `services/engine/src/config/settings.json`                  | Runtime settings (NLP thresholds, cache TTL)              |
| `services/engine/src/config/group-config.ts`                | Group config loader & Zod validator                       |
| `services/engine/src/lib/config.ts`                         | Engine env config (`API_BASE_URL`, `API_TOKEN`, etc.)     |
| `services/engine/src/middleware/tenant-context.ts`          | Per-request tenant context (groupId, requestId)           |
| `services/engine/src/lib/singleton.ts`                      | Engine instance cache (one per group)                     |
| `services/mock-api/db.json`                                 | Query definitions with auth config                        |
| `services/engine/esbuild.config.mjs`                        | esbuild bundler config (replaces tsc)                     |
| `services/mock-api/server.js`                               | Mock API endpoints and sample data                        |
| `services/mssql-connector/data/queries/queries.json`        | MSSQL saved query definitions                             |
| `services/mssql-connector/data/connectors/connectors.json`  | MSSQL connector configurations                            |
| `services/oracle-connector/data/connectors/connectors.json` | Oracle connector configurations                           |
| `.storybook/main.ts`                                        | Storybook framework, addons, stories glob                 |
| `.storybook/preview.ts`                                     | Storybook global decorators and backgrounds               |
| `src/lib/engine-proxy.ts`                                   | Next.js → Engine proxy utility                            |
| `public/widget/chatbot-widget.js`                           | Embeddable widget script                                  |

---

## File: `services/engine/src/config/settings.json`

```json
{
  "nlpConfidenceThreshold": 0.65,
  "fuzzyConfidenceThreshold": 0.5,
  "sessionTtlMinutes": 30,
  "apiCacheTtlMinutes": 5,
  "apiBaseUrl": "",
  "mockApiUrl": "http://localhost:8080",
  "enabledPlatforms": ["web", "widget", "teams"]
}
```

---

## Widget Embedding

### File: `public/widget/chatbot-widget.js`

Embed the chatbot widget on any page:

```html
<script>
  window.ChatbotWidgetConfig = {
    baseUrl: "https://chatbot.yourcompany.com",
    group: "finance",
    position: "bottom-right", // 'bottom-right' | 'bottom-left'
    theme: "blue", // 'blue' | 'indigo' | 'green'
    greeting: "Need help?",
    iconType: "bot", // 'bot' | 'headset' | 'chat'
  };
</script>
<script src="https://chatbot.yourcompany.com/widget/chatbot-widget.js"></script>
```

Widget supports 3 states: **open** → **minimized** (collapsed bar) → **closed** (toggle button).

---

## Mock API Endpoints

### File: `services/mock-api/server.js` (port 8080)

| Method     | Endpoint                      | Description                      |
| ---------- | ----------------------------- | -------------------------------- |
| `GET`      | `/api/queries`                | List all query definitions       |
| `POST`     | `/api/queries/:id/execute`    | Execute a query with filters     |
| `POST`     | `/api/queries/batch`          | Execute multiple queries at once |
| `GET/POST` | `/api/users/:userId/profile`  | Path variable demo               |
| `GET/POST` | `/api/logs?service=X&level=Y` | Query parameter demo             |
| `POST`     | `/api/reports/generate`       | Request body demo                |

### Adding a New Query

1. Add the query definition to `services/mock-api/db.json`
2. Add mock data in `getRawData()` in `services/mock-api/server.js`
3. Add NLP entity synonyms in `src/training/corpus.json`
4. Retrain: `npm run train`

---

## NLP Training

### Corpus Files

| File                                          | Scope                    |
| --------------------------------------------- | ------------------------ |
| `src/training/corpus.json`                    | Main corpus (all groups) |
| `src/training/groups/corpus-finance.json`     | Finance group            |
| `src/training/groups/corpus-engineering.json` | Engineering group        |
| `src/training/groups/corpus-analytics.json`   | Analytics group          |

### Commands

```bash
npm run train      # Train NLP model
npm run evaluate   # Evaluate accuracy
```

---

## Testing

### File: `jest.config.ts`

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Test directories:

- `tests/nlp/` — NLP classifier tests
- `tests/csv/` — CSV analyzer tests
- `tests/auth/` — Auth middleware tests
- `tests/api/` — API route tests

---

## Docker Deployment

### Build Images

```bash
# UI image
docker build -t chatbot-ui .

# Engine image
docker build -t chatbot-engine -f services/engine/Dockerfile services/engine/
```

### Docker Compose

| File                           | Services                                    | Use case           |
| ------------------------------ | ------------------------------------------- | ------------------ |
| `docker-compose.yml`           | mock-api (8080) + engine (4001) + ui (3001) | Demo               |
| `docker-compose.dev.yml`       | engine (4001) + ui (3001)                   | Dev with real APIs |
| `docker-compose.prod.yml`      | engine (4001) + ui (3001)                   | Production         |
| `docker-compose.sample-db.yml` | SQL Server + Oracle XE sample databases     | Local DB testing   |

```bash
# Demo mode
docker-compose up -d

# Dev mode
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

---

## Windows Deployment with NSSM

[NSSM](https://nssm.cc/) (Non-Sucking Service Manager) runs Node.js processes as Windows services with auto-restart, logging, and system tray management.

### Prerequisites

1. **Node.js 18+** installed and in system PATH
2. **NSSM** downloaded and added to PATH (or placed in `C:\nssm\`)
3. Project built and ready:
   ```cmd
   cd C:\Chatbot
   npm install
   cd services\engine && npm install && npm run build && cd ..\..
   cd services\mock-api && npm install && cd ..\..
   npm run train
   npm run build:prod
   ```

### Directory Layout (recommended)

```
C:\Chatbot\                              # Project root
├── .next\standalone\                    # Built Next.js app
├── services\engine\dist\                # Compiled engine
├── services\mock-api\                   # Mock API
├── data\                                # Runtime data (logs, learning, audit)
└── nssm\                                # NSSM scripts (optional)
    ├── install-services.bat
    └── env\
        ├── engine.env                   # Engine env vars
        └── ui.env                       # UI env vars
```

### Step 1: Build for Production

```cmd
cd C:\Chatbot

:: Build Next.js
npm run build

:: Copy static assets for standalone mode
xcopy /E /I public .next\standalone\public
xcopy /E /I .next\static .next\standalone\.next\static

:: Build Engine
cd services\engine
npm run build
cd ..\..
```

### Step 2: Install Engine Service

```cmd
:: Install the service
nssm install ChatbotEngine "C:\Program Files\nodejs\node.exe"

:: Set the startup arguments
nssm set ChatbotEngine AppParameters "dist\server.js"

:: Set working directory (CRITICAL — all relative paths depend on this)
nssm set ChatbotEngine AppDirectory "C:\Chatbot\services\engine"

:: Set environment variables
nssm set ChatbotEngine AppEnvironmentExtra ^
  NODE_ENV=production ^
  ENGINE_PORT=4001 ^
  API_BASE_URL=http://localhost:8080/api ^
  API_TOKEN=your-token ^
  ENGINE_API_KEY=your-secure-key ^
  UI_ORIGIN=http://localhost:3001 ^
  USER_INFO_URL=https://sso.yourcompany.com/api/userinfo ^
  LOG_ENCRYPTION_KEY=your-encryption-key

:: Configure logging
nssm set ChatbotEngine AppStdout "C:\Chatbot\data\logs\engine-stdout.log"
nssm set ChatbotEngine AppStderr "C:\Chatbot\data\logs\engine-stderr.log"
nssm set ChatbotEngine AppStdoutCreationDisposition 4
nssm set ChatbotEngine AppStderrCreationDisposition 4
nssm set ChatbotEngine AppRotateFiles 1
nssm set ChatbotEngine AppRotateSeconds 86400
nssm set ChatbotEngine AppRotateBytes 10485760

:: Configure restart behavior
nssm set ChatbotEngine AppExit Default Restart
nssm set ChatbotEngine AppRestartDelay 3000

:: Configure shutdown — send Ctrl+C, wait 10s before killing
nssm set ChatbotEngine AppStopMethodSkip 0
nssm set ChatbotEngine AppStopMethodConsole 10000
nssm set ChatbotEngine AppStopMethodWindow 0
nssm set ChatbotEngine AppStopMethodThreads 0

:: Start the service
nssm start ChatbotEngine
```

### Step 3: Install UI Service

```cmd
:: Install the service
nssm install ChatbotUI "C:\Program Files\nodejs\node.exe"

:: Set the startup arguments — standalone Next.js server
nssm set ChatbotUI AppParameters ".next\standalone\server.js"

:: Set working directory
nssm set ChatbotUI AppDirectory "C:\Chatbot"

:: Set environment variables
nssm set ChatbotUI AppEnvironmentExtra ^
  NODE_ENV=production ^
  PORT=3001 ^
  ENGINE_URL=http://localhost:4001

:: Configure logging
nssm set ChatbotUI AppStdout "C:\Chatbot\data\logs\ui-stdout.log"
nssm set ChatbotUI AppStderr "C:\Chatbot\data\logs\ui-stderr.log"
nssm set ChatbotUI AppStdoutCreationDisposition 4
nssm set ChatbotUI AppStderrCreationDisposition 4
nssm set ChatbotUI AppRotateFiles 1
nssm set ChatbotUI AppRotateSeconds 86400

:: Configure restart
nssm set ChatbotUI AppExit Default Restart
nssm set ChatbotUI AppRestartDelay 3000

:: Depends on engine
nssm set ChatbotUI DependOnService ChatbotEngine

:: Configure shutdown
nssm set ChatbotUI AppStopMethodSkip 0
nssm set ChatbotUI AppStopMethodConsole 10000
nssm set ChatbotUI AppStopMethodWindow 0
nssm set ChatbotUI AppStopMethodThreads 0

:: Start the service
nssm start ChatbotUI
```

### Step 4: Install Mock API Service (optional — demo only)

```cmd
nssm install ChatbotMockAPI "C:\Program Files\nodejs\node.exe"
nssm set ChatbotMockAPI AppParameters "server.js"
nssm set ChatbotMockAPI AppDirectory "C:\Chatbot\services\mock-api"

nssm set ChatbotMockAPI AppStdout "C:\Chatbot\data\logs\mock-api-stdout.log"
nssm set ChatbotMockAPI AppStderr "C:\Chatbot\data\logs\mock-api-stderr.log"
nssm set ChatbotMockAPI AppStdoutCreationDisposition 4
nssm set ChatbotMockAPI AppStderrCreationDisposition 4
nssm set ChatbotMockAPI AppRotateFiles 1

nssm set ChatbotMockAPI AppExit Default Restart
nssm set ChatbotMockAPI AppRestartDelay 3000
nssm set ChatbotMockAPI AppStopMethodSkip 0
nssm set ChatbotMockAPI AppStopMethodConsole 5000

nssm start ChatbotMockAPI
```

### Service Management Commands

```cmd
:: Check status
nssm status ChatbotEngine
nssm status ChatbotUI
nssm status ChatbotMockAPI

:: Stop / Start / Restart
nssm stop ChatbotEngine
nssm start ChatbotEngine
nssm restart ChatbotEngine

:: View / edit config (opens GUI)
nssm edit ChatbotEngine

:: Remove a service
nssm stop ChatbotEngine
nssm remove ChatbotEngine confirm

:: View logs (real-time)
powershell Get-Content "C:\Chatbot\data\logs\engine-stdout.log" -Wait -Tail 50
```

### Step 5: Install SQL Connector Services (optional)

```cmd
:: ── MSSQL Connector ──
nssm install ChatbotMSSQL "C:\Program Files\nodejs\node.exe"
nssm set ChatbotMSSQL AppParameters "dist\server.js"
nssm set ChatbotMSSQL AppDirectory "C:\Chatbot\services\mssql-connector"
nssm set ChatbotMSSQL AppEnvironmentExtra ^
  NODE_ENV=production ^
  CONNECTOR_PORT=4002 ^
  UI_ORIGIN=http://localhost:3001 ^
  SQL_CREDENTIAL_KEY=your-credential-encryption-key
nssm set ChatbotMSSQL AppStdout "C:\Chatbot\data\logs\mssql-stdout.log"
nssm set ChatbotMSSQL AppStderr "C:\Chatbot\data\logs\mssql-stderr.log"
nssm set ChatbotMSSQL AppStdoutCreationDisposition 4
nssm set ChatbotMSSQL AppStderrCreationDisposition 4
nssm set ChatbotMSSQL AppRotateFiles 1
nssm set ChatbotMSSQL AppExit Default Restart
nssm set ChatbotMSSQL AppRestartDelay 3000
nssm set ChatbotMSSQL AppStopMethodSkip 0
nssm set ChatbotMSSQL AppStopMethodConsole 10000
nssm start ChatbotMSSQL

:: ── Oracle Connector ──
nssm install ChatbotOracle "C:\Program Files\nodejs\node.exe"
nssm set ChatbotOracle AppParameters "dist\server.js"
nssm set ChatbotOracle AppDirectory "C:\Chatbot\services\oracle-connector"
nssm set ChatbotOracle AppEnvironmentExtra ^
  NODE_ENV=production ^
  CONNECTOR_PORT=4003 ^
  UI_ORIGIN=http://localhost:3001 ^
  SQL_CREDENTIAL_KEY=your-credential-encryption-key
nssm set ChatbotOracle AppStdout "C:\Chatbot\data\logs\oracle-stdout.log"
nssm set ChatbotOracle AppStderr "C:\Chatbot\data\logs\oracle-stderr.log"
nssm set ChatbotOracle AppStdoutCreationDisposition 4
nssm set ChatbotOracle AppStderrCreationDisposition 4
nssm set ChatbotOracle AppRotateFiles 1
nssm set ChatbotOracle AppExit Default Restart
nssm set ChatbotOracle AppRestartDelay 3000
nssm set ChatbotOracle AppStopMethodSkip 0
nssm set ChatbotOracle AppStopMethodConsole 10000
nssm start ChatbotOracle
```

### Service Startup Order

| Service          | Port | Depends On              | Start Order    |
| ---------------- | ---- | ----------------------- | -------------- |
| `ChatbotMockAPI` | 8080 | (none)                  | 1st            |
| `ChatbotMSSQL`   | 4002 | (none)                  | 1st (parallel) |
| `ChatbotOracle`  | 4003 | (none)                  | 1st (parallel) |
| `ChatbotEngine`  | 4001 | MockAPI (if using mock) | 2nd            |
| `ChatbotUI`      | 3001 | Engine                  | 3rd            |

NSSM `DependOnService` ensures the UI waits for Engine to start. SQL connectors run independently and can start in parallel. If using real APIs (no mock), remove MockAPI.

### Environment Variables for NSSM

NSSM doesn't use `.env` files. Set env vars via `nssm set <service> AppEnvironmentExtra`. The key variables per service:

**ChatbotEngine**:
| Variable | Example Value | Notes |
|----------|---------------|-------|
| `NODE_ENV` | `production` | Required |
| `ENGINE_PORT` | `4001` | Default 4001 |
| `API_BASE_URL` | `http://localhost:8080/api` | Global fallback (groups override) |
| `API_TOKEN` | `your-token` | Global fallback for bearer auth |
| `ENGINE_API_KEY` | `your-key` | Secures admin API |
| `UI_ORIGIN` | `http://localhost:3001` | CORS |
| `USER_INFO_URL` | `https://sso.company.com/...` | AD/SSO endpoint |
| `LOG_ENCRYPTION_KEY` | `your-key` | Optional AES-256-GCM |

**ChatbotUI**:
| Variable | Example Value | Notes |
|----------|---------------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `3001` | Next.js listen port |
| `ENGINE_URL` | `http://localhost:4001` | Engine proxy target |

### Batch Script: `nssm/install-services.bat`

Create this file for repeatable installs:

```bat
@echo off
setlocal

set PROJECT=C:\Chatbot
set NODE=C:\Program Files\nodejs\node.exe
set LOGS=%PROJECT%\data\logs

:: Create log directory
if not exist "%LOGS%" mkdir "%LOGS%"

echo === Installing ChatbotEngine ===
nssm install ChatbotEngine "%NODE%"
nssm set ChatbotEngine AppParameters "dist\server.js"
nssm set ChatbotEngine AppDirectory "%PROJECT%\services\engine"
nssm set ChatbotEngine AppEnvironmentExtra NODE_ENV=production ENGINE_PORT=4001 API_BASE_URL=http://localhost:8080/api UI_ORIGIN=http://localhost:3001
nssm set ChatbotEngine AppStdout "%LOGS%\engine-stdout.log"
nssm set ChatbotEngine AppStderr "%LOGS%\engine-stderr.log"
nssm set ChatbotEngine AppStdoutCreationDisposition 4
nssm set ChatbotEngine AppStderrCreationDisposition 4
nssm set ChatbotEngine AppRotateFiles 1
nssm set ChatbotEngine AppRotateSeconds 86400
nssm set ChatbotEngine AppExit Default Restart
nssm set ChatbotEngine AppRestartDelay 3000
nssm set ChatbotEngine AppStopMethodSkip 0
nssm set ChatbotEngine AppStopMethodConsole 10000

echo === Installing ChatbotUI ===
nssm install ChatbotUI "%NODE%"
nssm set ChatbotUI AppParameters ".next\standalone\server.js"
nssm set ChatbotUI AppDirectory "%PROJECT%"
nssm set ChatbotUI AppEnvironmentExtra NODE_ENV=production PORT=3001 ENGINE_URL=http://localhost:4001
nssm set ChatbotUI AppStdout "%LOGS%\ui-stdout.log"
nssm set ChatbotUI AppStderr "%LOGS%\ui-stderr.log"
nssm set ChatbotUI AppStdoutCreationDisposition 4
nssm set ChatbotUI AppStderrCreationDisposition 4
nssm set ChatbotUI AppRotateFiles 1
nssm set ChatbotUI AppRotateSeconds 86400
nssm set ChatbotUI AppExit Default Restart
nssm set ChatbotUI AppRestartDelay 3000
nssm set ChatbotUI DependOnService ChatbotEngine
nssm set ChatbotUI AppStopMethodSkip 0
nssm set ChatbotUI AppStopMethodConsole 10000

echo === Starting services ===
nssm start ChatbotEngine
timeout /t 5
nssm start ChatbotUI

echo === Done ===
nssm status ChatbotEngine
nssm status ChatbotUI
pause
```

### NSSM Shutdown Behavior

The codebase handles Windows service stops gracefully:

| File                            | Signal Handling                                                |
| ------------------------------- | -------------------------------------------------------------- |
| `services/engine/src/server.ts` | Listens for `SIGTERM`, `SIGINT`, `SIGHUP` — 10s graceful close |
| `services/mock-api/server.js`   | Listens for `SIGTERM`, `SIGINT`, `SIGHUP` — 5s graceful close  |
| Next.js standalone              | Built-in graceful shutdown                                     |

NSSM is configured with `AppStopMethodConsole 10000` which sends Ctrl+C (mapped to SIGINT) and waits 10 seconds before force-killing.

### Windows Firewall

If accessing from other machines, open the ports:

```cmd
:: Allow Engine port (optional — usually only UI is exposed)
netsh advfirewall firewall add rule name="Chatbot Engine" dir=in action=allow protocol=TCP localport=4001

:: Allow UI port
netsh advfirewall firewall add rule name="Chatbot UI" dir=in action=allow protocol=TCP localport=3001
```

### Updating the Application

```cmd
:: 1. Stop services
nssm stop ChatbotUI
nssm stop ChatbotEngine

:: 2. Pull latest code
cd C:\Chatbot
git pull

:: 3. Install dependencies
npm install
cd services\engine && npm install && cd ..\..

:: 4. Rebuild
npm run build
cd services\engine && npm run build && cd ..\..

:: 5. Copy standalone assets
xcopy /E /I /Y public .next\standalone\public
xcopy /E /I /Y .next\static .next\standalone\.next\static

:: 6. Retrain NLP (if corpus changed)
npm run train

:: 7. Restart services
nssm start ChatbotEngine
timeout /t 5
nssm start ChatbotUI
```

---

## Sample Databases (Docker)

For local development with SQL connectors, start sample databases with pre-seeded data:

```bash
# Start SQL Server and Oracle XE containers
npm run db:up

# Check logs
npm run db:logs

# Stop and remove containers
npm run db:down
```

This provides:

| Database        | Port | Container       | Default Credentials                |
| --------------- | ---- | --------------- | ---------------------------------- |
| SQL Server 2022 | 1433 | `sample-mssql`  | `sa` / configured in compose       |
| Oracle XE 21c   | 1521 | `sample-oracle` | `testuser` / configured in compose |

Once databases are running, configure connectors via **Admin → Connectors** in the UI, or create connector config files directly in `services/mssql-connector/data/connectors/` and `services/oracle-connector/data/connectors/`.

---

## Bundle Analysis

Analyze the frontend bundle to identify large dependencies and code-splitting opportunities:

```bash
npm run analyze
```

This opens an interactive treemap in your browser showing every module in the bundle. Key things to verify:

- **Recharts** is NOT in the main bundle (lazy-loaded via `React.lazy()` + `Suspense`)
- **XLSX** is NOT in the main bundle (dynamically imported on first use)
- Each admin page is a separate chunk (Next.js App Router auto-splits per route)

---

## Storybook (Component Documentation)

The project uses [Storybook 8](https://storybook.js.org/) with `@storybook/nextjs` for component documentation and visual testing.

### Configuration

| File                    | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `.storybook/main.ts`    | Storybook config (stories glob, addons, framework) |
| `.storybook/preview.ts` | Global decorators, backgrounds, controls           |

### Running Storybook

```bash
# Development server (port 6006)
npm run storybook

# Build static site (for deployment/sharing)
npm run build:storybook
```

### Available Stories

Stories are co-located with components as `*.stories.tsx` files:

| Category      | Components                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Chat**      | ChatInput, DataChart, ErrorBoundary, SuggestionChips, TablePagination                          |
| **Dashboard** | AddFavoriteModal, AnomalyBadge, DashboardHeader, FavoritesPanel, RecentQueriesPanel, SearchBar |
| **Common**    | AppHeader, KeyboardShortcutsHelp, ThemeToggle                                                  |

Each story includes multiple variants (Default, Empty, edge cases) with interactive controls via `@storybook/addon-essentials`.

---

## Engine Build (esbuild)

The engine backend uses [esbuild](https://esbuild.github.io/) for fast, tree-shaken bundling instead of `tsc + tsc-alias`.

### Configuration

**File:** `services/engine/esbuild.config.mjs`

| Setting       | Value                               | Why                              |
| ------------- | ----------------------------------- | -------------------------------- |
| `platform`    | `node`                              | Server-side bundle               |
| `target`      | `node18`                            | Match minimum Node.js version    |
| `format`      | `cjs`                               | CommonJS for Node.js `require()` |
| `treeShaking` | `true`                              | Removes unused exports           |
| `external`    | All `dependencies` + Node built-ins | Keeps node_modules out of bundle |
| `alias`       | `{ '@': './src' }`                  | Resolves `@/` path imports       |

### Build Output

```bash
cd services/engine && npm run build
# → dist/server.js (~357KB, built in ~25ms)
# Compare: old tsc output was 69 files, ~1.4MB, ~3s build
```

### Type Checking

esbuild strips types without checking them. Run `tsc --noEmit` separately:

```bash
cd services/engine && npm run build:typecheck
```

### Performance Optimizations

The following libraries are lazy-loaded at runtime to reduce startup time:

- **XLSX** (~700KB) — loaded on first CSV/Excel operation
- Heavy chart rendering is deferred in the frontend via `React.lazy()`

---

## Troubleshooting

### Port 4001 already in use (EADDRINUSE)

The engine's `predev` script in `services/engine/package.json` auto-kills orphaned processes on port 4001. If it still fails:

```bash
# Mac/Linux
lsof -ti:4001 | xargs kill -9

# Windows
netstat -ano | findstr :4001
taskkill /PID <PID> /F
```

### Services dying after some time

The `dev:mock` script uses `concurrently --restart-tries 3 --restart-after 2000` for auto-recovery. The engine also has:

- `unhandledRejection` / `uncaughtException` handlers in `services/engine/src/server.ts`
- `tsx watch --ignore './data/**'` to prevent data file writes from triggering restarts

### UI not loading / no styles

Make sure you're running the **dev** server (not a stale production build):

```bash
# Kill any stale processes
lsof -ti:3001 | xargs kill -9
# Start fresh
npm run dev:mock
```

### Engine health check failing

The UI checks engine health via `GET /api/health` every 30 seconds (in `src/components/chat/ChatWindow.tsx`). If it shows "Disconnected":

1. Check engine is running: `curl http://localhost:4001/api/health`
2. Check `services/engine/` logs in the terminal
3. Restart: `npm run svc:engine`

### Windows NSSM: Service won't start

```cmd
:: Check NSSM logs for errors
nssm status ChatbotEngine
powershell Get-Content "C:\Chatbot\data\logs\engine-stderr.log" -Tail 30

:: Common causes:
:: 1. Node.js not in PATH — use full path in nssm install
:: 2. Wrong AppDirectory — must be the folder containing the entry script
:: 3. Missing build — run "npm run build:engine" first
:: 4. Port already in use:
netstat -ano | findstr :4001
taskkill /PID <PID> /F
```

### Windows NSSM: Service keeps restarting

Check for crash loops in the stderr log:

```cmd
powershell Get-Content "C:\Chatbot\data\logs\engine-stderr.log" -Tail 100
```

Common causes:

- Missing `node_modules/` — run `npm install` in the service directory
- Missing `dist/` — run `npm run build` in `services/engine/`
- Missing env vars — verify with `nssm edit ChatbotEngine` → Environment tab
- Missing data directories — create `C:\Chatbot\data\logs\`, `data\knowledge\`, etc.

### Windows: Kill stale processes on ports

```cmd
:: Find what's using port 4001
netstat -ano | findstr :4001 | findstr LISTENING

:: Kill by PID
taskkill /PID <PID> /F

:: Or kill all node processes (careful in shared environments)
taskkill /IM node.exe /F
```
