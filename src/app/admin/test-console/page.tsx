"use client";

import { useState, useRef, useEffect } from "react";
import { csrfHeaders } from "@/lib/csrf";

interface PipelineStep {
  name: string;
  duration?: number;
  result?: unknown;
  status: "success" | "error" | "skipped";
}

interface TestResult {
  input: string;
  timestamp: string;
  response: {
    text: string;
    intent: string;
    confidence: number;
    executionMs?: number;
    referenceUrl?: string;
    richContent?: { type: string; data: unknown };
    suggestions?: string[];
  };
  pipeline: PipelineStep[];
}

interface QueryInfo {
  name: string;
  description: string;
  filters: unknown[];
  type: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  api: { bg: "bg-blue-100", text: "text-blue-700" },
  csv: { bg: "bg-green-100", text: "text-green-700" },
  xlsx: { bg: "bg-purple-100", text: "text-purple-700" },
  document: { bg: "bg-orange-100", text: "text-orange-700" },
  url: { bg: "bg-gray-100", text: "text-gray-700" },
};

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] || TYPE_COLORS.api;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${color.bg} ${color.text}`}
    >
      {type}
    </span>
  );
}

export default function TestConsolePage() {
  const [groupId, setGroupId] = useState("default");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [queries, setQueries] = useState<QueryInfo[]>([]);
  const [queryTypeFilter, setQueryTypeFilter] = useState("all");
  const [querySearch, setQuerySearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Load groups once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetch("/api/admin/groups")
      .then((r) => r.json())
      .then((d) => {
        const g = d.groups || [];
        setGroups(g);
        if (g.length > 0) setGroupId(g[0].id);
      })
      .catch(() => {});
  }, []);

  // Load queries when groupId changes
  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/queries?groupId=${encodeURIComponent(groupId)}`)
      .then((r) => r.json())
      .then((d) => setQueries(d.queries || []))
      .catch(() => setQueries([]));
  }, [groupId]);

  const queryTypes = Array.from(new Set(queries.map((q) => q.type))).sort();
  const filteredQueries = queries.filter((q) => {
    if (queryTypeFilter !== "all" && q.type !== queryTypeFilter) return false;
    if (
      querySearch &&
      !q.name.toLowerCase().includes(querySearch.toLowerCase()) &&
      !q.description.toLowerCase().includes(querySearch.toLowerCase())
    )
      return false;
    return true;
  });

  const runTest = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setLoading(true);
    const startTime = performance.now();
    const pipeline: PipelineStep[] = [];

    try {
      const nlpStart = performance.now();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          text: msg,
          sessionId: `test-console-${Date.now()}`,
          groupId,
        }),
      });
      const data = await res.json();
      const totalMs = Math.round(performance.now() - startTime);

      pipeline.push({
        name: "NLP Classification",
        duration: Math.round(performance.now() - nlpStart),
        result: { intent: data.intent, confidence: data.confidence },
        status: "success",
      });

      if (data.richContent) {
        pipeline.push({
          name: "Data Fetch",
          duration: data.executionMs || 0,
          result: {
            type: data.richContent?.type,
            rows: Array.isArray(data.richContent?.data)
              ? data.richContent.data.length
              : 1,
          },
          status: "success",
        });
      }

      pipeline.push({
        name: "Response Generation",
        duration: Math.max(0, totalMs - (data.executionMs || 0)),
        result: {
          textLength: data.text?.length || 0,
          hasSuggestions: !!data.suggestions?.length,
        },
        status: "success",
      });

      setResults((prev) => [
        {
          input: msg,
          timestamp: new Date().toISOString(),
          response: data,
          pipeline,
        },
        ...prev,
      ]);
    } catch (err) {
      pipeline.push({
        name: "Request Failed",
        duration: Math.round(performance.now() - startTime),
        result: { error: String(err) },
        status: "error",
      });
      setResults((prev) => [
        {
          input: msg,
          timestamp: new Date().toISOString(),
          response: { text: `Error: ${err}`, intent: "error", confidence: 0 },
          pipeline,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
      setInput("");
      inputRef.current?.focus();
    }
  };

  return (
    <div>
      <div className="pb-6 mb-6 border-b border-gray-100">
        <h1 className="text-2xl font-semibold text-gray-900">Test Console</h1>
        <p className="text-sm text-gray-500">
          Interactive query testing with pipeline inspection
        </p>
      </div>

      {/* Input bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runTest()}
            placeholder="Type a message to test... e.g. 'run error_rate for production'"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={() => runTest()}
            disabled={loading || !input.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Running..." : "Test"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            "run error_rate",
            "show active users for US",
            "list queries",
            "help",
            "run monthly_revenue for this month",
          ].map((example) => (
            <button
              key={example}
              onClick={() => {
                setInput(example);
                inputRef.current?.focus();
              }}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Query Catalog */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Available Queries ({filteredQueries.length})
          </div>
          <div className="flex items-center gap-2">
            <input
              value={querySearch}
              onChange={(e) => setQuerySearch(e.target.value)}
              placeholder="Search queries..."
              className="text-xs border border-gray-300 rounded px-2 py-1 w-40"
            />
            <select
              value={queryTypeFilter}
              onChange={(e) => setQueryTypeFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All types</option>
              {queryTypes.map((t) => (
                <option key={t} value={t}>
                  {t} ({queries.filter((q) => q.type === t).length})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto scrollbar-hide">
          {filteredQueries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No queries match your filter.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredQueries.map((q) => (
                <button
                  key={q.name}
                  onClick={() => runTest(`run ${q.name}`)}
                  disabled={loading}
                  className="text-left p-2 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-800 group-hover:text-blue-700 truncate">
                      {q.name}
                    </span>
                    <TypeBadge type={q.type} />
                  </div>
                  <div className="text-[10px] text-gray-500 truncate mt-0.5">
                    {q.description}
                  </div>
                  {q.filters.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {q.filters.slice(0, 3).map((f, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded"
                        >
                          {typeof f === "string"
                            ? f
                            : (f as { key: string }).key}
                        </span>
                      ))}
                      {q.filters.length > 3 && (
                        <span className="text-[9px] text-gray-400">
                          +{q.filters.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            Enter a message above or click a query card to test the bot
            pipeline. Results will appear here with detailed step-by-step
            inspection.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    &quot;{r.input}&quot;
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.response.confidence >= 0.8
                        ? "bg-green-100 text-green-700"
                        : r.response.confidence >= 0.5
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {(r.response.confidence * 100).toFixed(0)}% confidence
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {r.response.intent}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-200">
                {/* Response panel */}
                <div className="p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Response
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {r.response.text}
                  </p>
                  {r.response.suggestions &&
                    r.response.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.response.suggestions.map((s, si) => (
                          <span
                            key={si}
                            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  {r.response.referenceUrl && (
                    <div className="mt-2">
                      <a
                        href={r.response.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Reference: {r.response.referenceUrl}
                      </a>
                    </div>
                  )}
                  {r.response.richContent && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Rich Content ({r.response.richContent.type})
                      </div>
                      <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-40 text-gray-600">
                        {JSON.stringify(r.response.richContent.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Pipeline panel */}
                <div className="p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Pipeline Steps
                  </div>
                  <div className="space-y-2">
                    {r.pipeline.map((step, si) => (
                      <div
                        key={si}
                        className={`rounded-lg border p-3 ${
                          step.status === "error"
                            ? "border-red-200 bg-red-50"
                            : step.status === "skipped"
                              ? "border-gray-200 bg-gray-50"
                              : "border-green-200 bg-green-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">
                            {step.name}
                          </span>
                          {step.duration != null && (
                            <span className="text-xs text-gray-500">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                        {step.result != null && (
                          <pre className="mt-1 text-[10px] text-gray-500 font-mono">
                            {JSON.stringify(step.result) as string}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                  {r.response.executionMs != null && (
                    <div className="mt-2 text-xs text-gray-500">
                      Total execution: {r.response.executionMs}ms
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setResults([])}
            className="text-xs text-gray-500 hover:text-red-500 hover:underline"
          >
            Clear all results
          </button>
        </div>
      )}
    </div>
  );
}
