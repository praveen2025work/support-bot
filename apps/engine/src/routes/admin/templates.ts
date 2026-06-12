import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

import { paths } from '@/lib/env-config';

const GROUPS_JSON_PATH = paths.config.groups;
const TEMPLATES_PATH = paths.templates.file;

function readGroups() {
  return JSON.parse(readFileSync(GROUPS_JSON_PATH, 'utf-8'));
}
function writeGroups(groups: unknown) {
  writeFileSync(GROUPS_JSON_PATH, JSON.stringify(groups, null, 2) + '\n', 'utf-8');
}

function parseTemplatesTs(): Record<string, string[]> {
  const content = readFileSync(TEMPLATES_PATH, 'utf-8');
  const result: Record<string, string[]> = {};
  const intentRegex = /(\w+)\s*:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = intentRegex.exec(content)) !== null) {
    const key = m[1];
    const values: string[] = [];
    const strRegex = /'([^']*(?:\\.[^']*)*)'/g;
    let sm;
    while ((sm = strRegex.exec(m[2])) !== null) {
      values.push(sm[1].replace(/\\n/g, '\n').replace(/\\'/g, "'"));
    }
    result[key] = values;
  }
  return result;
}

function writeTemplatesTs(templates: Record<string, string[]>) {
  const entries = Object.entries(templates)
    .map(([key, values]) => {
      const valuesStr = values
        .map((v) => `    '${v.replace(/'/g, "\\'").replace(/\n/g, '\\n')}',`)
        .join('\n');
      return `  ${key}: [\n${valuesStr}\n  ],`;
    })
    .join('\n');
  writeFileSync(TEMPLATES_PATH, `export const responseTemplates: Record<string, string[]> = {\n${entries}\n};\n`, 'utf-8');
}

router.get('/', requirePermission('templates.manage'), (_req: Request, res: Response) => {
  try {
    const baseTemplates = parseTemplatesTs();
    const groupsConfig = readGroups();
    const groupTemplates: Record<string, Record<string, string[]>> = {};
    for (const [gid, config] of Object.entries(groupsConfig.groups || {})) {
      const c = config as { templates?: Record<string, string[]> };
      if (c.templates) groupTemplates[gid] = c.templates;
    }
    return res.json({ baseTemplates, groupTemplates });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

router.post('/', requirePermission('templates.manage'), (req: Request, res: Response) => {
  try {
    const { scope, intent, responses } = req.body;
    if (!intent || !Array.isArray(responses)) return res.status(400).json({ error: 'intent and responses[] are required' });
    if (scope === 'base' || !scope) { const templates = parseTemplatesTs(); templates[intent] = responses; writeTemplatesTs(templates); }
    else {
      const groupsConfig = readGroups();
      if (!groupsConfig.groups[scope]) return res.status(404).json({ error: `Group ${scope} not found` });
      if (!groupsConfig.groups[scope].templates) groupsConfig.groups[scope].templates = {};
      groupsConfig.groups[scope].templates[intent] = responses;
      writeGroups(groupsConfig);
    }
    logAudit({ action: 'update', resource: 'template', resourceId: intent, groupId: scope !== 'base' ? scope : undefined, details: { scope: scope || 'base', responseCount: responses.length }, ip: req.ip });
    return res.json({ success: true, scope: scope || 'base', intent });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

router.delete('/', requirePermission('templates.manage'), (req: Request, res: Response) => {
  try {
    const scope = (req.query.scope as string) || 'base';
    const intent = req.query.intent as string;
    if (!intent) return res.status(400).json({ error: 'intent query param is required' });
    if (scope === 'base') { const templates = parseTemplatesTs(); delete templates[intent]; writeTemplatesTs(templates); }
    else { const groupsConfig = readGroups(); if (groupsConfig.groups[scope]?.templates) { delete groupsConfig.groups[scope].templates[intent]; writeGroups(groupsConfig); } }
    logAudit({ action: 'delete', resource: 'template', resourceId: intent, groupId: scope !== 'base' ? scope : undefined, details: { scope }, ip: req.ip });
    return res.json({ success: true, deleted: `${scope}:${intent}` });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

export default router;
