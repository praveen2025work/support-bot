export interface DataSource {
  name: string;
  description: string;
  type: string;
  filePath?: string;
  filters?: string[];
  columnConfig?: Record<string, unknown>;
}

export interface ColumnSchema {
  name: string;
  type: "numeric" | "string" | "date" | "id" | "integer" | "decimal";
}

export interface DataQueryRequest {
  queryName: string;
  groupId?: string;
  filters?: Record<string, string | string[]>;
  groupBy?: string | string[];
  sort?: { column: string; direction: "asc" | "desc" };
  aggregation?: string;
  columns?: string[];
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface DataQueryResponse {
  headers: string[];
  rows: Record<string, string | number>[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  schema: ColumnSchema[];
  groupByResult?: unknown;
  aggregation?: unknown;
  durationMs: number;
}

export interface SchemaResponse {
  queryName: string;
  rowCount: number;
  columnCount: number;
  schema: Array<{
    name: string;
    type: string;
    distinctCount: number;
    nullCount: number;
    sampleValues: Array<{ value: string; count: number }>;
  }>;
}

export interface DataViewPlugin {
  id: string;
  label: string;
  icon: string;
  isApplicable: (schema: ColumnSchema[]) => boolean;
  component: React.ComponentType<{
    data: Record<string, string | number>[];
    schema: ColumnSchema[];
    allData?: Record<string, string | number>[];
  }>;
}

/* ─── Dashboard Builder Types ──────────────────────────────────── */

export type DataCardType = "kpi" | "chart" | "table" | "lineage" | "summary";

export interface DataCard {
  id: string;
  type: DataCardType;
  label: string;
  source?: string; // override global source
  kpiConfig?: {
    column: string;
    operation: "avg" | "sum" | "count" | "min" | "max";
    color?: string;
    thresholds?: { warning: number; danger: number };
  };
  chartConfig?: {
    chartType?: string;
    labelColumn?: string;
    valueColumns?: string[];
    groupBy?: string;
  };
  tableConfig?: {
    columns?: string[];
    pageSize?: number;
    defaultSort?: { column: string; direction: "asc" | "desc" };
  };
  lineageConfig?: {
    selectedPnl?: string;
    compact?: boolean;
  };
  summaryConfig?: {
    columns?: string[];
    showMinMax?: boolean;
  };
  filters?: Record<string, string>;
  groupBy?: string;
}

export interface CardLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DataDashboardConfig {
  id: string;
  name: string;
  source: string;
  groupId: string;
  cards: DataCard[];
  layouts: CardLayout[];
  globalFilters: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  /** Layout version — bumped when layout generation changes to invalidate stale caches */
  layoutVersion?: number;
}
