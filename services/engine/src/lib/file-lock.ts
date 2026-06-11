/**
 * Simple advisory file lock for safe concurrent writes on NAS/NFS.
 *
 * When multiple engine instances share the same NAS mount, concurrent writes to
 * JSONL files (interactions, audit, etc.) can corrupt data.  This module
 * provides a lightweight lock based on `mkdir` (atomic on both NFS & SMB) so
 * only one writer proceeds at a time.
 *
 * Usage:
 *   import { withFileLock } from '@/lib/file-lock';
 *   await withFileLock('/shared/data/audit.jsonl', async () => {
 *     await fs.appendFile(...);
 *   });
 *
 * The lock is advisory — callers must opt-in.
 * Stale locks (older than STALE_MS) are automatically broken.
 */

import { promises as fs } from "fs";
import { dirname, basename } from "path";
import { logger } from "./logger";
import { INSTANCE_ID } from "./env-config";

const STALE_MS = 30_000; // 30 s — break stale locks
const RETRY_MS = 50; // retry interval
const MAX_WAIT_MS = 10_000; // give up after 10 s
// Max age a lock directory may exist WITHOUT an `owner` file before it is
// treated as orphaned (the writer died between mkdir and writing `owner`).
// Measured against the lock dir's own ctime, so a holder mid-creation is never
// broken — only a dir that has stayed ownerless this long. Comfortably larger
// than the mkdir→writeFile gap, far smaller than MAX_WAIT. This grace is what
// closes the TOCTOU race that caused ENOENT on `<lock>/owner` + lock-timeout
// cascades.
const OWNER_GRACE_MS = 500;

function lockDir(filePath: string): string {
  return `${dirname(filePath)}/.lock_${basename(filePath)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Acquire an advisory lock for `filePath`.
 * Returns a release function.
 */
async function acquireLock(filePath: string): Promise<() => Promise<void>> {
  const lock = lockDir(filePath);
  // Ensure the lock's parent directory exists. The target file may not have
  // been created yet (e.g. the first write to a new per-group query file), and
  // the lock `mkdir` below is intentionally non-recursive to preserve mutual
  // exclusion — so the parent must exist first.
  await fs.mkdir(dirname(lock), { recursive: true });
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    // 1. Try to create the lock directory (atomic on POSIX & Windows/SMB).
    try {
      await fs.mkdir(lock);
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== "EEXIST") throw err;

      // Lock dir exists — decide whether it's held, stale, or orphaned.
      let ownerTs: number | undefined;
      try {
        const raw = await fs.readFile(`${lock}/owner`, "utf-8");
        ownerTs = JSON.parse(raw).ts;
      } catch {
        ownerTs = undefined; // owner missing/unreadable
      }

      const now = Date.now();
      if (ownerTs !== undefined) {
        // Held by a live owner — break only once its heartbeat goes stale.
        if (now - ownerTs > STALE_MS) {
          logger.warn({ lock, age: now - ownerTs }, "Breaking stale file lock");
          await fs.rm(lock, { recursive: true, force: true }).catch(() => {});
          continue; // retry immediately
        }
      } else {
        // Owner file absent: either a holder is mid-acquisition (lock dir just
        // created, `owner` write still in flight) or the lock is truly orphaned
        // (the writer died before writing `owner`). Decide from the lock dir's
        // OWN age — NOT how long *this* waiter has observed it missing. Under
        // contention, synchronized waiters keep sampling successive holders
        // during their brief mkdir→writeFile window; an observer-relative timer
        // never resets and would eventually break a *live* lock (maxActive>1).
        let lockAgeMs = 0;
        try {
          lockAgeMs = now - (await fs.stat(lock)).ctimeMs;
        } catch {
          continue; // lock vanished (holder released) — retry to grab it
        }
        if (lockAgeMs > OWNER_GRACE_MS) {
          logger.warn(
            { lock, age: lockAgeMs },
            "Breaking orphaned lock (no owner written)",
          );
          await fs.rm(lock, { recursive: true, force: true }).catch(() => {});
          continue;
        }
      }

      // Jittered backoff so contending waiters don't wake in lock-step — which
      // would resynchronize the mkdir→writeFile sampling described above.
      await sleep(RETRY_MS + Math.floor(Math.random() * RETRY_MS));
      continue;
    }

    // 2. We created the lock dir — claim ownership. If a racing acquirer
    //    removed it before we could write `owner`, clean up and retry rather
    //    than failing the whole operation with an ENOENT.
    try {
      await fs.writeFile(
        `${lock}/owner`,
        JSON.stringify({
          instance: INSTANCE_ID,
          pid: process.pid,
          ts: Date.now(),
        }),
        "utf-8",
      );
    } catch {
      await fs.rm(lock, { recursive: true, force: true }).catch(() => {});
      await sleep(RETRY_MS);
      continue;
    }

    return async () => {
      await fs.rm(lock, { recursive: true, force: true }).catch(() => {});
    };
  }

  throw new Error(`File lock timeout after ${MAX_WAIT_MS}ms: ${filePath}`);
}

/**
 * Execute `fn` while holding an advisory file lock on `filePath`.
 * Guarantees the lock is released even if fn throws.
 */
export async function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>,
): Promise<T> {
  const release = await acquireLock(filePath);
  try {
    return await fn();
  } finally {
    await release();
  }
}
