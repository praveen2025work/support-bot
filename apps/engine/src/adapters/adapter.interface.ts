import type { ChatMessage, BotResponse } from '@/core/types';

export interface IPlatformAdapter {
  readonly platform: string;

  parseIncoming(
    rawBody: unknown,
    headers?: Record<string, string>
  ): Promise<ChatMessage | null>;

  formatResponse(response: BotResponse): Promise<unknown>;

  sendResponse(formattedResponse: unknown, context: unknown): Promise<void>;

  verifyRequest(
    rawBody: unknown,
    headers: Record<string, string>
  ): Promise<boolean>;
}
