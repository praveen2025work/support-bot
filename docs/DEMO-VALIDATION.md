# Demo Validation Report

Generated: 2026-05-12T03:54:22.294Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (101 / 101)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     18ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-2274","timestamp" |
| ✓      | mock-api root      |      3ms | status=200                                                                                       |
| ✓      | next.js root       |     88ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    299ms | status=200 shape-ok=true |
| ✓      | entities                        |    241ms | status=200 shape-ok=true |
| ✓      | templates                       |    246ms | status=200 shape-ok=true |
| ✓      | settings                        |    248ms | status=200 shape-ok=true |
| ✓      | queries                         |    353ms | status=200 shape-ok=true |
| ✓      | filters                         |    255ms | status=200 shape-ok=true |
| ✓      | users                           |    291ms | status=200 shape-ok=true |
| ✓      | audit                           |    216ms | status=200 shape-ok=true |
| ✓      | schedules                       |     13ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    323ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    257ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    225ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    239ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    232ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     13ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    237ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    295ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    387ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    529ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    386ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    384ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    428ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    445ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    490ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    519ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    109ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    560ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    588ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    621ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    681ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    719ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    816ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    613ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    713ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    845ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    675ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    681ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   1822ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    308ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    338ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    393ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    391ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    386ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2804ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   1924ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1639ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    379ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    336ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    334ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    322ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    329ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    264ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    275ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    337ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    406ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    361ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    527ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    408ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    439ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    453ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    202ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    341ms | intent=undo                                                |
| ✓      | export as csv                |    244ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    291ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    285ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    304ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    304ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    321ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    295ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    352ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    320ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    328ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    359ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                               |
| ------ | ----------------------------------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |    419ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"         |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                        |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                              |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"                   |
| ✓      | admin role → unmasked clear values                    |    368ms | name="Alice Johnson" salary=165000                                                                                   |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns shown UNMASKED — audited: name, salary)\_" |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                        |

## drift (5/5)

| Status | Check                                              | Duration | Detail                                                                                                                                                            |
| ------ | -------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | baseline run — no drift                            |    462ms | drift=undefined                                                                                                                                                   |
| ✓      | phantom column → schemaDrift.removed reports it    |    429ms | removed=["FAKE_DROPPED_COL_FOR_TEST"]                                                                                                                             |
| ✓      | bot text includes ⚠ Schema drift suffix            |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_TEST)_" |
| ✓      | GET /api/admin/schema/drift surfaces the entry     |      1ms | count=1                                                                                                                                                           |
| ✓      | POST /api/admin/schema/acknowledge clears the flag |      2ms | status=200                                                                                                                                                        |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1435ms | status=201 id=OGJacnjX                 |
| ✓      | GET /api/views/:id returns the same snapshot |     76ms | id=OGJacnjX text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |     75ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    263ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    442ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    424ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    386ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    317ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778558059316) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778558059316","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778558059316"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2973ms | intent=greeting                                      |
