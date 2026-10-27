"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CollectionView, SortDescription, setLicenseKey } from "@mescius/wijmo";
import {
  AllowDragging,
  AllowSorting,
  CellType,
  HeadersVisibility,
  SelectionMode,
  type CellRangeEventArgs,
  type FlexGrid as FlexGridControl,
  type FormatItemEventArgs,
} from "@mescius/wijmo.grid";
import {
  FlexGrid,
  FlexGridCellTemplate,
  FlexGridColumn,
} from "@mescius/wijmo.react.grid";
import { FlexGridFilter } from "@mescius/wijmo.react.grid.filter";
import { ChevronLeft, ChevronRight } from "lucide-react";

type GridRow = Record<string, unknown> & { __rowIndex?: number };

const wijmoLicenseKey = process.env.NEXT_PUBLIC_WIJMO_LICENSE_KEY;
if (wijmoLicenseKey) {
  setLicenseKey(wijmoLicenseKey);
}

export interface WijmoCellClassParams {
  value: unknown;
  data?: GridRow;
  colDef: WijmoColDef;
}

export interface WijmoColDef {
  field?: string;
  headerName?: string;
  editable?: boolean;
  pinned?: "left" | "right";
  type?: string;
  width?: number;
  flex?: number;
  minWidth?: number;
  sortable?: boolean;
  resizable?: boolean;
  filter?: boolean;
  cellClass?: string;
  headerClass?: string;
  cellClassRules?: Record<string, (params: WijmoCellClassParams) => boolean>;
  cellStyle?:
    | CSSProperties
    | ((params: WijmoCellClassParams) => CSSProperties | null);
  valueFormatter?: (params: { value: unknown; data?: GridRow }) => string;
  cellRenderer?: (params: { value: unknown; data?: GridRow }) => ReactNode;
}

export interface WijmoCellValueChangedEvent {
  data?: GridRow;
  colDef: WijmoColDef;
  oldValue: unknown;
  newValue: unknown;
}

export interface WijmoColumnState {
  colId: string;
  sort?: "asc" | "desc" | null;
}

export interface WijmoGridApi {
  exportDataAsCsv: (options?: { fileName?: string }) => void;
  getSelectedRows: () => GridRow[];
  getColumnState: () => WijmoColumnState[];
  applyColumnState: (options: { state: WijmoColumnState[] }) => void;
  autoSizeAllColumns: () => void;
  selectCell: (rowIndex: number, colId: string) => void;
}

