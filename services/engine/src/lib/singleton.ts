import { ChatbotEngine } from "@/core/engine";
import { NlpService } from "@/core/nlp/nlp-service";
import { FuzzyMatcher } from "@/core/nlp/fuzzy-matcher";
import { ApiClient } from "@/core/api-connector/api-client";
import { QueryService } from "@/core/api-connector/query-service";
import { ResponseGenerator } from "@/core/response/response-generator";
import { SessionManager } from "@/core/session/session-manager";
import { LearningService } from "@/core/learning/learning-service";
import { getGroupConfig } from "@/config/group-config";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Engine cache with initialization lock
// ---------------------------------------------------------------------------
// At 1500 req/min, many concurrent requests can arrive for the same groupId
// before the first engine finishes NLP training. Without a lock, each request
// creates a separate engine → duplicate CPU-heavy nlp.train() calls.
//
// The lock map stores a Promise per groupId that resolves once the engine is
// fully initialized. All concurrent callers await the same Promise.
// ---------------------------------------------------------------------------

const engines = new Map<string, ChatbotEngine>();
const initLocks = new Map<string, Promise<ChatbotEngine>>();

// Per-engine last-access timestamp (epoch ms). Drives idle eviction
// below so a long-running deployment with many groups doesn't carry
// every group's NLP service in RAM forever (each is ~50-200 MB).
//
// Tunable via env:
//   ENGINE_IDLE_TTL_MS    — evict an engine after this many ms idle
//   ENGINE_SWEEP_INTERVAL_MS — how often to check
// Disable entirely by setting ENGINE_IDLE_TTL_MS=0.
const lastAccessedAt = new Map<string, number>();
const ENGINE_IDLE_TTL_MS = parseInt(
  process.env.ENGINE_IDLE_TTL_MS || `${30 * 60 * 1000}`, // 30 min
  10,
);
const ENGINE_SWEEP_INTERVAL_MS = parseInt(
  process.env.ENGINE_SWEEP_INTERVAL_MS || `${5 * 60 * 1000}`, // 5 min
  10,
);

let sweepTimer: ReturnType<typeof setInterval> | null = null;

function touch(groupId: string): void {
  lastAccessedAt.set(groupId, Date.now());
}

async function sweepIdleEngines(): Promise<void> {
  if (ENGINE_IDLE_TTL_MS <= 0) return;
  const now = Date.now();
  const stale: string[] = [];
  for (const [groupId, ts] of lastAccessedAt) {
    if (now - ts > ENGINE_IDLE_TTL_MS) stale.push(groupId);
  }
  for (const groupId of stale) {
    try {
      await invalidateEngine(groupId);
      lastAccessedAt.delete(groupId);
      logger.info(
        { groupId, idleMs: now - (lastAccessedAt.get(groupId) ?? 0) },
        "Engine idle-evicted",
      );
    } catch (err) {
      logger.warn({ err, groupId }, "Engine idle eviction failed");
    }
  }
}

function ensureSweep(): void {
  if (sweepTimer || ENGINE_IDLE_TTL_MS <= 0) return;
  sweepTimer = setInterval(() => {
    void sweepIdleEngines().catch(() => {});
  }, ENGINE_SWEEP_INTERVAL_MS);
  sweepTimer.unref?.();
}

export async function getEngine(
  groupId: string = "default",
): Promise<ChatbotEngine> {
  ensureSweep();
  touch(groupId);

  // Fast path: engine already initialized
  const existing = engines.get(groupId);
  if (existing?.isInitialized()) return existing;

  // Check if another request is already initializing this engine
  const pendingInit = initLocks.get(groupId);
  if (pendingInit) return pendingInit;

  // Create and store the initialization promise before awaiting
  const initPromise = createAndInitEngine(groupId);
  initLocks.set(groupId, initPromise);

  try {
    const engine = await initPromise;
    return engine;
  } catch (error) {
    // Remove failed lock so next request can retry
    initLocks.delete(groupId);
    engines.delete(groupId);
    throw error;
  } finally {
    initLocks.delete(groupId);
  }
}

async function createAndInitEngine(groupId: string): Promise<ChatbotEngine> {
  const start = Date.now();
  const groupConfig = getGroupConfig(groupId);

  const fuzzyMatcher = new FuzzyMatcher(groupConfig.faq, groupId);
  const nlpService = new NlpService(
    fuzzyMatcher,
    groupConfig.corpus,
    groupConfig.sources,
    groupId,
    groupConfig.queries,
  );
  const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
  const queryService = new QueryService(
    apiClient,
    groupConfig.sources,
    groupConfig.queries,
  );
  const responseGenerator = new ResponseGenerator(
    queryService,
    groupConfig.templates,
    groupId,
  );
  const sessionManager = new SessionManager();
  const learningService = new LearningService(groupId);

  const engine = new ChatbotEngine(
    nlpService,
    responseGenerator,
    sessionManager,
    learningService,
    groupId,
  );

  // Initialize (trains NLP model) — this is the expensive CPU operation
  await engine.initialize();

  engines.set(groupId, engine);
  logger.info({ groupId, initMs: Date.now() - start }, "Engine initialized");
  return engine;
}

/**
 * Per-group "invalidation in progress" tracker.
 *
 * Without this, two near-simultaneous retrain clicks could both
 * call invalidateEngine while a chat request was in-flight, leaving
 * a window where two NLP inits race for the same group. Both would
 * complete correctly, but burn 2× CPU and produce log noise. The
 * tracker serialises invalidations per group: the second concurrent
 * caller awaits the first, then no-ops.
 */
const pendingInvalidation = new Map<string, Promise<void>>();

export async function invalidateEngine(groupId: string): Promise<void> {
  const existing = pendingInvalidation.get(groupId);
  if (existing) {
    // Another caller is already invalidating this group. Coalesce.
    return existing;
  }

  const work = (async () => {
    // If an init is in flight, let it finish before we drop the
    // engine — otherwise we'd strand the lock entry with a promise
    // that resolves into a now-orphaned engine. Tolerate init
    // failure (the engine is going away anyway).
    const pendingInit = initLocks.get(groupId);
    if (pendingInit) {
      await pendingInit.catch(() => {});
    }
    engines.delete(groupId);
    initLocks.delete(groupId);
    lastAccessedAt.delete(groupId);
  })().finally(() => {
    pendingInvalidation.delete(groupId);
  });

  pendingInvalidation.set(groupId, work);
  return work;
}

export async function invalidateAllEngines(): Promise<void> {
  await Promise.all(
    Array.from(engines.keys()).map((groupId) => invalidateEngine(groupId)),
  );
}

/** Returns the number of initialized engines (for health/metrics). */
export function getEngineCount(): number {
  return engines.size;
}

/** Returns group IDs of all initialized engines. */
export function getInitializedGroups(): string[] {
  return Array.from(engines.keys());
}

/**
 * Clear the API-client query cache for all engines.
 * Called after admin creates/updates/deletes queries so the
 * next request fetches a fresh query list from the data store.
 */
export function clearQueryCaches(): void {
  for (const engine of engines.values()) {
    engine.clearQueryCache();
  }
}

/**
 * Full cache + NLP invalidation: clears query caches AND forces all engines
 * to re-initialize on the next request (re-trains NLP with updated query names).
 * Called after admin creates/updates/deletes queries.
 */
export function invalidateQueryData(): void {
  clearQueryCaches();
  invalidateAllEngines();
  logger.info(
    "All engines invalidated — NLP will retrain with updated query names",
  );
}
