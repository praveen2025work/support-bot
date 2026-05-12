import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionManager } from "../core/session/session-manager";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(async () => {
    manager = new SessionManager();
    // Start each test from a clean slate (the file-based store persists
    // state between runs at data/sessions/*.json).
    await manager.destroy();
    manager = new SessionManager();
  });

  afterEach(async () => {
    await manager.destroy();
  });

  it("creates a new context for unknown session ID", async () => {
    const ctx = await manager.getContext("sess-1");
    expect(ctx.sessionId).toBe("sess-1");
    expect(ctx.history).toEqual([]);
  });

  it("returns the same context for repeat access", async () => {
    const ctx1 = await manager.getContext("sess-1");
    ctx1.history.push({ role: "user", text: "hello" } as never);
    await manager.saveContext(ctx1);

    const ctx2 = await manager.getContext("sess-1");
    expect(ctx2.history).toHaveLength(1);
  });

  it("tracks size correctly", async () => {
    expect(await manager.size()).toBe(0);
    await manager.getContext("a");
    await manager.getContext("b");
    expect(await manager.size()).toBe(2);
  });

  it("destroy clears all sessions", async () => {
    await manager.getContext("a");
    await manager.getContext("b");
    await manager.destroy();
    expect(await manager.size()).toBe(0);
  });

  it("creates independent contexts for different IDs", async () => {
    const ctx1 = await manager.getContext("sess-1");
    const ctx2 = await manager.getContext("sess-2");
    ctx1.history.push({ role: "user", text: "msg1" } as never);
    await manager.saveContext(ctx1);

    const refetch = await manager.getContext("sess-2");
    expect(refetch.history).toHaveLength(0);
  });

  it("overwrites context on save", async () => {
    const ctx = await manager.getContext("sess-1");
    ctx.history.push({ role: "user", text: "a" } as never);
    ctx.history.push({ role: "user", text: "b" } as never);
    await manager.saveContext(ctx);

    const refetch = await manager.getContext("sess-1");
    expect(refetch.history).toHaveLength(2);
  });
});
