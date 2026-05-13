import { Router, Request, Response } from "express";
import { getGroupConfig, getGroupConfigs } from "@/config/group-config";
import { ApiClient } from "@/core/api-connector/api-client";
import { QueryService } from "@/core/api-connector/query-service";
import {
  groupBy,
  groupByMultiple,
  sortData,
  computeAggregation,
  parseAggregationFromText,
  detectColumnTypes,
  computeSummary,
  findMatchingHeader,
  type CsvData,
  type ColumnConfig,
} from "@/core/api-connector/csv-analyzer";
import { getAnomalyDetector } from "@/core/anomaly/anomaly-detector";
import { buildAutoInsights } from "@/core/insights/auto-insights";
import { findDuplicates } from "@/core/ml/duplicates";
import { getInteractionTracker } from "@/core/recommendations/interaction-tracker";
import { analyzeMissing } from "@/core/ml/missing-analysis";
import { forecast } from "@/core/ml/forecast";
import { loadSchema } from "@/core/schema/registry";
import { detectDrift } from "@/core/schema/drift-detector";
import { logger } from "@/lib/logger";

export const dataApiRouter = Router();

/* ─── Parsed CSV cache (keyed by queryName+groupId) ────────────── */
interface CacheEntry {
  data: CsvData;
  timestamp: number;
  queryName: string;
}
const csvCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(queryName: string, groupId: string): string {
  return `${groupId}::${queryName}`;
}

async function getCsvData(
  queryName: string,
  groupId: string,
): Promise<CsvData> {
  const key = getCacheKey(queryName, groupId);
  const cached = csvCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const groupConfig = getGroupConfig(groupId);
  const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
  const queryService = new QueryService(apiClient, groupConfig.sources);
  const result = await queryService.executeQuery(queryName);

  if (!result.csvResult) {
    throw new Error(`Query "${queryName}" did not return CSV data`);
  }

  const data: CsvData = {
    headers: result.csvResult.headers,
    rows: result.csvResult.rows,
  };

  csvCache.set(key, { data, timestamp: Date.now(), queryName });

  // Evict old entries if cache grows beyond 50
  if (csvCache.size > 50) {
    const oldest = Array.from(csvCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );
    for (let i = 0; i < 10; i++) {
      csvCache.delete(oldest[i][0]);
    }
  }

  return data;
}

/* ─── GET /api/data/sources ───────────────────────────────────── *
 *
 * When called with `?userName=X`, the response list is reordered so
 * sources the caller has used recently bubble to the top — same
 * mechanism as the chat-history tracker. Without `userName` the order
 * is the catalog's natural order (current behaviour preserved).
 */
dataApiRouter.get("/sources", async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
    const userName =
      typeof req.query.userName === "string" ? req.query.userName : "";
    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(apiClient, groupConfig.sources);
    const queries = await queryService.getQueries();

    const csvSources = queries
      .filter((q) => q.type === "csv" || q.type === "xlsx")
      .map((q) => ({
        name: q.name,
        description: q.description ?? "",
        type: q.type,
        filePath: q.filePath,
        filters: q.filters?.map((f) => f.key) ?? [],
        columnConfig: q.columnConfig,
      }));

    // Personalised ordering — promote sources the caller has touched
    // recently. We reuse the interaction-tracker file the chat path
    // already maintains, so a query the user ran in chat shows up
    // ahead of unfamiliar ones in the Data Explorer picker too.
    let recentNames = new Set<string>();
    if (userName) {
      try {
        const tracker = getInteractionTracker(groupId);
        const interactions = await tracker.readAll();
        const counts = new Map<string, number>();
        const recent = interactions
          .filter((i) => i.userId === userName)
          .slice(-200); // bounded scan
        for (const i of recent) {
          counts.set(i.queryName, (counts.get(i.queryName) ?? 0) + 1);
        }
        recentNames = new Set(counts.keys());
        if (counts.size > 0) {
          csvSources.sort((a, b) => {
            const ca = counts.get(a.name) ?? 0;
            const cb = counts.get(b.name) ?? 0;
            if (ca !== cb) return cb - ca;
            return a.name.localeCompare(b.name);
          });
        }
      } catch {
        /* personalisation best-effort */
      }
    }

    // Also list all available groups
    const groups = Object.keys(getGroupConfigs());

    return res.json({
      sources: csvSources.map((s) => ({
        ...s,
        ...(recentNames.has(s.name) ? { recent: true } : {}),
      })),
      groups,
    });
  } catch (error) {
    logger.error({ error }, "Data sources error");
    return res.status(500).json({ error: "Failed to list data sources" });
  }
});

