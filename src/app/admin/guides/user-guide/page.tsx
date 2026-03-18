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

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-800">{title}</div>
        <div className="text-sm text-gray-600 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">{children}</kbd>;
}

function Cmd({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{children}</code>;
}

export default function UserGuidePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/guides" className="text-xs text-blue-600 hover:underline">&larr; All Guides</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">User Guide</h1>
        <p className="text-sm text-gray-500">For viewers and admins — how to use the chatbot</p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Viewers & Admins
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Section title="Getting Started">
          <Step number={1} title="Open the Chat">
            Navigate to the main page at <Cmd>/</Cmd> or click the floating chat widget button in the bottom-right corner of any page.
          </Step>
          <Step number={2} title="Select a Group">
            Use the group dropdown at the top to pick your team&apos;s bot (e.g., Finance Bot, Engineering Bot). Each group has different queries and data sources available.
          </Step>
          <Step number={3} title="Type or Click">
            Type a message in the input box and press <Kbd>Enter</Kbd>, or click one of the quick-action cards shown on the welcome screen.
          </Step>
        </Section>

        <Section title="Running Queries">
          <p className="text-sm text-gray-600 mb-3">
            The bot understands natural language. You can ask for data in many ways:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-medium text-gray-700 mb-1">Single query</div>
                <div className="text-gray-500 font-mono text-xs space-y-1">
                  <div>&quot;run error_rate&quot;</div>
                  <div>&quot;show me monthly revenue&quot;</div>
                  <div>&quot;pull up active users&quot;</div>
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">With filters</div>
                <div className="text-gray-500 font-mono text-xs space-y-1">
                  <div>&quot;run revenue for US&quot;</div>
                  <div>&quot;show errors in production&quot;</div>
                  <div>&quot;active users this month&quot;</div>
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Multiple queries</div>
                <div className="text-gray-500 font-mono text-xs space-y-1">
                  <div>&quot;run revenue and orders together&quot;</div>
                  <div>&quot;compare errors and performance&quot;</div>
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Search queries</div>
                <div className="text-gray-500 font-mono text-xs space-y-1">
                  <div>&quot;find revenue data&quot;</div>
                  <div>&quot;search for user metrics&quot;</div>
                  <div>&quot;anything about errors&quot;</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Understanding Results">
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3 items-start">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 shrink-0">
                Completed in 12ms
              </span>
              <span>Execution time badge — shows how long the query took to run.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-600 shrink-0">
                More info
              </span>
              <span>Reference link — click to open the Confluence/docs page for this query.</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full shrink-0">Suggestion chip</span>
              <span>Follow-up suggestions — click to run a related query or action.</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-500 mb-2">Data Display Types</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="font-medium">Table</span> — API, CSV, and XLSX query results shown as data tables</div>
              <div><span className="font-medium">Charts</span> — Numeric data visualized as bar/line charts</div>
              <div><span className="font-medium">Document</span> — Matching sections from BRD/SOP files</div>
              <div><span className="font-medium">URL</span> — Direct links to dashboards and tools</div>
              <div><span className="font-medium">Anomaly Badge</span> — Yellow/red indicator for unusual values vs historical baselines</div>
              <div><span className="font-medium">Recommendations</span> — Smart follow-up suggestions based on usage patterns</div>
            </div>
          </div>
        </Section>

        <Section title="Using Filters">
          <p className="text-sm text-gray-600 mb-3">
            Filters narrow down query results. You can apply them in two ways:
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Natural language:</span> Include filter terms in your message.
              <span className="font-mono text-xs text-gray-500 ml-1">&quot;run revenue for US this month&quot;</span>
            </div>
            <div>
              <span className="font-medium">Filter panel:</span> Click the filter icon next to the input box to open the explicit filter form. Select date range, region, team, environment, or severity.
            </div>
          </div>

          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-xs font-medium text-yellow-800">Available Filter Types</div>
            <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-yellow-700">
              <div>Date Range (today, this week, last month...)</div>
              <div>Region (US, EU, APAC)</div>
              <div>Team (engineering, sales, marketing...)</div>
              <div>Environment (production, staging, dev)</div>
              <div>Severity (custom text)</div>
            </div>
          </div>
        </Section>

        <Section title="Embedded Widget">
          <p className="text-sm text-gray-600 mb-3">
            The chatbot can be embedded into any web application. When using it as a widget:
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div>Click the <span className="font-medium">floating chat icon</span> (bottom-right) to open the widget.</div>
            <div>The widget supports all the same features as the full chat — queries, filters, suggestions, results.</div>
            <div>Click the <span className="font-medium">X</span> button to minimize back to the floating icon.</div>
            <div>The widget is configured per group — each team can have its own themed bot.</div>
          </div>
        </Section>

        <Section title="Query Types">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">What it does</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Example</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">API</td>
                  <td className="px-3 py-2">Fetches live data from a REST endpoint</td>
                  <td className="px-3 py-2 font-mono text-xs">&quot;run monthly revenue&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Document</td>
                  <td className="px-3 py-2">Searches BRD/SOP markdown files by keyword</td>
                  <td className="px-3 py-2 font-mono text-xs">&quot;search auth spec for OAuth&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">CSV</td>
                  <td className="px-3 py-2">Parses CSV/TSV files (comma, tab, semicolon, pipe delimiters) with aggregation</td>
                  <td className="px-3 py-2 font-mono text-xs">&quot;average revenue in sales data&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">XLSX</td>
                  <td className="px-3 py-2">Reads Excel spreadsheets with multi-sheet support and aggregation</td>
                  <td className="px-3 py-2 font-mono text-xs">&quot;run employee_compensation&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">URL</td>
                  <td className="px-3 py-2">Returns a direct link to a dashboard or tool</td>
                  <td className="px-3 py-2 font-mono text-xs">&quot;servicenow dashboard&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Grid Dashboard">
          <p className="text-sm text-gray-600 mb-3">
            Create custom dashboards with drag-and-drop grid cards. Each card runs a query and shows live results.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Create a dashboard:</span> Click <Cmd>Select Dashboard</Cmd> &rarr; <Cmd>New Dashboard</Cmd>, name it, then add cards with <Cmd>+ Add Card</Cmd>.
            </div>
            <div>
              <span className="font-medium">Auto-run cards:</span> Cards marked &quot;Auto&quot; execute their query when the dashboard loads. Execution time is shown in the header (e.g., <Cmd>6ms</Cmd>).
            </div>
            <div>
              <span className="font-medium">Hover actions:</span> Hover over any card to reveal action buttons — ask a follow-up, refresh data, clear results, or open the query in the full chat view (new tab).
            </div>
            <div>
              <span className="font-medium">Drag &amp; resize:</span> Grab the card header to reposition, or drag card edges to resize. Layouts are saved automatically.
            </div>
            <div>
              <span className="font-medium">Cross-card linking:</span> Click a cell value in one card to filter related cards automatically (e.g., click &quot;US&quot; in revenue to filter support tickets to US).
            </div>
            <div>
              <span className="font-medium">Filter persistence:</span> Filter changes made on dashboard cards are saved and restored on reload.
            </div>
            <div>
              <span className="font-medium">Business date:</span> Set a global date in the top bar to filter all cards to that date simultaneously.
            </div>
          </div>
        </Section>

        <Section title="File Upload">
          <p className="text-sm text-gray-600 mb-3">
            Upload CSV, TSV, or XLSX files directly in the chat to query them.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Drag &amp; drop:</span> Drag a file into the chat window, or click the upload icon in the input bar.
            </div>
            <div>
              <span className="font-medium">Supported formats:</span> CSV (comma, tab, semicolon, pipe delimited), TSV, and XLSX with multi-sheet support.
            </div>
            <div>
              <span className="font-medium">After upload:</span> The file is registered as a query. Ask questions like <Cmd>average salary in uploaded file</Cmd> or <Cmd>group by department</Cmd>.
            </div>
          </div>
        </Section>

        <Section title="Data Tables &amp; Pagination">
          <p className="text-sm text-gray-600 mb-3">
            All data tables (API results, CSV data, aggregations, group-by results) support pagination.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Page controls:</span> Navigate pages with the controls below each table. Adjust rows-per-page (10, 25, 50, 100) using the dropdown.
            </div>
            <div>
              <span className="font-medium">Charts:</span> Toggle between Bar, Stacked, Line, Area, Stack Area, and Pie chart views using the chart type selector above each visualization.
            </div>
            <div>
              <span className="font-medium">Export:</span> Click <Cmd>Export CSV</Cmd> to download query results as a CSV file.
            </div>
          </div>
        </Section>

        <Section title="Feedback &amp; Confidence">
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Confidence badge:</span> Each bot response shows a confidence score. Green = high confidence, yellow = moderate, red = low.
            </div>
            <div>
              <span className="font-medium">Thumbs up/down:</span> Rate bot responses to help improve accuracy. Your feedback is used by the learning system to fine-tune query matching.
            </div>
            <div>
              <span className="font-medium">Source badge:</span> Responses indicate their data source (API, CSV, Document, URL) so you know where the data came from.
            </div>
          </div>
        </Section>

        <Section title="Tips">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Type <Cmd>help</Cmd> at any time to see what the bot can do.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Type <Cmd>list queries</Cmd> to see all available queries for your group.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              The bot understands natural language — you don&apos;t need to type exact query names.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Click the &quot;More info&quot; link on results to view the full Confluence documentation.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Use suggestion chips below bot responses for quick follow-up actions.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Use the dashboard search bar to find queries by description — e.g. &quot;revenue data&quot; finds <Cmd>monthly_revenue</Cmd>.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Watch for yellow/red anomaly badges on results — they flag unusual values compared to historical baselines.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              CSV files support multiple delimiters: comma, tab, semicolon, and pipe — auto-detected by the engine.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              XLSX files with multiple sheets are auto-registered as separate queries (one per sheet).
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Dashboard cards persist filter changes — set a filter once and it stays on reload.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              Use <Cmd>Open in Chat</Cmd> from a dashboard card hover panel to continue the query in the full chat view.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
