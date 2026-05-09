import { logger } from "@/lib/logger";
import { NLP_CONFIDENCE_THRESHOLD, NLP_DISAMBIG_FLOOR } from "../constants";
import type {
  ConversationContext,
  DisambiguationCandidate,
  DisambiguationPayload,
  FollowUpStep,
} from "../types";
import type { Recommendation } from "../recommendations/recommendation-engine";
import type { Query } from "../api-connector/types";

/**
 * Generates context-aware follow-up suggestions based on:
 * 1. Current follow-up chain (avoid repeating operations, suggest next logical step)
 * 2. Anomaly data (prompt investigation when anomalies are detected)
 * 3. Analysis results (suggest deeper dives after ML analysis)
 * 4. Recommendation engine output (ML-driven query suggestions)
 * 5. Available columns in the data (parameterized suggestions)
 */

/** Max suggestions to return */
const MAX_SUGGESTIONS = 5;

interface SuggestionInput {
  /** Static suggestions from the handler (existing behavior) */
  handlerSuggestions?: string[];
  /** Columns available in the current data */
  columns?: string[];
  /** ML recommendations from the engine */
  recommendations?: Recommendation[];
  /** The operation that was just performed */
  currentOperation?: string;
}

/** Scored suggestion for ranking */
interface ScoredSuggestion {
  text: string;
  score: number;
  source: "chain" | "anomaly" | "analysis" | "recommendation" | "handler";
}

/**
 * Generate smart, context-aware suggestions by combining multiple signals.
 */
export function generateSmartSuggestions(
  context: ConversationContext,
  input: SuggestionInput,
): string[] {
  const scored: ScoredSuggestion[] = [];
  const seen = new Set<string>();

  const addIfNew = (
    text: string,
    score: number,
    source: ScoredSuggestion["source"],
  ) => {
    const normalized = text.toLowerCase().trim();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    scored.push({ text, score, source });
  };

  const chain = context.followUpChain ?? [];
  const chainOps = new Set(chain.map((s) => s.operation));

  // 1. Anomaly-triggered suggestions (highest priority when anomalies exist)
  if (context.lastAnomalies && context.lastAnomalies.length > 0) {
    const critical = context.lastAnomalies.find(
      (a) => a.severity === "critical",
    );
    const warning = context.lastAnomalies.find((a) => a.severity === "warning");
    const top = critical ?? warning ?? context.lastAnomalies[0];

    addIfNew(`Find outliers in ${top.columnName}`, 0.95, "anomaly");
    if (top.direction === "spike") {
      addIfNew(`Top 10 by ${top.columnName}`, 0.9, "anomaly");
    } else {
      addIfNew(`Bottom 10 by ${top.columnName}`, 0.9, "anomaly");
    }
    if (
      !chainOps.has("group_by") &&
      input.columns &&
      input.columns.length > 1
    ) {
      const groupCol = input.columns.find(
        (c) => c !== top.columnName && !isNumericColumnName(c),
      );
      if (groupCol) {
        addIfNew(`Group by ${groupCol}`, 0.85, "anomaly");
      }
    }
  }

  // 2. Analysis-driven suggestions
  if (context.lastAnalysisType) {
    const analysisFollowUps = getAnalysisFollowUps(context.lastAnalysisType);
    for (let i = 0; i < analysisFollowUps.length; i++) {
      addIfNew(analysisFollowUps[i], 0.8 - i * 0.05, "analysis");
    }
  }

  // 3. Chain-aware suggestions (suggest next logical step)
  if (chain.length > 0 && input.columns) {
    const chainSuggestions = getChainSuggestions(
      chain,
      input.columns,
      input.currentOperation,
    );
    for (let i = 0; i < chainSuggestions.length; i++) {
      addIfNew(chainSuggestions[i], 0.75 - i * 0.05, "chain");
    }
  }

  // 4. Recommendation engine suggestions
  if (input.recommendations && input.recommendations.length > 0) {
    for (let i = 0; i < input.recommendations.length; i++) {
      const rec = input.recommendations[i];
      const label = rec.type === "query" ? `Run ${rec.name}` : rec.name;
      addIfNew(label, 0.6 - i * 0.05, "recommendation");
    }
  }

  // 5. Handler suggestions (existing static suggestions, lowest priority)
  if (input.handlerSuggestions) {
    for (let i = 0; i < input.handlerSuggestions.length; i++) {
      addIfNew(input.handlerSuggestions[i], 0.5 - i * 0.05, "handler");
    }
  }

  // Sort by score descending and return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_SUGGESTIONS).map((s) => s.text);
}

