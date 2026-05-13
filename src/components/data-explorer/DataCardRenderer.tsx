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
  TrendingUp,
} from "lucide-react";
import type { DataCard, DataQueryResponse, DataQuality } from "./types";
import { ExplorerDataTable } from "./ExplorerDataTable";
import { ExplorerKpis } from "./ExplorerKpis";
// Chart + lineage components are large but the data-explorer page is
// already client-side ("use client"), so a static import is fine and
// satisfies the no-require-imports lint rule. Earlier code used
// `require()` inside render to dodge a circular import that no longer
// exists.
import { DataChart } from "@/components/chat/DataChart";
import { LineageFlowDiagram } from "@/components/dashboard/LineageFlowDiagram";

/**
 * Pick a "date-ish" column from the rows by sampling values. We don't
 * trust schema labels alone — some sources mark `string` for columns
 * that are clearly ISO dates. Order of preference:
 *   1. Columns with a name containing "date" / "month" / "week" / "day".
 *   2. Otherwise the first column whose values parse as Date.
 */
function pickDateColumn(
  rows: Record<string, string | number>[],
  headers: string[],
): string | null {
  if (rows.length === 0) return null;
  const nameRanked = headers
    .filter((h) => /date|day|week|month|year|time/i.test(h))
    .concat(headers.filter((h) => !/date|day|week|month|year|time/i.test(h)));
  for (const h of nameRanked) {
    const sample = rows.slice(0, 5).map((r) => r[h]);
    const allDates = sample.every((v) => {
      if (v === null || v === undefined || v === "") return false;
      const d = new Date(String(v));
      return !isNaN(d.getTime());
    });
    if (allDates) return h;
  }
  return null;
}

/**
 * Inline SVG sparkline — renders the forecast's historical + predicted
 * series in a single stroke. Cheap, no chart library needed. Color
 * splits visually: historical solid, predicted dashed.
 */
