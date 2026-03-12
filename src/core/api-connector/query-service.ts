import { promises as fs } from 'fs';
import path from 'path';
import { ApiClient } from './api-client';
import { QuerySchema, QueryResultSchema } from './types';
import { fetchBamToken } from './bam-auth';
import { QueryNotFoundError, FileReadError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { resolveDateRange, isDatePreset } from '@/lib/date-resolver';
import { searchDocument, type DocumentSection } from './document-search';
import { parseCsv, computeAggregation, parseAggregationFromText, groupBy, sortData, type AggregationResult, type GroupByResult } from './csv-analyzer';
import filterConfig from '@/config/filter-config.json';
import type { Query, QueryResult, QueryFilters, FilterBinding } from './types';

export interface QueryExecutionResult {
  type: 'api' | 'url' | 'document' | 'csv';
  durationMs?: number;
  apiResult?: QueryResult;
  urlResult?: { title: string; url: string };
  documentResult?: {
    content: string;
    filePath: string;
    format: string;
    searchResults?: DocumentSection[];
    searchKeywords?: string[];
  };
  csvResult?: {
    headers: string[];
    rows: Record<string, string | number>[];
    filePath: string;
    rowCount: number;
    aggregation?: AggregationResult;
    groupByResult?: GroupByResult;
  };
}

export interface QueryExecuteOptions {
  searchKeywords?: string[];
  aggregationText?: string;
  groupByColumn?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface MultiQueryResult {
  queryName: string;
  result: QueryExecutionResult;
}

export class QueryService {
  private sources: string[];

  constructor(private apiClient: ApiClient, sources?: string[]) {
    this.sources = sources ?? [];
  }

  async getQueries(): Promise<Query[]> {
    const raw = await this.apiClient.get<unknown[]>('queries', {
      cacheTtl: 60_000,
    });
    let queries = raw.map((q) => QuerySchema.parse(q));

    if (this.sources.length > 0) {
      queries = queries.filter(
        (q) => q.source && this.sources.includes(q.source)
      );
    }

    return queries;
  }

  async getQueryNames(): Promise<string[]> {
    const queries = await this.getQueries();
    return queries.map((q) => q.name);
  }

  /**
   * Execute a query by name.
   *
   * @param queryName - The query to execute
   * @param filters - Optional query filters
   * @param options - Search/aggregation options
   * @param incomingHeaders - Headers from the user's original request (for Windows auth forwarding)
   */
  async executeQuery(
    queryName: string,
    filters?: QueryFilters,
    options?: QueryExecuteOptions,
    incomingHeaders?: Record<string, string>
  ): Promise<QueryExecutionResult> {
    const startTime = performance.now();
    const queries = await this.getQueries();
    const query = queries.find(
      (q) => q.name.toLowerCase() === queryName.toLowerCase()
    );
    if (!query) throw new QueryNotFoundError(queryName);

    const queryType = query.type ?? 'api';

    let result: QueryExecutionResult;
    switch (queryType) {
      case 'url':
        result = this.executeUrlQuery(query);
        break;
      case 'document':
        result = await this.executeDocumentQuery(query, options);
        break;
      case 'csv':
        result = await this.executeCsvQuery(query, options, filters);
        break;
      case 'api':
      default:
        result = await this.executeApiQuery(query, filters, incomingHeaders);
        break;
    }

    result.durationMs = Math.round(performance.now() - startTime);

    // Fire-and-forget stats recording
    this.recordStat(queryName, true, result.durationMs, filters).catch(() => {});

    return result;
  }

  private async recordStat(
    queryName: string,
    success: boolean,
    durationMs: number,
    filters?: QueryFilters,
    error?: string
  ): Promise<void> {
    try {
      await fetch(`${this.getStatsUrl()}/api/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryName, success, durationMs, filters: filters || {}, error }),
      });
    } catch {
      // Silently fail — stats are non-critical
    }
  }

  private getStatsUrl(): string {
    // Use the Next.js server URL for internal stats endpoint
    const port = process.env.PORT || '3000';
    return `http://localhost:${port}`;
  }

  private async executeApiQuery(
    query: Query,
    filters?: QueryFilters,
    incomingHeaders?: Record<string, string>
  ): Promise<QueryExecutionResult> {
    const filterBindings: FilterBinding[] = query.filters ?? [];
    const resolved = filters ? this.resolveFilters(filters) : undefined;
    const bodyFilters: Record<string, string> = {};
    const paramFilters: Record<string, string> = {};
    let urlPath = query.endpoint
      ? query.endpoint.replace(/^\//, '')
      : `queries/${query.id}/execute`;

    if (resolved && Object.keys(resolved).length > 0) {
      for (const [key, value] of Object.entries(resolved)) {
        // For resolved date keys like date_range_start, find binding for base key
        const baseKey = key.replace(/_start$|_end$/, '');
        const binding = filterBindings.find((f) => f.key === baseKey || f.key === key);
        const bindingType = binding?.binding ?? 'body';

        if (bindingType === 'path') {
          urlPath = urlPath.replace(`{${key}}`, encodeURIComponent(value));
        } else if (bindingType === 'query_param') {
          paramFilters[key] = value;
        } else {
          bodyFilters[key] = value;
        }
      }
    }

    // Build per-query auth headers based on authType
    const authHeaders = await this.resolveQueryAuth(query, incomingHeaders);

    const body = Object.keys(bodyFilters).length > 0 ? { filters: bodyFilters } : {};
    const params = Object.keys(paramFilters).length > 0 ? paramFilters : undefined;
    const raw = await this.apiClient.post(urlPath, body, params, authHeaders);
    const apiResult = QueryResultSchema.parse(raw);
    return { type: 'api', apiResult };
  }

  /**
   * Resolve authentication headers for a query based on its authType.
   *
   * - none/bearer: No extra headers (uses global API_TOKEN from env)
   * - windows: Forward the user's Authorization/Cookie headers (pass-through)
   * - bam: Fetch a BAM token first, then add X-BAM-Token header
   */
  private async resolveQueryAuth(
    query: Query,
    incomingHeaders?: Record<string, string>
  ): Promise<Record<string, string> | undefined> {
    const authType = query.authType ?? 'none';

    switch (authType) {
      case 'windows': {
        // Forward the user's Windows auth headers (Authorization, Cookie)
        if (!incomingHeaders) {
          logger.warn({ query: query.name }, 'Windows auth query but no incoming headers available');
          return undefined;
        }
        const forwarded: Record<string, string> = {};
        if (incomingHeaders['authorization']) {
          forwarded['Authorization'] = incomingHeaders['authorization'];
        }
        if (incomingHeaders['cookie']) {
          forwarded['Cookie'] = incomingHeaders['cookie'];
        }
        logger.debug(
          { query: query.name, hasAuth: !!forwarded['Authorization'], hasCookie: !!forwarded['Cookie'] },
          'Windows auth: forwarding user headers'
        );
        return Object.keys(forwarded).length > 0 ? forwarded : undefined;
      }

      case 'bam': {
        // Step 1: Fetch BAM token
        if (!query.bamTokenUrl) {
          logger.error({ query: query.name }, 'BAM auth query missing bamTokenUrl');
          return undefined;
        }

        // Forward user headers to BAM token endpoint too (may need SSO context)
        const forwardHeaders: Record<string, string> = {};
        if (incomingHeaders?.['authorization']) {
          forwardHeaders['Authorization'] = incomingHeaders['authorization'];
        }
        if (incomingHeaders?.['cookie']) {
          forwardHeaders['Cookie'] = incomingHeaders['cookie'];
        }

        const bamResponse = await fetchBamToken(
          query.bamTokenUrl,
          Object.keys(forwardHeaders).length > 0 ? forwardHeaders : undefined
        );

        logger.debug(
          { query: query.name, hasRedirectURL: !!bamResponse.redirectURL },
          'BAM auth: token acquired'
        );

        // Step 2: Use bamToken as X-BAM-Token header
        return { 'X-BAM-Token': bamResponse.bamToken };
      }

      case 'bearer':
      case 'none':
      default:
        // Use global API_TOKEN (handled by ApiClient.buildHeaders())
        return undefined;
    }
  }

  private resolveFilters(filters: QueryFilters): QueryFilters {
    const resolved: QueryFilters = {};
    const dateFormat = this.getDateFormat();

    for (const [key, value] of Object.entries(filters)) {
      if (isDatePreset(value)) {
        const range = resolveDateRange(value, dateFormat);
        resolved[`${key}_start`] = range.start;
        resolved[`${key}_end`] = range.end;
        logger.debug({ key, preset: value, range, dateFormat }, 'Resolved date preset');
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private getDateFormat(): string {
    const cfg = (filterConfig as Record<string, unknown>).filters as Record<string, Record<string, unknown>> | undefined;
    const dateRangeCfg = cfg?.date_range;
    return (dateRangeCfg?.dateFormat as string) || 'YYYY-MM-DD';
  }

  private executeUrlQuery(query: Query): QueryExecutionResult {
    if (!query.url) {
      throw new QueryNotFoundError(`URL-type query "${query.name}" has no URL configured`);
    }
    return {
      type: 'url',
      urlResult: { title: query.name, url: query.url },
    };
  }

  private async executeDocumentQuery(
    query: Query,
    options?: QueryExecuteOptions
  ): Promise<QueryExecutionResult> {
    const { content, filePath, format } = await this.readFile(query);

    if (options?.searchKeywords && options.searchKeywords.length > 0) {
      const searchResults = searchDocument(content, options.searchKeywords);
      return {
        type: 'document',
        documentResult: {
          content,
          filePath,
          format,
          searchResults,
          searchKeywords: options.searchKeywords,
        },
      };
    }

    return {
      type: 'document',
      documentResult: { content, filePath, format },
    };
  }

  private async executeCsvQuery(
    query: Query,
    options?: QueryExecuteOptions,
    filters?: QueryFilters
  ): Promise<QueryExecutionResult> {
    const { content, filePath } = await this.readFile(query);
    let csvData = parseCsv(content);

    // Apply filters: match filter keys against CSV column names (case-insensitive)
    // Rows are Record<string, string|number> objects keyed by header name
    if (filters && Object.keys(filters).length > 0) {
      // Build a map: lowercase filter key → matching header name in CSV
      const filterToHeader: Record<string, string> = {};
      for (const filterKey of Object.keys(filters)) {
        const match = csvData.headers.find((h) => h.toLowerCase() === filterKey.toLowerCase());
        if (match) filterToHeader[filterKey] = match;
      }

      if (Object.keys(filterToHeader).length > 0) {
        const originalCount = csvData.rows.length;
        const filteredRows = csvData.rows.filter((row) => {
          for (const [filterKey, filterVal] of Object.entries(filters)) {
            const header = filterToHeader[filterKey];
            if (!header) continue; // filter key doesn't match a column, skip
            const cellVal = String(row[header] ?? '').toLowerCase();
            if (cellVal !== filterVal.toLowerCase()) return false;
          }
          return true;
        });
        csvData = { headers: csvData.headers, rows: filteredRows };
        logger.debug({ filters, original: originalCount, filtered: filteredRows.length }, 'CSV filter applied');
      }
    }

    // Inline group-by: "run sales_data group by region"
    if (options?.groupByColumn) {
      const gbResult = groupBy(csvData, options.groupByColumn);
      if (gbResult) {
        return {
          type: 'csv',
          csvResult: {
            headers: csvData.headers,
            rows: csvData.rows,
            filePath,
            rowCount: csvData.rows.length,
            groupByResult: gbResult,
          },
        };
      }
    }

    // Inline sort: "run sales_data sort by revenue desc"
    if (options?.sortColumn) {
      csvData = sortData(csvData, { column: options.sortColumn, direction: options.sortDirection ?? 'desc' });
    }

    if (options?.aggregationText) {
      const aggRequest = parseAggregationFromText(options.aggregationText, csvData.headers);
      if (aggRequest) {
        const aggregation = computeAggregation(csvData, aggRequest);
        return {
          type: 'csv',
          csvResult: {
            headers: csvData.headers,
            rows: csvData.rows,
            filePath,
            rowCount: csvData.rows.length,
            aggregation,
          },
        };
      }
    }

    return {
      type: 'csv',
      csvResult: {
        headers: csvData.headers,
        rows: csvData.rows,
        filePath,
        rowCount: csvData.rows.length,
      },
    };
  }

  private async readFile(query: Query): Promise<{ content: string; filePath: string; format: string }> {
    if (!query.filePath) {
      throw new FileReadError(query.name, 'No file path configured');
    }

    const resolved = path.resolve(process.cwd(), query.filePath);
    if (!resolved.startsWith(process.cwd())) {
      throw new FileReadError(query.filePath, 'Path outside project directory');
    }

    try {
      const content = await fs.readFile(resolved, 'utf-8');
      const format = path.extname(query.filePath).toLowerCase().replace('.', '') || 'txt';
      return { content, filePath: query.filePath, format };
    } catch (error) {
      logger.error({ error, filePath: query.filePath }, 'File read failed');
      throw new FileReadError(query.filePath, 'File not found or unreadable');
    }
  }

  async executeMultipleQueries(
    queryNames: string[],
    filters?: QueryFilters,
    incomingHeaders?: Record<string, string>
  ): Promise<MultiQueryResult[]> {
    const results = await Promise.allSettled(
      queryNames.map(async (name) => {
        const result = await this.executeQuery(name, filters, undefined, incomingHeaders);
        return { queryName: name, result };
      })
    );

    const successful: MultiQueryResult[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        successful.push(r.value);
      } else {
        logger.error({ error: r.reason }, 'Multi-query: one query failed');
      }
    }
    return successful;
  }

  async getEstimation(
    queryName: string
  ): Promise<{ estimatedDuration: number; description: string }> {
    const queries = await this.getQueries();
    const query = queries.find(
      (q) => q.name.toLowerCase() === queryName.toLowerCase()
    );
    if (!query) throw new QueryNotFoundError(queryName);

    return {
      estimatedDuration: query.estimatedDuration ?? 0,
      description: query.description ?? 'No description available.',
    };
  }

  async findRelevantUrls(
    topic: string
  ): Promise<Array<{ title: string; url: string }>> {
    const queries = await this.getQueries();
    return queries
      .filter(
        (q) =>
          q.url &&
          (q.name.toLowerCase().includes(topic.toLowerCase()) ||
            q.description?.toLowerCase().includes(topic.toLowerCase()))
      )
      .map((q) => ({ title: q.name, url: q.url! }));
  }

  // ── Knowledge Search (cross-document) ──────────────────────────────

  async searchAllDocuments(
    keywords: string[],
    maxResultsPerDoc: number = 3,
    maxTotalSections: number = 8
  ): Promise<KnowledgeSearchResult[]> {
    const queries = await this.getQueries();
    const docQueries = queries.filter((q) => (q.type ?? 'api') === 'document');

    if (docQueries.length === 0) return [];

    // Read all documents in parallel
    const readResults = await Promise.allSettled(
      docQueries.map(async (q) => {
        const { content } = await this.readFile(q);
        return { query: q, content };
      })
    );

    const results: KnowledgeSearchResult[] = [];

    for (const r of readResults) {
      if (r.status !== 'fulfilled') continue;
      const { query, content } = r.value;

      const sections = searchDocument(content, keywords, maxResultsPerDoc);
      if (sections.length === 0) continue;

      results.push({
        queryName: query.name,
        queryDescription: query.description ?? '',
        filePath: query.filePath ?? '',
        referenceUrl: query.url,
        sections,
      });
    }

    // Sort documents by their best section score (descending)
    results.sort((a, b) => {
      const maxA = Math.max(...a.sections.map((s) => s.score));
      const maxB = Math.max(...b.sections.map((s) => s.score));
      return maxB - maxA;
    });

    // Trim total sections to maxTotalSections
    let total = 0;
    for (const res of results) {
      const remaining = maxTotalSections - total;
      if (remaining <= 0) {
        res.sections = [];
      } else if (res.sections.length > remaining) {
        res.sections = res.sections.slice(0, remaining);
      }
      total += res.sections.length;
    }

    return results.filter((r) => r.sections.length > 0);
  }
}

export interface KnowledgeSearchResult {
  queryName: string;
  queryDescription: string;
  filePath: string;
  referenceUrl?: string;
  sections: DocumentSection[];
}
