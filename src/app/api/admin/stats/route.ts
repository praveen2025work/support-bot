import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const res = await fetch(`${ENGINE_URL}/api/stats?${searchParams.toString()}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy stats request' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${ENGINE_URL}/api/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy stats request' }, { status: 500 });
  }
}
