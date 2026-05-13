# Demo Validation Report

Generated: 2026-05-13T04:29:59.234Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (149 / 149)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     20ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-91450","timestamp |
| ✓      | mock-api root      |      4ms | status=200                                                                                       |
| ✓      | next.js root       |    254ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    629ms | status=200 shape-ok=true |
| ✓      | entities                        |    695ms | status=200 shape-ok=true |
| ✓      | templates                       |    638ms | status=200 shape-ok=true |
| ✓      | settings                        |    668ms | status=200 shape-ok=true |
| ✓      | queries                         |    718ms | status=200 shape-ok=true |
| ✓      | filters                         |    729ms | status=200 shape-ok=true |
| ✓      | users                           |    834ms | status=200 shape-ok=true |
| ✓      | audit                           |    836ms | status=200 shape-ok=true |
| ✓      | schedules                       |     45ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    858ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    917ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |   1053ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |   1022ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |   1097ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     42ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    801ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    777ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    870ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |   1006ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |   1104ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   1184ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   1301ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   1423ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   1673ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   1404ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   1432ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   1547ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   1746ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   1840ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   2077ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   2384ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   2470ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   1946ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    378ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   2177ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   2359ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   2679ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   3876ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    712ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    745ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    872ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    895ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    868ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   3406ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   2292ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1976ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    608ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    643ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    804ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    769ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    847ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    866ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    960ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    967ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |   1008ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |   1373ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |   2003ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |   1312ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    981ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    975ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    816ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |   1473ms | intent=undo                                                |
| ✓      | export as csv                |    862ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    758ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    765ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    646ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    578ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    810ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    965ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |   1553ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    927ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |   1272ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |   1076ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status                                  | Check                                                 | Duration | Detail                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓                                       | detection flagged name + salary                       |   2954ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓                                       | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓                                       | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓                                       | bot text notes masking applied                        |          | text="💡 **E002** has the highest **tenure_months** at 48; **E019** is the lowest at 6.                                         |
| 💡 **US** accounts for 57% of rows by " |
| ✓                                       | admin role → unmasked clear values                    |    775ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓                                       | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_" |
| ✓                                       | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |    783ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |    894ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 2ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 3ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 872ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    659ms | status=400 code=INVALID_MESSAGE requestId=dbfe9bbd                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"9374931f-e8b1-44e4-9680-9c4 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    875ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    924ms | status=cached ageMs=948 |
| ✓      | 'refresh X' bypasses the cache                |    970ms | status=undefined        |
| ✓      | different filters → fresh entry               |   1038ms | status=fresh            |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   2012ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=18                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

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
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     40ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1401ms | total=1 ok=1 unreachable=0 |
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
| ✓      | chat works after concurrent retrains            |   3193ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1571ms | status=201 id=iobwcugh                 |
| ✓      | GET /api/views/:id returns the same snapshot |    279ms | id=iobwcugh text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    178ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    657ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |   1063ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |   2036ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |   1452ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |   1020ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   1759ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |    940ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    333ms | ok=true resultsType=object |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    834ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## root-cause (2/2)

| Status | Check                                                     | Duration | Detail                                               |
| ------ | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| ✓      | routes "what is driving the change" → analysis.root_cause |    687ms | intent=analysis.root_cause conf=0.7842248725740287   |
| ✓      | richContent.data.root_cause has valid shape               |          | kind=concentration metric=DurationMax contributors=5 |

## data-explorer-insights (2/2)

| Status | Check                                      | Duration | Detail               |
| ------ | ------------------------------------------ | -------: | -------------------- |
| ✓      | POST /api/data/query returns 200           |      3ms | status=200 rows=50   |
| ✓      | insights field has valid shape (or absent) |          | present=true count=2 |

## data-quality (2/2)

| Status | Check                                               | Duration | Detail                                   |
| ------ | --------------------------------------------------- | -------: | ---------------------------------------- |
| ✓      | GET /api/data/quality/:queryName returns a snapshot |     98ms | status=200 rows=93                       |
| ✓      | all four quality signals are present                |          | dup=0 nulls=0.37% drift=null anomalies=0 |

## forecast (2/2)

| Status | Check                                                         | Duration | Detail                       |
| ------ | ------------------------------------------------------------- | -------: | ---------------------------- |
| ✓      | GET /api/data/forecast/:queryName returns a contract envelope |      1ms | status=200 forecastable=true |
| ✓      | historical and predicted points are present                   |          | history=93 predicted=3       |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      2ms | status=200 entry.id=\_validation_1778646595912         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778646595912 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778646595916) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778646595916","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      2ms | status=200 body={"success":true,"deleted":"\_validation_1778646595916"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      0ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   3312ms | intent=greeting                                      |
