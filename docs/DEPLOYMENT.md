# Deployment Guide

This app runs as five production services when SQL Server, Oracle, and
CSV/XLSX data sources are enabled:

- **UI:** Next.js standalone server on port `3001`
- **Engine:** Node.js API/NLP service on port `4001`
- **MSSQL Connector:** SQL Server connector service on port `4002`
- **Oracle Connector:** Oracle connector service on port `4003`
- **CSV/XLSX Connector:** file and Excel connector service on port `4004`

The repository does not currently contain a Python backend. If your org adds a
Python worker or connector, run it as a separate Windows service with the same
NSSM pattern shown below.

## Required Versions

- Node.js 20 LTS for Windows/IIS or direct host deployment
- Docker Engine 25+ / Docker Compose v2 for container deployment
- IIS with URL Rewrite 2.1 and ARR 3.0 for Windows reverse proxy deployment

## Local Review

```bash
npm install
npm install --prefix services/engine
npm install --prefix services/mock-api

# Mock-data review mode: mock API + engine + UI.
# Environment-agnostic admin content such as intents, glossary, templates,
# synonyms, groups, and settings remains in engine config/data. Mock business
# data comes only from the mock API.
npm run dev:mock
```

Open `http://localhost:3001`.

Useful validation commands:

```bash
npm run build
npm test -- --runInBand
cd services/engine && npm test
npm run validate:demo:quick
```

## Environment Files

Copy `.env.example` to the target environment file:

```bash
cp .env.example .env.mock
cp .env.example .env.demo
cp .env.example .env.dev
cp .env.example .env.uat
cp .env.example .env.prod
```

Production minimum:

```ini
NODE_ENV=production
ENGINE_URL=http://localhost:4001
ENGINE_PORT=4001
API_BASE_URL=https://your-data-api.example.com/api
API_TOKEN=replace-with-token
ENGINE_API_KEY=replace-with-strong-key
NEXT_PUBLIC_WIJMO_LICENSE_KEY=replace-with-wijmo-license-key
UI_ORIGIN=https://chatbot.your-org.example.com
DATA_DIR=C:\chatbot\data
MSSQL_CONNECTOR_URL=http://localhost:4002
ORACLE_CONNECTOR_URL=http://localhost:4003
CSV_XLSX_CONNECTOR_URL=http://localhost:4004
CONNECTOR_API_KEY=replace-with-strong-connector-key
SQL_CREDENTIAL_KEY=replace-with-strong-credential-encryption-key
```

`NEXT_PUBLIC_WIJMO_LICENSE_KEY` is a browser-side Wijmo key and must be present
when the UI is built. Docker production builds pass it as a build argument from
`.env.prod`; IIS/NSSM deployments should set it before running `npm run build:ui`.

For Docker, use Linux-style container paths when overriding paths:

```ini
DATA_DIR=/app/data
UI_ORIGIN=https://chatbot.your-org.example.com
```

## Configuration and Shared Storage (multi-instance)

The engine keeps **all admin configuration in JSON files** (no database). Config
and runtime state are read from the directories below, each overridable by an
env var. When you run **more than one engine instance**, point every instance at
the **same shared volume** (NAS/NFS, or a `ReadWriteMany` Kubernetes PVC) so they
share one source of truth.

### Storage env vars

| Var            | Holds                                                                                                 | Default (relative to the engine working dir) |
| -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `CONFIG_DIR`   | `groups.json`, `settings.json`, `users.json`, `filter-config.json`, `data-roles.json`                 | `src/config`                                 |
| `DATA_DIR`     | per-group query files (`queries/<group>.json`), learning, indexes, audit, logs, sessions, saved views | `data`                                       |
| `TRAINING_DIR` | NLP corpus/FAQ (`corpus.json`, `groups/corpus-*.json`, `groups/faq-*.json`)                           | `src/training`                               |
| `INSTANCE_ID`  | unique id per instance (tracing + file-lock owner)                                                    | `engine-<pid>`                               |

> The engine bundles a build-time copy of `groups.json` into `dist`, but at
> runtime it reads `CONFIG_DIR/groups.json` and re-reads it whenever the file
> changes. If `CONFIG_DIR` is not seeded it falls back to the bundled demo
> groups — always seed it.

### Seed the shared volume (one time)

| Repo source                                             | Copy to                                                          |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `services/engine/src/config/*.json`                     | `$CONFIG_DIR/`                                                   |
| `services/engine/data/queries/*.json`                   | `$DATA_DIR/queries/` (file-based query catalog, shipped in repo) |
| `services/engine/src/training/` (corpus/faq, `groups/`) | `$TRAINING_DIR/` (only if you use per-group corpus/FAQ)          |

