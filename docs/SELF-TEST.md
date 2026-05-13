# Self-Test Playbook — Recent Additions

A walk-through for verifying every feature shipped since 2026-05-11 (the
Package A / B / C cycle plus the glossary / autocomplete / userinfo
work).

Two modes:

- **Visual** — click through in the browser. Best for "does it look right".
- **Curl** — copy/paste smoke commands. Best for "does it work without me".

Each section ends with the **single harness invocation** that proves
the same thing automatically — useful if you'd rather run one command.

---

## 0. Pre-flight

```bash
# Make sure the three services are up
curl -sS -o /dev/null -w "engine %{http_code}\n" http://localhost:4001/api/health/ready
curl -sS -o /dev/null -w "ui     %{http_code}\n" http://localhost:3001
curl -sS -o /dev/null -w "mock   %{http_code}\n" http://localhost:8080/

# Should print: engine 200, ui 200, mock 200
```

If anything's not running:

```bash
# All three at once
npm run dev:mock
```

The single command that asserts every shipped feature is healthy:

```bash
npm run validate:demo
# Look for "Total: 15X  Passed: 15X  Failed: 0"
```

The rest of this doc unpacks what each section is verifying.

---

## 1. Chat — root cause analysis

**What it does:** Type `"why did X drop"` / `"what is driving Y"` /
`"explain the change"` after running any query — the bot ranks the top
contributors (dimension + value + share of total) of the active result.

### Visual

1. `http://localhost:3001/` → switch to **Finance** group.
2. Send: `run pnl_lineage`
3. After the table loads, send: `what is driving the change`
4. Expect a response like:

   ```
   **Complete** (fobo_status) drives 92% of **DurationMax** (473.80 of 513.25).

   Top contributors:
   1. **Complete** (fobo_status) — 92% of DurationMax
   2. **Y** (feed_on_time) — 62% of DurationMax
   3. **N** (delay_flag) — 60% of DurationMax
   ```

### Curl

```bash
SID=rca-$(date +%s)
# Prime the context
curl -sS -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" -H "x-user-role: admin" \
  -d "{\"text\":\"run pnl_lineage\",\"sessionId\":\"$SID\",\"groupId\":\"finance\",\"explicitFilters\":{}}" \
  > /dev/null

# Ask why
curl -sS -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" -H "x-user-role: admin" \
  -d "{\"text\":\"what is driving the change\",\"sessionId\":\"$SID\",\"groupId\":\"finance\"}" \
  | python3 -m json.tool | head -20
```

Expect `"intent": "analysis.root_cause"` and a `contributors` array in
`richContent.data`.

**Harness:** `## root-cause (2/2)` rows of `npm run validate:demo`.

---

## 2. Chat — auto-insights prefix

**What it does:** Every CSV query result gets up to 3 💡 lines
prepended — top mover, concentration, active anomaly alerts. Skipped
on cache hits, follow-ups, and stale-data responses.

### Visual

1. Chat as Finance: `run pnl_lineage`
2. Look at the top of the bot reply — you should see 1-3 lines
   starting with 💡.
3. Send `run pnl_lineage` again immediately — second run skips the
   prefix (cache hit).

### Curl

```bash
curl -sS -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" -H "x-user-role: admin" \
  -d '{"text":"run pnl_lineage","sessionId":"ai-test","groupId":"finance","explicitFilters":{"x":"1"}}' \
  | python3 -c "import json,sys
d=json.load(sys.stdin)['data']
print(d['text'][:200])
print('autoInsights:', d['richContent']['data'].get('autoInsights'))"
```

**Harness:** `## auto-insights (4/4)`.

---

## 3. Chat — change narratives

**What it does:** When a numeric column moves > 5% vs. the prior
snapshot, an `FYI **X** is up 12% vs. 5 min ago` line joins the 💡
stream. Columns already covered by an anomaly are excluded.

### Visual

You probably won't see narratives during a fresh test session because
the mock data doesn't change between runs. To force one:

```bash
# Inject a synthetic older snapshot with different numbers
node --input-type=module -e "
import { promises as fs } from 'fs';
const p = 'services/engine/data/anomaly/finance/snapshots.jsonl';
const old = JSON.stringify({
  queryName: 'pnl_lineage',
  timestamp: new Date(Date.now() - 6*60_000).toISOString(),
  numericSummary: { vpsignoffcount: 40, vpsignoff_bofc_hours: 150, DurationAvg: 200 }
});
const raw = await fs.readFile(p,'utf-8').catch(()=>'');
await fs.writeFile(p, old + '\n' + raw, 'utf-8');
"

# Re-run pnl_lineage with a unique filter to dodge cache
curl -sS -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" -H "x-user-role: admin" \
  -d "{\"text\":\"run pnl_lineage\",\"sessionId\":\"narr\",\"groupId\":\"finance\",\"explicitFilters\":{\"cb\":\"$RANDOM\"}}" \
  | python3 -c "import json,sys
d=json.load(sys.stdin)['data']
[print(' -', i['kind'],'|',i['text'][:140]) for i in d['richContent']['data'].get('autoInsights',[])]"
```

