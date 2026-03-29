"use client";

import { useState, useMemo, useCallback } from "react";
import { PipelineStepBar, type PipelineStep } from "./PipelineStepBar";
import { ColumnPicker } from "./ColumnPicker";
import { ConditionBuilder } from "./ConditionBuilder";
import { AggregationConfig } from "./AggregationConfig";
import { OrderByLimitConfig } from "./OrderByLimitConfig";
import type { SchemaColumn, QueryPipeline } from "./types";

interface QueryBuilderTabProps {
  schema: SchemaColumn[];
  pipeline: QueryPipeline;
  onPipelineChange: (pipeline: QueryPipeline) => void;
  onRunPreview: () => void;
}

const EMPTY_PIPELINE: QueryPipeline = { select: [] };

export function QueryBuilderTab({
  schema,
  pipeline,
  onPipelineChange,
  onRunPreview,
}: QueryBuilderTabProps) {
  const [activeStep, setActiveStep] = useState<PipelineStep>("select");

  const configuredSteps = useMemo(() => {
    const steps = new Set<PipelineStep>();

    if (pipeline.select.length > 0) {
      steps.add("select");
    }
    if ((pipeline.where?.length ?? 0) > 0) {
      steps.add("where");
    }
    if ((pipeline.groupBy?.columns?.length ?? 0) > 0) {
      steps.add("groupBy");
    }
    if ((pipeline.having?.length ?? 0) > 0) {
      steps.add("having");
    }
    if ((pipeline.orderBy?.length ?? 0) > 0) {
      steps.add("orderBy");
    }
    if (pipeline.limit != null && pipeline.limit > 0) {
      steps.add("limit");
    }

    return steps;
  }, [pipeline]);

  const columnNames = useMemo(() => schema.map((col) => col.name), [schema]);

  const columnsForPicker = useMemo(
    () => schema.map((col) => ({ name: col.name, type: col.type })),
    [schema],
  );

  // Compute aggregated column names for HAVING dropdown
  const havingColumns = useMemo(() => {
    const cols: string[] = [];
    const groupCols = pipeline.groupBy?.columns ?? [];
    const aggs = pipeline.groupBy?.aggregations ?? [];

    // Include group-by columns
    cols.push(...groupCols);

    // Include aggregated expressions like "SUM(amount)"
    for (const agg of aggs) {
      const label =
        agg.column === "*"
          ? `${agg.operation.toUpperCase()}(*)`
          : `${agg.operation.toUpperCase()}(${agg.column})`;
      cols.push(label);
    }

    // If no GROUP BY configured, fall back to all columns
    return cols.length > 0 ? cols : columnNames;
  }, [pipeline.groupBy, columnNames]);

  const handleColumnToggle = useCallback(
    (columnName: string) => {
      const selected = pipeline.select.includes(columnName);
      const nextSelect = selected
        ? pipeline.select.filter((c) => c !== columnName)
        : [...pipeline.select, columnName];
      onPipelineChange({ ...pipeline, select: nextSelect });
    },
    [pipeline, onPipelineChange],
  );

  const handleSelectAll = useCallback(() => {
    onPipelineChange({ ...pipeline, select: columnNames });
  }, [pipeline, onPipelineChange, columnNames]);

  const handleClearAll = useCallback(() => {
    onPipelineChange({ ...pipeline, select: [] });
  }, [pipeline, onPipelineChange]);

  const handleRemoveSelectedColumn = useCallback(
    (columnName: string) => {
      onPipelineChange({
        ...pipeline,
        select: pipeline.select.filter((c) => c !== columnName),
      });
    },
    [pipeline, onPipelineChange],
  );

  const handleResetPipeline = useCallback(() => {
    onPipelineChange(EMPTY_PIPELINE);
  }, [onPipelineChange]);

  const renderStepCard = () => {
    switch (activeStep) {
      case "select":
        return (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              SELECT Columns
            </div>
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--brand)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-[11px] font-medium rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pipeline.select.length === 0 && (
                <div className="text-[12px] text-[var(--text-muted)] italic">
                  No columns selected. Use the column picker on the left or
                  click &quot;Select All&quot;.
                </div>
              )}
              {pipeline.select.map((col) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] border border-[var(--brand)]"
                >
                  {col}
                  <button
                    type="button"
                    onClick={() => handleRemoveSelectedColumn(col)}
                    className="ml-0.5 hover:text-[var(--danger)] transition-colors leading-none"
                    aria-label={`Remove ${col}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        );

      case "where":
        return (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              WHERE Conditions
            </div>
            <ConditionBuilder
              conditions={pipeline.where ?? []}
              onChange={(conditions) =>
                onPipelineChange({ ...pipeline, where: conditions })
              }
              columns={columnNames}
            />
          </div>
        );

      case "groupBy":
        return (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              GROUP BY
            </div>
            <AggregationConfig
              groupColumns={pipeline.groupBy?.columns ?? []}
              onGroupColumnsChange={(columns) =>
                onPipelineChange({
                  ...pipeline,
                  groupBy: {
                    columns,
                    aggregations: pipeline.groupBy?.aggregations ?? [],
                  },
                })
              }
              aggregations={pipeline.groupBy?.aggregations ?? []}
              onAggregationsChange={(aggregations) =>
                onPipelineChange({
                  ...pipeline,
                  groupBy: {
                    columns: pipeline.groupBy?.columns ?? [],
                    aggregations,
                  },
                })
              }
              availableColumns={columnNames}
            />
          </div>
        );

      case "having":
        return (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              HAVING Conditions
            </div>
            <ConditionBuilder
              conditions={pipeline.having ?? []}
              onChange={(conditions) =>
                onPipelineChange({ ...pipeline, having: conditions })
              }
              columns={havingColumns}
            />
          </div>
        );

      case "orderBy":
      case "limit":
        return (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">
              ORDER BY & LIMIT
            </div>
            <OrderByLimitConfig
              orderBy={pipeline.orderBy ?? []}
              onOrderByChange={(orderBy) =>
                onPipelineChange({ ...pipeline, orderBy })
              }
              limit={pipeline.limit}
              onLimitChange={(limit) =>
                onPipelineChange({ ...pipeline, limit })
              }
              availableColumns={columnNames}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step bar */}
      <div className="p-4 pb-0">
        <PipelineStepBar
          activeStep={activeStep}
          onStepChange={setActiveStep}
          configuredSteps={configuredSteps}
        />
      </div>

      {/* Main area: ColumnPicker + step card */}
      <div className="flex flex-1 overflow-hidden">
        <ColumnPicker
          columns={columnsForPicker}
          selected={pipeline.select}
          onToggle={handleColumnToggle}
        />

        <div className="flex-1 overflow-auto p-4">{renderStepCard()}</div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onRunPreview}
          className="bg-[var(--brand)] text-[var(--brand-text)] px-5 py-2 rounded-[var(--radius-md)] text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          Run Preview
        </button>
        <button
          type="button"
          onClick={handleResetPipeline}
          className="px-5 py-2 rounded-[var(--radius-md)] text-[13px] font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          Reset Pipeline
        </button>
      </div>
    </div>
  );
}
