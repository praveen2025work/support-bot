// ─── Core Data Types ──────────────────────────────────────────────────────────

export type ColumnType = 'numeric' | 'categorical' | 'date' | 'currency' | 'id' | 'boolean' | 'unknown';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  count: number;
  nullCount: number;
  nullPercent: number;
  unique: number;
  cardinality: 'low' | 'medium' | 'high';
  // numeric only
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  skewness?: number;
  // categorical only
  topValues?: { value: string; count: number }[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  memorySizeKB: number;
  fileName: string;
  parsedAt: Date;
}

// ─── ML Result Types ───────────────────────────────────────────────────────────

export interface AnomalyResult {
  rowIndex: number;
  column: string;
  value: number;
  zScore: number;
  iqrOutlier: boolean;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface TrendResult {
  column: string;
  timeColumn: string;
  slope: number;
  intercept: number;
  r2: number;
  direction: 'up' | 'down' | 'flat';
  percentChangePerPeriod: number;
  forecast: { label: string; value: number }[];
}

export interface ClusterResult {
  k: number;
  columns: string[];
  centroids: number[][];
  assignments: number[];
  clusterSizes: number[];
  clusterLabels: string[];
  inertia: number;
}

export interface RegressionResult {
  targetColumn: string;
  featureColumns: string[];
  coefficients: number[];
  intercept: number;
  r2: number;
  rmse: number;
  predictions: number[];
  featureImportance: { feature: string; weight: number }[];
}

export interface CorrelationResult {
  matrix: number[][];
  columns: string[];
  strongPairs: { col1: string; col2: string; r: number }[];
}

export interface DuplicateResult {
  exactDuplicates: number[][];
  nearDuplicates: { rows: number[]; similarity: number }[];
  totalAffected: number;
}

export interface HistogramResult {
  column: string;
  bins: { lower: number; upper: number; count: number; label: string }[];
  stats: { mean: number; median: number; std: number; skewness: number; min: number; max: number };
  totalCount: number;
}

// ─── Bot Message Types ─────────────────────────────────────────────────────────

export type MLAnalysisType =
  | 'profile'
  | 'anomaly'
  | 'trend'
  | 'cluster'
  | 'regression'
  | 'correlation'
  | 'duplicates'
  | 'summary'
  | 'histogram'
  | 'forecast';

export interface ChartConfig {
  type: 'bar' | 'line' | 'scatter' | 'doughnut' | 'heatmap';
  labels: string[];
  datasets: {
    label: string;
    data: (number | null | { x: number; y: number })[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }[];
}

export interface MLBotMessage {
  id: string;
  analysisType: MLAnalysisType;
  headline: string;           // NL summary sentence
  details: string[];          // Bullet insights
  chart?: ChartConfig;
  tableData?: { headers: string[]; rows: (string | number)[][] };
  downloadPayload?: string;   // CSV string for export
  executionMs: number;
  rowsAnalyzed: number;
}

// ─── NLP Intent Types ─────────────────────────────────────────────────────────

export type MLIntent =
  | 'profile_data'
  | 'find_anomalies'
  | 'show_trend'
  | 'cluster_data'
  | 'predict_column'
  | 'show_correlation'
  | 'find_duplicates'
  | 'show_histogram'
  | 'summarize'
  | 'forecast'
  | 'unknown';

export interface ParsedIntent {
  intent: MLIntent;
  confidence: number;
  entities: {
    columns: string[];
    targetColumn?: string;
    k?: number;               // for clustering
    periods?: number;         // for forecast
    threshold?: number;       // for anomaly sensitivity
  };
  rawQuery: string;
}

// ─── Worker Message Protocol ───────────────────────────────────────────────────

export interface WorkerRequest {
  id: string;
  type: MLAnalysisType;
  payload: {
    csvData: string;
    options: Record<string, unknown>;
  };
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  executionMs: number;
}

// ─── Tenant Config ────────────────────────────────────────────────────────────

export interface TenantMLConfig {
  tenantId: string;
  maxFileSize: number;        // bytes
  allowedAnalyses: MLAnalysisType[];
  maxRows: number;
  enableWebWorker: boolean;
}

// ─── Intent → Analysis Type Mapping ───────────────────────────────────────────

export const INTENT_TO_ANALYSIS: Record<string, MLAnalysisType> = {
  profile_data: 'profile',
  summarize: 'summary',
  find_anomalies: 'anomaly',
  show_trend: 'trend',
  forecast: 'forecast',
  cluster_data: 'cluster',
  predict_column: 'regression',
  show_correlation: 'correlation',
  find_duplicates: 'duplicates',
  show_histogram: 'histogram',
};
