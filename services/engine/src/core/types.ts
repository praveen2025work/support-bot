export interface ChatMessage {
  id: string;
  text: string;
  sessionId: string;
  platform: "web" | "widget" | "teams";
  groupId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  feedbackType?: "suggestion_click" | "rephrase" | "retry" | "normal";
  previousMessageText?: string;
  timestamp: Date;
}

export interface ClassificationResult {
  intent: string;
  confidence: number;
  entities: ExtractedEntity[];
  sentiment?: SentimentResult;
  source: "nlp" | "fuzzy" | "fuzzy_synonym" | "ensemble" | "pattern";
  /** Typo corrections applied before classification, if any */
  corrections?: Array<{ from: string; to: string }>;
  /**
   * Top-3 ranked candidate intents when the ensemble top score lands in the
   * disambiguation band (NLP_DISAMBIG_FLOOR ≤ score < NLP_CONFIDENCE_THRESHOLD).
   * Each candidate carries the underlying queryName when one can be inferred
   * (e.g. classified as `query.execute` with a single bound query_name entity).
   * Populated only on the disambiguation path; undefined otherwise.
   */
  disambiguationCandidates?: DisambiguationCandidate[];
}

export interface DisambiguationCandidate {
  /** Underlying intent label (e.g. "query.execute", "analysis.profile"). */
  intent: string;
  /**
   * The query name to forceIntent when the candidate represents an
   * executable query. May be omitted for non-query intents.
   */
  queryName?: string;
  /** Combined ensemble score for this candidate. */
  score: number;
  /**
   * Optional human-friendly label for the chip (e.g. "Run monthly_revenue").
   * The UI may fall back to `queryName` or `intent` if absent.
   */
  label?: string;
  /** Optional short description for the chip secondary line. */
  description?: string;
}

export interface ExtractedEntity {
  entity: string;
  value: string;
  resolution?: Record<string, unknown>;
  start: number;
  end: number;
}

export interface SentimentResult {
  score: number;
  comparative: number;
  vote: "positive" | "neutral" | "negative";
}

export interface BotResponse {
  text: string;
  richContent?: RichContent;
  suggestions?: string[];
  sessionId: string;
  intent: string;
  confidence: number;
  executionMs?: number;
  referenceUrl?: string;
  /** The actual query name that was executed (e.g. "active_users"), distinct from intent. */
  queryName?: string;
  /** Name of the data source that answered the query (e.g. "sales-data.csv", "Products API") */
  sourceName?: string;
  /** Type of the data source */
  sourceType?: "csv" | "xlsx" | "api" | "document" | "url";
  /** Indicates how a follow-up was processed: local (in-memory) or requery (fresh API call) */
  followUpMode?: "local" | "requery";
  /** Contextual recommendations based on user behavior and content similarity */
  recommendations?: Array<{ type: string; name: string; reason: string }>;
  /** Anomaly alerts detected in query results */
  anomalies?: Array<{
    queryName: string;
    columnName: string;
    currentValue: number;
    expectedMean: number;
    zScore: number;
    severity: "info" | "warning" | "critical";
    direction: "spike" | "drop";
    message: string;
  }>;
  /** Truncation metadata — populated when results are capped for chat display */
  totalRowsBeforeTruncation?: number;
  displayedRows?: number;
  totalColumns?: number;
  estimatedSizeKB?: number;
  truncated?: boolean;
  /** Cross-surface actions the UI can render (e.g. "pin to dashboard", "open in gridboard") */
  crossSurfaceActions?: CrossSurfaceAction[];
  /**
   * "Did you mean?" disambiguation payload. Populated when the NLP ensemble
   * top score lands in the disambiguation band (`NLP_DISAMBIG_FLOOR ≤ score
   * < NLP_CONFIDENCE_THRESHOLD`). The UI renders these as clickable chips
   * with the headline above; clicking a chip POSTs back with `forceIntent`
   * set to the candidate's `queryName` (or intent label if no queryName).
   */
  disambiguation?: DisambiguationPayload;
}

