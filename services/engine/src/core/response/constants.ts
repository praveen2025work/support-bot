export const FILTER_ENTITIES = [
  "time_period",
  "region",
  "team",
  "environment",
  "severity",
];

export const STOP_WORDS = new Set([
  "run",
  "search",
  "show",
  "execute",
  "find",
  "in",
  "for",
  "about",
  "the",
  "what",
  "does",
  "say",
  "look",
  "up",
  "query",
  "me",
  "of",
  "is",
  "a",
  "an",
  "get",
  "fetch",
  "pull",
  "can",
  "you",
  "i",
  "need",
  "want",
  "to",
  "how",
  "much",
  "many",
  "from",
  "with",
  "by",
  "at",
  "on",
  "it",
  "that",
  "this",
]);

// Pattern for follow-up questions about previous query results
export const FOLLOWUP_PATTERN =
  /^\s*(what(?:'s|\s+is|\s+are)?|show(?:\s+me)?|get|tell\s+me|where(?:'s|\s+is)?)\s+(?:the\s+)?(.+)/i;
// Words to strip when matching column names
export const FOLLOWUP_NOISE = new Set([
  "the",
  "a",
  "an",
  "of",
  "from",
  "in",
  "result",
  "results",
  "value",
  "field",
  "column",
  "data",
  "previous",
  "last",
]);

// Pattern for filter follow-up: re-run last query with a filter
export const FILTER_FOLLOWUP_PATTERN =
  /\b(?:filter|show|with|only|just|where|for|in)\b.*\b(region|team|environment|severity|time_period|period|quarter|date_range|priority)\b/i;

// Data operation follow-up patterns
export const GROUP_BY_PATTERN = /\bgroup(?:ed)?\s+by\b/i;
export const SORT_PATTERN = /\b(?:sort|order)(?:ed)?\s+by\b/i;
export const SUMMARY_PATTERN =
  /\b(summ\s*arize|summary|stats|statistics|describe|overview|summ\s*ary)\b/i;
export const TOP_BOTTOM_PATTERN = /\b(top|bottom)\s+(\d+)\b/i;

// Value comparison pattern: "show me retention > 70", "where revenue >= 1000", "retention greater than 72%"
export const VALUE_COMPARE_PATTERN =
  /\b(\w+)\s+(?:(?:greater\s+than\s+(?:or\s+)?equal(?:\s+to)?|>=|=>)|(?:less\s+than\s+(?:or\s+)?equal(?:\s+to)?|<=|=<)|(?:greater\s+than|more\s+than|above|over|>)|(?:less\s+than|below|under|<)|(?:equal\s+to|equals|=))\s*(\d+\.?\d*)%?/i;

// Aggregation follow-up pattern: "avg resolution_hours", "calculate avg resolution_hours", "sum of revenue", "max priority"
export const AGGREGATION_PATTERN =
  /\b(?:calculate\s+)?(?:avg|average|sum|total|min|max|mean|minimum|maximum|count)\b(?:\s+(?:of\s+)?[\w_]+)?/i;

// Computed column: date diff or arithmetic between two columns
// Matches: "diff between X and Y", "diff X and Y", "subtract X from Y", etc.
export const COMPUTED_COLUMN_PATTERN =
  /\b(?:diff(?:erence)?|duration|subtract|minus|add|plus|ratio|multiply|divide)\s+(?:between|from|of|[\w_]+\s+(?:and|to)\s+)/i;

// Date period bucketing suffix on group-by: "group by date_col monthly"
export const DATE_PERIOD_PATTERN =
  /\b(daily|weekly|monthly|quarterly|yearly|by\s+(?:day|week|month|quarter|year))\b/i;

// Period-over-period comparison: MoM, QoQ, YoY
export const PERIOD_OVER_PERIOD_PATTERN =
  /\b(?:month\s+over\s+month|MoM|quarter\s+over\s+quarter|QoQ|year\s+over\s+year|YoY|compare\s+(?:this|current)\s+(?:month|quarter|year)\s+(?:vs|versus|to|with)\s+(?:last|previous|prior)\s+(?:month|quarter|year))\b/i;

// Aggregated computed column per group: "avg diff between X and Y by Z"
export const AGG_COMPUTED_PATTERN =
  /\b(?:avg|average|sum|total|min|max|mean|count)\s+(?:diff(?:erence)?|time|duration)\s+/i;

// Analysis/ML pattern: triggers statistical analysis handlers when query context exists
export const ANALYSIS_PATTERN =
  /\b(profil|correlat|heatmap|histogram|distribut|outlier|anomal|trend|duplicat|missing|cluster|k-?means|decision\s*tree|classif|forecast|predict|pca|dimension|report|insight|segment)\b/i;

// Export pattern: "export as csv", "download", "save as excel"
export const EXPORT_PATTERN =
  /\b(?:export|download|save)\b.*\b(?:csv|excel|xlsx|json|pdf|tsv|file)\b/i;

// Undo pattern: "undo", "go back", "revert", "undo last"
export const UNDO_PATTERN =
  /\b(?:undo|go\s+back|revert|undo\s+last|rollback|previous\s+(?:result|state))\b/i;

// Confirmation pattern: "yes", "yeah", "correct", "do it", "go ahead", "confirm"
export const CONFIRM_PATTERN =
  /^\s*(?:yes|yeah|yep|yup|y|correct|right|sure|ok|okay|do\s+it|go\s+ahead|confirm|absolutely|definitely|please|affirmative)\s*[.!]?\s*$/i;

// Negation pattern: "no", "nah", "cancel", "never mind", "don't"
export const NEGATE_PATTERN =
  /^\s*(?:no|nah|nope|n|cancel|never\s*mind|don'?t|stop|wrong|incorrect|negative)\s*[.!]?\s*$/i;

// Clarification pattern: "what do you mean", "can you explain", "I don't understand"
export const CLARIFY_PATTERN =
  /\b(?:what\s+(?:do\s+you\s+mean|does\s+that\s+mean)|(?:can\s+you\s+)?explain|(?:i\s+)?(?:don'?t|do\s+not)\s+understand|clarify|elaborate|what\s+is\s+that|huh\??)\b/i;
