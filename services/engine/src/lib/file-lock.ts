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

import { promises as fs } from 'fs';
import { dirname, basename } from 'path';
import { logger } from './logger';
import { INSTANCE_ID } from './env-config';

const STALE_MS = 30_000; // 30 s — break stale locks
const RETRY_MS = 50;     // retry interval
const MAX_WAIT_MS = 10_000; // give up after 10 s

function lockDir(filePath: string): string {
  return `${dirname(filePath)}/.lock_${basename(filePath)}`;
}

/**
 * Acquire an advisory lock for `filePath`.
 * Returns a release function.
 */
async function acquireLock(filePath: string): Promise<() => Promise<void>> {
  const lock = lockDir(filePath);
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      // mkdir is atomic on POSIX & Windows/SMB
      await fs.mkdir(lock);

      // Write instance + timestamp so stale detection works
      await fs.writeFile(
        `${lock}/owner`,
        JSON.stringify({ instance: INSTANCE_ID, pid: process.pid, ts: Date.now() }),
        'utf-8'
      );

      return async () => {
        try {
          await fs.rm(lock, { recursive: true, force: true });
        } catch {
          // best effort
        }
      };
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'EEXIST') {
        // Lock already held — check if stale
        try {
          const raw = await fs.readFile(`${lock}/owner`, 'utf-8');
          const { ts } = JSON.parse(raw);
          if (Date.now() - ts > STALE_MS) {
            logger.warn({ lock, age: Date.now() - ts }, 'Breaking stale file lock');
            await fs.rm(lock, { recursive: true, force: true });
            continue; // retry immediately
          }
        } catch {
          // owner file missing or unreadable — break it
          await fs.rm(lock, { recursive: true, force: true });
          continue;
        }

        // Wait and retry
        await new Promise((r) => setTimeout(r, RETRY_MS));
      } else {
        throw err;
      }
    }
  }

  throw new Error(`File lock timeout after ${MAX_WAIT_MS}ms: ${filePath}`);
}

/**
 * Execute `fn` while holding an advisory file lock on `filePath`.
 * Guarantees the lock is released even if fn throws.
 */
export async function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>
): Promise<T> {
  const release = await acquireLock(filePath);
  try {
    return await fn();
  } finally {
    await release();
  }
}
