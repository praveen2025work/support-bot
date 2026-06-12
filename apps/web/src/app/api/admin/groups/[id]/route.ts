import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const engineRes = await proxyToEngine(`/api/admin/groups/${encodeURIComponent(id)}`);
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Admin GET group error — engine unreachable');
    return NextResponse.json({ error: 'Engine service unreachable' }, { status: 502 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const engineRes = await proxyToEngine(`/api/admin/groups/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body,
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Admin PATCH group error — engine unreachable');
    return NextResponse.json({ error: 'Engine service unreachable' }, { status: 502 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const engineRes = await proxyToEngine(`/api/admin/groups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await engineRes.json();
    return NextResponse.json(data, { status: engineRes.status });
  } catch (error) {
    logger.error({ error }, 'Admin DELETE group error — engine unreachable');
    return NextResponse.json({ error: 'Engine service unreachable' }, { status: 502 });
  }
}
