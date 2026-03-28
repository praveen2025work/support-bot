"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  Suspense,
  lazy,
} from "react";
import type { Message } from "@/hooks/useChat";
import type { DrillDownConfig } from "@/types/dashboard";
import { QueryFilterForm, type QueryFilterFormData } from "./QueryFilterForm";
import { TablePagination, exportToCsv } from "./TablePagination";
import type { DetectedColumnMeta } from "./DataChart";

// Lazy-load DataChart (pulls in Recharts ~150KB) — only loaded when chart is rendered
const DataChart = lazy(() =>
  import("./DataChart").then((m) => ({ default: m.DataChart })),
);
// Lazy-load ML chart components
const HeatmapChart = lazy(() => import("./HeatmapChart"));
const HistogramChart = lazy(() => import("./HistogramChart"));
const ScatterPlot = lazy(() => import("./ScatterPlot"));
const ForecastChart = lazy(() => import("./ForecastChart"));
const TrendChart = lazy(() => import("./TrendChart"));
const DecisionTreeViz = lazy(() => import("./DecisionTreeViz"));
import {
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
  ClipboardCopy,
  Check,
} from "lucide-react";
import { AnomalyAlert } from "@/components/dashboard/AnomalyBadge";
import { FeedbackBar } from "./FeedbackBar";
import { SourceBadge } from "./SourceBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";

/** Paginated wrapper for inline tables (csv_table, csv_aggregation, csv_group_by) */
function PaginatedTableBody<T>({
  rows,
  headers,
  renderRow,
  tableClassName,
  headerClassName,
  renderHeader,
  footer,
  defaultPageSize = 10,
}: {
  rows: T[];
  headers: string[];
  renderRow: (row: T, index: number) => React.ReactNode;
  tableClassName?: string;
  headerClassName?: string;
  renderHeader?: (h: string) => React.ReactNode;
  footer?: React.ReactNode;
  defaultPageSize?: number;
}) {
  const [pageRange, setPageRange] = useState({
    start: 0,
    end: defaultPageSize,
  });
  const pagedRows = rows.slice(pageRange.start, pageRange.end);
  const showPagination = rows.length > defaultPageSize;

  return (
    <>
      <div className="overflow-x-auto">
        <table
          className={
            tableClassName ||
            "min-w-full text-xs border border-[var(--border)] rounded"
          }
        >
          <thead>
            <tr className={headerClassName || "bg-[var(--bg-secondary)]"}>
              {renderHeader
                ? headers.map((h) => renderHeader(h))
                : headers.map((h) => (
                    <th
                      key={h}
                      className="px-2 py-1 text-left font-medium text-[var(--text-secondary)] border-b"
                    >
                      {h}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, i) => renderRow(row, pageRange.start + i))}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <TablePagination
          totalRows={rows.length}
          pageSize={defaultPageSize}
          onPageChange={(start, end) => setPageRange({ start, end })}
          onExport={() => exportToCsv(rows as Record<string, unknown>[])}
        />
      )}
      {footer}
    </>
  );
}

interface QueryListItem {
  name: string;
  description?: string;
  type: "api" | "url" | "document" | "csv" | "xlsx" | "xls";
  filters: string[];
  url?: string;
}

interface UrlItem {
  title: string;
  url: string;
}

