/**
 * Root cause analysis — "why is X like this?" / "what's driving Y?"
 *
 * Two modes:
 *   1. CONCENTRATION (single snapshot)
 *      Given a target numeric column, find which dimension values
 *      contribute most to its total. Answers "what's driving revenue?"
 *      → "EMEA accounts for 45% of revenue (3.2M of 7.1M)."
 *
 *   2. CHANGE (current vs prior summary)
 *      Given a target column and a baseline numeric summary, find which
 *      dimensions explain the change. Answers "why did revenue drop?"
 *      → "EMEA was the largest contributor: down 18%, accounting for
 *         70% of the total drop."
 *
 * No LLM, no learned model. Same rule-based math powering the rest of
 * the auto-insights stack — every output is reproducible from the
 * input rows alone.
 *
 * Bounded by:
 *   - At most 5 contributors returned (more = noise)
 *   - Dimensions with cardinality > 50 are skipped (would degenerate
 *     into per-row contributions)
 *   - Aggregate-named columns (Avg_, Sum_, Max_, …) are filtered out
 *     as metrics — they're already summaries
 */

import { extractNumericColumns } from "../anomaly/numeric-utils";

const DERIVED_PREFIX =
  /^(min|max|p\d+|stdev|stddev|variance|count|sum|total|avg|average|mean|median)[_\s-]/i;
const MAX_CONTRIBUTORS = 5;
const MAX_DIMENSION_CARDINALITY = 50;
const MIN_TOTAL = 0.0001;

export type RootCauseKind = "concentration" | "change";

export interface RootCauseContributor {
  /** Dimension column name (e.g. "region"). */
  dimension: string;
  /** Value within that dimension (e.g. "EMEA"). */
  value: string;
  /** Total contribution to the metric (sum of metric values where dim === value). */
  contribution: number;
  /** Fraction of the metric's grand total this contributor represents. */
  shareOfTotal: number;
  /**
   * In change mode: delta vs baseline summary (current - baseline).
   * Positive = increased, negative = decreased.
   */
  delta?: number;
  /** In change mode: delta / baseline contribution, capped at ±10. */
  relativeDelta?: number;
  /** Number of rows that contributed. */
  rowCount: number;
}

export interface RootCauseResult {
  /** "concentration" (single snapshot) or "change" (vs baseline). */
  kind: RootCauseKind;
  /** Target numeric column being explained. */
  metric: string;
  /** Sum of the metric across all rows in the current dataset. */
  total: number;
  /** Baseline total when kind === "change". */
  baselineTotal?: number;
  /** Top contributors, ordered by absolute impact descending. */
  contributors: RootCauseContributor[];
  /** Short human-readable headline ("**EMEA** drives 45% of revenue"). */
  headline: string;
}

export interface RootCauseOptions {
  /** Override the auto-picked metric column. */
  metric?: string;
  /** When provided, runs in CHANGE mode comparing current rows to this baseline. */
  baseline?: { metric: string; total: number };
}

/**
 * Pick a metric column when the user hasn't named one. Heuristic: the
 * numeric column with the largest absolute total — usually the most
 * business-relevant one (revenue, count, latency) for this dataset.
 */
function autoPickMetric(
  rows: Record<string, unknown>[],
  headers: string[],
): string | null {
  const numeric = extractNumericColumns(rows).filter(
    (c) => !DERIVED_PREFIX.test(c) && headers.includes(c),
  );
  if (numeric.length === 0) return null;

  let best: string | null = null;
  let bestAbsTotal = -Infinity;
  for (const col of numeric) {
    let total = 0;
    for (const row of rows) {
      const v = Number(row[col]);
      if (Number.isFinite(v)) total += v;
    }
    if (Math.abs(total) > bestAbsTotal) {
      bestAbsTotal = Math.abs(total);
      best = col;
    }
  }
  return best;
}

/**
 * Identify dimension columns suitable for grouping. We accept any
 * non-numeric column with cardinality between 2 and MAX_DIMENSION_CARDINALITY.
 */
