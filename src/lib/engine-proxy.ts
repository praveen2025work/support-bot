const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:4001';
const ENGINE_API_KEY = process.env.ENGINE_API_KEY || '';
const ENGINE_TIMEOUT_MS = Number(process.env.ENGINE_TIMEOUT_MS) || 30000;

export async function proxyToEngine(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<Response> {
  const url = `${ENGINE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-role': 'admin',
    ...options.headers,
  };
  if (ENGINE_API_KEY) {
    headers['x-engine-api-key'] = ENGINE_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? ENGINE_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
