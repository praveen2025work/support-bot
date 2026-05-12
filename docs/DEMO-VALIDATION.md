# Demo Validation Report

Generated: 2026-05-12T03:16:03.415Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (81 / 81)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     21ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-26940","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |     35ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |     25ms | status=200 shape-ok=true |
| ✓      | entities                        |     22ms | status=200 shape-ok=true |
| ✓      | templates                       |     22ms | status=200 shape-ok=true |
| ✓      | settings                        |     21ms | status=200 shape-ok=true |
| ✓      | queries                         |     20ms | status=200 shape-ok=true |
| ✓      | filters                         |     20ms | status=200 shape-ok=true |
| ✓      | users                           |     20ms | status=200 shape-ok=true |
| ✓      | audit                           |     21ms | status=200 shape-ok=true |
| ✓      | schedules                       |      8ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |     21ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |     20ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |     20ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |     26ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |     20ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      6ms | status=200 shape-ok=true |
| ✓      | data-roles                      |     19ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |     27ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |     29ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |     27ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |     28ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |     31ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |     28ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |     29ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     29ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |     28ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |     29ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |     28ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |     29ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |     39ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |     31ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |     31ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |     32ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |     28ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |     96ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    142ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    157ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |     86ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    101ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |     61ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    115ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    109ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |     96ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    113ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    176ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    150ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |     46ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    136ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |     47ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    109ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |     67ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |     45ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    137ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |     80ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    134ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    141ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    142ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |     92ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    145ms | intent=undo                                                |
| ✓      | export as csv                |     50ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    112ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    145ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |     76ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |     73ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |     98ms | intent=analysis.distribution hasRich=true |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    138ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    133ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    182ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    150ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    116ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778555760873) |      4ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778555760873","synonyms":["va |
| ✓      | read-back contains created entry                    |      2ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      2ms | status=200 body={"success":true,"deleted":"\_validation_1778555760873"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      0ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2534ms | intent=greeting                                      |
