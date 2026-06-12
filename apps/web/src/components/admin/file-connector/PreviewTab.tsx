"use client";

import type { QueryPipeline } from "./types";

interface PreviewTabProps {
  data: {
    headers: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    totalSourceRows: number;
    durationMs: number;
  } | null;
  pipeline: QueryPipeline;
}

export function PreviewTab({ data, pipeline }: PreviewTabProps) {
  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
          No preview yet
        </div>
        <div className="text-[12px] text-[var(--text-muted)]">
          Go to the Query Builder tab and click &ldquo;Run Preview&rdquo; to see
          results here.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Execution info */}
      <div className="flex items-center gap-3 mb-4 text-[12px]">
        <span className="bg-[var(--success-subtle)] text-[var(--success)] px-2 py-0.5 rounded-[var(--radius-md)]">
          Completed in {data.durationMs}ms
        </span>
        <span className="text-[var(--text-muted)]">
          {data.rowCount} rows from {data.totalSourceRows} source rows
        </span>
        {pipeline.select.length > 0 && (
          <span className="text-[var(--text-muted)]">
            {pipeline.select.length} columns selected
          </span>
        )}
      </div>

      {/* Data table */}
      <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
              {data.headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 100).map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                {data.headers.map((h) => (
                  <td
                    key={h}
                    className="px-3 py-2 text-[var(--text-secondary)] whitespace-nowrap"
                  >
                    {String(row[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
