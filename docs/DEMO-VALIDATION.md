# Demo Validation Report

Generated: 2026-05-13T03:22:53.651Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (138 / 138)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     18ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-21842","timestamp |
| ✓      | mock-api root      |      2ms | status=200                                                                                       |
| ✓      | next.js root       |    233ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |    183ms | status=200 shape-ok=true |
| ✓      | entities                        |    171ms | status=200 shape-ok=true |
| ✓      | templates                       |    224ms | status=200 shape-ok=true |
| ✓      | settings                        |    160ms | status=200 shape-ok=true |
| ✓      | queries                         |    158ms | status=200 shape-ok=true |
| ✓      | filters                         |    191ms | status=200 shape-ok=true |
| ✓      | users                           |    181ms | status=200 shape-ok=true |
| ✓      | audit                           |    160ms | status=200 shape-ok=true |
| ✓      | schedules                       |     28ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |    185ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |    180ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |    161ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |    206ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |    177ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |     26ms | status=200 shape-ok=true |
| ✓      | data-roles                      |    157ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |    202ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |    206ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |    213ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |    277ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |    211ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |    209ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |    269ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |    212ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |    210ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |    224ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |    231ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |    232ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |    234ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |    243ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |    242ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |    252ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |    248ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |    243ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |    263ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |    272ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |    249ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |    384ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |    523ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |    721ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |    752ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |    821ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |    729ms | intent=query.list status=200 |
| ✓      | finance → list queries     |    581ms | intent=query.list status=200 |
| ✓      | engineering → list queries |    557ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |    612ms | intent=query.list status=200 |

## chat-followup (10/10)

| Status | Check                              | Duration | Detail                                              |
| ------ | ---------------------------------- | -------: | --------------------------------------------------- |
| ✓      | load pnl_lineage                   |    627ms | intent=query.execute hasRich=true                   |
| ✓      | "group by region"                  |    535ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "break it down by location"        |    610ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "split by region"                  |    620ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "per masterbookname"               |    687ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "for each feedname"                |    601ms | intent=followup.group_by expected=followup.group_by |
| ✓      | "sort by avg_completedontime desc" |    550ms | intent=followup.sort expected=followup.sort         |
| ✓      | "rank by avg_completedontime"      |    554ms | intent=followup.sort expected=followup.sort         |
| ✓      | "summarize"                        |    554ms | intent=followup.summary expected=followup.summary   |
| ✓      | "top 5 by region"                  |    507ms | intent=followup.top_n expected=followup.top_n       |

## chat-filters (3/3)

| Status | Check                                | Duration | Detail                            |
| ------ | ------------------------------------ | -------: | --------------------------------- |
| ✓      | natural-language filter (region NAM) |    456ms | intent=query.execute hasRich=true |
| ✓      | explicitFilters payload (region NAM) |    608ms | intent=query.execute hasRich=true |
| ✓      | skip filters ({}) — full result      |    698ms | intent=query.execute rows=93      |

## chat-force-intent (2/2)

| Status | Check                                  | Duration | Detail                                   |
| ------ | -------------------------------------- | -------: | ---------------------------------------- |
| ✓      | forceIntent="pnl_lineage" — bypass NLP |    678ms | intent=query.execute hasRich=true conf=1 |
| ✓      | forceIntent rejection (unknown query)  |    549ms | status=400                               |

## chat-export-undo (2/2)

| Status | Check                        | Duration | Detail                                                     |
| ------ | ---------------------------- | -------: | ---------------------------------------------------------- |
| ✓      | undo restores previous state |    612ms | intent=undo                                                |
| ✓      | export as csv                |    575ms | intent=query.list text="_Did you mean: "export → report"?_ |

Here are the available q" |

## chat-analysis (5/5)

| Status | Check               | Duration | Detail                                    |
| ------ | ------------------- | -------: | ----------------------------------------- |
| ✓      | "show trend"        |    535ms | intent=analysis.trend hasRich=true        |
| ✓      | "find outliers"     |    569ms | intent=analysis.anomaly hasRich=true      |
| ✓      | "show correlations" |    612ms | intent=analysis.correlation hasRich=true  |
| ✓      | "profile this data" |    610ms | intent=analysis.profile hasRich=true      |
| ✓      | "show distribution" |    700ms | intent=analysis.distribution hasRich=true |

