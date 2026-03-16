export interface MetricBaseline {
  queryName: string;
  columnName: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  sampleCount: number;
  lastUpdated: string;
}

export interface AnomalyResult {
  queryName: string;
  columnName: string;
  currentValue: number;
  expectedMean: number;
  zScore: number;
  severity: 'info' | 'warning' | 'critical';
  direction: 'spike' | 'drop';
  message: string;
}

export interface AnomalyConfig {
  enabled: boolean;
  zScoreWarning: number;
  zScoreCritical: number;
  minSamples: number;
  trackedColumns: string[];
}

export interface QueryResultSnapshot {
  queryName: string;
  timestamp: string;
  numericSummary: Record<string, number>;
}
