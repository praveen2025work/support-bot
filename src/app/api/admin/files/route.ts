import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, extname } from 'path';
import path from 'path';
import { isRequestAdmin } from '@/lib/admin-auth';

const DATA_DIR = join(process.cwd(), 'data/knowledge');

interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  modifiedAt: string;
  preview: string;
}

// GET — list all knowledge files
export async function GET(request: NextRequest) {
  const auth = await isRequestAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  try {
    const files = readdirSync(DATA_DIR);
    const fileInfos: FileInfo[] = files
      .filter((f) => !f.startsWith('.'))
      .map((name) => {
        const filePath = join(DATA_DIR, name);
        const stat = statSync(filePath);
        const content = readFileSync(filePath, 'utf-8');
        return {
          name,
          path: `data/knowledge/${name}`,
          size: stat.size,
          extension: extname(name).slice(1),
          modifiedAt: stat.mtime.toISOString(),
          preview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        };
      })
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

    return NextResponse.json({ files: fileInfos, totalFiles: fileInfos.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — create or update a file
export async function POST(request: NextRequest) {
  const auth = await isRequestAdmin(request);
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, content } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'name and content are required' }, { status: 400 });
    }

    // Sanitize filename
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');

    // Path traversal protection
    const resolved = path.resolve(DATA_DIR, safeName);
    if (!resolved.startsWith(path.resolve(DATA_DIR) + path.sep) && resolved !== path.resolve(DATA_DIR)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    writeFileSync(resolved, content, 'utf-8');

    return NextResponse.json({ success: true, name: safeName });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — delete a file
export async function DELETE(request: NextRequest) {
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

    unlinkSync(resolved);

    return NextResponse.json({ success: true, deleted: safeName });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
