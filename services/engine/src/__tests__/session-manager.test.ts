import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../core/session/session-manager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('creates a new context for unknown session ID', async () => {
    const ctx = await manager.getContext('sess-1');
    expect(ctx.sessionId).toBe('sess-1');
    expect(ctx.history).toEqual([]);
  });

  it('returns the same context for repeat access', async () => {
    const ctx1 = await manager.getContext('sess-1');
    ctx1.history.push({ role: 'user', text: 'hello' } as never);
    await manager.saveContext(ctx1);

    const ctx2 = await manager.getContext('sess-1');
    expect(ctx2.history).toHaveLength(1);
  });

  it('tracks size correctly', async () => {
    expect(manager.size()).toBe(0);
    await manager.getContext('a');
    await manager.getContext('b');
    expect(manager.size()).toBe(2);
  });

  it('destroy clears all sessions', async () => {
    await manager.getContext('a');
    await manager.getContext('b');
    manager.destroy();
    expect(manager.size()).toBe(0);
  });

  it('creates independent contexts for different IDs', async () => {
    const ctx1 = await manager.getContext('sess-1');
    const ctx2 = await manager.getContext('sess-2');
    ctx1.history.push({ role: 'user', text: 'msg1' } as never);
    await manager.saveContext(ctx1);

    const refetch = await manager.getContext('sess-2');
    expect(refetch.history).toHaveLength(0);
  });

  it('overwrites context on save', async () => {
    const ctx = await manager.getContext('sess-1');
    ctx.history.push({ role: 'user', text: 'a' } as never);
    ctx.history.push({ role: 'user', text: 'b' } as never);
    await manager.saveContext(ctx);

    const refetch = await manager.getContext('sess-1');
    expect(refetch.history).toHaveLength(2);
  });
});