/**
 * Record a follow-up operation in the chain.
 * Resets the chain when a new query is executed.
 */
export function recordFollowUpStep(
  context: ConversationContext,
  operation: string,
  description: string,
): void {
  if (!context.followUpChain) {
    context.followUpChain = [];
  }
  // Cap chain length to prevent unbounded growth
  if (context.followUpChain.length >= 20) {
    context.followUpChain = context.followUpChain.slice(-19);
  }
  context.followUpChain.push({
    operation,
    description,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Reset the follow-up chain (called when a new query is executed).
 */
export function resetFollowUpChain(context: ConversationContext): void {
  context.followUpChain = [];
  context.lastAnalysisType = undefined;
  context.lastAnomalies = undefined;
}

// ── Disambiguation suggestion category ──────────────────────────────
//
// When the NLP ensemble produces a score in the disambiguation band
// [NLP_DISAMBIG_FLOOR, NLP_CONFIDENCE_THRESHOLD), the engine surfaces top-3
// candidate intents as clickable chips instead of guessing. This is the
// new "disambiguation" suggestion category — sibling to chain/anomaly/
// analysis/recommendation/handler used by `generateSmartSuggestions`.
//
// The chip primitive itself is the same `<SuggestionChips>` UI component
// (per locked design — no new rich-content type). The richer payload
// returned here lets the UI attach `forceIntent` to clicks and render a
// chip-name + chip-desc stack with a headline above.

/** Locked microcopy from the design doc. */
const DISAMBIG_HEADLINE_DEFAULT =
  "I'm not sure which one you meant — pick one to run.";
const DISAMBIG_HEADLINE_LOW_CONFIDENCE =
  "Best guesses — none of these felt very confident:";

/**
 * Threshold below which the headline softens to "best guesses" wording.
 * Mid-band of the disambiguation range (locked at 0.5 per design — sits
 * exactly between NLP_DISAMBIG_FLOOR=0.4 and NLP_CONFIDENCE_THRESHOLD=0.6).
 */
const LOW_CONFIDENCE_HEADLINE_CUTOFF = 0.5;

interface BuildDisambiguationInput {
  /** Top-3 candidates from `ClassificationResult.disambiguationCandidates`. */
  candidates: DisambiguationCandidate[];
  /** All queries available to the user's group — used to enrich candidate
   * labels/descriptions and to filter out queries the user isn't permitted
   * to run. The caller is responsible for passing a group-scoped list. */
  availableQueries?: Query[];
}

/**
 * Build the "Did you mean?" disambiguation payload from the NLP ensemble's
 * top-3 candidates. Filters candidates whose underlying queryName isn't in
 * the user's group, enriches them with descriptions, and picks the headline
 * variant based on the top score.
 *
 * Returns `undefined` when there are no usable candidates (the response
 * generator should fall through to the "I don't understand" path or skip
 * the disambig surface entirely).
 */
export function buildDisambiguationPayload(
  input: BuildDisambiguationInput,
): DisambiguationPayload | undefined {
  const { candidates, availableQueries } = input;
  if (!candidates || candidates.length === 0) return undefined;

  // Build a queryName → Query lookup for description/label enrichment and
  // group permission filtering. Lookup keys are lowercased for case-insensitive
  // match (matches the catalog/QueryService convention).
  const queryByName = new Map<string, Query>();
  if (availableQueries) {
    for (const q of availableQueries) {
      queryByName.set(q.name.toLowerCase(), q);
    }
  }

  const enriched: DisambiguationCandidate[] = [];
  for (const cand of candidates) {
    // Skip out-of-band scores defensively (the NLP layer should already
    // filter these, but the public function should be safe).
    if (
      cand.score < NLP_DISAMBIG_FLOOR ||
      cand.score >= NLP_CONFIDENCE_THRESHOLD
    ) {
      continue;
    }

    if (cand.queryName) {
      const lookup = queryByName.get(cand.queryName.toLowerCase());
      // When availableQueries is provided and the candidate references a
      // query not in the group, drop it — the chip would 400 on click.
      if (availableQueries && !lookup) {
        logger.warn(
          { queryName: cand.queryName, intent: cand.intent },
          "Disambiguation candidate query not in user's group — dropping",
        );
        continue;
      }
      enriched.push({
        ...cand,
        label: lookup?.name ?? cand.queryName,
        description: lookup?.description ?? cand.description,
      });
    } else {
      // Non-query intents (e.g. analysis.profile, knowledge.search) — keep
      // them in the chip list with the intent label as the chip name.
      enriched.push({
        ...cand,
        label: cand.label ?? humanizeIntent(cand.intent),
        description: cand.description,
      });
    }
  }

  if (enriched.length === 0) return undefined;

  const topScore = enriched[0]?.score ?? 0;
  const headline =
    topScore < LOW_CONFIDENCE_HEADLINE_CUTOFF
      ? DISAMBIG_HEADLINE_LOW_CONFIDENCE
      : DISAMBIG_HEADLINE_DEFAULT;

  return {
    headline,
    candidates: enriched,
  };
}

/** Strip the `<group>.` prefix and convert snake_case to Title Case. */
function humanizeIntent(intent: string): string {
  const last = intent.split(".").pop() ?? intent;
  return last
    .split("_")
    .map((part) =>
      part.length === 0 ? part : part[0].toUpperCase() + part.slice(1),
    )
    .join(" ");
}

// ── Internal helpers ─────────────────────────────────────────────────

/** Suggest next steps based on what operations have already been chained. */
function getChainSuggestions(
  chain: FollowUpStep[],
  columns: string[],
  _currentOp?: string,
): string[] {
  const ops = new Set(chain.map((s) => s.operation));
  const suggestions: string[] = [];

  // After group_by → suggest sort or aggregation
  if (ops.has("group_by") && !ops.has("sort")) {
    suggestions.push("Sort by count desc");
  }
  if (ops.has("group_by") && !ops.has("top_n")) {
    suggestions.push("Top 5");
  }

  // After sort → suggest top-N or summary
  if (ops.has("sort") && !ops.has("top_n")) {
    suggestions.push("Top 10");
  }
  if (ops.has("sort") && !ops.has("summary")) {
    suggestions.push("Summarize");
  }

  // After filter → suggest group_by or aggregation
  if (ops.has("filter") && !ops.has("group_by")) {
    const catCol = columns.find((c) => !isNumericColumnName(c));
    if (catCol) suggestions.push(`Group by ${catCol}`);
  }
  if (ops.has("filter") && !ops.has("aggregation")) {
    const numCol = columns.find((c) => isNumericColumnName(c));
    if (numCol) suggestions.push(`Avg ${numCol}`);
  }

  // After aggregation → suggest another aggregation type
  if (ops.has("aggregation") && !ops.has("group_by")) {
    const catCol = columns.find((c) => !isNumericColumnName(c));
    if (catCol) suggestions.push(`Group by ${catCol}`);
  }

  // Always offer summary if not yet done and chain is non-trivial
  if (chain.length >= 2 && !ops.has("summary")) {
    suggestions.push("Summarize");
  }

  // Suggest analysis if chain is long enough
  if (chain.length >= 2) {
    suggestions.push("Profile columns");
  }

  return suggestions;
}

/** Get follow-up suggestions specific to the last analysis type. */
function getAnalysisFollowUps(analysisType: string): string[] {
  const map: Record<string, string[]> = {
    "analysis.profile": ["Show correlations", "Find outliers", "Smart summary"],
    "analysis.smart_summary": [
      "Show correlations",
      "Find outliers",
      "Forecast ahead",
    ],
    "analysis.correlation": [
      "PCA analysis",
      "Cluster the data",
      "Find outliers",
    ],
    "analysis.distribution": [
      "Find outliers",
      "Show trend",
      "Show correlations",
    ],
    "analysis.anomaly": ["Show trend", "Group by category", "Forecast ahead"],
    "analysis.trend": ["Forecast ahead", "Find outliers", "Show correlations"],
    "analysis.duplicates": [
      "Find outliers",
      "Show missing values",
      "Smart summary",
    ],
    "analysis.missing": ["Find outliers", "Profile columns", "Smart summary"],
    "analysis.cluster": ["PCA analysis", "Show correlations", "Decision tree"],
    "analysis.decision_tree": [
      "Show correlations",
      "Cluster the data",
      "Profile columns",
    ],
    "analysis.forecast": ["Show trend", "Find outliers", "Show correlations"],
    "analysis.pca": [
      "Cluster the data",
      "Show correlations",
      "Profile columns",
    ],
    "analysis.report": [
      "Show correlations",
      "Forecast ahead",
      "Cluster the data",
    ],
  };
  return (
    map[analysisType] ?? ["Profile columns", "Smart summary", "Find outliers"]
  );
}

/** Heuristic: column names containing numeric-y keywords are likely numeric. */
function isNumericColumnName(col: string): boolean {
  const lower = col.toLowerCase();
  return /(?:count|total|sum|avg|amount|price|revenue|cost|rate|score|hours|days|quantity|num|percent|pct|ratio)/.test(
    lower,
  );
}
