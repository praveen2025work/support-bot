# Demo Validation Report

Generated: 2026-05-13T12:44:30.484Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (164 / 164)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-86980","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |    482ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |   1153ms | status=200 shape-ok=true |
| ✓      | entities                        |   1033ms | status=200 shape-ok=true |
| ✓      | templates                       |   1025ms | status=200 shape-ok=true |
| ✓      | settings                        |   1174ms | status=200 shape-ok=true |
| ✓      | queries                         |   1128ms | status=200 shape-ok=true |
| ✓      | filters                         |   2215ms | status=200 shape-ok=true |
| ✓      | users                           |   1220ms | status=200 shape-ok=true |
| ✓      | audit                           |   1069ms | status=200 shape-ok=true |
| ✓      | schedules                       |     61ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |   1206ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |   1100ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |   1251ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |   1384ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |   1563ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     82ms | status=200 shape-ok=true |
| ✓      | data-roles                      |   1402ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |   1304ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |   1758ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |   1552ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |   1806ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   2202ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   2216ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   1958ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   2009ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   2496ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   2419ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   2409ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   3293ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   2462ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   3205ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   2954ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   2978ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   3132ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    665ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   4130ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   7610ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   4606ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   5102ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    805ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |   1062ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |   1292ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |   1450ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |   1796ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   4344ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    994ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   2914ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    851ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |   1030ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |   1301ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |   1439ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |   1544ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    928ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    947ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    993ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |   1429ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |   1336ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    801ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |   1071ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |   1164ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |   1121ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |   1428ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |   1233ms | intent=undo                                                |
| ✓      | export as csv                |   1685ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    736ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |   1151ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |   1259ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |   1527ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |   1524ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |   1414ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |   1640ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |   1091ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |   1196ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |   1325ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status                                  | Check                                                 | Duration | Detail                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓                                       | detection flagged name + salary                       |   2966ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓                                       | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓                                       | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓                                       | bot text notes masking applied                        |          | text="💡 **E002** has the highest **tenure_months** at 48; **E019** is the lowest at 6.                                         |
| 💡 **US** accounts for 57% of rows by " |
| ✓                                       | admin role → unmasked clear values                    |    796ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓                                       | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_" |
| ✓                                       | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |   1049ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |   1201ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 2ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 2ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 1383ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |   1404ms | status=400 code=INVALID_MESSAGE requestId=736409c8                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"d0eb3d7f-f957-4ed2-bebe-c24 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                   |
| ------ | --------------------------------------------- | -------: | ------------------------ |
| ✓      | first run → cacheStatus.status=fresh          |   1306ms | status=fresh             |
| ✓      | identical request → cacheStatus.status=cached |   1168ms | status=cached ageMs=1107 |
| ✓      | 'refresh X' bypasses the cache                |   1299ms | status=undefined         |
| ✓      | different filters → fresh entry               |   2109ms | status=fresh             |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   1978ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=27                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                           |
| ------ | ------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      2ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                 |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="engineering",intent="query.execute",status="success"} 1 \| chat_requests_total{group="engineering",intent="document.ask" |
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
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     35ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1532ms | total=1 ok=1 unreachable=0 |
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
| ✓      | chat works after concurrent retrains            |   3436ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1699ms | status=201 id=zuevPyW8                 |
| ✓      | GET /api/views/:id returns the same snapshot |    484ms | id=zuevPyW8 text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    313ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    905ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |   1287ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |   1146ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |   1444ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |   1640ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   1995ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |   1582ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    478ms | ok=true resultsType=object |

## search-personalisation (2/2)

| Status | Check                                              | Duration | Detail                          |
| ------ | -------------------------------------------------- | -------: | ------------------------------- |
| ✓      | pnl_summary score increases after 6 picks          |   1210ms | baseline=2.66 personalised=5.66 |
| ✓      | other users are unaffected by another user's picks |          | baseline=2.66 other=2.66        |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    557ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## root-cause (2/2)

| Status | Check                                                     | Duration | Detail                                               |
| ------ | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| ✓      | routes "what is driving the change" → analysis.root_cause |   1493ms | intent=analysis.root_cause conf=0.7844570625436028   |
| ✓      | richContent.data.root_cause has valid shape               |          | kind=concentration metric=DurationMax contributors=5 |

## active-doc-qa (4/4)

| Status | Check                                                          | Duration | Detail                               |
| ------ | -------------------------------------------------------------- | -------: | ------------------------------------ |
| ✓      | "how many incidents" → document.ask carrying "incident"        |   1023ms | intent=document.ask hasExpected=true |
| ✓      | "what was the root cause" → document.ask carrying "root cause" |   1243ms | intent=document.ask hasExpected=true |
| ✓      | "what is the severity" → document.ask carrying "Severity"      |   1409ms | intent=document.ask hasExpected=true |
| ✓      | "list the action items" → document.ask carrying "Action"       |   1623ms | intent=document.ask hasExpected=true |

## data-explorer-insights (2/2)

| Status | Check                                      | Duration | Detail               |
| ------ | ------------------------------------------ | -------: | -------------------- |
| ✓      | POST /api/data/query returns 200           |     15ms | status=200 rows=50   |
| ✓      | insights field has valid shape (or absent) |          | present=true count=2 |

## data-quality (2/2)

| Status | Check                                               | Duration | Detail                                   |
| ------ | --------------------------------------------------- | -------: | ---------------------------------------- |
| ✓      | GET /api/data/quality/:queryName returns a snapshot |     99ms | status=200 rows=93                       |
| ✓      | all four quality signals are present                |          | dup=0 nulls=0.37% drift=null anomalies=0 |

## forecast (2/2)

| Status | Check                                                         | Duration | Detail                       |
| ------ | ------------------------------------------------------------- | -------: | ---------------------------- |
| ✓      | GET /api/data/forecast/:queryName returns a contract envelope |      2ms | status=200 forecastable=true |
| ✓      | historical and predicted points are present                   |          | history=93 predicted=3       |

## gridboard-rows (2/2)

| Status | Check                                               | Duration | Detail                        |
| ------ | --------------------------------------------------- | -------: | ----------------------------- |
| ✓      | POST /api/data/rows/:queryName returns rows+columns |     12ms | status=200 rows=50 columns=35 |
| ✓      | insights ride along on page 1 (or absent)           |          | present=true count=2          |

## gridboard-query-reorder (1/1)

| Status | Check                                                              | Duration | Detail                       |
| ------ | ------------------------------------------------------------------ | -------: | ---------------------------- |
| ✓      | recently-used query "gross_margin" bubbles to top with recent=true |      6ms | top=gross_margin recent=true |

## gridboard-views (5/5)

| Status | Check                                                 | Duration | Detail                                                       |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------ |
| ✓      | POST creates a view with version=1                    |      2ms | status=201 id=d33009de-3ece-4d1e-aa3f-231dc3e583b5 version=1 |
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
| ✓      | create entry                     |      1ms | status=200 entry.id=\_validation_1778676267021         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778676267021 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778676267024) |      1ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778676267024","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778676267024"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      0ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   3456ms | intent=greeting                                      |
