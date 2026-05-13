/**
 * Rule-based change narratives.
 *
 * Compares the current query result's numeric summary against the
 * most recent prior snapshot stored by the anomaly detector. When a
 * column has shifted by more than a small floor — but not enough to
 * trip the anomaly z-score threshold — we emit a one-line FYI
 * narrative. The intent: catch the user up on movement they'd
 * otherwise miss because it didn't cross the warning bar.
 *
 * No LLM. Pure delta math + a tiny set of templates. Bounded by:
 *   - at most 2 narratives per response (caller cap, total auto-insights ≤ 3)
 *   - skip columns already covered by an anomaly alert (anomaly text
 *     is louder; double-counting would noise the response)
 *   - require ≥ 5% relative change AND ≥ 0.01 absolute change to be
 *     worth saying anything
 *   - require the prior snapshot to be > 60s older than now, so we
 *     don't compare against a snapshot that this very same request
 *     just wrote
 */

import { promises as fs } from "fs";
import { paths } from "../../lib/env-config";
import { logger } from "../../lib/logger";
import { aggregateColumn } from "../anomaly/numeric-utils";
import type { AutoInsight, InsightSeverity } from "./auto-insights";
import type { QueryResultSnapshot } from "../anomaly/types";

const MIN_RELATIVE_CHANGE = 0.05;
const MIN_ABSOLUTE_CHANGE = 0.01;
const MIN_AGE_MS = 60_000;
const MAX_NARRATIVES = 2;
const DERIVED_PREFIX =
  /^(min|max|p\d+|stdev|stddev|variance|count|sum|total|avg|average|mean|median)[_\s-]/i;

/**
 * Read the snapshots file for a (group, query) and return the
 * latest one whose timestamp is older than MIN_AGE_MS ago. The
 * file is small (one line per query execution), so reading it
 * fully is fine; if it grows huge an admin should rotate it via
 * the same JSONL rotation machinery used elsewhere.
 */
export async function loadPreviousSnapshot(
  groupId: string,
  queryName: string,
): Promise<QueryResultSnapshot | null> {
  const file = paths.data.anomalySnapshots(groupId);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf-8");
  } catch {
    return null;
  }
  const lines = raw.trim().split("\n");
  const now = Date.now();
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let snap: QueryResultSnapshot;
    try {
      snap = JSON.parse(line) as QueryResultSnapshot;
    } catch {
      continue;
    }
    if (snap.queryName !== queryName) continue;
    const age = now - new Date(snap.timestamp).getTime();
    if (Number.isFinite(age) && age >= MIN_AGE_MS) return snap;
  }
  return null;
}

/**
 * Build narrative insights from a delta between the current query
 * result and its most recent prior snapshot.
 *
 * @param rows               Current row set (post-mask, post-strip).
 * @param previous           Prior snapshot loaded via loadPreviousSnapshot.
 * @param excludeColumns     Columns already flagged by anomaly detection
 *                           — skipped to avoid double-narration.
 */
export function buildChangeNarratives(
  rows: Record<string, unknown>[],
  previous: QueryResultSnapshot | null,
  excludeColumns: Set<string>,
): AutoInsight[] {
  if (!previous || rows.length === 0) return [];
  const previousSummary = previous.numericSummary || {};

  const candidates: Array<{
    column: string;
    delta: number;
    relative: number;
    current: number;
    previous: number;
  }> = [];

  for (const [column, prevValue] of Object.entries(previousSummary)) {
    if (excludeColumns.has(column)) continue;
    if (DERIVED_PREFIX.test(column)) continue;
    if (!Number.isFinite(prevValue)) continue;
    const currentValue = aggregateColumn(rows, column);
    if (!Number.isFinite(currentValue)) continue;
    const delta = currentValue - prevValue;
    if (Math.abs(delta) < MIN_ABSOLUTE_CHANGE) continue;
    const denom = Math.max(Math.abs(prevValue), MIN_ABSOLUTE_CHANGE);
    const relative = delta / denom;
    if (Math.abs(relative) < MIN_RELATIVE_CHANGE) continue;
    candidates.push({
      column,
      delta,
      relative,
      current: currentValue,
      previous: prevValue,
    });
  }

  // Sort by absolute relative change, descending — the biggest movers
  // come first.
  candidates.sort((a, b) => Math.abs(b.relative) - Math.abs(a.relative));

  const ageMs = Date.now() - new Date(previous.timestamp).getTime();
  const ageLabel = formatAge(ageMs);

  const narratives: AutoInsight[] = [];
  for (const c of candidates.slice(0, MAX_NARRATIVES)) {
    const direction = c.relative >= 0 ? "up" : "down";
    const pct = Math.abs(c.relative * 100);
    const pctText = pct >= 100 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`;
    const severity: InsightSeverity = pct >= 25 ? "warning" : "info";
    narratives.push({
      kind: "anomaly",
      column: c.column,
      severity,
      text: `**${c.column}** is ${direction} ${pctText} vs. ${ageLabel} (${formatNumber(c.previous)} → ${formatNumber(c.current)}).`,
    });
  }

  if (narratives.length > 0) {
    logger.debug(
      {
        queryName: previous.queryName,
        narratives: narratives.length,
        ageMs,
      },
      "change-narrative: emitted FYI deltas",
    );
  }

  return narratives;
}

function formatAge(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "the last run";
  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d ago`;
  return "the last run";
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(2);
}
