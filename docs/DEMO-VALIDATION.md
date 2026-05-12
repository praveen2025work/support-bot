# Demo Validation Report

Generated: 2026-05-12T04:10:38.203Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (107 / 107)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-20314","timestamp |
| ✓      | mock-api root      |      3ms | status=200                                                                                       |
| ✓      | next.js root       |    121ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    378ms | status=200 shape-ok=true |
| ✓      | entities                        |    295ms | status=200 shape-ok=true |
| ✓      | templates                       |    301ms | status=200 shape-ok=true |
| ✓      | settings                        |    367ms | status=200 shape-ok=true |
| ✓      | queries                         |    400ms | status=200 shape-ok=true |
| ✓      | filters                         |    295ms | status=200 shape-ok=true |
| ✓      | users                           |    375ms | status=200 shape-ok=true |
| ✓      | audit                           |    311ms | status=200 shape-ok=true |
| ✓      | schedules                       |     15ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    404ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    324ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    335ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    429ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    349ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     16ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    352ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    431ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    524ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    592ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    483ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    438ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    498ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    566ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    635ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    636ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    126ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    655ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    756ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   1562ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    905ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    720ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    725ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    762ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    899ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    982ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    827ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    893ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2073ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    410ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    489ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    426ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    491ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    438ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2988ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   2145ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1972ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    472ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    290ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    338ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    343ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    322ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    361ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    357ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    344ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    332ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    363ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    559ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    479ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    538ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    499ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    261ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    380ms | intent=undo                                                |
| ✓      | export as csv                |    382ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    455ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    408ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    398ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    455ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    486ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    227ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    328ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    321ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    325ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    319ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                            |
| ------ | ----------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |   1759ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                      |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                     |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                           |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ \_⚠ Schema drift: 2 columns re" |
| ✓      | admin role → unmasked clear values                    |    565ms | name="Alice Johnson" salary=165000                                                                                                |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_"   |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                     |

## drift (5/5)

| Status | Check                                              | Duration | Detail                                                                                                                                                            |
| ------ | -------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | baseline run — no drift                            |    466ms | drift=undefined                                                                                                                                                   |
| ✓      | phantom column → schemaDrift.removed reports it    |    426ms | removed=["FAKE_DROPPED_COL_FOR_TEST"]                                                                                                                             |
| ✓      | bot text includes ⚠ Schema drift suffix            |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_TEST)_" |
| ✓      | GET /api/admin/schema/drift surfaces the entry     |      1ms | count=1                                                                                                                                                           |
| ✓      | POST /api/admin/schema/acknowledge clears the flag |      2ms | status=200                                                                                                                                                        |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    272ms | status=400 code=INVALID_MESSAGE requestId=9a5994fe                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"3383600d-a506-4b18-9183-62f |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    413ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    406ms | status=cached ageMs=398 |
| ✓      | 'refresh X' bypasses the cache                |    437ms | status=undefined        |
| ✓      | different filters → fresh entry               |    475ms | status=fresh            |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1041ms | status=201 id=VGPhQ43K                 |
| ✓      | GET /api/views/:id returns the same snapshot |     91ms | id=VGPhQ43K text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |     72ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    409ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    454ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    458ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    486ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    354ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778559035179) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778559035179","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778559035179"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   3019ms | intent=greeting                                      |
