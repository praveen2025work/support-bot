import { z } from "zod";
import { existsSync, readFileSync, statSync } from "fs";
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
let lastMtimeMs: number | null = null;

/**
 * Reload the in-memory config from the CONFIG_DIR file when it has changed on
 * disk (compared by mtime). This lets every instance pick up group edits made
 * by ANY instance on the shared volume — a UI refresh reflects the change with
 * no service restart. Cheap: one statSync per read, re-reading only when the
 * file actually changed. Resilient: a missing file (first boot / no volume) or
 * a corrupt/in-flight write keeps the last good in-memory config.
 */
function refreshIfChanged(): void {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(paths.config.groups).mtimeMs;
  } catch {
    return; // no volume file yet — keep current (bundled / last good)
  }
  if (mtimeMs === lastMtimeMs) return;
  try {
    parsed = GroupsFileSchema.parse(
      JSON.parse(readFileSync(paths.config.groups, "utf-8")),
    );
    lastMtimeMs = mtimeMs;
  } catch {
    // Corrupt or partially-written file — keep last good and retry next read
    // (lastMtimeMs left unchanged so the next read re-attempts).
  }
}

export function getGroupConfig(groupId: string): GroupConfig {
  refreshIfChanged();
  return parsed.groups[groupId] ?? parsed.groups["default"];
}

export function getAllGroupIds(): string[] {
  refreshIfChanged();
  return Object.keys(parsed.groups);
}

export function getGroupConfigs(): Record<string, GroupConfig> {
  refreshIfChanged();
  return parsed.groups;
}

export function reloadGroupConfig(): void {
  const filePath = paths.config.groups;
  parsed = GroupsFileSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")));
  try {
    lastMtimeMs = statSync(filePath).mtimeMs;
  } catch {
    lastMtimeMs = null;
  }
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
 * Reads also self-heal via refreshIfChanged() (mtime), so this is mainly an
 * eager warm-up so the first request doesn't pay the reload. Resilient: if the
 * volume file is missing (first boot) or unparseable, keep the bundled
 * defaults instead of crashing the engine. Call once during server startup.
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