Expect at least one `FYI **vpsignoffcount** is up 135% vs. 6 min ago`
line mixed in.

**Unit test:** `cd services/engine && npx vitest run src/__tests__/change-narrative.test.ts`

---

## 4. Chat — type-ahead autocomplete + click-through learning

**What it does:** As you type a query name, matching catalog entries
surface in a dropdown above the input. Picks via Tab record a
click-through; future searches bump the picked query in your personal
ranking.

### Visual

1. Chat as Finance.
2. Slowly type `pnl` — dropdown appears with `pnl_lineage`, `pnl_summary`, etc.
3. **↑ / ↓** moves highlight.
4. **Tab** inserts `run pnl_summary` (or whichever was highlighted).
5. **Esc** dismisses.
6. Type `group by region` — dropdown stays hidden (follow-up suppressor).
7. After a few Tab-picks of the same suggestion, reload the page,
   type `pnl` again. Your picked option ranks higher than baseline.

### Curl

```bash
# Baseline anonymous ranking
curl -sS "http://localhost:3001/api/queries/search?q=pnl&groupId=finance" \
  | python3 -c "import json,sys
r=json.load(sys.stdin)['results']
[print(' ', x['queryName'], 'score=', round(x['score'],2)) for x in r[:3]]"

# Pretend a user picks pnl_summary 5 times
for i in 1 2 3 4 5; do
  curl -sS -X POST http://localhost:3001/api/queries/search \
    -H "Content-Type: application/json" \
    -d '{"groupId":"finance","userName":"me-test","queryName":"pnl_summary","query":"pnl"}' > /dev/null
done

# Same search, with userName — pnl_summary's score should be higher now
curl -sS "http://localhost:3001/api/queries/search?q=pnl&groupId=finance&userName=me-test" \
  | python3 -c "import json,sys
r=json.load(sys.stdin)['results']
[print(' ', x['queryName'], 'score=', round(x['score'],2)) for x in r[:3]]"
```

**Harness:** `## autocomplete (3/3)` + `## search-personalisation (2/2)`.

---

## 5. Data Explorer — auto-insights banner

**What it does:** Same builder as chat 💡 lines, but rendered as a
strip above the filter bar on dashboards.

### Visual

1. `http://localhost:3001/data-explorer`
2. Pick a Finance source (`pnl_lineage`).
3. Wait ~1s — look between the dashboard title and the filter row for
   a strip of 1-3 💡 lines.
4. Apply a filter — the strip refreshes on the next query.

### Curl

```bash
curl -sS -X POST http://localhost:4001/api/data/query \
  -H "Content-Type: application/json" \
  -d '{"queryName":"pnl_lineage","groupId":"finance","page":1,"pageSize":50}' \
  | python3 -c "import json,sys
d=json.load(sys.stdin)
print('rows:', len(d.get('rows',[])))
print('insights:', d.get('insights'))"
```

**Harness:** `## data-explorer-insights (2/2)`.

---

## 6. Data Explorer — KPI trend badges

**What it does:** Each KPI tile shows `↑ 12.3%` / `↓ 8.1%` when the
source has a date column and ≥ 8 rows. Comparison is first-half vs.
second-half of the data, by date. Flat (< 1% change) is suppressed.

### Visual

1. Data Explorer → pick `pnl_lineage`.
2. Look at the KPI tiles in the top row. Below the big number and
   "avg of …", you should see a colored pill (green ↑ / red ↓).
3. Hover the pill — tooltip explains the comparison.

### Curl

This is pure client compute over the query response; no separate
endpoint to hit.

**Harness:** indirectly via `## data-explorer-insights` (proves the
query endpoint still returns parseable rows for the UI to compute on).

---

## 7. Data Explorer — on-demand KPI forecast

**What it does:** Each KPI gets a "show forecast" link. Click → fetch
a sparkline; click again → hide.

### Visual

1. Data Explorer → `pnl_lineage`.
2. On any KPI tile, click **show forecast**.
3. An inline SVG sparkline appears: solid line = historical, dashed =
   predicted.
4. Click again to hide.

### Curl

```bash
curl -sS "http://localhost:4001/api/data/forecast/pnl_lineage?valueColumn=DurationAvg&groupId=finance&periods=3" \
  | python3 -m json.tool | head -30
```

Expect `"forecastable": true` plus `historical` + `predicted` arrays.

**Harness:** `## forecast (2/2)`.

---

## 8. Data Explorer — Data Quality card

**What it does:** Single card with four severity-coded tiles —
duplicates, missing %, schema drift, anomalies — plus the top three
columns by null count.

### Visual

1. Data Explorer → pick any Finance source.
2. Scroll to the bottom — the auto-generated layout includes a **Data
   Quality** card.
3. Hover/inspect each tile color:
   - Green = healthy
   - Amber = warning
   - Red = danger (high nulls or many anomalies)
4. The footer line lists "Top missing columns: …" when nulls exist.

### Curl

```bash
curl -sS "http://localhost:4001/api/data/quality/pnl_lineage?groupId=finance" \
  | python3 -m json.tool
```

