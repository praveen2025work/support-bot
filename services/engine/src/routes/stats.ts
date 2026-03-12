import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export const statsRouter = Router();

const DB_JSON_PATH = path.join(process.cwd(), 'data/db-stats.json');

interface QueryStat {
  id: string;
  queryName: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
  filters?: Record<string, string>;
  error?: string;
}

async function readStats(): Promise<QueryStat[]> {
  try {
    const raw = await fs.readFile(DB_JSON_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return data.queryStats || [];
  } catch {
    return [];
  }
}

async function writeStats(stats: QueryStat[]): Promise<void> {
  await fs.writeFile(DB_JSON_PATH, JSON.stringify({ queryStats: stats }, null, 2), 'utf-8');
}

statsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const queryName = req.query.queryName as string | undefined;
    const since = req.query.since as string | undefined;

    let stats = await readStats();

    if (queryName) {
      stats = stats.filter((s) => s.queryName === queryName);
    }
    if (since) {
      stats = stats.filter((s) => s.timestamp >= since);
    }

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

    return res.json({ stats, aggregated, totalRecords: stats.length });
  } catch (error) {
    logger.error({ error }, 'Failed to read stats');
    return res.status(500).json({ stats: [], aggregated: [], totalRecords: 0 });
  }
});

statsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { queryName, success, durationMs, filters, error: errorMsg } = req.body;

    if (!queryName) {
      return res.status(400).json({ error: 'queryName is required' });
    }

    const stats = await readStats();

    const stat: QueryStat = {
      id: `stat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      queryName,
      success: success ?? true,
      durationMs: durationMs ?? 0,
      timestamp: new Date().toISOString(),
      filters: filters || {},
      error: errorMsg,
    };

    stats.push(stat);
    await writeStats(stats);

    return res.status(201).json(stat);
  } catch (error) {
    logger.error({ error }, 'Failed to record stat');
    return res.status(500).json({ error: 'Failed to record stat' });
  }
});
