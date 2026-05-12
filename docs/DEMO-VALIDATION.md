# Demo Validation Report

Generated: 2026-05-12T04:57:54.470Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (116 / 116)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-49777","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |    134ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    472ms | status=200 shape-ok=true |
| ✓      | entities                        |    355ms | status=200 shape-ok=true |
| ✓      | templates                       |    298ms | status=200 shape-ok=true |
| ✓      | settings                        |    295ms | status=200 shape-ok=true |
| ✓      | queries                         |    398ms | status=200 shape-ok=true |
| ✓      | filters                         |    366ms | status=200 shape-ok=true |
| ✓      | users                           |    390ms | status=200 shape-ok=true |
| ✓      | audit                           |    309ms | status=200 shape-ok=true |
| ✓      | schedules                       |     18ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    397ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    318ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    328ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    385ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    364ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     18ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    346ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    404ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    509ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    607ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    488ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    129ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    559ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    510ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    607ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    613ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    649ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    643ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    653ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    130ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    722ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    745ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    749ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    770ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    850ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    917ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    906ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    907ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2720ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    359ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    379ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    399ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    496ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    355ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2851ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1979ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1672ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    486ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    348ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    410ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    277ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    265ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    384ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    396ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    353ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    402ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    356ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    472ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    405ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    371ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    479ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    271ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    319ms | intent=undo                                                |
| ✓      | export as csv                |    310ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    538ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    355ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    342ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    436ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    334ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    359ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    394ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    354ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    362ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    280ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                          |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |   1798ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"                              |
| ✓      | admin role → unmasked clear values                    |    419ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 0s ago — say "refresh employee_metrics" to bypass)_" |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (5/5)

| Status | Check                                              | Duration | Detail                                                                                                                                                            |
| ------ | -------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | baseline run — no drift                            |    372ms | drift=undefined                                                                                                                                                   |
| ✓      | phantom column → schemaDrift.removed reports it    |    460ms | removed=["FAKE_DROPPED_COL_FOR_TEST"]                                                                                                                             |
| ✓      | bot text includes ⚠ Schema drift suffix            |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_TEST)_" |
| ✓      | GET /api/admin/schema/drift surfaces the entry     |      1ms | count=1                                                                                                                                                           |
| ✓      | POST /api/admin/schema/acknowledge clears the flag |      2ms | status=200                                                                                                                                                        |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    251ms | status=400 code=INVALID_MESSAGE requestId=0687aa70                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"feb3e284-8417-40cf-af89-6bf |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    464ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    473ms | status=cached ageMs=492 |
| ✓      | 'refresh X' bypasses the cache                |    394ms | status=undefined        |
| ✓      | different filters → fresh entry               |    503ms | status=fresh            |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1246ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      5ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      2ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      2ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   2836ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   2125ms | status=201 id=-nLz3EFR                 |
| ✓      | GET /api/views/:id returns the same snapshot |    133ms | id=-nLz3EFR text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |     97ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    474ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    363ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    419ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    472ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    264ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778561871563) |      3ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778561871563","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778561871563"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2901ms | intent=greeting                                      |
