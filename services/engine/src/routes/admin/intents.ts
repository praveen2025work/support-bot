import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';

const PROJECT_ROOT = process.cwd();
const CORPUS_PATH = join(PROJECT_ROOT, 'src/training/corpus.json');

function readCorpus() {
  return JSON.parse(readFileSync(CORPUS_PATH, 'utf-8'));
}
function writeCorpus(corpus: unknown) {
  writeFileSync(CORPUS_PATH, JSON.stringify(corpus, null, 2) + '\n', 'utf-8');
}

// === INTENTS ===

export const intentsRouter = Router();

intentsRouter.get('/', requirePermission('intents.manage'), (_req: Request, res: Response) => {
  try {
    const corpus = readCorpus();
    const intents = (corpus.data || []).map((item: { intent: string; utterances: string[]; answers?: string[] }) => ({
      intent: item.intent, utterances: item.utterances, answers: item.answers || [], utteranceCount: item.utterances.length,
    }));
    return res.json({ intents, entities: corpus.entities || {} });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

intentsRouter.post('/', requirePermission('intents.manage'), (req: Request, res: Response) => {
  try {
    const { intent, utterances, answers } = req.body;
    if (!intent || !utterances || !Array.isArray(utterances)) return res.status(400).json({ error: 'intent and utterances[] are required' });
    const corpus = readCorpus();
    const existing = corpus.data.findIndex((item: { intent: string }) => item.intent === intent);
    const isUpdate = existing >= 0;
    if (isUpdate) { corpus.data[existing].utterances = utterances; if (answers) corpus.data[existing].answers = answers; }
    else { corpus.data.push({ intent, utterances, answers: answers || [] }); }
    writeCorpus(corpus);
    logAudit({ action: isUpdate ? 'update' : 'create', resource: 'intent', resourceId: intent, details: { utteranceCount: utterances.length }, ip: req.ip });
    return res.json({ success: true, intent });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

intentsRouter.delete('/', requirePermission('intents.manage'), (req: Request, res: Response) => {
  try {
    const intent = req.query.intent as string;
    if (!intent) return res.status(400).json({ error: 'intent query param is required' });
    const corpus = readCorpus();
    corpus.data = corpus.data.filter((item: { intent: string }) => item.intent !== intent);
    writeCorpus(corpus);
    logAudit({ action: 'delete', resource: 'intent', resourceId: intent, ip: req.ip });
    return res.json({ success: true, deleted: intent });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

// === ENTITIES ===

export const entitiesRouter = Router();

entitiesRouter.get('/', requirePermission('intents.manage'), (_req: Request, res: Response) => {
  try { return res.json({ entities: readCorpus().entities || {} }); }
  catch (err) { return res.status(500).json({ error: String(err) }); }
});

entitiesRouter.post('/', requirePermission('intents.manage'), (req: Request, res: Response) => {
  try {
    const { entityType, optionKey, synonyms } = req.body;
    if (!entityType || !optionKey || !Array.isArray(synonyms)) return res.status(400).json({ error: 'entityType, optionKey, and synonyms[] are required' });
    const corpus = readCorpus();
    if (!corpus.entities) corpus.entities = {};
    if (!corpus.entities[entityType]) corpus.entities[entityType] = { options: {} };
    corpus.entities[entityType].options[optionKey] = synonyms;
    writeCorpus(corpus);
    logAudit({ action: 'create', resource: 'entity', resourceId: `${entityType}.${optionKey}`, details: { entityType, optionKey, synonymCount: synonyms.length }, ip: req.ip });
    return res.json({ success: true, entityType, optionKey });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

entitiesRouter.delete('/', requirePermission('intents.manage'), (req: Request, res: Response) => {
  try {
    const entityType = req.query.entityType as string;
    const optionKey = req.query.optionKey as string;
    if (!entityType || !optionKey) return res.status(400).json({ error: 'entityType and optionKey query params are required' });
    const corpus = readCorpus();
    if (corpus.entities?.[entityType]?.options) delete corpus.entities[entityType].options[optionKey];
    writeCorpus(corpus);
    logAudit({ action: 'delete', resource: 'entity', resourceId: `${entityType}.${optionKey}`, ip: req.ip });
    return res.json({ success: true, deleted: `${entityType}.${optionKey}` });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});
