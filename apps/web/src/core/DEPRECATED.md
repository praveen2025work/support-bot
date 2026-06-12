# DEPRECATED — Most of this directory was removed

The Next.js app no longer ships its own embedded engine. All `/api/*` routes
proxy to the Engine service (default `http://localhost:4001`). The duplicated
`src/core/`, `src/adapters/`, `src/lib/singleton.ts`, and the corpus generator
were removed in this commit. The canonical engine code lives under
`apps/engine/src/`.

## Why this directory still exists

`src/core/response/templates.ts` survives because the **alive** route at
`src/app/api/admin/templates/route.ts` parses it as a text file at runtime
(see `readFileSync(TEMPLATES_PATH, 'utf-8')`) — it does not import it as a
module. Until that admin route is migrated to proxy to the engine, this file
must stay in place.

## What was removed

- `src/core/engine.ts`, `src/core/types.ts`, `src/core/constants.ts`
- `src/core/api-connector/` (entire directory)
- `src/core/nlp/` (entire directory)
- `src/core/session/` (entire directory)
- `src/core/response/handlers/` (entire directory)
- `src/core/response/response-generator.ts`, `src/core/response/constants.ts`
- `src/adapters/` (entire directory)
- `src/lib/singleton.ts`
- `src/lib/onboard/onboard-service.ts`, `src/lib/onboard/corpus-generator.ts`
- `src/training/groups/`, `src/training/faq.json`
- `src/config/group-config.ts`

## What remains alive (and why)

- `src/core/response/templates.ts` — text-parsed at runtime by the admin
  templates route.
- `src/training/corpus.json` — read by `src/app/api/admin/intents/route.ts`
  and `entities/route.ts` for admin CRUD.
- `src/config/{groups,users,data-roles,filter-config,settings}.json` — read
  and written by the corresponding `src/app/api/admin/*` routes.
- `src/lib/onboard/{excel-parser,template-generator,schemas}.ts` — used by
  `src/app/api/onboard/{route,template/route}.ts` to parse uploaded Excel
  files (the upload itself is then proxied to the engine for execution).

## Follow-up TODO

Migrate the admin routes that read these surviving files at runtime
(templates, intents, entities, settings, users, data-roles, filter-config)
to proxy to the engine instead. Once that lands, every file in this
directory and the surviving JSON configs can be removed and the duplication
eliminated permanently. See the eng-review TODOs in the design doc.
