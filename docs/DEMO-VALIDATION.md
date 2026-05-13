# Demo Validation Report

Generated: 2026-05-13T03:08:35.874Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (134 / 134)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     17ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-6846","timestamp" |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |    187ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    158ms | status=200 shape-ok=true |
| ✓      | entities                        |    136ms | status=200 shape-ok=true |
| ✓      | templates                       |    133ms | status=200 shape-ok=true |
| ✓      | settings                        |    143ms | status=200 shape-ok=true |
| ✓      | queries                         |    149ms | status=200 shape-ok=true |
| ✓      | filters                         |    154ms | status=200 shape-ok=true |
| ✓      | users                           |    146ms | status=200 shape-ok=true |
| ✓      | audit                           |    156ms | status=200 shape-ok=true |
| ✓      | schedules                       |     24ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    157ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    160ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    163ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    170ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    169ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     25ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    166ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    178ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    203ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    231ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    227ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    231ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    236ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    248ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    248ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    297ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    180ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    177ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    185ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    185ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    184ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    189ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    184ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    191ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    189ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    199ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    207ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    197ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |    213ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    386ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    310ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    332ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    403ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    331ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    342ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1904ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1483ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    319ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    401ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    517ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    314ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    419ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    478ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    499ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    501ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    640ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    449ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    497ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    429ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    449ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    481ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    449ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    555ms | intent=undo                                                |
| ✓      | export as csv                |    318ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    451ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    389ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    458ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    416ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    374ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    444ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    447ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    357ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    303ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    393ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status                                  | Check                                                 | Duration | Detail                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓                                       | detection flagged name + salary                       |   1589ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓                                       | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓                                       | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓                                       | bot text notes masking applied                        |          | text="💡 **E002** has the highest **tenure_months** at 48; **E019** is the lowest at 6.                                         |
| 💡 **US** accounts for 57% of rows by " |
| ✓                                       | admin role → unmasked clear values                    |    367ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓                                       | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 0s ago — say "refresh employee_metrics" to bypass)_" |
| ✓                                       | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |    435ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |    448ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text=" 30).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 1ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 2ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 455ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    367ms | status=400 code=INVALID_MESSAGE requestId=6269bece                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      0ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"613f8863-248c-4161-ae19-4da |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    391ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    325ms | status=cached ageMs=310 |
| ✓      | 'refresh X' bypasses the cache                |    490ms | status=undefined        |
| ✓      | different filters → fresh entry               |    398ms | status=fresh            |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |    309ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=18                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                           |
| ------ | ------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      0ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                 |
| ✓      | chat_requests_total counter is emitted            |      0ms | body excerpt=chat_requests_total{group="finance",intent="query.execute",status="success"} 12 \| chat_requests_total{group="default",intent="greeting",status="su |
| ✓      | process gauges present                            |          | checked process_resident_memory_bytes + process_uptime_seconds                                                                                                   |

## security-headers (3/3)

| Status | Check                                    | Duration | Detail                                                                                        |
| ------ | ---------------------------------------- | -------: | --------------------------------------------------------------------------------------------- |
| ✓      | X-Content-Type-Options: nosniff          |      1ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check                                            | Duration | Detail                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------ |
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     35ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |    523ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      4ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      0ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      2ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   2670ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |    334ms | status=201 id=WhamyB4A                 |
| ✓      | GET /api/views/:id returns the same snapshot |    209ms | id=WhamyB4A text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |     54ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    318ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    472ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    397ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    476ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    346ms | intent=followup.summary                                                                                         |

## auto-insights (3/3)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    380ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      3ms | status=200 entry.id=\_validation_1778641713149         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778641713149 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778641713154) |      1ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778641713154","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      0ms | status=200 body={"success":true,"deleted":"\_validation_1778641713154"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2717ms | intent=greeting                                      |
