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

/** Seasonal baseline: per day-of-week statistics for a column. */
export interface SeasonalBaseline {
  queryName: string;
  columnName: string;
  /** 0=Sunday … 6=Saturday */
  dayOfWeek: number;
  mean: number;
  stdDev: number;
  sampleCount: number;
}

export interface AnomalyResult {
  queryName: string;
  columnName: string;
  currentValue: number;
  expectedMean: number;
  zScore: number;
  severity: "info" | "warning" | "critical";
  direction: "spike" | "drop";
  message: string;
  /** Which detection method flagged this */
  method?: "statistical" | "seasonal" | "business_rule";
}

/** User-defined business rule for anomaly detection. */
export interface BusinessRule {
  id: string;
  columnName: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  threshold: number;
  severity: "info" | "warning" | "critical";
  message: string;
  enabled: boolean;
}

export interface AnomalyConfig {
  enabled: boolean;
  zScoreWarning: number;
  zScoreCritical: number;
  minSamples: number;
  trackedColumns: string[];
  /** Enable day-of-week seasonal adjustment */
  seasonalEnabled?: boolean;
  /** User-defined business rules */
  businessRules?: BusinessRule[];
}

export interface QueryResultSnapshot {
  queryName: string;
  timestamp: string;
  numericSummary: Record<string, number>;
}

/** A persisted anomaly event for the history log. */
export interface AnomalyEvent {
  id: string;
  timestamp: string;
  queryName: string;
  columnName: string;
  currentValue: number;
  expectedMean: number;
  zScore: number;
  severity: "info" | "warning" | "critical";
  direction: "spike" | "drop";
  method: "statistical" | "seasonal" | "business_rule";
  message: string;
  acknowledged?: boolean;
}
