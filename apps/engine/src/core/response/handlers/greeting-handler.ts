import { INTENTS } from '../../constants';
import type { QueryService } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';

/**
 * Handle greeting intent — returns a random greeting template with contextual suggestions.
 */
export async function handleGreeting(
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
      'Help',
      ...names.slice(0, 2).map((n) => `Run ${n}`),
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

/**
 * Handle farewell intent — returns a random farewell template.
 */
export function handleFarewell(
  classification: ClassificationResult,
  context: ConversationContext,
  templates: Record<string, string[]>
): BotResponse {
  const tplList = templates[classification.intent];
  const text = tplList
    ? tplList[Math.floor(Math.random() * tplList.length)]
    : 'Goodbye!';

  return {
    text,
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}
