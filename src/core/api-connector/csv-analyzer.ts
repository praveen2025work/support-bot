// XLSX is lazy-loaded to avoid bundling ~700KB when only parseCsv needs it
let _xlsx: typeof import('xlsx') | null = null;
async function getXLSX() {
  if (!_xlsx) _xlsx = await import('xlsx');
  return _xlsx;
}

export interface CsvData {
  headers: string[];
  rows: Record<string, string | number>[];
}

export interface AggregationRequest {
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'top';
  column: string;
  limit?: number;
}

export interface AggregationResult {
  operation: string;
  column: string;
  result: number | string;
  topRows?: Record<string, string | number>[];
  topHeaders?: string[];
}

export async function parseCsv(content: string): Promise<CsvData> {
  const XLSX = await getXLSX();
  const wb = XLSX.read(content, { type: 'string', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | Date>>(sheet);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Convert Date objects back to ISO date strings so downstream code sees
  // readable dates instead of Excel serial numbers or JS Date objects.
  for (const row of rows) {
    for (const key of headers) {
      if (row[key] instanceof Date) {
        const d = row[key] as Date;
        row[key] = d.toISOString().split('T')[0];
      }
    }
  }

  return { headers, rows: rows as Record<string, string | number>[] };
}

export function computeAggregation(
  data: CsvData,
  request: AggregationRequest
): AggregationResult {
  const { operation, column, limit } = request;

  if (operation === 'count') {
    return { operation: 'count', column: column || '*', result: data.rows.length };
  }

  if (operation === 'top') {
    const n = limit ?? 5;
    const sorted = [...data.rows]
      .sort((a, b) => {
        const va = typeof a[column] === 'number' ? a[column] : parseFloat(String(a[column])) || 0;
        const vb = typeof b[column] === 'number' ? b[column] : parseFloat(String(b[column])) || 0;
        return (vb as number) - (va as number);
      })
      .slice(0, n);
    // Build a human-readable summary using key identifying columns
    const nameCol = data.headers.find((h) =>
      /name|title|label|id/i.test(h)
    ) || data.headers[0];
    const summary = sorted
      .map((r, i) => `${i + 1}. ${r[nameCol] ?? ''} (${column}: ${r[column] ?? ''})`)
      .join(', ');
    return {
      operation: `top ${n}`,
      column,
      result: summary,
      topRows: sorted,
      topHeaders: data.headers,
    };
  }

  // Numeric operations: sum, avg, min, max
  const values: number[] = [];
  for (const row of data.rows) {
    const raw = row[column];
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (!isNaN(num)) values.push(num);
  }

  if (values.length === 0) {
    return { operation, column, result: 'No numeric data' };
  }

  let result: number;
  switch (operation) {
    case 'sum':
      result = values.reduce((a, b) => a + b, 0);
      break;
    case 'avg':
      result = values.reduce((a, b) => a + b, 0) / values.length;
      break;
    case 'min':
      result = Math.min(...values);
      break;
    case 'max':
      result = Math.max(...values);
      break;
    default:
      result = 0;
  }

  return {
    operation,
    column,
    result: operation === 'avg' ? Math.round(result * 100) / 100 : result,
  };
}

/**
 * Parse natural language text to extract an aggregation request.
 * Matches patterns like "average of revenue", "top 5 by sales", "sum costs".
 */
export function parseAggregationFromText(
  text: string,
  headers: string[]
): AggregationRequest | null {
  const lower = text.toLowerCase();

  // Detect operation
  let operation: AggregationRequest['operation'] | null = null;
  let limit: number | undefined;

  if (/\b(average|avg|mean)\b/.test(lower)) operation = 'avg';
  else if (/\b(sum|total)\b/.test(lower)) operation = 'sum';
  else if (/\b(min|minimum|lowest|smallest)\b/.test(lower)) operation = 'min';
  else if (/\b(max|maximum|highest|largest|biggest)\b/.test(lower)) operation = 'max';
  else if (/\b(count|how many)\b/.test(lower)) operation = 'count';
  else {
    const topMatch = lower.match(/\btop\s+(\d+)\b/);
    if (topMatch) {
      operation = 'top';
      limit = parseInt(topMatch[1], 10);
    }
  }

  if (!operation) return null;

  // For count, column is optional
  if (operation === 'count') {
    // Try to find a column for "count by X" pattern
    const byMatch = lower.match(/\bcount\s+(?:by\s+)?(\w+)/);
    const col = byMatch ? findMatchingHeader(byMatch[1], headers) : null;
    return { operation: 'count', column: col ?? '*', limit };
  }

  // Find the column reference — try matching against actual headers
  const column = findColumnInText(lower, headers);
  if (!column) return null;

  return { operation, column, limit };
}

function findMatchingHeader(term: string, headers: string[]): string | null {
  const lowerTerm = term.toLowerCase();
  // Exact match
  for (const h of headers) {
    if (h.toLowerCase() === lowerTerm) return h;
  }
  // Partial match
  for (const h of headers) {
    if (h.toLowerCase().includes(lowerTerm) || lowerTerm.includes(h.toLowerCase())) return h;
  }
  return null;
}

function findColumnInText(text: string, headers: string[]): string | null {
  // Try longest headers first to handle multi-word column names
  const sorted = [...headers].sort((a, b) => b.length - a.length);
  for (const h of sorted) {
    if (text.includes(h.toLowerCase())) return h;
  }
  // Try individual words in the text against headers
  const words = text.split(/\s+/);
  for (const word of words) {
    const match = findMatchingHeader(word, headers);
    if (match) return match;
  }
  return null;
}

// ── Group By ──────────────────────────────────────────────────────────

export interface GroupByResult {
  groupColumn: string;
  groups: GroupRow[];
  aggregatedColumns: { column: string; operation: string }[];
}

export interface GroupRow {
  groupValue: string | number;
  count: number;
  aggregations: Record<string, number>;
}

/**
 * Patterns that identify ID/key columns — numeric but not meaningful to sum/aggregate.
 */
// Matches: stageid, stage_id, substageid, workflowprocessid, user_key, etc.
const ID_COLUMN_PATTERN = /(?:_|^)(id|key|code|index|seq|sequence|ref|reference|pk|fk)$|id$|key$/i;
// Matches: businessdate, business_date, created_at, timestamp, effective_date, etc.
const DATE_COLUMN_PATTERN = /(?:_|^)(date|time|timestamp|datetime|created|updated|modified|period|asof|effective)$|date$|time$/i;

function isIdentityColumn(header: string, rows: Record<string, string | number>[]): boolean {
  if (ID_COLUMN_PATTERN.test(header)) return true;
  if (DATE_COLUMN_PATTERN.test(header)) return true;
  if (rows.length >= 3) {
    const values = rows.map((r) => r[header]).filter((v) => v !== undefined && v !== null && v !== '');
    const uniqueRatio = new Set(values.map(String)).size / values.length;
    const allIntegers = values.every((v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return !isNaN(n) && Number.isInteger(n);
    });
    if (allIntegers && uniqueRatio > 0.95 && values.length > 5) return true;
  }
  return false;
}

/** Identify columns where >80% of values are numeric (excluding ID/date columns) */
function getNumericColumns(data: CsvData): string[] {
  return data.headers.filter((h) => {
    if (data.rows.length === 0) return false;
    if (isIdentityColumn(h, data.rows)) return false;
    let numCount = 0;
    for (const row of data.rows) {
      const v = row[h];
      if (typeof v === 'number') {
        numCount++;
      } else if (typeof v === 'string') {
        const trimmed = v.trim();
        // Reject time-format ("10:00 BST") and date-text ("13-Mar-2026") strings
        // that parseFloat would incorrectly parse as numbers.
        if (trimmed !== '' && !isNaN(parseFloat(trimmed)) && !/[a-zA-Z:]/.test(trimmed.replace(/%$/, ''))) {
          numCount++;
        }
      }
    }
    return numCount / data.rows.length > 0.8;
  });
}

/**
 * Group rows by a column and sum all numeric columns per group.
 */
export function groupBy(data: CsvData, groupColumn: string): GroupByResult | null {
  const matchedCol = findMatchingHeader(groupColumn, data.headers);
  if (!matchedCol) return null;

  const numericCols = getNumericColumns(data).filter((c) => c !== matchedCol);
  const buckets = new Map<string | number, { count: number; sums: Record<string, number> }>();

  for (const row of data.rows) {
    const key = row[matchedCol] ?? '(empty)';
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, sums: {} };
      for (const nc of numericCols) bucket.sums[nc] = 0;
      buckets.set(key, bucket);
    }
    bucket.count++;
    for (const nc of numericCols) {
      const v = row[nc];
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (!isNaN(num)) bucket.sums[nc] += num;
    }
  }

  const groups: GroupRow[] = [];
  buckets.forEach((bucket, groupValue) => {
    // Round sums for cleaner display
    const aggregations: Record<string, number> = {};
    for (const [col, sum] of Object.entries(bucket.sums)) {
      aggregations[col] = Math.round(sum * 100) / 100;
    }
    groups.push({ groupValue, count: bucket.count, aggregations });
  });

  // Sort groups by groupValue
  groups.sort((a, b) => String(a.groupValue).localeCompare(String(b.groupValue)));

  return {
    groupColumn: matchedCol,
    groups,
    aggregatedColumns: numericCols.map((c) => ({ column: c, operation: 'sum' })),
  };
}

