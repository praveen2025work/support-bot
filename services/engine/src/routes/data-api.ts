import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { dirname, join } from "path";
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
import { paths } from "@/lib/env-config";
import { withFileLock } from "@/lib/file-lock";
import { logger } from "@/lib/logger";

export const dataApiRouter = Router();

/* ─── Row-shaped query cache (keyed by queryName+groupId) ───────── */
interface CacheEntry {
  data: CsvData;
  timestamp: number;
  queryName: string;
}
const csvCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type ExplorerCardType =
  | "kpi"
  | "chart"
  | "table"
  | "lineage"
  | "summary"
  | "quality";

interface ExplorerCard {
  id: string;
  type: ExplorerCardType;
  label: string;
  minedInsight?: {
    confidence: number;
    reason: string;
    generatedBy: "engine";
  };
  kpiConfig?: {
    column: string;
    operation: "avg" | "sum" | "count" | "min" | "max";
    color?: string;
  };
  chartConfig?: {
    chartType?: string;
    labelColumn?: string;
    valueColumns?: string[];
    groupBy?: string;
  };
  tableConfig?: {
    columns?: string[];
    pageSize?: number;
    defaultSort?: { column: string; direction: "asc" | "desc" };
  };
  lineageConfig?: {
    selectedPnl?: string;
    compact?: boolean;
  };
}

interface ExplorerLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface ExplorerViewRecommendation {
  cardId: string;
  type: ExplorerCardType;
  confidence: number;
  reason: string;
}

interface ExplorerDashboardConfig {
  id: string;
  name: string;
  source: string;
  groupId: string;
  cards: ExplorerCard[];
  layouts: ExplorerLayout[];
  globalFilters: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  layoutVersion?: number;
}

interface ExplorerSavedView {
  userId: string;
  groupId: string;
  queryName: string;
  config: ExplorerDashboardConfig;
  version: number;
  createdAt: string;
  updatedAt: string;
}

function getCacheKey(queryName: string, groupId: string): string {
  return `${groupId}::${queryName}`;
}

function explorerViewsFile(groupId: string): string {
  const safe = groupId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return join(paths.data.root, "data-explorer-views", `${safe}.json`);
}

function scopedUserId(raw: unknown): string {
  return typeof raw === "string" && raw.trim() ? raw.trim() : "anonymous";
}

async function readExplorerViews(
  groupId: string,
): Promise<ExplorerSavedView[]> {
  const filePath = explorerViewsFile(groupId);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeExplorerViews(
  groupId: string,
  views: ExplorerSavedView[],
): Promise<void> {
  const filePath = explorerViewsFile(groupId);
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(views, null, 2) + "\n", "utf-8");
}

