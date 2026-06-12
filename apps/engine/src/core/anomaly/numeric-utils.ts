/**
 * Extract columns that contain numeric values from a data array.
 */
export function extractNumericColumns(data: Record<string, unknown>[]): string[] {
  if (data.length === 0) return [];
  const first = data[0];
  return Object.keys(first).filter((key) => {
    // Check first few rows to confirm numeric
    const sample = data.slice(0, Math.min(5, data.length));
    return sample.every((row) => {
      const v = row[key];
      return typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '');
    });
  });
}

/**
 * Compute summary statistics for a numeric column.
 */
export function computeColumnStats(values: number[]): {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
} {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0, p25: 0, p75: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    p25: sorted[Math.floor(n * 0.25)],
    p75: sorted[Math.floor(n * 0.75)],
  };
}

/**
 * Compute z-score for a value against a distribution.
 */
export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Check if a value is an IQR outlier.
 */
export function isIqrOutlier(value: number, p25: number, p75: number): boolean {
  const iqr = p75 - p25;
  return value < p25 - 1.5 * iqr || value > p75 + 1.5 * iqr;
}

/**
 * Compute aggregated value for a numeric column (sum for totals).
 */
export function aggregateColumn(data: Record<string, unknown>[], column: string): number {
  let sum = 0;
  for (const row of data) {
    const v = Number(row[column]);
    if (!isNaN(v)) sum += v;
  }
  return sum;
}
