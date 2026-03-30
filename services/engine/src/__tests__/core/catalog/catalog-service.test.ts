import { CatalogService } from "../../../core/catalog/catalog-service";
import * as fs from "fs";
import * as path from "path";

describe("CatalogService", () => {
  let service: CatalogService;
  const testDataDir = path.join(__dirname, "__test-data__");

  beforeEach(() => {
    fs.mkdirSync(path.join(testDataDir, "learning", "default"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(testDataDir, "queries.json"),
      JSON.stringify([
        {
          name: "sales_report",
          description: "Monthly sales data",
          tags: ["finance", "sales"],
          owner: "jdoe",
          type: "api",
          columns: [
            { key: "region", label: "Region", type: "string" },
            { key: "amount", label: "Amount", type: "number" },
          ],
        },
        {
          name: "inventory_check",
          description: "Current inventory levels",
          tags: ["ops"],
          owner: "admin",
          type: "csv",
          columns: [{ key: "item", label: "Item", type: "string" }],
        },
      ]),
    );
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
  });

  afterEach(() => {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  test("listQueries returns all queries with usage signals", () => {
    const result = service.listQueries("default");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("sales_report");
    expect(result[0].usageCount7d).toBe(12);
    expect(result[0].columnCount).toBe(2);
    expect(result[0].tags).toEqual(["finance", "sales"]);
  });

  test("search filters by fuzzy text match", () => {
    const result = service.search("default", "sales");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("sales_report");
  });

  test("search matches column names", () => {
    const result = service.search("default", "region");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("sales_report");
  });

  test("getQueryDetail returns full metadata with related queries", () => {
    const detail = service.getQueryDetail("default", "sales_report");
    expect(detail).not.toBeNull();
    expect(detail!.description).toBe("Monthly sales data");
    expect(detail!.columns).toHaveLength(2);
    expect(detail!.relatedQueries).toContain("inventory_check");
  });

  test("getQueryDetail returns null for unknown query", () => {
    const detail = service.getQueryDetail("default", "nonexistent");
    expect(detail).toBeNull();
  });
});
