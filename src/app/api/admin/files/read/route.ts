import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import path from 'path';
import { isRequestAdmin } from '@/lib/admin-auth';

const DATA_DIR = join(process.cwd(), 'data/knowledge');

export async function GET(request: NextRequest) {
  const auth = await isRequestAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'name query param is required' }, { status: 400 });
    }

    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');

    // Path traversal protection
    const resolved = path.resolve(DATA_DIR, safeName);
    if (!resolved.startsWith(path.resolve(DATA_DIR) + path.sep) && resolved !== path.resolve(DATA_DIR)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const content = readFileSync(resolved, 'utf-8');

    return NextResponse.json({ name: safeName, content });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
