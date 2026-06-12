# @chatbot/sql-connector

Canonical source of the shared SQL connector router used by the MSSQL and Oracle
connectors.

To keep each connector **self-contained and independently buildable**, the router
is **vendored** (a committed copy) into each connector under
`apps/<name>-connector/src/shared/connectors-router.ts` rather than imported across
folders.

## Editing

1. Edit `connectors-router.ts` here (the canonical copy).
2. Run `npm run sync:shared` (or `node scripts/sync-shared.mjs`) from the repo root
   to push the change into every connector.

The vendored copies carry a banner and should never be edited directly.
