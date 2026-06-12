"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  Suspense,
  lazy,
} from "react";
import type { DrillDownConfig } from "@/types/dashboard";
import type { DetectedColumnMeta } from "./DataChart";
import { TablePagination, exportToCsv } from "./TablePagination";
import { ArrowRight } from "lucide-react";
import type {
  QueryResultData,
  LinkedSelection,
  DiffInfo,
} from "./richContentTypes";

// Lazy-load DataChart (pulls in Recharts ~150KB) — only loaded when chart is rendered
const DataChart = lazy(() =>
  import("./DataChart").then((m) => ({ default: m.DataChart })),
);

/** Format cell values for display — auto-detect ISO dates and convert to human-readable format. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (ISO_DATE_RE.test(str)) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        // If time is exactly midnight (00:00:00), show date only
        const hasTime =
          d.getUTCHours() !== 0 ||
          d.getUTCMinutes() !== 0 ||
          d.getUTCSeconds() !== 0;
        return hasTime ? d.toLocaleString() : d.toLocaleDateString();
      }
    } catch {
      /* fall through */
    }
  }
  return str;
}

function isNumericValue(v: unknown): boolean {
  if (v == null || v === "") return false;
  return !isNaN(Number(v));
}

const MAX_COLUMN_TYPE_SAMPLE = 20;

function isNumericColumn(
  rows: Record<string, unknown>[],
  col: string,
): boolean {
  // Sample up to MAX_COLUMN_TYPE_SAMPLE non-null values to decide
  let count = 0;
  let numericCount = 0;
  for (const row of rows) {
    const v = row[col];
    if (v == null || v === "") continue;
    count++;
    if (isNumericValue(v)) numericCount++;
    if (count >= MAX_COLUMN_TYPE_SAMPLE) break;
  }
  return count > 0 && numericCount / count >= 0.8;
}

export interface QueryResultTableProps {
  result: QueryResultData & {
    chartConfig?: Record<string, unknown>;
    columnConfig?: Record<string, unknown>;
    columnMetadata?: DetectedColumnMeta[];
  };
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
  drillDownConfig?: DrillDownConfig[];
  onDrillDown?: (
    targetQuery: string,
    targetFilter: string,
    column: string,
    value: string,
  ) => void;
  editable?: boolean;
  queryName?: string;
  /** Display mode: auto (both), table only, or chart only */
  displayMode?: "auto" | "table" | "chart";
  /** When auto mode, use compact tab toggle instead of stacking both */
  compactAuto?: boolean;
  /** Diff info from previous query run — highlights changes in table */
  diffInfo?: DiffInfo;
  savedChartType?: string;
  onChartTypeChange?: (type: string) => void;
}

