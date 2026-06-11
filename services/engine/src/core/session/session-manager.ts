import { promises as fs } from "fs";
import { SESSION_TTL_MS } from "../constants";
import { logger } from "../../lib/logger";
import { paths } from "../../lib/env-config";
import { withFileLock } from "../../lib/file-lock";
import type { ConversationContext } from "../types";

/**
 * File-based session store keyed by userId.
 *
 * Each user gets one JSON file: data/sessions/<userId>.json
 * containing all their active sessions. This allows multiple engine
 * instances behind a load balancer to share session state via a
 * NAS/NFS mount (configured through DATA_DIR).
 *
 * Session isolation by group:
 *  - Within a user file, sessions are keyed by `${groupId}:${sessionId}`
 *    so the same sessionId in two different groups stays isolated.
 *    Without this scoping, a UI dropdown switching from "finance" to
 *    "default" with the same sessionId would inherit the finance
 *    group's lastApiResult / lastQueryName — a cross-group data leak.
 *  - `context.sessionId` returned to the client is the unscoped form,
 *    so the wire-format does not change.
 *
 * Write safety:
 *  - Atomic writes (write to .tmp, then rename)
 *  - Per-user file locking via `withFileLock` (mkdir-based, NFS-safe)
 *
 * Cleanup:
 *  - Periodic sweep removes sessions older than SESSION_TTL_MS
 *  - Empty user files are deleted after cleanup
 *  - Browser-close cleanup via `closeSession()`
 */

/** Compose the per-group scoped key used in the cache and the on-disk
 * sessions map. Falls back to "default" when groupId is missing so old
 * call sites continue to share a single namespace. */
function scopedKey(sessionId: string, groupId?: string): string {
  return `${groupId || "default"}:${sessionId}`;
}

const SESSIONS_DIR = paths.data.sessionsDir;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // run cleanup every 5 min

/** Shape of a per-user session file */
interface UserSessionFile {
  userId: string;
  sessions: Record<string, StoredSession>;
  updatedAt: string;
}

/** A session with a last-accessed timestamp for TTL eviction */
interface StoredSession {
  context: ConversationContext;
  lastAccessedAt: number; // epoch ms
}

export class SessionManager {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private dirReady: Promise<void>;

  constructor() {
    // Eagerly create the sessions directory so file locks don't fail
    this.dirReady = fs.mkdir(SESSIONS_DIR, { recursive: true }).then(() => {});
    this.startCleanupTimer();
  }

  /** Ensure the sessions directory exists before any file operation */
  private async ensureDir(): Promise<void> {
    await this.dirReady;
  }

  // ── Public API (same interface as before) ─────────────────────────

  // In-memory cache for active session contexts (avoids re-reading from disk
  // within the same request chain, which would lose runtime-only fields like lastApiResult)
  private contextCache = new Map<
    string,
    { context: ConversationContext; ts: number }
  >();

  async getContext(
    sessionId: string,
    userId?: string,
    groupId?: string,
  ): Promise<ConversationContext> {
    const key = scopedKey(sessionId, groupId);
    // Return cached context if accessed within last 30 seconds (covers chain processing)
    const cached = this.contextCache.get(key);
    if (cached && Date.now() - cached.ts < 30_000) {
      cached.ts = Date.now();
      return cached.context;
    }

    await this.ensureDir();
    const uid = userId || this.extractUserId(sessionId);
    const file = await this.readUserFile(uid);

    const stored = file.sessions[key];
    if (stored) {
      // Deliberately do NOT refresh lastAccessedAt on reads. Persisting it would
      // take the per-user write lock on the hot read path — a major source of
      // lock contention — and `file` here is a throwaway parse that is never
      // written back, so an in-memory touch would have no effect anyway.
      // saveContext() stamps the timestamp after each message, so the
      // SESSION_TTL_MS sweep effectively measures time since the last message;
      // for a chat turn (read context -> save) that equals time since last use.
      this.contextCache.set(key, {
        context: stored.context,
        ts: Date.now(),
      });
      return stored.context;
    }

    // New session — context.sessionId stays the unscoped value so the
    // client-visible session identifier doesn't change.
    const context: ConversationContext = {
      sessionId,
      history: [],
    };
    file.sessions[key] = {
      context,
      lastAccessedAt: Date.now(),
    };
    await this.writeUserFile(file);
    this.contextCache.set(key, { context, ts: Date.now() });
    return context;
  }

  async saveContext(
    context: ConversationContext,
    userId?: string,
    groupId?: string,
  ): Promise<void> {
    await this.ensureDir();
    const uid = userId || this.extractUserId(context.sessionId);
    const key = scopedKey(context.sessionId, groupId);
    await withFileLock(paths.data.sessionFile(uid), async () => {
      const file = await this.readUserFile(uid);
      file.sessions[key] = {
        context,
        lastAccessedAt: Date.now(),
      };
      await this.writeUserFileUnsafe(file);
    });
    // Keep the in-memory cache coherent with what's on disk.
    this.contextCache.set(key, { context, ts: Date.now() });
  }