/* ─── POST /api/data/sources/view ────────────────────────────────
 *
 * Lightweight ping the Data Explorer fires when the user selects a
 * source. Records the interaction in the same file the chat path
 * uses, so usage history is unified across surfaces.
 */
dataApiRouter.post("/sources/view", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const groupId = typeof body.groupId === "string" ? body.groupId : "default";
    const userName = typeof body.userName === "string" ? body.userName : "";
    const queryName = typeof body.queryName === "string" ? body.queryName : "";
    if (!userName || !queryName) {
      return res.json({ recorded: false });
    }
    await getInteractionTracker(groupId).record(userName, queryName);
    return res.json({ recorded: true });
  } catch (error) {
    logger.error({ error }, "sources/view: record failed");
    return res.json({ recorded: false });
  }
});

/* ─── GET /api/data/schema/:queryName ──────────────────────────── */
dataApiRouter.get("/schema/:queryName", async (req: Request, res: Response) => {
  try {
    const { queryName } = req.params;
    const groupId = (req.query.groupId as string) || "default";
    const data = await getCsvData(queryName, groupId);

    const columnTypes = detectColumnTypes(data.headers, data.rows);
    const summary = computeSummary(data);

    const schema = data.headers.map((h) => {
      const meta = columnTypes.find((c) => c.column === h);
      const colSummary = summary.columns.find((c) => c.column === h);
      return {
        name: h,
        type: meta?.detectedType ?? "string",
        distinctCount: colSummary?.uniqueValues ?? 0,
        nullCount: 0,
        sampleValues: colSummary?.topValues?.slice(0, 5) ?? [],
      };
    });

    return res.json({
      queryName,
      rowCount: data.rows.length,
      columnCount: data.headers.length,
      schema,
    });
  } catch (error) {
    logger.error({ error }, "Schema error");
    return res.status(500).json({ error: "Failed to get schema" });
  }
});

/* ─── GET /api/data/distinct/:queryName/:column ────────────────── */
dataApiRouter.get(
  "/distinct/:queryName/:column",
  async (req: Request, res: Response) => {
    try {
      const { queryName, column } = req.params;
      const groupId = (req.query.groupId as string) || "default";
      const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
      const data = await getCsvData(queryName, groupId);

      const header = findMatchingHeader(column, data.headers);
      if (!header) {
        return res.status(404).json({ error: `Column "${column}" not found` });
      }

      const values = Array.from(
        new Set(
          data.rows.map((r) => r[header]).filter((v) => v != null && v !== ""),
        ),
      ).sort((a, b) => String(a).localeCompare(String(b)));

      return res.json({
        column: header,
        values: values.slice(0, limit),
        totalDistinct: values.length,
      });
    } catch (error) {
      logger.error({ error }, "Distinct values error");
      return res.status(500).json({ error: "Failed to get distinct values" });
    }
  },
);

