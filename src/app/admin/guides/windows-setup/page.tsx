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

# Build UI
npm run build

# Build Engine
cd services\\engine
npm run build
cd ..\\..`}</CmdBlock>
        </Section>

        <Section title="4. Configure Environment Variables">
          <CmdBlock label="PowerShell — Set system-wide env vars">{`# For Engine
[System.Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
[System.Environment]::SetEnvironmentVariable("ENGINE_PORT", "4000", "Machine")
[System.Environment]::SetEnvironmentVariable("API_BASE_URL", "https://your-api.corp.com/api", "Machine")
[System.Environment]::SetEnvironmentVariable("API_TOKEN", "your-token", "Machine")
[System.Environment]::SetEnvironmentVariable("UI_ORIGIN", "http://localhost:3000", "Machine")

# For UI
[System.Environment]::SetEnvironmentVariable("ENGINE_URL", "http://localhost:4000", "Machine")`}</CmdBlock>
          <p className="text-xs text-gray-500">For demo, set <code className="bg-gray-100 px-1 rounded">API_BASE_URL=http://localhost:8080/api</code></p>
        </Section>

        <Section title="5. Start Services with PM2">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="green">Demo</Badge>
                <span className="text-sm font-medium text-gray-700">All 3 services</span>
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
                <span className="text-sm font-medium text-gray-700">UI + Engine only</span>
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

        <Section title="6. Configure IIS Reverse Proxy">
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
              <div className="text-xs font-semibold text-gray-700 mb-1">Step B: Enable ARR Proxy</div>
              <p className="text-xs text-gray-600 mb-2">In IIS Manager: Server &rarr; Application Request Routing &rarr; Server Proxy Settings &rarr; Enable proxy</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Step C: Add URL Rewrite rules</div>
              <p className="text-xs text-gray-600 mb-2">Create a <code className="bg-gray-100 px-1 rounded">web.config</code> in your IIS site root:</p>
              <CmdBlock>{`<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ChatbotUI" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>`}</CmdBlock>
            </div>
          </div>
        </Section>

        <Section title="7. SSL Certificate">
          <p className="text-sm text-gray-600 mb-3">Bind an SSL certificate to the IIS site for HTTPS access.</p>
          <CmdBlock label="PowerShell">{`# Import a PFX certificate
Import-PfxCertificate -FilePath C:\\certs\\chatbot.pfx \\
  -CertStoreLocation Cert:\\LocalMachine\\My \\
  -Password (ConvertTo-SecureString -String "cert-password" -Force -AsPlainText)

# Or use a self-signed cert for internal testing
New-SelfSignedCertificate -DnsName "chatbot.corp.com" \\
  -CertStoreLocation Cert:\\LocalMachine\\My`}</CmdBlock>
        </Section>

        <Section title="8. Windows Firewall">
          <CmdBlock label="PowerShell (Administrator)">{`# Allow inbound on port 80 (HTTP) and 443 (HTTPS)
New-NetFirewallRule -DisplayName "Chatbot HTTP" \\
  -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Chatbot HTTPS" \\
  -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# For direct access (testing only):
New-NetFirewallRule -DisplayName "Chatbot UI Direct" \\
  -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "Chatbot Engine Direct" \\
  -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow`}</CmdBlock>
        </Section>

        <Section title="9. Monitoring and Management">
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
              <div className="text-xs font-semibold text-red-700">Windows Auth not working</div>
              <div className="text-xs text-gray-600 mt-1">Ensure the Engine service account has access to the tenant API. For NTLM, install <code className="bg-gray-100 px-1 rounded">httpntlm</code> package in the Engine.</div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
