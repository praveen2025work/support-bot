"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Shared UI primitives                                               */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10">
      <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Cmd({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">
      {children}
    </code>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
      {children}
    </kbd>
  );
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <Image
        src={src}
        alt={alt}
        width={1280}
        height={800}
        className="w-full h-auto"
        unoptimized
      />
      <div className="px-3 py-1.5 bg-gray-50 text-[10px] text-gray-500 italic">
        {alt}
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 my-3">
      <span className="font-medium">Tip:</span> {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flow navigation                                                    */
/* ------------------------------------------------------------------ */

const FLOWS = [
  { id: "flow-1", label: "Ask & Get Answers", surface: "Chat" },
  { id: "flow-2", label: "Explore Data", surface: "Chat" },
  { id: "flow-3", label: "Export & Actions", surface: "Chat" },
  { id: "flow-4", label: "Monitor Data", surface: "Dashboard" },
  { id: "flow-5", label: "Edit & Analyze", surface: "GridBoard" },
  { id: "flow-6", label: "Embedded Chat", surface: "Widget" },
  { id: "flow-7", label: "Configure", surface: "Admin" },
  { id: "query-ref", label: "Query Reference", surface: "Reference" },
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function UserGuidePage() {
  const [activeFlow, setActiveFlow] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    setActiveFlow(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/guides"
          className="text-xs text-blue-600 hover:underline"
        >
          &larr; All Guides
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">User Guide</h1>
        <p className="text-sm text-gray-500">
          Step-by-step flows for every surface of the MITR AI platform
        </p>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Viewers &amp; Admins
        </span>
      </div>

      {/* Flow Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Quick Navigation
        </div>
        <div className="flex flex-wrap gap-2">
          {FLOWS.map((f) => (
            <button
              key={f.id}
              onClick={() => scrollTo(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeFlow === f.id
                  ? "bg-blue-100 border-blue-300 text-blue-700"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="text-gray-400 mr-1">{f.surface}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* ============================================================ */}
        {/*  FLOW 1: Chat — Ask Questions & Get Answers                  */}
        {/* ============================================================ */}
        <Section id="flow-1" title="Flow 1: Chat — Ask Questions & Get Answers">
          <p className="text-sm text-gray-600 mb-4">
            Learn how to ask the chatbot questions and get data results with
            tables and charts.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Getting Started
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Open the Chat page to see a welcome screen with quick-start options.
            Type your question in plain English, or click one of the cards:{" "}
            <Cmd>List queries</Cmd>, <Cmd>Get help</Cmd>, <Cmd>Run a query</Cmd>
            , or <Cmd>Find URLs</Cmd>.
          </p>

          <Screenshot
            src="/images/guide/chat-landing.png"
            alt="Chat landing page with quick-start option cards"
          />

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Running a Query
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Type the query name or describe what you need, then press{" "}
            <Kbd>Enter</Kbd> or click <Cmd>Send</Cmd>.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-3 font-mono text-xs text-gray-600 space-y-1">
            <div>&quot;run monthly_revenue&quot;</div>
            <div>&quot;show me active users&quot;</div>
            <div>&quot;execute error_rate&quot;</div>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            If the query supports filters, a filter form appears. Fill in
            filters and click <Cmd>Run Query</Cmd>, or click{" "}
            <Cmd>Skip filters</Cmd> to run without filtering.
          </p>

          <Screenshot
            src="/images/guide/chat-filters.png"
            alt="Filter form showing Date Range and Region options before running a query"
          />

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Reading Results
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Results appear as a data table with an auto-generated chart below.
            Switch chart types using the toolbar (Bar, Stacked, Line, Area,
            Pie).
          </p>

          <Screenshot
            src="/images/guide/chat-run-query.png"
            alt="Query results showing a data table with a line chart and suggestion chips"
          />

          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-600 mb-2">
              Result Components
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">Table</span> — Scrollable,
                paginated (capped at 500 rows)
              </div>
              <div>
                <span className="font-medium">Chart</span> — Line (time-series),
                Bar (categories), Pie (small datasets)
              </div>
              <div>
                <span className="font-medium">Badges</span> — Execution time,
                confidence, anomaly alerts
              </div>
              <div>
                <span className="font-medium">Suggestions</span> — Clickable
                chips for follow-up actions
              </div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Listing & Searching Queries
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Type <Cmd>list queries</Cmd> to see all available queries with
            descriptions and badges. Click any card to run it.
          </p>

          <Screenshot
            src="/images/guide/chat-list-queries.png"
            alt="List of available queries with type badges and descriptions"
          />

          <Tip>
            Use semantic search — describe what you need instead of exact names.{" "}
            <Cmd>&quot;find revenue data&quot;</Cmd> works even if the query is
            named <Cmd>monthly_revenue</Cmd>.
          </Tip>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Using Filters
          </h3>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <span className="font-medium text-gray-700">
                  Inline filters:
                </span>
                <div className="mt-1 font-mono space-y-1">
                  <div>&quot;run revenue for US this month&quot;</div>
                  <div>&quot;show errors in production&quot;</div>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">SQL filters:</span>
                <div className="mt-1 font-mono space-y-1">
                  <div>&quot;run order_details status Completed&quot;</div>
                  <div>&quot;run employee_directory Dept Engineering&quot;</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-xs font-medium text-yellow-800 mb-1">
              Supported Filter Types
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-yellow-700">
              <div>Date Range (today, this week...)</div>
              <div>Region (US, EU, APAC)</div>
              <div>Team (engineering, sales...)</div>
              <div>Environment (prod, staging)</div>
              <div>Severity (critical, high...)</div>
              <div>Custom SQL columns</div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Query Types
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Type
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    What it does
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">API</td>
                  <td className="px-3 py-2">
                    Fetches live data from REST APIs
                  </td>
                  <td className="px-3 py-2 font-mono">
                    &quot;run monthly_revenue&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Document</td>
                  <td className="px-3 py-2">Searches internal documents</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;search auth_spec for MFA&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">CSV</td>
                  <td className="px-3 py-2">
                    Parses CSV files with aggregation
                  </td>
                  <td className="px-3 py-2 font-mono">
                    &quot;average salary in sales_data&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">XLSX</td>
                  <td className="px-3 py-2">
                    Reads Excel with multi-sheet support
                  </td>
                  <td className="px-3 py-2 font-mono">
                    &quot;run employee_compensation&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">SQL</td>
                  <td className="px-3 py-2">
                    Direct queries to MSSQL / Oracle
                  </td>
                  <td className="px-3 py-2 font-mono">
                    &quot;run order_details&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">URL</td>
                  <td className="px-3 py-2">Opens external dashboard links</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;link for servicenow_dashboard&quot;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Available Commands
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Command
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Run a query</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;run monthly_revenue&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">List queries</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;list queries&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Compare queries</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;show active_users and error_rate&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Search queries</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;find revenue data&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Get a link</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;link for servicenow_dashboard&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Get help</td>
                  <td className="px-3 py-2 font-mono">&quot;help&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FLOW 2: Chat — Explore Your Data                            */}
        {/* ============================================================ */}
        <Section id="flow-2" title="Flow 2: Chat — Explore Your Data">
          <p className="text-sm text-gray-600 mb-4">
            Learn how to chain operations, run ML analysis, and detect anomalies
            on your query results.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Follow-Up Chaining
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            After running a query, chain follow-up operations to explore data
            step by step. Each operation builds on the previous result.
          </p>

          <Screenshot
            src="/images/guide/chat-followup-chain.png"
            alt="Follow-up chain showing grouped results with smart suggestion chips"
          />

          <div className="bg-gray-50 rounded-lg p-3 mb-3 font-mono text-xs text-gray-600 space-y-1">
            <div>You: &quot;run monthly_revenue&quot; &rarr; [table]</div>
            <div>You: &quot;group by region&quot; &rarr; [grouped results]</div>
            <div>You: &quot;sort by revenue desc&quot; &rarr; [sorted]</div>
            <div>You: &quot;top 5&quot; &rarr; [top 5 regions]</div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Operation
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Group by</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;group by region&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Sort</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;sort by revenue desc&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Filter</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;filter by region US&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Top N</td>
                  <td className="px-3 py-2 font-mono">&quot;top 10&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Aggregation</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;average revenue&quot;, &quot;count rows&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Summary</td>
                  <td className="px-3 py-2 font-mono">&quot;summarize&quot;</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Undo</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;undo&quot; or &quot;go back&quot;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Smart Suggestions
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Clickable suggestion chips appear below each response, ranked by
            relevance and capped at 5.
          </p>

          <Screenshot
            src="/images/guide/chat-suggestions.png"
            alt="Smart suggestion chips showing contextual next actions like Sort, Top 5, Run sales_data"
          />

          <div className="space-y-1 text-xs text-gray-600 mb-4">
            <div>
              <span className="font-medium">Anomaly-triggered</span> — Highest
              priority when unusual values detected
            </div>
            <div>
              <span className="font-medium">Chain-aware</span> — Next logical
              step based on current chain
            </div>
            <div>
              <span className="font-medium">ML recommendations</span> —
              Co-occurrence, collaborative filtering, time patterns
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Anomaly Detection
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            The platform automatically flags unusual patterns in query results:
          </p>
          <div className="flex gap-3 mb-3">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              Info
            </span>
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-600">
              Warning (2+ std dev)
            </span>
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
              Critical (3+ std dev)
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Detection methods: Statistical (Z-score/IQR), Seasonal (day-of-week
            baselines), and Business Rules (admin-defined thresholds). Baselines
            build after 5+ executions.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            ML Analysis Commands
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Run a query first, then ask for analysis:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Analysis
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ["Profile", '"profile columns"'],
                  ["Smart Summary", '"smart summary"'],
                  ["Correlation", '"show correlations"'],
                  ["Distribution", '"show distribution"'],
                  ["Anomaly", '"find outliers"'],
                  ["Trend", '"show trend"'],
                  ["Clustering", '"cluster the data"'],
                  ["Forecast", '"forecast ahead"'],
                  ["PCA", '"PCA analysis"'],
                  ["Full Report", '"insight report"'],
                ].map(([name, example]) => (
                  <tr key={name} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{name}</td>
                    <td className="px-3 py-2 font-mono">{example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Conversational Commands
          </h3>
          <div className="space-y-1 text-xs text-gray-600">
            <div>
              <span className="font-medium">Confirm:</span> &quot;yes&quot;,
              &quot;correct&quot;, &quot;go ahead&quot;
            </div>
            <div>
              <span className="font-medium">Deny:</span> &quot;no&quot;,
              &quot;cancel&quot;, &quot;never mind&quot;
            </div>
            <div>
              <span className="font-medium">Clarify:</span> &quot;what do you
              mean?&quot;, &quot;explain&quot;
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FLOW 3: Chat — Export & Cross-Surface Actions                */}
        {/* ============================================================ */}
        <Section
          id="flow-3"
          title="Flow 3: Chat — Export & Cross-Surface Actions"
        >
          <p className="text-sm text-gray-600 mb-4">
            Learn how to export data and move results between Chat, Dashboard,
            and GridBoard.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Export Results
          </h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Format
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    How to ask
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">CSV</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;export as CSV&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">JSON</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;download as JSON&quot;
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">Excel</td>
                  <td className="px-3 py-2 font-mono">
                    &quot;export as Excel&quot;
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Cross-Surface Action Buttons
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            After running a query, action buttons appear below results:
          </p>
          <div className="space-y-2 text-xs text-gray-600">
            <div>
              <span className="font-medium">Pin to Dashboard</span> — Adds the
              query as a card for ongoing monitoring
            </div>
            <div>
              <span className="font-medium">Open in GridBoard</span> — Opens
              tabular data in spreadsheet-style editing
            </div>
            <div>
              <span className="font-medium">Export as CSV</span> — Downloads
              results directly
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Multi-Query Comparison
          </h3>
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 space-y-1">
            <div>&quot;compare error_rate and performance&quot;</div>
            <div>&quot;show me active_users and customer_churn&quot;</div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FLOW 4: Dashboard — Monitor Your Data                       */}
        {/* ============================================================ */}
        <Section id="flow-4" title="Flow 4: Dashboard — Monitor Your Data">
          <p className="text-sm text-gray-600 mb-4">
            Create and manage dashboard cards for ongoing data monitoring.
          </p>

          <Screenshot
            src="/images/guide/dashboard-overview.png"
            alt="Dashboard with query cards showing P&L data, filters, and chart type selector"
          />

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Dashboard Features
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Dashboard selector:</span> Switch
              between saved views using the dropdown (top-left).
            </div>
            <div>
              <span className="font-medium">Presets:</span> Apply saved filter
              configurations. Set a global business date to filter all cards.
            </div>
            <div>
              <span className="font-medium">Card actions:</span> Refresh, Clear,
              Export, Re-query, Open in Chat — visible in each card&apos;s
              action bar.
            </div>
            <div>
              <span className="font-medium">Charts:</span> Toggle between Bar,
              Stacked, Line, Area, Stack Area, and Pie chart views.
            </div>
          </div>

          <Screenshot
            src="/images/guide/dashboard-cards.png"
            alt="Dashboard card with pie chart visualization and action bar (Refresh, Clear, Export, Open in Chat)"
          />

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Adding a Card
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Click <Cmd>+ Add Card</Cmd> to add a query card:
          </p>

          <Screenshot
            src="/images/guide/dashboard-add-card.png"
            alt="Add Card modal with query search, card label, and auto-run toggle"
          />

          <div className="space-y-1 text-xs text-gray-600">
            <div>1. Search or select a query</div>
            <div>2. Set a custom Card Label (optional)</div>
            <div>3. Toggle Auto-run on load</div>
            <div>4. Click Add Card</div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Searching Queries
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Use the search bar for semantic/natural language search:
          </p>

          <Screenshot
            src="/images/guide/dashboard-search.png"
            alt="Dashboard search bar filtering queries by topic keyword"
          />

          <Tip>
            Star frequently-used queries to access them with one click from the
            dashboard.
          </Tip>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Display Mode &amp; Compact Auto
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Each card supports three display modes, configurable when adding a
            card or via card settings:
          </p>
          <div className="space-y-1 text-xs text-gray-600 mb-3">
            <div>
              <span className="font-medium">Table:</span> Shows data as a table
              only.
            </div>
            <div>
              <span className="font-medium">Chart:</span> Shows data as a chart
              only.
            </div>
            <div>
              <span className="font-medium">Auto:</span> Shows both table and
              chart. When <Cmd>Compact</Cmd> is enabled (default), a tab toggle
              lets you switch between Table and Chart views. When disabled, both
              views are stacked vertically.
            </div>
          </div>
          <Tip>
            Use Compact mode for smaller cards to save space. Disable it when
            you want to see both table and chart at the same time.
          </Tip>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Drill-Down Sub-Queries
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Some cards support drill-down: click a cell value (e.g. a region
            name or category) to automatically run a related query with that
            value as a filter. Drill-down links appear as clickable text within
            the table.
          </p>
          <div className="space-y-1 text-xs text-gray-600">
            <div>1. Click a highlighted cell value in the results table</div>
            <div>
              2. A modal opens showing the drill-down query results filtered by
              that value
            </div>
            <div>3. You can further drill down from the modal results</div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Action Panel (External App Integration)
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Cards with an action configuration show an external link icon in the
            toolbar. Clicking it opens a resizable side panel that loads an
            external application in an iframe.
          </p>
          <div className="space-y-1 text-xs text-gray-600 mb-3">
            <div>
              <span className="font-medium">Context passing:</span> The
              dashboard sends card context (user ID, query name, filters,
              metadata) to the external app via postMessage.
            </div>
            <div>
              <span className="font-medium">Resize:</span> Drag the left edge of
              the panel to adjust its width. Your preferred width is saved
              automatically.
            </div>
            <div>
              <span className="font-medium">Actions:</span> The external app can
              send actions back (e.g. approve, reject) which can trigger card
              refreshes.
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Scheduled Reports
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Set up automated email reports for any dashboard. Click the{" "}
            <Cmd>Schedule</Cmd> button in the dashboard toolbar to configure:
          </p>
          <div className="space-y-1 text-xs text-gray-600">
            <div>
              1. Set a schedule using cron expressions (e.g. daily at 9 AM,
              every Monday)
            </div>
            <div>2. Add recipient email addresses</div>
            <div>3. Choose the report format</div>
            <div>
              4. Enable or disable schedules at any time from the admin panel
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Share &amp; Templates
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Dashboards can be shared and created from templates:
          </p>
          <div className="space-y-1 text-xs text-gray-600 mb-3">
            <div>
              <span className="font-medium">Share:</span> Generate a read-only
              share link for any dashboard. Recipients can view but not edit.
            </div>
            <div>
              <span className="font-medium">Templates:</span> Use the Template
              Gallery to create a dashboard from pre-built templates (e.g.
              Finance Overview, HR Metrics). Templates pre-populate cards with
              recommended queries and layouts.
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Alert Configuration
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Set threshold-based alerts on any card metric. When a value crosses
            the threshold, the card displays a visual alert indicator.
          </p>
          <div className="space-y-1 text-xs text-gray-600">
            <div>1. Open card settings and click the alert icon</div>
            <div>2. Choose a column and operator (&gt;, &lt;, =, etc.)</div>
            <div>3. Set the threshold value and severity level</div>
            <div>
              4. The card header shows an alert badge when conditions are met
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Comments
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Add comments to any dashboard card for team collaboration. Click the
            comment icon in the card toolbar to open the comment thread.
            Comments are timestamped and attributed to the current user.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Additional Card Actions
          </h3>
          <div className="space-y-1 text-xs text-gray-600">
            <div>
              <span className="font-medium">Duplicate:</span> Copy a card with
              all its settings to quickly create similar views.
            </div>
            <div>
              <span className="font-medium">Maximize:</span> Expand a card to
              full screen for detailed analysis.
            </div>
            <div>
              <span className="font-medium">Auto-Refresh:</span> Set a per-card
              refresh interval (e.g. every 30 seconds) for real-time monitoring.
            </div>
            <div>
              <span className="font-medium">Add Note:</span> Attach a sticky
              note to a card for context or reminders.
            </div>
            <div>
              <span className="font-medium">Open in Grid Board:</span> Open the
              card&apos;s query data in the full Grid Board editor.
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FLOW 5: GridBoard — Edit & Analyze Data                     */}
        {/* ============================================================ */}
        <Section id="flow-5" title="Flow 5: GridBoard — Edit & Analyze Data">
          <p className="text-sm text-gray-600 mb-4">
            Work with data in a spreadsheet-style editor with powerful data
            tools.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Getting Started
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Navigate to <Cmd>Grid Board</Cmd>, select a query, and click{" "}
            <Cmd>Load Data</Cmd>.
          </p>

          <Screenshot
            src="/images/guide/gridboard-empty.png"
            alt="GridBoard empty state with query selector dropdown and Load Data button"
          />

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            GridBoard with Data
          </h3>

          <Screenshot
            src="/images/guide/gridboard-overview.png"
            alt="GridBoard with loaded data showing toolbar (Views, Columns, Group, Summary, Format, Add Row, Export CSV, Pivot, Find, Import, History) and editable data grid"
          />

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Toolbar Operations
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Tool
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    What It Does
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ["Views", "Save & switch column/filter configurations"],
                  ["Columns", "Show, hide, and reorder columns"],
                  ["Group", "Group rows by column values"],
                  ["Summary", "Column-level aggregations"],
                  ["Format", "Number, date, and text formatting"],
                  ["+ Add Row", "Insert a new row"],
                  ["Export CSV", "Download current view"],
                  ["Pivot", "Pivot table summaries"],
                  ["Find", "Search within the data grid"],
                  ["Import", "Import data from files"],
                  ["History", "View change history"],
                ].map(([tool, desc]) => (
                  <tr key={tool} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{tool}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Tip>
            Double-click any cell to edit it. Use the inline query box below the
            grid for follow-up operations.
          </Tip>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Find &amp; Replace
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Click <Cmd>Find</Cmd> in the toolbar (or press <Kbd>Ctrl+F</Kbd>) to
            open the Find &amp; Replace bar. Search across all cells, navigate
            matches with up/down arrows, and optionally replace values
            one-by-one or all at once.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Pivot Table
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Click <Cmd>Pivot</Cmd> to create a pivot table summary. Select row
            and column dimensions, choose an aggregation function (Sum, Count,
            Average, Min, Max), and the grid generates a cross-tabulation view
            of your data.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Sparkline Cells
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Numeric columns can display inline sparkline mini-charts within
            cells, giving you a quick visual trend indicator without switching
            to a full chart view.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Import Data
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Click <Cmd>Import</Cmd> to load data from CSV or XLSX files directly
            into the grid. The import modal lets you preview data, map columns,
            and choose whether to append or replace existing rows.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Validation Indicators
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Cells that fail validation rules show a colored indicator (red for
            errors, yellow for warnings). Hover over the indicator to see the
            validation message. Rules are configured per-column in the admin
            panel.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Keyboard Shortcuts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Shortcut
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ["Ctrl+F", "Open Find & Replace"],
                  ["Ctrl+Z", "Undo last edit"],
                  ["Ctrl+Shift+Z", "Redo"],
                  ["Tab / Shift+Tab", "Move to next / previous cell"],
                  ["Enter", "Confirm edit and move down"],
                  ["Escape", "Cancel edit"],
                  ["Ctrl+C / Ctrl+V", "Copy / Paste cell values"],
                  ["Delete", "Clear selected cell"],
                ].map(([key, action]) => (
                  <tr key={key} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{key}</td>
                    <td className="px-3 py-2">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Change History
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Click <Cmd>History</Cmd> to open the Change History panel. It shows
            a chronological list of all edits made during the current session —
            who changed what, the old value, and the new value. You can revert
            individual changes from this panel.
          </p>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Column Header Menu
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Right-click any column header to access a context menu with options
            to sort (ascending/descending), pin the column (left/right), hide
            it, insert a column, or apply conditional formatting rules.
          </p>
        </Section>

        {/* ============================================================ */}
        {/*  FLOW 6: Widget — Embedded Chat                              */}
        {/* ============================================================ */}
        <Section id="flow-6" title="Flow 6: Widget — Embedded Chat">
          <p className="text-sm text-gray-600 mb-4">
            Use the chatbot as an embedded widget on any web page.
          </p>

          <Screenshot
            src="/images/guide/widget-open.png"
            alt="Widget chat interface with compact header showing user info, Connected status, and quick-start cards"
          />

          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">On external pages:</span> A circular
              bot icon appears in the bottom-right corner. Click to open.
            </div>
            <div>
              <span className="font-medium">Full functionality:</span> All Chat
              features work in the widget — queries, filters, chaining, export,
              ML analysis.
            </div>
            <div>
              <span className="font-medium">Session persistence:</span> The
              widget remembers your conversation within the current session.
            </div>
            <div>
              <span className="font-medium">Per-group theming:</span> Each team
              can have its own branded widget.
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FLOW 7: Admin — Configure the Platform                      */}
        {/* ============================================================ */}
        <Section id="flow-7" title="Flow 7: Admin — Configure the Platform">
          <p className="text-sm text-gray-600 mb-4">
            Manage platform settings, groups, data sources, and monitoring
            tools.
          </p>

          <Screenshot
            src="/images/guide/admin-sidebar.png"
            alt="Admin panel with sidebar showing Management (Groups, Intents, Templates, Files), Tools (Test Console, Analytics, Logs, Learning, Audit Trail, Schedules, Anomaly Detection), Data Sources, and Configuration sections"
          />

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Management Sections
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Groups</span> — Manage chatbot
              groups, data sources, embed codes
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Intents</span> — NLP intents and
              training utterances
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Templates</span> — Response
              templates
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <span className="font-medium">Files</span> — CSV, XLSX, and
              document files
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            SQL Connectors (MSSQL & Oracle)
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Connect directly to SQL Server and Oracle databases without building
            APIs. Go to <Cmd>Admin &rarr; SQL Connectors</Cmd>:
          </p>

          <Screenshot
            src="/images/guide/admin-connectors.png"
            alt="SQL Connectors page showing MSSQL and Oracle connector cards with features list"
          />

          <div className="space-y-2 text-xs text-gray-600 mb-4">
            <div>1. Click a connector type (MSSQL or Oracle)</div>
            <div>
              2. Add connection details (host, port, database, credentials)
            </div>
            <div>3. Test the connection</div>
            <div>4. Browse schemas and build SQL queries</div>
            <div>5. Save and publish queries to the Engine</div>
            <div>6. Published queries appear in Chat like any other query</div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700 mb-1">
                MSSQL Connector (port 4002)
              </div>
              <ul className="text-xs text-gray-500 space-y-0.5">
                <li>SQL &amp; Windows Auth</li>
                <li>Schema browser</li>
                <li>Stored procedure support</li>
                <li>Dynamic filters with WHERE clauses</li>
              </ul>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs font-medium text-gray-700 mb-1">
                Oracle Connector (port 4003)
              </div>
              <ul className="text-xs text-gray-500 space-y-0.5">
                <li>SQL &amp; Oracle Wallet Auth</li>
                <li>Schema browser</li>
                <li>PL/SQL procedure support</li>
                <li>Dynamic filters with WHERE clauses</li>
              </ul>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Anomaly Detection Settings
          </h3>

          <Screenshot
            src="/images/guide/admin-anomaly.png"
            alt="Anomaly Detection configuration with Enabled toggle, Warning Z-Score, Critical Z-Score, and Min Samples settings"
          />

          <div className="space-y-1 text-xs text-gray-600">
            <div>
              <span className="font-medium">Enabled toggle</span> — Turn
              detection on/off
            </div>
            <div>
              <span className="font-medium">Warning Z-Score</span> — Threshold
              for warning alerts (default: 2)
            </div>
            <div>
              <span className="font-medium">Critical Z-Score</span> — Threshold
              for critical alerts (default: 3)
            </div>
            <div>
              <span className="font-medium">Min Samples</span> — Minimum
              executions before baselines build (default: 5)
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Analytics
          </h3>

          <Screenshot
            src="/images/guide/admin-analytics.png"
            alt="Admin Analytics dashboard showing usage metrics and query trends"
          />
        </Section>

        {/* ============================================================ */}
        {/*  Tips & Tricks                                                */}
        {/* ============================================================ */}
        <Section title="Tips & Tricks">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              <span className="font-medium">Natural language:</span> &quot;How
              is performance looking?&quot; works as well as &quot;run
              performance&quot;.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              <span className="font-medium">CSV delimiters:</span> Auto-detects
              comma, tab, semicolon, and pipe.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              <span className="font-medium">XLSX multi-sheet:</span> Each sheet
              becomes a separate query automatically.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              <span className="font-medium">Date formatting:</span> All dates
              auto-formatted, no special syntax needed.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              <span className="font-medium">Large results:</span> Capped at 500
              rows in Chat — use filters to narrow.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              <span className="font-medium">SQL queries:</span> Run MSSQL and
              Oracle queries by name, apply filters inline, view as tables with
              charts.
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 shrink-0">&#x2022;</span>
              <span className="font-medium">Cross-surface flow:</span> Pin to
              Dashboard from Chat, or Open in GridBoard for editing.
            </li>
          </ul>
        </Section>

        <Section id="stomp" title="Live Notifications (STOMP WebSocket)">
          <p
            className="text-sm mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Dashboard cards can receive real-time refresh events via STOMP
            WebSocket. This requires a two-level opt-in:
          </p>
          <ol
            className="text-sm space-y-3 list-decimal list-inside"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <li>
              <span
                className="font-medium"
                style={{ color: "hsl(var(--foreground))" }}
              >
                App-level toggle:
              </span>{" "}
              Click the <strong>&quot;Live Off&quot;</strong> button in the
              dashboard toolbar to enable STOMP for the entire dashboard. The
              button turns cyan and shows &quot;Live&quot; when active.
            </li>
            <li>
              <span
                className="font-medium"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Per-card toggle:
              </span>{" "}
              Each card has a radio icon in its toolbar. Click it to enable live
              notifications for that specific card. A cyan &quot;Live&quot;
              badge appears next to &quot;Auto&quot;.
            </li>
            <li>
              <span
                className="font-medium"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Both must be enabled:
              </span>{" "}
              Only cards with both the dashboard-level and card-level toggles
              enabled will auto-refresh when a matching STOMP event arrives.
            </li>
          </ol>
          <p
            className="text-sm mt-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            You can also enable live notifications when adding a new card via
            the &quot;Enable Live Notifications&quot; checkbox in the Add Card
            modal, or later via the card settings gear icon.
          </p>
          <p
            className="text-sm mt-2"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <strong>Configure the STOMP broker:</strong> Click the gear icon
            next to the &quot;Live&quot; button, or go to{" "}
            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
              Admin → Settings → STOMP / Live
            </span>{" "}
            to set the broker URL and subscription destination. Environment
            presets are available for quick switching between Dev, QA, and Prod.
          </p>
        </Section>

        {/* ============================================================ */}
        {/*  QUERY REFERENCE GUIDE                                       */}
        {/* ============================================================ */}

        <Section id="query-ref" title="Query Reference Guide">
          <p className="text-sm text-gray-600 mb-4">
            A comprehensive reference of all query types you can use in the
            chat. Type these directly in the chat input after running a query
            (or as standalone commands where noted).
          </p>

          {/* --- Filtering & Sorting --- */}
          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Filtering &amp; Sorting
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Query
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  [
                    "filter by namedpnl Alpha Conduit Revenue",
                    "Show only one PnL",
                  ],
                  ["filter by bofc_status Failed", "Show failed BOFC rows"],
                  [
                    "filter by businessarea Equities",
                    "Filter by business area",
                  ],
                  [
                    "sort by vpsignoff_bofc_hours desc",
                    "Slowest sign-offs first",
                  ],
                  ["top 5 by vpsignoff_bofc_hours", "5 slowest sign-offs"],
                  ["top 10 by vpsignoffcount", "Most sign-offs"],
                ].map(([query, desc]) => (
                  <tr key={query} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{query}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Grouping & Aggregation --- */}
          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Grouping &amp; Aggregation
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Query
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ["group by namedpnl", "Group by PnL name"],
                  ["group by businessarea", "Group by area"],
                  ["group by businessdate monthly", "Group by month"],
                  ["group by businessdate weekly", "Group by week"],
                  ["avg vpsignoff_bofc_hours", "Average sign-off hours"],
                  ["max vpsignoff_bofc_hours", "Worst sign-off time"],
                  ["sum vpsignoffcount by namedpnl", "Total sign-offs per PnL"],
                ].map(([query, desc]) => (
                  <tr key={query} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{query}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Computed Columns (Date Diffs) --- */}
          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Computed Columns (Date Diffs)
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Query
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  [
                    "diff bofc_completedon and fobo_completedon",
                    "Time between BOFC and FOBO",
                  ],
                  [
                    "diff vpsignoffutc and bofc_completedon",
                    "VP sign-off turnaround",
                  ],
                  [
                    "avg diff between vpsignoffutc and bofc_completedon by namedpnl",
                    "Avg turnaround per PnL",
                  ],
                  [
                    "avg diff between vpsignoffutc and bofc_completedon by namedpnl by month",
                    "Avg turnaround per PnL per month",
                  ],
                  [
                    "avg diff between bofc_completedon and fobo_completedon by businessarea by quarter",
                    "BOFC\u2192FOBO gap by area quarterly",
                  ],
                ].map(([query, desc]) => (
                  <tr key={query} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{query}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Analysis & ML --- */}
          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Analysis &amp; ML
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Query
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ["summary", "Auto-generated stats overview"],
                  ["find outliers", "Anomaly detection (weekends excluded)"],
                  ["show trend", "Trend analysis over time"],
                  ["show correlations", "Correlation between numeric columns"],
                  ["forecast vpsignoff_bofc_hours", "Predict future values"],
                  [
                    "show distribution of vpsignoff_bofc_hours",
                    "Histogram / distribution",
                  ],
                ].map(([query, desc]) => (
                  <tr key={query} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{query}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Period-over-Period --- */}
          <h3 className="text-sm font-semibold text-gray-800 mt-6 mb-2">
            Period-over-Period
          </h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    Query
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">
                    What it does
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {[
                  ["month over month vpsignoff_bofc_hours", "MoM comparison"],
                  [
                    "quarter over quarter vpsignoff_bofc_hours",
                    "QoQ comparison",
                  ],
                ].map(([query, desc]) => (
                  <tr key={query} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono">{query}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Tip>
            You can combine operations by chaining them. For example, run a
            query first, then type &quot;group by businessarea&quot; followed by
            &quot;sort by vpsignoff_bofc_hours desc&quot; to progressively
            refine your results.
          </Tip>
        </Section>
      </div>
    </div>
  );
}
