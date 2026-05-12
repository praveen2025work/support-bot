# Demo Validation Report

Generated: 2026-05-12T03:39:52.827Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (93 / 93)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     39ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-68107","timestamp |
| ✓      | mock-api root      |      5ms | status=200                                                                                       |
| ✓      | next.js root       |     73ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    209ms | status=200 shape-ok=true |
| ✓      | entities                        |    198ms | status=200 shape-ok=true |
| ✓      | templates                       |    170ms | status=200 shape-ok=true |
| ✓      | settings                        |    163ms | status=200 shape-ok=true |
| ✓      | queries                         |    272ms | status=200 shape-ok=true |
| ✓      | filters                         |    187ms | status=200 shape-ok=true |
| ✓      | users                           |    232ms | status=200 shape-ok=true |
| ✓      | audit                           |    182ms | status=200 shape-ok=true |
| ✓      | schedules                       |      9ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    256ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    168ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    184ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    193ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    178ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      9ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    190ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    204ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    103ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    246ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    254ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    279ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    295ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    312ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    325ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    383ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     60ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    346ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    373ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    383ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    399ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    413ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    428ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    455ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |     72ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    558ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    545ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    543ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2358ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    223ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    241ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    248ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    212ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    250ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2745ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1890ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1603ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    296ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    272ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    210ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    176ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    173ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    123ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    173ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    228ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    200ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    148ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    215ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    384ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    346ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    351ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    164ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    168ms | intent=undo                                                |
| ✓      | export as csv                |    176ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    299ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    294ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    212ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    269ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    270ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    329ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    257ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    202ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    176ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    245ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (4/4)

| Status | Check                                  | Duration | Detail                                                                                                       |
| ------ | -------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------ |
| ✓      | detection flagged name + salary        |   1705ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":" |
| ✓      | name value is masked (not literal)     |          | firstName="A\***\* J\*\*\***"                                                                                |
| ✓      | salary value is bucketed (not literal) |          | firstSalary="~$160,000"                                                                                      |
| ✓      | bot text notes masking applied         |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |    173ms | status=201 id=yUs6Z9iH                 |
| ✓      | GET /api/views/:id returns the same snapshot |     69ms | id=yUs6Z9iH text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    109ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    227ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    256ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    338ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    263ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    213ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778557190062) |      3ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778557190062","synonyms":["va |
| ✓      | read-back contains created entry                    |      2ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      2ms | status=200 body={"success":true,"deleted":"\_validation_1778557190062"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2757ms | intent=greeting                                      |
