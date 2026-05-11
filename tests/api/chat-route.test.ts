import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockProxyToEngine = jest.fn();
jest.mock("@/lib/engine-proxy", () => ({
  proxyToEngine: (...args: unknown[]) => mockProxyToEngine(...args),
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { POST } from "@/app/api/chat/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createChatRequest(body: unknown): NextRequest {
  const url = new URL("http://localhost:3001/api/chat");
  return new NextRequest(url, {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
}

function mockEngineResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns a successful response proxied from the engine", async () => {
    const engineData = {
      sessionId: "sess-123",
      text: "There were 42 orders last month.",
      intent: "data_query",
      confidence: 0.95,
    };

    mockProxyToEngine.mockResolvedValue(mockEngineResponse(200, engineData));

    const req = createChatRequest({ text: "How many orders last month?" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("sessionId", "sess-123");
    expect(body).toHaveProperty("text");
    expect(body).toHaveProperty("intent", "data_query");
    expect(mockProxyToEngine).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("returns 400 when the engine returns 400", async () => {
    mockProxyToEngine.mockResolvedValue(
      mockEngineResponse(400, { error: "Invalid message format" }),
    );

    const req = createChatRequest({ garbage: true });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid/i);
  });

  test("returns 502 when the engine is unreachable", async () => {
    mockProxyToEngine.mockRejectedValue(new Error("ECONNREFUSED"));

    const req = createChatRequest({ text: "hi" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toMatch(/unreachable/i);
  });

  // ── forceIntent flow (Lane D — "Did you mean?" disambiguation) ────────────
  // The UI route is a thin proxy: it forwards the request body verbatim to the
  // engine, where forceIntent is validated against the user's group catalog.
  // These tests verify the body propagates faithfully (acceptance) and that
  // engine-side rejections (foreign / out-of-group intents) surface as 400 to
  // the client without leaking internals.

  test("forwards forceIntent in the request body when present", async () => {
    const engineData = {
      sessionId: "sess-fi",
      text: "Running monthly_revenue.",
      intent: "query.execute",
      queryName: "monthly_revenue",
      confidence: 1,
    };
    mockProxyToEngine.mockResolvedValue(mockEngineResponse(200, engineData));

    const req = createChatRequest({
      text: "show me numbers",
      forceIntent: "monthly_revenue",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("queryName", "monthly_revenue");
    // The proxy must include the forceIntent field in the JSON body.
    expect(mockProxyToEngine).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ forceIntent: "monthly_revenue" }),
      }),
    );
  });

  test("returns 400 when the engine rejects a foreign forceIntent", async () => {
    // Engine performs the actual group-permission check; the UI route must
    // surface the 400 verbatim so the client can show a clear error.
    mockProxyToEngine.mockResolvedValue(
      mockEngineResponse(400, {
        error: "forceIntent not permitted for this group",
      }),
    );

    const req = createChatRequest({
      text: "show me numbers",
      forceIntent: "foreign_query_not_in_group",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/permitted|invalid|forceIntent/i);
  });
});
