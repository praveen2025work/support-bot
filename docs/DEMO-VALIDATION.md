# Demo Validation Report

Generated: 2026-05-12T03:47:53.981Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (96 / 96)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     38ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-89864","timestamp |
| ✓      | mock-api root      |      8ms | status=200                                                                                       |
| ✓      | next.js root       |    174ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    779ms | status=200 shape-ok=true |
| ✓      | entities                        |    554ms | status=200 shape-ok=true |
| ✓      | templates                       |    231ms | status=200 shape-ok=true |
| ✓      | settings                        |    216ms | status=200 shape-ok=true |
| ✓      | queries                         |    237ms | status=200 shape-ok=true |
| ✓      | filters                         |    445ms | status=200 shape-ok=true |
| ✓      | users                           |    493ms | status=200 shape-ok=true |
| ✓      | audit                           |    591ms | status=200 shape-ok=true |
| ✓      | schedules                       |     58ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    420ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    251ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    268ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    280ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    272ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     11ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    269ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    282ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    349ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    602ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    479ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    455ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    491ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    464ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    477ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    482ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     85ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    495ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    491ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    526ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    711ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    665ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    716ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    626ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    515ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    605ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    546ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    560ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |    262ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    244ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    232ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    301ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    285ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    270ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    270ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    319ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |    337ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    253ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    341ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    291ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    303ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    319ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    265ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    301ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    316ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    265ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    256ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    346ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    382ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    347ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    240ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    174ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    319ms | intent=undo                                                |
| ✓      | export as csv                |    229ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    249ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    295ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    221ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    276ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    304ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    303ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    312ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    361ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    422ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    274ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                               |
| ------ | ----------------------------------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |    320ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"         |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                        |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                              |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"                   |
| ✓      | admin role → unmasked clear values                    |    312ms | name="Alice Johnson" salary=165000                                                                                   |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns shown UNMASKED — audited: name, salary)\_" |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                        |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |    792ms | status=201 id=AwrBgyoE                 |
| ✓      | GET /api/views/:id returns the same snapshot |     96ms | id=AwrBgyoE text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |     28ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    251ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    337ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    282ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    310ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    223ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778557671110) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778557671110","synonyms":["va |
| ✓      | read-back contains created entry                    |      2ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778557671110"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2865ms | intent=greeting                                      |
