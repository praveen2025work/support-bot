# Demo Validation Report

Generated: 2026-05-12T02:54:56.093Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (64 / 64)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     27ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-4227","timestamp" |
| ✓      | mock-api root      |      3ms | status=200                                                                                       |
| ✓      | next.js root       |     29ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |     22ms | status=200 shape-ok=true |
| ✓      | entities                        |     15ms | status=200 shape-ok=true |
| ✓      | templates                       |     15ms | status=200 shape-ok=true |
| ✓      | settings                        |     15ms | status=200 shape-ok=true |
| ✓      | queries                         |     15ms | status=200 shape-ok=true |
| ✓      | filters                         |     15ms | status=200 shape-ok=true |
| ✓      | users                           |     20ms | status=200 shape-ok=true |
| ✓      | audit                           |     25ms | status=200 shape-ok=true |
| ✓      | schedules                       |     13ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |     22ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |     18ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |     24ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |     35ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |     20ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      6ms | status=200 shape-ok=true |
| ✓      | data-roles                      |     15ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |     28ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |     35ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |     36ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |     39ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |     40ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |     31ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |     35ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     33ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |     35ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |     40ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |     42ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |     27ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |     31ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |     30ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |     31ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |     24ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |     26ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |     23ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   1578ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |     98ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |     31ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    126ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |     38ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    109ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2564ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1682ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1423ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    167ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |     26ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |     60ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    127ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    215ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    181ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |     78ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |     77ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |     96ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    117ms | intent=followup.top_n expected=followup.top_n       |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    166ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    148ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |     71ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    109ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |     64ms | intent=analysis.distribution hasRich=true |
