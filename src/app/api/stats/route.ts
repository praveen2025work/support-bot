import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

const DB_JSON_PATH = path.join(process.cwd(), 'mock-api/db.json');

interface QueryStat {
  id: string;
  queryName: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
  filters?: Record<string, string>;
  error?: string;
}

async function readDb(): Promise<{ queryStats: QueryStat[]; [key: string]: unknown }> {
  const raw = await fs.readFile(DB_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeDb(data: Record<string, unknown>): Promise<void> {
  await fs.writeFile(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET: Retrieve stats with optional filters and aggregated metrics
export async function GET(request: NextRequest) {
  try {
    const queryName = request.nextUrl.searchParams.get('queryName');
    const since = request.nextUrl.searchParams.get('since');

    const db = await readDb();
    let stats = db.queryStats || [];

    if (queryName) {
      stats = stats.filter((s) => s.queryName === queryName);
    }
    if (since) {
      stats = stats.filter((s) => s.timestamp >= since);
    }

    // Compute aggregated metrics per query
    const byQuery: Record<string, { durations: number[]; successes: number; failures: number }> = {};
    for (const s of stats) {
      if (!byQuery[s.queryName]) {
        byQuery[s.queryName] = { durations: [], successes: 0, failures: 0 };
      }
      const bucket = byQuery[s.queryName];
      if (s.durationMs != null) bucket.durations.push(s.durationMs);
      if (s.success) bucket.successes++;
      else bucket.failures++;
    }

    const aggregated = Object.entries(byQuery).map(([name, b]) => {
      const sorted = [...b.durations].sort((a, c) => a - c);
      const len = sorted.length;
      return {
        queryName: name,
        totalExecutions: b.successes + b.failures,
        successCount: b.successes,
        failureCount: b.failures,
        failureRate: len > 0 ? `${((b.failures / (b.successes + b.failures)) * 100).toFixed(1)}%` : '0%',
        avgDurationMs: len > 0 ? Math.round(sorted.reduce((a, c) => a + c, 0) / len) : 0,
        p50Ms: len > 0 ? sorted[Math.floor(len * 0.5)] : 0,
        p95Ms: len > 0 ? sorted[Math.floor(len * 0.95)] : 0,
      };
    });

    return NextResponse.json({ stats, aggregated, totalRecords: stats.length });
  } catch (error) {
    logger.error({ error }, 'Failed to read stats');
    return NextResponse.json({ stats: [], aggregated: [], totalRecords: 0 }, { status: 500 });
  }
}

// POST: Record a new stat entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryName, success, durationMs, filters, error: errorMsg } = body;

    if (!queryName) {
      return NextResponse.json({ error: 'queryName is required' }, { status: 400 });
    }

    const db = await readDb();
    if (!db.queryStats) db.queryStats = [];

    const stat: QueryStat = {
      id: `stat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      queryName,
      success: success ?? true,
      durationMs: durationMs ?? 0,
      timestamp: new Date().toISOString(),
      filters: filters || {},
      error: errorMsg,
    };

    db.queryStats.push(stat);
    await writeDb(db);

    return NextResponse.json(stat, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to record stat');
    return NextResponse.json({ error: 'Failed to record stat' }, { status: 500 });
  }
}
