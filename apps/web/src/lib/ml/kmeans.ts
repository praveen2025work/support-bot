/**
 * lib/ml/kmeans.ts
 * Zero-dependency K-Means clustering implementation.
 * Drop-in replacement for ml-kmeans — same API surface.
 */

interface KMeansOptions {
  maxIterations?: number;
  tolerance?: number;
}

interface KMeansResult {
  clusters: number[];
  centroids: number[][];
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return sum; // skip sqrt — relative comparison only
}

/** Pick initial centroids using k-means++ seeding for better convergence. */
function initCentroids(data: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  // First centroid: random
  centroids.push([...data[Math.floor(Math.random() * data.length)]]);

  for (let c = 1; c < k; c++) {
    // Compute distance from each point to nearest existing centroid
    const distances = data.map((pt) => {
      let minDist = Infinity;
      for (const cent of centroids) {
        const d = euclideanDistance(pt, cent);
        if (d < minDist) minDist = d;
      }
      return minDist;
    });

    // Weighted random selection proportional to distance²
    const totalDist = distances.reduce((s, d) => s + d, 0);
    let r = Math.random() * totalDist;
    let idx = 0;
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    centroids.push([...data[idx]]);
  }

  return centroids;
}

/** Assign each point to the nearest centroid. */
function assignClusters(data: number[][], centroids: number[][]): number[] {
  return data.map((pt) => {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      const d = euclideanDistance(pt, centroids[c]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = c;
      }
    }
    return bestIdx;
  });
}

/** Recompute centroids as the mean of assigned points. */
function recomputeCentroids(
  data: number[][],
  assignments: number[],
  k: number,
  dims: number,
): number[][] {
  const sums = Array.from({ length: k }, () => Array(dims).fill(0));
  const counts = Array(k).fill(0);

  for (let i = 0; i < data.length; i++) {
    const c = assignments[i];
    counts[c]++;
    for (let d = 0; d < dims; d++) {
      sums[c][d] += data[i][d];
    }
  }

  return sums.map((sum, c) =>
    sum.map((v) => (counts[c] > 0 ? v / counts[c] : v)),
  );
}

/** Check if centroids have converged within tolerance. */
function hasConverged(
  prev: number[][],
  curr: number[][],
  tolerance: number,
): boolean {
  for (let c = 0; c < prev.length; c++) {
    if (euclideanDistance(prev[c], curr[c]) > tolerance * tolerance) {
      return false;
    }
  }
  return true;
}

/**
 * K-Means clustering.
 * API-compatible with `ml-kmeans` — same input/output shape.
 */
export function kmeans(
  data: number[][],
  k: number,
  options?: KMeansOptions,
): KMeansResult {
  const maxIterations = options?.maxIterations ?? 100;
  const tolerance = options?.tolerance ?? 1e-6;

  if (data.length === 0) {
    return { clusters: [], centroids: [] };
  }

  const dims = data[0].length;
  const clampedK = Math.min(k, data.length);

  let centroids = initCentroids(data, clampedK);
  let assignments = assignClusters(data, centroids);

  for (let iter = 0; iter < maxIterations; iter++) {
    const newCentroids = recomputeCentroids(data, assignments, clampedK, dims);

    if (hasConverged(centroids, newCentroids, tolerance)) {
      break;
    }

    centroids = newCentroids;
    assignments = assignClusters(data, centroids);
  }

  return { clusters: assignments, centroids };
}
