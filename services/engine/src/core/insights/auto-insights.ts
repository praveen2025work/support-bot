/**
 * Auto-insights: proactive findings prepended to query responses.
 *
 * The CIO ask from the architecture review: "the bot should
 * proactively say 'hey, you didn't ask but EMEA dropped 12%'".
 * Anomaly detection already runs on every result, but the findings
 * stayed as silent badges. This module surfaces them as text the
 * user actually reads.
 *
 * Bounded by design:
 *   - Maximum 3 insights per response (more = noise)
 *   - Only runs on initial query load, skip on follow-ups
 *   - Skip when data is too small to be interesting (< 5 rows)
 *   - Skip when only one numeric column would saturate every type
 *
 * No LLM. All findings are computed from existing ML modules and
 * rendered through static templates — same explainability model as
 * the rest of the engine.
 */

import type { CsvData } from "../api-connector/csv-analyzer";

export type InsightSeverity = "info" | "warning" | "critical";

/**
 * Structural shape of an anomaly finding. Matches the fields we need
 * out of AnomalyResult (core/anomaly/types.ts) without coupling to
 * the full type — callers can pass either the raw detector output
 * or the trimmed badge shape stored on BotResponse.anomalies.
 */
interface AnomalyLike {
  columnName: string;
  severity: InsightSeverity;
  message: string;
}

export interface AutoInsight {
  /** Machine-readable kind for UI badge / icon selection. */
  kind: "anomaly" | "top_value" | "low_value" | "spread" | "concentration";
  text: string;
  severity: InsightSeverity;
  /** Optional column name the insight is about. */
  column?: string;
}

const MAX_INSIGHTS = 3;
const MIN_ROWS = 5;

/**
 * Build auto-insights from a fresh query result.
 *
 * Inputs:
 *   - csvData: headers + rows (post-PII masking, post-display-strip)
 *   - anomalies: alerts the anomaly detector returned for this query
 *
 * Output: ordered list of insights, severity-descending. Empty array
 * when nothing interesting is found — caller renders nothing extra.
 */
export function buildAutoInsights(
  csvData: { headers: string[]; rows: Record<string, string | number>[] },
  anomalies?: AnomalyLike[],
): AutoInsight[] {
  if (csvData.rows.length < MIN_ROWS) return [];

  const out: AutoInsight[] = [];

  // 1. Anomalies first — the highest-signal finding. The anomaly
  //    detector already classified severity, so we just render text.
  //    Critical → warning → info ordering.
  if (anomalies && anomalies.length > 0) {
    const sorted = [...anomalies].sort((a, b) => sevWeight(b) - sevWeight(a));
    for (const a of sorted.slice(0, 2)) {
      out.push({
        kind: "anomaly",
        text: `**${a.columnName}** ${a.message}`,
        severity: a.severity,
        column: a.columnName,
      });
    }
  }

  // 2. Top mover: find the numeric column with the widest absolute
  //    range and report which row owns the maximum. Skip if it's an
  //    aggregate column whose name suggests it's already a derived
  //    metric (Avg_, Max_, Min_, Sum_) — those are stats over
  //    something, not raw observations the user wants ranked.
  if (out.length < MAX_INSIGHTS) {
    const topMover = findTopMover(csvData);
    if (topMover) out.push(topMover);
  }

  // 3. Concentration: if a categorical column has its top value
  //    accounting for > 50% of rows, that's worth flagging.
  if (out.length < MAX_INSIGHTS) {
    const concentration = findConcentration(csvData);
    if (concentration) out.push(concentration);
  }

  return out.slice(0, MAX_INSIGHTS);
}

function sevWeight(a: AnomalyLike): number {
  if (a.severity === "critical") return 3;
  if (a.severity === "warning") return 2;
  return 1;
}

const DERIVED_PREFIX =
  /^(avg|average|mean|max|maximum|min|minimum|sum|total|count|median|stdev)[_\s-]/i;

