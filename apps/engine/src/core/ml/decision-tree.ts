import { extractNumericColumns } from '@/core/anomaly/numeric-utils';
import type { CsvData } from '@/core/api-connector/csv-analyzer';

/** A node in the CART decision tree. */
export interface TreeNode {
  feature?: string;
  threshold?: number;
  prediction?: string;
  gini: number;
  samples: number;
  left?: TreeNode;
  right?: TreeNode;
}

/** Result of building a decision tree classifier. */
export interface DecisionTreeResult {
  tree: TreeNode;
  accuracy: number;
  featureImportance: Record<string, number>;
  predictions: string[];
  targetColumn: string;
  classes: string[];
  confusionMatrix: { actual: string; predicted: string; count: number }[];
}

/**
 * Compute Gini impurity for a set of class labels.
 */
function giniImpurity(labels: string[]): number {
  if (labels.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let impurity = 1;
  for (const count of counts.values()) {
    const p = count / labels.length;
    impurity -= p * p;
  }
  return impurity;
}

/**
 * Find the majority class in a set of labels.
 */
function majorityClass(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let best = '';
  let bestCount = -1;
  for (const [cls, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = cls;
    }
  }
  return best;
}

/**
 * Find the best split for a dataset on a given feature.
 */
function findBestSplit(
  featureValues: number[],
  labels: string[],
  minSamplesLeaf: number
): { threshold: number; gain: number } | null {
  const n = featureValues.length;
  if (n < 2 * minSamplesLeaf) return null;

  const parentGini = giniImpurity(labels);

  // Sort indices by feature value
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => featureValues[a] - featureValues[b]);

  let bestGain = 0;
  let bestThreshold = 0;

  // Try midpoints between consecutive distinct values
  for (let i = minSamplesLeaf - 1; i < n - minSamplesLeaf; i++) {
    if (featureValues[indices[i]] === featureValues[indices[i + 1]]) continue;

    const threshold = (featureValues[indices[i]] + featureValues[indices[i + 1]]) / 2;
    const leftLabels = indices.slice(0, i + 1).map((idx) => labels[idx]);
    const rightLabels = indices.slice(i + 1).map((idx) => labels[idx]);

    const leftWeight = leftLabels.length / n;
    const rightWeight = rightLabels.length / n;
    const gain = parentGini - leftWeight * giniImpurity(leftLabels) - rightWeight * giniImpurity(rightLabels);

    if (gain > bestGain) {
      bestGain = gain;
      bestThreshold = threshold;
    }
  }

  if (bestGain <= 0) return null;
  return { threshold: bestThreshold, gain: bestGain };
}

/**
 * Recursively build a CART decision tree node.
 */
function buildNode(
  rows: Record<string, string | number>[],
  labels: string[],
  features: string[],
  depth: number,
  maxDepth: number,
  minSamplesLeaf: number,
  importanceAcc: Record<string, number>
): TreeNode {
  const gini = giniImpurity(labels);

  // Leaf conditions: pure node, max depth, or too few samples
  if (gini === 0 || depth >= maxDepth || labels.length < 2 * minSamplesLeaf) {
    return { prediction: majorityClass(labels), gini, samples: labels.length };
  }

  let bestFeature = '';
  let bestThreshold = 0;
  let bestGain = 0;

  for (const feature of features) {
    const values = rows.map((row) => {
      const v = row[feature];
      return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    });

    const result = findBestSplit(values, labels, minSamplesLeaf);
    if (result && result.gain > bestGain) {
      bestGain = result.gain;
      bestThreshold = result.threshold;
      bestFeature = feature;
    }
  }

  // No beneficial split found
  if (bestGain <= 0 || !bestFeature) {
    return { prediction: majorityClass(labels), gini, samples: labels.length };
  }

  // Record feature importance (weighted impurity decrease)
  importanceAcc[bestFeature] = (importanceAcc[bestFeature] ?? 0) + bestGain * labels.length;

  // Split data
  const leftRows: Record<string, string | number>[] = [];
  const leftLabels: string[] = [];
  const rightRows: Record<string, string | number>[] = [];
  const rightLabels: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const v = rows[i][bestFeature];
    const num = typeof v === 'number' ? v : parseFloat(String(v)) || 0;
    if (num <= bestThreshold) {
      leftRows.push(rows[i]);
      leftLabels.push(labels[i]);
    } else {
      rightRows.push(rows[i]);
      rightLabels.push(labels[i]);
    }
  }

  return {
    feature: bestFeature,
    threshold: Math.round(bestThreshold * 1000) / 1000,
    gini,
    samples: labels.length,
    left: buildNode(leftRows, leftLabels, features, depth + 1, maxDepth, minSamplesLeaf, importanceAcc),
    right: buildNode(rightRows, rightLabels, features, depth + 1, maxDepth, minSamplesLeaf, importanceAcc),
  };
}

