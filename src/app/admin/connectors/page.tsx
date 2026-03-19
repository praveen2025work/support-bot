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

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          How It Works
        </h3>
        <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
          <li>Create a connection to your database in the connector service</li>
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
    </div>
  );
}
