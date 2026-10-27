"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  Table2,
  ChevronDown,
  Search,
  Database,
  Sparkles,
  CircleDot,
  TriangleAlert,
  AlertOctagon,
  EyeOff,
  Eye,
} from "lucide-react";
import { Fragment } from "react";
import {
  fetchFilterConfigs,
  getFilterConfig as lookupFilterConfig,
} from "@/lib/filter-config";

// ── Types ────────────────────────────────────────────────────────────

interface QueryOption {
  name: string;
  description: string;
  filters: Array<string | { key: string; binding: string }>;
  /** Server-set when the caller has used this query recently. */
  recent?: boolean;
}

interface InsightItem {
  kind: string;
  text: string;
  severity: "info" | "warning" | "critical";
  column?: string;
}

interface QualitySnapshot {
  duplicateCount: number;
  missingPercent: number;
  anomalyCount: number;
  schemaDrift: { hasChange: boolean } | null;
}

/**
 * Compact severity-coded chip used in the quality strip above the
 * grid. Tone is the foreground color; the chip itself is tinted with
 * a matching translucent background so it reads at a glance.
 */
function QualityChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius-md)] text-[11px] font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${tone} 10%, transparent)`,
        color: tone,
      }}
    >
      <span style={{ opacity: 0.75 }}>{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

/**
 * Render a string containing **bold** markers as React nodes. The
 * insights builder emits `**X**` for emphasis; treat anything between
 * matched `**` as bold and pass the rest through verbatim. We don't
 * use a full markdown parser because nothing else is needed.
 */
function renderInsightText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong
          key={i}
          className="font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}

// ── Component ────────────────────────────────────────────────────────

export function GridBoardShell() {
  const { userInfo } = useUser();
  const userId = userInfo?.emailAddress || userInfo?.displayName || "local_dev";
  // Active group from URL (?group=finance). All write/read paths use this
  // value so a user landing on /gridboard?group=finance sees finance data,
  // not the default tenant's. Fallback "default" preserves the historical
  // behaviour for any in-product link that hasn't been updated yet.
  const searchParams = useSearchParams();
  const groupId = searchParams.get("group") || "default";

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
  const [insightsHidden, setInsightsHidden] = useState(false);

  useEffect(() => {
    try {
      setInsightsHidden(
        localStorage.getItem("insights-hidden:gridboard") === "true",
      );
    } catch {
      /* noop */
    }
  }, []);

  const toggleInsightsHidden = () => {
    setInsightsHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("insights-hidden:gridboard", String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };
  const [error, setError] = useState<string | null>(null);
  // Proactive analytics — populated alongside the row fetch + a side
  // call to /api/data/quality. Optional; absent on small datasets.
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [quality, setQuality] = useState<QualitySnapshot | null>(null);

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
  } = useGridBoardViews(userId, selectedQuery, groupId);

  // Fetch available queries — passes userName so the engine reorders
  // by per-user usage and stamps frequently-run queries with `recent`.
  // Falls back to catalog order for anonymous callers.
  useEffect(() => {
    const userParam = userInfo?.samAccountName
      ? `?userName=${encodeURIComponent(userInfo.samAccountName)}&groupId=${encodeURIComponent(groupId)}`
      : `?groupId=${encodeURIComponent(groupId)}`;
    fetch(`/api/queries${userParam}`)
      .then((res) => res.json())
      .then((json) => {
        const list: QueryOption[] = (json.queries || json || []).map(
          (q: Record<string, unknown>) => ({
            name: (q.name || q.id) as string,
            description: (q.description || "") as string,
            filters: (q.filters || []) as Array<
              string | { key: string; binding: string }
            >,
            ...(q.recent ? { recent: true } : {}),
          }),
        );
        setQueries(list);
      })
      .catch((err) => {
        console.error("Failed to fetch queries:", err);
        setQueries([]);
      })
      .finally(() => setLoadingQueries(false));
  }, [userInfo?.samAccountName, groupId]);

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

  // Load data — uses /api/data/rows so the grid doesn't pay the cost of
  // going through chat (NLP classification, anomaly detection, audit
  // logging) just to fetch raw rows for editing. The endpoint handles
  // CSV / XLSX / API / SQL sources uniformly and returns the same
  // shape: { rows, columns, totalRows }.
  const handleLoad = useCallback(async () => {
    if (!selectedQuery) return;
    setLoading(true);
    setError(null);
    setSaveMessage(null);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filterValues).filter(([, v]) => v.trim()),
      );
      const res = await fetch(
        `/api/data/rows/${encodeURIComponent(selectedQuery)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            filters: activeFilters,
            pageSize: 1000,
          }),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Load failed (${res.status})`);
      }
      const json = await res.json();
      const resultData: Record<string, unknown>[] = Array.isArray(json.rows)
        ? json.rows
        : [];
      const resultColumns: string[] =
        Array.isArray(json.columns) && json.columns.length > 0
          ? json.columns
          : resultData.length > 0
            ? Object.keys(resultData[0])
            : [];

      if (resultData.length > 0) {
        setData(resultData);
        setColumns(resultColumns);
        setDataLoaded(true);
        // Engine attaches `insights` on page 1 when there are
        // meaningful findings. Strip leading [] so callers can render
        // unconditionally.
        setInsights(Array.isArray(json.insights) ? json.insights : []);
        // Quality snapshot — single side call. Failures are silent
        // (the chip just doesn't render).
        fetch(
          `/api/data/quality/${encodeURIComponent(selectedQuery)}?groupId=${encodeURIComponent(groupId)}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((q) => setQuality(q as QualitySnapshot | null))
          .catch(() => setQuality(null));
      } else {
        setError("No data returned from query.");
        setData([]);
        setColumns([]);
        setDataLoaded(false);
        setInsights([]);
        setQuality(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setData([]);
      setColumns([]);
      setDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [selectedQuery, filterValues, groupId]);

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
            groupId,
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
            groupId,
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
    setInsights([]);
    setQuality(null);
    // Fire-and-forget interaction ping so the engine's recency
    // tracker learns what this user actually reaches for. Same file
    // chat + Data Explorer already write to.
    if (userInfo?.samAccountName) {
      fetch("/api/data/sources/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          userName: userInfo.samAccountName,
          queryName: name,
        }),
      }).catch(() => {});
    }
  };

  // ── Top-bar controls (portalled into ContextualTopBar slot) ──

  const topBarControls = (
    <div className="flex items-center gap-2">
      {/* Query selector dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="ofx-select flex items-center gap-2 text-[12.5px] font-medium border rounded-full px-3.5 py-1.5 text-left transition-all min-w-[200px] max-w-[300px]"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: dropdownOpen ? "var(--brand)" : "var(--border)",
            color: selectedQuery ? "var(--text-primary)" : "var(--text-muted)",
            boxShadow: dropdownOpen ? "0 0 0 3px var(--brand-subtle)" : "none",
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
                        <div className="flex items-center gap-1.5">
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
                          {q.recent && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0"
                              style={{
                                backgroundColor: "var(--brand-subtle)",
                                color: "var(--brand)",
                              }}
                              title="You have used this query recently"
                            >
                              Recent
                            </span>
                          )}
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
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {loading ? "Loading…" : "Load Data"}
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
        style={{ backgroundColor: "var(--bg-canvas)" }}
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

        {/* Insights expanded panel — renders the full list in one
            place when the user expands the pill in the Tools row. */}
        {dataLoaded && !insightsHidden && insights.length > 0 && (
          <div
            className="mx-6 mt-3 mb-1"
            role="status"
            aria-label="Auto-insights detail"
          >
            <ul className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 px-1 py-1">
              {insights.map((ins, i) => {
                const isWarn = ins.severity === "warning";
                const isCrit = ins.severity === "critical";
                const tone = isCrit
                  ? "var(--danger)"
                  : isWarn
                    ? "var(--warning)"
                    : "var(--brand)";
                const Icon = isCrit
                  ? AlertOctagon
                  : isWarn
                    ? TriangleAlert
                    : CircleDot;
                return (
                  <li
                    key={i}
                    className="px-3 py-1.5 text-[12px] leading-snug flex items-start gap-2 rounded hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Icon
                      size={12}
                      className="mt-0.5 shrink-0"
                      style={{ color: tone }}
                    />
                    <span
                      className="min-w-0"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {renderInsightText(ins.text)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Data grid */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {dataLoaded ? (
            <>
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                {/* Quality chips — only renders once snapshot exists */}
                {quality && (
                  <>
                    <span className="eyebrow !text-[9.5px] mr-1">
                      Data Quality
                    </span>
                    <QualityChip
                      label="Dup"
                      value={quality.duplicateCount.toLocaleString()}
                      tone={
                        quality.duplicateCount > 0
                          ? "var(--warning)"
                          : "var(--success)"
                      }
                    />
                    <QualityChip
                      label="Missing"
                      value={`${quality.missingPercent.toFixed(1)}%`}
                      tone={
                        quality.missingPercent > 20
                          ? "var(--danger)"
                          : quality.missingPercent > 5
                            ? "var(--warning)"
                            : "var(--success)"
                      }
                    />
                    <QualityChip
                      label="Drift"
                      value={quality.schemaDrift?.hasChange ? "Yes" : "No"}
                      tone={
                        quality.schemaDrift?.hasChange
                          ? "var(--warning)"
                          : "var(--success)"
                      }
                    />
                    <QualityChip
                      label="Anom"
                      value={quality.anomalyCount.toLocaleString()}
                      tone={
                        quality.anomalyCount > 3
                          ? "var(--danger)"
                          : quality.anomalyCount > 0
                            ? "var(--warning)"
                            : "var(--success)"
                      }
                    />
                  </>
                )}

                <span className="ml-auto eyebrow !text-[9.5px]">
                  {data.length.toLocaleString()} rows
                </span>

                {/* Insights summary pill — single chip in the tools
                    row. Collapsed: shows the first insight + count of
                    the rest. Expanded: shows just "Hide N insights"
                    and the full list renders in the panel below. */}
                {insights.length > 0 &&
                  (() => {
                    const firstInsight = insights[0];
                    const tone =
                      firstInsight.severity === "critical"
                        ? "var(--danger)"
                        : firstInsight.severity === "warning"
                          ? "var(--warning)"
                          : "var(--brand)";
                    return (
                      <button
                        onClick={toggleInsightsHidden}
                        className="inline-flex items-center gap-1.5 max-w-[400px] rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-[var(--bg-secondary)]"
                        style={{
                          borderColor: `color-mix(in srgb, ${tone} 30%, transparent)`,
                          backgroundColor: `color-mix(in srgb, ${tone} 6%, transparent)`,
                          color: "var(--text-primary)",
                        }}
                        title={
                          insightsHidden ? "Show all insights" : "Hide insights"
                        }
                      >
                        <Sparkles
                          className="w-3 h-3 shrink-0"
                          style={{ color: tone }}
                        />
                        {insightsHidden ? (
                          <>
                            <span className="truncate font-medium">
                              {renderInsightText(firstInsight.text)}
                            </span>
                            {insights.length > 1 && (
                              <span
                                className="shrink-0 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
                                  color: tone,
                                }}
                              >
                                +{insights.length - 1}
                              </span>
                            )}
                            <Eye
                              className="w-3 h-3 shrink-0 opacity-70"
                              style={{ color: tone }}
                            />
                          </>
                        ) : (
                          <>
                            <span className="font-medium">
                              Hide {insights.length} insight
                              {insights.length === 1 ? "" : "s"}
                            </span>
                            <EyeOff
                              className="w-3 h-3 shrink-0 opacity-70"
                              style={{ color: tone }}
                            />
                          </>
                        )}
                      </button>
                    );
                  })()}
              </div>
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="relative w-full max-w-xl rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden shadow-[var(--shadow-md)]">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-70 pointer-events-none"
                  style={{ background: "var(--hero-glow)" }}
                />
                <div className="relative px-8 py-10 flex flex-col items-center text-center">
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4 shadow-[0_8px_24px_-8px_rgba(99,102,241,0.55)]"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    <Table2 className="w-6 h-6 text-white" strokeWidth={1.6} />
                  </div>
                  <span className="eyebrow !text-[var(--brand)] mb-2">
                    Grid Board
                  </span>
                  <h3 className="font-display text-[22px] font-bold text-[var(--text-primary)] tracking-tight mb-2 leading-tight">
                    Pivot, aggregate, sculpt your data.
                  </h3>
                  <p className="text-[13.5px] text-[var(--text-secondary)] max-w-md leading-relaxed">
                    Pick a query from the selector above to hydrate the grid.
                    Group by columns, add formulas, and pivot inline — every
                    edit syncs back to a saved view.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-1.5 justify-center text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-[0.12em]">
                    <span className="chip">Group by</span>
                    <span className="chip">Aggregate</span>
                    <span className="chip">Pivot</span>
                    <span className="chip">Formula</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