Expect a JSON with `rowCount`, `duplicateCount`, `missingPercent`,
`topMissingColumns`, `schemaDrift`, `anomalyCount`.

**Harness:** `## data-quality (2/2)`.

---

## 9. Data Explorer — per-user source reorder

**What it does:** `/api/data/sources` reorders by per-user view
frequency when `userName` is supplied. Sources you've used recently
carry a `recent: true` flag rendered as a "Recent" pill in the picker.

### Visual

1. Data Explorer → pick `pnl_lineage` several times.
2. Reload the page.
3. Open the source picker — `pnl_lineage` should be at the top with a
   "Recent" pill next to its name.

### Curl

```bash
USER=me-test-$$
# Baseline
curl -sS "http://localhost:4001/api/data/sources?groupId=finance" \
  | python3 -c "import json,sys; r=json.load(sys.stdin)['sources']; [print(' ', s['name']) for s in r]"

# Record 3 views
for i in 1 2 3; do
  curl -sS -X POST http://localhost:4001/api/data/sources/view \
    -H "Content-Type: application/json" \
    -d "{\"groupId\":\"finance\",\"userName\":\"$USER\",\"queryName\":\"pnl_lineage\"}" > /dev/null
done

# Personalised list
curl -sS "http://localhost:4001/api/data/sources?groupId=finance&userName=$USER" \
  | python3 -c "import json,sys
r=json.load(sys.stdin)['sources']
[print(' ', s['name'], '★ recent' if s.get('recent') else '') for s in r]"
```

`pnl_lineage` should be on top with `★ recent`.

**Harness:** `## source-reorder (1/1)`.

---

## 10. Admin → Glossary

**What it does:** Per-group business glossary at `/admin/glossary`
(formal metric definitions, aliases, formulas, examples). Same
operator pattern as `/admin/synonyms` but for semantic definitions,
not vocabulary substitution.

### Visual

1. `http://localhost:3001/admin/glossary`
2. Pick a group, click **Add entry**.
3. Fill: name = `Net Revenue`, aliases = `net rev, nr`, definition,
   optional formula.
4. Save — entry appears in the list with aliases as chips and the
   formula in a code block.
5. Delete the test entry afterward.

### Curl

```bash
# Create
curl -sS -X POST http://localhost:4001/api/admin/glossary \
  -H "Content-Type: application/json" -H "x-user-role: admin" \
  -d '{"groupId":"finance","name":"Test Metric","aliases":["tm"],"definition":"For self-test only"}' \
  | python3 -m json.tool

# List
curl -sS "http://localhost:4001/api/admin/glossary?groupId=finance" \
  -H "x-user-role: admin" | python3 -m json.tool

# Delete (replace ID with the one returned above)
# curl -X DELETE "http://localhost:4001/api/admin/glossary?groupId=finance&id=..." \
#   -H "x-user-role: admin"
```

**Harness:** `## glossary (3/3)` — runs against `default` group with
self-cleanup.

---

## 11. Identity — passthrough Windows auth

**What it does:** `/api/userinfo` forwards Authorization / Cookie /
X-Forwarded-User / X-IIS-User / X-Remote-User / Remote-User /
X-User-Principal-Name to `USER_INFO_URL`. Without a real URL, returns
a dev fallback so the UI keeps rendering.

### Visual

1. `http://localhost:3001` — top-right of the page shows the current
   user (in dev: "Local Developer").
2. The sidebar's footer also shows initials + role.

### Curl

```bash
# Default — no USER_INFO_URL, returns dev fallback
curl -sS http://localhost:3001/api/userinfo | python3 -m json.tool

# Local dev override — set the env var and restart Next.js
# USER_INFO_DEV_OVERRIDE_SAM=yoursamname npm run dev
# Then re-call /api/userinfo and confirm the response carries that
# samAccountName.
```

### Granting yourself admin

Edit `src/config/users.json`, append:

```json
{
  "id": "u-self",
  "name": "Your Display Name",
  "email": "your.email@firm.com",
  "userid": "your-samaccountname",
  "brid": "",
  "role": "admin",
  "createdAt": "2026-05-13T00:00:00Z"
}
```

Match `userid` to whatever `samAccountName` the AD endpoint returns
(or `USER_INFO_DEV_OVERRIDE_SAM` for local testing). Restart Next.js
— no rebuild needed.

**Harness:** `## userinfo (3/3)`.

---

## 12. Notifications — top-right placement

**What it does:** Toast notifications (Saved!, errors, warnings) now
appear in the top-right corner consistently across every screen,
sliding in from the right edge.

### Visual

1. Anywhere in `/admin/*` — make a save action (synonym, glossary,
   anything). The success toast renders top-right.
2. Trigger an error (e.g., delete something twice) — error toast also
   top-right with a red border.
3. Test on `/`, `/admin`, `/data-explorer`, `/gridboard` — should be
   consistent.

No harness check (visual only).

---

## TL;DR — single command

```bash
npm run validate:demo
```

Looks for `Total: 15X  Passed: 15X  Failed: 0`. The breakdown by
section appears in `docs/DEMO-VALIDATION.md`, regenerated on every
run.
