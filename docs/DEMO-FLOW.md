# CIO Demo — Rehearsal Script

Rehearse this end-to-end at least twice. Time the full run: target 12 minutes including transitions, leaving 18 minutes for Q&A in a 30-minute slot.

## Pre-demo checklist (30 min before)

- [ ] Boot services: `npm run dev` in one tab, `npm run svc:mock-api` in another. Engine on `:4001`, Next.js on `:3001`, mock-api on `:8080`.
- [ ] Run `npm run validate:demo`. Confirm 150+/150+ green.
- [ ] Pre-warm the engine — hit `/api/chat` once with `{text:"hello"}` against `default`, `finance`, `engineering`, `analytics` so first request in the demo isn't a 3–8s cold start.
- [ ] Close all terminal tabs that show logs.
- [ ] Close DevTools.
- [ ] Single browser window, single tab, signed in as admin.
- [ ] Have `docs/DEMO-VALIDATION.md` and `docs/NEXT-STEPS.md` open in separate tabs you can pivot to if asked.
- [ ] Phone on silent. Notifications muted.

## What you're showing

**The pitch in one sentence:** "We're replacing the BI-team middleware between Tableau and the people who actually need answers. Business users ask questions in their own words; admins teach the bot vocabulary instead of writing SQL."

## The flow

### Step 1 — A business user asks a question (2 min)

**Where:** main chat page (`/`)

