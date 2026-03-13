import { LRUCache } from 'lru-cache';
import { SESSION_TTL_MS, MAX_SESSIONS } from '../constants';
import { logger } from '@/lib/logger';
import type { ConversationContext } from '../types';

/**
 * In-memory session store using LRU cache.
 *
 * Replaces the hand-rolled Map + setInterval cleanup with LRU cache that
 * provides O(1) eviction, automatic TTL expiry, and bounded memory usage.
 *
 * At 1500 req/min, the old O(n) evictOldest() scan across 10,000 sessions
 * was a latency spike on every capacity overflow. LRU eviction is O(1).
 */
export class SessionManager {
  private sessions: LRUCache<string, ConversationContext>;

  constructor() {
    this.sessions = new LRUCache<string, ConversationContext>({
      max: MAX_SESSIONS,
      ttl: SESSION_TTL_MS,
      updateAgeOnGet: true, // Refresh TTL on access (like lastAccess = Date.now())
      disposeAfter: (value, key) => {
        logger.debug({ sessionId: key }, 'Session evicted');
      },
    });
  }

  async getContext(sessionId: string): Promise<ConversationContext> {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;

    const context: ConversationContext = {
      sessionId,
      history: [],
    };
    this.sessions.set(sessionId, context);
    return context;
  }

  async saveContext(context: ConversationContext): Promise<void> {
    this.sessions.set(context.sessionId, context);
  }

  /** Returns the current number of active sessions. */
  size(): number {
    return this.sessions.size;
  }

  /** Clears all sessions. */
  destroy(): void {
    this.sessions.clear();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }
}
