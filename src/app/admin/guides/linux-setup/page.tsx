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
  { id: "systemd", label: "systemd Services" },
  { id: "nginx", label: "Nginx Reverse Proxy" },
  { id: "ssl", label: "SSL & Firewall" },
  { id: "auth", label: "Authentication" },
  { id: "manage", label: "Management" },
  { id: "docker", label: "Docker Alternative" },
  { id: "trouble", label: "Troubleshooting" },
];

export default function LinuxSetupGuidePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <GuideHeader
        title="Linux / Unix Setup Guide"
        description="Deploy the chatbot platform on Linux — systemd services + Nginx reverse proxy"
        badgeColor="teal"
        badgeText="Admins & DevOps"
      />

      <QuickNav sections={SECTIONS} />

      <CardContainer>
        {/* Architecture */}
        <Section id="arch" title="Architecture Overview">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            All Node.js services run as{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>systemd</strong>{" "}
            managed services. Nginx acts as a reverse proxy — SSL termination
            and request routing.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`Browser (HTTPS)
    │
    ▼
┌──────────────────────────────┐
│  Nginx (port 80/443)         │   ← Reverse proxy (SSL termination)
└──────────┬───────────────────┘
           │ HTTP
           ▼
┌──────────────────────────────┐
│  ChatbotUI (port 3001)       │   ← systemd service — Next.js standalone
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  ChatbotEngine (port 4001)   │   ← systemd service — Express + NLP + ML
└──────────┬───────────────────┘
           │ (optional)
     ┌─────┴──────┐
     ▼            ▼
 MSSQL          Oracle         ← systemd services (optional — no-code SQL APIs)
 (4002)         (4003)`}
            </pre>
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
            to the internet. A reverse proxy (Nginx on Linux, IIS on Windows)
            sits in front of Node.js and handles everything the browser expects
            from a production server.
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`WITHOUT reverse proxy (insecure):
  Browser ──→ Node.js UI :3001    ← No SSL, no caching, port exposed
                                     No security headers, single-threaded

WITH reverse proxy (production):
  Browser ──→ Nginx :443 ──→ Node.js UI :3001
                 ↑
          SSL termination
          Security headers
          Static asset caching
          Clean URL (port 443, not 3001)
          Request buffering
          Rate limiting`}
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
                desc: "Handles HTTPS encryption so Node.js doesn't have to. Browsers see a trusted certificate via Let's Encrypt.",
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
                title: "Firewall Simplicity",
                desc: "Only ports 80/443 are exposed. All internal service ports (3001, 4001, etc.) stay on localhost.",
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
            Nginx proxies all traffic to the UI on port 3001. The UI internally
            routes <Code>/api/*</Code> requests to the Engine on port 4001 via{" "}
            <Code>next.config.mjs</Code> rewrites. Nginx only needs to know
            about port 3001 — it never talks to the Engine directly.
          </div>
        </Section>

        {/* Prerequisites */}
        <Section id="prereqs" title="Prerequisites">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { name: "Linux", desc: "Ubuntu 20.04+, RHEL 8+, Debian 11+" },
              { name: "Node.js 18+", desc: "Via nvm or package manager" },
              { name: "Nginx", desc: "apt install nginx / yum install nginx" },
              { name: "Git", desc: "apt install git / yum install git" },
              { name: "systemd", desc: "Included in all modern Linux distros" },
              { name: "Build tools", desc: "gcc, make (for native modules)" },
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

          <CmdBlock label="Install Node.js via nvm (recommended)">{`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
node --version   # v18.x`}</CmdBlock>
        </Section>

        {/* Install & Build */}
        <Section id="install" title="1. Clone and Build">
          <CmdBlock label="Terminal">{`# Clone repository
git clone <repo-url> /opt/chatbot
cd /opt/chatbot

# Install dependencies
npm install
cd services/engine && npm install && cd ../..
cd services/mock-api && npm install && cd ../..

# Build UI + Engine
npm run build:prod

# Copy static assets for standalone mode
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static`}</CmdBlock>

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
            Only install if you need no-code SQL APIs for MSSQL or Oracle.
          </div>
          <CmdBlock label="Terminal — Optional SQL connectors">{`# MSSQL Connector (optional)
cd services/mssql-connector && npm install && cd ../..

# Oracle Connector (optional — requires Oracle Instant Client)
cd services/oracle-connector && npm install && cd ../..`}</CmdBlock>

          <CmdBlock label="Create a dedicated service user">{`# Create non-root user for running services
sudo useradd -r -s /bin/false chatbot
sudo chown -R chatbot:chatbot /opt/chatbot`}</CmdBlock>
        </Section>

        {/* Environment */}
        <Section id="env" title="2. Configure Environment">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Create environment files. systemd services load them via{" "}
            <Code>EnvironmentFile=</Code>.
          </p>

          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">Demo Mode</Badge>
                <span className="text-xs text-gray-500">
                  Mock data, no real APIs needed
                </span>
              </div>
              <CmdBlock>{`cp .env.example .env.mock
# Defaults work out of the box for demo`}</CmdBlock>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="blue">Dev Mode</Badge>
                <span className="text-xs text-gray-500">
                  Real APIs and AD/SSO auth
                </span>
              </div>
              <CmdBlock>{`cp .env.example .env.dev
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
              <CmdBlock>{`cp .env.example .env.prod
# Edit .env.prod:
# NODE_ENV=production
# ENGINE_URL=http://localhost:4001
# API_BASE_URL=https://api.your-company.com/api
# API_TOKEN=your-prod-api-token
# ENGINE_API_KEY=your-secure-engine-key
# USER_INFO_URL=https://sso.your-company.com/api/userinfo
# UI_ORIGIN=https://chatbot.your-company.com`}</CmdBlock>
            </div>
          </div>

          <CmdBlock label="Secure the env file">{`sudo chmod 600 /opt/chatbot/.env.prod
sudo chown chatbot:chatbot /opt/chatbot/.env.prod`}</CmdBlock>
        </Section>

        {/* systemd Services */}
        <Section id="systemd" title="3. Create systemd Services">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Create unit files in <Code>/etc/systemd/system/</Code> for each
            service.
          </p>

          <CmdBlock label="/etc/systemd/system/chatbot-engine.service">{`[Unit]
Description=Chatbot Engine (NLP + ML + API)
After=network.target

[Service]
Type=simple
User=chatbot
Group=chatbot
WorkingDirectory=/opt/chatbot/services/engine
ExecStart=/usr/bin/node dist/server.js
EnvironmentFile=/opt/chatbot/.env.prod
Environment=ENGINE_PORT=4001
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=chatbot-engine

[Install]
WantedBy=multi-user.target`}</CmdBlock>

          <CmdBlock label="/etc/systemd/system/chatbot-ui.service">{`[Unit]
Description=Chatbot UI (Next.js)
After=network.target chatbot-engine.service
Requires=chatbot-engine.service

[Service]
Type=simple
User=chatbot
Group=chatbot
WorkingDirectory=/opt/chatbot
ExecStart=/usr/bin/node .next/standalone/server.js
EnvironmentFile=/opt/chatbot/.env.prod
Environment=PORT=3001
Environment=ENGINE_URL=http://localhost:4001
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=chatbot-ui

[Install]
WantedBy=multi-user.target`}</CmdBlock>

          <CmdBlock label="/etc/systemd/system/chatbot-mockapi.service (demo only)">{`[Unit]
Description=Chatbot Mock API (demo data)
After=network.target

[Service]
Type=simple
User=chatbot
Group=chatbot
WorkingDirectory=/opt/chatbot/services/mock-api
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
SyslogIdentifier=chatbot-mockapi

[Install]
WantedBy=multi-user.target`}</CmdBlock>

          <CmdBlock label="Enable and start services">{`# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable chatbot-engine chatbot-ui

# Start services
sudo systemctl start chatbot-engine
sudo systemctl start chatbot-ui

# Demo only: also start mock API
sudo systemctl enable chatbot-mockapi
sudo systemctl start chatbot-mockapi`}</CmdBlock>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mt-3">
            <span className="font-semibold">Optional — SQL Connectors:</span>{" "}
            Create similar unit files for MSSQL (port 4002) and Oracle (port
            4003) connectors if needed for no-code SQL APIs.
          </div>
        </Section>

        {/* Nginx */}
        <Section id="nginx" title="4. Configure Nginx Reverse Proxy">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Nginx sits in front of the Next.js UI and handles SSL termination.
            All browser traffic goes through Nginx &rarr; UI (port 3001). The UI
            internally proxies <Code>/api/*</Code> to the Engine (port 4001) via
            Next.js rewrites —{" "}
            <strong style={{ color: "hsl(var(--foreground))" }}>
              Nginx only needs to know about port 3001
            </strong>
            .
          </p>

          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {`Browser ──→ Nginx (80/443) ──→ UI (3001) ──→ Engine (4001)
              ↑                    ↑               ↑
        SSL termination      proxy_pass      next.config.mjs
        + security headers   (this config)   rewrites (automatic)`}
            </pre>
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
                Step 1 &mdash; Install Nginx
              </div>
              <CmdBlock label="Ubuntu / Debian">{`sudo apt update
sudo apt install nginx -y`}</CmdBlock>
              <CmdBlock label="RHEL / CentOS / AlmaLinux">{`sudo dnf install nginx -y   # RHEL 8+
# or: sudo yum install nginx -y`}</CmdBlock>
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
                Step 2 &mdash; Copy the provided config
              </div>
              <p
                className="text-xs mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                The project includes a ready-to-use{" "}
                <FileRef path="nginx.conf" /> in the repo root.
              </p>
              <CmdBlock label="Ubuntu / Debian (uses sites-available)">{`# Copy config to sites-available
sudo cp /opt/chatbot/nginx.conf /etc/nginx/sites-available/chatbot

# Create symlink to enable it
sudo ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/

# Remove the default site (otherwise it conflicts on port 80)
sudo rm /etc/nginx/sites-enabled/default`}</CmdBlock>
              <CmdBlock label="RHEL / CentOS (uses conf.d — no sites-available)">{`# RHEL doesn't have sites-available; use conf.d instead
sudo cp /opt/chatbot/nginx.conf /etc/nginx/conf.d/chatbot.conf

# Comment out or remove the default server block in /etc/nginx/nginx.conf
# if it listens on port 80`}</CmdBlock>
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
                Step 3 &mdash; Edit server_name
              </div>
              <p
                className="text-xs mb-2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Open the config and replace{" "}
                <Code>chatbot.your-company.com</Code> with your actual domain or
                server IP.
              </p>
              <CmdBlock>{`# Ubuntu/Debian
sudo nano /etc/nginx/sites-available/chatbot

# RHEL/CentOS
sudo nano /etc/nginx/conf.d/chatbot.conf

# Find and replace all occurrences of:
#   chatbot.your-company.com  →  your-actual-domain.com`}</CmdBlock>
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
                Step 4 &mdash; Test the config
              </div>
              <CmdBlock>{`sudo nginx -t`}</CmdBlock>
              <p
                className="text-xs"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                You must see <Code>syntax is ok</Code> and{" "}
                <Code>test is successful</Code>. If not, fix the errors shown
                before proceeding.
              </p>
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
                Step 5 &mdash; Start and enable Nginx
              </div>
              <CmdBlock>{`sudo systemctl enable nginx   # auto-start on boot
sudo systemctl reload nginx   # apply config (or: systemctl start nginx)`}</CmdBlock>
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
              <CmdBlock>{`# Quick test from the server itself
curl -I http://localhost

# You should see "HTTP/1.1 200 OK" (if UI is running)
# or "HTTP/1.1 301 Moved" (if HTTPS redirect is active)

# From another machine, open your browser:
# http://chatbot.your-company.com`}</CmdBlock>
            </div>
          </div>

          {/* HTTP-only vs HTTPS */}
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
                The <FileRef path="nginx.conf" /> includes a commented-out{" "}
                <Code>Option A</Code> block for HTTP-only. Uncomment it and
                comment out Option B to skip SSL during initial setup.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">HTTPS (recommended)</Badge>
                <span className="text-xs text-gray-500">Production</span>
              </div>
              <p className="text-xs text-green-800">
                <Code>Option B</Code> is active by default — redirects HTTP to
                HTTPS. Run <Code>certbot --nginx</Code> to obtain a free SSL
                certificate (see Section 5 below).
              </p>
            </div>
          </div>

          {/* Config summary */}
          <div
            className="text-sm font-semibold mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            What the Config Does
          </div>
          <CmdBlock label="Key directives in nginx.conf">{`server {
    listen 443 ssl http2;
    server_name chatbot.your-company.com;

    # SSL — auto-filled by certbot, or set manually
    ssl_certificate     /etc/letsencrypt/live/.../fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;

    # All traffic → Next.js UI on port 3001
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (Next.js HMR in dev)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Cache static assets for 1 year (filenames are hashed)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}`}</CmdBlock>

          {/* Nginx troubleshooting */}
          <div
            className="text-sm font-semibold mt-6 mb-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Common Nginx Issues
          </div>
          <div className="space-y-2">
            {[
              {
                title: "502 Bad Gateway",
                fix: "The UI isn't running or isn't on port 3001. Check: sudo systemctl status chatbot-ui and ss -tlnp | grep 3001",
              },
              {
                title: 'nginx -t fails with "duplicate default server"',
                fix: "You still have the default site enabled. Run: sudo rm /etc/nginx/sites-enabled/default (Ubuntu) or remove the default server block from /etc/nginx/nginx.conf (RHEL)",
              },
              {
                title: "Permission denied — 13: Permission denied",
                fix: "SELinux (RHEL) blocks Nginx from proxying. Fix: sudo setsebool -P httpd_can_network_connect 1",
              },
              {
                title: "Address already in use — port 80",
                fix: "Another process is on port 80. Find it: sudo ss -tlnp | grep :80 — usually Apache. Stop it: sudo systemctl stop apache2",
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
            <span className="font-semibold">Tip:</span> If you just want to test
            without SSL first, uncomment <Code>Option A</Code> in nginx.conf,
            comment out <Code>Option B</Code>, and skip Section 5 (SSL). You can
            add SSL later with a single <Code>certbot --nginx</Code> command.
          </div>
        </Section>

        {/* SSL & Firewall */}
        <Section id="ssl" title="5. SSL Certificate & Firewall">
          <CmdBlock label="Let's Encrypt with Certbot (recommended)">{`# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (auto-configures Nginx)
sudo certbot --nginx -d chatbot.your-company.com

# Auto-renewal is configured automatically
# Test with: sudo certbot renew --dry-run`}</CmdBlock>

          <CmdBlock label="Firewall (ufw)">{`# Allow only Nginx ports — keep service ports local
sudo ufw allow 'Nginx Full'   # ports 80 + 443
sudo ufw enable

# Do NOT expose ports 3001, 4001, 4002, 4003 externally
# They are accessed only via Nginx reverse proxy on localhost`}</CmdBlock>

          <CmdBlock label="Firewall (firewalld — RHEL/CentOS)">{`sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload`}</CmdBlock>
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
          <div className="overflow-x-auto">
            <table
              className="w-full text-xs border rounded"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <thead>
                <tr style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}>
                  {["Auth Type", "How It Works", "Linux Setup"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-medium border-b"
                      style={{
                        color: "hsl(var(--muted-foreground))",
                        borderColor: "hsl(var(--border))",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ color: "hsl(var(--foreground))" }}>
                {[
                  {
                    type: "none",
                    color: "green",
                    how: "No auth headers — open API",
                    setup: "No setup needed",
                  },
                  {
                    type: "bearer",
                    color: "blue",
                    how: "Global API_TOKEN sent as Bearer header",
                    setup: "Set API_TOKEN in .env.prod",
                  },
                  {
                    type: "bam",
                    color: "red",
                    how: "Calls BAM URL → token → X-BAM-Token header",
                    setup: "Set bamTokenUrl per query in Admin",
                  },
                ].map((row) => (
                  <tr
                    key={row.type}
                    className="border-b"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    <td className="px-3 py-2">
                      <Badge color={row.color}>{row.type}</Badge>
                    </td>
                    <td className="px-3 py-2">{row.how}</td>
                    <td className="px-3 py-2">{row.setup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Service Management */}
        <Section id="manage" title="7. Service Management">
          <CmdBlock label="systemctl commands">{`# Check status
sudo systemctl status chatbot-engine
sudo systemctl status chatbot-ui

# View logs (real-time)
sudo journalctl -u chatbot-engine -f
sudo journalctl -u chatbot-ui -f

# View recent logs
sudo journalctl -u chatbot-engine --since "1 hour ago"

# Restart services
sudo systemctl restart chatbot-engine
sudo systemctl restart chatbot-ui

# Stop a service
sudo systemctl stop chatbot-ui`}</CmdBlock>

          <div
            className="text-sm font-medium mb-2 mt-4"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Updating the Application
          </div>
          <CmdBlock label="Upgrade workflow">{`# 1. Stop services
sudo systemctl stop chatbot-ui
sudo systemctl stop chatbot-engine

# 2. Pull latest code
cd /opt/chatbot
sudo -u chatbot git pull

# 3. Reinstall dependencies & rebuild
sudo -u chatbot npm install
cd services/engine && sudo -u chatbot npm install && sudo -u chatbot npm run build && cd ../..
sudo -u chatbot npm run build
sudo -u chatbot cp -r public .next/standalone/public
sudo -u chatbot cp -r .next/static .next/standalone/.next/static

# 4. Restart services
sudo systemctl start chatbot-engine
sleep 5
sudo systemctl start chatbot-ui`}</CmdBlock>

          <Section id="" title="ML Data Directories">
            <p
              className="text-sm mb-3"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              The Engine stores ML data under <Code>services/engine/data/</Code>
              :
            </p>
            <div className="bg-gray-900 rounded-lg p-4 mb-3">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {`/opt/chatbot/services/engine/data/
├── indexes/         # Semantic search indexes (TF-IDF)
├── learning/        # Collaborative filtering + interaction logs
├── anomaly/         # Anomaly detection baselines
└── preferences/     # User preference profiles`}
              </pre>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="font-medium">Important:</span> Back up{" "}
              <Code>services/engine/data/</Code> before upgrades.
            </div>
          </Section>
        </Section>

        {/* Docker Alternative */}
        <Section id="docker" title="8. Docker Alternative">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Instead of systemd + Nginx, you can deploy with Docker Compose. The
            project includes ready-to-use compose files.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
            {[
              {
                file: "docker-compose.yml",
                desc: "Demo mode — UI + Engine + Mock API",
              },
              {
                file: "docker-compose.dev.yml",
                desc: "Dev mode — UI + Engine (real APIs)",
              },
              {
                file: "docker-compose.prod.yml",
                desc: "Production — UI + Engine only",
              },
              {
                file: "docker-compose.sample-db.yml",
                desc: "Sample MSSQL + Oracle databases",
              },
            ].map((f) => (
              <div
                key={f.file}
                className="p-2 rounded"
                style={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
              >
                <div
                  className="font-mono font-medium"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  {f.file}
                </div>
                <div style={{ color: "hsl(var(--muted-foreground))" }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>

          <CmdBlock label="Docker Compose — quick start">{`# Demo mode (all 3 services)
docker compose up -d

# Dev mode (real APIs)
docker compose -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.prod.yml up -d

# With sample databases for connector testing
docker compose -f docker-compose.sample-db.yml up -d`}</CmdBlock>

          <CmdBlock label="Docker management">{`# View logs
docker compose logs -f ui
docker compose logs -f engine

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# Stop all services
docker compose down`}</CmdBlock>
        </Section>

        {/* STOMP / Live Notifications */}
        <Section id="stomp" title="9. STOMP / Live Notifications (Optional)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            To enable real-time dashboard card refresh, add STOMP environment
            variables to your{" "}
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
              .env
            </code>{" "}
            file:
          </p>
          <CmdBlock label="Add to /opt/chatbot/.env">{`# STOMP WebSocket Configuration (optional)
NEXT_PUBLIC_STOMP_BROKER_URL=ws://localhost:15674/ws
NEXT_PUBLIC_STOMP_DESTINATION=/topic/notifications`}</CmdBlock>
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            You can also configure STOMP settings per-browser in Admin →
            Settings → STOMP / Live for easy environment switching without
            redeployment.
          </p>
        </Section>

        {/* Troubleshooting */}
        <Section id="trouble" title="10. Troubleshooting">
          <div className="space-y-3">
            {[
              {
                title: "Nginx 502 Bad Gateway",
                fix: "Ensure services are running: systemctl status chatbot-ui. Check that port 3001 is listening: ss -tlnp | grep 3001. Verify Nginx proxy_pass points to 127.0.0.1:3001.",
              },
              {
                title: "Service fails to start",
                fix: "Check logs: journalctl -u chatbot-engine -n 50. Common causes: wrong Node.js path (check with which node), permission denied (chown -R chatbot:chatbot /opt/chatbot), missing .env file.",
              },
              {
                title: "Permission denied on data directory",
                fix: "The chatbot user needs write access to services/engine/data/: chown -R chatbot:chatbot /opt/chatbot/services/engine/data",
              },
              {
                title: "Port already in use",
                fix: "Find the process: ss -tlnp | grep :3001 or lsof -i :3001. Kill it: kill <pid>. Ensure no duplicate services are running.",
              },
              {
                title: "Certbot SSL renewal fails",
                fix: "Test renewal: certbot renew --dry-run. Ensure port 80 is accessible. Check Nginx config: nginx -t. Certbot auto-renewal runs via systemd timer.",
              },
              {
                title: "Services don't start after reboot",
                fix: "Ensure services are enabled: systemctl is-enabled chatbot-engine chatbot-ui. If not, run: systemctl enable chatbot-engine chatbot-ui.",
              },
              {
                title: "Docker containers exit immediately",
                fix: "Check logs: docker compose logs engine. Common causes: missing .env file (ensure .env.prod exists), port conflicts with host services.",
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
