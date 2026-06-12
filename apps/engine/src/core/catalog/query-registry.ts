import { z } from "zod";
import { existsSync, readFileSync, readdirSync } from "fs";
import { paths } from "@/lib/env-config";
import { QuerySchema, type Query } from "@/core/api-connector/types";
import { PerGroupStore } from "@/core/store/per-group-store";
import { getAllGroupIds } from "@/config/group-config";
import { logger } from "@/lib/logger";

const QueriesFileSchema = z.object({ queries: z.array(QuerySchema) });
type QueriesFile = z.infer<typeof QueriesFileSchema>;

const store = new PerGroupStore<QueriesFile>({
  dir: paths.data.queriesDir,
  fileFor: (groupId) => paths.data.queries(groupId),
  schema: QueriesFileSchema,
  defaultValue: () => ({ queries: [] }),
});

/** All query definitions for a group (the catalog source of truth). */
export function getGroupQueries(groupId: string): Query[] {
  return store.read(groupId).queries;
}

/** Create or update (by name) a query in a group's file. */
export function upsertQuery(groupId: string, query: Query): Query {
  const queries = [...store.read(groupId).queries];
  const idx = queries.findIndex((q) => q.name === query.name);
  if (idx !== -1) queries[idx] = { ...queries[idx], ...query };
  else queries.push(query);
  store.write(groupId, { queries });
  return query;
}

/** Delete a query (by id) from a group's file. Returns true if removed. */
export function deleteQuery(groupId: string, id: string): boolean {
  const current = store.read(groupId).queries;
  const queries = current.filter((q) => q.id !== id);
  if (queries.length === current.length) return false;
  store.write(groupId, { queries });
  return true;
}

/** Next `q<N>` id that doesn't collide within a group's existing set. */
function nextQueryId(existing: Query[]): string {
  const max = existing.reduce((m, q) => {
    const n = parseInt(String(q.id ?? "").replace(/^q/, ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `q${max + 1}`;
}

/**
 * Create (or update-by-name) a query in a group's file. Assigns a fresh id when
 * the query is new; preserves the existing id on a same-name upsert. The full
 * record is validated/normalized through QuerySchema before it is written.
 * This is the single write entry point for the admin create flow — no db.json.
 */
export function saveQuery(
  groupId: string,
  input: Record<string, unknown> & { name: string },
): Query {
  const queries = [...store.read(groupId).queries];
  const idx = queries.findIndex((q) => q.name === input.name);
  const id = idx !== -1 ? queries[idx].id : (input.id ?? nextQueryId(queries));
  const record = QuerySchema.parse(
    idx !== -1 ? { ...queries[idx], ...input, id } : { ...input, id },
  );
  if (idx !== -1) queries[idx] = record;
  else queries.push(record);
  store.write(groupId, { queries });
  return record;
}

/** Update a query (by id) within a group. Returns null when the id is absent. */
export function updateGroupQuery(
  groupId: string,
  id: string,
  updates: Partial<Query>,
): Query | null {
  const queries = [...store.read(groupId).queries];
  const idx = queries.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  const record = QuerySchema.parse({ ...queries[idx], ...updates, id });
  queries[idx] = record;
  store.write(groupId, { queries });
  return record;
}

/**
 * Every query across all groups, each annotated with its `groupId`. Backs the
 * global "list all queries" / file-sources views that used to scan db.json.
 */
export function getAllQueries(): Array<Query & { groupId: string }> {
  return getAllGroupIds().flatMap((groupId) =>
    store.read(groupId).queries.map((q) => ({ ...q, groupId })),
  );
}

/** Find a query (by id or name) across all groups. */
export function findQueryAcrossGroups(
  idOrName: string,
): (Query & { groupId: string }) | null {
  return (
    getAllQueries().find((q) => q.id === idOrName || q.name === idOrName) ??
    null
  );
}

export function invalidateQueryRegistry(groupId?: string): void {
  store.invalidate(groupId);
}

/** Minimal shape of a group config needed to partition queries. */
interface GroupLike {
  sources?: string[];
  queries?: string[];
}

/**
 * Compute a group's query set with the SAME rule the legacy HTTP path used:
 * if the group has a non-empty `queries` allowlist, use those names (source is
 * ignored); else if it has sources, match by source; else return all.
 */
function queriesForGroup(group: GroupLike, all: Query[]): Query[] {
  if (group.queries && group.queries.length > 0) {
    const allow = new Set(group.queries.map((n) => n.toLowerCase()));
    return all.filter((q) => allow.has(q.name.toLowerCase()));
  }
  if (group.sources && group.sources.length > 0) {
    return all.filter((q) => q.source && group.sources!.includes(q.source));
  }
  return all;
}

/**
 * Regenerate every group's per-group file from a flat query list + group map.
 * Used by the migration and by the admin-write bridge so per-group files stay
 * consistent with `db.json` until the full per-group write path lands (Plan 2).
 * Raw queries are validated/normalized through QuerySchema before writing.
 */
export function rebuildAllGroupFiles(
  rawQueries: unknown[],
  groups: Record<string, GroupLike>,
): void {
  const all = rawQueries.map((q) => QuerySchema.parse(q));
  for (const [groupId, group] of Object.entries(groups)) {
    store.write(groupId, { queries: queriesForGroup(group, all) });
  }
}

/** True if at least one per-group query file already exists on disk. */
export function hasAnyGroupQueryFile(): boolean {
  try {
    return readdirSync(paths.data.queriesDir).some((f) => f.endsWith(".json"));
  } catch {
    return false; // dir missing → no files yet
  }
}

/**
 * One-time, idempotent seed of per-group query files from a legacy mock-api
 * db.json. Returns true only when it actually migrated.
 *
 * No-op when:
 *  - any per-group file already exists (normal prod / already migrated), or
 *  - no db.json is present (the file-based deployments we target).
 *
 * This lets a dev box that still carries a db.json fixture boot straight into
 * the file-based query store without a manual migration step, while never
 * resurrecting deleted queries or clobbering existing per-group files.
 */
export function migrateQueriesFromDbJson(
  groups: Record<string, GroupLike>,
): boolean {
  if (hasAnyGroupQueryFile()) return false;
  if (!existsSync(paths.mockApi.dbJson)) return false;
  try {
    const db = JSON.parse(readFileSync(paths.mockApi.dbJson, "utf-8"));
    const raw: unknown[] = Array.isArray(db?.queries) ? db.queries : [];
    if (raw.length === 0) return false;
    rebuildAllGroupFiles(raw, groups);
    logger.info(
      { groups: Object.keys(groups).length, queries: raw.length },
      "Seeded per-group query files from legacy db.json (one-time migration)",
    );
    return true;
  } catch (err) {
    logger.warn(
      { err },
      "db.json present but could not be migrated — skipping",
    );
    return false;
  }
}