```bash
VOL=/mnt/nas/chatbot                       # your shared volume root
mkdir -p "$VOL"/{config,data/queries,training}
cp services/engine/src/config/*.json   "$VOL/config/"
cp services/engine/data/queries/*.json "$VOL/data/queries/"   # file-based query catalog, shipped in repo
cp -r services/engine/src/training/*   "$VOL/training/"     # if used
```

### Per-group query files (shipped as seed — no script to run)

The query catalog is the **file-based source of truth** at
`DATA_DIR/queries/<group>.json`. These files are **committed in the repo** at
`services/engine/data/queries/*.json`, so they are copied with the rest of the
seed above — **there is no migration step to run at deploy time.** The admin
**Queries** UI writes straight to these files (the engine is the single writer),
so edits persist with no mock-api involved.

> Migrating from an older deployment that still has a mock `db.json`? Drop it in
> place and the engine **idempotently seeds** `DATA_DIR/queries/<group>.json`
> from it on first boot (a no-op once per-group files exist) — see
> `migrateQueriesFromDbJson` in `core/catalog/query-registry.ts`. The legacy
> `services/engine/src/scripts/migrate-queries-to-per-group.ts` remains for
> manual repo regeneration.

### Migrating from an existing deployment (source → destination)

Three buckets. Paths shown are the engine **defaults** — substitute your current
deployment's `CONFIG_DIR` / `DATA_DIR` if you already override them (admin edits
are written back to those same paths).

**1. Copy — admin-authored config and content (carry these over):**

| What                                         | Source (existing setup)                                                | Destination (shared volume)  |
| -------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| Groups, settings, users, filters, data-roles | `services/engine/src/config/*.json`                                    | `$CONFIG_DIR/`               |
| Query definitions (per-group files)          | `…/data/queries/*.json` (existing deployment)                          | `$DATA_DIR/queries/`         |
| NLP corpus / FAQ                             | `services/engine/src/training/` (`corpus.json`, `faq.json`, `groups/`) | `$TRAINING_DIR/`             |
| Glossary (metric definitions)                | `…/data/glossary/*.json`                                               | `$DATA_DIR/glossary/`        |
| Watch **rules**                              | `…/data/watch/<group>/rules.json`                                      | `$DATA_DIR/watch/<group>/`   |
| Workflows                                    | `…/data/workflows/*.json`                                              | `$DATA_DIR/workflows/`       |
| Saved GridBoard views                        | `…/data/gridboard-views/*.json`                                        | `$DATA_DIR/gridboard-views/` |
| Uploaded knowledge docs                      | `…/data/knowledge/`                                                    | `$DATA_DIR/knowledge/`       |

**2. Provided as seed / built automatically — no script to run:**

| What                                           | How                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Per-group query files (`queries/<group>.json`) | shipped as seed — copy from `services/engine/data/queries/` (above); admin edits keep them in sync. No script.                        |
| Search indexes (`indexes/…`)                   | built from corpus/knowledge automatically on engine init (NLP train). No script. Copy `…/data/indexes/` only to skip the first build. |

**3. Leave as-is — transactional runtime state. Do NOT copy; the engine
recreates it. Copy only if you specifically want to preserve history:**

`data/learning/` (interactions, review-queue, user-interactions, search-picks,
signal-aggregates, synonyms, co-occurrence, …), `data/audit/`, `data/logs/`,
`data/sessions/`, `data/preferences/`, `data/schema/`, `data/anomaly/`,
`data/watch/<group>/alerts.jsonl`, `data/views/`.

> Rule of thumb: anything an **admin authored** (config, glossary, watch rules,
> workflows, queries, corpus/FAQ) is bucket 1 or 2 and must be carried or
> regenerated; anything the **app accumulated at runtime** (logs, sessions,
> learning signals, audit, indexes, anomaly baselines) is bucket 3 and is safe
> to start empty.

### Per-instance env (example)

Set the **same** storage paths on every engine instance; vary only
`INSTANCE_ID`:

```ini
NODE_ENV=production
ENGINE_PORT=4001
CONFIG_DIR=/mnt/nas/chatbot/config
DATA_DIR=/mnt/nas/chatbot/data
TRAINING_DIR=/mnt/nas/chatbot/training
INSTANCE_ID=engine-pod-1                              # unique per instance (e.g. pod/host name)
API_BASE_URL=https://your-data-api.example.com/api   # real data source (query EXECUTION)
```