function Sparkline({
  historical,
  predicted,
  width = 140,
  height = 32,
}: {
  historical: Array<{ value: number }>;
  predicted: Array<{ value: number }>;
  width?: number;
  height?: number;
}) {
  const all = [...historical, ...predicted];
  if (all.length < 2) return null;
  const vals = all.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = width / (all.length - 1);
  const toY = (v: number) => height - ((v - min) / range) * height;
  const histPath = historical
    .map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${toY(p.value)}`)
    .join(" ");
  const predFirstX = (historical.length - 1) * step;
  const predFirstY = toY(historical[historical.length - 1].value);
  const predPath = predicted
    .map(
      (p, i) =>
        `${i === 0 ? `M${predFirstX},${predFirstY} L` : "L"}${(historical.length + i) * step},${toY(p.value)}`,
    )
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Forecast sparkline"
    >
      <path d={histPath} fill="none" stroke="var(--brand)" strokeWidth="1.5" />
      <path
        d={predPath}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeDasharray="3,2"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * Compute a simple trend signal for a KPI: split rows into first-half
 * / second-half by date, compare aggregated values. Returns null when
 * the dataset can't support a meaningful split (no date column, < 8
 * rows, divide-by-zero on baseline).
 */
function computeKpiTrend(
  rows: Record<string, string | number>[],
  headers: string[],
  valueColumn: string,
  operation: "avg" | "sum" | "count" | "min" | "max",
): { direction: "up" | "down" | "flat"; percentChange: number } | null {
  if (rows.length < 8) return null;
  const dateCol = pickDateColumn(rows, headers);
  if (!dateCol) return null;

  // Sort rows by date ascending; bail if too few parseable dates.
  const dated = rows
    .map((r) => {
      const d = new Date(String(r[dateCol]));
      return { r, t: d.getTime() };
    })
    .filter((x) => Number.isFinite(x.t))
    .sort((a, b) => a.t - b.t);
  if (dated.length < 8) return null;

  const mid = Math.floor(dated.length / 2);
  const aggregate = (subset: typeof dated): number => {
    const vals = subset
      .map(({ r }) => {
        const v = r[valueColumn];
        return typeof v === "number" ? v : parseFloat(String(v));
      })
      .filter((v) => Number.isFinite(v));
    if (vals.length === 0) return 0;
    switch (operation) {
      case "sum":
        return vals.reduce((a, b) => a + b, 0);
      case "avg":
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      case "min":
        return Math.min(...vals);
      case "max":
        return Math.max(...vals);
      case "count":
        return vals.length;
    }
  };
  const first = aggregate(dated.slice(0, mid));
  const second = aggregate(dated.slice(mid));
  if (Math.abs(first) < 0.0001) return null;
  const pct = ((second - first) / Math.abs(first)) * 100;
  const direction = Math.abs(pct) < 1 ? "flat" : pct > 0 ? "up" : "down";
  return { direction, percentChange: pct };
}

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
  // Quality card has its own data path — single GET, no filters applied
  // (the quality snapshot is over the full dataset, not the filtered view).
  const [quality, setQuality] = useState<DataQuality | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  // KPI forecast — opt-in per card. Stored alongside the rest of the
  // KPI state so re-renders don't reshow the loading state.
  const [forecast, setForecast] = useState<{
    historical: Array<{ date: string; value: number }>;
    predicted: Array<{ date: string; value: number }>;
  } | null>(null);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);

  const effectiveSource = card.source ?? source;

  useEffect(() => {
    if (card.type !== "quality" || !effectiveSource) return;
    let cancelled = false;
    setQualityLoading(true);
    fetch(
      `/api/data/quality/${encodeURIComponent(effectiveSource)}?groupId=${encodeURIComponent(groupId)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setQuality(d as DataQuality | null);
      })
      .catch(() => {
        if (!cancelled) setQuality(null);
      })
      .finally(() => {
        if (!cancelled) setQualityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [card.type, effectiveSource, groupId]);

  const fetchData = useCallback(async () => {
    if (!effectiveSource) return;
    // Quality card has its own data path; the generic query fetch
    // would just return rows that this card doesn't render.
    if (card.type === "quality") return;

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

      // Trend badge — first-half vs second-half %-change. Only renders
      // when the dataset has a date column AND at least 8 rows. "Flat"
      // (< 1% change) is treated as no signal worth showing.
      const trend = computeKpiTrend(
        allRows,
        data?.headers ?? [],
        kpi.column,
        kpi.operation,
      );

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
          {trend && trend.direction !== "flat" && (
            <div
              className="text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded"
              style={{
                color:
                  trend.direction === "up" ? "var(--success)" : "var(--danger)",
                backgroundColor:
                  trend.direction === "up"
                    ? "color-mix(in srgb, var(--success) 12%, transparent)"
                    : "color-mix(in srgb, var(--danger) 12%, transparent)",
              }}
              title={`${trend.direction === "up" ? "Up" : "Down"} ${Math.abs(
                trend.percentChange,
              ).toFixed(1)}% comparing first vs second half of the dataset`}
            >
              {trend.direction === "up" ? "↑" : "↓"}{" "}
              {Math.abs(trend.percentChange).toFixed(1)}%
            </div>
          )}
          {/* Forecast toggle — fetched lazily so cards no one clicks
              never hit the engine. Re-clicking just hides the sparkline. */}
          <button
            type="button"
            onClick={async () => {
              if (forecastOpen) {
                setForecastOpen(false);
                return;
              }
              if (forecast) {
                setForecastOpen(true);
                return;
              }
              setForecastLoading(true);
              try {
                const url = `/api/data/forecast/${encodeURIComponent(
                  effectiveSource,
                )}?valueColumn=${encodeURIComponent(
                  kpi.column,
                )}&groupId=${encodeURIComponent(groupId)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("fetch failed");
                const d = await res.json();
                if (d?.forecastable) {
                  setForecast({
                    historical: d.historical,
                    predicted: d.predicted,
                  });
                  setForecastOpen(true);
                }
              } catch {
                /* silent — UI just doesn't expand */
              } finally {
                setForecastLoading(false);
              }
            }}
            className="text-[10px] flex items-center gap-1 mt-1.5 text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
            title="Toggle forecast sparkline"
          >
            <TrendingUp size={11} />
            {forecastLoading
              ? "loading…"
              : forecastOpen
                ? "hide forecast"
                : "show forecast"}
          </button>
          {forecastOpen && forecast && (
            <div className="mt-1 flex flex-col items-center">
              <Sparkline
                historical={forecast.historical}
                predicted={forecast.predicted}
              />
              <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                {forecast.historical.length}h · {forecast.predicted.length}p
                (dashed)
              </div>
            </div>
          )}
        </div>
      );
      break;
    }

    case "quality": {
      if (!quality && !qualityLoading) {
        body = (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs">
            No quality data
          </div>
        );
        break;
      }
      if (qualityLoading) {
        body = (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs animate-pulse">
            Checking…
          </div>
        );
        break;
      }
      if (!quality) {
        body = null;
        break;
      }

      // Severity rules: nulls > 5% or anomalies > 0 or drift flagged
      // → warning. > 20% nulls or > 3 anomalies → danger.
      const tileColor = (
        kind: "duplicates" | "missing" | "drift" | "anomalies",
      ): string => {
        switch (kind) {
          case "duplicates":
            return quality.duplicateCount > 0
              ? "var(--warning)"
              : "var(--success)";
          case "missing":
            return quality.missingPercent > 20
              ? "var(--danger)"
              : quality.missingPercent > 5
                ? "var(--warning)"
                : "var(--success)";
          case "drift":
            return quality.schemaDrift?.hasChange
              ? "var(--warning)"
              : "var(--success)";
          case "anomalies":
            return quality.anomalyCount > 3
              ? "var(--danger)"
              : quality.anomalyCount > 0
                ? "var(--warning)"
                : "var(--success)";
        }
      };

      const tile = (
        label: string,
        value: string,
        sub: string,
        color: string,
      ) => (
        <div
          className="flex-1 min-w-0 px-2.5 py-2 rounded-lg border"
          style={{
            borderColor: "var(--border)",
            borderLeftWidth: "3px",
            borderLeftColor: color,
          }}
        >
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {label}
          </div>
          <div className="text-lg font-extrabold font-mono" style={{ color }}>
            {value}
          </div>
          {sub && (
            <div className="text-[9px] text-[var(--text-muted)] truncate">
              {sub}
            </div>
          )}
        </div>
      );

      const topMissing = quality.topMissingColumns[0];
      body = (
        <div className="flex-1 flex flex-col p-2 gap-2 overflow-auto">
          <div className="flex flex-wrap gap-2">
            {tile(
              "Duplicates",
              quality.duplicateCount.toLocaleString(),
              `of ${quality.rowCount.toLocaleString()} rows`,
              tileColor("duplicates"),
            )}
            {tile(
              "Missing",
              `${quality.missingPercent.toFixed(1)}%`,
              topMissing
                ? `worst: ${topMissing.column} (${topMissing.nullPercent.toFixed(0)}%)`
                : "no nulls",
              tileColor("missing"),
            )}
            {tile(
              "Schema drift",
              quality.schemaDrift?.hasChange ? "Yes" : "No",
              quality.schemaDrift?.hasChange
                ? `+${quality.schemaDrift.added.length} / -${quality.schemaDrift.removed.length}`
                : "stable",
              tileColor("drift"),
            )}
            {tile(
              "Anomalies",
              quality.anomalyCount.toLocaleString(),
              quality.anomalyCount === 1 ? "alert" : "alerts",
              tileColor("anomalies"),
            )}
          </div>
          {quality.topMissingColumns.length > 0 && (
            <div className="text-[10px] text-[var(--text-muted)] px-1">
              Top missing columns:{" "}
              {quality.topMissingColumns
                .slice(0, 3)
                .map((c) => `${c.column} ${c.nullPercent.toFixed(0)}%`)
                .join(" · ")}
            </div>
          )}
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
        // LineageRow has typed fields plus [key: string]: unknown; the
        // generic explorer row is Record<string, string | number>. Both
        // satisfy the runtime shape; cast through unknown to make TS
        // accept the wider type.
        data={
          rows as unknown as React.ComponentProps<
            typeof LineageFlowDiagram
          >["data"]
        }
        selectedPnl={selectedPnl}
        compact={compactProp}
      />
    </div>
  );
}
