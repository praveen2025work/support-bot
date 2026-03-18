// Lazy-load XLSX (~700KB) — only needed when parsing CSV/Excel content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _xlsx: any = null;
function getXLSX() {
  if (!_xlsx) _xlsx = require('xlsx');
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

export function parseCsv(content: string | Buffer, sheetName?: string): CsvData {
  const XLSX = getXLSX();
  const readType = Buffer.isBuffer(content) ? 'buffer' : 'string';
  const wb = XLSX.read(content, { type: readType, cellDates: true });
  const targetSheet = sheetName ?? wb.SheetNames[0];
  if (!targetSheet || !wb.Sheets[targetSheet]) return { headers: [], rows: [] };

  const sheet = wb.Sheets[targetSheet];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, string | number | Date>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Convert Date objects back to ISO date strings so downstream code sees
  // readable dates instead of Excel serial numbers or JS Date objects.
  for (const row of rows) {
    for (const key of headers) {
      if (row[key] instanceof Date) {
        const d = row[key] as Date;
        row[key] = d.toISOString().split('T')[0]; // "2026-03-15"
      }
    }
  }

  return { headers, rows: rows as Record<string, string | number>[] };
}

/** List all sheet names from an xlsx/xls file buffer. */
export function listSheets(content: Buffer): string[] {
  const XLSX = getXLSX();
  const wb = XLSX.read(content, { type: 'buffer' });
  return wb.SheetNames as string[];
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
  const lowerTerm = term.toLowerCase().replace(/[_\s]/g, '');

  // 1. Exact match (case-insensitive)
  for (const h of headers) {
    if (h.toLowerCase() === term.toLowerCase()) return h;
  }

  // 2. Exact match ignoring underscores/spaces (e.g., "bookstatus" matches "Book_Status")
  for (const h of headers) {
    if (h.toLowerCase().replace(/[_\s]/g, '') === lowerTerm) return h;
  }

  // 3. Whole-word boundary match — header contains the term as a distinct word
  //    e.g., "status" matches "Book Status" or "Book_Status" but NOT "StatusCode"
  for (const h of headers) {
    const hLower = h.toLowerCase();
    // Split by underscore, space, or camelCase boundaries
    const hWords = hLower.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[_\s]+/);
    if (hWords.includes(term.toLowerCase())) return h;
  }

  // 4. Term ends with header word or header word ends with term (suffix match)
  //    e.g., "region" matches "Region" but avoids "RegionalCode"
  for (const h of headers) {
    const hNorm = h.toLowerCase().replace(/[_\s]/g, '');
    if (hNorm === lowerTerm) return h;
    // Only allow suffix/prefix match for longer terms (>=4 chars) to avoid false positives
    if (lowerTerm.length >= 4 && hNorm.endsWith(lowerTerm)) return h;
    if (lowerTerm.length >= 4 && lowerTerm.endsWith(hNorm) && hNorm.length >= 4) return h;
  }

  // 5. Partial match (last resort) — but require term to be substantial (>=4 chars)
  if (lowerTerm.length >= 4) {
    for (const h of headers) {
      const hNorm = h.toLowerCase().replace(/[_\s]/g, '');
      if (hNorm.includes(lowerTerm)) return h;
    }
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
  /** When multi-column group-by is used, lists all group columns */
  groupColumns?: string[];
  groups: GroupRow[];
  aggregatedColumns: { column: string; operation: string }[];
}

export interface GroupRow {
  groupValue: string | number;
  /** When multi-column group-by is used, holds the composite key parts */
  groupValues?: Record<string, string | number>;
  count: number;
  aggregations: Record<string, number>;
}

/** Identify columns where >80% of values are numeric */
/**
 * Patterns that identify ID/key columns — numeric but not meaningful to sum/aggregate.
 * These are excluded from numeric aggregation (group-by sums, chart value columns, etc.)
 */
// Matches: stageid, stage_id, substageid, workflowprocessid, user_key, etc.
const ID_COLUMN_PATTERN = /(?:_|^)(id|key|code|index|seq|sequence|ref|reference|pk|fk)$|id$|key$/i;
// Matches: businessdate, business_date, created_at, timestamp, effective_date, etc.
const DATE_COLUMN_PATTERN = /(?:_|^)(date|time|timestamp|datetime|created|updated|modified|period|asof|effective)$|date$|time$/i;

/** Column role configuration — explicit overrides for auto-detection */
interface ColumnConfig {
  idColumns?: string[];
  dateColumns?: string[];
  labelColumns?: string[];
  valueColumns?: string[];
  ignoreColumns?: string[];
}

/**
 * Check if a column is an ID/key column (numeric but not aggregatable).
 * Uses columnConfig first (if provided), then name patterns and value analysis.
 */
function isIdentityColumn(header: string, rows: Record<string, string | number>[], columnConfig?: ColumnConfig): boolean {
  // Explicit config takes priority
  if (columnConfig) {
    const lowerHeader = header.toLowerCase();
    if (columnConfig.idColumns?.some((c) => c.toLowerCase() === lowerHeader)) return true;
    if (columnConfig.dateColumns?.some((c) => c.toLowerCase() === lowerHeader)) return true;
    if (columnConfig.ignoreColumns?.some((c) => c.toLowerCase() === lowerHeader)) return true;
    // If valueColumns is set and this column is in it, it's NOT an identity column
    if (columnConfig.valueColumns?.some((c) => c.toLowerCase() === lowerHeader)) return false;
  }

  // Name-based detection
  if (ID_COLUMN_PATTERN.test(header)) return true;
  if (DATE_COLUMN_PATTERN.test(header)) return true;

  // Value-based detection: if all values are unique integers, likely an ID
  // But skip if the column name suggests it's a measure/metric
  const MEASURE_NAME_PATTERN = /(?:_|^)(count|total|sum|avg|average|amount|balance|revenue|sales|active|volume|rate|ratio|score|pct|percent|quantity|qty|profit|loss|cost|price|fee|salary|wage|income|expense)/i;
  if (rows.length >= 3 && !MEASURE_NAME_PATTERN.test(header)) {
    const values = rows.map((r) => r[header]).filter((v) => v !== undefined && v !== null && v !== '');
    const uniqueRatio = new Set(values.map(String)).size / values.length;
    const allIntegers = values.every((v) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return !isNaN(n) && Number.isInteger(n);
    });
    // If >95% unique and all integers, treat as ID column
    if (allIntegers && uniqueRatio > 0.95 && values.length > 5) return true;
  }

  return false;
}

