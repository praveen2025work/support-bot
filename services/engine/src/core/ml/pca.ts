import { Matrix, EigenvalueDecomposition } from 'ml-matrix';
import { extractNumericColumns, computeColumnStats } from '@/core/anomaly/numeric-utils';
import type { CsvData } from '@/core/api-connector/csv-analyzer';

/** Result of PCA analysis. */
export interface PCAResult {
  /** Data projected onto the first two principal components. */
  points: { x: number; y: number; label: string }[];
  /** Fraction of variance explained by PC1 and PC2. */
  varianceExplained: [number, number];
  /** Total variance (sum of all eigenvalues). */
  totalVariance: number;
  /** Loadings of original columns on PC1 and PC2. */
  loadings: { column: string; pc1: number; pc2: number }[];
  /** Numeric columns used in the analysis. */
  columns: string[];
}

/**
 * Compute PCA on the numeric columns of a dataset.
 *
 * Standardizes each column (z-score), computes the covariance matrix,
 * performs eigenvalue decomposition, and projects the data onto the
 * first two principal components.
 *
 * @param data - Parsed CSV data.
 * @returns PCA result or null if insufficient numeric columns.
 */
export function computePCA(data: CsvData): PCAResult | null {
  if (data.rows.length < 3) return null;

  const numericCols = extractNumericColumns(data.rows as Record<string, unknown>[]);
  if (numericCols.length < 2) return null;

  const n = data.rows.length;
  const p = numericCols.length;

  // Build raw matrix and compute column stats
  const rawMatrix: number[][] = [];
  const colStats = numericCols.map((col) => {
    const values = data.rows.map((row) => {
      const v = row[col];
      return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    });
    return computeColumnStats(values);
  });

  // Standardize (z-score)
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < p; j++) {
      const v = data.rows[i][numericCols[j]];
      const num = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
      const std = colStats[j].stdDev || 1;
      row.push((num - colStats[j].mean) / std);
    }
    rawMatrix.push(row);
  }

  const X = new Matrix(rawMatrix);

  // Compute covariance matrix: (X^T * X) / (n - 1)
  const Xt = X.transpose();
  const cov = Xt.mmul(X).div(n - 1);

  // Eigenvalue decomposition
  const eigen = new EigenvalueDecomposition(cov);
  const eigenvalues = eigen.realEigenvalues;
  const eigenvectors = eigen.eigenvectorMatrix;

  // Sort eigenvalues/vectors in descending order
  const indexed = eigenvalues.map((val, idx) => ({ val, idx }));
  indexed.sort((a, b) => b.val - a.val);

  const totalVariance = eigenvalues.reduce((s, v) => s + Math.max(v, 0), 0);

  // Extract first two principal components
  const pc1Idx = indexed[0].idx;
  const pc2Idx = indexed.length > 1 ? indexed[1].idx : pc1Idx;

  const pc1Eigenval = Math.max(indexed[0].val, 0);
  const pc2Eigenval = indexed.length > 1 ? Math.max(indexed[1].val, 0) : 0;

  const varianceExplained: [number, number] = [
    totalVariance > 0 ? Math.round((pc1Eigenval / totalVariance) * 10000) / 10000 : 0,
    totalVariance > 0 ? Math.round((pc2Eigenval / totalVariance) * 10000) / 10000 : 0,
  ];

  // Extract eigenvectors for PC1 and PC2
  const ev1: number[] = [];
  const ev2: number[] = [];
  for (let j = 0; j < p; j++) {
    ev1.push(eigenvectors.get(j, pc1Idx));
    ev2.push(eigenvectors.get(j, pc2Idx));
  }

  // Project data onto PC1 and PC2
  // Find a label column: first non-numeric column, or row index
  const labelCol = data.headers.find((h) => !numericCols.includes(h));

  const points = rawMatrix.map((row, i) => {
    let x = 0;
    let y = 0;
    for (let j = 0; j < p; j++) {
      x += row[j] * ev1[j];
      y += row[j] * ev2[j];
    }
    const label = labelCol
      ? String(data.rows[i][labelCol] ?? `Row ${i}`)
      : `Row ${i}`;
    return {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      label,
    };
  });

  // Loadings
  const loadings = numericCols.map((col, j) => ({
    column: col,
    pc1: Math.round(ev1[j] * 10000) / 10000,
    pc2: Math.round(ev2[j] * 10000) / 10000,
  }));

  return {
    points,
    varianceExplained,
    totalVariance: Math.round(totalVariance * 1000) / 1000,
    loadings,
    columns: numericCols,
  };
}
