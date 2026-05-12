# Demo Validation Report

Generated: 2026-05-12T21:51:05.228Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (128 / 128)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-33121","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |    114ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    437ms | status=200 shape-ok=true |
| ✓      | entities                        |    342ms | status=200 shape-ok=true |
| ✓      | templates                       |    353ms | status=200 shape-ok=true |
| ✓      | settings                        |    358ms | status=200 shape-ok=true |
| ✓      | queries                         |    525ms | status=200 shape-ok=true |
| ✓      | filters                         |    359ms | status=200 shape-ok=true |
| ✓      | users                           |    458ms | status=200 shape-ok=true |
| ✓      | audit                           |    374ms | status=200 shape-ok=true |
| ✓      | schedules                       |     19ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    473ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    385ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    389ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    450ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    407ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     22ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    409ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    518ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    512ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    594ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    567ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    142ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    639ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    683ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    884ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    940ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   1027ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   1046ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   1077ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    195ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   1071ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   1169ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   1169ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   1161ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |   1310ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   1416ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   1327ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   1533ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2962ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    323ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    469ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    549ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    866ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    403ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2953ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1939ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1660ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    488ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    543ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    541ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    544ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    593ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    635ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    722ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    766ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    682ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    495ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    571ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    491ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    562ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    584ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    714ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    710ms | intent=undo                                                |
| ✓      | export as csv                |    562ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    560ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    508ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    577ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    602ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    616ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    814ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    516ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    517ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    528ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    550ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                          |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |   2104ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"                              |
| ✓      | admin role → unmasked clear values                    |    408ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 0s ago — say "refresh employee_metrics" to bypass)_" |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                                | Duration | Detail                                                                                                                                                            |
| ------ | ---------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | baseline run — no drift                              |    485ms | drift=undefined                                                                                                                                                   |
| ✓      | phantom column → schemaDrift.removed reports it      |    488ms | removed=["FAKE_DROPPED_COL_FOR_TEST"]                                                                                                                             |
| ✓      | bot text includes ⚠ Schema drift suffix              |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_TEST)_" |
| ✓      | GET /api/admin/schema/drift surfaces the entry       |      1ms | count=1                                                                                                                                                           |
| ✓      | POST /api/admin/schema/acknowledge clears the flag   |      2ms | status=200                                                                                                                                                        |
| ✓      | acknowledge response includes cacheEvicted counter   |          | cacheEvicted=1                                                                                                                                                    |
| ✓      | post-ack chat call surfaces no drift (cache evicted) |    501ms | drift=undefined                                                                                                                                                   |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    672ms | status=400 code=INVALID_MESSAGE requestId=0e5cf6db                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"3c83cc03-f1f4-4a0b-9f87-ddb |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    543ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    567ms | status=cached ageMs=540 |
| ✓      | 'refresh X' bypasses the cache                |    598ms | status=undefined        |
| ✓      | different filters → fresh entry               |    616ms | status=fresh            |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   2048ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
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
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     40ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1502ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      4ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      2ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      2ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   2857ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1538ms | status=201 id=eiJsSi5M                 |
| ✓      | GET /api/views/:id returns the same snapshot |    182ms | id=eiJsSi5M text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    119ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    330ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    516ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    549ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    574ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    434ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778622662335) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778622662335","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778622662335"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2887ms | intent=greeting                                      |
