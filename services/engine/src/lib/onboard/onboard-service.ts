import { promises as fs } from "fs";
import path from "path";
import type { OnboardPayload } from "./schemas";
import { generateCorpus, generateFaq } from "./corpus-generator";
import { paths } from "@/lib/env-config";
import { invalidateEngine, invalidateQueryData } from "@/lib/singleton";
import { reloadGroupConfig } from "@/config/group-config";
import {
  saveQuery,
  invalidateQueryRegistry,
} from "@/core/catalog/query-registry";

const TRAINING_GROUPS_DIR = paths.training.groupsDir;
const GROUPS_JSON_PATH = paths.config.groups;

export interface OnboardResult {
  success: boolean;
  groupId: string;
  filesWritten: string[];
  queriesAdded: number;
  errors?: string[];
}

export async function processOnboarding(
  payload: OnboardPayload,
): Promise<OnboardResult> {
  const { groupInfo, queries } = payload;
  const groupId = groupInfo.group_id;
  const filesWritten: string[] = [];

  // 1. Check for duplicate group ID
  const groupsRaw = await fs.readFile(GROUPS_JSON_PATH, "utf-8");
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
  await fs.writeFile(corpusPath, JSON.stringify(corpus, null, 2), "utf-8");
  filesWritten.push(corpusFileName);

  // 3. Generate and write FAQ file
  const faq = generateFaq(payload);
  const faqFileName = `faq-${groupId}.json`;
  const faqPath = path.join(TRAINING_GROUPS_DIR, faqFileName);
  await fs.writeFile(faqPath, JSON.stringify(faq, null, 2), "utf-8");
  filesWritten.push(faqFileName);

  // 4. Update groups.json
  const sources = groupInfo.sources
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const templates: Record<string, string[]> = {};
  if (groupInfo.greeting) templates.greeting = [groupInfo.greeting];
  if (groupInfo.help_text) templates.help = [groupInfo.help_text];

  groupsData.groups[groupId] = {
    name: groupInfo.name,
    description: groupInfo.description,
    sources,
    queries: queries.map((query) => query.name),
    apiBaseUrl: null,
    templates: Object.keys(templates).length > 0 ? templates : null,
    corpus: corpusFileName,
    faq: faqFileName,
  };
  await fs.writeFile(
    GROUPS_JSON_PATH,
    JSON.stringify(groupsData, null, 2),
    "utf-8",
  );
  filesWritten.push("groups.json");

  // 5. Write the group's query definitions to its per-group file — the
  //    file-based source of truth. No db.json: the mock-api fixture is
  //    data-only, so onboarding works identically in dev/uat/demo/prod.
  for (const query of queries) {
    const filterKeys = query.filters
      ? query.filters
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];
    saveQuery(groupId, {
      name: query.name,
      description: query.description,
      estimatedDuration: query.estimated_duration,
      url: query.url,
      source: query.source,
      filters: filterKeys.map((key) => ({ key, binding: "body" as const })),
    });
  }
  filesWritten.push(`queries/${groupId}.json`);

  // 6. Invalidate query + engine caches and reload group config
  invalidateQueryRegistry(groupId);
  invalidateQueryData();
  await invalidateEngine(groupId);

  reloadGroupConfig();

  return {
    success: true,
    groupId,
    filesWritten,
    queriesAdded: queries.length,
  };
}
