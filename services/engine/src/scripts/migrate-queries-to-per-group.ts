/**
 * One-time, idempotent migration: derive per-group query files
 * (DATA_DIR/queries/<groupId>.json) from the flat db.json `queries[]` and
 * groups.json, using the legacy visibility rule. Safe to re-run.
 *
 * Usage (from services/engine): npx tsx src/scripts/migrate-queries-to-per-group.ts
 */
import { readFileSync } from "fs";
import { paths } from "@/lib/env-config";
import { rebuildAllGroupFiles } from "@/core/catalog/query-registry";

function main(): void {
  const db = JSON.parse(readFileSync(paths.mockApi.dbJson, "utf-8")) as {
    queries?: unknown[];
  };
  const groupsFile = JSON.parse(readFileSync(paths.config.groups, "utf-8")) as {
    groups: Record<string, { sources?: string[]; queries?: string[] }>;
  };

  const rawQueries = db.queries ?? [];
  rebuildAllGroupFiles(rawQueries, groupsFile.groups);

  const ids = Object.keys(groupsFile.groups);
  // eslint-disable-next-line no-console
  console.log(
    `Wrote per-group query files for ${ids.length} group(s): ${ids.join(", ")}`,
  );
}

main();
