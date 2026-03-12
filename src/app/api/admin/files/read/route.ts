import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data/knowledge');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'name query param is required' }, { status: 400 });
    }

    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const filePath = join(DATA_DIR, safeName);
    const content = readFileSync(filePath, 'utf-8');

    return NextResponse.json({ name: safeName, content });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
