import { NextResponse } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${ENGINE_URL}/api/events`, {
      headers: { Accept: 'text/event-stream' },
    });

    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'SSE upstream unavailable' }, { status: 502 });
    }

    // Stream the SSE response through
    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy events' }, { status: 500 });
  }
}
