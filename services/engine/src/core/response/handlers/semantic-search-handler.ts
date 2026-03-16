import { getSemanticIndex } from '../../semantic/semantic-index';
import type { QueryService } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';

/**
 * Handle query.search intent — semantic search across available queries.
 */
export async function handleSemanticSearch(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
  groupId: string
): Promise<BotResponse> {
  const idx = getSemanticIndex(groupId);

  // Build/rebuild index if needed
  if (!idx.isBuilt) {
    const queries = await queryService.getQueries();
    idx.buildIndex(queries.map((q) => ({ name: q.name, description: q.description })));
    idx.save().catch(() => {});
  }

  // Extract search text: strip "find query about" type prefixes
  const userText = context.history
    .filter((h) => h.role === 'user')
    .pop()?.text || '';
  const searchText = userText
    .replace(/\b(find|search|look\s*up|show|which|what)\b.*?\b(quer(?:y|ies)|report|data)\b\s*(about|for|related\s+to|on|with)?\s*/i, '')
    .trim() || userText;

  const results = idx.search(searchText, 5);

  if (results.length === 0) {
    return {
      text: `I couldn't find any queries matching "${searchText}". Try "list queries" to see all available queries.`,
      suggestions: ['List queries', 'Help'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  const queryItems = results.map((r) => ({
    name: r.queryName,
    description: r.description,
    type: 'api' as string,
    filters: [] as string[],
    score: r.score,
  }));

  return {
    text: `Found ${results.length} matching quer${results.length === 1 ? 'y' : 'ies'} for "${searchText}":`,
    richContent: { type: 'query_list', data: queryItems },
    suggestions: results.slice(0, 3).map((r) => `run ${r.queryName}`),
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}
