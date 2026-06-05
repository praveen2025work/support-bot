import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "fs";
import { basename, dirname } from "path";
import { randomBytes } from "crypto";
import type { ZodType } from "zod";
import { logger } from "@/lib/logger";

interface CacheEntry<T> {
  mtimeMs: number;
  value: T;
}

let writeCounter = 0;

/**
 * Unique temp-file path for an atomic write (temp + rename).
 *
 * Must be unique ACROSS instances sharing a volume: container PID namespaces
 * make `process.pid` identical (often 1) in every pod, so a random component is
 * the real uniqueness guarantee; pid + counter are included for traceability
 * and intra-process distinctness. This prevents two replicas that overwrite the
 * same group file (e.g. the admin bridge's rebuildAllGroupFiles) from colliding
 * on the temp path and corrupting it. Exported for tests.
 */
export function tempPathFor(file: string): string {
  return `${file}.tmp.${process.pid}.${++writeCounter}.${randomBytes(
    4,
  ).toString("hex")}`;
}

export interface PerGroupStoreOptions<T> {
  /** Directory that holds the per-group files (used by list()). */
  dir: string;
  /** Resolve the absolute file path for a group id. */
  fileFor: (groupId: string) => string;
  /** Zod schema the file contents must satisfy. */
  schema: ZodType<T>;
  /** Value returned when the file is missing. */
  defaultValue: () => T;
}

/**
 * Generic per-group JSON file store ("DB without DB" primitive).
 *
 * - read(): mtime-cached; re-reads only when the file changes on disk, so a
 *   write from any instance is picked up. Missing file -> defaultValue().
 *   Corrupt/invalid file -> last-good cache if present, else defaultValue();
 *   never throws on read.
 * - write(): validates, writes atomically (temp file + rename), refreshes cache.
 */
export class PerGroupStore<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(private readonly opts: PerGroupStoreOptions<T>) {}

  read(groupId: string): T {
    const file = this.opts.fileFor(groupId);
    let mtimeMs: number;
    try {
      mtimeMs = statSync(file).mtimeMs;
    } catch {
      return this.opts.defaultValue();
    }
    const cached = this.cache.get(file);
    if (cached && cached.mtimeMs === mtimeMs) return cached.value;
    try {
      const raw = JSON.parse(readFileSync(file, "utf-8"));
      const value = this.opts.schema.parse(raw);
      this.cache.set(file, { mtimeMs, value });
      return value;
    } catch (err) {
      logger.error(
        { err, file },
        "PerGroupStore: failed to read/parse file; serving last-good value",
      );
      return cached ? cached.value : this.opts.defaultValue();
    }
  }

  write(groupId: string, value: T): T {
    const validated = this.opts.schema.parse(value);
    const file = this.opts.fileFor(groupId);
    mkdirSync(dirname(file), { recursive: true });
    const tmp = tempPathFor(file);
    writeFileSync(tmp, JSON.stringify(validated, null, 2) + "\n", "utf-8");
    renameSync(tmp, file);
    this.cache.set(file, { mtimeMs: statSync(file).mtimeMs, value: validated });
    return validated;
  }

  list(): string[] {
    if (!existsSync(this.opts.dir)) return [];
    try {
      return readdirSync(this.opts.dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => basename(f, ".json"));
    } catch {
      return [];
    }
  }

  invalidate(groupId?: string): void {
    if (groupId) this.cache.delete(this.opts.fileFor(groupId));
    else this.cache.clear();
  }
}
