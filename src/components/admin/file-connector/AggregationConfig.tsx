"use client";

import type { Aggregation } from "./types";

interface AggregationConfigProps {
  groupColumns: string[];
  onGroupColumnsChange: (columns: string[]) => void;
  aggregations: Aggregation[];
  onAggregationsChange: (aggs: Aggregation[]) => void;
  availableColumns: string[];
}

const OPERATIONS: Aggregation["operation"][] = [
  "sum",
  "avg",
  "count",
  "min",
  "max",
];

export function AggregationConfig({
  groupColumns,
  onGroupColumnsChange,
  aggregations,
  onAggregationsChange,
  availableColumns,
}: AggregationConfigProps) {
  const handleAddGroupColumn = (column: string) => {
    if (column && !groupColumns.includes(column)) {
      onGroupColumnsChange([...groupColumns, column]);
    }
  };

  const handleRemoveGroupColumn = (column: string) => {
    onGroupColumnsChange(groupColumns.filter((c) => c !== column));
  };

  const handleAddAggregation = () => {
    const newAgg: Aggregation = {
      column: "*",
      operation: "count",
    };
    onAggregationsChange([...aggregations, newAgg]);
  };

  const handleRemoveAggregation = (index: number) => {
    onAggregationsChange(aggregations.filter((_, i) => i !== index));
  };

  const handleAggregationChange = (
    index: number,
    field: keyof Aggregation,
    value: string,
  ) => {
    onAggregationsChange(
      aggregations.map((agg, i) =>
        i === index ? { ...agg, [field]: value } : agg,
      ),
    );
  };

  const ungroupedColumns = availableColumns.filter(
    (col) => !groupColumns.includes(col),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* GROUP BY columns */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
          Group By Columns
        </label>

        {/* Selected group columns as pills */}
        {groupColumns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {groupColumns.map((col) => (
              <span
                key={col}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)]"
              >
                {col}
                <button
                  type="button"
                  onClick={() => handleRemoveGroupColumn(col)}
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors leading-none"
                  aria-label={`Remove ${col} from group`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add group column dropdown */}
        <select
          value=""
          onChange={(e) => handleAddGroupColumn(e.target.value)}
          className="w-full px-2 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
        >
          <option value="" disabled>
            + Add column to group...
          </option>
          {ungroupedColumns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      {/* Aggregation rows */}
      <div>
        <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
          Aggregations
        </label>

        <div className="flex flex-col gap-2">
          {aggregations.map((agg, index) => (
            <div key={index} className="flex items-center gap-2">
              {/* Operation dropdown */}
              <select
                value={agg.operation}
                onChange={(e) =>
                  handleAggregationChange(index, "operation", e.target.value)
                }
                className="px-2 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] uppercase"
              >
                {OPERATIONS.map((op) => (
                  <option key={op} value={op}>
                    {op.toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Column dropdown */}
              <select
                value={agg.column}
                onChange={(e) =>
                  handleAggregationChange(index, "column", e.target.value)
                }
                className="flex-1 px-2 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
              >
                <option value="*">* (all rows)</option>
                {availableColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveAggregation(index)}
                className="shrink-0 w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors text-[14px]"
                aria-label="Remove aggregation"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add aggregation button */}
        <button
          type="button"
          onClick={handleAddAggregation}
          className="mt-2 px-3 py-1.5 text-[12px] rounded-[var(--radius-md)] border border-[var(--brand)] text-[var(--brand)] bg-transparent hover:bg-[var(--brand)] hover:text-white transition-colors"
        >
          + Add Aggregation
        </button>
      </div>
    </div>
  );
}
