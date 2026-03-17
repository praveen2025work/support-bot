import { logger } from '@/lib/logger';
import type { QueryService } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';
import {
  groupBy,
  sortData,
  computeSummary,
  parseGroupByFromText,
  parseSortFromText,
  type CsvData,
} from '../../api-connector/csv-analyzer';
import {
  FOLLOWUP_PATTERN,
  FOLLOWUP_NOISE,
  FILTER_FOLLOWUP_PATTERN,
  GROUP_BY_PATTERN,
  SORT_PATTERN,
  SUMMARY_PATTERN,
  TOP_BOTTOM_PATTERN,
  VALUE_COMPARE_PATTERN,
  AGGREGATION_PATTERN,
  STOP_WORDS,
} from '../constants';
import { extractFilters, parseFilterFromText, mergeFilters } from './filter-utils';
import { getLastUserText, rerunLastQueryWithFilters } from './query-handler';
import { summarizeDocument } from './knowledge-handler';

// ── Context extractors ──────────────────────────────────────────────

/**
 * Extract CSV-shaped data from context.lastApiResult.
 * Handles both CSV format ({ headers, rows }) and API format ({ data: [...] }).
 */
export function extractCsvDataFromContext(context: ConversationContext): CsvData | null {
  const raw = context.lastApiResult as Record<string, unknown>;
  if (!raw) return null;

  // CSV format: { headers: string[], rows: Record[] }
  const headers = raw.headers as string[] | undefined;
  const rows = raw.rows as Record<string, string | number>[] | undefined;
  if (headers && rows) return { headers, rows };

  // API format: { data: Record[] } — derive headers from first row
  const apiData = raw.data as Record<string, string | number>[] | undefined;
  if (apiData && apiData.length > 0) {
    const derivedHeaders = Object.keys(apiData[0]);
    return { headers: derivedHeaders, rows: apiData };
  }

  return null;
}

/**
 * Extract document content from context.lastApiResult.
 */
export function extractDocumentFromContext(context: ConversationContext): { content: string; filePath: string; format: string } | null {
  const raw = context.lastApiResult as Record<string, unknown>;
  if (!raw) return null;
  const content = raw.content as string | undefined;
  if (!content) return null;
  return {
    content,
    filePath: (raw.filePath as string) ?? '',
    format: (raw.format as string) ?? 'txt',
  };
}

// ── Follow-up handlers ──────────────────────────────────────────────

/**
 * Handle "group by <column>" follow-up on previous query results.
 */
export function handleGroupByFollowUp(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;
  const userText = getLastUserText(context);
  if (!GROUP_BY_PATTERN.test(userText)) return null;

  const csvData = extractCsvDataFromContext(context);
  if (!csvData) return null;

  const groupCol = parseGroupByFromText(userText, csvData.headers);
  if (!groupCol) {
    return {
      text: `I couldn't find that column. Available columns: **${csvData.headers.join(', ')}**`,
      suggestions: csvData.headers.slice(0, 4).map((h) => `group by ${h}`),
      sessionId: context.sessionId,
      intent: 'followup.group_by',
      confidence: 1,
    };
  }

  // Check for combined filter: "group by quarter for region US"
  let dataToGroup = csvData;
  const filterMatch = userText.match(/\b(?:for|where|with|in)\s+(\w+)\s+(\w+)\s*$/i);
  if (filterMatch) {
    const filterKey = filterMatch[1].toLowerCase();
    const filterVal = filterMatch[2];
    const headerMatch = csvData.headers.find((h) => h.toLowerCase() === filterKey);
    if (headerMatch) {
      const filteredRows = csvData.rows.filter(
        (r) => String(r[headerMatch] ?? '').toLowerCase() === filterVal.toLowerCase()
      );
      dataToGroup = { headers: csvData.headers, rows: filteredRows };
      logger.info({ filterKey: headerMatch, filterVal, filtered: filteredRows.length }, 'Applied inline filter before group-by');
    }
  }

  const result = groupBy(dataToGroup, groupCol);
  if (!result || result.groups.length === 0) {
    return {
      text: `No groups found when grouping "${context.lastQueryName}" by **${groupCol}**.`,
      sessionId: context.sessionId,
      intent: 'followup.group_by',
      confidence: 1,
    };
  }

  logger.info({ query: context.lastQueryName, groupCol, groups: result.groups.length }, 'Group-by follow-up');

  return {
    text: `Here is "${context.lastQueryName}" grouped by **${result.groupColumn}** (${result.groups.length} groups, ${dataToGroup.rows.length} total rows):`,
    richContent: { type: 'csv_group_by', data: result },
    suggestions: [
      ...csvData.headers.filter((h) => h !== groupCol).slice(0, 2).map((h) => `group by ${h}`),
      'summarize',
      `sort by ${result.aggregatedColumns[0]?.column ?? 'count'} desc`,
    ],
    sessionId: context.sessionId,
    intent: 'followup.group_by',
    confidence: 1,
  };
}

