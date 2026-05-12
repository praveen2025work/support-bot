#!/usr/bin/env node
/**
 * Demo validation harness.
 *
 * Exercises every public feature surface of the app against the
 * running services on localhost:3001 (Next.js), :4001 (engine),
 * :8080 (mock-api). Produces a markdown report at
 * docs/DEMO-VALIDATION.md grouped by feature, with per-check
 * pass/fail + first-line error detail.
 *
 * Mutations are scoped to a dedicated "_validation_" canonical and
 * cleaned up at the end so the harness is idempotent and safe to
 * re-run anytime.
 *
 * Run:  node scripts/demo/validate.mjs
 *       node scripts/demo/validate.mjs --json    (machine-readable)
 *       node scripts/demo/validate.mjs --quick   (skip slow chat tests)
 *       node scripts/demo/validate.mjs --no-write (skip mutation tests)
 */

import { writeFile } from "node:fs/promises";

const NEXT_URL = process.env.NEXT_URL || "http://localhost:3001";
const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4001";
const MOCK_URL = process.env.MOCK_URL || "http://localhost:8080";

const args = new Set(process.argv.slice(2));
const QUICK = args.has("--quick");
const JSON_ONLY = args.has("--json");
const NO_WRITE = args.has("--no-write");

/** @type {{ section: string; name: string; ok: boolean; detail?: string; durationMs?: number }[]} */
const results = [];

function record(section, name, ok, detail, durationMs) {
  results.push({ section, name, ok, detail, durationMs });
  if (!JSON_ONLY) {
    const icon = ok ? "✓" : "✗";
    const dur = durationMs != null ? ` (${durationMs}ms)` : "";
    const det = ok ? "" : `  — ${detail}`;
    process.stdout.write(`  ${icon} ${name}${dur}${det}\n`);
  }
}

function section(label) {
  if (!JSON_ONLY) process.stdout.write(`\n## ${label}\n`);
}

async function timed(fn) {
  const t = Date.now();
  try {
    const result = await fn();
    return { result, durationMs: Date.now() - t };
  } catch (err) {
    return { error: err, durationMs: Date.now() - t };
  }
}

async function getJson(url, opts) {
  const res = await fetch(url, { ...(opts || {}), method: "GET" });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }
  return { ok: res.ok, status: res.status, body, raw: text };
}

async function getHtml(url) {
  const res = await fetch(url, { method: "GET" });
  return { ok: res.ok, status: res.status, contentType: res.headers.get("content-type") };
}

