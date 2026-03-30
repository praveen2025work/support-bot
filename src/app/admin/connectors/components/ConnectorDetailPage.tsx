"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { csrfHeaders } from "@/lib/csrf";

interface ConnectorConfig {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  defaultSchema?: string;
  authType: string;
  username?: string;
  maxPoolSize?: number;
  connectionTimeout?: number;
  requestTimeout?: number;
  maxRows?: number;
  readOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}
interface TableInfo {
  schema: string;
  name: string;
  type: "table" | "view";
}
interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  maxLength?: number;
}
interface ProcedureInfo {
  schema: string;
  name: string;
  parameters: Array<{ name: string; dataType: string; direction: string }>;
}
interface PreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionMs: number;
  truncated?: boolean;
}

interface SavedQueryInfo {
  id: string;
  name: string;
  description?: string;
  connectorId: string;
  sqlText?: string;
  procedureName?: string;
  filters?: Array<{ key: string; binding: string }>;
  createdAt?: string;
}

interface EnginePublishConfig {
  source: string;
  chartType: string;
  chartLabelKey: string;
  chartValueKeys: string;
  columnIdColumns: string;
  columnDateColumns: string;
  columnLabelColumns: string;
  columnValueColumns: string;
}

/** Format cell values for display — auto-detect ISO dates and convert to human-readable format. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (ISO_DATE_RE.test(str)) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const hasTime =
          d.getUTCHours() !== 0 ||
          d.getUTCMinutes() !== 0 ||
          d.getUTCSeconds() !== 0;
        return hasTime ? d.toLocaleString() : d.toLocaleDateString();
      }
    } catch {
      /* fall through */
    }
  }
  return str;
}

type Tab = "connection" | "schema" | "query" | "preview" | "save" | "saved";

interface ConnectorDetailPageProps {
  connectorType: "mssql" | "oracle" | "csv-xlsx";
  apiBasePath: string; // e.g. '/api/admin/mssql-connector'
  queriesApiPath: string; // e.g. '/api/admin/mssql-connector/queries'
  connectorBaseUrl: string; // e.g. 'http://localhost:4002'
  listPath: string; // e.g. '/admin/connectors/mssql'
  typeLabel: string;
  defaultSchema: string;
  paramSyntax: string; // '@param' or ':param'
}

