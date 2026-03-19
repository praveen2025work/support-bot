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

function CmdBlock({ children }: { children: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 mb-3">
      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  );
}

function FileRef({ path }: { path: string }) {
  return (
    <span className="font-mono text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
      {path}
    </span>
  );
}

export default function SetupGuidePage() {
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
          Application Setup Guide
        </h1>
        <p className="text-sm text-gray-500">
          For admins and DevOps — how to install, deploy, and maintain the
          platform
        </p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Admins & DevOps
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Section title="Prerequisites">
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Node.js</div>
              <div className="text-xs text-gray-500">v18 or later</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">npm</div>
              <div className="text-xs text-gray-500">
                v9 or later (comes with Node.js)
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Git</div>
              <div className="text-xs text-gray-500">
                For cloning the repository
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700">Port 3000 & 8080</div>
              <div className="text-xs text-gray-500">
                Next.js (3000) + Mock API (8080)
              </div>
            </div>
          </div>
        </Section>

        <Section title="1. Installation">
          <CmdBlock>{`# Clone the repository
git clone <repo-url> chatbot
cd chatbot

# Install dependencies
npm install`}</CmdBlock>

          <p className="text-sm text-gray-600">
            This installs Next.js, React, NLP libraries (@nlpjs/nlp, fuse.js),
            and all other dependencies.
          </p>
        </Section>

        <Section title="2. Environment Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Create a <FileRef path=".env.local" /> file in the project root:
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{`# API Configuration
API_BASE_URL=http://localhost:8080/api
API_TOKEN=your-api-token-here

# Server Configuration
PORT=3000

# Optional: Production API
# API_BASE_URL=https://api.yourcompany.com/v1
# API_TOKEN=prod-bearer-token`}</pre>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
            <span className="font-medium">Note:</span> For local development,{" "}
            <Code>API_BASE_URL</Code> points to the mock API server at port
            8080. In production, update this to your real API endpoint.
          </div>
        </Section>

        <Section title="3. Running in Development">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                Option A: Full stack (recommended)
              </div>
              <CmdBlock>{`# Starts both Mock API (port 8080) and Next.js (port 3000)
npm run dev:full`}</CmdBlock>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">
                Option B: Separately
              </div>
              <CmdBlock>{`# Terminal 1: Mock API server
npm run mock-api

# Terminal 2: Next.js dev server
npm run dev`}</CmdBlock>
            </div>
          </div>

          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-600 mb-2">
              Accessible at:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <Code>http://localhost:3001</Code> — Main chat interface
              </div>
              <div>
                <Code>http://localhost:3001/admin</Code> — Admin dashboard
              </div>
              <div>
                <Code>http://localhost:3001/widget</Code> — Embeddable widget
              </div>
              <div>
                <Code>http://localhost:8080/api</Code> — Mock API server
              </div>
            </div>
          </div>
        </Section>

        <Section title="4. Project Structure">
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-600">
            <pre className="whitespace-pre-wrap">{`chatbot/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── page.tsx            # Main chat page
│   │   ├── admin/              # Admin dashboard pages
│   │   ├── widget/             # Embedded widget page
│   │   └── api/                # API routes (chat, admin CRUD)
│   ├── components/             # React UI components
│   ├── core/                   # Bot engine
│   │   ├── engine.ts           # Main orchestrator
│   │   ├── nlp/                # NLP classifier + fuzzy matcher
│   │   ├── response/           # Response generator + templates
│   │   ├── api-connector/      # Query execution service
│   │   └── session/            # Session manager
│   ├── adapters/               # Platform adapters (web, teams)
│   ├── config/                 # JSON config files
│   ├── training/               # NLP corpus + FAQ data
│   ├── hooks/                  # React hooks (useChat)
│   └── lib/                    # Utilities (logger, config, etc.)
├── data/
│   ├── knowledge/              # BRD/SOP markdown documents
│   ├── *.csv                   # CSV data files
│   └── logs/                   # Conversation logs (auto-generated)
├── mock-api/
│   ├── server.js               # Mock API server (json-server)
│   └── db.json                 # Query definitions + mock data
├── tests/                      # Jest test suite
├── public/                     # Static assets + widget JS
├── services/
│   └── engine/
│       └── data/
│           ├── indexes/        # Semantic search TF-IDF indexes
│           ├── learning/       # Collaborative filtering models & logs
│           ├── anomaly/        # Anomaly detection baselines & alerts
│           └── preferences/    # User preference profiles
├── .env.local                  # Environment variables
├── package.json                # Dependencies & scripts
└── next.config.mjs             # Next.js configuration`}</pre>
          </div>
        </Section>

        <Section title="5. Available npm Scripts">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Command
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run dev</td>
                  <td className="px-3 py-2">
                    Start Next.js dev server (port 3000)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run mock-api</td>
                  <td className="px-3 py-2">
                    Start mock API server (port 8080)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run dev:full</td>
                  <td className="px-3 py-2">Start both servers together</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run build</td>
                  <td className="px-3 py-2">Build for production</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run start</td>
                  <td className="px-3 py-2">Start production server</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run train</td>
                  <td className="px-3 py-2">Train NLP model from corpus</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run evaluate</td>
                  <td className="px-3 py-2">Evaluate NLP model accuracy</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm test</td>
                  <td className="px-3 py-2">Run Jest test suite</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run test:watch</td>
                  <td className="px-3 py-2">Run tests in watch mode</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run build:prod</td>
                  <td className="px-3 py-2">
                    Production build: Next.js + Engine (esbuild)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run start:all</td>
                  <td className="px-3 py-2">
                    Start mock-api + engine + UI from production builds
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run analyze</td>
                  <td className="px-3 py-2">
                    Bundle analysis (interactive treemap)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">npm run storybook</td>
                  <td className="px-3 py-2">
                    Start Storybook dev server (port 6006)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">
                    npm run build:storybook
                  </td>
                  <td className="px-3 py-2">Build static Storybook site</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="6. Production Build & Deploy">
          <CmdBlock>{`# Build both frontend + engine backend (esbuild)
npm run build:prod

# Start all services from production builds
npm run start:all

# Or start production mode (real APIs, no mock)
npm run start:prod`}</CmdBlock>

          <p className="text-sm text-gray-600 mb-3">
            For production, you will need to:
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex gap-2">
              <span className="text-green-500 shrink-0">1.</span>
              Set <Code>API_BASE_URL</Code> to your production API endpoint in{" "}
              <Code>.env.local</Code> or environment variables.
            </div>
            <div className="flex gap-2">
              <span className="text-green-500 shrink-0">2.</span>
              Set <Code>API_TOKEN</Code> to a valid bearer token for API
              authentication.
            </div>
            <div className="flex gap-2">
              <span className="text-green-500 shrink-0">3.</span>
              Ensure the NLP model is trained with the latest corpus data.
            </div>
            <div className="flex gap-2">
              <span className="text-green-500 shrink-0">4.</span>
              Configure a process manager (PM2, systemd) to keep the server
              running.
            </div>
            <div className="flex gap-2">
              <span className="text-green-500 shrink-0">5.</span>
              Set up a reverse proxy (nginx) for SSL and domain routing.
            </div>
          </div>
        </Section>

        <Section title="7. Mock API Server">
          <p className="text-sm text-gray-600 mb-3">
            The mock API server simulates production APIs for development. It
            runs on <Code>http://localhost:8080</Code>.
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">
                Query Definitions
              </div>
              <div>
                <FileRef path="mock-api/db.json" /> — All queries, filters, and
                stats
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">API Handlers</div>
              <div>
                <FileRef path="mock-api/server.js" /> — Custom endpoint handlers
                with sample data
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            The mock server supports path variables, query params, and request
            body filters — matching how real APIs work.
          </p>
        </Section>

        <Section title="8. Key Configuration Files">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    File
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="src/config/groups.json" />
                  </td>
                  <td className="px-3 py-2">
                    Group definitions (bots, sources, templates, NLP data)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="src/config/filter-config.json" />
                  </td>
                  <td className="px-3 py-2">
                    Filter UI schema (date range, region, team, etc.)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="src/config/users.json" />
                  </td>
                  <td className="px-3 py-2">Admin user accounts</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="src/config/settings.json" />
                  </td>
                  <td className="px-3 py-2">
                    Platform settings (thresholds, cache, platforms)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="src/training/corpus.json" />
                  </td>
                  <td className="px-3 py-2">
                    NLP intent + entity training data
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="src/training/faq.json" />
                  </td>
                  <td className="px-3 py-2">Fuzzy match FAQ entries</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="src/core/constants.ts" />
                  </td>
                  <td className="px-3 py-2">
                    NLP thresholds, session TTL, cache TTL
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="mock-api/db.json" />
                  </td>
                  <td className="px-3 py-2">
                    Query definitions, stats, mock data config
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path=".storybook/main.ts" />
                  </td>
                  <td className="px-3 py-2">
                    Storybook config (stories, addons, framework)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="services/engine/esbuild.config.mjs" />
                  </td>
                  <td className="px-3 py-2">
                    esbuild bundler config (replaces tsc)
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <FileRef path="next.config.mjs" />
                  </td>
                  <td className="px-3 py-2">
                    Next.js config (proxy rewrites, bundle analyzer)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="9. Troubleshooting">
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700">
                Bot returns &quot;I&apos;m not sure I understand&quot;
              </div>
              <div className="text-xs text-gray-500 mt-1">
                The NLP confidence is below threshold. Add more training phrases
                in Admin &rarr; Intents, or add FAQ entries for fuzzy matching.
                Check confidence scores in Admin &rarr; Test Console.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700">
                Query returns &quot;could not fetch data&quot;
              </div>
              <div className="text-xs text-gray-500 mt-1">
                The mock API server is not running. Start it with{" "}
                <Code>npm run mock-api</Code> or use{" "}
                <Code>npm run dev:full</Code>.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700">
                NLP model not classifying correctly
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Restart the dev server to retrain the model. The NLP model
                trains on startup from corpus.json. Run{" "}
                <Code>npm run evaluate</Code> to check accuracy metrics.
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700">
                Widget not loading in external app
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Check that the widget script URL is accessible from the host
                app. Verify CORS settings. Ensure the{" "}
                <Code>ChatbotWidgetConfig.group</Code> matches a valid group ID.
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
