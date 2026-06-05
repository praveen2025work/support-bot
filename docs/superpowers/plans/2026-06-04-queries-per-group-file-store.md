# Queries Per-Group File Store — Implementation Plan (Phase 1: read path + migration)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the query registry (list/search/catalog/NLP) load query definitions from per-group JSON files (`DATA_DIR/queries/<groupId>.json`) instead of fetching them over HTTP, fixing the broken "list queries" command, while query _execution_ keeps using the data API.

**Architecture:** Introduce a reusable `PerGroupStore<T>` (read with mtime cache, atomic write, list, invalidate). Build `query-registry` on top of it. Redirect the single chokepoint `QueryService.getQueries()` to read the registry, threading `groupId` from the (already group-aware) callers. A one-time migration derives per-group files from today's `db.json` + `groups.json`. A small bridge keeps the existing admin write path (still `db.json`) consistent by regenerating the per-group files after each admin write. Full per-group write path is Plan 2.

**Tech Stack:** TypeScript, Express engine, Zod, vitest, tsx.

**Spec:** `docs/superpowers/specs/2026-06-04-queries-per-group-file-store-design.md`

---

## File Structure

- Create: `services/engine/src/core/store/per-group-store.ts` — generic per-group JSON file store (read/write/list/invalidate).
- Create: `services/engine/src/core/catalog/query-registry.ts` — queries on top of the store + per-group derivation logic.
- Create: `services/engine/src/scripts/migrate-queries-to-per-group.ts` — one-time migration (run via tsx).
- Create tests: `services/engine/src/__tests__/core/store/per-group-store.test.ts`, `services/engine/src/__tests__/core/catalog/query-registry.test.ts`.
- Modify: `services/engine/src/lib/env-config.ts` — add `queriesDir` + `queries(groupId)` paths.
- Modify: `services/engine/src/core/api-connector/query-service.ts` — add `groupId` ctor param; `getQueries()` reads the registry.
- Modify: `services/engine/src/core/catalog/catalog-service.ts` — thread `groupId` into `fetchQueries` + callers.
- Modify: `services/engine/src/routes/queries.ts` — pass `groupId` to `QueryService`.
- Modify: `services/engine/src/routes/admin/queries.ts` — after each write, regenerate per-group files (bridge).
- Modify test: `services/engine/src/__tests__/core/api-connector/query-execution.test.ts` — none expected (execution untouched; confirm green).

All commands run from `services/engine` unless noted.

---

### Task 1: Add per-group queries paths to env-config

**Files:**

- Modify: `services/engine/src/lib/env-config.ts` (inside `paths.data`, near the `gridboardViews` entry ~line 172)

- [ ] **Step 1: Add the paths**

In `services/engine/src/lib/env-config.ts`, inside the `data: { ... }` object, add after the `gridboardViews` entry:

```typescript
    /** Per-group query registry — one JSON file per group, shape
        `{ queries: Query[] }`. Source of truth for the query catalog
        (list/search/NLP). Execution still hits the data API per query. */
    queriesDir: join(DATA_DIR, "queries"),
    queries: (groupId: string) =>
      join(DATA_DIR, "queries", `${groupId}.json`),
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (same count as before this task).

- [ ] **Step 3: Commit**

```bash
git add services/engine/src/lib/env-config.ts
git commit -m "feat(engine): add per-group queries file paths to env-config"
```

---

### Task 2: PerGroupStore — generic per-group JSON file store

**Files:**

- Create: `services/engine/src/core/store/per-group-store.ts`
- Test: `services/engine/src/__tests__/core/store/per-group-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/store/per-group-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, utimesSync } from "fs";
import path from "path";
import os from "os";
import { z } from "zod";
import { PerGroupStore } from "@/core/store/per-group-store";

const dir = path.join(os.tmpdir(), "per-group-store-test");
const Schema = z.object({ items: z.array(z.string()) });

