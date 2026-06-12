import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "http";
import express from "express";
import type { AddressInfo } from "net";
import type { CalibrationRecord } from "@/core/nlp/calibration";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Pass-through RBAC so we exercise the route logic without auth plumbing.
vi.mock("@/middleware/rbac", () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

const sample: CalibrationRecord = {
  timestamp: "2026-06-12T00:00:00.000Z",
  testSetSize: 30,
  testSetHash: "h1",
  best: { weights: "current (0.5/0.3/0.2)", threshold: 0.5, score: 12 },
  current: {
    weights: "current (0.5/0.3/0.2)",
    threshold: 0.5,
    correctConfident: 10,
    wrongConfident: 1,
    oodFalseConfident: 0,
    posTotal: 25,
    oodTotal: 5,
    compositeScore: 12,
  },
};

const { runCalibrationMock, appendMock, readHistoryMock } = vi.hoisted(() => ({
  runCalibrationMock: vi.fn(),
  appendMock: vi.fn(),
  readHistoryMock: vi.fn(),
}));

vi.mock("@/core/nlp/calibration", () => ({
  runCalibration: runCalibrationMock,
}));
vi.mock("@/core/nlp/calibration-history", () => ({
  appendCalibrationRecord: appendMock,
  readCalibrationHistory: readHistoryMock,
}));

import { calibrationRouter } from "../../../routes/admin/calibration";

beforeEach(() => {
  runCalibrationMock.mockResolvedValue(sample);
  appendMock.mockResolvedValue(undefined);
  readHistoryMock.mockResolvedValue([sample]);
});

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/admin/calibration", calibrationRouter);
  return app;
}

async function call<T = unknown>(
  app: express.Express,
  method: "GET" | "POST",
  path: string,
): Promise<{ status: number; body: T }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method });
    return { status: res.status, body: (await res.json()) as T };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

describe("admin calibration route", () => {
  it("GET / returns the history", async () => {
    const { status, body } = await call<{ history: CalibrationRecord[] }>(
      buildApp(),
      "GET",
      "/api/admin/calibration",
    );
    expect(status).toBe(200);
    expect(body.history).toHaveLength(1);
    expect(body.history[0].current.compositeScore).toBe(12);
  });

  it("POST /run runs calibration, persists, and returns 201", async () => {
    const { status, body } = await call<{ record: CalibrationRecord }>(
      buildApp(),
      "POST",
      "/api/admin/calibration/run",
    );
    expect(status).toBe(201);
    expect(body.record.testSetHash).toBe("h1");
    expect(runCalibrationMock).toHaveBeenCalled();
    expect(appendMock).toHaveBeenCalledWith(sample);
  });
});
