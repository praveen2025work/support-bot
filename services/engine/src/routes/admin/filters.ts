import { Router, Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

const PROJECT_ROOT = process.cwd();
const FILTER_CONFIG_PATH = join(PROJECT_ROOT, 'src/config/filter-config.json');

router.get('/', requirePermission('filters.manage'), async (_req: Request, res: Response) => {
  try {
    const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, 'utf-8');
    return res.json(JSON.parse(raw));
  } catch { return res.json({ filters: {} }); }
});

router.post('/', requirePermission('filters.manage'), async (req: Request, res: Response) => {
  try {
    const { key, label, type, options, placeholder, dateFormat } = req.body;
    if (!key || !label || !type) return res.status(400).json({ error: 'key, label, and type are required' });
    const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    data.filters[key] = { label, type, options: type === 'select' ? (options || []) : [], placeholder: type === 'text' ? (placeholder || `Enter ${key}...`) : null, ...(dateFormat ? { dateFormat } : {}) };
    await fsPromises.writeFile(FILTER_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    await logAudit({ action: 'create', resource: 'filter', resourceId: key, details: { label, type }, ip: req.ip });
    return res.json({ key, ...data.filters[key] });
  } catch (error) {
    logger.error({ error }, 'Failed to save filter config');
    return res.status(500).json({ error: 'Failed to save filter config' });
  }
});

router.delete('/', requirePermission('filters.manage'), async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;
    if (!key) return res.status(400).json({ error: 'key query param is required' });
    const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.filters[key]) return res.status(404).json({ error: 'Filter not found' });
    delete data.filters[key];
    await fsPromises.writeFile(FILTER_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    await logAudit({ action: 'delete', resource: 'filter', resourceId: key, ip: req.ip });
    return res.json({ success: true, deletedKey: key });
  } catch (error) {
    logger.error({ error }, 'Failed to delete filter config');
    return res.status(500).json({ error: 'Failed to delete filter config' });
  }
});

export default router;