/* ─── POST /api/data/query ─────────────────────────────────────── */
dataApiRouter.post("/query", async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const {
      queryName,
      groupId = "default",
      filters,
      groupBy: groupByCol,
      sort,
      aggregation,
      columns,
      page = 1,
      pageSize = 50,
      search,
    } = req.body as {
      queryName: string;
      groupId?: string;
      filters?: Record<string, string | string[]>;
      groupBy?: string | string[];
      sort?: { column: string; direction: "asc" | "desc" };
      aggregation?: string;
      columns?: string[];
      page?: number;
      pageSize?: number;
      search?: string;
    };

    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }

    const clampedPageSize = Math.min(Math.max(pageSize, 1), 1000);
    const clampedPage = Math.max(page, 1);

    // 1. Get parsed CSV data (cached)
    const rawData = await getCsvData(queryName, groupId);

    // 2. Apply filters
    let filteredRows = rawData.rows;
    if (filters && Object.keys(filters).length > 0) {
      filteredRows = filteredRows.filter((row) => {
        for (const [key, value] of Object.entries(filters)) {
          const header = findMatchingHeader(key, rawData.headers);
          if (!header) continue;
          const cellVal = String(row[header] ?? "").toLowerCase();
          if (Array.isArray(value)) {
            // OR logic for multi-value filters
            if (!value.some((v) => cellVal === String(v).toLowerCase())) {
              return false;
            }
          } else if (value) {
            if (cellVal !== String(value).toLowerCase()) return false;
          }
        }
        return true;
      });
    }

    // 3. Apply full-text search
    if (search && search.trim()) {
      const s = search.toLowerCase();
      filteredRows = filteredRows.filter((row) =>
        rawData.headers.some((h) =>
          String(row[h] ?? "")
            .toLowerCase()
            .includes(s),
        ),
      );
    }

    let filteredData: CsvData = {
      headers: rawData.headers,
      rows: filteredRows,
    };

    // 4. Group-by
    let groupByResult = undefined;
    if (groupByCol) {
      // Get column config from query if available
      const groupConfig = getGroupConfig(groupId);
      const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
      const qs = new QueryService(apiClient, groupConfig.sources);
      const allQueries = await qs.getQueries();
      const queryDef = allQueries.find((q) => q.name === queryName);
      const colConfig: ColumnConfig | undefined = queryDef?.columnConfig;

      if (Array.isArray(groupByCol)) {
        groupByResult = groupByMultiple(filteredData, groupByCol, colConfig);
      } else {
        groupByResult = groupBy(filteredData, groupByCol, colConfig);
      }
    }

    // 5. Sort
    if (sort?.column) {
      filteredData = sortData(filteredData, {
        column: sort.column,
        direction: sort.direction || "asc",
      });
    }

    // 6. Aggregation
    let aggregationResult = undefined;
    if (aggregation) {
      const parsed = parseAggregationFromText(
        aggregation,
        filteredData.headers,
      );
      if (parsed) {
        aggregationResult = computeAggregation(filteredData, parsed);
      }
    }

    // 7. Column projection
    let headers = filteredData.headers;
    let rows = filteredData.rows;
    if (columns && columns.length > 0) {
      const resolved = columns
        .map((c) => findMatchingHeader(c, headers))
        .filter(Boolean) as string[];
      if (resolved.length > 0) {
        headers = resolved;
        rows = rows.map((r) => {
          const projected: Record<string, string | number> = {};
          for (const h of resolved) {
            projected[h] = r[h];
          }
          return projected;
        });
      }
    }

    // 8. Pagination
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / clampedPageSize);
    const offset = (clampedPage - 1) * clampedPageSize;
    const pagedRows = rows.slice(offset, offset + clampedPageSize);

    // 9. Schema (lightweight — types only, no summary)
    const columnTypes = detectColumnTypes(rawData.headers, rawData.rows);
    const schema = headers.map((h) => {
      const meta = columnTypes.find((c) => c.column === h);
      return { name: h, type: meta?.detectedType ?? "string" };
    });

    // 10. Auto-insights — only on page 1 (first load of a view). Pagination
    //     and follow-up requests don't get re-narrated. Group-by /
    //     aggregation paths skip insights because their output isn't a
    //     plain row set (handled by their own UI affordances).
    const shouldComputeInsights =
      clampedPage === 1 && !groupByCol && !aggregation;
    const insights = shouldComputeInsights
      ? buildAutoInsights(
          { headers, rows: rows as Record<string, string | number>[] },
          undefined,
        )
      : [];

    return res.json({
      headers,
      rows: pagedRows,
      totalRows,
      page: clampedPage,
      pageSize: clampedPageSize,
      totalPages,
      schema,
      groupByResult,
      aggregation: aggregationResult,
      durationMs: Date.now() - start,
      ...(insights.length > 0 && { insights }),
    });
  } catch (error) {
    logger.error({ error }, "Data query error");
    return res.status(500).json({ error: "Query execution failed" });
  }
});

/* ─── POST /api/data/anomalies ────────────────────────────────── */
dataApiRouter.post("/anomalies", async (req: Request, res: Response) => {
  try {
    const {
      queryName,
      groupId = "default",
      filters,
      search,
    } = req.body as {
      queryName: string;
      groupId?: string;
      filters?: Record<string, string | string[]>;
      search?: string;
    };

    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }

    const rawData = await getCsvData(queryName, groupId);

    // Apply filters
    let filteredRows = rawData.rows;
    if (filters && Object.keys(filters).length > 0) {
      filteredRows = filteredRows.filter((row) => {
        for (const [key, value] of Object.entries(filters)) {
          const header = findMatchingHeader(key, rawData.headers);
          if (!header) continue;
          const cellVal = String(row[header] ?? "").toLowerCase();
          if (Array.isArray(value)) {
            if (!value.some((v) => cellVal === String(v).toLowerCase()))
              return false;
          } else if (value) {
            if (cellVal !== String(value).toLowerCase()) return false;
          }
        }
        return true;
      });
    }

    // Apply search
    if (search && search.trim()) {
      const s = search.toLowerCase();
      filteredRows = filteredRows.filter((row) =>
        rawData.headers.some((h) =>
          String(row[h] ?? "")
            .toLowerCase()
            .includes(s),
        ),
      );
    }

    const detector = getAnomalyDetector(groupId);
    const anomalies = await detector.checkAnomalies(queryName, filteredRows);

    return res.json({ anomalies });
  } catch (error) {
    logger.error({ error }, "Anomaly check error");
    return res.json({ anomalies: [] });
  }
});

