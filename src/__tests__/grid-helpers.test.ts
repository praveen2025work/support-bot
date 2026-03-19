import {
  isNumericColumn,
  multiColumnSort,
  clientFilter,
  groupRows,
  computeGroupSummary,
  applyConditionalFormat,
  reorderColumns,
  getEffectiveColumns,
  type SortEntry,
  type ClientFilter as ClientFilterType,
} from "@/components/gridboard/grid-helpers";
import type { ConditionalFormatRule } from "@/types/dashboard";

// ── isNumericColumn ─────────────────────────────────────────────────

describe("isNumericColumn", () => {
  it("returns true when >= 70% of non-empty values are numeric", () => {
    const data = [{ a: 1 }, { a: 2 }, { a: "3" }, { a: "x" }];
    expect(isNumericColumn(data, "a")).toBe(true); // 3/4 = 75%
  });

  it("returns false when < 70% are numeric", () => {
    const data = [{ a: "foo" }, { a: "bar" }, { a: 1 }];
    expect(isNumericColumn(data, "a")).toBe(false); // 1/3 = 33%
  });

  it("returns false for empty data", () => {
    expect(isNumericColumn([], "a")).toBe(false);
  });

  it("skips null/empty values when calculating ratio", () => {
    const data = [{ a: 1 }, { a: null }, { a: "" }, { a: 2 }];
    expect(isNumericColumn(data, "a")).toBe(true); // 2/2 = 100%
  });

  it("treats numeric strings as numeric", () => {
    const data = [{ a: "100" }, { a: "200.5" }, { a: "-3" }];
    expect(isNumericColumn(data, "a")).toBe(true);
  });
});

// ── multiColumnSort ─────────────────────────────────────────────────

describe("multiColumnSort", () => {
  const data = [
    { name: "Charlie", age: 30 },
    { name: "Alice", age: 25 },
    { name: "Bob", age: 30 },
    { name: "Alice", age: 20 },
  ];

  it("sorts by a single column ascending", () => {
    const sorted = multiColumnSort(data, [
      { column: "name", direction: "asc" },
    ]);
    expect(sorted.map((r) => r.name)).toEqual([
      "Alice",
      "Alice",
      "Bob",
      "Charlie",
    ]);
  });

  it("sorts by a single column descending", () => {
    const sorted = multiColumnSort(data, [
      { column: "name", direction: "desc" },
    ]);
    expect(sorted.map((r) => r.name)).toEqual([
      "Charlie",
      "Bob",
      "Alice",
      "Alice",
    ]);
  });

  it("sorts by multiple columns", () => {
    const config: SortEntry[] = [
      { column: "name", direction: "asc" },
      { column: "age", direction: "asc" },
    ];
    const sorted = multiColumnSort(data, config, new Set(["age"]));
    expect(sorted.map((r) => ({ name: r.name, age: r.age }))).toEqual([
      { name: "Alice", age: 20 },
      { name: "Alice", age: 25 },
      { name: "Bob", age: 30 },
      { name: "Charlie", age: 30 },
    ]);
  });

  it("returns original array when sort config is empty", () => {
    const sorted = multiColumnSort(data, []);
    expect(sorted).toBe(data);
  });

  it("sorts nulls last regardless of direction", () => {
    const withNulls = [
      { name: null, age: 10 },
      { name: "Alice", age: 20 },
      { name: null, age: 5 },
    ];
    const sorted = multiColumnSort(withNulls, [
      { column: "name", direction: "asc" },
    ]);
    expect(sorted[0].name).toBe("Alice");
  });

  it("does not mutate the input array", () => {
    const original = [...data];
    multiColumnSort(data, [{ column: "name", direction: "asc" }]);
    expect(data).toEqual(original);
  });
});

// ── clientFilter ────────────────────────────────────────────────────

describe("clientFilter", () => {
  const data = [
    { name: "Alice", age: 25, city: "NYC" },
    { name: "Bob", age: 30, city: "LA" },
    { name: "Charlie", age: 35, city: "NYC" },
    { name: "Diana", age: 28, city: "" },
  ];

  it("returns all rows when no filters are active", () => {
    expect(clientFilter(data, {})).toBe(data);
  });

  it('filters with "contains" operator', () => {
    const filters: Record<string, ClientFilterType> = {
      name: { operator: "contains", value: "li" },
    };
    const result = clientFilter(data, filters);
    expect(result.map((r) => r.name)).toEqual(["Alice", "Charlie"]);
  });

  it('filters with "equals" operator (case-insensitive)', () => {
    const filters: Record<string, ClientFilterType> = {
      city: { operator: "equals", value: "nyc" },
    };
    const result = clientFilter(data, filters);
    expect(result).toHaveLength(2);
  });

  it("filters with numeric operators", () => {
    const filters: Record<string, ClientFilterType> = {
      age: { operator: "gt", value: "28" },
    };
    const result = clientFilter(data, filters);
    expect(result.map((r) => r.name)).toEqual(["Bob", "Charlie"]);
  });

  it('filters with "between" operator', () => {
    const filters: Record<string, ClientFilterType> = {
      age: { operator: "between", value: "26", value2: "31" },
    };
    const result = clientFilter(data, filters);
    expect(result.map((r) => r.name)).toEqual(["Bob", "Diana"]);
  });

  it('filters with "empty" operator', () => {
    const filters: Record<string, ClientFilterType> = {
      city: { operator: "empty", value: "" },
    };
    const result = clientFilter(data, filters);
    expect(result.map((r) => r.name)).toEqual(["Diana"]);
  });

  it('filters with "notEmpty" operator', () => {
    const filters: Record<string, ClientFilterType> = {
      city: { operator: "notEmpty", value: "" },
    };
    const result = clientFilter(data, filters);
    expect(result).toHaveLength(3);
  });

  it("applies multiple filters with AND logic", () => {
    const filters: Record<string, ClientFilterType> = {
      city: { operator: "equals", value: "NYC" },
      age: { operator: "gte", value: "30" },
    };
    const result = clientFilter(data, filters);
    expect(result.map((r) => r.name)).toEqual(["Charlie"]);
  });

  it("ignores filters with empty value (except empty/notEmpty)", () => {
    const filters: Record<string, ClientFilterType> = {
      name: { operator: "contains", value: "" },
    };
    expect(clientFilter(data, filters)).toBe(data);
  });
});

