/**
 * Adapts response vocabulary based on detected user expertise level.
 * Beginner users get simplified terminology, experts get precise statistical language.
 */

interface ConversationContext {
  history: Array<{ role: 'user' | 'bot'; text: string }>;
}

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

interface TermMapping {
  beginner: string;
  intermediate: string;
  expert: string;
}

const TERM_MAP: Record<string, TermMapping> = {
  'z-score': {
    beginner: 'how far from normal',
    intermediate: 'standard deviations from average',
    expert: 'z-score',
  },
  'outlier': {
    beginner: 'unusual value',
    intermediate: 'outlier',
    expert: 'outlier',
  },
  'correlation': {
    beginner: 'relationship between columns',
    intermediate: 'correlation',
    expert: 'correlation coefficient',
  },
  'R²': {
    beginner: 'how well the trend fits the data',
    intermediate: 'explains X% of the variation',
    expert: 'R²',
  },
  'IQR': {
    beginner: 'typical value range',
    intermediate: 'interquartile range',
    expert: 'IQR (Q1–Q3)',
  },
  'percentile': {
    beginner: 'ranking position',
    intermediate: 'percentile',
    expert: 'percentile',
  },
  'variance': {
    beginner: 'spread of values',
    intermediate: 'variance',
    expert: 'variance (σ²)',
  },
  'standard deviation': {
    beginner: 'typical spread',
    intermediate: 'standard deviation',
    expert: 'σ',
  },
  'regression': {
    beginner: 'trend line fitting',
    intermediate: 'regression analysis',
    expert: 'linear regression',
  },
  'cluster': {
    beginner: 'group of similar items',
    intermediate: 'segment',
    expert: 'K-Means cluster',
  },
  'centroid': {
    beginner: 'center of the group',
    intermediate: 'cluster center',
    expert: 'centroid',
  },
  'skewness': {
    beginner: 'lopsided distribution',
    intermediate: 'skewness',
    expert: 'skewness coefficient',
  },
  'p-value': {
    beginner: 'confidence in the result',
    intermediate: 'statistical significance',
    expert: 'p-value',
  },
};

// Expert-level language indicators
const EXPERT_INDICATORS = [
  /\b(z-score|p-value|regression|IQR|percentile|centroid|PCA|k-means)\b/i,
  /\b(column|header|field)\s+\w+/i,
  /\b(where|filter|group\s+by|sort\s+by|order\s+by)\b/i,
  /\b(std\s*dev|variance|correlation|coefficient)\b/i,
];

// Beginner-level language indicators
const BEGINNER_INDICATORS = [
  /\bwhat\s+(is|are|does)\b/i,
  /\bhow\s+do\s+I\b/i,
  /\bexplain\b/i,
  /\bwhat\s+does\s+\w+\s+mean\b/i,
  /\bi\s+don'?t\s+understand\b/i,
  /\bsimple\b/i,
];

export class ExpertiseAdapter {
  /**
   * Detect expertise level from conversation history.
   * Analyzes user messages for indicators of technical fluency.
   */
  detectLevel(context: ConversationContext): ExpertiseLevel {
    const userMessages = context.history
      .filter((h) => h.role === 'user')
      .map((h) => h.text)
      .slice(-10); // Look at last 10 user messages

    if (userMessages.length === 0) return 'intermediate';

    let expertScore = 0;
    let beginnerScore = 0;

    for (const msg of userMessages) {
      for (const pattern of EXPERT_INDICATORS) {
        if (pattern.test(msg)) expertScore++;
      }
      for (const pattern of BEGINNER_INDICATORS) {
        if (pattern.test(msg)) beginnerScore++;
      }
    }

    // Normalize by number of messages analyzed
    const msgCount = userMessages.length;
    const expertRatio = expertScore / msgCount;
    const beginnerRatio = beginnerScore / msgCount;

    if (expertRatio > 0.5) return 'expert';
    if (beginnerRatio > 0.3) return 'beginner';
    return 'intermediate';
  }

  /**
   * Adapt response text to match the detected expertise level.
   * Replaces technical terms with level-appropriate alternatives.
   */
  adapt(text: string, level: ExpertiseLevel): string {
    if (level === 'intermediate') return text; // Default level, no changes

    let adapted = text;
    for (const [term, mapping] of Object.entries(TERM_MAP)) {
      const replacement = mapping[level];
      if (replacement !== term) {
        // Case-insensitive replacement
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        adapted = adapted.replace(regex, replacement);
      }
    }
    return adapted;
  }
}