/**
 * Predict the class for a single row using a trained tree.
 */
function predictRow(node: TreeNode, row: Record<string, string | number>): string {
  if (node.prediction !== undefined) return node.prediction;
  if (!node.feature || node.threshold === undefined) return '';

  const v = row[node.feature];
  const num = typeof v === 'number' ? v : parseFloat(String(v)) || 0;

  if (num <= node.threshold && node.left) {
    return predictRow(node.left, row);
  }
  if (node.right) {
    return predictRow(node.right, row);
  }
  return '';
}

/**
 * Build a CART decision tree classifier.
 *
 * Automatically detects numeric feature columns (excluding the target).
 * Uses Gini impurity for splitting with max depth 5 and min 5 samples per leaf.
 *
 * @param data         - Parsed CSV data.
 * @param targetColumn - The column to predict (treated as categorical).
 * @returns Decision tree result or null if data is insufficient.
 */
export function buildDecisionTree(data: CsvData, targetColumn: string): DecisionTreeResult | null {
  if (data.rows.length < 10) return null;
  if (!data.headers.includes(targetColumn)) return null;

  const maxDepth = 5;
  const minSamplesLeaf = 5;

  // Get numeric feature columns (excluding target)
  const numericCols = extractNumericColumns(data.rows as Record<string, unknown>[]);
  const features = numericCols.filter((c) => c !== targetColumn);
  if (features.length === 0) return null;

  // Extract labels
  const labels = data.rows.map((row) => String(row[targetColumn] ?? ''));
  const classes = [...new Set(labels)].sort();
  if (classes.length < 2) return null;

  // Build tree
  const importanceAcc: Record<string, number> = {};
  const tree = buildNode(data.rows, labels, features, 0, maxDepth, minSamplesLeaf, importanceAcc);

  // Normalize feature importance to sum to 1
  const totalImportance = Object.values(importanceAcc).reduce((a, b) => a + b, 0);
  const featureImportance: Record<string, number> = {};
  for (const [feat, imp] of Object.entries(importanceAcc)) {
    featureImportance[feat] = totalImportance > 0
      ? Math.round((imp / totalImportance) * 10000) / 10000
      : 0;
  }

  // Predict on training data
  const predictions = data.rows.map((row) => predictRow(tree, row));

  // Compute accuracy
  let correct = 0;
  for (let i = 0; i < labels.length; i++) {
    if (predictions[i] === labels[i]) correct++;
  }
  const accuracy = Math.round((correct / labels.length) * 10000) / 10000;

  // Build confusion matrix
  const cmMap = new Map<string, number>();
  for (let i = 0; i < labels.length; i++) {
    const key = `${labels[i]}|||${predictions[i]}`;
    cmMap.set(key, (cmMap.get(key) ?? 0) + 1);
  }
  const confusionMatrix: { actual: string; predicted: string; count: number }[] = [];
  for (const [key, count] of cmMap) {
    const [actual, predicted] = key.split('|||');
    confusionMatrix.push({ actual, predicted, count });
  }

  return {
    tree,
    accuracy,
    featureImportance,
    predictions,
    targetColumn,
    classes,
    confusionMatrix,
  };
}
