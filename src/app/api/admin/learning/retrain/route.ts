import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${ENGINE_URL}/api/admin/learning/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy retrain request' }, { status: 500 });
  }
}
