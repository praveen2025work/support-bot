# Next Steps to Improve the App

Authored 2026-05-11; live-updated 2026-05-13. Drives the post-pilot roadmap
after the B-1/B-2/B-3/B-4 productionization merge and the WIP data-roles +
admin-proxy refactor.

Ordering is roughly P0 → P3. Items inside each tier are unordered.

---

## ✅ Shipped since 2026-05-11

These were on the wishlist or not even listed; they're done now and live on `main`.

**Proactive analytics (Packages A / B / C — completed 2026-05-13):**

- Auto-insights stream (`💡 ...`) on chat results and Data Explorer dashboards — top-mover + concentration findings, capped at 3 per response.
- Change narratives — `FYI **X** is up 12% vs. 5 min ago` lines computed against the prior anomaly snapshot.
- **Root cause analysis** — chat handler for `"why did X change"` / `"what is driving Y"`; returns ranked contributors by share of total (or by delta when a baseline exists). New intent `analysis.root_cause` + 23 corpus utterances.
- **Data Explorer Quality card** — single GET `/api/data/quality/:queryName` rolls duplicates + missing % + schema drift + anomaly count into one 4-tile card with severity-coded borders.
- **KPI trend badges** — `↑ 12.3%` / `↓ 8.1%` pills on every KPI tile when a date column exists and ≥ 8 rows. Pure client compute.
- **KPI on-demand forecast** — toggleable inline SVG sparkline per KPI (historical solid, predicted dashed). Lazy-fetched from `/api/data/forecast/:queryName` (exponential smoothing).
- **Type-ahead autocomplete in chat** — dropdown above ChatInput hitting `/api/queries/search`. Tab to insert, Esc to dismiss, suppressed when input looks like a follow-up.
- **Click-through search learning** — `POST /api/queries/search/pick` records (user, query, picked) with 14-day half-life decay; subsequent searches re-rank per user. No cross-user leak.
- **Data Explorer source reorder** — most-viewed sources for the current user bubble to the top with a "Recent" pill. Shares the same `interaction-tracker` file the chat path writes, so chat and dashboard usage histories unify.

**Identity & RBAC:**

- Per-group business glossary at `/admin/glossary` (formal metric definitions, aliases, formulas, examples).
- Passthrough Windows auth for `/api/userinfo` — forwards Authorization / Cookie / X-Forwarded-User / X-IIS-User / X-Remote-User / Remote-User / X-User-Principal-Name to the upstream AD endpoint. `USER_INFO_DEV_OVERRIDE_SAM` for local dev. UserInfo type extended to the full AD shape.
- Admin role lookup falls through samAccountName → userName → emailAddress (vs. just samAccountName).

**UX polish:**

- Toast notifications moved to **top-right** consistently across screens (was bottom-right).
- Real-user identity strings scrubbed from docs/comments/env-examples; only generic placeholders remain in the tree.

**Validation harness:** 128 → 152 checks. CI gate still green on every PR.

## P0 — Stabilize the baseline (one-week unblock)

These are pre-existing breakages already on `main`. They don't break the dev
flow, but they hide real regressions and make any future CI green-gate
impossible. Knock them out before adding features.

### 0.1 Engine TypeScript errors (10 across 6 files)

- `src/__tests__/core/catalog/catalog-service.test.ts` — `mockResolvedValue` on `never`; missing type cast on the mock.
- `src/core/api-connector/query-service.ts` — two Buffer-vs-string issues on the file-read path (`fs.readFileSync` with no encoding returns `Buffer`).
- `src/core/response/handlers/query-handler.ts` — `query_filter_form` missing from the response-type union; add the literal or widen the union.
- `src/lib/data-role-filter.ts` — `allowedRoles` not declared on the `QuerySource` schema; schema needs the field.
- `src/routes/upload.ts` — `pdf-parse` 2.x export shape changed; import via `pdf-parse/lib/pdf-parse`.
- `src/routes/workflows.ts` — `type` should be the union literal not `string`.

Owner: 1 backend dev, ~2 hours.
Gate: `cd services/engine && npx tsc --noEmit` exits 0.

### 0.2 NLP disambiguation test suite — 7 failures

