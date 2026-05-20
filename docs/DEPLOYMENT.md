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
cp .env.example .env.dev
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

## Docker

Demo mode with mock data:

```bash
docker compose up --build
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
