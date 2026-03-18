import { logger } from '@/lib/logger';
import { CrossSourceJoiner } from '../../intelligence/cross-source';
import type { QueryService, QueryExecutionResult } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';

const COMPARE_PATTERN = /\bcompare\b\s+(\S+)\s+(?:to|with|and|vs|versus)\s+(\S+)/i;

/**
 * Extract tabular data rows from a QueryExecutionResult, regardless of type (api/csv/xlsx).
 */
function extractRows(result: QueryExecutionResult): Record<string, unknown>[] {
  if (result.type === 'api' && result.apiResult) {
    const apiData = result.apiResult as { data?: Record<string, unknown>[] };
    return apiData.data || [];
  }
  if ((result.type === 'csv' || result.type === 'xlsx') && result.csvResult) {
    return result.csvResult.rows as Record<string, unknown>[];
  }
  return [];
}

/**
 * Handle "compare X with Y" — execute both queries, auto-detect join column,
 * return merged result table.
 */
export async function handleCompare(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
  incomingHeaders?: Record<string, string>,
  groupId?: string
): Promise<BotResponse | null> {
  // Extract query names from user text
  const userText = context.history
    .slice()
    .reverse()
    .find((h) => h.role === 'user')?.text || '';

  const match = userText.match(COMPARE_PATTERN);
  if (!match) return null;

  const queryNameA = match[1];
  const queryNameB = match[2];

  logger.info({ queryNameA, queryNameB }, 'Handling cross-source compare');

  try {
    // Execute both queries in parallel
    const [resultA, resultB] = await Promise.all([
      queryService.executeQuery(queryNameA, {}, undefined, incomingHeaders),
      queryService.executeQuery(queryNameB, {}, undefined, incomingHeaders),
    ]);

    if (!resultA || !resultB) {
      return {
        text: `Could not find one or both queries: "${queryNameA}", "${queryNameB}". Try "list queries" to see available queries.`,
        suggestions: ['List queries'],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    const dataA = extractRows(resultA);
    const dataB = extractRows(resultB);

    if (dataA.length === 0 || dataB.length === 0) {
      return {
        text: `Both queries need to return tabular data for comparison. "${queryNameA}" returned ${dataA.length} rows, "${queryNameB}" returned ${dataB.length} rows.`,
        suggestions: [`Run ${queryNameA}`, `Run ${queryNameB}`],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    const headersA = Object.keys(dataA[0]);
    const headersB = Object.keys(dataB[0]);

    const joiner = new CrossSourceJoiner();
    const candidates = joiner.detectJoinableColumns(dataA, dataB, headersA, headersB);

    if (candidates.length === 0) {
      return {
        text: `No matching columns found between "${queryNameA}" and "${queryNameB}". The datasets don't appear to share a common key for joining.\n\nColumns in ${queryNameA}: ${headersA.join(', ')}\nColumns in ${queryNameB}: ${headersB.join(', ')}`,
        suggestions: [`Run ${queryNameA}`, `Run ${queryNameB}`, 'Help'],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    // Use the best join candidate
    const bestCandidate = candidates[0];
    const joinResult = joiner.innerJoin(
      dataA,
      dataB,
      bestCandidate.leftColumn,
      bestCandidate.rightColumn,
      queryNameA,
      queryNameB
    );

    // Build a summary
    const summaryParts = [
      `Joined **${queryNameA}** (${joinResult.leftCount} rows) with **${queryNameB}** (${joinResult.rightCount} rows)`,
      `on column "${bestCandidate.leftColumn}" ↔ "${bestCandidate.rightColumn}"`,
      `(name similarity: ${(bestCandidate.nameScore * 100).toFixed(0)}%, value overlap: ${(bestCandidate.valueOverlap * 100).toFixed(0)}%)`,
      `→ **${joinResult.matchedCount}** matched rows, ${joinResult.unmatchedLeft} unmatched left, ${joinResult.unmatchedRight} unmatched right`,
    ];

    // Store joined data in context for follow-up operations
    context.lastQueryName = `${queryNameA}_vs_${queryNameB}`;
    context.lastApiResult = {
      data: joinResult.joinedData,
      headers: joinResult.joinedData.length > 0 ? Object.keys(joinResult.joinedData[0]) : [],
      total: joinResult.matchedCount,
    };

    return {
      text: summaryParts.join('\n'),
      richContent: {
        type: 'query_result',
        data: {
          data: joinResult.joinedData.slice(0, 100),
          rowCount: joinResult.matchedCount,
          executionTime: 0,
          headers: joinResult.joinedData.length > 0 ? Object.keys(joinResult.joinedData[0]) : [],
          total: joinResult.matchedCount,
          queryName: `${queryNameA} ↔ ${queryNameB}`,
        },
      },
      suggestions: ['Summarize', 'Sort by', 'Group by', 'Find outliers'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
      sourceName: `${queryNameA} ↔ ${queryNameB}`,
      sourceType: 'api',
    };
  } catch (error) {
    logger.error({ error, queryNameA, queryNameB }, 'Compare handler error');
    return {
      text: `Error comparing "${queryNameA}" with "${queryNameB}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestions: ['List queries', 'Help'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
}
