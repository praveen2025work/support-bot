/**
 * Approximate the in-cache byte footprint of a value, for size-bounded LRU
 * caches (`maxSize` + `sizeCalculation`).
 *
 * We use the serialized JSON length as a proxy for retained-heap size. It is an
 * approximation — the live object graph is larger than its JSON (object
 * headers, key interning, array slack) — but it is monotonic in the thing we
 * actually care about (row count × columns), cheap-ish, and deterministic.
 * The serialization cost is paid once per cache *set* (i.e. per upstream
 * miss), not per hit, so it rides along with the fetch/parse the entry already
 * required.
 *
 * `sizeCalculation` must return a positive integer, so we clamp to >= 1 and
 * fall back to 1 on any serialization failure (e.g. a BigInt or a circular
 * ref) rather than throwing on the cache-write path.
 */
export function estimateBytes(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    if (!json) return 1;
    return Math.max(1, Buffer.byteLength(json, "utf8"));
  } catch {
    return 1;
  }
}
