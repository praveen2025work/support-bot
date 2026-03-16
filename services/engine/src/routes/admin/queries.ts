import { Router, Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';
import { paths } from '@/lib/env-config';
import { clearQueryCaches } from '@/lib/singleton';

const router = Router();

const DB_JSON_PATH = paths.mockApi.dbJson;

async function readDb(): Promise<Record<string, unknown>> {
  const raw = await fsPromises.readFile(DB_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}
async function writeDb(data: Record<string, unknown>): Promise<void> {
  await fsPromises.writeFile(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

router.get('/', requirePermission('queries.read'), async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string | undefined;
    const db = await readDb();
    let queries = (db.queries || []) as Array<Record<string, unknown>>;
    if (source) {
      const sources = source.split(',').map((s) => s.trim());
      queries = queries.filter((q) => sources.includes(q.source as string));
    }
    return res.json({ queries });
  } catch (error) {
    logger.error({ error }, 'Failed to read queries');
    return res.status(500).json({ queries: [] });
  }
});

router.post('/', requirePermission('queries.create'), async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { name, description, source, url, filters, estimatedDuration } = body;
    if (!name || !source) return res.status(400).json({ error: 'name and source are required' });

    const db = await readDb();
    const queries = (db.queries || []) as Array<Record<string, unknown>>;
    if (queries.some((q) => q.name === name)) return res.status(409).json({ error: `Query "${name}" already exists` });

    const queryType = body.type || 'api';
    if (queryType === 'url' && !url) return res.status(400).json({ error: 'URL-type queries require a url' });
    if ((queryType === 'document' || queryType === 'csv') && !body.filePath) return res.status(400).json({ error: 'Document/CSV-type queries require a filePath' });
    if (queryType === 'api' && !body.endpoint) return res.status(400).json({ error: 'API-type queries require an endpoint' });

    const maxNum = queries.map((q) => parseInt((q.id as string).replace('q', ''), 10)).filter((n) => !isNaN(n)).reduce((max, n) => Math.max(max, n), 0);
    const newQuery = { id: `q${maxNum + 1}`, name, description: description || '', estimatedDuration: estimatedDuration || 2000, url: url || '', source, filters: filters || [], type: queryType, filePath: body.filePath || '', endpoint: body.endpoint || '' };
    queries.push(newQuery);
    db.queries = queries;
    await writeDb(db);
    clearQueryCaches();
    await logAudit({ action: 'create', resource: 'query', resourceId: newQuery.id, details: { name, source, type: queryType }, ip: req.ip });
    return res.status(201).json(newQuery);
  } catch (error) {
    logger.error({ error }, 'Failed to create query');
    return res.status(500).json({ error: 'Failed to create query' });
  }
});

router.patch('/', requirePermission('queries.update'), async (req: Request, res: Response) => {
  try {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const db = await readDb();
    const queries = (db.queries || []) as Array<Record<string, unknown>>;
    const idx = queries.findIndex((q) => q.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Query not found' });

    const query = queries[idx];
    for (const [k, v] of Object.entries(updates)) { query[k] = v; }
    queries[idx] = query;
    db.queries = queries;
    await writeDb(db);
    clearQueryCaches();
    await logAudit({ action: 'update', resource: 'query', resourceId: id, details: updates, ip: req.ip });
    return res.json(query);
  } catch (error) {
    logger.error({ error }, 'Failed to update query');
    return res.status(500).json({ error: 'Failed to update query' });
  }
});

router.delete('/', requirePermission('queries.delete'), async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id query param is required' });
    const db = await readDb();
    const queries = (db.queries || []) as Array<Record<string, unknown>>;
    const idx = queries.findIndex((q) => q.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Query not found' });
    queries.splice(idx, 1);
    db.queries = queries;
    await writeDb(db);
    clearQueryCaches();
    await logAudit({ action: 'delete', resource: 'query', resourceId: id, ip: req.ip });
    return res.json({ success: true, deletedQueryId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to delete query');
    return res.status(500).json({ error: 'Failed to delete query' });
  }
});

// POST /cache/clear — clear the in-memory query cache (called by Next.js after db.json writes)
router.post('/cache/clear', (_req: Request, res: Response) => {
  clearQueryCaches();
  logger.info('Query caches cleared via admin API');
  return res.json({ success: true });
});

export default router;
