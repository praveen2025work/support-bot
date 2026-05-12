/**
 * Schema registry — remembers the column set we last saw for each
 * (group, query) pair. Used by the drift detector to flag silent
 * schema changes in source data (column renamed, column dropped,
 * column type shifted) BEFORE they break queries for end users.
 *
 * Storage: one JSON file per query under
 *   data/schema/<groupId>/<safeQueryName>.json
 *
 * On every successful query execution, the handler persists the
 * current column set. Before persisting it diffs against what's
 * already on disk — that diff is the "drift" report attached to the
 * response.
 */

import { promises as fs } from "fs";
import { dirname } from "path";
import { paths } from "../../lib/env-config";
import { logger } from "../../lib/logger";

export interface StoredSchema {
  /** Group + query identity */
  groupId: string;
  queryName: string;
  /** Column names in the order the source returned them */
  columns: string[];
  /** When this schema was last observed in a query result */
  observedAt: string;
  /** When drift was last reported (cleared via /api/admin/schema/acknowledge) */
  driftFlaggedAt?: string;
  /** Last drift snapshot (so admin UI can render WHY without re-diffing) */
  lastDrift?: {
    added: string[];
    removed: string[];
    reorderedFrom?: string[];
  };
}

export async function loadSchema(
  groupId: string,
  queryName: string,
): Promise<StoredSchema | null> {
  try {
    const raw = await fs.readFile(
      paths.data.schemaFile(groupId, queryName),
      "utf-8",
    );
    return JSON.parse(raw) as StoredSchema;
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") return null;
    logger.warn(
      { err, groupId, queryName },
      "schema registry: failed to read stored schema",
    );
    return null;
  }
}

export async function saveSchema(schema: StoredSchema): Promise<void> {
  const target = paths.data.schemaFile(schema.groupId, schema.queryName);
  await fs.mkdir(dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(schema, null, 2), "utf-8");
}

/**
 * Drop the drift flag — admin acknowledged the change.
 * Keeps the schema record around so future drift is measured against
 * the now-accepted baseline.
 */
export async function acknowledgeDrift(
  groupId: string,
  queryName: string,
): Promise<boolean> {
  const stored = await loadSchema(groupId, queryName);
  if (!stored) return false;
  delete stored.driftFlaggedAt;
  delete stored.lastDrift;
  await saveSchema(stored);
  return true;
}

/**
 * List every (group, query) pair with an unacknowledged drift flag.
 * Used by the admin UI to render the "queries that need attention"
 * badge.
 */
export async function listFlaggedSchemas(
  groupId?: string,
): Promise<Array<StoredSchema>> {
  const root = `${process.env.DATA_DIR ?? ""}`;
  // Walk data/schema/<group>/<file>.json. When groupId is provided we
  // limit to that group; otherwise we scan every group dir we find.
  const out: StoredSchema[] = [];
  try {
    const baseDir = groupId
      ? [paths.data.schemaDir(groupId)]
      : await listGroupDirs();
    for (const dir of baseDir) {
      let entries: string[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch {
        continue;
      }
      for (const f of entries) {
        if (!f.endsWith(".json")) continue;
        try {
          const raw = await fs.readFile(`${dir}/${f}`, "utf-8");
          const s = JSON.parse(raw) as StoredSchema;
          if (s.driftFlaggedAt) out.push(s);
        } catch {
          // skip corrupt files
        }
      }
    }
  } catch (err) {
    logger.warn(
      { err, groupId, dataDirEnv: root },
      "listFlaggedSchemas: scan failed",
    );
  }
  return out;
}

async function listGroupDirs(): Promise<string[]> {
  // data/schema/<group>/...
  const root = paths.data.schemaDir("__list__").replace(/__list__$/, "");
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => `${root}${e.name}`);
  } catch {
    return [];
  }
}
