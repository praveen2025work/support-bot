import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockProxyToEngine = jest.fn();
jest.mock('@/lib/engine-proxy', () => ({
  proxyToEngine: (...args: unknown[]) => mockProxyToEngine(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from '@/app/api/chat/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createChatRequest(body: unknown): NextRequest {
  const url = new URL('http://localhost:3001/api/chat');
  return new NextRequest(url, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  });
}

function mockEngineResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns a successful response proxied from the engine', async () => {
    const engineData = {
      sessionId: 'sess-123',
      text: 'There were 42 orders last month.',
      intent: 'data_query',
      confidence: 0.95,
    };

    mockProxyToEngine.mockResolvedValue(mockEngineResponse(200, engineData));

    const req = createChatRequest({ text: 'How many orders last month?' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('sessionId', 'sess-123');
    expect(body).toHaveProperty('text');
    expect(body).toHaveProperty('intent', 'data_query');
    expect(mockProxyToEngine).toHaveBeenCalledWith('/api/chat', expect.objectContaining({ method: 'POST' }));
  });

  test('returns 400 when the engine returns 400', async () => {
    mockProxyToEngine.mockResolvedValue(
      mockEngineResponse(400, { error: 'Invalid message format' })
    );

    const req = createChatRequest({ garbage: true });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid/i);
  });

  test('returns 502 when the engine is unreachable', async () => {
    mockProxyToEngine.mockRejectedValue(new Error('ECONNREFUSED'));

    const req = createChatRequest({ text: 'hi' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toMatch(/unreachable/i);
  });
});
