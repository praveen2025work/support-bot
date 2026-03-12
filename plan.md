# Plan: Split into 3 Services + Updated Guides

## Architecture Overview

```
┌──────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│  Service 1   │ ──→  │    Service 2         │ ──→  │  Service 3      │
│  UI (Next.js)│      │  Engine (Express)    │      │  Mock API       │
│  Port 3000   │      │  Port 4000           │      │  (json-server)  │
│              │      │                      │      │  Port 8080      │
│  Pages only  │      │  NLP + Query + Admin │      │                 │
│  Proxies API │      │  API routes          │      │  Sample data    │
│  to Engine   │      │  Auth middleware      │      │  Demo only      │
└──────────────┘      └─────────────────────┘      └─────────────────┘
                       │
                       │ (PROD: real tenant APIs replace Mock API)
                       ↓
                ┌──────────────────┐
                │ Tenant APIs      │
                │ - Windows Auth   │
                │ - BAM Token      │
                │ - No Auth        │
                │ - Whitelisted IP │
                └──────────────────┘
```

**Demo**: All 3 services run
**Prod**: Service 1 (UI) + Service 2 (Engine) only — real tenant APIs replace Mock API

---

## Step-by-step Implementation

### Step 1: Create Engine service (`services/engine/`)

Extract all backend logic into a standalone Express server:

