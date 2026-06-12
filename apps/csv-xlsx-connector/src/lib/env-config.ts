import path from "path";

export const CONNECTOR_PORT = parseInt(
  process.env.CONNECTOR_PORT || "4004",
  10,
);
export const CONNECTOR_TYPE = "csv-xlsx" as const;
export const DATA_DIR =
  process.env.DATA_DIR || path.resolve(process.cwd(), "data");
export const UI_ORIGIN = process.env.UI_ORIGIN || "http://localhost:3001";
export const CONNECTOR_API_KEY = process.env.CONNECTOR_API_KEY || "";
export const LOG_LEVEL = process.env.LOG_LEVEL || "info";
export const IS_DEV = process.env.NODE_ENV !== "production";

// ── Parsed-file cache ───────────────────────────────────────────────
// loadFileData re-reads and re-parses the whole CSV/XLSX on every execute.
// We cache the parsed result keyed by resolved path + mtime + size and serve
// it while the file is unchanged. Bound the number of distinct files cached
// (LRU eviction) so memory stays predictable. Set PARSE_CACHE_MAX=0 to disable.
export const PARSE_CACHE_MAX = (() => {
  const parsed = parseInt(process.env.PARSE_CACHE_MAX || "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 16;
})();

export const paths = {
  connectors: {
    config: path.join(DATA_DIR, "connectors", "connectors.json"),
    dir: path.join(DATA_DIR, "connectors"),
  },
  queries: {
    config: path.join(DATA_DIR, "queries", "queries.json"),
    dir: path.join(DATA_DIR, "queries"),
  },
};
