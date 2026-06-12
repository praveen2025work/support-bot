"use client";

import {
  Section,
  CmdBlock,
  Badge,
  Code,
  FileRef,
  GuideHeader,
  QuickNav,
  CardContainer,
  InfoBox,
  TroubleshootItem,
} from "../components";

const SECTIONS = [
  { id: "arch", label: "Architecture" },
  { id: "prereqs", label: "Prerequisites" },
  { id: "demo", label: "Full (Demo)" },
  { id: "dev", label: "UI + Engine" },
  { id: "prod", label: "No-Mock (Prod)" },
  { id: "connectors", label: "SQL Connectors" },
  { id: "env", label: "Environment Vars" },
  { id: "manage", label: "Management" },
  { id: "trouble", label: "Troubleshooting" },
];

export default function DockerSetupGuidePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <GuideHeader
        title="Docker Setup Guide"
        description="Run the chatbot platform with Docker Compose — Full (demo), UI+Engine, and No-Mock environments"
        badgeColor="indigo"
        badgeText="Developers & DevOps"
      />

      <QuickNav sections={SECTIONS} />

      <CardContainer>
        {/* ── Architecture ── */}
        <Section id="arch" title="Architecture Overview">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            This is a monorepo: every deployable app lives under{" "}
            <Code>apps/</Code> (web, engine, mock-api, connectors) and shared
            libraries under <Code>packages/</Code>. The repo root is
            orchestration only. Docker Compose wires the apps together — each
            app has its own <Code>Dockerfile</Code>, and every service joins an
            explicit <Code>chatbot</Code> bridge network. Each compose file
            targets a specific deployment scenario.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`┌──────────────────────────────────────────────────┐
│  Docker Host                                      │
│                                                    │
│  ┌────────────────┐    ┌────────────────┐          │
│  │  UI Container   │───▶│ Engine Container│          │
│  │  Next.js :3001  │    │ Express  :4001  │          │
│  └────────────────┘    └───────┬────────┘          │
│                                │                    │
│                    ┌───────────┼───────────┐        │
│                    │ (demo)    │ (optional) │        │
│               ┌────▼────┐ ┌───▼───┐ ┌─────▼──┐    │
│               │ Mock API │ │ MSSQL │ │ Oracle │    │
│               │  :8080   │ │ :4002 │ │ :4003  │    │
│               └─────────┘ └───────┘ └────────┘    │
└──────────────────────────────────────────────────┘`}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              {
                file: "docker-compose.full.yml",
                env: "Full (demo)",
                services:
                  "All 6 — UI + Engine + Mock API + 3 connectors (.env.demo)",
                color: "bg-green-50 border-green-200 text-green-700",
              },
              {
                file: "docker-compose.ui-engine.yml",
                env: "UI + Engine",
                services: "UI + Engine, real tenant API (.env.prod)",
                color: "bg-blue-50 border-blue-200 text-blue-700",
              },
              {
                file: "docker-compose.no-mock.yml",
                env: "No-Mock",
                services: "UI + Engine + 3 connectors, real API (.env.prod)",
                color: "bg-red-50 border-red-200 text-red-700",
              },
              {
                file: "docker-compose.sample-db.yml",
                env: "Sample DBs",
                services: "Sample MSSQL/Oracle for connector testing",
                color: "bg-amber-50 border-amber-200 text-amber-700",
              },
            ].map((f) => (
              <div
                key={f.env}
                className={`p-3 rounded-lg border text-xs ${f.color}`}
              >
                <div className="font-semibold">{f.env}</div>
                <div className="font-mono mt-1">{f.file}</div>
                <div className="mt-1 opacity-80">{f.services}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Prerequisites ── */}
        <Section id="prereqs" title="Prerequisites">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              {
                name: "Docker Engine",
                version: "20.10+",
                check: "docker --version",
              },
              {
                name: "Docker Compose",
                version: "v2.0+",
                check: "docker compose version",
              },
            ].map((p) => (
              <div
                key={p.name}
                className="p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div
                  className="font-semibold"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {p.name}{" "}
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>
                    {p.version}
                  </span>
                </div>
                <code className="text-[10px] font-mono text-blue-600">
                  {p.check}
                </code>
              </div>
            ))}
          </div>

          <InfoBox variant="info" title="Windows / macOS">
            Install Docker Desktop which includes both Docker Engine and Compose
            v2. On Linux, install <Code>docker-ce</Code> +{" "}
            <Code>docker-compose-plugin</Code> from the official repo.
          </InfoBox>
        </Section>

        {/* ── Full (Demo / Mock) ── */}
        <Section id="demo" title="Environment 1 — Full (Demo / Mock)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Runs all 6 services (UI, engine, mock-api, and the 3 connectors)
            with a built-in Mock API that provides sample data. Uses{" "}
            <Code>.env.demo</Code> — no secrets, no external APIs or databases
            needed. Works out of the box; ideal for evaluation, demos, and local
            development.
          </p>

          <div className="space-y-1 mb-3">
            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 1 — Build and start
            </div>
            <CmdBlock>{`docker compose -f docker-compose.full.yml up --build -d

# Host ports are overridable if taken, e.g.:
# UI_HOST_PORT=3002 ENGINE_HOST_PORT=4011 MOCK_HOST_PORT=8088 \\
#   docker compose -f docker-compose.full.yml up -d`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 2 — Verify all containers are running
            </div>
            <CmdBlock>{`docker compose -f docker-compose.full.yml ps

# Expected:  6 containers (ui, engine, mock-api, 3 connectors) — all "Up"`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 3 — Open in browser
            </div>
            <CmdBlock>{`# UI:     http://localhost:3001
# Engine: http://localhost:4001/health
# Mock:   http://localhost:8080/api`}</CmdBlock>
          </div>

          <InfoBox variant="tip" title="What you get">
            Mock API serves sample databases (HR, Sales, Finance) so you can
            test chat queries, dashboards, anomaly detection, and all ML
            features without connecting to real data sources.
          </InfoBox>

          <div
            className="p-3 rounded-lg border text-xs mt-3"
            style={{
              backgroundColor: "hsl(var(--muted) / 0.3)",
              borderColor: "hsl(var(--border))",
            }}
          >
            <div
              className="font-semibold mb-1"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Compose file: <FileRef path="docker-compose.full.yml" /> | Env
              file: <FileRef path=".env.demo" />
            </div>
            <div style={{ color: "hsl(var(--muted-foreground))" }}>
              Services: <Badge color="green">UI :3001</Badge>{" "}
              <Badge color="blue">Engine :4001</Badge>{" "}
              <Badge color="purple">Mock API :8080</Badge>{" "}
              <Badge color="blue">MSSQL :4002</Badge>{" "}
              <Badge color="orange">Oracle :4003</Badge>{" "}
              <Badge color="green">CSV/XLSX :4004</Badge>
            </div>
          </div>
        </Section>

        {/* ── UI + Engine (Real API) ── */}
        <Section id="dev" title="Environment 2 — UI + Engine (Real API)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Connects to your real tenant API and authentication — no Mock API,
            no connectors. Uses <Code>.env.prod</Code>. Use this to validate the
            chatbot against your actual data endpoints.
          </p>

          <div className="space-y-1 mb-3">
            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 1 — Create <Code>.env.prod</Code> from template
            </div>
            <CmdBlock>{`cp .env.example .env.prod
# Edit .env.prod with your real values`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 2 — Required variables in .env.prod
            </div>
            <CmdBlock>{`# Engine settings
ENGINE_PORT=4001
API_BASE_URL=https://your-tenant-api.example.com/api
USER_INFO_URL=https://your-ad.example.com/api/user
ENGINE_API_KEY=your-secret-key

# UI settings
NODE_ENV=production`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 3 — Build and start
            </div>
            <CmdBlock>{`docker compose -f docker-compose.ui-engine.yml up --build -d

# Override host ports if taken, e.g.:
# UI_HOST_PORT=3002 ENGINE_HOST_PORT=4011 \\
#   docker compose -f docker-compose.ui-engine.yml up -d`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 4 — Verify
            </div>
            <CmdBlock>{`docker compose -f docker-compose.ui-engine.yml ps

# Expected:  2 containers (ui, engine) — all "Up"
# No mock-api — the real tenant API provides data`}</CmdBlock>
          </div>

          <InfoBox variant="warning" title="API connectivity">
            Ensure your Docker host can reach the tenant API and AD/SSO
            endpoints. If running inside a corporate network, you may need to
            configure Docker DNS or add <Code>extra_hosts</Code> in the compose
            file.
          </InfoBox>

          <div
            className="p-3 rounded-lg border text-xs mt-3"
            style={{
              backgroundColor: "hsl(var(--muted) / 0.3)",
              borderColor: "hsl(var(--border))",
            }}
          >
            <div
              className="font-semibold mb-1"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Compose file: <FileRef path="docker-compose.ui-engine.yml" />
            </div>
            <div style={{ color: "hsl(var(--muted-foreground))" }}>
              Env file: <FileRef path=".env.prod" /> | Services:{" "}
              <Badge color="green">UI :3001</Badge>{" "}
              <Badge color="blue">Engine :4001</Badge>
            </div>
          </div>
        </Section>

        {/* ── No-Mock (Production / UAT) ── */}
        <Section id="prod" title="Environment 3 — No-Mock (Production / UAT)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Production-hardened deployment with the real tenant API,
            authentication, API key protection, and the 3 SQL/file connectors.
            Uses <Code>.env.prod</Code> — the same compose file backs both
            production and UAT.
          </p>

          <div className="space-y-1 mb-3">
            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 1 — Create <Code>.env.prod</Code>
            </div>
            <CmdBlock>{`cp .env.example .env.prod
# Edit .env.prod with production values`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 2 — Required variables in .env.prod
            </div>
            <CmdBlock>{`# Engine settings
ENGINE_PORT=4001
API_BASE_URL=https://prod-api.your-company.com/api
USER_INFO_URL=https://ad.your-company.com/api/user
ENGINE_API_KEY=strong-random-secret-here

# UI settings
NODE_ENV=production

# Optional: SQL connectors
# MSSQL_PORT=4002
# ORACLE_PORT=4003
# ENCRYPTION_SECRET=change-me-in-production

# Optional: CSV/XLSX connector
# CONNECTOR_PORT=4004`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 3 — Build and start
            </div>
            <CmdBlock>{`docker compose -f docker-compose.no-mock.yml up --build -d

# Override host ports if taken, e.g.:
# UI_HOST_PORT=3002 ENGINE_HOST_PORT=4011 MSSQL_HOST_PORT=4012 \\
#   docker compose -f docker-compose.no-mock.yml up -d`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 4 — Verify health
            </div>
            <CmdBlock>{`# Check containers
docker compose -f docker-compose.no-mock.yml ps

# Check engine health
curl http://localhost:4001/health

# Check UI
curl -s http://localhost:3001 | head -5`}</CmdBlock>
          </div>

          <InfoBox variant="warning" title="Security checklist">
            Before going live: set a strong <Code>ENGINE_API_KEY</Code>,
            restrict port access (only expose 3001 externally), place a reverse
            proxy (Nginx/Traefik) in front for SSL termination.
          </InfoBox>

          <div
            className="p-3 rounded-lg border text-xs mt-3"
            style={{
              backgroundColor: "hsl(var(--muted) / 0.3)",
              borderColor: "hsl(var(--border))",
            }}
          >
            <div
              className="font-semibold mb-1"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Compose file: <FileRef path="docker-compose.no-mock.yml" />
            </div>
            <div style={{ color: "hsl(var(--muted-foreground))" }}>
              Env file: <FileRef path=".env.prod" /> | Services:{" "}
              <Badge color="green">UI :3001</Badge>{" "}
              <Badge color="blue">Engine :4001</Badge>
            </div>
          </div>

          <InfoBox variant="tip" title="Reverse proxy">
            For Docker production, consider adding Nginx or Traefik as a
            container in the compose file for SSL. See the{" "}
            <strong>Linux Setup Guide</strong> for standalone Nginx
            configuration.
          </InfoBox>
        </Section>

        {/* ── SQL Connectors ── */}
        <Section id="connectors" title="Optional: SQL Connectors">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            The platform includes no-code connector services for MSSQL, Oracle,
            and CSV/XLSX files. They are bundled in{" "}
            <Code>docker-compose.full.yml</Code> and{" "}
            <Code>docker-compose.no-mock.yml</Code> for direct database queries
            or file-based data access. Each connector is a self-contained app
            under <Code>apps/</Code> with its own <Code>Dockerfile</Code>. The
            two SQL connectors vendor the shared SQL router from{" "}
            <Code>packages/sql-connector</Code> via{" "}
            <Code>npm run sync:shared</Code>.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              {
                name: "MSSQL Connector",
                port: "4002",
                path: "apps/mssql-connector",
                color: "blue",
              },
              {
                name: "Oracle Connector",
                port: "4003",
                path: "apps/oracle-connector",
                color: "orange",
              },
              {
                name: "CSV/XLSX Connector",
                port: "4004",
                path: "apps/csv-xlsx-connector",
                color: "green",
              },
            ].map((c) => (
              <div
                key={c.name}
                className="p-3 rounded-lg border text-xs"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div
                  className="font-semibold"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {c.name} <Badge color={c.color}>:{c.port}</Badge>
                </div>
                <div
                  className="mt-1"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Build: <FileRef path={c.path} />
                </div>
              </div>
            ))}
          </div>

          <CmdBlock label="Connectors are bundled in full + no-mock">{`# Connectors ship in docker-compose.full.yml (demo, .env.demo)
# and docker-compose.no-mock.yml (real API, .env.prod).
# Set ENCRYPTION_SECRET to a strong random value for the SQL connectors.

# Vendor the shared SQL router into the SQL connectors (run from repo root):
npm run sync:shared

# Build a single connector image (each app is self-contained):
docker compose -f docker-compose.no-mock.yml build mssql-connector

# Or build the app directly (no dependency on the repo root):
docker build apps/csv-xlsx-connector

# Bring up the stack (connectors included):
docker compose -f docker-compose.no-mock.yml up --build -d`}</CmdBlock>

          <p
            className="text-xs mt-2"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            To exercise the SQL connectors against throwaway databases, start
            the sample DBs with{" "}
            <Code>docker compose -f docker-compose.sample-db.yml up -d</Code>{" "}
            (or <Code>npm run db:up</Code>).
          </p>
        </Section>

        {/* ── Environment Variables ── */}
        <Section id="env" title="Environment Variables Reference">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr
                  className="border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <th
                    className="text-left py-2 pr-3 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Variable
                  </th>
                  <th
                    className="text-left py-2 pr-3 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Required
                  </th>
                  <th
                    className="text-left py-2 font-semibold"
                    style={{ color: "hsl(var(--foreground))" }}
                  >
                    Description
                  </th>
                </tr>
              </thead>
              <tbody style={{ color: "hsl(var(--muted-foreground))" }}>
                {[
                  {
                    var: "ENGINE_PORT",
                    req: "Yes",
                    desc: "Engine listen port (default: 4001)",
                  },
                  {
                    var: "API_BASE_URL",
                    req: "Dev/Prod",
                    desc: "Tenant REST API base URL",
                  },
                  {
                    var: "USER_INFO_URL",
                    req: "Dev/Prod",
                    desc: "AD/SSO user info endpoint",
                  },
                  {
                    var: "ENGINE_API_KEY",
                    req: "Prod",
                    desc: "Secret key to protect admin API endpoints",
                  },
                  {
                    var: "ENGINE_URL",
                    req: "Auto",
                    desc: "Set by compose (http://engine:4001) — do not override",
                  },
                  {
                    var: "UI_ORIGIN",
                    req: "Auto",
                    desc: "Set by compose (http://ui:3001) — do not override",
                  },
                  {
                    var: "NODE_ENV",
                    req: "Auto",
                    desc: "Set to 'production' in all compose files",
                  },
                  {
                    var: "ENCRYPTION_SECRET",
                    req: "Connectors",
                    desc: "Encryption key for SQL connector credentials",
                  },
                  {
                    var: "PII_MASKING_DISABLED",
                    req: "No",
                    desc: "Set 'true' to bypass the PII pipeline globally — break-glass investigations only. Still audited.",
                  },
                  {
                    var: "QUERY_RESULT_CACHE_TTL_MS",
                    req: "No",
                    desc: "Per-query result cache TTL in ms (default 60_000). Lower = fresher data, more upstream load.",
                  },
                  {
                    var: "QUERY_RESULT_CACHE_MAX_ENTRIES",
                    req: "No",
                    desc: "LRU capacity for the per-query cache (default 500).",
                  },
                  {
                    var: "RATE_LIMIT_CHAT",
                    req: "No",
                    desc: "Per-IP /api/chat requests/min (default 1500). Hitting it returns RATE_LIMITED envelope.",
                  },
                  {
                    var: "RATE_LIMIT_ADMIN",
                    req: "No",
                    desc: "Per-IP /api/admin requests/min (default 200).",
                  },
                  {
                    var: "MAX_CONCURRENT_REQUESTS",
                    req: "No",
                    desc: "Concurrent NLP classifications cap (default 50). Backpressure under burst.",
                  },
                  {
                    var: "SESSION_TTL_MS",
                    req: "No",
                    desc: "Stale session eviction window (default 30 min). Sessions are scoped per groupId — no cross-group bleed.",
                  },
                ].map((row) => (
                  <tr
                    key={row.var}
                    className="border-b"
                    style={{ borderColor: "hsl(var(--border) / 0.5)" }}
                  >
                    <td className="py-2 pr-3 font-mono">{row.var}</td>
                    <td className="py-2 pr-3">{row.req}</td>
                    <td className="py-2">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InfoBox variant="info" title="Demo mode">
            In demo mode (<Code>docker-compose.full.yml</Code>), the bundled{" "}
            <Code>.env.demo</Code> holds no secrets and works out of the box.
            The Mock API provides data, and the engine uses a built-in mock user
            fallback.
          </InfoBox>
        </Section>

        {/* ── Management ── */}
        <Section id="manage" title="Container Management">
          <div className="space-y-1 mb-3">
            <CmdBlock label="View logs (all services)">{`docker compose -f <compose-file> logs -f`}</CmdBlock>
            <CmdBlock label="View logs (single service)">{`docker compose -f <compose-file> logs -f engine`}</CmdBlock>
            <CmdBlock label="Restart a single service">{`docker compose -f <compose-file> restart engine`}</CmdBlock>
            <CmdBlock label="Stop all containers">{`docker compose -f <compose-file> down`}</CmdBlock>
            <CmdBlock label="Rebuild after code changes">{`docker compose -f <compose-file> up --build -d`}</CmdBlock>
            <CmdBlock label="Full clean rebuild (remove images)">{`docker compose -f <compose-file> down --rmi all
docker compose -f <compose-file> up --build -d`}</CmdBlock>
          </div>

          <InfoBox
            variant="tip"
            title="Data persistence — what's inside /app/data"
          >
            The engine writes a handful of stateful sub-directories under{" "}
            <Code>/app/data/</Code>. Persist the whole tree with one volume
            mount: <Code>volumes: - ./engine-data:/app/data</Code>.
            <ul className="list-disc pl-5 mt-2 space-y-0.5 text-xs">
              <li>
                <Code>learning/&lt;group&gt;/</Code> — interactions, review
                queue, auto-learned utterances, signal aggregates, synonyms.
                Retraining merges these back into the NLP corpus on next init.
              </li>
              <li>
                <Code>schema/&lt;group&gt;/</Code> — last-known column set per
                query. Drift detector compares each result to the stored
                baseline.
              </li>
              <li>
                <Code>views/</Code> — shareable snapshots (one JSON per short
                id). Public-by-link in v1.
              </li>
              <li>
                <Code>audit/audit.jsonl</Code> — every mutation, PII clear view,
                schema-drift event, snapshot creation. Critical for compliance /
                forensics.
              </li>
              <li>
                <Code>logs/conversations.jsonl</Code>, <Code>sessions/</Code>,{" "}
                <Code>anomaly/&lt;group&gt;/</Code> — runtime state.
              </li>
              <li>
                <Code>preferences/</Code>, <Code>dashboards/</Code> — user-level
                customisation.
              </li>
            </ul>
            For a fresh, clean engine on every restart (e.g. ephemeral staging),
            skip the volume; the engine creates files as needed.
          </InfoBox>

          <InfoBox variant="info" title="Post-deploy smoke check">
            Once the stack is up, run the validation harness against the running
            URLs to confirm 100+ feature surfaces are healthy:
            <CmdBlock label="From the host (npm)">{`NEXT_URL=http://localhost:3001 \\
ENGINE_URL=http://localhost:4001 \\
MOCK_URL=http://localhost:8080 \\
npm run validate:demo`}</CmdBlock>
            Pass criteria: green report at <Code>docs/DEMO-VALIDATION.md</Code>{" "}
            with <Code>0 failures</Code>. Use <Code>--quick</Code> for a faster
            gate that skips slow chat chains, or <Code>--no-write</Code> in
            CSRF-locked environments.
          </InfoBox>

          <InfoBox variant="info" title="Log correlation">
            Every request gets an <Code>x-request-id</Code> UUID — generated by
            the tenant-context middleware if the caller doesn&apos;t supply one,
            returned as a response header, AND embedded in every error envelope
            as <Code>requestId</Code>. Forward this header from your load
            balancer / API gateway so a single ID traces one request across
            logs, audit entries, and UI errors. Production logging tools
            (Splunk, Datadog, Loki) should index on it.
          </InfoBox>
        </Section>

        {/* ── STOMP / Live Notifications ── */}
        <Section id="stomp" title="STOMP / Live Notifications (Optional)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Add STOMP environment variables to the env file your compose stack
            uses (<Code>.env.demo</Code> for full, <Code>.env.prod</Code> for
            ui-engine / no-mock) to enable real-time dashboard refresh:
          </p>
          <CmdBlock label=".env.demo or .env.prod">{`NEXT_PUBLIC_STOMP_BROKER_URL=ws://rabbitmq:15674/ws
NEXT_PUBLIC_STOMP_DESTINATION=/topic/notifications`}</CmdBlock>
          <InfoBox variant="tip" title="Per-environment switching">
            You can also configure STOMP settings in the browser via Admin →
            Settings → STOMP / Live. Browser settings override environment
            variables and persist in localStorage.
          </InfoBox>
        </Section>

        {/* ── Troubleshooting ── */}
        <Section id="trouble" title="Troubleshooting">
          <div className="space-y-2">
            <TroubleshootItem
              title="Container exits immediately"
              fix="Run 'docker compose -f <compose-file> logs <service>' to see the error. Common cause: missing .env.prod for ui-engine/no-mock (full uses .env.demo)."
            />
            <TroubleshootItem
              title="UI shows 'Cannot connect to engine'"
              fix="Ensure both containers are on the same Docker network (compose handles this automatically). Check ENGINE_URL is set to http://engine:4001 (container name, not localhost)."
            />
            <TroubleshootItem
              title="Port already in use"
              fix="Another process is using 3001, 4001, or 8080. Stop it or override the host port via env vars (UI_HOST_PORT, ENGINE_HOST_PORT, MOCK_HOST_PORT, MSSQL_HOST_PORT, etc.), e.g. 'UI_HOST_PORT=3002 docker compose -f docker-compose.full.yml up -d'."
            />
            <TroubleshootItem
              title="Docker build fails on npm ci"
              fix="Check network connectivity. If behind a proxy, configure Docker daemon proxy settings. Try: docker compose build --no-cache"
            />
            <TroubleshootItem
              title="Mock API shows no data"
              fix="The mock-api container runs 'npm ci' on first start. Wait 10-20 seconds, then refresh. Check logs: docker compose -f docker-compose.full.yml logs mock-api"
            />
            <TroubleshootItem
              title="Changes not reflected after rebuild"
              fix="Docker layer caching may serve old code. Use: docker compose -f <compose-file> up --build --force-recreate -d"
            />
          </div>
        </Section>
      </CardContainer>
    </div>
  );
}
