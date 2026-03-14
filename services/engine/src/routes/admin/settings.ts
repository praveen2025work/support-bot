import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';
import { paths } from '@/lib/env-config';

const SETTINGS_PATH = paths.config.settings;
const LOGS_PATH = paths.data.conversationsLog;

const DEFAULT_SETTINGS = {
  nlpConfidenceThreshold: 0.65,
  fuzzyConfidenceThreshold: 0.5,
  sessionTtlMinutes: 30,
  apiCacheTtlMinutes: 5,
  apiBaseUrl: '',
  mockApiUrl: process.env.API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:8080',
  enabledPlatforms: ['web', 'widget'],
};

function readSettings() {
  if (!existsSync(SETTINGS_PATH)) return DEFAULT_SETTINGS;
  try { return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')); } catch { return DEFAULT_SETTINGS; }
}

// === SETTINGS ===

export const settingsRouter = Router();

settingsRouter.get('/', requirePermission('settings.read'), (_req: Request, res: Response) => res.json({ config: readSettings() }));

settingsRouter.post('/', requirePermission('settings.update'), (req: Request, res: Response) => {
  try {
    const settings = { ...readSettings(), ...req.body };
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    logAudit({ action: 'update', resource: 'settings', details: req.body, ip: req.ip });
    return res.json({ success: true, config: settings });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

// === LOGS ===

export const logsRouter = Router();

logsRouter.get('/', requirePermission('logs.view'), (req: Request, res: Response) => {
  try {
    if (!existsSync(LOGS_PATH)) return res.json({ logs: [], total: 0 });
    const raw = readFileSync(LOGS_PATH, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const logs = lines.map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);

    const group = req.query.group as string | undefined;
    const intent = req.query.intent as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = parseInt((req.query.limit as string) || '100', 10);

    let filtered = logs;
    if (group) filtered = filtered.filter((l: Record<string, string>) => l.groupId === group);
    if (intent) filtered = filtered.filter((l: Record<string, string>) => l.intent === intent);
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter((l: Record<string, string>) => l.userMessage?.toLowerCase().includes(q) || l.botResponse?.toLowerCase().includes(q)); }

    const result = filtered.reverse().slice(0, limit);
    const intentCounts: Record<string, number> = {};
    for (const log of logs) { intentCounts[log.intent] = (intentCounts[log.intent] || 0) + 1; }

    return res.json({ logs: result, total: logs.length, filtered: filtered.length, intentDistribution: intentCounts });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

logsRouter.delete('/', requirePermission('logs.delete'), (_req: Request, res: Response) => {
  try {
    writeFileSync(LOGS_PATH, '', 'utf-8');
    logAudit({ action: 'delete', resource: 'logs', details: { cleared: true } });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});
