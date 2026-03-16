'use client';

import Link from 'next/link';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  );
}

function CmdBlock({ children }: { children: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 mb-3">
      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>{children}</span>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">{children}</code>;
}

export default function ProdDeployGuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/guides" className="text-xs text-blue-600 hover:underline">&larr; All Guides</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Production Deployment Guide</h1>
        <p className="text-sm text-gray-500">Deploy UI + Engine to production — no Mock API needed</p>
        <Badge color="red">Admins &amp; DevOps</Badge>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Section title="Production Architecture">
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 font-mono leading-relaxed">
            <pre>{`┌──────────┐      ┌──────────────┐      ┌───────────────────┐
│  Users   │ ───→ │  Service 1   │ ───→ │  Service 2        │
│ (Browser)│      │  UI (:3001)  │      │  Engine (:4001)   │
└──────────┘      └──────────────┘      │                   │
                                        │  NLP Pipeline     │
                  ┌─────────────────┐   │  Query Execution  │
                  │ Nginx / IIS     │   │  Admin API        │
                  │ Reverse Proxy   │   └────────┬──────────┘
                  │ :80/:443 (SSL)  │            │
                  └─────────────────┘            ↓
                                        ┌───────────────────┐
                                        │ Tenant APIs       │
                                        │ (Real endpoints)  │
                                        │ - Windows Auth    │
                                        │ - BAM Token       │
                                        │ - Bearer Token    │
                                        └───────────────────┘`}</pre>
          </div>
          <p className="text-xs text-gray-500 mt-2">No Mock API in production. The Engine calls real tenant APIs directly.</p>
        </Section>

        <Section title="1. Build for Production">
          <CmdBlock>{`# Build both frontend + engine backend in one step
npm run build:prod

# Or build separately:
# npm run build                           # Next.js standalone
# cd services/engine && npm run build     # esbuild → dist/server.js (~357KB)`}</CmdBlock>
        </Section>

        <Section title="2. Configure Environment (.env.prod)">
          <p className="text-sm text-gray-600 mb-3">
            Copy <Code>.env.example</Code> to <Code>.env.prod</Code> and fill in your production values.
            Both the UI and Engine services read from this file.
          </p>

          <CmdBlock>{`# Create production env file
cp .env.example .env.prod`}</CmdBlock>

          <div className="p-3 bg-red-50 rounded-lg border border-red-200 mb-3">
            <div className="text-xs font-semibold text-red-800 mb-2">Required .env.prod values:</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-red-100/50">
                  <th className="px-3 py-1.5 text-left font-medium text-red-700">Variable</th>
                  <th className="px-3 py-1.5 text-left font-medium text-red-700">Value</th>
                  <th className="px-3 py-1.5 text-left font-medium text-red-700">Purpose</th>
                </tr></thead>
                <tbody className="text-gray-700">
                  <tr><td className="px-3 py-1 font-mono">NODE_ENV</td><td className="px-3 py-1">production</td><td className="px-3 py-1">Enables production optimizations, structured logging</td></tr>
                  <tr className="bg-red-50/50"><td className="px-3 py-1 font-mono">ENGINE_URL</td><td className="px-3 py-1">http://engine:4001</td><td className="px-3 py-1">UI proxies API calls to Engine (Docker) or http://localhost:4001 (PM2)</td></tr>
                  <tr><td className="px-3 py-1 font-mono">USER_INFO_URL</td><td className="px-3 py-1">https://sso.your-company.com/api/userinfo</td><td className="px-3 py-1">AD/SSO endpoint for user authentication</td></tr>
                  <tr className="bg-red-50/50"><td className="px-3 py-1 font-mono">API_BASE_URL</td><td className="px-3 py-1">https://api.your-company.com/api</td><td className="px-3 py-1">Tenant data API base URL</td></tr>
                  <tr><td className="px-3 py-1 font-mono">API_TOKEN</td><td className="px-3 py-1">your-prod-api-token</td><td className="px-3 py-1">Global bearer token for APIs using bearer auth</td></tr>
                  <tr className="bg-red-50/50"><td className="px-3 py-1 font-mono">ENGINE_API_KEY</td><td className="px-3 py-1">your-secure-random-key</td><td className="px-3 py-1"><strong>Required:</strong> Secures the Engine admin API endpoints</td></tr>
                  <tr><td className="px-3 py-1 font-mono">UI_ORIGIN</td><td className="px-3 py-1">https://chatbot.your-company.com</td><td className="px-3 py-1">CORS allowed origin for Engine</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="font-medium">Security:</span> Never commit <Code>.env.prod</Code> to git — it contains secrets.
            Only <Code>.env.example</Code> (the template) is version-controlled.
          </div>
        </Section>

        <Section title="3. Per-Query Authentication">
          <p className="text-sm text-gray-600 mb-3">
            Each query independently specifies its authentication method. Configure per query in Admin &rarr; Groups &rarr; Queries.
          </p>

          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead><tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Auth Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">How It Works</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Config Required</th>
              </tr></thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="green">none</Badge></td>
                  <td className="px-3 py-2 border-b">No authentication — open API</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;none&quot;</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="blue">bearer</Badge></td>
                  <td className="px-3 py-2 border-b">Uses global <Code>API_TOKEN</Code> from env as Authorization: Bearer header</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;bearer&quot;</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="purple">windows</Badge></td>
                  <td className="px-3 py-2 border-b">Forwards logged-in user&apos;s AD/Kerberos credentials from the browser session</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;windows&quot;</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="red">bam</Badge></td>
                  <td className="px-3 py-2 border-b">Calls BAM token URL first, then uses bamToken in X-BAM-Token header for data call</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;bam&quot;, bamTokenUrl: &quot;https://...&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="bg-purple-50 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-medium text-purple-700 mb-1">Windows Auth Flow</div>
              <pre className="font-mono text-[10px] text-gray-500">{`User (AD login) → Browser → IIS/Nginx (auth) → UI → Engine
  → Engine forwards user's cookies/Authorization header → Tenant API`}</pre>
              <p className="mt-1">No extra configuration per query — the user&apos;s existing AD session is forwarded transparently.</p>
            </div>

            <div className="bg-red-50 rounded-lg p-3 text-xs text-gray-600">
              <div className="font-medium text-red-700 mb-1">BAM Auth Flow</div>
              <pre className="font-mono text-[10px] text-gray-500">{`Engine → POST bamTokenUrl → { code, message, bamToken, redirectURL }
Engine → GET/POST data API with X-BAM-Token: <bamToken> → data`}</pre>
              <p className="mt-1">BAM tokens are cached (~5 min TTL). Set <Code>bamTokenUrl</Code> per query in the admin UI.</p>
            </div>
          </div>
        </Section>

        <Section title="4. Deploy with Docker">
          <p className="text-sm text-gray-600 mb-3">
            Uses <Code>docker-compose.prod.yml</Code> which reads from <Code>.env.prod</Code> automatically.
          </p>
          <CmdBlock>{`# Ensure .env.prod is configured (see Section 2)

# Build and start (UI + Engine, no Mock API)
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f engine
docker compose -f docker-compose.prod.yml logs -f ui`}</CmdBlock>
        </Section>

        <Section title="5. Deploy with PM2 (Manual)">
          <CmdBlock>{`# Install PM2 globally
npm install -g pm2

# Start Engine (reads env from .env.prod or system env vars)
cd services/engine
pm2 start dist/server.js --name chatbot-engine

# Start UI
cd ../..
pm2 start .next/standalone/server.js --name chatbot-ui

# Save for auto-restart
pm2 save
pm2 startup`}</CmdBlock>
          <p className="text-xs text-gray-500">
            PM2 inherits environment variables from the shell session. Either source <Code>.env.prod</Code> before starting,
            or set system-wide env vars (see Windows Setup guide for PowerShell approach).
          </p>
        </Section>

        <Section title="6. Reverse Proxy (Nginx)">
          <CmdBlock>{`server {
    listen 443 ssl;
    server_name chatbot.your-company.com;

    ssl_certificate     /etc/ssl/certs/chatbot.pem;
    ssl_certificate_key /etc/ssl/private/chatbot.key;

    # UI
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Forward auth headers (required for Windows auth queries)
        proxy_set_header Authorization $http_authorization;
        proxy_pass_header Set-Cookie;
    }

    # Engine API (direct access for health checks)
    location /engine/ {
        proxy_pass http://127.0.0.1:4001/;
        proxy_set_header Host $host;
    }
}`}</CmdBlock>
          <p className="text-xs text-gray-500">
            For Windows auth, ensure the reverse proxy forwards Authorization headers.
            For IIS setup, see the Windows Setup guide.
          </p>
        </Section>

        <Section title="NPM Scripts Reference">
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`npm run build:prod     # Build Next.js + Engine (esbuild) for production
npm run start:prod     # Production build, real APIs (.env.prod)
npm run start:all      # Start mock-api + engine + UI from prod builds
npm run start:demo     # Production build, mock data (.env.mock)
npm run dev            # Dev mode, real APIs (.env.dev)
npm run dev:mock       # Dev mode, mock data (.env.mock)
npm run analyze        # Bundle analysis (interactive treemap)`}</pre>
          </div>
        </Section>

        <Section title="ML Data Persistence">
          <p className="text-sm text-gray-600 mb-3">
            ML features store data under <Code>services/engine/data/</Code>. In production, ensure this directory is persistent across deployments.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead><tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">ML Feature</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Data Path</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Description</th>
              </tr></thead>
              <tbody className="text-gray-700">
                <tr><td className="px-3 py-1.5 border-b">Semantic Search</td><td className="px-3 py-1.5 border-b font-mono">data/indexes/{'{groupId}/'}</td><td className="px-3 py-1.5 border-b">TF-IDF index for natural language query matching</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-1.5 border-b">Recommendations</td><td className="px-3 py-1.5 border-b font-mono">data/learning/{'{groupId}/'}</td><td className="px-3 py-1.5 border-b">User interactions, signal aggregates, collaborative filter data</td></tr>
                <tr><td className="px-3 py-1.5 border-b">Anomaly Detection</td><td className="px-3 py-1.5 border-b font-mono">data/anomaly/{'{groupId}/'}</td><td className="px-3 py-1.5 border-b">Historical baselines and snapshots for z-score/IQR checks</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-1.5 border-b">User Preferences</td><td className="px-3 py-1.5 border-b font-mono">data/preferences/</td><td className="px-3 py-1.5 border-b">Per-user favorites and settings</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="font-medium">Docker:</span> Mount <Code>services/engine/data/</Code> as a volume to persist ML data across container restarts:
              <pre className="font-mono mt-1 text-[10px]">{`volumes:
  - ./engine-data:/app/services/engine/data`}</pre>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <span className="font-medium">PM2:</span> Data persists on disk automatically. Back up <Code>services/engine/data/</Code> regularly.
            </div>
          </div>
        </Section>

        <Section title="Monitoring Checklist">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>Engine health: <code className="text-xs bg-gray-100 px-1 rounded">GET /api/health</code> returns 200</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>Query stats: <code className="text-xs bg-gray-100 px-1 rounded">GET /api/stats</code> shows execution metrics</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>User auth: <code className="text-xs bg-gray-100 px-1 rounded">GET /api/userinfo</code> returns real AD identity (not mock user)</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>Admin access: Only users in <Code>users.json</Code> with role &quot;admin&quot; can access Admin portal</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>Conversation logs: Check Admin &rarr; Conversation Logs for activity</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>PM2 monitoring: <code className="text-xs bg-gray-100 px-1 rounded">pm2 monit</code> for CPU/memory</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>SSL certificate: Verify HTTPS works end-to-end</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>ENGINE_API_KEY: Verify <code className="text-xs bg-gray-100 px-1 rounded">GET /api/admin/*</code> returns 401 without API key</span></div>
          </div>
        </Section>
      </div>
    </div>
  );
}