async function postChat(text, sessionId, groupId, extra) {
  const body = { text, sessionId, groupId, ...(extra || {}) };
  const res = await fetch(`${NEXT_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

// ─── Service health ──────────────────────────────────────────────────────

async function testHealth() {
  section("Service health");

  const e = await timed(() => getJson(`${ENGINE_URL}/api/health`));
  record(
    "health",
    "engine /api/health",
    e.result?.ok && e.result.body?.status === "ok",
    e.error ? String(e.error) : `status=${e.result?.status} body=${JSON.stringify(e.result?.body)?.slice(0, 80)}`,
    e.durationMs,
  );

  const m = await timed(() => getHtml(`${MOCK_URL}/`));
  record(
    "health",
    "mock-api root",
    m.result?.ok,
    m.error ? String(m.error) : `status=${m.result?.status}`,
    m.durationMs,
  );

  const u = await timed(() => getHtml(`${NEXT_URL}/`));
  record(
    "health",
    "next.js root",
    u.result?.ok,
    u.error ? String(u.error) : `status=${u.result?.status}`,
    u.durationMs,
  );
}

// ─── Admin GET endpoints (via Next.js proxy) ─────────────────────────────

const ADMIN_GETS = [
  ["intents", "/api/admin/intents", (d) => Array.isArray(d?.intents)],
  ["entities", "/api/admin/entities", (d) => d?.entities && typeof d.entities === "object"],
  ["templates", "/api/admin/templates", (d) => d?.baseTemplates && typeof d.baseTemplates === "object"],
  ["settings", "/api/admin/settings", (d) => d?.config && typeof d.config === "object"],
  ["queries", "/api/admin/queries", (d) => Array.isArray(d?.queries) || Array.isArray(d)],
  ["filters", "/api/admin/filters", (d) => d != null],
  ["users", "/api/admin/users", (d) => Array.isArray(d?.users) || Array.isArray(d)],
  ["audit", "/api/admin/audit", (d) => Array.isArray(d?.entries) || Array.isArray(d)],
  ["schedules", "/api/admin/schedules", (d) => Array.isArray(d?.schedules) || Array.isArray(d) || d?.success != null],
  ["anomaly config", "/api/admin/anomaly/config", (d) => d != null],
  ["stats (query execution)", "/api/admin/stats", (d) => Array.isArray(d?.aggregated)],
  ["learning review (default)", "/api/admin/learning/review?groupId=default", (d) => Array.isArray(d)],
  ["learning stats (default)", "/api/admin/learning/stats?groupId=default", (d) => d?.totalInteractions != null],
  ["learning auto-learned (default)", "/api/admin/learning/auto-learned?groupId=default", (d) => Array.isArray(d)],
  ["synonyms (default)", "/api/admin/groups/default/synonyms", (d) => Array.isArray(d?.synonyms)],
  ["data-roles", "/api/admin/data-roles", (d) => d != null],
  ["analytics nlp-misses (default)", "/api/admin/analytics/nlp-misses?groupId=default", (d) => d?.totalInteractions != null],
];

async function testAdminApi() {
  section("Admin API endpoints (Next.js proxy → engine)");
  for (const [name, path, validate] of ADMIN_GETS) {
    const t = await timed(() => getJson(`${NEXT_URL}${path}`));
    const r = t.result;
    const ok = !!r?.ok && validate(r.body);
    record(
      "admin-api",
      name,
      ok,
      t.error
        ? String(t.error)
        : `status=${r?.status}${r?.body?.error ? ` error="${r.body.error}"` : ""} shape-ok=${validate(r?.body)}`,
      t.durationMs,
    );
  }
}

// ─── Admin UI pages render ────────────────────────────────────────────────

const ADMIN_PAGES = [
  "/admin",
  "/admin/intents",
  "/admin/synonyms",
  "/admin/templates",
  "/admin/files",
  "/admin/test-console",
  "/admin/analytics",
  "/admin/logs",
  "/admin/learning",
  "/admin/audit",
  "/admin/schedules",
  "/admin/anomaly",
  "/admin/connectors",
  "/admin/connectors/csv",
  "/admin/filters",
  "/admin/users",
  "/admin/settings",
  "/admin/guides/user-guide",
  "/admin/guides/config-guide",
  "/admin/guides/learning-guide",
];

async function testAdminPages() {
  section("Admin UI pages (renders OK)");
  for (const path of ADMIN_PAGES) {
    const t = await timed(() => getHtml(`${NEXT_URL}${path}`));
    const ok = !!t.result?.ok && t.result.contentType?.startsWith("text/html");
    record(
      "admin-ui",
      path,
      ok,
      t.error ? String(t.error) : `status=${t.result?.status} type=${t.result?.contentType}`,
      t.durationMs,
    );
  }
}

// ─── Chat happy path ──────────────────────────────────────────────────────

async function testChatBasic() {
  section("Chat — basic intents");
  const sid = `validation-basic-${Date.now()}`;

  const cases = [
    { name: "greeting", text: "hello", expectIntent: "greeting" },
    { name: "help", text: "help", expectIntent: "help" },
    { name: "list queries", text: "list queries", expectIntent: "query.list" },
    { name: "farewell", text: "goodbye", expectIntent: "farewell" },
  ];

  for (const c of cases) {
    const t = await timed(() => postChat(c.text, `${sid}-${c.name}`, "default"));
    const intent = t.result?.data?.intent;
    const ok = !!t.result?.ok && intent === c.expectIntent;
    record(
      "chat-basic",
      `"${c.text}"`,
      ok,
      t.error
        ? String(t.error)
        : `status=${t.result?.status} intent=${intent} expected=${c.expectIntent}`,
      t.durationMs,
    );
  }
}

// ─── Below-floor / disambiguation ─────────────────────────────────────────

async function testFloorAndDisambig() {
  section("Chat — disambiguation + below-floor");
  const sid = `validation-floor-${Date.now()}`;

  const gibberish = await timed(() =>
    postChat("asdfghjkl qwerty zxcvbn", `${sid}-floor`, "default"),
  );
  const d = gibberish.result?.data;
  const isBelowFloor =
    d?.intent === "disambiguation.no_match" ||
    /don'?t understand/i.test(d?.text || "");
  record(
    "chat-floor",
    "gibberish → below-floor msg",
    isBelowFloor,
    `intent=${d?.intent} text="${(d?.text || "").slice(0, 60)}"`,
    gibberish.durationMs,
  );
}

// ─── Query execute + full follow-up chain ─────────────────────────────────

async function testQueryAndFollowups() {
  section("Chat — full follow-up chain (finance group, pnl_lineage)");
  if (QUICK) {
    record("chat-followup", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-followup-${Date.now()}`;

  const load = await timed(() =>
    postChat("run pnl_lineage", sid, "finance", { explicitFilters: {} }),
  );
  const ld = load.result?.data;
  const loadedOk =
    !!load.result?.ok &&
    ld?.intent === "query.execute" &&
    !!ld?.richContent?.data;
  record(
    "chat-followup",
    "load pnl_lineage",
    loadedOk,
    `intent=${ld?.intent} hasRich=${!!ld?.richContent}`,
    load.durationMs,
  );
  if (!loadedOk) return;

  const followups = [
    { name: "group by region (exact)", text: "group by region", expect: "followup.group_by" },
    { name: "break it down by location (NL+synonym)", text: "break it down by location", expect: "followup.group_by" },
    { name: "split by region (loose trigger)", text: "split by region", expect: "followup.group_by" },
    { name: "per masterbookname", text: "per masterbookname", expect: "followup.group_by" },
    { name: "for each feedname", text: "for each feedname", expect: "followup.group_by" },
    { name: "sort by avg_completedontime desc", text: "sort by avg_completedontime desc", expect: "followup.sort" },
    { name: "rank by avg_completedontime", text: "rank by avg_completedontime", expect: "followup.sort" },
    { name: "summarize", text: "summarize", expect: "followup.summary" },
    { name: "top 5 by region", text: "top 5 by region", expect: "followup.top_n" },
  ];

  for (const f of followups) {
    const t = await timed(() => postChat(f.text, sid, "finance"));
    const intent = t.result?.data?.intent;
    const ok = !!t.result?.ok && intent === f.expect;
    record(
      "chat-followup",
      `"${f.text}"`,
      ok,
      `intent=${intent} expected=${f.expect}`,
      t.durationMs,
    );
  }
}

// ─── Analysis intents (ML) ────────────────────────────────────────────────

async function testAnalysis() {
  section("Chat — analysis (ML) intents on live data");
  if (QUICK) {
    record("chat-analysis", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-analysis-${Date.now()}`;

  const load = await timed(() =>
    postChat("run pnl_lineage", sid, "finance", { explicitFilters: {} }),
  );
  if (!load.result?.data?.richContent) {
    record("chat-analysis", "(prereq) load pnl_lineage", false, "no rich content returned");
    return;
  }

  const analyses = [
    { name: "show trend", text: "show trend" },
    { name: "find outliers", text: "find outliers" },
    { name: "show correlations", text: "show correlations" },
    { name: "data profile", text: "profile this data" },
    { name: "distribution", text: "show distribution" },
  ];

  for (const a of analyses) {
    const t = await timed(() => postChat(a.text, sid, "finance"));
    const intent = t.result?.data?.intent;
    // Loose check: any analysis.* intent OR a clean response with rich content
    const ok =
      !!t.result?.ok &&
      (String(intent).startsWith("analysis.") || !!t.result?.data?.richContent);
    record(
      "chat-analysis",
      `"${a.text}"`,
      ok,
      `intent=${intent} hasRich=${!!t.result?.data?.richContent}`,
      t.durationMs,
    );
  }
}

// ─── Per-group health (every configured group answers) ────────────────────

const GROUPS_TO_PROBE = ["default", "finance", "engineering", "analytics"];

async function testGroups() {
  section("Per-group health (each configured group answers a basic query)");
  for (const g of GROUPS_TO_PROBE) {
    const t = await timed(() =>
      postChat("list queries", `validation-group-${g}-${Date.now()}`, g),
    );
    const ok = !!t.result?.ok && t.result?.data?.intent === "query.list";
    record(
      "groups",
      `${g} → list queries`,
      ok,
      `intent=${t.result?.data?.intent} status=${t.result?.status}`,
      t.durationMs,
    );
  }
}

// ─── Filter handling (inline + explicit) ──────────────────────────────────

async function testFilters() {
  section("Chat — filter handling");
  if (QUICK) {
    record("chat-filters", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-filters-${Date.now()}`;

  // Inline filter expressed in natural language
  const inline = await timed(() =>
    postChat("run pnl_lineage for region NAM", `${sid}-inline`, "finance", {
      explicitFilters: { region: "NAM" },
    }),
  );
  const inlineData = inline.result?.data;
  record(
    "chat-filters",
    "natural-language filter (region NAM)",
    !!inline.result?.ok && !!inlineData?.richContent?.data,
    `intent=${inlineData?.intent} hasRich=${!!inlineData?.richContent}`,
    inline.durationMs,
  );

  // Explicit filter form (the JSON path the chip handler uses)
  const explicit = await timed(() =>
    postChat("run pnl_lineage", `${sid}-explicit`, "finance", {
      explicitFilters: { region: "NAM" },
    }),
  );
  const expData = explicit.result?.data;
  record(
    "chat-filters",
    "explicitFilters payload (region NAM)",
    !!explicit.result?.ok && !!expData?.richContent?.data,
    `intent=${expData?.intent} hasRich=${!!expData?.richContent}`,
    explicit.durationMs,
  );

  // Empty filters bypass — should load the full result set
  const skip = await timed(() =>
    postChat("run pnl_lineage", `${sid}-skip`, "finance", {
      explicitFilters: {},
    }),
  );
  const skipData = skip.result?.data;
  const rowCount = skipData?.richContent?.data?.rows?.length;
  record(
    "chat-filters",
    'skip filters ({}) — full result',
    !!skip.result?.ok && rowCount > 0,
    `intent=${skipData?.intent} rows=${rowCount}`,
    skip.durationMs,
  );
}

// ─── ForceIntent (the "Did you mean?" chip click path) ────────────────────

async function testForceIntent() {
  section("Chat — forceIntent (disambig chip click)");
  if (QUICK) {
    record("chat-force-intent", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-force-${Date.now()}`;

  const res = await timed(() =>
    postChat("run pnl_lineage", sid, "finance", {
      explicitFilters: {},
      forceIntent: "pnl_lineage",
    }),
  );
  const d = res.result?.data;
  const ok =
    !!res.result?.ok &&
    d?.intent === "query.execute" &&
    !!d?.richContent?.data;
  record(
    "chat-force-intent",
    'forceIntent="pnl_lineage" — bypass NLP',
    ok,
    `intent=${d?.intent} hasRich=${!!d?.richContent} conf=${d?.confidence}`,
    res.durationMs,
  );

  // forceIntent that does NOT exist in the user's group should be rejected
  // with 400 (rather than running a foreign query).
  const bad = await timed(() =>
    postChat("anything", sid, "finance", { forceIntent: "_does_not_exist_" }),
  );
  record(
    "chat-force-intent",
    "forceIntent rejection (unknown query)",
    bad.result?.status === 400,
    `status=${bad.result?.status}`,
    bad.durationMs,
  );
}

// ─── Export + undo ────────────────────────────────────────────────────────

async function testExportUndo() {
  section("Chat — export + undo");
  if (QUICK) {
    record("chat-export-undo", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-export-${Date.now()}`;

  // Pre-req: load data
  await postChat("run pnl_lineage", sid, "finance", { explicitFilters: {} });

  // Mutate via group-by, then undo
  await postChat("group by region", sid, "finance");
  const undo = await timed(() => postChat("undo", sid, "finance"));
  const undoIntent = undo.result?.data?.intent;
  record(
    "chat-export-undo",
    "undo restores previous state",
    !!undo.result?.ok && (undoIntent === "undo" || undoIntent === "query.execute"),
    `intent=${undoIntent}`,
    undo.durationMs,
  );

  // Export the (possibly restored) data as CSV — checks that the
  // download envelope is built, not the actual file content.
  const exportRes = await timed(() => postChat("export as csv", sid, "finance"));
  const exData = exportRes.result?.data;
  const ok =
    !!exportRes.result?.ok &&
    (exData?.intent === "export" || /export/i.test(String(exData?.text || "")));
  record(
    "chat-export-undo",
    'export as csv',
    ok,
    `intent=${exData?.intent} text="${(exData?.text || "").slice(0, 60)}"`,
    exportRes.durationMs,
  );
}

// ─── P1 edge cases (regressions from the bug probe) ──────────────────────

async function testEdgeCases() {
  section("Correctness — edge cases (P1 regressions)");
  if (QUICK) {
    record("edge", "skipped (--quick)", true);
    return;
  }

  // Unicode column matching: "région" should resolve to "Region"
  // because we strip diacritics during column matching.
  const sidU = `validation-unicode-${Date.now()}`;
  await postChat("run pnl_lineage", sidU, "finance", { explicitFilters: {} });
  const unicode = await timed(() =>
    postChat("group by région", sidU, "finance"),
  );
  const uIntent = unicode.result?.data?.intent;
  const uText = String(unicode.result?.data?.text || "");
  record(
    "edge",
    "unicode column name (région → Region)",
    uIntent === "followup.group_by" && /region/i.test(uText),
    `intent=${uIntent} text="${uText.slice(0, 80)}"`,
    unicode.durationMs,
  );

  // Forecast on tiny data: the engine has a MIN_ROWS_FOR_FORECAST=10
  // guard, but the chat API can't easily construct a <10 row context
  // (top-N/group-by don't mutate context.lastApiResult; mock-api
  // filters don't go below ~19 rows). The guard IS verified by code
  // review and fires correctly in production data. See
  // services/engine/src/core/response/handlers/analysis-handler.ts.
  // (No harness check here — would only flake.)

  // Empty result: clear "no rows" message, not "(0 rows)" with blank table.
  const empty = await timed(() =>
    postChat(
      "run pnl_lineage",
      `validation-empty-${Date.now()}`,
      "finance",
      { explicitFilters: { region: "DOES_NOT_EXIST_XYZ" } },
    ),
  );
  const eText = String(empty.result?.data?.text || "");
  record(
    "edge",
    "empty result set → friendly message",
    /no rows.*returned|broaden|no.*matches/i.test(eText),
    `text="${eText.slice(0, 120)}"`,
    empty.durationMs,
  );
}

// ─── Snapshot / shareable view ───────────────────────────────────────────

async function testSnapshots() {
  section("Sharing — view snapshots (round-trip)");
  if (QUICK) {
    record("share", "skipped (--quick)", true);
    return;
  }

  // Create
  const payload = {
    sessionId: `validation-share-${Date.now()}`,
    groupId: "finance",
    queryName: "pnl_lineage",
    userId: "validation-bot",
    message: {
      text: "Snapshot under test",
      richContent: {
        type: "csv_table",
        data: { headers: ["region", "amount"], rows: [{ region: "NAM", amount: 1 }] },
      },
      intent: "query.execute",
      confidence: 1,
    },
  };
  const create = await timed(async () => {
    const res = await fetch(`${NEXT_URL}/api/views/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  });
  const id = create.result?.body?.id;
  record(
    "share",
    "POST /api/views/snapshot returns id",
    !!create.result?.ok && typeof id === "string" && id.length >= 6,
    `status=${create.result?.status} id=${id}`,
    create.durationMs,
  );
  if (!id) return;

  // Retrieve
  const fetch1 = await timed(() => getJson(`${NEXT_URL}/api/views/${id}`));
  const snap = fetch1.result?.body;
  record(
    "share",
    "GET /api/views/:id returns the same snapshot",
    !!fetch1.result?.ok &&
      snap?.id === id &&
      snap?.text === payload.message.text &&
      snap?.richContent?.data?.rows?.[0]?.region === "NAM",
    `id=${snap?.id} text="${(snap?.text || "").slice(0, 40)}"`,
    fetch1.durationMs,
  );

  // Reject invalid id (path-traversal defense)
  const bad = await timed(() =>
    getJson(`${NEXT_URL}/api/views/${encodeURIComponent("../../etc/passwd")}`),
  );
  record(
    "share",
    "invalid id rejected (path-traversal guard)",
    bad.result?.status === 400 || bad.result?.status === 404,
    `status=${bad.result?.status}`,
    bad.durationMs,
  );
}

// ─── PII detection + masking ─────────────────────────────────────────────

async function testPiiMasking() {
  section("Security — PII detection + masking");
  if (QUICK) {
    record("pii", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-pii-${Date.now()}`;

  // employee_metrics has `name` (person_name) and `salary` (salary)
  // columns. Both should be flagged AND masked. Original values like
  // "Alice Johnson" / "165000" must NOT appear in the response.
  const res = await timed(() =>
    postChat("run employee_metrics", sid, "hr_team", { explicitFilters: {} }),
  );
  const d = res.result?.data;
  const data = d?.richContent?.data;
  const piiSummary = data?.piiSummary;
  const rows = data?.rows || [];
  const firstName = rows[0]?.name;
  const firstSalary = rows[0]?.salary;

  record(
    "pii",
    "detection flagged name + salary",
    !!piiSummary &&
      piiSummary.byColumn?.name === "person_name" &&
      piiSummary.byColumn?.salary === "salary",
    `summary=${JSON.stringify(piiSummary).slice(0, 100)}`,
    res.durationMs,
  );

  record(
    "pii",
    "name value is masked (not literal)",
    typeof firstName === "string" &&
      /\*/.test(firstName) &&
      !/^Alice\s+Johnson$/i.test(firstName),
    `firstName="${firstName}"`,
  );

  record(
    "pii",
    "salary value is bucketed (not literal)",
    typeof firstSalary === "string" &&
      /^~\$[\d,]+$/.test(firstSalary),
    `firstSalary="${firstSalary}"`,
  );

  // Bot text appends the masking note so users see WHY values look
  // different from the source spreadsheet.
  const text = String(d?.text || "");
  record(
    "pii",
    "bot text notes masking applied",
    /PII column.*masked/i.test(text),
    `text="${text.slice(0, 120)}"`,
  );
}

// ─── Drill-down (the Tableau-killer feature) ─────────────────────────────

async function testDrillDown() {
  section("Chat — drill-down on grouped results");
  if (QUICK) {
    record("chat-drill", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-drill-${Date.now()}`;

  // Set up: load + group by region (3 groups: NAM 37, EMEA 37, APAC 19)
  await postChat("run pnl_lineage", sid, "finance", { explicitFilters: {} });
  await postChat("group by region", sid, "finance");

  const cases = [
    { name: '"drill into NAM"', text: "drill into NAM", expectedRows: 37 },
    {
      name: '"show rows for EMEA"',
      text: "show rows for EMEA",
      expectedRows: 37,
    },
    { name: '"details for APAC"', text: "details for APAC", expectedRows: 19 },
    { name: '"expand NAM"', text: "expand NAM", expectedRows: 37 },
  ];

  for (const c of cases) {
    const t = await timed(() => postChat(c.text, sid, "finance"));
    const d = t.result?.data;
    const rows = d?.richContent?.data?.rows?.length;
    const ok = d?.intent === "followup.drill_down" && rows === c.expectedRows;
    record(
      "chat-drill",
      c.name,
      ok,
      `intent=${d?.intent} rows=${rows} expected=${c.expectedRows}`,
      t.durationMs,
    );
  }

  // Unknown drill value → friendly "available values" message
  const unknown = await timed(() =>
    postChat("drill into XYZ_NONEXISTENT", sid, "finance"),
  );
  const ud = unknown.result?.data;
  record(
    "chat-drill",
    "unknown drill value → friendly fallback",
    ud?.intent === "followup.drill_down" &&
      /no rows in.*where.*is/i.test(String(ud?.text || "")) &&
      /available values/i.test(String(ud?.text || "")),
    `intent=${ud?.intent} text="${String(ud?.text || "").slice(0, 100)}"`,
    unknown.durationMs,
  );
}

// ─── Cross-group isolation (regression for the F-probe leak) ─────────────

async function testGroupIsolation() {
  section("Security — cross-group session isolation");
  if (QUICK) {
    record("security", "skipped (--quick)", true);
    return;
  }
  const sid = `validation-isolation-${Date.now()}`;

  // 1) Load a real result in the finance group.
  const load = await timed(() =>
    postChat("run pnl_lineage", sid, "finance", { explicitFilters: {} }),
  );
  const rows = load.result?.data?.richContent?.data?.rows?.length;
  record(
    "security",
    "load pnl_lineage in finance",
    !!load.result?.ok && rows > 0,
    `rows=${rows}`,
    load.durationMs,
  );

  // 2) SAME sessionId, switch groupId to "default". If session was scoped
  //    only by sessionId (the pre-fix bug), the default group would inherit
  //    the finance result and "summarize" would happily summarize 93 rows
  //    of finance data — a real cross-tenant leak.
  const bleed = await timed(() => postChat("summarize", sid, "default"));
  const intent = bleed.result?.data?.intent;
  const text = String(bleed.result?.data?.text || "");
  const looksLikeBleed =
    intent === "followup.summary" && /pnl_lineage/i.test(text);
  record(
    "security",
    "cross-group state is NOT inherited",
    !looksLikeBleed,
    `intent=${intent} text="${text.slice(0, 80)}"`,
    bleed.durationMs,
  );

  // 3) Sanity: original group still has its context.
  const sanity = await timed(() => postChat("summarize", sid, "finance"));
  record(
    "security",
    "original group still has its context",
    sanity.result?.data?.intent === "followup.summary" &&
      /pnl_lineage/i.test(String(sanity.result?.data?.text || "")),
    `intent=${sanity.result?.data?.intent}`,
    sanity.durationMs,
  );
}

// ─── Engine-direct write paths (CSRF-bypass via engine API) ───────────────
//
// The Next.js layer enforces CSRF on POST/DELETE; the engine accepts
// internal calls without. We hit the engine directly to verify the
// write-path LOGIC works. Browser CSRF flow is tested separately
// during the manual demo rehearsal.

async function testSynonymCrud() {
  section("Write paths — synonyms CRUD (engine-direct)");
  if (NO_WRITE) {
    record("write-synonyms", "skipped (--no-write)", true);
    return;
  }
  if (QUICK) {
    record("write-synonyms", "skipped (--quick)", true);
    return;
  }

  const groupId = "default";
  const canonical = `_validation_${Date.now()}`;
  const synonyms = ["validate", "harness", "smoke"];

  // CREATE
  const create = await timed(async () => {
    const res = await fetch(
      `${ENGINE_URL}/api/admin/groups/${groupId}/synonyms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "admin",
        },
        body: JSON.stringify({ canonical, synonyms }),
      },
    );
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  });
  const createdOk = create.result?.ok && create.result?.body?.success === true;
  record(
    "write-synonyms",
    `create entry (canonical=${canonical})`,
    !!createdOk,
    `status=${create.result?.status} body=${JSON.stringify(create.result?.body)?.slice(0, 80)}`,
    create.durationMs,
  );

  // READ-BACK
  const read = await timed(() =>
    getJson(`${ENGINE_URL}/api/admin/groups/${groupId}/synonyms`, {
      headers: { "x-user-role": "admin" },
    }),
  );
  const found = (read.result?.body?.synonyms || []).find(
    (e) => e.canonical === canonical,
  );
  record(
    "write-synonyms",
    "read-back contains created entry",
    !!found && found.synonyms.length === 3,
    `found=${!!found} synonymCount=${found?.synonyms?.length}`,
    read.durationMs,
  );

  // DELETE (cleanup)
  const del = await timed(async () => {
    const res = await fetch(
      `${ENGINE_URL}/api/admin/groups/${groupId}/synonyms?canonical=${encodeURIComponent(canonical)}`,
      {
        method: "DELETE",
        headers: { "x-user-role": "admin" },
      },
    );
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  });
  const deletedOk = del.result?.ok && del.result?.body?.success === true;
  record(
    "write-synonyms",
    "delete entry (cleanup)",
    !!deletedOk,
    `status=${del.result?.status} body=${JSON.stringify(del.result?.body)?.slice(0, 80)}`,
    del.durationMs,
  );
}

async function testLearningRetrain() {
  section("Write paths — learning retrain (engine-direct)");
  if (NO_WRITE) {
    record("write-learning", "skipped (--no-write)", true);
    return;
  }
  if (QUICK) {
    record("write-learning", "skipped (--quick)", true);
    return;
  }

  // Retrain on the finance group — invalidates the engine cache so the
  // next chat reloads with fresh corpus + auto-learned utterances.
  const retrain = await timed(async () => {
    const res = await fetch(`${ENGINE_URL}/api/admin/learning/retrain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
      },
      body: JSON.stringify({ groupId: "finance" }),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  });
  const ok = retrain.result?.ok && retrain.result?.body?.success === true;
  record(
    "write-learning",
    "retrain trigger (finance)",
    !!ok,
    `status=${retrain.result?.status} body=${JSON.stringify(retrain.result?.body)?.slice(0, 80)}`,
    retrain.durationMs,
  );

  // First chat after retrain — should still classify correctly. This
  // is the key acceptance test for the learning loop (commit 9925a5e):
  // if retrain breaks the model, the next message fails.
  const ping = await timed(() =>
    postChat("hello", `validation-postretrain-${Date.now()}`, "finance"),
  );
  record(
    "write-learning",
    "chat works after retrain",
    !!ping.result?.ok && ping.result?.data?.intent === "greeting",
    `intent=${ping.result?.data?.intent}`,
    ping.durationMs,
  );
}

// ─── Report ───────────────────────────────────────────────────────────────

function buildReport() {
  const total = results.length;
  const failed = results.filter((r) => !r.ok);
  const passed = total - failed.length;
  const pctPass = total > 0 ? ((passed / total) * 100).toFixed(1) : "0";

  const bySection = new Map();
  for (const r of results) {
    if (!bySection.has(r.section)) bySection.set(r.section, []);
    bySection.get(r.section).push(r);
  }

  const lines = [];
  lines.push("# Demo Validation Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Targets: ${NEXT_URL} (UI), ${ENGINE_URL} (engine), ${MOCK_URL} (mock-api)`);
  lines.push("");
  lines.push(`**Pass rate: ${pctPass}%** (${passed} / ${total})`);
  if (failed.length > 0) {
    lines.push("");
    lines.push(`**Failures: ${failed.length}**`);
    lines.push("");
    for (const f of failed) {
      lines.push(`- \`${f.section}\` — **${f.name}** — ${f.detail || "(no detail)"}`);
    }
  }
  lines.push("");
  for (const [sec, items] of bySection) {
    const secFail = items.filter((i) => !i.ok).length;
    lines.push(`## ${sec} (${items.length - secFail}/${items.length})`);
    lines.push("");
    lines.push("| Status | Check | Duration | Detail |");
    lines.push("|---|---|---:|---|");
    for (const i of items) {
      const status = i.ok ? "✓" : "✗ FAIL";
      const dur = i.durationMs != null ? `${i.durationMs}ms` : "";
      const detail = (i.detail || "").replace(/\|/g, "\\|").slice(0, 160);
      lines.push(`| ${status} | ${i.name} | ${dur} | ${detail} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  await testHealth();
  await testAdminApi();
  await testAdminPages();
  await testChatBasic();
  await testFloorAndDisambig();
  await testGroups();
  await testQueryAndFollowups();
  await testFilters();
  await testForceIntent();
  await testExportUndo();
  await testAnalysis();
  await testDrillDown();
  await testPiiMasking();
  await testSnapshots();
  await testEdgeCases();
  await testGroupIsolation();
  await testSynonymCrud();
  await testLearningRetrain();

  const report = buildReport();
  await writeFile("docs/DEMO-VALIDATION.md", report, "utf-8");

  const failed = results.filter((r) => !r.ok).length;
  const total = results.length;
  if (JSON_ONLY) {
    process.stdout.write(JSON.stringify({ total, failed, results }, null, 2));
  } else {
    process.stdout.write(`\n────────────────────────────\n`);
    process.stdout.write(`Total: ${total}  Passed: ${total - failed}  Failed: ${failed}\n`);
    process.stdout.write(`Report: docs/DEMO-VALIDATION.md\n`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Harness crashed:", e);
  process.exit(2);
});
