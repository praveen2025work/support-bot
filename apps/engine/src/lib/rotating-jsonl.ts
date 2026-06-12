/**
 * Rotating JSONL append helper.
 *
 * `interactions.jsonl`, `audit.jsonl`, `conversations.jsonl` and
 * friends accumulate at write-only rates. Left alone, a busy tenant's
 * audit log will reach a gigabyte in weeks and choke every read path
 * that has to scan it (analytics, drift queue, etc.).
 *
 * This module wraps file append with a pre-write size check. When the
 * file is about to grow past a configurable threshold (default 10MB),
 * we rotate: rename the current file to `<base>.<timestamp>.jsonl`,
 * leaving the original path empty so subsequent writes start fresh.
 *
 * Rotation is best-effort:
 *   - stat errors → assume file is fine, keep appending
 *   - rename errors → log warn, append anyway (we'd rather have a
 *     too-large file than a dropped audit entry)
 *
 * The rotated files are left on disk for the operator to ship or
 * delete. Gzip is intentionally out of scope here — a sidecar
 * logrotate / fluentbit pipeline handles compression and retention,
 * and we don't want to compete.
 */

import { promises as fs } from "fs";
import { dirname, basename, extname, join } from "path";
import { logger } from "./logger";

export interface RotatingAppendOptions {
  /** Rotate when current file size + new bytes would exceed this. */
  maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

function rotatedPath(originalPath: string): string {
  const dir = dirname(originalPath);
  const ext = extname(originalPath); // ".jsonl"
  const base = basename(originalPath, ext); // "interactions"
  // High-resolution timestamp avoids collisions when rotations fire
  // within the same second under burst write load.
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  return join(dir, `${base}.${ts}${ext}`);
}

async function rotateIfNeeded(
  filePath: string,
  pendingBytes: number,
  maxBytes: number,
): Promise<void> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size + pendingBytes <= maxBytes) return;
  } catch (err) {
    // ENOENT — file doesn't exist yet, nothing to rotate.
    if ((err as { code?: string }).code === "ENOENT") return;
    logger.warn(
      { err, filePath },
      "rotating-jsonl: stat failed; skipping rotation check",
    );
    return;
  }

  const target = rotatedPath(filePath);
  try {
    await fs.rename(filePath, target);
    logger.info(
      { from: filePath, to: target, maxBytes },
      "rotating-jsonl: file rotated",
    );
  } catch (err) {
    logger.warn(
      { err, from: filePath, to: target },
      "rotating-jsonl: rename failed; appending to original anyway",
    );
  }
}

/**
 * Append `line` (without a trailing newline) to `filePath`, rotating
 * the file first if its size would exceed `maxBytes`. Always writes
 * exactly one newline-terminated line.
 *
 * The caller's data is preserved even when rotation fails — we still
 * append. This biases toward never losing an audit / interaction
 * entry, which is the right tradeoff: a slightly-too-large file is a
 * better failure mode than a missing security event.
 */
export async function appendRotatingJsonl(
  filePath: string,
  line: string,
  options: RotatingAppendOptions = {},
): Promise<void> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const payload = line.endsWith("\n") ? line : `${line}\n`;
  await fs.mkdir(dirname(filePath), { recursive: true });
  await rotateIfNeeded(filePath, Buffer.byteLength(payload), maxBytes);
  await fs.appendFile(filePath, payload, "utf-8");
}

/** Batch variant for the AsyncLogWriter (which writes 50+ lines at once). */
export async function appendRotatingJsonlBatch(
  filePath: string,
  lines: string[],
  options: RotatingAppendOptions = {},
): Promise<void> {
  if (lines.length === 0) return;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const payload = lines.join("\n") + "\n";
  await fs.mkdir(dirname(filePath), { recursive: true });
  await rotateIfNeeded(filePath, Buffer.byteLength(payload), maxBytes);
  await fs.appendFile(filePath, payload, "utf-8");
}
