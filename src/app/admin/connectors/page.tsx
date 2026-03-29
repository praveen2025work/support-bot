"use client";

import Link from "next/link";

const CONNECTOR_TYPES = [
  {
    type: "mssql",
    title: "MS SQL Server",
    description:
      "Connect to Microsoft SQL Server databases for real-time data queries and stored procedure execution.",
    href: "/admin/connectors/mssql",
    icon: "🔷",
    features: [
      "SQL Authentication & Windows Auth",
      "Schema browser",
      "Query builder with preview",
      "Stored procedure support",
    ],
  },
  {
    type: "oracle",
    title: "Oracle Database",
    description:
      "Connect to Oracle databases using thin or thick client mode for enterprise data access.",
    href: "/admin/connectors/oracle",
    icon: "🔶",
    features: [
      "SQL & Oracle Wallet Auth",
      "Schema browser",
      "PL/SQL procedure support",
      "Query builder with preview",
    ],
  },
  {
    type: "file",
    title: "CSV / XLSX Files",
    description:
      "Query CSV and Excel files as data sources. Upload files or point to a shared directory for automatic discovery.",
    href: "/admin/connectors/csv",
    icon: "📊",
    features: [
      "CSV & XLSX auto-detection",
      "Multi-sheet XLSX support",
      "Column type inference",
      "Aggregation & filtering",
    ],
  },
];

export default function ConnectorsLandingPage() {
  return (
    <div>
      <div className="pb-6 mb-6 border-b border-gray-100">
        <h1 className="text-2xl font-semibold text-gray-900">Data Sources</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect to external databases to create API endpoints. Each connector
          runs as an independent service that can be scaled separately. Saved
          queries are exposed as REST APIs for the Engine to consume.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CONNECTOR_TYPES.map((ct) => (
          <Link
            key={ct.type}
            href={ct.href}
            className="block bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{ct.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {ct.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{ct.description}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1">
              {ct.features.map((f) => (
                <li
                  key={f}
                  className="text-xs text-gray-500 flex items-center gap-1.5"
                >
                  <span className="text-green-500">&#10003;</span> {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-blue-600 font-medium">
              Manage Connections &rarr;
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            SQL Connectors &mdash; How It Works
          </h3>
          <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>
              Create a connection to your database in the connector service
            </li>
            <li>
              Browse schemas and build SQL queries with the visual query builder
            </li>
            <li>
              Preview results to verify your query returns the expected data
            </li>
            <li>
              Save the query &mdash; it becomes a REST API endpoint on the
              connector service
            </li>
            <li>
              Register it in the Engine as an API-type query (baseUrl points to
              the connector)
            </li>
            <li>
              The chatbot and dashboards can now query your database through the
              Engine
            </li>
          </ol>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            File Connector &mdash; How It Works
          </h3>
          <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
            <li>
              Place CSV or XLSX files in the configured{" "}
              <code className="px-1 bg-white rounded text-gray-700">
                FILE_BASE_DIR
              </code>{" "}
              directory
            </li>
            <li>
              Register a query in the Engine with{" "}
              <code className="px-1 bg-white rounded text-gray-700">
                type: &quot;csv&quot;
              </code>{" "}
              or{" "}
              <code className="px-1 bg-white rounded text-gray-700">
                type: &quot;xlsx&quot;
              </code>
            </li>
            <li>The Engine auto-detects columns, types, and delimiters</li>
            <li>
              Users can query the file data through the chatbot with filters and
              aggregations
            </li>
            <li>
              XLSX files support multi-sheet selection &mdash; each sheet is a
              separate data source
            </li>
            <li>
              Data Explorer and dashboards can visualize the file data with
              charts and KPIs
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
