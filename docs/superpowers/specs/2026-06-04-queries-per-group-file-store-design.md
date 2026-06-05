# Queries as a per-group file store ("DB without DB", phase 1)

**Date:** 2026-06-04
**Status:** Approved (design) — pending implementation plan
**Branch:** `feat/queries-per-group-store`

## Problem

The chat command **"list queries"** fails with _"Unable to fetch available queries. Please try again later."_ Root cause: the query **registry** (the list of available query definitions) is fetched over **HTTP** from the data API. Every registry reader funnels through one method, `QueryService.getQueries()` (`services/engine/src/core/api-connector/query-service.ts:79-83`), which calls `this.apiClient.get("queries")` → `GET {API_BASE_URL}/api/queries`. In the current environment `API_BASE_URL` (`:8080`) points at an unrelated container, so the fetch 404s and the registry is unavailable.

More broadly, this violates the intended architecture: **application config (including query definitions) must be driven from JSON files, loaded at app start, and updatable from one or more instances. The data API (mock or real) must be used _only_ to execute a query and fetch its data rows — never to obtain the query registry.**

## Current storage landscape

Most per-group entities already follow a one-file-per-group convention under `DATA_DIR` (see `services/engine/src/lib/env-config.ts` `paths`): learning data, glossary, schema registry, indexes, anomaly, watch rules/alerts, workflows, gridboard-views, training corpus/faq.

