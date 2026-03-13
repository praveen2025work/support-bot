import { SESSION_TTL_MS, MAX_SESSIONS } from '../constants';
import { logger } from '@/lib/logger';
import type { ConversationContext } from '../types';

/**
 * In-memory session store with bounded size and TTL-based expiry.
 *
 * Lifecycle: the constructor starts a periodic cleanup interval. Callers that
 * create a SessionManager instance are responsible for calling `destroy()` when
 * the manager is no longer needed (e.g. on server shutdown) to clear the
 * interval and free memory. Failing to call `destroy()` will leak the timer.
 */
export class SessionManager {
  private sessions = new Map<
    string,
    { context: ConversationContext; lastAccess: number }
  >();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  async getContext(sessionId: string): Promise<ConversationContext> {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      entry.lastAccess = Date.now();
      return entry.context;
    }

    // Evict the oldest session if we are at capacity
    if (this.sessions.size >= MAX_SESSIONS) {
      this.evictOldest();
    }

    const context: ConversationContext = {
      sessionId,
      history: [],
    };
    this.sessions.set(sessionId, { context, lastAccess: Date.now() });
    return context;
  }

  async saveContext(context: ConversationContext): Promise<void> {
    this.sessions.set(context.sessionId, {
      context,
      lastAccess: Date.now(),
    });
  }

  /** Returns the current number of active sessions. */
  size(): number {
    return this.sessions.size;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.sessions) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.sessions.delete(oldestKey);
      logger.warn(
        { evictedSession: oldestKey, sessionCount: this.sessions.size },
        'Session evicted: store reached MAX_SESSIONS capacity (%d)',
        MAX_SESSIONS,
      );
    }
  }

  private cleanup(): void {
    const now = Date.now();
    this.sessions.forEach((entry, sessionId) => {
      if (now - entry.lastAccess > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
      }
    });
  }

  /** Clears all sessions and stops the background cleanup timer. */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }

  [Symbol.dispose](): void {
    this.destroy();
  }
}
