# Demo Validation Report

Generated: 2026-05-12T03:30:50.887Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (90 / 90)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-59953","timestamp |
| ✓      | mock-api root      |      3ms | status=200                                                                                       |
| ✓      | next.js root       |     65ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |     27ms | status=200 shape-ok=true |
| ✓      | entities                        |     24ms | status=200 shape-ok=true |
| ✓      | templates                       |     24ms | status=200 shape-ok=true |
| ✓      | settings                        |     24ms | status=200 shape-ok=true |
| ✓      | queries                         |     24ms | status=200 shape-ok=true |
| ✓      | filters                         |     23ms | status=200 shape-ok=true |
| ✓      | users                           |     22ms | status=200 shape-ok=true |
| ✓      | audit                           |     23ms | status=200 shape-ok=true |
| ✓      | schedules                       |      9ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |     23ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |     23ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |     24ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |     34ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |     26ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      6ms | status=200 shape-ok=true |
| ✓      | data-roles                      |     24ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |     41ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |     49ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |     46ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |     44ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |     41ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |     43ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |     42ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |     47ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |     42ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     44ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |     41ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |     43ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |     43ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |     34ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |     39ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |     47ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |     35ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |     42ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |     41ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |     40ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |     49ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   1725ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    167ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    223ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    231ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    170ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    169ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2749ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1763ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1755ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    240ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    207ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    187ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    119ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    194ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    172ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    183ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    194ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    137ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    202ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    239ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    239ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    214ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    237ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |     98ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    175ms | intent=undo                                                |
| ✓      | export as csv                |    187ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    235ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    172ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    190ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    147ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    105ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    213ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    176ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    146ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    104ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    188ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (4/4)

| Status | Check                                  | Duration | Detail                                                                                                       |
| ------ | -------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------ |
| ✓      | detection flagged name + salary        |    263ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":" |
| ✓      | name value is masked (not literal)     |          | firstName="A\***\* J\*\*\***"                                                                                |
| ✓      | salary value is bucketed (not literal) |          | firstSalary="~$160,000"                                                                                      |
| ✓      | bot text notes masking applied         |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"           |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    110ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    389ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    385ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    298ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    133ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778556648119) |      3ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778556648119","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778556648119"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2762ms | intent=greeting                                      |
