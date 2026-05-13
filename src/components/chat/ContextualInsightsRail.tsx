"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Sparkles,
  TrendingUp,
  AlertOctagon,
  Clock,
  Zap,
  EyeOff,
  Eye,
  LineChart,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Layers,
  BarChart3,
  Sigma,
} from "lucide-react";

interface ActiveResult {
  queryName: string;
  title: string;
  subtitle: string;
  data: Record<string, unknown>[];
  columns: string[];
  executionMs?: number;
}

export interface KpiStat {
  col: string;
  avg: string;
  max: string;
  min: string;
}

interface ContextualInsightsRailProps {
  activeResult: ActiveResult;
  /** Numeric column stats computed by the host (avg/max/min). Renders as
   *  "book_outstanding · 1,403,750,000 · ↑ … · ↓ …" lines inside the
   *  Active Dataset card. */
  kpiStats?: KpiStat[];
  /** Fire a follow-up chat message — used by Quick Synthesis Actions. */
  onSendChat?: (text: string) => void;
}

/**
 * Right-rail companion to an active chat result. Active Dataset card
 * (with optional KPI breakdown + hide toggle), Top Performer / Alert
 * pills derived from real columns, and Quick Synthesis Actions.
 */
export function ContextualInsightsRail({
  activeResult,
  kpiStats,
  onSendChat,
}: ContextualInsightsRailProps) {
  // Initial state matches the SSR render to avoid hydration mismatch;
  // patched from localStorage after mount.
  const [kpiHidden, setKpiHidden] = useState<boolean>(false);

  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration sync of a persisted prefs value */
  useEffect(() => {
    try {
      setKpiHidden(
        localStorage.getItem("active-dataset-kpis-hidden") === "true",
      );
    } catch {
      /* ignore */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleKpi = () => {
    setKpiHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("active-dataset-kpis-hidden", String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  // Quick capability check for synthesis actions — Forecast and
  // Anomaly detection need numeric data; Forecast specifically needs
  // a date column. Disable actions cleanly when the data won't fit.
  const capabilities = useMemo(() => {
    if (activeResult.data.length === 0) {
      return { hasNumeric: false, hasDate: false };
    }
    const isDateLike = (val: unknown): boolean => {
      if (typeof val !== "string") return false;
      // ISO yyyy-mm-dd, yyyy-mm-ddTHH:MM, slash-separated dates, etc.
      return (
        /^\d{4}-\d{2}-\d{2}/.test(val) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val)
      );
    };
    const hasNumeric = activeResult.columns.some((col) =>
      activeResult.data.some((row) => typeof row[col] === "number"),
    );
    const hasDate = activeResult.columns.some((col) =>
      activeResult.data.some((row) => isDateLike(row[col])),
    );
    return { hasNumeric, hasDate };
  }, [activeResult]);

  // Pick representative columns once — shared by Top Performer/Alert
  // calc and the capability-gated synthesis actions below.
  const { labelCol, valueCol } = useMemo(() => {
    if (activeResult.data.length === 0) {
      return {
        labelCol: null as string | null,
        valueCol: null as string | null,
      };
    }
    const numericCols = activeResult.columns.filter((col) =>
      activeResult.data.some((row) => typeof row[col] === "number"),
    );
    const categoricalCols = activeResult.columns.filter((col) =>
      activeResult.data.every(
        (row) => typeof row[col] === "string" || row[col] == null,
      ),
    );
    return {
      labelCol: categoricalCols[0] ?? null,
      valueCol: numericCols[0] ?? null,
    };
  }, [activeResult]);

  // Derive top performer + alert from numeric columns
  const { topPerformer, alert } = useMemo(() => {
    if (
      activeResult.data.length === 0 ||
      labelCol == null ||
      valueCol == null
    ) {
      return { topPerformer: null, alert: null };
    }

    let topRow = activeResult.data[0];
    let topVal = Number(topRow[valueCol] ?? 0);
    let minVal = topVal;
    let minRow = topRow;
    for (const row of activeResult.data) {
      const v = Number(row[valueCol] ?? NaN);
      if (Number.isFinite(v)) {
        if (v > topVal) {
          topVal = v;
          topRow = row;
        }
        if (v < minVal) {
          minVal = v;
          minRow = row;
        }
      }
    }

    return {
      topPerformer: {
        label: String(topRow[labelCol] ?? "—"),
        metric: valueCol,
      },
      alert:
        minVal < topVal * 0.5 && activeResult.data.length > 2
          ? { label: String(minRow[labelCol] ?? "—"), metric: valueCol }
          : null,
    };
  }, [activeResult, labelCol, valueCol]);

  // Forecast needs a date + numeric column; the engine returns a
  // helpful error otherwise, but we surface that as a disabled state
  // with a tooltip so the user understands why before clicking.
  const forecastReady = capabilities.hasNumeric && capabilities.hasDate;
  const anomalyReady = capabilities.hasNumeric;

  const rankReady = capabilities.hasNumeric && labelCol != null;
  const groupReady = labelCol != null;
  const trendReady = forecastReady;

  const synthesisActions = [
    // Row 1 — patterns over time
    {
      label: "Forecast next 3 periods",
      icon: TrendingUp,
      // "periods" is the engine's preferred word — keeps the NLP
      // lemmatiser from suggesting "month → months" disambig loops.
      action: () =>
        onSendChat?.(`forecast next 3 periods in ${activeResult.queryName}`),
      disabled: !forecastReady,
      disabledReason: !capabilities.hasDate
        ? "Needs a date column"
        : "Needs a numeric column",
    },
    {
      label: "Show trend over time",
      icon: LineChart,
      action: () => onSendChat?.(`show trend in ${activeResult.queryName}`),
      disabled: !trendReady,
      disabledReason: !capabilities.hasDate
        ? "Needs a date column"
        : "Needs a numeric column",
    },
    {
      label: "Detect anomalies",
      icon: AlertOctagon,
      action: () => onSendChat?.(`find outliers in ${activeResult.queryName}`),
      disabled: !anomalyReady,
      disabledReason: "Needs a numeric column",
    },
    // Row 2 — ranking & segmentation
    {
      label: rankReady ? `Top 5 by ${valueCol}` : "Top 5",
      icon: ArrowDownWideNarrow,
      action: () =>
        onSendChat?.(`top 5 by ${valueCol} in ${activeResult.queryName}`),
      disabled: !rankReady,
      disabledReason: labelCol
        ? "Needs a numeric column"
        : "Needs a category column",
    },
    {
      label: rankReady ? `Bottom 5 by ${valueCol}` : "Bottom 5",
      icon: ArrowUpWideNarrow,
      action: () =>
        onSendChat?.(`bottom 5 by ${valueCol} in ${activeResult.queryName}`),
      disabled: !rankReady,
      disabledReason: labelCol
        ? "Needs a numeric column"
        : "Needs a category column",
    },
    {
      label: groupReady ? `Group by ${labelCol}` : "Group by",
      icon: Layers,
      action: () =>
        onSendChat?.(`group by ${labelCol} in ${activeResult.queryName}`),
      disabled: !groupReady,
      disabledReason: "Needs a category column",
    },
    // Row 3 — stats & synthesis
    {
      label: anomalyReady ? `Distribution of ${valueCol}` : "Distribution",
      icon: BarChart3,
      action: () =>
        onSendChat?.(
          `show distribution of ${valueCol} in ${activeResult.queryName}`,
        ),
      disabled: !anomalyReady,
      disabledReason: "Needs a numeric column",
    },
    {
      label: anomalyReady ? `Average ${valueCol}` : "Average",
      icon: Sigma,
      action: () =>
        onSendChat?.(`average ${valueCol} in ${activeResult.queryName}`),
      disabled: !anomalyReady,
      disabledReason: "Needs a numeric column",
    },
    {
      label: "Generate summary",
      icon: Sparkles,
      action: () => onSendChat?.(`summarize ${activeResult.queryName}`),
      disabled: false,
      disabledReason: "",
    },
  ];

  const hasKpis = !!kpiStats && kpiStats.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Active Dataset */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <header className="px-3.5 py-2.5 border-b border-[var(--border)] flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[var(--brand)]" />
          <span className="eyebrow !text-[10px]">Active Dataset</span>
          {hasKpis && (
            <button
              onClick={toggleKpi}
              className="ml-auto p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title={kpiHidden ? "Show analysis" : "Hide analysis"}
              aria-label={kpiHidden ? "Show analysis" : "Hide analysis"}
            >
              {kpiHidden ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
            </button>
          )}
        </header>
        <div className="px-3.5 py-3">
          <div className="font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)] truncate">
            {activeResult.queryName}
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] font-mono">
            <div className="inline-flex items-center gap-1 text-[var(--text-muted)] shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {activeResult.data.length.toLocaleString()} rows
              {activeResult.executionMs != null &&
                ` · ${activeResult.executionMs}ms`}
            </div>
            {(topPerformer || alert) && (
              <div className="flex items-center gap-2 min-w-0 justify-end">
                {topPerformer && (
                  <span
                    className="inline-flex items-center gap-0.5 text-emerald-500 truncate max-w-[110px]"
                    title={`Top by ${topPerformer.metric}: ${topPerformer.label}`}
                  >
                    ↑ <span className="truncate">{topPerformer.label}</span>
                  </span>
                )}
                {alert && (
                  <span
                    className="inline-flex items-center gap-0.5 text-rose-500 truncate max-w-[110px]"
                    title={`Low by ${alert.metric}: ${alert.label}`}
                  >
                    ↓ <span className="truncate">{alert.label}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {hasKpis && !kpiHidden && (
            <ul className="mt-3 space-y-2.5 border-t border-[var(--border-subtle)] pt-3">
              {kpiStats!.map((s) => (
                <li key={s.col} className="flex flex-col gap-0.5">
                  <span className="eyebrow !text-[9px] !tracking-[0.12em] truncate">
                    {s.col}
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="numerals text-[15px] font-bold text-[var(--text-primary)] leading-none">
                      {s.avg}
                    </span>
                    <div className="flex items-center gap-2 text-[10.5px] font-mono">
                      <span className="text-emerald-500 inline-flex items-center gap-0.5">
                        ↑ <span className="numerals">{s.max}</span>
                      </span>
                      <span className="text-rose-500 inline-flex items-center gap-0.5">
                        ↓ <span className="numerals">{s.min}</span>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick Synthesis Actions */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
        <header className="px-3.5 py-2.5 border-b border-[var(--border)] flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[var(--brand)]" />
          <span className="eyebrow !text-[10px]">Quick Synthesis Actions</span>
        </header>
        <div className="grid grid-cols-3 gap-px bg-[var(--border)]">
          {synthesisActions.map((a, i) => {
            const Icon = a.icon;
            const isDisabled = !onSendChat || a.disabled;
            return (
              <button
                key={i}
                onClick={a.action}
                disabled={isDisabled}
                title={a.disabled ? a.disabledReason : a.label}
                className="flex flex-col items-center justify-center text-center gap-1.5 px-2 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--bg-elevated)]"
              >
                <Icon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand)] transition-colors shrink-0" />
                <div className="text-[11px] font-medium text-[var(--text-primary)] leading-tight line-clamp-2 break-words">
                  {a.label}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
