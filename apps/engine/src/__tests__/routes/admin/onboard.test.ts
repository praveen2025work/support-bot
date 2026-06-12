import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fsp } from "fs";
import path from "path";
import os from "os";
import http from "http";
import express from "express";
import type { AddressInfo } from "net";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/middleware/rbac", () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

const { ref } = vi.hoisted(() => ({ ref: { dir: "" } }));
vi.mock("@/lib/env-config", () => ({
  paths: {
    training: {
      get groupsDir() {
        return ref.dir;
      },
    },
  },
}));

import onboardRouter from "../../../routes/admin/onboard";

function buildApp(): express.Express {
  const app = express();
  app.use("/api/admin/onboard", onboardRouter);
  return app;
}

async function get<T = unknown>(
  app: express.Express,
  p: string,
): Promise<{ status: number; body: T }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${p}`);
    return { status: res.status, body: (await res.json()) as T };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

interface TemplatesBody {
  templates: Array<{
    id: string;
    label: string;
    source: string;
    queries: Array<{ name: string; description: string; filters: string }>;
  }>;
}

beforeEach(async () => {
  ref.dir = path.join(
    os.tmpdir(),
    `onboard-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await fsp.mkdir(ref.dir, { recursive: true });
  await fsp.writeFile(
    path.join(ref.dir, "corpus-foo.json"),
    JSON.stringify({
      entities: {
        query_name: {
          options: { monthly_revenue: ["rev"], daily_orders: [] },
        },
        region: { options: {} },
      },
    }),
    "utf-8",
  );
  // A non-corpus file that must be ignored.
  await fsp.writeFile(path.join(ref.dir, "faq-foo.json"), "{}", "utf-8");
});

afterEach(async () => {
  await fsp.rm(ref.dir, { recursive: true, force: true });
});

describe("admin onboard templates route", () => {
  it("derives a template per corpus file with humanized queries + filters", async () => {
    const { status, body } = await get<TemplatesBody>(
      buildApp(),
      "/api/admin/onboard/templates",
    );
    expect(status).toBe(200);
    expect(body.templates).toHaveLength(1);
    const t = body.templates[0];
    expect(t.id).toBe("foo");
    expect(t.source).toBe("foo");
    expect(t.queries.map((q) => q.name)).toEqual([
      "monthly_revenue",
      "daily_orders",
    ]);
    expect(t.queries[0].description).toBe("Monthly Revenue");
    // region is a known filter entity present in the corpus
    expect(t.queries[0].filters).toContain("region");
  });

  it("returns an empty list when the groups dir is missing", async () => {
    ref.dir = path.join(os.tmpdir(), "onboard-does-not-exist-xyz");
    const { status, body } = await get<TemplatesBody>(
      buildApp(),
      "/api/admin/onboard/templates",
    );
    expect(status).toBe(200);
    expect(body.templates).toEqual([]);
  });
});
