import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the engine's chat endpoint with platform=teams
    // The engine's chat route + TeamsAdapter handles verification and async reply
    const payload = {
      ...body,
      platform: 'teams',
    };

    const engineRes = await proxyToEngine('/api/chat', {
      method: 'POST',
      body: payload,
    });

    if (!engineRes.ok) {
      const errorData = await engineRes.json().catch(() => ({}));
      logger.error({ status: engineRes.status, errorData }, 'Teams webhook — engine error');
      return NextResponse.json(
        { error: errorData.error || 'Engine error' },
        { status: engineRes.status }
      );
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    logger.error({ error }, 'Teams webhook error — engine unreachable');
    return NextResponse.json(
      { error: 'Engine service unreachable' },
      { status: 502 }
    );
  }
}
