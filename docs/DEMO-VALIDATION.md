# Demo Validation Report

Generated: 2026-05-13T04:56:06.664Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (152 / 152)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     21ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-15994","timestamp |
| ✓      | mock-api root      |      3ms | status=200                                                                                       |
| ✓      | next.js root       |    278ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    898ms | status=200 shape-ok=true |
| ✓      | entities                        |    751ms | status=200 shape-ok=true |
| ✓      | templates                       |    706ms | status=200 shape-ok=true |
| ✓      | settings                        |    868ms | status=200 shape-ok=true |
| ✓      | queries                         |    810ms | status=200 shape-ok=true |
| ✓      | filters                         |    785ms | status=200 shape-ok=true |
| ✓      | users                           |    837ms | status=200 shape-ok=true |
| ✓      | audit                           |    709ms | status=200 shape-ok=true |
| ✓      | schedules                       |     41ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    852ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    727ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    810ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    856ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    919ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     51ms | status=200 shape-ok=true |
| ✓      | data-roles                      |   1006ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |   1058ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |   1362ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |   1222ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |   1538ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   1667ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   1910ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   1594ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   1471ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   1870ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   1955ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   3555ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   9510ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   3219ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   4838ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   3319ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   3202ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |  15776ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |   8598ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   4723ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   5971ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   3002ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |    933ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |   2055ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |   1757ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |   1152ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |   1340ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |   1772ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   4579ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   2626ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   2230ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |   2347ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |   1495ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |   1265ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |   1390ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |   1582ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |   1044ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |   1253ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |   1464ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |   2127ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |   1174ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |   1505ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |   1459ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |   1839ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |   1461ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |   1066ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |   1498ms | intent=undo                                                |
| ✓      | export as csv                |    751ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |   2219ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |   2047ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    883ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |   1227ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |   1536ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |   1717ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |   2321ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |   1411ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |   1767ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |   1170ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status                                  | Check                                                 | Duration | Detail                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓                                       | detection flagged name + salary                       |   2743ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓                                       | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓                                       | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓                                       | bot text notes masking applied                        |          | text="💡 **E002** has the highest **tenure_months** at 48; **E019** is the lowest at 6.                                         |
| 💡 **US** accounts for 57% of rows by " |
| ✓                                       | admin role → unmasked clear values                    |   1033ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓                                       | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_" |
| ✓                                       | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |   1897ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |   2524ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 1ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 1ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 2786ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    997ms | status=400 code=INVALID_MESSAGE requestId=e0cebd7c                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      2ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"0e2566c8-3406-400f-82bc-cb0 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                   |
| ------ | --------------------------------------------- | -------: | ------------------------ |
| ✓      | first run → cacheStatus.status=fresh          |   2016ms | status=fresh             |
| ✓      | identical request → cacheStatus.status=cached |   2050ms | status=cached ageMs=2055 |
| ✓      | 'refresh X' bypasses the cache                |   1386ms | status=undefined         |
| ✓      | different filters → fresh entry               |   1045ms | status=fresh             |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   2590ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=27                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                           |
| ------ | ------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      1ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                 |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="default",intent="query.filter_form",status="success"} 1 \| chat_requests_total{group="default",intent="query.execute",st |
| ✓      | process gauges present                            |          | checked process_resident_memory_bytes + process_uptime_seconds                                                                                                   |

## security-headers (3/3)

| Status | Check                                    | Duration | Detail                                                                                        |
| ------ | ---------------------------------------- | -------: | --------------------------------------------------------------------------------------------- |
| ✓      | X-Content-Type-Options: nosniff          |      2ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check                                            | Duration | Detail                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------ |
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     41ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   4876ms | total=1 ok=1 unreachable=0 |
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
| ✓      | chat works after concurrent retrains            |   5149ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1649ms | status=201 id=VXSixWgU                 |
| ✓      | GET /api/views/:id returns the same snapshot |    406ms | id=VXSixWgU text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    277ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    901ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |   1771ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |   1303ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |   1204ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |   1154ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   2697ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |    565ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    503ms | ok=true resultsType=object |

## search-personalisation (2/2)

| Status | Check                                              | Duration | Detail                          |
| ------ | -------------------------------------------------- | -------: | ------------------------------- |
| ✓      | pnl_summary score increases after 6 picks          |   1021ms | baseline=2.66 personalised=5.66 |
| ✓      | other users are unaffected by another user's picks |          | baseline=2.66 other=2.66        |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    620ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## root-cause (2/2)

| Status | Check                                                     | Duration | Detail                                               |
| ------ | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| ✓      | routes "what is driving the change" → analysis.root_cause |   1989ms | intent=analysis.root_cause conf=0.7842248725740287   |
| ✓      | richContent.data.root_cause has valid shape               |          | kind=concentration metric=DurationMax contributors=5 |

## data-explorer-insights (2/2)

| Status | Check                                      | Duration | Detail               |
| ------ | ------------------------------------------ | -------: | -------------------- |
| ✓      | POST /api/data/query returns 200           |     15ms | status=200 rows=50   |
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

## source-reorder (1/1)

| Status | Check                                               | Duration | Detail                      |
| ------ | --------------------------------------------------- | -------: | --------------------------- |
| ✓      | recently-viewed source "pnl_lineage" bubbles to top |      6ms | top=pnl_lineage recent=true |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      2ms | status=200 entry.id=\_validation_1778648162624         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778648162624 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778648162628) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778648162628","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778648162628"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   4030ms | intent=greeting                                      |
