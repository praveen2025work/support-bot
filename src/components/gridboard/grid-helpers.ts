import type { ConditionalFormatRule, ValidationRule } from "@/types/dashboard";

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

// ── Constants ─────────────────────────────────────────────────────

const NUMERIC_DETECTION_THRESHOLD = 0.7;

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
  return total > 0 && numCount / total >= NUMERIC_DETECTION_THRESHOLD;
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

// ── Pivot Table ─────────────────────────────────────────────────────

export interface PivotResult {
  rowValues: string[];
  colValues: string[];
  cells: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

export function pivotData(
  rows: Record<string, unknown>[],
  rowField: string,
  colField: string,
  valueField: string,
  aggregation: "sum" | "avg" | "count" | "min" | "max" = "sum",
): PivotResult {
  const cells: Record<string, Record<string, number[]>> = {};
  const colSet = new Set<string>();

  for (const row of rows) {
    const rv = String(row[rowField] ?? "(empty)");
    const cv = String(row[colField] ?? "(empty)");
    const val = toNum(row[valueField]);
    colSet.add(cv);
    if (!cells[rv]) cells[rv] = {};
    if (!cells[rv][cv]) cells[rv][cv] = [];
    if (!isNaN(val)) cells[rv][cv].push(val);
  }

  const rowValues = Object.keys(cells).sort();
  const colValues = Array.from(colSet).sort();

  const aggregate = (vals: number[]): number => {
    if (vals.length === 0) return 0;
    switch (aggregation) {
      case "sum":
        return vals.reduce((a, b) => a + b, 0);
      case "avg":
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      case "count":
        return vals.length;
      case "min":
        return Math.min(...vals);
      case "max":
        return Math.max(...vals);
    }
  };

  const aggregated: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const rv of rowValues) {
    aggregated[rv] = {};
    let rowSum = 0;
    for (const cv of colValues) {
      const val = aggregate(cells[rv]?.[cv] || []);
      aggregated[rv][cv] = val;
      rowSum += val;
      colTotals[cv] = (colTotals[cv] || 0) + val;
    }
    rowTotals[rv] = rowSum;
    grandTotal += rowSum;
  }

  return {
    rowValues,
    colValues,
    cells: aggregated,
    rowTotals,
    colTotals,
    grandTotal,
  };
}

// ── Multi-field Pivot ──────────────────────────────────────────────

export interface MultiPivotConfig {
  rowFields: string[];
  colFields: string[];
  valueFields: string[];
  aggregation: "sum" | "avg" | "count" | "min" | "max";
}

export interface MultiPivotResult {
  /** Each row is a flat object with row-field values + pivoted value columns */
  rows: Record<string, unknown>[];
  /** The column headers generated from unique col-field combinations */
  pivotColKeys: string[];
  /** Totals row */
  totalsRow: Record<string, unknown>;
}

/**
 * Multi-field pivot: supports multiple row fields, col fields, and value fields.
 * Generates a flat table suitable for AG Grid rendering.
 */
export function multiPivotData(
  data: Record<string, unknown>[],
  config: MultiPivotConfig,
): MultiPivotResult {
  const { rowFields, colFields, valueFields, aggregation } = config;

  // Build composite keys
  const makeKey = (row: Record<string, unknown>, fields: string[]): string =>
    fields.map((f) => String(row[f] ?? "(empty)")).join(" | ");

  // Collect all values grouped by rowKey → colKey → valueField → number[]
  const bucket: Record<string, Record<string, Record<string, number[]>>> = {};
  const colKeySet = new Set<string>();

  for (const row of data) {
    const rk = makeKey(row, rowFields);
    const ck = makeKey(row, colFields);
    colKeySet.add(ck);

    if (!bucket[rk]) bucket[rk] = {};
    if (!bucket[rk][ck]) bucket[rk][ck] = {};

    for (const vf of valueFields) {
      if (!bucket[rk][ck][vf]) bucket[rk][ck][vf] = [];
      const val = toNum(row[vf]);
      if (!isNaN(val)) bucket[rk][ck][vf].push(val);
    }
  }

  const agg = (vals: number[]): number => {
    if (vals.length === 0) return 0;
    switch (aggregation) {
      case "sum":
        return vals.reduce((a, b) => a + b, 0);
      case "avg":
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      case "count":
        return vals.length;
      case "min":
        return Math.min(...vals);
      case "max":
        return Math.max(...vals);
    }
  };

  const rowKeys = Object.keys(bucket).sort();
  const colKeys = Array.from(colKeySet).sort();

  // Build pivot column names: "colKey :: valueField" (skip valueField suffix if only 1)
  const singleValue = valueFields.length === 1;
  const pivotColKeys: string[] = [];
  for (const ck of colKeys) {
    for (const vf of valueFields) {
      pivotColKeys.push(singleValue ? ck : `${ck} :: ${vf}`);
    }
  }

  // Build flat rows
  const rows: Record<string, unknown>[] = rowKeys.map((rk) => {
    const row: Record<string, unknown> = {};
    // Split composite row key back into individual fields
    const parts = rk.split(" | ");
    rowFields.forEach((f, i) => {
      row[f] = parts[i] ?? "";
    });

    let rowTotal = 0;
    for (const ck of colKeys) {
      for (const vf of valueFields) {
        const colName = singleValue ? ck : `${ck} :: ${vf}`;
        const val = agg(bucket[rk]?.[ck]?.[vf] || []);
        row[colName] = val;
        rowTotal += val;
      }
    }
    row.__total = rowTotal;
    return row;
  });

  // Build totals row
  const totalsRow: Record<string, unknown> = {};
  rowFields.forEach((f, i) => {
    totalsRow[f] = i === 0 ? "Total" : "";
  });
  let grandTotal = 0;
  for (const ck of colKeys) {
    for (const vf of valueFields) {
      const colName = singleValue ? ck : `${ck} :: ${vf}`;
      let colSum = 0;
      for (const rk of rowKeys) {
        colSum += agg(bucket[rk]?.[ck]?.[vf] || []);
      }
      totalsRow[colName] = colSum;
      grandTotal += colSum;
    }
  }
  totalsRow.__total = grandTotal;

  return { rows, pivotColKeys, totalsRow };
}

