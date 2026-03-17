/**
 * lib/ml/anomaly.ts
 * Anomaly / outlier detection using IQR fences and Z-score
 * Uses simple-statistics — no LLM, no external API
 */

import type { AnomalyResult } from '../../types/ml';

interface StatsLib {
  mean(arr: number[]): number;
  standardDeviation(arr: number[]): number;
  quantile(arr: number[], p: number): number;
}

// ─── IQR Fence Method ─────────────────────────────────────────────────────────

function iqrFences(sorted: number[], ss: StatsLib): { lower: number; upper: number } {
  const q1 = ss.quantile(sorted, 0.25);
  const q3 = ss.quantile(sorted, 0.75);
  const iqr = q3 - q1;
  return {
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
  };
}

// ─── Z-Score Method ───────────────────────────────────────────────────────────

function zScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

// ─── Severity Classification ───────────────────────────────────────────────────

function classifySeverity(absZ: number): AnomalyResult['severity'] {
  if (absZ > 4) return 'severe';
  if (absZ > 3) return 'moderate';
  return 'mild';
}

// ─── Main Anomaly Detector ────────────────────────────────────────────────────

export function detectAnomalies(
  data: Record<string, (number | null)[]>,
  targetColumns: string[],
  ss: StatsLib,
  options: { zThreshold?: number; includeIQR?: boolean } = {}
): AnomalyResult[] {
  const { zThreshold = 2.5, includeIQR = true } = options;
  const results: AnomalyResult[] = [];

  for (const col of targetColumns) {
    const rawVals = data[col];
    if (!rawVals) continue;

    const values = rawVals.filter((v): v is number => v !== null && !isNaN(v));
    if (values.length < 10) continue; // not enough data

    const sorted   = [...values].sort((a, b) => a - b);
    const mu       = ss.mean(values);
    const sigma    = ss.standardDeviation(values);
    const fences   = iqrFences(sorted, ss);

    rawVals.forEach((val, rowIndex) => {
      if (val === null || isNaN(val)) return;
      const z = zScore(val, mu, sigma);
      const iqrOut = includeIQR && (val < fences.lower || val > fences.upper);

      if (Math.abs(z) >= zThreshold || iqrOut) {
        results.push({
          rowIndex,
          column: col,
          value: val,
          zScore: parseFloat(z.toFixed(2)),
          iqrOutlier: iqrOut as boolean,
          severity: classifySeverity(Math.abs(z)),
        });
      }
    });
  }

  // Sort by severity
  return results.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

// ─── NL Response Generator ─────────────────────────────────────────────────────

export function anomalyToNL(
  results: AnomalyResult[],
  totalRows: number
): { headline: string; details: string[] } {
  if (!results.length) {
    return {
      headline: 'No anomalies detected in the selected columns.',
      details: ['All values fall within expected statistical ranges (IQR fences + Z-score < 2.5).'],
    };
  }

  const severe   = results.filter(r => r.severity === 'severe');
  const byColumn = results.reduce<Record<string, AnomalyResult[]>>((acc, r) => {
    acc[r.column] = [...(acc[r.column] || []), r];
    return acc;
  }, {});

  const headline = `Found ${results.length} anomal${results.length === 1 ? 'y' : 'ies'} across ` +
    `${Object.keys(byColumn).length} column(s) — ` +
    `${severe.length} severe, affecting ${((results.length / totalRows) * 100).toFixed(1)}% of rows.`;

  const details: string[] = [];
  Object.entries(byColumn).forEach(([col, rows]) => {
    const top = rows.slice(0, 3);
    details.push(
      `${col}: ${rows.length} outlier(s) — ` +
      top.map(r => `row ${r.rowIndex + 1} (value=${r.value}, z=${r.zScore})`).join(', ')
    );
  });

  if (severe.length) {
    details.push(`Severe outliers at rows: ${severe.slice(0, 5).map(r => r.rowIndex + 1).join(', ')} — investigate immediately.`);
  }

  return { headline, details };
}

// ─── Chart Config Builder (Gap H fix: proper {x,y} point objects for scatter) ─

export function anomalyToChart(
  columnValues: number[],
  anomalies: AnomalyResult[],
  columnName: string
) {
  const anomalyRows = new Set(anomalies.map(a => a.rowIndex));
  return {
    type: 'scatter' as const,
    labels: columnValues.map((_, i) => `Row ${i + 1}`),
    datasets: [
      {
        label: 'Normal',
        data: columnValues
          .map((v, i) => ({ x: i, y: v }))
          .filter((_, i) => !anomalyRows.has(i)),
        backgroundColor: '#1D9E75',
      },
      {
        label: 'Anomaly',
        data: anomalies.map(a => ({ x: a.rowIndex, y: a.value })),
        backgroundColor: '#D85A30',
      },
    ],
  };
}
