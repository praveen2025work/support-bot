import { Router, Request, Response } from 'express';
import { promises as fsPromises } from 'fs';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { getGroupConfig, getGroupConfigs, getAllGroupIds, reloadGroupConfig } from '@/config/group-config';
import { invalidateEngine } from '@/lib/singleton';
import { getLearningService } from '@/core/learning/learning-service';
import { logger } from '@/lib/logger';

export const adminRouter = Router();

// Auth middleware — when ENGINE_API_KEY is set, require it on all admin routes
const engineApiKey = process.env.ENGINE_API_KEY;
if (engineApiKey) {
  adminRouter.use((req: Request, res: Response, next) => {
    const provided = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (provided !== engineApiKey) {
      return res.status(401).json({ error: 'Unauthorized — valid API key required for admin access' });
    }
    next();
  });
}

const PROJECT_ROOT = process.cwd();
const GROUPS_JSON_PATH = join(PROJECT_ROOT, 'src/config/groups.json');
const TRAINING_GROUPS_DIR = join(PROJECT_ROOT, 'src/training/groups');
const CORPUS_PATH = join(PROJECT_ROOT, 'src/training/corpus.json');
const FILTER_CONFIG_PATH = join(PROJECT_ROOT, 'src/config/filter-config.json');
const USERS_JSON_PATH = join(PROJECT_ROOT, 'src/config/users.json');
const SETTINGS_PATH = join(PROJECT_ROOT, 'src/config/settings.json');
const TEMPLATES_PATH = join(PROJECT_ROOT, 'src/core/response/templates.ts');
const KNOWLEDGE_DIR = join(PROJECT_ROOT, 'data/knowledge');
const LOGS_PATH = join(PROJECT_ROOT, 'data/logs/conversations.jsonl');
const DB_JSON_PATH = process.env.DB_JSON_PATH || join(PROJECT_ROOT, '..', 'mock-api', 'db.json');

// === Helpers ===

function readCorpus() {
  return JSON.parse(readFileSync(CORPUS_PATH, 'utf-8'));
}
function writeCorpus(corpus: unknown) {
  writeFileSync(CORPUS_PATH, JSON.stringify(corpus, null, 2) + '\n', 'utf-8');
}
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

const DEFAULT_SETTINGS = {
  nlpConfidenceThreshold: 0.65,
  fuzzyConfidenceThreshold: 0.5,
  sessionTtlMinutes: 30,
  apiCacheTtlMinutes: 5,
  apiBaseUrl: '',
  mockApiUrl: 'http://localhost:8080',
  enabledPlatforms: ['web', 'widget'],
};

function readSettings() {
  if (!existsSync(SETTINGS_PATH)) return DEFAULT_SETTINGS;
  try { return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')); } catch { return DEFAULT_SETTINGS; }
}

// === GROUPS ===

adminRouter.get('/groups', (_req: Request, res: Response) => {
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

adminRouter.get('/groups/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const allIds = getAllGroupIds();
  if (!allIds.includes(id)) return res.status(404).json({ error: 'Group not found' });
  const config = getGroupConfig(id);
  return res.json({ id, ...config });
});

adminRouter.patch('/groups/:id', async (req: Request, res: Response) => {
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
    return res.json({ id, ...group });
  } catch (error) {
    logger.error({ error }, 'Admin PATCH group error');
    return res.status(500).json({ error: 'Failed to update group' });
  }
});

adminRouter.delete('/groups/:id', async (req: Request, res: Response) => {
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
    return res.json({ success: true, deletedGroupId: id });
  } catch (error) {
    logger.error({ error }, 'Admin DELETE group error');
    return res.status(500).json({ error: 'Failed to delete group' });
  }
});