function findTopMover(csvData: CsvData): AutoInsight | null {
  let bestCol: string | null = null;
  let bestRange = 0;
  let bestMax = -Infinity;
  let bestMaxRow: Record<string, string | number> | null = null;
  let bestMin = Infinity;
  let bestMinRow: Record<string, string | number> | null = null;

  for (const h of csvData.headers) {
    if (DERIVED_PREFIX.test(h)) continue;
    let mn = Infinity;
    let mx = -Infinity;
    let mxRow: Record<string, string | number> | null = null;
    let mnRow: Record<string, string | number> | null = null;
    let count = 0;
    for (const row of csvData.rows) {
      const raw = row[h];
      const v = typeof raw === "number" ? raw : parseFloat(String(raw));
      if (!Number.isFinite(v)) continue;
      count += 1;
      if (v > mx) {
        mx = v;
        mxRow = row;
      }
      if (v < mn) {
        mn = v;
        mnRow = row;
      }
    }
    if (count < MIN_ROWS) continue;
    const range = mx - mn;
    if (range > bestRange) {
      bestRange = range;
      bestCol = h;
      bestMax = mx;
      bestMaxRow = mxRow;
      bestMin = mn;
      bestMinRow = mnRow;
    }
  }

  if (!bestCol || !bestMaxRow) return null;
  // Identify a useful label column for the top/bottom row — the first
  // non-numeric header.
  const labelCol = csvData.headers.find(
    (h) =>
      h !== bestCol &&
      !DERIVED_PREFIX.test(h) &&
      typeof csvData.rows[0][h] === "string",
  );
  const labelTop = labelCol ? String(bestMaxRow[labelCol]) : "top row";
  const labelBot = labelCol && bestMinRow ? String(bestMinRow[labelCol]) : null;

  let text = `**${labelTop}** has the highest **${bestCol}** at ${formatNumber(bestMax)}`;
  if (labelBot && labelBot !== labelTop) {
    text += `; **${labelBot}** is the lowest at ${formatNumber(bestMin)}`;
  }
  text += ".";
  return {
    kind: "top_value",
    text,
    severity: "info",
    column: bestCol,
  };
}

function findConcentration(csvData: CsvData): AutoInsight | null {
  // Find the categorical column with the most-concentrated top value.
  // "Categorical" = non-numeric, string-valued, with cardinality
  // between 2 and rows.length/2 (not unique-per-row, not single-value).
  let bestCol: string | null = null;
  let bestRatio = 0.5; // floor — only flag if > 50% concentrated
  let bestValue: string | null = null;
  let bestCount = 0;
  const total = csvData.rows.length;

  for (const h of csvData.headers) {
    if (DERIVED_PREFIX.test(h)) continue;
    const counts = new Map<string, number>();
    let numericRows = 0;
    for (const row of csvData.rows) {
      const v = row[h];
      if (typeof v === "number") {
        numericRows += 1;
        continue;
      }
      const s = String(v ?? "").trim();
      if (!s) continue;
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    if (numericRows > 0 || counts.size < 2 || counts.size > total / 2) continue;
    for (const [val, c] of counts) {
      const ratio = c / total;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestCol = h;
        bestValue = val;
        bestCount = c;
      }
    }
  }

  if (!bestCol || !bestValue) return null;
  return {
    kind: "concentration",
    text: `**${bestValue}** accounts for ${Math.round(bestRatio * 100)}% of rows by **${bestCol}** (${bestCount} of ${total}).`,
    severity: bestRatio > 0.8 ? "warning" : "info",
    column: bestCol,
  };
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}

/**
 * Format a list of insights as a one-paragraph prefix for the bot text.
 * Returns empty string when the list is empty — callers can just
 * concatenate unconditionally.
 */
export function renderInsightPrefix(insights: AutoInsight[]): string {
  if (insights.length === 0) return "";
  const lines = insights.map((i) => `💡 ${i.text}`);
  return lines.join("\n") + "\n\n";
}
