import { Router, Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getGroupConfig, getGroupConfigs, getAllGroupIds, reloadGroupConfig } from '@/config/group-config';
import { invalidateEngine } from '@/lib/singleton';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

const PROJECT_ROOT = process.cwd();
const GROUPS_JSON_PATH = join(PROJECT_ROOT, 'src/config/groups.json');
const TRAINING_GROUPS_DIR = join(PROJECT_ROOT, 'src/training/groups');

function readGroups() {
  return JSON.parse(readFileSync(GROUPS_JSON_PATH, 'utf-8'));
}
function writeGroups(groups: unknown) {
  writeFileSync(GROUPS_JSON_PATH, JSON.stringify(groups, null, 2) + '\n', 'utf-8');
}

router.get('/', requirePermission('groups.read'), (_req: Request, res: Response) => {
  try {
    const configs = getGroupConfigs();
    const groups = Object.entries(configs).map(([id, config]) => ({
      id, name: config.name, description: config.description,
      sources: config.sources, apiBaseUrl: config.apiBaseUrl,
      hasCorpus: !!config.corpus, hasFaq: !!config.faq, hasTemplates: !!config.templates,
    }));
    return res.json({ groups });
  } catch { return res.status(500).json({ groups: [] }); }
});

router.get('/:id', requirePermission('groups.read'), (req: Request, res: Response) => {
  const { id } = req.params;
  const allIds = getAllGroupIds();
  if (!allIds.includes(id)) return res.status(404).json({ error: 'Group not found' });
  const config = getGroupConfig(id);
  return res.json({ id, ...config });
});

router.patch('/:id', requirePermission('groups.update'), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const body = req.body;
    const groupsData = readGroups();
    if (!groupsData.groups[id]) return res.status(404).json({ error: 'Group not found' });

    const group = groupsData.groups[id];
    if (body.name !== undefined) group.name = body.name;
    if (body.description !== undefined) group.description = body.description;
    if (body.sources !== undefined) group.sources = body.sources;
    if (body.apiBaseUrl !== undefined) group.apiBaseUrl = body.apiBaseUrl || null;
    if (body.templates !== undefined) {
      group.templates = body.templates && Object.keys(body.templates).length > 0 ? body.templates : null;
    }
    groupsData.groups[id] = group;
    writeGroups(groupsData);
    reloadGroupConfig();
    invalidateEngine(id);
    await logAudit({ action: 'update', resource: 'group', resourceId: id, details: body, ip: req.ip });
    return res.json({ id, ...group });
  } catch (error) {
    logger.error({ error }, 'Admin PATCH group error');
    return res.status(500).json({ error: 'Failed to update group' });
  }
});

router.delete('/:id', requirePermission('groups.delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === 'default') return res.status(400).json({ error: 'Cannot delete the default group' });
  try {
    const groupsData = readGroups();
    if (!groupsData.groups[id]) return res.status(404).json({ error: 'Group not found' });
    const group = groupsData.groups[id];
    delete groupsData.groups[id];
    writeGroups(groupsData);
    if (group.corpus) await fsPromises.unlink(join(TRAINING_GROUPS_DIR, group.corpus)).catch(() => {});
    if (group.faq) await fsPromises.unlink(join(TRAINING_GROUPS_DIR, group.faq)).catch(() => {});
    invalidateEngine(id);
    reloadGroupConfig();
    await logAudit({ action: 'delete', resource: 'group', resourceId: id, details: { name: group.name }, ip: req.ip });
    return res.json({ success: true, deletedGroupId: id });
  } catch (error) {
    logger.error({ error }, 'Admin DELETE group error');
    return res.status(500).json({ error: 'Failed to delete group' });
  }
});

router.post('/create', requirePermission('groups.create'), async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { groupId, name, description, sources, apiBaseUrl, greeting, helpText, queries, faq } = body;
    if (!groupId || !name) return res.status(400).json({ error: 'groupId and name are required' });
    if (!/^[a-z0-9_]+$/.test(groupId)) return res.status(400).json({ error: 'groupId must be lowercase alphanumeric with underscores' });

    const { processOnboarding } = await import('@/lib/onboard/onboard-service');
    const payload = {
      groupInfo: { group_id: groupId, name, description: description || '', sources: (sources || []).join(', '), greeting: greeting || '', help_text: helpText || '' },
      queries: (queries || []).map((q: { name: string; description: string; source: string; url: string; estimated_duration: number; filters: string }) => ({
        name: q.name, description: q.description || '', source: q.source || '', url: q.url || '', estimated_duration: q.estimated_duration || 2000, filters: q.filters || '',
      })),
      synonyms: [],
      faq: (faq || []).map((f: { question: string; intent: string; answer: string }) => ({ question: f.question, intent: f.intent || 'faq', answer: f.answer })),
    };

    const result = await processOnboarding(payload);
    if (!result.success) return res.status(400).json({ error: result.errors?.[0] || 'Failed', details: result.errors });

    if (apiBaseUrl) {
      const groupsData = readGroups();
      if (groupsData.groups[groupId]) {
        groupsData.groups[groupId].apiBaseUrl = apiBaseUrl;
        writeGroups(groupsData);
        reloadGroupConfig();
      }
    }
    await logAudit({ action: 'create', resource: 'group', resourceId: groupId, details: { name, description, sources }, ip: req.ip });
    return res.status(201).json({ success: true, groupId: result.groupId, queriesAdded: result.queriesAdded });
  } catch (error) {
    logger.error({ error }, 'Manual group creation error');
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

export default router;
