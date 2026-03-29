"use client";

import Link from "next/link";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">
      {children}
    </code>
  );
}

function FileRef({ path }: { path: string }) {
  return (
    <span className="font-mono text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
      {path}
    </span>
  );
}

export default function ConfigGuidePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/guides"
          className="text-xs text-blue-600 hover:underline"
        >
          &larr; All Guides
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">
          Configuration Guide
        </h1>
        <p className="text-sm text-gray-500">
          For developers and admins — how to configure the bot platform
        </p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          Developers & Admins
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Section title="1. Environment Setup">
          <p className="text-sm text-gray-600 mb-3">
            The platform supports three environments. Each uses a dedicated{" "}
            <Code>.env</Code> file to control authentication, data sources, and
            service topology.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Environment Comparison
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600"></th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Mock
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Dev
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Prod
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Env file</td>
                  <td className="px-3 py-2 font-mono">.env.mock</td>
                  <td className="px-3 py-2 font-mono">.env.dev</td>
                  <td className="px-3 py-2 font-mono">.env.prod</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">User login</td>
                  <td className="px-3 py-2">
                    Fake &quot;Local Developer&quot;
                  </td>
                  <td className="px-3 py-2">Real AD / SSO</td>
                  <td className="px-3 py-2">Real AD / SSO</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Data source</td>
                  <td className="px-3 py-2">Mock API (:8080)</td>
                  <td className="px-3 py-2">Real org APIs</td>
                  <td className="px-3 py-2">Real org APIs</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Engine</td>
                  <td className="px-3 py-2">Optional (monolith OK)</td>
                  <td className="px-3 py-2">Local (:4000)</td>
                  <td className="px-3 py-2">Docker (:4000)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">npm command</td>
                  <td className="px-3 py-2 font-mono">dev:mock</td>
                  <td className="px-3 py-2 font-mono">dev</td>
                  <td className="px-3 py-2 font-mono">start:prod</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Docker</td>
                  <td className="px-3 py-2 font-mono">docker compose up</td>
                  <td className="px-3 py-2 font-mono">
                    docker compose -f docker-compose.dev.yml up
                  </td>
                  <td className="px-3 py-2 font-mono">
                    docker compose -f docker-compose.prod.yml up
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Environment Variables Reference
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Variable
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Purpose
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Mock
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Dev / Prod
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">NODE_ENV</td>
                  <td className="px-3 py-2">Runtime mode</td>
                  <td className="px-3 py-2">development</td>
                  <td className="px-3 py-2">development / production</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">ENGINE_URL</td>
                  <td className="px-3 py-2">Enables 3-service mode</td>
                  <td className="px-3 py-2">
                    <em>empty</em> (monolith)
                  </td>
                  <td className="px-3 py-2">http://localhost:4001</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">USER_INFO_URL</td>
                  <td className="px-3 py-2">AD/SSO endpoint</td>
                  <td className="px-3 py-2">
                    <em>empty</em> (mock user)
                  </td>
                  <td className="px-3 py-2">Your org SSO URL</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">API_BASE_URL</td>
                  <td className="px-3 py-2">Tenant data API</td>
                  <td className="px-3 py-2">http://localhost:8080/api</td>
                  <td className="px-3 py-2">Your org API URL</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">API_TOKEN</td>
                  <td className="px-3 py-2">Bearer token for APIs</td>
                  <td className="px-3 py-2">
                    <em>empty</em>
                  </td>
                  <td className="px-3 py-2">Your API token</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">ENGINE_API_KEY</td>
                  <td className="px-3 py-2">Secures engine admin API</td>
                  <td className="px-3 py-2">
                    <em>empty</em>
                  </td>
                  <td className="px-3 py-2">Required in prod</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">UI_ORIGIN</td>
                  <td className="px-3 py-2">CORS allowed origin</td>
                  <td className="px-3 py-2">http://localhost:3001</td>
                  <td className="px-3 py-2">Your prod domain</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">FILE_BASE_DIR</td>
                  <td className="px-3 py-2">
                    Base directory for CSV/XLSX file paths
                  </td>
                  <td className="px-3 py-2">
                    <em>empty</em>
                  </td>
                  <td className="px-3 py-2">{"//server/shared/reports"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Quick Start: Mock Environment
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Copy <Code>.env.example</Code> to <Code>.env.mock</Code>{" "}
                (defaults work out of the box)
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Run <Code>npm install</Code> in root and{" "}
                <Code>services/engine</Code> and <Code>services/mock-api</Code>
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>
                Run <Code>npm run dev:mock</Code> &mdash; opens at{" "}
                <Code>http://localhost:3001</Code>
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span>
                Login shows &quot;Local Developer&quot; with admin access. All
                sample data available.
              </span>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Quick Start: Dev Environment (Real APIs)
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Copy <Code>.env.example</Code> to <Code>.env.dev</Code>
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Set <Code>USER_INFO_URL</Code> to your org&apos;s AD/SSO
                userinfo endpoint
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>
                Set <Code>API_BASE_URL</Code> and <Code>API_TOKEN</Code> to your
                org&apos;s data API
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span>
                Set <Code>ENGINE_URL=http://localhost:4001</Code> for 3-service
                mode
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                5
              </span>
              <span>
                Run <Code>npm run dev</Code> &mdash; engine + UI start together
              </span>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Quick Start: Production Deployment
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Copy <Code>.env.example</Code> to <Code>.env.prod</Code> and
                fill in all production values
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Set <Code>ENGINE_API_KEY</Code> to a secure random string
                (required for admin API security)
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>
                Set <Code>UI_ORIGIN</Code> to your production domain for CORS
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span>
                Run <Code>docker compose -f docker-compose.prod.yml up -d</Code>
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-3">
            <span className="font-medium">Security:</span> Never commit{" "}
            <Code>.env.mock</Code>, <Code>.env.dev</Code>, or{" "}
            <Code>.env.prod</Code> to git. Only <Code>.env.example</Code> (the
            template) is tracked. Env files with secrets are excluded via{" "}
            <Code>.gitignore</Code>.
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <div className="text-xs font-medium text-gray-700 mb-2">
              NPM Scripts Summary
            </div>
            <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`npm run dev:mock       # Mock API + UI (monolith, sample data)
npm run dev:mock:3svc  # Mock API + Engine + UI (3-service, sample data)
npm run dev            # Engine + UI (real APIs, requires .env.dev)
npm run start:demo     # Production build, mock data
npm run start:prod     # Production build, real APIs`}</pre>
          </div>
        </Section>

        <Section title="2. Group Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Groups define isolated bot instances. Each group has its own
            queries, training data, templates, and data sources.
          </p>

          <div className="text-xs text-gray-500 mb-2">
            Config file: <FileRef path="src/config/groups.json" />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`{
  "groups": {
    "finance": {
      "name": "Finance Bot",
      "description": "Revenue, orders, and financial metrics",
      "sources": ["finance", "commerce"],
      "apiBaseUrl": null,
      "corpus": "corpus-finance.json",
      "faq": "faq-finance.json",
      "templates": {
        "greeting": ["Hello! I'm the Finance Bot..."],
        "help": ["I can help you with revenue..."]
      }
    }
  }
}`}</pre>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Field
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">name</td>
                  <td className="px-3 py-2">
                    Display name shown in group selector
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">sources</td>
                  <td className="px-3 py-2">
                    Filter which queries are available (empty = all)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">corpus</td>
                  <td className="px-3 py-2">
                    NLP training data file in <Code>src/training/groups/</Code>
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">faq</td>
                  <td className="px-3 py-2">
                    Fuzzy match FAQ file in <Code>src/training/groups/</Code>
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">templates</td>
                  <td className="px-3 py-2">
                    Override base response templates per intent
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">apiBaseUrl</td>
                  <td className="px-3 py-2">
                    Custom API base URL (null = use default)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            You can also manage groups via Admin &rarr; Groups, or Admin &rarr;
            Add Group.
          </p>
        </Section>

        <Section title="3. Query Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Queries define what data the bot can fetch. Each query maps to a
            data source type.
          </p>

          <div className="text-xs text-gray-500 mb-2">
            Config file: <FileRef path="mock-api/db.json" /> (queries array)
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`{
  "id": "q1",
  "name": "monthly_revenue",
  "description": "Monthly revenue breakdown",
  "type": "api",
  "endpoint": "/finance/revenue/{region}",
  "url": "https://confluence.example.com/wiki/...",
  "source": "finance",
  "estimatedDuration": 3200,
  "filters": [
    { "key": "date_range", "binding": "body" },
    { "key": "region", "binding": "path" }
  ]
}`}</pre>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">API Query</div>
              <div>
                Set <Code>type: &quot;api&quot;</Code> and provide{" "}
                <Code>endpoint</Code>. Filter bindings: body, query_param, path.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">
                Document Query
              </div>
              <div>
                Set <Code>type: &quot;document&quot;</Code> and provide{" "}
                <Code>file</Code> path in <Code>data/knowledge/</Code>.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">CSV Query</div>
              <div>
                Set <Code>type: &quot;csv&quot;</Code> and provide{" "}
                <Code>filePath</Code>. Auto-detects delimiter (comma, tab,
                semicolon, pipe). Supports aggregation.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">XLSX Query</div>
              <div>
                Set <Code>type: &quot;xlsx&quot;</Code> and provide{" "}
                <Code>filePath</Code>. Multi-sheet workbooks auto-register as
                separate queries. Optional <Code>fileBaseDir</Code> for shared
                folders.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">URL Query</div>
              <div>
                Set <Code>type: &quot;url&quot;</Code> and provide{" "}
                <Code>url</Code> to return as a link.
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Per-Query Authentication
          </div>
          <p className="text-xs text-gray-600 mb-2">
            Each API query can independently specify how it authenticates with
            the backend data API. Set <Code>authType</Code> in the query config
            or via the Admin UI dropdown.
          </p>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Auth Type
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    How It Works
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Extra Fields
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">none</td>
                  <td className="px-3 py-2">
                    Uses global <Code>API_TOKEN</Code> from env (or no auth in
                    mock mode). Default.
                  </td>
                  <td className="px-3 py-2">&mdash;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">bearer</td>
                  <td className="px-3 py-2">
                    Same as &quot;none&quot; &mdash; uses <Code>API_TOKEN</Code>{" "}
                    as Bearer header.
                  </td>
                  <td className="px-3 py-2">&mdash;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">windows</td>
                  <td className="px-3 py-2">
                    Forwards the logged-in user&apos;s AD/Windows auth headers
                    (Authorization, Cookie) to the backend API. No extra token
                    call needed.
                  </td>
                  <td className="px-3 py-2">&mdash;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">bam</td>
                  <td className="px-3 py-2">
                    Two-step: (1) POST to <Code>bamTokenUrl</Code> to get a BAM
                    token, (2) use the token as <Code>X-BAM-Token</Code> header
                    on the actual data API call. Tokens are cached for 5 min.
                  </td>
                  <td className="px-3 py-2">
                    <Code>bamTokenUrl</Code> (required)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Example: BAM-authenticated query
            </div>
            <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`{
  "name": "bam_report",
  "type": "api",
  "authType": "bam",
  "bamTokenUrl": "https://auth.company.com/bam/token",
  "endpoint": "/finance/revenue/{region}",
  "filters": [...]
}`}</pre>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mb-3">
            <span className="font-medium">BAM Token Response:</span> The BAM
            endpoint must return
            <Code>{`{ code: "success", message: "success", bamToken: "...", redirectURL: "..." }`}</Code>
          </div>

          <p className="text-xs text-gray-400">
            Manage queries via Admin &rarr; Groups &rarr; [group] &rarr; Queries
            tab.
          </p>
        </Section>

        <Section title="4. Combined Queries (Joins)">
          <p className="text-sm text-gray-600 mb-3">
            Combined queries join data from two or more sub-queries into a
            single result set using a hash-join algorithm. Use them to correlate
            data across different sources — for example, joining error rates
            from one API with latency metrics from another, or combining CSV and
            XLSX data.
          </p>

          <div className="text-xs text-gray-500 mb-3">
            Schema:{" "}
            <FileRef path="services/engine/src/core/api-connector/types.ts" /> |
            Join engine:{" "}
            <FileRef path="services/engine/src/core/api-connector/join-engine.ts" />
          </div>

          <div className="text-sm font-medium text-gray-700 mb-2">
            combinedConfig Schema
          </div>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Field
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Type
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  [
                    "subQueries[].queryName",
                    "string (required)",
                    "Name of an existing query to execute as a sub-query",
                  ],
                  [
                    "subQueries[].prefix",
                    "string (optional)",
                    'Column prefix to avoid naming conflicts (e.g. "err", "perf")',
                  ],
                  [
                    "subQueries[].filters",
                    "Record<string,string>",
                    "Per-query filter overrides applied at execution time",
                  ],
                  [
                    "subQueries[].maxRows",
                    "number (optional)",
                    "Limit rows per sub-query before joining (prevents memory issues with large files)",
                  ],
                  [
                    "joinType",
                    'enum (default: "inner")',
                    "Join type: inner, left, right, or full",
                  ],
                  [
                    "joinKeys.left",
                    "string (required)",
                    "Column name from the first (left) sub-query result to join on",
                  ],
                  [
                    "joinKeys.right",
                    "string (required)",
                    "Column name from the second (right) sub-query result to join on",
                  ],
                  [
                    "additionalJoins[]",
                    "array (optional)",
                    "For 3+ way joins — each entry has joinType, leftKey, and rightKey",
                  ],
                ].map(([field, type, desc]) => (
                  <tr key={field} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{field}</td>
                    <td className="px-3 py-2">{type}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-sm font-medium text-gray-700 mb-2">
            Join Types
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Inner Join</div>
              <div>
                Only rows with matching keys in both datasets. Default behavior.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Left Join</div>
              <div>
                All rows from the left dataset. Unmatched right columns are
                null.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Right Join</div>
              <div>
                All rows from the right dataset. Unmatched left columns are
                null.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">
                Full Outer Join
              </div>
              <div>
                All rows from both datasets. Unmatched columns are null on
                either side.
              </div>
            </div>
          </div>

          <div className="text-sm font-medium text-gray-700 mb-2">
            Example: Two-Way Join (API + API)
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`{
  "name": "service_reliability_report",
  "description": "Error rates joined with latency percentiles per microservice",
  "type": "combined",
  "combinedConfig": {
    "subQueries": [
      { "queryName": "error_rate", "prefix": "err" },
      { "queryName": "performance", "prefix": "perf" }
    ],
    "joinType": "inner",
    "joinKeys": {
      "left": "err_service",
      "right": "perf_service"
    }
  }
}`}</pre>
          </div>

          <div className="text-sm font-medium text-gray-700 mb-2">
            Example: Three-Way Join with additionalJoins (XLSX + XLSX + XLSX)
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`{
  "name": "employee_full_review",
  "description": "Salaries, bonuses, and performance ratings per employee",
  "type": "combined",
  "combinedConfig": {
    "subQueries": [
      { "queryName": "hr_report_salaries", "prefix": "sal" },
      { "queryName": "hr_report_bonuses", "prefix": "bon" },
      { "queryName": "hr_report_ratings", "prefix": "rat" }
    ],
    "joinType": "inner",
    "joinKeys": {
      "left": "sal_employee",
      "right": "bon_employee"
    },
    "additionalJoins": [
      {
        "joinType": "inner",
        "leftKey": "sal_employee",
        "rightKey": "rat_employee"
      }
    ]
  }
}`}</pre>
          </div>

          <div className="text-sm font-medium text-gray-700 mb-2">
            How It Works
          </div>
          <div className="space-y-1 text-sm text-gray-600 mb-3">
            <div>
              1. All sub-queries execute{" "}
              <span className="font-medium">in parallel</span> for performance.
            </div>
            <div>
              2. Column prefixes are applied to avoid naming conflicts (e.g.{" "}
              <Code>err_service</Code>, <Code>perf_service</Code>).
            </div>
            <div>
              3. The join engine performs sequential hash-joins:{" "}
              <Code>(q1 JOIN q2) JOIN q3</Code>.
            </div>
            <div>
              4. The joined result is returned as a normal query result (table +
              chart).
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 mb-3">
            <span className="font-medium">Tip:</span> Use the Admin &rarr;
            Groups &rarr; Queries &rarr; Preview button to test combined query
            results before publishing. The preview API (
            <Code>/api/queries/preview</Code>) supports combined queries.
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="font-medium">Note:</span> Sub-queries must already
            exist as standalone queries. You can join across different source
            types — API with CSV, XLSX with XLSX, etc. Use <Code>maxRows</Code>{" "}
            on large file-based sub-queries to limit memory usage.
          </div>
        </Section>

        <Section title="5. Intent & Entity Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Intents define what the bot understands. Entities define named
            values it can extract. The NLP model trains on these definitions to
            classify user messages.
          </p>

          <div className="text-xs text-gray-500 mb-2">
            Config file: <FileRef path="src/training/corpus.json" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Intents
              </div>
              <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`{
  "intent": "query.execute",
  "utterances": [
    "run @query_name",
    "show me @query_name",
    "get @query_name for @region"
  ],
  "answers": []
}`}</pre>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-700 mb-2">
                Entities
              </div>
              <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">{`{
  "query_name": {
    "options": {
      "monthly_revenue": [
        "monthly revenue",
        "revenue report",
        "revenue"
      ]
    }
  }
}`}</pre>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Built-in Intent Types
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Intent
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Purpose
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Example Utterances
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.execute</td>
                  <td className="px-3 py-2">Run a data query</td>
                  <td className="px-3 py-2">
                    &quot;run monthly_revenue&quot;, &quot;show me active
                    users&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.list</td>
                  <td className="px-3 py-2">List available queries</td>
                  <td className="px-3 py-2">
                    &quot;list queries&quot;, &quot;what queries are
                    available&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.multi</td>
                  <td className="px-3 py-2">Run multiple queries at once</td>
                  <td className="px-3 py-2">
                    &quot;run revenue and active users together&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.estimate</td>
                  <td className="px-3 py-2">Estimate query run time</td>
                  <td className="px-3 py-2">
                    &quot;how long does revenue take&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">url.find</td>
                  <td className="px-3 py-2">Find relevant URLs/docs</td>
                  <td className="px-3 py-2">
                    &quot;find docs for onboarding&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">greeting</td>
                  <td className="px-3 py-2">User greets the bot</td>
                  <td className="px-3 py-2">
                    &quot;hello&quot;, &quot;hi there&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">farewell</td>
                  <td className="px-3 py-2">User says goodbye</td>
                  <td className="px-3 py-2">
                    &quot;bye&quot;, &quot;goodbye&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">help</td>
                  <td className="px-3 py-2">User asks for help</td>
                  <td className="px-3 py-2">
                    &quot;help&quot;, &quot;what can you do&quot;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Entity Types
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Entity
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Used For
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    How to Add
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query_name</td>
                  <td className="px-3 py-2">
                    Matching query names from user input
                  </td>
                  <td className="px-3 py-2">
                    Add option key = query name, synonyms = phrases users might
                    type
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">time_period</td>
                  <td className="px-3 py-2">
                    Date/time filters (today, this_week, etc.)
                  </td>
                  <td className="px-3 py-2">
                    Preset values + dynamic extraction for &quot;Jan 2026&quot;,
                    &quot;Q1 2025&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">region</td>
                  <td className="px-3 py-2">Geographic filters</td>
                  <td className="px-3 py-2">
                    Add region codes with synonyms (e.g. US = &quot;United
                    States&quot;, &quot;America&quot;)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">team</td>
                  <td className="px-3 py-2">Team/department filters</td>
                  <td className="px-3 py-2">Add team names with variations</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            How to Add a New Intent (Admin UI)
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Go to <span className="font-medium">Admin &rarr; Intents</span>
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Click an existing intent or create a new one with a name like{" "}
                <Code>query.execute</Code>
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>
                Add <span className="font-medium">utterances</span> — example
                phrases users will type. Use <Code>@entity_name</Code> for
                entity slots
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span>
                Save &rarr; the NLP model retrains automatically (no server
                restart needed)
              </span>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            How to Add a New Entity Synonym
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Go to{" "}
                <span className="font-medium">
                  Admin &rarr; Intents &rarr; Entities tab
                </span>
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Select the entity type (e.g. <Code>query_name</Code>)
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>
                Add a new option with the canonical key (e.g.{" "}
                <Code>monthly_revenue</Code>) and synonyms users might type
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span>
                The more synonyms you add, the better the NLP recognizes user
                variations
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <span className="font-medium">Tip:</span> Use{" "}
            <Code>@entity_name</Code> in utterances to reference entity slots.
            Date expressions like &quot;Jan 2026&quot; or &quot;Q1 2025&quot;
            are extracted automatically — no need to add them manually.
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Manage via Admin &rarr; Intents (Intent Builder).
          </p>
        </Section>

        <Section title="6. Response Templates">
          <p className="text-sm text-gray-600 mb-3">
            Templates control what the bot says for static intents (greeting,
            help, farewell, unknown). The system uses a two-tier approach: base
            templates provide defaults, and group-level overrides customize
            responses per bot instance.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Template Resolution Order
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded">
              Group template override
            </span>
            <span className="text-gray-400">&rarr;</span>
            <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded">
              Base template
            </span>
            <span className="text-gray-400">&rarr;</span>
            <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded">
              Hardcoded fallback
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">
                Base templates
              </div>
              <div className="text-gray-500 mb-1">
                <FileRef path="src/core/response/templates.ts" />
              </div>
              <div>
                Default responses used when no group-specific override exists.
                Shared across all groups.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">
                Group overrides
              </div>
              <div className="text-gray-500 mb-1">
                <FileRef path="src/config/groups.json" /> (templates field)
              </div>
              <div>
                Per-group responses that override the base templates. Set in the
                group&apos;s <Code>templates</Code> object.
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Template Keys
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Template Key
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Triggered When
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Example Response
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">greeting</td>
                  <td className="px-3 py-2">
                    User says &quot;hello&quot;, &quot;hi&quot;, etc.
                  </td>
                  <td className="px-3 py-2">
                    &quot;Hello! I&apos;m the Finance Bot. How can I help?&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">farewell</td>
                  <td className="px-3 py-2">
                    User says &quot;bye&quot;, &quot;goodbye&quot;
                  </td>
                  <td className="px-3 py-2">
                    &quot;Goodbye! Have a great day.&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">help</td>
                  <td className="px-3 py-2">
                    User says &quot;help&quot;, &quot;what can you do&quot;
                  </td>
                  <td className="px-3 py-2">
                    &quot;I can help you with revenue reports, user
                    data...&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">unknown</td>
                  <td className="px-3 py-2">
                    Bot doesn&apos;t understand the input
                  </td>
                  <td className="px-3 py-2">
                    &quot;I&apos;m not sure I understand. Try
                    &apos;help&apos;...&quot;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Group Override Example
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`// In groups.json → group → templates
{
  "templates": {
    "greeting": [
      "Welcome to the Finance Bot! I can help with revenue, orders, and financial metrics.",
      "Hi there! Ask me about revenue reports or active user data."
    ],
    "help": [
      "I can run these queries: monthly_revenue, active_users, order_summary. Just type 'run <name>'."
    ],
    "farewell": [
      "Thanks for using Finance Bot! Goodbye."
    ],
    "unknown": [
      "I didn't understand that. Try: 'run monthly_revenue' or 'list queries'."
    ]
  }
}`}</pre>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mb-3">
            <span className="font-medium">Tip:</span> When multiple responses
            are in the array, the bot randomly picks one for variety. Add 2-3
            variations to make the bot feel more natural.
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            How to Edit Templates (Admin UI)
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Go to{" "}
                <span className="font-medium">Admin &rarr; Templates</span> (or
                Admin &rarr; Groups &rarr; [group] &rarr; Templates tab)
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Select the group you want to customize from the dropdown
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>
                Edit template text for each intent key — add multiple variations
                separated by new lines
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span>
                Click <span className="font-medium">Save</span> — changes take
                effect immediately (no restart required)
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Manage via Admin &rarr; Templates (Template Editor).
          </p>
        </Section>

        <Section title="7. Filter Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Filters define UI controls for narrowing query results.
          </p>

          <div className="text-xs text-gray-500 mb-2">
            Config file: <FileRef path="src/config/filter-config.json" />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`{
  "filters": [
    {
      "key": "date_range",
      "label": "Date Range",
      "type": "select",
      "options": ["today", "this_week", "this_month", ...]
    },
    {
      "key": "severity",
      "label": "Severity",
      "type": "text"
    }
  ]
}`}</pre>
          </div>

          <p className="text-xs text-gray-400">
            Manage via Admin &rarr; Filters.
          </p>
        </Section>

        <Section title="8. Adding a New Query (End-to-End)">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                1
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Add the query</span> in Admin
                &rarr; Groups &rarr; [group] &rarr; + Add Query. Set name, type,
                endpoint/file, and filters.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                2
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Add entity synonyms</span> in
                Admin &rarr; Intents &rarr; Entities tab &rarr; query_name. Add
                the new query name with alternative phrases users might type.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                3
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Add a mock API endpoint</span> (if
                API type) in <FileRef path="mock-api/server.js" />. Add a
                handler function and sample data.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                4
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Restart the server</span> so the
                NLP model retrains with the new entity synonyms.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                5
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Test it</span> in Admin &rarr;
                Test Console. Type the query name and verify intent, confidence,
                and results.
              </div>
            </div>
          </div>
        </Section>

        <Section title="9. Learning System">
          <p className="text-sm text-gray-600 mb-3">
            The bot continuously improves through a self-learning system that
            captures user interactions, identifies patterns, and promotes
            successful responses into the training data — all per-group.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">
            How Learning Works
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                1
              </span>
              <div>
                <span className="font-medium text-gray-700">
                  Interaction Logging
                </span>{" "}
                — Every user message, detected intent, confidence score, and bot
                response is recorded in a per-group JSONL file at{" "}
                <FileRef path="data/learning/{'{groupId}'}.jsonl" />.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                2
              </span>
              <div>
                <span className="font-medium text-gray-700">
                  Signal Processing
                </span>{" "}
                — The system tracks positive signals (user accepted the result,
                followed up with related question) and negative signals (user
                rephrased, said &quot;that&apos;s wrong&quot;, or abandoned the
                conversation).
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                3
              </span>
              <div>
                <span className="font-medium text-gray-700">
                  Pattern Detection
                </span>{" "}
                — When the same phrase consistently maps to the same intent
                across multiple sessions, it becomes a learning candidate.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                4
              </span>
              <div>
                <span className="font-medium text-gray-700">
                  Auto-Promotion
                </span>{" "}
                — Patterns that meet the confidence threshold are automatically
                added to the group&apos;s corpus as new utterance examples.
                Below-threshold patterns go to the admin review queue.
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Learning Thresholds
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Threshold
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Value
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Behavior
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">Auto-learn confidence</td>
                  <td className="px-3 py-2">&ge; 0.85</td>
                  <td className="px-3 py-2">
                    Pattern auto-promoted to corpus (no manual review)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">
                    Review queue threshold
                  </td>
                  <td className="px-3 py-2">0.5 &ndash; 0.85</td>
                  <td className="px-3 py-2">
                    Pattern added to review queue for admin approval
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">Minimum occurrences</td>
                  <td className="px-3 py-2">&ge; 3</td>
                  <td className="px-3 py-2">
                    Pattern must be seen at least 3 times before learning
                    triggers
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">Below threshold</td>
                  <td className="px-3 py-2">&lt; 0.5</td>
                  <td className="px-3 py-2">
                    Logged but not auto-promoted or queued — may trigger
                    &quot;unknown&quot; response
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Admin Learning Dashboard
          </div>
          <p className="text-xs text-gray-600 mb-2">
            The Learning dashboard (
            <span className="font-medium">Admin &rarr; Learning</span>) has
            three tabs:
          </p>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
              <div className="font-medium text-yellow-800 mb-1">
                Review Queue
              </div>
              <div className="text-yellow-700">
                Patterns below auto-learn confidence. Admins can{" "}
                <span className="font-medium">approve</span> (adds to corpus),
                <span className="font-medium"> reject</span> (discards), or{" "}
                <span className="font-medium">reassign</span> to a different
                intent.
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
              <div className="font-medium text-green-800 mb-1">
                Auto-Learned
              </div>
              <div className="text-green-700">
                Patterns that were auto-promoted. View what was added, when, and
                to which intent. Admins can{" "}
                <span className="font-medium">revert</span> incorrect
                auto-learns.
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
              <div className="font-medium text-blue-800 mb-1">Stats</div>
              <div className="text-blue-700">
                Learning statistics: total interactions, auto-learned count,
                review pending count, top unknown phrases, and confidence
                distribution chart.
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            How to Review Learning Entries (Admin UI)
          </div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Go to <span className="font-medium">Admin &rarr; Learning</span>
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Select a group from the dropdown to filter learning data by
                group
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>
                In the <span className="font-medium">Review Queue</span> tab,
                see pending patterns with their detected intent and confidence
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                4
              </span>
              <span>
                Click <span className="font-medium">Approve</span> to add the
                phrase as a new utterance to the corpus, or{" "}
                <span className="font-medium">Reject</span> to discard it
              </span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                5
              </span>
              <span>
                Approved entries take effect on the next NLP retrain cycle
                (automatic)
              </span>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">
            Follow-Up Questions
          </div>
          <p className="text-xs text-gray-600 mb-2">
            After a query runs, the bot stores results in the session context.
            Users can ask follow-up questions about specific fields without
            re-running the query.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`User: "run user_profile"
