import { extractNumericColumns, computeColumnStats } from '@/core/anomaly/numeric-utils';
import type { CsvData } from '@/core/api-connector/csv-analyzer';

/** A single cluster description. */
export interface ClusterInfo {
  centroid: number[];
  size: number;
  label: string;
}

/** Result of k-means clustering. */
export interface ClusterResult {
  k: number;
  clusters: ClusterInfo[];
  labels: number[];
  columns: string[];
  /** First two numeric columns projected for scatter plot. */
  points: { x: number; y: number; cluster: number }[];
  inertia: number;
  nlDescription: string;
}

/**
 * Standardize a matrix of values using z-score normalization.
 * Each column is independently normalized to mean=0, stdDev=1.
 */
function standardize(matrix: number[][]): { data: number[][]; means: number[]; stds: number[] } {
  const cols = matrix[0].length;
  const means: number[] = [];
  const stds: number[] = [];

  for (let c = 0; c < cols; c++) {
    const colValues = matrix.map((row) => row[c]);
    const stats = computeColumnStats(colValues);
    means.push(stats.mean);
    stds.push(stats.stdDev || 1);
  }

  const data = matrix.map((row) =>
    row.map((v, c) => (v - means[c]) / stds[c])
  );

  return { data, means, stds };
}

/**
 * Compute squared Euclidean distance between two points.
 */
function squaredDist(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

/**
 * Run Lloyd's k-means algorithm on standardized data.
 */
function lloydKMeans(
  data: number[][],
  k: number,
  maxIter: number
): { centroids: number[][]; labels: number[]; inertia: number } {
  const n = data.length;
  const dims = data[0].length;

  // Random centroid initialization: pick k distinct rows
  const indices = new Set<number>();
  while (indices.size < k) {
    indices.add(Math.floor(Math.random() * n));
  }
  const centroids = [...indices].map((i) => [...data[i]]);

  let labels = new Array<number>(n).fill(0);
  let inertia = Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step
    const newLabels = new Array<number>(n);
    let newInertia = 0;

    for (let i = 0; i < n; i++) {
      let bestDist = Infinity;
      let bestK = 0;
      for (let c = 0; c < k; c++) {
        const d = squaredDist(data[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestK = c;
        }
      }
      newLabels[i] = bestK;
      newInertia += bestDist;
    }

    // Update step
    const sums: number[][] = Array.from({ length: k }, () => new Array(dims).fill(0));
    const counts = new Array(k).fill(0);

    for (let i = 0; i < n; i++) {
      const c = newLabels[i];
      counts[c]++;
      for (let d = 0; d < dims; d++) {
        sums[c][d] += data[i][d];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[c][d] = sums[c][d] / counts[c];
        }
      }
    }

    // Convergence check
    const converged = newInertia >= inertia - 1e-6;
    labels = newLabels;
    inertia = newInertia;
    if (converged) break;
  }

  return { centroids, labels, inertia };
}

/**
 * Select k using the elbow method.
 * Tries k=2..8 and picks the knee point where adding another cluster
 * yields diminishing returns (largest second derivative).
 */
function selectK(data: number[][], maxIter: number): number {
  const maxK = Math.min(8, data.length - 1);
  if (maxK < 2) return 2;

  const inertias: number[] = [];
  for (let k = 2; k <= maxK; k++) {
    const { inertia } = lloydKMeans(data, k, maxIter);
    inertias.push(inertia);
  }

  // Find elbow: largest second derivative
  let bestK = 2;
  let bestDiff = -Infinity;
  for (let i = 1; i < inertias.length - 1; i++) {
    const secondDeriv = inertias[i - 1] - 2 * inertias[i] + inertias[i + 1];
    if (secondDeriv > bestDiff) {
      bestDiff = secondDeriv;
      bestK = i + 2; // offset by starting k=2
    }
  }

  return bestK;
}

/**
 * Describe a cluster based on the original (unstandardized) centroid values.
 */
function describeCluster(
  centroid: number[],
  columns: string[],
  globalMeans: number[]
): string {
  const traits: string[] = [];
  for (let i = 0; i < columns.length && traits.length < 2; i++) {
    const diff = centroid[i] - globalMeans[i];
    const relDiff = globalMeans[i] !== 0 ? Math.abs(diff / globalMeans[i]) : Math.abs(diff);
    if (relDiff > 0.2) {
      traits.push(`${diff > 0 ? 'high' : 'low'} ${columns[i]}`);
    }
  }
  return traits.length > 0 ? traits.join(', ') : 'average values';
}

/**
 * K-Means clustering on numeric columns of CSV data.
 *
 * Uses Lloyd's algorithm with z-score standardization. If `k` is not
 * specified the elbow method is used to automatically select it (k=2..8).
 *
 * @param data   - Parsed CSV data with headers and rows.
 * @param k      - Number of clusters (auto-detected if omitted).
 * @param maxIter - Maximum iterations for Lloyd's algorithm (default 50).
 * @returns Clustering result or null if insufficient numeric data.
 */
export function kMeans(data: CsvData, k?: number, maxIter = 50): ClusterResult | null {
  if (data.rows.length < 2) return null;

  const numericCols = extractNumericColumns(data.rows as Record<string, unknown>[]);
  if (numericCols.length < 1) return null;

  // Build numeric matrix
  const matrix: number[][] = [];
  for (const row of data.rows) {
    const vals: number[] = [];
    for (const col of numericCols) {
      const v = row[col];
      vals.push(typeof v === 'number' ? v : parseFloat(String(v)) || 0);
    }
    matrix.push(vals);
  }

  // Compute global means for description (before standardization)
  const globalMeans = numericCols.map((_, ci) => {
    const sum = matrix.reduce((s, row) => s + row[ci], 0);
    return sum / matrix.length;
  });

  // Standardize
  const { data: stdData, means, stds } = standardize(matrix);

  // Select k
  const chosenK = k ?? selectK(stdData, maxIter);
  const finalK = Math.min(chosenK, data.rows.length);

  // Run clustering
  const { centroids, labels, inertia } = lloydKMeans(stdData, finalK, maxIter);

  // Build cluster info with unstandardized centroids
  const clusters: ClusterInfo[] = centroids.map((centroid, ci) => {
    const size = labels.filter((l) => l === ci).length;
    const unstdCentroid = centroid.map((v, d) => v * stds[d] + means[d]);
    const label = describeCluster(unstdCentroid, numericCols, globalMeans);
    return {
      centroid: unstdCentroid.map((v) => Math.round(v * 100) / 100),
      size,
      label,
    };
  });

  // Build scatter plot points using first 2 numeric columns
  const points = matrix.map((row, i) => ({
    x: row[0],
    y: numericCols.length > 1 ? row[1] : 0,
    cluster: labels[i],
  }));

  // Natural language description
  const clusterDescs = clusters
    .map((c, i) => `Cluster ${i + 1} (${c.size} rows, ${c.label})`)
    .join(', ');
  const nlDescription = `Data naturally falls into ${finalK} clusters: ${clusterDescs}`;

  return {
    k: finalK,
    clusters,
    labels,
    columns: numericCols,
    points,
    inertia: Math.round(inertia * 100) / 100,
    nlDescription,
  };
}
