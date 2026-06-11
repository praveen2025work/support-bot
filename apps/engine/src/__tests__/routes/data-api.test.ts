import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { promises as fsp, existsSync } from "fs";
import path from "path";
import http from "http";
import express from "express";
import type { AddressInfo } from "net";
import type { CsvData } from "@/core/api-connector/csv-analyzer";

// ---------------------------------------------------------------------------
// Test isolation strategy
//
// The Data Explorer view endpoints persist to `paths.data.root` /
// data-explorer-views/<group>.json. Rather than mock the large env-config
// `paths` object (many transitively-imported modules read it), we point the
// real DATA_DIR at a throwaway temp directory *before* any module loads via
// vi.hoisted. The real apps/engine/data tree is never touched.
//
// `datasets` / `queryDefs` are the in-memory fixtures the mocked QueryService
// serves; they live in hoisted scope so the mock factory can close over them
// without a temporal-dead-zone hazard.
// ---------------------------------------------------------------------------
const { DATA_ROOT, datasets, queryDefs, execState } = vi.hoisted(() => {
  const base = (process.env.TMPDIR || process.env.TEMP || "/tmp").replace(
    /\/+$/,
    "",
  );
  const dir = `${base}/data-api-test-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  process.env.DATA_DIR = dir;
  return {
    DATA_ROOT: dir,
    datasets: new Map<string, CsvData>(),
    queryDefs: new Map<string, QueryDefFixture>(),
    // Tracks how many times the mocked upstream fetch (executeQuery) runs, and
    // an optional delay so concurrent requests can be held in-flight together.
    execState: { calls: 0, delayMs: 0 } as { calls: number; delayMs: number },
  };
});

interface QueryDefFixture {
  name: string;
  type?: string;
  columnConfig?: {
    valueColumns?: string[];
    labelColumns?: string[];
  };
}

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// The real lock would also work inside the temp dir, but stubbing keeps the
// upsert deterministic and avoids lock-file artifacts between tests.
vi.mock("@/lib/file-lock", () => ({
  withFileLock: vi.fn(
    async <T>(_file: string, fn: () => Promise<T>): Promise<T> => fn(),
  ),
}));

vi.mock("@/config/group-config", () => ({
  getGroupConfig: vi.fn(() => ({
    apiBaseUrl: undefined,
    sources: [],
    queries: [],
  })),
  getGroupConfigs: vi.fn(() => ({ default: {}, finance: {} })),
}));

// Mocked as real classes: the route constructs these with `new`, and an
// arrow-function mock implementation is not a valid constructor.
vi.mock("@/core/api-connector/api-client", () => ({
  ApiClient: class {},
}));

vi.mock("@/core/api-connector/query-service", () => ({
  QueryService: class {
    async executeQuery(queryName: string) {
      execState.calls += 1;
      if (execState.delayMs > 0) {
        await new Promise((r) => setTimeout(r, execState.delayMs));
      }
      const data = (datasets as Map<string, CsvData>).get(queryName);
      if (!data) return {};
      return { csvResult: { headers: data.headers, rows: data.rows } };
    }
    async getQueries() {
      return Array.from((queryDefs as Map<string, QueryDefFixture>).values());
    }
  },
}));

import { dataApiRouter } from "../../routes/data-api";

// ---------------------------------------------------------------------------
// HTTP helpers — boot the router on an ephemeral port and fetch against it.
// ---------------------------------------------------------------------------
function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use("/api/data", dataApiRouter);
  return app;
}

interface JsonResponse<T = unknown> {
  status: number;
  body: T;
}

async function request<T = unknown>(
  app: express.Express,
  init: { method: "GET" | "POST"; path: string; body?: unknown },
): Promise<JsonResponse<T>> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${init.path}`, {
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

// Register a dataset under a fresh query name so the module-level CSV cache
// (keyed by group::query) never collides across tests.
let qCounter = 0;
function registerDataset(
  data: CsvData,
  columnConfig?: QueryDefFixture["columnConfig"],
): string {
  qCounter += 1;
  const name = `q_${qCounter}`;
  (datasets as Map<string, CsvData>).set(name, data);
  (queryDefs as Map<string, QueryDefFixture>).set(name, {
    name,
    type: "csv",
    columnConfig,
  });
  return name;
}

function viewsFile(groupId = "default"): string {
  return path.join(DATA_ROOT, "data-explorer-views", `${groupId}.json`);
}

async function seedViews(groupId: string, views: unknown[]): Promise<void> {
  const file = viewsFile(groupId);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(views, null, 2), "utf-8");
}

function savedView(overrides: Record<string, unknown> = {}) {
  const now = "2026-06-01T00:00:00.000Z";
  return {
    userId: "anonymous",
    groupId: "default",
    queryName: "sales",
    config: {
      id: "dash_default_sales",
      name: "Sales Explorer",
      source: "sales",
      groupId: "default",
      cards: [],
      layouts: [],
      globalFilters: {},
      createdAt: now,
      updatedAt: now,
    },
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const NUMERIC_DATASET: CsvData = {
  headers: ["region", "amount", "qty"],
  rows: [
    { region: "north", amount: 100, qty: 2 },
    { region: "south", amount: 200, qty: 4 },
    { region: "north", amount: 300, qty: 6 },
  ],
};

beforeEach(async () => {
  (datasets as Map<string, CsvData>).clear();
  (queryDefs as Map<string, QueryDefFixture>).clear();
  execState.calls = 0;
  execState.delayMs = 0;
  // Reset persisted view state between tests; DATA_ROOT itself is stable.
  await fsp.rm(path.join(DATA_ROOT, "data-explorer-views"), {
    recursive: true,
    force: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(async () => {
  await fsp.rm(DATA_ROOT, { recursive: true, force: true });
});

// ===========================================================================
// POST /api/data/views/generate
// ===========================================================================
describe("POST /api/data/views/generate", () => {
  it("rejects a request with no queryName (400)", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "POST",
      path: "/api/data/views/generate",
      body: { groupId: "default" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/queryName/);
  });

  it("returns 500 when the query yields no rows", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "POST",
      path: "/api/data/views/generate",
      body: { queryName: "missing-query", groupId: "default" },
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Failed to generate/);
  });

  it("mines a full card set (kpi + chart + summary + table + quality)", async () => {
    const queryName = registerDataset({
      headers: ["date", "revenue", "cost", "region"],
      rows: [
        { date: "2026-01-01", revenue: 100, cost: 40, region: "north" },
        { date: "2026-01-02", revenue: 200, cost: 80, region: "south" },
        { date: "2026-01-03", revenue: 300, cost: 120, region: "north" },
        { date: "2026-01-04", revenue: 400, cost: 160, region: "south" },
        { date: "2026-01-05", revenue: 500, cost: 200, region: "north" },
        { date: "2026-01-06", revenue: 600, cost: 240, region: "south" },
      ],
    });

    const app = buildApp();
    const res = await request<{
      generatedBy: string;
      queryName: string;
      groupId: string;
      recommendations: unknown[];
      config: {
        cards: Array<{
          type: string;
          kpiConfig?: { column: string; operation: string };
          chartConfig?: { valueColumns?: string[] };
        }>;
        layouts: unknown[];
      };
    }>(app, {
      method: "POST",
      path: "/api/data/views/generate",
      body: { queryName, groupId: "default" },
    });

    expect(res.status).toBe(200);
    expect(res.body.generatedBy).toBe("engine");
    expect(res.body.queryName).toBe(queryName);

    const cards = res.body.config.cards;
    const types = cards.map((c) => c.type);
    expect(types).toContain("kpi");
    expect(types).toContain("chart");
    expect(types).toContain("summary");
    expect(types).toContain("table");
    expect(types).toContain("quality");

    // layouts and recommendations must align 1:1 with cards.
    expect(res.body.config.layouts).toHaveLength(cards.length);
    expect(res.body.recommendations).toHaveLength(cards.length);

    // Two value columns (revenue, cost) → 2 value KPIs; under the 4-KPI
    // threshold the engine appends a "Total Records" count KPI → 3 total.
    const kpiCards = cards.filter((c) => c.type === "kpi");
    expect(kpiCards).toHaveLength(3);
    expect(kpiCards.some((c) => c.kpiConfig?.operation === "count")).toBe(true);

    const chart = cards.find((c) => c.type === "chart");
    expect(chart?.chartConfig?.valueColumns).toContain("revenue");
  });

  it("marks configured value columns with higher confidence than inferred ones", async () => {
    const queryName = registerDataset(
      {
        headers: ["revenue", "cost"],
        rows: [
          { revenue: 10, cost: 5 },
          { revenue: 20, cost: 9 },
          { revenue: 30, cost: 14 },
        ],
      },
      { valueColumns: ["revenue"] },
    );

    const app = buildApp();
    const res = await request<{
      config: {
        cards: Array<{
          type: string;
          kpiConfig?: { column: string };
          minedInsight?: { confidence: number; generatedBy: string };
        }>;
      };
    }>(app, {
      method: "POST",
      path: "/api/data/views/generate",
      body: { queryName },
    });

    expect(res.status).toBe(200);
    const kpis = res.body.config.cards.filter((c) => c.type === "kpi");
    const revenueKpi = kpis.find((c) => c.kpiConfig?.column === "revenue");
    const costKpi = kpis.find((c) => c.kpiConfig?.column === "cost");
    expect(revenueKpi?.minedInsight?.confidence).toBe(0.92);
    expect(revenueKpi?.minedInsight?.generatedBy).toBe("engine");
    expect(costKpi?.minedInsight?.confidence).toBe(0.78);
  });
});

// ===========================================================================
// GET /api/data/views/config
// ===========================================================================
describe("GET /api/data/views/config", () => {
  it("rejects a request with no queryName (400)", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "GET",
      path: "/api/data/views/config?groupId=default",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/queryName/);
  });

  it("returns 404 when no saved view exists", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "GET",
      path: "/api/data/views/config?queryName=sales&groupId=default",
    });
    expect(res.status).toBe(404);
  });

  it("returns the persisted view for the default (anonymous) user", async () => {
    await seedViews("default", [savedView()]);
    const app = buildApp();
    const res = await request<{
      userId: string;
      queryName: string;
      config: { name: string };
    }>(app, {
      method: "GET",
      path: "/api/data/views/config?queryName=sales&groupId=default",
    });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("anonymous");
    expect(res.body.queryName).toBe("sales");
    expect(res.body.config.name).toBe("Sales Explorer");
  });

  it("scopes lookup by userId — does not leak another user's view", async () => {
    await seedViews("default", [savedView({ userId: "alice" })]);
    const app = buildApp();

    const asBob = await request(app, {
      method: "GET",
      path: "/api/data/views/config?queryName=sales&groupId=default&userId=bob",
    });
    expect(asBob.status).toBe(404);

    const asAlice = await request<{ userId: string }>(app, {
      method: "GET",
      path: "/api/data/views/config?queryName=sales&groupId=default&userId=alice",
    });
    expect(asAlice.status).toBe(200);
    expect(asAlice.body.userId).toBe("alice");
  });
});

