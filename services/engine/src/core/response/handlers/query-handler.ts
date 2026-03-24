import { logger } from "@/lib/logger";
import type {
  QueryService,
  QueryExecuteOptions,
} from "../../api-connector/query-service";
import type {
  ClassificationResult,
  BotResponse,
  ConversationContext,
} from "../../types";
import {
  STOP_WORDS,
  GROUP_BY_PATTERN,
  SORT_PATTERN,
  SUMMARY_PATTERN,
  TOP_BOTTOM_PATTERN,
} from "../constants";
import {
  detectColumnTypes,
  type DetectedColumnMeta,
} from "../../api-connector/csv-analyzer";
import type { ColumnConfig } from "../../types";
import {
  extractFilters,
  formatFilters,
  parseFilterFromText,
  mergeFilters,
  extractQuerySpecificFilters,
} from "./filter-utils";
import {
  handleGroupByFollowUp,
  handleSortFollowUp,
  handleSummaryFollowUp,
  handleTopNFollowUp,
} from "./followup-handler";
import { getAnomalyDetector } from "../../anomaly/anomaly-detector";
import { addToDictionary } from "../../nlp/typo-corrector";

/**
 * Get the last user message text from conversation history.
 */
export function getLastUserText(context: ConversationContext): string {
  for (let i = context.history.length - 1; i >= 0; i--) {
    if (context.history[i].role === "user") return context.history[i].text;
  }
  return "";
}

/**
 * Build execution options (search keywords, aggregation, group-by, sort) from user text.
 */
export function buildExecuteOptions(
  userText: string,
  queryName: string,
  classification: ClassificationResult,
): QueryExecuteOptions | undefined {
  if (!userText) return undefined;

  const entityValues = new Set(
    classification.entities.map((e) => e.value.toLowerCase()),
  );
  const words = userText
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !STOP_WORDS.has(w) &&
        !entityValues.has(w) &&
        w !== queryName.toLowerCase(),
    );

  const hasSearchIntent = /\b(search|find|about|say|what does)\b/i.test(
    userText,
  );
  const hasAggIntent =
    /\b(average|avg|sum|total|min|max|count|top\s+\d+|minimum|maximum|highest|lowest)\b/i.test(
      userText,
    );
  const hasGroupByIntent = GROUP_BY_PATTERN.test(userText);
  const hasSortIntent = SORT_PATTERN.test(userText);

  if (hasGroupByIntent) {
    // Support multi-word column names: "group by book status"
    const groupMatch = userText.match(
      /\bgroup(?:ed)?\s+by\s+(.+?)(?:\s+(?:asc|desc|ascending|descending|for|where|with|in)\b|$)/i,
    );
    if (groupMatch) return { groupByColumn: groupMatch[1].trim() };
  }

  if (hasSortIntent) {
    // Support multi-word column names: "sort by book status desc"
    const sortMatch = userText.match(
      /\b(?:sort|order)(?:ed)?\s+by\s+(.+?)(?:\s+(asc|desc|ascending|descending)\s*$|\s*$)/i,
    );
    if (sortMatch) {
      const dir =
        sortMatch[2] && /desc/i.test(sortMatch[2])
          ? ("desc" as const)
          : ("asc" as const);
      return { sortColumn: sortMatch[1].trim(), sortDirection: dir };
    }
  }

  if (hasAggIntent) {
    return { aggregationText: userText };
  }

  if (hasSearchIntent && words.length > 0) {
    return { searchKeywords: words };
  }

  return undefined;
}

/**
 * Shared helper: re-run the last query stored in context with new filters.
 */