interface QueryResultData {
  data: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

interface MultiQueryResultItem {
  queryName: string;
  result: QueryResultData;
}

interface EstimationData {
  estimatedDuration: number;
  description: string;
}

function renderMarkdownText(text: string, onAction?: (text: string) => void) {
  // Split on **bold** markers and "quoted" text
  const parts = text.split(/(\*\*[^*]+\*\*|"[^"]{3,}")/g);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      return <strong key={i}>{boldMatch[1]}</strong>;
    }
    const quoteMatch = part.match(/^"(.{3,})"$/);
    if (quoteMatch && onAction) {
      return (
        <button
          key={i}
          onClick={() => onAction(quoteMatch[1])}
          className="inline-flex items-center mx-0.5 rounded-md border border-[var(--brand)] bg-[var(--brand-subtle)] px-1.5 py-0.5 text-xs text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors cursor-pointer align-baseline"
        >
          {quoteMatch[1]}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface LinkedSelection {
  sourceCardId: string | null;
  column: string | null;
  value: string | null;
}

export function MessageBubble({
  message,
  onAction,
  onExecuteQuery,
  onRetry,
  onFeedback,
  cardId,
  linkedSelection,
  onCellClick,
  drillDownConfig,
  onDrillDown,
  displayMode,
  compactAuto,
  compactRichContent,
  savedChartType,
  onChartTypeChange,
  hideExecutionTime,
  dashboardMode,
  diffInfo,
}: {
  message: Message;
  onAction?: (text: string) => void;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onRetry?: (text: string) => void;
  onFeedback?: (
    messageId: string,
    type: "positive" | "negative",
    correction?: string,
  ) => void;
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
  /** Config-based drill-down definitions from query config */
  drillDownConfig?: DrillDownConfig[];
  /** When true, render a one-line summary instead of full tables/charts */
  compactRichContent?: boolean;
  /** Callback when user triggers a drill-down (config-based or picker) */
  onDrillDown?: (
    targetQuery: string,
    targetFilter: string,
    column: string,
    value: string,
  ) => void;
  /** Display mode: auto (both), table only, or chart only */
  displayMode?: "auto" | "table" | "chart";
  /** When auto mode, use compact tab toggle instead of stacking both */
  compactAuto?: boolean;
  /** Persisted chart type override from saved view */
  savedChartType?: string;
  /** Callback when user changes chart type (for persistence) */
  onChartTypeChange?: (type: string) => void;
  /** Hide "Completed in Xms" badge (used in dashboard grid where header shows it) */
  hideExecutionTime?: boolean;
  /** Dashboard mode — suppress conversational text, copy button, badges, and feedback bar; show only rich content */
  dashboardMode?: boolean;
  /** Diff info from previous query run — highlights changes in table */
  diffInfo?: {
    addedIndices: Set<number>;
    changedIndices: Set<number>;
    changedCells: Map<number, Map<string, unknown>>;
    removedRows: Record<string, unknown>[];
    totalChanges: number;
  };
}) {
  const isUser = message.role === "user";
  const [msgCopied, setMsgCopied] = useState(false);

  const hasRichContent = !isUser && message.richContent;

  const handleMessageCopy = useCallback(() => {
    let text = "";
    // Try to extract table data first
    if (message.richContent?.data) {
      const d = message.richContent.data as Record<string, unknown>;
      const rows = (d.data ?? d.rows) as Record<string, unknown>[] | undefined;
      const headers =
        (d.headers as string[] | undefined) ??
        (rows && rows.length > 0 ? Object.keys(rows[0]) : undefined);
      if (rows && rows.length > 0 && headers) {
        text = [
          headers.join("\t"),
          ...rows.map((r) => headers.map((h) => String(r[h] ?? "")).join("\t")),
        ].join("\n");
      }
    }
    if (!text) text = message.text || "";
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setMsgCopied(true);
        setTimeout(() => setMsgCopied(false), 2000);
      })
      .catch(() => {});
  }, [message]);

  return (
    <div
      className={`group/msg flex ${isUser ? "justify-end" : "justify-start"} ${dashboardMode ? "mb-0" : "mb-3"}`}
    >
      <div
        className={`relative ${
          dashboardMode
            ? "w-full"
            : `${isUser ? "max-w-[80%]" : hasRichContent ? "max-w-[98%] w-full" : "max-w-[85%]"} rounded-2xl px-4 py-3 ${
                isUser
                  ? "bg-[var(--brand)] text-white"
                  : message.isError
                    ? "bg-[var(--danger-subtle)] text-[var(--text-primary)] border border-[var(--danger)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              }`
        }`}
      >
        {/* Copy button — visible on hover (hidden in dashboard mode) */}
        {!isUser && !dashboardMode && (
          <button
            onClick={handleMessageCopy}
            className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] shadow-sm z-10"
            title="Copy to clipboard"
          >
            {msgCopied ? (
              <Check size={12} className="text-[var(--success)]" />
            ) : (
              <ClipboardCopy size={12} />
            )}
            {msgCopied ? "Copied!" : "Copy"}
          </button>
        )}
        {/* Conversational text — hidden in dashboard mode (card title already shows context) */}
        {!dashboardMode && (
          <p className="whitespace-pre-wrap text-sm">
            {renderMarkdownText(message.text, isUser ? undefined : onAction)}
          </p>
        )}
        {message.richContent && message.richContent.data === null ? (
          <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)] italic">
            Results collapsed to save memory. Re-run the query to view again.
          </div>
        ) : compactRichContent &&
          message.richContent &&
          [
            "query_result",
            "csv_table",
            "csv_group_by",
            "csv_aggregation",
            "multi_query_result",
          ].includes(message.richContent.type) ? (
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            {(() => {
              const d = message.richContent.data as Record<string, unknown>;
              const rows = ((d?.data ?? d?.rows) as unknown[]) ?? [];
              return <span>{rows.length} rows — view in panel →</span>;
            })()}
          </div>
        ) : message.richContent ? (
          <div className={dashboardMode ? "" : "mt-2"}>
            <RichContentRenderer
              richContent={message.richContent}
              onExecuteQuery={onExecuteQuery}
              onAction={onAction}
              cardId={cardId}
              linkedSelection={linkedSelection}
              onCellClick={onCellClick}
              drillDownConfig={drillDownConfig}
              onDrillDown={onDrillDown}
              displayMode={displayMode}
              compactAuto={compactAuto}
              savedChartType={savedChartType}
              onChartTypeChange={onChartTypeChange}
              diffInfo={diffInfo}
            />
          </div>
        ) : null}
        {/* Truncation banner */}
        {!isUser &&
          message.truncated &&
          message.totalRowsBeforeTruncation &&
          message.displayedRows && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--warning)] bg-[var(--warning-subtle)] px-3 py-1.5 text-xs text-[var(--warning)]">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
              <span>
                Showing {message.displayedRows.toLocaleString()} of{" "}
                {message.totalRowsBeforeTruncation.toLocaleString()} rows
                {message.estimatedSizeKB
                  ? ` (~${message.estimatedSizeKB} KB)`
                  : ""}
              </span>
            </div>
          )}
        {/* Anomaly alerts (hidden in dashboard mode) */}
        {!isUser &&
          !dashboardMode &&
          message.anomalies &&
          message.anomalies.length > 0 && (
            <div className="mt-2">
              <AnomalyAlert anomalies={message.anomalies} />
            </div>
          )}
        {/* Execution time badge + source + confidence + reference link (hidden in dashboard mode) */}
        {!isUser &&
          !dashboardMode &&
          (message.executionMs != null ||
            message.referenceUrl ||
            message.sourceName ||
            message.confidence != null) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {message.executionMs != null && !hideExecutionTime && (
                <span className="inline-flex items-center rounded-full bg-[var(--success-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
                  Completed in {message.executionMs}ms
                </span>
              )}
              {message.sourceName && (
                <SourceBadge
                  sourceName={message.sourceName}
                  sourceType={message.sourceType}
                />
              )}
              {message.confidence != null && message.confidence < 1 && (
                <ConfidenceBadge confidence={message.confidence} />
              )}
              {message.referenceUrl && (
                <a
                  href={message.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-subtle)] border border-[var(--brand)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors"
                >
                  <Info className="w-3 h-3" />
                  More info
                </a>
              )}
            </div>
          )}
        {/* Feedback bar (thumbs up/down) — hidden in dashboard mode */}
        {!isUser && !dashboardMode && !message.isError && onFeedback && (
          <FeedbackBar messageId={message.id} onFeedback={onFeedback} />
        )}
        {/* Retry button for errors */}
        {message.isError && message.retryText && onRetry && (
          <button
            onClick={() => onRetry(message.retryText!)}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--danger)] bg-[var(--bg-primary)] px-2.5 py-1 text-xs text-[var(--danger)] hover:bg-[var(--danger-subtle)] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function RichContentRenderer({
  richContent,
  onExecuteQuery,
  onAction,
  cardId,
  linkedSelection,
  onCellClick,
  drillDownConfig,
  onDrillDown,
  displayMode,
  compactAuto,
  savedChartType,
  onChartTypeChange,
  diffInfo,
}: {
  richContent: NonNullable<Message["richContent"]>;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onAction?: (text: string) => void;
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
  drillDownConfig?: DrillDownConfig[];
  onDrillDown?: (
    targetQuery: string,
    targetFilter: string,
    column: string,
    value: string,
  ) => void;
  displayMode?: "auto" | "table" | "chart";
  compactAuto?: boolean;
  savedChartType?: string;
  onChartTypeChange?: (type: string) => void;
  diffInfo?: {
    addedIndices: Set<number>;
    changedIndices: Set<number>;
    changedCells: Map<number, Map<string, unknown>>;
    removedRows: Record<string, unknown>[];
    totalChanges: number;
  };
}) {
  switch (richContent.type) {
    case "url_list": {
      const urls = richContent.data as UrlItem[];
      return (
        <ul className="mt-1 space-y-1">
          {urls.map((url, i) => (
            <li key={i}>
              <a
                href={url.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand)] underline text-sm hover:text-[var(--brand)]"
              >
                {url.title}
              </a>
            </li>
          ))}
        </ul>
      );
    }
    case "query_result": {
      const result = richContent.data as QueryResultData;
      return (
        <QueryResultTable
          result={result}
          cardId={cardId}
          linkedSelection={linkedSelection}
          onCellClick={onCellClick}
          drillDownConfig={drillDownConfig}
          onDrillDown={onDrillDown}
          displayMode={displayMode}
          compactAuto={compactAuto}
          diffInfo={diffInfo}
          savedChartType={savedChartType}
          onChartTypeChange={onChartTypeChange}
        />
      );
    }
    case "multi_query_result": {
      const results = richContent.data as MultiQueryResultItem[];
      return (
        <div className="mt-1 space-y-4">
          {results.map((item, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1 uppercase tracking-wide">
                {item.queryName}
              </h4>
              <QueryResultTable
                result={item.result}
                cardId={cardId}
                linkedSelection={linkedSelection}
                onCellClick={onCellClick}
                drillDownConfig={drillDownConfig}
                onDrillDown={onDrillDown}
                displayMode={displayMode}
                compactAuto={compactAuto}
              />
            </div>
          ))}
        </div>
      );
    }
    case "estimation": {
      const est = richContent.data as EstimationData;
      return (
        <div className="mt-1 text-xs text-[var(--text-secondary)]">
          <p>Duration: {est.estimatedDuration}ms</p>
          <p>{est.description}</p>
        </div>
      );
    }
    case "query_filter_form": {
      const formData = richContent.data as QueryFilterFormData;
      return (
        <QueryFilterForm
          data={formData}
          onSubmit={(queryName, filters) =>
            onExecuteQuery?.(queryName, filters)
          }
        />
      );
    }
    case "file_content": {
      const fileData = richContent.data as {
        content: string;
        filePath: string;
        format: string;
      };
      return (
        <div className="mt-1">
          <p className="text-[10px] text-[var(--text-muted)] mb-1 font-mono">
            {fileData.filePath}
          </p>
          <pre className="text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
            {fileData.content}
          </pre>
        </div>
      );
    }
    case "document_search": {
      const docData = richContent.data as {
        filePath: string;
        searchResults: Array<{
          heading: string | null;
          content: string;
          score: number;
        }>;
        searchKeywords?: string[];
      };
      return (
        <div className="mt-1">
          <p className="text-[10px] text-[var(--text-muted)] mb-1 font-mono">
            {docData.filePath}
          </p>
          {docData.searchResults.map((section, i) => (
            <div key={i} className="mb-2">
              {section.heading && (
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {section.heading}
                </p>
              )}
              <pre className="text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                {section.content}
              </pre>
            </div>
          ))}
        </div>
      );
    }
    case "csv_table": {
      const csvData = richContent.data as {
        headers: string[];
        rows: Record<string, string | number>[];
        filePath: string;
        rowCount: number;
      };
      return (
        <div className="mt-1 text-xs">
          <p className="text-[10px] text-[var(--text-muted)] mb-1 font-mono">
            {csvData.filePath}
          </p>
          <p className="text-[var(--text-secondary)]">
            {csvData.rowCount} rows
          </p>
          {csvData.headers.length > 0 && (
            <>
              <div className="mt-1">
                <PaginatedTableBody
                  rows={csvData.rows}
                  headers={csvData.headers}
                  renderRow={(row, i) => (
                    <tr
                      key={i}
                      className={
                        i % 2 === 0
                          ? "bg-[var(--bg-primary)]"
                          : "bg-[var(--bg-secondary)]"
                      }
                    >
                      {csvData.headers.map((h) => {
                        const val = row[h];
                        const num =
                          typeof val === "number"
                            ? val
                            : parseFloat(String(val ?? ""));
                        const isNum =
                          typeof val === "number" ||
                          (!isNaN(num) && String(val ?? "").trim() !== "");
                        return (
                          <td
                            key={h}
                            className={`px-2 py-1 border-b border-[var(--border)] ${
                              isNum && num < 0
                                ? "text-[var(--danger)] dark:text-[var(--danger)]"
                                : ""
                            }`}
                          >
                            {String(val ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                />
              </div>
              <Suspense
                fallback={
                  <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
                    Loading chart…
                  </div>
                }
              >
                <DataChart
                  data={csvData.rows as Record<string, unknown>[]}
                  headers={csvData.headers}
                  chartConfig={
                    (csvData as Record<string, unknown>).chartConfig as
                      | Record<string, unknown>
                      | undefined
                  }
                  columnConfig={
                    (csvData as Record<string, unknown>).columnConfig as
                      | Record<string, unknown>
                      | undefined
                  }
                  columnMetadata={
                    (csvData as Record<string, unknown>).columnMetadata as
                      | DetectedColumnMeta[]
                      | undefined
                  }
                  savedChartType={savedChartType}
                  onChartTypeChange={onChartTypeChange}
                />
              </Suspense>
            </>
          )}
        </div>
      );
    }
    case "csv_aggregation": {
      const aggData = richContent.data as {
        aggregation: {
          operation: string;
          column: string;
          result: number | string;
          topRows?: Record<string, string | number>[];
          topHeaders?: string[];
        };
        filePath: string;
        rowCount: number;
      };
      const isTop =
        aggData.aggregation.topRows && aggData.aggregation.topHeaders;
      return (
        <div className="mt-1 text-xs">
          <p className="text-[10px] text-[var(--text-muted)] mb-1 font-mono">
            {aggData.filePath}
          </p>
          {isTop ? (
            <PaginatedTableBody
              rows={aggData.aggregation.topRows!}
              headers={["#", ...aggData.aggregation.topHeaders!]}
              tableClassName="min-w-full text-xs border border-[var(--brand)] rounded"
              headerClassName="bg-[var(--brand-subtle)]"
              renderHeader={(h) =>
                h === "#" ? (
                  <th
                    key={h}
                    className="px-2 py-1 text-left font-medium text-[var(--brand)] border-b border-[var(--brand)] w-8"
                  >
                    #
                  </th>
                ) : (
                  <th
                    key={h}
                    className={`px-2 py-1 text-left font-medium border-b border-[var(--brand)] ${h === aggData.aggregation.column ? "text-[var(--brand)] bg-[var(--brand-subtle)]" : "text-[var(--brand)]"}`}
                  >
                    {h}
                    {h === aggData.aggregation.column ? " \u2193" : ""}
                  </th>
                )
              }
              renderRow={(row, i) => (
                <tr
                  key={i}
                  className={
                    i % 2 === 0
                      ? "bg-[var(--bg-primary)]"
                      : "bg-[var(--brand-subtle)]/30"
                  }
                >
                  <td className="px-2 py-1 border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
                    {i + 1}
                  </td>
                  {aggData.aggregation.topHeaders!.map((h) => (
                    <td
                      key={h}
                      className={`px-2 py-1 border-b border-[var(--border)] ${h === aggData.aggregation.column ? "font-semibold text-[var(--brand)]" : ""}`}
                    >
                      {String(row[h] ?? "")}
                    </td>
                  ))}
                </tr>
              )}
              footer={
                <p className="text-[var(--text-muted)] mt-1">
                  Sorted by {aggData.aggregation.column} (descending) from{" "}
                  {aggData.rowCount} total rows
                </p>
              }
            />
          ) : (
            <div className="bg-[var(--brand-subtle)] border border-[var(--brand)] rounded p-3">
              <p className="font-semibold text-[var(--brand)] text-sm">
                {aggData.aggregation.operation.toUpperCase()}(
                {aggData.aggregation.column}) ={" "}
                {String(aggData.aggregation.result)}
              </p>
              <p className="text-[var(--text-secondary)] mt-1">
                Computed over {aggData.rowCount} rows
              </p>
            </div>
          )}
        </div>
      );
    }
    case "csv_group_by": {
      const gbData = richContent.data as {
        groupColumn: string;
        groupColumns?: string[];
        groups: {
          groupValue: string | number;
          groupValues?: Record<string, string | number>;
          count: number;
          aggregations: Record<string, number>;
        }[];
        aggregatedColumns: { column: string; operation: string }[];
      };
      const aggCols = gbData.aggregatedColumns.map((c) => c.column);
      const isMultiCol = gbData.groupColumns && gbData.groupColumns.length > 1;
      const groupCols = isMultiCol
        ? gbData.groupColumns!
        : [gbData.groupColumn];
      // Build flat records for the chart
      const chartRows = gbData.groups.map((g) => {
        const base: Record<string, string | number> = {};
        if (isMultiCol && g.groupValues) {
          for (const col of groupCols) base[col] = g.groupValues[col] ?? "";
        } else {
          base[gbData.groupColumn] = g.groupValue;
        }
        return { ...base, ...g.aggregations };
      });
      const chartHeaders = [...groupCols, ...aggCols];
      const gbHeaders = [
        ...groupCols,
        ...aggCols.map((c) => `${c} (sum)`),
        "count",
      ];
      return (
        <div className="mt-1 text-xs">
          <PaginatedTableBody
            rows={gbData.groups}
            headers={gbHeaders}
            tableClassName="min-w-full text-xs border border-[var(--brand)] rounded"
            headerClassName="bg-[var(--brand-subtle)]"
            renderHeader={(h) => {
              const isGroupCol = groupCols.includes(h);
              return (
                <th
                  key={h}
                  className={`px-2 py-1 text-left font-medium border-b border-[var(--brand)] ${isGroupCol ? "text-[var(--brand)] bg-[var(--brand-subtle)]" : "text-[var(--brand)]"}`}
                >
                  {h}
                </th>
              );
            }}
            renderRow={(g, i) => (
              <tr
                key={i}
                className={
                  i % 2 === 0
                    ? "bg-[var(--bg-primary)]"
                    : "bg-[var(--brand-subtle)]/30"
                }
              >
                {isMultiCol && g.groupValues ? (
                  groupCols.map((col) => (
                    <td
                      key={col}
                      className="px-2 py-1 border-b border-[var(--border)] font-semibold text-[var(--brand)]"
                    >
                      {String(g.groupValues![col] ?? "")}
                    </td>
                  ))
                ) : (
                  <td className="px-2 py-1 border-b border-[var(--border)] font-semibold text-[var(--brand)]">
                    {String(g.groupValue)}
                  </td>
                )}
                {aggCols.map((c) => (
                  <td
                    key={c}
                    className="px-2 py-1 border-b border-[var(--border)]"
                  >
                    {g.aggregations[c]?.toLocaleString() ?? 0}
                  </td>
                ))}
                <td className="px-2 py-1 border-b border-[var(--border)]">
                  {g.count}
                </td>
              </tr>
            )}
          />
          {chartRows.length > 1 && (
            <div className="mt-2">
              <Suspense
                fallback={
                  <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
                    Loading chart…
                  </div>
                }
              >
                <DataChart data={chartRows} headers={chartHeaders} />
              </Suspense>
            </div>
          )}
        </div>
      );
    }
    case "knowledge_search": {
      const ksData = richContent.data as {
        results: Array<{
          queryName: string;
          queryDescription: string;
          filePath: string;
          referenceUrl?: string;
          sections: Array<{
            heading: string | null;
            content: string;
            score: number;
          }>;
        }>;
        keywords: string[];
      };
      return (
        <div className="mt-1 text-xs space-y-3">
          {ksData.results.map((doc) => (
            <div
              key={doc.queryName}
              className="border border-purple-200 rounded-lg overflow-hidden"
            >
              <div className="bg-purple-50 px-3 py-1.5 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {doc.queryName}
                </span>
                <span className="text-[var(--text-secondary)] text-[10px] truncate flex-1">
                  {doc.queryDescription}
                </span>
                {doc.referenceUrl && (
                  <a
                    href={doc.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-500 hover:text-purple-700 text-[10px] shrink-0"
                  >
                    Docs ↗
                  </a>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {doc.sections.map((sec, i) => (
                  <div key={i} className="px-3 py-1.5">
                    {sec.heading && (
                      <p className="font-semibold text-[var(--text-primary)] text-[11px] mb-0.5">
                        {sec.heading.replace(/^#+\s*/, "")}
                      </p>
                    )}
                    <pre className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap font-sans max-h-[120px] overflow-y-auto leading-relaxed">
                      {sec.content.length > 500
                        ? sec.content.substring(0, 500) + "..."
                        : sec.content}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "document_summary": {
      const docSummary = richContent.data as {
        title: string;
        sections: { heading: string; preview: string }[];
        stats: { label: string; value: string }[];
        keywords: string[];
      };
      return (
        <div className="mt-1 text-xs space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {docSummary.stats.map((stat) => (
              <div
                key={stat.label}
                className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px]"
              >
                <span className="font-medium">{stat.value}</span>
                <span className="text-purple-400">{stat.label}</span>
              </div>
            ))}
          </div>
          {docSummary.sections.length > 0 && (
            <div className="space-y-1">
              {docSummary.sections.map((sec, i) => (
                <div
                  key={i}
                  className="border border-[var(--border)] rounded p-1.5"
                >
                  <p className="font-semibold text-[var(--text-primary)] text-[11px]">
                    {sec.heading}
                  </p>
                  {sec.preview && (
                    <p className="text-[var(--text-muted)] text-[10px] mt-0.5 line-clamp-1">
                      {sec.preview}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "csv_summary": {
      const summary = richContent.data as {
        rowCount: number;
        columns: {
          column: string;
          type: "numeric" | "categorical";
          sum?: number;
          avg?: number;
          min?: number;
          max?: number;
          uniqueValues?: number;
          topValues?: { value: string; count: number }[];
        }[];
      };
      return (
        <div className="mt-1 text-xs space-y-2">
          <div className="inline-block bg-[var(--brand-subtle)] text-[var(--brand)] px-2 py-0.5 rounded font-medium text-[11px]">
            {summary.rowCount} rows
          </div>
          <div className="grid grid-cols-2 gap-2">
            {summary.columns.map((col) => (
              <div
                key={col.column}
                className="border border-[var(--border)] rounded p-2"
              >
                <p className="font-semibold text-[var(--text-primary)] text-[11px] mb-1">
                  {col.column}
                </p>
                {col.type === "numeric" ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                    <span className="text-[var(--text-muted)]">Sum</span>
                    <span className="text-right font-medium">
                      {col.sum?.toLocaleString()}
                    </span>
                    <span className="text-[var(--text-muted)]">Avg</span>
                    <span className="text-right font-medium">
                      {col.avg?.toLocaleString()}
                    </span>
                    <span className="text-[var(--text-muted)]">Min</span>
                    <span className="text-right font-medium">
                      {col.min?.toLocaleString()}
                    </span>
                    <span className="text-[var(--text-muted)]">Max</span>
                    <span className="text-right font-medium">
                      {col.max?.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px]">
                    <p className="text-[var(--text-muted)]">
                      {col.uniqueValues} unique values
                    </p>
                    {col.topValues && col.topValues.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {col.topValues.slice(0, 3).map((tv) => (
                          <div key={tv.value} className="flex justify-between">
                            <span className="text-[var(--text-secondary)] truncate">
                              {tv.value}
                            </span>
                            <span className="text-[var(--text-muted)] ml-1">
                              ({tv.count})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "query_list": {
      const items = richContent.data as QueryListItem[];
      const typeColors: Record<string, string> = {
        api: "bg-[var(--brand-subtle)] text-[var(--brand)]",
        url: "bg-[var(--success-subtle)] text-[var(--success)]",
        document: "bg-purple-100 text-purple-700",
        csv: "bg-[var(--warning-subtle)] text-[var(--warning)]",
        xlsx: "bg-emerald-100 text-emerald-700",
        xls: "bg-emerald-100 text-emerald-700",
      };
      return (
        <div className="mt-1 space-y-1.5">
          {items.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                if (item.type === "url" && item.url) {
                  window.open(item.url, "_blank", "noopener,noreferrer");
                } else {
                  onAction?.(`run ${item.name}`);
                }
              }}
              className="w-full flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-left hover:border-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {item.name}
                  </span>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[item.type] || "bg-[var(--bg-secondary)] text-[var(--text-primary)]"}`}
                  >
                    {item.type}
                  </span>
                </div>
                {item.description && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
              {item.filters.length > 0 && (
                <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap mt-0.5">
                  {item.filters.length} filter
                  {item.filters.length > 1 ? "s" : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      );
    }
    case "document_answer": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = richContent.data as any;
      if (data.mode === "answer" && data.answers) {
        return (
          <div className="mt-2 space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.answers.map((a: any, i: number) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--brand)] bg-[var(--brand-subtle)] p-3"
              >
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  <span className="bg-[var(--warning-subtle)] font-medium px-0.5 rounded">
                    {a.answer}
                  </span>
                </p>
                {a.context && a.context !== a.answer && (
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed italic">
                    {a.context}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                  {a.sourceHeading && (
                    <span className="bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                      {a.sourceHeading}
                    </span>
                  )}
                  <span>{a.confidence}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        );
      }
      // Sections fallback mode
      if (data.mode === "sections" && data.sections) {
        return (
          <div className="mt-2 space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.sections.map((s: any, i: number) => (
              <div
                key={i}
                className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-2.5"
              >
                {s.heading && (
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">
                    {s.heading}
                  </p>
                )}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {s.content}
                </p>
              </div>
            ))}
          </div>
        );
      }
      return null;
    }
    case "document_upload_result": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = richContent.data as any;
      if (data.mode === "list" && data.documents) {
        return (
          <div className="mt-2 space-y-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.documents.map((doc: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">
                    {doc.format === "pdf"
                      ? "\u{1F4C4}"
                      : doc.format === "docx"
                        ? "\u{1F4DD}"
                        : "\u{1F4C3}"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {doc.filename}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {doc.wordCount.toLocaleString()} words &middot;{" "}
                      {doc.chunkCount} chunks
                      {doc.pageCount ? ` \u00b7 ${doc.pageCount} pages` : ""}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700">
                  {doc.format}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Total: {data.totalChunks} searchable chunks
            </p>
          </div>
        );
      }
      // Single upload result
      if (data.document) {
        return (
          <div className="mt-2 rounded border border-[var(--success)] bg-[var(--success-subtle)] p-3">
            <p className="text-xs font-medium text-[var(--success)]">
              {data.message}
            </p>
          </div>
        );
      }
      return null;
    }
    case "recommendations": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recs = richContent.data as any[];
      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {recs.map((rec: any, i: number) => (
            <button
              key={i}
              onClick={() => onAction?.(rec.name)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:border-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors"
            >
              <span className="text-[10px]">
                {rec.type === "query"
                  ? "\u{1F50D}"
                  : rec.type === "document"
                    ? "\u{1F4C4}"
                    : "\u2753"}
              </span>
              <span className="font-medium">{rec.name}</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {rec.reason}
              </span>
            </button>
          ))}
        </div>
      );
    }
    // ── ML Analysis richContent types ──────────────────────────────
    case "column_profile": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profiles = richContent.data as any[];
      return (
        <div className="mt-1 text-xs">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-xs border border-[var(--brand)] rounded">
              <thead>
                <tr className="bg-[var(--brand-subtle)]">
                  <th className="px-2 py-1 text-left font-medium text-[var(--brand)] border-b border-[var(--brand)]">
                    Column
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-[var(--brand)] border-b border-[var(--brand)]">
                    Type
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-[var(--brand)] border-b border-[var(--brand)]">
                    Null %
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-[var(--brand)] border-b border-[var(--brand)]">
                    Unique
                  </th>
                  <th className="px-2 py-1 text-left font-medium text-[var(--brand)] border-b border-[var(--brand)]">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {profiles.map((p: any, i: number) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-[var(--bg-primary)]"
                        : "bg-[var(--brand-subtle)]/30"
                    }
                  >
                    <td className="px-2 py-1 border-b border-[var(--border)] font-semibold text-[var(--brand)]">
                      {p.column}
                    </td>
                    <td className="px-2 py-1 border-b border-[var(--border)]">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        {p.type}
                      </span>
                    </td>
                    <td className="px-2 py-1 border-b border-[var(--border)]">
                      {p.nullPercent.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1 border-b border-[var(--border)]">
                      {p.cardinality}
                    </td>
                    <td className="px-2 py-1 border-b border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
                      {p.stats
                        ? `mean=${p.stats.mean?.toFixed(1)}, std=${p.stats.stdDev?.toFixed(1)}`
                        : p.topValues?.slice(0, 3).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case "smart_summary": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summary = richContent.data as any;
      const severityColors: Record<string, string> = {
        info: "border-[var(--brand)] bg-[var(--brand-subtle)]",
        notable: "border-[var(--warning)] bg-[var(--warning-subtle)]",
        critical: "border-[var(--danger)] bg-[var(--danger-subtle)]",
      };
      return (
        <div className="mt-1 space-y-1.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(summary.highlights || []).map((h: any, i: number) => (
            <div
              key={i}
              className={`text-xs rounded-md border-l-4 px-3 py-2 ${severityColors[h.severity] || "border-[var(--border)] bg-[var(--bg-secondary)]"}`}
            >
              <span className="font-medium text-[var(--text-primary)]">
                {h.column}:
              </span>{" "}
              <span className="text-[var(--text-secondary)]">{h.insight}</span>
            </div>
          ))}
        </div>
      );
    }
    case "correlation_heatmap": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const corrData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense
            fallback={
              <div className="text-xs text-[var(--text-muted)]">
                Loading heatmap...
              </div>
            }
          >
            <HeatmapChart
              matrix={corrData.matrix}
              rowLabels={corrData.columns}
              colLabels={corrData.columns}
              colorScale="diverging"
              title="Correlation Matrix"
            />
          </Suspense>
        </div>
      );
    }
    case "distribution_histogram": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const histData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense
            fallback={
              <div className="text-xs text-[var(--text-muted)]">
                Loading histogram...
              </div>
            }
          >
            <HistogramChart
              bins={histData.bins}
              stats={histData.stats}
              column={histData.column}
            />
          </Suspense>
        </div>
      );
    }
    case "anomaly_table": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anomalyData = richContent.data as any;
      return (
        <div className="mt-1 text-xs">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-xs border border-[var(--danger)] rounded">
              <thead>
                <tr className="bg-[var(--danger-subtle)]">
                  <th className="px-2 py-1 text-left font-medium text-[var(--danger)] border-b border-[var(--danger)]">
                    Row
                  </th>
                  {anomalyData.headers.slice(0, 6).map((h: string) => (
                    <th
                      key={h}
                      className="px-2 py-1 text-left font-medium text-[var(--danger)] border-b border-[var(--danger)]"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-left font-medium text-[var(--danger)] border-b border-[var(--danger)]">
                    Outlier Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {}
                {anomalyData.outlierRows
                  .slice(0, 30)
                  .map((o: any, i: number) => (
                    <tr key={i} className="bg-[var(--danger-subtle)]/40">
                      <td className="px-2 py-1 border-b border-[var(--border)] font-semibold text-[var(--danger)]">
                        #{o.rowIndex}
                      </td>
                      {anomalyData.headers.slice(0, 6).map((h: string) => (
                        <td
                          key={h}
                          className={`px-2 py-1 border-b border-[var(--border)] ${
                            o.outlierColumns.some(
                              (oc: { column: string }) => oc.column === h,
                            )
                              ? "bg-[var(--danger-subtle)] font-semibold text-[var(--danger)]"
                              : ""
                          }`}
                        >
                          {String(o.row[h] ?? "")}
                        </td>
                      ))}
                      <td className="px-2 py-1 border-b border-[var(--border)] text-[10px] text-[var(--danger)]">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {o.outlierColumns.map((oc: any, ocIdx: number) => {
                          // Human-readable column name: strip prefix, replace _ with space, title case
                          const label = oc.column
                            .replace(/^[a-z]+_/, "") // strip common prefixes like metrics_, comp_
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c: string) => c.toUpperCase());
                          const dir =
                            oc.direction === "high" ? "above" : "below";
                          const severity =
                            Math.abs(oc.zScore) >= 3
                              ? "extremely"
                              : "unusually";
                          const avgLabel =
                            oc.mean !== undefined
                              ? ` (avg: ${oc.mean.toLocaleString()})`
                              : "";
                          return (
                            <span key={ocIdx}>
                              {ocIdx > 0 && (
                                <span className="mx-1 text-[var(--text-muted)]">
                                  |
                                </span>
                              )}
                              <span
                                className={
                                  Math.abs(oc.zScore) >= 3
                                    ? "text-[var(--danger)] font-semibold"
                                    : ""
                                }
                              >
                                {label}:{" "}
                                <strong>
                                  {typeof oc.value === "number"
                                    ? oc.value.toLocaleString()
                                    : oc.value}
                                </strong>
                                {avgLabel} &mdash; {severity} {dir} average
                              </span>
                            </span>
                          );
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {anomalyData.totalOutliers > 30 && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Showing 30 of {anomalyData.totalOutliers} outlier rows
            </p>
          )}
        </div>
      );
    }
    case "trend_analysis": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trendData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense
            fallback={
              <div className="text-xs text-[var(--text-muted)]">
                Loading trend chart...
              </div>
            }
          >
            <TrendChart
              dataPoints={trendData.dataPoints}
              trendLine={trendData.trendLine}
              slope={trendData.slope}
              rSquared={trendData.rSquared}
              direction={trendData.direction}
            />
          </Suspense>
        </div>
      );
    }
    case "duplicate_rows": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dupData = richContent.data as any;
      return (
        <div className="mt-1 text-xs space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {dupData.groups.slice(0, 10).map((group: any, gi: number) => (
            <div
              key={gi}
              className="border border-[var(--warning)] rounded p-2 bg-[var(--warning-subtle)]/30"
            >
              <div className="font-medium text-[var(--warning)] mb-1">
                Group {gi + 1} ({group.duplicates.length + 1} rows, similarity:{" "}
                {(group.similarity * 100).toFixed(0)}%)
              </div>
              <div className="text-[10px] text-[var(--text-secondary)]">
                <div className="font-medium">
                  Original: {JSON.stringify(group.canonical).slice(0, 120)}...
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {group.duplicates.slice(0, 3).map((d: any, di: number) => (
                  <div key={di} className="text-[var(--warning)] ml-3">
                    Dup: {JSON.stringify(d).slice(0, 120)}...
                  </div>
                ))}
              </div>
            </div>
          ))}
          {dupData.groups.length > 10 && (
            <p className="text-[10px] text-[var(--text-muted)]">
              Showing 10 of {dupData.groups.length} duplicate groups
            </p>
          )}
        </div>
      );
    }
    case "missing_heatmap": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missingData = richContent.data as any;
      const missingCols = missingData.columns.filter(
        (c: { nullPercent: number }) => c.nullPercent > 0,
      );
      return (
        <div className="mt-1 text-xs">
          <div className="space-y-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {missingCols.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-24 truncate font-medium text-[var(--text-primary)]">
                  {c.column}
                </span>
                <div className="flex-1 h-3 bg-[var(--bg-secondary)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--danger)] rounded"
                    style={{ width: `${Math.min(c.nullPercent, 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-[var(--text-secondary)]">
                  {c.nullPercent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          {missingCols.length === 0 && (
            <p className="text-[var(--text-muted)]">No missing values found</p>
          )}
        </div>
      );
    }
    case "clustering_result": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clusterData = richContent.data as any;
      return (
        <div className="mt-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {clusterData.clusters.map((c: any, i: number) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] border border-[var(--brand)]"
              >
                Cluster {i + 1}: {c.size} rows — {c.label}
              </span>
            ))}
          </div>
          <Suspense
            fallback={
              <div className="text-xs text-[var(--text-muted)]">
                Loading scatter plot...
              </div>
            }
          >
            <ScatterPlot
              points={clusterData.points}
              xLabel={clusterData.columns?.[0]}
              yLabel={clusterData.columns?.[1]}
              title={`K-Means (k=${clusterData.k})`}
            />
          </Suspense>
        </div>
      );
    }
    case "decision_tree_result": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dtData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense
            fallback={
              <div className="text-xs text-[var(--text-muted)]">
                Loading decision tree...
              </div>
            }
          >
            <DecisionTreeViz
              tree={dtData.tree}
              accuracy={dtData.accuracy}
              featureImportance={dtData.featureImportance}
              targetColumn={dtData.targetColumn}
            />
          </Suspense>
        </div>
      );
    }
    case "forecast_result": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fcData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense
            fallback={
              <div className="text-xs text-[var(--text-muted)]">
                Loading forecast chart...
              </div>
            }
          >
            <ForecastChart
              historical={fcData.historical}
              predicted={fcData.predicted}
              valueLabel={fcData.valueColumn}
            />
          </Suspense>
        </div>
      );
    }
    case "pca_result": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pcaData = richContent.data as any;
      return (
        <div className="mt-1">
          <div className="flex gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] border border-[var(--brand)]">
              PC1: {((pcaData.varianceExplained?.[0] ?? 0) * 100).toFixed(1)}%
              variance
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-subtle)] text-[var(--brand)] border border-[var(--brand)]">
              PC2: {((pcaData.varianceExplained?.[1] ?? 0) * 100).toFixed(1)}%
              variance
            </span>
          </div>
          <Suspense
            fallback={
              <div className="text-xs text-[var(--text-muted)]">
                Loading PCA scatter...
              </div>
            }
          >
            <ScatterPlot
              points={pcaData.points}
              xLabel="PC1"
              yLabel="PC2"
              title="PCA Projection"
            />
          </Suspense>
        </div>
      );
    }
    case "insight_report": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportData = richContent.data as any;
      return (
        <div className="mt-1 text-xs">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {reportData.sections?.map((s: string, i: number) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success)] text-[10px]"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob([reportData.html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "analysis-report.html";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1 rounded border border-[var(--brand)] bg-[var(--brand-subtle)] px-3 py-1.5 text-xs text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-colors"
            >
              Download HTML Report
            </button>
            <button
              onClick={() => {
                const blob = new Blob([reportData.csvSummary], {
                  type: "text/csv",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "analysis-summary.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Download CSV Summary
            </button>
          </div>
        </div>
      );
    }
    case "error":
      return null;
    default:
      return null;
  }
}

/** Format cell values for display — auto-detect ISO dates and convert to human-readable format. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (ISO_DATE_RE.test(str)) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        // If time is exactly midnight (00:00:00), show date only
        const hasTime =
          d.getUTCHours() !== 0 ||
          d.getUTCMinutes() !== 0 ||
          d.getUTCSeconds() !== 0;
        return hasTime ? d.toLocaleString() : d.toLocaleDateString();
      }
    } catch {
      /* fall through */
    }
  }
  return str;
}

function isNumericValue(v: unknown): boolean {
  if (v == null || v === "") return false;
  return !isNaN(Number(v));
}

function isNumericColumn(
  rows: Record<string, unknown>[],
  col: string,
): boolean {
  // Sample up to 20 non-null values to decide
  let count = 0;
  let numericCount = 0;
  for (const row of rows) {
    const v = row[col];
    if (v == null || v === "") continue;
    count++;
    if (isNumericValue(v)) numericCount++;
    if (count >= 20) break;
  }
  return count > 0 && numericCount / count >= 0.8;
}

function QueryResultTable({
  result,
  cardId,
  linkedSelection,
  onCellClick,
  drillDownConfig,
  onDrillDown,
  editable = false,
  queryName,
  displayMode,
  compactAuto = true,
  diffInfo,
  savedChartType,
  onChartTypeChange,
}: {
  result: QueryResultData & {
    chartConfig?: Record<string, unknown>;
    columnConfig?: Record<string, unknown>;
    columnMetadata?: DetectedColumnMeta[];
  };
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
  drillDownConfig?: DrillDownConfig[];
  onDrillDown?: (
    targetQuery: string,
    targetFilter: string,
    column: string,
    value: string,
  ) => void;
  editable?: boolean;
  queryName?: string;
  /** Display mode: auto (both), table only, or chart only */
  displayMode?: "auto" | "table" | "chart";
  /** When auto mode, use compact tab toggle instead of stacking both */
  compactAuto?: boolean;
  /** Diff info from previous query run — highlights changes in table */
  diffInfo?: {
    addedIndices: Set<number>;
    changedIndices: Set<number>;
    changedCells: Map<number, Map<string, unknown>>;
    removedRows: Record<string, unknown>[];
    totalChanges: number;
  };
  savedChartType?: string;
  onChartTypeChange?: (type: string) => void;
}) {
  const [pageRange, setPageRange] = useState({ start: 0, end: 10 });
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showSummary, setShowSummary] = useState(false);
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dirtyMap, setDirtyMap] = useState<
    Map<number, Map<string, { oldValue: string; newValue: string }>>
  >(new Map());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  // Auto mode: tab toggle between table and chart (defaults to table)
  const [autoTab, setAutoTab] = useState<"table" | "chart">("table");
  const rows = result.data || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Detect numeric columns once
  const numericCols = useMemo(() => {
    const set = new Set<string>();
    for (const col of columns) {
      if (isNumericColumn(rows, col)) set.add(col);
    }
    return set;
  }, [rows, columns]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const isNum = numericCols.has(sortCol);
    const sorted = [...rows].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (isNum) return Number(va) - Number(vb);
      return String(va).localeCompare(String(vb));
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [rows, sortCol, sortDir, numericCols]);

  const pagedData = sortedRows.slice(pageRange.start, pageRange.end);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPageRange({ start: 0, end: 10 });
  };

  // Compute summary stats
  const summaryStats = useMemo(() => {
    if (!showSummary || rows.length === 0) return null;
    const stats: Record<
      string,
      { sum?: number; avg?: number; distinct?: number }
    > = {};
    for (const col of columns) {
      if (numericCols.has(col)) {
        let sum = 0;
        let count = 0;
        for (const row of rows) {
          const v = row[col];
          if (v != null && v !== "") {
            sum += Number(v);
            count++;
          }
        }
        stats[col] = {
          sum: Math.round(sum * 100) / 100,
          avg: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
        };
      } else {
        const unique = new Set(rows.map((r) => String(r[col] ?? "")));
        stats[col] = { distinct: unique.size };
      }
    }
    return stats;
  }, [showSummary, rows, columns, numericCols]);

  // Build a set of drill-down-able columns for quick lookup
  const drillDownMap = new Map<string, DrillDownConfig>();
  if (drillDownConfig) {
    for (const dd of drillDownConfig) {
      drillDownMap.set(dd.sourceColumn, dd);
    }
  }

  // Determine if this card should highlight rows (linked selection from another card)
  const highlightValue = linkedSelection?.value;
  const isSourceCard = linkedSelection?.sourceCardId === cardId;
  const shouldHighlight = !!highlightValue && !isSourceCard && !!cardId;

  const isRowHighlighted = (row: Record<string, unknown>) => {
    if (!shouldHighlight) return false;
    return Object.values(row).some((v) => String(v) === highlightValue);
  };

  // ── Inline Editing ──
  // Focus input when editing
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  const startCellEdit = useCallback(
    (rowIdx: number, col: string) => {
      if (!editable) return;
      setEditingCell({ row: rowIdx, col });
      setEditValue(String(rows[rowIdx]?.[col] ?? ""));
    },
    [editable, rows],
  );

  const commitCellEdit = useCallback(() => {
    if (!editingCell) return;
    const { row: rowIdx, col } = editingCell;
    const oldVal = String(rows[rowIdx]?.[col] ?? "");
    if (oldVal !== editValue) {
      setDirtyMap((prev) => {
        const next = new Map(prev);
        const rowDirty = new Map(next.get(rowIdx) || new Map());
        const existing = rowDirty.get(col);
        const origOld = existing ? existing.oldValue : oldVal;
        if (origOld === editValue) {
          rowDirty.delete(col);
          if (rowDirty.size === 0) next.delete(rowIdx);
          else next.set(rowIdx, rowDirty);
        } else {
          rowDirty.set(col, { oldValue: origOld, newValue: editValue });
          next.set(rowIdx, rowDirty);
        }
        return next;
      });
    }
    setEditingCell(null);
  }, [editingCell, editValue, rows]);

  const totalDirtyCount = useMemo(() => {
    let c = 0;
    dirtyMap.forEach((m) => (c += m.size));
    return c;
  }, [dirtyMap]);

  const handleInlineSave = useCallback(async () => {
    if (!queryName) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const changes: {
        primaryKey: Record<string, unknown>;
        updates: Record<string, string>;
      }[] = [];
      dirtyMap.forEach((colMap, rowIdx) => {
        const updates: Record<string, string> = {};
        colMap.forEach((change, colName) => {
          updates[colName] = change.newValue;
        });
        changes.push({ primaryKey: rows[rowIdx] || {}, updates });
      });
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryName, groupId: "default", changes }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = await res.json();
      setSaveMsg(json.message || `Saved ${changes.length} change(s)`);
      setDirtyMap(new Map());
    } catch (err) {
      setSaveMsg(
        `Error: ${err instanceof Error ? err.message : "Save failed"}`,
      );
    } finally {
      setSaving(false);
    }
  }, [dirtyMap, queryName, rows]);

  return (
    <div className="mt-1 text-xs">
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <span>
          {result.rowCount} rows in {result.executionTime}ms
        </span>
        {editable && totalDirtyCount > 0 && (
          <button
            onClick={handleInlineSave}
            disabled={saving}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--brand)] text-white hover:bg-[var(--brand)] disabled:opacity-50 transition-colors"
          >
            {saving
              ? "Saving..."
              : `Save ${totalDirtyCount} change${totalDirtyCount !== 1 ? "s" : ""}`}
          </button>
        )}
        {saveMsg && (
          <span
            className={`text-[10px] ${saveMsg.startsWith("Error") ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
          >
            {saveMsg}
          </span>
        )}
        {rows.length > 0 && (
          <button
            onClick={() => setShowSummary((s) => !s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
              showSummary
                ? "bg-[var(--brand-subtle)] text-[var(--brand)]"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
            title={
              showSummary
                ? "Hide summary row"
                : "Show summary row (totals, averages)"
            }
          >
            &Sigma;
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <>
          {/* Auto mode: compact tab toggle (only when compactAuto is enabled) */}
          {displayMode === "auto" && compactAuto && (
            <div className="flex items-center gap-0.5 mt-1 mb-1">
              <button
                onClick={() => setAutoTab("table")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-l-md border transition-colors ${
                  autoTab === "table"
                    ? "bg-[var(--brand-subtle)] text-[var(--brand)] border-[var(--brand)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setAutoTab("chart")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-r-md border border-l-0 transition-colors ${
                  autoTab === "chart"
                    ? "bg-[var(--brand-subtle)] text-[var(--brand)] border-[var(--brand)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                Chart
              </button>
            </div>
          )}
          {(displayMode === "auto"
            ? compactAuto
              ? autoTab === "table"
              : true
            : displayMode !== "chart") && (
            <>
              <div className="mt-1 overflow-x-auto">
                <table className="min-w-full text-xs border border-[var(--border)] rounded">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)]">
                      {columns.map((key) => {
                        const hasDrillDown = drillDownMap.has(key);
                        const isSorted = sortCol === key;
                        return (
                          <th
                            key={key}
                            className={`px-2 py-1 text-left font-medium border-b cursor-pointer select-none hover:bg-[var(--bg-secondary)] ${
                              hasDrillDown
                                ? "text-[var(--brand)]"
                                : "text-[var(--text-secondary)]"
                            }`}
                            title={
                              hasDrillDown
                                ? `Drill down: ${drillDownMap.get(key)!.label || drillDownMap.get(key)!.targetQuery}`
                                : "Click to sort"
                            }
                            onClick={() => handleSort(key)}
                          >
                            <span className="inline-flex items-center gap-0.5">
                              {key}
                              {hasDrillDown && (
                                <ArrowRight className="w-3 h-3 text-[var(--brand)]" />
                              )}
                              {isSorted && (
                                <span className="text-[var(--brand)] text-[9px] ml-0.5">
                                  {sortDir === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedData.map((row, i) => {
                      const highlighted = isRowHighlighted(row);
                      const actualRowIdx = pageRange.start + i;
                      const isAddedRow =
                        diffInfo?.addedIndices.has(actualRowIdx);
                      const isChangedRow =
                        diffInfo?.changedIndices.has(actualRowIdx);
                      const rowChangedCells =
                        diffInfo?.changedCells.get(actualRowIdx);
                      const diffRowClass = isAddedRow
                        ? "bg-[var(--success-subtle)]"
                        : isChangedRow
                          ? "bg-[var(--warning-subtle)]/50"
                          : "";
                      return (
                        <tr
                          key={i}
                          className={`border-b border-[var(--border)] ${highlighted ? "bg-[var(--warning-subtle)]" : diffRowClass}`}
                        >
                          {Object.entries(row).map(([key, val], j) => {
                            const dd = drillDownMap.get(key);
                            const hasDrillDown = !!dd && !!onDrillDown;
                            const hasEventClick = onCellClick && cardId;
                            const cellPrevValue = rowChangedCells?.get(key);
                            const isEditingThis =
                              editingCell?.row === actualRowIdx &&
                              editingCell?.col === key;
                            const cellDirty = dirtyMap
                              .get(actualRowIdx)
                              ?.has(key);
                            const displayVal = cellDirty
                              ? dirtyMap.get(actualRowIdx)!.get(key)!.newValue
                              : val;
                            const numVal =
                              typeof displayVal === "number"
                                ? displayVal
                                : parseFloat(String(displayVal ?? ""));
                            const isNumeric =
                              typeof displayVal === "number" ||
                              (!isNaN(numVal) &&
                                String(displayVal ?? "").trim() !== "");
                            const numColor =
                              !hasDrillDown && isNumeric && numVal < 0
                                ? "text-[var(--danger)] dark:text-[var(--danger)]"
                                : "";
                            return (
                              <td
                                key={j}
                                className={`px-2 py-1 ${
                                  hasDrillDown
                                    ? "text-[var(--brand)] underline decoration-dotted cursor-pointer hover:bg-[var(--brand-subtle)] hover:text-[var(--brand)]"
                                    : hasEventClick
                                      ? "cursor-pointer hover:bg-[var(--brand-subtle)]"
                                      : editable
                                        ? "cursor-cell"
                                        : ""
                                } ${numColor} ${highlighted && String(val) === highlightValue ? "bg-[var(--warning-subtle)] font-semibold" : ""} ${cellDirty ? "bg-[var(--warning-subtle)]" : ""} ${cellPrevValue !== undefined ? "bg-[var(--warning-subtle)] ring-1 ring-inset ring-[var(--warning)]" : ""} ${isAddedRow ? "bg-[var(--success-subtle)]" : ""}`}
                                onClick={() => {
                                  if (hasDrillDown) {
                                    onDrillDown!(
                                      dd!.targetQuery,
                                      dd!.targetFilter,
                                      key,
                                      String(val),
                                    );
                                  } else if (hasEventClick) {
                                    onCellClick!(key, val);
                                  }
                                }}
                                onDoubleClick={() =>
                                  startCellEdit(actualRowIdx, key)
                                }
                                title={
                                  cellPrevValue !== undefined
                                    ? `Previous: ${String(cellPrevValue ?? "(empty)")}`
                                    : hasDrillDown
                                      ? `Drill down: ${dd!.label || dd!.targetQuery}`
                                      : isAddedRow
                                        ? "New row"
                                        : editable
                                          ? "Double-click to edit"
                                          : undefined
                                }
                              >
                                {isEditingThis ? (
                                  <input
                                    ref={editInputRef}
                                    value={editValue}
                                    onChange={(e) =>
                                      setEditValue(e.target.value)
                                    }
                                    onBlur={commitCellEdit}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitCellEdit();
                                      else if (e.key === "Escape")
                                        setEditingCell(null);
                                    }}
                                    className="w-full px-1 py-0 text-xs border border-[var(--brand)] rounded outline-none bg-[var(--bg-primary)]"
                                  />
                                ) : (
                                  formatCellValue(displayVal)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  {showSummary && summaryStats && (
                    <tfoot>
                      <tr className="bg-[var(--bg-secondary)] border-t-2 border-[var(--border)]">
                        {columns.map((col) => {
                          const s = summaryStats[col];
                          if (!s)
                            return <td key={col} className="px-2 py-1.5" />;
                          if (s.sum !== undefined) {
                            return (
                              <td
                                key={col}
                                className="px-2 py-1.5 font-semibold text-[var(--text-primary)]"
                              >
                                <div className="leading-tight">
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    Sum{" "}
                                  </span>
                                  <span>{s.sum.toLocaleString()}</span>
                                </div>
                                <div className="leading-tight">
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    Avg{" "}
                                  </span>
                                  <span>{s.avg!.toLocaleString()}</span>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td
                              key={col}
                              className="px-2 py-1.5 text-[var(--text-secondary)] italic"
                            >
                              {s.distinct} unique
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {rows.length > 10 && (
                <TablePagination
                  totalRows={rows.length}
                  onPageChange={(start, end) => setPageRange({ start, end })}
                  onExport={() =>
                    exportToCsv(
                      rows as Record<string, unknown>[],
                      "query-results.csv",
                    )
                  }
                />
              )}
            </>
          )}
          {(displayMode === "auto"
            ? compactAuto
              ? autoTab === "chart"
              : true
            : displayMode !== "table") && (
            <Suspense
              fallback={
                <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
                  Loading chart…
                </div>
              }
            >
              <DataChart
                data={rows}
                chartConfig={result.chartConfig}
                columnConfig={result.columnConfig}
                columnMetadata={result.columnMetadata}
                savedChartType={savedChartType}
                onChartTypeChange={onChartTypeChange}
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
}
