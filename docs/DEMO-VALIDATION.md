# Demo Validation Report

Generated: 2026-05-13T04:15:08.582Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (145 / 145)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     20ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-69847","timestamp |
| ✓      | mock-api root      |      4ms | status=200                                                                                       |
| ✓      | next.js root       |    285ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    763ms | status=200 shape-ok=true |
| ✓      | entities                        |    635ms | status=200 shape-ok=true |
| ✓      | templates                       |    552ms | status=200 shape-ok=true |
| ✓      | settings                        |    752ms | status=200 shape-ok=true |
| ✓      | queries                         |    692ms | status=200 shape-ok=true |
| ✓      | filters                         |    670ms | status=200 shape-ok=true |
| ✓      | users                           |    914ms | status=200 shape-ok=true |
| ✓      | audit                           |    592ms | status=200 shape-ok=true |
| ✓      | schedules                       |     34ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    726ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    616ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    672ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    735ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    742ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |    156ms | status=200 shape-ok=true |
| ✓      | data-roles                      |   1186ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    934ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |   1124ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |   1306ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |   1411ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   1069ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   1092ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   1171ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   1425ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   1456ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   1511ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   1377ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   1488ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   1502ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   1691ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   1956ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   2047ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   1788ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    338ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   2011ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   1887ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   2085ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   3908ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    585ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    828ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    815ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |   1474ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    851ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   3410ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   2317ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1879ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    724ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    544ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    840ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    717ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    781ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |   1005ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |   1231ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    873ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    641ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    578ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    823ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    691ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    782ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    773ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    693ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    830ms | intent=undo                                                |
| ✓      | export as csv                |    615ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    801ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    803ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    724ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    723ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    728ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    800ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    906ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    875ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    773ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    691ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status                                  | Check                                                 | Duration | Detail                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓                                       | detection flagged name + salary                       |   2212ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓                                       | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓                                       | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓                                       | bot text notes masking applied                        |          | text="💡 **E002** has the highest **tenure_months** at 48; **E019** is the lowest at 6.                                         |
| 💡 **US** accounts for 57% of rows by " |
| ✓                                       | admin role → unmasked clear values                    |    555ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓                                       | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_" |
| ✓                                       | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |    668ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |    667ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 2ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 2ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 686ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    612ms | status=400 code=INVALID_MESSAGE requestId=c4942815                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"9a12b269-d6b5-4dc4-a882-1f6 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    830ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    773ms | status=cached ageMs=748 |
| ✓      | 'refresh X' bypasses the cache                |    784ms | status=undefined        |
| ✓      | different filters → fresh entry               |    666ms | status=fresh            |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   2815ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=18                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                          |
| ------ | ------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      2ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="default",intent="greeting",status="success"} 2 \| chat_requests_total{group="default",intent="help",status="success"} 1 |
| ✓      | process gauges present                            |          | checked process_resident_memory_bytes + process_uptime_seconds                                                                                                  |

## security-headers (3/3)

| Status | Check                                    | Duration | Detail                                                                                        |
| ------ | ---------------------------------------- | -------: | --------------------------------------------------------------------------------------------- |
| ✓      | X-Content-Type-Options: nosniff          |      2ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check                                            | Duration | Detail                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------ |
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     36ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1581ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      5ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      1ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      2ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   3103ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1933ms | status=201 id=qWwYDFkr                 |
| ✓      | GET /api/views/:id returns the same snapshot |    359ms | id=qWwYDFkr text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    214ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    626ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    939ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    712ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    812ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    692ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   1174ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |    951ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    318ms | ok=true resultsType=object |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    666ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## root-cause (2/2)

| Status | Check                                                     | Duration | Detail                                               |
| ------ | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| ✓      | routes "what is driving the change" → analysis.root_cause |    692ms | intent=analysis.root_cause conf=0.7842248725740287   |
| ✓      | richContent.data.root_cause has valid shape               |          | kind=concentration metric=DurationMax contributors=5 |

## data-explorer-insights (2/2)

| Status | Check                                      | Duration | Detail               |
| ------ | ------------------------------------------ | -------: | -------------------- |
| ✓      | POST /api/data/query returns 200           |     14ms | status=200 rows=50   |
| ✓      | insights field has valid shape (or absent) |          | present=true count=2 |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      5ms | status=200 entry.id=\_validation_1778645705365         |
| ✓      | read-back contains created entry |      2ms | found=true name=Test metric \_validation_1778645705365 |
| ✓      | delete entry (cleanup)           |      3ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778645705375) |      3ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778645705375","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      3ms | status=200 body={"success":true,"deleted":"\_validation_1778645705375"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |     12ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   3187ms | intent=greeting                                      |