// ── Sort ──────────────────────────────────────────────────────────────

export interface SortRequest {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Sort CSV rows by a column.
 */
export function sortData(data: CsvData, request: SortRequest): CsvData {
  const matchedCol = findMatchingHeader(request.column, data.headers);
  if (!matchedCol) return data;

  const multiplier = request.direction === 'desc' ? -1 : 1;
  const sorted = [...data.rows].sort((a, b) => {
    const va = a[matchedCol];
    const vb = b[matchedCol];
    const na = typeof va === 'number' ? va : parseFloat(String(va));
    const nb = typeof vb === 'number' ? vb : parseFloat(String(vb));
    // Both numeric
    if (!isNaN(na) && !isNaN(nb)) return (na - nb) * multiplier;
    // String comparison
    return String(va ?? '').localeCompare(String(vb ?? '')) * multiplier;
  });

  return { headers: data.headers, rows: sorted };
}

// ── Summary / Stats ──────────────────────────────────────────────────

export interface SummaryResult {
  rowCount: number;
  columns: ColumnSummary[];
}

export interface ColumnSummary {
  column: string;
  type: 'numeric' | 'categorical';
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
  uniqueValues?: number;
  topValues?: { value: string; count: number }[];
}

/**
 * Compute summary statistics for all columns.
 */
export function computeSummary(data: CsvData): SummaryResult {
  const numericCols = new Set(getNumericColumns(data));
  const columns: ColumnSummary[] = [];

  for (const header of data.headers) {
    if (numericCols.has(header)) {
      const values: number[] = [];
      for (const row of data.rows) {
        const v = row[header];
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        if (!isNaN(n)) values.push(n);
      }
      const sum = values.reduce((a, b) => a + b, 0);
      columns.push({
        column: header,
        type: 'numeric',
        sum: Math.round(sum * 100) / 100,
        avg: values.length > 0 ? Math.round((sum / values.length) * 100) / 100 : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
      });
    } else {
      const freq = new Map<string, number>();
      for (const row of data.rows) {
        const v = String(row[header] ?? '');
        freq.set(v, (freq.get(v) ?? 0) + 1);
      }
      const topValues: { value: string; count: number }[] = [];
      freq.forEach((count, value) => topValues.push({ value, count }));
      topValues.sort((a, b) => b.count - a.count);
      topValues.splice(5);
      columns.push({
        column: header,
        type: 'categorical',
        uniqueValues: freq.size,
        topValues,
      });
    }
  }

  return { rowCount: data.rows.length, columns };
}

// ── Text Parsers for Follow-Up Commands ─────────────────────────────

/**
 * Parse "group by <column>" from text.
 */
export function parseGroupByFromText(text: string, headers: string[]): string | null {
  const match = text.match(/\bgroup(?:ed)?\s+by\s+(\w+)/i);
  if (!match) return null;
  return findMatchingHeader(match[1], headers);
}

/**
 * Parse "sort by <column> [asc|desc]" from text.
 */
export function parseSortFromText(text: string, headers: string[]): SortRequest | null {
  const match = text.match(/\b(?:sort|order)(?:ed)?\s+by\s+(\w+)(?:\s+(asc|desc|ascending|descending))?/i);
  if (!match) return null;
  const col = findMatchingHeader(match[1], headers);
  if (!col) return null;
  const dir = match[2];
  const direction: 'asc' | 'desc' =
    dir && /desc/i.test(dir) ? 'desc' : dir && /asc/i.test(dir) ? 'asc' : 'desc';
  return { column: col, direction };
}
