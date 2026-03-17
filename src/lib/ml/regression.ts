/**
 * lib/ml/regression.ts
 * Multi-variable linear regression using the normal equation
 * Pure TypeScript — no external ML library needed
 */

import type { RegressionResult } from '../../types/ml';

// ─── Matrix Helpers (Normal Equation: β = (XᵀX)⁻¹Xᵀy) ──────────────────────

function transpose(m: number[][]): number[][] {
  const rows = m.length, cols = m[0].length;
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      result[j][i] = m[i][j];
  return result;
}

function matMul(a: number[][], b: number[][]): number[][] {
  const rows = a.length, cols = b[0].length, inner = b.length;
  const result: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < inner; k++)
        result[i][j] += a[i][k] * b[k][j];
  return result;
}

function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const aug: number[][] = matrix.map((row, i) => {
    const identity = Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-12) return null; // singular

    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  return aug.map(row => row.slice(n));
}

// ─── Main Regression Function ────────────────────────────────────────────────

export function predictColumn(
  data: Record<string, (number | null)[]>,
  targetColumn: string,
  featureColumns: string[]
): RegressionResult {
  // Build valid-row matrix (exclude any row with null in target or features)
  const numRows = data[targetColumn]?.length ?? 0;
  const xs: number[][] = [];
  const ys: number[] = [];

  for (let r = 0; r < numRows; r++) {
    const y = data[targetColumn][r];
    if (y === null || isNaN(Number(y))) continue;

    const row: number[] = [1]; // bias term
    let valid = true;
    for (const col of featureColumns) {
      const v = data[col]?.[r];
      if (v === null || isNaN(Number(v))) { valid = false; break; }
      row.push(Number(v));
    }
    if (valid) {
      xs.push(row);
      ys.push(Number(y));
    }
  }

  if (xs.length < featureColumns.length + 2) {
    return {
      targetColumn,
      featureColumns,
      coefficients: featureColumns.map(() => 0),
      intercept: 0,
      r2: 0,
      rmse: 0,
      predictions: [],
      featureImportance: featureColumns.map(f => ({ feature: f, weight: 0 })),
    };
  }

  // Normal equation: β = (XᵀX)⁻¹Xᵀy
  const Xt = transpose(xs);
  const XtX = matMul(Xt, xs);
  const XtXinv = invert(XtX);

  if (!XtXinv) {
    // Fallback: singular matrix — features are linearly dependent
    return {
      targetColumn,
      featureColumns,
      coefficients: featureColumns.map(() => 0),
      intercept: 0,
      r2: 0,
      rmse: 0,
      predictions: [],
      featureImportance: featureColumns.map(f => ({ feature: f, weight: 0 })),
    };
  }

  const yMatrix = ys.map(y => [y]);
  const XtY = matMul(Xt, yMatrix);
  const beta = matMul(XtXinv, XtY).map(row => row[0]);

  const intercept = beta[0];
  const coefficients = beta.slice(1);

  // Predictions
  const predictions = xs.map(row =>
    parseFloat((row.reduce((sum, v, i) => sum + v * beta[i], 0)).toFixed(4))
  );

  // R²
  const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
  const ssTot = ys.reduce((s, v) => s + Math.pow(v - meanY, 2), 0);
  const ssRes = ys.reduce((s, v, i) => s + Math.pow(v - predictions[i], 2), 0);
  const r2 = ssTot === 0 ? 1 : parseFloat((1 - ssRes / ssTot).toFixed(4));

  // RMSE
  const rmse = parseFloat(Math.sqrt(ssRes / ys.length).toFixed(4));

  // Feature importance: normalize absolute coefficients by feature std to get comparable weights
  const featureStds = featureColumns.map((col, i) => {
    const vals = xs.map(row => row[i + 1]);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    return Math.sqrt(variance) || 1;
  });

  const absWeights = coefficients.map((c, i) => Math.abs(c * featureStds[i]));
  const totalWeight = absWeights.reduce((s, w) => s + w, 0) || 1;
  const featureImportance = featureColumns.map((feature, i) => ({
    feature,
    weight: parseFloat((absWeights[i] / totalWeight).toFixed(3)),
  }));

  featureImportance.sort((a, b) => b.weight - a.weight);

  return {
    targetColumn,
    featureColumns,
    coefficients: coefficients.map(c => parseFloat(c.toFixed(6))),
    intercept: parseFloat(intercept.toFixed(6)),
    r2,
    rmse,
    predictions,
    featureImportance,
  };
}

// ─── NL Response Generator ─────────────────────────────────────────────────────

export function regressionToNL(
  result: RegressionResult
): { headline: string; details: string[] } {
  if (result.r2 === 0 && result.rmse === 0) {
    return {
      headline: `Could not build a regression model for ${result.targetColumn}.`,
      details: ['Not enough valid data rows or features are linearly dependent.'],
    };
  }

  const strength = result.r2 > 0.7 ? 'strong' : result.r2 > 0.4 ? 'moderate' : 'weak';

  const headline = `${strength[0].toUpperCase() + strength.slice(1)} regression model for ${result.targetColumn} ` +
    `(R²=${result.r2}, RMSE=${result.rmse}).`;

  const details: string[] = [
    `Model explains ${(result.r2 * 100).toFixed(0)}% of variance in ${result.targetColumn}.`,
    `Top predictors: ${result.featureImportance.slice(0, 3)
      .map(f => `${f.feature} (${(f.weight * 100).toFixed(0)}%)`)
      .join(', ')}.`,
    `Intercept: ${result.intercept}, trained on ${result.predictions.length} rows.`,
  ];

  if (result.r2 < 0.3) {
    details.push('Low R² — consider adding more features or checking for non-linear relationships.');
  }

  return { headline, details };
}

// ─── Chart Config Builder ─────────────────────────────────────────────────────

export function regressionToChart(result: RegressionResult) {
  const n = Math.min(result.predictions.length, 100);
  const labels = Array.from({ length: n }, (_, i) => `Row ${i + 1}`);

  return {
    type: 'bar' as const,
    labels,
    datasets: [
      {
        label: `${result.targetColumn} (actual)`,
        data: [] as number[], // actual values not stored in result — filled by orchestrator
        backgroundColor: '#185FA5',
      },
      {
        label: `${result.targetColumn} (predicted)`,
        data: result.predictions.slice(0, n),
        backgroundColor: '#1D9E75',
      },
    ],
  };
}
