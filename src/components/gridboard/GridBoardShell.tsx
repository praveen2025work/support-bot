"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
import { Table2, ChevronDown, Search, Database } from "lucide-react";
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

  // Auto-load flag set by URL-param integration
  const [pendingAutoLoad, setPendingAutoLoad] = useState(false);

  // Portal target (top-bar slot rendered by the page)
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useEffect(() => {
    const el = document.getElementById("gridboard-topbar-slot");
    setPortalTarget(el);
  }, []);

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
      .catch((err) => {
        console.error("Failed to fetch queries:", err);
        setQueries([]);
      })
      .finally(() => setLoadingQueries(false));
  }, []);

  // Fetch filter configs (shared cached utility)
  useEffect(() => {
    fetchFilterConfigs()
      .then(setFilterConfigs)
      .catch((err) => console.error("Failed to fetch filter configs:", err));
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
      setPendingAutoLoad(true);
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

  // Trigger auto-load once state has settled from URL-param integration
  useEffect(() => {
    if (!pendingAutoLoad || !selectedQuery) return;
    setPendingAutoLoad(false);
    handleLoad();
  }, [pendingAutoLoad, selectedQuery, handleLoad]);

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

  // ── Top-bar controls (portalled into ContextualTopBar slot) ──

  const topBarControls = (
    <div className="flex items-center gap-2">
      {/* Query selector dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2 text-[12px] border rounded-[var(--radius-md)] px-3 py-1.5 text-left transition-colors min-w-[180px] max-w-[280px]"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: dropdownOpen ? "var(--brand)" : "var(--border)",
            color: selectedQuery ? "var(--text-primary)" : "var(--text-muted)",
            boxShadow: dropdownOpen ? "0 0 0 2px var(--brand-subtle)" : "none",
          }}
        >
          {selectedQuery ? (
            <span className="flex items-center gap-1.5 flex-1 truncate">
              <Database
                size={12}
                style={{ color: "var(--brand)" }}
                className="shrink-0"
              />
              <span className="truncate">{selectedQuery}</span>
            </span>
          ) : (
            <span className="flex-1 truncate">
              {loadingQueries ? "Loading queries..." : "Select a query..."}
            </span>
          )}
          <ChevronDown
            size={14}
            className="shrink-0 transition-transform"
            style={{
              color: "var(--text-muted)",
              transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            className="absolute z-50 top-full right-0 mt-1 w-72 rounded-[var(--radius-md)] border shadow-[var(--shadow-lg)] overflow-hidden"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border)",
            }}
          >
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <Search size={12} style={{ color: "var(--text-muted)" }} />
              <input
                ref={searchRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search queries..."
                className="flex-1 text-[12px] bg-transparent outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>

            {/* Options */}
            <div className="max-h-64 overflow-y-auto">
              {filteredQueries.length === 0 ? (
                <div
                  className="px-3 py-4 text-[12px] text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  {searchTerm ? "No matching queries" : "No queries available"}
                </div>
              ) : (
                filteredQueries.map((q) => {
                  const isSelected = q.name === selectedQuery;
                  return (
                    <button
                      key={q.name}
                      type="button"
                      onClick={() => selectQuery(q.name)}
                      className="w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? "var(--brand-subtle)"
                          : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected)
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isSelected
                          ? "var(--brand-subtle)"
                          : "transparent";
                      }}
                    >
                      <Database
                        size={12}
                        className="shrink-0 mt-0.5"
                        style={{
                          color: isSelected
                            ? "var(--brand)"
                            : "var(--text-muted)",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-[12px] font-medium truncate"
                          style={{
                            color: isSelected
                              ? "var(--brand)"
                              : "var(--text-primary)",
                          }}
                        >
                          {q.name}
                        </div>
                        {q.description && (
                          <div
                            className="text-[11px] truncate mt-0.5"
                            style={{ color: "var(--text-muted)" }}
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

      {/* Load Data button */}
      <button
        onClick={handleLoad}
        disabled={!selectedQuery || loading}
        className="bg-[var(--brand)] text-[var(--brand-text)] rounded-[var(--radius-md)] px-3 py-1.5 text-[12px] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? "Loading..." : "Load Data"}
      </button>
    </div>
  );

  // ── Render ──

  return (
    <>
      {/* Portal top-bar controls into the ContextualTopBar slot */}
      {portalTarget && createPortal(topBarControls, portalTarget)}

      <div
        className="h-full flex flex-col"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        {/* Filters (shown below top bar when a query has filters) */}
        {queryFilterKeys.length > 0 && (
          <div
            className="border-b px-6 py-2.5"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex flex-wrap items-end gap-3">
              {queryFilterKeys.map((key) => {
                const config = getConfig(key);
                return (
                  <div key={key} className="min-w-[160px]">
                    <label
                      className="block text-[11px] font-medium mb-1"
                      style={{ color: "var(--text-muted)" }}
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
              <button
                onClick={handleLoad}
                disabled={loading}
                className="bg-[var(--brand)] text-[var(--brand-text)] rounded-[var(--radius-md)] px-4 py-2 text-[12px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Applying..." : "Apply Filters"}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-2 bg-[var(--danger-subtle)] border border-[var(--danger)] rounded-[var(--radius-md)] text-[12px] text-[var(--danger)]">
            {error}
          </div>
        )}
        {saveMessage && (
          <div className="mx-6 mt-3 px-4 py-2 bg-[var(--success-subtle)] border border-[var(--success)] rounded-[var(--radius-md)] text-[12px] text-[var(--success)]">
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
              <div className="w-16 h-16 bg-[var(--brand-subtle)] rounded-[var(--radius-lg)] flex items-center justify-center mb-4">
                <Table2 className="w-8 h-8 text-[var(--brand)]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">
                No data loaded
              </h3>
              <p className="text-[13px] text-[var(--text-muted)] max-w-md">
                Select a query from the dropdown above and click Load Data to
                start exploring your data in an interactive grid.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