adminRouter.post('/groups/create', async (req: Request, res: Response) => {
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
    return res.status(201).json({ success: true, groupId: result.groupId, queriesAdded: result.queriesAdded });
  } catch (error) {
    logger.error({ error }, 'Manual group creation error');
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

// === QUERIES ===

async function readDb(): Promise<Record<string, unknown>> {
  const raw = await fsPromises.readFile(DB_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}
async function writeDb(data: Record<string, unknown>): Promise<void> {
  await fsPromises.writeFile(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

adminRouter.get('/queries', async (req: Request, res: Response) => {
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

adminRouter.post('/queries', async (req: Request, res: Response) => {
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
    return res.status(201).json(newQuery);
  } catch (error) {
    logger.error({ error }, 'Failed to create query');
    return res.status(500).json({ error: 'Failed to create query' });
  }
});

adminRouter.patch('/queries', async (req: Request, res: Response) => {
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
    return res.json(query);
  } catch (error) {
    logger.error({ error }, 'Failed to update query');
    return res.status(500).json({ error: 'Failed to update query' });
  }
});

adminRouter.delete('/queries', async (req: Request, res: Response) => {
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
    return res.json({ success: true, deletedQueryId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to delete query');
    return res.status(500).json({ error: 'Failed to delete query' });
  }
});

// === FILTERS ===

adminRouter.get('/filters', async (_req: Request, res: Response) => {
  try {
    const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, 'utf-8');
    return res.json(JSON.parse(raw));
  } catch { return res.json({ filters: {} }); }
});

adminRouter.post('/filters', async (req: Request, res: Response) => {
  try {
    const { key, label, type, options, placeholder, dateFormat } = req.body;
    if (!key || !label || !type) return res.status(400).json({ error: 'key, label, and type are required' });
    const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    data.filters[key] = { label, type, options: type === 'select' ? (options || []) : [], placeholder: type === 'text' ? (placeholder || `Enter ${key}...`) : null, ...(dateFormat ? { dateFormat } : {}) };
    await fsPromises.writeFile(FILTER_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return res.json({ key, ...data.filters[key] });
  } catch (error) {
    logger.error({ error }, 'Failed to save filter config');
    return res.status(500).json({ error: 'Failed to save filter config' });
  }
});

adminRouter.delete('/filters', async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;
    if (!key) return res.status(400).json({ error: 'key query param is required' });
    const raw = await fsPromises.readFile(FILTER_CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.filters[key]) return res.status(404).json({ error: 'Filter not found' });
    delete data.filters[key];
    await fsPromises.writeFile(FILTER_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return res.json({ success: true, deletedKey: key });
  } catch (error) {
    logger.error({ error }, 'Failed to delete filter config');
    return res.status(500).json({ error: 'Failed to delete filter config' });
  }
});

// === INTENTS ===

adminRouter.get('/intents', (_req: Request, res: Response) => {
  try {
    const corpus = readCorpus();
    const intents = (corpus.data || []).map((item: { intent: string; utterances: string[]; answers?: string[] }) => ({
      intent: item.intent, utterances: item.utterances, answers: item.answers || [], utteranceCount: item.utterances.length,
    }));
    return res.json({ intents, entities: corpus.entities || {} });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.post('/intents', (req: Request, res: Response) => {
  try {
    const { intent, utterances, answers } = req.body;
    if (!intent || !utterances || !Array.isArray(utterances)) return res.status(400).json({ error: 'intent and utterances[] are required' });
    const corpus = readCorpus();
    const existing = corpus.data.findIndex((item: { intent: string }) => item.intent === intent);
    if (existing >= 0) { corpus.data[existing].utterances = utterances; if (answers) corpus.data[existing].answers = answers; }
    else { corpus.data.push({ intent, utterances, answers: answers || [] }); }
    writeCorpus(corpus);
    return res.json({ success: true, intent });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.delete('/intents', (req: Request, res: Response) => {
  try {
    const intent = req.query.intent as string;
    if (!intent) return res.status(400).json({ error: 'intent query param is required' });
    const corpus = readCorpus();
    corpus.data = corpus.data.filter((item: { intent: string }) => item.intent !== intent);
    writeCorpus(corpus);
    return res.json({ success: true, deleted: intent });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

// === ENTITIES ===

adminRouter.get('/entities', (_req: Request, res: Response) => {
  try { return res.json({ entities: readCorpus().entities || {} }); }
  catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.post('/entities', (req: Request, res: Response) => {
  try {
    const { entityType, optionKey, synonyms } = req.body;
    if (!entityType || !optionKey || !Array.isArray(synonyms)) return res.status(400).json({ error: 'entityType, optionKey, and synonyms[] are required' });
    const corpus = readCorpus();
    if (!corpus.entities) corpus.entities = {};
    if (!corpus.entities[entityType]) corpus.entities[entityType] = { options: {} };
    corpus.entities[entityType].options[optionKey] = synonyms;
    writeCorpus(corpus);
    return res.json({ success: true, entityType, optionKey });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.delete('/entities', (req: Request, res: Response) => {
  try {
    const entityType = req.query.entityType as string;
    const optionKey = req.query.optionKey as string;
    if (!entityType || !optionKey) return res.status(400).json({ error: 'entityType and optionKey query params are required' });
    const corpus = readCorpus();
    if (corpus.entities?.[entityType]?.options) delete corpus.entities[entityType].options[optionKey];
    writeCorpus(corpus);
    return res.json({ success: true, deleted: `${entityType}.${optionKey}` });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

// === TEMPLATES ===

adminRouter.get('/templates', (_req: Request, res: Response) => {
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

adminRouter.post('/templates', (req: Request, res: Response) => {
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
    return res.json({ success: true, scope: scope || 'base', intent });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.delete('/templates', (req: Request, res: Response) => {
  try {
    const scope = (req.query.scope as string) || 'base';
    const intent = req.query.intent as string;
    if (!intent) return res.status(400).json({ error: 'intent query param is required' });
    if (scope === 'base') { const templates = parseTemplatesTs(); delete templates[intent]; writeTemplatesTs(templates); }
    else { const groupsConfig = readGroups(); if (groupsConfig.groups[scope]?.templates) { delete groupsConfig.groups[scope].templates[intent]; writeGroups(groupsConfig); } }
    return res.json({ success: true, deleted: `${scope}:${intent}` });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

// === SETTINGS ===

adminRouter.get('/settings', (_req: Request, res: Response) => res.json({ config: readSettings() }));

adminRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const settings = { ...readSettings(), ...req.body };
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    return res.json({ success: true, config: settings });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

// === LOGS ===

adminRouter.get('/logs', (req: Request, res: Response) => {
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

adminRouter.delete('/logs', (_req: Request, res: Response) => {
  try { writeFileSync(LOGS_PATH, '', 'utf-8'); return res.json({ success: true }); }
  catch (err) { return res.status(500).json({ error: String(err) }); }
});

// === USERS ===

async function readUsers() { return JSON.parse(await fsPromises.readFile(USERS_JSON_PATH, 'utf-8')); }
async function writeUsers(data: unknown) { await fsPromises.writeFile(USERS_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8'); }

adminRouter.get('/users', async (_req: Request, res: Response) => {
  try { const data = await readUsers(); return res.json({ users: data.users }); }
  catch (error) { logger.error({ error }, 'Failed to read users'); return res.status(500).json({ users: [] }); }
});

adminRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, email, userid, brid, role, updatedBy } = req.body;
    if (!name || !email || !userid) return res.status(400).json({ error: 'name, email, and userid are required' });
    const data = await readUsers();
    if (data.users.some((u: { userid: string }) => u.userid === userid)) return res.status(409).json({ error: `User "${userid}" already exists` });
    if (data.users.some((u: { email: string }) => u.email === email)) return res.status(409).json({ error: `Email "${email}" already exists` });
    const maxNum = data.users.map((u: { id: string }) => parseInt(u.id.replace('u', ''), 10)).filter((n: number) => !isNaN(n)).reduce((max: number, n: number) => Math.max(max, n), 0);
    const now = new Date().toISOString();
    const newUser = { id: `u${maxNum + 1}`, name, email, userid, brid: brid || '', role: role === 'admin' ? 'admin' : 'viewer', createdAt: now, updatedBy: updatedBy || 'system', updatedOn: now };
    data.users.push(newUser);
    await writeUsers(data);
    return res.status(201).json(newUser);
  } catch (error) { logger.error({ error }, 'Failed to create user'); return res.status(500).json({ error: 'Failed to create user' }); }
});

adminRouter.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const data = await readUsers();
    const user = data.users.find((u: { id: string }) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (error) { logger.error({ error }, 'Failed to get user'); return res.status(500).json({ error: 'Failed to get user' }); }
});

adminRouter.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const data = await readUsers();
    const idx = data.users.findIndex((u: { id: string }) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const user = data.users[idx];
    const body = req.body;
    if (body.name !== undefined) user.name = body.name;
    if (body.email !== undefined) user.email = body.email;
    if (body.userid !== undefined) user.userid = body.userid;
    if (body.brid !== undefined) user.brid = body.brid;
    if (body.role !== undefined) user.role = body.role === 'admin' ? 'admin' : 'viewer';
    if (body.updatedBy !== undefined) user.updatedBy = body.updatedBy;
    user.updatedOn = new Date().toISOString();
    data.users[idx] = user;
    await writeUsers(data);
    return res.json(user);
  } catch (error) { logger.error({ error }, 'Failed to update user'); return res.status(500).json({ error: 'Failed to update user' }); }
});

adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const data = await readUsers();
    const idx = data.users.findIndex((u: { id: string }) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const user = data.users[idx];
    if (user.role === 'admin') {
      const adminCount = data.users.filter((u: { role: string }) => u.role === 'admin').length;
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }
    data.users.splice(idx, 1);
    await writeUsers(data);
    return res.json({ success: true, deletedUserId: req.params.id });
  } catch (error) { logger.error({ error }, 'Failed to delete user'); return res.status(500).json({ error: 'Failed to delete user' }); }
});

// === FILES ===

adminRouter.get('/files', (_req: Request, res: Response) => {
  try {
    if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    const files = readdirSync(KNOWLEDGE_DIR).filter((f) => !f.startsWith('.')).map((name) => {
      const filePath = join(KNOWLEDGE_DIR, name);
      const stat = statSync(filePath);
      const content = readFileSync(filePath, 'utf-8');
      return { name, path: `data/knowledge/${name}`, size: stat.size, extension: extname(name).slice(1), modifiedAt: stat.mtime.toISOString(), preview: content.substring(0, 200) + (content.length > 200 ? '...' : '') };
    }).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return res.json({ files, totalFiles: files.length });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.post('/files', (req: Request, res: Response) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name and content are required' });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    writeFileSync(join(KNOWLEDGE_DIR, safeName), content, 'utf-8');
    return res.json({ success: true, name: safeName });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.delete('/files', (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: 'name query param is required' });
    unlinkSync(join(KNOWLEDGE_DIR, name.replace(/[^a-zA-Z0-9._-]/g, '-')));
    return res.json({ success: true, deleted: name });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

adminRouter.get('/files/read', (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: 'name query param is required' });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const content = readFileSync(join(KNOWLEDGE_DIR, safeName), 'utf-8');
    return res.json({ name: safeName, content });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

// ============ Learning System ============

adminRouter.get('/learning/review', (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const status = req.query.status as string | undefined;
    const svc = getLearningService(groupId);
    return res.json(svc.getReviewQueue(limit, status));
  } catch (err) {
    logger.error({ error: err }, 'Failed to get review queue');
    return res.status(500).json({ error: String(err) });
  }
});

adminRouter.post('/learning/review/:id/resolve', (req: Request, res: Response) => {
  try {
    const { correctIntent } = req.body;
    const groupId = (req.body.groupId as string) || 'default';
    if (!correctIntent) return res.status(400).json({ error: 'correctIntent is required' });
    const svc = getLearningService(groupId);
    const success = svc.resolveReviewItem(req.params.id, correctIntent);
    if (!success) return res.status(404).json({ error: 'Review item not found or already resolved' });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ error: err }, 'Failed to resolve review item');
    return res.status(500).json({ error: String(err) });
  }
});

adminRouter.post('/learning/review/:id/dismiss', (req: Request, res: Response) => {
  try {
    const groupId = (req.body.groupId as string) || 'default';
    const svc = getLearningService(groupId);
    const success = svc.dismissReviewItem(req.params.id);
    if (!success) return res.status(404).json({ error: 'Review item not found or already resolved' });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ error: err }, 'Failed to dismiss review item');
    return res.status(500).json({ error: String(err) });
  }
});

adminRouter.get('/learning/stats', (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const svc = getLearningService(groupId);
    return res.json(svc.getStats());
  } catch (err) {
    logger.error({ error: err }, 'Failed to get learning stats');
    return res.status(500).json({ error: String(err) });
  }
});

adminRouter.get('/learning/auto-learned', (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const svc = getLearningService(groupId);
    return res.json(svc.getAutoLearnedItems(limit));
  } catch (err) {
    logger.error({ error: err }, 'Failed to get auto-learned items');
    return res.status(500).json({ error: String(err) });
  }
});

adminRouter.post('/learning/retrain', (req: Request, res: Response) => {
  try {
    const groupId = (req.body.groupId as string) || 'default';
    if (groupId === 'all') {
      const { invalidateAllEngines } = require('@/lib/singleton');
      invalidateAllEngines();
    } else {
      invalidateEngine(groupId);
    }
    logger.info({ groupId }, 'NLP retrain triggered');
    return res.json({ success: true, groupId });
  } catch (err) {
    logger.error({ error: err }, 'Failed to trigger retrain');
    return res.status(500).json({ error: String(err) });
  }
});

adminRouter.post('/learning/process-signals', (req: Request, res: Response) => {
  try {
    const groupId = (req.body.groupId as string) || 'default';
    const svc = getLearningService(groupId);
    const result = svc.processSignals();
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error({ error: err }, 'Failed to process signals');
    return res.status(500).json({ error: String(err) });
  }
});
