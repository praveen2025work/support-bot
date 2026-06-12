"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf";

interface SqlConnector {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  defaultSchema?: string;
  authType: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionStatus {
  connectorId: string;
  connected: boolean;
  latencyMs?: number;
  serverVersion?: string;
  error?: string;
}

interface ConnectorListPageProps {
  connectorType: "mssql" | "oracle" | "csv-xlsx";
  apiBasePath: string; // e.g. '/api/admin/mssql-connector'
  detailBasePath: string; // e.g. '/admin/connectors/mssql'
  title: string;
  description: string;
  defaultPort: string;
  defaultSchema: string;
  badgeClass: string;
  badgeLabel: string;
}

export default function ConnectorListPage({
  connectorType,
  apiBasePath,
  detailBasePath,
  title,
  description,
  defaultPort,
  defaultSchema,
  badgeClass,
  badgeLabel,
}: ConnectorListPageProps) {
  const [connectors, setConnectors] = useState<SqlConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, ConnectionStatus>
  >({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "",
    name: "",
    host: "",
    port: defaultPort,
    database: "",
    defaultSchema: "",
    authType: "sql_auth",
    username: "",
    password: "",
    maxPoolSize: "10",
    maxRows: "10000",
  });
  const [createError, setCreateError] = useState("");

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch(apiBasePath, { headers: csrfHeaders() });
      const data = await res.json();
      setConnectors(data.connectors || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [apiBasePath]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          ...form,
          port: parseInt(form.port, 10),
          maxPoolSize: parseInt(form.maxPoolSize, 10),
          maxRows: parseInt(form.maxRows, 10),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setCreateError(err.error || "Failed to create connector");
        return;
      }
      setShowCreateForm(false);
      setForm({
        id: "",
        name: "",
        host: "",
        port: defaultPort,
        database: "",
        defaultSchema: "",
        authType: "sql_auth",
        username: "",
        password: "",
        maxPoolSize: "10",
        maxRows: "10000",
      });
      await fetchConnectors();
    } catch {
      setCreateError("Network error");
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ id, action: "test" }),
      });
      const status = await res.json();
      setTestResults((prev) => ({ ...prev, [id]: status }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          connectorId: id,
          connected: false,
          error: "Network error",
          lastChecked: new Date().toISOString(),
        } as ConnectionStatus,
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${apiBasePath}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      setDeletingId(null);
      await fetchConnectors();
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/connectors"
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              &larr; Data Sources
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-blue-700"
        >
          {showCreateForm ? "Cancel" : "+ New Connection"}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Create New Connection
          </h2>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Connector ID
              </label>
              <input
                type="text"
                required
                pattern="[a-z0-9_-]+"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder="e.g. finance-db"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder="e.g. Finance Database"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Authentication
              </label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                value={form.authType}
                onChange={(e) => setForm({ ...form, authType: e.target.value })}
              >
                <option value="sql_auth">SQL Authentication</option>
                <option value="windows_auth">Windows Authentication</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Host
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder="e.g. db-server.company.com"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Port
              </label>
              <input
                type="number"
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Database / Service Name
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder={connectorType === "oracle" ? "ORCL" : "MyDatabase"}
                value={form.database}
                onChange={(e) => setForm({ ...form, database: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Default Schema
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder={defaultSchema}
                value={form.defaultSchema}
                onChange={(e) =>
                  setForm({ ...form, defaultSchema: e.target.value })
                }
              />
            </div>
            {form.authType !== "windows_auth" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-sm hover:bg-blue-700"
            >
              Create Connection
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          Loading connectors...
        </div>
      ) : connectors.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 mb-2">No connections configured yet.</p>
          <p className="text-sm text-gray-400">
            Click &quot;+ New Connection&quot; to add your first database
            connection.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Host
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Database
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {connectors.map((c) => {
                const status = testResults[c.id];
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${detailBasePath}/${c.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-gray-400">{c.id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.host}:{c.port}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.database}</td>
                    <td className="px-4 py-3">
                      {status ? (
                        <span
                          className={`text-xs font-medium ${status.connected ? "text-green-600" : "text-red-600"}`}
                        >
                          {status.connected
                            ? `Connected (${status.latencyMs}ms)`
                            : `Error: ${status.error}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Not tested
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleTest(c.id)}
                        disabled={testingId === c.id}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {testingId === c.id ? "Testing..." : "Test"}
                      </button>
                      <Link
                        href={`${detailBasePath}/${c.id}`}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Open
                      </Link>
                      {deletingId === c.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs text-red-600 font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-gray-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeletingId(c.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
