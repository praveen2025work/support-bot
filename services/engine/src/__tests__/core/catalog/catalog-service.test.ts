import { CatalogService } from "../../../core/catalog/catalog-service";
import * as fs from "fs";
import * as path from "path";
import { vi } from "vitest";

const mockQueries = [
  {
    id: "q1",
    name: "sales_report",
    description: "Monthly sales data",
    source: "finance",
    type: "api" as const,
    authType: "none" as const,
    filters: [{ key: "region", binding: "body" as const }],
    columnConfig: {
      valueColumns: ["amount"],
      labelColumns: ["region"],
    },
  },
  {
    id: "q2",
    name: "inventory_check",
    description: "Current inventory levels",
    source: "ops",
    type: "csv" as const,
    authType: "none" as const,
    filters: [],
    columnConfig: {
      labelColumns: ["item"],
    },
  },
];

describe("CatalogService", () => {
  let service: CatalogService;
  const testDataDir = path.join(__dirname, "__test-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDataDir, "learning", "default"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(testDataDir, "learning", "default", "signal-aggregates.json"),
      JSON.stringify({
        sales_report: { totalExecutions: 47, last7d: 12 },
        inventory_check: { totalExecutions: 5, last7d: 1 },
      }),
    );
    fs.writeFileSync(
      path.join(testDataDir, "learning", "default", "co-occurrence.json"),
      JSON.stringify({ sales_report: { inventory_check: 3 } }),
    );

    service = new CatalogService(testDataDir);
    // Mock the private fetchQueries method to avoid HTTP calls
    vi.spyOn(service as never, "fetchQueries" as never).mockResolvedValue(
      mockQueries as never,
    );
  });

  afterEach(() => {
    fs.rmSync(testDataDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  test("listQueries returns all queries with usage signals", async () => {
    const result = await service.listQueries("default");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("sales_report");
    expect(result[0].usageCount7d).toBe(12);
    expect(result[0].tags).toEqual(["finance"]);
  });

  test("search filters by fuzzy text match", async () => {
    const result = await service.search("default", "sales");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("sales_report");
  });

  test("getQueryDetail returns full metadata with related queries", async () => {
    const detail = await service.getQueryDetail("default", "sales_report");
    expect(detail).not.toBeNull();
    expect(detail!.description).toBe("Monthly sales data");
    expect(detail!.relatedQueries).toContain("inventory_check");
  });

  test("getQueryDetail returns null for unknown query", async () => {
    const detail = await service.getQueryDetail("default", "nonexistent");
    expect(detail).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────
  // Extended coverage: group scoping, case sensitivity, filter metadata
  // ──────────────────────────────────────────────────────────────────

  test("getQueryDetail attaches filters metadata from query.filters[].key", async () => {
    const detail = await service.getQueryDetail("default", "sales_report");
    expect(detail).not.toBeNull();
    // mockQueries[0] declares a body-bound 'region' filter — the catalog
    // entry should surface that key in detail.filters
    expect(detail!.filters).toEqual(["region"]);
  });

  test("listQueries surfaces filter keys from query metadata", async () => {
    const result = await service.listQueries("default");
    const sales = result.find((q) => q.name === "sales_report")!;
    const inventory = result.find((q) => q.name === "inventory_check")!;
    expect(sales.filters).toEqual(["region"]);
    expect(inventory.filters).toEqual([]);
  });

  test("getQueryDetail is case-sensitive on queryName (current contract)", async () => {
    // Documents present behavior — queryName lookup uses strict equality
    // (catalog-service.ts:91). Callers must pass the exact name.
    const wrongCase = await service.getQueryDetail("default", "Sales_Report");
    expect(wrongCase).toBeNull();
  });

  test("group-scoped query filtering: sources passed through to fetchQueries", async () => {
    // The CatalogService delegates source filtering to QueryService.getQueries
    // by forwarding the `sources` argument into fetchQueries. We assert that
    // calling search/listQueries with sources causes fetchQueries to receive
    // them — the actual filter behavior is owned by QueryService and tested
    // in query-execution.test.ts.
    // Replace the existing fetchQueries spy with one whose implementation
    // we can introspect directly. (vi.spyOn().mockResolvedValue typing
    // resolves to `never` here because the method is private; the call
    // signature still works at runtime.)
    vi.restoreAllMocks();
    const spy = vi
      .spyOn(
        service as unknown as { fetchQueries: () => Promise<unknown[]> },
        "fetchQueries",
      )
      .mockImplementation(async () => mockQueries);

    await service.listQueries("default", "http://api.test", ["finance"]);
    expect(spy).toHaveBeenCalledWith("http://api.test", ["finance"]);

    await service.search("default", "sales", "http://api.test", ["ops"]);
    expect(spy).toHaveBeenLastCalledWith("http://api.test", ["ops"]);
  });

  test("queries from other groups (different signal aggregates file) do not leak usage stats across groups", async () => {
    // Write a separate group dir with different signals, then ensure
    // listQueries('finance') returns zero counts for sales_report (since
    // that group has no signals file written).
    const result = await service.listQueries("finance");
    const sales = result.find((q) => q.name === "sales_report")!;
    // 'finance' group has no signal aggregates file — usage counts collapse to 0
    expect(sales.usageCount7d).toBe(0);
    expect(sales.usageCountTotal).toBe(0);
  });
});
