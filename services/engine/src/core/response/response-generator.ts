import { INTENTS } from '../constants';
import { logger } from '@/lib/logger';
import { responseTemplates as baseTemplates } from './templates';
import type { QueryService, QueryExecuteOptions } from '../api-connector/query-service';
import type { QueryFilters } from '../api-connector/types';
import type { GroupTemplates } from '@/config/group-config';
import {
  groupBy,
  sortData,
  computeSummary,
  parseGroupByFromText,
  parseSortFromText,
  type CsvData,
  type GroupByResult,
  type SortRequest,
  type SummaryResult,
} from '../api-connector/csv-analyzer';
import type {
  ClassificationResult,
  BotResponse,
  ConversationContext,
  ExtractedEntity,
} from '../types';

const FILTER_ENTITIES = ['time_period', 'region', 'team', 'environment', 'severity'];
const STOP_WORDS = new Set([
  'run', 'search', 'show', 'execute', 'find', 'in', 'for', 'about', 'the',
  'what', 'does', 'say', 'look', 'up', 'query', 'me', 'of', 'is', 'a', 'an',
  'get', 'fetch', 'pull', 'can', 'you', 'i', 'need', 'want', 'to', 'how',
  'much', 'many', 'from', 'with', 'by', 'at', 'on', 'it', 'that', 'this',
]);

// Pattern for follow-up questions about previous query results
const FOLLOWUP_PATTERN = /^\s*(what(?:'s|\s+is|\s+are)?|show(?:\s+me)?|get|tell\s+me|where(?:'s|\s+is)?)\s+(?:the\s+)?(.+)/i;
// Words to strip when matching column names
const FOLLOWUP_NOISE = new Set(['the', 'a', 'an', 'of', 'from', 'in', 'result', 'results', 'value', 'field', 'column', 'data', 'previous', 'last']);

// Pattern for filter follow-up: re-run last query with a filter
const FILTER_FOLLOWUP_PATTERN = /\b(?:filter|show|with|only|just|where)\b.*\b(region|team|environment|severity|time_period|period|quarter)\b/i;