function findDimensionColumns(
  rows: Record<string, unknown>[],
  headers: string[],
  excludeColumn: string,
): string[] {
  const dims: string[] = [];
  for (const h of headers) {
    if (h === excludeColumn) continue;
    if (DERIVED_PREFIX.test(h)) continue;
    const distinct = new Set<string>();
    let numericRows = 0;
    for (const row of rows) {
      const v = row[h];
      if (typeof v === "number") {
        numericRows += 1;
        continue;
      }
      const s = String(v ?? "").trim();
      if (s) distinct.add(s);
    }
    if (
      numericRows < rows.length / 2 &&
      distinct.size >= 2 &&
      distinct.size <= MAX_DIMENSION_CARDINALITY
    ) {
      dims.push(h);
    }
  }
  return dims;
}

/**
 * Build root cause result. Returns null when the dataset can't support
 * a useful explanation (no numeric metric, no qualifying dimensions,
 * trivial totals).
 */
export function analyzeRootCause(
  rows: Record<string, unknown>[],
  headers: string[],
  options: RootCauseOptions = {},
): RootCauseResult | null {
  if (rows.length === 0 || headers.length === 0) return null;

  const metric = options.metric ?? autoPickMetric(rows, headers);
  if (!metric) return null;

  // Compute the current total — short-circuit if it's effectively zero.
  let total = 0;
  for (const row of rows) {
    const v = Number(row[metric]);
    if (Number.isFinite(v)) total += v;
  }
  if (Math.abs(total) < MIN_TOTAL) return null;

  const dimensions = findDimensionColumns(rows, headers, metric);
  if (dimensions.length === 0) return null;

  const isChangeMode = !!options.baseline && options.baseline.metric === metric;
  const baselineTotal = options.baseline?.total;

  // Aggregate metric per (dimension, value).
  const allContributors: RootCauseContributor[] = [];
  for (const dim of dimensions) {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const dimRaw = row[dim];
      const dimVal = String(dimRaw ?? "").trim();
      if (!dimVal) continue;
      const metricVal = Number(row[metric]);
      if (!Number.isFinite(metricVal)) continue;
      const b = buckets.get(dimVal) ?? { sum: 0, count: 0 };
      b.sum += metricVal;
      b.count += 1;
      buckets.set(dimVal, b);
    }

    for (const [value, b] of buckets) {
      const share = total !== 0 ? b.sum / total : 0;
      if (Math.abs(share) < 0.01) continue; // < 1% contribution = noise
      allContributors.push({
        dimension: dim,
        value,
        contribution: b.sum,
        shareOfTotal: share,
        rowCount: b.count,
      });
    }
  }

  if (allContributors.length === 0) return null;

  let ranked: RootCauseContributor[];
  let kind: RootCauseKind;
  let headline: string;

  if (isChangeMode && baselineTotal !== undefined) {
    kind = "change";
    const grandDelta = total - baselineTotal;
    // For each contributor we don't have a per-dimension baseline — we
    // only have the global baseline total. So delta-by-dimension is
    // approximated as: (current contribution) - (baseline total * current share).
    // The contributor whose CURRENT share differs most from the prior
    // proportional contribution is the biggest mover.
    for (const c of allContributors) {
      const proportionalBaseline =
        Math.abs(baselineTotal) > MIN_TOTAL
          ? baselineTotal * c.shareOfTotal
          : 0;
      c.delta = c.contribution - proportionalBaseline;
      const denom = Math.max(Math.abs(proportionalBaseline), MIN_TOTAL);
      c.relativeDelta = Math.max(-10, Math.min(10, c.delta / denom));
    }
    ranked = [...allContributors].sort(
      (a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0),
    );
    const top = ranked[0];
    const direction = (top.delta ?? 0) >= 0 ? "up" : "down";
    const grandDirection = grandDelta >= 0 ? "rose" : "fell";
    headline = `**${metric}** ${grandDirection} by ${formatNumber(Math.abs(grandDelta))} — biggest mover: **${top.value}** (${top.dimension}, ${direction} ${formatNumber(Math.abs(top.delta ?? 0))}).`;
  } else {
    kind = "concentration";
    ranked = [...allContributors].sort(
      (a, b) => Math.abs(b.shareOfTotal) - Math.abs(a.shareOfTotal),
    );
    const top = ranked[0];
    const pct = Math.round(Math.abs(top.shareOfTotal) * 100);
    headline = `**${top.value}** (${top.dimension}) drives ${pct}% of **${metric}** (${formatNumber(top.contribution)} of ${formatNumber(total)}).`;
  }

  return {
    kind,
    metric,
    total,
    ...(baselineTotal !== undefined && { baselineTotal }),
    contributors: ranked.slice(0, MAX_CONTRIBUTORS),
    headline,
  };
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}
