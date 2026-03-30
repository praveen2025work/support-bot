/**
 * Proxy utility for SQL connector microservices.
 * Similar to engine-proxy.ts but targets connector service URLs.
 */

const MSSQL_CONNECTOR_URL =
  process.env.MSSQL_CONNECTOR_URL || "http://localhost:4002";
const ORACLE_CONNECTOR_URL =
  process.env.ORACLE_CONNECTOR_URL || "http://localhost:4003";
const CSV_XLSX_CONNECTOR_URL =
  process.env.CSV_XLSX_CONNECTOR_URL || "http://localhost:4004";
const CONNECTOR_TIMEOUT_MS = Number(process.env.CONNECTOR_TIMEOUT_MS) || 30000;

export type ConnectorType = "mssql" | "oracle" | "csv-xlsx";

function getBaseUrl(type: ConnectorType): string {
  if (type === "mssql") return MSSQL_CONNECTOR_URL;
  if (type === "oracle") return ORACLE_CONNECTOR_URL;
  return CSV_XLSX_CONNECTOR_URL;
}

export async function proxyToConnector(
  type: ConnectorType,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<Response> {
  const baseUrl = getBaseUrl(type);
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Forward connector API key if set
  const apiKeyMap: Record<ConnectorType, string | undefined> = {
    mssql: process.env.MSSQL_CONNECTOR_API_KEY,
    oracle: process.env.ORACLE_CONNECTOR_API_KEY,
    "csv-xlsx": process.env.CSV_XLSX_CONNECTOR_API_KEY,
  };
  const apiKey = apiKeyMap[type];
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? CONNECTOR_TIMEOUT_MS,
  );

  try {
    return await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}
