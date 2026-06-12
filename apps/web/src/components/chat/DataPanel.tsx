"use client";
import { lazy, Suspense, useMemo, useState } from "react";
import { PinnedDashboard } from "./PinnedDashboard";
import { ContextualInsightsRail, type KpiStat } from "./ContextualInsightsRail";
import { CHART_MAX_ROWS } from "./chartConstants";

const DataChart = lazy(() =>
  import("./DataChart").then((m) => ({ default: m.DataChart })),
);

interface ActiveResult {
  queryName: string;
  title: string;
  subtitle: string;
  data: Record<string, unknown>[];
  columns: string[];
  executionMs?: number;
}

interface DataPanelProps {
  activeResult: ActiveResult | null;
  pinnedQueries?: Array<{
    name: string;
    label: string;
    value?: string;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
  }>;
  onPinnedQueryClick?: (name: string) => void;
  onPin?: (queryName: string) => void;
  viewMode?: "table" | "chart";
  /** Numeric KPI stats for the active result (avg/max/min per column). */
  kpiStats?: KpiStat[];
  /** Fire a follow-up chat message (used by Quick Synthesis Actions). */
  onSendChat?: (text: string) => void;
}

export function DataPanel({
  activeResult,
  pinnedQueries,
  onPinnedQueryClick,
  onPin,
  viewMode = "table",
  kpiStats,
  onSendChat,
}: DataPanelProps) {
  if (!activeResult) {
    return (
      <PinnedDashboard
        queries={pinnedQueries}
        onQueryClick={onPinnedQueryClick}
      />
    );
  }

  // Key resets internal state (page, sort) when result changes
  const resultKey = `${activeResult.queryName}-${activeResult.data.length}`;
  return (
    <ResultView
      key={resultKey}
      activeResult={activeResult}
      pinnedQueries={pinnedQueries}
      onPin={onPin}
      viewMode={viewMode}
      kpiStats={kpiStats}
      onSendChat={onSendChat}
    />
  );
}

function ResultView({
  activeResult,
  pinnedQueries,
  onPin,
  viewMode,
  kpiStats,
  onSendChat,
}: {
  activeResult: ActiveResult;
  pinnedQueries?: DataPanelProps["pinnedQueries"];
  onPin?: (queryName: string) => void;
  viewMode: "table" | "chart";
  kpiStats?: KpiStat[];
  onSendChat?: (text: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const pageSize = 25;
  const { data } = activeResult;
  // Memoize the full-array sort so header clicks / parent re-renders that
  // don't change (data, sortCol, sortDir) skip re-sorting.
  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const va = a[sortCol] ?? "";
      const vb = b[sortCol] ?? "";
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [data, sortCol, sortDir]);
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = useMemo(
    () => sortedData.slice(page * pageSize, (page + 1) * pageSize),
    [sortedData, page],
  );
  // The chart only ever plots the first CHART_MAX_ROWS — hand it a trimmed,
  // memoized slice so the full result set isn't passed down or re-referenced
  // in DataChart's detection deps.
  const chartData = useMemo(() => data.slice(0, CHART_MAX_ROWS), [data]);

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="mb-3">
        <ContextualInsightsRail
          activeResult={activeResult}
          kpiStats={kpiStats}
          onSendChat={onSendChat}
        />
      </div>
      <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex flex-col">
        <div className="flex-1 overflow-auto px-3 py-2">
          {viewMode === "table" && (
            <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]">
                    {activeResult.columns.map((col) => (
                      <th
                        key={col}
                        onClick={() => {
                          if (sortCol === col) {
                            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          } else {
                            setSortCol(col);
                            setSortDir("asc");
                          }
                        }}
                        className="px-2 py-1.5 text-left font-semibold text-[var(--text-muted)] border-b border-[var(--border-subtle)] cursor-pointer whitespace-nowrap hover:text-[var(--brand)] select-none"
                      >
                        {col}
                        {sortCol === col && (
                          <span className="ml-1 text-[var(--brand)]">
                            {sortDir === "asc" ? "\u2191" : "\u2193"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      {activeResult.columns.map((col) => {
                        const val = row[col];
                        const formatted =
                          typeof val === "string" &&
                          /^\d{4}-\d{2}-\d{2}T/.test(val)
                            ? new Date(val).toLocaleString()
                            : val;
                        return (
                          <td
                            key={col}
                            className="px-2 py-1.5 text-[var(--text-secondary)] whitespace-nowrap"
                          >
                            {String(formatted ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {viewMode === "chart" && activeResult.data.length > 0 && (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-[13px]">
                  Loading chart...
                </div>
              }
            >
              <DataChart data={chartData} headers={activeResult.columns} />
            </Suspense>
          )}
        </div>

        {/* Footer — pagination + actions */}
        <div className="px-3 py-1.5 border-t border-[var(--border-subtle)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
          <span>
            {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, activeResult.data.length)} of{" "}
            {activeResult.data.length} rows
            {activeResult.executionMs != null &&
              ` \u00B7 ${activeResult.executionMs}ms`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              aria-label="First page"
              className="px-1.5 py-0.5 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-secondary)]"
            >
              &laquo;
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="px-1.5 py-0.5 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-secondary)]"
            >
              &lsaquo;
            </button>
            <span className="px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
              className="px-1.5 py-0.5 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-secondary)]"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              aria-label="Last page"
              className="px-1.5 py-0.5 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-secondary)]"
            >
              &raquo;
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => activeResult && onPin?.(activeResult.queryName)}
              className="hover:text-[var(--text-secondary)] transition-colors"
            >
              {pinnedQueries?.some((q) => q.name === activeResult?.queryName)
                ? "Pinned"
                : "Pin"}
            </button>
            <button className="hover:text-[var(--text-secondary)] transition-colors">
              Open in Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
