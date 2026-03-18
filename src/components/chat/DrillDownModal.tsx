'use client';

import { useState, useEffect, useCallback } from 'react';

interface DrillDownModalProps {
  open: boolean;
  sourceColumn: string;
  sourceValue: string;
  targetQuery: string;
  targetFilter: string;
  groupId: string;
  label?: string;
  onClose: () => void;
  onOpenInChat?: (query: string, filters: Record<string, string>) => void;
}

interface DrillDownResult {
  text: string;
  richContent?: unknown;
  executionMs?: number;
}

export function DrillDownModal({
  open,
  sourceColumn,
  sourceValue,
  targetQuery,
  targetFilter,
  groupId,
  label,
  onClose,
  onOpenInChat,
}: DrillDownModalProps) {
  const [result, setResult] = useState<DrillDownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeDrillDown = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `run ${targetQuery}`,
          sessionId: `drilldown-${Date.now()}`,
          platform: 'web',
          groupId,
          explicitFilters: { [targetFilter]: sourceValue },
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult({
        text: data.text || '',
        richContent: data.richContent,
        executionMs: data.executionMs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute drill-down query');
    } finally {
      setLoading(false);
    }
  }, [targetQuery, targetFilter, sourceValue, groupId]);

  useEffect(() => {
    if (open) executeDrillDown();
  }, [open, executeDrillDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {label || targetQuery}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="font-medium">{sourceColumn}</span> = <span className="text-blue-600 dark:text-blue-400">{sourceValue}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenInChat && (
              <button
                onClick={() => {
                  onOpenInChat(targetQuery, { [targetFilter]: sourceValue });
                  onClose();
                }}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Open in Chat
              </button>
            )}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Running {targetQuery}...
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-400">
              {error}
              <button onClick={executeDrillDown} className="ml-2 underline">Retry</button>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              {result.executionMs != null && (
                <p className="text-xs text-gray-400">Completed in {result.executionMs}ms</p>
              )}
              {result.richContent ? (
                <DrillDownResultRenderer richContent={result.richContent} />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{result.text}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lightweight renderer for drill-down results — renders tables inline */
function DrillDownResultRenderer({ richContent }: { richContent: unknown }) {
  const rc = richContent as Record<string, unknown>;
  if (!rc || typeof rc !== 'object') return null;

  const type = rc.type as string;

  // Handle query_result type
  if (type === 'query_result' || type === 'csv_table') {
    const data = (rc.data as Record<string, unknown>[]) || [];
    const headers = (rc.headers as string[]) || (data.length > 0 ? Object.keys(data[0]) : []);
    const rows = type === 'csv_table'
      ? (rc.rows as Record<string, string | number>[]) || []
      : data;

    if (rows.length === 0) return <p className="text-sm text-gray-500">No results</p>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border border-gray-200 dark:border-gray-700 rounded">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              {(headers.length > 0 ? headers : Object.keys(rows[0])).map((h) => (
                <th key={String(h)} className="px-2 py-1.5 text-left font-medium text-gray-600 dark:text-gray-400 border-b">
                  {String(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                {Object.values(row).map((val, j) => (
                  <td key={j} className="px-2 py-1">{String(val)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 100 && (
          <p className="text-xs text-gray-400 mt-1">Showing 100 of {rows.length} rows</p>
        )}
      </div>
    );
  }

  // Fallback: show text
  return <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{JSON.stringify(rc, null, 2)}</p>;
}
