/** Shape descriptor for the uploaded dataset. */
export interface DataShape {
  numericCount: number;
  dateCount: number;
  categoricalCount: number;
  rowCount: number;
}

/**
 * Intent pattern: a regex to match against user text and the resulting intent.
 */
interface IntentPattern {
  pattern: RegExp;
  intent: string;
  /** If true, this intent requires date columns in the data. */
  requiresDate?: boolean;
  /** If true, this intent requires multiple numeric columns. */
  requiresMultipleNumeric?: boolean;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Forecasting / prediction with time component
  { pattern: /\b(forecast|predict(?:ion)?|project(?:ion)?|future|next\s+\d+)\b/i, intent: 'analysis.forecast', requiresDate: true },

  // Classification
  { pattern: /\b(classif(?:y|ication)|decision\s*tree|categorize)\b/i, intent: 'analysis.decision_tree' },

  // Clustering / segmentation
  { pattern: /\b(segment|cluster|group(?:ing)?|k[\s-]?means|partition)\b/i, intent: 'analysis.cluster' },

  // Correlation / relationships
  { pattern: /\b(correlat(?:e|ion)|relationship|associat(?:e|ion)|any\s+patterns?|patterns?\s+in)\b/i, intent: 'analysis.correlation' },

  // PCA / dimensionality reduction
  { pattern: /\b(pca|principal\s+component|dimensionality|reduce\s+dimensions?)\b/i, intent: 'analysis.pca', requiresMultipleNumeric: true },

  // Trends
  { pattern: /\b(trend|over\s+time|time\s+series|temporal|seasonal)\b/i, intent: 'analysis.trend', requiresDate: true },

  // Outliers / anomalies
  { pattern: /\b(outlier|anomal(?:y|ies)|unusual|abnormal)\b/i, intent: 'analysis.anomaly' },

  // Distribution / histogram
  { pattern: /\b(distribution|histogram|spread|frequency)\b/i, intent: 'analysis.histogram' },

  // Duplicates
  { pattern: /\b(duplicate|dedup|repeated|redundant)\b/i, intent: 'analysis.duplicates' },

  // Missing data
  { pattern: /\b(missing|null|empty|incomplete|gaps?\s+in)\b/i, intent: 'analysis.missing' },

  // Summary / overview (catch-all for vague requests)
  { pattern: /\b(analyze|summary|summarize|overview|insight|describe|explore|tell\s+me\s+about|what\s+can\s+you)\b/i, intent: 'analysis.smart_summary' },
];

/**
 * Map a vague user query to a specific analysis intent.
 *
 * Matches the user text against known analysis patterns and validates
 * that the dataset has the required column types for the matched intent.
 *
 * @param userText  - The user's natural language query.
 * @param dataShape - Column type counts and row count of the dataset.
 * @returns An analysis intent string (e.g. "analysis.forecast") or null if no match.
 */
export function mapToAnalysisIntent(
  userText: string,
  dataShape: DataShape
): string | null {
  const text = userText.toLowerCase().trim();
  if (!text) return null;

  for (const { pattern, intent, requiresDate, requiresMultipleNumeric } of INTENT_PATTERNS) {
    if (!pattern.test(text)) continue;

    // Validate data requirements
    if (requiresDate && dataShape.dateCount === 0) {
      // Fall back to summary if date required but none available
      continue;
    }
    if (requiresMultipleNumeric && dataShape.numericCount < 2) {
      continue;
    }

    return intent;
  }

  return null;
}