export interface DisambiguationPayload {
  /** Headline microcopy shown above the chips. */
  headline: string;
  /** Top-3 candidates from the NLP ensemble. */
  candidates: DisambiguationCandidate[];
}

/** Action that enables navigation or data sharing between surfaces. */
export interface CrossSurfaceAction {
  type: "pin_to_dashboard" | "open_in_gridboard" | "ask_in_chat" | "export";
  label: string;
  /** Payload for the action (query name, filters, etc.) */
  payload: Record<string, unknown>;
}

export interface RichContent {
  type:
    | "url_list"
    | "query_result"
    | "multi_query_result"
    | "estimation"
    | "error"
    | "file_content"
    | "document_search"
    | "csv_table"
    | "csv_aggregation"
    | "csv_group_by"
    | "csv_summary"
    | "document_summary"
    | "knowledge_search"
    | "query_list"
    | "document_answer"
    | "document_upload_result"
    | "recommendations"
    | "column_profile"
    | "smart_summary"
    | "correlation_heatmap"
    | "distribution_histogram"
    | "anomaly_table"
    | "trend_analysis"
    | "duplicate_rows"
    | "missing_heatmap"
    | "clustering_result"
    | "decision_tree_result"
    | "forecast_result"
    | "pca_result"
    | "insight_report"
    | "root_cause";
  data: unknown;
}

export interface IntentOverlap {
  utterance: string;
  trainedIntent: string;
  classifiedIntent: string;
  confidence: number;
  secondBestIntent?: string;
  secondBestConfidence?: number;
}

export interface QueryChartConfig {
  defaultType:
    | "line"
    | "bar"
    | "pie"
    | "area"
    | "stacked-bar"
    | "stacked-area"
    | "none";
  labelKey?: string;
  valueKeys?: string[];
  height?: number;
  stacked?: boolean;
  showLegend?: boolean;
}

export interface ColumnConfig {
  idColumns?: string[];
  dateColumns?: string[];
  labelColumns?: string[];
  valueColumns?: string[];
  ignoreColumns?: string[];
}

/** Tracks a single follow-up operation in a chain (e.g. group → sort → top-5). */
export interface FollowUpStep {
  operation: string; // e.g. "group_by", "sort", "top_n", "filter", "aggregation"
  description: string; // human-readable, e.g. "group by region"
  timestamp: string;
}

export interface ConversationContext {
  sessionId: string;
  history: Array<{ role: "user" | "bot"; text: string; timestamp: Date }>;
  currentIntent?: string;
  pendingEntities?: Record<string, string>;
  lastApiResult?: unknown;
  lastQueryName?: string;
  lastQueryColumns?: string[];
  /** Last date filter applied (for query rewriter context enrichment) */
  lastDateFilter?: string;
  /** Entities extracted from last classification (for pronoun resolution) */
  lastEntities?: ExtractedEntity[];
  /** Chart/column config from the last executed query — preserved for follow-up rendering */
  lastChartConfig?: Record<string, unknown>;
  lastColumnConfig?: Record<string, unknown>;
  lastColumnMetadata?: unknown[];
  /** Ordered chain of follow-up operations applied to the current query result */
  followUpChain?: FollowUpStep[];
  /**
   * Column used in the most recent successful group-by follow-up. Lets a
   * subsequent "drill into <value>" / "show rows for <value>" message
   * filter the original (pre-group-by) result by groupCol = value
   * without the user having to repeat the column name. Cleared when a
   * fresh query is loaded.
   */
  lastGroupColumn?: string;
  /** Last analysis type run on the data (for contextual follow-up suggestions) */
  lastAnalysisType?: string;
  /** Anomalies detected in the last query result */
  lastAnomalies?: Array<{
    columnName: string;
    severity: "info" | "warning" | "critical";
    direction: "spike" | "drop";
    message: string;
  }>;
}