/**
 * Handle "sort by <column> [asc|desc]" follow-up on previous results.
 */
export function handleSortFollowUp(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;
  const userText = getLastUserText(context);
  if (!SORT_PATTERN.test(userText)) return null;

  const csvData = extractCsvDataFromContext(context);
  if (!csvData) return null;

  const sortReq = parseSortFromText(userText, csvData.headers);
  if (!sortReq) {
    return {
      text: `I couldn't find that column to sort by. Available columns: **${csvData.headers.join(', ')}**`,
      suggestions: csvData.headers.slice(0, 4).map((h) => `sort by ${h} desc`),
      sessionId: context.sessionId,
      intent: 'followup.sort',
      confidence: 1,
    };
  }

  const sorted = sortData(csvData, sortReq);
  // Update context with sorted data
  context.lastApiResult = { headers: sorted.headers, rows: sorted.rows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: sorted.rows.length };

  logger.info({ query: context.lastQueryName, sortCol: sortReq.column, dir: sortReq.direction }, 'Sort follow-up');

  return {
    text: `Here is "${context.lastQueryName}" sorted by **${sortReq.column}** (${sortReq.direction}) — ${sorted.rows.length} rows:`,
    richContent: {
      type: 'csv_table',
      data: { headers: sorted.headers, rows: sorted.rows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: sorted.rows.length },
    },
    suggestions: [
      `sort by ${sortReq.column} ${sortReq.direction === 'desc' ? 'asc' : 'desc'}`,
      'summarize',
      `top 5 by ${sortReq.column}`,
    ],
    sessionId: context.sessionId,
    intent: 'followup.sort',
    confidence: 1,
  };
}

/**
 * Handle "summarize" / "stats" / "statistics" follow-up.
 */
export function handleSummaryFollowUp(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;
  const userText = getLastUserText(context);
  if (!SUMMARY_PATTERN.test(userText)) return null;

  const csvData = extractCsvDataFromContext(context);
  if (csvData) {
    const summary = computeSummary(csvData);
    logger.info({ query: context.lastQueryName, rowCount: summary.rowCount, cols: summary.columns.length }, 'Summary follow-up');

    return {
      text: `Summary of "${context.lastQueryName}" (${summary.rowCount} rows):`,
      richContent: { type: 'csv_summary', data: summary },
      suggestions: csvData.headers.slice(0, 3).map((h) => `group by ${h}`),
      sessionId: context.sessionId,
      intent: 'followup.summary',
      confidence: 1,
    };
  }

  // Document summary
  const docData = extractDocumentFromContext(context);
  if (docData) {
    const docSummary = summarizeDocument(docData.content);
    logger.info({ query: context.lastQueryName, sections: docSummary.sections.length }, 'Document summary follow-up');

    return {
      text: docSummary.text,
      richContent: { type: 'document_summary', data: docSummary },
      suggestions: docSummary.keywords.length > 0
        ? docSummary.keywords.slice(0, 4).map((k) => `search ${context.lastQueryName} for ${k}`)
        : [`run ${context.lastQueryName}`],
      sessionId: context.sessionId,
      intent: 'followup.summary',
      confidence: 1,
    };
  }

  return null;
}

/**
 * Handle "top 5 by revenue" / "bottom 10 by units" follow-up.
 */
