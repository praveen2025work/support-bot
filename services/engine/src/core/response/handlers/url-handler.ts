import { logger } from '@/lib/logger';
import type { QueryService } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';
import { errorResponse } from './query-handler';

/**
 * Handle url.find intent — find relevant URLs for a topic.
 */
export async function handleUrlFind(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService
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
    const urls = await queryService.findRelevantUrls(
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
    return errorResponse(
      'Unable to search for URLs. Please try again later.',
      classification,
      context
    );
  }
}
