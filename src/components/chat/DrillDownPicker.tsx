'use client';

import { useState, useEffect, useRef } from 'react';

export interface DrillDownPickerQuery {
  name: string;
  description?: string;
  matchingFilter: string; // the filter key that matches the clicked column
}

interface DrillDownPickerProps {
  open: boolean;
  column: string;
  value: string;
  /** Queries whose filters match the clicked column */
  matchingQueries: DrillDownPickerQuery[];
  /** Position relative to viewport */
  position: { x: number; y: number };
  onSelect: (query: DrillDownPickerQuery) => void;
  onClose: () => void;
}

export function DrillDownPicker({ open, column, value, matchingQueries, position, onSelect, onClose }: DrillDownPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open || matchingQueries.length === 0) return null;

  // Clamp position to viewport
  const top = Math.min(position.y, window.innerHeight - 300);
  const left = Math.min(position.x, window.innerWidth - 280);

  return (
    <div
      ref={ref}
      className="fixed z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ top, left }}
    >
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Drill down on</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
          {column} = <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
        </p>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {matchingQueries.map((q) => (
          <button
            key={q.name}
            onClick={() => onSelect(q)}
            className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-50 dark:border-gray-750 last:border-b-0 transition-colors"
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{q.name}</p>
            {q.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{q.description}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-0.5">
              Filter: <span className="font-mono">{q.matchingFilter}</span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Given available queries and a clicked column name, find queries whose
 * filters contain a key matching or similar to the column name.
 */
export function findMatchingQueries(
  column: string,
  availableQueries: Array<{ name: string; description?: string; filters?: Array<string | { key: string; binding: string }> }>
): DrillDownPickerQuery[] {
  const colLower = column.toLowerCase().replace(/[_\s-]/g, '');
  const matches: DrillDownPickerQuery[] = [];

  for (const q of availableQueries) {
    if (!q.filters) continue;
    for (const f of q.filters) {
      const filterKey = typeof f === 'string' ? f : f.key;
      const fLower = filterKey.toLowerCase().replace(/[_\s-]/g, '');
      // Match: exact, contains, or contained-by
      if (fLower === colLower || fLower.includes(colLower) || colLower.includes(fLower)) {
        matches.push({ name: q.name, description: q.description, matchingFilter: filterKey });
        break; // one match per query
      }
    }
  }

  return matches;
}
