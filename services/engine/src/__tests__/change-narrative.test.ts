import { describe, it, expect } from "vitest";
import { buildChangeNarratives } from "../core/insights/change-narrative";
import type { QueryResultSnapshot } from "../core/anomaly/types";

describe("buildChangeNarratives", () => {
  const previous: QueryResultSnapshot = {
    queryName: "revenue_by_region",
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    numericSummary: {
      revenue: 1000,
      cost: 400,
      units: 50,
    },
  };

  const rowsWithMovement: Record<string, unknown>[] = [
    { region: "NAM", revenue: 700, cost: 200, units: 25 },
    { region: "EMEA", revenue: 500, cost: 250, units: 25 },
  ];

  it("returns nothing when no prior snapshot exists", () => {
    expect(buildChangeNarratives(rowsWithMovement, null, new Set())).toEqual(
      [],
    );
  });

  it("returns nothing when rows are empty", () => {
    expect(buildChangeNarratives([], previous, new Set())).toEqual([]);
  });

  it("emits a narrative when a column moves > 5%", () => {
    const out = buildChangeNarratives(rowsWithMovement, previous, new Set());
    // revenue 1000 → 1200 = +20%, cost 400 → 450 = +12.5%, units 50 → 50 = 0%
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(2);
    const revenue = out.find((n) => n.column === "revenue");
    expect(revenue).toBeDefined();
    expect(revenue?.text).toContain("revenue");
    expect(revenue?.text).toContain("up");
  });

  it("excludes columns already covered by anomalies", () => {
    const exclude = new Set(["revenue"]);
    const out = buildChangeNarratives(rowsWithMovement, previous, exclude);
    expect(out.find((n) => n.column === "revenue")).toBeUndefined();
  });

  it("skips columns that barely changed", () => {
    const tinyDeltaRows = [
      { region: "NAM", revenue: 1004, cost: 401, units: 50 },
    ];
    const out = buildChangeNarratives(tinyDeltaRows, previous, new Set());
    // revenue: +0.4%, cost: +0.25%, units: 0% — all below 5% floor
    expect(out).toEqual([]);
  });

  it("flags severity=warning when relative change ≥ 25%", () => {
    const bigDeltaRows = [{ revenue: 2000, cost: 400, units: 50 }];
    const out = buildChangeNarratives(bigDeltaRows, previous, new Set());
    const revenue = out.find((n) => n.column === "revenue");
    expect(revenue?.severity).toBe("warning");
  });

  it("uses 'down' direction for negative deltas", () => {
    const droppedRows = [{ revenue: 600, cost: 400, units: 50 }];
    const out = buildChangeNarratives(droppedRows, previous, new Set());
    const revenue = out.find((n) => n.column === "revenue");
    expect(revenue?.text).toContain("down");
  });

  it("caps narratives at 2 per response", () => {
    const fivePrev: QueryResultSnapshot = {
      queryName: "q",
      timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
      numericSummary: { a: 100, b: 100, c: 100, d: 100, e: 100 },
    };
    const fiveMoved = [{ a: 200, b: 200, c: 200, d: 200, e: 200 }];
    const out = buildChangeNarratives(fiveMoved, fivePrev, new Set());
    expect(out.length).toBe(2);
  });
});
