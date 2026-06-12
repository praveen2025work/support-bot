/**
 * lib/ml/correlation.ts
 * Pearson correlation matrix + near-duplicate row detection via Fuse.js
 */

import type { CorrelationResult, DuplicateResult } from '../../types/ml';

// ─── Pearson Correlation ──────────────────────────────────────────────────────

function pearson(xs: number[], ys: number[]): number {
  const n   = xs.length;
  if (n === 0) return 0;
  const mx  = xs.reduce((s, v) => s + v, 0) / n;
  const my  = ys.reduce((s, v) => s + v, 0) / n;
  const num = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
  const dx  = Math.sqrt(xs.reduce((s, v) => s + Math.pow(v - mx, 2), 0));
  const dy  = Math.sqrt(ys.reduce((s, v) => s + Math.pow(v - my, 2), 0));
  if (dx === 0 || dy === 0) return 0;
  return parseFloat((num / (dx * dy)).toFixed(3));
}

// ─── Full Correlation Matrix ───────────────────────────────────────────────────

export function computeCorrelation(
  data: Record<string, (number | null)[]>,
  columns: string[]
): CorrelationResult {
  // Extract numeric arrays, filling nulls with mean
  const series: Record<string, number[]> = {};
  for (const col of columns) {
    const vals = data[col].map(v => (v === null ? NaN : Number(v)));
    const valid = vals.filter(v => !isNaN(v));
    const mean  = valid.length > 0
      ? valid.reduce((s, v) => s + v, 0) / valid.length
      : 0;
    series[col] = vals.map(v => (isNaN(v) ? mean : v));
  }

  const matrix: number[][] = columns.map(c1 =>
    columns.map(c2 => {
      if (c1 === c2) return 1.0;
      return pearson(series[c1], series[c2]);
    })
  );

  // Find strongly correlated pairs (|r| > 0.6, excluding diagonal)
  const strongPairs: CorrelationResult['strongPairs'] = [];
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const r = matrix[i][j];
      if (Math.abs(r) > 0.6) {
        strongPairs.push({ col1: columns[i], col2: columns[j], r });
      }
    }
  }

  strongPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return { matrix, columns, strongPairs };
}

// ─── NL Response for Correlation ──────────────────────────────────────────────

export function correlationToNL(
  result: CorrelationResult
): { headline: string; details: string[] } {
  const { strongPairs } = result;

  if (!strongPairs.length) {
    return {
      headline: 'No strong correlations detected among the selected columns.',
      details: ['All column pairs have |r| < 0.6 — they are largely independent.'],
    };
  }

  const headline = `Found ${strongPairs.length} strong correlation(s) — ` +
    `top pair: ${strongPairs[0].col1} ↔ ${strongPairs[0].col2} (r=${strongPairs[0].r}).`;

  const details = strongPairs.slice(0, 5).map(({ col1, col2, r }) => {
    const strength = Math.abs(r) > 0.9 ? 'very strong' : Math.abs(r) > 0.7 ? 'strong' : 'moderate';
    const dir      = r > 0 ? 'positive' : 'negative';
    return `${col1} ↔ ${col2}: ${strength} ${dir} correlation (r=${r}).`;
  });

  const multicollinear = strongPairs.filter(p => p.r > 0.9);
  if (multicollinear.length) {
    details.push(
      `Multicollinearity risk: ${multicollinear.map(p => `${p.col1}+${p.col2}`).join(', ')} — ` +
      `consider dropping one column before regression.`
    );
  }

  return { headline, details };
}

// ─── Duplicate Row Detection ──────────────────────────────────────────────────

interface FuseInstance<T> {
  search(pattern: string): { item: T; score?: number; refIndex?: number }[];
}

interface FuseConstructor {
  new <T>(
    list: T[],
    options?: {
      keys?: string[];
      threshold?: number;
      includeScore?: boolean;
      distance?: number;
    }
  ): FuseInstance<T>;
}

export function detectDuplicates(
  data: Record<string, (string | number | null)[]>,
  columns: string[],
  Fuse: FuseConstructor,
  options: { fuzzyThreshold?: number } = {}
): DuplicateResult {
  const { fuzzyThreshold = 0.15 } = options; // 0 = exact, 1 = max fuzzy

  const numRows = data[columns[0]]?.length ?? 0;

  // Stringify each row for comparison
  const rows = Array.from({ length: numRows }, (_, i) =>
    columns.map(c => String(data[c]?.[i] ?? '')).join('|')
  );

  // ── Exact duplicates via hash map ──────────────────────────────────────────
  const seen: Record<string, number[]> = {};
  rows.forEach((row, i) => {
    if (!seen[row]) seen[row] = [];
    seen[row].push(i);
  });
  const exactDuplicates = Object.values(seen).filter(group => group.length > 1);

  // ── Near-duplicates via Fuse.js ────────────────────────────────────────────
  // Only run on a sample to avoid O(n²) in large files
  const SAMPLE_LIMIT = 500;
  const sampleRows   = rows.slice(0, SAMPLE_LIMIT);
  const indexedRows  = sampleRows.map((text, i) => ({ text, i }));

  const fuse = new Fuse(indexedRows, {
    keys: ['text'],
    threshold: fuzzyThreshold,
    includeScore: true,
    distance: 200,
  });

  const nearDuplicates: DuplicateResult['nearDuplicates'] = [];
  const alreadyPaired = new Set<string>();

  sampleRows.forEach((row, idx) => {
    const results = fuse.search(row);
    results.forEach(({ item, score }) => {
      if (item.i === idx) return;
      const pairKey = [Math.min(idx, item.i), Math.max(idx, item.i)].join('-');
      if (!alreadyPaired.has(pairKey)) {
        alreadyPaired.add(pairKey);
        const similarity = parseFloat(((1 - (score ?? 0)) * 100).toFixed(1));
        if (similarity > 80 && rows[idx] !== rows[item.i]) {
          nearDuplicates.push({ rows: [idx, item.i], similarity });
        }
      }
    });
  });

  const exactRowSet = new Set(exactDuplicates.flat());
  const nearRowSet  = new Set(nearDuplicates.flatMap(d => d.rows));
  const combined = new Set(Array.from(exactRowSet).concat(Array.from(nearRowSet)));
  const totalAffected = combined.size;

  return { exactDuplicates, nearDuplicates, totalAffected };
}

// ─── NL Response for Duplicates ────────────────────────────────────────────────

export function duplicatesToNL(
  result: DuplicateResult,
  totalRows: number
): { headline: string; details: string[] } {
  if (!result.exactDuplicates.length && !result.nearDuplicates.length) {
    return {
      headline: 'No duplicate or near-duplicate rows detected.',
      details: ['All rows are unique within the selected columns.'],
    };
  }

  const headline = `Found ${result.exactDuplicates.length} exact duplicate group(s) ` +
    `and ${result.nearDuplicates.length} near-duplicate pair(s) ` +
    `— ${result.totalAffected} rows affected (${((result.totalAffected / totalRows) * 100).toFixed(1)}%).`;

  const details: string[] = [];

  result.exactDuplicates.slice(0, 3).forEach(group => {
    details.push(`Exact duplicate: rows ${group.map(r => r + 1).join(', ')}`);
  });

  result.nearDuplicates
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .forEach(pair => {
      details.push(`Near-duplicate (${pair.similarity}% similar): rows ${pair.rows.map(r => r + 1).join(' & ')}`);
    });

  return { headline, details };
}
