/**
 * lib/ml/trend.ts
 * Linear trend detection + simple exponential smoothing forecast
 * Uses ml-regression for OLS
 */

import type { TrendResult } from '../../types/ml';

// ─── Types (duck-typed for ml-regression compatibility) ───────────────────────

interface LinearRegressionModel {
  predict(x: number): number;
  coefficients: number[];  // [intercept, slope] for SimpleLinearRegression
  r2?: number;
  score(x: number[], y: number[]): { r2: number };
}

// ─── Parse Date Column → numeric index ───────────────────────────────────────

function parseDateSeries(dates: string[]): number[] {
  const parsed = dates.map(d => {
    const ms = Date.parse(d);
    return isNaN(ms) ? NaN : ms;
  });
  const base = Math.min(...parsed.filter(n => !isNaN(n)));
  // Normalize to day index
  return parsed.map(ms => isNaN(ms) ? NaN : Math.round((ms - base) / 86400000));
}

// ─── R² Calculation ───────────────────────────────────────────────────────────

function computeR2(actual: number[], predicted: number[]): number {
  const mean    = actual.reduce((s, v) => s + v, 0) / actual.length;
  const ssTot   = actual.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
  const ssRes   = actual.reduce((s, v, i) => s + Math.pow(v - predicted[i], 2), 0);
  return ssTot === 0 ? 1 : parseFloat((1 - ssRes / ssTot).toFixed(4));
}

// ─── Exponential Smoothing Forecast ───────────────────────────────────────────

function exponentialSmoothing(
  values: number[],
  alpha: number,          // smoothing factor 0–1 (lower = more weight on history)
  periods: number
): number[] {
  if (values.length === 0) return Array(periods).fill(0);

  let smoothed = values[0];
  for (const v of values) {
    smoothed = alpha * v + (1 - alpha) * smoothed;
  }
  // Forecast flat extension of final smoothed value + trend component
  const lastN    = values.slice(-Math.min(10, values.length));
  const trendAvg = lastN.length > 1
    ? (lastN[lastN.length - 1] - lastN[0]) / (lastN.length - 1)
    : 0;

  return Array.from({ length: periods }, (_, i) =>
    parseFloat((smoothed + trendAvg * (i + 1)).toFixed(2))
  );
}

// ─── Main Trend Analyzer ──────────────────────────────────────────────────────

export function detectTrend(
  data: Record<string, (string | number | null)[]>,
  valueColumn: string,
  timeColumn: string,
  SimpleLinearRegression: new (x: number[], y: number[]) => LinearRegressionModel,
  forecastPeriods: number = 3
): TrendResult {
  const rawDates  = data[timeColumn] as string[];
  const rawValues = data[valueColumn] as number[];

  const dateIndices = parseDateSeries(rawDates.filter(Boolean));
  const validPairs  = dateIndices
    .map((x, i) => ({ x, y: Number(rawValues[i]) }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y));

  const xs = validPairs.map(p => p.x);
  const ys = validPairs.map(p => p.y);

  if (xs.length < 2) {
    return {
      column: valueColumn,
      timeColumn,
      slope: 0,
      intercept: ys[0] ?? 0,
      r2: 0,
      direction: 'flat',
      percentChangePerPeriod: 0,
      forecast: [],
    };
  }

  const model      = new SimpleLinearRegression(xs, ys);
  const slope      = model.coefficients?.[1] ?? 0;
  const intercept  = model.coefficients?.[0] ?? 0;
  const predicted  = xs.map(x => intercept + slope * x);
  const r2         = computeR2(ys, predicted);

  // Forecast next N periods
  const lastX         = Math.max(...xs);
  const avgDayStep    = xs.length > 1 ? (lastX - xs[0]) / (xs.length - 1) : 1;
  const smoothed      = exponentialSmoothing(ys, 0.3, forecastPeriods);
  const forecast      = smoothed.map((val, i) => ({
    label: `Period +${i + 1}`,
    value: val,
  }));

  const absSlope  = Math.abs(slope);
  const direction: TrendResult['direction'] =
    absSlope < 0.01 ? 'flat' : slope > 0 ? 'up' : 'down';

  const meanY   = ys.reduce((s, v) => s + v, 0) / ys.length;
  const pctChange = meanY !== 0
    ? parseFloat(((slope * avgDayStep / meanY) * 100).toFixed(2))
    : 0;

  return {
    column: valueColumn,
    timeColumn,
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(2)),
    r2,
    direction,
    percentChangePerPeriod: pctChange,
    forecast,
  };
}

// ─── NL Response Generator ─────────────────────────────────────────────────────

export function trendToNL(
  result: TrendResult
): { headline: string; details: string[] } {
  const dirWord = result.direction === 'up' ? 'upward' : result.direction === 'down' ? 'downward' : 'flat';
  const pct     = Math.abs(result.percentChangePerPeriod);
  const strength = result.r2 > 0.7 ? 'strong' : result.r2 > 0.4 ? 'moderate' : 'weak';

  const headline = `${result.column} shows a ${strength} ${dirWord} trend ` +
    `(R²=${result.r2}, ~${pct}% change per period).`;

  const details = [
    `Slope: ${result.slope > 0 ? '+' : ''}${result.slope} units per day index.`,
    `R² = ${result.r2} — model explains ${(result.r2 * 100).toFixed(0)}% of variance.`,
    `Forecast next ${result.forecast.length} periods: ` +
      result.forecast.map(f => f.value.toLocaleString()).join(' → '),
    result.r2 < 0.3
      ? 'Low R² — trend line is a rough estimate; data may be noisy or non-linear.'
      : 'R² is acceptable for directional forecasting.',
  ];

  return { headline, details };
}

// ─── Chart Config Builder ─────────────────────────────────────────────────────

export function trendToChart(result: TrendResult, actualValues: number[], labels: string[]) {
  const forecastLabels = result.forecast.map(f => f.label);
  const forecastVals   = result.forecast.map(f => f.value);

  return {
    type: 'line' as const,
    labels: [...labels, ...forecastLabels],
    datasets: [
      {
        label: result.column,
        data: [...actualValues, ...Array(forecastVals.length).fill(null)] as (number | null)[],
        borderColor: '#185FA5',
        backgroundColor: 'transparent',
      },
      {
        label: 'Forecast',
        data: [...Array(actualValues.length).fill(null), ...forecastVals] as (number | null)[],
        borderColor: '#D85A30',
        backgroundColor: 'transparent',
      },
    ],
  };
}
