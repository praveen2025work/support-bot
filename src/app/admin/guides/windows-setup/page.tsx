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

function CmdBlock({ label, children }: { label?: string; children: string }) {
  return (
    <div className="mb-3">
      {label && <div className="text-[10px] font-medium text-gray-500 mb-1">{label}</div>}
      <div className="bg-gray-900 rounded-lg p-3">
        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{children}</pre>
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>{children}</span>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">{children}</code>;
}

export default function WindowsSetupGuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/guides" className="text-xs text-blue-600 hover:underline">&larr; All Guides</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Windows Host Setup Guide</h1>
        <p className="text-sm text-gray-500">Deploy the chatbot platform on Windows Server with IIS and PM2</p>
        <Badge color="orange">Admins &amp; DevOps</Badge>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Section title="Prerequisites">
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Windows Server</div>
              <div className="text-xs text-gray-500">2016 or later, or Windows 10/11</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">IIS</div>
              <div className="text-xs text-gray-500">With URL Rewrite &amp; ARR modules</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Node.js 18+</div>
              <div className="text-xs text-gray-500">Windows installer from nodejs.org</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Git for Windows</div>
              <div className="text-xs text-gray-500">git-scm.com</div>
            </div>
          </div>
        </Section>

        <Section title="1. Install Node.js">
          <p className="text-sm text-gray-600 mb-3">Download the Windows installer from nodejs.org (LTS version 18 or later).</p>
          <CmdBlock label="PowerShell — Verify installation">{`node --version    # Should show v18.x or later
npm --version     # Should show v9.x or later`}</CmdBlock>
        </Section>

        <Section title="2. Install PM2 Process Manager">
          <CmdBlock label="PowerShell (Run as Administrator)">{`# Install PM2 globally
npm install -g pm2

# Install Windows auto-start service
npm install -g pm2-windows-startup
pm2-startup install`}</CmdBlock>
        </Section>

        <Section title="3. Clone and Build">
          <CmdBlock label="PowerShell">{`# Clone repository
git clone <repo-url> C:\\chatbot
cd C:\\chatbot

# Install dependencies
npm install
cd services\\engine && npm install && cd ..\\..
cd services\\mock-api && npm install && cd ..\\..

# Build UI + Engine in one step (esbuild for backend)
npm run build:prod`}</CmdBlock>
        </Section>

        <Section title="4. Configure Environment">
          <p className="text-sm text-gray-600 mb-3">
            Choose the appropriate environment file based on your deployment mode.
            Copy from <Code>.env.example</Code> and fill in your values.
          </p>

          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">Demo Mode</Badge>
                <span className="text-xs text-gray-500">Uses mock data, no real APIs needed</span>
              </div>
              <CmdBlock label="PowerShell">{`# Copy environment template
copy .env.example .env.mock

# Defaults work out of the box:
# API_BASE_URL=http://localhost:8080/api
# USER_INFO_URL= (empty → mock user)
# ENGINE_URL= (set below in PM2)`}</CmdBlock>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="blue">Dev Mode</Badge>
                <span className="text-xs text-gray-500">Real APIs and AD/SSO auth</span>
              </div>
              <CmdBlock label="PowerShell — Edit .env.dev with your values">{`copy .env.example .env.dev

# Edit .env.dev and set:
# NODE_ENV=development
# ENGINE_URL=http://localhost:4001
# USER_INFO_URL=https://your-org-sso.company.com/api/userinfo
# API_BASE_URL=https://api-dev.your-company.com/api
# API_TOKEN=your-dev-api-token`}</CmdBlock>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge color="red">Production Mode</Badge>
                <span className="text-xs text-gray-500">All real endpoints, secured</span>
              </div>
              <CmdBlock label="PowerShell — Edit .env.prod with your values">{`copy .env.example .env.prod

# Edit .env.prod and set:
# NODE_ENV=production
# ENGINE_URL=http://localhost:4001
# USER_INFO_URL=https://sso.your-company.com/api/userinfo
# API_BASE_URL=https://api.your-company.com/api
# API_TOKEN=your-prod-api-token
# ENGINE_API_KEY=your-secure-engine-key
# UI_ORIGIN=https://chatbot.your-company.com`}</CmdBlock>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mt-3">
            <span className="font-medium">Alternative:</span> You can also set system-wide environment variables via PowerShell:
          </div>
          <CmdBlock label="PowerShell (Administrator) — System-wide env vars">{`[System.Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
[System.Environment]::SetEnvironmentVariable("ENGINE_PORT", "4001", "Machine")
[System.Environment]::SetEnvironmentVariable("API_BASE_URL", "https://your-api.corp.com/api", "Machine")
[System.Environment]::SetEnvironmentVariable("API_TOKEN", "your-token", "Machine")
[System.Environment]::SetEnvironmentVariable("USER_INFO_URL", "https://sso.corp.com/api/userinfo", "Machine")
[System.Environment]::SetEnvironmentVariable("ENGINE_URL", "http://localhost:4001", "Machine")
[System.Environment]::SetEnvironmentVariable("ENGINE_API_KEY", "your-secure-key", "Machine")
[System.Environment]::SetEnvironmentVariable("UI_ORIGIN", "https://chatbot.corp.com", "Machine")`}</CmdBlock>
        </Section>

        <Section title="5. Per-Query Authentication">
          <p className="text-sm text-gray-600 mb-3">
            Each query can use a different authentication method. Configure per query in Admin &rarr; Groups &rarr; Queries.
          </p>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead><tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Auth Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">How It Works</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Windows Setup Notes</th>
              </tr></thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="green">none</Badge></td>
                  <td className="px-3 py-2 border-b">No auth headers — open API</td>
                  <td className="px-3 py-2 border-b">No setup needed</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="blue">bearer</Badge></td>
                  <td className="px-3 py-2 border-b">Global <Code>API_TOKEN</Code> sent as Bearer header</td>
                  <td className="px-3 py-2 border-b">Set <Code>API_TOKEN</Code> in env file</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="purple">windows</Badge></td>
                  <td className="px-3 py-2 border-b">Forwards logged-in user&apos;s AD credentials</td>
                  <td className="px-3 py-2 border-b">IIS must have Windows Auth enabled. Engine forwards cookies/auth headers from the user&apos;s browser session.</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="red">bam</Badge></td>
                  <td className="px-3 py-2 border-b">Calls BAM URL &rarr; gets token &rarr; sends X-BAM-Token</td>
                  <td className="px-3 py-2 border-b">Set <Code>bamTokenUrl</Code> per query in Admin UI</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <div className="font-medium text-gray-700 mb-1">Windows Auth Flow:</div>
            <pre className="font-mono text-[10px] text-gray-500">{`User (AD login) → Browser → IIS (Windows Auth) → UI (:3001) → Engine (:4001)
  → Engine forwards user's cookies/Authorization header → Tenant API (Windows Auth)`}</pre>
            <p className="mt-2">The user authenticates once via IIS Windows Auth. The Engine transparently forwards their credentials to any query with <Code>authType: &quot;windows&quot;</Code>.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mt-3">
            <div className="font-medium text-gray-700 mb-1">BAM Auth Flow:</div>
            <pre className="font-mono text-[10px] text-gray-500">{`Engine → POST bamTokenUrl → { code, message, bamToken, redirectURL }
Engine → GET/POST actual API endpoint with X-BAM-Token: <bamToken> header → data`}</pre>
            <p className="mt-2">BAM tokens are cached for ~5 minutes to avoid repeated token calls.</p>
          </div>
        </Section>

        <Section title="6. Start Services with PM2">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">Demo</Badge>
                <span className="text-sm font-medium text-gray-700">All 3 services (mock data)</span>
              </div>
              <CmdBlock>{`# Start Mock API (demo only)
pm2 start services\\mock-api\\server.js --name mock-api

# Start Engine
pm2 start services\\engine\\dist\\server.js --name chatbot-engine

# Start UI
pm2 start .next\\standalone\\server.js --name chatbot-ui

# Save configuration
pm2 save`}</CmdBlock>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="red">Production</Badge>
                <span className="text-sm font-medium text-gray-700">UI + Engine only (real APIs)</span>
              </div>
              <CmdBlock>{`# Start Engine (connects to real tenant APIs)
pm2 start services\\engine\\dist\\server.js --name chatbot-engine

# Start UI
pm2 start .next\\standalone\\server.js --name chatbot-ui

# Save and auto-start on boot
pm2 save
pm2-startup install`}</CmdBlock>
            </div>
          </div>
        </Section>

        <Section title="Alternative: NSSM Service Manager">
          <p className="text-sm text-gray-600 mb-3">
            Instead of PM2, you can use <a href="https://nssm.cc/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">NSSM</a> (Non-Sucking Service Manager) to run Node.js processes as native Windows services with auto-restart, log rotation, and system tray management. See the full NSSM setup in <Code>docs/SETUP.md</Code> → &quot;Windows Deployment with NSSM&quot; section.
          </p>
          <CmdBlock>{`# Install Engine as Windows service
nssm install ChatbotEngine "C:\\Program Files\\nodejs\\node.exe"
nssm set ChatbotEngine AppParameters "dist\\server.js"
nssm set ChatbotEngine AppDirectory "C:\\chatbot\\services\\engine"

# Install UI as Windows service
nssm install ChatbotUI "C:\\Program Files\\nodejs\\node.exe"
nssm set ChatbotUI AppParameters ".next\\standalone\\server.js"
nssm set ChatbotUI AppDirectory "C:\\chatbot"

# Start services
nssm start ChatbotEngine
nssm start ChatbotUI`}</CmdBlock>
        </Section>

        <Section title="7. Configure IIS Reverse Proxy">
          <p className="text-sm text-gray-600 mb-3">Use IIS as a reverse proxy to route HTTP/HTTPS traffic to the Node.js services.</p>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Step A: Enable IIS features</div>
              <CmdBlock label="PowerShell (Administrator)">{`# Enable IIS with required modules
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering

# Install URL Rewrite Module (download from iis.net)
# Install Application Request Routing (ARR) (download from iis.net)`}</CmdBlock>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Step B: Enable Windows Authentication in IIS</div>
              <p className="text-xs text-gray-600 mb-2">Required for Windows Auth per-query authentication:</p>
              <CmdBlock label="PowerShell (Administrator)">{`# Enable Windows Auth feature
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WindowsAuthentication

# In IIS Manager:
# 1. Select your site → Authentication
# 2. Enable "Windows Authentication"
# 3. Disable "Anonymous Authentication" (if you want all users authenticated)
# 4. Or keep both enabled (Anonymous for public, Windows for API calls)`}</CmdBlock>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Step C: Enable ARR Proxy</div>
              <p className="text-xs text-gray-600 mb-2">In IIS Manager: Server &rarr; Application Request Routing &rarr; Server Proxy Settings &rarr; Enable proxy</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Step D: Add URL Rewrite rules</div>
              <p className="text-xs text-gray-600 mb-2">Create a <code className="bg-gray-100 px-1 rounded">web.config</code> in your IIS site root:</p>
              <CmdBlock>{`<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ChatbotUI" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3001/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>`}</CmdBlock>
            </div>
          </div>
        </Section>

        <Section title="8. SSL Certificate">
          <p className="text-sm text-gray-600 mb-3">Bind an SSL certificate to the IIS site for HTTPS access.</p>
          <CmdBlock label="PowerShell">{`# Import a PFX certificate
Import-PfxCertificate -FilePath C:\\certs\\chatbot.pfx \\
  -CertStoreLocation Cert:\\LocalMachine\\My \\
  -Password (ConvertTo-SecureString -String "cert-password" -Force -AsPlainText)

# Or use a self-signed cert for internal testing
New-SelfSignedCertificate -DnsName "chatbot.corp.com" \\
  -CertStoreLocation Cert:\\LocalMachine\\My`}</CmdBlock>
        </Section>

        <Section title="9. Windows Firewall">
          <CmdBlock label="PowerShell (Administrator)">{`# Allow inbound on port 80 (HTTP) and 443 (HTTPS)
New-NetFirewallRule -DisplayName "Chatbot HTTP" \\
  -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Chatbot HTTPS" \\
  -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# For direct access (testing only):
New-NetFirewallRule -DisplayName "Chatbot UI Direct" \\
  -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "Chatbot Engine Direct" \\
  -Direction Inbound -Protocol TCP -LocalPort 4001 -Action Allow`}</CmdBlock>
        </Section>

        <Section title="10. Monitoring and Management">
          <CmdBlock>{`# Check running services
pm2 list

# View logs
pm2 logs chatbot-engine
pm2 logs chatbot-ui

# Monitor CPU/memory
pm2 monit

# Restart services
pm2 restart all

# Stop a service
pm2 stop chatbot-engine`}</CmdBlock>
        </Section>

        <Section title="ML Data Directories">
          <p className="text-sm text-gray-600 mb-3">
            The Engine stores ML data (semantic search indexes, learning models, anomaly baselines, and user preferences)
            under <Code>services\engine\data\</Code>. On Windows, use backslash paths:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-600 mb-3">
            <pre className="whitespace-pre-wrap">{`C:\\chatbot\\services\\engine\\data\\
├── indexes\\              # Semantic search indexes (TF-IDF vectors)
├── learning\\             # Collaborative filtering and interaction logs
│   ├── default\\          # Default group learning data
│   └── <group>\\          # Per-group learning data
├── anomaly\\              # Anomaly detection baselines and alerts
└── preferences\\          # User preference profiles for recommendations`}</pre>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="font-medium">Important:</span> Back up the <Code>services\engine\data\</Code> directory before upgrades or migrations.
            These directories contain learned models and baselines that are rebuilt from interaction history.
            Losing this data resets ML features to their initial state.
          </div>
        </Section>

        <Section title="Troubleshooting">
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-700">Port already in use</div>
              <div className="text-xs text-gray-600 mt-1">
                Run <code className="bg-gray-100 px-1 rounded">netstat -ano | findstr :3000</code> to find the process, then <code className="bg-gray-100 px-1 rounded">taskkill /PID &lt;pid&gt; /F</code>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-700">IIS 502 Bad Gateway</div>
              <div className="text-xs text-gray-600 mt-1">Ensure PM2 services are running: <code className="bg-gray-100 px-1 rounded">pm2 list</code>. Check ARR proxy is enabled in IIS.</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-700">PM2 services don&apos;t auto-start</div>
              <div className="text-xs text-gray-600 mt-1">Run <code className="bg-gray-100 px-1 rounded">pm2-startup install</code> as Administrator, then <code className="bg-gray-100 px-1 rounded">pm2 save</code></div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-700">Windows Auth not working for queries</div>
              <div className="text-xs text-gray-600 mt-1">
                Ensure IIS has Windows Authentication enabled (Step 7B). Verify the query has <code className="bg-gray-100 px-1 rounded">authType: &quot;windows&quot;</code>.
                Check that the user&apos;s browser is sending NTLM/Kerberos headers (use browser dev tools &rarr; Network tab).
                The Engine forwards these headers to the tenant API.
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-700">BAM token fetch failing</div>
              <div className="text-xs text-gray-600 mt-1">
                Check the <code className="bg-gray-100 px-1 rounded">bamTokenUrl</code> is reachable from the Engine host.
                Verify the BAM endpoint returns <code className="bg-gray-100 px-1 rounded">{`{ code, message, bamToken, redirectURL }`}</code>.
                Check Engine logs: <code className="bg-gray-100 px-1 rounded">pm2 logs chatbot-engine</code>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-semibold text-red-700">Environment variables not loading</div>
              <div className="text-xs text-gray-600 mt-1">
                If using <Code>.env.prod</Code> file, ensure PM2 is started from the project root directory.
                If using system env vars, restart the PowerShell session after setting them.
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
