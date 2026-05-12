# Demo Validation Report

Generated: 2026-05-12T03:09:15.637Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (79 / 79)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-18160","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |     24ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    180ms | status=200 shape-ok=true |
| ✓      | entities                        |    114ms | status=200 shape-ok=true |
| ✓      | templates                       |     99ms | status=200 shape-ok=true |
| ✓      | settings                        |    103ms | status=200 shape-ok=true |
| ✓      | queries                         |    254ms | status=200 shape-ok=true |
| ✓      | filters                         |    113ms | status=200 shape-ok=true |
| ✓      | users                           |    155ms | status=200 shape-ok=true |
| ✓      | audit                           |    114ms | status=200 shape-ok=true |
| ✓      | schedules                       |      9ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    157ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    113ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    111ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    165ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    115ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      5ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    109ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    183ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |     67ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    387ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    230ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    190ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    213ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |     40ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    208ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    219ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |     37ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    229ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    227ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    223ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    252ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    273ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    260ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    263ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |     53ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    501ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    369ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    294ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |    113ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    182ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    168ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    213ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    171ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    316ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    281ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1899ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1582ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    159ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    141ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    131ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    118ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    152ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    151ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    157ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    150ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    154ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    159ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    235ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    162ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    250ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    133ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    107ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    135ms | intent=undo                                                |
| ✓      | export as csv                |    118ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    183ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |     98ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    182ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    132ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    166ms | intent=analysis.distribution hasRich=true |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    109ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    210ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    163ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778555352886) |      4ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778555352886","synonyms":["va |
| ✓      | read-back contains created entry                    |      2ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      2ms | status=200 body={"success":true,"deleted":"\_validation_1778555352886"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      2ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2741ms | intent=greeting                                      |