export async function rerunLastQueryWithFilters(
  context: ConversationContext,
  filters: Record<string, string>,
  classification: ClassificationResult,
  queryService: QueryService,
  incomingHeaders?: Record<string, string>,
): Promise<BotResponse> {
  const filterLabel = formatFilters(filters);

  try {
    const result = await queryService.executeQuery(
      context.lastQueryName!,
      filters,
      undefined,
      incomingHeaders,
    );

    // Update context with new results
    if (result.type === "api" && result.apiResult) {
      context.lastApiResult = result.apiResult;
      const apiData = result.apiResult as { data?: Record<string, unknown>[] };
      if (apiData.data && apiData.data.length > 0) {
        context.lastQueryColumns = Object.keys(apiData.data[0]);
      }
    } else if (result.type === "csv" && result.csvResult) {
      context.lastApiResult = result.csvResult;
      const csvData = result.csvResult as { headers?: string[] };
      if (csvData.headers) {
        context.lastQueryColumns = csvData.headers;
        // Add column names (and their underscore-split parts) to typo dictionary
        // so the corrector won't mangle them (e.g. "pnl" → "in", "name" → "me")
        const dictWords: string[] = [];
        for (const h of csvData.headers) {
          dictWords.push(h.toLowerCase());
          for (const part of h.toLowerCase().split(/[_\s-]+/)) {
            if (part.length >= 2) dictWords.push(part);
          }
        }
        addToDictionary(dictWords);
      }
    }

    // Re-attach chart/column config from context so follow-up charts render
    const chartMeta = {
      ...(context.lastChartConfig && { chartConfig: context.lastChartConfig }),
      ...(context.lastColumnConfig && {
        columnConfig: context.lastColumnConfig,
      }),
      ...(context.lastColumnMetadata && {
        columnMetadata: context.lastColumnMetadata,
      }),
    };

    switch (result.type) {
      case "csv": {
        const csv = result.csvResult!;
        return {
          text: `Here is "${context.lastQueryName}" filtered${filterLabel} (${csv.rowCount} rows):`,
          richContent: csv.aggregation
            ? { type: "csv_aggregation", data: csv }
            : { type: "csv_table", data: { ...csv, ...chartMeta } },
          sessionId: context.sessionId,
          intent: "followup.filter",
          confidence: 1,
          executionMs: result.durationMs,
        };
      }
      case "api":
      default: {
        const apiData =
          Object.keys(chartMeta).length > 0
            ? { ...(result.apiResult as Record<string, unknown>), ...chartMeta }
            : result.apiResult;
        return {
          text: `Here are the results for "${context.lastQueryName}"${filterLabel}:`,
          richContent: { type: "query_result", data: apiData },
          sessionId: context.sessionId,
          intent: "followup.filter",
          confidence: 1,
          executionMs: result.durationMs,
        };
      }
    }
  } catch (error) {
    logger.error(
      { error, query: context.lastQueryName, filters },
      "Filter follow-up query failed",
    );
    return errorResponse(
      `Unable to re-run "${context.lastQueryName}" with those filters. Please try again.`,
      classification,
      context,
    );
  }
}

/**
 * Handle query.list intent — list all available queries.
 */