**New files:**
- `services/engine/package.json` — Express, @nlpjs/*, pino, zod, ky, fuse.js, lru-cache, xlsx, cors
- `services/engine/tsconfig.json`
- `services/engine/src/server.ts` — Express app entry point on port 4000
- `services/engine/src/routes/chat.ts` — POST `/api/chat` (from `src/app/api/chat/route.ts`)
- `services/engine/src/routes/admin.ts` — All `/api/admin/*` routes consolidated
- `services/engine/src/routes/queries.ts` — `/api/queries`, `/api/filters`, `/api/groups`
- `services/engine/src/routes/stats.ts` — `/api/stats` GET/POST
- `services/engine/src/routes/health.ts` — `/api/health`
- `services/engine/src/middleware/auth.ts` — Pluggable auth middleware (supports no-auth, bearer token, Windows NTLM, BAM token, IP whitelist)

**Moved from src/ into services/engine/src/:**
- `core/` — engine.ts, nlp/, response/, api-connector/, session/, constants.ts, types.ts
- `adapters/` — web-adapter.ts, teams-adapter.ts, adapter-factory.ts
- `config/` — group-config.ts, groups.json, filter-config.json, filter-options.ts, users.json
- `training/` — corpus.json, faq.json, entities/, groups/, scripts/
- `lib/` — logger.ts, config.ts, errors.ts, singleton.ts, date-resolver.ts, onboard/

**Key changes:**
- Convert each Next.js route handler (`export async function GET/POST(request: NextRequest)`) to Express handler (`(req: Request, res: Response)`)
- Replace `NextRequest`/`NextResponse` with Express `req`/`res`
- Add CORS middleware (allow UI origin)
- Add configurable auth middleware per-query

### Step 2: Add auth middleware to Engine

Create `services/engine/src/middleware/auth.ts` with pluggable strategies:

```typescript
// Auth types supported per-query in groups.json:
// "authType": "none"          — no auth (demo/mock)
// "authType": "bearer"        — Authorization: Bearer <token>
// "authType": "windows"       — NTLM/Kerberos (via httpntlm or node-sspi)
// "authType": "bam_token"     — Custom BAM token header
// "authType": "ip_whitelist"  — IP-based access
```

Add `authType` and `authConfig` fields to the Query schema and groups.json — this is per-query config that tells the Engine HOW to authenticate when calling each tenant's real API. For demo, all queries use `"authType": "none"`.

### Step 3: Modify UI service (existing Next.js app)

**Changes to existing Next.js app:**
- Update `next.config.mjs`: Add `rewrites()` to proxy all `/api/*` requests to `http://localhost:4000/api/*` (Engine service)
- Remove `src/app/api/` directory entirely (all API routes now live in Engine)
- Remove `src/core/`, `src/adapters/`, `src/config/`, `src/training/`, `src/lib/` (moved to Engine)
- Keep: `src/app/` pages, `src/components/`, `src/hooks/`, `public/`, `data/knowledge/`
- Add `NEXT_PUBLIC_ENGINE_URL` and `ENGINE_URL` env vars
- UI becomes a pure presentation layer

### Step 4: Update Mock API service

**Changes to `mock-api/`:**
- Move to `services/mock-api/` for consistency
- Add its own `package.json` (with json-server dependency)
- No code changes to `server.js` or `db.json`

### Step 5: Root workspace setup

**Root `package.json`:**
```json
{
  "name": "chatbot-platform",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:ui\" \"npm run dev:engine\" \"npm run dev:mock-api\"",
    "dev:ui": "cd services/ui && npm run dev",
    "dev:engine": "cd services/engine && npm run dev",
    "dev:mock-api": "cd services/mock-api && npm start",
    "build": "cd services/ui && npm run build && cd ../engine && npm run build",
    "start:demo": "concurrently \"npm run start:ui\" \"npm run start:engine\" \"npm run start:mock-api\"",
    "start:prod": "concurrently \"npm run start:ui\" \"npm run start:engine\""
  }
}
```

### Step 6: Update docker-compose.yml (3 services)

```yaml
version: '3.8'
services:
  ui:
    build: ./services/ui
    ports: ['3000:3000']
    environment:
      - ENGINE_URL=http://engine:4000
    depends_on: [engine]

  engine:
    build: ./services/engine
    ports: ['4000:4000']
    environment:
      - API_BASE_URL=http://mock-api:8080/api  # demo
      - NODE_ENV=production
    depends_on: [mock-api]

  mock-api:
    build: ./services/mock-api
    ports: ['8080:8080']
```

**Prod docker-compose.prod.yml** — drops mock-api, sets real API_BASE_URL on engine.

### Step 7: Update guide pages

**Replace existing 3 guides with 5 guides:**

| Guide | Audience | Content |
|-------|----------|---------|
| User Guide | Viewers & Admins | Using the chatbot (unchanged) |
| **Demo Setup Guide** | Developers | Steps to run all 3 services locally (Mac/Linux) |
| **Production Deployment Guide** | Admins/DevOps | Steps to deploy UI + Engine (no Mock API) |
| Config Guide | Developers & Admins | Configuration reference (updated for new structure) |
| **Windows Host Guide** | Admins/DevOps | IIS reverse proxy + PM2 for Windows Server |

**Demo Setup Guide** covers:
1. Prerequisites (Node.js 18+, npm, Git)
2. Clone & install deps for all 3 services
3. Start Mock API (port 8080)
4. Start Engine (port 4000)
5. Start UI (port 3000)
6. Or use `npm run dev` from root to start all 3
7. Docker option: `docker compose up`
8. Verify: health check endpoints

**Production Deployment Guide** covers:
1. Prerequisites
2. Build UI + Engine
3. Configure Engine env vars (real API endpoints, auth config per query)
4. Deploy Engine (PM2 / Docker / systemd)
5. Deploy UI (static export or standalone, Nginx/IIS reverse proxy)
6. No Mock API needed — queries point to real tenant APIs
7. Auth configuration per query (Windows Auth, BAM Token, Bearer, IP Whitelist)

**Windows Host Guide** covers:
1. Install Node.js on Windows Server
2. Install PM2 globally + pm2-windows-startup
3. Start Engine with PM2 (`pm2 start services/engine/dist/server.js --name engine`)
4. Start UI with PM2 (`pm2 start services/ui/server.js --name ui`)
5. Configure IIS as reverse proxy (URL Rewrite + ARR)
6. IIS → port 80/443 → proxy to UI :3000 and Engine :4000
7. SSL certificate setup with IIS
8. Windows Firewall rules
9. Auto-start on boot (`pm2 save`, `pm2-startup install`)
10. For demo: also start Mock API with PM2

### Step 8: Update sidebar navigation

Update Sidebar.tsx to show the 5 guides in the GUIDES section.

---

## Final directory structure

```
Chatbot/
├── services/
│   ├── ui/                         # Service 1: Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                # Pages (admin, widget, main)
│   │   │   ├── components/         # React components
│   │   │   └── hooks/              # useChat etc.
│   │   ├── public/
│   │   ├── next.config.mjs         # With rewrites → Engine
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── engine/                     # Service 2: Express API
│   │   ├── src/
│   │   │   ├── server.ts           # Express entry
│   │   │   ├── routes/             # API route handlers
│   │   │   ├── middleware/         # Auth, CORS, logging
│   │   │   ├── core/              # Engine, NLP, Response
│   │   │   ├── adapters/          # Web, Teams
│   │   │   ├── config/            # Groups, filters, users
│   │   │   ├── training/          # Corpus, FAQ, entities
│   │   │   └── lib/               # Logger, errors, utils
│   │   ├── data/                   # Knowledge files, logs
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── mock-api/                   # Service 3: JSON Server
│       ├── server.js
│       ├── db.json
│       ├── package.json
│       └── Dockerfile
│
├── docker-compose.yml              # All 3 services (demo)
├── docker-compose.prod.yml         # UI + Engine only (prod)
├── package.json                    # Root workspace scripts
└── README.md
```

---

## Execution order

1. Create `services/` directory structure
2. Set up `services/engine/` — Express server with all routes and core logic
3. Set up `services/mock-api/` — Move existing mock-api with own package.json
4. Modify existing Next.js into `services/ui/` — strip API routes, add rewrites
5. Update root package.json + docker-compose files
6. Replace guide pages (Demo Setup, Prod Deploy, Windows Host, updated Config, User Guide)
7. Update sidebar with new guide links
8. Test all 3 services running together
