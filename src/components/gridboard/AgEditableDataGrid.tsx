"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  AgGrid,
  type ColDef,
  type GridApi,
  type CellValueChangedEvent,
  type CellClassParams,
} from "@/components/shared/AgGrid";
import type {
  GridBoardView,
  ConditionalFormatRule,
  FormulaColumn,
  ValidationRule,
  ChangeEntry,
} from "@/types/dashboard";
import {
  isNumericColumn,
  groupRows,
  computeGroupSummary,
  applyConditionalFormat,
  evaluateFormula,
  computeColumnAggregation,
  validateCell,
  type AggregationType,
} from "./grid-helpers";
import { GridToolbar } from "./GridToolbar";
import { ChangeHistoryPanel } from "./ChangeHistoryPanel";
import { ImportModal } from "./ImportModal";
import { FindReplaceBar } from "./FindReplaceBar";
import { SparklineCell } from "./SparklineCell";
import { Snowflake } from "lucide-react";
import { multiPivotData } from "./grid-helpers";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import { exportToCsv } from "@/components/chat/TablePagination";

// ── Types ────────────────────────────────────────────────────────────

interface CellChange {
  oldValue: string;
  newValue: string;
}

export interface RowChanges {
  rowIndex: number;
  originalRow: Record<string, unknown>;
  changes: Record<string, CellChange>;
}

interface AgEditableDataGridProps {
  data: Record<string, unknown>[];
  columns: string[];
  queryName?: string;
  onSave?: (changes: RowChanges[]) => Promise<void>;
  onDelete?: (
    rowIndices: number[],
    rows: Record<string, unknown>[],
  ) => Promise<void>;
  readOnly?: boolean;
  viewConfig?: GridBoardView;
  onViewConfigChange?: (config: Partial<GridBoardView>) => void;
  views?: GridBoardView[];
  activeView?: GridBoardView | null;
  onLoadView?: (viewId: string) => void;
  onSaveView?: () => void;
  onSaveViewAs?: (name: string, visibility: "private" | "public") => void;
  onDeleteView?: (viewId: string) => void;
  onClearView?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

// ── Component ────────────────────────────────────────────────────────

export function AgEditableDataGrid({
  data: initialData,
  columns: initialColumns,
  queryName,
  onSave,
  onDelete,
  readOnly = false,
  viewConfig,
  onViewConfigChange,
  views = [],
  activeView = null,
  onLoadView,
  onSaveView,
  onSaveViewAs,
  onDeleteView,
  onClearView,
}: AgEditableDataGridProps) {
  // ── Core data state ──
  const [rows, setRows] = useState<Record<string, unknown>[]>(() => [
    ...initialData,
  ]);
  const [dirtyMap, setDirtyMap] = useState<
    Map<number, Map<string, CellChange>>
  >(new Map());
  const [addedRows, setAddedRows] = useState<Set<number>>(new Set());
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // ── Column management ──
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(viewConfig?.hiddenColumns || []),
  );
  const [pinnedColumns] = useState<string[]>(viewConfig?.pinnedColumns || []);
  const [groupByColumn, setGroupByColumn] = useState<string | null>(
    viewConfig?.groupByColumn || null,
  );

  // ── Conditional formatting ──
  const [conditionalFormats, setConditionalFormats] = useState<
    ConditionalFormatRule[]
  >(viewConfig?.conditionalFormats || []);

  // ── Summary & Aggregation ──
  const [showSummary, setShowSummary] = useState(false);
  const [columnAggregations, setColumnAggregations] = useState<
    Record<string, AggregationType>
  >((viewConfig?.columnAggregations || {}) as Record<string, AggregationType>);
  const [showAggregationBar] = useState(
    Object.keys(viewConfig?.columnAggregations || {}).length > 0,
  );

  // ── Formula columns ──
  const [formulaColumns] = useState<FormulaColumn[]>(
    viewConfig?.formulaColumns || [],
  );

