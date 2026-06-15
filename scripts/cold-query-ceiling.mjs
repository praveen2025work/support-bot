#!/usr/bin/env node
/**
 * Cold-query concurrency ceiling probe for the constrained stack.
 *
 * Each request uses a FRESH session+user and a unique nonce, so every request
 * is a real first-time query execution (a genuine 50k-row upstream fetch) —
 * NOT a follow-up (which would reuse __fullRows) and NOT a cache hit. Fresh
 * user per request also keeps per-user session files tiny, isolating the
 * fetch/parse cost from the session-file-bloat effect.
 *
 * For each concurrency level it fires N requests simultaneously (worst case,
 * no think time) and reports real success (HTTP 200 AND rows>0) vs sheds.
 *
 * Usage: node scripts/cold-query-ceiling.mjs [engineUrl]
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ENGINE_URL = process.argv[2] || 'http://localhost:4011';
const LEVELS = [1, 4, 8, 12, 16, 20, 25];
const ROWS = 50000;
const REQUEST_TIMEOUT_MS = 45_000;
const ENGINE = 'chatbot-constrained-engine-1';

let uid = 0;

async function oneQuery() {
  const id = ++uid;
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${ENGINE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'show perf transactions',
        sessionId: `cold-${id}`,
        groupId: 'default',
        userName: `cold-user-${id}`,
        forceIntent: 'perf_transactions',
        explicitFilters: { count: String(ROWS), nonce: `cold-${id}` },
      }),
      signal: controller.signal,
    });
    const txt = await res.text();
    let rows = 0;
    try {
      rows = JSON.parse(txt).richContent?.data?.rowCount ?? 0;
    } catch {
      /* non-JSON */
    }
    return { status: res.status, ms: Date.now() - t0, rows, ok: res.status === 200 && rows > 0 };
  } catch (e) {
    return { status: e.name === 'AbortError' ? 'timeout' : 'conn-err', ms: Date.now() - t0, rows: 0, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function engineMem() {
  try {
    const { stdout } = await execFileAsync('docker', ['stats', '--no-stream', '--format', '{{.MemUsage}}', ENGINE]);
    const used = stdout.split('/')[0].trim();
    const v = parseFloat(used);
    return used.includes('GiB') ? Math.round(v * 1024) : Math.round(v);
  } catch {
    return -1;
  }
}

const pct = (arr, p) => (arr.length ? arr.sort((a, b) => a - b)[Math.min(arr.length - 1, Math.ceil((p / 100) * arr.length) - 1)] : 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function registerIfNeeded() {
  const list = await (await fetch(`${ENGINE_URL}/api/admin/queries?groupId=default`)).json();
  if (list.queries?.some((q) => q.name === 'perf_transactions')) return;
  await fetch(`${ENGINE_URL}/api/admin/queries?groupId=default`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'perf_transactions', description: 'perf', estimatedDuration: 5000, source: 'finance',
      type: 'api', endpoint: '/perf/transactions', authType: 'none',
      filters: [{ key: 'count', binding: 'body' }, { key: 'nonce', binding: 'body' }],
      columnConfig: { labelColumns: ['txn_id', 'region'], valueColumns: ['amount', 'status'] },
    }),
  });
  await sleep(3000);
}

async function main() {
  console.log(`Cold-query ceiling probe → ${ENGINE_URL} (fresh session+user per request, ${ROWS} rows)`);
  await registerIfNeeded();
  // Warm once so the registry/corpus is built and the mock has memoized its array.
  for (let i = 0; i < 20; i++) {
    const w = await oneQuery();
    if (w.ok) break;
    await sleep(1000);
  }

  const table = [];
  for (const n of LEVELS) {
    const memBefore = await engineMem();
    const results = await Promise.all(Array.from({ length: n }, () => oneQuery()));
    const memAfter = await engineMem();
    const okR = results.filter((r) => r.ok);
    const lats = okR.map((r) => r.ms);
    const statusCounts = {};
    for (const r of results) statusCounts[String(r.status)] = (statusCounts[String(r.status)] || 0) + 1;
    const row = {
      level: n,
      okRows: okR.length,
      failed: n - okR.length,
      statusCounts,
      p50ok: pct(lats, 50),
      p95ok: pct(lats, 95),
      maxOk: lats.length ? lats[lats.length - 1] : 0,
      engineMemMiB: Math.max(memBefore, memAfter),
    };
    table.push(row);
    console.log(`\n=== level ${n} ===\n${JSON.stringify(row, null, 2)}`);
    await sleep(4000); // settle (and let 503'd-but-still-running work drain)
  }

  const fullyOk = table.filter((r) => r.failed === 0).map((r) => r.level);
  console.log('\n=== COLD-QUERY CEILING ===');
  console.log(JSON.stringify({
    maxLevelAllSucceeded: fullyOk.length ? Math.max(...fullyOk) : 0,
    perLevel: table,
  }, null, 2));
}

main().catch((e) => { console.error('probe crashed:', e); process.exit(1); });
