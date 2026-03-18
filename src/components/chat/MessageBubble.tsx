'use client';

import { useState, Suspense, lazy } from 'react';
import type { Message } from '@/hooks/useChat';
import { QueryFilterForm, type QueryFilterFormData } from './QueryFilterForm';
import { TablePagination, exportToCsv } from './TablePagination';
import type { DetectedColumnMeta } from './DataChart';

// Lazy-load DataChart (pulls in Recharts ~150KB) — only loaded when chart is rendered
const DataChart = lazy(() =>
  import('./DataChart').then((m) => ({ default: m.DataChart }))
);
// Lazy-load ML chart components
const HeatmapChart = lazy(() => import('./HeatmapChart'));
const HistogramChart = lazy(() => import('./HistogramChart'));
const ScatterPlot = lazy(() => import('./ScatterPlot'));
const ForecastChart = lazy(() => import('./ForecastChart'));
const TrendChart = lazy(() => import('./TrendChart'));
const DecisionTreeViz = lazy(() => import('./DecisionTreeViz'));
import { AnomalyAlert } from '@/components/dashboard/AnomalyBadge';
import { FeedbackBar } from './FeedbackBar';
import { SourceBadge } from './SourceBadge';
import { ConfidenceBadge } from './ConfidenceBadge';

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
  const [pageRange, setPageRange] = useState({ start: 0, end: defaultPageSize });
  const pagedRows = rows.slice(pageRange.start, pageRange.end);
  const showPagination = rows.length > defaultPageSize;

  return (
    <>
      <div className="overflow-x-auto">
        <table className={tableClassName || 'min-w-full text-xs border border-gray-200 rounded'}>
          <thead>
            <tr className={headerClassName || 'bg-gray-50'}>
              {renderHeader
                ? headers.map((h) => <th key={h}>{renderHeader(h)}</th>)
                : headers.map((h) => (
                    <th key={h} className="px-2 py-1 text-left font-medium text-gray-600 border-b">{h}</th>
                  ))
              }
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
  type: 'api' | 'url' | 'document' | 'csv' | 'xlsx' | 'xls';
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

function renderMarkdownText(
  text: string,
  onAction?: (text: string) => void
) {
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
          className="inline-flex items-center mx-0.5 rounded-md border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer align-baseline"
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
}: {
  message: Message;
  onAction?: (text: string) => void;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onRetry?: (text: string) => void;
  onFeedback?: (messageId: string, type: 'positive' | 'negative', correction?: string) => void;
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
}) {
  const isUser = message.role === 'user';

  const hasRichContent = !isUser && message.richContent;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`${isUser ? 'max-w-[80%]' : hasRichContent ? 'max-w-[98%] w-full' : 'max-w-[85%]'} rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : message.isError
            ? 'bg-red-50 text-gray-900 border border-red-200'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">
          {renderMarkdownText(message.text, isUser ? undefined : onAction)}
        </p>
        {message.richContent && (
          <div className="mt-2">
            <RichContentRenderer richContent={message.richContent} onExecuteQuery={onExecuteQuery} onAction={onAction} cardId={cardId} linkedSelection={linkedSelection} onCellClick={onCellClick} />
          </div>
        )}
        {/* Anomaly alerts */}
        {!isUser && message.anomalies && message.anomalies.length > 0 && (
          <div className="mt-2">
            <AnomalyAlert anomalies={message.anomalies} />
          </div>
        )}
        {/* Execution time badge + source + confidence + reference link */}
        {!isUser && (message.executionMs != null || message.referenceUrl || message.sourceName || message.confidence != null) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {message.executionMs != null && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                Completed in {message.executionMs}ms
              </span>
            )}
            {message.sourceName && (
              <SourceBadge sourceName={message.sourceName} sourceType={message.sourceType} />
            )}
            {message.confidence != null && message.confidence < 1 && (
              <ConfidenceBadge confidence={message.confidence} />
            )}
            {message.referenceUrl && (
              <a
                href={message.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                More info
              </a>
            )}
          </div>
        )}
        {/* Feedback bar (thumbs up/down) */}
        {!isUser && !message.isError && onFeedback && (
          <FeedbackBar messageId={message.id} onFeedback={onFeedback} />
        )}
        {/* Retry button for errors */}
        {message.isError && message.retryText && onRetry && (
          <button
            onClick={() => onRetry(message.retryText!)}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
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
}: {
  richContent: NonNullable<Message['richContent']>;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onAction?: (text: string) => void;
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
}) {
  switch (richContent.type) {
    case 'url_list': {
      const urls = richContent.data as UrlItem[];
      return (
        <ul className="mt-1 space-y-1">
          {urls.map((url, i) => (
            <li key={i}>
              <a
                href={url.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline text-sm hover:text-blue-900"
              >
                {url.title}
              </a>
            </li>
          ))}
        </ul>
      );
    }
    case 'query_result': {
      const result = richContent.data as QueryResultData;
      return <QueryResultTable result={result} cardId={cardId} linkedSelection={linkedSelection} onCellClick={onCellClick} />;
    }
    case 'multi_query_result': {
      const results = richContent.data as MultiQueryResultItem[];
      return (
        <div className="mt-1 space-y-4">
          {results.map((item, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                {item.queryName}
              </h4>
              <QueryResultTable result={item.result} cardId={cardId} linkedSelection={linkedSelection} onCellClick={onCellClick} />
            </div>
          ))}
        </div>
      );
    }
    case 'estimation': {
      const est = richContent.data as EstimationData;
      return (
        <div className="mt-1 text-xs text-gray-600">
          <p>Duration: {est.estimatedDuration}ms</p>
          <p>{est.description}</p>
        </div>
      );
    }
    case 'query_filter_form': {
      const formData = richContent.data as QueryFilterFormData;
      return (
        <QueryFilterForm
          data={formData}
          onSubmit={(queryName, filters) => onExecuteQuery?.(queryName, filters)}
        />
      );
    }
    case 'file_content': {
      const fileData = richContent.data as { content: string; filePath: string; format: string };
      return (
        <div className="mt-1">
          <p className="text-[10px] text-gray-400 mb-1 font-mono">{fileData.filePath}</p>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
            {fileData.content}
          </pre>
        </div>
      );
    }
    case 'document_search': {
      const docData = richContent.data as {
        filePath: string;
        searchResults: Array<{ heading: string | null; content: string; score: number }>;
        searchKeywords?: string[];
      };
      return (
        <div className="mt-1">
          <p className="text-[10px] text-gray-400 mb-1 font-mono">{docData.filePath}</p>
          {docData.searchResults.map((section, i) => (
            <div key={i} className="mb-2">
              {section.heading && (
                <p className="text-xs font-semibold text-gray-700">{section.heading}</p>
              )}
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                {section.content}
              </pre>
            </div>
          ))}
        </div>
      );
    }
    case 'csv_table': {
      const csvData = richContent.data as {
        headers: string[];
        rows: Record<string, string | number>[];
        filePath: string;
        rowCount: number;
      };
      return (
        <div className="mt-1 text-xs">
          <p className="text-[10px] text-gray-400 mb-1 font-mono">{csvData.filePath}</p>
          <p className="text-gray-500">{csvData.rowCount} rows</p>
          {csvData.headers.length > 0 && (
            <>
              <div className="mt-1">
                <PaginatedTableBody
                  rows={csvData.rows}
                  headers={csvData.headers}
                  renderRow={(row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {csvData.headers.map((h) => (
                        <td key={h} className="px-2 py-1 border-b border-gray-100">{String(row[h] ?? '')}</td>
                      ))}
                    </tr>
                  )}
                />
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-[var(--text-muted)]">Loading chart…</div>}>
                <DataChart data={csvData.rows as Record<string, unknown>[]} headers={csvData.headers} chartConfig={(csvData as Record<string, unknown>).chartConfig as Record<string, unknown> | undefined} columnConfig={(csvData as Record<string, unknown>).columnConfig as Record<string, unknown> | undefined} columnMetadata={(csvData as Record<string, unknown>).columnMetadata as DetectedColumnMeta[] | undefined} />
              </Suspense>
            </>
          )}
        </div>
      );
    }
    case 'csv_aggregation': {
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
      const isTop = aggData.aggregation.topRows && aggData.aggregation.topHeaders;
      return (
        <div className="mt-1 text-xs">
          <p className="text-[10px] text-gray-400 mb-1 font-mono">{aggData.filePath}</p>
          {isTop ? (
            <PaginatedTableBody
              rows={aggData.aggregation.topRows!}
              headers={['#', ...aggData.aggregation.topHeaders!]}
              tableClassName="min-w-full text-xs border border-blue-200 rounded"
              headerClassName="bg-blue-50"
              renderHeader={(h) =>
                h === '#' ? (
                  <th key={h} className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200 w-8">#</th>
                ) : (
                  <th
                    key={h}
                    className={`px-2 py-1 text-left font-medium border-b border-blue-200 ${h === aggData.aggregation.column ? 'text-blue-800 bg-blue-100' : 'text-blue-700'}`}
                  >
                    {h}{h === aggData.aggregation.column ? ' \u2193' : ''}
                  </th>
                )
              }
              renderRow={(row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                  <td className="px-2 py-1 border-b border-gray-100 text-gray-400 font-medium">{i + 1}</td>
                  {aggData.aggregation.topHeaders!.map((h) => (
                    <td
                      key={h}
                      className={`px-2 py-1 border-b border-gray-100 ${h === aggData.aggregation.column ? 'font-semibold text-blue-800' : ''}`}
                    >
                      {String(row[h] ?? '')}
                    </td>
                  ))}
                </tr>
              )}
              footer={<p className="text-gray-400 mt-1">Sorted by {aggData.aggregation.column} (descending) from {aggData.rowCount} total rows</p>}
            />
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="font-semibold text-blue-800 text-sm">
                {aggData.aggregation.operation.toUpperCase()}({aggData.aggregation.column}) = {String(aggData.aggregation.result)}
              </p>
              <p className="text-gray-500 mt-1">Computed over {aggData.rowCount} rows</p>
            </div>
          )}
        </div>
      );
    }
    case 'csv_group_by': {
      const gbData = richContent.data as {
        groupColumn: string;
        groupColumns?: string[];
        groups: { groupValue: string | number; groupValues?: Record<string, string | number>; count: number; aggregations: Record<string, number> }[];
        aggregatedColumns: { column: string; operation: string }[];
      };
      const aggCols = gbData.aggregatedColumns.map((c) => c.column);
      const isMultiCol = gbData.groupColumns && gbData.groupColumns.length > 1;
      const groupCols = isMultiCol ? gbData.groupColumns! : [gbData.groupColumn];
      // Build flat records for the chart
      const chartRows = gbData.groups.map((g) => {
        const base: Record<string, string | number> = {};
        if (isMultiCol && g.groupValues) {
          for (const col of groupCols) base[col] = g.groupValues[col] ?? '';
        } else {
          base[gbData.groupColumn] = g.groupValue;
        }
        return { ...base, ...g.aggregations };
      });
      const chartHeaders = [...groupCols, ...aggCols];
      const gbHeaders = [...groupCols, ...aggCols.map((c) => `${c} (sum)`), 'count'];
      return (
        <div className="mt-1 text-xs">
          <PaginatedTableBody
            rows={gbData.groups}
            headers={gbHeaders}
            tableClassName="min-w-full text-xs border border-blue-200 rounded"
            headerClassName="bg-blue-50"
            renderHeader={(h) => {
              const isGroupCol = groupCols.includes(h);
              return (
                <th key={h} className={`px-2 py-1 text-left font-medium border-b border-blue-200 ${isGroupCol ? 'text-blue-800 bg-blue-100' : 'text-blue-700'}`}>{h}</th>
              );
            }}
            renderRow={(g, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                {isMultiCol && g.groupValues
                  ? groupCols.map((col) => (
                      <td key={col} className="px-2 py-1 border-b border-gray-100 font-semibold text-blue-800">{String(g.groupValues![col] ?? '')}</td>
                    ))
                  : <td className="px-2 py-1 border-b border-gray-100 font-semibold text-blue-800">{String(g.groupValue)}</td>
                }
                {aggCols.map((c) => (
                  <td key={c} className="px-2 py-1 border-b border-gray-100">{g.aggregations[c]?.toLocaleString() ?? 0}</td>
                ))}
                <td className="px-2 py-1 border-b border-gray-100">{g.count}</td>
              </tr>
            )}
          />
          {chartRows.length > 1 && (
            <div className="mt-2">
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-[var(--text-muted)]">Loading chart…</div>}>
                <DataChart data={chartRows} headers={chartHeaders} />
              </Suspense>
            </div>
          )}
        </div>
      );
    }
    case 'knowledge_search': {
      const ksData = richContent.data as {
        results: Array<{
          queryName: string;
          queryDescription: string;
          filePath: string;
          referenceUrl?: string;
          sections: Array<{ heading: string | null; content: string; score: number }>;
        }>;
        keywords: string[];
      };
      return (
        <div className="mt-1 text-xs space-y-3">
          {ksData.results.map((doc) => (
            <div key={doc.queryName} className="border border-purple-200 rounded-lg overflow-hidden">
              <div className="bg-purple-50 px-3 py-1.5 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{doc.queryName}</span>
                <span className="text-gray-500 text-[10px] truncate flex-1">{doc.queryDescription}</span>
                {doc.referenceUrl && (
                  <a href={doc.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-700 text-[10px] shrink-0">
                    Docs ↗
                  </a>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {doc.sections.map((sec, i) => (
                  <div key={i} className="px-3 py-1.5">
                    {sec.heading && (
                      <p className="font-semibold text-gray-700 text-[11px] mb-0.5">{sec.heading.replace(/^#+\s*/, '')}</p>
                    )}
                    <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-sans max-h-[120px] overflow-y-auto leading-relaxed">{sec.content.length > 500 ? sec.content.substring(0, 500) + '...' : sec.content}</pre>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'document_summary': {
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
              <div key={stat.label} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px]">
                <span className="font-medium">{stat.value}</span>
                <span className="text-purple-400">{stat.label}</span>
              </div>
            ))}
          </div>
          {docSummary.sections.length > 0 && (
            <div className="space-y-1">
              {docSummary.sections.map((sec, i) => (
                <div key={i} className="border border-gray-200 rounded p-1.5">
                  <p className="font-semibold text-gray-700 text-[11px]">{sec.heading}</p>
                  {sec.preview && <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-1">{sec.preview}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'csv_summary': {
      const summary = richContent.data as {
        rowCount: number;
        columns: {
          column: string;
          type: 'numeric' | 'categorical';
          sum?: number; avg?: number; min?: number; max?: number;
          uniqueValues?: number;
          topValues?: { value: string; count: number }[];
        }[];
      };
      return (
        <div className="mt-1 text-xs space-y-2">
          <div className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium text-[11px]">
            {summary.rowCount} rows
          </div>
          <div className="grid grid-cols-2 gap-2">
            {summary.columns.map((col) => (
              <div key={col.column} className="border border-gray-200 rounded p-2">
                <p className="font-semibold text-gray-700 text-[11px] mb-1">{col.column}</p>
                {col.type === 'numeric' ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                    <span className="text-gray-400">Sum</span><span className="text-right font-medium">{col.sum?.toLocaleString()}</span>
                    <span className="text-gray-400">Avg</span><span className="text-right font-medium">{col.avg?.toLocaleString()}</span>
                    <span className="text-gray-400">Min</span><span className="text-right font-medium">{col.min?.toLocaleString()}</span>
                    <span className="text-gray-400">Max</span><span className="text-right font-medium">{col.max?.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="text-[10px]">
                    <p className="text-gray-400">{col.uniqueValues} unique values</p>
                    {col.topValues && col.topValues.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {col.topValues.slice(0, 3).map((tv) => (
                          <div key={tv.value} className="flex justify-between">
                            <span className="text-gray-600 truncate">{tv.value}</span>
                            <span className="text-gray-400 ml-1">({tv.count})</span>
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
    case 'query_list': {
      const items = richContent.data as QueryListItem[];
      const typeColors: Record<string, string> = {
        api: 'bg-blue-100 text-blue-700',
        url: 'bg-green-100 text-green-700',
        document: 'bg-purple-100 text-purple-700',
        csv: 'bg-amber-100 text-amber-700',
        xlsx: 'bg-emerald-100 text-emerald-700',
        xls: 'bg-emerald-100 text-emerald-700',
      };
      return (
        <div className="mt-1 space-y-1.5">
          {items.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                if (item.type === 'url' && item.url) {
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                } else {
                  onAction?.(`run ${item.name}`);
                }
              }}
              className="w-full flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-800 truncate">{item.name}</span>
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[item.type] || 'bg-gray-100 text-gray-700'}`}>
                    {item.type}
                  </span>
                </div>
                {item.description && (
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                )}
              </div>
              {item.filters.length > 0 && (
                <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                  {item.filters.length} filter{item.filters.length > 1 ? 's' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      );
    }
    case 'document_answer': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = richContent.data as any;
      if (data.mode === 'answer' && data.answers) {
        return (
          <div className="mt-2 space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.answers.map((a: any, i: number) => (
              <div key={i} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-gray-900 leading-relaxed">
                  <span className="bg-yellow-200 font-medium px-0.5 rounded">{a.answer}</span>
                </p>
                {a.context && a.context !== a.answer && (
                  <p className="mt-1.5 text-xs text-gray-600 leading-relaxed italic">{a.context}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                  {a.sourceHeading && (
                    <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200">
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
      if (data.mode === 'sections' && data.sections) {
        return (
          <div className="mt-2 space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.sections.map((s: any, i: number) => (
              <div key={i} className="rounded border border-gray-200 bg-gray-50 p-2.5">
                {s.heading && (
                  <p className="text-xs font-semibold text-gray-700 mb-1">{s.heading}</p>
                )}
                <p className="text-xs text-gray-600 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>
        );
      }
      return null;
    }
    case 'document_upload_result': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = richContent.data as any;
      if (data.mode === 'list' && data.documents) {
        return (
          <div className="mt-2 space-y-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.documents.map((doc: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">
                    {doc.format === 'pdf' ? '\u{1F4C4}' : doc.format === 'docx' ? '\u{1F4DD}' : '\u{1F4C3}'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{doc.filename}</p>
                    <p className="text-[10px] text-gray-500">
                      {doc.wordCount.toLocaleString()} words &middot; {doc.chunkCount} chunks
                      {doc.pageCount ? ` \u00b7 ${doc.pageCount} pages` : ''}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700">
                  {doc.format}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-gray-500 mt-1">
              Total: {data.totalChunks} searchable chunks
            </p>
          </div>
        );
      }
      // Single upload result
      if (data.document) {
        return (
          <div className="mt-2 rounded border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-medium text-green-800">{data.message}</p>
          </div>
        );
      }
      return null;
    }
    case 'recommendations': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recs = richContent.data as any[];
      return (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {recs.map((rec: any, i: number) => (
            <button
              key={i}
              onClick={() => onAction?.(rec.name)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <span className="text-[10px]">
                {rec.type === 'query' ? '\u{1F50D}' : rec.type === 'document' ? '\u{1F4C4}' : '\u2753'}
              </span>
              <span className="font-medium">{rec.name}</span>
              <span className="text-[10px] text-gray-400">{rec.reason}</span>
            </button>
          ))}
        </div>
      );
    }
    // ── ML Analysis richContent types ──────────────────────────────
    case 'column_profile': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profiles = richContent.data as any[];
      return (
        <div className="mt-1 text-xs">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-xs border border-blue-200 rounded">
              <thead>
                <tr className="bg-blue-50">
                  <th className="px-2 py-1 text-left font-medium text-blue-800 border-b border-blue-200">Column</th>
                  <th className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200">Type</th>
                  <th className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200">Null %</th>
                  <th className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200">Unique</th>
                  <th className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200">Stats</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {profiles.map((p: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                    <td className="px-2 py-1 border-b border-gray-100 font-semibold text-blue-800">{p.column}</td>
                    <td className="px-2 py-1 border-b border-gray-100">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">{p.type}</span>
                    </td>
                    <td className="px-2 py-1 border-b border-gray-100">{p.nullPercent.toFixed(1)}%</td>
                    <td className="px-2 py-1 border-b border-gray-100">{p.cardinality}</td>
                    <td className="px-2 py-1 border-b border-gray-100 text-[10px] text-gray-500">
                      {p.stats ? `mean=${p.stats.mean?.toFixed(1)}, std=${p.stats.stdDev?.toFixed(1)}` : p.topValues?.slice(0, 3).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    case 'smart_summary': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summary = richContent.data as any;
      const severityColors: Record<string, string> = { info: 'border-blue-300 bg-blue-50', notable: 'border-amber-300 bg-amber-50', critical: 'border-red-300 bg-red-50' };
      return (
        <div className="mt-1 space-y-1.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(summary.highlights || []).map((h: any, i: number) => (
            <div key={i} className={`text-xs rounded-md border-l-4 px-3 py-2 ${severityColors[h.severity] || 'border-gray-300 bg-gray-50'}`}>
              <span className="font-medium text-gray-700">{h.column}:</span>{' '}
              <span className="text-gray-600">{h.insight}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'correlation_heatmap': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const corrData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense fallback={<div className="text-xs text-gray-400">Loading heatmap...</div>}>
            <HeatmapChart matrix={corrData.matrix} rowLabels={corrData.columns} colLabels={corrData.columns} colorScale="diverging" title="Correlation Matrix" />
          </Suspense>
        </div>
      );
    }
    case 'distribution_histogram': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const histData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense fallback={<div className="text-xs text-gray-400">Loading histogram...</div>}>
            <HistogramChart bins={histData.bins} stats={histData.stats} column={histData.column} />
          </Suspense>
        </div>
      );
    }
    case 'anomaly_table': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anomalyData = richContent.data as any;
      return (
        <div className="mt-1 text-xs">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-xs border border-red-200 rounded">
              <thead>
                <tr className="bg-red-50">
                  <th className="px-2 py-1 text-left font-medium text-red-800 border-b border-red-200">Row</th>
                  {anomalyData.headers.slice(0, 6).map((h: string) => (
                    <th key={h} className="px-2 py-1 text-left font-medium text-red-700 border-b border-red-200">{h}</th>
                  ))}
                  <th className="px-2 py-1 text-left font-medium text-red-700 border-b border-red-200">Outlier Details</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {anomalyData.outlierRows.slice(0, 30).map((o: any, i: number) => (
                  <tr key={i} className="bg-red-50/40">
                    <td className="px-2 py-1 border-b border-gray-100 font-semibold text-red-800">#{o.rowIndex}</td>
                    {anomalyData.headers.slice(0, 6).map((h: string) => (
                      <td key={h} className={`px-2 py-1 border-b border-gray-100 ${
                        o.outlierColumns.some((oc: {column: string}) => oc.column === h) ? 'bg-red-100 font-semibold text-red-700' : ''
                      }`}>{String(o.row[h] ?? '')}</td>
                    ))}
                    <td className="px-2 py-1 border-b border-gray-100 text-[10px] text-red-600">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {o.outlierColumns.map((oc: any) => `${oc.column}: z=${oc.zScore} (${oc.method})`).join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {anomalyData.totalOutliers > 30 && (
            <p className="text-[10px] text-gray-400 mt-1">Showing 30 of {anomalyData.totalOutliers} outlier rows</p>
          )}
        </div>
      );
    }
    case 'trend_analysis': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trendData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense fallback={<div className="text-xs text-gray-400">Loading trend chart...</div>}>
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
    case 'duplicate_rows': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dupData = richContent.data as any;
      return (
        <div className="mt-1 text-xs space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {dupData.groups.slice(0, 10).map((group: any, gi: number) => (
            <div key={gi} className="border border-amber-200 rounded p-2 bg-amber-50/30">
              <div className="font-medium text-amber-800 mb-1">Group {gi + 1} ({group.duplicates.length + 1} rows, similarity: {(group.similarity * 100).toFixed(0)}%)</div>
              <div className="text-[10px] text-gray-600">
                <div className="font-medium">Original: {JSON.stringify(group.canonical).slice(0, 120)}...</div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {group.duplicates.slice(0, 3).map((d: any, di: number) => (
                  <div key={di} className="text-amber-700 ml-3">Dup: {JSON.stringify(d).slice(0, 120)}...</div>
                ))}
              </div>
            </div>
          ))}
          {dupData.groups.length > 10 && (
            <p className="text-[10px] text-gray-400">Showing 10 of {dupData.groups.length} duplicate groups</p>
          )}
        </div>
      );
    }
    case 'missing_heatmap': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missingData = richContent.data as any;
      const missingCols = missingData.columns.filter((c: {nullPercent: number}) => c.nullPercent > 0);
      return (
        <div className="mt-1 text-xs">
          <div className="space-y-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {missingCols.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-24 truncate font-medium text-gray-700">{c.column}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full bg-red-400 rounded" style={{ width: `${Math.min(c.nullPercent, 100)}%` }} />
                </div>
                <span className="w-12 text-right text-gray-500">{c.nullPercent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {missingCols.length === 0 && <p className="text-gray-400">No missing values found</p>}
        </div>
      );
    }
    case 'clustering_result': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clusterData = richContent.data as any;
      return (
        <div className="mt-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {clusterData.clusters.map((c: any, i: number) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Cluster {i + 1}: {c.size} rows — {c.label}
              </span>
            ))}
          </div>
          <Suspense fallback={<div className="text-xs text-gray-400">Loading scatter plot...</div>}>
            <ScatterPlot points={clusterData.points} xLabel={clusterData.columns?.[0]} yLabel={clusterData.columns?.[1]} title={`K-Means (k=${clusterData.k})`} />
          </Suspense>
        </div>
      );
    }
    case 'decision_tree_result': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dtData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense fallback={<div className="text-xs text-gray-400">Loading decision tree...</div>}>
            <DecisionTreeViz tree={dtData.tree} accuracy={dtData.accuracy} featureImportance={dtData.featureImportance} targetColumn={dtData.targetColumn} />
          </Suspense>
        </div>
      );
    }
    case 'forecast_result': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fcData = richContent.data as any;
      return (
        <div className="mt-1">
          <Suspense fallback={<div className="text-xs text-gray-400">Loading forecast chart...</div>}>
            <ForecastChart historical={fcData.historical} predicted={fcData.predicted} valueLabel={fcData.valueColumn} />
          </Suspense>
        </div>
      );
    }
    case 'pca_result': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pcaData = richContent.data as any;
      return (
        <div className="mt-1">
          <div className="flex gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              PC1: {((pcaData.varianceExplained?.[0] ?? 0) * 100).toFixed(1)}% variance
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              PC2: {((pcaData.varianceExplained?.[1] ?? 0) * 100).toFixed(1)}% variance
            </span>
          </div>
          <Suspense fallback={<div className="text-xs text-gray-400">Loading PCA scatter...</div>}>
            <ScatterPlot points={pcaData.points} xLabel="PC1" yLabel="PC2" title="PCA Projection" />
          </Suspense>
        </div>
      );
    }
    case 'insight_report': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportData = richContent.data as any;
      return (
        <div className="mt-1 text-xs">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {reportData.sections?.map((s: string, i: number) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px]">{s}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob([reportData.html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'analysis-report.html'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Download HTML Report
            </button>
            <button
              onClick={() => {
                const blob = new Blob([reportData.csvSummary], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'analysis-summary.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Download CSV Summary
            </button>
          </div>
        </div>
      );
    }
    case 'error':
      return null;
    default:
      return null;
  }
}

function QueryResultTable({
  result,
  cardId,
  linkedSelection,
  onCellClick,
}: {
  result: QueryResultData & { chartConfig?: Record<string, unknown>; columnConfig?: Record<string, unknown>; columnMetadata?: DetectedColumnMeta[] };
  cardId?: string;
  linkedSelection?: LinkedSelection;
  onCellClick?: (column: string, value: unknown) => void;
}) {
  const [pageRange, setPageRange] = useState({ start: 0, end: 10 });
  const rows = result.data || [];
  const pagedData = rows.slice(pageRange.start, pageRange.end);

  // Determine if this card should highlight rows (linked selection from another card)
  const highlightValue = linkedSelection?.value;
  const isSourceCard = linkedSelection?.sourceCardId === cardId;
  const shouldHighlight = !!highlightValue && !isSourceCard && !!cardId;

  const isRowHighlighted = (row: Record<string, unknown>) => {
    if (!shouldHighlight) return false;
    return Object.values(row).some((v) => String(v) === highlightValue);
  };

  return (
    <div className="mt-1 text-xs">
      <p className="text-gray-500">
        {result.rowCount} rows in {result.executionTime}ms
      </p>
      {rows.length > 0 && (
        <>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead>
                <tr className="bg-gray-50">
                  {Object.keys(rows[0]).map((key) => (
                    <th
                      key={key}
                      className="px-2 py-1 text-left font-medium text-gray-600 border-b"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedData.map((row, i) => {
                  const highlighted = isRowHighlighted(row);
                  return (
                    <tr key={i} className={`border-b border-gray-100 ${highlighted ? 'bg-yellow-50' : ''}`}>
                      {Object.entries(row).map(([key, val], j) => (
                        <td
                          key={j}
                          className={`px-2 py-1 ${onCellClick && cardId ? 'cursor-pointer hover:bg-blue-50' : ''} ${
                            highlighted && String(val) === highlightValue ? 'bg-yellow-100 font-semibold' : ''
                          }`}
                          onClick={onCellClick && cardId ? () => onCellClick(key, val) : undefined}
                        >
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && (
            <TablePagination
              totalRows={rows.length}
              onPageChange={(start, end) => setPageRange({ start, end })}
              onExport={() => exportToCsv(rows as Record<string, unknown>[], 'query-results.csv')}
            />
          )}
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-[var(--text-muted)]">Loading chart…</div>}>
            <DataChart data={rows} chartConfig={result.chartConfig} columnConfig={result.columnConfig} columnMetadata={result.columnMetadata} />
          </Suspense>
        </>
      )}
    </div>
  );
}
