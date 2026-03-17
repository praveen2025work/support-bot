export const FILTER_ENTITIES = ['time_period', 'region', 'team', 'environment', 'severity'];

export const STOP_WORDS = new Set([
  'run', 'search', 'show', 'execute', 'find', 'in', 'for', 'about', 'the',
  'what', 'does', 'say', 'look', 'up', 'query', 'me', 'of', 'is', 'a', 'an',
  'get', 'fetch', 'pull', 'can', 'you', 'i', 'need', 'want', 'to', 'how',
  'much', 'many', 'from', 'with', 'by', 'at', 'on', 'it', 'that', 'this',
]);

// Pattern for follow-up questions about previous query results
export const FOLLOWUP_PATTERN = /^\s*(what(?:'s|\s+is|\s+are)?|show(?:\s+me)?|get|tell\s+me|where(?:'s|\s+is)?)\s+(?:the\s+)?(.+)/i;
// Words to strip when matching column names
export const FOLLOWUP_NOISE = new Set(['the', 'a', 'an', 'of', 'from', 'in', 'result', 'results', 'value', 'field', 'column', 'data', 'previous', 'last']);

// Pattern for filter follow-up: re-run last query with a filter
export const FILTER_FOLLOWUP_PATTERN = /\b(?:filter|show|with|only|just|where|for|in)\b.*\b(region|team|environment|severity|time_period|period|quarter|date_range|priority)\b/i;

// Data operation follow-up patterns
export const GROUP_BY_PATTERN = /\bgroup(?:ed)?\s+by\b/i;
export const SORT_PATTERN = /\b(?:sort|order)(?:ed)?\s+by\b/i;
export const SUMMARY_PATTERN = /\b(summ\s*arize|summary|stats|statistics|describe|overview|summ\s*ary)\b/i;
export const TOP_BOTTOM_PATTERN = /\b(top|bottom)\s+(\d+)\b/i;

// Value comparison pattern: "show me retention > 70", "where revenue >= 1000", "retention greater than 72%"
export const VALUE_COMPARE_PATTERN = /\b(\w+)\s+(?:(?:greater\s+than\s+(?:or\s+)?equal(?:\s+to)?|>=|=>)|(?:less\s+than\s+(?:or\s+)?equal(?:\s+to)?|<=|=<)|(?:greater\s+than|more\s+than|above|over|>)|(?:less\s+than|below|under|<)|(?:equal\s+to|equals|=))\s*(\d+\.?\d*)%?/i;

// Aggregation follow-up pattern: "avg resolution_hours", "calculate avg resolution_hours", "sum of revenue", "max priority"
export const AGGREGATION_PATTERN = /\b(?:calculate\s+)?(?:avg|average|sum|total|min|max|mean|minimum|maximum|count)\b(?:\s+(?:of\s+)?[\w_]+)?/i;

// Analysis/ML pattern: triggers statistical analysis handlers when query context exists
export const ANALYSIS_PATTERN = /\b(profil|correlat|heatmap|histogram|distribut|outlier|anomal|trend|duplicat|missing|cluster|k-?means|decision\s*tree|classif|forecast|predict|pca|dimension|report|insight|segment)\b/i;