// ── groupRows ───────────────────────────────────────────────────────

describe("groupRows", () => {
  const data = [
    { dept: "Eng", name: "Alice" },
    { dept: "Sales", name: "Bob" },
    { dept: "Eng", name: "Charlie" },
    { dept: "Sales", name: "Diana" },
    { dept: "Eng", name: "Eve" },
  ];

  it("groups by column value", () => {
    const groups = groupRows(data, "dept");
    expect(groups).toHaveLength(2);
    expect(groups[0].groupValue).toBe("Eng");
    expect(groups[0].rows).toHaveLength(3);
    expect(groups[1].groupValue).toBe("Sales");
    expect(groups[1].rows).toHaveLength(2);
  });

  it("preserves original indices", () => {
    const groups = groupRows(data, "dept");
    expect(groups[0].originalIndices).toEqual([0, 2, 4]);
    expect(groups[1].originalIndices).toEqual([1, 3]);
  });

  it('handles null values as "(empty)"', () => {
    const withNull = [{ dept: null, name: "Z" }, ...data];
    const groups = groupRows(withNull, "dept");
    const emptyGroup = groups.find((g) => g.groupValue === "(empty)");
    expect(emptyGroup).toBeDefined();
    expect(emptyGroup!.rows).toHaveLength(1);
  });
});

// ── computeGroupSummary ─────────────────────────────────────────────

describe("computeGroupSummary", () => {
  const rows = [
    { revenue: 100, cost: 50, name: "A" },
    { revenue: 200, cost: 75, name: "B" },
    { revenue: 300, cost: 100, name: "C" },
  ];

  it("sums numeric columns", () => {
    const sums = computeGroupSummary(rows, new Set(["revenue", "cost"]));
    expect(sums.revenue).toBe(600);
    expect(sums.cost).toBe(225);
  });

  it("skips NaN values", () => {
    const withNaN = [
      ...rows,
      { revenue: "n/a", cost: null, name: "D" },
    ] as Record<string, unknown>[];
    const sums = computeGroupSummary(withNaN, new Set(["revenue", "cost"]));
    expect(sums.revenue).toBe(600);
    expect(sums.cost).toBe(225);
  });
});

// ── applyConditionalFormat ──────────────────────────────────────────

describe("applyConditionalFormat", () => {
  // matchFilter accepts broader operator strings than ConditionalFormatRule strictly types
  const rules = [
    {
      id: "1",
      column: "status",
      operator: "equals",
      value: "critical",
      style: { bg: "#fee2e2", color: "#dc2626", bold: true },
    },
    {
      id: "2",
      column: "status",
      operator: "equals",
      value: "ok",
      style: { bg: "#dcfce7", color: "#16a34a" },
    },
    {
      id: "3",
      column: "count",
      operator: "gt",
      value: "100",
      style: { bg: "#fef3c7" },
    },
  ] as ConditionalFormatRule[];

  it("returns matching style for exact match", () => {
    const style = applyConditionalFormat("critical", "status", rules);
    expect(style).toEqual({
      backgroundColor: "#fee2e2",
      color: "#dc2626",
      fontWeight: "bold",
    });
  });

  it("returns null when no rules match", () => {
    const style = applyConditionalFormat("warning", "status", rules);
    expect(style).toBeNull();
  });

  it("returns null when column has no rules", () => {
    const style = applyConditionalFormat("anything", "other_column", rules);
    expect(style).toBeNull();
  });

  it("returns first matching rule", () => {
    const style = applyConditionalFormat("ok", "status", rules);
    expect(style).toEqual({ backgroundColor: "#dcfce7", color: "#16a34a" });
  });

  it("works with numeric operators", () => {
    const style = applyConditionalFormat(150, "count", rules);
    expect(style).toEqual({ backgroundColor: "#fef3c7" });
  });
});

// ── reorderColumns ──────────────────────────────────────────────────

describe("reorderColumns", () => {
  it("moves a column from one position to another", () => {
    const cols = ["a", "b", "c", "d"];
    expect(reorderColumns(cols, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("does not mutate the original array", () => {
    const cols = ["a", "b", "c"];
    reorderColumns(cols, 0, 2);
    expect(cols).toEqual(["a", "b", "c"]);
  });
});

// ── getEffectiveColumns ─────────────────────────────────────────────

describe("getEffectiveColumns", () => {
  it("filters hidden columns and puts pinned first", () => {
    const order = ["a", "b", "c", "d", "e"];
    const hidden = new Set(["c"]);
    const pinned = ["d"];
    expect(getEffectiveColumns(order, hidden, pinned)).toEqual([
      "d",
      "a",
      "b",
      "e",
    ]);
  });

  it("returns all visible columns when none are pinned or hidden", () => {
    const order = ["x", "y", "z"];
    expect(getEffectiveColumns(order, new Set(), [])).toEqual(["x", "y", "z"]);
  });

  it("ignores pinned columns that are hidden", () => {
    const order = ["a", "b", "c"];
    const hidden = new Set(["b"]);
    const pinned = ["b"];
    expect(getEffectiveColumns(order, hidden, pinned)).toEqual(["a", "c"]);
  });
});
