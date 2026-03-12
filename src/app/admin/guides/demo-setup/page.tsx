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

export default function DemoSetupGuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/guides" className="text-xs text-blue-600 hover:underline">&larr; All Guides</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Demo Setup Guide</h1>
        <p className="text-sm text-gray-500">Steps to run all 3 services locally for demo and development</p>
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

        <Section title="Option A: Quick Start (All 3 Services)">
          <p className="text-sm text-gray-600 mb-3">Start all three services with a single command using concurrently.</p>
          <CmdBlock>{`# Clone and install
git clone <repo-url> chatbot
cd chatbot

# Install root + service dependencies
npm install
cd services/engine && npm install && cd ../..
cd services/mock-api && npm install && cd ../..

# Start all 3 services
npm run dev:3service`}</CmdBlock>
          <p className="text-xs text-gray-500">This starts Mock API (:8080), Engine (:4000), and UI (:3000) in parallel with color-coded logs.</p>
        </Section>

        <Section title="Option B: Start Services Individually">
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
# → Engine server running at http://localhost:4000`}</CmdBlock>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge color="yellow">Step 3</Badge>
                <span className="text-sm font-medium text-gray-700">Start UI (port 3000)</span>
              </div>
              <CmdBlock>{`# From project root
ENGINE_URL=http://localhost:4000 npm run dev
# → UI available at http://localhost:3000`}</CmdBlock>
            </div>
          </div>
        </Section>

        <Section title="Option C: Monolith Mode (All-in-One)">
          <p className="text-sm text-gray-600 mb-3">Run UI + Engine as a single Next.js process with the mock API alongside. This is the original setup.</p>
          <CmdBlock>{`npm install
npm run dev:monolith
# → Chat: http://localhost:3000
# → Admin: http://localhost:3000/admin
# → Mock API: http://localhost:8080`}</CmdBlock>
        </Section>

        <Section title="Option D: Docker Compose">
          <CmdBlock>{`# Build and start all 3 containers
docker compose up --build

# Access:
#   UI:       http://localhost:3000
#   Engine:   http://localhost:4000
#   Mock API: http://localhost:8080`}</CmdBlock>
        </Section>

        <Section title="Verify the Setup">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <div>
                <span className="font-medium">Health check:</span>{' '}
                <code className="text-xs bg-gray-100 px-1 rounded">curl http://localhost:4000/api/health</code>
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
                <span className="font-medium">Chat UI:</span> Open <code className="text-xs bg-gray-100 px-1 rounded">http://localhost:3000</code>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">&#10003;</span>
              <div>
                <span className="font-medium">Admin Portal:</span> Open <code className="text-xs bg-gray-100 px-1 rounded">http://localhost:3000/admin</code>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Environment Variables">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead><tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Variable</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Service</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Default</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Description</th>
              </tr></thead>
              <tbody className="text-gray-700">
                <tr><td className="px-3 py-1.5 border-b font-mono">ENGINE_URL</td><td className="px-3 py-1.5 border-b">UI</td><td className="px-3 py-1.5 border-b">(none)</td><td className="px-3 py-1.5 border-b">Engine API URL. If unset, uses built-in routes.</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-1.5 border-b font-mono">ENGINE_PORT</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b">4000</td><td className="px-3 py-1.5 border-b">Port the Engine listens on</td></tr>
                <tr><td className="px-3 py-1.5 border-b font-mono">API_BASE_URL</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b">http://localhost:8080/api</td><td className="px-3 py-1.5 border-b">Base URL for data API (Mock or real)</td></tr>
                <tr className="bg-gray-50"><td className="px-3 py-1.5 border-b font-mono">API_TOKEN</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b">(none)</td><td className="px-3 py-1.5 border-b">Bearer token for data API auth</td></tr>
                <tr><td className="px-3 py-1.5 border-b font-mono">UI_ORIGIN</td><td className="px-3 py-1.5 border-b">Engine</td><td className="px-3 py-1.5 border-b">http://localhost:3000</td><td className="px-3 py-1.5 border-b">CORS allowed origin</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