export async function handleQueryList(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
): Promise<BotResponse> {
  try {
    const queries = await queryService.getQueries();
    if (queries.length === 0) {
      return {
        text: "No queries are currently available.",
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    const queryItems = queries.map((q) => {
      return {
        name: q.name,
        description: q.description,
        type: (q.type ?? "api") as string,
        filters: (q.filters ?? []).map((f) => f.key),
        url: q.type === "url" ? q.url : undefined,
      };
    });

    return {
      text: `Here are the available queries (${queries.length}):`,
      richContent: { type: "query_list" as const, data: queryItems },
      suggestions: queries.slice(0, 5).map((q) => `run ${q.name}`),
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  } catch (error) {
    logger.error({ error }, "Failed to list queries");
    return errorResponse(
      "Unable to fetch available queries. Please try again later.",
      classification,
      context,
    );
  }
}

/**
 * Handle query.execute intent — execute a named query with optional filters.
 */
export async function handleQueryExecute(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
  explicitFilters?: Record<string, string>,
  incomingHeaders?: Record<string, string>,
  groupId?: string,
): Promise<BotResponse> {
  // If user text is a data operation (group/sort/summary/top), always try follow-up first
  if (context.lastQueryName && context.lastApiResult) {
    const userText = getLastUserText(context);
    const isDataOp =
      GROUP_BY_PATTERN.test(userText) ||
      SORT_PATTERN.test(userText) ||
      SUMMARY_PATTERN.test(userText) ||
      TOP_BOTTOM_PATTERN.test(userText);
    if (isDataOp) {
      const groupByRes = handleGroupByFollowUp(classification, context);
      if (groupByRes) return groupByRes;
      const sortRes = handleSortFollowUp(classification, context);
      if (sortRes) return sortRes;
      const summaryRes = handleSummaryFollowUp(classification, context);
      if (summaryRes) return summaryRes;
      const topNRes = handleTopNFollowUp(classification, context);
      if (topNRes) return topNRes;
    }
  }

  const queryNameEntity = classification.entities.find(
    (e) => e.entity === "query_name",
  );

  if (!queryNameEntity) {
    if (context.lastQueryName) {
      const userText = getLastUserText(context);

      // Data operations on previous results
      const groupByRes = handleGroupByFollowUp(classification, context);
      if (groupByRes) return groupByRes;
      const sortRes = handleSortFollowUp(classification, context);
      if (sortRes) return sortRes;
      const summaryRes = handleSummaryFollowUp(classification, context);
      if (summaryRes) return summaryRes;
      const topNRes = handleTopNFollowUp(classification, context);
      if (topNRes) return topNRes;

      // Filter follow-up — merge NLP, text, and query-specific filters
      const filters = extractFilters(classification.entities);
      const parsedFilters = parseFilterFromText(userText);
      if (parsedFilters) {
        for (const [k, v] of Object.entries(parsedFilters)) {
          if (!filters[k]) filters[k] = v;
        }
      }
      // Also try query-specific filter keys from the last query definition
      try {
        const allQueries = await queryService.getQueries();
        const lastQueryDef = allQueries.find(
          (q) => q.name.toLowerCase() === context.lastQueryName!.toLowerCase(),
        );
        if (lastQueryDef?.filters?.length) {
          const qsFilters = extractQuerySpecificFilters(
            userText,
            lastQueryDef.filters.map((f) => f.key),
          );
          for (const [k, v] of Object.entries(qsFilters)) {
            if (!filters[k]) filters[k] = v;
          }
        }
      } catch {
        /* proceed without query-specific filters */
      }
      // Also merge explicit (form) filters
      if (explicitFilters) {
        Object.assign(filters, explicitFilters);
      }
      if (Object.keys(filters).length > 0) {
        logger.info(
          { lastQuery: context.lastQueryName, filters },
          "Re-running last query with filter follow-up",
        );
        return rerunLastQueryWithFilters(
          context,
          filters,
          classification,
          queryService,
          incomingHeaders,
        );
      }
    }

    try {
      const names = await queryService.getQueryNames();
      return {
        text: "Which query would you like me to run? Here are some available options:",
        suggestions: names.slice(0, 5).map((n) => `run ${n}`),
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    } catch {
      return {
        text: "Which query would you like me to run? Please specify the query name.",
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }
  }

  // --- Exact-match override: if the user text contains a query name verbatim,
  //     prefer that over the NER-resolved value (which may fuzzy-match a similar name).
  //     Pick the longest match to avoid partial collisions (e.g. "pnl" in "pnl_signoff").
  const userText = getLastUserText(context);
  try {
    const allQueryNames = await queryService.getQueryNames();
    const lowerText = userText.toLowerCase();
    const matches = allQueryNames
      .filter((name) => {
        const lower = name.toLowerCase();
        const readable = lower.replace(/_/g, " ");
        return lowerText.includes(lower) || lowerText.includes(readable);
      })
      .sort((a, b) => b.length - a.length); // longest first
    if (
      matches.length > 0 &&
      matches[0].toLowerCase() !== queryNameEntity.value.toLowerCase()
    ) {
      logger.info(
        { nerValue: queryNameEntity.value, exactMatch: matches[0] },
        "Overriding NER entity with exact query name match from user text",
      );
      queryNameEntity.value = matches[0];
    }
  } catch {
    /* proceed with NER value */
  }

  // Merge NLP-extracted filters with text-parsed filters and explicit (form) filters.
  // NLP entities provide the primary filter extraction; parseFilterFromText catches
  // patterns the NLP model missed (e.g. "give me sales data for region US" when
  // NLP extracted query_name but not region).
  // Additionally, extractQuerySpecificFilters handles custom filter keys defined
  // on the query itself (e.g. "status", "orderDate" on SQL connector queries).
  const nlpFilters = extractFilters(classification.entities);
  const textFilters = parseFilterFromText(userText);

  // Look up query-specific filter keys and try to extract their values from user text
  let querySpecificFilters: Record<string, string> = {};
  try {
    const allQueries = await queryService.getQueries();
    const queryDef = allQueries.find(
      (q) => q.name.toLowerCase() === queryNameEntity.value.toLowerCase(),
    );
    if (queryDef?.filters?.length) {
      const queryFilterKeys = queryDef.filters.map((f) => f.key);
      querySpecificFilters = extractQuerySpecificFilters(
        userText,
        queryFilterKeys,
      );
    }
  } catch {
    /* proceed without query-specific filters */
  }

  // Merge all filter sources: NLP → text → query-specific → explicit (form)
  const filters = mergeFilters(nlpFilters, textFilters, explicitFilters);
  // Add query-specific filters (don't override existing ones)
  for (const [key, value] of Object.entries(querySpecificFilters)) {
    if (!filters[key]) filters[key] = value;
  }
  const filterLabel = formatFilters(filters);
  const hasFilters = Object.keys(filters).length > 0;

  if (hasFilters) {
    logger.info(
      {
        queryName: queryNameEntity.value,
        filters,
        nlpFilters,
        textFilters,
        querySpecificFilters,
      },
      "Filters extracted from NLP + text + query-specific",
    );
  }

  // If query has filters defined but user provided none and this isn't a form
  // submission, prompt the user with a filter form before executing.
  if (!hasFilters && !explicitFilters) {
    try {
      const allQueries = await queryService.getQueries();
      const queryDef = allQueries.find(
        (q) => q.name.toLowerCase() === queryNameEntity.value.toLowerCase(),
      );
      if (queryDef?.filters?.length) {
        // Return filter form so user can fill in values before execution
        return {
          text: `**${queryDef.name}** has filter options. Fill in values to narrow results, or skip to load all data.`,
          richContent: {
            type: "query_filter_form",
            data: {
              queryName: queryDef.name,
              description: queryDef.description || "",
              filters: queryDef.filters,
            },
          },
          suggestions: [],
          sessionId: context.sessionId,
          intent: "query.filter_form",
          confidence: 1,
        };
      }
    } catch {
      /* proceed with execution if filter lookup fails */
    }
  }

  // Extract options for document search / CSV aggregation from user text
  const options = buildExecuteOptions(
    userText,
    queryNameEntity.value,
    classification,
  );

  try {
    const result = await queryService.executeQuery(
      queryNameEntity.value,
      hasFilters ? filters : undefined,
      options,
      incomingHeaders,
    );

    const execMs = result.durationMs;

    // Look up reference URL, chartConfig, and columnConfig for this query
    let referenceUrl: string | undefined;
    let chartConfig: Record<string, unknown> | undefined;
    let columnConfig: Record<string, unknown> | undefined;
    try {
      const allQueries = await queryService.getQueries();
      const queryDef = allQueries.find(
        (q) => q.name.toLowerCase() === queryNameEntity.value.toLowerCase(),
      );
      if (queryDef?.url && queryDef.type !== "url") {
        referenceUrl = queryDef.url;
      }
      if (queryDef?.chartConfig) {
        chartConfig = queryDef.chartConfig as Record<string, unknown>;
      }
      if (queryDef?.columnConfig) {
        columnConfig = queryDef.columnConfig as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }

    // Store query result in context for follow-up questions
    context.lastQueryName = queryNameEntity.value;
    if (result.type === "api" && result.apiResult) {
      context.lastApiResult = result.apiResult;
      const apiData = result.apiResult as { data?: Record<string, unknown>[] };
      if (apiData.data && apiData.data.length > 0) {
        context.lastQueryColumns = Object.keys(apiData.data[0]);
      }
    } else if (result.type === "csv" && result.csvResult) {
      context.lastApiResult = result.csvResult;
      const csvData = result.csvResult as { headers?: string[] };
      if (csvData.headers) {
        context.lastQueryColumns = csvData.headers;
      }
    } else if (result.type === "document" && result.documentResult) {
      context.lastApiResult = result.documentResult;
    }

    // Preserve chart/column config so follow-up handlers can include them
    context.lastChartConfig = chartConfig;
    context.lastColumnConfig = columnConfig;

    // Anomaly detection (fire-and-forget snapshot + blocking check)
    let anomalies: BotResponse["anomalies"] = undefined;
    try {
      const anomalyData =
        result.type === "api"
          ? (result.apiResult as { data?: Record<string, unknown>[] })?.data
          : result.type === "csv"
            ? (result.csvResult as { rows?: Record<string, unknown>[] })?.rows
            : undefined;

      if (anomalyData && anomalyData.length > 0) {
        const detector = getAnomalyDetector(groupId || "default");
        detector
          .recordSnapshot(queryNameEntity.value, anomalyData)
          .catch(() => {});
        const detected = await detector.checkAnomalies(
          queryNameEntity.value,
          anomalyData,
        );
        if (detected.length > 0) anomalies = detected;
      }
    } catch {
      /* anomaly detection is non-critical */
    }

    // Auto-detect column types from actual data values
    let columnMetadata: DetectedColumnMeta[] | undefined;
    try {
      const detectRows =
        result.type === "api"
          ? (result.apiResult as { data?: Record<string, string | number>[] })
              ?.data
          : result.type === "csv"
            ? (result.csvResult as { rows?: Record<string, string | number>[] })
                ?.rows
            : undefined;
      if (detectRows && detectRows.length > 0) {
        const detectHeaders = Object.keys(detectRows[0]);
        columnMetadata = detectColumnTypes(
          detectHeaders,
          detectRows,
          columnConfig as ColumnConfig | undefined,
        );
      }
    } catch {
      /* column detection is non-critical */
    }

    // Store column metadata in context for follow-up chart rendering
    if (columnMetadata) context.lastColumnMetadata = columnMetadata;

    // ── Enforce max rows for chat display ────────────────────────────
    // Prevents sending huge payloads to the browser which would crash the UI.
    // The row limit adapts based on column count — wide tables get fewer rows
    // to keep response size manageable, especially on dashboards with multiple views.
    const MAX_RESPONSE_SIZE_KB = 2048; // 2MB ceiling for JSON payload

    function computeMaxChatRows(colCount: number): number {
      if (colCount <= 5) return 500;
      if (colCount <= 15) return 300;
      if (colCount <= 30) return 150;
      return 100; // Very wide tables
    }

    function estimateResponseSizeKB(rows: unknown[]): number {
      if (!rows || rows.length === 0) return 0;
      const sampleSize = Math.min(rows.length, 10);
      const sample = rows.slice(0, sampleSize);
      const avgRowBytes = JSON.stringify(sample).length / sampleSize;
      return Math.round((avgRowBytes * rows.length) / 1024);
    }

    // Preserve full data for follow-up operations (group-by, aggregation, etc.)
    // before truncating for chat display. Context holds a reference to the same
    // object, so we must snapshot the full rows first.
    if (result.type === "api") {
      const apiData = result.apiResult as
        | { data?: Record<string, unknown>[] }
        | undefined;
      if (apiData?.data) {
        (context as unknown as Record<string, unknown>).__fullRows = [
          ...apiData.data,
        ];
      }
    } else if (result.type === "csv") {
      const csv = result.csvResult as { rows?: unknown[] } | undefined;
      if (csv?.rows) {
        (context as unknown as Record<string, unknown>).__fullRows = [
          ...csv.rows,
        ];
      }
    }

    let totalRowCount: number | undefined;
    let displayedRows: number | undefined;
    let totalColumns: number | undefined;
    let estimatedSizeKB: number | undefined;

    if (result.type === "api") {
      const apiData = result.apiResult as
        | {
            data?: unknown[];
            rowCount?: number;
            truncated?: boolean;
            totalRowsBeforeTruncation?: number;
            columnCount?: number;
          }
        | undefined;
      if (
        apiData?.data &&
        Array.isArray(apiData.data) &&
        apiData.data.length > 0
      ) {
        const colCount =
          typeof apiData.data[0] === "object" && apiData.data[0] !== null
            ? Object.keys(apiData.data[0] as Record<string, unknown>).length
            : 1;
        totalColumns = colCount;
        let maxRows = computeMaxChatRows(colCount);

        if (apiData.data.length > maxRows) {
          totalRowCount =
            apiData.totalRowsBeforeTruncation ??
            apiData.rowCount ??
            apiData.data.length;
          apiData.data = apiData.data.slice(0, maxRows);

          // Check estimated size and further reduce if needed
          estimatedSizeKB = estimateResponseSizeKB(apiData.data);
          while (estimatedSizeKB > MAX_RESPONSE_SIZE_KB && maxRows > 50) {
            maxRows = Math.floor(maxRows / 2);
            apiData.data = apiData.data.slice(0, maxRows);
            estimatedSizeKB = estimateResponseSizeKB(apiData.data);
          }

          displayedRows = apiData.data.length;
          apiData.rowCount = displayedRows;
          apiData.truncated = true;
          logger.info(
            {
              queryName: queryNameEntity.value,
              totalRows: totalRowCount,
              sentRows: displayedRows,
              columns: colCount,
              sizeKB: estimatedSizeKB,
            },
            "Large result truncated for chat display",
          );
        }
      }
    } else if (result.type === "csv") {
      // CSV results were NOT truncated before — apply the same dynamic limits
      const csv = result.csvResult as
        | { rows?: unknown[]; headers?: string[]; rowCount?: number }
        | undefined;
      if (csv?.rows && Array.isArray(csv.rows)) {
        const colCount =
          csv.headers?.length ??
          (csv.rows.length > 0 &&
          typeof csv.rows[0] === "object" &&
          csv.rows[0] !== null
            ? Object.keys(csv.rows[0] as Record<string, unknown>).length
            : 1);
        totalColumns = colCount;
        let maxRows = computeMaxChatRows(colCount);

        if (csv.rows.length > maxRows) {
          totalRowCount = csv.rowCount ?? csv.rows.length;
          csv.rows = csv.rows.slice(0, maxRows);

          estimatedSizeKB = estimateResponseSizeKB(csv.rows);
          while (estimatedSizeKB > MAX_RESPONSE_SIZE_KB && maxRows > 50) {
            maxRows = Math.floor(maxRows / 2);
            csv.rows = csv.rows.slice(0, maxRows);
            estimatedSizeKB = estimateResponseSizeKB(csv.rows);
          }

          displayedRows = csv.rows.length;
          csv.rowCount = displayedRows;
          logger.info(
            {
              queryName: queryNameEntity.value,
              totalRows: totalRowCount,
              sentRows: displayedRows,
              columns: colCount,
              sizeKB: estimatedSizeKB,
            },
            "Large CSV result truncated for chat display",
          );
        }
      }
    }

    // Source metadata for UI badges
    const sourceName = queryNameEntity.value;
    const sourceType = (result.type || "api") as BotResponse["sourceType"];

    switch (result.type) {
      case "url":
        return {
          text: `Here is the link for "${queryNameEntity.value}":`,
          richContent: { type: "url_list", data: [result.urlResult] },
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
          executionMs: execMs,
          queryName: queryNameEntity.value,
          sourceName,
          sourceType,
          anomalies,
        };

      case "document": {
        const doc = result.documentResult!;
        if (doc.searchResults && doc.searchResults.length > 0) {
          return {
            text: `Found ${doc.searchResults.length} matching section(s) in "${queryNameEntity.value}":`,
            richContent: { type: "document_search", data: doc },
            sessionId: context.sessionId,
            intent: classification.intent,
            confidence: classification.confidence,
            executionMs: execMs,
            referenceUrl,
            queryName: queryNameEntity.value,
            sourceName,
            sourceType: "document",
            anomalies,
          };
        }
        return {
          text: `Here is the content from "${queryNameEntity.value}":`,
          richContent: {
            type: "file_content",
            data: {
              content: doc.content,
              filePath: doc.filePath,
              format: doc.format,
            },
          },
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
          executionMs: execMs,
          referenceUrl,
          queryName: queryNameEntity.value,
          sourceName,
          sourceType: "document",
          anomalies,
        };
      }

      case "csv": {
        const csv = result.csvResult!;
        if (csv.groupByResult) {
          const gb = csv.groupByResult;
          return {
            text: `Here is "${queryNameEntity.value}" grouped by **${gb.groupColumn}** (${gb.groups.length} groups, ${csv.rowCount} total rows):`,
            richContent: { type: "csv_group_by", data: gb },
            sessionId: context.sessionId,
            intent: classification.intent,
            confidence: classification.confidence,
            executionMs: execMs,
            referenceUrl,
            queryName: queryNameEntity.value,
            sourceName,
            sourceType: "csv",
            anomalies,
          };
        }
        if (csv.aggregation) {
          const agg = csv.aggregation;
          const isTop = agg.operation.startsWith("top");
          const text = isTop
            ? `Here are the ${agg.operation} results by **${agg.column}** from "${queryNameEntity.value}" (${csv.rowCount} total rows):`
            : `${agg.operation.toUpperCase()}(${agg.column}) = ${agg.result} (${csv.rowCount} rows)`;
          return {
            text,
            richContent: { type: "csv_aggregation", data: csv },
            sessionId: context.sessionId,
            intent: classification.intent,
            confidence: classification.confidence,
            executionMs: execMs,
            referenceUrl,
            queryName: queryNameEntity.value,
            sourceName,
            sourceType: "csv",
            anomalies,
          };
        }
        return {
          text: totalRowCount
            ? `Here is the data from "${queryNameEntity.value}" (showing first ${displayedRows} of ${totalRowCount} rows):`
            : `Here is the data from "${queryNameEntity.value}" (${csv.rowCount} rows):`,
          richContent: {
            type: "csv_table",
            data: {
              ...csv,
              ...(chartConfig && { chartConfig }),
              ...(columnConfig && { columnConfig }),
              ...(columnMetadata && { columnMetadata }),
            },
          },
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
          executionMs: execMs,
          referenceUrl,
          queryName: queryNameEntity.value,
          sourceName,
          sourceType: "csv",
          anomalies,
        };
      }

      case "api":
      default: {
        const extraConfig = {
          ...(chartConfig && { chartConfig }),
          ...(columnConfig && { columnConfig }),
          ...(columnMetadata && { columnMetadata }),
        };
        const apiData =
          Object.keys(extraConfig).length > 0
            ? {
                ...(result.apiResult as Record<string, unknown>),
                ...extraConfig,
              }
            : result.apiResult;
        return {
          text: totalRowCount
            ? `Here are the results for "${queryNameEntity.value}"${filterLabel} (showing first ${displayedRows} of ${totalRowCount} rows):`
            : `Here are the results for "${queryNameEntity.value}"${filterLabel}:`,
          richContent: { type: "query_result", data: apiData },
          sessionId: context.sessionId,
          intent: classification.intent,
          confidence: classification.confidence,
          executionMs: execMs,
          referenceUrl,
          queryName: queryNameEntity.value,
          sourceName,
          sourceType: (sourceType ?? "api") as BotResponse["sourceType"],
          anomalies,
          ...(totalRowCount && {
            totalRowsBeforeTruncation: totalRowCount,
            displayedRows,
            totalColumns,
            estimatedSizeKB,
            truncated: true,
          }),
        };
      }
    }
  } catch (error) {
    logger.error(
      { error, query: queryNameEntity.value, filters },
      "Query execution failed",
    );
    return errorResponse(
      `Unable to execute the query "${queryNameEntity.value}". Please try again later.`,
      classification,
      context,
    );
  }
}

/**
 * Handle query.multi intent — execute multiple queries in parallel.
 */
export async function handleMultiQuery(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
  incomingHeaders?: Record<string, string>,
): Promise<BotResponse> {
  const queryEntities = classification.entities.filter(
    (e) => e.entity === "query_name",
  );

  if (queryEntities.length < 2) {
    try {
      const names = await queryService.getQueryNames();
      return {
        text: "Please specify at least two queries to run together. Available queries:",
        suggestions: names.slice(0, 5).map((n) => `run ${n}`),
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    } catch {
      return {
        text: "Please specify at least two query names to run together.",
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }
  }

  const filters = extractFilters(classification.entities);
  const filterLabel = formatFilters(filters);
  const hasFilters = Object.keys(filters).length > 0;
  const queryNames = queryEntities.map((e) => e.value);

  try {
    const results = await queryService.executeMultipleQueries(
      queryNames,
      hasFilters ? filters : undefined,
      incomingHeaders,
    );

    if (results.length === 0) {
      return errorResponse(
        "All queries failed to execute. Please try again later.",
        classification,
        context,
      );
    }

    const succeeded = results.map((r) => r.queryName);
    const failed = queryNames.filter((n) => !succeeded.includes(n));
    let text = `Results for ${succeeded.join(" and ")}${filterLabel}:`;
    if (failed.length > 0) {
      text += `\n(Failed to fetch: ${failed.join(", ")})`;
    }

    const multiData = results.map((r) => ({
      queryName: r.queryName,
      result:
        r.result.apiResult ??
        r.result.documentResult ??
        r.result.csvResult ??
        r.result.urlResult,
      resultType: r.result.type,
    }));

    return {
      text,
      richContent: { type: "multi_query_result", data: multiData },
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  } catch (error) {
    logger.error(
      { error, queries: queryNames, filters },
      "Multi-query execution failed",
    );
    return errorResponse(
      `Unable to execute queries. Please try again later.`,
      classification,
      context,
    );
  }
}

/**
 * Handle query.estimate intent — estimate query execution time.
 */
export async function handleQueryEstimate(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService,
): Promise<BotResponse> {
  const queryNameEntity = classification.entities.find(
    (e) => e.entity === "query_name",
  );

  if (!queryNameEntity) {
    return {
      text: "Which query would you like me to estimate? Please specify the query name.",
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }

  try {
    const estimation = await queryService.getEstimation(queryNameEntity.value);
    return {
      text: `Estimation for "${queryNameEntity.value}":\n- Estimated duration: ${estimation.estimatedDuration}ms\n- Description: ${estimation.description}`,
      richContent: { type: "estimation", data: estimation },
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  } catch (error) {
    logger.error({ error, query: queryNameEntity.value }, "Estimation failed");
    return errorResponse(
      `Unable to get estimation for "${queryNameEntity.value}".`,
      classification,
      context,
    );
  }
}

/**
 * Produce a standard error response.
 */
export function errorResponse(
  text: string,
  classification: ClassificationResult,
  context: ConversationContext,
): BotResponse {
  return {
    text,
    richContent: { type: "error", data: { message: text } },
    sessionId: context.sessionId,
    intent: classification.intent,
    confidence: classification.confidence,
  };
}
