import { ChatbotEngine } from '@/core/engine';
import { NlpService } from '@/core/nlp/nlp-service';
import { FuzzyMatcher } from '@/core/nlp/fuzzy-matcher';
import { ApiClient } from '@/core/api-connector/api-client';
import { QueryService } from '@/core/api-connector/query-service';
import { ResponseGenerator } from '@/core/response/response-generator';
import { SessionManager } from '@/core/session/session-manager';
import { LearningService } from '@/core/learning/learning-service';
import { getGroupConfig } from '@/config/group-config';
import { logger } from '@/lib/logger';

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

export async function getEngine(groupId: string = 'default'): Promise<ChatbotEngine> {
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

  const fuzzyMatcher = new FuzzyMatcher(groupConfig.faq);
  const nlpService = new NlpService(fuzzyMatcher, groupConfig.corpus);
  const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
  const queryService = new QueryService(apiClient, groupConfig.sources);
  const responseGenerator = new ResponseGenerator(queryService, groupConfig.templates, groupId);
  const sessionManager = new SessionManager();
  const learningService = new LearningService(groupId);

  const engine = new ChatbotEngine(nlpService, responseGenerator, sessionManager, learningService, groupId);

  // Initialize (trains NLP model) — this is the expensive CPU operation
  await engine.initialize();

  engines.set(groupId, engine);
  logger.info({ groupId, initMs: Date.now() - start }, 'Engine initialized');
  return engine;
}

export function invalidateEngine(groupId: string): void {
  engines.delete(groupId);
  initLocks.delete(groupId);
}

export function invalidateAllEngines(): void {
  engines.clear();
  initLocks.clear();
}

/** Returns the number of initialized engines (for health/metrics). */
export function getEngineCount(): number {
  return engines.size;
}

/** Returns group IDs of all initialized engines. */
export function getInitializedGroups(): string[] {
  return Array.from(engines.keys());
}
