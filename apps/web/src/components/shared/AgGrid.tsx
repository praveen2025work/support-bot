"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type GridReadyEvent,
  type GridApi,
  type ColDef,
} from "ag-grid-community";
import { useTheme } from "@/contexts/ThemeContext";

// Register all Community modules once
ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid v35+ Theming API — no CSS imports needed
const agThemeLight = themeQuartz;
const agThemeDark = themeQuartz.withParams({
  backgroundColor: "#0b1020",
  foregroundColor: "#e6e8ee",
  headerBackgroundColor: "#131a2e",
  headerTextColor: "#e6e8ee",
  borderColor: "#232b48",
  rowHoverColor: "#1d2540",
  selectedRowBackgroundColor: "rgba(129, 140, 248, 0.22)",
  chromeBackgroundColor: "#161d33",
});

// ── Project defaults ────────────────────────────────────────────────

const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  minWidth: 80,
  flex: 1,
};

// ── Props ───────────────────────────────────────────────────────────

export interface AgGridWrapperProps<
  TData = Record<string, unknown>,
> extends Omit<AgGridReactProps<TData>, "className"> {
  /** Height of the grid container. Defaults to 100%. */
  height?: string | number;
  /** If true, use compact row height (28px) for chat/dashboard. Default: false (42px). */
  compact?: boolean;
  /** If true, auto-size columns to fit on first data render. Default: true. */
  autoSizeOnFirstData?: boolean;
  /** Extra className on the outer div. */
  className?: string;
  /** Extra style on the outer div. */
  style?: CSSProperties;
}

// ── Component ───────────────────────────────────────────────────────

export function AgGrid<TData = Record<string, unknown>>({
  height = "100%",
  compact = false,
  autoSizeOnFirstData = true,
  className = "",
  style,
  defaultColDef,
  onGridReady,
  onFirstDataRendered,
  pagination = true,
  paginationPageSize = 25,
  paginationPageSizeSelector = [10, 25, 50, 100],
  rowHeight,
  headerHeight,
  ...rest
}: AgGridWrapperProps<TData>) {
  const gridRef = useRef<AgGridReact<TData>>(null);
  const { isDark } = useTheme();

  const mergedColDef: ColDef = {
    ...DEFAULT_COL_DEF,
    ...defaultColDef,
  };

  const handleGridReady = useCallback(
    (event: GridReadyEvent<TData>) => {
      onGridReady?.(event);
    },
    [onGridReady],
  );

  const handleFirstDataRendered = useCallback(
    (params: { api: GridApi<TData> }) => {
      if (autoSizeOnFirstData) {
        params.api.autoSizeAllColumns();
      }
      onFirstDataRendered?.(params as never);
    },
    [autoSizeOnFirstData, onFirstDataRendered],
  );

  const effectiveRowHeight = rowHeight ?? (compact ? 28 : 42);
  const effectiveHeaderHeight = headerHeight ?? (compact ? 32 : 40);

  return (
    <div
      className={`mitr-ag-grid ${className}`.trim()}
      style={{ height, width: "100%", ...style }}
    >
      <AgGridReact<TData>
        ref={gridRef}
        theme={isDark ? agThemeDark : agThemeLight}
        defaultColDef={mergedColDef}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        paginationPageSizeSelector={paginationPageSizeSelector}
        rowHeight={effectiveRowHeight}
        headerHeight={effectiveHeaderHeight}
        animateRows={false}
        suppressMovableColumns={false}
        onGridReady={handleGridReady}
        onFirstDataRendered={handleFirstDataRendered}
        {...rest}
      />
    </div>
  );
}

// Re-export types for convenience
export type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
export type {
  CellClickedEvent,
  CellValueChangedEvent,
  CellClassParams,
  RowClassParams,
  ValueGetterParams,
  ICellRendererParams,
} from "ag-grid-community";
export { AgGridReact } from "ag-grid-react";
