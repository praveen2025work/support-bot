/**
 * Proxy utility for SQL connector microservices.
 * Similar to engine-proxy.ts but targets connector service URLs.
 */

export type ConnectorType = "mssql" | "oracle" | "csv-xlsx";

function getBaseUrl(type: ConnectorType): string {
  if (type === "mssql") {
    return process.env.MSSQL_CONNECTOR_URL || "http://localhost:4002";
  }
  if (type === "oracle") {
    return process.env.ORACLE_CONNECTOR_URL || "http://localhost:4003";
  }
  return process.env.CSV_XLSX_CONNECTOR_URL || "http://localhost:4004";
}

function getConnectorApiKey(type: ConnectorType): string | undefined {
  const commonKey = process.env.CONNECTOR_API_KEY;
  if (type === "mssql") return process.env.MSSQL_CONNECTOR_API_KEY || commonKey;
  if (type === "oracle")
    return process.env.ORACLE_CONNECTOR_API_KEY || commonKey;
  return process.env.CSV_XLSX_CONNECTOR_API_KEY || commonKey;
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
  const apiKey = getConnectorApiKey(type);
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? (Number(process.env.CONNECTOR_TIMEOUT_MS) || 30000),
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
