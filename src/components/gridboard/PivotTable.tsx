"use client";

import { useMemo } from "react";
import { pivotData, type PivotResult } from "./grid-helpers";

interface PivotTableProps {
  data: Record<string, unknown>[];
  rowField: string;
  colField: string;
  valueField: string;
  aggregation: "sum" | "avg" | "count" | "min" | "max";
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function PivotTable({
  data,
  rowField,
  colField,
  valueField,
  aggregation,
}: PivotTableProps) {
  const pivot: PivotResult = useMemo(
    () => pivotData(data, rowField, colField, valueField, aggregation),
    [data, rowField, colField, valueField, aggregation],
  );

  if (pivot.rowValues.length === 0 || pivot.colValues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No data to pivot
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[600px] border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-100 dark:bg-gray-750">
            <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-gray-100 dark:bg-gray-750 z-20">
              {rowField} \ {colField}
            </th>
            {pivot.colValues.map((cv) => (
              <th
                key={cv}
                className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
              >
                {cv}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-bold text-gray-700 dark:text-gray-300 border-b border-l border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {pivot.rowValues.map((rv) => (
            <tr
              key={rv}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50"
            >
              <td className="px-3 py-1.5 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 whitespace-nowrap">
                {rv}
              </td>
              {pivot.colValues.map((cv) => (
                <td
                  key={cv}
                  className="text-right px-3 py-1.5 text-gray-600 dark:text-gray-400 tabular-nums"
                >
                  {pivot.cells[rv]?.[cv] ? formatNum(pivot.cells[rv][cv]) : "-"}
                </td>
              ))}
              <td className="text-right px-3 py-1.5 font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 tabular-nums">
                {formatNum(pivot.rowTotals[rv] || 0)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-gray-300 dark:border-gray-600">
            <td className="px-3 py-2 font-bold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-blue-50 dark:bg-blue-900/20">
              Total
            </td>
            {pivot.colValues.map((cv) => (
              <td
                key={cv}
                className="text-right px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 tabular-nums"
              >
                {formatNum(pivot.colTotals[cv] || 0)}
              </td>
            ))}
            <td className="text-right px-3 py-2 font-bold text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700 tabular-nums">
              {formatNum(pivot.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
