# Demo Validation Report

Generated: 2026-05-13T04:22:44.622Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (147 / 147)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     19ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-80125","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |    249ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    723ms | status=200 shape-ok=true |
| ✓      | entities                        |    648ms | status=200 shape-ok=true |
| ✓      | templates                       |    587ms | status=200 shape-ok=true |
| ✓      | settings                        |    673ms | status=200 shape-ok=true |
| ✓      | queries                         |    712ms | status=200 shape-ok=true |
| ✓      | filters                         |    680ms | status=200 shape-ok=true |
| ✓      | users                           |    839ms | status=200 shape-ok=true |
| ✓      | audit                           |    622ms | status=200 shape-ok=true |
| ✓      | schedules                       |     35ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    739ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    650ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    685ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    956ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |   1130ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     41ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    861ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    913ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |   1113ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |   1252ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |   1426ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |   1019ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |   1085ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |   1203ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |   1124ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |   1192ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |   1347ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |   1515ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |   1701ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |   1837ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |   1688ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |   1562ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |   1633ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |   1789ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    333ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |   2059ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |   1862ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |   3958ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |   2264ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    759ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |   1034ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    804ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    834ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    810ms | intent=query.list status=200 |
| ✓      | finance → list queries     |   3286ms | intent=query.list status=200 |
| ✓      | engineering → list queries |   2289ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |   1861ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    582ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    647ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    790ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    719ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    886ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    796ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    844ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    867ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    973ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    969ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |   1006ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    875ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    945ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    911ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    964ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    965ms | intent=undo                                                |
| ✓      | export as csv                |   1160ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |   1078ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    753ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    761ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    771ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    804ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    921ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    903ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    857ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    999ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    810ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status                                  | Check                                                 | Duration | Detail                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓                                       | detection flagged name + salary                       |   2185ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                    |
| ✓                                       | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                   |
| ✓                                       | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                         |
| ✓                                       | bot text notes masking applied                        |          | text="💡 **E002** has the highest **tenure_months** at 48; **E019** is the lowest at 6.                                         |
| 💡 **US** accounts for 57% of rows by " |
| ✓                                       | admin role → unmasked clear values                    |    610ms | name="Alice Johnson" salary=165000                                                                                              |
| ✓                                       | admin role → bot text says 'shown UNMASKED — audited' |          | text="): _(2 PII columns shown UNMASKED — audited: name, salary)_ _(cached 1s ago — say "refresh employee_metrics" to bypass)_" |
| ✓                                       | admin role → piiSummary.unmasked=true                 |          | unmasked=true                                                                                                                   |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |    711ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |    733ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 2ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 2ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 711ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    639ms | status=400 code=INVALID_MESSAGE requestId=d8416364                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"ecf61658-3b7a-401d-8219-1fc |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    780ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    822ms | status=cached ageMs=777 |
| ✓      | 'refresh X' bypasses the cache                |    844ms | status=undefined        |
| ✓      | different filters → fresh entry               |    866ms | status=fresh            |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |   1973ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=18                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                           |
| ------ | ------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      2ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                 |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="default",intent="query.filter_form",status="success"} 1 \| chat_requests_total{group="default",intent="query.execute",st |
| ✓      | process gauges present                            |          | checked process_resident_memory_bytes + process_uptime_seconds                                                                                                   |

## security-headers (3/3)

| Status | Check                                    | Duration | Detail                                                                                        |
| ------ | ---------------------------------------- | -------: | --------------------------------------------------------------------------------------------- |
| ✓      | X-Content-Type-Options: nosniff          |      1ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check                                            | Duration | Detail                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------ |
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     38ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |   1323ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      4ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      1ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      3ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   3188ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   1813ms | status=201 id=liGG1Y8K                 |
| ✓      | GET /api/views/:id returns the same snapshot |    361ms | id=liGG1Y8K text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    203ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    589ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    973ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    893ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    937ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    782ms | intent=followup.summary                                                                                         |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |   1219ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |    911ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    320ms | ok=true resultsType=object |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    646ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## root-cause (2/2)

| Status | Check                                                     | Duration | Detail                                               |
| ------ | --------------------------------------------------------- | -------: | ---------------------------------------------------- |
| ✓      | routes "what is driving the change" → analysis.root_cause |    695ms | intent=analysis.root_cause conf=0.7842248725740287   |
| ✓      | richContent.data.root_cause has valid shape               |          | kind=concentration metric=DurationMax contributors=5 |

## data-explorer-insights (2/2)

| Status | Check                                      | Duration | Detail               |
| ------ | ------------------------------------------ | -------: | -------------------- |
| ✓      | POST /api/data/query returns 200           |      3ms | status=200 rows=50   |
| ✓      | insights field has valid shape (or absent) |          | present=true count=2 |

## data-quality (2/2)

| Status | Check                                               | Duration | Detail                                   |
| ------ | --------------------------------------------------- | -------: | ---------------------------------------- |
| ✓      | GET /api/data/quality/:queryName returns a snapshot |    101ms | status=200 rows=93                       |
| ✓      | all four quality signals are present                |          | dup=0 nulls=0.37% drift=null anomalies=0 |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      2ms | status=200 entry.id=\_validation_1778646161376         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778646161376 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778646161380) |      2ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778646161380","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      1ms | status=200 body={"success":true,"deleted":"\_validation_1778646161380"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      0ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   3238ms | intent=greeting                                      |
