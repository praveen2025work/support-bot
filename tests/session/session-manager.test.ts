/**
 * Unit tests for file-based SessionManager
 *
 * Tests exercise:
 *   - Creating new session context for unknown sessionId
 *   - Returning existing context for known sessionId
 *   - Saving and retrieving context
 *   - closeSession removes a session
 *   - Clearing all sessions on destroy
 *   - Stale session cleanup
 */

import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// Set up a temp directory BEFORE importing SessionManager so `paths` resolves
// ---------------------------------------------------------------------------
const TEST_SESSIONS_DIR = join(tmpdir(), `session-test-${Date.now()}`);

// Mock engine lib modules (resolved relative to session-manager.ts via ../../lib/*)
jest.mock("../../services/engine/src/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../services/engine/src/lib/env-config", () => ({
  INSTANCE_ID: "test-instance",
  paths: {
    data: {
      sessionsDir: TEST_SESSIONS_DIR,
      sessionFile: (userId: string) => {
        const safe = userId.replace(/[^a-zA-Z0-9_\-]/g, "_");
        return join(TEST_SESSIONS_DIR, `${safe}.json`);
      },
    },
  },
}));

jest.mock("../../services/engine/src/lib/file-lock", () => ({
  withFileLock: async <T>(_path: string, fn: () => Promise<T>): Promise<T> => {
    return fn(); // no-op lock in tests (single-process)
  },
}));

import { SessionManager } from "../../services/engine/src/core/session/session-manager";
import type { ConversationContext } from "../../services/engine/src/core/types";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionManager (file-based)", () => {
  let manager: SessionManager;

  beforeEach(async () => {
    await fs.mkdir(TEST_SESSIONS_DIR, { recursive: true });
    manager = new SessionManager();
  });

  afterEach(async () => {
    await manager.destroy();
    // Clean up temp dir
    await fs
      .rm(TEST_SESSIONS_DIR, { recursive: true, force: true })
      .catch(() => {});
  });

  // ── getContext ────────────────────────────────────────────────────────────

  describe("getContext", () => {
    it("creates a new session context for an unknown sessionId", async () => {
      const ctx = await manager.getContext("new-session-1", "user1");
      expect(ctx).toBeDefined();
      expect(ctx.sessionId).toBe("new-session-1");
      expect(ctx.history).toEqual([]);
    });

    it("returns the same context data for a known sessionId", async () => {
      const first = await manager.getContext("session-a", "user1");
      first.history.push({
        role: "user",
        text: "hello",
        timestamp: new Date(),
      });
      await manager.saveContext(first, "user1");

      const second = await manager.getContext("session-a", "user1");
      expect(second.sessionId).toBe("session-a");
      expect(second.history).toHaveLength(1);
      expect(second.history[0].text).toBe("hello");
    });

    it("returns distinct contexts for different sessionIds", async () => {
      const ctxA = await manager.getContext("session-a", "user1");
      const ctxB = await manager.getContext("session-b", "user1");

      expect(ctxA.sessionId).toBe("session-a");
      expect(ctxB.sessionId).toBe("session-b");
    });
  });

  // ── saveContext ──────────────────────────────────────────────────────────

  describe("saveContext", () => {
    it("saves and retrieves updated context", async () => {
      const ctx = await manager.getContext("save-test", "user2");
      ctx.currentIntent = "greeting";
      ctx.history.push({ role: "user", text: "hi", timestamp: new Date() });

      await manager.saveContext(ctx, "user2");
      const retrieved = await manager.getContext("save-test", "user2");

      expect(retrieved.currentIntent).toBe("greeting");
      expect(retrieved.history).toHaveLength(1);
    });

    it("overwrites context for existing sessionId", async () => {
      const ctx = await manager.getContext("overwrite-test", "user2");
      ctx.currentIntent = "help";
      await manager.saveContext(ctx, "user2");

      const updated: ConversationContext = {
        sessionId: "overwrite-test",
        history: [
          { role: "bot", text: "How can I help?", timestamp: new Date() },
        ],
        currentIntent: "query.execute",
      };
      await manager.saveContext(updated, "user2");

      const retrieved = await manager.getContext("overwrite-test", "user2");
      expect(retrieved.currentIntent).toBe("query.execute");
      expect(retrieved.history).toHaveLength(1);
      expect(retrieved.history[0].role).toBe("bot");
    });
  });

  // ── closeSession ──────────────────────────────────────────────────────────

  describe("closeSession", () => {
    it("removes a specific session", async () => {
      await manager.getContext("close-me", "user3");
      await manager.getContext("keep-me", "user3");

      await manager.closeSession("close-me", "user3");

      // keep-me should still exist
      const kept = await manager.getContext("keep-me", "user3");
      expect(kept.sessionId).toBe("keep-me");

      // close-me should return a fresh context (no history)
      const fresh = await manager.getContext("close-me", "user3");
      expect(fresh.history).toEqual([]);
    });

    it("deletes user file when last session is closed", async () => {
      await manager.getContext("only-session", "user4");
      await manager.closeSession("only-session", "user4");

      // User file should be gone
      const filePath = join(TEST_SESSIONS_DIR, "user4.json");
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  // ── size ─────────────────────────────────────────────────────────────────

  describe("size", () => {
    it("returns 0 for empty manager", async () => {
      expect(await manager.size()).toBe(0);
    });

    it("returns correct count after adding sessions", async () => {
      await manager.getContext("s1", "userA");
      await manager.getContext("s2", "userA");
      await manager.getContext("s3", "userB");

      expect(await manager.size()).toBe(3);
    });
  });

  // ── destroy ──────────────────────────────────────────────────────────────

  describe("destroy", () => {
    it("clears all sessions", async () => {
      await manager.getContext("d1", "userX");
      await manager.getContext("d2", "userX");
      expect(await manager.size()).toBe(2);

      await manager.destroy();

      expect(await manager.size()).toBe(0);
    });
  });

  // ── Stale cleanup ────────────────────────────────────────────────────────

  describe("cleanupStale", () => {
    it("removes sessions older than TTL", async () => {
      // Create a session file with an old lastAccessedAt
      const userId = "stale-user";
      const filePath = join(TEST_SESSIONS_DIR, `${userId}.json`);
      const staleData = {
        userId,
        sessions: {
          "old-session": {
            context: { sessionId: "old-session", history: [] },
            lastAccessedAt: Date.now() - 60 * 60 * 1000, // 1 hour ago (> 30 min TTL)
          },
          "fresh-session": {
            context: { sessionId: "fresh-session", history: [] },
            lastAccessedAt: Date.now(), // just now
          },
        },
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(filePath, JSON.stringify(staleData), "utf-8");

      const removed = await manager.cleanupStale();

      expect(removed).toBe(1);

      // fresh-session should still exist
      const raw = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(raw);
      expect(data.sessions["fresh-session"]).toBeDefined();
      expect(data.sessions["old-session"]).toBeUndefined();
    });
  });
});
