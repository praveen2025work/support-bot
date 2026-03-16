'use client';

import { useState } from 'react';
import type { Message } from '@/hooks/useChat';
import { QueryFilterForm, type QueryFilterFormData } from './QueryFilterForm';
import { DataChart } from './DataChart';
import { TablePagination, exportToCsv } from './TablePagination';

interface QueryListItem {
  name: string;
  description?: string;
  type: 'api' | 'url' | 'document' | 'csv';
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

export function MessageBubble({
  message,
  onAction,
  onExecuteQuery,
  onRetry,
}: {
  message: Message;
  onAction?: (text: string) => void;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onRetry?: (text: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`${isUser ? 'max-w-[80%]' : 'max-w-[95%]'} rounded-2xl px-4 py-3 ${
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
            <RichContentRenderer richContent={message.richContent} onExecuteQuery={onExecuteQuery} onAction={onAction} />
          </div>
        )}
        {/* Execution time badge + reference link */}
        {!isUser && (message.executionMs != null || message.referenceUrl) && (
          <div className="mt-2 flex items-center gap-2">
            {message.executionMs != null && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                Completed in {message.executionMs}ms
              </span>
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
}: {
  richContent: NonNullable<Message['richContent']>;
  onExecuteQuery?: (queryName: string, filters: Record<string, string>) => void;
  onAction?: (text: string) => void;
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
      return <QueryResultTable result={result} />;
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
              <QueryResultTable result={item.result} />
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
              <div className="mt-1 overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-200 rounded">
                  <thead>
                    <tr className="bg-gray-50">
                      {csvData.headers.map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium text-gray-600 border-b">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.rows.slice(0, 20).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {csvData.headers.map((h) => (
                          <td key={h} className="px-2 py-1 border-b border-gray-100">{String(row[h] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvData.rows.length > 20 && (
                  <p className="text-gray-400 mt-1">Showing 20 of {csvData.rows.length} rows</p>
                )}
              </div>
              <DataChart data={csvData.rows as Record<string, unknown>[]} headers={csvData.headers} />
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border border-blue-200 rounded">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200 w-8">#</th>
                    {aggData.aggregation.topHeaders!.map((h) => (
                      <th
                        key={h}
                        className={`px-2 py-1 text-left font-medium border-b border-blue-200 ${h === aggData.aggregation.column ? 'text-blue-800 bg-blue-100' : 'text-blue-700'}`}
                      >
                        {h}{h === aggData.aggregation.column ? ' \u2193' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aggData.aggregation.topRows!.map((row, i) => (
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
                  ))}
                </tbody>
              </table>
              <p className="text-gray-400 mt-1">Sorted by {aggData.aggregation.column} (descending) from {aggData.rowCount} total rows</p>
            </div>
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
        groups: { groupValue: string | number; count: number; aggregations: Record<string, number> }[];
        aggregatedColumns: { column: string; operation: string }[];
      };
      const aggCols = gbData.aggregatedColumns.map((c) => c.column);
      // Build flat records for the chart
      const chartRows = gbData.groups.map((g) => ({
        [gbData.groupColumn]: g.groupValue,
        ...g.aggregations,
      }));
      const chartHeaders = [gbData.groupColumn, ...aggCols];
      return (
        <div className="mt-1 text-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-blue-200 rounded">
              <thead>
                <tr className="bg-blue-50">
                  <th className="px-2 py-1 text-left font-medium text-blue-800 bg-blue-100 border-b border-blue-200">{gbData.groupColumn}</th>
                  {aggCols.map((c) => (
                    <th key={c} className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200">{c} (sum)</th>
                  ))}
                  <th className="px-2 py-1 text-left font-medium text-blue-700 border-b border-blue-200">count</th>
                </tr>
              </thead>
              <tbody>
                {gbData.groups.map((g, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                    <td className="px-2 py-1 border-b border-gray-100 font-semibold text-blue-800">{String(g.groupValue)}</td>
                    {aggCols.map((c) => (
                      <td key={c} className="px-2 py-1 border-b border-gray-100">{g.aggregations[c]?.toLocaleString() ?? 0}</td>
                    ))}
                    <td className="px-2 py-1 border-b border-gray-100">{g.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {chartRows.length > 1 && (
            <div className="mt-2">
              <DataChart data={chartRows} headers={chartHeaders} />
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
    case 'error':
      return null;
    default:
      return null;
  }
}

function QueryResultTable({ result }: { result: QueryResultData }) {
  const [pageRange, setPageRange] = useState({ start: 0, end: 10 });
  const pagedData = result.data.slice(pageRange.start, pageRange.end);

  return (
    <div className="mt-1 text-xs">
      <p className="text-gray-500">
        {result.rowCount} rows in {result.executionTime}ms
      </p>
      {result.data.length > 0 && (
        <>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead>
                <tr className="bg-gray-50">
                  {Object.keys(result.data[0]).map((key) => (
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
                {pagedData.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-2 py-1">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.data.length > 10 && (
            <TablePagination
              totalRows={result.data.length}
              onPageChange={(start, end) => setPageRange({ start, end })}
              onExport={() => exportToCsv(result.data as Record<string, unknown>[], 'query-results.csv')}
            />
          )}
          <DataChart data={result.data} />
        </>
      )}
    </div>
  );
}
