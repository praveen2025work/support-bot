export const INTENTS = {
  GREETING: "greeting",
  FAREWELL: "farewell",
  HELP: "help",
  QUERY_EXECUTE: "query.execute",
  QUERY_MULTI: "query.multi",
  QUERY_LIST: "query.list",
  QUERY_ESTIMATE: "query.estimate",
  URL_FIND: "url.find",
  KNOWLEDGE_SEARCH: "knowledge.search",
  DOCUMENT_ASK: "document.ask",
  DOCUMENT_LIST: "document.list",
  QUERY_SEARCH: "query.search",
  QUERY_COMPARE: "query.compare",
  FOLLOWUP_GROUP_BY: "followup.group_by",
  FOLLOWUP_SORT: "followup.sort",
  FOLLOWUP_FILTER: "followup.filter",
  FOLLOWUP_SUMMARY: "followup.summary",
  FOLLOWUP_TOP_N: "followup.top_n",
  FOLLOWUP_AGGREGATION: "followup.aggregation",
  FOLLOWUP_DATA_LOOKUP: "followup.data_lookup",

  // Conversational intents
  CONFIRM: "confirm",
  NEGATE: "negate",
  CLARIFY: "clarify",

  // Action intents
  EXPORT: "export",
  UNDO: "undo",

  // Analysis intents (ML/statistical)
  ANALYSIS_PROFILE: "analysis.profile",
  ANALYSIS_SMART_SUMMARY: "analysis.smart_summary",
  ANALYSIS_CORRELATION: "analysis.correlation",
  ANALYSIS_DISTRIBUTION: "analysis.distribution",
  ANALYSIS_ANOMALY: "analysis.anomaly",
  ANALYSIS_TREND: "analysis.trend",
  ANALYSIS_DUPLICATES: "analysis.duplicates",
  ANALYSIS_MISSING: "analysis.missing",
  ANALYSIS_CLUSTER: "analysis.cluster",
  ANALYSIS_DECISION_TREE: "analysis.decision_tree",
  ANALYSIS_FORECAST: "analysis.forecast",
  ANALYSIS_PCA: "analysis.pca",
  ANALYSIS_REPORT: "analysis.report",
  ANALYSIS_ROOT_CAUSE: "analysis.root_cause",
} as const;

// Lowered from 0.6 to 0.5 per a follow-up audit (2026-05-11): with the
// corpus pared to only queries that have catalog records, many catalog
// queries (active_users, infrastructure_costs, customer_churn, ...)
// were classifying at ~0.51 — confidently correct, but landing in the
// disambig band [0.4, 0.6) and forcing the user through a chip click.
// B-2.0 calibration showed threshold 0.5 captures 19/25 correct
// confident answers with still zero wrong-confident, so the trade is
// pure UX win for the in-catalog case. See
// tests/nlp/threshold-calibration-results.md for the full sweep.
export const NLP_CONFIDENCE_THRESHOLD = 0.5;
// Lower bound of the disambiguation band: scores between this and
// NLP_CONFIDENCE_THRESHOLD trigger "Did you mean?" candidates.
// Below this, the system says "I don't understand" instead of guessing.
export const NLP_DISAMBIG_FLOOR = 0.4;
export const FUZZY_CONFIDENCE_THRESHOLD = 0.5;
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const API_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_SESSIONS = 10_000;

// Row-limit pushdown: the explicit per-request cap the engine sends to the
// connector (POST body `maxRows` + GET `maxRows` query param) so it can bound
// the result set server-side instead of streaming everything back. Default
// 10000 mirrors today's effective connector default — DO NOT lower it: the
// retained __fullRows set must keep enough rows for correct follow-up
// group-by / aggregation. Override with MAX_FETCH_ROWS env at deploy time.
export const MAX_FETCH_ROWS = parseInt(
  process.env.MAX_FETCH_ROWS || "10000",
  10,
);

// Upper bound on the full (untruncated) result snapshot the handler retains on
// the conversation context as __fullRows for follow-up group-by / aggregation.
// Huge datasets would otherwise pin memory across sessions. Defaults to
// MAX_FETCH_ROWS so the retained snapshot covers everything the engine actually
// fetched — capping it BELOW MAX_FETCH_ROWS would make follow-up aggregation
// silently operate on a truncated subset for mid-sized results. If source rows
// exceed the cap we retain the first FULLROWS_MAX and flag truncation so a
// follow-up can't silently claim completeness. Override with FULLROWS_MAX env
// (lower it only if memory pressure outweighs follow-up-aggregation accuracy).
export const FULLROWS_MAX = parseInt(
  process.env.FULLROWS_MAX || String(MAX_FETCH_ROWS),
  10,
);

// Per-query result cache. Short TTL by default so repeated identical
// requests inside a single session feel snappy without serving badly
// stale data. UI shows a "cached" badge with the age so users can
// decide whether to refresh manually.
export const QUERY_RESULT_CACHE_TTL_MS = 60 * 1000; // 60 seconds
export const QUERY_RESULT_CACHE_MAX_ENTRIES = 500;

// Learning pipeline constants
export const LEARNING_CONFIDENCE_THRESHOLD = 0.4;
export const AUTO_LEARN_PROCESS_INTERVAL = 50;
export const AUTO_LEARN_MIN_POSITIVE = 3;
export const AUTO_LEARN_MAX_NEG_RATIO = 0.2;
