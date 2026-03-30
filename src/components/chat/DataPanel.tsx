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
}

export function DataPanel({
  activeResult,
  pinnedQueries,
  onPinnedQueryClick,
  onPin,
  viewMode = "table",
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
    />
  );
}

function ResultView({
  activeResult,
  pinnedQueries,
  onPin,
  viewMode,
}: {
  activeResult: ActiveResult;
  pinnedQueries?: DataPanelProps["pinnedQueries"];
  onPin?: (queryName: string) => void;
  viewMode: "table" | "chart";
}) {
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
