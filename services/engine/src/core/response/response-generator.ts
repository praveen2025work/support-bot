import { INTENTS } from '../constants';
import { GROUP_BY_PATTERN, SORT_PATTERN, SUMMARY_PATTERN, TOP_BOTTOM_PATTERN, FILTER_FOLLOWUP_PATTERN, VALUE_COMPARE_PATTERN } from './constants';
import { responseTemplates as baseTemplates } from './templates';
import type { QueryService } from '../api-connector/query-service';
import type { GroupTemplates } from '@/config/group-config';
import type {
  ClassificationResult,
  BotResponse,
  ConversationContext,
} from '../types';

// Handler imports
import { handleGreeting, handleFarewell } from './handlers/greeting-handler';
import { handleHelp } from './handlers/help-handler';
import {
  handleQueryList,
  handleQueryExecute,
  handleMultiQuery,
  handleQueryEstimate,
  getLastUserText,
} from './handlers/query-handler';
import { handleUrlFind } from './handlers/url-handler';
import { handleKnowledgeSearch } from './handlers/knowledge-handler';
import { handleDocumentAsk, handleDocumentList } from './handlers/document-qa-handler';
import {
  handleFollowUp,
  handleFilterFollowUp,
  handleDataOperation,
} from './handlers/followup-handler';

/**
 * Simple Levenshtein distance for typo tolerance on short keywords.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Follow-up keywords the user might type (with typos). Mapped to canonical form. */
const FOLLOWUP_KEYWORDS: Record<string, string> = {
  summarize: 'summarize', summary: 'summarize', stats: 'summarize', statistics: 'summarize',
  describe: 'summarize', overview: 'summarize',
  sort: 'sort', order: 'sort',
  group: 'group', grouped: 'group',
  top: 'top', bottom: 'bottom',
  filter: 'filter', show: 'filter', only: 'filter',
  greater: 'compare', above: 'compare', over: 'compare', more: 'compare',
  less: 'compare', below: 'compare', under: 'compare',
  refresh: 'refresh', rerun: 'refresh',
};

/**
 * Check if user text looks like a follow-up on previous query results,
 * even if NLP misclassified it due to typos or ambiguity.
 */
function isLikelyFollowUp(userText: string): boolean {
  const words = userText.toLowerCase().trim().split(/\s+/);
  // Direct pattern match
  if (GROUP_BY_PATTERN.test(userText) || SORT_PATTERN.test(userText)
    || SUMMARY_PATTERN.test(userText) || TOP_BOTTOM_PATTERN.test(userText)
    || FILTER_FOLLOWUP_PATTERN.test(userText) || VALUE_COMPARE_PATTERN.test(userText)) {
    return true;
  }
  // Typo-tolerant match: check if any word is within edit distance 2 of a follow-up keyword
  for (const word of words) {
    if (word.length < 3) continue;
    for (const keyword of Object.keys(FOLLOWUP_KEYWORDS)) {
      if (levenshtein(word, keyword) <= 2) return true;
    }
  }
  return false;
}

export class ResponseGenerator {
  private templates: Record<string, string[]>;
  private groupId: string;

  constructor(
    private queryService: QueryService,
    groupTemplates?: GroupTemplates | null,
    groupId?: string
  ) {
    this.groupId = groupId || 'default';
    this.templates = { ...baseTemplates };
    if (groupTemplates) {
      Object.entries(groupTemplates).forEach(([key, values]) => {
        if (values && values.length > 0) {
          this.templates[key] = values;
        }
      });
    }
  }

  async generate(
    classification: ClassificationResult,
    context: ConversationContext,
    explicitFilters?: Record<string, string>,
    incomingHeaders?: Record<string, string>
  ): Promise<BotResponse> {
    const { intent } = classification;

    // When the user has active query context, check for follow-up operations FIRST
    // before intent dispatch. This prevents "summarize", "sort by X", "filter by region US",
    // etc. from being misclassified as knowledge.search or other intents.
    // Also handles typos like "summ arize" or "sumarize" via Levenshtein distance.
    if (context.lastQueryName && context.lastApiResult) {
      const userText = getLastUserText(context);
      if (isLikelyFollowUp(userText)) {
        const dataOpResult = handleDataOperation(classification, context);
        if (dataOpResult) return dataOpResult;
        // Also try filter follow-up
        const filterResult = await handleFilterFollowUp(classification, context, this.queryService, incomingHeaders);
        if (filterResult) return filterResult;
        // Try field follow-up
        const followUpResult = handleFollowUp(classification, context);
        if (followUpResult) return followUpResult;
      }
    }

    switch (intent) {
      case INTENTS.QUERY_LIST:
        return handleQueryList(classification, context, this.queryService);
      case INTENTS.QUERY_EXECUTE:
        return handleQueryExecute(classification, context, this.queryService, explicitFilters, incomingHeaders);
      case INTENTS.QUERY_MULTI:
        return handleMultiQuery(classification, context, this.queryService, incomingHeaders);
      case INTENTS.QUERY_ESTIMATE:
        return handleQueryEstimate(classification, context, this.queryService);
      case INTENTS.URL_FIND:
        return handleUrlFind(classification, context, this.queryService);
      case INTENTS.GREETING:
        return handleGreeting(classification, context, this.templates, this.queryService);
      case INTENTS.HELP:
        return handleHelp(classification, context, this.templates, this.queryService);
      case INTENTS.FAREWELL:
        return handleFarewell(classification, context, this.templates);
      case INTENTS.KNOWLEDGE_SEARCH:
        return handleKnowledgeSearch(classification, context, this.queryService);
      case INTENTS.DOCUMENT_ASK:
        return handleDocumentAsk(classification, context, this.groupId);
      case INTENTS.DOCUMENT_LIST:
        return handleDocumentList(classification, context, this.groupId);
      default: {
        // Data operation follow-ups (must come before filter to prevent misclassification)
        const dataOpResult = handleDataOperation(classification, context);
        if (dataOpResult) return dataOpResult;
        // Try to re-run last query with a filter (e.g., "filter by region US")
        const filterFollowUp = await handleFilterFollowUp(classification, context, this.queryService, incomingHeaders);
        if (filterFollowUp) return filterFollowUp;
        // Try to answer follow-up questions about the last query result
        const followUp = handleFollowUp(classification, context);
        if (followUp) return followUp;
        // Last-resort: try knowledge search before giving up
        const knowledgeFallback = await handleKnowledgeSearch(classification, context, this.queryService);
        if (knowledgeFallback.richContent || knowledgeFallback.intent === 'knowledge.search') return knowledgeFallback;
        return this.handleUnknown(classification, context);
      }
    }
  }

  private handleUnknown(
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse {
    const templates = this.templates['unknown'];
    const text = templates[Math.floor(Math.random() * templates.length)];

    return {
      text,
      suggestions: ['List queries', 'Help', 'Run a query'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  /** Clear the underlying API client's query cache. */
  clearQueryCache(): void {
    this.queryService.clearCache();
  }
}
