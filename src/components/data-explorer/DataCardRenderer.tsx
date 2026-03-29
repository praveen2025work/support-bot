"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  X,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { DataCard, DataQueryResponse } from "./types";
import { ExplorerDataTable } from "./ExplorerDataTable";
import { ExplorerKpis } from "./ExplorerKpis";

const SMALL_DATASET_THRESHOLD = 1000;

/** Client-side filter: matches rows against key/value filters (case-insensitive) */
function filterRowsLocally(
  rows: Record<string, string | number>[],
  filters: Record<string, string>,
): Record<string, string | number>[] {
  const active = Object.entries(filters).filter(([, v]) => v);
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every(
      ([key, val]) =>
        String(row[key] ?? "").toLowerCase() === val.toLowerCase(),
    ),
  );
}

interface DataCardRendererProps {
  card: DataCard;
  source: string;
  groupId: string;
  globalFilters: Record<string, string>;
  readOnly?: boolean;
  onOpenSettings?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onGrow?: () => void;
  onShrink?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  /** Pre-fetched rows from the parent (useDataExplorer.allRows) */
  cachedAllRows?: Record<string, string | number>[];
  /** Total dataset row count — used to decide local vs backend filtering */
  totalDatasetRows?: number;
  /** Global group-by column from the filter panel */
  globalGroupBy?: string | null;
}

