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
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>{children}</span>;
}

function ServiceCard({ number, name, port, color, description }: { number: number; name: string; port: number; color: string; description: string }) {
  return (
    <div className={`p-4 rounded-lg border-2 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center">{number}</span>
        <span className="text-sm font-semibold text-gray-800">{name}</span>
        <Badge color="blue">:{port}</Badge>
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">{children}</code>;
}

export default function DemoSetupGuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/guides" className="text-xs text-blue-600 hover:underline">&larr; All Guides</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Demo Setup Guide</h1>
        <p className="text-sm text-gray-500">Steps to run the platform locally with mock data for demo and development</p>
        <Badge color="green">Developers</Badge>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Section title="Architecture Overview">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ServiceCard number={1} name="UI" port={3000} color="border-blue-200 bg-blue-50" description="Next.js frontend — admin portal, chat interface, widget" />
            <ServiceCard number={2} name="Engine" port={4000} color="border-purple-200 bg-purple-50" description="Express API — NLP pipeline, query execution, admin CRUD" />
            <ServiceCard number={3} name="Mock API" port={8080} color="border-amber-200 bg-amber-50" description="JSON Server — sample data for Finance, Analytics, Engineering" />
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
            <p><strong>Flow:</strong> User &rarr; UI (:3000) &rarr; Engine (:4000) &rarr; Mock API (:8080) &rarr; Sample data</p>
            <p className="mt-1">In production, Mock API is replaced by real tenant APIs with their own authentication.</p>
          </div>
        </Section>

        <Section title="Prerequisites">
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Node.js</div>
              <div className="text-xs text-gray-500">v18 or later</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">npm</div>
              <div className="text-xs text-gray-500">v9 or later (comes with Node.js)</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Git</div>
              <div className="text-xs text-gray-500">For cloning the repository</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Ports 3000, 4000 &amp; 8080</div>
              <div className="text-xs text-gray-500">Must be available</div>
            </div>
          </div>
        </Section>

        <Section title="1. Environment File Setup">
          <p className="text-sm text-gray-600 mb-3">
            The mock environment uses <Code>.env.mock</Code> which configures the platform to use the local Mock API
            and a fake &quot;Local Developer&quot; user (no AD/SSO required).
          </p>
          <CmdBlock>{`# Copy the example and use defaults (works out of the box)
cp .env.example .env.mock`}</CmdBlock>
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 mb-3">
            <div className="font-medium text-gray-700 mb-1">Default .env.mock values:</div>
            <table className="w-full">
              <tbody>
                <tr><td className="font-mono py-0.5 pr-3">NODE_ENV</td><td>development</td></tr>
                <tr><td className="font-mono py-0.5 pr-3">API_BASE_URL</td><td>http://localhost:8080/api (Mock API)</td></tr>
                <tr><td className="font-mono py-0.5 pr-3">USER_INFO_URL</td><td><em>empty</em> &rarr; falls back to &quot;Local Developer&quot; mock user</td></tr>
                <tr><td className="font-mono py-0.5 pr-3">ENGINE_URL</td><td><em>empty</em> for monolith, or http://localhost:4001 for 3-service</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="2. Install Dependencies">
          <CmdBlock>{`# Clone and install
git clone <repo-url> chatbot
cd chatbot

# Install root + service dependencies
npm install
cd services/engine && npm install && cd ../..
cd services/mock-api && npm install && cd ../..`}</CmdBlock>
        </Section>

        <Section title="3. Option A: Quick Start — All 3 Services">
          <p className="text-sm text-gray-600 mb-3">Start Mock API + Engine + UI with a single command. Uses <Code>.env.mock</Code> via dotenv-cli.</p>
          <CmdBlock>{`npm run dev:mock:3svc`}</CmdBlock>
          <p className="text-xs text-gray-500">This starts Mock API (:8080), Engine (:4000), and UI (:3000) in parallel with color-coded logs.</p>
        </Section>

        <Section title="3. Option B: Quick Start — Monolith Mode">
          <p className="text-sm text-gray-600 mb-3">Run UI + Engine as a single Next.js process with the Mock API alongside. Simpler for local development.</p>
          <CmdBlock>{`npm run dev:mock`}</CmdBlock>
          <p className="text-xs text-gray-500">Starts Mock API (:8080) + UI (:3000) in monolith mode (no separate Engine process).</p>
        </Section>

        <Section title="3. Option C: Start Services Individually">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="yellow">Step 1</Badge>
                <span className="text-sm font-medium text-gray-700">Start Mock API (port 8080)</span>
              </div>
              <CmdBlock>{`cd services/mock-api
npm install
npm start
# → Mock API server running at http://localhost:8080`}</CmdBlock>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="yellow">Step 2</Badge>
                <span className="text-sm font-medium text-gray-700">Start Engine (port 4000)</span>
              </div>
              <CmdBlock>{`cd services/engine
npm install
npm run dev
# → Engine server running at http://localhost:4001`}</CmdBlock>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="yellow">Step 3</Badge>
                <span className="text-sm font-medium text-gray-700">Start UI (port 3000)</span>
              </div>
              <CmdBlock>{`# From project root — load env file
dotenv -e .env.mock -- npx next dev
# → UI available at http://localhost:3001`}</CmdBlock>
            </div>
          </div>
        </Section>

        <Section title="3. Option D: Docker Compose">
          <CmdBlock>{`# Build and start all 3 containers (uses docker-compose.yml)
docker compose up --build

# Access:
#   UI:       http://localhost:3001
#   Engine:   http://localhost:4001
#   Mock API: http://localhost:8080`}</CmdBlock>
        </Section>

        <Section title="4. Verify the Setup">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <div>
                <span className="font-medium">Health check:</span>{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">curl http://localhost:4001/api/health</code>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <div>
                <span className="font-medium">Mock API:</span>{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">curl http://localhost:8080/api/queries</code>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <div>
                <span className="font-medium">Chat UI:</span> Open <code className="text-xs bg-gray-100 px-1 rounded">http://localhost:3001</code> — should show &quot;Local Developer&quot; logged in
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <div>
                <span className="font-medium">Admin Portal:</span> Open <code className="text-xs bg-gray-100 px-1 rounded">http://localhost:3001/admin</code> — &quot;Local Developer&quot; has admin access
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <div>
                <span className="font-medium">Test chat:</span> Type &quot;run monthly_revenue&quot; to verify query execution with mock data
              </div>
            </div>
          </div>
        </Section>

        <Section title="5. Per-Query Authentication (Mock)">
          <p className="text-sm text-gray-600 mb-3">
            In mock mode, sample queries demonstrate all authentication types. Each query has an <Code>authType</Code> field:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead><tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Auth Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Mock Behavior</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Production Behavior</th>
              </tr></thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="green">none</Badge></td>
                  <td className="px-3 py-2 border-b">No auth headers sent (default)</td>
                  <td className="px-3 py-2 border-b">Same — open API, no auth needed</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="blue">bearer</Badge></td>
                  <td className="px-3 py-2 border-b">Uses global <Code>API_TOKEN</Code> from env</td>
                  <td className="px-3 py-2 border-b">Sends Authorization: Bearer header</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border-b"><Badge color="purple">windows</Badge></td>
                  <td className="px-3 py-2 border-b">Forwards mock user cookies (passthrough)</td>
                  <td className="px-3 py-2 border-b">Forwards logged-in user&apos;s AD/Kerberos credentials</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b"><Badge color="red">bam</Badge></td>
                  <td className="px-3 py-2 border-b">Calls mock <Code>/api/bam/token</Code>, uses token in request</td>
                  <td className="px-3 py-2 border-b">Calls real BAM URL, gets token, sends X-BAM-Token header</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            In Admin &rarr; Groups &rarr; Queries, each query has an &quot;Auth Type&quot; dropdown and optional BAM Token URL field.
          </p>
        </Section>

        <Section title="NPM Scripts Reference">
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`npm run dev:mock       # Mock API + UI (monolith, sample data)
npm run dev:mock:3svc  # Mock API + Engine + UI (3-service, sample data)
npm run dev            # Engine + UI (real APIs, requires .env.dev)
npm run start:demo     # Production build with mock data
npm run start:prod     # Production build with real APIs`}</pre>
          </div>
        </Section>

        <Section title="Environment Variables">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead><tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Variable</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Service</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Mock Default</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Description</th>
              </tr></thead>
              <tbody className="text-gray-700">
                <tr><td className="px-3 py-1.5 border-b font-mono">ENGINE_URL</td><td className="px-3 py-1.5 border-b">UI</td><td className="px-3 py-1.5 border-b"><em>empty</em> (monolith)</td><td className="px-3 py-1.5 border-b">Set to http://localhost:4001 for 3-service mode</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-1.5 border-b font-mono">ENGINE_PORT</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b">4000</td><td className="px-3 py-1.5 border-b">Port the Engine listens on</td></tr>
                <tr><td className="px-3 py-1.5 border-b font-mono">API_BASE_URL</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b">http://localhost:8080/api</td><td className="px-3 py-1.5 border-b">Points to Mock API for demo</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-1.5 border-b font-mono">API_TOKEN</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b"><em>empty</em></td><td className="px-3 py-1.5 border-b">Global bearer token (not needed for mock)</td></tr>
                <tr><td className="px-3 py-1.5 border-b font-mono">USER_INFO_URL</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b"><em>empty</em></td><td className="px-3 py-1.5 border-b">Empty = mock user &quot;Local Developer&quot;</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-1.5 border-b font-mono">UI_ORIGIN</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b">http://localhost:3001</td><td className="px-3 py-1.5 border-b">CORS allowed origin</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Full reference: see <Code>.env.example</Code> or Admin &rarr; Guides &rarr; Config Guide &rarr; Section 1.
          </p>
        </Section>
      </div>
    </div>
  );
}