export function handleTopNFollowUp(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;
  const userText = getLastUserText(context);
  const match = TOP_BOTTOM_PATTERN.exec(userText);
  if (!match) return null;

  const csvData = extractCsvDataFromContext(context);
  if (!csvData) return null;

  const isBottom = match[1].toLowerCase() === 'bottom';
  const n = parseInt(match[2], 10);
  const afterMatch = userText.substring(match.index! + match[0].length);
  const colMatch = afterMatch.match(/\b(?:by\s+)?(\w+)/i);
  let column: string | null = null;
  if (colMatch) {
    const term = colMatch[1];
    column = csvData.headers.find((h) => h.toLowerCase() === term.toLowerCase()) ?? null;
    if (!column) column = csvData.headers.find((h) => h.toLowerCase().includes(term.toLowerCase())) ?? null;
  }

  if (!column) {
    return {
      text: `Which column should I use? Available: **${csvData.headers.join(', ')}**`,
      suggestions: csvData.headers.slice(0, 4).map((h) => `top ${n} by ${h}`),
      sessionId: context.sessionId,
      intent: 'followup.top_n',
      confidence: 1,
    };
  }

  const direction: 'asc' | 'desc' = isBottom ? 'asc' : 'desc';
  const sorted = sortData(csvData, { column, direction });
  const topRows = sorted.rows.slice(0, n);

  logger.info({ query: context.lastQueryName, n, column, isBottom }, 'Top-N follow-up');

  return {
    text: `${isBottom ? 'Bottom' : 'Top'} ${n} by **${column}** from "${context.lastQueryName}":`,
    richContent: {
      type: 'csv_table',
      data: { headers: sorted.headers, rows: topRows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: topRows.length },
    },
    suggestions: [
      `${isBottom ? 'top' : 'bottom'} ${n} by ${column}`,
      'summarize',
      `group by ${csvData.headers.find((h) => h !== column) ?? csvData.headers[0]}`,
    ],
    sessionId: context.sessionId,
    intent: 'followup.top_n',
    confidence: 1,
  };
}

/**
 * Parse a comparison operator and threshold from user text.
 * Supports: >, <, >=, <=, =>, =<, =, "greater than", "less than", etc.
 */
function parseComparison(text: string): { column: string; op: string; threshold: number } | null {
  // Order matters: check multi-word operators first, then symbols
  const patterns: { regex: RegExp; op: string }[] = [
    { regex: /(\w+)\s+(?:greater\s+than\s+(?:or\s+)?equal(?:\s+to)?|>=|=>)\s*(\d+\.?\d*)%?/i, op: '>=' },
    { regex: /(\w+)\s+(?:less\s+than\s+(?:or\s+)?equal(?:\s+to)?|<=|=<)\s*(\d+\.?\d*)%?/i, op: '<=' },
    { regex: /(\w+)\s+(?:greater\s+than|more\s+than|above|over|>)\s*(\d+\.?\d*)%?/i, op: '>' },
    { regex: /(\w+)\s+(?:less\s+than|below|under|<)\s*(\d+\.?\d*)%?/i, op: '<' },
    { regex: /(\w+)\s+(?:equal\s+to|equals|=)\s*(\d+\.?\d*)%?/i, op: '=' },
  ];

  for (const { regex, op } of patterns) {
    const m = text.match(regex);
    if (m) {
      return { column: m[1], op, threshold: parseFloat(m[2]) };
    }
  }
  return null;
}

/**
 * Handle value comparison follow-ups: "show me retention > 70", "where revenue >= 1000"
 */
export function handleValueCompareFollowUp(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;
  const userText = getLastUserText(context);
  if (!VALUE_COMPARE_PATTERN.test(userText)) return null;

  const csvData = extractCsvDataFromContext(context);
  if (!csvData) return null;

  const parsed = parseComparison(userText);
  if (!parsed) return null;

  // Match column name (fuzzy)
  const colMatch = csvData.headers.find((h) => h.toLowerCase() === parsed.column.toLowerCase())
    ?? csvData.headers.find((h) => h.toLowerCase().includes(parsed.column.toLowerCase()))
    ?? csvData.headers.find((h) => parsed.column.toLowerCase().includes(h.toLowerCase()));

  if (!colMatch) {
    return {
      text: `I couldn't find a column matching "${parsed.column}". Available columns: **${csvData.headers.join(', ')}**`,
      suggestions: csvData.headers.slice(0, 4).map((h) => `${h} > ${parsed.threshold}`),
      sessionId: context.sessionId,
      intent: 'followup.compare',
      confidence: 1,
    };
  }

  const compare = (val: number): boolean => {
    switch (parsed.op) {
      case '>': return val > parsed.threshold;
      case '<': return val < parsed.threshold;
      case '>=': return val >= parsed.threshold;
      case '<=': return val <= parsed.threshold;
      case '=': return val === parsed.threshold;
      default: return false;
    }
  };

  const filteredRows = csvData.rows.filter((row) => {
    const raw = row[colMatch];
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[%$,]/g, ''));
    return !isNaN(num) && compare(num);
  });

  logger.info({ query: context.lastQueryName, column: colMatch, op: parsed.op, threshold: parsed.threshold, matched: filteredRows.length }, 'Value comparison follow-up');

  if (filteredRows.length === 0) {
    return {
      text: `No rows in "${context.lastQueryName}" where **${colMatch}** ${parsed.op} ${parsed.threshold}.`,
      suggestions: [`${colMatch} > 0`, 'summarize', `sort by ${colMatch} desc`],
      sessionId: context.sessionId,
      intent: 'followup.compare',
      confidence: 1,
    };
  }

  return {
    text: `Rows from "${context.lastQueryName}" where **${colMatch}** ${parsed.op} ${parsed.threshold} (${filteredRows.length} of ${csvData.rows.length} rows):`,
    richContent: {
      type: 'csv_table',
      data: { headers: csvData.headers, rows: filteredRows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: filteredRows.length },
    },
    suggestions: [
      `${colMatch} ${parsed.op === '>' ? '<' : '>'} ${parsed.threshold}`,
      `sort by ${colMatch} desc`,
      'summarize',
    ],
    sessionId: context.sessionId,
    intent: 'followup.compare',
    confidence: 1,
  };
}

