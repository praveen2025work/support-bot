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
});
