/**
 * Join Engine — performs hash-joins between two datasets.
 * Supports inner, left, right, and full outer joins.
 */

export interface JoinConfig {
  joinType: "inner" | "left" | "right" | "full";
  leftKey: string;
  rightKey: string;
}

export interface JoinResult {
  rows: Record<string, unknown>[];
  columns: string[];
}

/**
 * Prefix all column names in a dataset (except the excluded key column).
 */
export function prefixColumns(
  rows: Record<string, unknown>[],
  prefix: string,
  excludeKey?: string,
): Record<string, unknown>[] {
  if (!prefix) return rows;
  return rows.map((row) => {
    const prefixed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      const newKey = key === excludeKey ? key : `${prefix}_${key}`;
      prefixed[newKey] = val;
    }
    return prefixed;
  });
}

/**
 * Detect and auto-prefix conflicting column names between two datasets.
 * Returns prefixed copies if conflicts exist.
 */
function autoPrefix(
  leftRows: Record<string, unknown>[],
  rightRows: Record<string, unknown>[],
  leftPrefix: string,
  rightPrefix: string,
  rightKey: string,
): { left: Record<string, unknown>[]; right: Record<string, unknown>[] } {
  if (leftRows.length === 0 || rightRows.length === 0) {
    return { left: leftRows, right: rightRows };
  }

  const leftCols = new Set(Object.keys(leftRows[0]));
  const rightCols = new Set(Object.keys(rightRows[0]));

  // Check for conflicts (excluding the join key which will be deduplicated)
  let hasConflict = false;
  for (const col of rightCols) {
    if (col !== rightKey && leftCols.has(col)) {
      hasConflict = true;
      break;
    }
  }

  if (!hasConflict) return { left: leftRows, right: rightRows };

  return {
    left: leftPrefix ? prefixColumns(leftRows, leftPrefix) : leftRows,
    right: rightPrefix
      ? prefixColumns(rightRows, rightPrefix, rightKey)
      : rightRows,
  };
}

/**
 * Merge a left row and right row into a single row.
 * The right join key is excluded to avoid duplication.
 */
function mergeRows(
  left: Record<string, unknown> | null,
  right: Record<string, unknown> | null,
  leftCols: string[],
  rightCols: string[],
  rightKey: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  // Left columns
  for (const col of leftCols) {
    merged[col] = left ? left[col] : null;
  }

  // Right columns (skip join key to avoid duplication)
  for (const col of rightCols) {
    if (col === rightKey) continue;
    merged[col] = right ? right[col] : null;
  }

  return merged;
}

/**
 * Perform a hash-join between two datasets.
 * Time complexity: O(n + m) for inner/left joins.
 */
export function joinDatasets(
  leftRows: Record<string, unknown>[],
  rightRows: Record<string, unknown>[],
  config: JoinConfig,
  leftPrefix?: string,
  rightPrefix?: string,
): JoinResult {
  const { joinType, leftKey, rightKey } = config;

  // Auto-prefix if there are naming conflicts
  const { left, right } = autoPrefix(
    leftRows,
    rightRows,
    leftPrefix || "",
    rightPrefix || "",
    rightKey,
  );

  // Resolve actual key names after potential prefixing
  const resolvedLeftKey = leftPrefix ? `${leftPrefix}_${leftKey}` : leftKey;
  const resolvedRightKey = rightKey; // Right key is excluded from prefixing in autoPrefix

  if (left.length === 0 && right.length === 0) {
    return { rows: [], columns: [] };
  }

  const leftCols = left.length > 0 ? Object.keys(left[0]) : [];
  const rightCols = right.length > 0 ? Object.keys(right[0]) : [];
  const outputCols = [
    ...leftCols,
    ...rightCols.filter((c) => c !== resolvedRightKey),
  ];

  // Build hash map from right dataset
  const rightMap = new Map<string, Record<string, unknown>[]>();
  for (const row of right) {
    const key = String(row[resolvedRightKey] ?? "");
    if (!rightMap.has(key)) rightMap.set(key, []);
    rightMap.get(key)!.push(row);
  }

  const result: Record<string, unknown>[] = [];
  const matchedRightKeys = new Set<string>();

  // Process left rows
  for (const leftRow of left) {
    const key = String(leftRow[resolvedLeftKey] ?? "");
    const rightMatches = rightMap.get(key);

    if (rightMatches && rightMatches.length > 0) {
      // Matched — emit one row per right match
      matchedRightKeys.add(key);
      for (const rightRow of rightMatches) {
        result.push(
          mergeRows(leftRow, rightRow, leftCols, rightCols, resolvedRightKey),
        );
      }
    } else if (joinType === "left" || joinType === "full") {
      // No match but left/full join — emit left with nulls for right
      result.push(
        mergeRows(leftRow, null, leftCols, rightCols, resolvedRightKey),
      );
    }
    // inner join: skip unmatched left rows
  }

  // For right/full joins: emit unmatched right rows
  if (joinType === "right" || joinType === "full") {
    for (const [key, rightRows] of rightMap.entries()) {
      if (!matchedRightKeys.has(key)) {
        for (const rightRow of rightRows) {
          result.push(
            mergeRows(null, rightRow, leftCols, rightCols, resolvedRightKey),
          );
        }
      }
    }
  }

  return { rows: result, columns: outputCols };
}

/**
 * Extract data array from a QueryExecutionResult.
 * Handles both API results (data array) and CSV results (rows array).
 */
export function extractDataArray(result: {
  type: string;
  apiResult?: { data?: Record<string, unknown>[] };
  csvResult?: { rows?: Record<string, unknown>[] };
}): Record<string, unknown>[] {
  if (result.type === "api" && result.apiResult?.data) {
    return result.apiResult.data;
  }
  if (
    (result.type === "csv" || result.type === "xlsx") &&
    result.csvResult?.rows
  ) {
    return result.csvResult.rows as Record<string, unknown>[];
  }
  return [];
}
