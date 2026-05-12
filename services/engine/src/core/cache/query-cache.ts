/**
 * Per-query result cache.
 *
 * The engine already has an LRU cache inside ApiClient for raw HTTP
 * GETs. This module sits at a higher level — it caches the FULL
 * post-processed query result (rows + headers + PII mask state +
 * schema-drift state) keyed by (groupId, queryName, filtersHash).
 *
 * Why a second cache instead of leaning on ApiClient's:
 *   - We need to surface "this is cached" to the user in the
 *     conversational UX, which means we need to know on the response
 *     side of the pipeline whether a fresh fetch happened.
 *   - PII detection runs on the raw result; caching after PII means
 *     we don't re-run detection on every repeat.
 *   - Filters are part of the cache key here, but at the HTTP level
 *     they're already in the URL — same logical lookup, different
 *     scope.
 *
 * Cache busting: the chat route lets a user say "refresh X", "X live",
 * or "fresh X" to bypass the cache for one request. The handler also
 * skips the cache when an analysis intent / follow-up has just
 * mutated the in-context result.
 */

import { LRUCache } from "lru-cache";
import { createHash } from "crypto";
import {
  QUERY_RESULT_CACHE_TTL_MS,
  QUERY_RESULT_CACHE_MAX_ENTRIES,
} from "../constants";

export interface CachedQueryResult {
  /** Wall-clock when the result was fetched (ISO string) */
  cachedAt: string;
  /** Whatever the handler wants to round-trip — opaque to the cache */
  payload: unknown;
}

const cache = new LRUCache<string, CachedQueryResult>({
  max: QUERY_RESULT_CACHE_MAX_ENTRIES,
  ttl: QUERY_RESULT_CACHE_TTL_MS,
  // Keep TTL-expired entries in the cache until LRU eviction kicks
  // them out. `get()` still won't return them (so live requests get
  // a miss → fresh fetch), but `peek()` from getStaleCachedResult()
  // CAN return them during an upstream outage as a graceful
  // fallback. This is the "stale-while-error" pattern.
  allowStale: true,
});

function hashFilters(filters: Record<string, string> | undefined): string {
  if (!filters || Object.keys(filters).length === 0) return "_";
  // Canonicalise: sort keys so different insertion orders don't fork
  // cache entries. Use a hash to keep keys short.
  const sorted = Object.keys(filters)
    .sort()
    .map((k) => `${k}=${filters[k]}`)
    .join("&");
  return createHash("sha1").update(sorted).digest("hex").slice(0, 12);
}

export function buildQueryCacheKey(
  groupId: string,
  queryName: string,
  filters: Record<string, string> | undefined,
): string {
  return `${groupId}:${queryName}:${hashFilters(filters)}`;
}

/**
 * Cache get / set deep-clone the payload at BOTH boundaries.
 *
 * Why: callers downstream (PII masker, ignored-column stripper, ML
 * handlers) mutate `csv.rows` in place. Without cloning, the cached
 * reference would be mutated by the first caller and subsequent
 * cache hits would return that mutated state — viewers would see
 * cleartext rows that an admin handled, admins would see masked
 * rows that a viewer handled, etc. Cross-role data bleed.
 *
 * structuredClone is the right tool: it's standard since Node 17,
 * faster than JSON round-trip, handles Dates / Maps / typed arrays
 * correctly. The CSV payload is small (rows + headers + a few
 * scalars) so the clone cost is microseconds even on hot paths.
 */
export function getCachedResult(key: string): CachedQueryResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  return {
    cachedAt: hit.cachedAt,
    payload: structuredClone(hit.payload),
  };
}

/**
 * TTL-bypass lookup. Used as a fallback when the upstream data
 * source is unreachable — we'd rather serve a 5-minute-old answer
 * with a clear "stale" banner than 503 the user when their morning
 * dashboard refresh hits during a 30s DB blip.
 *
 * LRUCache's `get()` returns undefined for expired entries by
 * default. `peek({allowStale: true})` returns the raw value
 * regardless of TTL but does NOT update recency. That's what we want
 * here — staleness should not extend the entry's lifetime; we just
 * want to read it before LRU eviction takes it.
 */
export function getStaleCachedResult(key: string): CachedQueryResult | null {
  const hit = cache.peek(key);
  if (!hit) return null;
  return {
    cachedAt: hit.cachedAt,
    payload: structuredClone(hit.payload),
  };
}

export function setCachedResult(key: string, payload: unknown): void {
  cache.set(key, {
    cachedAt: new Date().toISOString(),
    payload: structuredClone(payload),
  });
}

export function invalidateCachedResult(key: string): void {
  cache.delete(key);
}

/** Drop every cached result for a given group — used after corpus retrain
 *  or schema-drift acknowledge to avoid serving entries computed on a
 *  now-stale baseline. */
export function invalidateGroup(groupId: string): number {
  let removed = 0;
  for (const k of cache.keys()) {
    if (k.startsWith(`${groupId}:`)) {
      cache.delete(k);
      removed += 1;
    }
  }
  return removed;
}

export function clearAll(): void {
  cache.clear();
}

/** Cache metadata for the wire: short, JSON-safe, UI-friendly. */
export interface CacheStatusPayload {
  status: "fresh" | "cached";
  cachedAt: string;
  ageMs: number;
}

export function buildCacheStatus(
  status: "fresh" | "cached",
  cachedAtIso: string,
): CacheStatusPayload {
  const cachedAt = new Date(cachedAtIso).getTime();
  return {
    status,
    cachedAt: cachedAtIso,
    ageMs: Math.max(0, Date.now() - cachedAt),
  };
}

/**
 * "refresh X", "fresh X", "X live", "force refresh" — natural phrases
 * users say to bypass the cache. Used by the handler to decide whether
 * to check the cache at all.
 */
export function isCacheBust(userText: string): boolean {
  return /\b(refresh|force[\s-]?refresh|fresh|live|no[\s-]?cache|bypass[\s-]?cache)\b/i.test(
    userText,
  );
}
