import type { DetectedColumnMeta } from "./DataChart";
import type { HistogramBin, HistogramStats } from "./HistogramChart";
import type { TrendDataPoint, TrendLinePoint } from "./TrendChart";
import type { ScatterPoint } from "./ScatterPlot";
import type { TreeNode } from "./DecisionTreeViz";

/** Shared interfaces for rich content data shapes used across MessageBubble sub-components. */

export interface QueryListItem {
  name: string;
  description?: string;
  type: "api" | "url" | "document" | "csv" | "xlsx" | "xls";
  filters: string[];
  url?: string;
}

export interface UrlItem {
  title: string;
  url: string;
}

export interface QueryResultData {
  data: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

export interface MultiQueryResultItem {
  queryName: string;
  result: QueryResultData;
}

export interface EstimationData {
  estimatedDuration: number;
  description: string;
}

export interface LinkedSelection {
  sourceCardId: string | null;
  column: string | null;
  value: string | null;
}

export interface DiffInfo {
  addedIndices: Set<number>;
  changedIndices: Set<number>;
  changedCells: Map<number, Map<string, unknown>>;
  removedRows: Record<string, unknown>[];
  totalChanges: number;
}

// ── Proper types for richContent.data replacing `as any` ──

export interface DocumentAnswerData {
  mode: "answer" | "sections";
  answers?: Array<{
    answer: string;
    context?: string;
    sourceHeading?: string;
    confidence: number;
  }>;
  sections?: Array<{
    heading?: string;
    content: string;
  }>;
}

export interface DocumentUploadResultData {
  mode?: "list";
  documents?: Array<{
    filename: string;
    format: string;
    wordCount: number;
    chunkCount: number;
    pageCount?: number;
  }>;
  totalChunks?: number;
  document?: unknown;
  message?: string;
}

export interface RecommendationItem {
  name: string;
  type: "query" | "document" | string;
  reason: string;
}

export interface ColumnProfileItem {
  column: string;
  type: string;
  nullPercent: number;
  cardinality: number;
  stats?: { mean?: number; stdDev?: number };
  topValues?: string[];
}

export interface SmartSummaryData {
  highlights: Array<{
    severity: "info" | "notable" | "critical" | string;
    column: string;
    insight: string;
  }>;
}

export interface CorrelationHeatmapData {
  matrix: number[][];
  columns: string[];
}

export interface DistributionHistogramData {
  bins: HistogramBin[];
  stats: HistogramStats;
  column: string;
}

export interface AnomalyTableData {
  headers: string[];
  outlierRows: Array<{
    rowIndex: number;
    row: Record<string, unknown>;
    outlierColumns: Array<{
      column: string;
      zScore: number;
      direction: "high" | "low";
      value: unknown;
      mean?: number;
    }>;
  }>;
  totalOutliers: number;
}

export interface TrendAnalysisData {
  dataPoints: TrendDataPoint[];
  trendLine: TrendLinePoint[];
  slope: number;
  rSquared: number;
  direction: "up" | "down" | "flat";
}

export interface DuplicateRowsData {
  groups: Array<{
    canonical: Record<string, unknown>;
    duplicates: Record<string, unknown>[];
    similarity: number;
  }>;
}

export interface MissingHeatmapData {
  columns: Array<{
    column: string;
    nullPercent: number;
  }>;
}

export interface ClusteringResultData {
  clusters: Array<{
    size: number;
    label: string;
  }>;
  points: ScatterPoint[];
  columns?: string[];
  k: number;
}

export interface DecisionTreeResultData {
  tree: TreeNode;
  accuracy: number;
  featureImportance: Record<string, number>;
  targetColumn: string;
}

export interface ForecastResultData {
  historical: Record<string, unknown>[];
  predicted: Record<string, unknown>[];
  valueColumn: string;
}

export interface PcaResultData {
  varianceExplained?: number[];
  points: ScatterPoint[];
}

export interface InsightReportData {
  sections?: string[];
  html: string;
  csvSummary: string;
}

export interface CsvTableData {
  headers: string[];
  rows: Record<string, string | number>[];
  filePath: string;
  rowCount: number;
  chartConfig?: Record<string, unknown>;
  columnConfig?: Record<string, unknown>;
  columnMetadata?: DetectedColumnMeta[];
}

export interface CsvAggregationData {
  aggregation: {
    operation: string;
    column: string;
    result: number | string;
    topRows?: Record<string, string | number>[];
    topHeaders?: string[];
  };
  filePath: string;
  rowCount: number;
}

export interface CsvGroupByData {
  groupColumn: string;
  groupColumns?: string[];
  groups: {
    groupValue: string | number;
    groupValues?: Record<string, string | number>;
    count: number;
    aggregations: Record<string, number>;
  }[];
  aggregatedColumns: { column: string; operation: string }[];
}

export interface KnowledgeSearchData {
  results: Array<{
    queryName: string;
    queryDescription: string;
    filePath: string;
    referenceUrl?: string;
    sections: Array<{
      heading: string | null;
      content: string;
      score: number;
    }>;
  }>;
  keywords: string[];
}

export interface DocumentSummaryData {
  title: string;
  sections: { heading: string; preview: string }[];
  stats: { label: string; value: string }[];
  keywords: string[];
}

export interface CsvSummaryData {
  rowCount: number;
  columns: {
    column: string;
    type: "numeric" | "categorical";
    sum?: number;
    avg?: number;
    min?: number;
    max?: number;
    uniqueValues?: number;
    topValues?: { value: string; count: number }[];
  }[];
}

export interface FileContentData {
  content: string;
  filePath: string;
  format: string;
}

export interface DocumentSearchData {
  filePath: string;
  searchResults: Array<{
    heading: string | null;
    content: string;
    score: number;
  }>;
  searchKeywords?: string[];
}

export interface QueryResultWithConfig extends QueryResultData {
  chartConfig?: Record<string, unknown>;
  columnConfig?: Record<string, unknown>;
  columnMetadata?: DetectedColumnMeta[];
}
