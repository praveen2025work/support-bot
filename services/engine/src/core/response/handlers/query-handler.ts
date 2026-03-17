import { logger } from '@/lib/logger';
import type { QueryService, QueryExecuteOptions } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';
import { STOP_WORDS, GROUP_BY_PATTERN, SORT_PATTERN, SUMMARY_PATTERN, TOP_BOTTOM_PATTERN } from '../constants';
import { extractFilters, formatFilters, parseFilterFromText, mergeFilters } from './filter-utils';
import { handleGroupByFollowUp, handleSortFollowUp, handleSummaryFollowUp, handleTopNFollowUp } from './followup-handler';
import { getAnomalyDetector } from '../../anomaly/anomaly-detector';

/**
 * Get the last user message text from conversation history.
 */
export function getLastUserText(context: ConversationContext): string {
  for (let i = context.history.length - 1; i >= 0; i--) {
    if (context.history[i].role === 'user') return context.history[i].text;
  }
  return '';
}

/**
 * Build execution options (search keywords, aggregation, group-by, sort) from user text.
 */
export function buildExecuteOptions(
  userText: string,
  queryName: string,
  classification: ClassificationResult
): QueryExecuteOptions | undefined {
  if (!userText) return undefined;

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

/**
 * Shared helper: re-run the last query stored in context with new filters.
 */
export async function rerunLastQueryWithFilters(
  context: ConversationContext,
  filters: Record<string, string>,
  classification: ClassificationResult,
  queryService: QueryService,
  incomingHeaders?: Record<string, string>
): Promise<BotResponse> {
  const filterLabel = formatFilters(filters);

  try {
    const result = await queryService.executeQuery(
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
    return errorResponse(
      `Unable to re-run "${context.lastQueryName}" with those filters. Please try again.`,
      classification,
      context
    );
  }
}

/**
 * Handle query.list intent — list all available queries.
 */
export async function handleQueryList(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService
): Promise<BotResponse> {
  try {
    const queries = await queryService.getQueries();
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
    return errorResponse(
      'Unable to fetch available queries. Please try again later.',
      classification,
      context
    );
  }
}

/**
 * Handle query.execute intent — execute a named query with optional filters.
 */
export async function handleQueryExecute(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
  explicitFilters?: Record<string, string>,
  incomingHeaders?: Record<string, string>,
  groupId?: string
): Promise<BotResponse> {
  // If user text is a data operation (group/sort/summary/top), always try follow-up first
  if (context.lastQueryName && context.lastApiResult) {
    const userText = getLastUserText(context);
    const isDataOp = GROUP_BY_PATTERN.test(userText) || SORT_PATTERN.test(userText) || SUMMARY_PATTERN.test(userText) || TOP_BOTTOM_PATTERN.test(userText);
    if (isDataOp) {
      const groupByRes = handleGroupByFollowUp(classification, context);
      if (groupByRes) return groupByRes;
      const sortRes = handleSortFollowUp(classification, context);
      if (sortRes) return sortRes;
      const summaryRes = handleSummaryFollowUp(classification, context);
      if (summaryRes) return summaryRes;
      const topNRes = handleTopNFollowUp(classification, context);
      if (topNRes) return topNRes;
    }
  }

  const queryNameEntity = classification.entities.find(
    (e) => e.entity === 'query_name'
  );

  if (!queryNameEntity) {
    if (context.lastQueryName) {
      const userText = getLastUserText(context);

      // Data operations on previous results
      const groupByRes = handleGroupByFollowUp(classification, context);
      if (groupByRes) return groupByRes;
      const sortRes = handleSortFollowUp(classification, context);
      if (sortRes) return sortRes;
      const summaryRes = handleSummaryFollowUp(classification, context);
      if (summaryRes) return summaryRes;
      const topNRes = handleTopNFollowUp(classification, context);
      if (topNRes) return topNRes;

      // Filter follow-up
      const filters = extractFilters(classification.entities);
      const parsedFilters = parseFilterFromText(userText);
      if (parsedFilters) {
        for (const [k, v] of Object.entries(parsedFilters)) {
          if (!filters[k]) filters[k] = v;
        }
      }
      if (Object.keys(filters).length > 0) {
        logger.info({ lastQuery: context.lastQueryName, filters }, 'Re-running last query with filter follow-up');
        return rerunLastQueryWithFilters(context, filters, classification, queryService, incomingHeaders);
      }
    }

    try {
      const names = await queryService.getQueryNames();
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

  // Merge NLP-extracted filters with text-parsed filters and explicit (form) filters.
  // NLP entities provide the primary filter extraction; parseFilterFromText catches
  // patterns the NLP model missed (e.g. "give me sales data for region US" when
  // NLP extracted query_name but not region).
  const userText = getLastUserText(context);
  const nlpFilters = extractFilters(classification.entities);
  const textFilters = parseFilterFromText(userText);
  const filters = mergeFilters(nlpFilters, textFilters, explicitFilters);
  const filterLabel = formatFilters(filters);
  const hasFilters = Object.keys(filters).length > 0;

  if (hasFilters) {
    logger.info({ queryName: queryNameEntity.value, filters, nlpFilters, textFilters }, 'Filters extracted from NLP + text');
  }

  // Extract options for document search / CSV aggregation from user text
  const options = buildExecuteOptions(userText, queryNameEntity.value, classification);

  try {
    const result = await queryService.executeQuery(
      queryNameEntity.value,
      hasFilters ? filters : undefined,
      options,
      incomingHeaders
    );

    const execMs = result.durationMs;

    // Look up reference URL and chartConfig for this query
    let referenceUrl: string | undefined;
    let chartConfig: Record<string, unknown> | undefined;
    try {
      const allQueries = await queryService.getQueries();
      const queryDef = allQueries.find(
        (q) => q.name.toLowerCase() === queryNameEntity.value.toLowerCase()
      );
      if (queryDef?.url && queryDef.type !== 'url') {
        referenceUrl = queryDef.url;
      }
      if (queryDef?.chartConfig) {
        chartConfig = queryDef.chartConfig as Record<string, unknown>;
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

    // Anomaly detection (fire-and-forget snapshot + blocking check)
    let anomalies: BotResponse['anomalies'] = undefined;
    try {
      const anomalyData = result.type === 'api'
        ? (result.apiResult as { data?: Record<string, unknown>[] })?.data
        : result.type === 'csv'
        ? (result.csvResult as { rows?: Record<string, unknown>[] })?.rows
        : undefined;

      if (anomalyData && anomalyData.length > 0) {
        const detector = getAnomalyDetector(groupId || 'default');
        detector.recordSnapshot(queryNameEntity.value, anomalyData).catch(() => {});
        const detected = await detector.checkAnomalies(queryNameEntity.value, anomalyData);
        if (detected.length > 0) anomalies = detected;
      }
    } catch { /* anomaly detection is non-critical */ }

    switch (result.type) {
      case 'url':
        return {
          text: `Here is the link for "${queryNameEntity.value}":`,
          richContent: { type: 'url_list', data: [result.urlResult] },
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
          executionMs: execMs,
          queryName: queryNameEntity.value,
          anomalies,
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
            queryName: queryNameEntity.value,
            anomalies,
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
          queryName: queryNameEntity.value,
          anomalies,
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
            queryName: queryNameEntity.value,
            anomalies,
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
            queryName: queryNameEntity.value,
            anomalies,
          };
        }
        return {
          text: `Here is the data from "${queryNameEntity.value}" (${csv.rowCount} rows):`,
          richContent: { type: 'csv_table', data: chartConfig ? { ...csv, chartConfig } : csv },
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
          executionMs: execMs,
          referenceUrl,
          queryName: queryNameEntity.value,
          anomalies,
        };
      }

      case 'api':
      default: {
        const apiData = chartConfig
          ? { ...(result.apiResult as Record<string, unknown>), chartConfig }
          : result.apiResult;
        return {
          text: `Here are the results for "${queryNameEntity.value}"${filterLabel}:`,
          richContent: { type: 'query_result', data: apiData },
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
          executionMs: execMs,
          referenceUrl,
          queryName: queryNameEntity.value,
          anomalies,
        };
      }
    }
  } catch (error) {
    logger.error({ error, query: queryNameEntity.value, filters }, 'Query execution failed');
    return errorResponse(
      `Unable to execute the query "${queryNameEntity.value}". Please try again later.`,
      classification,
      context
    );
  }
}

/**
 * Handle query.multi intent — execute multiple queries in parallel.
 */
export async function handleMultiQuery(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
  incomingHeaders?: Record<string, string>
): Promise<BotResponse> {
  const queryEntities = classification.entities.filter(
    (e) => e.entity === 'query_name'
  );

  if (queryEntities.length < 2) {
    try {
      const names = await queryService.getQueryNames();
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

  const filters = extractFilters(classification.entities);
  const filterLabel = formatFilters(filters);
  const hasFilters = Object.keys(filters).length > 0;
  const queryNames = queryEntities.map((e) => e.value);

  try {
    const results = await queryService.executeMultipleQueries(
      queryNames,
      hasFilters ? filters : undefined,
      incomingHeaders
    );

    if (results.length === 0) {
      return errorResponse(
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
    return errorResponse(
      `Unable to execute queries. Please try again later.`,
      classification,
      context
    );
  }
}

/**
 * Handle query.estimate intent — estimate query execution time.
 */
export async function handleQueryEstimate(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService
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
    const estimation = await queryService.getEstimation(
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
    return errorResponse(
      `Unable to get estimation for "${queryNameEntity.value}".`,
      classification,
      context
    );
  }
}

/**
 * Produce a standard error response.
 */
export function errorResponse(
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
