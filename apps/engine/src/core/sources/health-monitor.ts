/**
 * Data-source health monitor.
 *
 * Every group is backed by a data source (mock-api, real REST API,
 * MSSQL/Oracle connector, CSV file system, etc.) reached through a
 * baseUrl. When one of those goes down — DB rebooting, VPN dropped,
 * connector container OOMed — the bot doesn't notice until the next
 * user-triggered query fails. By then the user has already seen a
 * 500.
 *
 * This monitor probes each known baseUrl at a fixed interval, keeps
 * the most recent status in memory, and exposes it to:
 *
 *   - `GET /api/admin/sources/health` — operator dashboard
 *   - the chat route, so we can return DATA_SOURCE_UNAVAILABLE early
 *     instead of waiting for the per-request retry loop to give up
 *   - the engine readiness probe (/api/health/ready), so a load
 *     balancer can drain traffic from a degraded instance
 *
 * Probe = HEAD then GET (some endpoints reject HEAD); 5s timeout per
 * attempt. Status transitions are logged at warn level on first
 * unreachable and at info level on recovery.
 *
 * Note: this module is intentionally simple. No circuit breaker, no
 * exponential probe backoff. The existing ApiClient already has a
 * circuit breaker per-baseUrl for the request-path; the monitor's
 * job is observability, not retry policy.
 */

import { logger } from "@/lib/logger";

export type SourceStatus = "ok" | "unreachable" | "unknown";

export interface SourceHealth {
  baseUrl: string;
  status: SourceStatus;
  lastChecked: string;
  latencyMs?: number;
  lastError?: string;
  /** How many probe attempts in a row have failed */
  consecutiveFails: number;
  /** Number of times the status has flipped — useful for stability scoring */
  flips: number;
}

const PROBE_TIMEOUT_MS = 5_000;
const DEFAULT_PROBE_INTERVAL_MS = 30_000;

const state = new Map<string, SourceHealth>();
let timer: ReturnType<typeof setInterval> | null = null;
let started = false;
let probeIntervalMs = DEFAULT_PROBE_INTERVAL_MS;

/**
 * Register a baseUrl to be probed. Idempotent — same URL twice is a
 * no-op. URLs are normalised by trimming a trailing slash so
 * `http://x:8080/` and `http://x:8080` collapse to the same entry.
 */
export function registerSource(baseUrl: string): void {
  const key = normalize(baseUrl);
  if (!key || state.has(key)) return;
  state.set(key, {
    baseUrl: key,
    status: "unknown",
    lastChecked: new Date(0).toISOString(),
    consecutiveFails: 0,
    flips: 0,
  });
  logger.info({ baseUrl: key }, "Source health: registered");
}

/** Drop a source from the monitor (e.g. group reconfigured to use a new URL). */
export function unregisterSource(baseUrl: string): void {
  const key = normalize(baseUrl);
  state.delete(key);
}

export function getAllHealth(): SourceHealth[] {
  return Array.from(state.values()).map((h) => ({ ...h }));
}

export function getHealth(baseUrl: string): SourceHealth | null {
  const key = normalize(baseUrl);
  return state.get(key) ? { ...(state.get(key) as SourceHealth) } : null;
}

/** Run an immediate probe of every registered source — bypasses the timer. */
export async function probeAll(): Promise<SourceHealth[]> {
  const out: SourceHealth[] = [];
  for (const key of state.keys()) {
    out.push(await probeOne(key));
  }
  return out;
}

/**
 * Probe a single baseUrl. Updates internal state and returns the
 * post-probe snapshot.
 */
export async function probeOne(baseUrl: string): Promise<SourceHealth> {
  const key = normalize(baseUrl);
  const prior = state.get(key) ?? {
    baseUrl: key,
    status: "unknown" as SourceStatus,
    lastChecked: new Date(0).toISOString(),
    consecutiveFails: 0,
    flips: 0,
  };

  const start = Date.now();
  let ok = false;
  let lastError: string | undefined;

  // Try HEAD first; some servers reject HEAD on the root path so
  // fall back to GET. Both honour the same abort timeout.
  for (const method of ["HEAD", "GET"] as const) {
    const ctrl = new AbortController();
    const timeoutHandle = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(key, { method, signal: ctrl.signal });
      // Any non-network response (even 4xx/5xx) means the host is alive.
      // We're testing reachability, not correctness.
      ok = res.status < 600;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Try the next method
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  const elapsed = Date.now() - start;
  const newStatus: SourceStatus = ok ? "ok" : "unreachable";
  const flipped = prior.status !== "unknown" && prior.status !== newStatus;
  const next: SourceHealth = {
    baseUrl: key,
    status: newStatus,
    lastChecked: new Date().toISOString(),
    latencyMs: elapsed,
    consecutiveFails: ok ? 0 : prior.consecutiveFails + 1,
    flips: prior.flips + (flipped ? 1 : 0),
    ...(lastError && !ok && { lastError }),
  };
  state.set(key, next);

  if (flipped) {
    if (newStatus === "ok") {
      logger.info(
        { baseUrl: key, latencyMs: elapsed },
        "Source health: recovered",
      );
    } else {
      logger.warn(
        {
          baseUrl: key,
          consecutiveFails: next.consecutiveFails,
          lastError,
        },
        "Source health: unreachable",
      );
    }
  }

  return { ...next };
}

/**
 * Boot the monitor — registers any sources passed in and starts the
 * background probe loop. Safe to call multiple times; subsequent
 * calls just register additional sources without resetting the timer.
 */
export function startHealthMonitor(initialSources: string[] = []): void {
  for (const url of initialSources) registerSource(url);
  if (started) return;
  started = true;
  // Fire one probe immediately so the first health request after
  // startup returns real data instead of "unknown".
  void probeAll().catch(() => {
    /* probes log their own errors */
  });
  timer = setInterval(() => {
    void probeAll().catch(() => {});
  }, probeIntervalMs);
  // Don't block process exit on the monitor — important for tests + ctrl-c.
  timer.unref?.();
}

/** Stop the background probe (tests / graceful shutdown). */
export function stopHealthMonitor(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

/** Tests + admin "speed up" knob — change the probe interval. */
export function setProbeInterval(ms: number): void {
  probeIntervalMs = Math.max(1_000, ms);
  if (started) {
    stopHealthMonitor();
    startHealthMonitor();
  }
}

function normalize(baseUrl: string): string {
  if (!baseUrl) return "";
  return baseUrl.replace(/\/+$/, "");
}