  // ── Validation ──
  const [validationRules] = useState<ValidationRule[]>(
    viewConfig?.validationRules || [],
  );

  // ── Save state ──
  const [saving, setSaving] = useState(false);

  // ── Pivot mode ──
  const [pivotMode, setPivotMode] = useState(false);
  const [pivotConfig, setPivotConfig] = useState({
    rowFields: [initialColumns[0] || ""],
    colFields: [initialColumns[1] || ""],
    valueFields:
      initialColumns.length > 2
        ? [initialColumns[2]]
        : initialColumns.slice(0, 1),
    aggregation: "sum" as "sum" | "avg" | "count" | "min" | "max",
  });

  // ── Change history ──
  const [changeHistory, setChangeHistory] = useState<ChangeEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ── Import & Find/Replace ──
  const [showImport, setShowImport] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);

  // ── Frozen rows ──
  const [frozenRowIndices] = useState<Set<number>>(
    new Set(viewConfig?.frozenRowIndices || []),
  );

  // ── Grid API ref ──
  const gridApiRef = useRef<GridApi | null>(null);

  // ── Numeric column detection ──
  const numericCols = useMemo(
    () => new Set(initialColumns.filter((c) => isNumericColumn(rows, c))),
    [initialColumns, rows.length], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Reset when initial data changes ──
  useEffect(() => {
    setRows([...initialData]);
    setDirtyMap(new Map());
    setAddedRows(new Set());
    setDeletedRows(new Set());
    setSelectedRows(new Set());
  }, [initialData]);

  // ── Ctrl+F for find/replace ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowFindReplace(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── View config sync ──
  const emitViewChange = useCallback(
    (partial: Partial<GridBoardView>) => {
      onViewConfigChange?.(partial);
    },
    [onViewConfigChange],
  );

  // ── Row data (with formula columns, excluding deleted) ──
  const rowData = useMemo(() => {
    let processed: Record<string, unknown>[] = rows
      .map((row, idx) => ({ ...row, __rowIndex: idx }))
      .filter((row) => !deletedRows.has(row.__rowIndex as number));

    // Apply formula columns
    if (formulaColumns.length > 0) {
      processed = processed.map((row) => {
        const augmented: Record<string, unknown> = { ...row };
        formulaColumns.forEach((fc) => {
          augmented[fc.name] = evaluateFormula(
            fc.expression,
            row as Record<string, unknown>,
          );
        });
        return augmented;
      });
    }

    return processed;
  }, [rows, deletedRows, formulaColumns]);

  // ── Pinned top rows (frozen) ──
  const pinnedTopRowData = useMemo(() => {
    if (frozenRowIndices.size === 0) return undefined;
    return rowData.filter((r) => frozenRowIndices.has(r.__rowIndex as number));
  }, [rowData, frozenRowIndices]);

  // ── Pinned bottom rows (aggregation summary) ──
  const pinnedBottomRowData = useMemo(() => {
    if (!showSummary && !showAggregationBar) return undefined;
    const summaryRow: Record<string, unknown> = { __rowIndex: -1 };
    const dataRows: Record<string, unknown>[] = rowData.map((r) => {
      const { __rowIndex: _, ...rest } = r;
      return rest as Record<string, unknown>;
    });

    initialColumns.forEach((col) => {
      if (showAggregationBar && columnAggregations[col]) {
        summaryRow[col] = computeColumnAggregation(
          dataRows,
          col,
          columnAggregations[col],
        );
      } else if (showSummary && numericCols.has(col)) {
        const vals = dataRows
          .map((r) => Number(r[col]))
          .filter((n) => !isNaN(n));
        if (vals.length > 0) {
          const sum = vals.reduce((a, b) => a + b, 0);
          const avg = Math.round((sum / vals.length) * 100) / 100;
          summaryRow[col] =
            `Σ ${sum.toLocaleString()} | μ ${avg.toLocaleString()}`;
        } else {
          summaryRow[col] = "";
        }
      } else if (showSummary) {
        const unique = new Set(dataRows.map((r) => String(r[col] ?? "")));
        summaryRow[col] = `${unique.size} distinct`;
      } else {
        summaryRow[col] = "";
      }
    });

    return [summaryRow];
  }, [
    showSummary,
    showAggregationBar,
    columnAggregations,
    rowData,
    initialColumns,
    numericCols,
  ]);

  // ── Column definitions ──
  const columnDefs: ColDef[] = useMemo(() => {
    const allCols = [...initialColumns, ...formulaColumns.map((fc) => fc.name)];

    return allCols
      .filter((col) => !hiddenColumns.has(col))
      .map((col) => {
        const isNumeric = numericCols.has(col);
        const isPinned = pinnedColumns.includes(col);
        const isFormula = formulaColumns.some((fc) => fc.name === col);

        const colDef: ColDef = {
          field: col,
          headerName: col,
          editable: !readOnly && !isFormula,
          pinned: isPinned ? "left" : undefined,
          type: isNumeric ? "numericColumn" : undefined,
          // Numeric columns: right-align, format with locale, no flex (auto-size instead)
          ...(isNumeric
            ? {
                cellClass: "text-right",
                valueFormatter: (params: { value: unknown }) => {
                  const val = Number(params.value);
                  if (isNaN(val)) return String(params.value ?? "");
                  return val.toLocaleString();
                },
              }
            : {}),
          cellClassRules: {
            "text-red-600 font-medium": (params: CellClassParams) => {
              if (!isNumeric) return false;
              const val = Number(params.value);
              return !isNaN(val) && val < 0;
            },
            "bg-amber-50": (params: CellClassParams) => {
              const rowIdx = params.data?.__rowIndex;
              if (rowIdx == null) return false;
              return dirtyMap.has(rowIdx) && dirtyMap.get(rowIdx)!.has(col);
            },
            "bg-green-50": (params: CellClassParams) => {
              const rowIdx = params.data?.__rowIndex;
              if (rowIdx == null) return false;
              return addedRows.has(rowIdx);
            },
          },
          cellStyle: ((params: CellClassParams) => {
            if (conditionalFormats.length === 0) return null;
            return applyConditionalFormat(
              params.value,
              col,
              conditionalFormats,
            );
          }) as ColDef["cellStyle"],
        };

        // Sparkline column check
        const sparklineConfig = viewConfig?.sparklineColumns?.find(
          (sc) => sc.column === col,
        );
        if (sparklineConfig) {
          colDef.cellRenderer = (params: { value: unknown }) => {
            const values = String(params.value || "")
              .split(",")
              .map(Number)
              .filter((n) => !isNaN(n));
            if (values.length === 0) return params.value;
            return (
              <SparklineCell
                values={values}
                type={sparklineConfig.type}
                color={sparklineConfig.color}
              />
            );
          };
        }

        // Width from view config
        if (viewConfig?.columnWidths?.[col]) {
          colDef.width = viewConfig.columnWidths[col];
          colDef.flex = undefined;
        }

        return colDef;
      });
  }, [
    initialColumns,
    formulaColumns,
    hiddenColumns,
    numericCols,
    pinnedColumns,
    readOnly,
    dirtyMap,
    addedRows,
    conditionalFormats,
    viewConfig,
  ]);

  // ── Cell editing handler ──
  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    const rowIdx = event.data?.__rowIndex as number;
    if (rowIdx == null) return;

    const col = event.colDef.field!;
    const oldVal = formatValue(event.oldValue);
    const newVal = formatValue(event.newValue);

    if (oldVal !== newVal) {
      setRows((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], [col]: newVal };
        return next;
      });

      setDirtyMap((prev) => {
        const next = new Map(prev);
        const rowDirty = new Map(next.get(rowIdx) || new Map());
        const existingChange = rowDirty.get(col);
        const originalOld = existingChange ? existingChange.oldValue : oldVal;

        if (originalOld === newVal) {
          rowDirty.delete(col);
          if (rowDirty.size === 0) next.delete(rowIdx);
          else next.set(rowIdx, rowDirty);
        } else {
          rowDirty.set(col, { oldValue: originalOld, newValue: newVal });
          next.set(rowIdx, rowDirty);
        }
        return next;
      });

      setChangeHistory((prev) => [
        ...prev,
        {
          id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          userId: "current_user",
          rowIndex: rowIdx,
          column: col,
          oldValue: oldVal,
          newValue: newVal,
        },
      ]);
    }
  }, []);

  // ── Row actions ──
  const totalDirtyCount = useMemo(() => {
    let count = 0;
    dirtyMap.forEach((colMap) => (count += colMap.size));
    return count + addedRows.size;
  }, [dirtyMap, addedRows]);

  const addRow = useCallback(() => {
    const newRow: Record<string, unknown> = {};
    initialColumns.forEach((c) => (newRow[c] = ""));
    const newIdx = rows.length;
    setRows((prev) => [...prev, newRow]);
    setAddedRows((prev) => new Set(prev).add(newIdx));
  }, [initialColumns, rows.length]);

  const deleteSelected = useCallback(() => {
    setDeletedRows((prev) => {
      const next = new Set(prev);
      selectedRows.forEach((idx) => next.add(idx));
      return next;
    });
    setSelectedRows(new Set());
  }, [selectedRows]);

  const discard = useCallback(() => {
    setRows([...initialData]);
    setDirtyMap(new Map());
    setAddedRows(new Set());
    setDeletedRows(new Set());
    setSelectedRows(new Set());
  }, [initialData]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      const changes: RowChanges[] = [];
      dirtyMap.forEach((colMap, rowIdx) => {
        const changesObj: Record<string, CellChange> = {};
        colMap.forEach((change, colName) => {
          changesObj[colName] = change;
        });
        changes.push({
          rowIndex: rowIdx,
          originalRow: initialData[rowIdx] || {},
          changes: changesObj,
        });
      });
      await onSave(changes);

      if (onDelete && deletedRows.size > 0) {
        const deleteIndices = Array.from(deletedRows);
        const deleteRowData = deleteIndices
          .map((i) => initialData[i])
          .filter(Boolean);
        await onDelete(deleteIndices, deleteRowData);
      }

      setDirtyMap(new Map());
      setAddedRows(new Set());
      setDeletedRows(new Set());
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  }, [onSave, onDelete, dirtyMap, deletedRows, initialData]);

  // ── Export ──
  const handleExport = useCallback(() => {
    if (gridApiRef.current) {
      gridApiRef.current.exportDataAsCsv({
        fileName: `${queryName || "export"}.csv`,
      });
    } else {
      exportToCsv(rows, `${queryName || "export"}.csv`);
    }
  }, [rows, queryName]);

  // ── Toolbar handlers ──
  const toggleColumn = useCallback(
    (col: string) => {
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        if (next.has(col)) next.delete(col);
        else next.add(col);
        emitViewChange({ hiddenColumns: Array.from(next) });
        return next;
      });
    },
    [emitViewChange],
  );

  const addFormat = useCallback(
    (rule: Omit<ConditionalFormatRule, "id">) => {
      const newRule: ConditionalFormatRule = {
        ...rule,
        id: `fmt_${Date.now()}`,
      };
      setConditionalFormats((prev) => {
        const next = [...prev, newRule];
        emitViewChange({ conditionalFormats: next });
        return next;
      });
    },
    [emitViewChange],
  );

  const removeFormat = useCallback(
    (ruleId: string) => {
      setConditionalFormats((prev) => {
        const next = prev.filter((r) => r.id !== ruleId);
        emitViewChange({ conditionalFormats: next });
        return next;
      });
    },
    [emitViewChange],
  );

  // ── Grouped data (Community AG Grid doesn't do row grouping) ──
  const groups = useMemo(() => {
    if (!groupByColumn) return null;
    return groupRows(
      rowData.map((r) => {
        const { __rowIndex: _, ...rest } = r;
        return rest;
      }),
      groupByColumn,
    );
  }, [rowData, groupByColumn]);

  // ── Pivot data for AG Grid (multi-field) ──
  const pivotGridData = useMemo(() => {
    if (!pivotMode) return { rowData: [], columnDefs: [], totalRow: [] };

    const result = multiPivotData(rows, {
      rowFields: pivotConfig.rowFields,
      colFields: pivotConfig.colFields,
      valueFields: pivotConfig.valueFields,
      aggregation: pivotConfig.aggregation,
    });

    const numFmt = (params: { value: unknown }) => {
      const val = Number(params.value);
      if (isNaN(val) || val === 0) return "-";
      return val.toLocaleString();
    };

    // Row field columns (pinned left)
    const rowColDefs: ColDef[] = pivotConfig.rowFields.map((f, i) => ({
      field: f,
      headerName: f,
      pinned: "left" as const,
      minWidth: 120,
      cellClass: "font-medium",
      headerClass: i === 0 ? "font-bold" : "",
    }));

    // Pivot value columns
    const valueColDefs: ColDef[] = result.pivotColKeys.map((ck) => ({
      field: ck,
      headerName: ck,
      type: "numericColumn" as const,
      cellClass: "text-right",
      valueFormatter: numFmt,
      minWidth: 100,
    }));

    // Total column
    const totalColDef: ColDef = {
      field: "__total",
      headerName: "Total",
      type: "numericColumn" as const,
      cellClass: "text-right font-semibold",
      cellStyle: { backgroundColor: "#eff6ff" },
      headerClass: "font-bold",
      valueFormatter: numFmt,
      minWidth: 110,
    };

    return {
      rowData: result.rows,
      columnDefs: [...rowColDefs, ...valueColDefs, totalColDef],
      totalRow: [result.totalsRow],
    };
  }, [pivotMode, rows, pivotConfig]);

  // ── Selection sync ──
  const onSelectionChanged = useCallback(() => {
    if (!gridApiRef.current) return;
    const selected = gridApiRef.current.getSelectedRows();
    const indices = new Set(
      selected.map((r: Record<string, unknown>) => r.__rowIndex as number),
    );
    setSelectedRows(indices);
  }, []);

  // ── Shared toolbar props ──
  const toolbarProps = {
    columns: initialColumns,
    hiddenColumns,
    groupByColumn,
    selectedCount: selectedRows.size,
    dirtyCount: totalDirtyCount,
    deletedCount: deletedRows.size,
    readOnly,
    conditionalFormats,
    views,
    activeView,
    onToggleColumn: toggleColumn,
    onGroupByChange: (col: string | null) => setGroupByColumn(col),
    onDeleteSelected: deleteSelected,
    onAddRow: addRow,
    onSaveChanges: handleSave,
    onDiscardChanges: discard,
    onExport: handleExport,
    onToggleSummary: () => setShowSummary(!showSummary),
    showSummary,
    onAddFormat: addFormat,
    onRemoveFormat: removeFormat,
    onLoadView: onLoadView || (() => {}),
    onSaveView: onSaveView || (() => {}),
    onSaveViewAs: onSaveViewAs || (() => {}),
    onDeleteView: onDeleteView || (() => {}),
    onClearView: onClearView || (() => {}),
    // Consolidated features
    pivotMode,
    onTogglePivot: () => setPivotMode((p) => !p),
    showAggregation: Object.keys(columnAggregations).length > 0,
    onToggleAggregation: () =>
      setColumnAggregations((prev) => {
        const hasAny = Object.keys(prev).length > 0;
        if (hasAny) {
          emitViewChange({ columnAggregations: {} });
          return {};
        }
        const defaults: Record<string, AggregationType> = {};
        initialColumns.forEach((c) => {
          if (numericCols.has(c)) defaults[c] = "sum";
        });
        emitViewChange({
          columnAggregations: defaults as Record<string, string>,
        });
        return defaults;
      }),
    onToggleFind: () => setShowFindReplace(true),
    onToggleImport: () => setShowImport(true),
    showHistory,
    onToggleHistory: () => setShowHistory(!showHistory),
    saving,
  };

  // ── Pivot mode — rendered via AG Grid ──
  if (pivotMode) {
    return (
      <div className="flex flex-col h-full">
        <GridToolbar {...toolbarProps} />
        {/* Pivot config selectors — multi-select dropdowns */}
        <div className="flex items-start gap-4 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 flex-wrap">
          <MultiSelectDropdown
            label="Rows"
            options={initialColumns}
            selected={pivotConfig.rowFields}
            onChange={(v) => setPivotConfig((p) => ({ ...p, rowFields: v }))}
            numericCols={numericCols}
          />
          <MultiSelectDropdown
            label="Columns"
            options={initialColumns}
            selected={pivotConfig.colFields}
            onChange={(v) => setPivotConfig((p) => ({ ...p, colFields: v }))}
            numericCols={numericCols}
          />
          <MultiSelectDropdown
            label="Values"
            options={initialColumns.filter((c) => numericCols.has(c))}
            selected={pivotConfig.valueFields}
            onChange={(v) => setPivotConfig((p) => ({ ...p, valueFields: v }))}
            numericCols={numericCols}
          />
          <MultiSelectDropdown
            label="Aggregation"
            options={["sum", "avg", "count", "min", "max"]}
            selected={[pivotConfig.aggregation]}
            onChange={(v) =>
              setPivotConfig((p) => ({
                ...p,
                aggregation: (v[0] || "sum") as
                  | "sum"
                  | "avg"
                  | "count"
                  | "min"
                  | "max",
              }))
            }
            single
          />
        </div>
        {/* AG Grid Pivot */}
        <div className="flex-1 min-h-0">
          <AgGrid
            rowData={pivotGridData.rowData}
            columnDefs={pivotGridData.columnDefs}
            pinnedBottomRowData={pivotGridData.totalRow}
            pagination={false}
            height="100%"
            autoSizeStrategy={{
              type: "fitGridWidth",
              defaultMinWidth: 100,
            }}
            defaultColDef={{
              sortable: true,
              resizable: true,
              filter: true,
              minWidth: 80,
            }}
          />
        </div>
      </div>
    );
  }

  // ── Grouped view ──
  if (groups) {
    return (
      <div className="flex flex-col h-full">
        <GridToolbar {...toolbarProps} />
        <div className="flex-1 overflow-auto">
          {groups.map((group) => {
            const summary = computeGroupSummary(group.rows, numericCols);
            return (
              <div key={group.groupValue} className="mb-2">
                <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-white dark:from-slate-700 dark:to-slate-800 px-4 py-2.5 text-sm font-semibold border-b border-blue-200 dark:border-slate-600 flex items-center gap-3 shadow-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-gray-500 dark:text-gray-400">
                      {groupByColumn}:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {group.groupValue}
                    </span>
                  </span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                    {group.rows.length} rows
                  </span>
                  <span className="flex-1" />
                  {Object.entries(summary)
                    .slice(0, 4)
                    .map(([col, val]) => (
                      <span
                        key={col}
                        className="text-xs text-gray-500 dark:text-gray-400 font-mono"
                      >
                        <span className="text-gray-400 dark:text-gray-500">
                          {col}:
                        </span>{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {typeof val === "number" ? val.toLocaleString() : val}
                        </span>
                      </span>
                    ))}
                </div>
                <AgGrid
                  rowData={group.rows.map((r, i) => ({
                    ...r,
                    __rowIndex: i,
                  }))}
                  columnDefs={columnDefs}
                  compact
                  pagination={false}
                  height={Math.min(group.rows.length * 28 + 45, 300)}
                  domLayout="normal"
                  headerHeight={32}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main AG Grid view ──
  return (
    <div className="flex flex-col h-full">
      <GridToolbar {...toolbarProps} />

      {/* Find/Replace bar */}
      {showFindReplace && (
        <FindReplaceBar
          isOpen={showFindReplace}
          rows={rows}
          columns={initialColumns}
          onReplace={(rowIdx, col, newVal) => {
            setRows((prev) => {
              const next = [...prev];
              next[rowIdx] = { ...next[rowIdx], [col]: newVal };
              return next;
            });
          }}
          onReplaceAll={() => {}}
          onClose={() => setShowFindReplace(false)}
          onHighlightMatch={() => {}}
        />
      )}

      {/* Row count */}
      <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        {rowData.length} of {rows.length} rows
        {deletedRows.size > 0 && (
          <span className="text-red-500 ml-2">
            ({deletedRows.size} deleted)
          </span>
        )}
      </div>

      {/* AG Grid */}
      <div className="flex-1 min-h-0">
        <AgGrid
          rowData={
            pinnedTopRowData
              ? rowData.filter(
                  (r) => !frozenRowIndices.has(r.__rowIndex as number),
                )
              : rowData
          }
          columnDefs={columnDefs}
          onGridReady={(params) => {
            gridApiRef.current = params.api;
            // Restore sort state from view config
            if (viewConfig?.sortConfig?.length) {
              params.api.applyColumnState({
                state: viewConfig.sortConfig.map((s) => ({
                  colId: s.column,
                  sort: s.direction as "asc" | "desc",
                })),
              });
            }
          }}
          onColumnResized={(event) => {
            if (!event.finished || !event.column) return;
            const col = event.column.getColId();
            const width = event.column.getActualWidth();
            emitViewChange({
              columnWidths: { ...viewConfig?.columnWidths, [col]: width },
            });
          }}
          onSortChanged={() => {
            if (!gridApiRef.current) return;
            const colState = gridApiRef.current.getColumnState();
            const sortConfig = colState
              .filter((c) => c.sort)
              .map((c) => ({
                column: c.colId,
                direction: c.sort as "asc" | "desc",
              }));
            emitViewChange({ sortConfig });
          }}
          onColumnMoved={() => {
            if (!gridApiRef.current) return;
            const colState = gridApiRef.current.getColumnState();
            const columnOrder = colState.map((c) => c.colId);
            emitViewChange({ columnOrder });
          }}
          onCellValueChanged={onCellValueChanged}
          onSelectionChanged={onSelectionChanged}
          rowSelection="multiple"
          pinnedTopRowData={pinnedTopRowData}
          pinnedBottomRowData={pinnedBottomRowData}
          stopEditingWhenCellsLoseFocus
          singleClickEdit={false}
          getRowId={(params) => String(params.data.__rowIndex)}
          height="100%"
          autoSizeStrategy={{
            type: "fitGridWidth",
            defaultMinWidth: 120,
          }}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            editable: !readOnly,
            minWidth: 100,
          }}
        />
      </div>

      {/* Change history panel */}
      {showHistory && (
        <ChangeHistoryPanel
          isOpen={showHistory}
          history={changeHistory}
          onClose={() => setShowHistory(false)}
          onUndo={() => {}}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          isOpen={showImport}
          existingColumns={initialColumns}
          onImport={(importedRows: Record<string, unknown>[]) => {
            setRows((prev) => [...prev, ...importedRows]);
            const startIdx = rows.length;
            setAddedRows((prev) => {
              const next = new Set(prev);
              importedRows.forEach((_, i) => next.add(startIdx + i));
              return next;
            });
            setShowImport(false);
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
