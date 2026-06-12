import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId') || 'default';
    const engineRes = await proxyToEngine(
      `/api/admin/anomaly/config?groupId=${encodeURIComponent(groupId)}`
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ config: null }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const engineRes = await proxyToEngine('/api/admin/anomaly/config', {
      method: 'PUT',
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ error: 'Engine unreachable' }, { status: 502 });
  }
}
