/**
 * lib/ml/histogram.ts
 * Column distribution histogram with Sturges' rule for bin count
 * Pure TypeScript — no external library
 */

import type { HistogramResult } from '../../types/ml';

// ─── Stats Helpers ───────────────────────────────────────────────────────────

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function skewness(values: number[], mean: number, std: number): number {
  if (std === 0 || values.length < 3) return 0;
  const n = values.length;
  const sum = values.reduce((acc, v) => acc + Math.pow((v - mean) / std, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

// ─── Main Histogram Function ─────────────────────────────────────────────────

export function computeHistogram(
  data: Record<string, (string | number | null)[]>,
  column: string,
  binCount?: number
): HistogramResult {
  const rawVals = data[column] ?? [];
  const values = rawVals
    .map(v => (v === null ? NaN : typeof v === 'string' ? parseFloat(v.replace(/[$,£€]/g, '')) : v))
    .filter((v): v is number => !isNaN(v));

  if (values.length === 0) {
    return {
      column,
      bins: [],
      stats: { mean: 0, median: 0, std: 0, skewness: 0, min: 0, max: 0 },
      totalCount: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  const skew = skewness(values, mean, std);

  // Sturges' rule: k = ceil(log2(n) + 1)
  const k = binCount ?? Math.max(5, Math.min(30, Math.ceil(Math.log2(values.length) + 1)));
  const binWidth = max === min ? 1 : (max - min) / k;

  const bins: HistogramResult['bins'] = [];
  for (let i = 0; i < k; i++) {
    const lower = parseFloat((min + i * binWidth).toFixed(4));
    const upper = parseFloat((min + (i + 1) * binWidth).toFixed(4));
    bins.push({
      lower,
      upper,
      count: 0,
      label: `${lower.toLocaleString()}–${upper.toLocaleString()}`,
    });
  }

  // Assign values to bins
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= k) idx = k - 1; // clamp max value into last bin
    bins[idx].count++;
  }

  return {
    column,
    bins,
    stats: {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median(sorted).toFixed(2)),
      std: parseFloat(std.toFixed(2)),
      skewness: parseFloat(skew.toFixed(3)),
      min,
      max,
    },
    totalCount: values.length,
  };
}

// ─── NL Response Generator ─────────────────────────────────────────────────────

export function histogramToNL(
  result: HistogramResult
): { headline: string; details: string[] } {
  if (result.totalCount === 0) {
    return {
      headline: `No numeric data found in column "${result.column}" for histogram.`,
      details: ['Check that the column contains numeric values.'],
    };
  }

  const { stats } = result;
  const skewDir = stats.skewness > 0.5 ? 'right-skewed' :
                  stats.skewness < -0.5 ? 'left-skewed' : 'roughly symmetric';

  const peakBin = result.bins.reduce((best, b) => b.count > best.count ? b : best, result.bins[0]);
  const peakPct = ((peakBin.count / result.totalCount) * 100).toFixed(1);

  const headline = `Distribution of ${result.column}: ${skewDir}, ` +
    `range ${stats.min.toLocaleString()}–${stats.max.toLocaleString()}.`;

  const details = [
    `Mean: ${stats.mean}, Median: ${stats.median}, Std Dev: ${stats.std}.`,
    `${result.bins.length} bins — peak at ${peakBin.label} (${peakPct}% of values).`,
    `Skewness: ${stats.skewness} — ${skewDir}.`,
  ];

  if (Math.abs(stats.skewness) > 1) {
    details.push('High skewness — consider log-transform before further analysis.');
  }

  return { headline, details };
}

// ─── Chart Config Builder ─────────────────────────────────────────────────────

export function histogramToChart(result: HistogramResult) {
  return {
    type: 'bar' as const,
    labels: result.bins.map(b => b.label),
    datasets: [
      {
        label: `${result.column} frequency`,
        data: result.bins.map(b => b.count),
        backgroundColor: '#185FA5',
      },
    ],
  };
}
