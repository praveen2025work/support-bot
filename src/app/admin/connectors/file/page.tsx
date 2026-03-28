"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  FileText,
  ChevronLeft,
  Eye,
  Table2,
  Columns3,
  Play,
  ArrowUpDown,
  Search,
  RefreshCcw,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface FilterBinding {
  key: string;
  binding: "body" | "query_param" | "path" | "column";
}

interface ColumnConfig {
  idColumns?: string[];
  dateColumns?: string[];
  labelColumns?: string[];
  valueColumns?: string[];
  ignoreColumns?: string[];
}

interface QueryRecord {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  url: string;
  source: string;
  filters: FilterBinding[];
  type: "api" | "url" | "document" | "csv" | "xlsx" | "combined";
  filePath?: string;
  fileBaseDir?: string;
  sheetName?: string;
  columnConfig?: ColumnConfig;
}

interface SchemaColumn {
  name: string;
  type: string;
  distinctCount: number;
  nullCount: number;
  sampleValues: string[];
}

interface SchemaInfo {
  queryName: string;
  rowCount: number;
  columnCount: number;
  schema: SchemaColumn[];
}

interface PreviewData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
  durationMs: number;
}

type FileType = "csv" | "xlsx";

interface FormState {
  name: string;
  description: string;
  source: string;
  type: FileType;
  filePath: string;
  fileBaseDir: string;
  sheetName: string;
  idColumns: string;
  dateColumns: string;
  labelColumns: string;
  valueColumns: string;
  ignoreColumns: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  source: "",
  type: "csv",
  filePath: "",
  fileBaseDir: "",
  sheetName: "",
  idColumns: "",
  dateColumns: "",
  labelColumns: "",
  valueColumns: "",
  ignoreColumns: "",
};

type DetailTab = "schema" | "preview" | "api";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToCsv(arr?: string[]): string {
  return arr?.join(", ") ?? "";
}

function formToPayload(form: FormState, editId?: string) {
  const columnConfig: ColumnConfig = {};
  const id = csvToArray(form.idColumns);
  const date = csvToArray(form.dateColumns);
  const label = csvToArray(form.labelColumns);
  const value = csvToArray(form.valueColumns);
  const ignore = csvToArray(form.ignoreColumns);
  if (id.length) columnConfig.idColumns = id;
  if (date.length) columnConfig.dateColumns = date;
  if (label.length) columnConfig.labelColumns = label;
  if (value.length) columnConfig.valueColumns = value;
  if (ignore.length) columnConfig.ignoreColumns = ignore;

  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description.trim(),
    source: form.source.trim(),
    type: form.type,
    filePath: form.filePath.trim(),
    url: form.filePath.trim(),
    estimatedDuration: 1,
    filters: [],
  };

  if (form.fileBaseDir.trim()) {
    payload.fileBaseDir = form.fileBaseDir.trim();
  }
  if (form.type === "xlsx" && form.sheetName.trim()) {
    payload.sheetName = form.sheetName.trim();
  }
  if (Object.keys(columnConfig).length > 0) {
    payload.columnConfig = columnConfig;
  }
  if (editId) {
    payload.id = editId;
  }
  return payload;
}

