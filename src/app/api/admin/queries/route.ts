import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { withDbLock, readDb } from '@/lib/db';
import { proxyToEngine } from '@/lib/engine-proxy';

interface FilterBinding {
  key: string;
  binding: 'body' | 'query_param' | 'path';
}

interface ColumnConfig {
  idColumns?: string[];
  dateColumns?: string[];
  labelColumns?: string[];
  valueColumns?: string[];
  ignoreColumns?: string[];
}

interface QueryRecord {
  id: string;
  name: string;
  description: string;
  estimatedDuration: number;
  url: string;
  source: string;
  filters: FilterBinding[];
  type: 'api' | 'url' | 'document' | 'csv' | 'xlsx';
  filePath?: string;
  fileBaseDir?: string;
  sheetName?: string;
  endpoint?: string;
  baseUrl?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authType?: 'none' | 'bearer' | 'windows' | 'bam';
  bamTokenUrl?: string;
  columnConfig?: ColumnConfig;
}

/** Sanitize a sheet name to a valid query name suffix (snake_case). */
function toSnakeCase(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** Read xlsx sheet names from an engine data file. Returns empty array for non-xlsx files. */
async function getXlsxSheetNames(filePath: string, queryFileBaseDir?: string): Promise<string[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.xlsx' && ext !== '.xls') return [];
  try {
    // Priority: per-query fileBaseDir → global FILE_BASE_DIR → services/engine
    const externalBase = queryFileBaseDir || process.env.FILE_BASE_DIR || '';
    const baseDir = externalBase || path.resolve(process.cwd(), 'services/engine');
    const resolved = path.resolve(baseDir, filePath);
    const buffer = await fs.readFile(resolved);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    return wb.SheetNames as string[];
  } catch {
    return [];
  }
}

/** Notify the engine to clear its in-memory query cache after db.json changes. */
async function notifyEngineCacheClear(): Promise<void> {
  try {
    await proxyToEngine('/api/admin/queries/cache/clear', { method: 'POST' });
  } catch {
    // Engine may not be running — non-critical
  }
}

/** Tell the Mock API (json-server) to reload db.json from disk into memory. */
async function reloadMockApi(): Promise<void> {
  try {
    const mockApiUrl = process.env.API_BASE_URL || 'http://localhost:8080/api';
    const baseUrl = mockApiUrl.replace(/\/api\/?$/, '');
    await fetch(`${baseUrl}/api/reload`, { method: 'POST' });
  } catch {
    // Mock API may not be running — non-critical
  }
}

// GET: List all queries, optionally filtered by source
export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source');
    const db = await readDb();
    let queries = (db.queries || []) as QueryRecord[];
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

    const queryType = body.type || 'api';
    if (queryType === 'url' && !url) {
      return NextResponse.json({ error: 'URL-type queries require a url' }, { status: 400 });
    }
    if ((queryType === 'document' || queryType === 'csv' || queryType === 'xlsx') && !body.filePath) {
      return NextResponse.json({ error: 'Document/CSV/XLSX-type queries require a filePath' }, { status: 400 });
    }
    if (queryType === 'api' && !body.endpoint) {
      return NextResponse.json({ error: 'API-type queries require an endpoint' }, { status: 400 });
    }

    // For xlsx files with multiple sheets, auto-register each sheet as a separate query
    const sheetNames = (queryType === 'csv' || queryType === 'xlsx') ? await getXlsxSheetNames(body.filePath, body.fileBaseDir) : [];
    const isMultiSheet = sheetNames.length > 1;

    const createdQueries = await withDbLock<QueryRecord[]>(async (db) => {
      const queries = (db.queries || []) as QueryRecord[];

      // Generate next ID
      let maxNum = queries
        .map((q) => parseInt(q.id.replace('q', ''), 10))
        .filter((n) => !isNaN(n))
        .reduce((max, n) => Math.max(max, n), 0);

      const newQueries: QueryRecord[] = [];

      if (isMultiSheet) {
        // Create one query per sheet
        for (const sheet of sheetNames) {
          const sheetSuffix = toSnakeCase(sheet);
          const queryName = `${name}_${sheetSuffix}`;

          if (queries.some((q) => q.name === queryName)) {
            continue; // skip duplicates
          }

          maxNum++;
          const query: QueryRecord = {
            id: `q${maxNum}`,
            name: queryName,
            description: `${description || name} — sheet "${sheet}"`,
            estimatedDuration: estimatedDuration || 2000,
            url: url || '',
            source,
            filters: filters || [],
            type: queryType,
            filePath: body.filePath || '',
            ...(body.fileBaseDir && { fileBaseDir: body.fileBaseDir }),
            sheetName: sheet,
            endpoint: body.endpoint || '',
            baseUrl: body.baseUrl || '',
            method: body.method || '',
            authType: body.authType || 'none',
            bamTokenUrl: body.bamTokenUrl || '',
            ...(body.columnConfig && { columnConfig: body.columnConfig }),
          };

          queries.push(query);
          newQueries.push(query);
        }

        if (newQueries.length === 0) {
          throw new Error(`DUPLICATE:All sheet queries for "${name}" already exist`);
        }
      } else {
        // Single sheet or non-xlsx — create one query as before
        if (queries.some((q) => q.name === name)) {
          throw new Error(`DUPLICATE:Query "${name}" already exists`);
        }

        maxNum++;
        const query: QueryRecord = {
          id: `q${maxNum}`,
          name,
          description: description || '',
          estimatedDuration: estimatedDuration || 2000,
          url: url || '',
          source,
          filters: filters || [],
          type: queryType,
          filePath: body.filePath || '',
          ...(body.fileBaseDir && { fileBaseDir: body.fileBaseDir }),
          ...(body.sheetName && { sheetName: body.sheetName }),
          endpoint: body.endpoint || '',
          baseUrl: body.baseUrl || '',
          method: body.method || '',
          authType: body.authType || 'none',
          bamTokenUrl: body.bamTokenUrl || '',
          ...(body.columnConfig && { columnConfig: body.columnConfig }),
        };

        queries.push(query);
        newQueries.push(query);
      }

      db.queries = queries;
      return { result: newQueries, save: true };
    });

    // Notify engine to clear query cache + reload mock API in-memory db
    await Promise.all([notifyEngineCacheClear(), reloadMockApi()]);

    return NextResponse.json(
      isMultiSheet ? { queries: createdQueries, sheetsRegistered: sheetNames.length } : createdQueries[0],
      { status: 201 }
    );
  } catch (error) {
    const msg = (error as Error).message || '';
    if (msg.startsWith('DUPLICATE:')) {
      return NextResponse.json({ error: msg.replace('DUPLICATE:', '') }, { status: 409 });
    }
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

    const updated = await withDbLock<QueryRecord | null>(async (db) => {
      const queries = (db.queries || []) as QueryRecord[];
      const idx = queries.findIndex((q) => q.id === id);

      if (idx === -1) {
        return { result: null, save: false };
      }

      const query = queries[idx];
      if (updates.name !== undefined) query.name = updates.name;
      if (updates.description !== undefined) query.description = updates.description;
      if (updates.source !== undefined) query.source = updates.source;
      if (updates.url !== undefined) query.url = updates.url;
      if (updates.filters !== undefined) query.filters = updates.filters;
      if (updates.estimatedDuration !== undefined) query.estimatedDuration = updates.estimatedDuration;
      if (updates.type !== undefined) query.type = updates.type;
      if (updates.filePath !== undefined) query.filePath = updates.filePath;
      if (updates.fileBaseDir !== undefined) query.fileBaseDir = updates.fileBaseDir || undefined;
      if (updates.sheetName !== undefined) query.sheetName = updates.sheetName || undefined;
      if (updates.endpoint !== undefined) query.endpoint = updates.endpoint;
      if (updates.baseUrl !== undefined) query.baseUrl = updates.baseUrl;
      if (updates.method !== undefined) query.method = updates.method;
      if (updates.authType !== undefined) query.authType = updates.authType;
      if (updates.bamTokenUrl !== undefined) query.bamTokenUrl = updates.bamTokenUrl;
      if (updates.columnConfig !== undefined) query.columnConfig = updates.columnConfig || undefined;

      queries[idx] = query;
      db.queries = queries;
      return { result: query, save: true };
    });

    if (!updated) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    // Notify engine to clear query cache + reload mock API in-memory db
    await Promise.all([notifyEngineCacheClear(), reloadMockApi()]);

    return NextResponse.json(updated);
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

    const deleted = await withDbLock<boolean>(async (db) => {
      const queries = (db.queries || []) as QueryRecord[];
      const idx = queries.findIndex((q) => q.id === id);

      if (idx === -1) {
        return { result: false, save: false };
      }

      queries.splice(idx, 1);
      db.queries = queries;
      return { result: true, save: true };
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    // Notify engine to clear query cache + reload mock API in-memory db
    await Promise.all([notifyEngineCacheClear(), reloadMockApi()]);

    return NextResponse.json({ success: true, deletedQueryId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to delete query');
    return NextResponse.json({ error: 'Failed to delete query' }, { status: 500 });
  }
}
