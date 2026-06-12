import { computeColumnStats } from '@/core/anomaly/numeric-utils';
import { type CsvData } from '@/core/api-connector/csv-analyzer';

/** A single histogram bin. */
export interface HistogramBin {
  label: string;
  start: number;
  end: number;
  count: number;
}

/** Distribution statistics for the histogram column. */
export interface HistogramStats {
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  min: number;
  max: number;
  count: number;
}

/** Result returned by {@link computeHistogram}. */
export interface HistogramResult {
  column: string;
  bins: HistogramBin[];
  stats: HistogramStats;
}

/**
 * Compute a distribution histogram for a numeric column.
 *
 * Uses Sturges' rule (`ceil(log2(n) + 1)`) for automatic bin count
 * when `numBins` is not provided. Returns `null` if the column has
 * no valid numeric values.
 *
 * @param data     - The dataset.
 * @param column   - The column name to histogram.
 * @param numBins  - Optional override for number of bins.
 */
export function computeHistogram(
  data: CsvData,
  column: string,
  numBins?: number
): HistogramResult | null {
  // Extract numeric values
  const values: number[] = [];
  for (const row of data.rows) {
    const v = row[column];
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!isNaN(n)) values.push(n);
  }

  if (values.length === 0) return null;

  const stats = computeColumnStats(values);
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Median
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  // Skewness (Fisher-Pearson)
  const skewness = computeSkewness(values, stats.mean, stats.stdDev);

  // Bin count via Sturges' rule
  const binCount = numBins ?? Math.max(1, Math.ceil(Math.log2(n) + 1));

  // Build bins
  const range = stats.max - stats.min;
  const binWidth = range === 0 ? 1 : range / binCount;

  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const start = stats.min + i * binWidth;
    const end = i === binCount - 1 ? stats.max : stats.min + (i + 1) * binWidth;
    bins.push({
      label: `${formatBound(start)} – ${formatBound(end)}`,
      start: Math.round(start * 1000) / 1000,
      end: Math.round(end * 1000) / 1000,
      count: 0,
    });
  }

  // Count values into bins
  for (const v of values) {
    let idx = range === 0 ? 0 : Math.floor((v - stats.min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].count++;
  }

  return {
    column,
    bins,
    stats: {
      mean: Math.round(stats.mean * 1000) / 1000,
      median: Math.round(median * 1000) / 1000,
      stdDev: Math.round(stats.stdDev * 1000) / 1000,
      skewness,
      min: stats.min,
      max: stats.max,
      count: n,
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatBound(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function computeSkewness(values: number[], mean: number, stdDev: number): number {
  const n = values.length;
  if (n < 3 || stdDev === 0) return 0;

  let sum = 0;
  for (const v of values) {
    sum += ((v - mean) / stdDev) ** 3;
  }

  return Math.round(((n / ((n - 1) * (n - 2))) * sum) * 1000) / 1000;
}