| Type this                                             | Expect                                                | If it fails                          |
| ----------------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| Type `pnl` slowly (don't send)                        | Autocomplete dropdown above the input with matches    | Skip — type the full name            |
| `run pnl_lineage` (switch to **finance** group first) | 💡 auto-insights prefix + table of 93 rows            | Click "Skip filters" if form appears |
| `break it down by region`                             | "grouped by Region (3 groups, 93 total rows)" + table | Try `group by region` instead        |
| `for each feedname`                                   | "grouped by FeedName (6 groups…)"                     | Pre-recorded screenshot              |
| `what is driving the change`                          | Root cause: ranked contributors with shares           | Re-prime with `run pnl_lineage`      |
| `summarize`                                           | Stats panel: row count, column types, top values      | —                                    |
| `find outliers`                                       | Outlier detection result                              | —                                    |

**What to say while typing:**

> "Watch how this works. I'm asking the same questions I'd ask a data analyst — but in English, not SQL. The bot understands `break it down by`, `for each`, `per region` — operators don't need to memorize the column name `Region`."

> (when 💡 lines appear) "And notice this — the bot didn't wait to be asked. It surfaced that one product line drives 90% of the metric. That's proactive analytics, not just a chat box."

> (after `what is driving the change`) "The 'why' question is the one every business user asks and most BI tools can't answer. Here it ranks the actual contributors — no LLM, just rule-based math we can audit."

> (after `find outliers`) "We didn't write code for outlier detection per query. The platform ships statistical operations and they apply to whatever's loaded."

### Step 2 — The CIO question: "how does it know?" (2 min)

**Where:** `/admin/analytics`

Scroll to the "NLP misses" panel.

**What to say:**

> "Every interaction is logged. This panel shows us where the bot is failing. Top miss right now is `summarize` typed without a prior query — that's a known UX gap we'll fix by prompting `summarize what?` instead of failing silently. The point isn't that it's perfect; it's that we can SEE where it's not, and we close those gaps without code."

Numbers to point at: total interactions, miss rate, retry rate, top missed phrases.

### Step 3 — Operator teaches the bot (3 min)

**Where:** `/admin/synonyms`

1. Group selector → **finance**
2. Add: canonical = `customer`, synonyms = `client, account, buyer`
3. Click Add — entry appears
4. Type in "Preview synonym expansion" box: `show me by customer` — expansion preview renders
5. Go back to main chat (finance group), type: `show me by customer` — works against a customer column (or shows the synonym entry being used)

**What to say:**

> "Pretend `customer` was a word your finance team used internally but the column in your data is called `account_id`. Your admin can teach the bot this in 10 seconds — no engineer involved. This is the highest-leverage knob in the platform. Multiply this by ten business teams, each with their own vocabulary, and you eliminate the 'translate this for me' bottleneck."

### Step 4 — The learning loop (2 min)

**Where:** `/admin/learning`

1. **Review** tab — show 1-2 items in the queue (or "no items pending" if clean — that's fine, explain the flow)
2. If items exist: pick one, choose the correct intent from dropdown, click Resolve
3. Switch to **Auto-Learned** tab — show entries with `source: admin_review`
4. Click **Retrain** button at the top
5. Go back to chat, retype the resolved phrase — it now classifies correctly

**What to say:**

> "When confidence is borderline, the bot logs it for review instead of guessing wrong. An admin labels the correct intent here. Click Retrain, and the model picks it up. We just closed the loop from `user confusion → corrected training → smarter bot` in 30 seconds."

> "The alternative is filing a ticket with engineering, waiting two weeks for a model retrain. Here, the business team is in the loop."

### Step 5 — Trust signals (2 min)

**Where:** `/admin/audit`

Scroll through recent entries. Point to: `action=create resource=synonym` (your edit from Step 3), `action=update resource=learning-retrain`, `action=execute resource=query`.

**What to say:**

> "Every mutation — every synonym add, every approved learning, every query that ran — is in an audit trail. Compliance, your security team, and your data owners all get the answer to 'who did what when' for free."

Then briefly mention but don't open:

- `/admin/users` — RBAC roles (admin, builder, viewer)
- `/admin/data-roles` — row/column gating per role
- `/admin/anomaly` — auto-detect of metric spikes
- `/admin/schedules` — recurring queries with email/Slack alerts

### Step 5b — The dashboard surface (optional, 90 sec)

**Where:** `/data-explorer`

1. Pick a **finance** source (e.g. `pnl_lineage`).
2. Wait ~1s for the layout to render. Point out:
   - **💡 Auto-insights strip** above the filter bar — same engine that powered the chat 💡 lines.
   - **KPI tiles** with `↑ / ↓` trend pills and a **"show forecast"** toggle that opens an inline sparkline.
   - **Data Quality** card (lower row) — duplicates / missing % / schema drift / anomaly count in one severity-coded glance.
   - The **"Recent"** pill in the source picker if you've used this source before.

**What to say:**

> "This isn't a separate tool — it's the same engine driving the chat, just laid out as a dashboard. Same anomaly model, same auto-insights, same forecast math. One ML stack, two surfaces."

### Step 6 — The close (1 min)

Switch back to the chat. Stay there. Wait for questions.

**What to say:**

> "We've shown five things: natural-language queries, follow-ups in chat, the analytics that show us where the bot fails, the operator workflow that fixes those gaps without code, and the audit trail underneath all of it. The pilot we're proposing is six weeks against [team] with [N] queries. Open question I have for you: what would make this a yes?"

## If something breaks live

| Symptom                                  | Recovery                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chat returns "I don't understand"        | "That's actually the safety net — we'd rather say nothing than guess wrong. Let me try a slightly different phrasing." (Then use a phrase from your pre-rehearsed list.) |
| Page returns 500 / blank                 | "I'm running this on my laptop — the production instance is dual-redundant. Let me switch to the pre-recorded walkthrough." (Have a Loom recording on standby.)          |
| Engine crashes (all chat returns 502)    | Open the validation report tab. "Here's our last green smoke pass — 76 checks, all healthy as of [time]. Let me reset and continue."                                     |
| Synonym add returns CSRF error           | Refresh the page — usually a stale session. If not, skip Step 3 and lean harder on Step 4.                                                                               |
| CIO asks about a feature you didn't demo | "Let me come back to that in Q&A if you don't mind — I want to finish showing the loop." Don't improvise inside a feature surface you haven't rehearsed.                 |

## Hard skips (don't open these)

- The terminal where the engine is running
- DevTools / Network tab / Console
- The git log
- `/admin/test-console` (looks like an engineer's tool, not a product)
- `/admin/connectors/csv` if you don't have the connector configured
- `/admin/anomaly` rebuild-baselines screen (mid-build per NEXT-STEPS P1.4)
- `/admin/guides/*` (these are end-user docs, distracting in a CIO context)
- Anything under `/gridboard`

## Pre-baked answers for likely questions

**"What's the TCO compared to Tableau?"**

> "Tableau is roughly $70/seat/month on Creator, $35 on Explorer. At 200 seats that's $84k/year just in licensing. Our platform is one Node service — call it $5k/year on a t3.medium. The savings story is the seat-license elimination plus the 0.5–1 FTE you don't need on a BI-team backlog."

**"How long to pilot?"**

> "Six weeks. Week 1 — connect to one data source, define 10 queries. Week 2 — load corpus, set up RBAC. Week 3 — five-user closed beta with [team]. Weeks 4–5 — gather corrections, retrain twice a week. Week 6 — review with you, decide go/no-go for wider rollout."

**"What about hallucinations / wrong answers?"**

> "We don't use LLMs. The system runs three classifiers — NLP.js, TF-IDF, and pattern matching — and votes. When it's confident, it answers. When it's borderline, it shows 'Did you mean…?' chips. When it's not confident, it says 'I don't understand' instead of guessing. We can show you the disambiguation band right now if you want."

**"What about PII / GDPR / data residency?"**

> "All processing is on your infrastructure. The engine reads from your data sources, holds query results in memory per session, writes audit + learning logs to disk under your control. We have a data flow diagram and a session-data retention setting; happy to walk through after this."

**"How does it scale?"**

> "The engine is stateless except for the session store, which can move to Redis. We've architected for horizontal scale; haven't proven it past one node since the load profile in pilot is ~50 queries/min."

**"Who's behind this?"**

> [Your honest answer here. CIOs want to know if they're betting on a person or a team. Don't overclaim.]

## Post-demo

- [ ] Send `docs/NEXT-STEPS.md` (clean up first — strip the "Owner: 1 backend dev" lines, they sound like a one-person operation)
- [ ] Send `docs/DEMO-VALIDATION.md` as the "what's working today" evidence sheet
- [ ] Don't send anything that mentions localhost, mock-api, or `tests/` directories
- [ ] Within 24 hours, send a one-page pilot proposal with: scope, team, timeline, success criteria, your ask

## What you should NOT promise

- "We can do that next week" — for anything you haven't shipped before
- An on-prem deployment date — until you've actually run the deployment once
- A specific LLM integration — until you know the org's posture on third-party model providers
- A specific number of concurrent users — until you've load-tested
