"use client";

import { Suspense, lazy } from "react";
import type { Message } from "@/hooks/useChat";
import type { DrillDownConfig } from "@/types/dashboard";
import { QueryFilterForm, type QueryFilterFormData } from "./QueryFilterForm";
import type { DetectedColumnMeta } from "./DataChart";
import { QueryResultTable } from "./QueryResultTable";
import { PaginatedTableBody } from "./PaginatedTableBody";
import type {
  UrlItem,
  QueryResultData,
  MultiQueryResultItem,
  EstimationData,
  LinkedSelection,
  DiffInfo,
  DocumentAnswerData,
  DocumentUploadResultData,
  RecommendationItem,
  ColumnProfileItem,
  SmartSummaryData,
  CorrelationHeatmapData,
  DistributionHistogramData,
  AnomalyTableData,
  TrendAnalysisData,
  DuplicateRowsData,
  MissingHeatmapData,
  ClusteringResultData,
  DecisionTreeResultData,
  ForecastResultData,
  PcaResultData,
  InsightReportData,
  CsvTableData,
  CsvAggregationData,
  CsvGroupByData,
  KnowledgeSearchData,
  DocumentSummaryData,
  CsvSummaryData,
  FileContentData,
  DocumentSearchData,
} from "./richContentTypes";

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

export interface RichContentRendererProps {
  richContent: NonNullable<Message["richContent"]>;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onAction?: (text: string) => void;
  onShowInPanel?: (
    data: Record<string, unknown>[],
    columns: string[],
    title: string,
  ) => void;
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
  diffInfo?: DiffInfo;
}

export function RichContentRenderer({
  richContent,
  onExecuteQuery,
  onAction,
  onShowInPanel,
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
}: RichContentRendererProps) {
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
      const fileData = richContent.data as FileContentData;
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
      const docData = richContent.data as DocumentSearchData;
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
      const csvData = richContent.data as CsvTableData;
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
                  chartConfig={csvData.chartConfig}
                  columnConfig={csvData.columnConfig}
                  columnMetadata={
                    csvData.columnMetadata as DetectedColumnMeta[] | undefined
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
      const aggData = richContent.data as CsvAggregationData;
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
      const gbData = richContent.data as CsvGroupByData;
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
      const ksData = richContent.data as KnowledgeSearchData;
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
      const docSummary = richContent.data as DocumentSummaryData;
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
      const summary = richContent.data as CsvSummaryData;
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
      const items =
        richContent.data as import("./richContentTypes").QueryListItem[];
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
      const data = richContent.data as DocumentAnswerData;
      if (data.mode === "answer" && data.answers) {
        return (
          <div className="mt-2 space-y-3">
            {data.answers.map((a, i: number) => (
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
            {data.sections.map((s, i: number) => (
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
      const data = richContent.data as DocumentUploadResultData;
      if (data.mode === "list" && data.documents) {
        return (
          <div className="mt-2 space-y-1.5">
            {data.documents.map((doc, i: number) => (
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
      const recs = richContent.data as RecommendationItem[];
      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recs.map((rec, i: number) => (
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
      const profiles = richContent.data as ColumnProfileItem[];
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
                {profiles.map((p, i: number) => (
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
      const summary = richContent.data as SmartSummaryData;
      const severityColors: Record<string, string> = {
        info: "border-[var(--brand)] bg-[var(--brand-subtle)]",
        notable: "border-[var(--warning)] bg-[var(--warning-subtle)]",
        critical: "border-[var(--danger)] bg-[var(--danger-subtle)]",
      };
      return (
        <div className="mt-1 space-y-1.5">
          {(summary.highlights || []).map((h, i: number) => (
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
      const corrData = richContent.data as CorrelationHeatmapData;
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
      const histData = richContent.data as DistributionHistogramData;
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
      const anomalyData = richContent.data as AnomalyTableData;
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
                {anomalyData.outlierRows.slice(0, 30).map((o, i: number) => (
                  <tr key={i} className="bg-[var(--danger-subtle)]/40">
                    <td className="px-2 py-1 border-b border-[var(--border)] font-semibold text-[var(--danger)]">
                      #{o.rowIndex}
                    </td>
                    {anomalyData.headers.slice(0, 6).map((h: string) => (
                      <td
                        key={h}
                        className={`px-2 py-1 border-b border-[var(--border)] ${
                          o.outlierColumns.some((oc) => oc.column === h)
                            ? "bg-[var(--danger-subtle)] font-semibold text-[var(--danger)]"
                            : ""
                        }`}
                      >
                        {String(o.row[h] ?? "")}
                      </td>
                    ))}
                    <td className="px-2 py-1 border-b border-[var(--border)] text-[10px] text-[var(--danger)]">
                      {o.outlierColumns.map((oc, ocIdx: number) => {
                        // Human-readable column name: strip prefix, replace _ with space, title case
                        const label = oc.column
                          .replace(/^[a-z]+_/, "") // strip common prefixes like metrics_, comp_
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c: string) => c.toUpperCase());
                        const dir = oc.direction === "high" ? "above" : "below";
                        const severity =
                          Math.abs(oc.zScore) >= 3 ? "extremely" : "unusually";
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
                                  : String(oc.value)}
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
          <div className="flex items-center gap-2 mt-2">
            {anomalyData.totalOutliers > 30 && (
              <span className="text-[10px] text-[var(--text-muted)]">
                Showing 30 of {anomalyData.totalOutliers} outlier rows
              </span>
            )}
            {onShowInPanel && anomalyData.outlierRows && (
              <button
                onClick={() =>
                  onShowInPanel(
                    anomalyData.outlierRows,
                    anomalyData.headers,
                    "Anomaly Results",
                  )
                }
                className="ml-auto text-[11px] text-[var(--brand)] hover:underline"
              >
                Show in Panel &rarr;
              </button>
            )}
          </div>
        </div>
      );
    }
    case "trend_analysis": {
      const trendData = richContent.data as TrendAnalysisData;
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
      const dupData = richContent.data as DuplicateRowsData;
      return (
        <div className="mt-1 text-xs space-y-2">
          {dupData.groups.slice(0, 10).map((group, gi: number) => (
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
                {group.duplicates.slice(0, 3).map((d, di: number) => (
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
      const missingData = richContent.data as MissingHeatmapData;
      const missingCols = missingData.columns.filter((c) => c.nullPercent > 0);
      return (
        <div className="mt-1 text-xs">
          <div className="space-y-1">
            {missingCols.map((c, i: number) => (
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
      const clusterData = richContent.data as ClusteringResultData;
      return (
        <div className="mt-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {clusterData.clusters.map((c, i: number) => (
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
      const dtData = richContent.data as DecisionTreeResultData;
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
      const fcData = richContent.data as ForecastResultData;
      const forecastRows = [
        ...(fcData.historical || []).map((h: Record<string, unknown>) => ({
          ...h,
          type: "historical",
        })),
        ...(fcData.predicted || []).map((p: Record<string, unknown>) => ({
          ...p,
          type: "forecast",
        })),
      ];
      const forecastCols =
        forecastRows.length > 0 ? Object.keys(forecastRows[0]) : [];
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
          {onShowInPanel && forecastRows.length > 0 && (
            <button
              onClick={() =>
                onShowInPanel(forecastRows, forecastCols, "Forecast Results")
              }
              className="mt-1 text-[11px] text-[var(--brand)] hover:underline"
            >
              Show in Panel &rarr;
            </button>
          )}
        </div>
      );
    }
    case "pca_result": {
      const pcaData = richContent.data as PcaResultData;
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
      const reportData = richContent.data as InsightReportData;
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
