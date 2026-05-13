/**
 * Per-group business glossary.
 *
 * A glossary entry formally defines a metric: what "revenue" / "churn"
 * / "active users" actually MEANS in this organization. Until now the
 * engine treated metric names as opaque tokens — "revenue" routed to a
 * query called `monthly_revenue` and that was the end of it. The CIO
 * follow-up question — "what counts as revenue?" — had no canonical
 * answer.
 *
 * This module is the source of truth. Admins maintain it via the
 * /admin/glossary surface; chat responses can reference it inline
 * (future commit). Synonyms (the existing /admin/synonyms layer)
 * remain separate — they're vocabulary substitution; glossary is
 * semantic definition.
 *
 * Storage: one JSON per group at data/glossary/<groupId>.json.
 * Schema is the GlossaryEntry shape below.
 */

import { promises as fs } from "fs";
import { dirname } from "path";
import { paths } from "../../lib/env-config";
import { logger } from "../../lib/logger";

export interface GlossaryEntry {
  /** URL-safe identifier; stable across renames. Generated client-side
   *  (kebab-case of the name on create) so updates target a known slug. */
  id: string;
  /** Human-facing name. Free text, displayed in admin UI + chat. */
  name: string;
  /** Other phrases that should resolve to this metric. Different from
   *  /admin/synonyms in scope: aliases here are TYPED as "this name
   *  means the same thing as this metric", not "expand at query time". */
  aliases: string[];
  /** Natural-language definition. The text a CIO would accept as the
   *  organization's stance on what counts. Markdown allowed. */
  definition: string;
  /** Optional formula / pseudo-SQL for the metric. Free text — we don't
   *  parse or execute this, it's reference material for engineers. */
  formula?: string;
  /** Owner / team accountable for the definition. */
  owner?: string;
  /** Optional sample utterances showing how the metric is asked for. */
  examples?: string[];
  updatedAt: string;
  updatedBy?: string;
}

export interface GlossaryFile {
  groupId: string;
  entries: GlossaryEntry[];
  updatedAt: string;
}

function emptyFile(groupId: string): GlossaryFile {
  return { groupId, entries: [], updatedAt: new Date().toISOString() };
}

function isEntry(value: unknown): value is GlossaryEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    Array.isArray(v.aliases) &&
    (v.aliases as unknown[]).every((a) => typeof a === "string") &&
    typeof v.definition === "string" &&
    typeof v.updatedAt === "string"
  );
}

export async function readGlossary(groupId: string): Promise<GlossaryFile> {
  try {
    const raw = await fs.readFile(paths.data.glossaryFile(groupId), "utf-8");
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.filter(isEntry)
      : [];
    return {
      groupId,
      entries,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date(0).toISOString(),
    };
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") return emptyFile(groupId);
    logger.warn({ err, groupId }, "glossary: read failed");
    return emptyFile(groupId);
  }
}

async function writeGlossary(file: GlossaryFile): Promise<void> {
  const path = paths.data.glossaryFile(file.groupId);
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(file, null, 2) + "\n", "utf-8");
}

/** Create or update an entry, matched by id. Caller supplies the id;
 *  if absent we kebab-case the name. Updates `updatedAt` on every save. */
export async function upsertEntry(
  groupId: string,
  patch: Omit<GlossaryEntry, "updatedAt"> & { updatedAt?: string },
): Promise<GlossaryEntry> {
  const file = await readGlossary(groupId);
  const id = patch.id || kebab(patch.name);
  const now = new Date().toISOString();
  const entry: GlossaryEntry = {
    id,
    name: patch.name,
    aliases: patch.aliases ?? [],
    definition: patch.definition,
    ...(patch.formula && { formula: patch.formula }),
    ...(patch.owner && { owner: patch.owner }),
    ...(patch.examples && { examples: patch.examples }),
    ...(patch.updatedBy && { updatedBy: patch.updatedBy }),
    updatedAt: now,
  };
  const idx = file.entries.findIndex((e) => e.id === id);
  if (idx >= 0) file.entries[idx] = entry;
  else file.entries.push(entry);
  file.updatedAt = now;
  await writeGlossary(file);
  return entry;
}

export async function deleteEntry(
  groupId: string,
  id: string,
): Promise<boolean> {
  const file = await readGlossary(groupId);
  const before = file.entries.length;
  file.entries = file.entries.filter((e) => e.id !== id);
  if (file.entries.length === before) return false;
  file.updatedAt = new Date().toISOString();
  await writeGlossary(file);
  return true;
}

/** Look up an entry by name or alias (case-insensitive). Used by future
 *  chat-side wiring to surface definitions inline in responses. */
export async function findEntry(
  groupId: string,
  query: string,
): Promise<GlossaryEntry | null> {
  const lower = query.trim().toLowerCase();
  if (!lower) return null;
  const file = await readGlossary(groupId);
  for (const e of file.entries) {
    if (e.name.toLowerCase() === lower) return e;
    if (e.aliases.some((a) => a.toLowerCase() === lower)) return e;
  }
  return null;
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
