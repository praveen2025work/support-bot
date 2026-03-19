import type { ConditionalFormatRule } from "@/types/dashboard";

// ── Types ──────────────────────────────────────────────────────────

export interface SortEntry {
  column: string;
  direction: "asc" | "desc";
}

export interface ClientFilter {
  operator: string; // 'contains' | 'equals' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'notEmpty' | 'empty'
  value: string;
  value2?: string; // for 'between'
}

export interface RowGroup {
  groupValue: string;
  rows: Record<string, unknown>[];
  originalIndices: number[];
}

// ── Helpers ────────────────────────────────────────────────────────

/** Detect if a column is numeric (>= 70% parseable numbers) */
export function isNumericColumn(
  data: Record<string, unknown>[],
  col: string,
): boolean {
  if (data.length === 0) return false;
  let numCount = 0;
  let total = 0;
  for (const row of data) {
    const v = row[col];
    if (v == null || v === "") continue;
    total++;
    if (
      typeof v === "number" ||
      (typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "")
    ) {
      numCount++;
    }
  }
  return total > 0 && numCount / total >= 0.7;
}

/** Parse value as number, returns NaN for non-numeric */
function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return NaN;
}

// ── Multi-column Sort ──────────────────────────────────────────────

/**
 * Sorts rows by multiple columns in priority order.
 * Nulls are always sorted last regardless of direction.
 *
 * @param rows - The data rows to sort
 * @param sortConfig - Ordered list of { column, direction } entries
 * @param numericCols - Optional set of column names known to be numeric
 * @returns A new sorted array (does not mutate the input)
 */
export function multiColumnSort(
  rows: Record<string, unknown>[],
  sortConfig: SortEntry[],
  numericCols?: Set<string>,
): Record<string, unknown>[] {
  if (sortConfig.length === 0) return rows;

  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const { column, direction } of sortConfig) {
      const aVal = a[column];
      const bVal = b[column];
      const dir = direction === "asc" ? 1 : -1;

      // Nulls always last
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const isNum = numericCols ? numericCols.has(column) : false;
      if (isNum) {
        const diff = toNum(aVal) - toNum(bVal);
        if (diff !== 0) return diff * dir;
      } else {
        const cmp = String(aVal).localeCompare(String(bVal), undefined, {
          sensitivity: "base",
        });
        if (cmp !== 0) return cmp * dir;
      }
    }
    return 0;
  });

  return sorted;
}

// ── Client-side Filtering ──────────────────────────────────────────

/**
 * Tests whether a single cell value matches a filter condition.
 * Supports: contains, equals, notEquals, startsWith, endsWith,
 * gt, gte, lt, lte, between, empty, notEmpty.
 */
function matchFilter(value: unknown, filter: ClientFilter): boolean {
  const { operator, value: filterVal, value2 } = filter;

  if (operator === "empty") return value == null || String(value).trim() === "";
  if (operator === "notEmpty")
    return value != null && String(value).trim() !== "";

  const strVal = String(value ?? "").toLowerCase();
  const filterStr = filterVal.toLowerCase();

  switch (operator) {
    case "contains":
      return strVal.includes(filterStr);
    case "equals":
      return strVal === filterStr;
    case "notEquals":
      return strVal !== filterStr;
    case "startsWith":
      return strVal.startsWith(filterStr);
    case "endsWith":
      return strVal.endsWith(filterStr);
    case "gt":
      return toNum(value) > toNum(filterVal);
    case "gte":
      return toNum(value) >= toNum(filterVal);
    case "lt":
      return toNum(value) < toNum(filterVal);
    case "lte":
      return toNum(value) <= toNum(filterVal);
    case "between": {
      const n = toNum(value);
      return n >= toNum(filterVal) && n <= toNum(value2 ?? filterVal);
    }
    default:
      return strVal.includes(filterStr);
  }
}

