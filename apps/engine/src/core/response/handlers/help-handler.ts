import type { QueryService } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';
import { INTENTS } from '../../constants';

/**
 * Handle help intent — returns a help template with contextual suggestions.
 */
export async function handleHelp(
  classification: ClassificationResult,
  context: ConversationContext,
  templates: Record<string, string[]>,
  queryService: QueryService
): Promise<BotResponse> {
  const tplList = templates[classification.intent];
  const text = tplList
    ? tplList[Math.floor(Math.random() * tplList.length)]
    : "I'm not sure how to help with that.";

  let suggestions: string[] = [];
  try {
    const names = await queryService.getQueryNames();
    suggestions = [
      'List queries',
      ...names.slice(0, 3).map((n) => `Run ${n}`),
    ];
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