// ===========================================================================
// POST /api/data/views/config
// ===========================================================================
describe("POST /api/data/views/config", () => {
  const baseConfig = {
    id: "dash_default_sales",
    name: "Sales Explorer",
    source: "wrong-source",
    groupId: "default",
    cards: [],
    layouts: [],
    globalFilters: {},
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };

  it("rejects a request with no queryName (400)", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "POST",
      path: "/api/data/views/config",
      body: { groupId: "default", config: baseConfig },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/queryName/);
  });

  it("rejects a request with no config (400)", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "POST",
      path: "/api/data/views/config",
      body: { queryName: "sales", groupId: "default" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/config/);
  });

  it("creates a new view (version 1), persists it, and normalizes source/groupId", async () => {
    const app = buildApp();
    const res = await request<{
      version: number;
      userId: string;
      config: { source: string; groupId: string };
    }>(app, {
      method: "POST",
      path: "/api/data/views/config",
      body: { queryName: "sales", groupId: "default", config: baseConfig },
    });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.userId).toBe("anonymous");
    // Server overwrites source with the canonical queryName regardless of body.
    expect(res.body.config.source).toBe("sales");
    expect(res.body.config.groupId).toBe("default");

    const file = viewsFile("default");
    expect(existsSync(file)).toBe(true);
    const persisted = JSON.parse(await fsp.readFile(file, "utf-8"));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].queryName).toBe("sales");
  });

  it("upserts on a second save for the same user+query (version increments)", async () => {
    const app = buildApp();
    await request(app, {
      method: "POST",
      path: "/api/data/views/config",
      body: { queryName: "sales", groupId: "default", config: baseConfig },
    });
    const second = await request<{ version: number }>(app, {
      method: "POST",
      path: "/api/data/views/config",
      body: {
        queryName: "sales",
        groupId: "default",
        config: { ...baseConfig, name: "Renamed" },
      },
    });

    expect(second.status).toBe(200);
    expect(second.body.version).toBe(2);

    const persisted = JSON.parse(
      await fsp.readFile(viewsFile("default"), "utf-8"),
    );
    expect(persisted).toHaveLength(1); // upsert, not append
    expect(persisted[0].config.name).toBe("Renamed");
  });

  it("keeps distinct users' views side by side", async () => {
    const app = buildApp();
    await request(app, {
      method: "POST",
      path: "/api/data/views/config",
      body: {
        queryName: "sales",
        groupId: "default",
        userId: "alice",
        config: baseConfig,
      },
    });
    await request(app, {
      method: "POST",
      path: "/api/data/views/config",
      body: {
        queryName: "sales",
        groupId: "default",
        userId: "bob",
        config: baseConfig,
      },
    });

    const persisted = JSON.parse(
      await fsp.readFile(viewsFile("default"), "utf-8"),
    );
    expect(persisted).toHaveLength(2);
    expect(persisted.map((v: { userId: string }) => v.userId).sort()).toEqual([
      "alice",
      "bob",
    ]);
  });
});

