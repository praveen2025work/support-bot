import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward auth-related headers for Windows Auth / BAM pass-through
    const forwardHeaders: Record<string, string> = {};
    const auth = request.headers.get('authorization');
    if (auth) forwardHeaders['authorization'] = auth;
    const cookie = request.headers.get('cookie');
    if (cookie) forwardHeaders['cookie'] = cookie;

    const engineRes = await proxyToEngine('/api/chat', {
      method: 'POST',
      body,
      headers: forwardHeaders,
    });

    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    const err = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    logger.error({ error: err }, 'Chat API error — engine unreachable');
    return NextResponse.json(
      { error: 'Engine service unreachable' },
      { status: 502 }
    );
  }
}
