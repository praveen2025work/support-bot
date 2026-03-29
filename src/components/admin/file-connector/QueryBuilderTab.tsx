"use client";

import type { SchemaColumn, QueryPipeline } from "./types";

interface QueryBuilderTabProps {
  schema: SchemaColumn[];
  pipeline: QueryPipeline;
  onPipelineChange: (pipeline: QueryPipeline) => void;
  onRunPreview: () => void;
}

export function QueryBuilderTab({
  schema,
  pipeline,
  onPipelineChange,
  onRunPreview,
}: QueryBuilderTabProps) {
  return (
    <div className="p-5">
      <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
        Query Builder
      </div>
      <div className="text-[12px] text-[var(--text-muted)] mb-4">
        Build a query pipeline: SELECT → WHERE → GROUP BY → HAVING → ORDER BY →
        LIMIT
      </div>

      {/* SELECT: column checkboxes */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 mb-4">
        <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">
          SELECT Columns
        </div>
        <div className="flex flex-wrap gap-2">
          {schema.map((col) => {
            const selected = pipeline.select.includes(col.name);
            return (
              <button
                key={col.name}
                onClick={() => {
                  const next = selected
                    ? pipeline.select.filter((c) => c !== col.name)
                    : [...pipeline.select, col.name];
                  onPipelineChange({ ...pipeline, select: next });
                }}
                className={`px-2.5 py-1 rounded-[var(--radius-md)] text-[11px] font-medium transition-colors ${
                  selected
                    ? "bg-[var(--brand-subtle)] text-[var(--brand)] border border-[var(--brand)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]"
                }`}
              >
                {selected ? "\u2713 " : ""}
                {col.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Placeholder for remaining steps */}
      <div className="text-[12px] text-[var(--text-muted)] italic mb-4">
        WHERE, GROUP BY, HAVING, ORDER BY, LIMIT steps coming in Phase 3.
      </div>

      <button
        onClick={onRunPreview}
        className="bg-[var(--brand)] text-[var(--brand-text)] px-5 py-2 rounded-[var(--radius-md)] text-[13px] font-medium hover:opacity-90"
      >
        Run Preview →
      </button>
    </div>
  );
}
