"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  TablePagination,
  exportToCsv,
} from "@/components/chat/TablePagination";
import {
  Pin,
  Filter,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { GridToolbar } from "./GridToolbar";
import { ColumnHeaderMenu } from "./ColumnHeaderMenu";
import type {
  GridBoardView,
  ConditionalFormatRule,
  FormulaColumn,
  ValidationRule,
  ChangeEntry,
} from "@/types/dashboard";
import {
  isNumericColumn,
  multiColumnSort,
  clientFilter,
  groupRows,
  computeGroupSummary,
  applyConditionalFormat,
  reorderColumns,
  getEffectiveColumns,
  evaluateFormula,
  computeColumnAggregation,
  validateCell,
  type SortEntry,
  type ClientFilter as ClientFilterType,
  type AggregationType,
} from "./grid-helpers";
import { PivotTable } from "./PivotTable";
import { SparklineCell } from "./SparklineCell";
import { useGridKeyboard } from "./useGridKeyboard";
import { ValidationIndicator } from "./ValidationIndicator";
import { ChangeHistoryPanel } from "./ChangeHistoryPanel";
import { ImportModal } from "./ImportModal";
import { FindReplaceBar } from "./FindReplaceBar";
import { History, Search, Upload, Snowflake } from "lucide-react";

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

interface EditableDataGridProps {
  data: Record<string, unknown>[];
  columns: string[];
  queryName?: string;
  onSave?: (changes: RowChanges[]) => Promise<void>;
  onDelete?: (
    rowIndices: number[],
    rows: Record<string, unknown>[],
  ) => Promise<void>;
  readOnly?: boolean;
  // View preferences
  viewConfig?: GridBoardView;
  onViewConfigChange?: (config: Partial<GridBoardView>) => void;
  // View management (passed through to toolbar)
  views?: GridBoardView[];
  activeView?: GridBoardView | null;
  onLoadView?: (viewId: string) => void;
  onSaveView?: () => void;
  onSaveViewAs?: (name: string) => void;
  onDeleteView?: (viewId: string) => void;
  onClearView?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Component ────────────────────────────────────────────────────────

export function EditableDataGrid({
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
}: EditableDataGridProps) {
  // ── Core data state ──
  const [rows, setRows] = useState<Record<string, unknown>[]>(() => [
    ...initialData,
  ]);
  const [dirtyMap, setDirtyMap] = useState<
    Map<number, Map<string, CellChange>>
  >(new Map());
  const [addedRows, setAddedRows] = useState<Set<number>>(new Set());
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());

  // ── Editing state ──
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Selection ──
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // ── Column management ──
  const [columnOrder, setColumnOrder] = useState<string[]>(
    viewConfig?.columnOrder?.length
      ? viewConfig.columnOrder
      : [...initialColumns],
  );
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(viewConfig?.hiddenColumns || []),
  );
  const [pinnedColumns, setPinnedColumns] = useState<string[]>(
    viewConfig?.pinnedColumns || [],
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    viewConfig?.columnWidths || {},
  );

  // ── Sorting ──
  const [sortConfig, setSortConfig] = useState<SortEntry[]>(
    viewConfig?.sortConfig || [],
  );

  // ── Client-side filtering ──
  const [clientFilters, setClientFilters] = useState<
    Record<string, ClientFilterType>
  >((viewConfig?.clientFilters || {}) as Record<string, ClientFilterType>);

  // ── Grouping ──
  const [groupByColumn, setGroupByColumn] = useState<string | null>(
    viewConfig?.groupByColumn || null,
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  // ── Conditional formatting ──
  const [conditionalFormats, setConditionalFormats] = useState<
    ConditionalFormatRule[]
  >(viewConfig?.conditionalFormats || []);

  // ── Pagination ──
  const [pageSize, setPageSize] = useState(viewConfig?.pageSize || 25);
  const [pageRange, setPageRange] = useState<[number, number]>([0, pageSize]);

  // ── Summary ──
  const [showSummary, setShowSummary] = useState(false);

  // ── Save state ──
  const [saving, setSaving] = useState(false);

  // ── Pivot mode ──
  const [pivotMode, setPivotMode] = useState(false);
  const [pivotConfig, setPivotConfig] = useState({
    rowField: initialColumns[0] || "",
    colField: initialColumns[1] || "",
    valueField: initialColumns[2] || "",
    aggregation: "sum" as "sum" | "avg" | "count" | "min" | "max",
  });

  // ── Formula columns ──
  const [formulaColumns, setFormulaColumns] = useState<FormulaColumn[]>(
    viewConfig?.formulaColumns || [],
  );

  // ── Column aggregation bar ──
  const [columnAggregations, setColumnAggregations] = useState<
    Record<string, AggregationType>
  >((viewConfig?.columnAggregations || {}) as Record<string, AggregationType>);
  const [showAggregationBar, setShowAggregationBar] = useState(
    Object.keys(viewConfig?.columnAggregations || {}).length > 0,
  );

  // ── Keyboard navigation ──
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);

  // ── Batch 4: Validation ──
  const [validationRules, setValidationRules] = useState<ValidationRule[]>(
    viewConfig?.validationRules || [],
  );

  // ── Batch 4: Change history ──
  const [changeHistory, setChangeHistory] = useState<ChangeEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // ── Batch 4: Import modal ──
  const [showImport, setShowImport] = useState(false);

  // ── Batch 4: Find & Replace ──
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findHighlight, setFindHighlight] = useState<{
    rowIndex: number;
    column: string;
  } | null>(null);

  // ── Batch 4: Frozen rows ──
  const [frozenRowIndices, setFrozenRowIndices] = useState<Set<number>>(
    new Set(viewConfig?.frozenRowIndices || []),
  );

  // ── Column drag state ──
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // ── Column resize state ──
  const resizeRef = useRef<{
    col: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // ── Numeric column detection ──
  const numericCols = useMemo(
    () => new Set(initialColumns.filter((c) => isNumericColumn(rows, c))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialColumns, rows.length],
  );

  // ── Effective columns (ordered, visible, pinned first) ──
  const effectiveColumns = useMemo(
    () => getEffectiveColumns(columnOrder, hiddenColumns, pinnedColumns),
    [columnOrder, hiddenColumns, pinnedColumns],
  );

  // Active filter count
  const activeFilterCount = useMemo(
    () =>
      Object.values(clientFilters).filter(
        (f) =>
          f.value.trim() || f.operator === "empty" || f.operator === "notEmpty",
      ).length,
    [clientFilters],
  );

  // ── Reset when initial data changes ──
  useEffect(() => {
    setRows([...initialData]);
    setDirtyMap(new Map());
    setAddedRows(new Set());
    setDeletedRows(new Set());
    setSelectedRows(new Set());
    setEditingCell(null);
    setPageRange([0, pageSize]);
    // Update column order for new columns not in current order
    setColumnOrder((prev) => {
      const newCols = initialColumns.filter((c) => !prev.includes(c));
      const existing = prev.filter((c) => initialColumns.includes(c));
      return [...existing, ...newCols];
    });
  }, [initialData, initialColumns, pageSize]);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // ── View config sync ──
  const emitViewChange = useCallback(
    (partial: Partial<GridBoardView>) => {
      onViewConfigChange?.(partial);
    },
    [onViewConfigChange],
  );

  // ── Processed rows (filter → sort → group) ──

  const filteredRows = useMemo(() => {
    const withoutDeleted = rows.filter((_, i) => !deletedRows.has(i));
    return clientFilter(withoutDeleted, clientFilters);
  }, [rows, deletedRows, clientFilters]);

  const sortedRows = useMemo(() => {
    const indexed = filteredRows.map((row, idx) => ({
      row,
      originalIndex: idx,
    }));
    if (sortConfig.length === 0) return indexed;
    const sorted = multiColumnSort(
      indexed.map((r) => r.row),
      sortConfig,
      numericCols,
    );
    return sorted.map((row) => {
      const orig = indexed.find((r) => r.row === row);
      return { row, originalIndex: orig?.originalIndex ?? 0 };
    });
  }, [filteredRows, sortConfig, numericCols]);

  const groups = useMemo(() => {
    if (!groupByColumn) return null;
    return groupRows(
      sortedRows.map((r) => r.row),
      groupByColumn,
    );
  }, [sortedRows, groupByColumn]);

  const visibleRows = groups
    ? null
    : sortedRows.slice(pageRange[0], pageRange[1]);
  const totalFilteredRows = groups
    ? groups.reduce((sum, g) => sum + g.rows.length, 0)
    : sortedRows.length;

  // ── Validation errors ──
  const validationErrors = useMemo(() => {
    if (validationRules.length === 0) return new Map<string, string[]>();
    const errors = new Map<string, string[]>();
    rows.forEach((row, rowIdx) => {
      if (deletedRows.has(rowIdx)) return;
      effectiveColumns.forEach((col) => {
        const cellErrors = validateCell(
          row[col],
          col,
          rowIdx,
          validationRules,
          rows,
        );
        if (cellErrors.length > 0) {
          errors.set(`${rowIdx}:${col}`, cellErrors);
        }
      });
    });
    return errors;
  }, [rows, validationRules, effectiveColumns, deletedRows]);

  // ── Ctrl+F shortcut ──
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

  // ── Cell editing ──

  const startEdit = useCallback(
    (rowIdx: number, col: string) => {
      if (readOnly || deletedRows.has(rowIdx)) return;
      setEditingCell({ row: rowIdx, col });
      setEditValue(formatValue(rows[rowIdx][col]));
    },
    [readOnly, rows, deletedRows],
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { row: rowIdx, col } = editingCell;
    const oldVal = formatValue(rows[rowIdx][col]);
    const newVal = editValue;

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

      // Record change history
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

    setEditingCell(null);
  }, [editingCell, editValue, rows]);

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        commitEdit();
      } else if (e.key === "Escape") {
        cancelEdit();
      } else if (e.key === "Tab") {
        e.preventDefault();
        commitEdit();
        if (editingCell) {
          const colIdx = effectiveColumns.indexOf(editingCell.col);
          const nextCol =
            effectiveColumns[(colIdx + 1) % effectiveColumns.length];
          const nextRow =
            colIdx + 1 >= effectiveColumns.length
              ? editingCell.row + 1
              : editingCell.row;
          if (nextRow < rows.length) startEdit(nextRow, nextCol);
        }
      }
    },
    [
      commitEdit,
      cancelEdit,
      editingCell,
      effectiveColumns,
      rows.length,
      startEdit,
    ],
  );

  // ── Row selection ──

  const toggleRowSelect = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!visibleRows) return;
    const allSelected = visibleRows.every((r) =>
      selectedRows.has(r.originalIndex),
    );
    if (allSelected) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        visibleRows.forEach((r) => next.delete(r.originalIndex));
        return next;
      });
    } else {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        visibleRows.forEach((r) => next.add(r.originalIndex));
        return next;
      });
    }
  }, [visibleRows, selectedRows]);

  // ── Delete selected ──

  const deleteSelected = useCallback(() => {
    setDeletedRows((prev) => {
      const next = new Set(prev);
      selectedRows.forEach((idx) => next.add(idx));
      return next;
    });
    setSelectedRows(new Set());
  }, [selectedRows]);

  // ── Add / discard / save ──

  const addRow = useCallback(() => {
    const newRow: Record<string, unknown> = {};
    initialColumns.forEach((c) => (newRow[c] = ""));
    const newIdx = rows.length;
    setRows((prev) => [...prev, newRow]);
    setAddedRows((prev) => new Set(prev).add(newIdx));
  }, [initialColumns, rows.length]);

  const discard = useCallback(() => {
    setRows([...initialData]);
    setDirtyMap(new Map());
    setAddedRows(new Set());
    setDeletedRows(new Set());
    setSelectedRows(new Set());
    setEditingCell(null);
  }, [initialData]);

  const totalDirtyCount = useMemo(() => {
    let count = 0;
    dirtyMap.forEach((colMap) => (count += colMap.size));
    return count + addedRows.size;
  }, [dirtyMap, addedRows]);

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

      // Handle deletes
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
    } finally {
      setSaving(false);
    }
  }, [onSave, onDelete, dirtyMap, deletedRows, initialData]);

  // ── Sort handlers ──

  const handleSort = useCallback(
    (col: string, direction: "asc" | "desc", addToMulti: boolean) => {
      setSortConfig((prev) => {
        if (addToMulti) {
          const filtered = prev.filter((s) => s.column !== col);
          return [...filtered, { column: col, direction }];
        }
        return [{ column: col, direction }];
      });
      emitViewChange({ sortConfig: sortConfig });
    },
    [emitViewChange, sortConfig],
  );

  const handleClearSort = useCallback(
    (col: string) => {
      setSortConfig((prev) => {
        const next = prev.filter((s) => s.column !== col);
        emitViewChange({ sortConfig: next });
        return next;
      });
    },
    [emitViewChange],
  );

  const handleHeaderClick = useCallback(
    (col: string, e: React.MouseEvent) => {
      const isShift = e.shiftKey;
      const existing = sortConfig.find((s) => s.column === col);
      if (existing && !isShift) {
        // Toggle direction
        setSortConfig([
          {
            column: col,
            direction: existing.direction === "asc" ? "desc" : "asc",
          },
        ]);
      } else if (existing && isShift) {
        setSortConfig((prev) =>
          prev.map((s) =>
            s.column === col
              ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" }
              : s,
          ),
        );
      } else {
        handleSort(col, "asc", isShift);
      }
    },
    [sortConfig, handleSort],
  );

  // ── Column operations ──

  const handleToggleColumn = useCallback(
    (col: string) => {
      setHiddenColumns((prev) => {
        const next = new Set(prev);
        if (next.has(col)) {
          next.delete(col);
        } else {
          next.add(col);
        }
        emitViewChange({ hiddenColumns: Array.from(next) });
        return next;
      });
    },
    [emitViewChange],
  );

  const handlePin = useCallback(
    (col: string) => {
      setPinnedColumns((prev) => {
        const next = prev.includes(col) ? prev : [...prev, col];
        emitViewChange({ pinnedColumns: next });
        return next;
      });
    },
    [emitViewChange],
  );

  const handleUnpin = useCallback(
    (col: string) => {
      setPinnedColumns((prev) => {
        const next = prev.filter((c) => c !== col);
        emitViewChange({ pinnedColumns: next });
        return next;
      });
    },
    [emitViewChange],
  );

  const handleGroupByChange = useCallback(
    (col: string | null) => {
      setGroupByColumn(col);
      setCollapsedGroups(new Set());
      emitViewChange({ groupByColumn: col || undefined });
    },
    [emitViewChange],
  );

  const handleClientFilter = useCallback(
    (col: string, filter: ClientFilterType | null) => {
      setClientFilters((prev) => {
        const next = { ...prev };
        if (filter) {
          next[col] = filter;
        } else {
          delete next[col];
        }
        emitViewChange({ clientFilters: next });
        return next;
      });
    },
    [emitViewChange],
  );

  // ── Conditional formatting ──

  const handleAddFormat = useCallback(
    (rule: Omit<ConditionalFormatRule, "id">) => {
      const newRule: ConditionalFormatRule = { ...rule, id: uid() };
      setConditionalFormats((prev) => {
        const next = [...prev, newRule];
        emitViewChange({ conditionalFormats: next });
        return next;
      });
    },
    [emitViewChange],
  );

  const handleRemoveFormat = useCallback(
    (ruleId: string) => {
      setConditionalFormats((prev) => {
        const next = prev.filter((r) => r.id !== ruleId);
        emitViewChange({ conditionalFormats: next });
        return next;
      });
    },
    [emitViewChange],
  );

  // ── Column drag & drop ──

  const handleDragStart = useCallback((col: string) => setDragCol(col), []);
  const handleDragOver = useCallback((col: string) => setDragOverCol(col), []);
  const handleDrop = useCallback(
    (targetCol: string) => {
      if (!dragCol || dragCol === targetCol) return;
      const fromIdx = columnOrder.indexOf(dragCol);
      const toIdx = columnOrder.indexOf(targetCol);
      if (fromIdx >= 0 && toIdx >= 0) {
        const newOrder = reorderColumns(columnOrder, fromIdx, toIdx);
        setColumnOrder(newOrder);
        emitViewChange({ columnOrder: newOrder });
      }
      setDragCol(null);
      setDragOverCol(null);
    },
    [dragCol, columnOrder, emitViewChange],
  );

  // ── Column resize ──

  const handleResizeStart = useCallback(
    (col: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startWidth = columnWidths[col] || 150;
      resizeRef.current = { col, startX: e.clientX, startWidth };

      const onMove = (me: MouseEvent) => {
        if (!resizeRef.current) return;
        const diff = me.clientX - resizeRef.current.startX;
        const newWidth = Math.max(60, resizeRef.current.startWidth + diff);
        setColumnWidths((prev) => ({
          ...prev,
          [resizeRef.current!.col]: newWidth,
        }));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (resizeRef.current) {
          emitViewChange({
            columnWidths: {
              ...columnWidths,
              [resizeRef.current.col]:
                columnWidths[resizeRef.current.col] || 150,
            },
          });
        }
        resizeRef.current = null;
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [columnWidths, emitViewChange],
  );

  // ── Summary row ──

  const summaryRow = useMemo(() => {
    if (!showSummary) return null;
    const summary: Record<string, string> = {};
    effectiveColumns.forEach((col) => {
      if (numericCols.has(col)) {
        let sum = 0;
        filteredRows.forEach((r) => {
          const v = Number(r[col]);
          if (!isNaN(v)) sum += v;
        });
        summary[col] = sum.toLocaleString();
      } else {
        summary[col] = "";
      }
    });
    return summary;
  }, [showSummary, effectiveColumns, numericCols, filteredRows]);

  // ── Formula column values ──
  const formulaColumnNames = useMemo(
    () => formulaColumns.map((fc) => `fx:${fc.name}`),
    [formulaColumns],
  );

  // ── Aggregation bar ──
  const aggregationValues = useMemo(() => {
    if (!showAggregationBar) return null;
    const result: Record<string, string> = {};
    for (const col of effectiveColumns) {
      const aggType = columnAggregations[col];
      if (aggType && numericCols.has(col)) {
        const val = computeColumnAggregation(filteredRows, col, aggType);
        result[col] =
          val !== null
            ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : "-";
      }
    }
    return result;
  }, [
    showAggregationBar,
    effectiveColumns,
    columnAggregations,
    numericCols,
    filteredRows,
  ]);

  // ── Keyboard navigation ──
  const { containerRef: gridContainerRef } = useGridKeyboard({
    totalRows: visibleRows?.length ?? 0,
    totalCols: effectiveColumns.length,
    focusedCell,
    onFocusChange: (row, col) => setFocusedCell([row, col]),
    onStartEdit: (row, col) => {
      if (visibleRows && visibleRows[row]) {
        startEdit(visibleRows[row].originalIndex, effectiveColumns[col]);
      }
    },
    onCancelEdit: cancelEdit,
    isEditing: !!editingCell,
    getCellValue: (row, col) => {
      if (!visibleRows?.[row]) return "";
      return formatValue(visibleRows[row].row[effectiveColumns[col]]);
    },
    readOnly,
  });

  // ── Import handler ──
  const handleImport = useCallback(
    (data: Record<string, unknown>[], mode: "append" | "replace") => {
      if (mode === "replace") {
        setRows(data);
        setDirtyMap(new Map());
        setAddedRows(new Set());
        setDeletedRows(new Set());
      } else {
        const startIdx = rows.length;
        setRows((prev) => [...prev, ...data]);
        setAddedRows((prev) => {
          const next = new Set(prev);
          data.forEach((_, i) => next.add(startIdx + i));
          return next;
        });
      }
    },
    [rows.length],
  );

  // ── Find & Replace handlers ──
  const handleFindReplace = useCallback(
    (rowIndex: number, column: string, newValue: string) => {
      const oldVal = String(rows[rowIndex]?.[column] ?? "");
      if (oldVal === newValue) return;
      setRows((prev) => {
        const next = [...prev];
        next[rowIndex] = { ...next[rowIndex], [column]: newValue };
        return next;
      });
      setDirtyMap((prev) => {
        const next = new Map(prev);
        const rowDirty = new Map(next.get(rowIndex) || new Map());
        rowDirty.set(column, { oldValue: oldVal, newValue });
        next.set(rowIndex, rowDirty);
        return next;
      });
      setChangeHistory((prev) => [
        ...prev,
        {
          id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          userId: "current_user",
          rowIndex,
          column,
          oldValue: oldVal,
          newValue,
        },
      ]);
    },
    [rows],
  );

  const handleFindReplaceAll = useCallback(
    (
      matches: Array<{ rowIndex: number; column: string }>,
      replaceTerm: string,
    ) => {
      setRows((prev) => {
        const next = [...prev];
        for (const match of matches) {
          const oldVal = String(next[match.rowIndex]?.[match.column] ?? "");
          next[match.rowIndex] = {
            ...next[match.rowIndex],
            [match.column]: replaceTerm,
          };
          setDirtyMap((dm) => {
            const nxt = new Map(dm);
            const rowDirty = new Map(nxt.get(match.rowIndex) || new Map());
            rowDirty.set(match.column, {
              oldValue: oldVal,
              newValue: replaceTerm,
            });
            nxt.set(match.rowIndex, rowDirty);
            return nxt;
          });
        }
        return next;
      });
    },
    [],
  );

  // ── History undo ──
  const handleHistoryUndo = useCallback((entry: ChangeEntry) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[entry.rowIndex]) {
        next[entry.rowIndex] = {
          ...next[entry.rowIndex],
          [entry.column]: entry.oldValue,
        };
      }
      return next;
    });
    setChangeHistory((prev) => prev.filter((e) => e.id !== entry.id));
  }, []);

  // ── Frozen row toggle ──
  const toggleFreezeRow = useCallback(
    (rowIndex: number) => {
      setFrozenRowIndices((prev) => {
        const next = new Set(prev);
        if (next.has(rowIndex)) next.delete(rowIndex);
        else next.add(rowIndex);
        emitViewChange({ frozenRowIndices: Array.from(next) });
        return next;
      });
    },
    [emitViewChange],
  );

  // ── Export ──

  const handleExport = useCallback(() => {
    exportToCsv(
      filteredRows as Record<string, unknown>[],
      `${queryName || "gridboard"}-export.csv`,
    );
  }, [filteredRows, queryName]);

  // ── Toggle group collapse ──

  const toggleGroup = useCallback((groupValue: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupValue)) {
        next.delete(groupValue);
      } else {
        next.add(groupValue);
      }
      return next;
    });
  }, []);

  // ── Pinned column left offsets ──

  const pinnedOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let cumLeft = 42; // checkbox col (26px) + row number col (~42px approx)
    for (const col of pinnedColumns) {
      if (hiddenColumns.has(col)) continue;
      offsets[col] = cumLeft;
      cumLeft += columnWidths[col] || 150;
    }
    return offsets;
  }, [pinnedColumns, hiddenColumns, columnWidths]);

  // ── Render ──

  if (!rows.length && !initialColumns.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data loaded. Select a query and click &quot;Load Data&quot;.
      </div>
    );
  }

  // Sort indicator for column header
  const getSortIndicator = (col: string) => {
    const idx = sortConfig.findIndex((s) => s.column === col);
    if (idx < 0) return null;
    const entry = sortConfig[idx];
    return (
      <span className="ml-1 text-blue-600 text-[10px] inline-flex items-center">
        {entry.direction === "asc" ? (
          <ArrowUp size={10} />
        ) : (
          <ArrowDown size={10} />
        )}
        {sortConfig.length > 1 && <sup>{idx + 1}</sup>}
      </span>
    );
  };

  const renderCell = (
    row: Record<string, unknown>,
    originalIndex: number,
    col: string,
  ) => {
    const isEditing =
      editingCell?.row === originalIndex && editingCell?.col === col;
    const isDirty = dirtyMap.get(originalIndex)?.has(col);
    const isDeleted = deletedRows.has(originalIndex);
    const cellVal = formatValue(row[col]);
    const isNum = numericCols.has(col);
    const isPinned = pinnedColumns.includes(col);
    const cfStyle = applyConditionalFormat(row[col], col, conditionalFormats);
    const width = columnWidths[col];
    const cellValidationErrors =
      validationErrors.get(`${originalIndex}:${col}`) || [];
    const isFindMatch =
      findHighlight?.rowIndex === originalIndex &&
      findHighlight?.column === col;

    return (
      <td
        key={col}
        onDoubleClick={() => startEdit(originalIndex, col)}
        style={{
          width: width ? `${width}px` : undefined,
          minWidth: width ? `${width}px` : undefined,
          ...(isPinned
            ? { position: "sticky", left: pinnedOffsets[col] ?? 0, zIndex: 5 }
            : {}),
          ...((cfStyle as React.CSSProperties) || {}),
        }}
        className={`px-3 py-1.5 border-r border-gray-100 relative ${
          isNum ? "text-right font-mono" : ""
        } ${isDirty ? "bg-amber-50" : ""} ${
          isDeleted ? "line-through text-gray-400" : ""
        } ${!readOnly && !isDeleted ? "cursor-cell" : ""} ${
          isPinned ? "bg-white" : ""
        } ${isFindMatch ? "!bg-yellow-200 ring-2 ring-yellow-400" : ""} ${
          cellValidationErrors.length > 0 ? "!bg-red-50" : ""
        }`}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded outline-none bg-white"
            type={isNum ? "number" : "text"}
          />
        ) : (
          <span
            className={`block truncate max-w-[300px] ${
              isNum && !cfStyle && parseFloat(cellVal) < 0
                ? "text-red-600 dark:text-red-400"
                : ""
            }`}
            title={cellVal}
          >
            {cellVal}
          </span>
        )}
        <ValidationIndicator errors={cellValidationErrors} />
      </td>
    );
  };

  const renderRow = (
    row: Record<string, unknown>,
    originalIndex: number,
    displayNum: number,
  ) => {
    const isAdded = addedRows.has(originalIndex);
    const isDeleted = deletedRows.has(originalIndex);
    const isSelected = selectedRows.has(originalIndex);
    const isFrozen = frozenRowIndices.has(originalIndex);

    return (
      <tr
        key={originalIndex}
        onContextMenu={(e) => {
          e.preventDefault();
          toggleFreezeRow(originalIndex);
        }}
        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          isAdded ? "bg-green-50" : ""
        } ${isDeleted ? "bg-red-50/50" : ""} ${isSelected ? "bg-blue-50/50" : ""} ${
          isFrozen ? "bg-blue-50/30 sticky z-[6]" : ""
        }`}
        style={
          isFrozen
            ? {
                top: `${Array.from(frozenRowIndices).sort().indexOf(originalIndex) * 32 + 36}px`,
              }
            : undefined
        }
      >
        {/* Checkbox */}
        {!readOnly && (
          <td className="px-1 py-1.5 text-center border-r border-gray-100 w-[26px]">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleRowSelect(originalIndex)}
              className="rounded border-gray-300"
            />
          </td>
        )}
        {/* Row number */}
        <td className="px-2 py-1.5 text-xs text-gray-400 border-r border-gray-100 w-[42px]">
          <span className="flex items-center gap-0.5">
            {isFrozen && <Snowflake size={10} className="text-blue-400" />}
            {displayNum}
          </span>
        </td>
        {/* Data cells */}
        {effectiveColumns.map((col) => renderCell(row, originalIndex, col))}
      </tr>
    );
  };

  return (
    <div className="space-y-1">
      {/* Toolbar */}
      <GridToolbar
        columns={initialColumns}
        hiddenColumns={hiddenColumns}
        groupByColumn={groupByColumn}
        selectedCount={selectedRows.size}
        dirtyCount={totalDirtyCount}
        deletedCount={deletedRows.size}
        readOnly={readOnly}
        conditionalFormats={conditionalFormats}
        views={views}
        activeView={activeView}
        onToggleColumn={handleToggleColumn}
        onGroupByChange={handleGroupByChange}
        onDeleteSelected={deleteSelected}
        onAddRow={addRow}
        onSaveChanges={handleSave}
        onDiscardChanges={discard}
        onExport={handleExport}
        onToggleSummary={() => setShowSummary(!showSummary)}
        showSummary={showSummary}
        onAddFormat={handleAddFormat}
        onRemoveFormat={handleRemoveFormat}
        onLoadView={onLoadView || (() => {})}
        onSaveView={onSaveView || (() => {})}
        onSaveViewAs={onSaveViewAs || (() => {})}
        onDeleteView={onDeleteView || (() => {})}
        onClearView={onClearView || (() => {})}
      />

      {/* Pivot / Aggregation / Batch 4 toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setPivotMode(!pivotMode)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
            pivotMode
              ? "bg-purple-50 text-purple-700 border-purple-300"
              : "text-gray-500 bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          Pivot
        </button>
        <button
          onClick={() => setShowAggregationBar(!showAggregationBar)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
            showAggregationBar
              ? "bg-green-50 text-green-700 border-green-300"
              : "text-gray-500 bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          Aggregation
        </button>
        <button
          onClick={() => setShowFindReplace(!showFindReplace)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
            showFindReplace
              ? "bg-amber-50 text-amber-700 border-amber-300"
              : "text-gray-500 bg-white border-gray-200 hover:bg-gray-50"
          }`}
          title="Find & Replace (Ctrl+F)"
        >
          <Search size={12} />
          Find
        </button>
        {!readOnly && (
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border text-gray-500 bg-white border-gray-200 hover:bg-gray-50 transition-colors"
            title="Import CSV/TSV data"
          >
            <Upload size={12} />
            Import
          </button>
        )}
        <button
          onClick={() => setShowHistory(true)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
            changeHistory.length > 0
              ? "bg-blue-50 text-blue-700 border-blue-300"
              : "text-gray-500 bg-white border-gray-200 hover:bg-gray-50"
          }`}
          title="Change History"
        >
          <History size={12} />
          History
          {changeHistory.length > 0 && (
            <span className="ml-0.5 bg-blue-600 text-white text-[9px] px-1 rounded-full">
              {changeHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Pivot config & view */}
      {pivotMode && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <label className="text-gray-500">Row:</label>
            <select
              value={pivotConfig.rowField}
              onChange={(e) =>
                setPivotConfig((p) => ({ ...p, rowField: e.target.value }))
              }
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              {initialColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="text-gray-500">Col:</label>
            <select
              value={pivotConfig.colField}
              onChange={(e) =>
                setPivotConfig((p) => ({ ...p, colField: e.target.value }))
              }
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              {initialColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="text-gray-500">Value:</label>
            <select
              value={pivotConfig.valueField}
              onChange={(e) =>
                setPivotConfig((p) => ({ ...p, valueField: e.target.value }))
              }
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              {initialColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="text-gray-500">Agg:</label>
            <select
              value={pivotConfig.aggregation}
              onChange={(e) =>
                setPivotConfig((p) => ({
                  ...p,
                  aggregation: e.target.value as typeof p.aggregation,
                }))
              }
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>
          <PivotTable
            data={filteredRows}
            rowField={pivotConfig.rowField}
            colField={pivotConfig.colField}
            valueField={pivotConfig.valueField}
            aggregation={pivotConfig.aggregation}
          />
        </div>
      )}

      {/* Info bar */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>
          {totalFilteredRows} of {rows.length} rows
        </span>
        {activeFilterCount > 0 && (
          <span className="text-blue-600">
            {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
          </span>
        )}
        {deletedRows.size > 0 && (
          <span className="text-red-600">
            {deletedRows.size} row{deletedRows.size > 1 ? "s" : ""} marked for
            deletion
          </span>
        )}
        {saving && <span className="text-amber-600">Saving...</span>}
      </div>

      {/* Find & Replace Bar */}
      <FindReplaceBar
        isOpen={showFindReplace}
        onClose={() => setShowFindReplace(false)}
        rows={rows}
        columns={effectiveColumns}
        onReplace={handleFindReplace}
        onReplaceAll={handleFindReplaceAll}
        onHighlightMatch={setFindHighlight}
      />

      {/* Table */}
      <div
        ref={gridContainerRef}
        tabIndex={0}
        className="overflow-auto border border-gray-200 rounded-lg max-h-[65vh] focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50">
              {/* Checkbox header */}
              {!readOnly && (
                <th className="px-1 py-2 text-center border-b border-gray-200 w-[26px]">
                  <input
                    type="checkbox"
                    checked={
                      visibleRows
                        ? visibleRows.length > 0 &&
                          visibleRows.every((r) =>
                            selectedRows.has(r.originalIndex),
                          )
                        : false
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {/* Row number header */}
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200 w-[42px]">
                #
              </th>
              {/* Column headers */}
              {effectiveColumns.map((col) => {
                const isPinned = pinnedColumns.includes(col);
                const width = columnWidths[col];
                const currentSort = sortConfig.find((s) => s.column === col);
                const hasFilter = !!clientFilters[col];

                return (
                  <th
                    key={col}
                    draggable
                    onDragStart={() => handleDragStart(col)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(col);
                    }}
                    onDrop={() => handleDrop(col)}
                    onDragEnd={() => {
                      setDragCol(null);
                      setDragOverCol(null);
                    }}
                    onClick={(e) => handleHeaderClick(col, e)}
                    style={{
                      width: width ? `${width}px` : undefined,
                      minWidth: width ? `${width}px` : "80px",
                      ...(isPinned
                        ? {
                            position: "sticky",
                            left: pinnedOffsets[col] ?? 0,
                            zIndex: 12,
                          }
                        : {}),
                    }}
                    className={`group px-3 py-2 text-left text-xs font-medium text-gray-500 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap select-none relative ${
                      dragOverCol === col && dragCol !== col
                        ? "border-l-2 border-l-blue-500"
                        : ""
                    } ${isPinned ? "bg-gray-50" : ""} ${hasFilter ? "text-blue-600" : ""}`}
                  >
                    <span className="flex items-center">
                      {isPinned && (
                        <span title="Pinned">
                          <Pin size={10} className="mr-1 text-gray-500" />
                        </span>
                      )}
                      {col}
                      {getSortIndicator(col)}
                      {hasFilter && (
                        <Filter size={10} className="ml-1 text-blue-600" />
                      )}
                      <ColumnHeaderMenu
                        column={col}
                        sortConfig={sortConfig}
                        isPinned={isPinned}
                        clientFilter={clientFilters[col]}
                        groupByColumn={groupByColumn}
                        onSort={handleSort}
                        onClearSort={handleClearSort}
                        onPin={handlePin}
                        onUnpin={handleUnpin}
                        onHide={handleToggleColumn}
                        onFilter={handleClientFilter}
                        onGroupBy={handleGroupByChange}
                      />
                    </span>
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => handleResizeStart(col, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Frozen rows rendered at top */}
            {frozenRowIndices.size > 0 &&
              !groups &&
              Array.from(frozenRowIndices)
                .sort()
                .map((frozenIdx) => {
                  if (frozenIdx >= rows.length || deletedRows.has(frozenIdx))
                    return null;
                  return renderRow(rows[frozenIdx], frozenIdx, frozenIdx + 1);
                })}

            {/* Grouped view */}
            {groups
              ? groups.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.groupValue);
                  const groupSummary = computeGroupSummary(
                    group.rows,
                    numericCols,
                  );
                  return (
                    <React.Fragment key={group.groupValue}>
                      {/* Group header row */}
                      <tr
                        onClick={() => toggleGroup(group.groupValue)}
                        className="bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <td
                          colSpan={effectiveColumns.length + (readOnly ? 1 : 2)}
                          className="px-3 py-2 text-xs font-semibold text-gray-700"
                        >
                          <span className="mr-2 inline-flex">
                            {isCollapsed ? (
                              <ChevronRight size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </span>
                          <span className="text-gray-500">
                            {groupByColumn}:
                          </span>{" "}
                          {group.groupValue}
                          <span className="ml-2 text-gray-400">
                            ({group.rows.length} rows)
                          </span>
                          {/* Group summary for numeric cols */}
                          {Object.entries(groupSummary)
                            .slice(0, 3)
                            .map(([col, sum]) => (
                              <span key={col} className="ml-3 text-gray-500">
                                {col}: {sum.toLocaleString()}
                              </span>
                            ))}
                        </td>
                      </tr>
                      {/* Group rows */}
                      {!isCollapsed &&
                        group.rows.map((row, idx) =>
                          renderRow(row, group.originalIndices[idx], idx + 1),
                        )}
                    </React.Fragment>
                  );
                })
              : /* Flat view */
                visibleRows?.map(({ row, originalIndex }, displayIdx) =>
                  renderRow(row, originalIndex, pageRange[0] + displayIdx + 1),
                )}

            {/* Summary row */}
            {summaryRow && (
              <tr className="bg-blue-50 border-t-2 border-blue-200 font-medium sticky bottom-0">
                {!readOnly && <td className="px-1 py-1.5" />}
                <td className="px-2 py-1.5 text-xs text-blue-600">&Sigma;</td>
                {effectiveColumns.map((col) => (
                  <td
                    key={col}
                    className={`px-3 py-1.5 text-blue-700 ${numericCols.has(col) ? "text-right font-mono" : ""}`}
                  >
                    {summaryRow[col]}
                  </td>
                ))}
              </tr>
            )}

            {/* Aggregation bar */}
            {showAggregationBar && (
              <tr className="bg-green-50 border-t-2 border-green-200 sticky bottom-0">
                {!readOnly && <td className="px-1 py-1" />}
                <td className="px-2 py-1 text-[10px] text-green-600 font-semibold">
                  Agg
                </td>
                {effectiveColumns.map((col) => (
                  <td key={col} className="px-1 py-1">
                    {numericCols.has(col) ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={columnAggregations[col] || ""}
                          onChange={(e) => {
                            const val = e.target.value as AggregationType | "";
                            setColumnAggregations((prev) => {
                              const next = { ...prev };
                              if (val) next[col] = val;
                              else delete next[col];
                              emitViewChange({ columnAggregations: next });
                              return next;
                            });
                          }}
                          className="text-[10px] border border-green-200 rounded px-0.5 py-0.5 bg-white"
                        >
                          <option value="">-</option>
                          <option value="sum">Sum</option>
                          <option value="avg">Avg</option>
                          <option value="count">Count</option>
                          <option value="min">Min</option>
                          <option value="max">Max</option>
                        </select>
                        {aggregationValues?.[col] && (
                          <span className="text-[10px] text-green-700 font-mono font-semibold">
                            {aggregationValues[col]}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (only in flat mode) */}
      {!groups && (
        <TablePagination
          totalRows={sortedRows.length}
          pageSize={pageSize}
          onPageChange={(start, end) => setPageRange([start, end])}
          onExport={handleExport}
        />
      )}

      {/* Validation error count */}
      {validationErrors.size > 0 && (
        <div className="text-xs text-red-600 flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
          {validationErrors.size} validation error
          {validationErrors.size > 1 ? "s" : ""}
        </div>
      )}

      {/* Change History Panel */}
      <ChangeHistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={changeHistory}
        onUndo={handleHistoryUndo}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        existingColumns={initialColumns}
        onImport={handleImport}
      />
    </div>
  );
}

// Need React import for Fragment
import React from "react";
