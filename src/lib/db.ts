import { promises as fs } from 'fs';
import path from 'path';

const DB_JSON_PATH = path.join(process.cwd(), 'mock-api/db.json');

// ---------------------------------------------------------------------------
// File-level locking (works across multiple Next.js workers / processes)
// ---------------------------------------------------------------------------

const LOCK_DIR = path.join(process.cwd(), 'data', '.locks');
const LOCK_TIMEOUT_MS = 10_000; // 10 second timeout
const LOCK_RETRY_MS = 50; // retry every 50ms

async function ensureLockDir() {
  await fs.mkdir(LOCK_DIR, { recursive: true });
}

async function acquireLock(lockName: string): Promise<string> {
  await ensureLockDir();
  const lockPath = path.join(LOCK_DIR, `${lockName}.lock`);
  const startTime = Date.now();

  while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
    try {
      // O_EXCL flag ensures atomic creation — fails if file exists
      const fd = await fs.open(lockPath, 'wx');
      await fd.writeFile(JSON.stringify({ pid: process.pid, time: Date.now() }));
      await fd.close();
      return lockPath;
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EEXIST') {
        // Check for stale lock (older than timeout)
        try {
          const stat = await fs.stat(lockPath);
          if (Date.now() - stat.mtimeMs > LOCK_TIMEOUT_MS) {
            await fs.unlink(lockPath); // Remove stale lock
            continue;
          }
        } catch {
          /* lock was released between check */
        }
        await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Lock acquisition timeout for ${lockName}`);
}

async function releaseLock(lockPath: string) {
  try {
    await fs.unlink(lockPath);
  } catch {
    /* already released */
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * File-level mutex for read-modify-write on db.json.
 * Uses a lock file so it works across multiple Node.js processes / workers.
 */
export async function withDbLock<T>(
  fn: (db: Record<string, unknown>) => Promise<{ result: T; save: boolean }>
): Promise<T> {
  const lockPath = await acquireLock('db');
  try {
    const raw = await fs.readFile(DB_JSON_PATH, 'utf-8');
    const db = JSON.parse(raw);
    const { result, save } = await fn(db);
    if (save) {
      await fs.writeFile(DB_JSON_PATH, JSON.stringify(db, null, 2), 'utf-8');
    }
    return result;
  } finally {
    await releaseLock(lockPath);
  }
}

export async function readDb(): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(DB_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

export { DB_JSON_PATH };