On the **UI** service, set `ENGINE_URL` to the engine service address.

### Multi-instance behaviour (what to expect)

- **Live config propagation, no restart:** a group or query created/edited on
  one instance is picked up by every other instance on its next read (a UI
  refresh) — reads re-load the shared file when its modified-time (mtime)
  changes.
- **Concurrent-write safety:** admin writes are atomic (temp file + rename) and
  serialized with an advisory file lock, so simultaneous edits across instances
  do not corrupt or lose data.
- **Volume requirements:** use a `ReadWriteMany` volume (NFS/CephFS/EFS/Azure
  Files) so all instances can read and write. On NFS-style mounts a change can
  take a few seconds to become visible on other instances (client attribute
  cache) — this is expected.

### Verify after deploy

1. `curl http://<engine>:4001/api/health` → `ok`.
2. **Admin → Groups** shows your real groups (not the demo set).
3. In chat, send `list queries` — the group's queries are listed.
4. Create/edit a group on one instance, refresh the UI (served by another
   instance) — the change appears with no restart.

## Docker

Demo mode with mock data:

```bash
docker compose up --build
```

UAT mode (prod mirror with real UAT-tenant APIs — fill placeholders in `.env.uat`):

```bash
docker compose -f docker-compose.uat.yml up --build -d
docker compose -f docker-compose.uat.yml ps
docker compose -f docker-compose.uat.yml logs -f engine ui mssql-connector oracle-connector
```

Production mode:

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f engine ui mssql-connector oracle-connector
```

Smoke checks:

```bash
curl http://localhost:3001/api/health
curl http://localhost:4001/api/health
curl http://localhost:4001/api/health/ready
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health
```

The compose files persist engine runtime state in the `engine-data` volume.
That state includes learning data, audit/log output, user preferences,
knowledge uploads, snapshots, and saved views.

SQL connector runtime state is persisted in `mssql-connector-data` and
`oracle-connector-data`. Connector definitions and encrypted database
credentials belong in those runtime volumes, not in source control.
CSV/XLSX connector runtime state is persisted in `csv-xlsx-connector-data`.

SQL connector images use one shared Dockerfile:

```bash
docker build -f services/connector.Dockerfile \
  --build-arg SERVICE_DIR=services/mssql-connector \
  --build-arg SERVICE_PORT=4002 \
  -t chatbot-mssql-connector .

docker build -f services/connector.Dockerfile \
  --build-arg SERVICE_DIR=services/oracle-connector \
  --build-arg SERVICE_PORT=4003 \
  -t chatbot-oracle-connector .

docker build -f services/connector.Dockerfile \
  --build-arg SERVICE_DIR=services/csv-xlsx-connector \
  --build-arg SERVICE_PORT=4004 \
  -t chatbot-csv-xlsx-connector .
