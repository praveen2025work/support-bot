# Demo Validation Report

Generated: 2026-05-13T03:46:45.571Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (141 / 141)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     20ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-28860","timestamp |
| ✓      | mock-api root      |      5ms | status=200                                                                                       |
| ✓      | next.js root       |    328ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    762ms | status=200 shape-ok=true |
| ✓      | entities                        |    707ms | status=200 shape-ok=true |
| ✓      | templates                       |    641ms | status=200 shape-ok=true |
| ✓      | settings                        |    806ms | status=200 shape-ok=true |
| ✓      | queries                         |    769ms | status=200 shape-ok=true |
| ✓      | filters                         |    690ms | status=200 shape-ok=true |
| ✓      | users                           |    858ms | status=200 shape-ok=true |
| ✓      | audit                           |    894ms | status=200 shape-ok=true |
| ✓      | schedules                       |     32ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    809ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    682ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    719ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    736ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    709ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     32ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    762ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    984ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    315ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    957ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    978ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   1023ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   1425ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   1423ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   1580ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   1445ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   1420ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   1228ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   2618ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   1535ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   1914ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   1734ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   1500ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   1576ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    306ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   3653ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   2099ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   3650ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2009ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    552ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    760ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    808ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    885ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    835ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    972ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    928ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1144ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    972ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    832ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    703ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    680ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    528ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    688ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    749ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    864ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    864ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    885ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    569ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    698ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    925ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    785ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    667ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    870ms | intent=undo                                                |
| ✓      | export as csv                |    858ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    911ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    564ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    543ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    843ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    706ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    739ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    692ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    821ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    849ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    568ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                            |
| ------ | ----------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |    718ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                      |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                     |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                           |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ \_(cached 497s ago — say "refr" |
| ✓      | admin role → unmasked clear values                    |    710ms | name="Alice Johnson" salary=165000                                                                                                |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="17 of 30).                                                                                                                  |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns shown UNMASKED — audited: name, salary)\_" |
| ✓ | admin role → piiSummary.unmasked=true | | unmasked=true |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |    813ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |    870ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 2ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 2ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 810ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    615ms | status=400 code=INVALID_MESSAGE requestId=a8fd172d                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"abcec2c2-686e-4e9c-ade7-92c |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    902ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    881ms | status=cached ageMs=866 |
| ✓      | 'refresh X' bypasses the cache                |   1158ms | status=undefined        |
| ✓      | different filters → fresh entry               |    814ms | status=fresh            |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   1781ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=18                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                           |
| ------ | ------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      1ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                 |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="default",intent="query.execute",status="success"} 5 \| chat_requests_total{group="default",intent="followup.summary",sta |
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
| ✓      | GET /api/admin/sources/health returns map shape           |   1551ms | total=1 ok=1 unreachable=0 |
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
| ✓      | 3 concurrent retrains all succeed without error |      3ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   3265ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   2464ms | status=201 id=J1ctxJgI                 |
| ✓      | GET /api/views/:id returns the same snapshot |    190ms | id=J1ctxJgI text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    199ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    766ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    780ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    823ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    766ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    640ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   1256ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |    919ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    214ms | ok=true resultsType=object |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    352ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      3ms | status=200 entry.id=\_validation_1778644002603         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778644002603 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778644002608) |      1ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778644002608","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778644002608"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2958ms | intent=greeting                                      |
