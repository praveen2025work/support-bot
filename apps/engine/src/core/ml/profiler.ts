import { computeColumnStats, isIqrOutlier } from '@/core/anomaly/numeric-utils';
import { detectColumnTypes, type CsvData, type DetectedColumnMeta } from '@/core/api-connector/csv-analyzer';

/** Statistical profile for a single column. */
export interface ColumnProfile {
  column: string;
  type: DetectedColumnMeta['detectedType'];
  nullCount: number;
  nullPercent: number;
  cardinality: number;
  topValues: { value: string; count: number }[];
  /** Present only for numeric columns. */
  numericStats?: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    p25: number;
    p75: number;
    skewness: number;
    outlierCount: number;
  };
}

/**
 * Profile every column in the dataset.
 *
 * For each column the profiler computes null counts, cardinality, top-5
 * frequent values, and — for numeric columns — descriptive statistics
 * including skewness and IQR-based outlier count.
 */
export function profileColumns(data: CsvData): ColumnProfile[] {
  const { headers, rows } = data;
  if (rows.length === 0) return [];

  const detected = detectColumnTypes(headers, rows);
  const typeMap = new Map(detected.map((d) => [d.column, d.detectedType]));

  const profiles: ColumnProfile[] = [];

  for (const header of headers) {
    const colType = typeMap.get(header) ?? 'string';

    // Null / empty counting
    let nullCount = 0;
    const freq = new Map<string, number>();

    for (const row of rows) {
      const raw = row[header];
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        nullCount++;
      } else {
        const key = String(raw);
        freq.set(key, (freq.get(key) ?? 0) + 1);
      }
    }

    const nullPercent = rows.length > 0
      ? Math.round((nullCount / rows.length) * 10000) / 100
      : 0;

    // Top 5 values by frequency
    const topValues = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    const profile: ColumnProfile = {
      column: header,
      type: colType,
      nullCount,
      nullPercent,
      cardinality: freq.size,
      topValues,
    };

    // Numeric stats
    const isNumeric = colType === 'integer' || colType === 'decimal';
    if (isNumeric) {
      const values: number[] = [];
      for (const row of rows) {
        const v = row[header];
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        if (!isNaN(n)) values.push(n);
      }

      if (values.length > 0) {
        const stats = computeColumnStats(values);
        const skewness = computeSkewness(values, stats.mean, stats.stdDev);
        let outlierCount = 0;
        for (const v of values) {
          if (isIqrOutlier(v, stats.p25, stats.p75)) outlierCount++;
        }

        profile.numericStats = {
          ...stats,
          skewness,
          outlierCount,
        };
      }
    }

    profiles.push(profile);
  }

  return profiles;
}

/**
 * Compute Fisher-Pearson skewness coefficient.
 *
 * skewness = (n / ((n-1)(n-2))) * sum[((xi - mean) / stdDev)^3]
 *
 * Falls back to 0 when stdDev is zero or sample size is too small.
 */
function computeSkewness(values: number[], mean: number, stdDev: number): number {
  const n = values.length;
  if (n < 3 || stdDev === 0) return 0;

  let sum = 0;
  for (const v of values) {
    sum += ((v - mean) / stdDev) ** 3;
  }

  return Math.round(((n / ((n - 1) * (n - 2))) * sum) * 1000) / 1000;
}
