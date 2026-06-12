import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

// GET: Retrieve stats with optional filters and aggregated metrics
export async function GET(request: NextRequest) {
  try {
    const queryName = request.nextUrl.searchParams.get('queryName');
    const since = request.nextUrl.searchParams.get('since');

    const params = new URLSearchParams();
    if (queryName) params.set('queryName', queryName);
    if (since) params.set('since', since);

    const qs = params.toString();
    const engineRes = await proxyToEngine(`/api/stats${qs ? `?${qs}` : ''}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Stats GET error — engine unreachable');
    return NextResponse.json({ stats: [], aggregated: [], totalRecords: 0 }, { status: 502 });
  }
}

// POST: Record a new stat entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine('/api/stats', {
      method: 'POST',
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Stats POST error — engine unreachable');
    return NextResponse.json({ error: 'Engine service unreachable' }, { status: 502 });
  }
}