function makeStore() {
  return new PerGroupStore({
    dir,
    fileFor: (g: string) => path.join(dir, `${g}.json`),
    schema: Schema,
    defaultValue: () => ({ items: [] }),
  });
}

beforeEach(() => {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("PerGroupStore", () => {
  it("returns defaultValue when the file is missing", () => {
    expect(makeStore().read("nope")).toEqual({ items: [] });
  });

  it("reads and validates an existing file", () => {
    writeFileSync(path.join(dir, "g.json"), JSON.stringify({ items: ["a"] }));
    expect(makeStore().read("g")).toEqual({ items: ["a"] });
  });

  it("write is atomic and round-trips, and read returns it", () => {
    const store = makeStore();
    store.write("g", { items: ["x", "y"] });
    expect(makeStore().read("g")).toEqual({ items: ["x", "y"] });
  });

  it("caches by mtime: does not re-parse when the file is unchanged", () => {
    const store = makeStore();
    writeFileSync(path.join(dir, "g.json"), JSON.stringify({ items: ["a"] }));
    expect(store.read("g")).toEqual({ items: ["a"] });
    const spy = vi.spyOn(JSON, "parse");
    store.read("g");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("reloads when mtime changes (another instance wrote)", () => {
    const store = makeStore();
    const file = path.join(dir, "g.json");
    writeFileSync(file, JSON.stringify({ items: ["a"] }));
    expect(store.read("g")).toEqual({ items: ["a"] });
    writeFileSync(file, JSON.stringify({ items: ["a", "b"] }));
    utimesSync(file, new Date(), new Date(Date.now() + 1000));
    expect(store.read("g")).toEqual({ items: ["a", "b"] });
  });

  it("corrupt file returns last-good cache without throwing", () => {
    const store = makeStore();
    const file = path.join(dir, "g.json");
    writeFileSync(file, JSON.stringify({ items: ["a"] }));
    expect(store.read("g")).toEqual({ items: ["a"] });
    writeFileSync(file, "{ not json");
    utimesSync(file, new Date(), new Date(Date.now() + 1000));
    expect(() => store.read("g")).not.toThrow();
    expect(store.read("g")).toEqual({ items: ["a"] });
  });

  it("list() returns group ids that have files", () => {
    const store = makeStore();
    store.write("a", { items: [] });
    store.write("b", { items: [] });
    expect(store.list().sort()).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/core/store/per-group-store.test.ts`
Expected: FAIL — `Cannot find module '@/core/store/per-group-store'`.

- [ ] **Step 3: Write the implementation**

Create `services/engine/src/core/store/per-group-store.ts`:

```typescript
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "fs";
import { basename, dirname } from "path";
import type { ZodType } from "zod";
import { logger } from "@/lib/logger";

interface CacheEntry<T> {
  mtimeMs: number;
  value: T;
}

export interface PerGroupStoreOptions<T> {
  /** Directory that holds the per-group files (used by list()). */
  dir: string;
  /** Resolve the absolute file path for a group id. */
  fileFor: (groupId: string) => string;
  /** Zod schema the file contents must satisfy. */
  schema: ZodType<T>;
  /** Value returned when the file is missing. */
  defaultValue: () => T;
}

/**
 * Generic per-group JSON file store ("DB without DB" primitive).
 *
 * - read(): mtime-cached; re-reads only when the file changes on disk, so a
 *   write from any instance is picked up. Missing file -> defaultValue().
 *   Corrupt/invalid file -> last-good cache if present, else defaultValue();
 *   never throws on read.
 * - write(): validates, writes atomically (temp file + rename), refreshes cache.
 */
export class PerGroupStore<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(private readonly opts: PerGroupStoreOptions<T>) {}

  read(groupId: string): T {
    const file = this.opts.fileFor(groupId);
    let mtimeMs: number;
    try {
      mtimeMs = statSync(file).mtimeMs;
    } catch {
      return this.opts.defaultValue();
    }
    const cached = this.cache.get(file);
    if (cached && cached.mtimeMs === mtimeMs) return cached.value;
    try {
      const raw = JSON.parse(readFileSync(file, "utf-8"));
      const value = this.opts.schema.parse(raw);
      this.cache.set(file, { mtimeMs, value });
      return value;
    } catch (err) {
      logger.error(
        { err, file },
        "PerGroupStore: failed to read/parse file; serving last-good value",
      );
      return cached ? cached.value : this.opts.defaultValue();
    }
  }

  write(groupId: string, value: T): T {
    const validated = this.opts.schema.parse(value);
    const file = this.opts.fileFor(groupId);
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify(validated, null, 2) + "\n", "utf-8");
    renameSync(tmp, file);
    this.cache.set(file, { mtimeMs: statSync(file).mtimeMs, value: validated });
    return validated;
  }

  list(): string[] {
    if (!existsSync(this.opts.dir)) return [];
    try {
      return readdirSync(this.opts.dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => basename(f, ".json"));
    } catch {
      return [];
    }
  }

  invalidate(groupId?: string): void {
    if (groupId) this.cache.delete(this.opts.fileFor(groupId));
    else this.cache.clear();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/core/store/per-group-store.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/store/per-group-store.ts services/engine/src/__tests__/core/store/per-group-store.test.ts
git commit -m "feat(engine): add reusable PerGroupStore (per-group JSON file store)"
```

---

### Task 3: query-registry — queries on top of the store + per-group derivation

**Files:**

- Create: `services/engine/src/core/catalog/query-registry.ts`
- Test: `services/engine/src/__tests__/core/catalog/query-registry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/catalog/query-registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

const dataDir = path.join(os.tmpdir(), "query-registry-test");
const originalDataDir = process.env.DATA_DIR;

function makeApiQuery(name: string, source: string) {
  return { id: name, name, source, type: "api", endpoint: `/${name}` };
}

beforeEach(() => {
  vi.resetModules();
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  process.env.DATA_DIR = dataDir;
});
afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
  process.env.DATA_DIR = originalDataDir;
});

describe("query-registry", () => {
  it("getGroupQueries returns empty for a group with no file", async () => {
    const reg = await import("@/core/catalog/query-registry");
    expect(reg.getGroupQueries("finance")).toEqual([]);
  });

  it("upsertQuery then getGroupQueries round-trips", async () => {
    const reg = await import("@/core/catalog/query-registry");
    reg.upsertQuery("finance", makeApiQuery("revenue", "finance"));
    const names = reg.getGroupQueries("finance").map((q) => q.name);
    expect(names).toEqual(["revenue"]);
  });

  it("deleteQuery removes by id", async () => {
    const reg = await import("@/core/catalog/query-registry");
    reg.upsertQuery("finance", makeApiQuery("revenue", "finance"));
    expect(reg.deleteQuery("finance", "revenue")).toBe(true);
    expect(reg.getGroupQueries("finance")).toEqual([]);
  });

  it("rebuildAllGroupFiles uses the allowlist when group.queries is set", async () => {
    const reg = await import("@/core/catalog/query-registry");
    const allQueries = [
      makeApiQuery("revenue", "finance"),
      makeApiQuery("trades", "trading"),
      makeApiQuery("errors", "engineering"),
    ];
    const groups = {
      finance: { sources: ["finance", "trading"], queries: ["revenue"] },
      engineering: { sources: ["engineering"], queries: [] },
    };
    reg.rebuildAllGroupFiles(allQueries, groups);
    // finance: allowlist -> only "revenue" (NOT trades, even though source matches)
    expect(reg.getGroupQueries("finance").map((q) => q.name)).toEqual([
      "revenue",
    ]);
    // engineering: no allowlist -> source match -> "errors"
    expect(reg.getGroupQueries("engineering").map((q) => q.name)).toEqual([
      "errors",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/core/catalog/query-registry.test.ts`
Expected: FAIL — `Cannot find module '@/core/catalog/query-registry'`.

- [ ] **Step 3: Write the implementation**

Create `services/engine/src/core/catalog/query-registry.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/core/catalog/query-registry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/catalog/query-registry.ts services/engine/src/__tests__/core/catalog/query-registry.test.ts
git commit -m "feat(engine): add file-based query-registry on PerGroupStore"
```

---

### Task 4: Redirect QueryService.getQueries() to the registry

**Files:**

- Modify: `services/engine/src/core/api-connector/query-service.ts` (constructor ~68-77, `getQueries` ~79-100)
- Test: `services/engine/src/__tests__/core/api-connector/query-service-registry.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `services/engine/src/__tests__/core/api-connector/query-service-registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

const dataDir = path.join(os.tmpdir(), "query-service-registry-test");
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  vi.resetModules();
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  process.env.DATA_DIR = dataDir;
});
afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
  process.env.DATA_DIR = originalDataDir;
});

describe("QueryService.getQueries reads the file registry, not HTTP", () => {
  it("returns the group's file queries and never calls ApiClient.get", async () => {
    const reg = await import("@/core/catalog/query-registry");
    reg.upsertQuery("finance", {
      id: "revenue",
      name: "revenue",
      source: "finance",
      type: "api",
      endpoint: "/revenue",
    });

    const { ApiClient } = await import("@/core/api-connector/api-client");
    const { QueryService } = await import("@/core/api-connector/query-service");
    const client = new ApiClient("http://unused.test/api");
    const getSpy = vi.spyOn(client, "get");

    const service = new QueryService(client, [], [], "finance");
    const queries = await service.getQueries();

    expect(queries.map((q) => q.name)).toEqual(["revenue"]);
    expect(getSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/core/api-connector/query-service-registry.test.ts`
Expected: FAIL — `getQueries` still calls `apiClient.get` (spy is called) OR the 4th ctor arg is ignored.

- [ ] **Step 3: Edit the constructor**

In `services/engine/src/core/api-connector/query-service.ts`, replace the constructor (lines 68-77):

```typescript
  constructor(
    private apiClient: ApiClient,
    sources?: string[],
    queryAllowlist?: string[],
    private groupId: string = "default",
  ) {
    this.sources = sources ?? [];
    this.queryAllowlist = new Set(
      (queryAllowlist ?? []).map((name) => name.toLowerCase()),
    );
  }
```

- [ ] **Step 4: Edit getQueries**

Add the import near the other imports at the top of the file:

```typescript
import { getGroupQueries } from "@/core/catalog/query-registry";
```

Replace `getQueries` (lines 79-100) with:

```typescript
  async getQueries(): Promise<Query[]> {
    // Registry is file-driven and already group-scoped (one file per group),
    // so the legacy source/allowlist filtering is no longer needed here.
    return getGroupQueries(this.groupId);
  }
```

- [ ] **Step 5: Run the new test + the execution suite**

Run: `npx vitest run src/__tests__/core/api-connector/query-service-registry.test.ts src/__tests__/core/api-connector/query-execution.test.ts`
Expected: PASS (new test passes; execution tests still green — they don't call getQueries).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (`this.sources`/`this.queryAllowlist` remain assigned; unused private fields are not errors. If tsc flags `groupId` unused, it is used in getQueries.)

- [ ] **Step 7: Commit**

```bash
git add services/engine/src/core/api-connector/query-service.ts services/engine/src/__tests__/core/api-connector/query-service-registry.test.ts
git commit -m "feat(engine): QueryService.getQueries reads file registry by group"
```

---

### Task 5: Thread groupId through catalog-service.fetchQueries

**Files:**

- Modify: `services/engine/src/core/catalog/catalog-service.ts` (`fetchQueries` ~164-172, `listQueries` ~48, `getQueryDetail` ~106)

- [ ] **Step 1: Edit fetchQueries signature + construction**

Replace `fetchQueries` (lines 164-172) with:

```typescript
  private async fetchQueries(
    groupId: string,
    apiBaseUrl?: string,
    sources?: string[],
    queryAllowlist?: string[],
  ): Promise<Query[]> {
    const apiClient = new ApiClient(apiBaseUrl);
    const queryService = new QueryService(
      apiClient,
      sources,
      queryAllowlist,
      groupId,
    );
    return queryService.getQueries();
  }
```

- [ ] **Step 2: Update the two callers**

In `listQueries` (line 48), change:

```typescript
const queries = await this.fetchQueries(apiBaseUrl, sources, queryAllowlist);
```

to:

```typescript
const queries = await this.fetchQueries(
  groupId,
  apiBaseUrl,
  sources,
  queryAllowlist,
);
```

In `getQueryDetail` (line 106), make the identical change (add `groupId,` as the first argument to `this.fetchQueries(...)`).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Run catalog tests**

Run: `npx vitest run src/__tests__/core/catalog`
Expected: PASS (the pre-existing `catalog-service.test.ts` failure noted in project memory may remain; no NEW failures).

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/core/catalog/catalog-service.ts
git commit -m "feat(engine): thread groupId through catalog fetchQueries"
```

---

### Task 6: Pass groupId from routes/queries.ts

**Files:**

- Modify: `services/engine/src/routes/queries.ts` (QueryService constructions ~13-16 and ~50-53; also the preview handler if it builds one)

- [ ] **Step 1: Update each `new QueryService(...)`**

In `services/engine/src/routes/queries.ts`, each place that constructs a `QueryService` (there are constructions in the `/queries/preview` and `/queries` handlers — both have `const groupId = (req.query.groupId as string) || "default";` in scope) must pass `groupId` as the 4th argument. For example, change:

```typescript
const queryService = new QueryService(
  apiClient,
  groupConfig.sources,
  groupConfig.queries,
);
```

to:

```typescript
const queryService = new QueryService(
  apiClient,
  groupConfig.sources,
  groupConfig.queries,
  groupId,
);
```

Apply to every `new QueryService(` in this file.

- [ ] **Step 2: Verify no other production construction sites lack groupId**

Run: `grep -rn "new QueryService(" services/engine/src --include=*.ts | grep -v __tests__`
Expected: only `catalog-service.ts` (Task 5, already passes groupId) and `routes/queries.ts` (now passes groupId).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add services/engine/src/routes/queries.ts
git commit -m "feat(engine): pass groupId to QueryService in queries routes"
```

---

### Task 7: Migration script + generate per-group files

**Files:**

- Create: `services/engine/src/scripts/migrate-queries-to-per-group.ts`

- [ ] **Step 1: Write the migration script**

Create `services/engine/src/scripts/migrate-queries-to-per-group.ts`:

```typescript
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
```

- [ ] **Step 2: Run the migration against the repo's data**

Run: `npx tsx src/scripts/migrate-queries-to-per-group.ts`
Expected: prints `Wrote per-group query files for 5 group(s): default, finance, engineering, analytics, hr_team`.

- [ ] **Step 3: Verify the generated files**

Run: `ls services/engine/data/queries/ && node -e "const f=require('./services/engine/data/queries/finance.json'); console.log('finance queries:', f.queries.map(q=>q.name))"`
(Run from repo root.)
Expected: files `default.json finance.json engineering.json analytics.json hr_team.json`; finance lists its 6 query names (`pnl_subledger`, `pnl_lineage`, `support_dashboard`, `process_stats_dashboard`, `daily_control_checkups`, `budget_vs_actual`).

- [ ] **Step 4: Commit the script (data files are gitignored — confirm)**

Run: `git status --short services/engine/data/queries/`
If the files show as untracked AND `services/engine/data` is gitignored (per project memory), they will not be committed — that is expected (data is runtime/NAS state). Commit only the script:

```bash
git add services/engine/src/scripts/migrate-queries-to-per-group.ts
git commit -m "feat(engine): add queries-to-per-group migration script"
```

---

### Task 8: Bridge — regenerate per-group files after admin writes

**Files:**

- Modify: `services/engine/src/routes/admin/queries.ts` (POST ~161, PATCH ~201, DELETE ~233 — after each `await writeDb(db);`)

- [ ] **Step 1: Add a sync helper and import**

In `services/engine/src/routes/admin/queries.ts`, add near the top imports:

```typescript
import { readFileSync } from "fs";
import { rebuildAllGroupFiles } from "@/core/catalog/query-registry";
```

Add this helper after `reloadMockApi` (~line 35):

```typescript
/**
 * Keep the per-group query files (the read source of truth) consistent with
 * db.json after an admin write. Bridge until the full per-group write path
 * (Plan 2) makes db.json unnecessary.
 */
function syncGroupQueryFiles(db: Record<string, unknown>): void {
  try {
    const groupsFile = JSON.parse(
      readFileSync(paths.config.groups, "utf-8"),
    ) as { groups: Record<string, { sources?: string[]; queries?: string[] }> };
    rebuildAllGroupFiles((db.queries as unknown[]) ?? [], groupsFile.groups);
  } catch (error) {
    logger.error({ error }, "Failed to sync per-group query files");
  }
}
```

- [ ] **Step 2: Call it after each write**

After each `await writeDb(db);` in the POST (upsert — both the update branch and the create branch), PATCH, and DELETE handlers, add:

```typescript
syncGroupQueryFiles(db);
```

(There are four `await writeDb(db);` sites: POST update branch ~141, POST create branch ~161, PATCH ~201, DELETE ~233. Add the call immediately after each.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Run the admin route tests**

Run: `npx vitest run src/__tests__/routes/admin`
Expected: PASS (no new failures).

- [ ] **Step 5: Commit**

```bash
git add services/engine/src/routes/admin/queries.ts
git commit -m "feat(engine): sync per-group query files on admin query writes"
```

---

### Task 9: Full suite + manual end-to-end verification

- [ ] **Step 1: Run the full engine suite**

Run (from `services/engine`): `npx vitest run`
Expected: all green except the single pre-existing `catalog-service.test.ts` failure documented in project memory. No other failures.

- [ ] **Step 2: Typecheck + lint touched files**

Run:

```bash
npx tsc --noEmit
npx eslint src/core/store/per-group-store.ts src/core/catalog/query-registry.ts src/core/api-connector/query-service.ts src/core/catalog/catalog-service.ts src/routes/queries.ts src/routes/admin/queries.ts src/scripts/migrate-queries-to-per-group.ts
```

Expected: 0 errors.

- [ ] **Step 3: Manual end-to-end — registry works with NO data API**

From repo root, ensure the migration has produced `services/engine/data/queries/*.json`, then start the engine + UI (`npm run dev`) with no data API reachable, and run:

```bash
curl -s "http://localhost:3001/api/queries?groupId=finance" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).queries?.length ?? JSON.parse(s)))"
```

Expected: a non-zero count (finance's queries), returned from the file with no `:8080` call. Confirm the engine log shows no `GET .../api/queries` HTTP attempt for the registry.

- [ ] **Step 4: Manual — chat "list queries"**

In the UI chat for a group, send `list queries`.
Expected: the group's query list renders (no "Unable to fetch available queries"). Executing a query still requires the data API (unchanged).

---

## Notes / follow-up (Plan 2 — out of scope here)

- Make per-group files the **sole** source of truth for writes: rewrite the engine `admin/queries` route + the Next `/api/admin/queries` route to write `DATA_DIR/queries/<groupId>.json` directly (group-scoped CRUD), remove `db.json` reads/writes and the `reloadMockApi()` ping, and drop the bridge from Task 8.
- Update UI write call sites to pass `groupId`: `src/app/admin/groups/[id]/page.tsx` (~845/856/890), `src/app/admin/connectors/file/page.tsx`, `src/app/admin/connectors/components/ConnectorDetailPage.tsx`. Decide how connector-originated queries map to a group.
- Optional: optimistic concurrency (`version`/If-Match) for query files.
- Migrate the other holdout config entities (`groups`, `settings`, `users`, `filter-config`) onto `PerGroupStore`.

```

```
