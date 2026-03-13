import { INTENTS } from '../constants';
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
} from './handlers/query-handler';
import { handleUrlFind } from './handlers/url-handler';
import { handleKnowledgeSearch } from './handlers/knowledge-handler';
import {
  handleFollowUp,
  handleFilterFollowUp,
  handleDataOperation,
} from './handlers/followup-handler';

export class ResponseGenerator {
  private templates: Record<string, string[]>;

  constructor(
    private queryService: QueryService,
    groupTemplates?: GroupTemplates | null
  ) {
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
}
