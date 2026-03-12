'use client';

import { useState, useRef } from 'react';

interface PipelineStep {
  name: string;
  duration?: number;
  result?: unknown;
  status: 'success' | 'error' | 'skipped';
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

export default function TestConsolePage() {
  const [groupId, setGroupId] = useState('default');
  const [input, setInput] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load groups on first render
  if (!groupsLoaded) {
    setGroupsLoaded(true);
    fetch('/api/admin/groups')
      .then((r) => r.json())
      .then((d) => setGroups(d.groups || []))
      .catch(() => {});
  }

  const runTest = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const startTime = performance.now();
    const pipeline: PipelineStep[] = [];

    try {
      // Step 1: NLP classification
      const nlpStart = performance.now();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input.trim(),
          sessionId: `test-console-${Date.now()}`,
          groupId,
        }),
      });
      const data = await res.json();
      const totalMs = Math.round(performance.now() - startTime);

      pipeline.push({
        name: 'NLP Classification',
        duration: Math.round(performance.now() - nlpStart),
        result: { intent: data.intent, confidence: data.confidence },
        status: 'success',
      });

      if (data.richContent) {
        pipeline.push({
          name: 'Data Fetch',
          duration: data.executionMs || 0,
          result: { type: data.richContent?.type, rows: Array.isArray(data.richContent?.data) ? data.richContent.data.length : 1 },
          status: 'success',
        });
      }

      pipeline.push({
        name: 'Response Generation',
        duration: Math.max(0, totalMs - (data.executionMs || 0)),
        result: { textLength: data.text?.length || 0, hasSuggestions: !!(data.suggestions?.length) },
        status: 'success',
      });

      setResults((prev) => [
        {
          input: input.trim(),
          timestamp: new Date().toISOString(),
          response: data,
          pipeline,
        },
        ...prev,
      ]);
    } catch (err) {
      pipeline.push({
        name: 'Request Failed',
        duration: Math.round(performance.now() - startTime),
        result: { error: String(err) },
        status: 'error',
      });
      setResults((prev) => [
        {
          input: input.trim(),
          timestamp: new Date().toISOString(),
          response: {
            text: `Error: ${err}`,
            intent: 'error',
            confidence: 0,
          },
          pipeline,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
      setInput('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Test Console</h1>
        <p className="text-sm text-gray-500">Interactive query testing with pipeline inspection</p>
      </div>

      {/* Input bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runTest()}
            placeholder="Type a message to test... e.g. 'run error_rate for production'"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={runTest}
            disabled={loading || !input.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Running...' : 'Test'}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {['run error_rate', 'show active users for US', 'list queries', 'help', 'run monthly_revenue for this month'].map((example) => (
            <button
              key={example}
              onClick={() => { setInput(example); inputRef.current?.focus(); }}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Enter a message above to test the bot pipeline. Results will appear here with detailed step-by-step inspection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">&quot;{r.input}&quot;</span>
                  <span className="text-xs text-gray-400">{new Date(r.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.response.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                    r.response.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
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
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Response</div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.response.text}</p>
                  {r.response.suggestions && r.response.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.response.suggestions.map((s, si) => (
                        <span key={si} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                  {r.response.referenceUrl && (
                    <div className="mt-2">
                      <a href={r.response.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        Reference: {r.response.referenceUrl}
                      </a>
                    </div>
                  )}
                  {r.response.richContent && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">Rich Content ({r.response.richContent.type})</div>
                      <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-40 text-gray-600">
                        {JSON.stringify(r.response.richContent.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Pipeline panel */}
                <div className="p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pipeline Steps</div>
                  <div className="space-y-2">
                    {r.pipeline.map((step, si) => (
                      <div key={si} className={`rounded-lg border p-3 ${
                        step.status === 'error' ? 'border-red-200 bg-red-50' :
                        step.status === 'skipped' ? 'border-gray-200 bg-gray-50' :
                        'border-green-200 bg-green-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{step.name}</span>
                          {step.duration != null && (
                            <span className="text-xs text-gray-500">{step.duration}ms</span>
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
