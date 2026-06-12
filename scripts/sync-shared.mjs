// Copies the canonical shared SQL connector router into each connector that
// vendors it, prepending a "do not edit" banner. Run after editing
// packages/sql-connector/connectors-router.ts:
//
//   node scripts/sync-shared.mjs        (or: npm run sync:shared)
//
// Vendoring (rather than a workspace import) keeps every connector buildable
// from its own folder with no dependency on the repo root.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const canonical = join(root, "packages/sql-connector/connectors-router.ts");
const targets = ["mssql-connector", "oracle-connector"];

const BANNER =
  "// ─────────────────────────────────────────────────────────────────────\n" +
  "// VENDORED from packages/sql-connector/connectors-router.ts — do NOT edit here.\n" +
  "// Edit the canonical copy in packages/sql-connector, then run: npm run sync:shared\n" +
  "// ─────────────────────────────────────────────────────────────────────\n";

const body = readFileSync(canonical, "utf8");
for (const t of targets) {
  const dir = join(root, "apps", t, "src/shared");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "connectors-router.ts"), BANNER + body);
  console.log(`synced → apps/${t}/src/shared/connectors-router.ts`);
}