Bot:  [shows table: name, email, user_id, department]

User: "what is the email?"
Bot:  "The email from user_profile is: john@company.com"

User: "what is department?"
Bot:  "The department from user_profile is: Engineering"`}</pre>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mb-3">
            <span className="font-medium">How it works:</span> The engine stores
            the last query result, query name, and column names in session
            context. When a user asks &quot;what is X?&quot;, the system
            fuzzy-matches X against column names and returns the matching value.
            Supported patterns: &quot;what is [field]&quot;, &quot;show me
            [field]&quot;, &quot;get [field]&quot;, &quot;tell me [field]&quot;.
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="font-medium">Per-Group Scope:</span> All learning
            data is isolated by group. A pattern learned in the Finance group
            won&apos;t affect the HR group. This ensures each bot instance
            learns independently based on its own user base.
          </div>
        </Section>

        <Section title="10. ML Features">
          <p className="text-sm text-gray-600 mb-3">
            The platform includes three ML-powered features that enhance query
            discovery, recommendations, and result monitoring.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
              <div className="font-medium text-blue-800 mb-1">
                Semantic Search
              </div>
              <div className="text-blue-700">
                TF-IDF + cosine similarity for natural language query discovery.
                Users type &quot;show me revenue data&quot; instead of exact
                query names. Indexes are built per-group and persisted to{" "}
                <Code>data/indexes/</Code>.
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
              <div className="font-medium text-green-800 mb-1">
                Smart Recommendations
              </div>
              <div className="text-green-700">
                Collaborative filtering, time-based patterns, and user
                clustering for personalized query suggestions. Tracks
                interactions in <Code>data/learning/</Code> JSONL files per
                group.
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs">
              <div className="font-medium text-red-800 mb-1">
                Anomaly Detection
              </div>
              <div className="text-red-700">
                Z-score and IQR monitoring on query results. Flags unusual
                numeric patterns with warning (2σ) and critical (3σ) badges.
                Admin dashboard at{" "}
                <span className="font-medium">
                  Admin &rarr; Anomaly Detection
                </span>
                .
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="font-medium">All local:</span> No external ML
            services required. Everything runs locally using the{" "}
            <Code>natural</Code> library for TF-IDF/NLP and file-based storage
            for models and baselines.
          </div>
        </Section>

        <Section title="11. Widget Embedding">
          <p className="text-sm text-gray-600 mb-3">
            To embed the chatbot in an external application, use the embed code
            from Admin &rarr; Groups &rarr; Embed.
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">
                iframe Method
              </div>
              <div>Simple embed. No JS required. Isolated in an iframe.</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">
                Script Widget
              </div>
              <div>
                Floating chat button. Configurable theme, position, greeting.
                Loads via JS script tag.
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`<script>
  window.ChatbotWidgetConfig = {
    group: 'finance',
    theme: 'blue',
    position: 'bottom-right',
    greeting: 'Hi! How can I help?'
  };
