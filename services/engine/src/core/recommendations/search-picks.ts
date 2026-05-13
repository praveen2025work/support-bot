/**
 * Search-suggestion click-through learning.
 *
 * Records which query the user actually picked when shown a list of
 * autocomplete suggestions, then bumps that query in future rankings.
 * Personalized per (groupId, userName).
 *
 * Storage: JSONL append-only at paths.data.searchPicks(groupId). One
 * line per pick. Reads aggregate in-memory at request time — cheap
 * for the volumes a single group will see (typically < 10k lines).
 *
 * Bump model: each pick adds 1.0 to (userName → queryName) weight,
 * decayed by half every 14 days so the model adapts. At search time,
 * we add `pickWeight * BUMP_MULTIPLIER` to the semantic score before
 * ranking. The bump is intentionally modest (default 0.5) so that
 * a strong typed query still wins over an unrelated frequent pick.
 */

import { promises as fs } from "fs";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { dirname } from "path";
import { paths } from "@/lib/env-config";
import { logger } from "@/lib/logger";

export interface SearchPickEntry {
  /** Caller identity from `body.userName` / chat session. */
  userName: string;
  /** The query the user chose to insert. */
  queryName: string;
  /** What they had typed when they picked it. */
  query: string;
  /** ISO timestamp. */
  timestamp: string;
}

const HALF_LIFE_DAYS = 14;
const HALF_LIFE_MS = HALF_LIFE_DAYS * 24 * 60 * 60 * 1000;

export async function recordPick(
  groupId: string,
  entry: Omit<SearchPickEntry, "timestamp">,
): Promise<void> {
  const full: SearchPickEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  const filePath = paths.data.searchPicks(groupId);
  try {
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, JSON.stringify(full) + "\n", "utf-8");
  } catch (err) {
    // Logging is best-effort; never fail the chat input pick action.
    logger.warn({ err, groupId }, "search-picks: append failed");
  }
}

/**
 * Aggregate decayed pick weights for a single user. Returns a map of
 * queryName → weight. The exponential decay is computed at read time
 * so we never have to rewrite the log file.
 */
export async function loadUserPickWeights(
  groupId: string,
  userName: string,
): Promise<Map<string, number>> {
  const weights = new Map<string, number>();
  const filePath = paths.data.searchPicks(groupId);
  const now = Date.now();
  try {
    const stream = createReadStream(filePath, "utf-8");
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let entry: SearchPickEntry;
      try {
        entry = JSON.parse(trimmed) as SearchPickEntry;
      } catch {
        continue;
      }
      if (entry.userName !== userName) continue;
      const age = now - new Date(entry.timestamp).getTime();
      if (!Number.isFinite(age)) continue;
      const decay = Math.pow(0.5, age / HALF_LIFE_MS);
      weights.set(entry.queryName, (weights.get(entry.queryName) ?? 0) + decay);
    }
  } catch {
    /* no file yet — empty map */
  }
  return weights;
}
