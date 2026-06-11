/**
 * Regression tests for the advisory file lock.
 *
 * Guards the TOCTOU race that took the engine down in production: a competing
 * acquirer used to delete a lock directory whose `owner` file had not been
 * written yet (the brief mkdir→writeFile window), causing ENOENT on the
 * holder's owner write and a cascade of 10s lock timeouts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/env-config", () => ({ INSTANCE_ID: "test-instance" }));

import { withFileLock } from "@/lib/file-lock";

describe("withFileLock", () => {
  let dir: string;
  let target: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "flock-"));
    target = path.join(dir, "data.json");
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("serializes concurrent critical sections without ENOENT failures", async () => {
    let active = 0;
    let maxActive = 0;
    let completed = 0;

    const work = () =>
      withFileLock(target, async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
        completed += 1;
      });

    // High contention exercises the mkdir→owner race window.
    await Promise.all(Array.from({ length: 30 }, work));

    expect(maxActive).toBe(1); // never two holders at once
    expect(completed).toBe(30); // none failed (old code threw ENOENT here)
  });

  it("breaks an orphaned lock (dir present, owner missing) and proceeds", async () => {
    await fs.mkdir(path.join(dir, ".lock_data.json")); // orphaned: no owner file
    let ran = false;
    await withFileLock(target, async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  }, 5000);

  it("breaks a stale lock (old owner timestamp) and proceeds", async () => {
    const lockPath = path.join(dir, ".lock_data.json");
    await fs.mkdir(lockPath);
    await fs.writeFile(
      path.join(lockPath, "owner"),
      JSON.stringify({ instance: "dead", pid: 1, ts: Date.now() - 60_000 }),
    );
    let ran = false;
    await withFileLock(target, async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  }, 5000);
});
