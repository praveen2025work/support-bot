import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import { promises as fsp, existsSync } from "fs";
import path from "path";
import os from "os";
import http from "http";
import express from "express";
import type { AddressInfo } from "net";
import type { Role } from "../../../lib/rbac";

// Temp DATA_DIR per test run. Tests write only inside this directory; the real
// services/engine/data tree is never touched.
let tempDir: string;

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/env-config", () => ({
  paths: {
    data: {
      auditDir: path.join(os.tmpdir(), "synonyms-route-test-audit-dir"),
      auditFile: "", // overwritten in beforeEach
      synonymsFile: (groupId: string) =>
        path.join(tempDir, "learning", groupId, "synonyms.json"),
    },
  },
}));

const auditCalls: Array<unknown> = [];
vi.mock("@/lib/audit-logger", () => ({
  logAudit: vi.fn(async (entry: unknown) => {
    auditCalls.push(entry);
  }),
}));

const expanderClearCalls: Array<string | undefined> = [];
vi.mock("@/core/nlp/synonym-expander", async () => {
  // Keep types alive but stub the runtime so tests don't depend on real cache.
  return {
    clearGroupSynonymsCache: vi.fn((groupId?: string) => {
      expanderClearCalls.push(groupId);
    }),
  };
});

import { logAudit } from "@/lib/audit-logger";
import { clearGroupSynonymsCache } from "@/core/nlp/synonym-expander";
import synonymsRouter from "../../../routes/admin/synonyms";

// ---------------------------------------------------------------------------
// Test express app — mounts the router under /api/admin/groups/:groupId/synonyms
// and injects the X-User-Role header semantics that admin/index.ts handles in
// production. We default to 'admin' but tests can override per-request.
// ---------------------------------------------------------------------------

function buildApp(roleForRequests: Role | "none" = "admin"): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (roleForRequests !== "none") {
      (req as unknown as { userRole: Role }).userRole = roleForRequests;
    }
    next();
  });
  app.use("/api/admin/groups/:groupId/synonyms", synonymsRouter);
  return app;
}

interface JsonResponse<T = unknown> {
  status: number;
  body: T;
}

async function request<T = unknown>(
  app: express.Express,
  init: {
    method: "GET" | "POST" | "DELETE";
    path: string;
    body?: unknown;
  },
): Promise<JsonResponse<T>> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}${init.path}`;
    const res = await fetch(url, {
      method: init.method,
      headers: { "Content-Type": "application/json" },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
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

beforeEach(async () => {
  tempDir = path.join(
    os.tmpdir(),
    `synonyms-route-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await fsp.mkdir(tempDir, { recursive: true });
  auditCalls.length = 0;
  expanderClearCalls.length = 0;
  vi.mocked(logAudit).mockClear();
  vi.mocked(clearGroupSynonymsCache).mockClear();
});

