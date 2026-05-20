"use client";

import { useEffect, useMemo, useState } from "react";
import { Aggregate } from "@mescius/wijmo";
import { PivotEngine, PivotField, ShowTotals } from "@mescius/wijmo.olap";
import { PivotGrid, PivotPanel } from "@mescius/wijmo.react.olap";
import { BarChart3, SlidersHorizontal } from "lucide-react";
import { MultiSelectDropdown } from "./MultiSelectDropdown";

type PivotAggregation = "sum" | "avg" | "count" | "min" | "max";

interface PivotConfig {
  rowFields: string[];
  colFields: string[];
  valueFields: string[];
  aggregation: PivotAggregation;
}

interface WijmoPivotBoardProps {
  rows: Record<string, unknown>[];
  columns: string[];
  numericCols: Set<string>;
  config: PivotConfig;
  onConfigChange: (config: PivotConfig) => void;
}

const aggregateMap: Record<PivotAggregation, Aggregate> = {
  sum: Aggregate.Sum,
  avg: Aggregate.Avg,
  count: Aggregate.Cnt,
  min: Aggregate.Min,
  max: Aggregate.Max,
};

function normalizeRows(rows: Record<string, unknown>[], columns: string[]) {
  return rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const column of columns) {
      normalized[column] = row[column];
    }
    return normalized;
  });
}

function findPivotField(
  engine: PivotEngine,
  fieldName: string,
): PivotField | null {
  const direct = engine.fields.getField(fieldName);
  if (direct) return direct;

  const target = fieldName.toLowerCase();
  for (let index = 0; index < engine.fields.length; index += 1) {
    const field = engine.fields[index];
    if (
      field.binding === fieldName ||
      field.header === fieldName ||
      field.binding.toLowerCase() === target ||
      field.header.toLowerCase() === target
    ) {
      return field;
    }
  }

  return null;
}

export function WijmoPivotBoard({
  rows,
  columns,
  numericCols,
  config,
  onConfigChange,
}: WijmoPivotBoardProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [showZeros, setShowZeros] = useState(false);
  const [outlineMode, setOutlineMode] = useState(true);

  const sourceRows = useMemo(
    () => normalizeRows(rows, columns),
    [rows, columns],
  );

  const engine = useMemo(() => {
    const pivotEngine = new PivotEngine({
      itemsSource: sourceRows,
      autoGenerateFields: true,
      showColumnTotals: showSubtotals
        ? ShowTotals.Subtotals
        : ShowTotals.GrandTotals,
      showRowTotals: showSubtotals
        ? ShowTotals.Subtotals
        : ShowTotals.GrandTotals,
      showZeros,
      totalsBeforeData: false,
    });

    pivotEngine.deferUpdate(() => {
      for (const field of config.rowFields.filter(Boolean)) {
        const pivotField = findPivotField(pivotEngine, field);
        if (pivotField) {
          pivotEngine.rowFields.push(pivotField);
        }
      }
      for (const field of config.colFields.filter(Boolean)) {
        const pivotField = findPivotField(pivotEngine, field);
        if (pivotField) {
          pivotEngine.columnFields.push(pivotField);
        }
      }
      for (const field of config.valueFields.filter(Boolean)) {
        const valueField = findPivotField(pivotEngine, field);
        if (valueField) {
          valueField.aggregate = aggregateMap[config.aggregation];
          valueField.format =
            config.aggregation === "count"
              ? "n0"
              : numericCols.has(field)
                ? "n2"
                : "n0";
          pivotEngine.valueFields.push(valueField);
        }
      }
    });

    return pivotEngine;
  }, [config, numericCols, showSubtotals, showZeros, sourceRows]);

  useEffect(() => {
    return () => {
      engine.cancelPendingUpdates();
    };
  }, [engine]);

  return (
    <div className="mitr-wijmo-pivot flex flex-1 min-h-0 flex-col">
      <div className="mitr-wijmo-pivot-toolbar">
        <div className="mitr-wijmo-pivot-fields">
          <MultiSelectDropdown
            label="Rows"
            options={columns}
            selected={config.rowFields}
            onChange={(rowFields) => onConfigChange({ ...config, rowFields })}
            numericCols={numericCols}
          />
          <MultiSelectDropdown
            label="Columns"
            options={columns}
            selected={config.colFields}
            onChange={(colFields) => onConfigChange({ ...config, colFields })}
            numericCols={numericCols}
          />
          <MultiSelectDropdown
            label="Values"
            options={columns.filter((column) => numericCols.has(column))}
            selected={config.valueFields}
            onChange={(valueFields) =>
              onConfigChange({ ...config, valueFields })
            }
            numericCols={numericCols}
          />
          <MultiSelectDropdown
            label="Aggregate"
            options={["sum", "avg", "count", "min", "max"]}
            selected={[config.aggregation]}
            onChange={(aggregation) =>
              onConfigChange({
                ...config,
                aggregation: (aggregation[0] || "sum") as PivotAggregation,
              })
            }
            single
          />
        </div>

        <div className="mitr-wijmo-pivot-actions">
          <span className="mitr-wijmo-pivot-records">
            <BarChart3 size={14} />
            {rows.length.toLocaleString()} records
          </span>
          <button
            type="button"
            className={showPanel ? "is-active" : ""}
            onClick={() => setShowPanel((value) => !value)}
          >
            <SlidersHorizontal size={14} />
            Fields
          </button>
          <label>
            <input
              type="checkbox"
              checked={showSubtotals}
              onChange={(event) => setShowSubtotals(event.target.checked)}
            />
            Subtotals
          </label>
          <label>
            <input
              type="checkbox"
              checked={outlineMode}
              onChange={(event) => setOutlineMode(event.target.checked)}
            />
            Outline
          </label>
          <label>
            <input
              type="checkbox"
              checked={showZeros}
              onChange={(event) => setShowZeros(event.target.checked)}
            />
            Zeros
          </label>
        </div>
      </div>

      <div
        className={`mitr-wijmo-pivot-workspace ${
          showPanel ? "" : "is-grid-only"
        }`.trim()}
      >
        {showPanel && (
          <aside className="mitr-wijmo-pivot-panel" aria-label="Pivot fields">
            <PivotPanel
              engine={engine}
              deferredUpdate
              showFieldIcons
              restrictDragging={false}
            />
          </aside>
        )}

        <section className="mitr-wijmo-pivot-grid" aria-label="Pivot grid">
          <PivotGrid
            itemsSource={engine}
            outlineMode={outlineMode}
            collapsibleSubtotals
            showRowFieldHeaders
            showColumnFieldHeaders
            showValueFieldHeaders
            showRowFieldSort
            showDetailOnDoubleClick
            customContextMenu
            allowSorting="MultiColumn"
            allowDragging="Columns"
            allowResizing="Both"
          />
        </section>
      </div>
    </div>
  );
}
