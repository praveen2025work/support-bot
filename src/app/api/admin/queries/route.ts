import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

const DB_JSON_PATH = path.join(process.cwd(), 'mock-api/db.json');

interface FilterBinding {
  key: string;
  binding: 'body' | 'query_param' | 'path';
}

interface QueryRecord {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  url: string;
  source: string;
  filters: FilterBinding[];
  type: 'api' | 'url' | 'document' | 'csv';
  filePath?: string;
  endpoint?: string;
}

async function readDb(): Promise<{ queries: QueryRecord[] }> {
  const raw = await fs.readFile(DB_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeDb(data: { queries: QueryRecord[] }): Promise<void> {
  await fs.writeFile(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET: List all queries, optionally filtered by source
export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source');
    const db = await readDb();
    let queries = db.queries;
    if (source) {
      const sources = source.split(',').map((s) => s.trim());
      queries = queries.filter((q) => sources.includes(q.source));
    }
    return NextResponse.json({ queries });
  } catch (error) {
    logger.error({ error }, 'Failed to read queries');
    return NextResponse.json({ queries: [] }, { status: 500 });
  }
}

// POST: Add a new query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, source, url, filters, estimatedDuration } = body;

    if (!name || !source) {
      return NextResponse.json(
        { error: 'name and source are required' },
        { status: 400 }
      );
    }

    const db = await readDb();

    // Check duplicate name
    if (db.queries.some((q) => q.name === name)) {
      return NextResponse.json(
        { error: `Query "${name}" already exists` },
        { status: 409 }
      );
    }

    // Generate next ID
    const maxNum = db.queries
      .map((q) => parseInt(q.id.replace('q', ''), 10))
      .filter((n) => !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0);

    const queryType = body.type || 'api';
    if (queryType === 'url' && !url) {
      return NextResponse.json({ error: 'URL-type queries require a url' }, { status: 400 });
    }
    if ((queryType === 'document' || queryType === 'csv') && !body.filePath) {
      return NextResponse.json({ error: 'Document/CSV-type queries require a filePath' }, { status: 400 });
    }
    if (queryType === 'api' && !body.endpoint) {
      return NextResponse.json({ error: 'API-type queries require an endpoint' }, { status: 400 });
    }

    const newQuery: QueryRecord = {
      id: `q${maxNum + 1}`,
      name,
      description: description || '',
      estimatedDuration: estimatedDuration || 2000,
      url: url || '',
      source,
      filters: filters || [],
      type: queryType,
      filePath: body.filePath || '',
      endpoint: body.endpoint || '',
    };

    db.queries.push(newQuery);
    await writeDb(db);

    return NextResponse.json(newQuery, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create query');
    return NextResponse.json({ error: 'Failed to create query' }, { status: 500 });
  }
}

// PATCH: Update an existing query by id (passed in body)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = await readDb();
    const idx = db.queries.findIndex((q) => q.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    const query = db.queries[idx];
    if (updates.name !== undefined) query.name = updates.name;
    if (updates.description !== undefined) query.description = updates.description;
    if (updates.source !== undefined) query.source = updates.source;
    if (updates.url !== undefined) query.url = updates.url;
    if (updates.filters !== undefined) query.filters = updates.filters;
    if (updates.estimatedDuration !== undefined) query.estimatedDuration = updates.estimatedDuration;
    if (updates.type !== undefined) query.type = updates.type;
    if (updates.filePath !== undefined) query.filePath = updates.filePath;
    if (updates.endpoint !== undefined) query.endpoint = updates.endpoint;

    db.queries[idx] = query;
    await writeDb(db);

    return NextResponse.json(query);
  } catch (error) {
    logger.error({ error }, 'Failed to update query');
    return NextResponse.json({ error: 'Failed to update query' }, { status: 500 });
  }
}

// DELETE: Remove a query by id (passed as query param)
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const db = await readDb();
    const idx = db.queries.findIndex((q) => q.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    db.queries.splice(idx, 1);
    await writeDb(db);

    return NextResponse.json({ success: true, deletedQueryId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to delete query');
    return NextResponse.json({ error: 'Failed to delete query' }, { status: 500 });
  }
}
