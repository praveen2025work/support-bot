# Demo Validation Report

Generated: 2026-05-12T03:24:56.941Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (86 / 86)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     31ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-45330","timestamp |
| ✓      | mock-api root      |      7ms | status=200                                                                                       |
| ✓      | next.js root       |     78ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    215ms | status=200 shape-ok=true |
| ✓      | entities                        |    155ms | status=200 shape-ok=true |
| ✓      | templates                       |    249ms | status=200 shape-ok=true |
| ✓      | settings                        |     26ms | status=200 shape-ok=true |
| ✓      | queries                         |    317ms | status=200 shape-ok=true |
| ✓      | filters                         |    133ms | status=200 shape-ok=true |
| ✓      | users                           |    224ms | status=200 shape-ok=true |
| ✓      | audit                           |    143ms | status=200 shape-ok=true |
| ✓      | schedules                       |      8ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    224ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    144ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    157ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    146ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    142ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      6ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    149ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    212ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |     72ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    314ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    274ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    206ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    225ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |     39ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    235ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    226ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     40ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    252ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    247ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    275ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    284ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    281ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    296ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    313ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |     42ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    386ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    374ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    359ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |    135ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    168ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    129ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    126ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    191ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    181ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    492ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    168ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |    219ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    179ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    122ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    163ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    158ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    154ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    166ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    156ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    151ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    163ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    151ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    174ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    158ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    215ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    203ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |     94ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    140ms | intent=undo                                                |
| ✓      | export as csv                |    179ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |     94ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    146ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |     73ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    135ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    150ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    184ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    173ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    187ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    180ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    130ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    189ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    250ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    205ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    396ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    155ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778556294124) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778556294124","synonyms":["va |
| ✓      | read-back contains created entry                    |      6ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778556294124"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      2ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2806ms | intent=greeting                                      |