/* ─── GET /api/data/quality/:queryName ────────────────────────────
 *
 * Unified data quality snapshot used by the Data Explorer "Quality"
 * card. Pulls together signals from four existing modules so the UI
 * makes one request, not four:
 *
 *   - findDuplicates       → exact-row duplicate count
 *   - analyzeMissing       → per-column null %, sorted
 *   - loadSchema/detectDrift → has the column set changed since the last
 *                              baseline? (yes/no + counts)
 *   - getAnomalyDetector   → current anomaly count
 *
 * All four are best-effort: a transient failure on one signal doesn't
 * break the whole response.
 */
dataApiRouter.get(
  "/quality/:queryName",
  async (req: Request, res: Response) => {
    try {
      const queryName = req.params.queryName;
      const groupId =
        typeof req.query.groupId === "string" ? req.query.groupId : "default";
      if (!queryName) {
        return res.status(400).json({ error: "queryName is required" });
      }

      const rawData = await getCsvData(queryName, groupId);

      // 1. Duplicates (exact-match only; the near-dup pass would be
      //    expensive for a card that refreshes on filter changes).
      let duplicateCount = 0;
      try {
        const dup = findDuplicates(rawData, 0); // 0 = exact only
        duplicateCount = dup.totalDuplicates;
      } catch {
        /* best-effort */
      }

      // 2. Missing values — return top-5 worst columns + overall %.
      let missingPercent = 0;
      let topMissingColumns: Array<{ column: string; nullPercent: number }> =
        [];
      try {
        const missing = analyzeMissing(rawData);
        missingPercent = missing.missingPercent;
        topMissingColumns = missing.columns
          .filter((c) => c.nullPercent > 0)
          .sort((a, b) => b.nullPercent - a.nullPercent)
          .slice(0, 5)
          .map((c) => ({ column: c.column, nullPercent: c.nullPercent }));
      } catch {
        /* best-effort */
      }

      // 3. Schema drift — only flagged when there's a stored baseline
      //    AND it differs from the current header set. No prior =
      //    "first observation"; we don't flag drift on a clean slate.
      let driftSummary: {
        hasChange: boolean;
        added: string[];
        removed: string[];
      } | null = null;
      try {
        const prior = await loadSchema(groupId, queryName);
        if (prior) {
          const drift = detectDrift(prior.columns, rawData.headers);
          if (drift) {
            driftSummary = {
              hasChange: drift.hasChange,
              added: drift.added,
              removed: drift.removed,
            };
          }
        }
      } catch {
        /* best-effort */
      }

      // 4. Anomaly count (current snapshot, unfiltered).
      let anomalyCount = 0;
      try {
        const detector = getAnomalyDetector(groupId);
        const anomalies = await detector.checkAnomalies(
          queryName,
          rawData.rows,
        );
        anomalyCount = anomalies.length;
      } catch {
        /* best-effort */
      }

      return res.json({
        queryName,
        groupId,
        rowCount: rawData.rows.length,
        columnCount: rawData.headers.length,
        duplicateCount,
        missingPercent: Number(missingPercent.toFixed(2)),
        topMissingColumns,
        schemaDrift: driftSummary,
        anomalyCount,
      });
    } catch (error) {
      logger.error({ error }, "Data quality check error");
      return res.status(500).json({ error: "Quality check failed" });
    }
  },
);

/* ─── GET /api/data/forecast/:queryName ───────────────────────────
 *
 * Lightweight forecast endpoint for KPI cards. Wraps core/ml/forecast
 * (exponential smoothing). Returns null history+null forecast on data
 * the model can't fit — caller renders a "no forecast available"
 * state instead of erroring.
 *
 * Query params:
 *   - valueColumn (optional): override the auto-picked numeric column
 *   - periods     (optional, default 5): how many points to project
 *   - groupId     (optional, default "default")
 */