interface WijmoGridProps {
  rowData: GridRow[];
  columnDefs: WijmoColDef[];
  pinnedTopRowData?: GridRow[];
  pinnedBottomRowData?: GridRow[];
  compact?: boolean;
  pagination?: boolean;
  paginationPageSize?: number;
  height?: string | number;
  rowHeight?: number;
  headerHeight?: number;
  className?: string;
  readOnly?: boolean;
  defaultColDef?: Partial<WijmoColDef>;
  autoSizeStrategy?: unknown;
  domLayout?: string;
  getRowId?: (params: { data: GridRow }) => string;
  rowSelection?: string;
  singleClickEdit?: boolean;
  stopEditingWhenCellsLoseFocus?: boolean;
  onGridReady?: (params: { api: WijmoGridApi }) => void;
  onCellValueChanged?: (event: WijmoCellValueChangedEvent) => void;
  onSelectionChanged?: () => void;
  onColumnResized?: (event: {
    finished: boolean;
    column?: { getColId: () => string; getActualWidth: () => number };
  }) => void;
  onSortChanged?: () => void;
  onColumnMoved?: () => void;
}

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(
  rows: GridRow[],
  columns: WijmoColDef[],
  fileName = "export.csv",
) {
  const fields = columns.map((c) => c.field).filter(Boolean) as string[];
  const lines = [
    fields.map(csvEscape).join(","),
    ...rows.map((row) =>
      fields.map((field) => csvEscape(row[field])).join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function getCellParams(
  colDef: WijmoColDef,
  row: GridRow | undefined,
): WijmoCellClassParams {
  const field = colDef.field ?? "";
  return {
    value: row?.[field],
    data: row,
    colDef,
  };
}

function formatCellValue(colDef: WijmoColDef, row: GridRow | undefined) {
  const value = row?.[colDef.field ?? ""];
  if (colDef.valueFormatter) return colDef.valueFormatter({ value, data: row });
  return value == null ? "" : String(value);
}

export function WijmoGrid({
  rowData,
  columnDefs,
  pinnedTopRowData,
  pinnedBottomRowData,
  compact = false,
  pagination = true,
  paginationPageSize = 25,
  height = "100%",
  rowHeight,
  headerHeight,
  className = "",
  readOnly = false,
  defaultColDef,
  onGridReady,
  onCellValueChanged,
  onSelectionChanged,
  onColumnResized,
  onSortChanged,
  onColumnMoved,
}: WijmoGridProps) {
  const gridRef = useRef<FlexGridControl | null>(null);
  const editRef = useRef<{
    row?: GridRow;
    colDef?: WijmoColDef;
    oldValue?: unknown;
  }>({});
  const [pageTick, setPageTick] = useState(0);

  const mergedColumns = useMemo(() => {
    const merged = columnDefs.map((c) => ({ ...defaultColDef, ...c }));
    const pinned = merged.filter((c) => c.pinned === "left");
    const normal = merged.filter((c) => c.pinned !== "left");
    return [...pinned, ...normal];
  }, [columnDefs, defaultColDef]);

  const collectionView = useMemo(() => {
    const view = new CollectionView(rowData, {
      pageSize: pagination ? paginationPageSize : 0,
      refreshOnEdit: false,
    });
    view.collectionChanged.addHandler(() => setPageTick((n) => n + 1));
    view.currentChanged.addHandler(() => setPageTick((n) => n + 1));
    return view;
  }, [rowData, pagination, paginationPageSize]);

  // 33px rows and header: the STEPS v3 grid (styles/ofx/onefinux-wijmo.css), shared with One Finance.
  const effectiveRowHeight = rowHeight ?? (compact ? 28 : 33);
  const effectiveHeaderHeight = headerHeight ?? 33;
  const frozenColumns = mergedColumns.filter((c) => c.pinned === "left").length;

  const makeApi = useCallback(
    (grid: FlexGridControl): WijmoGridApi => ({
      exportDataAsCsv: (options) =>
        downloadCsv(
          collectionView.items as GridRow[],
          mergedColumns,
          options?.fileName,
        ),
      getSelectedRows: () => grid.selectedItems as GridRow[],
      getColumnState: () =>
        grid.columns.map((col) => {
          const binding = col.binding ?? "";
          const sort = collectionView.sortDescriptions.find(
            (sd) => sd.property === binding,
          );
          return {
            colId: binding,
            sort: sort ? (sort.ascending ? "asc" : "desc") : null,
          };
        }),
      applyColumnState: ({ state }) => {
        collectionView.deferUpdate(() => {
          collectionView.sortDescriptions.clear();
          state.forEach((s) => {
            if (!s.sort) return;
            collectionView.sortDescriptions.push(
              new SortDescription(s.colId, s.sort === "asc"),
            );
          });
        });
      },
      autoSizeAllColumns: () => grid.autoSizeColumns(),
      selectCell: (rowIndex, colId) => {
        let targetRow = -1;
        for (let index = 0; index < grid.rows.length; index += 1) {
          const item = grid.rows[index]?.dataItem as GridRow | undefined;
          if ((item?.__rowIndex ?? index) === rowIndex) {
            targetRow = index;
            break;
          }
        }

        let targetCol = -1;
        for (let index = 0; index < grid.columns.length; index += 1) {
          if (grid.columns[index]?.binding === colId) {
            targetCol = index;
            break;
          }
        }

        if (targetRow < 0 || targetCol < 0) return;
        grid.scrollIntoView(targetRow, targetCol);
        grid.invalidate();
        grid.focus();
      },
    }),
    [collectionView, mergedColumns],
  );

  const handleInitialized = useCallback(
    (grid: FlexGridControl) => {
      gridRef.current = grid;
      grid.rows.defaultSize = effectiveRowHeight;
      grid.columnHeaders.rows.defaultSize = effectiveHeaderHeight;
      onGridReady?.({ api: makeApi(grid) });
    },
    [effectiveHeaderHeight, effectiveRowHeight, makeApi, onGridReady],
  );

  const formatItem = useCallback(
    (grid: FlexGridControl, event: FormatItemEventArgs) => {
      if (event.panel.cellType !== CellType.Cell) return;
      const row = event.panel.rows[event.row]?.dataItem as GridRow | undefined;
      const colDef = mergedColumns[event.col];
      if (!colDef || !row) return;

      const params = getCellParams(colDef, row);
      event.cell.classList.toggle(
        "wj-cell-right",
        colDef.type === "numericColumn",
      );
      if (colDef.cellClass) {
        colDef.cellClass
          .split(/\s+/)
          .filter(Boolean)
          .forEach((cls) => event.cell.classList.add(cls));
      }
      Object.entries(colDef.cellClassRules ?? {}).forEach(
        ([className, test]) => {
          const applies = test(params);
          className
            .split(/\s+/)
            .filter(Boolean)
            .forEach((cls) => event.cell.classList.toggle(cls, applies));
        },
      );
      const style =
        typeof colDef.cellStyle === "function"
          ? colDef.cellStyle(params)
          : colDef.cellStyle;
      if (style) Object.assign(event.cell.style, style);
    },
    [mergedColumns],
  );

  const handleBeginningEdit = useCallback(
    (grid: FlexGridControl, event: CellRangeEventArgs) => {
      const row = grid.rows[event.row]?.dataItem as GridRow | undefined;
      const colDef = mergedColumns[event.col];
      if (!row || !colDef?.field || colDef.editable === false || readOnly) {
        event.cancel = true;
        return;
      }
      editRef.current = {
        row,
        colDef,
        oldValue: row[colDef.field],
      };
    },
    [mergedColumns, readOnly],
  );

  const handleCellEditEnded = useCallback(
    (grid: FlexGridControl, event: CellRangeEventArgs) => {
      const row = grid.rows[event.row]?.dataItem as GridRow | undefined;
      const colDef = mergedColumns[event.col];
      if (!row || !colDef?.field) return;
      const oldValue = editRef.current.oldValue;
      const newValue = row[colDef.field];
      onCellValueChanged?.({
        data: row,
        colDef,
        oldValue,
        newValue,
      });
      editRef.current = {};
    },
    [mergedColumns, onCellValueChanged],
  );

  useEffect(() => {
    gridRef.current?.invalidate();
  }, [formatItem]);

  const renderGrid = (
    data: CollectionView | GridRow[],
    options: {
      key: string;
      showHeaders?: boolean;
      isReadOnly?: boolean;
      className?: string;
      height?: number | string;
      showFilter?: boolean;
      allowSelection?: boolean;
    },
  ) => (
    <FlexGrid
      key={options.key}
      className={options.className}
      style={{ height: options.height ?? "100%" }}
      itemsSource={data}
      autoGenerateColumns={false}
      allowDragging={AllowDragging.Columns}
      allowResizing="Columns"
      allowSorting={AllowSorting.MultiColumn}
      alternatingRowStep={0}
      frozenColumns={frozenColumns}
      headersVisibility={
        options.showHeaders === false
          ? HeadersVisibility.None
          : HeadersVisibility.Column
      }
      isReadOnly={options.isReadOnly ?? readOnly}
      selectionMode={
        options.allowSelection === false
          ? SelectionMode.None
          : SelectionMode.ListBox
      }
      initialized={options.key === "main" ? handleInitialized : undefined}
      formatItem={formatItem}
      beginningEdit={options.key === "main" ? handleBeginningEdit : undefined}
      cellEditEnded={options.key === "main" ? handleCellEditEnded : undefined}
      selectionChanged={
        options.key === "main" && onSelectionChanged
          ? () => onSelectionChanged()
          : undefined
      }
      resizedColumn={
        options.key === "main" && onColumnResized
          ? (grid, event) => {
              const column = grid.columns[event.col];
              onColumnResized({
                finished: true,
                column: column
                  ? {
                      getColId: () => column.binding ?? "",
                      getActualWidth: () =>
                        Number(column.renderWidth ?? column.width ?? 0),
                    }
                  : undefined,
              });
            }
          : undefined
      }
      sortedColumn={options.key === "main" ? onSortChanged : undefined}
      draggedColumn={options.key === "main" ? onColumnMoved : undefined}
    >
      {mergedColumns.map((col) => (
        <FlexGridColumn
          key={col.field}
          binding={col.field}
          header={col.headerName ?? col.field}
          isReadOnly={readOnly || col.editable === false}
          width={col.width ?? "*"}
          minWidth={col.minWidth}
          align={col.type === "numericColumn" ? "right" : undefined}
          cssClass={col.cellClass}
          cssClassAll={col.headerClass}
        >
          {(col.cellRenderer || col.valueFormatter) && (
            <FlexGridCellTemplate
              cellType="Cell"
              template={(context) => {
                const item = context.item as GridRow | undefined;
                if (col.cellRenderer) {
                  return col.cellRenderer({
                    value: item?.[col.field ?? ""],
                    data: item,
                  });
                }
                return <span>{formatCellValue(col, item)}</span>;
              }}
            />
          )}
        </FlexGridColumn>
      ))}
      {options.showFilter !== false && <FlexGridFilter />}
    </FlexGrid>
  );

  const pageCount = collectionView.pageCount || 1;
  const pageIndex = collectionView.pageIndex || 0;
  const totalRows = rowData.length;
  const pageStart = totalRows === 0 ? 0 : pageIndex * paginationPageSize + 1;
  const pageEnd = Math.min(totalRows, (pageIndex + 1) * paginationPageSize);

  return (
    <div
      className={`mitr-wijmo-grid ${className}`.trim()}
      style={{ height, width: "100%" }}
    >
      {pinnedTopRowData?.length
        ? renderGrid(pinnedTopRowData, {
            key: "pinned-top",
            showHeaders: false,
            isReadOnly: true,
            showFilter: false,
            allowSelection: false,
            className: "mitr-wijmo-pinned mitr-wijmo-pinned-top",
            height: Math.max(
              effectiveRowHeight + 2,
              pinnedTopRowData.length * effectiveRowHeight + 2,
            ),
          })
        : null}
      <div className="mitr-wijmo-main">
        {renderGrid(collectionView, {
          key: "main",
          height: "100%",
        })}
      </div>
      {pinnedBottomRowData?.length
        ? renderGrid(pinnedBottomRowData, {
            key: "pinned-bottom",
            showHeaders: false,
            isReadOnly: true,
            showFilter: false,
            allowSelection: false,
            className: "mitr-wijmo-pinned mitr-wijmo-pinned-bottom",
            height: Math.max(
              effectiveRowHeight + 2,
              pinnedBottomRowData.length * effectiveRowHeight + 2,
            ),
          })
        : null}
      {pagination && (
        <div className="mitr-wijmo-pager">
          <span>
            {pageStart} to {pageEnd} of {totalRows}. Page {pageIndex + 1} of{" "}
            {pageCount}
          </span>
          <div className="mitr-wijmo-pager-actions">
            <button
              type="button"
              disabled={pageIndex <= 0}
              onClick={() => {
                collectionView.moveToPreviousPage();
                setPageTick(pageTick + 1);
              }}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => {
                collectionView.moveToNextPage();
                setPageTick(pageTick + 1);
              }}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
