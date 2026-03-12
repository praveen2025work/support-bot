import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/singleton';
import { TeamsAdapter } from '@/adapters/teams/teams-adapter';
import { logger } from '@/lib/logger';

const adapter = new TeamsAdapter();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());

    const isValid = await adapter.verifyRequest(body, headers);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = await adapter.parseIncoming(body);
    if (!message) {
      return NextResponse.json({ status: 'ignored' });
    }

    const engine = getEngine();
    const response = await engine.processMessage(message);
    const formatted = await adapter.formatResponse(response);

    // Send response back to Teams asynchronously
    const metadata = message.metadata as {
      serviceUrl?: string;
      conversationId?: string;
    };

    if (metadata?.serviceUrl && metadata?.conversationId) {
      adapter
        .sendResponse(formatted, {
          serviceUrl: metadata.serviceUrl,
          conversationId: metadata.conversationId,
        })
        .catch((error) => {
          logger.error({ error }, 'Failed to send Teams response');
        });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    logger.error({ error }, 'Teams webhook error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
