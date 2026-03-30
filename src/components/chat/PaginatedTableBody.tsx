"use client";

import { useState } from "react";
import { TablePagination, exportToCsv } from "./TablePagination";

/** Paginated wrapper for inline tables (csv_table, csv_aggregation, csv_group_by) */
export function PaginatedTableBody<T>({
  rows,
  headers,
  renderRow,
  tableClassName,
  headerClassName,
  renderHeader,
  footer,
  defaultPageSize = 10,
}: {
  rows: T[];
  headers: string[];
  renderRow: (row: T, index: number) => React.ReactNode;
  tableClassName?: string;
  headerClassName?: string;
  renderHeader?: (h: string) => React.ReactNode;
  footer?: React.ReactNode;
  defaultPageSize?: number;
}) {
  const [pageRange, setPageRange] = useState({
    start: 0,
    end: defaultPageSize,
  });
  const pagedRows = rows.slice(pageRange.start, pageRange.end);
  const showPagination = rows.length > defaultPageSize;

  return (
    <>
      <div className="overflow-x-auto">
        <table
          className={
            tableClassName ||
            "min-w-full text-xs border border-[var(--border)] rounded"
          }
        >
          <thead>
            <tr className={headerClassName || "bg-[var(--bg-secondary)]"}>
              {renderHeader
                ? headers.map((h) => renderHeader(h))
                : headers.map((h) => (
                    <th
                      key={h}
                      className="px-2 py-1 text-left font-medium text-[var(--text-secondary)] border-b"
                    >
                      {h}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, i) => renderRow(row, pageRange.start + i))}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <TablePagination
          totalRows={rows.length}
          pageSize={defaultPageSize}
          onPageChange={(start, end) => setPageRange({ start, end })}
          onExport={() => exportToCsv(rows as Record<string, unknown>[])}
        />
      )}
      {footer}
    </>
  );
}