dataApiRouter.get(
  "/forecast/:queryName",
  async (req: Request, res: Response) => {
    try {
      const queryName = req.params.queryName;
      const groupId =
        typeof req.query.groupId === "string" ? req.query.groupId : "default";
      const valueColumn =
        typeof req.query.valueColumn === "string"
          ? req.query.valueColumn
          : undefined;
      const periods = Math.min(
        Math.max(parseInt(String(req.query.periods ?? "5"), 10), 1),
        24,
      );

      const rawData = await getCsvData(queryName, groupId);
      const result = forecast(rawData, periods, undefined, valueColumn);

      if (!result) {
        return res.json({
          forecastable: false,
          reason:
            "No date column + numeric column pair found, or fewer than 3 data points.",
        });
      }

      return res.json({
        forecastable: true,
        dateColumn: result.dateColumn,
        valueColumn: result.valueColumn,
        historical: result.historical,
        predicted: result.predicted,
        nlDescription: result.nlDescription,
      });
    } catch (error) {
      logger.error({ error }, "Forecast endpoint error");
      return res
        .status(500)
        .json({ forecastable: false, reason: "Forecast failed" });
    }
  },
);

/* ─── POST /api/data/rows/:queryName ─────────────────────────────
 *
 * Source-agnostic row fetcher. CSV/XLSX/API/SQL queries all return
 * `{ rows, columns, totalRows }`. Built for the GridBoard editing
 * surface, which previously called /api/chat just to get rows —
 * paying the cost of NLP classification + anomaly snapshot + audit
 * logging for every reload. This endpoint skips all of that.
 *
 * Filters are applied client-style (string-equal, case-insensitive)
 * for CSV; for API/SQL sources the engine's existing query pipeline
 * routes filter params to the source.
 */
dataApiRouter.post("/rows/:queryName", async (req: Request, res: Response) => {
  try {
    const queryName = req.params.queryName;
    const body = req.body ?? {};
    const groupId = typeof body.groupId === "string" ? body.groupId : "default";
    // QueryFilters is Record<string, string>. Flatten array-typed
    // filter values (single-pick OR is the only multi-value case
    // here) by taking the first non-empty entry — matches what the
    // chat path does when a multi-select reaches a SQL/REST source.
    const filters: Record<string, string> | undefined =
      body.filters && typeof body.filters === "object"
        ? Object.fromEntries(
            Object.entries(body.filters as Record<string, unknown>)
              .map(([k, v]): [string, string] | null => {
                if (Array.isArray(v)) {
                  const first = v.find(
                    (x) => typeof x === "string" && x.length > 0,
                  );
                  return first ? [k, String(first)] : null;
                }
                if (typeof v === "string" && v.length > 0) {
                  return [k, v];
                }
                return null;
              })
              .filter((e): e is [string, string] => e !== null),
          )
        : undefined;
    const pageSize = Math.min(
      Math.max(parseInt(String(body.pageSize ?? "1000"), 10), 1),
      10000,
    );
    const page = Math.max(parseInt(String(body.page ?? "1"), 10), 1);

    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(apiClient, groupConfig.sources);
    const result = await queryService.executeQuery(queryName, filters);

    // Extract rows + headers regardless of source type.
    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];

    if (result.csvResult) {
      rows = result.csvResult.rows as Record<string, unknown>[];
      columns = result.csvResult.headers;
    } else if (result.apiResult) {
      const apiData = result.apiResult as { data?: unknown[] };
      const data = Array.isArray(apiData.data) ? apiData.data : [];
      rows = data as Record<string, unknown>[];
      if (rows.length > 0) {
        columns = Object.keys(rows[0]);
      }
    } else {
      return res
        .status(400)
        .json({ error: `Query "${queryName}" returned no rows` });
    }

    const totalRows = rows.length;
    const offset = (page - 1) * pageSize;
    const pagedRows = rows.slice(offset, offset + pageSize);

    // Auto-insights — same builder powering chat 💡 lines and the
    // Data Explorer strip. Skipped beyond page 1 (the user is
    // already paging through known data) and when the full row set
    // is too small to draw conclusions from.
    const insights =
      page === 1
        ? buildAutoInsights(
            {
              headers: columns,
              rows: rows as Record<string, string | number>[],
            },
            undefined,
          )
        : [];

    return res.json({
      queryName,
      groupId,
      rows: pagedRows,
      columns,
      totalRows,
      page,
      pageSize,
      ...(insights.length > 0 && { insights }),
    });
  } catch (error) {
    logger.error({ error }, "Data rows fetch error");
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Fetch failed" });
  }
});

/* ─── POST /api/data/cache/clear ───────────────────────────────── */
dataApiRouter.post("/cache/clear", (_req: Request, res: Response) => {
  csvCache.clear();
  return res.json({ cleared: true });
});