function queryToForm(q: QueryRecord): FormState {
  return {
    name: q.name,
    description: q.description,
    source: q.source,
    type: q.type as FileType,
    filePath: q.filePath ?? "",
    fileBaseDir: q.fileBaseDir ?? "",
    sheetName: q.sheetName ?? "",
    idColumns: arrayToCsv(q.columnConfig?.idColumns),
    dateColumns: arrayToCsv(q.columnConfig?.dateColumns),
    labelColumns: arrayToCsv(q.columnConfig?.labelColumns),
    valueColumns: arrayToCsv(q.columnConfig?.valueColumns),
    ignoreColumns: arrayToCsv(q.columnConfig?.ignoreColumns),
  };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function formatCell(val: unknown): string {
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function FileSourcesPage() {
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Detail view
  const [selectedQuery, setSelectedQuery] = useState<QueryRecord | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("schema");
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSort, setPreviewSort] = useState<{
    column: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [previewSearch, setPreviewSearch] = useState("");
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  /* ---- Fetch ---------------------------------------------------- */

  const fetchQueries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queries");
      const data = await res.json();
      const all: QueryRecord[] = data.queries ?? [];
      setQueries(all.filter((q) => q.type === "csv" || q.type === "xlsx"));
    } catch {
      setError("Failed to load file sources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  /* ---- Schema fetch ---------------------------------------------- */

  const fetchSchema = useCallback(async (queryName: string) => {
    setSchemaLoading(true);
    try {
      const res = await fetch(
        `/api/data/schema/${encodeURIComponent(queryName)}`,
      );
      if (!res.ok) throw new Error("Schema fetch failed");
      const data: SchemaInfo = await res.json();
      setSchema(data);
    } catch {
      setSchema(null);
      setError("Failed to load schema. Ensure the Engine is running.");
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  /* ---- Preview fetch --------------------------------------------- */

  const fetchPreview = useCallback(
    async (
      queryName: string,
      page = 1,
      sort?: { column: string; direction: "asc" | "desc" } | null,
      search?: string,
    ) => {
      setPreviewLoading(true);
      try {
        const body: Record<string, unknown> = {
          queryName,
          page,
          pageSize: 25,
        };
        if (sort) body.sort = sort;
        if (search?.trim()) body.search = search.trim();

        const res = await fetch("/api/data/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Preview failed");
        const data = await res.json();
        setPreview({
          headers: data.headers ?? [],
          rows: data.rows ?? [],
          totalRows: data.totalRows ?? data.rows?.length ?? 0,
          page: data.page ?? page,
          pageSize: data.pageSize ?? 25,
          durationMs: data.durationMs ?? 0,
        });
      } catch {
        setPreview(null);
        setError("Failed to load preview. Ensure the Engine is running.");
      } finally {
        setPreviewLoading(false);
      }
    },
    [],
  );

  /* ---- Select a query for detail --------------------------------- */

  const openDetail = useCallback(
    (q: QueryRecord) => {
      setSelectedQuery(q);
      setDetailTab("schema");
      setSchema(null);
      setPreview(null);
      setPreviewPage(1);
      setPreviewSort(null);
      setPreviewSearch("");
      setError("");
      setSuccess("");
      fetchSchema(q.name);
    },
    [fetchSchema],
  );

  const closeDetail = () => {
    setSelectedQuery(null);
    setSchema(null);
    setPreview(null);
  };

  /* ---- Tab change handler ---------------------------------------- */

  const switchTab = useCallback(
    (tab: DetailTab) => {
      setDetailTab(tab);
      if (tab === "schema" && selectedQuery && !schema) {
        fetchSchema(selectedQuery.name);
      }
      if (tab === "preview" && selectedQuery && !preview) {
        fetchPreview(selectedQuery.name, 1);
      }
    },
    [selectedQuery, schema, preview, fetchSchema, fetchPreview],
  );

  /* ---- Form helpers --------------------------------------------- */

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
    setSuccess("");
    closeDetail();
  };

  const startEdit = (q: QueryRecord) => {
    setForm(queryToForm(q));
    setEditingId(q.id);
    setShowForm(true);
    setSuccess("");
    setError("");
    closeDetail();
  };

  /* ---- Save ----------------------------------------------------- */

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.filePath.trim()) {
      setError("File path is required.");
      return;
    }
    if (!form.source.trim()) {
      setError("Source group is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const isEdit = editingId !== null;
      const payload = formToPayload(form, editingId ?? undefined);

      const res = await fetch("/api/admin/queries", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Request failed with status ${res.status}`,
        );
      }

      setSuccess(isEdit ? "File source updated." : "File source created.");
      resetForm();
      await fetchQueries();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete --------------------------------------------------- */

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this file source? This cannot be undone.")) return;

    setDeletingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/queries?id=${id}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Delete failed.");
      }
      setSuccess("File source deleted.");
      if (selectedQuery?.id === id) closeDetail();
      await fetchQueries();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ---- Copy endpoint -------------------------------------------- */

  const copyEndpoint = (queryName: string) => {
    const url = `${window.location.origin}/api/data/query`;
    const example = JSON.stringify(
      { queryName, page: 1, pageSize: 50 },
      null,
      2,
    );
    navigator.clipboard.writeText(
      `POST ${url}\nContent-Type: application/json\n\n${example}`,
    );
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  /* ---- Preview pagination / sort -------------------------------- */

  const handlePreviewSort = (col: string) => {
    if (!selectedQuery) return;
    const newSort =
      previewSort?.column === col && previewSort.direction === "asc"
        ? { column: col, direction: "desc" as const }
        : { column: col, direction: "asc" as const };
    setPreviewSort(newSort);
    fetchPreview(selectedQuery.name, 1, newSort, previewSearch);
  };

  const handlePreviewPage = (page: number) => {
    if (!selectedQuery) return;
    setPreviewPage(page);
    fetchPreview(selectedQuery.name, page, previewSort, previewSearch);
  };

  const handlePreviewSearch = () => {
    if (!selectedQuery) return;
    setPreviewPage(1);
    fetchPreview(selectedQuery.name, 1, previewSort, previewSearch);
  };

  /* ---- Render --------------------------------------------------- */

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/admin/connectors"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft size={14} />
          Data Sources
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between pb-6 mb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet size={24} className="text-emerald-600" />
            CSV / XLSX File Sources
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage CSV and Excel file-based data sources. Each file source
            becomes a queryable REST API endpoint accessible to the chatbot,
            dashboards, and Data Explorer.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add File Source
          </button>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Inline Form                                                  */}
      {/* ============================================================ */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit File Source" : "Add File Source"}
            </h2>
            <button
              onClick={resetForm}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. monthly_sales"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Group <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => updateField("source", e.target.value)}
                placeholder="e.g. finance"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description of the data"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX (Excel)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Path <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.filePath}
                onChange={(e) => updateField("filePath", e.target.value)}
                placeholder="e.g. data/sales-data.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Directory{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.fileBaseDir}
                onChange={(e) => updateField("fileBaseDir", e.target.value)}
                placeholder="Override default FILE_BASE_DIR"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            {form.type === "xlsx" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sheet Name{" "}
                  <span className="text-gray-400 font-normal">
                    (blank = auto-register all sheets)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.sheetName}
                  onChange={(e) => updateField("sheetName", e.target.value)}
                  placeholder="e.g. Sheet1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Column config */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              Column Configuration{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Comma-separated column names. Leave blank for auto-detection.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(
                [
                  ["idColumns", "ID Columns", "e.g. id, transaction_id"],
                  ["dateColumns", "Date Columns", "e.g. date, created_at"],
                  ["labelColumns", "Label Columns", "e.g. name, category"],
                  ["valueColumns", "Value Columns", "e.g. amount, quantity"],
                  ["ignoreColumns", "Ignore Columns", "e.g. internal_id"],
                ] as const
              ).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={16} />
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Source"
                  : "Create Source"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Loading / Empty states                                       */}
      {/* ============================================================ */}
      {loading && (
        <div className="text-center py-12 text-sm text-gray-500">
          Loading file sources...
        </div>
      )}

      {!loading && queries.length === 0 && !showForm && (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            No CSV or XLSX file sources configured yet.
          </p>
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Your First File Source
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Source List + Detail Split View                               */}
      {/* ============================================================ */}
      {!loading && queries.length > 0 && (
        <div
          className={`grid gap-6 ${selectedQuery ? "grid-cols-1 lg:grid-cols-[340px_1fr]" : "grid-cols-1"}`}
        >
          {/* ---- Left: Source List --------------------------------- */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
              {queries.length} File Source{queries.length !== 1 ? "s" : ""}
            </div>
            {queries.map((q) => {
              const isSelected = selectedQuery?.id === q.id;
              return (
                <div
                  key={q.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                  onClick={() => openDetail(q)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            q.type === "csv"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {q.type === "csv" ? (
                            <FileText size={10} />
                          ) : (
                            <FileSpreadsheet size={10} />
                          )}
                          {q.type.toUpperCase()}
                        </span>
                        <span className="font-medium text-sm text-gray-900 truncate">
                          {q.name}
                        </span>
                      </div>
                      {q.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {q.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                        <span className="font-mono">{q.filePath}</span>
                        {q.sheetName && (
                          <>
                            <span>·</span>
                            <span>Sheet: {q.sheetName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(q);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(q.id);
                        }}
                        disabled={deletingId === q.id}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">
                      {q.source}
                    </span>
                    {q.columnConfig && (
                      <span className="text-[10px] text-gray-400">
                        {Object.values(q.columnConfig).flat().length} columns
                        configured
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- Right: Detail Panel -------------------------------- */}
          {selectedQuery && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedQuery.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedQuery.type === "csv"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {selectedQuery.type.toUpperCase()}
                    </span>
                  </div>
                  {selectedQuery.description && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {selectedQuery.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="font-mono">{selectedQuery.filePath}</span>
                    {selectedQuery.sheetName && (
                      <span>Sheet: {selectedQuery.sheetName}</span>
                    )}
                    <span>Source: {selectedQuery.source}</span>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                {(
                  [
                    { key: "schema", label: "Schema", icon: Columns3 },
                    { key: "preview", label: "Data Preview", icon: Table2 },
                    { key: "api", label: "REST API", icon: ExternalLink },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => switchTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      detailTab === key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {/* ---- Schema Tab ---------------------------------- */}
                {detailTab === "schema" && (
                  <div>
                    {schemaLoading ? (
                      <div className="text-center py-8 text-sm text-gray-500">
                        Loading schema...
                      </div>
                    ) : schema ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              <strong>{schema.columnCount}</strong> columns
                            </span>
                            <span>
                              <strong>
                                {schema.rowCount.toLocaleString()}
                              </strong>{" "}
                              rows
                            </span>
                          </div>
                          <button
                            onClick={() => fetchSchema(selectedQuery.name)}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            <RefreshCcw size={12} />
                            Refresh
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                  Column
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                  Type
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                  Distinct
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                  Sample Values
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-gray-600">
                                  Role
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {schema.schema.map((col) => {
                                const cc = selectedQuery.columnConfig;
                                const role = cc?.idColumns?.includes(col.name)
                                  ? "ID"
                                  : cc?.dateColumns?.includes(col.name)
                                    ? "Date"
                                    : cc?.labelColumns?.includes(col.name)
                                      ? "Label"
                                      : cc?.valueColumns?.includes(col.name)
                                        ? "Value"
                                        : cc?.ignoreColumns?.includes(col.name)
                                          ? "Ignored"
                                          : "";
                                return (
                                  <tr
                                    key={col.name}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-3 py-2 font-mono text-xs text-gray-900">
                                      {col.name}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                          col.type === "number"
                                            ? "bg-purple-50 text-purple-700"
                                            : col.type === "date"
                                              ? "bg-amber-50 text-amber-700"
                                              : "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        {col.type}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-600">
                                      {col.distinctCount.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-1">
                                        {col.sampleValues
                                          .slice(0, 4)
                                          .map((v, i) => (
                                            <span
                                              key={i}
                                              className="px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded text-[11px] text-[var(--text-secondary)] max-w-[120px] truncate"
                                            >
                                              {typeof v === "object" &&
                                              v !== null
                                                ? ((v as { value?: string })
                                                    .value ?? JSON.stringify(v))
                                                : String(v)}
                                            </span>
                                          ))}
                                        {col.sampleValues.length > 4 && (
                                          <span className="text-[11px] text-gray-400">
                                            +{col.sampleValues.length - 4}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      {role && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                            role === "Ignored"
                                              ? "bg-gray-200 text-gray-500"
                                              : "bg-blue-50 text-blue-600"
                                          }`}
                                        >
                                          {role}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500">
                        <p>
                          Could not load schema. Ensure the Engine is running.
                        </p>
                        <button
                          onClick={() => fetchSchema(selectedQuery.name)}
                          className="mt-2 text-blue-600 hover:underline text-xs"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ---- Preview Tab --------------------------------- */}
                {detailTab === "preview" && (
                  <div>
                    {/* Search + refresh toolbar */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-1 max-w-sm">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          value={previewSearch}
                          onChange={(e) => setPreviewSearch(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handlePreviewSearch()
                          }
                          placeholder="Search across all columns..."
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={handlePreviewSearch}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        <Play size={14} />
                        Run
                      </button>
                      <button
                        onClick={() => {
                          setPreviewSearch("");
                          setPreviewSort(null);
                          setPreviewPage(1);
                          fetchPreview(selectedQuery.name, 1);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                        title="Reset"
                      >
                        <RefreshCcw size={14} />
                      </button>
                    </div>

                    {previewLoading ? (
                      <div className="text-center py-8 text-sm text-gray-500">
                        Loading preview...
                      </div>
                    ) : preview && preview.rows.length > 0 ? (
                      <>
                        {/* Stats bar */}
                        <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                          <span>
                            Showing {(preview.page - 1) * preview.pageSize + 1}–
                            {Math.min(
                              preview.page * preview.pageSize,
                              preview.totalRows,
                            )}{" "}
                            of {preview.totalRows.toLocaleString()} rows
                          </span>
                          {preview.durationMs > 0 && (
                            <span>{preview.durationMs}ms</span>
                          )}
                        </div>

                        {/* Data table */}
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                {preview.headers.map((h) => (
                                  <th
                                    key={h}
                                    className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100"
                                    onClick={() => handlePreviewSort(h)}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      {h}
                                      <ArrowUpDown
                                        size={11}
                                        className={
                                          previewSort?.column === h
                                            ? "text-blue-600"
                                            : "text-gray-300"
                                        }
                                      />
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {preview.rows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-gray-50">
                                  {preview.headers.map((h) => (
                                    <td
                                      key={h}
                                      className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                                    >
                                      {formatCell(row[h])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {preview.totalRows > preview.pageSize && (
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <button
                              onClick={() => handlePreviewPage(previewPage - 1)}
                              disabled={previewPage <= 1}
                              className="px-3 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                            >
                              Previous
                            </button>
                            <span className="text-xs text-gray-500">
                              Page {previewPage} of{" "}
                              {Math.ceil(preview.totalRows / preview.pageSize)}
                            </span>
                            <button
                              onClick={() => handlePreviewPage(previewPage + 1)}
                              disabled={
                                previewPage >=
                                Math.ceil(preview.totalRows / preview.pageSize)
                              }
                              className="px-3 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : preview && preview.rows.length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-500">
                        No rows found
                        {previewSearch ? ` matching "${previewSearch}"` : ""}.
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500">
                        <p>
                          Could not load preview. Ensure the Engine is running.
                        </p>
                        <button
                          onClick={() => fetchPreview(selectedQuery.name, 1)}
                          className="mt-2 text-blue-600 hover:underline text-xs"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ---- REST API Tab -------------------------------- */}
                {detailTab === "api" && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      This file source is exposed as a REST API endpoint through
                      the Engine. Use these endpoints to query data
                      programmatically.
                    </p>

                    {/* Query endpoint */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Query Data
                        </h3>
                        <button
                          onClick={() => copyEndpoint(selectedQuery.name)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          {copiedEndpoint ? (
                            <Check size={12} className="text-green-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                          {copiedEndpoint ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                        <div className="text-green-400 mb-2">
                          POST /api/data/query
                        </div>
                        <div className="text-gray-400 mb-1">
                          Content-Type: application/json
                        </div>
                        <pre className="text-gray-300 mt-2">
                          {JSON.stringify(
                            {
                              queryName: selectedQuery.name,
                              page: 1,
                              pageSize: 50,
                              filters: {},
                              sort: {
                                column: "...",
                                direction: "asc",
                              },
                              search: "",
                              groupBy: "",
                              aggregation: "sum",
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    </div>

                    {/* Schema endpoint */}
                    <div className="mb-5">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">
                        Get Schema
                      </h3>
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs">
                        <span className="text-green-400">GET</span>{" "}
                        /api/data/schema/
                        <span className="text-blue-400">
                          {selectedQuery.name}
                        </span>
                      </div>
                    </div>

                    {/* Distinct values endpoint */}
                    <div className="mb-5">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">
                        Distinct Column Values
                      </h3>
                      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs">
                        <span className="text-green-400">GET</span>{" "}
                        /api/data/distinct/
                        <span className="text-blue-400">
                          {selectedQuery.name}
                        </span>
                        /
                        <span className="text-amber-400">
                          {"<column_name>"}
                        </span>
                      </div>
                    </div>

                    {/* Source info */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Registered Source Info
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Query Name:</span>
                          <span className="ml-2 font-mono text-gray-900">
                            {selectedQuery.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <span className="ml-2 font-mono text-gray-900">
                            {selectedQuery.type}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">File Path:</span>
                          <span className="ml-2 font-mono text-gray-900">
                            {selectedQuery.filePath}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Source:</span>
                          <span className="ml-2 font-mono text-gray-900">
                            {selectedQuery.source}
                          </span>
                        </div>
                        {selectedQuery.sheetName && (
                          <div>
                            <span className="text-gray-500">Sheet:</span>
                            <span className="ml-2 font-mono text-gray-900">
                              {selectedQuery.sheetName}
                            </span>
                          </div>
                        )}
                        {selectedQuery.fileBaseDir && (
                          <div>
                            <span className="text-gray-500">Base Dir:</span>
                            <span className="ml-2 font-mono text-gray-900">
                              {selectedQuery.fileBaseDir}
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedQuery.columnConfig && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs font-medium text-gray-600 mb-2">
                            Column Configuration
                          </div>
                          <div className="space-y-1 text-xs">
                            {selectedQuery.columnConfig.idColumns?.length ? (
                              <div>
                                <span className="text-gray-500">ID:</span>{" "}
                                <span className="font-mono">
                                  {selectedQuery.columnConfig.idColumns.join(
                                    ", ",
                                  )}
                                </span>
                              </div>
                            ) : null}
                            {selectedQuery.columnConfig.dateColumns?.length ? (
                              <div>
                                <span className="text-gray-500">Date:</span>{" "}
                                <span className="font-mono">
                                  {selectedQuery.columnConfig.dateColumns.join(
                                    ", ",
                                  )}
                                </span>
                              </div>
                            ) : null}
                            {selectedQuery.columnConfig.labelColumns?.length ? (
                              <div>
                                <span className="text-gray-500">Label:</span>{" "}
                                <span className="font-mono">
                                  {selectedQuery.columnConfig.labelColumns.join(
                                    ", ",
                                  )}
                                </span>
                              </div>
                            ) : null}
                            {selectedQuery.columnConfig.valueColumns?.length ? (
                              <div>
                                <span className="text-gray-500">Value:</span>{" "}
                                <span className="font-mono">
                                  {selectedQuery.columnConfig.valueColumns.join(
                                    ", ",
                                  )}
                                </span>
                              </div>
                            ) : null}
                            {selectedQuery.columnConfig.ignoreColumns
                              ?.length ? (
                              <div>
                                <span className="text-gray-500">Ignored:</span>{" "}
                                <span className="font-mono">
                                  {selectedQuery.columnConfig.ignoreColumns.join(
                                    ", ",
                                  )}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Engine integration note */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                      <strong>Engine Integration:</strong> This file source is
                      automatically registered in the Engine query registry. It
                      can be queried by name through the chatbot (
                      <code className="bg-blue-100 px-1 rounded">
                        run {selectedQuery.name}
                      </code>
                      ), displayed in the Data Explorer, and used in dashboard
                      cards.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prompt to select when no detail */}
          {!selectedQuery && (
            <div className="hidden lg:flex items-center justify-center border border-dashed border-gray-200 rounded-xl p-12">
              <div className="text-center">
                <Eye size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">
                  Select a file source to view schema, preview data, and access
                  REST API details
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
