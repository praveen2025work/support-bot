import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";
import http from "http";
import express from "express";
import type { AddressInfo } from "net";

// Real env-config, but DATA_DIR redirected to a temp dir so the per-group query
// files are written under the temp tree — the real data/ is never touched.
const dataDir = path.join(os.tmpdir(), "admin-queries-route-test");
const originalDataDir = process.env.DATA_DIR;

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/audit-logger", () => ({
  logAudit: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.resetModules();
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  process.env.DATA_DIR = dataDir;
});
afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
  process.env.DATA_DIR = originalDataDir;
});

/** Mount the queries router with an admin role injected (RBAC bypass). */
async function makeServer(): Promise<http.Server> {
  const { default: queriesRouter } = await import("@/routes/admin/queries");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { userRole: string }).userRole = "admin";
    next();
  });
  app.use("/api/admin/queries", queriesRouter);
  return http.createServer(app);
}

function call(
  port: number,
  method: string,
  urlPath: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            json: raw ? JSON.parse(raw) : {},
          }),
        );
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function withServer(fn: (port: number) => Promise<void>): Promise<void> {
  const server = await makeServer();
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(port);
  } finally {
    server.close();
  }
}

describe("admin/queries route (group-scoped, file-based, no db.json)", () => {
  it("rejects a write with no groupId (400)", async () => {
    await withServer(async (port) => {
      const res = await call(port, "POST", "/api/admin/queries", {
        name: "x",
        type: "api",
        endpoint: "/x",
      });
      expect(res.status).toBe(400);
      expect(String(res.json.error)).toMatch(/groupId/);
    });
  });

  it("creates, lists, and deletes a query via the per-group file", async () => {
    await withServer(async (port) => {
      const created = await call(
        port,
        "POST",
        "/api/admin/queries?groupId=default",
        {
          name: "revenue",
          type: "api",
          endpoint: "/revenue",
          source: "finance",
        },
      );
      expect(created.status).toBe(201);
      expect(created.json.id).toBe("q1");

      const list = await call(
        port,
        "GET",
        "/api/admin/queries?groupId=default",
      );
      expect(
        (list.json.queries as Array<{ name: string }>).map((q) => q.name),
      ).toContain("revenue");

      const del = await call(
        port,
        "DELETE",
        "/api/admin/queries?groupId=default&id=q1",
      );
      expect(del.status).toBe(200);

      const after = await call(
        port,
        "GET",
        "/api/admin/queries?groupId=default",
      );
      expect(after.json.queries as unknown[]).toHaveLength(0);
    });
  });

  it("404s when updating a query id that does not exist", async () => {
    await withServer(async (port) => {
      const res = await call(port, "PATCH", "/api/admin/queries", {
        groupId: "default",
        id: "nope",
        description: "x",
      });
      expect(res.status).toBe(404);
    });
  });
});
