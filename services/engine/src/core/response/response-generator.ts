import { INTENTS } from '../constants';
import { GROUP_BY_PATTERN, SORT_PATTERN, SUMMARY_PATTERN, TOP_BOTTOM_PATTERN, FILTER_FOLLOWUP_PATTERN, VALUE_COMPARE_PATTERN, AGGREGATION_PATTERN, FOLLOWUP_PATTERN, ANALYSIS_PATTERN } from './constants';
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
  handleDataLookup,
} from './handlers/followup-handler';
import { handleSemanticSearch } from './handlers/semantic-search-handler';
import { handleAnalysis } from './handlers/analysis-handler';

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
  avg: 'aggregate', average: 'aggregate', sum: 'aggregate', total: 'aggregate',
  min: 'aggregate', max: 'aggregate', mean: 'aggregate', calculate: 'aggregate',
  count: 'aggregate', minimum: 'aggregate', maximum: 'aggregate',
  // Analysis/ML keywords
  profile: 'analysis', correlations: 'analysis', correlation: 'analysis',
  heatmap: 'analysis', histogram: 'analysis', distribution: 'analysis',
  outliers: 'analysis', anomalies: 'analysis', trend: 'analysis',
  duplicates: 'analysis', missing: 'analysis', cluster: 'analysis',
  clustering: 'analysis', forecast: 'analysis', predict: 'analysis',
  pca: 'analysis', report: 'analysis', insights: 'analysis',
  segment: 'analysis', classify: 'analysis',
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
    || FILTER_FOLLOWUP_PATTERN.test(userText) || VALUE_COMPARE_PATTERN.test(userText)
    || AGGREGATION_PATTERN.test(userText)
    || ANALYSIS_PATTERN.test(userText)) {
    return true;
  }
  // Data-aware question patterns: "what is X of Y", "status of Book", "show me X for Y"
  if (FOLLOWUP_PATTERN.test(userText)) return true;
  if (/\b(?:what|where|which|how|status|state|value)\b/i.test(userText)) return true;
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

    // Dispatch to the appropriate handler
    const response = await this.dispatch(classification, context, explicitFilters, incomingHeaders);

    // Prepend a "Did you mean" note when typo corrections were applied
    if (classification.corrections?.length) {
      const correctionNote = classification.corrections
        .map((c) => `${c.from} \u2192 ${c.to}`)
        .join(', ');
      response.text = `*Did you mean: "${correctionNote}"?*\n\n${response.text}`;
    }

    return response;
  }

  private async dispatch(
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
        return handleQueryExecute(classification, context, this.queryService, explicitFilters, incomingHeaders, this.groupId);
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
      case INTENTS.QUERY_SEARCH:
        return handleSemanticSearch(classification, context, this.queryService, this.groupId);

      // Follow-up intents — route to data operation handlers when query context exists
      case INTENTS.FOLLOWUP_GROUP_BY:
      case INTENTS.FOLLOWUP_SORT:
      case INTENTS.FOLLOWUP_SUMMARY:
      case INTENTS.FOLLOWUP_TOP_N:
      case INTENTS.FOLLOWUP_AGGREGATION:
      case INTENTS.FOLLOWUP_DATA_LOOKUP: {
        if (context.lastQueryName && context.lastApiResult) {
          const dataOpResult = handleDataOperation(classification, context);
          if (dataOpResult) return dataOpResult;
          const followUpResult = handleFollowUp(classification, context);
          if (followUpResult) return followUpResult;
          const lookupResult = handleDataLookup(classification, context);
          if (lookupResult) return lookupResult;
        }
        // No query context — fall through to query execution (user might mean "group by region" on a new query)
        return handleQueryExecute(classification, context, this.queryService, explicitFilters, incomingHeaders, this.groupId);
      }
      case INTENTS.FOLLOWUP_FILTER: {
        if (context.lastQueryName) {
          const filterResult = await handleFilterFollowUp(classification, context, this.queryService, incomingHeaders);
          if (filterResult) return filterResult;
          const dataOpResult = handleDataOperation(classification, context);
          if (dataOpResult) return dataOpResult;
        }
        return handleQueryExecute(classification, context, this.queryService, explicitFilters, incomingHeaders, this.groupId);
      }

      // Analysis/ML intents — route to analysis handler when query context exists
      case INTENTS.ANALYSIS_PROFILE:
      case INTENTS.ANALYSIS_SMART_SUMMARY:
      case INTENTS.ANALYSIS_CORRELATION:
      case INTENTS.ANALYSIS_DISTRIBUTION:
      case INTENTS.ANALYSIS_ANOMALY:
      case INTENTS.ANALYSIS_TREND:
      case INTENTS.ANALYSIS_DUPLICATES:
      case INTENTS.ANALYSIS_MISSING:
      case INTENTS.ANALYSIS_CLUSTER:
      case INTENTS.ANALYSIS_DECISION_TREE:
      case INTENTS.ANALYSIS_FORECAST:
      case INTENTS.ANALYSIS_PCA:
      case INTENTS.ANALYSIS_REPORT: {
        if (context.lastQueryName && context.lastApiResult) {
          const analysisResult = await handleAnalysis(classification, context);
          if (analysisResult) return analysisResult;
        }
        return {
          text: 'Please run a query first to load data before running analysis. Try "list queries" to see available data sources.',
          suggestions: ['List queries', 'Help'],
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
        };
      }

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
        // Try data-aware lookup: search actual row values for the user's question
        const dataLookup = handleDataLookup(classification, context);
        if (dataLookup) return dataLookup;
        // Try analysis if user text matches analysis patterns and has data context
        if (context.lastQueryName && context.lastApiResult && ANALYSIS_PATTERN.test(getLastUserText(context))) {
          const analysisResult = await handleAnalysis(classification, context);
          if (analysisResult) return analysisResult;
        }
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
