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
  select: string[];
  where?: FilterCondition[];
  groupBy?: {
    columns: string[];
    aggregations: Aggregation[];
  };
  having?: FilterCondition[];
  orderBy?: { column: string; dir: "asc" | "desc" }[];
  limit?: number;
}

export interface FileSourceConfig {
  id: string;
  name: string;
  description: string;
  source: string;
  type: "csv" | "xlsx";
  filePath: string;
  fileBaseDir?: string;
  sheetName?: string;
  columnConfig?: {
    idColumns?: string[];
    dateColumns?: string[];
    labelColumns?: string[];
    valueColumns?: string[];
    ignoreColumns?: string[];
  };
}

export interface SchemaColumn {
  name: string;
  type: "string" | "number" | "date";
  distinctCount: number;
  nullCount: number;
  sampleValues: (string | { value: string; count: number })[];
  role?: "id" | "label" | "value" | "date" | "ignore";
}

export interface FileValidation {
  status: "valid" | "error" | "warning";
  message: string;
  rowCount: number;
  columnCount: number;
  fileType: "csv" | "xlsx";
  lastModified: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  displayGroup: string;
  pipeline: QueryPipeline;
  chartConfig?: {
    defaultType: string;
    labelKey: string;
    valueKeys: string[];
  };
  filterParams?: Array<{
    column: string;
    binding: "column" | "query_param" | "path" | "body";
    inputType:
      | "select"
      | "multi_select"
      | "text"
      | "date_range"
      | "number_range";
  }>;
  drillDown?: Array<{
    sourceColumn: string;
    targetQuery: string;
    targetFilter: string;
  }>;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}
