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
  { id: "demo", label: "Demo / Mock" },
  { id: "dev", label: "Dev (Real APIs)" },
  { id: "prod", label: "Production" },
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
        description="Run the chatbot platform with Docker Compose — Demo, Dev, and Production environments"
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
            Docker Compose orchestrates either 2 or 3 containers depending on
            the environment. Each compose file targets a specific deployment
            scenario.
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

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {
                file: "docker-compose.yml",
                env: "Demo",
                services: "UI + Engine + Mock API",
                color: "bg-green-50 border-green-200 text-green-700",
              },
              {
                file: "docker-compose.dev.yml",
                env: "Dev",
                services: "UI + Engine (real APIs)",
                color: "bg-blue-50 border-blue-200 text-blue-700",
              },
              {
                file: "docker-compose.prod.yml",
                env: "Production",
                services: "UI + Engine (hardened)",
                color: "bg-red-50 border-red-200 text-red-700",
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

        {/* ── Demo / Mock ── */}
        <Section id="demo" title="Environment 1 — Demo / Mock">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Runs all 3 services with a built-in Mock API that provides sample
            data. No external APIs or databases needed — ideal for evaluation,
            demos, and local development.
          </p>

          <div className="space-y-1 mb-3">
            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 1 — Build and start
            </div>
            <CmdBlock>{`docker compose up --build -d`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 2 — Verify all containers are running
            </div>
            <CmdBlock>{`docker compose ps

# Expected:  3 containers (ui, engine, mock-api) — all "Up"`}</CmdBlock>

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
              Compose file: <FileRef path="docker-compose.yml" />
            </div>
            <div style={{ color: "hsl(var(--muted-foreground))" }}>
              Services: <Badge color="green">UI :3001</Badge>{" "}
              <Badge color="blue">Engine :4001</Badge>{" "}
              <Badge color="purple">Mock API :8080</Badge>
            </div>
          </div>
        </Section>

        {/* ── Dev (Real APIs) ── */}
        <Section id="dev" title="Environment 2 — Dev (Real APIs)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Connects to your real tenant APIs and authentication — no Mock API.
            Use this to validate the chatbot against your actual data endpoints
            before going to production.
          </p>

          <div className="space-y-1 mb-3">
            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 1 — Create <Code>.env.dev</Code> from template
            </div>
            <CmdBlock>{`cp .env.example .env.dev
# Edit .env.dev with your real values`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 2 — Required variables in .env.dev
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
            <CmdBlock>{`docker compose -f docker-compose.dev.yml up --build -d`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 4 — Verify
            </div>
            <CmdBlock>{`docker compose -f docker-compose.dev.yml ps

# Expected:  2 containers (ui, engine) — all "Up"
# No mock-api — real APIs provide data`}</CmdBlock>
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
              Compose file: <FileRef path="docker-compose.dev.yml" />
            </div>
            <div style={{ color: "hsl(var(--muted-foreground))" }}>
              Env file: <FileRef path=".env.dev" /> | Services:{" "}
              <Badge color="green">UI :3001</Badge>{" "}
              <Badge color="blue">Engine :4001</Badge>
            </div>
          </div>
        </Section>

        {/* ── Production ── */}
        <Section id="prod" title="Environment 3 — Production">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Production-hardened deployment with real APIs, authentication, and
            API key protection. Same 2-container setup as Dev but with stricter
            environment configuration.
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
# ENCRYPTION_SECRET=change-me-in-production`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 3 — Build and start
            </div>
            <CmdBlock>{`docker compose -f docker-compose.prod.yml up --build -d`}</CmdBlock>

            <div
              className="text-[10px] font-medium"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Step 4 — Verify health
            </div>
            <CmdBlock>{`# Check containers
docker compose -f docker-compose.prod.yml ps

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
              Compose file: <FileRef path="docker-compose.prod.yml" />
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
            The platform includes optional no-code SQL connector services for
            MSSQL and Oracle. Uncomment them in any compose file to enable
            direct database queries.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              {
                name: "MSSQL Connector",
                port: "4002",
                path: "services/mssql-connector",
                color: "blue",
              },
              {
                name: "Oracle Connector",
                port: "4003",
                path: "services/oracle-connector",
                color: "orange",
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

          <CmdBlock label="Enable in compose file (uncomment the service block)">{`# In docker-compose.yml, docker-compose.dev.yml, or docker-compose.prod.yml:
# Uncomment the mssql-connector and/or oracle-connector service blocks
# Set ENCRYPTION_SECRET to a strong random value

# Then rebuild:
docker compose -f <your-compose-file> up --build -d`}</CmdBlock>
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
            In demo mode (<Code>docker-compose.yml</Code>), no env file is
            needed. The Mock API provides data, and the engine uses a built-in
            mock user fallback.
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

          <InfoBox variant="tip" title="Data persistence">
            Learning data, anomaly baselines, and conversation logs are stored
            inside the engine container at <Code>/app/data/</Code>. To persist
            across rebuilds, add a volume mount:{" "}
            <Code>volumes: - ./engine-data:/app/data</Code>
          </InfoBox>
        </Section>

        {/* ── STOMP / Live Notifications ── */}
        <Section id="stomp" title="STOMP / Live Notifications (Optional)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Add STOMP environment variables to your Docker Compose override or{" "}
            <Code>.env</Code> file to enable real-time dashboard refresh:
          </p>
          <CmdBlock label="docker-compose.override.yml or .env">{`NEXT_PUBLIC_STOMP_BROKER_URL=ws://rabbitmq:15674/ws
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
              fix="Run 'docker compose logs <service>' to see the error. Common cause: missing .env file for dev/prod compose files."
            />
            <TroubleshootItem
              title="UI shows 'Cannot connect to engine'"
              fix="Ensure both containers are on the same Docker network (compose handles this automatically). Check ENGINE_URL is set to http://engine:4001 (container name, not localhost)."
            />
            <TroubleshootItem
              title="Port already in use"
              fix="Another process is using 3001, 4001, or 8080. Stop it or change the host port in the compose file (e.g., '3002:3001')."
            />
            <TroubleshootItem
              title="Docker build fails on npm ci"
              fix="Check network connectivity. If behind a proxy, configure Docker daemon proxy settings. Try: docker compose build --no-cache"
            />
            <TroubleshootItem
              title="Mock API shows no data"
              fix="The mock-api container runs 'npm install' on first start. Wait 10-20 seconds, then refresh. Check logs: docker compose logs mock-api"
            />
            <TroubleshootItem
              title="Changes not reflected after rebuild"
              fix="Docker layer caching may serve old code. Use: docker compose up --build --force-recreate -d"
            />
          </div>
        </Section>
      </CardContainer>
    </div>
  );
}
