# Monorepo restructure → `apps/` + `packages/`

Goal: every app in its own top-level folder, each **independently buildable & deployable**
with no dependency on the repo root.

## Target layout

```
Chatbot/
├── apps/
│   ├── web/                 # the Next.js UI (was repo root)
│   ├── engine/              # was services/engine
│   ├── mock-api/            # was services/mock-api
│   ├── mssql-connector/     # was services/mssql-connector
│   ├── oracle-connector/    # was services/oracle-connector
│   └── csv-xlsx-connector/  # was services/csv-xlsx-connector
├── packages/
│   └── sql-connector/       # canonical shared SQL router (was services/shared/sql-connector)
├── docker-compose*.yml
├── nginx.conf  web.config  docs/
```

Decisions (confirmed with user):

- Layout: `apps/` (deployables) + `packages/` (shared).
- Dependencies: **self-contained per app** — each keeps its own `package.json`/lockfile/Dockerfile.
  Shared SQL router is **vendored** (committed copy) into each connector so its Docker build
  context is just its own folder; `packages/sql-connector` is the canonical source + sync script.

## Phases & status

- [x] **P1 Backends + connectors** — DONE & verified: engine, mock-api, 3 connectors → `apps/`; shared → `packages/sql-connector`;
      vendored router into mssql/oracle (`@/shared/connectors-router`, rootDir→src); per-connector self-contained Dockerfiles;
      `scripts/sync-shared.mjs`. All 3 connectors + engine typecheck + esbuild-build green.
- [x] **P2 UI** — DONE: root Next app → `apps/web` (src, public, data, configs, Dockerfile, storybook);
      split root `package.json` → `apps/web/package.json` (UI) + slim orchestration root; per-app jest configs;
      UI tests → `apps/web/tests`, engine jest tests → `apps/engine/tests` (imports repointed); fixed 2 API
      routes' engine-path fallback (`../engine`); deleted dead `src/lib/env-config.ts` shim; scoped Vitest to `src/`.
- [x] **P3 Orchestration** — DONE: all 4 compose build contexts → `apps/*`; `prepare-out.mjs`, `validate.mjs`,
      CI (`ci.yml`, per-app working dirs), `.gitignore`/`.prettierignore`/UI `.dockerignore` repointed;
      in-app setup guides + comments swept `services/* → apps/*`. nginx/web.config unaffected (forward to :3001).
- [x] **P4 Verify** — DONE: apps/web `next build` ✓ (standalone); web jest 115✓; engine vitest 251✓ +
      jest integration 196✓; all 3 connectors + engine esbuild ✓; `docker compose config` ✓ on all 4 files;
      `sync:shared` ✓. Real connector image build: see verification log.

## Result

All apps are independent top-level folders, each with its own `package.json` + lockfile + Dockerfile and
buildable/deployable on its own:

- `docker compose -f docker-compose.no-mock.yml build engine` — engine only
- `docker compose -f docker-compose.no-mock.yml build mssql-connector` — one connector only
- `docker build -t web apps/web` — UI only
  History preserved via `git mv` (783 renames). Branch: `refactor/monorepo-apps-layout`.
