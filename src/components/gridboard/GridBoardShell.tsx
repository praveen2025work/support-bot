"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FilterInput,
  type FilterInputConfig,
} from "@/components/shared/FilterInput";
import { EditableDataGrid, type RowChanges } from "./EditableDataGrid";
import { useGridBoardViews } from "@/hooks/useGridBoardViews";
import { useUser } from "@/contexts/UserContext";
import type { GridBoardView } from "@/types/dashboard";
import { LayoutGrid } from "lucide-react";
import {
  fetchFilterConfigs,
  getFilterConfig as lookupFilterConfig,
} from "@/lib/filter-config";

// ── Types ────────────────────────────────────────────────────────────

interface QueryOption {
  name: string;
  description: string;
  filters: Array<string | { key: string; binding: string }>;
}

// ── Component ────────────────────────────────────────────────────────

export function GridBoardShell() {
  const { userInfo } = useUser();
  const userId = userInfo?.emailAddress || userInfo?.displayName || "local_dev";

  // Query list
  const [queries, setQueries] = useState<QueryOption[]>([]);
  const [selectedQuery, setSelectedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingQueries, setLoadingQueries] = useState(true);

  // Filter state
  const [filterConfigs, setFilterConfigs] = useState<
    Record<string, FilterInputConfig>
  >({});
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Data state
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saving
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // View management
  const {
    views,
    activeView,
    loadView,
    saveView,
    saveViewAs,
    deleteView,
    clearActiveView,
    autoSave,
  } = useGridBoardViews(userId, selectedQuery);

  // Fetch available queries
  useEffect(() => {
    fetch("/api/queries")
      .then((res) => res.json())
      .then((json) => {
        const list: QueryOption[] = (json.queries || json || []).map(
          (q: Record<string, unknown>) => ({
            name: q.name || q.id,
            description: q.description || "",
            filters: (q.filters || []) as Array<
              string | { key: string; binding: string }
            >,
          }),
        );
        setQueries(list);
      })
      .catch(() => setQueries([]))
      .finally(() => setLoadingQueries(false));
  }, []);

  // Fetch filter configs (shared cached utility)
  useEffect(() => {
    fetchFilterConfigs().then(setFilterConfigs);
  }, []);

  // Active query details
  const activeQuery = queries.find((q) => q.name === selectedQuery);
  const queryFilterKeys = (activeQuery?.filters || []).map((f) =>
    typeof f === "string" ? f : f.key,
  );

  const getConfig = (key: string): FilterInputConfig =>
    lookupFilterConfig(filterConfigs, key);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Load data
  const handleLoad = useCallback(async () => {
    if (!selectedQuery) return;
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filterValues).filter(([, v]) => v.trim()),
      );
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `run ${selectedQuery}`,
          sessionId: `gridboard-${Date.now()}`,
          groupId: "default",
          explicitFilters: activeFilters,
        }),
      });
      const json = await res.json();
      console.log(
        "[GridBoard] chat response:",
        JSON.stringify(json).slice(0, 500),
      );

      // Extract data — chat API returns { richContent: { type, data }, ... }
      let resultData: Record<string, unknown>[] = [];
      const rc = json.richContent;
      if (rc) {
        if (rc.type === "query_result" || rc.type === "csv_table") {
          const rd = rc.data;
          if (Array.isArray(rd?.data)) {
            resultData = rd.data;
          } else if (Array.isArray(rd?.rows)) {
            resultData = rd.rows;
          } else if (Array.isArray(rd)) {
            resultData = rd;
          }
        }
      }
      // Fallback: check top-level data array
      if (resultData.length === 0 && Array.isArray(json.data)) {
        resultData = json.data;
      }

      if (resultData.length > 0) {
        setData(resultData);
        setColumns(Object.keys(resultData[0]));
        setDataLoaded(true);
      } else {
        setError("No data returned from query.");
        setData([]);
        setColumns([]);
        setDataLoaded(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setData([]);
      setColumns([]);
      setDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [selectedQuery, filterValues]);

  // Save changes (write-back)
  const handleSave = useCallback(
    async (changes: RowChanges[]) => {
      setSaveMessage(null);
      try {
        const res = await fetch("/api/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queryName: selectedQuery,
            groupId: "default",
            changes: changes.map((c) => ({
              primaryKey: c.originalRow,
              updates: Object.fromEntries(
                Object.entries(c.changes).map(([col, change]) => [
                  col,
                  change.newValue,
                ]),
              ),
            })),
          }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error || `Save failed (${res.status})`);
        }
        setSaveMessage(`Successfully saved ${changes.length} row(s).`);
      } catch (err) {
        throw err;
      }
    },
    [selectedQuery],
  );

  // Delete rows (write-back with delete action)
  const handleDelete = useCallback(
    async (rowIndices: number[], rows: Record<string, unknown>[]) => {
      setSaveMessage(null);
      try {
        const res = await fetch("/api/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queryName: selectedQuery,
            groupId: "default",
            action: "delete",
            changes: rows.map((row) => ({
              primaryKey: row,
              updates: {},
            })),
          }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error || `Delete failed (${res.status})`);
        }
        setSaveMessage(`Successfully deleted ${rowIndices.length} row(s).`);
      } catch (err) {
        throw err;
      }
    },
    [selectedQuery],
  );

  // View config change handler (debounced auto-save)
  const handleViewConfigChange = useCallback(
    (partial: Partial<GridBoardView>) => {
      if (activeView) {
        autoSave(partial);
      }
    },
    [activeView, autoSave],
  );

  // Save current grid state as a new view
  const handleSaveViewAs = useCallback(
    (name: string) => {
      saveViewAs(name, {});
    },
    [saveViewAs],
  );

  // Save current active view
  const handleSaveView = useCallback(() => {
    saveView({});
  }, [saveView]);

  // ── Render ──

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 space-y-3">
        {/* Query selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            Query:
          </label>
          <select
            value={selectedQuery}
            onChange={(e) => {
              setSelectedQuery(e.target.value);
              setFilterValues({});
              setDataLoaded(false);
              setData([]);
              setColumns([]);
              setError(null);
              setSaveMessage(null);
            }}
            className="flex-1 max-w-md text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {loadingQueries ? "Loading queries..." : "-- Select a query --"}
            </option>
            {queries.map((q) => (
              <option key={q.name} value={q.name}>
                {q.name} — {q.description}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoad}
            disabled={!selectedQuery || loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Load Data"}
          </button>
        </div>

        {/* Filters */}
        {queryFilterKeys.length > 0 && (
          <div className="flex flex-wrap items-end gap-3">
            {queryFilterKeys.map((key) => {
              const config = getConfig(key);
              return (
                <div key={key} className="min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {config.label}
                  </label>
                  <FilterInput
                    filterKey={key}
                    config={config}
                    value={filterValues[key] || ""}
                    allValues={filterValues}
                    onChange={handleFilterChange}
                    compact
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {saveMessage && (
        <div className="mx-6 mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {saveMessage}
        </div>
      )}

      {/* Data grid */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {dataLoaded ? (
          <EditableDataGrid
            data={data}
            columns={columns}
            queryName={selectedQuery}
            onSave={handleSave}
            onDelete={handleDelete}
            viewConfig={activeView || undefined}
            onViewConfigChange={handleViewConfigChange}
            views={views}
            activeView={activeView}
            onLoadView={loadView}
            onSaveView={handleSaveView}
            onSaveViewAs={handleSaveViewAs}
            onDeleteView={deleteView}
            onClearView={clearActiveView}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <LayoutGrid
                size={64}
                className="mx-auto mb-3 text-gray-300"
                strokeWidth={1}
              />
              <p className="text-sm">
                Select a query and click &quot;Load Data&quot; to begin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
