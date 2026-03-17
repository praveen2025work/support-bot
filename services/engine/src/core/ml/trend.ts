import { detectColumnTypes, type CsvData } from '@/core/api-connector/csv-analyzer';
import { extractNumericColumns } from '@/core/anomaly/numeric-utils';

/** Trend direction. */
export type TrendDirection = 'up' | 'down' | 'flat';

/** A single data/trend point with a date label. */
export interface TrendPoint {
  x: number;
  y: number;
  label: string;
}

/** Result returned by {@link detectTrend}. */
export interface TrendResult {
  dateColumn: string;
  valueColumn: string;
  slope: number;
  intercept: number;
  rSquared: number;
  direction: TrendDirection;
  /** Percentage change from first to last predicted value. */
  percentageChange: number;
  trendLine: TrendPoint[];
  dataPoints: TrendPoint[];
  nlDescription: string;
}

/**
 * Detect a linear trend in time-series data via OLS regression.
 *
 * If `dateColumn` or `valueColumn` are not provided the function
 * auto-detects them using {@link detectColumnTypes}: the first
 * date-typed column is used for the x-axis and the first numeric
 * column (integer or decimal) for the y-axis.
 *
 * Returns `null` when fewer than 2 valid data points exist or when
 * suitable columns cannot be identified.
 */
export function detectTrend(
  data: CsvData,
  dateColumn?: string,
  valueColumn?: string
): TrendResult | null {
  const { headers, rows } = data;
  if (rows.length < 2) return null;

  // Resolve columns
  const detected = detectColumnTypes(headers, rows);
  const datCol = dateColumn ?? detected.find((d) => d.detectedType === 'date')?.column;
  if (!datCol) return null;

  let valCol = valueColumn;
  if (!valCol) {
    const numCols = extractNumericColumns(rows as Record<string, unknown>[]);
    // Pick the first numeric column that is not the date column
    valCol = numCols.find((c) => c !== datCol);
    if (!valCol) {
      const numDetected = detected.find(
        (d) => (d.detectedType === 'integer' || d.detectedType === 'decimal') && d.column !== datCol
      );
      valCol = numDetected?.column;
    }
  }
  if (!valCol) return null;

  // Build sorted (date, value) pairs
  const pairs: { date: Date; value: number; label: string }[] = [];
  for (const row of rows) {
    const rawDate = row[datCol];
    const rawVal = row[valCol];
    const d = parseDate(rawDate);
    const v = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
    if (d && !isNaN(v)) {
      pairs.push({ date: d, value: v, label: formatDateLabel(d) });
    }
  }

  if (pairs.length < 2) return null;

  pairs.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Use sequential indices as x values (0, 1, 2, ...)
  const xs = pairs.map((_, i) => i);
  const ys = pairs.map((p) => p.value);

  // OLS linear regression
  const n = xs.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssTot += (ys[i] - meanY) ** 2;
    ssRes += (ys[i] - predicted) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : Math.round((1 - ssRes / ssTot) * 10000) / 10000;

  // Direction — treat as flat when R² is very low or slope is negligible
  let direction: TrendDirection = 'flat';
  if (rSquared > 0.1) {
    direction = slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat';
  }

  // Percentage change between first and last predicted values
  const firstPred = intercept;
  const lastPred = slope * (n - 1) + intercept;
  const percentageChange =
    firstPred === 0
      ? 0
      : Math.round(((lastPred - firstPred) / Math.abs(firstPred)) * 10000) / 100;

  // Build point arrays
  const dataPoints: TrendPoint[] = pairs.map((p, i) => ({
    x: i,
    y: p.value,
    label: p.label,
  }));

  const trendLine: TrendPoint[] = pairs.map((p, i) => ({
    x: i,
    y: Math.round((slope * i + intercept) * 1000) / 1000,
    label: p.label,
  }));

  // Natural-language description
  const dirWord = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'flat';
  const pctAbs = Math.abs(percentageChange);
  const rSqStr = rSquared.toFixed(2);
  const nlDescription =
    direction === 'flat'
      ? `${valCol} is trending flat with R²=${rSqStr}`
      : `${valCol} trending ${dirWord} ${pctAbs}% over the period with R²=${rSqStr}`;

  return {
    dateColumn: datCol,
    valueColumn: valCol,
    slope: Math.round(slope * 10000) / 10000,
    intercept: Math.round(intercept * 1000) / 1000,
    rSquared,
    direction,
    percentageChange,
    trendLine,
    dataPoints,
    nlDescription,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Attempt to parse a value into a Date. */
function parseDate(raw: string | number | undefined | null): Date | null {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;

  // Numeric — could be epoch ms or Excel serial date
  if (typeof raw === 'number') {
    // Excel serial date range: 1 – 100000 (1900-01-01 to ~2173)
    if (raw > 0 && raw < 100000) {
      const epoch = (raw - 25569) * 86400000; // Excel epoch offset
      const d = new Date(epoch);
      if (!isNaN(d.getTime())) return d;
    }
    // Epoch milliseconds
    if (raw > 1e12) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  const s = String(raw).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  return null;
}

/** Format a Date as a short label. */
function formatDateLabel(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
