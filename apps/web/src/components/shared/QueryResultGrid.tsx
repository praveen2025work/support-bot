"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  AgGrid,
  type ColDef,
  type GridApi,
  type CellClickedEvent,
  type CellClassParams,
  type RowClassParams,
} from "@/components/shared/AgGrid";
import type { DrillDownConfig } from "@/types/dashboard";

// ── Types ────────────────────────────────────────────────────────────

interface LinkedSelection {
  column: string;
  value: unknown;
}

interface DiffInfo {
  addedIndices: Set<number>;
  changedIndices: Set<number>;
  changedCells: Map<number, Map<string, unknown>>;
  removedRows: Record<string, unknown>[];
  totalChanges: number;
}

export interface QueryResultGridProps {
  data: Record<string, unknown>[];
  executionTime?: number;
  /** Card ID for context */
  cardId?: string;
  /** Linked selection from cross-filtering */
  linkedSelection?: LinkedSelection;
  /** Cell click handler for cross-filtering */
  onCellClick?: (column: string, value: unknown) => void;
  /** Drill-down config for clickable cells */
  drillDownConfig?: DrillDownConfig[];
  /** Drill-down handler */
  onDrillDown?: (
    targetQuery: string,
    targetFilter: string,
    column: string,
    value: string,
  ) => void;
  /** Enable inline editing */
  editable?: boolean;
  /** Query name for export */
  queryName?: string;
  /** Diff info from previous query run */
  diffInfo?: DiffInfo;
  /** Compact mode for dashboard cards */
  compact?: boolean;
  /** Height override — defaults to auto-height for small datasets */
  height?: string | number;
  /** Page size — defaults to 10 */
  pageSize?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function isNumericColumn(
  rows: Record<string, unknown>[],
  col: string,
): boolean {
  let numCount = 0;
  const sample = rows.slice(0, 20);
  for (const row of sample) {
    const v = row[col];
    if (v != null && v !== "" && !isNaN(Number(v))) numCount++;
  }
  return numCount > sample.length * 0.6;
}

// ── Component ────────────────────────────────────────────────────────

export function QueryResultGrid({
  data,
  executionTime,
  linkedSelection,
  onCellClick,
  drillDownConfig,
  onDrillDown,
  editable = false,
  queryName,
  diffInfo,
  compact = false,
  height,
  pageSize = 10,
}: QueryResultGridProps) {
  const gridApiRef = useRef<GridApi | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const rows = data || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Detect numeric columns
  const numericCols = useMemo(
    () => new Set(columns.filter((c) => isNumericColumn(rows, c))),
    [rows, columns],
  );

  // Drill-down map
  const drillDownMap = useMemo(() => {
    const map = new Map<string, DrillDownConfig>();
    if (drillDownConfig) {
      for (const dd of drillDownConfig) {
        map.set(dd.sourceColumn, dd);
      }
    }
    return map;
  }, [drillDownConfig]);

  // Column definitions
  const columnDefs: ColDef[] = useMemo(
    () =>
      columns.map((col) => {
        const isNumeric = numericCols.has(col);
        const hasDrillDown = drillDownMap.has(col);

        const colDef: ColDef = {
          field: col,
          headerName: col,
          sortable: true,
          filter: true,
          resizable: true,
          editable,
          type: isNumeric ? "numericColumn" : undefined,
          cellClassRules: {
            "text-red-600 font-medium": (params: CellClassParams) => {
              if (!isNumeric) return false;
              const val = Number(params.value);
              return !isNaN(val) && val < 0;
            },
            "bg-green-50": (params: CellClassParams) => {
              if (!diffInfo) return false;
              const idx = params.rowIndex;
              return diffInfo.addedIndices.has(idx);
            },
            "bg-amber-50": (params: CellClassParams) => {
              if (!diffInfo) return false;
              const idx = params.rowIndex;
              return (
                diffInfo.changedIndices.has(idx) &&
                diffInfo.changedCells.has(idx) &&
                diffInfo.changedCells.get(idx)!.has(col)
              );
            },
            "bg-blue-50": (params: CellClassParams) => {
              if (!linkedSelection) return false;
              return (
                linkedSelection.column === col &&
                params.value === linkedSelection.value
              );
            },
            "cursor-pointer underline text-blue-600": () => hasDrillDown,
          },
        };

        return colDef;
      }),
    [columns, numericCols, drillDownMap, editable, diffInfo, linkedSelection],
  );

  // Summary footer
  const pinnedBottomRowData = useMemo(() => {
    if (!showSummary || rows.length === 0) return undefined;
    const summaryRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      if (numericCols.has(col)) {
        let sum = 0;
        let count = 0;
        for (const row of rows) {
          const v = row[col];
          if (v != null && v !== "") {
            sum += Number(v);
            count++;
          }
        }
        const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
        summaryRow[col] = `Σ ${Math.round(sum).toLocaleString()} | μ ${avg}`;
      } else {
        const unique = new Set(rows.map((r) => String(r[col] ?? "")));
        summaryRow[col] = `${unique.size} distinct`;
      }
    });
    return [summaryRow];
  }, [showSummary, rows, columns, numericCols]);

  // Row class for diff highlighting
  const getRowClass = useCallback(
    (params: RowClassParams) => {
      if (!diffInfo) return undefined;
      const idx = params.rowIndex;
      if (diffInfo.addedIndices.has(idx)) return "ag-row-added";
      if (diffInfo.changedIndices.has(idx)) return "ag-row-changed";
      return undefined;
    },
    [diffInfo],
  );

  // Cell click handler
  const handleCellClicked = useCallback(
    (event: CellClickedEvent) => {
      const col = event.colDef.field;
      const value = event.value;
      if (!col) return;

      // Cross-filtering
      if (onCellClick) {
        onCellClick(col, value);
      }

      // Drill-down
      const dd = drillDownMap.get(col);
      if (dd && onDrillDown) {
        onDrillDown(dd.targetQuery, dd.targetFilter, col, String(value));
      }
    },
    [onCellClick, drillDownMap, onDrillDown],
  );

  // Determine height
  const effectiveHeight = useMemo(() => {
    if (height) return height;
    // Auto-height for small datasets, fixed for large
    const rowH = compact ? 28 : 35;
    const headerH = compact ? 32 : 38;
    const paginationH = 48;
    const summaryH = showSummary ? rowH : 0;
    const totalH =
      headerH + Math.min(rows.length, pageSize) * rowH + paginationH + summaryH;
    return Math.min(totalH, 500);
  }, [height, rows.length, pageSize, compact, showSummary]);

  if (rows.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic py-4 text-center">
        No data
      </div>
    );
  }

  return (
    <div>
      {/* Info bar */}
      <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
        <span>
          {rows.length} row{rows.length !== 1 ? "s" : ""}
        </span>
        {executionTime != null && (
          <span className="text-gray-400">in {executionTime}ms</span>
        )}
        <button
          onClick={() => setShowSummary(!showSummary)}
          className={`ml-1 px-1 rounded text-[10px] ${
            showSummary
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 text-gray-400"
          }`}
          title="Toggle summary"
        >
          Σ
        </button>
        {diffInfo && diffInfo.totalChanges > 0 && (
          <span className="text-amber-600 font-medium">
            {diffInfo.totalChanges} change
            {diffInfo.totalChanges !== 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={() => {
            if (gridApiRef.current) {
              gridApiRef.current.exportDataAsCsv({
                fileName: `${queryName || "export"}.csv`,
              });
            }
          }}
          className="ml-auto text-[10px] text-gray-400 hover:text-blue-600"
        >
          Export CSV
        </button>
      </div>

      {/* AG Grid */}
      <AgGrid
        rowData={rows}
        columnDefs={columnDefs}
        compact={compact}
        height={effectiveHeight}
        paginationPageSize={pageSize}
        paginationPageSizeSelector={[10, 25, 50, 100]}
        pinnedBottomRowData={pinnedBottomRowData}
        getRowClass={getRowClass}
        onCellClicked={handleCellClicked}
        onGridReady={(params) => {
          gridApiRef.current = params.api;
        }}
        suppressCellFocus={!editable}
        domLayout="normal"
      />
    </div>
  );
}
