/**
 * Cross-source data joining service.
 * Detects joinable columns between datasets and performs in-memory joins.
 */

import { logger } from '@/lib/logger';

interface JoinCandidate {
  leftColumn: string;
  rightColumn: string;
  nameScore: number;
  valueOverlap: number;
  combinedScore: number;
}

interface JoinResult {
  joinedData: Record<string, unknown>[];
  joinColumn: { left: string; right: string };
  leftCount: number;
  rightCount: number;
  matchedCount: number;
  unmatchedLeft: number;
  unmatchedRight: number;
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Normalize a column name for comparison: lowercase, strip underscores/hyphens/spaces.
 */
function normalizeColName(name: string): string {
  return name.toLowerCase().replace(/[_\s-]+/g, '');
}

export class CrossSourceJoiner {
  /**
   * Detect which columns between two datasets might be joinable.
   * Uses a combination of column name similarity and value overlap.
   */
  detectJoinableColumns(
    dataA: Record<string, unknown>[],
    dataB: Record<string, unknown>[],
    headersA: string[],
    headersB: string[]
  ): JoinCandidate[] {
    const candidates: JoinCandidate[] = [];

    for (const colA of headersA) {
      for (const colB of headersB) {
        // Name similarity score (0-1)
        const normA = normalizeColName(colA);
        const normB = normalizeColName(colB);
        const maxLen = Math.max(normA.length, normB.length);
        const dist = levenshtein(normA, normB);
        const nameScore = maxLen > 0 ? 1 - dist / maxLen : 0;

        // Only consider if name similarity is above threshold
        if (nameScore < 0.5) continue;

        // Value overlap score (Jaccard similarity on first 200 rows)
        const valuesA = new Set(
          dataA.slice(0, 200).map((r) => String(r[colA] ?? '').trim().toLowerCase()).filter(Boolean)
        );
        const valuesB = new Set(
          dataB.slice(0, 200).map((r) => String(r[colB] ?? '').trim().toLowerCase()).filter(Boolean)
        );

        let intersection = 0;
        for (const v of valuesA) {
          if (valuesB.has(v)) intersection++;
        }
        const union = valuesA.size + valuesB.size - intersection;
        const valueOverlap = union > 0 ? intersection / union : 0;

        // Combined score: 0.6 * name + 0.4 * value overlap
        const combinedScore = 0.6 * nameScore + 0.4 * valueOverlap;

        if (combinedScore > 0.4) {
          candidates.push({
            leftColumn: colA,
            rightColumn: colB,
            nameScore,
            valueOverlap,
            combinedScore,
          });
        }
      }
    }

    return candidates.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * Perform an inner join between two datasets on specified columns.
   * Uses a hash-join approach for O(n+m) performance.
   */
  innerJoin(
    dataA: Record<string, unknown>[],
    dataB: Record<string, unknown>[],
    leftCol: string,
    rightCol: string,
    leftPrefix = 'A',
    rightPrefix = 'B'
  ): JoinResult {
    // Build hash map from smaller dataset
    const useAAsHash = dataA.length <= dataB.length;
    const hashData = useAAsHash ? dataA : dataB;
    const scanData = useAAsHash ? dataB : dataA;
    const hashCol = useAAsHash ? leftCol : rightCol;
    const scanCol = useAAsHash ? rightCol : leftCol;

    const hashMap = new Map<string, Record<string, unknown>[]>();
    for (const row of hashData) {
      const key = String(row[hashCol] ?? '').trim().toLowerCase();
      if (!key) continue;
      const existing = hashMap.get(key) || [];
      existing.push(row);
      hashMap.set(key, existing);
    }

    // Scan and join
    const joined: Record<string, unknown>[] = [];
    const matchedKeys = new Set<string>();

    for (const scanRow of scanData) {
      const key = String(scanRow[scanCol] ?? '').trim().toLowerCase();
      if (!key) continue;

      const matchedRows = hashMap.get(key);
      if (matchedRows) {
        matchedKeys.add(key);
        for (const hashRow of matchedRows) {
          const mergedRow: Record<string, unknown> = {};
          // Add left dataset columns
          const leftRow = useAAsHash ? hashRow : scanRow;
          const rightRow = useAAsHash ? scanRow : hashRow;

          for (const [k, v] of Object.entries(leftRow)) {
            mergedRow[`${leftPrefix}_${k}`] = v;
          }
          for (const [k, v] of Object.entries(rightRow)) {
            if (k !== rightCol) {
              mergedRow[`${rightPrefix}_${k}`] = v;
            }
          }
          joined.push(mergedRow);
        }
      }
    }

    const result: JoinResult = {
      joinedData: joined,
      joinColumn: { left: leftCol, right: rightCol },
      leftCount: dataA.length,
      rightCount: dataB.length,
      matchedCount: joined.length,
      unmatchedLeft: dataA.filter((r) => !matchedKeys.has(String(r[leftCol] ?? '').trim().toLowerCase())).length,
      unmatchedRight: dataB.filter((r) => !matchedKeys.has(String(r[rightCol] ?? '').trim().toLowerCase())).length,
    };

    logger.info(
      { leftCol, rightCol, leftCount: result.leftCount, rightCount: result.rightCount, matchedCount: result.matchedCount },
      'Cross-source join completed'
    );

    return result;
  }
}
