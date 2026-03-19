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
