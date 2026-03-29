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

/* ─── GET /api/data/sources ───────────────────────────────────── */
dataApiRouter.get("/sources", async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || "default";
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

    // Also list all available groups
    const groups = Object.keys(getGroupConfigs());

    return res.json({ sources: csvSources, groups });
  } catch (error) {
    logger.error({ error }, "Data sources error");
    return res.status(500).json({ error: "Failed to list data sources" });
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

/* ─── POST /api/data/cache/clear ───────────────────────────────── */
dataApiRouter.post("/cache/clear", (_req: Request, res: Response) => {
  csvCache.clear();
  return res.json({ cleared: true });
});