/**
 * Check if a column contains date values (not just date-like column names).
 * Detects: date strings ("2026-03-15", "03/15/2026", "15-Mar-2026"),
 * Excel serial dates (numeric values in 1-100000 range with column name hint),
 * and JS Date objects serialized as ISO strings.
 */
function isDateValueColumn(header: string, rows: Record<string, string | number>[]): boolean {
  // Column name strongly suggests date — very likely dates even if values look numeric
  if (DATE_COLUMN_PATTERN.test(header)) return true;

  // Sample values for date string detection
  const sample = rows.slice(0, 20);
  let dateStringCount = 0;
  for (const row of sample) {
    const v = row[header];
    if (v === undefined || v === null || v === '') continue;
    const s = String(v).trim();
    if (detectDateFormat(s)) {
      dateStringCount++;
    }
  }
  const nonEmpty = sample.filter((r) => r[header] !== undefined && r[header] !== null && r[header] !== '').length;
  if (nonEmpty > 0 && dateStringCount / nonEmpty > 0.5) return true;

  return false;
}

function getNumericColumns(data: CsvData, columnConfig?: ColumnConfig): string[] {
  // If explicit valueColumns provided, use those directly (validate they exist in headers)
  if (columnConfig?.valueColumns && columnConfig.valueColumns.length > 0) {
    const headerLower = data.headers.map((h) => h.toLowerCase());
    return columnConfig.valueColumns.filter((vc) =>
      headerLower.includes(vc.toLowerCase())
    ).map((vc) => {
      const idx = headerLower.indexOf(vc.toLowerCase());
      return data.headers[idx]; // return original case
    });
  }

  return data.headers.filter((h) => {
    if (data.rows.length === 0) return false;
    // Skip ID, date, and ignored columns
    if (isIdentityColumn(h, data.rows, columnConfig)) return false;
    // Skip date columns (by name pattern or by detecting date values)
    if (isDateValueColumn(h, data.rows)) return false;
    let numCount = 0;
    for (const row of data.rows) {
      const v = row[h];
      if (typeof v === 'number') {
        numCount++;
      } else if (typeof v === 'string') {
        const trimmed = v.trim();
        // Reject time-format ("10:00 BST") and date-text ("13-Mar-2026") strings
        // that parseFloat would incorrectly parse as numbers.
        // A true numeric string should not contain ':' or letters (except trailing %).
        if (trimmed !== '' && !isNaN(parseFloat(trimmed)) && !/[a-zA-Z:]/.test(trimmed.replace(/%$/, ''))) {
          numCount++;
        }
      }
    }
    return numCount / data.rows.length > 0.8;
  });
}

