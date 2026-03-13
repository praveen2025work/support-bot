import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { engineAuthMiddleware, ipWhitelistMiddleware, buildTenantAuthHeaders } from '../../services/engine/src/middleware/auth';

// Mock the logger to avoid side effects
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// We spy on timingSafeEqual rather than fully mocking crypto,
// because the middleware uses the real function and we need it to work.
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    timingSafeEqual: jest.fn(actual.timingSafeEqual),
  };
});

const mockedTimingSafeEqual = timingSafeEqual as jest.MockedFunction<typeof timingSafeEqual>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockReq(headers: Record<string, string> = {}, overrides: Partial<Request> = {}): Partial<Request> {
  return {
    headers: { ...headers },
    ip: '127.0.0.1',
    url: '/api/test',
    socket: { remoteAddress: '127.0.0.1' } as any,
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusCode: number | undefined; body: unknown } {
  const state = { statusCode: undefined as number | undefined, body: undefined as unknown };
  const res: Partial<Response> = {
    status: jest.fn().mockImplementation((code: number) => {
      state.statusCode = code;
      return res;
    }),
    json: jest.fn().mockImplementation((data: unknown) => {
      state.body = data;
      return res;
    }),
  };
  return { res, ...state };
}

// ── engineAuthMiddleware ─────────────────────────────────────────────────────

describe('engineAuthMiddleware', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ── 1. Valid API key passes ──────────────────────────────────────────────

  test('calls next() when a valid API key is provided via x-engine-api-key', () => {
    process.env.ENGINE_API_KEY = 'my-secret-key';
    const req = createMockReq({ 'x-engine-api-key': 'my-secret-key' });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('calls next() when a valid API key is provided via Authorization Bearer header', () => {
    process.env.ENGINE_API_KEY = 'my-secret-key';
    const req = createMockReq({ authorization: 'Bearer my-secret-key' });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── 2. Missing API key returns 401 ───────────────────────────────────────

  test('returns 401 when no API key header is provided', () => {
    process.env.ENGINE_API_KEY = 'my-secret-key';
    const req = createMockReq();
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // ── 3. Wrong API key returns 401 ─────────────────────────────────────────

  test('returns 401 when the wrong API key is provided', () => {
    process.env.ENGINE_API_KEY = 'correct-key';
    const req = createMockReq({ 'x-engine-api-key': 'wrong-key' });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  // ── 4. Timing-safe comparison is used ────────────────────────────────────

  test('uses timingSafeEqual for comparison on valid key', () => {
    process.env.ENGINE_API_KEY = 'test-key';
    const req = createMockReq({ 'x-engine-api-key': 'test-key' });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(mockedTimingSafeEqual).toHaveBeenCalledTimes(1);
    const [a, b] = mockedTimingSafeEqual.mock.calls[0];
    expect(Buffer.isBuffer(a)).toBe(true);
    expect(Buffer.isBuffer(b)).toBe(true);
    expect(a.toString()).toBe('test-key');
    expect(b.toString()).toBe('test-key');
  });

  test('uses timingSafeEqual for comparison on invalid key (same length)', () => {
    process.env.ENGINE_API_KEY = 'abcd';
    const req = createMockReq({ 'x-engine-api-key': 'wxyz' });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    // timingSafeEqual is called because lengths match
    expect(mockedTimingSafeEqual).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── 5. API key in different header locations ─────────────────────────────

  test('prefers x-engine-api-key over Authorization header', () => {
    process.env.ENGINE_API_KEY = 'preferred-key';
    const req = createMockReq({
      'x-engine-api-key': 'preferred-key',
      authorization: 'Bearer wrong-key',
    });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('falls back to Authorization header when x-engine-api-key is absent', () => {
    process.env.ENGINE_API_KEY = 'bearer-key';
    const req = createMockReq({ authorization: 'Bearer bearer-key' });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  // ── 6. Demo mode (no ENGINE_API_KEY) ─────────────────────────────────────

  test('passes through when ENGINE_API_KEY is not set (demo mode)', () => {
    delete process.env.ENGINE_API_KEY;
    const req = createMockReq();
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── 7. Edge cases ────────────────────────────────────────────────────────

  test('rejects empty string API key', () => {
    process.env.ENGINE_API_KEY = 'real-key';
    const req = createMockReq({ 'x-engine-api-key': '' });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects very long API key', () => {
    process.env.ENGINE_API_KEY = 'short';
    const longKey = 'a'.repeat(10_000);
    const req = createMockReq({ 'x-engine-api-key': longKey });
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('handles undefined header gracefully (coerced to empty string)', () => {
    process.env.ENGINE_API_KEY = 'real-key';
    // Headers object with no auth-related keys
    const req = createMockReq({});
    const { res } = createMockRes();
    const next = jest.fn();

    engineAuthMiddleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ── ipWhitelistMiddleware ────────────────────────────────────────────────────

describe('ipWhitelistMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows request when IP is in the whitelist', () => {
    const middleware = ipWhitelistMiddleware(['10.0.0.1', '192.168.1.1']);
    const req = createMockReq({}, { ip: '192.168.1.1' });
    const { res } = createMockRes();
    const next = jest.fn();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('allows all when wildcard * is in the whitelist', () => {
    const middleware = ipWhitelistMiddleware(['*']);
    const req = createMockReq({}, { ip: '99.99.99.99' });
    const { res } = createMockRes();
    const next = jest.fn();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 when IP is not whitelisted', () => {
    const middleware = ipWhitelistMiddleware(['10.0.0.1']);
    const req = createMockReq({}, { ip: '99.99.99.99' });
    const { res } = createMockRes();
    const next = jest.fn();

    middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('normalizes IPv6-mapped IPv4 addresses (strips ::ffff: prefix)', () => {
    const middleware = ipWhitelistMiddleware(['10.0.0.1']);
    const req = createMockReq({}, { ip: '::ffff:10.0.0.1' });
    const { res } = createMockRes();
    const next = jest.fn();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('falls back to socket.remoteAddress when req.ip is undefined', () => {
    const middleware = ipWhitelistMiddleware(['127.0.0.1']);
    const req = createMockReq({}, { ip: undefined, socket: { remoteAddress: '127.0.0.1' } as any });
    const { res } = createMockRes();
    const next = jest.fn();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ── buildTenantAuthHeaders ───────────────────────────────────────────────────

describe('buildTenantAuthHeaders', () => {
  test('returns empty object when config is undefined', () => {
    expect(buildTenantAuthHeaders(undefined)).toEqual({});
  });

  test('returns empty object for authType "none"', () => {
    expect(buildTenantAuthHeaders({ authType: 'none' })).toEqual({});
  });

  test('returns Authorization header for authType "bearer"', () => {
    expect(buildTenantAuthHeaders({ authType: 'bearer', token: 'tok123' })).toEqual({
      Authorization: 'Bearer tok123',
    });
  });

  test('returns empty object for bearer without token', () => {
    expect(buildTenantAuthHeaders({ authType: 'bearer' })).toEqual({});
  });

  test('returns X-BAM-Token header for authType "bam"', () => {
    expect(buildTenantAuthHeaders({ authType: 'bam', bamToken: 'bam-tok' })).toEqual({
      'X-BAM-Token': 'bam-tok',
    });
  });

  test('returns X-BAM-Token header for legacy authType "bam_token"', () => {
    expect(buildTenantAuthHeaders({ authType: 'bam_token', bamToken: 'legacy-tok' })).toEqual({
      'X-BAM-Token': 'legacy-tok',
    });
  });

  test('returns empty object for authType "windows"', () => {
    expect(buildTenantAuthHeaders({ authType: 'windows' })).toEqual({});
  });

  test('returns empty object for authType "ip_whitelist"', () => {
    expect(buildTenantAuthHeaders({ authType: 'ip_whitelist' })).toEqual({});
  });
});
