"use client";
import { lazy, Suspense, useState } from "react";
import { PinnedDashboard } from "./PinnedDashboard";

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

type ViewMode = "table" | "chart";

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
}

export function DataPanel({
  activeResult,
  pinnedQueries,
  onPinnedQueryClick,
  onPin,
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
    />
  );
}

function ResultView({
  activeResult,
  pinnedQueries,
  onPin,
}: {
  activeResult: ActiveResult;
  pinnedQueries?: DataPanelProps["pinnedQueries"];
  onPin?: (queryName: string) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const pageSize = 25;
  const sortedData = sortCol
    ? [...activeResult.data].sort((a, b) => {
        const va = a[sortCol] ?? "";
        const vb = b[sortCol] ?? "";
        if (typeof va === "number" && typeof vb === "number")
          return sortDir === "asc" ? va - vb : vb - va;
        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      })
    : activeResult.data;
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="bg-[var(--bg-primary)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex flex-col h-full">
        {/* Compact header — single line with all info */}
        <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
            {activeResult.queryName}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] shrink-0">
            {activeResult.data.length} rows
            {activeResult.executionMs != null &&
              ` \u00B7 ${activeResult.executionMs}ms`}
          </span>
          <div className="ml-auto flex gap-1 shrink-0">
            {(["table", "chart"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-0.5 rounded-[var(--radius-md)] text-[10px] font-medium capitalize transition-colors ${viewMode === mode ? "bg-[var(--brand-subtle)] text-[var(--brand)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
              >
                {mode === "table" ? "Table" : "Chart"}
              </button>
            ))}
          </div>
        </div>

        {/* Inline KPI summary — compact single row */}
        {viewMode === "table" &&
          activeResult.data.length > 0 &&
          (() => {
            const numCols = activeResult.columns.filter((col) =>
              activeResult.data.some((row) => typeof row[col] === "number"),
            );
            const stats = numCols.slice(0, 4).map((col) => {
              const values = activeResult.data
                .map((r) => Number(r[col]))
                .filter((v) => !isNaN(v));
              const sum = values.reduce((a, b) => a + b, 0);
              return { col, total: sum.toLocaleString() };
            });
            if (stats.length === 0) return null;
            return (
              <div className="px-3 py-1.5 flex gap-3 border-b border-[var(--border-subtle)] overflow-x-auto">
                {stats.map((s) => (
                  <div
                    key={s.col}
                    className="flex items-baseline gap-1 shrink-0"
                  >
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
                      {s.col}
                    </span>
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      {s.total}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

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
              <DataChart
                data={activeResult.data}
                headers={activeResult.columns}
              />
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
              className="px-1.5 py-0.5 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-secondary)]"
            >
              &laquo;
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
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
              className="px-1.5 py-0.5 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-secondary)]"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
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
