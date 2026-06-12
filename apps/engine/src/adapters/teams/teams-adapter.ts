import type { IPlatformAdapter } from '../adapter.interface';
import type { ChatMessage, BotResponse } from '@/core/types';
import { generateId } from '@/lib/generate-id';
import { logger } from '@/lib/logger';

const VALID_ISSUERS = [
  'https://api.botframework.com',
  'https://sts.windows.net/',
];

interface JwtPayload {
  iss?: string;
  aud?: string;
  exp?: number;
  nbf?: number;
  [key: string]: unknown;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

function verifyTeamsJwt(authHeader: string): boolean {
  const teamsAppId = process.env.TEAMS_APP_ID;

  // Demo mode — no TEAMS_APP_ID configured, allow all with warning
  if (!teamsAppId) {
    logger.warn('TEAMS_APP_ID not set — skipping JWT verification (demo mode)');
    return true;
  }

  // Must be a Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('Teams auth header is not a Bearer token');
    return false;
  }

  const token = authHeader.slice(7);
  const payload = decodeJwtPayload(token);

  if (!payload) {
    logger.warn('Failed to decode Teams JWT payload');
    return false;
  }

  // Validate issuer
  const issuerValid = VALID_ISSUERS.some(
    (iss) => payload.iss === iss || payload.iss?.startsWith(iss)
  );
  if (!issuerValid) {
    logger.warn({ issuer: payload.iss }, 'Teams JWT has invalid issuer');
    return false;
  }

  // Validate audience matches our app ID
  if (payload.aud !== teamsAppId) {
    logger.warn({ audience: payload.aud, expected: teamsAppId }, 'Teams JWT audience mismatch');
    return false;
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    logger.warn({ exp: payload.exp, now }, 'Teams JWT is expired');
    return false;
  }

  return true;
}

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
      id: activity.id || generateId(),
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
    const authHeader = headers['authorization'];
    if (!authHeader) {
      logger.warn('Teams request missing authorization header');
      return false;
    }

    return verifyTeamsJwt(authHeader);
  }
}
