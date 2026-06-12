import path from "path";

export const CONNECTOR_PORT = parseInt(
  process.env.CONNECTOR_PORT || "4002",
  10,
);
export const CONNECTOR_TYPE = "mssql" as const;
export const DATA_DIR =
  process.env.DATA_DIR || path.resolve(process.cwd(), "data");
export const UI_ORIGIN = process.env.UI_ORIGIN || "http://localhost:3001";
export const CONNECTOR_API_KEY = process.env.CONNECTOR_API_KEY || "";
export const LOG_LEVEL = process.env.LOG_LEVEL || "info";
export const IS_DEV = process.env.NODE_ENV !== "production";

// ── Connection-pool warmth ──────────────────────────────────────────
// Keep a small number of connections alive on an idle pool so the first
// query after a quiet period does not pay a full connect. Default 1 (warm);
// set POOL_MIN/DB_POOL_MIN=0 to fully drain on idle (previous behaviour).
export const POOL_MIN = (() => {
  const raw = process.env.POOL_MIN ?? process.env.DB_POOL_MIN;
  const parsed = raw != null ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
})();

// ── Per-request execution bound ─────────────────────────────────────
// Hard cap (ms) on a single query so an abandoned request releases its
// pooled connection promptly after the engine aborts (~30s). Configurable
// via REQUEST_TIMEOUT_MS; defaults to 30s to align with the engine.
export const REQUEST_TIMEOUT_MS = (() => {
  const parsed = parseInt(process.env.REQUEST_TIMEOUT_MS || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
})();

// ── SELECT TOP pushdown ─────────────────────────────────────────────
// Inject `TOP (n)` into safe SELECTs so the server stops early instead of
// shipping the whole recordset. Enabled by default; set TOP_PUSHDOWN=false
// to fall back to the post-fetch enforceRowLimit slicing only.
export const TOP_PUSHDOWN = process.env.TOP_PUSHDOWN !== "false";

export const paths = {
  connectors: {
    config: path.join(DATA_DIR, "connectors", "connectors.json"),
    credentials: path.join(DATA_DIR, "connectors", "credentials.enc.json"),
    dir: path.join(DATA_DIR, "connectors"),
  },
  queries: {
    config: path.join(DATA_DIR, "queries", "queries.json"),
    dir: path.join(DATA_DIR, "queries"),
  },
};
