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
} from "../components";

const SECTIONS = [
  { id: "arch", label: "Architecture" },
  { id: "why-proxy", label: "Why Reverse Proxy?" },
  { id: "prereqs", label: "Prerequisites" },
  { id: "install", label: "Install & Build" },
  { id: "env", label: "Environment" },
  { id: "nssm", label: "NSSM Services" },
  { id: "iis", label: "IIS Reverse Proxy" },
  { id: "ssl", label: "SSL & Firewall" },
  { id: "auth", label: "Authentication" },
  { id: "manage", label: "Management" },
  { id: "trouble", label: "Troubleshooting" },
];

export default function WindowsSetupGuidePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <GuideHeader
        title="Windows Host Setup Guide"
        description="Deploy the chatbot platform on Windows Server — NSSM services + IIS reverse proxy (no managed code)"
        badgeColor="orange"
        badgeText="Admins & DevOps"
      />

      <QuickNav sections={SECTIONS} />

      <CardContainer>
        {/* Architecture Overview */}
        <Section id="arch" title="Architecture Overview">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            All Node.js services run as native Windows services via{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>NSSM</strong>.
            IIS acts as a pure reverse proxy — no managed code, no iisnode.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`Browser (HTTPS)
    │
    ▼
┌──────────────────────────────┐
│  IIS (port 80/443)           │   ← Reverse proxy only (URL Rewrite + ARR)
│  No managed code pipeline    │   ← SSL termination, Windows Auth
└──────────┬───────────────────┘
           │ HTTP
           ▼
┌──────────────────────────────┐
│  ChatbotUI (port 3001)       │   ← NSSM service — Next.js standalone
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  ChatbotEngine (port 4001)   │   ← NSSM service — Express + NLP + ML
└──────────┬───────────────────┘
           │ (optional)
     ┌─────┴──────┐
     ▼            ▼
 MSSQL          Oracle         ← NSSM services (optional — no-code SQL APIs)
 (4002)         (4003)`}
            </pre>
          </div>

          <div
            className="p-3 rounded-lg border text-xs"
            style={{
              backgroundColor: "hsl(var(--primary) / 0.05)",
              borderColor: "hsl(var(--primary) / 0.2)",
              color: "hsl(var(--foreground))",
            }}
          >
            <span className="font-semibold">Key principle:</span> IIS handles
            only SSL termination and reverse proxying. All application logic
            runs in Node.js processes managed by NSSM with auto-restart, log
            rotation, and dependency ordering.
          </div>
        </Section>

        {/* Why Reverse Proxy? */}
        <Section id="why-proxy" title="Why Do We Need a Reverse Proxy?">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Node.js should{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              never be exposed directly
            </strong>{" "}
            to the internet. A reverse proxy (IIS on Windows, Nginx on Linux)
            sits in front of Node.js and handles everything the browser expects
            from a production server.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`WITHOUT reverse proxy (insecure):
  Browser ──→ Node.js UI :3001    ← No SSL, no caching, port exposed
                                     No security headers, single-threaded

WITH reverse proxy (production):
  Browser ──→ IIS :443 ──→ Node.js UI :3001
                 ↑
          SSL termination
          Security headers
          Static asset caching
          Clean URL (port 443, not 3001)
          Windows Authentication
          Request buffering`}
            </pre>
          </div>

          <div
            className="text-sm font-semibold mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            What the reverse proxy provides
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              {
                title: "SSL/TLS Termination",
                desc: "Handles HTTPS encryption so Node.js doesn't have to. Browsers see a trusted certificate.",
              },
              {
                title: "Security Headers",
                desc: "Adds X-Content-Type-Options, X-Frame-Options, X-XSS-Protection automatically to every response.",
              },
              {
                title: "Static Asset Caching",
                desc: "Caches Next.js JS/CSS bundles (/_next/static/) for 1 year — reduces server load dramatically.",
              },
              {
                title: "Clean URLs",
                desc: "Users access port 80/443 (standard HTTP/HTTPS) instead of port 3001. No port in the URL.",
              },
              {
                title: "Request Buffering",
                desc: "Buffers slow client connections so Node.js threads aren't tied up waiting for data.",
              },
              {
                title: "Windows Auth (IIS)",
                desc: "IIS can handle Kerberos/NTLM authentication natively and pass AD identity to the app.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-2.5 rounded-lg border"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.2)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {item.title}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>

          <div
            className="p-3 rounded-lg border text-xs"
            style={{
              backgroundColor: "hsl(var(--primary) / 0.05)",
              borderColor: "hsl(var(--primary) / 0.2)",
              color: "hsl(var(--foreground))",
            }}
          >
            <span className="font-semibold">How it works in this project:</span>{" "}
            IIS proxies all traffic to the UI on port 3001. The UI internally
            routes <Code>/api/*</Code> requests to the Engine on port 4001 via{" "}
            <Code>next.config.mjs</Code> rewrites. IIS only needs to know about
            port 3001 — it never talks to the Engine directly.
          </div>
        </Section>

        {/* Prerequisites */}
        <Section id="prereqs" title="Prerequisites">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              {
                name: "Windows Server",
                desc: "2016 or later, or Windows 10/11",
              },
              {
                name: "IIS",
                desc: "With URL Rewrite & ARR modules",
              },
              {
                name: "Node.js 18+",
                desc: "Windows installer from nodejs.org",
              },
              {
                name: "NSSM",
                desc: "nssm.cc — copy nssm.exe to C:\\nssm\\",
              },
              { name: "Git for Windows", desc: "git-scm.com" },
            ].map((item) => (
              <div
                key={item.name}
                className="p-3 rounded-lg"
                style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
              >
                <div
                  className="font-medium"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {item.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-3 p-3 rounded-lg border text-xs"
            style={{
              backgroundColor: "hsl(var(--muted) / 0.3)",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <span
              className="font-medium"
              style={{ color: "hsl(var(--foreground))" }}
            >
              NSSM setup:
            </span>{" "}
            Download from{" "}
            <a
              href="https://nssm.cc/download"
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              nssm.cc/download
            </a>
            , extract <Code>nssm.exe</Code> (64-bit) to <Code>C:\nssm\</Code>{" "}
            and add to your system PATH.
          </div>
        </Section>

        {/* Install & Build */}
        <Section id="install" title="1. Clone and Build">
          <CmdBlock label="PowerShell (Run as Administrator)">{`# Clone repository
git clone <repo-url> C:\\Chatbot
cd C:\\Chatbot

# Install dependencies
npm install
cd services\\engine && npm install && cd ..\\..
cd services\\mock-api && npm install && cd ..\\..

# Build UI + Engine in one step
npm run build:prod

# Copy static assets for standalone mode
xcopy /E /I public .next\\standalone\\public
xcopy /E /I .next\\static .next\\standalone\\.next\\static`}</CmdBlock>

          <div
            className="p-3 rounded-lg border text-xs"
            style={{
              backgroundColor: "hsl(var(--muted) / 0.3)",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <span
              className="font-medium"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Optional — SQL Connectors:
            </span>{" "}
            Only install if you need no-code SQL APIs for MSSQL or Oracle
            databases.
          </div>
          <CmdBlock label="PowerShell — Optional SQL connectors">{`# MSSQL Connector (optional)
cd services\\mssql-connector && npm install && cd ..\\..

# Oracle Connector (optional — requires Oracle Instant Client)
cd services\\oracle-connector && npm install && cd ..\\..`}</CmdBlock>
        </Section>

        {/* Environment Configuration */}
        <Section id="env" title="2. Configure Environment">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Choose your deployment mode. Copy from <Code>.env.example</Code> and
            edit your values.
          </p>

          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">Demo Mode</Badge>
                <span className="text-xs text-gray-500">
                  Mock data, no real APIs needed
                </span>
              </div>
              <CmdBlock label="PowerShell">{`copy .env.example .env.mock
# Defaults work out of the box for demo`}</CmdBlock>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="blue">Dev Mode</Badge>
                <span className="text-xs text-gray-500">
                  Real APIs and AD/SSO auth
                </span>
              </div>
              <CmdBlock label="PowerShell">{`copy .env.example .env.dev
# Edit .env.dev:
# NODE_ENV=development
# ENGINE_URL=http://localhost:4001
# API_BASE_URL=https://api-dev.your-company.com/api
# API_TOKEN=your-dev-api-token
# USER_INFO_URL=https://sso.your-company.com/api/userinfo`}</CmdBlock>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="red">Production Mode</Badge>
                <span className="text-xs text-gray-500">
                  All real endpoints, secured
                </span>
              </div>
              <CmdBlock label="PowerShell">{`copy .env.example .env.prod
# Edit .env.prod:
# NODE_ENV=production
# ENGINE_URL=http://localhost:4001
# API_BASE_URL=https://api.your-company.com/api
# API_TOKEN=your-prod-api-token
# ENGINE_API_KEY=your-secure-engine-key
# USER_INFO_URL=https://sso.your-company.com/api/userinfo
# UI_ORIGIN=https://chatbot.your-company.com
# FILE_BASE_DIR=\\\\server\\shared\\reports`}</CmdBlock>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mt-3">
            <span className="font-medium">Alternative:</span> Set system-wide
            env vars via PowerShell instead of .env files. NSSM can also set
            per-service environment variables (see install script).
          </div>
        </Section>

        {/* NSSM Service Setup */}
        <Section id="nssm" title="3. Install Services with NSSM">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Download{" "}
            <a
              href="https://nssm.cc/download"
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              NSSM
            </a>{" "}
            (or obtain from your firm&apos;s internal repo) and ensure{" "}
            <Code>nssm.exe</Code> is on your system PATH.
          </p>

          <CmdBlock label="PowerShell (Run as Administrator) — Install Engine">{`# Install ChatbotEngine service
nssm install ChatbotEngine "C:\\Program Files\\nodejs\\node.exe"
nssm set ChatbotEngine AppParameters "dist\\server.js"
nssm set ChatbotEngine AppDirectory "C:\\Chatbot\\services\\engine"
nssm set ChatbotEngine AppEnvironmentExtra ^
    NODE_ENV=production ^
    ENGINE_PORT=4001 ^
    API_BASE_URL=http://localhost:8080/api ^
    UI_ORIGIN=http://localhost:3001

# Logging & restart policy
nssm set ChatbotEngine AppStdout "C:\\Chatbot\\data\\logs\\engine-stdout.log"
nssm set ChatbotEngine AppStderr "C:\\Chatbot\\data\\logs\\engine-stderr.log"
nssm set ChatbotEngine AppRotateFiles 1
nssm set ChatbotEngine AppRotateBytes 10485760
nssm set ChatbotEngine AppExit Default Restart
nssm set ChatbotEngine AppRestartDelay 3000`}</CmdBlock>

          <CmdBlock label="PowerShell — Install UI">{`# Install ChatbotUI service (depends on Engine)
nssm install ChatbotUI "C:\\Program Files\\nodejs\\node.exe"
nssm set ChatbotUI AppParameters ".next\\standalone\\server.js"
nssm set ChatbotUI AppDirectory "C:\\Chatbot"
nssm set ChatbotUI AppEnvironmentExtra ^
    NODE_ENV=production ^
    PORT=3001 ^
    ENGINE_URL=http://localhost:4001
nssm set ChatbotUI DependOnService ChatbotEngine

# Logging & restart policy
nssm set ChatbotUI AppStdout "C:\\Chatbot\\data\\logs\\ui-stdout.log"
nssm set ChatbotUI AppStderr "C:\\Chatbot\\data\\logs\\ui-stderr.log"
nssm set ChatbotUI AppRotateFiles 1
nssm set ChatbotUI AppExit Default Restart`}</CmdBlock>

          <CmdBlock label="PowerShell — Install Mock API (demo only)">{`# Install ChatbotMockAPI (optional — demo mode only)
nssm install ChatbotMockAPI "C:\\Program Files\\nodejs\\node.exe"
nssm set ChatbotMockAPI AppParameters "server.js"
nssm set ChatbotMockAPI AppDirectory "C:\\Chatbot\\services\\mock-api"
nssm set ChatbotMockAPI AppStdout "C:\\Chatbot\\data\\logs\\mock-api-stdout.log"
nssm set ChatbotMockAPI AppStderr "C:\\Chatbot\\data\\logs\\mock-api-stderr.log"
nssm set ChatbotMockAPI AppExit Default Restart`}</CmdBlock>

          <CmdBlock label="PowerShell — Start all services">{`# Create log directory
mkdir C:\\Chatbot\\data\\logs

# Start services
nssm start ChatbotMockAPI   # demo only
nssm start ChatbotEngine
nssm start ChatbotUI`}</CmdBlock>

          <div
            className="text-sm font-medium mb-2 mt-4"
            style={{ color: "hsl(var(--foreground))" }}
          >
            What the installer configures per service:
          </div>
          <div className="overflow-x-auto mb-3">
            <table
              className="w-full text-xs border rounded"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <thead>
                <tr style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
                  <th
                    className="px-3 py-2 text-left font-medium border-b"
                    style={{
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    Service
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium border-b"
                    style={{
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    Port
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium border-b"
                    style={{
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    Features
                  </th>
                </tr>
              </thead>
              <tbody style={{ color: "hsl(var(--foreground))" }}>
                <tr
                  style={{ borderColor: "hsl(var(--border))" }}
                  className="border-b"
                >
                  <td className="px-3 py-2 font-medium">ChatbotEngine</td>
                  <td className="px-3 py-2">4001</td>
                  <td className="px-3 py-2">
                    Auto-restart, log rotation (10 MB / 24h), env vars, graceful
                    shutdown (Ctrl+C, 10s timeout)
                  </td>
                </tr>
                <tr
                  style={{ borderColor: "hsl(var(--border))" }}
                  className="border-b"
                >
                  <td className="px-3 py-2 font-medium">ChatbotUI</td>
                  <td className="px-3 py-2">3001</td>
                  <td className="px-3 py-2">
                    Depends on ChatbotEngine, auto-restart, log rotation
                  </td>
                </tr>
                <tr
                  style={{ borderColor: "hsl(var(--border))" }}
                  className="border-b"
                >
                  <td className="px-3 py-2 font-medium">
                    ChatbotMockAPI{" "}
                    <span
                      className="text-[10px]"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      (demo only)
                    </span>
                  </td>
                  <td className="px-3 py-2">8080</td>
                  <td className="px-3 py-2">Auto-restart, log rotation</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mt-3">
            <span className="font-semibold">Optional — SQL Connectors:</span>{" "}
            Deploy only if you need no-code SQL APIs. Add NSSM services
            manually:
          </div>
          <CmdBlock label="PowerShell — Optional MSSQL & Oracle connectors">{`# MSSQL Connector (optional)
nssm install ChatbotMSSQL "C:\\Program Files\\nodejs\\node.exe"
nssm set ChatbotMSSQL AppParameters "dist\\server.js"
nssm set ChatbotMSSQL AppDirectory "C:\\Chatbot\\services\\mssql-connector"
nssm set ChatbotMSSQL AppEnvironmentExtra MSSQL_PORT=4002 ENCRYPTION_SECRET=your-key
nssm start ChatbotMSSQL

# Oracle Connector (optional — requires Oracle Instant Client)
nssm install ChatbotOracle "C:\\Program Files\\nodejs\\node.exe"
nssm set ChatbotOracle AppParameters "dist\\server.js"
nssm set ChatbotOracle AppDirectory "C:\\Chatbot\\services\\oracle-connector"
nssm set ChatbotOracle AppEnvironmentExtra ORACLE_PORT=4003 ENCRYPTION_SECRET=your-key
nssm start ChatbotOracle`}</CmdBlock>
        </Section>

        {/* IIS Reverse Proxy */}
        <Section id="iis" title="4. Configure IIS Reverse Proxy">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            IIS acts as a{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              pure reverse proxy
            </strong>{" "}
            — no managed code, no .NET, no iisnode. It uses two modules to
            forward requests to Node.js:
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="p-2.5 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "hsl(var(--foreground))" }}
              >
                URL Rewrite Module
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Defines <em>which</em> requests get forwarded. Uses pattern
                rules in <Code>web.config</Code> to match URLs and rewrite them
                to <Code>http://localhost:3001</Code>.
              </div>
            </div>
            <div
              className="p-2.5 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Application Request Routing (ARR)
              </div>
              <div
                className="text-xs mt-0.5"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                The actual proxy engine. Receives the rewritten URL from URL
                Rewrite and makes the HTTP call to Node.js on your behalf.
              </div>
            </div>
          </div>

          {/* Step-by-step */}
          <div
            className="text-sm font-semibold mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Step-by-Step Setup
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Step 1 &mdash; Enable IIS
              </div>
              <CmdBlock label="PowerShell (Run as Administrator)">{`# Enable IIS web server role
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering`}</CmdBlock>
            </div>

            {/* Step 2 */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Step 2 &mdash; Install URL Rewrite + ARR modules
              </div>
              <p
                className="text-xs mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Download and install both from the official Microsoft IIS
                extensions site (or your firm&apos;s internal repo):
              </p>
              <div
                className="space-y-1 text-xs pl-3 mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                <div>
                  1. <strong>URL Rewrite Module 2.1</strong> — defines routing
                  rules
                </div>
                <div>
                  2. <strong>Application Request Routing (ARR) 3.0</strong> —
                  the proxy engine
                </div>
              </div>
              <p
                className="text-xs"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                After installing, restart IIS: <Code>iisreset</Code>
              </p>
            </div>

            {/* Step 3 */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Step 3 &mdash; Enable ARR Proxy
              </div>
              <p
                className="text-xs mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                ARR is installed but disabled by default. You must enable it:
              </p>
              <div
                className="space-y-1 text-xs pl-3"
                style={{ color: "hsl(var(--foreground))" }}
              >
                <div>
                  1. Open <strong>IIS Manager</strong>
                </div>
                <div>
                  2. Click the <strong>server node</strong> (top level, not a
                  site)
                </div>
                <div>
                  3. Double-click{" "}
                  <strong>Application Request Routing Cache</strong>
                </div>
                <div>
                  4. Click <strong>Server Proxy Settings</strong> in the right
                  panel
                </div>
                <div>
                  5. Check <strong>Enable proxy</strong> &rarr; click{" "}
                  <strong>Apply</strong>
                </div>
              </div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 mt-2">
                If you skip this step, you&apos;ll get <strong>HTTP 404</strong>{" "}
                errors — IIS will try to serve files from disk instead of
                proxying to Node.js.
              </div>
            </div>

            {/* Step 4 */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Step 4 &mdash; Create IIS Site + Copy web.config
              </div>
              <p
                className="text-xs mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Create a new IIS site pointing to an empty folder. The site only
                needs <FileRef path="web.config" /> — no application code lives
                here.
              </p>
              <CmdBlock label="PowerShell (Administrator)">{`# Create site directory
mkdir C:\\inetpub\\chatbot

# Copy web.config from project root
copy C:\\Chatbot\\web.config C:\\inetpub\\chatbot\\web.config

# Create IIS site via PowerShell (or use IIS Manager GUI)
Import-Module WebAdministration
New-Website -Name "Chatbot" -PhysicalPath "C:\\inetpub\\chatbot" -Port 80`}</CmdBlock>
            </div>

            {/* Step 5 */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Step 5 &mdash; Set Application Pool to No Managed Code
              </div>
              <p
                className="text-xs mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Since IIS is only proxying (not running .NET), disable the
                managed code pipeline:
              </p>
              <div
                className="space-y-1 text-xs pl-3"
                style={{ color: "hsl(var(--foreground))" }}
              >
                <div>
                  1. In IIS Manager, go to <strong>Application Pools</strong>
                </div>
                <div>2. Select the pool used by the Chatbot site</div>
                <div>
                  3. Click <strong>Basic Settings</strong>
                </div>
                <div>
                  4. Set <strong>.NET CLR version</strong> to{" "}
                  <Code>No Managed Code</Code>
                </div>
                <div>
                  5. Set <strong>Managed pipeline mode</strong> to{" "}
                  <Code>Integrated</Code>
                </div>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 mt-2">
                <strong>Why No Managed Code?</strong> We&apos;re not running
                ASP.NET — IIS is just forwarding HTTP requests. Setting this
                avoids loading the .NET runtime unnecessarily and prevents
                pipeline conflicts.
              </div>
            </div>

            {/* Step 6 */}
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "hsl(var(--muted) / 0.2)",
                borderColor: "hsl(var(--border))",
              }}
            >
              <div
                className="text-xs font-semibold mb-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Step 6 &mdash; Verify it works
              </div>
              <CmdBlock>{`# Ensure UI service is running
nssm status ChatbotUI

# Test from the server itself
curl http://localhost
# Or open browser: http://localhost

# You should see the chatbot UI
# If using HTTPS binding: https://chatbot.your-company.com`}</CmdBlock>
            </div>
          </div>

          {/* web.config explanation */}
          <div
            className="text-sm font-semibold mt-6 mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            What web.config Does
          </div>
          <p
            className="text-xs mb-2"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            The project includes a ready-to-use <FileRef path="web.config" /> in
            the project root. Here&apos;s what each section does:
          </p>
          <CmdBlock label="web.config — annotated">{`<configuration>
  <system.webServer>
    <!-- Clear all managed code handlers — we don't run .NET -->
    <handlers>
      <clear />
      <add name="StaticFile" path="*" verb="*" ... />
    </handlers>

    <!-- URL Rewrite: forward ALL requests to Node.js -->
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url="(.*)" />            <!-- Match every URL -->
          <conditions>
            <!-- Skip if a physical file exists in the folder -->
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <!-- Rewrite to Node.js UI on port 3001 -->
          <action type="Rewrite" url="http://localhost:3001/{R:1}" />
        </rule>
      </rules>
    </rewrite>

    <!-- WebSocket support (needed for Next.js HMR in dev) -->
    <webSocket enabled="true" />

    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>`}</CmdBlock>

          {/* HTTP vs HTTPS */}
          <div
            className="text-sm font-semibold mt-6 mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            HTTP-Only vs HTTPS
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="orange">HTTP Only</Badge>
                <span className="text-xs text-gray-500">
                  Quick testing / internal
                </span>
              </div>
              <p className="text-xs text-amber-800">
                Create the IIS site with a port 80 binding only. Skip SSL
                certificate setup. Good for verifying the proxy works before
                adding HTTPS.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">HTTPS (recommended)</Badge>
                <span className="text-xs text-gray-500">Production</span>
              </div>
              <p className="text-xs text-green-800">
                Add an HTTPS (443) binding to the site with your SSL certificate
                (see Section 5 below). Optionally add an HTTP &rarr; HTTPS
                redirect rule in web.config.
              </p>
            </div>
          </div>

          {/* Common IIS Issues */}
          <div
            className="text-sm font-semibold mt-6 mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Common IIS Issues
          </div>
          <div className="space-y-2">
            {[
              {
                title: "502.3 Bad Gateway",
                fix: "Node.js isn't running or isn't on port 3001. Check: nssm status ChatbotUI and netstat -ano | findstr :3001. Also verify web.config points to localhost:3001.",
              },
              {
                title: "404 Not Found (ARR not enabled)",
                fix: "ARR proxy is not turned on. Go to IIS Manager → Server node → Application Request Routing → Server Proxy Settings → check 'Enable proxy' → Apply.",
              },
              {
                title: "500 Internal Server Error on first request",
                fix: "URL Rewrite module not installed, or web.config has a syntax error. Reinstall URL Rewrite 2.1 and check web.config XML is valid.",
              },
              {
                title: "App Pool crashes immediately",
                fix: "App Pool is set to run managed code but web.config clears handlers. Set .NET CLR version to 'No Managed Code' in Application Pool Basic Settings.",
              },
              {
                title: "WebSocket connections fail",
                fix: 'Enable the WebSocket Protocol feature: Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebSockets. Then ensure <webSocket enabled="true" /> is in web.config.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-2.5 rounded-lg border"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {item.title}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.fix}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mt-4">
            <span className="font-semibold">Tip:</span> Test with HTTP first
            (port 80 binding only). Once you see the chatbot UI loading, add
            your HTTPS binding and SSL certificate in Section 5.
          </div>
        </Section>

        {/* SSL & Firewall */}
        <Section id="ssl" title="5. SSL Certificate & Firewall">
          <div
            className="text-xs font-semibold mb-1"
            style={{ color: "hsl(var(--foreground))" }}
          >
            SSL Certificate
          </div>
          <CmdBlock label="PowerShell">{`# Import a PFX certificate
Import-PfxCertificate -FilePath C:\\certs\\chatbot.pfx \\
  -CertStoreLocation Cert:\\LocalMachine\\My \\
  -Password (ConvertTo-SecureString -String "cert-password" -Force -AsPlainText)

# Or create a self-signed cert for testing
New-SelfSignedCertificate -DnsName "chatbot.corp.com" \\
  -CertStoreLocation Cert:\\LocalMachine\\My`}</CmdBlock>

          <p
            className="text-xs mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            In IIS Manager: select your site &rarr; Bindings &rarr; Add HTTPS
            (443) &rarr; select the certificate.
          </p>

          <div
            className="text-xs font-semibold mb-1 mt-4"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Windows Firewall
          </div>
          <CmdBlock label="PowerShell (Administrator)">{`# Allow IIS ports only — internal service ports stay local
New-NetFirewallRule -DisplayName "Chatbot HTTP" \\
  -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Chatbot HTTPS" \\
  -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Do NOT expose ports 3001, 4001, 4002, 4003 externally
# They are accessed only via IIS reverse proxy on localhost`}</CmdBlock>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mt-3">
            <span className="font-medium">Security:</span> Only expose IIS ports
            (80/443) through the firewall. Internal service ports (3001, 4001,
            etc.) should remain accessible only on localhost.
          </div>
        </Section>

        {/* Authentication */}
        <Section id="auth" title="6. Per-Query Authentication">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Each query can use a different authentication method. Configure per
            query in Admin &rarr; Groups &rarr; Queries.
          </p>
          <div className="overflow-x-auto mb-3">
            <table
              className="w-full text-xs border rounded"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <thead>
                <tr style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
                  <th
                    className="px-3 py-2 text-left font-medium border-b"
                    style={{
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    Auth Type
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium border-b"
                    style={{
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    How It Works
                  </th>
                  <th
                    className="px-3 py-2 text-left font-medium border-b"
                    style={{
                      color: "hsl(var(--muted-foreground))",
                      borderColor: "hsl(var(--border))",
                    }}
                  >
                    Windows Setup
                  </th>
                </tr>
              </thead>
              <tbody style={{ color: "hsl(var(--foreground))" }}>
                <tr
                  className="border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <td className="px-3 py-2">
                    <Badge color="green">none</Badge>
                  </td>
                  <td className="px-3 py-2">No auth headers — open API</td>
                  <td className="px-3 py-2">No setup needed</td>
                </tr>
                <tr
                  className="border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <td className="px-3 py-2">
                    <Badge color="blue">bearer</Badge>
                  </td>
                  <td className="px-3 py-2">
                    Global <Code>API_TOKEN</Code> sent as Bearer header
                  </td>
                  <td className="px-3 py-2">
                    Set <Code>API_TOKEN</Code> in env file
                  </td>
                </tr>
                <tr
                  className="border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <td className="px-3 py-2">
                    <Badge color="purple">windows</Badge>
                  </td>
                  <td className="px-3 py-2">
                    Forwards user&apos;s AD credentials
                  </td>
                  <td className="px-3 py-2">
                    Enable Windows Auth in IIS (see below)
                  </td>
                </tr>
                <tr
                  className="border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <td className="px-3 py-2">
                    <Badge color="red">bam</Badge>
                  </td>
                  <td className="px-3 py-2">
                    Calls BAM URL &rarr; token &rarr; X-BAM-Token header
                  </td>
                  <td className="px-3 py-2">
                    Set <Code>bamTokenUrl</Code> per query in Admin
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            className="text-xs font-semibold mb-1"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Windows Authentication Setup (for{" "}
            <Code>authType: &quot;windows&quot;</Code>)
          </div>
          <CmdBlock label="PowerShell (Administrator)">{`# Enable Windows Auth feature in IIS
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WindowsAuthentication

# In IIS Manager:
# 1. Select your site → Authentication
# 2. Enable "Windows Authentication"
# 3. Keep "Anonymous Authentication" enabled (required for static assets)
# 4. The Engine forwards AD credentials to tenant APIs automatically`}</CmdBlock>

          <div
            className="rounded-lg p-3 text-xs mt-3"
            style={{
              backgroundColor: "hsl(var(--muted) / 0.3)",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <div
              className="font-medium mb-1"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Windows Auth Flow:
            </div>
            <pre className="font-mono text-[10px]">{`User (AD login) → Browser → IIS (Windows Auth) → UI (:3001) → Engine (:4001)
  → Engine forwards user's cookies/Authorization header → Tenant API`}</pre>
          </div>
        </Section>

        {/* Service Management */}
        <Section id="manage" title="7. Service Management">
          <CmdBlock label="PowerShell — Service commands">{`# Check service status
nssm status ChatbotEngine
nssm status ChatbotUI
nssm status ChatbotMockAPI

# Restart services
nssm restart ChatbotEngine
nssm stop ChatbotUI && nssm start ChatbotUI

# View logs (real-time)
Get-Content C:\\Chatbot\\data\\logs\\engine-stderr.log -Wait -Tail 50
Get-Content C:\\Chatbot\\data\\logs\\ui-stderr.log -Wait -Tail 50

# Check via Windows Services (services.msc)
# Services appear as: ChatbotEngine, ChatbotUI, ChatbotMockAPI

# Edit service config (opens NSSM GUI)
nssm edit ChatbotEngine`}</CmdBlock>

          <div
            className="text-sm font-medium mb-2 mt-4"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Updating the Application
          </div>
          <CmdBlock label="PowerShell — Upgrade workflow">{`# 1. Stop services
nssm stop ChatbotUI
nssm stop ChatbotEngine

# 2. Pull latest code
cd C:\\Chatbot
git pull

# 3. Reinstall dependencies & rebuild
npm install
cd services\\engine && npm install && npm run build && cd ..\\..
npm run build
xcopy /E /I /Y public .next\\standalone\\public
xcopy /E /I /Y .next\\static .next\\standalone\\.next\\static

# 4. Start services
nssm start ChatbotEngine
timeout /t 5
nssm start ChatbotUI`}</CmdBlock>

          <Section id="" title="ML Data Directories">
            <p
              className="text-sm mb-3"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              The Engine stores ML data under <Code>services\engine\data\</Code>
              :
            </p>
            <div className="bg-gray-900 rounded-lg p-4 mb-3">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {`C:\\Chatbot\\services\\engine\\data\\
├── indexes\\         # Semantic search indexes (TF-IDF)
├── learning\\        # Collaborative filtering + interaction logs
├── anomaly\\         # Anomaly detection baselines
└── preferences\\     # User preference profiles`}
              </pre>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="font-medium">Important:</span> Back up{" "}
              <Code>services\engine\data\</Code> before upgrades. These contain
              learned ML models that are rebuilt from interaction history.
            </div>
          </Section>

          <div
            className="text-sm font-medium mb-2 mt-4"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Uninstalling
          </div>
          <CmdBlock>{`# Remove all services (preserves log files)
nssm stop ChatbotUI
nssm stop ChatbotEngine
nssm stop ChatbotMockAPI
nssm remove ChatbotUI confirm
nssm remove ChatbotEngine confirm
nssm remove ChatbotMockAPI confirm`}</CmdBlock>
        </Section>

        {/* STOMP / Live Notifications */}
        <Section id="stomp" title="8. STOMP / Live Notifications (Optional)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            To enable real-time dashboard card refresh via STOMP WebSocket,
            configure the following environment variables:
          </p>
          <CmdBlock label="Add to .env file">{`# STOMP WebSocket Configuration (optional)
NEXT_PUBLIC_STOMP_BROKER_URL=ws://localhost:15674/ws
NEXT_PUBLIC_STOMP_DESTINATION=/topic/notifications`}</CmdBlock>
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Alternatively, configure the STOMP broker URL in the Admin UI at{" "}
            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
              Admin → Settings → STOMP / Live
            </span>
            . The UI settings are stored per-browser and override environment
            variables, making it easy to switch between environments (Dev, QA,
            Prod) without redeployment.
          </p>
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Common STOMP brokers: RabbitMQ with STOMP plugin (
            <code className="text-xs">ws://host:15674/ws</code>), ActiveMQ (
            <code className="text-xs">ws://host:61614/ws</code>).
          </p>
        </Section>

        {/* Troubleshooting */}
        <Section id="trouble" title="9. Troubleshooting">
          <div className="space-y-3">
            {[
              {
                title: "IIS 502 Bad Gateway",
                fix: "Ensure NSSM services are running: nssm status ChatbotUI. Verify ARR proxy is enabled in IIS. Check that port 3001 is listening: netstat -ano | findstr :3001",
              },
              {
                title: "Port already in use",
                fix: "Run netstat -ano | findstr :3001 to find the PID, then taskkill /PID <pid> /F. Ensure no duplicate services are registered.",
              },
              {
                title: "Services don't start after reboot",
                fix: 'NSSM services auto-start by default (Automatic startup type). Check in services.msc that the startup type is "Automatic". Run nssm status ChatbotEngine to diagnose.',
              },
              {
                title: "Windows Auth not working for queries",
                fix: 'Enable Windows Authentication in IIS (Step 6). Verify the query has authType: "windows" in Admin. Check browser Network tab for NTLM/Kerberos headers.',
              },
              {
                title: "NSSM service stuck in 'Paused' state",
                fix: "Run nssm restart <ServiceName>. If still stuck: nssm stop <ServiceName> then nssm start <ServiceName>. Check stderr log for crash details.",
              },
              {
                title: "Environment variables not loading",
                fix: "NSSM sets env vars per service via AppEnvironmentExtra. Edit them with: nssm edit <ServiceName>. Changes require a service restart.",
              },
              {
                title: "BAM token fetch failing",
                fix: "Check bamTokenUrl is reachable from the server. Verify the endpoint returns { code, bamToken }. Check Engine logs: Get-Content data\\logs\\engine-stderr.log -Tail 20",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: "hsl(var(--muted) / 0.3)",
                  borderColor: "hsl(var(--border))",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {item.title}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  {item.fix}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </CardContainer>
    </div>
  );
}