</script>
<script src="https://your-domain/widget/chatbot-widget.js"></script>`}</pre>
          </div>
        </Section>

        <Section title="12. Action Panel Configuration">
          <p className="text-sm text-gray-600 mb-3">
            The Action Panel allows dashboard cards to open external
            applications in a resizable side panel. Configure it per-query using{" "}
            <Code>actionConfig</Code> in the query definition.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`// In query definition (db.json or connector config)
{
  "name": "pnl_summary",
  "actionConfig": {
    "url": "http://external-app:5050",
    "label": "P&L Drill-Down Analysis",
    "contextFields": ["fiscal_year", "region"],
    "metadata": {
      "department": "Finance",
      "brid": "BR001"
    }
  }
}`}</pre>
          </div>

          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Field
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Required
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  [
                    "url",
                    "Yes",
                    "URL of the external application (absolute or relative)",
                  ],
                  [
                    "label",
                    "No",
                    "Title shown in the panel header (defaults to 'Action: {card label}')",
                  ],
                  [
                    "contextFields",
                    "No",
                    "Filter keys to include in the context payload",
                  ],
                  [
                    "metadata",
                    "No",
                    "Additional key-value pairs passed to the external app via extra",
                  ],
                ].map(([field, req, desc]) => (
                  <tr key={field} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{field}</td>
                    <td className="px-3 py-2">{req}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            The dashboard sends a <Code>chatbot:context</Code> postMessage
            (v1.0) to the iframe with the full card context. The external app
            can also read context from URL query parameters as a fallback.
          </p>
          <p className="text-sm text-gray-600">
            Environment variable fallback: set{" "}
            <Code>NEXT_PUBLIC_ACTION_PANEL_URL</Code> to apply a default action
            URL to all cards without explicit actionConfig.
          </p>
        </Section>

        <Section title="13. Scheduled Reports Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Scheduled reports allow automated dashboard execution and email
            delivery on a cron schedule.
          </p>

          <div className="space-y-2 text-sm text-gray-600 mb-3">
            <div>
              <span className="font-medium">Engine-side setup:</span> The
              schedule executor runs inside the Engine and checks for due
              schedules every 60 seconds.
            </div>
            <div>
              <span className="font-medium">Email setup:</span> Configure SMTP
              settings via environment variables:
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`# .env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com`}</pre>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Cron format:</span> Standard 5-field
              cron (<Code>minute hour day-of-month month day-of-week</Code>).
              Examples:
            </div>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Expression
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Schedule
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ["0 9 * * 1-5", "Weekdays at 9:00 AM"],
                  ["0 8 * * 1", "Every Monday at 8:00 AM"],
                  ["0 */6 * * *", "Every 6 hours"],
                  ["30 17 1 * *", "1st of each month at 5:30 PM"],
                ].map(([expr, desc]) => (
                  <tr key={expr} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{expr}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="14. Alert Threshold Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Alerts can be configured per dashboard card to monitor metric
            thresholds. When a card&apos;s data crosses a threshold, an alert
            badge appears on the card header.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`// Alert configuration structure
{
  "column": "total_revenue",
  "operator": "<",         // <, >, <=, >=, ==, !=
  "value": 100000,
  "severity": "critical",  // info, warning, critical
  "label": "Revenue below target"
}`}</pre>
          </div>

          <p className="text-sm text-gray-600">
            Alerts are configured through the card settings UI. They are stored
            as part of the dashboard configuration and evaluated each time the
            card data refreshes.
          </p>
        </Section>

        <Section title="15. CSV & XLSX File Sources">
          <p className="text-sm text-gray-600 mb-3">
            Register CSV and Excel files as data sources. CSV files map
            one-to-one with queries, while each sheet in an XLSX workbook
            becomes a separate query.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">Admin UI</div>
          <p className="text-sm text-gray-600 mb-3">
            Navigate to{" "}
            <span className="font-medium">Admin &rarr; CSV / XLSX</span> to
            upload, preview, and manage file-based data sources.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Registration
          </div>
          <div className="space-y-2 text-sm text-gray-600 mb-3">
            <div>
              <span className="font-medium">CSV files:</span> Set{" "}
              <Code>type: &quot;csv&quot;</Code> and provide a{" "}
              <Code>filePath</Code> pointing to the file. One file equals one
              query.
            </div>
            <div>
              <span className="font-medium">XLSX / XLS files:</span> Place{" "}
              <Code>.xlsx</Code> or <Code>.xls</Code> files in the configured
              file directory. The Engine detects them on startup and registers
              each sheet as a query named <Code>filename_sheetname</Code> (e.g.,{" "}
              <Code>finance_revenue</Code> from <Code>finance.xlsx</Code> sheet
              &quot;revenue&quot;).
            </div>
            <div>
              <span className="font-medium">Column detection:</span> Headers are
              auto-detected from the first row. Data types (numeric, date, text)
              are inferred from values.
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Example Query Configurations
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`// CSV source
{
  "id": "pnl-signoff",
  "type": "csv",
  "filePath": "pnl-signoff.csv",
  "label": "P&L Sign-off",
  "columns": {
    "idColumns": ["entity_id"],
    "dateColumns": ["report_date"],
    "labelColumns": ["entity_name", "status"],
    "valueColumns": ["revenue", "expenses", "net_income"],
    "ignoreColumns": ["internal_notes"]
  }
}

// XLSX source (auto-registered per sheet)
{
  "id": "finance_revenue",
  "type": "xlsx",
  "filePath": "finance.xlsx",
  "sheet": "revenue",
  "label": "Finance Revenue",
  "columns": {
    "idColumns": ["transaction_id"],
    "dateColumns": ["posting_date"],
    "valueColumns": ["amount", "tax"]
  }
}`}</pre>
          </div>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Column Configuration Options
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Option
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">idColumns</td>
                  <td className="px-3 py-2">
                    Unique identifier columns used for row-level lookups
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">dateColumns</td>
                  <td className="px-3 py-2">
                    Date/time columns used for time-series filtering and sorting
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">labelColumns</td>
                  <td className="px-3 py-2">
                    Categorical text columns used for grouping and display
                    labels
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">valueColumns</td>
                  <td className="px-3 py-2">
                    Numeric columns used for KPIs, aggregations, and charting
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">ignoreColumns</td>
                  <td className="px-3 py-2">
                    Columns excluded from query results and analysis
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mb-2">
            File Base Directory
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Set the <Code>FILE_BASE_DIR</Code> environment variable to specify
            the root directory where file-based data sources are stored. All
            relative <Code>filePath</Code> values resolve from this directory.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`# .env
FILE_BASE_DIR=./data/files`}</pre>
          </div>
          <p className="text-sm text-gray-600">
            A per-query override is available via <Code>fileBaseDir</Code> in
            the query definition. This takes precedence over the global{" "}
            <Code>FILE_BASE_DIR</Code> variable.
          </p>
        </Section>

        <Section title="16. Data Explorer Configuration">
          <p className="text-sm text-gray-600 mb-3">
            The Data Explorer at <Code>/data-explorer</Code> surfaces CSV and
            XLSX data sources in an interactive dashboard. It reads directly
            from the query registry so no extra configuration is required beyond
            registering file sources (see Section 15).
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Auto-Generated KPI Cards
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Numeric columns (those listed in <Code>valueColumns</Code> or
            auto-detected) are automatically turned into KPI cards showing sum,
            average, min, and max. Each card can be switched between KPI, Chart,
            and Table views through the card header controls.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Dashboard Card Views
          </div>
          <div className="space-y-2 text-sm text-gray-600 mb-3">
            <div>
              <span className="font-medium">KPI view:</span> Displays an
              aggregate value with optional trend indicator and comparison to
              the previous period.
            </div>
            <div>
              <span className="font-medium">Chart view:</span> Renders a bar,
              line, or area chart from the selected value and date columns.
            </div>
            <div>
              <span className="font-medium">Table view:</span> Shows the raw
              data rows with sortable columns, pagination, and column visibility
              toggles.
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Group-By & Aggregation
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Any label or date column can be used as a group-by dimension.
            Supported aggregation operations include <Code>sum</Code>,{" "}
            <Code>avg</Code>, <Code>min</Code>, <Code>max</Code>, and{" "}
            <Code>count</Code>. Aggregations are computed client-side for
            file-based sources and pushed to the server for API-backed queries.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">
            Anomaly Detection Integration
          </div>
          <p className="text-sm text-gray-600">
            When the anomaly detection engine is enabled, the Data Explorer
            highlights outlier values and unusual trends directly on KPI cards
            and charts. Anomaly baselines are built from historical data and
            updated automatically as new data arrives. No additional
            configuration is needed &mdash; the explorer inherits anomaly
            settings from the global anomaly configuration.
          </p>
        </Section>
      </div>
    </div>
  );
}
