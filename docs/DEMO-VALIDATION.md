# Demo Validation Report

Generated: 2026-05-20T05:01:57.156Z
Targets: http://localhost:3001 (UI), http://localhost:4001 (engine), http://localhost:8080 (mock-api)

**Pass rate: 100.0%** (101 / 101)

## health (3/3)

| Status | Check              | Duration | Detail                                                                                           |
| ------ | ------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | engine /api/health |     27ms | status=200 body={"status":"ok","service":"chatbot-engine","instanceId":"engine-1","timestamp":"2 |
| ✓      | mock-api root      |      7ms | status=200                                                                                       |
| ✓      | next.js root       |     26ms | status=200                                                                                       |

## admin-api (17/17)

| Status | Check                           | Duration | Detail                   |
| ------ | ------------------------------- | -------: | ------------------------ |
| ✓      | intents                         |     10ms | status=200 shape-ok=true |
| ✓      | entities                        |      5ms | status=200 shape-ok=true |
| ✓      | templates                       |      7ms | status=200 shape-ok=true |
| ✓      | settings                        |      5ms | status=200 shape-ok=true |
| ✓      | queries                         |     13ms | status=200 shape-ok=true |
| ✓      | filters                         |      5ms | status=200 shape-ok=true |
| ✓      | users                           |      4ms | status=200 shape-ok=true |
| ✓      | audit                           |      4ms | status=200 shape-ok=true |
| ✓      | schedules                       |      4ms | status=200 shape-ok=true |
| ✓      | anomaly config                  |      5ms | status=200 shape-ok=true |
| ✓      | stats (query execution)         |      6ms | status=200 shape-ok=true |
| ✓      | learning review (default)       |      6ms | status=200 shape-ok=true |
| ✓      | learning stats (default)        |      4ms | status=200 shape-ok=true |
| ✓      | learning auto-learned (default) |      5ms | status=200 shape-ok=true |
| ✓      | synonyms (default)              |      5ms | status=200 shape-ok=true |
| ✓      | data-roles                      |      3ms | status=200 shape-ok=true |
| ✓      | analytics nlp-misses (default)  |      6ms | status=200 shape-ok=true |

## admin-ui (20/20)

| Status | Check                        | Duration | Detail                                   |
| ------ | ---------------------------- | -------: | ---------------------------------------- |
| ✓      | /admin                       |      7ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/intents               |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/synonyms              |      6ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/templates             |      6ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/files                 |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/test-console          |     10ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/analytics             |      6ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/logs                  |      6ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/learning              |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/audit                 |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/schedules             |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/anomaly               |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors            |      4ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/connectors/csv        |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/filters               |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/users                 |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/settings              |      5ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/user-guide     |      6ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/config-guide   |      7ms | status=200 type=text/html; charset=utf-8 |
| ✓      | /admin/guides/learning-guide |      7ms | status=200 type=text/html; charset=utf-8 |

## chat-basic (4/4)

| Status | Check          | Duration | Detail                                           |
| ------ | -------------- | -------: | ------------------------------------------------ |
| ✓      | "hello"        |     23ms | status=200 intent=greeting expected=greeting     |
| ✓      | "help"         |      9ms | status=200 intent=help expected=help             |
| ✓      | "list queries" |     15ms | status=200 intent=query.list expected=query.list |
| ✓      | "goodbye"      |      8ms | status=200 intent=farewell expected=farewell     |

## chat-floor (1/1)

| Status | Check                       | Duration | Detail                                                                                             |
| ------ | --------------------------- | -------: | -------------------------------------------------------------------------------------------------- |
| ✓      | gibberish → below-floor msg |      9ms | intent=disambiguation.no_match text="I don't understand that one — try rephrasing or browse the q" |

## groups (4/4)

| Status | Check                      | Duration | Detail                       |
| ------ | -------------------------- | -------: | ---------------------------- |
| ✓      | default → list queries     |      9ms | intent=query.list status=200 |
| ✓      | finance → list queries     |     15ms | intent=query.list status=200 |
| ✓      | engineering → list queries |     16ms | intent=query.list status=200 |
| ✓      | analytics → list queries   |     17ms | intent=query.list status=200 |

## chat-followup (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## chat-filters (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## chat-force-intent (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## chat-export-undo (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## chat-analysis (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## chat-drill (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## pii (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## drift (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## error-envelope (2/2)

| Status | Check                                            | Duration | Detail                                                                                           |
| ------ | ------------------------------------------------ | -------: | ------------------------------------------------------------------------------------------------ |
| ✓      | invalid message returns {error, code, requestId} |      5ms | status=400 code=INVALID_MESSAGE requestId=ec967f44                                               |
| ✓      | 404 fallback returns code=NOT_FOUND              |      1ms | status=404 body={"error":"Not found","code":"NOT_FOUND","requestId":"9f256b81-dde1-46c6-a904-995 |

## query-cache (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## openapi (3/3)

| Status | Check                                                 | Duration | Detail                                         |
| ------ | ----------------------------------------------------- | -------: | ---------------------------------------------- |
| ✓      | /api/openapi.json returns valid 3.x spec              |      5ms | openapi=3.0.3 title=Chatbot Engine — Admin API |
| ✓      | spec covers admin endpoints (>=15 paths)              |          | paths=27                                       |
| ✓      | spec documents /api/chat with ErrorEnvelope responses |          | checked /api/chat 503 + ErrorEnvelope schema   |

## metrics (3/3)

| Status | Check                                             | Duration | Detail                                                                                                                                                          |
| ------ | ------------------------------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✓      | /api/metrics returns text/plain Prometheus format |      1ms | status=200 content-type=text/plain; charset=utf-8; version=0.0.4                                                                                                |
| ✓      | chat_requests_total counter is emitted            |      0ms | body excerpt=chat_requests_total{group="default",intent="greeting",status="success"} 6 \| chat_requests_total{group="default",intent="help",status="success"} 3 |
| ✓      | process gauges present                            |          | checked process_resident_memory_bytes + process_uptime_seconds                                                                                                  |

## security-headers (3/3)

| Status | Check                                    | Duration | Detail                                                                                        |
| ------ | ---------------------------------------- | -------: | --------------------------------------------------------------------------------------------- |
| ✓      | X-Content-Type-Options: nosniff          |      1ms | value=nosniff                                                                                 |
| ✓      | X-Frame-Options set (SAMEORIGIN)         |          | value=SAMEORIGIN                                                                              |
| ✓      | Referrer-Policy + Permissions-Policy set |          | referrer=strict-origin-when-cross-origin permissions=camera=(), microphone=(), geolocation=() |

## body-limit (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## source-health (3/3)

| Status | Check                                                     | Duration | Detail                     |
| ------ | --------------------------------------------------------- | -------: | -------------------------- |
| ✓      | GET /api/admin/sources/health returns map shape           |      4ms | total=1 ok=1 unreachable=0 |
| ✓      | mock-api shows status=ok after boot probe                 |          | sources=["ok"]             |
| ✓      | POST /api/admin/sources/recheck forces an immediate probe |      3ms | rechecked=1                |

## readiness (2/2)

| Status | Check                                              | Duration | Detail                                                                         |
| ------ | -------------------------------------------------- | -------: | ------------------------------------------------------------------------------ |
| ✓      | /api/health/ready returns shape with sources block |      2ms | status=ready checks={"nlp":true,"dataDir":true,"sources":true} sources.total=1 |
| ✓      | ready when at least one source ok                  |          | sources.ok=1                                                                   |

## retrain (1/1)

| Status | Check                          | Duration | Detail |
| ------ | ------------------------------ | -------: | ------ |
| ✓      | skipped (--quick / --no-write) |          |        |

## rotation (2/2)

| Status | Check                                                          | Duration | Detail            |
| ------ | -------------------------------------------------------------- | -------: | ----------------- |
| ✓      | rotation produces .<timestamp>.jsonl artifacts under threshold |          | total=6 rotated=5 |
| ✓      | current file still receives writes after rotation              |          | files=6           |

## share (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## edge (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## security (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## userinfo (3/3)

| Status | Check                                   | Duration | Detail                           |
| ------ | --------------------------------------- | -------: | -------------------------------- |
| ✓      | GET /api/userinfo returns a body        |      3ms | status=200 hasBody=true          |
| ✓      | response carries all required AD fields |          | missing=none                     |
| ✓      | samAccountName === userName             |          | sam=local_dev userName=local_dev |

## autocomplete (3/3)

| Status | Check                                            | Duration | Detail                     |
| ------ | ------------------------------------------------ | -------: | -------------------------- |
| ✓      | partial "pnl" matches pnl_lineage in top results |      6ms | count=3 top=pnl_lineage    |
| ✓      | results are scored and shape-valid               |          | count=3                    |
| ✓      | empty q returns empty results                    |      4ms | ok=true resultsType=object |

## search-personalisation (1/1)

| Status | Check                          | Duration | Detail |
| ------ | ------------------------------ | -------: | ------ |
| ✓      | skipped (--no-write / --quick) |          |        |

## auto-insights (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## root-cause (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## active-doc-qa (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## data-explorer-insights (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## data-quality (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## forecast (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## gridboard-rows (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## gridboard-query-reorder (1/1)

| Status | Check                          | Duration | Detail |
| ------ | ------------------------------ | -------: | ------ |
| ✓      | skipped (--no-write / --quick) |          |        |

## gridboard-views (1/1)

| Status | Check                          | Duration | Detail |
| ------ | ------------------------------ | -------: | ------ |
| ✓      | skipped (--no-write / --quick) |          |        |

## source-reorder (1/1)

| Status | Check                          | Duration | Detail |
| ------ | ------------------------------ | -------: | ------ |
| ✓      | skipped (--no-write / --quick) |          |        |

## glossary (1/1)

| Status | Check                          | Duration | Detail |
| ------ | ------------------------------ | -------: | ------ |
| ✓      | skipped (--no-write / --quick) |          |        |

## write-synonyms (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |

## write-learning (1/1)

| Status | Check             | Duration | Detail |
| ------ | ----------------- | -------: | ------ |
| ✓      | skipped (--quick) |          |        |
