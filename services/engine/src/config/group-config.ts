import { z } from 'zod';
import { readFileSync } from 'fs';
import { paths } from '@/lib/env-config';
import groupsData from './groups.json';

const GroupTemplatesSchema = z.object({
  greeting: z.array(z.string()).optional(),
  farewell: z.array(z.string()).optional(),
  help: z.array(z.string()).optional(),
  unknown: z.array(z.string()).optional(),
});

const GroupConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  sources: z.array(z.string()),
  apiBaseUrl: z.string().url().nullable(),
  templates: GroupTemplatesSchema.nullable(),
  corpus: z.string().nullable(),
  faq: z.string().nullable(),
});

const GroupsFileSchema = z.object({
  groups: z.record(z.string(), GroupConfigSchema),
});

export type GroupConfig = z.infer<typeof GroupConfigSchema>;
export type GroupTemplates = z.infer<typeof GroupTemplatesSchema>;

let parsed = GroupsFileSchema.parse(groupsData);

export function getGroupConfig(groupId: string): GroupConfig {
  return parsed.groups[groupId] ?? parsed.groups['default'];
}

export function getAllGroupIds(): string[] {
  return Object.keys(parsed.groups);
}

export function getGroupConfigs(): Record<string, GroupConfig> {
  return parsed.groups;
}

export function reloadGroupConfig(): void {
  const filePath = paths.config.groups;
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  parsed = GroupsFileSchema.parse(raw);
}
