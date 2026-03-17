import { extractNumericColumns } from '@/core/anomaly/numeric-utils';
import { type CsvData } from '@/core/api-connector/csv-analyzer';

/** Pearson correlation matrix result. */
export interface CorrelationResult {
  /** Column names corresponding to matrix indices. */
  columns: string[];
  /** Symmetric matrix where matrix[i][j] is the Pearson r between columns[i] and columns[j]. */
  matrix: number[][];
}

/**
 * Compute a Pearson correlation matrix for all numeric columns.
 *
 * Non-numeric and missing values are excluded per-pair so that each
 * coefficient uses the maximum available data.
 */
export function computeCorrelationMatrix(data: CsvData): CorrelationResult {
  const numericCols = extractNumericColumns(data.rows as Record<string, unknown>[]);

  if (numericCols.length === 0) {
    return { columns: [], matrix: [] };
  }

  // Pre-extract numeric arrays for each column
  const columnValues: Map<string, number[]> = new Map();
  for (const col of numericCols) {
    const vals: number[] = [];
    for (const row of data.rows) {
      const v = row[col];
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      vals.push(isNaN(n) ? NaN : n);
    }
    columnValues.set(col, vals);
  }

  const n = numericCols.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1; // Self-correlation is always 1
    const valsI = columnValues.get(numericCols[i])!;

    for (let j = i + 1; j < n; j++) {
      const valsJ = columnValues.get(numericCols[j])!;
      const r = pearson(valsI, valsJ);
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }

  return { columns: numericCols, matrix };
}

/**
 * Pearson correlation coefficient between two arrays.
 *
 * Rows where either value is NaN are skipped. Returns 0 when there
 * are fewer than 2 valid pairs or when variance is zero.
 */
function pearson(xs: number[], ys: number[]): number {
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  let count = 0;

  const len = Math.min(xs.length, ys.length);
  for (let k = 0; k < len; k++) {
    const x = xs[k];
    const y = ys[k];
    if (isNaN(x) || isNaN(y)) continue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
    count++;
  }

  if (count < 2) return 0;

  const denom = Math.sqrt(
    (count * sumX2 - sumX * sumX) * (count * sumY2 - sumY * sumY)
  );
  if (denom === 0) return 0;

  const r = (count * sumXY - sumX * sumY) / denom;
  return Math.round(r * 10000) / 10000;
}