function humanizeColumnName(column: string): string {
  return column
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeMetricName(column: string): string {
  return humanizeColumnName(column).replace(
    /\s+(Avg|Average|Mean|Sum|Total|Min|Max|Minimum|Maximum)$/i,
    "",
  );
}

function explorerTitle(queryName: string): string {
  return `${humanizeColumnName(queryName)
    .replace(/\bPnl\b/g, "P&L")
    .replace(/\bVp\b/g, "VP")
    .replace(/\bBofc\b/g, "BOFC")
    .replace(/\bFobo\b/g, "FOBO")} Explorer`;
}

function makeViewId(queryName: string, suffix: string): string {
  const safeQuery = queryName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  return `engine_${safeQuery}_${suffix}`;
}

function distinctCount(data: CsvData, column: string): number {
  const values = new Set<string>();
  for (const row of data.rows) {
    const value = row[column];
    if (value !== undefined && value !== null && value !== "") {
      values.add(String(value));
    }
  }
  return values.size;
}

function chooseLabelColumn(
  data: CsvData,
  dateColumns: string[],
): string | null {
  if (dateColumns.length > 0) return dateColumns[0];
  const candidates = data.headers
    .filter((h) => {
      const n = distinctCount(data, h);
      return n > 1 && n <= Math.min(40, Math.max(8, data.rows.length / 2));
    })
    .sort((a, b) => distinctCount(data, b) - distinctCount(data, a));
  return candidates[0] ?? data.headers[0] ?? null;
}

function chooseKpiOperation(column: string): "avg" | "sum" | "min" | "max" {
  const label = humanizeColumnName(column);
  if (/\b(max|maximum)\b/i.test(label)) return "max";
  if (/\b(min|minimum)\b/i.test(label)) return "min";
  return /\b(count|total|amount|revenue|spend|cost|balance|volume|qty|quantity)\b/i.test(
    label,
  )
    ? "sum"
    : "avg";
}

function kpiOperationLabel(operation: "avg" | "sum" | "min" | "max"): string {
  switch (operation) {
    case "sum":
      return "Total";
    case "min":
      return "Minimum";
    case "max":
      return "Maximum";
    case "avg":
      return "Average";
  }
}

function applyExplorerScope(
  data: CsvData,
  options: {
    filters?: Record<string, string | string[]>;
    search?: string;
  },
): Record<string, string | number>[] {
  let rows = data.rows;
  const { filters, search } = options;

  if (filters && Object.keys(filters).length > 0) {
    rows = rows.filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        const header = findMatchingHeader(key, data.headers);
        if (!header) continue;
        const cellVal = String(row[header] ?? "").toLowerCase();
        if (Array.isArray(value)) {
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

  if (search && search.trim()) {
    const s = search.toLowerCase();
    rows = rows.filter((row) =>
      data.headers.some((h) =>
        String(row[h] ?? "")
          .toLowerCase()
          .includes(s),
      ),
    );
  }

  return rows;
}

function aggregateRows(
  rows: Record<string, string | number>[],
  columns: string[],
) {
  const metrics: Record<
    string,
    { count: number; sum: number; avg: number; min: number; max: number }
  > = {};

  for (const column of columns) {
    const values = rows
      .map((row) => {
        const value = row[column];
        return typeof value === "number" ? value : parseFloat(String(value));
      })
      .filter((value) => Number.isFinite(value));

    const sum = values.reduce((acc, value) => acc + value, 0);
    metrics[column] = {
      count: values.length,
      sum,
      avg: values.length ? sum / values.length : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    };
  }

  return metrics;
}

function toCellValue(value: unknown): string | number {
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function rowsToCsvData(rows: Record<string, unknown>[]): CsvData {
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  return {
    headers,
    rows: rows.map((row) =>
      Object.fromEntries(
        headers.map((header) => [header, toCellValue(row[header])]),
      ),
    ),
  };
}

function cacheCsvData(key: string, queryName: string, data: CsvData): void {
  csvCache.set(key, { data, timestamp: Date.now(), queryName });

  if (csvCache.size > 50) {
    const oldest = Array.from(csvCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );
    for (let i = 0; i < Math.min(10, oldest.length); i++) {
      csvCache.delete(oldest[i][0]);
    }
  }
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
  const queryService = new QueryService(
    apiClient,
    groupConfig.sources,
    groupConfig.queries,
    groupId,
  );
  const result = await queryService.executeQuery(queryName);

  if (result.csvResult) {
    const data: CsvData = {
      headers: result.csvResult.headers,
      rows: result.csvResult.rows,
    };
    cacheCsvData(key, queryName, data);
    return data;
  }

  if (result.apiResult?.data) {
    const data = rowsToCsvData(
      result.apiResult.data as Record<string, unknown>[],
    );
    cacheCsvData(key, queryName, data);
    return data;
  }

  throw new Error(`Query "${queryName}" did not return row data`);
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
    const queryService = new QueryService(
      apiClient,
      groupConfig.sources,
      groupConfig.queries,
      groupId,
    );
    const queries = await queryService.getQueries();

    const rowSources = queries
      .filter((q) => q.type === "api" || q.type === "csv" || q.type === "xlsx")
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
          rowSources.sort((a, b) => {
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
      sources: rowSources.map((s) => ({
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

/* ─── POST /api/data/views/generate ──────────────────────────────
 *
 * Engine-owned Data Explorer view planning. The UI still renders cards,
 * but the engine decides the initial card mix from the actual dataset,
 * column roles, quality signals, and forecastability instead of relying
 * on schema-only client heuristics.
 */
dataApiRouter.post("/views/generate", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const queryName = typeof body.queryName === "string" ? body.queryName : "";
    const groupId = typeof body.groupId === "string" ? body.groupId : "default";
    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }

    const rawData = await getCsvData(queryName, groupId);
    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(
      apiClient,
      groupConfig.sources,
      groupConfig.queries,
      groupId,
    );
    const allQueries = await queryService.getQueries();
    const queryDef = allQueries.find((q) => q.name === queryName);
    const columnConfig: ColumnConfig | undefined = queryDef?.columnConfig;
    const detected = detectColumnTypes(
      rawData.headers,
      rawData.rows,
      columnConfig,
    );

    const typeFor = (column: string) =>
      detected.find((c) => c.column === column)?.detectedType ?? "string";
    const numericColumns = rawData.headers.filter((h) =>
      ["numeric", "integer", "decimal"].includes(typeFor(h)),
    );
    const dateColumns = rawData.headers.filter((h) => typeFor(h) === "date");
    const configuredValues =
      columnConfig?.valueColumns?.filter((c) =>
        rawData.headers.some((h) => h.toLowerCase() === c.toLowerCase()),
      ) ?? [];
    const resolvedConfiguredValues = configuredValues
      .map((c) => findMatchingHeader(c, rawData.headers))
      .filter((c): c is string => Boolean(c));
    const configuredValueSet = new Set(resolvedConfiguredValues);
    const valueColumns = [
      ...resolvedConfiguredValues,
      ...numericColumns,
    ].filter((col, idx, arr) => arr.indexOf(col) === idx);
    const labelColumn =
      columnConfig?.labelColumns
        ?.map((c) => findMatchingHeader(c, rawData.headers))
        .find((c): c is string => Boolean(c)) ??
      chooseLabelColumn(rawData, dateColumns);
    const lowCardinalityColumns = rawData.headers
      .filter((h) => {
        const type = typeFor(h);
        if (type !== "string" && type !== "id") return false;
        const count = distinctCount(rawData, h);
        return count > 1 && count <= 25;
      })
      .sort((a, b) => distinctCount(rawData, b) - distinctCount(rawData, a));

    const cards: ExplorerCard[] = [];
    const layouts: ExplorerLayout[] = [];
    const recommendations: ExplorerViewRecommendation[] = [];

    const addCard = (
      card: ExplorerCard,
      layout: Omit<ExplorerLayout, "i">,
      recommendation: Omit<ExplorerViewRecommendation, "cardId" | "type">,
    ) => {
      cards.push(card);
      layouts.push({ ...layout, i: card.id });
      recommendations.push({
        cardId: card.id,
        type: card.type,
        ...recommendation,
      });
    };

    const kpiColors = ["#2563EB", "#7C3AED", "#059669", "#D97706"];
    valueColumns.slice(0, 4).forEach((column, index) => {
      const id = makeViewId(queryName, `kpi_${index}`);
      const operation = chooseKpiOperation(column);
      addCard(
        {
          id,
          type: "kpi",
          label: `${kpiOperationLabel(operation)} ${humanizeMetricName(column)}`,
          minedInsight: {
            confidence: configuredValueSet.has(column) ? 0.92 : 0.78,
            reason: configuredValueSet.has(column)
              ? "Column is configured as a business value metric."
              : "Numeric measure detected from dataset values.",
            generatedBy: "engine",
          },
          kpiConfig: {
            column,
            operation,
            color: kpiColors[index] ?? "#2563EB",
          },
        },
        { x: index * 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        {
          confidence: configuredValueSet.has(column) ? 0.92 : 0.78,
          reason: configuredValueSet.has(column)
            ? "Column is configured as a business value metric."
            : "Numeric measure detected from dataset values.",
        },
      );
    });

    if (cards.filter((c) => c.type === "kpi").length < 4) {
      const countId = makeViewId(queryName, "kpi_count");
      addCard(
        {
          id: countId,
          type: "kpi",
          label: "Total Records",
          minedInsight: {
            confidence: 0.7,
            reason: "Every explorer should expose dataset scope.",
            generatedBy: "engine",
          },
          kpiConfig: {
            column: rawData.headers[0] ?? "",
            operation: "count",
            color: "#2563EB",
          },
        },
        {
          x: cards.filter((c) => c.type === "kpi").length * 3,
          y: 0,
          w: 3,
          h: 2,
          minW: 2,
          minH: 2,
        },
        {
          confidence: 0.7,
          reason: "Every explorer should expose dataset scope.",
        },
      );
    }

    const chartId = makeViewId(queryName, "chart_primary");
    const chartGroupBy =
      lowCardinalityColumns.find((c) => c !== labelColumn) ?? undefined;
    addCard(
      {
        id: chartId,
        type: "chart",
        label: labelColumn
          ? `${humanizeMetricName(valueColumns[0] ?? "Records")} by ${humanizeColumnName(labelColumn)}`
          : "Primary Chart",
        minedInsight: {
          confidence: valueColumns.length > 0 && labelColumn ? 0.86 : 0.62,
          reason:
            valueColumns.length > 0 && labelColumn
              ? "Detected a measure and label column suitable for charting."
              : "Fallback chart for visual inspection.",
          generatedBy: "engine",
        },
        chartConfig: {
          chartType: dateColumns.length > 0 ? "line" : "bar",
          labelColumn: labelColumn ?? undefined,
          valueColumns: valueColumns.slice(0, 3),
          groupBy: chartGroupBy,
        },
      },
      { x: 0, y: 2, w: 12, h: 7, minW: 4, minH: 4 },
      {
        confidence: valueColumns.length > 0 && labelColumn ? 0.86 : 0.62,
        reason:
          valueColumns.length > 0 && labelColumn
            ? "Detected a measure and label column suitable for charting."
            : "Fallback chart for visual inspection.",
      },
    );

    const summaryHeight = Math.max(
      4,
      Math.ceil(Math.min(valueColumns.length, 6) / 3) * 3 + 1,
    );
    const summaryId = makeViewId(queryName, "summary");
    addCard(
      {
        id: summaryId,
        type: "summary",
        label: "Summary Metrics",
        minedInsight: {
          confidence: valueColumns.length > 0 ? 0.84 : 0.6,
          reason: "Summarizes numeric columns and record coverage.",
          generatedBy: "engine",
        },
      },
      { x: 0, y: 9, w: 5, h: summaryHeight, minW: 4, minH: 3 },
      {
        confidence: valueColumns.length > 0 ? 0.84 : 0.6,
        reason: "Summarizes numeric columns and record coverage.",
      },
    );

    const tableId = makeViewId(queryName, "table");
    const tableColumns = [
      ...(labelColumn ? [labelColumn] : []),
      ...dateColumns,
      ...valueColumns,
      ...rawData.headers,
    ]
      .filter((col, idx, arr) => col && arr.indexOf(col) === idx)
      .slice(0, 12);
    addCard(
      {
        id: tableId,
        type: "table",
        label: "Data Table",
        minedInsight: {
          confidence: 0.8,
          reason: "Canonical row-level inspection view.",
          generatedBy: "engine",
        },
        tableConfig: {
          columns: tableColumns,
          pageSize: 25,
          defaultSort: dateColumns[0]
            ? { column: dateColumns[0], direction: "desc" }
            : undefined,
        },
      },
      {
        x: 5,
        y: 9,
        w: 7,
        h: Math.max(7, summaryHeight),
        minW: 5,
        minH: 4,
      },
      {
        confidence: 0.8,
        reason: "Canonical row-level inspection view.",
      },
    );

    const qualityId = makeViewId(queryName, "quality");
    addCard(
      {
        id: qualityId,
        type: "quality",
        label: "Data Quality",
        minedInsight: {
          confidence: 0.88,
          reason:
            "Engine can compute duplicates, missing values, drift, and anomalies for this dataset.",
          generatedBy: "engine",
        },
      },
      {
        x: 0,
        y: 9 + Math.max(7, summaryHeight),
        w: 12,
        h: 3,
        minW: 6,
        minH: 3,
      },
      {
        confidence: 0.88,
        reason:
          "Engine can compute duplicates, missing values, drift, and anomalies for this dataset.",
      },
    );

    const now = new Date().toISOString();
    return res.json({
      generatedBy: "engine",
      queryName,
      groupId,
      recommendations,
      config: {
        id: `dash_${groupId}_${queryName}`,
        name: explorerTitle(queryName),
        source: queryName,
        groupId,
        cards,
        layouts,
        globalFilters: {},
        createdAt: now,
        updatedAt: now,
        layoutVersion: 8,
      },
    });
  } catch (error) {
    logger.error({ error }, "Data view generation error");
    return res.status(500).json({ error: "Failed to generate data views" });
  }
});

/* ─── GET /api/data/views/config ──────────────────────────────── */
dataApiRouter.get("/views/config", async (req: Request, res: Response) => {
  try {
    const groupId =
      typeof req.query.groupId === "string" ? req.query.groupId : "default";
    const queryName =
      typeof req.query.queryName === "string" ? req.query.queryName : "";
    const userId = scopedUserId(req.query.userId);
    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }

    const all = await readExplorerViews(groupId);
    const saved = all.find(
      (v) =>
        v.userId === userId &&
        v.groupId === groupId &&
        v.queryName === queryName,
    );
    if (!saved) return res.status(404).json({ error: "View config not found" });
    return res.json(saved);
  } catch (error) {
    logger.error({ error }, "Data explorer config read error");
    return res.status(500).json({ error: "Failed to read explorer config" });
  }
});

/* ─── POST /api/data/views/config ───────────────────────────────
 *
 * Upsert a user's saved Data Explorer layout. This replaces the old
 * browser-only localStorage persistence with shared engine storage.
 */
dataApiRouter.post("/views/config", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const groupId = typeof body.groupId === "string" ? body.groupId : "default";
    const queryName = typeof body.queryName === "string" ? body.queryName : "";
    const userId = scopedUserId(body.userId);
    const config = body.config as ExplorerDashboardConfig | undefined;
    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }
    if (!config || typeof config !== "object") {
      return res.status(400).json({ error: "config is required" });
    }

    const filePath = explorerViewsFile(groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    const now = new Date().toISOString();
    const saved = await withFileLock(filePath, async () => {
      const all = await readExplorerViews(groupId);
      const idx = all.findIndex(
        (v) =>
          v.userId === userId &&
          v.groupId === groupId &&
          v.queryName === queryName,
      );
      const normalizedConfig: ExplorerDashboardConfig = {
        ...config,
        source: queryName,
        groupId,
        updatedAt: now,
      };
      const next: ExplorerSavedView =
        idx >= 0
          ? {
              ...all[idx],
              config: normalizedConfig,
              version: (all[idx].version ?? 0) + 1,
              updatedAt: now,
            }
          : {
              userId,
              groupId,
              queryName,
              config: normalizedConfig,
              version: 1,
              createdAt: now,
              updatedAt: now,
            };

      if (idx >= 0) all[idx] = next;
      else all.push(next);
      await writeExplorerViews(groupId, all);
      return next;
    });

    return res.json(saved);
  } catch (error) {
    logger.error({ error }, "Data explorer config save error");
    return res.status(500).json({ error: "Failed to save explorer config" });
  }
});

/* ─── POST /api/data/views/reset ──────────────────────────────── */
dataApiRouter.post("/views/reset", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const groupId = typeof body.groupId === "string" ? body.groupId : "default";
    const queryName = typeof body.queryName === "string" ? body.queryName : "";
    const userId = scopedUserId(body.userId);
    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }

    const filePath = explorerViewsFile(groupId);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await withFileLock(filePath, async () => {
      const all = await readExplorerViews(groupId);
      const next = all.filter(
        (v) =>
          !(
            v.userId === userId &&
            v.groupId === groupId &&
            v.queryName === queryName
          ),
      );
      await writeExplorerViews(groupId, next);
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Data explorer config reset error");
    return res.status(500).json({ error: "Failed to reset explorer config" });
  }
});

/* ─── POST /api/data/aggregate ──────────────────────────────────
 *
 * Efficient server-side aggregates for KPI and summary cards. Cards no
 * longer need to fetch up to 10k rows just to compute avg/min/max/count.
 */
dataApiRouter.post("/aggregate", async (req: Request, res: Response) => {
  try {
    const {
      queryName,
      groupId = "default",
      filters,
      search,
      columns,
    } = req.body as {
      queryName: string;
      groupId?: string;
      filters?: Record<string, string | string[]>;
      search?: string;
      columns?: string[];
    };

    if (!queryName) {
      return res.status(400).json({ error: "queryName is required" });
    }

    const rawData = await getCsvData(queryName, groupId);
    const scopedRows = applyExplorerScope(rawData, { filters, search });
    const columnTypes = detectColumnTypes(rawData.headers, rawData.rows);
    const requestedColumns = columns
      ?.map((column) => findMatchingHeader(column, rawData.headers))
      .filter((column): column is string => Boolean(column));
    const numericColumns = rawData.headers.filter((header) => {
      if (requestedColumns?.length && !requestedColumns.includes(header)) {
        return false;
      }
      const type =
        columnTypes.find((col) => col.column === header)?.detectedType ??
        "string";
      return ["numeric", "integer", "decimal"].includes(type);
    });

    return res.json({
      queryName,
      groupId,
      totalRows: scopedRows.length,
      columns: aggregateRows(scopedRows, numericColumns),
      schema: numericColumns.map((name) => ({
        name,
        type:
          columnTypes.find((col) => col.column === name)?.detectedType ??
          "numeric",
      })),
      durationMs: 0,
    });
  } catch (error) {
    logger.error({ error }, "Data aggregate error");
    return res.status(500).json({ error: "Aggregation failed" });
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
      const qs = new QueryService(
        apiClient,
        groupConfig.sources,
        groupConfig.queries,
        groupId,
      );
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
    const queryService = new QueryService(
      apiClient,
      groupConfig.sources,
      groupConfig.queries,
      groupId,
    );
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