/**
 * Parse a duration string into a numeric value in hours.
 * Handles formats:
 *   - "01 Day(s) 05:56:00" (days + HH:MM:SS)
 *   - "07:17:00" (HH:MM:SS, under one day)
 *   - "1 day(s) 4 hours", "2h 30m", "3 days", "45 minutes"
 *   - "1d 2h 30m", "1.5 hours", "90 min"
 * Returns NaN if the string is not a recognizable duration.
 */
function parseDurationToHours(raw: string): number {
  const s = String(raw).trim().toLowerCase();

  // Already a plain number — return as-is
  const plain = parseFloat(s.replace(/[%$,]/g, ''));
  if (!isNaN(plain) && /^[\d.,\-$%\s]+$/.test(s)) return plain;

  let totalHours = 0;
  let matched = false;

  // Format: "01 Day(s) 05:56:00" or "02 Day(s) 03:45:00"
  const dayHmsMatch = s.match(/(\d+)\s*day\(?s?\)?\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (dayHmsMatch) {
    totalHours += parseInt(dayHmsMatch[1], 10) * 24;
    totalHours += parseInt(dayHmsMatch[2], 10);
    totalHours += parseInt(dayHmsMatch[3], 10) / 60;
    totalHours += parseInt(dayHmsMatch[4], 10) / 3600;
    return totalHours;
  }

  // Format: "07:17:00" (HH:MM:SS only, no day prefix)
  const hmsOnly = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hmsOnly) {
    totalHours += parseInt(hmsOnly[1], 10);
    totalHours += parseInt(hmsOnly[2], 10) / 60;
    totalHours += parseInt(hmsOnly[3], 10) / 3600;
    return totalHours;
  }

  // Match days: "1 day", "2 day(s)", "3d", "1.5 days"
  const dayMatch = s.match(/([\d.]+)\s*(?:day\(?s?\)?|d\b)/);
  if (dayMatch) { totalHours += parseFloat(dayMatch[1]) * 24; matched = true; }

  // Match hours: "4 hours", "2h", "1.5 hour(s)", "4 hr(s)"
  const hourMatch = s.match(/([\d.]+)\s*(?:hour\(?s?\)?|hr\(?s?\)?|h\b)/);
  if (hourMatch) { totalHours += parseFloat(hourMatch[1]); matched = true; }

  // Match minutes: "30 minutes", "45m", "30 min(s)"
  const minMatch = s.match(/([\d.]+)\s*(?:minute\(?s?\)?|min\(?s?\)?|m\b)/);
  if (minMatch) { totalHours += parseFloat(minMatch[1]) / 60; matched = true; }

  // Match seconds: "30 seconds", "45s", "30 sec(s)"
  const secMatch = s.match(/([\d.]+)\s*(?:second\(?s?\)?|sec\(?s?\)?|s\b)/);
  if (secMatch) { totalHours += parseFloat(secMatch[1]) / 3600; matched = true; }

  return matched ? totalHours : NaN;
}

/**
 * Format hours back into a human-readable duration string.
 */
function formatDuration(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return mins === 1 ? '1 minute' : `${mins} minutes`;
  }
  const d = Math.floor(hours / 24);
  const remaining = hours - d * 24;
  const h = Math.floor(remaining);
  const m = Math.round((remaining - h) * 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
  if (h > 0 || (d > 0 && m > 0)) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.length > 0 ? parts.join(' ') : `${hours.toFixed(2)} hours`;
}

/**
 * Detect whether a column contains duration strings (vs plain numbers).
 * Checks first few non-empty values.
 */
