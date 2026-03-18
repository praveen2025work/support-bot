import { NextRequest, NextResponse } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const res = await fetch(`${ENGINE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to proxy upload' }, { status: 500 });
  }
}
