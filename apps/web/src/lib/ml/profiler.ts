/**
 * lib/ml/profiler.ts
 * Smart column type inference + dataset profiling
 * Zero LLM — pure statistical heuristics
 */

import type { ColumnProfile, ColumnType, DatasetProfile } from '../../types/ml';

// ─── Column Type Inference ─────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                          // 2024-01-15
  /^\d{2}\/\d{2}\/\d{4}$/,                        // 01/15/2024
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,              // ISO datetime
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},?\s\d{4}$/i,
];

const CURRENCY_PATTERNS = [/^\$[\d,]+(\.\d{2})?$/, /^[\d,]+\.\d{2}$/, /^£[\d,]+/, /^€[\d,]+/];
const ID_PATTERNS       = [/^[A-Z]{2,4}\d{4,}$/, /^[0-9a-f]{8}-[0-9a-f]{4}-/i, /^\d{9,}$/];

export function inferColumnType(samples: string[], numericRatio: number): ColumnType {
  const nonNull = samples.filter(Boolean);
  if (!nonNull.length) return 'unknown';

  const testSample = nonNull.slice(0, 20);

  if (testSample.every(v => DATE_PATTERNS.some(p => p.test(v)))) return 'date';
  if (testSample.every(v => CURRENCY_PATTERNS.some(p => p.test(v)))) return 'currency';
  if (testSample.every(v => /^(true|false|yes|no|1|0|y|n)$/i.test(v))) return 'boolean';

  if (numericRatio > 0.95) {
    const nums = testSample.map(Number);
    const allIntegers = nums.every(n => Number.isInteger(n));
    const uniqueRatio = new Set(nums).size / nums.length;
    if (allIntegers && uniqueRatio > 0.95 && ID_PATTERNS.some(p => p.test(testSample[0]))) return 'id';
    return 'numeric';
  }

  if (numericRatio < 0.1) return 'categorical';
  return 'unknown';
}

// ─── Statistics Helpers ────────────────────────────────────────────────────────

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

// ─── Column Profiler ───────────────────────────────────────────────────────────

export function profileColumn(
  name: string,
  rawValues: (string | number | null | undefined)[]
): ColumnProfile {
  const count        = rawValues.length;
  if (count === 0) {
    return {
      name, type: 'unknown', count: 0, nullCount: 0, nullPercent: 0,
      unique: 0, cardinality: 'low',
    };
  }

  const nullCount    = rawValues.filter(v => v === null || v === undefined || v === '').length;
  const nonNull      = rawValues.filter(v => v !== null && v !== undefined && v !== '') as (string | number)[];
  const unique       = new Set(nonNull).size;
  const uniqueRatio  = unique / Math.max(nonNull.length, 1);

  const cardinality: ColumnProfile['cardinality'] =
    uniqueRatio < 0.05 ? 'low' : uniqueRatio < 0.5 ? 'medium' : 'high';

  const stringValues = nonNull.map(String);
  const numericVals  = stringValues
    .map(v => parseFloat(v.replace(/[$,£€]/g, '')))
    .filter(n => !isNaN(n));
  const numericRatio = numericVals.length / Math.max(nonNull.length, 1);

  const type = inferColumnType(stringValues, numericRatio);

  const base: ColumnProfile = {
    name,
    type,
    count,
    nullCount,
    nullPercent: parseFloat(((nullCount / count) * 100).toFixed(1)),
    unique,
    cardinality,
  };

  if ((type === 'numeric' || type === 'currency') && numericVals.length > 0) {
    const sorted = [...numericVals].sort((a, b) => a - b);
    const mean   = numericVals.reduce((s, v) => s + v, 0) / numericVals.length;
    const variance =
      numericVals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / numericVals.length;
    const std = Math.sqrt(variance);

    return {
      ...base,
      min:      sorted[0],
      max:      sorted[sorted.length - 1],
      mean:     parseFloat(mean.toFixed(2)),
      median:   parseFloat(median(sorted).toFixed(2)),
      std:      parseFloat(std.toFixed(2)),
      skewness: parseFloat(skewness(sorted, mean, std).toFixed(3)),
    };
  }

  if (type === 'categorical') {
    const freq: Record<string, number> = {};
    stringValues.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const topValues = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
    return { ...base, topValues };
  }

  return base;
}

// ─── Full Dataset Profile ──────────────────────────────────────────────────────

export function profileDataset(
  data: Record<string, (string | number | null)[]>,
  fileName: string
): DatasetProfile {
  const columns      = Object.keys(data);
  const rowCount     = data[columns[0]]?.length ?? 0;
  const profiles     = columns.map(col => profileColumn(col, data[col]));
  const memorySizeKB = Math.round(
    (JSON.stringify(data).length * 2) / 1024  // approx UTF-16
  );

  return {
    rowCount,
    columnCount: columns.length,
    columns: profiles,
    memorySizeKB,
    fileName,
    parsedAt: new Date(),
  };
}

// ─── NL Response Generator ─────────────────────────────────────────────────────

export function profileToNL(profile: DatasetProfile): { headline: string; details: string[] } {
  const numericCols    = profile.columns.filter(c => c.type === 'numeric' || c.type === 'currency');
  const categoricalCols = profile.columns.filter(c => c.type === 'categorical');
  const dateCols       = profile.columns.filter(c => c.type === 'date');
  const highNullCols   = profile.columns.filter(c => c.nullPercent > 20);

  const skewed = numericCols.find(c => c.skewness && Math.abs(c.skewness) > 1);

  const headline = `Your dataset has ${profile.rowCount.toLocaleString()} rows × ${profile.columnCount} columns — ` +
    `${numericCols.length} numeric, ${categoricalCols.length} categorical${dateCols.length ? `, ${dateCols.length} date` : ''}.`;

  const details: string[] = [];

  if (highNullCols.length) {
    details.push(`${highNullCols.map(c => `${c.name} (${c.nullPercent}% null)`).join(', ')} have significant missing values.`);
  }
  if (skewed) {
    const dir = (skewed.skewness ?? 0) > 0 ? 'right' : 'left';
    details.push(`${skewed.name} is ${dir}-skewed (skewness=${skewed.skewness}) — consider log-transform before ML.`);
  }
  if (dateCols.length) {
    details.push(`Date columns detected: ${dateCols.map(c => c.name).join(', ')} — time-series analysis available.`);
  }
  numericCols.slice(0, 3).forEach(c => {
    details.push(`${c.name}: min=${c.min}, max=${c.max}, mean=${c.mean}, std=${c.std}`);
  });

  return { headline, details };
}
