"use client";

import type { ColumnSchema } from "./types";

interface ExplorerDataTableProps {
  headers: string[];
  rows: Record<string, string | number>[];
  schema: ColumnSchema[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortCol: string | null;
  sortDir: "asc" | "desc";
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  loading?: boolean;
  durationMs?: number;
}

export function ExplorerDataTable({
  headers,
  rows,
  totalRows,
  page,
  totalPages,
  sortCol,
  sortDir,
  onSort,
  onPageChange,
  loading,
  durationMs,
}: ExplorerDataTableProps) {
  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <div className="text-[13px] font-bold text-[var(--text-primary)]">
          {totalRows.toLocaleString()} records
          {durationMs != null && (
            <span className="text-[10px] text-[var(--text-muted)] font-medium ml-2">
              {durationMs}ms
            </span>
          )}
          {loading && (
            <span className="text-[10px] text-[var(--brand)] font-medium ml-2 animate-pulse">
              Loading…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          Page {page}/{totalPages || 1}
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] text-xs disabled:opacity-40"
          >
            ‹
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] text-xs disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  onClick={() => onSort(h)}
                  className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-wide text-[var(--text-secondary)] border-b-2 border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0 cursor-pointer select-none whitespace-nowrap z-[1] hover:text-[var(--text-primary)]"
                >
                  {h} {sortCol === h ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="hover:bg-[var(--bg-secondary)] transition-colors"
              >
                {headers.map((h) => (
                  <td
                    key={h}
                    className="px-3 py-2 border-b border-[var(--border)] text-[var(--text-primary)] whitespace-nowrap"
                  >
                    {String(row[h] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-3 py-8 text-center text-[var(--text-muted)]"
                >
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
