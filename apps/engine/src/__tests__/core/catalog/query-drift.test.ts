import { describe, it, expect } from "vitest";
import { auditQueryNameDrift } from "@/core/catalog/query-drift";

describe("auditQueryNameDrift", () => {
  it("classifies a corpus key with a matching registry entry as matched", () => {
    const result = auditQueryNameDrift({
      corpusQueryNames: ["budget_vs_actual"],
      registryQueryNames: ["budget_vs_actual", "pnl_lineage"],
    });
    expect(result.matched).toEqual(["budget_vs_actual"]);
    expect(result.orphans).toEqual([]);
  });

  it("matches case-insensitively", () => {
    const result = auditQueryNameDrift({
      corpusQueryNames: ["Budget_VS_Actual"],
      registryQueryNames: ["budget_vs_actual"],
    });
    expect(result.matched).toEqual(["budget_vs_actual"]);
    expect(result.orphans).toEqual([]);
  });

  it("flags corpus keys absent from the registry as orphans", () => {
    const result = auditQueryNameDrift({
      // corpus declares queries the default group's registry does not have
      corpusQueryNames: ["monthly_revenue", "sales_data", "budget_vs_actual"],
      registryQueryNames: ["budget_vs_actual", "pnl_lineage"],
    });
    expect(result.orphans).toEqual(["monthly_revenue", "sales_data"]);
    expect(result.matched).toEqual(["budget_vs_actual"]);
  });

  it("treats every corpus key as an orphan when the registry is empty", () => {
    const result = auditQueryNameDrift({
      corpusQueryNames: ["a", "b"],
      registryQueryNames: [],
    });
    expect(result.orphans).toEqual(["a", "b"]);
    expect(result.matched).toEqual([]);
  });

  it("returns empty results for an empty corpus", () => {
    const result = auditQueryNameDrift({
      corpusQueryNames: [],
      registryQueryNames: ["budget_vs_actual"],
    });
    expect(result.orphans).toEqual([]);
    expect(result.matched).toEqual([]);
  });

  it("de-duplicates and sorts deterministically", () => {
    const result = auditQueryNameDrift({
      corpusQueryNames: ["zeta", "alpha", "zeta", "ALPHA"],
      registryQueryNames: ["alpha"],
    });
    expect(result.matched).toEqual(["alpha"]);
    expect(result.orphans).toEqual(["zeta"]);
  });
});