// ===========================================================================
// POST /api/data/views/reset
// ===========================================================================
describe("POST /api/data/views/reset", () => {
  it("rejects a request with no queryName (400)", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "POST",
      path: "/api/data/views/reset",
      body: { groupId: "default" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/queryName/);
  });

  it("removes only the matching view and leaves others intact", async () => {
    await seedViews("default", [
      savedView({ queryName: "sales" }),
      savedView({ queryName: "expenses" }),
    ]);
    const app = buildApp();
    const res = await request<{ success: boolean }>(app, {
      method: "POST",
      path: "/api/data/views/reset",
      body: { queryName: "sales", groupId: "default" },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const persisted = JSON.parse(
      await fsp.readFile(viewsFile("default"), "utf-8"),
    );
    expect(persisted).toHaveLength(1);
    expect(persisted[0].queryName).toBe("expenses");
  });

  it("is idempotent when there is nothing to remove", async () => {
    const app = buildApp();
    const res = await request<{ success: boolean }>(app, {
      method: "POST",
      path: "/api/data/views/reset",
      body: { queryName: "never-saved", groupId: "default" },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ===========================================================================
// POST /api/data/aggregate
// ===========================================================================
describe("POST /api/data/aggregate", () => {
  it("rejects a request with no queryName (400)", async () => {
    const app = buildApp();
    const res = await request<{ error: string }>(app, {
      method: "POST",
      path: "/api/data/aggregate",
      body: { groupId: "default" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/queryName/);
  });

  it("surfaces the real failure reason in `detail` (not just a generic 500)", async () => {
    // No dataset registered → getCsvData throws. The UI proxies /api through
    // Next.js, which masks engine errors; the response must carry the cause so
    // a failed card-stats call is diagnosable from the browser network tab.
    const app = buildApp();
    const res = await request<{ error: string; detail: string }>(app, {
      method: "POST",
      path: "/api/data/aggregate",
      body: { queryName: "no-such-source", groupId: "default" },
    });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Aggregation failed/);
    expect(res.body.detail).toMatch(/did not return row data/);
  });

  it("computes count/sum/avg/min/max for every numeric column", async () => {
    const queryName = registerDataset(NUMERIC_DATASET);
    const app = buildApp();
    const res = await request<{
      totalRows: number;
      columns: Record<
        string,
        { count: number; sum: number; avg: number; min: number; max: number }
      >;
    }>(app, {
      method: "POST",
      path: "/api/data/aggregate",
      body: { queryName, groupId: "default" },
    });

    expect(res.status).toBe(200);
    expect(res.body.totalRows).toBe(3);
    expect(res.body.columns.amount).toEqual({
      count: 3,
      sum: 600,
      avg: 200,
      min: 100,
      max: 300,
    });
    expect(res.body.columns.qty).toEqual({
      count: 3,
      sum: 12,
      avg: 4,
      min: 2,
      max: 6,
    });
    // Non-numeric columns are excluded.
    expect(res.body.columns.region).toBeUndefined();
  });

  it("restricts output to the requested columns", async () => {
    const queryName = registerDataset(NUMERIC_DATASET);
    const app = buildApp();
    const res = await request<{ columns: Record<string, unknown> }>(app, {
      method: "POST",
      path: "/api/data/aggregate",
      body: { queryName, columns: ["amount"] },
    });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.columns)).toEqual(["amount"]);
  });

  it("applies row filters before aggregating", async () => {
    const queryName = registerDataset(NUMERIC_DATASET);
    const app = buildApp();
    const res = await request<{
      totalRows: number;
      columns: Record<string, { count: number; sum: number; avg: number }>;
    }>(app, {
      method: "POST",
      path: "/api/data/aggregate",
      body: { queryName, filters: { region: "north" } },
    });
    expect(res.status).toBe(200);
    expect(res.body.totalRows).toBe(2);
    expect(res.body.columns.amount.sum).toBe(400);
    expect(res.body.columns.amount.avg).toBe(200);
    expect(res.body.columns.qty.sum).toBe(8);
  });
});

// ===========================================================================
// getCsvData in-flight dedup (concurrency)
//
// On opening a source the UI fires ~4 requests at once (/schema, /query page,
// /query agg, /anomalies|/aggregate). Each calls getCsvData(). Without an
// in-flight guard, every one independently pulls the *whole* dataset from the
// source API — a 4–16× amplification that, on a 0.5-CPU / 1-GB engine, trips
// the 30s fetch timeout + retries + circuit breaker and fails the explorer.
// The fix: concurrent requests for the same source share ONE upstream fetch.
// ===========================================================================
describe("getCsvData in-flight dedup (concurrency)", () => {
  it("collapses concurrent same-source requests into ONE upstream fetch", async () => {
    const queryName = registerDataset(NUMERIC_DATASET);
    // Hold the upstream fetch open so all four requests overlap in-flight
    // (each passes the empty-cache check before the first one resolves).
    execState.delayMs = 100;
    const app = buildApp();

    const results = await Promise.all([
      request(app, {
        method: "GET",
        path: `/api/data/schema/${queryName}?groupId=default`,
      }),
      request(app, {
        method: "POST",
        path: "/api/data/query",
        body: { queryName, groupId: "default", page: 1, pageSize: 50 },
      }),
      request(app, {
        method: "POST",
        path: "/api/data/query",
        body: { queryName, groupId: "default", page: 1, pageSize: 1000 },
      }),
      request(app, {
        method: "POST",
        path: "/api/data/aggregate",
        body: { queryName, groupId: "default" },
      }),
    ]);

    // All four still succeed...
    for (const r of results) expect(r.status).toBe(200);
    // ...but the upstream source was hit exactly once, not four times.
    expect(execState.calls).toBe(1);
  });

  it("does not cache failures — a thrown fetch is retried on the next request", async () => {
    // No dataset registered → executeQuery returns {} → getCsvData throws.
    const app = buildApp();
    const first = await request(app, {
      method: "POST",
      path: "/api/data/aggregate",
      body: { queryName: "ghost", groupId: "default" },
    });
    expect(first.status).toBe(500);
    // The in-flight entry must be cleared on rejection so a later call re-tries
    // (and would succeed once data exists) rather than returning a stale error.
    (datasets as Map<string, CsvData>).set("ghost", NUMERIC_DATASET);
    const second = await request(app, {
      method: "POST",
      path: "/api/data/aggregate",
      body: { queryName: "ghost", groupId: "default" },
    });
    expect(second.status).toBe(200);
  });
});
