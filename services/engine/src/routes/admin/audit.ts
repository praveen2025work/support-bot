import { Router, Request, Response } from 'express';
import { promises as fsp } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';

const router = Router();
const AUDIT_DIR = path.join(paths.data.root, 'audit');
const AUDIT_FILE = path.join(AUDIT_DIR, 'audit-log.jsonl');

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  resource: string;
  resourceType: string;
  details?: string;
  ip?: string;
}

async function ensureDir(): Promise<void> {
  try {
    await fsp.access(AUDIT_DIR);
  } catch {
    await fsp.mkdir(AUDIT_DIR, { recursive: true });
  }
}

async function readAuditLog(): Promise<AuditEntry[]> {
  await ensureDir();
  try {
    await fsp.access(AUDIT_FILE);
  } catch {
    return [];
  }
  try {
    const content = (await fsp.readFile(AUDIT_FILE, 'utf-8')).trim();
    if (!content) return [];
    return content
      .split('\n')
      .map((line) => {
        try { return JSON.parse(line) as AuditEntry; }
        catch { return null; }
      })
      .filter((e): e is AuditEntry => e !== null)
      .reverse(); // newest first
  } catch (error) {
    logger.error({ error }, 'Failed to read audit log');
    return [];
  }
}

export async function logAuditEvent(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
  await ensureDir();
  const full: AuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  try {
    await fsp.appendFile(AUDIT_FILE, JSON.stringify(full) + '\n', 'utf-8');
  } catch (error) {
    logger.error({ error }, 'Failed to write audit entry');
  }
}

// GET /api/admin/audit
router.get('/', async (req: Request, res: Response) => {
  try {
    let entries = await readAuditLog();

    const { action, user, search } = req.query;
    if (action) entries = entries.filter((e) => e.action === action);
    if (user) entries = entries.filter((e) => e.user === user);
    if (search) {
      const term = String(search).toLowerCase();
      entries = entries.filter(
        (e) =>
          e.resource.toLowerCase().includes(term) ||
          (e.details && e.details.toLowerCase().includes(term)) ||
          e.resourceType.toLowerCase().includes(term)
      );
    }

    res.json({ entries });
  } catch (error) {
    logger.error({ error }, 'Failed to get audit log');
    res.status(500).json({ error: 'Failed to read audit log' });
  }
});

export { router as auditRouter };
