import { z } from "zod";
import { paths } from "@/lib/env-config";
import { QuerySchema, type Query } from "@/core/api-connector/types";
import { PerGroupStore } from "@/core/store/per-group-store";

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
