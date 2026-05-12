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
 * No mutations — validation is read-only, safe to run anytime.
 *
 * Run:  node scripts/demo/validate.mjs
 *       node scripts/demo/validate.mjs --json    (machine-readable)
 *       node scripts/demo/validate.mjs --quick   (skip slow chat tests)
 */

import { writeFile } from "node:fs/promises";

const NEXT_URL = process.env.NEXT_URL || "http://localhost:3001";
const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4001";
const MOCK_URL = process.env.MOCK_URL || "http://localhost:8080";

const args = new Set(process.argv.slice(2));
const QUICK = args.has("--quick");
const JSON_ONLY = args.has("--json");

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
  await testAnalysis();

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
