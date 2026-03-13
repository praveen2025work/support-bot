import { promises as fs } from 'fs';
import path from 'path';
import type { OnboardPayload } from './schemas';
import { generateCorpus, generateFaq } from './corpus-generator';
import { withDbLock } from '@/lib/db';

const PROJECT_ROOT = process.cwd();
const TRAINING_GROUPS_DIR = path.join(PROJECT_ROOT, 'src/training/groups');
const GROUPS_JSON_PATH = path.join(PROJECT_ROOT, 'src/config/groups.json');

export interface OnboardResult {
  success: boolean;
  groupId: string;
  filesWritten: string[];
  queriesAdded: number;
  errors?: string[];
}

export async function processOnboarding(
  payload: OnboardPayload
): Promise<OnboardResult> {
  const { groupInfo, queries } = payload;
  const groupId = groupInfo.group_id;
  const filesWritten: string[] = [];

  // 1. Check for duplicate group ID
  const groupsRaw = await fs.readFile(GROUPS_JSON_PATH, 'utf-8');
  const groupsData = JSON.parse(groupsRaw);
  if (groupsData.groups[groupId]) {
    return {
      success: false,
      groupId,
      filesWritten: [],
      queriesAdded: 0,
      errors: [`Group ID "${groupId}" already exists. Choose a different ID.`],
    };
  }

  // 2. Generate and write corpus file
  const corpus = generateCorpus(payload);
  const corpusFileName = `corpus-${groupId}.json`;
  const corpusPath = path.join(TRAINING_GROUPS_DIR, corpusFileName);
  await fs.writeFile(corpusPath, JSON.stringify(corpus, null, 2), 'utf-8');
  filesWritten.push(corpusFileName);

  // 3. Generate and write FAQ file
  const faq = generateFaq(payload);
  const faqFileName = `faq-${groupId}.json`;
  const faqPath = path.join(TRAINING_GROUPS_DIR, faqFileName);
  await fs.writeFile(faqPath, JSON.stringify(faq, null, 2), 'utf-8');
  filesWritten.push(faqFileName);

  // 4. Update groups.json
  const sources = groupInfo.sources
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const templates: Record<string, string[]> = {};
  if (groupInfo.greeting) templates.greeting = [groupInfo.greeting];
  if (groupInfo.help_text) templates.help = [groupInfo.help_text];

  groupsData.groups[groupId] = {
    name: groupInfo.name,
    description: groupInfo.description,
    sources,
    apiBaseUrl: null,
    templates: Object.keys(templates).length > 0 ? templates : null,
    corpus: corpusFileName,
    faq: faqFileName,
  };
  await fs.writeFile(
    GROUPS_JSON_PATH,
    JSON.stringify(groupsData, null, 2),
    'utf-8'
  );
  filesWritten.push('groups.json');

  // 5. Update mock-api/db.json with new queries (using shared lock)
  await withDbLock(async (dbData) => {
    const existingQueries = (dbData.queries || []) as Array<{ id: string; [key: string]: unknown }>;
    const maxIdNum = existingQueries
      .map((q) => parseInt(q.id.replace('q', ''), 10))
      .filter((n) => !isNaN(n))
      .reduce((max, n) => Math.max(max, n), 0);

    let nextId = maxIdNum + 1;
    for (const query of queries) {
      const filterKeys = query.filters
        ? query.filters
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        : [];
      const filters = filterKeys.map((key) => ({ key, binding: 'body' }));

      existingQueries.push({
        id: `q${nextId++}`,
        name: query.name,
        description: query.description,
        estimatedDuration: query.estimated_duration,
        url: query.url,
        source: query.source,
        filters,
      });
    }
    dbData.queries = existingQueries;
    return { result: undefined, save: true };
  });
  filesWritten.push('db.json');

  // 6. Invalidate engine cache + reload group config
  const { invalidateEngine } = await import('@/lib/singleton');
  invalidateEngine(groupId);

  const { reloadGroupConfig } = await import('@/config/group-config');
  reloadGroupConfig();

  return {
    success: true,
    groupId,
    filesWritten,
    queriesAdded: queries.length,
  };
}