export function DataCardRenderer({
  card,
  source,
  groupId,
  globalFilters,
  readOnly = false,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  onGrow,
  onShrink,
  isFirst: _isFirst = false,
  isLast: _isLast = false,
  onOpenSettings,
  onRemove,
  cachedAllRows,
  totalDatasetRows,
  globalGroupBy,
}: DataCardRendererProps) {
  const [data, setData] = useState<DataQueryResponse | null>(null);
  const [allRows, setAllRows] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableSortCol, setTableSortCol] = useState<string | null>(
    card.tableConfig?.defaultSort?.column ?? null,
  );
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">(
    card.tableConfig?.defaultSort?.direction ?? "desc",
  );

  const effectiveSource = card.source ?? source;

  const fetchData = useCallback(async () => {
    if (!effectiveSource) return;

    const mergedFilters = { ...globalFilters, ...(card.filters ?? {}) };
    const activeFilters = Object.fromEntries(
      Object.entries(mergedFilters).filter(([, v]) => v),
    );
    // Resolve group-by: card-level overrides global.
    // KPI and summary cards skip global group-by (they show single aggregate values).
    const cardGroupBy = card.groupBy || card.chartConfig?.groupBy || null;
    const skipGlobalGroupBy = card.type === "kpi" || card.type === "summary";
    const effectiveGroupBy =
      cardGroupBy || (skipGlobalGroupBy ? null : globalGroupBy) || null;
    const hasGroupBy = !!effectiveGroupBy;

    // ── Local path: filter client-side for small datasets (non-table, no groupBy) ──
    const canFilterLocally =
      cachedAllRows &&
      cachedAllRows.length > 0 &&
      totalDatasetRows !== undefined &&
      totalDatasetRows <= SMALL_DATASET_THRESHOLD &&
      card.type !== "table" &&
      !hasGroupBy;

    if (canFilterLocally) {
      const filtered = filterRowsLocally(cachedAllRows, activeFilters);
      const headers =
        cachedAllRows.length > 0 ? Object.keys(cachedAllRows[0]) : [];
      setData({
        headers,
        rows: filtered,
        totalRows: filtered.length,
        page: 1,
        pageSize: filtered.length,
        totalPages: 1,
        schema: [],
        durationMs: 0,
      });
      setAllRows(filtered);
      setLoading(false);
      return;
    }

    // ── Backend path ──
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        queryName: effectiveSource,
        groupId,
        pageSize:
          card.type === "table" ? (card.tableConfig?.pageSize ?? 25) : 10000,
        page: card.type === "table" ? tablePage : 1,
      };

      if (Object.keys(activeFilters).length > 0) body.filters = activeFilters;
      if (effectiveGroupBy) body.groupBy = effectiveGroupBy;
      if (card.type === "table" && tableSortCol) {
        body.sort = { column: tableSortCol, direction: tableSortDir };
      }
      if (card.tableConfig?.columns?.length) {
        body.columns = card.tableConfig.columns;
      }

      const res = await fetch("/api/data/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: DataQueryResponse = await res.json();

      // If groupByResult is present, transform it into flat rows for charts/KPIs/tables
      const gbr = result.groupByResult as
        | {
            groupColumn?: string;
            groups?: Array<{
              groupValue: string | number;
              count: number;
              aggregations: Record<string, number>;
            }>;
          }
        | undefined;

      if (gbr?.groups?.length) {
        const groupCol = gbr.groupColumn ?? effectiveGroupBy ?? "group";
        const groupedRows = gbr.groups.map((g) => ({
          [groupCol]: g.groupValue,
          count: g.count,
          ...g.aggregations,
        }));
        const groupedHeaders = [
          groupCol,
          "count",
          ...Object.keys(gbr.groups[0].aggregations ?? {}),
        ];

        const groupedResult: DataQueryResponse = {
          ...result,
          headers: groupedHeaders,
          rows: groupedRows,
          totalRows: groupedRows.length,
          totalPages: 1,
        };
        setData(groupedResult);
        setAllRows(groupedRows);
      } else {
        setData(result);
        if (card.type !== "table") {
          setAllRows(result.rows);
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [
    effectiveSource,
    groupId,
    globalFilters,
    card,
    tablePage,
    tableSortCol,
    tableSortDir,
    cachedAllRows,
    totalDatasetRows,
    globalGroupBy,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Card header ─────────────────────────────────────────────
  const header = readOnly ? (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] shrink-0">
      <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
        {card.label}
      </span>
      {loading && (
        <RefreshCw
          size={11}
          className="text-[var(--brand)] animate-spin shrink-0"
        />
      )}
    </div>
  ) : (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] shrink-0 bg-[var(--bg-secondary)]/50">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
          {card.label}
        </span>
        <span className="text-[9px] text-[var(--text-muted)] uppercase">
          {card.type}
        </span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {loading && (
          <RefreshCw
            size={12}
            className="text-[var(--brand)] animate-spin mr-1"
          />
        )}
        {/* Position controls — directional + resize */}
        {(onMoveUp || onMoveDown || onMoveLeft || onMoveRight) && (
          <>
            <button
              onClick={onMoveLeft}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--brand)] disabled:opacity-20 transition-colors"
              title="Move left"
              disabled={!onMoveLeft}
            >
              <ChevronLeft size={13} />
            </button>
            <div className="flex flex-col -my-0.5">
              <button
                onClick={onMoveUp}
                className="p-0 text-[var(--text-muted)] hover:text-[var(--brand)] disabled:opacity-20 transition-colors leading-none"
                title="Move up"
                disabled={!onMoveUp}
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={onMoveDown}
                className="p-0 text-[var(--text-muted)] hover:text-[var(--brand)] disabled:opacity-20 transition-colors leading-none"
                title="Move down"
                disabled={!onMoveDown}
              >
                <ChevronDown size={13} />
              </button>
            </div>
            <button
              onClick={onMoveRight}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--brand)] disabled:opacity-20 transition-colors"
              title="Move right"
              disabled={!onMoveRight}
            >
              <ChevronRight size={13} />
            </button>
            <span className="mx-1 w-px h-4 bg-[var(--border)]" />
            {onShrink && (
              <button
                onClick={onShrink}
                className="px-1 py-0.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--brand)] rounded transition-colors"
                title="Shrink width"
              >
                −
              </button>
            )}
            {onGrow && (
              <button
                onClick={onGrow}
                className="px-1 py-0.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--brand)] rounded transition-colors"
                title="Grow width"
              >
                +
              </button>
            )}
            <span className="mx-1 w-px h-4 bg-[var(--border)]" />
          </>
        )}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded"
            title="Card settings"
          >
            <Settings size={13} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            title="Remove card"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );

  // ── Error state ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] overflow-hidden">
        {header}
        <div className="flex-1 flex items-center justify-center p-4 text-xs text-[var(--danger)]">
          {error}
        </div>
      </div>
    );
  }

  // ── Card body by type ───────────────────────────────────────
  let body: React.ReactNode = null;

  switch (card.type) {
    case "kpi": {
      const kpi = card.kpiConfig;
      if (!kpi || !allRows.length) {
        body = loading ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs animate-pulse">
            Loading…
          </div>
        ) : null;
        break;
      }
      const vals = allRows
        .map((r) => {
          const v = r[kpi.column];
          return typeof v === "number" ? v : parseFloat(String(v));
        })
        .filter((v) => !isNaN(v));

      let result = 0;
      switch (kpi.operation) {
        case "sum":
          result = vals.reduce((a, b) => a + b, 0);
          break;
        case "avg":
          result = vals.length
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : 0;
          break;
        case "min":
          result = vals.length ? Math.min(...vals) : 0;
          break;
        case "max":
          result = vals.length ? Math.max(...vals) : 0;
          break;
        case "count":
          result = allRows.length;
          break;
      }

      const thresholdColor = kpi.thresholds
        ? result >= kpi.thresholds.danger
          ? "text-red-500"
          : result >= kpi.thresholds.warning
            ? "text-amber-500"
            : "text-emerald-500"
        : "";

      body = (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div
            className={`text-3xl font-extrabold font-mono ${thresholdColor}`}
            style={
              !thresholdColor && kpi.color ? { color: kpi.color } : undefined
            }
          >
            {kpi.operation === "count"
              ? result.toLocaleString()
              : result < 100
                ? result.toFixed(2)
                : result.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">
            {kpi.operation} of {kpi.column}
          </div>
        </div>
      );
      break;
    }

    case "chart": {
      if (!data?.rows.length) {
        body = loading ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs animate-pulse">
            Loading…
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
            No data
          </div>
        );
        break;
      }
      // Synchronous require for render-time lazy load (dynamic import() is async)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DataChart } = require("@/components/chat/DataChart");
      body = (
        <div className="flex-1 overflow-auto p-2">
          <DataChart
            data={allRows.length > 0 ? allRows : data.rows}
            headers={data.headers}
            savedChartType={card.chartConfig?.chartType}
            columnConfig={
              card.chartConfig?.valueColumns?.length
                ? {
                    valueColumns: card.chartConfig.valueColumns,
                    labelColumns: card.chartConfig?.labelColumn
                      ? [card.chartConfig.labelColumn]
                      : undefined,
                  }
                : undefined
            }
          />
        </div>
      );
      break;
    }

    case "table": {
      if (!data) {
        body = loading ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs animate-pulse">
            Loading…
          </div>
        ) : null;
        break;
      }
      body = (
        <div className="flex-1 overflow-auto">
          <ExplorerDataTable
            headers={data.headers}
            rows={data.rows}
            schema={data.schema}
            totalRows={data.totalRows}
            page={tablePage}
            pageSize={card.tableConfig?.pageSize ?? 25}
            totalPages={data.totalPages}
            sortCol={tableSortCol}
            sortDir={tableSortDir}
            onSort={(col) => {
              if (tableSortCol === col) {
                setTableSortDir((d) => (d === "asc" ? "desc" : "asc"));
              } else {
                setTableSortCol(col);
                setTableSortDir("desc");
              }
              setTablePage(1);
            }}
            onPageChange={setTablePage}
            loading={loading}
            durationMs={data.durationMs}
          />
        </div>
      );
      break;
    }

    case "lineage": {
      if (!allRows.length) {
        body = loading ? (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs animate-pulse">
            Loading…
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
            No data
          </div>
        );
        break;
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const {
        LineageFlowDiagram: _LineageFlowDiagram,
      } = require("@/components/dashboard/LineageFlowDiagram");
      const pnlNames = Array.from(
        new Set(allRows.map((r) => String(r.NamedPnlName ?? ""))),
      )
        .filter(Boolean)
        .sort();
      body = (
        <LineageCardBody
          rows={allRows}
          pnlNames={pnlNames}
          initialPnl={card.lineageConfig?.selectedPnl}
          compact={card.lineageConfig?.compact ?? true}
        />
      );
      break;
    }

    case "summary": {
      if (!allRows.length && !loading) {
        body = (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
            No data
          </div>
        );
        break;
      }
      body = (
        <div className="flex-1 overflow-auto p-3">
          <ExplorerKpis
            rows={allRows}
            schema={data?.schema ?? []}
            summaryConfig={card.summaryConfig}
          />
        </div>
      );
      break;
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
      {header}
      {body}
    </div>
  );
}

/* ── Lineage card body (stateful P&L selector) ────────────────── */
function LineageCardBody({
  rows,
  pnlNames,
  initialPnl,
  compact: compactProp = true,
}: {
  rows: Record<string, string | number>[];
  pnlNames: string[];
  initialPnl?: string;
  compact?: boolean;
}) {
  const [selectedPnl, setSelectedPnl] = useState<string | null>(
    initialPnl ?? pnlNames[0] ?? null,
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    LineageFlowDiagram,
  } = require("@/components/dashboard/LineageFlowDiagram");

  return (
    <div className="flex-1 overflow-auto p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)] font-semibold">
          Named P&L:
        </span>
        <select
          value={selectedPnl ?? ""}
          onChange={(e) => setSelectedPnl(e.target.value || null)}
          className="px-2 py-1 text-xs border border-[var(--border)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] min-w-[180px]"
        >
          <option value="">— Select —</option>
          {pnlNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <LineageFlowDiagram
        data={rows}
        selectedPnl={selectedPnl}
        compact={compactProp}
      />
    </div>
  );
}
