"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FilterInput,
  type FilterInputConfig,
} from "@/components/shared/FilterInput";
import {
  AgEditableDataGrid as EditableDataGrid,
  type RowChanges,
} from "./AgEditableDataGrid";
import { useGridBoardViews } from "@/hooks/useGridBoardViews";
import { useUser } from "@/contexts/UserContext";
import type { GridBoardView } from "@/types/dashboard";
import { LayoutGrid, ChevronDown, Search, Database } from "lucide-react";
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

  // ── Read URL params (Dashboard → GridBoard integration) ──
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  useEffect(() => {
    if (urlParamsProcessed || queries.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get("query");
    if (queryParam && queries.some((q) => q.name === queryParam)) {
      setSelectedQuery(queryParam);
      // Extract any filter params
      const filters: Record<string, string> = {};
      params.forEach((value, key) => {
        if (key !== "query") filters[key] = value;
      });
      if (Object.keys(filters).length > 0) {
        setFilterValues(filters);
      }
      setUrlParamsProcessed(true);
      // Auto-load after a tick so state settles
      setTimeout(() => {
        const loadBtn = document.querySelector<HTMLButtonElement>(
          "button[class*='bg-blue-600']",
        );
        loadBtn?.click();
      }, 100);
    }
  }, [queries, urlParamsProcessed]);

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
      // eslint-disable-next-line no-console -- Debug logging for grid data fetch
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
    (name: string, visibility: "private" | "public" = "private") => {
      saveViewAs(name, {}, visibility);
    },
    [saveViewAs],
  );

  // Save current active view
  const handleSaveView = useCallback(() => {
    saveView({});
  }, [saveView]);

  // ── Query dropdown state ──
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) searchRef.current?.focus();
  }, [dropdownOpen]);

  const filteredQueries = queries.filter(
    (q) =>
      q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectQuery = (name: string) => {
    setSelectedQuery(name);
    setFilterValues({});
    setDataLoaded(false);
    setData([]);
    setColumns([]);
    setError(null);
    setSaveMessage(null);
    setDropdownOpen(false);
    setSearchTerm("");
  };

  // ── Render ──

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      {/* Controls */}
      <div
        className="border-b px-6 py-3 space-y-3"
        style={{
          backgroundColor: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}
      >
        {/* Query selector */}
        <div className="flex items-center gap-3">
          <label
            className="text-sm font-medium whitespace-nowrap"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Query:
          </label>

          {/* Custom dropdown */}
          <div ref={dropdownRef} className="relative flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center gap-2 text-sm border rounded-lg px-3 py-2 text-left transition-colors"
              style={{
                backgroundColor: "hsl(var(--background))",
                borderColor: dropdownOpen
                  ? "hsl(var(--primary))"
                  : "hsl(var(--border))",
                color: selectedQuery
                  ? "hsl(var(--foreground))"
                  : "hsl(var(--muted-foreground))",
                boxShadow: dropdownOpen
                  ? "0 0 0 2px hsl(var(--primary) / 0.2)"
                  : "none",
              }}
            >
              {selectedQuery ? (
                <span className="flex items-center gap-2 flex-1 truncate">
                  <Database
                    size={14}
                    style={{ color: "hsl(var(--primary))" }}
                    className="shrink-0"
                  />
                  <span className="truncate">{selectedQuery}</span>
                  {activeQuery?.description && (
                    <span
                      className="text-xs truncate"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      — {activeQuery.description}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex-1">
                  {loadingQueries ? "Loading queries..." : "Select a query..."}
                </span>
              )}
              <ChevronDown
                size={16}
                className="shrink-0 transition-transform"
                style={{
                  color: "hsl(var(--muted-foreground))",
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border shadow-xl overflow-hidden"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
              >
                {/* Search */}
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <Search
                    size={14}
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search queries..."
                    className="flex-1 text-sm bg-transparent outline-none"
                    style={{ color: "hsl(var(--foreground))" }}
                  />
                </div>

                {/* Options */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredQueries.length === 0 ? (
                    <div
                      className="px-3 py-4 text-sm text-center"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      {searchTerm
                        ? "No matching queries"
                        : "No queries available"}
                    </div>
                  ) : (
                    filteredQueries.map((q) => {
                      const isSelected = q.name === selectedQuery;
                      return (
                        <button
                          key={q.name}
                          type="button"
                          onClick={() => selectQuery(q.name)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? "hsl(var(--primary) / 0.1)"
                              : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected)
                              e.currentTarget.style.backgroundColor =
                                "hsl(var(--muted))";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isSelected
                              ? "hsl(var(--primary) / 0.1)"
                              : "transparent";
                          }}
                        >
                          <Database
                            size={14}
                            className="shrink-0 mt-0.5"
                            style={{
                              color: isSelected
                                ? "hsl(var(--primary))"
                                : "hsl(var(--muted-foreground))",
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-sm font-medium truncate"
                              style={{
                                color: isSelected
                                  ? "hsl(var(--primary))"
                                  : "hsl(var(--foreground))",
                              }}
                            >
                              {q.name}
                            </div>
                            {q.description && (
                              <div
                                className="text-xs truncate mt-0.5"
                                style={{
                                  color: "hsl(var(--muted-foreground))",
                                }}
                              >
                                {q.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLoad}
            disabled={!selectedQuery || loading}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
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
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LayoutGrid
                size={64}
                className="mx-auto mb-3"
                strokeWidth={1}
                style={{ color: "hsl(var(--muted-foreground) / 0.4)" }}
              />
              <p
                className="text-sm"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Select a query and click &quot;Load Data&quot; to begin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
