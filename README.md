# Chatbot Engine

Natural-language data assistant for business teams — a low-cost,
low-code alternative to the BI-team middleware between Tableau and
the people who actually need answers. Business users ask questions
in their own words; admins teach the bot vocabulary instead of
writing SQL.

```
┌─────────────────┐     ┌────────────────────┐     ┌───────────────────────┐
│   Next.js UI    │────▶│   Engine (NLP)      │────▶│  Data sources         │
│   :3001         │     │   :4001             │     │  REST / SQL / CSV     │
└─────────────────┘     └────────────────────┘     └───────────────────────┘
```

---

## Quick start (5 minutes)

```bash
# 1. Clone + install
git clone <repo-url> && cd Chatbot
npm install
npm install --prefix apps/web
npm install --prefix apps/engine
npm install --prefix apps/mock-api

# 2. Boot everything (mock data + engine + UI)
npm run dev:mock

# 3. Open http://localhost:3001 — try "run pnl_lineage" → "break it down by region"
```

For Docker, IIS + NSSM, real APIs, SQL connectors, or production deployment,
start with **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**. The longer
operator reference remains in **[docs/SETUP.md](./docs/SETUP.md)**.

---

## What's in here

### Surfaces

| URL                                               | What                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `http://localhost:3001/`                          | Chat (the primary user surface)                                    |
| `http://localhost:3001/admin`                     | Admin: synonyms, intents, learning, analytics, audit, schema drift |
| `http://localhost:3001/admin/api-docs`            | OpenAPI 3.0 reference (Redoc)                                      |
| `http://localhost:3001/admin/guides/user-guide`   | End-user how-to                                                    |
| `http://localhost:3001/admin/guides/config-guide` | Operator configuration                                             |
| `http://localhost:3001/admin/guides/docker-setup` | Docker deployment                                                  |
| `http://localhost:4001/api/health`                | Liveness probe                                                     |
| `http://localhost:4001/api/health/ready`          | Readiness probe (NLP + data dir + source health)                   |
| `http://localhost:4001/api/metrics`               | Prometheus scrape                                                  |
| `http://localhost:4001/api/openapi.json`          | OpenAPI 3.0 spec                                                   |

### Capability layers

**Natural-language UX**

- 11+ follow-up phrasings (`group by` / `break down by` / `split by` / `for each` / `per`)
- Semantic column synonyms + per-group operator-edited vocabulary
- Per-group business **glossary** (`/admin/glossary`) — formal metric definitions, aliases, formulas
- Type-ahead autocomplete with click-through learning — picks bump future ranks per user
- Drill-down chip on grouped results
- Closed learning loop — admin approves low-confidence interactions, retrain merges them into the live NLP corpus

**Proactive analytics (no LLM)**

- Auto-insights ("💡 EMEA drives 45% of revenue") prepended to query results and dashboard views
- Change narratives ("FYI **revenue** is up 12% vs. 5 min ago") against the prior anomaly snapshot
- Root cause analysis — chat `"what is driving X"` ranks top contributors by share of total
- Trend badge (`↑ 12.3%`) on every KPI tile with a date column
- On-demand forecast sparkline per KPI (exponential smoothing)
- Unified Data Quality card — duplicates + missing % + schema drift + anomaly count in one tile

**Security**

- PII detection (9 kinds) — masked by default, admin role unmasks with per-view audit
- Cross-group session isolation
- Structured 4xx/5xx envelopes with `requestId` correlation
- Rate limiting, request-size limits, security headers

**Reliability**

- Per-query result cache (60s) with stale-while-error fallback
- Per-baseUrl circuit breaker + retry
- Data-source health monitor (probes every 30s)
- Schema drift detection + admin acknowledge
- JSONL rotation at 10MB
- Concurrent retrain coalescing
- Engine idle TTL eviction (30 min)

**Observability**

- Prometheus `/metrics` with chat counts, histograms, source health gauges
- `x-request-id` correlation end-to-end (logs + audit + UI errors)
- NLP-miss analytics (top failing phrases, retry rate)
- Audit trail per mutation, PII clear view, snapshot, drift event

**Process**

- 150+ check automated validation harness (`npm run validate:demo`)
- GitHub Actions CI workflow runs the harness on every PR
- OpenAPI 3.0 reference
- Demo flow rehearsal script

---

## Common commands

```bash
# Dev (all 3 services with mock data)
npm run dev:mock

# Dev with engine + Next.js only (real APIs, no mock)
npm run dev

# Validation harness — 128 checks across health, chat, drill-down,
# PII, snapshots, drift, cache, rate limits, metrics, OpenAPI
npm run validate:demo

# Quick validation (skips slow chat phases)
npm run validate:demo:quick

# Production build (all apps)
npm run build:all

# Engine unit tests
cd apps/engine && npm test

# UI tests
cd apps/web && npm test
```

