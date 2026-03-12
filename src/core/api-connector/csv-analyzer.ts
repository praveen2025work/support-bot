import * as XLSX from 'xlsx';

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

export function parseCsv(content: string): CsvData {
  const wb = XLSX.read(content, { type: 'string' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return { headers, rows };
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
