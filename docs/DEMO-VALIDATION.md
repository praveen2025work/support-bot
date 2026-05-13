# Demo Validation Report

Generated: 2026-05-13T13:16:07.210Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (164 / 164)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     16ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-88413","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |   1397ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |   1092ms | status=200 shape-ok=true |
| ✓      | entities                        |   1062ms | status=200 shape-ok=true |
| ✓      | templates                       |   1027ms | status=200 shape-ok=true |
| ✓      | settings                        |   1124ms | status=200 shape-ok=true |
| ✓      | queries                         |   1257ms | status=200 shape-ok=true |
| ✓      | filters                         |   1061ms | status=200 shape-ok=true |
| ✓      | users                           |   1179ms | status=200 shape-ok=true |
| ✓      | audit                           |   1278ms | status=200 shape-ok=true |
| ✓      | schedules                       |     67ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |   1442ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |   1329ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |   1204ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |   3154ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |   1715ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     56ms | status=200 shape-ok=true |
| ✓      | data-roles                      |   1220ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |   1353ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |   1671ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |   2073ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |   1911ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   1854ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   2981ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   4606ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   2418ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   2709ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   2138ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   2686ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   2723ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   2493ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   3172ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   2698ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   3944ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   3585ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    451ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   3131ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   2895ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   6457ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2990ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    868ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    940ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    931ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |   1648ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |   1446ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   1091ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    806ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1069ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |   1229ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |   1137ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |   1203ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    844ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    918ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    766ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |   1219ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    917ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    981ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |   1063ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    913ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |   1407ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |   1475ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |   1432ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    846ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |   1458ms | intent=undo                                                |
| ✓      | export as csv                |   1176ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |   1208ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |   1650ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |   1076ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    789ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |   1080ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |   1178ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    879ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |   1088ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    994ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |   1109ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                            |
| ------ | ----------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |   1356ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                      |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                     |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                           |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ \_(cached 202s ago — say "refr" |
| ✓      | admin role → unmasked clear values                    |    991ms | name="Alice Johnson" salary=165000                                                                                                |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="17 of 30).                                                                                                                  |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns shown UNMASKED — audited: name, salary)\_" |
| ✓ | admin role → piiSummary.unmasked=true | | unmasked=true |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |   1126ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |    908ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 2ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 1ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 1216ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |   1355ms | status=400 code=INVALID_MESSAGE requestId=8814cad6                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"41e86fea-a523-4fc3-b190-b08 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                   |
| ------ | --------------------------------------------- | -------: | ------------------------ |
| ✓      | first run → cacheStatus.status=fresh          |   1045ms | status=fresh             |
| ✓      | identical request → cacheStatus.status=cached |   1134ms | status=cached ageMs=1156 |
| ✓      | 'refresh X' bypasses the cache                |   1327ms | status=undefined         |
| ✓      | different filters → fresh entry               |   1393ms | status=fresh             |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   1918ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=27                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                           |
| ------ | ------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      1ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                 |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="default",intent="query.list",status="success"} 4 \| chat_requests_total{group="default",intent="query.execute",status="s |
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
| ✓      | GET /api/admin/sources/health returns map shape           |   1897ms | total=1 ok=1 unreachable=0 |
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
| ✓      | 3 concurrent retrains all succeed without error |      1ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   3925ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1302ms | status=201 id=FwvOIejh                 |
| ✓      | GET /api/views/:id returns the same snapshot |    453ms | id=FwvOIejh text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    290ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    911ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |   1347ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |   1239ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |   1040ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    903ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   1723ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |   1668ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    337ms | ok=true resultsType=object |

## search-personalisation (2/2)

| Status | Check                                              | Duration | Detail                          |
| ------ | -------------------------------------------------- | -------: | ------------------------------- |
| ✓      | pnl_summary score increases after 6 picks          |    607ms | baseline=2.66 personalised=5.66 |
| ✓      | other users are unaffected by another user's picks |          | baseline=2.66 other=2.66        |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    475ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## root-cause (2/2)

| Status | Check                                                     | Duration | Detail                                               |
| ------ | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| ✓      | routes "what is driving the change" → analysis.root_cause |   1178ms | intent=analysis.root_cause conf=0.7844570625436028   |
| ✓      | richContent.data.root_cause has valid shape               |          | kind=concentration metric=DurationMax contributors=5 |

## active-doc-qa (4/4)

| Status | Check                                                          | Duration | Detail                               |
| ------ | -------------------------------------------------------------- | -------: | ------------------------------------ |
| ✓      | "how many incidents" → document.ask carrying "incident"        |   1100ms | intent=document.ask hasExpected=true |
| ✓      | "what was the root cause" → document.ask carrying "root cause" |    893ms | intent=document.ask hasExpected=true |
| ✓      | "what is the severity" → document.ask carrying "Severity"      |    967ms | intent=document.ask hasExpected=true |
| ✓      | "list the action items" → document.ask carrying "Action"       |   1716ms | intent=document.ask hasExpected=true |

## data-explorer-insights (2/2)

| Status | Check                                      | Duration | Detail               |
| ------ | ------------------------------------------ | -------: | -------------------- |
| ✓      | POST /api/data/query returns 200           |      2ms | status=200 rows=50   |
| ✓      | insights field has valid shape (or absent) |          | present=true count=2 |

## data-quality (2/2)

| Status | Check                                               | Duration | Detail                                   |
| ------ | --------------------------------------------------- | -------: | ---------------------------------------- |
| ✓      | GET /api/data/quality/:queryName returns a snapshot |     87ms | status=200 rows=93                       |
| ✓      | all four quality signals are present                |          | dup=0 nulls=0.37% drift=null anomalies=0 |

## forecast (2/2)

| Status | Check                                                         | Duration | Detail                       |
| ------ | ------------------------------------------------------------- | -------: | ---------------------------- |
| ✓      | GET /api/data/forecast/:queryName returns a contract envelope |      1ms | status=200 forecastable=true |
| ✓      | historical and predicted points are present                   |          | history=93 predicted=3       |

## gridboard-rows (2/2)

| Status | Check                                               | Duration | Detail                        |
| ------ | --------------------------------------------------- | -------: | ----------------------------- |
| ✓      | POST /api/data/rows/:queryName returns rows+columns |     14ms | status=200 rows=50 columns=35 |
| ✓      | insights ride along on page 1 (or absent)           |          | present=true count=2          |

## gridboard-query-reorder (1/1)

| Status | Check                                                              | Duration | Detail                       |
| ------ | ------------------------------------------------------------------ | -------: | ---------------------------- |
| ✓      | recently-used query "gross_margin" bubbles to top with recent=true |      5ms | top=gross_margin recent=true |

## gridboard-views (5/5)

| Status | Check                                                 | Duration | Detail                                                       |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------ |
| ✓      | POST creates a view with version=1                    |      1ms | status=201 id=de58567a-0ea5-410a-8da9-24ec45c3f0b3 version=1 |
| ✓      | GET filters by (userId, queryName, groupId)           |      0ms | count=1 matched=true                                         |
| ✓      | PUT with stale If-Match returns 409 + current view    |      1ms | status=409 currentVersion=1                                  |
| ✓      | PUT with matching If-Match succeeds and bumps version |      1ms | status=200 version=2                                         |
| ✓      | DELETE cleans up the view                             |      0ms | status=200                                                   |

## source-reorder (1/1)

| Status | Check                                               | Duration | Detail                      |
| ------ | --------------------------------------------------- | -------: | --------------------------- |
| ✓      | recently-viewed source "pnl_lineage" bubbles to top |      5ms | top=pnl_lineage recent=true |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      1ms | status=200 entry.id=\_validation_1778678163506         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778678163506 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778678163509) |      1ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778678163509","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      0ms | status=200 body={"success":true,"deleted":"\_validation_1778678163509"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   3697ms | intent=greeting                                      |