// Data operation follow-up patterns
const GROUP_BY_PATTERN = /\bgroup(?:ed)?\s+by\b/i;
const SORT_PATTERN = /\b(?:sort|order)(?:ed)?\s+by\b/i;
const SUMMARY_PATTERN = /\b(summarize|summary|stats|statistics|describe|overview)\b/i;
const TOP_BOTTOM_PATTERN = /\b(top|bottom)\s+(\d+)\b/i;

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
        return this.handleQueryList(classification, context);
      case INTENTS.QUERY_EXECUTE:
        return this.handleQueryExecute(classification, context, explicitFilters, incomingHeaders);
      case INTENTS.QUERY_MULTI:
        return this.handleQueryMulti(classification, context, incomingHeaders);
      case INTENTS.QUERY_ESTIMATE:
        return this.handleQueryEstimate(classification, context);
      case INTENTS.URL_FIND:
        return this.handleUrlFind(classification, context);
      case INTENTS.GREETING:
      case INTENTS.HELP:
        return this.handleStaticIntent(classification, context);
      case INTENTS.FAREWELL:
        return this.handleFarewell(classification, context);
      case INTENTS.KNOWLEDGE_SEARCH:
        return this.handleKnowledgeSearch(classification, context);
      default: {
        // Data operation follow-ups (must come before filter to prevent misclassification)
        const groupByResult = this.handleGroupByFollowUp(classification, context);
        if (groupByResult) return groupByResult;
        const sortResult = this.handleSortFollowUp(classification, context);
        if (sortResult) return sortResult;
        const summaryResult = this.handleSummaryFollowUp(classification, context);
        if (summaryResult) return summaryResult;
        const topNResult = this.handleTopNFollowUp(classification, context);
        if (topNResult) return topNResult;
        // Try to re-run last query with a filter (e.g., "filter by region US")
        const filterFollowUp = await this.handleFilterFollowUp(classification, context, incomingHeaders);
        if (filterFollowUp) return filterFollowUp;
        // Try to answer follow-up questions about the last query result
        const followUp = this.handleFollowUp(classification, context);
        if (followUp) return followUp;
        // Last-resort: try knowledge search before giving up
        const knowledgeFallback = await this.handleKnowledgeSearch(classification, context);
        if (knowledgeFallback.richContent || knowledgeFallback.intent === 'knowledge.search') return knowledgeFallback;
        return this.handleUnknown(classification, context);
      }
    }
  }

  private extractFilters(entities: ExtractedEntity[]): QueryFilters {
    const filters: QueryFilters = {};
    for (const entity of entities) {
      if (FILTER_ENTITIES.includes(entity.entity)) {
        filters[entity.entity] = entity.value;
      }
    }
    return filters;
  }

  private formatFilters(filters: QueryFilters): string {
    const parts: string[] = [];
    if (filters.time_period) parts.push(`period: ${filters.time_period}`);
    if (filters.region) parts.push(`region: ${filters.region}`);
    if (filters.team) parts.push(`team: ${filters.team}`);
    if (filters.environment) parts.push(`env: ${filters.environment}`);
    if (filters.severity) parts.push(`severity: ${filters.severity}`);
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  }

  private async handleQueryList(
    classification: ClassificationResult,
    context: ConversationContext
  ): Promise<BotResponse> {
    try {
      const queries = await this.queryService.getQueries();
      if (queries.length === 0) {
        return {
          text: 'No queries are currently available.',
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
        };
      }

      const queryItems = queries.map((q) => ({
        name: q.name,
        description: q.description,
        type: (q.type ?? 'api') as string,
        filters: (q.filters ?? []).map((f) => f.key),
        url: q.type === 'url' ? q.url : undefined,
      }));

      return {
        text: `Here are the available queries (${queries.length}):`,
        richContent: { type: 'query_list' as const, data: queryItems },
        suggestions: queries.slice(0, 5).map((q) => `run ${q.name}`),
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to list queries');
      return this.errorResponse(
        'Unable to fetch available queries. Please try again later.',
        classification,
        context
      );
    }
  }

  private async handleQueryExecute(
    classification: ClassificationResult,
    context: ConversationContext,
    explicitFilters?: Record<string, string>,
    incomingHeaders?: Record<string, string>
  ): Promise<BotResponse> {
    // If user text is a data operation (group/sort/summary/top), always try follow-up first
    if (context.lastQueryName && context.lastApiResult) {
      const userText = this.getLastUserText(context);
      const isDataOp = GROUP_BY_PATTERN.test(userText) || SORT_PATTERN.test(userText) || SUMMARY_PATTERN.test(userText) || TOP_BOTTOM_PATTERN.test(userText);
      if (isDataOp) {
        const groupByRes = this.handleGroupByFollowUp(classification, context);
        if (groupByRes) return groupByRes;
        const sortRes = this.handleSortFollowUp(classification, context);
        if (sortRes) return sortRes;
        const summaryRes = this.handleSummaryFollowUp(classification, context);
        if (summaryRes) return summaryRes;
        const topNRes = this.handleTopNFollowUp(classification, context);
        if (topNRes) return topNRes;
      }
    }

    const queryNameEntity = classification.entities.find(
      (e) => e.entity === 'query_name'
    );

    if (!queryNameEntity) {
      if (context.lastQueryName) {
        const userText = this.getLastUserText(context);

        // Data operations on previous results (group-by, sort, summary, top-N)
        const groupByRes = this.handleGroupByFollowUp(classification, context);
        if (groupByRes) return groupByRes;
        const sortRes = this.handleSortFollowUp(classification, context);
        if (sortRes) return sortRes;
        const summaryRes = this.handleSummaryFollowUp(classification, context);
        if (summaryRes) return summaryRes;
        const topNRes = this.handleTopNFollowUp(classification, context);
        if (topNRes) return topNRes;

        // Filter follow-up
        const filters = this.extractFilters(classification.entities);
        const parsedFilters = this.parseFilterFromText(userText);
        if (parsedFilters) {
          for (const [k, v] of Object.entries(parsedFilters)) {
            if (!filters[k]) filters[k] = v;
          }
        }
        if (Object.keys(filters).length > 0) {
          logger.info({ lastQuery: context.lastQueryName, filters }, 'Re-running last query with filter follow-up');
          return this.rerunLastQueryWithFilters(context, filters, classification, incomingHeaders);
        }
      }

      try {
        const names = await this.queryService.getQueryNames();
        return {
          text: 'Which query would you like me to run? Here are some available options:',
          suggestions: names.slice(0, 5).map((n) => `run ${n}`),
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
        };
      } catch {
        return {
          text: 'Which query would you like me to run? Please specify the query name.',
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
        };
      }
    }

    // Merge NLP-extracted filters with explicit filters from the filter form
    const nlpFilters = this.extractFilters(classification.entities);
    const filters = { ...nlpFilters, ...explicitFilters };
    const filterLabel = this.formatFilters(filters);
    const hasFilters = Object.keys(filters).length > 0;

    // Extract options for document search / CSV aggregation from user text
    const userText = this.getLastUserText(context);
    const options = this.buildExecuteOptions(userText, queryNameEntity.value, classification);

    try {
      const result = await this.queryService.executeQuery(
        queryNameEntity.value,
        hasFilters ? filters : undefined,
        options,
        incomingHeaders
      );

      const execMs = result.durationMs;

      // Look up reference URL for this query (Confluence / docs page)
      let referenceUrl: string | undefined;
      try {
        const allQueries = await this.queryService.getQueries();
        const queryDef = allQueries.find(
          (q) => q.name.toLowerCase() === queryNameEntity.value.toLowerCase()
        );
        if (queryDef?.url && queryDef.type !== 'url') {
          referenceUrl = queryDef.url;
        }
      } catch { /* ignore */ }

      // Store query result in context for follow-up questions
      context.lastQueryName = queryNameEntity.value;
      if (result.type === 'api' && result.apiResult) {
        context.lastApiResult = result.apiResult;
        const apiData = result.apiResult as { data?: Record<string, unknown>[] };
        if (apiData.data && apiData.data.length > 0) {
          context.lastQueryColumns = Object.keys(apiData.data[0]);
        }
      } else if (result.type === 'csv' && result.csvResult) {
        context.lastApiResult = result.csvResult;
        const csvData = result.csvResult as { headers?: string[] };
        if (csvData.headers) {
          context.lastQueryColumns = csvData.headers;
        }
      } else if (result.type === 'document' && result.documentResult) {
        context.lastApiResult = result.documentResult;
      }

      switch (result.type) {
        case 'url':
          return {
            text: `Here is the link for "${queryNameEntity.value}":`,
            richContent: { type: 'url_list', data: [result.urlResult] },
            sessionId: context.sessionId,
            intent: classification.intent,
            confidence: classification.confidence,
            executionMs: execMs,
          };

        case 'document': {
          const doc = result.documentResult!;
          if (doc.searchResults && doc.searchResults.length > 0) {
            return {
              text: `Found ${doc.searchResults.length} matching section(s) in "${queryNameEntity.value}":`,
              richContent: { type: 'document_search', data: doc },
              sessionId: context.sessionId,
              intent: classification.intent,
              confidence: classification.confidence,
              executionMs: execMs,
              referenceUrl,
            };
          }
          return {
            text: `Here is the content from "${queryNameEntity.value}":`,
            richContent: { type: 'file_content', data: { content: doc.content, filePath: doc.filePath, format: doc.format } },
            sessionId: context.sessionId,
            intent: classification.intent,
            confidence: classification.confidence,
            executionMs: execMs,
            referenceUrl,
          };
        }

        case 'csv': {
          const csv = result.csvResult!;
          if (csv.groupByResult) {
            const gb = csv.groupByResult;
            return {
              text: `Here is "${queryNameEntity.value}" grouped by **${gb.groupColumn}** (${gb.groups.length} groups, ${csv.rowCount} total rows):`,
              richContent: { type: 'csv_group_by', data: gb },
              sessionId: context.sessionId,
              intent: classification.intent,
              confidence: classification.confidence,
              executionMs: execMs,
              referenceUrl,
            };
          }
          if (csv.aggregation) {
            const agg = csv.aggregation;
            const isTop = agg.operation.startsWith('top');
            const text = isTop
              ? `Here are the ${agg.operation} results by **${agg.column}** from "${queryNameEntity.value}" (${csv.rowCount} total rows):`
              : `${agg.operation.toUpperCase()}(${agg.column}) = ${agg.result} (${csv.rowCount} rows)`;
            return {
              text,
              richContent: { type: 'csv_aggregation', data: csv },
              sessionId: context.sessionId,
              intent: classification.intent,
              confidence: classification.confidence,
              executionMs: execMs,
              referenceUrl,
            };
          }
          return {
            text: `Here is the data from "${queryNameEntity.value}" (${csv.rowCount} rows):`,
            richContent: { type: 'csv_table', data: csv },
            sessionId: context.sessionId,
            intent: classification.intent,
            confidence: classification.confidence,
            executionMs: execMs,
            referenceUrl,
          };
        }

        case 'api':
        default:
          return {
            text: `Here are the results for "${queryNameEntity.value}"${filterLabel}:`,
            richContent: { type: 'query_result', data: result.apiResult },
            sessionId: context.sessionId,
            intent: classification.intent,
            confidence: classification.confidence,
            executionMs: execMs,
            referenceUrl,
          };
      }
    } catch (error) {
      logger.error({ error, query: queryNameEntity.value, filters }, 'Query execution failed');
      return this.errorResponse(
        `Unable to execute the query "${queryNameEntity.value}". Please try again later.`,
        classification,
        context
      );
    }
  }

  private getLastUserText(context: ConversationContext): string {
    for (let i = context.history.length - 1; i >= 0; i--) {
      if (context.history[i].role === 'user') return context.history[i].text;
    }
    return '';
  }

  private buildExecuteOptions(
    userText: string,
    queryName: string,
    classification: ClassificationResult
  ): QueryExecuteOptions | undefined {
    if (!userText) return undefined;

    // Extract search keywords: remove query name, entity values, and stop words
    const entityValues = new Set(
      classification.entities.map((e) => e.value.toLowerCase())
    );
    const words = userText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w) && !entityValues.has(w) && w !== queryName.toLowerCase());

    const hasSearchIntent = /\b(search|find|about|say|what does)\b/i.test(userText);
    const hasAggIntent = /\b(average|avg|sum|total|min|max|count|top\s+\d+|minimum|maximum|highest|lowest)\b/i.test(userText);
    const hasGroupByIntent = GROUP_BY_PATTERN.test(userText);
    const hasSortIntent = SORT_PATTERN.test(userText);

    if (hasGroupByIntent) {
      // Extract group-by column from text (headers resolved later in executeCsvQuery)
      const groupMatch = userText.match(/\bgroup(?:ed)?\s+by\s+(\w+)/i);
      if (groupMatch) return { groupByColumn: groupMatch[1] };
    }

    if (hasSortIntent) {
      const sortMatch = userText.match(/\b(?:sort|order)(?:ed)?\s+by\s+(\w+)(?:\s+(asc|desc|ascending|descending))?/i);
      if (sortMatch) {
        const dir = sortMatch[2] && /desc/i.test(sortMatch[2]) ? 'desc' as const : 'asc' as const;
        return { sortColumn: sortMatch[1], sortDirection: dir };
      }
    }

    if (hasAggIntent) {
      return { aggregationText: userText };
    }

    if (hasSearchIntent && words.length > 0) {
      return { searchKeywords: words };
    }

    return undefined;
  }

  private async handleQueryMulti(
    classification: ClassificationResult,
    context: ConversationContext,
    incomingHeaders?: Record<string, string>
  ): Promise<BotResponse> {
    const queryEntities = classification.entities.filter(
      (e) => e.entity === 'query_name'
    );

    if (queryEntities.length < 2) {
      try {
        const names = await this.queryService.getQueryNames();
        return {
          text: 'Please specify at least two queries to run together. Available queries:',
          suggestions: names.slice(0, 5).map((n) => `run ${n}`),
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
        };
      } catch {
        return {
          text: 'Please specify at least two query names to run together.',
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
        };
      }
    }

    const filters = this.extractFilters(classification.entities);
    const filterLabel = this.formatFilters(filters);
    const hasFilters = Object.keys(filters).length > 0;
    const queryNames = queryEntities.map((e) => e.value);

    try {
      const results = await this.queryService.executeMultipleQueries(
        queryNames,
        hasFilters ? filters : undefined,
        incomingHeaders
      );

      if (results.length === 0) {
        return this.errorResponse(
          'All queries failed to execute. Please try again later.',
          classification,
          context
        );
      }

      const succeeded = results.map((r) => r.queryName);
      const failed = queryNames.filter((n) => !succeeded.includes(n));
      let text = `Results for ${succeeded.join(' and ')}${filterLabel}:`;
      if (failed.length > 0) {
        text += `\n(Failed to fetch: ${failed.join(', ')})`;
      }

      // Flatten multi-query results for the renderer
      const multiData = results.map((r) => ({
        queryName: r.queryName,
        result: r.result.apiResult ?? r.result.documentResult ?? r.result.csvResult ?? r.result.urlResult,
        resultType: r.result.type,
      }));

      return {
        text,
        richContent: { type: 'multi_query_result', data: multiData },
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error({ error, queries: queryNames, filters }, 'Multi-query execution failed');
      return this.errorResponse(
        `Unable to execute queries. Please try again later.`,
        classification,
        context
      );
    }
  }

  private async handleQueryEstimate(
    classification: ClassificationResult,
    context: ConversationContext
  ): Promise<BotResponse> {
    const queryNameEntity = classification.entities.find(
      (e) => e.entity === 'query_name'
    );

    if (!queryNameEntity) {
      return {
        text: 'Which query would you like me to estimate? Please specify the query name.',
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    try {
      const estimation = await this.queryService.getEstimation(
        queryNameEntity.value
      );
      return {
        text: `Estimation for "${queryNameEntity.value}":\n- Estimated duration: ${estimation.estimatedDuration}ms\n- Description: ${estimation.description}`,
        richContent: { type: 'estimation', data: estimation },
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error({ error, query: queryNameEntity.value }, 'Estimation failed');
      return this.errorResponse(
        `Unable to get estimation for "${queryNameEntity.value}".`,
        classification,
        context
      );
    }
  }

  private async handleUrlFind(
    classification: ClassificationResult,
    context: ConversationContext
  ): Promise<BotResponse> {
    const queryNameEntity = classification.entities.find(
      (e) => e.entity === 'query_name'
    );

    if (!queryNameEntity) {
      return {
        text: 'What topic would you like me to find URLs for?',
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    try {
      const urls = await this.queryService.findRelevantUrls(
        queryNameEntity.value
      );
      if (urls.length === 0) {
        return {
          text: `I couldn't find any URLs related to "${queryNameEntity.value}".`,
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
        };
      }

      return {
        text: `Here are relevant URLs for "${queryNameEntity.value}":`,
        richContent: { type: 'url_list', data: urls },
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error({ error }, 'URL search failed');
      return this.errorResponse(
        'Unable to search for URLs. Please try again later.',
        classification,
        context
      );
    }
  }

  private async handleStaticIntent(
    classification: ClassificationResult,
    context: ConversationContext
  ): Promise<BotResponse> {
    const templates = this.templates[classification.intent];
    const text = templates
      ? templates[Math.floor(Math.random() * templates.length)]
      : "I'm not sure how to help with that.";

    // Build context-aware suggestions from available queries
    let suggestions: string[] = [];
    try {
      const names = await this.queryService.getQueryNames();
      if (classification.intent === INTENTS.HELP) {
        suggestions = [
          'List queries',
          ...names.slice(0, 3).map((n) => `Run ${n}`),
        ];
      } else {
        // greeting
        suggestions = [
          'List queries',
          'Help',
          ...names.slice(0, 2).map((n) => `Run ${n}`),
        ];
      }
    } catch {
      suggestions = ['List queries', 'Help'];
    }

    return {
      text,
      suggestions,
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  private handleFarewell(
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse {
    const templates = this.templates[classification.intent];
    const text = templates
      ? templates[Math.floor(Math.random() * templates.length)]
      : 'Goodbye!';

    return {
      text,
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  /**
   * Shared helper: re-run the last query stored in context with new filters.
   * Used by both handleQueryExecute (no query_name but has filters) and handleFilterFollowUp.
   */
  private async rerunLastQueryWithFilters(
    context: ConversationContext,
    filters: Record<string, string>,
    classification: ClassificationResult,
    incomingHeaders?: Record<string, string>
  ): Promise<BotResponse> {
    const filterLabel = this.formatFilters(filters);

    try {
      const result = await this.queryService.executeQuery(
        context.lastQueryName!,
        filters,
        undefined,
        incomingHeaders
      );

      // Update context with new results
      if (result.type === 'api' && result.apiResult) {
        context.lastApiResult = result.apiResult;
        const apiData = result.apiResult as { data?: Record<string, unknown>[] };
        if (apiData.data && apiData.data.length > 0) {
          context.lastQueryColumns = Object.keys(apiData.data[0]);
        }
      } else if (result.type === 'csv' && result.csvResult) {
        context.lastApiResult = result.csvResult;
        const csvData = result.csvResult as { headers?: string[] };
        if (csvData.headers) {
          context.lastQueryColumns = csvData.headers;
        }
      }

      switch (result.type) {
        case 'csv': {
          const csv = result.csvResult!;
          return {
            text: `Here is "${context.lastQueryName}" filtered${filterLabel} (${csv.rowCount} rows):`,
            richContent: csv.aggregation
              ? { type: 'csv_aggregation', data: csv }
              : { type: 'csv_table', data: csv },
            sessionId: context.sessionId,
            intent: 'followup.filter',
            confidence: 1,
            executionMs: result.durationMs,
          };
        }
        case 'api':
        default:
          return {
            text: `Here are the results for "${context.lastQueryName}"${filterLabel}:`,
            richContent: { type: 'query_result', data: result.apiResult },
            sessionId: context.sessionId,
            intent: 'followup.filter',
            confidence: 1,
            executionMs: result.durationMs,
          };
      }
    } catch (error) {
      logger.error({ error, query: context.lastQueryName, filters }, 'Filter follow-up query failed');
      return this.errorResponse(
        `Unable to re-run "${context.lastQueryName}" with those filters. Please try again.`,
        classification,
        context
      );
    }
  }

  /**
   * Handle filter follow-up from the default (unknown intent) case:
   * when user says "filter by region US" and NLP didn't classify as query.execute.
   */
  private async handleFilterFollowUp(
    classification: ClassificationResult,
    context: ConversationContext,
    incomingHeaders?: Record<string, string>
  ): Promise<BotResponse | null> {
    if (!context.lastQueryName) return null;

    const userText = this.getLastUserText(context);
    const isFilterRequest = FILTER_FOLLOWUP_PATTERN.test(userText);
    if (!isFilterRequest) return null;

    // Try to extract filter values from text
    const filters = this.parseFilterFromText(userText);
    if (!filters || Object.keys(filters).length === 0) return null;

    logger.info({ lastQuery: context.lastQueryName, filters }, 'Re-running last query with follow-up filters (default case)');
    return this.rerunLastQueryWithFilters(context, filters, classification, incomingHeaders);
  }

  // ── Data Operation Follow-Up Handlers ──────────────────────────────

  /**
   * Handle "group by <column>" follow-up on previous query results.
   * Also handles combined: "group by quarter for region US".
   */
  private handleGroupByFollowUp(
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse | null {
    if (!context.lastApiResult || !context.lastQueryName) return null;
    const userText = this.getLastUserText(context);
    if (!GROUP_BY_PATTERN.test(userText)) return null;

    const csvData = this.extractCsvDataFromContext(context);
    if (!csvData) return null;

    const groupCol = parseGroupByFromText(userText, csvData.headers);
    if (!groupCol) {
      return {
        text: `I couldn't find that column. Available columns: **${csvData.headers.join(', ')}**`,
        suggestions: csvData.headers.slice(0, 4).map((h) => `group by ${h}`),
        sessionId: context.sessionId,
        intent: 'followup.group_by',
        confidence: 1,
      };
    }

    // Check for combined filter: "group by quarter for region US"
    let dataToGroup = csvData;
    const filterMatch = userText.match(/\b(?:for|where|with|in)\s+(\w+)\s+(\w+)\s*$/i);
    if (filterMatch) {
      const filterKey = filterMatch[1].toLowerCase();
      const filterVal = filterMatch[2];
      const headerMatch = csvData.headers.find((h) => h.toLowerCase() === filterKey);
      if (headerMatch) {
        const filteredRows = csvData.rows.filter(
          (r) => String(r[headerMatch] ?? '').toLowerCase() === filterVal.toLowerCase()
        );
        dataToGroup = { headers: csvData.headers, rows: filteredRows };
        logger.info({ filterKey: headerMatch, filterVal, filtered: filteredRows.length }, 'Applied inline filter before group-by');
      }
    }

    const result = groupBy(dataToGroup, groupCol);
    if (!result || result.groups.length === 0) {
      return {
        text: `No groups found when grouping "${context.lastQueryName}" by **${groupCol}**.`,
        sessionId: context.sessionId,
        intent: 'followup.group_by',
        confidence: 1,
      };
    }

    logger.info({ query: context.lastQueryName, groupCol, groups: result.groups.length }, 'Group-by follow-up');

    return {
      text: `Here is "${context.lastQueryName}" grouped by **${result.groupColumn}** (${result.groups.length} groups, ${dataToGroup.rows.length} total rows):`,
      richContent: { type: 'csv_group_by', data: result },
      suggestions: [
        ...csvData.headers.filter((h) => h !== groupCol).slice(0, 2).map((h) => `group by ${h}`),
        'summarize',
        `sort by ${result.aggregatedColumns[0]?.column ?? 'count'} desc`,
      ],
      sessionId: context.sessionId,
      intent: 'followup.group_by',
      confidence: 1,
    };
  }

  /**
   * Handle "sort by <column> [asc|desc]" follow-up on previous results.
   */
  private handleSortFollowUp(
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse | null {
    if (!context.lastApiResult || !context.lastQueryName) return null;
    const userText = this.getLastUserText(context);
    if (!SORT_PATTERN.test(userText)) return null;

    const csvData = this.extractCsvDataFromContext(context);
    if (!csvData) return null;

    const sortReq = parseSortFromText(userText, csvData.headers);
    if (!sortReq) {
      return {
        text: `I couldn't find that column to sort by. Available columns: **${csvData.headers.join(', ')}**`,
        suggestions: csvData.headers.slice(0, 4).map((h) => `sort by ${h} desc`),
        sessionId: context.sessionId,
        intent: 'followup.sort',
        confidence: 1,
      };
    }

    const sorted = sortData(csvData, sortReq);
    // Update context with sorted data
    context.lastApiResult = { headers: sorted.headers, rows: sorted.rows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: sorted.rows.length };

    logger.info({ query: context.lastQueryName, sortCol: sortReq.column, dir: sortReq.direction }, 'Sort follow-up');

    return {
      text: `Here is "${context.lastQueryName}" sorted by **${sortReq.column}** (${sortReq.direction}) — ${sorted.rows.length} rows:`,
      richContent: {
        type: 'csv_table',
        data: { headers: sorted.headers, rows: sorted.rows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: sorted.rows.length },
      },
      suggestions: [
        `sort by ${sortReq.column} ${sortReq.direction === 'desc' ? 'asc' : 'desc'}`,
        'summarize',
        `top 5 by ${sortReq.column}`,
      ],
      sessionId: context.sessionId,
      intent: 'followup.sort',
      confidence: 1,
    };
  }

  /**
   * Handle "summarize" / "stats" / "statistics" follow-up.
   */
  private handleSummaryFollowUp(
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse | null {
    if (!context.lastApiResult || !context.lastQueryName) return null;
    const userText = this.getLastUserText(context);
    if (!SUMMARY_PATTERN.test(userText)) return null;

    const csvData = this.extractCsvDataFromContext(context);
    if (csvData) {
      const summary = computeSummary(csvData);
      logger.info({ query: context.lastQueryName, rowCount: summary.rowCount, cols: summary.columns.length }, 'Summary follow-up');

      return {
        text: `Summary of "${context.lastQueryName}" (${summary.rowCount} rows):`,
        richContent: { type: 'csv_summary', data: summary },
        suggestions: csvData.headers.slice(0, 3).map((h) => `group by ${h}`),
        sessionId: context.sessionId,
        intent: 'followup.summary',
        confidence: 1,
      };
    }

    // Document summary: extract key info from document content
    const docData = this.extractDocumentFromContext(context);
    if (docData) {
      const docSummary = this.summarizeDocument(docData.content);
      logger.info({ query: context.lastQueryName, sections: docSummary.sections.length }, 'Document summary follow-up');

      return {
        text: docSummary.text,
        richContent: { type: 'document_summary', data: docSummary },
        suggestions: docSummary.keywords.length > 0
          ? docSummary.keywords.slice(0, 4).map((k) => `search ${context.lastQueryName} for ${k}`)
          : [`run ${context.lastQueryName}`],
        sessionId: context.sessionId,
        intent: 'followup.summary',
        confidence: 1,
      };
    }

    return null;
  }

  /**
   * Handle "top 5 by revenue" / "bottom 10 by units" follow-up.
   */
  private handleTopNFollowUp(
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse | null {
    if (!context.lastApiResult || !context.lastQueryName) return null;
    const userText = this.getLastUserText(context);
    const match = TOP_BOTTOM_PATTERN.exec(userText);
    if (!match) return null;

    const csvData = this.extractCsvDataFromContext(context);
    if (!csvData) return null;

    const isBottom = match[1].toLowerCase() === 'bottom';
    const n = parseInt(match[2], 10);
    // Find column — check rest of text after "top N"
    const afterMatch = userText.substring(match.index! + match[0].length);
    const colMatch = afterMatch.match(/\b(?:by\s+)?(\w+)/i);
    let column: string | null = null;
    if (colMatch) {
      const term = colMatch[1];
      column = csvData.headers.find((h) => h.toLowerCase() === term.toLowerCase()) ?? null;
      if (!column) column = csvData.headers.find((h) => h.toLowerCase().includes(term.toLowerCase())) ?? null;
    }

    if (!column) {
      return {
        text: `Which column should I use? Available: **${csvData.headers.join(', ')}**`,
        suggestions: csvData.headers.slice(0, 4).map((h) => `top ${n} by ${h}`),
        sessionId: context.sessionId,
        intent: 'followup.top_n',
        confidence: 1,
      };
    }

    const direction: 'asc' | 'desc' = isBottom ? 'asc' : 'desc';
    const sorted = sortData(csvData, { column, direction });
    const topRows = sorted.rows.slice(0, n);

    logger.info({ query: context.lastQueryName, n, column, isBottom }, 'Top-N follow-up');

    return {
      text: `${isBottom ? 'Bottom' : 'Top'} ${n} by **${column}** from "${context.lastQueryName}":`,
      richContent: {
        type: 'csv_table',
        data: { headers: sorted.headers, rows: topRows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: topRows.length },
      },
      suggestions: [
        `${isBottom ? 'top' : 'bottom'} ${n} by ${column}`,
        'summarize',
        `group by ${csvData.headers.find((h) => h !== column) ?? csvData.headers[0]}`,
      ],
      sessionId: context.sessionId,
      intent: 'followup.top_n',
      confidence: 1,
    };
  }

  /**
   * Extract CSV-shaped data from context.lastApiResult.
   */
  private extractCsvDataFromContext(context: ConversationContext): CsvData | null {
    const raw = context.lastApiResult as Record<string, unknown>;
    if (!raw) return null;
    const headers = raw.headers as string[] | undefined;
    const rows = raw.rows as Record<string, string | number>[] | undefined;
    if (!headers || !rows) return null;
    return { headers, rows };
  }

  /**
   * Extract document content from context.lastApiResult.
   */
  private extractDocumentFromContext(context: ConversationContext): { content: string; filePath: string; format: string } | null {
    const raw = context.lastApiResult as Record<string, unknown>;
    if (!raw) return null;
    const content = raw.content as string | undefined;
    if (!content) return null;
    return {
      content,
      filePath: (raw.filePath as string) ?? '',
      format: (raw.format as string) ?? 'txt',
    };
  }

  /**
   * Generate a structured summary of document content.
   * Extracts headings, key stats (tables, endpoints, etc.), and keywords.
   */
  private summarizeDocument(content: string): {
    text: string;
    title: string;
    sections: { heading: string; preview: string }[];
    stats: { label: string; value: string }[];
    keywords: string[];
  } {
    const lines = content.split('\n');

    // Extract title (first heading)
    const titleLine = lines.find((l) => /^#+\s+/.test(l.trim()));
    const title = titleLine ? titleLine.replace(/^#+\s+/, '').trim() : 'Document';

    // Extract section headings with previews
    const sections: { heading: string; preview: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^#{2,3}\s+/.test(line)) {
        const heading = line.replace(/^#+\s+/, '').trim();
        // Grab next non-empty line as preview
        let preview = '';
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const next = lines[j].trim();
          if (next && !next.startsWith('#') && !next.startsWith('|') && !next.startsWith('-')) {
            preview = next.length > 120 ? next.substring(0, 120) + '...' : next;
            break;
          }
        }
        sections.push({ heading, preview });
      }
    }

    // Extract stats: tables, lists, code blocks, etc.
    const stats: { label: string; value: string }[] = [];
    const tableRows = lines.filter((l) => l.trim().startsWith('|') && !l.trim().startsWith('|--')).length;
    if (tableRows > 0) stats.push({ label: 'Table rows', value: String(tableRows) });

    const bulletPoints = lines.filter((l) => /^\s*[-*]\s/.test(l)).length;
    if (bulletPoints > 0) stats.push({ label: 'Bullet points', value: String(bulletPoints) });

    const codeBlocks = (content.match(/```/g) || []).length / 2;
    if (codeBlocks > 0) stats.push({ label: 'Code blocks', value: String(Math.floor(codeBlocks)) });

    // Word count
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    stats.push({ label: 'Word count', value: wordCount.toLocaleString() });
    stats.push({ label: 'Sections', value: String(sections.length) });

    // Extract keywords from headings
    const keywords = sections
      .map((s) => s.heading)
      .flatMap((h) => h.split(/\s+/))
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()))
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(Boolean);
    // Deduplicate
    const uniqueKeywords = [...new Set(keywords.map((k) => k.toLowerCase()))];

    return {
      text: `Summary of "${title}" — ${sections.length} sections, ${wordCount.toLocaleString()} words:`,
      title,
      sections,
      stats,
      keywords: uniqueKeywords,
    };
  }

  /**
   * Try to extract filter key/value pairs directly from text when NLP doesn't catch them.
   * Handles patterns like "filter by region US", "with region=US", "only US region"
   */
  private parseFilterFromText(text: string): Record<string, string> | null {
    // Don't misinterpret data operations as filters
    if (GROUP_BY_PATTERN.test(text) || SORT_PATTERN.test(text) || SUMMARY_PATTERN.test(text)) {
      return null;
    }

    const filters: Record<string, string> = {};
    const lower = text.toLowerCase();

    // Map of filter aliases to canonical names
    const filterAliases: Record<string, string> = {
      region: 'region', reg: 'region',
      team: 'team',
      environment: 'environment', env: 'environment',
      severity: 'severity', sev: 'severity',
      period: 'time_period', time_period: 'time_period', quarter: 'time_period',
    };

    // Known filter values
    const knownValues: Record<string, string[]> = {
      region: ['us', 'eu', 'apac', 'latam', 'global'],
      team: ['engineering', 'sales', 'marketing', 'support', 'hr', 'finance'],
      environment: ['production', 'staging', 'dev', 'prod'],
      time_period: ['today', 'this_week', 'last_week', 'last_month', 'last_quarter', 'q1', 'q2', 'q3', 'q4'],
    };

    // Pattern: "filter by <key> <value>" or "<key> <value>" or "with <value> <key>"
    for (const [alias, canonical] of Object.entries(filterAliases)) {
      const byPattern = new RegExp(`\\b(?:filter|by|with|=)\\s*${alias}\\s+(?:=\\s*)?([\\w]+)`, 'i');
      const reversePattern = new RegExp(`\\b([\\w]+)\\s+${alias}\\b`, 'i');

      let match = byPattern.exec(lower);
      if (match) {
        filters[canonical] = match[1].toUpperCase();
        continue;
      }

      match = reversePattern.exec(lower);
      if (match && knownValues[canonical]?.includes(match[1].toLowerCase())) {
        filters[canonical] = match[1].toUpperCase();
      }
    }

    // Also try: detect known values standalone (e.g., just "US" or "only US")
    if (Object.keys(filters).length === 0) {
      for (const [filterKey, values] of Object.entries(knownValues)) {
        for (const val of values) {
          if (new RegExp(`\\b${val}\\b`, 'i').test(lower)) {
            filters[filterKey] = val.toUpperCase();
            break;
          }
        }
      }
    }

    return Object.keys(filters).length > 0 ? filters : null;
  }

  private handleFollowUp(
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse | null {
    // Only handle if there's a previous query result
    if (!context.lastApiResult || !context.lastQueryName) return null;

    const userText = this.getLastUserText(context);
    const match = FOLLOWUP_PATTERN.exec(userText);
    if (!match) return null;

    // Extract the field the user is asking about
    const rawField = match[2].trim().toLowerCase();
    const fieldWords = rawField
      .split(/[\s_]+/)
      .filter((w) => !FOLLOWUP_NOISE.has(w));
    if (fieldWords.length === 0) return null;

    // Try to match against known columns
    const columns = context.lastQueryColumns || [];
    const matchedCol = this.fuzzyMatchColumn(fieldWords, columns);

    if (!matchedCol) {
      // No column match — show available columns as hint
      if (columns.length > 0) {
        return {
          text: `I couldn't find a field matching "${rawField}" in the ${context.lastQueryName} results. Available fields are: **${columns.join(', ')}**`,
          suggestions: columns.slice(0, 4).map((c) => `what is ${c}`),
          sessionId: context.sessionId,
          intent: 'followup.field',
          confidence: classification.confidence,
        };
      }
      return null;
    }

    // Extract the value from the last result
    const apiData = context.lastApiResult as { data?: Record<string, unknown>[] };
    const rows = apiData.data || [];
    if (rows.length === 0) return null;

    if (rows.length === 1) {
      const value = rows[0][matchedCol];
      return {
        text: `The **${matchedCol}** from the ${context.lastQueryName} result is: **${value ?? 'N/A'}**`,
        suggestions: columns
          .filter((c) => c !== matchedCol)
          .slice(0, 4)
          .map((c) => `what is ${c}`),
        sessionId: context.sessionId,
        intent: 'followup.field',
        confidence: 1,
      };
    }

    // Multiple rows — show the column values
    const values = rows.slice(0, 10).map((r) => String(r[matchedCol] ?? 'N/A'));
    const moreText = rows.length > 10 ? ` (showing first 10 of ${rows.length})` : '';
    return {
      text: `The **${matchedCol}** values from ${context.lastQueryName}${moreText}:\n${values.map((v, i) => `${i + 1}. ${v}`).join('\n')}`,
      suggestions: columns
        .filter((c) => c !== matchedCol)
        .slice(0, 4)
        .map((c) => `what is ${c}`),
      sessionId: context.sessionId,
      intent: 'followup.field',
      confidence: 1,
    };
  }

  /**
   * Fuzzy-match user's field words against actual column names.
   * Handles: "username" → "user_id", "name" → "name", "email address" → "email"
   */
  private fuzzyMatchColumn(fieldWords: string[], columns: string[]): string | null {
    const joined = fieldWords.join('');
    const joinedSpaced = fieldWords.join(' ');

    for (const col of columns) {
      const colLower = col.toLowerCase();
      const colNoUnderscore = colLower.replace(/_/g, '');

      // Exact match
      if (colLower === joinedSpaced || colLower === joined) return col;
      // Match without underscores: "userid" → "user_id"
      if (colNoUnderscore === joined) return col;
      // Column contains the search term: "name" matches "name" in columns
      if (colLower.includes(joined) || joined.includes(colLower)) return col;
      // Individual word match: "user" matches "user_id"
      for (const word of fieldWords) {
        if (colLower === word || colNoUnderscore === word) return col;
      }
    }

    // Partial/substring match as fallback
    for (const col of columns) {
      const colLower = col.toLowerCase().replace(/_/g, '');
      for (const word of fieldWords) {
        if (word.length >= 3 && (colLower.includes(word) || word.includes(colLower))) {
          return col;
        }
      }
    }

    return null;
  }

  // ── Knowledge Search (cross-document Q&A) ─────────────────────────

  private async handleKnowledgeSearch(
    classification: ClassificationResult,
    context: ConversationContext
  ): Promise<BotResponse> {
    const userText = this.getLastUserText(context);

    // Extract keywords from user text
    const words = userText
      .toLowerCase()
      .replace(/[?!.,;:'"()[\]{}]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    if (words.length === 0) {
      return {
        text: 'Could you be more specific? Try asking a question like "what is the auth flow?" or "how do I deploy?"',
        suggestions: ['list queries', 'help'],
        sessionId: context.sessionId,
        intent: 'knowledge.search',
        confidence: classification.confidence,
      };
    }

    try {
      const results = await this.queryService.searchAllDocuments(words);

      if (results.length === 0) {
        return {
          text: `I couldn't find relevant information for "${userText}" in the knowledge base. Try rephrasing your question or type \`list queries\` to see available documents.`,
          suggestions: ['list queries', 'help'],
          sessionId: context.sessionId,
          intent: 'knowledge.search',
          confidence: classification.confidence,
        };
      }

      const totalSections = results.reduce((sum, r) => sum + r.sections.length, 0);
      logger.info(
        { keywords: words, docs: results.length, sections: totalSections },
        'Knowledge search results'
      );

      // Generate suggestions: search specific docs for more details
      const suggestions = results
        .slice(0, 3)
        .map((r) => `search ${r.queryName} for more details`);
      if (suggestions.length < 4) suggestions.push('list queries');

      return {
        text: `Found ${totalSections} matching section${totalSections !== 1 ? 's' : ''} across ${results.length} document${results.length !== 1 ? 's' : ''}:`,
        richContent: {
          type: 'knowledge_search',
          data: { results, keywords: words },
        },
        suggestions,
        sessionId: context.sessionId,
        intent: 'knowledge.search',
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error({ error }, 'Knowledge search failed');
      return {
        text: 'Sorry, I had trouble searching the knowledge base. Please try again.',
        suggestions: ['list queries', 'help'],
        sessionId: context.sessionId,
        intent: 'knowledge.search',
        confidence: classification.confidence,
      };
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

  private errorResponse(
    text: string,
    classification: ClassificationResult,
    context: ConversationContext
  ): BotResponse {
    return {
      text,
      richContent: { type: 'error', data: { message: text } },
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
}