## chat-drill (5/5)

| Status | Check                                   | Duration | Detail                                                            |
| ------ | --------------------------------------- | -------: | ----------------------------------------------------------------- |
| ✓      | "drill into NAM"                        |    555ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "show rows for EMEA"                    |    566ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | "details for APAC"                      |    579ms | intent=followup.drill_down rows=19 expected=19                    |
| ✓      | "expand NAM"                            |    581ms | intent=followup.drill_down rows=37 expected=37                    |
| ✓      | unknown drill value → friendly fallback |    597ms | intent=followup.drill_down text="_Did you mean: "drill → daily"?_ |

No rows in "pnl_lineage" where **Region** is "XYZ_NONEXISTENT". Av" |

## pii (7/7)

| Status | Check                                                 | Duration | Detail                                                                                                                            |
| ------ | ----------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | detection flagged name + salary                       |    593ms | summary={"byColumn":{"name":"person_name","salary":"salary"},"count":2,"signals":{"name":"header","salary":"                      |
| ✓      | name value is masked (not literal)                    |          | firstName="A\***\* J\*\*\***"                                                                                                     |
| ✓      | salary value is bucketed (not literal)                |          | firstSalary="~$160,000"                                                                                                           |
| ✓      | bot text notes masking applied                        |          | text="Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ \_(cached 64s ago — say "refre" |
| ✓      | admin role → unmasked clear values                    |    622ms | name="Alice Johnson" salary=165000                                                                                                |
| ✓      | admin role → bot text says 'shown UNMASKED — audited' |          | text="17 of 30).                                                                                                                  |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns shown UNMASKED — audited: name, salary)\_" |
| ✓ | admin role → piiSummary.unmasked=true | | unmasked=true |

## drift (7/7)

| Status | Check                                           | Duration | Detail                                |
| ------ | ----------------------------------------------- | -------: | ------------------------------------- |
| ✓      | baseline run — no drift                         |    653ms | drift=undefined                       |
| ✓      | phantom column → schemaDrift.removed reports it |    677ms | removed=["FAKE_DROPPED_COL_FOR_TEST"] |
| ✓      | bot text includes ⚠ Schema drift suffix         |          | text="→ 0).                           |

Here is the data from "employee*metrics" (30 rows): *(2 PII columns masked: name, salary)\_ _⚠ Schema drift: 1 column removed (FAKE_DROPPED_COL_FOR_ |
| ✓ | GET /api/admin/schema/drift surfaces the entry | 1ms | count=1 |
| ✓ | POST /api/admin/schema/acknowledge clears the flag | 2ms | status=200 |
| ✓ | acknowledge response includes cacheEvicted counter | | cacheEvicted=1 |
| ✓ | post-ack chat call surfaces no drift (cache evicted) | 639ms | drift=undefined |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |    413ms | status=400 code=INVALID_MESSAGE requestId=0bbd3f0a                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"6bd062c4-63fe-4f1f-8f9c-419 |

## query-cache (4/4)

| Status | Check                                         | Duration | Detail                  |
| ------ | --------------------------------------------- | -------: | ----------------------- |
| ✓      | first run → cacheStatus.status=fresh          |    545ms | status=fresh            |
| ✓      | identical request → cacheStatus.status=cached |    554ms | status=cached ageMs=558 |
| ✓      | 'refresh X' bypasses the cache                |    640ms | status=undefined        |
| ✓      | different filters → fresh entry               |    645ms | status=fresh            |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |    551ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=18                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                           |
| ------ | ------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      0ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                 |
| ✓      | chat_requests_total counter is emitted            |      1ms | body excerpt=chat_requests_total{group="default",intent="query.list",status="success"} 7 \| chat_requests_total{group="default",intent="query.execute",status="s |
| ✓      | process gauges present                            |          | checked process_resident_memory_bytes + process_uptime_seconds                                                                                                   |

## security-headers (3/3)

| Status | Check                                    | Duration | Detail                                                                                        |
| ------ | ---------------------------------------- | -------: | --------------------------------------------------------------------------------------------- |
| ✓      | X-Content-Type-Options: nosniff          |      2ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check                                            | Duration | Detail                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------ |
| ✓      | 11MB body returns 413 REQUEST_TOO_LARGE envelope |     30ms | status=413 code=REQUEST_TOO_LARGE limit=10485760 |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |    395ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      3ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      1ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (2/2)

| Status | Check                                           | Duration | Detail               |
| ------ | ----------------------------------------------- | -------: | -------------------- |
| ✓      | 3 concurrent retrains all succeed without error |      2ms | statuses=200,200,200 |
| ✓      | chat works after concurrent retrains            |   3204ms | intent=greeting      |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (3/3)

| Status | Check                                        | Duration | Detail                                 |
| ------ | -------------------------------------------- | -------: | -------------------------------------- |
| ✓      | POST /api/views/snapshot returns id          |   2556ms | status=201 id=bvvBcLSO                 |
| ✓      | GET /api/views/:id returns the same snapshot |    162ms | id=bvvBcLSO text="Snapshot under test" |
| ✓      | invalid id rejected (path-traversal guard)   |    436ms | status=400                             |

## edge (2/2)

| Status | Check                                 | Duration | Detail                                                                                                                          |
| ------ | ------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | unicode column name (région → Region) |    488ms | intent=followup.group_by text="Here is "pnl_lineage" grouped by **Region** (3 groups, 93 total rows):"                          |
| ✓      | empty result set → friendly message   |    740ms | text="No rows returned from "pnl_lineage" matching region=DOES_NOT_EXIST_XYZ. Try broadening your filters or running `list que" |

## security (3/3)

| Status | Check                                | Duration | Detail                                                                                                          |
| ------ | ------------------------------------ | -------: | --------------------------------------------------------------------------------------------------------------- |
| ✓      | load pnl_lineage in finance          |    684ms | rows=93                                                                                                         |
| ✓      | cross-group state is NOT inherited   |    759ms | intent=knowledge.search text="I couldn't find relevant information for "summarize" in the knowledge base. Try " |
| ✓      | original group still has its context |    664ms | intent=followup.summary                                                                                         |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |    636ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |    366ms | ok=true resultsType=object |

## auto-insights (4/4)

| Status | Check                                                      | Duration | Detail                             |
| ------ | ---------------------------------------------------------- | -------: | ---------------------------------- |
| ✓      | (prereq) load pnl_lineage                                  |    340ms | intent=query.execute hasRich=true  |
| ✓      | richContent.data.autoInsights has valid shape (or omitted) |          | present=false count=0              |
| ✓      | 💡 prefix matches insights count                           |          | expectPrefix=false hasPrefix=false |
| ✓      | all insight kinds are within the supported vocabulary      |          | count=0                            |

## glossary (3/3)

| Status | Check                            | Duration | Detail                                                 |
| ------ | -------------------------------- | -------: | ------------------------------------------------------ |
| ✓      | create entry                     |      2ms | status=200 entry.id=\_validation_1778642570700         |
| ✓      | read-back contains created entry |      1ms | found=true name=Test metric \_validation_1778642570700 |
| ✓      | delete entry (cleanup)           |      1ms | status=200                                             |

## write-synonyms (3/3)

| Status | Check                                               | Duration | Detail                                                                                            |
| ------ | --------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------- |
| ✓      | create entry (canonical=\_validation_1778642570704) |      1ms | status=200 body={"success":true,"entry":{"canonical":"\_validation_1778642570704","synonyms":["va |
| ✓      | read-back contains created entry                    |      1ms | found=true synonymCount=3                                                                         |
| ✓      | delete entry (cleanup)                              |      0ms | status=200 body={"success":true,"deleted":"\_validation_1778642570704"}                           |

## write-learning (2/2)

| Status | Check                     | Duration | Detail                                               |
| ------ | ------------------------- | -------: | ---------------------------------------------------- |
| ✓      | retrain trigger (finance) |      1ms | status=200 body={"success":true,"groupId":"finance"} |
| ✓      | chat works after retrain  |   2944ms | intent=greeting                                      |
