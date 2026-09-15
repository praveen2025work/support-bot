import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { estimateBytes } from "../../core/cache/estimate-bytes";

describe("estimateBytes", () => {
  it("returns a positive integer proportional to payload size", () => {
    const small = estimateBytes({ a: 1 });
    const big = estimateBytes({
      rows: Array.from({ length: 1000 }, (_, i) => ({ i, s: "x".repeat(50) })),
    });
    expect(small).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(small)).toBe(true);
    expect(big).toBeGreaterThan(small);
  });

  it("never throws and returns >= 1 on unserializable input", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(estimateBytes(circular)).toBe(1);
    // BigInt is not JSON-serializable
    expect(estimateBytes({ n: BigInt(5) })).toBe(1);
    expect(estimateBytes(undefined)).toBe(1);
  });
});

describe("query-cache", () => {
  // The cache reads its size/ttl/entry limits from process.env at module load,
  // so each test that needs a specific config resets modules and re-imports.
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("round-trips a payload and isolates callers via deep clone", async () => {
    const qc = await import("../../core/cache/query-cache");
    const key = qc.buildQueryCacheKey("g1", "q1", { region: "US" });
    qc.setCachedResult(key, { rows: [{ v: 1 }] });

    const first = qc.getCachedResult(key);
    expect(first).not.toBeNull();
    // Mutating the returned payload must NOT corrupt the cached copy.
    (first!.payload as { rows: { v: number }[] }).rows[0].v = 999;

    const second = qc.getCachedResult(key);
    expect((second!.payload as { rows: { v: number }[] }).rows[0].v).toBe(1);
  });

  it("keys are filter-order independent", async () => {
    const qc = await import("../../core/cache/query-cache");
    const a = qc.buildQueryCacheKey("g", "q", { a: "1", b: "2" });
    const b = qc.buildQueryCacheKey("g", "q", { b: "2", a: "1" });
    expect(a).toBe(b);
  });

  it("honors QUERY_RESULT_CACHE_MAX_ENTRIES from env", async () => {
    process.env.QUERY_RESULT_CACHE_MAX_ENTRIES = "2";
    process.env.QUERY_RESULT_CACHE_MAX_BYTES = String(64 * 1024 * 1024);
    const qc = await import("../../core/cache/query-cache");

    for (let i = 0; i < 5; i++) {
      qc.setCachedResult(qc.buildQueryCacheKey("g", "q", { i: String(i) }), {
        i,
      });
    }
    const stats = qc.getQueryCacheStats();
    expect(stats.maxEntries).toBe(2);
    expect(stats.entries).toBeLessThanOrEqual(2);
  });

  it("bounds memory by QUERY_RESULT_CACHE_MAX_BYTES, evicting oldest", async () => {
    // Tiny byte ceiling so a couple of ~1KB payloads force eviction even though
    // the entry cap is high. This is the stability guarantee: memory, not count.
    process.env.QUERY_RESULT_CACHE_MAX_ENTRIES = "1000";
    process.env.QUERY_RESULT_CACHE_MAX_BYTES = "4096"; // 4 KB
    const qc = await import("../../core/cache/query-cache");

    // Each payload ~1 KB (below the 4 KB ceiling) so a few fit and writing 20
    // forces LRU eviction by bytes.
    const bigPayload = () => ({
      rows: Array.from({ length: 25 }, (_, i) => ({ i, s: "x".repeat(20) })),
    });
    for (let i = 0; i < 20; i++) {
      qc.setCachedResult(
        qc.buildQueryCacheKey("g", "q", { i: String(i) }),
        bigPayload(),
      );
    }

    const stats = qc.getQueryCacheStats();
    expect(stats.maxBytes).toBe(4096);
    // Retained footprint must stay under the ceiling regardless of how many
    // large payloads were written.
    expect(stats.sizeBytes).toBeLessThanOrEqual(4096);
    expect(stats.entries).toBeLessThan(20);
    // Oldest entry evicted, newest retained.
    expect(
      qc.getCachedResult(qc.buildQueryCacheKey("g", "q", { i: "0" })),
    ).toBeNull();
    expect(
      qc.getCachedResult(qc.buildQueryCacheKey("g", "q", { i: "19" })),
    ).not.toBeNull();
  });

  it("serves a fresh miss for a single payload larger than the ceiling (never pins heap)", async () => {
    process.env.QUERY_RESULT_CACHE_MAX_BYTES = "512"; // smaller than one payload
    const qc = await import("../../core/cache/query-cache");
    const key = qc.buildQueryCacheKey("g", "huge", {});
    qc.setCachedResult(key, {
      rows: Array.from({ length: 500 }, (_, i) => ({ i, s: "y".repeat(30) })),
    });
    // Oversized entry is not stored → next request is a miss (fresh fetch).
    expect(qc.getCachedResult(key)).toBeNull();
    expect(qc.getQueryCacheStats().sizeBytes).toBe(0);
  });
});
