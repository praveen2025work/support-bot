import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';

export interface AuditEntry {
  timestamp: string;
  action: 'create' | 'update' | 'delete';
  resource: string; // e.g., 'query', 'group', 'filter', 'template', 'user', 'settings', 'file', 'intent'
  resourceId?: string;
  groupId?: string;
  userId?: string; // who made the change
  details?: Record<string, unknown>; // what changed
  ip?: string;
}

const AUDIT_DIR = path.join(process.cwd(), 'data', 'audit');
const AUDIT_FILE = path.join(AUDIT_DIR, 'audit.jsonl');

async function ensureAuditDir() {
  await fs.mkdir(AUDIT_DIR, { recursive: true });
}

export async function logAudit(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  try {
    await ensureAuditDir();
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    await fs.appendFile(AUDIT_FILE, JSON.stringify(fullEntry) + '\n');
    logger.info({ audit: fullEntry }, 'Audit log entry');
  } catch (err) {
    logger.error({ err }, 'Failed to write audit log');
  }
}

export async function getAuditLog(options?: {
  resource?: string;
  groupId?: string;
  limit?: number;
  since?: string;
}): Promise<AuditEntry[]> {
  try {
    await ensureAuditDir();
    const content = await fs.readFile(AUDIT_FILE, 'utf-8');
    let entries = content.trim().split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as AuditEntry);

    if (options?.resource) entries = entries.filter(e => e.resource === options.resource);
    if (options?.groupId) entries = entries.filter(e => e.groupId === options.groupId);
    if (options?.since) { const since = options.since; entries = entries.filter(e => e.timestamp >= since); }

    entries.reverse(); // newest first
    if (options?.limit) entries = entries.slice(0, options.limit);
    return entries;
  } catch {
    return [];
  }
}
