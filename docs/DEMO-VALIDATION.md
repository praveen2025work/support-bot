# Demo Validation Report

Generated: 2026-05-12T04:45:57.782Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (112 / 112)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-38387","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |    110ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    103ms | status=200 shape-ok=true |
| ✓      | entities                        |    103ms | status=200 shape-ok=true |
| ✓      | templates                       |    114ms | status=200 shape-ok=true |
| ✓      | settings                        |    145ms | status=200 shape-ok=true |
| ✓      | queries                         |     92ms | status=200 shape-ok=true |
| ✓      | filters                         |    101ms | status=200 shape-ok=true |
| ✓      | users                           |     91ms | status=200 shape-ok=true |
| ✓      | audit                           |    102ms | status=200 shape-ok=true |
| ✓      | schedules                       |     19ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |     90ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    103ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |     91ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    111ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |     92ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     18ms | status=200 shape-ok=true |
| ✓      | data-roles                      |     99ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    104ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    165ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    119ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    129ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    126ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    120ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    129ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    118ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    128ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    119ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    159ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    148ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    115ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    126ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    116ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    128ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    129ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    120ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    131ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    145ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    153ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |    245ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    446ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    409ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    439ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    474ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    385ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    386ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    382ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |    426ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    385ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    364ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    385ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    356ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    411ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    362ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    366ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    431ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    310ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    358ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    408ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    344ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    362ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    443ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    283ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    367ms | intent=undo                                                |
| ✓      | export as csv                |    363ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    403ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    302ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    427ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    334ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    354ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    411ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    294ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    278ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    254ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    346ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                          |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |    335ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"                              |
| ✓      | admin role → unmasked clear values                    |    388ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 0s ago — say "refresh employee_metrics" to bypass)_" |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (5/5)

| Status | Check                                              | Duration | Detail                                                                                                                                                            |
| ------ | -------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | baseline run — no drift                            |    421ms | drift=undefined                                                                                                                                                   |
| ✓      | phantom column → schemaDrift.removed reports it    |    387ms | removed=["FAKE_DROPPED_COL_FOR_TEST"]                                                                                                                             |
| ✓      | bot text includes ⚠ Schema drift suffix            |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_TEST)_" |
| ✓      | GET /api/admin/schema/drift surfaces the entry     |      1ms | count=1                                                                                                                                                           |
| ✓      | POST /api/admin/schema/acknowledge clears the flag |      2ms | status=200                                                                                                                                                        |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    281ms | status=400 code=INVALID_MESSAGE requestId=530a458d                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"69c41e90-3a31-440f-860e-37a |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    491ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    387ms | status=cached ageMs=380 |
| ✓      | 'refresh X' bypasses the cache                |    416ms | status=undefined        |
| ✓      | different filters → fresh entry               |    432ms | status=fresh            |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |    241ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      3ms | rechecked=1                |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |    336ms | status=201 id=C_VJeSS4                 |
| ✓      | GET /api/views/:id returns the same snapshot |     87ms | id=C_VJeSS4 text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    174ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    338ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    416ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    394ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    383ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    424ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778561154826) |      1ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778561154826","synonyms":["va |
| ✓      | read-back contains created entry                    |      2ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778561154826"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2950ms | intent=greeting                                      |
