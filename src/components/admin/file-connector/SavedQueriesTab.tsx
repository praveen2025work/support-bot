"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FileSourceConfig, QueryPipeline, SavedQuery } from "./types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface SavedQueriesTabProps {
  sourceId: string;
  source: FileSourceConfig;
  pipeline?: QueryPipeline;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type ChartType = "bar" | "line" | "pie" | "table";

const CHART_TYPES: ChartType[] = ["bar", "line", "pie", "table"];

const DISPLAY_GROUPS = [
  "default",
  "finance",
  "analytics",
  "operations",
  "sales",
  "marketing",
];

const BINDING_TYPES = ["column", "query_param", "path", "body"] as const;

const INPUT_TYPES = [
  "select",
  "multi_select",
  "text",
  "date_range",
  "number_range",
] as const;

interface FilterParam {
  column: string;
  binding: (typeof BINDING_TYPES)[number];
  inputType: (typeof INPUT_TYPES)[number];
}

interface DrillDownTarget {
  sourceColumn: string;
  targetQuery: string;
  targetFilter: string;
}

interface QueryFormState {
  name: string;
  displayGroup: string;
  description: string;
  chartType: ChartType;
  labelColumn: string;
  valueColumns: string[];
  filterParams: FilterParam[];
  drillDownTargets: DrillDownTarget[];
}

function emptyForm(): QueryFormState {
  return {
    name: "",
    displayGroup: "default",
    description: "",
    chartType: "bar",
    labelColumn: "",
    valueColumns: [],
    filterParams: [],
    drillDownTargets: [],
  };
}

function formFromQuery(q: SavedQuery): QueryFormState {
  return {
    name: q.name,
    displayGroup: q.displayGroup,
    description: q.description,
    chartType: (q.chartConfig?.defaultType as ChartType) ?? "bar",
    labelColumn: q.chartConfig?.labelKey ?? "",
    valueColumns: q.chartConfig?.valueKeys ?? [],
    filterParams: (q.filterParams ?? []).map((f) => ({ ...f })),
    drillDownTargets: (q.drillDown ?? []).map((d) => ({ ...d })),
  };
}

function formToPayload(
  form: QueryFormState,
  pipeline: QueryPipeline,
): Omit<SavedQuery, "id" | "createdAt" | "updatedAt" | "status"> {
  return {
    name: form.name,
    displayGroup: form.displayGroup,
    description: form.description,
    pipeline,
    chartConfig: {
      defaultType: form.chartType,
      labelKey: form.labelColumn,
      valueKeys: [...form.valueColumns],
    },
    filterParams: form.filterParams.map((f) => ({ ...f })),
    drillDown: form.drillDownTargets.map((d) => ({ ...d })),
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SavedQueriesTab({
  sourceId,
  source,
  pipeline,
}: SavedQueriesTabProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<QueryFormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- derived columns from the selected query pipeline or prop ---- */
  const selectedQuery = useMemo(
    () => queries.find((q) => q.id === selectedId) ?? null,
    [queries, selectedId],
  );

  const activePipeline = selectedQuery?.pipeline ?? pipeline;

  const columns = useMemo(() => activePipeline?.select ?? [], [activePipeline]);

  /* ---- fetch saved queries ---- */
  const fetchQueries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/file-sources/${sourceId}/queries`);
      if (!res.ok) throw new Error("Failed to load saved queries");
      const data: SavedQuery[] = await res.json();
      setQueries(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load saved queries";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    void fetchQueries();
  }, [fetchQueries]);

  /* ---- select a query ---- */
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const q = queries.find((x) => x.id === id);
      if (q) {
        setForm(formFromQuery(q));
      }
    },
    [queries],
  );

  /* ---- form updaters (immutable) ---- */
  const updateField = useCallback(
    <K extends keyof QueryFormState>(key: K, value: QueryFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleValueColumn = useCallback((col: string) => {
    setForm((prev) => {
      const next = prev.valueColumns.includes(col)
        ? prev.valueColumns.filter((c) => c !== col)
        : [...prev.valueColumns, col];
      return { ...prev, valueColumns: next };
    });
  }, []);

  /* ---- filter param helpers ---- */
  const addFilterParam = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      filterParams: [
        ...prev.filterParams,
        { column: "", binding: "column", inputType: "select" },
      ],
    }));
  }, []);

  const updateFilterParam = useCallback(
    (idx: number, patch: Partial<FilterParam>) => {
      setForm((prev) => ({
        ...prev,
        filterParams: prev.filterParams.map((f, i) =>
          i === idx ? { ...f, ...patch } : f,
        ),
      }));
    },
    [],
  );

  const removeFilterParam = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      filterParams: prev.filterParams.filter((_, i) => i !== idx),
    }));
  }, []);

  /* ---- drill-down helpers ---- */
  const addDrillDown = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      drillDownTargets: [
        ...prev.drillDownTargets,
        { sourceColumn: "", targetQuery: "", targetFilter: "" },
      ],
    }));
  }, []);

  const updateDrillDown = useCallback(
    (idx: number, patch: Partial<DrillDownTarget>) => {
      setForm((prev) => ({
        ...prev,
        drillDownTargets: prev.drillDownTargets.map((d, i) =>
          i === idx ? { ...d, ...patch } : d,
        ),
      }));
    },
    [],
  );

  const removeDrillDown = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      drillDownTargets: prev.drillDownTargets.filter((_, i) => i !== idx),
    }));
  }, []);

  /* ---- save current pipeline as new draft ---- */
  const handleSaveCurrentPipeline = useCallback(async () => {
    if (!pipeline) return;
    setSelectedId(null);
    setForm({
      ...emptyForm(),
      name: `Query ${queries.length + 1}`,
    });
  }, [pipeline, queries.length]);

  /* ---- API actions ---- */
  const handleSaveDraft = useCallback(async () => {
    if (!form.name.trim()) {
      setError("Query name is required");
      return;
    }
    const pl = activePipeline ?? { select: [] };
    const payload = formToPayload(form, pl);
    setSaving(true);
    setError(null);
    try {
      const isNew = !selectedId;
      const url = isNew
        ? `/api/admin/file-sources/${sourceId}/queries`
        : `/api/admin/file-sources/${sourceId}/queries/${selectedId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save query");
      const saved: SavedQuery = await res.json();
      await fetchQueries();
      setSelectedId(saved.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save query";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [form, activePipeline, selectedId, sourceId, fetchQueries]);

  const handlePublish = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/file-sources/${sourceId}/queries/${selectedId}/publish`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to publish query");
      await fetchQueries();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to publish query";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [selectedId, sourceId, fetchQueries]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/file-sources/${sourceId}/queries/${selectedId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete query");
      setSelectedId(null);
      setForm(emptyForm());
      await fetchQueries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete query";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [selectedId, sourceId, fetchQueries]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex h-full">
      {/* ---- Left Panel ---- */}
      <div className="w-[220px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-primary)] flex flex-col">
        <div className="p-3 border-b border-[var(--border)]">
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            Saved Queries
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
            {source.name}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="p-3 text-[11px] text-[var(--text-muted)]">
              Loading&hellip;
            </div>
          )}

          {!loading && queries.length === 0 && (
            <div className="p-3 text-[11px] text-[var(--text-muted)]">
              No saved queries yet.
            </div>
          )}

          {queries.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSelect(q.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)] transition-colors ${
                selectedId === q.id
                  ? "bg-[var(--brand-subtle)]"
                  : "hover:bg-[var(--bg-secondary)]"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                  {q.name}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    q.status === "published"
                      ? "bg-[var(--success-subtle)] text-[var(--success)]"
                      : "bg-[var(--bg-secondary)] text-[var(--text-muted)]"
                  }`}
                >
                  {q.status === "published" ? "Published" : "Draft"}
                </span>
              </div>
              {q.description && (
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  {q.description}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={handleSaveCurrentPipeline}
            disabled={!pipeline}
            className="w-full text-[11px] font-medium text-[var(--brand)] bg-[var(--brand-subtle)] rounded-[var(--radius-md)] px-3 py-2 hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            + Save Current Query
          </button>
        </div>
      </div>

      {/* ---- Right Panel ---- */}
      <div className="flex-1 overflow-auto p-5">
        {error && (
          <div className="mb-4 text-[12px] text-[var(--error)] bg-[var(--error-subtle)] rounded-[var(--radius-md)] px-3 py-2">
            {error}
          </div>
        )}

        {!selectedId && !form.name ? (
          <div className="flex items-center justify-center h-full text-[12px] text-[var(--text-muted)]">
            Select a query or save the current pipeline to get started.
          </div>
        ) : (
          <div className="max-w-[640px] space-y-6">
            {/* ---- Query Details ---- */}
            <section>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
                Query Details
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Query Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Revenue by Region"
                    className="w-full text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Display Group
                  </label>
                  <select
                    value={form.displayGroup}
                    onChange={(e) =>
                      updateField("displayGroup", e.target.value)
                    }
                    className="w-full text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  >
                    {DISPLAY_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={3}
                    placeholder="What does this query show?"
                    className="w-full text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                  />
                </div>
              </div>
            </section>

            {/* ---- Chart Configuration ---- */}
            <section>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
                Chart Configuration
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Default Chart Type
                  </label>
                  <div className="flex gap-1">
                    {CHART_TYPES.map((ct) => (
                      <button
                        key={ct}
                        type="button"
                        onClick={() => updateField("chartType", ct)}
                        className={`text-[11px] font-medium px-3 py-1.5 rounded-[var(--radius-md)] border transition-colors capitalize ${
                          form.chartType === ct
                            ? "bg-[var(--brand-subtle)] text-[var(--brand)] border-[var(--brand)]"
                            : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]"
                        }`}
                      >
                        {ct}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Label Column
                  </label>
                  <select
                    value={form.labelColumn}
                    onChange={(e) => updateField("labelColumn", e.target.value)}
                    className="w-full text-[12px] border border-[var(--border)] rounded-[var(--radius-md)] px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  >
                    <option value="">-- select --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1 block">
                    Value Column(s)
                  </label>
                  {columns.length === 0 ? (
                    <div className="text-[11px] text-[var(--text-muted)]">
                      No columns available. Build a pipeline first.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {columns.map((c) => (
                        <label
                          key={c}
                          className="flex items-center gap-1.5 text-[11px] text-[var(--text-primary)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={form.valueColumns.includes(c)}
                            onChange={() => toggleValueColumn(c)}
                            className="accent-[var(--brand)]"
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ---- Filter Parameters ---- */}
            <section>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
                Filter Parameters
              </h3>

              {form.filterParams.length === 0 && (
                <div className="text-[11px] text-[var(--text-muted)] mb-2">
                  No filter parameters configured.
                </div>
              )}

              <div className="space-y-2">
                {form.filterParams.map((fp, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap">
                    <select
                      value={fp.column}
                      onChange={(e) =>
                        updateFilterParam(idx, { column: e.target.value })
                      }
                      className="text-[11px] border border-[var(--border)] rounded-[var(--radius-md)] px-2 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[120px]"
                    >
                      <option value="">Column</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={fp.binding}
                      onChange={(e) =>
                        updateFilterParam(idx, {
                          binding: e.target.value as FilterParam["binding"],
                        })
                      }
                      className="text-[11px] border border-[var(--border)] rounded-[var(--radius-md)] px-2 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[110px]"
                    >
                      {BINDING_TYPES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>

                    <select
                      value={fp.inputType}
                      onChange={(e) =>
                        updateFilterParam(idx, {
                          inputType: e.target.value as FilterParam["inputType"],
                        })
                      }
                      className="text-[11px] border border-[var(--border)] rounded-[var(--radius-md)] px-2 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[110px]"
                    >
                      {INPUT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeFilterParam(idx)}
                      className="text-[12px] text-[var(--error)] hover:opacity-70 px-1"
                      aria-label="Remove filter parameter"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFilterParam}
                className="mt-2 text-[11px] font-medium text-[var(--brand)] hover:opacity-80"
              >
                + Add Filter
              </button>
            </section>

            {/* ---- Drill-Down Targets ---- */}
            <section>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
                Drill-Down Targets
              </h3>

              {form.drillDownTargets.length === 0 && (
                <div className="text-[11px] text-[var(--text-muted)] mb-2">
                  No drill-down targets configured.
                </div>
              )}

              <div className="space-y-2">
                {form.drillDownTargets.map((dd, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap">
                    <select
                      value={dd.sourceColumn}
                      onChange={(e) =>
                        updateDrillDown(idx, {
                          sourceColumn: e.target.value,
                        })
                      }
                      className="text-[11px] border border-[var(--border)] rounded-[var(--radius-md)] px-2 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[120px]"
                    >
                      <option value="">Source Column</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={dd.targetQuery}
                      onChange={(e) =>
                        updateDrillDown(idx, {
                          targetQuery: e.target.value,
                        })
                      }
                      placeholder="Target query"
                      className="text-[11px] border border-[var(--border)] rounded-[var(--radius-md)] px-2 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-w-[120px]"
                    />

                    <input
                      type="text"
                      value={dd.targetFilter}
                      onChange={(e) =>
                        updateDrillDown(idx, {
                          targetFilter: e.target.value,
                        })
                      }
                      placeholder="Target filter key"
                      className="text-[11px] border border-[var(--border)] rounded-[var(--radius-md)] px-2 py-1.5 bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-w-[120px]"
                    />

                    <button
                      type="button"
                      onClick={() => removeDrillDown(idx)}
                      className="text-[12px] text-[var(--error)] hover:opacity-70 px-1"
                      aria-label="Remove drill-down target"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addDrillDown}
                className="mt-2 text-[11px] font-medium text-[var(--brand)] hover:opacity-80"
              >
                + Add Target
              </button>
            </section>

            {/* ---- Actions ---- */}
            <section className="flex items-center gap-2 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!selectedId || saving}
                className="text-[12px] font-medium text-white bg-[var(--brand)] rounded-[var(--radius-md)] px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? "Saving\u2026" : "Publish to Engine"}
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="text-[12px] font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-md)] px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Save as Draft
              </button>

              {selectedId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-[12px] font-medium text-[var(--error)] bg-[var(--error-subtle)] border border-transparent rounded-[var(--radius-md)] px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 ml-auto"
                >
                  Delete
                </button>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