---

## Docker

Compose files, one per scenario (each on an explicit `chatbot` network):

| File                            | Services                                | Data source / env                          |
| ------------------------------- | --------------------------------------- | ------------------------------------------ |
| `docker-compose.ui-engine.yml`  | UI + engine                             | Real tenant API — needs `.env.prod`        |
| `docker-compose.no-mock.yml`    | UI + engine + 3 connectors              | Real tenant API + connectors — `.env.prod` |
| `docker-compose.full.yml`       | UI + engine + mock-api + 3 connectors   | Mock/demo data — `.env.demo` (no secrets)  |
| `docker-compose.sample-db.yml`  | Sample MSSQL/Oracle DBs                  | For exercising the SQL connectors          |

```bash
docker compose -f docker-compose.full.yml up -d --build      # everything, mock data
docker compose -f docker-compose.no-mock.yml up -d --build   # real APIs + connectors
docker compose -f docker-compose.ui-engine.yml up -d --build # just UI + engine
```

Host ports default to UI 3001 / engine 4001 / mock 8080 / connectors 4002–4004, and are
overridable when taken: `ENGINE_HOST_PORT=4011 MOCK_HOST_PORT=8088 docker compose -f … up -d`.

Full env-var reference, persistence layout, and post-deploy smoke
recipe at **`/admin/guides/docker-setup`** in the running app, or
see [`docs/SETUP.md` § Docker](./docs/SETUP.md).

---

## Demo

Running a CIO demo? See **[docs/DEMO-FLOW.md](./docs/DEMO-FLOW.md)**
for the 12-minute rehearsal script (6 steps, pre-baked answers,
hard-skips, recovery paths).

Want to verify the latest features yourself? **[docs/SELF-TEST.md](./docs/SELF-TEST.md)**
walks every recent addition (Packages A/B/C, glossary, autocomplete,
userinfo) with both visual and `curl` checks per section.

Designing a new surface or handing the app to a design tool? See
**[docs/APP-SPEC.md](./docs/APP-SPEC.md)** — a structured snapshot of
every route, component, capability layer, and design token.

Latest validation report at **[docs/DEMO-VALIDATION.md](./docs/DEMO-VALIDATION.md)**
— gets regenerated every time `npm run validate:demo` runs and
uploaded as an artifact by CI.

---

## Roadmap

Next-up items (priority + owner + gate) tracked in
**[docs/NEXT-STEPS.md](./docs/NEXT-STEPS.md)**.

---

## Repository layout

```
.
├── apps/                         Deployable apps (each self-contained)
│   ├── web/                      Next.js UI (App Router)
│   │   ├── src/
│   │   │   ├── app/              Pages + API proxies
│   │   │   │   ├── api/          Next.js → engine proxies
│   │   │   │   ├── admin/        Admin surfaces (synonyms, learning, …)
│   │   │   │   ├── share/[id]/   Shareable snapshot viewer
│   │   │   │   └── ...
│   │   │   ├── components/       React components
│   │   │   ├── hooks/            useChat, etc.
│   │   │   └── lib/              Client + proxy utilities
│   │   ├── data/                 UI-side data
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── engine/                   Core NLP + query execution engine
│   │   ├── src/                  NLP, routes, lib (vitest unit tests live here)
│   │   ├── tests/                Jest integration tests
│   │   ├── openapi.json          Hand-maintained API spec
│   │   ├── data/                 Runtime state (gitignored)
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── mock-api/                 Sample data provider
│   ├── mssql-connector/          SQL Server connector
│   ├── oracle-connector/         Oracle connector
│   └── csv-xlsx-connector/       CSV/XLSX connector
├── packages/
│   └── sql-connector/            Canonical shared SQL router (vendored via npm run sync:shared)
├── scripts/
│   └── demo/validate.mjs         128-check validation harness
├── docs/
│   ├── SETUP.md                  Full developer setup
│   ├── DEMO-FLOW.md              CIO demo rehearsal script
│   ├── DEMO-VALIDATION.md        Latest harness report
│   ├── NEXT-STEPS.md             Roadmap
│   └── onboarding-guide.md       Tenant onboarding
├── package.json                  Orchestration only (sync:shared, build:*, test, dev, svc:*, db:*)
└── .github/workflows/ci.yml      CI gate (harness on every PR)
```

---

## License

Internal — see your engagement agreement.