/**
 * Group rows by one or more columns and sum all numeric columns per group.
 * Supports single column: groupBy(data, "region")
 * Supports multi-column: groupBy(data, "region") for single, or use groupByMultiple.
 */
export function groupBy(data: CsvData, groupColumn: string): GroupByResult | null {
  // Check if this is a multi-column request: "product and region", "product, region"
  const multiCols = groupColumn.split(/\s+and\s+|,\s*/i).map((c) => c.trim()).filter(Boolean);
  if (multiCols.length > 1) {
    return groupByMultiple(data, multiCols);
  }

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
    const aggregations: Record<string, number> = {};
    for (const [col, sum] of Object.entries(bucket.sums)) {
      aggregations[col] = Math.round(sum * 100) / 100;
    }
    groups.push({ groupValue, count: bucket.count, aggregations });
  });

  groups.sort((a, b) => String(a.groupValue).localeCompare(String(b.groupValue)));

  return {
    groupColumn: matchedCol,
    groups,
    aggregatedColumns: numericCols.map((c) => ({ column: c, operation: 'sum' })),
  };
}

/**
 * Group rows by multiple columns (composite key).
 * e.g., "group by product and region" → each unique (product, region) pair is a group.
 */
export function groupByMultiple(data: CsvData, groupColumns: string[]): GroupByResult | null {
  // Resolve each column name
  const matchedCols: string[] = [];
  for (const col of groupColumns) {
    const matched = findMatchingHeader(col, data.headers);
    if (!matched) return null; // Bail if any column not found
    matchedCols.push(matched);
  }

  const groupColSet = new Set(matchedCols);
  const numericCols = getNumericColumns(data).filter((c) => !groupColSet.has(c));

  // Use a composite string key: "val1|||val2|||val3"
  const SEPARATOR = '|||';
  const buckets = new Map<string, { values: Record<string, string | number>; count: number; sums: Record<string, number> }>();

  for (const row of data.rows) {
    const keyParts = matchedCols.map((col) => String(row[col] ?? '(empty)'));
    const compositeKey = keyParts.join(SEPARATOR);

    let bucket = buckets.get(compositeKey);
    if (!bucket) {
      const values: Record<string, string | number> = {};
      matchedCols.forEach((col) => { values[col] = row[col] ?? '(empty)'; });
      bucket = { values, count: 0, sums: {} };
      for (const nc of numericCols) bucket.sums[nc] = 0;
      buckets.set(compositeKey, bucket);
    }
    bucket.count++;
    for (const nc of numericCols) {
      const v = row[nc];
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (!isNaN(num)) bucket.sums[nc] += num;
    }
  }

  const groups: GroupRow[] = [];
  buckets.forEach((bucket) => {
    const aggregations: Record<string, number> = {};
    for (const [col, sum] of Object.entries(bucket.sums)) {
      aggregations[col] = Math.round(sum * 100) / 100;
    }
    // Display label: "Product A | US"
    const displayLabel = matchedCols.map((col) => String(bucket.values[col])).join(' | ');
    groups.push({
      groupValue: displayLabel,
      groupValues: bucket.values,
      count: bucket.count,
      aggregations,
    });
  });

  groups.sort((a, b) => String(a.groupValue).localeCompare(String(b.groupValue)));

  const displayColumnName = matchedCols.join(' + ');
  return {
    groupColumn: displayColumnName,
    groupColumns: matchedCols,
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

// ── Column Type Detection ────────────────────────────────────────────

export interface DetectedColumnMeta {
  column: string;
  detectedType: 'date' | 'integer' | 'decimal' | 'id' | 'string';
  format?: string;
}

const MONTH_NAMES = /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)$/i;
const MONTH_ABBR = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i;

interface DatePattern {
  regex: RegExp;
  format: string;
}

const DATE_PATTERNS: DatePattern[] = [
  // ISO datetime: 2026-03-15T14:30:00
  { regex: /^\d{4}[-/]\d{2}[-/]\d{2}T\d{2}:\d{2}/, format: 'YYYY-MM-DDTHH:mm:ss' },
  // ISO date: 2026-03-15 or 2026/03/15
  { regex: /^\d{4}[-/]\d{2}[-/]\d{2}$/, format: 'YYYY-MM-DD' },
  // US date: 03/15/2026 or 03-15-2026
  { regex: /^\d{2}[-/]\d{2}[-/]\d{4}$/, format: 'MM/DD/YYYY' },
  // DD-Mon-YYYY or DD Mon YYYY: 15-Mar-2026, 15 Mar 2026
  { regex: /^\d{1,2}[-\s](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s]\d{4}$/i, format: 'DD-Mon-YYYY' },
  // Mon YYYY or Mon-YYYY: Mar 2026, Mar-2026
  { regex: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s]\d{4}$/i, format: 'Mon YYYY' },
  // YYYY-Mon or YYYY Mon: 2026-Mar, 2026 Mar
  { regex: /^\d{4}[-\s](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i, format: 'YYYY-Mon' },
];

function detectDateFormat(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Full or abbreviated month name alone
  if (MONTH_NAMES.test(trimmed)) return 'month_name';
  for (const { regex, format } of DATE_PATTERNS) {
    if (regex.test(trimmed)) return format;
  }
  return null;
}

/**
 * Analyze actual data values to detect column types.
 * Samples up to 20 rows; requires >80% match for a type classification.
 * Explicit columnConfig overrides always win.
 */
export function detectColumnTypes(
  headers: string[],
  rows: Record<string, string | number>[],
  columnConfig?: ColumnConfig
): DetectedColumnMeta[] {
  const sampleRows = rows.slice(0, 20);
  const result: DetectedColumnMeta[] = [];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();

    // Explicit columnConfig overrides
    if (columnConfig?.dateColumns?.some((c) => c.toLowerCase() === lowerHeader)) {
      result.push({ column: header, detectedType: 'date' });
      continue;
    }
    if (columnConfig?.idColumns?.some((c) => c.toLowerCase() === lowerHeader)) {
      result.push({ column: header, detectedType: 'id' });
      continue;
    }
    if (columnConfig?.ignoreColumns?.some((c) => c.toLowerCase() === lowerHeader)) {
      result.push({ column: header, detectedType: 'string' });
      continue;
    }
    if (columnConfig?.valueColumns?.some((c) => c.toLowerCase() === lowerHeader)) {
      // Determine integer vs decimal for explicit value columns
      const vals = sampleRows.map((r) => r[header]).filter((v) => v !== undefined && v !== null && v !== '');
      const hasDecimal = vals.some((v) => {
        const s = String(v);
        return s.includes('.') && !isNaN(parseFloat(s));
      });
      result.push({ column: header, detectedType: hasDecimal ? 'decimal' : 'integer' });
      continue;
    }

    // Value-based detection
    const values = sampleRows
      .map((r) => r[header])
      .filter((v) => v !== undefined && v !== null && v !== '');

    if (values.length === 0) {
      result.push({ column: header, detectedType: 'string' });
      continue;
    }

    // Check for dates first (before numeric, since some date formats are numeric-looking)
    let dateCount = 0;
    let lastDateFormat: string | null = null;
    for (const v of values) {
      const fmt = detectDateFormat(String(v));
      if (fmt) {
        dateCount++;
        lastDateFormat = fmt;
      }
    }
    // Also check column name pattern as a boost
    const nameIsDate = DATE_COLUMN_PATTERN.test(header);
    if (dateCount / values.length > 0.8 || (nameIsDate && dateCount > 0)) {
      result.push({ column: header, detectedType: 'date', format: lastDateFormat ?? undefined });
      continue;
    }
    // If name strongly suggests date but values are numeric (e.g. Excel serial dates),
    // still classify as date
    if (nameIsDate) {
      result.push({ column: header, detectedType: 'date', format: 'excel_serial' });
      continue;
    }

    // Check if it's an ID column (name pattern + value uniqueness)
    if (isIdentityColumn(header, rows, columnConfig)) {
      result.push({ column: header, detectedType: 'id' });
      continue;
    }

    // Check for numeric (integer vs decimal)
    let numericCount = 0;
    let hasDecimal = false;
    for (const v of values) {
      const s = String(v);
      const n = typeof v === 'number' ? v : parseFloat(s);
      if (!isNaN(n)) {
        numericCount++;
        if (s.includes('.')) hasDecimal = true;
      }
    }
    if (numericCount / values.length > 0.8) {
      result.push({ column: header, detectedType: hasDecimal ? 'decimal' : 'integer' });
      continue;
    }

    // Default: string
    result.push({ column: header, detectedType: 'string' });
  }

  return result;
}

