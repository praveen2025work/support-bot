const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4001";
const ENGINE_API_KEY = process.env.ENGINE_API_KEY || "";
const ENGINE_TIMEOUT_MS = Number(process.env.ENGINE_TIMEOUT_MS) || 30000;

export async function proxyToEngine(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<Response> {
  const url = `${ENGINE_URL}${path}`;
  // Note: do NOT hardcode `x-user-role` here. The admin sub-router in the
  // engine defaults to admin server-side when the header is missing, so
  // admin endpoints still work. Chat / PII-aware paths read this header
  // to gate clear-text PII view — overriding it to "admin" here would
  // make every chat call admin, which silently bypasses masking. Callers
  // who need a specific role pass it explicitly via options.headers.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (ENGINE_API_KEY) {
    headers["x-engine-api-key"] = ENGINE_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? ENGINE_TIMEOUT_MS,
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
