'use client';

import { useState } from 'react';

export function TablePagination({
  totalRows,
  pageSize: initialPageSize,
  onPageChange,
  onExport,
}: {
  totalRows: number;
  pageSize?: number;
  onPageChange: (start: number, end: number) => void;
  onExport?: () => void;
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize || 10);
  const totalPages = Math.ceil(totalRows / pageSize);

  const changePage = (newPage: number) => {
    setPage(newPage);
    onPageChange(newPage * pageSize, (newPage + 1) * pageSize);
  };

  const changePageSize = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
    onPageChange(0, newSize);
  };

  return (
    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
      <div className="flex items-center gap-2">
        <span>
          {Math.min(page * pageSize + 1, totalRows)}–{Math.min((page + 1) * pageSize, totalRows)} of {totalRows}
        </span>
        <select
          value={pageSize}
          onChange={(e) => changePageSize(Number(e.target.value))}
          className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>per page</span>
      </div>
      <div className="flex items-center gap-1">
        {onExport && (
          <button
            onClick={onExport}
            className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors mr-2"
          >
            Export CSV
          </button>
        )}
        <button
          onClick={() => changePage(0)}
          disabled={page === 0}
          className="px-1.5 py-0.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100"
        >
          &laquo;
        </button>
        <button
          onClick={() => changePage(page - 1)}
          disabled={page === 0}
          className="px-1.5 py-0.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100"
        >
          &lsaquo;
        </button>
        <span className="px-2">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => changePage(page + 1)}
          disabled={page >= totalPages - 1}
          className="px-1.5 py-0.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100"
        >
          &rsaquo;
        </button>
        <button
          onClick={() => changePage(totalPages - 1)}
          disabled={page >= totalPages - 1}
          className="px-1.5 py-0.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}

export function exportToCsv(data: Record<string, unknown>[], filename = 'export.csv') {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