function isDurationColumn(rows: Record<string, string | number>[], column: string): boolean {
  let durationCount = 0;
  const sample = rows.slice(0, 10);
  for (const row of sample) {
    const val = String(row[column] ?? '').trim();
    if (!val) continue;
    // Match: "Day(s)", "hours", "min", etc. OR HH:MM:SS patterns OR "2d", "3h"
    if (/(?:day|hour|minute|second|min|sec|hr)\(?s?\)?|(?:\d+\s*[dhms]\b)|^\d{1,2}:\d{2}:\d{2}$/i.test(val)) {
      durationCount++;
    }
  }
  return durationCount >= Math.min(3, sample.length * 0.5);
}

/**
 * Parse aggregation operation and column from user text.
 * Supports: "avg resolution_hours", "calculate sum revenue", "max of priority", "count tickets"
 */
function parseAggregation(text: string): { op: string; columnHint: string | null } | null {
  const m = text.match(/\b(?:calculate\s+)?(avg|average|sum|total|min|max|mean|minimum|maximum|count)\b(?:\s+(?:of\s+)?([\w_]+))?/i);
  if (!m) return null;
  const rawOp = m[1].toLowerCase();
  const opMap: Record<string, string> = {
    avg: 'avg', average: 'avg', mean: 'avg',
    sum: 'sum', total: 'sum',
    min: 'min', minimum: 'min',
    max: 'max', maximum: 'max',
    count: 'count',
  };
  return { op: opMap[rawOp] ?? rawOp, columnHint: m[2] ?? null };
}

/**
 * Handle aggregation follow-ups: "avg resolution_hours", "calculate sum revenue", "max priority"
 */
export function handleAggregationFollowUp(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;
  const userText = getLastUserText(context);
  if (!AGGREGATION_PATTERN.test(userText)) return null;

  const parsed = parseAggregation(userText);
  if (!parsed) return null;

  const csvData = extractCsvDataFromContext(context);
  if (!csvData) return null;

  // For count without a column, return row count
  if (parsed.op === 'count' && !parsed.columnHint) {
    return {
      text: `**Count** of rows in "${context.lastQueryName}": **${csvData.rows.length}**`,
      suggestions: ['summarize', ...csvData.headers.slice(0, 3).map((h) => `avg ${h}`)],
      sessionId: context.sessionId,
      intent: 'followup.aggregation',
      confidence: 1,
    };
  }

  // Match column
  let column: string | null = null;
  if (parsed.columnHint) {
    const hint = parsed.columnHint.toLowerCase();
    column = csvData.headers.find((h) => h.toLowerCase() === hint) ?? null;
    if (!column) column = csvData.headers.find((h) => h.toLowerCase().replace(/_/g, '') === hint.replace(/_/g, '')) ?? null;
    if (!column) column = csvData.headers.find((h) => h.toLowerCase().includes(hint) || hint.includes(h.toLowerCase())) ?? null;
  }

  if (!column) {
    const numericHeaders = csvData.headers.filter((h) => {
      const val = csvData.rows[0]?.[h];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
    });
    return {
      text: `Which column should I calculate the ${parsed.op} of? Available numeric columns: **${numericHeaders.join(', ')}**`,
      suggestions: numericHeaders.slice(0, 4).map((h) => `${parsed.op} ${h}`),
      sessionId: context.sessionId,
      intent: 'followup.aggregation',
      confidence: 1,
    };
  }

  // Detect if column contains duration strings
  const hasDurations = isDurationColumn(csvData.rows, column);

  // Compute aggregation — use duration parser if column has duration values
  const values = csvData.rows
    .map((r) => {
      const raw = r[column!];
      if (typeof raw === 'number') return raw;
      return hasDurations ? parseDurationToHours(String(raw)) : parseFloat(String(raw).replace(/[%$,]/g, ''));
    })
    .filter((v) => !isNaN(v));

  if (values.length === 0) {
    return {
      text: `Column **${column}** has no numeric values to aggregate.`,
      suggestions: csvData.headers.slice(0, 4).map((h) => `${parsed.op} ${h}`),
      sessionId: context.sessionId,
      intent: 'followup.aggregation',
      confidence: 1,
    };
  }

  let result: number;
  let opLabel: string;
  switch (parsed.op) {
    case 'avg':
      result = values.reduce((a, b) => a + b, 0) / values.length;
      opLabel = 'Average';
      break;
    case 'sum':
      result = values.reduce((a, b) => a + b, 0);
      opLabel = 'Sum';
      break;
    case 'min':
      result = Math.min(...values);
      opLabel = 'Min';
      break;
    case 'max':
      result = Math.max(...values);
      opLabel = 'Max';
      break;
    case 'count':
      result = values.length;
      opLabel = 'Count';
      break;
    default:
      return null;
  }

  // Format result: use duration format for duration columns, numeric otherwise
  const formatted = parsed.op === 'count'
    ? result.toString()
    : hasDurations
    ? `${formatDuration(result)} (${result.toFixed(2)} hrs)`
    : Number.isInteger(result) ? result.toString() : result.toFixed(2);
  logger.info({ query: context.lastQueryName, op: parsed.op, column, result }, 'Aggregation follow-up');

  const otherOps = ['avg', 'sum', 'min', 'max'].filter((o) => o !== parsed.op);

  return {
    text: `**${opLabel}** of **${column}** in "${context.lastQueryName}" (${values.length} values): **${formatted}**`,
    suggestions: [
      ...otherOps.slice(0, 2).map((o) => `${o} ${column}`),
      'summarize',
      `sort by ${column} desc`,
    ],
    sessionId: context.sessionId,
    intent: 'followup.aggregation',
    confidence: 1,
  };
}

