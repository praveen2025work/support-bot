import { z } from 'zod';
import type { IPlatformAdapter } from '../adapter.interface';
import type { ChatMessage, BotResponse } from '@/core/types';
import { generateId } from '@/lib/generate-id';

const WebMessageSchema = z.object({
  text: z.string().min(1).max(2000),
  sessionId: z.string().min(1),
  groupId: z.string().optional(),
});

export class WebAdapter implements IPlatformAdapter {
  readonly platform = 'web';

  async parseIncoming(rawBody: unknown): Promise<ChatMessage | null> {
    const parsed = WebMessageSchema.safeParse(rawBody);
    if (!parsed.success) return null;

    return {
      id: generateId(),
      text: parsed.data.text,
      sessionId: parsed.data.sessionId,
      platform: 'web',
      groupId: parsed.data.groupId,
      timestamp: new Date(),
    };
  }

  async formatResponse(response: BotResponse): Promise<unknown> {
    return {
      text: response.text,
      richContent: response.richContent,
      suggestions: response.suggestions,
      intent: response.intent,
      confidence: response.confidence,
      executionMs: response.executionMs,
      referenceUrl: response.referenceUrl,
    };
  }

  async sendResponse(): Promise<void> {
    // Web adapter returns response directly via HTTP -- no push needed
  }

  async verifyRequest(): Promise<boolean> {
    return true;
  }
}
