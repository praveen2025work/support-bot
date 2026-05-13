# Demo Validation Report

Generated: 2026-05-13T12:17:40.641Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (158 / 158)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     16ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-70374","timestamp |
| ✓      | mock-api root      |      3ms | status=200                                                                                       |
| ✓      | next.js root       |    406ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |   1063ms | status=200 shape-ok=true |
| ✓      | entities                        |    870ms | status=200 shape-ok=true |
| ✓      | templates                       |    881ms | status=200 shape-ok=true |
| ✓      | settings                        |   1016ms | status=200 shape-ok=true |
| ✓      | queries                         |    934ms | status=200 shape-ok=true |
| ✓      | filters                         |    882ms | status=200 shape-ok=true |
| ✓      | users                           |    929ms | status=200 shape-ok=true |
| ✓      | audit                           |    848ms | status=200 shape-ok=true |
| ✓      | schedules                       |     50ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |   1012ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    880ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |   1115ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |   1408ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |   1518ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     72ms | status=200 shape-ok=true |
| ✓      | data-roles                      |   1133ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |   1077ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |   1410ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |   1251ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |   1435ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   1672ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   1662ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   1590ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   1632ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   1970ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   1943ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   1933ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   2545ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   2086ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   2865ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   2968ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   2552ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   2547ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    532ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   3010ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   3018ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   2842ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   4288ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    626ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    897ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    759ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |   1193ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |   1438ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   3216ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   2163ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1925ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    755ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |   1041ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    843ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    625ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    892ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    869ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |   1598ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    976ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    927ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    823ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |   1139ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |   1120ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    791ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |   1008ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    904ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    808ms | intent=undo                                                |
| ✓      | export as csv                |    975ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |   1216ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    909ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    975ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |   1078ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |   1112ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    892ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    728ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |   1220ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |   1019ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    572ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status                                  | Check                                                 | Duration | Detail                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓                                       | detection flagged name + salary                       |   2051ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓                                       | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓                                       | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓                                       | bot text notes masking applied                        |          | text="💡 **E002** has the highest **tenure_months** at 48; **E019** is the lowest at 6.                                         |
| 💡 **US** accounts for 57% of rows by " |
| ✓                                       | admin role → unmasked clear values                    |    661ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓                                       | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_" |
| ✓                                       | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |   1157ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |   1102ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 2ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 2ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 1365ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    959ms | status=400 code=INVALID_MESSAGE requestId=b3af1ec3                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      0ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"e4f8b40c-1b57-48be-a88c-db4 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                   |
| ------ | --------------------------------------------- | -------: | ------------------------ |
| ✓      | first run → cacheStatus.status=fresh          |   1210ms | status=fresh             |
| ✓      | identical request → cacheStatus.status=cached |    999ms | status=cached ageMs=1062 |
| ✓      | 'refresh X' bypasses the cache                |    931ms | status=undefined         |
| ✓      | different filters → fresh entry               |   1054ms | status=fresh             |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   2630ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=27                                       |
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
| ✓      | X-Content-Type-Options: nosniff          |      2ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check                                            | Duration | Detail                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------ |
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     37ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1594ms | total=1 ok=1 unreachable=0 |
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
| ✓      | chat works after concurrent retrains            |   3261ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1675ms | status=201 id=SgVIv_r2                 |
| ✓      | GET /api/views/:id returns the same snapshot |    415ms | id=SgVIv_r2 text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    340ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    614ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    839ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    911ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |   1198ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |   1235ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   1588ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |   1128ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    441ms | ok=true resultsType=object |

## search-personalisation (2/2)

| Status | Check                                              | Duration | Detail                          |
| ------ | -------------------------------------------------- | -------: | ------------------------------- |
| ✓      | pnl_summary score increases after 6 picks          |    923ms | baseline=2.66 personalised=5.66 |
| ✓      | other users are unaffected by another user's picks |          | baseline=2.66 other=2.66        |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    413ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## root-cause (2/2)

| Status | Check                                                     | Duration | Detail                                               |
| ------ | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| ✓      | routes "what is driving the change" → analysis.root_cause |   1266ms | intent=analysis.root_cause conf=0.7844570625436028   |
| ✓      | richContent.data.root_cause has valid shape               |          | kind=concentration metric=DurationMax contributors=5 |

## data-explorer-insights (2/2)

| Status | Check                                      | Duration | Detail               |
| ------ | ------------------------------------------ | -------: | -------------------- |
| ✓      | POST /api/data/query returns 200           |     14ms | status=200 rows=50   |
| ✓      | insights field has valid shape (or absent) |          | present=true count=2 |

## data-quality (2/2)

| Status | Check                                               | Duration | Detail                                   |
| ------ | --------------------------------------------------- | -------: | ---------------------------------------- |
| ✓      | GET /api/data/quality/:queryName returns a snapshot |     91ms | status=200 rows=93                       |
| ✓      | all four quality signals are present                |          | dup=0 nulls=0.37% drift=null anomalies=0 |

## forecast (2/2)

| Status | Check                                                         | Duration | Detail                       |
| ------ | ------------------------------------------------------------- | -------: | ---------------------------- |
| ✓      | GET /api/data/forecast/:queryName returns a contract envelope |      2ms | status=200 forecastable=true |
| ✓      | historical and predicted points are present                   |          | history=93 predicted=3       |

## gridboard-rows (1/1)

| Status | Check                                               | Duration | Detail                        |
| ------ | --------------------------------------------------- | -------: | ----------------------------- |
| ✓      | POST /api/data/rows/:queryName returns rows+columns |     10ms | status=200 rows=10 columns=35 |

## gridboard-views (5/5)

| Status | Check                                                 | Duration | Detail                                                       |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------ |
| ✓      | POST creates a view with version=1                    |      2ms | status=201 id=fbc2e8f7-4259-4903-a88d-ae7ba95f3c2f version=1 |
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
| ✓      | create entry                     |      2ms | status=200 entry.id=\_validation_1778674657257         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778674657257 |
| ✓      | delete entry (cleanup)           |      0ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778674657260) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778674657260","synonyms":["va |
| ✓      | read-back contains created entry                    |      0ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778674657260"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      0ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   3378ms | intent=greeting                                      |