/**
 * Handle follow-up questions about specific fields from the last query result.
 */
export function handleFollowUp(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;

  const userText = getLastUserText(context);
  const match = FOLLOWUP_PATTERN.exec(userText);
  if (!match) return null;

  const rawField = match[2].trim().toLowerCase();
  const fieldWords = rawField
    .split(/[\s_]+/)
    .filter((w) => !FOLLOWUP_NOISE.has(w));
  if (fieldWords.length === 0) return null;

  const columns = context.lastQueryColumns || [];
  const matchedCol = fuzzyMatchColumn(fieldWords, columns);

  if (!matchedCol) {
    if (columns.length > 0) {
      return {
        text: `I couldn't find a field matching "${rawField}" in the ${context.lastQueryName} results. Available fields are: **${columns.join(', ')}**`,
        suggestions: columns.slice(0, 4).map((c) => `what is ${c}`),
        sessionId: context.sessionId,
        intent: 'followup.field',
        confidence: classification.confidence,
      };
    }
    return null;
  }

  const apiData = context.lastApiResult as { data?: Record<string, unknown>[] };
  const rows = apiData.data || [];
  if (rows.length === 0) return null;

  if (rows.length === 1) {
    const value = rows[0][matchedCol];
    return {
      text: `The **${matchedCol}** from the ${context.lastQueryName} result is: **${value ?? 'N/A'}**`,
      suggestions: columns
        .filter((c) => c !== matchedCol)
        .slice(0, 4)
        .map((c) => `what is ${c}`),
      sessionId: context.sessionId,
      intent: 'followup.field',
      confidence: 1,
    };
  }

  const values = rows.slice(0, 10).map((r) => String(r[matchedCol] ?? 'N/A'));
  const moreText = rows.length > 10 ? ` (showing first 10 of ${rows.length})` : '';
  return {
    text: `The **${matchedCol}** values from ${context.lastQueryName}${moreText}:\n${values.map((v, i) => `${i + 1}. ${v}`).join('\n')}`,
    suggestions: columns
      .filter((c) => c !== matchedCol)
      .slice(0, 4)
      .map((c) => `what is ${c}`),
    sessionId: context.sessionId,
    intent: 'followup.field',
    confidence: 1,
  };
}

/**
 * Handle filter follow-up from the default (unknown intent) case:
 * when user says "filter by region US" and NLP didn't classify as query.execute.
 */
export async function handleFilterFollowUp(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
  incomingHeaders?: Record<string, string>
): Promise<BotResponse | null> {
  if (!context.lastQueryName) return null;

  const userText = getLastUserText(context);
  const isFilterRequest = FILTER_FOLLOWUP_PATTERN.test(userText);
  if (!isFilterRequest) return null;

  const nlpFilters = extractFilters(classification.entities);
  const textFilters = parseFilterFromText(userText);
  const filters = mergeFilters(nlpFilters, textFilters);
  if (Object.keys(filters).length === 0) return null;

  logger.info({ lastQuery: context.lastQueryName, filters, nlpFilters, textFilters }, 'Re-running last query with follow-up filters (default case)');
  return rerunLastQueryWithFilters(context, filters, classification, queryService, incomingHeaders);
}

/**
 * Handle data operation follow-ups (group-by, sort, summary, top-N) dispatched from the default case.
 * Returns the first matching operation result, or null.
 */
export function handleDataOperation(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  const groupByResult = handleGroupByFollowUp(classification, context);
  if (groupByResult) return groupByResult;
  const sortResult = handleSortFollowUp(classification, context);
  if (sortResult) return sortResult;
  const summaryResult = handleSummaryFollowUp(classification, context);
  if (summaryResult) return summaryResult;
  const topNResult = handleTopNFollowUp(classification, context);
  if (topNResult) return topNResult;
  const compareResult = handleValueCompareFollowUp(classification, context);
  if (compareResult) return compareResult;
  const aggResult = handleAggregationFollowUp(classification, context);
  if (aggResult) return aggResult;
  // Data-aware lookup: search actual row values for user's question
  const lookupResult = handleDataLookup(classification, context);
  if (lookupResult) return lookupResult;
  return null;
}