```

`docker-compose.prod.yml` enables SQL Server, Oracle, and CSV/XLSX connector
services by default. The demo compose file keeps the mock API as the data
source for mock mode; leave it that way for local review unless you are
explicitly testing live database or file connectors.

## SQL Connector Setup

Set these values in `.env.prod`:

```ini
CONNECTOR_API_KEY=replace-with-strong-shared-key
SQL_CREDENTIAL_KEY=replace-with-32-plus-char-secret
MSSQL_CONNECTOR_URL=http://mssql-connector:4002
ORACLE_CONNECTOR_URL=http://oracle-connector:4003
CSV_XLSX_CONNECTOR_URL=http://csv-xlsx-connector:4004
```

The UI forwards connector admin calls through `/api/admin/mssql-connector/*`
`/api/admin/oracle-connector/*`, and `/api/admin/csv-connector/*`. In Docker,
those calls resolve to the internal service names above. In IIS/NSSM mode, use
`http://localhost:4002`, `http://localhost:4003`, and
`http://localhost:4004`.

After deployment:

1. Open **Admin → Connectors**.
2. Create the SQL Server connector and save credentials.
3. Create the Oracle connector and save credentials.
4. Create the CSV/XLSX connector for the file directory or upload target.
5. Use **Test connection** on each connector.
6. Use schema/table/column discovery to confirm permissions.
7. Create or import saved queries that point to the right connector IDs.
8. Run at least one read-only query through the chat or admin preview.

## IIS With No Managed Code

Use IIS only as the corporate reverse proxy. The UI still runs as a Node.js
process on `localhost:3001`; IIS handles TLS, Windows auth, and routing.

1. Install Node.js 20 LTS.
2. Install IIS URL Rewrite 2.1 and ARR 3.0.
3. Enable ARR proxy in IIS Manager.
4. Create an IIS site pointing at a folder that contains this repo's
   `web.config`.
5. Set the site application pool to **No Managed Code**.
6. Run the UI and engine as Windows services with NSSM.

Build once on the server:

```powershell
npm ci
npm ci --prefix services/engine
npm run build
```

Install the engine service:

```powershell
nssm install ChatbotEngine "C:\Program Files\nodejs\node.exe" "dist\server.js"
nssm set ChatbotEngine AppDirectory "C:\apps\Chatbot\services\engine"
nssm set ChatbotEngine AppEnvironmentExtra "NODE_ENV=production" "ENGINE_PORT=4001" "DATA_DIR=C:\chatbot\data"
nssm start ChatbotEngine
```

Install the UI service:

```powershell
nssm install ChatbotUI "C:\Program Files\nodejs\node.exe" "server.js"
nssm set ChatbotUI AppDirectory "C:\apps\Chatbot\.next\standalone"
nssm set ChatbotUI AppEnvironmentExtra "NODE_ENV=production" "PORT=3001" "ENGINE_URL=http://localhost:4001" "NEXT_PUBLIC_WIJMO_LICENSE_KEY=replace-with-wijmo-license-key"
nssm start ChatbotUI
```

Install the SQL Server connector service:

```powershell
nssm install ChatbotMssqlConnector "C:\Program Files\nodejs\node.exe" "dist\server.js"
nssm set ChatbotMssqlConnector AppDirectory "C:\apps\Chatbot\services\mssql-connector"
nssm set ChatbotMssqlConnector AppEnvironmentExtra "NODE_ENV=production" "CONNECTOR_PORT=4002" "DATA_DIR=C:\chatbot\mssql-connector-data" "CONNECTOR_API_KEY=replace-with-strong-key" "SQL_CREDENTIAL_KEY=replace-with-strong-encryption-key" "UI_ORIGIN=https://chatbot.your-org.example.com"
nssm start ChatbotMssqlConnector
```

Install the Oracle connector service:

```powershell
nssm install ChatbotOracleConnector "C:\Program Files\nodejs\node.exe" "dist\server.js"
nssm set ChatbotOracleConnector AppDirectory "C:\apps\Chatbot\services\oracle-connector"
nssm set ChatbotOracleConnector AppEnvironmentExtra "NODE_ENV=production" "CONNECTOR_PORT=4003" "DATA_DIR=C:\chatbot\oracle-connector-data" "CONNECTOR_API_KEY=replace-with-strong-key" "SQL_CREDENTIAL_KEY=replace-with-strong-encryption-key" "UI_ORIGIN=https://chatbot.your-org.example.com"
nssm start ChatbotOracleConnector
```

Install the CSV/XLSX connector service:

```powershell
nssm install ChatbotCsvXlsxConnector "C:\Program Files\nodejs\node.exe" "dist\server.js"
nssm set ChatbotCsvXlsxConnector AppDirectory "C:\apps\Chatbot\services\csv-xlsx-connector"
nssm set ChatbotCsvXlsxConnector AppEnvironmentExtra "NODE_ENV=production" "CONNECTOR_PORT=4004" "DATA_DIR=C:\chatbot\csv-xlsx-connector-data" "CONNECTOR_API_KEY=replace-with-strong-key" "UI_ORIGIN=https://chatbot.your-org.example.com"
nssm start ChatbotCsvXlsxConnector
```

For Oracle thick-client deployments, install the Oracle Instant Client on the
server and set any required Oracle client environment variables in the same
NSSM `AppEnvironmentExtra` command according to your database team's standard.

If you add a Python service:

```powershell
nssm install ChatbotPython "C:\Python311\python.exe" "-m your_service"
nssm set ChatbotPython AppDirectory "C:\apps\Chatbot\python-service"
nssm set ChatbotPython AppEnvironmentExtra "PYTHONUNBUFFERED=1" "ENV=production"
nssm start ChatbotPython
```

## Final Smoke Checklist

- `http://localhost:4001/api/health` returns `ok`.
- `http://localhost:3001/api/health` returns `ok`.
- IIS public URL loads the UI.
- Chat can run at least one known query.
- Admin pages load without proxy errors.
- `http://localhost:4002/health` returns `ok` for SQL Server connector.
- `http://localhost:4003/health` returns `ok` for Oracle connector.
- `http://localhost:4004/health` returns `ok` for CSV/XLSX connector.
- SQL Server and Oracle connector test-connection actions succeed.
- Engine logs show a stable `DATA_DIR` and no repeated source failures.
