import { SESSION_TTL_MS } from '../constants';
import type { ConversationContext } from '../types';

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

  private cleanup(): void {
    const now = Date.now();
    this.sessions.forEach((entry, sessionId) => {
      if (now - entry.lastAccess > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
      }
    });
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}
