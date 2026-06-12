import { describe, it, expect, vi } from "vitest";
import http from "http";
import express from "express";
import type { AddressInfo } from "net";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { getAuditLogMock } = vi.hoisted(() => ({ getAuditLogMock: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({
  getAuditLog: getAuditLogMock,
}));

import { auditRouter } from "../../../routes/admin/audit";

function buildApp(): express.Express {
  const app = express();
  app.use("/api/admin/audit", auditRouter);
  return app;
}

async function get<T = unknown>(
  app: express.Express,
  path: string,
): Promise<{ status: number; body: T }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: (await res.json()) as T };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

interface ViewBody {
  entries: Array<{
    id: string;
    action: string;
    user: string;
    resource: string;
    resourceType: string;
    details?: string;
  }>;
}

describe("admin audit route", () => {
  it("maps canonical logAudit entries to the UI view shape", async () => {
    getAuditLogMock.mockResolvedValueOnce([
      {
        timestamp: "2026-06-12T00:00:00.000Z",
        action: "create",
        resource: "data-role",
        resourceId: "finance",
        userId: "alice",
        details: { label: "Finance" },
        ip: "127.0.0.1",
      },
    ]);
    const { status, body } = await get<ViewBody>(
      buildApp(),
      "/api/admin/audit",
    );
    expect(status).toBe(200);
    expect(body.entries).toHaveLength(1);
    const e = body.entries[0];
    expect(e.user).toBe("alice");
    expect(e.resourceType).toBe("data-role");
    expect(e.resource).toBe("finance");
    expect(e.details).toBe(JSON.stringify({ label: "Finance" }));
    expect(typeof e.id).toBe("string");
  });

  it("defaults user to 'system' when userId is absent", async () => {
    getAuditLogMock.mockResolvedValueOnce([
      {
        timestamp: "2026-06-12T00:00:00.000Z",
        action: "update",
        resource: "synonym",
        details: {},
      },
    ]);
    const { body } = await get<ViewBody>(buildApp(), "/api/admin/audit");
    expect(body.entries[0].user).toBe("system");
  });

  it("filters by action, user, and search term", async () => {
    getAuditLogMock.mockResolvedValue([
      {
        timestamp: "2026-06-12T00:00:00.000Z",
        action: "create",
        resource: "data-role",
        resourceId: "finance",
        userId: "alice",
        details: {},
      },
      {
        timestamp: "2026-06-12T00:01:00.000Z",
        action: "delete",
        resource: "synonym",
        resourceId: "rev",
        userId: "bob",
        details: {},
      },
    ]);
    const byAction = await get<ViewBody>(
      buildApp(),
      "/api/admin/audit?action=delete",
    );
    expect(byAction.body.entries).toHaveLength(1);
    expect(byAction.body.entries[0].action).toBe("delete");

    const byUser = await get<ViewBody>(
      buildApp(),
      "/api/admin/audit?user=alice",
    );
    expect(byUser.body.entries).toHaveLength(1);
    expect(byUser.body.entries[0].user).toBe("alice");

    const bySearch = await get<ViewBody>(
      buildApp(),
      "/api/admin/audit?search=finance",
    );
    expect(bySearch.body.entries).toHaveLength(1);
    expect(bySearch.body.entries[0].resource).toBe("finance");
  });
});
