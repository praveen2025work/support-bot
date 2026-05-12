# Demo Validation Report

Generated: 2026-05-12T21:36:26.258Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (125 / 125)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     18ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-27426","timestamp |
| ✓      | mock-api root      |      4ms | status=200                                                                                       |
| ✓      | next.js root       |    142ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    119ms | status=200 shape-ok=true |
| ✓      | entities                        |    105ms | status=200 shape-ok=true |
| ✓      | templates                       |    151ms | status=200 shape-ok=true |
| ✓      | settings                        |    105ms | status=200 shape-ok=true |
| ✓      | queries                         |    107ms | status=200 shape-ok=true |
| ✓      | filters                         |    103ms | status=200 shape-ok=true |
| ✓      | users                           |    103ms | status=200 shape-ok=true |
| ✓      | audit                           |    107ms | status=200 shape-ok=true |
| ✓      | schedules                       |     19ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    103ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    108ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    112ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    117ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    113ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     20ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    157ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    115ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    130ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    144ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    142ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    143ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    144ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    147ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    203ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    146ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    143ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    145ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    142ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    144ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    143ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    149ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    200ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    148ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    152ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    153ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    156ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    152ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   1683ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    329ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    236ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    259ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    370ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    431ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2643ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1811ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1517ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    336ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    353ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    380ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    300ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    357ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    239ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    161ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    234ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    396ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    225ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    250ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    345ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    398ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    335ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    313ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    434ms | intent=undo                                                |
| ✓      | export as csv                |    368ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    410ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    282ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    242ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    373ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    223ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    432ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    362ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    349ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    273ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    277ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                          |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |   1684ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"                              |
| ✓      | admin role → unmasked clear values                    |    347ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 0s ago — say "refresh employee_metrics" to bypass)_" |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                                | Duration | Detail                                                                                                                                                            |
| ------ | ---------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | baseline run — no drift                              |    370ms | drift=undefined                                                                                                                                                   |
| ✓      | phantom column → schemaDrift.removed reports it      |    362ms | removed=["FAKE_DROPPED_COL_FOR_TEST"]                                                                                                                             |
| ✓      | bot text includes ⚠ Schema drift suffix              |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_TEST)_" |
| ✓      | GET /api/admin/schema/drift surfaces the entry       |      1ms | count=1                                                                                                                                                           |
| ✓      | POST /api/admin/schema/acknowledge clears the flag   |      2ms | status=200                                                                                                                                                        |
| ✓      | acknowledge response includes cacheEvicted counter   |          | cacheEvicted=1                                                                                                                                                    |
| ✓      | post-ack chat call surfaces no drift (cache evicted) |    425ms | drift=undefined                                                                                                                                                   |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    347ms | status=400 code=INVALID_MESSAGE requestId=fcb794cb                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"517c3dbc-3454-4b8d-a02d-0e5 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    500ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    423ms | status=cached ageMs=401 |
| ✓      | 'refresh X' bypasses the cache                |    367ms | status=undefined        |
| ✓      | different filters → fresh entry               |    248ms | status=fresh            |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                          |
| ------ | ------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      1ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="default",intent="greeting",status="success"} 2 \| chat_requests_total{group="default",intent="help",status="success"} 1 |
| ✓      | process gauges present                            |          | checked process_resident_memory_bytes + process_uptime_seconds                                                                                                  |

## security-headers (3/3)

| Status | Check                                    | Duration | Detail                                                                                        |
| ------ | ---------------------------------------- | -------: | --------------------------------------------------------------------------------------------- |
| ✓      | X-Content-Type-Options: nosniff          |      1ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check                                            | Duration | Detail                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------ |
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     37ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |    315ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      4ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      1ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      2ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   2724ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |    292ms | status=201 id=howZWUzw                 |
| ✓      | GET /api/views/:id returns the same snapshot |    176ms | id=howZWUzw text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |     48ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    234ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    257ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    299ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    363ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    240ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778621783690) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778621783690","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778621783690"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      0ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2564ms | intent=greeting                                      |
