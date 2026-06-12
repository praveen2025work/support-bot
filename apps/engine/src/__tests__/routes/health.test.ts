import { describe, it, expect, afterEach, vi } from "vitest";
import http from "http";
import os from "os";
import express from "express";
import type { AddressInfo } from "net";

// health.ts touches the engine singleton, the source health monitor, env
// config and the logger. Stub them so /health/ready can reach a "ready"
// verdict deterministically, then exercise the real liveness/drain logic.
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/env-config", () => ({
  // os.tmpdir() is always present and R/W, so the dataDir readiness check passes.
  DATA_DIR: os.tmpdir(),
  INSTANCE_ID: "test-instance",
}));

vi.mock("@/lib/singleton", () => ({
  getEngine: vi.fn(async () => ({ isInitialized: () => true })),
  getEngineCount: vi.fn(() => 1),
  getInitializedGroups: vi.fn(() => ["default"]),
}));

vi.mock("@/core/sources/health-monitor", () => ({
  getAllHealth: vi.fn(() => []),
}));

// The lifecycle module is intentionally NOT mocked — we drive the real
// drain flag the server flips during shutdown.
import { setDraining } from "@/lib/lifecycle";
import { healthRouter } from "../../routes/health";

function buildApp(): express.Express {
  const app = express();
  app.use("/api", healthRouter);
  return app;
}

interface JsonResponse<T = unknown> {
  status: number;
  body: T;
}

async function get<T = unknown>(
  app: express.Express,
  path: string,
): Promise<JsonResponse<T>> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    let body: T;
    try {
      body = (await res.json()) as T;
    } catch {
      body = undefined as unknown as T;
    }
    return { status: res.status, body };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

afterEach(() => {
  // Don't leak drain state into other tests.
  setDraining(false);
});

describe("health routes", () => {
  it("GET /api/health/live returns 200 (liveness)", async () => {
    const { status, body } = await get<{ status: string }>(
      buildApp(),
      "/api/health/live",
    );
    expect(status).toBe(200);
    expect(body.status).toBeDefined();
  });

  it("GET /api/health (alias) returns 200", async () => {
    const { status } = await get(buildApp(), "/api/health");
    expect(status).toBe(200);
  });

  it("GET /api/health/ready returns 200 when subsystems are up", async () => {
    const { status, body } = await get<{ status: string }>(
      buildApp(),
      "/api/health/ready",
    );
    expect(status).toBe(200);
    expect(body.status).toBe("ready");
  });

  it("GET /api/health/ready returns 503 'draining' during shutdown drain", async () => {
    setDraining(true);
    const { status, body } = await get<{ status: string }>(
      buildApp(),
      "/api/health/ready",
    );
    expect(status).toBe(503);
    expect(body.status).toBe("draining");
  });

  it("liveness stays 200 even while draining (do-not-restart signal)", async () => {
    setDraining(true);
    const { status } = await get(buildApp(), "/api/health/live");
    expect(status).toBe(200);
  });
});