  /** Remove a specific session (called on browser close). */
  async closeSession(
    sessionId: string,
    userId?: string,
    groupId?: string,
  ): Promise<void> {
    await this.ensureDir();
    const uid = userId || this.extractUserId(sessionId);
    const key = scopedKey(sessionId, groupId);
    await withFileLock(paths.data.sessionFile(uid), async () => {
      const file = await this.readUserFile(uid);
      delete file.sessions[key];
      if (Object.keys(file.sessions).length === 0) {
        await this.deleteUserFile(uid);
      } else {
        await this.writeUserFileUnsafe(file);
      }
    });
    this.contextCache.delete(key);
    logger.debug({ sessionId, groupId, userId: uid }, "Session closed");
  }

  /** Returns approximate count of all sessions across all user files. */
  async size(): Promise<number> {
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      let count = 0;
      for (const f of files) {
        if (!f.endsWith(".json")) continue;
        try {
          const raw = await fs.readFile(`${SESSIONS_DIR}/${f}`, "utf-8");
          const data: UserSessionFile = JSON.parse(raw);
          count += Object.keys(data.sessions).length;
        } catch {
          // skip corrupted files
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  /** Clears all sessions (used in tests / graceful shutdown). */
  async destroy(): Promise<void> {
    this.stopCleanupTimer();
    try {
      const files = await fs.readdir(SESSIONS_DIR);
      await Promise.all(
        files
          .filter((f) => f.endsWith(".json"))
          .map((f) => fs.unlink(`${SESSIONS_DIR}/${f}`).catch(() => {})),
      );
    } catch {
      // directory may not exist
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStale().catch((err) => {
        logger.warn({ err }, "Session cleanup failed");
      });
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref(); // don't block process exit
  }

  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Delete sessions older than SESSION_TTL_MS from all user files. */
  async cleanupStale(): Promise<number> {
    let removed = 0;
    try {
      await fs.mkdir(SESSIONS_DIR, { recursive: true });
      const files = await fs.readdir(SESSIONS_DIR);
      const now = Date.now();

      for (const f of files) {
        if (!f.endsWith(".json") || f.endsWith(".tmp")) continue;
        const filePath = `${SESSIONS_DIR}/${f}`;

        await withFileLock(filePath, async () => {
          try {
            const raw = await fs.readFile(filePath, "utf-8");
            const data: UserSessionFile = JSON.parse(raw);
            const before = Object.keys(data.sessions).length;

            for (const [sid, stored] of Object.entries(data.sessions)) {
              if (now - stored.lastAccessedAt > SESSION_TTL_MS) {
                delete data.sessions[sid];
                removed++;
              }
            }

            if (Object.keys(data.sessions).length === 0) {
              await fs.unlink(filePath).catch(() => {});
            } else if (Object.keys(data.sessions).length < before) {
              await this.writeUserFileUnsafe(data);
            }
          } catch {
            // skip corrupted files
          }
        });
      }
    } catch {
      // sessions dir may not exist yet
    }

    if (removed > 0) {
      logger.info(
        { removedSessions: removed },
        "Stale session cleanup complete",
      );
    }
    return removed;
  }

  // ── File I/O helpers ──────────────────────────────────────────────

  private async readUserFile(userId: string): Promise<UserSessionFile> {
    try {
      const raw = await fs.readFile(paths.data.sessionFile(userId), "utf-8");
      return JSON.parse(raw);
    } catch {
      return { userId, sessions: {}, updatedAt: new Date().toISOString() };
    }
  }

  /** Write with file lock (safe for concurrent access). */
  private async writeUserFile(file: UserSessionFile): Promise<void> {
    await withFileLock(paths.data.sessionFile(file.userId), async () => {
      await this.writeUserFileUnsafe(file);
    });
  }

  /** Write WITHOUT lock — caller must already hold the lock. */
  private async writeUserFileUnsafe(file: UserSessionFile): Promise<void> {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    file.updatedAt = new Date().toISOString();
    const target = paths.data.sessionFile(file.userId);
    const data = JSON.stringify(file);
    const tmp = target + ".tmp";
    try {
      await fs.writeFile(tmp, data, "utf-8");
      await fs.rename(tmp, target);
    } catch {
      // On Windows, rename can fail with EPERM (file locked) or ENOENT
      // (antivirus removed .tmp). Fall back to direct write.
      try {
        await fs.unlink(tmp).catch(() => {});
      } catch {
        /* tmp already gone */
      }
      await fs.writeFile(target, data, "utf-8");
    }
  }

  private async deleteUserFile(userId: string): Promise<void> {
    try {
      await fs.unlink(paths.data.sessionFile(userId));
    } catch {
      // already gone
    }
  }

  /**
   * Extract a userId from a sessionId.
   * Session IDs typically follow the pattern "userId-timestamp" or similar.
   * Falls back to 'anonymous' if no userId can be determined.
   */
  private extractUserId(_sessionId: string): string {
    // Convention: sessionId might be passed as "user_timestamp" or just a random id.
    // When userId is not explicitly provided, use 'anonymous' as a catch-all bucket.
    return "anonymous";
  }
}
