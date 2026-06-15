#!/usr/bin/env node
/**
 * Load test for the constrained demo stack (1.5 vCPU / 4 GB total).
 *
 * The engine fetches large upstream payloads (mock-api /api/perf/transactions
 * serves up to 100k synthetic rows; the harness asks for 50k ≈ 8 MB JSON) and
 * runs the full NLP → fetch → parse → transform pipeline per request. A unique
 * `nonce` filter forces a cache MISS (real upstream fetch); identical filters
 * are cache HITS once warm.
 *
 * Modes:
 *   --mode=full   (default) smoke → burst → sustained → cached (the original)
 *   --mode=ramp   stepped ramp-to-failure, all cache-busted, to find the
 *                 uncached user ceiling (P0.1)
 *   --mode=sweep  sustained run at several cache-miss ratios to find the
 *                 ratio at which the engine tips over (P0.2)
 *
 * Flags:
 *   --users=N         concurrency for full/sweep (default 25)
 *   --miss-ratio=R    cache-miss fraction 0..1 for full/sweep sustained
 *                     (default 1.0 = every request is a miss)
 *   --duration=S      sustained/sweep per-level seconds (default 120)
 *   --rows=N          upstream row count per request (default 50000)
 *
 * Usage:
 *   node scripts/load-test-constrained.mjs [engineUrl] [--mode=ramp]
 *   (default engineUrl: http://localhost:4011)
 *
 * Self-contained: registers the perf_transactions query via the admin API
 * (open in demo mode) before running.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// --- arg parsing ------------------------------------------------------------
const rawArgs = process.argv.slice(2);
const positional = rawArgs.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  rawArgs
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? 'true'];
    }),
);

const ENGINE_URL = positional[0] || 'http://localhost:4011';
const MODE = flags.mode || 'full';
const USERS = parseInt(flags.users || '25', 10);
const MISS_RATIO = parseFloat(flags['miss-ratio'] ?? '1.0');
const DURATION_S = parseInt(flags.duration || '120', 10);
const ROWS = parseInt(flags.rows || '50000', 10);
// Realistic default: each VU reuses ONE session (25 users => 25 sessions), so
// the engine's per-session __fullRows retention is bounded like real usage.
// --unique-sessions reproduces the pathological case (a new retained snapshot
// per request) for comparison.
const UNIQUE_SESSIONS = flags['unique-sessions'] === 'true';
// Per-run id so each invocation uses fresh session/user files. The engine
// persists sessions per-user on a volume that survives restarts, so without
// this a rerun inherits the previous run's (possibly huge) session files.
const RUN_ID = flags.run || String(Date.now());
const REQUEST_TIMEOUT_MS = 60_000;
const ENGINE_CONTAINER = 'chatbot-constrained-engine-1';
const CONTAINERS = [
  ENGINE_CONTAINER,
  'chatbot-constrained-ui-1',
  'chatbot-constrained-mock-api-1',
];

// Ramp config (P0.1)
const RAMP_LEVELS = [5, 10, 15, 20, 25];
const RAMP_WINDOW_S = 45;
const RAMP_MEM_CEILING_MIB = 1900; // engine cap is 2048; flag approach to OOM
const RAMP_FAIL_RATE_LIMIT = 0.05;
// Latency SLO marker — recorded per level but does NOT stop the ramp. We want
// the *failure/crash* ceiling; cold 50k pulls are inherently multi-second even
// at low concurrency, so a latency gate would false-trigger at level 1.
const RAMP_P99_SLO_MS = 5000;

// Sweep config (P0.2)
const SWEEP_RATIOS = [0.1, 0.3, 0.5, 1.0];

// --- request construction ---------------------------------------------------
let reqCounter = 0;
let missCounter = 0;

// Deterministic per-request miss decision: spreads `missRatio` evenly so a
// run is reproducible (no Math.random). Returns true => cache-busted (miss).
function decideMiss(missRatio) {
  if (missRatio >= 1) return true;
  if (missRatio <= 0) return false;
  reqCounter += 1;
  const expectedMisses = Math.floor(reqCounter * missRatio);
  if (expectedMisses > missCounter) {
    missCounter = expectedMisses;
    return true;
  }
  return false;
}

let nonceCounter = 0;

function buildChatBody({ vu, cacheBust }) {
  const filters = { count: String(ROWS) };
  // Hits share one filter set (one cache entry); misses get a unique nonce.
  if (cacheBust) filters.nonce = `n${++nonceCounter}-${vu}`;
  // Bounded sessions by default (one per VU) so retained __fullRows snapshots
  // scale with user count, not request count — matching real usage.
  const sessionId = UNIQUE_SESSIONS
    ? `lt-${RUN_ID}-vu${vu}-${cacheBust ? nonceCounter : 'shared'}`
    : `lt-${RUN_ID}-vu${vu}`;
  return JSON.stringify({
    text: 'show perf transactions',
    sessionId,
    groupId: 'default',
    userName: `lt-${RUN_ID}-user-${vu}`,
    forceIntent: 'perf_transactions',
    explicitFilters: filters,
  });
}

async function chatRequest({ vu, cacheBust }) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${ENGINE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: buildChatBody({ vu, cacheBust }),
      signal: controller.signal,
    });
    const bodyText = await res.text();
    const elapsedMs = Date.now() - startedAt;
    let rows = 0;
    let cacheStatus = '';
    try {
      const parsed = JSON.parse(bodyText);
      rows = parsed.richContent?.data?.rowCount ?? 0;
      cacheStatus = parsed.richContent?.data?.cacheStatus ?? '';
    } catch {
      // non-JSON error body — captured via status code
    }
    // Real success = HTTP 200 AND actual rows returned. A 200 with 0 rows is a
    // degraded/empty response (e.g. the 30s-budget shed) and must NOT count as ok.
    const ok = res.status === 200 && rows > 0;
    const empty200 = res.status === 200 && rows === 0;
    return {
      ok,
      status: res.status,
      empty200,
      elapsedMs,
      bytes: bodyText.length,
      rows,
      cacheStatus: typeof cacheStatus === 'object' ? cacheStatus?.status : cacheStatus,
      sampleBody: empty200 && bodyText.length < 1500 ? bodyText : undefined,
    };
  } catch (error) {
    const aborted = error.name === 'AbortError';
    return { ok: false, status: aborted ? 'timeout' : 'conn-error', empty200: false, elapsedMs: Date.now() - startedAt, bytes: 0, rows: 0, cacheStatus: '' };
  } finally {
    clearTimeout(timer);
  }
}

// --- stats ------------------------------------------------------------------
function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
  return sortedValues[Math.max(0, index)];
}

function summarize(label, results, extra = {}) {
  const okResults = results.filter((r) => r.ok);
  const latencies = okResults.map((r) => r.elapsedMs).sort((a, b) => a - b);
  const statusCounts = {};
  for (const r of results) {
    const key = String(r.status);
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  }
  const cacheHits = okResults.filter((r) => r.cacheStatus === 'hit').length;
  const empty200 = results.filter((r) => r.empty200).length;
  const sample = results.find((r) => r.sampleBody)?.sampleBody;
  const summary = {
    label,
    total: results.length,
    ok: okResults.length,
    failed: results.length - okResults.length,
    empty200, // HTTP 200 but 0 rows — degraded/shed responses
    failRate: results.length ? +((results.length - okResults.length) / results.length).toFixed(3) : 0,
    statusCounts,
    cacheHits,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] || 0,
    avgRows: okResults.length ? Math.round(okResults.reduce((a, r) => a + r.rows, 0) / okResults.length) : 0,
    ...extra,
  };
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(summary, null, 2));
  if (sample) console.log(`empty200 sample body: ${sample}`);
  return summary;
}

// --- docker sampler + restart detection -------------------------------------
const statsSamples = [];
let samplerTimer = null;

function sampleDockerStats() {
  execFile(
    'docker',
    ['stats', '--no-stream', '--format', '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}', ...CONTAINERS],
    (error, stdout) => {
      if (error) return;
      const at = Date.now();
      for (const line of stdout.trim().split('\n')) {
        const [name, cpu, mem] = line.split('|');
        if (!name) continue;
        statsSamples.push({ at, name, cpuPct: parseFloat(cpu), memMiB: parseMemMiB(mem) });
      }
    },
  );
}

function parseMemMiB(memUsage) {
  const used = (memUsage || '').split('/')[0].trim();
  const value = parseFloat(used);
  if (used.includes('GiB')) return value * 1024;
  if (used.includes('MiB')) return value;
  if (used.includes('KiB')) return value / 1024;
  return value;
}

function statsReport(sinceAt) {
  const window = statsSamples.filter((s) => s.at >= sinceAt);
  const byName = {};
  for (const s of window) {
    const e = byName[s.name] || { peakCpuPct: 0, peakMemMiB: 0, samples: 0 };
    byName[s.name] = {
      peakCpuPct: Math.max(e.peakCpuPct, s.cpuPct || 0),
      peakMemMiB: Math.round(Math.max(e.peakMemMiB, s.memMiB || 0)),
      samples: e.samples + 1,
    };
  }
  return byName;
}

function peakEngineMem(sinceAt) {
  return statsReport(sinceAt)[ENGINE_CONTAINER]?.peakMemMiB ?? 0;
}

async function getRestartCount() {
  try {
    const { stdout } = await execFileAsync('docker', ['inspect', ENGINE_CONTAINER, '--format', '{{.RestartCount}}']);
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return -1;
  }
}

async function waitForHealth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${ENGINE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(2000);
  }
  return false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- virtual user -----------------------------------------------------------
async function runVirtualUser(vu, untilAt, results, { missRatio }) {
  let iteration = 0;
  while (Date.now() < untilAt) {
    const cacheBust = decideMiss(missRatio);
    results.push(await chatRequest({ vu, cacheBust }));
    iteration += 1;
    const thinkMs = 2000 + ((vu * 7919 + iteration * 104729) % 3000);
    const remaining = untilAt - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(thinkMs, remaining));
  }
}

// --- query registration -----------------------------------------------------
async function registerPerfQuery() {
  // Idempotent: if the query already exists (e.g. persisted on the CONFIG_DIR
  // volume across a restart), skip the POST — re-registering invalidates the
  // query registry + NLP corpus and forces a cold rebuild that briefly returns
  // 0-row responses.
  try {
    const listRes = await fetch(`${ENGINE_URL}/api/admin/queries?groupId=default`);
    if (listRes.ok) {
      const { queries } = await listRes.json();
      if (Array.isArray(queries) && queries.some((q) => q.name === 'perf_transactions')) {
        console.log('perf_transactions already registered — skipping create.');
        return;
      }
    }
  } catch {
    // fall through to create
  }
  const res = await fetch(`${ENGINE_URL}/api/admin/queries?groupId=default`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'perf_transactions',
      description: 'Perf test: large synthetic transaction dataset for load testing',
      estimatedDuration: 5000,
      source: 'finance',
      type: 'api',
      endpoint: '/perf/transactions',
      authType: 'none',
      filters: [
        { key: 'count', binding: 'body' },
        { key: 'nonce', binding: 'body' },
      ],
      columnConfig: {
        labelColumns: ['txn_id', 'posting_date', 'region', 'product'],
        valueColumns: ['amount', 'currency', 'status', 'account'],
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to register perf_transactions query: HTTP ${res.status} ${await res.text()}`);
  }
  console.log(`perf_transactions query registered (HTTP ${res.status})`);
}

async function smoke() {
  // Warm-up retry: re-registering the query invalidates the registry/NLP
  // corpus, and the first request during that rebuild can return a degraded
  // (0-row) response. Retry until we get a real result before measuring.
  let r;
  for (let attempt = 1; attempt <= 40; attempt++) {
    r = await chatRequest({ vu: 0, cacheBust: true });
    if (r.ok && r.rows > 0) {
      console.log(`\n=== Smoke (warm after ${attempt} attempt${attempt > 1 ? 's' : ''}) ===`);
      console.log(JSON.stringify(r, null, 2));
      return;
    }
    await sleep(1000);
  }
  console.error('Smoke never returned rows after warm-up — aborting.');
  console.error(JSON.stringify(r, null, 2));
  process.exit(1);
}

// --- modes ------------------------------------------------------------------
async function runRamp() {
  console.log(`\n### MODE: ramp-to-failure — levels [${RAMP_LEVELS.join(', ')}] VUs, ${RAMP_WINDOW_S}s windows, all cache-busted, ${ROWS} rows`);
  const baselineRestarts = await getRestartCount();
  const levels = [];
  let ceiling = null;
  let breakReason = null;

  for (const level of RAMP_LEVELS) {
    const windowResults = [];
    const start = Date.now();
    const until = start + RAMP_WINDOW_S * 1000;
    await Promise.all(
      Array.from({ length: level }, (_, vu) => runVirtualUser(vu, until, windowResults, { missRatio: 1.0 })),
    );
    const restarts = await getRestartCount();
    const crashed = restarts > baselineRestarts;
    const peakMem = peakEngineMem(start);
    const summary = summarize(`Ramp level=${level} VUs`, windowResults, { peakEngineMemMiB: peakMem, engineCrashed: crashed });
    const sloBreached = summary.p99 > RAMP_P99_SLO_MS;
    levels.push({ level, p50: summary.p50, p95: summary.p95, p99: summary.p99, failRate: summary.failRate, peakMem, crashed, sloBreached, throughput: +(summary.ok / RAMP_WINDOW_S).toFixed(2) });

    // Break only on real failure/crash — NOT on latency (that's an SLO marker).
    const reasons = [];
    if (crashed) reasons.push('engine restarted (OOM/crash)');
    if (summary.failRate > RAMP_FAIL_RATE_LIMIT) reasons.push(`failRate ${summary.failRate} > ${RAMP_FAIL_RATE_LIMIT}`);
    if (peakMem >= RAMP_MEM_CEILING_MIB) reasons.push(`engine mem ${peakMem}MiB >= ${RAMP_MEM_CEILING_MIB}MiB`);

    if (reasons.length) {
      breakReason = reasons.join('; ');
      const idx = RAMP_LEVELS.indexOf(level);
      ceiling = idx > 0 ? RAMP_LEVELS[idx - 1] : 0;
      console.log(`\n>>> BREAK at level ${level}: ${breakReason}`);
      if (crashed) {
        console.log('Waiting for engine to recover before reporting...');
        await waitForHealth();
      }
      break;
    }
    await sleep(3000); // settle between levels
  }

  const withinSlo = levels.filter((l) => !l.sloBreached && !l.crashed && l.failRate <= RAMP_FAIL_RATE_LIMIT);
  const latencySloCeiling = withinSlo.length ? withinSlo[withinSlo.length - 1].level : 0;
  console.log('\n=== RAMP RESULT ===');
  console.log(
    JSON.stringify(
      {
        failureCeilingUsers: ceiling, // null = no hard failure up to max level tested
        maxLevelTested: RAMP_LEVELS[RAMP_LEVELS.length - 1],
        brokeAtBreak: breakReason,
        latencySloCeilingUsers: latencySloCeiling, // highest VU level with p99 < 5s
        perLevel: levels,
      },
      null,
      2,
    ),
  );
}

async function runSweep() {
  console.log(`\n### MODE: miss-ratio sweep — ${USERS} users, ${DURATION_S}s/level, ratios [${SWEEP_RATIOS.join(', ')}], ${ROWS} rows`);
  const baselineRestarts = await getRestartCount();
  const rows = [];
  for (const ratio of SWEEP_RATIOS) {
    reqCounter = 0;
    missCounter = 0;
    const start = Date.now();
    const results = [];
    const until = start + DURATION_S * 1000;
    await Promise.all(
      Array.from({ length: USERS }, (_, vu) => runVirtualUser(vu, until, results, { missRatio: ratio })),
    );
    const restarts = await getRestartCount();
    const crashed = restarts > baselineRestarts;
    const peakMem = peakEngineMem(start);
    const summary = summarize(`Sweep miss-ratio=${ratio}`, results, { peakEngineMemMiB: peakMem, engineCrashed: crashed });
    rows.push({ ratio, p50: summary.p50, p95: summary.p95, p99: summary.p99, failRate: summary.failRate, cacheHits: summary.cacheHits, peakMem, crashed });
    if (crashed) {
      console.log('Engine crashed during this level — waiting for recovery before next.');
      await waitForHealth();
    }
    await sleep(5000); // let caches/backlog settle between levels
  }
  console.log('\n=== SWEEP RESULT (miss-ratio → behavior) ===');
  console.log(JSON.stringify(rows, null, 2));
}

async function runFull() {
  console.log(`\n### MODE: full — ${USERS} users, ${ROWS} rows/request`);
  // Phase 1 — burst (worst case, all miss, no think time)
  const burstStart = Date.now();
  const burstResults = await Promise.all(
    Array.from({ length: USERS }, (_, vu) => chatRequest({ vu, cacheBust: true })),
  );
  summarize('Phase 1: burst (concurrent, cache-busted)', burstResults, { peakEngineMemMiB: peakEngineMem(burstStart) });

  // Phase 2 — sustained at MISS_RATIO
  const sStart = Date.now();
  const sResults = [];
  await Promise.all(
    Array.from({ length: USERS }, (_, vu) => runVirtualUser(vu, sStart + DURATION_S * 1000, sResults, { missRatio: MISS_RATIO })),
  );
  summarize(`Phase 2: sustained ${DURATION_S}s (miss-ratio ${MISS_RATIO})`, sResults, { peakEngineMemMiB: peakEngineMem(sStart) });

  // Phase 3 — cached (all hits)
  const cStart = Date.now();
  const cResults = [];
  await Promise.all(
    Array.from({ length: USERS }, (_, vu) => runVirtualUser(vu, cStart + 60 * 1000, cResults, { missRatio: 0 })),
  );
  summarize('Phase 3: cached 60s (shared filters)', cResults, { peakEngineMemMiB: peakEngineMem(cStart) });
}

async function main() {
  console.log(`Load test against ${ENGINE_URL} — mode=${MODE}`);
  await registerPerfQuery();
  await smoke();

  samplerTimer = setInterval(sampleDockerStats, 3000);
  sampleDockerStats();

  if (MODE === 'ramp') await runRamp();
  else if (MODE === 'sweep') await runSweep();
  else await runFull();

  clearInterval(samplerTimer);
  console.log('\n=== DONE ===');
}

main().catch((error) => {
  if (samplerTimer) clearInterval(samplerTimer);
  console.error('Load test crashed:', error);
  process.exit(1);
});