/**
 * Handle data-aware lookup: answer questions by searching actual row values.
 * Handles patterns like:
 *   "what is the status of Book X" → find rows where any column contains "Book X", show status
 *   "APAC books opened" → filter rows matching "APAC" and "opened", show results
 *   "show me rows for APAC" → filter by data value
 */
export function handleDataLookup(
  classification: ClassificationResult,
  context: ConversationContext
): BotResponse | null {
  if (!context.lastApiResult || !context.lastQueryName) return null;

  const csvData = extractCsvDataFromContext(context);
  if (!csvData || csvData.rows.length === 0) return null;

  const userText = getLastUserText(context);
  const lower = userText.toLowerCase().trim();

  // Pattern A: "what is the <column> of <value>" or "status of Book X"
  const ofMatch = lower.match(
    /(?:what(?:'s|\s+is|\s+are)?|show(?:\s+me)?|get|tell\s+me)\s+(?:the\s+)?(.+?)\s+(?:of|for)\s+(.+)/i
  );
  if (ofMatch) {
    const colHint = ofMatch[1].trim();
    const valueHint = ofMatch[2].trim();
    return lookupByValue(csvData, colHint, valueHint, context);
  }

  // Pattern B: free-form value search — extract meaningful words and search data
  // e.g., "APAC books opened", "show opened APAC books"
  // Skip if it matches other follow-up patterns (group by, sort, etc.)
  if (GROUP_BY_PATTERN.test(lower) || SORT_PATTERN.test(lower)
    || SUMMARY_PATTERN.test(lower) || TOP_BOTTOM_PATTERN.test(lower)
    || AGGREGATION_PATTERN.test(lower) || /\b(filter|where)\s+\w+\s*[=><]/i.test(lower)) {
    return null;
  }

  // Extract search terms by removing stop words and common noise
  const searchStopWords = new Set([
    'what', 'is', 'are', 'the', 'a', 'an', 'of', 'for', 'from', 'in', 'with',
    'show', 'me', 'get', 'find', 'tell', 'give', 'list', 'all', 'my', 'about',
    'how', 'many', 'much', 'does', 'do', 'can', 'you', 'i', 'to', 'it', 'that',
    'this', 'those', 'these', 'any', 'some', 'where', 'which', 'who', 'whom',
    'run', 'query', 'data', 'result', 'results', 'please', 'just', 'only',
  ]);
  const searchTerms = lower
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !searchStopWords.has(w));

  if (searchTerms.length === 0) return null;

  // Try to find rows where any column value matches the search terms
  const matchedRows = csvData.rows.filter((row) => {
    const rowValues = Object.values(row).map((v) => String(v ?? '').toLowerCase());
    const rowText = rowValues.join(' ');
    // Require all search terms to appear somewhere in the row
    return searchTerms.every((term) => rowText.includes(term));
  });

  if (matchedRows.length === 0) {
    // Try partial match: require at least 60% of terms to match
    const threshold = Math.max(1, Math.ceil(searchTerms.length * 0.6));
    const partialMatches = csvData.rows.filter((row) => {
      const rowText = Object.values(row).map((v) => String(v ?? '').toLowerCase()).join(' ');
      const matchCount = searchTerms.filter((term) => rowText.includes(term)).length;
      return matchCount >= threshold;
    });

    if (partialMatches.length === 0) return null;
    if (partialMatches.length > 20) return null; // Too many results, not specific enough

    logger.info({ query: context.lastQueryName, terms: searchTerms, matched: partialMatches.length }, 'Data lookup: partial match');

    return {
      text: `Found ${partialMatches.length} matching row(s) in "${context.lastQueryName}" for "${searchTerms.join(' ')}":`,
      richContent: {
        type: 'csv_table',
        data: { headers: csvData.headers, rows: partialMatches, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: partialMatches.length },
      },
      suggestions: [
        'summarize',
        ...csvData.headers.slice(0, 2).map((h) => `group by ${h}`),
      ],
      sessionId: context.sessionId,
      intent: 'followup.data_lookup',
      confidence: 1,
    };
  }

  if (matchedRows.length > 20) return null; // Too many — not specific enough

  logger.info({ query: context.lastQueryName, terms: searchTerms, matched: matchedRows.length }, 'Data lookup: exact match');

  return {
    text: `Found ${matchedRows.length} matching row(s) in "${context.lastQueryName}" for "${searchTerms.join(' ')}":`,
    richContent: {
      type: 'csv_table',
      data: { headers: csvData.headers, rows: matchedRows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: matchedRows.length },
    },
    suggestions: [
      'summarize',
      ...csvData.headers.slice(0, 2).map((h) => `group by ${h}`),
    ],
    sessionId: context.sessionId,
    intent: 'followup.data_lookup',
    confidence: 1,
  };
}

/**
 * Look up specific column value(s) for rows matching a search value.
 * e.g., "what is the status of Book X" → find rows containing "Book X", return their "status" column.
 */
function lookupByValue(
  csvData: CsvData,
  colHint: string,
  valueHint: string,
  context: ConversationContext,
): BotResponse | null {
  // Find the target column (e.g., "status")
  const targetCol = csvData.headers.find((h) => h.toLowerCase() === colHint.toLowerCase())
    ?? csvData.headers.find((h) => h.toLowerCase().replace(/[_\s]/g, '') === colHint.replace(/[_\s]/g, '').toLowerCase())
    ?? csvData.headers.find((h) => {
      const hWords = h.toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2').split(/[_\s]+/);
      return hWords.includes(colHint.toLowerCase());
    })
    ?? csvData.headers.find((h) => h.toLowerCase().includes(colHint.toLowerCase()));

  // Search for rows containing the value hint in any column
  const valueLower = valueHint.toLowerCase();
  const matchedRows = csvData.rows.filter((row) => {
    return Object.values(row).some((v) =>
      String(v ?? '').toLowerCase().includes(valueLower)
    );
  });

  if (matchedRows.length === 0) {
    return {
      text: `No rows found in "${context.lastQueryName}" matching "${valueHint}".`,
      suggestions: ['summarize', ...csvData.headers.slice(0, 3).map((h) => `group by ${h}`)],
      sessionId: context.sessionId,
      intent: 'followup.data_lookup',
      confidence: 1,
    };
  }

  // If we found a target column, show just that column's values
  if (targetCol && matchedRows.length <= 10) {
    const values = matchedRows.map((row) => {
      // Build a label from the first text column that contains the search value
      const labelCol = csvData.headers.find((h) =>
        h !== targetCol && String(row[h] ?? '').toLowerCase().includes(valueLower)
      ) || csvData.headers[0];
      return `**${row[labelCol]}** → ${targetCol}: **${row[targetCol] ?? 'N/A'}**`;
    });
    return {
      text: `Here is the **${targetCol}** for "${valueHint}" from "${context.lastQueryName}":\n${values.join('\n')}`,
      suggestions: csvData.headers.filter((h) => h !== targetCol).slice(0, 3).map((h) => `what is ${h} of ${valueHint}`),
      sessionId: context.sessionId,
      intent: 'followup.data_lookup',
      confidence: 1,
    };
  }

  // Otherwise show full matching rows as a table
  const displayRows = matchedRows.slice(0, 20);
  return {
    text: `Found ${matchedRows.length} row(s) matching "${valueHint}" in "${context.lastQueryName}":`,
    richContent: {
      type: 'csv_table',
      data: { headers: csvData.headers, rows: displayRows, filePath: (context.lastApiResult as Record<string, unknown>)?.filePath, rowCount: displayRows.length },
    },
    suggestions: [
      'summarize',
      ...csvData.headers.slice(0, 2).map((h) => `group by ${h}`),
    ],
    sessionId: context.sessionId,
    intent: 'followup.data_lookup',
    confidence: 1,
  };
}

// ── Private helpers ─────────────────────────────────────────────────

/**
 * Fuzzy-match user's field words against actual column names.
 */
function fuzzyMatchColumn(fieldWords: string[], columns: string[]): string | null {
  const joined = fieldWords.join('');
  const joinedSpaced = fieldWords.join(' ');

  for (const col of columns) {
    const colLower = col.toLowerCase();
    const colNoUnderscore = colLower.replace(/_/g, '');

    if (colLower === joinedSpaced || colLower === joined) return col;
    if (colNoUnderscore === joined) return col;
    if (colLower.includes(joined) || joined.includes(colLower)) return col;
    for (const word of fieldWords) {
      if (colLower === word || colNoUnderscore === word) return col;
    }
  }

  for (const col of columns) {
    const colLower = col.toLowerCase().replace(/_/g, '');
    for (const word of fieldWords) {
      if (word.length >= 3 && (colLower.includes(word) || word.includes(colLower))) {
        return col;
      }
    }
  }

  return null;
}