// ── Summary / Stats ──────────────────────────────────────────────────

export interface SummaryResult {
  rowCount: number;
  columns: ColumnSummary[];
}

export interface ColumnSummary {
  column: string;
  type: 'numeric' | 'categorical' | 'date';
  numericSubtype?: 'integer' | 'decimal';
  dateFormat?: string;
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
  const detectedTypes = detectColumnTypes(data.headers, data.rows);
  const detectedMap = new Map(detectedTypes.map((d) => [d.column, d]));
  const columns: ColumnSummary[] = [];

  for (const header of data.headers) {
    const detected = detectedMap.get(header);

    if (detected?.detectedType === 'date') {
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
        type: 'date',
        dateFormat: detected.format,
        uniqueValues: freq.size,
        topValues,
      });
    } else if (numericCols.has(header)) {
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
        numericSubtype: detected?.detectedType === 'decimal' ? 'decimal' : 'integer',
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
  // Try multi-word match first: "group by book status" → try "book status", then "book"
  const match = text.match(/\bgroup(?:ed)?\s+by\s+(.+?)(?:\s+(?:asc|desc|ascending|descending|for|where|with|in)\b|$)/i);
  if (!match) return null;

  const rawCol = match[1].trim();

  // Check for multi-column request: "group by product and region" or "group by product, region"
  const multiParts = rawCol.split(/\s+and\s+|,\s*/i).map((c) => c.trim()).filter(Boolean);
  if (multiParts.length > 1) {
    // Validate each column exists before returning multi-column string
    const matched: string[] = [];
    for (const part of multiParts) {
      const m = findMatchingHeader(part, headers);
      if (!m) return null; // If any column is invalid, fail
      matched.push(m);
    }
    // Return as "col1 and col2" so groupBy() can split and delegate to groupByMultiple()
    return matched.join(' and ');
  }

  // Try the full phrase first (handles multi-word column names)
  const fullMatch = findMatchingHeader(rawCol, headers);
  if (fullMatch) return fullMatch;

  // Fall back to first word only
  const firstWord = rawCol.split(/\s+/)[0];
  return findMatchingHeader(firstWord, headers);
}

/**
 * Parse "sort by <column> [asc|desc]" from text.
 */
export function parseSortFromText(text: string, headers: string[]): SortRequest | null {
  // Support multi-word columns: "sort by book status desc"
  const match = text.match(/\b(?:sort|order)(?:ed)?\s+by\s+(.+?)(?:\s+(asc|desc|ascending|descending)\s*$|\s*$)/i);
  if (!match) return null;

  const rawCol = match[1].trim();
  const dir = match[2];

  // Try the full phrase first
  let col = findMatchingHeader(rawCol, headers);
  if (!col) {
    // Fall back to first word
    col = findMatchingHeader(rawCol.split(/\s+/)[0], headers);
  }
  if (!col) return null;

  const direction: 'asc' | 'desc' =
    dir && /desc/i.test(dir) ? 'desc' : dir && /asc/i.test(dir) ? 'asc' : 'desc';
  return { column: col, direction };
}
