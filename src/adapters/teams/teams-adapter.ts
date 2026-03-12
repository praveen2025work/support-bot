import type { IPlatformAdapter } from '../adapter.interface';
import type { ChatMessage, BotResponse } from '@/core/types';

interface TeamsActivity {
  type: string;
  id: string;
  text?: string;
  from?: { id: string; name?: string };
  conversation?: { id: string };
  serviceUrl?: string;
  channelId?: string;
}

export class TeamsAdapter implements IPlatformAdapter {
  readonly platform = 'teams';

  async parseIncoming(rawBody: unknown): Promise<ChatMessage | null> {
    const activity = rawBody as TeamsActivity;

    if (activity.type !== 'message' || !activity.text) return null;

    return {
      id: activity.id || crypto.randomUUID(),
      text: activity.text,
      sessionId: `teams-${activity.conversation?.id || 'unknown'}-${activity.from?.id || 'unknown'}`,
      platform: 'teams',
      userId: activity.from?.id,
      metadata: {
        conversationId: activity.conversation?.id,
        serviceUrl: activity.serviceUrl,
        channelId: activity.channelId,
      },
      timestamp: new Date(),
    };
  }

  async formatResponse(response: BotResponse): Promise<unknown> {
    // Format as Teams Adaptive Card
    const card: Record<string, unknown> = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: response.text,
                wrap: true,
              },
            ],
          },
        },
      ],
    };

    // Add URL list if present
    if (response.richContent?.type === 'url_list') {
      const urls = response.richContent.data as Array<{
        title: string;
        url: string;
      }>;
      const cardContent = (card.attachments as Array<{ content: { body: unknown[] } }>)[0].content;
      for (const url of urls) {
        cardContent.body.push({
          type: 'TextBlock',
          text: `[${url.title}](${url.url})`,
          wrap: true,
        });
      }
    }

    // Add suggestion actions if present
    if (response.suggestions?.length) {
      const cardContent = (card.attachments as Array<{ content: Record<string, unknown> }>)[0].content;
      cardContent.actions = response.suggestions.map((s) => ({
        type: 'Action.Submit',
        title: s,
        data: { text: s },
      }));
    }

    return card;
  }

  async sendResponse(
    formattedResponse: unknown,
    context: unknown
  ): Promise<void> {
    const ctx = context as {
      serviceUrl: string;
      conversationId: string;
    };

    // In production, use the Bot Framework SDK to send the response
    // via ctx.serviceUrl to the conversation
    const url = `${ctx.serviceUrl}/v3/conversations/${ctx.conversationId}/activities`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formattedResponse),
    });
  }

  async verifyRequest(
    _rawBody: unknown,
    headers: Record<string, string>
  ): Promise<boolean> {
    // In production, verify the JWT token from the Authorization header
    // using the Bot Framework authentication library
    return !!headers['authorization'];
  }
}
