import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { paths } from "@/lib/env-config";
import groupsData from "./groups.json";

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
  queries: z.array(z.string()).optional(),
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
  return parsed.groups[groupId] ?? parsed.groups["default"];
}

export function getAllGroupIds(): string[] {
  return Object.keys(parsed.groups);
}

export function getGroupConfigs(): Record<string, GroupConfig> {
  return parsed.groups;
}

export function reloadGroupConfig(): void {
  const filePath = paths.config.groups;
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  parsed = GroupsFileSchema.parse(raw);
}

/**
 * Seed the in-memory group config from the runtime CONFIG_DIR file at startup.
 *
 * `parsed` is initialized from the build-time *bundled* groups.json (esbuild
 * inlines the static import above). In production CONFIG_DIR is a persistent
 * volume whose groups.json holds the groups created/edited via the admin UI.
 * Without this call, every restart silently reverts reads to the stale bundled
 * snapshot, so volume-only groups vanish from the list and 404 on GET /:id
 * ("Group not found") even though writes still target the volume file.
 *
 * Resilient by design: if the volume file is missing (first boot) or
 * unparseable, keep the bundled defaults instead of crashing the engine.
 * Call once during server startup, before accepting requests.
 */
export function initGroupConfig(): void {
  const filePath = paths.config.groups;
  if (!existsSync(filePath)) return;
  try {
    reloadGroupConfig();
  } catch {
    // Corrupt/partial volume file — keep the last good in-memory config.
  }
}
