import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const res = await fetch(`${ENGINE_URL}/api/admin/learning/review?${searchParams.toString()}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy learning review request' }, { status: 500 });
  }
}
