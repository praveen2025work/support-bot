import { describe, it, expect } from "vitest";
import { analyzeRootCause } from "../core/ml/root-cause";

describe("analyzeRootCause", () => {
  const headers = ["region", "product", "revenue"];
  const rows: Record<string, unknown>[] = [
    { region: "NAM", product: "A", revenue: 100 },
    { region: "NAM", product: "B", revenue: 100 },
    { region: "EMEA", product: "A", revenue: 800 },
    { region: "EMEA", product: "B", revenue: 100 },
    { region: "APAC", product: "A", revenue: 50 },
    { region: "APAC", product: "B", revenue: 50 },
  ];

  it("returns null on empty data", () => {
    expect(analyzeRootCause([], headers)).toBeNull();
    expect(analyzeRootCause(rows, [])).toBeNull();
  });

  it("auto-picks the highest-magnitude numeric column as the metric", () => {
    const r = analyzeRootCause(rows, headers);
    expect(r).not.toBeNull();
    expect(r!.metric).toBe("revenue");
  });

  it("ranks contributors by share of total in concentration mode", () => {
    const r = analyzeRootCause(rows, headers)!;
    expect(r.kind).toBe("concentration");
    expect(r.total).toBe(1200);
    // Product A total = 950 (79%) — beats EMEA region total = 900 (75%).
    // The ranking is over (dimension, value) pairs across ALL dimensions.
    expect(r.contributors[0].dimension).toBe("product");
    expect(r.contributors[0].value).toBe("A");
    expect(r.contributors[0].contribution).toBe(950);
    expect(r.contributors[0].shareOfTotal).toBeCloseTo(0.7917, 3);
    // EMEA still appears in the ranked list, just not at #1
    expect(r.contributors.some((c) => c.value === "EMEA")).toBe(true);
  });

  it("headline names the top contributor", () => {
    const r = analyzeRootCause(rows, headers)!;
    // Top contributor is Product A at 79% — see test above for why
    expect(r.headline).toContain("A");
    expect(r.headline).toContain("revenue");
  });

  it("honors an explicit metric override", () => {
    // Add a second numeric column so auto-pick wouldn't choose 'units'
    const rowsWithUnits = rows.map((r, i) => ({ ...r, units: i }));
    const withUnitsHeaders = [...headers, "units"];
    const r = analyzeRootCause(rowsWithUnits, withUnitsHeaders, {
      metric: "units",
    })!;
    expect(r.metric).toBe("units");
  });

  it("skips dimensions with cardinality > 50", () => {
    const wideRows = Array.from({ length: 100 }, (_, i) => ({
      region: `R${i}`, // 100 distinct → too high
      product: i % 2 === 0 ? "A" : "B",
      revenue: 10,
    }));
    const r = analyzeRootCause(wideRows, ["region", "product", "revenue"])!;
    // Only 'product' qualifies as a dimension
    const dims = new Set(r.contributors.map((c) => c.dimension));
    expect(dims.has("region")).toBe(false);
    expect(dims.has("product")).toBe(true);
  });

  it("switches to change mode when a baseline is provided", () => {
    const r = analyzeRootCause(rows, headers, {
      metric: "revenue",
      baseline: { metric: "revenue", total: 600 },
    })!;
    expect(r.kind).toBe("change");
    expect(r.baselineTotal).toBe(600);
    expect(r.headline).toMatch(/rose|fell/);
    // Each contributor in change mode carries a delta + relativeDelta
    expect(r.contributors[0].delta).toBeDefined();
    expect(r.contributors[0].relativeDelta).toBeDefined();
  });

  it("caps contributors at 5", () => {
    // Build 10 distinct regions
    const wide = Array.from({ length: 10 }, (_, i) => ({
      region: `R${i}`,
      revenue: 100,
    }));
    const r = analyzeRootCause(wide, ["region", "revenue"])!;
    expect(r.contributors.length).toBeLessThanOrEqual(5);
  });

  it("returns null when total is effectively zero", () => {
    const zeroes = [{ region: "X", revenue: 0 }];
    expect(analyzeRootCause(zeroes, ["region", "revenue"])).toBeNull();
  });

  it("returns null when no qualifying dimensions exist", () => {
    // All-numeric dataset (no string dims)
    const allNumeric = [
      { a: 1, b: 100 },
      { a: 2, b: 200 },
    ];
    expect(analyzeRootCause(allNumeric, ["a", "b"])).toBeNull();
  });
});
