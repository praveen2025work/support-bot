# CI / CD

Three GitHub Actions workflows under `.github/workflows/`. The repo is a monorepo
(`apps/*` are self-contained apps with their own `package.json`/lockfile/Dockerfile),
so every pipeline is **per-app** via a matrix.

## CI — `ci.yml`

Runs on every push to `main`/`develop` and every PR to `main`.

| Job | Runner | What it checks |
| --- | --- | --- |
| `web` | ubuntu | `apps/web`: eslint + `tsc --noEmit` + jest |
| `build` | ubuntu | `apps/web`: production `next build` |
| `engine` | ubuntu | `apps/engine`: `tsc --noEmit` + vitest (unit) + jest (integration) |
| `engine-tests-typecheck` | ubuntu | typechecks the engine integration tests (`tsconfig.tests.json`) |
| `validation-harness` | ubuntu | boots mock-api + engine + UI, runs `scripts/demo/validate.mjs` |

## CD · Docker — `cd-docker.yml`

Runs on push to `main` and on manual dispatch. **Build-only** — confirms each
app's image builds from its own self-contained context (`apps/<app>`), with a
Buildx GHA layer cache. No registry push.

Images: `web`, `engine`, `mssql-connector`, `oracle-connector`, `csv-xlsx-connector`
(mock-api has no Dockerfile — it runs from a base node image in `docker-compose.full.yml`).

> To publish later: add `docker/login-action` + set `push: true` and a `tags:` with
> your registry (e.g. `ghcr.io/<owner>/chatbot-<app>`).

## CD · Windows — `cd-windows.yml`

Runs on push to `main` and on manual dispatch. **Build-verify only** — runs
`npm ci && npm run build` for each app on `windows-latest`, confirming the apps
build on Windows (they deploy on Windows Server / IIS via `web.config`). No
artifact, no deploy.

## Running a workflow manually

GitHub → **Actions** → pick the workflow → **Run workflow** (both CD workflows have
`workflow_dispatch` enabled).
