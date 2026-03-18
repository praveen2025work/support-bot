/**
 * Regex-based pattern matcher for fast intent pre-filtering.
 * Returns a match with 0.7 confidence when a strong pattern is detected.
 * This runs before NLP.js and TF-IDF as a fast path for obvious intents.
 */

export interface PatternMatch {
  intent: string;
  confidence: number;
  patternName: string;
}

interface PatternRule {
  regex: RegExp;
  intent: string;
  name: string;
  confidence: number;
}

const PATTERN_RULES: PatternRule[] = [
  // Data analysis patterns
  { regex: /\b(outlier|anomal|spike|unusual|weird|strange|extreme|abnormal)\b/i, intent: 'analysis.anomaly', name: 'anomaly', confidence: 0.7 },
  { regex: /\b(trend|over\s+time|increas|decreas|grow|decline|trajectory)\b/i, intent: 'analysis.trend', name: 'trend', confidence: 0.7 },
  { regex: /\b(forecast|predict|next|future|project|estimat|extrapolat)\b/i, intent: 'analysis.forecast', name: 'forecast', confidence: 0.7 },
  { regex: /\b(cluster|segment|group\s+similar|categori[sz]e|classify)\b/i, intent: 'analysis.cluster', name: 'cluster', confidence: 0.7 },
  { regex: /\b(correlat|related|relationship|depend|affect|associat)\b/i, intent: 'analysis.correlation', name: 'correlation', confidence: 0.7 },
  { regex: /\b(duplicat|repeat|same|identical|redundant)\b/i, intent: 'analysis.duplicates', name: 'duplicates', confidence: 0.7 },
  { regex: /\b(distribut|histogram|spread|range|how.*look|frequency)\b/i, intent: 'analysis.histogram', name: 'histogram', confidence: 0.65 },
  { regex: /\b(analyz|describ|summar|profile|what.*have|column|field|stat)\b/i, intent: 'analysis.profile', name: 'profile', confidence: 0.6 },

  // Query patterns
  { regex: /\b(run|execute|show\s+me|get)\s+\w+/i, intent: 'query.execute', name: 'run_query', confidence: 0.6 },
  { regex: /\b(list|show)\s+(all\s+)?queries\b/i, intent: 'query.list', name: 'list_queries', confidence: 0.75 },
  { regex: /\bcompare\b.*\b(to|with|and|vs|versus)\b/i, intent: 'query.compare', name: 'compare', confidence: 0.7 },

  // General patterns
  { regex: /\b(hi|hello|hey|good\s+(morning|afternoon|evening))\b/i, intent: 'greeting', name: 'greeting', confidence: 0.8 },
  { regex: /\b(bye|goodbye|see\s+you|exit|quit)\b/i, intent: 'farewell', name: 'farewell', confidence: 0.8 },
  { regex: /\b(help|what\s+can\s+you\s+do|commands?|features?)\b/i, intent: 'help', name: 'help', confidence: 0.65 },
  { regex: /\b(search|find|look\s+for)\s+.+\s+(in|from|across)\s+(docs?|documents?|files?|knowledge)\b/i, intent: 'document.ask', name: 'doc_search', confidence: 0.7 },
  { regex: /\b(how\s+long|estimate|eta|time\s+to)\b/i, intent: 'query.estimate', name: 'estimate', confidence: 0.65 },
];

export class PatternMatcher {
  match(text: string): PatternMatch | null {
    let bestMatch: PatternMatch | null = null;

    for (const rule of PATTERN_RULES) {
      if (rule.regex.test(text)) {
        if (!bestMatch || rule.confidence > bestMatch.confidence) {
          bestMatch = {
            intent: rule.intent,
            confidence: rule.confidence,
            patternName: rule.name,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Returns all matching patterns (used for ensemble voting).
   */
  matchAll(text: string): PatternMatch[] {
    const matches: PatternMatch[] = [];
    for (const rule of PATTERN_RULES) {
      if (rule.regex.test(text)) {
        matches.push({
          intent: rule.intent,
          confidence: rule.confidence,
          patternName: rule.name,
        });
      }
    }
    return matches;
  }
}
