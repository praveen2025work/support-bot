import { NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const engineRes = await proxyToEngine('/api/groups');
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Groups API error — engine unreachable');
    return NextResponse.json({ groups: [] }, { status: 502 });
  }
}
