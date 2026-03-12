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

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">{children}</code>;
}

function FileRef({ path }: { path: string }) {
  return <span className="font-mono text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{path}</span>;
}

export default function ConfigGuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/guides" className="text-xs text-blue-600 hover:underline">&larr; All Guides</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">Configuration Guide</h1>
        <p className="text-sm text-gray-500">For developers and admins — how to configure the bot platform</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          Developers & Admins
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Section title="1. Group Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Groups define isolated bot instances. Each group has its own queries, training data, templates, and data sources.
          </p>

          <div className="text-xs text-gray-500 mb-2">Config file: <FileRef path="src/config/groups.json" /></div>

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
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Field</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">name</td>
                  <td className="px-3 py-2">Display name shown in group selector</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">sources</td>
                  <td className="px-3 py-2">Filter which queries are available (empty = all)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">corpus</td>
                  <td className="px-3 py-2">NLP training data file in <Code>src/training/groups/</Code></td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">faq</td>
                  <td className="px-3 py-2">Fuzzy match FAQ file in <Code>src/training/groups/</Code></td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">templates</td>
                  <td className="px-3 py-2">Override base response templates per intent</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">apiBaseUrl</td>
                  <td className="px-3 py-2">Custom API base URL (null = use default)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            You can also manage groups via Admin &rarr; Groups, or Admin &rarr; Add Group.
          </p>
        </Section>

        <Section title="2. Query Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Queries define what data the bot can fetch. Each query maps to a data source type.
          </p>

          <div className="text-xs text-gray-500 mb-2">Config file: <FileRef path="mock-api/db.json" /> (queries array)</div>

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
              <div>Set <Code>type: &quot;api&quot;</Code> and provide <Code>endpoint</Code>. Filter bindings: body, query_param, path.</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Document Query</div>
              <div>Set <Code>type: &quot;document&quot;</Code> and provide <Code>file</Code> path in <Code>data/knowledge/</Code>.</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">CSV Query</div>
              <div>Set <Code>type: &quot;csv&quot;</Code> and provide <Code>file</Code> path in <Code>data/</Code>. Supports aggregation.</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">URL Query</div>
              <div>Set <Code>type: &quot;url&quot;</Code> and provide <Code>url</Code> to return as a link.</div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Manage queries via Admin &rarr; Groups &rarr; [group] &rarr; Queries tab.
          </p>
        </Section>

        <Section title="3. Intent & Entity Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Intents define what the bot understands. Entities define named values it can extract.
            The NLP model trains on these definitions to classify user messages.
          </p>

          <div className="text-xs text-gray-500 mb-2">Config file: <FileRef path="src/training/corpus.json" /></div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-700 mb-2">Intents</div>
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
              <div className="text-xs font-medium text-gray-700 mb-2">Entities</div>
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

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">Built-in Intent Types</div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Intent</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Purpose</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Example Utterances</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.execute</td>
                  <td className="px-3 py-2">Run a data query</td>
                  <td className="px-3 py-2">&quot;run monthly_revenue&quot;, &quot;show me active users&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.list</td>
                  <td className="px-3 py-2">List available queries</td>
                  <td className="px-3 py-2">&quot;list queries&quot;, &quot;what queries are available&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.multi</td>
                  <td className="px-3 py-2">Run multiple queries at once</td>
                  <td className="px-3 py-2">&quot;run revenue and active users together&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query.estimate</td>
                  <td className="px-3 py-2">Estimate query run time</td>
                  <td className="px-3 py-2">&quot;how long does revenue take&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">url.find</td>
                  <td className="px-3 py-2">Find relevant URLs/docs</td>
                  <td className="px-3 py-2">&quot;find docs for onboarding&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">greeting</td>
                  <td className="px-3 py-2">User greets the bot</td>
                  <td className="px-3 py-2">&quot;hello&quot;, &quot;hi there&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">farewell</td>
                  <td className="px-3 py-2">User says goodbye</td>
                  <td className="px-3 py-2">&quot;bye&quot;, &quot;goodbye&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">help</td>
                  <td className="px-3 py-2">User asks for help</td>
                  <td className="px-3 py-2">&quot;help&quot;, &quot;what can you do&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">Entity Types</div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Entity</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Used For</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">How to Add</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">query_name</td>
                  <td className="px-3 py-2">Matching query names from user input</td>
                  <td className="px-3 py-2">Add option key = query name, synonyms = phrases users might type</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">time_period</td>
                  <td className="px-3 py-2">Date/time filters (today, this_week, etc.)</td>
                  <td className="px-3 py-2">Preset values + dynamic extraction for &quot;Jan 2026&quot;, &quot;Q1 2025&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">region</td>
                  <td className="px-3 py-2">Geographic filters</td>
                  <td className="px-3 py-2">Add region codes with synonyms (e.g. US = &quot;United States&quot;, &quot;America&quot;)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">team</td>
                  <td className="px-3 py-2">Team/department filters</td>
                  <td className="px-3 py-2">Add team names with variations</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">How to Add a New Intent (Admin UI)</div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">1</span>
              <span>Go to <span className="font-medium">Admin &rarr; Intents</span></span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">2</span>
              <span>Click an existing intent or create a new one with a name like <Code>query.execute</Code></span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">3</span>
              <span>Add <span className="font-medium">utterances</span> — example phrases users will type. Use <Code>@entity_name</Code> for entity slots</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">4</span>
              <span>Save &rarr; the NLP model retrains automatically (no server restart needed)</span>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">How to Add a New Entity Synonym</div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">1</span>
              <span>Go to <span className="font-medium">Admin &rarr; Intents &rarr; Entities tab</span></span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">2</span>
              <span>Select the entity type (e.g. <Code>query_name</Code>)</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">3</span>
              <span>Add a new option with the canonical key (e.g. <Code>monthly_revenue</Code>) and synonyms users might type</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">4</span>
              <span>The more synonyms you add, the better the NLP recognizes user variations</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <span className="font-medium">Tip:</span> Use <Code>@entity_name</Code> in utterances to reference entity slots.
            Date expressions like &quot;Jan 2026&quot; or &quot;Q1 2025&quot; are extracted automatically — no need to add them manually.
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Manage via Admin &rarr; Intents (Intent Builder).
          </p>
        </Section>

        <Section title="4. Response Templates">
          <p className="text-sm text-gray-600 mb-3">
            Templates control what the bot says for static intents (greeting, help, farewell, unknown).
            The system uses a two-tier approach: base templates provide defaults, and group-level overrides customize responses per bot instance.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">Template Resolution Order</div>
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded">Group template override</span>
            <span className="text-gray-400">&rarr;</span>
            <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded">Base template</span>
            <span className="text-gray-400">&rarr;</span>
            <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded">Hardcoded fallback</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Base templates</div>
              <div className="text-gray-500 mb-1"><FileRef path="src/core/response/templates.ts" /></div>
              <div>Default responses used when no group-specific override exists. Shared across all groups.</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Group overrides</div>
              <div className="text-gray-500 mb-1"><FileRef path="src/config/groups.json" /> (templates field)</div>
              <div>Per-group responses that override the base templates. Set in the group&apos;s <Code>templates</Code> object.</div>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">Template Keys</div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Template Key</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Triggered When</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Example Response</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">greeting</td>
                  <td className="px-3 py-2">User says &quot;hello&quot;, &quot;hi&quot;, etc.</td>
                  <td className="px-3 py-2">&quot;Hello! I&apos;m the Finance Bot. How can I help?&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">farewell</td>
                  <td className="px-3 py-2">User says &quot;bye&quot;, &quot;goodbye&quot;</td>
                  <td className="px-3 py-2">&quot;Goodbye! Have a great day.&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">help</td>
                  <td className="px-3 py-2">User says &quot;help&quot;, &quot;what can you do&quot;</td>
                  <td className="px-3 py-2">&quot;I can help you with revenue reports, user data...&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">unknown</td>
                  <td className="px-3 py-2">Bot doesn&apos;t understand the input</td>
                  <td className="px-3 py-2">&quot;I&apos;m not sure I understand. Try &apos;help&apos;...&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">Group Override Example</div>
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
            <span className="font-medium">Tip:</span> When multiple responses are in the array, the bot randomly picks one for variety. Add 2-3 variations to make the bot feel more natural.
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">How to Edit Templates (Admin UI)</div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">1</span>
              <span>Go to <span className="font-medium">Admin &rarr; Templates</span> (or Admin &rarr; Groups &rarr; [group] &rarr; Templates tab)</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">2</span>
              <span>Select the group you want to customize from the dropdown</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">3</span>
              <span>Edit template text for each intent key — add multiple variations separated by new lines</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">4</span>
              <span>Click <span className="font-medium">Save</span> — changes take effect immediately (no restart required)</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Manage via Admin &rarr; Templates (Template Editor).
          </p>
        </Section>

        <Section title="5. Filter Configuration">
          <p className="text-sm text-gray-600 mb-3">
            Filters define UI controls for narrowing query results.
          </p>

          <div className="text-xs text-gray-500 mb-2">Config file: <FileRef path="src/config/filter-config.json" /></div>

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

        <Section title="6. Adding a New Query (End-to-End)">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">1</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Add the query</span> in Admin &rarr; Groups &rarr; [group] &rarr; + Add Query. Set name, type, endpoint/file, and filters.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">2</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Add entity synonyms</span> in Admin &rarr; Intents &rarr; Entities tab &rarr; query_name. Add the new query name with alternative phrases users might type.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">3</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Add a mock API endpoint</span> (if API type) in <FileRef path="mock-api/server.js" />. Add a handler function and sample data.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">4</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Restart the server</span> so the NLP model retrains with the new entity synonyms.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">5</div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Test it</span> in Admin &rarr; Test Console. Type the query name and verify intent, confidence, and results.
              </div>
            </div>
          </div>
        </Section>

        <Section title="7. Learning System">
          <p className="text-sm text-gray-600 mb-3">
            The bot continuously improves through a self-learning system that captures user interactions,
            identifies patterns, and promotes successful responses into the training data — all per-group.
          </p>

          <div className="text-xs font-medium text-gray-700 mb-2">How Learning Works</div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              <div>
                <span className="font-medium text-gray-700">Interaction Logging</span> — Every user message, detected intent, confidence score, and bot response is recorded in a per-group JSONL file at <FileRef path="data/learning/{'{groupId}'}.jsonl" />.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              <div>
                <span className="font-medium text-gray-700">Signal Processing</span> — The system tracks positive signals (user accepted the result, followed up with related question) and negative signals (user rephrased, said &quot;that&apos;s wrong&quot;, or abandoned the conversation).
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
              <div>
                <span className="font-medium text-gray-700">Pattern Detection</span> — When the same phrase consistently maps to the same intent across multiple sessions, it becomes a learning candidate.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
              <div>
                <span className="font-medium text-gray-700">Auto-Promotion</span> — Patterns that meet the confidence threshold are automatically added to the group&apos;s corpus as new utterance examples. Below-threshold patterns go to the admin review queue.
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">Learning Thresholds</div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Threshold</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Value</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Behavior</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">Auto-learn confidence</td>
                  <td className="px-3 py-2">&ge; 0.85</td>
                  <td className="px-3 py-2">Pattern auto-promoted to corpus (no manual review)</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">Review queue threshold</td>
                  <td className="px-3 py-2">0.5 &ndash; 0.85</td>
                  <td className="px-3 py-2">Pattern added to review queue for admin approval</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">Minimum occurrences</td>
                  <td className="px-3 py-2">&ge; 3</td>
                  <td className="px-3 py-2">Pattern must be seen at least 3 times before learning triggers</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">Below threshold</td>
                  <td className="px-3 py-2">&lt; 0.5</td>
                  <td className="px-3 py-2">Logged but not auto-promoted or queued — may trigger &quot;unknown&quot; response</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">Admin Learning Dashboard</div>
          <p className="text-xs text-gray-600 mb-2">
            The Learning dashboard (<span className="font-medium">Admin &rarr; Learning</span>) has three tabs:
          </p>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
              <div className="font-medium text-yellow-800 mb-1">Review Queue</div>
              <div className="text-yellow-700">
                Patterns below auto-learn confidence. Admins can <span className="font-medium">approve</span> (adds to corpus),
                <span className="font-medium"> reject</span> (discards), or <span className="font-medium">reassign</span> to a different intent.
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs">
              <div className="font-medium text-green-800 mb-1">Auto-Learned</div>
              <div className="text-green-700">
                Patterns that were auto-promoted. View what was added, when, and to which intent.
                Admins can <span className="font-medium">revert</span> incorrect auto-learns.
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
              <div className="font-medium text-blue-800 mb-1">Stats</div>
              <div className="text-blue-700">
                Learning statistics: total interactions, auto-learned count, review pending count,
                top unknown phrases, and confidence distribution chart.
              </div>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">How to Review Learning Entries (Admin UI)</div>
          <div className="space-y-2 mb-3">
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">1</span>
              <span>Go to <span className="font-medium">Admin &rarr; Learning</span></span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">2</span>
              <span>Select a group from the dropdown to filter learning data by group</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">3</span>
              <span>In the <span className="font-medium">Review Queue</span> tab, see pending patterns with their detected intent and confidence</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">4</span>
              <span>Click <span className="font-medium">Approve</span> to add the phrase as a new utterance to the corpus, or <span className="font-medium">Reject</span> to discard it</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">5</span>
              <span>Approved entries take effect on the next NLP retrain cycle (automatic)</span>
            </div>
          </div>

          <div className="text-xs font-medium text-gray-700 mt-4 mb-2">Follow-Up Questions</div>
          <p className="text-xs text-gray-600 mb-2">
            After a query runs, the bot stores results in the session context. Users can ask follow-up questions
            about specific fields without re-running the query.
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
            <span className="font-medium">How it works:</span> The engine stores the last query result, query name, and column names in session context.
            When a user asks &quot;what is X?&quot;, the system fuzzy-matches X against column names and returns the matching value.
            Supported patterns: &quot;what is [field]&quot;, &quot;show me [field]&quot;, &quot;get [field]&quot;, &quot;tell me [field]&quot;.
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="font-medium">Per-Group Scope:</span> All learning data is isolated by group. A pattern learned in the Finance group
            won&apos;t affect the HR group. This ensures each bot instance learns independently based on its own user base.
          </div>
        </Section>

        <Section title="8. Widget Embedding">
          <p className="text-sm text-gray-600 mb-3">
            To embed the chatbot in an external application, use the embed code from Admin &rarr; Groups &rarr; Embed.
          </p>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">iframe Method</div>
              <div>Simple embed. No JS required. Isolated in an iframe.</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-700 mb-1">Script Widget</div>
              <div>Floating chat button. Configurable theme, position, greeting. Loads via JS script tag.</div>
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
      </div>
    </div>
  );
}
