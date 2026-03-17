/**
 * lib/ml/clustering.ts
 * K-Means clustering using ml-kmeans
 * Includes elbow method for auto-K selection and cluster labeling
 */

import type { ClusterResult } from '../../types/ml';

// ─── Normalization ────────────────────────────────────────────────────────────

function normalize(
  matrix: number[][]
): { normalized: number[][]; means: number[]; stds: number[] } {
  const cols = matrix[0].length;
  const means = Array(cols).fill(0);
  const stds  = Array(cols).fill(0);

  for (let c = 0; c < cols; c++) {
    const vals = matrix.map(r => r[c]);
    means[c]   = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - means[c], 2), 0) / vals.length;
    stds[c]    = Math.sqrt(variance) || 1;
  }

  const normalized = matrix.map(row =>
    row.map((v, c) => (v - means[c]) / stds[c])
  );

  return { normalized, means, stds };
}

// ─── Inertia Calculator ───────────────────────────────────────────────────────

function calcInertia(points: number[][], centroids: number[][], assignments: number[]): number {
  return points.reduce((sum, pt, i) => {
    const c = centroids[assignments[i]];
    return sum + pt.reduce((s, v, d) => s + Math.pow(v - c[d], 2), 0);
  }, 0);
}

// ─── Elbow Method Auto-K Selection ────────────────────────────────────────────

export function selectOptimalK(
  points: number[][],
  kmeans: (data: number[][], k: number) => { clusters: number[]; centroids: number[][] },
  maxK: number = 7
): number {
  if (points.length < maxK * 2) {
    return Math.max(2, Math.min(Math.floor(points.length / 4), maxK));
  }

  const inertias: number[] = [];
  for (let k = 2; k <= maxK; k++) {
    try {
      const result = kmeans(points, k);
      inertias.push(calcInertia(points, result.centroids, result.clusters));
    } catch {
      break;
    }
  }

  // Find elbow: largest second derivative
  let bestK = 2;
  let maxCurvature = 0;
  for (let i = 1; i < inertias.length - 1; i++) {
    const curvature = inertias[i - 1] - 2 * inertias[i] + inertias[i + 1];
    if (curvature > maxCurvature) {
      maxCurvature = curvature;
      bestK = i + 2; // k starts at 2
    }
  }
  return bestK;
}

// ─── Cluster Label Generator ──────────────────────────────────────────────────

function generateClusterLabel(
  centroid: number[],
  columnNames: string[],
  allCentroids: number[][]
): string {
  // Find the column with highest variance across centroids (most discriminative)
  const variances = columnNames.map((_, c) => {
    const vals = allCentroids.map(cent => cent[c]);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    return vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
  });
  const keyColIdx  = variances.indexOf(Math.max(...variances));
  const keyColName = columnNames[keyColIdx];
  const keyVal     = centroid[keyColIdx];

  // Relative position within this column
  const colVals = allCentroids.map(c => c[keyColIdx]);
  const min     = Math.min(...colVals);
  const max     = Math.max(...colVals);
  const pct     = max !== min ? (keyVal - min) / (max - min) : 0.5;

  const level = pct < 0.33 ? 'Low' : pct < 0.67 ? 'Mid' : 'High';
  return `${level}-${keyColName}`;
}

// ─── Main Clustering Function ─────────────────────────────────────────────────

export function clusterData(
  data: Record<string, (number | null)[]>,
  columns: string[],
  kmeans: (data: number[][], k: number, options?: object) => { clusters: number[]; centroids: number[][] },
  k?: number
): ClusterResult {
  // Build numeric matrix — rows × cols
  const numRows = data[columns[0]].length;
  const matrix: number[][] = [];

  for (let r = 0; r < numRows; r++) {
    const row = columns.map(col => {
      const v = data[col][r];
      return v === null || isNaN(Number(v)) ? NaN : Number(v);
    });
    if (row.every(v => !isNaN(v))) {
      matrix.push(row);
    }
  }

  const { normalized, means, stds } = normalize(matrix);

  const chosenK = k ?? selectOptimalK(normalized, kmeans);

  const result      = kmeans(normalized, chosenK, { maxIterations: 100, tolerance: 1e-6 });
  const assignments = result.clusters;

  // Denormalize centroids for human-readable values (Gap J fix: parentheses)
  const denormCentroids = result.centroids.map(cent =>
    cent.map((v, c) => parseFloat((v * stds[c] + means[c]).toFixed(2)))
  );

  const clusterSizes = Array(chosenK).fill(0);
  assignments.forEach(a => clusterSizes[a]++);

  const inertia = calcInertia(normalized, result.centroids, assignments);

  const clusterLabels = denormCentroids.map(cent =>
    generateClusterLabel(cent, columns, denormCentroids)
  );

  return {
    k: chosenK,
    columns,
    centroids: denormCentroids,
    assignments,
    clusterSizes,
    clusterLabels,
    inertia: parseFloat(inertia.toFixed(2)),
  };
}

// ─── NL Response Generator ─────────────────────────────────────────────────────

export function clusterToNL(
  result: ClusterResult,
  totalRows: number
): { headline: string; details: string[] } {
  const headline = `Your data naturally groups into ${result.k} segments ` +
    `based on ${result.columns.join(' + ')}.`;

  const details = result.clusterLabels.map((label, i) => {
    const size = result.clusterSizes[i];
    const pct  = ((size / totalRows) * 100).toFixed(1);
    const centroidStr = result.columns
      .map((col, c) => `${col}=${result.centroids[i][c]}`)
      .join(', ');
    return `Cluster ${i + 1} "${label}": ${size} rows (${pct}%) — avg: ${centroidStr}`;
  });

  details.push(`Inertia score: ${result.inertia} (lower = tighter clusters).`);

  return { headline, details };
}

// ─── Chart Config Builder ─────────────────────────────────────────────────────

const CLUSTER_COLORS = ['#185FA5', '#1D9E75', '#D85A30', '#BA7517', '#993556', '#3C3489', '#639922'];

export function clusterToChart(result: ClusterResult) {
  return {
    type: 'doughnut' as const,
    labels: result.clusterLabels,
    datasets: [
      {
        label: 'Cluster size',
        data: result.clusterSizes,
        backgroundColor: CLUSTER_COLORS.slice(0, result.k),
      },
    ],
  };
}