`src/__tests__/core/nlp/disambiguation.test.ts` references the old
ensemble threshold (0.65). Commit `18938ba` lowered it to 0.5; the
disambiguation band `[0.4, 0.6)` is now squeezed and several test
fixtures fall on the wrong side of the threshold.

Decisions needed:

- Are these tests asserting **product behavior** (questions should disambiguate when confidence is borderline) or **band math** (the band is literally [0.4, 0.6))? If product, re-tune fixtures and the band together. If band math, just shift fixture confidence values.

Owner: 1 NLP dev, half day.
Gate: `npx vitest run src/__tests__/core/nlp/disambiguation.test.ts` exits 0.

### 0.3 Runtime-data drift on every engine run

`.gitignore` says ignore `services/engine/data/learning/**/*.jsonl` and
`anomaly/**/{history,snapshots}.jsonl`, but 16 JSONL files are still in
the index and dirty every dev tree. Same for `data/watch/<group>/rules.json`
which is rewritten on read (formatting + `lastCheckedAt`).

Action:

- `git rm --cached` the 16 tracked JSONLs (matches existing gitignore intent).
- Decide: is `watch/<group>/rules.json` seed-data-with-runtime-fields, or runtime-only? If both, split: `rules.json` (seed, tracked) + `rules-state.json` (runtime, ignored). Today it's both.
- Add `data/watch/**/*-state.json` (or whatever name we pick) to gitignore.

Owner: 1 backend dev, 1 hour + a follow-up audit.
Gate: clean `git status` after `npm --prefix services/engine run dev` followed by any query.

### 0.4 CI green-gate

Today nothing fails CI when a dev pushes broken types or tests. Once 0.1/0.2 land, add a GitHub Action that runs:

- `npm run lint:all`
- `npx tsc --noEmit` at the repo root
- `cd services/engine && npx tsc --noEmit && npx vitest run`
- `cd services/mock-api && (smoke check if exists)`

Set required for `main`. No more "passed locally, failed on prod build".

Owner: 1 platform dev, half day.

---

## P1 — Pilot-readiness gaps (next 2 weeks)

### 1.1 Restart-after-tweak loop is brittle

Yesterday's symptom: "previously all the listed queries used to work,
either we need to fix the data or remove not needed queries".
Root cause is two-fold:

- Mock-API catalog and corpus drift independently — a corpus query can ship without a catalog entry (we already added `e56d8a4` and `0be7cf9` to soften this).
- Lower NLP threshold (0.5) lets more queries match but the suggestion chips on the landing page still list aspirational queries.

Action:

- Add a startup sanity check: every `query.execute` query in the corpus must have a matching catalog entry; otherwise log warn, exclude from suggestion chips, and gate from disambiguation candidates.
- Move the curated landing-page chip list into one config file so we don't have aspirational + real query lists out of sync in two places.

Owner: 1 backend dev, 1 day.

### 1.2 Admin UI surface for the new proxy

The Next.js admin routes now proxy to the engine — but the admin UI
hasn't been updated to surface the new resources:

- `/api/admin/groups/:groupId/synonyms` (per-group synonym CRUD)
- `/api/admin/data-roles` (data-role registry)
- `/api/admin/file-sources`, `/anomaly`, `/schedules`, `/audit` are
  reachable but have no UI affordance.

Action:

- One screen per admin resource. Don't go fancy — table + row editor + create-new modal.
- Show audit entries on the existing settings page, sorted by recent.

Owner: 1 frontend dev, 3 days (1 day per resource of any complexity).

### 1.3 Disambiguation UX is text-only

B-2 added "Did you mean?" disambiguation (commit `a12ea33`) but the
chips render as plain text. Borderline cases (the disambig band) are
where users learn the system — visual signal matters.

Action:

- Add a confidence-percent badge on each chip.
- Add "this is a new query" affordance that opens an admin → intents editor with the user's utterance pre-filled (round-trip from user error → intent registered → corpus retrained).

Owner: 1 frontend dev, 2 days.

### 1.4 Engine restart story

We currently `kill -9` on port 4001 in `predev`. That's fine for one
dev. For pilots it eats in-flight requests. Add:

