import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId') || 'default';
    const engineRes = await proxyToEngine(`/api/queries?groupId=${encodeURIComponent(groupId)}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Queries API error — engine unreachable');
    return NextResponse.json({ queries: [] }, { status: 502 });
  }
}
