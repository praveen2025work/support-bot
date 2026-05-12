# Demo Validation Report

Generated: 2026-05-12T13:03:36.899Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (118 / 118)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     18ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-84642","timestamp |
| ✓      | mock-api root      |      4ms | status=200                                                                                       |
| ✓      | next.js root       |    170ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    568ms | status=200 shape-ok=true |
| ✓      | entities                        |    302ms | status=200 shape-ok=true |
| ✓      | templates                       |    298ms | status=200 shape-ok=true |
| ✓      | settings                        |    328ms | status=200 shape-ok=true |
| ✓      | queries                         |    439ms | status=200 shape-ok=true |
| ✓      | filters                         |    384ms | status=200 shape-ok=true |
| ✓      | users                           |    401ms | status=200 shape-ok=true |
| ✓      | audit                           |    318ms | status=200 shape-ok=true |
| ✓      | schedules                       |     18ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    415ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    331ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    336ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    418ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    353ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     20ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    358ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    469ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    498ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    489ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    553ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    136ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   1003ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    537ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    621ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    637ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    671ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    679ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    670ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    139ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    735ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    764ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    779ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    768ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    916ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    953ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    916ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    933ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2734ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    524ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    413ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    386ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    391ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    409ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   2838ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   2119ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1675ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    535ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    374ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    425ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    373ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    288ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    287ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    411ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    379ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    391ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    367ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    484ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    400ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    463ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    473ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    240ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    374ms | intent=undo                                                |
| ✓      | export as csv                |    401ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    328ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    392ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    342ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    415ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    381ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    396ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    370ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    354ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    416ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    374ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                          |
| ------ | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |   1924ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_"                              |
| ✓      | admin role → unmasked clear values                    |    494ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_" |
| ✓      | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                                | Duration | Detail                                                                                                                                                            |
| ------ | ---------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | baseline run — no drift                              |    422ms | drift=undefined                                                                                                                                                   |
| ✓      | phantom column → schemaDrift.removed reports it      |    513ms | removed=["FAKE_DROPPED_COL_FOR_TEST"]                                                                                                                             |
| ✓      | bot text includes ⚠ Schema drift suffix              |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_TEST)_" |
| ✓      | GET /api/admin/schema/drift surfaces the entry       |      1ms | count=1                                                                                                                                                           |
| ✓      | POST /api/admin/schema/acknowledge clears the flag   |      2ms | status=200                                                                                                                                                        |
| ✓      | acknowledge response includes cacheEvicted counter   |          | cacheEvicted=1                                                                                                                                                    |
| ✓      | post-ack chat call surfaces no drift (cache evicted) |    482ms | drift=undefined                                                                                                                                                   |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    325ms | status=400 code=INVALID_MESSAGE requestId=d87ee36e                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"a3de5c10-1ae4-434e-8f25-c10 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    467ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    461ms | status=cached ageMs=447 |
| ✓      | 'refresh X' bypasses the cache                |    443ms | status=undefined        |
| ✓      | different filters → fresh entry               |    470ms | status=fresh            |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1315ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      4ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      2ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      2ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   2932ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1199ms | status=201 id=XDOyLO9H                 |
| ✓      | GET /api/views/:id returns the same snapshot |     96ms | id=XDOyLO9H text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |     67ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    429ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    490ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    453ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    576ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    381ms | intent=followup.summary                                                                                         |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778591014060) |      4ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778591014060","synonyms":["va |
| ✓      | read-back contains created entry                    |      2ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      2ms | status=200 body={"success":true,"deleted":"\_validation_1778591014060"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2830ms | intent=greeting                                      |
