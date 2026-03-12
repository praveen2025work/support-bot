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
│ (Browser)│      │  UI (:3000)  │      │  Engine (:4000)   │
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
                                        │ - IP Whitelist    │
                                        └───────────────────┘`}</pre>
          </div>
          <p className="text-xs text-gray-500 mt-2">No Mock API in production. The Engine calls real tenant APIs directly.</p>
        </Section>

        <Section title="1. Build for Production">
          <CmdBlock>{`# Build UI (Next.js standalone)
npm run build

# Build Engine
cd services/engine
npm install --production
npm run build`}</CmdBlock>
        </Section>

        <Section title="2. Configure Environment">
          <p className="text-sm text-gray-600 mb-3">Set these environment variables on the deployment host:</p>

          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-semibold text-blue-800 mb-1">UI Service (.env)</div>
              <CmdBlock>{`NODE_ENV=production
ENGINE_URL=http://engine-host:4000`}</CmdBlock>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-semibold text-purple-800 mb-1">Engine Service (.env)</div>
              <CmdBlock>{`NODE_ENV=production
ENGINE_PORT=4000
API_BASE_URL=https://your-tenant-api.corp.com/api
API_TOKEN=your-production-api-token
UI_ORIGIN=https://chatbot.your-company.com
ENGINE_API_KEY=your-secure-engine-key`}</CmdBlock>
            </div>
          </div>
        </Section>

        <Section title="3. Auth Configuration Per Query">
          <p className="text-sm text-gray-600 mb-3">
            Each tenant provides API endpoints with different authentication. Configure auth per group or per query in the admin portal:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead><tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Auth Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">How It Works</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Config Required</th>
              </tr></thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="green">None</Badge></td>
                  <td className="px-3 py-2 border-b">No authentication — open API</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;none&quot;</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="blue">Bearer Token</Badge></td>
                  <td className="px-3 py-2 border-b">Authorization: Bearer &lt;token&gt; header</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;bearer&quot;, token: &quot;...&quot;</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="purple">Windows Auth</Badge></td>
                  <td className="px-3 py-2 border-b">NTLM/Kerberos (AD-integrated)</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;windows&quot;, domain, username, password</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="red">BAM Token</Badge></td>
                  <td className="px-3 py-2 border-b">Custom X-BAM-Token header</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;bam_token&quot;, bamToken: &quot;...&quot;</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="green">IP Whitelist</Badge></td>
                  <td className="px-3 py-2 border-b">Tenant firewall allows Engine&apos;s IP</td>
                  <td className="px-3 py-2 border-b font-mono">authType: &quot;ip_whitelist&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="4. Deploy with Docker">
          <CmdBlock>{`# Production compose (no Mock API)
docker compose -f docker-compose.prod.yml up -d --build

# Set env vars
export API_BASE_URL=https://your-tenant-api.corp.com/api
export API_TOKEN=your-production-token
export ENGINE_API_KEY=your-engine-key

docker compose -f docker-compose.prod.yml up -d`}</CmdBlock>
        </Section>

        <Section title="5. Deploy with PM2 (Manual)">
          <CmdBlock>{`# Install PM2 globally
npm install -g pm2

# Start Engine
cd services/engine
pm2 start dist/server.js --name chatbot-engine \\
  --env NODE_ENV=production \\
  --env ENGINE_PORT=4000 \\
  --env API_BASE_URL=https://api.corp.com

# Start UI
cd ../..
pm2 start .next/standalone/server.js --name chatbot-ui \\
  --env ENGINE_URL=http://localhost:4000

# Save for auto-restart
pm2 save
pm2 startup`}</CmdBlock>
        </Section>

        <Section title="6. Reverse Proxy (Nginx)">
          <CmdBlock>{`server {
    listen 443 ssl;
    server_name chatbot.your-company.com;

    ssl_certificate     /etc/ssl/certs/chatbot.pem;
    ssl_certificate_key /etc/ssl/private/chatbot.key;

    # UI
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Engine API (direct access for health checks)
    location /engine/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
    }
}`}</CmdBlock>
        </Section>

        <Section title="Monitoring Checklist">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>Engine health: <code className="text-xs bg-gray-100 px-1 rounded">GET /api/health</code> returns 200</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>Query stats: <code className="text-xs bg-gray-100 px-1 rounded">GET /api/stats</code> shows execution metrics</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>Conversation logs: Check Admin &rarr; Conversation Logs for activity</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>PM2 monitoring: <code className="text-xs bg-gray-100 px-1 rounded">pm2 monit</code> for CPU/memory</span></div>
            <div className="flex items-start gap-2"><span className="text-gray-400">&#9744;</span><span>SSL certificate: Verify HTTPS works end-to-end</span></div>
          </div>
        </Section>
      </div>
    </div>
  );
}