// ── Formula Columns ──────────────────────────────────────────────────

/**
 * Evaluates a safe math expression with column references like {column_name}.
 * Supports: + - * / % ( ) and common Math functions.
 * Does NOT use eval() — uses a simple tokenizer/parser.
 */
export function evaluateFormula(
  expression: string,
  row: Record<string, unknown>,
): number | string {
  try {
    // Replace {col} tokens with values
    const expr = expression.replace(/\{([^}]+)\}/g, (_, col) => {
      const val = row[col.trim()];
      const n = toNum(val);
      return isNaN(n) ? "0" : String(n);
    });

    // Validate: only allow numbers, operators, parens, dots, spaces
    if (!/^[\d\s+\-*/%.()]+$/.test(expr)) {
      return "#ERR";
    }

    // Safe evaluation using Function constructor (no access to scope)
    const result = new Function(`"use strict"; return (${expr});`)();
    if (typeof result !== "number" || !isFinite(result)) return "#ERR";
    return Math.round(result * 100) / 100;
  } catch {
    return "#ERR";
  }
}

// ── Column Aggregation ───────────────────────────────────────────────

export type AggregationType = "sum" | "avg" | "count" | "min" | "max";

export function computeColumnAggregation(
  rows: Record<string, unknown>[],
  column: string,
  aggregation: AggregationType,
): number | null {
  const values: number[] = [];
  for (const row of rows) {
    const n = toNum(row[column]);
    if (!isNaN(n)) values.push(n);
  }
  if (values.length === 0) return null;

  switch (aggregation) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "count":
      return values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

// ── Data Validation ───────────────────────────────────────────────

export interface ValidationError {
  column: string;
  rowIndex: number;
  message: string;
}

export function validateCell(
  value: unknown,
  column: string,
  rowIndex: number,
  rules: ValidationRule[],
  allRows?: Record<string, unknown>[],
): string[] {
  const errors: string[] = [];
  const colRules = rules.filter((r) => r.column === column);
  if (colRules.length === 0) return errors;

  const strVal = String(value ?? "").trim();

  for (const rule of colRules) {
    const msg = rule.message || `Validation failed: ${rule.type}`;
    switch (rule.type) {
      case "required":
        if (strVal === "") errors.push(msg);
        break;
      case "min": {
        const n = Number(strVal);
        if (strVal !== "" && !isNaN(n) && n < Number(rule.value ?? 0))
          errors.push(msg);
        break;
      }
      case "max": {
        const n = Number(strVal);
        if (strVal !== "" && !isNaN(n) && n > Number(rule.value ?? 0))
          errors.push(msg);
        break;
      }
      case "regex":
        if (rule.value && strVal !== "") {
          try {
            if (!new RegExp(rule.value).test(strVal)) errors.push(msg);
          } catch {
            errors.push("Invalid regex pattern");
          }
        }
        break;
      case "enum":
        if (strVal !== "" && rule.value) {
          const allowed = rule.value
            .split(",")
            .map((v) => v.trim().toLowerCase());
          if (!allowed.includes(strVal.toLowerCase())) errors.push(msg);
        }
        break;
      case "unique":
        if (strVal !== "" && allRows) {
          const dupes = allRows.filter(
            (r, i) =>
              i !== rowIndex &&
              String(r[column] ?? "")
                .trim()
                .toLowerCase() === strVal.toLowerCase(),
          );
          if (dupes.length > 0) errors.push(msg);
        }
        break;
    }
  }
  return errors;
}

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