afterEach(async () => {
  await fsp.rm(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("admin synonyms route", () => {
  describe("GET /api/admin/groups/:groupId/synonyms", () => {
    it("returns empty list when file does not exist", async () => {
      const app = buildApp("admin");
      const res = await request<{
        groupId: string;
        synonyms: unknown[];
      }>(app, { method: "GET", path: "/api/admin/groups/finance/synonyms" });
      expect(res.status).toBe(200);
      expect(res.body.groupId).toBe("finance");
      expect(res.body.synonyms).toEqual([]);
    });

    it("returns persisted entries", async () => {
      // Pre-populate the file directly via the same path the route writes to
      const groupDir = path.join(tempDir, "learning", "finance");
      await fsp.mkdir(groupDir, { recursive: true });
      const seed = [
        {
          canonical: "revenue",
          synonyms: ["topline", "earnings"],
          updatedAt: "2026-05-08T00:00:00.000Z",
          updatedBy: "admin",
        },
      ];
      await fsp.writeFile(
        path.join(groupDir, "synonyms.json"),
        JSON.stringify(seed),
      );

      const app = buildApp("admin");
      const res = await request<{
        synonyms: Array<{ canonical: string; synonyms: string[] }>;
      }>(app, { method: "GET", path: "/api/admin/groups/finance/synonyms" });
      expect(res.status).toBe(200);
      expect(res.body.synonyms).toHaveLength(1);
      expect(res.body.synonyms[0].canonical).toBe("revenue");
    });
  });

  describe("POST /api/admin/groups/:groupId/synonyms", () => {
    it("creates a new entry and writes the file", async () => {
      const app = buildApp("admin");
      const res = await request<{
        success: boolean;
        entry: { canonical: string; synonyms: string[] };
      }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline", "earnings"] },
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.entry.canonical).toBe("revenue");
      expect(res.body.entry.synonyms).toEqual(["topline", "earnings"]);

      const filePath = path.join(
        tempDir,
        "learning",
        "finance",
        "synonyms.json",
      );
      expect(existsSync(filePath)).toBe(true);
      const persisted = JSON.parse(await fsp.readFile(filePath, "utf-8"));
      expect(persisted).toHaveLength(1);
      expect(persisted[0].canonical).toBe("revenue");
    });

    it("calls logAudit with action=create", async () => {
      const app = buildApp("admin");
      await request(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline"] },
      });
      expect(logAudit).toHaveBeenCalledTimes(1);
      const call = vi.mocked(logAudit).mock.calls[0][0];
      expect(call.action).toBe("create");
      expect(call.resource).toBe("synonym");
      expect(call.resourceId).toBe("finance:revenue");
      expect(call.groupId).toBe("finance");
    });

    it("calls logAudit with action=update on second POST for same canonical", async () => {
      const app = buildApp("admin");
      await request(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline"] },
      });
      await request(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline", "gross sales"] },
      });
      expect(logAudit).toHaveBeenCalledTimes(2);
      const second = vi.mocked(logAudit).mock.calls[1][0];
      expect(second.action).toBe("update");
    });

    it("invalidates the per-group synonym cache after a write", async () => {
      const app = buildApp("admin");
      await request(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline"] },
      });
      expect(clearGroupSynonymsCache).toHaveBeenCalledWith("finance");
    });

    it("rejects body without canonical", async () => {
      const app = buildApp("admin");
      const res = await request<{ error: string }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { synonyms: ["x"] },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/canonical/);
    });

    it("rejects body where synonyms is not an array", async () => {
      const app = buildApp("admin");
      const res = await request<{ error: string }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: "topline" },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/synonyms/);
    });

    it("rejects body with empty synonyms list", async () => {
      const app = buildApp("admin");
      const res = await request<{ error: string }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["", "  "] },
      });
      expect(res.status).toBe(400);
    });

    it("rejects canonical with disallowed characters", async () => {
      const app = buildApp("admin");
      const res = await request<{ error: string }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "rev<script>", synonyms: ["x"] },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/canonical/);
    });

    it("dedupes synonyms and drops self-reference", async () => {
      const app = buildApp("admin");
      const res = await request<{
        entry: { synonyms: string[] };
      }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: {
          canonical: "revenue",
          synonyms: ["earnings", "earnings", "REVENUE", "topline"],
        },
      });
      expect(res.status).toBe(200);
      // Self reference and duplicates removed; lower-cased
      expect(res.body.entry.synonyms.sort()).toEqual(
        ["earnings", "topline"].sort(),
      );
    });
  });

  describe("DELETE /api/admin/groups/:groupId/synonyms", () => {
    it("removes the entry and persists the change", async () => {
      const app = buildApp("admin");
      await request(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline"] },
      });
      const del = await request<{ success: boolean; deleted: string }>(app, {
        method: "DELETE",
        path: "/api/admin/groups/finance/synonyms?canonical=revenue",
      });
      expect(del.status).toBe(200);
      expect(del.body.success).toBe(true);
      expect(del.body.deleted).toBe("revenue");

      const list = await request<{ synonyms: unknown[] }>(app, {
        method: "GET",
        path: "/api/admin/groups/finance/synonyms",
      });
      expect(list.body.synonyms).toEqual([]);
    });

    it("returns 404 when canonical is not found", async () => {
      const app = buildApp("admin");
      const del = await request<{ error: string }>(app, {
        method: "DELETE",
        path: "/api/admin/groups/finance/synonyms?canonical=nonexistent",
      });
      expect(del.status).toBe(404);
    });

    it("returns 400 when canonical query param missing", async () => {
      const app = buildApp("admin");
      const del = await request<{ error: string }>(app, {
        method: "DELETE",
        path: "/api/admin/groups/finance/synonyms",
      });
      expect(del.status).toBe(400);
    });

    it("logs audit entry on delete and clears cache", async () => {
      const app = buildApp("admin");
      await request(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline"] },
      });
      vi.mocked(logAudit).mockClear();
      vi.mocked(clearGroupSynonymsCache).mockClear();
      await request(app, {
        method: "DELETE",
        path: "/api/admin/groups/finance/synonyms?canonical=revenue",
      });
      expect(logAudit).toHaveBeenCalledTimes(1);
      const call = vi.mocked(logAudit).mock.calls[0][0];
      expect(call.action).toBe("delete");
      expect(call.resource).toBe("synonym");
      expect(call.resourceId).toBe("finance:revenue");
      expect(clearGroupSynonymsCache).toHaveBeenCalledWith("finance");
    });
  });

  describe("auth (rbac)", () => {
    it("rejects request with no userRole (401)", async () => {
      const app = buildApp("none");
      const res = await request<{ error: string }>(app, {
        method: "GET",
        path: "/api/admin/groups/finance/synonyms",
      });
      expect(res.status).toBe(401);
    });

    it("rejects viewer role (403) — viewer cannot manage synonyms", async () => {
      const app = buildApp("viewer");
      const res = await request<{ error: string }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline"] },
      });
      expect(res.status).toBe(403);
      const del = await request<{ error: string }>(app, {
        method: "DELETE",
        path: "/api/admin/groups/finance/synonyms?canonical=revenue",
      });
      expect(del.status).toBe(403);
      expect(logAudit).not.toHaveBeenCalled();
    });

    it("allows builder role (intents.manage requires builder+)", async () => {
      const app = buildApp("builder");
      const res = await request<{ success: boolean }>(app, {
        method: "POST",
        path: "/api/admin/groups/finance/synonyms",
        body: { canonical: "revenue", synonyms: ["topline"] },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("error handling", () => {
    it("does not throw when synonyms file is malformed JSON during GET", async () => {
      const groupDir = path.join(tempDir, "learning", "broken");
      await fsp.mkdir(groupDir, { recursive: true });
      await fsp.writeFile(
        path.join(groupDir, "synonyms.json"),
        "{ this is invalid json",
        "utf-8",
      );
      const app = buildApp("admin");
      const res = await request<{ synonyms: unknown[] }>(app, {
        method: "GET",
        path: "/api/admin/groups/broken/synonyms",
      });
      // The route returns 200 with an empty synonyms list — never throws.
      expect(res.status).toBe(200);
      expect(res.body.synonyms).toEqual([]);
    });
  });
});