export function QueryResultTable({
  result,
  cardId,
  linkedSelection,
  onCellClick,
  drillDownConfig,
  onDrillDown,
  editable = false,
  queryName,
  displayMode,
  compactAuto = true,
  diffInfo,
  savedChartType,
  onChartTypeChange,
}: QueryResultTableProps) {
  const [pageRange, setPageRange] = useState({ start: 0, end: 10 });
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showSummary, setShowSummary] = useState(false);
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dirtyMap, setDirtyMap] = useState<
    Map<number, Map<string, { oldValue: string; newValue: string }>>
  >(new Map());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  // Auto mode: tab toggle between table and chart (defaults to table)
  const [autoTab, setAutoTab] = useState<"table" | "chart">("table");
  const rows = result.data || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Detect numeric columns once
  const numericCols = useMemo(() => {
    const set = new Set<string>();
    for (const col of columns) {
      if (isNumericColumn(rows, col)) set.add(col);
    }
    return set;
  }, [rows, columns]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const isNum = numericCols.has(sortCol);
    const sorted = [...rows].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (isNum) return Number(va) - Number(vb);
      return String(va).localeCompare(String(vb));
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [rows, sortCol, sortDir, numericCols]);

  const pagedData = sortedRows.slice(pageRange.start, pageRange.end);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPageRange({ start: 0, end: 10 });
  };

  // Compute summary stats
  const summaryStats = useMemo(() => {
    if (!showSummary || rows.length === 0) return null;
    const stats: Record<
      string,
      { sum?: number; avg?: number; distinct?: number }
    > = {};
    for (const col of columns) {
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
        stats[col] = {
          sum: Math.round(sum * 100) / 100,
          avg: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
        };
      } else {
        const unique = new Set(rows.map((r) => String(r[col] ?? "")));
        stats[col] = { distinct: unique.size };
      }
    }
    return stats;
  }, [showSummary, rows, columns, numericCols]);

  // Build a set of drill-down-able columns for quick lookup
  const drillDownMap = new Map<string, DrillDownConfig>();
  if (drillDownConfig) {
    for (const dd of drillDownConfig) {
      drillDownMap.set(dd.sourceColumn, dd);
    }
  }

  // Determine if this card should highlight rows (linked selection from another card)
  const highlightValue = linkedSelection?.value;
  const isSourceCard = linkedSelection?.sourceCardId === cardId;
  const shouldHighlight = !!highlightValue && !isSourceCard && !!cardId;

  const isRowHighlighted = (row: Record<string, unknown>) => {
    if (!shouldHighlight) return false;
    return Object.values(row).some((v) => String(v) === highlightValue);
  };

  // ── Inline Editing ──
  // Focus input when editing
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  const startCellEdit = useCallback(
    (rowIdx: number, col: string) => {
      if (!editable) return;
      setEditingCell({ row: rowIdx, col });
      setEditValue(String(rows[rowIdx]?.[col] ?? ""));
    },
    [editable, rows],
  );

  const commitCellEdit = useCallback(() => {
    if (!editingCell) return;
    const { row: rowIdx, col } = editingCell;
    const oldVal = String(rows[rowIdx]?.[col] ?? "");
    if (oldVal !== editValue) {
      setDirtyMap((prev) => {
        const next = new Map(prev);
        const rowDirty = new Map(next.get(rowIdx) || new Map());
        const existing = rowDirty.get(col);
        const origOld = existing ? existing.oldValue : oldVal;
        if (origOld === editValue) {
          rowDirty.delete(col);
          if (rowDirty.size === 0) next.delete(rowIdx);
          else next.set(rowIdx, rowDirty);
        } else {
          rowDirty.set(col, { oldValue: origOld, newValue: editValue });
          next.set(rowIdx, rowDirty);
        }
        return next;
      });
    }
    setEditingCell(null);
  }, [editingCell, editValue, rows]);

  const totalDirtyCount = useMemo(() => {
    let c = 0;
    dirtyMap.forEach((m) => (c += m.size));
    return c;
  }, [dirtyMap]);

  const handleInlineSave = useCallback(async () => {
    if (!queryName) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const changes: {
        primaryKey: Record<string, unknown>;
        updates: Record<string, string>;
      }[] = [];
      dirtyMap.forEach((colMap, rowIdx) => {
        const updates: Record<string, string> = {};
        colMap.forEach((change, colName) => {
          updates[colName] = change.newValue;
        });
        changes.push({ primaryKey: rows[rowIdx] || {}, updates });
      });
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryName, groupId: "default", changes }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = await res.json();
      setSaveMsg(json.message || `Saved ${changes.length} change(s)`);
      setDirtyMap(new Map());
    } catch (err) {
      setSaveMsg(
        `Error: ${err instanceof Error ? err.message : "Save failed"}`,
      );
    } finally {
      setSaving(false);
    }
  }, [dirtyMap, queryName, rows]);

  return (
    <div className="mt-1 text-xs">
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <span>
          {result.rowCount} rows in {result.executionTime}ms
        </span>
        {editable && totalDirtyCount > 0 && (
          <button
            onClick={handleInlineSave}
            disabled={saving}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--brand)] text-white hover:bg-[var(--brand)] disabled:opacity-50 transition-colors"
          >
            {saving
              ? "Saving..."
              : `Save ${totalDirtyCount} change${totalDirtyCount !== 1 ? "s" : ""}`}
          </button>
        )}
        {saveMsg && (
          <span
            className={`text-[10px] ${saveMsg.startsWith("Error") ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
          >
            {saveMsg}
          </span>
        )}
        {rows.length > 0 && (
          <button
            onClick={() => setShowSummary((s) => !s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
              showSummary
                ? "bg-[var(--brand-subtle)] text-[var(--brand)]"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
            title={
              showSummary
                ? "Hide summary row"
                : "Show summary row (totals, averages)"
            }
          >
            &Sigma;
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <>
          {/* Auto mode: compact tab toggle (only when compactAuto is enabled) */}
          {displayMode === "auto" && compactAuto && (
            <div className="flex items-center gap-0.5 mt-1 mb-1">
              <button
                onClick={() => setAutoTab("table")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-l-md border transition-colors ${
                  autoTab === "table"
                    ? "bg-[var(--brand-subtle)] text-[var(--brand)] border-[var(--brand)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setAutoTab("chart")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-r-md border border-l-0 transition-colors ${
                  autoTab === "chart"
                    ? "bg-[var(--brand-subtle)] text-[var(--brand)] border-[var(--brand)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                Chart
              </button>
            </div>
          )}
          {(displayMode === "auto"
            ? compactAuto
              ? autoTab === "table"
              : true
            : displayMode !== "chart") && (
            <>
              <div className="mt-1 overflow-x-auto">
                <table className="min-w-full text-xs border border-[var(--border)] rounded">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      {columns.map((key) => {
                        const hasDrillDown = drillDownMap.has(key);
                        const isSorted = sortCol === key;
                        return (
                          <th
                            key={key}
                            className={`px-2 py-1 text-left font-medium border-b cursor-pointer select-none hover:bg-[var(--bg-secondary)] ${
                              hasDrillDown
                                ? "text-[var(--brand)]"
                                : "text-[var(--text-secondary)]"
                            }`}
                            title={
                              hasDrillDown
                                ? `Drill down: ${drillDownMap.get(key)!.label || drillDownMap.get(key)!.targetQuery}`
                                : "Click to sort"
                            }
                            onClick={() => handleSort(key)}
                          >
                            <span className="inline-flex items-center gap-0.5">
                              {key}
                              {hasDrillDown && (
                                <ArrowRight className="w-3 h-3 text-[var(--brand)]" />
                              )}
                              {isSorted && (
                                <span className="text-[var(--brand)] text-[9px] ml-0.5">
                                  {sortDir === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedData.map((row, i) => {
                      const highlighted = isRowHighlighted(row);
                      const actualRowIdx = pageRange.start + i;
                      const isAddedRow =
                        diffInfo?.addedIndices.has(actualRowIdx);
                      const isChangedRow =
                        diffInfo?.changedIndices.has(actualRowIdx);
                      const rowChangedCells =
                        diffInfo?.changedCells.get(actualRowIdx);
                      const diffRowClass = isAddedRow
                        ? "bg-[var(--success-subtle)]"
                        : isChangedRow
                          ? "bg-[var(--warning-subtle)]/50"
                          : "";
                      return (
                        <tr
                          key={i}
                          className={`border-b border-[var(--border)] ${highlighted ? "bg-[var(--warning-subtle)]" : diffRowClass}`}
                        >
                          {Object.entries(row).map(([key, val], j) => {
                            const dd = drillDownMap.get(key);
                            const hasDrillDown = !!dd && !!onDrillDown;
                            const hasEventClick = onCellClick && cardId;
                            const cellPrevValue = rowChangedCells?.get(key);
                            const isEditingThis =
                              editingCell?.row === actualRowIdx &&
                              editingCell?.col === key;
                            const cellDirty = dirtyMap
                              .get(actualRowIdx)
                              ?.has(key);
                            const displayVal = cellDirty
                              ? dirtyMap.get(actualRowIdx)!.get(key)!.newValue
                              : val;
                            const numVal =
                              typeof displayVal === "number"
                                ? displayVal
                                : parseFloat(String(displayVal ?? ""));
                            const isNumeric =
                              typeof displayVal === "number" ||
                              (!isNaN(numVal) &&
                                String(displayVal ?? "").trim() !== "");
                            const numColor =
                              !hasDrillDown && isNumeric && numVal < 0
                                ? "text-[var(--danger)] dark:text-[var(--danger)]"
                                : "";
                            return (
                              <td
                                key={j}
                                className={`px-2 py-1 ${
                                  hasDrillDown
                                    ? "text-[var(--brand)] underline decoration-dotted cursor-pointer hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)]"
                                    : hasEventClick
                                      ? "cursor-pointer hover:bg-[var(--brand-subtle)]"
                                      : editable
                                        ? "cursor-cell"
                                        : ""
                                } ${numColor} ${highlighted && String(val) === highlightValue ? "bg-[var(--warning-subtle)] font-semibold" : ""} ${cellDirty ? "bg-[var(--warning-subtle)]" : ""} ${cellPrevValue !== undefined ? "bg-[var(--warning-subtle)] ring-1 ring-inset ring-[var(--warning)]" : ""} ${isAddedRow ? "bg-[var(--success-subtle)]" : ""}`}
                                onClick={() => {
                                  if (hasDrillDown) {
                                    onDrillDown!(
                                      dd!.targetQuery,
                                      dd!.targetFilter,
                                      key,
                                      String(val),
                                    );
                                  } else if (hasEventClick) {
                                    onCellClick!(key, val);
                                  }
                                }}
                                onDoubleClick={() =>
                                  startCellEdit(actualRowIdx, key)
                                }
                                title={
                                  cellPrevValue !== undefined
                                    ? `Previous: ${String(cellPrevValue ?? "(empty)")}`
                                    : hasDrillDown
                                      ? `Drill down: ${dd!.label || dd!.targetQuery}`
                                      : isAddedRow
                                        ? "New row"
                                        : editable
                                          ? "Double-click to edit"
                                          : undefined
                                }
                              >
                                {isEditingThis ? (
                                  <input
                                    ref={editInputRef}
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(e.target.value)
                                    }
                                    onBlur={commitCellEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitCellEdit();
                                      else if (e.key === "Escape")
                                        setEditingCell(null);
                                    }}
                                    className="w-full px-1 py-0 text-xs border border-[var(--brand)] rounded outline-none bg-[var(--bg-primary)]"
                                  />
                                ) : (
                                  formatCellValue(displayVal)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  {showSummary && summaryStats && (
                    <tfoot>
                      <tr className="bg-[var(--bg-secondary)] border-t-2 border-[var(--border)]">
                        {columns.map((col) => {
                          const s = summaryStats[col];
                          if (!s)
                            return <td key={col} className="px-2 py-1.5" />;
                          if (s.sum !== undefined) {
                            return (
                              <td
                                key={col}
                                className="px-2 py-1.5 font-semibold text-[var(--text-primary)]"
                              >
                                <div className="leading-tight">
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    Sum{" "}
                                  </span>
                                  <span>{s.sum.toLocaleString()}</span>
                                </div>
                                <div className="leading-tight">
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    Avg{" "}
                                  </span>
                                  <span>{s.avg!.toLocaleString()}</span>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td
                              key={col}
                              className="px-2 py-1.5 text-[var(--text-secondary)] italic"
                            >
                              {s.distinct} unique
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {rows.length > 10 && (
                <TablePagination
                  totalRows={rows.length}
                  onPageChange={(start, end) => setPageRange({ start, end })}
                  onExport={() =>
                    exportToCsv(
                      rows as Record<string, unknown>[],
                      "query-results.csv",
                    )
                  }
                />
              )}
            </>
          )}
          {(displayMode === "auto"
            ? compactAuto
              ? autoTab === "chart"
              : true
            : displayMode !== "table") && (
            <Suspense
              fallback={
                <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
                  Loading chart…
                </div>
              }
            >
              <DataChart
                data={rows}
                chartConfig={result.chartConfig}
                columnConfig={result.columnConfig}
                columnMetadata={result.columnMetadata}
                savedChartType={savedChartType}
                onChartTypeChange={onChartTypeChange}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}
