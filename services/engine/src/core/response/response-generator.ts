import { INTENTS } from '../constants';
import { logger } from '@/lib/logger';
import { responseTemplates as baseTemplates } from './templates';
import type { QueryService, QueryExecuteOptions } from '../api-connector/query-service';
import type { QueryFilters } from '../api-connector/types';
import type { GroupTemplates } from '@/config/group-config';
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
    explicitFilters?: Record<string, string>
  ): Promise<BotResponse> {
    const { intent } = classification;

    switch (intent) {
      case INTENTS.QUERY_LIST:
        return this.handleQueryList(classification, context);
      case INTENTS.QUERY_EXECUTE:
        return this.handleQueryExecute(classification, context, explicitFilters);
      case INTENTS.QUERY_MULTI:
        return this.handleQueryMulti(classification, context);
      case INTENTS.QUERY_ESTIMATE:
        return this.handleQueryEstimate(classification, context);
      case INTENTS.URL_FIND:
        return this.handleUrlFind(classification, context);
      case INTENTS.GREETING:
      case INTENTS.HELP:
        return this.handleStaticIntent(classification, context);
      case INTENTS.FAREWELL:
        return this.handleFarewell(classification, context);
      default: {
        // Try to answer follow-up questions about the last query result
        const followUp = this.handleFollowUp(classification, context);
        if (followUp) return followUp;
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
    explicitFilters?: Record<string, string>
  ): Promise<BotResponse> {
    const queryNameEntity = classification.entities.find(
      (e) => e.entity === 'query_name'
    );

    if (!queryNameEntity) {
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
        options
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
    context: ConversationContext
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
        hasFilters ? filters : undefined
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
