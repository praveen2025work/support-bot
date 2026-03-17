import Fuse from 'fuse.js';
import { type CsvData } from '@/core/api-connector/csv-analyzer';

/** A group of duplicate or near-duplicate rows. */
export interface DuplicateGroup {
  /** Representative row for the group. */
  canonical: Record<string, string | number>;
  /** Other rows that are duplicates of / similar to the canonical row. */
  duplicates: Record<string, string | number>[];
  /** Similarity score (1.0 = exact duplicate). */
  similarity: number;
}

/** Result returned by {@link findDuplicates}. */
export interface DuplicateResult {
  groups: DuplicateGroup[];
  totalDuplicates: number;
  totalRows: number;
}

/**
 * Detect exact and near-duplicate rows in a dataset.
 *
 * Rows are first grouped by exact string match. Then Fuse.js is used
 * to find near-duplicates whose normalised Fuse score is below the
 * given `threshold` (default 0.3 — lower means stricter matching).
 *
 * @param data      - The dataset to scan.
 * @param threshold - Maximum Fuse.js score to consider a near-duplicate (0 = exact, 1 = any).
 */
export function findDuplicates(
  data: CsvData,
  threshold: number = 0.3
): DuplicateResult {
  const { rows } = data;
  if (rows.length === 0) {
    return { groups: [], totalDuplicates: 0, totalRows: 0 };
  }

  // Convert each row to a composite string for comparison
  const rowStrings = rows.map((row) =>
    Object.values(row).map((v) => String(v ?? '').trim().toLowerCase()).join('|')
  );

  // ── Phase 1: exact duplicates ────────────────────────────────────────
  const exactMap = new Map<string, number[]>();
  for (let i = 0; i < rowStrings.length; i++) {
    const key = rowStrings[i];
    const list = exactMap.get(key);
    if (list) {
      list.push(i);
    } else {
      exactMap.set(key, [i]);
    }
  }

  const groups: DuplicateGroup[] = [];
  const claimedIndices = new Set<number>();

  for (const indices of exactMap.values()) {
    if (indices.length < 2) continue;
    groups.push({
      canonical: rows[indices[0]],
      duplicates: indices.slice(1).map((i) => rows[i]),
      similarity: 1,
    });
    for (const i of indices) claimedIndices.add(i);
  }

  // ── Phase 2: fuzzy near-duplicates via Fuse.js ───────────────────────
  // Only compare rows not already in an exact-duplicate group
  const remaining = rowStrings
    .map((str, idx) => ({ str, idx }))
    .filter(({ idx }) => !claimedIndices.has(idx));

  if (remaining.length > 1) {
    const fuseItems = remaining.map(({ str, idx }) => ({ text: str, idx }));
    const fuse = new Fuse(fuseItems, {
      keys: ['text'],
      includeScore: true,
      threshold,
      isCaseSensitive: false,
    });

    const fuzzyClaimedIndices = new Set<number>();

    for (const item of fuseItems) {
      if (fuzzyClaimedIndices.has(item.idx)) continue;

      const matches = fuse.search(item.text);
      const nearDupes: number[] = [];

      for (const m of matches) {
        const matchIdx = m.item.idx;
        if (matchIdx === item.idx) continue;
        if (fuzzyClaimedIndices.has(matchIdx)) continue;
        if ((m.score ?? 1) <= threshold) {
          nearDupes.push(matchIdx);
        }
      }

      if (nearDupes.length > 0) {
        fuzzyClaimedIndices.add(item.idx);
        for (const di of nearDupes) fuzzyClaimedIndices.add(di);

        // Average Fuse score as similarity (invert: 1 - score)
        const avgScore =
          matches
            .filter((m) => nearDupes.includes(m.item.idx))
            .reduce((sum, m) => sum + (1 - (m.score ?? 0)), 0) / nearDupes.length;

        groups.push({
          canonical: rows[item.idx],
          duplicates: nearDupes.map((i) => rows[i]),
          similarity: Math.round(avgScore * 1000) / 1000,
        });
      }
    }
  }

  const totalDuplicates = groups.reduce((sum, g) => sum + g.duplicates.length, 0);

  return {
    groups,
    totalDuplicates,
    totalRows: rows.length,
  };
}
