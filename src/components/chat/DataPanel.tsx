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
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  if (!activeResult) {
    return (
      <PinnedDashboard
        queries={pinnedQueries}
        onQueryClick={onPinnedQueryClick}
      />
    );
  }

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="bg-[var(--bg-primary)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-start">
          <div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">
              {activeResult.title}
            </div>
            <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
              {activeResult.subtitle}
            </div>
          </div>
          <div className="flex gap-1">
            {(["table", "chart"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-[var(--radius-md)] text-[11px] font-medium capitalize transition-colors ${viewMode === mode ? "bg-[var(--brand-subtle)] text-[var(--brand)]" : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
              >
                {mode === "table" ? "Table" : "Chart"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          {viewMode === "table" && (
            <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border-subtle)]">
                    {activeResult.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeResult.data.slice(0, 50).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      {activeResult.columns.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap">
                          {String(row[col] ?? "")}
                        </td>
                      ))}
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

        <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
          <span>
            {activeResult.data.length} rows
            {activeResult.executionMs && ` · ${activeResult.executionMs}ms`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => activeResult && onPin?.(activeResult.queryName)}
              className="hover:text-[var(--text-secondary)] transition-colors"
            >
              {pinnedQueries?.some((q) => q.name === activeResult?.queryName)
                ? "Pinned ✓"
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
