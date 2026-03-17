import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { proxyToEngine } from '@/lib/engine-proxy';
import { readDb } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Read columns directly from a csv/xlsx file on disk.
 * Used as a fallback when engine query execution doesn't return columns.
 */
async function readColumnsFromFile(filePath: string, sheetName?: string): Promise<string[]> {
  try {
    const engineDir = path.resolve(process.cwd(), 'services/engine');
    const resolved = path.resolve(engineDir, filePath);
    const ext = path.extname(filePath).toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');

    let wb;
    if (ext === '.xlsx' || ext === '.xls') {
      const buffer = await fs.readFile(resolved);
      wb = XLSX.read(buffer, { type: 'buffer' });
    } else {
      const content = await fs.readFile(resolved, 'utf-8');
      wb = XLSX.read(content, { type: 'string' });
    }

    const targetSheet = sheetName ?? wb.SheetNames[0];
    if (!targetSheet || !wb.Sheets[targetSheet]) return [];

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[targetSheet]) as Record<string, unknown>[];
    return rows.length > 0 ? Object.keys(rows[0]) : [];
  } catch {
    return [];
  }
}

/**
 * POST /api/admin/queries/columns
 * Executes a query via the engine chat endpoint and returns discovered column names.
 * Falls back to reading the file directly for csv/xlsx queries.
 * Body: { queryName: string, groupId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { queryName, groupId } = await request.json();
    if (!queryName) {
      return NextResponse.json({ error: 'queryName is required' }, { status: 400 });
    }

    // Try engine query execution first
    let columns: string[] = [];
    try {
      const engineRes = await proxyToEngine('/api/chat', {
        method: 'POST',
        body: {
          text: `run ${queryName}`,
          sessionId: `admin-column-discovery-${Date.now()}`,
          ...(groupId && { groupId }),
        },
      });

      if (engineRes.ok) {
        const data = await engineRes.json();
        const richContent = data.richContent;

        if (richContent?.type === 'query_result' && richContent.data?.data?.length > 0) {
          columns = Object.keys(richContent.data.data[0]);
        } else if (richContent?.type === 'csv_table' && richContent.data?.headers?.length > 0) {
          columns = richContent.data.headers;
        } else if (richContent?.type === 'csv_group_by' && richContent.data?.groups?.length > 0) {
          const group = richContent.data.groups[0];
          columns = [richContent.data.groupColumn, ...Object.keys(group.aggregations || {})];
        } else if (richContent?.data?.data?.length > 0) {
          columns = Object.keys(richContent.data.data[0]);
        }
      }
    } catch {
      // Engine may not be available — fall through to file-based fallback
    }

    // Fallback: read columns directly from the file for csv/xlsx queries
    if (columns.length === 0) {
      try {
        const db = await readDb();
        const queries = (db.queries || []) as { name: string; type?: string; filePath?: string; sheetName?: string }[];
        const query = queries.find((q) => q.name === queryName);
        if (query?.filePath && (query.type === 'csv' || !query.type)) {
          columns = await readColumnsFromFile(query.filePath, query.sheetName);
        }
      } catch {
        // Fallback failed — return empty
      }
    }

    return NextResponse.json({ columns });
  } catch (error) {
    logger.error({ error }, 'Column discovery failed');
    return NextResponse.json({ error: 'Column discovery failed' }, { status: 500 });
  }
}
