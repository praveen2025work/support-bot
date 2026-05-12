# Demo Validation Report

Generated: 2026-05-12T03:00:23.351Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (76 / 76)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-9691","timestamp" |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |     23ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |     16ms | status=200 shape-ok=true |
| ✓      | entities                        |     14ms | status=200 shape-ok=true |
| ✓      | templates                       |     13ms | status=200 shape-ok=true |
| ✓      | settings                        |     13ms | status=200 shape-ok=true |
| ✓      | queries                         |     21ms | status=200 shape-ok=true |
| ✓      | filters                         |     13ms | status=200 shape-ok=true |
| ✓      | users                           |     13ms | status=200 shape-ok=true |
| ✓      | audit                           |     14ms | status=200 shape-ok=true |
| ✓      | schedules                       |      6ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |     13ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |     14ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |     12ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |     22ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |     13ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      5ms | status=200 shape-ok=true |
| ✓      | data-roles                      |     19ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |     23ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |     29ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |     23ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |     22ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |     22ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |     26ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |     20ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |     23ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |     21ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     20ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |     21ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |     22ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |     28ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |     22ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |     22ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |     20ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |     23ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |     21ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |     23ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |     28ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |     21ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |     91ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    153ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    144ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    117ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |     97ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    107ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    173ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    145ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |    102ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    100ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    127ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    159ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |     39ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |     64ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    102ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |     62ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    102ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |     64ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |     90ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |     83ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    120ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    173ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    148ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |     88ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |     96ms | intent=undo                                                |
| ✓      | export as csv                |     50ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |     64ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    156ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    129ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |     91ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    112ms | intent=analysis.distribution hasRich=true |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778554820584) |      3ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778554820584","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778554820584"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      2ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2760ms | intent=greeting                                      |