/**
 * Filters rows by a set of column-level filter conditions.
 * Only rows matching ALL active filters are returned (AND logic).
 */
export function clientFilter(
  rows: Record<string, unknown>[],
  filters: Record<string, ClientFilter>,
): Record<string, unknown>[] {
  const activeFilters = Object.entries(filters).filter(
    ([, f]) =>
      f.value.trim() !== "" ||
      f.operator === "empty" ||
      f.operator === "notEmpty",
  );
  if (activeFilters.length === 0) return rows;

  return rows.filter((row) =>
    activeFilters.every(([col, filter]) => matchFilter(row[col], filter)),
  );
}

// ── Row Grouping ───────────────────────────────────────────────────

/**
 * Groups rows by distinct values in a column.
 * Each group contains the matching rows and their original indices.
 */
export function groupRows(
  rows: Record<string, unknown>[],
  groupByColumn: string,
): RowGroup[] {
  const groupMap = new Map<
    string,
    { rows: Record<string, unknown>[]; indices: number[] }
  >();

  rows.forEach((row, idx) => {
    const key = String(row[groupByColumn] ?? "(empty)");
    if (!groupMap.has(key)) {
      groupMap.set(key, { rows: [], indices: [] });
    }
    const group = groupMap.get(key)!;
    group.rows.push(row);
    group.indices.push(idx);
  });

  return Array.from(groupMap.entries()).map(
    ([groupValue, { rows: groupRows, indices }]) => ({
      groupValue,
      rows: groupRows,
      originalIndices: indices,
    }),
  );
}

// ── Group Summary ──────────────────────────────────────────────────

/**
 * Computes the sum of each numeric column across a set of rows.
 * Non-numeric values are silently skipped.
 */
export function computeGroupSummary(
  rows: Record<string, unknown>[],
  numericCols: Set<string>,
): Record<string, number> {
  const sums: Record<string, number> = {};
  numericCols.forEach((col) => {
    let sum = 0;
    for (const row of rows) {
      const n = toNum(row[col]);
      if (!isNaN(n)) sum += n;
    }
    sums[col] = sum;
  });
  return sums;
}

// ── Conditional Formatting ─────────────────────────────────────────

/**
 * Evaluates conditional formatting rules for a cell and returns
 * the first matching rule's CSS styles, or null if no rule matches.
 */
export function applyConditionalFormat(
  value: unknown,
  column: string,
  rules: ConditionalFormatRule[],
): React.CSSProperties | null {
  const matchingRules = rules.filter((r) => r.column === column);
  if (matchingRules.length === 0) return null;

  for (const rule of matchingRules) {
    const matched = matchFilter(value, {
      operator: rule.operator,
      value: rule.value,
      value2: rule.value2,
    });
    if (matched) {
      const style: React.CSSProperties = {};
      if (rule.style.bg) style.backgroundColor = rule.style.bg;
      if (rule.style.color) style.color = rule.style.color;
      if (rule.style.bold) style.fontWeight = "bold";
      return style;
    }
  }
  return null;
}

// ── Column utilities ───────────────────────────────────────────────

/** Reorder columns by moving `from` to `to` position */
export function reorderColumns(
  columns: string[],
  from: number,
  to: number,
): string[] {
  const result = [...columns];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}

/** Get effective columns (ordered, visible, with pinned first) */
export function getEffectiveColumns(
  columnOrder: string[],
  hiddenColumns: Set<string>,
  pinnedColumns: string[],
): string[] {
  const visible = columnOrder.filter((c) => !hiddenColumns.has(c));
  const pinned = pinnedColumns.filter((c) => visible.includes(c));
  const unpinned = visible.filter((c) => !pinnedColumns.includes(c));
  return [...pinned, ...unpinned];
}

// ── Filter operators list ──────────────────────────────────────────

export const FILTER_OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not equals" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "between", label: "Between" },
  { value: "empty", label: "Is empty" },
  { value: "notEmpty", label: "Not empty" },
] as const;
