const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:4000';
const ENGINE_API_KEY = process.env.ENGINE_API_KEY || '';

export async function proxyToEngine(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<Response> {
  const url = `${ENGINE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (ENGINE_API_KEY) {
    headers['x-engine-api-key'] = ENGINE_API_KEY;
  }

  return fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}
