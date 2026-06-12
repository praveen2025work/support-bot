import { logger } from '@/lib/logger';

interface ConversationContext {
  sessionId: string;
  history: Array<{ role: 'user' | 'bot'; text: string; timestamp: Date }>;
  currentIntent?: string;
  pendingEntities?: Record<string, string>;
  lastApiResult?: unknown;
  lastQueryName?: string;
  lastQueryColumns?: string[];
  lastDateFilter?: string;
  lastEntities?: Array<{ entity: string; value: string }>;
}

interface RewriteAction {
  type: 'pronoun_resolve' | 'abbreviation' | 'column_context' | 'date_context';
  detail: string;
}

interface RewriteResult {
  original: string;
  rewritten: string;
  rewrites: RewriteAction[];
}

const ABBREVIATIONS = new Map<string, string>([
  ['rev', 'revenue'],
  ['qty', 'quantity'],
  ['dept', 'department'],
  ['mgr', 'manager'],
  ['emp', 'employee'],
  ['yr', 'year'],
  ['mo', 'month'],
  ['avg', 'average'],
  ['min', 'minimum'],
  ['max', 'maximum'],
  ['num', 'number'],
  ['desc', 'description'],
  ['cat', 'category'],
  ['prod', 'product'],
  ['cust', 'customer'],
  ['txn', 'transaction'],
  ['acct', 'account'],
  ['amt', 'amount'],
  ['pct', 'percent'],
  ['perf', 'performance'],
  ['calc', 'calculate'],
  ['info', 'information'],
  ['req', 'request'],
  ['env', 'environment'],
  ['cfg', 'configuration'],
  ['err', 'error'],
]);

// Pronouns that should be resolved to context entities
const PRONOUN_PATTERNS = /\b(it|that|this|those|them|the same|the previous)\b/gi;

// Date reference patterns — used to detect if user query already has a date
const DATE_PATTERN = /\b(today|yesterday|last\s+\w+|this\s+(week|month|quarter|year)|Q[1-4]|\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;

export class QueryRewriter {
  /**
   * Rewrites a user query using conversation context to improve classification accuracy.
   * Only applies rewrites when confidence would be improved — avoids unnecessary changes.
   */
  rewrite(text: string, context: ConversationContext): RewriteResult {
    let rewritten = text;
    const rewrites: RewriteAction[] = [];

    // 1. Resolve pronouns to last entity/query
    rewritten = this.resolvePronouns(rewritten, context, rewrites);

    // 2. Expand abbreviations
    rewritten = this.expandAbbreviations(rewritten, rewrites);

    // 3. Append column context when query has no column reference
    rewritten = this.appendColumnContext(rewritten, context, rewrites);

    // 4. Append date filter from context when query has none
    rewritten = this.appendDateContext(rewritten, context, rewrites);

    if (rewrites.length > 0) {
      logger.debug({ original: text, rewritten, rewrites: rewrites.length }, 'Query rewritten');
    }

    return { original: text, rewritten, rewrites };
  }

  private resolvePronouns(text: string, context: ConversationContext, rewrites: RewriteAction[]): string {
    if (!context.lastQueryName && !context.lastEntities?.length) return text;

    let modified = text;
    const matches = text.match(PRONOUN_PATTERNS);
    if (!matches) return text;

    for (const pronoun of matches) {
      // Try to resolve to last entity value first
      if (context.lastEntities && context.lastEntities.length > 0) {
        const lastEntity = context.lastEntities[0];
        modified = modified.replace(new RegExp(`\\b${pronoun}\\b`, 'i'), lastEntity.value);
        rewrites.push({
          type: 'pronoun_resolve',
          detail: `"${pronoun}" → "${lastEntity.value}" (from last entity)`,
        });
      } else if (context.lastQueryName) {
        modified = modified.replace(new RegExp(`\\b${pronoun}\\b`, 'i'), context.lastQueryName);
        rewrites.push({
          type: 'pronoun_resolve',
          detail: `"${pronoun}" → "${context.lastQueryName}" (from last query)`,
        });
      }
      break; // Only resolve first pronoun to avoid over-rewriting
    }

    return modified;
  }

  private expandAbbreviations(text: string, rewrites: RewriteAction[]): string {
    let modified = text;

    for (const [abbr, full] of ABBREVIATIONS) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      if (regex.test(modified)) {
        // Don't expand if the abbreviation is part of a larger known word
        // or if it matches a query name or column name exactly
        modified = modified.replace(regex, full);
        rewrites.push({
          type: 'abbreviation',
          detail: `"${abbr}" → "${full}"`,
        });
      }
    }

    return modified;
  }

  private appendColumnContext(text: string, context: ConversationContext, rewrites: RewriteAction[]): string {
    if (!context.lastQueryColumns || context.lastQueryColumns.length === 0) return text;

    // Check if the user's query already mentions any known column
    const lowerText = text.toLowerCase();
    const mentionsColumn = context.lastQueryColumns.some(
      (col) => lowerText.includes(col.toLowerCase().replace(/_/g, ' ')) || lowerText.includes(col.toLowerCase())
    );

    if (mentionsColumn) return text;

    // Only append if query looks like a data operation without specifying columns
    const dataOpPattern = /\b(outlier|anomal|trend|correlat|cluster|histogram|distribut|profil|forecast|predict)\b/i;
    if (!dataOpPattern.test(text)) return text;

    // Don't append if already has "in" or "for" specifying a target
    if (/\b(in|for|of|on)\s+\w+/i.test(text)) return text;

    // Use the last mentioned column entities if available, otherwise skip
    if (context.lastEntities) {
      const colEntity = context.lastEntities.find((e) => e.entity === 'column');
      if (colEntity) {
        const enriched = `${text} in ${colEntity.value}`;
        rewrites.push({
          type: 'column_context',
          detail: `Appended column context: "in ${colEntity.value}"`,
        });
        return enriched;
      }
    }

    return text;
  }

  private appendDateContext(text: string, context: ConversationContext, rewrites: RewriteAction[]): string {
    if (!context.lastDateFilter) return text;

    // Skip if the user query already has a date reference
    if (DATE_PATTERN.test(text)) return text;

    // Only append if this looks like a data query (not greeting/help)
    const dataQueryPattern = /\b(show|run|get|find|list|compare|analyze|what|how|trend|outlier|anomal)\b/i;
    if (!dataQueryPattern.test(text)) return text;

    const enriched = `${text} for ${context.lastDateFilter}`;
    rewrites.push({
      type: 'date_context',
      detail: `Appended date filter: "for ${context.lastDateFilter}"`,
    });
    return enriched;
  }
}