export default function ConnectorDetailPage({
  connectorType,
  apiBasePath,
  queriesApiPath,
  connectorBaseUrl,
  listPath,
  typeLabel,
  defaultSchema,
  paramSyntax,
}: ConnectorDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const connectorId = params.id as string;

  const [config, setConfig] = useState<ConnectorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("connection");
  const [testStatus, setTestStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
    serverVersion?: string;
    error?: string;
  } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const [schemas, setSchemas] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState("");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [procedures, setProcedures] = useState<ProcedureInfo[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [queryMode, setQueryMode] = useState<"sql" | "procedure">("sql");
  const [sqlText, setSqlText] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState("");

  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveFilters, setSaveFilters] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // Saved Queries tab state
  const [savedQueries, setSavedQueries] = useState<SavedQueryInfo[]>([]);
  const [savedQueriesLoading, setSavedQueriesLoading] = useState(false);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [engineConfigs, setEngineConfigs] = useState<
    Record<string, EnginePublishConfig>
  >({});
  const [publishedQueryNames, setPublishedQueryNames] = useState<Set<string>>(
    new Set(),
  );

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBasePath}?id=${encodeURIComponent(connectorId)}`,
        { headers: csrfHeaders() },
      );
      if (!res.ok) {
        router.push(listPath);
        return;
      }
      const data = await res.json();
      setConfig(data);
      setSelectedSchema(data.defaultSchema || defaultSchema);
    } catch {
      router.push(listPath);
    } finally {
      setLoading(false);
    }
  }, [connectorId, router, apiBasePath, listPath, defaultSchema]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleTest = async () => {
    setTestLoading(true);
    setTestStatus(null);
    try {
      const res = await fetch(
        `${apiBasePath}?id=${encodeURIComponent(connectorId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ id: connectorId, action: "test" }),
        },
      );
      setTestStatus(await res.json());
    } catch {
      setTestStatus({ connected: false, error: "Network error" });
    } finally {
      setTestLoading(false);
    }
  };

  const fetchSchemas = async () => {
    setSchemaLoading(true);
    try {
      const res = await fetch(
        `${apiBasePath}?id=${encodeURIComponent(connectorId)}&resource=schemas`,
        { headers: csrfHeaders() },
      );
      setSchemas((await res.json()).schemas || []);
    } catch {
    } finally {
      setSchemaLoading(false);
    }
  };

  const fetchTables = async (schema: string) => {
    try {
      const res = await fetch(
        `${apiBasePath}?id=${encodeURIComponent(connectorId)}&resource=tables&schema=${encodeURIComponent(schema)}`,
        { headers: csrfHeaders() },
      );
      setTables((await res.json()).tables || []);
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    }
  };

  const fetchColumns = async (schema: string, table: string) => {
    try {
      const res = await fetch(
        `${apiBasePath}?id=${encodeURIComponent(connectorId)}&resource=columns&schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}`,
        { headers: csrfHeaders() },
      );
      setColumns((await res.json()).columns || []);
    } catch (err) {
      console.error("Failed to fetch columns:", err);
    }
  };

  const fetchProcedures = async (schema: string) => {
    try {
      const res = await fetch(
        `${apiBasePath}?id=${encodeURIComponent(connectorId)}&resource=procedures&schema=${encodeURIComponent(schema)}`,
        { headers: csrfHeaders() },
      );
      setProcedures((await res.json()).procedures || []);
    } catch (err) {
      console.error("Failed to fetch procedures:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "schema" && schemas.length === 0) fetchSchemas();
  }, [activeTab]);
  useEffect(() => {
    if (selectedSchema && activeTab === "schema") {
      fetchTables(selectedSchema);
      fetchProcedures(selectedSchema);
    }
  }, [selectedSchema, activeTab]);
  useEffect(() => {
    if (selectedTable && selectedSchema)
      fetchColumns(selectedSchema, selectedTable);
  }, [selectedTable]);

  const handlePreview = async () => {
    if (!sqlText.trim()) return;
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewResult(null);
    try {
      const res = await fetch(
        `${apiBasePath}?id=${encodeURIComponent(connectorId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            id: connectorId,
            action: "preview",
            sql: sqlText,
            maxRows: 100,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) setPreviewError(data.error || "Preview failed");
      else setPreviewResult(data);
    } catch {
      setPreviewError("Network error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    const filterKeys = saveFilters
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const filters = filterKeys.map((key) => ({
      key,
      binding: "body" as const,
    }));
    const queryId = saveName.replace(/\s+/g, "-").toLowerCase();
    try {
      const body: Record<string, unknown> = {
        id: queryId,
        connectorId,
        name: saveName,
        description: saveDescription,
        filters,
      };
      if (queryMode === "procedure" && selectedProcedure)
        body.procedureName = selectedProcedure;
      else body.sqlText = sqlText;

      const res = await fetch(queriesApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setSaveError(data.error || "Failed to save query");
      else {
        setSaveSuccess(
          `Query "${saveName}" saved! Use the "Publish to Engine" flow to make it available in Chat.`,
        );
        setSaveName("");
        setSaveDescription("");
        setSaveFilters("");
      }
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const generateSelectFromTable = (table: string, cols: ColumnInfo[]) => {
    const colList = cols.map((c) => c.name).join(", ");
    const schemaPrefix = selectedSchema ? `${selectedSchema}.` : "";
    setSqlText(`SELECT ${colList}\nFROM ${schemaPrefix}${table}`);
    setQueryMode("sql");
    setActiveTab("query");
  };

  // Saved Queries functions
  const fetchSavedQueries = useCallback(async () => {
    setSavedQueriesLoading(true);
    try {
      // Fetch saved queries from connector AND engine queries in parallel
      const [connRes, engineRes] = await Promise.all([
        fetch(
          `${queriesApiPath}?connectorId=${encodeURIComponent(connectorId)}`,
          { headers: csrfHeaders() },
        ),
        fetch("/api/admin/queries", { headers: csrfHeaders() }),
      ]);
      const connData = await connRes.json();
      setSavedQueries(
        Array.isArray(connData) ? connData : connData.queries || [],
      );

      // Cross-reference: find engine queries whose baseUrl matches this connector
      if (engineRes.ok) {
        const engineData = await engineRes.json();
        const engineQueries = (engineData.queries || []) as Array<{
          name: string;
          baseUrl?: string;
        }>;
        const published = new Set<string>(
          engineQueries
            .filter((q) => q.baseUrl === connectorBaseUrl)
            .map((q) => q.name),
        );
        setPublishedQueryNames(published);
      }
    } catch {
      setSavedQueries([]);
    } finally {
      setSavedQueriesLoading(false);
    }
  }, [queriesApiPath, connectorId, connectorBaseUrl]);

  useEffect(() => {
    if (activeTab === "saved") fetchSavedQueries();
  }, [activeTab, fetchSavedQueries]);

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm(`Delete query "${queryId}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(
        `${queriesApiPath}?id=${encodeURIComponent(queryId)}`,
        {
          method: "DELETE",
          headers: csrfHeaders(),
        },
      );
      if (res.ok) {
        setSavedQueries((prev) => prev.filter((q) => q.id !== queryId));
        setExpandedQuery(null);
      }
    } catch (err) {
      console.error("Failed to delete query:", err);
    }
  };

  const getEngineConfig = (queryId: string): EnginePublishConfig => {
    return (
      engineConfigs[queryId] || {
        source: "",
        chartType: "none",
        chartLabelKey: "",
        chartValueKeys: "",
        columnIdColumns: "",
        columnDateColumns: "",
        columnLabelColumns: "",
        columnValueColumns: "",
      }
    );
  };

  const updateEngineConfig = (
    queryId: string,
    field: keyof EnginePublishConfig,
    value: string,
  ) => {
    setEngineConfigs((prev) => ({
      ...prev,
      [queryId]: { ...getEngineConfig(queryId), [field]: value },
    }));
  };

  const handlePublishToEngine = async (query: SavedQueryInfo) => {
    const cfg = getEngineConfig(query.id);
    if (!cfg.source.trim()) {
      setPublishResults((prev) => ({
        ...prev,
        [query.id]: { success: false, message: "Source group is required" },
      }));
      return;
    }
    setPublishingId(query.id);
    setPublishResults((prev) => {
      const next = { ...prev };
      delete next[query.id];
      return next;
    });

    const filters = (query.filters || []).map((f) => ({
      key: f.key,
      binding: f.binding || "body",
    }));

    const chartConfig =
      cfg.chartType !== "none"
        ? {
            defaultType: cfg.chartType,
            labelKey: cfg.chartLabelKey || undefined,
            valueKeys: cfg.chartValueKeys
              ? cfg.chartValueKeys
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
          }
        : undefined;

    const columnConfig: Record<string, string[]> = {};
    if (cfg.columnIdColumns)
      columnConfig.idColumns = cfg.columnIdColumns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (cfg.columnDateColumns)
      columnConfig.dateColumns = cfg.columnDateColumns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (cfg.columnLabelColumns)
      columnConfig.labelColumns = cfg.columnLabelColumns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (cfg.columnValueColumns)
      columnConfig.valueColumns = cfg.columnValueColumns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const body = {
      name: query.id,
      description: query.description || query.name,
      source: cfg.source,
      type: "api",
      baseUrl: connectorBaseUrl,
      endpoint: `/api/queries/${encodeURIComponent(query.id)}/execute`,
      method: "POST",
      filters,
      estimatedDuration: 5,
      ...(chartConfig ? { chartConfig } : {}),
      ...(Object.keys(columnConfig).length > 0 ? { columnConfig } : {}),
    };

    try {
      const res = await fetch("/api/admin/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setPublishResults((prev) => ({
          ...prev,
          [query.id]: {
            success: true,
            message: `Published as "${data.id || query.id}"`,
          },
        }));
        setPublishedQueryNames((prev) => new Set(prev).add(query.id));
      } else {
        setPublishResults((prev) => ({
          ...prev,
          [query.id]: {
            success: false,
            message: data.error || "Publish failed",
          },
        }));
      }
    } catch {
      setPublishResults((prev) => ({
        ...prev,
        [query.id]: { success: false, message: "Network error" },
      }));
    } finally {
      setPublishingId(null);
    }
  };

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!config)
    return <div className="p-6 text-red-500">Connector not found</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: "connection", label: "Connection" },
    { key: "schema", label: "Schema Browser" },
    { key: "query", label: "Query Builder" },
    { key: "preview", label: "Preview" },
    { key: "save", label: "Save Query" },
    { key: "saved", label: "Saved Queries" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 pb-6 mb-6 border-b border-gray-100">
        <button
          onClick={() => router.push(listPath)}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          &larr; Back
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {config.name}
          </h1>
          <p className="text-sm text-gray-500">
            <span
              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mr-2 ${connectorType === "mssql" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}
            >
              {typeLabel}
            </span>
            {config.host}:{config.port} / {config.database}
          </p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "connection" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ID:</span>{" "}
              <span className="font-mono">{config.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Type:</span> {typeLabel}
            </div>
            <div>
              <span className="text-gray-500">Host:</span> {config.host}
            </div>
            <div>
              <span className="text-gray-500">Port:</span> {config.port}
            </div>
            <div>
              <span className="text-gray-500">Database:</span> {config.database}
            </div>
            <div>
              <span className="text-gray-500">Schema:</span>{" "}
              {config.defaultSchema || "(default)"}
            </div>
            <div>
              <span className="text-gray-500">Auth:</span> {config.authType}
            </div>
            <div>
              <span className="text-gray-500">Username:</span>{" "}
              {config.username || "(n/a)"}
            </div>
            <div>
              <span className="text-gray-500">Pool Size:</span>{" "}
              {config.maxPoolSize || 10}
            </div>
            <div>
              <span className="text-gray-500">Max Rows:</span>{" "}
              {config.maxRows || 10000}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleTest}
              disabled={testLoading}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {testLoading ? "Testing..." : "Test Connection"}
            </button>
            {testStatus && (
              <div
                className={`mt-3 p-3 rounded-lg text-sm ${testStatus.connected ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
              >
                {testStatus.connected ? (
                  <span>
                    Connected ({testStatus.latencyMs}ms)
                    {testStatus.serverVersion
                      ? ` - ${testStatus.serverVersion}`
                      : ""}
                  </span>
                ) : (
                  <span>Failed: {testStatus.error}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "schema" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          {schemaLoading ? (
            <div className="text-gray-400 text-sm">Loading schemas...</div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 border-r border-gray-100 pr-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Schemas
                </h3>
                <div className="space-y-1">
                  {schemas.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSelectedSchema(s);
                        setSelectedTable("");
                        setColumns([]);
                      }}
                      className={`block w-full text-left px-2 py-1 text-sm rounded ${selectedSchema === s ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      {s}
                    </button>
                  ))}
                  {schemas.length === 0 && (
                    <p className="text-xs text-gray-400">
                      No schemas found. Test the connection first.
                    </p>
                  )}
                </div>
              </div>
              <div className="col-span-1 border-r border-gray-100 pr-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Tables &amp; Views
                </h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {tables.map((t) => (
                    <button
                      key={`${t.schema}.${t.name}`}
                      onClick={() => setSelectedTable(t.name)}
                      className={`block w-full text-left px-2 py-1 text-sm rounded ${selectedTable === t.name ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      <span
                        className={`text-xs mr-1 ${t.type === "view" ? "text-purple-500" : "text-green-500"}`}
                      >
                        {t.type === "view" ? "V" : "T"}
                      </span>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-1 border-r border-gray-100 pr-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Columns{" "}
                  {selectedTable && (
                    <span className="text-gray-400">({selectedTable})</span>
                  )}
                </h3>
                {selectedTable && columns.length > 0 && (
                  <>
                    <div className="space-y-1 max-h-[350px] overflow-y-auto mb-3">
                      {columns.map((c) => (
                        <div
                          key={c.name}
                          className="px-2 py-1 text-sm text-gray-600"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs text-gray-400 ml-1">
                            {c.dataType}
                            {c.isPrimaryKey ? " PK" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        generateSelectFromTable(selectedTable, columns)
                      }
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Generate SELECT &rarr;
                    </button>
                  </>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Stored Procedures
                </h3>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {procedures.map((p) => (
                    <div key={`${p.schema}.${p.name}`} className="px-2 py-1">
                      <button
                        onClick={() => {
                          setSelectedProcedure(`${p.schema}.${p.name}`);
                          setQueryMode("procedure");
                          setActiveTab("query");
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {p.name}
                      </button>
                      {p.parameters.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({p.parameters.length} params)
                        </span>
                      )}
                    </div>
                  ))}
                  {procedures.length === 0 && selectedSchema && (
                    <p className="text-xs text-gray-400">
                      No procedures found.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "query" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex gap-2">
            {(["sql", "procedure"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setQueryMode(mode)}
                className={`px-3 py-1.5 text-sm rounded-lg ${queryMode === mode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {mode === "sql" ? "SQL Query" : "Stored Procedure"}
              </button>
            ))}
          </div>
          {queryMode === "sql" ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                SQL Query (SELECT only)
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono h-40 resize-y"
                placeholder={`SELECT column1, column2\nFROM ${selectedSchema || defaultSchema}.my_table\nWHERE status = ${paramSyntax}`}
                value={sqlText}
                onChange={(e) => setSqlText(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Use {paramSyntax} syntax for parameterized values.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Stored Procedure
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono"
                placeholder="schema.procedure_name"
                value={selectedProcedure}
                onChange={(e) => setSelectedProcedure(e.target.value)}
              />
            </div>
          )}
          <button
            onClick={() => {
              setActiveTab("preview");
              handlePreview();
            }}
            disabled={
              queryMode === "sql" ? !sqlText.trim() : !selectedProcedure.trim()
            }
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Run Preview
          </button>
        </div>
      )}

      {activeTab === "preview" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Query Results
            </h3>
            {previewResult && (
              <span className="text-xs text-gray-400">
                {previewResult.rowCount} rows in {previewResult.executionMs}ms
                {previewResult.truncated && " (truncated)"}
              </span>
            )}
          </div>
          {previewLoading && (
            <div className="text-sm text-gray-400">Executing query...</div>
          )}
          {previewError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {previewError}
            </div>
          )}
          {previewResult && previewResult.rows.length > 0 && (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50/80 sticky top-0">
                  <tr>
                    {previewResult.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewResult.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {previewResult.columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-1.5 text-gray-700 whitespace-nowrap"
                        >
                          {formatCellValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {previewResult && previewResult.rows.length === 0 && (
            <div className="text-sm text-gray-400">Query returned no rows.</div>
          )}
          {!previewLoading && !previewResult && !previewError && (
            <div className="text-sm text-gray-400">
              Write a query in the Query Builder tab, then click &quot;Run
              Preview&quot;.
            </div>
          )}
        </div>
      )}

      {activeTab === "save" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <form onSubmit={handleSave} className="space-y-4 max-w-lg">
            <h3 className="text-sm font-semibold text-gray-700">
              Save Query to Connector
            </h3>
            <p className="text-xs text-gray-500">
              This saves the query definition in the connector service. You can
              then publish it to the Engine as an API query.
            </p>
            {saveError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                {saveSuccess}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Query Name
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder="e.g. monthly_revenue"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder="e.g. Monthly revenue by region"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter Keys (comma-separated)
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                placeholder="e.g. region, date_range"
                value={saveFilters}
                onChange={(e) => setSaveFilters(e.target.value)}
              />
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs font-medium text-gray-600 mb-1">
                {queryMode === "procedure" ? "Procedure:" : "SQL:"}
              </p>
              <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                {queryMode === "procedure"
                  ? selectedProcedure
                  : sqlText || "(no query - go to Query Builder)"}
              </pre>
            </div>
            <button
              type="submit"
              disabled={
                saving || (!sqlText.trim() && !selectedProcedure.trim())
              }
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Query"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "saved" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                Saved Queries
              </h3>
              <p className="text-xs text-gray-500">
                View API contracts and publish queries to the Engine for Chat
                access.
              </p>
            </div>
            <button
              onClick={fetchSavedQueries}
              disabled={savedQueriesLoading}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {savedQueriesLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {savedQueriesLoading && savedQueries.length === 0 && (
            <div className="text-sm text-gray-400 p-6 text-center">
              Loading saved queries...
            </div>
          )}

          {!savedQueriesLoading && savedQueries.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
              <p className="text-sm text-gray-500">No saved queries yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Use the Query Builder and Save Query tabs to create queries.
              </p>
            </div>
          )}

          {savedQueries.map((query) => {
            const isExpanded = expandedQuery === query.id;
            const cfg = getEngineConfig(query.id);
            const result = publishResults[query.id];
            const filterCount = query.filters?.length || 0;

            return (
              <div
                key={query.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Collapsed header row */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedQuery(isExpanded ? null : query.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-400 text-sm flex-shrink-0">
                      {isExpanded ? "\u25BC" : "\u25B6"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">
                          {query.name || query.id}
                        </span>
                        {(publishedQueryNames.has(query.id) ||
                          result?.success) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded">
                            {"\u2705"} Published
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {query.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {filterCount} filter{filterCount !== 1 ? "s" : ""}
                      {query.createdAt &&
                        ` \u00B7 ${new Date(query.createdAt).toLocaleDateString()}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuery(query.id);
                      }}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    {/* SQL Section */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        SQL
                      </h4>
                      <pre className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-32">
                        {query.sqlText || query.procedureName || "(no SQL)"}
                      </pre>
                    </div>

                    {/* API Contract Section */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        API Contract
                      </h4>
                      <div className="bg-blue-50 rounded p-3 space-y-2 text-xs">
                        <div>
                          <span className="font-semibold text-blue-800">
                            POST
                          </span>
                          <span className="ml-2 font-mono text-blue-700">
                            {connectorBaseUrl}/api/queries/{query.id}/execute
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-blue-800">
                              Request Body:
                            </span>
                            <pre className="mt-1 font-mono text-blue-700 whitespace-pre">
                              {`{${filterCount > 0 ? `\n  "filters": { ${query.filters!.map((f) => `"${f.key}": "..."`).join(", ")} }` : ""}\n}`}
                            </pre>
                          </div>
                          <div>
                            <span className="font-medium text-blue-800">
                              Response:
                            </span>
                            <pre className="mt-1 font-mono text-blue-700 whitespace-pre">
                              {`{\n  "data": [...],\n  "rowCount": N,\n  "executionTime": "Nms"\n}`}
                            </pre>
                          </div>
                        </div>
                        {filterCount > 0 && (
                          <div>
                            <span className="font-medium text-blue-800">
                              Filters:
                            </span>
                            <span className="ml-1 text-blue-700">
                              {query.filters!.map((f) => f.key).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Publish to Engine Section */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Publish to Engine
                      </h4>
                      <div className="bg-gray-50 rounded p-3 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Source Group <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className="w-full max-w-xs border border-gray-300 rounded px-2.5 py-1.5 text-sm"
                            placeholder="e.g. hr, finance, analytics"
                            value={cfg.source}
                            onChange={(e) =>
                              updateEngineConfig(
                                query.id,
                                "source",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="border-t border-gray-200 pt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Chart Config (optional)
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Chart Type
                              </label>
                              <select
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                value={cfg.chartType}
                                onChange={(e) =>
                                  updateEngineConfig(
                                    query.id,
                                    "chartType",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="none">None</option>
                                <option value="bar">Bar</option>
                                <option value="line">Line</option>
                                <option value="pie">Pie</option>
                                <option value="area">Area</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Label Column
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                placeholder="e.g. name"
                                value={cfg.chartLabelKey}
                                onChange={(e) =>
                                  updateEngineConfig(
                                    query.id,
                                    "chartLabelKey",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Value Columns
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                placeholder="e.g. total, count"
                                value={cfg.chartValueKeys}
                                onChange={(e) =>
                                  updateEngineConfig(
                                    query.id,
                                    "chartValueKeys",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Column Config (optional)
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                ID Columns
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                placeholder="e.g. id, employeeId"
                                value={cfg.columnIdColumns}
                                onChange={(e) =>
                                  updateEngineConfig(
                                    query.id,
                                    "columnIdColumns",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Date Columns
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                placeholder="e.g. createdAt, hireDate"
                                value={cfg.columnDateColumns}
                                onChange={(e) =>
                                  updateEngineConfig(
                                    query.id,
                                    "columnDateColumns",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Label Columns
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                placeholder="e.g. name, title"
                                value={cfg.columnLabelColumns}
                                onChange={(e) =>
                                  updateEngineConfig(
                                    query.id,
                                    "columnLabelColumns",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">
                                Value Columns
                              </label>
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                                placeholder="e.g. salary, amount"
                                value={cfg.columnValueColumns}
                                onChange={(e) =>
                                  updateEngineConfig(
                                    query.id,
                                    "columnValueColumns",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => handlePublishToEngine(query)}
                            disabled={publishingId === query.id}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {publishingId === query.id
                              ? "Publishing..."
                              : publishedQueryNames.has(query.id)
                                ? "Update in Engine"
                                : "Publish to Engine"}
                          </button>
                          {result && (
                            <span
                              className={`text-xs ${result.success ? "text-green-600" : "text-red-600"}`}
                            >
                              {result.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