- `/api/health/ready` and `/api/health/live` (live = process up, ready = DBs/files OK).
- Graceful shutdown handler that drains for ~5s on SIGTERM.

Owner: 1 backend dev, half day.

---

## P2 — NLP quality (one-month arc)

### 2.1 Learning loop closes the right loop

B-2's correction-on-click loop (commit `418923b`) writes interaction
data to `learning/<group>/interactions.jsonl`. But:

- The engine doesn't actually retrain on this data — we just log it.
- The `auto-learned.jsonl` file is read into the corpus on boot only.

Action:

- Build a nightly retrain job: read `interactions.jsonl` since last run, weight by correction signal, append high-confidence corrections to `auto-learned.jsonl`.
- Surface "X new training utterances pending review" in the admin UI, with an approve/reject affordance before the corpus update.

Owner: 1 NLP dev, 1 week.

### 2.2 Per-group synonyms wired end-to-end

We just landed group-aware synonym expansion in `FuzzyMatcher` and
mounted the admin route. Next:

- Surface a synonym editor in the admin UI.
- Add a "test phrase" box that runs the current synonym set against the NLP pipeline and shows the score so admins see immediate feedback.
- Cap synonyms-per-canonical at ~25 to keep Fuse index size bounded.

Owner: 1 frontend dev + 1 NLP dev, 3 days.

### 2.3 Threshold calibration is one-shot, should be continuous

`tests/nlp/threshold-calibration-results.md` is a single-run snapshot. We re-tune by re-running the script.

Action:

- Run the calibration script weekly against a frozen test set that grows with new aspirational queries.
- Surface a chart in the admin UI ("calibration drift over time"). If drift > X, post a Slack message.

Owner: 1 NLP dev, 2 days.

---

## P3 — Adoption + Observability (parallel to P2)

### 3.1 Per-group analytics

We have audit logging on admin mutations. We don't have:

- Per-group query volume.
- Top-failing queries (NLP confidence < 0.5 in the past 24h).
- Retry rate (user re-asks the same thing within N seconds).

Action:

- Build a `/admin/analytics` dashboard pulling from `interactions.jsonl` + `audit.jsonl`.
- Add CSV export so a finance admin can hand it to their VP.

Owner: 1 fullstack dev, 4 days.

### 3.2 Onboarding-new-group flow

Right now, adding a new group means hand-editing:

- `services/engine/data/groups.json`
- A FAQ file under `src/training/groups/`
- Optional corpus override

We have an Onboard module under `src/lib/onboard/` that's half-built.

Action:

- Finish the onboarding wizard: name the group → pick from query templates → fill in API base URL → smoke-test 3 queries.
- Should land in admin UI, not as a CLI.

Owner: 1 fullstack dev, 1 week.

### 3.3 Production observability

Logs go to stdout via pino-pretty. That's fine for dev.

Action:

- Add structured log shipping (whatever the hosting target is — `vercel logs` integration, or a Loki sink if self-hosted).
- Define 5 RED-style metrics: req-rate, error-rate, latency p50/p95/p99, NLP-miss-rate, query-success-rate. Surface in `/admin/analytics`.

Owner: 1 platform dev, 3 days.

---

## Out of scope (deliberately deferred)

- **LLM-assisted intent ranking.** The current TF-IDF + NLP.js ensemble is good enough for finance/default and ~25 queries per group. We've talked about an LLM re-ranker; revisit only if the user-survey shows the pipeline is the bottleneck, not the corpus or the UX.
- **Multi-tenant DB swap.** Today the engine reads/writes JSON + JSONL on disk. That's fine for small pilots. The migration to Postgres lives in `services/engine/data/...` shape; pin it to ~100 active users.
- **Mobile app.** Web + widget is enough through pilot.

---

## Carryover signals — things to watch this week

- The 4 commits just landed (`refactor(admin-api)` → `feat(nlp)` → `feat(admin-api)` mount → `test(session-manager)`) should be smoke-tested against the real admin UI before the next PR lands.
- If the admin UI hits the new proxy routes and any field is missing, the engine-side route is the place to add it — not the Next.js shim.
- Anomaly directory `services/engine/data/anomaly/` showed up untracked; baselines should land per group, snapshot JSONLs should stay gitignored (already are).
