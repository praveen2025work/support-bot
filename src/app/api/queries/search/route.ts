import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    const groupId = request.nextUrl.searchParams.get('groupId') || 'default';
    const engineRes = await proxyToEngine(
      `/api/queries/search?q=${encodeURIComponent(q)}&groupId=${encodeURIComponent(groupId)}`
    );
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
