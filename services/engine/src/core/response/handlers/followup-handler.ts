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
  return null;
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
