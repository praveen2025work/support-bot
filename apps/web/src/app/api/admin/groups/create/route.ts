import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const engineRes = await proxyToEngine('/api/admin/groups/create', {
      method: 'POST',
      body,
    });

    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Admin group create error — engine unreachable');
    return NextResponse.json({ error: 'Engine service unreachable' }, { status: 502 });
  }
}