Holdouts still on a single shared file: `groups.json`, `settings.json`, `users.json`, `filter-config.json`, and **queries** (worst case — in the mock's `db.json`, served over HTTP).

This spec finishes the convention for **queries** and establishes a **reusable per-group file-store layer** that the other holdout entities will adopt in later sub-projects.

## Decisions (from brainstorming)

1. **Sequencing:** Queries first; build a reusable per-group store, apply it to queries, then roll the pattern to other entities in follow-up sub-projects.
2. **Ownership:** **Pure per-group ownership** — each group's query file is self-contained. Shared queries are duplicated into each group's file and may diverge independently.
3. **Location:** `DATA_DIR/queries/<groupId>.json` (matches the mutable, NAS-shared, runtime-editable per-group entities like `workflows`/`gridboard-views`).
4. **Concurrency:** **Atomic writes** (`<file>.tmp.<pid>` → `rename`) + **mtime-based read reload**, **last-write-wins**. (Optimistic `version`/If-Match deferred.)

## Architecture & components

### (a) `PerGroupStore<T>` — `services/engine/src/core/store/per-group-store.ts`

The reusable "DB without DB" primitive:

- `read(groupId): T` — read + Zod-validate the group's file; in-memory cache keyed by file path, **reloaded only when the file mtime changes** (picks up writes from any instance); missing file → `defaultValue()`.
- `write(groupId, value): T` — validate, then **atomic write** (temp file then `rename`); refresh cache.
- `list(): string[]` — group ids that have a file (readdir of `dir`).
- `invalidate(groupId?): void` — drop one or all cache entries.
- Constructed with `{ dir, fileFor(groupId), schema, defaultValue() }`.

Resilience: corrupt/invalid JSON → log error, return last-good cache if present else `defaultValue()`; never throw on read.

### (b) `query-registry.ts` — `services/engine/src/core/catalog/query-registry.ts`

Built on `PerGroupStore`:

- File: `DATA_DIR/queries/<groupId>.json`, shape `{ "queries": Query[] }`, validated with the existing `QuerySchema` (`core/api-connector/types.ts`).
- `getGroupQueries(groupId): Query[]`
- `upsertQuery(groupId, query): Query`
- `deleteQuery(groupId, id): void`
- `invalidate(groupId?): void`

### (c) Redirect the chokepoint — `QueryService`

- Add an optional `groupId` to the `QueryService` constructor (default `"default"`).
- `getQueries()` returns `queryRegistry.getGroupQueries(this.groupId)` instead of `apiClient.get("queries")`. The source/allowlist filter is dropped — each file already _is_ the group's exact set.
- `catalog-service.fetchQueries` threads `groupId` through (it is already a parameter of `listQueries`/`search`).
- `routes/queries.ts` already has `groupId` in scope at construction.

### (d) Execution unchanged

`executeApiQuery` / `executeCsvQuery` / `executeDocumentQuery` / `executeCombinedQuery` are untouched. They read the query's `endpoint`/`baseUrl`/`type` and call `ApiClient` (or read files) exactly as today. The data API is hit **only** to run a query.

## Data flow

- **List/search/catalog/NLP** (group G): `engine(G) → QueryService.getQueries() → queryRegistry.getGroupQueries(G) → PerGroupStore.read(G) → DATA_DIR/queries/G.json`. No HTTP.
- **Execute** (group G, query Q): look up Q in G's file → `executeApiQuery` uses `Q.endpoint`/`Q.baseUrl` → `ApiClient` → data API. HTTP only here.
- **Admin edit** (group G): admin route → `queryRegistry.upsert/delete(G)` → `PerGroupStore.write(G)` (atomic) → `invalidate(G)`. Other instances pick it up on next read via mtime.

## Admin CRUD (`routes/admin/queries.ts`, rewritten group-scoped)

- `GET /api/admin/queries?groupId=G[&source=...]` → `queryRegistry.getGroupQueries(G)` (optional `source` filter retained for UI).
- `POST` (upsert) / `PATCH` / `DELETE` → operate on `DATA_DIR/queries/G.json` via the store. Keep per-group id generation (`q<N>`), Zod validation, and audit logging. Remove the `db.json` read/write and the `reloadMockApi()` ping.
- `POST /api/admin/queries/cache/clear` → `queryRegistry.invalidate()`.
- Unknown group on write → 404 (mirrors `admin/groups`).

## Migration

One-time, idempotent script `scripts/migrate/queries-to-per-group.mjs`:

1. Read `db.json` `queries[]` and `groups.json`.
2. For each group, compute its query set with the **current visibility rule** — name ∈ `group.queries[]` **OR** `query.source` ∈ `group.sources[]` — to guarantee behavior parity.
3. Write `DATA_DIR/queries/<groupId>.json = { queries: [...full defs...] }`, duplicating shared queries into each group's file.
4. `db.json` keeps its **data tables** (mock still serves rows for execution in dev). Its now-unused `queries[]` is left in place, marked deprecated; the engine no longer reads it.

Run as part of the change so the 5 current groups have files. Re-running regenerates safely.

## Error handling

- Missing group file → empty set `{ queries: [] }`, logged at debug (new group, no queries yet). No 404 storm.
- Corrupt/invalid JSON → log error, serve last-good cache if present else empty; never crash.
- Write → Zod-validate before write; atomic temp→rename (no partial files); failure → 500 with a clear message.
- Unknown group on write → 404.

## Testing (TDD, vitest)

- **PerGroupStore:** read parses+validates; caches by mtime (no re-read when unchanged); reloads on mtime bump; atomic write round-trips; `list()`; missing→default; corrupt→last-good/empty without throwing.
- **query-registry:** getGroupQueries/upsert/delete/invalidate against a temp `DATA_DIR`.
- **QueryService.getQueries:** returns the group's file contents and does **not** call `ApiClient.get("queries")` (spy asserts no HTTP).
- **admin/queries route:** per-group CRUD writes the correct file; GET returns the group's set.
- **migration:** sample `db.json` + `groups.json` → correct per-group files matching current visibility.
- **execution:** existing `query-execution.test.ts` remains green (execution path untouched).

## Out of scope (future sub-projects, each its own spec)

- Migrating `groups.json`, `settings.json`, `users.json`, `filter-config.json` to the per-group store.
- Optimistic concurrency (`version`/If-Match) for queries.
- Removing the mock's `queries[]` / any mock-api changes.

## Verification

After implementation: restart the engine with **no data API reachable** and confirm chat "list queries" returns each group's list from its file; confirm executing a query still requires the data API (mock or real).
