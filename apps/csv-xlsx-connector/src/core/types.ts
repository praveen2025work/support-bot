export type FileConnectorType = "csv" | "xlsx";

export interface FileConnectorConfig {
  id: string;
  name: string;
  type: FileConnectorType;
  filePath: string;
  fileBaseDir?: string;
  sheetName?: string;
  source: string; // group: "default", "finance", etc.
  description: string;
  columnConfig?: {
    idColumns?: string[];
    dateColumns?: string[];
    labelColumns?: string[];
    valueColumns?: string[];
    ignoreColumns?: string[];
  };
  maxRows?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileConnectionStatus {
  connectorId: string;
  connected: boolean;
  rowCount?: number;
  columnCount?: number;
  fileSize?: number;
  lastModified?: string;
  error?: string;
  lastChecked: string;
}

export interface FileColumnInfo {
  name: string;
  dataType: "string" | "number" | "date";
  nullable: boolean;
  distinctCount: number;
  nullCount: number;
  sampleValues: string[];
}

export interface FileTableInfo {
  name: string;
  type: "file";
  rowCount?: number;
  filePath: string;
  fileType: FileConnectorType;
}

export interface FileQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionMs: number;
  truncated?: boolean;
  totalRowsBeforeTruncation?: number;
  columnCount?: number;
}

export interface FilterCondition {
  column: string;
  operator:
    | "eq"
    | "neq"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "between"
    | "in"
    | "is_null"
    | "is_not_null";
  value: string | number | string[];
  logic?: "and" | "or";
}

export interface Aggregation {
  column: string;
  operation: "sum" | "avg" | "count" | "min" | "max";
}

export interface QueryPipeline {
  select?: string[];
  where?: FilterCondition[];
  groupBy?: {
    columns: string[];
    aggregations: Aggregation[];
  };
  having?: FilterCondition[];
  orderBy?: Array<{ column: string; dir: "asc" | "desc" }>;
  limit?: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  connectorId: string;
  pipeline?: QueryPipeline;
  filters?: Array<{
    key: string;
    binding: "body" | "query_param" | "column";
    column?: string;
    type?: "search" | "select";
  }>;
  chartConfig?: {
    defaultType?: string;
    labelKey?: string;
    valueKeys?: string[];
  };
  maxRows?: number;
  status?: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}
