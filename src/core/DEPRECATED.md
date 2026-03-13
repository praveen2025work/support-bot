# DEPRECATED — No Longer Used at Runtime

The files in `src/core/`, `src/adapters/`, `src/config/`, and `src/lib/singleton.ts` are
no longer imported by any Next.js API route. All API routes now proxy to the Engine service
(default `http://localhost:4000`).

These files remain in the repository temporarily to avoid a large breaking deletion.
They will be removed in a future cleanup once the proxy-only architecture is confirmed stable.

If you need to make changes to engine logic, edit the canonical copies under
`services/engine/src/`.
